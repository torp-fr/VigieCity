import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Map as MapIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, categoryIcon, REPORT_CATEGORIES, SEVERITY_OPTIONS } from "@/lib/categories";

export const Route = createFileRoute("/carte")({
  head: () => ({
    meta: [
      { title: "Carte du quartier — VigieCity" },
      { name: "description", content: "Carte des signalements publiés dans votre quartier." },
    ],
  }),
  component: CartePage,
});

type Report = {
  id: string;
  lat: number;
  lng: number;
  category: string;
  severity: string;
  description: string;
  approximate_address: string | null;
  created_at: string;
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "#6b7280",
  vigilance: "#d97706",
  urgent: "#dc2626",
};

function CartePage() {
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", "carte"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, lat, lng, category, severity, description, approximate_address, created_at")
        .eq("status", "published")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const filteredReports = (reports ?? []).filter((r) => {
    if (filterSeverity && r.severity !== filterSeverity) return false;
    if (filterCategory && r.category !== filterCategory) return false;
    return true;
  });

  // Determine which categories are present in the data
  const activeCategories = [...new Set((reports ?? []).map((r) => r.category))];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <header className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Carte du quartier</h1>
          {reports && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {filteredReports.length}/{reports.length}
            </span>
          )}
        </div>

        {/* Severity filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <FilterChip
            label="Tous"
            active={!filterSeverity && !filterCategory}
            onClick={() => { setFilterSeverity(null); setFilterCategory(null); }}
          />
          {SEVERITY_OPTIONS.map((s) => (
            <FilterChip
              key={s.value}
              label={s.label}
              active={filterSeverity === s.value}
              onClick={() => setFilterSeverity(filterSeverity === s.value ? null : s.value)}
              dot={SEVERITY_COLORS[s.value]}
            />
          ))}
        </div>

        {/* Category filter chips — only show present categories */}
        {activeCategories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {REPORT_CATEGORIES.filter((c) => activeCategories.includes(c.value)).map((c) => (
              <FilterChip
                key={c.value}
                label={`${c.icon} ${c.label}`}
                active={filterCategory === c.value}
                onClick={() => setFilterCategory(filterCategory === c.value ? null : c.value)}
              />
            ))}
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <LeafletMap reports={filteredReports} allReports={reports ?? []} />
      )}
    </div>
  );
}

function FilterChip({
  label, active, onClick, dot,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted"
      }`}
    >
      {dot && (
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      )}
      {label}
    </button>
  );
}

// ── Leaflet Map ────────────────────────────────────────────────────────────────
// Stable mount: tiles loaded once, markers updated without re-centering.
function LeafletMap({ reports, allReports }: { reports: Report[]; allReports: Report[] }) {
  const mapId = "vigie-leaflet-map";
  const mapRef = useRef<any>(null);          // L.Map
  const layerRef = useRef<any>(null);        // L.LayerGroup
  const centeredRef = useRef(false);
  const LRef = useRef<any>(null);

  // Mount: init map tile layer
  useEffect(() => {
    async function initMap() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      LRef.current = L;

      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const container = document.getElementById(mapId);
      if (!container || mapRef.current) return;

      const map = L.map(container, { center: [46.6, 2.3] as [number, number], zoom: 6 });
      mapRef.current = ma