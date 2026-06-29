import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";

interface Commune {
  id: string;
  name: string;
  population: number;
  epci_name?: string;
  epci_id?: string;
}

interface CommunitySelectorProps {
  onSelect: (commune: Commune) => void;
  onPopulationChange: (population: number) => void;
}

export function CommuneSelector({ onSelect, onPopulationChange }: CommunitySelectorProps) {
  const [communes, setCommunesData] = useState<Commune[]>([]);
  const [filteredCommunesData, setFilteredCommunesData] = useState<Commune[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState<Commune | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch communes from Supabase on mount
  useEffect(() => {
    const fetchCommunesData = async () => {
      try {
        setLoading(true);
        // Fetch from Supabase using the existing endpoint or direct query
        const response = await fetch("/api/collectivities?limit=36000");
        if (!response.ok) throw new Error("Failed to fetch communes");
        const data = await response.json();

        // Transform data to our interface
        const transformedCommunesData = (data.collectivities || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          population: c.population || 0,
          epci_name: c.epci?.name,
          epci_id: c.epci_id,
        }));

        setCommunesData(transformedCommunesData);
        setFilteredCommunesData(transformedCommunesData);
      } catch (error) {
        console.error("Error fetching communes:", error);
        // Fallback: use static data if available
      } finally {
        setLoading(false);
      }
    };

    fetchCommunesData();
  }, []);

  // Handle search and filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCommunesData(communes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = communes.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.epci_name?.toLowerCase().includes(query)
    );
    setFilteredCommunesData(filtered);
  }, [searchQuery, communes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCommune = (commune: Commune) => {
    setSelectedCommune(commune);
    onSelect(commune);
    onPopulationChange(commune.population);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Group communes by EPCI for display
  const groupedCommunesData = filteredCommunesData.reduce(
    (groups, commune) => {
      const epciName = commune.epci_name || "Communes isolées";
      if (!groups[epciName]) {
        groups[epciName] = [];
      }
      groups[epciName].push(commune);
      return groups;
    },
    {} as Record<string, Commune[]>
  );

  return (
    <div className="w-full" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Sélectionnez votre commune ou intercommunalité
      </label>

      <div className="relative">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tapez le nom de votre commune ou EPCI..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <ChevronDown
            className={`absolute right-3 top-3 h-5 w-5 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-3 text-center text-gray-500">
                Chargement des communes...
              </div>
            ) : filteredCommunesData.length === 0 ? (
              <div className="px-4 py-3 text-center text-gray-500">
                Aucune commune trouvée
              </div>
            ) : (
              Object.entries(groupedCommunesData).map(([epciName, communesInEpci]) => (
                <div key={epciName}>
                  {/* EPCI header */}
                  <div className="px-4 py-2 bg-gray-100 font-semibold text-sm text-gray-700 sticky top-0 border-b">
                    {epciName}
                    <span className="ml-2 text-xs text-gray-500">
                      ({communesInEpci.length})
                    </span>
                  </div>

                  {/* Communes in EPCI */}
                  {communesInEpci.map((commune) => (
                    <button
                      key={commune.id}
                      onClick={() => handleSelectCommune(commune)}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 border-b text-sm ${
                        selectedCommune?.id === commune.id
                          ? "bg-blue-100 text-blue-900"
                          : ""
                      }`}
                    >
                      <div className="font-medium">{commune.name}</div>
                      <div className="text-xs text-gray-500">
                        Population: {commune.population.toLocaleString("fr-FR")} hab.
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected commune display */}
      {selectedCommune && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            ✓ {selectedCommune.name}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Population: {selectedCommune.population.toLocaleString("fr-FR")} hab.
            {selectedCommune.epci_name && (
              <>
                {" • "}
                EPCI: {selectedCommune.epci_name}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
