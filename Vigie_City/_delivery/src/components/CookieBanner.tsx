import { useState, useEffect } from "react";
import { Cookie, X, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "vigiecity_cookie_consent";

type ConsentState = "accepted" | "declined" | null;

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState | null;
    setConsent(stored);
    if (!stored) {
      // Small delay so the banner slides in after page load
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setConsent("accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setConsent("declined");
    setVisible(false);
    // If PostHog is loaded, opt out
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.opt_out_capturing();
    }
  }

  // Don't render if consent already given or banner not yet shown
  if (consent !== null || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm"
    >
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Cookie className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-800">Cookies & confidentialité</span>
          </div>
          <button
            onClick={decline}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Refuser et fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <p className="text-[13px] leading-relaxed text-gray-600">
            VigieCity utilise des cookies d'analyse (PostHog, serveurs EU) pour améliorer
            l'application. Aucun cookie publicitaire. Vos données ne sont pas revendues.
          </p>
          <Link
            to="/confidentialite"
            className="mt-1 inline-block text-[12px] text-blue-500 hover:underline"
          >
            En savoir plus →
          </Link>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={decline}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[13px] font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Refuser
          </button>
          <button
            onClick={accept}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-blue-700"
          >
            <Check className="h-3.5 w-3.5" />
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
