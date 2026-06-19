import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [{ title: "Conditions Générales d'Utilisation — VigieCity" }],
  }),
  component: CguPage,
});

function CguPage() {
  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary shrink-0" />
        <div>
          <h1 className="text-2xl font-bold">Conditions Générales d'Utilisation</h1>
          <p className="text-sm text-muted-foreground">Citoyens — Version 1.0 — Juin 2025</p>
        </div>
      </div>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
        <section className="space-y-2">
          <h2 className="text-base font-bold">1. Objet et acceptation</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de l'application VigieCity,
            plateforme de sécurité et de communication citoyenne éditée par VigieCity SAS.
          </p>
          <p>
            L'accès et l'utilisation de l'application impliquent l'acceptation pleine et entière des présentes CGU.
            Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">2. Fonctionnalités de l'application</h2>
          <p>VigieCity permet aux citoyens de :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Signaler des incidents ou incivilités sur leur commune</li>
            <li>Consulter les alertes émises par leur mairie</li>
            <li>Accéder aux informations et publications locales</li>
            <li>Participer au réseau Voisins Vigilants</li>
            <li>Alerter les services d'urgence via le bouton SOS (en cas de danger immédiat uniquement)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">3. Conditions d'accès</h2>
          <p>L'utilisation de VigieCity est réservée aux personnes majeures (18 ans ou plus) résidant dans une commune partenaire.</p>
          <p>
            Lors de votre inscription, vous vous engagez à fournir des informations exactes et à maintenir la
            confidentialité de vos identifiants de connexion.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">4. Signalements — Règles d'utilisation</h2>
          <p>Les signalements doivent correspondre à des faits réels et observables. Il est strictement interdit de :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Faire de faux signalements ou d'abuser du bouton SOS</li>
            <li>Signaler des personnes sur la base de critères discriminatoires</li>
            <li>Publier des contenus injurieux, diffamatoires ou illicites</li>
            <li>Identifier ou cibler nominativement des individus</li>
          </ul>
          <p>
            Tout abus pourra entraîner la suspension ou la suppression du compte, et le cas échéant des poursuites judiciaires.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">5. Données personnelles</h2>
          <p>
            VigieCity collecte et traite vos données personnelles conformément au RGPD et à la loi Informatique et Libertés.
            Pour plus d'informations, consultez notre <a href="/confidentialite" className="text-primary underline">Politique de confidentialité</a>.
          </p>
          <p>
            Les données de géolocalisation associées aux signalements sont utilisées uniquement pour identifier la zone
            géographique de l'incident. Elles ne sont jamais vendues à des tiers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">6. Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments constituant l'application VigieCity (logo, interface, code source, contenus éditoriaux)
            est la propriété exclusive de VigieCity SAS et est protégé par les lois sur la propriété intellectuelle.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">7. Responsabilité</h2>
          <p>
            VigieCity est un outil de facilitation de la communication citoyenne. Il ne se substitue pas aux services
            d'urgence officiels (15, 17, 18, 112). En cas de danger immédiat, appelez toujours le 112.
          </p>
          <p>
            VigieCity SAS ne saurait être tenu responsable de l'exactitude des signalements émis par les utilisateurs,
            ni des actions ou inactions des autorités compétentes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">8. Modification des CGU</h2>
          <p>
            VigieCity SAS se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront
            informés par notification in-app. La poursuite de l'utilisation de l'application vaut acceptation des nouvelles CGU.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">9. Droit applicable et juridiction compétente</h2>
          <p>
            Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents,
            sous réserve des dispositions applicables aux consommateurs.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">10. Contact</h2>
          <p>Pour toute question relative aux présentes CGU :</p>
          <p className="font-medium">VigieCity SAS — contact@vigie.city</p>
        </section>
      </div>
    </div>
  );
}
