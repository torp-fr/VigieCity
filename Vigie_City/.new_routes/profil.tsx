// profil.tsx
// Page profil citoyen — informations compte + preferences
// Route declaree dans routeTree.gen.ts mais fichier manquant jusqu'ici

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppAuth } from "@/hooks/useAppAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdPreferencesPanel } from "@/components/AdPreferencesPanel";
import {
  User,
  Mail,
  LogOut,
  Bell,
  Shield,
  ChevronRight,
  Loader2,
  MapPin,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — VigieCity" },
      { name: "description", content: "Gerez votre compte et vos preferences." },
    ],
  }),
  component: ProfilPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Collectivity = {
  id: string;
  name: string;
  department_code: string | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProfilPage() {
  const navigate = useNavigate();
  const { userId, collectivityId, displayName, isLoading, isAuthenticated } = useAppAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [collectivity, setCollectivity] = useState<Collectivity | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Charger l'email depuis la session Supabase
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  // Charger le nom de la commune
  useEffect(() => {
    if (!collectivityId) return;
    supabase
      .from("collectivities")
      .select("id, name, department_code")
      .eq("id", collectivityId)
      .single()
      .then(({ data }) => setCollectivity(data));
  }, [collectivityId]);

  // Redirection si non connecte
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/onboarding" });
    }
  }, [isLoading, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/onboarding" });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-primary px-4 pt-12 pb-8">
        <div className="flex flex-col items-center gap-3">
          {/* Avatar initiales */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <span className="text-2xl font-bold text-white">
              {(displayName ?? email ?? "?")[0]?.toUpperCase()}
            </span>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-white">
              {displayName ?? "Citoyen VigieCity"}
            </p>
            {email && (
              <p className="text-sm text-white/70">{email}</p>
            )}
            {collectivity && (
              <div className="mt-1 flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3 text-white/60" />
                <p className="text-xs text-white/60">
                  {collectivity.name}
                  {collectivity.department_code ? ` (${collectivity.department_code})` : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenu ───────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 space-y-4">

        {/* Infos compte */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Mon compte
            </p>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Nom affiche</p>
                <p className="text-sm font-medium truncate">
                  {displayName ?? "Non renseigne"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Adresse email</p>
                <p className="text-sm font-medium truncate">
                  {email ?? "—"}
                </p>
              </div>
            </div>
            {collectivity && (
              <div className="flex items-center gap-3 px-4 py-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Commune</p>
                  <p className="text-sm font-medium truncate">{collectivity.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preferences publicitaires (RGPD) */}
        <AdPreferencesPanel />

        {/* Liens legaux */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Informations legales
            </p>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "Politique de confidentialite", to: "/confidentialite" },
              { label: "Conditions generales d'utilisation", to: "/cgu" },
              { label: "Mentions legales", to: "/mentions-legales" },
            ].map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition"
              >
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </Link>
            ))}
          </div>
        </div>

        {/* Deconnexion */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {signingOut ? "Deconnexion..." : "Se deconnecter"}
        </button>

        {/* Version */}
        <p className="text-center text-[10px] text-muted-foreground/40 pb-2">
          VigieCity — version 1.0.0
        </p>
      </div>
    </div>
  );
}
