/**
 * invite-commune — Edge Function VigieCity
 * Crée une invitation pour un admin de commune et envoie l'email via send-email EF.
 *
 * Body attendu (JSON) :
 *   { collectivity_id: string, email: string, plan_id?: string }
 *
 * Auth: Bearer JWT du super_admin appelant (vérifié via RLS insert dans commune_invites)
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { collectivity_id, email, plan_id } = await req.json();

    if (!collectivity_id || !email) {
      return new Response(
        JSON.stringify({ error: "collectivity_id et email sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Vérifier que l'appelant est bien un super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Droits insuffisants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Récupérer les infos de la commune
    const { data: coll } = await supabase
      .from("collectivities")
      .select("name, department_code")
      .eq("id", collectivity_id)
      .single();

    if (!coll) {
      return new Response(
        JSON.stringify({ error: "Commune introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Invalider les invitations en attente pour ce couple commune+email
    await supabase
      .from("commune_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("collectivity_id", collectivity_id)
      .eq("email", email)
      .is("accepted_at", null);

    // Créer la nouvelle invitation
    const { data: invite, error: invErr } = await supabase
      .from("commune_invites")
      .insert({
        collectivity_id,
        plan_id:    plan_id ?? null,
        email:      email.toLowerCase().trim(),
        invited_by: user.id,
      })
      .select("token, expires_at")
      .single();

    if (invErr || !invite) throw invErr ?? new Error("Erreur création invitation");

    const inviteUrl = `${APP_URL}/admin/accept-invite?token=${invite.token}`;
    const expiresDate = new Date(invite.expires_at).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    // Envoyer l'email via send-email EF
    await supabase.functions.invoke("send-email", {
      body: {
        template: "invite_admin",
        to:       email,
        data: {
          commune:     coll.name,
          department:  coll.department_code ?? "",
          invite_url:  inviteUrl,
          expires:     expiresDate,
        },
      },
    });

    return new Response(
      JSON.stringify({
        success:    true,
        invite_url: inviteUrl,
        expires_at: invite.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("invite-commune error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
