import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions Générales d'Utilisation — VigieCity" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CGU,
});

function CGU() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <span className="text-sm text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">
              Conditions Générales d'Utilisation
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Conditions Générales d'Utilisation
        </h1>
        <p className="mt-2 text-sm text-gray-400">Mise à jour : juin 2026</p>

        <div className="mt-8 space-y-10 text-[15px] leading-relaxed text-gray-700">

          {/* Définitions */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">1. Définitions</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2 text-sm">
              <p><strong>VigieCity :</strong> l'application mobile et web éditée par CRBR Group permettant aux citoyens d'interagir avec leur commune.</p>
              <p><strong>Utilisateur / Citoyen :</strong> toute personne physique accédant à VigieCity via l'application mobile ou le site web.</p>
              <p><strong>Collectivité :</strong> commune, intercommunalité ou autre entité territoriale abonnée au service VigieCity.</p>
              <p><strong>Administrateur :</strong> agent de la collectivité disposant d'un accès au panneau d'administration VigieCity.</p>
              <p><strong>Éditeur :</strong> CRBR Group, société par actions simplifiée, éditrice de VigieCity.</p>
              <p><strong>Service :</strong> l'ensemble des fonctionnalités proposées par VigieCity (signalements, messagerie, actualités, alertes, services locaux, etc.).</p>
            </div>
          </section>

          {/* Objet */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">2. Objet</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et
              l'utilisation de l'application VigieCity par les citoyens. Elles constituent
              un contrat entre l'Éditeur et tout Utilisateur. En accédant à VigieCity,
              l'Utilisateur accepte sans réserve les présentes CGU.
            </p>
          </section>

          {/* Accès */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">3. Accès au service</h2>
            <p>
              L'accès à VigieCity nécessite la création d'un compte avec une adresse email
              valide et un mot de passe. L'Utilisateur doit être âgé d'au moins 16 ans.
              En dessous de cet âge, le consentement d'un parent ou tuteur légal est requis.
            </p>
            <p className="mt-3">
              L'Utilisateur est responsable de la confidentialité de ses identifiants de
              connexion. Toute utilisation du compte sous ses identifiants est présumée
              effectuée par l'Utilisateur.
            </p>
            <p className="mt-3">
              L'Éditeur se réserve le droit de suspendre ou supprimer un compte en cas
              de violation des présentes CGU.
            </p>
          </section>

          {/* Fonctionnalités */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">4. Fonctionnalités</h2>
            <div className="space-y-3">
              {[
                {
                  titre: "Signalements",
                  desc: "L'Utilisateur peut signaler des problèmes (voirie, éclairage, propreté, etc.) à sa collectivité. Les signalements sont transmis à l'équipe municipale concernée et ne constituent pas un signalement officiel aux forces de l'ordre.",
                },
                {
                  titre: "Messagerie",
                  desc: "L'Utilisateur peut échanger des messages avec les services de sa collectivité. Ce canal ne remplace pas les voies officielles (courrier recommandé, etc.) pour les actes administratifs.",
                },
                {
                  titre: "Actualités et événements",
                  desc: "La collectivité publie des informations locales. L'Éditeur ne contrôle pas le contenu publié par les collectivités.",
                },
                {
                  titre: "Alertes et urgences",
                  desc: "Les alertes transmises via VigieCity sont à titre informatif. En cas d'urgence réelle, l'Utilisateur doit contacter les services d'urgence (15, 17, 18, 112).",
                },
                {
                  titre: "Notifications push",
                  desc: "L'Utilisateur peut activer les notifications push pour recevoir des alertes de sa commune. Ces notifications peuvent être désactivées à tout moment depuis les paramètres de l'application ou du téléphone.",
                },
              ].map((f) => (
                <div key={f.titre} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="font-semibold text-gray-800">{f.titre}</p>
                  <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Obligations utilisateur */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">5. Obligations de l'Utilisateur</h2>
            <p className="mb-3">L'Utilisateur s'engage à :</p>
            <ul className="space-y-2 text-sm list-disc list-inside text-gray-600">
              <li>Fournir des informations exactes lors de l'inscription et lors des signalements</li>
              <li>Ne pas usurper l'identité d'un tiers</li>
              <li>Ne pas publier de contenu illicite, haineux, diffamatoire, pornographique ou portant atteinte aux droits des tiers</li>
              <li>Ne pas tenter de compromettre la sécurité ou l'intégrité du service</li>
              <li>Ne pas utiliser le service à des fins commerciales non autorisées</li>
              <li>Respecter les droits de propriété intellectuelle de l'Éditeur et des tiers</li>
              <li>Ne pas soumettre de faux signalements de manière intentionnelle</li>
            </ul>
            <p className="mt-4 text-sm text-gray-500">
              Tout manquement peut entraîner la suspension ou la suppression du compte,
              sans préjudice de poursuites judiciaires éventuelles.
            </p>
          </section>

          {/* Responsabilité */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">6. Responsabilité de l'Éditeur</h2>
            <p>
              L'Éditeur s'engage à mettre en œuvre tous les moyens raisonnables pour
              assurer la disponibilité et la sécurité du service. Cependant, VigieCity
              est fourni "en l'état", sans garantie d'absence d'interruptions.
            </p>
            <p className="mt-3">
              L'Éditeur n'est pas responsable :
            </p>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-gray-600">
              <li>Du contenu publié par les collectivités (actualités, alertes, événements)</li>
              <li>Du traitement des signalements par les collectivités (délais, décisions)</li>
              <li>Des dommages indirects résultant de l'utilisation ou de l'impossibilité d'utiliser le service</li>
              <li>Des interruptions dues à des maintenances programmées ou à des cas de force majeure</li>
            </ul>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">7. Données personnelles</h2>
            <p>
              L'utilisation de VigieCity implique la collecte et le traitement de données
              personnelles conformément à notre{" "}
              <Link to="/confidentialite" className="text-blue-600 hover:underline">
                politique de confidentialité
              </Link>
              {" "}et au RGPD.
            </p>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">8. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments constituant VigieCity (interface, code source, logo,
              nom, contenus éditoriaux) est protégé par le droit de la propriété
              intellectuelle et appartient à CRBR Group ou à ses partenaires. Toute
              reproduction, même partielle, est interdite sans autorisation écrite préalable.
            </p>
            <p className="mt-3">
              En soumettant du contenu (signalements, photos, messages), l'Utilisateur
              accorde à l'Éditeur et à la collectivité concernée une licence non exclusive
              d'utilisation de ce contenu dans le cadre du traitement de la demande.
            </p>
          </section>

          {/* Modification */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">9. Modification des CGU</h2>
            <p>
              L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment.
              Les Utilisateurs seront informés de toute modification substantielle par
              email ou via une notification dans l'application. La poursuite de l'utilisation
              du service après notification vaut acceptation des nouvelles CGU.
            </p>
          </section>

          {/* Résiliation */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">10. Résiliation</h2>
            <p>
              L'Utilisateur peut supprimer son compte à tout moment depuis les paramètres
              de l'application ou en contactant{" "}
              <a href="mailto:contact@vigiecity.fr" className="text-blue-600 hover:underline">
                contact@vigiecity.fr
              </a>
              . La suppression entraîne la suppression des données personnelles dans les
              délais prévus par la politique de confidentialité.
            </p>
          </section>

          {/* Droit applicable */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">11. Droit applicable et juridiction</h2>
            <p>
              Les présentes CGU sont soumises au droit français. En cas de litige,
              les parties s'engagent à chercher une solution amiable avant tout recours
              judiciaire. À défaut, les tribunaux français seront seuls compétents.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">12. Contact</h2>
            <p>
              Pour toute question concernant les présentes CGU :{" "}
              <a href="mailto:contact@vigiecity.fr" className="text-blue-600 hover:underline">
                contact@vigiecity.fr
              </a>
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-16 flex flex-wrap gap-4 border-t border-gray-200 pt-8 text-sm text-gray-400">
          <Link to="/" className="hover:text-blue-600">Accueil</Link>
          <Link to="/mentions-legales" className="hover:text-blue-600">Mentions légales</Link>
          <Link to="/confidentialite" className="hover:text-blue-600">Confidentialité</Link>
        </div>
      </main>
    </div>
  );
}
