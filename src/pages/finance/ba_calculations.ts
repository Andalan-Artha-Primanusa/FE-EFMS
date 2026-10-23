// =============================================================
// BA CALCULATIONS & VOLUME ENGINE
// Business Logic / Service Layer helper: 100 – 300 lines.
// Authoritative calculation helpers for Berita Acara (BA) Tracker
// =============================================================

import { matchPeriod, parsePeriodToMonthIndex, formatIDR } from "./helpers";
import type { BACalc, BACalcLine } from "../../types";

import { customerKind, customerByCode, baseDistanceFor, rfMasterFor, rfTemplateFor, computeRFIndex, forexRatio, minWageFor, kursForPeriod, masterRegistry, obSplitSOWs, odDiscountPctFor, bggTierRate } from "./masterRegistry";

export { customerKind };

/** BA Rental POS (Daywork): posData.rental terisi (sama dengan BE isRentalBA). */
export const isRentalBA = (ba: any): boolean => Boolean(ba?.posData?.rental);

/** BA MDO POS: posData.mdo terisi; BA Operation POS = BA POS tanpa penanda. */
export const isPOSMDOBA = (ba: any): boolean => Boolean(ba?.posData?.mdo);

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

/** Land Clearing / Clear & Grub: seksi tersendiri di BA POS, bukan bagian Production. */
export const isLandClearingItem = (item: any): boolean =>
  !isDistanceItem(item) && (item?.category === "Land Clearing" || /clearing|grub/i.test(item?.material || ""));

/** Basis jarak kontrak: dari item BA, lalu Master Variable SOW customer. 0 = belum diatur di master. */
export function getBaseDistance(item: any, customerCode?: string): number {
  if (Number(item?.distanceBasis) > 0) return Number(item.distanceBasis);
  return baseDistanceFor(customerCode || item?.customerCode || item?.customer, item?.material || item?.description || item?.sowDescription);
}

/** Apakah baris produksi `p` adalah induk dari baris over/underhaul `dist` (area sama + material sepadan). */
export function isDistanceParent(dist: any, p: any): boolean {
  const normArea = (a?: string) => (a || "").replace(/\s+/g, "").toLowerCase();
  const dArea = normArea(dist.area), pArea = normArea(p.area);
  if (dArea && pArea && dArea !== pArea) return false;
  // BGG: over distance dipasangkan per periode (carry-over Feb-26 terpisah dari Jun-26).
  if (dist.period?.trim() && p.period?.trim() && !matchPeriod(p.period, dist.period)) return false;
  const mLow = (dist.material || "").toLowerCase();
  const pLow = (p.material || p.name || "").toLowerCase();
  if (dist.parentMaterial) {
    const pmLow = dist.parentMaterial.toLowerCase().trim();
    const pMatLow = pLow.trim();
    if (pMatLow && (pMatLow === pmLow || pMatLow.includes(pmLow) || pmLow.includes(pMatLow))) return true;
  }
  if (mLow.includes("coal") || mLow.includes("batubara")) return pLow.includes("coal") || pLow.includes("batubara");
  if (mLow.includes("top soil") || mLow.includes("topsoil")) return pLow.includes("top soil") || pLow.includes("topsoil");
  if (mLow.includes("limonite")) return pLow.includes("limonite");
  if (mLow.includes("saprolite") || mLow.includes("saprolit")) return pLow.includes("saprolite") || pLow.includes("saprolit");
  if (mLow.includes("uncrushed") || mLow.includes("rock") || mLow.includes("crush") || mLow.includes("boulder")) return pLow.includes("uncrushed") || pLow.includes("rock") || pLow.includes("crush") || pLow.includes("boulder");
  if (mLow.includes("fill") || mLow.includes("cut")) return pLow.includes("fill") || pLow.includes("cut");
  if (isOBMaterial(mLow)) return isOBMaterial(pLow);
  return false;
}

const materialFamily = (it: any): string => {
  const m = (it?.material || "").toLowerCase();
  return m.includes("coal") || m.includes("batubara") ? "coal" : isOBMaterial(m) ? "ob" : "";
};

/**
 * Pending volume (Excel "GAB ... DAN PENDING"): baris jarak periode lain yang periodenya tidak punya baris produksi.
 * Volumenya sudah termasuk di baris produksi sejenis periode `row` (sama dengan BE pendingDistanceRows).
 */
export function pendingDistanceRows(row: any, allItems: any[]): any[] {
  const fam = materialFamily(row);
  const period = (row?.period || "").trim();
  if (!fam || !period) return [];
  const normArea = (a?: string) => (a || "").replace(/\s+/g, "").toLowerCase();
  const hasProd = (p: string) => allItems.some((it) => !isDistanceItem(it) && materialFamily(it) === fam && (it.period || "").trim() && matchPeriod(it.period, p));
  return allItems.filter((d) => {
    const dp = (d.period || "").trim();
    if (!isDistanceItem(d) || materialFamily(d) !== fam || !dp || matchPeriod(dp, period) || hasProd(dp)) return false;
    return !normArea(d.area) || !normArea(row.area) || normArea(d.area) === normArea(row.area);
  });
}

/** Hapus baris BA; baris produksi ikut menghapus over/underhaul pasangannya yang tidak punya induk lain. */
export function removeBAItem(items: any[], item: any): any[] {
  const rest = items.filter((it) => it !== item && (item.id == null || it.id !== item.id));
  const isProd = (it: any) => !isDistanceItem(it) && !isLandClearingItem(it);
  if (!isProd(item)) return rest;
  return rest.filter((d) => !(isDistanceItem(d) && isDistanceParent(d, item) && !rest.some((p) => isProd(p) && isDistanceParent(d, p))));
}

export function getBAEffectiveVolume(item: any, allItems: any[], isSurvey: boolean = false): number {
  const own = (it: any) => isSurvey
    ? (Number(it.adjustedVolume || 0) > 0 ? Number(it.adjustedVolume) : Number(it.initialVolume || 0))
    : Number(it.initialVolume || 0);
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
    // Volume produksi sudah memuat pending volume periode lain yang ditagih di baris jaraknya sendiri.
    const pendingVol = pendingDistanceRows(item, allItems).reduce((acc, d) => acc + own(d), 0);

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
        return Math.max(0, obParents.reduce((acc, p) => acc + own(p), 0) - pendingVol);
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
        return Math.max(0, coalParents.reduce((acc, p) => acc + own(p), 0) - pendingVol);
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

    const parent = searchPool.find((p) => isDistanceParent(item, p));
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
// Pending Volume BGG: disimpan di BA induk (pendingVolume = null menghapus); amount dihitung BE.
export const withPendingVolume = (ba: any, pendingVolume: { period: string; items: any[] } | null) => ({ ...ba, pendingVolume });
const isBARejected = (ba: any) => (ba?.statusBA || "").startsWith("Reject");
export const canEditPending = (ba: any) => !ba?.pendingVolume?.billedInvoiceId && !(ba?.pendingVolume?.verifiedBy && (ba.invoiceId || ba.invoiceNoLinked));
// Hanya pending terverifikasi (sudah terakrual) yang dihitung di kartu, export & checklist penagihan.
export const isUnbilledPending = (ba: any) => Boolean(ba?.pendingVolume?.verifiedBy) && !ba.pendingVolume.billedInvoiceId && !isBARejected(ba);

// Uang BA dari BE (calc); undefined = respons kalkulasi belum datang -> "-".
export const calcIDR = (v: number | undefined) => (v === undefined ? "-" : formatIDR(v));
export const calcSum = (calc: BACalc | undefined, pick: (l: BACalcLine) => boolean) =>
  calc ? calc.lines.reduce((a, l) => (pick(l) ? a + l.amount : a), 0) : undefined;
// Baris calc milik item (tanpa baris turunan R&F seksi D).
export const calcItemLines = (calc: BACalc | undefined, items: any[]) => {
  const ids = new Set(items.map((it) => String(it.id)));
  return (calc?.lines || []).filter((l) => ids.has(l.itemId) && l.section !== "D");
};
export const calcItemsAmount = (calc: BACalc | undefined, items: any[]) =>
  calc ? calcItemLines(calc, items).reduce((a, l) => a + l.amount, 0) : undefined;

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
 * Excel invoice: semua baris PTRO, POS baris non-jarak & OB BGG = Vol x Rate tanpa ROUND; baris lain ROUND(...,0)
 * (sama dengan BE excelExactLine).
 */
export function excelLineAmount(value: number, customerCode: string | undefined, isDist: boolean, isCoal: boolean = false): number {
  const kind = customerKind(customerCode);
  const exact = (kind === "PTRO" && !/DBK/i.test(customerCode || "")) || (!isDist && (kind === "POS" || (kind === "BGG" && !isCoal)));
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
    return excelLineAmount(volume * getDistanceFactor(item, customerCode, isCustomerDBK) * r, customerCode || item.customerCode, true);
  }
  // Rental POS: sewa = ROUND(jam x tarif), BBM = ROUND(liter x harga solar).
  if (item.category === "Rental") return Math.round(volume * r);
  const mLow = (item.material || item.sowDescription || "").toLowerCase();
  return excelLineAmount(volume * r, customerCode || item.customerCode, false, mLow.includes("coal") || mLow.includes("batubara"));
}

/** Jarak baris (m). Kosong/0 = basis (input menampilkan basis sebagai placeholder); < 50 dianggap km (mis. 1.325). */
export function getItemDistanceM(item: any, baseDist: number = 1000): number {
  const rawDist = Number(item?.distanceM || item?.distance || item?.distanceWeightAvg || baseDist);
  return rawDist < 50 ? Math.round(rawDist * 1000) : rawDist;
}

/**
 * Faktor jarak over/underhaul (selisih jarak / 100 m atau / 1.000 m), sama dengan BE RecalculateBA.
 * 0 bila basis jarak belum diatur di Master SOW (overdistance tidak ditagih).
 */
export function getDistanceFactor(item: any, customerCode?: string, isCustomerDBK: boolean = false): number {
  const baseDist = getBaseDistance(item, customerCode || item?.customerCode);
  if (baseDist <= 0) return 0;
  const dist = getItemDistanceM(item, baseDist);
  const cust = customerKind(customerCode || item?.customerCode);
  const isPOS = cust === "POS" || (item.material || "").toLowerCase().includes("underhaul");
  const diffMtr = isPOS ? (dist - baseDist) : Math.max(0, dist - baseDist);
  const isPer100m = isCustomerDBK || customerByCode(cust)?.overhaulRateUnit === "PER_100M" || (item.unit || "").includes("100") || (item.material || "").includes("100m") || (item.material || "").toLowerCase().includes("over distance");
  return diffMtr / (isPer100m ? 100 : 1000);
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
    const vol = getBAEffectiveVolume(it, allItems, effectiveIsSurvey);
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
    if (isPOS && !isDed && cat !== "Rental" && effectiveRF !== 1.0) {
      posRF += isDistanceItem(it)
        ? Math.round(vol * getDistanceFactor(it, customerCode, isCustomerDBK) * Number(it.rate || 0) * (effectiveRF - 1.0))
        : subtotal * (effectiveRF - 1.0);
    }
    if (isDed) {
      dpFuelDeduction += Math.abs(subtotal);
    } else if (isDistanceItem(it)) {
      overdistanceGross += subtotal; // Note: for POS underhaul, this can be negative
      if (isCoalMat) overdistanceCoalGross += subtotal;
    } else if (cat === "Rental" || cat === "MDO" || cat === "Support" || cat === "Equipment Rental" || cat === "Penunjang" || cat === "Land Clearing" || mLow.includes("clearing")) {
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
    const bggComputed = getBGGComputedInvoiceLines(allItems, effectiveRF, effectiveIsSurvey, fuelPeriods);
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

// Akun pendapatan baris calc BE (pemetaan sama dengan accurateItemKey / jurnal akrual BE).
const GL_REVENUE: [string, string, string][] = [
  ["4199.000", "Potongan Pendapatan / Denda & BBM", "Pengurang Biaya / Denda / Diskon OD"],
  ["4101.000", "Pendapatan Over Burden (OB)", "Pendapatan OB penambangan"],
  ["4102.000", "Pendapatan Coal Winning", "Pendapatan batubara / coal winning"],
  ["4104.000", "Pendapatan Rental", "Pendapatan rental alat berat penunjang"],
  ["4105.000", "Pendapatan Under/Over Distance OB", "Pendapatan over distance OB"],
  ["4106.000", "Pendapatan Under/Over Distance CG", "Pendapatan over distance batubara"],
  ["4107.000", "Pendapatan Limonite", "Pendapatan jasa penambangan limonite"],
  ["4108.000", "Pendapatan Saprolite", "Pendapatan jasa penambangan saprolite"],
  ["4109.000", "Pendapatan Top Soil", "Pendapatan jasa topsoil"],
  ["4120.000", "Pendapatan Eskalasi / Penyesuaian Harga (Raise & Fall)", "RF kontrak"],
];
function glRevenueAccount(l: BACalcLine, cust: string): string {
  const s = `${l.description} ${l.subSection}`.toLowerCase();
  const coal = s.includes("coal") || s.includes("batubara") || (l.section === "B" && (cust === "BGG" || cust === "PTRO"));
  const dist = /distance|overhaul|underhaul|jarak/.test(s) || (l.section === "C" && (cust === "BGG" || cust === "PTRO")) || (l.section === "B" && cust !== "SBS" && cust !== "BGG" && cust !== "PTRO");
  if (l.section === "E" || l.section === "F" || l.section === "P" || /dp fuel|pengurang solar|potongan solar/.test(s)) return "4199.000";
  if (l.section === "D") return "4120.000";
  if (l.category === "MDO" || l.category === "Rental") return "4104.000";
  if (dist) return coal ? "4106.000" : "4105.000";
  if (s.includes("top soil") || s.includes("topsoil")) return "4109.000";
  if (s.includes("saprolit")) return "4108.000";
  if (s.includes("limonite")) return "4107.000";
  return coal ? "4102.000" : "4101.000";
}

export function generateBAGLJournalPreview(
  calc: BACalc,
  customerCode: string
): { lines: GLJournalLinePreview[]; totalDebit: number; totalCredit: number; isBalanced: boolean } {
  const lines: GLJournalLinePreview[] = [];
  // amount > 0 = debit, amount < 0 = kredit; nilai negatif (mis. underhaul POS) otomatis pindah sisi.
  const post = (accountNo: string, accountName: string, amount: number, note: string) => {
    if (!amount) return;
    lines.push({ accountNo, accountName, debit: amount > 0 ? amount : 0, credit: amount < 0 ? -amount : 0, note });
  };

  const cust = customerKind(customerCode);
  const byAccount: Record<string, number> = {};
  for (const l of calc.lines) {
    const acc = glRevenueAccount(l, cust);
    byAccount[acc] = (byAccount[acc] || 0) + l.amount;
  }
  post("1103.101", `Piutang Usaha (PT ${customerCode || "Customer"})`, calc.total.totalDibayar, "Piutang atas Berita Acara");
  post("1108.002", "PPh 23 Dibayar Dimuka", calc.total.pph23, "Potongan PPh 23 (2%)");
  for (const [no, name, note] of GL_REVENUE) post(no, name, -Math.round(byAccount[no] || 0), no === "4120.000" ? `${note} (${calc.rfIndex.toFixed(3)}x)` : note);
  post("2102.100", "Hutang PPN Keluaran", -calc.total.vat12, "PPN Keluaran atas Berita Acara");

  // Tidak ada "plug" selisih pembulatan: bila tidak balance, preview harus menampilkannya apa adanya.
  const totalDebit = lines.reduce((acc, l) => acc + l.debit, 0);
  const totalCredit = lines.reduce((acc, l) => acc + l.credit, 0);

  return { lines, totalDebit, totalCredit, isBalanced: totalDebit === totalCredit };
}

export interface BGGComputedLineItem {
  id: string;
  section: "D" | "E";
  /** Sub-seksi Excel (mis. "D1. OB Removal"); baris berurutan per grup. */
  group?: string;
  description: string;
  period?: string;
  unit: string;
  volume: number;
  rate: number;
  subtotal: number;
}

const BGG_D_GROUPS = ["D1. OB Removal Pit Kungkilan", "D2. Over Distance For OB Removal", "D3. Coal Winning", "D4. Over Distance For Coal Winning"];

/**
 * Seksi D & E BGG seperti Excel invoice (sama dengan BE RecalculateBA):
 * D1 OB per material lalu periode, D2 OD OB, D3 Coal, D4 OD Coal; tiap baris memakai RF & tarif tier periodenya.
 * Pending volume yang termasuk di baris produksi dipecah ke periode asalnya.
 */
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
  const items = allItems || [];
  const effectiveRF = rfIndexCalculated > 0 ? Number(rfIndexCalculated.toFixed(3)) : 1.0;
  const own = (it: any) => isSurvey
    ? (Number(it.adjustedVolume || 0) > 0 ? Number(it.adjustedVolume) : Number(it.initialVolume || 0))
    : Number(it.initialVolume || 0);
  const rfOf = (period: string) => Number(getBGGRFIndexForPeriod(period, effectiveRF, fuelPeriods).toFixed(3));
  const materialOrder = (m: string) => items.findIndex((it) => it.material === m);
  const splitSOWs = obSplitSOWs("BGG");

  const lines = new Map<string, BGGComputedLineItem & { order: number[] }>();
  const addLine = (group: number, material: string, period: string, unit: string, volume: number, rate: number, key: string) => {
    if (!volume) return;
    const rf = rfOf(period);
    const prev = lines.get(key);
    const vol = (prev?.volume || 0) + volume;
    const escRate = rate * Number((rf - 1).toFixed(3));
    lines.set(key, {
      id: `rf-${key}`, section: "D", group: BGG_D_GROUPS[group], description: group === 0 ? material : "", period: period || undefined,
      unit, volume: vol, rate: escRate, subtotal: Math.round(vol * escRate),
      order: [group, materialOrder(material), parsePeriodToMonthIndex(period)],
    });
  };

  // Section E per jenis & % jadwal diskon Master Customer periode asal (pending volume memakai % periodenya, sama dengan BE).
  const disc = new Map<string, Map<number, { amt: number; periods: string[] }>>();
  const addDisc = (code: string, period: string, amount: number) => {
    const pct = odDiscountPctFor("BGG", period);
    const byPct = disc.get(code) || new Map();
    const g = byPct.get(pct) || { amt: 0, periods: [] };
    g.amt += amount;
    if (period && !g.periods.includes(period)) g.periods.push(period);
    disc.set(code, byPct.set(pct, g));
  };

  for (const it of items) {
    const mLow = (it.material || "").toLowerCase();
    if (it.category === "DP Fuel" || it.isDeduction || mLow.includes("dp fuel")) continue;
    const isCoal = materialFamily(it) === "coal";
    const period = (it.period || "").trim();
    const r = Number(it.rate || 0);
    const effVol = getBAEffectiveVolume(it, items, isSurvey);
    const unit = it.unit || (isCoal ? "Ton" : "Bcm");

    if (isDistanceItem(it)) {
      addDisc(isCoal ? "E.2" : "E.1", period, getBAItemSubtotal(it, effVol, false, "BGG"));
      addLine(isCoal ? 3 : 1, it.material, period, unit, effVol, r * getDistanceFactor(it, "BGG"), `od-${it.id || it.material}-${period}`);
      continue;
    }
    // Pending volume di baris produksi: porsi split OB (75/25) volume baris jarak periode asal, tarif tier periode asal.
    const sow = splitSOWs.find((s: any) => (s.itemName || s.name || "").trim().toLowerCase() === mLow.trim());
    const share = sow ? Number(sow.splitPercentage) / 100 : 1;
    let pendingVol = 0;
    for (const d of pendingDistanceRows(it, items)) {
      const pv = own(d) * share;
      pendingVol += pv;
      addLine(isCoal ? 2 : 0, it.material, d.period.trim(), unit, pv, bggTierRate(it.material, d.period) || r, `${it.material}-${d.period.trim()}`);
    }
    addLine(isCoal ? 2 : 0, it.material, period, unit, effVol - pendingVol, r, `${it.material}-${period}`);
  }

  const sectionDItems = [...lines.values()]
    .sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.order[2] - b.order[2])
    .map(({ order, ...line }) => line);

  for (const l of sectionDItems) {
    if (l.group === BGG_D_GROUPS[1]) addDisc("E.3", l.period || "", l.subtotal);
    if (l.group === BGG_D_GROUPS[3]) addDisc("E.4", l.period || "", l.subtotal);
  }
  const hasOD = (coal: boolean) => items.some((it) => isDistanceItem(it) && (materialFamily(it) === "coal") === coal);
  const sectionEItems: BGGComputedLineItem[] = ([
    ["E.1", "Overdistance for OB Removal", hasOD(false)],
    ["E.2", "Overdistance for Coal Winning", hasOD(true)],
    ["E.3", "Raise & Fall's Overdistance for OB Removal", hasOD(false)],
    ["E.4", "Raise & Fall's Overdistance for Coal Winning", hasOD(true)],
  ] as [string, string, boolean][])
    .filter(([, , show]) => show)
    .flatMap(([code, description]) => {
      const groups = [...(disc.get(code) || new Map([[0, { amt: 0, periods: [] }]])).entries()];
      return groups.map(([pct, g]) => {
        const d = (g.amt * pct) / 100;
        const label = groups.length > 1 ? ` (Disc ${pct}%: ${g.periods.join(", ")})` : "";
        return { id: `disc-${code}-${pct}`, section: "E" as const, description: `${code} ${description}${label}`, unit: "Lot", volume: 1, rate: -d, subtotal: -d };
      });
    });

  return {
    sectionDItems,
    sectionEItems,
    subtotalD: sectionDItems.reduce((acc, it) => acc + it.subtotal, 0),
    subtotalE: sectionEItems.reduce((acc, it) => acc + it.subtotal, 0),
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
