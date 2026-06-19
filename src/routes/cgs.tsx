import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/cgs")({
  head: () => ({
    meta: [{ title: "Conditions Générales de Service — VigieCity" }],
  }),
  component: CgsPage,
});

function CgsPage() {
  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-primary shrink-0" />
        <div>
          <h1 className="text-2xl font-bold">Conditions Générales de Service</h1>
          <p className="text-sm text-muted-foreground">Communes — Version 1.0 — Juin 2025</p>
        </div>
      </div>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
        <section className="space-y-2">
          <h2 className="text-base font-bold">1. Objet</h2>
          <p>
            Les présentes Conditions Générales de Service (CGS) régissent la relation contractuelle entre
            <strong> VigieCity SAS</strong> (ci-après « le Prestataire ») et la commune ou collectivité territoriale
            souscrivant à la plateforme VigieCity (ci-après « le Client »).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">2. Description du service</h2>
          <p>VigieCity met à disposition du Client une plateforme SaaS comprenant :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Un tableau de bord de modération et gestion des signalements citoyens</li>
            <li>Un système d'alertes push vers les citoyens de la commune</li>
            <li>Un module de publication d'actualités officielles</li>
            <li>Un annuaire des services communaux</li>
            <li>Un accès à l'historique et aux statistiques d'usage</li>
            <li>Les fonctionnalités optionnelles définies au contrat de licence</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">3. Conditions d'abonnement</h2>
          <p>
            L'accès à la plateforme est conditionné à la souscription d'une licence annuelle. Les tarifs en vigueur
            sont disponibles sur demande ou dans votre espace plateforme.
          </p>
          <p>
            La licence est accordée intuitu personae à la commune signataire et ne peut être cédée à un tiers
            sans accord préalable écrit de VigieCity SAS.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">4. Obligations du Client</h2>
          <p>Le Client s'engage à :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Désigner un administrateur responsable du bon usage de la plateforme</li>
            <li>Ne pas utiliser la plateforme à des fins étrangères à sa mission de service public</li>
            <li>Respecter la réglementation relative à la protection des données personnelles (RGPD)</li>
            <li>Informer les citoyens de l'existence du service et de ses finalités</li>
            <li>Ne pas tenter d'accéder aux données d'autres communes</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">5. Obligations du Prestataire</h2>
          <p>VigieCity SAS s'engage à :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Maintenir la disponibilité de la plateforme (SLA 99,5% hors maintenance programmée)</li>
            <li>Assurer la sécurité et la confidentialité des données du Client</li>
            <li>Notifier le Client en cas d'incident affectant ses données dans un délai de 72h</li>
            <li>Fournir un support technique aux administrateurs désignés</li>
            <li>Ne pas accéder aux données de la commune sans autorisation, sauf maintenance nécessaire</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">6. Données personnelles et RGPD</h2>
          <p>
            Dans le cadre du service, VigieCity SAS agit en qualité de <strong>sous-traitant</strong> au sens du
            RGPD, et la commune en qualité de <strong>responsable de traitement</strong> pour les données
            de ses administrés.
          </p>
          <p>
            Un Accord de Traitement des Données (DPA) est disponible sur demande et constitue une annexe
            obligatoire au contrat de licence.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">7. Facturation et paiement</h2>
          <p>
            Les factures sont émises annuellement en début de période. Le paiement est exigible à 30 jours
            à compter de la date d'émission. Tout retard de paiement entraîne l'application de pénalités
            légales et peut conduire à la suspension du service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">8. Durée et résiliation</h2>
          <p>
            Le contrat est conclu pour une durée d'un an, renouvelable tacitement. La résiliation doit
            être notifiée par écrit au moins 3 mois avant l'échéance anniversaire.
          </p>
          <p>
            En cas de manquement grave aux présentes CGS, chaque partie peut résilier le contrat avec un
            préavis de 30 jours par lettre recommandée.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">9. Responsabilité</h2>
          <p>
            La responsabilité de VigieCity SAS est limitée au montant des sommes effectivement versées par
            le Client au titre du contrat en cours. VigieCity SAS ne saurait être tenu responsable des
            dommages indirects, pertes d'exploitation ou préjudices immatériels.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">10. Droit applicable</h2>
          <p>
            Les présentes CGS sont régies par le droit français. En cas de litige, les parties s'engagent
            à rechercher une solution amiable avant tout recours judiciaire. À défaut, le Tribunal de
            Commerce de Paris sera seul compétent.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">11. Contact</h2>
          <p>Pour toute question contractuelle :</p>
          <p className="font-medium">VigieCity SAS — partenariats@vigie.city</p>
        </section>
      </div>
    </div>
  );
}
