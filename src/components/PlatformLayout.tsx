import { Outlet, useRouterState, Link } from "@tanstack/react-router";
import { PlatformSidebar } from "./PlatformSidebar";
import { Toaster } from "./ui/sonner";
import { ChevronRight, Home } from "lucide-react";

const BREADCRUMB_LABELS: Record<string, string> = {
  platform: "Vue globale",
  communes: "Communes",
  onboarding: "Onboarding",
  licences: "Licences",
  facturation: "Facturation",
  trials: "Périodes d'essai",
  features: "Feature flags",
  modules: "Modules",
  users: "Utilisateurs",
  support: "Tickets support",
  knowledge: "Base de connaissance",
  stats: "Statistiques",
  retention: "Rétention",
};

function Breadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Fil d'Ariane">
      <Link to="/platform" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {parts.slice(1).map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={i === parts.length - 2 ? "text-foreground font-medium" : ""}>
            {BREADCRUMB_LABELS[part] ?? part}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function PlatformLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <PlatformSidebar />

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur">
          <Breadcrumb />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}
