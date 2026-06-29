import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Radio,
  Search,
  Heart,
  Play,
  Pause,
  Loader2,
  X,
  Music,
  Wifi,
} from "lucide-react";
import { useRadio } from "@/hooks/useRadio";
import { supabase } from "@/integrations/supabase/client";
import type { RadioStation } from "@/lib/radio";

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "Radio — VigieCity" },
      { name: "description", content: "Écoutez la radio locale et nationale." },
    ],
  }),
  component: RadioPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "selection" | "explorer" | "favoris";

interface RBStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  codec: string;
  bitrate: number;
  votes: number;
}

interface LocalStream {
  id: string;
  name: string;
  stream_url: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface FavoriteRow {
  id: string;
  station_uuid: string;
  station_name: string;
  stream_url: string;
  logo_url: string | null;
  source: string;
}

// ── Genre filters ─────────────────────────────────────────────────────────────

const GENRES = [
  { label: "Tous", tag: "" },
  { label: "Actualités", tag: "news" },
  { label: "Pop", tag: "pop" },
  { label: "Rock", tag: "rock" },
  { label: "Jazz", tag: "jazz" },
  { label: "Classique", tag: "classical" },
  { label: "Électro", tag: "electronic" },
  { label: "Hip-Hop", tag: "hip-hop" },
  { label: "Variété", tag: "french" },
  { label: "Oldies", tag: "oldies" },
];

const RB_BASE = "https://de1.api.radio-browser.info";

// ── Converters ────────────────────────────────────────────────────────────────

function rbToStation(s: RBStation): RadioStation {
  return { id: s.stationuuid, name: s.name, stream_url: s.url_resolved, logo_url: s.favicon || null };
}
function localToStation(s: LocalStream): RadioStation {
  return { id: s.id, name: s.name, stream_url: s.stream_url, logo_url: s.logo_url };
}
function favToStation(f: FavoriteRow): RadioStation {
  return { id: f.station_uuid, name: f.station_name, stream_url: f.stream_url, logo_url: f.logo_url };
}

// ── Station Card ──────────────────────────────────────────────────────────────

interface StationCardProps {
  name: string;
  logoUrl?: string | null;
  subtitle?: string;
  isFavorite: boolean;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onToggleFavorite?: () => void;
  canFavorite: boolean;
}

function StationCard({
  name, logoUrl, subtitle, isFavorite, isActive, isPlaying, isLoading,
  onPlay, onToggleFavorite, canFavorite,
}: StationCardProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition-colors ${
        isActive ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      {/* Logo */}
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="h-full w-full object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <Music className="h-5 w-5 text-muted-foreground" />
        )}
        {isActive && isPlaying && (
          <div className="absolute inset-0 flex items-end justify-center gap-[2px] bg-black/30 pb-1.5">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-[3px] rounded-sm bg-white animate-bounce"
                style={{ animationDelay: `${i * 0.1}s`, animationDuration: "0.6s", height: "6px" }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm leading-tight truncate ${isActive ? "text-primary" : "text-foreground"}`}>
          {name}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Favorite toggle */}
      {canFavorite && onToggleFavorite && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`shrink-0 rounded-lg p-1.5 transition-colors ${
            isFavorite ? "text-red-500" : "text-muted-foreground hover:text-red-400"
          }`}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      )}

      {/* Play/Pause */}
      <button
        onClick={onPlay}
        className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 ${
          isPlaying
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted hover:bg-primary/10 text-foreground"
        }`}
        aria-label={isPlaying ? "Pause" : "Écouter"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function RadioPage() {
  const [tab, setTab] = useState<Tab>("selection");
  const [userId, setUserId] = useState<string | null>(null);

  // Local curated streams
  const [localStreams, setLocalStreams] = useState<LocalStream[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  // Radio Browser
  const [rbStations, setRbStations] = useState<RBStation[]>([]);
  const [rbLoading, setRbLoading] = useState(false);
  const [rbError, setRbError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const rbFetched = useRef(false);

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [pendingFav, setPendingFav] = useState<Set<string>>(new Set());

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const radio = useRadio();

  // ── Auth ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load local streams ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("radio_streams")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setLocalStreams((data as LocalStream[]) ?? []);
        setLocalLoading(false);
      });
  }, []);

  // ── Load favorites ────────────────────────────────────────────────────────────
  const loadFavorites = useCallback(async () => {
    if (!userId) { setFavorites([]); return; }
    setFavLoading(true);
    const { data } = await supabase
      .from("user_radio_favorites")
      .select("*")
      .order("created_at", { ascending: false });
    setFavorites((data as FavoriteRow[]) ?? []);
    setFavLoading(false);
  }, [userId]);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const favSet = new Set(favorites.map((f) => f.station_uuid));

  // ── Toggle favorite ───────────────────────────────────────────────────────────
  const toggleFavorite = useCallback(
    async (
      uuid: string,
      name: string,
      streamUrl: string,
      logoUrl: string | null | undefined,
      source: string
    ) => {
      if (!userId || pendingFav.has(uuid)) return;
      setPendingFav((prev) => new Set(prev).add(uuid));
      try {
        if (favSet.has(uuid)) {
          await supabase
            .from("user_radio_favorites")
            .delete()
            .eq("station_uuid", uuid);
        } else {
          await supabase.from("user_radio_favorites").upsert(
            {
              user_id: userId,
              station_uuid: uuid,
              station_name: name,
              stream_url: streamUrl,
              logo_url: logoUrl ?? null,
              source,
            },
            { onConflict: "user_id,station_uuid" }
          );
        }
        await loadFavorites();
      } finally {
        setPendingFav((prev) => { const s = new Set(prev); s.delete(uuid); return s; });
      }
    },
    [userId, favSet, pendingFav, loadFavorites]
  );

  // ── Radio Browser fetch ───────────────────────────────────────────────────────
  const fetchRB = useCallback(async (q: string, g: string) => {
    setRbLoading(true);
    setRbError(null);
    try {
      let url: string;
      if (g && !q) {
        url = `${RB_BASE}/json/stations/bytag/${encodeURIComponent(g)}?countrycode=FR&limit=60&order=votes&reverse=true&hidebroken=true`;
      } else {
        const params = new URLSearchParams({
          countrycode: "FR",
          limit: "60",
          order: "votes",
          reverse: "true",
          hidebroken: "true",
        });
        if (q) params.set("name", q);
        if (g) params.set("tagList", g);
        url = `${RB_BASE}/json/stations/search?${params.toString()}`;
      }
      const res = await fetch(url, { headers: { "User-Agent": "VigieCity/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RBStation[] = await res.json();
      setRbStations(data.filter((s) => s.url_resolved && s.name.trim()));
    } catch (err) {
      console.error("[radio-browser]", err);
      setRbError("Impossible de contacter Radio Browser. Vérifiez votre connexion.");
      setRbStations([]);
    } finally {
      setRbLoading(false);
    }
  }, []);

  // Auto-fetch explorer on first open
  useEffect(() => {
    if (tab === "explorer" && !rbFetched.current) {
      rbFetched.current = true;
      fetchRB("", "");
    }
  }, [tab, fetchRB]);

  // Debounced search
  const handleSearch = (value: string) => {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchRB(value, genre), 400);
  };

  const handleGenre = (g: string) => {
    setGenre(g);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    fetchRB(query, g);
  };

  // ── Play helper ───────────────────────────────────────────────────────────────
  const handlePlay = (station: RadioStation) => {
    if (radio.station?.id === station.id && radio.playing) {
      radio.pause();
    } else {
      radio.play(station);
    }
  };

  // ── Tab: Sélection ────────────────────────────────────────────────────────────
  const renderSelection = () => {
    if (localLoading) {
      return (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (localStreams.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <Radio className="h-12 w-12 text-muted-foreground opacity-25" />
          <p className="text-sm text-muted-foreground">Aucune station configurée</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground px-1 mb-3">Stations sélectionnées par VigieCity</p>
        {localStreams.map((s) => {
          const station = localToStation(s);
          const isActive = radio.station?.id === s.id;
          return (
            <StationCard
              key={s.id}
              name={s.name}
              logoUrl={s.logo_url}
              subtitle={s.description ?? undefined}
              isFavorite={favSet.has(s.id)}
              isActive={isActive}
              isPlaying={isActive && radio.playing}
              isLoading={isActive && radio.loading}
              onPlay={() => handlePlay(station)}
              onToggleFavorite={() => toggleFavorite(s.id, s.name, s.stream_url, s.logo_url, "local")}
              canFavorite={!!userId}
            />
          );
        })}
      </div>
    );
  };

  // ── Tab: Explorer FM ──────────────────────────────────────────────────────────
  const renderExplorer = () => (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          inputMode="search"
          placeholder="Rechercher une radio..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-9 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); fetchRB("", genre); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Effacer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Genre chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as CSSProperties}
      >
        {GENRES.map((g) => (
          <button
            key={g.tag}
            onClick={() => handleGenre(g.tag)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              genre === g.tag
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {rbLoading ? (
        <div className="flex items-center justify-center gap-2 py-14 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Chargement des radios...</span>
        </div>
      ) : rbError ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <Wifi className="h-12 w-12 text-muted-foreground opacity-25" />
          <p className="text-sm text-muted-foreground">{rbError}</p>
          <button onClick={() => fetchRB(query, genre)} className="text-sm font-medium text-primary hover:underline">
            Réessayer
          </button>
        </div>
      ) : rbStations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <Radio className="h-12 w-12 text-muted-foreground opacity-25" />
          <p className="text-sm text-muted-foreground">Aucun résultat</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">
            {rbStations.length} station{rbStations.length > 1 ? "s" : ""} — France
            {!userId && (
              <span className="ml-2 opacity-70">· Connectez-vous pour sauvegarder des favoris</span>
            )}
          </p>
          {rbStations.map((s) => {
            const station = rbToStation(s);
            const isActive = radio.station?.id === s.stationuuid;
            const subtitleParts = [
              s.bitrate > 0 ? `${s.bitrate} kbps` : null,
              s.codec ? s.codec.toUpperCase() : null,
              s.tags
                ? s.tags.split(",").slice(0, 3).map((t) => t.trim()).filter(Boolean).join(", ")
                : null,
            ].filter(Boolean);
            return (
              <StationCard
                key={s.stationuuid}
                name={s.name}
                logoUrl={s.favicon || null}
                subtitle={subtitleParts.join(" · ") || undefined}
                isFavorite={favSet.has(s.stationuuid)}
                isActive={isActive}
                isPlaying={isActive && radio.playing}
                isLoading={isActive && radio.loading}
                onPlay={() => handlePlay(station)}
                onToggleFavorite={() =>
                  toggleFavorite(s.stationuuid, s.name, s.url_resolved, s.favicon || null, "radio-browser")
                }
                canFavorite={!!userId}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Tab: Mes favoris ──────────────────────────────────────────────────────────
  const renderFavoris = () => {
    if (!userId) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Heart className="h-14 w-14 text-muted-foreground opacity-20" />
          <div>
            <p className="font-semibold text-foreground">Sauvegardez vos favoris</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[220px] mx-auto">
              Connectez-vous pour retrouver vos stations préférées sur tous vos appareils.
            </p>
          </div>
          <a
            href="/auth"
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md active:scale-95 transition-transform"
          >
            Se connecter
          </a>
        </div>
      );
    }
    if (favLoading) {
      return (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (favorites.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Heart className="h-14 w-14 text-muted-foreground opacity-20" />
          <div>
            <p className="font-semibold text-foreground">Aucun favori pour l'instant</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[240px] mx-auto">
              Appuyez sur ♡ depuis la Sélection ou Explorer FM pour sauvegarder une station ici.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground px-1 mb-3">
          {favorites.length} station{favorites.length > 1 ? "s" : ""} sauvegardée{favorites.length > 1 ? "s" : ""}
        </p>
        {favorites.map((f) => {
          const station = favToStation(f);
          const isActive = radio.station?.id === f.station_uuid;
          return (
            <StationCard
              key={f.id}
              name={f.station_name}
              logoUrl={f.logo_url}
              subtitle={f.source === "local" ? "Sélection VigieCity" : undefined}
              isFavorite={true}
              isActive={isActive}
              isPlaying={isActive && radio.playing}
              isLoading={isActive && radio.loading}
              onPlay={() => handlePlay(station)}
              onToggleFavorite={() =>
                toggleFavorite(f.station_uuid, f.station_name, f.stream_url, f.logo_url, f.source)
              }
              canFavorite={true}
            />
          );
        })}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="px-4 pt-5 pb-0">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Radio</h1>
          </div>

          <div className="flex">
            {(["selection", "explorer", "favoris"] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = {
                selection: "Sélection",
                explorer: "Explorer FM",
                favoris: "Mes favoris",
              };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
                    tab === t
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-4 pt-4 pb-6">
        {tab === "selection" && renderSelection()}
        {tab === "explorer" && renderExplorer()}
        {tab === "favoris" && renderFavoris()}
      </div>
    </div>
  );
}
