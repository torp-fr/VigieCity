import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// La clé publique VAPID est fetchée depuis l'Edge Function vapid-key
// → aucune config .env.local nécessaire
let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    const { data, error } = await supabase.functions.invoke("vapid-key");
    if (error || !data?.key) return null;
    cachedVapidKey = data.key as string;
    return cachedVapidKey;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  const output  = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushStatus = "unsupported" | "denied" | "granted" | "default";

/**
 * Hook pour gérer les Web Push notifications.
 * - `subscribe()` : demande la permission et sauvegarde la subscription dans Supabase
 * - `unsubscribe()` : annule la subscription et la supprime de Supabase
 *
 * La clé publique VAPID est récupérée automatiquement via l'Edge Function `vapid-key`.
 */
export function usePushNotifications(userId: string | null) {
  const [status, setStatus]   = useState<PushStatus>("default");
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  useEffect(() => {
    if (!isSupported) { setStatus("unsupported"); return; }
    setStatus(Notification.permission as PushStatus);
  }, [isSupported]);

  // Préchauffer le cache VAPID key au montage
  useEffect(() => {
    if (!isSupported || fetched.current) return;
    fetched.current = true;
    getVapidPublicKey();
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!userId || !isSupported) return;
    setLoading(true);
    try {
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        console.warn("[push] VAPID public key unavailable — vapid-key Edge Function non déployée ?");
        return;
      }

      const permission = await Notification.requestPermission();
      setStatus(permission as PushStatus);
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      await supabase.from("push_subscriptions").upsert(
        {
          user_id:  userId,
          endpoint: json.endpoint,
          p256dh:   json.keys.p256dh,
          auth:     json.keys.auth,
        },
        { onConflict: "user_id,endpoint" },
      );
    } catch (err) {
      console.error("[push] subscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!userId || !isSupported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", sub.endpoint);
      }
      setStatus("default");
    } catch (err) {
      console.error("[push] unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, isSupported]);

  return { status, loading, subscribe, unsubscribe, isSupported };
}
