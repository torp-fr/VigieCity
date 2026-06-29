# Onboarding Refactor — Detailed Implementation Plan
**Status:** Audit Complete | Date: 2026-06-29

---

## Executive Summary

The current onboarding flow (4 steps: Commune → Admin → Plan → Confirmation) creates a single commune license with one admin user. The refactor adds EPCI support to handle:
- Single commune (direct contract) OR EPCI + batch commune onboarding
- Bulk commune admin management when EPCI is selected
- Payment tracking (date, type, validation status)
- Audit trail and state persistence

**Scope:** 5 steps, potential EPCI admin details table, schema migrations for payment fields, batch Edge Function, and enhanced create-commune variant for EPCI flow.

---

## Part 1: Current State Audit

### 1.1 Current Onboarding Flow (`src/routes/platform/onboarding.tsx`)

**File:** `/delivery/src/routes/platform/onboarding.tsx` (459 lines)

**Current Architecture:**
- **Type:** Single-step creation (3 user-facing steps + 1 confirmation)
- **Steps:**
  1. Commune selection (name, INSEE code, department)
  2. Admin contact (email, name, password)
  3. Plan selection (trial/starter/pro/enterprise)
  4. Confirmation summary

**Data Created:**
1. **collectivities** row (name, insee_code, department_code)
2. **commune_licenses** row (collectivity_id, plan, status=active, started_at, expires_at)
3. **profiles** row (via create-commune EF, role=moderator)
4. **auth.users** entry (via create-commune EF)

**Limitations:**
- No EPCI selection logic
- No commune admin detail table for EPCI flow
- No payment metadata (date, type, validation)
- Single admin only (no batch user creation)
- create-commune EF is single-user, not batch-capable
- No form state persistence beyond React state
- Missing pipeline_crm or onboarding tracking table

**Current Validation:**
- Step 1: communeName required
- Step 2: adminEmail + 8-char password required
- Step 3: No specific plan validation (defaults to trial)
- Step 4: Display confirmation with admin created status

**Error Handling:**
- Toast notifications for all failures
- Non-blocking email (warning if send-email fails)
- Auth user creation failure blocks commune creation

---

### 1.2 Database Schema Analysis

#### commune_licenses Table
**File:** `/delivery/src/integrations/supabase/types.ts` (lines 213–287)

**Columns:**
- ✅ id, collectivity_id (FK, unique)
- ✅ plan, status, created_at, started_at, expires_at
- ✅ contact_name, contact_phone, billing_email (optional)
- ❌ NO payment_date, payment_type, payment_validated fields
- ❌ NO epci_id field (links are via collectivities.epci_id)
- ✅ notes, features (JSON), max_users, auto_renew
- ❌ NO stripe_customer_id (marked deprecated in types.ts, line 1–7)

**Issues:**
- commune_licenses.stripe_customer_id marked obsolete (CHORUS PRO is payment system)
- No audit trail or payment capture fields

#### collectivities Table
**File:** `/delivery/src/integrations/supabase/types.ts` (lines 69–161)

**Columns:**
- ✅ id, name, insee_code, department_code
- ✅ epci_id (FK → intercommunalities.id)
- ✅ email, phone, website, postal_code
- ✅ is_active, status, created_at, updated_at
- ❌ NO payment_contact_email, payment_date fields

#### intercommunalities Table
**File:** `/delivery/src/integrations/supabase/types.ts` (lines 765–812)

**Columns:**
- ✅ id, name, siren (unique), type, region, department
- ✅ max_communes, is_active
- ✅ contact_name, contact_email
- ✅ notes, created_at, updated_at

**Relationships:**
- collectivities.epci_id → intercommunalities.id (many-to-one)
- user_roles can have epci_id OR collectivity_id (not both)

#### Views & Functions
- ✅ epci_communes_summary (shows active/total/remaining communes per EPCI)
- ✅ search_communes(q: string) — fulltext search on collectivities
- ✅ is_epci_admin_of_commune(commune_id) — RLS helper

---

### 1.3 Edge Functions

#### create-commune (`/delivery/supabase/functions/create-commune/index.ts`)

**Purpose:** Create auth.users + profile record for single commune admin

**Inputs:**
```typescript
{
  collectivityId: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}
```

**Outputs:**
```typescript
{
  success: true;
  userId: string;
  email: string;
} | { error: string }
```

**Behavior:**
1. Create auth user (email_confirm=true)
2. Upsert profiles (role=moderator)
3. Send welcome email async (non-blocking)

**Limitations:**
- Single user only, not batch
- Hardcoded role=moderator (should be configurable)
- No EPCI-specific logic
- plan_name fetched from collectivity (should come from commune_licenses)

**RLS Context:** Uses SERVICE_ROLE_KEY (no auth check needed)

---

### 1.4 Existing EPCI Infrastructure

**Migration:** `/delivery/supabase/migrations/20260620000007_intercommunalities_epci.sql`

**RLS Policies in place:**
- super_admin → full access to intercommunalities + all collectivities
- epci_admin → read own EPCI, manage communes in own EPCI, create admin/moderator roles
- admin/moderator → read own EPCI via commune membership, cannot manage other communes

**User Roles (`user_roles` table):**
- epci_admin: epci_id ≠ null, collectivity_id = null
- admin/moderator: collectivity_id ≠ null, epci_id = null

**Seed Data:** Demo EPCI "CC Côte Lumineuse (démo)" with 8-commune quota

---

### 1.5 Related Pages & Components

**Platform Navigation:** `/delivery/src/components/PlatformShell.tsx`
- Link to /platform/onboarding in OPÉRATIONS section (line 21)
- Link to /platform/epci-tarification in OUTILS section (line 54)

**EPCI Tarification Page:** `/delivery/src/routes/platform/epci-tarification.tsx`
- Shows EPCI list with commune counts and calculated tariffs
- Uses calculateEPCITariff() from tariffCalculation.ts
- Can be reference for EPCI selection UI patterns

**Admin EPCI Page:** `/delivery/src/routes/admin/epci.tsx`
- Shows epci_admin dashboard for managing communes
- Tabs: Communes, Statistiques, Facturation
- Pattern for commune detail table (email, role, status per commune)

---

### 1.6 Tariff Calculation Context

**File:** `/delivery/src/lib/tariffCalculation.ts`

**Dynamic Pricing for EPCI:**
- Base price scales by commune count (0 communes = €0, 1 = €19, etc.)
- Volume reductions applied (0–22% discount by tier)
- Tariff breakdown: count, base_price, reduction_percent, reduction_amount, final

**Relevant for:** Step 4 in new flow (show estimated tariff after communes selected)

---

## Part 2: Schema Gaps & Migrations Needed

### 2.1 Missing Fields on commune_licenses

**Required Fields:**
```sql
-- Payment capture fields
ALTER TABLE commune_licenses ADD COLUMN IF NOT EXISTS (
  payment_date DATE,           -- When payment was received/processed
  payment_type VARCHAR(50),    -- "stripe" | "chorus_pro" | "transfer" | "quote" (for EPCI batch)
  payment_validated BOOLEAN DEFAULT FALSE  -- Admin confirmed payment received
);
```

**Rationale:**
- Step 4 in refactor: Admin enters payment details for communes
- Allows tracking EPCI bulk contract dates vs. commune activation dates
- Supports audit: who signed, when, what terms

**Impact:** 3 new nullable columns, no backward-compat issues

---

### 2.2 Payment Type Enum (Optional Enhancement)

```sql
-- Create enum for payment_type
DO $$
BEGIN
  CREATE TYPE payment_method AS ENUM (
    'chorus_pro',      -- Marché public via Chorus Pro
    'stripe',          -- Direct Stripe (future)
    'transfer',        -- Bank transfer
    'quote_pending'    -- EPCI: waiting for quote validation
  );
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END;
$$;

ALTER TABLE commune_licenses ADD COLUMN IF NOT EXISTS 
  payment_type payment_method;
```

---

### 2.3 Onboarding Pipeline Tracking Table (NEW)

**Optional: For audit & multi-step sessions**

```sql
CREATE TABLE IF NOT EXISTS onboarding_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session tracking
  session_id VARCHAR(100) NOT NULL,  -- localStorage key or session ID
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Territory selection
  territory_type VARCHAR(50) NOT NULL,  -- "commune" | "epci"
  commune_id UUID REFERENCES collectivities(id),
  epci_id UUID REFERENCES intercommunalities(id),
  
  -- Admin contact
  admin_email VARCHAR(255),
  admin_name VARCHAR(255),
  
  -- EPCI: commune admin details (JSON array)
  commune_admins JSONB,  -- [{commune_id, email, name}, ...]
  
  -- Payment info
  payment_date DATE,
  payment_type VARCHAR(50),
  payment_validated BOOLEAN DEFAULT FALSE,
  
  -- Plan/tariff
  plan VARCHAR(50),
  estimated_tariff NUMERIC(10, 2),
  
  -- Current step (for resumption)
  current_step INTEGER DEFAULT 1,
  
  -- Metadata
  notes TEXT,
  created_by_user_id UUID
);

CREATE INDEX IF NOT EXISTS idx_onboarding_pipeline_session_id 
  ON onboarding_pipeline(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_pipeline_epci_id 
  ON onboarding_pipeline(epci_id);
```

**Benefit:** Allows multi-step form to save state, resume later, audit trail

---

## Part 3: Detailed Implementation Plan

### 3.1 Phase 1: Schema & Migrations (Week 1, Days 1–2)

#### Task 1.1: Create migration file
- **File:** `_delivery/supabase/migrations/20260701000001_onboarding_payment_fields.sql`
- **Changes:**
  - Add payment_date, payment_type, payment_validated to commune_licenses
  - Optional: Create payment_method enum
  - Optional: Create onboarding_pipeline table
- **Verification:** Run via Supabase UI, verify no errors, check types.ts regenerates

#### Task 1.2: Regenerate types.ts
- Run `supabase gen types --schema public` to update commune_licenses Insert/Update/Row types
- Verify payment fields are optional in Insert (nullable)

---

### 3.2 Phase 2: UI Component Refactor (Week 1, Days 3–5)

#### Task 2.1: Refactor onboarding.tsx → 5-step flow

**Location:** `_delivery/src/routes/platform/onboarding.tsx`

**New Type Definition:**
```typescript
type Step = 1 | 2 | 3 | 4 | 5;

// Territory selection: "commune" or "epci"
type TerritoryType = "commune" | "epci";
type SelectedTerritory = 
  | { type: "commune"; commune: SearchCommuneResult }
  | { type: "epci"; epci: EpciRow };

// Commune admin detail for EPCI flow
type CommuneAdminDetail = {
  commune_id: string;
  commune_name: string;
  admin_email: string;
  admin_name: string;
};
```

**New State Variables:**
```typescript
// Territory (Step 1)
const [territoryType, setTerritoryType] = useState<TerritoryType>("commune");
const [selectedTerritory, setSelectedTerritory] = useState<SelectedTerritory | null>(null);

// For commune search (Step 1)
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<SearchCommuneResult[]>([]);

// For EPCI selection (Step 1)
const [epciList, setEpciList] = useState<EpciRow[]>([]);

// Admin contact (Step 2) — SAME as current, shared for both paths
const [adminEmail, setAdminEmail] = useState("");
const [adminName, setAdminName] = useState("");
const [adminPassword, setAdminPassword] = useState("");
const [showPwd, setShowPwd] = useState(false);

// For EPCI path: commune admin details (Step 3)
const [communeAdmins, setCommuneAdmins] = useState<CommuneAdminDetail[]>([]);

// Payment details (Step 4) — NEW
const [paymentDate, setPaymentDate] = useState("");
const [paymentType, setPaymentType] = useState<"chorus_pro" | "transfer" | "quote_pending">("chorus_pro");
const [paymentValidated, setPaymentValidated] = useState(false);

// Confirmation (Step 5)
const [createdData, setCreatedData] = useState<CreatedOnboardingData | null>(null);
```

**Step Indicator:** Update to 5 steps with icons:
1. Territoire (Building2 + Globe) — commune OR epci
2. Admin responsable (User)
3. If EPCI: Admins communes (Users) — table, else: Plan (CreditCard)
4. Paiement (CreditCard)
5. Confirmation (CheckCircle)

**Task 2.2: Implement Step 1 — Territory Selection**

**Layout:**
- Radio buttons: "Commune seule" vs. "Intercommunalité (EPCI)"
- If "Commune seule":
  - Search box (useQuery → search_communes)
  - Results dropdown with name, code, population, region
  - Selected item displays summary card
- If "EPCI":
  - Dropdown/search for intercommunalities (query from DB, sorted by name)
  - Show EPCI name, communes quota, region
  - Display communes count badge ("N communes sélectionnées")
  - Button to proceed (only if EPCI selected)

**Validation:** Both paths require selection before Next button enabled

---

#### Task 2.3: Implement Step 2 — Admin Contact (Reusable)

**Layout:** Same as current, but with additional note:
- If EPCI path: "Cet admin gérera le contrat EPCI et ses communes"
- If Commune path: "Cet admin gérera la commune"

**Validation:** Email + 8-char password required (same as current)

**Note:** This step is identical for both paths, allowing code reuse

---

#### Task 2.4: Implement Step 3 — Conditional Content

**For Commune Path:**
- Show Plan selection (same as current: trial/starter/pro/enterprise)
- Display: "Activez la commune avec le plan sélectionné"

**For EPCI Path:**
- **New:** Commune Admin Detail Table
- **Columns:**
  - Commune name (read-only, from EPCI)
  - Admin email (text input, required)
  - Admin name (text input, optional — defaults to email prefix)
  - Actions: Remove row
- **Layout:**
  - List all active communes in selected EPCI
  - Each row is editable inline OR via form
  - "Add another admin" button if not all communes assigned
  - Validation: All communes must have email before Next
  - Show tariff breakdown: "Estimation: € X/an pour N communes"

**Component Suggestion:** Create `<CommuneAdminDetailTable />` sub-component (reusable)

---

#### Task 2.5: Implement Step 4 — Payment Details (NEW)

**Layout:**
- **Payment Date:** Date input field (required)
  - Default: today
  - Validation: not in future, not before plan started_at
- **Payment Type:** Dropdown (required)
  - "Chorus Pro (marché public)"
  - "Virement bancaire"
  - "Devis en attente" (EPCI only)
- **Payment Validated:** Checkbox
  - Label: "Paiement confirmé par la commune/EPCI"
  - Tip: "Cochez seulement si le paiement a été reçu et vérifié"
- **Summary Card:**
  - Show commune(s) onboarded, plan/tariff, contract start date
  - "Récapitulatif: X communes, €Y, commençant [date]"

**Validation:**
- paymentDate: required, not future
- paymentType: required
- paymentValidated: no hard requirement (admin decision)

---

#### Task 2.6: Implement Step 5 — Confirmation & Batch Create

**Layout:** Same structure as current Step 4, with additional details:
- **Commune Path:**
  - Show commune name, INSEE, plan, payment date/type, admin email
  - Status: Admin created ✅ or ⚠️
- **EPCI Path:**
  - Show EPCI name, # communes, tariff estimate, payment info
  - List all communes + admins (collapsible table)
  - Batch admin creation status (checkmarks per commune)
  - If any failed: show errors inline, allow retry or skip

**Buttons:**
- "Nouvelle onboarding" (reset form)
- "Voir les communes" (navigate /platform/collectivites)

---

### 3.3 Phase 3: Edge Function Enhancement (Week 2, Days 1–2)

#### Task 3.1: Create create-commune-batch Edge Function (NEW)

**File:** `_delivery/supabase/functions/create-commune-batch/index.ts`

**Purpose:** Bulk create admin users + profiles for EPCI communes

**Inputs:**
```typescript
{
  epciId: string;
  createdByUserId: string;
  communes: Array<{
    collectivityId: string;
    adminEmail: string;
    adminName: string;
    adminPassword: string;
  }>;
}
```

**Outputs:**
```typescript
{
  success: boolean;
  results: Array<{
    collectivityId: string;
    adminEmail: string;
    userId?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}
```

**Algorithm:**
1. Verify caller is epci_admin or super_admin for this EPCI (via RLS check)
2. For each commune:
   a. Create auth.users (continue on error, don't throw)
   b. Upsert profiles (role=admin for EPCI communes)
   c. Create user_role entry (collectivity_id + epci_id)
   d. Queue welcome email async
   e. Record result (success or error reason)
3. Return summary with partial success OK

**Error Handling:**
- Duplicate email: return error, continue batch
- Auth failure: log, continue
- DB failure: return error for that commune
- Always return full results array for client to show UI feedback

**RLS Context:** Uses SERVICE_ROLE_KEY

---

#### Task 3.2: Update create-commune for Plan Selection

**File:** `_delivery/supabase/functions/create-commune/index.ts` (modify)

**Changes:**
- Add optional `plan` parameter to input body
- Fetch plan from commune_licenses if available
- Update welcome email template to include plan name

**Backward Compatibility:** Keep existing behavior if plan not provided

---

### 3.4 Phase 4: Form Submission & Data Persistence (Week 2, Days 3–5)

#### Task 4.1: Implement handleCreate() — Unified

**Location:** `onboarding.tsx`, main form submission handler

**Flow:**
1. **Validation:** Check all required fields per current step
2. **If Commune Path:**
   a. Create collectivities row (same as current)
   b. Create commune_licenses row (add payment_date, payment_type, payment_validated)
   c. Call create-commune EF for single admin
   d. Transition to Step 5 with confirmation
3. **If EPCI Path:**
   a. For each commune in EPCI:
      - Create/verify collectivities row (should pre-exist)
      - Create commune_licenses row (link to EPCI, add payment fields)
   b. Call create-commune-batch EF with all admins
   c. Transition to Step 5 with batch results
4. **Error Handling:**
   - Toast warnings for non-critical failures (email not sent)
   - Toast error for critical failures (auth, DB)
   - In Step 5: show red checkmark for failed communes, allow retry

**Code Structure:**
```typescript
async function handleCreate() {
  setSaving(true);
  try {
    if (territoryType === "commune") {
      await createCommuneFlow();
    } else {
      await createEpciFlow();
    }
    setStep(5);
    toast.success("Créé avec succès!");
  } catch (err) {
    toast.error(err.message);
  } finally {
    setSaving(false);
  }
}

async function createCommuneFlow() {
  // Step 1: Create collectivity
  // Step 2: Create license with payment fields
  // Step 3: Create admin via EF
  // Step 4: Store results in createdData
}

async function createEpciFlow() {
  // Similar, but loop over communes and call create-commune-batch
}
```

---

#### Task 4.2: Form State Persistence (Optional Enhancement)

**Location:** `onboarding.tsx`, useEffect hooks

**Pattern:**
- Save state to localStorage on every input change
- Resume from localStorage on page load
- Add "Reprendre" link if incomplete session found

**Implementation (basic):**
```typescript
useEffect(() => {
  const saved = localStorage.getItem("onboarding-draft");
  if (saved) {
    const data = JSON.parse(saved);
    setTerritoryType(data.territoryType);
    setSelectedTerritory(data.selectedTerritory);
    // ... restore all fields
    setStep(data.currentStep);
  }
}, []);

useEffect(() => {
  const draft = {
    territoryType, selectedTerritory, adminEmail,
    communeAdmins, paymentDate, paymentType, step
  };
  localStorage.setItem("onboarding-draft", JSON.stringify(draft));
}, [territoryType, selectedTerritory, adminEmail, communeAdmins, paymentDate, paymentType, step]);
```

---

### 3.5 Phase 5: RLS & Security Review (Week 3, Day 1)

#### Task 5.1: RLS Policy Audit

**Current State (from migration):**
- ✅ super_admin: full access to intercommunalities
- ✅ epci_admin: can create/manage communes in EPCI
- ✅ epci_admin: can read own communes
- ⚠️ **Gap:** epci_admin cannot INSERT into commune_licenses (no policy yet)
- ⚠️ **Gap:** epci_admin cannot UPDATE payment fields on commune_licenses

**Required Additions:**
```sql
-- Allow epci_admin to create commune_licenses for communes in their EPCI
CREATE POLICY "epci_admin_create_member_licenses"
  ON commune_licenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = commune_licenses.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'epci_admin'
        AND c.epci_id = ur.epci_id
    )
  );

-- Allow epci_admin to update payment fields on licenses for their communes
CREATE POLICY "epci_admin_update_member_licenses"
  ON commune_licenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = commune_licenses.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'epci_admin'
        AND c.epci_id = ur.epci_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = commune_licenses.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'epci_admin'
        AND c.epci_id = ur.epci_id
    )
  );

-- Super-admin & admin: full access to own records (existing, verified)
-- Citizen: no access (existing)
```

#### Task 5.2: File: New RLS Migration

**File:** `_delivery/supabase/migrations/20260701000002_onboarding_epci_rls.sql`

---

### 3.6 Phase 6: Testing & Validation (Week 3, Days 2–4)

#### Task 6.1: Unit Tests (Optional but Recommended)

**Test Scenarios:**
1. **Commune Path:**
   - Single commune + admin creation → Step 5 success
   - Missing plan → validation error at Step 3
   - Auth failure → graceful error, commune still created
2. **EPCI Path:**
   - EPCI with 5 communes → batch create all admins
   - Duplicate email in batch → skip, continue
   - Payment date validation → reject if future
3. **Form State:**
   - Complete form → save to localStorage
   - Reload page → resume from draft
   - Reset form → clear localStorage

**Test File:** `src/routes/platform/__tests__/onboarding.test.tsx`

---

#### Task 6.2: Manual Testing Checklist

- [ ] Step 1 Commune: Search by name, code, region
- [ ] Step 1 EPCI: Select EPCI, verify commune count updates
- [ ] Step 2: Both paths show same admin form
- [ ] Step 3 Commune: Plan selection, disabled if no plan
- [ ] Step 3 EPCI: Commune table appears, all 5 communes listed
- [ ] Step 3 EPCI: Edit email in table, validation (required)
- [ ] Step 4: Date field only accepts past dates
- [ ] Step 4: Payment type dropdown shows 3 options
- [ ] Step 5: Commune path shows single result
- [ ] Step 5: EPCI path shows batch results (5 rows)
- [ ] Step 5: Failed admins show error message
- [ ] Step 5: "Nouvelle onboarding" button resets form
- [ ] localStorage: Save draft, reload, form resumes
- [ ] RLS: epci_admin cannot create commune for different EPCI
- [ ] RLS: super_admin can create any commune

---

## Part 4: Risk Assessment & Mitigation

### 4.1 High-Risk Areas

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Batch create EF fails midway, partial communes created | High | Medium | Transaction? Return detailed results, allow retry. Document best-effort nature. |
| RLS policy blocks epci_admin from updating payment fields | Medium | High | Test RLS before deploying. Add explicit policies for payment_date, payment_type. |
| Email duplicate in EPCI batch | Medium | Low | Batch EF catches, skips, returns error per commune. UI shows which failed. |
| Admin password exposed in form → localStorage | Low | Critical | Never save password to localStorage. Exclude from draft JSON. Use secure session instead. |
| Commune already exists in EPCI (double-onboarding) | Low | Medium | Check is_active status. Either skip or update existing license. Document deduplication logic. |
| Payment date in future → allowed by form | High | Low | Add client-side validation (maxDate=today), server-side reject in handleCreate(). |

### 4.2 Backward Compatibility

**Current Onboarding Flow:** Will continue to work (commune-only path)

**Migration Concerns:**
- New commune_licenses columns (payment_*) are nullable → no breaking changes
- Types.ts regeneration will add new optional fields to Insert type → safe

**Version Safety:** No version bump needed if additive-only

---

### 4.3 Performance Considerations

| Component | Issue | Solution |
|-----------|-------|----------|
| Step 1 Search (communes) | 35k communes, fulltext search slow | Use search_communes() PL/pgsql function, client debounce (300ms) |
| Step 1 EPCI Fetch | Load all EPCIs on mount | Lazy load, cache with React Query |
| Step 3 Commune Table (EPCI) | 100+ communes in large EPCI | Paginate (20 per page) or virtual scrolling |
| Batch Create EF | 100 communes × auth + DB calls | Parallel but rate-limit (10 concurrent). Check Supabase queue size. |

---

## Part 5: Files to Create/Modify

### Summary Table

| File Path | Type | Action | Complexity |
|-----------|------|--------|-----------|
| `_delivery/supabase/migrations/20260701000001_*.sql` | Migration | Create | Medium |
| `_delivery/supabase/migrations/20260701000002_*.sql` | Migration | Create | Medium |
| `_delivery/supabase/functions/create-commune-batch/index.ts` | Edge Fn | Create | High |
| `_delivery/supabase/functions/create-commune/index.ts` | Edge Fn | Modify | Low |
| `_delivery/src/routes/platform/onboarding.tsx` | React | Refactor | **Very High** |
| `_delivery/src/components/CommuneAdminDetailTable.tsx` | React | Create | High |
| `_delivery/src/lib/onboarding-types.ts` | TypeScript | Create | Low |
| `_delivery/src/integrations/supabase/types.ts` | Types | Auto-regen | Auto |

---

## Part 6: Execution Order

### Week 1

**Monday (Day 1):**
1. Create migration 20260701000001 (payment fields)
2. Run migration locally, regenerate types.ts
3. Push to main branch

**Tuesday-Wednesday (Days 2-3):**
4. Extract types from onboarding.tsx into `lib/onboarding-types.ts`
5. Begin Step 1 UI (territory selector, commune search)
6. Build search_communes query hook

**Thursday-Friday (Days 4-5):**
7. Implement Step 2 (reuse current code)
8. Implement Step 3 (plan selector OR commune admin table)
9. Create `CommuneAdminDetailTable.tsx` sub-component

### Week 2

**Monday-Tuesday (Days 1-2):**
10. Create `create-commune-batch` Edge Function
11. Deploy Edge Function, test with curl/Postman
12. Implement payment fields validation (Step 4)

**Wednesday-Thursday (Days 3-4):**
13. Implement form submission logic (handleCreate)
14. Integrate with Edge Functions
15. Add localStorage draft saving (optional)
16. Build Step 5 confirmation + batch results display

**Friday (Day 5):**
17. Manual testing checklist
18. Fix bugs found in testing

### Week 3

**Monday (Day 1):**
19. Create RLS migration (20260701000002)
20. Deploy RLS policies
21. Test RLS enforcement

**Tuesday-Wednesday (Days 2-3):**
22. End-to-end testing (all paths)
23. Performance testing (search, batch create)
24. Documentation + rollout

**Thursday-Friday (Days 4-5):**
25. Staging deployment
26. Monitor for errors
27. Production rollout

---

## Part 7: Implementation Checklist

### Code Changes

- [ ] Migration 1: payment_date, payment_type, payment_validated columns
- [ ] Migration 2: RLS policies for epci_admin on commune_licenses
- [ ] types.ts regenerated from migrations
- [ ] lib/onboarding-types.ts created with all type defs
- [ ] CommuneAdminDetailTable.tsx component created
- [ ] create-commune-batch Edge Function created & deployed
- [ ] create-commune Edge Function updated (optional plan param)
- [ ] onboarding.tsx refactored to 5 steps
- [ ] Step 1 territory selection + search implemented
- [ ] Step 2 admin form refactored (reuse)
- [ ] Step 3 conditional (plan OR commune table)
- [ ] Step 4 payment details form
- [ ] Step 5 confirmation & batch results
- [ ] handleCreate() unified flow
- [ ] localStorage draft saving (optional)
- [ ] Error handling + toast notifications

### Testing

- [ ] Unit tests for Step logic
- [ ] Integration tests for create-commune EF
- [ ] Integration tests for create-commune-batch EF
- [ ] Manual test: Commune path (single admin)
- [ ] Manual test: EPCI path (batch admins)
- [ ] Manual test: Search communes (perf)
- [ ] Manual test: RLS enforcement (epci_admin)
- [ ] Manual test: localStorage resumption
- [ ] Performance test: Batch create 100 communes
- [ ] Edge case: Duplicate email in batch
- [ ] Edge case: Future payment date validation

### Documentation

- [ ] ONBOARDING_REFACTOR_PLAN.md (this file, finalized)
- [ ] Edge Function README for create-commune-batch
- [ ] Inline code comments (complex sections)
- [ ] Types documentation (lib/onboarding-types.ts)

### Deployment

- [ ] Migrations applied to staging
- [ ] Edge Functions deployed to staging
- [ ] Types regenerated & committed
- [ ] PR reviewed & approved
- [ ] Merged to main
- [ ] Staging tested by QA
- [ ] Production deployment scheduled
- [ ] Rollback plan documented (reverse migrations)

---

## Part 8: Schema Deep Dive — commune_licenses Changes

### Before (Current)

```typescript
commune_licenses: {
  Row: {
    id: string;
    collectivity_id: string;
    plan: string;
    status: string;
    started_at: string;
    expires_at: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    billing_email: string | null;
    // ... other fields
  }
}
```

### After (With Payment Fields)

```typescript
commune_licenses: {
  Row: {
    id: string;
    collectivity_id: string;
    plan: string;
    status: string;
    started_at: string;
    expires_at: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    billing_email: string | null;
    
    // NEW FIELDS
    payment_date: string | null;              // ISO date
    payment_type: string | null;              // "chorus_pro" | "transfer" | "quote_pending"
    payment_validated: boolean | null;        // Admin confirmed
    
    // ... other fields
  }
}
```

### Example Query (Commune Path)

```typescript
const { error: licErr } = await supabase
  .from("commune_licenses")
  .insert({
    collectivity_id: coll.id,
    plan: selectedPlan,
    status: "active",
    started_at: new Date().toISOString(),
    expires_at: expiresAt,
    payment_date: paymentDate,          // NEW
    payment_type: paymentType,          // NEW
    payment_validated: paymentValidated, // NEW
  });
```

---

## Part 9: API Contracts

### create-commune (updated)

**Request:**
```json
{
  "collectivityId": "uuid",
  "adminEmail": "admin@commune.fr",
  "adminName": "Jean Dupont",
  "adminPassword": "SecurePass123",
  "plan": "trial"  // OPTIONAL
}
```

**Response (Success):**
```json
{
  "success": true,
  "userId": "user-uuid",
  "email": "admin@commune.fr"
}
```

**Response (Error):**
```json
{
  "error": "User already exists"
}
```

---

### create-commune-batch (new)

**Request:**
```json
{
  "epciId": "epci-uuid",
  "createdByUserId": "user-uuid",
  "communes": [
    {
      "collectivityId": "commune1-uuid",
      "adminEmail": "admin1@commune.fr",
      "adminName": "Admin One",
      "adminPassword": "Secure123"
    },
    {
      "collectivityId": "commune2-uuid",
      "adminEmail": "admin2@commune.fr",
      "adminName": "Admin Two",
      "adminPassword": "Secure456"
    }
  ]
}
```

**Response (Partial Success):**
```json
{
  "success": false,
  "results": [
    {
      "collectivityId": "commune1-uuid",
      "adminEmail": "admin1@commune.fr",
      "userId": "user1-uuid"
    },
    {
      "collectivityId": "commune2-uuid",
      "adminEmail": "admin2@commune.fr",
      "error": "User already exists"
    }
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}
```

---

## Part 10: Known Limitations & Future Enhancements

### Current Scope (Out of This Refactor)

- [ ] Admin user invitation flow (send invite link, set password)
- [ ] Stripe payment integration (noted as future, CHORUS PRO is current)
- [ ] Multi-admin per commune (current: 1 admin only)
- [ ] Commune license tier escalation (trial → pro, automatic)
- [ ] Payment reminder emails (not in scope)
- [ ] CRM integration (marked as placeholder)

### Possible Future Additions

1. **Admin Invitation Instead of Password:** Send secure invite link, let admin set own password
   - Reduces password exposure risk
   - Better UX (no password email)
   - Requires invite table + email template

2. **Bulk Import (CSV):** Upload communes + admins for EPCI
   - 100+ communes → manual table entry too slow
   - Parse CSV, validate, batch create
   - Requires CSV parser + error reporting

3. **Payment Integration:** Stripe webhook → mark payment_validated
   - Auto-update payment_validated when payment received
   - Reduce manual admin step

4. **Audit Log Table:** Track all onboarding actions
   - Who created what, when, with what changes
   - Compliance requirement for contracts

---

## Part 11: Troubleshooting Guide

### Scenario 1: RLS Blocks epci_admin from Creating License

**Symptom:** epci_admin gets 403 when creating commune_licenses

**Cause:** Missing RLS policy on commune_licenses for epci_admin

**Fix:**
```sql
-- Apply migration 20260701000002
-- Verify policy exists: SELECT * FROM pg_policies WHERE tablename = 'commune_licenses';
```

### Scenario 2: create-commune-batch EF Returns 500

**Symptom:** Batch create fails with "Internal Server Error"

**Cause:** Likely auth.users duplicate OR Service Role Key issue

**Debug:**
```bash
# Check EF logs in Supabase dashboard → Functions → Logs
# Look for "User already exists" or auth errors
# Manually test with curl:
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/create-commune-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -d '{...}'
```

### Scenario 3: Types.ts Doesn't Regenerate

**Symptom:** payment_date field missing from types.ts after migration

**Cause:** Manual regeneration not run

**Fix:**
```bash
cd _delivery
supabase gen types --schema public > src/integrations/supabase/types.ts
# Commit the file
```

### Scenario 4: Commune Search Returns 0 Results

**Symptom:** Step 1 search yields no communes

**Cause:** search_communes() function not deployed OR wrong query

**Debug:**
```sql
-- Test function directly in Supabase SQL editor:
SELECT * FROM search_communes('Paris');
-- Should return > 0 rows
```

---

## Part 12: Summary & Next Steps

### What This Plan Provides

1. **Full Audit:** Current onboarding state, schema gaps, RLS issues
2. **5-Step Flow:** Commune-only OR EPCI + batch admins
3. **Schema Migrations:** Payment fields + optional audit table
4. **Edge Functions:** Single + batch admin creation
5. **UI Refactor:** 5 steps, conditional Step 3, form state persistence
6. **RLS Additions:** epci_admin permissions on licenses
7. **Testing Checklist:** 20+ test scenarios
8. **Risk Mitigation:** Identified 6 high-risk areas + solutions
9. **3-Week Execution Plan:** Phased rollout with daily tasks
10. **Implementation Checklist:** 40+ items to track completion

### Immediate Actions (Before Starting)

1. **Review & Approval:** Share this plan with team, get sign-off
2. **Capacity Check:** Confirm developer availability for 3 weeks
3. **Branch Strategy:** Create feature branch `feat/onboarding-refactor`
4. **Communication:** Notify stakeholders of deployment window

### Estimated Effort

- **Total:** ~80–100 developer-hours
  - Schema + migrations: 4 hours
  - Edge Functions: 8 hours
  - UI refactor: 40 hours
  - Testing: 16 hours
  - Documentation + deployment: 12 hours

### Success Criteria

- ✅ Commune-only path works (backward compatible)
- ✅ EPCI path creates all communes + batch admins
- ✅ Payment fields captured and stored
- ✅ RLS enforced correctly
- ✅ No critical bugs in staging
- ✅ All 40+ checklist items complete

---

## Appendix A: File Locations Reference

```
_delivery/
├── src/
│   ├── routes/platform/
│   │   ├── onboarding.tsx              ← MAIN REFACTOR
│   │   ├── epci-tarification.tsx       (reference for EPCI UI patterns)
│   │   └── tarification.tsx
│   ├── routes/admin/
│   │   └── epci.tsx                    (reference for commune table)
│   ├── components/
│   │   ├── PlatformShell.tsx
│   │   ├── CommuneAdminDetailTable.tsx ← CREATE NEW
│   │   └── AdminShell.tsx
│   ├── lib/
│   │   ├── onboarding-types.ts         ← CREATE NEW
│   │   ├── tariffCalculation.ts
│   │   └── ...
│   ├── hooks/
│   │   └── usePlatformAuth.ts
│   └── integrations/supabase/
│       └── types.ts                    (auto-regen after migrations)
├── supabase/
│   ├── migrations/
│   │   ├── 20260620000007_intercommunalities_epci.sql (existing EPCI setup)
│   │   ├── 20260701000001_onboarding_payment_fields.sql ← CREATE NEW
│   │   └── 20260701000002_onboarding_epci_rls.sql     ← CREATE NEW
│   └── functions/
│       ├── create-commune/
│       │   └── index.ts                (modify slightly)
│       └── create-commune-batch/
│           └── index.ts                ← CREATE NEW
└── README.md                           (update with new endpoints)
```

---

## Appendix B: Key SQL Snippets

### Payment Fields Migration

```sql
-- migrations/20260701000001_onboarding_payment_fields.sql

ALTER TABLE commune_licenses
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_validated BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN commune_licenses.payment_date IS 'Date du paiement reçu/traité (ISO 8601)';
COMMENT ON COLUMN commune_licenses.payment_type IS 'Mode de paiement: chorus_pro, transfer, quote_pending';
COMMENT ON COLUMN commune_licenses.payment_validated IS 'Confirmé par l''administrateur';
```

### RLS for EPCI Admin on Licenses

```sql
-- migrations/20260701000002_onboarding_epci_rls.sql

CREATE POLICY "epci_admin_manage_member_licenses"
  ON commune_licenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = commune_licenses.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'epci_admin'
        AND c.epci_id = ur.epci_id
    )
  );
```

---

**End of Implementation Plan**

Date Prepared: 2026-06-29
Prepared By: Claude Agent (Audit Mode)
Status: Ready for Development
