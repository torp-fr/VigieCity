import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  Users,
  MapPin,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  LogOut,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/mobile")({
  head: () => ({ meta: [{ title: "VigieCity — Dashboard" }] }),
  component: PlatformMobilePage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type KPIs = {
  communes_actives:    number;
  communes_total:      number;
  signalements_24h:    number;
  signalements_total:  number;
  health:              "ok" | "degraded" | "down" | "loading";
};

// ── Page ──────────────────────────────────────────────────────────────────────

function PlatformMobilePage() {
  const navigate = useNavigate();
  const [kpis,      setKpis]      = useState<KPIs | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail]  = useState<string | null>(null);

  // Guard super_admin
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { navigate({ to: "/auth" }); return; }
      setUserEmail(data.user.email ?? null);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (profile?.role !== "super_admin") navigate({ to: "/accueil" });
    });
  }, [navigate]);

  const fetchKPIs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Collectivités
      const { count: total } = await supabase
        .from("collectivities")
        .select("id", { count: "exact", head: true });

      const { count: actives } = await supabase
        .from("collectivities")
        .select("id", { count: "exact", head: true })
        .eq("license_status", "active");

      // Signalements
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count: sig24h } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since24h);

      const { count: sigTotal } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true });

      // Health-check
      let health: KPIs["health"] = "loading";
      try {
        const { data: hc, error: hcErr } = await supabase.functions.invoke("health-check");
        if (hcErr || !hc) health = "degraded";
        else health = (hc as { status?: string }).status === "ok" ? "ok" : "degraded";
      } catch {
        health = "down";
      }

      setKpis({
        communes_actives:   actives ?? 0,
        communes_total:     total ?? 0,
        signalements_24h:   sig24h ?? 0,
        signalements_total: sigTotal ?? 0,
        health,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchKPIs(); }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-[#091844] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <img src="/icons/icon-192.png" alt="VigieCity" className="h-7 w-7 rounded-lg" />
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">
              Super Admin
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          {userEmail && (
            <p className="text-xs text-blue-300 mt-0.5 truncate max-w-[200px]">{userEmail}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchKPIs(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-white/10 p-2"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="px-5 space-y-4 pb-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
          </div>
        ) : kpis ? (
          <>
            {/* Statut santé */}
            <HealthCard health={kpis.health} />

            {/* Grille KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                icon={MapPin}
                label="Communes actives"
                value={kpis.communes_actives}
                sub={`sur ${kpis.communes_total} total`}
                color="emerald"
              />
              <KpiCard
                icon={TrendingUp}
                label="Signalements"
                value={kpis.signalements_24h}
                sub="dernières 24h"
                color="amber"
              />
              <KpiCard
                icon={Users}
                label="Total communes"
                value={kpis.communes_total}
                sub="dans la base"
                color="blue"
              />
              <KpiCard
                icon={AlertTriangle}
                label="Signalements total"
                value={kpis.signalements_total}
                sub="depuis le début"
                color="red"
              />
            </div>

            {/* Accès rapides */}
            <div className="mt-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-300/70 px-1">
                Accès rapides
              </p>
              <QuickLink
                icon={Activity}
                label="Analytics complets"
                href="https://eu.posthog.com"
                sub="PostHog EU"
              />
              <QuickLink
                icon={MapPin}
                label="Gestion collectivités"
                href="https://vigiecity.fr/platform/collectivites"
                sub="Panel platform"
              />
              <QuickLink
                icon={TrendingUp}
                label="Monétisation"
                href="https://vigiecity.fr/platform/monetization"
                sub="MRR & abonnements"
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HealthCard({ health }: { health: KPIs["health"] }) {
  const cfg = {
    ok:       { icon: CheckCircle2, cls: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300", label: "Tous les services opérationnels" },
    degraded: { icon: AlertTriangle, cls: "bg-amber-500/20 border-amber-500/40 text-amber-300",      label: "Service dégradé — vérifier les logs" },
    down:     { icon: XCircle,       cls: "bg-red-500/20 border-red-500/40 text-red-300",             label: "Service hors ligne" },
    loading:  { icon: Loader2,       cls: "bg-white/10 border-white/20 text-white/60",               label: "Vérification en cours…" },
  }[health];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${cfg.cls}`}>
      <Icon className={`h-5 w-5 shrink-0 ${health === "loading" ? "animate-spin" : ""}`} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Santé système</p>
        <p className="text-sm font-semibold mt-0.5">{cfg.label}</p>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  sub: string;
  color: "emerald" | "amber" | "blue" | "red";
}) {
  const cls = {
    emerald: "bg-emerald-500/15 border-emerald-500/30",
    amber:   "bg-amber-500/15 border-amber-500/30",
    blue:    "bg-blue-500/15 border-blue-500/30",
    red:     "bg-red-500/15 border-red-500/30",
  }[color];
  const iconCls = {
    emerald: "text-emerald-400",
    amber:   "text-amber-400",
    blue:    "text-blue-400",
    red:     "text-red-400",
  }[color];

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <Icon className={`h-5 w-5 mb-2 ${iconCls}`} />
      <p className="text-2xl font-extrabold tabular-nums">{value.toLocaleString("fr-FR")}</p>
      <p className="text-xs font-semibold mt-0.5 text-white/90">{label}</p>
      <p className="text-[11px] text-white/50 mt-0.5">{sub}</p>
    </div>
  );
}

function QuickLink({
  icon: Icon,
  label,
  href,
  sub,
}: {
  icon: typeof Activity;
  label: string;
  href: string;
  sub: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl bg-white/8 border border-white/10 px-4 py-3.5"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-4.5 w-4.5 text-white/80" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-white/50">{sub}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-white/30 shrink-0" />
    </a>
  );
}
