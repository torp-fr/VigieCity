import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/reset-password")({
  head: () => ({
    meta: [{ title: "Nouveau mot de passe — VigieCity" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword]   = useState("");
  const [confirm,  setConfirm]    = useState("");
  const [showPwd,  setShowPwd]    = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [done,     setDone]       = useState(false);
  const [error,    setError]      = useState<string | null>(null);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  // Supabase injecte le token dans le hash de l'URL (#access_token=...&type=recovery)
  // On laisse le SDK le traiter via onAuthStateChange
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      } else if (event === "SIGNED_OUT") {
        setValidSession(false);
      }
    });

    // Fallback : vérifier si une session existe déjà
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message ?? "Erreur lors de la mise à jour du mot de passe.");
        return;
      }
      setDone(true);
      setTimeout(() => navigate({ to: "/admin/login" }), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">

        {/* Icône */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "#1e3a8a" }}>
            {done
              ? <CheckCircle className="h-7 w-7 text-white" />
              : <ShieldCheck  className="h-7 w-7 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {done ? "Mot de passe mis à jour !" : "Nouveau mot de passe"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {done
              ? "Redirection vers la connexion dans 3 secondes…"
              : "Choisissez un nouveau mot de passe sécurisé."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          {/* Succès */}
          {done && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-sm text-emerald-700">
              Votre mot de passe a été modifié avec succès.
            </div>
          )}

          {/* Token invalide */}
          {validSession === false && !done && (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                Ce lien a expiré ou est invalide. Demandez un nouveau lien de réinitialisation.
              </div>
              <button
                onClick={() => navigate({ to: "/admin/login" })}
                className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Retour à la connexion
              </button>
            </div>
          )}

          {/* Formulaire */}
          {!done && validSession !== false && (
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-sm font-medium text-slate-700">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="new-password"
                    type={showPwd ? "text" : "password"}
                    required minLength={8} autoFocus
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm outline-none ring-blue-500 transition focus:border-blue-500 focus:bg-white focus:ring-2"
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm-password"
                    type={showPwd ? "text" : "password"}
                    required
                    value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none ring-blue-500 transition focus:border-blue-500 focus:bg-white focus:ring-2"
                  />
                </div>
              </div>

              {/* Indicateur de force */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        password.length < 8  ? "w-1/4 bg-red-400" :
                        password.length < 12 ? "w-2/4 bg-orange-400" :
                                               "w-full bg-emerald-500"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {password.length < 8  ? "Trop court" :
                     password.length < 12 ? "Acceptable" : "Mot de passe fort"}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit" disabled={loading || !password || !confirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Mise à jour…" : "Définir le nouveau mot de passe"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
