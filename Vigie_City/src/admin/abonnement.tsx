import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2, Clock, XCircle, Ban, AlertTriangle,
  CreditCard, Mail, Phone, User, Calendar, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/hooks/useAppAuth";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/abonnement")({
  component: AbonnementPage,
});

const STATUS_CONFIG = {
  active:    { label: "Actif",     color: "border-green-300 bg-green-50",  textColor: "text-green-800",  icon: CheckCircle2 },
  trial:     { label: "Essai",     color: "border-blue-300 bg-blue-50",    textColor: "text-blue-800",   icon: Clock },
  expired:   { label: "Expire",    color: "border-red-300 bg-red-50",      textColor: "text-red-800",    icon: XCircle },
  suspended: { label: "Suspendu",  color: "border-amber-300 bg-amber-50",  textColor: "text-amber-800",  icon: Ban },
};

const PLAN_LABELS: Record<string, { name: string; price: string; description: string }> = {
  nano:      { name: "Nano",      price: "49 euros/mois",    description: "Jusqu\'a 1 000 habitants" },
  micro:     { name: "Micro",     price: "99 euros/mois",    description: "1 000 - 2 500 habitants" },
  local:     { name: "Local",     price: "189 euros/mois",   description: "2 500 - 10 000 habitants" },
  urbain:    { name: "Urbain",    price: "490 euros/mois",   description: "10 000 - 50 000 habitants" },
  metropole: { name: "Metropole", price: "Sur devis",        description: "Plus de 50 000 habitants" },
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function AbonnementPage() {
  const { collectivityId } = useAppAuth();

  const { data: license, isLoading } = useQuery({
    queryKey: ["admin-abonnement", collectivityId],
    queryFn: async () => {
      if (!collectivityId) return null;
      const { data, error } = await supabase
        .from("commune_licenses")
        .select("*")
        .eq("collectivity_id", collectivityId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data ?? null;
    },
    enabled: !!collectivityId,
    staleTime: 5 * 60_000,
  });

  const status = (license?.status ?? "suspended") as keyof typeof STATUS_CONFIG;
  const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.suspended;
  const Icon   = cfg.icon;
  const plan   = license?.plan_id ? PLAN_LABELS[license.plan_id] : null;
  const days   = daysUntil(license?.expires_at ?? null);

  return (
    <AdminShell activePath="/admin/abonnement">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mon abonnement</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Statut de votre licence VigieCity
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !license ? (
          /* Pas encore de licence */
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h2 className="font-bold text-lg">Aucun abonnement</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Votre commune n'a pas encore de licence VigieCity.
            </p>
            <a
              href="mailto:commercial@vigiecity.fr"
              className="mt-4 inline-block rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Demander un essai gratuit
            </a>
          </div>
        ) : (
          <>
            {/* Statut principal */}
            <div className={\`rounded-2xl border-2 \${cfg.color} p-6\`}>
              <div className="flex items-center gap-3">
                <Icon className={\`h-8 w-8 \${cfg.textColor}\`} />
                <div>
                  <p className={\`text-lg font-bold \${cfg.textColor}\`}>{cfg.label}</p>
                  {license.expires_at && (
                    <p className={\`text-sm \${cfg.textColor} opacity-80\`}>
                      {days !== null && days >= 0
                        ? \`Expire dans \${days} jour\${days > 1 ? "s" : ""} — \${new Date(license.expires_at).toLocaleDateString("fr-FR")}\`
                        : \`Expire le \${new Date(license.expires_at).toLocaleDateString("fr-FR")}\`}
                    </p>
                  )}
                </div>
              </div>

              {/* Alerte expiration proche */}
              {days !== null && days >= 0 && days <= 30 && status === "active" && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Votre licence expire dans {days} jour{days > 1 ? "s" : ""}. Contactez-nous pour le renouvellement.
                  </span>
                </div>
              )}

              {status === "trial" && license.trial_ends_at && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-100 p-3 text-sm text-blue-800">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Periode d'essai jusqu'au {new Date(license.trial_ends_at).toLocaleDateString("fr-FR")}.
                    Contactez-nous pour activer votre abonnement.
                  </span>
                </div>
              )}
            </div>

            {/* Details du plan */}
            {plan && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-4">Plan souscrit</h2>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <p className="mt-1 text-base font-semibold text-primary">{plan.price}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  {license.started_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Debut : {new Date(license.started_at).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                  {license.expires_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Expiration : {new Date(license.expires_at).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                  {license.payment_method && (
                    <div className="flex items-center gap-2 text-muted-foreground capitalize">
                      <CreditCard className="h-4 w-4" />
                      {license.payment_method.replace("_", " ")}
                    </div>
                  )}
                  {license.duration_months && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Duree : {license.duration_months} mois
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact pour renouvellement */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-4">Renouvellement et facturation</h2>
              <p className="text-sm text-muted-foreground mb-4">
                VigieCity facture par virement bancaire ou Chorus Pro. Pour renouveler votre
                abonnement, prolonger votre licence ou modifier votre plan, contactez notre equipe.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="mailto:commercial@vigiecity.fr"
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-muted transition text-sm"
                >
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">commercial@vigiecity.fr</p>
                    <p className="text-xs text-muted-foreground">Pour les demandes de renouvellement</p>
                  </div>
                </a>
                <a
                  href="mailto:facturation@vigiecity.fr"
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-muted transition text-sm"
                >
                  <CreditCard className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">facturation@vigiecity.fr</p>
                    <p className="text-xs text-muted-foreground">Chorus Pro, factures, justificatifs</p>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
