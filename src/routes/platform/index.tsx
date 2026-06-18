import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Users, Ticket, BarChart3, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/")({
  head: () => ({
    meta: [
      { title: "Platform Admin — VigieCity" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlatformIndexPage,
});

function PlatformIndexPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      if (!uid) { setIsAdmin(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, collectivity_id")
        .eq("user_id", uid)
        .eq("role", "admin")
        .is("collectivity_id", null);
      setIsAdmin((roles?.length ?? 0) > 0);
    });
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["platform_stats_summary"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const [communes, users, tickets, licenses] = await Promise.all([
        supabase.from("collectivities").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("commune_licenses").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      return {
        communes: communes.count ?? 0,
        users: users.count ?? 0,
        openTickets: tickets.count ?? 0,
        activeLicenses: licenses.count ?? 0,
      };
    },
  });

  if (isAdmin === null) {
    return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="px-4 pt-10 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Accès refusé</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cette zone est réservée aux administrateurs de la plateforme.</p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const cards = [
    { to: "/platform/communes", icon: Building2, label: "Communes", value: stats?.communes, desc: "collectivités enregistrées" },
    { to: "/platform/users", icon: Users, label: "Utilisateurs", value: stats?.users, desc: "comptes actifs" },
    { to: "/platform/licences", icon: BarChart3, label: "Licences", value: stats?.activeLicenses, desc: "licences actives" },
    { to: "/platform/support", icon: Ticket, label: "Support", value: stats?.openTickets, desc: "tickets ouverts" },
  ];

  return (
    <div className="space-y-6 px-4 pt-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Plateforme</p>
        <h1 className="mt-1 text-2xl font-bold">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue d'ensemble de la plateforme VigieCity.</p>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ to, icon: Icon, label, value, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-card transition-transform active:scale-[0.97]"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold leading-none">
              {value ?? <span className="h-7 w-10 animate-pulse rounded bg-muted inline-block" />}
            </p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Quick nav */}
      <nav className="space-y-2">
        <Link to="/platform/stats" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-semibold">Statistiques globales</span>
        </Link>
      </nav>
    </div>
  );
}
