# EPCI Onboarding - Pre-Launch Verification Checklist

**Project**: VigieCity  
**Date**: 2026-07-01  
**Status**: Ready for verification  

---

## 1. DATABASE LAYER

### Migrations
- [ ] File: `supabase/migrations/20260701000001_add_payment_fields.sql` exists
  - [ ] Contains: payment_date column
  - [ ] Contains: payment_type column
  - [ ] Contains: payment_validated column
  - [ ] Contains: payment_validated_by column
  - [ ] Contains: 3 indexes (payment_date, payment_type, payment_validated)
  
- [ ] File: `supabase/migrations/20260701000002_add_epci_admin_rls.sql` exists
  - [ ] Contains: ALTER TABLE commune_licenses ENABLE ROW LEVEL SECURITY
  - [ ] Contains: 5 CREATE POLICY statements
  - [ ] Contains: epci_admin_can_create_licenses policy
  - [ ] Contains: epci_admin_can_read_licenses policy
  - [ ] Contains: epci_admin_can_update_licenses policy
  - [ ] Contains: epci_admin_can_delete_licenses policy
  - [ ] Contains: service_role_full_access policy

### Verification Commands
Run in Supabase dashboard → SQL Editor:

```sql
-- Verify payment fields exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'commune_licenses' 
AND column_name IN ('payment_date', 'payment_type', 'payment_validated', 'payment_validated_by');

-- Verify indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'commune_licenses' 
AND indexname LIKE 'idx_commune_licenses_payment%';

-- Verify RLS is enabled
SELECT tablename FROM pg_tables 
WHERE schemaname='public' AND tablename='commune_licenses' 
AND rowsecurity=true;
```

---

## 2. EDGE FUNCTION LAYER

### create-commune-batch
- [ ] File: `supabase/functions/create-commune-batch/index.ts` exists
  - [ ] Size: ~590 lines
  - [ ] Contains: async function createCommuneBatch
  - [ ] Contains: EPCI validation
  - [ ] Contains: EPCI admin creation
  - [ ] Contains: Per-commune admin creation loop
  - [ ] Contains: License creation for each commune
  - [ ] Contains: Error handling with best-effort batch processing
  - [ ] Contains: Email send integration

- [ ] File: `supabase/functions/create-commune-batch/types.ts` exists
  - [ ] Contains: CommuneInput interface
  - [ ] Contains: BatchRequest interface
  - [ ] Contains: BatchResponse interface
  - [ ] Contains: FailedCommune interface

### Verification
Run in terminal:
```bash
# List deployed functions
supabase functions list --linked

# Should include: create-commune-batch (status: active)
```

---

## 3. FRONTEND LAYER

### Routes
- [ ] File: `src/routes/onboarding.tsx` exists
  - [ ] Contains: export const Route = createFileRoute
  - [ ] Contains: Component for public onboarding page

- [ ] File: `src/routes/platform/onboarding.tsx` exists
  - [ ] Contains: 5-step workflow (Step = 1 | 2 | 3 | 4 | 5)
  - [ ] Contains: TerritorySelector import
  - [ ] Contains: AdminContactForm import
  - [ ] Contains: PlanSelector import
  - [ ] Contains: CommuneAdminTable import
  - [ ] Contains: PaymentDetails import
  - [ ] Contains: ConfirmationStep import
  - [ ] Contains: createSingleCommune function
  - [ ] Contains: createEPCIBatch function
  - [ ] Contains: handleSubmit function
  - [ ] Contains: Step indicator UI
  - [ ] Contains: Navigation buttons (Back/Next)

### Components (all in `src/components/onboarding/`)
- [ ] `TerritorySelector.tsx`
  - [ ] Loads intercommunalities from Supabase
  - [ ] Searches communes via RPC
  - [ ] Returns Territory object with type, ids, names

- [ ] `AdminContactForm.tsx`
  - [ ] Email validation field
  - [ ] Name field
  - [ ] Phone field (optional)
  - [ ] Password field with requirements checklist
  - [ ] Real-time validation feedback

- [ ] `PlanSelector.tsx`
  - [ ] 4 radio buttons (Hameau, Village, Bourg, Métropole)
  - [ ] Pricing display for each
  - [ ] Selection logic

- [ ] `CommuneAdminTable.tsx`
  - [ ] Loads communes for EPCI
  - [ ] Columns: Commune, Admin Email, Admin Name, Admin Phone, Remove
  - [ ] Add row button
  - [ ] Remove row functionality
  - [ ] Email deduplication validation

- [ ] `PaymentDetails.tsx`
  - [ ] Date picker (defaults to today)
  - [ ] Payment type dropdown (Chorus Pro / Virement / Devis)
  - [ ] Validation checkbox
  - [ ] Amount display

- [ ] `ConfirmationStep.tsx`
  - [ ] Summary display (before submit)
  - [ ] Loading state with spinner
  - [ ] Results display (after submit)
  - [ ] Error display with retry
  - [ ] Copy-to-clipboard for IDs

### Utilities
- [ ] File: `src/lib/onboarding-utils.ts` exists
  - [ ] Contains: Territory type
  - [ ] Contains: AdminContact interface
  - [ ] Contains: CommuneAdmin interface
  - [ ] Contains: PaymentInfo interface
  - [ ] Contains: OnboardingFormData interface
  - [ ] Contains: validateEmail function
  - [ ] Contains: validatePassword function (with requirements)
  - [ ] Contains: validateInseeCode function
  - [ ] Contains: validatePhoneNumber function
  - [ ] Contains: formatTerritoryDisplay function
  - [ ] Contains: initializeFormData function
  - [ ] Contains: All validateStep functions
  - [ ] Contains: PLAN_INFO constant (4 plans)

---

## 4. TYPESCRIPT COMPILATION

Run in terminal:
```bash
cd C:\Users\Baptiste-\VigieCity\Vigie_City
npm run build
```

Expected output:
- [ ] No TypeScript errors (0 errors)
- [ ] All imports resolve correctly
- [ ] Build completes successfully
- [ ] Output: dist/ folder created

Verify specific imports:
```bash
# Check component imports
grep -r "from \"@/components/onboarding" src/

# Check utility imports
grep -r "from \"@/lib/onboarding-utils" src/

# Check Supabase imports
grep -r "from \"@/integrations/supabase" src/
```

---

## 5. COMPONENT INTEGRATION

### Import Verification
- [ ] onboarding.tsx imports TerritorySelector
- [ ] onboarding.tsx imports AdminContactForm
- [ ] onboarding.tsx imports PlanSelector
- [ ] onboarding.tsx imports CommuneAdminTable
- [ ] onboarding.tsx imports PaymentDetails
- [ ] onboarding.tsx imports ConfirmationStep
- [ ] onboarding.tsx imports onboarding-utils

### Component Props
- [ ] TerritorySelector: value, onChange, disabled
- [ ] AdminContactForm: value, onChange, title, subtitle, disabled, showPassword
- [ ] PlanSelector: value, onChange
- [ ] CommuneAdminTable: epciId, value, onChange
- [ ] PaymentDetails: value, onChange, communeName
- [ ] ConfirmationStep: formData, result, loading, error, onRetry

### State Management
- [ ] Single formData state in main route
- [ ] formData updated via setFormData({ ...formData, field: newValue })
- [ ] State preserved across step navigation
- [ ] formData type: OnboardingFormData

---

## 6. VALIDATION FLOWS

### Step 1: Territory Selection
- [ ] Can proceed to Step 2 only after selecting territory
- [ ] Territory must have type and corresponding IDs (communeId OR epciId)
- [ ] validateStep1Territory checks isValid

### Step 2: Admin Contact
- [ ] Email must be valid (RFC 5322)
- [ ] Name must be non-empty
- [ ] Password must meet requirements (8+ chars, uppercase, digit, special)
- [ ] validateStep2Admin checks isValid

### Step 3: Configuration
**Commune Path**:
- [ ] Must select a plan (hameau, village, bourg, or metropole)
- [ ] validateStep3CommePlan checks isValid

**EPCI Path**:
- [ ] Must have at least 1 commune admin
- [ ] Each admin must have: inseeCode, communeName, email, name
- [ ] Email must be unique in table
- [ ] validateStep3CommuneAdmins checks isValid

### Step 4: Payment
- [ ] Date must be selected
- [ ] Payment type must be one of 3 options
- [ ] Validation checkbox must be checked
- [ ] validatePaymentInfo checks isValid

### Step 5: Confirmation
- [ ] Before submit: Shows form summary
- [ ] Calls correct edge function (create-commune or create-commune-batch)
- [ ] After submit: Displays results or error

---

## 7. DATA FLOW VERIFICATION

### Commune Path Flow
```
Step 1: Territory {type: "commune", communeId, communeName, inseeCode}
Step 2: Admin {email, name, password}
Step 3: Plan "hameau"|"village"|"bourg"|"metropole"
Step 4: Payment {date, type, validated}
Step 5: Submit to create-commune EF
      → Response: {user_id, license_id}
      → Display success
```

- [ ] All steps contribute to formData correctly
- [ ] create-commune called with correct payload
- [ ] Response displayed in ConfirmationStep

### EPCI Path Flow
```
Step 1: Territory {type: "epci", epciId, epciName, communeCount}
Step 2: Admin {email, name, password}
Step 3: Admins [{inseeCode, communeName, email, name, phone}, ...]
Step 4: Payment {date, type, validated}
Step 5: Submit to create-commune-batch EF
      → Response: {epci_user_id, communes_created, details}
      → Display results with counts
```

- [ ] All steps contribute to formData correctly
- [ ] Communes array formatted correctly for API
- [ ] create-commune-batch called with correct payload
- [ ] Response displayed with counts and failed communes

---

## 8. ERROR HANDLING

### Edge Function Errors
- [ ] Missing required fields → 400 with error message
- [ ] Invalid EPCI ID → 500 with error message
- [ ] Email already exists → Continues (reuses user)
- [ ] Duplicate email in batch → Skipped with error recorded
- [ ] Invalid INSEE code → Skipped with error recorded
- [ ] Commune not in EPCI → Skipped with error recorded

### Frontend Error Handling
- [ ] onError callback catches errors
- [ ] Error toast shown to user
- [ ] Error state displayed in ConfirmationStep
- [ ] Retry button available on error
- [ ] Back navigation possible from any step

---

## 9. USER EXPERIENCE

### Navigation
- [ ] Previous button available on Steps 2-5
- [ ] Next button disabled until step valid
- [ ] Step indicator shows current progress
- [ ] Completed steps show checkmarks
- [ ] Current step highlighted in blue

### Feedback
- [ ] Real-time password validation checklist
- [ ] Email validation on blur
- [ ] Table row deletion with confirmation
- [ ] Loading spinner during submit
- [ ] Success/error toasts appear
- [ ] Results show created IDs

### Accessibility
- [ ] Form labels present for all inputs
- [ ] Error messages associated with fields
- [ ] Keyboard navigation supported
- [ ] Color not sole indicator of status

---

## 10. DATABASE VERIFICATION (Post-Deployment)

After deploying, verify data in Supabase SQL Editor:

```sql
-- Check new licenses
SELECT id, payment_date, payment_type, payment_validated
FROM commune_licenses
ORDER BY created_at DESC
LIMIT 5;

-- Check new admin roles
SELECT user_id, role, collectivity_id, epci_id
FROM user_roles
WHERE role IN ('admin', 'admin_epci')
ORDER BY created_at DESC
LIMIT 10;

-- Check auth users
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

---

## 11. PERFORMANCE CHECKS

- [ ] Page load time < 3 seconds
- [ ] Form response < 1 second per keystroke
- [ ] Table rendering smooth for 100+ communes
- [ ] Batch creation takes < 10 seconds for 20 communes
- [ ] No memory leaks on repeated form submissions

---

## 12. SECURITY CHECKS

- [ ] Password never logged (use console.warn only)
- [ ] Password hashing done on backend (edge function)
- [ ] RLS policies prevent unauthorized access
- [ ] Service role key used only in edge function
- [ ] Public route only accessible to authenticated users
- [ ] CORS headers allow only vigiecity.fr domain
- [ ] No sensitive data in response (except IDs)

---

## 13. DEPLOYMENT READINESS

### Files Check
- [ ] All 13 files deployed to correct locations
- [ ] No duplicate files in _delivery
- [ ] No missing imports
- [ ] All paths use @/ alias

### Migrations Check
- [ ] Migrations exist in supabase/migrations/
- [ ] Naming follows pattern: 202607010000XX_description.sql
- [ ] Numbered sequentially after existing migrations

### Edge Function Check
- [ ] Function exists in supabase/functions/create-commune-batch/
- [ ] Has deno.json (if needed)
- [ ] Has index.ts and types.ts

### Frontend Check
- [ ] No console errors on /platform/onboarding load
- [ ] All components render
- [ ] No unresolved imports
- [ ] CSS/Tailwind classes applied correctly

---

## 14. GO/NO-GO CHECKLIST

### Must Pass Before Deployment
- [ ] TypeScript compilation: 0 errors
- [ ] All 13 files deployed to correct paths
- [ ] Migrations contain all required changes
- [ ] Edge function has proper error handling
- [ ] Frontend route loads without errors
- [ ] Form validation works for all steps
- [ ] Both commune and EPCI paths complete
- [ ] Edge functions return expected responses
- [ ] Database inserts work correctly

### Nice to Have (Can Deploy Without)
- [ ] Unit tests written
- [ ] E2E tests passing
- [ ] Lighthouse performance score > 80
- [ ] Analytics instrumented
- [ ] Error monitoring configured

---

## 15. POST-DEPLOYMENT MONITORING

### Immediate (Hour 1)
- [ ] Vercel logs show no errors
- [ ] No 500 errors in edge function
- [ ] Users can load /platform/onboarding
- [ ] Form renders without errors

### Short-term (Day 1)
- [ ] No RLS policy violations
- [ ] Licenses created with payment fields
- [ ] Admin users created in auth.users
- [ ] User roles created correctly
- [ ] Welcome emails sending

### Ongoing (Week 1)
- [ ] Track error rates
- [ ] Monitor edge function latency
- [ ] Check batch creation success rate
- [ ] Review user feedback

---

## Sign-Off

**Developer**: _______________  
**Date**: _______________  
**Status**: ☐ Ready for Staging  ☐ Ready for Production  

**QA Lead**: _______________  
**Date**: _______________  
**Status**: ☐ Approved  ☐ Rejected  

**Product Owner**: _______________  
**Date**: _______________  
**Status**: ☐ Approved for Launch  

---

## Notes

```
[Space for deployment notes, issues found, etc.]




```

---

**End of Checklist**
