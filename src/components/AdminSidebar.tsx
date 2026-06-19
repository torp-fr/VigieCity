import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Megaphone,
  PhoneCall,
  Newspaper,
  Wrench,
  GitBranch,
  Users,
  BarChart3,
  Settings,
  ShieldAlert,
  LogOut,
  Shield,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: "",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Sécurité",
    items: [
      { label: "Signalements", to: "/admin/signalements", icon: ClipboardList },
      { label: "Alertes", to: "/admin/alertes", icon: Megaphone },
      { label: "SOS", to: "/admin/sos", icon: PhoneCall },
      { label: "Voisins vigilants", to: "/admin/voisins", icon: Shield },
    ],
  },
  {
    heading: "Communication",
    items: [
      { label: "Actualités", to: "/admin/publications", icon: Newspaper },
    ],
  },
  {
    heading: "Services",
    items: [
      { label: "Mes services", to: "/admin/services", icon: Wrench },
      { label: "Routage", to: "/admin/routage", icon: GitBranch },
    ],
  },
  {
    heading: "Organisation",
    items: [
      { label: "Agents", to: "/admin/agents", icon: Users },
      { label: "Urgences locales", to: "/admin/urgences", icon: ShieldAlert },
    ],
  },
  {
    heading: "Analyse",
    items: [
      { label: "Statistiques", to: "/admin/stats", icon: BarChart3 },
    ],
  },
  {
    heading: "",
    items: [
      { label: "Paramètres", to: "/admin/parametres", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: communeName } = useQuery({
    queryKey: ["admin-commune-name"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, collectivities(name)")
        .eq("id", user.id)
        .single();
      return {
        userName: profile?.display_name ?? user.email ?? "Agent",
        communeName: (profile as any)?.collectivities?.name ?? "Commune",
      };
    },
    staleTime: 60_000,
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function isActive(to: string) {
    if (to === "/admin") return pathname === "/admin";
    return pathname.startsWith(to);
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground leading-none truncate">VigieCity</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {communeName?.communeName ?? "Chargement…"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.heading && (
              <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {section.heading}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {active && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {(communeName?.userName ?? "A")[0].toUpperCase()}
          </div>
          <span className="flex-1 min-w-0 text-xs text-foreground truncate">
            {communeName?.userName ?? "Agent"}
          </span>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Déconnexion"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
