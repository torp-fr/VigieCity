import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  PhoneCall,
  AlertCircle,
  Newspaper,
  ShieldAlert,
  Megaphone,
  ChevronRight,
  Bell,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SosButton } from "@/components/SosButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VigieCity — Accueil sécurité de proximité" },
      {
        name: "description",
        content:
          "Appel d'urgence en 1 tap, alerte SOS, signalement d'évènement et fil du quartier.",
      },
      { property: "og:title", content: "VigieCity — Accueil" },
      {
        property: "og:description",
        content: "L'app citoyenne pour la sécurité de votre quartier.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", userId!)
        .single();
      return data;
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["alerts", "active", profile?.collectivity_id],
    queryFn: async () => {
      const now = new Date().toISOString();
      let query = supabase
        .from("alerts")
        .select("id, title, message, severity, created_at, area_label")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(3);

      if (profile?.collectivity_id) {
        query = query.or(
          `collectivity_id.eq.${profile.collectivity_id},collectivity_id.is.null`,
        );
      } else {
        query = query.is("collectivity_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Realtime: refresh alerts on new INSERT
  useEffect(() => {
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="space-y-6 px-4 pt-5">
      {/* Hero salutation */}
      <section className="rounded-3xl bg-gradient-civic p-5 text-primary-foreground shadow-card">
        <p className="text-xs font-medium uppercase tracking-wider opacity-80">
          Sécurité de proximité
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Veillons ensemble sur le quartier.
        </h1>
        <p className="mt-2 text-sm opacity-90">
          Urgences, signalements et alertes de votre commune, en un seul geste.
        </p>
      </section>

      {/* SOS */}
      <SosButton />

      {/* Quick actions */}
      <section className="grid grid-cols-3 gap-3">
        <QuickAction to="/urgences" icon={PhoneCall} label="Urgences" tone="primary" />
        <QuickAction to="/signaler" icon={AlertCircle} label="Signaler" tone="warning" />
        <QuickAction to="/fil" icon={Newspaper} label="Quartier" tone="muted" />
        <QuickAction to="/actualites" icon={Bell} label="Actualités" tone="muted" />
        <QuickAction to="/urgences" icon={Building2} label="Services" tone="muted" />
      </section>

      {/* Alertes mairie */}
      <section>
        <header className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Megaphone className="h-4 w-4" /> Alertes de votre commune
          </h2>
        </header>
        {!alerts?.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
            Aucune alerte active. Vous serez prévenu·e si la mairie diffuse un message.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <ShieldAlert
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    a.severity === "urgent"
                      ? "text-sos"
                      : a.severity === "vigilance"
                        ? "text-warning"
                        : "text-muted-foreground"
                  }`}
                />
                <div className="flex-1">
                  <p className="font-medium leading-tight">{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                  {a.area_label && (
                    <p className="mt-1 text-xs text-muted-foreground">📍 {a.area_label}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Disclaimer */}
      <p className="rounded-xl border border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
        En cas de danger immédiat, composez toujours le <strong>17</strong> (police),{" "}
        <strong>18</strong> (pompiers) ou <strong>112</strong>. VigieCity ne remplace pas
        les services de secours.
      </p>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  tone,
}: {
  to: string;
  icon: typeof PhoneCall;
  label: string;
  tone: "primary" | "warning" | "muted";
}) {
  const toneCls =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "warning"
        ? "bg-warning text-warning-foreground"
        : "bg-card text-foreground border border-border";
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-4 shadow-card transition-transform active:scale-[0.97] ${toneCls}`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-sm font-semibold">{label}</span>
      <ChevronRight className="h-3 w-3 opacity-50" />
    </Link>
  );
}
