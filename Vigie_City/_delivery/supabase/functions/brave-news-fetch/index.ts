/**
 * brave-news-fetch — Edge Function VigieCity
 * Enrichit le pipeline d'actualités via Brave Search API (plan gratuit : 2 000 req/mois).
 * Cible les communes actives sans flux RSS propre.
 *
 * Requiert les secrets Supabase :
 *   BRAVE_SEARCH_API_KEY  — depuis api.search.brave.com
 *   SUPABASE_URL          — auto-injecté
 *   SUPABASE_SERVICE_ROLE_KEY — secret Supabase
 *
 * Invocation : pg_cron toutes les 6h sur les communes actives sans flux RSS
 *   SELECT cron.schedule('brave-news-6h', '0 */6 * * *',
 *     $$SELECT net.http_post(url := 'https://xfhkngecpbvmlstjymfy.supabase.co/functions/v1/brave-news-fetch',
 *       headers := '{"Authorization":"Bearer <anon_key>","Content-Type":"application/json"}'::jsonb,
 *       body := '{}'::jsonb) AS request_id$$);
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BRAVE_KEY    = Deno.env.get("BRAVE_SEARCH_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_COMMUNES_PER_RUN = 20; // Budget : 2000 req/mois ÷ 30j ÷ 4 runs/j ≈ 16 communes
const RESULTS_PER_QUERY    = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Brave News Search ─────────────────────────────────────────────────────────

async function searchBraveNews(query: string): Promise<Array<{
  url: string;
  title: string;
  description: string;
  published_at: string | null;
}>> {
  const url = new URL("https://api.search.brave.com/res/v1/news/search");
  url.searchParams.set("q",       query);
  url.searchParams.set("count",   String(RESULTS_PER_QUERY));
  url.searchParams.set("country", "fr");
  url.searchParams.set("search_lang", "fr");
  url.searchParams.set("freshness", "pw"); // dernière semaine

  const res = await fetch(url.toString(), {
    headers: { "X-Subscription-Token": BRAVE_KEY },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Brave API error ${res.status}:`, err);
    return [];
  }

  const data = await res.json();
  const results = (data.results ?? []) as Array<{
    url: string;
    title: string;
    description?: string;
    age?: string;
    page_age?: string;
  }>;

  return results.map((r) => ({
    url:          r.url,
    title:        r.title,
    description:  r.description ?? "",
    published_at: r.age ? new Date(r.age).toISOString() : null,
  }));
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!BRAVE_KEY) {
    return new Response(
      JSON.stringify({ error: "BRAVE_SEARCH_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Récupérer les communes actives (celles qui ont un abonnement)
  const { data: communes, error: commErr } = await supabase
    .from("collectivities")
    .select("id, name")
    .eq("status", "active")
    .limit(MAX_COMMUNES_PER_RUN);

  if (commErr) {
    return new Response(
      JSON.stringify({ error: commErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let fetched = 0;
  let inserted = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (const commune of (communes ?? [])) {
    try {
      const query   = `${commune.name} actualités mairie`;
      const results = await searchBraveNews(query);
      fetched += results.length;

      if (results.length === 0) continue;

      // Vérifier quels URLs existent déjà
      const urls = results.map((r) => r.url);
      const { data: existing } = await supabase
        .from("news_articles")
        .select("url")
        .in("url", urls);

      const existingUrls = new Set((existing ?? []).map((e) => e.url));

      const toInsert = results
        .filter((r) => !existingUrls.has(r.url))
        .map((r) => ({
          url:             r.url,
          title:           r.title,
          summary:         r.description,
          source:          "brave",
          category:        "actualites",
          collectivity_id: commune.id,
          published_at:    r.published_at,
          created_at:      new Date().toISOString(),
        }));

      skipped += results.length - toInsert.length;

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from("news_articles")
          .insert(toInsert);

        if (insErr) {
          errors.push(`${commune.name}: ${insErr.message}`);
        } else {
          inserted += toInsert.length;
        }
      }

      // Délai entre requêtes pour respecter le rate limit Brave
      await new Promise((r) => setTimeout(r, 200));

    } catch (e) {
      errors.push(`${commune.name}: ${(e as Error).message}`);
    }
  }

  const result = {
    ok:       true,
    communes: communes?.length ?? 0,
    fetched,
    inserted,
    skipped,
    errors:   errors.length,
    errorLog: errors.slice(0, 5),
  };

  console.log("brave-news-fetch result:", JSON.stringify(result));

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
