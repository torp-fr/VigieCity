import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  PhoneCall,
  AlertCircle,
  Newspaper,
  ShieldAlert,
  Megaphone,
  ChevronRight,
  Radio,
  MapPin,
  Wind,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SosButton } from "@/components/SosButton";
import { useRadio } from "@/hooks/useRadio";

export const Route = createFileRoute("/accueil")({
  head: () => ({
    meta: [
      { title: "VigieCity — Accueil sécurité de proximité" },
      {
        name: "description",
        content:
          "Appel d'urgence en 1 tap, alerte SOS, signalement d'évènement et fil du quartier.",
      },
      { property: "og:title", content: "VigieCity — Accueil" },
      {
        property: "og:description",
        content: "L'app citoyenne pour la sécurité de votre quartier.",
      },
    ],
  }),
  component: Home,
});

// ─── WMO codes → emoji + label ────────────────────────────────────────────────
function wmoToMeta(code: number): { emoji: string; label: string } {
  if (code === 0)                  return { emoji: "☀️",  label: "Ensoleillé" };
  if (code <= 3)                   return { emoji: "⛅",  label: "Partiellement nuageux" };
  if (code === 45 || code === 48)  return { emoji: "🌫️", label: "Brouillard" };
  if (code >= 51 && code <= 55)    return { emoji: "🌦️", label: "Bruine" };
  if (code >= 61 && code <= 65)    return { emoji: "🌧️", label: "Pluie" };
  if (code >= 71 && code <= 75)    return { emoji: "❄️",  label: "Neige" };
  if (code >= 77 && code <= 77)    return { emoji: "🌨️", label: "Grésil" };
  if (code >= 80 && code <= 82)    return { emoji: "🌦️", label: "Averses" };
  if (code >= 85 && code <= 86)    return { emoji: "🌨️", label: "Averses de neige" };
  if (code >= 95 && code <= 99)    return { emoji: "⛈️",  label: "Orage" };
  return { emoji: "🌤️", label: "Variable" };
}

type WeatherData = {
  temp: number;
  code: number;
  wind: number;
  lat: number;
  lng: number;
};

// ─── Page principale ──────────────────────────────────────────────────────────
function Home() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const { station } = useRadio();

  // Géolocalisation + météo
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGeoError(true),
        { timeout: 8000, maximumAge: 300_000 },
      );
    } else {
      setGeoError(true);
    }
  }, []);

  const { data: weather, isLoading: weatherLoading } = useQuery<WeatherData>({
    queryKey: ["weather", geo?.lat, geo?.lng],
    enabled: !!geo,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo!.lat}&longitude=${geo!.lng}&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("open-meteo error");
      const json = await res.json();
      const c = json.current;
      return {
        temp: Math.round(c.temperature_2m),
        code: c.weathercode,
        wind: Math.round(c.windspeed_10m),
        lat: geo!.lat,
        lng: geo!.lng,
      };
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", userId!)
        .single();
      return data;
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["alerts", "active", profile?.collectivity_id],
    queryFn: async () => {
      const now = new Date().toISOString();
      let query = supabase
        .from("alerts")
        .select("id, title, message, severity, created_at, area_label")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(3);

      if (profile?.collectivity_id) {
        query = query.or(
          `collectivity_id.eq.${profile.collectivity_id},collectivity_id.is.null`,
        );
      } else {
        query = query.is("collectivity_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Realtime: refresh alerts on new INSERT
  useEffect(() => {
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const wmo = weather ? wmoToMeta(weather.code) : null;

  return (
    <div className="space-y-6 px-4 pt-5">
      {/* Hero avec météo intégrée */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-civic p-5 text-primary-foreground shadow-card">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">
              Sécurité de proximité
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight">
              Veillons ensemble sur le quartier.
            </h1>
            <p className="mt-2 text-sm opacity-90">
              Urgences, signalements et alertes de votre commune.
            </p>
          </div>

          {/* Widget météo */}
          <div className="ml-3 shrink-0">
            {!geoError && weatherLoading && !weather && (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                <Loader2 className="h-5 w-5 animate-spin text-white/80" />
              </div>
            )}
            {weather && wmo && (
              <div className="flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm">
                <span className="text-3xl leading-none">{wmo.emoji}</span>
                <span className="mt-1 text-2xl font-bold leading-none">{weather.temp}°</span>
                <span className="mt-0.5 text-[10px] font-medium opacity-80">{wmo.label}</span>
                <div className="mt-1 flex items-center gap-1 opacity-70">
                  <Wind className="h-2.5 w-2.5" />
                  <span className="text-[10px]">{weather.wind} km/h</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coordonnées (debug discret) */}
        {weather && (
          <p className="mt-3 flex items-center gap-1 text-[10px] opacity-50">
            <MapPin className="h-2.5 w-2.5" />
            {weather.lat.toFixed(3)}, {weather.lng.toFixed(3)}
          </p>
        )}
      </section>

      {/* SOS */}
      <SosButton />

      {/* Quick actions */}
      <section className="grid grid-cols-3 gap-3">
        <QuickAction to="/urgences" icon={PhoneCall} label="Urgences" tone="primary" />
        <QuickAction to="/signaler" icon={AlertCircle} label="Signaler" tone="warning" />
        <QuickAction to="/fil" icon={Newspaper} label="Quartier" tone="muted" />
      </section>

      {/* Bannière radio (si pas de player actif) */}
      {!station && (
        <Link
          to="/radio"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition hover:bg-muted active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Radios locales & nationales</p>
            <p className="text-xs text-muted-foreground">France Info, France Bleu et plus</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      {/* Alertes mairie */}
      <section>
        <header className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Megaphone className="h-4 w-4" /> Alertes de votre commune
          </h2>
        </header>
        {!alerts?.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
            Aucune alerte active. Vous serez prévenu·e si la mairie diffuse un message.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <ShieldAlert
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    a.severity === "urgent"
                      ? "text-sos"
                      : a.severity === "vigilance"
                        ? "text-warning"
                        : "text-muted-foreground"
                  }`}
                />
                <div className="flex-1">
                  <p className="font-medium leading-tight">{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                  {a.area_label && (
                    <p className="mt-1 text-xs text-muted-foreground">📍 {a.area_label}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Disclaimer */}
      <p className="rounded-xl border border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
        En cas de danger immédiat, composez toujours le <strong>17</strong> (police),{" "}
        <strong>18</strong> (pompiers) ou <strong>112</strong>. VigieCity ne remplace pas
        les services de secours.
      </p>
    </div>
  );
}

// ─── QuickAction ──────────────────────────────────────────────────────────────
function QuickAction({
  to,
  icon: Icon,
  label,
  tone,
}: {
  to: string;
  icon: typeof PhoneCall;
  label: string;
  tone: "primary" | "warning" | "muted";
}) {
  const toneCls =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "warning"
        ? "bg-warning text-warning-foreground"
        : "bg-card text-foreground border border-border";
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-4 shadow-card transition-transform active:scale-[0.97] ${toneCls}`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-sm font-semibold">{label}</span>
      <ChevronRight className="h-3 w-3 opacity-50" />
    </Link>
  );
}
