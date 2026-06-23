/**
 * /admin/accept-invite?token=<uuid>
 *
 * Route publique (non protégée) : permet à un futur admin de commune
 * de créer son compte à partir d'un token d'invitation.
 *
 * Flow :
 *  1. Vérifie le token dans commune_invites (SELECT par token, RLS public)
 *  2. Affiche un formulaire pré-rempli avec l'email de l'invitation
 *  3. Sur soumission → supabase.auth.signUp() + update profile + mark invite accepted
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Loader2, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/accept-invite")({
  component: AcceptInvitePage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type InviteRecord = {
  id:              string;
  email:           string;
  collectivity_id: string;
  expires_at:      string;
  accepted_at:     string | null;
  collectivities: {
    name:            string;
    department_code: string | null;
  };
};

type PageState =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "expired" }
  | { kind: "already_used" }
  | { kind: "ready"; invite: InviteRecord }
  | { kind: "submitting" }
  | { kind: "success"; communeName: string };

// ── Page ──────────────────────────────────────────────────────────────────────

function AcceptInvitePage() {
  const navigate = useNavigate();
  const token    = new URLSearchParams(window.location.search).get("token") ?? "";

  const [state,       setState]       = useState<PageState>({ kind: "loading" });
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");

  // ── Fetch invite on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", reason: "Lien d'invitation manquant ou invalide." });
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("commune_invites")
        .select(`
          id, email, collectivity_id, expires_at, accepted_at,
          collectivities ( name, department_code )
        `)
        .eq("token", token)
        .maybeSingle();

      if (error || !data) {
        setState({ kind: "invalid", reason: "Ce lien d'invitation n'existe pas ou a été révoqué." });
        return;
      }

      const invite = data as unknown as InviteRecord;

      if (invite.accepted_at) {
        setState({ kind: "already_used" });
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setState({ kind: "expired" });
        return;
      }

      setState({ kind: "ready", invite });
    })();
  }, [token]);

  // ── Strength helpers ──────────────────────────────────────────────────────
  const strength = (() => {
    let s = 0;
    if (password.length >= 8)                          s++;
    if (/[A-Z]/.test(password))                       s++;
    if (/[0-9]/.test(password))                       s++;
    if (/[^A-Za-z0-9]/.test(password))                s++;
    return s; // 0-4
  })();

  const strengthColor = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-600"][strength];
  const strengthLabel = ["", "Faible", "Moyen", "Fort", "Très fort"][strength];

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;

    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (strength < 2) {
      toast.error("Mot de passe trop faible — au moins 8 caractères avec chiffres et majuscules.");
      return;
    }

    setState({ kind: "submitting" });

    const invite = state.invite;

    try {
      // 1. Create Supabase auth account
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email:    invite.email,
        password,
        options: {
          data: {
            first_name:      firstName.trim() || null,
            last_name:       lastName.trim()  || null,
            collectivity_id: invite.collectivity_id,
            role:            "commune_admin",
          },
        },
      });

      if (signUpErr) throw signUpErr;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Aucun utilisateur créé.");

      // 2. Upsert profile with collectivity_id + role
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          id:              userId,
          email:           invite.email,
          first_name:      firstName.trim() || null,
          last_name:       lastName.trim()  || null,
          role:            "commune_admin",
          collectivity_id: invite.collectivity_id,
        });

      if (profileErr) console.warn("Profile upsert:", profileErr.message);

      // 3. Mark invite as accepted
      await supabase
        .from("commune_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      setState({ kind: "success", communeName: invite.collectivities?.name ?? "votre commune" });

      // Redirect to admin dashboard after 3 s
      setTimeout(() => navigate({ to: "/admin" }), 3000);

    } catch (err: any) {
      toast.error(err.message ?? "Une erreur est survenue.");
      setState({ kind: "ready", invite });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 shadow">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-extrabold text-blue-900">VigieCity</span>
        </div>

        {/* ── Loading ── */}
        {state.kind === "loading" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-500">Vérification du lien d'invitation…</p>
          </div>
        )}

        {/* ── Invalid ── */}
        {state.kind === "invalid" && (
          <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
            <h1 className="mb-2 text-lg font-bold text-slate-900">Lien invalide</h1>
            <p className="text-sm text-slate-500">{state.reason}</p>
          </div>
        )}

        {/* ── Expired ── */}
        {state.kind === "expired" && (
          <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-orange-400" />
            <h1 className="mb-2 text-lg font-bold text-slate-900">Lien expiré</h1>
            <p className="text-sm text-slate-500">
              Ce lien d'invitation a expiré (validité 48 h). Contactez votre référent VigieCity pour en obtenir un nouveau.
            </p>
          </div>
        )}

        {/* ── Already used ── */}
        {state.kind === "already_used" && (
          <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <h1 className="mb-2 text-lg font-bold text-slate-900">Compte déjà créé</h1>
            <p className="mb-4 text-sm text-slate-500">
              Ce lien d'invitation a déjà été utilisé. Connectez-vous directement.
            </p>
            <a
              href="/admin/login"
              className="inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Se connecter →
            </a>
          </div>
        )}

        {/* ── Success ── */}
        {state.kind === "success" && (
          <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
            <h1 className="mb-2 text-lg font-bold text-slate-900">Compte créé !</h1>
            <p className="text-sm text-slate-500">
              Bienvenue sur VigieCity. Vous administrez maintenant{" "}
              <strong>{state.communeName}</strong>. Redirection en cours…
            </p>
            <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-blue-400" />
          </div>
        )}

        {/* ── Ready: signup form ── */}
        {(state.kind === "ready" || state.kind === "submitting") && (() => {
          const invite = state.kind === "ready" ? state.invite : (null as any);
          const commune = invite?.collectivities;
          return (
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              {/* Header */}
              <div className="mb-6 text-center">
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  🏛️ Invitation
                </span>
                <h1 className="mt-3 text-xl font-bold text-slate-900">
                  Créez votre compte administrateur
                </h1>
                {commune && (
                  <p className="mt-1 text-sm text-slate-500">
                    Commune de <strong>{commune.name}</strong>
                    {commune.department_code ? ` (Dept. ${commune.department_code})` : ""}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Marie"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Dupont"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Email (readonly) */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={invite?.email ?? ""}
                    readOnly
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 8 caractères"
                      required
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i <= strength ? strengthColor : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{strengthLabel}</p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    required
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      confirm && confirm !== password
                        ? "border-red-300 focus:border-red-400 focus:ring-red-300"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                  />
                  {confirm && confirm !== password && (
                    <p className="mt-1 text-[11px] text-red-500">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={state.kind === "submitting" || !password || !confirm}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {state.kind === "submitting"
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Création en cours…</>
                    : "Créer mon compte administrateur →"
                  }
                </button>

                <p className="text-center text-[11px] text-slate-400">
                  En créant votre compte, vous acceptez les{" "}
                  <a href="/cgu" className="underline hover:text-slate-600">CGU</a> et la{" "}
                  <a href="/confidentialite" className="underline hover:text-slate-600">politique de confidentialité</a>{" "}
                  de VigieCity.
                </p>
              </form>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
          