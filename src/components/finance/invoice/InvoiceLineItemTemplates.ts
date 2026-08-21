// Invoice Line Item Templates — Static default items per customer
// Source: extracted from FinancePage.tsx L882–L1069
//
// NOTE: blankPOSItems / blankBGGItems use getSowMasterRate() which requires dynamic data from
// the master data API. To preserve that behavior, these are exported as factory functions
// that accept the rate-lookup callback. For static/demo use, demoXXXItems are plain arrays.

import { getSowMasterRate } from "../ba/BAInvoiceHelpers";

// ─── POS Mining (4-section: A, B, C, D) ────────────────────────────────────

/** Blank POS template — volumes all 0, rates from SOW master or fallback */
export function makeBlankPOSItems(dynamicSowOptions: any[] = [], mRate: number = 17923.30) {
  const r = (name: string, fb: number, usd = true) => getSowMasterRate("POS", name, fb, usd, dynamicSowOptions, mRate);
  return [
    { id: "A1", section: "A", code: "A1", description: "OVER BURDEN REMOVAL", volume: 0, unit: "Bcm", baseRateUSD: r("Overburden/Waste", 3.327) },
    { id: "A2", section: "A", code: "A2", description: "TOP SOIL REMOVAL", volume: 0, unit: "Bcm", baseRateUSD: r("Topsoil Removal - Base Rate", 3.380) },
    { id: "A3", section: "A", code: "A3", description: "LIMONITE", volume: 0, unit: "Bcm", baseRateUSD: r("Limonite - Base Rate", 3.363) },
    { id: "A4", section: "A", code: "A4", description: "SAPROLITE", volume: 0, unit: "Bcm", baseRateUSD: r("Saprolite - Base Rate", 3.472) },

    { id: "B1", section: "B", code: "B1", description: "B1. Over/Underhaul For OB Removal", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: r("OB/Waste - over/underhaul", 0.538) },
    { id: "B2", section: "B", code: "B2", description: "B2. Over/Underhaul For Top Soil Removal", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: r("Topsoil Removal - over/underhaul", 0.538) },
    { id: "B3", section: "B", code: "B3", description: "B3. Over/Underhaul For Limonite", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: r("Limonite - over/underhaul", 0.526) },
    { id: "B4", section: "B", code: "B4", description: "B4. Over/Underhaul For Saprolite", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: r("Saprolite - over/underhaul", 0.526) },

    { id: "C1", section: "C", code: "C1", description: "C1. Land Clearing", volume: 0, unit: "m2", baseRateUSD: r("Clear & Grub", 0.381) },

    { id: "D1", section: "D", code: "D1", description: "D1. OB Removal (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: r("Overburden/Waste", 3.327), type: "production" },
    { id: "D2", section: "D", code: "D2", description: "D2. Over/Underhaul For OB Removal (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: r("OB/Waste - over/underhaul", 0.538), type: "overhaul" },
    { id: "D3", section: "D", code: "D3", description: "D3. Top Soil Removal (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: r("Topsoil Removal - Base Rate", 3.380), type: "production" },
    { id: "D4", section: "D", code: "D4", description: "D4. Over/Underhaul For Top Soil Removal (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: r("Topsoil Removal - over/underhaul", 0.538), type: "overhaul" },
    { id: "D5", section: "D", code: "D5", description: "D5. Limonite (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: r("Limonite - Base Rate", 3.363), type: "production" },
    { id: "D6", section: "D", code: "D6", description: "D6. Over/Underhaul For Limonite (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: r("Limonite - over/underhaul", 0.526), type: "overhaul" },
    { id: "D7", section: "D", code: "D7", description: "D7. Land Clearing (RF Factor)", volume: 0, unit: "m2", baseRateUSD: r("Clear & Grub", 0.381), type: "land_clearing" },
    { id: "D8", section: "D", code: "D8", description: "D8. Saprolite (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: r("Saprolite - Base Rate", 3.472), type: "production" },
    { id: "D9", section: "D", code: "D9", description: "D9. Over/Underhaul For Saprolite (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: r("Saprolite - over/underhaul", 0.526), type: "overhaul" },
  ];
}

/** Demo POS items with realistic sample volumes (for preview/print tests) */
export const demoPOSItems = [
  { id: "A1", section: "A", code: "A1", description: "OVER BURDEN REMOVAL", volume: 35918.75, unit: "Bcm", baseRateUSD: 3.327 },
  { id: "A2", section: "A", code: "A2", description: "TOP SOIL REMOVAL", volume: 6527.38, unit: "Bcm", baseRateUSD: 3.380 },
  { id: "A3", section: "A", code: "A3", description: "LIMONITE", volume: 9307.14, unit: "Bcm", baseRateUSD: 3.363 },
  { id: "A4", section: "A", code: "A4", description: "SAPROLITE", volume: 1102.09, unit: "Bcm", baseRateUSD: 3.472 },

  { id: "B1", section: "B", code: "B1", description: "B1. Over/Underhaul For OB Removal", overhaulMtr: 450, volume: 35918.75, unit: "Bcm", baseRateUSD: 0.538 },
  { id: "B2", section: "B", code: "B2", description: "B2. Over/Underhaul For Top Soil Removal", overhaulMtr: 1200, volume: 6527.38, unit: "Bcm", baseRateUSD: 0.538 },
  { id: "B3", section: "B", code: "B3", description: "B3. Over/Underhaul For Limonite", overhaulMtr: 1000, volume: 9307.14, unit: "Bcm", baseRateUSD: 0.526 },
  { id: "B4", section: "B", code: "B4", description: "B4. Over/Underhaul For Saprolite", overhaulMtr: 500, volume: 1102.09, unit: "Bcm", baseRateUSD: 0.526 },

  { id: "C1", section: "C", code: "C1", description: "C1. Land Clearing", volume: 20769.27, unit: "m2", baseRateUSD: 0.381 },

  { id: "D1", section: "D", code: "D1", description: "D1. OB Removal (RF Factor)", volume: 35918.75, unit: "Bcm", baseRateUSD: 3.327, type: "production" },
  { id: "D2", section: "D", code: "D2", description: "D2. Over/Underhaul For OB Removal (RF)", overhaulMtr: 450, volume: 35918.75, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
  { id: "D3", section: "D", code: "D3", description: "D3. Top Soil Removal (RF Factor)", volume: 6527.38, unit: "Bcm", baseRateUSD: 3.380, type: "production" },
  { id: "D4", section: "D", code: "D4", description: "D4. Over/Underhaul For Top Soil Removal (RF)", overhaulMtr: 1200, volume: 6527.38, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
  { id: "D5", section: "D", code: "D5", description: "D5. Limonite (RF Factor)", volume: 9307.14, unit: "Bcm", baseRateUSD: 3.363, type: "production" },
  { id: "D6", section: "D", code: "D6", description: "D6. Over/Underhaul For Limonite (RF)", overhaulMtr: 1000, volume: 9307.14, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
  { id: "D7", section: "D", code: "D7", description: "D7. Land Clearing (RF Factor)", volume: 20769.27, unit: "m2", baseRateUSD: 0.381, type: "land_clearing" },
  { id: "D8", section: "D", code: "D8", description: "D8. Saprolite (RF Factor)", volume: 1102.09, unit: "Bcm", baseRateUSD: 3.472, type: "production" },
  { id: "D9", section: "D", code: "D9", description: "D9. Over/Underhaul For Saprolite (RF)", overhaulMtr: 500, volume: 1102.09, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
];

// ─── BGG Mining (6-section: A, B, C, D, E deductions, F deductions) ────────

export function makeBlankBGGItems(dynamicSowOptions: any[] = [], mRate: number = 17923.30) {
  const r = (name: string, fb: number) => getSowMasterRate("BGG", name, fb, false, dynamicSowOptions, mRate);
  return [
    { id: "BGG_A1", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: r("OVER BURDEN REMOVAL 1 (75%) (Feb-26)", 27250) },
    { id: "BGG_A2", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: r("OVER BURDEN REMOVAL 1 (75%) (Jun-26)", 29500) },
    { id: "BGG_A3", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: r("OVER BURDEN REMOVAL 2 (25%) (Feb-26)", 26500) },
    { id: "BGG_A4", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: r("OVER BURDEN REMOVAL 2 (25%) (Jun-26)", 28750) },

    { id: "BGG_B1", section: "B", subSection: "B1. Pit Kungkilan", description: "Pit Kungkilan", period: "Jun-26", volume: 0, unit: "Ton", unitRateIDR: r("Coal Winning Pit Kungkilan", 17500) },

    { id: "BGG_C1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Pit Kungkilan", overhaulMtr: 1232, period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: r("Over Distance For OB Removal (Feb-26)", 1393) },
    { id: "BGG_C2", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Pit Kungkilan", overhaulMtr: 1239, period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: r("Over Distance For OB Removal (Jun-26)", 1550) },
    { id: "BGG_C3", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Pit Kungkilan", overhaulMtr: 4582, period: "Jun-26", volume: 0, unit: "Ton", unitRateIDR: r("Over Distance For Coal Winning (Jun-26)", 19700) },

    { id: "BGG_D1", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: 7467 },
    { id: "BGG_D2", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: 16520 },
    { id: "BGG_D3", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: 7261 },
    { id: "BGG_D4", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: 16100 },
    { id: "BGG_D5", section: "D", subSection: "D2. Over Distance For OB Removal", description: "Pit Kungkilan", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: 382 },
    { id: "BGG_D6", section: "D", subSection: "D2. Over Distance For OB Removal", description: "Pit Kungkilan", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: 868 },
    { id: "BGG_D7", section: "D", subSection: "D3. Coal Winning", description: "Pit Kungkilan", period: "Jun-26", volume: 0, unit: "Ton", unitRateIDR: 9800 },
    { id: "BGG_D8", section: "D", subSection: "D4. Over Distance For Coal Winning", description: "Pit Kungkilan", period: "Jun-26", volume: 0, unit: "Ton", unitRateIDR: 11032 },

    { id: "BGG_E1", section: "E", description: "E.1 Overdistance for OB Removal", amount: -96363648, isDeduction: true },
    { id: "BGG_E2", section: "E", description: "E.2 Overdistance for Coal Winning", amount: -229913035, isDeduction: true },
    { id: "BGG_E3", section: "E", description: "E.3 Raise & Fall's Overdistance for OB Removal", amount: -44360682, isDeduction: true },
    { id: "BGG_E4", section: "E", description: "E.4 Raise & Fall's Overdistance for Coal Winning", amount: -128751300, isDeduction: true },

    { id: "BGG_F1", section: "F", description: "F.1 Fuel & Transport PI JUNI 26", amount: -3749363200, isDeduction: true },
  ];
}

/** Demo BGG items with sample volumes */
export const demoBGGItems = [
  { id: "BGG_A1", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", volume: 36168.37, unit: "Bcm", unitRateIDR: 27250 },
  { id: "BGG_A2", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", volume: 121490.00, unit: "Bcm", unitRateIDR: 29500 },
  { id: "BGG_A3", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", volume: 12056.12, unit: "Bcm", unitRateIDR: 26500 },
  { id: "BGG_A4", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", volume: 40496.67, unit: "Bcm", unitRateIDR: 28750 },
  { id: "BGG_B1", section: "B", subSection: "B1. Pit Kungkilan", description: "Pit Kungkilan", period: "Jun-26", volume: 46683.48, unit: "Ton", unitRateIDR: 17500 },
  { id: "BGG_C1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Pit Kungkilan", overhaulMtr: 1232, period: "Feb-26", volume: 48224.49, unit: "Bcm", unitRateIDR: 1393 },
  { id: "BGG_C2", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Pit Kungkilan", overhaulMtr: 1239, period: "Jun-26", volume: 161986.66, unit: "Bcm", unitRateIDR: 1550 },
  { id: "BGG_C3", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Pit Kungkilan", overhaulMtr: 4582, period: "Jun-26", volume: 46683.48, unit: "Ton", unitRateIDR: 19700 },
  { id: "BGG_D1", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", volume: 36168.37, unit: "Bcm", unitRateIDR: 7467 },
  { id: "BGG_D2", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", volume: 121490.00, unit: "Bcm", unitRateIDR: 16520 },
  { id: "BGG_D3", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", volume: 12056.12, unit: "Bcm", unitRateIDR: 7261 },
  { id: "BGG_D4", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", volume: 40496.67, unit: "Bcm", unitRateIDR: 16100 },
  { id: "BGG_D5", section: "D", subSection: "D2. Over Distance For OB Removal", description: "Pit Kungkilan", period: "Feb-26", volume: 48224.49, unit: "Bcm", unitRateIDR: 382 },
  { id: "BGG_D6", section: "D", subSection: "D2. Over Distance For OB Removal", description: "Pit Kungkilan", period: "Jun-26", volume: 161986.66, unit: "Bcm", unitRateIDR: 868 },
  { id: "BGG_D7", section: "D", subSection: "D3. Coal Winning", description: "Pit Kungkilan", period: "Jun-26", volume: 46683.48, unit: "Ton", unitRateIDR: 9800 },
  { id: "BGG_D8", section: "D", subSection: "D4. Over Distance For Coal Winning", description: "Pit Kungkilan", period: "Jun-26", volume: 46683.48, unit: "Ton", unitRateIDR: 11032 },
  { id: "BGG_E1", section: "E", description: "E.1 Overdistance for OB Removal", amount: -96363648, isDeduction: true },
  { id: "BGG_E2", section: "E", description: "E.2 Overdistance for Coal Winning", amount: -229913035, isDeduction: true },
  { id: "BGG_E3", section: "E", description: "E.3 Raise & Fall's Overdistance for OB Removal", amount: -44360682, isDeduction: true },
  { id: "BGG_E4", section: "E", description: "E.4 Raise & Fall's Overdistance for Coal Winning", amount: -128751300, isDeduction: true },
  { id: "BGG_F1", section: "F", description: "F.1 Fuel & Transport PI JUNI 26", amount: -3749363200, isDeduction: true },
];

// ─── DBK Mining (Dual Currency: USD + IDR) ───────────────────────────────────

export function makeBlankDBKItems(dynamicSowOptions: any[] = [], mRate: number = 17923.30) {
  const r = (name: string, fb: number, usd = true) => getSowMasterRate("DBK", name, fb, usd, dynamicSowOptions, mRate);
  return [
    { id: "DBK_A1", section: "A", subSection: "A1. PIT SAPAN", description: "OVER BURDEN REMOVAL", volume: 0, unit: "Bcm", unitRateUSD: r("PIT SAPAN OB Removal", 1.831), kursBI: 17140.76 },
    { id: "DBK_B1", section: "B", subSection: "B1. PIT SAPAN", description: "COAL WINNING", volume: 0, unit: "Ton", unitRateUSD: r("PIT SAPAN Coal Winning", 0.887), kursBI: 17140.76 },
    { id: "DBK_C1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "PIT SAPAN", overhaulMtr: 957, baseMtr: 1000, volume: 0, unit: "Bcm", unitRateIDR: r("PIT SAPAN Overhaul OB", 296.86, false) },
    { id: "DBK_C2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "PIT SAPAN", overhaulMtr: 3682, baseMtr: 3000, volume: 0, unit: "Ton", unitRateIDR: r("PIT SAPAN Overhaul Coal", 1042.84, false) },
  ];
}

export const demoDBKItems = [
  { id: "DBK_A1", section: "A", subSection: "A1. PIT SAPAN", description: "OVER BURDEN REMOVAL", volume: 199108.568, unit: "Bcm", unitRateUSD: 1.490, kursBI: 17140.76 },
  { id: "DBK_B1", section: "B", subSection: "B1. PIT SAPAN", description: "COAL WINNING", volume: 18816.190, actualVolume: 28633.341, unit: "Ton", unitRateUSD: 0.840, kursBI: 17140.76 },
  { id: "DBK_C1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "PIT SAPAN", overhaulMtr: 956.680, baseMtr: 1000, volume: 0, unit: "Bcm", unitRateIDR: 0 },
  { id: "DBK_C2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "PIT SAPAN", overhaulMtr: 3681.60, baseMtr: 3000, volume: 195165.425, unit: "Ton", unitRateIDR: 230.00 },
];

// ─── SBS Mining (Area kerja + Alat + Pengurang) ──────────────────────────────

export function makeBlankSBSItems(dynamicSowOptions: any[] = [], mRate: number = 17923.30) {
  const r = (name: string, fb: number) => getSowMasterRate("SBS", name, fb, false, dynamicSowOptions, mRate);
  return [
    { id: "SBS_A1", section: "A", description: "PIT E - DISPOSAL SEKATAN", volume: 0, unit: "BCM", unitRateIDR: r("PIT E - DISPOSAL SEKATAN", 22654) },
    { id: "SBS_A2", section: "A", description: "PIT E - RENCANA JALAN", volume: 0, unit: "BCM", unitRateIDR: r("PIT E - RENCANA JALAN", 12638) },
    { id: "SBS_A3", section: "A", description: "PIT E - RENCANA CSA", volume: 0, unit: "BCM", unitRateIDR: r("PIT E - RENCANA CSA", 8346) },
    { id: "SBS_A4", section: "A", description: "PIT E - JALAN BARITO", volume: 0, unit: "BCM", unitRateIDR: r("PIT E - JALAN BARITO", 15500) },
    { id: "SBS_A5", section: "A", description: "PIT E - SEKATAN", volume: 0, unit: "BCM", unitRateIDR: r("PIT E - SEKATAN", 16931) },
    { id: "SBS_A6", section: "A", description: "PIT E - TS MAHONI", volume: 0, unit: "BCM", unitRateIDR: r("PIT E - TS MAHONI", 22654) },
    { id: "SBS_A7", section: "A", description: "PIT E - IPD WARWEFILL", volume: 0, unit: "BCM", unitRateIDR: r("PIT E - IPD WARWEFILL", 8346) },
    { id: "SBS_A8", section: "A", description: "PIT E - SEKATAN", volume: 0, unit: "BCM", unitRateIDR: r("PIT E - SEKATAN", 19375) },

    { id: "SBS_B1", section: "B", description: "Dozer CAT D10 - BDCT 1001", volume: 0, unit: "Hours", unitRateIDR: r("Dozer CAT D10", 1980000) },
    { id: "SBS_B2", section: "B", description: "Dozer CAT D10 - BDCT 1002", volume: 0, unit: "Hours", unitRateIDR: r("Dozer CAT D10", 1980000) },
    { id: "SBS_B3", section: "B", description: "Excavator CAT 395 - EXCT 3901", volume: 0, unit: "Hours", unitRateIDR: r("Excavator CAT 395", 1425000) },
    { id: "SBS_B4", section: "B", description: "Excavator CAT 395 - EXCT 3902", volume: 0, unit: "Hours", unitRateIDR: r("Excavator CAT 395", 1425000) },

    { id: "SBS_P1", section: "P", description: "1. Denda Ketidaktercapaian MA", unit: "Hours", amount: -191073864, isDeduction: true },
    { id: "SBS_P2", section: "P", description: "2. Kelebihan Pemakaian BBM Loader", unit: "", amount: 0, isDeduction: true },
    { id: "SBS_P3", section: "P", description: "3. Kelebihan Pemakaian BBM Hauler", unit: "", amount: -520428670, isDeduction: true },
    { id: "SBS_P4", section: "P", description: "4. Denda ketidakcapaian volume April 2025 - Juni 2026", unit: "", amount: -60674886, isDeduction: true },
  ];
}

export const demoSBSItems = [
  { id: "SBS_A1", section: "A", description: "PIT E - DISPOSAL SEKATAN", volume: 80114.79, unit: "BCM", unitRateIDR: 22654 },
  { id: "SBS_A2", section: "A", description: "PIT E - RENCANA JALAN", volume: 23741.16, unit: "BCM", unitRateIDR: 12638 },
  { id: "SBS_A3", section: "A", description: "PIT E - RENCANA CSA", volume: 442.24, unit: "BCM", unitRateIDR: 8346 },
  { id: "SBS_A4", section: "A", description: "PIT E - JALAN BARITO", volume: 33726.42, unit: "BCM", unitRateIDR: 15500 },
  { id: "SBS_A5", section: "A", description: "PIT E - SEKATAN", volume: 110582.62, unit: "BCM", unitRateIDR: 16931 },
  { id: "SBS_A6", section: "A", description: "PIT E - TS MAHONI", volume: 1536.19, unit: "BCM", unitRateIDR: 22654 },
  { id: "SBS_A7", section: "A", description: "PIT E - IPD WARWEFILL", volume: 3840.48, unit: "BCM", unitRateIDR: 8346 },
  { id: "SBS_A8", section: "A", description: "PIT E - SEKATAN", volume: 1154.75, unit: "BCM", unitRateIDR: 19375 },

  { id: "SBS_B1", section: "B", description: "Dozer CAT D10 - BDCT 1001", volume: 250.70, unit: "Hours", unitRateIDR: 1980000 },
  { id: "SBS_B2", section: "B", description: "Dozer CAT D10 - BDCT 1002", volume: 298.40, unit: "Hours", unitRateIDR: 1980000 },
  { id: "SBS_B3", section: "B", description: "Excavator CAT 395 - EXCT 3901", volume: 386.30, unit: "Hours", unitRateIDR: 1425000 },
  { id: "SBS_B4", section: "B", description: "Excavator CAT 395 - EXCT 3902", volume: 400.60, unit: "Hours", unitRateIDR: 1425000 },

  { id: "SBS_P1", section: "P", description: "1. Denda Ketidaktercapaian MA", unit: "Hours", amount: -191073864, isDeduction: true },
  { id: "SBS_P2", section: "P", description: "2. Kelebihan Pemakaian BBM Loader", unit: "", amount: 0, isDeduction: true },
  { id: "SBS_P3", section: "P", description: "3. Kelebihan Pemakaian BBM Hauler", unit: "", amount: -520428670, isDeduction: true },
  { id: "SBS_P4", section: "P", description: "4. Denda ketidakcapaian volume April 2025 - Juni 2026", unit: "", amount: -60674886, isDeduction: true },
];

// ─── BA Default Templates (for BA form) ──────────────────────────────────────

export const defaultPOSBAOperatingItems = [
  { id: "ba_op1", category: "Operating & Mining", area: "WM1", material: "Top Soil", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 60500, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_op2", category: "Operating & Mining", area: "WM1", material: "Saprolite", unit: "WMT", initialVolume: 0, adjustedVolume: 0, rate: 62200, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_op3", category: "Operating & Mining", area: "WM1", material: "Limonite", unit: "WMT", initialVolume: 0, adjustedVolume: 0, rate: 60200, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_op4", category: "Operating & Mining", area: "WM1", material: "Overburden/ Waste", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 59500, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist1", category: "Over Distance", area: "WM1", material: "Over/Underhaul For OB Removal", unit: "BCM", parentMaterial: "Overburden/ Waste", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist2", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Top Soil Removal", unit: "BCM", parentMaterial: "Top Soil", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist3", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Limonite", unit: "BCM", parentMaterial: "Limonite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist4", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Saprolite", unit: "BCM", parentMaterial: "Saprolite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
];

export const defaultPOSBAMDOItems = [
  { id: "ba_mdo1", category: "MDO", area: "Site POS", material: "Mine Development (MDO) - Clearing & Access Road", unit: "Ha", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 15500000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_mdo2", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", unit: "USD/1KM", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 9450, subtotalInitial: 0, subtotalAdjusted: 0 },
];

export const defaultBGGBAItems = [
  { id: "bgg_op1", category: "Operating & Mining", area: "Pit KKL", material: "Volume Overburden (OB)", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 29500, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "bgg_op2", category: "Operating & Mining", area: "Pit KKL", material: "Volume Batubara (Coal)", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 17500, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "bgg_dist1", category: "Over Distance", area: "Pit KKL", material: "Distance / Overhaul For OB Removal", unit: "Bcm.Hm", parentMaterial: "Volume Overburden (OB)", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 155, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "bgg_dist2", category: "Over Distance", area: "Pit KKL", material: "Distance / Overhaul For Coal Winning", unit: "BCM", parentMaterial: "Volume Batubara (Coal)", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 19700, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
];

/**
 * Get blank invoice line items for a customer, optionally using dynamic SOW master rates.
 * Use this everywhere instead of the in-component blankXXXItems variables.
 */
export function getBlankInvoiceItems(
  customerCode: string,
  dynamicSowOptions: any[] = [],
  mRate: number = 17923.30
): any[] {
  switch (customerCode.toUpperCase()) {
    case "BGG": return makeBlankBGGItems(dynamicSowOptions, mRate);
    case "DBK": return makeBlankDBKItems(dynamicSowOptions, mRate);
    case "SBS": return makeBlankSBSItems(dynamicSowOptions, mRate);
    default:    return makeBlankPOSItems(dynamicSowOptions, mRate);  // POS + ABN
  }
}

/**
 * Get default BA operating items for a customer code.
 */
export function getDefaultBAItems(customerCode: string): { operating: any[]; mdo: any[] } {
  const isBGG = customerCode === "BGG" || customerCode === "PT BGG";
  return {
    operating: isBGG ? defaultBGGBAItems : defaultPOSBAOperatingItems,
    mdo: isBGG ? [] : defaultPOSBAMDOItems,
  };
}
