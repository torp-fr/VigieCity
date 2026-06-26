# HANDOFF SESSION 31 → SESSION 32
## VigieCity — Rapport de clôture complet
**Date :** 25/06/2026  
**Branche :** `main` — dernier commit J19 (pushé, Vercel rebuild en cours)

---

## 1. ÉTAT GÉNÉRAL DU PROJET

VigieCity est une plateforme SaaS B2G (commune → citoyens) en production sur Vercel.  
Architecture : Vite + React + TanStack Router, Supabase (PostgreSQL + Edge Functions Deno), Resend (emails), PostHog (analytics), PWA (SW v5).

**Repo :** `C:\Users\Baptiste-\VigieCity\Vigie_City` (git main)  
**Supabase project :** `xfhkngecpbvmlstjymfy` (VigieCity) — NE PAS confondre avec `iixxzfgexmiofvmfrnuy` (TORP)  
**Vercel :** projet `vigie-city` (team baptiste)  
**Resend :** FROM `contact@vigiecity.fr`, clé en vault Supabase `RESEND_API_KEY`

---

## 2. JALONS COMPLÉTÉS (J0 → J19)

### Phase 0 — MVP (code-complete, en prod)
| Jalon | Description | Status |
|-------|-------------|--------|
| J0-J4 | Auth, RLS, AdminShell, TerrainShell, types.ts 61 tables | ✅ |
| J6 | RGPD (CGU, confidentialité, mentions légales, CookieBanner) | ✅ |
| J7 | Email white-label (send-email v7, user_id+collectivity_id auto-resolve) | ✅ |
| J8.1 | Météo vigilance (EF + widget dashboard citoyen) | ✅ |
| J8.2 | Carte services Overpass (4 couches) | ✅ |
| J8.3 | Consultations citoyennes (sondages + votes) | ✅ |
| J8.5 | Agenda citoyen (inscriptions + iCal + push J-1) | ✅ |
| J8.6 | Timeline signalements | ✅ |
| J9 | Monitoring (health-check EF public, rss-health-alert cron 8h UTC, RUNBOOK.md) | ✅ |
| J10 | PWA v4 (SW multi-cache, offline.html, manifest Lighthouse, icons PNG) | ✅ |
| J11 | RSS pipeline (brave-news-fetch EF, 89 articles réels) | ✅ |
| J12 | Search + CSV export signalements, ArticleSkeleton, pulse météo accueil | ✅ |

### Phase 1 — Commercial (en prod)
| Jalon | Description | Status |
|-------|-------------|--------|
| J1 | Theming (couleurs/logo par commune, bg-primary partout) | ✅ |
| J2 | Invitation admin (commune_invites, send-email, accept-invite.tsx) | ✅ |
| J3 | Notifications temps réel (Realtime unread + badges BottomNav) | ✅ |
| J4 | Notifications push (SW, push_notifications_log) | ✅ |
| J5 bis | Chorus Pro licensing (EF activate-license, /platform/abonnements, /admin/abonnement, expiry banner) | ✅ |
| J13a | Moteur publicitaire (EF get-ad + track-ad-event, /platform/publicites, AdBanner RGPD) | ✅ |
| J13b | Dashboard monétisation (/platform/monetization, MRR consolidé, sparklines) | ✅ |
| J13c | RGPD ads (AdBanner liens confidentialité, /profil préférences pub toggle) | ✅ |
| J15 | Acquisition (EF send-contact v2+v3, landing contact, page /demo, page /merci) | ✅ |
| J16 | Nurturing (confirmation email prospect, PostHog event post-formulaire) | ✅ |
| J17 | Widget "Premiers pas" dashboard admin (5 étapes, localStorage, barre %) | ✅ |
| J18 | Landing : chiffres clés + FAQ accordéon + JSON-LD SoftwareApplication | ✅ |
| J19 | Email bienvenue post-activation (EF send-welcome v2 + accept-invite fire-and-forget) | ✅ |

---

## 3. EDGE FUNCTIONS EN PROD (Supabase `xfhkngecpbvmlstjymfy`)

| EF | Version | verify_jwt | Rôle |
|----|---------|------------|------|
| `send-email` | v7 | false | Email générique white-label (user_id/collectivity_id auto-resolve) |
| `send-contact` | v3 | false | Email démo/devis → Baptiste + confirmation prospect |
| `send-welcome` | v2 | false | Email bienvenue template 01 HTML complet post-activation |
| `get-ad` | v1 | false | Servir une annonce ciblée par collectivity_id |
| `track-ad-event` | v1 | false | Tracking impression/clic publicitaire |
| `activate-license` | v1 | true | Activation manuelle licence Chorus Pro |
| `health-check` | v1 | false | Health check public (cron + monitoring) |
| `fetch-rss` | v7 | true | Pipeline RSS (pg_net hourly) |
| `brave-news-fetch` | v1 | true | Actualités via Brave Search API |
| `create-commune` | v6 | true | Création commune + admin initial |
| `posthog-query` | v1 | true | Query analytics PostHog |

---

## 4. TEMPLATES EMAIL (9 templates disponibles)

Fichier source : `VigieCity Email Templates -standalone-.html` (uploadé, contient tous les templates en JS strings)

| # | Nom | Variables | EF wired | Status |
|---|-----|-----------|----------|--------|
| 01 | Bienvenue Commune | `{{COMMUNE_NAME}}`, `{{PRENOM}}`, `{{ADMIN_URL}}` | `send-welcome` v2 | ✅ EN PROD |
| 02 | Bienvenue Citoyen | `{{first_name}}`, `{{commune_name}}` | — | ❌ à câbler |
| 03 | Réinitialisation MDP | — | — | ❌ à câbler |
| 04 | Notif. Signalement | `{{commune_name}}` | — | ❌ à câbler |
| 05 | Alerte Urgence | `{{commune_name}}`, `{{alert_title}}` | — | ❌ à câbler |
| 06 | Résumé Hebdomadaire | `{{commune_name}}`, `{{week_start}}` | — | ❌ à câbler |
| 07 | Rappel Événement | `{{event_title}}`, `{{event_time}}` | — | ❌ à câbler |
| 08 | Lancement Consultation | `{{consultation_title}}` | — | ❌ à câbler |
| 09 | Confirmation Abonnement | `{{plan_name}}`, `{{commune_name}}` | — | ❌ à câbler |

**Note :** Pour câbler les templates 02-09, récupérer le HTML depuis le standalone file (uploadé), créer une EF dédiée ou ajouter une route dans `send-email` v8.

---

## 5. ARCHITECTURE FICHIERS CLÉS

```
_delivery/src/
├── routes/
│   ├── admin/
│   │   ├── index.tsx          ← Dashboard admin + GettingStartedWidget (J17)
│   │   ├── accept-invite.tsx  ← Activation compte + fire-and-forget send-welcome (J19)
│   │   ├── abonnement.tsx     ← Vue abonnement commune (J5bis)
│   │   └── ...
│   ├── platform/
│   │   ├── monetization.tsx   ← Dashboard MRR consolidé (J13b)
│   │   ├── publicites.tsx     ← CRUD annonces (J13a)
│   │   ├── abonnements.tsx    ← Dashboard abonnements (J5bis)
│   │   └── ...
│   ├── index.tsx              ← Landing (FAQ + chiffres + JSON-LD) (J18)
│   ├── demo.tsx               ← Page démo sans auth (J15)
│   └── merci.tsx              ← Page post-formulaire (J16)
├── components/
│   ├── AdBanner.tsx           ← Bannière pub RGPD (J13a/J13c)
│   └── ...
└── integrations/supabase/
    ├── client.ts
    └── types.ts               ← 61 tables générées (ne pas écraser avec Copy-Item)
```

---

## 6. CONTRAINTES TECHNIQUES (à respecter impérativement)

1. **NO STRIPE** — paiements via Chorus Pro uniquement, jamais intégrer Stripe
2. **Pas de .env** — variables Supabase dans Vercel dashboard uniquement (gitignored)
3. **Supabase projet** : `xfhkngecpbvmlstjymfy` = VigieCity (CORRECT). `iixxzfgexmiofvmfrnuy` = TORP — NE PAS UTILISER
4. **Fichiers longs avec Unicode** : toujours utiliser `python3 -c "open(path,'w',encoding='utf-8').write(content)"` (Write/Edit tool bug avec em-dashes, apostrophes typographiques)
5. **PowerShell git** : commandes single-line uniquement (backslash continuation échoue)
6. **EFs déployées via Supabase MCP** → NON trackées en git → ne pas faire `git add supabase/functions/`
7. **SW (Service Worker)** : `/admin/*` et `/platform/*` doivent être network-only, jamais mis en cache
8. **types.ts collision** : `_delivery/src/integrations/` peut être écrasé par Copy-Item (PowerShell) — vérifier après chaque Copy-Item
9. **Git** : le `.git` est à `C:\Users\Baptiste-\VigieCity\` (parent de `Vigie_City/`). La sandbox Linux bash ne le voit pas. Utiliser computer-use (VS Code Source Control) ou bat files pour les commits.

---

## 7. JALONS SUIVANTS (par priorité)

### J20 — SEO og:image (Court terme)
- Générer une image Open Graph statique pour la landing (`public/og-image.jpg`, 1200×630)
- Ajouter `<meta property="og:image">` dans `index.tsx` head
- Améliore partage LinkedIn/Twitter et CTR search

### J21 — Témoignages / Social proof (Court terme)
- Section testimonials landing avec 3-4 quotes élus/agents
- Étoiles, nom, fonction, commune
- Améliore conversion landing → formulaire démo

### J22 — Séquence email post-activation (Moyen terme)
- Email J+3 : "Vos premiers signalements ?" (template 04 ou nouveau)
- Email J+7 : "Découvrez les alertes urgence" (template 05)
- Cron Supabase `pg_cron` qui trigger les envois
- EF `send-nurturing` avec paramètre `day` (3 ou 7)

### J23 — Template 02 Bienvenue Citoyen (Moyen terme)
- EF `send-welcome-citizen` ou route dans `send-email`
- Déclenché à l'inscription citoyen (trigger Supabase auth)
- Template 02 du standalone file

### J24 — Template 06 Résumé Hebdomadaire (Moyen terme)
- EF `send-weekly-digest` 
- Cron lundi 8h UTC
- Agrège signalements + articles + events de la semaine passée
- Envoi automatique aux admins de chaque commune active

### J25 — Stripe / Paiement en ligne (Long terme — POST MVP commercial)
- **RAPPEL : NO STRIPE** — attendre décision Chorus Pro
- Si modèle change : à rediscuter en début de session

### J26 — Mobile App (Long terme)
- Capacitor (config déjà présente : `capacitor.config.json`)
- Build iOS + Android à partir du Vite bundle
- Push notifications natives

---

## 8. DONNÉES / BASE DE DONNÉES

- **35 communes** en prod actuellement (test)
- **34 684 communes** importées (table `collectivities`, enrichies INSEE + email)
- **Tables principales** : `profiles`, `collectivities`, `commune_invites`, `commune_licenses`, `plans`, `ads`, `ad_impressions`, `reports`, `publications`, `events`, `consultations`, `poll_votes`, `agenda_registrations`, `rss_feed_items`, `push_notifications_log`, `revenue_snapshots`

---

## 9. POUR DÉMARRER LA SESSION 32

1. Ouvrir VS Code sur `C:\Users\Baptiste-\VigieCity\Vigie_City`
2. S'assurer que le dernier commit J19 est visible dans GitLens (`main`)
3. Vérifier que Vercel a bien rebuilté (environ 2-3 min après le push J19)
4. Décider du prochain jalon (J20 og:image recommandé — rapide, fort impact SEO)
5. Coller ce fichier en contexte d'ouverture de session

**Commande de vérification git :**
```
git -C "C:\Users\Baptiste-\VigieCity" log --oneline -5
```
Attendu : J19 en premier, puis J17+J18, J16, J15, J13c...

---

*Rapport généré automatiquement par Claude en fin de session 31 — 25/06/2026*
