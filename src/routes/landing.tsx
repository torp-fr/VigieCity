import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
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

// ── Logo SVG ──────────────────────────────────────────────────────────────────

function VCLogo({ size = 34, light = false }: { size?: number; light?: boolean }) {
  const fill = light ? "white" : "#1e3a8a";
  const stroke = "white";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 2.5L30.5 8V19C30.5 26.5 24.8 32.3 18 34C11.2 32.3 5.5 26.5 5.5 19V8L18 2.5Z"
        fill={fill}
      />
      {/* Outer wifi arc */}
      <path
        d="M10 10.5C12.5 7.5 15 6 18 6C21 6 23.5 7.5 26 10.5"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      {/* Inner wifi arc */}
      <path
        d="M13 13.5C14.5 11.5 16 10.5 18 10.5C20 10.5 21.5 11.5 23 13.5"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      {/* Pin dot */}
      <circle cx="18" cy="17" r="3" fill={stroke} />
      {/* Pin tail */}
      <path d="M18 20L18 25" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ── 3D Phone mockup ───────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div style={{ perspective: "1400px", perspectiveOrigin: "40% 50%" }}>
      {/* Phone chassis */}
      <div
        style={{
          width: 272,
          height: 560,
          borderRadius: 42,
          background: "linear-gradient(150deg, #232338 0%, #16162a 45%, #0d0d1c 100%)",
          border: "1.5px solid #35355a",
          boxShadow:
            "32px 48px 90px rgba(0,0,0,0.75), 12px 16px 32px rgba(0,0,0,0.4), -4px -4px 20px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.10), inset 1px 0 0 rgba(255,255,255,0.05)",
          transform: "rotateY(-22deg) rotateX(7deg) rotateZ(-1.5deg)",
          transformStyle: "preserve-3d",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Side buttons — volume up */}
        <div
          style={{
            position: "absolute",
            left: -4,
            top: 110,
            width: 4,
            height: 28,
            background: "linear-gradient(to right, #1e1e30, #2a2a42)",
            borderRadius: "3px 0 0 3px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -4,
            top: 150,
            width: 4,
            height: 28,
            background: "linear-gradient(to right, #1e1e30, #2a2a42)",
            borderRadius: "3px 0 0 3px",
          }}
        />
        {/* Power button */}
        <div
          style={{
            position: "absolute",
            right: -4,
            top: 130,
            width: 4,
            height: 44,
            background: "linear-gradient(to left, #1e1e30, #2a2a42)",
            borderRadius: "0 3px 3px 0",
          }}
        />

        {/* Screen glass */}
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: 32,
            overflow: "hidden",
            background: "#f0f4f8",
          }}
        >
          {/* Dynamic island */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 88,
              height: 27,
              background: "#000",
              borderRadius: 14,
              zIndex: 20,
            }}
          />

          {/* Glass reflection overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(140deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 35%, transparent 60%)",
              zIndex: 50,
              pointerEvents: "none",
              borderRadius: 32,
            }}
          />

          {/* App content */}
          <div
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', sans-serif",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background: "#f1f5f9",
            }}
          >
            {/* Status bar */}
            <div
              style={{
                background: "#1e3a8a",
                padding: "6px 18px 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 12,
                flexShrink: 0,
              }}
            >
              <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>9:41</span>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 9 }}>●●●</span>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 9 }}>WiFi</span>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 9 }}>⚡84%</span>
              </div>
            </div>

            {/* App header */}
            <div
              style={{
                background: "#1e3a8a",
                padding: "10px 14px 14px",
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
                  <p
                    style={{ color: "#93c5fd", fontSize: 9, margin: 0, fontWeight: 500 }}
                  >
                    Bonjour, Marie 👋
                  </p>
                  <p
                    style={{
                      color: "white",
                      fontSize: 13,
                      fontWeight: 800,
                      margin: "2px 0 0",
                    }}
                  >
                    Saint-Martin-des-Champs
                  </p>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 18,
                    padding: "5px 9px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 11 }}>⛅</span>
                  <span
                    style={{ color: "white", fontSize: 11, fontWeight: 700 }}
                  >
                    18°
                  </span>
                </div>
              </div>
            </div>

            {/* Alert banner */}
            <div
              style={{
                margin: "8px 8px 0",
                background: "linear-gradient(90deg, #fef3c7, #fde68a)",
                borderRadius: 10,
                padding: "7px 10px",
                display: "flex",
                alignItems: "flex-start",
                gap: 7,
                border: "1px solid #f59e0b55",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 13, marginTop: 1 }}>⚠️</span>
              <div>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: "#92400e",
                    margin: 0,
                  }}
                >
                  Coupure d'eau — Secteur Nord
                </p>
                <p
                  style={{ fontSize: 8, color: "#b45309", margin: "2px 0 0" }}
                >
                  Aujourd'hui de 14h à 18h · Vos équipes interviennent
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ padding: "8px 8px 4px", flexShrink: 0 }}>
              <p
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  margin: "0 0 6px",
                }}
              >
                Accès rapide
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 5,
                }}
              >
                {[
                  { icon: "🔔", label: "Alertes", bg: "#fff7ed", border: "#f59e0b" },
                  { icon: "📍", label: "Signaler", bg: "#fff1f2", border: "#f43f5e" },
                  { icon: "📅", label: "Agenda", bg: "#eff6ff", border: "#3b82f6" },
                  { icon: "📰", label: "Infos", bg: "#f0fdf4", border: "#22c55e" },
                ].map((a) => (
                  <div
                    key={a.label}
                    style={{
                      background: a.bg,
                      border: `1px solid ${a.border}44`,
                      borderRadius: 9,
                      padding: "7px 4px",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{a.icon}</span>
                    <p
                      style={{
                        fontSize: 8,
                        fontWeight: 600,
                        color: "#374151",
                        margin: "3px 0 0",
                      }}
                    >
                      {a.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feed */}
            <div
              style={{
                padding: "0 8px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
                flex: 1,
                overflow: "hidden",
              }}
            >
              <p
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  margin: "2px 0 5px",
                }}
              >
                Fil local
              </p>

              {/* Event card */}
              <div
                style={{
                  background: "white",
                  borderRadius: 10,
                  padding: "7px 9px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
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
                    style={{
                      fontSize: 7,
                      color: "#3b82f6",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    JUN
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: "#1e3a8a",
                      fontWeight: 800,
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
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Fête de quartier — Place du bourg
                  </p>
                  <p
                    style={{ fontSize: 8, color: "#6b7280", margin: "2px 0 0" }}
                  >
                    14h → 20h · Organisé par la commune
                  </p>
                </div>
              </div>

              {/* Signal card */}
              <div
                style={{
                  background: "white",
                  borderRadius: 10,
                  padding: "7px 9px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
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
                  }}
                >
                  <span style={{ fontSize: 17 }}>🚧</span>
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
                    Signalement — Route D12
                  </p>
                  <p
                    style={{ fontSize: 8, color: "#6b7280", margin: "2px 0 0" }}
                  >
                    Nid-de-poule · Pris en charge ✓
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 7,
                    fontWeight: 800,
                    background: "#d97706",
                    color: "white",
                    borderRadius: 20,
                    padding: "2px 6px",
                    flexShrink: 0,
                  }}
                >
                  En cours
                </span>
              </div>

              {/* Info card */}
              <div
                style={{
                  background: "white",
                  borderRadius: 10,
                  padding: "7px 9px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    background: "#f0fdf4",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 17 }}>📰</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#1f2937",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Nouveau PLU adopté en conseil
                  </p>
                  <p
                    style={{ fontSize: 8, color: "#6b7280", margin: "2px 0 0" }}
                  >
                    Il y a 2 h · Mairie de Saint-Martin
                  </p>
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
                padding: "6px 10px 10px",
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
                  style={{ textAlign: "center", opacity: tab.active ? 1 : 0.45 }}
                >
                  <span style={{ fontSize: 16 }}>{tab.icon}</span>
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
        </div>

        {/* Home indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 5,
            left: "50%",
            transform: "translateX(-50%)",
            width: 90,
            height: 4,
            background: "rgba(255,255,255,0.18)",
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
    icon: "🔔",
    title: "Alertes & urgences",
    desc: "Diffusez instantanément des alertes à vos habitants : météo, coupures, incidents, avis de sécurité. Notifications push en temps réel.",
    color: "#f59e0b",
  },
  {
    icon: "📍",
    title: "Signalements citoyens",
    desc: "Les habitants signalent un problème en quelques secondes, avec photo et localisation GPS. Suivi en temps réel de l'avancement.",
    color: "#f43f5e",
  },
  {
    icon: "📅",
    title: "Agenda & événements",
    desc: "Publiez et gérez les événements de votre commune. Les habitants restent informés et peuvent ajouter les dates à leur calendrier.",
    color: "#3b82f6",
  },
  {
    icon: "📰",
    title: "Actualités locales",
    desc: "Un fil d'information local, directement depuis votre mairie. Délibérations, travaux, vie associative, informations pratiques.",
    color: "#22c55e",
  },
  {
    icon: "💬",
    title: "Messagerie citoyenne",
    desc: "Un canal de communication direct entre les habitants et les services municipaux. Moins d'appels, plus d'efficacité.",
    color: "#8b5cf6",
  },
];

const FOR_WHO = [
  {
    icon: "🏘️",
    title: "Communes rurales",
    sub: "Petites communes, grands besoins",
    desc: "Une solution clé en main, sans équipe technique requise. Vos habitants connectés à la vie locale du village.",
  },
  {
    icon: "🏙️",
    title: "Communautés de communes",
    sub: "Superviser à l'échelle intercommunale",
    desc: "Un tableau de bord unifié pour piloter plusieurs communes membres, avec vue consolidée et gestion décentralisée.",
  },
  {
    icon: "🌆",
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
  { icon: "📊", t: "Tableau de bord temps réel" },
  { icon: "✅", t: "Modération des signalements" },
  { icon: "📲", t: "Envoi de notifications push" },
  { icon: "📈", t: "Statistiques d'usage" },
  { icon: "🗺️", t: "Carte des signalements" },
  { icon: "👥", t: "Gestion des administrateurs" },
];

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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <VCLogo size={32} light />
            <span className="text-xl font-extrabold tracking-tight text-white">
              VigieCity
            </span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#modules" className="text-sm text-blue-200 transition hover:text-white">
              Fonctionnalités
            </a>
            <a href="#pour-qui" className="text-sm text-blue-200 transition hover:text-white">
              Pour qui
            </a>
            <a href="#comment-ca-marche" className="text-sm text-blue-200 transition hover:text-white">
              Comment ça marche
            </a>
            <a href="#tarifs" className="text-sm text-blue-200 transition hover:text-white">
              Tarifs
            </a>
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
          background: "linear-gradient(140deg, #1e3a8a 0%, #1e40af 55%, #1d4ed8 100%)",
        }}
        className="pb-20 pt-16 md:pb-28 md:pt-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-20">
            {/* Left */}
            <div className="flex-1 text-center lg:text-left">
              <div
                className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
                style={{ backgroundColor: "#ffffff18", color: "#bfdbfe" }}
              >
                <span>🏡</span>
                Pensée pour les collectivités locales françaises
              </div>

              <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-[3.4rem]">
                L'application qui connecte{" "}
                <span style={{ color: "#93c5fd" }}>
                  vos habitants à la vie de leur commune
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg text-blue-200 lg:text-xl">
                Alertes locales, signalements, agenda, actualités, messagerie citoyenne
                — un seul outil pour rapprocher vos habitants de leurs services municipaux.
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
                ✓ Application iOS & Android&emsp;✓ Espace admin web&emsp;✓ Tous modules inclus
              </p>
            </div>

            {/* Right — 3D phone */}
            <div className="flex flex-shrink-0 justify-center">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pour qui ───────────────────────────────────────────────────── */}
      <section id="pour-qui" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Pour qui
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
              Toutes les collectivités, sans distinction
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              Que vous gériez 200 ou 200 000 habitants, VigieCity s'adapte à votre
              territoire et à votre organisation.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {FOR_WHO.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-8"
              >
                <span className="text-4xl">{c.icon}</span>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{c.title}</h3>
                <p
                  className="mt-1 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#1e3a8a" }}
                >
                  {c.sub}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ────────────────────────────────────────────────────── */}
      <section id="modules" style={{ backgroundColor: "#f8fafc" }} className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Fonctionnalités
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
              Bien plus qu'un simple outil de signalement
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              VigieCity couvre l'ensemble des besoins de communication entre votre
              collectivité et ses habitants.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div
                key={m.title}
                className="rounded-2xl border border-gray-100 bg-white p-7 transition hover:shadow-md"
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                  style={{ backgroundColor: m.color + "18" }}
                >
                  {m.icon}
                </div>
                <h3 className="mb-2 font-bold text-gray-900">{m.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{m.desc}</p>
              </div>
            ))}

            {/* Admin card */}
            <div
              className="rounded-2xl p-7"
              style={{ background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)" }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl">
                🖥️
              </div>
              <h3 className="mb-2 font-bold text-white">Espace d'administration</h3>
              <p className="mb-4 text-sm leading-relaxed text-blue-200">
                Interface web dédiée à vos agents pour gérer l'ensemble des contenus et interactions.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {ADMIN_FEATURES.map((f) => (
                  <div key={f.t} className="flex items-center gap-1.5">
                    <span className="text-sm">{f.icon}</span>
                    <span className="text-xs text-blue-100">{f.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="comment-ca-marche" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Mise en place
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
              Opérationnel en 48 heures
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-gray-500">
              Pas d'équipe technique requise. De la configuration à votre premier
              habitant connecté, tout se fait simplement.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-8"
              >
                <div
                  className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl text-lg font-extrabold text-white"
                  style={{ backgroundColor: "#1e3a8a" }}
                >
                  {step.n}
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="tarifs" style={{ backgroundColor: "#f0f4ff" }} className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Tarifs
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
            Un modèle transparent,{" "}
            <span style={{ color: "#1e3a8a" }}>adapté à votre territoire</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
            La tarification est basée sur la taille de votre collectivité.{" "}
            <strong>Tous les modules sont inclus</strong>, sans fonctionnalité réservée
            à un plan supérieur.
          </p>

          <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
            {[
              {
                icon: "✅",
                title: "Tous modules inclus",
                desc: "Alertes, signalements, agenda, infos locales, messagerie, tableau de bord admin — tout, dans chaque offre.",
              },
              {
                icon: "📏",
                title: "Tarif par taille de territoire",
                desc: "Le prix s'adapte au nombre d'habitants ou au nombre de communes dans votre groupement. Simple et prévisible.",
              },
              {
                icon: "📋",
                title: "Devis personnalisé",
                desc: "Notre grille tarifaire est en cours de finalisation. Contactez-nous pour obtenir une proposition adaptée à votre situation.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-blue-100 bg-white p-6"
              >
                <span className="text-2xl">{item.icon}</span>
                <h3 className="mt-3 font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          <div
            className="mt-8 rounded-2xl p-6 text-center"
            style={{ background: "#1e3a8a" }}
          >
            <p className="text-base font-semibold text-white">
              Nous sommes en phase de lancement et travaillons directement avec les
              premières collectivités pour définir les offres.
            </p>
            <p className="mt-2 text-sm text-blue-200">
              Contactez-nous pour discuter de votre projet — pas de grille tarifaire
              publique pour le moment, mais une réponse personnalisée sous 48h.
            </p>
            <a
              href="#contact"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-900 transition hover:bg-blue-50"
            >
              Demander une proposition
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────────────────────── */}
      <section
        id="contact"
        className="py-20"
        style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)" }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Contact
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
            Votre commune mérite un lien{" "}
            <span style={{ color: "#1e3a8a" }}>direct avec ses habitants</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-gray-500">
            Nous accompagnons les premières collectivités qui souhaitent adopter VigieCity.
            Prenez contact pour en savoir plus sur le projet et les conditions de
            lancement.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:contact@vigiecity.fr?subject=Je souhaite en savoir plus sur VigieCity"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: "#1e3a8a" }}
            >
              Écrire à contact@vigiecity.fr
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            {[
              "Application iOS & Android",
              "Espace admin web",
              "Support inclus",
              "Données hébergées en France",
              "Conforme RGPD",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-10" style={{ backgroundColor: "#0f172a" }}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5">
              <VCLogo size={28} light />
              <span className="text-lg font-bold text-white">VigieCity</span>
              <span className="text-sm text-slate-500">
                — L'app citoyenne pour votre commune
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
                Connexion habitants
              </Link>
              <a href="#" className="text-sm text-slate-400 transition hover:text-white">
                Mentions légales
              </a>
              <a href="#" className="text-sm text-slate-400 transition hover:text-white">
                Confidentialité
              </a>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} VigieCity — Hébergement OVHcloud France — Données
            stockées en Union Européenne
          </div>
        </div>
      </footer>
    </div>
  );
}
