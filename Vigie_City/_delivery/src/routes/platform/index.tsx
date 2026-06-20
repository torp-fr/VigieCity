import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Building2, Users, Rss, BookOpen, Settings,
  LogOut, RefreshCw, Activity, AlertCircle, CheckCircle,
  Clock, Loader2, Globe, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/")({
  head: () => ({ meta: [{ title: "Administration — VigieCity Platform" }] }),
  component: PlatformDashboard,
});

// ── Navigation ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/platform"           },
  { icon: Building2,       label: "Collectivités",   path: "/platform/collectivites" },
  { icon: Users,           label: "Utilisateurs",    path: "/platform/users"     },
  { icon: Rss,             label: "Flux RSS",         path: "/platform/rss"       },
  { icon: BookOpen,        label: "Éditeurs",         path: "/platform/publishers"},
  { icon: Settings,        label: "Paramètres",       path: "/platform/settings"  },
] as const;

// ── Color map for stat cards ──────────────────────────────────────────────────

const COLORS = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-900",    icon: "text-blue-500"    },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-900", icon: "text-emerald-500" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-900",  icon: "text-purple-500"  },
  amber:   { bg: "bg-amber-50",   text: "text-amber-900",   icon: "text-amber-500"   },
} as const;

// ── Main component ────────────────────────────────────────────────────────────

function PlatformDashboard() {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
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

  // ── Stats ───────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["platform-stats"],
    enabled: authReady,
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
    enabled: authReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collectivities")
        .select("id, name, insee_code, status, is_active, created_at")
        .order("name")
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // ── Sources RSS nationales ──────────────────────────────────────────────────
  const { data: rssSources, isLoading: rssLoading } = useQuery({
    queryKey: ["platform-rss-sources"],
    enabled: authReady,
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

  // ── Logout ──────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#f1f5f9" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1e3a8a" }} />
      </div>
    );
  }

  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/platform";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className="flex h-full w-60 shrink-0 flex-col"
        style={{ backgroundColor: "#1e3a8a" }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-5 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
        >
          <img src="/icons/icon.svg" alt="VigieCity" width={26} height={26} />
          <span className="text-base font-extrabold tracking-tight text-white">VigieCity</span>
          <span
            className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            Super Admin
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const isActive = currentPath === path || (path !== "/platform" && currentPath.startsWith(path));
            return (
              <a
                key={path}
                href={path}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </a>
            );
          })}
        </nav>

        {/* Footer : user + logout */}
        <div
          className="p-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }} />
            <p className="truncate text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">

        {/* Top bar */}
        <div className="border-b border-slate-200 bg-white px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Tableau de bord</h1>
              <p className="mt-0.5 text-sm text-slate-500">Vue d'ensemble de la plateforme VigieCity</p>
            </div>
            <button
              onClick={() => refreshRss.mutate()}
              disabled={refreshRss.isPending}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshRss.isPending ? "animate-spin" : ""}`} />
              Sync RSS
            </button>
          </div>
        </div>

        <div className="space-y-8 px-8 py-6">

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
                <StatCard label="Utilisateurs"   value={stats?.users    ?? 0} Icon={Users}    color="blue"    />
                <StatCard label="Collectivités"  value={stats?.communes ?? 0} Icon={Building2} color="emerald" />
                <StatCard label="Articles RSS"   value={stats?.articles ?? 0} Icon={Activity}  color="purple"  />
                <StatCard label="Sources actives" value={stats?.sources ?? 0} Icon={Rss}       color="amber"   />
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
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900">{c.name}</td>
                        <td className="px-5 py-3.5">
                          <TypeBadge type={c.status} />
                        </td>
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
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
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
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-900">{s.name}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-400 max-w-[260px]">{s.url}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {s.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {s.active ? (
                            <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                              <CheckCircle className="h-3.5 w-3.5" /> Actif
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
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
      </main>
    </div>
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
        <Icon className={`h-4.5 w-4.5 ${c.icon}`} />
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value.toLocaleString("fr-FR")}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string | null }) {
  const map: Record<string, string> = {
    commune:  "bg-blue-100 text-blue-700",
    epci:     "bg-purple-100 text-purple-700",
    region:   "bg-teal-100 text-teal-700",
    departement: "bg-amber-100 text-amber-700",
  };
  const cls = map[type ?? ""] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {type ?? "—"}
    </span>
  );
}
