import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Calendar,
  MessageSquare,
  Wrench,
  Phone,
  Radio,
  Megaphone,
  Building2,
  LogOut,
  Shield,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Nav items ─────────────────────────────────────────────────────────────────

const BASE_NAV = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/admin"              },
  { icon: FileText,        label: "Signalements",    path: "/admin/signalements" },
  { icon: BookOpen,        label: "Publications",     path: "/admin/publications" },
  { icon: Calendar,        label: "Événements",       path: "/admin/evenements"   },
  { icon: MessageSquare,   label: "Messagerie",       path: "/admin/messagerie"   },
  { icon: Wrench,          label: "Services",         path: "/admin/services"     },
  { icon: Phone,           label: "Urgences",         path: "/admin/urgences"     },
  { icon: Radio,           label: "Radio locale",     path: "/admin/radio"        },
  { icon: Megaphone,       label: "Alertes",          path: "/admin/alertes"      },
] as const;

const EPCI_ITEM = { icon: Building2, label: "Intercommunal", path: "/admin/epci" } as const;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AdminShellProps {
  /** Path of the currently active route, e.g. "/admin/signalements" */
  activePath: string;
  children: ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminShell({ activePath, children }: AdminShellProps) {
  const navigate = useNavigate();
  const [authReady,    setAuthReady]    = useState(false);
  const [communeName,  setCommuneName]  = useState<string | null>(null);
  const [hasEpci,      setHasEpci]      = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/admin/login" }); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, collectivity_id")
        .eq("id", session.user.id)
        .single();

      const ADMIN_ROLES = ["commune_admin", "interco_admin", "super_admin"];
      if (!ADMIN_ROLES.includes(profile?.role ?? "")) {
        navigate({ to: "/admin/login" });
        return;
      }

      // EPCI tab visible for interco_admin and super_admin
      if (profile?.role === "interco_admin" || profile?.role === "super_admin") {
        setHasEpci(true);
      }

      // Resolve commune name for display
      if (profile?.collectivity_id) {
        const { data: coll } = await supabase
          .from("collectivities")
          .select("name")
          .eq("id", profile.collectivity_id)
          .single();
        setCommuneName(coll?.name ?? null);
      }

      setAuthReady(true);
    })();
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  const navItems = hasEpci
    ? [...BASE_NAV, EPCI_ITEM]
    : [...BASE_NAV];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Sidebar ── */}
      <aside
        className="fixed inset-y-0 left-0 flex w-60 flex-col px-3 py-6 shadow-lg"
        style={{ backgroundColor: "#065f46" }}
      >
        {/* Logo */}
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Shield className="h-[18px] w-[18px] text-white" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-white">VigieCity</span>
            <p className="truncate text-[10px] leading-none text-emerald-300">
              {communeName ?? "Administration"}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = activePath === path;
            return (
              <button
                key={path}
                onClick={() => navigate({ to: path as any })}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-emerald-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 pt-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-emerald-200 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-60 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
