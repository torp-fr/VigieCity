import { useNavigate, useLocation } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import {
  LayoutDashboard, Building2, Users, Rss,
  Settings, LogOut, Shield, ChevronRight,
  CreditCard, Euro, BarChart3, UserPlus,
  TrendingUp, Newspaper, Package, BookOpen,
  Menu, Bell, Megaphone, PieChart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";

// ── Navigation structure ──────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "OPÉRATIONS",
    items: [
      { icon: LayoutDashboard, label: "Tableau de bord",  path: "/platform"                },
      { icon: Building2,       label: "Collectivités",    path: "/platform/collectivites"  },
      { icon: UserPlus,        label: "Onboarding",       path: "/platform/onboarding"     },
      { icon: TrendingUp,      label: "Rétention",        path: "/platform/retention"      },
      { icon: Users,           label: "Utilisateurs",     path: "/platform/users"          },
    ],
  },
  {
    label: "CONTENU",
    items: [
      { icon: Rss,             label: "Flux RSS",         path: "/platform/rss"            },
      { icon: BookOpen,        label: "Connaissances",    path: "/platform/knowledge"      },
      { icon: Newspaper,       label: "Éditeurs",         path: "/platform/publishers"     },
    ],
  },
  {
    label: "REVENUS",
    items: [
      { icon: CreditCard,      label: "Plans tarifaires", path: "/platform/plans"          },
      { icon: Euro,            label: "Intercommunal",    path: "/platform/tarification"   },
      { icon: Package,         label: "Modules",          path: "/platform/modules"        },
      { icon: Shield,          label: "Abonnements",      path: "/platform/abonnements"    },
      { icon: Megaphone,       label: "Publicités",       path: "/platform/publicites"     },
      { icon: PieChart,        label: "Monétisation",     path: "/platform/monetization"   },
    ],
  },
  {
    label: "DONNÉES",
    items: [
      { icon: BarChart3,       label: "Analytics",        path: "/platform/analytics"      },
    ],
  },
  {
    label: "SYSTÈME",
    items: [
      { icon: Settings,        label: "Paramètres",       path: "/platform/settings"       },
    ],
  },
] as const;

// Page title map
const PAGE_TITLES: Record<string, string> = {
  "/platform":                  "Tableau de bord",
  "/platform/collectivites":    "Collectivités",
  "/platform/onboarding":       "Onboarding",
  "/platform/retention":        "Rétention",
  "/platform/users":            "Utilisateurs",
  "/platform/rss":              "Flux RSS",
  "/platform/knowledge":        "Connaissances",
  "/platform/publishers":       "Éditeurs",
  "/platform/plans":            "Plans tarifaires",
  "/platform/tarification":     "Intercommunal",
  "/platform/modules":          "Modules",
  "/platform/abonnements":      "Abonnements",
  "/platform/publicites":       "Publicités",
  "/platform/monetization":     "Monétisation",
  "/platform/analytics":        "Analytics",
  "/platform/settings":         "Paramètres",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface PlatformShellProps {
  activePath: string;
  children: ReactNode;
  /** Titre de page optionnel — sinon déduit du path */
  pageTitle?: string;
  /** Sous-titre / breadcrumb optionnel */
  pageSubtitle?: string;
}

// ── Initiales avatar ──────────────────────────────────────────────────────────

function initials(email: string) {
  const parts = email.split("@")[0].split(/[._-]/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "SA";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlatformShell({
  activePath,
  children,
  pageTitle,
  pageSubtitle,
}: PlatformShellProps) {
  const navigate = useNavigate();
  const auth = usePlatformAuth();

  const title = pageTitle ?? PAGE_TITLES[activePath] ?? "Platform";

  useEffect(() => {
    if (auth.status === "unauthorized") {
      navigate({ to: "/admin/login" });
    }
  }, [auth.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  // ── Loading / gate ────────────────────────────────────────────────────────
  if (auth.status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1729]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20">
            <Shield className="h-6 w-6 text-blue-400" />
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f0f2f5]">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col bg-[#0f1729] shadow-xl">

        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/5 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="leading-none">
            <span className="text-[13px] font-bold text-white tracking-tight">VigieCity</span>
            <p className="text-[9px] font-medium text-blue-400/80 uppercase tracking-widest mt-0.5">Super Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-widest text-blue-500/60">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ icon: Icon, label, path }) => {
                  const isActive = activePath === path;
                  return (
                    <button
                      key={path}
                      onClick={() => navigate({ to: path as any })}
                      className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-all ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                      <span className="flex-1 text-left truncate">{label}</span>
                      {isActive && <ChevronRight className="h-3 w-3 text-blue-300/60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/5 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {initials(auth.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-slate-300">{auth.email}</p>
              <p className="text-[9px] text-slate-500">Super Admin</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Déconnexion"
              className="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Right side (header + content) ────────────────────────────────── */}
      <div className="ml-56 flex flex-1 flex-col min-h-screen">

        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-medium text-slate-600">Platform</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-semibold text-slate-800">{title}</span>
            </div>
            {pageSubtitle && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                {pageSubtitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell (placeholder) */}
            <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <Bell className="h-4 w-4" />
            </button>
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
              {initials(auth.email)}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
