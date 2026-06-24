/**
 * usePlatformAuth — auth guard partagé pour toutes les pages /platform/*
 *
 * Utilise React Query pour mettre en cache la session + le rôle.
 * Écoute onAuthStateChange pour invalider immédiatement si la session expire
 * ou si l'utilisateur se déconnecte depuis un autre onglet.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformAuthResult =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "ready"; email: string };

async function fetchPlatformAuth(): Promise<{ email: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("no_session");

  // BUG-002: utilise user_roles (même table que les RLS Supabase) plutôt que profiles.role
  const { data: roleRow, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();

  if (error || !roleRow) throw new Error("unauthorized");

  return { email: user.email ?? "" };
}

export function usePlatformAuth(): PlatformAuthResult {
  const queryClient = useQueryClient();

  // Écouter les changements de session Supabase (expiry, logout, refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        // Invalider le cache pour forcer une re-vérification
        queryClient.invalidateQueries({ queryKey: ["platform-auth"] });
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const { data, isPending, isError } = useQuery({
    queryKey: ["platform-auth"],
    queryFn: fetchPlatformAuth,
    staleTime: 4 * 60_000,   // 4 min — re-fetch avant expiry JWT (1h Supabase)
    gcTime:    10 * 60_000,
    retry: 1,                 // 1 retry pour absorber les erreurs réseau transitoires
    retryDelay: 1000,
  });

  if (isPending) return { status: "loading" };
  if (isError || !data) return { status: "unauthorized" };
  return { status: "ready", email: data.email };
}
