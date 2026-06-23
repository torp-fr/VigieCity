import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  display_name: string;
  phone:        string;
  email:        string;
  collectivity_id: string;
}

const EMPTY_NEW: NewOperator = { display_name: "", phone: "", email: "", collectivity_id: "" };

function HabilitationsAdmin() {
  const [operators, setOperators]         = useState<Operator[]>([]);
  const [collectivities, setCollectivities] = useState<Collectivity[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState<NewOperator>(EMPTY_NEW);
  const [saving, setSaving]               = useState(false);
  const [feedback, setFeedback]           = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [search, setSearch]               = useState("");

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

  // ── Ajouter un opérateur ─────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFeedback(null);
    try {
      // 1. Créer le compte via auth admin (invite)
      const { data: authData, error: authErr } = await supabase.auth.admin.inviteUserByEmail(
        form.email,
        { redirectTo: `${window.location.origin}/operateur` },
      );
      if (authErr || !authData.user) throw new Error(authErr?.message ?? "Erreur création compte");

      const userId = authData.user.id;

      // 2. Créer/mettre à jour le profil
      await supabase.from("profiles").upsert({
        id:               userId,
        display_name:     form.display_name,
        phone:            form.phone,
        collectivity_id:  form.collectivity_id,
        role:             "citizen",  // le rôle applicatif reste dans user_roles
      }, { onConflict: "id" });

      // 3. Affecter le rôle opérateur
      const { error: roleErr } = await supabase.from("user_roles").insert({
        user_id:         userId,
        role:            "operator",
        collectivity_id: form.collectivity_id,
      });
      if (roleErr) throw new Error(roleErr.message);

      setFeedback({ type: "ok", msg: `Opérateur ${form.display_name} ajouté. Un email d'invitation a été envoyé à ${form.email}.` });
      setForm(EMPTY_NEW);
      setShowForm(false);
      fetchData();
    } catch (err: unknown) {
      setFeedback({ type: "err", msg: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setSaving(false);
    }
  };

  // ── Révoquer un opérateur ────────────────────────────────────────────────────
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
    <div style={{ padding: "24px 32px", fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto" }}>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#111827" }}>
            🏗️ Opérateurs terrain
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            Gérez les agents habilités à traiter les signalements via SMS OTP
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFeedback(null); }}
          style={{
            padding: "10px 20px", background: "#1e3a8a", color: "white",
            border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          {showForm ? "Annuler" : "+ Ajouter un opérateur"}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          padding: "12px 16px", borderRadius: 10, marginBottom: 20,
          background: feedback.type === "ok" ? "#f0fdf4" : "#fef2f2",
          color:      feedback.type === "ok" ? "#15803d"  : "#dc2626",
          border:     `1px solid ${feedback.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
          fontSize: 14,
        }}>
          {feedback.type === "ok" ? "✅ " : "❌ "}{feedback.msg}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showForm && (
        <form onSubmit={handleAdd} style={{
          background: "white", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 8px rgba(0,0,0,0.1)", marginBottom: 24,
          border: "2px solid #e0e7ff",
        }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, color: "#1e3a8a" }}>Nouvel opérateur</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { key: "display_name", label: "Nom complet *",          placeholder: "Jean Dupont",       type: "text"  },
              { key: "phone",        label: "Téléphone *",             placeholder: "06 12 34 56 78",   type: "tel"   },
              { key: "email",        label: "Email (invitation) *",    placeholder: "jean@mairie.fr",   type: "email" },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  required
                  value={(form as Record<string,string>)[field.key]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1.5px solid #e5e7eb", fontSize: 14, boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            ))}

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Collectivité *
              </label>
              <select
                required
                value={form.collectivity_id}
                onChange={e => setForm(prev => ({ ...prev, collectivity_id: e.target.value }))}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: "1.5px solid #e5e7eb", fontSize: 14, boxSizing: "border-box",
                  background: "white", appearance: "none",
                }}
              >
                <option value="">Sélectionner…</option>
                {collectivities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
            <button type="button" onClick={() => setShowForm(false)} style={{
              padding: "10px 20px", background: "#f1f5f9", border: "none",
              borderRadius: 8, color: "#374151", cursor: "pointer",
            }}>Annuler</button>
            <button type="submit" disabled={saving} style={{
              padding: "10px 20px", background: saving ? "#93c5fd" : "#1e3a8a",
              border: "none", borderRadius: 8, color: "white", fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}>
              {saving ? "Enregistrement…" : "Créer l'opérateur"}
            </button>
          </div>
        </form>
      )}

      {/* Recherche */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Rechercher par nom, téléphone ou collectivité…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 16px", borderRadius: 10,
            border: "1.5px solid #e5e7eb", fontSize: 14, boxSizing: "border-box",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
            <div style={{ color: "#6b7280" }}>Aucun opérateur{search ? " pour cette recherche" : ""}</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Nom", "Téléphone", "Collectivité", "Ajouté le", ""].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left", fontSize: 12,
                    fontWeight: 700, color: "#6b7280", textTransform: "uppercase",
                    letterSpacing: 0.5, borderBottom: "2px solid #f1f5f9",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(op => (
                <tr key={op.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: "#111827" }}>
                    {op.operator_name ?? "—"}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: "#374151", fontFamily: "monospace" }}>
                    {op.operator_phone ?? "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                      background: "#eff6ff", color: "#1d4ed8",
                    }}>{op.collectivity_name}</span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b7280" }}>
                    {new Date(op.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => handleRevoke(op)}
                      style={{
                        padding: "6px 14px", background: "#fef2f2", color: "#dc2626",
                        border: "1px solid #fecaca", borderRadius: 8,
                        fontSize: 13, cursor: "pointer", fontWeight: 600,
                      }}
                    >
                      Révoquer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Guide configuration SMS */}
      <div style={{
        marginTop: 32, padding: 20, background: "#f8fafc",
        border: "1.5px solid #e5e7eb", borderRadius: 12,
      }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#374151" }}>
          📱 Configuration Android SMS Gateway
        </h3>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          Les SMS sont envoyés via <strong>Android SMS Gateway (capcom6)</strong> — solution open source gratuite,
          auto-hébergée sur un smartphone Android avec une carte SIM.
        </p>
        <div style={{ background: "white", borderRadius: 8, padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "#1d4ed8" }}>
          <div style={{ color: "#6b7280", marginBottom: 4 }}># Variables à configurer dans Supabase → Edge Functions → Secrets :</div>
          SMS_GATEWAY_URL=https://votre-tunnel.trycloudflare.com<br/>
          SMS_GATEWAY_LOGIN=admin<br/>
          SMS_GATEWAY_PASSWORD=motdepasse_sécurisé
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ca3af" }}>
          Sans SMS_GATEWAY_URL configuré, le code est envoyé par email en fallback automatique.
        </p>
      </div>
  