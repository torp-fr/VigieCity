import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import {
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Car,
  User,
  Package,
  Wrench,
  MoreHorizontal,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/hooks/useAppAuth";

export const Route = createFileRoute("/admin/voisins")({
  component: AdminVoisinsPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type SignalType =
  | "suspicious_vehicle"
  | "suspicious_person"
  | "abandoned_object"
  | "vandalism"
  | "other";

type SignalStatus = "pending" | "approved" | "rejected";

type NeighborhoodSignal = {
  id: string;
  citizen_id: string;
  signal_type: SignalType;
  description: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: SignalStatus;
  moderation_note: string | null;
  created_at: string;
};

// ── Config ────────────────────────────────────────────────────────────────────

const SIGNAL_TYPES: Record<SignalType, { label: string; icon: React.ElementType; color: string }> = {
  suspicious_vehicle: { label: "Véhicule suspect",  icon: Car,            color: "text-orange-500" },
  suspicious_person:  { label: "Personne suspecte", icon: User,           color: "text-red-500"    },
  abandoned_object:   { label: "Objet abandonné",   icon: Package,        color: "text-yellow-600" },
  vandalism:          { label: "Vandalisme",         icon: Wrench,         color: "text-purple-600" },
  other:              { label: "Autre",              icon: MoreHorizontal, color: "text-slate-500"  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminVoisinsPage() {
  const { collectivityId } = useAppAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [moderating, setModerating] = useState<string | null>(null);

  const { data: signals = [], isLoading } = useQuery({
    queryKey: ["admin-neighborhood-signals", collectivityId, tab],
    enabled: !!collectivityId,
    queryFn: async () => {
      let q = supabase
        .from("neighborhood_signals")
        .select("id, citizen_id, signal_type, description, address, lat, lng, status, moderation_note, created_at")
        .eq("collectivity_id", collectivityId!)
        .order("created_at", { ascending: false });
      if (tab === "pending") q = q.eq("status", "pending");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as NeighborhoodSignal[];
    },
  });

  const pending = signals.filter((s) => s.status === "pending");
  const approved = signals.filter((s) => s.status === "approved");
  const rejected = signals.filter((s) => s.status === "rejected");

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("neighborhood_signals")
        .update({ status: "approved", moderation_note: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-neighborhood-signals"] });
      setModerating(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase
        .from("neighborhood_signals")
        .update({ status: "rejected", moderation_note: note || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-neighborhood-signals"] });
      setModerating(null);
    },
  });

  return (
    <AdminShell activePath="/admin/voisins">
      <div className="mx-auto max-w-3xl px-8 py-8 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-800">Voisins vigilants</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Modération des signalements citoyens.
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "En attente",  count: pending.length,  color: "bg-amber-50  text-amber-600",   dot: "bg-amber-500"   },
            { label: "Approuvés",   count: approved.length, color: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
            { label: "Rejetés",     count: rejected.length, color: "bg-slate-100 text-slate-500",   dot: "bg-slate-400"   },
          ].map(({ label, count, color, dot }) => (
            <div key={label} className={`rounded-2xl px-4 py-3 ${color}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["pending", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {t === "pending" ? `En attente (${pending.length})` : "Tous"}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
            <Eye className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-3 text-base font-semibold text-slate-700">
              {tab === "pending" ? "Aucun signalement en attente" : "Aucun signalement"}
            </h2>
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map((signal) => (
              <AdminSignalCard
                key={signal.id}
                signal={signal}
                isModeratingThis={moderating === signal.id}
                onStartModerate={() => setModerating(signal.id)}
                onCancelModerate={() => setModerating(null)}
                onApprove={() => approveMutation.mutate(signal.id)}
                onReject={(note) => rejectMutation.mutate({ id: signal.id, note })}
                isPending={approveMutation.isPending || rejectMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

// ── AdminSignalCard ────────────────────────────────────────────────────────────

function AdminSignalCard({
  signal,
  isModeratingThis,
  onStartModerate,
  onCancelModerate,
  onApprove,
  onReject,
  isPending,
}: {
  signal: NeighborhoodSignal;
  isModeratingThis: boolean;
  onStartModerate: () => void;
  onCancelModerate: () => void;
  onApprove: () => void;
  onReject: (note: string) => void;
  isPending: boolean;
}) {
  const [note, setNote] = useState("");
  const type = SIGNAL_TYPES[signal.signal_type];
  const TypeIcon = type.icon;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return "Il y a moins d'1h";
    if (h < 24) return `Il y a ${h}h`;
    const d = Math.floor(h / 24);
    return `Il y a ${d}j`;
  };

  const statusBadge: Record<SignalStatus, string> = {
    pending:  "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-slate-100 text-slate-500",
  };

  const statusLabel: Record<SignalStatus, string> = {
    pending:  "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Signal body */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <TypeIcon className={`h-5 w-5 ${type.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">{type.label}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[signal.status]}`}>
                {statusLabel[signal.status]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-600 leading-snug">{signal.description}</p>
            {signal.address && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="h-3 w-3" />
                {signal.address}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">{timeAgo(signal.created_at)}</p>
            {signal.moderation_note && (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <span className="font-medium">Note : </span>{signal.moderation_note}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Moderation actions — only for pending */}
      {signal.status === "pending" && (
        <div className="border-t border-slate-100 px-4 py-3">
          {!isModeratingThis ? (
            <div className="flex gap-2">
              <button
                onClick={onApprove}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approuver
              </button>
              <button
                onClick={onStartModerate}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                <XCircle className="h-4 w-4" />
                Rejeter
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note de rejet (optionnel, visible par le citoyen)…"
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onReject(note)}
                  disabled={isPending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-700 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Confirmer le rejet
                </button>
                <button
                  onClick={onCancelModerate}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
