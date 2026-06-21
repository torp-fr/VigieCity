import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Newspaper,
  LayoutGrid,
  Menu,
  X,
  PhoneCall,
  AlertCircle,
  MessageSquare,
  User,
  Map,
  FileText,
  Calendar,
  BarChart2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LAST_VISIT_KEY = "vigie_last_quartier_visit";

/** 4 onglets principaux */
const TABS = [
  { to: "/accueil", label: "Accueil", icon: Home },
  { to: "/actualites", label: "Actualités", icon: Newspaper },
  { to: "/services", label: "Services", icon: LayoutGrid },
] as const;

/** Items dans le tiroir de navigation */
const DRAWER_ITEMS = [
  { to: "/urgences",    label: "Urgences",   icon: PhoneCall,     color: "text-red-600"     },
  { to: "/signaler",    label: "Signaler",   icon: AlertCircle,   color: "text-orange-500"  },
  { to: "/messagerie",  label: "Messagerie", icon: MessageSquare, color: "text-blue-600"    },
  { to: "/evenements",  label: "Agenda",     icon: Calendar,      color: "text-indigo-600"  },
  { to: "/fil",         label: "Fil Quartier", icon: FileText,    color: "text-emerald-600" },
  { to: "/carte",          label: "Carte",         icon: Map,      color: "text-purple-600"  },
  { to: "/consultations",  label: "Consultations", icon: BarChart2, color: "text-teal-600"   },
  { to: "/profil",         label: "Mon Profil",    icon: User,     color: "text-slate-600"   },
] as const;

// Hauteur approximative de la barre de navigation (px) — pour le padding-bottom du tiroir
const NAV_HEIGHT = 64;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastVisit, setLastVisit] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(LAST_VISIT_KEY) ?? 0);
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Mise à jour du timestamp de dernière visite sur /fil + fermeture du tiroir à chaque navigation
  useEffect(() => {
    if (pathname === "/fil") {
      const now = Date.now();
      localStorage.setItem(LAST_VISIT_KEY, String(now));
      setLastVisit(now);
    }
    setDrawerOpen(false);
  }, [pathname]);

  // Compte les nouveaux signalements depuis la dernière visite (badge sur ≡)
  const { data: newCount } = useQuery({
    queryKey: ["reports", "new-count", userId, lastVisit],
    enabled: !!userId && pathname !== "/fil",
    queryFn: async () => {
      if (!lastVisit) return 0;
      const since = new Date(lastVisit).toISOString();
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .gt("created_at", since);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  // Nombre de messages citoyens non lus (badge messagerie)
  const { data: msgUnread } = useQuery({
    queryKey: ["messagerie-unread", userId],
    enabled: !!userId && pathname !== "/messagerie",
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("unread_citizen")
        .eq("citizen_id", userId!)
        .gt("unread_citizen", 0);
      return (data ?? []).reduce((s, c) => s + (c.unread_citizen ?? 0), 0);
    },
    refetchInterval: 30_000,
  });

  const hasNew = (newCount ?? 0) > 0 && pathname !== "/fil";
  const hasMsgUnread = (msgUnread ?? 0) > 0 && pathname !== "/messagerie";

  return (
    <>
      {/* Overlay sombre derrière le tiroir */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Tiroir de navigation — glisse vers le haut */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-background shadow-2xl transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`}
        style={{ paddingBottom: NAV_HEIGHT }}
      >
        {/* Poignée visuelle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* En-tête du tiroir */}
        <div className="flex items-center justify-between px-5 py-2">
          <span className="text-sm font-semibold text-foreground">Navigation</span>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Fermer le menu"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grille des raccourcis */}
        <div className="grid grid-cols-3 gap-3 px-5 py-3">
          {DRAWER_ITEMS.map(({ to, label, icon: Icon, color }) => {
            const active = pathname === to;
            const isMsgItem = to === "/messagerie";
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/60 text-foreground hover:bg-muted"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-6 w-6 ${active ? "text-primary" : color}`} />
                  {isMsgItem && hasMsgUnread && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                      {(msgUnread ?? 0) > 9 ? "9+" : msgUnread}
                    </span>
                  )}
                </div>
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Barre d'onglets — z-[60] pour rester au-dessus du tiroir (z-50) */}
      <nav className="sticky bottom-0 z-[60] border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
                {label}
              </Link>
            );
          })}

          {/* Bouton Menu ≡ */}
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Ouvrir le menu"
            aria-expanded={drawerOpen}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              drawerOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="relative">
              {drawerOpen ? (
                <X className="h-5 w-5 stroke-[2.4]" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              {(hasNew || hasMsgUnread) && !drawerOpen && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                  {hasMsgUnread
                    ? ((msgUnread ?? 0) > 9 ? "9+" : msgUnread)
                    : ((newCount ?? 0) > 9 ? "9+" : newCount)
                  }
                </span>
              )}
            </div>
            Menu
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}
