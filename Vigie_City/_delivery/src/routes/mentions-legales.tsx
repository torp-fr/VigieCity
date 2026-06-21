import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — VigieCity" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MentionsLegales,
});

function MentionsLegales() {
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
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Mentions légales</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900">Mentions légales</h1>
        <p className="mt-2 text-sm text-gray-400">Mise à jour : juin 2026</p>

        <div className="mt-8 space-y-10 text-[15px] leading-relaxed text-gray-700">

          {/* Éditeur */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">Éditeur du site</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-1">
              <p><strong>Raison sociale :</strong> CRBR Group</p>
              <p><strong>Forme juridique :</strong> Société par actions simplifiée (SAS)</p>
              <p><strong>Siège social :</strong> France</p>
              <p><strong>Email :</strong>{" "}
                <a href="mailto:contact@vigiecity.fr" className="text-blue-600 hover:underline">
                  contact@vigiecity.fr
                </a>
              </p>
              <p><strong>Site web :</strong>{" "}
                <a href="https://vigiecity.fr" className="text-blue-600 hover:underline">
                  vigiecity.fr
                </a>
              </p>
              <p><strong>Directeur de la publication :</strong> Représentant légal de CRBR Group</p>
            </div>
          </section>

          {/* Hébergement */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">Hébergement</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
              <div>
                <p className="font-semibold">Application web — Vercel Inc.</p>
                <p className="text-sm text-gray-500">440 N Barranca Ave #4133, Covina, CA 91723, USA</p>
                <p className="text-sm text-gray-500">
                  <a href="https://vercel.com" className="text-blue-500 hover:underline">vercel.com</a>
                </p>
              </div>
              <div>
                <p className="font-semibold">Base de données — Supabase (AWS eu-west-3)</p>
                <p className="text-sm text-gray-500">Données hébergées en région EU (Paris, France)</p>
                <p className="text-sm text-gray-500">
                  <a href="https://supabase.com" className="text-blue-500 hover:underline">supabase.com</a>
                </p>
              </div>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">Propriété intellectuelle</h2>
            <p>
              L'ensemble des contenus présents sur le site VigieCity (textes, images, logos,
              architecture, code source) est la propriété exclusive de CRBR Group, sauf
              mention contraire. Toute reproduction, représentation, modification ou
              exploitation non autorisée, totale ou partielle, est interdite et constitue
              une contrefaçon sanctionnée par le Code de la propriété intellectuelle.
            </p>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">Données personnelles</h2>
            <p>
              VigieCity collecte et traite des données à caractère personnel dans le cadre
              de la fourniture de ses services aux collectivités et à leurs administrés.
              Ces traitements sont décrits en détail dans notre{" "}
              <Link to="/confidentialite" className="text-blue-600 hover:underline">
                politique de confidentialité
              </Link>.
            </p>
            <p className="mt-3">
              <strong>Délégué à la Protection des Données (DPO) :</strong>{" "}
              <a href="mailto:dpo@vigiecity.fr" className="text-blue-600 hover:underline">
                dpo@vigiecity.fr
              </a>
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">Cookies</h2>
            <p>
              VigieCity utilise des cookies techniques indispensables au fonctionnement
              du service (session authentifiée, préférences). Nous utilisons également
              un cookie d'analyse d'audience (PostHog, serveurs EU) pour améliorer
              notre application. Aucun cookie publicitaire ou de tracking tiers n'est déposé.
            </p>
          </section>

          {/* Responsabilité */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">Limitation de responsabilité</h2>
            <p>
              CRBR Group s'efforce de maintenir VigieCity accessible et à jour, mais ne
              peut garantir une disponibilité continue 24h/24. En cas d'indisponibilité,
              CRBR Group s'engage à rétablir le service dans les meilleurs délais. Les
              contenus publiés par les collectivités (publications, alertes, événements)
              sont sous la responsabilité exclusive desdites collectivités.
            </p>
          </section>

          {/* Droit applicable */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">Droit applicable</h2>
            <p>
              Les présentes mentions légales sont soumises au droit français. En cas de
              litige, les tribunaux français seront seuls compétents.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-gray-900">Contact</h2>
            <p>
              Pour toute question relative aux présentes mentions légales, vous pouvez
              nous contacter à l'adresse{" "}
              <a href="mailto:contact@vigiecity.fr" className="text-blue-600 hover:underline">
                contact@vigiecity.fr
              </a>.
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-16 flex flex-wrap gap-4 border-t border-gray-200 pt-8 text-sm text-gray-400">
          <Link to="/" className="hover:text-blue-600">Accueil</Link>
          <Link to="/confidentialite" className="hover:text-blue-600">Politique de confidentialité</Link>
          <Link to="/cgu" className="hover:text-blue-600">CGU</Link>
        </div>
      </main>
    </div>
  );
}
