import { createFileRoute } from "@tanstack/react-router";
import { Info, Shield, Database, Bell } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/settings")({
  component: PlatformSettingsPage,
});

// ── Page ──────────────────────────────────────────────────────────────────────

function PlatformSettingsPage() {
  return (
    <PlatformShell activePath="/platform/settings">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configuration globale de la plateforme VigieCity
        </p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* App info */}
        <Card icon={<Info className="h-5 w-5 text-blue-600" />} title="Informations plateforme">
          <Row label="Version"           value="1.0.0 — Production"               />
          <Row label="Environnement"     value="Vercel + Supabase (EU West)"       />
          <Row label="Base de données"   value="PostgreSQL 15 (Supabase)"          />
          <Row label="Auth provider"     value="Supabase Auth (Email / Magic Link)" />
          <Row label="Stockage fichiers" value="Supabase Storage"                  />
        </Card>

        {/* Modules */}
        <Card icon={<Shield className="h-5 w-5 text-emerald-600" />} title="Modules actifs">
          {([
            ["Signalements citoyens",  true ],
            ["Messagerie sécurisée",   true ],
            ["Actualités RSS",         true ],
            ["Éditeurs de contenu",    true ],
            ["Alertes d'urgence",      true ],
            ["Carte des signalements", true ],
            ["Radio locale",           true ],
            ["Terrain (agents)",       false],
          ] as [string, boolean][]).map(([label, active]) => (
            <div key={label} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-700">{label}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}>
                {active ? "Actif" : "Bientôt"}
              </span>
            </div>
          ))}
        </Card>

        {/* Sync RSS */}
        <Card icon={<Database className="h-5 w-5 text-violet-600" />} title="Synchronisation RSS">
          <p className="mb-4 text-sm text-slate-500">
            La synchronisation automatique des flux RSS nécessite un cron configuré
            via <strong>pg_cron</strong> (Supabase) ou une action planifiée Vercel.
          </p>
          <Row label="Fréquence cible"   value="Toutes les heures"      />
          <Row label="Edge Function"     value="fetch-rss (déployée)"   />
          <Row label="Status pg_cron"    value="⚠️ À configurer"        />
          <a
            href="https://supabase.com/docs/guides/database/extensions/pg_cron"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Documentation pg_cron ↗
          </a>
        </Card>

        {/* Notifications */}
        <Card icon={<Bell className="h-5 w-5 text-amber-500" />} title="Notifications push">
          <p className="mb-4 text-sm text-slate-500">
            Les notifications push sont en cours d'intégration.
            Elles nécessiteront un service VAPID (Web Push) ou Firebase FCM.
          </p>
          <Row label="Status" value="🔧 En développement" />
        </Card>

      </div>
    </PlatformShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({
  icon, title, children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        {icon}
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
