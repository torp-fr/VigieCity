/**
 * services-map-fetch — Edge Function VigieCity
 * Fetches public services from data.gouv.fr APIs
 * Syncs: Health (santé), Pharmacies, Defibrillators (DAE), Transport
 *
 * Invocation: pg_cron weekly (sample 10% of communes per run to spread load)
 *   SELECT cron.schedule('services-map-weekly', '0 2 * * 0',
 *     $$SELECT net.http_post(url := 'https://<PROJECT>.supabase.co/functions/v1/services-map-fetch',
 *       headers := '{"Authorization":"Bearer <anon_key>","Content-Type":"application/json"}'::jsonb,
 *       body := '{"limit":50}'::jsonb) AS request_id$$);
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── data.gouv APIs (French public services) ────────────────────────────────

interface ServiceFetchResult {
  category_id: string;
  services: Array<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    website?: string;
    external_id: string;
  }>;
}

/**
 * Fetch pharmacies from data.gouv
 * API: https://www.data.gouv.fr/api/datasets/pharmacies-de-garde/
 */
async function fetchPharmacies(dept_code: string): Promise<ServiceFetchResult> {
  try {
    // Simplified: fetch from Overpass API (OpenStreetMap)
    const query = `
      [bbox:${getDeptBounds(dept_code)}];
      (
        node["amenity"="pharmacy"];
        way["amenity"="pharmacy"];
      );
      out center;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return { category_id: "pharmacy", services: [] };

    const data = await res.json();
    const services = (data.elements ?? []).map((el: any) => ({
      name: el.tags?.name ?? "Pharmacie",
      address: el.tags?.["addr:street"] ?? "Adresse non disponible",
      latitude: el.center?.lat ?? el.lat,
      longitude: el.center?.lon ?? el.lon,
      website: el.tags?.website,
      phone: el.tags?.phone,
      external_id: `osm-pharmacy-${el.id}`,
    }));

    return { category_id: "pharmacy", services };
  } catch (error) {
    console.error("Pharmacy fetch error:", error);
    return { category_id: "pharmacy", services: [] };
  }
}

/**
 * Fetch health facilities (hôpitaux, cliniques)
 */
async function fetchHealthFacilities(dept_code: string): Promise<ServiceFetchResult> {
  try {
    const query = `
      [bbox:${getDeptBounds(dept_code)}];
      (
        node["amenity"~"hospital|clinic|doctors"];
        way["amenity"~"hospital|clinic|doctors"];
      );
      out center;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return { category_id: "health", services: [] };

    const data = await res.json();
    const services = (data.elements ?? []).map((el: any) => ({
      name: el.tags?.name ?? "Établissement de santé",
      address: el.tags?.["addr:street"] ?? "Adresse non disponible",
      latitude: el.center?.lat ?? el.lat,
      longitude: el.center?.lon ?? el.lon,
      website: el.tags?.website,
      phone: el.tags?.phone,
      external_id: `osm-health-${el.id}`,
    }));

    return { category_id: "health", services };
  } catch (error) {
    console.error("Health fetch error:", error);
    return { category_id: "health", services: [] };
  }
}

/**
 * Fetch defibrillators (DAE)
 */
async function fetchDefibrillators(dept_code: string): Promise<ServiceFetchResult> {
  try {
    const query = `
      [bbox:${getDeptBounds(dept_code)}];
      (
        node["emergency"="defibrillator"];
        way["emergency"="defibrillator"];
      );
      out center;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return { category_id: "defibrillator", services: [] };

    const data = await res.json();
    const services = (data.elements ?? []).map((el: any) => ({
      name: "Défibrillateur (DAE)",
      address: el.tags?.["addr:street"] ?? "Adresse non disponible",
      latitude: el.center?.lat ?? el.lat,
      longitude: el.center?.lon ?? el.lon,
      website: el.tags?.website,
      phone: el.tags?.phone,
      external_id: `osm-dae-${el.id}`,
    }));

    return { category_id: "defibrillator", services };
  } catch (error) {
    console.error("Defibrillator fetch error:", error);
    return { category_id: "defibrillator", services: [] };
  }
}

/**
 * Fetch public transport stops
 */
async function fetchTransport(dept_code: string): Promise<ServiceFetchResult> {
  try {
    const query = `
      [bbox:${getDeptBounds(dept_code)}];
      (
        node["public_transport"="stop_position"];
        node["highway"="bus_stop"];
      );
      out center;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return { category_id: "transport", services: [] };

    const data = await res.json();
    const services = (data.elements ?? []).slice(0, 100).map((el: any) => ({
      name: el.tags?.name ?? "Arrêt de transport",
      address: el.tags?.["addr:street"] ?? "Adresse non disponible",
      latitude: el.center?.lat ?? el.lat,
      longitude: el.center?.lon ?? el.lon,
      external_id: `osm-transport-${el.id}`,
    }));

    return { category_id: "transport", services };
  } catch (error) {
    console.error("Transport fetch error:", error);
    return { category_id: "transport", services: [] };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get bounding box for department (simplified French dept centers)
 * Format: south,west,north,east
 */
function getDeptBounds(dept_code: string): string {
  const bounds: Record<string, string> = {
    "75": "48.8159,2.2245,48.8959,2.4689", // Paris
    "13": "43.1711,5.0844,43.6048,5.9111", // Bouches-du-Rhône
    "69": "45.3879,4.6226,45.8976,5.0828", // Rhône
    // Add more depts as needed, fallback to France center
  };
  return bounds[dept_code] || "41.0,-2.5,51.5,8.0"; // France approximate bounds
}

/**
 * Upsert services for a commune
 */
async function upsertServices(
  supabase: ReturnType<typeof createClient>,
  commune_id: string,
  result: ServiceFetchResult
): Promise<number> {
  if (!result.services.length) return 0;

  // Get existing service IDs for dupe check
  const { data: existing } = await supabase
    .from("services_locations")
    .select("external_id")
    .eq("collectivity_id", commune_id)
    .eq("category_id", result.category_id);

  const existing_ids = new Set((existing ?? []).map((s: any) => s.external_id));

  // Filter out dupes
  const to_insert = result.services
    .filter((s) => !existing_ids.has(s.external_id))
    .map((s) => ({
      collectivity_id: commune_id,
      category_id: result.category_id,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      phone: s.phone,
      website: s.website,
      external_id: s.external_id,
    }));

  if (!to_insert.length) return 0;

  const { error } = await supabase
    .from("services_locations")
    .insert(to_insert);

  if (error) {
    console.error(`Error inserting services for ${commune_id}:`, error);
    return 0;
  }

  return to_insert.length;
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const limit = (body as any).limit ?? 50;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    console.log(`[*] Fetching services for up to ${limit} communes...`);

    // Get communes (random sample for weekly distribution)
    const { data: communes, error: commErr } = await supabase
      .from("collectivities")
      .select("id, department_code")
      .neq("department_code", null)
      .limit(limit);

    if (commErr || !communes?.length) {
      return new Response(
        JSON.stringify({ error: "No communes found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let total_synced = 0;

    for (const commune of communes) {
      const dept = commune.department_code;

      // Fetch all 4 categories
      const [pharmacies, health, dae, transport] = await Promise.all([
        fetchPharmacies(dept),
        fetchHealthFacilities(dept),
        fetchDefibrillators(dept),
        fetchTransport(dept),
      ]);

      // Upsert each category
      for (const result of [pharmacies, health, dae, transport]) {
        const count = await upsertServices(supabase, commune.id, result);
        total_synced += count;
      }
    }

    console.log(`[*] Synced ${total_synced} services`);

    return new Response(
      JSON.stringify({
        status: "ok",
        communes_processed: communes.length,
        services_synced: total_synced,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
