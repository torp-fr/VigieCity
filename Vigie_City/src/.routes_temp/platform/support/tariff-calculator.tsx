import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Building2, Plus, Trash2, Copy, Download,
  Euro, Users, Percent, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";
import { calculateEPCITariff, formatEUR, CommundData, TariffBreakdown } from "@/lib/tariffCalculation";

export const Route = createFileRoute("/platform/support/tariff-calculator")({
  component: TariffCalculatorPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface EPCI {
  id: string;
  name: string;
  siren: string | null;
  type: string;
}

// ── Page ───────────────────────────────────────────────────────────────────────

function TariffCalculatorPage() {
  return (
    <PlatformShell activePath="/platform/support">
      <TariffCalculatorContent />
    </PlatformShell>
  );
}

function TariffCalculatorContent() {
  const [mode, setMode] = useState<"epci" | "manual">("epci");
  const [selectedEpciId, setSelectedEpciId] = useState<string>("");
  const [manualCommunes, setManualCommunes] = useState<CommundData[]>([
    { name: "", population: 5000 },
  ]);
  const [result, setResult] = useState<TariffBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Fetch EPCIs
  const { data: epcis = [], isLoading: epciLoading } = useQuery({
    queryKey: ["support/epci-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intercommunalities")
        .select("id, name, siren")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data as EPCI[]) || [];
    },
  });

  // Calculate tariff for selected EPCI
  const handleCalculateEpci = async () => {
    if (!selectedEpciId) {
      toast.error("Veuillez sélectionner un EPCI");
      return;
    }

    setCalculating(true);
    try {
      const { data: communes, error } = await supabase
        .from("collectivities")
        .select("id, name, population")
        .eq("epci_id", selectedEpciId)
        .eq("is_active", true);

      if (error) throw error;

      const communeData = (communes || []).map((c: any) => ({
        name: c.name,
        population: c.population || 5000,
        code: c.id,
      }));

      if (communeData.length === 0) {
        toast.error("Cet EPCI n'a pas de communes actives");
        return;
      }

      const tariff = calculateEPCITariff(communeData);
      setResult(tariff);
      toast.success(`Tarif calculé pour ${communeData.length} communes`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du calcul");
    } finally {
      setCalculating(false);
    }
  };

  // Calculate tariff for manual input
  const handleCalculateManual = () => {
    const validCommunes = manualCommunes.filter(
      (c) => c.name.trim() && c.population > 0
    );

    if (validCommunes.length === 0) {
      toast.error("Veuillez ajouter au moins une commune valide");
      return;
    }

    const tariff = calculateEPCITariff(validCommunes);
    setResult(tariff);
    toast.success(`Tarif calculé pour ${validCommunes.length} communes`);
  };

  // Copy result to clipboard
  const handleCopyResult = () => {
    if (!result) return;

    const text = `
Calcul de tarif VigieCity
========================

Communes : ${result.count}
Tarif brut : ${formatEUR(result.brut)} /mois
Réduction : ${result.reduction}%
Tarif final : ${formatEUR(result.final)} /mois
Tarif annuel : ${formatEUR(result.annualTotal)}

Répartition par tier:
${result.tierBreakdown.map((t) => `  ${t.label}: ${t.count} × ${formatEUR(t.price)}`).join("\n")}

Source: Calculateur de tarif VigieCity (Support)
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  };

  // Export as CSV
  const handleExportCSV = () => {
    if (!result) return;

    const rows = [
      ["Calcul de tarif VigieCity"],
      [],
      ["Communes", result.count],
      ["Tarif brut", result.brut],
      ["Réduction", `${result.reduction}%`],
      ["Tarif final /mois", result.final],
      ["Tarif annuel", result.annualTotal],
      [],
      ["Tier", "Nombre", "Prix unitaire", "Sous-total"],
      ...result.tierBreakdown.map((t) => [
        t.label,
        t.count,
        t.price,
        t.price * t.count,
      ]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tarif-vigiicity-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Fichier téléchargé");
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Calcul de tarif</h1>
        <p className="mt-1 text-sm text-slate-500">
          Outil interne pour vérifier les tarifs clients et répondre aux demandes
        </p>
      </div>

      {/* Mode selector */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setMode("epci")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
            mode === "epci"
              ? "bg-blue-600 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Par EPCI
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
            mode === "manual"
              ? "bg-blue-600 text-white"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Entrée manuelle
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Input Panel */}
        <div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">
              {mode === "epci" ? "Sélectionner un EPCI" : "Ajouter des communes"}
            </h2>

            {mode === "epci" ? (
              <>
                {/* EPCI Selector */}
                {epciLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedEpciId}
                      onChange={(e) => setSelectedEpciId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none mb-4"
                    >
                      <option value="">Choisir un EPCI...</option>
                      {epcis.map((epci) => (
                        <option key={epci.id} value={epci.id}>
                          {epci.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleCalculateEpci}
                      disabled={calculating || !selectedEpciId}
                      className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {calculating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Calculer"
                      )}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Manual Input */}
                <div className="space-y-3 mb-4">
                  {manualCommunes.map((commune, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nom commune"
                        value={commune.name}
                        onChange={(e) => {
                          const updated = [...manualCommunes];
                          updated[idx].name = e.target.value;
                          setManualCommunes(updated);
                        }}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Population"
                        value={commune.population}
                        onChange={(e) => {
                          const updated = [...manualCommunes];
                          updated[idx].population = Number(e.target.value);
                          setManualCommunes(updated);
                        }}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                      <button
                        onClick={() => {
                          setManualCommunes(manualCommunes.filter((_, i) => i !== idx));
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setManualCommunes([...manualCommunes, { name: "", population: 5000 }])
                  }
                  className="mb-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une commune
                </button>

                <button
                  onClick={handleCalculateManual}
                  className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  Calculer
                </button>
              </>
            )}
          </div>
        </div>

        {/* Result Panel */}
        <div>
          {result ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Résultat</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyResult}
                    className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                    title="Copier"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="rounded-lg p-2 text-slate-400 hover:bg-green-50 hover:text-green-600"
                    title="Télécharger CSV"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <p className="text-xs font-semibold uppercase text-slate-400">Communes</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{result.count}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
                  <p className="text-xs font-semibold uppercase text-blue-600">Réduction</p>
                  <p className="mt-1 text-xl font-bold text-blue-900">{result.reduction}%</p>
                </div>
              </div>

              {/* Tariff Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tarif brut</span>
                  <span className="font-semibold text-slate-900">{formatEUR(result.brut)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    Réduction ({result.reduction}%)
                  </span>
                  <span className="font-semibold text-red-600">
                    -{formatEUR((result.brut * result.reduction) / 100)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-green-900">Tarif mensuel</span>
                  <span className="text-green-900">{formatEUR(result.final)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-600">Tarif annuel</span>
                  <span className="text-slate-900">{formatEUR(result.annualTotal)}</span>
                </div>
              </div>

              {/* Tier Breakdown */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  Détail par tier
                </p>
                <div className="space-y-1">
                  {result.tierBreakdown.map((tier) => (
                    <div key={tier.tier} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        {tier.label} ({tier.count})
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatEUR(tier.price * tier.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 border-dashed bg-slate-50 p-6 flex flex-col items-center justify-center min-h-96 text-center">
              <Building2 className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">
                Les résultats de calcul apparaîtront ici
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
