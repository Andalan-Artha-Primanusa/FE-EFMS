// =============================================================
// MASTER DATA REGISTRY (cermin resolver master di backend)
// Diisi dari API Master Data BE oleh useFinanceMasterData; helper hitung BA / Invoice membaca
// parameter kontrak, tarif, RF per periode, kurs per periode & UMK dari sini, bukan konstanta.
// =============================================================

import { matchPeriod } from "./helpers";

export const masterRegistry = {
  customers: [] as any[],
  sows: [] as any[],
  raiseFall: [] as any[],
  exchangeRates: [] as any[],
  minWages: [] as any[],
  bankAccounts: [] as any[],
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

/** Parameter kontrak dari Master Customer (0 = klausul tidak berlaku). */
export function contractParams(code?: string) {
  const c = customerByCode(code) || {};
  return {
    odDiscountPct: Number(c.overDistanceDiscountPct || 0),
    maxStrippingRatio: Number(c.maxStrippingRatio || 0),
    surveyTolerancePct: Number(c.surveyTolerancePct || 0),
  };
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
    if (m.baseLaborLo > 0 && ln > 0) {
      l = m.baseForexXo > 0 && xn > 0
        ? (m.weightLaborB * ln * xn) / (m.baseLaborLo * m.baseForexXo)
        : (m.weightLaborB * ln) / m.baseLaborLo;
    }
    idx = d + l + Number(m.weightFixedC || 0);
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

/** Item Master Variable SOW customer: nama persis, lalu nama yang saling memuat. */
export function sowFor(code?: string, itemName?: string): any | undefined {
  const name = normName(itemName);
  if (!name) return undefined;
  const rows = masterRegistry.sows.filter((s) => sameCustomer(s.customerCode || s.customer, code) && s.status !== "Inactive");
  return rows.find((s) => normName(s.itemName || s.name) === name)
    || rows.find((s) => { const n = normName(s.itemName || s.name); return n.length > 3 && name.length > 3 && (n.includes(name) || name.includes(n)); });
}

/** Dua item OB ber-split (mis. 75% / 25%) customer dari Master Variable SOW, porsi terbesar dulu. */
export function obSplitSOWs(code?: string): any[] {
  return masterRegistry.sows
    .filter((s) => sameCustomer(s.customerCode || s.customer, code) && Number(s.splitPercentage) > 0 && Number(s.splitPercentage) < 100 && !/distance|coal/i.test(s.itemName || s.name || ""))
    .sort((a, b) => Number(b.splitPercentage) - Number(a.splitPercentage))
    .slice(0, 2);
}

/** Tarif IDR item SOW untuk tier Coal Index (tier1/2/3), fallback tarif dasar. */
export function sowTierRate(s: any, tier?: string): number {
  if (!s) return 0;
  const byTier = tier === "Tier 1" ? s.tier1Rate : tier === "Tier 2" ? s.tier2Rate : tier === "Tier 3" ? s.tier3Rate : 0;
  return Number(byTier || s.rateIDR || 0);
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
