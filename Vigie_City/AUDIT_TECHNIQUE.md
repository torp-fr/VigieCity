# Audit Technique VigieCity — Session 25
**Date :** 2026-06-24  
**Périmètre :** Intégralité du codebase `_delivery/src/` + `public/sw.js` + schéma Supabase réel  
**Fichiers lus :** tous les fichiers `routes/platform/*`, `routes/__root.tsx`, `routes/admin/index.tsx`, `components/PlatformShell.tsx`, `hooks/usePlatformAuth.ts`, `routeTree.gen.ts`, `integrations/supabase/types.ts`, `public/sw.js`, `package.json` + 12 requêtes SQL directes sur Supabase `xfhkngecpbvmlstjymfy`

---

## RÉSUMÉ EXÉCUTIF

### Cause racine des pages /platform vierges

Le Service Worker v5 (commit `c6ec6ee`) est **correctement implémenté** : `skipWaiting()` + `clients.claim()` + bypass `/admin*`/`/platform*` en navigation. Ce n'est **pas** la source principale du problème persistant.

La cause réelle est un **bug de redirection post-login dans `__root.tsx`** :

```typescript
navigate({ to: "/admin/dashboard" });  // ← CETTE ROUTE N'EXISTE PAS
```

Le seul dashboard admin enregistré est `/admin/` (fichier `routes/admin/index.tsx`). Conséquence : après connexion d'un super_admin, TanStack Router affiche la page `NotFoundComponent` au lieu du dashboard. L'utilisateur voit une page vierge avec "404 Page introuvable", puis navigue manuellement vers `/platform` — mais si `usePlatformAuth` a déjà échoué (voir BUG-004), il est redirigé vers `/admin/login` en boucle.

---

## BUG-001 — CRITIQUE : Route `/admin/dashboard` inexistante

**Fichier :** `_delivery/src/routes/__root.tsx`, ligne `navigate({ to: "/admin/dashboard" })`  
**Impact :** Bloquant. Tout utilisateur ayant un rôle admin qui se connecte via le formulaire de login est redirigé vers une route 404.  
**Schéma des routes réelles :**

| Route enregistrée | Fichier |
|---|---|
| `/admin/` | `routes/admin/index.tsx` |
| `/admin/login` | `routes/admin/login.tsx` |
| `/admin/signalements` | `routes/admin/signalements.tsx` |
| … | … |
| `/admin/dashboard` | **n'existe pas** |

**Correction :**
```typescript
// __root.tsx, dans onAuthStateChange
// AVANT :
navigate({ to: "/admin/dashboard" });
// APRÈS :
navigate({ to: "/admin/" });
```

---

## BUG-002 — CRITIQUE : `usePlatformAuth` vérifie `profiles.role` mais les RLS utilisent `user_roles`

**Fichier :** `_delivery/src/hooks/usePlatformAuth.ts`  
**Impact :** Risque de désynchronisation silencieuse entre les deux systèmes d'autorisation.

**Situation actuelle :**
- `fetchPlatformAuth` vérifie `profiles.role === "super_admin"` (colonne texte libre)
- Les RLS Supabase pour "super_admin read all profiles" vérifient `user_roles.role = 'super_admin'` (enum typé `app_role`)
- Un utilisateur peut avoir `profiles.role = 'super_admin'` sans entrée dans `user_roles` → accès plateforme accordé MAIS RLS refusent les lectures globales
- Inverse : entrée `user_roles` présente mais `profiles.role` NULL → accès plateforme refusé alors que Supabase autoriserait

**Données actuelles :** 1 super_admin dans `profiles.role`, configuration apparemment cohérente. Risque activé dès qu'un second super_admin est créé manuellement.

**Correction :** Unifier — soit `fetchPlatformAuth` passe par `user_roles`, soit les RLS utilisent `profiles.role`. Recommandation : utiliser `user_roles` partout (il est déjà utilisé pour les RLS et est typé avec un enum `app_role`).

```typescript
// Nouvelle logique fetchPlatformAuth
const { data: roleRow, error } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .eq("role", "super_admin")
  .maybeSingle();
if (error || !roleRow) throw new Error("unauthorized");
```

---

## BUG-003 — CRITIQUE : `types.ts` Supabase massivement obsolète

**Fichier :** `_delivery/src/integrations/supabase/types.ts`  
**Impact :** Aucune sécurité TypeScript sur ~70% des requêtes DB. Les erreurs de typage sont silencieuses, TypeScript ne peut pas valider les noms de colonnes ni les types de retour.

**Comparaison :**

| | `types.ts` déclarés | Réalité Supabase |
|---|---|---|
| Nombre de tables | 23 | 61 |
| `profiles.role` | ❌ absent | ✅ existe (`text`) |
| `collectivities.is_active` | ❌ absent | ✅ existe (`boolean`) |
| `collectivities.email/phone/website/status` | ❌ absents | ✅ existent |
| `rss_sources` | ❌ absente | ✅ existe |
| `publishers` / `publisher_posts` | ❌ absentes | ✅ existent |
| `commune_invites` | ❌ absente | ✅ existe |
| `news_articles` | ❌ absente | ✅ existe |
| `knowledge_base` | ✅ présente | ✅ existe |

**Correction :**
```bash
cd _delivery
npx supabase gen types typescript --project-id xfhkngecpbvmlstjymfy \
  > src/integrations/supabase/types.ts
```

---

## BUG-004 — SÉRIEUX : Route `/platform/prospection` absente mais présente dans la nav

**Fichier :** `_delivery/src/components/PlatformShell.tsx` (sidebar nav)  
**Impact :** Cliquer sur "Prospection" dans la sidebar → page 404 NotFoundComponent  
**routeTree.gen.ts :** Aucune route `/platform/prospection` enregistrée  

**Correction :** Au choix —
- Option A : Créer le fichier `_delivery/src/routes/platform/prospection.tsx` avec le composant correspondant
- Option B (rapide) : Supprimer l'entrée "Prospection" du tableau `NAV_ITEMS` dans `PlatformShell.tsx`

---

## BUG-005 — SÉRIEUX : SW v5 — les assets JS/CSS des routes `/platform` restent en cache-first

**Fichier :** `public/sw.js`  
**Impact :** La navigation vers `/platform` est network-only (correct), MAIS les bundles JS/CSS qui constituent ces pages passent par `cacheFirst(request, CACHE_STATIC)`.

**Scénario problématique :**
1. User sur v4 → bundles `platform-chunk-abc.js` en cache
2. v5 SW s'installe, active, supprime `vigiecity-v4-*` → caches vidés ✅
3. v5 refetch les bundles depuis le réseau → OK en théorie  

**Mais :** si le user a une tab ouverte et que `skipWaiting()` s'est déclenché en cours de chargement de page, certains bundles peuvent provenir du cache v4 (déjà servi) et d'autres du réseau v5. Résultat : mismatch de version de modules JS → erreur runtime silencieuse → page vierge.

**Correction :** Ajouter un bypass `isAuthRoute` pour les chunks qui appartiennent aux routes admin/platform. Mais impossible à détecter par path avec code-split Vite. Solution pragmatique : ajouter un header de cache-busting ou utiliser `clients.claim()` + forcer un reload de la page après activation v5 :

```javascript
// Dans l'activate handler, après clients.claim() :
self.clients.matchAll({ type: 'window' }).then((clients) => {
  clients.forEach((client) => {
    if (client.url.includes('/platform') || client.url.includes('/admin')) {
      client.navigate(client.url);  // force reload de la tab
    }
  });
});
```

---

## BUG-006 — SÉRIEUX : `platform/analytics.tsx` — requête `news_articles` avec champ inexistant

**Fichier :** `_delivery/src/routes/platform/analytics.tsx`  
**Analyse :** `news_articles` existe réellement en DB (`news_articles.published_at`, `title`, etc.). Mais la requête dans analytics utilise potentiellement des champs non validés par les types (ex: `.select("title, image_url, category, published_at")` — colonnes confirmées présentes).  
**Vrai problème :** La table `news_articles` n'a pas de colonne `collectivity_id` directement accessible sans join via `rss_source_id → rss_sources.collectivity_id`. Si le code filtre par `collectivity_id` directement sur `news_articles`, ça échoue.

**À vérifier :** La requête exacte dans analytics.tsx sur `news_articles` — si elle utilise `.eq("collectivity_id", ...)`, c'est un bug car `news_articles` n'a pas de colonne `collectivity_id` propre (voir schéma réel : `id, collectivity_id, rss_source_id, title, description, url, image_url, author, category, published_at, fetched_at`).

**Correction :** Vérifier la requête et si besoin utiliser le join : `.select("*, rss_sources!inner(collectivity_id)")`

---

## BUG-007 — MOYEN : `platform/index.tsx` — statistiques d'actualités potentiellement incorrectes

**Fichier :** `_delivery/src/routes/platform/index.tsx`  
**Analyse :** Le dashboard compte les `news_articles` pour afficher des stats. `news_articles` est alimentée par les flux RSS (via `rss_source_id`), pas par les `publications` créées par les communes. Les vrais "publications" des communes sont dans la table `publications`. Les KPIs du dashboard mélangent potentiellement les deux sources.

---

## BUG-008 — MOYEN : `platform/retention.tsx` — `publications` requête sans pagination

**Fichier :** `_delivery/src/routes/platform/retention.tsx`  
**Analyse :** Charge **toutes** les publications et tous les reports sans `.limit()` :
```typescript
supabase.from("reports").select("collectivity_id, created_at").order("created_at", { ascending: false })
supabase.from("publications").select("collectivity_id, created_at").order("created_at", { ascending: false })
```
Avec 35k communes et potentiellement millions de rows, cette requête sera très lente ou en timeout.  
**Correction :** Utiliser des agrégations SQL côté serveur via une Edge Function ou des requêtes avec `count()` groupées par `collectivity_id`.

---

## BUG-009 — MOYEN : `platform/onboarding.tsx` — Edge Function `create-commune` potentiellement non déployée

**Fichier :** `_delivery/src/routes/platform/onboarding.tsx`  
**Analyse :** Invoque `supabase.functions.invoke("create-commune", ...)`. Cette EF n'est pas dans la liste des EFs connues déployées (confirmed: `send-email`, `fetch-rss`, `rss-health-alert`, `posthog-query`, `health-check`, `brave-news-fetch`).  
**Impact :** Si l'EF n'existe pas, création de commune échoue avec un warning et l'admin doit inviter manuellement. Le code gère ce cas gracieusement (fallback warning), mais crée une expérience dégradée non documentée.

---

## BUG-010 — MOYEN : `__root.tsx` — `pathname` potentiellement stale dans `onAuthStateChange`

**Fichier :** `_delivery/src/routes/__root.tsx`  
**Analyse :** Le `useEffect` qui contient `onAuthStateChange` a des deps vides `[]`. La variable `pathname` est capturée par closure lors du premier mount. Si la pathname change après le mount (navigation client-side), le closure garde l'ancienne valeur. La condition :
```typescript
if (!pathname.startsWith("/admin") && !pathname.startsWith("/platform")) {
  navigate({ to: "/admin/dashboard" });
}
```
...peut donc évaluer la mauvaise URL.  
**Impact :** Redirection potentiellement fausse si SIGNED_IN se déclenche après une navigation côté client. Cas rare mais possible (refresh de token lors de la navigation).

---

## BUG-011 — MOYEN : `/auth` route non incluse dans `SHELL_FREE_ROUTES`

**Fichier :** `_delivery/src/routes/__root.tsx`  
**Analyse :** `SHELL_FREE_ROUTES` ne contient pas `/auth`. Donc la route `/auth` (page de connexion citoyenne) rend avec `AppHeader` et `BottomNav` au-dessus du formulaire de login — layout incohérent.

**Correction :**
```typescript
const SHELL_FREE_ROUTES = [
  "/", "/landing", "/auth",  // ← ajouter "/auth"
  "/admin/login", "/admin/reset-password", "/admin/accept-invite",
  "/mentions-legales", "/confidentialite", "/cgu",
];
```

---

## BUG-012 — MINEUR : Styles hardcodés `#1e3a8a` dans composants platform

**Fichiers :** `platform/rss.tsx`, `platform/tarification.tsx`, `platform/publishers.tsx`  
**Analyse :** Plusieurs boutons utilisent `style={{ backgroundColor: "#1e3a8a" }}` au lieu de `className="bg-primary"`. Quand le thème change (via le système de theming J1), ces éléments ne suivent pas.

---

## BUG-013 — MINEUR : `platform/modules.tsx` — tarifs hardcodés non synchronisés avec la BDD

**Fichier :** `_delivery/src/routes/platform/modules.tsx`  
**Analyse :** Les prix affichés ("Gratuit", "99 €/mois", "Sur devis") sont hardcodés dans `PLANS` constant. La table `plans` et `intercommunal_pricing` (et même `pricing_tiers`) existent en base. Ces données ne se synchronisent jamais.

---

## BUG-014 — MINEUR : `platform/rss.tsx` — EF `fetch-rss` nommée différemment

**Fichier :** `_delivery/src/routes/platform/rss.tsx`  
**Analyse :** Invoque `supabase.functions.invoke("fetch-rss", ...)`. La vraie EF déployée s'appelle peut-être `rss-fetch` ou autre. À vérifier contre la liste des EFs déployées.

---

## BUG-015 — MINEUR : `commune_licenses` — champ `stripe_customer_id` présent mais Stripe interdit

**Fichier :** `integrations/supabase/types.ts` + schéma Supabase  
**Analyse :** La table `commune_licenses` a une colonne `stripe_customer_id`. De même, les tables `stripe_customers`, `stripe_subscriptions`, `stripe_webhook_events` existent en base. La contrainte projet est "NO STRIPE". Ces tables sont des reliques qui ne doivent JAMAIS être utilisées dans le frontend.  
**Risque :** Un développeur pourrait accidentellement les utiliser.  
**Recommandation :** Documenter explicitement dans le code que ces tables sont ignorées et que la facturation passe exclusivement par Chorus Pro.

---

## MATRICE DE PRIORITÉ

| # | Sévérité | Impact | Effort | Priorité | Fichier |
|---|---|---|---|---|---|
| BUG-001 | CRITIQUE | Bloque login admin | Trivial (1 ligne) | **P0** | `__root.tsx` |
| BUG-003 | CRITIQUE | Aucune sécurité types | Faible (1 commande) | **P0** | `types.ts` |
| BUG-002 | CRITIQUE | Auth incohérente | Moyen | **P1** | `usePlatformAuth.ts` |
| BUG-004 | SÉRIEUX | 404 nav sidebar | Trivial | **P1** | `PlatformShell.tsx` |
| BUG-005 | SÉRIEUX | Pages vierges intermittentes | Moyen | **P1** | `sw.js` |
| BUG-006 | SÉRIEUX | Stats analytics cassées | Faible | **P2** | `platform/analytics.tsx` |
| BUG-008 | MOYEN | Perf retention OOM | Moyen | **P2** | `platform/retention.tsx` |
| BUG-009 | MOYEN | Onboarding dégradé | Moyen | **P2** | `platform/onboarding.tsx` |
| BUG-010 | MOYEN | Redirect stale pathname | Faible | **P2** | `__root.tsx` |
| BUG-011 | MOYEN | Layout /auth cassé | Trivial | **P2** | `__root.tsx` |
| BUG-007 | MOYEN | KPIs dashboard incorrects | Faible | **P3** | `platform/index.tsx` |
| BUG-012 | MINEUR | Thème non suivi | Faible | **P3** | Plusieurs fichiers |
| BUG-013 | MINEUR | Tarifs désynchronisés | Moyen | **P3** | `platform/modules.tsx` |
| BUG-014 | MINEUR | EF name à vérifier | Trivial | **P3** | `platform/rss.tsx` |
| BUG-015 | MINEUR | Stripe reliques en base | Mineur | **P4** | Schéma + doc |

---

## PLAN DE CORRECTION RECOMMANDÉ

### Phase 1 — Corriger maintenant (≤ 30 min de code)
1. **BUG-001** : `__root.tsx` ligne `navigate({ to: "/admin/dashboard" })` → `navigate({ to: "/admin/" })`
2. **BUG-004** : Supprimer "Prospection" de `PlatformShell.tsx` NAV_ITEMS ou créer le fichier route
3. **BUG-011** : Ajouter `"/auth"` dans `SHELL_FREE_ROUTES`
4. **BUG-003** : `npx supabase gen types typescript --project-id xfhkngecpbvmlstjymfy > src/integrations/supabase/types.ts`

### Phase 2 — Sprint suivant
5. **BUG-002** : Migrer `usePlatformAuth` pour utiliser `user_roles` au lieu de `profiles.role`
6. **BUG-005** : Ajouter force-reload des tabs admin/platform dans l'activate handler du SW
7. **BUG-006** : Auditer requête `news_articles` dans analytics.tsx, corriger le join si nécessaire
8. **BUG-010** : Fixer le closure stale de `pathname` dans `__root.tsx` — déplacer la logique de redirect dans un composant React utilisant `useLocation` correctement

### Phase 3 — Tech debt
9. **BUG-008** : Remplacer les requêtes bulk retention par des agrégations SQL
10. **BUG-009** : Déployer EF `create-commune` ou documenter le workflow alternatif
11. **BUG-013** : Brancher `platform/modules.tsx` sur les tables `plans` réelles
12. **BUG-012** : Remplacer `style={{ backgroundColor: "#1e3a8a" }}` par `className="bg-primary"`

---

## ÉTAT DU SCHÉMA SUPABASE (référence)

**Tables existantes en production (61 tables) :** alerts, collectivities, commune_invites, commune_licenses, commune_services, consultation_options, consultation_questions, consultation_responses, consultations, conversations, emergency_contacts, event_registrations, events, intercommunal_pricing, intercommunalities, invoices, knowledge_base, mairie_services, messages, meteo_push_sent, meteo_vigilances, neighborhood_comments, neighborhood_reports, neighborhood_signals, neighborhood_status_history, **news_articles**, operator_sessions, otp_codes, plans, platform_settings, poll_options, poll_votes, polls, pricing_tiers, profiles, publications, publisher_posts, **publishers**, push_notifications_log, push_subscriptions, radio_streams, report_routing, report_status_history, report_timeline_comments, report_timeline_events, reports, **rss_sources**, service_categories, service_places, services_locations, sos_events, stripe_customers*, stripe_subscriptions*, stripe_webhook_events*, support_tickets, trusted_contacts, user_preferences, user_radio_favorites, user_roles, user_topic_prefs, weather_vigilance_logs

*\* Ne jamais utiliser — reliques Stripe*

**`profiles` colonnes réelles :** id, display_name, phone, collectivity_id, district, is_voisin_vigilant, created_at, updated_at, address, postal_code, city, **role** (types.ts l'omettait)

**`collectivities` colonnes réelles :** id, name, insee_code, postal_code, created_at, updated_at, department_code, region, population, **is_active**, epci_id, **status**, **email**, **phone**, **website**, mayor_name, logo_url, primary_color, secondary_color, latitude, longitude, maintenance_mode, maintenance_message (types.ts n'en avait que 9 sur 23)

**RLS `profiles` :** "users read own profile" = `auth.uid() = id` (⚠️ pas `role`, pas `user_roles`)
