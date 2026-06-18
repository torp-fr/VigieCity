import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Archive, ArrowRight, Loader2, Lock, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryIcon, categoryLabel } from "@/lib/categories";

export const Route = createFileRoute("/admin/signalements")({
  head: () => ({ meta: [{ title: "Modération signalements — VigieCity" }] }),
  component: SignalementsAdmin,
});

type Report = {
  id: string;
  category: string;
  severity: string;
  description: string;
  approximate_address: string | null;
  created_at: string;
  status: string;
  is_anonymous: boolean;
};

type StatusAction = "published" | "rejected" | "archived" | "transferred";

function SignalementsAdmin() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isMod, setIsMod] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setAuthed(!!uid);
      setUserId(uid);
      if (!uid) return;
      // Get profile + role
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("collectivity_id").eq("id", uid).single(),
        supabase.from("user_roles").select("role").eq("user_id", uid).in("role", ["moderator", "admin"]),
      ]);
      setCollectivityId(profile?.collectivity_id ?? null);
      setIsMod((roles?.length ?? 0) > 0);
    });
  }, []);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", "pending", collectivityId],
    enabled: !!collectivityId && isMod === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, category, severity, description, approximate_address, created_at, status, is_anonymous")
        .eq("collectivity_id", collectivityId!)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Report[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusAction }) => {
      const { error } = await supabase.from("reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      const labels: Record<StatusAction, string> = {
        published: "Signalement publié.",
        rejected: "Signalement rejeté.",
        archived: "Signalement archivé.",
        transferred: "Signalement transféré.",
      };
      toast.success(labels[status]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authed === false || isMod === false) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Accès réservé</h1>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      <header>
        <h1 className="text-2xl font-bold">Signalements en attente</h1>
        <p className="mt-1 text-sm text-muted-foreground">Modérez les signalements de votre commune.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !reports?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun signalement en attente. Beau travail !
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                  {categoryIcon(r.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{categoryLabel(r.category)}</span>
                    <SeverityBadge value={r.severity} />
                    {r.is_anonymous && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Anonyme</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{r.description}</p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {r.approximate_address && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.approximate_address}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(r.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ActionBtn
                  icon={CheckCircle2}
                  label="Publier"
                  color="success"
                  onClick={() => updateStatus.mutate({ id: r.id, status: "published" })}
                  disabled={updateStatus.isPending}
                />
                <ActionBtn
                  icon={XCircle}
                  label="Rejeter"
                  color="sos"
                  onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}
                  disabled={updateStatus.isPending}
                />
                <ActionBtn
                  icon={Archive}
                  label="Archiver"
                  color="muted"
                  onClick={() => updateStatus.mutate({ id: r.id, status: "archived" })}
                  disabled={updateStatus.isPending}
                />
                <ActionBtn
                  icon={ArrowRight}
                  label="Transférer"
                  color="warning"
                  onClick={() => updateStatus.mutate({ id: r.id, status: "transferred" })}
                  disabled={updateStatus.isPending}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionBtn({
  icon: Icon, label, color, onClick, disabled,
}: {
  icon: typeof CheckCircle2; label: string; color: string; onClick: () => void; disabled: boolean;
}) {
  const cls =
    color === "success" ? "bg-success/10 text-success border-success/20"
    : color === "sos" ? "bg-sos/10 text-sos border-sos/20"
    : color === "warning" ? "bg-warning/10 text-warning-foreground border-warning/20"
    : "bg-muted text-muted-foreground border-border";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition disabled:opacity-40 ${cls}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function SeverityBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    info: "bg-muted text-muted-foreground",
    vigilance: "bg-warning/15 text-warning-foreground border border-warning/30",
    urgent: "bg-sos/15 text-sos border border-sos/30",
  };
  const labels: Record<string, string> = { info: "Info", vigilance: "Vigilance", urgent: "Urgent" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${map[value] ?? map.info}`}>
      {labels[value] ?? value}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}
