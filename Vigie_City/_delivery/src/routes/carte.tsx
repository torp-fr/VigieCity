import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Map as MapIcon, Navigation, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, categoryIcon, REPORT_CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/carte")({
  head: () => ({
    meta: [
      { title: "Carte du quartier — VigieCity" },
      {
        name: "description",
        content: "Carte des signalements publiés dans votre quartier.",
      },
    ],
  }),
  component: CartePage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  info: "#6b7280",
  vigilance: "#d97706",
  urgent: "#dc2626",
};

const SEVERITY_LABELS: Record<string, string> = {
  info: "Info",
  vigilance: "Vigilance",
  urgent: "Urgent",
};

// ── Page ──────────────────────────────────────────────────────────────────────

function CartePage() {
  const [collectivityId, setCollectivityId] = useState<string | null | undefined>(
    undefined, // undefined = not yet loaded
  );
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  // Load auth + collectivity_id from profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setCollectivityId(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", data.user.id)
        .single();
      setCollectivityId(profile?.collectivity_id ?? null);
    });
  }, []);

  // Reports query — filtered by collectivity + optional severity/category
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", "carte", collectivityId, severityFilter, categoryFilter],
    enabled: collectivityId !== undefined, // wait until auth resolved
    queryFn: async () => {
      let q = supabase
        .from("reports")
        .select(
          "id, lat, lng, category, severity, description, approximate_address, created_at",
        )
        .eq("status", "published")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);

      if (collectivityId) q = q.eq("collectivity_id", collectivityId);
      if (severityFilter) q = q.eq("severity", severityFilter);
      if (categoryFilter) q = q.eq("category", categoryFilter);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  // "Ma position" button
  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }

  const hasFilters = severityFilter !== null || categoryFilter !== null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-2 px-4 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Carte du quartier</h1>
          {!isLoading && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {reports.length} signalement{reports.length !== 1 ? "s" : ""}
            </span>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSeverityFilter(null);
                setCategoryFilter(null);
              }}
              className="ml-auto flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              <X className="h-3 w-3" />
              Effacer
            </button>
          )}
        </div>

        {/* Severity filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(["info", "vigilance", "urgent"] as const).map((sev) => {
            const color = SEVERITY_COLORS[sev];
            const active = severityFilter === sev;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(active ? null : sev)}
                className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition"
                style={
                  active
                    ? { borderColor: color, backgroundColor: color + "22", color }
                    : { borderColor: "transparent", backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }
                }
              >
                {SEVERITY_LABELS[sev]}
              </button>
            );
          })}

          <div className="mx-1 w-px shrink-0 bg-border" />

          {/* Category chips — scroll horizontally */}
          {REPORT_CATEGORIES.slice(0, 6).map((cat) => {
            const active = categoryFilter === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategoryFilter(active ? null : cat.value)}
                className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent bg-muted text-muted-foreground"
                }`}
              >
                <span aria-hidden>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Map area ────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <LeafletMap reports={reports} userPos={userPos} />

            {/* Empty state overlay */}
            {reports.length === 0 && !isLoading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-2xl border border-border bg-background/90 px-5 py-4 text-center shadow-card backdrop-blur-sm">
                  <p className="text-sm font-semibold">Aucun signalement</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasFilters
                      ? "Essayez de modifier les filtres."
                      : "Aucun signalement publié avec coordonnées GPS."}
                  </p>
                </div>
              </div>
            )}

            {/* Ma position button */}
            <button
              type="button"
              onClick={locateMe}
              className="absolute bottom-5 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background shadow-card transition hover:bg-muted"
              title="Ma position"
            >
              <Navigation className="h-5 w-5 text-primary" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── LeafletMap ────────────────────────────────────────────────────────────────

function LeafletMap({
  reports,
  userPos,
}: {
  reports: Report[];
  userPos: { lat: number; lng: number } | null;
}) {
  const mapId = "vigie-leaflet-map";
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const userMarkerRef = useRef<import("leaflet").Marker | null>(null);

  // Init + rebuild markers when reports change
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    async function initMap() {
      const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      if (cancelled) return;

      // Patch default icon paths for bundlers
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const container = document.getElementById(mapId);
      if (!container || cancelled) return;

      // Center: centroid of reports or France
      let center: [number, number] = [46.6, 2.3];
      let zoom = 6;
      if (reports.length > 0) {
        const lats = reports.map((r) => r.lat);
        const lngs = reports.map((r) => r.lng);
        center = [
          (Math.min(...lats) + Math.max(...lats)) / 2,
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
        ];
        zoom = reports.length === 1 ? 15 : 13;
      }

      map = L.map(container, { center, zoom, zoomControl: false });
      mapRef.current = map;

      // Controls — position top-right to avoid overlap with our button
      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Report markers
      for (const r of reports) {
        if (cancelled) break;
        const color = SEVERITY_COLORS[r.severity] ?? SEVERITY_COLORS.info;
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:34px;height:34px;border-radius:50% 50% 50% 0;
            background:${color};border:2.5px solid white;
            transform:rotate(-45deg);
            box-shadow:0 2px 8px rgba(0,0,0,.3);
            display:flex;align-items:center;justify-content:center;
          "><span style="transform:rotate(45deg);font-size:15px;line-height:1">${categoryIcon(r.category)}</span></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -38],
        });

        const ago = timeAgo(r.created_at);
        const addrHtml = r.approximate_address
          ? `<p style="font-size:11px;color:#888;margin:2px 0">📍 ${r.approximate_address}</p>`
          : "";
        const desc =
          r.description.length > 130
            ? r.description.slice(0, 130) + "…"
            : r.description;

        L.marker([r.lat, r.lng], { icon })
          .bindPopup(
            `<div style="min-width:180px;max-width:240px;font-family:system-ui,sans-serif">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <b style="font-size:13px">${categoryLabel(r.category)}</b>
                <span style="padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;
                  background:${color}22;color:${color};border:1px solid ${color}55">
                  ${SEVERITY_LABELS[r.severity] ?? r.severity}
                </span>
              </div>
              ${addrHtml}
              <p style="font-size:12px;color:#444;margin:4px 0">${desc}</p>
              <p style="font-size:11px;color:#aaa;margin:0">${ago}</p>
            </div>`,
          )
          .addTo(map!);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, [reports]);

  // Update user position marker without re-building the whole map
  useEffect(() => {
    if (!userPos || !mapRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (!map) return;

      // Remove old user marker
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:#3b82f6;border:3px solid white;
          box-shadow:0 0 0 4px rgba(59,130,246,.3);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      userMarkerRef.current = L.marker([userPos.lat, userPos.lng], { icon })
        .bindPopup("<b>Votre position</b>")
        .addTo(map);

      map.setView([userPos.lat, userPos.lng], 15, { animate: true });
    })();
  }, [userPos]);

  return (
    <div
      id={mapId}
      className="h-full w-full"
      style={{ minHeight: 0 }}
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}
