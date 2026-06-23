import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import {
  LayoutDashboard, Building2, Users, BookOpen,
  Settings, LogOut, Shield, Loader2,
  CreditCard, Euro, UserPlus, TrendingUp,
  Package, BarChart3, Network, Zap,
  FileText, Clock, Headphones,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth, PLATFORM_SESSION_KEY } from "@/hooks/usePlatformAuth";

const NAV_SECTIONS = [
  {
    label: "COMMUNES",
    items: [
      { icon: LayoutDashboard, label: "Tableau de bord",    path: "/platform"                    },
      { icon: Building2,       label: "Collectivites",      path: "/platform/collectivites"      },
      { icon: Network,         label: "Intercommunalites",  path: "/platform/intercommunalites"  },
      { icon: UserPlus,        label: "Onboarding",         path: "/platform/onboarding"         },
      { icon: TrendingUp,      label: "Retention",          path: "/platform/retention"          },
      { icon: Users,           label: "Utilisateurs",       path: "/platform/users"              },
    ],
  },
  {
    label: "LICENCES & FACTURATION",
    items: [
      { icon: Shield,    label: "Licences",   path: "/platform/licences"    },
      { icon: Clock,     label: "Trials",     path: "/platform/trials"      },
      { icon: Euro,      label: "Facturation",path: "/platform/facturation" },
      { icon: CreditCard,label: "Plans",      path: "/platform/plans"       },
      { icon: Package,   label: "Modules",    path: "/platform/modules"     },
    ],
  },
  {
    label: "TARIFICATION EPCI",
    items: [
      { icon: Network, label: "Tarification EPCI", path: "/platform/tarification" },
    ],
  },
  {
    label: "CONTENU",
    items: [
      { icon: BookOpen, label: "Base de connaissances", path: "/platform/knowledge" },
      { icon: FileText, label: "Publications",          path: "/platform/publishers" },
    ],
  },
  {
    label: "ANALYTICS & SUPPORT",
    items: [
      { icon: BarChart3,  label: "Analytics", path: "/platform/analytics" },
      { icon: Zap,        label: "Features",  path: "/platform/features"  },
      { icon: Headphones, label: "Support",   path: "/platform/support"   },
    ],
  },
  {
    label: "CONFIG",
    items: [
      { icon: Settings, label: "Parametres", path: "/platform/settings" },
    ],
  },
] as const;

interface PlatformShellProps {
  activePath: string;
  children: ReactNode;
}

export function PlatformShell({ activePath, children }: PlatformShellProps) {
  const navigate = useNavigate();
  const auth = usePlatformAuth();

  useEffect(() => {
    if (auth.status === "unauthorized") {
      navigate({ to: "/admin/login" });
    }
  }, [auth.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    sessionStorage.removeItem(PLATFORM_SESSION_KEY);
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  if (auth.status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 flex w-60 flex-col px-3 py-6 shadow-lg"
        style={{ backgroundColor: "#1e3a8a" }}
      >
        {/* Logo */}
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Shield className="h-[18px] w-[18px] text-white" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-white">VigieCity</span>
            <p className="text-[10px] leading-none text-blue-300">Super Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-3 text-[9px] font-semibold uppercase tracking-widest text-blue-400/70">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ icon: Icon, label, path }) => {
                  const isActive = activePath === path;
                  return (
                    <button
                      key={path}
                      onClick={() => navigate({ to: path as any })}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "text-blue-200 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 pt-3">
          <p className="truncate px-3 text-[11px] text-blue-300">{auth.email}</p>
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-200 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Deconnexion
          </button>
        </div>
      </aside>

      {/* Main content avec padding */}
      <main className="ml-60 flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
