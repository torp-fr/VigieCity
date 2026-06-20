import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  MapPin,
  Bell,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Shield,
  Users,
  Phone,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      {
        title:
          "VigieCity — Plateforme de signalement citoyen pour les EPCI et communautés de communes",
      },
      {
        name: "description",
        content:
          "VigieCity unifie la gestion des signalements citoyens pour les EPCI, communautés de communes et communautés d'agglomération. Tableau de bord multi-communes, géolocalisation, notifications push. Essai gratuit 30 jours.",
      },
      {
        name: "keywords",
        content:
          "EPCI signalement citoyen, communauté de communes application citoyenne, gestion signalements territoire, tableau de bord intercommunal, participation citoyenne numérique",
      },
      {
        property: "og:title",
        content: "VigieCity — La plateforme citoyenne pour les EPCI",
      },
      {
        property: "og:description",
        content:
          "Gérez les signalements citoyens sur toutes vos communes depuis un seul tableau de bord. Démo gratuite.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type PricingTier = {
  name: string;
  range: string;
  price: string;
  sub: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  cta: string;
  ctaVariant: "primary" | "outline" | "navy";
};

// ── Constants ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    Icon: Building2,
    title: "Supervision multi-communes",
    desc: "Pilotez l'ensemble de vos communes depuis un tableau de bord unifié. Comparez les indicateurs, identifiez les zones sensibles et priorisez les interventions à l'échelle intercommunale.",
    color: "#1e3a8a",
  },
  {
    Icon: MapPin,
    title: "Signalements géolocalisés",
    desc: "Chaque signalement est automatiquement positionné sur une carte interactive. Visualisez les points chauds en temps réel et optimisez les tournées de vos agents.",
    color: "#0f766e",
  },
  {
    Icon: Bell,
    title: "Notifications push",
    desc: "Informez les citoyens de l'avancement de leurs signalements par notification push. Renforcez la confiance et l'engagement civique sur votre territoire.",
    color: "#7c3aed",
  },
  {
    Icon: BarChart3,
    title: "Statistiques & rapports",
    desc: "Suivez les KPIs clés : taux de résolution, délais de traitement, catégories de signalements par commune. Exportez vos données pour vos rapports d'activité.",
    color: "#b45309",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Configuration de l'EPCI",
    desc: "Inscrivez votre groupement en quelques minutes. Renseignez vos communes membres, nommez vos responsables intercommunaux et définissez vos catégories de signalements.",
  },
  {
    n: "02",
    title: "Déploiement par commune",
    desc: "Chaque commune membre reçoit son propre espace d'administration. Les agents locaux modèrent les signalements de leur territoire, en lien avec votre dashboard EPCI.",
  },
  {
    n: "03",
    title: "Citoyens engagés",
    desc: "Les habitants téléchargent l'application, signalent en quelques secondes et suivent l'avancement. Le lien citoyen–commune est renforcé, la confiance augmente.",
  },
];

const PRICING: PricingTier[] = [
  {
    name: "Pilote",
    range: "1–3 communes",
    price: "Gratuit",
    sub: "30 jours d'essai",
    features: [
      "Jusqu'à 3 communes",
      "100 citoyens inclus",
      "Carte & signalements",
      "Notifications push",
      "Support email",
    ],
    highlighted: false,
    cta: "Démarrer l'essai",
    ctaVariant: "outline",
  },
  {
    name: "Starter",
    range: "4–10 communes",
    price: "290 €",
    sub: "/ mois HT",
    features: [
      "Jusqu'à 10 communes",
      "500 citoyens inclus",
      "Dashboard EPCI unifié",
      "Notifications push",
      "Export CSV basique",
      "Support prioritaire",
    ],
    highlighted: false,
    cta: "Choisir Starter",
    ctaVariant: "outline",
  },
  {
    name: "Pro",
    range: "11–20 communes",
    price: "490 €",
    sub: "/ mois HT",
    features: [
      "Jusqu'à 20 communes",
      "2 000 citoyens inclus",
      "Statistiques avancées",
      "Export CSV complet",
      "Intégration SIG",
      "API REST",
      "Support dédié",
    ],
    highlighted: true,
    badge: "Le plus populaire",
    cta: "Choisir Pro",
    ctaVariant: "primary",
  },
  {
    name: "EPCI-L",
    range: "> 20 communes",
    price: "Sur devis",
    sub: "adapté à votre territoire",
    features: [
      "Communes illimitées",
      "Citoyens illimités",
      "Déploiement accompagné",
      "Formation des équipes",
      "SLA garanti",
      "Référent dédié",
    ],
    highlighted: false,
    cta: "Contacter un conseiller",
    ctaVariant: "navy",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Depuis VigieCity, nos équipes traitent les signalements trois fois plus vite. La vue unifiée par commune change tout pour notre coordinateur EPCI. En six mois, le taux de satisfaction citoyen sur le sujet est passé de 48 % à 79 %.",
    name: "Marie-Hélène Aubert",
    role: "DGS",
    org: "CC du Pays de Bray",
    initiales: "MA",
  },
  {
    quote:
      "Les citoyens sont enfin acteurs de la qualité de leur cadre de vie. Le taux d'engagement dépasse nos attentes et la confiance envers nos services s'est nettement améliorée. L'interface admin est intuitive, nos agents l'ont adopté immédiatement.",
    name: "Frédéric Tournier",
    role: "DGA Services Techniques",
    org: "CA Loire-Forez Agglomération",
    initiales: "FT",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header
        style={{ backgroundColor: "#1e3a8a" }}
        className="sticky top-0 z-50"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-white" />
            <span className="text-xl font-bold tracking-tight text-white">
              VigieCity
            </span>
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: "#3b82f622", color: "#93c5fd" }}
            >
              pour les EPCI
            </span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#fonctionnalites"
              className="text-sm text-blue-200 transition hover:text-white"
            >
              Fonctionnalités
            </a>
            <a
              href="#comment-ca-marche"
              className="text-sm text-blue-200 transition hover:text-white"
            >
              Comment ça marche
            </a>
            <a
              href="#tarifs"
              className="text-sm text-blue-200 transition hover:text-white"
            >
              Tarifs
            </a>
            <a
              href="mailto:contact@vigiecity.fr"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50"
            >
              Demander une démo
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #1d4ed8 100%)",
        }}
        className="pb-24 pt-20"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-16 lg:flex-row">
            {/* Left — copy */}
            <div className="flex-1 text-center lg:text-left">
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
                style={{ backgroundColor: "#ffffff18", color: "#bfdbfe" }}
              >
                <Users className="h-4 w-4" />
                Conçu pour les EPCI et communautés de communes
              </div>

              <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
                Le signalement citoyen
                <br />
                <span style={{ color: "#93c5fd" }}>à l'échelle de votre</span>
                <br />
                territoire
              </h1>

              <p className="mt-6 max-w-xl text-lg text-blue-200 lg:text-xl">
                VigieCity unifie la gestion des signalements sur l'ensemble de
                vos communes. Tableau de bord temps réel, géolocalisation,
                notifications push — un seul outil pour tout votre EPCI.
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
                <a
                  href="mailto:contact@vigiecity.fr?subject=Demande de démo VigieCity EPCI"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-blue-900 shadow-lg transition hover:bg-blue-50"
                >
                  Demander une démo gratuite
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#tarifs"
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-400 px-7 py-3.5 text-base font-semibold text-white transition hover:border-white hover:bg-white/10"
                >
                  Voir les tarifs
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              <p className="mt-5 text-sm text-blue-300">
                ✓ Essai gratuit 30 jours&emsp;✓ Sans engagement&emsp;✓ Déploiement en 48h
              </p>
            </div>

            {/* Right — visual mockup */}
            <div className="flex-shrink-0">
              <div
                className="relative rounded-3xl shadow-2xl"
                style={{
                  width: 320,
                  height: 560,
                  backgroundColor: "#0f172a",
                  border: "8px solid #334155",
                }}
              >
                {/* Status bar */}
                <div className="flex items-center justify-between px-5 pt-3 text-xs text-slate-400">
                  <span>9:41</span>
                  <div className="flex gap-1">
                    <span>●●●</span>
                    <span>WiFi</span>
                    <span>🔋</span>
                  </div>
                </div>

                {/* App content mock */}
                <div className="mx-3 mt-2 overflow-hidden rounded-2xl bg-white">
                  {/* App header */}
                  <div
                    className="flex items-center gap-2 px-4 py-3"
                    style={{ backgroundColor: "#1e3a8a" }}
                  >
                    <Shield className="h-4 w-4 text-white" />
                    <span className="text-sm font-bold text-white">VigieCity</span>
                    <span className="ml-auto rounded-full bg-blue-700 px-2 py-0.5 text-xs text-blue-200">
                      EPCI
                    </span>
                  </div>

                  {/* KPI bar */}
                  <div className="flex divide-x divide-gray-100 bg-gray-50">
                    {[
                      { v: "3", l: "Communes" },
                      { v: "12", l: "En cours" },
                      { v: "94%", l: "Résolu" },
                    ].map((kpi) => (
                      <div key={kpi.l} className="flex-1 py-2 text-center">
                        <p className="text-sm font-bold text-blue-900">{kpi.v}</p>
                        <p className="text-xs text-gray-500">{kpi.l}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mini map placeholder */}
                  <div
                    className="relative flex items-center justify-center"
                    style={{
                      height: 180,
                      background:
                        "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                    }}
                  >
                    <div className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(0deg, #0ea5e9 0px, transparent 1px, transparent 20px, #0ea5e9 20px), repeating-linear-gradient(90deg, #0ea5e9 0px, transparent 1px, transparent 20px, #0ea5e9 20px)",
                        backgroundSize: "20px 20px",
                      }}
                    />
                    {/* Simulated pins */}
                    {[
                      { top: 40, left: 80, color: "#dc2626" },
                      { top: 90, left: 160, color: "#d97706" },
                      { top: 120, left: 60, color: "#6b7280" },
                      { top: 60, left: 220, color: "#dc2626" },
                    ].map((pin, i) => (
                      <div
                        key={i}
                        className="absolute"
                        style={{ top: pin.top, left: pin.left }}
                      >
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs shadow"
                          style={{ backgroundColor: pin.color }}
                        >
                          <MapPin className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    ))}
                    <span className="relative rounded bg-white/80 px-2 py-1 text-xs font-medium text-blue-800 shadow">
                      4 signalements actifs
                    </span>
                  </div>

                  {/* Signal list mock */}
                  <div className="divide-y divide-gray-100">
                    {[
                      { cat: "🚧", title: "Nid-de-poule", addr: "Rue des Acacias", sev: "urgent", com: "Mairie de Bray" },
                      { cat: "💡", title: "Éclairage défaillant", addr: "Place du Marché", sev: "vigilance", com: "Mairie de Gournay" },
                    ].map((r) => (
                      <div key={r.title} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-lg">{r.cat}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-gray-800">{r.title}</p>
                          <p className="truncate text-xs text-gray-400">{r.addr}</p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{
                            backgroundColor:
                              r.sev === "urgent" ? "#fee2e2" : "#fef3c7",
                            color: r.sev === "urgent" ? "#b91c1c" : "#92400e",
                          }}
                        >
                          {r.sev}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom bar mock */}
                <div className="mx-3 mt-2 flex justify-around rounded-2xl bg-slate-800 py-3">
                  {["🏠", "🗺️", "🔔", "📊"].map((ic) => (
                    <span key={ic} className="text-lg">{ic}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Social proof bar */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 border-t border-blue-700 pt-10">
            {[
              { n: "48+", l: "EPCI clients" },
              { n: "620+", l: "communes connectées" },
              { n: "85 000+", l: "citoyens actifs" },
              { n: "< 48h", l: "délai de déploiement" },
            ].map((stat) => (
              <div key={stat.l} className="text-center">
                <p className="text-3xl font-extrabold text-white">{stat.n}</p>
                <p className="text-sm text-blue-300">{stat.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="fonctionnalites" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Fonctionnalités
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
              Tout ce dont votre EPCI a besoin
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
              Une plateforme pensée par des spécialistes des collectivités, pour
              les agents de terrain comme pour les décideurs intercommunaux.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ Icon, title, desc, color }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-6 transition hover:shadow-md"
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: color + "18" }}
                >
                  <Icon className="h-6 w-6" style={{ color }} />
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        id="comment-ca-marche"
        className="py-24"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Comment ça marche
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
              Déployé en 48 heures
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              De la configuration à la première notification citoyen, comptez
              deux jours. Nos équipes vous accompagnent à chaque étape.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="absolute left-full top-10 hidden w-8 -translate-y-1/2 border-t-2 border-dashed border-blue-200 md:block"
                    style={{ marginLeft: "1rem" }}
                  />
                )}
                <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                  <div
                    className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-xl font-extrabold text-white"
                    style={{ backgroundColor: "#1e3a8a" }}
                  >
                    {step.n}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="tarifs" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Tarifs
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
              Un tarif adapté à la taille de votre EPCI
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              Tarification au nombre de communes membres. Sans surcoût caché.
              Engagement mensuel ou annuel (−15 %).
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {PRICING.map((tier) => (
              <div
                key={tier.name}
                className="relative flex flex-col rounded-2xl border p-8"
                style={
                  tier.highlighted
                    ? {
                        borderColor: "#1e3a8a",
                        boxShadow: "0 0 0 2px #1e3a8a, 0 20px 40px #1e3a8a22",
                        backgroundColor: "#f0f4ff",
                      }
                    : { borderColor: "#e5e7eb", backgroundColor: "white" }
                }
              >
                {tier.badge && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white"
                    style={{ backgroundColor: "#1e3a8a" }}
                  >
                    {tier.badge}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-gray-500">
                    {tier.name}
                  </p>
                  <p className="mt-1 text-xs font-medium text-blue-600">
                    {tier.range}
                  </p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {tier.price}
                    </span>
                    <span className="mb-1 text-sm text-gray-500">{tier.sub}</span>
                  </div>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: tier.highlighted ? "#1e3a8a" : "#16a34a" }}
                      />
                      <span className="text-sm text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="mailto:contact@vigiecity.fr?subject=Intérêt VigieCity EPCI — Offre %tier.name%"
                  className="mt-8 block rounded-xl py-3 text-center text-sm font-bold transition"
                  style={
                    tier.ctaVariant === "primary"
                      ? {
                          backgroundColor: "#1e3a8a",
                          color: "white",
                        }
                      : tier.ctaVariant === "navy"
                      ? {
                          backgroundColor: "#0f172a",
                          color: "white",
                        }
                      : {
                          border: "2px solid #1e3a8a",
                          color: "#1e3a8a",
                          backgroundColor: "transparent",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (tier.ctaVariant === "outline") {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "#eff6ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tier.ctaVariant === "outline") {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-gray-400">
            Tous les tarifs sont HT. TVA 20 % applicable selon le régime fiscal de votre collectivité.
            Tarif annuel avec engagement : −15 %. Marchés publics bienvenus.
          </p>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{ backgroundColor: "#1e3a8a" }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">
              Témoignages
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">
              Ce qu'en disent les DGS et DGA
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-8"
                style={{ backgroundColor: "#ffffff12" }}
              >
                <div className="mb-6 flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-yellow-400">
                      ★
                    </span>
                  ))}
                </div>
                <blockquote className="text-base leading-relaxed text-blue-100">
                  « {t.quote} »
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: "#3b82f6" }}
                  >
                    {t.initiales}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-blue-300">
                      {t.role} — {t.org}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{
          background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
            Prêt à moderniser la gestion citoyenne
            <br />
            <span style={{ color: "#1e3a8a" }}>de votre territoire ?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-gray-500">
            Nos conseillers spécialisés collectivités vous accompagnent de la
            démonstration au déploiement. Réponse sous 24h ouvrées.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:contact@vigiecity.fr?subject=Demande de démo VigieCity EPCI"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: "#1e3a8a" }}
            >
              <Phone className="h-4 w-4" />
              Demander une démonstration
            </a>
            <a
              href="#tarifs"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 px-8 py-4 text-base font-semibold text-blue-800 transition hover:border-blue-400 hover:bg-white"
            >
              Voir les tarifs
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Essai 30 jours gratuit
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Sans engagement
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Hébergé en France
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Conforme RGPD
            </span>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="py-12"
        style={{ backgroundColor: "#0f172a" }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">VigieCity</span>
              <span className="text-sm text-slate-500">
                — La plateforme citoyenne pour les EPCI
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <a
                href="mailto:contact@vigiecity.fr"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                contact@vigiecity.fr
              </a>
              <Link
                to="/auth"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Accès citoyen
              </Link>
              <a
                href="#"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Mentions légales
              </a>
              <a
                href="#"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Confidentialité
              </a>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-800 pt-8 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} VigieCity SAS — Tous droits réservés —
            Hébergement OVHcloud France — Données stockées en UE
          </div>
        </div>
      </footer>
    </div>
  );
}
