import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check, X, ChevronDown, Calculator, AlertCircle,
  Building2, MapPin, Users, TrendingDown, Heart,
} from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

// ── Types ──────────────────────────────────────────────────────────────────

type PricingTab = "communes" | "epci" | "services" | "calculator";
type PopulationRange = "nano" | "micro" | "local" | "urbain" | "metro" | "solidarite" | "freemium";

interface Plan {
  name: string;
  population: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  pricePerHab?: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  icon: React.ReactNode;
  color: string;
}

// ── Page ───────────────────────────────────────────────────────────────────

function PricingPage() {
  const [activeTab, setActiveTab] = useState<PricingTab>("communes");
  const [populationInput, setPopulationInput] = useState<string>("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white py-12 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h1 className="text-4xl font-bold text-slate-900">
            Tarification VigieCity
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Des plans flexibles pour toutes les collectivités — du village au métropole
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-8 overflow-x-auto">
            {[
              { id: "communes", label: "Communes" },
              { id: "epci", label: "Intercommunalités" },
              { id: "services", label: "Services additionnels" },
              { id: "calculator", label: "Calculateur EPCI" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as PricingTab)}
                className={`border-b-2 px-2 py-4 font-medium transition ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-12">
        {activeTab === "communes" && <CommunesSection />}
        {activeTab === "epci" && <EpciSection />}
        {activeTab === "services" && <ServicesSection />}
        {activeTab === "calculator" && <CalculatorSection />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-6xl px-4 text-center text-slate-600">
          <p>Questions de tarification ? <a href="mailto:contact@vigiecity.fr" className="font-semibold text-blue-600 hover:underline">Contactez-nous</a></p>
          <p className="mt-2 text-sm">Tous les prix HT. TVA à ajouter selon votre situation.</p>
        </div>
      </footer>
    </div>
  );
}

// ── COMMUNES SECTION ───────────────────────────────────────────────────────

function CommunesSection() {
  const plans: Plan[] = [
    {
      name: "Hameau",
      population: "< 500 hab",
      monthlyPrice: 19,
      annualPrice: 190,
      pricePerHab: "0,38€",
      features: [
        "✓ Signalements citoyens",
        "✓ Alertes d'urgence",
        "✓ Agenda citoyen",
        "✓ Dashboard admin basique",
        "✓ Modération hybrid (auto + super-admin)",
        "✓ Support par FAQ",
      ],
      cta: "Essayer Hameau",
      icon: <Heart className="h-6 w-6" />,
      color: "from-emerald-500 to-teal-600",
    },
    {
      name: "Village",
      population: "501–3 500 hab",
      monthlyPrice: 49,
      annualPrice: 490,
      pricePerHab: "0,14€",
      features: [
        "✓ Tous les modules inclus",
        "✓ Signalements + Alertes",
        "✓ Agenda + Messagerie",
        "✓ Carte interactive",
        "✓ Stats 30–90 jours",
        "✓ Support email < 48h",
      ],
      cta: "Commencer avec Village",
      color: "from-blue-500 to-cyan-600",
    },
    {
      name: "Bourg",
      population: "3 501–10 000 hab",
      monthlyPrice: 99,
      annualPrice: 990,
      pricePerHab: "0,10€",
      features: [
        "✓ Tous les modules inclus",
        "✓ Stats 1 an (trend analysis)",
        "✓ Notifications push avancées",
        "✓ Gestion équipe (25 users)",
        "✓ API basique + CSV export",
        "✓ Support prioritaire 12h",
      ],
      cta: "Choisir Bourg",
      color: "from-indigo-500 to-blue-600",
    },
    {
      name: "Bastide",
      population: "10 001–25 000 hab",
      monthlyPrice: 189,
      annualPrice: 1890,
      pricePerHab: "0,076€",
      highlight: true,
      features: [
        "✓ Tous les modules inclus",
        "✓ White label + branding",
        "✓ Stats 5 ans (custom date range)",
        "✓ API complet (5k calls/day)",
        "✓ Support phone (2h SLA)",
        "✓ Équipe illimitée + workflows",
      ],
      cta: "Passer à Bastide",
      color: "from-purple-500 to-pink-600",
    },
    {
      name: "Cité",
      population: "25 001–50 000 hab",
      monthlyPrice: 390,
      annualPrice: 3900,
      pricePerHab: "0,078€",
      features: [
        "✓ Tous les modules inclus",
        "✓ White label complet",
        "✓ Stats all-time (illimité)",
        "✓ Dedicated account manager",
        "✓ API illimitée",
        "✓ SLA 99,9% (nego)",
      ],
      cta: "Contacter pour Cité",
      color: "from-amber-500 to-orange-600",
    },
    {
      name: "Métropole",
      population: "50 000+ hab",
      monthlyPrice: 590,
      annualPrice: 5900,
      pricePerHab: "0,059€",
      features: [
        "✓ Tarification transparent",
        "✓ SLA 99,9% garanti",
        "✓ Infrastructure dédiée",
        "✓ Custom integrations",
        "✓ On-call support 24/7",
        "✓ Quarterly business reviews",
      ],
      cta: "Demander un devis",
      color: "from-red-500 to-rose-600",
    },
  ];

  return (
    <div>
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-700" />
          <div className="text-sm text-blue-800">
            <strong>Paiement annuel recommandé :</strong> Économisez 2 mois (mensuel × 10 = annuel)
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`relative rounded-2xl border transition ${
              plan.highlight
                ? "border-2 border-purple-400 bg-white shadow-lg"
                : "border-slate-200 bg-white shadow-sm hover:shadow-lg"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-block rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 text-xs font-bold text-white">
                  MEILLEUR RAPPORT
                </span>
              </div>
            )}

            <div className={`rounded-t-2xl bg-gradient-to-r ${plan.color} p-6 text-white`}>
              <div className="mb-3 inline-flex rounded-lg bg-white/20 p-2">
                {plan.icon}
              </div>
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <p className="mt-2 text-sm text-white/80">{plan.population}</p>
            </div>

            <div className="p-6">
              {plan.monthlyPrice !== null ? (
                <div className="mb-4">
                  <div className="text-4xl font-bold text-slate-900">
                    {plan.monthlyPrice}€
                  </div>
                  <p className="text-sm text-slate-600">/mois</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {plan.annualPrice}€/an
                  </p>
                  {plan.pricePerHab && (
                    <p className="text-xs text-slate-500">≈ {plan.pricePerHab} par habitant/an</p>
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  <div className="text-2xl font-bold text-slate-900">
                    Tarification personnalisée
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Contactez notre équipe pour un devis adapté
                  </p>
                </div>
              )}

              <ul className="mb-6 space-y-2 text-sm">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex gap-2">
                    {feature.startsWith("✓") ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <X className="h-4 w-4 flex-shrink-0 text-slate-300" />
                    )}
                    <span className={feature.startsWith("•") ? "text-slate-400" : "text-slate-700"}>
                      {feature.replace(/^[✓•] /, "")}
                    </span>
                  </li>
                ))}
              </ul>

              <button className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 font-semibold text-white transition hover:shadow-lg">
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EPCI SECTION ───────────────────────────────────────────────────────────

function EpciSection() {
  return (
    <div>
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-700" />
          <div className="text-sm text-amber-800">
            <strong>Nouveau modèle :</strong> Les intercommunalités sont désormais tarifées par agrégation de communes avec réductions progressives (plus juste et transparent)
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Modèle ANCIEN */}
        <div className="rounded-2xl border border-slate-300 bg-slate-50 p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-900">
            ❌ Ancien modèle (2025)
          </h3>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-white p-3">
              <p className="font-semibold text-slate-900">Population totale EPCI → une seule tranche</p>
              <p className="mt-1 text-slate-600">
                Ex : EPCI 30k hab = tranche Urbain = 490€ + 20% majoration = <strong>588€/mois</strong>
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-slate-700">Problèmes :</p>
              <ul className="space-y-1 text-slate-600">
                <li>• Injuste pour EPCI hétérogènes (petites + grandes communes)</li>
                <li>• Opaque : communes ne voient pas leur coût individuel</li>
                <li>• Majoration +20% arbitraire</li>
                <li>• Désincitant au parrainage</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modèle NOUVEAU */}
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-6">
          <h3 className="mb-4 text-xl font-bold text-emerald-900">
            ✅ Nouveau modèle (2026+)
          </h3>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-white p-3">
              <p className="font-semibold text-slate-900">Tarification par commune + réductions progressives</p>
              <p className="mt-1 text-slate-600">
                Ex : EPCI 2 Village + 5 Bourg + 3 Cité = 2×49 + 5×99 + 3×390 = 2 063€ - 10% = <strong>1 857€/mois</strong>
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-emerald-700">Avantages :</p>
              <ul className="space-y-1 text-slate-600">
                <li>✓ Juste et équitable (paie ce qu'on utilise)</li>
                <li>✓ Transparent (communes voient leur coût)</li>
                <li>✓ Réductions progressives (incentive parrainage)</li>
                <li>✓ Pioneer discount -2 mois Y1 pour tous</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Grille réductions */}
      <div className="mt-8">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Réductions EPCI (par nombre de communes)</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Nombre de communes</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Réduction</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Exemple (coût initial 2 000€/mois)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { communes: "2–5", reduction: "-5%", example: "1 900€" },
                { communes: "6–15", reduction: "-10%", example: "1 800€" },
                { communes: "16–30", reduction: "-15%", example: "1 700€" },
                { communes: "31+", reduction: "-20%", example: "1 600€" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-900 font-medium">{row.communes}</td>
                  <td className="px-6 py-4 text-emerald-700 font-semibold">{row.reduction}</td>
                  <td className="px-6 py-4 text-slate-700">{row.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Plus une EPCI agrège de communes, plus elle économise. Majoration accès dashboard consolidé : +5% appliquée après réduction.
        </p>
      </div>
    </div>
  );
}

// ── SERVICES SECTION ───────────────────────────────────────────────────────

function ServicesSection() {
  const services = [
    {
      name: "Formation agents (4h)",
      description: "Initiation à la plateforme pour modérateurs et admin",
      price: "500€",
      icon: <Users className="h-6 w-6" />,
    },
    {
      name: "Customization dashboard",
      description: "Adaptation couleurs/logo/modules selon commune",
      price: "1 000€",
      icon: <Building2 className="h-6 w-6" />,
    },
    {
      name: "Intégration API SI mairie",
      description: "Liaison base habitants / gestion forces",
      price: "3 000€+",
      icon: <TrendingDown className="h-6 w-6" />,
    },
    {
      name: "Accompagnement transition (30j)",
      description: "Support dédié migration données + formation",
      price: "2 500€",
      icon: <MapPin className="h-6 w-6" />,
    },
    {
      name: "SLA 99,9% (annuel)",
      description: "Monitoring proactif + compensation uptime",
      price: "+15% du plan",
      icon: <Check className="h-6 w-6" />,
    },
    {
      name: "White Label régional",
      description: "Domaine custom + branding complet",
      price: "5 000€/an + 100€/commune",
      icon: <Heart className="h-6 w-6" />,
    },
  ];

  return (
    <div>
      <p className="mb-8 text-center text-slate-700">
        Services à la carte pour optimiser votre déploiement
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition">
            <div className="mb-3 inline-flex rounded-lg bg-blue-100 p-3 text-blue-600">
              {service.icon}
            </div>
            <h3 className="mb-2 font-bold text-slate-900">{service.name}</h3>
            <p className="mb-4 text-sm text-slate-600">{service.description}</p>
            <div className="text-lg font-bold text-blue-600">{service.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CALCULATOR SECTION ─────────────────────────────────────────────────────

function CalculatorSection() {
  const [communes, setCommunes] = useState([
    { name: "Commune A", population: 1500, plan: "Micro" },
  ]);

  const calculatePlan = (pop: number): string => {
    if (pop < 500) return "Hameau";
    if (pop < 3500) return "Village";
    if (pop < 10000) return "Bourg";
    if (pop < 25000) return "Bastide";
    if (pop < 50000) return "Cité";
    return "Métropole";
  };

  const getPlanPrice = (plan: string): number => {
    const prices: Record<string, number> = {
      Hameau: 19,
      Village: 49,
      Bourg: 99,
      Bastide: 189,
      Cité: 390,
      Métropole: 590,
    };
    return prices[plan] || 0;
  };

  const totalMonthly = communes
    .reduce((sum, c) => sum + getPlanPrice(calculatePlan(c.population)), 0);

  const totalAnnual = totalMonthly * 12;
  const communes_count = communes.length;
  const reductionPercent = communes_count <= 5 ? 5 : communes_count <= 15 ? 10 : communes_count <= 30 ? 15 : 20;
  const reductionAmount = totalMonthly * (reductionPercent / 100);
  const finalMonthly = totalMonthly - reductionAmount;
  const finalAnnual = finalMonthly * 12;

  return (
    <div className="max-w-2xl">
      <p className="mb-8 text-slate-700">
        Simulez le coût de votre EPCI avec le nouveau modèle d'agrégation
      </p>

      {/* Communes list */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-bold text-slate-900">Communes de l'EPCI</h3>
        <div className="space-y-3">
          {communes.map((c, i) => (
            <div key={i} className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Nom commune"
                value={c.name}
                onChange={(e) => {
                  const newCommunes = [...communes];
                  newCommunes[i].name = e.target.value;
                  setCommunes(newCommunes);
                }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Population"
                value={c.population}
                onChange={(e) => {
                  const newCommunes = [...communes];
                  newCommunes[i].population = parseInt(e.target.value) || 0;
                  setCommunes(newCommunes);
                }}
                className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="w-24 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900">
                {calculatePlan(c.population)}
              </div>
              <button
                onClick={() => setCommunes(communes.filter((_, j) => j !== i))}
                className="text-red-600 hover:text-red-700 font-semibold text-sm"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setCommunes([...communes, { name: "", population: 1000, plan: "Micro" }])}
          className="mt-4 rounded-lg bg-blue-100 px-4 py-2 font-semibold text-blue-600 hover:bg-blue-200 text-sm"
        >
          + Ajouter commune
        </button>
      </div>

      {/* Calculation */}
      <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-6">
        <h3 className="mb-6 font-bold text-emerald-900">Coût EPCI détaillé</h3>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">Somme coûts individuels :</span>
            <span className="font-semibold text-slate-900">{totalMonthly.toFixed(2)}€/mois</span>
          </div>

          <div className="flex justify-between border-t border-emerald-200 pt-4 text-sm">
            <span className="text-slate-700">Réduction EPCI ({communes_count} communes) :</span>
            <span className="font-semibold text-red-600">-{reductionPercent}%</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-700">Montant réduction :</span>
            <span className="font-semibold text-red-600">-{reductionAmount.toFixed(2)}€</span>
          </div>

          <div className="flex justify-between border-t-2 border-emerald-300 pt-4 text-lg">
            <span className="font-bold text-emerald-900">Tarif EPCI final :</span>
            <span className="font-bold text-emerald-700">{finalMonthly.toFixed(2)}€/mois</span>
          </div>

          <div className="flex justify-between text-sm text-slate-600">
            <span>Annuel (×12 mois) :</span>
            <span className="font-semibold text-slate-900">{finalAnnual.toFixed(0)}€</span>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-white p-4 text-sm text-slate-700">
          <p>
            <strong>Économie vs ancien modèle :</strong> Votre EPCI économise par rapport à une tarification "population totale + 20%"
          </p>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
