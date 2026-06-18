import { useState, useEffect } from "react";
import { Siren, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Bouton SOS — appel rapide vers le 112 + vibration.
 * Version MVP : ouvre une feuille de confirmation avant d'appeler,
 * pour éviter les fausses alertes. L'appel réel passe par tel:112.
 * Chaque appel est loggé dans sos_events pour le suivi modérateur.
 */
export function SosButton() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);

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

  function trigger() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([200, 80, 200]);
    }
    setOpen(true);
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

  return (
    <>
      <button
        type="button"
        onClick={trigger}
        className="sos-pulse flex w-full items-center justify-center gap-3 rounded-3xl bg-sos px-6 py-7 text-sos-foreground transition-transform active:scale-[0.98]"
      >
        <Siren className="h-7 w-7" />
        <span className="text-2xl font-bold uppercase tracking-wider">SOS</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-sos">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">Alerte SOS</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choisissez le service à contacter. Votre position sera transmise.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              <a
                href="tel:112"
                onClick={() => { logSosEvent("112"); setOpen(false); }}
                className="flex items-center justify-between rounded-2xl bg-sos p-4 text-sos-foreground"
              >
                <span className="font-semibold">Appeler le 112</span>
                <span className="text-sm opacity-80">Urgences</span>
              </a>
              <a
                href="tel:17"
                onClick={() => { logSosEvent("17"); setOpen(false); }}
                className="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground"
              >
                <span className="font-semibold">Appeler le 17</span>
                <span className="text-sm opacity-80">Police / Gendarmerie</span>
              </a>
              <a
                href="tel:18"
                onClick={() => { logSosEvent("18"); setOpen(false); }}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <span className="font-semibold">Appeler le 18</span>
                <span className="text-sm text-muted-foreground">Pompiers</span>
              </a>
              <Link
                to="/signaler"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <span className="font-semibold">Signaler sans appel</span>
                <span className="text-sm text-muted-foreground">Discret</span>
              </Link>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Annulez en fermant si déclenché par erreur.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
