// supabase/functions/create-commune/index.ts
// Crée l'utilisateur auth admin pour une commune via service_role.
// Envoie l'email de bienvenue via send-email après la création.
// verify_jwt: false

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FUNCTION_SECRET   = Deno.env.get("FUNCTION_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendWelcomeEmail(params: {
  adminEmail: string;
  adminName: string;
  communeName: string;
  planName: string;
}): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-function-secret": FUNCTION_SECRET,
      },
      body: JSON.stringify({
        template_id: "welcome_commune",
        to: params.adminEmail,
        data: {
          commune_name:  params.communeName,
          admin_name:    params.adminName,
          plan_name:     params.planName,
          dashboard_url: `${SUPABASE_URL.replace("supabase.co", "vigiecity.fr")}/admin`,
          support_email: "support@vigiecity.fr",
        },
      }),
    });
  } catch (err) {
    // Non-bloquant : log l'erreur mais ne fait pas échouer la création
    console.error("[create-commune] send-email failed (non-blocking):", err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { collectivityId, adminEmail, adminName, adminPassword } = await req.json();

    if (!collectivityId || !adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: "collectivityId, adminEmail et adminPassword sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Créer l'utilisateur auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email:         adminEmail,
      password:      adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName ?? adminEmail.split("@")[0] },
    });
    if (authErr) throw authErr;
    const userId = authData.user.id;

    // 2. Récupérer le nom de la collectivité et le plan
    const { data: collectivity } = await supabaseAdmin
      .from("collectivities")
      .select("name, plan_name")
      .eq("id", collectivityId)
      .single();

    const communeName = collectivity?.name ?? "Votre commune";
    const planName    = collectivity?.plan_name ?? "Découverte";
    const resolvedName = adminName ?? adminEmail.split("@")[0];

    // 3. Créer / mettre à jour le profil
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id:              userId,
          full_name:       resolvedName,
          role:            "moderator",
          collectivity_id: collectivityId,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (profileErr) throw profileErr;

    // 4. Email de bienvenue (non-bloquant)
    await sendWelcomeEmail({
      adminEmail,
      adminName:  resolvedName,
      communeName,
      planName,
    });

    return new Response(
      JSON.stringify({ success: true, userId, email: adminEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
