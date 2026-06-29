/**
 * Step 3 (Commune path): Plan Selector Component
 * Radio selection of available plans: Hameau, Village, Bourg, Métropole
 */

import { CreditCard, CheckCircle } from "lucide-react";
import { PLAN_INFO, type OnboardingFormData } from "@/lib/onboarding-utils";

interface PlanSelectorProps {
  value: string | undefined;
  onChange: (plan: string) => void;
  disabled?: boolean;
}

export function PlanSelector({ value, onChange, disabled }: PlanSelectorProps) {
  const plans = Object.entries(PLAN_INFO);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold mb-1">
          <CreditCard className="h-4 w-4 text-blue-600" />
          Plan de la commune
        </h3>
        <p className="text-sm text-muted-foreground">
          Sélectionnez le plan adapté à la taille de la commune
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plans.map(([key, info]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            disabled={disabled}
            className={`rounded-xl border-2 p-4 text-left transition-all disabled:opacity-50 ${
              value === key
                ? "border-blue-600 bg-blue-50"
                : `${info.color} hover:opacity-80 cursor-pointer`
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold">{info.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{info.description}</p>
                <p className="mt-1.5 text-xs font-medium text-blue-600">{info.priceRange}</p>
              </div>
              {value === key && <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />}
            </div>
          </button>
        ))}
      </div>

      {value && (
        <div className="rounded-lg bg-green-50 p-3 border border-green-200">
          <p className="text-xs font-medium text-green-700">
            Plan sélectionné: <span className="font-semibold">{PLAN_INFO[value]?.label}</span>
          </p>
        </div>
      )}
    </div>
  );
}
