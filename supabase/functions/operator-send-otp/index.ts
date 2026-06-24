/**
 * operator-send-otp
 * ─────────────────
 * Reçoit un numéro de téléphone, vérifie qu'il correspond à un opérateur
 * habilité, génère un code OTP 6 chiffres et l'envoie via :
 *   1. Android SMS Gateway (capcom6) si SMS_GATEWAY_URL configuré
 *   2. Sinon : email fallback via send-email EF
 *
 * Variables d'environnement :
 *   SMS_GATEWAY_URL       - ex: https://sms.votredomaine.fr  (optionnel)
 *   SMS_GATEWAY_LOGIN     - Basic auth login
 *   SMS_GATEWAY_PASSWORD  - Basic auth password
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMS_URL       = Deno.env.get("SMS_GATEWAY_URL") ?? "";
const SMS_LOGIN     = Deno.env.get("SMS_GATEWAY_LOGIN") ?? "";
const SMS_PASSWORD  = Deno.env.get("SMS_GATEWAY_PASSWORD") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Normalise numéro FR vers E.164 ──────────────────────────────────────────
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-\.\(\)]/g, "");
  if (/^\+33\d{9}$/.test(digits))  return digits;
  if (/^0\d{9}$/.test(digits))     return "+33" + digits.slice(1);
  if (/^33\d{9}$/.test(digits))    return "+" + digits;
  return null;
}

// ── Hash SHA-256 du code ─────────────────────────────────────────────────────
async function hashCode(phone: string, code: string): Promise<string> {
  const data    = new TextEncoder().encode(`${phone}:${code}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Envoi SMS via Android SMS Gateway (capcom6) ──────────────────────────────
async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!SMS_URL) return false;
  try {
    const credentials = btoa(`${SMS_LOGIN}:${SMS_PASSWORD}`);
    const res = await fetch(`${SMS_URL}/3rdparty/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${credentials}`,
      },
      body: JSON.stringify({
        message:      message,
        phoneNumbers: [phone],
        ttl:          600,    // 10 minutes
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Envoi email fallback ─────────────────────────────────────────────────────
async function sendEmailFallback(
  email: string,
  name: string,
  code: string,
): Promise<void> {
  await supabase.functions.invoke("send-email", {
    body: {
      template: "operator_otp",
      to:       email,
      data:     { code, expires_in: "10 minutes", name },
    },
  });
}

// ── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone: rawPhone } = await req.json();

    // 1. Normaliser le numéro
    const phone = normalizePhone(rawPhone ?? "");
    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Numéro de téléphone invalide. Format attendu : 06XXXXXXXX ou +33XXXXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Vérifier qu'un opérateur habilité possède ce numéro
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, collectivity_id")
      .eq("phone", phone)
      .maybeSingle();

    if (profileError || !profile) {
      // Réponse volontairement ambiguë (sécurité : pas de user enumeration)
      return new Response(
        JSON.stringify({ success: true, method: "sms" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Vérifier rôle opérateur
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("collectivity_id")
      .eq("user_id", profile.id)
      .eq("role", "operator")
      .maybeSingle();

    if (!roleRow) {
      // Même réponse ambiguë
      return new Response(
        JSON.stringify({ success: true, method: "sms" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Générer OTP 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await hashCode(phone, code);

    // 5. Invalider anciens OTPs pour ce téléphone, insérer le nouveau
    await supabase.from("otp_codes").delete().eq("phone", phone);
    await supabase.from("otp_codes").insert({
      phone,
      code_hash:       hash,
      collectivity_id: roleRow.collectivity_id,
    });

    // 6. Envoyer le code
    const message    = `VigieCity — Code opérateur : ${code}\nValable 10 minutes. Ne le communiquez pas.`;
    const smsSent    = await sendSMS(phone, message);
    let   method     = "sms";

    if (!smsSent) {
      // Fallback email : récupère l'email depuis auth.users
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users?.find((u) => u.id === profile.id);
      if (user?.email) {
        await sendEmailFallback(user.email, profile.display_name ?? "Opérateur", code);
        method = "email";
      }
    }

    return new Response(
      JSON.stringify({ success: true, method }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("operator-send-otp error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
