// supabase/functions/create-commune/index.ts
// Crée l'utilisateur auth admin pour une commune via service_role.
// Déployé avec : supabase functions deploy create-commune --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Préflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { collectivityId, adminEmail, adminName, adminPassword } =
      await req.json();

    if (!collectivityId || !adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: "collectivityId, adminEmail et adminPassword sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Client avec service_role pour créer les utilisateurs
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Créer l'utilisateur auth
    const { data: authData, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email:          adminEmail,
        password:       adminPassword,
        email_confirm:  true,
        user_metadata:  { full_name: adminName ?? adminEmail.split("@")[0] },
      });

    if (authErr) throw authErr;
    const userId = authData.user.id;

    // 2. Créer / mettre à jour le profil avec rôle moderator
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id:              userId,
          full_name:       adminName ?? adminEmail.split("@")[0],
          role:            "moderator",
          collectivity_id: collectivityId,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (profileErr) throw profileErr;

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email:   adminEmail,
      }),
      {
        status:  200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status:  500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
