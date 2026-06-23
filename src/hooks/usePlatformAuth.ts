/**
 * usePlatformAuth — auth guard pour /platform/*
 *
 * Fast-path via sessionStorage (alimenté par login.tsx avant window.location.href)
 * pour éviter le spinner causé par supabase.auth.initializePromise qui peut bloquer
 * au rechargement de page (autoRefreshToken + token-refresh réseau).
 *
 * Le React Query vérifie en arrière-plan avec un timeout de 10 s.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PLATFORM_SESSION_KEY = "__vc_platform_email";

export type PlatformAuthResult =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "ready"; email: string };

// ── Vérification réseau (arrière-plan) ───────────────────────────────────────

async function verifyPlatformAuth(): Promise<{ email: string }> {
  // Race entre la vérification et un timeout de 10 s
  const verify = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("no_session");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (error || profile?.role !== "super_admin") throw new Error("unauthorized");

    const email = session.user.email ?? "";
    sessionStorage.setItem(PLATFORM_SESSION_KEY, email);
    return { email };
  };

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("auth_timeout")), 10_000),
  );

  try {
    return await Promise.race([verify(), timeout]);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "auth_timeout") {
      // Réseau lent : on garde la session en place, on réessaiera
      const cached = sessionStorage.getItem(PLATFORM_SESSION_KEY);
      if (cached) return { email: cached };
    }
    // Erreur réelle (unauthorized / no_session) : purge
    sessionStorage.removeItem(PLATFORM_SESSION_KEY);
    throw err;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePlatformAuth(): PlatformAuthResult {
  // Email stocké juste avant window.location.href dans login.tsx
  const quickEmail =
    typeof window !== "undefined"
      ? (sessionStorage.getItem(PLATFORM_SESSION_KEY) ?? undefined)
      : undefined;

  const { data, isPending, isError } = useQuery({
    queryKey: ["platform-auth"],
    queryFn: verifyPlatformAuth,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
    // Donnée immédiate depuis sessionStorage — évite le spinner au premier rendu
    initialData: quickEmail ? { email: quickEmail } : undefined,
    // Mettre updatedAt à 0 force une vérification arrière-plan immédiate
    initialDataUpdatedAt: quickEmail ? 0 : undefined,
  });

  if (isPending) return { status: "loading" };
  if (isError && !data) return { status: "unauthorized" };
  if (!data) return { status: "loading" };
  return { status: "ready", email: data.email };
}
