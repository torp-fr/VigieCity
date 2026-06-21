/**
 * event-reminder-push — Edge Function VigieCity
 * Envoie un push J-1 à tous les utilisateurs inscrits à un événement démarrant demain.
 * Appelée par pg_cron tous les jours à 9h00.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const stats = { eventsChecked: 0, pushSent: 0, errors: [] as string[] };

  try {
    // Fenêtre : événements démarrant demain (entre 00:00 et 23:59 UTC+1 de demain)
    const tomorrowStart = new Date();
    tomorrowStart.setUTCHours(23, 0, 0, 0); // 00h00 heure de Paris (UTC+1)
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 3600_000);

    // Récupérer les événements publiés démarrant demain
    const { data: events, error: evErr } = await sb
      .from("events")
      .select("id, title, start_at, location, collectivity_id")
      .eq("is_published", true)
      .gte("start_at", tomorrowStart.toISOString())
      .lt("start_at", tomorrowEnd.toISOString());

    if (evErr) throw evErr;
    if (!events?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: "No events tomorrow", ...stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    stats.eventsChecked = events.length;

    for (const event of events) {
      try {
        // Récupérer les inscrits à cet événement
        const { data: registrations } = await sb
          .from("event_registrations")
          .select("user_id")
          .eq("event_id", event.id);

        if (!registrations?.length) continue;

        const startTime = new Date(event.start_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit", minute: "2-digit",
        });
        const locationPart = event.location ? ` — ${event.location}` : "";

        for (const reg of registrations) {
          try {
            await sb.functions.invoke("send-push-notification", {
              body: {
                user_id: reg.user_id,
                title:   `📅 Rappel : ${event.title}`,
                message: `Votre événement commence demain à ${startTime}${locationPart}.`,
                url:     "/evenements",
              },
            });
            stats.pushSent++;
          } catch {
            // Silencieux si utilisateur pas abonné aux push
          }
        }
      } catch (e) {
        stats.errors.push(`Event ${event.id}: ${(e as Error).message}`);
      }
    }

    console.log(`✅ event-reminder-push: checked=${stats.eventsChecked} sent=${stats.pushSent}`, stats.errors);

    return new Response(
      JSON.stringify({ ok: true, ...stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("event-reminder-push error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message, ...stats }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
