import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Loader2, TrendingUp, Users, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/users")({
  component: PlatformUsersPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  display_name: string | null;
  role: string | null;
  collectivity_id: string | null;
  created_at: string;
  collectivities: { name: string } | null;
};

type UserWithActivity = Profile & {
  last_sign_in_at: string | null;
  is_active_7d: boolean;
};

type CitizenStats = {
  id: string;
  display_name: string | null;
  created_at: string;
  report_count: number;
  last_report_date: string | null;
  is_active_30d: boolean;
  collectivities: { name: string } | null;
};

const ROLES = [
  "citizen",
  "moderator",
  "admin",
  "commune_admin",
  "interco_admin",
  "super_admin",
] as const;

const ROLE_LABELS: Record<string, string> = {
  citizen:       "Citoyen",
  moderator:     "Modérateur",
  admin:         "Admin",
  commune_admin: "Admin Commune",
  interco_admin: "Admin EPCI",
  super_admin:   "Super Admin",
};

const ROLE_BADGE: Record<string, string> = {
  citizen:       "bg-slate-100 text-slate-600",
  moderator:     "bg-amber-100 text-amber-700",
  admin:         "bg-blue-100 text-blue-700",
  commune_admin: "bg-emerald-100 text-emerald-700",
  interco_admin: "bg-purple-100 text-purple-700",
  super_admin:   "bg-red-100 text-red-700",
};

// ── Page ──────────────────────────────────────────────────────────────────────

function PlatformUsersPage() {
  return (
    <PlatformShell activePath="/platform/users">
      <PlatformUsersContent />
    </PlatformShell>
  );
}


function PlatformUsersContent() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"users" | "citizens">("users");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterActivity, setFilterActivity] = useState("all");

  // ── Fetch all profiles with activity metadata from audit_logs ───────────────

  const { data: usersData = [], isLoading: usersLoading } = useQuery<UserWithActivity[]>({
    queryKey: ["platform/users/all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role, collectivity_id, created_at, collectivities(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const profiles = data as Profile[];
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch last login for each user from audit_logs
      const { data: loginEvents } = await supabase
        .from("audit_logs")
        .select("user_id, created_at")
        .eq("action", "login")
        .order("created_at", { ascending: false });

      const lastLoginByUser = new Map<string, string>();
      const activeUsersSet = new Set<string>();

      for (const event of loginEvents ?? []) {
        if (!lastLoginByUser.has(event.user_id)) {
          lastLoginByUser.set(event.user_id, event.created_at);
        }
        if (event.created_at > sevenDaysAgo) {
          activeUsersSet.add(event.user_id);
        }
      }

      return profiles.map(p => ({
        ...p,
        last_sign_in_at: lastLoginByUser.get(p.id) || null,
        is_active_7d: activeUsersSet.has(p.id),
      }));
    },
  });

  // ── Fetch citizens with report stats ───────────────────────────────────────

  const { data: citizensData = [], isLoading: citizensLoading } = useQuery<CitizenStats[]>({
    queryKey: ["platform/users/citizens"],
    queryFn: async () => {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, created_at, collectivity_id, collectivities(name)")
        .eq("role", "citizen")
        .order("created_at", { ascending: false });

      if (profileError) throw profileError;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch reports for each citizen
      const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select("author_id, created_at");

      if (reportsError) throw reportsError;

      const reportsByAuthor = new Map<string, { count: number; lastDate: string | null }>();
      for (const report of reports ?? []) {
        if (report.author_id) {
          const existing = reportsByAuthor.get(report.author_id) || { count: 0, lastDate: null };
          existing.count++;
          if (!existing.lastDate || new Date(report.created_at) > new Date(existing.lastDate)) {
            existing.lastDate = report.created_at;
          }
          reportsByAuthor.set(report.author_id, existing);
        }
      }

      return (profiles as Profile[]).map(p => ({
        ...p,
        report_count: reportsByAuthor.get(p.id)?.count ?? 0,
        last_report_date: reportsByAuthor.get(p.id)?.lastDate ?? null,
        is_active_30d: reportsByAuthor.get(p.id)?.lastDate
          ? new Date(reportsByAuthor.get(p.id).lastDate!) > thirtyDaysAgo
          : false,
      }));
    },
  });

  // ── KPI Queries ───────────────────────────────────────────────────────────

  const { data: userKpis } = useQuery({
    queryKey: ["platform/users/kpis"],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Total users
      const { count: totalCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      // Active users (7d login via audit_logs)
      const { data: activeLogins } = await supabase
        .from("audit_logs")
        .select("user_id")
        .eq("action", "login")
        .gte("created_at", sevenDaysAgo);
      const activeUserIds = new Set(activeLogins?.map(l => l.user_id) ?? []);

      // New users (30d)
      const { count: newCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo);

      return {
        totalUsers: totalCount ?? 0,
        activeUsers7d: activeUserIds.size,
        newUsers30d: newCount ?? 0,
      };
    },
  });

  const { data: citizenKpis } = useQuery({
    queryKey: ["platform/users/citizens/kpis"],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Total citizens
      const { count: totalCitizens } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "citizen");

      // Get all citizen IDs
      const { data: citizenIds } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "citizen");
      const citizenIdSet = new Set(citizenIds?.map((p: any) => p.id) ?? []);

      // Active citizens (7d login via audit_logs)
      const { data: activeCitizenLogins } = await supabase
        .from("audit_logs")
        .select("user_id")
        .eq("action", "login")
        .gte("created_at", sevenDaysAgo);
      const activeCitizensCount = new Set(
        (activeCitizenLogins ?? [])
          .filter(l => citizenIdSet.has(l.user_id))
          .map(l => l.user_id)
      ).size;

      // Reports (30d)
      const { count: reportsCount } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo);

      // Flagged reports (check if column exists, fallback to 0)
      let flaggedCount = 0;
      try {
        const { count } = await supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .gt("citizen_flags_count", 0);
        flaggedCount = count ?? 0;
      } catch {
        flaggedCount = 0;
      }

      return {
        totalCitizens: totalCitizens ?? 0,
        activeCitizens7d: activeCitizensCount,
        reports30d: reportsCount ?? 0,
        flaggedReports: flaggedCount,
      };
    },
  });

  const changeRoleMut = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["platform/users"] });
    },
    onError: () => toast.error("Erreur lors du changement de rôle"),
  });

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredUsers = usersData.filter(p => {
    const name = (p.display_name ?? "").toLowerCase();
    const matchSearch =
      !search ||
      name.includes(search.toLowerCase()) ||
      p.id.toLowerCase().startsWith(search.toLowerCase());
    const matchRole = filterRole === "all" || p.role === filterRole;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && p.is_active_7d) ||
      (filterStatus === "inactive" && !p.is_active_7d);
    return matchSearch && matchRole && matchStatus;
  });

  const filteredCitizens = citizensData.filter(c => {
    const name = (c.display_name ?? "").toLowerCase();
    const matchSearch =
      !search ||
      name.includes(search.toLowerCase()) ||
      c.id.toLowerCase().startsWith(search.toLowerCase());
    const matchActivity =
      filterActivity === "all" ||
      (filterActivity === "active" && c.is_active_30d) ||
      (filterActivity === "inactive" && !c.is_active_30d);
    return matchSearch && matchActivity;
  });

  const adminCount = usersData.filter(p =>
    ["commune_admin", "interco_admin", "super_admin"].includes(p.role ?? "")
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = activeTab === "users" ? usersLoading : citizensLoading;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Utilisateurs & Citoyens</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestion des utilisateurs et statistiques de participation
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setActiveTab("users");
              setFilterStatus("all");
            }}
            className={`px-4 py-3 text-sm font-medium transition ${
              activeTab === "users"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            Utilisateurs
          </button>
          <button
            onClick={() => {
              setActiveTab("citizens");
              setFilterActivity("all");
            }}
            className={`px-4 py-3 text-sm font-medium transition ${
              activeTab === "citizens"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="inline h-4 w-4 mr-2" />
            Citoyens
          </button>
        </div>
      </div>

      {/* Tab: Users ──────────────────────────────────────────────────────────────── */}

      {activeTab === "users" && (
        <>
          {/* KPI Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              icon={Users}
              label="Utilisateurs Total"
              value={userKpis?.totalUsers ?? 0}
              loading={!userKpis}
            />
            <KpiCard
              icon={TrendingUp}
              label="Actifs (7j)"
              value={userKpis?.activeUsers7d ?? 0}
              loading={!userKpis}
            />
            <KpiCard
              icon={Calendar}
              label="Nouveaux (30j)"
              value={userKpis?.newUsers30d ?? 0}
              loading={!userKpis}
            />
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou début d'UUID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
              />
            </div>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
            >
              <option value="all">Tous les rôles</option>
              {ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif (7j)</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-sm text-slate-500">
                  {filteredUsers.length} résultat{filteredUsers.length !== 1 ? "s" : ""}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Utilisateur</th>
                    <th className="px-5 py-3">Rôle</th>
                    <th className="px-5 py-3">Collectivité</th>
                    <th className="px-5 py-3">Inscrit le</th>
                    <th className="px-5 py-3">Dernier accès</th>
                    <th className="px-5 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(p => (
                      <tr key={p.id} className="transition hover:bg-slate-50">
                        {/* Identity */}
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">
                            {p.display_name ?? (
                              <span className="italic text-slate-400">Sans nom</span>
                            )}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {p.id.slice(0, 8)}…
                          </p>
                        </td>
                        {/* Role selector */}
                        <td className="px-5 py-3">
                          <select
                            value={p.role ?? "citizen"}
                            onChange={e => changeRoleMut.mutate({ id: p.id, role: e.target.value })}
                            className={`cursor-pointer rounded-lg border border-transparent px-2 py-1 text-xs font-semibold outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400 ${ROLE_BADGE[p.role ?? "citizen"] ?? "bg-slate-100 text-slate-600"}`}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                        </td>
                        {/* Collectivity */}
                        <td className="px-5 py-3 text-sm text-slate-600">
                          {p.collectivities?.name ?? (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {/* Created date */}
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {new Date(p.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        {/* Last access */}
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {p.last_sign_in_at
                            ? new Date(p.last_sign_in_at).toLocaleDateString("fr-FR")
                            : <span className="text-slate-400">—</span>
                          }
                        </td>
                        {/* Status badge */}
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                              p.is_active_7d
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {p.is_active_7d ? "Actif" : "Inactif"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab: Citizens ────────────────────────────────────────────────────────────── */}

      {activeTab === "citizens" && (
        <>
          {/* KPI Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Citoyens Total"
              value={citizenKpis?.totalCitizens ?? 0}
              loading={!citizenKpis}
            />
            <KpiCard
              icon={TrendingUp}
              label="Actifs (7j)"
              value={citizenKpis?.activeCitizens7d ?? 0}
              loading={!citizenKpis}
            />
            <KpiCard
              icon={AlertCircle}
              label="Signalements (30j)"
              value={citizenKpis?.reports30d ?? 0}
              loading={!citizenKpis}
            />
            <KpiCard
              icon={AlertCircle}
              label="Signalés"
              value={citizenKpis?.flaggedReports ?? 0}
              loading={!citizenKpis}
            />
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou UUID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
              />
            </div>
            <select
              value={filterActivity}
              onChange={e => setFilterActivity(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
            >
              <option value="all">Tous les niveaux</option>
              <option value="active">Actif (30j)</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>

          {/* Citizens Table */}
          {citizensLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-sm text-slate-500">
                  {filteredCitizens.length} citoyen{filteredCitizens.length !== 1 ? "s" : ""}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Citoyen</th>
                    <th className="px-5 py-3">Commune</th>
                    <th className="px-5 py-3">Signalements</th>
                    <th className="px-5 py-3">Dernier signalement</th>
                    <th className="px-5 py-3">Activité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCitizens.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                        Aucun citoyen trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredCitizens.map(c => (
                      <tr key={c.id} className="transition hover:bg-slate-50">
                        {/* Identity */}
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">
                            {c.display_name ?? (
                              <span className="italic text-slate-400">Sans nom</span>
                            )}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {c.id.slice(0, 8)}…
                          </p>
                        </td>
                        {/* Collectivity */}
                        <td className="px-5 py-3 text-sm text-slate-600">
                          {c.collectivities?.name ?? (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {/* Report count */}
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900">
                          {c.report_count}
                        </td>
                        {/* Last report */}
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {c.last_report_date
                            ? new Date(c.last_report_date).toLocaleDateString("fr-FR")
                            : <span className="text-slate-400">—</span>
                          }
                        </td>
                        {/* Activity badge */}
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                              c.is_active_30d
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {c.is_active_30d ? "Actif" : "Inactif"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── KPI Card Component ────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mt-2" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString("fr-FR")}</p>
          )}
        </div>
        <Icon className="h-8 w-8 text-blue-200" />
      </div>
    </div>
  );
}
