/**
 * usePlatformAuth — auth guard partagé pour toutes les pages /platform/*
 *
 * Utilise getSession() (lecture localStorage) plutôt que getUser() (réseau)
 * pour éviter les blocages réseau au premier rendu après login.
 * La session a déjà été validée par signInWithPassword sur /admin/login.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlatformAuthResult =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "ready"; email: string };

async function fetchPlatformAuth(): Promise<{ email: string }> {
  // getSession() lit la session depuis localStorage — pas de round-trip réseau
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) throw new Error("no_session");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error || profile?.role !== "super_admin") throw new Error("unauthorized");

  return { email: session.user.email ?? "" };
}

export function usePlatformAuth(): PlatformAuthResult {
  const { data, isPending, isError } = useQuery({
    queryKey: ["platform-auth"],
    queryFn: fetchPlatformAuth,
    staleTime: 5 * 60_000,
    gcTime:    10 * 60_000,
    retry: false,
  });

  if (isPending) return { status: "loading" };
  if (isError || !data) return { status: "unauthorized" };
  return { status: "ready", email: data.email };
}
