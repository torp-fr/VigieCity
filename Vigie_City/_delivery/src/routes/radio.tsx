import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Play, Pause, Radio, Loader2, Volume2, VolumeX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRadio } from "@/hooks/useRadio";
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

// ─── WMO : juste pour l'illustration visuelle ──────────────────────────────
const WAVE_COLORS = [
  "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE",
];

// ─── Page ─────────────────────────────────────────────────────────────────────
function RadioPage() {
  const { station, playing, loading, error, play, toggle } = useRadio();
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", data.user.id)
          .single();
        setCollectivityId(profile?.collectivity_id ?? null);
      }
    });
  }, []);

  // Sync volume sur l'audio singleton
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = document.querySelector("audio") as HTMLAudioElement | null;
    if (audio) {
      audio.volume = muted ? 0 : volume / 100;
    }
  }, [volume, muted]);

  // Flux radios : locaux d'abord, puis nationaux
  const { data: streams = [], isLoading } = useQuery({
    queryKey: ["radio-streams", collectivityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radio_streams")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as RadioStation[];
    },
  });

  // Séparer locales / nationales
  const local    = streams.filter((s) => (s as any).collectivity_id === collectivityId);
  const national = streams.filter((s) => !(s as any).collectivity_id);

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] px-4 pt-6">
      {/* Header */}
      <header className="flex items-center gap-3 mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Radio className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Radio</h1>
          <p className="text-sm text-muted-foreground">Locale & nationale</p>
        </div>
      </header>

      {/* Player actif */}
      {station && (
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-6 text-center">
          {/* Artwork / visualizer */}
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 shadow-lg">
            {playing ? (
              <Visualizer />
            ) : (
              <Radio className="h-10 w-10 text-primary opacity-70" />
            )}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">
            En écoute
          </p>
          <h2 className="text-xl font-bold mb-4">{station.name}</h2>

          {error && (
            <p className="mb-3 text-xs text-sos">{error}</p>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setMuted((m) => !m)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
              aria-label={muted ? "Réactiver le son" : "Couper le son"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <button
              onClick={toggle}
              disabled={loading}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95 disabled:opacity-60"
              aria-label={playing ? "Pause" : "Lecture"}
            >
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : playing ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 pl-0.5" />
              )}
            </button>

            {/* Volume slider */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setMuted(false);
                }}
                className="w-20 accent-primary"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {local.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                📍 Radio de votre commune
              </h2>
              <StreamList streams={local} onPlay={play} active={station} />
            </section>
          )}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              🎵 Radios nationales
            </h2>
            <StreamList streams={national} onPlay={play} active={station} />
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Liste de streams ─────────────────────────────────────────────────────────
function StreamList({
  streams,
  onPlay,
  active,
}: {
  streams: RadioStation[];
  onPlay: (s: RadioStation) => void;
  active: RadioStation | null;
}) {
  const { playing, toggle } = useRadio();

  return (
    <ul className="space-y-2">
      {streams.map((s) => {
        const isActive = active?.id === s.id;
        return (
          <li key={s.id}>
            <button
              onClick={() => {
                if (isActive) {
                  toggle();
                } else {
                  onPlay(s);
                }
              }}
              className={[
                "w-full flex items-center gap-4 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98]",
                isActive
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card hover:bg-muted",
              ].join(" ")}
            >
              {/* Icône */}
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${
                  isActive ? "bg-primary/20" : "bg-muted"
                }`}
              >
                {isActive && playing ? (
                  <MiniEqualizer />
                ) : (
                  <Radio className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                )}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isActive ? "text-primary" : ""}`}>
                  {s.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{s.stream_url}</p>
              </div>

              {/* Play/Pause button */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {isActive && playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 pl-0.5" />
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Visualiseur animé ────────────────────────────────────────────────────────
function Visualizer() {
  return (
    <div className="flex items-end gap-1 h-10">
      {WAVE_COLORS.map((color, i) => (
        <span
          key={i}
          className="w-2 rounded-t-sm animate-bounce"
          style={{
            backgroundColor: color,
            animationDelay: `${i * 0.12}s`,
            animationDuration: `${0.5 + i * 0.05}s`,
            height: `${40 + i * 10 - Math.abs(i - 2) * 12}%`,
          }}
        />
      ))}
    </div>
  );
}

function MiniEqualizer() {
  return (
    <span className="flex items-end gap-[2px] h-4">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-primary animate-bounce"
          style={{ animationDelay: `${i * 0.1}s`, animationDuration: "0.6s" }}
        />
      ))}
    </span>
  );
}
