/**
 * operator-action
 * ───────────────
 * Toutes les écritures du panel opérateur transitent ici.
 * Le session_token est validé côté serveur avant toute action.
 *
 * Actions :
 *   change_status  → met à jour reports.status + insère dans report_status_history
 *                    + push notification citoyen + email si opt-in
 *   add_note       → insère dans report_timeline_comments (is_internal = true)
 *   fetch_detail   → retourne media_paths signés + historique + notes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase      = createClient(SUPABASE_URL, SERVICE_KEY);
const STORAGE_URL   = `${SUPABASE_URL}/storage/v1/object/public`;

// Messages push selon le nouveau statut
const STATUS_PUSH: Record<string, string> = {
  published:   "Votre signalement a été publié dans le fil de quartier.",
  in_progress: "Votre signalement est en cours de traitement.",
  resolved:    "Votre signalement a été résolu. Merci pour votre contribution !",
  rejected:    "Votre signalement n'a pas pu être retenu.",
  archived:    "Votre signalement a été archivé.",
  transferred: "Votre signalement a été transmis à un autre service.",
};

// ── Notification citoyen (best-effort, fire-and-forget) ──────────────────────
async function notifyCitizen(
  citizenUserId: string,
  collectivityId: string,
  newStatus: string,
  note: string | undefined,
) {
  const pushMessage = STATUS_PUSH[newStatus];

  // 1. Push Web
  if (pushMessage) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          user_id: citizenUserId,
          title:   "Votre signalement a été mis à jour",
          message: pushMessage,
          url:     "/mes-signalements",
        }),
      });
    } catch { /* silencieux */ }
  }

  // 2. Email — uniquement si opt-in explicite
  try {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("email_notif_reports")
      .eq("user_id", citizenUserId)
      .maybeSingle();

    if (prefs?.email_notif_reports) {
      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          template: "report_updated",
          user_id:  citizenUserId,
          data: {
            statut:          newStatus,
            commentaire:     note?.trim() ?? "",
            collectivity_id: collectivityId,
          },
        }),
      });
    }
  } catch { /* silencieux */ }
}

// ── Validation session ───────────────────────────────────────────────────────
async function validateSession(token: string) {
  if (!token) return null;
  const { data } = await supabase
    .from("operator_sessions")
    .select("user_id, collectivity_id")
    .eq("session_token", token)
    .maybeSingle();
  return data ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { session_token, action, report_id, ...params } = await req.json();

    // 1. Valider la session
    const sess = await validateSession(session_token ?? "");
    if (!sess) return json({ error: "Session invalide ou expirée" }, 401);

    // ── change_status ────────────────────────────────────────────────────────
    if (action === "change_status") {
      const { new_status, note } = params as { new_status: string; note?: string };

      // Vérifier que le signalement appartient à la collectivité
      // user_id + is_anonymous nécessaires pour la notification citoyen
      const { data: report } = await supabase
        .from("reports")
        .select("status, collectivity_id, user_id, is_anonymous")
        .eq("id", report_id)
        .eq("collectivity_id", sess.collectivity_id)
        .maybeSingle();

      if (!report) return json({ error: "Signalement introuvable" }, 404);

      // Mettre à jour le statut
      await supabase
        .from("reports")
        .update({ status: new_status, updated_at: new Date().toISOString() })
        .eq("id", report_id);

      // Historique
      await supabase.from("report_status_history").insert({
        report_id,
        old_status:  report.status,
        new_status,
        changed_by:  sess.user_id,
        comment:     note ?? null,
        changed_at:  new Date().toISOString(),
      });

      // Note interne si fournie
      if (note?.trim()) {
        await supabase.from("report_timeline_comments").insert({
          report_id,
          text:        note.trim(),
          author_id:   sess.user_id,
          is_internal: true,
          is_approved: true,
        });
      }

      // Journal événement
      await supabase.from("report_timeline_events").insert({
        report_id,
        event_type:  "status_change",
        title:       `Statut changé → ${new_status}`,
        description: note ?? null,
        from_status: report.status,
        to_status:   new_status,
        actor_id:    sess.user_id,
        is_public:   false,
      });

      // Notification citoyen (best-effort, non bloquante)
      if (report.user_id && !report.is_anonymous) {
        notifyCitizen(report.user_id, sess.collectivity_id, new_status, note).catch(
          () => {/* silencieux */}
        );
      }

   