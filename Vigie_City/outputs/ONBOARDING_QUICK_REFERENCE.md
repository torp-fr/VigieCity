# Onboarding Refactor — Quick Reference

**TL;DR:** Refactor 4-step commune-only flow into 5-step flow supporting EPCI batch onboarding with payment tracking.

---

## Current State (in 30 seconds)

| Aspect | Current |
|--------|---------|
| **Steps** | 4: Commune → Admin → Plan → Confirmation |
| **Territories** | Single commune only |
| **Admins Created** | 1 per commune (via create-commune EF) |
| **Payment Tracking** | None (no fields) |
| **EPCI Support** | None |
| **Form Persistence** | None (React state only) |

---

## Target State (in 30 seconds)

| Aspect | Target |
|--------|--------|
| **Steps** | 5: Territory → Admin → Details → Payment → Confirmation |
| **Territories** | Commune OR EPCI (multi-commune) |
| **Admins Created** | 1 (commune) or N (EPCI batch via new EF) |
| **Payment Tracking** | date, type (chorus_pro/transfer/quote), validated flag |
| **EPCI Support** | Full: select EPCI → table of commune admins → batch create |
| **Form Persistence** | Optional localStorage draft + resume |

---

## Implementation at a Glance

### Phase 1: Schema (2 days)
1. Add 3 columns to commune_licenses: `payment_date`, `payment_type`, `payment_validated`
2. Add RLS policies for epci_admin on commune_licenses
3. Regenerate types.ts

### Phase 2: UI (5 days)
1. **Step 1:** Territory selector (commune OR EPCI) + search
2. **Step 2:** Admin form (reuse current)
3. **Step 3:** Plan (commune) OR Commune Admin Table (EPCI)
4. **Step 4:** Payment details (date, type, validated checkbox)
5. **Step 5:** Confirmation + batch results

### Phase 3: Edge Functions (2 days)
1. Create `create-commune-batch` EF (bulk admin creation)
2. Update `create-commune` EF (optional plan parameter)

### Phase 4: Integration (3 days)
1. Refactor handleCreate() for unified flow
2. Connect to Edge Functions
3. Add error handling + toast notifications
4. Optional: localStorage draft saving

### Phase 5: RLS & Testing (5 days)
1. Deploy RLS migration
2. Manual testing (both paths, RLS enforcement, edge cases)
3. Performance testing (batch create, search)
4. Staging → Production

---

## File Changes Summary

### Create (New Files)

| File | Purpose | Complexity |
|------|---------|-----------|
| `migrations/20260701000001_*.sql` | Payment fields | Medium |
| `migrations/20260701000002_*.sql` | EPCI RLS policies | Medium |
| `functions/create-commune-batch/index.ts` | Batch admin creation | High |
| `lib/onboarding-types.ts` | Type definitions | Low |
| `components/CommuneAdminDetailTable.tsx` | Commune admin table | High |

### Modify (Existing Files)

| File | Changes | Complexity |
|------|---------|-----------|
| `routes/platform/onboarding.tsx` | Refactor to 5 steps | **Very High** (main work) |
| `functions/create-commune/index.ts` | Add optional plan param | Low |
| `integrations/supabase/types.ts` | Auto-regenerate | Auto |

---

## Key Decisions

### Step 1: Single Selection (radio buttons, not multi-select)
- Either **Commune** (search + select one)
- OR **EPCI** (dropdown, auto-lists communes)
- Rationale: Clearer UX, matches billing model (one contract per flow)

### Step 3: Conditional Content
- Commune path: Show plan selector (trial/starter/pro/enterprise)
- EPCI path: Show editable table of commune admins (email, name per commune)
- Rationale: Different data needs per territory type

### Step 4: Payment Info Separate
- Not mixed into Step 3, has own dedicated step
- Captures date, type, validation flag (admin confirms receipt)
- Rationale: Payment is critical audit requirement, deserves visibility

### Step 5: Batch Results Display
- EPCI path shows per-commune creation status (success/error)
- Allows user to see which admins created vs. which failed
- Retry logic for failed communes (future enhancement)
- Rationale: Transparency + debugging aid

### Edge Function Behavior
- `create-commune-batch` uses "best effort" (partial success OK)
- Returns detailed per-commune results, not all-or-nothing
- Rationale: Some communes may have duplicate emails, shouldn't block others

---

## RLS Changes Required

**Current Gap:** epci_admin cannot create/update commune_licenses

**Fix:** Add 2 policies to commune_licenses table:
1. **INSERT:** Allow epci_admin to create license for communes in their EPCI
2. **UPDATE:** Allow epci_admin to modify payment fields on their communes

**Impact:** None on existing commune/admin paths (backward compatible)

---

## Testing Scenarios (Quick Checklist)

### Commune Path (Single)
- [ ] Search by name/code/region
- [ ] Create single commune + admin
- [ ] Step 3 plan selection works
- [ ] Payment info captured
- [ ] Confirmation shows single result

### EPCI Path (Batch)
- [ ] Select EPCI from dropdown
- [ ] All communes listed in Step 3 table
- [ ] Edit email/name for each commune
- [ ] Payment info captured
- [ ] Batch create all admins in parallel
- [ ] Confirmation shows batch results (✅/❌ per commune)

### Edge Cases
- [ ] Duplicate email in batch → skip, continue
- [ ] Future payment date → validation error
- [ ] No plan selected → error at Step 3
- [ ] localStorage draft saves on every change
- [ ] Reload page → form resumes from draft
- [ ] RLS: epci_admin can't create for wrong EPCI

---

## Performance Targets

| Operation | Target | Method |
|-----------|--------|--------|
| Commune search (35k communes) | <500ms | Client debounce (300ms) + search_communes() PL/pgsql |
| EPCI list load | <1s | useQuery cache, lazy load |
| Batch create 100 communes | <30s | Parallel 10-at-a-time, queue management |
| Step 3 table render (100 communes) | <2s | Pagination (20 per page) or virtual scroll |

---

## Risk Checklist

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Batch EF fails midway | 🟠 Medium | Return detailed results, allow user retry |
| RLS blocks epci_admin | 🔴 High | Test thoroughly before deploy, explicit policies |
| Email duplicate in batch | 🟢 Low | EF catches & skips, returns error reason |
| Password exposed in localStorage | 🔴 High | **Never** save password, exclude from draft JSON |
| Search slow (35k communes) | 🟠 Medium | Debounce + fulltext index (already in DB) |
| Future payment date accepted | 🟢 Low | Client + server validation |

---

## Edge Function APIs

### create-commune (updated)
```
POST /functions/v1/create-commune
Body: { collectivityId, adminEmail, adminName, adminPassword, plan? }
Returns: { success, userId, email } or { error }
```

### create-commune-batch (new)
```
POST /functions/v1/create-commune-batch
Body: {
  epciId,
  createdByUserId,
  communes: [{ collectivityId, adminEmail, adminName, adminPassword }, ...]
}
Returns: {
  success,
  results: [{ collectivityId, adminEmail, userId?, error? }, ...],
  summary: { total, succeeded, failed }
}
```

---

## Timeline (3 weeks)

- **Week 1:** Schema migrations + Step 1–3 UI
- **Week 2:** Edge Functions + Steps 4–5 UI + integration
- **Week 3:** RLS + testing + deployment

**Effort:** ~80–100 dev-hours

---

## Success Criteria

- ✅ Backward compatible (commune path unchanged)
- ✅ EPCI batch path works (all communes + admins created)
- ✅ Payment fields stored correctly
- ✅ RLS enforced (epci_admin scoped properly)
- ✅ No critical bugs in staging
- ✅ All 40+ checklist items done

---

## Deployment Checklist

Before production:
- [ ] Migrations applied to staging ✓
- [ ] types.ts regenerated ✓
- [ ] Edge Functions deployed ✓
- [ ] Manual testing pass (both paths) ✓
- [ ] RLS tests pass ✓
- [ ] Performance benchmarks OK ✓
- [ ] PR reviewed & approved ✓
- [ ] Rollback plan documented ✓
- [ ] Monitoring/alerts configured ✓

---

## Known Unknowns

1. **Admin Invitation Flow:** Should we send invite link instead of password? (Future)
2. **CSV Bulk Import:** For 100+ communes, manual table too slow? (Future)
3. **Auto-payment Integration:** Stripe webhook to mark payment_validated? (Future)
4. **Audit Log Table:** Full onboarding audit trail? (Out of scope)

---

## References

- Main plan: `ONBOARDING_REFACTOR_PLAN.md` (detailed, 400+ lines)
- Code locations: Part 5 of main plan
- RLS setup: `/delivery/supabase/migrations/20260620000007_intercommunalities_epci.sql`
- Current onboarding: `/delivery/src/routes/platform/onboarding.tsx` (459 lines)
- EPCI examples: `/delivery/src/routes/platform/epci-tarification.tsx`, `/delivery/src/routes/admin/epci.tsx`

---

**Generated:** 2026-06-29
**Status:** Ready for kickoff
