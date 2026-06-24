import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/support")({
  head: () => ({ meta: [{ title: "Support — Platform Admin" }, { name: "robots", content: "noindex" }] }),
  component: PlatformSupportPage,
});

type Ticket = {
  id: string;
  collectivity_id: string | null;
  commune_name: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_by: string | null;
  creator_name: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  open:        { label: "Ouvert",       color: "bg-primary/10 text-primary border border-primary/30" },
  in_progress: { label: "En cours",     color: "bg-warning/10 text-warning-foreground border border-warning/30" },
  resolved:    { label: "Résolu",       color: "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30" },
  closed:      { label: "Fermé",        color: "bg-muted text-muted-foreground" },
};
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low:    { label: "Faible",   color: "text-muted-foreground" },
  medium: { label: "Moyen",    color: "text-foreground" },
  high:   { label: "Élevé",   color: "text-warning-foreground" },
  urgent: { label: "Urgent",   color: "text-sos" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function PlatformSupportPage() {
  return (
    <PlatformShell activePath="/platform/support">
      <PlatformSupportPageContent />
    </PlatformShell>
  );
}

function PlatformSupportPageContent() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [resolution, setResolution] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform_support", filterStatus],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("id, collectivity_id, subject, message, status, priority, created_by, resolution_notes, created_at, updated_at, collectivities(name), profiles!support_tickets_created_by_fkey(display_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        commune_name: t.collectivities?.name ?? null,
        creator_name: t.profiles?.display_name ?? null,
      })) as Ticket[];
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, status, resolution_notes }: { id: string; status: string; resolution_notes?: string }) => {
      const payload: any = { status, updated_at: new Date().toISOString() };
      if (resolution_notes !== undefined) payload.resolution_notes = resolution_notes;
      const { error } = await supabase.from("support_tickets").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_support"] });
      qc.invalidateQueries({ queryKey: ["platform_stats_summary"] });
      setExpandedId(null);
      setResolution("");
      toast.success("Ticket mis à jour.");
    },
    onError: () => toast.error("Erreur lors de la mise à jour."),
  });


  return (
    <div className="space-y-4 px-4 pt-5">
      <header>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tickets des communes.</p>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["open", "in_progress", "resolved", "closed", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors ${
              filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"
            }`}
          >
            {s === "all" ? "Tous" : (STATUS_META[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucun ticket pour ce filtre.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((t) => {
            const sm = STATUS_META[t.status] ?? { label: t.status, color: "bg-muted text-muted-foreground" };
            const pm = PRIORITY_META[t.priority] ?? PRIORITY_META.medium;
            const isExpanded = expandedId === t.id;
            return (
              <li key={t.id} className="rounded-2xl border border-border bg-card shadow-card">
                <button
                  className="flex w-full items-start gap-3 p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sm.color}`}>{sm.label}</span>
                      <span className={`text-[10px] font-semibold uppercase ${pm.color}`}>{pm.label}</span>
                    </div>
                    <p className="font-semibold leading-snug truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.commune_name ?? "Commune inconnue"} · {fmtDate(t.created_at)}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    <p className="text-sm leading-relaxed">{t.message}</p>
                    {t.creator_name && (
                      <p className="text-xs text-muted-foreground">Par : {t.creator_name}</p>
                    )}
                    {t.resolution_notes && (
                      <div className="rounded-xl bg-muted/50 p-3 text-xs">
                        <p className="font-semibold mb-1">Notes de résolution :</p>
                        <p>{t.resolution_notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {t.status !== "closed" && (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={expandedId === t.id ? resolution : ""}
                          onChange={(e) => setResolution(e.target.value)}
                          placeholder="Notes de résolution (optionnel)…"
                          rows={2}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <div className="flex flex-wrap gap-2">
                          {t.status === "open" && (
                            <button
                              onClick={() => updateTicket.mutate({ id: t.id, status: "in_progress" })}
                              disabled={updateTicket.isPending}
                              className="rounded-xl border border-primary bg-background px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50"
                            >
                              Prendre en charge
                            </button>
                          )}
                          {t.status !== "resolved" && (
                            <button
                              onClick={() => updateTicket.mutate({ id: t.id, status: "resolved", resolution_notes: resolution || undefined })}
                              disabled={updateTicket.isPending}
                              className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                            >
                              Marquer résolu
                            </button>
                          )}
                          <button
                            onClick={() => updateTicket.mutate({ id: t.id, status: "closed" })}
                            disabled={updateTicket.isPending}
                            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
