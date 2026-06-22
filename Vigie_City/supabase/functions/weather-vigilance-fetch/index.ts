/**
 * weather-vigilance-fetch — Edge Function VigieCity
 * Fetche les alertes météo depuis Météo-France Vigilance API
 * Met à jour `weather_vigilance_logs` par commune toutes les heures
 *
 * Invocation : pg_cron hourly
 *   SELECT cron.schedule('weather-vigilance-1h', '0 * * * *',
 *     $$SELECT net.http_post(url := 'https://<PROJECT>.supabase.co/functions/v1/weather-vigilance-fetch',
 *       headers := '{"Authorization":"Bearer <anon_key>","Content-Type":"application/json"}'::jsonb,
 *       body := '{}'::jsonb) AS request_id$$);
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Météo-France Vigilance API ────────────────────────────────────────────────

interface VigilanceAlert {
  department_code: string;
  level: "GREEN" | "YELLOW" | "ORANGE" | "RED";
  phenomena?: string[];
  description?: string;
  valid_from?: string;
  valid_to?: string;
}

/**
 * Fetch Météo-France vigilance feed (XML format)
 * API : https://vigilance.meteofrance.com/api/
 * Retourne JSON de départements alertés
 */
async function fetchMeteoFranceVigilance(): Promise<VigilanceAlert[]> {
  const url = "https://vigilance.meteofrance.com/api/";

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "VigieCity/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Météo-France API error ${res.status}`);
      return [];
    }

    const xml = await res.text();

    // Parse XML simplifié : chercher <Dept code="XX" color="..." ...>
    const alerts: VigilanceAlert[] = [];
    const deptRegex = /<Dept code="(\d{2})".*?/g;
    let match;

    while ((match = deptRegex.exec(xml)) !== null) {
      const deptCode = match[1];

      // Extraire color (GREEN=1, YELLOW=2, ORANGE=3, RED=4)
      const colorMatch = /color="([1234])"/.exec(match[0]);
      const colorNum = colorMatch ? parseInt(colorMatch[1]) : 1;
      const levelMap = { 1: "GREEN", 2: "YELLOW", 3: "ORANGE", 4: "RED" };
      const level = levelMap[colorNum as 1|2|3|4] ?? "GREEN";

      if (level !== "GREEN") { // Only track non-green alerts
        alerts.push({
          department_code: deptCode,
          level: level as "YELLOW"|"ORANGE"|"RED",
          description: `Alerte météo niveau ${level}`,
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error("Météo-France fetch error:", error);
    return [];
  }
}

/**
 * Map department code to communes
 * Récupère toutes les communes du département
 */
async function getCommunesByDepartment(
  supabase: ReturnType<typeof createClient>,
  dept_code: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("collectivities")
    .select("id")
    .eq("department_code", dept_code)
    .limit(500); // Max 500 communes par département

  if (error) {
    console.error(`Error fetching communes for dept ${dept_code}:`, error);
    return [];
  }

  return (data ?? []).map((c: any) => c.id);
}

/**
 * Upsert weather alert for a commune
 */
async function upsertWeatherAlert(
  supabase: ReturnType<typeof createClient>,
  commune_id: string,
  alert: VigilanceAlert
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("weather_vigilance_logs")
    .upsert(
      {
        collectivity_id: commune_id,
        level: alert.level,
        description: alert.description,
        phenomena: alert.phenomena?.join(", "),
        synced_at: now,
        updated_at: now,
      },
      { onConflict: "collectivity_id" }
    );

  if (error) {
    console.error(`Error upserting weather alert for ${commune_id}:`, error);
  }
}

/**
 * Clear green alerts (level=GREEN) for communes not in alert list
 */
async function clearResolvedAlerts(
  supabase: ReturnType<typeof createClient>,
  active_commune_ids: string[]
): Promise<void> {
  if (active_commune_ids.length === 0) return;

  const { error } = await supabase
    .from("weather_vigilance_logs")
    .update({ level: "GREEN", updated_at: new Date().toISOString() })
    .in("collectivity_id", active_commune_ids)
    .neq("level", "GREEN");

  if (error) {
    console.error("Error clearing resolved alerts:", error);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    console.log("[*] Fetching Météo-France vigilance alerts...");
    const alerts = await fetchMeteoFranceVigilance();
    console.log(`[*] Found ${alerts.length} department-level alerts`);

    let commune_count = 0;
    const alerted_communes = new Set<string>();

    // Pour chaque département en alerte
    for (const alert of alerts) {
      const communes = await getCommunesByDepartment(
        supabase,
        alert.department_code
      );
      console.log(
        `[*] Department ${alert.department_code}: ${communes.length} communes`
      );

      for (const commune_id of communes) {
        await upsertWeatherAlert(supabase, commune_id, alert);
        alerted_communes.add(commune_id);
        commune_count++;
      }
    }

    console.log(`[*] Updated ${commune_count} weather alerts`);

    return new Response(
      JSON.stringify({
        status: "ok",
        alerts_found: alerts.length,
        communes_updated: commune_count,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
