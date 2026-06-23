import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/features")({
  component: FeaturesPage,
});

// Catalogue de features disponibles
const FEATURE_LIST = [
  { key: "sos", label: "Bouton SOS", desc: "Alerte d'urgence géolocalisée" },
  { key: "voisins_vigilants", label: "Voisins Vigilants", desc: "Réseau de surveillance citoyenne" },
  { key: "publications", label: "Actualités mairie", desc: "Publication d'informations officielles" },
  { key: "services", label: "Services commune", desc: "Annuaire des services locaux" },
  { key: "carte", label: "Carte interactive", desc: "Vue cartographique des signalements" },
  { key: "alertes_push", label: "Push notifications", desc: "Alertes push via PWA" },
  { key: "export_csv", label: "Export CSV", desc: "Export des données pour analyse" },
  { key: "routage", label: "Routage signalements", desc: "Assignation auto par catégorie" },
  { key: "stats_avancees", label: "Statistiques avancées", desc: "Recharts + export PDF" },
  { key: "white_label", label: "White-label (V2)", desc: "Logo + couleurs personnalisés" },
] as const;

type FeatureKey = typeof FEATURE_LIST[number]["key"];

function FeaturesPage() {
  const qc = useQueryClient();
  const [localEdits, setLocalEdits] = useState<Record<string, Record<FeatureKey, boolean>>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["platform-features"],
    queryFn: async () => {
      const { data: licenses, error } = await supabase
        .from("commune_licenses")
        .select("id, collectivity_id, plan, status, features, collectivities(name)")
        .eq("status", "active")
        .order("collectivity_id");
      if (error) throw error;
      return licenses ?? [];
    },
  });

  function getFeatures(licId: string, currentFeatures: any): Record<FeatureKey, boolean> {
    if (localEdits[licId]) return localEdits[licId] as Record<FeatureKey, boolean>;
    const f = currentFeatures ?? {};
    return Object.fromEntries(FEATURE_LIST.map(({ key }) => [key, f[key] ?? false])) as Record<FeatureKey, boolean>;
  }

  function toggleFeature(licId: string, currentFeatures: any, key: FeatureKey) {
    const current = getFeatures(licId, currentFeatures);
    setLocalEdits((prev) => ({
      ...prev,
      [licId]: { ...current, [key]: !current[key] },
    }));
  }

  const saveAll = useMutation({
    mutationFn: async () => {
      const ops = Object.entries(localEdits).map(([licId, features]) =>
        supabase.from("commune_licenses").update({ features }).eq("id", licId)
      );
      const results = await Promise.all(ops);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-features"] });
      setLocalEdits({});
      toast.success("Feature flags sauvegardés");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const hasChanges = Object.keys(localEdits).length > 0;
  const changeCount = Object.keys(localEdits).length;

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Chargement…</div>;

  return (
    <PlatformShell activePath="/platform/features">
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" /> Feature flags
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Activez ou désactivez les fonctionnalités par commune
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={() => saveAll.mutate()}
            disabled={saveAll.isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saveAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saveAll.isPending ? "Enregistrement…" : `Sauvegarder (${changeCount} commune${changeCount > 1 ? "s" : ""})`}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-600 inline-block" /> Activé</div>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-border inline-block" /> Désactivé</div>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-400 inline-block" /> Modifié (non sauvegardé)</div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/50 text-left px-4 py-3 font-semibold text-muted-foreground w-40">Commune</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Plan</th>
              {FEATURE_LIST.map(({ key, label }) => (
                <th key={key} className="px-2 py-3 font-medium text-muted-foreground text-xs text-center whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map((lic) => {
              const features = getFeatures(lic.id, lic.features);
              const isEdited = !!localEdits[lic.id];
              return (
                <tr key={lic.id} className={`hover:bg-muted/20 transition-colors ${isEdited ? "bg-amber-50/50" : ""}`}>
                  <td className="sticky left-0 z-10 bg-card px-4 py-3">
                    <p className="font-medium text-sm">{(lic as any).collectivities?.name ?? lic.collectivity_id.slice(0, 8)}</p>
                    {isEdited && <span className="text-xs text-amber-600 font-medium">modifié</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      lic.plan === "trial" ? "bg-amber-100 text-amber-700" :
                      lic.plan === "pro" ? "bg-violet-100 text-violet-700" :
                      lic.plan === "metropole" ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {lic.plan}
                    </span>
                  </td>
                  {FEATURE_LIST.map(({ key }) => (
                    <td key={key} className="px-2 py-3 text-center">
                      <button
                        onClick={() => toggleFeature(lic.id, lic.features, key)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${
                          features[key] ? "bg-blue-600" : "bg-gray-200"
                        }`}
                        title={`${features[key] ? "Désactiver" : "Activer"} ${key} pour ${(lic as any).collectivities?.name}`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                            features[key] ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                  ))}
                </tr>
              );
            })}
            {data?.length === 0 && (
              <tr>
                <td colSpan={FEATURE_LIST.length + 2} className="text-center py-12 text-muted-foreground">
                  Aucune commune avec licence active
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Les feature flags sont stockés en JSONB sur <code className="bg-muted px-1 rounded">commune_licenses.features</code>.
        Les modifications ne sont appliquées qu'après avoir cliqué « Sauvegarder ».
      </p>
    </div>
    </PlatformShell>
  );
}
