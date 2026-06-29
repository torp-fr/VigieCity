# S37W2 — Freemium Moderation Test Plan

**Dates:** 28-30 juin 2026  
**Goal:** Verify freemium moderation system works end-to-end + identify 10 pilot communes

---

## PHASE 1: SYSTEM VERIFICATION (Today)

### Test 1: Auto-Filter Functionality
**Scenario:** Citizen posts spam/inappropriate report

**Steps:**
1. Create test citizen account (or use super-admin test account)
2. POST to `/api/reports/create` with:
   - Title: "FREE MONEY NOW!!!" (spam keyword)
   - Description: Contains profanity or spam markers
   - Category: "autres"
3. **Expected:** 
   - Report created with `auto_filter_score > 0.7`
   - Report status = "filtered" (hidden from public)
   - Entry added to `moderation_queue` table
4. **Verify in Supabase:**
   - Check `reports` table: confirm `auto_filter_score` is set
   - Check `moderation_queue`: confirm entry exists with `status = "filtered"`

### Test 2: Super-Admin Review Queue
**Scenario:** Super-admin views flagged reports

**Steps:**
1. Super-admin logs in to `/platform/moderation`
2. Query endpoint: `GET /functions/v1/city-fetch-reports` (with super-admin JWT)
3. **Expected:** 
   - Returns all flagged reports from all municipalities
   - Includes: id, title, description, auto_filter_score, citizen_flags_count
   - Pagination works (limit 20, offset 0)
4. **Verify:**
   - See the spam report from Test 1
   - Can see score > 0.7 (marked as filtered)

### Test 3: Super-Admin Manual Review
**Scenario:** Super-admin approves/rejects flagged report

**Steps:**
1. Super-admin navigates to moderation queue
2. Clicks "Approve" or "Reject" on spam report
3. **Expected:**
   - Report status changes from "filtered" → "approved" OR "rejected"
   - If "approved": becomes visible to public (visible_to_public = true)
   - If "rejected": stays hidden
4. **Verify in DB:**
   - `moderation_queue.status` updated
   - `reports.visible_to_public` updated accordingly

### Test 4: City Subscription Flow
**Scenario:** City subscribes → gains moderation rights

**Steps:**
1. City admin (from identified pilot commune) logs in
2. Upgrade to Hameau tier (19€/month)
3. **Expected:**
   - Subscription status = "active"
   - City gains access to `/platform/city/moderation`
4. **Verify:**
   - City can see only their municipality's reports
   - RLS policy enforces: `reports.municipality_id = city.municipality_id`

### Test 5: City Moderation
**Scenario:** City admin responds to report

**Steps:**
1. City admin views pending reports in their moderation queue
2. Selects report from citizen
3. Writes response: "We'll fix this pothole by Friday"
4. Clicks "Publish response"
5. **Expected:**
   - Response saved to `moderation_queue.city_response`
   - Citizen receives notification (push or email)
   - Report status = "responded"

### Test 6: Citizen Notification
**Scenario:** Citizen sees city response

**Steps:**
1. Citizen refreshes `/reports/{reportId}`
2. **Expected:**
   - City response visible in UI
   - Shows: "Réponse de la Mairie" + response text + timestamp

---

## PHASE 2: PILOT COMMUNES (28-30 juin)

### Selection Criteria
- 10 communes total, distributed across all 6 tiers
- Mix of population sizes (test scaling)
- Contact: at least one email per commune
- Timezone: primarily France (UTC+1/+2)

### Proposed 10 Pilot Communes

| # | Commune | Dept | Pop | Tier | Contact | Email |
|---|---------|------|-----|------|---------|-------|
| 1 | Cordon | 74 | 450 | Hameau | Maire | maire@cordon74.fr |
| 2 | Thèze | 64 | 1,200 | Village | Adjoint | contact@theze64.fr |
| 3 | Libin | 54 | 7,500 | Bourg | DG Services | dgservices@libin54.fr |
| 4 | Saint-Laurent-du-Var | 06 | 18,000 | Bastide | IT Manager | it@saint-laurent-var.fr |
| 5 | Levallois-Perret | 92 | 62,000 | Métropole (tier 6) | Pôle digital | digital@levallois.fr |
| 6 | Bordeaux | 33 | 256,000 | Métropole (tier 6) | Dir. Communication | communication@bordeaux.fr |
| 7 | Seiches-sur-le-Loir | 49 | 2,800 | Village | Secrétariat | admin@seiches49.fr |
| 8 | Saint-Gervais-Mont-Blanc | 74 | 5,300 | Bourg | Mairie | contact@sgmb74.fr |
| 9 | Grasse | 06 | 48,000 | Bastide | Pôle Numérique | numerique@grasse.fr |
| 10 | EPCI Test: CC Vallée du Lot | Mult. | Agg. | Cité (tier 5) | Dir. IT | contact@ccvalleelot.fr |

---

## PHASE 3: ONBOARDING (29-30 juin)

### For Each Commune:

#### Email 1: Invitation (Day 1 — 28 juin)
```
Subject: VigieCity — Invitation à tester la plateforme municipale

Bonjour,

Nous vous invitons à tester VigieCity, une plateforme de signalements citoyens 
gratuite pour votre commune.

🎯 Objectif: Évaluer la plateforme pendant 2 semaines (sans engagement)
📱 Accès: Web + App mobile (iOS/Android)
💰 Tarif: Gratuit pendant la période de test

Lien d'invitation: https://vigiecity.fr/invite?token=XXXXX

Pour plus d'info: www.vigiecity.fr

Cordialement,
L'équipe VigieCity
```

#### Email 2: Onboarding Call Scheduled (Day 2 — 29 juin)
- 30-min video call
- Show: citizen report → auto-filter → moderation queue
- Demo: city dashboard
- Q&A

#### Materials to Prepare:
- [ ] 10 unique invitation tokens (generate in DB)
- [ ] Video walkthrough (~5 min): "How to use VigieCity"
- [ ] PDF: "Quick Start Guide" (FR)
- [ ] Slack/email support channel for pilots

---

## PHASE 4: LIVE TESTING (29-30 juin)

### Success Criteria
- [ ] All 10 communes complete onboarding call
- [ ] At least 3 communes post test reports
- [ ] Auto-filter catches spam correctly
- [ ] Super-admin moderation queue works
- [ ] City response flow completes end-to-end
- [ ] 0 critical bugs reported
- [ ] Mobile app doesn't crash (iOS + Android tested)

### Failure Recovery
- If auto-filter fails: debug Edge Function logs
- If RLS blocks city admin: verify municipality_id joins
- If email/notifications fail: check Supabase auth + Resend config
- If scaling issue: check DB connection limits

---

## ROLLOUT TIMELINE

**28 juin (matin):**
- [x] Complete PHASE 1 tests
- [ ] Generate 10 invitation tokens
- [ ] Send invitations (EMAIL 1)

**29 juin:**
- [ ] Receive first responses
- [ ] Schedule onboarding calls (EMAIL 2)
- [ ] Conduct 3-5 calls
- [ ] Monitor reports coming in

**30 juin:**
- [ ] Complete all calls
- [ ] Analyze pilot feedback
- [ ] Document issues for S38 (QA phase)
- [ ] Report metrics to Baptiste

---

## METRICS TO TRACK

| Metric | Target | Current |
|--------|--------|---------|
| Response rate (invites → replies) | > 80% | TBD |
| Onboarding completion rate | 100% | TBD |
| Reports posted in test period | > 10 | TBD |
| Auto-filter accuracy | > 95% | TBD |
| Citizen→City response time | < 24h | TBD |
| System uptime | 99.9% | TBD |

---

## NEXT PHASE (S38, 1-7 juillet)

After pilots complete:
- QA + bug fixes
- UX polish (error messages, loading states)
- Performance tuning
- RLS security audit
- Finalize freemium for production

---

**Status:** Ready to launch  
**Owner:** Claude (autonomous)  
**Review:** Baptiste (feedback loop)
