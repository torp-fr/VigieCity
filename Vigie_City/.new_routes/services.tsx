import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin, Phone, Globe, Clock, Navigation, Map as MapIcon } from "lucide-react";
import { ServicesMapWidget } from "@/components/ServicesMapWidget";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — VigieCity" },
      { name: "description", content: "Les services locaux de votre commune." },
    ],
  }),
  component: ServicesPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type ServicePlace = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: Record<string, string> | null;
  image_url: string | null;
  is_published: boolean;
};

// ── Méta catégories ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "mairie",    label: "Mairie",    emoji: "🏛️", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  { value: "sante",     label: "Santé",     emoji: "🏥", color: "bg-red-500/10 text-red-700 dark:text-red-400" },
  { value: "education", label: "Éducation", emoji: "🏫", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
  { value: "transport", label: "Transport", emoji: "🚌", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  { value: "sport",     label: "Sport",     emoji: "⚽", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  { value: "culture",   label: "Culture",   emoji: "🎭", color: "bg-pink-500/10 text-pink-700 dark:text-pink-400" },
  { value: "commerce",  label: "Commerce",  emoji: "🛒", color: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  { value: "urgence",   label: "Urgence",   emoji: "🚨", color: "bg-sos/10 text-sos" },
  { value: "autre",     label: "Autre",     emoji: "📍", color: "bg-muted text-muted-foreground" },
] as const;

function catMeta(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

const DAY_LABELS: Record<string, string> = {
  lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu",
  ven: "Ven", sam: "Sam", dim: "Dim",
};

// ── Page ──────────────────────────────────────────────────────────────────────
function ServicesPage() {
  const [authed, setAuthed]                 = useState<boolean | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [communeName, setCommuneName]       = useState<string | null>(null);
  const [profileReady, setProfileReady]     = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId]         = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setAuthed(!!uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", uid)
          .single();
        const colId = profile?.collectivity_id ?? null;
        setCollectivityId(colId);
        if (colId) {
          const { data: col } = await supabase
            .from("collectivities")
            .select("name")
            .eq("id", colId)
            .single();
          setCommuneName(col?.name ?? null);
        }
      }
      setProfileReady(true);
    });
  }, []);

  // ── Requête ────────────────────────────────────────────────────────────────
  const { data: services, isLoading } = useQuery({
    queryKey: ["services-citizen", collectivityId],
    enabled: profileReady && !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_places")
        .select("id, name, category, address, lat, lng, phone, email, website, hours, image_url, is_published")
        .eq("collectivity_id", collectivityId!)
        .eq("is_published", true)
        .order("category")
        .order("name");
      if (error) throw error;
      return data as ServicePlace[];
    },
  });

  // Catégories présentes dans les données
  const presentCats = CATEGORIES.filter((c) => services?.some((s) => s.category === c.value));

  // Filtrage par catégorie
  const filtered = activeCategory
    ? services?.filter((s) => s.category === activeCategory)
    : services;

  // ── Non connecté ──────────────────────────────────────────────────────────
  if (authed === false) {
    return (
      <div className="px-4 pt-10 text-center">
        <h1 className="text-xl font-semibold">Services locaux</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voir les services de votre commune.
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Me connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── En-tête sticky ── */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        <h1 className="text-2xl font-bold">Services</h1>
        {communeName && (
          <p className="mt-0.5 text-sm text-muted-foreground">{communeName}</p>
        )}

        {/* Filtres catégories — scroll horizontal */}
        {!!presentCats.length && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                !activeCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Tous
            </button>
            {presentCats.map((c) => (
              <button
                key={c.value}
                onClick={() => setActiveCategory(activeCategory === c.value ? null : c.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeCategory === c.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Pas de commune ── */}
      {profileReady && !collectivityId && (
        <div className="mx-4 mt-4 rounded-2xl border border-dashed border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas encore choisi de commune.
          </p>
          <Link
            to="/onboarding"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Choisir ma commune
          </Link>
        </div>
      )}

      {/* ── Carte interactive (J8.2) ── */}
      {collectivityId && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <MapIcon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Carte interactive</h2>
          </div>
          <ServicesMapWidget />
        </div>
      )}

      {/* ── Liste de services ── */}
      <div className="px-4 pt-4 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : !filtered?.length && collectivityId ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {activeCategory
                ? "Aucun service dans cette catégorie."
                : "Aucun service configuré pour votre commune."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered?.map((s) => {
              const cat    = catMeta(s.category);
              const isOpen = expandedId === s.id;
              const mapsUrl = s.lat && s.lng
                ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`
                : s.address
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`
                : null;

              return (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  {/* Image optionnelle */}
                  {s.image_url && (
                    <img
                      src={s.image_url}
                      alt={s.name}
                      className="w-full object-cover"
                      style={{ aspectRatio: "16/9", maxHeight: "180px" }}
                      loading="lazy"
                    />
                  )}

                  {/* Infos principales — cliquable pour développer */}
                  <button
                    className="flex w-full items-start gap-3 p-4 text-left"
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                  >
                    {/* Badge catégorie */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${cat.color}`}
                    >
                      {cat.emoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{s.name}</p>
                      <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${cat.color}`}>
                        {cat.label}
                      </span>
                      {s.address && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.address}</span>
                        </p>
                      )}
                    </div>

                    {/* Flèche */}
                    <span
                      className={`mt-1 shrink-0 text-sm text-muted-foreground transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </button>

                  {/* Détail développé */}
                  {isOpen && (
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      {/* Horaires */}
                      {s.hours && Object.keys(s.hours).length > 0 && (
                        <div className="mb-3">
                          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <Clock className="h-3 w-3" /> Horaires
                          </p>
                          <div className="flex flex-col gap-0.5">
                            {Object.entries(s.hours).map(([day, hrs]) => (
                              <div key={day} className="flex items-center gap-3 text-xs">
                                <span className="w-8 font-medium text-muted-foreground">
                                  {DAY_LABELS[day] ?? day}
                                </span>
                                <span>{hrs}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CTAs : appel, itinéraire, site, email */}
                      <div className="flex flex-wrap gap-2">
                        {s.phone && (
                          <a
                            href={`tel:${s.phone.replace(/\s/g, "")}`}
                            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
                          >
                            <Phone className="h-3.5 w-3.5" /> {s.phone}
                          </a>
                        )}
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                          >
                            <Navigation className="h-3.5 w-3.5" /> Itinéraire
                          </a>
                        )}
                        {s.website && (
                          <a
                            href={s.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"
                          >
                            <Globe className="h-3.5 w-3.5" /> Site web
                          </a>
                        )}
                        {s.email && (
                          <a
                            href={`mailto:${s.email}`}
                            className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"
                          >
                            <Globe className="h-3.5 w-3.5" /> {s.email}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
