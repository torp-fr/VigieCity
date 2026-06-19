import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ShieldOff, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/voisins")({
  component: VoisinsPage,
});

function VoisinsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-voisins"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user!.id)
        .single();

      const { data: all } = await supabase
        .from("profiles")
        .select("id, display_name, is_voisin_vigilant, created_at")
        .eq("collectivity_id", profile!.collectivity_id!)
        .order("is_voisin_vigilant", { ascending: false });

      return { profiles: all ?? [], collectivityId: profile!.collectivity_id! };
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_voisin_vigilant: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-voisins"] });
      toast.success("Badge mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const total = data?.profiles.length ?? 0;
  const vigilants = data?.profiles.filter((p) => p.is_voisin_vigilant).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Programme Voisins Vigilants
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les citoyens membres du programme de vigilance de quartier
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Voisins vigilants</p>
          <p className="text-3xl font-bold text-primary mt-1">{vigilants}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Citoyens inscrits</p>
          <p className="text-3xl font-bold mt-1">{total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total > 0 ? Math.round((vigilants / total) * 100) : 0}% participent
          </p>
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : data?.profiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun citoyen inscrit</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Citoyen</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {(profile.display_name ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{profile.display_name ?? "Sans nom"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {profile.is_voisin_vigilant ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                        <Shield className="h-3 w-3" />
                        Voisin vigilant
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Citoyen</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggle.mutate({ id: profile.id, value: !profile.is_voisin_vigilant })}
                      disabled={toggle.isPending}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        profile.is_voisin_vigilant
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {profile.is_voisin_vigilant ? (
                        <><ShieldOff className="h-3.5 w-3.5" /> Révoquer</>
                      ) : (
                        <><UserCheck className="h-3.5 w-3.5" /> Attribuer</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
