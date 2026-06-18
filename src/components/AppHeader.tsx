import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-civic text-primary-foreground shadow-card">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="tracking-tight">VigieCity</span>
        </Link>
        <Link
          to="/auth"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Mon compte
        </Link>
      </div>
    </header>
  );
}
