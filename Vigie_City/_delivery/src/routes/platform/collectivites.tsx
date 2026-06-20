import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/collectivites")({
  component: PlatformCollectivitesPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Collectivity = {
  id: string;
  name: string;
  insee_code: string | null;
  status: string | null;
  is_active: boolean;
  created_at: string;
};

const TYPE_OPTIONS = ["commune", "epci", "departement", "region"] as const;

const TYPE_COLORS: Record<string, string> = {
  commune:     "bg-blue-100 text-blue-700",
  epci:        "bg-purple-100 text-purple-700",
  departement: "bg-amber-100 text-amber-700",
  region:      "bg-teal-100 text-teal-700",
};

// ── Page ──────────────────────────────────────────────────────────────────────

function PlatformCollectivitesPage() {
  const qc = useQueryClient();
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: collectivities = [], isLoading } = useQuery<Collectivity[]>({
    queryKey: ["platform/collectivites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collectivities")
        .select("id, name, insee_code, status, is_active, created_at")
        .order("name");
      if (error) throw error;
      return data as Collectivity[];
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("collectivities").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform/collectivites"] }),
    onError:   () => toast.error("Erreur lors de la mise à jour"),
  });

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = collectivities.filter(c => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.insee_code ?? "").includes(search);
    const matchType = filterType === "all" || c.status === filterType;
    return matchSearch && matchType;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = [
    { label: "Total",    value: collectivities.length },
    { label: "Actives",  value: collectivities.filter(c => c.is_active).length },
    { label: "Communes", value: collectivities.filter(c => c.status === "commune").length },
    { label: "EPCI",     value: collectivities.filter(c => c.status === "epci").length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PlatformShell activePath="/platform/collectivites">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Collectivités</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestion des territoires et communes partenaires
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="mt-0.5 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou code INSEE…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
        >
          <option value="all">Tous types</option>
          {TYPE_OPTIONS.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
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
                <th className="w-10 px-5 py-3">Actif</th>
                <th className="px-5 py-3">Nom</th>
                <th className="px-5 py-3">Code INSEE</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Créée le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    Aucune collectivité trouvée
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleMut.mutate({ id: c.id, is_active: c.is_active })}
                        title={c.is_active ? "Désactiver" : "Activer"}
                        className="transition hover:opacity-80"
                      >
                        {c.is_active
                          ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                          : <ToggleLeft  className="h-5 w-5 text-slate-300"   />}
                      </button>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {c.insee_code ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <TypeBadge type={c.status} />
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
    </PlatformShell>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string | null }) {
  const cls = TYPE_COLORS[type ?? ""] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {type ?? "—"}
    </span>
  );
}
