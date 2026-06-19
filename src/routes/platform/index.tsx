import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Users, Ticket, BarChart3, ShieldAlert, Clock,
  TrendingUp, AlertCircle, Zap, CheckCircle, PlusCircle,
} from "lucide-react";
import { subDays, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/platform/")({
  head: () => ({
    meta: [
      { title: "Platform Admin — VigieCity" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlatformIndexPage,
});

function PlatformIndexPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-dashboard"],
    queryFn: async () => {
      const since7 = subDays(new Date(), 7).toISOString();
      const since30 = subDays(new Date(), 30).toISOString();

      const [communes, users, openTickets, activeLicenses, trialsExpiring, sosThisWeek, reportsThisMonth, newCommunes] =
        await Promise.all([
          supabase.from("collectivities").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("commune_licenses").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase
            .from("commune_licenses")
            .select("id", { count: "exact", head: true })
            .eq("plan", "trial")
            .lte("expires_at", subDays(new Date(), -7).toISOString())
            .gte("expires_at", new Date().toISOString()),
          supabase.from("sos_events").select("id", { count: "exact", head: true }).gte("created_at", since7),
          supabase.from("reports").select("id", { count: "exact", head: true }).gte("created_at", since30),
          supabase.from("collectivities").select("id", { count: "exact", head: true }).gte("created_at", since30),
        ]);

      const { data: recentTickets } = await supabase
        .from("support_tickets")
        .select("id, subject, status, created_at, collectivities(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        communes: communes.count ?? 0,
        users: users.count ?? 0,
        openTickets: openTickets.count ?? 0,
        activeLicenses: activeLicenses.count ?? 0,
        trialsExpiring: trialsExpiring.count ?? 0,
        sosThisWeek: sosThisWeek.count ?? 0,
        reportsThisMonth: reportsThisMonth.count ?? 0,
        newCommunes: newCommunes.count ?? 0,
        recentTickets: recentTickets ?? [],
      };
    },
  });

  const kpis = [
    { icon: Building2, label: "Communes", value: data?.communes, link: "/platform/communes", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Users, label: "Utilisateurs", value: data?.users, link: "/platform/users", color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: CheckCircle, label: "Licences actives", value: data?.activeLicenses, link: "/platform/licences", color: "text-violet-600", bg: "bg-violet-50" },
    { icon: Ticket, label: "Tickets ouverts", value: data?.openTickets, link: "/platform/support", color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const metrics = [
    { icon: TrendingUp, label: "Signalements (30j)", value: data?.reportsThisMonth },
    { icon: ShieldAlert, label: "SOS cette semaine", value: data?.sosThisWeek },
    { icon: PlusCircle, label: "Nouvelles communes (30j)", value: data?.newCommunes },
    { icon: Clock, label: "Trials expirant <7j", value: data?.trialsExpiring, alert: (data?.trialsExpiring ?? 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de la plateforme VigieCity</p>
        </div>
        <Link
          to="/platform/onboarding"
          className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          <Zap className="h-4 w-4" /> Nouvelle commune
        </Link>
      </div>

      {(data?.trialsExpiring ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{data!.trialsExpiring} commune{data!.trialsExpiring > 1 ? "s" : ""}</span>{" "}
            en trial expire{data!.trialsExpiring > 1 ? "nt" : ""} dans moins de 7 jours.{" "}
            <Link to="/platform/trials" className="underline font-medium">Gérer les trials →</Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value, link, color, bg }) => (
          <Link
            key={link}
            to={link}
            className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex rounded-lg p-2 ${bg} mb-3`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold">
              {isLoading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted" /> : value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ icon: Icon, label, value, alert }) => (
          <div key={label} className={`rounded-xl border p-4 ${alert ? "border-amber-300 bg-amber-50" : "border-border bg-card"}`}>
            <Icon className={`h-4 w-4 mb-2 ${alert ? "text-amber-600" : "text-muted-foreground"}`} />
            <p className={`text-xl font-bold ${alert ? "text-amber-700" : ""}`}>
              {isLoading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-muted" /> : value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Tickets support récents</h2>
          <Link to="/platform/support" className="text-xs text-primary hover:underline">Voir tout →</Link>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Chargement…</div>
        ) : data?.recentTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Aucun ticket</div>
        ) : (
          <div className="divide-y divide-border">
            {data!.recentTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {(t as any).collectivities?.name ?? "—"}{" · "}
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  t.status === "open" ? "bg-red-100 text-red-700" :
                  t.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {t.status === "open" ? "Ouvert" : t.status === "in_progress" ? "En cours" : "Résolu"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: "/platform/features", label: "Feature flags", icon: Zap },
          { to: "/platform/trials", label: "Trials", icon: Clock },
          { to: "/platform/facturation", label: "Facturation", icon: BarChart3 },
          { to: "/platform/stats", label: "Statistiques", icon: TrendingUp },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
