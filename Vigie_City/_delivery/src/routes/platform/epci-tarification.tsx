import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Loader2, Building2, Users, Percent, Euro, ChevronDown,
  Search, ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";
import { calculateEPCITariff, formatEUR, CommundData, TariffBreakdown } from "@/lib/tariffCalculation";

export const Route = createFileRoute("/platform/epci-tarification")({
  component: EpciTarificationPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface EPCI {
  id: string;
  name: string;
  siren: string | null;
  type: string;
  region: string | null;
  department: string | null;
  max_communes: number;
  is_active: boolean;
  contact_name: string | null;
  contact_email: string | null;
}

interface EPCIWithTariff extends EPCI {
  communes: CommundData[];
  tariff: TariffBreakdown;
}

// ── Page ───────────────────────────────────────────────────────────────────────

function EpciTarificationPage() {
  return (
    <PlatformShell activePath="/platform/epci-tarification">
      <EpciTarificationContent />
    </PlatformShell>
  );
}

function EpciTarificationContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "communes" | "tariff">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedEpci, setSelectedEpci] = useState<EPCIWithTariff | null>(null);

  // Fetch all EPCIs and their communes
  const { data: epcisWithTariffs = [], isLoading, error } = useQuery({
    queryKey: ["platform/epci-tarification"],
    queryFn: async () => {
      // Fetch EPCIs
      const { data: epcis, error: epciError } = await supabase
        .from("intercommunalities")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (epciError) throw epciError;

      // Fetch communes and calculate tariffs
      const epcisWithData = await Promise.all(
        (epcis as EPCI[]).map(async (epci) => {
          const { data: communes, error: commError } = await supabase
            .from("collectivities")
            .select("id, name, population")
            .eq("epci_id", epci.id)
            .eq("is_active", true);

          if (commError) throw commError;

          const communeData = (communes || []).map((c: any) => ({
            name: c.name,
            population: c.population || 5000, // Default if no population
            code: c.id,
          }));

          const tariff = calculateEPCITariff(communeData);

          return {
            ...epci,
            communes: communeData,
            tariff,
          };
        })
      );

      return epcisWithData as EPCIWithTariff[];
    },
  });

  // Filter and sort
  const filtered = useMemo(() => {
    let result = epcisWithTariffs.filter((epci) =>
      epci.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      let aVal: any = a.name;
      let bVal: any = b.name;

      if (sortBy === "communes") {
        aVal = a.tariff.count;
        bVal = b.tariff.count;
      } else if (sortBy === "tariff") {
        aVal = a.tariff.final;
        bVal = b.tariff.final;
      }

      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [epcisWithTariffs, searchTerm, sortBy, sortOrder]);

  const handleSort = (column: "name" | "communes" | "tariff") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Erreur : {error instanceof Error ? error.message : "Impossible de charger les EPCIs"}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">EPCI Tarification</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vue d'ensemble des tarifs calculés pour tous les EPCIs — {filtered.length} EPCI{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un EPCI..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Table Header */}
          <div className="sticky top-0 border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="grid grid-cols-[2fr_120px_160px_160px] gap-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div
                onClick={() => handleSort("name")}
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600"
              >
                Nom EPCI
                {sortBy === "name" && (
                  <ArrowUpDown className={`h-3.5 w-3.5 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                )}
              </div>
              <div
                onClick={() => handleSort("communes")}
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600"
              >
                Communes
                {sortBy === "communes" && (
                  <ArrowUpDown className={`h-3.5 w-3.5 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                )}
              </div>
              <div className="text-left">Réduction</div>
              <div
                onClick={() => handleSort("tariff")}
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600"
              >
                Tarif final
                {sortBy === "tariff" && (
                  <ArrowUpDown className={`h-3.5 w-3.5 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                )}
              </div>
            </div>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="mb-3 h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-400">Aucun EPCI trouvé</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filtered.map((epci) => (
                <li
                  key={epci.id}
                  onClick={() => setSelectedEpci(epci)}
                  className="grid grid-cols-[2fr_120px_160px_160px] items-center gap-4 px-6 py-4 transition hover:bg-slate-50 cursor-pointer"
                >
                  {/* EPCI Name */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{epci.name}</p>
                      <p className="text-xs text-slate-400">{epci.department || "—"}</p>
                    </div>
                  </div>

                  {/* Communes */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Users className="h-4 w-4 text-slate-400" />
                    {epci.tariff.count}
                  </div>

                  {/* Reduction */}
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">
                      {epci.tariff.reduction}%
                    </span>
                  </div>

                  {/* Final Tariff */}
                  <div className="flex items-center gap-2 text-lg font-bold text-blue-700">
                    <Euro className="h-5 w-5" />
                    {epci.tariff.final}
                    <span className="text-xs font-medium text-slate-400">/mois</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEpci && (
        <EPCIDetailModal epci={selectedEpci} onClose={() => setSelectedEpci(null)} />
      )}
    </>
  );
}

// ── EPCIDetailModal ────────────────────────────────────────────────────────────

function EPCIDetailModal({
  epci,
  onClose,
}: {
  epci: EPCIWithTariff;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{epci.name}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {epci.department && `${epci.department} · `}
              {epci.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Communes</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{epci.tariff.count}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase text-blue-600">Réduction</p>
              <p className="mt-2 text-2xl font-bold text-blue-900">{epci.tariff.reduction}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase text-green-600">Tarif final</p>
              <p className="mt-2 text-2xl font-bold text-green-900">{formatEUR(epci.tariff.final)}/mois</p>
            </div>
          </div>

          {/* Tariff Breakdown */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Calcul du tarif</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <span className="text-slate-600">Tarif brut (avant réduction)</span>
                <span className="font-semibold text-slate-900">{formatEUR(epci.tariff.brut)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                <span className="text-blue-600">Réduction appliquée</span>
                <span className="font-semibold text-blue-900">
                  -{formatEUR((epci.tariff.brut * epci.tariff.reduction) / 100)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border-2 border-green-200">
                <span className="font-semibold text-green-900">Tarif mensuel (TTC)</span>
                <span className="text-lg font-bold text-green-900">{formatEUR(epci.tariff.final)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                <span className="text-green-600">Tarif annuel</span>
                <span className="font-semibold text-green-900">{formatEUR(epci.tariff.annualTotal)}</span>
              </div>
            </div>
          </div>

          {/* Tier Breakdown */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Répartition par tier</h4>
            <div className="space-y-2">
              {epci.tariff.tierBreakdown.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune commune</p>
              ) : (
                epci.tariff.tierBreakdown.map((tier) => (
                  <div key={tier.tier} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-semibold text-slate-900">{tier.label}</p>
                      <p className="text-xs text-slate-400">{formatEUR(tier.price)}/commune</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{tier.count}</p>
                      <p className="text-xs text-slate-400">
                        {formatEUR(tier.price * tier.count)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Communes List */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3">Communes ({epci.communes.length})</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {epci.communes.map((commune) => (
                <div key={commune.code} className="flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-50">
                  <span className="text-slate-700">{commune.name}</span>
                  <span className="text-xs text-slate-400">{commune.population.toLocaleString("fr-FR")} hab</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
