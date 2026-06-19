import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PhoneCall, CheckCircle, MapPin, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/admin/sos")({
  component: SosPage,
});

function SosPage() {
  const qc = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-sos-events"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user!.id)
        .single();

      const { data } = await supabase
        .from("sos_events")
        .select("*, profiles(display_name)")
        .eq("collectivity_id", profile!.collectivity_id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase
        .from("sos_events")
        .update({ resolved_at: new Date().toISOString(), message: note || undefined })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sos-events"] });
      setResolvingId(null);
      setNote("");
      toast.success("SOS marqué comme résolu");
    },
    onError: () => toast.error("Erreur lors de la résolution"),
  });

  const openCount = events?.filter((e) => !e.resolved_at).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PhoneCall className="h-6 w-6 text-destructive" />
            Événements SOS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alertes d'urgence déclenchées par les citoyens
          </p>
        </div>
        {openCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">{openCount} SOS non résolu{openCount > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : events?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun événement SOS</div>
      ) : (
        <div className="space-y-3">
          {events?.map((event) => {
            const isOpen = !event.resolved_at;
            const isOld = isOpen && new Date().getTime() - new Date(event.created_at).getTime() > 3600_000;
            return (
              <div
                key={event.id}
                className={`rounded-xl border p-4 ${
                  isOpen
                    ? isOld
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-orange-300/50 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-border bg-card opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isOpen ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {isOpen ? "OUVERT" : "RÉSOLU"}
                      </span>
                      <span className="text-sm font-medium">
                        {(event as any).profiles?.display_name ?? "Anonyme"}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(event.created_at), { locale: fr, addSuffix: true })}
                      </span>
                    </div>
                    {event.message && (
                      <p className="mt-1 text-sm text-foreground/80">{event.message}</p>
                    )}
                    {event.lat && event.lng && (
                      <a
                        href={`https://maps.google.com/?q=${event.lat},${event.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        Voir sur Google Maps
                      </a>
                    )}
                    {event.resolved_at && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Résolu {formatDistanceToNow(new Date(event.resolved_at), { locale: fr, addSuffix: true })}
                      </p>
                    )}
                  </div>

                  {isOpen && (
                    <div className="shrink-0">
                      {resolvingId === event.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="Note de résolution (optionnelle)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs w-48"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => resolve.mutate({ id: event.id, note })}
                              disabled={resolve.isPending}
                              className="flex-1 rounded-md bg-success text-success-foreground px-2 py-1 text-xs font-medium hover:opacity-90"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => { setResolvingId(null); setNote(""); }}
                              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResolvingId(event.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-success/10 text-success px-3 py-1.5 text-xs font-medium hover:bg-success/20 transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Résoudre
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
