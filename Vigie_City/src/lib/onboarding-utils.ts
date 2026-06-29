/**
 * Onboarding utility functions and types
 * Supports both single-commune and EPCI multi-commune flows
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type TerritoryType = "commune" | "epci";

export interface Territory {
  type: TerritoryType;
  // Commune fields
  communeId?: string;
  communeName?: string;
  inseeCode?: string;
  department?: string;
  population?: number;
  // EPCI fields
  epciId?: string;
  epciName?: string;
  epciSiren?: string;
  epciType?: string;
  communeCount?: number;
}

export interface AdminContact {
  email: string;
  name: string;
  phone?: string;
  password?: string; // Only for initial setup
}

export interface CommuneAdmin {
  inseeCode: string;
  communeName: string;
  email: string;
  name: string;
  phone?: string;
}

export interface PaymentInfo {
  date: Date | null;
  type: "chorus_pro" | "transfer" | "quote_pending";
  validated: boolean;
}

export interface OnboardingFormData {
  territory: Territory | null;
  epciAdminContact: AdminContact;
  // For commune path:
  selectedPlan?: "hameau" | "village" | "bourg" | "metropole";
  // For EPCI path:
  communeAdmins: CommuneAdmin[];
  paymentInfo: PaymentInfo;
}

export interface OnboardingValidationResult {
  isValid: boolean;
  errors: string[];
}

// ── Validation functions ─────────────────────────────────────────────────

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Au minimum 8 caractères");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Au moins 1 majuscule");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Au moins 1 chiffre");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Au moins 1 caractère spécial (!@#$%...)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateInseeCode(code: string): boolean {
  return /^\d{5}$/.test(code.trim());
}

export function validatePhoneNumber(phone: string): boolean {
  // Accept various French phone formats
  const cleaned = phone.replace(/[\s\-().]/g, "");
  return /^(?:(?:\+|00)33|0)[1-9](?:\d{8}|\d{9})$/.test(cleaned);
}

export function validateStep1Territory(territory: Territory | null): OnboardingValidationResult {
  if (!territory) {
    return { isValid: false, errors: ["Veuillez sélectionner un territoire"] };
  }

  if (territory.type === "commune") {
    if (!territory.communeId || !territory.communeName) {
      return { isValid: false, errors: ["Commune invalide"] };
    }
    if (!territory.inseeCode || !validateInseeCode(territory.inseeCode)) {
      return { isValid: false, errors: ["Code INSEE invalide"] };
    }
  } else if (territory.type === "epci") {
    if (!territory.epciId || !territory.epciName) {
      return { isValid: false, errors: ["EPCI invalide"] };
    }
    if (!territory.communeCount || territory.communeCount === 0) {
      return { isValid: false, errors: ["L'EPCI doit avoir au moins 1 commune"] };
    }
  } else {
    return { isValid: false, errors: ["Type de territoire invalide"] };
  }

  return { isValid: true, errors: [] };
}

export function validateStep2Admin(admin: AdminContact): OnboardingValidationResult {
  const errors: string[] = [];

  if (!admin.email || !validateEmail(admin.email)) {
    errors.push("Email invalide");
  }

  if (!admin.name || admin.name.trim().length === 0) {
    errors.push("Nom obligatoire");
  }

  if (admin.password) {
    const pwdValidation = validatePassword(admin.password);
    if (!pwdValidation.isValid) {
      errors.push(`Mot de passe: ${pwdValidation.errors.join(", ")}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateStep3CommePlan(plan: string | undefined): OnboardingValidationResult {
  if (!plan || !["hameau", "village", "bourg", "metropole"].includes(plan)) {
    return { isValid: false, errors: ["Sélectionnez un plan"] };
  }
  return { isValid: true, errors: [] };
}

export function validateStep3CommuneAdmins(admins: CommuneAdmin[]): OnboardingValidationResult {
  const errors: string[] = [];

  if (admins.length === 0) {
    errors.push("Au minimum 1 commune requise");
  }

  const emails = new Set<string>();
  const insees = new Set<string>();

  for (let i = 0; i < admins.length; i++) {
    const admin = admins[i];

    if (!admin.communeName || !admin.inseeCode) {
      errors.push(`Ligne ${i + 1}: Commune invalide`);
    }

    if (!validateInseeCode(admin.inseeCode)) {
      errors.push(`Ligne ${i + 1}: Code INSEE invalide`);
    }

    if (insees.has(admin.inseeCode)) {
      errors.push(`Ligne ${i + 1}: Commune en doublon`);
    }
    insees.add(admin.inseeCode);

    if (!validateEmail(admin.email)) {
      errors.push(`Ligne ${i + 1}: Email invalide`);
    }

    if (emails.has(admin.email)) {
      errors.push(`Ligne ${i + 1}: Email en doublon`);
    }
    emails.add(admin.email);

    if (!admin.name || admin.name.trim().length === 0) {
      errors.push(`Ligne ${i + 1}: Nom obligatoire`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePaymentInfo(payment: PaymentInfo): OnboardingValidationResult {
  const errors: string[] = [];

  if (!payment.date) {
    errors.push("Date de paiement obligatoire");
  }

  if (!payment.type || !["chorus_pro", "transfer", "quote_pending"].includes(payment.type)) {
    errors.push("Type de paiement obligatoire");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ── Formatting functions ──────────────────────────────────────────────────

export function formatTerritoryDisplay(territory: Territory | null): string {
  if (!territory) return "";

  if (territory.type === "commune") {
    return `${territory.communeName} (INSEE: ${territory.inseeCode})`;
  }

  const count = territory.communeCount || 0;
  return `${territory.epciName} (${count} communes)`;
}

export function formatPaymentType(type: string): string {
  const map: Record<string, string> = {
    chorus_pro: "Chorus Pro",
    transfer: "Virement",
    quote_pending: "Devis en attente",
  };
  return map[type] || type;
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// ── Plan information ─────────────────────────────────────────────────────

export const PLAN_INFO: Record<string, {
  label: string;
  description: string;
  priceRange: string;
  color: string;
}> = {
  hameau: {
    label: "Hameau",
    description: "Communes < 1 000 habitants",
    priceRange: "19 €/mois",
    color: "bg-green-50 border-green-200",
  },
  village: {
    label: "Village",
    description: "Communes 1 000 - 5 000 habitants",
    priceRange: "49 €/mois",
    color: "bg-blue-50 border-blue-200",
  },
  bourg: {
    label: "Bourg",
    description: "Communes 5 000 - 20 000 habitants",
    priceRange: "149 €/mois",
    color: "bg-purple-50 border-purple-200",
  },
  metropole: {
    label: "Métropole",
    description: "Communes > 20 000 habitants",
    priceRange: "499 €/mois",
    color: "bg-orange-50 border-orange-200",
  },
};

// ── State initialization ──────────────────────────────────────────────────

export function initializeFormData(): OnboardingFormData {
  return {
    territory: null,
    epciAdminContact: {
      email: "",
      name: "",
      phone: "",
      password: "",
    },
    selectedPlan: undefined,
    communeAdmins: [],
    paymentInfo: {
      date: new Date(),
      type: "chorus_pro",
      validated: false,
    },
  };
}

// ── Result formatting ─────────────────────────────────────────────────────

export interface BatchCreationResult {
  success: boolean;
  epciUserId?: string;
  communesCreated: number;
  communesFailed: Array<{
    communeName: string;
    inseeCode?: string;
    error: string;
  }>;
  details: {
    epciLicenseId?: string;
    communeLicenseIds: string[];
    adminProfileIds: string[];
  };
  timestamp: string;
}

export function formatBatchResult(result: BatchCreationResult): {
  successCount: number;
  failureCount: number;
  summary: string;
  failures: string[];
} {
  const failures = result.communesFailed.map(
    (f) => `${f.communeName} (${f.inseeCode}): ${f.error}`,
  );

  return {
    successCount: result.communesCreated,
    failureCount: result.communesFailed.length,
    summary:
      result.communesCreated > 0
        ? `${result.communesCreated} commune(s) créée(s)`
        : "Aucune commune créée",
    failures,
  };
}
