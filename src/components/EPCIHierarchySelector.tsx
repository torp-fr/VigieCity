import { useState, useEffect } from "react";
import { ChevronDown, MapPin } from "lucide-react";

interface Commune {
  id: string;
  name: string;
  population: number;
  epci_name?: string;
}

interface EPCIHierarchySelectorProps {
  onSelect: (commune: Commune) => void;
  onPopulationChange: (population: number) => void;
}

export function EPCIHierarchySelector({ onSelect, onPopulationChange }: EPCIHierarchySelectorProps) {
  const [regions, setRegions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [epcis, setEpcis] = useState<Array<{ id: string; name: string }>>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedEpci, setSelectedEpci] = useState<string | null>(null);
  const [selectedCommune, setSelectedCommune] = useState<Commune | null>(null);

  const [loading, setLoading] = useState(false);

  // Fetch regions on mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "/api/hierarchy?level=regions"
        );
        if (!response.ok) throw new Error("Failed to fetch regions");
        const data = await response.json();
        setRegions(data.regions || []);
      } catch (error) {
        console.error("Error fetching regions:", error);
      } finally {
        setLoading(false);
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
      setCommunes([]);
      return;
    }

    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/hierarchy?level=departments&region=${encodeURIComponent(selectedRegion)}`
        );
        if (!response.ok) throw new Error("Failed to fetch departments");
        const data = await response.json();
        setDepartments(data.departments || []);
      } catch (error) {
        console.error("Error fetching departments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, [selectedRegion]);

  // Fetch EPCIs when department changes
  useEffect(() => {
    if (!selectedDepartment || !selectedRegion) {
      setEpcis([]);
      setSelectedEpci(null);
      setCommunes([]);
      return;
    }

    const fetchEpcis = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/hierarchy?level=epcis&region=${encodeURIComponent(selectedRegion)}&department=${encodeURIComponent(selectedDepartment)}`
        );
        if (!response.ok) throw new Error("Failed to fetch EPCIs");
        const data = await response.json();
        setEpcis(data.epcis || []);
      } catch (error) {
        console.error("Error fetching EPCIs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEpcis();
  }, [selectedRegion, selectedDepartment]);

  // Fetch communes when EPCI changes
  useEffect(() => {
    if (!selectedEpci) {
      setCommunes([]);
      return;
    }

    const fetchCommunes = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/hierarchy?level=communes&epci_id=${encodeURIComponent(selectedEpci)}`
        );
        if (!response.ok) throw new Error("Failed to fetch communes");
        const data = await response.json();
        setCommunes(data.communes || []);
      } catch (error) {
        console.error("Error fetching communes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunes();
  }, [selectedEpci]);

  const handleCommuneSelect = (commune: Commune) => {
    setSelectedCommune(commune);
    onSelect(commune);
    onPopulationChange(commune.population);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Sélectionnez votre territoire</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Region Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Région
          </label>
          <select
            value={selectedRegion || ""}
            onChange={(e) => setSelectedRegion(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Choisir une région...</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Department Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Département
          </label>
          <select
            value={selectedDepartment || ""}
            onChange={(e) => setSelectedDepartment(e.target.value || null)}
            disabled={!selectedRegion}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Choisir un département...</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* EPCI Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Intercommunalité (EPCI)
          </label>
          <select
            value={selectedEpci || ""}
            onChange={(e) => setSelectedEpci(e.target.value || null)}
            disabled={!selectedDepartment}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Choisir une intercommunalité...</option>
            {epcis.map((epci) => (
              <option key={epci.id} value={epci.id}>
                {epci.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Communes list */}
      {selectedEpci && communes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Communes ({communes.length})
          </label>
          <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg">
            {communes.map((commune) => (
              <button
                key={commune.id}
                onClick={() => handleCommuneSelect(commune)}
                className={`w-full text-left px-4 py-3 border-b text-sm hover:bg-blue-50 transition ${
                  selectedCommune?.id === commune.id ? "bg-blue-100" : ""
                }`}
              >
                <div className="font-medium text-gray-900">{commune.name}</div>
                <div className="text-xs text-gray-500">
                  {commune.population.toLocaleString("fr-FR")} hab.
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected commune summary */}
      {selectedCommune && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            ✓ {selectedCommune.name}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Population: {selectedCommune.population.toLocaleString("fr-FR")} hab.
            {selectedCommune.epci_name && ` • EPCI: ${selectedCommune.epci_name}`}
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-gray-500 py-4">
          Chargement...
        </div>
      )}
    </div>
  );
}
