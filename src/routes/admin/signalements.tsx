import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Archive,
  ArrowRight,
  Loader2,
  Clock,
  MapPin,
  MessageSquare,
  X,
  Search,
  Download,
} from "lucide-react";
// Note: Lock import removed — AdminShell gère l'auth guard
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryIcon, categoryLabel } from "@/lib/categories";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/signalements")({
  head: () => ({ meta: [{ title: "Modération signalements — VigieCity" }] }),
  component: SignalementsAdmin,
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

type StatusAction = "published" | "rejected" | "archived" | "transferred";
type StatusFilter = "pending" | "published" | "rejected" | "archived" | "transferred";

type ModalState = {
  report: Report;
  action: StatusAction;
  comment: string;
} | null;

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: { filter: StatusFilter; label: string }[] = [
  { filter: "pending", label: "En attente" },
  { filter: "published", label: "Publiés" },
  { filter: "rejected", label: "Rejetés" },
  { filter: "archived", label: "Archivés" },
  { filter: "transferred", label: "Transférés" },
];

const STATUS_PUSH: Record<StatusAction, string> = {
  published: "Votre signalement a été publié dans le fil de quartier.",
  rejected: "Votre signalement n'a pas pu être retenu.",
  archived: "Votre signalement a été archivé.",
  transferred: "Votre signalement a été transmis à un autre service.",
};

const ACTION_CONFIG: Record<StatusAction, { label: string; cls: string }> = {
  published:   { label: "Publier",    cls: "bg-success text-white" },
  rejected:    { label: "Rejeter",    cls: "bg-sos text-white" },
  archived:    { label: "Archiver",   cls: "bg-muted text-foreground" },
  transferred: { label: "Transférer", cls: "bg-warning text-warning-foreground" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

function SignalementsAdmin() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatusFilter>("pending");
  const [modal, setModal]   = useState<ModalState>(null);
  const [search, setSearch] = useState("");

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

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", "admin", collectivityId, activeTab],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id, user_id, category, severity, description, approximate_address, created_at, status, is_anonymous",
        )
        .eq("collectivity_id", collectivityId!)
        .eq("status", activeTab)
        .order("created_at", { ascending: activeTab === "pending" });
      if (error) throw error;
      return data as Report[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      report,
      newStatus,
      comment,
    }: {
      report: Report;
      newStatus: StatusAction;
      comment: string;
    }) => {
      // 1. Mise à jour du statut
      const { error: updateErr } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", report.id);
      if (updateErr) throw updateErr;

      // 2. Historique
      await supabase.from("report_status_history").insert({
        report_id: report.id,
        old_status: report.status,
        new_status: newStatus,
        changed_by: userId,
        comment: comment.trim() || null,
      });

      // 3. Push notification (best-effort : pas de throw si l'utilisateur n'est pas abonné)
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: report.user_id,
            title: "Votre signalement a été mis à jour",
            message: STATUS_PUSH[newStatus],
            url: "/mes-signalements",
          },
        });
      } catch {
        // Silencieux : l'utilisateur n'est peut-être pas abonné aux push
      }

      // 4. Email notification (best-effort — uniquement si signalement non anonyme)
      if (!report.is_anonymous && report.user_id) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              template: "report_updated",
              user_id: report.user_id,   // EF résout l'email via auth.users
              data: {
                titre:          report.description.slice(0, 80),
                statut:         newStatus,
                commentaire:    comment.trim(),
                collectivity_id: collectivityId ?? "",  // EF enrichit commune/logo/couleur
              },
            },
          });
        } catch {
          // Silencieux : email non critique
        }
      }
    },
    onSuccess: (_, { newStatus }) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      const labels: Record<StatusAction, string> = {
        published:   "Signalement publié ✓",
        rejected:    "Signalement rejeté.",
        archived:    "Signalement archivé.",
        transferred: "Signalement transféré.",
      };
      toast.success(labels[newStatus]);
      setModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Filtrage client-side ───────────────────────────────────────────────────
  const term = search.trim().toLowerCase();
  const visible = reports?.filter((r) =>
    !term ||
    r.description.toLowerCase().includes(term) ||
    r.approximate_address?.toLowerCase().includes(term) ||
    r.category.toLowerCase().includes(term)
  ) ?? [];

  // ── Export CSV ─────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = visible.map((r) => [
      new Date(r.created_at).toLocaleString("fr-FR"),
      categoryLabel(r.category),
      r.severity,
      `"${r.description.replace(/"/g, '""')}"`,
      `"${(r.approximate_address ?? "").replace(/"/g, '""')}"`,
      r.status,
      r.is_anonymous ? "Oui" : "Non",
    ]);
    const header = ["Date", "Catégorie", "Sévérité", "Description", "Adresse", "Statut", "Anonyme"];
    const csv = [header, ...rows].map((row) => row.join(";")).join("\r\n");
    // BOM UTF-8 pour Excel
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `signalements-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${visible.length} signalement(s) exporté(s)`);
  }

  function openModal(report: Report, action: StatusAction) {
    setModal({ report, action, comment: "" });
  }

  function confirmAction() {
    if (!modal) return;
    updateStatus.mutate({
      report: modal.report,
      newStatus: modal.action,
      comment: modal.comment,
    });
  }

  return (
    <AdminShell activePath="/admin/signalements">
      <div className="mx-auto max-w-7xl px-8 py-8 space-y-4">
        <div className="mb-1">
          <h1 className="text-2xl font-bold">Signalements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modérez les signalements de votre commune.
          </p>
        </div>

        {/* Onglets statut */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.filter}
              type="button"
              onClick={() => { setActiveTab(tab.filter); setSearch(""); }}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeTab === tab.filter
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Barre de recherche + export */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans les signalements…"
              className="w-full rounded-xl border border-input bg-muted/40 py-2.5 pl-9 pr-3 text-sm outline-none ring-ring placeholder:text-muted-foreground focus:ring-2"
            />
          </div>
          {reports && reports.length > 0 && (
            <button
              type="button"
              onClick={exportCSV}
              title="Exporter en CSV"
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          )}
        </div>

        {/* Résultats count si recherche active */}
        {term && (
          <p className="text-xs text-muted-foreground">
            {visible.length} résultat{visible.length !== 1 ? "s" : ""} pour «{search}»
          </p>
        )}

        {/* Liste */}
        <div>
          {isLoading ? (
            <ul className="space-y-3">
              {[1, 2, 3].map((n) => (
                <ReportSkeleton key={n} />
              ))}
            </ul>
          ) : !visible.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {term
                ? "Aucun signalement ne correspond à votre recherche."
                : activeTab === "pending"
                  ? "Aucun signalement en attente. Beau travail !"
                  : "Aucun signalement ici."}
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onAction={(action) => openModal(r, action)}
                  disabled={updateStatus.isPending}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal d'action */}
      {modal && (
        <ActionModal
          modal={modal}
          onCommentChange={(c) => setModal({ ...modal, comment: c })}
          onConfirm={confirmAction}
          onClose={() => setModal(null)}
          isPending={updateStatus.isPending}
        />
      )}
    </AdminShell>
  );
}

// ── ReportSkeleton ────────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <li className="animate-pulse space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-24 rounded-full bg-muted" />
            <div className="h-4 w-16 rounded-full bg-muted" />
          </div>
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
          <div className="flex gap-3">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-8 rounded-xl bg-muted" />
        ))}
      </div>
    </li>
  );
}

// ── ReportCard ────────────────────────────────────────────────────────────────

function ReportCard({
  report: r,
  onAction,
  disabled,
}: {
  report: Report;
  onAction: (action: StatusAction) => void;
  disabled: boolean;
}) {
  return (
    <li className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
          {categoryIcon(r.category)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{categoryLabel(r.category)}</span>
            <SeverityBadge value={r.severity} />
            {r.is_anonymous && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                Anonyme
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
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

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ActionBtn
          icon={CheckCircle2}
          label="Publier"
          color="success"
          onClick={() => onAction("published")}
          disabled={disabled || r.status === "published"}
        />
        <ActionBtn
          icon={XCircle}
          label="Rejeter"
          color="sos"
          onClick={() => onAction("rejected")}
          disabled={disabled || r.status === "rejected"}
        />
        <ActionBtn
          icon={Archive}
          label="Archiver"
          color="muted"
          onClick={() => onAction("archived")}
          disabled={disabled || r.status === "archived"}
        />
        <ActionBtn
          icon={ArrowRight}
          label="Transférer"
          color="warning"
          onClick={() => onAction("transferred")}
          disabled={disabled || r.status === "transferred"}
        />
      </div>
    </li>
  );
}

// ── ActionModal (bottom sheet) ────────────────────────────────────────────────

function ActionModal({
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
  const cfg = ACTION_CONFIG[modal.action];
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background shadow-lg">
        {/* Handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted" />

        <div className="space-y-4 p-5">
          {/* Résumé signalement */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {categoryLabel(modal.report.category)}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-foreground">
                {modal.report.description}
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
              Commentaire pour le citoyen (optionnel)
            </label>
            <textarea
              value={modal.comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Explication, précision, conseil…"
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
              className="flex-1 rounded-xl border border-border bg-muted py-3 text-sm font-semibold text-foreground"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-50 ${cfg.cls}`}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                cfg.label
              )}
            </button>
          </div>

          {/* Safe area */}
          <div className="h-4" />
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon,
  label,
  color,
  onClick,
  disabled,
}: {
  icon: typeof CheckCircle2;
  label: string;
  color: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const cls =
    color === "success"
      ? "bg-success/10 text-success border-success/20"
      : color === "sos"
        ? "bg-sos/10 text-sos border-sos/20"
        : color === "warning"
          ? "bg-warning/10 text-warning-foreground border-warning/20"
          : "bg-muted text-muted-foreground border-border";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition disabled:opacity-30 ${cls}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function SeverityBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    info: "bg-muted text-muted-foreground",
    vigilance: "bg-warning/15 text-warning-foreground border border-warning/30",
    urgent: "bg-sos/15 text-sos border border-sos/30",
  };
  const labels: Record<string, string> = {
    info: "Info",
    vigilance: "Vigilance",
    urgent: "Urgent",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${map[value] ?? map.info}`}
    >
      {labels[value] ?? value}
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
