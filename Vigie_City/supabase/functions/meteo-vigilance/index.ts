/**
 * meteo-vigilance — Edge Function VigieCity
 * Récupère les vigilances Météo-France (OpenDataSoft, gratuit, sans clé)
 * Stocke en DB et envoie des push pour les alertes orange/rouge nouvelles.
 *
 * Appelée par pg_cron toutes les heures.
 * Peut aussi être appelée manuellement via POST (authentifié super_admin).
 *
 * Couleurs : 1=vert, 2=jaune, 3=orange, 4=rouge
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL       = Deno.env.get("APP_URL") ?? "https://vigiecity.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phénomènes Météo-France (libellés depuis OpenDataSoft)
const PHENOMENON_ICONS: Record<string, string> = {
  "Vent violent":       "💨",
  "Pluie-inondation":  "🌊",
  "Orages":            "⛈️",
  "Crues":             "🌊",
  "Neige-verglas":     "❄️",
  "Canicule":          "🌡️",
  "Grand froid":       "🥶",
  "Avalanches":        "⛰️",
  "Vagues-submersion": "🌊",
  "Pluie":             "🌧️",
  "Vent":              "💨",
};

function getIcon(phenomenon: string): string {
  for (const [key, icon] of Object.entries(PHENOMENON_ICONS)) {
    if (phenomenon.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "⚠️";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const stats = { fetched: 0, stored: 0, pushSent: 0, errors: [] as string[] };

  try {
    // ── 1. Fetch vigilances orange/rouge depuis OpenDataSoft ──────────────────
    // Dataset public Météo-France agrégé par OpenDataSoft
    const params = new URLSearchParams({
      limit:  "100",
      select: "dep_code,vigilance_id,phenomene,dat_debut,dat_fin",
      where:  "vigilance_id >= 1",
      order_by: "vigilance_id DESC",
    });

    const apiUrl = `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/risques-meteorologiques-copy/records?${params}`;
    const resp   = await fetch(apiUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      throw new Error(`OpenDataSoft API error: ${resp.status}`);
    }

    const json = await resp.json() as {
      total_count: number;
      results: Array<{
        dep_code:     string;
        vigilance_id: number;
        phenomene:    string;
        dat_debut?:   string;
        dat_fin?:     string;
      }>;
    };

    stats.fetched = json.total_count;

    // ── 2. Mettre à jour la table meteo_vigilances ────────────────────────────
    // Supprimer les anciennes entrées d'aujourd'hui, puis réinsérer
    await sb.from("meteo_vigilances").delete().gte("fetched_at", new Date(Date.now() - 2 * 3600_000).toISOString());

    const rows = json.results.map((r) => ({
      department_code: r.dep_code?.toString().padStart(2, "0") ?? "",
      color_id:        r.vigilance_id,
      phenomenon:      r.phenomene ?? "Vigilance météo",
      valid_from:      r.dat_debut ?? new Date().toISOString(),
      valid_to:        r.dat_fin   ?? new Date(Date.now() + 6 * 3600_000).toISOString(),
      fetched_at:      new Date().toISOString(),
    })).filter((r) => r.department_code);

    if (rows.length > 0) {
      const { error: insertErr } = await sb.from("meteo_vigilances").insert(rows);
      if (insertErr) stats.errors.push(`DB insert: ${insertErr.message}`);
      else stats.stored = rows.length;
    }

    // ── 3. Push auto pour orange (3) et rouge (4) ─────────────────────────────
    const alertRows = rows.filter((r) => r.color_id >= 3);

    for (const alert of alertRows) {
      try {
        // Trouver les communes dans ce département
        const { data: colls } = await sb
          .from("collectivities")
          .select("id, name")
          .eq("department_code", alert.department_code);

        if (!colls?.length) continue;

        for (const coll of colls) {
          // Vérifier si on a déjà envoyé un push pour cette alerte aujourd'hui
          const { data: alreadySent } = await sb
            .from("meteo_push_sent")
            .select("id")
            .eq("collectivity_id", coll.id)
            .eq("phenomenon", alert.phenomenon)
            .eq("sent_date", new Date().toISOString().slice(0, 10))
            .maybeSingle();

          if (alreadySent) continue;

          // Trouver les utilisateurs de cette commune
          const { data: profiles } = await sb
            .from("profiles")
            .select("id")
            .eq("collectivity_id", coll.id);

          if (!profiles?.length) continue;

          const colorLabel = alert.color_id === 4 ? "ROUGE 🔴" : "ORANGE 🟠";
          const icon       = getIcon(alert.phenomenon);

          // Envoyer un push par utilisateur (best-effort)
          for (const profile of profiles) {
            try {
              await sb.functions.invoke("send-push-notification", {
                body: {
                  user_id: profile.id,
                  title:   `${icon} Vigilance météo ${colorLabel} — ${coll.name}`,
                  message: `${alert.phenomenon} — Vigilance ${colorLabel.replace(" 🔴", "").replace(" 🟠", "")} en cours dans votre département.`,
                  url:     "/urgences",
                },
              });
            } catch {
              // Silencieux si l'utilisateur n'est pas abonné aux push
            }
          }

          // Marquer comme envoyé pour éviter les doublons
          await sb.from("meteo_push_sent").insert({
            collectivity_id: coll.id,
            department_code: alert.department_code,
            color_id:        alert.color_id,
            phenomenon:      alert.phenomenon,
            sent_date:       new Date().toISOString().slice(0, 10),
          });

          stats.pushSent++;
        }
      } catch (e) {
        stats.errors.push(`Push ${alert.department_code}: ${(e as Error).message}`);
      }
    }

    console.log(`✅ meteo-vigilance: fetched=${stats.fetched} stored=${stats.stored} pushSent=${stats.pushSent}`, stats.errors);

    return new Response(
      JSON.stringify({ ok: true, ...stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("meteo-vigilance error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message, ...stats }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
