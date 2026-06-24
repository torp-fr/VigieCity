import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Building2, FileText, AlertTriangle,
  CheckCircle, Clock, Loader2, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/")({
  head: () => ({ meta: [{ title: "Tableau de bord - VigieCity Platform" }] }),
  component: PlatformDashboard,
});

const COLORS = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-500"    },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-500" },
  purple:  { bg: "bg-purple-50",  icon: "text-purple-500"  },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-500"   },
} as const;

const PLAN_COLORS: Record<string, string> = {
  trial:     "bg-amber-100 text-amber-700",
  nano:      "bg-slate-100 text-slate-700",
  micro:     "bg-blue-100 text-blue-700",
  local:     "bg-emerald-100 text-emerald-700",
  urbain:    "bg-violet-100 text-violet-700",
  metropole: "bg-amber-100 text-amber-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/** Wrapper minimal — PlatformShell gere l auth guard.
 *  DashboardContent ne monte QUE quand auth.status === 'ready',
 *  garantissant que les queries s executent toujours avec un token valide.
 */
function PlatformDashboard() {
  return (
    <PlatformShell activePath="/platform">
      <DashboardContent />
    </PlatformShell>
  );
}

/** Contenu reel du tableau de bord.
 *  Monte uniquement apres confirmation auth — plus de race condition.
 */
function DashboardContent() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["platform-dashboard-stats"],
    queryFn: async () => {
      const [usersRes, communesRes, licencesRes, pubsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("collectivities").select("id", { count: "exact", head: true }),
        supabase.from("commune_licenses").select("id", { count: "exact", head: true }),
        supabase.from("publications").select("id", { count: "exact", head: true }),
      ]);
      if (usersRes.error) {
        console.error("[platform] profiles count error:", usersRes.error);
        throw usersRes.error;
      }
      if (communesRes.error) {
        console.error("[platform] collectivities count error:", communesRes.error);
        throw communesRes.error;
      }
      return {
        users:    usersRes.count    ?? 0,
        communes: communesRes.count ?? 0,
        licences: licencesRes.count ?? 0,
        pubs:     pubsRes.count     ?? 0,
      };
    },
    staleTime: 60_000,
    retry: 2,
  });

  const {
    data: licences,
    isLoading: licLoading,
    error: licError,
  } = useQuery({
    queryKey: ["platform-dashboard-licences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commune_licenses")
        .select("id, plan, status, started_at, expires_at, collectivities(name)")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) {
        console.error("[platform] licences error:", error);
        throw error;
      }
      return data ?? [];
    },
    staleTime: 5 * 60_000,
    retry: 2,
  });

  const {
    data: collectivities,
    isLoading: collLoading,
    error: collError,
  } = useQuery({
    queryKey: ["platform-dashboard-collectivities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collectivities")
        .select("id, name, insee_code, status, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) {
        console.error("[platform] collectivities error:", error);
        throw error;
      }
      return data ?? [];
    },
    staleTime: 5 * 60_000,
    retry: 2,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-0.5 text-sm text-slate-500">Vue d'ensemble de la plateforme VigieCity</p>
      </div>

      <div className="space-y-8">

        {/* Stats */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Statistiques globales
          </h2>
          {statsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
              Erreur de chargement : {(statsError as any)?.message ?? "inconnue"}
            </div>
          ) : statsLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Utilisateurs" value={stats?.users    ?? 0} Icon={Users}      color="blue"    />
              <StatCard label="Communes"     value={stats?.communes ?? 0} Icon={Building2}  color="emerald" />
              <StatCard label="Licences"     value={stats?.licences ?? 0} Icon={TrendingUp} color="purple"  />
              <StatCard label="Publications" value={stats?.pubs     ?? 0} Icon={FileText}   color="amber"   />
            </div>
          )}
        </section>

        {/* Licences recentes */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Licences recentes
            </h2>
            {licences && <span className="text-xs text-slate-400">{licences.length} affichees</span>}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {licError ? (
              <div className="px-5 py-4 text-sm text-red-500">
                Erreur licences : {(licError as any)?.message ?? "inconnue"}
              </div>
            ) : licLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : !licences?.length ? (
              <div className="py-14 text-center">
                <TrendingUp className="mx-auto mb-3 h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-400">Aucune licence</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Commune</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3">Debut</th>
                    <th className="px-5 py-3">Expiration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {licences.map((l: any) => {
                    const expiry = l.expires_at ? new Date(l.expires_at) : null;
                    const daysLeft = expiry
                      ? Math.ceil((expiry.getTime() - Date.now()) / 86400000)
                      : null;
                    const expired = daysLeft !== null && daysLeft < 0;
                    return (
                      <tr key={l.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {(l.collectivities as any)?.name ?? l.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PLAN_COLORS[l.plan] ?? "bg-slate-100 text-slate-600"}`}>
                            {l.plan ?? "?"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {l.started_at ? fmtDate(l.started_at) : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          {expiry ? (
                            <span className={`text-xs font-medium ${expired ? "text-red-500" : daysLeft! <= 30 ? "text-amber-600" : "text-slate-500"}`}>
                              {expired
                                ? `Expire il y a ${Math.abs(daysLeft!)}j`
                                : daysLeft === 0
                                ? "Expire aujourd'hui"
                                : `${daysLeft}j restants`}
                            </span>
                          ) : (
                            <span className="text-slate-300">Sans limite</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Collectivites */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Collectivites enregistrees
            </h2>
            {collectivities && <span className="text-xs text-slate-400">{collectivities.length} affichees</span>}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {collError ? (
              <div className="px-5 py-4 text-sm text-red-500">
                Erreur collectivites : {(collError as any)?.message ?? "inconnue"}
              </div>
            ) : collLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : !collectivities?.length ? (
              <div className="py-14 text-center">
                <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-400">Aucune collectivite enregistree</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Nom</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Code INSEE</th>
                    <th className="px-5 py-3">Creation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {collectivities.map((c: any) => (
                    <tr key={c.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-medium text-slate-900">{c.name}</td>
                      <td className="px-5 py-3.5"><TypeBadge type={c.status} /></td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                        {c.insee_code ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {c.created_at ? fmtDate(c.created_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

function StatCard({
  label, value, Icon, color,
}: {
  label: string;
  value: number;
  Icon: React.FC<{ className?: string }>;
  color: keyof typeof COLORS;
}) {
  const c = COLORS[color];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.bg}`}>
        <Icon className={`h-4 w-4 ${c.icon}`} />
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value.toLocaleString("fr-FR")}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { cls: string; Icon: React.ElementType; label: string }> = {
    active:    { cls: "text-emerald-600", Icon: CheckCircle,   label: "Actif"    },
    trial:     { cls: "text-amber-600",   Icon: Clock,         label: "Trial"    },
    suspended: { cls: "text-red-500",     Icon: AlertTriangle, label: "Suspendu" },
    cancelled: { cls: "text-slate-400",   Icon: AlertTriangle, label: "Annule"   },
  };
  const cfg = map[status ?? ""] ?? { cls: "text-slate-400", Icon: Clock, label: status ?? "?" };
  const Icon = cfg.Icon;
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  const map: Record<string, string> = {
    commune:     "bg-blue-100 text-blue-700",
    epci:        "bg-purple-100 text-purple-700",
    region:      "bg-teal-100 text-teal-700",
    departement: "bg-amber-100 text-amber-700",
  };
  const cls = map[type ?? ""] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {type ?? "---"}
    </span>
  );
}
