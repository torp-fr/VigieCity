/**
 * operator-invite
 * ───────────────
 * Crée un compte opérateur de terrain :
 *   1. Crée le user Supabase Auth (email confirmé, pas de mail envoyé)
 *   2. Upsert le profil (display_name, phone, collectivity_id)
 *   3. Insère le rôle "operator" dans user_roles
 *
 * Appelée depuis /admin/habilitations (admin commune authentifié).
 * Requiert : Authorization: Bearer <jwt_admin>
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authentifier l'appelant (doit être admin ou super_admin)
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Vérifier que l'appelant est admin ou super_admin
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

    // 3. Extraire les paramètres
    const { display_name, phone, email, collectivity_id } = await req.json() as {
      display_name: string;
      phone: string;
      email: string;
      collectivity_id: string;
    };

    if (!display_name || !phone || !collectivity_id) {
      return new Response(JSON.stringify({ error: "Paramètres manquants (display_name, phone, collectivity_id requis)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Créer ou récupérer le user Auth
    // On cherche d'abord si un user avec cet email/phone existe
    let userId: string;

    if (email) {
      const { data: existing } = await adminClient
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      if (existing?.id) {
        // Profil existant : on réutilise le user_id
        userId = existing.id;
      } else {
        // Créer un nouveau user Auth (email confirmé, mot de passe temporaire)
        const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "Vg1!";
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { display_name, phone },
        });
        if (createErr || !newUser.user) {
          return new Response(JSON.stringify({ error: createErr?.message ?? "Erreur création compte" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = newUser.user.id;
      }
    } else {
      // Pas d'email : l'opérateur utilise uniquement le SMS OTP
      // On cherche par téléphone dans profiles
      const { data: byPhone } = await adminClient
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      if (byPhone?.id) {
        userId = byPhone.id;
      } else {
        // Créer un user Auth avec email généré (phone-only)
        const generatedEmail = `operator_${phone.replace(/\+/g, "").replace(/\s/g, "")}@vigie.city.internal`;
        const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "Vg1!";
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email: generatedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { display_name, phone },
        });
        if (createErr || !newUser.user) {
          return new Response(JSON.stringify({ error: createErr?.message ?? "Erreur création compte" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = newUser.user.id;
      }
    }

    // 5. Upsert profil
    const { error: profileErr } = await adminClient.from("profiles").upsert({
      id: userId,
      display_name,
      phone,
      collectivity_id,
      role: "citizen", // rôle applicatif géré dans user_roles
    }, { onConflict: "id" });
    if (profileErr) throw new Error(profileErr.message);

    // 6. Insérer/mettre à jour le rôle operator
    const { error: roleErr } = await adminClient.from("user_roles").upsert({
      user_id: userId,
      role: "operator",
      collectivity_id,
    }, { onConflict: "user_id,collectivity_id" });
    if (roleErr) throw new Error(roleErr.message);

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "Erreur interne" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
