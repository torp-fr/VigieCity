import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Search, Loader2, Flag, Eye, EyeOff, AlertTriangle, Check,
  X, Clock, MessageSquare, Trash2, Zap, TrendingUp, Save,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/moderation")({
  component: PlatformModerationPage,
});

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending_review: { label: "En attente", cls: "bg-amber-100 text-amber-700" },
  public: { label: "Publié", cls: "bg-emerald-100 text-emerald-700" },
  hidden: { label: "Masqué", cls: "bg-red-100 text-red-600" },
  escalated: { label: "Escaladé", cls: "bg-violet-100 text-violet-700" },
};

const FLAG_TYPES: Record<string, string> = {
  spam: "Spam",
  profanity: "Profanité",
  abuse: "Abus",
  misinformation: "Désinformation",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Report = {
  id: string;
  collectivity_id: string;
  citizen_id: string;
  content: string;
  status: "pending_review" | "public" | "hidden" | "escalated";
  citizen_flags_count: number;
  created_at: string;
};

type ReportFlag = {
  id: string;
  report_id: string;
  citizen_id: string;
  flag_type: "spam" | "profanity" | "abuse" | "misinformation";
  created_at: string;
};

type ModerationQueueItem = {
  id: string;
  report_id: string;
  status: "pending" | "approved" | "rejected" | "escalated";
  reason: string | null;
  reviewed_by_admin: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type QueueWithReport = ModerationQueueItem & {
  report: Report;
  flags: ReportFlag[];
  flags_count: number;
};

type StatusFilter = "pending" | "approved" | "rejected" | "escalated";

// ── Page ──────────────────────────────────────────────────────────────────────

function PlatformModerationPage() {
  return (
    <PlatformShell activePath="/platform/moderation">
      <PlatformModerationContent />
    </PlatformShell>
  );
}

function PlatformModerationContent() {
  const qc = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debSearch, setDebSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // Debounce search 350 ms
  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["platform/moderation/stats"],
    queryFn: async () => {
      const [pendingRes, avgTimeRes, approvalRes] = await Promise.all([
        supabase
          .from("moderation_queue")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("moderation_queue")
          .select("reviewed_at, created_at")
          .in("status", ["approved", "rejected"]),
        supabase
          .from("moderation_queue")
          .select("id, status", { count: "exact", head: false })
          .in("status", ["approved", "rejected"]),
      ]);

      const pendingCount = pendingRes.count ?? 0;

      // Calculate average review time
      let avgReviewTime = 0;
      if (avgTimeRes.data && avgTimeRes.data.length > 0) {
        const times = avgTimeRes.data
          .filter((item) => item.reviewed_at)
          .map((item) => {
            const created = new Date(item.created_at).getTime();
            const reviewed = new Date(item.reviewed_at!).getTime();
            return (reviewed - created) / (1000 * 60 * 60); // hours
          });
        if (times.length > 0) {
          avgReviewTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        }
      }

      // Calculate approval rate
      const approvalData = approvalRes.data ?? [];
      const approvedCount = approvalData.filter((item) => item.status === "approved").length;
      const totalReviewed = approvalData.length;
      const approvalRate = totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : 0;

      return {
        pending: pendingCount,
        avgReviewTime,
        approvalRate,
      };
    },
    staleTime: 2 * 60_000,
  });

  // ── Fetch moderation queue with details ─────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["platform/moderation", page, debSearch, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("moderation_queue")
        .select(
          `
          id, report_id, status, reason, reviewed_by_admin, reviewed_at, created_at,
          report:reports(id, collectivity_id, citizen_id, content, status, citizen_flags_count, created_at)
          `,
          { count: "exact" },
        )
        .eq("status", statusFilter)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data: queueData, count, error } = await q;
      if (error) throw error;

      // Fetch flags for each report
      const itemsWithFlags = await Promise.all(
        (queueData ?? []).map(async (item: any) => {
          const { data: flagsData } = await supabase
            .from("report_flags")
            .select("*")
            .eq("report_id", item.report_id);
          return {
            ...item,
            flags: (flagsData ?? []) as ReportFlag[],
            flags_count: flagsData?.length ?? 0,
          };
        }),
      );

      return { items: itemsWithFlags as QueueWithReport[], total: count ?? 0 };
    },
    staleTime: 30_000,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);
  const selectedItem = (data?.items ?? []).find((item) => item.id === selectedId);

  // ── Approve mutation ────────────────────────────────────────────────────────
  const approveMut = useMutation({
    mutationFn: async ({ queueId, reportId }: { queueId: string; reportId: string }) => {
      const { error: queueErr } = await supabase
        .from("moderation_queue")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", queueId);
      if (queueErr) throw queueErr;

      const { error: reportErr } = await supabase
        .from("reports")
        .update({ status: "public", visible_to_public: true })
        .eq("id", reportId);
      if (reportErr) throw reportErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform/moderation"] });
      qc.invalidateQueries({ queryKey: ["platform/moderation/stats"] });
      toast.success("Signalement approuvé et publié");
      setSelectedId(null);
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Reject mutation ─────────────────────────────────────────────────────────
  const rejectMut = useMutation({
    mutationFn: async ({ queueId, reportId }: { queueId: string; reportId: string }) => {
      const { error: queueErr } = await supabase
        .from("moderation_queue")
        .update({ status: "rejected", reason: note.trim() || null, reviewed_at: new Date().toISOString() })
        .eq("id", queueId);
      if (queueErr) throw queueErr;

      const { error: reportErr } = await supabase
        .from("reports")
        .update({ status: "hidden", visible_to_public: false })
        .eq("id", reportId);
      if (reportErr) throw reportErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform/moderation"] });
      qc.invalidateQueries({ queryKey: ["platform/moderation/stats"] });
      toast.success("Signalement rejeté et masqué");
      setSelectedId(null);
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Escalate mutation ───────────────────────────────────────────────────────
  const escalateMut = useMutation({
    mutationFn: async ({ queueId, reportId }: { queueId: string; reportId: string }) => {
      const { error: queueErr } = await supabase
        .from("moderation_queue")
        .update({ status: "escalated", reason: note.trim() || null, reviewed_at: new Date().toISOString() })
        .eq("id", queueId);
      if (queueErr) throw queueErr;

      const { error: reportErr } = await supabase
        .from("reports")
        .update({ status: "escalated" })
        .eq("id", reportId);
      if (reportErr) throw reportErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform/moderation"] });
      qc.invalidateQueries({ queryKey: ["platform/moderation/stats"] });
      toast.success("Signalement escaladé pour révision");
      setSelectedId(null);
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Modération</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Examinez et modérez les signalements citoyens signalés comme abusifs
        </p>
      </div>

      {/* KPIs — 3 cartes */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          label="En attente de révision"
          value={stats?.pending ?? 0}
          highlight
        />
        <KpiCard
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          label="Temps moyen de révision"
          value={`${stats?.avgReviewTime ?? 0}h`}
        />
        <KpiCard
          icon={<Check className="h-4 w-4 text-emerald-600" />}
          label="Taux d'approbation"
          value={`${stats?.approvalRate ?? 0}%`}
        />
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["pending", "approved", "rejected", "escalated"] as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(0);
              setSelectedId(null);
            }}
            className={[
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition",
              statusFilter === status
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            ].join(" ")}
          >
            {status === "pending" && "En attente"}
            {status === "approved" && "Approuvés"}
            {status === "rejected" && "Rejetés"}
            {status === "escalated" && "Escaladés"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par contenu, collectivité…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2"
          />
        </div>
      </div>

      {/* Main layout: queue list + detail panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* LEFT: Queue list */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm text-slate-500">
                {(data?.total ?? 0).toLocaleString("fr-FR")} en {statusFilter}
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="max-h-[600px] divide-y divide-slate-50 overflow-y-auto">
                {(data?.items ?? []).length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    Aucun signalement à modérer.
                  </div>
                ) : (
                  (data?.items ?? []).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full px-4 py-3 text-left transition hover:bg-blue-50 ${
                        selectedId === item.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {item.report.content.slice(0, 60)}…
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.flags_count} signalement{item.flags_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                            STATUS_META[item.status]?.cls || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {STATUS_META[item.status]?.label || item.status}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Préc.
                </button>
                <span className="text-xs text-slate-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Suiv.
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        <div className="lg:col-span-2">
          {selectedItem ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Header */}
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Détail du signalement</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      ID: {selectedItem.report.id.slice(0, 8)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4 px-5 py-4">
                {/* Signalement content */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-400">Contenu</h3>
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {selectedItem.report.content}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Créé</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {new Date(selectedItem.report.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Statut</p>
                    <p className="mt-1">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          STATUS_META[selectedItem.report.status]?.cls || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {STATUS_META[selectedItem.report.status]?.label || selectedItem.report.status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Flags from citizens */}
                {selectedItem.flags_count > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400">
                      Signalements citoyens ({selectedItem.flags_count})
                    </h3>
                    <div className="mt-2 space-y-2">
                      {selectedItem.flags.map((flag) => (
                        <div
                          key={flag.id}
                          className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <Flag className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-xs font-semibold text-slate-700">
                            {FLAG_TYPES[flag.flag_type] || flag.flag_type}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(flag.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes textarea */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-400">Notes de modération</h3>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Raison de votre décision (optionnel)…"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none ring-blue-500 focus:border-blue-500 focus:ring-2 resize-none"
                    rows={3}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      approveMut.mutate({
                        queueId: selectedItem.id,
                        reportId: selectedItem.report.id,
                      })
                    }
                    disabled={approveMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {approveMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approuver
                  </button>
                  <button
                    onClick={() =>
                      rejectMut.mutate({
                        queueId: selectedItem.id,
                        reportId: selectedItem.report.id,
                      })
                    }
                    disabled={rejectMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    {rejectMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Rejeter
                  </button>
                  <button
                    onClick={() =>
                      escalateMut.mutate({
                        queueId: selectedItem.id,
                        reportId: selectedItem.report.id,
                      })
                    }
                    disabled={escalateMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition"
                  >
                    {escalateMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    Escalader
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
              <p className="text-sm text-slate-400">Sélectionnez un signalement pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── KPI Card component ─────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 shadow-sm ${
        highlight
          ? "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase ${highlight ? "text-blue-700" : "text-slate-500"}`}>
            {label}
          </p>
          <p className={`mt-1.5 text-2xl font-bold ${highlight ? "text-blue-900" : "text-slate-900"}`}>
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">{icon}</div>
      </div>
    </div>
  );
}
