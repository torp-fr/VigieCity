import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Users, UserPlus, UserMinus, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/agents")({
  component: AgentsPage,
});

const ROLES = [
  { value: "moderator", label: "Modérateur" },
  { value: "admin", label: "Admin commune" },
];

function AgentsPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("moderator");
  const [searching, setSearching] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agents"],
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

      const { data: roles } = await supabase
        .from("user_roles")
        .select("id, user_id, role, profiles(display_name)")
        .eq("collectivity_id", cid)
        .in("role", ["moderator", "admin"]);

      return { roles: roles ?? [], collectivityId: cid };
    },
  });

  const addAgent = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // Recherche via RPC SECURITY DEFINER (pas besoin de service_role cote client)
      const { data: found, error: rpcErr } = await supabase
        .rpc("find_auth_user_by_email", { search_email: email })
        .single();
      if (rpcErr || !found) {
        throw new Error("Utilisateur introuvable. Vérifiez qu'il est déjà inscrit sur VigieCity.");
      }

      if (!data?.collectivityId) throw new Error("Collectivité non chargée");
      const { error: roleErr } = await supabase.from("user_roles").upsert({
        user_id: found.id,
        role: role as "citizen" | "moderator" | "admin",
        collectivity_id: data.collectivityId,
      }, { onConflict: "user_id,collectivity_id" });
      if (roleErr) throw roleErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-agents"] });
      setEmail("");
      toast.success("Agent ajouté");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const removeAgent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-agents"] });
      toast.success("Accès révoqué");
    },
    onError: () => toast.error("Erreur"),
  });

  return (
    <AdminShell activePath="/admin/habilitations">
      <div className="mx-auto max-w-7xl px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Gestion de l'équipe
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agents et modérateurs ayant accès au panel commune
        </p>
      </div>

      {/* Ajouter un agent */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Ajouter un agent
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@agent.fr"
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button
            onClick={() => addAgent.mutate({ email, role })}
            disabled={addAgent.isPending || !email}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {addAgent.isPending ? "Recherche…" : "Ajouter"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          L'utilisateur doit déjà avoir un compte VigieCity.
        </p>
      </div>

      {/* Liste agents */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : data?.roles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun agent configuré</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Agent</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rôle</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.roles.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {((r as any).profiles?.display_name ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{(r as any).profiles?.display_name ?? r.user_id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {ROLES.find((rl) => rl.value === r.role)?.label ?? r.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { if (confirm("Révoquer l'accès ?")) removeAgent.mutate(r.id); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/20"
                    >
                      <UserMinus className="h-3.5 w-3.5" /> Révoquer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </AdminShell>
  );
}
