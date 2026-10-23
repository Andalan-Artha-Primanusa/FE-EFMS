// =============================================================
// MASTER DATA REGISTRY (cermin resolver master di backend)
// Diisi dari API Master Data BE oleh useFinanceMasterData; helper hitung BA / Invoice membaca
// parameter kontrak, tarif, RF per periode, kurs per periode & UMK dari sini, bukan konstanta.
// =============================================================

import { matchPeriod, parsePeriodToMonthIndex } from "./helpers";

export const masterRegistry = {
  customers: [] as any[],
  sows: [] as any[],
  raiseFall: [] as any[],
  exchangeRates: [] as any[],
  minWages: [] as any[],
  bankAccounts: [] as any[],
  coalIndex: [] as any[],
};

export function setMasterData(part: Partial<typeof masterRegistry>) {
  Object.assign(masterRegistry, part);
}

/** Normalisasi kode / nama customer ke kode kontrak (sama dengan customerKey di BE). */
export function customerKind(code?: string): string {
  const c = (code || "").toUpperCase().replace(/^PT\.?\s+/, "").trim();
  if (c.includes("BGG") || c.includes("BUDI GEMA")) return "BGG";
  if (c === "POS" || c.startsWith("POSITION")) return "POS";
  if (c === "PTRO" || c === "DBK" || c.includes("PETROSEA")) return "PTRO";
  return c;
}

const sameCustomer = (a?: string, b?: string) => customerKind(a) === customerKind(b);

export function customerByCode(code?: string): any | undefined {
  return masterRegistry.customers.find((c) => sameCustomer(c.code, code));
}

/** Label "Skema Raise & Fall" Master Customer (form & kartu Client Setup). */
export const RF_SCHEME_LABELS: Record<string, string> = {
  SINGLE_FACTOR_FUEL: "Raise & Fall 1-Faktor BBM",
  TRIPLE_FACTOR_DLF: "Raise & Fall 3-Faktor (D+L+F)",
  KURS_TRANSAKSI_USD: "Kurs Transaksi USD",
};

/** Toleransi joint survey hanya dihitung pada BA joint survey BGG (sama dengan BE). */
export const hasJointSurveyQuota = (code?: string) => customerKind(code) === "BGG";

/** Parameter kontrak dari Master Customer (0 = klausul tidak berlaku). */
export function contractParams(code?: string) {
  const c = customerByCode(code) || {};
  const bgg = hasJointSurveyQuota(code);
  return {
    surveyTolerancePct: bgg ? Number(c.surveyTolerancePct || 0) : 0,
  };
}

export const BGG_DEFAULT_OD_DISCOUNT_PCT = 20;

/** Diskon OD BGG (%) untuk volume periode asal `period`: bulan di jadwal Master Customer, selain itu default (sama dengan BE odDiscountPctFor). */
export function odDiscountPctFor(code?: string, period?: string): number {
  const k = period ? parsePeriodToMonthIndex(period) : 0;
  const step = (customerByCode(code)?.overDistanceDiscountSchedule || []).find((s: any) => s.fromPeriod && parsePeriodToMonthIndex(s.fromPeriod) === k);
  return step ? Number(step.pct || 0) : BGG_DEFAULT_OD_DISCOUNT_PCT;
}

export function bankAccountForCustomer(code?: string): any | undefined {
  const id = customerByCode(code)?.bankAccountId;
  return id ? masterRegistry.bankAccounts.find((b) => b.id === id) : undefined;
}

/** Master Raise & Fall customer untuk periode tersebut (tanpa fallback ke periode lain). */
export function rfMasterFor(code?: string, period?: string): any | undefined {
  if (!period) return undefined;
  return masterRegistry.raiseFall.find(
    (r) => sameCustomer(r.customerCode, code) && r.status !== "Archived" && matchPeriod(r.period, period)
  );
}

/** Master RF terbaru customer: sumber bobot, basis & skema rumus untuk periode yang belum punya record. */
export function rfTemplateFor(code?: string): any | undefined {
  return masterRegistry.raiseFall
    .filter((r) => sameCustomer(r.customerCode, code) && r.status !== "Archived")
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0];
}

/** Xn / Xo; 1 bila salah satu belum ada. */
export const forexRatio = (xn: number, xo: number): number => (xn > 0 && xo > 0 ? xn / xo : 1);

/** Indeks RF dari bobot & basis master RF (sama dengan computeRFIndex di BE). 0 = data belum cukup. */
export function computeRFIndex(m: any, fn: number, ln = 0, xn = 0): number {
  if (!m) return 0;
  const scheme = m.formulaScheme || customerByCode(m.customerCode)?.formulaScheme || "";
  let idx = 0;
  if (scheme === "KURS_TRANSAKSI_USD") return 1;
  if (scheme === "SINGLE_FACTOR_FUEL") {
    if (!(m.baseFuelFo > 0) || !(fn > 0)) return 0;
    idx = Number(m.weightFixedC || 0) + Number(m.weightFuelA || 0) * fn / m.baseFuelFo;
  } else {
    if (!(fn > 0) && !(ln > 0)) return 0;
    let d = 0;
    let l = 0;
    if (m.baseFuelFo > 0 && fn > 0) {
      if (xn > 0 && fn < 100) {
        const baseFo = m.baseFuelFo < 100 && m.baseForexXo > 0 ? m.baseFuelFo * m.baseForexXo : m.baseFuelFo;
        d = (m.weightFuelA * fn * xn) / baseFo;
      } else {
        d = (m.weightFuelA * fn) / m.baseFuelFo;
      }
    }
    // Labor sesuai kontrak POS: L = b * (Ln * Xn) / (Lo * Xo).
    if (m.baseLaborLo > 0 && ln > 0) l = (m.weightLaborB * ln * forexRatio(xn, m.baseForexXo)) / m.baseLaborLo;
    idx = d + l + Number(m.weightFixedC || 0);
    // 3-faktor dipakai presisi penuh (sama dengan Excel), tampilan saja yang 3 desimal.
    if (!m.allowFall && idx > 0 && idx < 1) idx = 1;
    return idx;
  }
  if (!m.allowFall && idx > 0 && idx < 1) idx = 1;
  return Math.round(idx * 1000) / 1000;
}

/** Rata-rata kurs tengah BI periode tersebut (M-Rate). 0 bila belum ada data. */
export function kursForPeriod(period?: string, rows: any[] = masterRegistry.exchangeRates): number {
  if (!period) return 0;
  const vals = rows
    .filter((r) => matchPeriod(r.period, period))
    .map((r) => Number(r.kursTengah || 0) || (Number(r.kursJual || 0) + Number(r.kursBeli || 0)) / 2)
    .filter((v) => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

const periodYear = (period?: string): number => {
  const m = String(period || "").match(/(20\d{2})|\b(\d{2})\b/);
  if (!m) return 0;
  return m[1] ? Number(m[1]) : 2000 + Number(m[2]);
};

/** UMK site customer untuk tahun periode (atau tahun terakhir sebelumnya). 0 bila belum ada. */
export function minWageFor(code?: string, period?: string): number {
  const cust = customerByCode(code);
  if (!cust) return 0;
  const year = periodYear(period);
  const rows = masterRegistry.minWages
    .filter((w) => (w.site === cust.projectSite || sameCustomer(w.site, cust.code)) && Number(w.amountIdr) > 0 && (!year || Number(w.year) <= year))
    .sort((a, b) => Number(b.year) - Number(a.year));
  return Number(rows[0]?.amountIdr || 0);
}

const normName = (s?: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Basis jarak kontrak (m) dari Master Variable SOW item jarak customer. 0 bila belum diatur. */
export function baseDistanceFor(code?: string, material?: string): number {
  const name = normName(material);
  const sows = masterRegistry.sows.filter((s) => sameCustomer(s.customerCode || s.customer, code) && Number(s.baseDistanceMeters) > 0 && !(Number(s.maxDistanceMeters) > 0));
  const exact = sows.find((s) => normName(s.itemName || s.name) === name)
    || sows.find((s) => { const n = normName(s.itemName || s.name); return n.length > 3 && name.length > 3 && (n.includes(name) || name.includes(n)); });
  if (exact) return Number(exact.baseDistanceMeters);
  const isCoal = /coal|batubara/i.test(material || "");
  const sameKind = sows.find((s) => /coal/i.test(s.itemName || s.name || "") === isCoal);
  return Number(sameKind?.baseDistanceMeters || 0);
}

export const SBS_DISTANCE_TIER_CATEGORY = "Tarif Jarak Angkut";

/** Rentang tarif jarak angkut SBS dari Master Variable SOW. */
export function sbsDistanceTiers() {
  return masterRegistry.sows
    .filter((s) => customerKind(s.customerCode || s.customer) === "SBS" && Number(s.maxDistanceMeters) > 0 && s.status !== "Inactive")
    .map((s) => ({ min: Number(s.baseDistanceMeters || 0), max: Number(s.maxDistanceMeters), rangeLabel: `${s.baseDistanceMeters || 0}-${s.maxDistanceMeters}`, rate: Number(s.rateIDR || 0) }))
    .sort((a, b) => a.min - b.min);
}

/** Nama ternormalisasi item over/underhaul / over distance. */
export const isDistSowName = (n: string): boolean => /overhaul|underhaul|distance/.test(n);

/** Nama saling memuat, tapi item jarak tidak jatuh ke tarif produksi induknya (dan sebaliknya). */
export const sowNamePartialMatch = (a: string, b: string): boolean =>
  a.length > 3 && b.length > 3 && isDistSowName(a) === isDistSowName(b) && (a.includes(b) || b.includes(a));

/** Item Master Variable SOW customer: nama persis, lalu nama yang saling memuat. */
export function sowFor(code?: string, itemName?: string): any | undefined {
  const name = normName(itemName);
  if (!name) return undefined;
  const rows = masterRegistry.sows.filter((s) => sameCustomer(s.customerCode || s.customer, code) && s.status !== "Inactive");
  return rows.find((s) => normName(s.itemName || s.name) === name)
    || rows.find((s) => sowNamePartialMatch(normName(s.itemName || s.name), name));
}

/**
 * Baris default BA dari Master Variable SOW customer (volume 0), dipisah Operating vs MDO / Penunjang.
 * Tarif IDR = rateIDR master, atau USD x kurs periode (0 bila kurs periode belum ada).
 */
export function baItemsFromSOW(code?: string, period?: string): { operating: any[]; mdo: any[] } {
  const kurs = kursForPeriod(period);
  const rows = masterRegistry.sows
    .filter((s) => sameCustomer(s.customerCode || s.customer, code) && !(Number(s.maxDistanceMeters) > 0) && !/pengurang|denda/i.test(`${s.category} ${s.itemName}`))
    .map((s, i) => {
      const usd = Number(s.rateUSD || 0);
      const base = Number(s.baseDistanceMeters || 0);
      const isMDO = /mdo|development|penunjang|rental/i.test(s.category || "") || /^(hours|jam)$/i.test(s.unit || "");
      return {
        id: `ba_sow_${s.id ?? i}_${Date.now()}`,
        category: isMDO ? "MDO" : s.isDistanceVar ? "Over Distance" : (s.category || "Operating & Mining"),
        area: "", material: s.itemName || s.name, period: period || "", notes: "", keterangan: "",
        unit: s.unit || "BCM",
        rateUSD: usd,
        isUSD: usd > 0,
        rate: Number(s.rateIDR || 0) || (usd > 0 && kurs > 0 ? usd * kurs : 0),
        ...(s.isDistanceVar ? { isDistanceVar: true, ...(base > 0 ? { distanceBasis: base, distanceWeightAvg: base } : {}) } : {}),
        initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0,
      };
    });
  return { operating: rows.filter((r) => r.category !== "MDO"), mdo: rows.filter((r) => r.category === "MDO") };
}

/** Dua item OB ber-split (mis. 75% / 25%) customer dari Master Variable SOW, porsi terbesar dulu. */
export function obSplitSOWs(code?: string): any[] {
  return masterRegistry.sows
    .filter((s) => sameCustomer(s.customerCode || s.customer, code) && Number(s.splitPercentage) > 0 && Number(s.splitPercentage) < 100 && !/distance|coal/i.test(s.itemName || s.name || ""))
    .sort((a, b) => Number(b.splitPercentage) - Number(a.splitPercentage))
    .slice(0, 2);
}

/** Tier Coal Index dari rata-rata R3 (PRD; sama dengan backend): Tier 1 ≤ $50, Tier 2 ≤ $75, Tier 3 > $75. */
export function coalTierForR3(avgR3: number): string {
  if (!(avgR3 > 0)) return "";
  return avgR3 <= 50 ? "Tier 1" : avgR3 <= 75 ? "Tier 2" : "Tier 3";
}

export const isCoalIndexFinal = (status?: string) => status === "Final" || status === "Locked" || status === "Verified";

/** Tarif IDR item SOW untuk tier Coal Index (tier1/2/3), fallback tarif dasar. */
/** Tier aktif Master Coal Index periode (kosong bila belum ada; sama dengan BE coalTierFor). */
export function coalTierFor(period?: string): string {
  return masterRegistry.coalIndex.find((c) => matchPeriod(c.period, period || ""))?.activeTier || "";
}

export function sowTierRate(s: any, tier?: string): number {
  if (!s) return 0;
  const byTier = tier === "Tier 1" ? s.tier1Rate : tier === "Tier 2" ? s.tier2Rate : tier === "Tier 3" ? s.tier3Rate : 0;
  return Number(byTier || s.rateIDR || 0);
}

/** Tarif BGG baris BA: tarif tier Coal Index periode baris dari Master SOW; 0 bila material tidak ada di master (sama dengan BE). */
export function bggTierRate(material?: string, period?: string): number {
  return sowTierRate(sowFor("BGG", material), coalTierFor(period));
}

/** Tarif kontrak PTRO dari Master Variable SOW (OB & coal USD, overhaul OB USD, overhaul coal IDR). */
export function ptroContractRates(code: string = "PTRO") {
  return {
    obRateUSD: Number(sowFor(code, "OVER BURDEN")?.rateUSD || 0),
    cgRateUSD: Number(sowFor(code, "COAL GETTING")?.rateUSD || 0),
    odObRateUSD: Number(sowFor(code, "OVERHAUL OB")?.rateUSD || 0),
    odCgRateIDR: Number(sowFor(code, "OVERHAUL COAL GETTING")?.rateIDR || 0),
  };
}
