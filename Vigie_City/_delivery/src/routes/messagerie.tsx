import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquare, Send, CheckCheck, Plus, X, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/messagerie")({
  component: MessageriePage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type MairieService = {
  id: string;
  name: string;
  description: string | null;
};

type Conversation = {
  id: string;
  subject: string;
  status: string;
  citizen_id: string;
  unread_citizen: number;
  last_message_at: string | null;
  created_at: string;
  mairie_service_id: string | null;
  mairie_services: { name: string } | null;
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
  return Object.entries(groups).map(([, items]) => ({ date: fmtDate(items[0].created_at), items }));
}

// ── Page ──────────────────────────────────────────────────────────────────────
function MessageriePage() {
  const qc = useQueryClient();
  const [userId, setUserId]                 = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [ready, setReady]                   = useState(false);

  const [activeConvId, setActiveConvId]     = useState<string | null>(null);
  const [newDialog, setNewDialog]           = useState(false);
  const [newSubject, setNewSubject]         = useState("");
  const [newContent, setNewContent]         = useState("");
  const [newServiceId, setNewServiceId]     = useState<string>("");
  const [reply, setReply]                   = useState("");
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
      setReady(true);
    });
  }, []);

  // ── Services disponibles (pour le picker) ────────────────────────────────
  const { data: services } = useQuery({
    queryKey: ["citizen-mairie-services", collectivityId],
    enabled: ready && !!collectivityId,
    queryFn: async () => {
      const { data } = await supabase
        .from("mairie_services")
        .select("id, name, description")
        .eq("collectivity_id", collectivityId!)
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as MairieService[];
    },
  });

  const hasServices = (services?.length ?? 0) > 0;

  // ── Conversations ─────────────────────────────────────────────────────────
  const { data: conversations } = useQuery({
    queryKey: ["citizen-conversations", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, subject, status, citizen_id, unread_citizen, last_message_at, created_at, mairie_service_id, mairie_services(name)")
        .eq("citizen_id", userId!)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });

  // ── Messages ──────────────────────────────────────────────────────────────
  const { data: messages } = useQuery({
    queryKey: ["citizen-messages", activeConvId],
    enabled: !!activeConvId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      // reset unread
      supabase.from("conversations").update({ unread_citizen: 0 }).eq("id", activeConvId!)
        .then(() => qc.invalidateQueries({ queryKey: ["citizen-conversations", userId] }));
      return data as Message[];
    },
  });

  useEffect(() => {
    if (messages?.length) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!activeConvId) return;
    const ch = supabase.channel(`citizen-msg-${activeConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvId}` },
        () => qc.invalidateQueries({ queryKey: ["citizen-messages", activeConvId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeConvId, qc]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`citizen-convs-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `citizen_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["citizen-conversations", userId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createConversation = useMutation({
    mutationFn: async () => {
      if (!userId || !collectivityId || !newSubject.trim() || !newContent.trim()) throw new Error();
      const { data: conv, error: e1 } = await supabase.from("conversations").insert({
        citizen_id:        userId,
        collectivity_id:   collectivityId,
        subject:           newSubject.trim(),
        mairie_service_id: newServiceId || null,
      }).select("id").single();
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id:       userId,
        is_from_admin:   false,
        content:         newContent.trim(),
      });
      if (e2) throw e2;
      return conv.id as string;
    },
    onSuccess: (convId) => {
      setNewDialog(false);
      setNewSubject(""); setNewContent(""); setNewServiceId("");
      qc.invalidateQueries({ queryKey: ["citizen-conversations", userId] });
      setActiveConvId(convId);
    },
  });

  const sendReply = useMutation({
    mutationFn: async (content: string) => {
      if (!userId || !activeConvId) throw new Error();
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConvId,
        sender_id:       userId,
        is_from_admin:   false,
        content:         content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["citizen-messages", activeConvId] });
    },
  });

  const activeConv        = conversations?.find((c) => c.id === activeConvId);
  const activeServiceName = activeConv?.mairie_services?.name ?? null;
  const totalUnread       = (conversations ?? []).reduce((s, c) => s + c.unread_citizen, 0);

  // ── Vue fil de messages ───────────────────────────────────────────────────
  if (activeConvId && activeConv) {
    return (
      <div className="flex h-[100dvh] flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button onClick={() => setActiveConvId(null)} className="rounded-full p-2 text-muted-foreground hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{activeConv.subject}</p>
            <p className="text-xs text-muted-foreground">
              {activeServiceName ? activeServiceName : "Mairie"}
              {activeConv.status === "closed" && " · Fermée"}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            activeConv.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
          }`}>
            {activeConv.status === "open" ? "En cours" : "Fermée"}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeServiceName && (
            <div className="mb-4 flex justify-center">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                Service : {activeServiceName}
              </span>
            </div>
          )}
          {!messages?.length ? (
            <p className="text-center text-sm text-muted-foreground">Aucun message.</p>
          ) : groupByDate(messages).map(({ date, items }) => (
            <div key={date}>
              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">{date}</span>
                <div className="flex-1 border-t border-border" />
              </div>
              {items.map((msg) => {
                const isMine = !msg.is_from_admin;
                return (
                  <div key={msg.id} className={`mb-2 flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isMine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"
                    }`}>
                      {!isMine && <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                        {activeServiceName ?? "Mairie"}
                      </p>}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {fmtTime(msg.created_at)}
                        {isMine && msg.read_at && <CheckCheck className="h-3 w-3" />}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Zone de saisie */}
        {activeConv.status === "open" ? (
          <div className="border-t border-border bg-background px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
            <div className="flex items-end gap-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && reply.trim()) { e.preventDefault(); sendReply.mutate(reply); } }}
                placeholder="Votre message…" rows={1}
                className="flex-1 resize-none rounded-xl border border-input bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                style={{ maxHeight: "120px", overflowY: "auto" }} />
              <button onClick={() => reply.trim() && sendReply.mutate(reply)}
                disabled={!reply.trim() || sendReply.isPending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
            Cette conversation a été fermée par la mairie.
          </div>
        )}
      </div>
    );
  }

  // ── Vue liste ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Header avec bouton retour */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="rounded-full p-2 text-muted-foreground hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Messagerie</h1>
              <p className="text-xs text-muted-foreground">
                {totalUnread > 0 ? `${totalUnread} nouveau${totalUnread > 1 ? "x" : ""}` : "Vos messages avec la mairie"}
              </p>
            </div>
          </div>
          <button onClick={() => setNewDialog(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Nouveau
          </button>
        </div>
      </div>

      {/* Liste conversations */}
      {!conversations?.length ? (
        <div className="mx-4 mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">Aucun message</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Envoyez un message à votre mairie pour une demande ou une question.
          </p>
          <button onClick={() => setNewDialog(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Nouveau message
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button onClick={() => setActiveConvId(conv.id)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${
                  conv.unread_citizen > 0 ? "bg-primary/10" : "bg-muted"
                }`}>
                  🏛️
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {conv.mairie_services?.name && (
                        <span className="mb-0.5 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                          {conv.mairie_services.name}
                        </span>
                      )}
                      <p className={`truncate text-sm ${conv.unread_citizen > 0 ? "font-bold" : "font-medium"}`}>
                        {conv.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conv.status === "closed" ? "Fermée" : "En cours"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {conv.last_message_at ? timeAgo(conv.last_message_at) : timeAgo(conv.created_at)}
                      </span>
                      {conv.unread_citizen > 0 ? (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {conv.unread_citizen}
                        </span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Dialog nouveau message */}
      {newDialog && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setNewDialog(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card shadow-xl">
            <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-border" /></div>
            <div className="px-4 pb-8 pt-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Nouveau message</h2>
                <button onClick={() => setNewDialog(false)} className="rounded-full p-2 text-muted-foreground hover:bg-accent">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {/* Sélecteur de service — uniquement si services configurés */}
                {hasServices && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Service concerné</label>
                    <select value={newServiceId} onChange={(e) => setNewServiceId(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary">
                      <option value="">— Sélectionner un service (optionnel) —</option>
                      {services!.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}{s.description ? ` – ${s.description}` : ""}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium">Objet *</label>
                  <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Objet de votre demande"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Message *</label>
                  <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Décrivez votre demande…" rows={4}
                    className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setNewDialog(false)}
                    className="flex-1 rounded-xl border border-border py-3 text-sm font-medium">
                    Annuler
                  </button>
                  <button
                    onClick={() => createConversation.mutate()}
                    disabled={!newSubject.trim() || !newContent.trim() || createConversation.isPending}
                    className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {createConversation.isPending ? "Envoi…" : "Envoyer"}
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
