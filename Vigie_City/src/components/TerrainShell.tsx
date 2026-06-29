import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  Shield,
  LogOut,
  Loader2,
  ClipboardList,
  CheckSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TerrainShellProps {
  /** Path actif, ex: "/admin/terrain" */
  activePath: string;
  children: ReactNode;
}

// ── Bottom nav items ──────────────────────────────────────────────────────────

const TERRAIN_NAV = [
  { icon: ClipboardList, label: "À traiter", path: "/admin/terrain" },
  { icon: CheckSquare,   label: "Traités",   path: "/admin/terrain/traites" },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function TerrainShell({ activePath, children }: TerrainShellProps) {
  const navigate = useNavigate();
  const [authReady,   setAuthReady]   = useState(false);
  const [communeName, setCommuneName] = useState<string | null>(null);
  const [agentName,   setAgentName]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/admin/login" }); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, collectivity_id, display_name")
        .eq("id", session.user.id)
        .single();

      const ALLOWED_ROLES = ["commune_admin", "interco_admin", "super_admin"];
      if (!ALLOWED_ROLES.includes(profile?.role ?? "")) {
        navigate({ to: "/admin/login" });
        return;
      }

      setAgentName(profile?.display_name ?? null);

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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 shadow-sm"
        style={{ backgroundColor: "#065f46" }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-none">Mode terrain</p>
          <p className="truncate text-[11px] text-emerald-300 leading-tight mt-0.5">
            {communeName ?? "VigieCity"}{agentName ? ` · ${agentName}` : ""}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="shrink-0 rounded-lg p-1.5 text-emerald-200 transition hover:bg-white/10 hover:text-white"
          title="Déconnexion"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* ── Contenu ── */}
      <main className="flex-1 overflow-auto pb-20">{children}</main>

      {/* ── Bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background shadow-lg">
        {TERRAIN_NAV.map(({ icon: Icon, label, path }) => {
          const isActive = activePath === path;
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate({ to: path as any })}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wide transition ${
                isActive
                  ? "text-emerald-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-emerald-700" : ""}`}
              />
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-12 -translate-x-1/2 rounded-full bg-emerald-700" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
