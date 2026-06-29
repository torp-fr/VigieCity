# 🚀 VigieCity — Roadmap Commercialisation (S37-S41)

**Date:** 27 juin 2026 (Session 39)  
**Objectif:** Atteindre "Commercial Ready" avec 10 communes pilotes + EPCI  
**Cible de lancement commercial:** Mi-juillet 2026

---

## 📊 JALONS (MILESTONES)

| # | Jalon | Dates | Status | Équipe |
|---|-------|-------|--------|--------|
| **1** | S37W1: Landing page + tarification finale | ✅ 20-24 juin | ✅ **DONE** | Claude |
| **2** | S37W2: Freemium moderation + 10 communes test | ⏳ 24-30 juin | 🔴 **EN COURS** | Claude |
| **3** | S38: QA + bug fixes + UX ajustements | ⏳ 1-7 juillet | 🔴 **À FAIRE** | Baptiste + Claude |
| **4** | S39: Stripe + Chorus Pro + invoicing | ⏳ 8-14 juillet | 🔴 **À FAIRE** | Claude |
| **5** | S40: Marketing + sales collateral | ⏳ 15-21 juillet | 🔴 **À FAIRE** | Baptiste |
| **6** | S41: Commercial Launch (go/no-go) | ⏳ 22-30 juillet | 🔴 **À FAIRE** | Baptiste |

---

## ✅ ÉTAT ACTUEL (27 JUIN 2026)

### FAIT ✅
- ✅ **Tarification finale** déployée sur vigiecity.fr (6 tiers : Hameau 19€ → Métropole 590€)
- ✅ **Landing page** complète avec calculateur de tarif
- ✅ **PromoBanner** supprimée (plus de "Offre à ne pas manquer")
- ✅ **Code source** organisé (racine `/src/` = bon chemin)

### EN COURS 🔴
- ⏳ **Freemium moderation system** : code prêt, à déployer
  - Migration SQL créée (20260626000001_freemium_moderation.sql)
  - Edge Function freemium-auto-filter créée
  - Edge Function city-fetch-reports créée
- ⏳ **10 communes pilotes** : à identifier + inviter
- ⏳ **2 EPCI pilotes** : à identifier + inviter

### À FAIRE 🔴
- Déploiement freemium moderation sur Supabase
- Tests end-to-end (citizen reports → auto-filter → super-admin moderation → city subscription)
- Intégration Stripe + Chorus Pro
- Dashboard super-admin pour modération
- QA + bug fixes
- Sales materials (brochure, pricing guide, case studies)

---

## 📋 JALONS DÉTAILLÉS

### **JALON 2: S37W2 (24-30 juin) — Freemium Moderation + Test Communes**

**Livrable:** 10 communes pilotes avec freemium moderation active

**À faire:**
1. ✅ Code freemium moderation (FAIT Session 38)
2. 🔴 **Déployer migrations SQL** sur Supabase (ligne 1: `supabase migration up`)
3. 🔴 **Déployer Edge Functions** (ligne 2-3: `supabase functions deploy freemium-auto-filter` + `city-fetch-reports`)
4. 🔴 **Identifier 10 communes pilotes** (1-2 par tier : 1 Hameau, 1 Village, 1 Bourg, 1 Bastide, 1 Cité, 1+ Métropole)
5. 🔴 **Inviter et onboard** les communes (créer comptes super-admin test + liens invitation)
6. 🔴 **Citizen testing:** Citoyens postent signalements → vérifier auto-filter + moderation queue
7. 🔴 **Super-admin dashboard:** Tester review/approve/reject flow

**Critères de succès:**
- Freemium auto-filter fonctionne (spam score > 0.7 → hidden)
- Super-admin peut reviewer reports (moderation_queue visible)
- Citizens peuvent flaguer reports
- City admin subscribe → peuvent modérer leurs propres reports
- 0 erreurs SQL/Edge Functions

---

### **JALON 3: S38 (1-7 juillet) — QA + Ajustements UX**

**Livrable:** Freemium moderation stable + UX fine-tuned

**À faire:**
1. 🔴 **Bug fixes** depuis pilotes (freemium + pricing)
2. 🔴 **UX polish** (messages d'erreur, loading states, empty states)
3. 🔴 **Perf testing** (moderation queue loading time, auto-filter latency)
4. 🔴 **RLS security audit** (vérifier que citizens ne voient que reports publics, etc.)
5. 🔴 **Monitoring setup** (logs, alertes sur Edge Functions)

**Critères de succès:**
- 0 critical bugs
- Page load time < 2s
- Auto-filter response < 500ms
- All 10 communes satisfied with UX

---

### **JALON 4: S39 (8-14 juillet) — Stripe + Chorus Pro**

**Livrable:** Cities peuvent s'abonner et payer (Stripe ou Chorus Pro)

**À faire:**
1. 🔴 **Stripe integration**
   - Create Stripe products (6 tiers × monthly/annual = 12 Price IDs)
   - Webhook /stripe/webhook pour subscription events
   - Update municipalities.subscription_status on payment success
2. 🔴 **Chorus Pro integration** (French public procurement)
   - Facture template (SIRET, mentions légales, TVA)
   - `/invoice/generate` endpoint
3. 🔴 **Subscription management**
   - Cities can upgrade/downgrade tier
   - Auto-email: invoice + welcome email
   - Renewal reminders (30 days before expiry)
4. 🔴 **Dashboard:** Cities voient date d'expiry + factures précédentes

**Critères de succès:**
- Test payment (1 commune) → subscription_status = "active"
- Chorus Pro invoice générée
- Email template fonctionne
- Renewal logic vérifié

---

### **JALON 5: S40 (15-21 juillet) — Marketing + Sales**

**Livrable:** Sales materials prêts pour lancement

**À faire:**
1. 🔴 **Brochure PDF** (1-pager) : features, pricing, ROI
2. 🔴 **Case study** (from 10 pilotes) : before/after, impact metrics
3. 🔴 **Pricing guide** : tiers, features, FAQ
4. 🔴 **Email sequence** (nurture) : invite → trial → upgrade
5. 🔴 **Sales deck** (investor/partner pitches)
6. 🔴 **Website updates** : testimonials, case study landing page
7. 🔴 **Partner outreach** : EPCI networks, associations mairies

**Critères de succès:**
- Sales materials approved by Baptiste
- Partner list (50+ EPCI contacts) compiled
- Email sequences ready to send

---

### **JALON 6: S41 (22-30 juillet) — Commercial Launch**

**Livrable:** Go-live commercial (public pricing, payment, support)

**À faire:**
1. 🔴 **Go/No-go decision** (based on S40 prep + S37-S39 learnings)
2. 🔴 **Announcement** (press release, social media)
3. 🔴 **Public pricing page** live (vigiecity.fr #tarifs)
4. 🔴 **Payment page** live (signup → subscription)
5. 🔴 **Support setup** (email support, FAQ, knowledge base)
6. 🔴 **Monitoring + on-call** (first 2 weeks)

**Critères de succès:**
- First 5 paid customers signed up
- 0 critical production issues
- Support response time < 4h
- Churn rate < 5%

---

## 🎯 PROCHAINES ACTIONS (IMMÉDIAT)

### **TODAY (27 juin) — Session 39:**
1. ✅ Tarification déployée + visible en prod
2. 🔴 **À FAIRE MAINTENANT:**
   - [ ] Appliquer migration SQL freemium moderation
   - [ ] Déployer Edge Functions (freemium-auto-filter + city-fetch-reports)
   - [ ] Tester auto-filter (POST spam → vérifier hidden + score > 0.7)
   - [ ] Tester city subscription flow

### **Semaine prochaine (28 juin - 30 juin) — S37W2:**
1. [ ] Identifier 10 communes pilotes (1-2 par tier)
2. [ ] Créer accounts super-admin + invitation links
3. [ ] Onboard communes (video call + démo)
4. [ ] Citizens post reports (via app ou web)
5. [ ] Verify moderation queue + city response flow

---

## 📈 SUCCESS METRICS

| Métrique | Target | Current |
|----------|--------|---------|
| Freemium moderation uptime | 99.9% | 🔴 À tester |
| Auto-filter accuracy (false positives) | < 5% | 🔴 À tester |
| Citizen report → moderation review time | < 24h | 🔴 À tester |
| City subscription conversion (pilots) | > 50% | 🔴 À voir |
| Page load time (landing) | < 2s | ✅ < 1.5s |
| Support response time | < 4h | 🔴 À setup |

---

## 🔧 TECHNICAL DEBT / RISKS

| Risk | Severity | Mitigation |
|------|----------|-----------|
| RLS policies vulnerability | 🔴 HIGH | Audit with Supabase security team |
| Auto-filter false negatives (spam slips through) | 🟡 MEDIUM | Tune scoring + manual review queue |
| Stripe webhook delays | 🟡 MEDIUM | Retry logic + manual sync endpoint |
| Service Worker caching issues | 🟡 MEDIUM | Cache busting via version hash |
| Chorus Pro API unreliability | 🟡 MEDIUM | Fallback to email invoice + manual follow-up |

---

## 💰 COMMERCIAL NUMBERS (Projections)

| Période | Communes | MRR | Comments |
|---------|----------|-----|----------|
| **S37W2 (pilot)** | 10 | €0 (free) | Freemium testing |
| **S38-S39** | 10 | €1,500–2,500 | ~3-5 convert to paid |
| **S40 (marketing)** | 20+ | €3,500–5,000 | Outbound to EPCI networks |
| **S41 (launch)** | 50+ | €8,000–12,000 | Expected launch velocity |
| **August** | 100+ | €18,000–25,000 | Conservative ramp |

---

## 📅 SUMMARY

**DONE:** Tarification (✅)  
**IN PROGRESS:** Freemium moderation deployment (⏳ TODAY)  
**NEXT:** Pilot communes + QA (⏳ Next 7 days)  
**THEN:** Stripe + Marketing + Launch (⏳ 21 days after)

**ETA Commercial Ready: ~30 juillet 2026** (go-live ~ 22 juillet)

---

Generated: Session 39, 27 juin 2026  
Author: Claude + Baptiste
