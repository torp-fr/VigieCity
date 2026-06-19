import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/urgences")({
  component: UrgencesLocalPage,
});

function UrgencesLocalPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          Urgences locales
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les numéros d'urgence spécifiques à votre commune
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground/80 mb-4">
          Les numéros d'urgence locaux sont configurés dans les paramètres de la commune.
        </p>
        <Link
          to="/admin/parametres"
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          Aller aux paramètres <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
