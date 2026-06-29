import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Clock, MapPin, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoryIcon, categoryLabel } from "@/lib/categories";
import { TerrainShell } from "@/components/TerrainShell";

export const Route = createFileRoute("/admin/terrain/traites")({
  head: () => ({ meta: [{ title: "Traités aujourd'hui — VigieCity Terrain" }] }),
  component: TerrainTraitesPage,
});

type Report = {
  id: string;
  category: string;
  severity: string;
  description: string;
  approximate_address: string | null;
  created_at: string;
  status: string;
};

const STATUS_CFG: Record<string, { icon: typeof CheckCircle2; label: string; cls: string }> = {
  published:   { icon: CheckCircle2, label: "Validé",    cls: "text-emerald-600" },
  rejected:    { icon: XCircle,      label: "Rejeté",    cls: "text-red-500"     },
  transferred: { icon: ArrowRight,   label: "Transféré", cls: "text-amber-500"   },
  archived:    { icon: Clock,        label: "Archivé",   cls: "text-slate-400"   },
};

function TerrainTraitesPage() {
  const [collectivityId, setCollectivityId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      if (!uid) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", uid)
        .single();
      setCollectivityId(profile?.collectivity_id ?? null);
    });
  }, []);

  // Signalements traités aujourd'hui (toutes statuts sauf pending)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", "terrain-traites", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, category, severity, description, approximate_address, created_at, status")
        .eq("collectivity_id", collectivityId!)
        .neq("status", "pending")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Report[];
    },
  });

  const count = reports?.length ?? 0;

  return (
    <TerrainShell activePath="/admin/terrain/traites">
      <div className="space-y-4 px-4 pt-4 pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Traités aujourd'hui
            {count > 0 && (
              <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                {count}
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <p className="font-semibold text-foreground">Aucun signalement traité aujourd'hui</p>
            <p className="mt-1 text-xs text-muted-foreground">Les signalements validés, rejetés ou transférés aujourd'hui apparaîtront ici.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports!.map((r) => {
              const cfg = STATUS_CFG[r.status] ?? STATUS_CFG.archived;
              const StatusIcon = cfg.icon;
              return (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
                      {categoryIcon(r.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{categoryLabel(r.category)}</span>
                        <span className={`flex items-center gap-1 text-[11px] font-semibold ${cfg.cls}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {r.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {r.approximate_address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {r.approximate_address}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(r.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </TerrainShell>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}
