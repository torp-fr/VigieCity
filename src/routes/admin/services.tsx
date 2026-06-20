import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, MapPin, Phone, Globe, Mail, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/services")({
  component: AdminServicesPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type ServicePlace = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: Record<string, string> | null;
  image_url: string | null;
  is_published: boolean;
  collectivity_id: string;
};

type ServiceForm = Omit<ServicePlace, "id" | "collectivity_id">;

const EMPTY_FORM: ServiceForm = {
  name: "",
  category: "autre",
  address: null,
  lat: null,
  lng: null,
  phone: null,
  email: null,
  website: null,
  hours: null,
  image_url: null,
  is_published: false,
};

const CATEGORIES = [
  { value: "mairie",    label: "Mairie",          emoji: "🏛️" },
  { value: "sante",     label: "Santé",           emoji: "🏥" },
  { value: "education", label: "Éducation",       emoji: "🏫" },
  { value: "transport", label: "Transport",       emoji: "🚌" },
  { value: "sport",     label: "Sport",           emoji: "⚽" },
  { value: "culture",   label: "Culture",         emoji: "🎭" },
  { value: "commerce",  label: "Commerce",        emoji: "🛒" },
  { value: "urgence",   label: "Urgence",         emoji: "🚨" },
  { value: "autre",     label: "Autre",           emoji: "📍" },
] as const;

const DAYS = [
  { key: "lun", label: "Lundi" },
  { key: "mar", label: "Mardi" },
  { key: "mer", label: "Mercredi" },
  { key: "jeu", label: "Jeudi" },
  { key: "ven", label: "Vendredi" },
  { key: "sam", label: "Samedi" },
  { key: "dim", label: "Dimanche" },
] as const;

function catMeta(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ── Page ──────────────────────────────────────────────────────────────────────
function AdminServicesPage() {
  const qc = useQueryClient();
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [ready, setReady]                    = useState(false);
  const [dialogOpen, setDialogOpen]          = useState(false);
  const [editing, setEditing]                = useState<ServicePlace | null>(null);
  const [form, setForm]                      = useState<ServiceForm>(EMPTY_FORM);
  const [saving, setSaving]                  = useState(false);
  const [deleteId, setDeleteId]              = useState<string | null>(null);
  const [hoursText, setHoursText]            = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", data.user.id)
        .single();
      setCollectivityId(profile?.collectivity_id ?? null);
      setReady(true);
    });
  }, []);

  // ── Requête ────────────────────────────────────────────────────────────────
  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-services", collectivityId],
    enabled: ready && !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_places")
        .select("*")
        .eq("collectivity_id", collectivityId!)
        .order("category")
        .order("name");
      if (error) throw error;
      return data as ServicePlace[];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const togglePublished = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase
        .from("service_places")
        .update({ is_published: val })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-services", collectivityId] }),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_places").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["admin-services", collectivityId] });
    },
  });

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setHoursText({});
    setDialogOpen(true);
  }

  function openEdit(s: ServicePlace) {
    setEditing(s);
    setForm({
      name:        s.name,
      category:    s.category,
      address:     s.address,
      lat:         s.lat,
      lng:         s.lng,
      phone:       s.phone,
      email:       s.email,
      website:     s.website,
      hours:       s.hours,
      image_url:   s.image_url,
      is_published: s.is_published,
    });
    setHoursText(s.hours ?? {});
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  function setField<K extends keyof ServiceForm>(key: K, val: ServiceForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.name.trim() || !collectivityId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        name:    form.name.trim(),
        address: form.address?.trim() || null,
        phone:   form.phone?.trim()   || null,
        email:   form.email?.trim()   || null,
        website: form.website?.trim() || null,
        hours:   Object.keys(hoursText).length > 0 ? hoursText : null,
        lat:     form.lat  ? Number(form.lat)  : null,
        lng:     form.lng  ? Number(form.lng)  : null,
        collectivity_id: collectivityId,
      };
      if (editing) {
        const { error } = await supabase.from("service_places").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_places").insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["admin-services", collectivityId] });
      closeDialog();
    } finally {
      setSaving(false);
    }
  }

  // Grouper par catégorie
  const grouped: Record<string, ServicePlace[]> = {};
  for (const s of services ?? []) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  return (
    <AdminShell activePath="/admin/services">
    <div className="flex flex-col gap-0 pb-10">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold">Services locaux</h1>
          <p className="text-xs text-muted-foreground">
            {services?.length ?? 0} lieu{(services?.length ?? 0) !== 1 ? "x" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {/* ── Liste ── */}
      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : !services?.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucun lieu configuré.</p>
            <button onClick={openNew} className="mt-3 text-sm font-semibold text-primary underline underline-offset-4">
              Ajouter le premier lieu
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {CATEGORIES.filter((c) => grouped[c.value]?.length).map(({ value, label, emoji }) => (
              <section key={value}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {emoji} {label} ({grouped[value].length})
                </h2>
                <ul className="flex flex-col gap-2">
                  {grouped[value].map((s) => (
                    <li key={s.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{s.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                s.is_published
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {s.is_published ? "Publié" : "Brouillon"}
                            </span>
                          </div>
                          {s.address && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{s.address}</span>
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-2">
                            {s.phone && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />{s.phone}
                              </span>
                            )}
                            {s.website && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Globe className="h-3 w-3" />Site web
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => togglePublished.mutate({ id: s.id, val: !s.is_published })}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title={s.is_published ? "Dépublier" : "Publier"}
                          >
                            {s.is_published
                              ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                              : <ToggleLeft className="h-5 w-5" />}
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(s.id)}
                            className="rounded-lg p-1.5 text-sos/70 transition-colors hover:bg-sos/10 hover:text-sos"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ── Confirmation suppression ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
            <p className="font-semibold">Supprimer ce lieu ?</p>
            <p className="mt-1 text-sm text-muted-foreground">Cette action est irréversible.</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-border py-2 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteService.mutate(deleteId)}
                className="flex-1 rounded-xl bg-sos py-2 text-sm font-semibold text-white"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog form ── */}
      {dialogOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={closeDialog} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-card shadow-xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            <div className="px-4 pb-8">
              {/* Titre dialog */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {editing ? "Modifier le lieu" : "Nouveau lieu"}
                </h2>
                <button
                  onClick={closeDialog}
                  className="rounded-full p-2 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Nom */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Nom *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Mairie de Sarlat"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Catégorie */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Catégorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Adresse */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Adresse</label>
                  <input
                    type="text"
                    value={form.address ?? ""}
                    onChange={(e) => setField("address", e.target.value || null)}
                    placeholder="1 place de la Liberté, 24200 Sarlat"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Coordonnées GPS */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.lat ?? ""}
                      onChange={(e) => setField("lat", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="44.8908"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.lng ?? ""}
                      onChange={(e) => setField("lng", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="1.2177"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone ?? ""}
                    onChange={(e) => setField("phone", e.target.value || null)}
                    placeholder="05 53 31 45 45"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => setField("email", e.target.value || null)}
                    placeholder="contact@mairie-sarlat.fr"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Site web */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Site web</label>
                  <input
                    type="url"
                    value={form.website ?? ""}
                    onChange={(e) => setField("website", e.target.value || null)}
                    placeholder="https://www.sarlat-la-caneda.fr"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Horaires */}
                <div>
                  <label className="mb-2 flex items-center gap-1 text-sm font-medium">
                    <Clock className="h-4 w-4" /> Horaires (optionnel)
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {DAYS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
                        <input
                          type="text"
                          value={hoursText[key] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHoursText((h) => {
                              const next = { ...h };
                              if (val) next[key] = val;
                              else delete next[key];
                              return next;
                            });
                          }}
                          placeholder="8h30-12h / 14h-18h"
                          className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Image (URL)</label>
                  <input
                    type="url"
                    value={form.image_url ?? ""}
                    onChange={(e) => setField("image_url", e.target.value || null)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  {form.image_url && (
                    <img
                      src={form.image_url}
                      alt="preview"
                      className="mt-2 w-full rounded-xl object-cover"
                      style={{ aspectRatio: "16/9", maxHeight: "180px" }}
                    />
                  )}
                </div>

                {/* Publié */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Publier</p>
                    <p className="text-xs text-muted-foreground">Visible par les citoyens</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setField("is_published", !form.is_published)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      form.is_published ? "bg-primary" : "bg-input"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                        form.is_published ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Boutons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={closeDialog}
                    className="flex-1 rounded-xl border border-border py-3 text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.name.trim()}
                    className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Créer"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </AdminShell>
  );
}
