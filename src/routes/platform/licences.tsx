import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/licences")({
  head: () => ({ meta: [{ title: "Licences — Platform Admin" }, { name: "robots", content: "noindex" }] }),
  component: PlatformLicencesPage,
});

type License = {
  id: string;
  collectivity_id: string;
  commune_name: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  billing_email: string | null;
  notes: string | null;
};

const PLANS = ["free", "starter", "pro", "enterprise"] as const;
const PLAN_LABELS: Record<string, string> = { free: "Gratuit", starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: "Actif",     color: "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30" },
  suspended: { label: "Suspendu", color: "bg-warning/10 text-warning-foreground border border-warning/30" },
  cancelled: { label: "Annulé",   color: "bg-destructive/10 text-destructive border border-destructive/30" },
};

function PlatformLicencesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState("free");
  const [editStatus, setEditStatus] = useState("active");

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
    queryKey: ["platform_licences"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commune_licenses")
        .select("id, collectivity_id, plan, status, started_at, expires_at, billing_email, notes, collectivities(name)")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((l: any) => ({
        ...l,
        commune_name: l.collectivities?.name ?? l.collectivity_id,
      })) as License[];
    },
  });

  const updateLicense = useMutation({
    mutationFn: async ({ id, plan, status }: { id: string; plan: string; status: string }) => {
      const { error } = await supabase
        .from("commune_licenses")
        .update({ plan, status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_licences"] });
      qc.invalidateQueries({ queryKey: ["platform_stats_summary"] });
      setEditingId(null);
      toast.success("Licence mise à jour.");
    },
    onError: () => toast.error("Erreur lors de la mise à jour."),
  });

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }

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
        <h1 className="text-2xl font-bold">Licences</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data?.length ?? "—"} licence(s) enregistrée(s).</p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune licence. Rendez-vous sur la page Communes pour en activer.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((l) => {
            const sm = STATUS_LABELS[l.status] ?? { label: l.status, color: "bg-muted text-muted-foreground" };
            const isEditing = editingId === l.id;
            return (
              <li key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">{l.commune_name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">
                        {PLAN_LABELS[l.plan] ?? l.plan}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sm.color}`}>
                        {sm.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Depuis le {fmtDate(l.started_at)}
                      {l.expires_at ? ` · Expire le ${fmtDate(l.expires_at)}` : ""}
                    </p>
                    {l.billing_email && (
                      <p className="text-xs text-muted-foreground">📧 {l.billing_email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (isEditing) { setEditingId(null); return; }
                      setEditingId(l.id);
                      setEditPlan(l.plan);
                      setEditStatus(l.status);
                    }}
                    className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {isEditing ? "Annuler" : "Modifier"}
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <div className="flex flex-wrap gap-2">
                      {PLANS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setEditPlan(p)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors ${
                            editPlan === p ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {PLAN_LABELS[p]}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(["active", "suspended", "cancelled"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setEditStatus(s)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors ${
                            editStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {STATUS_LABELS[s].label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => updateLicense.mutate({ id: l.id, plan: editPlan, status: editStatus })}
                      disabled={updateLicense.isPending}
                      className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {updateLicense.isPending ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
