# 🚀 CRITICAL PATH — Plateforme Opérationnelle (27 juin - 5 juillet)

**Goal:** Livrer une plateforme OPÉRATIONNELLE (fully functional, not polished)  
**Timeline:** 9 jours (27 juin → 5 juillet)  
**After:** E2E tests, UX polish, commercialization

---

## DEFINITION: "Opérationnel"

A functioning system where:
- Citizens can post reports (web + mobile)
- Super-admin can moderate (auto-filter + manual review)
- City admins can subscribe and respond to reports
- Payments work (Stripe + Chorus Pro)
- 10 pilot communes are live and testing
- Zero critical blockers

**NOT included yet:** Branding, design perfection, marketing, sales collateral

---

## BLOCKERS TO SOLVE (Priority Order)

### 1️⃣ STRIPE INTEGRATION (Blocker for payment)
**Impact:** Cities can't upgrade past Hameau tier  
**Work:** 2-3 days

**Tasks:**
- [ ] Create 12 Stripe Price IDs (6 tiers × 2 billing: monthly/annual)
  - Hameau: $19/mo, $190/yr
  - Village: $49/mo, $490/yr
  - ... Métropole: $590/mo, $5900/yr
- [ ] Create `/api/subscription/create` endpoint
  - Takes: municipality_id, tier, billing_cycle
  - Returns: Stripe checkout URL
- [ ] Create `/api/stripe/webhook` endpoint
  - Listens: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Updates: `municipalities.subscription_status`, `municipalities.subscription_expires_at`
- [ ] Test: 1 commune → full payment flow → subscription active

**Files to create/edit:**
- `supabase/functions/stripe-create-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `src/routes/api/subscription/create.tsx` or Edge Function
- Migration: add `subscription_stripe_id`, `subscription_expires_at` to municipalities table

**Acceptance:** City subscribes → status = "active" → gains moderation rights ✅

---

### 2️⃣ CITY ADMIN MODERATION DASHBOARD (Blocker for city feature)
**Impact:** City admins can't see/respond to their reports  
**Work:** 2-3 days

**Tasks:**
- [ ] Create page: `/platform/city/moderation` (protected, city-only)
  - List: all reports from own municipality (status: pending, filtered, responded)
  - Filters: by status, by date, search by citizen name
  - Action: click report → see details → write response
- [ ] Create endpoint: `GET /api/city/reports`
  - Filters: municipality_id (RLS-enforced), status, date range
  - Returns: paginated list with citizen_name, date, category, status
- [ ] Create endpoint: `POST /api/city/reports/{id}/respond`
  - Takes: response_text, publish_to_citizen (yes/no)
  - Updates: reports.city_response, reports.status = "responded"
  - Triggers: notification to citizen (push + email)
- [ ] UI: Simple card layout (report card → click → modal → write response → submit)
  - No styling beyond TailwindCSS defaults
  - Focus: functionality

**Files to create:**
- `src/routes/platform/city/moderation.tsx`
- `supabase/functions/city-get-reports/index.ts` (already exists, verify RLS)
- `supabase/functions/city-post-response/index.ts`
- Migration: ensure city_response field exists + indexed

**Acceptance:** City admin logs in → sees own reports → can respond ✅

---

### 3️⃣ CHORUS PRO INTEGRATION (Blocker for French public sector)
**Impact:** French communes can't invoice via Chorus Pro  
**Work:** 1-2 days

**Tasks:**
- [ ] Implement invoice generation (basic PDF)
  - Template: SIRET, commune name, invoice #, amount, TVA (20%), due date
  - Endpoint: `POST /api/invoices/generate`
  - Returns: PDF URL (stored in Supabase Storage)
- [ ] Create `/api/invoices/list` endpoint
  - Returns: all invoices for a city (with payment status)
- [ ] Integrate Chorus Pro (optional for MVP):
  - If available: send invoice to Chorus Pro API
  - If not: generate PDF + email to commune treasurer
- [ ] Update subscription flow: generate invoice on first payment

**Files to create:**
- `supabase/functions/invoice-generate/index.ts`
- `src/routes/api/invoices/generate.tsx` or Edge Function
- Migration: add `invoices` table (id, municipality_id, amount, status, pdf_url)

**Acceptance:** City subscribes → invoice generated + emailed ✅

---

### 4️⃣ 10 PILOT COMMUNES GO-LIVE (Blocker for real testing)
**Impact:** No real users = can't test at scale  
**Work:** 2 days (parallel with above)

**Tasks:**
- [ ] Identify 10 contacts (from test plan) + send invitations
  - EMAIL 1: "You're invited to test VigieCity free"
  - Token-based signup: `vigiecity.fr/invite?token=XXX`
- [ ] Create 10 super-admin test accounts (for communes)
  - Each account linked to one municipality
- [ ] Onboarding call with each (30 min):
  - Show: citizen report → auto-filter → moderation queue
  - Show: city admin response
  - Q&A
- [ ] Monitor: ask 3-5 to post test reports in first 48h

**Files to create:**
- Migration: `INSERT INTO municipalities (name, population, email, status)` for 10 test communes
- Edge Function: `invite-token-signup` (creates user + links to municipality)
- Email template: invitation (Resend)

**Acceptance:** 10 communes onboarded, 1+ posting test reports ✅

---

### 5️⃣ MOBILE APP VERIFICATION (Blocker for iOS/Android)
**Impact:** App might not reflect web changes  
**Work:** 1 day

**Tasks:**
- [ ] Verify iOS app (via Capacitor) works:
  - Can post report
  - Can see alerts
  - Can see responses from city
- [ ] Verify Android app works (same)
- [ ] Test on real device (iPhone + Android phone)
  - If issues: fix + rebuild + deploy
- [ ] Check: Service Worker caching (no stale content)

**Files to check:**
- `Vigie_City/src/` (mobile app code)
- Capacitor config + native builds

**Acceptance:** Post report on app → appears on web (super-admin sees it) ✅

---

### 6️⃣ SUPER-ADMIN MODERATION UI (Blocker for moderation flow)
**Impact:** No UI to approve/reject reports  
**Work:** 1 day

**Tasks:**
- [ ] Create page: `/platform/moderation` (super-admin only)
  - List: all flagged reports (auto_filter_score > threshold)
  - Action buttons: "Approve" (visible), "Reject" (hidden), "Escalate to City"
  - Status updates in real-time
- [ ] Simple UI: list cards, click to expand, buttons below
  - No animations, no fancy design yet

**Files to create:**
- `src/routes/platform/moderation.tsx`
- Endpoint: `POST /api/moderation/{id}/approve|reject|escalate`

**Acceptance:** Super-admin sees filtered reports, can approve/reject ✅

---

## EXECUTION PLAN (Day by Day)

### **Day 1 (27 juin — TODAY)**
- [ ] ✅ Freemium moderation deployed (DONE)
- [ ] Start Stripe integration (create Price IDs + schema)
- [ ] Start city moderation dashboard (schema + endpoints)

### **Day 2-3 (28-29 juin)**
- [ ] Stripe: finish endpoints + webhook + test
- [ ] City dashboard: finish UI + RLS test
- [ ] Start: Chorus Pro invoice generation
- [ ] Send invitations to 10 communes

### **Day 4 (30 juin)**
- [ ] Chorus Pro: finish + test
- [ ] Mobile app: verify iOS + Android
- [ ] Super-admin moderation UI: build + test
- [ ] Communes: first responses to invitations
- [ ] Monitor: test reports coming in from pilots

### **Day 5-6 (1-2 juillet)**
- [ ] Onboarding calls with communes (5-10 calls)
- [ ] Live testing: monitor for bugs
- [ ] Fix critical blockers (payment flow, RLS issues, notifications)

### **Day 7-9 (3-5 juillet)**
- [ ] Final integration testing
- [ ] Verify all 10 communes can:
  - Subscribe ✅
  - Get invoices ✅
  - See reports ✅
  - Respond to reports ✅
- [ ] Document issues for E2E phase

---

## SUCCESS CRITERIA (Operational = YES)

| Criterion | Status |
|-----------|--------|
| Citizens can post reports (web + mobile) | 🔴 TBD |
| Freemium auto-filter works (score > 0.7 = hidden) | ✅ DEPLOYED |
| Super-admin can approve/reject reports | 🔴 TBD |
| City admin can subscribe (Stripe) | 🔴 TBD |
| City admin can see own reports | 🔴 TBD |
| City admin can respond to reports | 🔴 TBD |
| Citizen gets notification of response | 🔴 TBD |
| Invoice generated (Chorus Pro or PDF) | 🔴 TBD |
| 10 communes live + testing | 🔴 TBD |
| iOS + Android apps work | 🔴 TBD |
| 0 critical bugs blocking usage | 🔴 TBD |

---

## AFTER OPERATIONAL (Starting ~6 juillet)

### PHASE 2: E2E TESTS + UX POLISH (1 week, 6-12 juillet)
- Run full test scenarios (citizen → report → filter → city response)
- Collect feedback from pilots
- Fix UX issues (error messages, loading states, accessibility)
- Polish design (colors, typography, spacing) — optional branding
- Security audit (RLS, API validation, auth)

### PHASE 3: LAUNCH PREP (1 week, 13-19 juillet)
- Marketing materials (1-pager, case studies)
- Sales outreach (EPCI networks)
- Support setup (email, FAQ, knowledge base)
- Final QA sign-off

### PHASE 4: COMMERCIAL LAUNCH (22-30 juillet)
- Go-live announcement
- Public pricing page active
- Payment processing live
- Day-1 support monitoring

---

## DEPENDENCIES & RISKS

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Stripe API unreliability | 🟡 MEDIUM | Implement retry logic + fallback (manual invoice) |
| RLS bugs blocking city admins | 🔴 HIGH | Audit RLS before launch, test with real accounts |
| Chorus Pro API unavailable | 🟡 MEDIUM | Fallback to PDF invoice + email |
| Communes don't respond to invites | 🟡 MEDIUM | Follow up with 2nd email + phone call |
| Mobile app crashes on new features | 🔴 HIGH | Test on real devices (iOS + Android) before launch |
| Auto-filter false positives | 🟡 MEDIUM | Tune scoring + add manual review queue |

---

## DEFINITION OF "OPERATIONAL READY"

**Day 5-6 (3-5 juillet):** All checkboxes ✅ → "Operational" phase complete

**Day 7+ (6+ juillet):** E2E tests + UX polish → "Polished + Launchable"

---

**Owner:** Claude (execution)  
**Reviewer:** Baptiste (go/no-go at each phase)  
**ETA:** Operational by 5 juillet 2026, Launchable by 12 juillet 2026

