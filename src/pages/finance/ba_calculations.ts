// =============================================================
// BA CALCULATIONS & VOLUME ENGINE
// Business Logic / Service Layer helper: 100 – 300 lines.
// Authoritative calculation helpers for Berita Acara (BA) Tracker
// =============================================================

import { matchPeriod } from "./helpers";

import { customerKind, customerByCode, contractParams, baseDistanceFor, rfMasterFor, rfTemplateFor, computeRFIndex, minWageFor, kursForPeriod } from "./masterRegistry";

export { customerKind };

// "OB" harus berdiri sendiri (OB, OB1, (OB)) agar "Mobilisasi" / "Job" tidak terbaca sebagai Overburden.
const OB_MATERIAL_RE = /\bob(?![a-z])|overburden|over burden|waste/i;
export const isOBMaterial = (material?: string): boolean => OB_MATERIAL_RE.test(material || "");

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

/** Basis jarak kontrak: dari item BA, lalu Master Variable SOW customer. 0 = belum diatur di master. */
export function getBaseDistance(item: any, customerCode?: string): number {
  if (Number(item?.distanceBasis) > 0) return Number(item.distanceBasis);
  return baseDistanceFor(customerCode || item?.customerCode || item?.customer, item?.material || item?.description || item?.sowDescription);
}

export function getBAEffectiveVolume(item: any, allItems: any[], isSurvey: boolean = false): number {
  if (isDistanceItem(item)) {
    if (Number(item.initialVolume || 0) > 0) {
      return isSurvey
        ? (Number(item.adjustedVolume || 0) > 0 ? Number(item.adjustedVolume) : Number(item.initialVolume))
        : Number(item.initialVolume);
    }
    const mLow = (item.material || "").toLowerCase();
    const itemPeriod = (item.period || item.notes || "").trim().toLowerCase();

    if (isOBMaterial(mLow)) {
      const isMDO = (item.category || "").toLowerCase().includes("mdo") || mLow.includes("mdo");
      const obParents = allItems.filter((p) => {
        if (p.id === item.id || isDistanceItem(p)) return false;
        const pCat = (p.category || "").toLowerCase();
        const pMat = (p.material || p.name || "").toLowerCase();
        const pIsMDO = pCat.includes("mdo") || pMat.includes("mdo");
        if (isMDO ? !pIsMDO : pIsMDO) return false;
        const isOB = isOBMaterial(pMat);
        if (!isOB) return false;
        if (itemPeriod) {
          const pPeriod = (p.period || p.notes || "").trim().toLowerCase();
          return pPeriod === itemPeriod || !pPeriod;
        }
        return true;
      });
      if (obParents.length > 0) {
        return obParents.reduce((acc, p) => {
          const pVol = isSurvey
            ? (Number(p.adjustedVolume || 0) > 0 ? Number(p.adjustedVolume) : Number(p.initialVolume || 0))
            : Number(p.initialVolume || 0);
          return acc + pVol;
        }, 0);
      }
    }

    if (mLow.includes("coal") || mLow.includes("batubara")) {
      const coalParents = allItems.filter((p) => {
        if (p.id === item.id || isDistanceItem(p)) return false;
        const pLow = (p.material || "").toLowerCase();
        const isCoal = pLow.includes("coal") || pLow.includes("batubara");
        if (!isCoal) return false;
        if (itemPeriod) {
          const pPeriod = (p.period || p.notes || "").trim().toLowerCase();
          return pPeriod === itemPeriod || !pPeriod;
        }
        return true;
      });
      if (coalParents.length > 0) {
        return coalParents.reduce((acc, p) => {
          const pVol = isSurvey
            ? (Number(p.adjustedVolume || 0) > 0 ? Number(p.adjustedVolume) : Number(p.initialVolume || 0))
            : Number(p.initialVolume || 0);
          return acc + pVol;
        }, 0);
      }
    }

    const isMDO = (item.category || "").toLowerCase().includes("mdo") || mLow.includes("mdo");
    const domainItems = allItems.filter((p) => {
      if (p.id === item.id || isDistanceItem(p)) return false;
      const pCat = (p.category || "").toLowerCase();
      const pMat = (p.material || p.name || "").toLowerCase();
      const pIsMDO = pCat.includes("mdo") || pMat.includes("mdo");
      return isMDO ? pIsMDO : !pIsMDO;
    });
    const searchPool = domainItems.length > 0 ? domainItems : allItems.filter((p) => p.id !== item.id && !isDistanceItem(p));

    const itemArea = (item.area || "").trim().toLowerCase();
    const parent = searchPool.find((p) => {
      const pArea = (p.area || "").trim().toLowerCase();
      if (itemArea && pArea && itemArea !== pArea) {
        return false;
      }
      if (item.parentMaterial) {
        const pmLow = item.parentMaterial.toLowerCase().trim();
        const pMatLow = (p.material || p.name || "").toLowerCase().trim();
        if (pMatLow === pmLow || pMatLow.includes(pmLow) || pmLow.includes(pMatLow)) return true;
      }
      const pLow = (p.material || p.name || "").toLowerCase();
      if (mLow.includes("top soil") || mLow.includes("topsoil")) return pLow.includes("top soil") || pLow.includes("topsoil");
      if (mLow.includes("limonite")) return pLow.includes("limonite");
      if (mLow.includes("saprolite") || mLow.includes("saprolit")) return pLow.includes("saprolite") || pLow.includes("saprolit");
      if (mLow.includes("uncrushed") || mLow.includes("rock") || mLow.includes("crush") || mLow.includes("boulder")) return pLow.includes("uncrushed") || pLow.includes("rock") || pLow.includes("crush") || pLow.includes("boulder");
      if (mLow.includes("fill") || mLow.includes("cut")) return pLow.includes("fill") || pLow.includes("cut");
      if (isOBMaterial(mLow)) return isOBMaterial(pLow);
      return false;
    });
    if (parent) {
      return isSurvey
        ? (Number(parent.adjustedVolume || 0) > 0 ? Number(parent.adjustedVolume) : Number(parent.initialVolume || 0))
        : Number(parent.initialVolume || 0);
    }

    const selfVol = isSurvey
      ? (Number(item.adjustedVolume || 0) > 0 ? Number(item.adjustedVolume) : Number(item.initialVolume || 0))
      : Number(item.initialVolume || 0);
    if (selfVol > 0) return selfVol;
  }
  return isSurvey
    ? (Number(item.adjustedVolume || 0) > 0 ? Number(item.adjustedVolume) : Number(item.initialVolume || 0))
    : Number(item.initialVolume || 0);
}

export function getBAItemSubtotal(item: any, volume: number, isCustomerDBK: boolean = false, customerCode?: string): number {
  const r = Number(item.rate || 0);
  if (
    item.category === "DP Fuel" ||
    item.isDeduction ||
    (item.material || "").toLowerCase().includes("dp fuel") ||
    (item.material || "").toLowerCase().includes("pengurang solar") ||
    (item.material || "").toLowerCase().includes("potongan solar")
  ) {
    const amt = r !== 0 ? r : (item.subtotalInitial ? Number(item.subtotalInitial) : 0);
    const vol = volume > 0 ? volume : 1;
    return -Math.abs(vol === 1 ? amt : vol * amt);
  }
  if (isDistanceItem(item)) {
    const baseDist = getBaseDistance(item, customerCode || item?.customerCode);
    const rawDist = Number(item.distanceM ?? item.distance ?? item.distanceWeightAvg ?? baseDist);
    // If distance is entered as e.g. 1.325 or 4.976 (meaning 1.325 km or parsed with decimal point), scale to meters
    // Jarak dipakai apa adanya (input presisi dari survey); tidak ada lagi pembulatan "ajaib" per periode.
    const dist = (rawDist > 0 && rawDist < 50) ? rawDist * 1000 : rawDist;
    const cust = customerKind(customerCode || item?.customerCode);
    const isPOS = cust === "POS" || (item.material || "").toLowerCase().includes("underhaul");
    const diffMtr = isPOS ? (dist - baseDist) : Math.max(0, dist - baseDist);
    const isPer100m = isCustomerDBK || customerByCode(cust)?.overhaulRateUnit === "PER_100M" || (item.unit || "").includes("100") || (item.material || "").includes("100m") || (item.material || "").toLowerCase().includes("over distance");
    if (isPer100m) {
      return Math.round(volume * (diffMtr / 100) * r);
    }
    return Math.round(volume * (diffMtr / 1000) * r);
  }
  return Math.round(volume * r);
}

export interface BACommercialBreakdown {
  basePokok: number;
  obAmount: number;
  coalAmount: number;
  overdistanceGross: number;
  mdoGross: number;
  rfRateFactor: number;
  rfAmount: number;
  odDeduction: number;
  dpFuelDeduction: number;
  totalDeductions: number;
  totalDPP: number;
  totalGross: number;
  dpp11_12: number;
  vat12: number;
  ppnAmount: number;
  pph23Amount: number;
  netAR: number;
  netTotalInvoice: number;
  totalDibayar?: number;
  subtotalP?: number;
}

/**
 * Indeks RF BGG per periode (sama dengan resolveBGGRFIndex di BE): harga solar survey BA dihitung dengan
 * rumus Master Raise & Fall -> indeks yang diinput pada BA -> indeks master RF periode -> defaultRF.
 */
export function getBGGRFIndexForPeriod(
  itemPeriod?: string,
  defaultRF: number = 1.0,
  fuelPeriods?: Record<string, any>,
  customerCode: string = "BGG"
): number {
  const periodRF = rfMasterFor(customerCode, itemPeriod);
  const formula = periodRF || rfTemplateFor(customerCode);
  const entry: any = itemPeriod && fuelPeriods
    ? Object.entries(fuelPeriods).find(([k]) => k.trim().toLowerCase() === itemPeriod.trim().toLowerCase() || matchPeriod(k, itemPeriod))?.[1]
    : undefined;
  if (entry) {
    const p1 = Number(entry.bggFuelP1 || 0) + Number(entry.bggTransportP1 || 0);
    const p2 = Number(entry.bggFuelP2 || 0) + Number(entry.bggTransportP2 || 0);
    const fn = p1 > 0 && p2 > 0 ? (p1 + p2) / 2 : p1 || p2 || Number(entry.bggAvgFn || 0);
    const computed = fn > 0 ? computeRFIndex(formula, fn) : 0;
    if (computed > 0) return computed;
    if (Number(entry.bggRfIndex) > 0) {
      return formula && !formula.allowFall && entry.bggRfIndex < 1 ? 1 : Number(entry.bggRfIndex);
    }
  }
  if (Number(periodRF?.rfIndexResult) > 0) return Number(periodRF.rfIndexResult);
  return defaultRF > 0 ? defaultRF : 1.0;
}

export function calculateBACommercialBreakdown(
  customerCode: string,
  allItems: any[],
  rfIndexCalculated: number = 1.0,
  isCustomerDBK: boolean = false,
  isSurvey?: boolean,
  fuelPeriods?: Record<string, any>
): BACommercialBreakdown {
  const kind = customerKind(customerCode);
  const isBGG = kind === "BGG";
  const isPOS = kind === "POS";
  const isSBS = kind === "SBS";
  const hasAdjustedOperatingVolume = (allItems || []).some(
    (it) => !it.isDeduction && it.category !== "DP Fuel" && Number(it.adjustedVolume || 0) > 0
  );
  const effectiveIsSurvey = isSurvey !== undefined ? isSurvey : hasAdjustedOperatingVolume;

  let obAmount = 0;
  let coalAmount = 0;
  let overdistanceGross = 0;
  let mdoGross = 0;
  let dpFuelDeduction = 0;
  let sbsPenalties = 0;

  for (const it of allItems || []) {
    const vol = getBAEffectiveVolume(it, allItems, effectiveIsSurvey);
    const subtotal = getBAItemSubtotal(it, vol, isCustomerDBK, customerCode);
    const mLow = (it.material || it.sowDescription || "").toLowerCase();
    const cat = it.category || "";

    if (isSBS) {
      if (cat === "Pengurang Biaya" || cat === "Pengurang Pembayaran" || it.isDeduction) {
        sbsPenalties += Math.abs(subtotal);
      } else if (cat === "Penunjang" || cat === "Equipment Rental" || (it.unit || "").toLowerCase().includes("hour") || (it.unit || "").toLowerCase() === "jam") {
        mdoGross += Math.max(0, subtotal);
      } else {
        obAmount += Math.max(0, subtotal);
      }
      continue;
    }

    if (cat === "DP Fuel" || it.isDeduction || mLow.includes("dp fuel") || mLow.includes("pengurang solar")) {
      dpFuelDeduction += Math.abs(subtotal);
    } else if (isDistanceItem(it)) {
      overdistanceGross += subtotal; // Note: for POS underhaul, this can be negative
    } else if (cat === "MDO" || cat === "Support" || cat === "Equipment Rental" || cat === "Penunjang" || cat === "Land Clearing" || mLow.includes("clearing")) {
      mdoGross += subtotal;
    } else if (isOBMaterial(mLow)) {
      obAmount += subtotal;
    } else if (mLow.includes("coal") || mLow.includes("batubara")) {
      coalAmount += subtotal;
    } else {
      obAmount += subtotal;
    }
  }

  const basePokok = obAmount + coalAmount;
  const effectiveRF = rfIndexCalculated > 0 ? rfIndexCalculated : 1.0;
  let rfAmount = 0;
  let odDeduction = 0;

  if (isBGG) {
    const bggComputed = getBGGComputedInvoiceLines(allItems, effectiveRF, effectiveIsSurvey, fuelPeriods);
    rfAmount = bggComputed.subtotalD;
    odDeduction = Math.abs(bggComputed.subtotalE);
  } else if (isPOS) {
    if (effectiveRF !== 1.0) {
      rfAmount = Math.round((effectiveRF - 1.0) * (basePokok + overdistanceGross + mdoGross));
    }
    // Fallback: If no explicit DP fuel line item in items list, check if fuelPeriods or posData has fuel refill costs
    if (dpFuelDeduction === 0 && fuelPeriods) {
      // Per periode: pakai rincian refill bila ada, selain itu actualFuelCost periode tersebut.
      let refillCost = 0;
      Object.values(fuelPeriods).forEach((pData: any) => {
        const refills = Array.isArray(pData?.fuelRefills) ? pData.fuelRefills : [];
        const periodRefill = refills.reduce((acc: number, r: any) => {
          const l = Number(r.liters || 0);
          const p = Number(r.pricePerLiter || 0);
          return l > 0 && p > 0 ? acc + l * p : acc;
        }, 0);
        refillCost += periodRefill > 0 ? periodRefill : Number(pData?.actualFuelCost || 0);
      });
      if (refillCost > 0) {
        dpFuelDeduction = refillCost;
      }
    }
  }

  // Khusus SBS: Gross = Seksi A + Seksi B (tanpa potongan Section P sebelum pajak).
  // Pajak dihitung dari Gross, dan Section P dipotong di akhir dari Total Invoice -> Total Dibayar.
  const totalDeductions = isSBS ? sbsPenalties : (odDeduction + dpFuelDeduction);
  const totalGross = isSBS
    ? (basePokok + mdoGross)
    : basePokok + overdistanceGross + mdoGross + rfAmount - totalDeductions;
  const totalDPP = totalGross;
  const dpp11_12 = Math.round((totalGross * 11) / 12);
  const vat12 = Math.round(dpp11_12 * 0.12);
  const ppnAmount = vat12;
  const pph23Amount = Math.round(totalGross * 0.02);
  const netTotalInvoice = totalGross + vat12 - pph23Amount;
  const totalDibayar = isSBS ? netTotalInvoice - sbsPenalties : netTotalInvoice;
  const netAR = totalDibayar;

  return {
    basePokok,
    obAmount,
    coalAmount,
    overdistanceGross,
    mdoGross,
    rfRateFactor: effectiveRF,
    rfAmount,
    odDeduction,
    dpFuelDeduction: isSBS ? 0 : dpFuelDeduction,
    totalDeductions,
    totalDPP,
    totalGross,
    dpp11_12,
    vat12,
    ppnAmount,
    pph23Amount,
    netAR,
    netTotalInvoice,
    totalDibayar,
    subtotalP: isSBS ? sbsPenalties : 0,
  };
}

export interface GLJournalLinePreview {
  accountNo: string;
  accountName: string;
  debit: number;
  credit: number;
  note: string;
}

export function generateBAGLJournalPreview(
  breakdown: BACommercialBreakdown,
  customerCode: string
): { lines: GLJournalLinePreview[]; totalDebit: number; totalCredit: number; isBalanced: boolean } {
  const lines: GLJournalLinePreview[] = [];
  // amount > 0 = debit, amount < 0 = kredit; nilai negatif (mis. underhaul POS) otomatis pindah sisi.
  const post = (accountNo: string, accountName: string, amount: number, note: string) => {
    if (!amount) return;
    lines.push({ accountNo, accountName, debit: amount > 0 ? amount : 0, credit: amount < 0 ? -amount : 0, note });
  };

  post("1103.101", `Piutang Usaha Belum Ditagih (${customerCode || "Customer"})`, breakdown.netAR, "Pengakuan piutang belum tertagih atas Berita Acara");
  post("1108.002", "Uang Muka PPh Pasal 23 (2%)", breakdown.pph23Amount, "Pajak penghasilan dipotong customer");
  post("4199.000", "Potongan Kontrak & Biaya Pengurang (OD 25% / Fuel)", breakdown.totalDeductions, "Potongan kontrak operasional & penalti");
  post("4101.000", "Pendapatan Jasa Overburden Removal", -breakdown.obAmount, "Pendapatan operasi pengupasan tanah penutup");
  post("4102.000", "Pendapatan Jasa Coal Mining / Winning", -breakdown.coalAmount, "Pendapatan operasi penambangan batubara");
  post("4103.000", "Pendapatan Jasa Overdistance Hauling", -breakdown.overdistanceGross, "Pendapatan jarak angkut lebih (overdistance)");
  post("4109.000", "Pendapatan Jasa Penunjang & MDO", -breakdown.mdoGross, "Pendapatan jasa rental alat & penunjang tambang");
  post("4120.000", "Pendapatan Eskalasi Nilai Kontrak (Raise & Fall)", -breakdown.rfAmount, `RF kontrak (${(breakdown.rfRateFactor || 1).toFixed(3)}x)`);
  post("2102.100", "PPN Keluaran Belum Difakturkan (11%)", -breakdown.ppnAmount, "Kewajiban PPN 11% atas pengakuan BA");

  // Tidak ada "plug" selisih pembulatan: bila tidak balance, preview harus menampilkannya apa adanya.
  const totalDebit = lines.reduce((acc, l) => acc + l.debit, 0);
  const totalCredit = lines.reduce((acc, l) => acc + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return { lines, totalDebit, totalCredit, isBalanced };
}

export interface BGGComputedLineItem {
  id: string;
  section: "D" | "E";
  description: string;
  notes?: string;
  period?: string;
  unit: string;
  volume: number;
  rate: number;
  subtotal: number;
}

export function getBGGComputedInvoiceLines(
  allItems: any[],
  rfIndexCalculated: number = 1.0,
  isSurvey: boolean = false,
  fuelPeriods?: Record<string, any>
): {
  sectionDItems: BGGComputedLineItem[];
  sectionEItems: BGGComputedLineItem[];
  subtotalD: number;
  subtotalE: number;
} {
  const effectiveRF = rfIndexCalculated > 0 ? Number(rfIndexCalculated.toFixed(3)) : 1.0;
  const odDisc = contractParams("BGG").odDiscountPct / 100;
  const sectionDItems: BGGComputedLineItem[] = [];
  const sectionEItems: BGGComputedLineItem[] = [];

  let subtotalOD_OB = 0;
  let subtotalOD_Coal = 0;
  let subtotalRF_OD_OB = 0;
  let subtotalRF_OD_Coal = 0;

  for (const item of allItems || []) {
    const isDist = isDistanceItem(item);
    const mLow = (item.material || item.sowDescription || "").toLowerCase();
    const isOB = isOBMaterial(mLow);
    const isCoal = mLow.includes("coal") || mLow.includes("batubara");
    const effVol = getBAEffectiveVolume(item, allItems, isSurvey);
    const r = Number(item.rate || 0);
    const itemPeriod = (item.period || item.notes || "").trim();
    const itemRF = Number(getBGGRFIndexForPeriod(itemPeriod, effectiveRF, fuelPeriods).toFixed(3));
    // Indeks sudah dibatasi sesuai AllowFall Master RF; delta negatif = Fall.
    const rfDelta = Number((itemRF - 1.0).toFixed(3));

    if (item.category === "DP Fuel" || item.isDeduction || mLow.includes("dp fuel")) {
      continue;
    }

    if (isDist) {
      const baseDist = getBaseDistance(item, "BGG");
      const rawDist = Number(item.distanceM ?? item.distance ?? item.distanceWeightAvg ?? baseDist);
      const dist = (rawDist > 0 && rawDist < 50) ? rawDist * 1000 : rawDist;
      const diffMtr = baseDist > 0 ? Math.max(0, dist - baseDist) : 0;
      const grossSub = getBAItemSubtotal(item, effVol, false, "BGG");

      if (isOB) {
        subtotalOD_OB += grossSub;
      } else if (isCoal) {
        subtotalOD_Coal += grossSub;
      }

      // Section D for Over Distance using item-level RF Index
      const escalatedRate = (r * rfDelta) * (diffMtr / 100);
      const escalatedSub = Math.round(effVol * escalatedRate);

      if (isOB) {
        subtotalRF_OD_OB += escalatedSub;
      } else if (isCoal) {
        subtotalRF_OD_Coal += escalatedSub;
      }

      if (itemRF !== 1.0) {
        sectionDItems.push({
          id: `rf-${item.id || item.material}-${itemPeriod}`,
          section: "D",
          description: `Eskalasi ${item.material || "Over Distance"}`,
          notes: itemPeriod ? `Periode: ${itemPeriod}` : undefined,
          period: itemPeriod || undefined,
          unit: item.unit || "Bcm",
          volume: effVol,
          rate: Number(escalatedRate.toFixed(3)),
          subtotal: escalatedSub,
        });
      }
    } else {
      // Standard OB / Coal items using item-level RF Index
      const escalatedRate = r * rfDelta;
      const escalatedSub = Math.round(effVol * escalatedRate);

      if (itemRF !== 1.0) {
        sectionDItems.push({
          id: `rf-${item.id || item.material}-${itemPeriod}`,
          section: "D",
          description: `Eskalasi ${item.material || (isOB ? "OB Removal" : "Coal Winning")}`,
          notes: itemPeriod ? `Periode: ${itemPeriod}` : undefined,
          period: itemPeriod || undefined,
          unit: item.unit || (isCoal ? "Ton" : "Bcm"),
          volume: effVol,
          rate: Number(escalatedRate.toFixed(3)),
          subtotal: escalatedSub,
        });
      }
    }
  }

  // Check if Over Distance items exist to display Section E structure
  const hasOD_OB = (allItems || []).some((it) => {
    const m = (it.material || it.sowDescription || "").toLowerCase();
    return isDistanceItem(it) && (isOBMaterial(m));
  });
  const hasOD_Coal = (allItems || []).some((it) => {
    const m = (it.material || it.sowDescription || "").toLowerCase();
    return isDistanceItem(it) && (m.includes("coal") || m.includes("batubara"));
  });

  // Section E: Discount on Overdistance (25%)
  if (hasOD_OB || subtotalOD_OB > 0) {
    const disc = Math.round(subtotalOD_OB * odDisc);
    sectionEItems.push({
      id: "disc-od-ob",
      section: "E",
      description: "Discount Overdistance for OB Removal",
      unit: "Lot",
      volume: 1,
      rate: -disc,
      subtotal: -disc,
    });
  }
  if (hasOD_Coal || subtotalOD_Coal > 0) {
    const disc = Math.round(subtotalOD_Coal * odDisc);
    sectionEItems.push({
      id: "disc-od-coal",
      section: "E",
      description: "Discount Overdistance for Coal Winning",
      unit: "Lot",
      volume: 1,
      rate: -disc,
      subtotal: -disc,
    });
  }
  if ((hasOD_OB && effectiveRF !== 1.0) || subtotalRF_OD_OB > 0) {
    const disc = Math.round(subtotalRF_OD_OB * odDisc);
    sectionEItems.push({
      id: "disc-rf-od-ob",
      section: "E",
      description: "Discount Raise & Fall's Overdistance for OB Removal",
      unit: "Lot",
      volume: 1,
      rate: -disc,
      subtotal: -disc,
    });
  }
  if ((hasOD_Coal && effectiveRF !== 1.0) || subtotalRF_OD_Coal > 0) {
    const disc = Math.round(subtotalRF_OD_Coal * odDisc);
    sectionEItems.push({
      id: "disc-rf-od-coal",
      section: "E",
      description: "Discount Raise & Fall's Overdistance for Coal Winning",
      unit: "Lot",
      volume: 1,
      rate: -disc,
      subtotal: -disc,
    });
  }

  const subtotalD = sectionDItems.reduce((acc, it) => acc + it.subtotal, 0);
  const subtotalE = sectionEItems.reduce((acc, it) => acc + it.subtotal, 0);

  return {
    sectionDItems,
    sectionEItems,
    subtotalD,
    subtotalE,
  };
}

/**
 * Upah (Labor Ln) & kurs (Currency Xn) periode dari Master Data HO: Master RF periode, Master UMK site,
 * Master Kurs BI periode. Nilai 0 + sumber "Belum ada" bila master belum diisi (tidak ada angka standar).
 */
export function resolveHOMasterLaborAndCurrency(options: {
  customerCode?: string;
  period?: string;
  raiseFallMasters?: any[];
  minWageMasters?: any[];
  latestKursBI?: number;
  mRate?: number;
}): { laborLn: number; currencyXn: number; laborSource: string; currencySource: string } {
  const { customerCode = "", period = "", latestKursBI = 0, mRate = 0 } = options;
  const rf = rfMasterFor(customerCode, period);

  let laborLn = Number(rf?.actualLaborLn || 0);
  let laborSource = laborLn ? `Master RF (${rf.period})` : "";
  if (!laborLn) {
    laborLn = minWageFor(customerCode, period);
    laborSource = laborLn ? "Master UMK Site" : "Belum ada di Master UMK / RF";
  }

  let currencyXn = kursForPeriod(period);
  let currencySource = currencyXn ? `Master Kurs BI (${period})` : "";
  if (!currencyXn && Number(rf?.actualMRateXn) > 0) {
    currencyXn = Number(rf.actualMRateXn);
    currencySource = `Master RF (${rf.period})`;
  }
  if (!currencyXn && (latestKursBI > 0 || mRate > 0)) {
    currencyXn = latestKursBI || mRate;
    currencySource = "Master Kurs BI";
  }
  if (!currencyXn) currencySource = "Belum ada di Master Kurs BI";

  return { laborLn, currencyXn, laborSource, currencySource };
}

/**
 * Eskalasi 3-faktor (D Fuel + L Labor + F Fixed) memakai bobot & basis Master Raise & Fall customer
 * periode tersebut (atau master RF terakhir customer untuk periode baru).
 */
export function calculateTripleFactorRF(
  actualFuelFn: number,
  actualLaborLn: number,
  actualMRateXn: number,
  customerCode: string = "POS",
  period?: string
): { posD: number; posL: number; posF: number; rfIndex: number } {
  const m = rfMasterFor(customerCode, period) || rfTemplateFor(customerCode);
  if (!m) return { posD: 0, posL: 0, posF: 0, rfIndex: 0 };
  const posD = (actualFuelFn > 0 && actualMRateXn > 0 && m.baseFuelFo > 0) ? (m.weightFuelA * actualFuelFn * actualMRateXn) / m.baseFuelFo : 0;
  const posL = (actualLaborLn > 0 && actualMRateXn > 0 && m.baseLaborLo > 0 && m.baseForexXo > 0) ? (m.weightLaborB * actualLaborLn * actualMRateXn) / (m.baseLaborLo * m.baseForexXo) : 0;
  const posF = Number(m.weightFixedC || 0);
  const rfIndex = (posD > 0 || posL > 0) ? computeRFIndex(m, actualFuelFn, actualLaborLn, actualMRateXn) : 0;
  return { posD, posL, posF, rfIndex };
}
