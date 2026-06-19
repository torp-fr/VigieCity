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
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Geoloc tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  const startTracking = () => {
    if (!('geolocation' in navigator)) return;
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setTracking(false),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };
  const stopTracking = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    setTracking(false);
  };

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
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
    }

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
        centeredRef.current = false;
      }
    };
  }, []);

  // Update markers when reports change (without resetting pan/zoom)
  useEffect(() => {
    async function updateMarkers() {
      if (!mapRef.current || !layerRef.current) return;
      const L = LRef.current ?? (await import("leaflet")).default;

      layerRef.current.clearLayers();

      for (const r of reports) {
        const color = SEVERITY_COLORS[r.severity] ?? SEVERITY_COLORS.info;
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:36px;height:36px;border-radius:50% 50% 50% 0;
            background:${color};border:2px solid white;
            transform:rotate(-45deg);
            box-shadow:0 2px 6px rgba(0,0,0,.35);
            display:flex;align-items:center;justify-content:center;
          "><span style="transform:rotate(45deg);font-size:16px;line-height:1;">${categoryIcon(r.category)}</span></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -38],
        });

        const ago = timeAgo(r.created_at);
        const addr = r.approximate_address
          ? `<p style="font-size:11px;color:#666;margin:2px 0">📍 ${r.approximate_address}</p>` : "";
        const desc = r.description.length > 120 ? r.description.slice(0, 120) + "…" : r.description;

        L.marker([r.lat, r.lng], { icon })
          .bindPopup(`
            <div style="min-width:180px;max-width:240px">
              <b style="font-size:13px">${categoryLabel(r.category)}</b>
              <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;background:${color}22;color:${color};border:1px solid ${color}44">${r.severity}</span>
              ${addr}
              <p style="font-size:12px;margin:4px 0;color:#333">${desc}</p>
              <p style="font-size:11px;color:#999;margin:0">${ago}</p>
            </div>
          `)
          .addTo(layerRef.current);
      }

      // Auto-center only on first data load (using allReports for initial bounds)
      if (!centeredRef.current && allReports.length > 0) {
        centeredRef.current = true;
        const lats = allReports.map((r) => r.lat);
        const lngs = allReports.map((r) => r.lng);
        const center: [number, number] = [
          (Math.min(...lats) + Math.max(...lats)) / 2,
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
        ];
        mapRef.current.setView(center, 13);
      }
    }

    updateMarkers();
  }, [reports, allReports]);

  return <div id={mapId} className="flex-1" style={{ minHeight: 0, height: "100%" }} />;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}
