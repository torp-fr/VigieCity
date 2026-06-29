/**
 * Step 4: Payment Details Component
 * Date, type (Chorus Pro, Virement, Devis), and validation checkbox
 */

import { CreditCard, Info } from "lucide-react";
import { type PaymentInfo, formatPaymentType } from "@/lib/onboarding-utils";

interface PaymentDetailsProps {
  value: PaymentInfo;
  onChange: (payment: PaymentInfo) => void;
  communeName?: string;
  disabled?: boolean;
}

const PAYMENT_TYPES = [
  {
    value: "chorus_pro",
    label: "Chorus Pro",
    description: "Paiement via plateforme Chorus Pro (secteur public)",
  },
  {
    value: "transfer",
    label: "Virement",
    description: "Virement bancaire",
  },
  {
    value: "quote_pending",
    label: "Devis en attente",
    description: "Paiement en attente de signature du devis",
  },
] as const;

export function PaymentDetails({
  value,
  onChange,
  communeName,
  disabled,
}: PaymentDetailsProps) {
  function updateField<K extends keyof PaymentInfo>(key: K, val: PaymentInfo[K]) {
    onChange({ ...value, [key]: val });
  }

  const dateStr = value.date
    ? value.date.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold mb-1">
          <CreditCard className="h-4 w-4 text-blue-600" />
          Modalités de paiement
        </h3>
        {communeName && (
          <p className="text-sm text-muted-foreground">
            Abonnement pour <span className="font-semibold">{communeName}</span>
          </p>
        )}
      </div>

      <div className="space-y-4">
        {/* Payment date */}
        <div>
          <label htmlFor="payment-date" className="mb-1 block text-xs font-medium text-muted-foreground">
            Date du paiement *
          </label>
          <input
            id="payment-date"
            type="date"
            value={dateStr}
            onChange={(e) => updateField("date", new Date(e.target.value))}
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            La date par défaut est aujourd'hui
          </p>
        </div>

        {/* Payment type */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Mode de paiement *
          </label>
          <div className="space-y-2">
            {PAYMENT_TYPES.map(({ value: val, label, description }) => (
              <button
                key={val}
                onClick={() => updateField("type", val)}
                disabled={disabled}
                className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                  value.type === val
                    ? "border-blue-600 bg-blue-50"
                    : "border-border hover:bg-muted disabled:opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-current">
                    {value.type === val && <div className="h-2.5 w-2.5 rounded-full bg-current" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment validated checkbox */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value.validated}
              onChange={(e) => updateField("validated", e.target.checked)}
              disabled={disabled}
              className="mt-1 h-4 w-4 rounded border-border disabled:opacity-50"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Paiement validé</p>
              <p className="text-xs text-muted-foreground">
                Cocher si le paiement a été confirmé par le client
              </p>
            </div>
          </label>
        </div>

        {/* Payment summary */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Mode: </span>
                <span className="font-medium">{formatPaymentType(value.type)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span className="font-medium">
                  {value.date?.toLocaleDateString("fr-FR") || "Non défini"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Statut: </span>
                <span
                  className={`font-medium ${
                    value.validated ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {value.validated ? "Validé" : "En attente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
