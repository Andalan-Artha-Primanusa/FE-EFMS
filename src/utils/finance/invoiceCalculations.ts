// Finance Invoice & BA Calculation Engine
// Source: extracted from FinancePage.tsx L1421–L1547
// All calculation functions are pure — no React state dependencies

/**
 * Calculate effective volume for a POS invoice line item, resolving
 * cross-section dependencies (e.g. Section B/D volumes mirror Section A volumes).
 */
export function getItemEffectiveVolume(item: any, invLineItems: any[], customerCode: string): number {
  if (!item) return 0;
  if (customerCode === "POS") {
    if (item.section === "B") {
      if (item.code === "B1" || item.description?.includes("OB Removal")) {
        const itemA = invLineItems.find((i: any) => i.section === "A" && (i.code === "A1" || i.description?.includes("OVER BURDEN")));
        if (itemA) return itemA.volume || 0;
      }
      if (item.code === "B2" || item.description?.includes("Top Soil")) {
        const itemA = invLineItems.find((i: any) => i.section === "A" && (i.code === "A2" || i.description?.includes("TOP SOIL")));
        if (itemA) return itemA.volume || 0;
      }
      if (item.code === "B3" || item.description?.includes("Limonite")) {
        const itemA = invLineItems.find((i: any) => i.section === "A" && (i.code === "A3" || i.description?.includes("LIMONITE")));
        if (itemA) return itemA.volume || 0;
      }
      if (item.code === "B4" || item.description?.includes("Saprolite")) {
        const itemA = invLineItems.find((i: any) => i.section === "A" && (i.code === "A4" || i.description?.includes("SAPROLITE")));
        if (itemA) return itemA.volume || 0;
      }
    }
    if (item.section === "D") {
      if (item.code === "D1" || item.description?.startsWith("D1.")) return invLineItems.find((i: any) => i.code === "A1")?.volume || 0;
      if (item.code === "D2" || item.description?.startsWith("D2.")) return invLineItems.find((i: any) => i.code === "A1")?.volume || 0;
      if (item.code === "D3" || item.description?.startsWith("D3.")) return invLineItems.find((i: any) => i.code === "A2")?.volume || 0;
      if (item.code === "D4" || item.description?.startsWith("D4.")) return invLineItems.find((i: any) => i.code === "A2")?.volume || 0;
      if (item.code === "D5" || item.description?.startsWith("D5.")) return invLineItems.find((i: any) => i.code === "A3")?.volume || 0;
      if (item.code === "D6" || item.description?.startsWith("D6.")) return invLineItems.find((i: any) => i.code === "A3")?.volume || 0;
      if (item.code === "D7" || item.description?.startsWith("D7.")) return invLineItems.find((i: any) => i.section === "C")?.volume || item.volume || 0;
      if (item.code === "D8" || item.description?.startsWith("D8.")) return invLineItems.find((i: any) => i.code === "A4")?.volume || 0;
      if (item.code === "D9" || item.description?.startsWith("D9.")) return invLineItems.find((i: any) => i.code === "A4")?.volume || 0;
    }
  }
  return item.volume || 0;
}

/**
 * Resolve effective overhaul distance for POS section D items
 * (mirrors section B overhaul values).
 */
export function getItemEffectiveOverhaulMtr(item: any, invLineItems: any[], customerCode: string): number {
  if (!item) return 1000;
  if (customerCode === "POS" && item.section === "D") {
    if (item.code === "D2" || item.description?.startsWith("D2.")) return invLineItems.find((i: any) => i.code === "B1")?.overhaulMtr ?? 1000;
    if (item.code === "D4" || item.description?.startsWith("D4.")) return invLineItems.find((i: any) => i.code === "B2")?.overhaulMtr ?? 1000;
    if (item.code === "D6" || item.description?.startsWith("D6.")) return invLineItems.find((i: any) => i.code === "B3")?.overhaulMtr ?? 1000;
    if (item.code === "D9" || item.description?.startsWith("D9.")) return invLineItems.find((i: any) => i.code === "B4")?.overhaulMtr ?? 1000;
  }
  return item.overhaulMtr ?? (item.baseMtr ?? 1000);
}

/**
 * Calculate unit rate and subtotal amount for a single invoice line item.
 * Handles POS (USD×mRate×RF), BGG/SBS (IDR direct), DBK (USD×kursBI).
 */
export function calculateItemRateAndAmount(
  item: any,
  invLineItems: any[],
  customerCode: string,
  mRate: number,
  rfIndexCalculated: number
): { unitRate: number; amount: number } {
  const rfFactor = rfIndexCalculated - 1;
  const vol = getItemEffectiveVolume(item, invLineItems, customerCode);
  const mtr = getItemEffectiveOverhaulMtr(item, invLineItems, customerCode);

  let unitRate = 0;
  let amount = 0;

  // Explicit amount item (e.g. Discounts / Deductions)
  if (item.amount !== undefined && item.amount !== null && item.amount !== 0) {
    return { unitRate: 0, amount: item.amount };
  }

  // DBK: Dual Currency USD to IDR
  if (customerCode === "DBK") {
    if (item.unitRateUSD && item.kursBI) {
      unitRate = Math.round(item.unitRateUSD * item.kursBI);
      amount = Math.round(vol * item.unitRateUSD * item.kursBI);
    } else if (item.unitRateIDR) {
      unitRate = item.unitRateIDR;
      amount = Math.round(vol * unitRate);
    }
    return { unitRate, amount };
  }

  // BGG or SBS: explicit IDR rate
  if (item.unitRateIDR !== undefined) {
    unitRate = item.unitRateIDR;
    amount = Math.round(vol * unitRate);
    return { unitRate, amount };
  }

  // POS: Formula USD * mRate & RF Index
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
    if (item.type === "overhaul" || item.description?.toLowerCase().includes("overhaul")) {
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
}

export interface InvoiceCalculationResult {
  subtotalA: number;
  subtotalB: number;
  subtotalC: number;
  subtotalD: number;
  subtotalE: number;
  subtotalF: number;
  subtotalP: number;
  totalGross: number;
  dpp11_12: number;
  vat12: number;
  pph23: number;
  totalInvoice: number;
  totalDibayar: number;
}

/**
 * Full invoice calculation for all customers.
 * Returns subtotals per section, PPN 11%, PPh 23 2%, and net payable.
 */
export function getCustomerCalculations(
  itemsList: any[],
  customerCode: string,
  mRate: number,
  rfIndexCalculated: number
): InvoiceCalculationResult {
  const calc = (items: any[]) =>
    items.reduce((sum, i) => sum + calculateItemRateAndAmount(i, itemsList, customerCode, mRate, rfIndexCalculated).amount, 0);

  const subA = calc(itemsList.filter(i => i.section === "A"));
  const subB = calc(itemsList.filter(i => i.section === "B"));
  const subC = calc(itemsList.filter(i => i.section === "C"));
  const subD = calc(itemsList.filter(i => i.section === "D"));
  const subE = calc(itemsList.filter(i => i.section === "E"));
  const subF = calc(itemsList.filter(i => i.section === "F"));
  const subP = calc(itemsList.filter(i => i.section === "P"));

  let totalGross = 0, dpp11_12 = 0, vat12 = 0, pph23 = 0, totalInvoice = 0, totalDibayar = 0;

  if (customerCode === "BGG") {
    totalGross = subA + subB + subC + subD + subE + subF;
    dpp11_12 = Math.round(totalGross * 11 / 12);
    vat12 = Math.round(dpp11_12 * 0.12);
    pph23 = Math.round(totalGross * 0.02);
    totalInvoice = dpp11_12 + vat12 - pph23;
    totalDibayar = totalInvoice;
  } else if (customerCode === "DBK") {
    totalGross = subA + subB + subC;
    dpp11_12 = Math.round(totalGross * 11 / 12);
    vat12 = Math.round(dpp11_12 * 0.12);
    pph23 = Math.round(totalGross * 0.02);
    totalInvoice = totalGross + vat12 - pph23;
    totalDibayar = totalInvoice;
  } else if (customerCode === "SBS") {
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
    totalInvoice = dpp11_12 + vat12 - pph23;
    totalDibayar = totalInvoice;
  }

  return { subtotalA: subA, subtotalB: subB, subtotalC: subC, subtotalD: subD, subtotalE: subE, subtotalF: subF, subtotalP: subP, totalGross, dpp11_12, vat12, pph23, totalInvoice, totalDibayar };
}
