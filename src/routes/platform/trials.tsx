import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Clock, AlertTriangle, CheckCircle, ArrowUpRight, Loader2 } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/platform/trials")({
  component: TrialsPage,
});

const PLANS = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

type License = {
  id: string;
  collectivity_id: string;
  plan: string;
  status: string;
  expires_at: string;
  created_at: string;
  collectivities: { name: string; id: string } | null;
};

function TrialsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["platform-trials"],
    queryFn: async () => {
      const { data: trials, error } = await supabase
        .from("commune_licenses")
        .select("id, collectivity_id, plan, status, expires_at, created_at, collectivities(name, id)")
        .eq("plan", "trial")
        .order("expires_at", { ascending: true });
      if (error) throw error;
      return (trials ?? []) as License[];
    },
  });

  const convertPlan = useMutation({
    mutationFn: async ({ licId, newPlan }: { licId: string; newPlan: string }) => {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const { error } = await supabase
        .from("commune_licenses")
        .update({ plan: newPlan, expires_at: expiresAt.toISOString(), status: "active" })
        .eq("id", licId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-trials"] });
      toast.success("Licence convertie avec succès");
    },
    onError: () => toast.error("Erreur lors de la conversion"),
  });

  const extendTrial = useMutation({
    mutationFn: async ({ licId, currentExpiry }: { licId: string; currentExpiry: string }) => {
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + 30);
      const { error } = await supabase
        .from("commune_licenses")
        .update({ expires_at: newExpiry.toISOString() })
        .eq("id", licId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-trials"] });
      toast.success("Trial prolongé de 30 jours");
    },
    onError: () => toast.error("Erreur"),
  });

  const expiringSoon = data?.filter((t) => {
    const days = differenceInDays(new Date(t.expires_at), new Date());
    return days <= 7 && days >= 0;
  }) ?? [];
  const expired = data?.filter((t) => differenceInDays(new Date(t.expires_at), new Date()) < 0) ?? [];

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-blue-600" /> Gestion des trials
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data?.length ?? 0} commune{(data?.length ?? 0) > 1 ? "s" : ""} en période d'essai
        </p>
      </div>

      {expiringSoon.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{expiringSoon.length} commune{expiringSoon.length > 1 ? "s" : ""}</span>{" "}
            expire{expiringSoon.length > 1 ? "nt" : ""} dans moins de 7 jours.
          </p>
        </div>
      )}
      {expired.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            <span className="font-semibold">{expired.length} commune{expired.length > 1 ? "s" : ""}</span> — trial expiré.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total trials", value: data?.length ?? 0, color: "text-blue-600" },
          { label: "Expirent <7j", value: expiringSoon.length, color: "text-amber-600" },
          { label: "Expirés", value: expired.length, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {data?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
          <p className="font-medium">Aucune commune en trial</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Commune</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Expiration</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data!.map((t) => (
                <TrialRow key={t.id} t={t} extendTrial={extendTrial} convertPlan={convertPlan} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TrialRow({ t, extendTrial, convertPlan }: { t: License; extendTrial: any; convertPlan: any }) {
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const days = differenceInDays(new Date(t.expires_at), new Date());

  function DaysChip() {
    if (days < 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Expiré</span>;
    if (days <= 3) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{days}j restants</span>;
    if (days <= 7) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{days}j restants</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{days}j restants</span>;
  }

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-sm">{t.collectivities?.name ?? t.collectivity_id.slice(0, 8)}</p>
        <p className="text-xs text-muted-foreground">
          Créé le {format(new Date(t.created_at), "d MMM yyyy", { locale: fr })}
        </p>
      </td>
      <td className="px-4 py-3 text-sm">{format(new Date(t.expires_at), "d MMM yyyy", { locale: fr })}</td>
      <td className="px-4 py-3"><DaysChip /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => extendTrial.mutate({ licId: t.id, currentExpiry: t.expires_at })}
            disabled={extendTrial.isPending}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {extendTrial.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
            +30j
          </button>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button
            onClick={() => {
              if (confirm(`Convertir en plan ${selectedPlan} ?`)) {
                convertPlan.mutate({ licId: t.id, newPlan: selectedPlan });
              }
            }}
            disabled={convertPlan.isPending}
            className="flex items-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Convertir
          </button>
        </div>
      </td>
    </tr>
  );
}
