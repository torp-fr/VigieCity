import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/platform/knowledge")({
  component: KnowledgePage,
});

function KnowledgePage() {
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-blue-600" /> Base de connaissance
      </h1>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium text-muted-foreground">Base de connaissance — disponible prochainement</p>
        <p className="text-xs text-muted-foreground mt-1">
          Articles d'aide, documentation commune, chatbot support — V2.
        </p>
      </div>
    </div>
  );
}
