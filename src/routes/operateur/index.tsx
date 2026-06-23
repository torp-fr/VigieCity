import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/operateur/")({
  head: () => ({
    meta: [{ title: "Espace opérateur — VigieCity" }],
  }),
  component: OperateurLogin,
});

type Step = "phone" | "otp" | "loading";

interface OtpSession {
  session_token:      string;
  operator_name:      string;
  collectivity_id:    string;
  collectivity_name:  string;
  collectivity_logo:  string | null;
  collectivity_color: string;
}

function OperateurLogin() {
  const navigate  = useNavigate();
  const [step, setStep]       = useState<Step>("phone");
  const [phone, setPhone]     = useState("");
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [method, setMethod]   = useState<"sms" | "email">("sms");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs               = useRef<(HTMLInputElement | null)[]>([]);

  // Rediriger si déjà connecté
  useEffect(() => {
    const stored = localStorage.getItem("op_session");
    if (!stored) return;
    try {
      const s = JSON.parse(stored) as OtpSession;
      if (s.session_token) navigate({ to: "/operateur/tableau" });
    } catch { /* ignore */ }
  }, [navigate]);

  // ── Étape 1 : envoyer le code ─────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "operator-send-otp",
        { body: { phone } },
      );
      if (fnErr || !data?.success) {
        throw new Error(data?.error ?? "Erreur lors de l'envoi");
      }
      setMethod(data.method ?? "sms");
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  // ── Étape 2 : vérifier le code ────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) { setError("Entrez les 6 chiffres du code."); return; }
    setError(""); setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "operator-verify-otp",
        { body: { phone, code } },
      );
      if (fnErr || !data?.session_token) {
        throw new Error(data?.error ?? "Code incorrect");
      }
      localStorage.setItem("op_session", JSON.stringify(data));
      navigate({ to: "/operateur/tableau" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Gestion saisie OTP (auto-avance)
  const handleOtpKey = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (next.every(d => d !== "")) {
      // Auto-submit quand les 6 chiffres sont saisis
      setTimeout(() => {
        setOtp(next);
        handleVerifyOtpWithCode(next.join(""));
      }, 80);
    }
  };

  const handleVerifyOtpWithCode = async (code: string) => {
    if (code.length !== 6) return;
    setError(""); setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "operator-verify-otp",
        { body: { phone, code } },
      );
      if (fnErr || !data?.session_token) throw new Error(data?.error ?? "Code incorrect");
      localStorage.setItem("op_session", JSON.stringify(data));
      navigate({ to: "/operateur/tableau" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Code incorrect");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split("");
      setOtp(arr);
      setTimeout(() => handleVerifyOtpWithCode(pasted), 80);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: "40px 36px",
        maxWidth: 400, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        {/* Logo + titre */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 26,
          }}>
            🏗️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>
            Espace opérateur
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "6px 0 0" }}>
            {step === "phone"
              ? "Entrez votre numéro pour recevoir un code"
              : `Code envoyé par ${method === "sms" ? "SMS" : "email"}`}
          </p>
        </div>

        {/* ── Étape phone ── */}
        {step === "phone" && (
          <form onSubmit={handleSendOtp}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Numéro de téléphone
            </label>
            <input
              type="tel"
              placeholder="06 XX XX XX XX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%", padding: "13px 16px", fontSize: 16,
                border: "2px solid #e5e7eb", borderRadius: 10,
                outline: "none", boxSizing: "border-box", fontFamily: "inherit",
              }}
              onFocus={e => { e.target.style.borderColor = "#1d4ed8"; }}
              onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }}
            />
            {error && (
              <p style={{ color: "#dc2626", fontSize: 13, margin: "8px 0 0" }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              style={{
                width: "100%", marginTop: 16, padding: "13px",
                background: loading ? "#93c5fd" : "#1d4ed8",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Envoi en cours…" : "Recevoir le code →"}
            </button>
          </form>
        )}

        {/* ── Étape OTP ── */}
        {step === "otp" && (
          <div>
            <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 20, textAlign: "center" }}>
              {method === "sms"
                ? `SMS envoyé au ${phone}`
                : `Code envoyé par email (compte lié au ${phone})`}
            </p>

            {/* Saisie OTP 6 cases */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpKey(i, e.target.value)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  onKeyDown={e => {
                    if (e.key === "Backspace" && !digit && i > 0) {
                      otpRefs.current[i - 1]?.focus();
                    }
                  }}
                  autoFocus={i === 0}
                  style={{
                    width: 46, height: 54, textAlign: "center",
                    fontSize: 24, fontWeight: 700, color: "#111827",
                    border: `2px solid ${digit ? "#1d4ed8" : "#e5e7eb"}`,
                    borderRadius: 10, outline: "none", fontFamily: "monospace",
                  }}
                />
              ))}
            </div>

            {error && (
              <p style={{ color: "#dc2626", fontSize: 13, textAlign: "center", marginBottom: 12 }}>{error}</p>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.some(d => !d)}
              style={{
                width: "100%", padding: "13px",
                background: loading ? "#93c5fd" : "#1d4ed8",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Vérification…" : "Valider"}
            </button>

            <button
              onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(""); }}
              style={{
                width: "100%", marginTop: 10, padding: "10px",
                background: "transparent", color: "#6b7280",
                border: "1px solid #e5e7eb", borderRadius: 10,
                fontSize: 14, cursor: "pointer",
              }}
            >
              ← Changer de numéro
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#d1d5db", marginTop: 24, marginBottom: 0 }}>
          Accès réservé aux agents habilités · VigieCity
        </p>
      </div>
    </div>
  );
}
