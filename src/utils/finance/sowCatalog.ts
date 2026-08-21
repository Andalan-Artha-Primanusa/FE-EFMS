// SOW Master Catalog — Static rate reference data for all customers
// Source: extracted from FinancePage.tsx L137–L152

export const SOW_MASTER_CATALOG = [
  // Kategori 1: Operating & Mining
  { name: "Top Soil", category: "Operating & Mining", unit: "BCM", defaultRate: 60500, usdRate: 3.38, defaultDistance: 1000, overhaulRate: 9643 },
  { name: "Overburden/ Waste", category: "Operating & Mining", unit: "BCM", defaultRate: 59500, usdRate: 3.327, defaultDistance: 1000, overhaulRate: 9643 },
  { name: "Limonite", category: "Operating & Mining", unit: "WMT", defaultRate: 60200, usdRate: 3.363, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Saprolite", category: "Operating & Mining", unit: "WMT", defaultRate: 62200, usdRate: 3.472, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Uncrushed Rock", category: "Operating & Mining", unit: "BCM", defaultRate: 142275, usdRate: 7.938, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Cut", category: "Operating & Mining", unit: "BCM", defaultRate: 38150, usdRate: 2.129, defaultDistance: 1000, overhaulRate: 9340 },
  { name: "Crushed Rock", category: "Operating & Mining", unit: "BCM", defaultRate: 233900, usdRate: 13.05, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Land Clearing", category: "Operating & Mining", unit: "m2", defaultRate: 6830, usdRate: 0.381, defaultDistance: 0, overhaulRate: 0 },
  // Kategori 2: Mine Development Operation (MDO)
  { name: "Mine Development (MDO) - Clearing & Access Road", category: "MDO", unit: "Ha", defaultRate: 15500000, usdRate: 0, defaultDistance: 0, overhaulRate: 0 },
  { name: "Rocks for construction - under/overhaul", category: "MDO", unit: "USD/1KM", defaultRate: 9450, usdRate: 0.526, defaultDistance: 1000, overhaulRate: 9450 },
  { name: "Uncrushed rocks for construction (MDO)", category: "MDO", unit: "BCM", defaultRate: 142275, usdRate: 7.938, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Road Construction & Drainage", category: "MDO", unit: "Mtr", defaultRate: 450000, usdRate: 0, defaultDistance: 0, overhaulRate: 0 },
];

// Master Bank Accounts — PT Andalan Artha Primanusa
export const masterBankAccounts = [
  { id: "BNI", bankName: "Bank BNI", bankAccountName: "PT Andalan Artha Primanusa", bankAccountNo: "8188788882", bankBranch: "Harmoni, Jakarta" },
  { id: "MANDIRI", bankName: "Bank Mandiri", bankAccountName: "PT Andalan Artha Primanusa", bankAccountNo: "122-00-0987654-3", bankBranch: "Sudirman, Jakarta" },
  { id: "BRI", bankName: "Bank BRI Escrow", bankAccountName: "PT Andalan Artha Primanusa", bankAccountNo: "0341-01-000123-30-5", bankBranch: "Kemang, Jakarta" },
  { id: "BCA", bankName: "Bank BCA", bankAccountName: "PT Andalan Artha Primanusa", bankAccountNo: "001-388-9900", bankBranch: "Kuningan, Jakarta" },
];

// Customer contract master mapping
export const customerContractMap: Record<string, {
  project: string;
  contract: string;
  noPO?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankBranch?: string;
  directorName?: string;
  directorTitle?: string;
}> = {
  POS: {
    project: "POS PROJECT",
    contract: "002/POS-AAP/2025",
    bankName: "Bank BNI",
    bankAccountNo: "8188788882",
    bankBranch: "Harmoni, Jakarta",
    directorName: "GAHARI CHRISTINE",
    directorTitle: "DIRECTOR"
  },
  BGG: {
    project: "BGG MINING PROJECT",
    contract: "001/BGG-AAP/2025",
    bankName: "Bank Mandiri",
    bankAccountNo: "070-00-2888000-8",
    bankBranch: "Plaza Mandiri Jakarta",
    directorName: "GAHARI CHRISTINE",
    directorTitle: "DIRECTOR"
  },
  DBK: {
    project: "DBK MINING PROJECT",
    contract: "011/AAP-PTRO/IV/2026",
    bankName: "Bank BRI",
    bankAccountNo: "0417-01-880088-30-8",
    bankBranch: "S. Parman - Slipi Jakarta",
    directorName: "CHRISTIANTO CITRA",
    directorTitle: "DIRECTOR"
  },
  SBS: {
    project: "SBS - Tanjung Enim",
    contract: "SPPH-05852",
    noPO: "I05790/0002",
    bankName: "Bank BRI",
    bankAccountNo: "0417-01-880088-30-8",
    bankBranch: "S. Parman - Slipi Jakarta",
    directorName: "GAHARI CHRISTINE",
    directorTitle: "DIREKTUR UTAMA"
  },
  ABN: {
    project: "PT Andalan Bhumi Nusantara Site",
    contract: "005/ABN-AAP/2025",
    bankName: "Bank BRI",
    bankAccountNo: "0417-01-880088-30-8",
    bankBranch: "S. Parman - Slipi Jakarta",
    directorName: "GAHARI CHRISTINE",
    directorTitle: "DIRECTOR"
  }
};

// Default variable SOW options (fallback if API is empty)
export const defaultMasterVariableOptions = [
  { code: "OB", name: "OVER BURDEN REMOVAL", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.327 },
  { code: "TOPSOIL", name: "TOP SOIL REMOVAL", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.380 },
  { code: "LIMONITE", name: "LIMONITE ORE", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.363 },
  { code: "SAPROLITE", name: "SAPROLITE ORE", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.472 },
  { code: "OVERHAUL_OB", name: "Over/Underhaul For OB Removal", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 450, baseRateUSD: 0.538 },
  { code: "OVERHAUL_TOP", name: "Over/Underhaul For Top Soil Removal", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 1200, baseRateUSD: 0.538 },
  { code: "OVERHAUL_LIM", name: "Over/Underhaul For Limonite", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 1000, baseRateUSD: 0.526 },
  { code: "OVERHAUL_SAP", name: "Over/Underhaul For Saprolite", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 500, baseRateUSD: 0.526 },
  { code: "LAND_CLEARING", name: "Land Clearing", category: "Rehabilitation", unit: "m2", baseRateUSD: 0.381 },
  { code: "RECLAIM", name: "Reclaim & Revegetation", category: "Rehabilitation", unit: "m2", baseRateUSD: 0.450 },
  { code: "MDO", name: "Mine Development (MDO Cut & Fill)", category: "Mine Development (MDO)", unit: "Bcm", baseRateUSD: 4.100 },
  { code: "GEOTEXTILE", name: "Geotextile Installation", category: "Mine Development (MDO)", unit: "m2", baseRateUSD: 1.250 },
];

// RF Index calculation constants (base values)
export const RF_CONSTANTS = {
  baseFuelPrice: 10699.97,
  baseLaborPrice: 3594536,
  baseForexRate: 15388.75,
  weightA: 0.34,
  weightB: 0.25,
  weightC: 0.41,
  obBaseRateUSD: 3.327,
};

export function calculateRFIndex(mRate: number, fuelPriceUSD: number, laborPriceIDR: number): number {
  const { baseFuelPrice, baseLaborPrice, baseForexRate, weightA, weightB, weightC, obBaseRateUSD } = RF_CONSTANTS;
  const fuelTerm = (obBaseRateUSD * weightA * (fuelPriceUSD * mRate)) / baseFuelPrice;
  const laborTerm = (obBaseRateUSD * weightB * (laborPriceIDR * mRate)) / (baseLaborPrice * baseForexRate);
  const fixedTerm = obBaseRateUSD * weightC;
  return (fuelTerm + laborTerm + fixedTerm) / obBaseRateUSD;
}
