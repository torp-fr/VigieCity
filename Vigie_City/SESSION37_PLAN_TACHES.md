# SESSION 37+ — PLAN COMPLET DES TÂCHES

**Date :** 26/06/2026  
**Horizon :** 4-6 semaines (phases court / moyen terme)  
**Approche :** Décidé chaque jalon avant de coder (claire priorité vs TORP)

---

## 🎯 PHASE IMMÉDIATE (J0-J3) — DNS & App Mobile Finition

### Tâche 1.1 : Configurer `app.vigiecity.fr` domaine
**Durée :** 15-30 min  
**Priorité :** 🔴 BLOCKER (nécessaire avant rebuild AAB)  

**Étapes :**
1. Vercel Dashboard → `vigie-city` project → Settings → Domains
2. Ajouter domaine : `app.vigiecity.fr`
3. Ajouter CNAME : `cname.vercel-dns.com`
4. Attendre propagation DNS (~5-30 min, tester avec `nslookup app.vigiecity.fr`)
5. Vérifier que https://app.vigiecity.fr/auth charge correctement
6. ✅ Commit rien (changement DNS, pas code)

**Validation :** Browser → `https://app.vigiecity.fr/auth` → voir splash login

---

### Tâche 1.2 : Rebuild & upload AAB Play Console
**Durée :** 30-45 min  
**Priorité :** 🔴 COURT TERME (finaliser mobile)  
**Dépend de :** T1.1  

**Prérequis :**
- Android Studio installé (si absent, installer depuis developer.android.com/studio)
- `capacitor.config.json` + `android/` à jour (sessions 34-35 faites)

**Étapes :**
1. Terminal PowerShell → `C:\Users\Baptiste-\VigieCity\Vigie_City`
2. `.\build_aab.bat` (déclenche npx cap sync android + gradle build)
3. Attendre completion (5-10 min)
4. Vérifier `app-release.aab` généré dans `android/app/release/`
5. Google Play Console → `vigiecity-app` → Internal testing track → Upload AAB
6. Remplacer version existante (si existe) ou créer nouvelle release
7. ✅ Attendre review (quelques heures)

**Validation :** Internal testers → installer AAB → splash → login → /accueil

---

### Tâche 1.3 : Vérifier `IS_APP_DOMAIN` routing end-to-end
**Durée :** 20 min  
**Priorité :** 🟡 QA (valider S36)  

**Étapes :**
1. Terminal → https://vigiecity.fr → vérifier landing + démo + formulaire
2. Terminal → https://vigiecity.fr/admin → redirect /auth (route commerciale sur app domain)
3. Terminal → https://app.vigiecity.fr/auth → splash login
4. Terminal → https://app.vigiecity.fr/ → redirect /auth (root sur app domain)
5. Code check : `grep "IS_APP_DOMAIN" _delivery/src/routes/__root.tsx` → voir guard complet
6. ✅ Documenter comportement dans RUNBOOK.md section "Dual-domain routing"

**Validation :** Les 5 URL ci-dessus se chargent comme prévu, pas d'erreur console

---

## 🎯 PHASE COURT TERME (J4-J10) — Conversion & Social Proof

### Tâche 2.1 : J21 — Témoignages landing (social proof)
**Durée :** 1-2 jours  
**Priorité :** 🔴 COURT (améliore taux conversion landing → démo)  
**Fichier :** `_delivery/src/routes/index.tsx` (landing)  

**Background :** Landing a FAQ + chiffres clés (J18). Manque : social proof (quotes élus/agents), étoiles, cas d'usage concrets.

**Étapes :**
1. **Collecte :** 3-4 témoignages courts (1-2 lignes) d'élus/agents mairies (recontacter test communes si besoin)
   - Exemple : "Nous recevons 50% plus de signalements citoyens depuis VigieCity." — Jean Dupont, Maire de Levallois
   - Format : `{quote, name, title, commune, stars: 5}`
2. **Design :** Section `TestimonialsSection` dans index.tsx
   - Grid 2 cols (responsive 1 col mobile)
   - Chaque card : citation, 5 étoiles, nom, titre, commune
   - Couleur : primary_color commune (fallback bleu landing)
3. **Placement :** Après "Chiffres clés", avant FAQ
4. **Responsive :** TailwindCSS sm: / md: / lg:
5. **Push & deploy :**
   ```bash
   git add _delivery/src/routes/index.tsx
   git commit -m "feat(landing): add testimonials section (J21)"
   git push
   ```
6. ✅ Vérifier sur Vercel (rebuild ~2-3 min)

**Validation :** https://vigiecity.fr → scroll → témoignages visibles avec étoiles, responsive OK

**Fichiers modifiés :** `index.tsx`  
**Commits attendus :** 1 commit  
**Notes :** Si collecte testimonials longue (1-2j), paralléliser avec autres jalons

---

### Tâche 2.2 : J23 — Template 02 Bienvenue Citoyen
**Durée :** 1 jour  
**Priorité :** 🟡 MOYEN (on-boarding citoyen complet)  
**Dépend de :** Rien (indépendant)  

**Background :** Citoyen s'inscrit → devrait recevoir email de bienvenue (pas seulement communes). Template 02 existe (standalone file), jamais câblé.

**Étapes :**
1. **Template HTML :** Récupérer Template 02 du standalone file (`VigieCity Email Templates -standalone-.html`)
   - Variables : `{{first_name}}`, `{{commune_name}}`
   - Dépend si citoyen a déjà sélectionné commune ou pas
2. **EF approach :** Deux options :
   - Option A : `send-welcome-citizen` EF dédiée
   - Option B : Ajouter template 02 à `send-email` v8 + paramètre `template: 'citizen'`
   - ✅ Recommandé : Option B (unifier, moins de EF)
3. **Trigger :** `send-email` v8 devrait être appelée après `auth.createUser(email, password)` en `/auth` (route signup)
   - Actuellement : signup crée user dans `profiles`, pas d'email envoyé
   - **À ajouter :** Hook post-signup → fetch EF `send-email` avec params `{email, template: 'citizen', first_name, commune_name?}`
4. **Code :**
   ```typescript
   // _delivery/src/routes/auth.tsx, handler signup
   handleRegister: async (email, password, first_name) => {
     const { data, error } = await supabase.auth.signUp({ email, password });
     if (!error) {
       // Fire-and-forget send welcome
       fetch(supabaseUrl + "/functions/v1/send-email", {
         method: "POST",
         body: JSON.stringify({
           email,
           template: "citizen",
           first_name,
           commune_name: null // à ajouter si citoyen a sélectionné commune
         })
       }).catch(() => {});
     }
   }
   ```
5. **EF `send-email` v8 :** Ajouter template 02 HTML au switch/case, paramètre `template` pour router
6. **Test :** 
   - Signup → vérifier email reçu en test
   - Vérifier variablementation (prénom, commune)
7. **Push :**
   ```bash
   git add _delivery/src/routes/auth.tsx
   git commit -m "feat(auth): send welcome email citizen on signup (J23)"
   git push
   ```

**Fichiers modifiés :** `_delivery/src/routes/auth.tsx` + `send-email` EF (pas trackée git)  
**Commits attendus :** 1 commit  
**Notes :** Template 02 HTML peut être long (unicode) → utiliser Python pour écrire

---

### Tâche 2.3 : J24 — Template 06 Résumé Hebdomadaire (cron)
**Durée :** 1.5-2 jours  
**Priorité :** 🟡 MOYEN (retention admin)  
**Dépend de :** J23 complété (architecture send-email en place)  

**Background :** Admins communes = utilisateurs clés. Email hebdomadaire = réduit churn, montre activité. Chaque lundi 8h UTC.

**Étapes :**
1. **Template 06 HTML :** Récupérer du standalone file
   - Variables : `{{commune_name}}`, `{{week_start}}`, `{{signalements_count}}`, `{{articles_count}}`, `{{events_count}}`
2. **EF `send-weekly-digest`** (ou route dans `send-email` v9 avec template 'weekly')
   - Input : rien (Supabase cron l'appelle sans params)
   - Logique :
     ```
     FOR EACH collectivity WHERE is_active = true:
       - Compter signalements 7j derniers
       - Compter articles RSS 7j derniers
       - Compter événements 7j derniers
       - Envoyer email à billing_email avec template 06 + aggrégats
       - Log envoi dans nouvelle table `weekly_digests` (id, collectivity_id, sent_at, count_signalements, count_articles, count_events)
     ```
3. **Migration SQL :** Table `weekly_digests` + RLS
   ```sql
   CREATE TABLE public.weekly_digests (
     id BIGSERIAL PRIMARY KEY,
     collectivity_id BIGINT NOT NULL REFERENCES collectivities(id),
     sent_at TIMESTAMP DEFAULT NOW(),
     signalements_count INT,
     articles_count INT,
     events_count INT
   );
   ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "service role only" ON weekly_digests
     FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
   ```
4. **Cron Supabase :** pg_cron job
   - Schedule : `0 8 * * MON` (8h UTC, lundi)
   - Command : trigger `send-weekly-digest` EF
   - Name : `send-weekly-digest-monday`
   - Active : true
5. **Test :** Déclencher manuellement (override cron pour test), vérifier emails reçus
6. **Files :**
   - Migration : `supabase/migrations/20260626000002_weekly_digests.sql`
   - Commit : `feat(cron): weekly digest email for active communes (J24)`

**Fichiers modifiés :** migration + `send-email` v9 EF  
**Commits attendus :** 1 commit (EF non trackée)  
**Notes :** Cron pg_net = appel HTTP à EF, retries automatiques Supabase. Tester timezone UTC vs locale.

---

## 🎯 PHASE MOYEN TERME (J11-J20) — Features Commerciales & Polish

### Tâche 3.1 : J25 — Décision Paiement en ligne (stratégie)
**Durée :** Réunion 30 min  
**Priorité :** ⚪ LONG (conditionné par business)  
**Dépend de :** Décision Chorus Pro vs Stripe  

**Contexte :** Actuellement = Chorus Pro uniquement (pas Stripe). Mais modèle peut évoluer (freemium + Stripe).

**Étapes :**
1. **Réunion :** Vérifier avec stakeholders (vous + équipe commerciale) :
   - Chorus Pro reste le seul paiement ? ✅ Continuer sans Stripe
   - Faut-il freemium + Stripe ? → redescendre dans backlog
   - Timeline pour Stripe si besoin ?
2. **Si Stripe retenu :** Créer user story séparé (J25b, long terme)
3. **Si Chorus Pro seul :** Fermer item (pas besoin code)

**Output :** Décision documentée dans ROADMAP

---

### Tâche 3.2 : Domaine mobile finition QA
**Durée :** 1-2 jours (parallèle T2)  
**Priorité :** 🟡 QA/Stabilité  

**Étapes :**
1. **Test app.vigiecity.fr full flow :**
   - Splash 2s → /auth splash 1.8s → login form
   - Login super_admin → `/platform/mobile` (dashboard KPI)
   - Login commune_admin → `/admin/` (dashboard commune)
   - Login citizen → `/onboarding` (sélection commune) → `/accueil` (dashboard citoyen)
2. **Performance :**
   - Lighthouse mobile score >= 85
   - First Contentful Paint <= 2s
   - Time to Interactive <= 4s
3. **Error handling :**
   - Perte réseau → offline.html gracieux
   - Auth timeout → redirect /auth
   - 404 route → redirect /auth (app domain)
4. **Bug triage :** Noter issues, assigner à sessions futures

**Output :** Test report doc + bug list

---

### Tâche 3.3 : iOS build (long terme)
**Durée :** 3-5 jours  
**Priorité :** ⚪ LONG (après Android stable)  
**Dépend de :** Android finition + iOS SDK install  

**Prérequis :**
- Capacitor iOS plugin installé (déjà dans package.json)
- Xcode >= 14 (Mac uniquement)
- Apple Developer account + signing certs

**Étapes :**
1. Terminal : `npx cap add ios`
2. Générer signing certs (Apple Developer portal)
3. `npx cap open ios` → Xcode
4. Configurer bundle ID, provisioning profile
5. Build → Archive → Upload App Store Connect
6. Attendre review + release

**Output :** iOS app en App Store internal testing

---

## 🎯 PHASE LONG TERME (J21+) — Monetization & Growth

### Tâche 4.1 : J27 — Dashboard collectivités amélioré (super-admin)
**Durée :** 2-3 jours  
**Priorité :** 🟡 Visibilité  

**Contexte :** `/platform/` super-admin a monetization + publicités + mobile KPI, mais liste communes = simple tableau. Manque : filtres, recherche, export CSV, graphiques.

**Étapes :**
1. Table `/platform/collectivities` avec :
   - Colonnes : nom, email, status (active/inactive), communes count, signalements 24h, revenue MRR
   - Filtres : status, region, commune count range
   - Recherche : par nom
   - Sort : par colonne
   - Export CSV : tous cols
   - Click row → `/platform/collectivities/[id]` détail commune
2. Détail commune (page nouvelle) :
   - Info générale (nom, logo, email, phone)
   - Graphique signalements 30j
   - Graphique articles RSS 30j
   - Gestion abonnement (statut, expiry, bouton renouveler)
   - Gestion admins (invite, revoke)
3. Responsive + dark theme

---

### Tâche 4.2 : J28 — Advertising régie améliorée
**Durée :** 2-3 jours  
**Priorité :** 🟡 Monétisation  

**Contexte :** Régie pub = moteur simple (get-ad EF). Manque : reporting détaillé (CTR, conversion, impressions), targeting avancé (démo), dashboards buyer.

**Étapes :**
1. Dashboard super-admin `/platform/publicites/analytics` :
   - Graphique impressions 30j (line chart par jour)
   - Graphique clicks (bar chart)
   - CTR moyen % (card)
   - Top 5 annonces (par impressions, clicks, CTR)
   - Export CSV all stats
2. Create/Edit annonce → formulaire avancé :
   - Ajouter "targeting" : régions, types communes (ville/bourg/rural), taille min/max
   - Ajouter "dates" : date start/end
   - Ajouter "budget daily cap" (optional)
3. Buyer dashboard (si buyer role existe) :
   - Vue seulement ses annonces
   - Analytics propres
   - Rapport weekly email

---

### Tâche 4.3 : J29 — Chourus Pro intégration dashboard
**Durée :** 1-2 jours  
**Priorité :** 🟡 Visibilité commercial  

**Context :** Communes peuvent activer licence Chorus Pro via `/admin/abonnement`. Manque : suivi statut, historique, renouvellement auto.

**Étapes :**
1. Table `commune_licenses` → ajouter colonnes :
   - `license_key` (Chorus Pro unique ID)
   - `auto_renew` (boolean, défaut true)
   - `last_synced_at` (timestamp) — quand dernière check Chorus Pro API
   - `error_log` (text, si failed activation)
2. EF `sync-licenses` (cron daily)
   - Appelle Chorus Pro API pour chaque licence
   - Vérifie expiry date réel
   - MAJ `license_status` + `expiry_date` + `last_synced_at`
   - Log erreurs en `error_log`
3. Admin dashboard `/admin/abonnement` → ajouter :
   - Section "État licence"
   - Afficher status (actif/expiré/erreur), date expiry
   - Bouton "Renouveler" (redirect Chorus Pro portal)
   - Historique renouvellements (log)

---

## 📅 GANTT RÉSUMÉ

```
SESSION 37    : T1.1 (DNS) + T1.2 (AAB) + T1.3 (QA)              [3-4 jours]
SESSION 38    : T2.1 (J21 témoignages) + T2.2 (J23 citizen)     [2-3 jours]
SESSION 39    : T2.3 (J24 digest) + T3.2 (mobile QA)            [2-3 jours]
SESSION 40    : T3.1 (paiements décision) + T3.3 (iOS start)   [3-5 jours]
SESSION 41+   : T4.1 (collectivités dashboard) + T4.2/4.3       [2-3 jours chacun]

Parallèle    : TORP roadmap (autonome)
```

---

## ⚡ QUICK DECISION MATRIX

| Jalon | Impact | Effort | Priority | Owner | Next? |
|-------|--------|--------|----------|-------|-------|
| T1.1 DNS | BLOCKER | 15 min | 🔴 NOW | You | YES |
| T1.2 AAB | HIGH | 45 min | 🔴 NOW | You | YES |
| T1.3 QA | MED | 20 min | 🟡 S37 | You | YES |
| T2.1 J21 | MED | 1-2d | 🔴 S38 | You | YES |
| T2.2 J23 | LOW | 1d | 🟡 S38 | You | MAYBE |
| T2.3 J24 | LOW | 2d | 🟡 S39 | You | MAYBE |
| T3.1 Pay | HIGH | 30 min | ⚪ S40 | Team | DISCUSS |
| T3.3 iOS | MED | 3-5d | ⚪ S40+ | You | Q3 |

---

## 🔐 CHECKLISTS PAR SESSION

### SESSION 37 (CETTE SEMAINE)
- [ ] T1.1 : DNS app.vigiecity.fr configuré
- [ ] T1.2 : AAB rebuilt + uploaded Play Console
- [ ] T1.3 : Vérification dual-domain routing complet
- [ ] Commit log : `git log --oneline -5` montre commits récents clean
- [ ] Vercel rebuild visible + ✅ (v-xxxx timestamp)

### SESSION 38 (SEMAINE 2)
- [ ] Testimonials collectés (3-4 citations)
- [ ] T2.1 : Landing J21 pushée + Vercel deployed
- [ ] T2.2 : Template 02 HTML récupéré du standalone
- [ ] T2.2 : Code auth.tsx + EF send-email v8 testées
- [ ] Email test reçu avec template citizen

### SESSION 39 (SEMAINE 3)
- [ ] Migration weekly_digests créée
- [ ] T2.3 : EF send-weekly-digest déployée
- [ ] T2.3 : pg_cron job configurée (Monday 8h UTC)
- [ ] Test manuel de digest envoyée
- [ ] T3.2 : Full flow app.vigiecity.fr tested (login → dashboards)

### SESSION 40+ (SEMAINE 4+)
- [ ] T3.1 : Réunion paiement + décision documentée
- [ ] T3.3 (si OK) : iOS SDK setup started
- [ ] T4.1 : Collectivités dashboard skeleton codée
- [ ] Backlog Stripe créé (if needed)

---

**Généré par Claude — 26/06/2026**  
**Réviser après chaque session — cocher items complétés, ajuster timeline**
