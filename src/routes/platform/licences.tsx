import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Loader2, Shield, Euro, TrendingUp, AlertCircle,
  CalendarClock, ChevronDown, ChevronUp, RefreshCw, Pencil,
  CheckCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ActionMenu } from "@/components/ActionMenu";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/licences")({
  head: () => ({ meta: [{ title: "Licences — Platform Admin" }, { name: "robots", content: "noindex" }] }),
  component: PlatformLicencesPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type License = {
  id: string;
  collectivity_id: string;
  commune_name: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  billing_email: string | null;
};

type Invoice = {
  id: string;
  collectivity_id: string;
  amount: number;
  status: string;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  description: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const PLANS = ["trial", "nano", "micro", "local", "urbain", "metropole"] as const;
type PlanKey = typeof PLANS[number];

const PLAN_PRICE: Record<PlanKey, number> = {
  trial: 0, nano: 49, micro: 99, local: 189, urbain: 490, metropole: 0,
};
const PLAN_LABELS: Record<PlanKey, string> = {
  trial: "Trial", nano: "Nano", micro: "Micro", local: "Local", urbain: "Urbain", metropole: "Metropole",
};
const PLAN_PRICE_LABEL: Record<PlanKey, string> = {
  trial: "Gratuit", nano: "49 EUR/mois", micro: "99 EUR/mois",
  local: "189 EUR/mois", urbain: "490 EUR/mois", metropole: "Sur devis",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// ── Main component ────────────────────────────────────────────────────────────
function PlatformLicencesPage() {
  return (
    <PlatformShell activePath="/platform/licences">
      <PlatformLicencesPageContent />
    </PlatformShell>
  );
}

function PlatformLicencesPageContent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<PlanKey>("trial");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      if (!uid) { setIsAdmin(false); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("id")
        .eq("user_id", uid).eq("role", "admin").is("collectivity_id", null);
      setIsAdmin((roles?.length ?? 0) > 0);
    });
  }, []);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["platform_licences_v2"],
    queryFn: async () => {
      // 2 requêtes séparées — join embedded bloque RLS sur commune_licenses
      const [licRes, colRes, invRes] = await Promise.all([
        supabase.from("commune_licenses")
          .select("id, collectivity_id, plan, status, started_at, expires_at, billing_email")
          .order("started_at", { ascending: false }),
        supabase.from("collectivities").select("id, name"),
        supabase.from("invoices")
          .select("id, collectivity_id, amount, status, issued_at, due_at, paid_at, description")
          .order("issued_at", { ascending: false }),
      ]);
      if (licRes.error) throw licRes.error;
      if (colRes.error) throw colRes.error;

      const nameById: Record<string, string> = {};
      for (const c of colRes.data ?? []) nameById[c.id] = c.name;

      const invoicesByCommune: Record<string, Invoice[]> = {};
      for (const inv of invRes.data ?? []) {
        if (!invoicesByCommune[inv.collectivity_id]) invoicesByCommune[inv.collectivity_id] = [];
        invoicesByCommune[inv.collectivity_id].push(inv as Invoice);
      }

      const licenses: License[] = (licRes.data ?? []).map((l) => ({
        ...l,
        commune_name: nameById[l.collectivity_id] ?? l.collectivity_id.slice(0, 8),
      }));

      return { licenses, invoicesByCommune };
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const changePlan = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const { error } = await supabase.from("commune_licenses").update({ plan }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_licences_v2"] });
      setEditingId(null);
      toast.success("Plan mis à jour.");
    },
    onError: () => toast.error("Erreur mise à jour plan."),
  });

  const renew12 = useMutation({
    mutationFn: async ({ id, currentExpiry }: { id: string; currentExpiry: string | null }) => {
      const base = currentExpiry && new Date(currentExpiry) > new Date() ? new Date(currentExpiry) : new Date();
      base.setFullYear(base.getFullYear() + 1);
      const { error } = await supabase.from("commune_licenses")
        .update({ expires_at: base.toISOString(), status: "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_licences_v2"] });
      toast.success("Licence renouvelée +12 mois.");
    },
    onError: () => toast.error("Erreur renouvellement."),
  });

  const markPaid = useMutation({
    mutationFn: async (invId: string) => {
      const { error } = await supabase.from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_licences_v2"] });
      toast.success("Facture marquée payée.");
    },
    onError: () => toast.error("Erreur."),
  });

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const licenses = data?.licenses ?? [];
  const invoicesByCommune = data?.invoicesByCommune ?? {};
  const active = licenses.filter((l) => l.status === "active");
  const mrr = active.reduce((s, l) => s + (PLAN_PRICE[l.plan as PlanKey] ?? 0), 0);
  const arr = mrr * 12;
  const allInvoices = Object.values(invoicesByCommune).flat();
  const pendingInvoices = allInvoices.filter((i) => i.status === "pending").length;
  const expiringSoon = active.filter((l) => {
    if (!l.expires_at) return false;
    const d = daysUntil(l.expires_at);
    return d >= 0 && d < 30;
  }).length;

  // ── Guards ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 px-4 pt-5 pb-10">

      <header>
        <h1 className="text-2xl font-bold">Licences & Finances</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{licenses.length} contrat(s) · {active.length} actifs</p>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 shadow-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] text-muted-foreground">MRR</p>
          </div>
          <p className="text-2xl font-bold text-primary">{mrr} €</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/3 p-3 shadow-card">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] text-muted-foreground">ARR</p>
          </div>
          <p className="text-2xl font-bold">{arr.toLocaleString("fr-FR")} €</p>
        </div>
        <div className={`rounded-2xl border p-3 shadow-card ${pendingInvoices > 0 ? "border-amber-400/40 bg-amber-50/50 dark:bg-amber-900/10" : "border-border bg-card"}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className={`h-3.5 w-3.5 ${pendingInvoices > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            <p className="text-[11px] text-muted-foreground">Factures en attente</p>
          </div>
          <p className={`text-2xl font-bold ${pendingInvoices > 0 ? "text-amber-600" : ""}`}>{pendingInvoices}</p>
        </div>
        <div className={`rounded-2xl border p-3 shadow-card ${expiringSoon > 0 ? "border-red-400/40 bg-red-50/50 dark:bg-red-900/10" : "border-border bg-card"}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle className={`h-3.5 w-3.5 ${expiringSoon > 0 ? "text-red-600" : "text-muted-foreground"}`} />
            <p className="text-[11px] text-muted-foreground">Expirent &lt; 30j</p>
          </div>
          <p className={`text-2xl font-bold ${expiringSoon > 0 ? "text-red-600" : ""}`}>{expiringSoon}</p>
        </div>
      </div>

      {/* License list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : !licenses.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune licence. Allez sur la page Communes pour en activer.
        </div>
      ) : (
        <ul className="space-y-3">
          {licenses.map((l) => {
            const plan = l.plan as PlanKey;
            const price = PLAN_PRICE[plan] ?? 0;
            const isEditing = editingId === l.id;
            const isExpanded = expandedId === l.id;
            const communeInvoices = invoicesByCommune[l.collectivity_id] ?? [];
            const pendingComm = communeInvoices.filter((i) => i.status === "pending");

            const expiresWarning = l.expires_at ? daysUntil(l.expires_at) : null;
            const isExpiringSoon = expiresWarning !== null && expiresWarning >= 0 && expiresWarning < 30;
            const isExpired = expiresWarning !== null && expiresWarning < 0;

            return (
              <li key={l.id} className={`rounded-2xl border bg-card p-4 shadow-card transition-colors ${isExpired ? "border-red-300 dark:border-red-900" : isExpiringSoon ? "border-amber-300 dark:border-amber-800" : "border-border"}`}>
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold leading-tight truncate">{l.commune_name}</p>
                      {isExpired && (
                        <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 text-[10px] font-semibold">
                          Expiré
                        </span>
                      )}
                      {isExpiringSoon && !isExpired && (
                        <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold">
                          {expiresWarning}j restants
                        </span>
                      )}
                    </div>

                    {/* Plan + price */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">
                        {PLAN_LABELS[plan]}
                        {price > 0 && <span className="ml-1 text-[10px] font-normal text-muted-foreground">· {price} €/mois</span>}
                        {plan === "metropole" && <span className="ml-1 text-[10px] font-normal text-muted-foreground">· sur devis</span>}
                        {plan === "trial" && <span className="ml-1 text-[10px] font-normal text-muted-foreground">· gratuit</span>}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${l.status === "active" ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30" : "bg-muted text-muted-foreground"}`}>
                        {l.status}
                      </span>
                    </div>

                    {/* Dates */}
                    <p className="mt-1 text-xs text-muted-foreground">
                      <CalendarClock className="inline h-3 w-3 mr-0.5" />
                      Depuis {fmtDate(l.started_at)}
                      {l.expires_at ? ` · Expire ${fmtDate(l.expires_at)}` : " · Sans expiration"}
                    </p>
                  </div>

                  <ActionMenu actions={[
                    { label: "Changer de plan", icon: Pencil, onClick: () => { setEditingId(isEditing ? null : l.id); setEditPlan(plan); } },
                    { label: "Renouveler +12 mois", icon: RefreshCw, onClick: () => renew12.mutate({ id: l.id, currentExpiry: l.expires_at }) },
                  ]} />
                </div>

                {/* Inline plan selector */}
                {isEditing && (
                  <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Choisir un plan</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PLANS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setEditPlan(p)}
                          className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                            editPlan === p ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {PLAN_LABELS[p]}
                          <span className="ml-1 opacity-60 font-normal">{PLAN_PRICE_LABEL[p]}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingId(null)} className="flex-1 rounded-xl border border-border py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                        Annuler
                      </button>
                      <button
                        onClick={() => changePlan.mutate({ id: l.id, plan: editPlan })}
                        disabled={changePlan.isPending || editPlan === l.plan}
                        className="flex-1 rounded-xl bg-primary py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {changePlan.isPending ? "…" : "Appliquer"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Invoices toggle */}
                {communeInvoices.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : l.id)}
                      className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <span>
                        {communeInvoices.length} facture(s)
                        {pendingComm.length > 0 && (
                          <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-amber-900/30 dark:text-amber-400">
                            {pendingComm.length} en attente
                          </span>
                        )}
                      </span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {isExpanded && (
                      <ul className="mt-2 space-y-1.5">
                        {communeInvoices.map((inv) => (
                          <li key={inv.id} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{inv.description ?? "Abonnement VigieCity"}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {fmtDate(inv.issued_at)}
                                {inv.due_at ? ` · échéance ${fmtDate(inv.due_at)}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-bold">{inv.amount.toLocaleString("fr-FR")} €</span>
                            {inv.status === "paid" ? (
                              <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" /> Payée
                              </span>
                            ) : (
                              <button
                                onClick={() => markPaid.mutate(inv.id)}
                                disabled={markPaid.isPending}
                                className="shrink-0 rounded-lg bg-green-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                              >
                                Marquer payée
                              </button>
                            )}
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
