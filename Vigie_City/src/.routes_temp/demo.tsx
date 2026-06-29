// demo.tsx
// Page /demo — showcase interactif VigieCity pour les maires
// Accessible sans auth, avec une commune fictive "Montval-sur-Marne"
// But : convaincre un maire en 60 secondes via une experience live

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle, Newspaper, CalendarDays, MessageSquare,
  MapPin, Bell, ArrowRight, CheckCircle2, Shield,
  PhoneCall, Zap, Users, BarChart3, Megaphone,
} from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo VigieCity — Decouvrez l'app en action" },
      { name: "description", content: "Decouvrez VigieCity avec une commune fictive. Alertes, signalements, agenda, actualites — tout en une app." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoPage,
});

// ── Donnees fictives ──────────────────────────────────────────────────────────

const COMMUNE = "Montval-sur-Marne";
const DEPT    = "94";

const ALERTES = [
  { id: 1, type: "warning", icon: AlertTriangle, color: "#f59e0b", label: "Vigilance orange", desc: "Orages prevus entre 18h et 23h. Evitez les deplacements inutiles.", time: "Il y a 2h" },
  { id: 2, type: "info",    icon: Bell,          color: "#3b82f6", label: "Info mairie",      desc: "Coupure d'eau rue des Lilas le mercredi 26 de 9h a 12h.", time: "Il y a 5h" },
];

const ARTICLES = [
  { id: 1, title: "Renovation du parc municipal : les travaux demarrent lundi", source: "Mairie de Montval", time: "Aujourd'hui" },
  { id: 2, title: "Conseil municipal du 28 juin : ordre du jour disponible",    source: "Mairie de Montval", time: "Hier" },
  { id: 3, title: "Marche de Noel 2026 : appel aux exposants",                 source: "L'Echo du Val",    time: "Il y a 2j" },
];

const EVENEMENTS = [
  { id: 1, title: "Assemblee des citoyens — budget participatif", date: "28 juin", hour: "19h00", lieu: "Salle polyvalente", places: 12 },
  { id: 2, title: "Randonnee familiale — Foret de Vincennes",     date: "30 juin", hour: "09h00", lieu: "Place de la Mairie", places: 28 },
];

const STATS = [
  { label: "Citoyens inscrits", value: "1 247", icon: Users,    color: "#3b82f6" },
  { label: "Signalements traites", value: "98 %", icon: CheckCircle2, color: "#10b981" },
  { label: "Messages envoyes",  value: "3 412", icon: MessageSquare, color: "#8b5cf6" },
  { label: "Articles publies",  value: "142",   icon: Newspaper, color: "#f59e0b" },
];

// ── Tab navigation ────────────────────────────────────────────────────────────

type Tab = "accueil" | "alertes" | "actualites" | "agenda" | "admin";

const TABS: { id: Tab; label: string; icon: typeof Bell }[] = [
  { id: "accueil",    label: "Accueil",     icon: Shield     },
  { id: "alertes",   label: "Alertes",     icon: AlertTriangle },
  { id: "actualites",label: "Actualites",  icon: Newspaper  },
  { id: "agenda",    label: "Agenda",      icon: CalendarDays },
  { id: "admin",     label: "Admin",       icon: BarChart3  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

function DemoPage() {
  const [tab, setTab] = useState<Tab>("accueil");

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header demo ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-amber-500 px-4 py-2">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <p className="text-xs font-semibold text-amber-900">
            Mode demonstration — Commune fictive "{COMMUNE}"
          </p>
          <Link
            to="/"
            hash="contact"
            className="inline-flex items-center gap-1 rounded-lg bg-amber-900 px-3 py-1 text-xs font-bold text-white hover:bg-amber-800 transition"
          >
            Demander ma demo <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── App mockup ────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-sm px-0">

        {/* Header app citoyen */}
        <div className="bg-blue-800 px-4 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-300">{COMMUNE} ({DEPT})</p>
              <p className="text-lg font-bold text-white mt-0.5">Bonjour, Marie</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-5 w-5 text-white/80" />
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">2</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">M</div>
            </div>
          </div>

          {/* SOS button */}
          <button className="mt-4 w-full rounded-2xl bg-red-500 py-3 text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg">
            <PhoneCall className="h-4 w-4" /> Appel d'urgence
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 bg-white scrollbar-hide">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 flex-col items-center gap-0.5 px-4 py-2.5 text-[10px] font-semibold transition border-b-2 ${
                tab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Contenu onglets */}
        <div className="bg-gray-50 min-h-[520px]">

          {/* ── Accueil ──────────────────────────────────────────────── */}
          {tab === "accueil" && (
            <div className="p-4 space-y-3">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-700 uppercase">Vigilance orange</span>
                </div>
                <p className="text-xs text-amber-800">Orages prevus ce soir entre 18h et 23h.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Zap,          label: "Signaler",   color: "#ef4444", bg: "#fef2f2" },
                  { icon: MapPin,       label: "Carte",      color: "#3b82f6", bg: "#eff6ff" },
                  { icon: Newspaper,    label: "Actualites", color: "#8b5cf6", bg: "#f5f3ff" },
                  { icon: CalendarDays, label: "Agenda",     color: "#10b981", bg: "#ecfdf5" },
                ].map(({ icon: Icon, label, color, bg }) => (
                  <div
                    key={label}
                    className="rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer shadow-sm"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon className="h-6 w-6" style={{ color }} />
                    <span className="text-xs font-semibold text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-500 mb-2">DERNIERES ACTUALITES</p>
                {ARTICLES.slice(0, 2).map((a) => (
                  <div key={a.id} className="py-2 border-b last:border-0 border-gray-50">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2">{a.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{a.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Alertes ──────────────────────────────────────────────── */}
          {tab === "alertes" && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Alertes actives</p>
              {ALERTES.map((a) => (
                <div key={a.id} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <a.icon className="h-4 w-4" style={{ color: a.color }} />
                    <span className="text-xs font-bold" style={{ color: a.color }}>{a.label}</span>
                    <span className="ml-auto text-[10px] text-gray-400">{a.time}</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{a.desc}</p>
                </div>
              ))}
              <div className="rounded-2xl bg-green-50 border border-green-100 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-xs font-semibold text-green-700">Notifications push actives</p>
                </div>
                <p className="mt-1 text-[10px] text-green-600">Vous etes alerté immediatement pour votre commune.</p>
              </div>
            </div>
          )}

          {/* ── Actualites ───────────────────────────────────────────── */}
          {tab === "actualites" && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Fil d'actualites — {COMMUNE}</p>
              {ARTICLES.map((a) => (
                <div key={a.id} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{a.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{a.source}</span>
                    <span className="text-[10px] text-gray-400">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Agenda ───────────────────────────────────────────────── */}
          {tab === "agenda" && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Evenements a venir</p>
              {EVENEMENTS.map((e) => (
                <div key={e.id} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-600 text-white">
                      <span className="text-[10px] font-bold leading-none">{e.date.split(" ")[0]}</span>
                      <span className="text-[8px] font-semibold opacity-80 leading-none">{e.date.split(" ")[1]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{e.title}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{e.hour} · {e.lieu}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-green-600 font-semibold">{e.places} places restantes</span>
                    <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white">
                      S'inscrire
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Admin ────────────────────────────────────────────────── */}
          {tab === "admin" && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Vue administration</p>
              <div className="grid grid-cols-2 gap-3">
                {STATS.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                    <Icon className="h-5 w-5 mb-2" style={{ color }} />
                    <p className="text-xl font-extrabold text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-bold text-blue-700">Interface admin web</p>
                </div>
                <p className="text-[10px] text-blue-600 leading-relaxed">
                  Publications, signalements, messagerie, evenements, alertes — tout piloter depuis un espace web securise.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CTA bas de page ───────────────────────────────────────────────── */}
      <div className="bg-blue-800 px-6 py-10 text-center">
        <h2 className="text-xl font-extrabold text-white">
          Votre commune merite ca
        </h2>
        <p className="mt-2 text-sm text-blue-200">
          Configuration en 48h · Support inclus · Sans engagement
        </p>
        <Link
          to="/"
          hash="contact"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-900 shadow-lg hover:bg-blue-50 transition"
        >
          Demander une demo pour {COMMUNE.split("-")[0]}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
