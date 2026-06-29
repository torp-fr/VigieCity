import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Phone, ShieldAlert, Loader2, AlertTriangle, CloudLightning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types vigilance ──────────────────────────────────────────────────────────
type Vigilance = {
  id: string;
  department_code: string;
  color_id: number;
  phenomenon: string;
  valid_from: string;
  valid_to: string | null;
};

const VIGILANCE_CONFIG: Record<number, { label: string; bg: string; border: string; text: string; dot: string }> = {
  1: { label: "Vert",   bg: "bg-green-50",  border: "border-green-300/50",  text: "text-green-800",  dot: "bg-green-500"  },
  2: { label: "Jaune",  bg: "bg-yellow-50", border: "border-yellow-300/50", text: "text-yellow-800", dot: "bg-yellow-500" },
  3: { label: "Orange", bg: "bg-orange-50", border: "border-orange-400/60", text: "text-orange-900", dot: "bg-orange-500" },
  4: { label: "Rouge",  bg: "bg-red-50",    border: "border-red-400/60",    text: "text-red-900",    dot: "bg-red-600"    },
};

function VigilanceBanner({ vigilances }: { vigilances: Vigilance[] }) {
  // Afficher uniquement jaune, orange, rouge — grouper par couleur max
  const relevant = vigilances.filter((v) => v.color_id >= 2);
  if (!relevant.length) return null;

  const maxColor = Math.max(...relevant.map((v) => v.color_id));
  const cfg = VIGILANCE_CONFIG[maxColor] ?? VIGILANCE_CONFIG[2];

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-start gap-3">
        <CloudLightning className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.text}`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${cfg.text}`}>
            Vigilance météo {cfg.label}
          </p>
          <ul className="mt-1.5 space-y-1">
            {relevant.map((v) => {
              const c = VIGILANCE_CONFIG[v.color_id];
              return (
                <li key={v.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                  <span className="font-medium">{v.phenomenon}</span>
                  <span className="text-[11px] opacity-70">— Département {v.department_code}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Source : Météo-France · Actualisé toutes les heures
          </p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/urgences")({
  head: () => ({
    meta: [
      { title: "Urgences — VigieCity" },
      { name: "description", content: "Numéros d'urgence nationaux et locaux de votre commune." },
    ],
  }),
  component: UrgencesPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type Contact = {
  id: string;
  label: string;
  phone: string;
  category: string;
  hours: string | null;
  priority: number;
  description: string | null;
  is_national: boolean;
};

const CAT_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  securite: { bg: "bg-blue-500/10",    text: "text-blue-700 dark:text-blue-400",    border: "border-blue-300/50" },
  incendie: { bg: "bg-red-500/10",     text: "text-red-700 dark:text-red-400",      border: "border-red-300/50" },
  medical:  { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-300/50" },
  social:   { bg: "bg-orange-500/10",  text: "text-orange-700 dark:text-orange-400",border: "border-orange-300/50" },
  mairie:   { bg: "bg-violet-500/10",  text: "text-violet-700 dark:text-violet-400",border: "border-violet-300/50" },
  technique:{ bg: "bg-yellow-500/10",  text: "text-yellow-700 dark:text-yellow-400",border: "border-yellow-300/50" },
  autre:    { bg: "bg-muted",          text: "text-muted-foreground",               border: "border-border" },
};

const CAT_ICON: Record<string, string> = {
  securite: "🛡️", incendie: "🔥", medical: "🏥",
  social: "🤝", mairie: "🏛️", technique: "🔧", autre: "📞",
};

function catStyle(cat: string) {
  return CAT_STYLE[cat] ?? CAT_STYLE.autre;
}
function catIcon(cat: string) {
  return CAT_ICON[cat] ?? "📞";
}

// ─── Composant ────────────────────────────────────────────────────────────────
function UrgencesPage() {
  const [collectivityId, setCollectivityId]   = useState<string | null>(null);
  const [departmentCode, setDepartmentCode]   = useState<string | null>(null);
  const [ready, setReady]                     = useState(false);
  const [callTarget, setCallTarget]           = useState<Contact | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", data.user.id)
          .single();
        const collId = profile?.collectivity_id ?? null;
        setCollectivityId(collId);

        if (collId) {
          const { data: coll } = await supabase
            .from("collectivities")
            .select("department_code")
            .eq("id", collId)
            .single();
          setDepartmentCode(coll?.department_code ?? null);
        }
      }
      setReady(true);
    });
  }, []);

  // Vigilances météo pour le département
  const { data: vigilances = [] } = useQuery({
    queryKey: ["meteo-vigilances", departmentCode],
    enabled:  !!departmentCode,
    staleTime: 30 * 60 * 1000, // 30 min
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meteo_vigilances")
        .select("id, department_code, color_id, phenomenon, valid_from, valid_to")
        .eq("department_code", departmentCode!)
        .gte("color_id", 2)
        .order("color_id", { ascending: false });
      if (error) throw error;
      return data as Vigilance[];
    },
  });

  // Nationaux
  const { data: nationals = [], isLoading: loadNat } = useQuery({
    queryKey: ["emergency-contacts", "national"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("is_national", true)
        .order("priority");
      if (error) throw error;
      return data as Contact[];
    },
  });

  // Locaux (commune de l'utilisateur)
  const { data: locals = [], isLoading: loadLocal } = useQuery({
    queryKey: ["emergency-contacts", "local", collectivityId],
    enabled: ready && !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("collectivity_id", collectivityId!)
        .eq("is_national", false)
        .order("priority");
      if (error) throw error;
      return data as Contact[];
    },
  });

  const isLoading = loadNat || (ready && !!collectivityId && loadLocal);

  const handleCall = (contact: Contact) => {
    setCallTarget(contact);
  };

  const confirmCall = () => {
    if (!callTarget) return;
    window.location.href = `tel:${callTarget.phone.replace(/\s/g, "")}`;
    setCallTarget(null);
  };

  return (
    <div className="space-y-6 px-4 py-6">
      {/* En-tête */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sos/10">
          <Phone className="h-6 w-6 text-sos" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Urgences</h1>
          <p className="text-sm text-muted-foreground">Appuyer pour appeler directement</p>
        </div>
      </header>

      {/* Vigilance météo */}
      {vigilances.length > 0 && <VigilanceBanner vigilances={vigilances} />}

      {isLoading && (
        <div className="flex justify-center pt-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Locaux (commune) */}
      {locals.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            📍 Votre commune
          </h2>
          <ul className="space-y-2">
            {locals.map((c) => (
              <ContactCard key={c.id} contact={c} onCall={handleCall} />
            ))}
          </ul>
        </section>
      )}

      {/* Nationaux */}
      {nationals.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            🇫🇷 Numéros nationaux
          </h2>
          <ul className="space-y-2">
            {nationals.map((c) => (
              <ContactCard key={c.id} contact={c} onCall={handleCall} />
            ))}
          </ul>
        </section>
      )}

      {/* Disclaimer */}
      <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <p className="text-xs text-muted-foreground">
          En cas de danger immédiat, composez directement le <strong>17</strong>,{" "}
          <strong>18</strong>, <strong>15</strong> ou <strong>112</strong>.{" "}
          VigieCity ne remplace pas les services de secours officiels.
        </p>
      </div>

      {/* Modal confirmation appel */}
      {callTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setCallTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-card px-6 pt-6 pb-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${catStyle(callTarget.category).bg}`}
              >
                {catIcon(callTarget.category)}
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">{callTarget.label}</p>
                <p className="mt-0.5 font-mono text-2xl font-semibold text-primary">
                  {callTarget.phone}
                </p>
              </div>
            </div>
            {callTarget.description && (
              <p className="mb-5 text-sm text-muted-foreground">{callTarget.description}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setCallTarget(null)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={confirmCall}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sos py-3 text-sm font-semibold text-white"
              >
                <Phone className="h-4 w-4" />
                Appeler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ContactCard ──────────────────────────────────────────────────────────────
function ContactCard({
  contact,
  onCall,
}: {
  contact: Contact;
  onCall: (c: Contact) => void;
}) {
  const style = catStyle(contact.category);

  return (
    <li>
      <button
        onClick={() => onCall(contact)}
        className={`w-full flex items-center gap-4 rounded-2xl border ${style.border} bg-card px-4 py-3.5 text-left shadow-sm transition active:scale-[0.98]`}
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${style.bg}`}
        >
          {catIcon(contact.category)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight truncate">{contact.label}</p>
          <p className={`mt-0.5 font-mono text-lg font-bold ${style.text}`}>
            {contact.phone}
          </p>
          {contact.hours && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{contact.hours}</p>
          )}
        </div>
        <AlertTriangle className={`h-5 w-5 shrink-0 ${style.text} opacity-70`} />
      </button>
    </li>
  );
}
