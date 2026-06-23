import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GitBranch, Save } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/routage")({
  component: RoutagePage,
});

const REPORT_CATEGORIES = [
  { value: "vehicule_suspect", label: "Véhicule suspect" },
  { value: "bruit", label: "Bruit/nuisance" },
  { value: "arbre_dangereux", label: "Arbre dangereux" },
  { value: "voirie", label: "Voirie/trottoir" },
  { value: "eclairage", label: "Éclairage public" },
  { value: "tag_degradation", label: "Tag/dégradation" },
  { value: "squat", label: "Occupation illicite" },
  { value: "violence", label: "Violence/bagarre" },
  { value: "accident", label: "Accident" },
  { value: "autre", label: "Autre" },
];

function RoutagePage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-routage"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user.id)
        .single();
      const cid = profile?.collectivity_id;
      if (!cid) throw new Error("Collectivité non configurée");

      const [{ data: routes }, { data: services }] = await Promise.all([
        supabase.from("report_routing").select("*").eq("collectivity_id", cid),
        supabase.from("commune_services").select("id, name").eq("collectivity_id", cid).eq("is_active", true),
      ]);

      // Build a map: category → route
      const routeMap: Record<string, any> = {};
      for (const r of routes ?? []) routeMap[r.category] = r;

      return { routeMap, services: services ?? [], collectivityId: cid };
    },
  });

  const [localEdits, setLocalEdits] = useState<Record<string, { service_id: string; contact_email: string; is_active: boolean }>>({});

  function getEdit(category: string) {
    if (localEdits[category]) return localEdits[category];
    const r = data?.routeMap[category];
    return { service_id: r?.service_id ?? "", contact_email: r?.contact_email ?? "", is_active: r?.is_active ?? true };
  }

  const saveAll = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const ops = Object.entries(localEdits).map(([category, val]) => {
        const existing = data.routeMap[category];
        if (existing) {
          return supabase.from("report_routing").update({ ...val }).eq("id", existing.id);
        } else {
          return supabase.from("report_routing").insert({ category: category as "vehicule_suspect" | "rodeur" | "incivilite" | "degradation" | "accident" | "animal" | "eclairage" | "depot_sauvage" | "autre", ...val, collectivity_id: data.collectivityId });
        }
      });
      const results = await Promise.all(ops);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-routage"] });
      setLocalEdits({});
      toast.success("Routage sauvegardé");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const hasChanges = Object.keys(localEdits).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            Configuration du routage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Associez chaque catégorie de signalement à un service et un contact
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={() => saveAll.mutate()}
            disabled={saveAll.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveAll.isPending ? "Enregistrement…" : `Sauvegarder (${Object.keys(localEdits).length} modif.)`}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Catégorie signalement</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Service assigné</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email contact</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Actif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {REPORT_CATEGORIES.map(({ value, label }) => {
                const edit = getEdit(value);
                const isEdited = !!localEdits[value];
                return (
                  <tr key={value} className={`hover:bg-muted/20 transition-colors ${isEdited ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-2.5 font-medium">{label}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={edit.service_id}
                        onChange={(e) => setLocalEdits((prev) => ({
                          ...prev,
                          [value]: { ...getEdit(value), service_id: e.target.value },
                        }))}
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                      >
                        <option value="">— Aucun service —</option>
                        {data?.services.map((svc) => (
                          <option key={svc.id} value={svc.id}>{svc.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="email"
                        value={edit.contact_email}
                        onChange={(e) => setLocalEdits((prev) => ({
                          ...prev,
                          [value]: { ...getEdit(value), contact_email: e.target.value },
                        }))}
                        placeholder="contact@commune.fr"
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={edit.is_active}
                        onChange={(e) => setLocalEdits((prev) => ({
                          ...prev,
                          [value]: { ...getEdit(value), is_active: e.target.checked },
                        }))}
                        className="rounded"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data?.services.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Aucun service actif — créez d'abord des services dans{" "}
          <