// AdBanner.tsx
// Composant publicitaire RGPD-ready : affiche une annonce si le citoyen a consenti
// Charge via EF get-ad (publique), track via EF track-ad-event (publique)
// Consent stocke dans localStorage["ads_consent"] = "true" | "false"

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  advertiser_name: string;
}

const EF_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAd(collectivityId?: string | null): Promise<Ad | null> {
  const params = collectivityId ? `?collectivity_id=${collectivityId}` : "";
  const res = await fetch(`${EF_BASE}/get-ad${params}`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.ad ?? null;
}

async function trackEvent(adId: string, event: "impression" | "click", collectivityId?: string | null) {
  fetch(`${EF_BASE}/track-ad-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ ad_id: adId, event_type: event, collectivity_id: collectivityId ?? null }),
  }).catch(() => {});
}

interface AdBannerProps {
  collectivityId?: string | null;
}

export function AdBanner({ collectivityId }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const tracked = useRef(false);

  // Lire le consentement en memoire
  useEffect(() => {
    const stored = localStorage.getItem("ads_consent");
    if (stored === "true") setConsent(true);
    else if (stored === "false") setConsent(false);
    else setConsent(null); // pas encore choisi
  }, []);

  // Charger l\'annonce si consent = true
  useEffect(() => {
    if (consent !== true) return;
    getAd(collectivityId).then((a) => setAd(a));
  }, [consent, collectivityId]);

  // Tracker l\'impression une seule fois au mount
  useEffect(() => {
    if (ad && !tracked.current) {
      tracked.current = true;
      trackEvent(ad.id, "impression", collectivityId);
    }
  }, [ad, collectivityId]);

  // Pas encore de choix -> demander le consentement
  if (consent === null) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <p className="font-semibold text-foreground">Annonces VigieCity</p>
        <p className="mt-1 text-muted-foreground text-xs">
          VigieCity affiche des annonces de partenaires locaux pour financer ses services gratuits.
          Acceptez-vous de voir ces annonces ?
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => { localStorage.setItem("ads_consent", "true"); setConsent(true); }}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Oui, je soutiens
          </button>
          <button
            onClick={() => { localStorage.setItem("ads_consent", "false"); setConsent(false); }}
            className="rounded-xl border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted"
          >
            Non merci
          </button>
        </div>
      </div>
    );
  }

  // Consent false ou pas d\'annonce disponible -> rien
  if (consent === false || !ad || dismissed) return null;

  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Label */}
      <div className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-semibold text-white/80 uppercase tracking-wide">
        Annonce
      </div>
      {/* Fermer */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 rounded-full bg-black/50 p-0.5 text-white/80 hover:bg-black/70"
        aria-label="Fermer l\'annonce"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {/* Image + lien */}
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        onClick={() => trackEvent(ad.id, "click", collectivityId)}
      >
        <img
          src={ad.image_url}
          alt={ad.title}
          className="h-24 w-full object-cover"
        />
        <div className="px-3 py-2">
          <p className="text-xs font-semibold truncate">{ad.title}</p>
          <p className="text-[10px] text-muted-foreground">{ad.advertiser_name}</p>
        </div>
      </a>
    </div>
  );
}
