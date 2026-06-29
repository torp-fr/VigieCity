import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, MapPin, CheckCircle2, Loader2, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Choisir votre commune — VigieCity" }],
  }),
  component: OnboardingPage,
});

type Collectivity = {
  id: string;
  name: string;
  postal_code: string | null;
  insee_code: string | null;
  status: string;
  population: number | null;
};

function OnboardingPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Collectivity | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth" });
      else setUserId(data.user.id);
    });
  }, [navigate]);

  const { data: communes, isLoading: searching } = useQuery({
    queryKey: ["communes", "search", search],
    enabled: search.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_communes", {
        q: search.trim(),
      });
      if (error) throw error;
      return data as Collectivity[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!userId || !selected) throw new Error("Commune requise.");
      const { error } = await supabase
        .from("profiles")
        .update({ collectivity_id: selected.id })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Commune « ${selected?.name} » enregistrée.`);
      navigate({ to: "/accueil" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isDormant = selected?.status === "dormant";

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Votre commune</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choisissez votre commune pour recevoir les alertes et signalements de votre secteur.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
            }}
            placeholder="Nom de commune ou code postal…"
            className="w-full rounded-xl border border-input bg-card py-3 pl-9 pr-4 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>

        {/* Loader */}
        {searching && search.length >= 2 && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Results */}
        {communes && communes.length > 0 && !selected && (
          <ul className="space-y-1 rounded-2xl border border-border bg-card p-1 shadow-card">
            {communes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-muted"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.postal_code && <span>{c.postal_code}</span>}
                      {c.population && (
                        <span className="ml-1">
                          · {c.population.toLocaleString("fr-FR")} hab.
                        </span>
                      )}
                    </p>
                  </div>
                  {c.status === "active" ? (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      <Sparkles className="h-2.5 w-2.5" />
                      Sur VigieCity
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      En attente
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {communes?.length === 0 && search.length >= 2 && !searching && (
          <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Aucune commune trouvée. Essayez un autre terme.
          </p>
        )}

        {/* Selected */}
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-success bg-success/10 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.postal_code}
                  {selected.population && (
                    <span className="ml-1">
                      · {selected.population.toLocaleString("fr-FR")} hab.
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="shrink-0 text-xs text-muted-foreground underline"
              >
                Changer
              </button>
            </div>

            {/* Message commune dormante */}
            {isDormant && (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  <span className="font-semibold">{selected.name}</span> n'est pas encore
                  inscrite sur VigieCity. Votre compte sera rattaché automatiquement dès
                  que votre commune rejoindra le réseau.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Confirm */}
        <button
          type="button"
          disabled={!selected || save.isPending}
          onClick={() => save.mutate()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary p-4 text-base font-semibold text-primary-foreground shadow-card disabled:opacity-50"
        >
          {save.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          Confirmer ma commune
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Vous pourrez modifier votre commune dans votre profil à tout moment.
        </p>
      </div>
    </div>
  );
}
