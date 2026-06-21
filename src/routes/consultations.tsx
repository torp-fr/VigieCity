import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppAuth } from "@/hooks/useAppAuth";
import {
  BarChart2,
  CheckCircle2,
  Loader2,
  ShieldOff,
  Clock,
  Lock,
  Users,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/consultations")({
  head: () => ({
    meta: [
      { title: "Consultations citoyennes — VigieCity" },
      {
        name: "description",
        content: "Participez aux sondages et consultations de votre commune.",
      },
    ],
  }),
  component: ConsultationsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type PollOption = {
  id: string;
  label: string;
  position: number;
};

type PollResult = {
  option_id: string;
  label: string;
  position: number;
  vote_count: number;
};

type Poll = {
  id: string;
  title: string;
  description: string | null;
  poll_type: "single_choice" | "multiple_choice";
  status: "draft" | "active" | "closed";
  ends_at: string | null;
  created_at: string;
  poll_options: PollOption[];
};

// ── Page ──────────────────────────────────────────────────────────────────────

function ConsultationsPage() {
  const { userId, collectivityId, isAuthenticated, isLoading: authLoading } = useAppAuth();
  const authed = authLoading ? null : isAuthenticated;
  const qc = useQueryClient();
  const [pendingVotes, setPendingVotes] = useState<Record<string, Set<string>>>({});

  // Fetch polls actifs + fermés
  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["polls", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select(`
          id, title, description, poll_type, status, ends_at, created_at,
          poll_options(id, label, position)
        `)
        .eq("collectivity_id", collectivityId!)
        .in("status", ["active", "closed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Poll[];
    },
  });

  // Fetch résultats agrégés
  const { data: results = [] } = useQuery({
    queryKey: ["poll-results", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poll_results")
        .select("*");
      if (error) throw error;
      return (data ?? []) as PollResult[];
    },
  });

  // Fetch votes de l'utilisateur
  const { data: myVotes = [] } = useQuery({
    queryKey: ["my-votes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poll_votes")
        .select("poll_id, option_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({
      pollId,
      optionId,
      alreadyVotedOption,
      pollType,
    }: {
      pollId: string;
      optionId: string;
      alreadyVotedOption: string | null;
      pollType: "single_choice" | "multiple_choice";
    }) => {
      if (pollType === "single_choice" && alreadyVotedOption) {
        // Remplace le vote existant
        await supabase
          .from("poll_votes")
          .delete()
          .eq("poll_id", pollId)
          .eq("user_id", userId!);
      }
      const { error } = await supabase
        .from("poll_votes")
        .insert({ poll_id: pollId, option_id: optionId, user_id: userId! });
      if (error && error.code !== "23505") throw error; // ignore duplicate
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-votes", userId] });
      qc.invalidateQueries({ queryKey: ["poll-results", collectivityId] });
    },
  });

  // Unvote mutation
  const unvoteMutation = useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      await supabase
        .from("poll_votes")
        .delete()
        .eq("poll_id", pollId)
        .eq("option_id", optionId)
        .eq("user_id", userId!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-votes", userId] });
      qc.invalidateQueries({ queryKey: ["poll-results", collectivityId] });
    },
  });

  // Helpers
  const myVotedOptions = (pollId: string): Set<string> =>
    new Set(myVotes.filter((v) => v.poll_id === pollId).map((v) => v.option_id));

  const hasVoted = (pollId: string) => myVotedOptions(pollId).size > 0;

  const totalVotes = (pollId: string) =>
    results
      .filter((r) => r.option_id && polls.find((p) => p.id === pollId)?.poll_options.some((o) => o.id === r.option_id))
      .reduce((acc, r) => acc + (r.vote_count ?? 0), 0);

  function getResults(poll: Poll) {
    return poll.poll_options
      .map((opt) => ({
        ...opt,
        count: results.find((r) => r.option_id === opt.id)?.vote_count ?? 0,
      }))
      .sort((a, b) => a.position - b.position);
  }

  function handleVote(poll: Poll, optionId: string) {
    if (!userId || poll.status !== "active") return;
    const voted = myVotedOptions(poll.id);
    const alreadyThis = voted.has(optionId);
    if (alreadyThis) {
      unvoteMutation.mutate({ pollId: poll.id, optionId });
    } else {
      voteMutation.mutate({
        pollId: poll.id,
        optionId,
        alreadyVotedOption: poll.poll_type === "single_choice" ? ([...voted][0] ?? null) : null,
        pollType: poll.poll_type,
      });
    }
  }

  // ── Gate ───────────────────────────────────────────────────────────────────

  if (authed === false) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Connexion requise</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour participer aux consultations.
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Me connecter
        </Link>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activePolls = polls.filter((p) => p.status === "active");
  const closedPolls = polls.filter((p) => p.status === "closed");

  return (
    <div className="space-y-5 px-4 pt-5 pb-24">
      <header>
        <h1 className="text-2xl font-bold">Consultations</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Exprimez-vous sur les projets de votre commune.
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : polls.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <BarChart2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold">Aucune consultation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre commune n'a pas encore publié de sondage.
          </p>
        </div>
      ) : (
        <>
          {/* Sondages actifs */}
          {activePolls.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                En cours
              </h2>
              {activePolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  results={getResults(poll)}
                  totalVotes={totalVotes(poll.id)}
                  votedOptions={myVotedOptions(poll.id)}
                  onVote={(optId) => handleVote(poll, optId)}
                  isMutating={voteMutation.isPending || unvoteMutation.isPending}
                  isAuthed={!!userId}
                />
              ))}
            </section>
          )}

          {/* Sondages fermés */}
          {closedPolls.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Terminés
              </h2>
              {closedPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  results={getResults(poll)}
                  totalVotes={totalVotes(poll.id)}
                  votedOptions={myVotedOptions(poll.id)}
                  onVote={() => {}}
                  isMutating={false}
                  isAuthed={!!userId}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ── PollCard ──────────────────────────────────────────────────────────────────

function PollCard({
  poll,
  results,
  totalVotes,
  votedOptions,
  onVote,
  isMutating,
  isAuthed,
}: {
  poll: Poll;
  results: { id: string; label: string; position: number; count: number }[];
  totalVotes: number;
  votedOptions: Set<string>;
  onVote: (optionId: string) => void;
  isMutating: boolean;
  isAuthed: boolean;
}) {
  const voted = votedOptions.size > 0;
  const isClosed = poll.status === "closed";
  const showResults = voted || isClosed;

  const daysLeft = poll.ends_at
    ? Math.max(0, Math.ceil((new Date(poll.ends_at).getTime() - Date.now()) / 86400_000))
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-snug">{poll.title}</h3>
          {isClosed ? (
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              <Lock className="h-3 w-3" />
              Fermé
            </span>
          ) : (
            daysLeft !== null && (
              <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <Clock className="h-3 w-3" />
                {daysLeft === 0 ? "Dernier jour" : `J-${daysLeft}`}
              </span>
            )
          )}
        </div>
        {poll.description && (
          <p className="mt-1 text-sm text-muted-foreground">{poll.description}</p>
        )}
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3" />
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          {poll.poll_type === "multiple_choice" && (
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0 text-[10px] text-blue-600 font-medium">
              Choix multiples
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="px-4 pb-4 space-y-2">
        {results.map((opt) => {
          const isMyVote = votedOptions.has(opt.id);
          const pct = totalVotes > 0 ? Math.round((opt.count / totalVotes) * 100) : 0;

          if (showResults) {
            // Résultats
            return (
              <div key={opt.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${isMyVote ? "text-primary" : ""}`}>
                    {isMyVote && <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 text-primary" />}
                    {opt.label}
                  </span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isMyVote ? "bg-primary" : "bg-border"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-right text-[10px] text-muted-foreground">
                  {opt.count} vote{opt.count !== 1 ? "s" : ""}
                </p>
              </div>
            );
          }

          // Bouton vote
          return (
            <button
              key={opt.id}
              type="button"
              disabled={isMutating || !isAuthed}
              onClick={() => onVote(opt.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                isMyVote
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-muted"
              } disabled:opacity-50`}
            >
              <span className="flex items-center gap-2">
                {isMyVote ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border-2 border-border" />
                )}
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vote CTA */}
      {!showResults && !isClosed && !isAuthed && (
        <div className="border-t border-border px-4 py-2.5">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldOff className="h-3.5 w-3.5" />
            Connectez-vous pour voter
          </p>
        </div>
      )}
    </div>
  );
}
