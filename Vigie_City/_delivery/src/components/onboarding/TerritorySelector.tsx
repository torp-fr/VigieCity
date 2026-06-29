/**
 * Step 1: Territory Selection Component
 * Supports choosing between single commune or EPCI (intercommunality)
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Search, X } from "lucide-react";
import { type Territory } from "@/lib/onboarding-utils";

interface TerritorySelectorProps {
  value: Territory | null;
  onChange: (territory: Territory | null) => void;
  disabled?: boolean;
}

interface CommuneOption {
  id: string;
  name: string;
  inseeCode: string;
  department: string;
  population?: number;
}

interface EPCIOption {
  id: string;
  name: string;
  siren?: string;
  type: string;
  communeCount: number;
}

export function TerritorySelector({ value, onChange, disabled }: TerritorySelectorProps) {
  const [mode, setMode] = useState<"commune" | "epci">(value?.type === "epci" ? "epci" : "commune");
  const [searchQuery, setSearchQuery] = useState("");
  const [communes, setCommunes] = useState<CommuneOption[]>([]);
  const [epcis, setEpcis] = useState<EPCIOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingEpci, setLoadingEpci] = useState(false);

  // Load all EPCIs on mount
  useEffect(() => {
    async function loadEpcis() {
      setLoadingEpci(true);
      try {
        const { data, error } = await supabase
          .from("intercommunalities")
          .select(
            `
            id,
            name,
            siren,
            type,
            collectivities(id)
          `,
          )
          .eq("is_active", true)
          .order("name");

        if (!error && data) {
          const epciList: EPCIOption[] = data.map((epci) => ({
            id: epci.id,
            name: epci.name,
            siren: epci.siren,
            type: epci.type,
            communeCount: (epci.collectivities as any[])?.length || 0,
          }));
          setEpcis(epciList);
        }
      } catch (err) {
        console.error("Error loading EPCIs:", err);
      } finally {
        setLoadingEpci(false);
      }
    }

    loadEpcis();
  }, []);

  // Search communes when mode changes or search query updates
  useEffect(() => {
    if (mode === "commune" && searchQuery.trim().length >= 2) {
      searchCommunes();
    } else {
      setCommunes([]);
    }
  }, [searchQuery, mode]);

  async function searchCommunes() {
    setSearching(true);
    try {
      const query = searchQuery.trim().toLowerCase();

      // Use RPC function if available, otherwise direct query
      const { data, error } = await supabase.rpc("search_communes", {
        query: query,
      }).catch(() => {
        // Fallback to direct ILIKE query
        return supabase
          .from("collectivities")
          .select("id, name, insee_code, department_code, population")
          .ilike("name", `%${query}%`)
          .limit(20);
      });

      if (!error && data) {
        const communeList = (data as any[]).map((c) => ({
          id: c.id,
          name: c.name,
          inseeCode: c.insee_code,
          department: c.department_code || "",
          population: c.population,
        }));
        setCommunes(communeList);
      }
    } catch (err) {
      console.error("Error searching communes:", err);
    } finally {
      setSearching(false);
    }
  }

  function selectCommune(commune: CommuneOption) {
    onChange({
      type: "commune",
      communeId: commune.id,
      communeName: commune.name,
      inseeCode: commune.inseeCode,
      department: commune.department,
      population: commune.population,
    });
    setSearchQuery("");
    setCommunes([]);
  }

  function selectEpci(epci: EPCIOption) {
    onChange({
      type: "epci",
      epciId: epci.id,
      epciName: epci.name,
      epciSiren: epci.siren,
      epciType: epci.type,
      communeCount: epci.communeCount,
    });
  }

  function clearSelection() {
    onChange(null);
    setSearchQuery("");
    setCommunes([]);
  }

  const selectedDisplay = value
    ? value.type === "commune"
      ? `${value.communeName} (INSEE: ${value.inseeCode})`
      : `${value.epciName} (${value.communeCount} communes)`
    : null;

  return (
    <div className="space-y-4">
      {/* Mode selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setMode("commune");
            clearSelection();
          }}
          disabled={disabled}
          className={`rounded-lg border-2 p-4 text-left transition-all ${
            mode === "commune"
              ? "border-blue-600 bg-blue-50"
              : "border-border hover:bg-muted disabled:opacity-50"
          }`}
        >
          <p className="text-sm font-semibold">Une commune</p>
          <p className="mt-1 text-xs text-muted-foreground">Contrat direct avec VigieCity</p>
        </button>
        <button
          onClick={() => {
            setMode("epci");
            clearSelection();
          }}
          disabled={disabled}
          className={`rounded-lg border-2 p-4 text-left transition-all ${
            mode === "epci"
              ? "border-blue-600 bg-blue-50"
              : "border-border hover:bg-muted disabled:opacity-50"
          }`}
        >
          <p className="text-sm font-semibold">Une intercommunalité (EPCI)</p>
          <p className="mt-1 text-xs text-muted-foreground">Contrat EPCI pour plusieurs communes</p>
        </button>
      </div>

      {/* Selection content */}
      <div className="rounded-lg border border-border bg-background p-4">
        {mode === "commune" ? (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Rechercher une commune *
            </label>

            {selectedDisplay ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 p-3 border border-green-200">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{selectedDisplay}</p>
                  </div>
                </div>
                <button
                  onClick={clearSelection}
                  className="text-green-600 hover:text-green-700"
                  aria-label="Annuler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ex: Saint-Germain, Lyon, Marseille..."
                  disabled={disabled}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
            )}

            {/* Commune search results */}
            {searchQuery && !selectedDisplay && (
              <div className="rounded-lg border border-border bg-card max-h-64 overflow-y-auto">
                {searching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Recherche en cours...
                  </div>
                ) : communes.length > 0 ? (
                  <div className="divide-y">
                    {communes.map((commune) => (
                      <button
                        key={commune.id}
                        onClick={() => selectCommune(commune)}
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                      >
                        <p className="font-medium text-sm">{commune.name}</p>
                        <p className="text-xs text-muted-foreground">
                          INSEE: {commune.inseeCode} • Dept: {commune.department}
                          {commune.population && ` • ${commune.population.toLocaleString("fr-FR")} hab.`}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucune commune trouvée
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Sélectionner une intercommunalité *
            </label>

            {selectedDisplay ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 p-3 border border-green-200">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{selectedDisplay}</p>
                  </div>
                </div>
                <button
                  onClick={clearSelection}
                  className="text-green-600 hover:text-green-700"
                  aria-label="Annuler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loadingEpci ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Chargement des EPCI...
                  </div>
                ) : epcis.length > 0 ? (
                  epcis.map((epci) => (
                    <button
                      key={epci.id}
                      onClick={() => selectEpci(epci)}
                      className="w-full rounded-lg border border-border p-3 text-left hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{epci.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {epci.type} • {epci.communeCount} communes
                            {epci.siren && ` • SIREN: ${epci.siren}`}
                          </p>
                        </div>
                        <span className="ml-2 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {epci.communeCount}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucune EPCI disponible
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedDisplay && (
        <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
          <p className="text-xs font-medium text-blue-600">
            Territoire sélectionné: <span className="font-semibold">{selectedDisplay}</span>
          </p>
        </div>
      )}
    </div>
  );
}
