import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/publishers")({
  component: PlatformPublishersPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Publisher = {
  id: string;
  name: string;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  publisher_posts: { count: number }[];
};

// ── Page ──────────────────────────────────────────────────────────────────────

function PlatformPublishersPage() {
  const { data: publishers = [], isLoading } = useQuery<Publisher[]>({
    queryKey: ["platform/publishers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publishers")
        .select("*, publisher_posts(count)")
        .order("name");
      if (error) throw error;
      return data as Publisher[];
    },
  });

  const totalPosts = publishers.reduce(
    (sum, p) => sum + (p.publisher_posts?.[0]?.count ?? 0),
    0,
  );

  return (
    <PlatformShell activePath="/platform/publishers">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Éditeurs</h1>
        <p className="mt-1 text-sm text-slate-500">
          {publishers.length} éditeur{publishers.length !== 1 ? "s" : ""} · {totalPosts} article{totalPosts !== 1 ? "s" : ""} au total
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : publishers.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <BookOpen className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Aucun éditeur</p>
            <p className="mt-1 text-sm text-slate-400">
              Les éditeurs apparaissent ici une fois ajoutés en base.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishers.map(p => {
            const postCount = p.publisher_posts?.[0]?.count ?? 0;
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex items-start gap-3">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.name}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <BookOpen className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{p.name}</p>
                    {p.website_url && (
                      <a
                        href={p.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 flex items-center gap-1 text-xs text-blue-500 hover:underline"
                      >
                        Site web <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {p.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-slate-500">
                    {p.description}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                  <span>
                    <span className="font-semibold text-slate-700">{postCount}</span>{" "}
                    article{postCount !== 1 ? "s" : ""}
                  </span>
                  <span>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PlatformShell>
  );
}
