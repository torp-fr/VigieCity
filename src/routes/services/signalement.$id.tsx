import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, MapPin, Clock, Send, CheckCircle2, XCircle, Archive } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryIcon, categoryLabel } from "@/lib/categories";

export const Route = createFileRoute("/services/signalement/$id")({
  head: () => ({ meta: [{ title: "Signalement — VigieCity" }] }),
  component: ReportDetailPage,
});

type Report = {
  id: string;
  category: string;
  severity: "info" | "vigilance" | "urgent";
  title: string | null;
  description: string;
  approximate_address: string | null;
  lat: number | null;
  lng: number | null;
  is_anonymous: boolean;
  status: string;
  media_paths: string[];
  occurred_at: string;
  created_at: string;
  user_id: string | null;
  collectivity_id: string | null;
};

type Routing = {
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  service: { name: string; phone: string | null; email: string | null } | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: "En attente",    color: "bg-warning/15 text-warning-foreground border border-warning/30" },
  published:   { label: "Publié",        color: "bg-success/15 text-success-foreground border border-success/30" },
  archived:    { label: "Archivé",       color: "bg-muted text-muted-foreground" },
  rejected:    { label: "Rejeté",        color: "bg-destructive/15 text-destructive border border-destructive/30" },
  transferred: { label: "Transmis",      color: "bg-primary/15 text-primary border border-primary/30" },
};

function SeverityBadge({ value }: { value: "info" | "vigilance" | "urgent" }) {
  const map = {
    info:      "bg-muted text-muted-foreground",
    vigilance: "bg-warning/15 text-warning-foreground border border-warning/30",
    urgent:    "bg-sos/15 text-sos border border-sos/30",
  } as const;
  const label = { info: "Info", vigilance: "Vigilance", urgent: "Urgent" }[value];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${map[value]}`}>
      {label}
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

function ReportDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [userId, setUserId]   = useState<string | null>(null);
  const [isMod, setIsMod]     = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .in("role", ["moderator", "admin"]);
        setIsMod((roles?.length ?? 0) > 0);
      }
      setAuthReady(true);
    });
  }, []);

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", id],
    enabled: authReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Report;
    },
  });

  const { data: routing } = useQuery({
    queryKey: ["routing", report?.category, report?.collectivity_id],
    enabled: isMod && !!report,
    queryFn: async () => {
      const { data } = await supabase
        .from("report_routing")
        .select("contact_name, contact_email, notes, service:service_id(name, phone, email)")
        .eq("collectivity_id", report!.collectivity_id!)
        .eq("category", report!.category)
        .eq("is_active", true)
        .maybeSingle();
      if (!data) return null;
      return {
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        notes: data.notes,
        // @ts-expect-error joined
        service: data.service ?? null,
      } as Routing;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("reports")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["report", id] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success(`Signalement ${STATUS_LABELS[status]?.label?.toLowerCase() ?? "mis à jour"}.`);
    },
    onError: () => toast.error("Impossible de mettre à jour le statut."),
  });

  if (!authReady || isLoading) {
    return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!report) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Signalement introuvable ou accès refusé.</p>
        <Link to="/admin/signalements" className="mt-4 inline-flex items-center gap-1 text-sm text-primary underline">
          <ArrowLeft className="h-4 w-4" /> Retour aux signalements
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS_LABELS[report.status] ?? { label: report.status, color: "bg-muted text-muted-foreground" };
  const isOwner = report.user_id === userId;

  if (!isMod && !isOwner) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Accès refusé.</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm text-primary underline">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      {/* Back */}
      <button
        onClick={() => navigate({ to: isMod ? "/admin/signalements" : "/profil" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-2xl">
            {categoryIcon(report.category)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-lg leading-tight">{categoryLabel(report.category)}</p>
              <SeverityBadge value={report.severity} />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            </div>
            {report.title && <p className="mt-0.5 text-sm font-medium text-foreground">{report.title}</p>}
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{report.description}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {report.approximate_address && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {report.approximate_address}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {timeAgo(report.created_at)}
          </span>
          {report.is_anonymous && <span className="italic">Anonyme</span>}
        </div>
      </div>

      {/* Routing info (mods only) */}
      {isMod && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold">Routage du signalement</h2>
          {routing ? (
            <div className="space-y-1 text-sm">
              {routing.service && (
                <p><span className="text-muted-foreground">Service :</span> {routing.service.name}</p>
              )}
              {routing.contact_name && (
                <p><span className="text-muted-foreground">Contact :</span> {routing.contact_name}</p>
              )}
              {routing.contact_email && (
                <a href={`mailto:${routing.contact_email}`} className="block text-primary underline">
                  {routing.contact_email}
                </a>
              )}
              {routing.service?.phone && (
                <a href={`tel:${routing.service.phone}`} className="block text-primary underline">
                  {routing.service.phone}
                </a>
              )}
              {routing.notes && (
                <p className="text-muted-foreground italic">{routing.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune règle de routage définie pour cette catégorie.{" "}
              <Link to="/services/" className="text-primary underline">Configurer les services</Link>
            </p>
          )}
        </div>
      )}

      {/* Actions (mods only) */}
      {isMod && report.status !== "archived" && report.status !== "rejected" && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {report.status !== "published" && (
              <button
                onClick={() => updateStatus.mutate("published")}
                disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Publier
              </button>
            )}
            {report.status !== "transferred" && routing && (
              <button
                onClick={() => updateStatus.mutate("transferred")}
                disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-primary bg-background px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Transmettre au service
              </button>
            )}
            <button
              onClick={() => updateStatus.mutate("archived")}
              disabled={updateStatus.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground disabled:opacity-50"
            >
              <Archive className="h-4 w-4" /> Archiver
            </button>
            <button
              onClick={() => updateStatus.mutate("rejected")}
              disabled={updateStatus.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-background px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Rejeter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
