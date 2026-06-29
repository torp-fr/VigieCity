import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CreditCard, CheckCircle2, Clock, XCircle, AlertTriangle,
  Plus, RefreshCw, Ban, Loader2, ChevronDown, Euro, Users,
  Building2, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/abonnements")({
  component: AbonnementsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type LicenseStatus = "active" | "trial" | "expired" | "suspended";
type PlanId = "nano" | "micro" | "local" | "urbain" | "metropole";
type PaymentMethod = "virement" | "chorus_pro" | "trial" | "gratuit";
type ActionType = "activate" | "extend" | "suspend" | "trial";

interface License {
  id: string;
  collectivity_id: string;
  commune_name: string;
  plan_id: PlanId | null;
  status: LicenseStatus;
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  payment_method: PaymentMethod | null;
  chorus_pro_ref: string | null;
  invoice_number: string | null;
  amount_eur: number | null;
  duration_months: number | null;
  billing_email: string | null;
  contact_name: string | null;
  notes: string | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  nano:      "Nano",
  micro:     "Micro",
  local:     "Local",
  urbain:    "Urbain",
  metropole: "Metropole",
};

const PLAN_PRICES_MONTHLY: Record<string, number> = {
  nano: 49, micro: 99, local: 189, urbain: 490, metropole: 0,
};

const STATUS_CONFIG: Record<LicenseStatus, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: "Actif",     color: "bg-green-100 text-green-800",   icon: CheckCircle2 },
  trial:     { label: "Essai",     color: "bg-blue-100 text-blue-800",     icon: Clock },
  expired:   { label: "Expiré",   color: "bg-red-100 text-red-800",       icon: XCircle },
  suspended: { label: "Suspendu", color: "bg-amber-100 text-amber-800",   icon: Ban },
};

function StatusBadge({ status }: { status: LicenseStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.suspended;
  const Icon = cfg.icon;
  return (
    <span className={\`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold \${cfg.color}\`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

// ─── Modal action licence ─────────────────────────────────────────────────────
interface ActionModalProps {
  license: License | null;
  onClose: () => void;
  onDone: () => void;
}

function ActionModal({ license, onClose, onDone }: ActionModalProps) {
  const [action, setAction]             = useState<ActionType>("activate");
  const [planId, setPlanId]             = useState<string>(license?.plan_id ?? "nano");
  const [durationMonths, setDuration]   = useState(12);
  const [paymentMethod, setPayMethod]   = useState<PaymentMethod>("virement");
  const [chorusRef, setChorusRef]       = useState("");
  const [invoiceNumber, setInvoiceNum]  = useState("");
  const [invoiceDate, setInvoiceDate]   = useState("");
  const [amountEur, setAmountEur]       = useState<number | "">("");
  const [billingEmail, setBillingEmail] = useState(license?.billing_email ?? "");
  const [contactName, setContactName]   = useState(license?.contact_name ?? "");
  const [notes, setNotes]               = useState("");
  const [loading, setLoading]           = useState(false);

  if (!license) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        \`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-license\`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: \`Bearer \${session?.access_token}\`,
          },
          body: JSON.stringify({
            action,
            collectivity_id:  license.collectivity_id,
            plan_id:          planId,
            duration_months:  durationMonths,
            payment_method:   paymentMethod,
            chorus_pro_ref:   chorusRef || undefined,
            invoice_number:   invoiceNumber || undefined,
            invoice_date:     invoiceDate || undefined,
            amount_eur:       amountEur !== "" ? Number(amountEur) : undefined,
            billing_email:    billingEmail || undefined,
            contact_name:     contactName || undefined,
            notes:            notes || undefined,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur EF");
      toast.success("Licence mise a jour");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const actionLabels: Record<ActionType, string> = {
    activate: "Activer",
    extend:   "Prolonger",
    suspend:  "Suspendre",
    trial:    "Essai 30j",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-bold text-lg">Gerer la licence</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6 max-h-[70vh] overflow-y-auto">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Commune</p>
            <p className="font-semibold">{license.commune_name}</p>
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <div className="flex gap-2 flex-wrap">
              {(["activate", "extend", "trial", "suspend"] as ActionType[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={\`rounded-lg px-3 py-1.5 text-sm font-medium border transition \${
                    action === a
                      ? "bg-primary text-white border-primary"
                      : "border-border hover:border-primary"
                  }\`}
                >
                  {actionLabels[a]}
                </button>
              ))}
            </div>
          </div>

          {action !== "suspend" && (
            <>
              {/* Plan */}
              <div>
                <label className="block text-sm font-medium mb-1">Plan</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(PLAN_LABELS).map(([id, name]) => (
                    <option key={id} value={id}>{name} — {PLAN_PRICES_MONTHLY[id] ? PLAN_PRICES_MONTHLY[id] + " euros/mois" : "Sur devis"}</option>
                  ))}
                </select>
              </div>

              {action !== "trial" && (
                <>
                  {/* Duree */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Duree (mois)</label>
                    <select
                      value={durationMonths}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      {[1, 3, 6, 12, 24, 36].map((m) => (
                        <option key={m} value={m}>{m} mois{m === 12 ? " (annuel)" : m === 24 ? " (2 ans)" : m === 36 ? " (3 ans)" : ""}</option>
                      ))}
                    </select>
                  </div>

                  {/* Paiement */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Mode de paiement</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="virement">Virement bancaire</option>
                      <option value="chorus_pro">Chorus Pro</option>
                      <option value="gratuit">Gratuit</option>
                    </select>
                  </div>

                  {paymentMethod === "chorus_pro" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Reference Chorus Pro (EJ)</label>
                      <input
                        value={chorusRef}
                        onChange={(e) => setChorusRef(e.target.value)}
                        placeholder="EJ-2026-XXXXX"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">N degrees facture</label>
                      <input
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNum(e.target.value)}
                        placeholder="VC-2026-001"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date facture</label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Montant (euros HT)</label>
                    <input
                      type="number"
                      value={amountEur}
                      onChange={(e) => setAmountEur(e.target.value ? Number(e.target.value) : "")}
                      placeholder={planId !== "metropole" ? String(PLAN_PRICES_MONTHLY[planId] * durationMonths) : "Sur devis"}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Calcule auto : {planId !== "metropole" ? PLAN_PRICES_MONTHLY[planId] + " x " + durationMonths + "m = " + (PLAN_PRICES_MONTHLY[planId] * durationMonths) + " euros" : "Sur devis"}
                    </p>
                  </div>
                </>
              )}

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Email facturation</label>
                  <input
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="mairie@ville.fr"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact</label>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="M. le Maire"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes internes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Contexte, accord verbal, etc."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {actionLabels[action]}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
function AbonnementsPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilter] = useState<string>("all");
  const [selectedLicense, setSelected] = useState<License | null>(null);

  // Charger toutes les licences avec commune_name
  const { data: licenses, isLoading } = useQuery<License[]>({
    queryKey: ["platform-abonnements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commune_licenses")
        .select(\`
          *,
          collectivities (name)
        \`)
        .order("expires_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        commune_name: (row.collectivities as { name: string } | null)?.name ?? "Inconnue",
      })) as License[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const filtered = (licenses ?? []).filter(
    (l) => filterStatus === "all" || l.status === filterStatus
  );

  // KPIs
  const activeCount   = (licenses ?? []).filter((l) => l.status === "active").length;
  const trialCount    = (licenses ?? []).filter((l) => l.status === "trial").length;
  const expiredCount  = (licenses ?? []).filter((l) => l.status === "expired").length;
  const mrrEstimate   = (licenses ?? [])
    .filter((l) => l.status === "active" && l.plan_id && l.plan_id !== "metropole")
    .reduce((sum, l) => sum + (PLAN_PRICES_MONTHLY[l.plan_id!] ?? 0), 0);

  return (
    <PlatformShell activePath="/platform/abonnements">
      {selectedLicense && (
        <ActionModal
          license={selectedLicense}
          onClose={() => setSelected(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["platform-abonnements"] });
            setSelected(null);
          }}
        />
      )}

      <div className="space-y-6">
        {/* En-tete */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Abonnements</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestion des licences communes — Chorus Pro / virement
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Actifs",   value: activeCount,   icon: CheckCircle2, color: "text-green-600" },
            { label: "Essai",    value: trialCount,    icon: Clock,        color: "text-blue-600"  },
            { label: "Expires",  value: expiredCount,  icon: XCircle,      color: "text-red-600"   },
            { label: "MRR est.", value: \`\${mrrEstimate} euros\`, icon: Euro, color: "text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">{label}</div>
              <div className={\`mt-1 text-2xl font-bold \${color}\`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all",       label: "Tout" },
            { value: "active",    label: "Actifs" },
            { value: "trial",     label: "Essai" },
            { value: "expired",   label: "Expires" },
            { value: "suspended", label: "Suspendus" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={\`rounded-full px-3 py-1 text-sm font-medium border transition \${
                filterStatus === value
                  ? "bg-primary text-white border-primary"
                  : "border-border hover:border-primary text-muted-foreground"
              }\`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            {filterStatus === "all" ? "Aucune commune avec licence." : \`Aucune commune \${filterStatus}.\`}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Commune</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Plan</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Statut</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Expiration</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Paiement</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lic, idx) => {
                  const days = daysUntil(lic.expires_at);
                  const isExpiringSoon = days !== null && days >= 0 && days <= 30;
                  return (
                    <tr
                      key={lic.id}
                      className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{lic.commune_name}</div>
                        {lic.billing_email && (
                          <div className="text-xs text-muted-foreground">{lic.billing_email}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium">
                          {lic.plan_id ? PLAN_LABELS[lic.plan_id] ?? lic.plan_id : "—"}
                        </span>
                        {lic.plan_id && lic.plan_id !== "metropole" && (
                          <div className="text-xs text-muted-foreground">
                            {PLAN_PRICES_MONTHLY[lic.plan_id]} euros/mois
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={lic.status} />
                      </td>
                      <td className="px-3 py-3">
                        <span className={isExpiringSoon ? "font-semibold text-amber-600" : ""}>
                          {formatDate(lic.expires_at)}
                        </span>
                        {days !== null && days >= 0 && (
                          <div className={\`text-xs \${isExpiringSoon ? "text-amber-600 font-medium" : "text-muted-foreground"}\`}>
                            {days === 0 ? "Expire auj." : \`J-\${days}\`}
                          </div>
                        )}
                        {days !== null && days < 0 && (
                          <div className="text-xs text-red-500 font-medium">Expire il y a {Math.abs(days)}j</div>
                        )}
                      </td>
                      <td className="px-3 py-3 capitalize text-muted-foreground text-xs">
                        {lic.payment_method ?? "—"}
                        {lic.chorus_pro_ref && (
                          <div className="font-mono">{lic.chorus_pro_ref}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => setSelected(lic)}
                          className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-primary hover:text-white hover:border-primary transition"
                        >
                          Gerer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
