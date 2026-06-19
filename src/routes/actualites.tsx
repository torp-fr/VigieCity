import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/actualites")({
  head: () => ({
    meta: [
      { title: "Actualités — VigieCity" },
      { name: "description", content: "Les publications et actualités de votre commune." },
      { property: "og:title", content: "Actualités — VigieCity" },
    ],
  }),
  component: ActualitesPage,
});

type Publication = {
  id: string;
  title: string;
  content: string;
  category: string;
  published_at: string | null;
  created_at: string;
};

const CAT_META: Record<string, { label: string; icon: string; color: string }> = {
  actualite:    { label: "Actualité",      icon: "📰", color: "bg-primary/10 text-primary" },
  evenement:    { label: "Événement",      icon: "📅", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  securite:     { label: "Sécurité",       icon: "🛡️", color: "bg-sos/10 text-sos" },
  travaux:      { label: "Travaux",        icon: "🔧", color: "bg-warning/10 text-warning-foreground" },
  info_pratique:{ label: "Info pratique",  icon: "ℹ️",  color: "bg-muted text-muted-foreground" },
};

function catMeta(c: string) {
  return CAT_META[c] ?? { label: c, icon: "📍", color: "bg-muted text-muted-foreground" };
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function ActualitesPage() {
  const qc = useQueryClient();
  const [authed, setAuthed]               = useState<boolean | null>(null);
  const [userId, setUserId]               = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [communeName, setCommuneName]     = useState<string | null>(null);
  const [profileReady, setProfileReady]   = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setAuthed(!!uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id, collectivities(name)")
          .eq("id", uid)
          .single();
        setCollectivityId(profile?.collectivity_id ?? null);
        setCommuneName(profile?.collectivities?.name ?? null);
      }
      setProfileReady(true);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["publications", collectivityId],
    enabled: profileReady && !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publications")
        .select("id, title, content, category, published_at, created_at")
        .eq("collectivity_id", collectivityId!)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data as Publication[];
    },
  });

  // Realtime: invalidate on any publication change
  useEffect(() => {
    if (!profileReady || !collectivityId) return;
    const channel = supabase
      .channel(`publications-${collectivityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "publications", filter: `collectivity_id=eq.${collectivityId}` },
        () => qc.invalidateQueries({ queryKey: ["publications", collectivityId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileReady, collectivityId, qc]);

  if (authed === false) {
    return (
      <div className="px-4 pt-10 text-center">
        <h1 className="text-xl font-semibold">Actualités</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir les actualités de votre commune.
        </p>
        <Link to="/auth" className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
          Me connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      <header>
        <h1 className="text-2xl font-bold">Actualités</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {communeName ? `Publications officielles — ${communeName}` : "Publications de votre commune."}
        </p>
      </header>

      {profileReady && userId && !collectivityId && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">Vous n'avez pas encore choisi de commune.</p>
          <Link to="/onboarding" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Choisir ma commune
          </Link>
        </div>
      )}

      {isLoading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </ul>
      ) : !data?.length && collectivityId ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune actualité publiée pour le moment.
        </div>
      ) : (
        <ul className="space-y-3">
          {data?.map((pub) => {
            const meta = catMeta(pub.category);
            return (
              <li key={pub.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo(pub.published_at ?? pub.created_at)}
                      </span>
                    </div>
                    <h2 className="mt-1 font-semibold leading-snug">{pub.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-4">{pub.content}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
