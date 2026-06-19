import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/platform/retention")({
  component: RetentionPage,
});

function RetentionPage() {
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-blue-600" /> Rétention
      </h1>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium text-muted-foreground">Analyse de rétention — disponible prochainement</p>
        <p className="text-xs text-muted-foreground mt-1">
          Cohortes utilisateurs, churn communes, NPS — V2.
        </p>
      </div>
    </div>
  );
}
