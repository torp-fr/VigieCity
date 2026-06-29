import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight, Clock, Play } from "lucide-react";

export const Route = createFileRoute("/merci")({
  head: () => ({
    meta: [
      { title: "VigieCity — Demande bien recue !" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MerciPage,
});

function MerciPage() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)" }}>
      {/* Header */}
      <header className="px-6 py-5 flex items-center gap-3">
        <img src="/icons/icon.svg" alt="VigieCity" className="h-8 w-8" />
        <span className="text-xl font-extrabold text-white tracking-tight">VigieCity</span>
      </header>

      {/* Content */}
      <main className="flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Icone succes */}
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-green-400/20 ring-4 ring-green-400/30">
          <CheckCircle2 className="h-10 w-10 text-green-400" />
        </div>

        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
          Demande bien recue !
        </h1>
        <p className="mt-4 max-w-md text-lg text-blue-200">
          Merci pour votre interet. Notre equipe va prendre contact avec vous
          dans les prochaines 48h pour organiser votre demo personnalisee.
        </p>

        {/* Timeline ce qui se passe */}
        <div className="mt-12 w-full max-w-md rounded-2xl bg-white/10 p-6 backdrop-blur-sm text-left">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-blue-300">
            La suite
          </h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-400/20 text-green-400 font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Demande enregistree</p>
                <p className="text-xs text-blue-300 mt-0.5">
                  Vous recevrez un email de confirmation sous quelques minutes.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-400/20 text-blue-300 font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Contact sous 48h</p>
                <p className="text-xs text-blue-300 mt-0.5">
                  Notre equipe vous appelle ou vous ecrit pour convenir d'un creneau.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-blue-300/60 font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-semibold text-white/70 text-sm">Demo personnalisee</p>
                <p className="text-xs text-blue-300/60 mt-0.5">
                  Nous configurons une demo avec les donnees de votre commune.
                  Gratuit, sans engagement.
                </p>
              </div>
            </div>
          </div>

          {/* Delai */}
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-400/10 border border-amber-400/20 px-4 py-3">
            <Clock className="h-4 w-4 text-amber-300 shrink-0" />
            <p className="text-xs text-amber-200">
              Temps de reponse moyen : <strong className="text-amber-100">moins de 24h</strong> en jours ouvres
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            to="/demo"
            className="flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-base font-bold text-blue-900 hover:bg-blue-50 transition shadow-lg"
          >
            <Play className="h-4 w-4" />
            Voir la demo interactive
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1 text-sm text-blue-300 hover:text-white transition"
          >
            Retour a l'accueil
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="pb-8 text-center">
        <p className="text-xs text-blue-400/60">
          VigieCity &mdash; contact@vigiecity.fr
        </p>
      </footer>
    </div>
  );
}
