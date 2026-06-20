import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
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

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = profiles.filter(p => {
    const name = (p.display_name ?? "").toLowerCase();
    const matchSearch =
      !search ||
      name.includes(search.toLowerCase()) ||
      p.id.toLowerCase().startsWith(search.toLowerCase());
    const matchRole = filterRole === "all" || p.role === filterRole;
    return matchSearch && matchRole;
  });

  const adminCount = profiles.filter(p =>
    ["commune_admin", "interco_admin", "super_admin"].includes(p.role ?? "")
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PlatformShell activePath="/platform/users">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
        <p className="mt-1 text-sm text-slate-500">
          {profiles.length} profil{profiles.length !== 1 ? "s" : ""} · {adminCount} administrateur{adminCount !== 1 ? "s" : ""}
        </p>
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
    </PlatformShell>
  );
}
