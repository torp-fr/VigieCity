import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import {
  Users, Eye, TrendingUp, Activity,
  Globe, Smartphone, Monitor, RefreshCw, BarChart3, Map,
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

// ── Régions France → coordonnées approx. ─────────────────────────────────────

const REGION_COORDS: Record<string, [number, number]> = {
  "Auvergne-Rhône-Alpes":        [45.46, 4.83],
  "Bourgogne-Franche-Comté":     [47.28, 4.82],
  "Bretagne":                    [48.11, -2.83],
  "Centre-Val de Loire":         [47.75, 1.93],
  "Corse":                       [42.03, 9.01],
  "Grand Est":                   [48.69, 6.18],
  "Hauts-de-France":             [50.48, 2.79],
  "Île-de-France":               [48.86, 2.34],
  "Normandie":                   [49.18, 0.37],
  "Nouvelle-Aquitaine":          [44.76, -0.68],
  "Occitanie":                   [43.60, 2.35],
  "Pays de la Loire":            [47.76, -0.55],
  "Provence-Alpes-Côte d'Azur": [43.94, 5.75],
  "La Réunion":                  [-21.11, 55.53],
  "Martinique":                  [14.64, -61.02],
  "Guadeloupe":                  [16.27, -61.55],
  "Guyane":                      [4.00, -53.00],
  "Mayotte":                     [-12.82, 45.17],
};

// ── Fetch Supabase (métriques globales) ───────────────────────────────────────

async function fetchSupabaseStats() {
  const [collRes, profilesRes, pubsRes, reportsRes] = await Promise.all([
    supabase.from("collectivities").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("publications").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
  ]);

  const { data: dailyReports } = await supabase
    .from("reports")
    .select("created_at")
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

  // Top régions via communes actives
  const { data: regionData } = await supabase
    .from("collectivities").select("region").eq("status", "active")
    .not("region", "is", null).limit(1000);
  const regionCount: Record<string, number> = {};
  for (const r of (regionData ?? [])) {
    if (r.region) regionCount[r.region] = (regionCount[r.region] ?? 0) + 1;
  }
  const topRegions = Object.entries(regionCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    activeCommunes: collRes.count ?? 0,
    totalUsers:     profilesRes.count ?? 0,
    totalArticles:  pubsRes.count ?? 0,
    reports30d:     reportsRes.count ?? 0,
    chartData:      Object.entries(byDay).map(([date, count]) => ({ date, count })),
    topRegions,
  };
}

// ── Fetch PostHog via Edge Function proxy ─────────────────────────────────────

async function fetchPostHogGlobal() {
  try {
    const [sessionsRes, topPagesRes, devicesRes, geoRes] = await Promise.all([
      supabase.functions.invoke("posthog-query", { body: { preset: "sessions_7d" } }),
      supabase.functions.invoke("posthog-query", { body: { preset: "top_pages" } }),
      supabase.functions.invoke("posthog-query", { body: { preset: "devices" } }),
      supabase.functions.invoke("posthog-query", { body: { preset: "geo_points" } }),
    ]);

    const sessions7d = (sessionsRes.data?.rows?.[0]?.[0] as number) ?? 0;

    const topPages = ((topPagesRes.data?.rows ?? []) as [string, number][])
      .map(([url, views]) => {
        try { return { url: new URL(url).pathname, views }; }
        catch { return { url, views }; }
      }).slice(0, 8);

    const devices = ((devicesRes.data?.rows ?? []) as [string, number][])
      .map(([device, count]) => ({ device: device || "Autre", count }));

    // geo_points: [commune, region, department, count]
    const geoRaw = (geoRes.data?.rows ?? []) as [string, string, string, number][];

    // Agréger par région pour les marqueurs carte
    const byRegion: Record<string, number> = {};
    for (const [, region, , count] of geoRaw) {
      if (region) byRegion[region] = (byRegion[region] ?? 0) + count;
    }
    const geoPoints = Object.entries(byRegion)
      .filter(([region]) => REGION_COORDS[region])
      .map(([region, visits]) => ({ region, visits, coords: REGION_COORDS[region] }));

    return { sessions7d, topPages, devices, geoPoints };
  } catch {
    return { sessions7d: 0, topPages: [], devices: [], geoPoints: [] };
  }
}

// ── Hook — carte Leaflet ───────────────────────────────────────────────────────

function useLeafletMap(
  containerRef: React.RefObject<HTMLDivElement>,
  geoPoints: { region: string; visits: number; coords: [number, number] }[],
  isReady: boolean,
) {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!isReady || !containerRef.current || geoPoints.length === 0) return;

    // Charger Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Charger Leaflet JS
    const loadLeaflet = () => {
      return new Promise<void>((resolve) => {
        if ((window as any).L) { resolve(); return; }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    loadLeaflet().then(() => {
      const L = (window as any).L;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (!containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [46.5, 2.5],
        zoom: 5,
        zoomControl: true,
        attributionControl: false,
      });
      mapRef.current = map;

      // Tiles OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Cercles proportionnels par région
      const maxVisits = Math.max(...geoPoints.map((p) => p.visits));
      for (const { region, visits, coords } of geoPoints) {
        const radius = Math.max(12000, Math.min(80000, (visits / maxVisits) * 80000));
        L.circle(coords, {
          radius,
          color: "#1e3a8a",
          fillColor: "#2563eb",
          fillOpacity: 0.45,
          weight: 1.5,
        })
          .addTo(map)
          .bindPopup(
            `<b>${region}</b><br/>${visits.toLocaleString("fr-FR")} visites`,
            { className: "leaflet-popup-custom" },
          );
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isReady, geoPoints]);
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { data: sb, isLoading: sbLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform/analytics/supabase"],
    queryFn:  fetchSupabaseStats,
    staleTime: 5 * 60_000,
  });

  const { data: ph, isLoading: phLoading } = useQuery({
    queryKey: ["platform/analytics/posthog"],
    queryFn:  fetchPostHogGlobal,
    staleTime: 5 * 60_000,
  });

  const isLoading = sbLoading || phLoading;

  // Leaflet map
  useLeafletMap(mapContainerRef, ph?.geoPoints ?? [], !phLoading);

  useEffect(() => {
    posthog.capture("platform_analytics_viewed");
  }, []);

  return (
    <PlatformShell activePath="/platform/analytics">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Trafic et usage global de VigieCity
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
        <KpiCard icon={<Activity   className="h-4 w-4 text-blue-600"    />}
          label="Communes actives"
          value={isLoading ? "…" : (sb?.activeCommunes ?? 0).toLocaleString("fr-FR")}
          sub="clients VigieCity" />
        <KpiCard icon={<Users      className="h-4 w-4 text-violet-600"  />}
          label="Utilisateurs"
          value={isLoading ? "…" : (sb?.totalUsers ?? 0).toLocaleString("fr-FR")}
          sub="comptes créés" />
        <KpiCard icon={<Eye        className="h-4 w-4 text-emerald-600" />}
          label="Sessions 7j"
          value={isLoading ? "…" : (ph?.sessions7d ?? 0).toLocaleString("fr-FR")}
          sub="PostHog" />
        <KpiCard icon={<TrendingUp className="h-4 w-4 text-orange-500"  />}
          label="Signalements 30j"
          value={isLoading ? "…" : (sb?.reports30d ?? 0).toLocaleString("fr-FR")}
          sub="dernier mois" />
      </div>

      {/* Graphes — 2 colonnes */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Signalements 30j */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Signalements — 30 derniers jours</h2>
          {sbLoading ? (
            <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={sb?.chartData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v: number) => [v, "Signalements"]} />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top pages PostHog */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Pages les plus visitées</h2>
          {phLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-7 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : (ph?.topPages ?? []).length > 0 ? (
            <ul className="space-y-1.5">
              {(ph?.topPages ?? []).map(({ url, views }) => {
                const max = ph?.topPages[0]?.views ?? 1;
                const pct = Math.round((views / max) * 100);
                return (
                  <li key={url} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-mono text-slate-600">{url || "/"}</span>
                        <span className="ml-2 shrink-0 text-slate-400">{views}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <PostHogPlaceholder label="Pages visitées disponibles après config PostHog" />
          )}
        </div>
      </div>

      {/* Carte géographique — pleine largeur */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Map className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-700">Carte des utilisateurs — par région</h2>
        </div>
        {phLoading ? (
          <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
        ) : (ph?.geoPoints ?? []).length > 0 ? (
          <div ref={mapContainerRef} className="h-80 w-full overflow-hidden rounded-xl border border-slate-100" />
        ) : (
          <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
            <div className="text-center">
              <Map className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Carte géographique</p>
              <p className="mt-1 text-xs text-slate-400">
                Configure <code className="rounded bg-slate-200 px-1 py-0.5">POSTHOG_PERSONAL_KEY</code> dans Supabase Secrets pour activer la carte
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bas : Top régions + Devices */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Top régions (communes actives Supabase) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Top régions — clients actifs</h2>
          {sbLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : (
            <ul className="space-y-2">
              {(sb?.topRegions ?? []).map(([region, count]) => {
                const max = sb?.topRegions[0]?.[1] ?? 1;
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
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
              {(sb?.topRegions ?? []).length === 0 && (
                <p className="text-center text-sm text-slate-400">Aucune commune active</p>
              )}
            </ul>
          )}
        </div>

        {/* Appareils PostHog */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Appareils — 30 derniers jours</h2>
          {phLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : (ph?.devices ?? []).length > 0 ? (
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
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <PostHogPlaceholder label="Appareils disponibles après config PostHog" />
          )}
        </div>

      </div>
    </PlatformShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">{icon}{label}</div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function PostHogPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
      <div className="text-center">
        <BarChart3 className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}
