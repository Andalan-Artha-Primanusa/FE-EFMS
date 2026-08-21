// BA (Berita Acara) Invoice Calculation Helpers
// Source: extracted from FinancePage.tsx L1071–L1150
// All functions are pure — no React state dependencies

/**
 * Returns true if a BA item represents a distance/overhaul line,
 * as opposed to a volume production line.
 */
export function isDistanceItem(item: any): boolean {
  if (!item) return false;
  return Boolean(
    item.isDistanceVar ||
    item.category === "Over Distance" ||
    (item.material && (
      item.material.toLowerCase().includes("overhaul") ||
      item.material.toLowerCase().includes("over distance") ||
      item.material.toLowerCase().includes("distance")
    ))
  );
}

/**
 * Resolve effective volume for a BA line item.
 * For distance items, look up parent material's volume instead.
 * @param isSurvey  true = use adjustedVolume (post-survey), false = initialVolume
 */
export function getBAEffectiveVolume(item: any, allItems: any[], isSurvey: boolean = false): number {
  if (isDistanceItem(item)) {
    const parent = allItems.find((p) => {
      if (p.id === item.id) return false;
      if (isDistanceItem(p)) return false;
      if (item.parentMaterial) return p.material === item.parentMaterial;
      const mLow = (item.material || "").toLowerCase();
      const pLow = (p.material || "").toLowerCase();
      if (mLow.includes("ob") || mLow.includes("waste") || mLow.includes("overburden")) return pLow.includes("ob") || pLow.includes("waste") || pLow.includes("overburden");
      if (mLow.includes("coal") || mLow.includes("batubara")) return pLow.includes("coal") || pLow.includes("batubara");
      if (mLow.includes("top soil")) return pLow.includes("top soil");
      if (mLow.includes("limonite")) return pLow.includes("limonite");
      if (mLow.includes("saprolite")) return pLow.includes("saprolite");
      return false;
    });
    if (parent) {
      return isSurvey
        ? Number(parent.adjustedVolume ?? parent.initialVolume ?? 0)
        : Number(parent.initialVolume || 0);
    }
  }
  return isSurvey
    ? Number(item.adjustedVolume ?? item.initialVolume ?? 0)
    : Number(item.initialVolume || 0);
}

/**
 * Calculate IDR subtotal for a single BA line item.
 * Handles distance-based rates (per BCM.Hm, per km) separately from flat rates.
 */
export function getBAItemSubtotal(item: any, volume: number): number {
  const r = Number(item.rate || 0);
  if (isDistanceItem(item)) {
    const rawDist = Number(item.distanceWeightAvg ?? 1000);
    const distMtr = rawDist > 50 ? rawDist : rawDist * 100;
    const baseMtr = item.baseMtr || 1000;
    const diffMtr = Math.max(0, distMtr - baseMtr);

    if (item.unit === "Bcm.Hm" || item.material?.toLowerCase().includes("hm")) {
      const diffHm = diffMtr / 100;
      return Math.round(volume * diffHm * (r > 1000 ? r / 1000 : r));
    }
    if (item.material?.toLowerCase().includes("coal") || item.material?.toLowerCase().includes("batubara")) {
      const diffCoalKm = diffMtr / 1000;
      return Math.round(volume * diffCoalKm * (r > 1000 ? r / 1000 : r));
    }
    const diff100 = diffMtr / 100;
    return Math.round(volume * diff100 * (r > 1000 ? r / 1000 : r));
  }
  return Math.round(volume * r);
}

/**
 * Normalise a raw BA row from the API by recalculating workAmount
 * from its items array if available.
 */
export function normalizeBARow(r: any): any {
  if (!r) return r;
  if (r.items && Array.isArray(r.items) && r.items.length > 0) {
    const isSurvey =
      r.statusBA === "Approved" ||
      r.statusBA === "Ready to Invoice" ||
      r.statusBA === "Arsip" ||
      (r.adjustedWorkAmount !== undefined && r.adjustedWorkAmount > 0);

    const sumInit = r.items.reduce((acc: number, it: any) => {
      const vol = getBAEffectiveVolume(it, r.items, false);
      return acc + getBAItemSubtotal(it, vol);
    }, 0);
    const sumAdj = r.items.reduce((acc: number, it: any) => {
      const vol = getBAEffectiveVolume(it, r.items, true);
      return acc + getBAItemSubtotal(it, vol);
    }, 0);

    const realWorkAmount = isSurvey && sumAdj > 0 ? sumAdj : sumInit > 0 ? sumInit : Number(r.workAmount || 0);
    return {
      ...r,
      initialWorkAmount: sumInit > 0 ? sumInit : r.initialWorkAmount,
      adjustedWorkAmount: sumAdj > 0 ? sumAdj : r.adjustedWorkAmount,
      workAmount: realWorkAmount,
    };
  }
  return r;
}

/**
 * Look up the SOW master rate for a given customer/item from dynamic options.
 * Falls back to the provided fallbackRate if no match found.
 */
export function getSowMasterRate(
  customer: string,
  itemName: string,
  fallbackRate: number,
  isUSD: boolean = false,
  dynamicSowOptions: any[] = [],
  mRate: number = 17923.30
): number {
  const custUpper = customer.toUpperCase();
  const itemNorm = itemName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = dynamicSowOptions.find((s) => {
    const sCust = (s.customer || s.customerCode || "").toUpperCase();
    const sName = (s.itemName || s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      (sCust === custUpper || (!sCust && custUpper === "POS")) &&
      (sName.includes(itemNorm) || itemNorm.includes(sName))
    );
  });
  if (match) {
    if (isUSD && match.rateUSD) return match.rateUSD;
    if (!isUSD && match.rateIDR) return match.rateIDR;
    if (!isUSD && match.rateUSD) return Math.round(match.rateUSD * mRate);
  }
  return fallbackRate;
}
