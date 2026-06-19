import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Shield, CheckCircle2, XCircle, Building2, Pencil, Trash2, PauseCircle } from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/communes")({
  head: () => ({ meta: [{ title: "Communes — Platform Admin" }, { name: "robots", content: "noindex" }] }),
  component: PlatformCommunesPage,
});

type Commune = {
  id: string;
  name: string;
  department_code: string | null;
  postal_code: string | null;
  license: { plan: string; status: string; expires_at: string | null } | null;
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial", decouverte: "Découverte", essentiel: "Essentiel",
  standard: "Standard", pro: "Pro", intercommunal: "Intercommunal",
};
const STATUS_COLOR: Record<string, string> = {
  active: "text-green-600 dark:text-green-400",
  suspended: "text-warning-foreground",
  cancelled: "text-destructive",
};

function PlatformCommunesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      if (!uid) { setIsAdmin(false); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("id")
        .eq("user_id", uid).eq("role", "admin").is("collectivity_id", null);
      setIsAdmin((roles?.length ?? 0) > 0);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["platform_communes"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collectivities")
        .select("id, name, department_code, postal_code, commune_licenses(plan, status, expires_at)")
        .order("name");
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        license: c.commune_licenses?.[0] ?? null,
      })) as Commune[];
    },
  });

  const upsertLicense = useMutation({
    mutationFn: async ({ collectivityId, plan }: { collectivityId: string; plan: string }) => {
      const { error } = await supabase
        .from("commune_licenses")
        .upsert({ collectivity_id: collectivityId, plan, status: "active" }, { onConflict: "collectivity_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_communes"] });
      toast.success("Licence mise à jour.");
    },
    onError: () => toast.error("Erreur lors de la mise à jour."),
  });

  const suspendCommune = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commune_licenses").update({ status: "suspended" }).eq("collectivity_id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_communes"] }); toast.success("Commune suspendue."); },
    onError: () => toast.error("Erreur."),
  });

  const deleteCommune = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collectivities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_communes"] }); toast.success("Commune supprimée."); },
    onError: () => toast.error("Erreur suppression."),
  });

  if (isAdmin === null) return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return (
    <div className="px-4 pt-10 text-center">
      <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Accès refusé.</p>
      <button onClick={() => navigate({ to: "/" })} className="mt-4 text-sm text-primary underline">Retour</button>
    </div>
  );

  return (
    <div className="space-y-4 px-4 pt-5">
      <Link to="/platform" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Platform Admin
      </Link>
      <header>
        <h1 className="text-2xl font-bold">Communes</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data?.length ?? "—"} collectivité(s) enregistrée(s).</p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune commune enregistrée.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.postal_code, c.department_code && `Dép. ${c.department_code}`].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {c.license ? (
                      <>
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">
                          {PLAN_LABELS[c.license.plan] ?? c.license.plan}
                        </span>
                        <span className={`text-xs font-medium ${STATUS_COLOR[c.license.status] ?? ""}`}>
                          {c.license.status === "active"
                            ? <><CheckCircle2 className="inline h-3 w-3 mr-0.5" />Actif</>
                            : <><XCircle className="inline h-3 w-3 mr-0.5" />{c.license.status}</>}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sans licence</span>
                    )}
                    {/* Assign free license quickly */}
                    {!c.license && (
                      <button
                        onClick={() => upsertLicense.mutate({ collectivityId: c.id, plan: "trial" })}
                        disabled={upsertLicense.isPending}
                        className="rounded-lg bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Activer Trial
                      </button>
                    )}
                  </div>
                </div>
                <ActionMenu actions={[
                  { label: "Modifier", icon: Pencil, onClick: () => toast.info("Modification à venir") },
                  { label: "Suspendre", icon: PauseCircle, onClick: () => suspendCommune.mutate(c.id) },
                  { label: "Supprimer", icon: Trash2, onClick: () => { if (confirm("Supprimer " + c.name + " ?")) deleteCommune.mutate(c.id); }, variant: "danger" },
                ]} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
