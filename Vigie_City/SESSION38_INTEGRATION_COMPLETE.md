# Session 38 — Intégration Tarification + Freemium Modération ✅ COMPLÈTE

**Date :** 26 juin 2026  
**Status :** Code ready for testing  
**Expected time to production :** 24h (test + minor tweaks)

---

## ✅ CE QUI A ÉTÉ FAIT

### 1. `/pricing.tsx` Updated ✅

**Changes :**
- Replaced old tier names (Solidarité, Nano, Micro, Local, Urbain, Métropole)
- New names: **Hameau, Village, Bourg, Bastide, Cité, Métropole**
- New prices: **19€, 49€, 99€, 189€, 390€, 590€/month**
- Updated feature lists per tier (with new monitoring scopes)
- Updated population bands (< 500, 501–3,5k, 3,5k–10k, 10k–25k, 25k–50k, 50k+)
- Updated calculator function for EPCI (now uses new tiers)
- Added note on pioneer discount (-2 months Y1)

**File location :** `_delivery/src/routes/pricing.tsx` (590 lines)

---

### 2. Database Migration ✅

**File :** `supabase/migrations/20260626000001_freemium_moderation.sql`

**Tables created :**
1. **reports** (enhanced)
   - Columns: `status`, `auto_filter_score`, `citizen_flags_count`, `city_response`, `visible_to_public`
   - Status: pending_review, public, hidden, escalated
   - Tracks moderation ownership (super-admin initially, city on subscription)

2. **moderation_queue**
   - Tracks flagged reports for super-admin review
   - Fields: report_id, status, reason, reviewed_by_admin, reviewed_at
   - Unique per report (1 queue entry max)

3. **report_flags**
   - Citizens can flag bad reports (spam, profanity, abuse, misinformation)
   - Unique per citizen per report
   - Triggers auto-escalation when N>3 flags

**RLS Policies :**
- Citizens see only public reports
- Super-admin sees all reports for moderation
- City admins see reports in their municipality if subscribed
- Citizens can flag public reports

**Triggers :**
- Auto-update `citizen_flags_count` on new flags
- Auto-escalate reports when citizen flags >= 3

---

### 3. Edge Functions Created ✅

#### Function 1: `freemium-auto-filter`

**Path :** `supabase/functions/freemium-auto-filter/index.ts`

**Purpose :** Auto-filter spam/profanity on incoming reports

**Logic :**
1. Calculate auto-filter score (0-1)
   - Detects spam patterns (viagra, lottery, URLs, etc.)
   - Detects ALL CAPS aggression
   - Detects excessive punctuation
   - Detects basic profanity (French)
2. Score > 0.7 → flag for super-admin review
3. Update report: `visible_to_public = false`, add to `moderation_queue`
4. Score ≤ 0.7 → publish report immediately

**Input :** `{ report_id, content, municipality_id }`

**Output :** `{ success, report_id, auto_filter_score, visible_to_public, status }`

---

#### Function 2: `city-fetch-reports`

**Path :** `supabase/functions/city-fetch-reports/index.ts`

**Purpose :** City admins fetch their municipality reports once subscribed

**Logic :**
1. Verify JWT token (city admin authentication)
2. Get all municipalities where user is admin
3. Check subscription_status = "active"
4. Fetch all reports in those municipalities
5. Categorize by status: pending_response, resolved, escalated
6. Return organized dashboard data

**Input :** `Authorization: Bearer <token>`

**Output :**
```json
{
  "success": true,
  "municipality_count": 2,
  "municipalities": [...],
  "reports": {
    "total": 145,
    "pending_response": 23,
    "resolved": 98,
    "escalated": 5,
    "data": { "pending": [...], "resolved": [...], "escalated": [...] }
  }
}
```

---

### 4. Database Schema Extended ✅

**New columns on `municipalities` table :**
- `subscription_status` (freemium, active, paused, canceled)
- `subscription_tier` (Hameau, Village, Bourg, Bastide, Cité, Métropole)
- `subscription_started_at` (timestamp)
- `subscription_ends_at` (timestamp)

**Why :** Determines moderation ownership (Phase 1: super-admin, Phase 2: city)

---

## 🎯 ARCHITECTURE SUMMARY

### Phase 1: No City Subscription

```
Citizen posts report
  ↓
freemium-auto-filter EF (auto-filter score)
  ├─ Score > 0.7 → hidden, add to moderation_queue
  └─ Score ≤ 0.7 → public immediately
  ↓
Super-admin reviews moderation_queue (24h SLA)
  ├─ Approve → make public
  ├─ Reject → hide
  └─ Escalate (if 3+ citizen flags)
```

### Phase 2: City Subscribes

```
City admin logs in
  ↓
city-fetch-reports EF (auto-fetch municipality reports)
  ├─ Pending responses (city hasn't acted)
  ├─ Resolved (city responded)
  └─ Escalated (multiple citizen flags)
  ↓
City moderates own content
  (super-admin steps back)
```

---

## 📊 TESTING CHECKLIST

Before launch, verify:

### UI/UX
- [ ] `/pricing` loads with new tier names + prices
- [ ] Pricing calculator updates with new tiers
- [ ] EPCI section shows new formula example
- [ ] Mobile responsive (tabs, cards)

### Database
- [ ] Migration applies cleanly (`supabase migration up`)
- [ ] `reports` table has new columns (status, auto_filter_score, etc.)
- [ ] `moderation_queue` table created
- [ ] `report_flags` table created
- [ ] `municipalities` table has subscription_* columns
- [ ] RLS policies enforced (test with different roles)

### Edge Functions
- [ ] `freemium-auto-filter` deployed (`supabase functions deploy`)
  - Test with spam content → auto_filter_score > 0.7
  - Test with normal content → auto_filter_score ≤ 0.7
  - Verify report status updates correctly
- [ ] `city-fetch-reports` deployed
  - Test with city admin token → fetches own municipality reports
  - Test with non-admin token → 403 Unauthorized
  - Verify categorization (pending, resolved, escalated)

### Freemium Flow
- [ ] Citizen (non-subscribed) can post report
- [ ] Report passes auto-filter → visible immediately
- [ ] Report fails auto-filter → hidden, in super-admin queue
- [ ] Super-admin can review queue + approve/reject
- [ ] City admin subscribes → auto-fetches reports
- [ ] City admin responds to report → city_response populated
- [ ] Citizen can flag bad reports → escalate to super-admin

### Pioneer Discount
- [ ] New signup applies -2 months free Y1
- [ ] Subscription billing shows correct calculation (10 months × price)
- [ ] Renews at full price Y2+

---

## 📁 FILES CHANGED/CREATED

| File | Type | Size | Status |
|------|------|------|--------|
| `_delivery/src/routes/pricing.tsx` | Edit | 590L | ✅ Done |
| `supabase/migrations/20260626000001_freemium_moderation.sql` | Create | 280L | ✅ Done |
| `supabase/functions/freemium-auto-filter/index.ts` | Create | 120L | ✅ Done |
| `supabase/functions/city-fetch-reports/index.ts` | Create | 140L | ✅ Done |

---

## 🚀 NEXT STEPS (FOR YOU)

1. **Deploy to Vercel :**
   ```bash
   git add .
   git commit -m "Session 38: Tarification finale + freemium moderation"
   git push origin main
   ```

2. **Run database migration :**
   ```bash
   supabase migration up
   ```

3. **Deploy Edge Functions :**
   ```bash
   supabase functions deploy freemium-auto-filter
   supabase functions deploy city-fetch-reports
   ```

4. **Test locally :**
   - Visit `http://localhost:3000/pricing`
   - Try creating reports with spam content
   - Verify auto-filter + moderation queue
   - Test city admin subscription flow

5. **Send feedback :**
   - Any UI changes you want?
   - Moderation thresholds too strict/loose?
   - Tier names resonate?
   - Pricing looks good?

---

## 🎨 OPTIONAL CUSTOMIZATIONS (Post-Launch)

- **Auto-filter tuning :** Adjust spam patterns in `freemium-auto-filter`
- **Tier descriptions :** Update feature lists based on real customer feedback
- **SLA messaging :** Add SLA badges to Bastide/Cité/Métropole tiers
- **Freemium banner :** Add "App works without subscription" banner on homepage

---

## 📞 CONTEXT FOR DEV INTEGRATION

- **Tarification dates :** All pricing effective immediately on deploy
- **Pioneer discount :** -2 months free for all Y1 signups (no conditions)
- **EPCI model :** Aggregation + progressive reductions (already in calculator)
- **Freemium moderation :** Hybrid (auto + super-admin + citizen reporting)

---

**Ready to test together ? 🧪**

All code is in place. Just need your validation on:
1. UI/UX esthetics
2. Moderation flow (feels right?)
3. Pricing positioning (names resonate?)
4. Any practical tweaks for launch

Then we scale to 10 test communes + 2 EPCI pilots (S37 Week 2).

---

**Generated :** 26 juin 2026, Claude (Session 38)  
**Time spent :** ~2h (research + integration + Edge Functions)
