// =============================================================
// CONTROL RUMUS FINANCE (BACKEND SSOT BRIDGE)
// Business Logic / Service Layer: 100 – 300 lines.
// Bridges frontend inputs to authoritative Backend Domain Services
// and provides reactive line-item pricing calculations.
// =============================================================

import {
  calculateMiningInvoice,
  calculateBATracker,
  calculateInvoicePreview,
} from "../../lib/api";
import {
  SBS_DISTANCE_TIERS,
  getSBSTarifByDistance,
  type SBSDistanceTier,
} from "./distance_tiers";

export { SBS_DISTANCE_TIERS, getSBSTarifByDistance, type SBSDistanceTier };

export async function fetchServerCalculations(input: any) {
  try {
    const result = await calculateMiningInvoice(input);
    return result;
  } catch (error) {
    console.error("Gagal mengambil kalkulasi server", error);
    return null;
  }
}

export async function fetchServerBACalculation(input: any) {
  try {
    const result = await calculateBATracker(input);
    return result;
  } catch (error) {
    console.error("Gagal mengambil kalkulasi BA server", error);
    return null;
  }
}

export async function fetchServerInvoicePreview(input: any) {
  try {
    const result = await calculateInvoicePreview(input);
    return result;
  } catch (error) {
    console.error("Gagal mengambil preview kalkulasi invoice server", error);
    return null;
  }
}

/** Hitung Raise & Fall Index dari harga solar, upah, dan kurs. */
export function calcRFIndex(
  fuelPriceUSD: number,
  laborPriceIDR: number,
  mRate: number,
  rfMaster?: any
): number {
  if (!rfMaster) {
    return 1.0;
  }

  if (
    rfMaster.formulaScheme === "SINGLE_FACTOR_FUEL" ||
    rfMaster.customerCode === "BGG"
  ) {
    const baseFo = rfMaster.baseFuelFo || 9000;
    const actualFn = rfMaster.actualFuelFn || 21601.53;
    return Number((0.6 + 0.4 * (actualFn / baseFo)).toFixed(3));
  }

  // POS (TRIPLE_FACTOR_DLF): D + L + F
  const baseFuelPrice = rfMaster.baseFuelFo || 10699.97;
  const baseLaborPrice = rfMaster.baseLaborLo || 3594536;
  const baseForexRate = rfMaster.baseForexXo || 15388.75;
  const weightA = rfMaster.weightFuelA || 0.34;
  const weightB = rfMaster.weightLaborB || 0.25;
  const weightC = rfMaster.weightFixedC || 0.41;

  const fuelTerm = (weightA * (fuelPriceUSD * mRate)) / baseFuelPrice;
  const laborTerm =
    weightB > 0 && baseLaborPrice > 0 && baseForexRate > 0
      ? (weightB * (laborPriceIDR * mRate)) / (baseLaborPrice * baseForexRate)
      : 0;
  const fixedTerm = weightC;

  return Number((fuelTerm + laborTerm + fixedTerm).toFixed(3));
}

/** Pabrik rumus item invoice: dependensi state disuntikkan lewat parameter. */
export function createFinanceCalculations(deps: {
  formData: any;
  invLineItems: any[];
  rfIndexCalculated: number;
  getSowMasterRate: (
    customer: string,
    itemName: string,
    fallbackRate: number,
    isUSD?: boolean
  ) => number;
  mRate: number;
}) {
  const { formData, invLineItems, rfIndexCalculated, mRate } = deps;

  const getItemEffectiveVolume = (item: any) => {
    if (!item) return 0;
    const cust = formData.customerCode || "";

    if (cust === "BGG") {
      if (item.section === "C") {
        if (item.subSection?.includes("OB") || item.description?.includes("OB")) {
          return (
            item.volume ||
            invLineItems
              .filter((i) => i.section === "A")
              .reduce((sum, i) => sum + (i.volume || 0), 0)
          );
        }
        if (item.subSection?.includes("Coal") || item.description?.includes("Coal")) {
          return (
            item.volume ||
            invLineItems
              .filter((i) => i.section === "B")
              .reduce((sum, i) => sum + (i.volume || 0), 0)
          );
        }
      }
      if (item.section === "D") {
        if (item.description?.includes("75%")) {
          return (
            invLineItems.find(
              (i) => i.section === "A" && i.description?.includes("75%")
            )?.volume || 0
          );
        }
        if (item.description?.includes("25%")) {
          return (
            invLineItems.find(
              (i) => i.section === "A" && i.description?.includes("25%")
            )?.volume || 0
          );
        }
        if (item.subSection?.includes("D2") || item.description?.includes("OB")) {
          return invLineItems
            .filter((i) => i.section === "A")
            .reduce((sum, i) => sum + (i.volume || 0), 0);
        }
        if (
          item.subSection?.includes("D3") ||
          (item.description?.includes("Coal Winning") &&
            !item.description?.includes("Over Distance"))
        ) {
          return invLineItems
            .filter((i) => i.section === "B")
            .reduce((sum, i) => sum + (i.volume || 0), 0);
        }
        if (item.subSection?.includes("D4") || item.description?.includes("Coal")) {
          return invLineItems
            .filter((i) => i.section === "B")
            .reduce((sum, i) => sum + (i.volume || 0), 0);
        }
      }
      return item.volume || 0;
    }

    if (cust === "POS") {
      if (item.section === "B") {
        if (item.code === "B1" || item.description?.includes("OB Removal")) {
          return (
            invLineItems.find(
              (i) =>
                i.section === "A" &&
                (i.code === "A1" || i.description?.includes("OVER BURDEN"))
            )?.volume || 0
          );
        }
        if (item.code === "B2" || item.description?.includes("Top Soil")) {
          return (
            invLineItems.find(
              (i) =>
                i.section === "A" &&
                (i.code === "A2" || i.description?.includes("TOP SOIL"))
            )?.volume || 0
          );
        }
      }
    }
    return item.volume || 0;
  };

  const getItemEffectiveOverhaulMtr = (item: any) => {
    if (!item) return 1000;
    return item.overhaulMtr ?? item.baseMtr ?? 1000;
  };

  const calculateItemRateAndAmount = (item: any, currentCust?: string) => {
    const cust = currentCust || formData.customerCode || "";
    const rfFactor = rfIndexCalculated - 1;
    const vol = getItemEffectiveVolume(item);
    const mtr = getItemEffectiveOverhaulMtr(item);

    let unitRate = 0;
    let amount = 0;

    if (cust === "BGG") {
      if (item.section === "A" || item.section === "B") {
        unitRate = Number(item.unitRateIDR || 0);
        amount = Math.round(vol * unitRate);
        return { unitRate, amount };
      }
      if (item.section === "C") {
        const diffMtr = mtr - 1000;
        unitRate =
          item.unitRateIDR !== undefined && item.unitRateIDR !== 0
            ? Number(item.unitRateIDR)
            : Math.round(
                ((item.subSection?.includes("Coal") ||
                item.description?.includes("Coal")
                  ? 550
                  : 650) *
                  diffMtr) /
                  100
              );
        amount = Math.round(vol * unitRate);
        return { unitRate, amount };
      }
      if (item.section === "D") {
        const rfDelta = Math.max(0, rfFactor);
        const baseRate = item.description?.includes("REMOVAL 2")
          ? 28750
          : item.description?.toLowerCase().includes("coal")
          ? 17500
          : 29500;
        unitRate =
          item.unitRateIDR && Number(item.unitRateIDR) > 0
            ? Number(item.unitRateIDR)
            : Math.round(baseRate * rfDelta);
        amount = Math.round(vol * unitRate);
        return { unitRate, amount };
      }
      if (item.section === "E") {
        amount =
          item.amount !== undefined && item.amount !== 0
            ? -Math.abs(Number(item.amount))
            : 0;
        return { unitRate: 0, amount };
      }
      if (
        item.section === "F" ||
        item.category === "DP Fuel" ||
        item.isDeduction
      ) {
        const val = Number(item.amount || item.unitRateIDR || 0);
        return { unitRate: 0, amount: -Math.abs(val) };
      }
    }

    if (item.amount !== undefined && item.amount !== null && item.amount !== 0) {
      return {
        unitRate: Number(
          item.unitRateIDR || (vol > 0 ? Math.round(item.amount / vol) : item.amount)
        ),
        amount: Number(item.amount),
      };
    }

    unitRate = Number(item.unitRateIDR || 0);
    amount = Math.round(vol * unitRate);
    return { unitRate, amount };
  };

  const getCustomerCalculations = (itemsList: any[], custCode?: string) => {
    const cust = custCode || formData.customerCode || "";
    const subA = itemsList
      .filter((i) => i.section === "A")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subB = itemsList
      .filter((i) => i.section === "B")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subC = itemsList
      .filter((i) => i.section === "C")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subD = itemsList
      .filter((i) => i.section === "D")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subE = itemsList
      .filter((i) => i.section === "E")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subF = itemsList
      .filter((i) => i.section === "F")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subP = itemsList
      .filter((i) => i.section === "P")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);

    const totalGross = subA + subB + subC + subD + subE + subF;
    const dpp11_12 = Math.round((totalGross * 11) / 12);
    const vat12 = Math.round(dpp11_12 * 0.12);
    const pph23 = Math.round(totalGross * 0.02);
    const totalInvoice = totalGross + vat12 - pph23;
    const totalDibayar = totalInvoice - Math.abs(subP);

    return {
      subtotalA: subA,
      subtotalB: subB,
      subtotalC: subC,
      subtotalD: subD,
      subtotalE: subE,
      subtotalF: subF,
      subtotalP: subP,
      totalGross,
      dpp11_12,
      vat12,
      pph23,
      totalInvoice,
      totalDibayar,
    };
  };

  return {
    getItemEffectiveVolume,
    getItemEffectiveOverhaulMtr,
    calculateItemRateAndAmount,
    getCustomerCalculations,
  };
}
