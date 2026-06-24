// AdPreferencesPanel.tsx
// Section "Preferences publicitaires" a integrer dans /profil
// Permet de changer le consentement ads_consent a tout moment (RGPD art. 7 al. 3)

import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Megaphone, Info } from "lucide-react";

const CONSENT_KEY = "ads_consent";

export function AdPreferencesPanel() {
  const [consent, setConsentState] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "true") setConsentState(true);
    else if (stored === "false") setConsentState(false);
    else setConsentState(null);
  }, []);

  function toggle() {
    const next = consent === true ? false : true;
    localStorage.setItem(CONSENT_KEY, String(next));
    setConsentState(next);
  }

  function reset() {
    localStorage.removeItem(CONSENT_KEY);
    setConsentState(null);
  }

  const label =
    consent === null
      ? "Pas encore choisi"
      : consent
      ? "Annonces activees"
      : "Annonces desactivees";

  const dot =
    consent === null
      ? "bg-amber-400"
      : consent
      ? "bg-green-500"
      : "bg-slate-400";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Preferences publicitaires
        </h3>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
          <span className="text-sm text-foreground">{label}</span>
        </div>
        {/* Toggle */}
        <button
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
            consent === true ? "bg-primary" : "bg-muted"
          }`}
          role="switch"
          aria-checked={consent === true}
          aria-label="Activer les annonces locales"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              consent === true ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        VigieCity affiche des annonces de{" "}
        <strong>partenaires locaux et regionaux</strong> pour financer ses services
        gratuits. Aucun profil publicitaire n'est cree. Ciblage a la commune
        uniquement.{" "}
        <Link to="/confidentialite" className="underline hover:text-foreground">
          Politique de confidentialite
        </Link>
      </p>

      {consent !== null && (
        <button
          onClick={reset}
          className="mt-3 text-xs text-muted-foreground/60 hover:text-muted-foreground underline"
        >
          Reinitialiser mon choix
        </button>
      )}

      <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-muted/50 p-2.5">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Conformement au RGPD, vous pouvez retirer votre consentement a tout moment.
          Cela n'affecte pas la licite du traitement effectue avant ce retrait.
        </p>
      </div>
    </div>
  );
}
