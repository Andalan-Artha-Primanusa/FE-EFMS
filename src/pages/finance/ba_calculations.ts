// =============================================================
// BA CALCULATIONS & VOLUME ENGINE
// Business Logic / Service Layer helper: 100 – 300 lines.
// Authoritative calculation helpers for Berita Acara (BA) Tracker
// =============================================================

import { matchPeriod, formatIDR } from "./helpers";
import type { BACalc, BACalcLine } from "../../types";

import { customerKind, customerByCode, baseDistanceFor, rfMasterFor, rfTemplateFor, computeRFIndex, forexRatio, minWageFor, kursForPeriod, masterRegistry, obSplitSOWs } from "./masterRegistry";

export { customerKind };

/** BA Rental POS (Daywork): posData.rental terisi (sama dengan BE isRentalBA). */
export const isRentalBA = (ba: any): boolean => Boolean(ba?.posData?.rental);

/** BA MDO POS: posData.mdo terisi; BA Operation POS = BA POS tanpa penanda. */
export const isPOSMDOBA = (ba: any): boolean => Boolean(ba?.posData?.mdo);

/** BA Mess Facility POS: posData.mess terisi; 1 paket nominal final, tanpa SOW & RF. */
export const isMessBA = (ba: any): boolean => Boolean(ba?.posData?.mess);

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
