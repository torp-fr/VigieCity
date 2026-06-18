import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoryIcon, categoryLabel } from "@/lib/categories";

export const Route = createFileRoute("/fil")({
  head: () => ({
    meta: [
      { title: "Fil du quartier — VigieCity" },
      {
        name: "description",
        content:
          "Les signalements vérifiés autour de chez vous, partagés par vos voisins et la mairie.",
      },
      { property: "og:title", content: "Fil du quartier — VigieCity" },
      {
        property: "og:description",
        content: "Restez informé·e de ce qui se passe dans votre quartier.",
      },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "feed"],
    enabled: authed === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, category, severity, description, approximate_address, created_at, is_anonymous")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (authed === false) {
    return (
      <div className="px-4 pt-10 text-center">
        <h1 className="text-xl font-semibold">Fil du quartier</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir les signalements de votre commune.
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Me connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      <header>
        <h1 className="text-2xl font-bold">Fil du quartier</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signalements vérifiés et publiés par la mairie.
        </p>
      </header>

      {isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </ul>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucun signalement publié pour le moment.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((r) => (
            <li
              key={r.id}
              className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                {categoryIcon(r.category)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold leading-tight">{categoryLabel(r.category)}</p>
                  <SeverityBadge value={r.severity as "info" | "vigilance" | "urgent"} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{r.description}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {r.approximate_address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.approximate_address}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(r.created_at)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SeverityBadge({ value }: { value: "info" | "vigilance" | "urgent" }) {
  const map = {
    info: "bg-muted text-muted-foreground",
    vigilance: "bg-warning/15 text-warning-foreground border border-warning/30",
    urgent: "bg-sos/15 text-sos border border-sos/30",
  } as const;
  const label = { info: "Info", vigilance: "Vigilance", urgent: "Urgent" }[value];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${map[value]}`}>
      {label}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}
