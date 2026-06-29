/**
 * Step 5: Confirmation Summary and Results Component
 */

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  type BatchCreationResult,
  formatBatchResult,
  formatTerritoryDisplay,
  formatPaymentType,
  type OnboardingFormData,
} from "@/lib/onboarding-utils";

interface ConfirmationStepProps {
  formData: OnboardingFormData;
  result?: BatchCreationResult | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ConfirmationStep({
  formData,
  result,
  loading = false,
  error,
  onRetry,
}: ConfirmationStepProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Auto-copy EPCI admin email to clipboard if available
  useEffect(() => {
    if (result?.epci_user_id && formData.epciAdminContact.email) {
      // Don't auto-copy, but make it easy to copy
    }
  }, [result?.epci_user_id, formData.epciAdminContact.email]);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }

  const territorySummary = formatTerritoryDisplay(formData.territory);
  const formatted = result ? formatBatchResult(result) : null;

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        <h2 className="mt-4 text-lg font-bold">Création en cours...</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {formData.territory?.type === "epci"
            ? `Création de l'EPCI admin et ${formData.communeAdmins.length} admins communaux...`
            : "Création de la commune et de l'admin..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Erreur lors de la création</h3>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="font-medium text-sm mb-3">Données saisies:</h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Territoire: </span>
              <span className="font-medium">{territorySummary}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Admin: </span>
              <span className="font-medium">{formData.epciAdminContact.email}</span>
            </div>
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Résumé de la création</h2>

        {/* Summary sections */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-xs text-muted-foreground">Territoire</p>
            <p className="mt-0.5 font-medium">{territorySummary}</p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">Admin principal</p>
            <p className="mt-0.5 font-medium">{formData.epciAdminContact.email}</p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">Paiement</p>
            <p className="mt-0.5 font-medium">
              {formatPaymentType(formData.paymentInfo.type)} •{" "}
              {formData.paymentInfo.date?.toLocaleDateString("fr-FR")} •{" "}
              {formData.paymentInfo.validated ? "Validé" : "En attente"}
            </p>
          </div>

          {formData.territory?.type === "commune" && formData.selectedPlan && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="mt-0.5 font-medium capitalize">{formData.selectedPlan}</p>
            </div>
          )}

          {formData.territory?.type === "epci" && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Communes</p>
              <p className="mt-0.5 font-medium">{formData.communeAdmins.length} commune(s)</p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Vérifiez les informations ci-dessus avant de continuer.
        </p>
      </div>
    );
  }

  // Success state
  const hasFailures = result.communes_failed.length > 0;

  return (
    <div className="space-y-4">
      {/* Success banner */}
      {result.communes_created > 0 ? (
        <div
          className={`rounded-lg border-2 p-4 ${
            hasFailures
              ? "border-yellow-300 bg-yellow-50"
              : "border-green-300 bg-green-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <CheckCircle
              className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                hasFailures ? "text-yellow-600" : "text-green-600"
              }`}
            />
            <div>
              <h3
                className={`font-semibold ${
                  hasFailures ? "text-yellow-900" : "text-green-900"
                }`}
              >
                {hasFailures
                  ? `Création partiellement réussie (${result.communes_created}/${
                      result.communes_created + result.communes_failed.length
                    })`
                  : "Création réussie!"}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  hasFailures ? "text-yellow-800" : "text-green-800"
                }`}
              >
                {formatted?.summary}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Échec de la création</h3>
              <p className="mt-1 text-sm text-red-800">Aucune commune n'a pu être créée.</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Résumé des opérations</h4>

        {/* EPCI admin */}
        {result.epci_user_id && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-green-900">Admin EPCI créé</p>
                <p className="text-sm font-mono text-green-700 mt-1">
                  {formData.epciAdminContact.email}
                </p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(formData.epciAdminContact.email)
                }
                className="text-green-600 hover:text-green-700 flex-shrink-0"
              >
                {copiedEmail ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Communes created */}
        {result.communes_created > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-xs font-medium text-green-900">
              Communes créées: {result.communes_created}
            </p>
            {result.details.commune_license_ids.length > 0 && (
              <p className="text-xs text-green-700 mt-1">
                {result.details.commune_license_ids.length} licence(s) activée(s)
              </p>
            )}
          </div>
        )}

        {/* Failures */}
        {result.communes_failed.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium text-red-900">
              Communes non créées: {result.communes_failed.length}
            </p>
            <ul className="mt-2 space-y-1">
              {result.communes_failed.map((fail, i) => (
                <li key={i} className="text-xs text-red-700">
                  <span className="font-medium">{fail.commune_name}</span>:{" "}
                  {fail.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Details */}
      <details className="text-xs">
        <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
          Détails techniques
        </summary>
        <div className="mt-2 space-y-1 rounded-lg border border-border bg-card p-2 font-mono text-[10px]">
          <div>
            <span className="text-muted-foreground">Timestamp: </span>
            <span>{result.timestamp}</span>
          </div>
          {result.details.epci_license_id && (
            <div>
              <span className="text-muted-foreground">License EPCI: </span>
              <span>{result.details.epci_license_id}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Profiles: </span>
            <span>{result.details.admin_profile_ids.length}</span>
          </div>
        </div>
      </details>

      {/* Next steps */}
      {result.communes_created > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-900">Prochaines étapes:</p>
          <ul className="mt-2 space-y-1 text-xs text-blue-800">
            <li>✓ Admins créés et invitations envoyées par email</li>
            <li>✓ Licences activées pour {result.communes_created} commune(s)</li>
            <li>→ Les admins peuvent accéder à la plateforme</li>
            {!result.communes_failed || result.communes_failed.length === 0 ? (
              <li>→ Valider le paiement dans le back-office</li>
            ) : (
              <li>→ Créer manuellement les communes en erreur</li>
            )}
          </ul>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Créé à {new Date(result.timestamp).toLocaleString("fr-FR")}
      </div>
    </div>
  );
}
