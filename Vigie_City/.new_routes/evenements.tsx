import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/evenements")({
  head: () => ({
    meta: [
      { title: "Agenda — VigieCity" },
      { name: "description", content: "Agenda des événements de votre commune." },
    ],
  }),
  component: EvenementsPage,
});

// ── Types ────────────────────────────────────────────────────────────────────
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
};

type RegCount = { event_id: string; registration_count: number };

// ── Catégories ──────────────────────────────────────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  general: "🎉", sport: "⚽", culture: "🎭", education: "📚",
  reunion: "🤝", travaux: "🔧", sante: "🏥", autre: "📍",
};
const CAT_LABEL: Record<string, string> = {
  general: "Général", sport: "Sport", culture: "Culture",
  education: "Éducation", reunion: "Réunion", travaux: "Travaux",
  sante: "Santé", autre: "Autre",
};

// ── iCal export ─────────────────────────────────────────────────────────────
function exportIcal(event: Event) {
  const fmt = (d: string) =>
    new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const uid = `${event.id}@vigiecity.fr`;
  const summary = event.title.replace(/[,;]/g, "\\$&");
  const description = (event.description ?? "").replace(/[,;]/g, "\\$&").replace(/\n/g, "\\n");
  const location = (event.location ?? "").replace(/[,;]/g, "\\$&");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VigieCity//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(event.start_at)}`,
    event.end_at ? `DTEND:${fmt(event.end_at)}` : `DTEND:${fmt(event.start_at)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : "",
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `evenement-vigiecity.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Formatage date ───────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Composant principal ──────────────────────────────────────────────────────
function EvenementsPage() {
  const qc = useQueryClient();
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", data.user.id)
          .single();
        setCollectivityId(profile?.collectivity_id ?? null);
      }
      setReady(true);
    });
  }, []);

  // Événements publiés à venir (+ passés récents)
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["citizen-events", collectivityId],
    enabled: ready && !!collectivityId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("collectivity_id", collectivityId!)
        .eq("is_published", true)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });

  // Mes inscriptions
  const { data: myRegs = [] } = useQuery({
    queryKey: ["my-event-registrations", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r: { event_id: string }) => r.event_id);
    },
  });

  // Comptage inscriptions
  const { data: regCounts = {} } = useQuery({
    queryKey: ["citizen-event-reg-counts", collectivityId],
    enabled: !!events.length,
    staleTime: 60_000,
    queryFn: async () => {
      const ids = events.map((e) => e.id);
      const { data } = await supabase
        .from("event_registration_counts")
        .select("event_id, registration_count")
        .in("event_id", ids);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: RegCount) => { map[r.event_id] = r.registration_count; });
      return map;
    },
  });

  // S'inscrire
  const register = useMutation({
    mutationFn: async (event: Event) => {
      if (!userId || !collectivityId) throw new Error("Non connecté");
      const { error } = await supabase.from("event_registrations").insert({
        event_id:        event.id,
        user_id:         userId,
        collectivity_id: event.collectivity_id,
      });
      if (error) throw error;
    },
    onSuccess: (_, event) => {
      toast.success("Inscription confirmée !");
      qc.invalidateQueries({ queryKey: ["my-event-registrations", userId] });
      qc.invalidateQueries({ queryKey: ["citizen-event-reg-counts", collectivityId] });
      // Proposer export iCal
      setTimeout(() => exportIcal(event), 300);
    },
    onError: (err: Error) => {
      if (err.message.includes("duplicate")) {
        toast.error("Vous êtes déjà inscrit à cet événement.");
      } else {
        toast.error("Impossible de s'inscrire : " + err.message);
      }
    },
  });

  // Se désinscrire
  const unregister = useMutation({
    mutationFn: async (eventId: string) => {
      if (!userId) throw new Error("Non connecté");
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Désinscription effectuée.");
      qc.invalidateQueries({ queryKey: ["my-event-registrations", userId] });
      qc.invalidateQueries({ queryKey: ["citizen-event-reg-counts", collectivityId] });
    },
    onError: () => toast.error("Impossible de se désinscrire."),
  });

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.start_at) >= now);
  const past     = events.filter((e) => new Date(e.start_at) <  now);

  return (
    <div className="space-y-6 px-4 py-6">
      {/* En-tête */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Événements de votre commune</p>
        </div>
      </header>

      {/* Chargement */}
      {isLoading && (
        <div className="flex justify-center pt-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* À venir */}
      {!isLoading && upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            📅 À venir
          </h2>
          <div className="flex flex-col gap-3">
            {upcoming.map((evt) => (
              <EventCard
                key={evt.id}
                event={evt}
                isRegistered={myRegs.includes(evt.id)}
                regCount={regCounts[evt.id] ?? 0}
                userId={userId}
                onRegister={() => register.mutate(evt)}
                onUnregister={() => unregister.mutate(evt.id)}
                onExportIcal={() => exportIcal(evt)}
                isLoading={register.isPending || unregister.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Passés */}
      {!isLoading && past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Événements passés
          </h2>
          <div className="flex flex-col gap-2 opacity-60">
            {past.slice(0, 5).map((evt) => (
              <EventCard
                key={evt.id}
                event={evt}
                isRegistered={myRegs.includes(evt.id)}
                regCount={regCounts[evt.id] ?? 0}
                userId={userId}
                onRegister={() => {}}
                onUnregister={() => {}}
                onExportIcal={() => exportIcal(evt)}
                isLoading={false}
                isPast
              />
            ))}
          </div>
        </section>
      )}

      {/* Vide */}
      {!isLoading && events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Aucun événement à venir pour le moment.</p>
        </div>
      )}
    </div>
  );
}

// ── Carte événement ──────────────────────────────────────────────────────────
function EventCard({
  event,
  isRegistered,
  regCount,
  userId,
  onRegister,
  onUnregister,
  onExportIcal,
  isLoading,
  isPast = false,
}: {
  event: Event;
  isRegistered: boolean;
  regCount: number;
  userId: string | null;
  onRegister: () => void;
  onUnregister: () => void;
  onExportIcal: () => void;
  isLoading: boolean;
  isPast?: boolean;
}) {
  const emoji    = CAT_EMOJI[event.category] ?? "📍";
  const label    = CAT_LABEL[event.category] ?? event.category;
  const isFull   = !!event.max_capacity && regCount >= event.max_capacity;
  const canRegister = !!userId && !isPast && !isFull;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Image */}
      {event.image_url && (
        <img
          src={event.image_url}
          alt={event.title}
          className="h-32 w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}

      <div className="p-4">
        {/* Titre + catégorie */}
        <div className="flex items-start gap-2 justify-between">
          <h3 className="font-bold leading-snug">{event.title}</h3>
          <span className="shrink-0 text-lg">{emoji}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>

        {/* Méta */}
        <div className="mt-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{fmtDate(event.start_at)}</span>
            {event.end_at && (
              <span>→ {new Date(event.end_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{event.location}</span>
            </div>
          )}
          {/* Jauge inscriptions */}
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              {regCount} inscrits
              {event.max_capacity ? ` / ${event.max_capacity} places` : ""}
            </span>
            {isFull && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                Complet
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="mt-2.5 text-[12px] text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Actions */}
        {!isPast && userId && (
          <div className="mt-3 flex gap-2">
            {isRegistered ? (
              <>
                <button
                  onClick={onUnregister}
                  disabled={isLoading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Inscrit · Annuler
                </button>
                <button
                  onClick={onExportIcal}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground transition active:scale-[0.98]"
                  title="Exporter en iCal"
                >
                  <Download className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onRegister}
                disabled={isLoading || !canRegister}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                  isFull
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CalendarPlus className="h-4 w-4" />
                    {isFull ? "Complet" : "S'inscrire"}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Export iCal pour événements passés inscrits */}
        {isPast && isRegistered && (
          <button
            onClick={onExportIcal}
            className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <Download className="h-3 w-3" />
            Exporter .ics
          </button>
        )}
      </div>
    </div>
  );
}
