import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Info, Shield, Database, Bell, Rss, RefreshCw, Users, Building2,
  WrenchIcon, AlertTriangle, ToggleLeft, ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/settings")({
  component: PlatformSettingsPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type GlobalMaintenance = {
  enabled: boolean;
  message: string;
};

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
  const qc = useQueryClient();
  const [maintMsg, setMaintMsg] = useState("");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["platform-settings-stats"],
    queryFn:  fetchPlatformStats,
    staleTime: 2 * 60_000,
  });

  // ── Maintenance globale ────────────────────────────────────────────────────
  const { data: globalMaint, isLoading: maintLoading } = useQuery<GlobalMaintenance>({
    queryKey: ["platform-global-maintenance"],
    queryFn: async () => {
      await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "global_maintenance")
        .single();
      if (error) return { enabled: false, message: "" };
      return JSON.parse(data.value) as GlobalMaintenance;
    },
    staleTime: 30_000,
  });

  const toggleGlobalMaint = useMutation({
    mutationFn: async () => {
      const current = globalMaint ?? { enabled: false, message: "" };
      const next = { ...current, enabled: !current.enabled };
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ key: "global_maintenance", value: JSON.stringify(next) }, { onConflict: "key" });
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["platform-global-maintenance"] });
      toast.success(next.enabled ? "🔧 Maintenance globale activée" : "✅ Maintenance globale désactivée");
    },
    onError: () => toast.error("Erreur lors de la mise à jour de la maintenance"),
  });

  const saveMaintMsg = useMutation({
    mutationFn: async () => {
      const current = globalMaint ?? { enabled: false, message: "" };
      const next = { ...current, message: maintMsg };
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ key: "global_maintenance", value: JSON.stringify(next) }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-global-maintenance"] });
      toast.success("Message de maintenance mis à jour");
    },
    onError: () => toast.error("Erreur"),
  });

  // Sync textarea avec données distantes
  const currentMsg = globalMaint?.message ?? "";

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

        {/* ── MAINTENANCE GLOBALE ─── */}
        <div className={`rounded-2xl border-2 p-6 shadow-sm transition ${
          globalMaint?.enabled
            ? "border-orange-400 bg-orange-50"
            : "border-slate-200 bg-white"
        }`}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <WrenchIcon className={`h-5 w-5 ${globalMaint?.enabled ? "text-orange-600" : "text-slate-500"}`} />
              <h2 className="font-semibold text-slate-900">Maintenance globale</h2>
              {globalMaint?.enabled && (
                <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  ACTIVE
                </span>
              )}
            </div>
            <button
              onClick={() => toggleGlobalMaint.mutate()}
              disabled={maintLoading || toggleGlobalMaint.isPending}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              style={{
                backgroundColor: globalMaint?.enabled ? "#f97316" : "#0f172a",
                color: "white",
              }}
            >
              {globalMaint?.enabled
                ? <><ToggleRight className="h-4 w-4" /> Désactiver</>
                : <><ToggleLeft  className="h-4 w-4" /> Activer</>}
            </button>
          </div>

          {globalMaint?.enabled && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-orange-100 px-4 py-3 text-sm text-orange-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>La plateforme est en maintenance. Toutes les communes voient une page de maintenance.</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Message affiché aux communes
            </label>
            <textarea
              value={maintMsg || currentMsg}
              onChange={e => setMaintMsg(e.target.value)}
              placeholder="Message de maintenance affiché aux communes..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <button
              onClick={() => saveMaintMsg.mutate()}
              disabled={saveMaintMsg.isPending || (!maintMsg && !currentMsg)}
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {saveMaintMsg.isPending ? "Enregistrement..." : "Enregistrer le message"}
            </button>
          </div>
        </div>

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
            value={isLoading ? "..." : `${stats?.activeLic ?? "--"}/${stats?.totalLic ?? "--"}`}
            icon={<RefreshCw className="h-4 w-4 text-emerald-600" />}
          />
        </div>

        {/* App info */}
        <Card icon={<Info className="h-5 w-5 text-blue-600" />} title="Informations plateforme">
          <Row label="Version"           value="1.0.0 — Production"               />
          <Row label="Environnement"     value="Vercel + Supabase (EU West)"       />
          <Row label="Base de donnees"   value="PostgreSQL 15 (Supabase)"          />
          <Row label="Auth provider"     value="Supabase Auth (Email / Magic Link)" />
          <Row label="Stockage fichiers" value="Supabase Storage"                  />
        </Card>

        {/* Modules */}
        <Card icon={<Shield className="h-5 w-5 text-emerald-600" />} title="Modules actifs">
          {([
            ["Signalements citoyens",  true ],
            ["Messagerie securisee",   true ],
            ["Actualites RSS",         true ],
            ["Editeurs de contenu",    true ],
            ["Alertes d urgence",      true ],
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
                {active ? "Actif" : "Bientot"}
              </span>
            </div>
          ))}
        </Card>

        {/* Sync RSS */}
        <Card icon={<Database className="h-5 w-5 text-violet-600" />} title="Metriques plateforme">
          <Row label="Publications"     value={isLoading ? "..." : `${stats?.pubCount ?? "--"} publiees`} />
          <Row label="Licences actives" value={isLoading ? "..." : `${stats?.activeLic ?? "--"} / ${stats?.totalLic ?? "--"} licences`} />
          <Row label="Signalements"     value={isLoading ? "..." : `${stats?.reportCount ?? "--"} total`} />
        </Card>

        {/* Notifications push */}
        <Card icon={<Bell className="h-5 w-5 text-amber-500" />} title="Notifications push">
          <p className="mb-4 text-sm text-slate-500">
            Les notifications push sont en cours d integration. Elles necessiteront
            un service VAPID (Web Push) ou Firebase FCM.
          </p>
          <Row label="Status" value="En developpement" />
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
