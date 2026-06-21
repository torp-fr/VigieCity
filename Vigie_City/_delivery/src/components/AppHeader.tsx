import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_COLOR = "#1e3a8a";

type CommuneTheme = {
  name: string | null;
  logoUrl: string | null;
  primaryColor: string;
};

/**
 * En-tête de l'application citoyenne.
 * Affiché sur toutes les pages citoyennes (après onboarding).
 * Charge le thème de la commune de l'utilisateur (couleur + logo).
 */
export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [theme, setTheme] = useState<CommuneTheme>({
    name:        null,
    logoUrl:     null,
    primaryColor: DEFAULT_COLOR,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.collectivity_id || cancelled) return;

      const { data: coll } = await supabase
        .from("collectivities")
        .select("name, logo_url, primary_color")
        .eq("id", profile.collectivity_id)
        .single();

      if (!coll || cancelled) return;

      const pc = coll.primary_color ?? DEFAULT_COLOR;
      // Inject CSS variable for the entire citizen shell
      document.documentElement.style.setProperty("--commune-primary", pc);

      setTheme({
        name:         coll.name ?? null,
        logoUrl:      coll.logo_url ?? null,
        primaryColor: pc,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  // Libellé de la page courante pour le titre central
  const PAGE_LABELS: Record<string, string> = {
    "/accueil":           "Accueil",
    "/carte":             "Carte",
    "/signaler":          "Signaler",
    "/mes-signalements":  "Mes signalements",
    "/actualites":        "Actualités",
    "/services":          "Services",
    "/urgences":          "Urgences",
    "/radio":             "Radio locale",
    "/messagerie":        "Messagerie",
  };

  const pageLabel = PAGE_LABELS[pathname] ?? "VigieCity";

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center justify-between px-4 shadow-sm"
      style={{ backgroundColor: theme.primaryColor }}
    >
      {/* Logo commune */}
      <Link to="/accueil" className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 overflow-hidden">
          {theme.logoUrl
            ? <img src={theme.logoUrl} alt="logo" className="h-full w-full object-contain p-0.5" />
            : <Shield className="h-4 w-4 text-white" />
          }
        </div>
        <span className="max-w-[100px] truncate text-xs font-semibold text-white/80 leading-tight hidden sm:block">
          {theme.name ?? "VigieCity"}
        </span>
      </Link>

      {/* Titre de la page */}
      <span className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-white">
        {pageLabel}
      </span>

      {/* Actions droite */}
      <div className="flex items-center gap-2">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
