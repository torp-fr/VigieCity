import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Lock, Eye, EyeOff, Loader2, CheckCircle, User, Mail,
  Palette, ImagePlus, X, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

// ── Couleurs prédéfinies ───────────────────────────────────────────────────────
const PRESET_COLORS = [
  { label: "VigieCity Bleu",  value: "#1e3a8a" },
  { label: "Émeraude",        value: "#065f46" },
  { label: "Bordeaux",        value: "#7f1d1d" },
  { label: "Marine",          value: "#0c4a6e" },
  { label: "Indigo",          value: "#312e81" },
  { label: "Ardoise",         value: "#1e293b" },
  { label: "Forêt",           value: "#14532d" },
  { label: "Brique",          value: "#92400e" },
];

function AdminSettingsPage() {
  const [userEmail,   setUserEmail]   = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role,        setRole]        = useState("");
  const [collectivityId, setCollectivityId] = useState<string | null>(null);

  // Identité visuelle
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#1e3a8a");
  const [secondaryColor, setSecondaryColor] = useState("#065f46");
  const [logoUploading, setLogoUploading] = useState(false);
  const [themeSaving,   setThemeSaving]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .select("display_name, role, collectivity_id")
        .eq("id", session.user.id)
        .single();
      setDisplayName(profile?.display_name ?? "");
      setRole(profile?.role ?? "");
      setCollectivityId(profile?.collectivity_id ?? null);

      if (profile?.collectivity_id) {
        const { data: coll } = await supabase
          .from("collectivities")
          .select("logo_url, primary_color, secondary_color")
          .eq("id", profile.collectivity_id)
          .single();
        if (coll) {
          setLogoUrl(coll.logo_url ?? null);
          setPrimaryColor(coll.primary_color ?? "#1e3a8a");
          setSecondaryColor(coll.secondary_color ?? "#065f46");
        }
      }
    });
  }, []);

  const ROLE_LABELS: Record<string, string> = {
    commune_admin: "Administrateur commune",
    interco_admin: "Administrateur intercommunal",
    super_admin:   "Super administrateur VigieCity",
  };

  // ── Upload logo ────────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !collectivityId) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image max 5 Mo"); return; }
    setLogoUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "png";
      const path = `${collectivityId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("commune-assets")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("commune-assets")
        .getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`; // cache-bust

      const { error: dbErr } = await supabase
        .from("collectivities")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", collectivityId);
      if (dbErr) throw dbErr;

      setLogoUrl(publicUrl);
      toast.success("Logo mis à jour !");
    } catch (err: any) {
      toast.error("Erreur upload : " + (err.message ?? "inconnue"));
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!collectivityId) return;
    await supabase.from("collectivities").update({ logo_url: null }).eq("id", collectivityId);
    setLogoUrl(null);
    toast.success("Logo supprimé");
  }

  // ── Sauvegarde couleurs ────────────────────────────────────────────────────
  async function handleThemeSave(e: React.FormEvent) {
    e.preventDefault();
    if (!collectivityId) return;
    setThemeSaving(true);
    try {
      const { error } = await supabase
        .from("collectivities")
        .update({ primary_color: primaryColor, secondary_color: secondaryColor })
        .eq("id", collectivityId);
      if (error) throw error;
      // Applique immédiatement dans l'UI
      document.documentElement.style.setProperty("--commune-primary",   primaryColor);
      document.documentElement.style.setProperty("--commune-secondary", secondaryColor);
      toast.success("Couleurs mises à jour !");
    } catch (err: any) {
      toast.error("Erreur : " + (err.message ?? "inconnue"));
    } finally {
      setThemeSaving(false);
    }
  }

  // ── Changement de mot de passe ─────────────────────────────────────────────
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    setPwdDone(false);
    if (newPwd.length < 8) { setPwdError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (newPwd !== confirmPwd) { setPwdError("Les mots de passe ne correspondent pas."); return; }
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) { setPwdError(error.message ?? "Erreur lors de la mise à jour."); return; }
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
          <p className="mt-0.5 text-sm text-slate-500">Gérez vos informations, l'identité visuelle de votre commune et votre mot de passe</p>
        </div>

        {/* ── Infos compte ─────────────────────────────────────────────── */}
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

        {/* ── Identité visuelle ────────────────────────────────────────── */}
        {collectivityId && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Palette className="h-4 w-4 text-slate-400" />
              Identité visuelle de votre commune
            </h2>
            <p className="mb-5 text-xs text-slate-400">Logo et couleurs affichés dans l'application et les emails envoyés à vos citoyens.</p>

            {/* Logo */}
            <div className="mb-5">
              <label className="mb-2 block text-xs font-medium text-slate-600">Logo de la commune</label>
              {logoUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={logoUrl}
                    alt="Logo commune"
                    className="h-16 w-16 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Remplacer
                    </button>
                    <button
                      onClick={removeLogo}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-6 hover:bg-slate-100 transition-colors">
                  {logoUploading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="text-xs text-slate-400">Upload en cours…</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-7 w-7 text-slate-400" />
                      <span className="text-sm font-medium text-slate-500">Cliquer pour uploader le logo</span>
                      <span className="text-xs text-slate-400">PNG, JPG, WebP, SVG — max 5 Mo</span>
                    </>
                  )}
                </label>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="sr-only"
                disabled={logoUploading}
              />
            </div>

            {/* Couleurs */}
            <form onSubmit={handleThemeSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600">Couleur principale</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setPrimaryColor(v);
                      }}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600">Couleur secondaire</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setSecondaryColor(v);
                      }}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              {/* Presets */}
              <div>
                <p className="mb-1.5 text-xs text-slate-400">Palettes prédéfinies</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setPrimaryColor(c.value)}
                      className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c.value,
                        borderColor: primaryColor === c.value ? "#94a3b8" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Aperçu */}
              <div className="rounded-xl overflow-hidden border border-slate-100">
                <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: primaryColor }}>
                  {logoUrl
                    ? <img src={logoUrl} alt="" className="h-6 w-6 rounded object-contain" />
                    : <div className="h-6 w-6 rounded bg-white/20" />
                  }
                  <span className="text-sm font-bold text-white">VigieCity — Aperçu</span>
                </div>
                <div className="flex gap-2 p-3" style={{ backgroundColor: primaryColor + "15" }}>
                  <div className="flex-1 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                    Bouton principal
                  </div>
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-xs font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Action
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={themeSaving}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {themeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />}
                {themeSaving ? "Sauvegarde…" : "Appliquer les couleurs"}
              </button>
            </form>
          </div>
        )}

        {/* ── Changer mot de passe ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Changer le mot de passe</h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-pwd" className="text-sm font-medium text-slate-700">Nouveau mot de passe</label>
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
                <button type="button" tabIndex={-1} onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPwd.length > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${
                      newPwd.length < 8 ? "w-1/4 bg-red-400" :
                      newPwd.length < 12 ? "w-2/4 bg-orange-400" : "w-full bg-emerald-500"
                    }`} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {newPwd.length < 8 ? "Trop court" : newPwd.length < 12 ? "Acceptable" : "Mot de passe fort"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-pwd" className="text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirm-pwd"
                  type={showPwd ? "text" : "password"}
                  required
                  value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none ring-emerald-500 transition focus:bg-white focus:ring-2 ${
                    confirmPwd && confirmPwd !== newPwd ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-emerald-500"
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
