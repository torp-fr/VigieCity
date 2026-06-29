# Onboarding Refactor - Implementation Notes

## Overview

Complete refactor of the onboarding flow from 4 steps (commune-only) to 5 steps (commune + EPCI support).
All new components are reusable, type-safe, and follow existing design patterns in VigieCity.

## Architecture

### Component Hierarchy

```
src/routes/platform/onboarding.tsx (Main orchestrator, 350L)
├─ Step 1: TerritorySelector.tsx
│   └─ Loads: intercommunalities table + search_communes RPC
├─ Step 2: AdminContactForm.tsx
│   └─ Validates: email, password strength
├─ Step 3: 
│   ├─ Commune path: PlanSelector.tsx
│   └─ EPCI path: CommuneAdminTable.tsx
│       └─ Loads: collectivities filtered by EPCI
├─ Step 4: PaymentDetails.tsx
│   └─ Validates: date, payment type
└─ Step 5: ConfirmationStep.tsx
    └─ Displays: form summary or batch results
    └─ Calls: create-commune (commune) or create-commune-batch (EPCI)

Utilities:
lib/onboarding-utils.ts (500L)
├─ Type definitions (Territory, AdminContact, CommuneAdmin, PaymentInfo, OnboardingFormData)
├─ Validation functions (email, password, INSEE, phone)
├─ Formatting functions (displayNames, paymentType labels)
└─ Constants (PLAN_INFO, step initialization)
```

### State Management

Single `formData` object in main component preserves state across steps:

```typescript
const [formData, setFormData] = useState<OnboardingFormData>({
  territory: null,
  epciAdminContact: {},
  selectedPlan: undefined,
  communeAdmins: [],
  paymentInfo: {},
});

// Updated via: setFormData({ ...formData, field: newValue })
```

**Why not Redux/Zustand?**
- Flow is linear (5 sequential steps)
- State is form-local (not shared globally)
- Small data volume (< 1MB in worst case)
- Simpler dependency tracking

### Validation Strategy

**Gate-Based (Step-by-Step)**
Each step validates before allowing next:

```typescript
function goToStep(nextStep) {
  if (step === 1 && !canProceedToStep2()) {
    toast.error("Veuillez sélectionner un territoire");
    return;
  }
  // ... validate other steps
  setStep(nextStep);
}
```

**Field-Level (Real-Time)**
Input components show validation feedback immediately:
- Password requirements checklist (real-time)
- Email validation (background)
- Duplicate detection in tables (onChange)

**Workflow-Level (Before Submit)**
Final validation before batch operation:

```typescript
async function handleSubmit() {
  if (!canProceedToStep5()) {
    toast.error("Veuillez remplir les informations de paiement");
    return;
  }
  // ... proceed to batch
}
```

## Key Decisions

### 1. Territory Type Determines Flow

**Why separate Commune vs EPCI paths?**
- Different business logic: single admin vs EPCI admin + commune admins
- Different Edge Functions: `create-commune` vs `create-commune-batch`
- Different UI: plan selector vs admin table
- Reduces complexity in main component

**Implementation:**
```typescript
if (formData.territory?.type === "commune") {
  // Step 3: PlanSelector
  // Step 5: Call create-commune EF
} else {
  // Step 3: CommuneAdminTable
  // Step 5: Call create-commune-batch EF
}
```

### 2. EPCI Communes Auto-Populated

**Why load communes automatically in table?**
- Improves UX: users don't have to manually select communes
- Ensures correctness: prevents selecting wrong communes
- Reduces errors: all EPCI communes pre-filled

**Implementation:**
```typescript
// CommuneAdminTable.tsx
useEffect(() => {
  const { data } = await supabase
    .from("collectivities")
    .select("id, name, insee_code")
    .eq("epci_id", epciId);
  // Pre-fill communeAdmins with these communes
}, [epciId]);
```

### 3. Payment Info at Step 4, Not Step 3

**Why separate payment from configuration?**
- UX flow: territory → admin → setup → payment → confirm
- Logical grouping: all payment details together
- Flexibility: could add invoice preview/totaling in future

### 4. Dual API Paths

**Single Commune:**
```typescript
await supabase.functions.invoke("create-commune", {
  body: {
    collectivityId,
    adminEmail,
    adminPassword,
    payment_date,
    payment_type,
    payment_validated,
  }
});
```

**EPCI Batch:**
```typescript
await supabase.functions.invoke("create-commune-batch", {
  body: {
    epci_id,
    admin_email,
    admin_name,
    admin_password,
    communes: [...],
    payment_date,
    payment_type,
    payment_validated,
  }
});
```

**Why two EFs instead of one universal?**
- Existing `create-commune` EF cannot be modified without breaking existing callers
- Batch operation has different logic (parallel creation, partial success handling)
- Future: could merge into single versioned EF

### 5. Form State Persistence

**Why preserve state on back/next?**
- Users expect form data to survive navigation
- Improves UX for complex flows
- No performance penalty (state is small)

**How it works:**
```typescript
// State is held in component, not localStorage
// Survives step changes but cleared on reset
const resetForm = () => {
  setFormData(initializeFormData());
  setStep(1);
};
```

**Limitations:**
- Data lost on page refresh (acceptable: user can restart)
- No cross-session persistence (good: security)

## Component Deep Dives

### TerritorySelector

**Search Logic:**
```typescript
// Tries RPC first (faster, if available)
const { data } = await supabase.rpc("search_communes", { query });

// Falls back to ILIKE query (works in all cases)
const { data } = await supabase
  .from("collectivities")
  .select("...")
  .ilike("name", `%${query}%`);
```

**Why ILIKE fallback?**
- RPC may not be deployed initially
- ILIKE is standard SQL, always available
- Slight performance penalty acceptable for robustness

**Commune Badge:**
```typescript
<span className="badge">{communeCount}</span>
// Shows commune count for EPCI selection
// Helps users make informed choice
```

### AdminContactForm

**Password Strength Checklist:**
```typescript
// Real-time validation feedback
const checks = [
  { label: "8+ chars", valid: pwd.length >= 8 },
  { label: "Uppercase", valid: /[A-Z]/.test(pwd) },
  { label: "Number", valid: /[0-9]/.test(pwd) },
  { label: "Special", valid: /[!@#$%^&*()]/.test(pwd) },
];
```

**Why show requirements inline?**
- Users know exactly what's needed (not cryptic "password weak")
- Real-time feedback (not after click)
- Reduces frustration with password rejects

### CommuneAdminTable

**Dynamic Row Management:**
```typescript
// Add row
const addAdmin = () => onChange([...value, newRow]);

// Remove row (disabled if only 1 commune)
const removeAdmin = (idx) => onChange(value.filter((_, i) => i !== idx));
```

**Validation:**
```typescript
// Check duplicates after each change
const errors = [];
if (new Set(admins.map(a => a.email)).size !== admins.length) {
  errors.push("Email en doublon");
}
```

**Auto-Populate Communes:**
```typescript
// On mount, if no admins yet, create rows from EPCI communes
if (value.length === 0 && epciCommunes.length > 0) {
  onChange(epciCommunes.map(c => ({
    inseeCode: c.insee_code,
    communeName: c.name,
    email: "",
    name: "",
  })));
}
```

### PaymentDetails

**Date Picker Default:**
```typescript
const dateStr = value.date
  ? value.date.toISOString().split("T")[0]
  : new Date().toISOString().split("T")[0];

<input type="date" value={dateStr} />
```

**Why default to today?**
- Most common case (onboarding = today)
- Users can adjust if needed
- Reduces clicks

### ConfirmationStep

**Two Modes:**
1. **Preview Mode** (before submit): shows form summary
2. **Results Mode** (after submit): shows batch results

```typescript
if (!result) {
  // Preview mode
  <div>Form summary</div>
} else {
  // Results mode
  <div>Success/failure breakdown</div>
}
```

**Why separate?**
- Gives users chance to review before irreversible action
- Smooth transition: click "Créer" → loading → results

## Testing Approach

### Unit Tests (Validation Functions)

```typescript
// src/lib/__tests__/onboarding-utils.test.ts
describe("validatePassword", () => {
  it("should reject passwords < 8 chars", () => {
    const { isValid } = validatePassword("Short1!");
    expect(isValid).toBe(false);
  });
  
  it("should require uppercase", () => {
    const { errors } = validatePassword("lowercase1!");
    expect(errors).toContain("Au moins 1 majuscule");
  });
});
```

### Component Tests (React Testing Library)

```typescript
// src/components/onboarding/__tests__/TerritorySelector.test.tsx
describe("TerritorySelector", () => {
  it("should load EPCIs on mount", async () => {
    const { getByText } = render(<TerritorySelector />);
    await waitFor(() => {
      expect(getByText(/EPCI demo/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/onboarding.spec.ts
test("commune path: search → plan → payment → create", async ({ page }) => {
  await page.goto("/platform/onboarding");
  
  // Step 1: Search commune
  await page.fill("input", "Paris");
  await page.click("text=Paris (75056)");
  await page.click("button:has-text('Suivant')");
  
  // Step 2: Enter admin
  // ... fill form
  
  // Step 5: Submit
  await page.click("button:has-text('Valider & créer')");
  await expect(page).toHaveText("Commune créée");
});
```

## Common Pitfalls & Solutions

### Pitfall 1: Form Data Lost on Navigation
**Problem:** User fills form, clicks back, data disappears
**Solution:** Store formData in component state, not localStorage
**Implementation:** ✅ Already done

### Pitfall 2: Validate Too Early
**Problem:** User sees errors while typing password
**Solution:** Validate only on blur or after step submission
**Implementation:** ✅ Real-time display for requirements, error on next step click

### Pitfall 3: EPCI Communes Infinite Load
**Problem:** CommuneAdminTable keeps fetching communes
**Solution:** Use useEffect with epciId dependency, fetch once
**Implementation:** ✅ Done with proper cleanup

### Pitfall 4: Batch Partial Failure Confusion
**Problem:** User doesn't know which communes failed
**Solution:** List failed communes with specific error reasons
**Implementation:** ✅ ConfirmationStep shows failed array

### Pitfall 5: Unclear Next Steps
**Problem:** User creates communes but doesn't know what to do
**Solution:** Display "Next steps" guidance in ConfirmationStep
**Implementation:** ✅ Done with email sent, access platform links

## Debugging Guide

### Enable Verbose Logging
```typescript
// Add to onboarding.tsx
const [debug, setDebug] = useState(false);

useEffect(() => {
  if (debug) {
    console.log("Form state:", formData);
    console.log("Step:", step);
  }
}, [formData, step, debug]);
```

### Check Edge Function Logs
```bash
# Terminal
supabase functions logs create-commune-batch --debug
```

### Verify Database State
```sql
-- Check created commons
SELECT id, name, insee_code, epci_id FROM collectivities 
WHERE created_at > now() - interval '1 hour';

-- Check licenses
SELECT id, collectivity_id, plan, payment_type, payment_validated FROM commune_licenses 
WHERE created_at > now() - interval '1 hour';

-- Check admin roles
SELECT user_id, role, epci_id, collectivity_id FROM user_roles 
WHERE created_at > now() - interval '1 hour';
```

## Performance Optimization Opportunities

### Current Optimizations
- ✅ EPCI list loaded once (not on every step)
- ✅ Commune search debounced by input (user controls)
- ✅ No unnecessary re-renders (proper key props)

### Potential Future Optimizations
- [ ] Cache EPCI list in localStorage (30 min TTL)
- [ ] Virtual scroll for large commune lists
- [ ] Batch validation (instead of per-step)
- [ ] Lazy load payment method details

## Browser Compatibility

- ✅ Chrome 90+ (modern JS)
- ✅ Firefox 88+ (CSS Grid)
- ✅ Safari 14+ (CSS Logical Properties)
- ✅ Edge 90+
- ✅ Mobile Safari 14+ (iOS)
- ✅ Chrome Mobile (Android)

## Internationalization

Currently: French only (fr-FR)

**To add multi-language support:**
1. Extract strings to i18n config
2. Use `useTranslation()` hook
3. Update `formatDate()`, `validatePassword()` error messages

**Files to update:**
- `src/lib/onboarding-utils.ts` (error messages)
- All component labels
- Toast notification messages

## Security Considerations

### Password Handling
- ✅ Never logged or stored locally
- ✅ Sent over HTTPS only
- ✅ Hashed server-side by Supabase auth
- ⚠️ Displayed as dots/asterisks in field

### Email Validation
- ✅ Regex validation client-side
- ✅ Server-side validation in EF
- ✅ Duplicate detection via Supabase constraints

### EPCI Admin Privileges
- ✅ RLS policies enforce EPCI scope
- ✅ EPCI admin cannot create user_roles directly
- ✅ create-commune-batch EF uses service role (controlled)

### Form Data
- ✅ No form data persisted to localStorage
- ✅ No form data sent to analytics
- ✅ Form cleared on page close (expected UX)

## Monitoring & Observability

### Metrics to Track
- Time to complete onboarding (per step)
- Drop-off rate (which step users abandon)
- Error rates (validation, EF, auth)
- Batch creation size distribution (communes per EPCI)

### Logging Points
- Step 5 submission: `console.log("Batch creation started", { territory, commune_count })`
- EF call: Log request/response bodies
- Batch results: Log success/failure breakdown

### Alerts to Set Up
- EF error rate > 5%
- Batch partial failure rate > 30%
- Email send failures > 10%

## Version History

### v1.0 (Current)
- 5-step flow
- Commune + EPCI support
- Payment tracking
- Batch creation

### Future Versions (v1.1+)
- [ ] Invoice preview in Step 4
- [ ] Bulk commune import (CSV)
- [ ] Admin email customization
- [ ] Payment method-specific workflows
- [ ] Onboarding progress email notifications

---

**Last Updated:** 2026-07-01
**Author:** Baptiste (Implementation)
**Status:** Ready for Deployment
