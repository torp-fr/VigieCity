import { Link } from "@tanstack/react-router";
import { Play, Pause, X, Radio, Loader2 } from "lucide-react";
import { useRadio } from "@/hooks/useRadio";

/**
 * Mini-player persistant affiché au-dessus de la BottomNav quand une radio est active.
 * Se cache automatiquement si aucune station n'est sélectionnée.
 */
export function MiniRadioPlayer() {
  const { station, playing, loading, stop, toggle } = useRadio();

  if (!station) return null;

  return (
    <div className="border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Icône + station */}
        <Link
          to="/radio"
          className="flex flex-1 items-center gap-3 min-w-0"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : playing ? (
              <Equalizer />
            ) : (
              <Radio className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{station.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {loading ? "Chargement…" : playing ? "En écoute" : "En pause"}
            </p>
          </div>
        </Link>

        {/* Boutons */}
        <button
          onClick={(e) => { e.preventDefault(); toggle(); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label={playing ? "Pause" : "Lecture"}
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); stop(); }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-label="Fermer le player"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Equalizer animé 3 barres quand la radio joue */
function Equalizer() {
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
