/**
 * health-check — Edge Function for monitoring
 * Returns app health status (uptime, RSS sync, database)
 * J11 — Monitoring & Ops
 *
 * Scheduled: pg_cron every 5 minutes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: { ok: boolean; latency_ms: number };
    rss_sync: { ok: boolean; last_sync?: string };
    weather_api: { ok: boolean };
  };
}

async function checkDatabase(client: any): Promise<{ ok: boolean; latency_ms: number }> {
  const start = performance.now();
  try {
    const { error } = await client.from("collectivities").select("count").limit(1);
    const latency = performance.now() - start;
    return { ok: !error, latency_ms: Math.round(latency) };
  } catch {
    return { ok: false, latency_ms: -1 };
  }
}

async function checkRssSync(client: any): Promise<{ ok: boolean; last_sync?: string }> {
  try {
    const { data } = await client
      .from("articles")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data?.length) return { ok: false };

    const lastSync = data[0].created_at;
    const now = new Date();
    const lastSyncTime = new Date(lastSync);
    const hoursSinceSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);

    // Alert if no sync in 24 hours
    const ok = hoursSinceSync < 24;
    return { ok, last_sync: lastSync };
  } catch {
    return { ok: false };
  }
}

async function checkWeatherApi(): Promise<{ ok: boolean }> {
  try {
    const res = await fetch("https://vigilance.meteofrance.com/api/", {
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

Deno.serve(async (_req: Request) => {
  const client = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const [db, rss, weather] = await Promise.all([
      checkDatabase(client),
      checkRssSync(client),
      checkWeatherApi(),
    ]);

    const allOk = db.ok && rss.ok && weather.ok;
    const someOk = db.ok || rss.ok || weather.ok;

    const status: HealthStatus = {
      status: allOk ? "healthy" : someOk ? "degraded" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: db,
        rss_sync: rss,
        weather_api: weather,
      },
    };

    // Log to Supabase for monitoring
    await client.from("health_checks").insert({
      status: status.status,
      details: status,
      checked_at: status.timestamp,
    }).catch(() => null); // Ignore errors

    // Alert if unhealthy
    if (status.status === "unhealthy") {
      console.error("HEALTH CHECK FAILED:", status);
      // Send alert email via send-email function
      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: "admin@vigiecity.fr",
          subject: "🚨 VigieCity Health Check Failed",
          template: "health_alert",
          data: status,
        }),
      }).catch(() => null);
    }

    return new Response(JSON.stringify(status), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({ status: "unhealthy", error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
