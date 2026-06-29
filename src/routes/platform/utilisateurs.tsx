import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Building2, Users, User, UserPlus, MapPin,
  ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Loader2, Plus, Search, Shield, AlertCircle,
  Globe, MoreHorizontal, Edit2, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/utilisateurs")({
  component: PlatformUtilisateursPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Intercommunality = {
  id:             string;
  name:           string;
  siren:          string | null;
  type:           string;
  region:         string | null;
  department:     string | null;
  max_communes:   number;
  is_active:      boolean;
  contact_name:   string | null;
  contact_email:  string | null;
  notes:          string | null;
  created_at:     string;
};

type Commune = {
  id:         string;
  name:       string;
  insee_code: string | null;
  is_active:  boolean;
  status:     string;
  population: number | null;
};

type EpciAdmin = {
  user_id:      string;
  display_name: string | null;
};

type EpciStats = {
  total_reports: number;
  total_users:   number;
};

type Profile = {
  id:              string;
  display_name:    string | null;
  role:            string | null;
  city:            string | null;
  collectivity_id: string | null;
  created_at:      string;
  collectivities:  { name: string } | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  communaute_communes:      "Communauté de communes",
  communaute_agglomeration: "Communauté d'agglomération",
  communaute_urbaine:       "Communauté urbaine",
  metropole:                "Métropole",
  syndicat:                 "Syndicat mixte",
};

const TYPE_BADGE: Record<string, string> = {
  communaute_communes:      "bg-sky-100 text-sky-700",
  communaute_agglomeration: "bg-violet-100 text-violet-700",
  communaute_urbaine:       "bg-indigo-100 text-indigo-700",
  metropole:                "bg-purple-100 text-purple-700",
  syndicat:                 "bg-amber-100 text-amber-700",
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

// ── Shared helpers ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[type] ?? "bg-slate-100 text-slate-600"}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
  );
}

function KpiCard({ icon, value, label, bg }: { icon: ReactNode; value: ReactNode; label: string; bg: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 ${bg} p-4`}>
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ── Modal : créer/éditer EPCI ─────────────────────────────────────────────────

type EpciFormData = {
  name:           string;
  siren:          string;
  type:           string;
  region:         string;
  department:     string;
  max_communes:   number;
  contact_name:   string;
  contact_email:  string;
  notes:          string;
};

const EMPTY_FORM: EpciFormData = {
  name: "", siren: "", type: "communaute_communes",
  region: "", department: "", max_communes: 5,
  contact_name: "", contact_email: "", notes: "",
};

function EpciModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: Partial<EpciFormData>;
  onClose: () => void;
  onSave: (data: EpciFormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<EpciFormData>({ ...EMPTY_FORM, ...initial });
  const set = (k: keyof EpciFormData, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold">{initial?.name ? "Modifier l'EPCI" : "Nouvel EPCI"}</h2>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nom *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="CC Côte Lumineuse" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">SIREN</label>
              <input value={form.siren} onChange={e => set("siren", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="200000172" maxLength={9} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Quota communes</label>
              <input type="number" min={1} max={500} value={form.max_communes}
                onChange={e => set("max_communes", parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200">
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Région</label>
              <input value={form.region} onChange={e => set("region", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nouvelle-Aquitaine" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Département</label>
              <input value={form.department} onChange={e => set("department", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Charente-Maritime" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact nom</label>
              <input value={form.contact_name} onChange={e => set("contact_name", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact email</label>
              <input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Notes internes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EPCI Card ─────────────────────────────────────────────────────────────────

function EpciCard({ epci, qc }: { epci: Intercommunality; qc: ReturnType<typeof useQueryClient> }) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing,  setEditing]  = useState(false);

  // Communes membres (chargées à l'expansion)
  const { data: communes = [], isLoading: commLoading } = useQuery<Commune[]>({
    queryKey: ["epci-communes", epci.id],
    enabled: expanded,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collectivities")
        .select("id, name, insee_code, is_active, status, population")
        .eq("epci_id", epci.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Commune[];
    },
  });

  // Admin EPCI
  const { data: admins = [] } = useQuery<EpciAdmin[]>({
    queryKey: ["epci-admins", epci.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, profiles(display_name)")
        .eq("epci_id", epci.id)
        .eq("role", "epci_admin");
      return (data ?? []).map((r: any) => ({
        user_id:      r.user_id,
        display_name: r.profiles?.display_name ?? null,
      }));
    },
  });

  // Stats agrégées (ids communes récupérés une seule fois)
  const { data: stats } = useQuery<EpciStats>({
    queryKey: ["epci-stats", epci.id],
    queryFn: async () => {
      const { data: comms } = await supabase
        .from("collectivities").select("id").eq("epci_id", epci.id);
      const ids = (comms ?? []).map(c => c.id);
      if (ids.length === 0) return { total_reports: 0, total_users: 0 };
      const [repRes, usrRes] = await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }).in("collectivity_id", ids),
        supabase.from("profiles").select("id", { count: "exact", head: true }).in("collectivity_id", ids),
      ]);
      return { total_reports: repRes.count ?? 0, total_users: usrRes.count ?? 0 };
    },
  });

  const activeCount = communes.filter(c => c.is_active).length;
  const slot_pct    = Math.min(100, Math.round((activeCount / epci.max_communes) * 100));

  const toggleActive = useMutation({
    mutationFn: async () => {
      await supabase.from("intercommunalities")
        .update({ is_active: !epci.is_active })
        .eq("id", epci.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform-intercommunalites"] }); },
  });

  const saveEdit = useMutation({
    mutationFn: async (form: EpciFormData) => {
      const { error } = await supabase.from("intercommunalities").update({
        name:          form.name.trim(),
        siren:         form.siren.trim() || null,
        type:          form.type,
        region:        form.region.trim() || null,
        department:    form.department.trim() || null,
        max_communes:  form.max_communes,
        contact_name:  form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        notes:         form.notes.trim() || null,
      }).eq("id", epci.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("EPCI mis à jour");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["platform-intercommunalites"] });
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  return (
    <>
      {editing && (
        <EpciModal
          initial={{
            name: epci.name, siren: epci.siren ?? "", type: epci.type,
            region: epci.region ?? "", department: epci.department ?? "",
            max_communes: epci.max_communes, contact_name: epci.contact_name ?? "",
            contact_email: epci.contact_email ?? "", notes: epci.notes ?? "",
          }}
          onClose={() => setEditing(false)}
          onSave={f => saveEdit.mutate(f)}
          saving={saveEdit.isPending}
        />
      )}

      <div className={`rounded-2xl border bg-white shadow-sm transition ${epci.is_active ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
        {/* Header */}
        <div className="flex items-start gap-4 p-5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${epci.is_active ? "bg-violet-100" : "bg-slate-100"}`}>
            <Building2 className={`h-5 w-5 ${epci.is_active ? "text-violet-600" : "text-slate-400"}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusDot active={epci.is_active} />
              <span className="font-semibold text-slate-900 truncate">{epci.name}</span>
              <TypeBadge type={epci.type} />
              {epci.siren && (
                <span className="text-xs text-slate-400 font-mono">{epci.siren}</span>
              )}
            </div>

            {(epci.region || epci.department) && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                {[epci.department, epci.region].filter(Boolean).join(" · ")}
              </p>
            )}

            {/* Slot bar */}
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[160px]">
                <div
                  className={`h-full rounded-full transition-all ${slot_pct >= 90 ? "bg-red-400" : slot_pct >= 70 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${slot_pct}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {activeCount}/{epci.max_communes} communes
              </span>
            </div>
          </div>

          {/* Stats chips */}
          <div className="hidden sm:flex flex-col items-end gap-1 text-right shrink-0">
            {stats && (
              <>
                <span className="text-xs text-slate-500">{stats.total_reports} signalements</span>
                <span className="text-xs text-slate-500">{stats.total_users} citoyens</span>
              </>
            )}
            {admins.length > 0 ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <Shield className="h-3 w-3" />
                {admins[0].display_name ?? "Admin EPCI"}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <AlertCircle className="h-3 w-3" /> Aucun admin
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="relative shrink-0">
            <button onClick={() => setShowMenu(v => !v)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-20 min-w-[180px] rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                <button onClick={() => { setEditing(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Edit2 className="h-4 w-4" /> Modifier
                </button>
                <button onClick={() => { toggleActive.mutate(); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  {epci.is_active ? <XCircle className="h-4 w-4 text-red-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {epci.is_active ? "Désactiver" : "Activer"}
                </button>
              </div>
            )}
          </div>

          <button onClick={() => setExpanded(v => !v)}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 ml-1">
            {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        {/* Expanded: communes list */}
        {expanded && (
          <div className="border-t border-slate-100 px-5 pb-4">
            {commLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : communes.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Aucune commune rattachée à cet EPCI.
              </div>
            ) : (
              <>
                <p className="mt-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Communes membres ({communes.length})
                </p>
                <div className="space-y-1">
                  {communes.map(c => (
                    <div key={c.id}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      <StatusDot active={c.is_active} />
                      <span className="flex-1 text-sm font-medium text-slate-700 truncate">{c.name}</span>
                      {c.insee_code && (
                        <span className="text-xs text-slate-400 font-mono">{c.insee_code}</span>
                      )}
                      {c.population && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Users className="h-3 w-3" />
                          {c.population.toLocaleString("fr-FR")} hab.
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        c.status === "active"    ? "bg-emerald-100 text-emerald-700" :
                        c.status === "dormant"   ? "bg-slate-100 text-slate-500" :
                        c.status === "suspended" ? "bg-red-100 text-red-600" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {c.status === "active" ? "Active" : c.status === "dormant" ? "Dormante" : "Suspendue"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Admin section */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Admin EPCI
              </p>
              {admins.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" /> Aucun admin EPCI assigné
                </p>
              ) : (
                <div className="space-y-1">
                  {admins.map(a => (
                    <div key={a.user_id}
                      className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2">
                      <Shield className="h-4 w-4 text-violet-500 shrink-0" />
                      <span className="text-sm font-medium text-violet-700">{a.display_name ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact */}
            {(epci.contact_name || epci.contact_email) && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Contact</p>
                <p className="text-sm text-slate-600">
                  {epci.contact_name && <span className="font-medium">{epci.contact_name} · </span>}
                  {epci.contact_email && (
                    <a href={`mailto:${epci.contact_email}`} className="text-blue-600 hover:underline">
                      {epci.contact_email}
                    </a>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Tab : Clients payants (Communes + EPCI) ───────────────────────────────────

function ClientsTab() {
  const qc = useQueryClient();
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data: epciList = [], isLoading } = useQuery<Intercommunality[]>({
    queryKey: ["platform-intercommunalites"],
    queryFn: async () => {
      await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("intercommunalities")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Intercommunality[];
    },
  });

  const createEpci = useMutation({
    mutationFn: async (form: EpciFormData) => {
      const { error } = await supabase.from("intercommunalities").insert({
        name:          form.name.trim(),
        siren:         form.siren.trim() || null,
        type:          form.type,
        region:        form.region.trim() || null,
        department:    form.department.trim() || null,
        max_communes:  form.max_communes,
        contact_name:  form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        notes:         form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("EPCI créé");
      setShowModal(false);
      qc.invalidateQueries({ queryKey: ["platform-intercommunalites"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const filtered = epciList.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.region?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive   = epciList.filter(e => e.is_active).length;
  const totalCommunes = epciList.reduce((s, e) => s + e.max_communes, 0);

  return (
    <>
      {showModal && (
        <EpciModal
          onClose={() => setShowModal(false)}
          onSave={f => createEpci.mutate(f)}
          saving={createEpci.isPending}
        />
      )}

      {/* Sub-header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Cascade super_admin → EPCI → communes → admins → opérateurs
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Nouvel EPCI
        </button>
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <KpiCard icon={<Building2 className="h-5 w-5 text-violet-500" />}  value={totalActive}     label="EPCI actifs"      bg="bg-violet-50" />
        <KpiCard icon={<Globe className="h-5 w-5 text-blue-500" />}        value={epciList.length} label="Total EPCI"       bg="bg-blue-50" />
        <KpiCard icon={<BarChart3 className="h-5 w-5 text-emerald-500" />} value={totalCommunes}   label="Slots contractés" bg="bg-emerald-50" />
      </div>

      {/* Search */}
      <div className="mb-5 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un EPCI, une région, un département…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Building2 className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">
            {search ? "Aucun EPCI ne correspond à la recherche." : "Aucun EPCI enregistré."}
          </p>
          {!search && (
            <button onClick={() => setShowModal(true)}
              className="mt-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Créer le premier EPCI
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(epci => (
            <EpciCard key={epci.id} epci={epci} qc={qc} />
          ))}
        </div>
      )}
    </>
  );
}

// ── Tab : Utilisateurs (profils plateforme + éditeur de rôle) ─────────────────

function UsersTab() {
  const qc = useQueryClient();
  const [search,     setSearch]     = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: ["platform/users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role, collectivity_id, created_at, collectivities(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
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

  const filtered = profiles.filter(p => {
    const name = (p.display_name ?? "").toLowerCase();
    const q = search.toLowerCase();
    const matchSearch =
      !q || name.includes(q) || p.id.toLowerCase().startsWith(q);
    const matchRole = filterRole === "all" || p.role === filterRole;
    return matchSearch && matchRole;
  });

  const adminCount = profiles.filter(p =>
    ["commune_admin", "interco_admin", "super_admin"].includes(p.role ?? "")
  ).length;
  const newCount = profiles.filter(p =>
    Date.now() - new Date(p.created_at).getTime() <= THIRTY_DAYS_MS
  ).length;

  return (
    <>
      {/* KPI */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <KpiCard icon={<Users className="h-5 w-5 text-blue-500" />}     value={profiles.length} label="Profils total"   bg="bg-blue-50" />
        <KpiCard icon={<Shield className="h-5 w-5 text-emerald-500" />} value={adminCount}      label="Administrateurs" bg="bg-emerald-50" />
        <KpiCard icon={<UserPlus className="h-5 w-5 text-violet-500" />} value={newCount}       label="Nouveaux (30j)"  bg="bg-violet-50" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
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
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-sm text-slate-500">
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Utilisateur</th>
                <th className="px-5 py-3">Rôle</th>
                <th className="px-5 py-3">Collectivité</th>
                <th className="px-5 py-3">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
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
                    {/* Date */}
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Tab : Citoyens (profils role = citizen) ───────────────────────────────────

function CitizensTab() {
  const [search, setSearch] = useState("");

  const { data: citizens = [], isLoading } = useQuery<Profile[]>({
    queryKey: ["platform/citizens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role, city, collectivity_id, created_at, collectivities(name)")
        .eq("role", "citizen")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const filtered = citizens.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      (c.display_name ?? "").toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q);
  });

  const newCount = citizens.filter(c =>
    Date.now() - new Date(c.created_at).getTime() <= THIRTY_DAYS_MS
  ).length;
  const withCommune = citizens.filter(c => c.collectivity_id).length;

  return (
    <>
      {/* KPI */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <KpiCard icon={<User className="h-5 w-5 text-blue-500" />}      value={citizens.length} label="Citoyens"          bg="bg-blue-50" />
        <KpiCard icon={<UserPlus className="h-5 w-5 text-emerald-500" />} value={newCount}      label="Nouveaux (30j)"    bg="bg-emerald-50" />
        <KpiCard icon={<Building2 className="h-5 w-5 text-violet-500" />} value={withCommune}   label="Rattachés commune" bg="bg-violet-50" />
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un citoyen par nom ou ville…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-sm text-slate-500">
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Citoyen</th>
                <th className="px-5 py-3">Ville</th>
                <th className="px-5 py-3">Commune</th>
                <th className="px-5 py-3">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                    Aucun citoyen trouvé
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">
                        {c.display_name ?? (
                          <span className="italic text-slate-400">Sans nom</span>
                        )}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">{c.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {c.city ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {c.collectivities?.name ?? (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "clients",  label: "Clients payants", icon: Building2 },
  { key: "users",    label: "Utilisateurs",    icon: Users },
  { key: "citizens", label: "Citoyens",        icon: User },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function PlatformUtilisateursPage() {
  return (
    <PlatformShell activePath="/platform/utilisateurs">
      <UtilisateursContent />
    </PlatformShell>
  );
}

function UtilisateursContent() {
  const [tab, setTab] = useState<TabKey>("clients");

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Utilisateurs, Collectivités &amp; Citoyens</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestion unifiée des clients payants, des comptes plateforme et des citoyens.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                active ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab */}
      {tab === "clients"  && <ClientsTab />}
      {tab === "users"    && <UsersTab />}
      {tab === "citizens" && <CitizensTab />}
    </div>
  );
}
