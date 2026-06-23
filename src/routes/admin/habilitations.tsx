import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Plus, Search, Smartphone, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { PageShell, PageHeader } from "@/components/PageShell";

export const Route = createFileRoute("/admin/habilitations")({
  head: () => ({
    meta: [{ title: "Habilitations opérateurs — Admin VigieCity" }],
  }),
  component: HabilitationsAdmin,
});

interface Operator {
  id:                string;
  user_id:           string;
  operator_name:     string | null;
  operator_phone:    string | null;
  collectivity_id:   string;
  collectivity_name: string;
  created_at:        string;
}

interface Collectivity {
  id:   string;
  name: string;
}

interface NewOperator {
  display_name:    string;
  phone:           string;
  email:           string;
  collectivity_id: string;
}

const EMPTY_NEW: NewOperator = { display_name: "", phone: "", email: "", collectivity_id: "" };

function HabilitationsAdmin() {
  const [operators, setOperators]           = useState<Operator[]>([]);
  const [collectivities, setCollectivities] = useState<Collectivity[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [form, setForm]                     = useState<NewOperator>(EMPTY_NEW);
  const [saving, setSaving]                 = useState(false);
  const [feedback, setFeedback]             = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [search, setSearch]                 = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ops }, { data: cols }] = await Promise.all([
        supabase
          .from("operator_habilitations")
          .select("id, user_id, operator_name, operator_phone, collectivity_id, collectivity_name, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("collectivities")
          .select("id, name")
          .eq("is_active", true)
          .order("name"),
      ]);
      setOperators(ops ?? []);
      setCollectivities(cols ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFeedback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const res = await supabase.functions.invoke("operator-invite", {
        body: {
          display_name:    form.display_name,
          phone:           form.phone,
          email:           form.email || undefined,
          collectivity_id: form.collectivity_id,
        },
      });

      if (res.error) throw new Error(res.error.message ?? "Erreur serveur");
      const result = res.data as { success?: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error ?? "Erreur inconnue");

      setFeedback({ type: "ok", msg: `Opérateur ${form.display_name} habilité avec succès.` });
      setForm(EMPTY_NEW);
      setShowForm(false);
      fetchData();
    } catch (err: unknown) {
      setFeedback({ type: "err", msg: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (op: Operator) => {
    if (!confirm(`Révoquer l'accès de ${op.operator_name ?? "cet opérateur"} ?`)) return;
    await supabase.from("user_roles").delete().eq("id", op.id);
    fetchData();
  };

  const filtered = operators.filter(op =>
    !search ||
    (op.operator_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (op.operator_phone ?? "").includes(search) ||
    op.collectivity_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminShell activePath="/admin/habilitations">
      <PageShell className="max-w-4xl">
        <PageHeader
          icon={Shield}
          title="Opérateurs terrain"
          subtitle="Gérez les agents habilités à traiter les signalements via SMS OTP"
          action={
            <button
              onClick={() => { setShowForm(v => !v); setFeedback(null); }}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {showForm ? "Annuler" : "Ajouter un opérateur"}
            </button>
          }
        />

        {/* Feedback */}
        {feedback && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === "ok"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {feedback.msg}
          </div>
        )}

        {/* Formulaire d'ajout */}
        {showForm && (
          <form onSubmit={handleAdd} className="mb-6 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-base font-bold text-slate-900">Nouvel opérateur</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "display_name", label: "Nom complet *",      placeholder: "Jean Dupont",     type: "text"  },
                { key: "phone",        label: "Téléphone *",         placeholder: "06 12 34 56 78", type: "tel"   },
                { key: "email",        label: "Email (invitation) *", placeholder: "jean@mairie.fr", type: "email" },
              ].map(field => (
                <div key={field.key}>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    required
                    value={(form as Record<string, string>)[field.key]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Collectivité *</label>
                <select
                  required
                  value={form.collectivity_id}
                  onChange={e => setForm(prev => ({ ...prev, collectivity_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                >
                  <option value="">Sélectionner…</option>
                  {collectivities.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">
                {saving ? "Enregistrement…" : "Créer l'opérateur"}
              </button>
            </div>
          </form>
        )}

        {/* Recherche */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Rechercher par nom, téléphone ou collectivité…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mb-3 text-4xl">🏗️</div>
              <p className="text-sm text-slate-400">Aucun opérateur{search ? " pour cette recherche" : ""}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {["Nom", "Téléphone", "Collectivité", "Ajouté le", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(op => (
                  <tr key={op.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{op.operator_name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{op.operator_phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {op.collectivity_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(op.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevoke(op)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Révoquer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Guide SMS Gateway */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Smartphone className="h-4 w-4 text-slate-400" />
            Configuration Android SMS Gateway
          </h3>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            Les SMS sont envoyés via <strong>Android SMS Gateway (capcom6)</strong> — solution open source gratuite,
            auto-hébergée sur un smartphone Android avec une carte SIM.
          </p>
          <div className="rounded-lg border border-slate-100 bg-white p-3 font-mono text-xs text-blue-700">
            <span className="text-slate-400"># Supabase → Edge Functions → Secrets :</span><br />
            SMS_GATEWAY_URL=https://votre-tunnel.trycloudflare.com<br />
            SMS_GATEWAY_LOGIN=admin<br />
            SMS_GATEWAY_PASSWORD=motdepasse_sécurisé
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Sans SMS_GATEWAY_URL, le code est envoyé par email en fallback automatique.
          </p>
        </div>
      </PageShell>
    </AdminShell>
  );
}
