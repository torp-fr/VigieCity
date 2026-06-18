import { Link, useRouterState } from "@tanstack/react-router";
import { Home, PhoneCall, AlertCircle, Newspaper } from "lucide-react";

const items = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/urgences", label: "Urgences", icon: PhoneCall },
  { to: "/signaler", label: "Signaler", icon: AlertCircle },
  { to: "/fil", label: "Quartier", icon: Newspaper },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
              {label}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
