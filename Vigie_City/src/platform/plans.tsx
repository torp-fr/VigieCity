import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Edit2, Save, X, Check, ToggleLeft, ToggleRight,
  Loader2, Plus, Trash2, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/plans")({
  component: PlansPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type PlanFeatures = {
  carte: boolean;
  publications: boolean;
  services_perso: boolean;
  voisins_vigilants: boolean;
  push_notifications: boolean;
  stats_avancees: boolean;
  white_label: boolean;
  api_acces: boolean;
  support: "email" | "prioritaire" | "dedié" | "none";
};

type Plan = {
  id: string;
  name: string;
  price_monthly: number;
  max_users: number | null;
  max_communes: number | null;
  features: PlanFeatures;
  is_active: boolean;
  display_order: number;
};

const FEATURE_LABELS: Record<keyof Omit<PlanFeatures, "support">, string> = {
  carte:              "Carte interactive",
  publications:       "Publications",
  services_perso:     "Services personnalisés",
  voisins_vigilants:  "Voisins vigilants",
  push_notifications: "Notifications push",
  stats_avancees:     "Stats avancées",
  white_label:        "White label",
  api_acces:          "Accès API",
};

const SUPPORT_OPTIONS = ["none", "email", "prioritaire", "dedié"] as const;

// ── Page ───────────────────────────────────────────────────────────────────────

function PlansPage() {
  return (
    <PlatformShell activePath="/platform/plans">
      <PlansPageContent />
    </PlatformShell>
  );
}


function PlansPageContent() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Plan | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["platform/plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const updateMut = useMutation({
    mutationFn: async (plan: Plan) => {
      const { error } = await supabase
        .from("plans")
        .update({
          name:           plan.name,
          price_monthly:  plan.price_monthly,
          max_users:      plan.max_users,
          max_communes:   plan.max_communes,
          features:       plan.features,
          is_active:      plan.is_active,
          display_order:  plan.display_order,
        })
        .eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan mis à jour");
      qc.invalidateQueries({ queryKey: ["platform/plans"] });
      setEditingId(null);
      setEditDraft(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("plans")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform/plans"] }),
    onError:   (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan supprimé");
      qc.invalidateQueries({ queryKey: ["platform/plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setEditDraft(JSON.parse(JSON.stringify(plan)));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Supprimer le plan « ${name} » ?`)) deleteMut.mutate(id);
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plans tarifaires</h1>
          <p className="mt-1 text-sm text-slate-500">
            Offres pour les communes individuelles · {plans.length} plan{plans.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nouveau plan
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) =>
            editingId === plan.id && editDraft ? (
              <div key={plan.id} className="col-span-full">
                <PlanEditCard
                  draft={editDraft}
                  onChange={setEditDraft}
                  onSave={() => updateMut.mutate(editDraft)}
                  onCancel={cancelEdit}
                  isPending={updateMut.isPending}
                />
              </div>
            ) : (
              <PlanViewCard
                key={plan.id}
                plan={plan}
                onEdit={() => startEdit(plan)}
                onToggle={() => toggleMut.mutate({ id: plan.id, is_active: plan.is_active })}
                onDelete={() => handleDelete(plan.id, plan.name)}
                isToggling={toggleMut.isPending}
              />
            )
          )}
        </div>
      )}

      {addOpen && (
        <AddPlanModal
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            qc.invalidateQueries({ queryKey: ["platform/plans"] });
          }}
          nextOrder={(plans[plans.length - 1]?.display_order ?? 0) + 1}
        />
      )}
    </>
  );
}

// ── PlanViewCard ───────────────────────────────────────────────────────────────

function PlanViewCard({
  plan, onEdit, onToggle, onDelete, isToggling,
}: {
  plan: Plan;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
}) {
  const featOn = Object.entries(FEATURE_LABELS).filter(
    ([k]) => plan.features[k as keyof typeof FEATURE_LABELS]
  );

  return (
    <div className={`rounded-2xl border bg-white shadow-sm transition ${plan.is_active ? "border-slate-200" : "border-dashed border-slate-200 opacity-60"}`}>
      <div className="flex items-start gap-4 px-6 py-5">
        {/* Icône */}
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <CreditCard className="h-5 w-5 text-blue-600" />
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
            <span className="text-2xl font-extrabold text-blue-700">
              {plan.price_monthly === 0 ? "Sur devis" : `${plan.price_monthly} €`}
              {plan.price_monthly > 0 && <span className="ml-1 text-sm font-medium text-slate-400">/mois</span>}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {plan.is_active ? "Actif" : "Inactif"}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Max {plan.max_users?.toLocaleString("fr-FR") ?? "∞"} utilisateurs</span>
            <span>Max {plan.max_communes ?? "∞"} commune{(plan.max_communes ?? 0) > 1 ? "s" : ""}</span>
            <span>Support : {plan.features.support}</span>
          </div>

          {/* Features */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {featOn.map(([k, label]) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                <Check className="h-3 w-3 text-emerald-500" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onToggle}
            disabled={isToggling}
            title={plan.is_active ? "Désactiver" : "Activer"}
            className="transition hover:opacity-80 disabled:opacity-40"
          >
            {plan.is_active
              ? <ToggleRight className="h-6 w-6 text-emerald-500" />
              : <ToggleLeft  className="h-6 w-6 text-slate-300" />}
          </button>
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
      </div>
    </div>
  );
}

// ── PlanEditCard ───────────────────────────────────────────────────────────────

function PlanEditCard({
  draft, onChange, onSave, onCancel, isPending,
}: {
  draft: Plan;
  onChange: (p: Plan) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  function setField<K extends keyof Plan>(k: K, v: Plan[K]) {
    onChange({ ...draft, [k]: v });
  }
  function setFeature<K extends keyof PlanFeatures>(k: K, v: PlanFeatures[K]) {
    onChange({ ...draft, features: { ...draft.features, [k]: v } });
  }

  return (
    <div className="rounded-2xl border-2 border-blue-400 bg-white shadow-md">
      <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-slate-800">Modifier le plan</span>
        <div className="flex gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={onSave}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 px-6 py-5 md:grid-cols-3">
        {/* Nom */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</label>
          <input
            value={draft.name}
            onChange={e => setField("name", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Prix */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prix (€/mois)</label>
          <input
            type="number"
            min={0}
            value={draft.price_monthly}
            onChange={e => setField("price_monthly", Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Max users */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Max utilisateurs</label>
          <input
            type="number"
            min={0}
            value={draft.max_users ?? ""}
            placeholder="∞"
            onChange={e => setField("max_users", e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Max communes */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Max communes</label>
          <input
            type="number"
            min={0}
            value={draft.max_communes ?? ""}
            placeholder="∞"
            onChange={e => setField("max_communes", e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Ordre */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ordre d'affichage</label>
          <input
            type="number"
            min={0}
            value={draft.display_order}
            onChange={e => setField("display_order", Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Support */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Support</label>
          <select
            value={draft.features.support}
            onChange={e => setFeature("support", e.target.value as PlanFeatures["support"])}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {SUPPORT_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Features toggles */}
      <div className="border-t border-slate-100 px-6 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Fonctionnalités</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
          {(Object.entries(FEATURE_LABELS) as [keyof typeof FEATURE_LABELS, string][]).map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2">
              <button
                type="button"
                onClick={() => setFeature(k, !draft.features[k])}
                className="transition"
              >
                {draft.features[k]
                  ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                  : <ToggleLeft  className="h-5 w-5 text-slate-300" />}
              </button>
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AddPlanModal ───────────────────────────────────────────────────────────────

function AddPlanModal({
  onClose, onSuccess, nextOrder,
}: {
  onClose: () => void;
  onSuccess: () => void;
  nextOrder: number;
}) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    price_monthly: 0,
    max_users: "" as string,
    max_communes: "1" as string,
    display_order: nextOrder,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.from("plans").insert({
        id:             form.id.trim().toLowerCase().replace(/\s+/g, "_"),
        name:           form.name.trim(),
        price_monthly:  Number(form.price_monthly),
        max_users:      form.max_users ? Number(form.max_users) : null,
        max_communes:   form.max_communes ? Number(form.max_communes) : null,
        display_order:  form.display_order,
        features: {
          carte: true, publications: true,
          services_perso: false, voisins_vigilants: true,
          push_notifications: false, stats_avancees: false,
          white_label: false, api_acces: false, support: "email",
        },
      });
      if (err) throw err;
      toast.success("Plan créé");
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
          <h3 className="font-semibold text-slate-900">Nouveau plan</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Identifiant (slug)" required>
              <input
                required
                value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                placeholder="ex: entreprise"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
            <Field label="Nom affiché" required>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Entreprise"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
            <Field label="Prix €/mois">
              <input
                type="number" min={0}
                value={form.price_monthly}
                onChange={e => setForm(f => ({ ...f, price_monthly: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
            <Field label="Max utilisateurs">
              <input
                type="number" min={0}
                value={form.max_users}
                placeholder="∞"
                onChange={e => setForm(f => ({ ...f, max_users: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2"
              />
            </Field>
          </div>

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
