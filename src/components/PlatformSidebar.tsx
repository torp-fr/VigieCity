import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  CreditCard,
  FlaskConical,
  ToggleLeft,
  Package,
  Users,
  HeadphonesIcon,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Zap,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
      { label: "Vue globale", to: "/platform", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Communes",
    items: [
      { label: "Toutes", to: "/platform/communes", icon: Building2 },
      { label: "Onboarding", to: "/platform/onboarding", icon: PlusCircle },
    ],
  },
  {
    heading: "Commercial",
    items: [
      { label: "Licences", to: "/platform/licences", icon: CreditCard },
      { label: "Facturation", to: "/platform/facturation", icon: CreditCard },
      { label: "Périodes d'essai", to: "/platform/trials", icon: FlaskConical },
    ],
  },
  {
    heading: "Produit",
    items: [
      { label: "Feature flags", to: "/platform/features", icon: ToggleLeft },
      { label: "Modules", to: "/platform/modules", icon: Package },
    ],
  },
  {
    heading: "Utilisateurs",
    items: [
      { label: "Tous les users", to: "/platform/users", icon: Users },
    ],
  },
  {
    heading: "Support",
    items: [
      { label: "Tickets", to: "/platform/support", icon: HeadphonesIcon },
      { label: "Base de connaissance", to: "/platform/knowledge", icon: BookOpen },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { label: "Croissance", to: "/platform/stats", icon: TrendingUp },
      { label: "Rétention", to: "/platform/retention", icon: TrendingDown },
    ],
  },
];

export function PlatformSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: user } = useQuery({
    queryKey: ["platform-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user!.id)
        .single();
      return { name: profile?.display_name ?? user?.email ?? "Baptiste" };
    },
    staleTime: 60_000,
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function isActive(to: string) {
    if (to === "/platform") return pathname === "/platform";
    return pathname.startsWith(to);
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col overflow-y-auto">
      {/* Header gradient civic */}
      <div className="flex items-center gap-2.5 px-4 py-4 bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white">
          <Zap className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-none">VigieCity</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200 mt-0.5">
            Admin plateforme
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 border-r border-border bg-card px-2 py-3 space-y-0.5">
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
                      ? "bg-blue-50 text-blue-700 font-semibold"
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
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {(user?.name ?? "B")[0].toUpperCase()}
          </div>
          <span className="flex-1 min-w-0 text-xs text-foreground truncate">
            {user?.name ?? "Baptiste"}
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
