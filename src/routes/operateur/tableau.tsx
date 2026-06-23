import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/operateur/tableau")({
  head: () => ({
    meta: [{ title: "Tableau de bord opérateur — VigieCity" }],
  }),
  component: OperateurTableau,
});

// ── Types ────────────────────────────────────────────────────────────────────
interface OpSession {
  session_token:      string;
  expires_at:         string;
  operator_name:      string;
  collectivity_id:    string;
  collectivity_name:  string;
  collectivity_logo:  string | null;
  collectivity_color: string;
}

interface Report {
  id:          string;
  category:    string;
  severity:    string;
  status:      string;
  title:       string;
  description: string;
  lat:         number | null;
  lng:         number | null;
  occurred_at: string;
  created_at:  string;
}

const CATEGORY_LABELS: Record<string, string> = {
  vehicule_suspect: "Véhicule suspect",
  rodeur:           "Rôdeur",
  incivilite:       "Incivilité",
  degradation:      "Dégradation",
  accident:         "Accident",
  animal:           "Animal",
  eclairage:        "Éclairage",
  depot_sauvage:    "Dépôt sauvage",
  autre:            "Autre",
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  info:      { bg: "#eff6ff", text: "#1d4ed8", label: "Info" },
  vigilance: { bg: "#fffbeb", text: "#d97706", label: "Vigilance" },
  urgent:    { bg: "#fef2f2", text: "#dc2626", label: "Urgent" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: "En attente",  color: "#d97706" },
  published:   { label: "Publié",      color: "#16a34a" },
  archived:    { label: "Archivé",     color: "#6b7280" },
  rejected:    { label: "Rejeté",      color: "#dc2626" },
  transferred: { label: "Transféré",   color: "#7c3aed" },
};

// ── Composant principal ──────────────────────────────────────────────────────
function OperateurTableau() {
  const navigate = useNavigate();
  const [session, setSession]     = useState<OpSession | null>(null);
  const [reports, setReports]     = useState<Report[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"pending" | "all">("pending");
  const [selected, setSelected]   = useState<Report | null>(null);
  const [updating, setUpdating]   = useState(false);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("op_session");
    if (!stored) { navigate({ to: "/operateur" }); return; }
    try {
      const s = JSON.parse(stored) as OpSession;
      if (new Date(s.expires_at) <= new Date()) {
        sessionStorage.removeItem("op_session");
        navigate({ to: "/operateur" });
        return;
      }
      setSession(s);
    } catch {
      navigate({ to: "/operateur" });
    }
  }, [navigate]);

  // ── Charger les signalements ─────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      let q = supabase
        .from("reports")
        .select("id, category, severity, status, title, description, lat, lng, occurred_at, created_at")
        .eq("collectivity_id", session.collectivity_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter === "pending") q = q.eq("status", "pending");

      const { data } = await q;
      setReports(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [session, filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Changer le statut d'un signalement ─────────────────────────────────────
  const changeStatus = async (id: string, newStatus: string) => {
    setUpdating(true);
    try {
      await supabase
        .from("reports")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
      await fetchReports();
      setSelected(null);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("op_session");
    navigate({ to: "/operateur" });
  };

  if (!session) return null;

  const pendingCount = reports.filter(r => r.status === "pending").length;
  const accentColor  = session.collectivity_color ?? "#1e3a8a";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header style={{
        background: accentColor, color: "white",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {session.collectivity_logo ? (
            <img src={session.collectivity_logo} alt="" style={{ height: 36, borderRadius: 8, background: "white", padding: 2 }} />
          ) : (
            <div style={{ fontSize: 22 }}>🏗️</div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Espace opérateur</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{session.collectivity_name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14 }}>
            👤 {session.operator_name}
          </span>
          <button onClick={handleLogout} style={{
            background: "rgba(255,255,255,0.2)", color: "white",
            border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8,
            padding: "6px 14px", fontSize: 13, cursor: "pointer",
          }}>
            Déconnexion
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── Stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "En attente", value: reports.filter(r=>r.status==="pending").length, icon: "⏳", color: "#d97706" },
            { label: "Traités aujourd'hui", value: reports.filter(r=>r.status!=="pending" && new Date(r.created_at).toDateString()===new Date().toDateString()).length, icon: "✅", color: "#16a34a" },
            { label: "Total signalements", value: reports.length, icon: "📋", color: accentColor },
          ].map(card => (
            <div key={card.label} style={{
              background: "white", borderRadius: 14, padding: "20px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              borderLeft: `4px solid ${card.color}`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{card.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filtres + liste ── */}
        <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "2px solid #f1f5f9", padding: "0 20px" }}>
            {([["pending","⏳ En attente"],["all","📋 Tous"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)} style={{
                padding: "14px 20px", fontSize: 14, fontWeight: 600,
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: filter === key ? `3px solid ${accentColor}` : "3px solid transparent",
                color: filter === key ? accentColor : "#6b7280",
                marginBottom: -2,
              }}>{label}
                {key === "pending" && pendingCount > 0 && (
                  <span style={{
                    marginLeft: 8, background: "#dc2626", color: "white",
                    borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                  }}>{pendingCount}</span>
                )}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={fetchReports} style={{
              alignSelf: "center", padding: "8px 16px", fontSize: 13,
              background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#374151",
            }}>
              🔄 Actualiser
            </button>
          </div>

          {/* Liste */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
              Chargement…
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ color: "#6b7280" }}>
                {filter === "pending" ? "Aucun signalement en attente" : "Aucun signalement"}
              </div>
            </div>
          ) : (
            <div>
              {reports.map(report => {
                const sev    = SEVERITY_COLORS[report.severity] ?? SEVERITY_COLORS.info;
                const status = STATUS_LABELS[report.status]     ?? { label: report.status, color: "#6b7280" };
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelected(report)}
                    style={{
                      padding: "16px 20px", borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                      display: "flex", alignItems: "flex-start", gap: 14,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "white"; }}
                  >
                    {/* Sévérité */}
                    <span style={{
                      padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                      background: sev.bg, color: sev.text, flexShrink: 0,
                    }}>{sev.label}</span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#111827", fontSize: 15, marginBottom: 2 }}>
                        {report.title || CATEGORY_LABELS[report.category] || report.category}
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {CATEGORY_LABELS[report.category] ?? report.category} ·{" "}
                        {new Date(report.created_at).toLocaleDateString("fr-FR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                      </div>
                    </div>

                    <span style={{
                      padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                      background: "#f1f5f9", color: status.color, flexShrink: 0,
                    }}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modale détail ── */}
      {selected && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, zIndex: 100,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: "white", borderRadius: 20, padding: 28, maxWidth: 500, width: "100%",
              maxHeight: "90vh", overflowY: "auto",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                  color: "#9ca3af", marginBottom: 4,
                }}>
                  {CATEGORY_LABELS[selected.category] ?? selected.category}
                </div>
                <h2 style={{ margin: 0, fontSize: 18, color: "#111827" }}>
                  {selected.title || "Signalement"}
                </h2>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: "#f1f5f9", border: "none", borderRadius: 8,
                width: 32, height: 32, cursor: "pointer", fontSize: 16,
              }}>×</button>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{
                padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 700,
                background: SEVERITY_COLORS[selected.severity]?.bg ?? "#eff6ff",
                color:      SEVERITY_COLORS[selected.severity]?.text ?? "#1d4ed8",
              }}>
                {SEVERITY_COLORS[selected.severity]?.label ?? selected.severity}
              </span>
              <span style={{
                padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 600,
                background: "#f1f5f9", color: STATUS_LABELS[selected.status]?.color ?? "#6b7280",
              }}>
                {STATUS_LABELS[selected.status]?.label ?? selected.status}
              </span>
            </div>

            {selected.description && (
              <p style={{ color: "#374151", fontSize: 15, lineHeight: 1.6, margin: "0 0 16px" }}>
                {selected.description}
              </p>
            )}

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
              Signalé le {new Date(selected.created_at).toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
              {selected.lat && selected.lng && (
                <span> · <a
                  href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: accentColor }}
                >Voir sur la carte</a></span>
              )}
            </div>

            {/* Actions */}
            {selected.status === "pending" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                  Traitement du signalement
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    onClick={() => changeStatus(selected.id, "published")}
                    disabled={updating}
                    style={{
                      padding: "11px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: "#16a34a", color: "white", fontWeight: 700, fontSize: 14,
                    }}
                  >✅ Valider</button>
                  <button
                    onClick={() => changeStatus(selected.id, "rejected")}
                    disabled={updating}
                    style={{
                      padding: "11px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: "#dc2626", color: "white", fontWeight: 700, fontSize: 14,
                    }}
                  >❌ Rejeter</button>
                  <button
                    onClick={() => changeStatus(selected.id, "transferred")}
                    disabled={updating}
                    style={{
                      padding: "11px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: "#7c3aed", color: "white", fontWeight: 700, fontSize: 14,
                      gridColumn: "1 / -1",
                    }}
                  >↗️ Transférer aux autorités</button>
                </div>
              </div>
            )}

            {selected.status !== "pending" && (
              <button
                onClick={() => changeStatus(selected.id, "pending")}
                disabled={updating}
                style={{
                  width: "100%", padding: "11px", borderRadius: 10,
                  border: "1px solid #e5e7eb", background: "white",
                  color: "#6b7280", cursor: "pointer", fontSize: 14,
                }}
              >↩️ Remettre en attente</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
