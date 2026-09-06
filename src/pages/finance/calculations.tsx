// =============================================================
// CONTROL RUMUS FINANCE
// Semua rumus bisnis modul Finance (RF index, volume efektif,
// rate & amount item, rekap per customer) dikumpulkan di sini
// agar terpisah dari UI dan state.
// =============================================================

import { calculateMiningInvoice } from "../../lib/api";

export async function fetchServerCalculations(input: any) {
  try {
    const result = await calculateMiningInvoice(input);
    return result;
  } catch (error) {
    console.error("Gagal mengambil kalkulasi server", error);
    return null;
  }
}

/** Hitung Raise & Fall Index dari harga solar, upah, dan kurs. */
export function calcRFIndex(fuelPriceUSD: number, laborPriceIDR: number, mRate: number, rfMaster?: any): number {
  if (!rfMaster) {
    return 1.0;
  }
  
  if (rfMaster.formulaScheme === "SINGLE_FACTOR_FUEL" || rfMaster.customerCode === "BGG") {
    const baseFo = rfMaster.baseFuelFo || 9000;
    const actualFn = rfMaster.actualFuelFn || 21601.53;
    return Number((0.60 + (0.40 * (actualFn / baseFo))).toFixed(3));
  }

  // POS (TRIPLE_FACTOR_DLF): D + L + F
  const baseFuelPrice = rfMaster.baseFuelFo || 10699.97;
  const baseLaborPrice = rfMaster.baseLaborLo || 3594536;
  const baseForexRate = rfMaster.baseForexXo || 15388.75;
  const weightA = rfMaster.weightFuelA || 0.34;
  const weightB = rfMaster.weightLaborB || 0.25;
  const weightC = rfMaster.weightFixedC || 0.41;
  
  const fuelTerm = (weightA * (fuelPriceUSD * mRate)) / baseFuelPrice;
  const laborTerm = weightB > 0 && baseLaborPrice > 0 && baseForexRate > 0
    ? (weightB * (laborPriceIDR * mRate)) / (baseLaborPrice * baseForexRate)
    : 0;
  const fixedTerm = weightC;
  
  return Number((fuelTerm + laborTerm + fixedTerm).toFixed(3));
}

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
  { min: 2001, max: 2250, rangeLabel: "2001-2250", rate: 16931 },
  { min: 2251, max: 2500, rangeLabel: "2251-2500", rate: 18362 },
  { min: 2501, max: 2750, rangeLabel: "2501-2750", rate: 19792 },
  { min: 2751, max: 3000, rangeLabel: "2751-3000", rate: 21223 },
  { min: 3001, max: 3250, rangeLabel: "3001-3250", rate: 22654 },
  { min: 3251, max: 3500, rangeLabel: "3251-3500", rate: 24085 },
  { min: 3501, max: 3750, rangeLabel: "3501-3750", rate: 25515 },
  { min: 3751, max: 4000, rangeLabel: "3751-4000", rate: 26946 },
  { min: 4001, max: 4250, rangeLabel: "4001-4250", rate: 28377 },
  { min: 4251, max: 4500, rangeLabel: "4251-4500", rate: 29808 },
  { min: 4501, max: 4750, rangeLabel: "4501-4750", rate: 31238 },
  { min: 4751, max: 5000, rangeLabel: "4751-5000", rate: 32669 },
  { min: 5001, max: 5250, rangeLabel: "5001-5250", rate: 34100 },
  { min: 5251, max: 5500, rangeLabel: "5251-5500", rate: 35531 },
  { min: 5501, max: 5750, rangeLabel: "5501-5750", rate: 36962 },
  { min: 5751, max: 6000, rangeLabel: "5751-6000", rate: 38392 },
  { min: 6001, max: 6250, rangeLabel: "6001-6250", rate: 39823 },
  { min: 6251, max: 6500, rangeLabel: "6251-6500", rate: 41254 },
  { min: 6501, max: 6750, rangeLabel: "6501-6750", rate: 42685 },
  { min: 6751, max: 7000, rangeLabel: "6751-7000", rate: 44115 },
  { min: 7001, max: 7250, rangeLabel: "7001-7250", rate: 45546 },
  { min: 7251, max: 7500, rangeLabel: "7251-7500", rate: 46977 },
  { min: 7501, max: 7750, rangeLabel: "7501-7750", rate: 48408 },
  { min: 7751, max: 8000, rangeLabel: "7751-8000", rate: 49838 },
  { min: 8001, max: 8250, rangeLabel: "8001-8250", rate: 51269 },
  { min: 8251, max: 8500, rangeLabel: "8251-8500", rate: 52700 },
  { min: 8501, max: 8750, rangeLabel: "8501-8750", rate: 54131 },
  { min: 8751, max: 9000, rangeLabel: "8751-9000", rate: 55562 },
  { min: 9001, max: 9250, rangeLabel: "9001-9250", rate: 56992 },
  { min: 9251, max: 9500, rangeLabel: "9251-9500", rate: 58423 },
  { min: 9501, max: 9750, rangeLabel: "9501-9750", rate: 59854 },
  { min: 9751, max: 10000, rangeLabel: "9751-10000", rate: 61285 },
];

export function getSBSTarifByDistance(distance: number, dynamicSowRows?: any[]): { rate: number; tier: SBSDistanceTier | null } {
  if (distance === undefined || distance === null || distance < 0) {
    return { rate: 0, tier: null };
  }
  const dist = Number(distance);

  // Prioritaskan baris tarif dari Master Data Variable SOW jika tersedia
  if (dynamicSowRows && dynamicSowRows.length > 0) {
    const sbsSows = dynamicSowRows.filter(s => (s.customer === "SBS" || s.customerCode === "SBS") && (s.rateIDR > 0 || s.tier1Rate > 0));
    for (const sow of sbsSows) {
      const min = sow.baseDistanceMeters || 0;
      const max = sow.maxDistanceMeters || (min > 0 ? min + 250 : 0);
      if (max > 0 && dist >= min && dist <= max) {
        const r = sow.rateIDR || sow.tier1Rate || 0;
        return { rate: r, tier: { min, max, rangeLabel: `${min}-${max}`, rate: r } };
      }
    }
  }

  const matched = SBS_DISTANCE_TIERS.find((t) => dist >= t.min && dist <= t.max);
  if (matched) {
    return { rate: matched.rate, tier: matched };
  }
  if (dist > 10000) {
    const maxTier = SBS_DISTANCE_TIERS[SBS_DISTANCE_TIERS.length - 1];
    return { rate: maxTier.rate, tier: maxTier };
  }
  return { rate: 0, tier: null };
}

/** Pabrik rumus item invoice: dependensi state disuntikkan lewat parameter. */
export function createFinanceCalculations(deps: {
  formData: any;
  invLineItems: any[];
  rfIndexCalculated: number;
  getSowMasterRate: (customer: string, itemName: string, fallbackRate: number, isUSD?: boolean) => number;
  mRate: number;
}) {
  const { formData, invLineItems, rfIndexCalculated, getSowMasterRate, mRate } = deps;
  const getItemEffectiveVolume = (item: any) => {
    if (!item) return 0;
    const cust = formData.customerCode || "";

    if (cust === "BGG") {
      if (item.section === "C") {
        if (item.subSection?.includes("OB") || item.description?.includes("OB")) {
          const obSum = invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + (i.volume || 0), 0);
          return (item.volume && item.volume > 0) ? item.volume : obSum;
        }
        if (item.subSection?.includes("Coal") || item.description?.includes("Coal")) {
          const coalSum = invLineItems.filter(i => i.section === "B").reduce((sum, i) => sum + (i.volume || 0), 0);
          return (item.volume && item.volume > 0) ? item.volume : coalSum;
        }
      }
      if (item.section === "D") {
        if (item.description?.includes("75%")) {
          const itemA1 = invLineItems.find(i => i.section === "A" && i.description?.includes("75%"));
          return itemA1?.volume || 0;
        }
        if (item.description?.includes("25%")) {
          const itemA2 = invLineItems.find(i => i.section === "A" && i.description?.includes("25%"));
          return itemA2?.volume || 0;
        }
        if (item.subSection?.includes("D2") || item.description?.includes("OB")) {
          const obSum = invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + (i.volume || 0), 0);
          return obSum;
        }
        if (item.subSection?.includes("D3") || (item.description?.includes("Coal Winning") && !item.description?.includes("Over Distance"))) {
          const coalSum = invLineItems.filter(i => i.section === "B").reduce((sum, i) => sum + (i.volume || 0), 0);
          return coalSum;
        }
        if (item.subSection?.includes("D4") || item.description?.includes("Coal")) {
          const coalSum = invLineItems.filter(i => i.section === "B").reduce((sum, i) => sum + (i.volume || 0), 0);
          return coalSum;
        }
      }
      return item.volume || 0;
    }

    if (cust === "POS") {
      if (item.section === "B") {
        if (item.code === "B1" || item.description.includes("OB Removal")) {
          const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A1" || i.description.includes("OVER BURDEN")));
          if (itemA) return itemA.volume || 0;
        }
        if (item.code === "B2" || item.description.includes("Top Soil")) {
          const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A2" || i.description.includes("TOP SOIL")));
          if (itemA) return itemA.volume || 0;
        }
        if (item.code === "B3" || item.description.includes("Limonite")) {
          const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A3" || i.description.includes("LIMONITE")));
          if (itemA) return itemA.volume || 0;
        }
        if (item.code === "B4" || item.description.includes("Saprolite")) {
          const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A4" || i.description.includes("SAPROLITE")));
          if (itemA) return itemA.volume || 0;
        }
      }
      if (item.section === "D") {
        if (item.code === "D1" || item.description.startsWith("D1.")) return (invLineItems.find(i => i.code === "A1")?.volume || 0);
        if (item.code === "D2" || item.description.startsWith("D2.")) return (invLineItems.find(i => i.code === "A1")?.volume || 0);
        if (item.code === "D3" || item.description.startsWith("D3.")) return (invLineItems.find(i => i.code === "A2")?.volume || 0);
        if (item.code === "D4" || item.description.startsWith("D4.")) return (invLineItems.find(i => i.code === "A2")?.volume || 0);
        if (item.code === "D5" || item.description.startsWith("D5.")) return (invLineItems.find(i => i.code === "A3")?.volume || 0);
        if (item.code === "D6" || item.description.startsWith("D6.")) return (invLineItems.find(i => i.code === "A3")?.volume || 0);
        if (item.code === "D7" || item.description.startsWith("D7.")) return (invLineItems.find(i => i.section === "C")?.volume || item.volume || 0);
        if (item.code === "D8" || item.description.startsWith("D8.")) return (invLineItems.find(i => i.code === "A4")?.volume || 0);
        if (item.code === "D9" || item.description.startsWith("D9.")) return (invLineItems.find(i => i.code === "A4")?.volume || 0);
      }
    }
    return item.volume || 0;
  };

  const getItemEffectiveOverhaulMtr = (item: any) => {
    if (!item) return 1000;
    if (formData.customerCode === "POS") {
      if (item.section === "D") {
        if (item.code === "D2" || item.description.startsWith("D2.")) return (invLineItems.find(i => i.code === "B1")?.overhaulMtr ?? 1000);
        if (item.code === "D4" || item.description.startsWith("D4.")) return (invLineItems.find(i => i.code === "B2")?.overhaulMtr ?? 1000);
        if (item.code === "D6" || item.description.startsWith("D6.")) return (invLineItems.find(i => i.code === "B3")?.overhaulMtr ?? 1000);
        if (item.code === "D9" || item.description.startsWith("D9.")) return (invLineItems.find(i => i.code === "B4")?.overhaulMtr ?? 1000);
      }
    }
    return item.overhaulMtr ?? (item.baseMtr ?? 1000);
  };

  const calculateItemRateAndAmount = (item: any, currentCust?: string) => {
    const cust = currentCust || formData.customerCode || "";
    const rfFactor = rfIndexCalculated - 1;
    const vol = getItemEffectiveVolume(item);
    const mtr = getItemEffectiveOverhaulMtr(item);

    let unitRate = 0;
    let amount = 0;

    // Customer: BGG (Sesuai Kontrak & Excel JUN 26)
    if (cust === "BGG") {
      if (item.section === "A" || item.section === "B") {
        unitRate = Number(item.unitRateIDR || 0);
        amount = Math.round(vol * unitRate);
        return { unitRate, amount };
      }

      if (item.section === "C") {
        const diffMtr = mtr - 1000;
        // Jika unitRateIDR sudah diisi langsung:
        if (item.unitRateIDR !== undefined && item.unitRateIDR !== 0) {
          unitRate = Number(item.unitRateIDR);
        } else {
          // Default rate per 100m (Hm): OB = 650/Hm, Coal = 550/Hm
          const baseRatePerHm = (item.subSection?.includes("Coal") || item.description?.includes("Coal")) ? 550 : 650;
          unitRate = Math.round(baseRatePerHm * (diffMtr / 100));
        }
        amount = Math.round(vol * unitRate);
        return { unitRate, amount };
      }

      if (item.section === "D") {
        if (item.unitRateIDR !== undefined && item.unitRateIDR !== null && Number(item.unitRateIDR) > 0) {
          unitRate = Number(item.unitRateIDR);
        } else {
          const rfDelta = Math.max(0, rfIndexCalculated - 1);
          let baseRate = 29500;
          if (item.description?.includes("REMOVAL 2") || item.description?.includes("25%")) {
            baseRate = 28750;
          } else if (item.description?.toLowerCase().includes("coal")) {
            baseRate = 17500;
          }
          unitRate = Math.round(baseRate * rfDelta);
        }
        amount = Math.round(vol * unitRate);
        return { unitRate, amount };
      }

      if (item.section === "E") {
        // Discount on Overdistance (Deduction 25%)
        if (item.amount !== undefined && item.amount !== null && item.amount !== 0) {
          amount = -Math.abs(Number(item.amount));
        } else {
          // Auto calculate -25% dari Section C yang berpasangan
          const isCoal = (item.description || "").toLowerCase().includes("coal");
          const targetSec = invLineItems.find(i => i.section === "C" && (isCoal ? (i.subSection?.includes("Coal") || i.description?.includes("Coal")) : (i.subSection?.includes("OB") || i.description?.includes("OB"))));
          if (targetSec) {
            const targetAmt = calculateItemRateAndAmount(targetSec, "BGG").amount;
            amount = -Math.round(targetAmt * 0.25);
          } else {
            amount = 0;
          }
        }
        return { unitRate: 0, amount };
      }

      if (item.section === "F" || item.category === "DP Fuel" || item.isDeduction) {
        // DP Fuel & Transport Deduction (Pengurang)
        const val = Number(item.amount !== undefined && item.amount !== 0 ? item.amount : (item.unitRateIDR || 0));
        amount = -Math.abs(val);
        return { unitRate: 0, amount };
      }

      if (item.amount !== undefined && item.amount !== null && item.amount !== 0) {
        return { unitRate: 0, amount: item.amount };
      }

      unitRate = Number(item.unitRateIDR || 0);
      amount = Math.round(vol * unitRate);
      return { unitRate, amount };
    }

    // Explicit amount item (e.g. Discounts / Deductions or Master Item)
    if (item.amount !== undefined && item.amount !== null && item.amount !== 0) {
      return { unitRate: Number(item.unitRateIDR || (vol > 0 ? Math.round(item.amount / vol) : item.amount)), amount: Number(item.amount) };
    }

    // Explicit unitRateIDR (e.g. Facility Claims, Rental Alat, Direct IDR pricing)
    if (item.unitRateIDR !== undefined && item.unitRateIDR !== null && item.unitRateIDR > 0 && (!item.baseRateUSD || item.baseRateUSD === 0)) {
      unitRate = Number(item.unitRateIDR);
      amount = Math.round(vol * unitRate);
      return { unitRate, amount };
    }

    // Customer: PTRO / DBK (Petrosea Dual Currency USD to IDR)
    if (cust === "PTRO" || cust === "DBK") {
      if (item.section === "C") {
        // C1 — Over Distance OB (USD-based $0.028/100m, basis 1.000m)
        // C2 — Over Distance Coal (IDR-based Rp 230/100m, basis 3.000m)
        const isCoal = (item.subSection || item.description || "").toLowerCase().includes("coal") || (item.subSection || item.description || "").toLowerCase().includes("batubara");
        const basis = item.baseMtr || (isCoal ? 3000 : 1000);
        const curMtr = item.overhaulMtr !== undefined && item.overhaulMtr !== null ? item.overhaulMtr : basis;
        const diff = Math.max(0, curMtr - basis);
        if (!isCoal) {
          const usdRate = item.unitRateUSD !== undefined && item.unitRateUSD !== null && item.unitRateUSD > 0 ? item.unitRateUSD : 0.028;
          const kurs = item.kursBI || mRate || 17923.30;
          amount = Math.round(vol * (diff / 100) * usdRate * kurs);
          unitRate = vol > 0 ? Math.round(amount / vol) : 0;
        } else {
          const idrRate = item.unitRateIDR !== undefined && item.unitRateIDR !== null && item.unitRateIDR > 0 ? item.unitRateIDR : 230;
          amount = Math.round(vol * (diff / 100) * idrRate);
          unitRate = vol > 0 ? Math.round(amount / vol) : 0;
        }
        return { unitRate, amount };
      }
      if (item.unitRateUSD && (item.kursBI || mRate)) {
        const kurs = item.kursBI || mRate || 17923.30;
        unitRate = Math.round(item.unitRateUSD * kurs);
        amount = Math.round(vol * item.unitRateUSD * kurs);
      } else if (item.unitRateIDR) {
        unitRate = item.unitRateIDR;
        amount = Math.round(vol * unitRate);
      }
      return { unitRate, amount };
    }

    // Customer: SBS with explicit unitRateIDR
    if (item.unitRateIDR !== undefined && item.unitRateIDR > 0) {
      unitRate = item.unitRateIDR;
      amount = Math.round(vol * unitRate);
      return { unitRate, amount };
    }

    // Customer: POS (Formula USD * mRate & RF Index)
    if (item.section === "A") {
      unitRate = (item.baseRateUSD && item.baseRateUSD > 0) ? Math.round(item.baseRateUSD * mRate) : Number(item.unitRateIDR || 0);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "B") {
      const effMtr = (mtr - 1000) / 1000;
      unitRate = (item.baseRateUSD && item.baseRateUSD > 0) ? Math.round(effMtr * item.baseRateUSD * mRate) : Number(item.unitRateIDR || 0);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "C") {
      unitRate = (item.baseRateUSD && item.baseRateUSD > 0) ? Math.round(item.baseRateUSD * mRate) : Number(item.unitRateIDR || 0);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "D") {
      if (item.type === "overhaul" || item.description.toLowerCase().includes("overhaul")) {
        const effMtr = (mtr - 1000) / 1000;
        const baseRateIDR = (item.baseRateUSD && item.baseRateUSD > 0) ? Math.round(effMtr * item.baseRateUSD * mRate) : Number(item.unitRateIDR || 0);
        unitRate = Math.round(baseRateIDR * rfFactor);
        amount = Math.round(vol * unitRate);
      } else {
        const baseRateIDR = (item.baseRateUSD && item.baseRateUSD > 0) ? Math.round(item.baseRateUSD * mRate) : Number(item.unitRateIDR || 0);
        unitRate = Math.round(baseRateIDR * rfFactor);
        amount = Math.round(vol * unitRate);
      }
    }

    return { unitRate, amount };
  };

  const getCustomerCalculations = (itemsList: any[], custCode?: string) => {
    const cust = custCode || formData.customerCode || "";
    const subA = itemsList.filter(i => i.section === "A").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subB = itemsList.filter(i => i.section === "B").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subC = itemsList.filter(i => i.section === "C").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subD = itemsList.filter(i => i.section === "D").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subE = itemsList.filter(i => i.section === "E").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subF = itemsList.filter(i => i.section === "F").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subP = itemsList.filter(i => i.section === "P").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);

    let totalGross = 0;
    let dpp11_12 = 0;
    let vat12 = 0;
    let pph23 = 0;
    let totalInvoice = 0;
    let totalDibayar = 0;

    if (cust === "BGG") {
      // Total = A + B + C + D + E (deduction) + F (DP Fuel & Transport deduction)
      totalGross = subA + subB + subC + subD + subE + subF;
      dpp11_12 = Math.round(totalGross * 11 / 12);
      vat12 = Math.round(dpp11_12 * 0.12);
      pph23 = Math.round(totalGross * 0.02);
      totalInvoice = totalGross + vat12 - pph23;
      totalDibayar = totalInvoice;
    } else if (cust === "PTRO" || cust === "DBK") {
      totalGross = subA + subB + subC;
      dpp11_12 = Math.round(totalGross * 11 / 12);
      vat12 = Math.round(dpp11_12 * 0.12);
      pph23 = Math.round(totalGross * 0.02);
      totalInvoice = totalGross + vat12 - pph23;
      totalDibayar = totalInvoice;
    } else if (cust === "SBS") {
      // Total Operational = A (OB) + B (Jasa Penunjang)
      totalGross = subA + subB;
      dpp11_12 = Math.round(totalGross * 11 / 12);
      vat12 = Math.round(dpp11_12 * 0.12);
      pph23 = Math.round(totalGross * 0.02);
      totalInvoice = totalGross + vat12 - pph23;
      const totalPengurang = Math.abs(subP);
      totalDibayar = totalInvoice - totalPengurang;
    } else {
      // POS
      totalGross = subA + subB + subC + subD;
      dpp11_12 = Math.round(totalGross * 11 / 12);
      vat12 = Math.round(dpp11_12 * 0.12);
      pph23 = Math.round(totalGross * 0.02);
      totalInvoice = totalGross + vat12 - pph23;
      totalDibayar = totalInvoice;
    }

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
      totalDibayar
    };
  };

  return { getItemEffectiveVolume, getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations }; }
