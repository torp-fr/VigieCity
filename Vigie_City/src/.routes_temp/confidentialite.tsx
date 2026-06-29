import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — VigieCity" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Confidentialite,
});

function Confidentialite() {
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
            <Lock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Politique de confidentialité</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-gray-400">Mise à jour : juin 2026 · Conforme RGPD (UE) 2016/679</p>

        <div className="mt-8 space-y-10 text-[15px] leading-relaxed text-gray-700">

          {/* Responsable */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">1. Responsable du traitement</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p><strong>Responsable :</strong> CRBR Group</p>
              <p><strong>DPO :</strong>{" "}
                <a href="mailto:dpo@vigiecity.fr" className="text-blue-600 hover:underline">
                  dpo@vigiecity.fr
                </a>
              </p>
              <p className="mt-2 text-sm text-gray-500">
                CRBR Group agit en qualité de responsable de traitement pour l'application
                VigieCity. Les collectivités clientes (communes, intercommunalités) agissent
                comme responsables de traitement pour leurs administrés.
              </p>
            </div>
          </section>

          {/* Données collectées */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">2. Données collectées</h2>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-bold text-gray-800">Citoyens (utilisateurs de l'app)</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                  <li>Adresse email et mot de passe (haché) pour l'authentification</li>
                  <li>Prénom et nom (optionnel, pour la personnalisation)</li>
                  <li>Commune de résidence (pour afficher les contenus locaux)</li>
                  <li>Signalements soumis (description, photos, localisation approximative)</li>
                  <li>Messages échangés avec la mairie</li>
                  <li>Abonnement aux notifications push (token anonymisé)</li>
                  <li>Données de navigation (pages visitées, via PostHog analytics EU)</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-bold text-gray-800">Administrateurs de collectivités</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                  <li>Adresse email professionnelle</li>
                  <li>Nom et prénom</li>
                  <li>Collectivité de rattachement</li>
                  <li>Actions réalisées dans le panneau d'administration (audit trail)</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-bold text-gray-800">Visiteurs du site vitrine</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                  <li>Données de navigation anonymisées (PostHog, serveurs EU, sans IP complète)</li>
                  <li>Aucune donnée nominative sans action explicite de votre part</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Finalités */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">3. Finalités et bases légales</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Finalité</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Base légale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ["Fourniture du service citoyen", "Exécution du contrat (art. 6.1.b)"],
                    ["Authentification et sécurité", "Intérêt légitime (art. 6.1.f)"],
                    ["Envoi de notifications push", "Consentement (art. 6.1.a)"],
                    ["Messagerie citoyen ↔ mairie", "Exécution du contrat (art. 6.1.b)"],
                    ["Analytics d'utilisation", "Intérêt légitime (art. 6.1.f)"],
                    ["Envoi d'emails transactionnels", "Exécution du contrat (art. 6.1.b)"],
                    ["Conformité légale / RGPD", "Obligation légale (art. 6.1.c)"],
                  ].map(([fin, base]) => (
                    <tr key={fin}>
                      <td className="px-4 py-3 text-gray-700">{fin}</td>
                      <td className="px-4 py-3 text-gray-500">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Durées de conservation */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">4. Durées de conservation</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Catégorie</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ["Compte citoyen actif", "Durée d'utilisation du service"],
                    ["Compte citoyen inactif", "3 ans après dernière connexion, puis suppression"],
                    ["Signalements", "5 ans (archive légale communes)"],
                    ["Messages citoyen ↔ mairie", "3 ans"],
                    ["Logs de connexion", "12 mois"],
                    ["Données analytics (PostHog)", "12 mois"],
                    ["Abonnements push", "Jusqu'à révocation ou expiration du token"],
                  ].map(([cat, duree]) => (
                    <tr key={cat}>
                      <td className="px-4 py-3 text-gray-700">{cat}</td>
                      <td className="px-4 py-3 text-gray-500">{duree}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sous-traitants */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">5. Sous-traitants</h2>
            <div className="space-y-3">
              {[
                {
                  name: "Supabase (AWS eu-west-3 — Paris)",
                  role: "Hébergement base de données et authentification",
                  pays: "UE",
                  url: "https://supabase.com/privacy",
                },
                {
                  name: "Vercel Inc.",
                  role: "Hébergement application web",
                  pays: "USA (décision d'adéquation / SCCs)",
                  url: "https://vercel.com/legal/privacy-policy",
                },
                {
                  name: "Resend Inc.",
                  role: "Envoi d'emails transactionnels",
                  pays: "USA (SCCs)",
                  url: "https://resend.com/privacy",
                },
                {
                  name: "PostHog (EU Cloud)",
                  role: "Analytics d'utilisation (sans IP complète, anonymisé)",
                  pays: "UE (Francfort)",
                  url: "https://posthog.com/privacy",
                },
              ].map((s) => (
                <div key={s.name} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{s.name}</p>
                      <p className="text-sm text-gray-500">{s.role}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Localisation : {s.pays}</p>
                    </div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline shrink-0 ml-4"
                    >
                      Politique
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Droits */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">6. Vos droits</h2>
            <p className="mb-4">
              Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants :
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Droit d'accès", "Obtenir une copie de vos données"],
                ["Droit de rectification", "Corriger des données inexactes"],
                ["Droit à l'effacement", "Demander la suppression de vos données"],
                ["Droit à la portabilité", "Recevoir vos données dans un format structuré"],
                ["Droit d'opposition", "Vous opposer à certains traitements"],
                ["Droit de limitation", "Restreindre temporairement un traitement"],
              ].map(([titre, desc]) => (
                <div key={titre} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="font-semibold text-gray-800">{titre}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm">
              Pour exercer vos droits, contactez notre DPO :{" "}
              <a href="mailto:dpo@vigiecity.fr" className="text-blue-600 hover:underline">
                dpo@vigiecity.fr
              </a>
              . Réponse sous 30 jours.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Vous avez également le droit d'introduire une réclamation auprès de la{" "}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                CNIL
              </a>{" "}
              (Commission Nationale de l'Informatique et des Libertés).
            </p>
          </section>

          {/* Sécurité */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">7. Sécurité</h2>
            <p>
              VigieCity met en œuvre des mesures techniques et organisationnelles appropriées :
              chiffrement TLS des communications, mots de passe hachés (bcrypt via Supabase Auth),
              accès aux données restreints par rôles (RLS Supabase), journalisation des accès.
              Les données sont hébergées exclusivement sur des serveurs situés dans l'Union européenne.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">8. Contact</h2>
            <p>
              Pour toute question relative à cette politique ou à la protection de vos données :{" "}
              <a href="mailto:dpo@vigiecity.fr" className="text-blue-600 hover:underline">
                dpo@vigiecity.fr
              </a>
              {" "}ou{" "}
              <a href="mailto:contact@vigiecity.fr" className="text-blue-600 hover:underline">
                contact@vigiecity.fr
              </a>.
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-16 flex flex-wrap gap-4 border-t border-gray-200 pt-8 text-sm text-gray-400">
          <Link to="/" className="hover:text-blue-600">Accueil</Link>
          <Link to="/mentions-legales" className="hover:text-blue-600">Mentions légales</Link>
          <Link to="/cgu" className="hover:text-blue-600">CGU</Link>
        </div>
      </main>
    </div>
  );
}
