/**
 * send-push-notification — Edge Function VigieCity
 *
 * Envoie des notifications Web Push (VAPID) aux abonnés.
 *
 * Secrets requis dans Supabase Edge Function Secrets :
 *   VAPID_PUBLIC_KEY         — clé publique VAPID (base64url)
 *   VAPID_PRIVATE_KEY        — clé privée VAPID (base64url)
 *   SUPABASE_SERVICE_ROLE_KEY — accès complet à push_subscriptions
 *
 * Usage :
 *   // Ciblé — un utilisateur (ex: notification signalement)
 *   invoke("send-push-notification", { body: { user_id, title, message, url } })
 *
 *   // Broadcast commune (ex: alerte admin)
 *   invoke("send-push-notification", { body: { collectivity_id, title, message, url } })
 */

// @deno-types="npm:@types/web-push@3"
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      throw new Error(
        "VAPID keys not configured — add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to Edge Function secrets",
      );
    }

    webpush.setVapidDetails(
      "mailto:contact@vigiecity.fr",
      VAPID_PUBLIC,
      VAPID_PRIVATE,
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as {
      user_id?:         string;
      collectivity_id?: string;
      title:            string;
      message:          string;
      url?:             string;
    };

    const { user_id, collectivity_id, title, message, url = "/accueil" } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Fetch target subscriptions ─────────────────────────────────────────

    let subs: { endpoint: string; p256dh: string; auth: string }[] = [];

    if (user_id) {
      // Notification ciblée — 1 utilisateur
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", user_id);
      if (error) throw error;
      subs = (data ?? []) as typeof subs;

    } else if (collectivity_id) {
      // Broadcast commune — tous les abonnés de la commune
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("collectivity_id", collectivity_id);
      if (profErr) throw profErr;

      const userIds = (profiles ?? []).map((p: { id: string }) => p.id);
      if (userIds.length === 0) {
        return new Response(
          JSON.stringify({ sent: 0, info: "no users in commune" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .in("user_id", userIds);
      if (error) throw error;
      subs = (data ?? []) as typeof subs;

    } else {
      return new Response(
        JSON.stringify({ error: "user_id or collectivity_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (subs.length === 0) {
      console.log("[send-push] No subscriptions found — nothing sent");
      return new Response(
        JSON.stringify({ sent: 0, info: "no push subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Send to all subscriptions ──────────────────────────────────────────

    const payload = JSON.stringify({ title, message, url });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400 },
        )
      ),
    );

    const sent   = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason?.statusCode ?? r.reason?.message ?? "unknown"));

    // Clean up expired/invalid subscriptions (status 410 = gone, 404 = not found)
    if (failed > 0) {
      const expiredEndpoints = (
        await Promise.all(
          results.map(async (r, i) => {
            if (r.status === "rejected") {
              const code = r.reason?.statusCode;
              if (code === 410 || code === 404) return subs[i].endpoint;
            }
            return null;
          })
        )
      ).filter(Boolean) as string[];

      if (expiredEndpoints.length > 0) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .in("endpoint", expiredEndpoints);
        console.log(`[send-push] Removed ${expiredEndpoints.length} expired subscriptions`);
      }
    }

    console.log(`[send-push] ${sent} sent, ${failed} failed`, errors);

    return new Response(
      JSON.stringify({
        sent,
        failed,
        errors: failed > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("[send-push-notification] error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
