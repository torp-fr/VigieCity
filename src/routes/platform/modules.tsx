import { createFileRoute } from "@tanstack/react-router";
import {
  Shield, Megaphone, Wrench, MapPin, Bell, BarChart3,
  Code2, Palette, CheckCircle2, XCircle, Minus, Smartphone,
} from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/modules")({
  component: ModulesPlatform,
});

// Plans reels VigieCity
type PlanKey = "nano" | "micro" | "local" | "urbain" | "metropole";

type Module = {
  id:          string;
  icon:        React.ElementType;
  name:        string;
  description: string;
  features:    string[];
  plans:       Record<PlanKey, boolean | "partial">;
};

const MODULES: Module[] = [
  {
    id:          "signalements",
    icon:        Shield,
    name:        "Securite & Signalements",
    description: "Les citoyens signalent des incidents geoloicalises avec photo. Workflow complet : ouvert, traite, resolu.",
    features:    [
      "Signalements geoloicalises avec photo",
      "Categories configurables par commune",
      "Workflow moderation (ouvert -> traite -> resolu)",
      "Historique et export CSV",
      "Notifications email aux moderateurs",
    ],
    plans: { nano: true, micro: true, local: true, urbain: true, metropole: true },
  },
  {
    id:          "publications",
    icon:        Megaphone,
    name:        "Publications & Actualites",
    description: "Publiez des actualites, evenements et informations pratiques avec images, categories et date d'expiration.",
    features:    [
      "Publications avec image 16:9",
      "Categories personnalisables",
      "Planification et expiration",
      "Temps reel (Supabase Realtime)",
      "Historique et moderation",
    ],
    plans: { nano: true, micro: true, local: true, urbain: true, metropole: true },
  },
  {
    id:          "services",
    icon:        Wrench,
    name:        "Services & Contacts",
    description: "Referencez les contacts d'urgence locaux, les services municipaux et la base de connaissances citoyenne.",
    features:    [
      "Contacts d'urgence locaux (CRUD)",
      "Numeros nationaux preconfigures",
      "Base de connaissances Markdown",
      "Categorisation et tags",
      "Visibilite publie / brouillon",
    ],
    plans: { nano: true, micro: true, local: true, urbain: true, metropole: true },
  },
  {
    id:          "alertes",
    icon:        Bell,
    name:        "Alertes & Notifications Push",
    description: "Envoyez des alertes push ciblees aux citoyens : meteo, coupures, incidents, avis de securite.",
    features:    [
      "Notifications push Web & Mobile (VAPID)",
      "Ciblage par commune",
      "Templates predefined",
      "Historique d'envoi",
      "Opt-in / Opt-out citoyen",
    ],
    plans: { nano: true, micro: true, local: true, urbain: true, metropole: true },
  },
  {
    id:          "carte",
    icon:        MapPin,
    name:        "Carte interactive",
    description: "Visualisation cartographique des signalements, alertes et points d'interet sur la commune.",
    features:    [
      "Carte integree (Leaflet)",
      "Calques signalements et alertes",
      "Filtres par categorie et periode",
      "Perimetre de la commune",
      "Export GeoJSON",
    ],
    plans: { nano: "partial", micro: true, local: true, urbain: true, metropole: true },
  },
  {
    id:          "stats",
    icon:        BarChart3,
    name:        "Statistiques & Analytics",
    description: "Tableau de bord d'indicateurs cles : activite citoyenne, taux de resolution, engagement et retention.",
    features:    [
      "Dashboard KPIs en temps reel",
      "Historique 30 / 90 / 365 jours",
      "Scores d'engagement par commune",
      "Detection churn automatique",
      "Export PDF des rapports",
    ],
    plans: { nano: false, micro: "partial", local: true, urbain: true, metropole: true },
  },
  {
    id:          "pwa",
    icon:        Smartphone,
    name:        "PWA & Application mobile",
    description: "Application installable sur iOS et Android, sans App Store. Experience native pour les habitants.",
    features:    [
      "PWA installable (Add to Home Screen)",
      "Mode hors-ligne partiel",
      "Icone et splash screen personnalises",
      "Notifications push via Service Worker",
      "Mise a jour automatique",
    ],
    plans: { nano: true, micro: true, local: true, urbain: true, metropole: true },
  },
  {
    id:          "api",
    icon:        Code2,
    name:        "API & Integrations",
    description: "Connectez VigieCity a vos outils existants via l'API REST et les Webhooks.",
    features:    [
      "API REST documentee",
      "Webhooks configurables",
      "Authentification securisee",
      "Export CSV / JSON",
      "Sandbox de test",
    ],
    plans: { nano: false, micro: false, local: false, urbain: true, metropole: true },
  },
  {
    id:          "white-label",
    icon:        Palette,
    name:        "White-label & Personnalisation",
    description: "Deploiez VigieCity sous votre propre identite visuelle : logo, couleurs, domaine personnalise.",
    features:    [
      "Votre logo et couleurs",
      "Domaine personnalise (CNAME)",
      "PWA installable sous votre marque",
      "Emails transactionnels brandes",
      "Suppression mentions VigieCity",
    ],
    plans: { nano: false, micro: false, local: false, urbain: false, metropole: true },
  },
];

const PLANS: { key: PlanKey; name: string; range: string; price: string; color: string }[] = [
  { key: "nano",     name: "Nano",     range: "< 1 000 hab.",          price: "49 EUR/mois",   color: "bg-slate-500"   },
  { key: "micro",    name: "Micro",    range: "1 001 - 3 500 hab.",    price: "99 EUR/mois",   color: "bg-blue-500"    },
  { key: "local",    name: "Local",    range: "3 501 - 10 000 hab.",   price: "189 EUR/mois",  color: "bg-emerald-600" },
  { key: "urbain",   name: "Urbain",   range: "10 001 - 50 000 hab.",  price: "490 EUR/mois",  color: "bg-violet-600"  },
  { key: "metropole",name: "Metropole",range: "> 50 000 hab.",          price: "Sur devis",     color: "bg-amber-600"   },
];

function PlanBadge({ status }: { status: boolean | "partial" }) {
  if (status === true)      return <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />;
  if (status === "partial") return <Minus        className="mx-auto h-5 w-5 text-yellow-500" />;
  return                           <XCircle      className="mx-auto h-5 w-5 text-slate-200"  />;
}

function ModulesPlatform() {
  return (
    <PlatformShell activePath="/platform/modules">
      <div className="space-y-8">

        {/* En-tete */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Modules & Plans</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fonctionnalites disponibles selon le plan tarifaire de chaque commune.
          </p>
        </div>

        {/* Tarifs */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Grille tarifaire</h2>
          <div className="grid grid-cols-5 gap-3">
            {PLANS.map((p) => (
              <div key={p.key} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${p.color}`}>
                  {p.name}
                </span>
                <p className="mt-2 text-lg font-extrabold text-slate-900">{p.price}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{p.range}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tableau comparatif */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Comparatif des modules</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Module</th>
                  {PLANS.map((p) => (
                    <th key={p.key} className="px-3 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${p.color}`}>
                        {p.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MODULES.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <tr key={mod.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-blue-600" />
                          <span className="font-medium text-slate-900">{mod.name}</span>
                        </div>
                      </td>
                      {PLANS.map((p) => (
                        <td key={p.key} className="px-3 py-3 text-center">
                          <PlanBadge status={mod.plans[p.key]} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            <Minus className="inline h-3 w-3 text-yellow-500" /> = fonctionnalite partielle ou limitee selon la taille de la commune
          </p>
        </section>

        {/* Detail par module */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Detail des modules</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const availablePlans = PLANS.filter((p) => mod.plans[p.key] !== false);
              return (
                <div key={mod.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{mod.name}</h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{mod.description}</p>
                    </div>
                  </div>
                  <ul className="mb-3 space-y-1">
                    {mod.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-2">
                    {availablePlans.map((p) => (
                      <span
                        key={p.key}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${p.color} ${mod.plans[p.key] === "partial" ? "opacity-60" : ""}`}
                      >
                        {p.name}{mod.plans[p.key] === "partial" ? " *" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </PlatformShell>
  );
}
