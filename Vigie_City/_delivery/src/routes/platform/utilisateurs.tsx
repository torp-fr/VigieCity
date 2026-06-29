import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Users, Building2, Globe, Mail, Phone, MoreHorizontal, Eye, Edit2, Trash2,
  Shield, CheckCircle2, AlertCircle, Loader2, Search, Filter,
  UserCheck, User, Users2, TrendingUp, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/utilisateurs")({
  head: () => ({ meta: [{ title: "Utilisateurs, Collectivités & Citoyens — VigieCity Platform" }] }),
  component: UtilisateursPage,
});

// ━━━ Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type PayingClient = {
  license_id: string;
  collectivity_id: string;
  collectivity_name: string;
  insee_code?: string;
  department_code?: string;
  region?: string;
  plan: string;
  status: string;
  expires_at?: string;
  contact_name?: string;
  contact_phone?: string;
  started_at: string;
  created_at: string;
};

type ClientEntity = {
  id: string;
  type: "epci" | "commune";
  name: string;
  siren?: string;
  insee_code?: string;
  population?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status: "active" | "trial" | "suspended";
  plan?: string; // Hameau, Village, Bourg, etc.
  last_access?: string;
  created_at: string;
};

type StaffUser = {
  id: string;
  display_name: string;
  email: string;
  collectivity_id: string;
  collectivity_name: string;
  collectivity_type: "epci" | "commune";
  role: "admin_epci" | "admin_commune" | "super_admin";
  last_access?: string;
  created_at: string;
};

type Citizen = {
  id: string;
  email?: string;
  commune_id: string;
  commune_name: string;
  last_access?: string;
  report_count: number;
  created_at: string;
};

// ━━━ KPI Stats ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type KPIs = {
  total: number;
  active: number;
  churn?: number;
  growth?: number;
};

// ━━━ Tabs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type Tab = "clients" | "users" | "citizens";

// ━━━ Main Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function UtilisateursPage() {
  const [tab, setTab] = useState<Tab>("clients");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  return (
    <PlatformShell activePath="/platform/utilisateurs">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs, Collectivités & Citoyens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez les clients payants, utilisateurs staff et citoyens de VigieCity
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setTab("clients")}
            className={`pb-3 text-sm font-medium transition-colors ${
              tab === "clients"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Clients Payants (Communes + EPCI)
            </div>
          </button>
          <button
            onClick={() => setTab("users")}
            className={`pb-3 text-sm font-medium transition-colors ${
              tab === "users"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs (Staff/Admins)
            </div>
          </button>
          <button
            onClick={() => setTab("citizens")}
            className={`pb-3 text-sm font-medium transition-colors ${
              tab === "citizens"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Citoyens (Public Users)
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Chercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Content by Tab */}
        {tab === "clients" && <ClientsTab search={search} qc={qc} />}
        {tab === "users" && <UsersTab search={search} qc={qc} />}
        {tab === "citizens" && <CitizensTab search={search} qc={qc} />}
      </div>
    </PlatformShell>
  );
}

// ━━━ Tab 1: Clients Payants ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ClientsTab({ search, qc }: { search: string; qc: ReturnType<typeof useQueryClient> }) {
  const [planFilter, setPlanFilter] = useState<string>("all");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["platform-clients"],
    queryFn: async () => {
      // Query active licenses from commune_licenses, joined with collectivities
      const { data } = await supabase
        .from("commune_licenses")
        .select("id, collectivity_id, plan, status, expires_at, contact_name, contact_phone, started_at, created_at, collectivities(name, insee_code, department_code, region)")
        .eq("status", "active")
        .neq("plan", "trial");

      if (!data) return [];

      return data.map((license: any) => ({
        license_id: license.id,
        collectivity_id: license.collectivity_id,
        collectivity_name: license.collectivities?.name || "N/A",
        insee_code: license.collectivities?.insee_code,
        department_code: license.collectivities?.department_code,
        region: license.collectivities?.region,
        plan: license.plan,
        status: license.status,
        expires_at: license.expires_at,
        contact_name: license.contact_name,
        contact_phone: license.contact_phone,
        started_at: license.started_at,
        created_at: license.created_at,
      })) as PayingClient[];
    },
  });

  // Calculate days until expiry
  const daysUntilExpiry = (expiresAt?: string): number | null => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt);
    const today = new Date();
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Extract unique plans
  const uniquePlans = Array.from(new Set(clients.map((c) => c.plan))).sort();

  // KPI Calculation
  const expiringCount = clients.filter((c) => {
    const days = daysUntilExpiry(c.expires_at);
    return days !== null && days > 0 && days <= 30;
  }).length;

  const planCounts: Record<string, number> = {};
  clients.forEach((c) => {
    planCounts[c.plan] = (planCounts[c.plan] || 0) + 1;
  });

  const kpis: KPIs = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
  };

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.collectivity_name.toLowerCase().includes(search.toLowerCase()) ||
      c.insee_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.department_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.region?.toLowerCase().includes(search.toLowerCase());

    const matchesPlan = planFilter === "all" || c.plan === planFilter;

    return matchesSearch && matchesPlan;
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Clients Payants</p>
              <p className="text-2xl font-bold mt-1">{kpis.total}</p>
            </div>
            <Building2 className="h-8 w-8 text-slate-300" />
          </div>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600">Par Plan</p>
              <p className="text-xs text-blue-700 mt-2">
                {uniquePlans.map((plan) => (
                  <span key={plan} className="block">
                    {plan}: <span className="font-bold">{planCounts[plan]}</span>
                  </span>
                ))}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-300" />
          </div>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-600">Expirent < 30j</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{expiringCount}</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-300" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium text-muted-foreground">Filtre par plan:</label>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="all">Tous les plans</option>
          {uniquePlans.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Collectivité</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Département</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Plan</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Expire le</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Contact</th>
              <th className="px-6 py-3 text-center font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((client) => {
              const expiryDays = daysUntilExpiry(client.expires_at);
              const isExpiring = expiryDays !== null && expiryDays > 0 && expiryDays <= 30;

              return (
                <tr key={client.license_id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium">{client.collectivity_name}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {client.department_code || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                      {client.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {client.expires_at ? (
                      <div className="flex items-center gap-2">
                        <span>{new Date(client.expires_at).toLocaleDateString("fr-FR")}</span>
                        {isExpiring && (
                          <AlertCircle className="h-4 w-4 text-red-500" title={`Expire dans ${expiryDays} jours`} />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {client.contact_name && (
                      <div className="font-medium">{client.contact_name}</div>
                    )}
                    {client.contact_phone && (
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {client.contact_phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 transition">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ━━━ Tab 2: Utilisateurs Staff ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function UsersTab({ search, qc }: { search: string; qc: ReturnType<typeof useQueryClient> }) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["platform-staff-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, profiles(display_name, email), role, collectivities(id, name, epci_id)")
        .in("role", ["admin_epci", "admin_commune"]);
      return (data ?? []) as any[];
    },
  });

  const kpis: KPIs = {
    total: users.length,
    active: Math.floor(users.length * 0.8), // Placeholder
  };

  const filtered = users.filter((u) =>
    u.profiles?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Utilisateurs</p>
              <p className="text-2xl font-bold mt-1">{kpis.total}</p>
            </div>
            <Users className="h-8 w-8 text-slate-300" />
          </div>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600">Actifs (30j)</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{kpis.active}</p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-300" />
          </div>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-600">Nouveaux (mois)</p>
              <p className="text-2xl font-bold mt-1 text-purple-600">0</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-300" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Nom</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Collectivité</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Rôle</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Inscrit le</th>
              <th className="px-6 py-3 text-center font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((user) => (
              <tr key={user.user_id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 font-medium">{user.profiles?.display_name || "N/A"}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.profiles?.email}</td>
                <td className="px-6 py-4 text-sm">{user.collectivities?.name || "—"}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {user.role === "admin_epci" ? "Admin EPCI" : "Admin Commune"}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-muted-foreground">—</td>
                <td className="px-6 py-4 text-center">
                  <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 transition">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ━━━ Tab 3: Citoyens ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CitizensTab({ search, qc }: { search: string; qc: ReturnType<typeof useQueryClient> }) {
  const { data: citizens = [], isLoading } = useQuery({
    queryKey: ["platform-citizens"],
    queryFn: async () => {
      // Query public users from Supabase
      const { data } = await supabase
        .from("profiles")
        .select("id, email, collectivity_id, collectivities(name), created_at");
      return (data ?? []) as any[];
    },
  });

  const kpis: KPIs = {
    total: citizens.length,
    active: Math.floor(citizens.length * 0.6), // Placeholder
  };

  const filtered = citizens.filter((c) =>
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.collectivities?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Citoyens</p>
              <p className="text-2xl font-bold mt-1">{kpis.total}</p>
            </div>
            <Globe className="h-8 w-8 text-slate-300" />
          </div>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-teal-600">Actifs (30j)</p>
              <p className="text-2xl font-bold mt-1 text-teal-600">{kpis.active}</p>
            </div>
            <User className="h-8 w-8 text-teal-300" />
          </div>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-600">Signalements (mois)</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">0</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-300" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Commune</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Signalements</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Inscrit le</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Dernier accès</th>
              <th className="px-6 py-3 text-center font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((citizen) => (
              <tr key={citizen.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 font-medium text-sm">{citizen.email || "—"}</td>
                <td className="px-6 py-4 text-sm">{citizen.collectivities?.name || "—"}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">0</td>
                <td className="px-6 py-4 text-xs text-muted-foreground">
                  {citizen.created_at ? new Date(citizen.created_at).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-6 py-4 text-xs text-muted-foreground">—</td>
                <td className="px-6 py-4 text-center">
                  <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 transition">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
