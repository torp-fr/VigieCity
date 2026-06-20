import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquare, Send, CheckCheck, Plus, X, GripVertical, Settings, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/messagerie")({
  component: AdminMessageriePage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type MairieService = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type Conversation = {
  id: string;
  subject: string;
  status: string;
  citizen_id: string;
  unread_admin: number;
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
function AdminMessageriePage() {
  const qc = useQueryClient();
  const [userId, setUserId]                 = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [ready, setReady]                   = useState(false);

  // Navigation
  const [tab, setTab]                 = useState<"messages" | "services">("messages");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [filter, setFilter]           = useState<"open" | "closed">("open");
  const [filterServiceId, setFilterServiceId] = useState<string>("");

  // Messagerie
  const [reply, setReply]   = useState("");
  const bottomRef           = useRef<HTMLDivElement>(null);

  // Services form
  const [svcDialog, setSvcDialog]   = useState(false);
  const [editSvc, setEditSvc]       = useState<MairieService | null>(null);
  const [svcName, setSvcName]       = useState("");
  const [svcDesc, setSvcDesc]       = useState("");
  const [svcActive, setSvcActive]   = useState(true);

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

  // ── Services ──────────────────────────────────────────────────────────────
  const { data: services } = useQuery({
    queryKey: ["admin-mairie-services", collectivityId],
    enabled: ready && !!collectivityId,
    queryFn: async () => {
      const { data } = await supabase
        .from("mairie_services")
        .select("*")
        .eq("collectivity_id", collectivityId!)
        .order("sort_order");
      return (data ?? []) as MairieService[];
    },
  });

  // ── Conversations ──────────────────────────────────────────────────────────
  const { data: conversations } = useQuery({
    queryKey: ["admin-conversations", collectivityId, filter, filterServiceId],
    enabled: ready && !!collectivityId,
    queryFn: async () => {
      let q = supabase
        .from("conversations")
        .select("id, subject, status, citizen_id, unread_admin, last_message_at, created_at, mairie_service_id, mairie_services(name)")
        .eq("collectivity_id", collectivityId!)
        .eq("status", filter)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (filterServiceId) q = q.eq("mairie_service_id", filterServiceId);
      const { data, error } = await q;
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
      const { data } = await supabase.from("profiles").select("id, display_name").in("id", citizenIds);
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.id] = p.display_name ?? "Citoyen";
      return map;
    },
  });

  // ── Messages ──────────────────────────────────────────────────────────────
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
      supabase.from("conversations").update({ unread_admin: 0 }).eq("id", activeConvId!)
        .then(() => qc.invalidateQueries({ queryKey: ["admin-conversations", collectivityId, filter, filterServiceId] }));
      return data as Message[];
    },
  });

  useEffect(() => {
    if (messages?.length) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!activeConvId) return;
    const ch = supabase.channel(`admin-msg-${activeConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvId}` },
        () => qc.invalidateQueries({ queryKey: ["admin-messages", activeConvId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeConvId, qc]);

  useEffect(() => {
    if (!collectivityId) return;
    const ch = supabase.channel(`admin-convs-${collectivityId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `collectivity_id=eq.${collectivityId}` },
        () => qc.invalidateQueries({ queryKey: ["admin-conversations", collectivityId, filter, filterServiceId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [collectivityId, filter, filterServiceId, qc]);

  // ── Mutations messagerie ──────────────────────────────────────────────────
  const sendReply = useMutation({
    mutationFn: async (content: string) => {
      if (!userId || !activeConvId || !activeConv) throw new Error();
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConvId,
        sender_id:       userId,
        is_from_admin:   true,
        content:         content.trim(),
      });
      if (error) throw error;
      // Notifier le citoyen (best-effort, non bloquant)
      supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: activeConv.citizen_id,
          title:   `🏛️ Réponse : ${activeConv.subject}`,
          message: content.length > 80 ? content.slice(0, 77) + "…" : content,
          url:     "/messagerie",
        },
      }).catch(() => {});
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin-messages", activeConvId] });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("conversations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-conversations", collectivityId, filter, filterServiceId] });
      setActiveConvId(null);
    },
  });

  // ── Mutations services ────────────────────────────────────────────────────
  const saveService = useMutation({
    mutationFn: async () => {
      if (!collectivityId || !svcName.trim()) throw new Error();
      if (editSvc) {
        const { error } = await supabase.from("mairie_services")
          .update({ name: svcName.trim(), description: svcDesc.trim() || null, is_active: svcActive })
          .eq("id", editSvc.id);
        if (error) throw error;
      } else {
        const nextOrder = (services?.length ?? 0);
        const { error } = await supabase.from("mairie_services").insert({
          collectivity_id: collectivityId,
          name:            svcName.trim(),
          description:     svcDesc.trim() || null,
          is_active:       svcActive,
          sort_order:      nextOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mairie-services", collectivityId] });
      setSvcDialog(false);
      setSvcName(""); setSvcDesc(""); setSvcActive(true); setEditSvc(null);
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mairie_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-mairie-services", collectivityId] }),
  });

  const toggleServiceActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("mairie_services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-mairie-services", collectivityId] }),
  });

  function openNewService() {
    setEditSvc(null); setSvcName(""); setSvcDesc(""); setSvcActive(true); setSvcDialog(true);
  }
  function openEditService(s: MairieService) {
    setEditSvc(s); setSvcName(s.name); setSvcDesc(s.description ?? ""); setSvcActive(s.is_active); setSvcDialog(true);
  }

  const activeConv      = conversations?.find((c) => c.id === activeConvId);
  const citizenName     = activeConv ? (profiles?.[activeConv.citizen_id] ?? "Citoyen") : "";
  const activeServiceNm = activeConv?.mairie_services?.name ?? null;
  const totalUnread     = (conversations ?? []).reduce((s, c) => s + c.unread_admin, 0);

  // ── Vue fil de messages ────────────────────────────────────────────────────
  if (activeConvId && activeConv) {
    return (
      <div className="flex h-[100dvh] flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button onClick={() => setActiveConvId(null)} className="rounded-full p-2 text-muted-foreground hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{activeConv.subject}</p>
            <p className="text-xs text-muted-foreground">
              {citizenName}
              {activeServiceNm && ` · ${activeServiceNm}`}
            </p>
          </div>
          {activeConv.status === "open" ? (
            <button onClick={() => toggleStatus.mutate({ id: activeConv.id, status: "closed" })}
              className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              Fermer
            </button>
          ) : (
            <button onClick={() => toggleStatus.mutate({ id: activeConv.id, status: "open" })}
              className="shrink-0 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              Rouvrir
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
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
                const isAdmin = msg.is_from_admin;
                return (
                  <div key={msg.id} className={`mb-2 flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isAdmin ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"
                    }`}>
                      {!isAdmin && <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{citizenName}</p>}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {fmtTime(msg.created_at)}
                        {isAdmin && msg.read_at && <CheckCheck className="h-3 w-3" />}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {activeConv.status === "open" ? (
          <div className="border-t border-border bg-background px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
            <div className="flex items-end gap-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && reply.trim()) { e.preventDefault(); sendReply.mutate(reply); } }}
                placeholder="Répondre au citoyen…" rows={1}
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
            Conversation fermée.
          </div>
        )}
      </div>
    );
  }

  // ── Vue principale (tabs) ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Messagerie</h1>
            <p className="text-xs text-muted-foreground">
              {tab === "messages"
                ? totalUnread > 0 ? `${totalUnread} non lu${totalUnread > 1 ? "s" : ""}` : "Toutes les conversations"
                : `${services?.length ?? 0} service${(services?.length ?? 0) > 1 ? "s" : ""} configuré${(services?.length ?? 0) > 1 ? "s" : ""}`}
            </p>
          </div>
          {tab === "services" && (
            <button onClick={openNewService}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          )}
        </div>

        {/* Onglets */}
        <div className="mt-2 flex gap-1">
          <button onClick={() => setTab("messages")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold transition-colors ${
              tab === "messages" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
            <Inbox className="h-3.5 w-3.5" /> Messages
          </button>
          <button onClick={() => setTab("services")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold transition-colors ${
              tab === "services" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
            <Settings className="h-3.5 w-3.5" /> Services
          </button>
        </div>
      </div>

      {/* ── Onglet Messages ─────────────────────────────────────────────── */}
      {tab === "messages" && (
        <>
          {/* Filtres statut + service */}
          <div className="flex gap-1 border-b border-border px-4 py-2">
            {(["open", "closed"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                {f === "open" ? "En cours" : "Fermées"}
              </button>
            ))}
            {(services?.length ?? 0) > 0 && (
              <select value={filterServiceId} onChange={(e) => setFilterServiceId(e.target.value)}
                className="ml-auto rounded-xl border border-border bg-background px-2 py-1 text-xs outline-none">
                <option value="">Tous les services</option>
                {services?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>

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
                  <button onClick={() => setActiveConvId(conv.id)}
                    className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-xl">👤</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs text-muted-foreground">{profiles?.[conv.citizen_id] ?? "Citoyen"}</p>
                          {conv.mairie_services?.name && (
                            <span className="mb-0.5 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                              {conv.mairie_services.name}
                            </span>
                          )}
                          <p className={`truncate text-sm ${conv.unread_admin > 0 ? "font-bold" : "font-medium"}`}>{conv.subject}</p>
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
        </>
      )}

      {/* ── Onglet Services ─────────────────────────────────────────────── */}
      {tab === "services" && (
        <div className="px-4 py-4">
          {!services?.length ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <Settings className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">Aucun service configuré</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Créez des services pour permettre aux citoyens de choisir le bon destinataire.
              </p>
              <button onClick={openNewService}
                className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" /> Créer un service
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {services.map((svc) => (
                <li key={svc.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{svc.name}</p>
                    {svc.description && <p className="text-xs text-muted-foreground">{svc.description}</p>}
                  </div>
                  {/* Toggle actif */}
                  <button
                    onClick={() => toggleServiceActive.mutate({ id: svc.id, is_active: !svc.is_active })}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                      svc.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {svc.is_active ? "Actif" : "Inactif"}
                  </button>
                  <button onClick={() => openEditService(svc)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteService.mutate(svc.id)}
                    className="rounded-full p-1.5 text-destructive hover:bg-destructive/10">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Les citoyens voient uniquement les services actifs. Sans service configuré, les messages arrivent sans destinataire.
          </p>
        </div>
      )}

      {/* Dialog service */}
      {svcDialog && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSvcDialog(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card shadow-xl">
            <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-border" /></div>
            <div className="px-4 pb-8 pt-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{editSvc ? "Modifier le service" : "Nouveau service"}</h2>
                <button onClick={() => setSvcDialog(false)} className="rounded-full p-2 text-muted-foreground hover:bg-accent">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nom du service *</label>
                  <input value={svcName} onChange={(e) => setSvcName(e.target.value)}
                    placeholder="ex : Urbanisme, Voirie, Social…"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Description (optionnelle)</label>
                  <input value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)}
                    placeholder="Courte description pour les citoyens"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <input type="checkbox" checked={svcActive} onChange={(e) => setSvcActive(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary" />
                  <div>
                    <p className="text-sm font-medium">Service actif</p>
                    <p className="text-xs text-muted-foreground">Visible par les citoyens dans le formulaire</p>
                  </div>
                </label>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setSvcDialog(false)} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium">
                    Annuler
                  </button>
                  <button onClick={() => saveService.mutate()} disabled={!svcName.trim() || saveService.isPending}
                    className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {saveService.isPending ? "Enregistrement…" : "Enregistrer"}
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
