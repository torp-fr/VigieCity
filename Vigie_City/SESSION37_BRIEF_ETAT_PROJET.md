# SESSION 37 — BRIEF & ÉTAT DU PROJET

**Date :** 26/06/2026  
**Status :** Post-session 36 (séparation vigiecity.fr / app.vigiecity.fr)  
**Branche :** `main` — commit `48cffd7` (+ 5 commits après S31)  

---

## 📊 BILAN SESSIONS 31 → 36

### Sessions complétées depuis session 31
| Session | Jalon | Commit | Description | Status |
|---------|-------|--------|-------------|--------|
| S31 | J19 | — | Email bienvenue post-activation (send-welcome v2) | ✅ Pushé |
| S32 | J20 | fa62563 | OG:image SEO (og-image.png 1200x630 + meta tags) | ✅ Pushé |
| S33 | J22 | — | Email nurturing J+3/J+7 (pg_cron + send-nurturing EF) | ✅ Pushé |
| S34 | J9 (phase 2) | beabd62 | Route /auth mobile, icônes Android, server.url correction | ✅ Pushé |
| S35 | J9b (phase 3) | 9ac6a15 | Fix routeTree /accueil missing route → 404 | ✅ Pushé |
| S36 | J9c (phase 4) | 48cffd7 | Séparation vigiecity.fr / app.vigiecity.fr + routing profil + /platform/mobile | ✅ Pushé |

**Total = 6 sessions = ~24 jours de déploiement commercial + mobile**

---

## 🎯 ÉTAT ACTUEL DÉTAILLÉ

### Frontend (React/TanStack Router)
- **Architecture :** Dual-domain : `vigiecity.fr` (landing/démo) + `app.vigiecity.fr` (app citoyenne/admin/super-admin)
- **Guard :** `IS_APP_DOMAIN` dans `__root.tsx` (hostname ou Capacitor natif)
- **Routes principales :**
  - `/auth` → Splash login (1.8s)
  - `/accueil` → Dashboard citoyen (si commune sélectionnée)
  - `/onboarding` → Sélection commune (si pas de collectivity_id)
  - `/admin/*` → Dashboard commune + CRUD (pages citoyen + gestion publics)
  - `/platform/*` → Super-admin (monetization, publicités, abonnements, **mobile** KPI dashboard)
  - `/` → Landing marketing (vigiecity.fr uniquement)

### Backend (Supabase)
- **Project :** `xfhkngecpbvmlstjymfy` (VigieCity — CORRECT)
- **11 Edge Functions en prod :**
  - `send-email` (v7) — white-label générique
  - `send-contact` (v3) — formulaires démo
  - `send-welcome` (v2) — bienvenue commune
  - `send-nurturing` (v1, pg_cron J+3/J+7)
  - `get-ad`, `track-ad-event` — moteur pub
  - `activate-license` — Chorus Pro licensing
  - `health-check` — cron monitoring
  - `fetch-rss`, `brave-news-fetch` — actualités
  - `posthog-query` — analytics
- **61 tables** en schéma (profiles, collectivities, events, reports, ads, etc.)
- **Données :** 35 communes test, 34 684 communes importées (INSEE)

### Mobile (Capacitor Android)
- **Status :** Routes configurées, serveur.url pointant vers `/auth`, icônes générées, capacitor.config.json v1
- **Pending :** `app.vigiecity.fr` domaine DNS (CNAME vercel), rebuild AAB + Play Console

### Analytics & Monitoring
- **PostHog :** Intégré, posthog-query EF en place
- **Health-check :** `health-check` EF (public, no JWT), pg_cron 8h UTC
- **RSS monitoring :** `rss-health-alert` cron 8h UTC (déploie alertes en cas d'erreur fetch)

### PWA & SW
- **Service Worker v5 :** Multi-cache (html, assets, fonts, api), offline.html
- **Guard :** `/admin/*` et `/platform/*` = network-only (jamais en cache)
- **Manifest :** Lighthouse-compatible, icons PNG toutes densités

### SEO & Conversion
- **Landing (/) :** FAQ accordéon + chiffres clés + JSON-LD SoftwareApplication (J18)
- **OG:image :** `og-image.png` 1200×630 + meta tags (J20, commit fa62563)
- **Templates email :** 9 templates (1 câblé send-welcome, 8 en attente)
- **Gating :** Widget "Premiers pas" admin (localStorage, 5 étapes), RGPD banner ads

---

## ⚙️ CONTRAINTES & PIÈGES À CONNAÎTRE

### 1. **NO STRIPE** — Chorus Pro uniquement
Ne jamais intégrer Stripe. Paiements = activation manuelle licence (EF `activate-license`) via backoffice.

### 2. **.env gitignored** — Vercel dashboard pour env vars
Toutes les clés (Supabase, Resend, PostHog, etc.) en Vercel, jamais en local.

### 3. **Supabase project** : `xfhkngecpbvmlstjymfy` ✅ (VigieCity, CORRECT)
Ne pas confondre avec `iixxzfgexmiofvmfrnuy` (TORP — autre projet).

### 4. **types.ts souvent obsolète** — Régénérer via CLI
```bash
cd _delivery
npx supabase gen types typescript --project-id xfhkngecpbvmlstjymfy \
  > src/integrations/supabase/types.ts
```

### 5. **Unicode dans longs fichiers** — Python, pas Edit
```bash
python3 -c "open('path','w',encoding='utf-8').write(content)"
```

### 6. **Git en PowerShell** — Single-line uniquement
Backslash continuation échoue. Utiliser VS Code Source Control.

### 7. **EF non trackées en git**
Déployées via Supabase MCP → ne pas `git add supabase/functions/`.

### 8. **SW bypass /admin* et /platform*** — network-only
Jamais CacheFirst, jamais mise en cache.

### 9. **routeTree.gen.ts autogénéré QUE en dev watch**
À la prod (build), c'est la version committée qui vaut → si nouvelle route, vérifier manuellement qu'elle est dedans (grepper le nom).

### 10. **Git = parent Vigie_City, pas dans sandbox bash**
Commits = VS Code Source Control ou bat files.

---

## 📋 JALONS ROADMAP RESTANTS (post-S36)

| Jalon | Estimé | Dépend de | Type | Priorité |
|-------|--------|-----------|------|----------|
| **J21** | 1-2j | — | Témoignages landing (social proof) | 🔴 COURT |
| **J23** | 1j | — | Template 02 Bienvenue Citoyen | 🟡 MOYEN |
| **J24** | 1-2j | J23 | Template 06 Résumé Hebdo (cron) | 🟡 MOYEN |
| **App mobile finition** | 1-2j | Domaine app.vigiecity.fr | DNS + rebuild AAB | 🔴 COURT |
| **J25** | ❓ | Décision stratégie | Paiements en ligne (attendre Chorus Pro) | ⚪ LONG |
| **J26** | ❓ | iOS SDK | iOS build (Capacitor) | ⚪ LONG |

---

## 💾 DONNÉES CLÉS À CONNAÎTRE

### Communes
- **Test :** 35 communes avec données réelles
- **Importées :** 34 684 communes (INSEE, enrichies, email générées)

### Clés Credentials (vault Supabase)
```
RESEND_API_KEY=...          ← FROM: contact@vigiecity.fr
BRAVE_API_KEY=...          ← Brave Search API (articles)
POSTHOG_API_KEY=...        ← PostHog analytics
```

### Services Web
| Service | URL | Rôle |
|---------|-----|------|
| **Vercel** | vigie-city (team baptiste) | Déploiement frontal |
| **Supabase** | xfhkngecpbvmlstjymfy | DB + EF + RLS |
| **Resend** | contact@vigiecity.fr | Email transactionnelle |
| **PostHog** | cloud.posthog.com | Analytics |

---

## 🚀 POUR DÉMARRER SESSION 37

1. ✅ Vérifier commit 48cffd7 sur `main` (séparation domaine + routing)
2. ✅ Vérifier que Vercel a rebuilté (`vigie-city` project)
3. ✅ Créer `app.vigiecity.fr` domaine dans Vercel Dashboard → Settings → Domains → CNAME
4. ✅ Décider du prochain jalon :
   - **J21 (court)** = ajouter témoignages landing → conversion
   - **App mobile (court)** = finaliser DNS + rebuild AAB
   - **J23 (moyen)** = template bienvenue citoyen
5. ✅ Choisir priorité versus autres projets TORP en parallèle

**Commande vérification git :**
```bash
git -C "C:\Users\Baptiste-\VigieCity" log --oneline -5
```

Attendu : 48cffd7 (séparation domaine) en premier.

---

**Généré par Claude — 26/06/2026**
