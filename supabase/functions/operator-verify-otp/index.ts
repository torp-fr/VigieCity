/**
 * operator-verify-otp
 * ───────────────────
 * Reçoit { phone, code }, vérifie le hash SHA-256, crée une session opérateur
 * et retourne { session_token, operator_name, collectivity_id, collectivity_name }.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const MAX_ATTEMPTS = 5;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-\.\(\)]/g, "");
  if (/^\+33\d{9}$/.test(digits))  return digits;
  if (/^0\d{9}$/.test(digits))     return "+33" + digits.slice(1);
  if (/^33\d{9}$/.test(digits))    return "+" + digits;
  return null;
}

async function hashCode(phone: string, code: string): Promise<string> {
  const data    = new TextEncoder().encode(`${phone}:${code}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone: rawPhone, code } = await req.json();

    // 1. Normaliser
    const phone = normalizePhone(rawPhone ?? "");
    if (!phone || !code || String(code).length !== 6) {
      return new Response(
        JSON.stringify({ error: "Paramètres invalides" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Récupérer le dernier OTP valide pour ce téléphone
    const { data: otp, error: otpErr } = await supabase
      .from("otp_codes")
      .select("id, code_hash, expires_at, used_at, attempts, collectivity_id")
      .eq("phone", phone)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpErr || !otp) {
      return new Response(
        JSON.stringify({ error: "Code expiré ou introuvable. Recommencez." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Vérifier le nombre de tentatives
    if (otp.attempts >= MAX_ATTEMPTS) {
      await supabase.from("otp_codes").delete().eq("id", otp.id);
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Demandez un nouveau code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Vérifier le hash
    const expectedHash = await hashCode(phone, String(code));
    if (expectedHash !== otp.code_hash) {
      await supabase
        .from("otp_codes")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);

      const remaining = MAX_ATTEMPTS - otp.attempts - 1;
      return new Response(
        JSON.stringify({
          error: `Code incorrect. ${remaining} tentative(s) restante(s).`,
          remaining,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Marquer OTP comme utilisé
    await supabase
      .from("otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otp.id);

    // 6. Récupérer le profil et la collectivité
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, collectivity_id")
      .eq("phone", phone)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Profil introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const collectivityId = otp.collectivity_id ?? profile.collectivity_id;

    const { data: collectivity } = await supabase
      .from("collectivities")
      .select("id, name, logo_url, primary_color")
      .eq("id", collectivityId)
      .maybeSingle();

    // 7. Créer la session opérateur
    const { data: session, error: sessionErr } = await supabase
      .from("operator_sessions")
      .insert({
        user_id:         profile.id,
        collectivity_id: collectivityId,
      })
      .select("session_token")
      .single();

    if (sessionErr || !session) {
      throw new Error("Impossible de créer la session");
    }

    return new Response(
      JSON.stringify({
        session_token:      session.session_token,
        operator_name:      profile.display_name ?? "Opérateur",
        collectivity_id:    collectivityId,
        collectivity_name:  collectivity?.name ?? "",
        collectivity_logo:  collectivity?.logo_url ?? null,
        collectivity_color: collectivity?.primary_color ?? "#1e3a8a",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("operator-verify-otp error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
