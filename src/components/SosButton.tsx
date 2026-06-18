import { useState, useEffect, useRef } from "react";
import { Siren, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const HOLD_DURATION = 2000; // ms
const SOS_QUOTA = 2; // max SOS per 24h

/**
 * Bouton SOS — maintien 2 secondes pour déclencher (anti fausse alerte).
 * Quota : 2 déclenchements maximum par 24h.
 * L'appel réel passe par tel:112. Chaque appel est loggé dans sos_events.
 */
export function SosButton() {
  const [open, setOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0–100
  const [userId, setUserId] = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", uid)
          .single();
        setCollectivityId(profile?.collectivity_id ?? null);
      }
    });
  }, []);

  function cancelHold() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setHoldProgress(0);
  }

  function startHold() {
    if (holdTimerRef.current) return; // already holding
    holdStartRef.current = Date.now();
    setHoldProgress(0);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      setHoldProgress(Math.min(100, (elapsed / HOLD_DURATION) * 100));
    }, 40);

    holdTimerRef.current = setTimeout(async () => {
      clearInterval(progressIntervalRef.current!);
      progressIntervalRef.current = null;
      holdTimerRef.current = null;
      setHoldProgress(100);

      // Quota check
      if (userId) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("sos_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", since);
        if ((count ?? 0) >= SOS_QUOTA) {
          toast.error("Quota atteint : 2 alertes SOS maximum par 24 heures.");
          setHoldProgress(0);
          return;
        }
      }

      // Vibrate + open modal
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([200, 80, 200]);
      }
      setHoldProgress(0);
      setOpen(true);
    }, HOLD_DURATION);
  }

  async function logSosEvent(phoneNumber: string) {
    if (!userId) return;
    let lat: number | null = null;
    let lng: number | null = null;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
            resolve();
          },
          () => resolve(),
          { timeout: 3000 },
        );
      });
    }
    await supabase.from("sos_events").insert({
      user_id: userId,
      collectivity_id: collectivityId,
      lat,
      lng,
      message: `Appel ${phoneNumber} via VigieCity`,
    });
  }

  // Cleanup on unmount
  useEffect(() => () => cancelHold(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        // Prevent context menu on long-press (mobile)
        onContextMenu={(e) => e.preventDefault()}
        className="sos-pulse relative flex w-full select-none items-center justify-center gap-3 overflow-hidden rounded-3xl bg-sos px-6 py-7 text-sos-foreground transition-transform active:scale-[0.98]"
        style={{ touchAction: "none" }}
      >
        {/* Progress bar */}
        {holdProgress > 0 && (
          <div
            className="absolute inset-0 origin-left bg-white/20 transition-none"
            style={{ transform: `scaleX(${holdProgress / 100})` }}
          />
        )}
        <Siren className="relative h-7 w-7" />
        <span className="relative text-2xl font-bold uppercase tracking-wider">
          {holdProgress > 0 ? "Maintenez…" : "SOS"}
        </span>
        {holdProgress === 0 && (
          <span className="relative text-xs font-normal opacity-70">(maintenez 2s)</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center 