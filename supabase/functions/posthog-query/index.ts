/**
 * posthog-query — Edge Function VigieCity
 * Proxyfie les appels à l'API HogQL de PostHog EU en gardant POSTHOG_PERSONAL_KEY côté serveur.
 *
 * Requiert les secrets Supabase :
 *   POSTHOG_PERSONAL_KEY  — PostHog → Settings → Personal API Keys → Create
 *   POSTHOG_PROJECT_ID    — PostHog → Project Settings → Project ID (nombre, ex: 12345)
 *
 * Usage depuis le front :
 *   const res = await supabase.functions.invoke("posthog-query", {
 *     body: { query: "SELECT count() FROM events WHERE event = '$pageview'" }
 *   });
 *
 * Ou pour les requêtes pré-définies :
 *   { preset: "pageviews_7d" | "sessions_7d" | "top_pages" | "devices" | "geo_points" | "commune_stats", collectivity_id?: string }
 */

const PH_KEY        = Deno.env.get("POSTHOG_PERSONAL_KEY")!;
const PH_PROJECT_ID = Deno.env.get("POSTHOG_PROJECT_ID")!;
const PH_API        = `https://eu.posthog.com/api/projects/${PH_PROJECT_ID}/query`;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Presets HogQL ─────────────────────────────────────────────────────────────

const PRESETS: Record<string, (args: Record<string, string>) => string> = {
  // Pageviews des 7 derniers jours, groupés par jour
  pageviews_7d: () => `
    SELECT
      toStartOfDay(timestamp) AS day,
      count() AS views
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - interval 7 day
    GROUP BY day
    ORDER BY day
  `,

  // Sessions distinctes des 7 derniers jours
  sessions_7d: () => `
    SELECT count(DISTINCT "$session_id") AS sessions
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - interval 7 day
  `,

  // Top 10 pages visitées (30j)
  top_pages: () => `
    SELECT
      properties.$current_url AS url,
      count() AS views
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - interval 30 day
    GROUP BY url
    ORDER BY views DESC
    LIMIT 10
  `,

  // Répartition par type d'appareil (30j)
  devices: () => `
    SELECT
      properties.$device_type AS device,
      count() AS count
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - interval 30 day
      AND properties.$device_type IS NOT NULL
    GROUP BY device
    ORDER BY count DESC
  `,

  // Points géo des utilisateurs (30j) — pour la carte Leaflet
  geo_points: () => `
    SELECT
      person_properties.commune    AS commune,
      person_properties.region     AS region,
      person_properties.department AS department,
      count() AS visits
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - interval 30 day
      AND person_properties.commune IS NOT NULL
    GROUP BY commune, region, department
    ORDER BY visits DESC
    LIMIT 200
  `,

  // Stats pour une commune spécifique (panel admin commune)
  commune_stats: (args) => `
    SELECT
      count(DISTINCT person_id)    AS unique_users,
      count()                      AS total_events,
      count(DISTINCT "$session_id") AS sessions
    FROM events
    WHERE timestamp >= now() - interval 30 day
      AND person_properties.collectivity_id = '${args.collectivity_id ?? ""}'
  `,

  // Activité quotidienne pour une commune (30j)
  commune_daily: (args) => `
    SELECT
      toStartOfDay(timestamp) AS day,
      count() AS events
    FROM events
    WHERE timestamp >= now() - interval 30 day
      AND person_properties.collectivity_id = '${args.collectivity_id ?? ""}'
    GROUP BY day
    ORDER BY day
  `,
};

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!PH_KEY || !PH_PROJECT_ID) {
    return new Response(
      JSON.stringify({ error: "POSTHOG_PERSONAL_KEY or POSTHOG_PROJECT_ID not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json() as {
      query?:          string;
      preset?:         string;
      collectivity_id?: string;
    };

    let hogql: string;

    if (body.preset && PRESETS[body.preset]) {
      hogql = PRESETS[body.preset]({ collectivity_id: body.collectivity_id ?? "" });
    } else if (body.query) {
      hogql = body.query;
    } else {
      return new Response(
        JSON.stringify({ error: "Provide either 'preset' or 'query'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch(PH_API, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${PH_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("PostHog API error:", data);
      return new Response(
        JSON.stringify({ error: "PostHog API error", detail: data }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalise la réponse PostHog : { columns, results } → { columns, rows }
    return new Response(
      JSON.stringify({
        columns: data.columns ?? [],
        rows:    data.results ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("posthog-query error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
