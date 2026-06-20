import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  Clock,
  MapPin,
  AlertTriangle,
  X,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryIcon, categoryLabel } from "@/lib/categories";
import { TerrainShell } from "@/components/TerrainShell";

export const Route = createFileRoute("/admin/terrain/")({
  head: () => ({ meta: [{ title: "Terrain — VigieCity" }] }),
  component: TerrainPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Report = {
  id: string;
  user_id: string;
  category: string;
  severity: string;
  description: string;
  approximate_address: string | null;
  created_at: string;
  status: string;
  is_anonymous: boolean;
};

type QuickAction = "published" | "rejected" | "transferred";

type ModalState = {
  report: Report;
  action: QuickAction;
  comment: string;
} | null;

const ACTION_CFG: Record<QuickAction, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  published:   { label: "Valider",    cls: "bg-emerald-600 text-white",   icon: CheckCircle2 },
  rejected:    { label: "Rejeter",    cls: "bg-red-600 text-white",       icon: XCircle      },
  transferred: { label: "Transférer", cls: "bg-amber-500 text-white",     icon: ArrowRight   },
};

const STATUS_MSG: Record<QuickAction, string> = {
  published:   "Votre signalement a été pris en compte et publié.",
  rejected:    "Votre signalement n'a pas pu être retenu.",
  transferred: "Votre signalement a été transmis au service compétent.",
};

// ── Page ──────────────────────────────────────────────────────────────────────

function TerrainPage() {
  const qc = useQueryClient();
  const [userId,        setUserId]        = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [modal,         setModal]         = useState<ModalState>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", uid)
        .single();
      setCollectivityId(profile?.collectivity_id ?? null);
    });
  }, []);

  const { data: reports, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["reports", "terrain", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, user_id, category, severity, description, approximate_address, created_at, status, is_anonymous")
        .eq("collectivity_id", collectivityId!)
        .eq("status", "pending")
        .order("created_at", { ascending: true }); // Plus ancien en premier
      if (error) throw error;
      return data as Report[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      report,
      action,
      comment,
    }: { report: Report; action: QuickAction; comment: string }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status: action })
        .eq("id", report.id);
      if (error) throw error;

      // Historique
      await supabase.from("report_status_history").insert({
        report_id:  report.id,
        old_status: "pending",
        new_status: action,
        changed_by: userId,
        comment:    comment.trim() || null,
      });

      // Push (best-effort)
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: report.user_id,
            title:   "Votre signalement a été traité",
            message: STATUS_MSG[action],
            url:     "/mes-signalements",
          },
        });
      } catch { /* silencieux */ }
    },
    onSuccess: (_, { action }) => {
      const labels: Record<QuickAction, string> = {
        published:   "✓ Signalement validé",
        rejected:    "Signalement rejeté",
        transferred: "Signalement transféré",
      };
      toast.success(labels[action]);
      qc.invalidateQueries({ queryKey: ["reports", "terrain"] });
      setModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const count = reports?.length ?? 0;

  return (
    <TerrainShell activePath="/admin/terrain">
      <div className="space-y-4 px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              À traiter
              {count > 0 && (
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                  {count}
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Signalements en attente · plus anciens d'abord
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        {/* Contenu */}
        {isLoading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        ) : count === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {reports!.map((r) => (
              <TerrainCard
                key={r.id}
                report={r}
                onAction={(action) => setModal({ report: r, action, comment: "" })}
                disabled={updateStatus.isPending}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Modal confirmation */}
      {modal && (
        <ActionSheet
          modal={modal}
          onCommentChange={(c) => setModal({ ...modal, comment: c })}
          onConfirm={() => updateStatus.mutate({ report: modal.report, action: modal.action, comment: modal.comment })}
          onClose={() => setModal(null)}
          isPending={updateStatus.isPending}
        />
      )}
    </TerrainShell>
  );
}

// ── TerrainCard ───────────────────────────────────────────────────────────────

function TerrainCard({
  report: r,
  onAction,
  disabled,
}: {
  report: Report;
  onAction: (a: QuickAction) => void;
  disabled: boolean;
}) {
  return (
    <li className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Bande sévérité */}
      <div className={`h-1 w-full ${r.severity === "urgent" ? "bg-red-500" : r.severity === "vigilance" ? "bg-amber-400" : "bg-slate-200"}`} />

      <div className="p-4 space-y-3">
        {/* En-tête */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
            {categoryIcon(r.category)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">{categoryLabel(r.category)}</span>
              <SeverityPill value={r.severity} />
              {r.is_anonymous && (
                <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  Anonyme
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
              {r.description}
            </p>
          </div>
        </div>

        {/* Méta */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {r.approximate_address && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              {r.approximate_address}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {timeAgo(r.created_at)}
          </span>
        </div>

        {/* Actions terrain — 3 boutons larges */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <ActionButton
            icon={CheckCircle2}
            label="Valider"
            color="emerald"
            onClick={() => onAction("published")}
            disabled={disabled}
          />
          <ActionButton
            icon={XCircle}
            label="Rejeter"
            color="red"
            onClick={() => onAction("rejected")}
            disabled={disabled}
          />
          <ActionButton
            icon={ArrowRight}
            label="Transférer"
            color="amber"
            onClick={() => onAction("transferred")}
            disabled={disabled}
          />
        </div>
      </div>
    </li>
  );
}

// ── ActionSheet (bottom sheet mobile) ────────────────────────────────────────

function ActionSheet({
  modal,
  onCommentChange,
  onConfirm,
  onClose,
  isPending,
}: {
  modal: NonNullable<ModalState>;
  onCommentChange: (c: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const cfg = ACTION_CFG[modal.action];
  const Icon = cfg.icon;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-background shadow-xl">
        {/* Handle */}
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-muted" />

        <div className="space-y-5 p-5">
          {/* Résumé */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${modal.action === "published" ? "text-emerald-600" : modal.action === "rejected" ? "text-red-600" : "text-amber-500"}`} />
                <span className="text-sm font-semibold">
                  {cfg.label} ce signalement ?
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {categoryLabel(modal.report.category)} — {modal.report.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 hover:bg-muted"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Commentaire */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              Note terrain (optionnel)
            </label>
            <textarea
              value={modal.comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Observations sur place, précisions…"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-input bg-muted/40 p-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-muted py-3.5 text-sm font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 ${cfg.cls}`}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : cfg.label}
            </button>
          </div>

          {/* Safe area iOS */}
          <div className="h-5" />
        </div>
      </div>
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>
      <p className="mt-4 font-semibold text-foreground">Aucun signalement en attente</p>
      <p className="mt-1 text-xs text-muted-foreground">Beau travail ! Tout est traité.</p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionButton({
  icon: Icon,
  label,
  color,
  onClick,
  disabled,
}: {
  icon: typeof CheckCircle2;
  label: string;
  color: "emerald" | "red" | "amber";
  onClick: () => void;
  disabled: boolean;
}) {
  const cls = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red:     "bg-red-50 border-red-200 text-red-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[11px] font-semibold transition disabled:opacity-30 active:scale-95 ${cls}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function SeverityPill({ value }: { value: string }) {
  const cfg = {
    urgent:    { cls: "bg-red-100 text-red-700",     label: "🔴 Urgent"    },
    vigilance: { cls: "bg-amber-100 text-amber-700", label: "🟡 Vigilance" },
    info:      { cls: "bg-slate-100 text-slate-600", label: "Info"         },
  }[value] ?? { cls: "bg-muted text-muted-foreground", label: value };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}
