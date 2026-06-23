import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2, ArrowRight, ChevronDown,
  BellRing, MapPin, CalendarDays, Newspaper, MessageSquare,
  Home, Network, Building2,
  LayoutDashboard, CheckSquare, BarChart3, Map as MapIcon, Users,
  X, Sparkles, ToggleLeft, ToggleRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/icons/icon.svg" },
    ],
    meta: [
      { title: "VigieCity — L'application citoyenne pour la vie de votre commune" },
      {
        name: "description",
        content:
          "VigieCity connecte vos habitants à leur commune : alertes, signalements, agenda, actualités locales, messagerie citoyenne. Une seule app pour toute la vie locale.",
      },
      {
        name: "keywords",
        content:
          "application citoyenne commune, alertes collectivité, signalement habitant, vie locale numérique, commune connectée, communauté de communes application",
      },
      { property: "og:title", content: "VigieCity — L'app citoyenne pour votre commune" },
      {
        property: "og:description",
        content:
          "Alertes, signalements, agenda, infos locales — tout ce dont vos habitants ont besoin pour rester connectés à leur territoire.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

// ── Logo (icon.svg depuis /public/icons/) ─────────────────────────────────────

function VCLogo({ size = 34 }: { size?: number }) {
  return (
    <img
      src="/icons/icon.svg"
      alt="VigieCity"
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
    />
  );
}

// ── Contenu écran app ─────────────────────────────────────────────────────────

function AppContent() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        background: "#f0f4f8",
      }}
    >
      {/* Status bar */}
      <div
        style={{
          background: "#1e3a8a",
          padding: "12px 18px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>9:41</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 8 }}>▐▐▐</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 8 }}>WiFi</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 8 }}>⚡87%</span>
        </div>
      </div>

      {/* App header */}
      <div
        style={{
          background: "linear-gradient(150deg, #1e3a8a 0%, #1d4ed8 100%)",
          padding: "8px 14px 14px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ color: "#bfdbfe", fontSize: 9, margin: 0, fontWeight: 500 }}>
              Saint-Martin-des-Champs
            </p>
            <p
              style={{
                color: "white",
                fontSize: 14,
                fontWeight: 800,
                margin: "2px 0 0",
              }}
            >
              Bonjour, Marie 👋
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.18)",
              borderRadius: 18,
              padding: "5px 9px",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12 }}>⛅</span>
            <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>18°</span>
          </div>
        </div>
        {/* Mini search */}
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            padding: "7px 11px",
            marginTop: 9,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>🔍</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>
            Rechercher...
          </span>
        </div>
      </div>

      {/* Urgent alert */}
      <div style={{ margin: "8px 8px 0", flexShrink: 0 }}>
        <div
          style={{
            background: "linear-gradient(90deg, #b91c1c, #dc2626)",
            borderRadius: 11,
            padding: "8px 11px",
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <span style={{ fontSize: 15 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <p
              style={{
                color: "white",
                fontSize: 8,
                fontWeight: 800,
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Alerte urgente
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 9,
                margin: "2px 0 0",
              }}
            >
              Coupure eau — Secteur Nord · 14h–18h
            </p>
          </div>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>›</span>
        </div>
      </div>

      {/* Quick actions 2×2 */}
      <div style={{ padding: "8px 8px 0", flexShrink: 0 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}
        >
          {[
            { icon: "🔔", label: "Alertes", badge: "3", bg: "#fff7ed", border: "#f59e0b" },
            { icon: "📍", label: "Signaler", badge: null, bg: "#fff1f2", border: "#f43f5e" },
            { icon: "📅", label: "Agenda", badge: "5", bg: "#eff6ff", border: "#3b82f6" },
            { icon: "📰", label: "Infos", badge: "12", bg: "#f0fdf4", border: "#22c55e" },
          ].map((a) => (
            <div
              key={a.label}
              style={{
                background: a.bg,
                border: `1px solid ${a.border}33`,
                borderRadius: 11,
                padding: "9px 10px",
                display: "flex",
                alignItems: "center",
                gap: 7,
                position: "relative",
              }}
            >
              <span style={{ fontSize: 17 }}>{a.icon}</span>
              <span
                style={{ fontSize: 10, fontWeight: 700, color: "#1f2937" }}
              >
                {a.label}
              </span>
              {a.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 7,
                    background: a.border,
                    color: "white",
                    fontSize: 7,
                    fontWeight: 800,
                    borderRadius: 8,
                    padding: "1px 4px",
                  }}
                >
                  {a.badge}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fil local */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "6px 8px 0",
        }}
      >
        <p
          style={{
            fontSize: 8,
            fontWeight: 800,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: 0.7,
            margin: "0 0 5px",
          }}
        >
          Fil local
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {/* Event */}
          <div
            style={{
              background: "white",
              borderRadius: 11,
              padding: "7px 9px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                background: "#eff6ff",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{ fontSize: 7, color: "#3b82f6", fontWeight: 800 }}
              >
                JUN
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: "#1e3a8a",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                22
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#1f2937",
                  margin: 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                Fête de quartier — Place du bourg
              </p>
              <p style={{ fontSize: 8, color: "#6b7280", margin: "1px 0 0" }}>
                14h–20h · Organisé par la mairie
              </p>
            </div>
          </div>

          {/* Signal */}
          <div
            style={{
              background: "white",
              borderRadius: 11,
              padding: "7px 9px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                background: "#fff7ed",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 17,
              }}
            >
              🚧
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#1f2937",
                  margin: 0,
                }}
              >
                Nid-de-poule · Route D12
              </p>
              <p style={{ fontSize: 8, color: "#6b7280", margin: "1px 0 0" }}>
                Signalé il y a 30 min · Pris en charge ✓
              </p>
            </div>
            <span
              style={{
                fontSize: 7,
                fontWeight: 800,
                background: "#f59e0b",
                color: "white",
                borderRadius: 8,
                padding: "2px 5px",
                flexShrink: 0,
              }}
            >
              En cours
            </span>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div
        style={{
          background: "white",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "7px 10px 12px",
          flexShrink: 0,
        }}
      >
        {[
          { icon: "🏠", label: "Accueil", active: true },
          { icon: "🗺️", label: "Carte", active: false },
          { icon: "🔔", label: "Alertes", active: false },
          { icon: "👤", label: "Profil", active: false },
        ].map((tab) => (
          <div
            key={tab.label}
            style={{ textAlign: "center", opacity: tab.active ? 1 : 0.38 }}
          >
            <span style={{ fontSize: 17 }}>{tab.icon}</span>
            <p
              style={{
                fontSize: 7,
                margin: "1px 0 0",
                fontWeight: 700,
                color: tab.active ? "#1e3a8a" : "#94a3b8",
              }}
            >
              {tab.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Phone mockup 3D front-facing ──────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div style={{ position: "relative", paddingBottom: 28, paddingRight: 30 }}>
      {/* Ambient blue glow */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 320,
          height: 460,
          background:
            "radial-gradient(ellipse, rgba(59,130,246,0.22) 0%, transparent 68%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Floating push notification */}
      <div
        style={{
          position: "absolute",
          top: 72,
          right: -12,
          width: 196,
          background: "white",
          borderRadius: 16,
          padding: "10px 12px",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)",
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 5,
          }}
        >
          <img
            src="/icons/icon.svg"
            width={18}
            height={18}
            style={{ borderRadius: 5 }}
            alt=""
          />
          <span
            style={{ fontSize: 9, fontWeight: 700, color: "#6b7280" }}
          >
            VigieCity
          </span>
          <span
            style={{ marginLeft: "auto", fontSize: 8, color: "#9ca3af" }}
          >
            maintenant
          </span>
        </div>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#1f2937",
            margin: 0,
          }}
        >
          ⚠️ Alerte eau — Secteur Nord
        </p>
        <p style={{ fontSize: 9, color: "#6b7280", margin: "2px 0 0" }}>
          Coupure 14h–18h · Rue des Acacias
        </p>
      </div>

      {/* Shadow pool under phone */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: "12%",
          right: "12%",
          height: 32,
          background:
            "radial-gradient(ellipse, rgba(0,0,0,0.38) 0%, transparent 70%)",
          filter: "blur(10px)",
          zIndex: 0,
        }}
      />

      {/* Phone chassis */}
      <div
        style={{
          width: 282,
          height: 578,
          borderRadius: 47,
          background:
            "linear-gradient(162deg, #1e1e2e 0%, #131320 52%, #070710 100%)",
          border: "1px solid #28283e",
          boxShadow: `
            0 52px 88px rgba(0,0,0,0.65),
            0 20px 40px rgba(0,0,0,0.42),
            0 8px 18px rgba(0,0,0,0.28),
            inset 0 1px 0 rgba(255,255,255,0.13),
            inset 0 0 0 1px rgba(255,255,255,0.03)
          `,
          position: "relative",
          zIndex: 5,
        }}
      >
        {/* Chassis light sheen top-left */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 170,
            height: 220,
            background:
              "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.07) 0%, transparent 55%)",
            borderRadius: "47px 0 0 0",
            pointerEvents: "none",
          }}
        />

        {/* Side buttons — left (silent + volume) */}
        <div
          style={{
            position: "absolute",
            left: -3,
            top: 98,
            width: 3,
            height: 28,
            background: "#18182a",
            borderRadius: "2px 0 0 2px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -3,
            top: 138,
            width: 3,
            height: 44,
            background: "#18182a",
            borderRadius: "2px 0 0 2px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -3,
            top: 194,
            width: 3,
            height: 44,
            background: "#18182a",
            borderRadius: "2px 0 0 2px",
          }}
        />

        {/* Side button — right (power) */}
        <div
          style={{
            position: "absolute",
            right: -3,
            top: 148,
            width: 3,
            height: 66,
            background: "#18182a",
            borderRadius: "0 2px 2px 0",
          }}
        />

        {/* Screen */}
        <div
          style={{
            position: "absolute",
            inset: 9,
            borderRadius: 38,
            overflow: "hidden",
            background: "#f0f4f8",
          }}
        >
          {/* Dynamic Island */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 98,
              height: 30,
              background: "#000",
              borderRadius: 15,
              zIndex: 30,
            }}
          />

          {/* Glass sheen */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(148deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 28%, transparent 48%)",
              zIndex: 100,
              pointerEvents: "none",
              borderRadius: 38,
            }}
          />

          <AppContent />
        </div>

        {/* Home indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 90,
            height: 4,
            background: "rgba(255,255,255,0.16)",
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const MODULES = [
  {
    Icon: BellRing,
    title: "Alertes & urgences",
    desc: "Diffusez instantanément des alertes à vos habitants : météo, coupures, incidents, avis de sécurité. Notifications push en temps réel.",
    color: "#f59e0b",
  },
  {
    Icon: MapPin,
    title: "Signalements citoyens",
    desc: "Les habitants signalent un problème en quelques secondes, avec photo et localisation GPS. Suivi en temps réel de l'avancement.",
    color: "#f43f5e",
  },
  {
    Icon: CalendarDays,
    title: "Agenda & événements",
    desc: "Publiez et gérez les événements de votre commune. Les habitants restent informés et peuvent ajouter les dates à leur calendrier.",
    color: "#3b82f6",
  },
  {
    Icon: Newspaper,
    title: "Actualités locales",
    desc: "Un fil d'information local, directement depuis votre mairie. Délibérations, travaux, vie associative, informations pratiques.",
    color: "#22c55e",
  },
  {
    Icon: MessageSquare,
    title: "Messagerie citoyenne",
    desc: "Un canal de communication direct entre les habitants et les services municipaux. Moins d'appels, plus d'efficacité.",
    color: "#8b5cf6",
  },
];

const FOR_WHO = [
  {
    Icon: Home,
    title: "Communes rurales",
    sub: "Petites communes, grands besoins",
    desc: "Une solution clé en main, sans équipe technique requise. Vos habitants connectés à la vie locale du village.",
  },
  {
    Icon: Network,
    title: "Communautés de communes",
    sub: "Superviser à l'échelle intercommunale",
    desc: "Un tableau de bord unifié pour piloter plusieurs communes membres, avec vue consolidée et gestion décentralisée.",
  },
  {
    Icon: Building2,
    title: "Communes urbaines",
    sub: "Grandes villes, populations actives",
    desc: "Des fonctionnalités avancées pour gérer un volume élevé de signalements, événements et notifications push.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Configuration en 24h",
    desc: "Renseignez les informations de votre collectivité, personnalisez les catégories de signalements et les canaux d'alerte. Notre équipe vous accompagne.",
  },
  {
    n: "02",
    title: "Déploiement auprès des agents",
    desc: "Vos agents reçoivent l'accès à l'espace d'administration. Ils modèrent les signalements, publient des actualités et envoient des alertes.",
  },
  {
    n: "03",
    title: "Engagement des habitants",
    desc: "Les habitants téléchargent l'app, créent leur compte et commencent à interagir avec les services de leur commune.",
  },
];

const ADMIN_FEATURES = [
  { Icon: LayoutDashboard, t: "Tableau de bord temps réel" },
  { Icon: CheckSquare, t: "Modération des signalements" },
  { Icon: BellRing, t: "Envoi de notifications push" },
  { Icon: BarChart3, t: "Statistiques d'usage" },
  { Icon: MapIcon, t: "Carte des signalements" },
  { Icon: Users, t: "Gestion des administrateurs" },
];


// ── Calculateur tarifaire INSEE ───────────────────────────────────────────────

type CommuneResult = { nom: string; code: string; population: number };

function getPopulationTierIndex(population: number): number {
  if (population < 1000)  return 0; // Nano
  if (population < 2500)  return 1; // Micro
  if (population < 10000) return 2; // Local
  if (population < 50000) return 3; // Urbain
  return 4;                          // Métropole
}

function CommuneCalculatorSection() {
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState<CommuneResult[]>([]);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState<CommuneResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ferme le dropdown si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,population&limit=7&boost=population`;
      const res  = await fetch(url);
      const data = await res.json() as CommuneResult[];
      setResults(data.filter((c) => c.population != null && c.population > 0));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 280);
  };

  const handleSelect = (c: CommuneResult) => {
    setSelected(c);
    setQuery(c.nom);
    setResults([]);
    setShowDropdown(false);
  };

  const tierIndex = selected ? getPopulationTierIndex(selected.population) : null;
  // PRICING_TIERS n'est pas encore déclaré ici, on le référence après
  // → on passe par les mêmes constantes définies plus bas dans le fichier

  const TIER_DATA = [
    { name: "Nano",      range: "< 1 000 hab.",          monthly: 49,  annual: 490  },
    { name: "Micro",     range: "1 000 – 2 500 hab.",    monthly: 99,  annual: 990  },
    { name: "Local",     range: "2 500 – 10 000 hab.",   monthly: 189, annual: 1890 },
    { name: "Urbain",    range: "10 000 – 50 000 hab.",  monthly: 490, annual: 4900 },
    { name: "Métropole", range: "> 50 000 hab.",          monthly: null, annual: null },
  ] as const;

  const tier = tierIndex !== null ? TIER_DATA[tierIndex] : null;

  return (
    <section style={{ background: "linear-gradient(150deg, #1e3a8a 0%, #1d4ed8 100%)" }} className="py-20">
      <div className="mx-auto max-w-2xl px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">
            Calculateur de tarif
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">
            Quel est le tarif pour votre commune ?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-blue-200">
            Entrez le nom de votre commune — la population est récupérée directement
            depuis l'INSEE et votre plan s'affiche instantanément.
          </p>
        </div>

        {/* Champ de recherche */}
        <div ref={containerRef} className="relative mt-10">
          <div
            className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-xl"
            style={{ border: "2px solid transparent" }}
          >
            <MapPin className="h-5 w-5 flex-shrink-0 text-blue-400" />
            <input
              type="text"
              value={query}
              onChange={handleInput}
              onFocus={() => query.length >= 2 && results.length > 0 && setShowDropdown(true)}
              placeholder="Nom de votre commune ou code postal..."
              className="flex-1 bg-transparent text-base font-medium text-gray-900 placeholder-gray-400 outline-none"
            />
            {loading && (
              <span className="text-xs text-gray-400">Recherche…</span>
            )}
          </div>

          {/* Dropdown résultats */}
          {showDropdown && results.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
            >
              {results.map((c, i) => (
                <button
                  key={c.code}
                  onClick={() => handleSelect(c)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-blue-50"
                  style={{
                    borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
                  }}
                >
                  <div>
                    <span className="font-semibold text-gray-900">{c.nom}</span>
                    <span className="ml-2 text-xs text-gray-400">{c.code}</span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: "#eff6ff", color: "#1e3a8a" }}
                  >
                    {c.population.toLocaleString("fr-FR")} hab.
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Résultat : plan adapté */}
        {selected && tier && (
          <div
            className="mt-8 overflow-hidden rounded-2xl bg-white"
            style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}
          >
            {/* Bandeau commune */}
            <div
              className="flex items-center gap-3 px-7 py-4"
              style={{ background: "#f8faff", borderBottom: "1px solid #e0e7ff" }}
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ background: "#eff6ff" }}
              >
                🏛️
              </div>
              <div>
                <p className="font-bold text-gray-900">{selected.nom}</p>
                <p className="text-xs text-gray-500">
                  {selected.population.toLocaleString("fr-FR")} habitants · Code INSEE {selected.code}
                </p>
              </div>
              <button
                onClick={() => { setSelected(null); setQuery(""); }}
                className="ml-auto rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tarif */}
            <div className="px-7 py-7 text-center">
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "#1e3a8a" }}
              >
                Plan recommandé
              </p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">
                {tier.name}
              </p>
              <p className="text-sm text-gray-400">{tier.range}</p>

              {tier.monthly === null ? (
                <>
                  <p className="mt-5 text-4xl font-extrabold text-gray-900">
                    Sur devis
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Tarif personnalisé · SLA et accompagnement adaptés
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-5 flex items-end justify-center gap-2">
                    <span className="text-5xl font-extrabold text-gray-900">
                      {tier.monthly} €
                    </span>
                    <span className="mb-2 text-gray-400">/mois HT</span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold" style={{ color: "#1e3a8a" }}>
                    ou {tier.annual?.toLocaleString("fr-FR")} €/an HT{" "}
                    <span className="font-normal text-gray-400">(2 mois offerts)</span>
                  </p>
                </>
              )}

              {/* Features condensées */}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {["Tous modules inclus", "App iOS & Android", "Espace admin web", "Support inclus"].map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: "#f0fdf4", color: "#15803d" }}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {f}
                  </span>
                ))}
              </div>

              <a
                href={`mailto:contact@vigiecity.fr?subject=Demande de proposition VigieCity — ${encodeURIComponent(selected.nom)}&body=Bonjour,%0A%0AJe souhaite obtenir une proposition pour la commune de ${encodeURIComponent(selected.nom)} (${selected.population.toLocaleString("fr-FR")} habitants).%0A%0AMerci.`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                Demander une proposition pour {selected.nom}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Note de bas de section */}
        <p className="mt-8 text-center text-xs text-blue-300">
          Données population source :{" "}
          <span className="font-medium text-blue-200">INSEE via geo.api.gouv.fr</span>{" "}
          ·{" "}
          <a href="#tarifs" className="underline transition hover:text-white">
            Voir la grille tarifaire complète ↓
          </a>
        </p>
      </div>
    </section>
  );
}

// ── Grille tarifaire ──────────────────────────────────────────────────────────

const PRICING_TIERS = [
  { name: "Nano", range: "< 1 000 hab.", monthly: 49, annual: 490 },
  { name: "Micro", range: "1 000 – 2 500 hab.", monthly: 99, annual: 990 },
  { name: "Local",   range: "2 500 – 10 000 hab.", monthly: 189, annual: 1890 },
  { name: "Urbain", range: "10 000 – 50 000 hab.", monthly: 490, annual: 4900 },
  { name: "Métropole", range: "> 50 000 hab.", monthly: null, annual: null },
] as const;

const FEATURES_LIST = [
  "Tous les modules inclus (alertes, signalements, agenda, infos, messagerie)",
  "Application mobile iOS & Android pour vos habitants",
  "Espace d'administration web pour vos agents",
  "Support par email · Mises à jour incluses",
];

function PricingSection() {
  const [selected, setSelected] = useState(2); // Local par défaut
  const [isInterco, setIsInterco] = useState(false);

  const tier = PRICING_TIERS[selected];
  const factor = isInterco ? 1.2 : 1;
  const monthly = tier.monthly ? Math.round(tier.monthly * factor) : null;
  const annual = tier.annual ? Math.round(tier.annual * factor) : null;

  return (
    <section id="tarifs" style={{ backgroundColor: "#f0f4ff" }} className="py-20">
      <div className="mx-auto max-w-4xl px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Tarifs
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
            Un modèle transparent,{" "}
            <span style={{ color: "#1e3a8a" }}>adapté à votre territoire</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            Sélectionnez la taille de votre collectivité.{" "}
            <strong>Tous les modules sont inclus</strong> dans chaque offre.
          </p>
        </div>

        {/* Tier pills */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {PRICING_TIERS.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setSelected(i)}
              className="flex flex-col items-center rounded-xl px-5 py-3 text-sm font-bold transition-all"
              style={
                selected === i
                  ? { background: "#1e3a8a", color: "white", boxShadow: "0 4px 14px rgba(30,58,138,0.35)" }
                  : { background: "white", color: "#374151", border: "1.5px solid #e5e7eb" }
              }
            >
              <span>{t.name}</span>
              <span
                className="mt-0.5 text-xs font-normal"
                style={{ color: selected === i ? "#93c5fd" : "#9ca3af" }}
              >
                {t.range}
              </span>
            </button>
          ))}
        </div>

        {/* Interco toggle */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <span className={`text-sm font-medium ${!isInterco ? "text-gray-900" : "text-gray-400"}`}>
            Commune seule
          </span>
          <button
            onClick={() => setIsInterco(!isInterco)}
            className="flex items-center transition-opacity hover:opacity-80"
            aria-label="Basculer intercommunalité"
          >
            {isInterco ? (
              <ToggleRight className="h-8 w-8" style={{ color: "#1e3a8a" }} />
            ) : (
              <ToggleLeft className="h-8 w-8 text-gray-300" />
            )}
          </button>
          <span className={`flex items-center gap-1.5 text-sm font-medium ${isInterco ? "text-gray-900" : "text-gray-400"}`}>
            Intercommunalité (CC, CA, CU)
            {isInterco && (
              <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: "#1e3a8a" }}>
                +20 %
              </span>
            )}
          </span>
        </div>

        {/* Price card */}
        <div className="mx-auto mt-8 max-w-lg">
          {monthly === null ? (
            // Métropole
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "linear-gradient(160deg, #1e3a8a, #1d4ed8)" }}
            >
              <p className="text-sm font-bold uppercase tracking-widest text-blue-300">Métropole</p>
              <p className="mt-1 text-xs text-blue-400">{tier.range}</p>
              <p className="mt-6 text-4xl font-extrabold text-white">Sur devis</p>
              <p className="mt-2 text-sm text-blue-200">
                Tarif personnalisé selon votre situation · SLA adaptable
              </p>
              <a
                href="#contact"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-900 transition hover:bg-blue-50"
              >
                Nous contacter <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div
              className="rounded-2xl bg-white p-8"
              style={{ boxShadow: "0 8px 40px rgba(30,58,138,0.12)", border: "1.5px solid #e0e7ff" }}
            >
              {/* Tier header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {tier.name}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">{tier.range}</p>
                </div>
                {isInterco && (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold text-white"
                    style={{ backgroundColor: "#1e3a8a" }}
                  >
                    Intercommunalité +20 %
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mt-6 flex items-end gap-2">
                <span className="text-5xl font-extrabold text-gray-900">{monthly} €</span>
                <span className="mb-2 text-sm text-gray-400">/mois HT</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold" style={{ color: "#1e3a8a" }}>
                ou {annual?.toLocaleString("fr-FR")} €/an HT{" "}
                <span className="font-normal text-gray-400">(2 mois offerts)</span>
              </p>

              {/* Features */}
              <ul className="mt-6 space-y-2.5">
                {FEATURES_LIST.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Interco example */}
              {isInterco && (
                <div
                  className="mt-5 rounded-xl px-4 py-3 text-xs text-blue-700"
                  style={{ background: "#eff6ff" }}
                >
                  Ex. CC de 30 000 hab. → tranche{" "}
                  <strong>Urbain</strong> (490 €/mois) + 20 % interco ={" "}
                  <strong>588 €/mois HT</strong> / 5 880 €/an HT
                </div>
              )}

              {/* CTA */}
              <a
                href="#contact"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                Demander une proposition
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Tous prix HT · Paiement annuel recommandé (10 × mensuel = 2 mois offerts) ·
          Remise −10 % sur 2 ans, −15 % sur 3 ans
        </p>
      </div>
    </section>
  );
}

// ── Banner promo flottante ────────────────────────────────────────────────────

function PromoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <>
      <style>{`
        @keyframes vcSlideUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .vc-promo { animation: vcSlideUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
      <div
        className="vc-promo fixed bottom-6 right-6 z-50 w-72 rounded-2xl bg-white p-5"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)", border: "1px solid #e0e7ff" }}
      >
        {/* Close */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 flex-shrink-0" style={{ color: "#f59e0b" }} />
          <p className="text-sm font-extrabold text-gray-900">Offre à ne pas manquer</p>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-gray-600">
          Les <strong>premières collectivités partenaires</strong> bénéficient de{" "}
          <strong className="text-blue-700">2 mois offerts</strong> avant le début de l'abonnement.
        </p>
        <p className="mt-1.5 text-xs text-gray-400">
          Places limitées · Accès prioritaire aux nouvelles fonctionnalités
        </p>
        <a
          href="#contact"
          onClick={() => setDismissed(true)}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: "#1e3a8a" }}
        >
          En savoir plus
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function LandingPage() {
  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
    >
      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <header
        style={{ backgroundColor: "#1e3a8a" }}
        className="sticky top-0 z-50"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <VCLogo size={30} />
            <span className="text-xl font-extrabold tracking-tight text-white">
              VigieCity
            </span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#modules"
              className="text-sm text-blue-200 transition hover:text-white"
            >
              Fonctionnalités
            </a>
            <a
              href="#pour-qui"
              className="text-sm text-blue-200 transition hover:text-white"
            >
              Pour qui
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
            <Link
              to="/admin/login"
              className="rounded-lg border border-blue-400 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:border-white hover:text-white"
            >
              Connexion
            </Link>
            <a
              href="mailto:contact@vigiecity.fr"
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-900 transition hover:bg-blue-50"
            >
              Nous contacter
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section
        style={{
          background:
            "linear-gradient(140deg, #1e3a8a 0%, #1e40af 55%, #1d4ed8 100%)",
        }}
        className="pb-20 pt-16 md:pb-28 md:pt-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
            {/* Left copy */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-[3.25rem]">
                L'application qui connecte{" "}
                <span style={{ color: "#93c5fd" }}>
                  vos habitants à la vie de leur commune
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg text-blue-200 lg:text-xl">
                Alertes locales, signalements, agenda, actualités, messagerie
                citoyenne — un seul outil pour rapprocher vos habitants de
                leurs services municipaux.
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-blue-900 shadow-lg transition hover:bg-blue-50"
                >
                  Nous contacter
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#modules"
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-400 px-7 py-3.5 text-base font-semibold text-white transition hover:border-white hover:bg-white/10"
                >
                  Voir les fonctionnalités
                  <ChevronDown className="h-4 w-4" />
                </a>
              </div>

              <p className="mt-6 text-sm text-blue-300">
                ✓ Application iOS & Android&emsp;✓ Espace admin web&emsp;✓
                Tous modules inclus
              </p>
            </div>

            {/* Right — phone */}
            <div className="flex flex-shrink-0 justify-center">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pour qui ───────────────────────────────�