import { Download, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallBanner() {
  const { canInstall, install, dismiss } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-[5.5rem] left-3 right-3 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-2xl bg-primary p-4 shadow-xl">
        {/* Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Smartphone className="h-6 w-6 text-white" />
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">
            Installer VigieCity
          </p>
          <p className="text-xs text-blue-100 mt-0.5 leading-tight">
            Accès rapide depuis votre écran d'accueil
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={install}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-primary shadow-sm active:scale-95 transition-transform"
        >
          <Download className="h-3.5 w-3.5" />
          Installer
        </button>

        {/* Fermer */}
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 rounded-lg p-1.5 text-blue-200 hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
