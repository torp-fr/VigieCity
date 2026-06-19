import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Newspaper, Plus, Pencil, Trash2, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/admin/publications")({
  component: PublicationsPage,
});

const CATEGORIES = [
  { value: "info", label: "Information", color: "bg-blue-100 text-blue-700" },
  { value: "evenement", label: "Événement", color: "bg-purple-100 text-purple-700" },
  { value: "travaux", label: "Travaux", color: "bg-orange-100 text-orange-700" },
  { value: "urgence", label: "Urgence", color: "bg-red-100 text-red-700" },
  { value: "autre", label: "Autre", color: "bg-gray-100 text-gray-700" },
];

type FormData = {
  title: string;
  content: string;
  category: string;
  is_published: boolean;
  expires_at: string;
};

const EMPTY_FORM: FormData = {
  title: "",
  content: "",
  category: "info",
  is_published: true,
  expires_at: "",
};

function PublicationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-publications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user!.id)
        .single();

      const { data } = await supabase
        .from("publications")
        .select("*")
        .eq("collectivity_id", profile!.collectivity_id!)
        .order("created_at", { ascending: false });

      return { pubs: data ?? [], collectivityId: profile!.collectivity_id! };
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormData) => {
      if (editId) {
        const { error } = await supabase.from("publications").update({
          title: f.title,
          content: f.content,
          category: f.category,
          is_published: f.is_published,
          expires_at: f.expires_at || null,
          published_at: f.is_published ? new Date().toISOString() : null,
        }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("publications").insert({
          title: f.title,
          content: f.content,
          category: f.category,
          is_published: f.is_published,
          expires_at: f.expires_at || null,
          published_at: f.is_published ? new Date().toISOString() : null,
          collectivity_id: data!.collectivityId,
          created_by: (await supabase.auth.getUser()).data.user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-publications"] });
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("publications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-publications"] });
      toast.success("Supprimé");
    },
    onError: () => toast.error("Erreur"),
  });

  function openEdit(pub: any) {
    setForm({
      title: pub.title,
      content: pub.content ?? "",
      category: pub.category ?? "info",
      is_published: pub.is_published,
      expires_at: pub.expires_at ? pub.expires_at.slice(0, 10) : "",
    });
    setEditId(pub.id);
    setShowForm(true);
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  const catColor = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.color ?? "bg-gray-100 text-gray-700";
  const catLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            Actualités & Publications
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

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{editId ? "Modifier la publication" : "Nouvelle publication"}</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Titre *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titre de la publication"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Contenu *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Contenu de la publication…"
                rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catégorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiration (optionnelle)</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Publier immédiatement</span>
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Annuler
            </button>
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.title || !form.content}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {save.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : data?.pubs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucune publication</div>
      ) : (
        <div className="space-y-3">
          {data?.pubs.map((pub) => (
            <div key={pub.id} className={`rounded-xl border p-4 ${pub.is_published ? "border-border bg-card" : "border-dashed border-border/50 bg-muted/30"}`}>
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
                  <h3 className="mt-1 font-semibold text-foreground">{pub.title}</h3>
                  <p className="mt-0.5 text-sm text-foreground/70 line-clamp-2">{pub.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePublish.mutate({ id: pub.id, val: !pub.is_published })}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    title={pub.is_published ? "Dépublier" : "Publier"}
                  >
                    {pub.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(pub)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm("Supprimer cette publication ?")) remove.mutate(pub.id); }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
