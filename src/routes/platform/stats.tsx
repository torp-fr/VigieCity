import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Shield, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export const Route = createFileRoute("/platform/stats")({
  head: () => ({ meta: [{ title: "Statistiques — Platform Admin" }, { name: "robots", content: "noindex" }] }),
  component: PlatformStatsPage,
});

const SEV_COLOR: Record<string, string> = { info: "#6b7280", vigilance: "#d97706", urgent: "#dc2626" };
const SEV_LABEL: Record<string, string> = { info: "Info", vigilance: "Vigilance", urgent: "Urgent" };
const STATUS_LABEL: Record<string, string> = { pending: "En attente", published: "Publiés", rejected: "Rejetés", transferred: "Transmis", archived: "Archivés" };

function last30Days() {
  const days: { date: string; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push({ date: d.toISOString().slice(0, 10), label: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) });
  }
  return days;
}

function PlatformStatsPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      if (!uid) { setIsAdmin(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("id")
        .eq("user_id", uid).eq("role", "admin").is("collectivity_id", null);
      setIsAdmin((roles?.length ?? 0) > 0);
    });
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["platform_stats_full", refreshKey],
    enabled: isAdmin === true,
    refetchInterval: 60000,
    queryFn: async () => {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [reportsRes, alertsRes, communesRes, usersRes, sosRes, pubsRes, ticketsRes] = await Promise.all([
        supabase.from("reports").select("status, created_at").gte("created_at", since30),
        supabase.from("alerts").select("severity, created_at").gte("created_at", since30),
        supabase.from("collectivities").select("id, created_at"),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("sos_events").select("id, created_at").gte("created_at", since30),
        supabase.from("publications").select("id, created_at").gte("created_at", since30),
        supabase.from("support_tickets").select("status"),
      ]);

      const days = last30Days();
      const reports = reportsRes.data ?? [];
      const sos = sosRes.data ?? [];
      const pubs = pubsRes.data ?? [];

      const activityByDay = days.map((d) => ({
        name: d.label,
        Signalements: reports.filter((r) => r.created_at?.slice(0, 10) === d.date).length,
        SOS: sos.filter((r) => r.created_at?.slice(0, 10) === d.date).length,
        Publications: pubs.filter((r) => r.created_at?.slice(0, 10) === d.date).length,
      }));

      const reportsByStatus: Record<string, number> = {};
      for (const r of reports) reportsByStatus[r.status] = (reportsByStatus[r.status] ?? 0) + 1;

      const alertsBySev: Record<string, number> = {};
      for (const a of (alertsRes.data ?? [])) alertsBySev[a.severity] = (alertsBySev[a.severity] ?? 0) + 1;

      const communeGrowth = days.map((d) => ({
        name: d.label,
        Communes: (communesRes.data ?? []).filter((c) => c.created_at <= d.date + "T23:59:59Z").length,
      }));

      const ticketsBySt: Record<string, number> = {};
      for (const t of (ticketsRes.data ?? [])) ticketsBySt[t.status] = (ticketsBySt[t.status] ?? 0) + 1;

      return {
        kpis: {
          communes: (communesRes.data ?? []).length,
          users: (usersRes.data ?? []).length,
          reports30d: reports.length,
          sos30d: sos.length,
          pubs30d: pubs.length,
          alerts30d: (alertsRes.data ?? []).length,
        },
        activityByDay,
        reportsByStatus,
        alertsBySev,
        communeGrowth,
        ticketsBySt,
      };
    },
  });

  if (isAdmin === null) return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return (
    <div className="px-4 pt-10 text-center">
      <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Accès refusé.</p>
      <button onClick={() => navigate({ to: "/" })} className="mt-4 text-sm text-primary underline">Retour</button>
    </div>
  );

  return (
    <div className="space-y-6 px-4 pt-5 pb-8">
      <Link to="/platform" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Platform Admin
      </Link>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Monitoring live — refresh auto 60 s</p>
        </div>
        <button
          onClick={() => { setRefreshKey((k) => k + 1); refetch(); }}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Communes", value: data.kpis.communes, accent: true },
              { label: "Utilisateurs", value: data.kpis.users, accent: true },
              { label: "Signalements 30j", value: data.kpis.reports30d },
              { label: "SOS 30j", value: data.kpis.sos30d },
              { label: "Publications 30j", value: data.kpis.pubs30d },
              { label: "Alertes 30j", value: data.kpis.alerts30d },
            ].map(({ label, value, accent }) => (
              <div key={label} className={`rounded-2xl border p-3 shadow-card ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                <p className={`text-xl font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Activité 30 jours */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-4 text-sm font-semibold">Activité 30 derniers jours</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.activityByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false}
                  tickFormatter={(_v, i) => i % 7 === 0 ? data.activityByDay[i]?.name ?? "" : ""} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Signalements" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="SOS" stroke="#dc2626" fill="#dc2626" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="Publications" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* Par statut / sévérité */}
          <div className="grid grid-cols-2 gap-3">
            <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h2 className="mb-3 text-sm font-semibold">Signalements par statut</h2>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={Object.entries(data.reportsByStatus).map(([k, v]) => ({ name: STATUS_LABEL[k] ?? k, value: v }))}
                  margin={{ top: 0, right: 5, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h2 className="mb-3 text-sm font-semibold">Alertes par sévérité</h2>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={Object.entries(data.alertsBySev).map(([k, v]) => ({ name: SEV_LABEL[k] ?? k, value: v }))}
                  margin={{ top: 0, right: 5, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {Object.entries(data.alertsBySev).map(([k], i) => (
                      <Cell key={i} fill={SEV_COLOR[k] ?? "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>

          {/* Croissance communes */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-4 text-sm font-semibold">Croissance communes</h2>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.communeGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false}
                  tickFormatter={(_v, i) => i % 7 === 0 ? data.communeGrowth[i]?.name ?? "" : ""} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="Communes" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* Tickets support */}
          {Object.keys(data.ticketsBySt).length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h2 className="mb-3 text-sm font-semibold">Support — tickets par statut</h2>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(data.ticketsBySt).map(([s, n]) => (
                  <div key={s} className="rounded-xl bg-muted px-3 py-2 text-center">
                    <p className="text-lg font-bold">{n}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.replace("_", " ")}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
