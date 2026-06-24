# 📍 BRIEF DE SITUATION RÉELLE — VigieCity
**Date :** 23 juin 2026  
**Méthode :** Audit de code source complet (analyse fichier par fichier) + lecture du plan stratégique  
**Statut :** Document de travail — confidentiel

---

## ⚠️ NOTE PRÉLIMINAIRE IMPORTANTE

Le document joint (`TORP_STRATEGIC_AUDIT_FINAL.md.docx`) concerne **un projet différent : TORP**, une plateforme d'audit IA de devis BTP (Nutri-score des devis, scores A-E, conformité DTU/RE2020). Ce n'est pas VigieCity.

**VigieCity** est la plateforme civique SaaS pour communes françaises (signalements, alertes, SOS, radio, messagerie citoyen↔mairie).

J'ai audité le **code réel** du repo VigieCity. Le plan de référence est `VIGIECITY_AUDIT_ROADMAP_MARKETING.md` (déjà dans le repo).

---

## 🔴 VÉRITÉ CRITIQUE : CE QUE HAIKU A VRAIMENT LIVRÉ

### Le problème central

Les sessions précédentes avec Haiku ont produit **deux types de sorties** :

**✅ Code réel (fonctionnel, intégré)** — la majorité du projet  
**❌ Fichiers encodés en string** — produits mais jamais intégrés

Les fichiers "corrompus" ont 0 lignes selon l'OS mais contiennent des bytes : le contenu est une longue chaîne avec des `\n` littéraux au lieu de vrais sauts de ligne. Résultat : **non déployables, non importés nulle part, absents du routeur.**

---

## 📊 AUDIT RÉEL : FICHIER PAR FICHIER

### ✅ ROUTES CITOYENNES — TOUTES RÉELLES

| Route | Lignes | Code Supabase | Statut réel |
|-------|--------|---------------|-------------|
| `/` (landing) | 1355 | – | ✅ Landing marketing complète |
| `/accueil` | 308 | ✅ Realtime vigilance, météo Open-Meteo | ✅ Fonctionnel |
| `/signaler` | 362 | ✅ Mutation + upload storage + Zod | ✅ Fonctionnel |
| `/carte` | 567 | ✅ Leaflet + Overpass + signalements | ✅ Fonctionnel |
| `/actualites` | 320 | ✅ Query news_articles + refresh RSS | ✅ Fonctionnel |
| `/urgences` | 337 | ✅ emergency_contacts + vigilance météo | ✅ Fonctionnel |
| `/voisins` | 518 | ✅ CRUD neighborhood_reports + modération | ✅ Fonctionnel |
| `/services` | 347 | ✅ Supabase + widget carte | ✅ Fonctionnel |
| `/evenements` | 441 | ✅ Inscriptions + iCal + capacité | ✅ Fonctionnel |
| `/consultations` | 419 | ✅ Votes + anti-double + résultats | ✅ Fonctionnel |
| `/messagerie` | 460 | ✅ Conversations + lu/non-lu | ✅ Fonctionnel |
| `/radio` | 616 | ✅ RadioBrowser + flux Supabase + favoris | ✅ Fonctionnel |
| `/mes-signalements` | 370 | ✅ Timeline historique statuts | ✅ Fonctionnel |
| `/onboarding` | 209 | ✅ RPC recherche commune + profil | ✅ Fonctionnel |

**Verdict app citoyenne : 14/14 routes = CODE RÉEL ✅**

---

### ✅ ROUTES ADMIN — TOUTES RÉELLES, MAIS PROBLÈME ROUTEUR

| Route | Lignes | Statut code | Dans routeTree ? |
|-------|--------|-------------|-----------------|
| `/admin/login` | 259 | ✅ Auth + redirection rôle | ✅ OUI |
| `/admin/` | 301 | ✅ KPIs + signalements récents | ✅ OUI |
| `/admin/signalements` | 609 | ✅ Tabs statut + actions + export CSV | ✅ OUI |
| `/admin/alertes` | 295 | ✅ Envoi push + historique | ✅ OUI |
| `/admin/analytics` | 321 | ✅ PostHog EU + Recharts | ❌ **ABSENT** |
| `/admin/epci` | 797 | ✅ Intercommunalité + rôles + tarif | ✅ OUI |
| `/admin/evenements` | 641 | ✅ CRUD complet + dates + lieu | ✅ OUI |
| `/admin/messagerie` | 583 | ✅ Chat admin + réponses + services | ✅ OUI |
| `/admin/publications` | 450 | ✅ CRUD + upload image Storage | ✅ OUI |
| `/admin/radio` | 391 | ✅ CRUD + test lecteur + toggle | ✅ OUI |
| `/admin/services` | 565 | ✅ CRUD + adresse + GPS | ✅ OUI |
| `/admin/settings` | 452 | ✅ Profil + mdp + **logo upload** + white-label | ❌ **ABSENT** |
| `/admin/urgences` | 497 | ✅ CRUD contacts urgence | ✅ OUI |
| `/admin/voisins` | 322 | ✅ Modération approbation/rejet | ✅ OUI |
| `/admin/consultations` | 579 | ✅ CRUD sondages + options + résultats | ✅ OUI |
| `/admin/terrain/` | 452 | ✅ Interface terrain mobile + push citoyen | ❌ **ABSENT** |
| `/admin/terrain/traites` | 148 | ✅ Signalements traités | ❌ **ABSENT** |
| `/admin/accept-invite` | 402 | ✅ Flow invitation complet | ❌ probablement ABSENT |

**⚠️ 4+ routes admin réelles mais inaccessibles** car absentes du `routeTree.gen.ts`  
→ La commande `tsr generate` (TanStack Router) n'a pas été relancée après leur ajout.

---

### ✅ ROUTES PLATFORM — PARTIELLEMENT ABSENTES DU ROUTEUR

| Route | Lignes | Statut code | Dans routeTree ? |
|-------|--------|-------------|-----------------|
| `/platform/` | 317 | ✅ Stats globales + refresh RSS | ✅ OUI |
| `/platform/collectivites` | 766 | ✅ CRM + pagination + invitations | ✅ OUI |
| `/platform/analytics` | 452 | ✅ PostHog + Leaflet carte France | ❌ **ABSENT** |
| `/platform/knowledge` | 547 | ✅ CRUD articles | ✅ OUI |
| `/platform/modules` | 314 | ⚠️ Données hardcodées (pas Supabase) | ✅ OUI |
| `/platform/onboarding` | 448 | ✅ Wizard 4 étapes + Edge Function | ✅ OUI |
| `/platform/plans` | 548 | ✅ CRUD features + toggle actif | ❌ **ABSENT** |
| `/platform/publishers` | 126 | ✅ Éditeurs RSS + comptage | ✅ OUI |
| `/platform/retention` | 375 | ✅ Scoring engagement + churn detect | ✅ OUI |
| `/platform/rss` | 456 | ✅ CRUD sources + refresh manuel | ✅ OUI |
| `/platform/settings` | 206 | ✅ Stats plateforme | ✅ OUI |
| `/platform/tarification` | 474 | ✅ CRUD tranches EPCI | ❌ **ABSENT** |
| `/platform/users` | 208 | ✅ Utilisateurs + changement rôle | ✅ OUI |

**⚠️ 3+ routes platform réelles mais inaccessibles** — routeTree obsolète.

---

### ❌ COUCHE MONÉTISATION — ENTIÈREMENT CASSÉE

C'est le bloc le plus critique. Haiku a produit ces fichiers **sous forme de strings encodées** — ils ont 0 lignes, 6-8 KB de bytes encodés, et **ne sont importés nulle part dans le projet** :

| Fichier | Bytes | Importé ? | Problème |
|---------|-------|-----------|---------|
| `stripe-checkout/index.ts` | 7338 | ❌ | Encodé, non déployable |
| `stripe-webhook-handler/index.ts` | 6396 | ❌ | Partiellement encodé + **bug : utilise `jsonwebtoken` au lieu de `crypto.subtle` pour vérifier la signature Stripe** |
| `ad-tracker/index.ts` | 3605 | ❌ | Encodé, non déployable |
| `SubscriptionForm.tsx` | 8598 | ❌ | Encodé, absent des imports |
| `SubscriptionStatus.tsx` | 6200 | ❌ | Encodé, absent des imports |
| `MonetizationDashboard.tsx` | 7625 | ❌ | Encodé, absent des imports |
| `AdBanner.tsx` | 6967 | ❌ | Encodé, absent des imports |
| `AdConsentManager.tsx` | 6825 | ❌ | Encodé, absent des imports |
| `advertiser-dashboard.tsx` | ~6273 | ❌ | Encodé + **métriques avec `Math.random()`** + absent du routeTree |

**Conclusion :** J5 (Stripe) et J13 (Advertising Engine) = **0% fonctionnel dans l'état actuel.**

---

### ✅ EDGE FUNCTIONS — 12 FONCTIONNELLES, 3 CASSÉES

| Fonction | Lignes | Statut |
|----------|--------|--------|
| `send-email` | 449 | ✅ Resend + 9 templates white-label |
| `send-push-notification` | 183 | ✅ VAPID Web Push |
| `meteo-vigilance` | 186 | ✅ Météo-France + push orange/rouge |
| `posthog-query` | 185 | ✅ Proxy HogQL + 6 presets |
| `brave-news-fetch` | 177 | ✅ Brave Search API |
| `services-map-fetch` | 328 | ✅ data.gouv.fr (santé, pharmacies, DAE) |
| `weather-vigilance-fetch` | 213 | ✅ Météo-France Vigilance |
| `invite-commune` | 137 | ✅ Token invitation + email |
| `event-reminder-push` | 96 | ✅ Push J-1 événements |
| `health-check` | 128 | ✅ Monitoring DB + RSS + weather |
| `create-commune` | 87 | ✅ Service_role création commune |
| `vapid-key` | 28 | ✅ Clé publique VAPID |
| `stripe-checkout` | **0** | ❌ Encodé — non déployable |
| `stripe-webhook-handler` | **11** | ❌ Encodé + bug signature Stripe |
| `ad-tracker` | **0** | ❌ Encodé — non déployable |

---

### ✅ MIGRATIONS — 20 COMPLÈTES ET VALIDES

20 migrations SQL bien structurées couvrant tous les modules. Statut : **probablement non appliquées en prod** (pas de confirmation de `supabase db push`).

---

## 📋 BILAN DES JALONS DU PLAN STRATÉGIQUE

Référence : `VIGIECITY_AUDIT_ROADMAP_MARKETING.md` + sessions J1-J13

| Jalon | Description | Code réel ? | Intégré (routeTree) ? | Déployé ? |
|-------|-------------|------------|----------------------|-----------|
| **C1** | App mobile Capacitor | ⚠️ Config JSON présente | – | ❌ Stores non soumis |
| **C2** | Templates email visuels | ✅ 9 templates Resend | – | ✅ EF déployée |
| **C3** | White-label commune (logo/couleurs) | ✅ Dans admin/settings | ❌ Route absente routeTree | ❌ |
| **C4** | Import INSEE mairies | ✅ Script Python prêt | – | **✅ Terminé (Baptiste)** |
| **C5** | Flow invitation admin commune | ✅ EF invite-commune + accept-invite | ❌ accept-invite absent routeTree | ⚠️ Partiel |
| **C6** | Pages légales RGPD | ✅ CGU, confidentialité, mentions | Vérifier routeTree | ⚠️ Partiel |
| **I1** | Push notifications end-to-end | ✅ EF send-push déployée | – | ⚠️ Non testé E2E |
| **I2** | Messagerie temps réel | ✅ UI + logique Supabase | ✅ OUI | ⚠️ Realtime à activer |
| **I3a** | Admin publications complet | ✅ 450 lignes + upload image | ✅ OUI | ✅ |
| **I3b** | Admin événements complet | ✅ 641 lignes CRUD + dates | ✅ OUI | ✅ |
| **I3c** | Admin messagerie | ✅ 583 lignes chat + réponses | ✅ OUI | ✅ |
| **I3d** | Admin alertes | ✅ 295 lignes + push | ✅ OUI | ✅ |
| **I4** | Stripe (abonnements) | ❌ Fichiers corrompus | ❌ | ❌ BLOQUÉ |
| **I5** | Landing B2B communes | ⚠️ Partie de la landing / | – | ⚠️ |
| **I6** | PWA + service worker offline | ✅ manifest + SW + skeletons | – | ⚠️ Non testé |
| **I7** | Voisins vigilants | ✅ 518 lignes citoyens + admin modération | ✅ OUI | ✅ |
| **J8.1** | Météo Vigilance (Météo-France) | ✅ EF + Hook + Widget | ✅ dans /accueil | ⚠️ EF à déployer |
| **J8.2** | Carte Services | ✅ EF services-map + Leaflet | ✅ dans /services | ⚠️ EF à déployer |
| **J8.3** | Consultations citoyennes | ✅ 419 lignes + admin 579 lignes | ✅ OUI | ✅ |
| **J8.4** | Voisins Vigilants | ✅ cf. I7 | ✅ OUI | ✅ |
| **J8.5** | Agenda enrichi (inscriptions) | ✅ 441 lignes | ✅ OUI | ✅ |
| **J8.6** | Timeline signalements | ✅ Widget + auto-trigger | ✅ dans /mes-signalements | ⚠️ Migration à appliquer |
| **J9** | Capacitor iOS/Android | ✅ Config JSON seulement | – | ❌ Build non fait |
| **J10** | PWA + Service Worker + Skeletons | ✅ manifest.json + SW | – | ⚠️ À tester |
| **J11** | Health-check + Runbook | ✅ EF health-check + docs | – | ⚠️ EF à déployer |
| **J5** | Stripe SaaS | ❌ Fichiers corrompus | ❌ | ❌ BLOQUÉ |
| **J13a** | Advertising Engine | ❌ Fichiers corrompus | ❌ | ❌ BLOQUÉ |
| **J13b** | Monetization Dashboard | ❌ Fichiers corrompus | ❌ | ❌ BLOQUÉ |
| **J13c** | GDPR Consent Manager | ❌ Fichiers corrompus | ❌ | ❌ BLOQUÉ |
| **Analytics** | Admin + Platform analytics | ✅ Vrai code PostHog | ❌ Absent routeTree | ❌ Inaccessible |

---

## 🎯 SCORE RÉEL PAR COUCHE

```
App Citoyenne    ████████████████████ 95%  (14/14 routes, intégrées)
Panel Admin      ████████████████░░░░ 80%  (code OK, routeTree incomplet)
Panel Platform   ██████████████░░░░░░ 70%  (code OK, 3 routes manquantes routeTree)
Edge Functions   ████████████████░░░░ 80%  (12/15 déployables)
Monétisation     ░░░░░░░░░░░░░░░░░░░░  0%  (tout cassé — Stripe + Ads)
Migrations SQL   ████████████████████ 100% (20 migrations, à appliquer)
Déploiement      █████░░░░░░░░░░░░░░░ 25%  (Vercel actif, EF pas toutes déployées)
```

---

## 🔥 QUICK WINS PRIORITAIRES (ordre d'impact)

### QW1 — Régénérer le routeTree (30 minutes)
```bash
cd C:\Users\Baptiste-\VigieCity\Vigie_City\_delivery
npx tsr generate
```
→ Débloque immédiatement : admin/analytics, admin/settings, admin/terrain, platform/analytics, platform/plans, platform/tarification

### QW2 — Appliquer les migrations (15 minutes)  
```bash
supabase db push  # 20 migrations dont J8.x, J10, J11, Stripe schema, Ad schema
```

### QW3 — Déployer les Edge Functions manquantes (20 minutes)
```bash
supabase functions deploy weather-vigilance-fetch
supabase functions deploy services-map-fetch
supabase functions deploy send-push-notification
supabase functions deploy event-reminder-push
supabase functions deploy health-check
```

### QW4 — Recoder J5 Stripe proprement (1 session)
Les 3 Edge Functions Stripe sont cassées. Réécriture from scratch nécessaire.  
Les composants React (SubscriptionForm, etc.) aussi — réécrire correctement.

### QW5 — Recoder J13 Publicité proprement (1 session)
Même situation : réécriture complète ad-tracker + composants Ad*.

### QW6 — Test E2E push notifications + messagerie realtime (1 session)
Activer `supabase.channel()` dans messagerie + test complet push VAPID.

---

## 📌 CLARIFICATION NÉCESSAIRE

Le document joint (`TORP_STRATEGIC_AUDIT_FINAL.md.docx`) concerne **TORP** — plateforme d'audit de devis BTP (DTU, RE2020, scores A-E), **pas VigieCity**.

Si tu travailles sur les deux projets en parallèle, je peux auditer le code TORP séparément (il existe un skill `torp-tech-lead` dédié). Ou si ce document devait être le plan VigieCity, il y a eu une confusion de fichier.

---

## ✅ PROCHAINES ÉTAPES RECOMMANDÉES

**Cette session :**
1. Lancer `tsr generate` → débloque 6+ routes immédiatement
2. Lancer `supabase db push` → applique les 20 migrations
3. Déployer les 5 EF manquantes

**Session suivante :**
4. Réécrire J5 Stripe (code propre, non corrompu)
5. Réécrire J13 Advertising Engine

**En parallèle :**
6. Test E2E complet sur un appareil mobile réel
7. Soumettre aux stores App Store + Google Play (J9)

---

*Brief préparé par Claude (audit code source) — 23 juin 2026*
