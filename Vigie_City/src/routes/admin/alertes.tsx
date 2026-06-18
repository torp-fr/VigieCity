import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Megaphone, Send, Loader2, Lock, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/alertes")({
  head: () => ({ meta: [{ title: "Créer une alerte — VigieCity" }] }),
  component: AlertesAdmin,
});

const alertSchema = z.object({
  title: z.string().trim().min(3, "Titre trop court").max(100),
  message: z.string().trim().min(10, "Message trop court").max(2000),
  severity: z.enum(["info", "vigilance", "urgent"]),
  area_label: z.string().trim().max(100).optional(),
  expires_at: z.string().optional(),
});

const SEVERITY_OPTIONS = [
  { value: "info", label: "Information", cls: "border-border bg-card" },
  { value: "vigilance", label: "Vigilance", cls: "border-warning/40 bg-warning/10 text-warning-foreground" },
  { value: "urgent", label: "Urgent", cls: "border-sos/40 bg-sos/10 text-sos" },
] as const;

function AlertesAdmin() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [isMod, setIsMod] = useState<boolean | null>(null);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"info" | "vigilance" | "urgent">("vigilance");
  const [areaLabel, setAreaLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("collectivity_id").eq("id", uid).single(),
        supabase.from("user_roles").select("role").eq("user_id", uid).in("role", ["moderator", "admin"]),
      ]);
      setCollectivityId(profile?.collectivity_id ?? null);
      setIsMod((roles?.length ?? 0) > 0);
    });
  }, []);

  const publish = useMutation({
    mutationFn: async () => {
      const parsed = alertSchema.parse({ title, message, severity, area_label: areaLabel || undefined, expires_at: expiresAt || undefined });
      if (!userId || !collectivityId) throw new Error("Commune requise.");
      const { error } = await supabase.from("alerts").insert({
        collectivity_id: collectivityId,
        created_by: userId,
        title: parsed.title,
        message: parsed.message,
        severity: parsed.severity,
        area_label: parsed.area_label ?? null,
        expires_at: parsed.expires_at ? new Date(parsed.expires_at).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alerte publiée et diffusée à votre commune.");
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isMod === false) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Accès réservé</h1>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); publish.mutate(); }}
      className="space-y-6 px-4 pt-5 pb-8"
    >
      <header className="flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Créer une alerte</h1>
      </header>

      {/* Sévérité */}
      <section>
        <Label>Niveau</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSeverity(s.value)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                severity === s.value ? s.cls + " ring-2 ring-offset-1" : "border-border bg-card text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Titre */}
      <section>
        <Label>Titre</Label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Exercice incendie ce soir"
          maxLength={100}
          className="mt-2 w-full rounded-xl border border-input bg-card p-3 text-sm outline-none ring-ring focus:ring-2"
        />
      </section>

      {/* Message */}
      <section>
        <Label>Message</Label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Détails de l'alerte pour les habitants de votre commune…"
          rows={5}
          maxLength={2000}
          className="mt-2 w-full resize-none rounded-xl border border-input bg-card p-3 text-sm outline-none ring-ring focus:ring-2"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/2000</p>
      </section>

      {/* Zone */}
      <section>
        <Label>Zone concernée (optionnel)</Label>
        <input
          value={areaLabel}
          onChange={(e) => setAreaLabel(e.target.value)}
          placeholder="Ex : Quartier centre-ville, Rue de la Paix…"
          maxLength={100}
          className="mt-2 w-full rounded-xl border border-input bg-card p-3 text-sm outline-none ring-ring focus:ring-2"
        />
      </section>

      {/* Expiration */}
      <section>
        <Label>Date d'expiration (optionnel)</Label>
        <div className="relative mt-2">
          <CalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-xl border border-input bg-card py-3 pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Sans date d'expiration, l'alerte reste active indéfiniment.
        </p>
      </section>

      <button
        type="submit"
        disabled={publish.isPending || title.length < 3 || message.length < 10}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary p-4 text-base font-semibold text-primary-foreground shadow-card disabled:opacity-50"
      >
        {publish.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        Publier l'alerte
      </button>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
}
