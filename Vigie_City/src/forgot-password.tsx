import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col px-6 pt-8">
      <Link
        to="/auth"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la connexion
      </Link>

      {sent ? (
        /* ── État : email envoyé ── */
        <div className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Mail className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Email envoyé !</h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            Un lien de réinitialisation a été envoyé à{" "}
            <span className="font-medium text-foreground">{email}</span>.{" "}
            Vérifiez vos spams si vous ne le trouvez pas.
          </p>
          <Link
            to="/auth"
            className="mt-4 text-sm font-medium text-primary underline underline-offset-4"
          >
            Retour à la connexion
          </Link>
        </div>
      ) : (
        /* ── Formulaire ── */
        <>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre
            mot de passe.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="votre@email.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email.trim()}
            >
              {loading ? "Envoi en cours…" : "Envoyer le lien"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
