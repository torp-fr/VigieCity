import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";

export const Route = createFileRoute("/platform/modules")({
  component: ModulesPage,
});

function ModulesPage() {
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Package className="h-6 w-6 text-blue-600" /> Modules
      </h1>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium text-muted-foreground">Gestion des modules — disponible prochainement</p>
        <p className="text-xs text-muted-foreground mt-1">
          Activez/désactivez des modules complets par commune (V2).
        </p>
      </div>
    </div>
  );
}
