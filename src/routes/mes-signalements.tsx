import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppAuth } from "@/hooks/useAppAuth";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  ShieldOff,
  Loader2,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoryIcon, categoryLabel } from "@/lib/categories";

export const Route = createFileRoute("/mes-signalements")({
  head: () => ({
    meta: [
      { title: "Mes signalements — VigieCity" },
      {
        name: "description",
        content: "Suivez l'état de vos signalements envoyés à votre commune.",
      },
    ],
  }),
  component: MesSignalementsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Report = {
  id: string;
  category: string;
  severity: string;
  description: string;
  approximate_address: string | null;
  created_at: string;
  status: string;
  is_anonymous: boolean;
};

type HistoryEntry = {
  id: string;
  new_status: string;
  comment: string | null;
  changed_at: string;
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:     { label: "En attente",  cls: "bg-muted text-muted-foreground border-border" },
  published:   { label: "Publié",      cls: "bg-success/15 text-success border-success/30" },
  rejected:    { label: "Rejeté",      cls: "bg-sos/15 text-sos border-sos/30" },
  archived:    { label: "Archivé",     cls: "bg-muted text-muted-foreground border-border" },
  transferred: { label: "Transféré",   cls: "bg-primary/15 text-primary border-primary/30" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

function MesSignalementsPage() {
  // Auth mis en cache — plus de getUser() individuel
  const { userId, isAuthenticated, isLoading: authLoading } = useAppAuth();
  const authed = authLoading ? null : isAuthenticated;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [loadingHist, setLoadingHist] = useState<Set<string>>(new Set());

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", "mine", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id, category, severity, description, approximate_address, created_at, status, is_anonymous",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
  });

  async function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
      setExpanded(next);
      return;
    }
    next.add(id);
    setExpanded(next);
    // Lazy-load history on first open
    if (!history[id]) {
      setLoadingHist((prev) => new Set(prev).add(id));
      const { data } = await supabase
        .from("report_status_history")
        .select("id, new_status, comment, changed_at")
        .eq("report_id", id)
        .order("changed_at", { ascending: false });
      setHistory((prev) => ({ ...prev, [id]: (data ?? []) as HistoryEntry[] }));
      setLoadingHist((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  }

  // ── Gate: auth ──────────────────────────────────────────────────────────────
  if (authed === false) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Connexion requise</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour suivre l'état de vos signalements.
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
    <div className="space-y-4 px-4 pt-5 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes signalements</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {reports?.length
              ? `${reports.length} signalement${reports.length > 1 ? "s" : ""}`
              : "Suivez vos signalements ici."}
          </p>
        </div>
        <Link
          to="/signaler"
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-card"
        >
          <Plus className="h-4 w-4" />
          Nouveau
        </Link>
      </header>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !reports?.length ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const isOpen = expanded.has(r.id);
            const hist = history[r.id];
            const histLoading = loadingHist.has(r.id);
            return (
              <li
                key={r.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                {/* Card body */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                      {categoryIcon(r.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{categoryLabel(r.category)}</span>
                        <StatusBadge status={r.status} />
                        {r.is_anonymous && (
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            Anonyme
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {r.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {r.approximate_address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {r.approximate_address}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(r.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toggle history */}
                <button
                  type="button"
                  onClick={() => toggleExpand(r.id)}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  {isOpen ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Masquer l'historique
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Voir l'historique
                    </>
                  )}
                </button>

                {/* History panel */}
                {isOpen && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3">
                    {histLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : !hist?.length ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">
                        Aucun changement de statut enregistré.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {hist.map((h) => (
                          <li key={h.id} className="flex items-start gap-3">
                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/50" />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={h.new_status} />
                                <span className="text-[11px] text-muted-foreground">
                                  {timeAgo(h.changed_at)}
                                </span>
                              </div>
                              {h.comment && (
                                <p className="mt-1 text-xs italic text-foreground/80">
                                  "{h.comment}"
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-3 text-base font-semibold">Aucun signalement</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Vous n'avez encore envoyé aucun signalement à votre commune.
      </p>
      <Link
        to="/signaler"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card"
      >
        <Plus className="h-4 w-4" />
        Signaler un évènement
      </Link>
    </div>
  );
}
