import { isOBMaterial, invoiceTaxes } from "./ba_calculations";
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

  getSBSTarifByDistance,
  type SBSDistanceTier,
} from "./distance_tiers";
import { baseDistanceFor } from "./masterRegistry";

export { getSBSTarifByDistance, type SBSDistanceTier };

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
  const { formData, invLineItems, rfIndexCalculated, getSowMasterRate, mRate } = deps;

  const getItemEffectiveVolume = (item: any, currentList?: any[]) => {
    if (!item) return 0;
    const directVol = Number(item.volume ?? item.adjustedVolume ?? item.initialVolume ?? 0);
    if (directVol > 0) return directVol;

    const list = currentList && currentList.length > 0 ? currentList : invLineItems;
    const cust = (formData.customerCode || "").toUpperCase();

    if (cust === "BGG") {
      if (item.section === "C") {
        if (item.subSection?.includes("OB") || item.description?.includes("OB")) {
          return list
            .filter((i) => i.section === "A")
            .reduce((sum, i) => sum + Number(i.volume ?? i.adjustedVolume ?? i.initialVolume ?? 0), 0);
        }
        if (item.subSection?.includes("Coal") || item.description?.includes("Coal")) {
          return list
            .filter((i) => i.section === "B")
            .reduce((sum, i) => sum + Number(i.volume ?? i.adjustedVolume ?? i.initialVolume ?? 0), 0);
        }
      }
      if (item.section === "D") {
        if (item.description?.includes("75%")) {
          return Number(
            list.find((i) => i.section === "A" && (i.description?.includes("75%") || i.sowDescription?.includes("75%")))?.volume ||
            list.find((i) => i.section === "A" && (i.description?.includes("75%") || i.sowDescription?.includes("75%")))?.adjustedVolume || 0
          );
        }
        if (item.description?.includes("25%")) {
          return Number(
            list.find((i) => i.section === "A" && (i.description?.includes("25%") || i.sowDescription?.includes("25%")))?.volume ||
            list.find((i) => i.section === "A" && (i.description?.includes("25%") || i.sowDescription?.includes("25%")))?.adjustedVolume || 0
          );
        }
        if (item.subSection?.includes("D2") || item.description?.includes("OB")) {
          return list
            .filter((i) => i.section === "A")
            .reduce((sum, i) => sum + Number(i.volume ?? i.adjustedVolume ?? i.initialVolume ?? 0), 0);
        }
        if (
          item.subSection?.includes("D3") ||
          (item.description?.includes("Coal Winning") &&
            !item.description?.includes("Over Distance"))
        ) {
          return list
            .filter((i) => i.section === "B")
            .reduce((sum, i) => sum + Number(i.volume ?? i.adjustedVolume ?? i.initialVolume ?? 0), 0);
        }
        if (item.subSection?.includes("D4") || item.description?.includes("Coal")) {
          return list
            .filter((i) => i.section === "B")
            .reduce((sum, i) => sum + Number(i.volume ?? i.adjustedVolume ?? i.initialVolume ?? 0), 0);
        }
      }
      return directVol;
    }

    if (cust === "POS" || cust === "IBP" || cust === "BBA") {
      if (item.section === "B") {
        if (item.code === "B1" || item.description?.includes("OB Removal")) {
          return Number(
            list.find(
              (i) =>
                i.section === "A" &&
                (i.code === "A1" || i.description?.includes("OVER BURDEN"))
            )?.volume || 0
          );
        }
        if (item.code === "B2" || item.description?.includes("Top Soil")) {
          return Number(
            list.find(
              (i) =>
                i.section === "A" &&
                (i.code === "A2" || i.description?.includes("TOP SOIL"))
            )?.volume || 0
          );
        }
      }
    }
    return directVol;
  };

  const getItemEffectiveOverhaulMtr = (item: any) => {
    if (!item) return 0;
    return item.overhaulMtr ?? item.distanceM ?? item.distance ?? item.distanceWeightAvg ?? item.baseMtr ?? 0;
  };

  const calculateItemRateAndAmount = (item: any, currentCust?: string, currentList?: any[]) => {
    const cust = (currentCust || formData.customerCode || "").toUpperCase();
    const rfFactor = rfIndexCalculated - 1;
    const vol = getItemEffectiveVolume(item, currentList);
    const mtr = getItemEffectiveOverhaulMtr(item);

    let unitRate = Number(item.unitRateIDR ?? item.rate ?? 0);
    let amount = Number(item.amountIDR ?? item.amount ?? 0);

    if (cust === "BGG") {
      if (item.section === "A" || item.section === "B") {
        if (unitRate === 0) {
          unitRate = getSowMasterRate("BGG", item.description || item.sowDescription || "", 0);
        }
        // Excel BGG: OB (Seksi A) tanpa ROUND, coal (Seksi B) ROUND.
        amount = item.section === "A" ? vol * unitRate : Math.round(vol * unitRate);
        return { unitRate, amount };
      }
      if (item.section === "C") {
        const baseMtr = baseDistanceFor("BGG", item.description || item.sowDescription || "");
        const diffMtr = baseMtr > 0 ? Math.max(0, mtr - baseMtr) : 0;
        if (unitRate === 0) {
          const isCoal = item.subSection?.includes("Coal") || item.description?.includes("Coal");
          const per100m = isCoal ? getSowMasterRate("BGG", "Over Distance For Coal Winning", 0) : getSowMasterRate("BGG", "Over Distance For OB Removal", 0);
          unitRate = (per100m * diffMtr) / 100;
        }
        amount = Math.round(vol * unitRate);
        return { unitRate, amount };
      }
      if (item.section === "D") {
        const rfDelta = rfFactor;
        if (unitRate === 0) {
          const isOB2 = item.description?.includes("REMOVAL 2") || item.description?.includes("25%");
          const isCoal = item.description?.toLowerCase().includes("coal");
          const isODOB = item.subSection?.includes("D2") || (isOBMaterial(item.description) && item.description?.toLowerCase().includes("distance"));
          const isODCoal = item.subSection?.includes("D4") || (item.description?.toLowerCase().includes("coal") && item.description?.toLowerCase().includes("distance"));

          if (isODOB) {
            const baseMtr = baseDistanceFor("BGG", "Over Distance For OB Removal");
            const diffMtr = baseMtr > 0 ? Math.max(0, mtr - baseMtr) : 0;
            const baseRate = getSowMasterRate("BGG", "Over Distance For OB Removal", 0);
            unitRate = baseRate * rfDelta * (diffMtr / 100);
          } else if (isODCoal) {
            const baseMtr = baseDistanceFor("BGG", "Over Distance For Coal Winning");
            const diffMtr = baseMtr > 0 ? Math.max(0, mtr - baseMtr) : 0;
            const baseRate = getSowMasterRate("BGG", "Over Distance For Coal Winning", 0);
            unitRate = baseRate * rfDelta * (diffMtr / 100);
          } else if (isOB2) {
            const baseRate = getSowMasterRate("BGG", "OVER BURDEN REMOVAL 2 (25%)", 0);
            unitRate = baseRate * rfDelta;
          } else if (isCoal) {
            const baseRate = getSowMasterRate("BGG", "Coal Winning", 0);
            unitRate = baseRate * rfDelta;
          } else {
            const baseRate = getSowMasterRate("BGG", "OVER BURDEN REMOVAL 1 (75%)", 0);
            unitRate = baseRate * rfDelta;
          }
        }
        amount = Math.round(vol * unitRate);
        return { unitRate, amount };
      }
      if (item.section === "E") {
        if (amount !== 0) {
          return { unitRate: 0, amount: -Math.abs(amount) };
        }
        return { unitRate: 0, amount: 0 };
      }
      if (item.section === "F" || item.category === "DP Fuel" || item.isDeduction) {
        const val = Number(item.amount || item.unitRateIDR || item.rate || item.subtotal || item.subtotalInitial || item.subtotalAdjusted || 0);
        return { unitRate: 0, amount: -Math.abs(val) };
      }
    }

    if (cust === "PTRO" || cust === "DBK") {
      const desc = item.description || item.sowDescription || item.material || "";
      const kurs = item.kursBI || mRate;
      if (unitRate === 0) {
        if (item.isUSD || item.unitRateUSD !== undefined) {
          const usdRate = item.unitRateUSD || getSowMasterRate("PTRO", desc, 0, true);
          unitRate = usdRate * kurs;
        } else {
          unitRate = getSowMasterRate("PTRO", desc, 0, false);
        }
      }
      if (unitRate > 0 && vol > 0) {
        amount = Math.round(vol * unitRate);
      }
      return { unitRate, amount };
    }

    if (cust === "POS" || cust === "IBP" || cust === "BBA") {
      const desc = item.description || item.sowDescription || item.material || "";
      const cat = (item.category || "").toLowerCase();
      const mLow = desc.toLowerCase();
      if (
        item.isDeduction ||
        item.section === "E" ||
        item.section === "F" ||
        cat === "dp fuel" ||
        cat === "deduction" ||
        mLow.includes("dp fuel") ||
        mLow.includes("pengurang solar") ||
        mLow.includes("potongan solar")
      ) {
        const val = Number(item.amount || item.unitRateIDR || item.rate || item.subtotal || item.subtotalInitial || item.subtotalAdjusted || 0);
        return { unitRate: 0, amount: -Math.abs(val) };
      }
      if (item.section === "D") {
        const rfDelta = rfFactor;
        if (unitRate === 0) {
          const baseUSD = item.baseRateUSD || getSowMasterRate("POS", desc, 0, true);
          unitRate = baseUSD * rfDelta * mRate;
        }
        amount = vol * unitRate;
        return { unitRate, amount };
      }
      if (unitRate === 0) {
        if (item.baseRateUSD > 0) {
          unitRate = item.baseRateUSD * mRate;
        } else {
          const masterIDR = getSowMasterRate("POS", desc, 0, false);
          if (masterIDR > 0) unitRate = masterIDR;
          else {
            const masterUSD = getSowMasterRate("POS", desc, 0, true);
            if (masterUSD > 0) unitRate = masterUSD * mRate;
          }
        }
      }
      if (item.section === "B") {
        // Over/underhaul: selisih jarak / 1.000 m lalu ROUND (sama dengan BE RecalculateInvoiceFinancials).
        const base = Number(item.baseMtr || baseDistanceFor(cust, desc) || 1000);
        if (unitRate > 0 && vol > 0 && mtr > 0 && mtr !== base) amount = Math.round(vol * ((mtr - base) / 1000) * unitRate);
        return { unitRate, amount };
      }
      // Excel POS: baris non-jarak = Vol x Rate tanpa ROUND.
      if (unitRate > 0 && vol > 0) {
        amount = vol * unitRate;
      }
      return { unitRate, amount };
    }

    if (cust === "SBS") {
      if (item.isDeduction || item.section === "P" || item.category === "Pengurang Biaya") {
        const val = Number(item.amount || item.unitRateIDR || 0);
        return { unitRate: 0, amount: -Math.abs(val) };
      }
      const desc = item.description || item.sowDescription || item.material || "";
      if (unitRate === 0) {
        unitRate = getSowMasterRate("SBS", desc, 0);
      }
      if (unitRate > 0 && vol > 0) {
        amount = Math.round(vol * unitRate);
      }
      return { unitRate, amount };
    }

    if (amount !== 0 && (vol === 0 || unitRate === 0)) {
      return {
        unitRate: Number(
          item.unitRateIDR || (vol > 0 ? Math.round(Math.abs(amount) / vol) : Math.abs(amount))
        ),
        amount: Number(amount),
      };
    }

    if (unitRate > 0 && vol > 0) {
      amount = Math.round(vol * unitRate);
    }
    return { unitRate, amount };
  };

  const getCustomerCalculations = (itemsList: any[], custCode?: string) => {
    const cust = custCode || formData.customerCode || "";
    const list = itemsList || [];
    const subA = list
      .filter((i) => i.section === "A")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust, list).amount, 0);
    const subB = list
      .filter((i) => i.section === "B")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust, list).amount, 0);
    const subC = list
      .filter((i) => i.section === "C")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust, list).amount, 0);
    const subD = list
      .filter((i) => i.section === "D")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust, list).amount, 0);
    const subE = list
      .filter((i) => i.section === "E")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust, list).amount, 0);
    const subF = list
      .filter((i) => i.section === "F")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust, list).amount, 0);
    const subP = list
      .filter((i) => i.section === "P")
      .reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust, list).amount, 0);

    const totalGross = subA + subB + subC + subD + subE + subF;
    const { dpp11_12, vat12, pph23, total: totalInvoice } = invoiceTaxes(totalGross);
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
