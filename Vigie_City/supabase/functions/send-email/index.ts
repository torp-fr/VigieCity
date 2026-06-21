/**
 * send-email — Edge Function VigieCity
 * Envoie des emails transactionnels via l'API REST Resend.
 * Appelée par le backend (server-side), jamais exposée directement au front.
 *
 * Requiert le secret Supabase : RESEND_API_KEY
 * Configurer via : Supabase Dashboard → Project Settings → Edge Functions → Secrets
 *
 * Usage (depuis une autre Edge Function ou trigger Supabase) :
 *   await supabase.functions.invoke('send-email', {
 *     body: { template: 'welcome', to: 'user@example.com', data: { nom: 'Marie' } }
 *   });
 */

const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const FROM       = "VigieCity <noreply@vigiecity.fr>";

// ── Templates ─────────────────────────────────────────────────────────────────

const SUBJECTS: Record<string, string> = {
  welcome:              "Bienvenue sur VigieCity 🏛️",
  password_reset:       "Réinitialisation de votre mot de passe",
  report_notification:  "Nouveau signalement dans votre commune",
  alert_broadcast:      "⚠️ Alerte de sécurité — VigieCity",
  weekly_digest:        "Résumé de la semaine — VigieCity",
  invite_admin:         "🏛️ Invitation à administrer votre commune sur VigieCity",
};

function renderTemplate(template: string, data: Record<string, string> = {}): string {
  const base = (content: string) => `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card  { background: white; border-radius: 16px; padding: 32px;
                 max-width: 520px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        .logo  { font-size: 20px; font-weight: 800; color: #1e3a8a; margin-bottom: 24px; }
        .badge { display: inline-block; background: #dbeafe; color: #1e40af;
                 border-radius: 9999px; padding: 4px 12px; font-size: 12px;
                 font-weight: 600; margin-bottom: 16px; }
        h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; }
        p  { line-height: 1.6; color: #475569; margin: 0 0 16px; font-size: 14px; }
        .btn { display: inline-block; background: #1e3a8a; color: white !important;
               padding: 12px 24px; border-radius: 12px; text-decoration: none;
               font-weight: 600; font-size: 14px; margin: 8px 0 16px; }
        .footer { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 24px; }
        .sep { border: none; border-top: 1px solid #f1f5f9; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🏛️ VigieCity</div>
        ${content}
        <hr class="sep">
        <p class="footer">
          VigieCity — Sécurité de proximité pour les communes françaises<br>
          Vous recevez cet email car vous êtes inscrit sur vigiecity.fr
        </p>
      </div>
    </body>
    </html>
  `;

  switch (template) {
    case "welcome":
      return base(`
        <span class="badge">Bienvenue ✅</span>
        <h1>Bonjour ${data.prenom ?? ""}${data.nom ? " " + data.nom : ""} !</h1>
        <p>Votre compte VigieCity pour la commune de <strong>${data.commune ?? "votre commune"}</strong> est maintenant actif.</p>
        <p>Vous pouvez dès maintenant signaler des incidents, consulter les actualités de votre commune, et accéder aux numéros d'urgence.</p>
        <a href="https://vigiecity.fr" class="btn">Accéder à l'application →</a>
        <p>En cas de problème, contactez votre mairie ou notre support.</p>
      `);

    case "password_reset":
      return base(`
        <span class="badge">Sécurité</span>
        <h1>Réinitialisation du mot de passe</h1>
        <p>Vous avez demandé à réinitialiser votre mot de passe VigieCity. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :</p>
        <a href="${data.reset_url ?? "#"}" class="btn">Réinitialiser mon mot de passe →</a>
        <p>Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas fait cette demande, ignorez cet email — votre mot de passe reste inchangé.</p>
      `);

    case "report_notification":
      return base(`
        <span class="badge">Nouveau signalement</span>
        <h1>Un signalement vient d'être créé</h1>
        <p>Un citoyen a signalé un incident dans votre commune :</p>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;">
          <strong>${data.titre ?? "Sans titre"}</strong><br>
          <span style="color:#64748b;font-size:13px;">${data.description ?? ""}</span><br>
          <span style="color:#94a3b8;font-size:12px;">📍 ${data.adresse ?? "Adresse non renseignée"}</span>
        </div>
        <a href="https://vigiecity.fr/admin/signalements" class="btn">Voir dans l'interface →</a>
      `);

    case "alert_broadcast":
      return base(`
        <span class="badge" style="background:#fee2e2;color:#dc2626;">⚠️ Alerte</span>
        <h1>${data.titre ?? "Alerte de sécurité"}</h1>
        <p>${data.message ?? ""}</p>
        ${data.contact ? `<p>Contact : <strong>${data.contact}</strong></p>` : ""}
        <a href="https://vigiecity.fr" class="btn">Ouvrir VigieCity →</a>
      `);

    case "weekly_digest":
      return base(`
        <span class="badge">Résumé hebdo 📊</span>
        <h1>Cette semaine sur VigieCity</h1>
        <p>Voici un résumé de l'activité de votre commune :</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">
          <div style="background:#f8fafc;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#1e3a8a;">${data.signalements ?? "0"}</div>
            <div style="font-size:12px;color:#64748b;">Signalements</div>
          </div>
          <div style="background:#f8fafc;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#059669;">${data.utilisateurs ?? "0"}</div>
            <div style="font-size:12px;color:#64748b;">Utilisateurs actifs</div>
          </div>
        </div>
        <a href="https://vigiecity.fr/platform" class="btn">Voir le tableau de bord →</a>
      `);

    case "invite_admin":
      return base(`
        <span class="badge" style="background:#dbeafe;color:#1e40af;">🏛️ Invitation</span>
        <h1>Vous êtes invité à administrer ${data.commune ?? "votre commune"}</h1>
        <p>La plateforme VigieCity vous invite à créer votre espace administrateur pour la commune de <strong>${data.commune ?? ""}${data.department ? " (dépt. " + data.department + ")" : ""}</strong>.</p>
        <p>VigieCity permet à votre commune de :</p>
        <ul style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 16px;">
          <li>Recevoir et traiter les signalements de vos citoyens</li>
          <li>Publier des actualités, alertes et événements</li>
          <li>Mettre à disposition une application mobile aux habitants</li>
        </ul>
        <a href="${data.invite_url ?? "#"}" class="btn">Créer mon compte administrateur →</a>
        <p style="color:#94a3b8;font-size:12px;">Ce lien est valable jusqu'au <strong>${data.expires ?? "48 heures"}</strong>. Après expiration, contactez votre référent VigieCity pour obtenir un nouveau lien.</p>
      `);

    default:
      return base(`<h1>Message VigieCity</h1><p>${data.message ?? ""}</p>`);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_KEY) {
      throw new Error("RESEND_API_KEY not configured — add it in Supabase Edge Function Secrets");
    }

    const { template, to, data = {} } = await req.json() as {
      template: string;
      to:       string | string[];
      data?:    Record<string, string>;
    };

    if (!template || !to) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: template, to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subject = SUBJECTS[template] ?? "Message VigieCity";
    const html    = renderTemplate(template, data);

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

    console.log(`✅ Email sent [${template}] → ${to} | id: ${result.id}`);

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
