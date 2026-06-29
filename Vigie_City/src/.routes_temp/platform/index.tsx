import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Users, Building2, Activity, Rss,
  RefreshCw, CheckCircle, Clock, Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/")({
  head: () => ({ meta: [{ title: "Tableau de bord — VigieCity Platform" }] }),
  component: PlatformDashboard,
});

// ── Color map ─────────────────────────────────────────────────────────────────

const COLORS = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-500"    },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-500" },
  purple:  { bg: "bg-purple-50",  icon: "text-purple-500"  },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-500"   },
} as const;

// ── Main component ────────────────────────────────────────────────────────────

function PlatformDashboard() {
  return (
    <PlatformShell activePath="/platform">
      <PlatformDashboardContent />
    </PlatformShell>
  );
}


function PlatformDashboardContent() {
  const queryClient = useQueryClient();

  // ── Stats ───────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const [usersRes, communesRes, articlesRes, sourcesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("collectivities").select("id", { count: "exact", head: true }),
        supabase.from("news_articles").select("id", { count: "exact", head: true }),
        supabase.from("rss_sources").select("id", { count: "exact", head: true }),
      ]);
      return {
        users:    usersRes.count    ?? 0,
        communes: communesRes.count ?? 0,
        articles: articlesRes.count ?? 0,
        sources:  sourcesRes.count  ?? 0,
      };
    },
    staleTime: 60_000,
  });

  // ── Collectivités ───────────────────────────────────────────────────────────
  const { data: collectivities, isLoading: collLoading } = useQuery({
    queryKey: ["platform-collectivities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collectivities")
        .select("id, name, insee_code, status, created_at")
        .order("name")
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // ── Sources RSS ─────────────────────────────────────────────────────────────
  const { data: rssSources, isLoading: rssLoading } = useQuery({
    queryKey: ["platform-rss-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rss_sources")
        .select("id, name, url, category, active, last_fetched_at, fetch_error")
        .is("collectivity_id", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // ── Refresh RSS ─────────────────────────────────────────────────────────────
  const refreshRss = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("fetch-rss", { body: {} });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data?.fetched ?? "—"} article(s) récupéré(s)`);
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      queryClient.invalidateQueries({ queryKey: ["platform-rss-sources"] });
    },
    onError: () => toast.error("Impossible de rafraîchir les flux RSS"),
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Top bar */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="mt-0.5 text-sm text-slate-500">Vue d'ensemble de la plateforme VigieCity</p>
        </div>
        <button
          onClick={() => refreshRss.mutate()}
          disabled={refreshRss.isPending}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshRss.isPending ? "animate-spin" : ""}`} />
          Sync RSS
        </button>
      </div>

      <div className="space-y-8">

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Statistiques globales
          </h2>
          {statsLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Utilisateurs"    value={stats?.users    ?? 0} Icon={Users}    color="blue"    />
              <StatCard label="Collectivités"   value={stats?.communes ?? 0} Icon={Building2} color="emerald" />
              <StatCard label="Articles RSS"    value={stats?.articles ?? 0} Icon={Activity}  color="purple"  />
              <StatCard label="Sources actives" value={stats?.sources  ?? 0} Icon={Rss}       color="amber"   />
            </div>
          )}
        </section>

        {/* ── Collectivités ─────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Collectivités enregistrées
            </h2>
            {collectivities && (
              <span className="text-xs text-slate-400">{collectivities.length} résultat(s)</span>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {collLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : !collectivities?.length ? (
              <div className="py-14 text-center">
                <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-400">Aucune collectivité enregistrée</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Nom</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Code INSEE</th>
                    <th className="px-5 py-3">Création</th>
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
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric", month: "short", year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Sources RSS ────────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sources RSS nationales
            </h2>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["platform-rss-sources"] })}
              className="text-xs text-slate-400 transition-colors hover:text-slate-600"
            >
              Actualiser
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {rssLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : !rssSources?.length ? (
              <div className="py-14 text-center">
                <Rss className="mx-auto mb-3 h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-400">Aucune source RSS configurée</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Catégorie</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3">Dernière sync</th>
                    <th className="px-5 py-3">Erreur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rssSources.map((s: any) => (
                    <tr key={s.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{s.name}</p>
                        <p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-400">{s.url}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {s.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {s.active ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                            <CheckCircle className="h-3.5 w-3.5" /> Actif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <Clock className="h-3.5 w-3.5" /> Inactif
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {s.last_fetched_at
                          ? new Date(s.last_fetched_at).toLocaleString("fr-FR", {
                              day: "numeric", month: "short",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : <span className="text-slate-300">Jamais</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.fetch_error ? (
                          <span className="flex items-center gap-1.5 text-red-500">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[200px] truncate text-xs">{s.fetch_error}</span>
                          </span>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>
    </>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

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

// ── TypeBadge ─────────────────────────────────────────────────────────────────

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
      {type ?? "—"}
    </span>
  );
}
