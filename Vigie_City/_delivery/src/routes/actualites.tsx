import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Newspaper, ExternalLink, RefreshCw, Globe, Shield,
  Calendar, Tag, AlertCircle, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/hooks/useAppAuth";

export const Route = createFileRoute("/actualites")({
  head: () => ({
    meta: [
      { title: "Actualités — VigieCity" },
      { name: "description", content: "L'actualité locale et nationale de votre commune." },
    ],
  }),
  component: ActualitesPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Article = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  image_url: string | null;
  author: string | null;
  category: string;
  published_at: string | null;
  fetched_at: string;
  rss_sources: { name: string } | null;
};

// ── Catégories ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",          label: "Tout",          icon: Newspaper },
  { id: "general",      label: "Général",       icon: Globe },
  { id: "local",        label: "Local",         icon: Calendar },
  { id: "securite",     label: "Sécurité",      icon: Shield },
  { id: "evenements",   label: "Événements",    icon: Calendar },
  { id: "services",     label: "Services",      icon: Tag },
  { id: "environnement",label: "Environnement", icon: Globe },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  general:       "bg-blue-100 text-blue-700",
  local:         "bg-emerald-100 text-emerald-700",
  securite:      "bg-red-100 text-red-700",
  evenements:    "bg-purple-100 text-purple-700",
  services:      "bg-amber-100 text-amber-700",
  environnement: "bg-teal-100 text-teal-700",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "à l'instant";
  if (mins < 60)  return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days < 7)   return `il y a ${days} j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ── Composant principal ───────────────────────────────────────────────────────

function ActualitesPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string>("all");

  // Auth en cache via React Query — plus de getUser() individuel
  const { collectivityId, isLoading: authLoading } = useAppAuth();

  // Charger les articles (attend la fin du check auth)
  const { data: articles, isLoading, error } = useQuery({
    queryKey: ["news_articles", collectivityId, category],
    enabled: !authLoading,
    queryFn: async () => {
      let q = supabase
        .from("news_articles")
        .select("*, rss_sources(name)")
        .order("published_at", { ascending: false })
        .limit(60);

      // Articles globaux + articles de la commune
      if (collectivityId) {
        q = q.or(`collectivity_id.is.null,collectivity_id.eq.${collectivityId}`);
      } else {
        q = q.is("collectivity_id", null);
      }

      if (category !== "all") q = q.eq("category", category);

      const { data, error } = await q;
      if (error) throw error;
      return data as Article[];
    },
    staleTime: 5 * 60_000, // 5 min
  });

  // Mutation : déclenche fetch-rss manuellement
  const refresh = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("fetch-rss", {
        body: collectivityId ? { collectivity_id: collectivityId } : {},
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.fetched ?? 0} article(s) récupéré(s)`);
      queryClient.invalidateQueries({ queryKey: ["news_articles"] });
    },
    onError: () => toast.error("Impossible de rafraîchir les actualités"),
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 px-4 pb-3 pt-4"
        style={{ background: "linear-gradient(150deg, #1e3a8a 0%, #1d4ed8 100%)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-blue-200" />
            <h1 className="text-base font-bold text-white">Actualités</h1>
          </div>
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        {/* Filtres catégories */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                category === id
                  ? "bg-white text-blue-900"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="px-4 py-3">

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <ArticleSkeleton key={n} />
            ))}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-muted-foreground">
              Impossible de charger les actualités.
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["news_articles"] })}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Vide */}
        {!isLoading && !error && articles?.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Newspaper className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Aucune actualité</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Appuyez sur Actualiser pour charger les dernières nouvelles.
              </p>
            </div>
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCw className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} />
              Charger les actualités
            </button>
          </div>
        )}

        {/* Liste articles */}
        {!isLoading && articles && articles.length > 0 && (
          <div className="space-y-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            <p className="py-4 text-center text-xs text-muted-foreground">
              {articles.length} article{articles.length > 1 ? "s" : ""} · Données issues de flux RSS publics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Squelette article ─────────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 rounded-2xl border border-border bg-card p-3">
      {/* Image placeholder */}
      <div className="h-20 w-20 shrink-0 rounded-xl bg-muted" />
      {/* Contenu placeholder */}
      <div className="flex flex-1 flex-col gap-2 py-0.5">
        <div className="flex gap-2">
          <div className="h-3 w-20 rounded-full bg-muted" />
          <div className="h-3 w-12 rounded-full bg-muted" />
        </div>
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
        <div className="mt-auto h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

// ── Carte article ─────────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: Article }) {
  const catColor = CATEGORY_COLORS[article.category] ?? "bg-slate-100 text-slate-600";

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md active:scale-[0.98]"
    >
      {/* Image */}
      {article.image_url && (
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          <img
            src={article.image_url}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      {/* Contenu */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Source + catégorie */}
        <div className="flex items-center gap-1.5">
          {article.rss_sources?.name && (
            <span className="truncate text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {article.rss_sources.name}
            </span>
          )}
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${catColor}`}>
            {article.category}
          </span>
        </div>

        {/* Titre */}
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {article.title}
        </p>

        {/* Description */}
        {article.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {article.description}
          </p>
        )}

        {/* Date + lien */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">
            {relativeTime(article.published_at ?? article.fetched_at)}
          </span>
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary">
            Lire <ExternalLink className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </a>
  );
}
