// send-email Edge Function — VigieCity
// Routes template_id → HTML generation → Resend API
// verify_jwt: false (server-side only, protected by x-function-secret header)
// Env vars: RESEND_API_KEY, FUNCTION_SECRET

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET") ?? "";
const FROM_ADMIN = "VigieCity <noreply@vigiecity.fr>";
const FROM_ALERT = "VigieCity Alertes <alertes@vigiecity.fr>";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Data = Record<string, string>;

function v(data: Data, key: string, fallback = ""): string {
  return data[key] ?? fallback;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Base layout
// ---------------------------------------------------------------------------

function layout(accentColor: string, content: string, alertMode = false): string {
  const accentHeight = alertMode ? "16" : "8";
  const footer = alertMode
    ? `<p style="margin:0;font-size:11px;color:#9CA3AF;">Cet email a été envoyé automatiquement par le système d'alerte de VigieCity.</p>`
    : `<p style="margin:0 0 6px;font-size:11px;color:#9CA3AF;">© 2025 VigieCity — La commune connectée</p>
       <p style="margin:0 0 6px;font-size:11px;color:#B0B8C4;">Vous recevez cet email car vous êtes inscrit sur VigieCity.</p>
       <p style="margin:0;font-size:11px;"><a href="#" style="color:#9CA3AF;text-decoration:underline;">Se désabonner</a></p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>VigieCity</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
    <tr><td height="${accentHeight}" style="background:${accentColor};font-size:1px;line-height:1px;">&nbsp;</td></tr>
    <tr><td style="padding:24px 32px 20px;border-bottom:1px solid #F3F4F6;">
      <span style="font-size:22px;font-weight:700;color:#1D4ED8;letter-spacing:-0.5px;">🏛️ VigieCity</span>
      <span style="display:block;font-size:12px;color:#6B7280;margin-top:2px;">La commune connectée</span>
    </td></tr>
    <tr><td style="padding:32px;">${content}</td></tr>
    <tr><td style="padding:20px 32px;background:#F8FAFC;border-top:1px solid #E5E7EB;text-align:center;">${footer}</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// Reusable blocks
function btn(label: string, url: string, color = "#1D4ED8"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr>
    <td style="border-radius:6px;background:${color};">
      <a href="${url}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:6px;">${label}</a>
    </td></tr></table>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#6B7280;width:40%;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:#1F2937;border-bottom:1px solid #E5E7EB;">${value}</td>
  </tr>`;
}

function featureBox(icon: string, label: string, color: string): string {
  return `<td style="width:33%;padding:6px;text-align:center;vertical-align:top;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background:${color}14;border:1px solid ${color}30;border-radius:8px;padding:16px 8px;text-align:center;">
        <div style="font-size:24px;margin-bottom:8px;">${icon}</div>
        <div style="font-size:12px;font-weight:600;color:#1F2937;">${label}</div>
      </td></tr></table></td>`;
}

function statBox(icon: string, value: string, label: string, color: string): string {
  return `<td style="width:50%;padding:6px;text-align:center;vertical-align:top;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;padding:16px 8px;text-align:center;">
        <div style="font-size:22px;margin-bottom:4px;">${icon}</div>
        <div style="font-size:28px;font-weight:700;color:${color};margin-bottom:4px;">${value}</div>
        <div style="font-size:12px;color:#6B7280;">${label}</div>
      </td></tr></table></td>`;
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

type TemplateResult = { subject: string; html: string; from?: string };

const TEMPLATES: Record<string, (d: Data) => TemplateResult> = {

  // 01 — Bienvenue Commune
  welcome_commune: (d) => ({
    subject: `🏛️ Bienvenue sur VigieCity — ${esc(v(d, "commune_name"))}`,
    html: layout("#1D4ED8", `
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1F2937;">Bienvenue, ${esc(v(d, "commune_name"))} !</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Bonjour <strong>${esc(v(d, "admin_name"))}</strong>,<br><br>
      Votre espace VigieCity est prêt. En tant qu'administrateur, vous pouvez dès maintenant configurer vos services, personnaliser l'application et inviter vos équipes.</p>
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;">Plan actif : ${esc(v(d, "plan_name"))}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr>
        ${featureBox("🗺️", "Carte des signalements", "#1D4ED8")}
        ${featureBox("📢", "Alertes citoyens", "#DC2626")}
        ${featureBox("📊", "Tableau de bord", "#16A34A")}
      </tr></table>
      ${btn("Accéder au tableau de bord", v(d, "dashboard_url"))}
      <p style="margin:0;font-size:13px;color:#6B7280;text-align:center;">Des questions ? <a href="mailto:${esc(v(d, "support_email"))}" style="color:#1D4ED8;text-decoration:none;">${esc(v(d, "support_email"))}</a></p>
    `),
  }),

  // 02 — Bienvenue Citoyen
  welcome_citizen: (d) => ({
    subject: `👋 Bienvenue sur VigieCity, ${esc(v(d, "first_name"))} !`,
    html: layout("#0EA5E9", `
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1F2937;">Bonjour ${esc(v(d, "first_name"))} !</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Votre commune <strong>${esc(v(d, "commune_name"))}</strong> utilise VigieCity pour améliorer la vie de ses habitants. Vous faites désormais partie de la communauté !</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr>
        ${featureBox("📍", "Signalez un problème", "#0EA5E9")}
        ${featureBox("🔔", "Recevez des alertes", "#D97706")}
        ${featureBox("🗳️", "Consultations", "#7C3AED")}
      </tr></table>
      ${btn("Découvrir VigieCity", v(d, "app_url"), "#0EA5E9")}
      <p style="margin:0;font-size:13px;color:#6B7280;text-align:center;">Besoin d'aide ? <a href="mailto:${esc(v(d, "support_email"))}" style="color:#0EA5E9;text-decoration:none;">${esc(v(d, "support_email"))}</a></p>
    `),
  }),

  // 03 — Réinitialisation MDP
  password_reset: (d) => ({
    subject: `🔐 Réinitialisation de votre mot de passe — VigieCity`,
    html: layout("#6B7280", `
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1F2937;">Réinitialisation du mot de passe</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Bonjour <strong>${esc(v(d, "user_name"))}</strong>,<br><br>
      Nous avons reçu une demande de réinitialisation de votre mot de passe VigieCity. Cliquez ci-dessous pour en créer un nouveau.</p>
      ${btn("Réinitialiser mon mot de passe", v(d, "reset_url"), "#374151")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr>
        <td style="background:#FFFBEB;border:1px solid #D97706;border-radius:6px;padding:16px;">
          <p style="margin:0;font-size:14px;color:#92400E;"><strong>⚠️ Attention :</strong> Ce lien expire dans <strong>${esc(v(d, "expiry_minutes", "15"))} minutes</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe restera inchangé.</p>
        </td></tr></table>
      <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">Pour des raisons de sécurité, ne partagez jamais ce lien.</p>
    `),
  }),

  // 04 — Notification Signalement
  report_notification: (d) => ({
    subject: `📋 Nouveau signalement — ${esc(v(d, "category"))} · ${esc(v(d, "commune_name"))}`,
    html: layout("#D97706", `
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1F2937;">Nouveau signalement reçu</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Un nouveau signalement vient d'être soumis sur <strong>${esc(v(d, "commune_name"))}</strong>.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;border-collapse:collapse;">
        ${infoRow("Catégorie", esc(v(d, "category")))}
        ${infoRow("Sévérité", esc(v(d, "severity")))}
        ${infoRow("Lieu", esc(v(d, "location")))}
        ${infoRow("Signalé le", esc(v(d, "reported_at")))}
        ${infoRow("Signalé par", esc(v(d, "reporter_anonymous", "Anonyme")))}
      </table>
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;">Description</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
        <td style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:16px;font-size:14px;color:#374151;line-height:1.6;">${esc(v(d, "description"))}</td>
      </tr></table>
      ${btn("Traiter ce signalement", v(d, "report_url"), "#D97706")}
    `),
  }),

  // 05 — Alerte Urgence
  alert_broadcast: (d) => ({
    subject: `🚨 ALERTE — ${esc(v(d, "commune_name"))} : ${esc(v(d, "alert_title"))}`,
    from: FROM_ALERT,
    html: layout("#DC2626", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
        <td style="background:#FEF2F2;border-radius:6px;padding:16px;text-align:center;">
          <div style="font-size:48px;">🚨</div>
          <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#DC2626;text-transform:uppercase;letter-spacing:0.1em;">ALERTE OFFICIELLE</p>
        </td></tr></table>
      <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#1F2937;">${esc(v(d, "alert_title"))}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#6B7280;">Type : <strong>${esc(v(d, "alert_type"))}</strong> · ${esc(v(d, "commune_name"))}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
        <td style="background:#FEF2F2;border:2px solid #DC2626;border-radius:6px;padding:20px;font-size:15px;color:#1F2937;line-height:1.7;">${esc(v(d, "alert_message"))}</td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;border-collapse:collapse;">
        ${infoRow("Émise le", esc(v(d, "issued_at")))}
        ${infoRow("Valable jusqu'au", esc(v(d, "valid_until")))}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:#1F2937;border-radius:6px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:16px;font-weight:700;color:#FFFFFF;">📞 Numéro d'urgence : ${esc(v(d, "contact_number"))}</p>
        </td></tr></table>
    `, true),
  }),

  // 06 — Résumé Hebdomadaire
  weekly_digest: (d) => ({
    subject: `📊 Résumé semaine — ${esc(v(d, "commune_name"))} · Semaine du ${esc(v(d, "week_start"))}`,
    html: layout("#1D4ED8", `
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#1F2937;">Résumé de la semaine</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#6B7280;">${esc(v(d, "commune_name"))} · du ${esc(v(d, "week_start"))} au ${esc(v(d, "week_end"))}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;"><tr>
        ${statBox("📋", esc(v(d, "total_reports", "0")), "Signalements", "#1D4ED8")}
        ${statBox("✅", esc(v(d, "resolved_reports", "0")), "Résolus", "#16A34A")}
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
        ${statBox("⏳", esc(v(d, "pending_reports", "0")), "En attente", "#D97706")}
        ${statBox("👥", esc(v(d, "new_registrations", "0")), "Nouveaux citoyens", "#0EA5E9")}
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;"><tr>
        <td style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:14px 16px;">
          <p style="margin:0;font-size:14px;color:#1E40AF;">🏷️ <strong>Catégorie principale :</strong> ${esc(v(d, "top_category", "–"))}</p>
        </td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
        <td style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:14px 16px;">
          <p style="margin:0;font-size:14px;color:#166534;">📅 <strong>${esc(v(d, "events_count", "0"))} événement(s)</strong> à venir cette semaine</p>
        </td></tr></table>
      ${btn("Voir le tableau de bord complet", v(d, "digest_url"))}
    `),
  }),

  // 07 — Rappel Événement
  event_reminder: (d) => ({
    subject: `📅 Rappel : ${esc(v(d, "event_title"))} — demain à ${esc(v(d, "event_time"))}`,
    html: layout("#16A34A", `
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1F2937;">Rappel d'événement</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Bonjour <strong>${esc(v(d, "first_name"))}</strong>, un événement auquel vous vous êtes inscrit(e) a lieu <strong>demain</strong> !</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
        <td style="border-left:4px solid #16A34A;background:#F0FDF4;border-radius:0 6px 6px 0;padding:20px;">
          <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1F2937;">${esc(v(d, "event_title"))}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#374151;">📅 <strong>${esc(v(d, "event_date"))}</strong> à <strong>${esc(v(d, "event_time"))}</strong></p>
          <p style="margin:0 0 12px;font-size:14px;color:#374151;">📍 ${esc(v(d, "event_location"))}</p>
          <p style="margin:0;font-size:14px;color:#4B5563;line-height:1.6;">${esc(v(d, "event_description"))}</p>
        </td></tr></table>
      <p style="margin:0 0 24px;font-size:13px;color:#6B7280;">Organisé par <strong>${esc(v(d, "organizer_name"))}</strong></p>
      ${btn("Voir les détails", v(d, "event_url"), "#16A34A")}
    `),
  }),

  // 08 — Lancement Consultation
  consultation_launch: (d) => ({
    subject: `🗳️ Nouvelle consultation : ${esc(v(d, "consultation_title"))}`,
    html: layout("#7C3AED", `
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1F2937;">Votre avis compte !</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Bonjour <strong>${esc(v(d, "first_name"))}</strong>,<br><br>
      <strong>${esc(v(d, "commune_name"))}</strong> lance une nouvelle consultation citoyenne et souhaite connaître votre opinion.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr>
        <td style="border-left:4px solid #7C3AED;background:#FAF5FF;border-radius:0 6px 6px 0;padding:20px;">
          <p style="margin:0 0 10px;font-size:17px;font-weight:700;color:#1F2937;">${esc(v(d, "consultation_title"))}</p>
          <p style="margin:0 0 14px;font-size:14px;color:#4B5563;line-height:1.6;">${esc(v(d, "consultation_description"))}</p>
          <p style="margin:0;font-size:13px;color:#7C3AED;font-weight:600;">📅 Date limite : ${esc(v(d, "deadline"))}</p>
        </td></tr></table>
      <p style="margin:0 0 8px;font-size:13px;color:#6B7280;">Organisée par <strong>${esc(v(d, "organizer_name"))}</strong></p>
      ${btn("Participer maintenant", v(d, "participation_url"), "#7C3AED")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:#FAF5FF;border:1px solid #DDD6FE;border-radius:6px;padding:12px 16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#7C3AED;">🔒 Votre participation est anonyme et confidentielle.</p>
        </td></tr></table>
    `),
  }),

  // 09 — Confirmation Abonnement
  subscription_confirmation: (d) => ({
    subject: `✅ Abonnement activé — ${esc(v(d, "plan_name"))} · ${esc(v(d, "commune_name"))}`,
    html: layout("#16A34A", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
        <td style="background:#F0FDF4;border-radius:6px;padding:20px;text-align:center;">
          <div style="font-size:48px;">✅</div>
          <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#16A34A;">Abonnement activé !</p>
        </td></tr></table>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Bonjour <strong>${esc(v(d, "admin_name"))}</strong>,<br><br>
      L'abonnement VigieCity de <strong>${esc(v(d, "commune_name"))}</strong> est actif depuis le <strong>${esc(v(d, "start_date"))}</strong>.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;border-collapse:collapse;">
        ${infoRow("Plan", esc(v(d, "plan_name")))}
        ${infoRow("Prix", esc(v(d, "plan_price")))}
        ${infoRow("Facturation", esc(v(d, "billing_period")))}
        ${infoRow("Actif depuis", esc(v(d, "start_date")))}
      </table>
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;">Fonctionnalités incluses</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
        <td style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:16px;font-size:14px;color:#374151;line-height:1.9;">
          ${esc(v(d, "features_list")).split(",").map(f => `✓ ${f.trim()}`).join("<br>")}
        </td></tr></table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;"><tr>
        <td style="padding-right:8px;"><a href="${v(d, "dashboard_url")}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:6px;background:#16A34A;">Accéder au tableau de bord</a></td>
        <td><a href="${v(d, "invoice_url")}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#374151;text-decoration:none;border-radius:6px;background:#F3F4F6;border:1px solid #E5E7EB;">Télécharger la facture</a></td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:12px 16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#1E40AF;">🏛️ Paiement traité via <strong>Chorus Pro</strong>. Pour toute question de facturation, contactez notre équipe.</p>
        </td></tr></table>
    `),
  }),
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-function-secret",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  // Auth guard
  const secret = req.headers.get("x-function-secret");
  if (FUNCTION_SECRET && secret !== FUNCTION_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  let body: { template_id: string; to: string | string[]; data?: Data; reply_to?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { template_id, to, data = {}, reply_to } = body;

  if (!template_id || !to) {
    return new Response(JSON.stringify({ error: "template_id and to are required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const templateFn = TEMPLATES[template_id];
  if (!templateFn) {
    return new Response(
      JSON.stringify({ error: `Unknown template_id: ${template_id}`, available: Object.keys(TEMPLATES) }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let result: TemplateResult;
  try {
    result = templateFn(data);
  } catch (err) {
    return new Response(JSON.stringify({ error: "Template render error", detail: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const resendPayload: Record<string, unknown> = {
    from: result.from ?? FROM_ADMIN,
    to: Array.isArray(to) ? to : [to],
    subject: result.subject,
    html: result.html,
  };
  if (reply_to) resendPayload.reply_to = reply_to;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await res.json();

    if (!res.ok) {
      console.error("[send-email] Resend error:", resendData);
      return new Response(JSON.stringify({ error: "Resend API error", detail: resendData }), {
        status: 502, headers: { "Content-Type": "application/json" },
      });
    }

    const recipients = Array.isArray(to) ? to.join(", ") : to;
    console.log(`[send-email] ✓ ${template_id} → ${recipients} (id: ${resendData.id})`);

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id, template_id, subject: result.subject }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-email] Network error:", err);
    return new Response(JSON.stringify({ error: "Network error", detail: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
