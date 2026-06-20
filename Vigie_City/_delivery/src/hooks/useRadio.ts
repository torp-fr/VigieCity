import { useState, useEffect } from "react";
import * as radio from "@/lib/radio";
import type { RadioStation } from "@/lib/radio";

/**
 * Hook React pour le player radio.
 * Se connecte au singleton audio via le pattern subscriber.
 */
export function useRadio() {
  const [state, setState] = useState(radio.getState());

  useEffect(() => {
    const unsub = radio.subscribe(() => setState(radio.getState()));
    // Sync immédiat au montage (si déjà en lecture)
    setState(radio.getState());
    return unsub;
  }, []);

  return {
    ...state,
    play: (station: RadioStation) => radio.playStation(station),
    pause: radio.pause,
    toggle: radio.toggle,
    stop: radio.stop,
  };
}
