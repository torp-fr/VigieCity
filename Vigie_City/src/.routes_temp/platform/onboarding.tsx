/**
 * Platform Onboarding Flow - 5 Steps
 * Supports both single-commune and EPCI multi-commune paths
 *
 * Step 1: Territory Selection (Commune vs EPCI)
 * Step 2: Admin Principal Contact (email, name, password)
 * Step 3: Configuration (Plan for commune OR Admin table for EPCI)
 * Step 4: Payment Details (date, type, validation)
 * Step 5: Confirmation & Results
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  MapPin, User, Building2, CreditCard, CheckCircle,
  ChevronRight, ChevronLeft, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformShell } from "@/components/PlatformShell";
import { TerritorySelector } from "@/components/onboarding/TerritorySelector";
import { AdminContactForm } from "@/components/onboarding/AdminContactForm";
import { PlanSelector } from "@/components/onboarding/PlanSelector";
import { CommuneAdminTable } from "@/components/onboarding/CommuneAdminTable";
import { PaymentDetails } from "@/components/onboarding/PaymentDetails";
import { ConfirmationStep } from "@/components/onboarding/ConfirmationStep";
import {
  initializeFormData,
  validateStep1Territory,
  validateStep2Admin,
  validateStep3CommePlan,
  validateStep3CommuneAdmins,
  validatePaymentInfo,
  formatTerritoryDisplay,
  type OnboardingFormData,
  type BatchCreationResult,
} from "@/lib/onboarding-utils";

export const Route = createFileRoute("/platform/onboarding")({
  component: PlatformOnboardingPage,
});

type Step = 1 | 2 | 3 | 4 | 5;

function PlatformOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<OnboardingFormData>(initializeFormData());
  const [result, setResult] = useState<BatchCreationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step validation ────────────────────────────────────────────────────────
  function canProceedToStep2(): boolean {
    const validation = validateStep1Territory(formData.territory);
    return validation.isValid;
  }

  function canProceedToStep3(): boolean {
    const adminValidation = validateStep2Admin(formData.epciAdminContact);
    return adminValidation.isValid;
  }

  function canProceedToStep4(): boolean {
    if (formData.territory?.type === "commune") {
      const planValidation = validateStep3CommePlan(formData.selectedPlan);
      return planValidation.isValid;
    } else {
      const adminValidation = validateStep3CommuneAdmins(formData.communeAdmins);
      return adminValidation.isValid;
    }
  }

  function canProceedToStep5(): boolean {
    const paymentValidation = validatePaymentInfo(formData.paymentInfo);
    return paymentValidation.isValid;
  }

  // ── Step navigation ───────────────────────────────────────────────────────
  function goToStep(nextStep: Step) {
    if (nextStep === step) return;

    if (nextStep > step) {
      // Moving forward: validate current step
      if (step === 1 && !canProceedToStep2()) {
        toast.error("Veuillez sélectionner un territoire");
        return;
      }
      if (step === 2 && !canProceedToStep3()) {
        toast.error("Veuillez remplir correctement les informations de l'admin");
        return;
      }
      if (step === 3 && !canProceedToStep4()) {
        if (formData.territory?.type === "commune") {
          toast.error("Veuillez sélectionner un plan");
        } else {
          toast.error("Veuillez configurer au moins une commune");
        }
        return;
      }
      if (step === 4 && !canProceedToStep5()) {
        toast.error("Veuillez remplir les informations de paiement");
        return;
      }
    }

    setStep(nextStep);
    setError(null);
  }

  // ── Batch creation (Commune path) ─────────────────────────────────────────
  async function createSingleCommune() {
    if (!formData.territory || formData.territory.type !== "commune") {
      toast.error("Territoire invalide");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the simple create-commune EF for single commune
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "create-commune",
        {
          body: {
            collectivityId: formData.territory.communeId,
            adminEmail: formData.epciAdminContact.email,
            adminName: formData.epciAdminContact.name || formData.epciAdminContact.email.split("@")[0],
            adminPassword: formData.epciAdminContact.password,
            // Payment info for commune
            payment_date: formData.paymentInfo.date?.toISOString().split("T")[0],
            payment_type: formData.paymentInfo.type,
            payment_validated: formData.paymentInfo.validated,
          },
        },
      );

      if (fnErr) {
        throw new Error(fnErr.message);
      }

      if (fnData?.error) {
        throw new Error(fnData.error);
      }

      // Simulate batch result for UI consistency
      const simResult: BatchCreationResult = {
        success: true,
        communes_created: 1,
        communes_failed: [],
        details: {
          commune_license_ids: [fnData?.license_id || ""],
          admin_profile_ids: [fnData?.user_id || ""],
        },
        timestamp: new Date().toISOString(),
      };

      setResult(simResult);
      setStep(5);
      toast.success("Commune créée avec succès!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Batch creation (EPCI path) ────────────────────────────────────────────
  async function createEPCIBatch() {
    if (!formData.territory || formData.territory.type !== "epci") {
      toast.error("Territoire invalide");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call create-commune-batch EF
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "create-commune-batch",
        {
          body: {
            epci_id: formData.territory.epciId,
            admin_email: formData.epciAdminContact.email,
            admin_name: formData.epciAdminContact.name,
            admin_password: formData.epciAdminContact.password,
            communes: formData.communeAdmins.map((ca) => ({
              commune_name: ca.communeName,
              insee_code: ca.inseeCode,
              admin_email: ca.email,
              admin_name: ca.name,
              admin_phone: ca.phone,
            })),
            payment_date: formData.paymentInfo.date?.toISOString().split("T")[0],
            payment_type: formData.paymentInfo.type,
            payment_validated: formData.paymentInfo.validated,
          },
        },
      );

      if (fnErr) {
        throw new Error(fnErr.message);
      }

      if (fnData?.error) {
        throw new Error(fnData.error);
      }

      setResult(fnData);
      setStep(5);
      toast.success(`${fnData.communes_created} commune(s) créée(s)!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Handle submit from step 4 ─────────────────────────────────────────────
  async function handleSubmit() {
    if (!canProceedToStep5()) {
      toast.error("Veuillez remplir les informations de paiement");
      return;
    }

    if (formData.territory?.type === "commune") {
      await createSingleCommune();
    } else {
      await createEPCIBatch();
    }
  }

  // ── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setStep(1);
    setFormData(initializeFormData());
    setResult(null);
    setError(null);
  };

  const steps = [
    { num: 1, label: "Territoire", icon: MapPin },
    { num: 2, label: "Admin", icon: User },
    { num: 3, label: "Configuration", icon: Building2 },
    { num: 4, label: "Paiement", icon: CreditCard },
    { num: 5, label: "Confirmation", icon: CheckCircle },
  ];

  return (
    <PlatformShell activePath="/platform/onboarding">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Onboarding collectivité</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Créer une ou plusieurs communes en 5 étapes
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {steps.map(({ num, label, icon: Icon }, i) => (
            <div key={num} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center">
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                    step > num
                      ? "border-blue-600 bg-blue-600 text-white"
                      : step === num
                        ? "border-blue-600 bg-white text-blue-600"
                        : "border-border bg-white text-muted-foreground",
                  ].join(" ")}
                >
                  {step > num ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <p
                  className={`mt-1 text-xs font-medium ${
                    step === num ? "text-blue-600" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`-mt-5 mx-1 h-0.5 flex-1 ${
                    step > num + 1 ? "bg-blue-600" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content by step */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          {/* Step 1: Territory Selection */}
          {step === 1 && (
            <>
              <TerritorySelector
                value={formData.territory}
                onChange={(territory) =>
                  setFormData({ ...formData, territory, communeAdmins: [] })
                }
              />
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => goToStep(2)}
                  disabled={!canProceedToStep2()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Step 2: Admin Contact */}
          {step === 2 && (
            <>
              <AdminContactForm
                value={formData.epciAdminContact}
                onChange={(admin) => setFormData({ ...formData, epciAdminContact: admin })}
                title={
                  formData.territory?.type === "epci"
                    ? "Admin EPCI - Compte principal"
                    : "Admin Commune"
                }
                subtitle={
                  formData.territory?.type === "epci"
                    ? "Cet administrateur gérera tous les admins communaux"
                    : `Pour ${formatTerritoryDisplay(formData.territory)}`
                }
              />
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => goToStep(1)}
                  className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>
                <button
                  onClick={() => goToStep(3)}
                  disabled={!canProceedToStep3()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Step 3: Configuration (Plan or Commune Admins) */}
          {step === 3 && (
            <>
              {formData.territory?.type === "commune" ? (
                <PlanSelector
                  value={formData.selectedPlan}
                  onChange={(plan) =>
                    setFormData({ ...formData, selectedPlan: plan as any })
                  }
                />
              ) : (
                <CommuneAdminTable
                  epciId={formData.territory?.epciId || ""}
                  value={formData.communeAdmins}
                  onChange={(admins) =>
                    setFormData({ ...formData, communeAdmins: admins })
                  }
                />
              )}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => goToStep(2)}
                  className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>
                <button
                  onClick={() => goToStep(4)}
                  disabled={!canProceedToStep4()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Step 4: Payment Details */}
          {step === 4 && (
            <>
              <PaymentDetails
                value={formData.paymentInfo}
                onChange={(payment) =>
                  setFormData({ ...formData, paymentInfo: payment })
                }
                communeName={
                  formData.territory?.type === "commune"
                    ? formData.territory.communeName
                    : formData.territory?.epciName
                }
              />
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => goToStep(3)}
                  className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>
                <button
                  onClick={() => goToStep(5)}
                  disabled={!canProceedToStep5()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Vérifier <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <>
              {!result ? (
                <>
                  <ConfirmationStep
                    formData={formData}
                    result={undefined}
                    loading={loading}
                    error={error}
                  />
                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => goToStep(4)}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" /> Retour
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Création en cours…
                        </>
                      ) : (
                        <>
                          Valider & créer <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <ConfirmationStep
                    formData={formData}
                    result={result}
                    loading={loading}
                    error={error}
                  />
                  <div className="flex justify-center gap-3 pt-4">
                    <button
                      onClick={resetForm}
                      className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
                    >
                      Nouvelle création
                    </button>
                    <button
                      onClick={() => navigate({ to: "/platform/collectivites" })}
                      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Voir les communes
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </PlatformShell>
  );
}
