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
              <div
                className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
                style={{ backgroundColor: "#ffffff18", color: "#bfdbfe" }}
              >
                <span>🏡</span>
                Pensée pour les collectivités locales françaises
              </div>

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
              Que vous gériez 200 ou 200 000 habitants, VigieCity s'adapte à
              votre territoire et à votre organisation.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {FOR_WHO.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-8"
              >
                <span className="text-4xl">{c.icon}</span>
                <h3 className="mt-4 text-lg font-bold text-gray-900">
                  {c.title}
                </h3>
                <p
                  className="mt-1 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#1e3a8a" }}
                >
                  {c.sub}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  {c.desc}
                </p>
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
              VigieCity couvre l'ensemble des besoins de communication entre
              votre collectivité et ses habitants.
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
              style={{
                background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)",
              }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl">
                🖥️
              </div>
              <h3 className="mb-2 font-bold text-white">
                Espace d'administration
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-blue-200">
                Interface web dédiée à vos agents pour gérer l'ensemble des
                contenus et interactions.
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
              Pas d'équipe technique requise. De la configuration à votre
              premier habitant connecté, tout se fait simplement.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
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
                <h3 className="mb-2 text-base font-bold text-gray-900">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {step.desc}
                </p>
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
            <span style={{ color: "#1e3a8a" }}>
              adapté à votre territoire
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
            La tarification est basée sur la taille de votre collectivité.{" "}
            <strong>Tous les modules sont inclus</strong>, sans fonctionnalité
            réservée à un plan supérieur.
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
                desc: "Le prix s'adapte au nombre d'habitants de votre collectivité. Simple et prévisible.",
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
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-8 rounded-2xl p-6 text-center"
            style={{ background: "#1e3a8a" }}
          >
            <p className="text-base font-semibold text-white">
              Nous sommes en phase de lancement et travaillons directement avec
              les premières collectivités pour définir les offres.
            </p>
            <p className="mt-2 text-sm text-blue-200">
              Contactez-nous pour discuter de votre projet — réponse
              personnalisée sous 48h.
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
        style={{
          background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)",
        }}
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
            Nous accompagnons les premières collectivités qui souhaitent adopter
            VigieCity. Prenez contact pour en savoir plus sur le projet et les
            conditions de lancement.
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
              "Données hébergées en Europe",
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
              <VCLogo size={26} />
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
          <div className="mt-6 border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} VigieCity · Application déployée sur{" "}
            <span className="text-slate-500">Vercel</span> · Base de données{" "}
            <span className="text-slate-500">Supabase (EU)</span> · Données
            hébergées en Europe · Conforme RGPD
          </div>
        </div>
      </footer>
    </div>
  );
}
