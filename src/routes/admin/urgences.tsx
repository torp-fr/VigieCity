import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  Phone, Plus, Pencil, Trash2, X, Save, AlertTriangle,
  Clock, Tag, Star,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/urgences")({
  component: UrgencesAdmin,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type Contact = {
  id: string;
  label: string;
  phone: string;
  category: string;
  hours: string | null;
  priority: number;
  description: string | null;
  collectivity_id: string;
};

type FormData = {
  label: string;
  phone: string;
  category: string;
  hours: string;
  priority: number;
  description: string;
};

const BLANK: FormData = {
  label:       "",
  phone:       "",
  category:    "securite",
  hours:       "",
  priority:    5,
  description: "",
};

const CATEGORIES = [
  { value: "securite",   label: "Sécurité",   icon: "🛡️" },
  { value: "medical",    label: "Médical",     icon: "🏥" },
  { value: "incendie",   label: "Incendie",    icon: "🔥" },
  { value: "mairie",     label: "Mairie",      icon: "🏛️" },
  { value: "technique",  label: "Technique",   icon: "🔧" },
  { value: "social",     label: "Social",      icon: "🤝" },
  { value: "autre",      label: "Autre",       icon: "📞" },
];

function catIcon(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.icon ?? "📞";
}
function catLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

// ─── Composant ────────────────────────────────────────────────────────────────
function UrgencesAdmin() {
  const qc = useQueryClient();

  const [showForm,     setShowForm]     = useState(false);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [form,         setForm]         = useState<FormData>(BLANK);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  // ── Fetch collectivityId du user connecté ────────────────────────────────
  const { data: meta } = useQuery({
    queryKey: ["admin-meta-urgences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user.id)
        .single();
      return { collectivityId: profile?.collectivity_id as string };
    },
  });

  const collectivityId = meta?.collectivityId ?? null;

  // ── Liste des contacts locaux ─────────────────────────────────────────────
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["emergency-contacts", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("collectivity_id", collectivityId!)
        .eq("is_national", false)
        .order("priority")
        .order("label");
      if (error) throw error;
      return data as Contact[];
    },
  });

  // ── Mutation : créer / modifier ───────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (f: FormData) => {
      const payload = {
        label:            f.label.trim(),
        phone:            f.phone.trim(),
        category:         f.category,
        hours:            f.hours.trim() || null,
        priority:         Number(f.priority),
        description:      f.description.trim() || null,
        collectivity_id:  collectivityId!,
        is_national:      false,
      };

      if (editId) {
        const { error } = await supabase
          .from("emergency_contacts")
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("emergency_contacts")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emergency-contacts", collectivityId] });
      toast.success(editId ? "Contact modifié" : "Contact ajouté");
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Mutation : supprimer ───────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("emergency_contacts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emergency-contacts", collectivityId] });
      toast.success("Contact supprimé");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditId(null);
    setForm(BLANK);
    setShowForm(true);
  };

  const openEdit = (c: Contact) => {
    setEditId(c.id);
    setForm({
      label:       c.label,
      phone:       c.phone,
      category:    c.category,
      hours:       c.hours ?? "",
      priority:    c.priority,
      description: c.description ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(BLANK);
  };

  const set = (k: keyof FormData, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.phone.trim()) {
      toast.error("Libellé et téléphone requis");
      return;
    }
    saveMutation.mutate(form);
  };

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <AdminShell activePath="/admin/urgences">
    <div className="space-y-6 px-4 py-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sos/10">
            <Phone className="h-5 w-5 text-sos" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Contacts d'urgence</h1>
            <p className="text-xs text-muted-foreground">
              Numéros locaux affichés aux citoyens
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* Note : numéros nationaux */}
      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Note :</span> les numéros
        nationaux (112, 15, 17, 18, etc.) sont gérés par VigieCity et ne peuvent
        pas être modifiés ici.
      </div>

      {/* Liste */}
      {isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </ul>
      ) : contacts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Phone className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Aucun contact local</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajoutez des numéros utiles pour votre commune.
          </p>
          <button
            onClick={openNew}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Ajouter un contact
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              {/* Icône */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
                {catIcon(c.category)}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold truncate">{c.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {catLabel(c.category)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Star className="h-3 w-3" />
                    Priorité {c.priority}
                  </span>
                </div>
                <a
                  href={`tel:${c.phone}`}
                  className="mt-0.5 text-sm font-mono text-primary"
                >
                  {c.phone}
                </a>
                {c.hours && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {c.hours}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => openEdit(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground"
                  aria-label="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-sos/10 text-sos"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Formulaire (modal bottom sheet) ──────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-card px-6 pt-5 pb-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Titre */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editId ? "Modifier le contact" : "Nouveau contact"}
              </h2>
              <button
                onClick={closeForm}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Libellé */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Libellé *
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ex. Mairie de Valbonne"
                  value={form.label}
                  onChange={(e) => set("label", e.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Numéro de téléphone *
                </label>
                <input
                  type="tel"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="04 93 12 00 00"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  maxLength={30}
                  required
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Catégorie
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => set("category", cat.value)}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-semibold",
                        form.category === cat.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horaires + Priorité */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Horaires
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Lun–Ven 8h–18h"
                    value={form.hours}
                    onChange={(e) => set("hours", e.target.value)}
                    maxLength={60}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Priorité (1–10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.priority}
                    onChange={(e) => set("priority", Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Description (optionnel)
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                  placeholder="Informations complémentaires…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  maxLength={200}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmation suppression ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-card px-6 pt-5 pb-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sos/10">
                <AlertTriangle className="h-5 w-5 text-sos" />
              </div>
              <div>
                <h2 className="font-bold">Supprimer ce contact ?</h2>
                <p className="text-sm text-muted-foreground">{deleteTarget.label}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-sos py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminShell>
  );
}
