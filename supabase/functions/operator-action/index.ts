/**
 * operator-action
 * ───────────────
 * Toutes les écritures du panel opérateur transitent ici.
 * Le session_token est validé côté serveur avant toute action.
 *
 * Actions :
 *   change_status  → met à jour reports.status + insère dans report_status_history
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
      const { data: report } = await supabase
        .from("reports")
        .select("status, collectivity_id")
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

      return json({ ok: true });
    }

    // ── add_note ─────────────────────────────────────────────────────────────
    if (action === "add_note") {
      const { text } = params as { text: string };
      if (!text?.trim()) return json({ error: "Note vide" }, 400);

      // Vérifier appartenance collectivité
      const { data: report } = await supabase
        .from("reports")
        .select("id")
        .eq("id", report_id)
        .eq("collectivity_id", sess.collectivity_id)
        .maybeSingle();

      if (!report) return json({ error: "Signalement introuvable" }, 404);

      const { data: comment } = await supabase
        .from("report_timeline_comments")
        .insert({
          report_id,
          text:        text.trim(),
          author_id:   sess.user_id,
          is_internal: true,
          is_approved: true,
        })
        .select("id, text, created_at")
        .single();

      return json({ ok: true, comment });
    }

    // ── fetch_detail ──────────────────────────────────────────────────────────
    if (action === "fetch_detail") {
      // Notes internes
      const { data: notes } = await supabase
        .from("report_timeline_comments")
        .select("id, text, is_internal, created_at")
        .eq("report_id", report_id)
        .eq("is_internal", true)
        .order("created_at", { ascending: false });

      // Historique statuts
      const { data: history } = await supabase
        .from("report_status_history")
        .select("id, old_status, new_status, comment, changed_at")
        .eq("report_id", report_id)
        .order("changed_at", { ascending: false });

      // URLs photos (bucket public "reports-media" ou "reports")
      const { data: report } = await supabase
        .from("reports")
        .select("media_paths")
        .eq("id", report_id)
        .eq("collectivity_id", sess.collectivity_id)
        .maybeSingle();

      const photoUrls = (report?.media_paths ?? []).map((p: string) =>
        p.startsWith("http") ? p : `${STORAGE_URL}/reports/${p}`
      );

      return json({ notes: notes ?? [], history: history ?? [], photoUrls });
    }

    return json({ error: "Action inconnue" }, 400);

  } catch (err) {
    console.error("operator-action error:", err);
    return json({ error: "Erreur serveur" }, 500);
  }
});
