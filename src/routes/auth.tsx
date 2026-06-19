import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — VigieCity" },
      { name: "description", content: "Connectez-vous à votre compte VigieCity." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ email: string | undefined } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUser(data.user ? { email: data.user.email } : null),
    );
  }, []);

  // Echanger le code PKCE après redirect Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error) { toast.error('Erreur connexion Google : ' + error.message); return; }
      if (data.session) {
        setUser({ email: data.session.user.email });
        window.history.replaceState({}, '', window.location.pathname);
        navigate({ to: '/' });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Compte créé. Vous êtes connecté·e.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
      }
      navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth' },
    });
    if (result.error) {
      toast.error(result.error.message ?? 'Connexion Google impossible');
      setLoading(false);
      return;
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    toast.success("Déconnecté·e.");
  }

  if (user) {
    return (
      <div className="space-y-4 px-4 pt-10 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-xl font-semibold">Vous êtes connecté·e</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <button
          onClick={handleSignOut}
          className="mx-auto inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium"
        >
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pt-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? "Se connecter" : "Créer un compte"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gratuit pour tous les habitants.
        </p>
      </header>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-medium disabled:opacity-50"
      >
        <GoogleIcon /> Continuer avec Google
      </button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        ou
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmail} className="space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-input bg-card p-3 text-sm outline-none ring-ring focus:ring-2"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="Mot de passe (8+ caractères)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-input bg-card p-3 text-sm outline-none ring-ring focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signin" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      <button
        onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin"
          ? "Pas encore de compte ? Créer un compte"
          : "Déjà un compte ? Se connecter"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de
        confidentialité (RGPD).
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h6.16c-.27 1.4-1.07 2.59-2.28 3.39v2.83h3.69C21.7 18.78 23 15.79 23 12.27z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.07 0 5.65-1.02 7.54-2.77l-3.69-2.83c-1.02.69-2.33 1.1-3.85 1.1-2.96 0-5.47-2-6.36-4.69H1.83v2.95C3.71 20.56 7.55 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.64 13.81c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08V6.7H1.83A11 11 0 0 0 1 11.73c0 1.79.43 3.48 1.18 4.94l3.46-2.86z"
      />
      <path
        fill="#EA4335"
        d="M12 4.96c1.67 0 3.16.57 4.34 1.69l3.25-3.25C17.65 1.58 15.07.5 12 .5 7.55.5 3.71 2.94 1.83 6.7l3.81 2.95C6.53 6.96 9.04 4.96 12 4.96z"
      />
    </svg>
  );
}
