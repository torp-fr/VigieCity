/**
 * Tariff calculation utilities for VigieCity
 * Handles both individual communes and EPCI dynamic pricing
 */

export const TIER_DATA = [
  { name: "Hameau", range: "< 500 hab.", monthly: 19, annual: 190, maxPopulation: 500 },
  { name: "Village", range: "501 – 3 500 hab.", monthly: 49, annual: 490, maxPopulation: 3500 },
  { name: "Bourg", range: "3 501 – 10 000 hab.", monthly: 89, annual: 890, maxPopulation: 10000 },
  { name: "Bastide", range: "10 001 – 25 000 hab.", monthly: 149, annual: 1490, maxPopulation: 25000 },
  { name: "Cité", range: "25 001 – 50 000 hab.", monthly: 289, annual: 2890, maxPopulation: 50000 },
  { name: "Métropole", range: "> 50 000 hab.", monthly: 499, annual: 4990, maxPopulation: Infinity },
] as const;

/**
 * Get tariff by population
 */
export function getTariffByPopulation(population: number): number {
  for (const tier of TIER_DATA) {
    if (population < tier.maxPopulation) {
      return tier.monthly;
    }
  }
  return TIER_DATA[TIER_DATA.length - 1].monthly;
}

/**
 * Get reduction percentage based on number of communes in EPCI
 */
export function getReductionByCount(communeCount: number): number {
  if (communeCount === 1) return 0;
  if (communeCount <= 3) return 0.08;  // 8%
  if (communeCount <= 10) return 0.15; // 15%
  return 0.22; // 22%
}

/**
 * Calculate EPCI tariff from a list of communes
 */
export interface EPCITariffResult {
  brut: number;
  reductionPercent: number;
  final: number;
  breakdown: {
    count: number;
    reductionPercentDisplay: string;
  };
}

export function calculateEPCITariff(communes: Array<{ population: number }>): EPCITariffResult {
  const tarifs = communes.map((c) => getTariffByPopulation(c.population));
  const brut = tarifs.reduce((a, b) => a + b, 0);
  const reductionPercent = getReductionByCount(communes.length);
  const final = Math.round(brut * (1 - reductionPercent) * 100) / 100;

  return {
    brut,
    reductionPercent,
    final,
    breakdown: {
      count: communes.length,
      reductionPercentDisplay: `${(reductionPercent * 100).toFixed(0)}%`,
    },
  };
}

/**
 * Get tier name and range from population
 */
export function getTierInfo(population: number): (typeof TIER_DATA)[number] {
  for (const tier of TIER_DATA) {
    if (population < tier.maxPopulation) {
      return tier;
    }
  }
  return TIER_DATA[TIER_DATA.length - 1];
}
