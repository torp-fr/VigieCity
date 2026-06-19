import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Newspaper,
  ShieldAlert,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { REPORT_CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/fil")({
  head: () => ({
    meta: [
      { title: "Fil du quartier — VigieCity" },
      {
        name: "description",
        content: "Consultez les signalements publiés dans votre commune.",
      },
    ],
  }),
  component: FilPage,
});

type Report = {
  id: string;
  category: string;
  severity: "info" | "vigilance" | "urgent";
  title: string | null;
  description: string;
  approximate_address: string | null;
  is_anonymous: boolean;
  created_at: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  urgent: "text-sos",
  vigilance: "text-warning",
  info: "text-muted-foreground",
};

function FilPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [communeName, setCommuneName] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  // Load user + commune
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id, collectivities(name)")
          .eq("id", uid)
          .single();
        const cid = profile?.collectivity_id ?? null;
        setCollectivityId(cid);
        // @ts-expect-error – joined relation
        setCommuneName(profile?.collectivities?.name ?? null);
      }
      setProfileReady(true);
    });
  }, []);

  // Fetch published reports for this commune
  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ["reports", "fil", collectivityId],
    enabled: profileReady,
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select("id, category, severity, title, description, approximate_address, is_anonymous, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);

      if (collectivityId) {
        query = query.eq("collectivity_id", collectivityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  // Realtime: subscribe to new published reports for this commune
  useEffect(() => {
    if (!profileReady) return;

    const filter = collectivityId
      ? `collectivity_id=eq.${collectivityId}`
      : undefined;

    const channel = supabase
      .channel(`reports-fil-${collectivityId ?? "global"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
          filter,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["reports", "fil", collectivityId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileReady, collectivityId, qc]);

  return (
    <div className="space-y-5 px-4 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Fil du quartier</h1>
          </div>
          {communeName && (
            <p className="mt-0.5 text-sm text-muted-foreground">{communeName}</p>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Rafraîchir"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </header>

      {!userId && profileReady && (
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour voir les signalements de votre commune.
          </p>
          <Link
            to="/auth"
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Se connecter
          </Link>
        </div>
      )}

      {userId && !collectivityId && profileReady && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas encore choisi de commune.
          </p>
          <Link
            to="/onboarding"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Choisir ma commune
          </Link>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && reports?.length === 0 && userId && collectivityId && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun signalement publié dans votre commune pour l'instant.
          </p>
          <Link
            to="/signaler"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Être le premier à signaler
          </Link>
        </div>
      )}

      {!isLoading && (reports?.length ?? 0) > 0 && (
        <ul className="space-y-3">
          {reports!.map((r) => {
            const cat = REPORT_CATEGORIES.find((c) => c.value === r.category);
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-lg`}
                  aria-hidden
                >
                  {cat?.icon ?? "📋"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {cat?.label ?? r.category}
                    </span>
                    <ShieldAlert
                      className={`h-4 w-4 shrink-0 ${SEVERITY_COLOR[r.severity] ?? "text-muted-foreground"}`}
                    />
                  </div>
                  {r.title && (
                    <p className="mt-1 font-semibold leading-tight">{r.title}</p>
                  )}
                  <p className="mt-1 line-clamp-3 text-sm text-foreground">{r.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {r.approximate_address && (
                      <span>📍 {r.approximate_address}</span>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(r.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                    {r.is_anonymous && <span className="italic">Anonyme</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* CTA signaler */}
      {userId && collectivityId && (
        <Link
          to="/signaler"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm font-semibold text-primary transition hover:bg-primary/10"
        >
          <AlertCircle className="h-4 w-4" />
          Signaler un évènement
        </Link>
      )}
    </div>
  );
}
