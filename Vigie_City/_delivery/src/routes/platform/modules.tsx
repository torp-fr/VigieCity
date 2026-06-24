import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, Megaphone, Wrench, MapPin, Bell, BarChart3,
  Code2, Palette, CheckCircle2, XCircle, Minus, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/modules")({
  component: ModulesPlatform,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type PlanKey = "starter" | "pro" | "enterprise";

type Module = {
  id:          string;
  icon:        React.ElementType;
  name:        string;
  description: string;
  features:    string[];
  plans:       Record<PlanKey, boolean | "partial">;
};

// ─── Données modules ──────────────────────────────────────────────────────────
const MODULES: Module[] = [
  {
    id:          "securite",
    icon:        Shield,
    name:        "Sécurité & Signalements",
    description: "Permettez aux citoyens de signaler des incidents géolocalisés, avec gestion par les modérateurs et suivi de statut.",
    features:    [
      "Signalements géolocalisés avec photo",
      "Catégories configurables",
      "Workflow modération (ouvert → traité → résolu)",
      "Historique et export CSV",
      "Alertes email aux modérateurs",
    ],
    plans: { starter: true, pro: true, enterprise: true },
  },
  {
    id:          "communication",
    icon:        Megaphone,
    name:        "Communication & Publications",
    description: "Publiez des actualités, événements et informations pratiques. Avec images, catégories et date d'expiration.",
    features:    [
      "Publications avec image 16:9",
      "Catégories personnalisables",
      "Planification et expiration",
      "Temps réel (Supabase Realtime)",
      "Export et historique",
    ],
    plans: { starter: true, pro: true, enterprise: true },
  },
  {
    id:          "services",
    icon:        Wrench,
    name:        "Services & Contacts",
    description: "Référencez les contacts d'urgence locaux, les services municipaux et la base de connaissances citoyenne.",
    features:    [
      "Contacts d'urgence locaux (CRUD)",
      "Numéros nationaux préconfigurés",
      "Base de connaissances Markdown",
      "Catégorisation et tags",
      "Visibilité publié / brouillon",
    ],
    plans: { starter: "partial", pro: true, enterprise: true },
  },
  {
    id:          "carte",
    icon:        MapPin,
    name:        "Carte interactive",
    description: "Visualisation cartographique des signalements, alertes et points d'intérêt sur la commune.",
    features:    [
      "Carte Leaflet/Mapbox intégrée",
      "Calques signalements et alertes",
      "Filtres par catégorie et période",
      "Périmètre de la commune",
      "Export GeoJSON",
    ],
    plans: { starter: false, pro: true, enterprise: true },
  },
  {
    id:          "push",
    icon:        Bell,
    name:        "Notifications Push",
    description: "Envoyez des notifications push ciblées aux citoyens abonnés à votre commune.",
    features:    [
      "Notifications push Web & Mobile",
      "Ciblage par commune",
      "Templates prédéfinis",
      "Historique d'envoi",
      "Opt-in / Opt-out citoyen",
    ],
    plans: { starter: false, pro: "partial", enterprise: true },
  },
  {
    id:          "stats",
    icon:        BarChart3,
    name:        "Statistiques & Analytics",
    description: "Tableau de bord d'indicateurs clés : activité citoyenne, taux de résolution, engagement et rétention.",
    features:    [
      "Dashboard KPIs en temps réel",
      "Historique 30 / 90 / 365 jours",
      "Scores d'engagement par commune",
      "Détection churn automatique",
      "Export PDF des rapports",
    ],
    plans: { starter: false, pro: "partial", enterprise: true },
  },
  {
    id:          "api",
    icon:        Code2,
    name:        "API & Intégrations",
    description: "Connectez VigieCity à vos outils existants via l'API REST et les Webhooks.",
    features:    [
      "API REST documentée (OpenAPI)",
      "Webhooks configurables",
      "SDK JavaScript/TypeScript",
      "Authentification OAuth2",
      "Sandbox de test dédié",
    ],
    plans: { starter: false, pro: false, enterprise: true },
  },
  {
    id:          "white-label",
    icon:        Palette,
    name:        "White-label & Personnalisation",
    description: "Déployez VigieCity sous votre propre identité visuelle : logo, couleurs, domaine personnalisé.",
    features:    [
      "Votre logo et couleurs",
      "Domaine personnalisé (CNAME)",
      "PWA installable sous votre marque",
      "Emails transactionnels brandés",
      "Suppression mentions VigieCity",
    ],
    plans: { starter: false, pro: false, enterprise: true },
  },
];

// ─── Plans (matrice fonctionnelle — nommage simplifié pour la doc) ────────────
// NOTE: Ces clés (starter/pro/enterprise) sont illustratives pour la matrice de
// fonctionnalités. Les vrais plans commerciaux (Nano/Micro/Local/Urbain/Métropole)
// sont gérés dans la table `plans` et visibles sur /platform/plans.
const FEATURE_PLANS: { key: PlanKey; name: string; color: string }[] = [
  { key: "starter",    name: "Starter",    color: "bg-muted"      },
  { key: "pro",        name: "Pro",        color: "bg-primary"    },
  { key: "enterprise", name: "Enterprise", color: "bg-purple-600" },
];

function PlanBadge({ status }: { status: boolean | "partial" }) {
  if (status === true)      return <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />;
  if (status === "partial") return <Minus        className="mx-auto h-5 w-5 text-yellow-500" />;
  return                           <XCircle      className="mx-auto h-5 w-5 text-muted-foreground/40" />;
}

// ─── Section tarifs dynamique (table plans) ───────────────────────────────────
function PlansTarifsSection() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["platform-plans-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, price_monthly, max_users, max_communes, is_active, display_order")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Tarifs commerciaux</h2>
      <p className="text-xs text-muted-foreground">
        Plans actifs en base · Modifiables depuis{" "}
        <a href="/platform/plans" className="underline hover:text-foreground">/platform/plans</a>
      </p>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(plans ?? []).map((p, i) => {
            const colors = [
              "bg-slate-500", "bg-blue-500", "bg-primary",
              "bg-purple-600", "bg-amber-600",
            ];
            const color = colors[i % colors.length];
            const priceLabel = p.price_monthly != null
              ? `${p.price_monthly} €/mois`
              : "Sur devis";
            const usersLabel = p.max_users != null
              ? `${p.max_users.toLocaleString("fr-FR")} utilisateurs max`
              : "Illimité";
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-card p-5 text-center"
              >
                <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${color}`}>
                  {p.name}
                </span>
                <div className="mt-3 text-xl font-extrabold">{priceLabel}</div>
                <p className="mt-1 text-xs text-muted-foreground">{usersLabel}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Composant ────────────────────────────────────────────────────────────────
function ModulesPlatform() {
  return (
    <PlatformShell activePath="/platform/modules">
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold">Modules & Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentation des fonctionnalités disponibles selon votre offre.
        </p>
      </div>

      {/* Tableau comparatif des plans */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Comparatif des plans</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Module
                </th>
                {FEATURE_PLANS.map((p) => (
                  <th key={p.key} className="px-3 py-3 text-center">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold text-white",
                        p.color,
                      ].join(" ")}
                    >
                      {p.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod, idx) => {
                const Icon = mod.icon;
                return (
                  <tr
                    key={mod.id}
                    className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="font-medium">{mod.name}</span>
                      </div>
                    </td>
                    {FEATURE_PLANS.map((p) => (
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
        <p className="mt-2 text-[11px] text-muted-foreground">
          <Minus className="inline h-3 w-3 text-yellow-500" /> = fonctionnalité partielle ou limitée
        </p>
      </section>

      {/* Détail par module */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Détail des modules</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                {/* Titre */}
                <div className="mb-3 flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">{mod.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                </div>

                {/* Fonctionnalités */}
                <ul className="mb-3 space-y-1">
                  {mod.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Plans */}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border mt-2">
                  {FEATURE_PLANS.map((p) => {
                    const status = mod.plans[p.key];
                    if (status === false) return null;
                    return (
                      <span
                        key={p.key}
                        className={[
                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white",
                          status === "partial" ? "opacity-70 " : "",
                          p.color,
                        ].join(" ")}
                      >
                        {p.name}
                        {status === "partial" ? " *" : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tarifs — chargés depuis la table plans */}
      <PlansTarifsSection />
    </div>
    </PlatformShell>
  );
}
