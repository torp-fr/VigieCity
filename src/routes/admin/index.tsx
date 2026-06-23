import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  FileText,
  MessageSquare,
  Calendar,
  BookOpen,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Tableau de bord — VigieCity Admin" }] }),
  component: AdminDashboard,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type RecentReport = {
  id: string;
  category: string;
  severity: string;
  description: string;
  created_at: string;
};

// ── Severity badge ─────────────────────────────────────────────────────────────

const SEV_COLORS: Record<string, string> = {
  low:      "bg-slate-100 text-slate-600",
  medium:   "bg-amber-100 text-amber-700",
  high:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEV_COLORS[severity] ?? "bg-slate-100 text-slate-600"}`}>
      {severity}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const navigate = useNavigate();
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [communeName,    setCommuneName]    = useState<string>("");
  const [ready,          setReady]          = useState(false);

  // Resolve current user's collectivity (AdminShell handles auth guard)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id, collectivities(name)")
        .eq("id", session.user.id)
        .single();
      setCollectivityId(profile?.collectivity_id ?? null);
      setCommuneName((profile as any)?.collectivities?.name ?? "");
      setReady(true);
    })();
  }, []);

  // ── Stat queries ───────────────────────────────────────────────────────────

  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ["admin-stat-pending", collectivityId],
    enabled: ready,
    queryFn: async () => {
      let q = supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending");
      if (collectivityId) q = q.eq("collectivity_id", collectivityId);
      const { count } = await q;
      return count ?? 0;
    },
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["admin-stat-unread", collectivityId],
    enabled: ready,
    queryFn: async () => {
      let q = supabase.from("conversations").select("*", { count: "exact", head: true }).gt("unread_admin", 0);
      if (collectivityId) q = q.eq("collectivity_id", collectivityId);
      const { count } = await q;
      return count ?? 0;
    },
  });

  const { data: upcomingCount = 0 } = useQuery<number>({
    queryKey: ["admin-stat-events", collectivityId],
    enabled: ready,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let q = supabase.from("events").select("*", { count: "exact", head: true }).gte("date", today);
      if (collectivityId) q = q.eq("collectivity_id", collectivityId);
      const { count } = await q;
      return count ?? 0;
    },
  });

  const { data: pubsCount = 0 } = useQuery<number>({
    queryKey: ["admin-stat-pubs", collectivityId],
    enabled: ready,
    queryFn: async () => {
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      let q = supabase.from("publications").select("*", { count: "exact", head: true }).gte("created_at", firstOfMonth);
      if (collectivityId) q = q.eq("collectivity_id", collectivityId);
      const { count } = await q;
      return count ?? 0;
    },
  });

  // ── Recent pending reports ─────────────────────────────────────────────────

  const { data: recentReports = [], isLoading: loadingReports } = useQuery<RecentReport[]>({
    queryKey: ["admin-recent-reports", collectivityId],
    enabled: ready,
    queryFn: async () => {
      let q = supabase
        .from("reports")
        .select("id, category, severity, description, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      if (collectivityId) q = q.eq("collectivity_id", collectivityId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RecentReport[];
    },
  });

  // ── Stat cards config ──────────────────────────────────────────────────────

  const STATS = [
    {
      label:  "Signalements en attente",
      value:  pendingCount,
      icon:   <FileText className="h-5 w-5 text-amber-600" />,
      bg:     "bg-amber-50 border-amber-200",
      iconBg: "bg-amber-100",
      link:   "/admin/signalements",
      urgent: pendingCount > 0,
    },
    {
      label:  "Messages non lus",
      value:  unreadCount,
      icon:   <MessageSquare className="h-5 w-5 text-sky-600" />,
      bg:     "bg-sky-50 border-sky-200",
      iconBg: "bg-sky-100",
      link:   "/admin/messagerie",
      urgent: unreadCount > 0,
    },
    {
      label:  "Événements à venir",
      value:  upcomingCount,
      icon:   <Calendar className="h-5 w-5 text-violet-600" />,
      bg:     "bg-violet-50 border-violet-200",
      iconBg: "bg-violet-100",
      link:   "/admin/evenements",
      urgent: false,
    },
    {
      label:  "Publications ce mois",
      value:  pubsCount,
      icon:   <BookOpen className="h-5 w-5 text-emerald-600" />,
      bg:     "bg-emerald-50 border-emerald-200",
      iconBg: "bg-emerald-100",
      link:   "/admin/publications",
      urgent: false,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminShell activePath="/admin">
      <div className="mx-auto max-w-7xl px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate-500">
            {communeName ? `Commune de ${communeName}` : "Administration VigieCity"}
          </p>
        </div>

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map(({ label, value, icon, bg, iconBg, link, urgent }) => (
            <button
              key={label}
              onClick={() => navigate({ to: link as any })}
              className={`group relative rounded-2xl border p-5 text-left shadow-sm transition hover:shadow-md ${bg}`}
            >
              {urgent && (
                <span className="absolute right-3 top-3 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              )}
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                {icon}
              </div>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              <p className="mt-0.5 text-sm text-slate-500">{label}</p>
              <ArrowRight className="mt-3 h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* Recent pending reports */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Signalements récents</h2>
                <button
                  onClick={() => navigate({ to: "/admin/signalements" as any })}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Voir tous <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {loadingReports ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : recentReports.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <FileText className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Aucun signalement en attente</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3">Catégorie</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3">Gravité</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentReports.map(r => (
                      <tr
                        key={r.id}
                        onClick={() => navigate({ to: "/admin/signalements" as any })}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 font-medium capitalize text-slate-700">{r.category}</td>
                        <td className="max-w-[180px] truncate px-5 py-3 text-slate-500">{r.description}</td>
                        <td className="px-5 py-3"><SeverityBadge severity={r.severity} /></td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          {new Date(r.created_at).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-900">Actions rapides</h2>
            {(
              [
                { label: "Publier une actualité",  icon: <BookOpen     className="h-4 w-4 text-emerald-600" />, path: "/admin/publications", bg: "bg-emerald-50 border-emerald-200" },
                { label: "Créer un événement",      icon: <Calendar     className="h-4 w-4 text-violet-600"  />, path: "/admin/evenements",  bg: "bg-violet-50 border-violet-200"  },
                { label: "Diffuser une alerte",     icon: <AlertTriangle className="h-4 w-4 text-red-600"   />, path: "/admin/alertes",     bg: "bg-red-50 border-red-200"        },
                { label: "Historique signalements", icon: <Clock        className="h-4 w-4 text-amber-600"  />, path: "/admin/signalements", bg: "bg-amber-50 border-amber-200"    },
              ] as const
            ).map(({ label, icon, path, bg }) => (
              <button
                key={label}
                onClick={() => navigate({ to: path as any })}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:shadow-md ${bg}`}
              >
                <span className="shrink-0">{icon}</span>
                {label}
                <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>

        </div>
      </div>
    </AdminShell>
  );
}
