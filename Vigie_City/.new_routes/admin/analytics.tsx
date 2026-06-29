import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import posthog from "posthog-js";
import {
  Users, Activity, Eye, TrendingUp,
  Smartphone, Monitor, RefreshCw, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface PostHogRow { [key: string]: string | number }

// ── Hook — récupérer collectivity_id de l'admin connecté ─────────────────────

function useAdminCollectivityId() {
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", session.user.id)
        .single();
      setCollectivityId(profile?.collectivity_id ?? null);
    });
  }, []);
  return collectivityId;
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchSupabaseStats(collectivityId: string) {
  const [usersRes, reportsRes, articlesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("collectivity_id", collectivityId),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("collectivity_id", collectivityId)
      .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
    supabase
      .from("news_articles")
      .select("id", { count: "exact", head: true })
      .eq("collectivity_id", collectivityId),
  ]);

  // Activité signalements par jour (30j)
  const { data: dailyReports } = await supabase
    .from("reports")
    .select("created_at")
    .eq("collectivity_id", collectivityId)
    .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString())
    .order("created_at");

  const byDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const k = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    byDay[k] = 0;
  }
  for (const r of (dailyReports ?? [])) {
    const k = new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    if (k in byDay) byDay[k]++;
  }

  return {
    citizens:   usersRes.count ?? 0,
    reports30d: reportsRes.count ?? 0,
    articles:   articlesRes.count ?? 0,
    chartData:  Object.entries(byDay).map(([date, count]) => ({ date, count })),
  };
}

async function fetchPostHogCommune(collectivityId: string) {
  try {
    const [statsRes, dailyRes, devicesRes] = await Promise.all([
      supabase.functions.invoke("posthog-query", {
        body: { preset: "commune_stats", collectivity_id: collectivityId },
      }),
      supabase.functions.invoke("posthog-query", {
        body: { preset: "commune_daily", collectivity_id: collectivityId },
      }),
      supabase.functions.invoke("posthog-query", {
        body: { preset: "devices" },
      }),
    ]);

    const statsRow = (statsRes.data?.rows?.[0] ?? []) as number[];
    const dailyRows = (dailyRes.data?.rows ?? []) as [string, number][];
    const deviceRows = (devicesRes.data?.rows ?? []) as [string, number][];

    return {
      uniqueUsers: statsRow[0] ?? 0,
      totalEvents: statsRow[1] ?? 0,
      sessions:    statsRow[2] ?? 0,
      dailyChart:  dailyRows.map(([day, events]) => ({
        date:   new Date(day).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        events,
      })),
      devices: deviceRows.map(([device, count]) => ({ device: device || "Autre", count })),
    };
  } catch {
    return { uniqueUsers: 0, totalEvents: 0, sessions: 0, dailyChart: [], devices: [] };
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminAnalyticsPage() {
  const collectivityId = useAdminCollectivityId();

  const { data: sb, isLoading: sbLoading, refetch, isFetching } = useQuery({
    queryKey:  ["admin/analytics/supabase", collectivityId],
    queryFn:   () => fetchSupabaseStats(collectivityId!),
    enabled:   !!collectivityId,
    staleTime: 5 * 60_000,
  });

  const { data: ph, isLoading: phLoading } = useQuery({
    queryKey:  ["admin/analytics/posthog", collectivityId],
    queryFn:   () => fetchPostHogCommune(collectivityId!),
    enabled:   !!collectivityId,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    posthog.capture("admin_analytics_viewed");
  }, []);

  const isLoading = sbLoading || phLoading || !collectivityId;

  return (
    <AdminShell activePath="/admin/analytics">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Trafic et activité de votre commune — 30 derniers jours
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* KPIs — 4 cartes */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<Users className="h-4 w-4 text-emerald-600" />}
          label="Citoyens inscrits"
          value={isLoading ? "…" : (sb?.citizens ?? 0).toLocaleString("fr-FR")}
          sub="utilisateurs" />
        <KpiCard icon={<Activity className="h-4 w-4 text-blue-600" />}
          label="Signalements 30j"
          value={isLoading ? "…" : (sb?.reports30d ?? 0).toLocaleString("fr-FR")}
          sub="ce mois" />
        <KpiCard icon={<Eye className="h-4 w-4 text-violet-600" />}
          label="Sessions web"
          value={isLoading ? "…" : (ph?.sessions ?? 0).toLocaleString("fr-FR")}
          sub="visiteurs uniques" />
        <KpiCard icon={<TrendingUp className="h-4 w-4 text-orange-500" />}
          label="Articles RSS"
          value={isLoading ? "…" : (sb?.articles ?? 0).toLocaleString("fr-FR")}
          sub="publiés" />
      </div>

      {/* Grille graphes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Signalements par jour */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Signalements — 30 derniers jours
          </h2>
          {isLoading ? (
            <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={sb?.chartData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#059669" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activité PostHog par jour */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Activité app — 30 derniers jours
          </h2>
          {isLoading ? (
            <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
          ) : (ph?.dailyChart?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={ph?.dailyChart ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Line type="monotone" dataKey="events" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <PostHogPlaceholder />
          )}
        </div>

        {/* Devices */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Appareils utilisés</h2>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : (ph?.devices?.length ?? 0) > 0 ? (
            <ul className="space-y-2">
              {(ph?.devices ?? []).map(({ device, count }) => {
                const max = ph!.devices[0]?.count ?? 1;
                const pct = Math.round((count / max) * 100);
                const icon = device?.toLowerCase().includes("mobile")
                  ? <Smartphone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  : <Monitor className="h-3.5 w-3.5 shrink-0 text-slate-400" />;
                return (
                  <li key={device} className="flex items-center gap-3">
                    {icon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{device}</span>
                        <span className="ml-2 font-mono text-slate-400">{count}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <PostHogPlaceholder />
          )}
        </div>

        {/* Résumé PostHog */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Résumé trafic (PostHog)</h2>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : (
            <div className="space-y-3">
              <StatRow label="Utilisateurs uniques" value={(ph?.uniqueUsers ?? 0).toLocaleString("fr-FR")} />
              <StatRow label="Événements total" value={(ph?.totalEvents ?? 0).toLocaleString("fr-FR")} />
              <StatRow label="Sessions" value={(ph?.sessions ?? 0).toLocaleString("fr-FR")} />
              {(ph?.uniqueUsers ?? 0) === 0 && (
                <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                  <BarChart3 className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
                  <p className="text-xs text-slate-400">Configure POSTHOG_PERSONAL_KEY dans Supabase Secrets pour activer les stats PostHog</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </AdminShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">{icon}{label}</div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function PostHogPlaceholder() {
  return (
    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
      <div className="text-center">
        <BarChart3 className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
        <p className="text-xs text-slate-400">Données disponibles après config PostHog</p>
      </div>
    </div>
  );
}
