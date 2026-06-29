import { useState, useEffect } from "react";
import { Search, MapPin } from "lucide-react";

interface Commune {
  code: string;
  nom: string;
  population: number;
  codesPostaux?: string[];
  isEPCI?: boolean;  // Flag if this is an EPCI (not a single commune)
}

interface DualTerritorySelectorProps {
  onSelect: (commune: Commune) => void;
  onPopulationChange: (population: number) => void;
}

export function DualTerritorySelector({
  onSelect,
  onPopulationChange,
}: DualTerritorySelectorProps) {
  const [mode, setMode] = useState<"commune" | "cascade">("commune");

  // Mode Commune
  const [communeSearch, setCommuneSearch] = useState("");
  const [filteredCommunes, setFilteredCommunes] = useState<Commune[]>([]);
  const [selectedCommune, setSelectedCommune] = useState<Commune | null>(null);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [showCommuneDropdown, setShowCommuneDropdown] = useState(false);

  // Mode Cascade (Région → Département → EPCI)
  const [regions, setRegions] = useState<Array<{ code: string; nom: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ code: string; nom: string }>>([]);
  const [epcis, setEpcis] = useState<Array<{ code: string; nom: string }>>([]);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedEpci, setSelectedEpci] = useState<{ code: string; nom: string } | null>(null);
  const [loadingCascade, setLoadingCascade] = useState(false);

  // ─────────────────────────────────────────────────────────────────
  // MODE COMMUNE: Search communes via api.geo.gouv.fr
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!communeSearch.trim() || communeSearch.length < 2) {
      setFilteredCommunes([]);
      return;
    }

    const fetchCommunes = async () => {
      try {
        setLoadingCommunes(true);
        const response = await fetch(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(communeSearch)}&limit=100`
        );
        if (!response.ok) throw new Error("Failed to fetch communes");
        const data = await response.json();
        setFilteredCommunes(data || []);
      } catch (error) {
        console.error("Error fetching communes:", error);
        setFilteredCommunes([]);
      } finally {
        setLoadingCommunes(false);
      }
    };

    const debounceTimer = setTimeout(fetchCommunes, 300);
    return () => clearTimeout(debounceTimer);
  }, [communeSearch]);

  // ─────────────────────────────────────────────────────────────────
  // MODE CASCADE: Fetch regions on mount
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoadingCascade(true);
        const response = await fetch("https://geo.api.gouv.fr/regions");
        if (!response.ok) throw new Error("Failed to fetch regions");
        const data = await response.json();
        setRegions(data || []);
      } catch (error) {
        console.error("Error fetching regions:", error);
        setRegions([]);
      } finally {
        setLoadingCascade(false);
      }
    };
    fetchRegions();
  }, []);

  // Fetch departments when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setDepartments([]);
      setSelectedDepartment(null);
      setEpcis([]);
      setSelectedEpci(null);
      return;
    }

    const fetchDepartments = async () => {
      try {
        setLoadingCascade(true);
        const response = await fetch(
          `https://geo.api.gouv.fr/regions/${encodeURIComponent(selectedRegion)}/departements`
        );
        if (!response.ok) throw new Error("Failed to fetch departments");
        const data = await response.json();
        setDepartments(data || []);
      } catch (error) {
        console.error("Error fetching departments:", error);
        setDepartments([]);
      } finally {
        setLoadingCascade(false);
      }
    };

    fetchDepartments();
  }, [selectedRegion]);

  // Fetch EPCIs when department changes
  useEffect(() => {
    if (!selectedDepartment) {
      setEpcis([]);
      setSelectedEpci(null);
      return;
    }

    const fetchEpcis = async () => {
      try {
        setLoadingCascade(true);

        // Step 1: Get communes of the department to extract EPCI codes
        const communesResponse = await fetch(
          `https://geo.api.gouv.fr/departements/${encodeURIComponent(selectedDepartment)}/communes`
        );
        if (!communesResponse.ok) throw new Error("Failed to fetch communes");
        const communes = await communesResponse.json();

        // Extract unique EPCI codes
        const epciCodes = new Set<string>();
        communes.forEach((commune: any) => {
          if (commune.codeEpci) {
            epciCodes.add(commune.codeEpci);
          }
        });

        // Step 2: Fetch all EPCI details in parallel
        const epciPromises = Array.from(epciCodes).map((code) =>
          fetch(`https://geo.api.gouv.fr/epcis/${encodeURIComponent(code)}`)
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null)
        );

        const epciResults = await Promise.all(epciPromises);
        const filteredEpcis = epciResults
          .filter((epci): epci is { code: string; nom: string; population?: number } => epci !== null)
          .sort((a, b) => a.nom.localeCompare(b.nom));

        setEpcis(filteredEpcis);
      } catch (error) {
        console.error("Error fetching EPCIs:", error);
        setEpcis([]);
      } finally {
        setLoadingCascade(false);
      }
    };

    fetchEpcis();
  }, [selectedDepartment]);

  // ─────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────

  const handleSelectCommune = (commune: Commune) => {
    setSelectedCommune(commune);
    onSelect(commune);
    onPopulationChange(commune.population || 0);
    setCommuneSearch("");
    setShowCommuneDropdown(false);
  };

  const handleSelectEpci = (epci: { code: string; nom: string; population?: number }) => {
    // Create a pseudo-commune object from EPCI for compatibility
    const epciAsCommune: Commune = {
      code: epci.code,
      nom: epci.nom,
      population: epci.population || 0,
      isEPCI: true,  // ← Flag this as an EPCI selection
    };
    setSelectedCommune(epciAsCommune);
    onSelect(epciAsCommune);
    onPopulationChange(epci.population || 0);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Sélectionnez votre territoire</h3>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => {
            setMode("commune");
            setSelectedCommune(null);
          }}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
            mode === "commune"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🔍 Recherche par commune
        </button>
        <button
          onClick={() => {
            setMode("cascade");
            setSelectedCommune(null);
          }}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
            mode === "cascade"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📍 Sélection par EPCI
        </button>
      </div>

      {/* MODE COMMUNE */}
      {mode === "commune" && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Tapez le nom de votre commune
          </label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Ex: Paris, Lyon, Marseille..."
                value={communeSearch}
                onChange={(e) => {
                  setCommuneSearch(e.target.value);
                  setShowCommuneDropdown(true);
                }}
                onFocus={() => setShowCommuneDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Dropdown */}
            {showCommuneDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {loadingCommunes ? (
                  <div className="px-4 py-3 text-center text-gray-500 text-sm">
                    Chargement...
                  </div>
                ) : communeSearch.length < 2 ? (
                  <div className="px-4 py-3 text-center text-gray-500 text-sm">
                    Tapez au moins 2 caractères
                  </div>
                ) : filteredCommunes.length === 0 ? (
                  <div className="px-4 py-3 text-center text-gray-500 text-sm">
                    Aucune commune trouvée
                  </div>
                ) : (
                  filteredCommunes.map((commune) => (
                    <button
                      key={commune.code}
                      onClick={() => handleSelectCommune(commune)}
                      className={`w-full text-left px-4 py-3 border-b hover:bg-blue-50 transition text-sm ${
                        selectedCommune?.code === commune.code ? "bg-blue-100" : ""
                      }`}
                    >
                      <div className="font-medium text-gray-900">{commune.nom}</div>
                      <div className="text-xs text-gray-500">
                        {(commune.population ?? 0).toLocaleString("fr-FR")} hab.
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE CASCADE: Région → Département → EPCI */}
      {mode === "cascade" && (
        <div className="space-y-4">
          {/* Région */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Région
            </label>
            <select
              value={selectedRegion || ""}
              onChange={(e) => setSelectedRegion(e.target.value || null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Choisir une région...</option>
              {regions.length === 0 && !loadingCascade && (
                <option disabled>Aucune région disponible</option>
              )}
              {regions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.nom}
                </option>
              ))}
            </select>
            {loadingCascade && selectedRegion && (
              <p className="text-xs text-gray-500 mt-1">Chargement...</p>
            )}
          </div>

          {/* Département */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Département
            </label>
            <select
              value={selectedDepartment || ""}
              onChange={(e) => setSelectedDepartment(e.target.value || null)}
              disabled={!selectedRegion}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Choisir un département...</option>
              {departments.length === 0 && selectedRegion && !loadingCascade && (
                <option disabled>Aucun département trouvé</option>
              )}
              {departments.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.nom}
                </option>
              ))}
            </select>
          </div>

          {/* EPCI List */}
          {selectedDepartment && epcis.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3. Intercommunalité (EPCI) ({epcis.length})
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                {epcis.map((epci) => (
                  <button
                    key={epci.code}
                    onClick={() => handleSelectEpci(epci)}
                    className={`w-full text-left px-4 py-3 border-b text-sm hover:bg-blue-50 transition ${
                      selectedCommune?.code === epci.code ? "bg-blue-100" : ""
                    }`}
                  >
                    <div className="font-medium text-gray-900">{epci.nom}</div>
                    {epci.population && (
                      <div className="text-xs text-gray-500">
                        {epci.population.toLocaleString("fr-FR")} hab.
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedDepartment && epcis.length === 0 && !loadingCascade && (
            <div className="px-4 py-3 text-center text-gray-500 text-sm border border-gray-200 rounded-lg">
              Aucune EPCI trouvée pour ce département
            </div>
          )}
        </div>
      )}

      {/* Selected Summary */}
      {selectedCommune && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-semibold text-green-900">
            ✓ {selectedCommune.nom}
          </p>
          <p className="text-xs text-green-700 mt-1">
            Population: {(selectedCommune.population ?? 0).toLocaleString("fr-FR")} hab.
          </p>
        </div>
      )}
    </div>
  );
}
