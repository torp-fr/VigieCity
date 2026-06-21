/**
 * usePlatformAuth — auth guard partagé pour toutes les pages /platform/*
 *
 * Utilise React Query pour mettre en cache la session + le rôle 5 minutes.
 * Résultat : l'auth check se fait UNE seule fois au premier chargement,
 * puis tous les onglets /platform/* naviguent instantanément.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type PlatformAuthResult =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "ready"; email: string };

async function fetchPlatformAuth(): Promise<{ email: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("no_session");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error || profile?.role !== "super_admin") throw new Error("unauthorized");

  return { email: session.user.email ?? "" };
}

export function usePlatformAuth(): PlatformAuthResult {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform-auth"],
    queryFn: fetchPlatformAuth,
    // Cache 5 minutes — pas de re-fetch entre onglets
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    // Ne pas re-essayer automatiquement si non autorisé
    retry: (failureCount, error: Error) => {
      if (error.message === "no_session" || error.message === "unauthorized") return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (isError) {
      navigate({ to: "/admin/login" });
    }
  }, [isError, navigate]);

  if (isLoading) return { status: "loading" };
  if (isError || !data) return { status: "unauthorized" };
  return { status: "ready", email: data.email };
}
