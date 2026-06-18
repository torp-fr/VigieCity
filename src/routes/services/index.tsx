import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Phone, Mail, Globe, MapPin, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Services de la commune — VigieCity" },
      { name: "description", content: "Répertoire des services municipaux de votre commune." },
    ],
  }),
  component: ServicesPage,
});

type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  opening_hours: string | null;
};

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  securite:       { label: "Sécurité",       icon: "🛡️" },
  administration: { label: "Administration", icon: "🏛️" },
  social:         { label: "Social",         icon: "🤝" },
  sante:          { label: "Santé",          icon: "🏥" },
  culture:        { label: "Culture",        icon: "🎭" },
  sport:          { label: "Sport",          icon: "⚽" },
  enfance:        { label: "Enfance",        icon: "👶" },
  transport:      { label: "Transport",      icon: "🚌" },
  autre:          { label: "Autre",          icon: "📍" },
};

function catMeta(c: string) {
  return CATEGORY_META[c] ?? { label: c, icon: "📍" };
}

function ServicesPage() {
  const [authed, setAuthed]               = useState<boolean | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [communeName, setCommuneName]     = useState<string | null>(null);
  const [profileReady, setProfileReady]   = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setAuthed(!!uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id, collectivities(name)")
          .eq("id", uid)
          .single();
        setCollectivityId(profile?.collectivity_id ?? null);
        // @ts-expect-error joined relation
        setCommuneName(profile?.collectivities?.name ?? null);
      }
      setProfileReady(true);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["commune_services", collectivityId],
    enabled: profileReady && !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commune_services")
        .select("id, name, category, description, address, phone, email, website, opening_hours")
        .eq("collectivity_id", collectivityId!)
        .eq("is_active", true)
        .order("category")
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  if (authed === false) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Connectez-vous pour accéder aux services de votre commune.</p>
        <Link to="/auth" className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
          Me connecter
        </Link>
      </div>
    );
  }

  if (profileReady && !collectivityId) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Choisissez votre commune pour voir les services disponibles.</p>
        <Link to="/onboarding" className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
          Choisir ma commune
        </Link>
      </div>
    );
  }

  // Group by category
  const grouped: Record<string, Service[]> = {};
  for (const s of data ?? []) {
    (grouped[s.category] ??= []).push(s);
  }
  const categories = Object.keys(grouped).sort();

  return (
    <div className="space-y-6 px-4 pt-5">
      <header>
        <h1 className="text-2xl font-bold">Services municipaux</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {communeName ? `Annuaire des services — ${communeName}` : "Annuaire des services de votre commune."}
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucun service disponible pour le moment.
        </div>
      ) : (
        categories.map((cat) => (
          <section key={cat}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{catMeta(cat).icon}</span>
              {catMeta(cat).label}
            </h2>
            <ul className="space-y-2">
              {grouped[cat].map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function ServiceCard({ service: s }: { service: Service }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-2xl border border-border bg-card shadow-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">
          {catMeta(s.category).icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight truncate">{s.name}</p>
          {s.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.description}</p>
          )}
        </div>
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
          {s.address && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {s.address}
            </p>
          )}
          {s.phone && (
            <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-sm text-primary underline">
              <Phone className="h-4 w-4 shrink-0" />
              {s.phone}
            </a>
          )}
          {s.email && (
            <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-sm text-primary underline">
              <Mail className="h-4 w-4 shrink-0" />
              {s.email}
            </a>
          )}
          {s.website && (
            <a href={s.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
              <Globe className="h-4 w-4 shrink-0" />
              {s.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {s.opening_hours && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              {s.opening_hours}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
