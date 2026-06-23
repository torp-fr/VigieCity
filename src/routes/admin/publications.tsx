import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";
import {
  Newspaper, Plus, Pencil, Trash2, Eye, EyeOff, X, ImagePlus, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/publications")({
  component: PublicationsPage,
});

const CATEGORIES = [
  { value: "info",      label: "Information", color: "bg-blue-100 text-blue-700"   },
  { value: "evenement", label: "Événement",   color: "bg-purple-100 text-purple-700" },
  { value: "travaux",   label: "Travaux",     color: "bg-orange-100 text-orange-700" },
  { value: "urgence",   label: "Urgence",     color: "bg-red-100 text-red-700"     },
  { value: "autre",     label: "Autre",       color: "bg-gray-100 text-gray-700"   },
];

// Type local étendu pour inclure les colonnes image ajoutées par la migration Session 4
type Pub = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  image_url?: string | null;
  image_path?: string | null;
};

type FormData = {
  title: string;
  content: string;
  category: string;
  is_published: boolean;
  expires_at: string;
  image_url: string;
  image_path: string;
};

const EMPTY_FORM: FormData = {
  title: "", content: "", category: "info",
  is_published: true, expires_at: "", image_url: "", image_path: "",
};

function PublicationsPage() {
  const qc                        = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<FormData>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState<string | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["admin-publications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { data: profile } = await supabase
        .from("profiles").select("collectivity_id").eq("id", user.id).single();
      const cid = profile?.collectivity_id;
      if (!cid) throw new Error("Collectivité non configurée");
      const { data } = await supabase
        .from("publications").select("*")
        .eq("collectivity_id", cid)
        .order("created_at", { ascending: false });
      return { pubs: (data ?? []) as Pub[], collectivityId: cid };
    },
  });

  // ── Upload image ──────────────────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (max 5 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `${data?.collectivityId ?? "tmp"}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("publications-media")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("publications-media").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: urlData.publicUrl, image_path: path }));
      setPreview(urlData.publicUrl);
      toast.success("Image uploadée");
    } catch (err: any) {
      toast.error("Erreur upload : " + (err.message ?? "inconnue"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage() {
    setForm((f) => ({ ...f, image_url: "", image_path: "" }));
    setPreview(null);
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: async (f: FormData) => {
      const payload = {
        title: f.title, content: f.content, category: f.category,
        is_published: f.is_published,
        expires_at: f.expires_at || null,
        published_at: f.is_published ? new Date().toISOString() : null,
        image_url: f.image_url || null,
        image_path: f.image_path || null,
      };
      if (editId) {
        const { error } = await supabase.from("publications").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const uid = (await supabase.auth.getUser()).data.user?.id;
        if (!uid) throw new Error("Non authentifié");
        const { error } = await supabase.from("publications").insert({
          ...payload, collectivity_id: data!.collectivityId, created_by: uid,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-publications"] });
      setShowForm(false); setEditId(null); setForm(EMPTY_FORM); setPreview(null);
      toast.success(editId ? "Publication modifiée" : "Publication créée");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("publications")
        .update({ is_published: val, published_at: val ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-publications"] }),
    onError: () => toast.error("Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (pub: Pub) => {
      if (pub.image_path) {
        await supabase.storage.from("publications-media").remove([pub.image_path]);
      }
      const { error } = await supabase.from("publications").delete().eq("id", pub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-publications"] });
      toast.success("Publication supprimée");
    },
    onError: () => toast.error("Erreur"),
  });

  // ── Helpers form ──────────────────────────────────────────────────────────
  function openEdit(pub: Pub) {
    setForm({
      title: pub.title, content: pub.content ?? "",
      category: pub.category ?? "info", is_published: pub.is_published,
      expires_at: pub.expires_at ? pub.expires_at.slice(0, 10) : "",
      image_url: pub.image_url ?? "", image_path: pub.image_path ?? "",
    });
    setPreview(pub.image_url ?? null);
    setEditId(pub.id); setShowForm(true);
  }

  function openNew() {
    setForm(EMPTY_FORM); setPreview(null); setEditId(null); setShowForm(true);
  }

  const catColor = (c: string) =>
    CATEGORIES.find((x) => x.value === c)?.color ?? "bg-gray-100 text-gray-700";
  const catLabel = (c: string) =>
    CATEGORIES.find((x) => x.value === c)?.label ?? c;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminShell activePath="/admin/publications">
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            Actualités &amp; Publications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publiez des informations, événements et travaux pour vos citoyens
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nouvelle publication
        </button>
      </div>

      {/* ── Formulaire de création / édition ────────────────────────────── */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {editId ? "Modifier la publication" : "Nouvelle publication"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setPreview(null); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Catégorie (pills cliquables) */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                  form.category === c.value
                    ? c.color + " border-transparent ring-2 ring-offset-1 ring-current"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Titre */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Titre *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Titre de la publication"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Contenu */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Contenu / légende *
            </label>
            <textarea
              value={form.content}
              rows={4}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Contenu de la publication…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Zone d'upload image */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5" /> Photo / image (optionnelle)
            </label>

            {preview ? (
              /* Prévisualisation de l'image uploadée */
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={preview}
                  alt="Aperçu"
                  className="w-full object-cover rounded-xl"
                  style={{ aspectRatio: "16/9", maxHeight: "240px" }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Zone de drop / clic */
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-8 cursor-pointer hover:bg-muted/40 transition-colors">
                {uploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload en cours…</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Glisser ici ou cliquer</span>
                    <span className="text-xs text-muted-foreground/70">
                      JPEG, PNG, WebP, GIF — max 5 Mo
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="sr-only"
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Expiration + checkbox publier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Expiration (optionnelle)
              </label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Publier immédiatement</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setEditId(null); setPreview(null); }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Enregistrer en brouillon
            </button>
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.title || !form.content || uploading}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {save.isPending ? "Enregistrement…" : "Publier →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Liste des publications ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : data?.pubs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucune publication</div>
      ) : (
        <div className="space-y-3">
          {data?.pubs.map((pub) => (
            <div
              key={pub.id}
              className={`rounded-xl border overflow-hidden ${
                pub.is_published
                  ? "border-border bg-card"
                  : "border-dashed border-border/50 bg-muted/30"
              }`}
            >
              {/* Image 16:9 */}
              {pub.image_url && (
                <img
                  src={pub.image_url}
                  alt={pub.title}
                  className="w-full object-cover"
                  style={{ aspectRatio: "16/9", maxHeight: "220px" }}
                  loading="lazy"
                />
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor(pub.category ?? "info")}`}>
                        {catLabel(pub.category ?? "info")}
                      </span>
                      {!pub.is_published && (
                        <span className="text-xs text-muted-foreground italic">Brouillon</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(pub.created_at), { locale: fr, addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="mt-1 font-semibold">{pub.title}</h3>
                    <p className="mt-0.5 text-sm text-foreground/70 line-clamp-2">{pub.content}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePublish.mutate({ id: pub.id, val: !pub.is_published })}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                      title={pub.is_published ? "Dépublier" : "Publier"}
                    >
                      {pub.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(pub)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer cette publication ?")) remove.mutate(pub);
                      }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                  