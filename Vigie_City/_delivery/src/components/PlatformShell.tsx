import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard, Building2, Users, Rss,
  BookOpen, Settings, LogOut, Shield, Loader2,
  CreditCard, Euro,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Tableau de bord",    path: "/platform"                 },
  { icon: Building2,       label: "Collectivités",      path: "/platform/collectivites"   },
  { icon: Users,           label: "Utilisateurs",       path: "/platform/users"           },
  { icon: Rss,             label: "Flux RSS",           path: "/platform/rss"             },
  { icon: CreditCard,      label: "Plans tarifaires",   path: "/platform/plans"           },
  { icon: Euro,            label: "Tarif intercommunal",path: "/platform/tarification"    },
  { icon: BookOpen,        label: "Éditeurs",           path: "/platform/publishers"      },
  { icon: Settings,        label: "Paramètres",         path: "/platform/settings"        },
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface PlatformShellProps {
  /** Exact path string to highlight the active nav item */
  activePath: string;
  children: ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlatformShell({ activePath, children }: PlatformShellProps) {
  const navigate = useNavigate();
  const [authReady, setAuthReady]   = useState(false);
  const [userEmail, setUserEmail]   = useState<string | null>(null);

  // Auth guard — super_admin only
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/admin/login" }); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "super_admin") { navigate({ to: "/admin/login" }); return; }

      setUserEmail(session.user.email ?? null);
      setAuthReady(true);
    })();
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  // ── Loading gate ─────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
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

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const isActive = activePath === path;
            return (
              <button
                key={path}
                onClick={() => navigate({ to: path as any })}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
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
        </nav>

        {/* Footer — email + sign out */}
        <div className="border-t border-white/10 pt-3">
          <p className="truncate px-3 text-[11px] text-blue-300">{userEmail}</p>
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-200 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="ml-60 flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
