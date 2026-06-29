import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppAuth } from "@/hooks/useAppAuth";
import {
  Eye,
  ShieldOff,
  Loader2,
  Plus,
  X,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  AlertTriangle,
  Car,
  User,
  Package,
  Wrench,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/voisins")({
  head: () => ({
    meta: [
      { title: "Voisins vigilants — VigieCity" },
      {
        name: "description",
        content: "Signalez les situations suspectes dans votre quartier.",
      },
    ],
  }),
  component: VoisinsPage,
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
  suspicious_vehicle: { label: "Véhicule suspect",  icon: Car,           color: "text-orange-500" },
  suspicious_person:  { label: "Personne suspecte", icon: User,          color: "text-red-500"    },
  abandoned_object:   { label: "Objet abandonné",   icon: Package,       color: "text-yellow-600" },
  vandalism:          { label: "Vandalisme",         icon: Wrench,        color: "text-purple-600" },
  other:              { label: "Autre",              icon: MoreHorizontal, color: "text-slate-500" },
};

const STATUS_CONFIG: Record<SignalStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: "En attente de modération", color: "text-amber-600 bg-amber-50",   icon: Clock        },
  approved: { label: "Validé",                   color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  rejected: { label: "Non retenu",               color: "text-slate-500 bg-slate-100",  icon: XCircle      },
};

// ── Page ──────────────────────────────────────────────────────────────────────

function VoisinsPage() {
  const { userId, collectivityId, isAuthenticated, isLoading: authLoading } = useAppAuth();
  const authed = authLoading ? null : isAuthenticated;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"quartier" | "mes">("quartier");

  // Signalements approuvés (visible par tous les citoyens)
  const { data: approvedSignals = [], isLoading: loadingApproved } = useQuery({
    queryKey: ["neighborhood-signals-approved", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neighborhood_signals")
        .select("id, citizen_id, signal_type, description, address, lat, lng, status, moderation_note, created_at")
        .eq("collectivity_id", collectivityId!)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NeighborhoodSignal[];
    },
  });

  // Mes signalements (tous statuts)
  const { data: mySignals = [], isLoading: loadingMine } = useQuery({
    queryKey: ["my-neighborhood-signals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neighborhood_signals")
        .select("id, citizen_id, signal_type, description, address, lat, lng, status, moderation_note, created_at")
        .eq("citizen_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NeighborhoodSignal[];
    },
  });

  // ── Auth gate ──────────────────────────────────────────────────────────────

  if (authed === false) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Connexion requise</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour accéder aux voisins vigilants.
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const pendingCount = mySignals.filter((s) => s.status === "pending").length;

  return (
    <>
      <div className="space-y-4 px-4 pt-5 pb-24">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Voisins vigilants</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Signalez les situations suspectes de manière anonyme.
            </p>
          </div>
          {authed && (
            <button
              onClick={() => setShowForm(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Signaler
            </button>
          )}
        </header>

        {/* RGPD notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Vos signalements sont <strong>anonymisés</strong> avant publication et soumis à modération par votre mairie. Ne divulguez aucune donnée personnelle dans la description.
          </p>
        </div>

        {/* Tabs */}
        {authed && (
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            <button
              onClick={() => setTab("quartier")}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                tab === "quartier" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Mon quartier
            </button>
            <button
              onClick={() => setTab("mes")}
              className={`relative flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                tab === "mes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Mes signalements
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Content */}
        {tab === "quartier" ? (
          <QuartierTab signals={approvedSignals} isLoading={loadingApproved} />
        ) : (
          <MesSignalementsTab signals={mySignals} isLoading={loadingMine} />
        )}
      </div>

      {/* Bottom sheet form */}
      {showForm && collectivityId && userId && (
        <SignalForm
          collectivityId={collectivityId}
          userId={userId}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["my-neighborhood-signals", userId] });
            setTab("mes");
          }}
        />
      )}
    </>
  );
}

// ── QuartierTab ────────────────────────────────────────────────────────────────

function QuartierTab({
  signals,
  isLoading,
}: {
  signals: NeighborhoodSignal[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
        <Eye className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-base font-semibold">Quartier calme</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aucun signalement validé dans votre commune.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {signals.length} signalement{signals.length > 1 ? "s" : ""} validé{signals.length > 1 ? "s" : ""}
      </p>
      {signals.map((s) => (
        <SignalCard key={s.id} signal={s} showStatus={false} />
      ))}
    </div>
  );
}

// ── MesSignalementsTab ─────────────────────────────────────────────────────────

function MesSignalementsTab({
  signals,
  isLoading,
}: {
  signals: NeighborhoodSignal[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
        <Eye className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-base font-semibold">Aucun signalement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Vous n'avez pas encore soumis de signalement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {signals.map((s) => (
        <SignalCard key={s.id} signal={s} showStatus />
      ))}
    </div>
  );
}

// ── SignalCard ─────────────────────────────────────────────────────────────────

function SignalCard({
  signal,
  showStatus,
}: {
  signal: NeighborhoodSignal;
  showStatus: boolean;
}) {
  const type = SIGNAL_TYPES[signal.signal_type];
  const status = STATUS_CONFIG[signal.status];
  const StatusIcon = status.icon;
  const TypeIcon = type.icon;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return "Il y a moins d'1h";
    if (h < 24) return `Il y a ${h}h`;
    const d = Math.floor(h / 24);
    return `Il y a ${d}j`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted`}>
            <TypeIcon className={`h-5 w-5 ${type.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{type.label}</span>
              {showStatus && (
                <span className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-foreground leading-snug">{signal.description}</p>
            {signal.address && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {signal.address}
              </p>
            )}
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeAgo(signal.created_at)}
            </p>
            {showStatus && signal.status === "rejected" && signal.moderation_note && (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-medium">Note de modération : </span>
                {signal.moderation_note}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SignalForm (bottom sheet) ──────────────────────────────────────────────────

function SignalForm({
  collectivityId,
  userId,
  onClose,
  onSuccess,
}: {
  collectivityId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<SignalType>("other");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const descRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("neighborhood_signals").insert({
        collectivity_id: collectivityId,
        citizen_id: userId,
        signal_type: type,
        description: description.trim(),
        address: address.trim() || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess,
  });

  const canSubmit = description.trim().length >= 10 && !mutation.isPending;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-border">
          <h2 className="text-base font-semibold">Nouveau signalement</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Type selector */}
          <div>
            <label className="mb-2 block text-sm font-medium">Type de signalement</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(SIGNAL_TYPES) as [SignalType, typeof SIGNAL_TYPES[SignalType]][]).map(
                ([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setType(key)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                        type === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${type === key ? "text-primary" : cfg.color}`} />
                      {cfg.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(min. 10 caractères)</span>
            </label>
            <textarea
              ref={descRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez la situation sans mentionner de données personnelles (noms, plaques partielles autorisées)..."
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{description.length} car.</p>
          </div>

          {/* Address (optional) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Lieu <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex : Rue de la Paix, parking du centre…"
              className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* RGPD reminder */}
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 leading-relaxed">
            🔒 Votre signalement sera soumis à modération avant d'être visible. Ne mentionnez ni noms, ni numéros de téléphone, ni adresses personnelles.
          </p>
        </div>

        {/* Submit */}
        <div className="shrink-0 border-t border-border px-5 py-4">
          {mutation.isError && (
            <p className="mb-2 text-center text-xs text-destructive">
              Une erreur est survenue. Veuillez réessayer.
            </p>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Envoyer le signalement"
            )}
          </button>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </>
  );
}
