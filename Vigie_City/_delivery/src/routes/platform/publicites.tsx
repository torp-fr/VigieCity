import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus, Edit2, Trash2, Eye, MousePointerClick, EyeOff,
  Loader2, X, CheckCircle2, AlertTriangle, Euro, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/publicites")({
  component: PublicitesPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ad {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  advertiser_name: string;
  target_type: "global" | "region" | "commune";
  target_ids: string[];
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  impressions_count: number;
  clicks_count: number;
  price_monthly: number | null;
  invoice_ref: string | null;
  notes: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  title: "",
  image_url: "",
  link_url: "",
  advertiser_name: "",
  target_type: "global" as const,
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
  is_active: true,
  price_monthly: "" as number | "",
  invoice_ref: "",
  notes: "",
};

function ctr(ad: Ad): string {
  if (!ad.impressions_count) return "—";
  return ((ad.clicks_count / ad.impressions_count) * 100).toFixed(2) + "%";
}

function isActiveNow(ad: Ad): boolean {
  if (!ad.is_active) return false;
  const today = new Date().toISOString().split("T")[0];
  if (ad.start_date > today) return false;
  if (ad.end_date && ad.end_date < today) return false;
  return true;
}

// ─── Modal creation/edition ───────────────────────────────────────────────────
interface AdModalProps {
  ad: Ad | null;
  onClose: () => void;
  onDone: () => void;
}

function AdModal({ ad, onClose, onDone }: AdModalProps) {
  const [form, setForm] = useState(
    ad
      ? {
          title:          ad.title,
          image_url:      ad.image_url,
          link_url:       ad.link_url,
          advertiser_name:ad.advertiser_name,
          target_type:    ad.target_type,
          start_date:     ad.start_date,
          end_date:       ad.end_date ?? "",
          is_active:      ad.is_active,
          price_monthly:  ad.price_monthly ?? ("" as number | ""),
          invoice_ref:    ad.invoice_ref ?? "",
          notes:          ad.notes ?? "",
        }
      : { ...EMPTY_FORM }
  );
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.image_url || !form.link_url || !form.advertiser_name) {
      toast.error("Titre, image, lien et annonceur sont obligatoires");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title:           form.title,
        image_url:       form.image_url,
        link_url:        form.link_url,
        advertiser_name: form.advertiser_name,
        target_type:     form.target_type,
        target_ids:      [],
        start_date:      form.start_date,
        end_date:        form.end_date || null,
        is_active:       form.is_active,
        price_monthly:   form.price_monthly !== "" ? Number(form.price_monthly) : null,
        invoice_ref:     form.invoice_ref || null,
        notes:           form.notes || null,
      };
      if (ad) {
        const { error } = await supabase.from("ads").update(payload).eq("id", ad.id);
        if (error) throw error;
        toast.success("Annonce mise a jour");
      } else {
        const { error } = await supabase.from("ads").insert(payload);
        if (error) throw error;
        toast.success("Annonce creee");
      }
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-bold text-lg">{ad ? "Modifier l\'annonce" : "Nouvelle annonce"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Titre de la campagne *</label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="Campagne ete 2026" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Nom de l\'annonceur *</label>
              <input value={form.advertiser_name} onChange={(e) => set("advertiser_name", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="Mairie de Perpignan" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL de l\'image * (1200x300 recommande)</label>
            <input value={form.image_url} onChange={(e) => set("image_url", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="https://..." />
            {form.image_url && (
              <img src={form.image_url} alt="preview" className="mt-2 h-16 w-full object-cover rounded-lg border border-border" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL de destination *</label>
            <input value={form.link_url} onChange={(e) => set("link_url", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date de debut</label>
              <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de fin (optionnel)</label>
              <input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Prix mensuel (euros)</label>
              <input type="number" value={form.price_monthly} onChange={(e) => set("price_monthly", e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ref facture</label>
              <input value={form.invoice_ref} onChange={(e) => set("invoice_ref", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="VC-PUB-2026-001" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes internes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              rows={2} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Contact commercial, conditions..." />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded" />
            <label htmlFor="is_active" className="text-sm font-medium">Annonce active</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted">Annuler</button>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {ad ? "Mettre a jour" : "Creer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
function PublicitesPage() {
  const qc = useQueryClient();
  const [modalAd, setModalAd] = useState<Ad | null | "new">(null);

  const { data: ads, isLoading } = useQuery<Ad[]>({
    queryKey: ["platform-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ad[];
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-ads"] });
      toast.success("Annonce supprimee");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ads").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-ads"] }),
  });

  // KPIs globaux
  const totalImpressions = (ads ?? []).reduce((s, a) => s + a.impressions_count, 0);
  const totalClicks      = (ads ?? []).reduce((s, a) => s + a.clicks_count, 0);
  const activeCount      = (ads ?? []).filter(isActiveNow).length;
  const mrrAds           = (ads ?? [])
    .filter((a) => a.is_active && a.price_monthly)
    .reduce((s, a) => s + (a.price_monthly ?? 0), 0);
  const globalCtr        = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%" : "—";

  return (
    <PlatformShell activePath="/platform/publicites">
      {modalAd && (
        <AdModal
          ad={modalAd === "new" ? null : modalAd}
          onClose={() => setModalAd(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["platform-ads"] });
            setModalAd(null);
          }}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Publicites</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestion des annonces — facturation hors-app (virement)</p>
          </div>
          <button
            onClick={() => setModalAd("new")}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nouvelle annonce
          </button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Actives",      value: activeCount,        icon: CheckCircle2,    color: "text-green-600"  },
            { label: "Impressions",  value: totalImpressions.toLocaleString("fr-FR"), icon: Eye, color: "text-primary" },
            { label: "Clics",        value: totalClicks.toLocaleString("fr-FR"),       icon: MousePointerClick, color: "text-blue-600"  },
            { label: "MRR pubs",     value: mrrAds ? mrrAds + " euros" : "—",         icon: Euro,              color: "text-amber-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
              <div className={\`mt-1 text-2xl font-bold \${color}\`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (ads ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Aucune annonce. Creez-en une pour commencer.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Annonce</th>
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Statut</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Impressions</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Clics</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">CTR</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Prix/mois</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(ads ?? []).map((ad, idx) => {
                  const active = isActiveNow(ad);
                  return (
                    <tr key={ad.id} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={ad.image_url} alt={ad.title}
                            className="h-10 w-20 shrink-0 rounded-lg object-cover border border-border"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <div>
                            <div className="font-medium">{ad.title}</div>
                            <div className="text-xs text-muted-foreground">{ad.advertiser_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {ad.start_date}{ad.end_date ? " → " + ad.end_date : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                            <CheckCircle2 className="h-3 w-3" />Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            <EyeOff className="h-3 w-3" />Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        {ad.impressions_count.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        {ad.clicks_count.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        {ctr(ad)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs">
                        {ad.price_monthly ? ad.price_monthly + " euros" : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => toggleMutation.mutate({ id: ad.id, is_active: !ad.is_active })}
                            title={ad.is_active ? "Desactiver" : "Activer"}
                            className="rounded-lg border border-border p-1.5 hover:bg-muted transition"
                          >
                            {ad.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => setModalAd(ad)}
                            title="Modifier"
                            className="rounded-lg border border-border p-1.5 hover:bg-muted transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Supprimer cette annonce ?")) deleteMutation.mutate(ad.id);
                            }}
                            title="Supprimer"
                            className="rounded-lg border border-red-200 p-1.5 hover:bg-red-50 text-red-500 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Info facturation */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle className="h-4 w-4" />
            Facturation hors-app
          </div>
          Les annonces sont facturees directement par virement bancaire ou Chorus Pro.
          Les prix saisis sont indicatifs pour le suivi interne — aucun paiement n\'est traite automatiquement.
        </div>
      </div>
    </PlatformShell>
  );
}
