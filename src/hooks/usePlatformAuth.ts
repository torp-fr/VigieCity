/**
 * usePlatformAuth -- auth guard pour /platform/*
 *
 * useState (pas React Query) -- immunise contre queryClient.invalidateQueries()
 * global de __root.tsx.
 *
 * Fast-path: sessionStorage lu dans le premier useEffect (apres hydration),
 * pas dans le lazy initializer -- evite le mismatch SSR/client #418.
 *
 * Apres la verification async, invalide toutes les queries platform pour
 * qu'elles se relancent avec la session auth confirmee.
 */
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PLATFORM_SESSION_KEY = "__vc_platform_email";

export type PlatformAuthResult =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "ready"; email: string };

export function usePlatformAuth(): PlatformAuthResult {
  // Toujours "loading" au premier render (server ET client) pour eviter l hydration mismatch.
  const [result, setResult] = useState<PlatformAuthResult>({ status: "loading" });
  const cancelled = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queryClient = useQueryClient();

  useEffect(() => {
    cancelled.current = false;

    // Fast-path synchrone : si le cache est la on passe "ready" immediatement apres hydration.
    // Les queries vont se lancer mais peuvent retourner vide sans auth — la verification
    // async ci-dessous les invalide une fois la session confirmee.
    const cached = sessionStorage.getItem(PLATFORM_SESSION_KEY);
    if (cached) {
      setResult({ status: "ready", email: cached });
    }

    // Verification reseau en arriere-plan, timeout 10 s.
    (async () => {
      try {
        const verified = await Promise.race<{ email: string } | null>([
          (async () => {
            // getSession() garantit que le client Supabase a restaure la session
            // depuis localStorage avant toute requete PostgREST.
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return null;
            const { data: profile, error } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", session.user.id)
              .single();
            if (error || profile?.role !== "super_admin") return null;
            return { email: session.user.email ?? "" };
          })(),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 10_000),
          ),
        ]);

        if (cancelled.current) return;

        if (!verified) {
          // Timeout ou session invalide -- si cache present on garde "ready"
          const still = sessionStorage.getItem(PLATFORM_SESSION_KEY);
          if (!still) setResult({ status: "unauthorized" });
          return;
        }

        sessionStorage.setItem(PLATFORM_SESSION_KEY, verified.email);
        if (!cancelled.current) {
          setResult({ status: "ready", email: verified.email });
          // Session confirmee -- invalide toutes les queries actives pour
          // qu elles se relancent maintenant que le token auth est disponible.
          queryClient.invalidateQueries();
        }
      } catch {
        if (cancelled.current) return;
        const s2 = sessionStorage.getItem(PLATFORM_SESSION_KEY);
        if (!s2) {
          sessionStorage.removeItem(PLATFORM_SESSION_KEY);
          setResult({ status: "unauthorized" });
        }
      }
    })();

    return () => { cancelled.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}
