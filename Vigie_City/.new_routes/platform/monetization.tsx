import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, Euro, Building2, Megaphone, BarChart3, Users, MousePointerClick, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/monetization")({
  component: MonetizationPage,
});

// ─── Prix de reference par plan (centimes/mois) ──────────────────────────────
const PLAN_PRICES_CENTS: Record<string, number> = {
  nano:      4900,
  micro:     9900,
  local:     18900,
  urbain:    49000,
  metropole: 0,
};

const PLAN_LABELS: Record<string, string> = {
  nano:      "Nano",
  micro:     "Micro",
  local:     "Local",
  urbain:    "Urbain",
  metropole: "Metropole",
};

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function ctr(imp: number, clicks: number): string {
  if (!imp) return "—";
  return ((clicks / imp) * 100).toFixed(2) + "%";
}

// ─── Hooks de donnees ─────────────────────────────────────────────────────────
function useMonetizationData() {
  return useQuery({
    queryKey: ["platform-monetization"],
    staleTime: 60_000,
    queryFn: async () => {
      const [licRes, adsRes, impRes] = await Promise.all([
        supabase
          .from("commune_licenses")
          .select("id, plan_id, plan, status, amount_eur, duration_months, started_at, expires_at, collectivity_id")
          .order("started_at", { ascending: true }),
        supabase
          .from("ads")
          .select("id, title, advertiser_name, is_active, price_monthly, impressions_count, clicks_count, start_date, end_date"),
        supabase
          .from("ad_impressions")
          .select("event_type, created_at")
          .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
      ]);

      if (licRes.error) throw licRes.error;
      if (adsRes.error) throw adsRes.error;

      const licenses = licRes.data ?? [];
      const ads      = adsRes.data ?? [];
      const imp30    = impRes.data ?? [];

      const today = new Date().toISOString().split("T")[0];

      // ── MRR abonnements ──────────────────────────────────────────────────
      const activeLicenses = licenses.filter((l) => l.status === "active");
      const trialLicenses  = licenses.filter((l) => l.status === "trial");

      // MRR = amount_eur (centimes) / duration_months  OU  prix plan si pas de montant
      const mrrLicCents = activeLicenses.reduce((sum, l) => {
        if (l.amount_eur && l.duration_months) {
          return sum + Math.round(l.amount_eur / l.duration_months);
        }
        const planKey = l.plan_id ?? l.plan ?? "nano";
        return sum + (PLAN_PRICES_CENTS[planKey] ?? 0);
      }, 0);

      // Repartition par plan
      const planDist: Record<string, number> = {};
      activeLicenses.forEach((l) => {
        const k = l.plan_id ?? l.plan ?? "nano";
        planDist[k] = (planDist[k] ?? 0) + 1;
      });

      // ── MRR publicites ───────────────────────────────────────────────────
      const activeAds = ads.filter((a) => {
        if (!a.is_active) return false;
        if (a.end_date && a.end_date < today) return false;
        return true;
      });
      const mrrAdsCents = activeAds.reduce((sum, a) => sum + (a.price_monthly ?? 0) * 100, 0);

      // ── Totaux ───────────────────────────────────────────────────────────
      const mrrTotalCents = mrrLicCents + mrrAdsCents;
      const arrCents      = mrrTotalCents * 12;

      // ── Stats pubs 30j ───────────────────────────────────────────────────
      const imp30count    = imp30.filter((e) => e.event_type === "impression").length;
      const clicks30count = imp30.filter((e) => e.event_type === "click").length;

      // ── Courbe croissance MRR cumule (par mois, base licences) ───────────
      // On calcule le MRR cumule au fil des starts
      const mrrByMonth: Record<string, number> = {};
      activeLicenses.forEach((l) => {
        if (!l.started_at) return;
        const month = l.started_at.slice(0, 7); // YYYY-MM
        const planKey = l.plan_id ?? l.plan ?? "nano";
        const monthly = l.amount_eur && l.duration_months
          ? Math.round(l.amount_eur / l.duration_months)
          : (PLAN_PRICES_CENTS[planKey] ?? 0);
        mrrByMonth[month] = (mrrByMonth[month] ?? 0) + monthly;
      });

      const sortedMonths = Object.keys(mrrByMonth).sort();
      let cumul = 0;
      const mrrCurve = sortedMonths.map((m) => {
        cumul += mrrByMonth[m];
        return { month: m, mrr: cumul };
      });

      return {
        mrrLicCents,
        mrrAdsCents,
        mrrTotalCents,
        arrCents,
        activeLicenses,
        trialLicenses,
        planDist,
        activeAds,
        allAds: ads,
        imp30count,
        clicks30count,
        mrrCurve,
      };
    },
  });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: typeof Euro; color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className={`flex items-center gap-2 text-xs font-medium ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── Barre simple ─────────────────────────────────────────────────────────────
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
function MonetizationPage() {
  const { data, isLoading, error } = useMonetizationData();

  if (isLoading) {
    return (
      <PlatformShell activePath="/platform/monetization">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PlatformShell>
    );
  }

  if (error || !data) {
    return (
      <PlatformShell activePath="/platform/monetization">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 text-sm">
          Erreur de chargement des donnees de monetisation.
        </div>
      </PlatformShell>
    );
  }

  const {
    mrrLicCents, mrrAdsCents, mrrTotalCents, arrCents,
    activeLicenses, trialLicenses, planDist,
    activeAds, allAds,
    imp30count, clicks30count,
    mrrCurve,
  } = data;

  const mrrTotal = mrrTotalCents / 100;
  const mrrLic   = mrrLicCents   / 100;
  const mrrAds   = mrrAdsCents   / 100;
  const arr      = arrCents       / 100;

  // Repartition pour barres
  const planKeys  = Object.keys(planDist);
  const maxPlan   = Math.max(...planKeys.map((k) => planDist[k]), 1);

  // Courbe MRR — simple SVG sparkline
  const sparkW = 320;
  const sparkH = 60;
  const maxMrr = Math.max(...mrrCurve.map((p) => p.mrr), 1);
  const pts = mrrCurve.map((p, i) => {
    const x = mrrCurve.length === 1 ? sparkW / 2 : (i / (mrrCurve.length - 1)) * sparkW;
    const y = sparkH - (p.mrr / maxMrr) * sparkH;
    return `${x},${y}`;
  }).join(" ");

  return (
    <PlatformShell activePath="/platform/monetization">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Monetisation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vue consolidee abonnements B2G + revenus publicitaires
          </p>
        </div>

        {/* ── KPIs principaux ────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="MRR Total"
            value={`${fmt(mrrTotal, mrrTotal < 1000 ? 0 : 0)} €`}
            sub="Mensuel recurrent"
            icon={Euro}
            color="text-primary"
          />
          <KpiCard
            label="ARR Projete"
            value={`${fmt(arr)} €`}
            sub="MRR x 12"
            icon={TrendingUp}
            color="text-green-600"
          />
          <KpiCard
            label="Communes abonnees"
            value={String(activeLicenses.length)}
            sub={`${trialLicenses.length} en essai`}
            icon={Building2}
            color="text-blue-600"
          />
          <KpiCard
            label="Annonceurs actifs"
            value={String(activeAds.length)}
            sub={`${allAds.length} total`}
            icon={Megaphone}
            color="text-amber-600"
          />
        </div>

        {/* ── Ligne 2 : decomposition MRR + courbe ───────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Decomposition MRR */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">Decomposition MRR</h2>
            <div className="space-y-4">
              {/* Abonnements */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">Abonnements B2G</span>
                  <span className="font-mono">{fmt(mrrLic)} €</span>
                </div>
                <Bar pct={mrrTotal > 0 ? (mrrLic / mrrTotal) * 100 : 0} color="bg-primary" />
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {mrrTotal > 0 ? ((mrrLic / mrrTotal) * 100).toFixed(0) : 0}% du MRR
                </div>
              </div>
              {/* Publicites */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">Publicites</span>
                  <span className="font-mono">{fmt(mrrAds)} €</span>
                </div>
                <Bar pct={mrrTotal > 0 ? (mrrAds / mrrTotal) * 100 : 0} color="bg-amber-500" />
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {mrrTotal > 0 ? ((mrrAds / mrrTotal) * 100).toFixed(0) : 0}% du MRR
                </div>
              </div>

              <div className="border-t border-border pt-3 flex justify-between text-sm font-semibold">
                <span>Total MRR</span>
                <span>{fmt(mrrTotal)} €</span>
              </div>
            </div>
          </div>

          {/* Sparkline MRR */}
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold mb-4">Croissance MRR cumule (abonnements)</h2>
            {mrrCurve.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                Pas encore de donnees historiques
              </div>
            ) : (
              <div>
                <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className="w-full" preserveAspectRatio="none">
                  {/* Area fill */}
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {mrrCurve.length > 1 && (
                    <polygon
                      points={`0,${sparkH} ${pts} ${sparkW},${sparkH}`}
                      fill="url(#mrrGrad)"
                    />
                  )}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {mrrCurve.map((p, i) => {
                    const x = mrrCurve.length === 1 ? sparkW / 2 : (i / (mrrCurve.length - 1)) * sparkW;
                    const y = sparkH - (p.mrr / maxMrr) * sparkH;
                    return <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" />;
                  })}
                </svg>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  {mrrCurve[0] && <span>{mrrCurve[0].month}</span>}
                  {mrrCurve.length > 1 && <span>{mrrCurve[mrrCurve.length - 1].month}</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {mrrCurve.slice(-3).map((p) => (
                    <div key={p.month} className="rounded-xl bg-muted/40 px-2 py-2">
                      <div className="text-[10px] text-muted-foreground">{p.month}</div>
                      <div className="text-sm font-semibold">{fmt(p.mrr / 100)} €</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Ligne 3 : plans + stats pubs ───────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Repartition par plan */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">Repartition par plan</h2>
            {planKeys.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun abonnement actif</div>
            ) : (
              <div className="space-y-3">
                {planKeys
                  .sort((a, b) => (PLAN_PRICES_CENTS[b] ?? 0) - (PLAN_PRICES_CENTS[a] ?? 0))
                  .map((k) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{PLAN_LABELS[k] ?? k}</span>
                      <span className="text-muted-foreground">
                        {planDist[k]} commune{planDist[k] > 1 ? "s" : ""} · {fmt((PLAN_PRICES_CENTS[k] ?? 0) / 100)} €/mois
                      </span>
                    </div>
                    <Bar pct={(planDist[k] / maxPlan) * 100} color="bg-primary" />
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      MRR partiel : {fmt((PLAN_PRICES_CENTS[k] ?? 0) * planDist[k] / 100)} €
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats publicites */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">
              Performances pubs
              <span className="ml-2 text-[10px] font-normal text-muted-foreground">30 derniers jours</span>
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Impressions", value: fmt(imp30count), icon: Eye, color: "text-blue-600" },
                { label: "Clics", value: fmt(clicks30count), icon: MousePointerClick, color: "text-green-600" },
                { label: "CTR", value: ctr(imp30count, clicks30count), icon: BarChart3, color: "text-amber-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl bg-muted/40 p-3 text-center">
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                  <div className="text-base font-bold">{value}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            {/* Top annonceurs */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2">TOP ANNONCEURS</div>
              {allAds.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucune annonce</div>
              ) : (
                allAds
                  .slice()
                  .sort((a, b) => (b.impressions_count ?? 0) - (a.impressions_count ?? 0))
                  .slice(0, 4)
                  .map((ad) => (
                    <div key={ad.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${ad.is_active ? "bg-green-500" : "bg-muted-foreground"}`} />
                        <span className="truncate font-medium">{ad.advertiser_name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-muted-foreground font-mono">
                        <span title="Impressions">{(ad.impressions_count ?? 0).toLocaleString("fr-FR")}</span>
                        <span title="Clics">{(ad.clicks_count ?? 0).toLocaleString("fr-FR")}</span>
                        <span title="CTR">{ctr(ad.impressions_count ?? 0, ad.clicks_count ?? 0)}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* ── Note ────────────────────────────────────────────────────────── */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          MRR abonnements calcule sur la base des contrats Chorus Pro actifs (amount_eur / duration_months).
          MRR pubs = somme des price_monthly des annonces actives. Aucune donnee bancaire transmise.
        </p>
      </div>
    </PlatformShell>
  );
}
