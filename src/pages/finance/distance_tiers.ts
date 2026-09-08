// =============================================================
// SBS DISTANCE TIERS TABLE & RESOLVER
// Single Source of Truth reference for SBS Hauling distance brackets
// =============================================================

export interface SBSDistanceTier {
  min: number;
  max: number;
  rangeLabel: string;
  rate: number;
}

export const SBS_DISTANCE_TIERS: SBSDistanceTier[] = [
  { min: 0, max: 250, rangeLabel: "0-250", rate: 5485 },
  { min: 251, max: 500, rangeLabel: "251-500", rate: 6915 },
  { min: 501, max: 750, rangeLabel: "501-750", rate: 8346 },
  { min: 751, max: 1000, rangeLabel: "751-1000", rate: 9777 },
  { min: 1001, max: 1250, rangeLabel: "1001-1250", rate: 11208 },
  { min: 1251, max: 1500, rangeLabel: "1251-1500", rate: 12638 },
  { min: 1501, max: 1750, rangeLabel: "1501-1750", rate: 14069 },
  { min: 1751, max: 2000, rangeLabel: "1751-2000", rate: 15500 },
  { min: 2001, max: 2250, rangeLabel: "2001-2250", rate: 16930 },
  { min: 2251, max: 2500, rangeLabel: "2251-2500", rate: 18361 },
  { min: 2501, max: 2750, rangeLabel: "2501-2750", rate: 19792 },
  { min: 2751, max: 3000, rangeLabel: "2751-3000", rate: 21223 },
  { min: 3001, max: 3250, rangeLabel: "3001-3250", rate: 22653 },
  { min: 3251, max: 3500, rangeLabel: "3251-3500", rate: 24084 },
  { min: 3501, max: 3750, rangeLabel: "3501-3750", rate: 25515 },
  { min: 3751, max: 4000, rangeLabel: "3751-4000", rate: 26945 },
  { min: 4001, max: 4250, rangeLabel: "4001-4250", rate: 28376 },
  { min: 4251, max: 4500, rangeLabel: "4251-4500", rate: 29807 },
  { min: 4501, max: 4750, rangeLabel: "4501-4750", rate: 31237 },
  { min: 4751, max: 5000, rangeLabel: "4751-5000", rate: 32668 },
  { min: 5001, max: 5250, rangeLabel: "5001-5250", rate: 34099 },
  { min: 5251, max: 5500, rangeLabel: "5251-5500", rate: 35530 },
  { min: 5501, max: 5750, rangeLabel: "5501-5750", rate: 36960 },
  { min: 5751, max: 6000, rangeLabel: "5751-6000", rate: 38391 },
  { min: 6001, max: 6250, rangeLabel: "6001-6250", rate: 39822 },
  { min: 6251, max: 6500, rangeLabel: "6251-6500", rate: 41252 },
  { min: 6501, max: 6750, rangeLabel: "6501-6750", rate: 42683 },
  { min: 6751, max: 7000, rangeLabel: "6751-7000", rate: 44114 },
  { min: 7001, max: 7250, rangeLabel: "7001-7250", rate: 45545 },
  { min: 7251, max: 7500, rangeLabel: "7251-7500", rate: 46975 },
  { min: 7501, max: 7750, rangeLabel: "7501-7750", rate: 48406 },
  { min: 7751, max: 8000, rangeLabel: "7751-8000", rate: 49837 },
  { min: 8001, max: 8250, rangeLabel: "8001-8250", rate: 51267 },
  { min: 8251, max: 8500, rangeLabel: "8251-8500", rate: 52698 },
  { min: 8501, max: 8750, rangeLabel: "8501-8750", rate: 54129 },
  { min: 8751, max: 9000, rangeLabel: "8751-9000", rate: 55560 },
  { min: 9001, max: 9250, rangeLabel: "9001-9250", rate: 56990 },
  { min: 9251, max: 9500, rangeLabel: "9251-9500", rate: 58421 },
  { min: 9501, max: 9750, rangeLabel: "9501-9750", rate: 59852 },
  { min: 9751, max: 10000, rangeLabel: "9751-10000", rate: 61282 },
];

export function getSBSTarifByDistance(
  distance: number,
  dynamicSowRows?: any[]
): { rate: number; tier: SBSDistanceTier | null } {
  if (distance === undefined || distance === null || Number(distance) <= 0) {
    return { rate: 0, tier: null };
  }
  const dist = Number(distance);

  // Prioritaskan baris tarif dari Master Data Variable SOW jika tersedia
  if (dynamicSowRows && dynamicSowRows.length > 0) {
    const sbsSows = dynamicSowRows.filter(
      (s) =>
        (s.customer === "SBS" || s.customerCode === "SBS") &&
        (s.rateIDR > 0 || s.tier1Rate > 0)
    );
    for (const sow of sbsSows) {
      const min = sow.baseDistanceMeters || 0;
      const max = sow.maxDistanceMeters || (min > 0 ? min + 250 : 0);
      if (max > 0 && dist >= min && dist <= max) {
        const r = sow.rateIDR || sow.tier1Rate || 0;
        return {
          rate: r,
          tier: { min, max, rangeLabel: `${min}-${max}`, rate: r },
        };
      }
    }
  }

  const matched = SBS_DISTANCE_TIERS.find(
    (t) => dist >= t.min && dist <= t.max
  );
  if (matched) {
    return { rate: matched.rate, tier: matched };
  }
  if (dist > 10000) {
    const maxTier = SBS_DISTANCE_TIERS[SBS_DISTANCE_TIERS.length - 1];
    return { rate: maxTier.rate, tier: maxTier };
  }
  return { rate: 0, tier: null };
}
