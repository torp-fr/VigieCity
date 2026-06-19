import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Wrench, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/services")({
  component: ServicesPage,
});

const CATEGORIES = [
  { value: "securite", label: "Sécurité" },
  { value: "technique", label: "Technique" },
  { value: "communication", label: "Communication" },
  { value: "social", label: "Social" },
  { value: "culture", label: "Culture" },
  { value: "autre", label: "Autre" },
];

type ServiceForm = {
  name: string;
  category: string;
  description: string;
  phone: string;
  email: string;
  opening_hours: string;
  is_active: boolean;
};

const EMPTY: ServiceForm = {
  name: "", category: "autre", description: "", phone: "", email: "", opening_hours: "", is_active: true,
};

function ServicesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user!.id)
        .single();
      const { data } = await supabase
        .from("commune_services")
        .select("*")
        .eq("collectivity_id", profile!.collectivity_id!)
        .order("name");
      return { services: data ?? [], collectivityId: profile!.collectivity_id! };
    },
  });

  const save = useMutation({
    mutationFn: async (f: ServiceForm) => {
      const payload = { ...f };
      if (editId) {
        const { error } = await supabase.from("commune_services").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("commune_services").insert({
          ...payload,
          collectivity_id: data!.collectivityId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      setShowForm(false); setEditId(null); setForm(EMPTY);
      toast.success(editId ? "Service modifié" : "Service créé");
    },
    onError: () => toast.error("Erreur"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("commune_services").update({ is_active: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-services"] }),
    onError: () => toast.error("Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commune_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-services"] }); toast.success("Supprimé"); },
    onError: () => toast.error("Erreur"),
  });

  function openEdit(svc: any) {
    setForm({ name: svc.name, category: svc.category ?? "autre", description: svc.description ?? "", phone: svc.phone ?? "", email: svc.email ?? "", opening_hours: svc.opening_hours ?? "", is_active: svc.is_active });
    setEditId(svc.id); setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Mes services
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Services personnalisés de votre commune</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nouveau service
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{editId ? "Modifier le service" : "Nouveau service"}</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom du service *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Office de tourisme" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catégorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Téléphone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+33 4 68 …" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="service@commune.fr" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Horaires</label>
              <input type="text" value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                placeholder="Lun-Ven 9h-17h" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              <span className="text-sm">Service actif</span>
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Annuler</button>
            <button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {save.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : data?.services.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun service configuré</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Service</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Catégorie</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Contact</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.services.map((svc) => (
                <tr key={svc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{svc.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{svc.category ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{svc.phone || svc.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive.mutate({ id: svc.id, val: !svc.is_active })}
                      className={`text-sm ${svc.is_active ? "text-primary" : "text-muted-foreground"}`}>
                      {svc.is_active ? <ToggleRight className="h-5 w-5 inline" /> : <ToggleLeft className="h-5 w-5 inline" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(svc)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm("Supprimer ?")) remove.mutate(svc.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
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
