import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/stats")({
  head: () => ({ meta: [{ title: "Statistiques — Platform Admin" }, { name: "robots", content: "noindex" }] }),
  component: PlatformStatsPage,
});

function PlatformStatsPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      if (!uid) { setIsAdmin(false); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("id")
        .eq("user_id", uid).eq("role", "admin").is("collectivity_id", null);
      setIsAdmin((roles?.length ?? 0) > 0);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["platform_stats_full"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const [reports, publications, alerts, communes, users, sosEvents] = await Promise.all([
        supabase.from("reports").select("status"),
        supabase.from("publications").select("is_published", { count: "exact", head: true }),
        supabase.from("alerts").select("severity"),
        supabase.from("collectivities").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("sos_events").select("id", { count: "exact", head: true }),
      ]);

      const reportsByStatus: Record<string, number> = {};
      for (const r of reports.data ?? []) {
        reportsByStatus[r.status] = (reportsByStatus[r.status] ?? 0) + 1;
      }

      const alertsBySeverity: Record<string, number> = {};
      for (const a of alerts.data ?? []) {
        alertsBySeverity[a.severity] = (alertsBySeverity[a.severity] ?? 0) + 1;
      }

      return {
        communes: communes.count ?? 0,
        users: users.count ?? 0,
        totalReports: (reports.data ?? []).length,
        reportsByStatus,
        publications: publications.count ?? 0,
        totalAlerts: (alerts.data ?? []).length,
        alertsBySeverity,
        sosEvents: sosEvents.count ?? 0,
      };
    },
  });

  const REPORT_STATUS_LABEL: Record<string, string> = {
    pending: "En attente", published: "Publiés", archived: "Archivés",
    rejected: "Rejetés", transferred: "Transmis",
  };
  const SEVERITY_LABEL: Record<string, string> = { info: "Info", vigilance: "Vigilance", urgent: "Urgent" };

  if (isAdmin === null) return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return (
    <div className="px-4 pt-10 text-center">
      <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Accès refusé.</p>
      <button onClick={() => navigate({ to: "/" })} className="mt-4 text-sm text-primary underline">Retour</button>
    </div>
  );

  return (
    <div className="space-y-6 px-4 pt-5">
      <Link to="/platform" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Platform Admin
      </Link>
      <header>
        <h1 className="text-2xl font-bold">Statistiques globales</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue d'ensemble de l'activité de la plateforme.</p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : data && (
        <>
          {/* Global KPIs */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Communes", value: data.communes },
              { label: "Utilisateurs", value: data.users },
              { label: "Signalements total", value: data.totalReports },
              { label: "SOS déclenchés", value: data.sosEvents },
              { label: "Publications", value: data.publications },
              { label: "Alertes total", value: data.totalAlerts },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <p className="text-2xl font-bold">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Reports by status */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold">Signalements par statut</h2>
            <div className="space-y-2">
              {Object.entries(data.reportsByStatus).map(([s, count]) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{REPORT_STATUS_LABEL[s] ?? s}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
              ))}
              {!Object.keys(data.reportsByStatus).length && (
                <p className="text-sm text-muted-foreground">Aucun signalement.</p>
              )}
            </div>
          </section>

          {/* Alerts by severity */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold">Alertes par sévérité</h2>
            <div className="space-y-2">
              {Object.entries(data.alertsBySeverity).map(([s, count]) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{SEVERITY_LABEL[s] ?? s}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
              ))}
              {!Object.keys(data.alertsBySeverity).length && (
                <p className="text-sm text-muted-foreground">Aucune alerte.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
