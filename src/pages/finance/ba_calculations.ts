// =============================================================
// BA CALCULATIONS & VOLUME ENGINE
// Business Logic / Service Layer helper: 100 – 300 lines.
// Authoritative calculation helpers for Berita Acara (BA) Tracker
// =============================================================

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

export function getBaseDistance(item: any, customerCode?: string): number {
  if (item?.distanceBasis !== undefined && item?.distanceBasis !== null && Number(item.distanceBasis) > 0) {
    return Number(item.distanceBasis);
  }
  const cust = (customerCode || item?.customerCode || item?.customer || "").toUpperCase();
  const isBGG = cust.includes("BGG") || (item?.material || "").toUpperCase().includes("BGG") || (item?.area || "").toUpperCase().includes("KKL") || (item?.area || "").toUpperCase().includes("KUNGKILAN");
  if (isBGG) {
    return 1000;
  }
  const mLow = (item?.material || item?.description || item?.sowDescription || "").toLowerCase();
  if (mLow.includes("coal") || mLow.includes("batubara")) {
    return 3000;
  }
  return 1000;
}

export function getBAEffectiveVolume(item: any, allItems: any[], isSurvey: boolean = false): number {
  if (isDistanceItem(item)) {
    const mLow = (item.material || "").toLowerCase();
    const itemPeriod = (item.period || item.notes || "").trim().toLowerCase();

    if (mLow.includes("ob") || mLow.includes("overburden") || mLow.includes("waste") || mLow.includes("over burden")) {
      const obParents = allItems.filter((p) => {
        if (p.id === item.id || isDistanceItem(p)) return false;
        const pLow = (p.material || "").toLowerCase();
        const isOB = pLow.includes("ob") || pLow.includes("overburden") || pLow.includes("waste") || pLow.includes("over burden");
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

    const parent = allItems.find((p) => {
      if (p.id === item.id || isDistanceItem(p)) return false;
      if (item.parentMaterial) return p.material === item.parentMaterial;
      const pLow = (p.material || "").toLowerCase();
      if (mLow.includes("top soil")) return pLow.includes("top soil");
      if (mLow.includes("limonite")) return pLow.includes("limonite");
      if (mLow.includes("saprolite")) return pLow.includes("saprolite");
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
  if (item.category === "DP Fuel" || item.isDeduction || (item.material || "").toLowerCase().includes("dp fuel")) {
    const amt = r !== 0 ? r : (item.subtotalInitial ? Number(item.subtotalInitial) : 0);
    const vol = volume > 0 ? volume : 1;
    return -Math.abs(vol === 1 ? amt : vol * amt);
  }
  if (isDistanceItem(item)) {
    const baseDist = getBaseDistance(item, customerCode || item?.customerCode);
    const rawDist = Number(item.distanceWeightAvg ?? item.distance ?? baseDist);
    // If distance is entered as e.g. 1.325 or 4.976 (meaning 1.325 km or parsed with decimal point), scale to meters
    const dist = (rawDist > 0 && rawDist < 50) ? rawDist * 1000 : rawDist;
    const cust = (customerCode || item?.customerCode || "").toUpperCase();
    const isPOS = cust.includes("POS") || (item.material || "").toLowerCase().includes("underhaul");
    const diffMtr = isPOS ? (dist - baseDist) : Math.max(0, dist - baseDist);
    const isPer100m = isCustomerDBK || (item.unit || "").includes("100") || (item.material || "").includes("100m") || (item.material || "").toUpperCase().includes("PIT SAPAN") || (item.material || "").toUpperCase().includes("OVERHAUL COAL") || (item.material || "").toUpperCase().includes("BGG") || (item.material || "").toLowerCase().includes("over distance") || cust.includes("BGG");
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

export function getBGGRFIndexForPeriod(
  itemPeriod?: string,
  defaultRF: number = 1.581,
  fuelPeriods?: Record<string, any>
): number {
  if (!itemPeriod) return defaultRF > 0 ? defaultRF : 1.581;
  if (fuelPeriods) {
    for (const [pKey, pVal] of Object.entries(fuelPeriods)) {
      if (pVal?.bggRfIndex && pVal.bggRfIndex > 0) {
        const kLow = pKey.toLowerCase();
        const iLow = itemPeriod.toLowerCase();
        if (kLow === iLow || kLow.includes(iLow) || iLow.includes(kLow)) {
          return pVal.bggRfIndex;
        }
      }
    }
  }
  const pLow = itemPeriod.toLowerCase();
  if (pLow.includes("jul") || pLow.includes("07")) {
    return 1.480;
  }
  if (pLow.includes("feb") || pLow.includes("02")) {
    return 1.274;
  }
  if (pLow.includes("jun") || pLow.includes("06")) {
    return 1.560;
  }
  if (pLow.includes("agu") || pLow.includes("aug") || pLow.includes("08")) {
    return defaultRF > 0 ? defaultRF : 1.581;
  }
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
  const isBGG = customerCode === "BGG" || customerCode === "PT BGG";
  const isPOS = customerCode === "POS" || customerCode === "PT POSITION" || customerCode === "PT. POSITION";
  const isSBS = customerCode === "SBS";
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

    if (cat === "DP Fuel" || it.isDeduction || mLow.includes("dp fuel")) {
      dpFuelDeduction += Math.abs(subtotal);
    } else if (isDistanceItem(it)) {
      overdistanceGross += subtotal; // Note: for POS underhaul, this can be negative
    } else if (cat === "MDO" || cat === "Support" || cat === "Equipment Rental" || cat === "Penunjang" || cat === "Land Clearing" || mLow.includes("clearing")) {
      mdoGross += subtotal;
    } else if (mLow.includes("ob") || mLow.includes("overburden") || mLow.includes("waste") || mLow.includes("over burden")) {
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
    if (effectiveRF > 0) {
      rfAmount = Math.round((effectiveRF - 1.0) * (basePokok + overdistanceGross + mdoGross));
    }
  }

  // Khusus SBS: Gross = Seksi A + Seksi B (tanpa potongan Section P sebelum pajak).
  // Pajak dihitung dari Gross, dan Section P dipotong di akhir dari Total Invoice -> Total Dibayar.
  const totalDeductions = isSBS ? sbsPenalties : (odDeduction + dpFuelDeduction);
  const totalGross = isSBS
    ? (basePokok + mdoGross)
    : Math.max(0, basePokok + overdistanceGross + mdoGross + rfAmount - totalDeductions);
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

  // Dr. 1103.101 Piutang Usaha Belum Ditagih (Net AR)
  if (breakdown.netAR > 0) {
    lines.push({
      accountNo: "1103.101",
      accountName: `Piutang Usaha Belum Ditagih (${customerCode || "Customer"})`,
      debit: breakdown.netAR,
      credit: 0,
      note: "Pengakuan piutang belum tertagih atas Berita Acara",
    });
  }

  // Dr. 1108.002 Uang Muka PPh Pasal 23 (2%)
  if (breakdown.pph23Amount > 0) {
    lines.push({
      accountNo: "1108.002",
      accountName: "Uang Muka PPh Pasal 23 (2%)",
      debit: breakdown.pph23Amount,
      credit: 0,
      note: "Pajak penghasilan dipotong customer",
    });
  }

  // Dr. 4199.000 Potongan Kontrak (OD 25% / DP Fuel)
  if (breakdown.totalDeductions > 0) {
    lines.push({
      accountNo: "4199.000",
      accountName: "Potongan Kontrak & Biaya Pengurang (OD 25% / Fuel)",
      debit: breakdown.totalDeductions,
      credit: 0,
      note: "Potongan kontrak operasional & penalti",
    });
  }

  // Cr. 4101.000 Pendapatan Jasa Overburden Removal
  if (breakdown.obAmount > 0) {
    lines.push({
      accountNo: "4101.000",
      accountName: "Pendapatan Jasa Overburden Removal",
      debit: 0,
      credit: breakdown.obAmount,
      note: "Pendapatan operasi pengupasan tanah penutup",
    });
  }

  // Cr. 4102.000 Pendapatan Jasa Coal Getting / Winning
  if (breakdown.coalAmount > 0) {
    lines.push({
      accountNo: "4102.000",
      accountName: "Pendapatan Jasa Coal Mining / Winning",
      debit: 0,
      credit: breakdown.coalAmount,
      note: "Pendapatan operasi penambangan batubara",
    });
  }

  // Cr. 4103.000 Pendapatan Jasa Overdistance / Overhaul
  if (breakdown.overdistanceGross > 0) {
    lines.push({
      accountNo: "4103.000",
      accountName: "Pendapatan Jasa Overdistance Hauling",
      debit: 0,
      credit: breakdown.overdistanceGross,
      note: "Pendapatan jarak angkut lebih (overdistance)",
    });
  }

  // Cr. 4109.000 Pendapatan Jasa Penunjang & MDO
  if (breakdown.mdoGross > 0) {
    lines.push({
      accountNo: "4109.000",
      accountName: "Pendapatan Jasa Penunjang & MDO",
      debit: 0,
      credit: breakdown.mdoGross,
      note: "Pendapatan jasa rental alat & penunjang tambang",
    });
  }

  // Cr. 4120.000 Pendapatan Eskalasi Raise & Fall
  if (breakdown.rfAmount > 0) {
    lines.push({
      accountNo: "4120.000",
      accountName: "Pendapatan Eskalasi Nilai Kontrak (Raise & Fall)",
      debit: 0,
      credit: breakdown.rfAmount,
      note: `Eskalasi index kontrak (${(breakdown.rfRateFactor || 1).toFixed(3)}x)`,
    });
  }

  // Cr. 2102.100 PPN Keluaran Belum Difakturkan (11%)
  if (breakdown.ppnAmount > 0) {
    lines.push({
      accountNo: "2102.100",
      accountName: "PPN Keluaran Belum Difakturkan (11%)",
      debit: 0,
      credit: breakdown.ppnAmount,
      note: "Kewajiban PPN 11% atas pengakuan BA",
    });
  }

  const totalDebit = lines.reduce((acc, l) => acc + l.debit, 0);
  const totalCredit = lines.reduce((acc, l) => acc + l.credit, 0);
  const isBalanced = totalDebit === totalCredit;

  return { lines, totalDebit, totalCredit, isBalanced };
}

export interface BGGComputedLineItem {
  id: string;
  section: "D" | "E";
  description: string;
  notes?: string;
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
  const effectiveRF = rfIndexCalculated > 0 ? rfIndexCalculated : 1.0;
  const sectionDItems: BGGComputedLineItem[] = [];
  const sectionEItems: BGGComputedLineItem[] = [];

  let subtotalOD_OB = 0;
  let subtotalOD_Coal = 0;
  let subtotalRF_OD_OB = 0;
  let subtotalRF_OD_Coal = 0;

  for (const item of allItems || []) {
    const isDist = isDistanceItem(item);
    const mLow = (item.material || item.sowDescription || "").toLowerCase();
    const isOB = mLow.includes("ob") || mLow.includes("overburden") || mLow.includes("waste") || mLow.includes("over burden");
    const isCoal = mLow.includes("coal") || mLow.includes("batubara");
    const effVol = getBAEffectiveVolume(item, allItems, isSurvey);
    const r = Number(item.rate || 0);
    const itemPeriod = (item.period || item.notes || "").trim();
    const itemRF = getBGGRFIndexForPeriod(itemPeriod, effectiveRF, fuelPeriods);

    if (item.category === "DP Fuel" || item.isDeduction || mLow.includes("dp fuel")) {
      continue;
    }

    if (isDist) {
      const baseDist = getBaseDistance(item, "BGG");
      const rawDist = Number(item.distanceWeightAvg ?? item.distance ?? baseDist);
      const dist = (rawDist > 0 && rawDist < 50) ? rawDist * 1000 : rawDist;
      const diffMtr = Math.max(0, dist - baseDist);
      const grossSub = getBAItemSubtotal(item, effVol, false, "BGG");

      if (isOB) {
        subtotalOD_OB += grossSub;
      } else if (isCoal) {
        subtotalOD_Coal += grossSub;
      }

      // Section D for Over Distance using item-level RF Index
      const escalatedRate = ((r * itemRF) - r) * (diffMtr / 100);
      const escalatedSub = Math.round(effVol * escalatedRate);

      if (isOB) {
        subtotalRF_OD_OB += escalatedSub;
      } else if (isCoal) {
        subtotalRF_OD_Coal += escalatedSub;
      }

      if (itemRF > 1.0 && escalatedSub > 0) {
        sectionDItems.push({
          id: `rf-${item.id || item.material}-${itemPeriod}`,
          section: "D",
          description: `Eskalasi ${item.material || "Over Distance"}`,
          notes: itemPeriod ? `Periode: ${itemPeriod}` : undefined,
          unit: item.unit || "Bcm",
          volume: effVol,
          rate: Number(escalatedRate.toFixed(3)),
          subtotal: escalatedSub,
        });
      }
    } else {
      // Standard OB / Coal items using item-level RF Index
      const escalatedRate = (r * itemRF) - r;
      const escalatedSub = Math.round(effVol * escalatedRate);

      if (itemRF > 1.0 && escalatedSub > 0) {
        sectionDItems.push({
          id: `rf-${item.id || item.material}-${itemPeriod}`,
          section: "D",
          description: `Eskalasi ${item.material || (isOB ? "OB Removal" : "Coal Winning")}`,
          notes: itemPeriod ? `Periode: ${itemPeriod}` : undefined,
          unit: item.unit || (isCoal ? "Ton" : "Bcm"),
          volume: effVol,
          rate: Number(escalatedRate.toFixed(3)),
          subtotal: escalatedSub,
        });
      }
    }
  }

  // Section E: Discount on Overdistance (25%)
  if (subtotalOD_OB > 0) {
    const disc = Math.round(subtotalOD_OB * 0.25);
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
  if (subtotalOD_Coal > 0) {
    const disc = Math.round(subtotalOD_Coal * 0.25);
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
  if (subtotalRF_OD_OB > 0) {
    const disc = Math.round(subtotalRF_OD_OB * 0.25);
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
  if (subtotalRF_OD_Coal > 0) {
    const disc = Math.round(subtotalRF_OD_Coal * 0.25);
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
