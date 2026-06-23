import { createFileRoute } from "@tanstack/react-router";
import { Rss } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/rss")({
  component: PlatformRssPage,
});

function PlatformRssPage() {
  return (
    <PlatformShell activePath="/platform/rss">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Flux RSS</h1>
        <p className="mt-1 text-sm text-slate-500">Gestion des sources RSS nationales</p>
      </div>

      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
          <Rss className="h-8 w-8 text-orange-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-700">Module RSS non disponible</p>
          <p className="mt-1 text-sm text-slate-400">
            La gestion des flux RSS sera disponible dans une prochaine version.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Bientot
        </span>
      </div>
    </PlatformShell>
  );
}
