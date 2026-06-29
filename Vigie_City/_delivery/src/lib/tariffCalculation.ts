/**
 * EPCI Dynamic Tarification Module
 *
 * Tariff tiers based on commune population + volume reductions for EPCIs
 * Supports both single-commune and multi-commune (EPCI) pricing
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type TariffTier = "hameau" | "village" | "bourg" | "bastide" | "cite" | "metropole";

export interface CommundData {
  name: string;
  population: number;
  code?: string; // INSEE code
}

export interface TariffBreakdown {
  brut: number;
  reduction: number; // percentage (0-22)
  final: number;
  count: number; // number of communes
  monthlyTotal: number;
  annualTotal: number;
  tierBreakdown: {
    tier: TariffTier;
    label: string;
    price: number;
    count: number;
  }[];
}

export interface TierInfo {
  tier: TariffTier;
  label: string;
  minPopulation: number;
  maxPopulation: number | null;
  monthlyPrice: number;
  annualPrice: number;
}

// ── Tariff Tiers (by population) ───────────────────────────────────────────────

const TARIFF_TIERS: Record<TariffTier, TierInfo> = {
  hameau: {
    tier: "hameau",
    label: "Hameau",
    minPopulation: 0,
    maxPopulation: 500,
    monthlyPrice: 19,
    annualPrice: 190,
  },
  village: {
    tier: "village",
    label: "Village",
    minPopulation: 501,
    maxPopulation: 3500,
    monthlyPrice: 49,
    annualPrice: 490,
  },
  bourg: {
    tier: "bourg",
    label: "Bourg",
    minPopulation: 3501,
    maxPopulation: 10000,
    monthlyPrice: 89,
    annualPrice: 890,
  },
  bastide: {
    tier: "bastide",
    label: "Bastide",
    minPopulation: 10001,
    maxPopulation: 25000,
    monthlyPrice: 149,
    annualPrice: 1490,
  },
  cite: {
    tier: "cite",
    label: "Cité",
    minPopulation: 25001,
    maxPopulation: 50000,
    monthlyPrice: 289,
    annualPrice: 2890,
  },
  metropole: {
    tier: "metropole",
    label: "Métropole",
    minPopulation: 50001,
    maxPopulation: null,
    monthlyPrice: 499,
    annualPrice: 4990,
  },
};

// ── Reduction Tiers (by # communes) ────────────────────────────────────────────

const REDUCTION_TIERS = [
  { minCommunes: 1, maxCommunes: 1, reduction: 0 },
  { minCommunes: 2, maxCommunes: 3, reduction: 8 },
  { minCommunes: 4, maxCommunes: 10, reduction: 15 },
  { minCommunes: 11, maxCommunes: Infinity, reduction: 22 },
];

// ── Public Functions ───────────────────────────────────────────────────────────

/**
 * Get tariff by population
 * @param population Commune population
 * @returns Monthly tariff in EUR
 */
export function getTariffByPopulation(population: number): number {
  const tier = getTierByPopulation(population);
  return tier.monthlyPrice;
}

/**
 * Get tier information by population
 * @param population Commune population
 * @returns TierInfo object
 */
export function getTierByPopulation(population: number): TierInfo {
  for (const [, tierInfo] of Object.entries(TARIFF_TIERS)) {
    if (
      population >= tierInfo.minPopulation &&
      (tierInfo.maxPopulation === null || population <= tierInfo.maxPopulation)
    ) {
      return tierInfo;
    }
  }
  // Fallback to métropole if out of range
  return TARIFF_TIERS.metropole;
}

/**
 * Get reduction percentage by number of communes
 * @param communeCount Number of communes in EPCI
 * @returns Reduction percentage (0-22)
 */
export function getReductionByCount(communeCount: number): number {
  for (const tier of REDUCTION_TIERS) {
    if (communeCount >= tier.minCommunes && communeCount <= tier.maxCommunes) {
      return tier.reduction;
    }
  }
  return 22; // Default to max reduction
}

/**
 * Get tier info
 * @param tier TariffTier identifier
 * @returns TierInfo object
 */
export function getTierInfo(tier: TariffTier): TierInfo {
  return TARIFF_TIERS[tier];
}

/**
 * Calculate EPCI tariff with reductions
 * @param communes Array of commune data {population, name}
 * @returns TariffBreakdown with brut, reduction, final costs
 */
export function calculateEPCITariff(communes: CommundData[]): TariffBreakdown {
  if (communes.length === 0) {
    return {
      brut: 0,
      reduction: 0,
      final: 0,
      count: 0,
      monthlyTotal: 0,
      annualTotal: 0,
      tierBreakdown: [],
    };
  }

  // Group communes by tier
  const tierMap: Record<TariffTier, { tier: TierInfo; count: number }> = {
    hameau: { tier: TARIFF_TIERS.hameau, count: 0 },
    village: { tier: TARIFF_TIERS.village, count: 0 },
    bourg: { tier: TARIFF_TIERS.bourg, count: 0 },
    bastide: { tier: TARIFF_TIERS.bastide, count: 0 },
    cite: { tier: TARIFF_TIERS.cite, count: 0 },
    metropole: { tier: TARIFF_TIERS.metropole, count: 0 },
  };

  let brut = 0;

  // Calculate brut tariff
  for (const commune of communes) {
    const tierInfo = getTierByPopulation(commune.population);
    tierMap[tierInfo.tier].count += 1;
    brut += tierInfo.monthlyPrice;
  }

  // Calculate reduction
  const reductionPercent = getReductionByCount(communes.length);
  const reductionAmount = (brut * reductionPercent) / 100;
  const final = brut - reductionAmount;

  // Build tier breakdown
  const tierBreakdown = Object.values(tierMap)
    .filter((t) => t.count > 0)
    .map((t) => ({
      tier: t.tier.tier,
      label: t.tier.label,
      price: t.tier.monthlyPrice,
      count: t.count,
    }));

  return {
    brut: Math.round(brut * 100) / 100,
    reduction: reductionPercent,
    final: Math.round(final * 100) / 100,
    count: communes.length,
    monthlyTotal: Math.round(final * 100) / 100,
    annualTotal: Math.round(final * 12 * 100) / 100,
    tierBreakdown,
  };
}

/**
 * Format tariff for display
 * @param amount Amount in EUR
 * @returns Formatted string (e.g., "89€", "1.234€")
 */
export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get all tariff tiers (for dropdowns, reference)
 * @returns Array of TierInfo
 */
export function getAllTiers(): TierInfo[] {
  return Object.values(TARIFF_TIERS);
}
