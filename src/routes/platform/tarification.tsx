import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Edit2, Save, X, Loader2, Plus, Trash2,
  Building2, ArrowRight, Euro,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/tarification")({
  component: TarificationPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type Tranche = {
  id: string;
  label: string;
  nb_communes_min: number;
  nb_communes_max: number | null;
  price_monthly: number;
  notes: string | null;
  display_order: number;
};

// ── Page ───────────────────────────────────────────────────────────────────────

function TarificationPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Tranche | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: tranches = [], isLoading } = useQuery<Tranche[]>({
    queryKey: ["platform/tarification"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intercommunal_pricing")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Tranche[];
    },
  });

  const updateMut = useMutation({
    mutationFn: async (t: Tranche) => {
      const { error } = await supabase
        .from("intercommunal_pricing")
        .update({
          label:           t.label,
          nb_communes_min: t.nb_communes_min,
          nb_communes_max: t.nb_communes_max,
          price_monthly:   t.price_monthly,
          notes:           t.notes || null,
          display_order:   t.display_order,
        })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tranche mise à jour");
      qc.invalidateQueries({ queryKey: ["platform/tarification"] });
      setEditingId(null);
      setEditDraft(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("intercommunal_pricing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tranche supprimée");
      qc.invalidateQueries({ queryKey: ["platform/tarification"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(t: Tranche) {
    setEditingId(t.id);
    setEditDraft({ ...t });
  }

  return (
    <PlatformShell activePath="/platform/tarification">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tarification intercommunale</h1>
          <p className="mt-1 text-sm text-slate-500">
            Grille de prix pour les EPCI · {tranches.length} tranche{tranches.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: "#1e3a8a" }}
        >
          <Plus className="h-4 w-4" />
          Nouvelle tranche
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* En-tête visuel */}
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="grid grid-cols-[1fr_160px_120px_200px_80px] gap-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Label</span>
              <span>Tranches communes</span>
              <span>Prix/mois</span>
              <span>Notes</span>
              <span />
            </div>
          </div>

          {tranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="mb-3 h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-400">Aucune tranche configurée</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {tranches.map((t) =>
                editingId === t.id && editDraft ? (
                  <TrancheEditRow
                    key={t.id}
                    draft={editDraft}
                    onChange={setEditDraft}
                    onSave={() => updateMut.mutate(editDraft)}
                    onCancel={() => { setEditingId(null); setEditDraft(null); }}
                    isPending={updateMut.isPending}
                  />
                ) : (
                  <TrancheViewRow
                    key={t.id}
                    tranche={t}
                    onEdit={() => startEdit(t)}
                    onDelete={() => {
                      if (confirm(`Supprimer « ${t.label} » ?`)) deleteMut.mutate(t.id);
                    }}
                  />
                )
              )}
            </ul>
          )}

          {/* Récap total */}
          {tranches.length > 0 && (
            <div className="border-t border-slate-100 bg-blue-50/50 px-6 py-3">
              <p className="text-xs text-slate-500">
                Couverture : {Math.min(...tranches.map(t => t.nb_communes_min))} →{" "}
                {tranches.some(t => t.nb_communes_max === null)
                  ? "∞"
                  : Math.max(...tranches.map(t => t.nb_communes_max ?? 0))}{" "}
                communes EPCI ·{" "}
                {tranches[0].price_monthly} – {tranches[tranches.length - 1].price_monthly} €/mois
              </p>
            </div>
          )}
        </div>
      )}

      {addOpen && (
        <AddTrancheModal
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            qc.invalidateQueries({ queryKey: ["platform/tarification"] });
          }}
          nextOrder={(tranches[tranches.length - 1]?.display_order ?? 0) + 1}
        />
      )}
    </PlatformShell>
  );
}

// ── TrancheViewRow ─────────────────────────────────────────────────────────────

function TrancheViewRow({
  tranche: t, onEdit, onDelete,
}: {
  tranche: Tranche;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="grid grid-cols-[1fr_160px_120px_200px_80px] items-center gap-4 px-6 py-4 transition hover:bg-slate-50">
      {/* Label */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <Building2 className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{t.label}</p>
          <p className="text-xs text-slate-400">#{t.display_order}</p>
        </div>
      </div>

      {/* Tranches */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-mono font-semibold text-slate-700">{t.nb_communes_min}</span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="font-mono font-semibold text-slate-700">
          {t.nb_communes_max ?? "∞"}
        </span>
        <span className="text-xs text-slate-400">communes</span>
      </div>

      {/* Prix */}
      <div className="flex items-center gap-1 text-lg font-extrabold text-blue-700">
        <Euro className="h-4 w-4" />
        {t.price_monthly.toLocaleString("fr-FR")}
        <span className="text-xs font-medium text-slate-400">/mois</span>
      </div>

      {/* Notes */}
      <p className="text-sm text-slate-500 truncate">{t.notes ?? "—"}</p>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

// ── TrancheEditRow ─────────────────────────────────────────────────────────────

function TrancheEditRow({
  draft, onChange, onSave, onCancel, isPending,
}: {
  draft: Tranche;
  onChange: (t: Tranche) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  function set<K extends keyof Tranche>(k: K, v: Tranche[K]) {
    onChange({ ...draft, [k]: v });
  }

  const inputCls =
    "w-full rounded-xl border border-blue-200 bg-blue-50 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

  return (
    <li className="grid grid-cols-[1fr_160px_120px_200px_80px] items-center gap-4 bg-blue-50/60 px-6 py-3">
      {/* Label */}
      <input
        value={draft.label}
        onChange={e => set("label", e.target.value)}
        className={inputCls}
        placeholder="Label"
      />

      {/* Min → Max */}
      <div className="flex items-center gap-1">
        <input
          type="number" min={1}
          value={draft.nb_communes_min}
          onChange={e => set("nb_communes_min", Number(e.target.value))}
          className={`${inputCls} w-16`}
        />
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
        <input
          type="number" min={1}
          value={draft.nb_communes_max ?? ""}
          placeholder="∞"
          onChange={e => set("nb_communes_max", e.target.value ? Number(e.target.value) : null)}
          className={`${inputCls} w-16`}
        />
      </div>

      {/* Prix */}
      <input
        type="number" min={0}
        value={draft.price_monthly}
        onChange={e => set("price_monthly", Number(e.target.value))}
        className={inputCls}
      />

      {/* Notes */}
      <input
        value={draft.notes ?? ""}
        onChange={e => set("notes", e.target.value || null)}
        placeholder="Notes…"
        className={inputCls}
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        <button onClick={onCancel} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={onSave}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        </button>
      </div>
    </li>
  );
}

// ── AddTrancheModal ────────────────────────────────────────────────────────────

function AddTrancheModal({
  onClose, onSuccess, nextOrder,
}: {
  onClose: () => void;
  onSuccess: () => void;
  nextOrder: number;
}) {
  const [form, setForm] = useState({
    id: "",
    label: "",
    nb_communes_min: 1,
    nb_communes_max: "" as string,
    price_monthly: 0,
    notes: "",
    display_order: nextOrder,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.from("intercommunal_pricing").insert({
        id:              form.id.trim().toLowerCase().replace(/\s+/g, "_"),
        label:           form.label.trim(),
        nb_communes_min: form.nb_communes_min,
        nb_communes_max: form.nb_communes_max ? Number(form.nb_communes_max) : null,
        price_monthly:   Number(form.price_monthly),
        notes:           form.notes.trim() || null,
        display_order:   form.display_order,
      });
      if (err) throw err;
      toast.success("Tranche créée");
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
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Nouvelle tranche EPCI</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug (id)" required>
              <input
                required value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                placeholder="epci_xl"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
            <Field label="Label" required>
              <input
                required value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="EPCI > 50 communes"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
            <Field label="Communes min" required>
              <input
                type="number" min={1} required
                value={form.nb_communes_min}
                onChange={e => setForm(f => ({ ...f, nb_communes_min: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
            <Field label="Communes max (vide = ∞)">
              <input
                type="number" min={1}
                value={form.nb_communes_max}
                placeholder="∞"
                onChange={e => setForm(f => ({ ...f, nb_communes_max: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
            <Field label="Prix €/mois" required>
              <input
                type="number" min={0} required
                value={form.price_monthly}
                onChange={e => setForm(f => ({ ...f, price_monthly: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
            <Field label="Ordre d'affichage">
              <input
                type="number" min={0}
                value={form.display_order}
                onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
          </div>

          <Field label="Notes">
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ex : SLA renforcé, migration incluse…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
            />
          </Field>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
