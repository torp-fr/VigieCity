import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  ChevronLeft,
  Eye,
  EyeOff,
  X,
  Loader2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/evenements")({
  component: AdminEvenementsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type Event = {
  id: string;
  collectivity_id: string;
  title: string;
  description: string | null;
  category: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  image_url: string | null;
  max_capacity: number | null;
  is_published: boolean;
  created_at: string;
};

type EventForm = Omit<Event, "id" | "collectivity_id" | "created_at" | "image_url"> & {
  image_url: string;
  max_capacity: string; // champ texte dans le form
};

const EMPTY_FORM: EventForm = {
  title: "",
  description: "",
  category: "general",
  start_at: "",
  end_at: "",
  location: "",
  image_url: "",
  max_capacity: "",
  is_published: false,
};

// ── Méta catégories ───────────────────────────────────────────────────────────
const CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "general",   label: "Général",          emoji: "🎉" },
  { value: "sport",     label: "Sport & loisirs",   emoji: "⚽" },
  { value: "culture",   label: "Culture",           emoji: "🎭" },
  { value: "education", label: "Éducation",         emoji: "📚" },
  { value: "reunion",   label: "Réunion publique",  emoji: "🤝" },
  { value: "travaux",   label: "Travaux",           emoji: "🔧" },
  { value: "sante",     label: "Santé",             emoji: "🏥" },
  { value: "autre",     label: "Autre",             emoji: "📍" },
];

function catLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) ?? { label: cat, emoji: "📍" };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Composant ─────────────────────────────────────────────────────────────────
function AdminEvenementsPage() {
  const qc = useQueryClient();
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Récupérer la commune de l'admin
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", data.user.id)
        .single();
      setCollectivityId(profile?.collectivity_id ?? null);
    });
  }, []);

  // Liste des événements
  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("collectivity_id", collectivityId!)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });

  // Comptage inscriptions par événement
  const { data: regCounts = {} } = useQuery({
    queryKey: ["admin-event-reg-counts", collectivityId],
    enabled: !!collectivityId && !!events?.length,
    staleTime: 60_000,
    queryFn: async () => {
      if (!events?.length) return {};
      const ids = events.map((e) => e.id);
      const { data } = await supabase
        .from("event_registration_counts")
        .select("event_id, registration_count")
        .in("event_id", ids);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { event_id: string; registration_count: number }) => {
        map[r.event_id] = r.registration_count;
      });
      return map;
    },
  });

  // ── Helpers formulaire ─────────────────────────────────────────────────────
  function toLocalDatetime(iso: string | null | undefined) {
    if (!iso) return "";
    // Format pour <input type="datetime-local"> : YYYY-MM-DDTHH:MM
    return iso.slice(0, 16);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(evt: Event) {
    setEditing(evt);
    setForm({
      title:        evt.title,
      description:  evt.description ?? "",
      category:     evt.category,
      start_at:     toLocalDatetime(evt.start_at),
      end_at:       toLocalDatetime(evt.end_at),
      location:     evt.location ?? "",
      image_url:    evt.image_url ?? "",
      max_capacity: evt.max_capacity != null ? String(evt.max_capacity) : "",
      is_published: evt.is_published,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  // ── Sauvegarde ─────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!collectivityId) return;
    setSaving(true);
    try {
      const payload = {
        collectivity_id: collectivityId,
        title:           form.title.trim(),
        description:     form.description?.trim() || null,
        category:        form.category,
        start_at:        form.start_at ? new Date(form.start_at).toISOString() : null,
        end_at:          form.end_at   ? new Date(form.end_at).toISOString()   : null,
        location:        form.location?.trim() || null,
        image_url:       form.image_url?.trim() || null,
        max_capacity:    form.max_capacity ? parseInt(form.max_capacity, 10) : null,
        is_published:    form.is_published,
      };

      if (editing) {
        const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Événement mis à jour");
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
        toast.success("Événement créé");
      }

      await qc.invalidateQueries({ queryKey: ["admin-events", collectivityId] });
      await qc.invalidateQueries({ queryKey: ["admin-event-reg-counts", collectivityId] });
      closeDialog();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inattendue";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle publié ──────────────────────────────────────────────────────────
  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("events")
        .update({ is_published: !is_published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-events", collectivityId] }),
    onError: () => toast.error("Impossible de changer le statut"),
  });

  // ── Suppression ────────────────────────────────────────────────────────────
  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-events", collectivityId] });
      toast.success("Événement supprimé");
      setDeleteId(null);
    },
    onError: () => toast.error("Impossible de supprimer l'événement"),
  });

  // Séparer à venir / passés
  const now = new Date();
  const upcoming = events?.filter((e) => new Date(e.start_at) >= now) ?? [];
  const past     = events?.filter((e) => new Date(e.start_at) <  now) ?? [];

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <AdminShell activePath="/admin/evenements">
      <div className="mx-auto max-w-7xl px-8 py-8 flex flex-col gap-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
            <p className="mt-1 text-sm text-slate-500">Événements communaux</p>
          </div>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Créer
          </Button>
        </div>

        {/* Chargement */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        )}

        {/* À venir */}
        {!isLoading && upcoming.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              À venir ({upcoming.length})
            </h2>
            <EventList
              events={upcoming}
              regCounts={regCounts}
              onEdit={openEdit}
              onToggle={(e) => togglePublished.mutate(e)}
              onDelete={(id) => setDeleteId(id)}
            />
          </section>
        )}

        {/* Passés */}
        {!isLoading && past.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Passés ({past.length})
            </h2>
            <EventList
              events={past}
              past
              regCounts={regCounts}
              onEdit={openEdit}
              onToggle={(e) => togglePublished.mutate(e)}
              onDelete={(id) => setDeleteId(id)}
            />
          </section>
        )}

        {/* Aucun événement */}
        {!isLoading && !events?.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun événement pour le moment.</p>
            <Button onClick={openCreate} className="mt-4 gap-1.5" size="sm">
              <Plus className="h-4 w-4" />
              Créer le premier événement
            </Button>
          </div>
        )}
      </div>

      {/* ── Dialogue Créer / Éditer ───────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={closeDialog} />
          <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-background px-4 pb-8 pt-4">
            {/* Handle */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{editing ? "Modifier l'événement" : "Nouvel événement"}</h2>
              <button onClick={closeDialog} className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Titre */}
              <div className="space-y-1.5">
                <Label htmlFor="ev-title">Titre *</Label>
                <Input
                  id="ev-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Fête du village, Concert de Noël…"
                  required
                  disabled={saving}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="ev-desc">Description</Label>
                <Textarea
                  id="ev-desc"
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Détails de l'événement…"
                  rows={3}
                  disabled={saving}
                />
              </div>

              {/* Catégorie */}
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ev-start">Début *</Label>
                  <Input
                    id="ev-start"
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-end">Fin</Label>
                  <Input
                    id="ev-end"
                    type="datetime-local"
                    value={form.end_at ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Lieu + Capacité */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="ev-location">Lieu</Label>
                  <Input
                    id="ev-location"
                    value={form.location ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Salle des fêtes…"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="ev-capacity">Places max</Label>
                  <Input
                    id="ev-capacity"
                    type="number"
                    min="1"
                    value={form.max_capacity}
                    onChange={(e) => setForm((f) => ({ ...f, max_capacity: e.target.value }))}
                    placeholder="Illimité"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <Label htmlFor="ev-img">URL de l'image (optionnel)</Label>
                <Input
                  id="ev-img"
                  type="url"
                  value={form.image_url ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://…"
                  disabled={saving}
                />
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Aperçu"
                    className="mt-1 h-24 w-full rounded-lg object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
              </div>

              {/* Publié */}
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <Label htmlFor="ev-published" className="cursor-pointer">
                  Publier immédiatement
                </Label>
                <Switch
                  id="ev-published"
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
                  disabled={saving}
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : editing ? "Mettre à jour" : "Créer l'événement"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── Dialogue Confirmation Suppression ────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl">
            <h3 className="font-semibold">Supprimer cet événement ?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Cette action est irréversible.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteEvent.isPending}
                onClick={() => deleteEvent.mutate(deleteId)}
              >
                {deleteEvent.isPending ? "Suppression…" : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
    </AdminShell>
  );
}

// ── Sous-composant liste ───────────────────────────────────────────────────────
function EventList({
  events,
  past = false,
  regCounts = {},
  onEdit,
  onToggle,
  onDelete,
}: {
  events: Event[];
  past?: boolean;
  regCounts?: Record<string, number>;
  onEdit: (e: Event) => void;
  onToggle: (e: { id: string; is_published: boolean }) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {events.map((evt) => {
        const cat = catLabel(evt.category);
        return (
          <li
            key={evt.id}
            className={`flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm ${
              past ? "opacity-60" : ""
            }`}
          >
            {/* Date badge */}
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="text-lg font-bold leading-none">
                {new Date(evt.start_at).getDate()}
              </span>
              <span className="text-[10px] uppercase">
                {new Date(evt.start_at).toLocaleDateString("fr-FR", { month: "short" })}
              </span>
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <p className="font-semibold leading-snug line-clamp-1">{evt.title}</p>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    evt.is_published
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {evt.is_published ? "Publié" : "Brouillon"}
                </span>
              </div>

              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(evt.start_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {evt.end_at && (
                    <> — {new Date(evt.end_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </span>
                {evt.location && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">{evt.location}</span>
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{cat.emoji} {cat.label}</span>
                {(regCounts[evt.id] !== undefined || evt.max_capacity) && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    evt.max_capacity && (regCounts[evt.id] ?? 0) >= evt.max_capacity
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-50 text-blue-700"
                  }`}>
                    <Users className="h-2.5 w-2.5" />
                    {regCounts[evt.id] ?? 0}
                    {evt.max_capacity ? ` / ${evt.max_capacity}` : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-col items-center justify-between gap-1">
              <button
                onClick={() => onToggle({ id: evt.id, is_published: evt.is_published })}
                aria-label={evt.is_published ? "Dépublier" : "Publier"}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
              >
                {evt.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => onEdit(evt)}
                aria-label="Modifier"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(evt.id)}
                aria-label="Supprimer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
