import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingDown, Activity, AlertTriangle, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/retention")({
  component: RetentionPlatform,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type CommuneStats = {
  id: string;
  name: string;
  insee_code: string | null;
  userCount: number;
  reports30d: number;
  pubs30d: number;
  lastActivityAt: string | null;   // ISO date de la dernière activité
  engagementScore: number;         // calculé côté JS
  churnRisk: boolean;              // pas d'activité depuis >30j
};

// ─── Calcul du score d'engagement (JS) ───────────────────────────────────────
// Score = reports30d×12 + pubs30d×20 + users×4, plafonné à 100
function computeScore(reports: number, pubs: number, users: number): number {
  return Math.min(100, reports * 12 + pubs * 20 + users * 4);
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 35) return "text-yellow-600 dark:text-yellow-400";
  return "text-sos";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 35) return "bg-yellow-400";
  return "bg-sos";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Actif";
  if (score >= 35) return "Modéré";
  return "Risque";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Fetch principal ──────────────────────────────────────────────────────────
async function fetchRetention(): Promise<CommuneStats[]> {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [colRes, profRes, repRes, pubRes] = await Promise.all([
    supabase.from("collectivities").select("id, name, insee_code"),
    supabase.from("profiles").select("collectivity_id"),
    supabase
      .from("reports")
      .select("collectivity_id, created_at")
      .gte("created_at", since30),
    supabase
      .from("publications")
      .select("collectivity_id, created_at")
      .gte("created_at", since30),
  ]);

  if (colRes.error)  throw colRes.error;
  if (profRes.error) throw profRes.error;
  if (repRes.error)  throw repRes.error;
  if (pubRes.error)  throw pubRes.error;

  const collectivities = colRes.data ?? [];
  const profiles       = profRes.data ?? [];
  const reports        = repRes.data ?? [];
  const pubs           = pubRes.data ?? [];

  // Requête séparée pour la dernière activité toutes périodes confondues
  // BUG-008: suppression des requêtes sans pagination sur toute la table
  // La dernière activité est dérivée des données déjà chargées (30j),
  // ce qui est cohérent avec le critère de churn (>30j sans activité).

  // Construction des stats par commune
  return collectivities.map((col) => {
    const users     = profiles.filter((p) => p.collectivity_id === col.id).length;
    const reports30 = reports.filter((r) => r.collectivity_id === col.id).length;
    const pubs30    = pubs.filter((p) => p.collectivity_id === col.id).length;

    // Dernière activité dans la fenêtre 30j (cohérent avec le critère churn)
    const lastRep = reports
      .filter((r) => r.collectivity_id === col.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at ?? null;
    const lastPub = pubs
      .filter((p) => p.collectivity_id === col.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at ?? null;
    const lastActivityAt = [lastRep, lastPub]
      .filter(Boolean)
      .sort((a, b) => (b! > a! ? 1 : -1))[0] ?? null;

    // Risque de churn : aucune activité depuis 30j (ou jamais)
    const daysSinceActivity = lastActivityAt
      ? (Date.now() - new Date(lastActivityAt).getTime()) / (86400 * 1000)
      : Infinity;
    const churnRisk = daysSinceActivity > 30;

    return {
      id:              col.id,
      name:            col.name,
      insee_code:      col.insee_code,
      userCount:       users,
      reports30d:      reports30,
      pubs30d:         pubs30,
      lastActivityAt,
      engagementScore: computeScore(reports30, pubs30, users),
      churnRisk,
    };
  });
}

// ─── Composant ────────────────────────────────────────────────────────────────
function RetentionPlatform() {
  return (
    <PlatformShell activePath="/platform/retention">
      <RetentionPlatformContent />
    </PlatformShell>
  );
}


function RetentionPlatformContent() {
  const [search,  setSearch]  = useState("");
  const [sortKey, setSortKey] = useState<keyof CommuneStats>("engagementScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [filter,  setFilter]  = useState<"all" | "churn" | "active">("all");

  const { data: stats = [], isLoading, error } = useQuery({
    queryKey: ["retention-analytics"],
    queryFn:  fetchRetention,
    staleTime: 5 * 60 * 1000,
  });

  // ── Métriques globales ─────────────────────────────────────────────────────
  const totalCommunes  = stats.length;
  const activeCommunes = stats.filter((s) => !s.churnRisk).length;
  const churnCommunes  = stats.filter((s) => s.churnRisk).length;
  const avgScore       = totalCommunes
    ? Math.round(stats.reduce((a, s) => a + s.engagementScore, 0) / totalCommunes)
    : 0;

  // ── Filtrage + tri ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...stats];

    // Filtre rapide
    if (filter === "churn")  list = list.filter((s) => s.churnRisk);
    if (filter === "active") list = list.filter((s) => !s.churnRisk);

    // Recherche
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.insee_code ?? "").toLowerCase().includes(q),
      );
    }

    // Tri
    list.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [stats, filter, search, sortKey, sortAsc]);

  const toggleSort = (key: keyof CommuneStats) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortIcon = (key: keyof CommuneStats) =>
    sortKey !== key ? "↕" : sortAsc ? "↑" : "↓";

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="space-y-5">
      {/* En-tête */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Rétention & Engagement</h1>
            <p className="text-xs text-muted-foreground">
              Activité des communes sur 30 jours
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Total communes
          </div>
          <div className="mt-1 text-3xl font-extrabold">{totalCommunes}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            Score moyen
          </div>
          <div className={`mt-1 text-3xl font-extrabold ${scoreColor(avgScore)}`}>
            {avgScore}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <TrendingDown className="h-3.5 w-3.5 rotate-180" />
            Actives
          </div>
          <div className="mt-1 text-3xl font-extrabold text-green-600">
            {activeCommunes}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-sos">
            <AlertTriangle className="h-3.5 w-3.5" />
            Risque churn
          </div>
          <div className="mt-1 text-3xl font-extrabold text-sos">
            {churnCommunes}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "active", "churn"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {f === "all" ? "Toutes" : f === "active" ? "✅ Actives" : "⚠️ Churn"}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Rechercher une commune…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tableau */}
      {isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </ul>
      ) : error ? (
        <div className="rounded-2xl border border-sos/20 bg-sos/5 p-4 text-sm text-sos">
          Erreur de chargement : {(error as Error).message}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Aucune commune trouvée.
        </div>
      ) : (
        <>
          {/* En-tête du tableau */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
            <button className="text-left" onClick={() => toggleSort("name")}>
              Commune {sortIcon("name")}
            </button>
            <button onClick={() => toggleSort("userCount")}>
              Utilisateurs {sortIcon("userCount")}
            </button>
            <button onClick={() => toggleSort("reports30d")}>
              Signalements {sortIcon("reports30d")}
            </button>
            <button onClick={() => toggleSort("pubs30d")}>
              Publications {sortIcon("pubs30d")}
            </button>
            <button onClick={() => toggleSort("engagementScore")}>
              Score {sortIcon("engagementScore")}
            </button>
          </div>

          <ul className="space-y-2">
            {displayed.map((s) => (
              <li
                key={s.id}
                className={[
                  "rounded-2xl border bg-card px-4 py-3 shadow-sm",
                  s.churnRisk ? "border-sos/30" : "border-border",
                ].join(" ")}
              >
                {/* Ligne principale */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3">
                  {/* Nom */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {s.churnRisk && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-sos" />
                      )}
                      <span className="truncate font-semibold text-sm">{s.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {s.insee_code ?? "—"} · Dernière activité : {fmtDate(s.lastActivityAt)}
                    </span>
                  </div>

                  {/* Utilisateurs */}
                  <div className="text-center text-sm font-mono font-semibold">
                    {s.userCount}
                  </div>

                  {/* Signalements 30d */}
                  <div className="text-center text-sm font-mono font-semibold">
                    {s.reports30d}
                  </div>

                  {/* Publications 30d */}
                  <div className="text-center text-sm font-mono font-semibold">
                    {s.pubs30d}
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-sm font-extrabold ${scoreColor(s.engagementScore)}`}>
                      {s.engagementScore}
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${scoreBg(s.engagementScore)}`}
                        style={{ width: `${s.engagementScore}%` }}
                      />
                    </div>
                    <span className={`text-[9px] font-semibold ${scoreColor(s.engagementScore)}`}>
                      {scoreLabel(s.engagementScore)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-center text-xs text-muted-foreground">
            Score = signalements × 12 + publications × 20 + utilisateurs × 4 · Max 100
          </p>
        </>
      )}
    </div>
    </>
  );
}
