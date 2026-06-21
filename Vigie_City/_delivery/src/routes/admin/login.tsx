import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Loader2, ShieldCheck, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Connexion Administration — VigieCity" }],
  }),
  component: AdminLoginPage,
});

const ROLE_REDIRECT: Record<string, string> = {
  commune_admin: "/admin",
  interco_admin: "/admin/epci",
  super_admin:   "/platform",
};

type View = "login" | "forgot" | "forgot-sent";

function AdminLoginPage() {
  const navigate  = useNavigate();
  const [view, setView]         = useState<View>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── Login ──────────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (authError) {
        setError("Email ou mot de passe incorrect.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Profil introuvable. Contactez le support.");
        return;
      }

      const destination = ROLE_REDIRECT[profile.role];
      if (!destination) {
        await supabase.auth.signOut();
        setError("Accès réservé aux administrateurs (commune, intercommunalité ou super-admin).");
        return;
      }

      toast.success(`Bienvenue${profile.display_name ? `, ${profile.display_name}` : ""} !`);
      navigate({ to: destination as any });
    } finally {
      setLoading(false);
    }
  }

  // ── Mot de passe oublié ────────────────────────────────────────────────────

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        { redirectTo: `${window.location.origin}/admin/reset-password` },
      );
      if (resetError) {
        setError("Impossible d'envoyer l'email. Vérifiez l'adresse saisie.");
        return;
      }
      setView("forgot-sent");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">

      {/* Header */}
      <header style={{ backgroundColor: "#1e3a8a" }} className="px-8 py-4">
        <Link to="/" className="flex w-fit items-center gap-2.5">
          <img src="/icons/icon.svg" alt="VigieCity" width={28} height={28} />
          <span className="text-lg font-extrabold tracking-tight text-white">VigieCity</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          {/* Icône + titre */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "#1e3a8a" }}>
              {view === "forgot-sent"
                ? <CheckCircle className="h-7 w-7 text-white" />
                : <ShieldCheck  className="h-7 w-7 text-white" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {view === "login"        && "Espace Administration"}
              {view === "forgot"       && "Réinitialiser le mot de passe"}
              {view === "forgot-sent"  && "Email envoyé !"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {view === "login"       && "Réservé aux communes, intercommunalités et équipe VigieCity"}
              {view === "forgot"      && "Saisissez votre email pour recevoir le lien de réinitialisation"}
              {view === "forgot-sent" && `Un lien a été envoyé à ${resetEmail}`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

            {/* ── Vue : login ── */}
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">Adresse email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email" type="email" required autoFocus
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@macommune.fr"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none ring-blue-500 transition focus:border-blue-500 focus:bg-white focus:ring-2"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-slate-700">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => { setResetEmail(email); setView("forgot"); setError(null); }}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password" type={showPwd ? "text" : "password"} required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none ring-blue-500 transition focus:border-blue-500 focus:bg-white focus:ring-2"
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <button
                  type="submit" disabled={loading || !email || !password}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: "#1e3a8a" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {loading ? "Connexion…" : "Se connecter"}
                </button>
              </form>
            )}

            {/* ── Vue : mot de passe oublié ── */}
            {view === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="reset-email" className="text-sm font-medium text-slate-700">Adresse email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="reset-email" type="email" required autoFocus
                      value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@macommune.fr"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none ring-blue-500 transition focus:border-blue-500 focus:bg-white focus:ring-2"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <button
                  type="submit" disabled={loading || !resetEmail}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: "#1e3a8a" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? "Envoi…" : "Envoyer le lien de réinitialisation"}
                </button>

                <button type="button" onClick={() => { setView("login"); setError(null); }}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-800"
                >
                  ← Retour à la connexion
                </button>
              </form>
            )}

            {/* ── Vue : email envoyé ── */}
            {view === "forgot-sent" && (
              <div className="space-y-4 text-center">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  Consultez votre boîte mail et cliquez sur le lien pour choisir un nouveau mot de passe.
                  Le lien expire dans 1 heure.
                </div>
                <button
                  type="button"
                  onClick={() => { setView("login"); setError(null); }}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Retour à la connexion
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à vigiecity.fr
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} VigieCity — Plateforme citoyenne française
      </footer>
    </div>
  );
}
