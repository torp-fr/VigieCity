import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import {
  Users, Eye, TrendingUp, Activity,
  Globe, Smartphone, Monitor, RefreshCw, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/analytics")({
  component: AnalyticsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type PostHogInsight = { count: number } | null;

// ── Fetch PostHog via leur API REST ──────────────────────────────────────────
// L'API PostHog EU est publiquement accessible avec la clé de projet
// (clé publique, pas de secret côté front)

async function fetchPostHogStats() {
  // Si PostHog n'est pas encore configuré, on renvoie des valeurs vides
  const ph = posthog._isIdentified !== undefined ? posthog : null;

  // Données Supabase directes (communes, users, articles)
  const [collRes, profilesRes, articlesRes, reportsRes] = await Promise.all([
    supabase.from("collectivities").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("news_articles").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
  ]);

  // Activité par jour (30 derniers jours) via reports
  const { data: dailyReports } = await supabase
    .from("reports")
    .select("created_at")
    .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString())
    .order("created_at");

  // Grouper par jour
  const byDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const k = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    byDay[k] = 0;
  }
  for (const r of (dailyReports ?? [])) {
    const d = new Date(r.created_at);
    const k = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    if (k in byDay) byDay[k]++;
  }

  const chartData = Object.entries(byDay).map(([date, count]) => ({ date, count }));

  // Distribution par région (via collectivities actives)
  const { data: regionData } = await supabase
    .from("collectivities")
    .select("region")
    .eq("status", "active")
    .not("region", "is", null)
    .limit(1000);

  const regionCount: Record<string, number> = {};
  for (const r of (regionData ?? [])) {
    if (r.region) regionCount[r.region] = (regionCount[r.region] ?? 0) + 1;
  }
  const topRegions = Object.entries(regionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    activeCommunes:   collRes.count ?? 0,
    totalUsers:       profilesRes.count ?? 0,
    totalArticles:    articlesRes.count ?? 0,
    reports30d:       reportsRes.count ?? 0,
    chartData,
    topRegions,
    posthogReady:     ph !== null,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform/analytics"],
    queryFn:  fetchPostHogStats,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  // PostHog — tracker la vue de cette page analytics (méta-event)
  useEffect(() => {
    posthog.capture("platform_analytics_viewed");
  }, []);

  const POSTHOG_CONFIGURED = (window as any).__posthog_key_configured !== false;

  return (
    <PlatformShell activePath="/platform/analytics">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Trafic et usage de l'application VigieCity
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
        <KpiCard
          icon={<Activity   className="h-4 w-4 text-blue-600"    />}
          label="Communes actives"
          value={isLoading ? "…" : (data?.activeCommunes ?? 0).toLocaleString("fr-FR")}
          sub="clients VigieCity"
        />
        <KpiCard
          icon={<Users      className="h-4 w-4 text-violet-600"  />}
          label="Utilisateurs"
          value={isLoading ? "…" : (data?.totalUsers ?? 0).toLocaleString("fr-FR")}
          sub="comptes créés"
        />
        <KpiCard
          icon={<Eye        className="h-4 w-4 text-emerald-600" />}
          label="Signalements 30j"
          value={isLoading ? "…" : (data?.reports30d ?? 0).toLocaleString("fr-FR")}
          sub="dernier mois"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-orange-500"  />}
          label="Articles RSS"
          value={isLoading ? "…" : (data?.totalArticles ?? 0).toLocaleString("fr-FR")}
          sub="indexés"
        />
      </div>

      {/* Graphe activité 30 jours */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Signalements — 30 derniers jours</h2>
        {isLoading ? (
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.chartData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v: number) => [v, "Signalements"]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Grille bas — Régions + PostHog */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Top régions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Top régions — clients actifs</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {(data?.topRegions ?? []).map(([region, count]) => {
                const max = data?.topRegions[0]?.[1] ?? 1;
                const pct = Math.round((count / max) * 100);
                return (
                  <li key={region} className="flex items-center gap-3">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium text-slate-700">{region}</span>
                        <span className="ml-2 shrink-0 font-mono text-slate-400">{count}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
              {(data?.topRegions ?? []).length === 0 && (
                <p className="text-center text-sm text-slate-400">Aucune commune active</p>
              )}
            </ul>
          )}
        </div>

        {/* PostHog dashboard embed / statut */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">PostHog EU — Trafic web</h2>

          {/* Icônes devices */}
          <div className="mb-4 flex gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Smartphone className="h-4 w-4 text-blue-500" />
              Mobile
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Monitor className="h-4 w-4 text-slate-400" />
              Desktop
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <BarChart3Icon className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Dashboard PostHog</p>
            <p className="mt-1 text-xs text-slate-400">
              Configure ta clé PostHog dans <code className="rounded bg-slate-200 px-1">__root.tsx</code>,
              puis consulte les données en temps réel sur
            </p>
            <a
              href="https://eu.posthog.com"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#F9BD2B] px-4 py-2 text-xs font-semibold text-slate-900 hover:opacity-90"
            >
              Ouvrir PostHog EU →
            </a>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            Sessions live, heatmaps, funnels inscription→signalement,
            carte géographique des visiteurs — disponibles sur eu.posthog.com
          </p>
        </div>
      </div>

    </PlatformShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub,
}: {
  icon:  React.ReactNode;
  label: string;
  value: string;
  sub:   string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

// Fallback icon component (lucide n'exporte pas BarChart3 comme composant React directement dans ce contexte)
function BarChart3Icon({ className }: { className?: string }) {
  return <BarChart3 className={className} />;
}
