// AdBanner.tsx
// Composant publicitaire RGPD Article 7 GDPR :
//   - Consentement libre, eclaire, specifique, inequivoque
//   - Retrait possible a tout moment (via AdPreferencesPanel dans /profil)
//   - Lien vers politique de confidentialite
//   - Aucune donnee personnelle collectee (ciblage commune uniquement)

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Info } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  advertiser_name: string;
}

const EF_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const CONSENT_KEY = "ads_consent";

async function getAd(collectivityId?: string | null): Promise<Ad | null> {
  const params = collectivityId ? `?collectivity_id=${collectivityId}` : "";
  try {
    const res = await fetch(`${EF_BASE}/get-ad${params}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.ad ?? null;
  } catch {
    return null;
  }
}

export function trackAdEvent(
  adId: string,
  event: "impression" | "click",
  collectivityId?: string | null
) {
  fetch(`${EF_BASE}/track-ad-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      ad_id: adId,
      event_type: event,
      collectivity_id: collectivityId ?? null,
    }),
  }).catch(() => {});
}

// ─── Hook consentement ────────────────────────────────────────────────────────
export function useAdsConsent() {
  const [consent, setConsentState] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "true") setConsentState(true);
    else if (stored === "false") setConsentState(false);
    else setConsentState(null);
  }, []);

  const setConsent = (value: boolean) => {
    localStorage.setItem(CONSENT_KEY, String(value));
    setConsentState(value);
  };

  return { consent, setConsent };
}

// ─── AdBanner ─────────────────────────────────────────────────────────────────
interface AdBannerProps {
  collectivityId?: string | null;
}

export function AdBanner({ collectivityId }: AdBannerProps) {
  const { consent, setConsent } = useAdsConsent();
  const [ad, setAd] = useState<Ad | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (consent !== true) return;
    getAd(collectivityId).then(setAd);
  }, [consent, collectivityId]);

  useEffect(() => {
    if (ad && !tracked.current) {
      tracked.current = true;
      trackAdEvent(ad.id, "impression", collectivityId);
    }
  }, [ad, collectivityId]);

  // ── Pas encore de choix ──────────────────────────────────────────────────
  if (consent === null) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Soutenir VigieCity gratuitement
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              VigieCity affiche des annonces de{" "}
              <strong>partenaires locaux et regionaux</strong> pour financer ses
              services. Aucune donnee personnelle n\'est collectee ou revendue.
              Ciblage au niveau de la commune uniquement.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vous pouvez changer ce choix a tout moment dans votre profil.{" "}
              <Link to="/confidentialite" className="underline hover:text-foreground">
                Politique de confidentialite
              </Link>
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConsent(true)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                Oui, je soutiens
              </button>
              <button
                onClick={() => setConsent(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted transition"
              >
                Non merci
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Consentement refuse ou pas d\'annonce ────────────────────────────────
  if (consent === false || !ad || dismissed) return null;

  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Label reglementaire */}
      <div className="absolute top-2 left-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-white/90 uppercase tracking-wide">
        Annonce
      </div>
      {/* Bouton fermer */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-0.5 text-white/90 hover:bg-black/80 transition"
        aria-label="Fermer cette annonce"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {/* Contenu sponsorise */}
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        onClick={() => trackAdEvent(ad.id, "click", collectivityId)}
        className="block"
      >
        <img
          src={ad.image_url}
          alt={ad.title}
          className="h-24 w-full object-cover"
          loading="lazy"
        />
        <div className="px-3 py-2">
          <p className="text-xs font-semibold truncate">{ad.title}</p>
          <p className="text-[10px] text-muted-foreground">{ad.advertiser_name}</p>
        </div>
      </a>
      {/* Lien politique (discret) */}
      <div className="px-3 pb-2">
        <Link
          to="/confidentialite"
          className="text-[9px] text-muted-foreground/60 hover:text-muted-foreground underline"
        >
          Gerer mes preferences pub
        </Link>
      </div>
    </div>
  );
}
