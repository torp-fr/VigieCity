import { Bell, X } from "lucide-react";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationBannerProps {
  userId: string | null;
}

/**
 * Bandeau discret proposant d'activer les notifications push.
 * S'affiche uniquement si :
 *   - Le navigateur supporte les push (ServiceWorker + PushManager + VAPID configuré)
 *   - La permission n'est pas encore accordée ou refusée
 *   - L'utilisateur est connecté
 *   - Le bandeau n'a pas été masqué manuellement dans la session
 */
export function NotificationBanner({ userId }: NotificationBannerProps) {
  const { status, loading, subscribe, isSupported } = usePushNotifications(userId);
  const [dismissed, setDismissed] = useState(false);

  if (
    !isSupported ||
    status === "granted" ||
    status === "denied" ||
    status === "unsupported" ||
    dismissed ||
    !userId
  ) {
    return null;
  }

  return (
    <div className="mx-4 my-2 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <Bell className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Activer les notifications</p>
        <p className="text-xs text-muted-foreground">
          Soyez alerté des réponses de la mairie
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={subscribe}
          disabled={loading}
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? "…" : "Activer"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
