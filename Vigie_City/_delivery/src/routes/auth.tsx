import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "VigieCity — Connexion" }],
  }),
  component: AuthPage,
});

type Mode = "splash" | "login" | "register" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("splash");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Si déjà connecté → accueil directement
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/accueil" });
    });
  }, [navigate]);

  // Splash screen pendant 1.8s puis affiche login
  useEffect(() => {
    if (mode !== "splash") return;
    const t = setTimeout(() => setMode("login"), 1800);
    return () => clearTimeout(t);
  }, [mode]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(
        error.message.includes("Invalid login")
          ? "Email ou mot de passe incorrect."
          : error.message
      );
      return;
    }
    // /auth est dans SKIP_ONBOARDING_ROUTES → __root.tsx ne redirige pas
    // Navigate explicite ici — une seule navigation, pas de race condition
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user.id)
        .single();
      navigate({ to: profile?.collectivity_id ? "/accueil" : "/onboarding" });
    }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
      setMode("login");
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Entrez votre email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://vigiecity.fr/reset-password",
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Email de réinitialisation envoyé !");
      setMode("login");
    }
  }

  // ── Splash ───────────────────────────────────────────────────────────────────

  if (mode === "splash") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#091844] select-none">
        {/* Logo */}
        <div className="animate-[fadeIn_0.6s_ease-out]">
          <img
            src="/icons/icon-512.png"
            alt="VigieCity"
            className="h-28 w-28 rounded-3xl shadow-2xl"
          />
        </div>

        {/* Nom + baseline */}
        <div className="mt-6 text-center animate-[fadeIn_0.9s_ease-out]">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            VigieCity
          </h1>
          <p className="mt-2 text-sm text-blue-300 font-medium">
            La sécurité de proximité pour tous
          </p>
        </div>

        {/* Points de chargement */}
        <div className="mt-16 flex gap-2 animate-[fadeIn_1.2s_ease-out]">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  // ── Login / Register / Forgot ────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-[#091844]">
      {/* Header logo */}
      <div className="flex flex-col items-center pt-14 pb-8">
        <img
          src="/icons/icon-512.png"
          alt="VigieCity"
          className="h-16 w-16 rounded-2xl shadow-lg"
        />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
          VigieCity
        </h1>
        <p className="mt-1 text-xs text-blue-300">
          {mode === "register"
            ? "Créez votre compte citoyen"
            : mode === "forgot"
            ? "Réinitialisez votre mot de passe"
            : "Connectez-vous à votre commune"}
        </p>
      </div>

      {/* Card formulaire */}
      <div className="flex-1 rounded-t-3xl bg-background px-6 pt-8 pb-10">
        {/* Onglets login / register */}
        {mode !== "forgot" && (
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Créer un compte
            </button>
          </div>
        )}

        <form
          onSubmit={
            mode === "login"
              ? handleLogin
              : mode === "register"
              ? handleRegister
              : handleForgot
          }
          className="space-y-4"
        >
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              className="w-full rounded-xl border border-input bg-muted/40 px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>

          {/* Mot de passe (pas sur forgot) */}
          {mode !== "forgot" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-input bg-muted/40 px-4 py-3 pr-12 text-sm outline-none ring-ring focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirmation (register only) */}
          {mode === "register" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-input bg-muted/40 px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
          )}

          {/* Bouton principal */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg disabled:opacity-60 mt-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : mode === "login" ? (
              <>
                <ShieldCheck className="h-5 w-5" />
                Me connecter
              </>
            ) : mode === "register" ? (
              <>
                <ArrowRight className="h-5 w-5" />
                Créer mon compte
              </>
            ) : (
              <>
                <ArrowRight className="h-5 w-5" />
                Envoyer le lien
              </>
            )}
          </button>
        </form>

        {/* Liens secondaires */}
        <div className="mt-5 text-center space-y-3">
          {mode === "login" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Mot de passe oublié ?
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              ← Retour à la connexion
            </button>
          )}
          {mode === "register" && (
            <p className="text-xs text-muted-foreground">
              En créant un compte, vous acceptez nos{" "}
              <a href="/cgu" className="underline">
                CGU
              </a>{" "}
              et{" "}
              <a href="/confidentialite" className="underline">
                politique de confidentialité
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
