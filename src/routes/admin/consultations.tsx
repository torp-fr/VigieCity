import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Users,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  PauseCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/consultations")({
  head: () => ({
    meta: [{ title: "Consultations — Admin VigieCity" }],
  }),
  component: AdminConsultationsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type PollStatus = "draft" | "active" | "closed";
type PollType   = "single_choice" | "multiple_choice";

type Poll = {
  id: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  status: PollStatus;
  ends_at: string | null;
  created_at: string;
  poll_options: { id: string; label: string; position: number }[];
};

type PollResult = {
  option_id: string;
  label: string;
  position: number;
  vote_count: number;
};

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<PollStatus, string> = {
  draft:  "bg-slate-100 text-slate-500 border-slate-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-red-50 text-red-600 border-red-200",
};
const STATUS_LABEL: Record<PollStatus, string> = {
  draft:  "Brouillon",
  active: "Actif",
  closed: "Fermé",
};

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminConsultationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editPoll, setEditPoll] = useState<Poll | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Collectivity du admin
  const { data: profile } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", user.id)
        .single();
      return data;
    },
  });
  const collectivityId = profile?.collectivity_id;

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["admin-polls", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select(`id, title, description, poll_type, status, ends_at, created_at,
                  poll_options(id, label, position)`)
        .eq("collectivity_id", collectivityId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Poll[];
    },
  });

  const { data: allResults = [] } = useQuery({
    queryKey: ["admin-poll-results"],
    enabled: polls.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("poll_results").select("*");
      return (data ?? []) as PollResult[];
    },
  });

  // Transition de statut
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PollStatus }) => {
      const { error } = await supabase
        .from("polls")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-polls", collectivityId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("polls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-polls", collectivityId] }),
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function openCreate() {
    setEditPoll(null);
    setShowForm(true);
  }

  function openEdit(poll: Poll) {
    setEditPoll(poll);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditPoll(null);
  }

  function getResultsForPoll(poll: Poll) {
    return poll.poll_options
      .map((opt) => ({
        ...opt,
        count: allResults.find((r) => r.option_id === opt.id)?.vote_count ?? 0,
      }))
      .sort((a, b) => a.position - b.position);
  }

  return (
    <AdminShell activePath="/admin/consultations">
      <div className="mx-auto max-w-7xl px-8 py-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Consultations</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Sondages et votes citoyens
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-card"
          >
            <Plus className="h-4 w-4" />
            Créer
          </button>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : polls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <BarChart2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-base font-semibold">Aucun sondage</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez votre premier sondage pour consulter les citoyens.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {polls.map((poll) => {
              const isOpen = expanded.has(poll.id);
              const res = getResultsForPoll(poll);
              const total = res.reduce((acc, r) => acc + r.count, 0);

              return (
                <li
                  key={poll.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{poll.title}</span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[poll.status]}`}
                          >
                            {STATUS_LABEL[poll.status]}
                          </span>
                          {poll.poll_type === "multiple_choice" && (
                            <span className="rounded-full bg-blue-50 px-2 py-0 text-[10px] text-blue-600 font-medium">
                              Multi-choix
                            </span>
                          )}
                        </div>
                        {poll.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {poll.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {total} vote{total !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            {poll.poll_options.length} option{poll.poll_options.length !== 1 ? "s" : ""}
                          </span>
                          {poll.ends_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(poll.ends_at).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(poll)}
                          className="rounded-lg border border-border p-1.5 hover:bg-muted"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {poll.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: poll.id, status: "active" })}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100"
                            title="Activer"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {poll.status === "active" && (
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: poll.id, status: "closed" })}
                            className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                            title="Fermer"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {poll.status !== "active" && (
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(poll.id)}
                            className="rounded-lg border border-border p-1.5 text-destructive hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Résultats toggle */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(poll.id)}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                    {isOpen ? "Masquer les résultats" : "Voir les résultats"}
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-3">
                      {res.map((opt) => {
                        const pct = total > 0 ? Math.round((opt.count / total) * 100) : 0;
                        return (
                          <div key={opt.id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-muted-foreground">{opt.count} vote{opt.count !== 1 ? "s" : ""} — {pct}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {total === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-2">
                          Aucun vote pour l'instant.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Modal formulaire */}
        {showForm && collectivityId && (
          <PollForm
            poll={editPoll}
            collectivityId={collectivityId}
            onClose={closeForm}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["admin-polls", collectivityId] });
              closeForm();
            }}
          />
        )}
      </div>
    </AdminShell>
  );
}

// ── PollForm ──────────────────────────────────────────────────────────────────

function PollForm({
  poll,
  collectivityId,
  onClose,
  onSaved,
}: {
  poll: Poll | null;
  collectivityId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!poll;
  const [title, setTitle]       = useState(poll?.title ?? "");
  const [description, setDescription] = useState(poll?.description ?? "");
  const [pollType, setPollType] = useState<PollType>(poll?.poll_type ?? "single_choice");
  const [endsAt, setEndsAt]     = useState(
    poll?.ends_at ? poll.ends_at.slice(0, 10) : ""
  );
  const [options, setOptions]   = useState<string[]>(
    poll?.poll_options.sort((a, b) => a.position - b.position).map((o) => o.label) ?? ["", ""]
  );
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function setOption(idx: number, val: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }

  async function handleSave() {
    const validOpts = options.filter((o) => o.trim());
    if (!title.trim()) { setError("Le titre est requis."); return; }
    if (validOpts.length < 2) { setError("Au moins 2 options sont requises."); return; }
    setSaving(true);
    setError(null);

    try {
      if (isEdit && poll) {
        // Update poll
        const { error: pollErr } = await supabase
          .from("polls")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            poll_type: pollType,
            ends_at: endsAt || null,
          })
          .eq("id", poll.id);
        if (pollErr) throw pollErr;

        // Remplace les options
        await supabase.from("poll_options").delete().eq("poll_id", poll.id);
        const { error: optErr } = await supabase.from("poll_options").insert(
          validOpts.map((label, idx) => ({
            poll_id: poll.id,
            label: label.trim(),
            position: idx,
          }))
        );
        if (optErr) throw optErr;
      } else {
        // Insert poll
        const { data: { user } } = await supabase.auth.getUser();
        const { data: newPoll, error: pollErr } = await supabase
          .from("polls")
          .insert({
            collectivity_id: collectivityId,
            title: title.trim(),
            description: description.trim() || null,
            poll_type: pollType,
            ends_at: endsAt || null,
            status: "draft",
            created_by: user?.id,
          })
          .select("id")
          .single();
        if (pollErr) throw pollErr;

        const { error: optErr } = await supabase.from("poll_options").insert(
          validOpts.map((label, idx) => ({
            poll_id: newPoll.id,
            label: label.trim(),
            position: idx,
          }))
        );
        if (optErr) throw optErr;
      }

      onSaved();
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0">
      <div className="w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-5 pb-8 shadow-2xl" style={{ maxHeight: "90vh" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Modifier le sondage" : "Nouveau sondage"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Titre */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Titre *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Votre avis sur le nouveau parc ?"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Contexte ou informations complémentaires..."
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Type de vote</label>
            <div className="grid grid-cols-2 gap-2">
              {(["single_choice", "multiple_choice"] as PollType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPollType(t)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    pollType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/50"
                  }`}
                >
                  {t === "single_choice" ? "Un seul choix" : "Choix multiples"}
                </button>
              ))}
            </div>
          </div>

          {/* Date de fin */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Date de fin (optionnel)</label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Options */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Options de réponse *</label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-muted-foreground">{idx + 1}.</span>
                  <input
                    value={opt}
                    onChange={(e) => setOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une option
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isEdit ? "Enregistrer" : "Créer le sondage"}
          </button>
        </div>
      </div>
    </div>
  );
}
