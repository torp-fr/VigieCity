# Onboarding Refactor — Complete Audit & Implementation Plan

**Date:** 2026-06-29  
**Status:** ✅ Audit Complete, Ready for Development  
**Total Documentation:** 5 files, 2000+ lines

---

## Overview

This package contains a **complete audit and detailed implementation plan** for refactoring VigieCity's onboarding flow to support EPCI (intercommunality) batch onboarding with payment tracking.

### What's Included

1. **ONBOARDING_REFACTOR_PLAN.md** — The main document (400+ lines)
   - Current state audit (steps, data, limitations)
   - Schema gaps & migrations needed
   - Complete 5-phase implementation plan
   - Risk assessment & mitigation
   - 3-week timeline with daily tasks
   - 40+ checklist items

2. **ONBOARDING_QUICK_REFERENCE.md** — Executive summary (2 pages)
   - Before/after comparison
   - Phase summary
   - File changes summary
   - Key decisions & rationale
   - Testing checklist
   - Quick lookup tables

3. **SCHEMA_MIGRATIONS.sql** — Production-ready SQL
   - Migration 1: Payment fields (payment_date, payment_type, payment_validated)
   - Migration 2: RLS policies for epci_admin
   - Optional Migration 3: Onboarding pipeline tracking table
   - Verification queries
   - Rollback procedures
   - Example queries

4. **ONBOARDING_TYPES.ts** — TypeScript definitions
   - Create-ready file for `src/lib/onboarding-types.ts`
   - 50+ exported types & interfaces
   - Validation utilities
   - Constants & helpers
   - Ready to import in `onboarding.tsx`

5. **README.md** — This file
   - Navigation guide
   - File organization
   - Quick start checklist

---

## Quick Navigation

### For Project Managers
**Start here:** ONBOARDING_QUICK_REFERENCE.md
- 3-week timeline with effort estimate (80–100 hours)
- Success criteria
- Risk overview
- Deployment checklist

### For Developers
**Start here:** ONBOARDING_REFACTOR_PLAN.md → Part 3 (Implementation Plan)
- Detailed task breakdown by phase
- Code snippets & examples
- RLS changes required
- Testing scenarios

**For Schema Changes:**
- SCHEMA_MIGRATIONS.sql (copy-paste into Supabase)
- Also see Part 2 of main plan for context

**For Types & Interfaces:**
- ONBOARDING_TYPES.ts (create in `src/lib/`)
- Ready to import: `import { type SelectedTerritory, type PaymentDetails } from "@/lib/onboarding-types"`

### For Architects
**Start here:** ONBOARDING_REFACTOR_PLAN.md → Parts 4–5
- RLS & security review
- File structure changes
- Edge Function API contracts
- Backward compatibility analysis

---

## Current State Summary

**File:** `/delivery/src/routes/platform/onboarding.tsx` (459 lines)

| Aspect | Current |
|--------|---------|
| **Steps** | 4 (Commune → Admin → Plan → Confirmation) |
| **Territories** | Single commune only |
| **Admins** | 1 per commune |
| **Payment Tracking** | None |
| **EPCI Support** | None |
| **Form Persistence** | None |

**Key Issue:** No support for EPCI (intercommunality) contracts requiring batch commune + admin creation with payment details.

---

## Target State Summary

| Aspect | Target |
|--------|--------|
| **Steps** | 5 (Territory → Admin → Details → Payment → Confirmation) |
| **Territories** | Commune OR EPCI |
| **Admins** | 1 (commune) or N (EPCI batch) |
| **Payment Tracking** | date, type, validated flag |
| **EPCI Support** | ✅ Full (select EPCI → edit commune admins → batch create) |
| **Form Persistence** | ✅ Optional localStorage draft + resume |

---

## Schema Changes Overview

### New Fields on commune_licenses
```sql
ALTER TABLE commune_licenses ADD COLUMN (
  payment_date DATE,                 -- When paid
  payment_type VARCHAR(50),          -- chorus_pro | transfer | quote_pending
  payment_validated BOOLEAN          -- Admin confirmed
);
```

**Impact:** +3 nullable columns, no breaking changes

### New RLS Policies
- epci_admin can SELECT communes in their EPCI
- epci_admin can INSERT licenses for their communes
- epci_admin can UPDATE payment fields

**Impact:** Enables EPCI admin self-service in Step 3–4

### Optional: Audit Table
- `onboarding_pipeline` table for multi-step state persistence
- Allows users to resume incomplete sessions
- Full audit trail of all onboarding actions

---

## Implementation Phases (3 weeks, 80–100 hours)

### Week 1: Schema + UI (Step 1–3)
- Day 1: Migrations (payment fields, RLS)
- Days 2–3: Step 1 territory selector + commune search
- Days 4–5: Step 2 admin form + Step 3 conditional (plan vs. commune admin table)

### Week 2: Edge Functions + Steps 4–5 (3 days)
- Days 1–2: create-commune-batch EF + testing
- Days 3–4: Step 4 payment details + Step 5 confirmation
- Day 5: Unified form submission + integration

### Week 3: RLS + Testing + Deployment (3 days)
- Day 1: RLS migration + verification
- Days 2–3: End-to-end testing (both paths, RLS, edge cases)
- Days 4–5: Staging → Production

---

## Files to Create/Modify

### Create (New)
- `migrations/20260701000001_*.sql` — Payment fields
- `migrations/20260701000002_*.sql` — RLS policies
- `functions/create-commune-batch/index.ts` — Batch admin creation EF
- `lib/onboarding-types.ts` — Type definitions
- `components/CommuneAdminDetailTable.tsx` — Commune admin table sub-component

### Modify (Existing)
- `routes/platform/onboarding.tsx` — Main refactor (🔴 Very High complexity)
- `functions/create-commune/index.ts` — Add optional plan parameter (minor)
- `integrations/supabase/types.ts` — Auto-regenerate after migrations

---

## Key Decisions & Rationale

### 1. Five Steps (Not Four)
**Why?** Payment tracking is critical audit requirement, deserves dedicated step.

### 2. Single Territory Selection
**Why?** Either commune OR EPCI, not multi-select. Clearer UX, matches billing model (one contract per flow).

### 3. Conditional Step 3
**Why?** Different data per path: plan for commune, commune admin table for EPCI.

### 4. Batch "Best Effort" (Not All-or-Nothing)
**Why?** Some communes may have duplicate emails; shouldn't block others. Return detailed per-commune results.

### 5. Optional Form Persistence
**Why?** Nice-to-have, not MVP. Use localStorage to save draft, resume on reload.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Batch EF fails midway | 🟠 Medium | Return detailed results, allow retry |
| RLS blocks epci_admin | 🔴 High | Test RLS thoroughly before deploy |
| Email duplicate in batch | 🟢 Low | EF catches, skips, returns error |
| Password in localStorage | 🔴 CRITICAL | Never save password, exclude from draft |
| Search slow (35k communes) | 🟠 Medium | Debounce + fulltext index (already present) |
| Future payment date | 🟢 Low | Client + server validation |

**Mitigation Strategy:** Test RLS early, use Service Role Key for batch EF, implement validation client + server.

---

## Testing Checklist

### Commune Path (Single)
- [ ] Search communes by name/code/region
- [ ] Create single commune + admin
- [ ] Plan selection required
- [ ] Payment info captured
- [ ] Confirmation shows single result

### EPCI Path (Batch)
- [ ] Select EPCI from dropdown
- [ ] All communes auto-listed in Step 3
- [ ] Edit email/name for each commune
- [ ] All communes required email before Next
- [ ] Payment info captured
- [ ] Batch create all admins in parallel
- [ ] Failed communes show error, allow retry

### Cross-Cutting
- [ ] RLS: epci_admin can't create for wrong EPCI
- [ ] localStorage: Draft saves on every change
- [ ] Reload page: Form resumes from draft
- [ ] Duplicate email: Batch continues, returns error reason
- [ ] Future date: Validation error at Step 4

---

## Success Criteria

✅ **Must Have:**
- Backward compatible (commune path unchanged)
- EPCI path creates all communes + admins
- Payment fields stored correctly
- RLS enforced properly
- No critical bugs in staging

✅ **Should Have:**
- localStorage draft persistence
- Performance: batch create 100 communes in <30s

❌ **Out of Scope (Future):**
- Admin invitation flow (send link instead of password)
- CSV bulk import
- Stripe integration
- Full audit log table

---

## Deployment Checklist

**Pre-Staging:**
- [ ] Migrations created & tested locally
- [ ] Edge Functions deployed & tested with curl
- [ ] types.ts regenerated & committed
- [ ] PR reviewed & approved

**Staging:**
- [ ] Migrations applied to staging DB
- [ ] Manual testing: both paths
- [ ] RLS enforcement verified
- [ ] Performance benchmarks OK
- [ ] QA sign-off

**Production:**
- [ ] Monitoring & alerts configured
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Deploy during low-traffic window
- [ ] Post-deploy monitoring for 24 hours

**Rollback (If Needed):**
- Reverse migrations (see SCHEMA_MIGRATIONS.sql)
- Revert code to previous commit
- Restore DB from backup (if necessary)

---

## How to Use These Documents

### 1. **Initial Review** (30 minutes)
- Read ONBOARDING_QUICK_REFERENCE.md
- Share with team for sign-off

### 2. **Detailed Planning** (1–2 hours)
- Read ONBOARDING_REFACTOR_PLAN.md Part 1–3
- Update timeline based on team capacity
- Assign tasks & create Jira tickets

### 3. **Development Kickoff** (Day 1)
- Create feature branch: `feat/onboarding-refactor`
- Apply SCHEMA_MIGRATIONS.sql to local DB
- Create `lib/onboarding-types.ts` with ONBOARDING_TYPES.ts
- Start Week 1 Phase 1 tasks

### 4. **Implementation** (Weeks 1–3)
- Reference ONBOARDING_REFACTOR_PLAN.md daily
- Use ONBOARDING_TYPES.ts for type imports
- Follow testing checklist
- Update documentation as you go

### 5. **Pre-Deployment** (Day 21)
- Run all tests
- Get code review
- Prepare rollback plan
- Schedule staging → production window

---

## File Organization in Repo

```
_delivery/
├── src/
│   ├── routes/platform/
│   │   └── onboarding.tsx              ← MAIN REFACTOR
│   ├── components/
│   │   └── CommuneAdminDetailTable.tsx ← CREATE NEW
│   └── lib/
│       └── onboarding-types.ts         ← CREATE NEW (use ONBOARDING_TYPES.ts)
├── supabase/
│   ├── migrations/
│   │   ├── 20260701000001_*.sql        ← CREATE NEW
│   │   └── 20260701000002_*.sql        ← CREATE NEW
│   └── functions/
│       └── create-commune-batch/
│           └── index.ts                ← CREATE NEW
└── docs/
    ├── ONBOARDING_REFACTOR_PLAN.md     ← This project (saved here)
    ├── ONBOARDING_QUICK_REFERENCE.md   ← This project (saved here)
    ├── SCHEMA_MIGRATIONS.sql           ← This project (saved here)
    └── ONBOARDING_TYPES.ts             ← This project (saved here)
```

---

## Frequently Asked Questions

### Q: Will this break existing onboarding?
**A:** No, the commune path is backward compatible. Both new & old flows coexist.

### Q: How long will this take?
**A:** 3 weeks, 80–100 dev-hours for a single developer. Can parallelize (2 devs = 2 weeks).

### Q: What about admin passwords? Are they safe?
**A:** Never store in localStorage. Only save territory, email, payment info in draft. Passwords must be re-entered after reload.

### Q: Can we deploy incrementally?
**A:** Yes. Deploy schema + RLS first (non-breaking). Then deploy UI changes. Rollback via reverse migrations if needed.

### Q: What if EPCI has 100+ communes?
**A:** Step 3 should use pagination (20 per page) or virtual scrolling. Batch create uses parallel 10-at-a-time to avoid overwhelming the DB.

### Q: What about payment validation?
**A:** Admin confirms via checkbox in Step 4. Future: integrate Stripe webhook or Chorus Pro API to auto-validate.

---

## Support & Questions

- **For schema questions:** See SCHEMA_MIGRATIONS.sql examples section
- **For type questions:** See ONBOARDING_TYPES.ts comments
- **For implementation questions:** See ONBOARDING_REFACTOR_PLAN.md Part 3
- **For timeline/estimation questions:** See ONBOARDING_QUICK_REFERENCE.md Timeline section
- **For RLS issues:** See ONBOARDING_REFACTOR_PLAN.md Part 5 (Troubleshooting)

---

## Summary

This package provides **everything needed to plan, build, test, and deploy** the onboarding refactor:

- ✅ Complete audit of current state
- ✅ Detailed schema migrations
- ✅ TypeScript types (ready to use)
- ✅ Phase-by-phase implementation plan
- ✅ Risk assessment & mitigation
- ✅ Testing scenarios
- ✅ Deployment checklist

**Ready to start?** Begin with ONBOARDING_QUICK_REFERENCE.md, then dive into ONBOARDING_REFACTOR_PLAN.md Part 3 for detailed tasks.

---

**Generated:** 2026-06-29  
**Status:** ✅ Complete & Ready  
**Questions?** Refer to the main plan or troubleshooting section
