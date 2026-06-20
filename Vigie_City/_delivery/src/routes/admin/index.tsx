import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  FileText,
  Megaphone,
  Loader2,
  Lock,
  Newspaper,
  AlertTriangle,
  CalendarDays,
  MapPin,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Administration — VigieCity" }] }),
  component: AdminIndex,
});

type NavItem = {
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: number;
};

function AdminIndex() {
  const [userId, setUserId] = useState<string | null>(null);
  const [collectivityId, setCollectivityId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setAuthed(!!data.user);
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
    });
  }, []);

  const { data: role } = useQuery({
    queryKey: ["user-role", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role, collectivity_id")
        .eq("user_id", userId!)
        .in("role", ["moderator", "admin"]);
      return data ?? [];
    },
  });

  // Badge non-lus messagerie
  const { data: unreadCount } = useQuery({
    queryKey: ["admin-unread-total", collectivityId],
    enabled: !!collectivityId,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("unread_admin")
        .eq("collectivity_id", collectivityId!)
        .eq("status", "open")
        .gt("unread_admin", 0);
      return (data ?? []).reduce((s, c) => s + c.unread_admin, 0);
    },
    refetchInterval: 30_000,
  });

  const isMod = (role?.length ?? 0) > 0;

  if (authed === false || (authed && !isMod && role !== undefined)) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Droits modérateur requis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre compte n'a pas encore les droits modérateur. Contactez l'administrateur
          de votre commune ou Baptiste à{" "}
          <a href="mailto:admin@vigiecity.fr" className="underline hover:text-foreground">
            admin@vigiecity.fr
          </a>
          .
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (authed === null || (authed && role === undefined)) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const navItems: NavItem[] = [
    {
      to: "/admin/signalements",
      label: "Signalements",
      description: "Modérer les signalements en attente",
      icon: (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
          <FileText className="h-5 w-5 text-warning-foreground" />
        </div>
      ),
    },
    {
      to: "/admin/alertes",
      label: "Alertes",
      description: "Diffuser un message à votre commune",
      icon: (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sos/10">
          <Megaphone className="h-5 w-5 text-sos" />
        </div>
      ),
    },
    {
      to: "/admin/publications",
      label: "Publications",
      description: "Actualités et communiqués de la mairie",
      icon: (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Newspaper className="h-5 w-5 text-primary" />
        </div>
      ),
    },
    {
      to: "/admin/urgences",
      label: "Urgences",
      description: "Numéros utiles et contacts d'urgence",
      icon: (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
      ),
    },
    {
      to: "/admin/evenements",
      label: "Événements",
      description: "Agenda des événements locaux",
      icon: (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
          <CalendarDays className="h-5 w-5 text-violet-600" />
        </div>
      ),
    },
    {
      to: "/admin/services",
      label: "Services locaux",
      description: "Lieux et services de la commune",
      icon: (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
          <MapPin className="h-5 w-5 text-emerald-600" />
        </div>
      ),
    },
    {
      to: "/admin/messagerie",
      label: "Messagerie",
      description: "Conversations avec les citoyens",
      icon: (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10">
          <MessageSquare className="h-5 w-5 text-sky-600" />
        </div>
      ),
      badge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  return (
    <div className="space-y-6 px-4 pt-5">
      <header>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Administration</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Modération et gestion de votre commune.
        </p>
      </header>

      <nav className="grid gap-3">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to as any}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:bg-muted"
          >
            {item.icon}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            {item.badge != null && (
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
