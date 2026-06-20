import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Send, X, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/messagerie")({
  head: () => ({
    meta: [{ title: "Messagerie — VigieCity" }],
  }),
  component: MessageriePage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type Conversation = {
  id: string;
  subject: string;
  status: string;
  unread_citizen: number;
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
function MessageriePage() {
  const qc = useQueryClient();
  const [userId, setUserId]                 = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [profileReady, setProfileReady]     = useState(false);
  const [activeConvId, setActiveConvId]     = useState<string | null>(null);
  const [newSubject, setNewSubject]         = useState("");
  const [newMessage, setNewMessage]         = useState("");
  const [newDialogOpen, setNewDialogOpen]   = useState(false);
  const [newFirstMsg, setNewFirstMsg]       = useState("");
  const [sending, setSending]               = useState(false);
  const bottomRef                           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", uid)
          .single();
        setCollectivityId(profile?.collectivity_id ?? null);
      }
      setProfileReady(true);
    });
  }, []);

  // ── Conversations ──────────────────────────────────────────────────────────
  const { data: conversations } = useQuery({
    queryKey: ["conversations", userId],
    enabled: profileReady && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, subject, status, unread_citizen, last_message_at, created_at")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });

  // ── Messages de la conversation active ─────────────────────────────────────
  const { data: messages } = useQuery({
    queryKey: ["messages", activeConvId],
    enabled: !!activeConvId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Marquer comme lu (reset unread_citizen)
      supabase
        .from("conversations")
        .update({ unread_citizen: 0 })
        .eq("id", activeConvId!)
        .then(() => qc.invalidateQueries({ queryKey: ["conversations", userId] }));
      return data as Message[];
    },
  });

  // Scroll to bottom quand les messages changent
  useEffect(() => {
    if (messages?.length) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages]);

  // Realtime messages
  useEffect(() => {
    if (!activeConvId) return;
    const channel = supabase
      .channel(`messages-${activeConvId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvId}` },
        () => qc.invalidateQueries({ queryKey: ["messages", activeConvId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvId, qc]);

  // Realtime conversations
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`conversations-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => qc.invalidateQueries({ queryKey: ["conversations", userId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);

  // ── Envoyer un message ─────────────────────────────────────────────────────
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!userId || !activeConvId) throw new Error("Missing context");
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConvId,
        sender_id:       userId,
        is_from_admin:   false,
        content:         content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      qc.invalidateQueries({ queryKey: ["messages", activeConvId] });
    },
  });

  // ── Créer une nouvelle conversation ───────────────────────────────────────
  async function createConversation() {
    if (!newSubject.trim() || !newFirstMsg.trim() || !userId || !collectivityId) return;
    setSending(true);
    try {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          citizen_id:      userId,
          collectivity_id: collectivityId,
          subject:         newSubject.trim(),
        })
        .select("id")
        .single();
      if (convErr || !conv) throw convErr;

      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id:       userId,
        is_from_admin:   false,
        content:         newFirstMsg.trim(),
      });
      if (msgErr) throw msgErr;

      qc.invalidateQueries({ queryKey: ["conversations", userId] });
      setNewDialogOpen(false);
      setNewSubject("");
      setNewFirstMsg("");
      setActiveConvId(conv.id);
    } finally {
      setSending(false);
    }
  }

  const activeConv = conversations?.find((c) => c.id === activeConvId);

  // ── Vue fil de messages ────────────────────────────────────────────────────
  if (activeConvId && activeConv) {
    return (
      <div className="flex h-[100dvh] flex-col">
        {/* Header conversation */}
        <div className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setActiveConvId(null)}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{activeConv.subject}</p>
            <p className="text-xs text-muted-foreground">
              {activeConv.status === "open" ? "Ouvert" : "Fermé"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!messages?.length ? (
            <p className="text-center text-sm text-muted-foreground">Aucun message.</p>
          ) : (
            groupByDate(messages).map(({ date, items }) => (
              <div key={date}>
                {/* Séparateur date */}
                <div className="my-4 flex items-center gap-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-muted-foreground">{date}</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                {items.map((msg) => {
                  const isMe = !msg.is_from_admin;
                  return (
                    <div
                      key={msg.id}
                      className={`mb-2 flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-muted text-foreground"
                        }`}
                      >
                        {!isMe && (
                          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                            Mairie
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {fmtTime(msg.created_at)}
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

        {/* Zone de saisie */}
        {activeConv.status === "open" ? (
          <div className="border-t border-border bg-background px-4 py-3 pb-safe">
            <div className="flex items-end gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                    e.preventDefault();
                    sendMessage.mutate(newMessage);
                  }
                }}
                placeholder="Votre message…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-input bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                style={{ maxHeight: "120px", overflowY: "auto" }}
              />
              <button
                onClick={() => newMessage.trim() && sendMessage.mutate(newMessage)}
                disabled={!newMessage.trim() || sendMessage.isPending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
            Cette conversation est fermée.
          </div>
        )}
      </div>
    );
  }

  // ── Vue liste des conversations ────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold">Messagerie</h1>
          <p className="text-xs text-muted-foreground">Échangez avec votre mairie</p>
        </div>
        <button
          onClick={() => setNewDialogOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Nouveau
        </button>
      </div>

      {/* Pas de compte */}
      {!profileReady ? null : !userId ? (
        <div className="px-4 pt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour accéder à la messagerie.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex items-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Me connecter
          </Link>
        </div>
      ) : !conversations?.length ? (
        <div className="mx-4 mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">Aucune conversation</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Envoyez un message à votre mairie pour commencer.
          </p>
          <button
            onClick={() => setNewDialogOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Nouveau message
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => setActiveConvId(conv.id)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
              >
                {/* Avatar */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl">
                  🏛️
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold leading-tight">{conv.subject}</p>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {conv.last_message_at ? timeAgo(conv.last_message_at) : timeAgo(conv.created_at)}
                      </span>
                      {conv.unread_citizen > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {conv.unread_citizen}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        conv.status === "open" ? "bg-emerald-500" : "bg-muted-foreground"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {conv.status === "open" ? "Ouvert" : "Fermé"}
                    </span>
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Dialog nouvelle conversation */}
      {newDialogOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setNewDialogOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card shadow-xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="px-4 pb-8 pt-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Nouveau message</h2>
                <button
                  onClick={() => setNewDialogOpen(false)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Objet *</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Problème de voirie, demande d'info…"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Message *</label>
                  <textarea
                    value={newFirstMsg}
                    onChange={(e) => setNewFirstMsg(e.target.value)}
                    placeholder="Décrivez votre demande…"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setNewDialogOpen(false)}
                    className="flex-1 rounded-xl border border-border py-3 text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createConversation}
                    disabled={sending || !newSubject.trim() || !newFirstMsg.trim()}
                    className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {sending ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
