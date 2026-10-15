// =============================================================
// BA CALCULATIONS & VOLUME ENGINE
// Business Logic / Service Layer helper: 100 – 300 lines.
// Authoritative calculation helpers for Berita Acara (BA) Tracker
// =============================================================

import { matchPeriod } from "./helpers";

import { customerKind, customerByCode, contractParams, baseDistanceFor, rfMasterFor, rfTemplateFor, computeRFIndex, forexRatio, minWageFor, kursForPeriod, masterRegistry, obSplitSOWs } from "./masterRegistry";

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
    const itemPeriod = (item.period || item.notes || "").trim();
    // Over/underhaul hanya mengambil volume produksi di area/lokasi yang sama (mis. WM1&WM2 vs Q2).
    const normArea = (a?: string) => (a || "").replace(/\s+/g, "").toLowerCase();
    const itemArea = normArea(item.area);
    const sameArea = (p: any) => { const pArea = normArea(p.area); return !itemArea || !pArea || itemArea === pArea; };

    if (isOBMaterial(mLow)) {
      const isMDO = (item.category || "").toLowerCase().includes("mdo") || mLow.includes("mdo");
      const obParents = allItems.filter((p) => {
        if (p.id === item.id || isDistanceItem(p) || !sameArea(p)) return false;
        const pCat = (p.category || "").toLowerCase();
        const pMat = (p.material || p.name || "").toLowerCase();
        const pIsMDO = pCat.includes("mdo") || pMat.includes("mdo");
        if (isMDO ? !pIsMDO : pIsMDO) return false;
        const isOB = isOBMaterial(pMat);
        if (!isOB) return false;
        if (itemPeriod) {
          const pPeriod = (p.period || p.notes || "").trim();
          return !pPeriod || matchPeriod(pPeriod, itemPeriod);
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
        if (p.id === item.id || isDistanceItem(p) || !sameArea(p)) return false;
        const pLow = (p.material || "").toLowerCase();
        const isCoal = pLow.includes("coal") || pLow.includes("batubara");
        if (!isCoal) return false;
        if (itemPeriod) {
          const pPeriod = (p.period || p.notes || "").trim();
          return !pPeriod || matchPeriod(pPeriod, itemPeriod);
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

    const parent = searchPool.find((p) => {
      if (!sameArea(p)) return false;
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
  const own = (it: any) => isSurvey
    ? (Number(it.adjustedVolume || 0) > 0 ? Number(it.adjustedVolume) : Number(it.initialVolume || 0))
    : Number(it.initialVolume || 0);
  return obSplitVolume(item, allItems || [], own) ?? own(item);
}

/**
 * Volume OB split kontrak (mis. 75% / 25%): Excel memakai total OB x porsi split presisi penuh, jadi volume
 * baris = jumlah pasangan OB (periode & area sama) x porsi Master SOW (sama dengan BE normalizeOBSplit).
 * null bila bukan item split atau pasangannya tidak lengkap.
 */
function obSplitVolume(item: any, allItems: any[], own: (it: any) => number): number | null {
  const norm = (s?: string) => (s || "").trim().toLowerCase();
  const sow = masterRegistry.sows.find((s: any) => norm(s.itemName || s.name) === norm(item.material) && Number(s.splitPercentage) > 0 && Number(s.splitPercentage) < 100);
  if (!sow) return null;
  const names = obSplitSOWs(sow.customerCode || sow.customer).map((s: any) => norm(s.itemName || s.name));
  const rows = allItems.filter((p) => names.includes(norm(p.material)) && norm(p.period) === norm(item.period) && norm(p.area) === norm(item.area));
  if (names.length !== 2 || rows.length !== 2 || norm(rows[0].material) === norm(rows[1].material)) return null;
  return ((own(rows[0]) + own(rows[1])) * Number(sow.splitPercentage)) / 100;
}

const isDPFuelRow = (it: any) => {
  const c = (it.category || "").toLowerCase();
  const m = (it.material || "").toLowerCase();
  return (it.section || "").toUpperCase() === "F" || c === "dp fuel" || m.includes("dp fuel") || m.includes("pengurang solar") || m.includes("potongan solar");
};
const dpFuelAmount = (it: any) => Math.abs(Number(it.rate || 0)) || Math.abs(Number(it.subtotalInitial || 0)) || Math.abs(Number(it.subtotalAdjusted || 0));

/**
 * DP Fuel bisa beberapa kali per bulan: semua baris bernominal dipertahankan. Baris kosong (placeholder
 * sisa simpanan lama) dibuang bila ada yang bernominal; bila semua kosong disisakan satu.
 */
export function dropEmptyDPFuel<T>(items: T[]): T[] {
  const dp = items.filter(isDPFuelRow);
  const filled = dp.filter(dpFuelAmount);
  const keep = new Set(filled.length > 0 ? filled : dp.slice(0, 1));
  return items.filter((it) => !isDPFuelRow(it) || keep.has(it));
}

/** Pajak dari DPP presisi penuh (sama dengan Excel & BE invoiceTaxes); hanya hasil akhirnya dibulatkan ke rupiah. */
export function invoiceTaxes(dpp: number) {
  const ppn = ((dpp * 11) / 12) * 0.12;
  const pph = dpp * 0.02;
  return { dpp11_12: Math.round((dpp * 11) / 12), vat12: Math.round(ppn), pph23: Math.round(pph), total: Math.round(dpp + ppn - pph) };
}

/**
 * Excel invoice: POS baris non-jarak & OB BGG = Vol x Rate tanpa ROUND; baris lain ROUND(...,0)
 * (sama dengan BE excelExactLine).
 */
export function excelLineAmount(value: number, customerCode: string | undefined, isDist: boolean, isCoal: boolean = false): number {
  const kind = customerKind(customerCode);
  const exact = !isDist && (kind === "POS" || (kind === "BGG" && !isCoal));
  return exact ? value : Math.round(value);
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
    return Math.round(volume * getDistanceFactor(item, customerCode, isCustomerDBK) * r);
  }
  const mLow = (item.material || item.sowDescription || "").toLowerCase();
  return excelLineAmount(volume * r, customerCode || item.customerCode, false, mLow.includes("coal") || mLow.includes("batubara"));
}

/**
 * Faktor jarak over/underhaul (selisih jarak / 100 m atau / 1.000 m), sama dengan BE RecalculateBA.
 * 0 bila basis jarak belum diatur di Master SOW (overdistance tidak ditagih).
 */
export function getDistanceFactor(item: any, customerCode?: string, isCustomerDBK: boolean = false): number {
  const baseDist = getBaseDistance(item, customerCode || item?.customerCode);
  if (baseDist <= 0) return 0;
  const rawDist = Number(item.distanceM ?? item.distance ?? item.distanceWeightAvg ?? baseDist);
  // Jarak < 50 dianggap km (mis. 1.325) lalu dikonversi ke meter.
  const dist = (rawDist > 0 && rawDist < 50) ? rawDist * 1000 : rawDist;
  const cust = customerKind(customerCode || item?.customerCode);
  const isPOS = cust === "POS" || (item.material || "").toLowerCase().includes("underhaul");
  const diffMtr = isPOS ? (dist - baseDist) : Math.max(0, dist - baseDist);
  const isPer100m = isCustomerDBK || customerByCode(cust)?.overhaulRateUnit === "PER_100M" || (item.unit || "").includes("100") || (item.material || "").includes("100m") || (item.material || "").toLowerCase().includes("over distance");
  return diffMtr / (isPer100m ? 100 : 1000);
}

/**
 * Porsi OB BGG yang bisa ditagih menurut kuota Stripping Ratio Master Customer (sama dengan BE RecalculateBA).
 * 1 = tanpa batas; kelebihannya dicatat ke Pending Volume Ledger saat BA ditagih.
 */
export function bggOBBillableFactor(customerCode: string, form?: any): number {
  if (customerKind(customerCode) !== "BGG") return 1;
  const sr = contractParams(customerCode).maxStrippingRatio;
  const coal = Number(form?.bggCoalVolumeTon ?? form?.bggData?.coalVolumeTon ?? 0);
  const nett = Number(form?.bggNettOB ?? form?.bggData?.nettOBVolume ?? 0);
  return sr > 0 && coal > 0 && nett > coal * sr ? (coal * sr) / nett : 1;
}

export interface BACommercialBreakdown {
  basePokok: number;
  obAmount: number;
  /** Bagian obAmount untuk material nikel POS (akun 4107 / 4108 / 4109). */
  limoniteAmount: number;
  saproliteAmount: number;
  topSoilAmount: number;
  coalAmount: number;
  overdistanceGross: number;
  /** Bagian overdistanceGross untuk coal (akun 4106); sisanya OB (4105). */
  overdistanceCoalGross: number;
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
  fuelPeriods?: Record<string, any>,
  obFactor: number = 1
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
  let limoniteAmount = 0;
  let saproliteAmount = 0;
  let topSoilAmount = 0;
  let coalAmount = 0;
  let overdistanceGross = 0;
  let overdistanceCoalGross = 0;
  let mdoGross = 0;
  let dpFuelDeduction = 0;
  let sbsPenalties = 0;
  const effectiveRF = rfIndexCalculated > 0 ? rfIndexCalculated : 1.0;
  // R&F POS per baris seperti Excel: (RF-1) x subtotal; baris jarak ROUND, lainnya presisi penuh (sama dengan BE).
  let posRF = 0;

  for (const it of allItems || []) {
    const mLow = (it.material || it.sowDescription || "").toLowerCase();
    const isCoalMat = mLow.includes("coal") || mLow.includes("batubara");
    // BGG: OB (termasuk over distance OB) dibatasi kuota Stripping Ratio.
    const volFactor = isBGG && !isCoalMat && isOBMaterial(mLow) ? obFactor : 1;
    const vol = getBAEffectiveVolume(it, allItems, effectiveIsSurvey) * volFactor;
    const subtotal = getBAItemSubtotal(it, vol, isCustomerDBK, customerCode);
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

    const isDed = cat === "DP Fuel" || it.isDeduction || mLow.includes("dp fuel") || mLow.includes("pengurang solar");
    if (isPOS && !isDed && effectiveRF !== 1.0) {
      posRF += isDistanceItem(it)
        ? Math.round(vol * getDistanceFactor(it, customerCode, isCustomerDBK) * Number(it.rate || 0) * (effectiveRF - 1.0))
        : subtotal * (effectiveRF - 1.0);
    }
    if (isDed) {
      dpFuelDeduction += Math.abs(subtotal);
    } else if (isDistanceItem(it)) {
      overdistanceGross += subtotal; // Note: for POS underhaul, this can be negative
      if (isCoalMat) overdistanceCoalGross += subtotal;
    } else if (cat === "MDO" || cat === "Support" || cat === "Equipment Rental" || cat === "Penunjang" || cat === "Land Clearing" || mLow.includes("clearing")) {
      mdoGross += subtotal;
    } else if (isOBMaterial(mLow)) {
      obAmount += subtotal;
    } else if (isCoalMat) {
      coalAmount += subtotal;
    } else {
      obAmount += subtotal;
      if (mLow.includes("limonite")) limoniteAmount += subtotal;
      else if (mLow.includes("saprolite")) saproliteAmount += subtotal;
      else if (mLow.includes("top soil") || mLow.includes("topsoil")) topSoilAmount += subtotal;
    }
  }

  const basePokok = obAmount + coalAmount;
  let rfAmount = 0;
  let odDeduction = 0;

  if (isBGG) {
    const bggComputed = getBGGComputedInvoiceLines(allItems, effectiveRF, effectiveIsSurvey, fuelPeriods, obFactor);
    rfAmount = bggComputed.subtotalD;
    odDeduction = Math.abs(bggComputed.subtotalE);
  } else if (isPOS) {
    rfAmount = posRF;
  }

  // Khusus SBS: Gross = Seksi A + Seksi B (tanpa potongan Section P sebelum pajak).
  // Pajak dihitung dari Gross, dan Section P dipotong di akhir dari Total Invoice -> Total Dibayar.
  const totalDeductions = isSBS ? sbsPenalties : (odDeduction + dpFuelDeduction);
  const totalGross = isSBS
    ? (basePokok + mdoGross)
    : basePokok + overdistanceGross + mdoGross + rfAmount - totalDeductions;
  const totalDPP = totalGross;
  const { dpp11_12, vat12, pph23: pph23Amount, total: netTotalInvoice } = invoiceTaxes(totalGross);
  const ppnAmount = vat12;
  const totalDibayar = isSBS ? netTotalInvoice - sbsPenalties : netTotalInvoice;
  const netAR = totalDibayar;

  return {
    basePokok,
    obAmount,
    limoniteAmount,
    saproliteAmount,
    topSoilAmount,
    coalAmount,
    overdistanceGross,
    overdistanceCoalGross,
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

  // Akun & nama sama dengan jurnal akrual BE (buildUnifiedJournalLines / appendRevenueCreditLines).
  const nickel = breakdown.limoniteAmount + breakdown.saproliteAmount + breakdown.topSoilAmount;
  post("1103.101", `Piutang Usaha (PT ${customerCode || "Customer"})`, breakdown.netAR, "Piutang atas Berita Acara");
  post("1108.002", "PPh 23 Dibayar Dimuka", breakdown.pph23Amount, "Potongan PPh 23 (2%)");
  post("4199.000", "Potongan Pendapatan / Denda & BBM", breakdown.totalDeductions, "Pengurang Biaya / Denda / Diskon OD");
  post("4101.000", "Pendapatan Over Burden (OB)", -(breakdown.obAmount - nickel), "Pendapatan OB penambangan");
  post("4102.000", "Pendapatan Coal Winning", -breakdown.coalAmount, "Pendapatan batubara / coal winning");
  post("4104.000", "Pendapatan Rental", -breakdown.mdoGross, "Pendapatan rental alat berat penunjang");
  post("4105.000", "Pendapatan Under/Over Distance OB", -(breakdown.overdistanceGross - breakdown.overdistanceCoalGross), "Pendapatan over distance OB");
  post("4106.000", "Pendapatan Under/Over Distance CG", -breakdown.overdistanceCoalGross, "Pendapatan over distance batubara");
  post("4107.000", "Pendapatan Limonite", -breakdown.limoniteAmount, "Pendapatan jasa penambangan limonite");
  post("4108.000", "Pendapatan Saprolite", -breakdown.saproliteAmount, "Pendapatan jasa penambangan saprolite");
  post("4109.000", "Pendapatan Top Soil", -breakdown.topSoilAmount, "Pendapatan jasa topsoil");
  post("4120.000", "Pendapatan Eskalasi / Penyesuaian Harga (Raise & Fall)", -breakdown.rfAmount, `RF kontrak (${(breakdown.rfRateFactor || 1).toFixed(3)}x)`);
  post("2102.100", "Hutang PPN Keluaran", -breakdown.ppnAmount, "PPN Keluaran atas Berita Acara");

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
  fuelPeriods?: Record<string, any>,
  obFactor: number = 1
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
    // OB dibatasi kuota Stripping Ratio (sama dengan BE).
    const effVol = getBAEffectiveVolume(item, allItems, isSurvey) * (isOB && !isCoal ? obFactor : 1);
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
    } else {
      // Standard OB / Coal items using item-level RF Index
      const escalatedRate = r * rfDelta;
      const escalatedSub = Math.round(effVol * escalatedRate);

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
    const disc = subtotalOD_OB * odDisc;
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
    const disc = subtotalOD_Coal * odDisc;
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
    const disc = subtotalRF_OD_OB * odDisc;
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
    const disc = subtotalRF_OD_Coal * odDisc;
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
  // Komponen D sama dengan computeRFIndex: solar USD (< 100) dikonversi kurs, basis Fo USD ikut dikali Xo.
  const fuelUSD = actualMRateXn > 0 && actualFuelFn < 100;
  const baseFo = fuelUSD && m.baseFuelFo < 100 && m.baseForexXo > 0 ? m.baseFuelFo * m.baseForexXo : m.baseFuelFo;
  const posD = (actualFuelFn > 0 && m.baseFuelFo > 0) ? (m.weightFuelA * actualFuelFn * (fuelUSD ? actualMRateXn : 1)) / baseFo : 0;
  const posL = (actualLaborLn > 0 && m.baseLaborLo > 0) ? (m.weightLaborB * actualLaborLn * forexRatio(actualMRateXn, m.baseForexXo)) / m.baseLaborLo : 0;
  const posF = Number(m.weightFixedC || 0);
  const rfIndex = (posD > 0 || posL > 0) ? computeRFIndex(m, actualFuelFn, actualLaborLn, actualMRateXn) : 0;
  return { posD, posL, posF, rfIndex };
}
