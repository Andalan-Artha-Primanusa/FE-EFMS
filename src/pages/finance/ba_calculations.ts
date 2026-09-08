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

export function getBaseDistance(item: any): number {
  if (item?.distanceBasis !== undefined && item?.distanceBasis !== null && Number(item.distanceBasis) > 0) {
    return Number(item.distanceBasis);
  }
  const mLow = (item?.material || item?.description || item?.sowDescription || "").toLowerCase();
  if (mLow.includes("coal") || mLow.includes("batubara")) {
    return 3000;
  }
  return 1000;
}

export function getBAEffectiveVolume(item: any, allItems: any[], isSurvey: boolean = false): number {
  if (isDistanceItem(item)) {
    const selfVol = isSurvey ? Number(item.adjustedVolume ?? item.initialVolume ?? 0) : Number(item.initialVolume || 0);
    if (selfVol > 0) return selfVol;

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
        return obParents.reduce((acc, p) => acc + (isSurvey ? Number(p.adjustedVolume ?? p.initialVolume ?? 0) : Number(p.initialVolume || 0)), 0);
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
        return coalParents.reduce((acc, p) => acc + (isSurvey ? Number(p.adjustedVolume ?? p.initialVolume ?? 0) : Number(p.initialVolume || 0)), 0);
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
      return isSurvey ? Number(parent.adjustedVolume ?? parent.initialVolume ?? 0) : Number(parent.initialVolume || 0);
    }
  }
  return isSurvey ? Number(item.adjustedVolume ?? item.initialVolume ?? 0) : Number(item.initialVolume || 0);
}

export function getBAItemSubtotal(item: any, volume: number, isCustomerDBK: boolean = false): number {
  const r = Number(item.rate || 0);
  if (item.category === "DP Fuel" || item.isDeduction || (item.material || "").toLowerCase().includes("dp fuel")) {
    const amt = r !== 0 ? r : (item.subtotalInitial ? Number(item.subtotalInitial) : 0);
    const vol = volume > 0 ? volume : 1;
    return -Math.abs(vol === 1 ? amt : vol * amt);
  }
  if (isDistanceItem(item)) {
    const baseDist = getBaseDistance(item);
    const dist = Number(item.distanceWeightAvg ?? baseDist);
    const diffMtr = Math.max(0, dist - baseDist);
    const isPer100m = isCustomerDBK || (item.unit || "").includes("100") || (item.material || "").includes("100m") || (item.material || "").toUpperCase().includes("PIT SAPAN") || (item.material || "").toUpperCase().includes("OVERHAUL COAL");
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

export function calculateBACommercialBreakdown(
  customerCode: string,
  allItems: any[],
  rfIndexCalculated: number = 1.0,
  isCustomerDBK: boolean = false,
  isSurvey?: boolean
): BACommercialBreakdown {
  const isBGG = customerCode === "BGG" || customerCode === "PT BGG";
  const isSBS = customerCode === "SBS";
  const hasAdjustedVolume = (allItems || []).some((it) => Number(it.adjustedVolume || 0) > 0);
  const effectiveIsSurvey = isSurvey !== undefined ? isSurvey : hasAdjustedVolume;

  let obAmount = 0;
  let coalAmount = 0;
  let overdistanceGross = 0;
  let mdoGross = 0;
  let dpFuelDeduction = 0;
  let sbsPenalties = 0;

  for (const it of allItems || []) {
    const vol = getBAEffectiveVolume(it, allItems, effectiveIsSurvey);
    const subtotal = getBAItemSubtotal(it, vol, isCustomerDBK);
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
      overdistanceGross += Math.max(0, subtotal);
    } else if (cat === "MDO" || cat === "Support" || cat === "Equipment Rental" || cat === "Penunjang") {
      mdoGross += Math.max(0, subtotal);
    } else if (mLow.includes("ob") || mLow.includes("overburden") || mLow.includes("waste") || mLow.includes("over burden")) {
      obAmount += Math.max(0, subtotal);
    } else if (mLow.includes("coal") || mLow.includes("batubara")) {
      coalAmount += Math.max(0, subtotal);
    } else {
      obAmount += Math.max(0, subtotal);
    }
  }

  const basePokok = obAmount + coalAmount;
  const effectiveRF = rfIndexCalculated > 0 ? rfIndexCalculated : 1.0;
  let rfAmount = 0;
  let odDeduction = 0;

  if (isBGG) {
    let rfODAmount = 0;
    if (effectiveRF > 1.0) {
      rfAmount = Math.round((basePokok + overdistanceGross) * (effectiveRF - 1.0));
      rfODAmount = Math.round(overdistanceGross * (effectiveRF - 1.0));
    }
    odDeduction = Math.round((overdistanceGross + rfODAmount) * 0.25);
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
