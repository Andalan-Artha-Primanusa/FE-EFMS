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
    return 1.0; // fallback if no RF master is provided
  }
  
  const baseFuelPrice = rfMaster.baseFuelFo || 1;
  const baseLaborPrice = rfMaster.baseLaborLo || 1;
  const baseForexRate = rfMaster.baseForexXo || 1;
  const weightA = rfMaster.weightFuelA || 0;
  const weightB = rfMaster.weightLaborB || 0;
  const weightC = rfMaster.weightFixedC || 0;
  
  // We assume obBaseRateUSD is 1 for the purpose of the index multiplier calculation, 
  // since the index is a multiplier applied to the base rate later.
  const obBaseRateUSD = 1.0; 
  
  const fuelTerm = (obBaseRateUSD * weightA * (fuelPriceUSD * mRate)) / baseFuelPrice;
  const laborTerm = weightB > 0 ? (obBaseRateUSD * weightB * (laborPriceIDR * mRate)) / (baseLaborPrice * baseForexRate) : 0;
  const fixedTerm = obBaseRateUSD * weightC;
  
  return (fuelTerm + laborTerm + fixedTerm) / obBaseRateUSD;
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
        unitRate = Number(item.unitRateIDR || 0);
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

    // Explicit amount item (e.g. Discounts / Deductions)
    if (item.amount !== undefined && item.amount !== null && item.amount !== 0) {
      return { unitRate: 0, amount: item.amount };
    }

    // Customer: DBK (Dual Currency USD to IDR)
    if (cust === "DBK") {
      if (item.section === "C") {
        // C1 — Over Distance OB (USD-based, basis 1.000m)
        // C2 — Over Distance Coal (IDR-based, basis 3.000m)
        const basis = item.baseMtr || (item.unitRateUSD ? 1000 : 3000);
        const diff = (mtr || basis) - basis;
        if (item.unitRateUSD && item.kursBI) {
          // OB: vol × (diff/100) × rateUSD × kursBI
          amount = Math.round(vol * (diff / 100) * item.unitRateUSD * item.kursBI);
          unitRate = vol > 0 ? Math.round(amount / vol) : 0;
        } else if (item.unitRateIDR) {
          // Coal: vol × (diff/100) × rateIDR
          amount = Math.round(vol * (diff / 100) * item.unitRateIDR);
          unitRate = vol > 0 ? Math.round(amount / vol) : 0;
        }
        return { unitRate, amount };
      }
      if (item.unitRateUSD && item.kursBI) {
        unitRate = Math.round(item.unitRateUSD * item.kursBI);
        amount = Math.round(vol * item.unitRateUSD * item.kursBI);
      } else if (item.unitRateIDR) {
        unitRate = item.unitRateIDR;
        amount = Math.round(vol * unitRate);
      }
      return { unitRate, amount };
    }

    // Customer: SBS with explicit unitRateIDR
    if (item.unitRateIDR !== undefined) {
      unitRate = item.unitRateIDR;
      amount = Math.round(vol * unitRate);
      return { unitRate, amount };
    }

    // Customer: POS (Formula USD * mRate & RF Index)
    if (item.section === "A") {
      unitRate = Math.round((item.baseRateUSD || 0) * mRate);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "B") {
      const effMtr = (mtr - 1000) / 1000;
      unitRate = Math.round(effMtr * (item.baseRateUSD || 0) * mRate);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "C") {
      unitRate = Math.round((item.baseRateUSD || 0) * mRate);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "D") {
      if (item.type === "overhaul" || item.description.toLowerCase().includes("overhaul")) {
        const effMtr = (mtr - 1000) / 1000;
        const baseRateIDR = Math.round(effMtr * (item.baseRateUSD || 0) * mRate);
        unitRate = Math.round(baseRateIDR * rfFactor);
        amount = Math.round(vol * unitRate);
      } else {
        const baseRateIDR = Math.round((item.baseRateUSD || 0) * mRate);
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
    } else if (cust === "DBK") {
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
