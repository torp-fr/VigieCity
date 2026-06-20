import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Mail,
  Crown,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/epci")({
  head: () => ({ meta: [{ title: "Intercommunalité — VigieCity" }] }),
  component: EpciAdminPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Intercommunality = {
  id: string;
  name: string;
  type: string;
  max_communes: number;
  department: string | null;
  region: string | null;
};

type Commune = {
  id: string;
  name: string;
  is_active: boolean;
  epci_id: string | null;
  admins: { user_id: string; role: string; email?: string }[];
};

type UserRole = {
  id?: string;
  user_id: string;
  role: string;
  collectivity_id: string | null;
  epci_id: string | null;
};

// ─── Page principale ──────────────────────────────────────────────────────────

function EpciAdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Vérifier le rôle epci_admin
  const { data: myRole } = useQuery<UserRole | null>({
    queryKey: ["epci-role", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role, collectivity_id, epci_id")
        .eq("user_id", userId!)
        .eq("role", "epci_admin")
        .single();
      return data as UserRole | null;
    },
  });

  const isEpciAdmin = !!myRole?.epci_id;
  const epciId = myRole?.epci_id ?? null;

  // Données de l'interco
  const { data: interco } = useQuery<Intercommunality | null>({
    queryKey: ["interco", epciId],
    enabled: !!epciId,
    queryFn: async () => {
      const { data } = await supabase
        .from("intercommunalities")
        .select("id, name, type, max_communes, department, region")
        .eq("id", epciId!)
        .single();
      return data as Intercommunality | null;
    },
  });

  // Communes de l'interco
  const { data: communes, isLoading: communesLoading } = useQuery<Commune[]>({
    queryKey: ["epci-communes", epciId],
    enabled: !!epciId,
    queryFn: async () => {
      const { data: cols, error } = await supabase
        .from("collectivities")
        .select("id, name, is_active, epci_id")
        .eq("epci_id", epciId!)
        .order("name");
      if (error) throw error;

      // Pour chaque commune, récupérer les admins
      const enriched = await Promise.all(
        (cols ?? []).map(async (c) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("user_id, role, collectivity_id")
            .eq("collectivity_id", c.id)
            .in("role", ["admin", "moderator"]);
          return { ...c, admins: roles ?? [] } as Commune;
        }),
      );
      return enriched;
    },
  });

  // Activer/désactiver une commune
  const toggleMutation = useMutation({
    mutationFn: async ({
      communeId,
      active,
    }: {
      communeId: string;
      active: boolean;
    }) => {
      // Vérifier le quota avant activation
      if (active && interco) {
        const activeCount =
          communes?.filter((c) => c.is_active && c.id !== communeId).length ??
          0;
        if (activeCount >= interco.max_communes) {
          throw new Error(
            `Quota atteint : votre contrat inclut ${interco.max_communes} commune(s) maximum.`,
          );
        }
      }
      const { error } = await supabase
        .from("collectivities")
        .update({ is_active: active })
        .eq("id", communeId);
      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      qc.invalidateQueries({ queryKey: ["epci-communes"] });
      toast.success(active ? "Commune activée" : "Commune désactivée");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Supprimer un rôle admin d'une commune
  const removeAdminMutation = useMutation({
    mutationFn: async ({
      userId: uid,
      communeId,
    }: {
      userId: string;
      communeId: string;
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .eq("collectivity_id", communeId)
        .in("role", ["admin", "moderator"]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["epci-communes"] });
      toast.success("Accès supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  // ── Accès refusé ─────────────────────────────────────────────────────────────
  if (authed === false || (authed && myRole === null && userId)) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Accès réservé EPCI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce tableau de bord est réservé aux administrateurs d'intercommunalité.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (authed === null || myRole === undefined) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = communes?.filter((c) => c.is_active).length ?? 0;
  const maxCommunes = interco?.max_communes ?? 0;
  const quotaFull = activeCount >= maxCommunes;

  return (
    <div className="space-y-6 px-4 pt-5 pb-8">
      {/* Header interco */}
      <header className="rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-5 text-white shadow-card">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-7 w-7 shrink-0 opacity-80" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">
              Intercommunalité
            </p>
            <h1 className="mt-0.5 text-xl font-bold leading-tight">
              {interco?.name ?? "Chargement…"}
            </h1>
            {interco && (
              <p className="mt-1 flex items-center gap-1 text-xs opacity-75">
                <MapPin className="h-3 w-3" />
                {interco.department} · {interco.region}
              </p>
            )}
          </div>
        </div>

        {/* Quota */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs opacity-80">
            <span>Communes actives</span>
            <span className="font-semibold">
              {activeCount} / {maxCommunes}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-white/20">
            <div
              className="h-2 rounded-full bg-white transition-all"
              style={{
                width: `${Math.min(100, (activeCount / Math.max(1, maxCommunes)) * 100)}%`,
              }}
            />
          </div>
          {quotaFull && (
            <p className="mt-1 flex items-center gap-1 text-xs text-yellow-300">
              <AlertCircle className="h-3 w-3" />
              Quota contractuel atteint
            </p>
          )}
        </div>
      </header>

      {/* Liste des communes */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-4 w-4" /> Communes du groupement
        </h2>

        {communesLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!communesLoading && (!communes || communes.length === 0) && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucune commune rattachée à votre intercommunalité.
            <br />
            Contactez VigieCity pour rattacher vos communes.
          </div>
        )}

        <ul className="space-y-3">
          {communes?.map((commune) => (
            <CommuneCard
              key={commune.id}
              commune={commune}
              quotaFull={quotaFull}
              onToggle={(active) =>
                toggleMutation.mutate({ communeId: commune.id, active })
              }
              onRemoveAdmin={(uid) =>
                removeAdminMutation.mutate({ userId: uid, communeId: commune.id })
              }
            />
          ))}
        </ul>
      </section>

      {/* Info contrat */}
      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">À propos de votre contrat</p>
        <p className="mt-1">
          Votre contrat inclut jusqu'à{" "}
          <strong>{maxCommunes} commune(s)</strong> actives simultanément. Pour
          modifier le quota ou rattacher de nouvelles communes, contactez{" "}
          <a
            href="mailto:contact@vigiecity.fr"
            className="underline hover:text-foreground"
          >
            contact@vigiecity.fr
          </a>
          .
        </p>
      </div>
    </div>
  );
}

// ─── CommuneCard ──────────────────────────────────────────────────────────────

function CommuneCard({
  commune,
  quotaFull,
  onToggle,
  onRemoveAdmin,
}: {
  commune: Commune;
  quotaFull: boolean;
  onToggle: (active: boolean) => void;
  onRemoveAdmin: (userId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header commune */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {/* Status badge */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            commune.is_active
              ? "bg-emerald-100 text-emerald-600"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {commune.is_active ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight truncate">{commune.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {commune.admins.length} admin{commune.admins.length > 1 ? "s" : ""}{" "}
            · {commune.is_active ? "Active" : "Inactive"}
          </p>
        </div>

        <ChevronRight
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {/* Panneau expandable */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {/* Toggle activation */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {commune.is_active ? "Commune active" : "Commune inactive"}
            </span>
            <button
              type="button"
              onClick={() => onToggle(!commune.is_active)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                commune.is_active
                  ? "bg-primary"
                  : quotaFull
                    ? "bg-muted cursor-not-allowed"
                    : "bg-muted"
              }`}
              disabled={!commune.is_active && quotaFull}
              title={
                !commune.is_active && quotaFull
                  ? "Quota contractuel atteint"
                  : undefined
              }
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                  commune.is_active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Admins */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Administrateurs
            </p>

            {commune.admins.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Aucun administrateur assigné à cette commune.
              </p>
            ) : (
              <ul className="space-y-2">
                {commune.admins.map((admin) => (
                  <li
                    key={admin.user_id}
                    className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2"
                  >
                    <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                      {admin.user_id.slice(0, 8)}…
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">
                      {admin.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveAdmin(admin.user_id)}
                      className="ml-1 rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Révoquer l'accès"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Inviter un admin → via email (worflow simplifié) */}
            <a
              href={`mailto:contact@vigiecity.fr?subject=Invitation admin - ${encodeURIComponent(commune.name)}&body=Bonjour,%0A%0AJe souhaite inviter un administrateur pour la commune de ${encodeURIComponent(commune.name)}.%0A%0AEmail : [EMAIL]%0ARôle : admin%0A%0AMerci`}
              className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Inviter un administrateur
              <Mail className="ml-auto h-3.5 w-3.5 opacity-50" />
            </a>
          </div>
        </div>
      )}
    </li>
  );
}
