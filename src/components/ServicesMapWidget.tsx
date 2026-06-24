/**
 * ServicesMapWidget — Interactive map of public services
 * Layers: Health, Pharmacy, Defibrillator, Transport
 * Built with Leaflet + React
 */

import { useEffect, useRef, useState } from "react";
import { useServicesMap, getDistance } from "@/hooks/useServicesMap";
import { MapPin, Navigation, AlertCircle, Loader2 } from "lucide-react";

export function ServicesMapWidget() {
  const { services, categories, loading, error, categoryMap } = useServicesMap();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainer.current || !services.length) return;

    // Lazy load leaflet
    import("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.esm.js")
      .then(({ default: L }) => {
        if (map.current) return; // Already initialized

        map.current = L.map(mapContainer.current).setView([48.8, 2.3], 12);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 18,
        }).addTo(map.current);

        // Add service markers
        const filtered = selectedCategory
          ? services.filter((s) => s.category_id === selectedCategory)
          : services;

        filtered.forEach((service) => {
          const category = categoryMap[service.category_id];
          const isSelected = selectedService === service.id;

          const marker = L.circleMarker([service.latitude, service.longitude], {
            radius: isSelected ? 12 : 6,
            fillColor: category.color,
            color: isSelected ? "white" : category.color,
            weight: isSelected ? 3 : 1,
            opacity: 1,
            fillOpacity: 0.8,
          })
            .bindPopup(`<strong>${service.name}</strong><br>${service.address}`)
            .addTo(map.current);

          marker.on("click", () => setSelectedService(service.id));
        });

        // Fit bounds
        if (filtered.length > 0) {
          const group = L.featureGroup(
            filtered.map((s) => L.circleMarker([s.latitude, s.longitude]))
          );
          map.current.fitBounds(group.getBounds().pad(0.1));
        }
      });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [services, selectedCategory, selectedService, categoryMap]);

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Geolocation denied")
      );
    }
  }, []);

  const filtered = selectedCategory
    ? services.filter((s) => s.category_id === selectedCategory)
    : services;

  const selected = services.find((s) => s.id === selectedService);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 rounded-lg border bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Erreur de chargement</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!services.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucun service disponible pour votre commune</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
            !selectedCategory
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Tous
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div
        ref={mapContainer}
        className="rounded-lg border h-80 bg-muted"
        style={{ overflow: "hidden" }}
      />

      {/* Service list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun service trouvé</p>
        ) : (
          filtered.map((service) => {
            const dist = userLocation
              ? getDistance(
                  userLocation.lat,
                  userLocation.lng,
                  service.latitude,
                  service.longitude
                ).toFixed(1)
              : null;

            return (
              <button
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedService === service.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {categoryMap[service.category_id]?.emoji || "📍"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{service.address}</p>
                    {dist && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Navigation className="h-3 w-3" /> {dist} km
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <span className="text-2xl">{categoryMap[selected.category_id]?.emoji}</span>
                {selected.name}
              </p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                {selected.address}
              </p>
            </div>
            <button
              onClick={() => setSelectedService(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {selected.phone && (
            <a
              href={`tel:${selected.phone}`}
              className="block px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-medium text-center hover:opacity-90"
            >
              Appeler : {selected.phone}
            </a>
          )}

          {selected.website && (
            <a
              href={selected.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 rounded border border-primary text-primary text-sm font-medium text-center hover:bg-primary/10"
            >
              Visiter le site
            </a>
          )}
        </div>
      )}
    </div>
  );
}
