# Prompt Claude Design — 9 Templates Email HTML VigieCity
> À coller tel quel dans Claude Design (claude.ai → nouveau projet → "Design")
> Resend-compatible · Table-based · Inline CSS · Mobile-first

---

## PROMPT À COLLER

---

Tu es un expert en design d'emails transactionnels HTML. Tu vas créer **9 templates email HTML** pour **VigieCity**, une plateforme SaaS française de démocratie locale et de services citoyens pour les communes françaises.

Ces templates doivent être :
- ✅ **Resend-compatible** (API REST Resend, pas d'envoi SMTP)
- ✅ **Table-based** (pas de Flexbox ni Grid — compatibilité Outlook 2016+)
- ✅ **Inline CSS uniquement** (sauf les media queries dans `<style>`)
- ✅ **Max-width 600px** (centrés sur fond gris clair)
- ✅ **Mobile-first** (une colonne sur mobile, lecture verticale)
- ✅ **Accessibles** (alt text sur images, contraste WCAG AA)
- ✅ **Français** (tout le contenu en français, tutoiement pour les citoyens, vouvoiement pour les maires/admins)

---

## SYSTÈME DE DESIGN VIGIECITY

### Couleurs

```
Principal     #1D4ED8   — Bleu VigieCity (civic blue)
Principal foncé #1E3A8A — Bleu nuit (hover, CTA background)
Secondaire    #0EA5E9   — Bleu ciel (accents, liens)
Succès        #16A34A   — Vert (confirmations, badges OK)
Alerte        #DC2626   — Rouge (urgences, alertes SOS)
Avertissement #D97706   — Orange (vigilances météo, rappels)
Neutre foncé  #1F2937   — Texte principal
Neutre moyen  #6B7280   — Texte secondaire, labels
Neutre clair  #F3F4F6   — Background emails
Blanc         #FFFFFF   — Fond cartes, contenu
Bordure       #E5E7EB   — Séparateurs
```

### Typographie

```
Famille     : -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
Titre H1    : 28px / bold / #1F2937
Titre H2    : 22px / semibold / #1F2937
Corps       : 16px / normal / #374151 / line-height 1.6
Petit texte : 13px / #6B7280
Lien        : #1D4ED8 / underline
```

### Logo VigieCity (à utiliser dans le header)

```
Utilise du texte stylisé comme logo :
  [🏛️ VigieCity]
  Police : bold 22px, couleur #1D4ED8
  Sous-texte : "La commune connectée" en 12px #6B7280
```
*(Dans un vrai déploiement, le logo serait : `<img src="https://app.vigiecity.fr/logo-email.png" width="150" alt="VigieCity" />` — laisse un commentaire HTML pour indiquer où placer l'image)*

### Structure email standard

```
[Fond gris F3F4F6 — 100% largeur]
  [Wrapper centré — max 600px]
    [Header blanc — logo + couleur bande]
    [Corps blanc — contenu principal]
    [Footer gris — liens légaux + désabo]
  [/Wrapper]
[/Fond]
```

---

## COMPOSANTS RÉUTILISABLES

Intègre ces composants dans chaque template :

### Header
- Bande de couleur en haut (8px, couleur selon template)
- Logo centré ou à gauche
- Optionnel : badge de type d'email (ex: "Nouvelle alerte", "Résumé hebdo")

### Bouton CTA principal
```html
<!-- CTA principal -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding: 24px 0;">
      <a href="{{url}}" style="
        display: inline-block;
        background-color: #1D4ED8;
        color: #ffffff;
        font-size: 16px;
        font-weight: 600;
        text-decoration: none;
        padding: 14px 32px;
        border-radius: 8px;
        letter-spacing: 0.025em;
      ">{{texte_bouton}}</a>
    </td>
  </tr>
</table>
```

### Carte info (gris clair)
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6; border-radius:8px;">
  <tr>
    <td style="padding: 16px 20px;">
      <p style="margin:0; font-size:14px; color:#374151;">{{contenu}}</p>
    </td>
  </tr>
</table>
```

### Badge statut
```html
<span style="
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  background-color: {{bg}};
  color: {{fg}};
">{{label}}</span>
```

### Divider
```html
<table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
  <tr><td style="border-top: 1px solid #E5E7EB;"></td></tr>
</table>
```

### Footer standard
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB; border-top: 1px solid #E5E7EB;">
  <tr>
    <td style="padding: 24px 32px; text-align: center;">
      <p style="margin:0 0 8px 0; font-size:13px; color:#9CA3AF;">
        VigieCity · La commune connectée
      </p>
      <p style="margin:0 0 8px 0; font-size:12px; color:#9CA3AF;">
        Vous recevez cet email car vous êtes inscrit(e) sur VigieCity.<br>
        <a href="{{unsubscribe_url}}" style="color:#6B7280;">Se désinscrire</a>
        &nbsp;·&nbsp;
        <a href="https://vigiecity.fr/confidentialite" style="color:#6B7280;">Politique de confidentialité</a>
        &nbsp;·&nbsp;
        <a href="https://vigiecity.fr" style="color:#6B7280;">vigiecity.fr</a>
      </p>
      <p style="margin:0; font-size:11px; color:#D1D5DB;">
        © 2026 VigieCity SAS · 1 rue de la République · 75001 Paris
      </p>
    </td>
  </tr>
</table>
```

---

## LES 9 TEMPLATES À CRÉER

Crée chaque template comme un fichier HTML autonome et complet, prêt à être injecté dans Resend.

Utilise des variables mustache `{{variable}}` pour les données dynamiques.

---

### TEMPLATE 1 : `welcome_commune.html`

**Usage :** Envoyé à l'administrateur d'une commune qui vient de s'inscrire sur VigieCity.
**Destinataire :** Maire ou DSI de la mairie
**Ton :** Professionnel, chaleureux, vouvoiement

**Bande couleur header :** #1D4ED8 (bleu VigieCity)
**Sujet :** 🏛️ Bienvenue sur VigieCity — {{commune_name}} est maintenant connectée

**Contenu :**
- Titre : "Bienvenue sur VigieCity, {{admin_name}} !"
- Sous-titre : "{{commune_name}} rejoint le réseau des communes connectées"
- Corps : 2-3 phrases de bienvenue expliquant que la commune est maintenant active sur la plateforme
- Section "Vos prochaines étapes" (3 étapes numérotées avec icônes texte) :
  1. 📱 Invitez vos citoyens à télécharger l'application
  2. 📢 Publiez votre première actualité
  3. 🗺️ Configurez la carte des services locaux
- CTA principal : "Accéder à mon tableau de bord" → `{{dashboard_url}}`
- Carte grise avec les infos de la commune :
  - Commune : {{commune_name}}
  - Code INSEE : {{commune_insee}}
  - Abonnement : {{plan_name}}
  - Date d'activation : {{activation_date}}
- Section "Besoin d'aide ?" avec lien vers la documentation et email support

**Variables :** `{{admin_name}}`, `{{commune_name}}`, `{{commune_insee}}`, `{{plan_name}}`, `{{activation_date}}`, `{{dashboard_url}}`

---

### TEMPLATE 2 : `welcome_citizen.html`

**Usage :** Envoyé à un citoyen qui crée un compte sur l'app VigieCity.
**Destinataire :** Citoyen
**Ton :** Sympathique, moderne, tutoiement

**Bande couleur header :** #0EA5E9 (bleu ciel)
**Sujet :** 👋 Bienvenue sur VigieCity, {{first_name}} !

**Contenu :**
- Titre : "Tu fais maintenant partie de {{commune_name}} !"
- Corps : 2 phrases expliquant ce que VigieCity permet (signaler, s'informer, participer)
- Section "Ce que tu peux faire" avec 4 blocs en grille 2×2 (utiliser des tables) :
  - 📢 Signalements — Signalez les problèmes de votre quartier
  - 📰 Actualités — Restez informé(e) des nouvelles locales
  - 📅 Événements — Ne ratez plus aucun événement
  - 🗳️ Consultations — Donnez votre avis sur les projets locaux
- CTA principal : "Découvrir l'application" → `{{app_url}}`
- Note en bas : "Ton compte est lié à la commune de {{commune_name}}. Si ce n'est pas ta commune, contacte le support."
- Petit lien "Vérifier mon adresse email" si vérification nécessaire

**Variables :** `{{first_name}}`, `{{commune_name}}`, `{{app_url}}`, `{{verify_email_url}}`

---

### TEMPLATE 3 : `password_reset.html`

**Usage :** Réinitialisation de mot de passe (override du template Supabase Auth natif).
**Destinataire :** Citoyen ou administrateur
**Ton :** Neutre, sécuritaire, clair

**Bande couleur header :** #6B7280 (gris — neutralité sécurité)
**Sujet :** 🔐 Réinitialisation de votre mot de passe VigieCity

**Contenu :**
- Titre : "Réinitialisation de mot de passe"
- Corps : "Vous avez demandé à réinitialiser votre mot de passe pour le compte associé à {{email}}."
- Mention de sécurité : "Ce lien expire dans **1 heure**."
- CTA principal : "Créer un nouveau mot de passe" → `{{reset_url}}`
- Carte de sécurité (fond orange clair `#FEF3C7`, bordure `#D97706`) :
  - ⚠️ "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe ne sera pas modifié."
- Texte alternatif : "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :"
  - `{{reset_url}}` (texte brut, pas un lien)
- Footer sécurité : "Pour votre sécurité, VigieCity ne vous demandera jamais votre mot de passe par email."

**Variables :** `{{email}}`, `{{reset_url}}`

---

### TEMPLATE 4 : `report_notification.html`

**Usage :** Envoyé à l'administrateur de la mairie quand un nouveau signalement est soumis.
**Destinataire :** Administrateur / agent municipal
**Ton :** Professionnel, informatif, vouvoiement

**Bande couleur header :** #D97706 (orange — attention)
**Sujet :** 📋 Nouveau signalement — {{report_category}} · {{commune_name}}

**Contenu :**
- Badge de catégorie en couleur selon `{{report_category}}` (voirie, éclairage, propreté, sécurité, autre)
- Badge de sévérité : 🟢 Faible / 🟡 Modéré / 🔴 Urgent (selon `{{severity}}`)
- Titre : "Nouveau signalement reçu"
- Sous-titre : "Soumis le {{submitted_at}} par un citoyen de {{commune_name}}"
- Carte détail signalement (fond blanc, bordure gauche 4px selon couleur sévérité) :
  - **Titre :** {{report_title}}
  - **Description :** {{report_description}} (max ~200 chars puis "...")
  - **Lieu :** {{report_location}} *(si disponible)*
  - **Catégorie :** {{report_category}}
- Si image disponible : bloc "Photo jointe" avec `<img src="{{report_image_url}}" width="560" style="border-radius:8px;" />`
- CTA principal : "Consulter et traiter ce signalement" → `{{report_admin_url}}`
- Section stats en 3 colonnes (tables) :
  - Signalements en attente : {{pending_count}}
  - Traités ce mois : {{resolved_this_month}}
  - Taux de résolution : {{resolution_rate}}%

**Variables :** `{{report_title}}`, `{{report_description}}`, `{{report_category}}`, `{{severity}}`, `{{report_location}}`, `{{report_image_url}}`, `{{report_admin_url}}`, `{{submitted_at}}`, `{{commune_name}}`, `{{pending_count}}`, `{{resolved_this_month}}`, `{{resolution_rate}}`

---

### TEMPLATE 5 : `alert_broadcast.html`

**Usage :** Alerte urgence envoyée à TOUS les citoyens d'une commune (SOS, incident grave, météo rouge).
**Destinataire :** Citoyens
**Ton :** Urgent, direct, tutoiement

**Design spécial :** Ce template est ROUGE et dramatique — bande épaisse rouge en haut (20px), fond de header rouge `#DC2626`.

**Bande couleur header :** #DC2626 (rouge urgence)
**Logo sur fond rouge :** Logo VigieCity en blanc
**Sujet :** 🚨 ALERTE — {{commune_name}} : {{alert_title}}

**Contenu :**
- Header rouge avec logo blanc + texte "ALERTE OFFICIELLE" en majuscules
- Titre blanc dans le header : "{{alert_title}}"
- Sous-titre blanc : "{{commune_name}} · Publié le {{published_at}}"
- Corps blanc :
  - Badge rouge : "ALERTE EN COURS"
  - Contenu de l'alerte : {{alert_content}} (peut être long — respecte les sauts de ligne)
  - Si `{{alert_level}}` = 'rouge' : encadré avec fond rouge très clair `#FEF2F2` + bordure rouge
  - Si `{{alert_level}}` = 'orange' : fond orange clair + bordure orange
- Section "Consignes à suivre" (si `{{instructions}}` est défini) :
  - Fond rouge très clair, liste des consignes avec ✅ ou ⚠️
- Numéros d'urgence nationaux (toujours présents dans ce template) :
  - 🚔 Police / Gendarmerie : 17
  - 🚑 SAMU : 15  
  - 🚒 Pompiers : 18
  - 📞 Urgence universelle : 112
- CTA : "Voir l'alerte complète" → `{{alert_url}}`
- Footer rouge clair : "Cette alerte a été émise par les autorités de {{commune_name}}. Restez informé(e) en temps réel sur l'application VigieCity."

**Variables :** `{{alert_title}}`, `{{alert_content}}`, `{{alert_level}}`, `{{instructions}}`, `{{commune_name}}`, `{{published_at}}`, `{{alert_url}}`

---

### TEMPLATE 6 : `weekly_digest.html`

**Usage :** Résumé hebdomadaire envoyé chaque lundi aux administrateurs de mairie.
**Destinataire :** Maire / administrateur municipal
**Ton :** Professionnel, synthétique, vouvoiement

**Bande couleur header :** #1D4ED8 (bleu VigieCity)
**Sujet :** 📊 Résumé de la semaine — {{commune_name}} · Semaine du {{week_start}}

**Contenu :**
- Titre : "Votre résumé de la semaine"
- Sous-titre : "Semaine du {{week_start}} au {{week_end}} · {{commune_name}}"
- Section "Activité citoyenne" — 4 KPI cards en 2×2 (tables) :
  - 👥 Citoyens actifs : {{active_users}} *(+{{user_growth}}% vs semaine dernière)*
  - 📋 Signalements reçus : {{new_reports}}
  - 📢 Publications vues : {{publication_views}}
  - 🗳️ Votes consultations : {{consultation_votes}}
- Section "Signalements à traiter" :
  - Tableau HTML (thead gris, tbody blanc, zebra striping) avec colonnes :
    - Catégorie | Titre | Date | Sévérité | Statut
  - Affiche jusqu'à 5 signalements en attente (`{{reports_list}}`)
  - Si 0 signalement : message vert "✅ Aucun signalement en attente — bravo !"
  - Lien "Voir tous les signalements" → `{{reports_url}}`
- Section "Météo & Vigilances" :
  - Si `{{weather_alerts}}` non vide : liste des alertes actives avec badges colorés
  - Sinon : "✅ Aucune alerte météo active cette semaine"
- Section "Événements à venir" :
  - Liste des 3 prochains événements avec date + titre
- CTA principal : "Accéder au tableau de bord" → `{{dashboard_url}}`

**Variables :** `{{commune_name}}`, `{{week_start}}`, `{{week_end}}`, `{{active_users}}`, `{{user_growth}}`, `{{new_reports}}`, `{{publication_views}}`, `{{consultation_votes}}`, `{{reports_list}}` (array), `{{reports_url}}`, `{{weather_alerts}}` (array), `{{upcoming_events}}` (array), `{{dashboard_url}}`

---

### TEMPLATE 7 : `event_reminder.html`

**Usage :** Rappel J-1 envoyé aux citoyens inscrits à un événement.
**Destinataire :** Citoyen inscrit
**Ton :** Enthousiaste, utile, tutoiement

**Bande couleur header :** #16A34A (vert — positif, calendrier)
**Sujet :** 📅 Rappel : {{event_title}} — demain à {{event_time}}

**Contenu :**
- Header vert avec logo blanc + "RAPPEL ÉVÉNEMENT"
- Titre : "{{event_title}} — c'est demain !"
- Carte événement stylisée (fond blanc, ombre légère, bordure verte gauche 4px) :
  - 📅 **Date :** {{event_date}} à {{event_time}}
  - 📍 **Lieu :** {{event_location}}
  - 🏛️ **Organisateur :** {{commune_name}}
  - 👥 **Participants inscrits :** {{registration_count}} *(sur {{max_capacity}} places)*
- Corps : "Vous êtes inscrit(e) à cet événement. N'oubliez pas d'y participer !"
- Si `{{event_description}}` : section "À propos de l'événement" avec le résumé
- CTA principal : "Voir les détails de l'événement" → `{{event_url}}`
- Bouton secondaire (style outline) : "Annuler mon inscription" → `{{cancel_url}}`
- Carte grise "Infos pratiques" :
  - Si `{{parking_info}}` : 🚗 Parking : {{parking_info}}
  - Si `{{transport_info}}` : 🚌 Transport : {{transport_info}}
  - Si `{{contact_info}}` : 📞 Contact : {{contact_info}}
- Lien iCal : "📆 Ajouter à mon calendrier (.ics)" → `{{ical_url}}`

**Variables :** `{{event_title}}`, `{{event_date}}`, `{{event_time}}`, `{{event_location}}`, `{{event_description}}`, `{{commune_name}}`, `{{registration_count}}`, `{{max_capacity}}`, `{{event_url}}`, `{{cancel_url}}`, `{{ical_url}}`, `{{parking_info}}`, `{{transport_info}}`, `{{contact_info}}`

---

### TEMPLATE 8 : `consultation_launch.html`

**Usage :** Annonce du lancement d'une nouvelle consultation publique aux citoyens.
**Destinataire :** Citoyens de la commune
**Ton :** Engageant, démocratique, tutoiement

**Bande couleur header :** #7C3AED (violet — démocratie, participation)
**Sujet :** 🗳️ Nouvelle consultation : {{consultation_title}} — Votre avis compte !

**Contenu :**
- Header violet avec logo blanc + badge "CONSULTATION PUBLIQUE"
- Titre : "{{commune_name}} vous consulte !"
- Sous-titre : "{{consultation_title}}"
- Corps :
  - 2-3 phrases expliquant l'importance de la participation citoyenne
  - Description de la consultation : {{consultation_description}}
  - Badge deadline : "⏰ Jusqu'au {{ends_at}}" (fond violet clair)
- Section "Comment ça marche ?" (3 étapes horizontales, 1 colonne sur mobile) :
  1. 🔍 Lisez la description du projet
  2. ✅ Répondez aux questions ({{question_count}} questions — ~{{estimated_time}} min)
  3. 📊 Suivez les résultats en temps réel
- CTA principal (violet) : "Participer à la consultation" → `{{consultation_url}}`
- Compteur animé (texte) : "{{response_count}} citoyens ont déjà participé" *(si > 0)*
- Note RGPD : petite mention "Vos réponses sont anonymisées conformément au RGPD."

**Variables :** `{{consultation_title}}`, `{{consultation_description}}`, `{{commune_name}}`, `{{ends_at}}`, `{{question_count}}`, `{{estimated_time}}`, `{{consultation_url}}`, `{{response_count}}`

---

### TEMPLATE 9 : `subscription_confirmation.html`

**Usage :** Confirmation d'abonnement Stripe après paiement réussi.
**Destinataire :** Administrateur de la commune (décideur)
**Ton :** Professionnel, rassurant, vouvoiement

**Bande couleur header :** #16A34A (vert — succès, paiement)
**Sujet :** ✅ Abonnement confirmé — {{plan_name}} · {{commune_name}}

**Contenu :**
- Header vert avec logo + "✅ Paiement confirmé"
- Titre : "Votre abonnement VigieCity est actif !"
- Sous-titre : "Merci pour votre confiance, {{admin_name}}"
- Carte récapitulatif commande (style facture, fond blanc, bordure verte) :
  - **Titre :** Récapitulatif de votre abonnement
  - Tableau 2 colonnes (label | valeur) :
    - Plan : {{plan_name}}
    - Commune : {{commune_name}}
    - Montant : {{amount_eur}}€ / {{billing_cycle}}
    - Date de début : {{start_date}}
    - Prochain renouvellement : {{next_billing_date}}
    - Référence : {{stripe_subscription_id}}
  - Ligne de total avec fond gris : **Total facturé : {{amount_eur}}€ TTC**
- Section "Inclus dans votre plan {{plan_name}}" — liste des fonctionnalités `{{features_list}}`
- CTA principal : "Accéder à mon espace" → `{{dashboard_url}}`
- Bouton secondaire : "Gérer mon abonnement" → `{{portal_url}}` *(Stripe Customer Portal)*
- Carte grise "Informations de facturation" :
  - Facture disponible dans votre espace client Stripe
  - Pour toute question : facturation@vigiecity.fr
  - SIRET VigieCity : 123 456 789 00012 *(placeholder)*

**Variables :** `{{admin_name}}`, `{{commune_name}}`, `{{plan_name}}`, `{{amount_eur}}`, `{{billing_cycle}}`, `{{start_date}}`, `{{next_billing_date}}`, `{{stripe_subscription_id}}`, `{{features_list}}` (array), `{{dashboard_url}}`, `{{portal_url}}`

---

## INSTRUCTIONS DE LIVRAISON

1. **Crée chaque template comme un artifact HTML séparé** (ou une page HTML unique avec navigation entre les templates via des onglets ou un menu de prévisualisation).

2. **Chaque template doit être autonome** : structure HTML complète avec `<!DOCTYPE html>`, `<head>` avec `<meta>` charset/viewport, et `<body>`.

3. **Media queries** dans le `<head>` (c'est le seul CSS autorisé en dehors du inline) :
```css
@media screen and (max-width: 600px) {
  .email-container { width: 100% !important; }
  .email-body { padding: 20px 16px !important; }
  .kpi-cell { display: block !important; width: 100% !important; }
  .grid-2col td { display: block !important; width: 100% !important; }
}
```

4. **Commentaires HTML** dans chaque template pour indiquer :
   - Où remplacer les URLs d'images par les vraies URLs
   - Où injecter les variables dynamiques avec Resend (`{{variable}}`)
   - Les sections optionnelles (ex: `<!-- Afficher seulement si report_image_url est défini -->`)

5. **Prévisualise chaque template** avec des données fictives françaises réalistes :
   - Commune fictive : "Millac-sur-Vienne (86)" ou "Saint-Rémy-de-Provence (13)"
   - Noms français : Marie Dupont, Jean-Pierre Martin, etc.

6. **Ne génère pas de code JavaScript** — les emails sont statiques.

7. **Teste visuellement** que chaque template s'affiche proprement dans l'artifact (600px de large, centré).

---

Commence par le Template 1 (`welcome_commune.html`), puis crée les 8 suivants dans l'ordre. Demande-moi confirmation après chaque template si tu veux, ou génère-les tous d'un coup si tu préfères.
