/**
 * Step 3 (EPCI path): Commune Admin Table Component
 * Manages per-commune admin details for EPCI onboarding
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { type CommuneAdmin } from "@/lib/onboarding-utils";

interface CommuneAdminTableProps {
  epciId: string;
  value: CommuneAdmin[];
  onChange: (admins: CommuneAdmin[]) => void;
  disabled?: boolean;
}

interface EpciCommune {
  id: string;
  name: string;
  insee_code: string;
  department_code?: string;
}

export function CommuneAdminTable({ epciId, value, onChange, disabled }: CommuneAdminTableProps) {
  const [epciCommunes, setEpciCommunes] = useState<EpciCommune[]>([]);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Load communes for this EPCI
  useEffect(() => {
    async function loadCommunes() {
      setLoadingCommunes(true);
      try {
        const { data, error } = await supabase
          .from("collectivities")
          .select("id, name, insee_code, department_code")
          .eq("epci_id", epciId)
          .eq("is_active", true)
          .order("name");

        if (!error && data) {
          setEpciCommunes(data);

          // Auto-populate with commune names if not already done
          if (value.length === 0 && data.length > 0) {
            const initialAdmins = data.map((c) => ({
              inseeCode: c.insee_code,
              communeName: c.name,
              email: "",
              name: "",
              phone: "",
            }));
            onChange(initialAdmins);
          }
        }
      } catch (err) {
        console.error("Error loading EPCI communes:", err);
      } finally {
        setLoadingCommunes(false);
      }
    }

    loadCommunes();
  }, [epciId]);

  function updateAdmin(index: number, field: keyof CommuneAdmin, val: string) {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  }

  function removeAdmin(index: number) {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  }

  function addAdmin() {
    onChange([
      ...value,
      {
        inseeCode: "",
        communeName: "",
        email: "",
        name: "",
        phone: "",
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-1">Administrateurs des communes</h3>
        <p className="text-sm text-muted-foreground">
          Un administrateur par commune de l'EPCI. L'email doit être unique.
        </p>
      </div>

      {loadingCommunes ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Chargement des communes...
        </div>
      ) : epciCommunes.length === 0 ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800">
            Aucune commune trouvée pour cette EPCI.
          </p>
        </div>
      ) : (
        <>
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  {errors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-semibold">Commune</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Email admin</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Nom</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Téléphone</th>
                  <th className="px-4 py-2.5 text-center font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody>
                {value.map((admin, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50">
                    {/* Commune name (readonly) */}
                    <td className="px-4 py-2.5">
                      <select
                        value={admin.inseeCode}
                        onChange={(e) => {
                          const selected = epciCommunes.find(
                            (c) => c.insee_code === e.target.value,
                          );
                          if (selected) {
                            updateAdmin(idx, "inseeCode", selected.insee_code);
                            updateAdmin(idx, "communeName", selected.name);
                          }
                        }}
                        disabled={disabled}
                        className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm disabled:opacity-50"
                      >
                        <option value="">— Sélectionner —</option>
                        {epciCommunes.map((c) => (
                          <option key={c.insee_code} value={c.insee_code}>
                            {c.name} ({c.insee_code})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-2.5">
                      <input
                        type="email"
                        value={admin.email}
                        onChange={(e) => updateAdmin(idx, "email", e.target.value)}
                        placeholder="admin@commune.fr"
                        disabled={disabled}
                        className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm disabled:opacity-50"
                      />
                    </td>

                    {/* Name */}
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={admin.name}
                        onChange={(e) => updateAdmin(idx, "name", e.target.value)}
                        placeholder="Jean Dupont"
                        disabled={disabled}
                        className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm disabled:opacity-50"
                      />
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-2.5">
                      <input
                        type="tel"
                        value={admin.phone || ""}
                        onChange={(e) => updateAdmin(idx, "phone", e.target.value)}
                        placeholder="06 12 34 56 78"
                        disabled={disabled}
                        className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm disabled:opacity-50"
                      />
                    </td>

                    {/* Remove button */}
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => removeAdmin(idx)}
                        disabled={disabled || value.length <= 1}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row button */}
          <button
            onClick={addAdmin}
            disabled={disabled}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Ajouter une commune
          </button>

          {/* Summary */}
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
            <p className="text-xs font-medium text-blue-700">
              {value.length} commune(s) configurée(s) • Minimum 1 requise
            </p>
          </div>
        </>
      )}
    </div>
  );
}
