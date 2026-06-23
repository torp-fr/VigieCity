import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Settings, Save, Plus, Trash2, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/parametres")({
  component: ParametresPage,
});

function ParametresPage() {
  const qc = useQueryClient();
  const [communeName, setCommuneName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newContact, setNewContact] = useState({ label: "", phone: "", category: "securite" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-parametres"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user!.id)
        .single();
      const cid = profile!.collectivity_id!;

      const [{ data: coll }, { data: contacts }, { data: license }] = await Promise.all([
        supabase.from("collectivities").select("id, name").eq("id", cid).single(),
        supabase.from("emergency_contacts").select("*").eq("collectivity_id", cid).eq("is_national", false).order("priority"),
        supabase.from("commune_licenses").select("plan, status, expires_at").eq("collectivity_id", cid).single(),
      ]);

      setCommuneName(coll?.name ?? "");
      return { collectivity: coll, contacts: contacts ?? [], license, collectivityId: cid };
    },
    staleTime: 30_000,
  });

  const saveName = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("collectivities").update({ name: communeName }).eq("id", data!.collectivityId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-parametres"] });
      setEditingName(false);
      toast.success("Nom mis à jour");
    },
    onError: () => toast.error("Erreur"),
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("emergency_contacts").insert({
        ...newContact,
        collectivity_id: data!.collectivityId,
        is_national: false,
        priority: (data?.contacts.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-parametres"] });
      setNewContact({ label: "", phone: "", category: "securite" });
      toast.success("Contact ajouté");
    },
    onError: () => toast.error("Erreur"),
  });

  const removeContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-parametres"] }),
    onError: () => toast.error("Erreur"),
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Chargement…</div>;

  return (
    <AdminShell activePath="/admin/settings">
      <div className="mx-auto  px-8 py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Paramètres commune
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configuration de votre espace VigieCity</p>
      </div>

      {/* Nom commune */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Informations générales</h2>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom d'affichage</label>
          {editingName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={communeName}
                onChange={(e) => setCommuneName(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={() => saveName.mutate()}
                disabled={saveName.isPending || !communeName}
                className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
              </button>
              <button onClick={() => { setEditingName(false); setCommuneName(data?.collectivity?.name ?? ""); }}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                Annuler
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium">{data?.collectivity?.name}</p>
              <button onClick={() => setEditingName(true)}
                className="text-xs text-primary hover:underline">
                Modifier
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Licence */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Ma licence</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="font-semibold capitalize">{data?.license?.plan ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <p className={`font-semibold capitalize ${data?.license?.status === "active" ? "text-success" : "text-warning"}`}>
              {data?.license?.status ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expiration</p>
            <p className="font-semibold">
              {data?.license?.expires_at
                ? new Date(data.license.expires_at).toLocaleDateString("fr-FR")
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Urgences locales */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Phone className="h-4 w-4" /> Numéros d'urgence locaux
        </h2>

        {/* Ajout */}
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={newContact.label}
            onChange={(e) => setNewContact({ ...newContact, label: e.target.value })}
            placeholder="Label (ex: Police Munic.)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="tel"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            placeholder="Numéro"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => addContact.mutate()}
            disabled={addContact.isPending || !newContact.label || !newContact.phone}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>

        {/* Liste */}
        {data?.contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun numéro local configuré</p>
        ) : (
          <div className="space-y-2">
            {data?.contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <button
                  onClick={() => removeContact.mutate(c.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* White-label (V2 placeholder) */}
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5">
        <h2 className="text-sm font-semibold text-muted-foreground">Personnalisation visuelle (V2)</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Couleur primaire et logo personnalisé — disponible avec le plan Pro.
        </p>
      </div>
      </div>
    </AdminShell>
  );
}
