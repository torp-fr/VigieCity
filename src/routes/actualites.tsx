import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock, Calendar, MapPin } from "lucide-react";
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

// ── Types ─────────────────────────────────────────────────────────────────────
type Publication = {
  id: string;
  title: string;
  content: string;
  category: string;
  published_at: string | null;
  created_at: string;
  image_url?: string | null;
};

type Event = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  image_url: string | null;
  is_published: boolean;
};

type Tab = "commune" | "agenda";

// ── Méta catégories publications ───────────────────────────────────────────────
const PUB_CAT: Record<string, { label: string; icon: string; color: string }> = {
  actualite:     { label: "Actualité",     icon: "📰", color: "bg-primary/10 text-primary" },
  evenement:     { label: "Événement",     icon: "📅", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  securite:      { label: "Sécurité",      icon: "🛡️", color: "bg-sos/10 text-sos" },
  travaux:       { label: "Travaux",       icon: "🔧", color: "bg-warning/10 text-warning-foreground" },
  info_pratique: { label: "Info pratique", icon: "ℹ️",  color: "bg-muted text-muted-foreground" },
  info:          { label: "Information",   icon: "📢", color: "bg-blue-100 text-blue-700" },
  urgence:       { label: "Urgence",       icon: "🚨", color: "bg-red-100 text-red-700" },
  autre:         { label: "Autre",         icon: "📍", color: "bg-muted text-muted-foreground" },
};

const EVT_CAT: Record<string, { label: string; emoji: string }> = {
  general:   { label: "Général",         emoji: "🎉" },
  sport:     { label: "Sport",           emoji: "⚽" },
  culture:   { label: "Culture",         emoji: "🎭" },
  education: { label: "Éducation",       emoji: "📚" },
  reunion:   { label: "Réunion",         emoji: "🤝" },
  travaux:   { label: "Travaux",         emoji: "🔧" },
  sante:     { label: "Santé",           emoji: "🏥" },
  autre:     { label: "Autre",           emoji: "📍" },
};

function pubCatMeta(c: string) {
  return PUB_CAT[c] ?? { label: c, icon: "📍", color: "bg-muted text-muted-foreground" };
}

function evtCatMeta(c: string) {
  return EVT_CAT[c] ?? { label: c, emoji: "📍" };
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)        return "à l'instant";
  if (diff < 3600)      return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)     return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function fmtMonth(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ── Grouper événements par mois ────────────────────────────────────────────────
function groupByMonth(events: Event[]): { month: string; items: Event[] }[] {
  const groups: Record<string, Event[]> = {};
  for (const evt of events) {
    const key = fmtMonth(evt.start_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(evt);
  }
  return Object.entries(groups).map(([month, items]) => ({ month, items }));
}

// ── Page principale ───────────────────────────────────────────────────────────
function ActualitesPage() {
  const qc                                   = useQueryClient();
  const [tab, setTab]                        = useState<Tab>("commune");
  const [authed, setAuthed]                  = useState<boolean | null>(null);
  const [userId, setUserId]                  = useState<string | null>(null);
  const [collectivityId, setCollectivityId]  = useState<string | null>(null);
  const [communeName, setCommuneName]        = useState<string | null>(null);
  const [profileReady, setProfileReady]      = useState(false);
  const [showPast, setShowPast]              = useState(false);

  // Charger user + commune
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setAuthed(!!uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", uid)
          .single();
        const colId = profile?.collectivity_id ?? null;
        setCollectivityId(colId);
        if (colId) {
          const { data: col } = await supabase
            .from("collectivities")
            .select("name")
            .eq("id", colId)
            .single();
          setCommuneName(col?.name ?? null);
        }
      }
      setProfileReady(true);
    });
  }, []);

  // ── Requête publications ───────────────────────────────────────────────────
  const { data: publications, isLoading: pubLoading } = useQuery({
    queryKey: ["publications", collectivityId],
    enabled: profileReady && !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publications")
        .select("id, title, content, category, published_at, created_at, image_url")
        .eq("collectivity_id", collectivityId!)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data as Publication[];
    },
  });

  // ── Requête événements ─────────────────────────────────────────────────────
  const { data: allEvents, isLoading: evtLoading } = useQuery({
    queryKey: ["events-citizen", collectivityId],
    enabled: profileReady && !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, category, start_at, end_at, location, image_url, is_published")
        .eq("collectivity_id", collectivityId!)
        .eq("is_published", true)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });

  const now = new Date();
  const upcomingEvents = allEvents?.filter((e) => new Date(e.start_at) >= now) ?? [];
  const pastEvents     = allEvents?.filter((e) => new Date(e.start_at) <  now).reverse() ?? [];
  const visibleEvents  = showPast ? [...upcomingEvents, ...pastEvents] : upcomingEvents;
  const grouped        = groupByMonth(visibleEvents);

  // ── Realtime publications ──────────────────────────────────────────────────
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

  // ── Non connecté ──────────────────────────────────────────────────────────
  if (authed === false) {
    return (
      <div className="px-4 pt-10 text-center">
        <h1 className="text-xl font-semibold">Actualités</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir les actualités de votre commune.
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
    <div className="flex flex-col gap-0">
      {/* ── En-tête sticky avec sélecteur d'onglets ── */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-0 pt-4 backdrop-blur">
        <h1 className="text-2xl font-bold">Actualités</h1>
        {communeName && (
          <p className="mt-0.5 text-sm text-muted-foreground">{communeName}</p>
        )}

        {/* Onglets */}
        <div className="mt-3 flex gap-1">
          {(["commune", "agenda"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-t-xl py-2 text-sm font-semibold transition-colors ${
                tab === t
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "commune" ? "Commune" : "Agenda"}
              {t === "agenda" && upcomingEvents.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">
                  {upcomingEvents.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pas de commune sélectionnée ── */}
      {profileReady && userId && !collectivityId && (
        <div className="mx-4 mt-4 rounded-2xl border border-dashed border-border bg-card p-5 text-center">
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

      {/* ══════════════════ TAB COMMUNE ══════════════════ */}
      {tab === "commune" && (
        <div className="space-y-3 px-4 pt-4 pb-6">
          {pubLoading ? (
            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
              ))}
            </ul>
          ) : !publications?.length && collectivityId ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Aucune actualité publiée pour le moment.
            </div>
          ) : (
            <ul className="space-y-3">
              {publications?.map((pub) => {
                const meta = pubCatMeta(pub.category);
                return (
                  <li
                    key={pub.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                  >
                    {pub.image_url && (
                      <img
                        src={pub.image_url}
                        alt={pub.title}
                        className="w-full object-cover"
                        style={{ aspectRatio: "16/9", maxHeight: "300px" }}
                        loading="lazy"
                      />
                    )}
                    <div className="flex items-start gap-3 p-4">
                      {!pub.image_url && (
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${meta.color}`}
                        >
                          {meta.icon}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {timeAgo(pub.published_at ?? pub.created_at)}
                          </span>
                        </div>
                        <h2 className="mt-1 font-semibold leading-snug">{pub.title}</h2>
                        <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                          {pub.content}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ══════════════════ TAB AGENDA ══════════════════ */}
      {tab === "agenda" && (
        <div className="px-4 pt-4 pb-6">
          {evtLoading ? (
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
              ))}
            </ul>
          ) : visibleEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {showPast ? "Aucun événement disponible." : "Aucun événement à venir."}
              </p>
              {!showPast && pastEvents.length > 0 && (
                <button
                  onClick={() => setShowPast(true)}
                  className="mt-3 text-xs text-primary underline underline-offset-4"
                >
                  Voir les événements passés
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map(({ month, items }) => (
                <section key={month}>
                  {/* Mois */}
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {month}
                  </h2>

                  <ul className="flex flex-col gap-2">
                    {items.map((evt) => {
                      const cat = evtCatMeta(evt.category);
                      const isPast = new Date(evt.start_at) < now;
                      return (
                        <li
                          key={evt.id}
                          className={`overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${
                            isPast ? "opacity-60" : ""
                          }`}
                        >
                          {/* Image */}
                          {evt.image_url && (
                            <img
                              src={evt.image_url}
                              alt={evt.title}
                              className="w-full object-cover"
                              style={{ aspectRatio: "16/9", maxHeight: "200px" }}
                              loading="lazy"
                            />
                          )}

                          <div className="flex gap-3 p-3">
                            {/* Date badge */}
                            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <span className="text-xl font-bold leading-none">
                                {new Date(evt.start_at).getDate()}
                              </span>
                              <span className="text-[11px] uppercase leading-tight">
                                {new Date(evt.start_at).toLocaleDateString("fr-FR", { month: "short" })}
                              </span>
                            </div>

                            {/* Détails */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1">
                                <h3 className="font-semibold leading-snug line-clamp-2">
                                  {evt.title}
                                </h3>
                                <span className="shrink-0 text-sm">{cat.emoji}</span>
                              </div>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {fmtTime(evt.start_at)}
                                  {evt.end_at && (
                                    <> — {fmtTime(evt.end_at)}</>
                                  )}
                                </span>
                                {evt.location && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate max-w-[140px]">{evt.location}</span>
                                  </span>
                                )}
                              </div>

                              {evt.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {evt.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              {/* Toggle événements passés */}
              {!showPast && pastEvents.length > 0 && (
                <button
                  onClick={() => setShowPast(true)}
                  className="text-center text-sm text-muted-foreground underline underline-offset-4"
                >
                  Voir les {pastEvents.length} événement{pastEvents.length > 1 ? "s" : ""} passé{pastEvents.length > 1 ? "s" : ""}
                </button>
              )}
              {showPast && pastEvents.length > 0 && (
                <button
                  onClick={() => setShowPast(false)}
                  className="text-center text-sm text-primary underline underline-offset-4"
                >
                  Masquer les événements passés
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
