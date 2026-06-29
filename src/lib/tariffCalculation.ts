/**
 * Platform-facing tariff calculation (EPCI / multi-commune).
 *
 * Richer API consumed by the platform routes (epci-tarification,
 * support/tariff-calculator). The pricing source of truth — tier grid and
 * reduction thresholds — lives in ../utils/tariffCalculation; this module
 * adds the per-tier breakdown, annual total and currency formatting on top.
 */
import {
  getTariffByPopulation,
  getReductionByCount,
  getTierInfo,
} from "../utils/tariffCalculation";

/** A single commune fed into an EPCI tariff calculation. */
export interface CommundData {
  name: string;
  population: number;
  code?: string;
}

/** One row of the per-tier breakdown returned by calculateEPCITariff. */
export interface TierBreakdownEntry {
  /** Stable key / tier id (tier name). */
  tier: string;
  /** Display label. */
  label: string;
  /** Number of communes that fall in this tier. */
  count: number;
  /** Monthly price per commune for this tier. */
  price: number;
}

/** Full tariff result for an EPCI (or any list of communes). */
export interface TariffBreakdown {
  /** Number of communes. */
  count: number;
  /** Monthly total before reduction. */
  brut: number;
  /** Reduction applied, expressed as a percentage (e.g. 22). */
  reduction: number;
  /** Monthly total after reduction. */
  final: number;
  /** Annual total (10 months billed — 2 months offered). */
  annualTotal: number;
  /** Per-tier breakdown. */
  tierBreakdown: TierBreakdownEntry[];
}

/**
 * Calculate the pooled tariff for a list of communes (e.g. an EPCI),
 * applying the volume reduction based on the commune count.
 */
export function calculateEPCITariff(communes: CommundData[]): TariffBreakdown {
  const count = communes.length;

  // Sum monthly prices and group communes by pricing tier.
  const groups = new Map<string, TierBreakdownEntry>();
  let brut = 0;

  for (const commune of communes) {
    const price = getTariffByPopulation(commune.population);
    brut += price;

    const tier = getTierInfo(commune.population);
    const existing = groups.get(tier.name);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(tier.name, {
        tier: tier.name,
        label: tier.name,
        count: 1,
        price: tier.monthly,
      });
    }
  }

  const reduction = Math.round(getReductionByCount(count) * 100);
  const final = Math.round(brut * (1 - reduction / 100));
  const annualTotal = final * 10; // 2 mois offerts

  return {
    count,
    brut,
    reduction,
    final,
    annualTotal,
    tierBreakdown: Array.from(groups.values()),
  };
}

/** Format an amount as whole euros, French locale (e.g. "1 490 €"). */
export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}
