import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Mail,
  Crown,
  MapPin,
  AlertCircle,
  BarChart3,
  CreditCard,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";

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
  admins: { user_id: string; role: string }[];
};

type UserRole = {
  user_id: string;
  role: string;
  collectivity_id: string | null;
  epci_id: string | null;
};

type PricingTier = {
  id: string;
  label: string;
  nb_communes_min: number;
  nb_communes_max: number | null;
  price_monthly: number;
  notes: string | null;
  display_order: number;
};

type TabId = "communes" | "stats" | "facturation";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "communes", label: "Communes", icon: Users },
  { id: "stats", label: "Statistiques", icon: BarChart3 },
  { id: "facturation", label: "Facturation", icon: CreditCard },
];

// ─── Page principale ──────────────────────────────────────────────────────────

function EpciAdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("communes");
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
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
  const { data: communes = [], isLoading: communesLoading } = useQuery<Commune[]>({
    queryKey: ["epci-communes", epciId],
    enabled: !!epciId,
    queryFn: async () => {
      const { data: cols, error } = await supabase
        .from("collectivities")
        .select("id, name, is_active, epci_id")
        .eq("epci_id", epciId!)
        .order("name");
      if (error) throw error;

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

  // Grille tarifaire EPCI
  const { data: pricingTiers = [] } = useQuery<PricingTier[]>({
    queryKey: ["intercommunal-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intercommunal_pricing")
        .select("id, label, nb_communes_min, nb_communes_max, price_monthly, notes, display_order")
        .order("display_order");
      if (error) throw error;
      return data as PricingTier[];
    },
  });

  // Activer / désactiver une commune
  const toggleMutation = useMutation({
    mutationFn: async ({ communeId, active }: { communeId: string; active: boolean }) => {
      if (active && interco) {
        const activeCount = communes.filter((c) => c.is_active && c.id !== communeId).length;
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

  // Supprimer un rôle admin
  const removeAdminMutation = useMutation({
    mutationFn: async ({ userId: uid, communeId }: { userId: string; communeId: string }) => {
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

  // ── Gates ────────────────────────────────────────────────────────────────────

  const activeCount = communes.filter((c) => c.is_active).length;
  const maxCommunes = interco?.max_communes ?? 0;
  const quotaFull = maxCommunes > 0 && activeCount >= maxCommunes;

  return (
    <AdminShell activePath="/admin/epci">
    <div className="space-y-5 px-4 pt-5 pb-10">
      {/* ── Header interco ────────────────────────────────────────────────── */}
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

        {/* Quota bar */}
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
                width: `${Math.min(100, maxCommunes > 0 ? (activeCount / maxCommunes) * 100 : 0)}%`,
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

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      {activeTab === "communes" && (
        <CommunesTab
          communes={communes}
          loading={communesLoading}
          quotaFull={quotaFull}
          onToggle={(communeId, active) => toggleMutation.mutate({ communeId, active })}
          onRemoveAdmin={(uid, communeId) => removeAdminMutation.mutate({ userId: uid, communeId })}
        />
      )}

      {activeTab === "stats" && (
        <StatsTab communes={communes} activeCount={activeCount} maxCommunes={maxCommunes} />
      )}

      {activeTab === "facturation" && (
        <FacturationTab
          pricingTiers={pricingTiers}
          activeCount={activeCount}
          intercoName={interco?.name}
        />
      )}
    </div>
    </AdminShell>
  );
}

// ─── Tab Communes ─────────────────────────────────────────────────────────────

function CommunesTab({
  communes,
  loading,
  quotaFull,
  onToggle,
  onRemoveAdmin,
}: {
  communes: Commune[];
  loading: boolean;
  quotaFull: boolean;
  onToggle: (communeId: string, active: boolean) => void;
  onRemoveAdmin: (userId: string, communeId: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (communes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Aucune commune rattachée à votre intercommunalité.
        <br />
        Contactez VigieCity pour rattacher vos communes.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {communes.map((commune) => (
        <CommuneCard
          key={commune.id}
          commune={commune}
          quotaFull={quotaFull}
          onToggle={(active) => onToggle(commune.id, active)}
          onRemoveAdmin={(uid) => onRemoveAdmin(uid, commune.id)}
        />
      ))}
    </ul>
  );
}

// ─── Tab Statistiques ─────────────────────────────────────────────────────────

function StatsTab({
  communes,
  activeCount,
  maxCommunes,
}: {
  communes: Commune[];
  activeCount: number;
  maxCommunes: number;
}) {
  const totalAdmins = communes.reduce((sum, c) => sum + c.admins.length, 0);
  const communesWithNoAdmin = communes.filter((c) => c.admins.length === 0);
  const activationPct = maxCommunes > 0 ? Math.round((activeCount / maxCommunes) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Communes actives"
          value={`${activeCount}/${maxCommunes}`}
          sub={`${activationPct}% du quota`}
          icon={CheckCircle2}
          color="primary"
        />
        <StatCard
          label="Administrateurs"
          value={totalAdmins}
          sub="rôles assignés"
          icon={Crown}
          color="default"
        />
        <StatCard
          label="Sans admin"
          value={communesWithNoAdmin.length}
          sub="communes à risque"
          icon={ShieldAlert}
          color={communesWithNoAdmin.length > 0 ? "destructive" : "muted"}
        />
        <StatCard
          label="Total communes"
          value={communes.length}
          sub="dans votre EPCI"
          icon={Users}
          color="muted"
        />
      </div>

      {/* Alerte communes sans admin */}
      {communesWithNoAdmin.length > 0 && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Communes sans administrateur
          </p>
          <ul className="mt-2 space-y-1">
            {communesWithNoAdmin.map((c) => (
              <li key={c.id} className="text-xs text-muted-foreground">
                · {c.name}
                {!c.is_active && (
                  <span className="ml-1 opacity-50">(inactive)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tableau santé par commune */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          État des communes
        </p>
        <ul className="space-y-2">
          {communes.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  c.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
                }`}
              />
              <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  c.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {c.is_active ? "Active" : "Inactive"}
              </span>
              <span
                className={`shrink-0 rounded-fu