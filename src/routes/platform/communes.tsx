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
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPostal, setEditPostal] = useState('');
  const [editDept, setEditDept] = useState('');

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
      // 2 requêtes séparées — join embedded bloque sur RLS de commune_licenses
      const [colRes, licRes] = await Promise.all([
        supabase.from("collectivities").select("id, name, department_code, postal_code").order("name"),
        supabase.from("commune_licenses").select("collectivity_id, plan, status, expires_at"),
      ]);
      if (colRes.error) throw colRes.error;
      if (licRes.error) throw licRes.error;
      const licByCommune: Record<string, { plan: string; status: string; expires_at: string | null }> = {};
      for (const l of licRes.data ?? []) licByCommune[l.collectivity_id] = l;
      return (colRes.data ?? []).map((c: any) => ({
        ...c,
        license: licByCommune[c.id] ?? null,
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

  const updateCommune = useMutation({
    mutationFn: async ({ id, name, postal_code, department_code }: { id: string; name: string; postal_code: string; department_code: string }) => {
      const { error } = await supabase.from("collectivities")
        .update({ name: name.trim(), postal_code: postal_code.trim() || null, department_code: department_code.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_communes"] }); setEditId(null); toast.success("Commune mise à jour."); },
    onError: () => toast.error("Erreur mise à jour."),
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
                  { label: "Modifier", icon: Pencil, onClick: () => { setEditId(c.id); setEditName(c.name); setEditPostal(c.postal_code ?? ""); setEditDept(c.department_code ?? ""); } },
                  { label: "Suspendre", icon: PauseCircle, onClick: () => suspendCommune.mutate(c.id) },
                  { label: "Supprimer", icon: Trash2, onClick: () => { if (confirm("Supprimer " + c.name + " ?")) deleteCommune.mutate(c.id); }, variant: "danger" },
                ]} />
              </div>
              {editId === c.id && (
                <div className="mt-3 border-t border-border pt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modifier la commune</p>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nom de la commune"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
                  <div className="flex gap-2">
                    <input value={editPostal} onChange={(e) => setEditPostal(e.target.value)} placeholder="Code postal" maxLength={5}
                      className="w-28 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
                    <input value={editDept} onChange={(e) => setEditDept(e.target.value)} placeholder="Dép. (ex: 66)" maxLength={3}
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={updateCommune.isPending || !editName.trim()}
                      onClick={() => updateCommune.mutate({ id: c.id, name: editName, postal_code: editPostal, department_code: editDept })}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {updateCommune.isPending ? "Enregistrement…" : "Enregistrer"}
                    </button>
                    <button onClick={() => setEditId(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
