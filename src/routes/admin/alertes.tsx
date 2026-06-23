import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Megaphone, Send, Loader2, Clock, ChevronDown,
  AlertTriangle, Info, Zap, Bell, MapPin, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/alertes")({
  head: () => ({ meta: [{ title: "Alertes — VigieCity Admin" }] }),
  component: AdminAlertesPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Alert = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  sent_at: string;
  collectivity_id: string;
};

type FormData = {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  district: string;
  area_label: string;
  expires_at: string;
};

const BLANK: FormData = {
  title: "", body: "", severity: "info",
  district: "", area_label: "", expires_at: "",
};

// ── Severity config ────────────────────────────────────────────────────────────

const SEV_CONFIG = {
  info:     { label: "Information",  icon: Info,          color: "bg-sky-50 border-sky-300 text-sky-700",    badge: "bg-sky-100 text-sky-700"    },
  warning:  { label: "Avertissement",icon: AlertTriangle, color: "bg-amber-50 border-amber-300 text-amber-700", badge: "bg-amber-100 text-amber-700" },
  critical: { label: "Urgence",      icon: Zap,           color: "bg-red-50 border-red-300 text-red-700",    badge: "bg-red-100 text-red-700"    },
} as const;

function SevBadge({ severity }: { severity: string }) {
  const c = SEV_CONFIG[severity as keyof typeof SEV_CONFIG];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${c.badge}`}>
      <Icon className="h-3 w-3" />{c.label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminAlertesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormData>(BLANK);
  const [showHistory, setShowHistory] = useState(false);
  const [lastResult, setLastResult] = useState<{ count: number; total: number } | null>(null);

  // ── Fetch collectivity + districts disponibles ─────────────────────────────

  const { data: meta } = useQuery({
    queryKey: ["admin-alertes-meta"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id, collectivities(name)")
        .eq("id", user.id)
        .single();
      const cid = profile?.collectivity_id as string;
      if (!cid) throw new Error("Collectivité non configurée");

      // Quartiers distincts (citizens de cette commune)
      const { data: districtRows } = await supabase
        .from("profiles")
        .select("district")
        .eq("collectivity_id", cid)
        .not("district", "is", null);

      const districts = [...new Set(
        (districtRows ?? []).map((r) => r.district as string).filter(Boolean)
      )].sort();

      return {
        collectivityId: cid,
        communeName: (profile as any)?.collectivities?.name as string ?? "",
        districts,
      };
    },
  });

  const collectivityId = meta?.collectivityId ?? null;

  // ── Alert history ──────────────────────────────────────────────────────────

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery<Alert[]>({
    queryKey: ["admin-alerts-history", collectivityId],
    enabled: !!collectivityId && showHistory,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_notifications_log")
        .select("id, title, body, severity, sent_at, collectivity_id")
        .eq("collectivity_id", collectivityId!)
        .order("sent_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });

  // ── Send alert via EF send-alert (gere le ciblage geo + batch push) ─────────

  const sendAlert = useMutation({
    mutationFn: async (f: FormData) => {
      if (!collectivityId) throw new Error("Commune non résolue");

      const res = await supabase.functions.invoke("send-alert", {
        body: {
          collectivity_id: collectivityId,
          title:      f.title.trim(),
          message:    f.body.trim(),
          severity:   f.severity,
          district:   f.district || undefined,
          area_label: f.area_label.trim() || undefined,
          expires_at: f.expires_at || undefined,
          url:        "/urgences",
        },
      });

      if (res.error) throw new Error(res.error.message ?? "Erreur serveur");
      const data = res.data as { success?: boolean; error?: string; recipient_count?: number; total_subscribers?: number };
      if (!data?.success) throw new Error(data?.error ?? "Erreur inconnue");
      return { count: data.recipient_count ?? 0, total: data.total_subscribers ?? 0 };
    },
    onSuccess: (result) => {
      setLastResult(result);
      toast.success(`Alerte diffusée — ${result.count} / ${result.total} abonnés notifiés`);
      setForm(BLANK);
      qc.invalidateQueries({ queryKey: ["admin-alerts-history", collectivityId] });
    },
    onError: (e: Error) => toast.error("Erreur : " + e.message),
  });

  const canSend = form.title.trim().length >= 3 && form.body.trim().length >= 5;
  const sevConf = SEV_CONFIG[form.severity];
  const SevIcon = sevConf.icon;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminShell activePath="/admin/alertes">
    <div className="p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Alertes citoyens</h1>
        <p className="mt-1 text-sm text-slate-500">
          Diffusez une notification push à tous les abonnés{meta?.communeName ? ` de ${meta.communeName}` : ""}.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">

        {/* Compose form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <Megaphone className="h-4 w-4 text-emerald-700" />
            </div>
            <h2 className="font-semibold text-slate-900">Nouvelle alerte</h2>
          </div>

          <div className="space-y-4">
            {/* Severity picker */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Type d'alerte</label>
              <div className="grid grid-cols-3 gap-2">
                {(["info", "warning", "critical"] as const).map((s) => {
                  const c = SEV_CONFIG[s];
                  const Icon = c.icon;
                  const active = form.severity === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setForm(f => ({ ...f, severity: s }))}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                        active ? c.color + " ring-2 ring-offset-1 ring-current" : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre <span className="text-slate-400">(max 80 car.)</span></label>
              <input
                type="text"
                maxLength={80}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex : Route nationale fermée ce soir"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-right text-xs text-slate-400">{form.title.length}/80</p>
            </div>

            {/* Body */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
              <textarea
                rows={4}
                maxLength={400}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Détails de l'alerte…"
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-right text-xs text-slate-400">{form.body.length}/400</p>
            </div>

            {/* Geographic targeting */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" />
                Ciblage géographique
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Quartier (optionnel)</label>
                <select
                  value={form.district}
                  onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                >
                  <option value="">Commune entière</option>
                  {(meta?.districts ?? []).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Libellé zone affiché</label>
                <input
                  type="text"
                  maxLength={60}
                  value={form.area_label}
                  onChange={e => setForm(f => ({ ...f, area_label: e.target.value }))}
                  placeholder={form.district ? `Quartier ${form.district}` : "Commune entière"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Expiration (optionnel)</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Last result */}
            {lastResult && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                <Users className="h-4 w-4 shrink-0" />
                Dernière diffusion : <strong>{lastResult.count}</strong> / {lastResult.total} abonnés notifiés
              </div>
            )}

            {/* Send btn */}
            <button
              onClick={() => sendAlert.mutate(form)}
              disabled={!canSend || sendAlert.isPending || !collectivityId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-40"
            >
              {sendAlert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Diffuser l'alerte
            </button>
          </div>
        </div>

        {/* Preview */}
        {/* Preview */}
        <div>
          <h2 className="mb-3 font-semibold text-slate-900">Aperçu notification</h2>
          <div className={`rounded-2xl border p-4 ${sevConf.color}`}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60">
                <SevIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">{form.title || "Titre de l'alerte"}</p>
                <p className="mt-0.5 text-sm opacity-80">{form.body || "Message de l'alerte…"}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Bell className="h-3 w-3 opacity-50" />
              <span className="text-xs opacity-60">VigieCity · {meta?.communeName || "Commune"}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-medium text-slate-700">Comment ça fonctionne ?</p>
            <p className="mt-1">Les citoyens abonnés aux notifications push recevront cette alerte en temps réel sur leur téléphone. L'alerte sera aussi visible dans l'onglet Alertes de l'application.</p>
          </div>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(h => !h)}
            className="mt-6 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> Historique des alertes</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition ${showHistory ? "rotate-180" : ""}`} />
          </button>

          {showHistory && (
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {loadingAlerts ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
              ) : alerts.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Aucune alerte envoyée</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {alerts.map(a => (
                    <li key={a.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <SevBadge severity={a.severity} />
                          <p className="mt-1 font-medium text-slate-800 text-sm">{a.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-2">{a.body}</p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">
                          {new Date(a.sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
    </AdminShell>
  );
}
