import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Building2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformShell } from "@/components/PlatformShell";

export const Route = createFileRoute("/platform/publishers")({
  component: PlatformPublishersPage,
});

type Publication = {
  id: string;
  title: string;
  type: string | null;
  published_at: string | null;
  is_published: boolean;
  collectivities: { name: string } | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const TYPE_COLORS: Record<string, string> = {
  news:        "bg-blue-100 text-blue-700",
  event:       "bg-purple-100 text-purple-700",
  alert:       "bg-red-100 text-red-700",
  information: "bg-slate-100 text-slate-600",
};

function PlatformPublishersPage() {
  const { data: publications = [], isLoading } = useQuery<Publication[]>({
    queryKey: ["platform/publications-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publications")
        .select("id, title, type, published_at, is_published, collectivities(name)")
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Publication[];
    },
    staleTime: 2 * 60_000,
  });

  const published = publications.filter((p) => p.is_published).length;

  return (
    <PlatformShell activePath="/platform/publishers">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Publications</h1>
        <p className="mt-1 text-sm text-slate-500">
          {publications.length} publication{publications.length !== 1 ? "s" : ""} · {published} publiee{published !== 1 ? "s" : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : publications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Aucune publication</p>
            <p className="mt-1 text-sm text-slate-400">
              Les publications des communes apparaissent ici.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Titre</th>
                <th className="px-5 py-3">Commune</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {publications.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-medium text-slate-900 max-w-xs truncate">
                    {p.title ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {(p.collectivities as any)?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${TYPE_COLORS[p.type ?? ""] ?? "bg-slate-100 text-slate-600"}`}>
                      {p.type ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {p.is_published ? (
                      <span className="text-xs font-medium text-emerald-600">Publiee</span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Brouillon</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {fmtDate(p.published_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PlatformShell>
  );
}
