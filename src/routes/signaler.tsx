import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Camera, MapPin, Send, Loader2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { REPORT_CATEGORIES, SEVERITY_OPTIONS, type ReportCategoryValue } from "@/lib/categories";

export const Route = createFileRoute("/signaler")({
  head: () => ({
    meta: [
      { title: "Signaler un évènement — VigieCity" },
      {
        name: "description",
        content:
          "Signaler un véhicule suspect, une dégradation ou tout autre évènement à votre commune.",
      },
      { property: "og:title", content: "Signaler un évènement — VigieCity" },
      {
        property: "og:description",
        content: "Envoyez un signalement géolocalisé avec photo en moins d'une minute.",
      },
    ],
  }),
  component: ReportPage,
});

const reportSchema = z.object({
  category: z.enum(REPORT_CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  severity: z.enum(["info", "vigilance", "urgent"]),
  description: z.string().trim().min(10, "Décrivez en au moins 10 caractères.").max(1000),
  is_anonymous: z.boolean(),
  approximate_address: z.string().trim().max(200).optional(),
});

function ReportPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [category, setCategory] = useState<ReportCategoryValue>("vehicule_suspect");
  const [severity, setSeverity] = useState<"info" | "vigilance" | "urgent">("vigilance");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  function getLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Géolocalisation indisponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Position enregistrée.");
      },
      () => toast.error("Impossible d'obtenir votre position."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const submit = useMutation({
    mutationFn: async () => {
      const parsed = reportSchema.parse({
        category,
        severity,
        description,
        is_anonymous: isAnonymous,
        approximate_address: address || undefined,
      });
      if (!userId) throw new Error("Vous devez être connecté.");

      // Upload media
      const mediaPaths: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("report-media")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        mediaPaths.push(path);
      }

      const { error } = await supabase.from("reports").insert({
        user_id: userId,
        category: parsed.category as ReportCategoryValue,
        severity: parsed.severity,
        description: parsed.description,
        approximate_address: parsed.approximate_address ?? null,
        is_anonymous: parsed.is_anonymous,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        media_paths: mediaPaths,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signalement envoyé. Merci pour votre vigilance.");
      qc.invalidateQueries({ queryKey: ["reports"] });
      navigate({ to: "/fil" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authed === false) {
    return (
      <div className="px-4 pt-10 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Connexion requise</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Créez un compte gratuit pour envoyer un signalement à votre commune.
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Me connecter
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
      className="space-y-6 px-4 pt-5"
    >
      <header>
        <h1 className="text-2xl font-bold">Signaler un évènement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les agents de votre commune verront ce signalement.
        </p>
      </header>

      {/* Catégorie */}
      <section>
        <Label>Type d'évènement</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {REPORT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center text-xs transition ${
                category === c.value
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {c.icon}
              </span>
              <span className="leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Sévérité */}
      <section>
        <Label>Niveau d'urgence</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSeverity(s.value)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                severity === s.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Description */}
      <section>
        <Label>Description</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez ce que vous avez vu (lieu, heure, personnes, véhicule…)."
          rows={5}
          maxLength={1000}
          className="mt-2 w-full resize-none rounded-xl border border-input bg-card p-3 text-sm outline-none ring-ring focus:ring-2"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/1000</p>
      </section>

      {/* Géoloc + adresse */}
      <section>
        <Label>Localisation</Label>
        <button
          type="button"
          onClick={getLocation}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-medium"
        >
          <MapPin className="h-4 w-4" />
          {coords
            ? `Position : ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
            : "Utiliser ma position GPS"}
        </button>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Adresse approximative (ex : angle rue X / rue Y)"
          className="mt-2 w-full rounded-xl border border-input bg-card p-3 text-sm outline-none ring-ring focus:ring-2"
        />
      </section>

      {/* Médias */}
      <section>
        <Label>Photos / vidéos (preuves)</Label>
        <label className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 text-sm font-medium text-muted-foreground hover:bg-muted">
          <Camera className="h-4 w-4" />
          {files.length > 0 ? `${files.length} fichier(s) sélectionné(s)` : "Ajouter des photos"}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))}
          />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Pour respecter la vie privée : évitez les visages et plaques d'immatriculation
          identifiables.
        </p>
      </section>

      {/* Anonyme */}
      <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-[oklch(0.36_0.16_258)]"
        />
        <div className="text-sm">
          <p className="font-medium">Envoi anonyme dans le fil de quartier</p>
          <p className="text-xs text-muted-foreground">
            Votre identité reste connue de la mairie pour les besoins légaux.
          </p>
        </div>
      </label>

      <button
        type="submit"
        disabled={submit.isPending || description.length < 10}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary p-4 text-base font-semibold text-primary-foreground shadow-card transition disabled:opacity-50"
      >
        {submit.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
        Envoyer le signalement
      </button>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}
