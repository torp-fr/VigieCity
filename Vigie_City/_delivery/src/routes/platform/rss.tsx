import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus, RefreshCw, Trash2, Globe, Building2,
  AlertCircle, Loader2, ToggleLeft, ToggleRight, X, Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/rss")({
  component: PlatformRssPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type RssSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  active: boolean;
  collectivity_id: string | null;
  last_fetched_at: string | null;
  fetch_error: string | null;
  created_at: string;
  collectivities: { name: string } | null;
};

const CATEGORIES = [
  "general", "local", "securite",
  "evenements", "services", "environnement",
] as const;

const CAT_COLORS: Record<string, string> = {
  general:       "bg-blue-100 text-blue-700",
  local:         "bg-emerald-100 text-emerald-700",
  securite:      "bg-red-100 text-red-700",
  evenements:    "bg-purple-100 text-purple-700",
  services:      "bg-amber-100 text-amber-700",
  environnement: "bg-teal-100 text-teal-700",
};

function fmtDt(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

function PlatformRssPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  // ── Queries / mutations ──────────────────────────────────────────────────

  const { data: sources = [], isLoading } = useQuery<RssSource[]>({
    queryKey: ["platform/rss"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rss_sources")
        .select("*, collectivities(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RssSource[];
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("rss_sources").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform/rss"] }),
    onError:   () => toast.error("Erreur lors de la mise à jour"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rss_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Flux supprimé");
      qc.invalidateQueries({ queryKey: ["platform/rss"] });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const syncMut = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("fetch-rss", { body: {} });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(`${d?.fetched ?? 0} article(s) synchronisé(s)`);
      qc.invalidateQueries({ queryKey: ["platform/rss"] });
    },
    onError: () => toast.error("Erreur de synchronisation"),
  });

  // ── Split global / local ─────────────────────────────────────────────────

  const globalSrcs = sources.filter(s => !s.collectivity_id);
  const localSrcs  = sources.filter(s => !!s.collectivity_id);
  const activeCount = sources.filter(s => s.active).length;

  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce flux et tous ses articles ?")) deleteMut.mutate(id);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PlatformShell activePath="/platform/rss">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flux RSS</h1>
          <p className="mt-1 text-sm text-slate-500">
            {sources.length} source{sources.length !== 1 ? "s" : ""} · {activeCount} active{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
            Sync global
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: "#1e3a8a" }}
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* Global sources */}
          <RssSection
            label="Flux globaux"
            icon={<Globe className="h-4 w-4" />}
            sources={globalSrcs}
            catColors={CAT_COLORS}
            onToggle={(id, active) => toggleMut.mutate({ id, active })}
            onDelete={handleDelete}
          />

          {/* Per-collectivity sources */}
          {localSrcs.length > 0 && (
            <RssSection
              label="Flux par collectivité"
              icon={<Building2 className="h-4 w-4" />}
              sources={localSrcs}
              showCollectivity
              catColors={CAT_COLORS}
              onToggle={(id, active) => toggleMut.mutate({ id, active })}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}

      {/* Add modal */}
      {addOpen && (
        <AddSourceModal
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            qc.invalidateQueries({ queryKey: ["platform/rss"] });
          }}
          categories={CATEGORIES}
        />
      )}
    </PlatformShell>
  );
}

// ── RssSection ────────────────────────────────────────────────────────────────

function RssSection({
  label, icon, sources, showCollectivity = false, catColors, onToggle, onDelete,
}: {
  label: string;
  icon: React.ReactNode;
  sources: RssSource[];
  showCollectivity?: boolean;
  catColors: Record<string, string>;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon} {label} ({sources.length})
      </h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="w-10 px-4 py-3">Actif</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Catégorie</th>
              {showCollectivity && <th className="px-4 py-3">Collectivité</th>}
              <th className="px-4 py-3">Dernière sync</th>
              <th className="px-4 py-3">Statut</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sources.length === 0 ? (
              <tr>
                <td
                  colSpan={showCollectivity ? 7 : 6}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  Aucun flux
                </td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr key={s.id} className="transition hover:bg-slate-50">
                  {/* Toggle */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggle(s.id, s.active)}
                      title={s.active ? "Désactiver" : "Activer"}
                      className="transition hover:opacity-80"
                    >
                      {s.active
                        ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                        : <ToggleLeft  className="h-5 w-5 text-slate-300"   />}
                    </button>
                  </td>
                  {/* Name + URL */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <a
                      href={s.url} target="_blank" rel="noopener noreferrer"
                      className="block max-w-[220px] truncate text-[11px] text-blue-500 hover:underline"
                    >
                      {s.url}
                    </a>
                  </td>
                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${catColors[s.category] ?? "bg-slate-100 text-slate-600"}`}>
                      {s.category}
                    </span>
                  </td>
                  {/* Collectivity */}
                  {showCollectivity && (
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {s.collectivities?.name ?? "—"}
                    </td>
                  )}
                  {/* Last fetch */}
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDt(s.last_fetched_at)}</td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    {s.fetch_error ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[140px] truncate">{s.fetch_error}</span>
                      </span>
                    ) : s.last_fetched_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <Check className="h-3.5 w-3.5" /> OK
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  {/* Delete */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDelete(s.id)}
                      title="Supprimer"
                      className="text-slate-300 transition hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── AddSourceModal ─────────────────────────────────────────────────────────────

function AddSourceModal({
  onClose, onSuccess, categories,
}: {
  onClose: () => void;
  onSuccess: () => void;
  categories: readonly string[];
}) {
  const [form, setForm]       = useState({ name: "", url: "", category: "general", collectivity_id: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const { data: communes = [] } = useQuery({
    queryKey: ["platform/communes-short"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collectivities")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
        .limit(300);
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.from("rss_sources").insert({
        name:            form.name.trim(),
        url:             form.url.trim(),
        category:        form.category,
        collectivity_id: form.collectivity_id || null,
        active:          true,
      });
      if (err) throw err;
      toast.success("Flux ajouté");
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Ajouter un flux RSS</h3>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <FormField label="Nom" required>
            <input
              type="text" required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Le Monde — Sécurité"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:border-blue-500 focus:bg-white focus:ring-2"
            />
          </FormField>

          <FormField label="URL du flux RSS" required>
            <input
              type="url" required
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://exemple.fr/rss.xml"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:border-blue-500 focus:bg-white focus:ring-2"
            />
          </FormField>

          <FormField label="Catégorie">
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:border-blue-500 focus:bg-white focus:ring-2"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>

          <FormField label="Collectivité (vide = global)">
            <select
              value={form.collectivity_id}
              onChange={e => setForm(f => ({ ...f, collectivity_id: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-blue-500 transition focus:border-blue-500 focus:bg-white focus:ring-2"
            >
              <option value="">— Global (toutes communes) —</option>
              {communes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 rounded-xl py-2 text-sm font-semibold text-white transition disabled:opacity-60 hover:opacity-90"
              style={{ backgroundColor: "#1e3a8a" }}
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
