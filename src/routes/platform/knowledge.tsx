import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  BookOpen, Plus, Pencil, Trash2, X, Save, Eye, EyeOff,
  Tag, Search, AlertTriangle,
} from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/platform/knowledge")({
  component: KnowledgePlatform,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type Article = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_published: boolean;
  tags: string[];
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

type FormData = {
  title: string;
  content: string;
  category: string;
  is_published: boolean;
  tags: string; // comma-separated
};

const BLANK: FormData = {
  title:        "",
  content:      "",
  category:     "general",
  is_published: false,
  tags:         "",
};

const CATEGORIES = [
  { value: "general",    label: "Général",          icon: "📚" },
  { value: "securite",   label: "Sécurité",          icon: "🛡️" },
  { value: "urgences",   label: "Urgences",          icon: "🚨" },
  { value: "services",   label: "Services publics",  icon: "🏛️" },
  { value: "technique",  label: "Technique",         icon: "🔧" },
  { value: "faq",        label: "FAQ",               icon: "❓" },
];

function catMeta(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) ?? { label: cat, icon: "📄" };
}

// ─── Composant ────────────────────────────────────────────────────────────────
function KnowledgePlatform() {
  const qc = useQueryClient();

  const [showForm,     setShowForm]     = useState(false);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [form,         setForm]         = useState<FormData>(BLANK);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [search,       setSearch]       = useState("");
  const [filterCat,    setFilterCat]    = useState("all");

  // ── Fetch articles ────────────────────────────────────────────────────────
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["knowledge-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  // ── Filtrage client ───────────────────────────────────────────────────────
  const filtered = articles.filter((a) => {
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || a.category === filterCat;
    return matchSearch && matchCat;
  });

  // ── Mutation : save ───────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (f: FormData) => {
      const tagsArr = f.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title:        f.title.trim(),
        content:      f.content.trim(),
        category:     f.category,
        is_published: f.is_published,
        tags:         tagsArr,
      };

      if (editId) {
        const { error } = await supabase
          .from("knowledge_base")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("knowledge_base")
          .insert({ ...payload, author_id: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast.success(editId ? "Article modifié" : "Article créé");
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Mutation : toggle published ───────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase
        .from("knowledge_base")
        .update({ is_published: val, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { val }) => {
      qc.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast.success(val ? "Article publié" : "Article dépublié");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Mutation : delete ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_base")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast.success("Article supprimé");
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

  const openEdit = (a: Article) => {
    setEditId(a.id);
    setForm({
      title:        a.title,
      content:      a.content,
      category:     a.category,
      is_published: a.is_published,
      tags:         (a.tags ?? []).join(", "),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(BLANK);
  };

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Titre et contenu requis");
      return;
    }
    saveMutation.mutate(form);
  };

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 px-4 py-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Base de connaissances</h1>
            <p className="text-xs text-muted-foreground">
              {articles.length} article{articles.length !== 1 ? "s" : ""} ·{" "}
              {articles.filter((a) => a.is_published).length} publié
              {articles.filter((a) => a.is_published).length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Nouvel article
        </button>
      </div>

      {/* Barre de recherche + filtre catégorie */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="all">Toutes les catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {search || filterCat !== "all" ? "Aucun résultat" : "Aucun article"}
          </p>
          {!search && filterCat === "all" && (
            <button
              onClick={openNew}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Créer le premier article
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => {
            const meta = catMeta(a.category);
            return (
              <li
                key={a.id}
                className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-2xl">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold truncate">{a.title}</span>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          a.is_published
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {a.is_published ? "Publié" : "Brouillon"}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {a.content.slice(0, 120)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {meta.label}
                      </span>
                      {(a.tags ?? []).slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {t}
                        </span>
                      ))}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(a.updated_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <ActionMenu actions={[
                    { label: a.is_published ? "Dépublier" : "Publier", icon: a.is_published ? EyeOff : Eye, onClick: () => toggleMutation.mutate({ id: a.id, val: !a.is_published }) },
                    { label: "Modifier", icon: Pencil, onClick: () => openEdit(a) },
                    { label: "Supprimer", icon: Trash2, onClick: () => setDeleteTarget(a), variant: "danger" },
                  ]} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Formulaire ───────────────────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-xl rounded-t-3xl bg-card px-6 pt-5 pb-10 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editId ? "Modifier l'article" : "Nouvel article"}
              </h2>
              <button
                onClick={closeForm}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Titre */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Titre *
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Titre de l'article"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={120}
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

              {/* Contenu (Markdown) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Contenu (Markdown) *
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={10}
                  placeholder="# Titre&#10;&#10;Contenu en Markdown…"
                  value={form.content}
                  onChange={(e) => set("content", e.target.value)}
                  required
                />
              </div>

              {/* Tags */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tags (séparés par des virgules)
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="alerte, voisinage, sécurité"
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                />
              </div>

              {/* Publier */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.is_published}
                    onChange={(e) => set("is_published", e.target.checked)}
                  />
                  <div
                    className={[
                      "h-6 w-11 rounded-full transition-colors",
                      form.is_published ? "bg-primary" : "bg-muted-foreground/30",
                    ].join(" ")}
                  />
                  <div
                    className={[
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      form.is_published ? "translate-x-5" : "translate-x-0.5",
                    ].join(" ")}
                  />
                </div>
                <span className="text-sm font-medium">Publier immédiatement</span>
              </label>

              {/* Boutons */}
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
                <h2 className="font-bold">Supprimer cet article ?</h2>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {deleteTarget.title}
                </p>
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
  );
}
