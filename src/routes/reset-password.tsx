import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase émet PASSWORD_RECOVERY après avoir traité le token dans le hash d'URL.
  // __root.tsx navigue ici dès cet event ; on l'écoute aussi localement comme fallback.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Session déjà présente (ex: l'utilisateur a rechargé la page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Mot de passe mis à jour !");
      // Déconnexion puis redirection vers la connexion
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/auth" }), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Chargement du token ── */
  if (!ready) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center gap-4 px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Vérification du lien…</p>
      </div>
    );
  }

  /* ── Succès ── */
  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Lock className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Mot de passe mis à jour !</h1>
        <p className="text-sm text-muted-foreground">Redirection vers la connexion…</p>
      </div>
    );
  }

  /* ── Formulaire ── */
  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col px-6 pt-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Nouveau mot de passe</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Choisissez un mot de passe sécurisé d'au moins 8 caractères.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Nouveau mot de passe */}
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              aria-label={showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* Indicateur de force */}
          {password.length > 0 && (
            <p
              className={`text-xs ${
                password.length >= 12
                  ? "text-emerald-600"
                  : password.length >= 8
                    ? "text-amber-600"
                    : "text-red-600"
              }`}
            >
              {password.length >= 12
                ? "Mot de passe fort"
                : password.length >= 8
                  ? "Mot de passe acceptable"
                  : "Trop court (min. 8 caractères)"}
            </p>
          )}
        </div>

        {/* Confirmation */}
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmer le mot de passe</Label>
          <Input
            id="confirm"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
          {confirm.length > 0 && password !== confirm && (
            <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !password || !confirm || password !== confirm || password.length < 8}
        >
          {loading ? "Mise à jour…" : "Confirmer le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
