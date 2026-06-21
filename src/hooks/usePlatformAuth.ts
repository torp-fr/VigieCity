/**
 * usePlatformAuth — auth guard partagé pour toutes les pages /platform/*
 *
 * Utilise React Query pour mettre en cache la session + le rôle 5 minutes.
 *
 * getUser() est utilisé à la place de getSession() :
 *   - getSession() lit le localStorage → indisponible en SSR (TanStack Start)
 *   - getUser() fait un appel réseau → SSR-safe, toujours à jour
 *
 * La redirection vers /admin/login est gérée dans PlatformShell (composant),
 * pas ici, pour éviter les problèmes d'ordre des hooks TanStack Router.
 */
import { useQuery } from "@tanstack/react-query";
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "super_admin") throw new Error("unauthorized");

  return { email: user.email ?? "" };
}

export function usePlatformAuth(): PlatformAuthResult {
  const { data, isPending, isError } = useQuery({
    queryKey: ["platform-auth"],
    queryFn: fetchPlatformAuth,
    staleTime: 5 * 60_000,
    gcTime:    10 * 60_000,
    // Fail vite — pas de retry : la page citoyenne ne doit jamais faire tourner en boucle
    retry: false,
  });

  // isPending = vrai aussi pendant l'hydratation SSR→CSR
  if (isPending) return { status: "loading" };
  if (isError || !data) return { status: "unauthorized" };
  return { status: "ready", email: data.email };
}
