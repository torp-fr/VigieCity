/**
 * send-alert
 * ──────────
 * Envoie une alerte générale géo-ciblée à tous les citoyens abonnés (push)
 * d'une collectivité, avec filtrage optionnel par quartier.
 *
 * Body JSON :
 *   collectivity_id  string (requis)
 *   title            string (requis)
 *   message          string (requis)
 *   severity         "info" | "warning" | "critical"  (défaut: "info")
 *   area_label       string  (libellé zone, ex: "Quartier Nord")
 *   district         string  (filtrer sur profiles.district, optionnel)
 *   expires_at       ISO string (optionnel)
 *   url              string  (URL de redirection push, défaut: "/urgences")
 *
 * Retourne : { alert_id, recipient_count, errors }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

// Limite de concurrence pour les push
const CONCURRENCY = 20;

async function sendPushToUser(
  userId: string,
  title: string,
  message: string,
  url: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ user_id: userId, title, message, url }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Pool de concurrence : traite `tasks` par blocs de `size`
async function runPool<T>(
  tasks: (() => Promise<T>)[],
  size: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += size) {
    const batch = tasks.slice(i, i + size).map((t) => t());
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Vérifier l'appelant (admin ou super_admin)
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, collectivity_id")
      .eq("id", caller.id)
      .single();

    const isAdmin = callerProfile?.role === "admin" || callerProfile?.role === "super_admin";
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Droits insuffisants" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Paramètres de l'alerte
    const {
      collectivity_id,
      title,
      message,
      severity = "info",
      area_label = "",
      district,
      expires_at,
      url = "/urgences",
    } = await req.json() as {
      collectivity_id: string;
      title: string;
      message: string;
      severity?: "info" | "warning" | "critical";
      area_label?: string;
      district?: string;
      expires_at?: string;
      url?: string;
    };

    if (!collectivity_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: "collectivity_id, title et message sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Récupérer les user_ids abonnés dans cette collectivité (+ filtre quartier)
    let query = adminClient
      .from("push_subscriptions")
      .select("user_id, profiles!inner(collectivity_id, district)")
      .eq("profiles.collectivity_id", collectivity_id);

    if (district) {
      query = query.eq("profiles.district", district);
    }

    const { data: subs, error: subsErr } = await query;
    if (subsErr) throw new Error(subsErr.message);

    // Dédupliquer par user_id (un user peut avoir plusieurs souscriptions)
    const userIds = [...new Set((subs ?? []).map((s: any) => s.user_id as string))];

    // 4. Envoyer les pushs en pool de concurrence
    let successCount = 0;
    let errorCount   = 0;

    if (userIds.length > 0) {
      const tasks = userIds.map((uid) => () => sendPushToUser(uid, title, message, url));
      const results = await runPool(tasks, CONCURRENCY);
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) successCount++;
        else errorCount++;
      }
    }

    // 5. Enregistrer l'alerte dans la table alerts
    const { data: alertRecord, error: alertErr } = await adminClient
      .from("alerts")
      .insert({
        collectivity_id,
        title,
        message,
        severity,
        area_label: area_label || (district ? `Quartier ${district}` : "Commune entière"),
        expires_at: expires_at ?? null,
        created_by: caller.id,
      })
      .select("id")
      .single();

    if (alertErr) {
      console.error("Erreur insertion alerte:", alertErr.message);
    }

    // 6. Logger dans push_notifications_log
    await adminClient.from("push_notifications_log").insert({
      collectivity_id,
      title,
      body: message,
      severity,
      sent_by: caller.id,
      recipient_count: successCount,
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        alert_id: alertRecord?.id ?? null,
        recipient_count: successCount,
        errors: errorCount,
        total_subscribers: userIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
