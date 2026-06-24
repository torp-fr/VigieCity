// Edge Function : activate-license
// Activation / prolongation / suspension d'une licence commune
// Appelé par super_admin uniquement (verif role en DB)
// Paiement via Chorus Pro ou virement — PAS de Stripe

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivatePayload {
  action: "activate" | "extend" | "suspend" | "trial";
  collectivity_id: string;
  plan_id?: string;            // nano | micro | local | urbain | metropole
  duration_months?: number;   // 1, 6, 12, 24, 36
  payment_method?: "virement" | "chorus_pro" | "trial" | "gratuit";
  chorus_pro_ref?: string;    // numero EJ Chorus Pro
  invoice_number?: string;
  invoice_date?: string;      // ISO date YYYY-MM-DD
  amount_eur?: number;        // en euros (convertit en centimes)
  billing_email?: string;
  contact_name?: string;
  contact_phone?: string;
  notes?: string;
}

// Prix de référence par plan (en centimes/mois)
const PLAN_PRICES: Record<string, number> = {
  nano:      4900,
  micro:     9900,
  local:     18900,
  urbain:    49000,
  metropole: 0,  // sur devis
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Vérifier JWT + rôle super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleRow?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden — super_admin requis" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: ActivatePayload = await req.json();
    const { action, collectivity_id } = payload;

    if (!collectivity_id) {
      return new Response(JSON.stringify({ error: "collectivity_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer la licence existante (ou en créer une)
    const { data: existing } = await supabase
      .from("commune_licenses")
      .select("*")
      .eq("collectivity_id", collectivity_id)
      .single();

    const now = new Date();
    let updateData: Record<string, unknown> = { updated_at: now.toISOString() };

    if (action === "suspend") {
      updateData.status = "suspended";
      updateData.notes = payload.notes ?? "Suspendu par super_admin";

    } else if (action === "trial") {
      const trialEnds = new Date(now);
      trialEnds.setDate(trialEnds.getDate() + 30);
      updateData = {
        ...updateData,
        status:          "trial",
        plan_id:         payload.plan_id ?? "nano",
        plan:            payload.plan_id ?? "nano",
        payment_method:  "trial",
        trial_ends_at:   trialEnds.toISOString(),
        expires_at:      trialEnds.toISOString(),
        started_at:      now.toISOString(),
        duration_months: 0,
      };

    } else if (action === "activate" || action === "extend") {
      const durationMonths = payload.duration_months ?? 12;
      const planId = payload.plan_id ?? existing?.plan_id ?? "nano";

      // Calcul expires_at : si extend, part de la date actuelle ou de expires_at si dans le futur
      let baseDate = now;
      if (action === "extend" && existing?.expires_at) {
        const currentExpiry = new Date(existing.expires_at);
        if (currentExpiry > now) baseDate = currentExpiry;
      }
      const expiresAt = new Date(baseDate);
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

      // Calcul montant si non fourni
      const planPrice = PLAN_PRICES[planId] ?? 0;
      const amountCents = payload.amount_eur != null
        ? payload.amount_eur * 100
        : planPrice * durationMonths;

      updateData = {
        ...updateData,
        status:          "active",
        plan_id:         planId,
        plan:            planId,
        payment_method:  payload.payment_method ?? "virement",
        chorus_pro_ref:  payload.chorus_pro_ref ?? null,
        invoice_number:  payload.invoice_number ?? null,
        invoice_date:    payload.invoice_date ?? null,
        amount_eur:      amountCents,
        duration_months: durationMonths,
        expires_at:      expiresAt.toISOString(),
        billing_email:   payload.billing_email ?? existing?.billing_email,
        contact_name:    payload.contact_name  ?? existing?.contact_name,
        contact_phone:   payload.contact_phone ?? existing?.contact_phone,
        notes:           payload.notes ?? null,
        trial_ends_at:   null,
        auto_renew:      false,  // renouvellement manuel = Chorus Pro
      };
      if (action === "activate") {
        updateData.started_at = now.toISOString();
      }
    } else {
      return new Response(JSON.stringify({ error: "action invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from("commune_licenses")
        .update(updateData)
        .eq("collectivity_id", collectivity_id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Créer la licence si elle n'existe pas
      const { data, error } = await supabase
        .from("commune_licenses")
        .insert({ collectivity_id, ...updateData })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return new Response(
      JSON.stringify({ success: true, license: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("activate-license error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
