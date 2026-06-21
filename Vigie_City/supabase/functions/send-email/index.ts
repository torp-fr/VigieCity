/**
 * send-email — Edge Function VigieCity v2
 * Emails transactionnels via Resend, white-label par commune.
 *
 * Requiert : RESEND_API_KEY (Supabase Edge Function Secrets)
 *
 * Body JSON :
 *   {
 *     template:      string,            // voir TEMPLATES ci-dessous
 *     to:            string | string[], // destinataire(s)
 *     data?:         Record<string, string>, // variables du template
 *       logo_url?:       string,   // URL logo commune (optionnel)
 *       primary_color?:  string,   // ex. "#1e3a8a" (optionnel, défaut bleu VigieCity)
 *       commune?:        string,   // nom de la commune
 *       prenom?:         string,
 *       nom?:            string,
 *       ...template-specific vars
 *   }
 *
 * Templates disponibles :
 *   welcome | password_reset | report_created | report_updated |
 *   alert | invite_admin | newsletter_weekly | event_reminder | invite_citizen
 *   (anciens alias: report_notification, alert_broadcast, weekly_digest)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "noreply@vigiecity.fr";
const FROM       = `VigieCity <${FROM_EMAIL}>`;
const APP_URL    = "https://vigiecity.fr";

// ── Sujets ────────────────────────────────────────────────────────────────────

const SUBJECTS: Record<string, string> = {
  welcome:           "Bienvenue sur VigieCity 🏛️",
  password_reset:    "Réinitialisation de votre mot de passe",
  report_created:    "Nouveau signalement dans votre commune",
  report_notification: "Nouveau signalement dans votre commune", // alias
  report_updated:    "Mise à jour de votre signalement",
  alert:             "⚠️ Alerte — VigieCity",
  alert_broadcast:   "⚠️ Alerte — VigieCity", // alias
  invite_admin:      "Invitation à administrer votre commune sur VigieCity",
  newsletter_weekly: "Résumé de la semaine — VigieCity",
  weekly_digest:     "Résumé de la semaine — VigieCity", // alias
  event_reminder:    "Rappel événement demain — VigieCity",
  invite_citizen:    "Votre commune vous invite sur VigieCity",
};

// ── Base layout ───────────────────────────────────────────────────────────────

function base(content: string, d: Record<string, string>): string {
  const color   = d.primary_color ?? "#1e3a8a";
  const commune = d.commune ?? "VigieCity";

  // Logo block: image si logo_url fourni, sinon texte
  const logoBlock = d.logo_url
    ? `<img src="${d.logo_url}" alt="${commune}" style="height:36px;width:auto;object-fit:contain;margin-bottom:20px;display:block;">`
    : `<div style="font-size:20px;font-weight:800;color:${color};margin-bottom:20px;letter-spacing:-0.5px;">🏛️ ${commune}</div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VigieCity</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;">
  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <!-- Card -->
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <!-- Header band -->
        <tr>
          <td style="background:${color};padding:20px 32px;">
            ${d.logo_url
              ? `<img src="${d.logo_url}" alt="${commune}" style="height:32px;width:auto;object-fit:contain;display:block;filter:brightness(0) invert(1);">`
              : `<span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">🏛️ ${commune}</span>`
            }
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #f1f5f9;">
              <tr>
                <td style="padding-top:20px;text-align:center;font-size:11px;color:#94a3b8;line-height:1.6;">
                  VigieCity — Application citoyenne pour les communes françaises<br>
                  <a href="${APP_URL}/confidentialite" style="color:#94a3b8;">Confidentialité</a> &middot;
                  <a href="${APP_URL}/cgu" style="color:#94a3b8;">CGU</a> &middot;
                  <a href="mailto:contact@vigiecity.fr" style="color:#94a3b8;">Contact</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!-- Powered by -->
      <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px;">
        Propulsé par <a href="${APP_URL}" style="color:#94a3b8;text-decoration:none;">vigiecity.fr</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function btn(label: string, url: string, color: string): string {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#ffffff !important;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin:20px 0 8px;letter-spacing:0.1px;">${label} →</a>`;
}

function badge(text: string, bg: string, fg: string): string {
  return `<span style="display:inline-block;background:${bg};color:${fg};border-radius:9999px;padding:4px 14px;font-size:12px;font-weight:700;margin-bottom:16px;">${text}</span>`;
}

function h1(text: string): string {
  return `<h1 style="font-size:22px;font-weight:800;margin:0 0 12px;color:#0f172a;line-height:1.3;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 14px;">${text}</p>`;
}

function infoBox(content: string): string {
  return `<div style="background:#f8fafc;border-radius:12px;border-left:4px solid #e2e8f0;padding:16px 18px;margin:16px 0;">${content}</div>`;
}

function statusPill(status: string): string {
  const map: Record<string, [string, string]> = {
    pending:     ["#fef9c3", "#854d0e"],
    in_progress: ["#dbeafe", "#1e40af"],
    resolved:    ["#dcfce7", "#15803d"],
    rejected:    ["#fee2e2", "#b91c1c"],
  };
  const [bg, fg] = map[status] ?? ["#f1f5f9", "#64748b"];
  const labels: Record<string, string> = {
    pending:     "En attente",
    in_progress: "En cours de traitement",
    resolved:    "Résolu ✓",
    rejected:    "Non retenu",
  };
  return `<span style="background:${bg};color:${fg};padding:3px 12px;border-radius:9999px;font-size:12px;font-weight:700;">${labels[status] ?? status}</span>`;
}

// ── Templates ─────────────────────────────────────────────────────────────────

function renderTemplate(template: string, d: Record<string, string>): string {
  const color   = d.primary_color ?? "#1e3a8a";
  const commune = d.commune ?? "votre commune";

  // Normalize aliases
  const tpl = {
    report_notification: "report_created",
    alert_broadcast:     "alert",
    weekly_digest:       "newsletter_weekly",
  }[template] ?? template;

  let content = "";

  switch (tpl) {
    // ── 1. Bienvenue citoyen ───────────────────────────────────────────────
    case "welcome":
      content = `
        ${badge("Bienvenue ✅", "#dcfce7", "#15803d")}
        ${h1(`Bonjour ${d.prenom ?? ""}${d.nom ? " " + d.nom : ""} !`)}
        ${p(`Votre compte VigieCity pour la commune de <strong>${commune}</strong> est maintenant actif.`)}
        ${p("Vous pouvez dès maintenant :")}
        <ul style="font-size:14px;color:#475569;line-height:1.9;padding-left:20px;margin:0 0 16px;">
          <li>Signaler des incidents à votre mairie</li>
          <li>Consulter les actualités et alertes locales</li>
          <li>Accéder aux numéros d'urgence</li>
          <li>Échanger avec les services municipaux</li>
        </ul>
        ${btn("Accéder à l'application", APP_URL + "/accueil", color)}
        ${p(`<span style="font-size:12px;color:#94a3b8;">Des questions ? Contactez votre mairie ou notre support à <a href="mailto:contact@vigiecity.fr" style="color:${color};">contact@vigiecity.fr</a></span>`)}
      `;
      break;

    // ── 2. Réinitialisation mot de passe ───────────────────────────────────
    case "password_reset":
      content = `
        ${badge("Sécurité 🔒", "#fef3c7", "#92400e")}
        ${h1("Réinitialisation du mot de passe")}
        ${p("Vous avez demandé à réinitialiser votre mot de passe VigieCity. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :")}
        ${btn("Réinitialiser mon mot de passe", d.reset_url ?? "#", color)}
        ${infoBox(`<p style="margin:0;font-size:13px;color:#64748b;">⏱️ Ce lien est valable <strong>24 heures</strong>. Après expiration, vous pouvez en demander un nouveau sur la page de connexion.</p>`)}
        ${p(`<span style="font-size:12px;color:#94a3b8;">Si vous n'avez pas fait cette demande, ignorez cet email — votre mot de passe reste inchangé.</span>`)}
      `;
      break;

    // ── 3. Nouveau signalement (admin commune) ─────────────────────────────
    case "report_created":
      content = `
        ${badge("Nouveau signalement 📍", "#dbeafe", "#1e40af")}
        ${h1("Un signalement vient d'être créé")}
        ${p(`Un citoyen a soumis un signalement dans votre commune :`)}
        ${infoBox(`
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0f172a;">${d.titre ?? "Sans titre"}</p>
          ${d.categorie ? `<p style="margin:0 0 6px;font-size:12px;color:#64748b;">Catégorie : ${d.categorie}</p>` : ""}
          ${d.description ? `<p style="margin:0 0 6px;font-size:13px;color:#475569;">${d.description}</p>` : ""}
          ${d.adresse ? `<p style="margin:0;font-size:12px;color:#94a3b8;">📍 ${d.adresse}</p>` : ""}
        `)}
        ${btn("Traiter le signalement", APP_URL + "/admin/signalements", color)}
        ${p(`<span style="font-size:12px;color:#94a3b8;">Signalement soumis le ${d.date ?? new Date().toLocaleDateString("fr-FR")} via l'application VigieCity.</span>`)}
      `;
      break;

    // ── 4. Mise à jour signalement (citoyen) ───────────────────────────────
    case "report_updated":
      content = `
        ${badge("Mise à jour signalement", "#e0e7ff", "#3730a3")}
        ${h1("Votre signalement a été mis à jour")}
        ${p(`La commune de <strong>${commune}</strong> a traité votre signalement.`)}
        ${infoBox(`
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">${d.titre ?? "Votre signalement"}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#475569;">Nouveau statut : ${statusPill(d.statut ?? "in_progress")}</p>
          ${d.commentaire ? `<p style="margin:0;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;margin-top:10px;">💬 Message de la mairie : <em>${d.commentaire}</em></p>` : ""}
        `)}
        ${btn("Voir mon signalement", APP_URL + "/mes-signalements", color)}
        ${p(`<span style="font-size:12px;color:#94a3b8;">Vous pouvez suivre l'état de vos signalements dans l'application VigieCity.</span>`)}
      `;
      break;

    // ── 5. Alerte commune ──────────────────────────────────────────────────
    case "alert":
      content = `
        ${badge("⚠️ Alerte officielle", "#fee2e2", "#dc2626")}
        ${h1(d.titre ?? "Alerte de votre commune")}
        ${p(d.message ?? "")}
        ${d.contact ? infoBox(`<p style="margin:0;font-size:13px;color:#64748b;">📞 Contact d'urgence : <strong>${d.contact}</strong></p>`) : ""}
        ${d.url ? btn("Plus d'informations", d.url, "#dc2626") : btn("Ouvrir VigieCity", APP_URL, "#dc2626")}
        ${p(`<span style="font-size:12px;color:#94a3b8;">Cette alerte a été émise par les services de la commune de ${commune}. En cas d'urgence réelle, appelez le 15, 17, 18 ou 112.</span>`)}
      `;
      break;

    // ── 6. Invitation admin commune ────────────────────────────────────────
    case "invite_admin":
      content = `
        ${badge("🏛️ Invitation administrateur", "#dbeafe", "#1e40af")}
        ${h1(`Administrez ${commune} sur VigieCity`)}
        ${p(`La plateforme VigieCity vous invite à créer votre espace administrateur pour la commune de <strong>${commune}${d.department ? " (dépt. " + d.department + ")" : ""}</strong>.`)}
        ${p("VigieCity vous permettra de :")}
        <ul style="font-size:14px;color:#475569;line-height:1.9;padding-left:20px;margin:0 0 16px;">
          <li>Recevoir et traiter les signalements de vos citoyens</li>
          <li>Publier des actualités, alertes et événements</li>
          <li>Échanger directement avec les habitants</li>
          <li>Accéder aux statistiques d'usage de votre commune</li>
        </ul>
        ${btn("Créer mon compte administrateur", d.invite_url ?? "#", color)}
        ${infoBox(`<p style="margin:0;font-size:13px;color:#64748b;">⏱️ Ce lien est valable jusqu'au <strong>${d.expires ?? "48 heures après réception"}</strong>. Après expiration, contactez votre référent VigieCity.</p>`)}
      `;
      break;

    // ── 7. Newsletter hebdomadaire (admin) ─────────────────────────────────
    case "newsletter_weekly":
      content = `
        ${badge("Résumé hebdo 📊", "#f0fdf4", "#15803d")}
        ${h1(`Cette semaine sur VigieCity — ${commune}`)}
        ${p("Voici un résumé de l'activité de votre commune cette semaine :")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
          <tr>
            ${[
              [d.signalements ?? "0", "Signalements", color],
              [d.messages ?? "0", "Messages", "#0891b2"],
              [d.utilisateurs ?? "0", "Utilisateurs actifs", "#059669"],
            ].map(([val, label, c]) => `
              <td align="center" style="padding:0 6px;">
                <div style="background:#f8fafc;border-radius:12px;padding:16px 12px;text-align:center;">
                  <div style="font-size:30px;font-weight:800;color:${c};margin-bottom:4px;">${val}</div>
                  <div style="font-size:11px;color:#64748b;">${label}</div>
                </div>
              </td>
            `).join("")}
          </tr>
        </table>
        ${d.top_categorie ? p(`🏆 Catégorie la plus signalée : <strong>${d.top_categorie}</strong>`) : ""}
        ${btn("Voir le tableau de bord", APP_URL + "/admin/dashboard", color)}
        ${p(`<span style="font-size:12px;color:#94a3b8;">Vous recevez ce résumé car vous administrez ${commune} sur VigieCity. Vous pouvez vous désinscrire dans vos paramètres.</span>`)}
      `;
      break;

    // ── 8. Rappel événement (citoyen J-1) ─────────────────────────────────
    case "event_reminder":
      content = `
        ${badge("Rappel événement 📅", "#fdf4ff", "#7e22ce")}
        ${h1(d.titre ?? "Un événement vous attend demain")}
        ${p(`La commune de <strong>${commune}</strong> vous rappelle qu'un événement auquel vous êtes inscrit a lieu <strong>demain</strong>.`)}
        ${infoBox(`
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0f172a;">${d.titre ?? ""}</p>
          ${d.date ? `<p style="margin:0 0 4px;font-size:13px;color:#475569;">📅 ${d.date}</p>` : ""}
          ${d.heure ? `<p style="margin:0 0 4px;font-size:13px;color:#475569;">🕐 ${d.heure}</p>` : ""}
          ${d.lieu ? `<p style="margin:0;font-size:13px;color:#475569;">📍 ${d.lieu}</p>` : ""}
          ${d.description ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:8px;">${d.description}</p>` : ""}
        `)}
        ${btn("Voir les détails", APP_URL + "/accueil", color)}
        ${p(`<span style="font-size:12px;color:#94a3b8;">Vous avez reçu ce rappel car vous êtes inscrit à cet événement. Pour vous désinscrire, rendez-vous dans l'application.</span>`)}
      `;
      break;

    // ── 9. Invitation citoyen ──────────────────────────────────────────────
    case "invite_citizen":
      content = `
        ${badge("Invitation 🎉", "#ecfdf5", "#059669")}
        ${h1(`${commune} vous invite sur VigieCity`)}
        ${p(`Votre commune de <strong>${commune}</strong> vient de rejoindre VigieCity, l'application citoyenne qui connecte les habitants et les services municipaux.`)}
        ${p("Avec VigieCity, vous pouvez :")}
        <ul style="font-size:14px;color:#475569;line-height:1.9;padding-left:20px;margin:0 0 16px;">
          <li>Signaler des incidents (voirie, éclairage, propreté…)</li>
          <li>Recevoir les alertes officielles de votre mairie</li>
          <li>Consulter les actualités et événements locaux</li>
          <li>Accéder aux numéros d'urgence</li>
          <li>Contacter directement les services municipaux</li>
        </ul>
        ${d.invite_url
          ? btn("Créer mon compte gratuit", d.invite_url, color)
          : btn("Télécharger l'application", APP_URL, color)
        }
        ${p(`<span style="font-size:12px;color:#94a3b8;">Vous recevez cet email car votre commune de ${commune} utilise VigieCity. Votre inscription est gratuite et sans engagement.</span>`)}
      `;
      break;

    default:
      content = `
        ${h1("Message VigieCity")}
        ${p(d.message ?? "Vous avez reçu un message de VigieCity.")}
        ${btn("Ouvrir VigieCity", APP_URL, color)}
      `;
  }

  return base(content, d);
}

// ── CORS ──────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_KEY) {
      throw new Error("RESEND_API_KEY not configured — add it in Supabase Edge Function Secrets");
    }

    const { template, to: rawTo, user_id, data = {} } = await req.json() as {
      template:  string;
      to?:       string | string[];
      user_id?:  string;   // Alternative à `to` : l'EF résout l'email depuis auth.users
      data?:     Record<string, string>;
    };

    // ── Résoudre email + infos collectivité via service role si besoin ──────────
    let to = rawTo;
    let enrichedData: Record<string, string> = { ...data };

    const needsAdmin = (!to && user_id) || !!data.collectivity_id;
    if (needsAdmin) {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY);

      // Résoudre `to` depuis user_id si nécessaire
      if (!to && user_id) {
        const { data: { user }, error } = await sb.auth.admin.getUserById(user_id);
        if (error || !user?.email) {
          console.warn(`send-email: user ${user_id} introuvable ou sans email — skip`);
          return new Response(
            JSON.stringify({ ok: true, skipped: true, reason: "user_not_found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        to = user.email;
      }

      // Enrichir avec infos collectivité si collectivity_id fourni
      if (data.collectivity_id) {
        const { data: coll } = await sb
          .from("collectivities")
          .select("name, logo_url, primary_color")
          .eq("id", data.collectivity_id)
          .single();
        if (coll) {
          enrichedData = {
            commune:       coll.name ?? data.commune ?? "VigieCity",
            logo_url:      coll.logo_url ?? "",
            primary_color: coll.primary_color ?? "#1e3a8a",
            ...data,  // les valeurs explicitement passées prennent priorité
          };
        }
      }
    }

    if (!template || !to) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: template + (to or user_id)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subject = SUBJECTS[template] ?? "Message VigieCity";
    const html    = renderTemplate(template, enrichedData);

    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    FROM,
        to:      Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(`Resend error ${res.status}: ${JSON.stringify(result)}`);
    }

    console.log(`✅ Email sent [${template}] → ${JSON.stringify(to)} | id: ${result.id}`);

    return new Response(
      JSON.stringify({ ok: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("send-email error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
