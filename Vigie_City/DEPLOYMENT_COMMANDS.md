# 🚀 DEPLOYMENT COMMANDS — Critical Path Implementation

**Target:** Deploy all blockers for operational platform (27 juin - 5 juillet)

---

## FILES CREATED (Session 40)

### Stripe Integration
- `supabase/functions/stripe-create-checkout/index.ts` — Create Stripe checkout session
- `supabase/functions/stripe-webhook/index.ts` — Handle Stripe events
- `supabase/migrations/20260627000001_stripe_integration.sql` — Add subscription columns + invoices table

### City Moderation Dashboard
- `src/routes/platform/city/moderation.tsx` — City admin moderation UI
- `supabase/functions/city-get-reports/index.ts` — Fetch city's reports (RLS-enforced)
- `supabase/functions/city-post-response/index.ts` — City responds to report + sends notification

### Planning
- `CRITICAL_PATH_OPERATIONAL.md` — Full roadmap + success criteria
- `S37W2_FREEMIUM_TEST_PLAN.md` — 6-phase test plan + 10 pilot communes
- `PROMPT_CLAUDE_CODE_UI_DESIGN.txt` — UI/UX design brief for Claude Code

---

## EXECUTION STEPS (In Order)

### STEP 1: Deploy Supabase Migration
```bash
cd C:\Users\Baptiste-\VigieCity

# Apply migration to add Stripe columns + invoices table
supabase migration up

# Verify columns were added
supabase db show
```

**Verify:**
- `municipalities` table now has: subscription_status, subscription_stripe_id, subscription_tier, subscription_expires_at
- `invoices` table created with RLS policies
- No errors in Supabase logs

---

### STEP 2: Deploy Stripe Edge Functions
```bash
# Deploy checkout function
supabase functions deploy stripe-create-checkout

# Deploy webhook function
supabase functions deploy stripe-webhook

# List deployed functions
supabase functions list
```

**Verify:**
- Both functions appear in list
- Endpoints: 
  - `https://xfhkngecpbvmlstjymfy.supabase.co/functions/v1/stripe-create-checkout`
  - `https://xfhkngecpbvmlstjymfy.supabase.co/functions/v1/stripe-webhook`

---

### STEP 3: Deploy City Moderation Functions
```bash
# Deploy city reports fetch
supabase functions deploy city-get-reports

# Deploy city response submission
supabase functions deploy city-post-response

# List all functions
supabase functions list
```

**Verify:**
- 4 new functions deployed (stripe-create-checkout, stripe-webhook, city-get-reports, city-post-response)
- All show in function list

---

### STEP 4: Create Stripe Products & Prices (Manual — Stripe Dashboard)

**Go to:** https://dashboard.stripe.com/products

Create 6 products (one per tier):
- Hameau
- Village
- Bourg
- Bastide
- Cité
- Métropole

For each product, create 2 prices:
- Monthly (e.g., Hameau: $19/month)
- Annual (e.g., Hameau: $190/year)

**Note:** Save the Price IDs and update the `STRIPE_PRICE_IDS` mapping in `stripe-create-checkout/index.ts`

---

### STEP 5: Configure Stripe Webhook

**Go to:** https://dashboard.stripe.com/webhooks

Create webhook endpoint:
- URL: `https://xfhkngecpbvmlstjymfy.supabase.co/functions/v1/stripe-webhook`
- Events: 
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

**Save:** Webhook signing secret → add to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

---

### STEP 6: Deploy React Pages & Update Routes

```bash
# The city moderation page is already created, just ensure it's built
npm run build

# Push to Vercel (or local testing)
vercel deploy --prod
```

**Verify:**
- Page accessible at: `https://app.vigiecity.fr/platform/city/moderation`
- Requires authentication
- Shows reports for city

---

### STEP 7: Set Supabase Environment Variables

In Supabase project settings, add secrets:
- `STRIPE_SECRET_KEY` — Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret
- `STRIPE_PUBLISHABLE_KEY` — Public key (for frontend)
- `RESEND_API_KEY` — Resend email API key

```bash
supabase secrets set STRIPE_SECRET_KEY sk_live_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET whsec_xxxxx
supabase secrets set RESEND_API_KEY re_xxxxx
```

---

## TESTING CHECKLIST

### Test Stripe Flow
- [ ] POST to `/functions/v1/stripe-create-checkout` with municipality_id, tier_index, billing_cycle
- [ ] Receive checkout URL
- [ ] Complete test payment in Stripe Dashboard (use test card: 4242 4242 4242 4242)
- [ ] Verify webhook received and municipality.subscription_status updated to "active"
- [ ] Invoice created in invoices table

### Test City Moderation Flow
- [ ] City admin logs in
- [ ] Navigate to `/platform/city/moderation`
- [ ] See list of own municipality's reports
- [ ] Click report → modal opens
- [ ] Write response → submit
- [ ] Report status changes to "responded"
- [ ] Citizen receives email notification

### Test Auto-Filter + Super-Admin Queue
- [ ] Citizen posts spam report (via web or mobile)
- [ ] Auto-filter score > 0.7 → report hidden
- [ ] Super-admin sees in moderation queue
- [ ] Super-admin approves/rejects
- [ ] Status updates accordingly

---

## DEPLOYMENT ORDER (Timeline)

| Day | Tasks | Status |
|-----|-------|--------|
| **27 (Today)** | Migration + Stripe EFs + City EFs | ⏳ IN PROGRESS |
| **28-29** | Stripe setup (manual) + City UI testing + 10 communes invites | 🔴 PENDING |
| **30-1** | Onboarding calls + live testing | 🔴 PENDING |
| **2-3** | Bug fixes + final integration | 🔴 PENDING |
| **4-5** | Operational verification | 🔴 PENDING |

---

## ROLLBACK PLAN

If something fails:
- Edge Functions: `supabase functions delete <function-name>`
- Migration: Create new migration with `ALTER TABLE ... DROP COLUMN ...`
- Stripe: Disable webhook in dashboard (don't delete)

---

## NEXT PHASE (After Operational)

Once all deployments complete:
1. **E2E Testing** (1 week): Full citizen → report → moderation → response flow
2. **UX Polish** (1 week): Design refinements, error messages, loading states
3. **Launch Prep** (1 week): Marketing materials, sales collateral, support setup
4. **Commercial Launch** (End July): Go-live with 10 pilot communes + broader EPCI outreach

---

**OWNER:** Claude (deployment execution)  
**STATUS:** Ready to execute  
**NEXT ACTION:** Run STEP 1 (migration) → confirm success → proceed to STEP 2

