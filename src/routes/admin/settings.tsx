import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, User, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const [userEmail,   setUserEmail]   = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role,        setRole]        = useState("");

  // Changement de mot de passe
  const [newPwd,    setNewPwd]    = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdDone,    setPwdDone]   = useState(false);
  const [pwdError,   setPwdError]  = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      setUserEmail(session.user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", session.user.id)
        .single();
      setDisplayName(profile?.display_name ?? "");
      setRole(profile?.role ?? "");
    });
  }, []);

  const ROLE_LABELS: Record<string, string> = {
    commune_admin: "Administrateur commune",
    interco_admin: "Administrateur intercommunal",
    super_admin:   "Super administrateur VigieCity",
  };

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    setPwdDone(false);
    if (newPwd.length < 8) {
      setPwdError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Les mots de passe ne correspondent pas.");
      return;
    }
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) {
        setPwdError(error.message ?? "Erreur lors de la mise à jour.");
        return;
      }
      setPwdDone(true);
      setNewPwd("");
      setConfirmPwd("");
      toast.success("Mot de passe mis à jour !");
    } finally {
      setPwdLoading(false);
    }
  }

  return (
    <AdminShell activePath="/admin/settings">
      <div className="mx-auto max-w-xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres du compte</h1>
          <p className="mt-0.5 text-sm text-slate-500">Gérez vos informations et votre mot de passe</p>
        </div>

        {/* Infos compte */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Informations du compte</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-[11px] text-slate-400">Adresse email</p>
                <p className="text-sm font-medium text-slate-800">{userEmail || "…"}</p>
              </div>
            </div>
            {displayName && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <User className="h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-[11px] text-slate-400">Nom affiché</p>
                  <p className="text-sm font-medium text-slate-800">{displayName}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <Lock className="h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-[11px] text-slate-400">Rôle</p>
                <p className="text-sm font-medium text-slate-800">{ROLE_LABELS[role] ?? role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Changer le mot de passe</h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-pwd" className="text-sm font-medium text-slate-700">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="new-pwd"
                  type={showPwd ? "text" : "password"}
                  required minLength={8}
                  value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdDone(false); }}
                  placeholder="8 caractères minimum"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm outline-none ring-emerald-500 transition focus:border-emerald-500 focus:bg-white focus:ring-2"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Barre de force */}
              {newPwd.length > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${
                      newPwd.length < 8  ? "w-1/4 bg-red-400" :
                      newPwd.length < 12 ? "w-2/4 bg-orange-400" :
                                           "w-full bg-emerald-500"
                    }`} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {newPwd.length < 8 ? "Trop court" : newPwd.length < 12 ? "Acceptable" : "Mot de passe fort"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-pwd" className="text-sm font-medium text-slate-700">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirm-pwd"
                  type={showPwd ? "text" : "password"}
                  required
                  value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none ring-emerald-500 transition focus:bg-white focus:ring-2 ${
                    confirmPwd && confirmPwd !== newPwd
                      ? "border-red-300 focus:border-red-400"
                      : "border-slate-200 focus:border-emerald-500"
                  }`}
                />
              </div>
              {confirmPwd && confirmPwd !== newPwd && (
                <p className="text-[11px] text-red-500">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {pwdError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pwdError}</div>
            )}

            {pwdDone && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Mot de passe mis à jour avec succès.
              </div>
            )}

            <button
              type="submit"
              disabled={pwdLoading || !newPwd || !confirmPwd || newPwd !== confirmPwd}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {pwdLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {pwdLoading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
            </button>
          </form>
        </div>

      </div>
    </AdminShell>
  );
}
