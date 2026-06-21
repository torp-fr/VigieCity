import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Map as MapIcon, Navigation, X, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, categoryIcon, REPORT_CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/carte")({
  head: () => ({
    meta: [
      { title: "Carte du quartier — VigieCity" },
      {
        name: "description",
        content: "Carte des signalements et services de votre quartier.",
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

type OverpassNode = {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

type LayerKey = "hospitals" | "pharmacies" | "defibrillators" | "transport";

type ServicePOIs = Record<LayerKey, OverpassNode[]>;

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

const LAYER_CONFIG: Record<LayerKey, { label: string; emoji: string; color: string }> = {
  hospitals:      { label: "Santé",       emoji: "🏥", color: "#ef4444" },
  pharmacies:     { label: "Pharmacies",  emoji: "💊", color: "#16a34a" },
  defibrillators: { label: "DAE",         emoji: "❤️", color: "#f97316" },
  transport:      { label: "Transports",  emoji: "🚌", color: "#6366f1" },
};

const ALL_LAYERS: LayerKey[] = ["hospitals", "pharmacies", "defibrillators", "transport"];

// ── Overpass API ──────────────────────────────────────────────────────────────

async function fetchServicePOIs(
  bbox: [number, number, number, number],
): Promise<ServicePOIs> {
  const [s, w, n, e] = bbox;
  const b = `${s},${w},${n},${e}`;
  const query = [
    "[out:json][timeout:20];(",
    `node["amenity"~"hospital|clinic|doctors"](${b});`,
    `node["amenity"="pharmacy"](${b});`,
    `node["emergency"="defibrillator"](${b});`,
    `node["public_transport"="stop_position"]["name"](${b});`,
    `node["amenity"="bus_station"](${b});`,
    ");out body qt;",
  ].join("");

  const resp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!resp.ok) throw new Error("Overpass API error");
  const json = await resp.json();

  const result: ServicePOIs = {
    hospitals: [], pharmacies: [], defibrillators: [], transport: [],
  };
  for (const el of (json.elements ?? []) as OverpassNode[]) {
    const amenity  = el.tags?.amenity ?? "";
    const emergency = el.tags?.emergency ?? "";
    const pt       = el.tags?.public_transport ?? "";
    if (amenity === "pharmacy")                         result.pharmacies.push(el);
    else if (["hospital", "clinic", "doctors"].includes(amenity)) result.hospitals.push(el);
    else if (emergency === "defibrillator")             result.defibrillators.push(el);
    else if (pt === "stop_position" || amenity === "bus_station") result.transport.push(el);
  }
  return result;
}

// ── Page ──────────────────────────────────────────────────────────────────────

function CartePage() {
  const [collectivityId, setCollectivityId] = useState<string | null | undefined>(undefined);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [activeServices, setActiveServices] = useState<Set<LayerKey>>(new Set());
  const [showLayers, setShowLayers] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setCollectivityId(null); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("collectivity_id")
        .eq("id", data.user.id)
        .single();
      setCollectivityId(profile?.collectivity_id ?? null);
    });
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", "carte", collectivityId, severityFilter, categoryFilter],
    enabled: collectivityId !== undefined,
    queryFn: async () => {
      let q = supabase
        .from("reports")
        .select("id, lat, lng, category, severity, description, approximate_address, created_at")
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

  // Map center derived from reports centroid or user position
  const mapCenter = useMemo<{ lat: number; lng: number } | null>(() => {
    if (userPos) return userPos;
    if (!reports.length) return null;
    const lats = reports.map((r) => r.lat);
    const lngs = reports.map((r) => r.lng);
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  }, [reports, userPos]);

  // Bbox: ±0.04° lat / ±0.05° lng ≈ 4×5 km
  const bbox = useMemo<[number, number, number, number] | null>(() => {
    if (!mapCenter) return null;
    return [
      mapCenter.lat - 0.04,
      mapCenter.lng - 0.05,
      mapCenter.lat + 0.04,
      mapCenter.lng + 0.05,
    ];
  }, [mapCenter]);

  const { data: servicePOIs, isFetching: poiLoading } = useQuery({
    queryKey: ["carte-pois", bbox],
    enabled: !!bbox && activeServices.size > 0,
    staleTime: 10 * 60_000,
    queryFn: () => fetchServicePOIs(bbox!),
  });

  function toggleService(key: LayerKey) {
    setActiveServices((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    if (!showLayers) setShowLayers(false);
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }

  const hasFilters = severityFilter !== null || categoryFilter !== null;
  const anyServiceActive = activeServices.size > 0;

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
          {poiLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {/* Services toggle button */}
            <button
              type="button"
              onClick={() => setShowLayers((v) => !v)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                anyServiceActive || showLayers
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Services
              {anyServiceActive && (
                <span className="ml-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                  {activeServices.size}
                </span>
              )}
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSeverityFilter(null); setCategoryFilter(null); }}
                className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" />
                Filtres
              </button>
            )}
          </div>
        </div>

        {/* Service layer panel */}
        {showLayers && (
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Couches de services
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_LAYERS.map((key) => {
                const cfg = LAYER_CONFIG[key];
                const active = activeServices.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleService(key)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                      active
                        ? "border-transparent text-white"
                        : "border-border bg-muted/50 text-foreground"
                    }`}
                    style={active ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
                  >
                    <span className="text-base">{cfg.emoji}</span>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            {!mapCenter && anyServiceActive && (
              <p className="mt-2 text-[11px] text-amber-600">
                ⚠️ Chargement des services en attente d'une position.
              </p>
            )}
          </div>
        )}

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
            <LeafletMap
              reports={reports}
              userPos={userPos}
              servicePOIs={servicePOIs ?? null}
              activeServices={activeServices}
            />

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
  servicePOIs,
  activeServices,
}: {
  reports: Report[];
  userPos: { lat: number; lng: number } | null;
  servicePOIs: ServicePOIs | null;
  activeServices: Set<LayerKey>;
}) {
  const mapId = "vigie-leaflet-map";
  const mapRef   = useRef<import("leaflet").Map | null>(null);
  const userMarkerRef = useRef<import("leaflet").Marker | null>(null);

  // Rebuild map when reports or POIs change
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    async function initMap() {
      const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      if (cancelled) return;

      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const container = document.getElementById(mapId);
      if (!container || cancelled) return;

      // Center
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

      L.control.zoom({ position: "topright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // ── Report markers ──────────────────────────────────────────────
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
        const desc = r.description.length > 130 ? r.description.slice(0, 130) + "…" : r.description;
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

      // ── Service POI markers ─────────────────────────────────────────
      if (servicePOIs) {
        for (const layerKey of ALL_LAYERS) {
          if (!activeServices.has(layerKey)) continue;
          const cfg   = LAYER_CONFIG[layerKey];
          const nodes = servicePOIs[layerKey] ?? [];

          for (const node of nodes) {
            if (cancelled) break;
            const name = node.tags?.name ?? cfg.label;
            const addr = [
              node.tags?.["addr:housenumber"],
              node.tags?.["addr:street"],
            ].filter(Boolean).join(" ");

            const icon = L.divIcon({
              className: "",
              html: `<div style="
                width:30px;height:30px;border-radius:50%;
                background:${cfg.color};border:2.5px solid white;
                box-shadow:0 2px 6px rgba(0,0,0,.25);
                display:flex;align-items:center;justify-content:center;
                font-size:15px;line-height:1;
              ">${cfg.emoji}</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
              popupAnchor: [0, -18],
            });

            L.marker([node.lat, node.lon], { icon })
              .bindPopup(
                `<div style="min-width:140px;font-family:system-ui,sans-serif">
                  <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-size:16px">${cfg.emoji}</span>
                    <b style="font-size:13px">${name}</b>
                  </div>
                  ${addr ? `<p style="font-size:11px;color:#888;margin:3px 0">📍 ${addr}</p>` : ""}
                  <p style="font-size:11px;color:${cfg.color};font-weight:600;margin:2px 0">${cfg.label}</p>
                </div>`,
              )
              .addTo(map!);
          }
        }
      }
    }

    initMap();
    return () => {
      cancelled = true;
      if (map) { map.remove(); mapRef.current = null; }
    };
  }, [reports, servicePOIs, activeServices]);

  // User position marker (without full rebuild)
  useEffect(() => {
    if (!userPos || !mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (!map) return;
      if (userMarkerRef.current) userMarkerRef.current.remove();
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

  return <div id={mapId} className="h-full w-full" style={{ minHeight: 0 }} />;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
