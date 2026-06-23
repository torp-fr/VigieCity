import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/operateur/tableau")({
  head: () => ({
    meta: [{ title: "Tableau opérateur — VigieCity" }],
  }),
  component: OperateurTableau,
});

// ── Types ────────────────────────────────────────────────────────────────────
interface OpSession {
  session_token:      string;
  operator_name:      string;
  collectivity_id:    string;
  collectivity_name:  string;
  collectivity_logo:  string | null;
  collectivity_color: string;
}

interface Report {
  id:                  string;
  category:            string;
  severity:            string;
  status:              string;
  title:               string | null;
  description:         string;
  lat:                 number | null;
  lng:                 number | null;
  approximate_address: string | null;
  media_paths:         string[];
  occurred_at:         string;
  created_at:          string;
  updated_at:          string;
}

interface HistoryEntry {
  id:         string;
  old_status: string | null;
  new_status: string;
  comment:    string | null;
  changed_at: string;
}

interface NoteEntry {
  id:         string;
  text:       string;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
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

const SEVERITY: Record<string, { bg: string; text: string; border: string; label: string }> = {
  info:      { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", label: "Info" },
  vigilance: { bg: "#fffbeb", text: "#d97706", border: "#fcd34d", label: "Vigilance" },
  urgent:    { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5", label: "Urgent" },
};

const STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: "En attente",  color: "#d97706" },
  published:   { label: "Publié",      color: "#16a34a" },
  archived:    { label: "Archivé",     color: "#6b7280" },
  rejected:    { label: "Rejeté",      color: "#dc2626" },
  transferred: { label: "Transféré",   color: "#7c3aed" },
};

// ── Notification sonore ───────────────────────────────────────────────────────
function playSound() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880,  ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880,  ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch { /* AudioContext non disponible */ }
}

// ── Composant principal ───────────────────────────────────────────────────────
function OperateurTableau() {
  const navigate = useNavigate();

  // Session & données
  const [session,       setSession]       = useState<OpSession | null>(null);
  const [reports,       setReports]       = useState<Report[]>([]);
  const [loading,       setLoading]       = useState(true);

  // Filtres
  const [tabFilter,     setTabFilter]     = useState<"pending" | "all">("pending");
  const [catFilter,     setCatFilter]     = useState("all");
  const [sevFilter,     setSevFilter]     = useState("all");
  const [search,        setSearch]        = useState("");

  // Modale détail
  const [selected,      setSelected]      = useState<Report | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPhotos,  setDetailPhotos]  = useState<string[]>([]);
  const [detailHistory, setDetailHistory] = useState<HistoryEntry[]>([]);
  const [detailNotes,   setDetailNotes]   = useState<NoteEntry[]>([]);
  const [photoIdx,      setPhotoIdx]      = useState(0);
  const [noteText,      setNoteText]      = useState("");
  const [updating,      setUpdating]      = useState(false);

  // Notification temps réel
  const [newPing,       setNewPing]       = useState(false);
  const prevPendingRef                    = useRef(0);
  const isFirstLoad                       = useRef(true);

  // ── Auth check ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("op_session");
    if (!stored) { navigate({ to: "/operateur" }); return; }
    try {
      const s = JSON.parse(stored) as OpSession;
      if (!s.session_token) { navigate({ to: "/operateur" }); return; }
      setSession(s);
    } catch { navigate({ to: "/operateur" }); }
  }, [navigate]);

  // ── Charger les signalements ─────────────────────────────────────────────────
  const fetchReports = useCallback(async (quiet = false) => {
    if (!session) return;
    if (!quiet) setLoading(true);
    try {
      const { data } = await supabase
        .from("reports")
        .select("id, category, severity, status, title, description, lat, lng, approximate_address, media_paths, occurred_at, created_at, updated_at")
        .eq("collectivity_id", session.collectivity_id)
        .order("created_at", { ascending: false })
        .limit(100);

      const list = (data ?? []) as Report[];
      setReports(list);
      prevPendingRef.current = list.filter(r => r.status === "pending").length;
      isFirstLoad.current = false;
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Badge onglet ─────────────────────────────────────────────────────────────
  const pendingCount = reports.filter(r => r.status === "pending").length;
  useEffect(() => {
    document.title = pendingCount > 0
      ? `(${pendingCount}) Opérateur — VigieCity`
      : "Tableau opérateur — VigieCity";
    return () => { document.title = "VigieCity"; };
  }, [pendingCount]);

  // ── Realtime ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`op_${session.collectivity_id}`)
      .on(
        "postgres_changes" as Parameters<typeof channel.on>[0],
        {
          event:  "*",
          schema: "public",
          table:  "reports",
          filter: `collectivity_id=eq.${session.collectivity_id}`,
        },
        (payload: { eventType: string; new: Partial<Report> }) => {
          // Son + badge uniquement pour un nouveau signalement en attente
          if (payload.eventType === "INSERT" && payload.new?.status === "pending" && !isFirstLoad.current) {
            playSound();
            setNewPing(true);
            setTimeout(() => setNewPing(false), 4000);
          }
          fetchReports(true);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, fetchReports]);

  // ── Ouvrir la modale (+ fetch détails via EF) ─────────────────────────────
  const openDetail = async (report: Report) => {
    setSelected(report);
    setDetailPhotos([]);
    setDetailHistory([]);
    setDetailNotes([]);
    setNoteText("");
    setPhotoIdx(0);
    setDetailLoading(true);
    try {
      const { data } = await supabase.functions.invoke("operator-action", {
        body: {
          session_token: session!.session_token,
          action:        "fetch_detail",
          report_id:     report.id,
        },
      });
      if (data) {
        setDetailPhotos(data.photoUrls  ?? []);
        setDetailHistory(data.history   ?? []);
        setDetailNotes(data.notes       ?? []);
      }
    } catch { /* affiche sans détails */ }
    setDetailLoading(false);
  };

  // ── Changer le statut ─────────────────────────────────────────────────────
  const changeStatus = async (newStatus: string) => {
    if (!selected || !session) return;
    setUpdating(true);
    try {
      await supabase.functions.invoke("operator-action", {
        body: {
          session_token: session.session_token,
          action:        "change_status",
          report_id:     selected.id,
          new_status:    newStatus,
          note:          noteText.trim() || undefined,
        },
      });
      setSelected(null);
      await fetchReports(true);
    } finally {
      setUpdating(false);
    }
  };

  // ── Ajouter une note interne ──────────────────────────────────────────────
  const addNote = async () => {
    if (!noteText.trim() || !selected || !session) return;
    setUpdating(true);
    try {
      const { data } = await supabase.functions.invoke("operator-action", {
        body: {
          session_token: session.session_token,
          action:        "add_note",
          report_id:     selected.id,
          text:          noteText.trim(),
        },
      });
      if (data?.comment) {
        setDetailNotes(prev => [data.comment as NoteEntry, ...prev]);
        setNoteText("");
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("op_session");
    navigate({ to: "/operateur" });
  };

  if (!session) return null;

  const accentColor = session.collectivity_color ?? "#1e3a8a";

  // Filtrage côté client
  const filtered = reports.filter(r => {
    if (tabFilter === "pending" && r.status !== "pending") return false;
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (sevFilter !== "all" && r.severity !== sevFilter) return false;
    if (search.trim()) {
      const q   = search.toLowerCase();
      const hay = `${r.title ?? ""} ${r.description} ${r.approximate_address ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Stat "traités aujourd'hui" : statuts changés aujourd'hui
  const todayStr     = new Date().toDateString();
  const treatedToday = reports.filter(r =>
    r.status !== "pending" && new Date(r.updated_at).toDateString() === todayStr
  ).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Header fixe ── */}
      <header style={{
        background: accentColor, color: "white",
        padding: "0 16px", height: 58,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {session.collectivity_logo ? (
            <img src={session.collectivity_logo} alt="" style={{
              height: 30, borderRadius: 6, background: "white", padding: 2,
            }} />
          ) : (
            <span style={{ fontSize: 22 }}>🏗️</span>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Espace opérateur</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>{session.collectivity_name}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {newPing && (
            <span style={{
              background: "#dc2626", color: "white", borderRadius: 99,
              padding: "3px 10px", fontSize: 11, fontWeight: 700,
            }}>
              🔔 Nouveau signalement !
            </span>
          )}
          <span style={{ fontSize: 13, opacity: 0.8 }}>👤 {session.operator_name}</span>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.15)", color: "white",
              border: "1px solid rgba(255,255,255,0.3)", borderRadius: 7,
              padding: "5px 12px", fontSize: 13, cursor: "pointer",
            }}
          >
            Quitter
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 12px" }}>

        {/* ── Stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          {([
            { label: "En attente",         value: pendingCount,    icon: "⏳", color: "#d97706" },
            { label: "Traités aujourd'hui", value: treatedToday,   icon: "✅", color: "#16a34a" },
            { label: "Total",               value: reports.length, icon: "📋", color: accentColor },
          ] as const).map(c => (
            <div key={c.label} style={{
              background: "white", borderRadius: 12, padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)", borderLeft: `4px solid ${c.color}`,
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{c.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* ── Barre recherche + filtres ── */}
        <div style={{
          background: "white", borderRadius: 14, padding: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: 12,
        }}>
          <input
            type="search"
            placeholder="🔍 Rechercher par titre, description, adresse…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "9px 13px", fontSize: 14,
              border: "1.5px solid #e5e7eb", borderRadius: 9, outline: "none",
              boxSizing: "border-box", fontFamily: "inherit", marginBottom: 10,
              background: "#f9fafb",
            }}
            onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.background = "white"; }}
            onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#f9fafb"; }}
          />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {/* Tab attente / tous */}
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 2, gap: 2 }}>
              {(["pending", "all"] as const).map(t => (
                <button key={t} onClick={() => setTabFilter(t)} style={{
                  padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, position: "relative",
                  background: tabFilter === t ? accentColor : "transparent",
                  color:      tabFilter === t ? "white"     : "#6b7280",
                }}>
                  {t === "pending" ? "⏳ Attente" : "📋 Tous"}
                  {t === "pending" && pendingCount > 0 && (
                    <span style={{
                      position: "absolute", top: -5, right: -5,
                      background: "#dc2626", color: "white", borderRadius: 99,
                      padding: "0 4px", fontSize: 10, fontWeight: 800, minWidth: 14, textAlign: "center",
                    }}>{pendingCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Sévérité */}
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 2, gap: 2 }}>
              {(["all", "info", "vigilance", "urgent"] as const).map(v => {
                const active = sevFilter === v;
                const sev    = SEVERITY[v];
                return (
                  <button key={v} onClick={() => setSevFilter(v)} style={{
                    padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 600,
                    background: active ? (sev ? sev.text : "#374151") : "transparent",
                    color:      active ? "#fff" : (sev ? sev.text : "#374151"),
                  }}>
                    {v === "all" ? "Tous" : (sev?.label ?? v)}
                  </button>
                );
              })}
            </div>

            {/* Catégorie */}
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              style={{
                padding: "6px 10px", borderRadius: 7,
                border: "1.5px solid #e5e7eb", fontSize: 13,
                background: "white", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <option value="all">📂 Catégories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>{lbl}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Liste signalements ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 14, padding: 40,
            textAlign: "center", color: "#9ca3af",
            boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
              Aucun signalement
            </div>
            <div style={{ fontSize: 13 }}>Tous les signalements ont été traités.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(r => {
              const sev  = SEVERITY[r.severity] ?? SEVERITY.info;
              const st   = STATUS[r.status]     ?? { label: r.status, color: "#6b7280" };
              const cat  = CATEGORY_LABELS[r.category] ?? r.category;
              const addr = r.approximate_address
                ?? (r.lat ? `${r.lat.toFixed(4)}, ${r.lng?.toFixed(4)}` : "–");
              const when = new Date(r.occurred_at).toLocaleString("fr-FR", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
              });
              return (
                <div
                  key={r.id}
                  onClick={() => openDetail(r)}
                  style={{
                    background: "white", borderRadius: 12, padding: "13px 16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                    cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start",
                    borderLeft: `4px solid ${sev.border}`,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 3px 10px rgba(0,0,0,0.13)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)"; }}
                >
                  <span style={{
                    background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`,
                    borderRadius: 7, padding: "3px 9px", fontSize: 11, fontWeight: 700,
                    whiteSpace: "nowrap", flexShrink: 0, marginTop: 2,
                  }}>
                    {sev.label}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#1f2937" }}>
                        {r.title ?? cat}
                      </span>
                      <span style={{
                        fontSize: 11, color: st.color, fontWeight: 600,
                        background: `${st.color}18`, padding: "1px 7px", borderRadius: 99,
                      }}>
                        {st.label}
                      </span>
                      {r.media_paths?.length > 0 && (
                        <span style={{ fontSize: 11, color: "#6b7280" }}>
                          📷 {r.media_paths.length}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>🏷 {cat}</span>
                      <span>📍 {addr}</span>
                      <span>🕐 {when}</span>
                    </div>
                    <div style={{
                      fontSize: 13, color: "#374151",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {r.description}
                    </div>
                  </div>

                  <span style={{ color: "#9ca3af", fontSize: 18, flexShrink: 0 }}>›</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modale détail (bottom-sheet) ── */}
      {selected && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div style={{
            background: "white", width: "100%", maxWidth: 700,
            margin: "0 auto",
            borderRadius: "20px 20px 0 0",
            maxHeight: "92vh",
            overflowY: "auto",
          }}>
            {/* Header fixe de la modale */}
            <div style={{
              position: "sticky", top: 0, background: "white", zIndex: 2,
              padding: "12px 16px 10px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(() => {
                  const sev = SEVERITY[selected.severity] ?? SEVERITY.info;
                  return (
                    <span style={{
                      background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`,
                      borderRadius: 7, padding: "3px 9px", fontSize: 11, fontWeight: 700,
                    }}>{sev.label}</span>
                  );
                })()}
                <span style={{ fontWeight: 700, fontSize: 15, color: "#1f2937" }}>
                  {selected.title ?? CATEGORY_LABELS[selected.category] ?? selected.category}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "#f3f4f6", border: "none", borderRadius: "50%",
                  width: 32, height: 32, cursor: "pointer",
                  fontSize: 20, lineHeight: "32px", textAlign: "center",
                }}
              >×</button>
            </div>

            <div style={{ padding: "14px 16px 32px" }}>

              {/* Infos rapides */}
              <div style={{
                background: "#f8fafc", borderRadius: 10, padding: "11px 14px",
                fontSize: 13, color: "#374151", marginBottom: 14,
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px",
              }}>
                <span>🏷 <strong>Catégorie :</strong> {CATEGORY_LABELS[selected.category] ?? selected.category}</span>
                <span>📌 <strong>Statut :</strong> {STATUS[selected.status]?.label ?? selected.status}</span>
                <span>📍 <strong>Lieu :</strong> {selected.approximate_address ?? "–"}</span>
                <span>🕐 <strong>Signalé :</strong> {new Date(selected.occurred_at).toLocaleString("fr-FR")}</span>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Description
                </div>
                <div style={{ fontSize: 14, color: "#1f2937", lineHeight: 1.6, background: "#f9fafb", padding: 12, borderRadius: 9 }}>
                  {selected.description}
                </div>
              </div>

              {detailLoading ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: 14 }}>
                  Chargement des détails…
                </div>
              ) : (
                <>
                  {/* Photos */}
                  {detailPhotos.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Photos ({detailPhotos.length})
                      </div>
                      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
                        <img
                          src={detailPhotos[photoIdx]}
                          alt={`Photo ${photoIdx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                        {detailPhotos.length > 1 && (
                          <>
                            <button
                              onClick={() => setPhotoIdx(i => (i - 1 + detailPhotos.length) % detailPhotos.length)}
                              style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}
                            >&#8249;</button>
                            <button
                              onClick={() => setPhotoIdx(i => (i + 1) % detailPhotos.length)}
                              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}
                            >&#8250;</button>
                            <span style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", fontSize: 11, padding: "2px 8px", borderRadius: 99 }}>
                              {photoIdx + 1} / {detailPhotos.length}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Historique statuts */}
                  {detailHistory.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Historique
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {detailHistory.map(h => (
                          <div key={h.id} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: h.comment ? 4 : 0 }}>
                              {h.old_status && (
                                <span style={{ color: STATUS[h.old_status]?.color ?? "#6b7280", fontWeight: 600 }}>
                                  {STATUS[h.old_status]?.label ?? h.old_status}
                                </span>
                              )}
                              {h.old_status && <span style={{ color: "#9ca3af" }}>&#8594;</span>}
                              <span style={{ color: STATUS[h.new_status]?.color ?? "#6b7280", fontWeight: 700 }}>
                                {STATUS[h.new_status]?.label ?? h.new_status}
                              </span>
                              <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: "auto" }}>
                                {new Date(h.changed_at).toLocaleString("fr-FR")}
                              </span>
                            </div>
                            {h.comment && (
                              <div style={{ color: "#4b5563", fontSize: 12 }}>&#128172; {h.comment}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes internes */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Notes internes
                    </div>
                    {detailNotes.length === 0 ? (
                      <div style={{ color: "#9ca3af", fontSize: 13, padding: "4px 0 8px" }}>Aucune note.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                        {detailNotes.map(n => (
                          <div key={n.id} style={{
                            background: "#fffbeb", border: "1px solid #fde68a",
                            borderRadius: 8, padding: "8px 12px", fontSize: 13,
                          }}>
                            <div style={{ color: "#92400e", marginBottom: 2 }}>{n.text}</div>
                            <div style={{ fontSize: 11, color: "#b45309" }}>
                              {new Date(n.created_at).toLocaleString("fr-FR")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Ajouter une note interne…"
                        rows={2}
                        style={{
                          flex: 1, padding: "8px 12px", borderRadius: 8,
                          border: "1.5px solid #e5e7eb", fontSize: 13,
                          fontFamily: "inherit", resize: "vertical", outline: "none",
                        }}
                        onFocus={e => { e.target.style.borderColor = accentColor; }}
                        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }}
                      />
                      <button
                        onClick={addNote}
                        disabled={!noteText.trim() || updating}
                        style={{
                          padding: "0 14px", borderRadius: 8, border: "none",
                          background: accentColor, color: "white",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                          opacity: (!noteText.trim() || updating) ? 0.5 : 1,
                          alignSelf: "flex-end", height: 38,
                        }}
                      >
                        {updating ? "…" : "Ajouter"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ── Actions statut ── */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Changer le statut
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(STATUS)
                    .filter(([k]) => k !== selected.status)
                    .map(([k, v]) => (
                      <button
                        key={k}
                        disabled={updating}
                        onClick={() => changeStatus(k)}
                        style={{
                          padding: "8px 16px", borderRadius: 9,
                          border: `1.5px solid ${v.color}`,
                          background: "white", color: v.color,
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                          opacity: updating ? 0.6 : 1,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = v.color;
                          (e.currentTarget as HTMLButtonElement).style.color = "white";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = "white";
                          (e.currentTarget as HTMLButtonElement).style.color = v.color;
                        }}
                      >
                        {updating ? "…" : v.label}
                      </button>
                    ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
