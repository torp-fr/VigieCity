/**
 * WeatherVigilanceWidget — Home banner alert + detailed modal
 * Shows weather vigilance alerts (ORANGE/RED) prominently
 */

import { useState } from "react";
import { useWeatherVigilance, WeatherLevelBadge } from "@/hooks/useWeatherVigilance";

interface Props {
  compact?: boolean; // true = banner only, false = full card
}

export function WeatherVigilanceWidget({ compact = false }: Props) {
  const { alert, loading, level_emojis } = useWeatherVigilance();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) {
    return null; // Don't show skeleton, just hide while loading
  }

  // Only show banner if ORANGE or RED
  if (!alert || (alert.level !== "ORANGE" && alert.level !== "RED")) {
    return null;
  }

  const emoji = level_emojis[alert.level as keyof typeof level_emojis];
  const isHighAlert = alert.level === "RED";

  // Banner mode (compact)
  if (compact) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`w-full px-4 py-3 rounded-lg border-l-4 cursor-pointer transition hover:shadow-md ${
            isHighAlert
              ? "bg-red-50 border-red-500 text-red-900"
              : "bg-orange-50 border-orange-500 text-orange-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{emoji}</span>
              <div className="text-left">
                <p className="font-bold text-sm">
                  Alerte météo
                </p>
                <p className="text-xs opacity-80">
                  {alert.description || "Consultez les détails"}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold">ℹ️</span>
          </div>
        </button>

        {/* Modal */}
        {isModalOpen && (
          <WeatherVigilanceModal
            alert={alert}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </>
    );
  }

  // Card mode (full)
  return (
    <div
      className={`rounded-lg border-2 p-4 ${
        isHighAlert
          ? "bg-red-50 border-red-400"
          : "bg-orange-50 border-orange-400"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Alerte météo vigilance</h3>
          <WeatherLevelBadge level={alert.level} />
          <p className="mt-2 text-sm">{alert.description}</p>
          {alert.phenomena && (
            <p className="mt-1 text-xs opacity-75">
              Phénomènes : {alert.phenomena}
            </p>
          )}
          <p className="mt-2 text-xs opacity-60">
            Mis à jour : {new Date(alert.synced_at).toLocaleTimeString("fr-FR")}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal détaillée pour alertes météo
 */
function WeatherVigilanceModal({ alert, onClose }: any) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Alerte météo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Niveau d'alerte</p>
            <div className="mt-1">
              <WeatherLevelBadge level={alert.level} />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600">Description</p>
            <p className="mt-1 font-medium">{alert.description}</p>
          </div>

          {alert.phenomena && (
            <div>
              <p className="text-sm text-gray-600">Phénomènes</p>
              <p className="mt-1">{alert.phenomena}</p>
            </div>
          )}

          {alert.valid_from && (
            <div>
              <p className="text-sm text-gray-600">Validité</p>
              <p className="mt-1 text-sm">
                Du {new Date(alert.valid_from).toLocaleDateString("fr-FR")}{" "}
                {alert.valid_to &&
                  `au ${new Date(alert.valid_to).toLocaleDateString("fr-FR")}`}
              </p>
            </div>
          )}

          <div className="border-t pt-3">
            <p className="text-xs text-gray-500">
              Source : Météo-France
              <br />
              Mis à jour :{" "}
              {new Date(alert.synced_at).toLocaleString("fr-FR")}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
        >
          Fermer
        </button>
      </div>
    </>
  );
}
