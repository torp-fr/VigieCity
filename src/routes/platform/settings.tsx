import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Info, Shield, Database, Bell, Rss, RefreshCw, Users, Building2,
} from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/settings")({
  component: PlatformSettingsPage,
});

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetchPlatformStats() {
  const [pubsRes, licRes, collRes, profilesRes, reportsRes] = await Promise.all([
    supabase.from("publications").select("id", { count: "exact", head: true }),
    supabase.from("commune_licenses").select("id, status"),
    supabase.from("collectivities").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }),
  ]);

  const licences = licRes.data ?? [];
  return {
    pubCount:      pubsRes.count ?? 0,
    activeLic:     licences.filter((l: any) => l.status === "active").length,
    totalLic:      licences.length,
    communeCount:  collRes.count ?? 0,
    userCount:     profilesRes.count ?? 0,
    reportCount:   reportsRes.count ?? 0,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

function PlatformSettingsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["platform-settings-stats"],
    queryFn:  fetchPlatformStats,
    staleTime: 2 * 60_000,
  });

  const val = (v: string | number | null | undefined, loading = isLoading) =>
    loading ? "…" : String(v ?? "—");


  return (
    <PlatformShell activePath="/platform/settings">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configuration globale de la plateforme VigieCity
        </p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* KPIs rapides */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Communes"
            value={val(stats?.communeCount)}
            icon={<Building2 className="h-4 w-4 text-blue-600" />}
          />
          <MetricCard
            label="Utilisateurs"
            value={val(stats?.userCount)}
            icon={<Users className="h-4 w-4 text-violet-600" />}
          />
          <MetricCard
            label="Publications"
            value={val(stats?.pubCount)}
            icon={<Rss className="h-4 w-4 text-orange-500" />}
          />
          <MetricCard
            label="Sources actives"
            value={isLoading ? "…" : `${stats?.activeLic ?? "—"}/${stats?.totalLic ?? "—"}`}
            icon={<RefreshCw className="h-4 w-4 text-emerald-600" />}
          />
        </div>

        {/* App info */}
        <Card icon={<Info className="h-5 w-5 text-blue-600" />} title="Informations plateforme">
          <Row label="Version"           value="1.0.0 — Production"               />
          <Row label="Environnement"     value="Vercel + Supabase (EU West)"       />
          <Row label="Base de données"   value="PostgreSQL 15 (Supabase)"          />
          <Row label="Auth provider"     value="Supabase Auth (Email / Magic Link)" />
          <Row label="Stockage fichiers" value="Supabase Storage"                  />
        </Card>

        {/* Modules */}
        <Card icon={<Shield className="h-5 w-5 text-emerald-600" />} title="Modules actifs">
          {([
            ["Signalements citoyens",  true ],
            ["Messagerie sécurisée",   true ],
            ["Actualités RSS",         true ],
            ["Éditeurs de contenu",    true ],
            ["Alertes d'urgence",      true ],
            ["Carte des signalements", true ],
            ["Radio locale",           true ],
            ["Terrain (agents)",       false],
          ] as [string, boolean][]).map(([label, active]) => (
            <div key={label} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-700">{label}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {active ? "Actif" : "Bientôt"}
              </span>
            </div>
          ))}
        </Card>

        {/* Sync RSS */}
        <Card icon={<Database className="h-5 w-5 text-violet-600" />} title="Metriques plateforme">
          <Row label="Publications"       value={isLoading ? "..." : `${stats?.pubCount ?? "--"} publiees`} />
          <Row label="Licences actives"   value={isLoading ? "..." : `${stats?.activeLic ?? "--"} / ${stats?.totalLic ?? "--"} licences`} />
          <Row label="Signalements"       value={isLoading ? "..." : `${stats?.reportCount ?? "--"} total`} />
        </Card>

        {/* Notifications push */}
        <Card icon={<Bell className="h-5 w-5 text-amber-500" />} title="Notifications push">
          <p className="mb-4 text-sm text-slate-500">
            Les notifications push sont en cours d'intégration. Elles nécessiteront
            un service VAPID (Web Push) ou Firebase FCM.
          </p>
          <Row label="Status" value="🔧 En développement" />
        </Card>

      </div>
    </PlatformShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        {icon}
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
