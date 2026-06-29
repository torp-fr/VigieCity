/**
 * Onboarding Refactor — TypeScript Type Definitions
 * File: src/lib/onboarding-types.ts
 *
 * Central type definitions for the 5-step onboarding flow.
 * This file should be created and imported by onboarding.tsx
 *
 * Date: 2026-06-29
 */

// ────────────────────────────────────────────────────────────────
// TERRITORY TYPES
// ────────────────────────────────────────────────────────────────

export type TerritoryType = "commune" | "epci";

/**
 * Result from search_communes() PL/pgsql function
 */
export interface SearchCommuneResult {
  id: string;
  name: string;
  insee_code: string;
  department_code: string;
  postal_code: string;
  region: string;
  population: number;
  status: string;
}

/**
 * EPCI (Intercommunality) data
 */
export interface EpciRow {
  id: string;
  name: string;
  siren: string | null;
  type: string;
  region: string | null;
  department: string | null;
  max_communes: number;
  is_active: boolean;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
}

/**
 * Selected territory — either single commune or EPCI
 */
export type SelectedTerritory =
  | { type: "commune"; commune: SearchCommuneResult }
  | { type: "epci"; epci: EpciRow };

// ────────────────────────────────────────────────────────────────
// ADMIN CONTACT (Step 2)
// ────────────────────────────────────────────────────────────────

export interface AdminContact {
  email: string;
  name: string;
  password: string;
}

// ────────────────────────────────────────────────────────────────
// COMMUNE ADMIN DETAIL (Step 3 for EPCI path)
// ────────────────────────────────────────────────────────────────

export interface CommuneAdminDetail {
  commune_id: string;
  commune_name: string;
  admin_email: string;
  admin_name: string;
}

/**
 * Validation errors for a single commune admin
 */
export interface CommuneAdminError {
  commune_id: string;
  field: "admin_email" | "admin_name" | "general";
  message: string;
}

// ────────────────────────────────────────────────────────────────
// PAYMENT DETAILS (Step 4)
// ────────────────────────────────────────────────────────────────

export type PaymentType =
  | "chorus_pro"    // Marché public via Chorus Pro
  | "transfer"      // Virement bancaire
  | "quote_pending" // Devis EPCI en attente de confirmation
  | "stripe";       // Future Stripe integration

export interface PaymentDetails {
  payment_date: string; // ISO date (YYYY-MM-DD)
  payment_type: PaymentType;
  payment_validated: boolean;
}

// ────────────────────────────────────────────────────────────────
// CONFIRMATION & RESULTS (Step 5)
// ────────────────────────────────────────────────────────────────

/**
 * Result of single commune admin creation
 */
export interface SingleAdminCreationResult {
  userId: string;
  email: string;
  success: true;
}

/**
 * Result of single commune creation (commune path)
 */
export interface CommuneCreationConfirmation {
  type: "commune";
  communeId: string;
  communeName: string;
  adminEmail: string;
  plan: string;
  paymentDate: string;
  paymentType: PaymentType;
  adminCreated: boolean;
  adminUserId?: string;
  adminError?: string;
}

/**
 * Per-commune result in batch creation
 */
export interface BatchCommuneResult {
  collectivityId: string;
  communeName: string;
  adminEmail: string;
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Overall batch creation summary
 */
export interface BatchCreationSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: BatchCommuneResult[];
}

/**
 * Result of batch EPCI admin creation
 */
export interface EpciCreationConfirmation {
  type: "epci";
  epciId: string;
  epciName: string;
  communesCount: number;
  paymentDate: string;
  paymentType: PaymentType;
  paymentValidated: boolean;
  batch: BatchCreationSummary;
}

/**
 * Union of both confirmation types
 */
export type CreatedOnboardingData =
  | CommuneCreationConfirmation
  | EpciCreationConfirmation;

// ────────────────────────────────────────────────────────────────
// FORM STATE (for localStorage persistence)
// ────────────────────────────────────────────────────────────────

export interface OnboardingFormState {
  // Step 1: Territory
  territoryType: TerritoryType;
  selectedTerritory: SelectedTerritory | null;

  // Step 2: Admin
  adminEmail: string;
  adminName: string;
  // NOTE: Never store password in localStorage!

  // Step 3: Conditional
  plan?: string; // For commune path
  communeAdmins?: CommuneAdminDetail[]; // For EPCI path

  // Step 4: Payment
  paymentDate: string;
  paymentType: PaymentType;
  paymentValidated: boolean;

  // Metadata
  currentStep: number;
  timestamp: number; // Date.now() when saved
}

// ────────────────────────────────────────────────────────────────
// VALIDATION & ERRORS
// ────────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Step-specific validation result
 */
export interface StepValidation {
  isValid: boolean;
  errors: ValidationError[];
}

// ────────────────────────────────────────────────────────────────
// EDGE FUNCTION PAYLOADS & RESPONSES
// ────────────────────────────────────────────────────────────────

/**
 * Payload for create-commune Edge Function (single commune)
 */
export interface CreateCommunePayload {
  collectivityId: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  plan?: string; // Optional, can be derived from commune_licenses
}

/**
 * Response from create-commune Edge Function
 */
export interface CreateCommuneResponse {
  success: true;
  userId: string;
  email: string;
} | {
  error: string;
}

/**
 * Payload for create-commune-batch Edge Function (EPCI multi-commune)
 */
export interface CreateCommuneBatchPayload {
  epciId: string;
  createdByUserId: string;
  communes: Array<{
    collectivityId: string;
    adminEmail: string;
    adminName: string;
    adminPassword: string;
  }>;
}

/**
 * Per-commune result in batch response
 */
export interface BatchCommuneCreateResult {
  collectivityId: string;
  adminEmail: string;
  userId?: string;
  error?: string;
}

/**
 * Response from create-commune-batch Edge Function
 */
export interface CreateCommuneBatchResponse {
  success: boolean;
  results: BatchCommuneCreateResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// ────────────────────────────────────────────────────────────────
// API RESPONSE TYPES (from Supabase queries)
// ────────────────────────────────────────────────────────────────

/**
 * commune_licenses row (with new payment fields)
 */
export interface CommuneLicenseRow {
  id: string;
  collectivity_id: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  billing_email: string | null;
  payment_date: string | null;      // NEW
  payment_type: string | null;      // NEW
  payment_validated: boolean | null; // NEW
  created_at: string;
  updated_at: string;
  notes: string | null;
  features: Record<string, unknown> | null;
  max_users: number | null;
  auto_renew: boolean | null;
}

/**
 * collectivities row
 */
export interface CollectivityRow {
  id: string;
  name: string;
  insee_code: string | null;
  department_code: string | null;
  epci_id: string | null;
  status: string;
  is_active: boolean;
  email: string | null;
  phone: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
}

// ────────────────────────────────────────────────────────────────
// UI STATE (for step navigation)
// ────────────────────────────────────────────────────────────────

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export interface StepConfig {
  num: OnboardingStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

// ────────────────────────────────────────────────────────────────
// HELPER TYPES
// ────────────────────────────────────────────────────────────────

/**
 * Result of async search operation
 */
export interface AsyncSearchResult<T> {
  query: string;
  results: T[];
  isLoading: boolean;
  error?: string;
  timestamp: number;
}

/**
 * Retry state for failed batch operations
 */
export interface RetryState {
  failedIndices: number[]; // Indices of communes that failed
  retryCount: number;
  lastError?: string;
}

// ────────────────────────────────────────────────────────────────
// CONSTANTS & ENUMS
// ────────────────────────────────────────────────────────────────

export const PAYMENT_TYPE_OPTIONS: Array<{
  value: PaymentType;
  label: string;
  description: string;
}> = [
  {
    value: "chorus_pro",
    label: "Chorus Pro",
    description: "Marché public via la plateforme Chorus Pro",
  },
  {
    value: "transfer",
    label: "Virement bancaire",
    description: "Paiement direct par virement",
  },
  {
    value: "quote_pending",
    label: "Devis en attente",
    description: "Contrat EPCI — paiement en attente de confirmation",
  },
  {
    value: "stripe",
    label: "Stripe (Future)",
    description: "Intégration Stripe — non disponible actuellement",
  },
];

export const PLAN_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  {
    value: "trial",
    label: "Trial 30 jours",
    description: "Accès complet, sans engagement",
  },
  {
    value: "starter",
    label: "Starter",
    description: "Jusqu'à 5 000 habitants",
  },
  {
    value: "pro",
    label: "Pro",
    description: "Communes jusqu'à 50 000 hab.",
  },
  {
    value: "enterprise",
    label: "Enterprise",
    description: "Communes >50 000 hab. + SLA",
  },
];

// ────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS (optional, can go in separate file)
// ────────────────────────────────────────────────────────────────

/**
 * Create empty form state for new onboarding session
 */
export function createEmptyFormState(): OnboardingFormState {
  return {
    territoryType: "commune",
    selectedTerritory: null,
    adminEmail: "",
    adminName: "",
    paymentDate: new Date().toISOString().split("T")[0], // Today's date
    paymentType: "chorus_pro",
    paymentValidated: false,
    currentStep: 1,
    timestamp: Date.now(),
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength (minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 number)
 */
export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

/**
 * Validate payment date is not in future
 */
export function isValidPaymentDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
}

/**
 * Get localStorage key for onboarding draft
 */
export function getOnboardingDraftKey(sessionId?: string): string {
  return `onboarding-draft-${sessionId || "default"}`;
}

/**
 * Serialize form state for localStorage (excluding password)
 */
export function serializeFormState(state: Partial<OnboardingFormState>): string {
  const serializable: Partial<OnboardingFormState> = {
    ...state,
    // Explicitly exclude password (never stored)
  };
  return JSON.stringify(serializable);
}

/**
 * Deserialize form state from localStorage
 */
export function deserializeFormState(json: string): Partial<OnboardingFormState> | null {
  try {
    return JSON.parse(json) as Partial<OnboardingFormState>;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────
// END OF TYPE DEFINITIONS
// ────────────────────────────────────────────────────────────────
