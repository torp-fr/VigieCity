import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { BarChart3, Download, Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { subDays, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/admin/stats")({
  component: StatsPage,
});

const COLORS = ["#1e3a8a", "#d97706", "#dc2626", "#16a34a", "#6b7280"];

const CATEGORY_LABELS: Record<string, string> = {
  vehicule_suspect: "Véh. suspect",
  bruit: "Bruit",
  arbre_dangereux: "Arbre",
  voirie: "Voirie",
  eclairage: "Éclairage",
  tag_degradation: "Dégradation",
  squat: "Squat",
  violence: "Violence",
  accident: "Accident",
  autre: "Autre",
};

function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user.id)
        .single();
      const cid = profile?.collectivity_id;
      if (!cid) throw new Error("Collectivité non configurée");

      const since30 = subDays(new Date(), 30).toISOString();
      const { data: reports } = await supabase
        .from("reports")
        .select("id, created_at, category, status, severity")
        .eq("collectivity_id", cid)
        .gte("created_at", since30);

      const { data: alerts } = await supabase
        .from("alerts")
        .select("id, created_at")
        .eq("collectivity_id", cid)
        .gte("created_at", subDays(new Date(), 30).toISOString());

      const all = reports ?? [];

      // Line chart: signalements par semaine
      const weekMap: Record<string, number> = {};
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 });
        const key = format(weekStart, "dd/MM", { locale: fr });
        weekMap[key] = 0;
      }
      for (const r of all) {
        const ws = startOfWeek(new Date(r.created_at), { weekStartsOn: 1 });
        const key = format(ws, "dd/MM", { locale: fr });
        if (key in weekMap) weekMap[key]++;
      }
      const weekData = Object.entries(weekMap).map(([week, count]) => ({ week, count }));

      // Bar chart: par catégorie
      const catMap: Record<string, number> = {};
      for (const r of all) {
        const c = r.category ?? "autre";
        catMap[c] = (catMap[c] ?? 0) + 1;
      }
      const catData = Object.entries(catMap)
        .map(([cat, count]) => ({ cat: CATEGORY_LABELS[cat] ?? cat, count }))
        .sort((a, b) => b.count - a.count);

      // Pie: statuts
      const statusMap: Record<string, number> = {};
      for (const r of all) {
        const s = r.status ?? "pending";
        statusMap[s] = (statusMap[s] ?? 0) + 1;
      }
      const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      // KPIs
      const resolved = all.filter((r) => r.status !== "pending" && r.status !== "rejected");
      const resolutionRate = all.length ? Math.round((resolved.length / all.length) * 100) : 0;

      return {
        weekData, catData, statusData,
        reports: all,
        total: all.length,
        resolutionRate,
        alertsThisMonth: alerts?.length ?? 0,
        pendingCount: all.filter((r) => r.status === "pending").length,
      };
    },
  });

  function exportCsv() {
    const reports = data?.reports ?? [];
    const rows: string[][] = [
      ["ID", "Date", "Catégorie", "Statut", "Sévérité"],
      ...reports.map((r) => [
        r.id,
        format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
        CATEGORY_LABELS[r.category ?? ""] ?? (r.category ?? ""),
        r.status ?? "",
        r.severity ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signalements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Statistiques territoire
          </h1>
          <p className="text-sm text-muted-foreground mt-1">30 derniers jours</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: "Signalements (30j)", value: data?.total ?? 0, color: "text-primary" },
          { icon: CheckCircle, label: "Taux résolution", value: `${data?.resolutionRate ?? 0}%`, color: "text-success" },
          { icon: AlertTriangle, label: "En attente", value: data?.pendingCount ?? 0, color: "text-warning" },
          { icon: Clock, label: "Alertes ce mois", value: data?.alertsThisMonth ?? 0, color: "text-blue-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-4">Signalements par semaine</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 4 }} name="Signalements" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-4">Par catégorie</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.catData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="cat" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#1e3a8a" name="Signalements" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-4">Répartition par statut</h2>
          {(data?.statusData.length ?? 0) === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Pas de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data?.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data?.statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
