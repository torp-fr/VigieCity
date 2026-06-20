import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  FileText,
  Megaphone,
  Loader2,
  Lock,
  Radio,
  AlertTriangle,
  MessageSquare,
  BookOpen,
  Calendar,
  Wrench,
  Phone,
  Building2,
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
  color: string;
};

const communeNavItems: NavItem[] = [
  {
    to: "/admin/signalements",
    label: "Signalements",
    description: "Modérer les signalements en attente",
    icon: <FileText className="h-5 w-5" />,
    color: "bg-warning/10 text-warning-foreground",
  },
  {
    to: "/admin/alertes",
    label: "Créer une alerte",
    description: "Diffuser un message à votre commune",
    icon: <Megaphone className="h-5 w-5 text-sos" />,
    color: "bg-sos/10",
  },
  {
    to: "/admin/publications",
    label: "Publications",
    description: "Actualités et informations locales",
    icon: <BookOpen className="h-5 w-5 text-primary" />,
    color: "bg-primary/10",
  },
  {
    to: "/admin/evenements",
    label: "Événements",
    description: "Agenda des événements communaux",
    icon: <Calendar className="h-5 w-5 text-violet-500" />,
    color: "bg-violet-100",
  },
  {
    to: "/admin/messagerie",
    label: "Messagerie",
    description: "Messages citoyens et services",
    icon: <MessageSquare className="h-5 w-5 text-sky-500" />,
    color: "bg-sky-100",
  },
  {
    to: "/admin/services",
    label: "Services",
    description: "Guichet numérique et lieux",
    icon: <Wrench className="h-5 w-5 text-emerald-600" />,
    color: "bg-emerald-100",
  },
  {
    to: "/admin/urgences",
    label: "Numéros d'urgence",
    description: "Contacts locaux configurables",
    icon: <Phone className="h-5 w-5 text-red-500" />,
    color: "bg-red-100",
  },
  {
    to: "/admin/radio",
    label: "Radio locale",
    description: "Flux audio diffusés aux citoyens",
    icon: <Radio className="h-5 w-5 text-purple-500" />,
    color: "bg-purple-100",
  },
];

function AdminIndex() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const { data: roles } = useQuery({
    queryKey: ["user-roles-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role, collectivity_id, epci_id")
        .eq("user_id", userId!);
      return data ?? [];
    },
  });

  const isEpciAdmin = roles?.some((r) => r.role === "epci_admin");
  const isCommuneAdmin = roles?.some((r) =>
    ["admin", "moderator"].includes(r.role),
  );
  const isSuperAdmin = roles?.some((r) => r.role === "super_admin");

  // Redirection automatique pour les epci_admin purs (sans rôle commune)
  useEffect(() => {
    if (roles === undefined) return;
    if (isEpciAdmin && !isCommuneAdmin && !isSuperAdmin) {
      navigate({ to: "/admin/epci" });
    }
  }, [roles, isEpciAdmin, isCommuneAdmin, isSuperAdmin, navigate]);

  // ── Chargement ───────────────────────────────────────────────────────────────
  if (authed === null || roles === undefined) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Accès refusé ─────────────────────────────────────────────────────────────
  if (authed === false || (!isCommuneAdmin && !isEpciAdmin && !isSuperAdmin)) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Droits modérateur requis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre compte n'a pas encore les droits modérateur. Contactez
          l'administrateur de votre commune ou Baptiste à{" "}
          <a
            href="mailto:admin@vigiecity.fr"
            className="underline hover:text-foreground"
          >
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

  return (
    <div className="space-y-6 px-4 pt-5">
      <header>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Administration</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Modération et gestion des alertes de votre commune.
        </p>
      </header>

      {/* Lien EPCI si l'utilisateur a les deux rôles */}
      {isEpciAdmin && (
        <Link
          to="/admin/epci"
          className="flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-card transition hover:bg-blue-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-blue-800">
              Tableau de bord intercommunal
            </p>
            <p className="text-xs text-blue-600">
              Gérer vos communes et leurs administrateurs
            </p>
          </div>
        </Link>
      )}

      {/* Nav commune (admin / moderator) */}
      {(isCommuneAdmin || isSuperAdmin) && (
        <nav className="grid gap-3">
          {communeNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to as any}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:bg-muted"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${item.color}`}
              >
                {item.icon}
              </div>
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </nav>
      )}

      {/* Avertissement modérateur sans commune */}
      {isCommuneAdmin && !roles?.some((r) => r.collectivity_id) && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
          <p className="text-sm text-warning-foreground">
            Votre rôle n'est pas encore associé à une commune. Contactez un
            super-administrateur.
          </p>
        </div>
      )}
    </div>
  );
}
