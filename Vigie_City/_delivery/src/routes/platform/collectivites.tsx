import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Search, ToggleLeft, ToggleRight, Loader2,
  ChevronLeft, ChevronRight, Building2, Users,
  TrendingUp, Zap, Mail, Phone, Globe, Edit2,
  X, Save, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/collectivites")({
  component: PlatformCollectivitesPage,
});

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

type Collectivity = {
  id:              string;
  name:            string;
  insee_code:      string | null;
  postal_code:     string | null;
  department_code: string | null;
  region:          string | null;
  population:      number | null;
  is_active:       boolean;
  status:          "dormant" | "active" | "suspended";
  email:           string | null;
  phone:           string | null;
  website:         string | null;
  mayor_name:      string | null;
  created_at:      string;
};

type EditForm = {
  status:     Collectivity["status"];
  mayor_name: string;
  email:      string;
  phone:      string;
  website:    string;
};

type StatusKey = "all" | "active" | "dormant" | "suspended";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-emerald-100 text-emerald-700" },
  dormant:   { label: "Dormante",  cls: "bg-slate-100 text-slate-500"     },
  suspended: { label: "Suspendue", cls: "bg-red-100 text-red-600"         },
};

// ── Page ──────────────────────────────────────────────────────────────────────

function PlatformCollectivitesPage() {
  const qc = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [page,        setPage]       = useState(0);
  const [search,      setSearch]     = useState("");
  const [debSearch,   setDebSearch]  = useState("");
  const [statusTab,   setStatusTab]  = useState<StatusKey>("all");
  const [deptFilter,  setDeptFilter] = useState("");
  const [editTarget,  setEditTarget] = useState<Collectivity | null>(null);
  const [editForm,    setEditForm]   = useState<EditForm>({
    status: "dormant", mayor_name: "", email: "", phone: "", website: "",
  });

  // Debounce search 350 ms
  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [statusTab, deptFilter]);

  // ── Fetch paginated rows ────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["platform/collectivites", page, debSearch, statusTab, deptFilter],
    queryFn:  async () => {
      let q = supabase
        .from("collectivities")
        .select(
          "id, name, insee_code, postal_code, department_code, region, population, is_active, status, email, phone, website, mayor_name, created_at",
          { count: "exact" },
        )
        .order("status", { ascending: false }) // active first
        .order("name")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (debSearch)           q = q.ilike("name", `%${debSearch}%`);
      if (statusTab !== "all") q = q.eq("status", statusTab);
      if (deptFilter.trim())   q = q.eq("department_code", deptFilter.trim());

      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Collectivity[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  // ── Fetch global stats (4 lightweight count queries) ───────────────────────
  const { data: stats } = useQuery({
    queryKey: ["platform/collectivites/stats"],
    queryFn: async () => {
      const [totalRes, activeRes, dormantRes, activePopRes] = await Promise.all([
        supabase.from("collectivities").select("id", { count: "exact", head: true }),
        supabase.from("collectivities").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("collectivities").select("id", { count: "exact", head: true }).eq("status", "dormant"),
        supabase.from("collectivities").select("population").eq("status", "active"),
      ]);
      return {
        total:    totalRes.count  ?? 0,
        active:   activeRes.count ?? 0,
        dormant:  dormantRes.count ?? 0,
        totalPop: (activePopRes.data ?? []).reduce((s: number, r: any) => s + (r.population ?? 0), 0),
      };
    },
    staleTime: 5 * 60_000,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  // ── Toggle is_active ────────────────────────────────────────────────────────
  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("collectivities")
        .update({ is_active: !is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform/collectivites"] });
      toast.success("Visibilité mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  // ── Save CRM edit ───────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const { error } = await supabase
        .from("collectivities")
        .update({
          status:     editForm.status,
          email:      editForm.email      || null,
          phone:      editForm.phone      || null,
          website:    editForm.website    || null,
          mayor_name: editForm.mayor_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform/collectivites"] });
      qc.invalidateQueries({ queryKey: ["platform/collectivites/stats"] });
      toast.success("Commune mise à jour");
      setEditTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(c: Collectivity) {
    setEditTarget(c);
    setEditForm({
      status:     c.status,
      mayor_name: c.mayor_name ?? "",
      email:      c.email      ?? "",
      phone:      c.phone      ?? "",
      website:    c.website    ?? "",
    });
  }

  // ── Status tabs ─────────────────────────────────────────────────────────────
  const TABS: { key: StatusKey; label: string; count?: number }[] = [
    { key: "all",       label: "Toutes",            count: stats?.total   },
    { key: "active",    label: "✅ Clients actifs",  count: stats?.active  },
    { key: "dormant",   label: "Prospects",          count: stats?.dormant },
    { key: "suspended", label: "Suspendues"                                },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PlatformShell activePath="/platform/collectivites">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Collectivités</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          CRM — {(stats?.total ?? 0).toLocaleString("fr-FR")} communes françaises
        </p>
      </div>

      {/* KPIs — 4 cartes en grille */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<Building2    className="h-4 w-4 text-blue-600" />}
          label="Total communes"
          value={(stats?.total ?? 0).toLocaleString("fr-FR")}
        />
        <KpiCard
          icon={<Zap          className="h-4 w-4 text-emerald-600" />}
          label="Clients actifs"
          value={stats?.active ?? 0}
          highlight
        />
        <KpiCard
          icon={<TrendingUp   className="h-4 w-4 text-violet-600" />}
          label="Prospects"
          value={(stats?.dormant ?? 0).toLocaleString("fr-FR")}
        />
        <KpiCard
          icon={<Users        className="h-4 w-4 text-orange-500" />}
          label="Pop. couverte"
          value={`${Math.round((stats?.totalPop ?? 0) / 1000)}k`}
        />
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setStatusTab(t.key)}
            className={[
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition",
              statusTab === t.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            ].join(" ")}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  statusTab === t.key ? "bg-white/20" : "bg-slate-200 text-slate-600"
                }`}
              >
                {t.count.toLocaleString("fr-FR")}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + dept filter */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou code INSEE…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
          />
        </div>
        <div className="relative w-32">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Dépt. (75…)"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            maxLength={3}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
          />
        </div>
      </div>

      {/* Table */}
      <div
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-opacity ${
          isFetching && !isLoading ? "opacity-60" : ""
        }`}
      >
        {/* Table header row */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-sm text-slate-500">
            {(data?.total ?? 0).toLocaleString("fr-FR")}{" "}
            résultat{(data?.total ?? 0) !== 1 ? "s" : ""}
          </p>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3">Commune</th>
                <th className="px-4 py-3">INSEE / CP</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3 text-right">Population</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Statut</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.rows ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">
                    Aucune collectivité trouvée
                  </td>
                </tr>
              ) : (
                (data?.rows ?? []).map(c => {
                  const sm = STATUS_META[c.status] ?? STATUS_META.dormant;
                  const hasContact = c.email || c.phone || c.website;
                  return (
                    <tr key={c.id} className="group transition hover:bg-slate-50">
                      {/* Active toggle */}
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => toggleMut.mutate({ id: c.id, is_active: c.is_active })}
                          title={c.is_active ? "Désactiver" : "Activer"}
                          className="transition hover:opacity-70"
                        >
                          {c.is_active
                            ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                            : <ToggleLeft  className="h-5 w-5 text-slate-300"   />}
                        </button>
                      </td>

                      {/* Name + postal */}
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-slate-900">{c.name}</span>
                        {c.postal_code && (
                          <span className="ml-1.5 text-[11px] text-slate-400">
                            {c.postal_code}
                          </span>
                        )}
                        {c.mayor_name && (
                          <p className="mt-0.5 text-[11px] text-slate-400">{c.mayor_name}</p>
                        )}
                      </td>

                      {/* INSEE */}
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                        {c.insee_code ?? "—"}
                      </td>

                      {/* Dept */}
                      <td className="px-4 py-2.5 text-xs font-semibold text-slate-500">
                        {c.department_code ?? "—"}
                      </td>

                      {/* Population */}
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-500">
                        {c.population ? c.population.toLocaleString("fr-FR") : "—"}
                      </td>

                      {/* Contact icons */}
                      <td className="px-4 py-2.5">
                        {hasContact ? (
                          <div className="flex gap-2">
                            {c.email   && <Mail  className="h-3.5 w-3.5 text-blue-500"    title={c.email}   />}
                            {c.phone   && <Phone className="h-3.5 w-3.5 text-green-500"   title={c.phone}   />}
                            {c.website && <Globe className="h-3.5 w-3.5 text-violet-500"  title={c.website} />}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sm.cls}`}>
                          {sm.label}
                        </span>
                      </td>

                      {/* Edit button */}
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => openEdit(c)}
                          className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 group-hover:block"
                          title="Modifier"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">
              Page {page + 1} sur {totalPages.toLocaleString("fr-FR")}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Show 5 page buttons centered on current */}
              {(() => {
                const start = Math.max(0, Math.min(totalPages - 5, page - 2));
                return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] rounded-lg border px-2 py-1 text-xs font-medium transition ${
                      p === page
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p + 1}
                  </button>
                ));
              })()}

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit / CRM modal ─────────────────────────────────────────────────── */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">{editTarget.name}</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  INSEE {editTarget.insee_code ?? "—"} ·
                  Dept {editTarget.department_code ?? "—"} ·{" "}
                  {editTarget.population?.toLocaleString("fr-FR") ?? "?"} hab.
                </p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Statut lifecycle */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Statut VigieCity
                </label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Collectivity["status"] }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dormant">Dormante (prospect)</option>
                  <option value="active">Active — client VigieCity ✅</option>
                  <option value="suspended">Suspendue</option>
                </select>
              </div>

              <CrmField
                label="Maire / Référent"
                value={editForm.mayor_name}
                onChange={v => setEditForm(f => ({ ...f, mayor_name: v }))}
                placeholder="Mme Marie Dupont"
              />
              <CrmField
                label="Email mairie"
                value={editForm.email}
                onChange={v => setEditForm(f => ({ ...f, email: v }))}
                placeholder="mairie@commune.fr"
                type="email"
              />
              <CrmField
                label="Téléphone"
                value={editForm.phone}
                onChange={v => setEditForm(f => ({ ...f, phone: v }))}
                placeholder="01 23 45 67 89"
              />
              <CrmField
                label="Site web"
                value={editForm.website}
                onChange={v => setEditForm(f => ({ ...f, website: v }))}
                placeholder="https://www.commune.fr"
              />
            </div>

            {/* Modal actions */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PlatformShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, highlight,
}: {
  icon:       React.ReactNode;
  label:      string;
  value:      string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        highlight
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div
        className={`text-2xl font-extrabold ${
          highlight ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function CrmField({
  label, value, onChange, placeholder, type = "text",
}: {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  type?:        string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
