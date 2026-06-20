import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquare, Send, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/messagerie")({
  component: AdminMessageriePage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type Conversation = {
  id: string;
  subject: string;
  status: string;
  citizen_id: string;
  unread_admin: number;
  last_message_at: string | null;
  created_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  is_from_admin: boolean;
  content: string;
  read_at: string | null;
  created_at: string;
};

type CitizenProfile = {
  display_name: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)        return "à l'instant";
  if (diff < 3600)      return `${Math.floor(diff / 60)} min`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function groupByDate(messages: Message[]): { date: string; items: Message[] }[] {
  const groups: Record<string, Message[]> = {};
  for (const m of messages) {
    const key = new Date(m.created_at).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  return Object.entries(groups).map(([, items]) => ({
    date: fmtDate(items[0].created_at),
    items,
  }));
}

// ── Page ──────────────────────────────────────────────────────────────────────
function AdminMessageriePage() {
  const qc = useQueryClient();
  const [userId, setUserId]                 = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [ready, setReady]                   = useState(false);
  const [activeConvId, setActiveConvId]     = useState<string | null>(null);
  const [reply, setReply]                   = useState("");
  const [filter, setFilter]                 = useState<"open" | "closed">("open");
  const bottomRef                           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: ur } = await supabase
          .from("user_roles")
          .select("collectivity_id")
          .eq("user_id", uid)
          .in("role", ["admin", "moderator"])
          .limit(1)
          .single();
        setCollectivityId(ur?.collectivity_id ?? null);
      }
      setReady(true);
    });
  }, []);

  // ── Conversations ──────────────────────────────────────────────────────────
  const { data: conversations } = useQuery({
    queryKey: ["admin-conversations", collectivityId, filter],
    enabled: ready && !!collectivityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, subject, status, citizen_id, unread_admin, last_message_at, created_at")
        .eq("collectivity_id", collectivityId!)
        .eq("status", filter)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Profils citoyens (batch)
  const citizenIds = [...new Set((conversations ?? []).map((c) => c.citizen_id))];
  const { data: profiles } = useQuery({
    queryKey: ["admin-conv-profiles", citizenIds.join(",")],
    enabled: citizenIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", citizenIds);
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.id] = p.display_name ?? "Citoyen";
      return map;
    },
  });

  // ── Messages de la conversation active ─────────────────────────────────────
  const { data: messages } = useQuery({
    queryKey: ["admin-messages", activeConvId],
    enabled: !!activeConvId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Reset unread_admin
      supabase
        .from("conversations")
        .update({ unread_admin: 0 })
        .eq("id", activeConvId!)
        .then(() => qc.invalidateQueries({ queryKey: ["admin-conversations", collectivityId, filter] }));
      return data as Message[];
    },
  });

  // Scroll bottom
  useEffect(() => {
    if (messages?.length) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!activeConvId) return;
    const ch = supabase
      .channel(`admin-messages-${activeConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvId}` },
        () => qc.invalidateQueries({ queryKey: ["admin-messages", activeConvId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeConvId, qc]);

  useEffect(() => {
    if (!collectivityId) return;
    const ch = supabase
      .channel(`admin-conversations-${collectivityId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `collectivity_id=eq.${collectivityId}` },
        () => qc.invalidateQueries({ queryKey: ["admin-conversations", collectivityId, filter] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [collectivityId, filter, qc]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const sendReply = useMutation({
    mutationFn: async (content: string) => {
      if (!userId || !activeConvId) throw new Error();
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConvId,
        sender_id:       userId,
        is_from_admin:   true,
        content:         content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin-messages", activeConvId] });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-conversations", collectivityId, filter] });
      setActiveConvId(null);
    },
  });

  const activeConv    = conversations?.find((c) => c.id === activeConvId);
  const citizenName   = activeConv ? (profiles?.[activeConv.citizen_id] ?? "Citoyen") : "";
  const totalUnread   = (conversations ?? []).reduce((s, c) => s + c.unread_admin, 0);

  // ── Vue fil de messages ────────────────────────────────────────────────────
  if (activeConvId && activeConv) {
    return (
      <div className="flex h-[100dvh] flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setActiveConvId(null)}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{activeConv.subject}</p>
            <p className="text-xs text-muted-foreground">{citizenName}</p>
          </div>
          {/* Toggle statut */}
          {activeConv.status === "open" ? (
            <button
              onClick={() => toggleStatus.mutate({ id: activeConv.id, status: "closed" })}
              className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Fermer
            </button>
          ) : (
            <button
              onClick={() => toggleStatus.mutate({ id: activeConv.id, status: "open" })}
              className="shrink-0 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
            >
              Rouvrir
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!messages?.length ? (
            <p className="text-center text-sm text-muted-foreground">Aucun message.</p>
          ) : (
            groupByDate(messages).map(({ date, items }) => (
              <div key={date}>
                <div className="my-4 flex items-center gap-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-muted-foreground">{date}</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                {items.map((msg) => {
                  const isAdmin = msg.is_from_admin;
                  return (
                    <div
                      key={msg.id}
                      className={`mb-2 flex ${isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isAdmin
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-muted text-foreground"
                        }`}
                      >
                        {!isAdmin && (
                          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                            {citizenName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                          isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}>
                          {fmtTime(msg.created_at)}
                          {isAdmin && msg.read_at && <CheckCheck className="h-3 w-3" />}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Zone de réponse */}
        {activeConv.status === "open" ? (
          <div className="border-t border-border bg-background px-4 py-3 pb-safe">
            <div className="flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && reply.trim()) {
                    e.preventDefault();
                    sendReply.mutate(reply);
                  }
                }}
                placeholder="Répondre au citoyen…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-input bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                style={{ maxHeight: "120px", overflowY: "auto" }}
              />
              <button
                onClick={() => reply.trim() && sendReply.mutate(reply)}
                disabled={!reply.trim() || sendReply.isPending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
            Conversation fermée.
          </div>
        )}
      </div>
    );
  }

  // ── Vue liste ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Messagerie</h1>
            <p className="text-xs text-muted-foreground">
              {totalUnread > 0 ? `${totalUnread} non lu${totalUnread > 1 ? "s" : ""}` : "Toutes les conversations"}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="mt-2 flex gap-1">
          {(["open", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {f === "open" ? "En cours" : "Fermées"}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {!conversations?.length ? (
        <div className="mx-4 mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {filter === "open" ? "Aucune conversation en cours." : "Aucune conversation fermée."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => setActiveConvId(conv.id)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
                  👤
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted-foreground">
                        {profiles?.[conv.citizen_id] ?? "Citoyen"}
                      </p>
                      <p className={`truncate text-sm ${conv.unread_admin > 0 ? "font-bold" : "font-medium"}`}>
                        {conv.subject}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {conv.last_message_at ? timeAgo(conv.last_message_at) : timeAgo(conv.created_at)}
                      </span>
                      {conv.unread_admin > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {conv.unread_admin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
