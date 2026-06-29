/**
 * useWeatherVigilance -- Realtime weather vigilance alerts for user's commune
 * Listens to weather_vigilance_logs changes via Realtime
 */

import { useEffect, useState, createElement } from "react";
import { useAppAuth } from "./useAppAuth";

export interface WeatherAlert {
  id: string;
  collectivity_id: string;
  level: "GREEN" | "YELLOW" | "ORANGE" | "RED";
  description: string | null;
  phenomena: string | null;
  valid_from: string | null;
  valid_to: string | null;
  synced_at: string;
}

const LEVEL_COLORS = {
  GREEN:  "bg-green-100 text-green-800 border-green-300",
  YELLOW: "bg-yellow-100 text-yellow-800 border-yellow-300",
  ORANGE: "bg-orange-100 text-orange-800 border-orange-300",
  RED:    "bg-red-100 text-red-800 border-red-300",
};

const LEVEL_LABELS = {
  GREEN:  "Vigilant",
  YELLOW: "Modere",
  ORANGE: "Eleve",
  RED:    "Extreme",
};

const LEVEL_EMOJIS = {
  GREEN:  "ok",
  YELLOW: "!",
  ORANGE: "!!",
  RED:    "SOS",
};

export function useWeatherVigilance() {
  const { supabase, collectivity_id } = useAppAuth();
  const [alert, setAlert] = useState<WeatherAlert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !collectivity_id) {
      setLoading(false);
      return;
    }

    const fetchAlert = async () => {
      const { data, error } = await supabase
        .from("weather_vigilance_logs")
        .select("*")
        .eq("collectivity_id", collectivity_id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching weather alert:", error);
      }

      setAlert(data ?? null);
      setLoading(false);
    };

    fetchAlert();

    const subscription = supabase
      .channel(`weather:collectivity_id=eq.${collectivity_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weather_vigilance_logs",
          filter: `collectivity_id=eq.${collectivity_id}`,
        },
        (payload: any) => {
          if (payload.eventType === "DELETE") {
            setAlert(null);
          } else {
            setAlert(payload.new as WeatherAlert);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, collectivity_id]);

  return {
    alert,
    loading,
    level_colors: LEVEL_COLORS,
    level_labels: LEVEL_LABELS,
    level_emojis: LEVEL_EMOJIS,
  };
}

/**
 * Helper: render level badge (no JSX -- uses createElement so this file stays .ts)
 */
export function WeatherLevelBadge({ level }: { level: string }) {
  const colors = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || LEVEL_COLORS.GREEN;
  const label = LEVEL_LABELS[level as keyof typeof LEVEL_LABELS] || "Vigilant";
  const emoji = LEVEL_EMOJIS[level as keyof typeof LEVEL_EMOJIS] || "ok";
  return createElement(
    "span",
    { className: `inline-flex items-center gap-1 px-2 py-1 rounded border ${colors} font-semibold text-sm` },
    emoji + " " + label
  );
}
