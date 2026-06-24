import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { CreditCard, Plus, Printer, CheckCircle, Clock, XCircle, Euro, Trash2 } from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/facturation")({
  component: FacturationPage,
});

const PLAN_PRICES: Record<string, number> = {
  trial: 0,
  nano: 49,
  micro: 99,
  local: 189,
  urbain: 490,
  metropole: 0,
};

type Invoice = {
  id: string;
  collectivity_id: string;
  amount: number;
  status: string;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  description: string | null;
  collectivities: { name: string } | null;
};

function FacturationPage() {
  return (
    <PlatformShell activePath="/platform/facturation">
      <FacturationPageContent />
    </PlatformShell>
  );
}

function FacturationPageContent() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueAt, setDueAt] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-facturation"],
    queryFn: async () => {
      const [invoicesRes, communesRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, collectivity_id, amount, status, issued_at, due_at, paid_at, description, collectivities(name)")
          .order("issued_at", { ascending: false }),
        supabase.from("collectivities").select("id, name").order("name"),
      ]);
      return {
        invoices: (invoicesRes.data ?? []) as Invoice[],
        communes: communesRes.data ?? [],
      };
    },
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!selectedCommune || !amount) throw new Error("Commune et montant requis");
      const { error } = await supabase.from("invoices").insert({
        collectivity_id: selectedCommune,
        amount: parseFloat(amount),
        description: description || null,
        status: "pending",
        issued_at: new Date().toISOString(),
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-facturation"] });
      setShowForm(false);
      setSelectedCommune("");
      setDescription("");
      setAmount("");
      setDueAt("");
      toast.success("Facture créée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-facturation"] });
      toast.success("Facture supprimée.");
    },
    onError: () => toast.error("Erreur suppression."),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-facturation"] });
      toast.success("Facture marquée comme payée");
    },
  });

  function printInvoice(inv: Invoice) {
    const html = `
      <html>
        <head><title>Facture VigieCity</title>
        <style>
          body { font-family: sans-serif; padding: 40px; max-width: 700px; margin: auto; }
          h1 { color: #1e3a8a; } table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; }
          th { background: #f9fafb; font-size: 12px; color: #6b7280; }
          .total { font-weight: bold; font-size: 18px; color: #1e3a8a; }
          .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; }
        </style></head>
        <body>
          <h1>VigieCity</h1>
          <p>Plateforme de sécurité citoyenne</p>
          <hr />
          <h2>Facture N° ${inv.id.slice(0, 8).toUpperCase()}</h2>
          <p><strong>Commune :</strong> ${inv.collectivities?.name ?? inv.collectivity_id}</p>
          <p><strong>Date d'émission :</strong> ${format(new Date(inv.issued_at), "d MMMM yyyy", { locale: fr })}</p>
          ${inv.due_at ? `<p><strong>Échéance :</strong> ${format(new Date(inv.due_at), "d MMMM yyyy", { locale: fr })}</p>` : ""}
          <table>
            <thead><tr><th>Description</th><th>Montant HT</th><th>TVA 20%</th><th>Total TTC</th></tr></thead>
            <tbody>
              <tr>
                <td>${inv.description ?? "Abonnement VigieCity"}</td>
                <td>${inv.amount.toFixed(2)} €</td>
                <td>${(inv.amount * 0.2).toFixed(2)} €</td>
                <td class="total">${(inv.amount * 1.2).toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <p>VigieCity SAS — SIRET 000 000 000 00000 — TVA FR00000000000</p>
            <p>Paiement par virement — IBAN FR76 0000 0000 0000 0000 0000 000</p>
          </div>
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  // KPIs
  const totalRevenue = data?.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0) ?? 0;
  const pendingRevenue = data?.invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0) ?? 0;
  const unpaidCount = data?.invoices.filter((i) => i.status === "pending").length ?? 0;

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" /> Facturation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Factures manuelles par commune</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nouvelle facture
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="h-4 w-4 text-green-600" />
            <p className="text-xs text-muted-foreground">Revenus encaissés</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString("fr-FR")} €</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-muted-foreground">En attente de paiement</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pendingRevenue.toLocaleString("fr-FR")} €</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <p className="text-xs text-muted-foreground">Factures impayées</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{unpaidCount}</p>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold">Nouvelle facture</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Commune *</label>
              <select
                value={selectedCommune}
                onChange={(e) => {
                  setSelectedCommune(e.target.value);
                  // Auto-fill amount from plan
                  const coll = data?.communes.find((c) => c.id === e.target.value);
                  if (coll) setDescription(`Abonnement VigieCity — ${coll.name}`);
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Sélectionner…</option>
                {data?.communes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Montant HT (€) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="590.00"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Abonnement VigieCity"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Date d'échéance</label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Annuler</button>
            <button
              onClick={() => createInvoice.mutate()}
              disabled={createInvoice.isPending || !selectedCommune || !amount}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {createInvoice.isPending ? "Création…" : "Créer la facture"}
            </button>
          </div>
        </div>
      )}

      {/* Invoices table */}
      {data?.invoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucune facture</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Commune</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Description</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Montant HT</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Émise le</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data!.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{inv.collectivities?.name ?? inv.collectivity_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inv.description ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inv.amount.toLocaleString("fr-FR")} €</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(new Date(inv.issued_at), "d MMM yyyy", { locale: fr })}
                  </td>
                  <td className="px-4 py-3">
                    {inv.status === "paid" ? (
                      <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> Payée
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                        <Clock className="h-3.5 w-3.5" /> En attente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => printInvoice(inv)}
                        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                        title="Imprimer / PDF"
                      >
                        <Printer className="h-3.5 w-3.5" /> PDF
                      </button>
                      <ActionMenu actions={[
                        { label: "Marquer payée", icon: CheckCircle, onClick: () => markPaid.mutate(inv.id), disabled: inv.status === "paid" || markPaid.isPending },
                        { label: "Supprimer", icon: Trash2, onClick: () => { if (confirm("Supprimer cette facture ?")) deleteInvoice.mutate(inv.id); }, variant: "danger" },
                      ]} />
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
