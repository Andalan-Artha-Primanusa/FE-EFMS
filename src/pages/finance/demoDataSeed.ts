export const FALLBACK_BLANK_PTRO_ITEMS = [
  { id: "ptro_inv_a1", section: "A", description: "OVER BURDEN REMOVAL", unit: "Bcm", volume: 0, unitRateUSD: 0, kursBI: 0 },
  { id: "ptro_inv_b1", section: "B", description: "COAL GETTING", unit: "Ton", volume: 0, unitRateUSD: 0, kursBI: 0 },
  { id: "ptro_inv_c1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Overhaul OB", unit: "Bcm", volume: 0, overhaulMtr: 0, baseMtr: 1000, unitRateUSD: 0, kursBI: 0 },
  { id: "ptro_inv_c2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Overhaul Coal Getting", unit: "Ton", volume: 0, overhaulMtr: 0, baseMtr: 3000, unitRateIDR: 0 },
];
export const FALLBACK_BLANK_DBK_ITEMS = FALLBACK_BLANK_PTRO_ITEMS;

export const FALLBACK_BLANK_BGG_ITEMS = [
  { id: "bgg_inv_a1", section: "A", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", unit: "Bcm", volume: 0, unitRateIDR: 0 },
  { id: "bgg_inv_a2", section: "A", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", unit: "Bcm", volume: 0, unitRateIDR: 0 },
  { id: "bgg_inv_b1", section: "B", description: "Coal Winning Pit Kungkilan", period: "Jun-26", unit: "Ton", volume: 0, unitRateIDR: 0 },
  { id: "bgg_inv_c1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Over Distance For OB Removal", unit: "Bcm", volume: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "bgg_inv_c2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Over Distance For Coal Winning", unit: "Ton", volume: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "bgg_inv_d1", section: "D", description: "Raise & Fall Factor (BBM)", unit: "Bcm", volume: 0, unitRateIDR: 0 },
  { id: "bgg_inv_e1", section: "E", description: "Discount on Overdistance (Deduction 25%)", amount: 0 },
  { id: "bgg_inv_f1", section: "F", description: "DP Fuel & Transport (Deduction)", amount: 0 },
];

export const FALLBACK_BLANK_SBS_ITEMS = [
  { id: "sbs_inv_a1", section: "A", description: "PIT E - DISPOSAL SEKATAN", unit: "BCM", volume: 0, distanceM: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "sbs_inv_a2", section: "A", description: "PIT E - RENCANA JALAN", unit: "BCM", volume: 0, distanceM: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "sbs_inv_a3", section: "A", description: "PIT E - RENCANA CSA", unit: "BCM", volume: 0, distanceM: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "sbs_inv_a4", section: "A", description: "PIT E - JALAN BARITO", unit: "BCM", volume: 0, distanceM: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "sbs_inv_a5", section: "A", description: "PIT E - SEKATAN", unit: "BCM", volume: 0, distanceM: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "sbs_inv_a6", section: "A", description: "PIT E - TS MAHONI", unit: "BCM", volume: 0, distanceM: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "sbs_inv_a7", section: "A", description: "PIT E - IPD WARWEFILL", unit: "BCM", volume: 0, distanceM: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "sbs_inv_a8", section: "A", description: "PIT E - SEKATAN", unit: "BCM", volume: 0, distanceM: 0, overhaulMtr: 0, unitRateIDR: 0 },
  { id: "sbs_inv_b1", section: "B", description: "Dozer CAT D10 - BDCT 1001", unit: "Hours", volume: 0, unitRateIDR: 0 },
  { id: "sbs_inv_b2", section: "B", description: "Dozer CAT D10 - BDCT 1002", unit: "Hours", volume: 0, unitRateIDR: 0 },
  { id: "sbs_inv_b3", section: "B", description: "Excavator CAT 395 - EXCT 3901", unit: "Hours", volume: 0, unitRateIDR: 0 },
  { id: "sbs_inv_b4", section: "B", description: "Excavator CAT 395 - EXCT 3902", unit: "Hours", volume: 0, unitRateIDR: 0 },
  { id: "sbs_inv_p1", section: "P", description: "1. Denda Ketidaktercapaian MA", unit: "Lot", volume: 0, unitRateIDR: 0, amount: 0, isDeduction: true },
  { id: "sbs_inv_p2", section: "P", description: "2. Kelebihan Pemakaian BBM Loader (Fuel Ratio)", unit: "Lot", volume: 0, unitRateIDR: 0, amount: 0, isDeduction: true },
  { id: "sbs_inv_p3", section: "P", description: "3. Kelebihan Pemakaian BBM Hauler (Fuel Consumption)", unit: "Lot", volume: 0, unitRateIDR: 0, amount: 0, isDeduction: true },
  { id: "sbs_inv_p4", section: "P", description: "4. Denda Ketidakcapaian Volume", unit: "Lot", volume: 0, unitRateIDR: 0, amount: 0, isDeduction: true },
];

export const FALLBACK_BLANK_POS_ITEMS = [
  { id: "pos_inv_a1", section: "A", description: "Topsoil Removal - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 0, volume: 0 },
  { id: "pos_inv_a2", section: "A", description: "Overburden/Waste - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 0, volume: 0 },
  { id: "pos_inv_a3", section: "A", description: "Limonite - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 0, volume: 0 },
  { id: "pos_inv_a4", section: "A", description: "Saprolite - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 0, volume: 0 },
  { id: "pos_inv_a5", section: "A", description: "Clear & Grub", unit: "USD/m2", baseRateUSD: 0, volume: 0 },
  { id: "pos_inv_b1", section: "B", description: "Over/Underhaul For OB Removal", unit: "USD/1KM", baseRateUSD: 0, volume: 0, overhaulMtr: 0 },
  { id: "pos_inv_b2", section: "B", description: "Over/Underhaul For Top Soil Removal", unit: "USD/1KM", baseRateUSD: 0, volume: 0, overhaulMtr: 0 },
  { id: "pos_inv_b3", section: "B", description: "Over/Underhaul For Limonite", unit: "USD/1KM", baseRateUSD: 0, volume: 0, overhaulMtr: 0 },
  { id: "pos_inv_b4", section: "B", description: "Over/Underhaul For Saprolite", unit: "USD/1KM", baseRateUSD: 0, volume: 0, overhaulMtr: 0 },
];

export const FALLBACK_BGG_BA_ITEMS = [
  { id: "bgg_op1", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Aug-26", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 27250, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "bgg_op2", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Aug-26", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 26500, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "bgg_cw", category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning", period: "Aug-26", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: 16500, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "bgg_od_ob", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Aug-26", unit: "BCM", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 600, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "bgg_od_cw", category: "Over Distance", area: "Pit KKL", material: "Over Distance For Coal Winning", period: "Aug-26", unit: "Ton", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 500, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
];

export const FALLBACK_POS_OPERATING_ITEMS = [
  { id: "ba_op1", category: "Operating & Mining", area: "WM1", material: "Top Soil", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 60500, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_op2", category: "Operating & Mining", area: "WM1", material: "Saprolite", unit: "WMT", initialVolume: 0, adjustedVolume: 0, rate: 62200, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_op3", category: "Operating & Mining", area: "WM1", material: "Limonite", unit: "WMT", initialVolume: 0, adjustedVolume: 0, rate: 60200, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_op4", category: "Operating & Mining", area: "WM1", material: "Overburden/ Waste", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 59500, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist1", category: "Over Distance", area: "WM1", material: "Over/Underhaul For OB Removal", unit: "BCM", parentMaterial: "Overburden/ Waste", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist2", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Top Soil Removal", unit: "BCM", parentMaterial: "Top Soil", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist3", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Limonite", unit: "BCM", parentMaterial: "Limonite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist4", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Saprolite", unit: "BCM", parentMaterial: "Saprolite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
];

export const FALLBACK_POS_MDO_ITEMS = [
  { id: "ba_mdo1", category: "MDO", area: "Site POS", material: "Mine Development (MDO) - Clearing & Access Road", unit: "Ha", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 15500000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_mdo2", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", unit: "USD/1KM", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 9450, subtotalInitial: 0, subtotalAdjusted: 0 }
];

export const FALLBACK_SBS_BA_ITEMS = [
  { id: "sbs_ba_a1", category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL SELATAN", unit: "BCM", distance: 0, initialVolume: 0, adjustedVolume: 0, rate: 18362, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ba_a2", category: "Operating & Mining", area: "Pit E", material: "PIT E - IPD EXTENSION", unit: "BCM", distance: 0, initialVolume: 0, adjustedVolume: 0, rate: 21223, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ba_a3", category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL BARAT", unit: "BCM", distance: 0, initialVolume: 0, adjustedVolume: 0, rate: 22654, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ba_a4", category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL BARAT LAUT", unit: "BCM", distance: 0, initialVolume: 0, adjustedVolume: 0, rate: 12638, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ba_a5", category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL BANKO BARAT", unit: "BCM", distance: 0, initialVolume: 0, adjustedVolume: 0, rate: 8346, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ba_a6", category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL BARAT LAUT BARU", unit: "BCM", distance: 0, initialVolume: 0, adjustedVolume: 0, rate: 15500, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ba_a7", category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL INPIT", unit: "BCM", distance: 0, initialVolume: 0, adjustedVolume: 0, rate: 19375, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ba_a8", category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL TS BARU", unit: "BCM", distance: 0, initialVolume: 0, adjustedVolume: 0, rate: 15500, subtotalInitial: 0, subtotalAdjusted: 0 }
];

export const FALLBACK_SBS_RENTAL_ITEMS = [
  { id: "sbs_rent_1", category: "Penunjang", area: "Pit E", material: "BULLDOZER CAT D10T (BDCT1001)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1980000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_2", category: "Penunjang", area: "Pit E", material: "BULLDOZER CAT D10T (BDCT1002)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1980000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_3", category: "Penunjang", area: "Pit E", material: "EXCAVATOR CAT 395 (EXCT3091)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1425000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_4", category: "Penunjang", area: "Pit E", material: "EXCAVATOR CAT 395 (EXCT3092)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1425000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_5", category: "Penunjang", area: "Pit E", material: "EXCAVATOR HITACHI ZX870LCH (EX815)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 987900, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_6", category: "Penunjang", area: "Pit E", material: "EXCAVATOR HITACHI ZX870LCH (EX816)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 987900, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_7", category: "Penunjang", area: "Pit E", material: "EXCAVATOR HITACHI ZX870LCH (EX818)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 987900, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_8", category: "Penunjang", area: "Pit E", material: "BULLDOZER KOMATSU D85ESS-2 (DZ709)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 470000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_9", category: "Penunjang", area: "Pit E", material: "BULLDOZER CAT D8 (DZ716)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1032200, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_10", category: "Penunjang", area: "Pit E", material: "BULLDOZER CAT D8 (DZ717)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1032200, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_11", category: "Penunjang", area: "Pit E", material: "BULLDOZER CAT D8 (DZ718)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1032200, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_12", category: "Penunjang", area: "Pit E", material: "MOTORGRADER CAT MG160 (GD607)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 767800, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_13", category: "Penunjang", area: "Pit E", material: "MOTORGRADER CAT MG160 (GD608)", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 767800, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_14", category: "Penunjang", area: "Pit E", material: "HIMOINSA APOLO (LIGHTING TOWER 08)", unit: "Month", initialVolume: 0, adjustedVolume: 0, rate: 12000000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_15", category: "Penunjang", area: "Pit E", material: "HIMOINSA APOLO (LIGHTING TOWER 14)", unit: "Month", initialVolume: 0, adjustedVolume: 0, rate: 12000000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_16", category: "Penunjang", area: "Pit E", material: "ATLAS COPCO (LIGHTING TOWER 15)", unit: "Month", initialVolume: 0, adjustedVolume: 0, rate: 12000000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_17", category: "Penunjang", area: "Pit E", material: "ATLAS COPCO (LIGHTING TOWER 16)", unit: "Month", initialVolume: 0, adjustedVolume: 0, rate: 12000000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_18", category: "Penunjang", area: "Pit E", material: "HIMOINSA APOLO (LIGHTING TOWER 17)", unit: "Month", initialVolume: 0, adjustedVolume: 0, rate: 12000000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_19", category: "Penunjang", area: "Pit E", material: "HIMOINSA APOLO (LIGHTING TOWER 18)", unit: "Month", initialVolume: 0, adjustedVolume: 0, rate: 12000000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_20", category: "Penunjang", area: "Pit E", material: "HINO FUEL TRUCK (FT06)", unit: "Month", initialVolume: 0, adjustedVolume: 0, rate: 80000000, subtotalInitial: 0, subtotalAdjusted: 0 }
];

export const FALLBACK_SBS_DEDUCTION_ITEMS = [
  { id: "sbs_ded_1", category: "Pengurang Biaya", area: "Pit E", material: "1. Denda Ketidaktercapaian MA", unit: "Hours", initialVolume: 1, adjustedVolume: 1, rate: 191073864, isDeduction: true, subtotalInitial: 191073864, subtotalAdjusted: 191073864 },
  { id: "sbs_ded_2", category: "Pengurang Biaya", area: "Pit E", material: "2. Kelebihan Pemakaian BBM Loader", unit: "Hours", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ded_3", category: "Pengurang Biaya", area: "Pit E", material: "3. Kelebihan Pemakaian BBM Hauler", unit: "Hours", initialVolume: 1, adjustedVolume: 1, rate: 520428670, isDeduction: true, subtotalInitial: 520428670, subtotalAdjusted: 520428670 },
  { id: "sbs_ded_4", category: "Pengurang Biaya", area: "Pit E", material: "4. Denda ketidakcapaian volume April 2025 - Juni 2026", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 60674886, isDeduction: true, subtotalInitial: 60674886, subtotalAdjusted: 60674886 }
];

export const FALLBACK_PTRO_BA_ITEMS = [
  { id: "ptro_ba_ob", category: "Operating & Mining", area: "Pit Sapan", material: "OVER BURDEN REMOVAL", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: 1.490, distanceBasis: 0, isDistanceVar: false, rate: 26700, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
  { id: "ptro_ba_cg", category: "Operating & Mining", area: "Pit Sapan", material: "COAL GETTING", unit: "MT", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: 0.840, distanceBasis: 0, isDistanceVar: false, rate: 15050, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
  { id: "ptro_ba_odob", category: "Over Distance", area: "Pit Sapan", material: "Overhaul OB", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: 0.028, distanceBasis: 1000, isDistanceVar: true, distanceWeightAvg: 1000, rate: 500, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
  { id: "ptro_ba_odcg", category: "Over Distance", area: "Pit Sapan", material: "Overhaul Coal Getting", unit: "TON", initialVolume: 0, adjustedVolume: 0, isUSD: false, rateIDR: 230, distanceBasis: 3000, isDistanceVar: true, distanceWeightAvg: 3000, rate: 230, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" }
];

export function getInitialBAItemsForRecord(
  item: any,
  defaults: {
    defaultBGGBAItems: any[];
    defaultDBKBAItems: any[];
    defaultPTROBAItems?: any[];
    defaultSBSBAOperatingItems: any[];
    defaultPOSBAOperatingItems: any[];
  }
): any[] {
  if (!item) return [];
  if (item.items && Array.isArray(item.items) && item.items.length > 0) {
    return item.items;
  }
  const baNo = (item.baNumber || item.draftBARefNo || "").trim();
  const period = (item.workPeriod || "").trim();
  const cust = (item.customerCode || "").trim();

  if (baNo.includes("20/BAP-AAP-KKL") || (cust === "BGG" && period === "Jan-26")) {
    return [
      { id: "bgg_jan_ob1", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Jan-26", unit: "BCM", initialVolume: 158500.00, adjustedVolume: 158500.00, rate: 27250, subtotalInitial: 4319125000, subtotalAdjusted: 4319125000 },
      { id: "bgg_jan_ob2", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Jan-26", unit: "BCM", initialVolume: 52833.33, adjustedVolume: 52833.33, rate: 26500, subtotalInitial: 1400083245, subtotalAdjusted: 1400083245 },
      { id: "bgg_jan_cw", category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning Pit Kungkilan", period: "Jan-26", unit: "Ton", initialVolume: 16858.73, adjustedVolume: 16858.73, rate: 16500, subtotalInitial: 278169045, subtotalAdjusted: 278169045 },
      { id: "bgg_jan_odob", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Jan-26", unit: "BCM", distanceWeightAvg: 1220, initialVolume: 211333.33, adjustedVolume: 211333.33, rate: 1450, isDistanceVar: true, subtotalInitial: 306433328, subtotalAdjusted: 306433328 },
      { id: "bgg_jan_odcw", category: "Over Distance", area: "Pit KKL", material: "Over Distance For Coal Winning", period: "Jan-26", unit: "Ton", distanceWeightAvg: 4200, initialVolume: 16858.73, adjustedVolume: 16858.73, rate: 21150, isDistanceVar: true, subtotalInitial: 356582058, subtotalAdjusted: 356582058 }
    ];
  }
  if (baNo.includes("21/BAP-AAP-KKL") || (cust === "BGG" && period === "Feb-26")) {
    return [
      { id: "bgg_feb_ob1", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", unit: "BCM", initialVolume: 185000.00, adjustedVolume: 185000.00, rate: 27250, subtotalInitial: 5041250000, subtotalAdjusted: 5041250000 },
      { id: "bgg_feb_ob2", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", unit: "BCM", initialVolume: 61666.67, adjustedVolume: 61666.67, rate: 26500, subtotalInitial: 1634166755, subtotalAdjusted: 1634166755 },
      { id: "bgg_feb_cw", category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning Pit Kungkilan", period: "Feb-26", unit: "Ton", initialVolume: 25000.00, adjustedVolume: 25000.00, rate: 16500, subtotalInitial: 412500000, subtotalAdjusted: 412500000 },
      { id: "bgg_feb_odob", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Feb-26", unit: "BCM", distanceWeightAvg: 1232, initialVolume: 246666.67, adjustedVolume: 246666.67, rate: 1393, isDistanceVar: true, subtotalInitial: 343606671, subtotalAdjusted: 343606671 },
      { id: "bgg_feb_odcw", category: "Over Distance", area: "Pit KKL", material: "Over Distance For Coal Winning", period: "Feb-26", unit: "Ton", distanceWeightAvg: 4040, initialVolume: 25000.00, adjustedVolume: 25000.00, rate: 16739, isDistanceVar: true, subtotalInitial: 418476574, subtotalAdjusted: 418476574 }
    ];
  }
  if (baNo.includes("22/BAP-AAP-KKL") || (cust === "BGG" && period === "Mar-26")) {
    return [
      { id: "bgg_mar_ob1_nov", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%) (Nov-25)", period: "Nov-25", unit: "BCM", initialVolume: 309900.02, adjustedVolume: 309900.02, rate: 27250, subtotalInitial: 8444775545, subtotalAdjusted: 8444775545 },
      { id: "bgg_mar_ob2_nov", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%) (Nov-25)", period: "Nov-25", unit: "BCM", initialVolume: 103300.01, adjustedVolume: 103300.01, rate: 26500, subtotalInitial: 2737450265, subtotalAdjusted: 2737450265 },
      { id: "bgg_mar_ob1_des", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%) (Dec-25)", period: "Dec-25", unit: "BCM", initialVolume: 110245.88, adjustedVolume: 110245.88, rate: 27250, subtotalInitial: 3004200230, subtotalAdjusted: 3004200230 },
      { id: "bgg_mar_ob2_des", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%) (Dec-25)", period: "Dec-25", unit: "BCM", initialVolume: 36748.63, adjustedVolume: 36748.63, rate: 26500, subtotalInitial: 973838695, subtotalAdjusted: 973838695 },
      { id: "bgg_mar_ob1_mar", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Mar-26", unit: "BCM", initialVolume: 100000.00, adjustedVolume: 100000.00, rate: 27250, subtotalInitial: 2725000000, subtotalAdjusted: 2725000000 },
      { id: "bgg_mar_ob2_mar", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Mar-26", unit: "BCM", initialVolume: 33333.33, adjustedVolume: 33333.33, rate: 26500, subtotalInitial: 883333245, subtotalAdjusted: 883333245 },
      { id: "bgg_mar_cw_mar", category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning Pit Kungkilan", period: "Mar-26", unit: "Ton", initialVolume: 39734.33, adjustedVolume: 39734.33, rate: 17500, subtotalInitial: 695350775, subtotalAdjusted: 695350775 },
      { id: "bgg_mar_od_ob", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Mar-26", unit: "BCM", distanceWeightAvg: 1248, initialVolume: 560194.54, adjustedVolume: 560194.54, rate: 1491, isDistanceVar: true, subtotalInitial: 835250060, subtotalAdjusted: 835250060 }
    ];
  }
  if (baNo.includes("SRV-OB/BGG") || (cust === "BGG" && (period.includes("Jun") || period === "Juni 2026"))) {
    return FALLBACK_BGG_BA_ITEMS;
  }
  if (cust === "SBS" && (baNo.includes("127-128") || period === "Jan-26")) {
    return [
      { id: "sbs_jan_op1", category: "Operating & Mining", area: "Pit SBS", material: "OB Removal Area Kerja", period: "Jan-26", unit: "BCM", initialVolume: 135000.00, adjustedVolume: 135000.00, rate: 28000, subtotalInitial: 3780000000, subtotalAdjusted: 3780000000 },
      { id: "sbs_jan_op2", category: "Operating & Mining", area: "Pit SBS", material: "Jasa Penunjang Produksi", period: "Jan-26", unit: "Hours", initialVolume: 1800.00, adjustedVolume: 1800.00, rate: 350000, subtotalInitial: 630000000, subtotalAdjusted: 630000000 },
      { id: "sbs_jan_op3", category: "Operating & Mining", area: "Pit SBS", material: "Hauling & Water Management", period: "Jan-26", unit: "Hours", initialVolume: 1047.62, adjustedVolume: 1047.62, rate: 420000, subtotalInitial: 440000000, subtotalAdjusted: 440000000 }
    ];
  }
  if (cust === "SBS" && (baNo.includes("55-56") || period === "Dec-25")) {
    return [
      { id: "sbs_dec_op1", category: "Operating & Mining", area: "Pit SBS", material: "OB Removal Area Kerja", period: "Dec-25", unit: "BCM", initialVolume: 90000.00, adjustedVolume: 90000.00, rate: 28000, subtotalInitial: 2520000000, subtotalAdjusted: 2520000000 },
      { id: "sbs_dec_op2", category: "Operating & Mining", area: "Pit SBS", material: "Jasa Penunjang Produksi", period: "Dec-25", unit: "Hours", initialVolume: 1100.00, adjustedVolume: 1100.00, rate: 350000, subtotalInitial: 385000000, subtotalAdjusted: 385000000 },
      { id: "sbs_dec_op3", category: "Operating & Mining", area: "Pit SBS", material: "Hauling & Water Management", period: "Dec-25", unit: "Hours", initialVolume: 776.81, adjustedVolume: 776.81, rate: 420000, subtotalInitial: 326259551, subtotalAdjusted: 326259551 }
    ];
  }
  if (cust === "SBS" && (baNo.includes("270-273") || period === "Feb-26")) {
    return [
      { id: "sbs_feb_op1", category: "Operating & Mining", area: "Pit SBS", material: "OB Removal Area Kerja", period: "Feb-26", unit: "BCM", initialVolume: 110000.00, adjustedVolume: 110000.00, rate: 28000, subtotalInitial: 3080000000, subtotalAdjusted: 3080000000 },
      { id: "sbs_feb_op2", category: "Operating & Mining", area: "Pit SBS", material: "Jasa Penunjang Produksi", period: "Feb-26", unit: "Hours", initialVolume: 1400.00, adjustedVolume: 1400.00, rate: 350000, subtotalInitial: 490000000, subtotalAdjusted: 490000000 },
      { id: "sbs_feb_op3", category: "Operating & Mining", area: "Pit SBS", material: "Hauling & Water Management", period: "Feb-26", unit: "Hours", initialVolume: 904.76, adjustedVolume: 904.76, rate: 420000, subtotalInitial: 380000000, subtotalAdjusted: 380000000 }
    ];
  }
  if (cust === "DBK") {
    return [
      { id: "dbk_jan_op1", category: "Operating & Mining", area: "Pit Sapan", material: "OB Removal (Pit Sapan)", period: "Jan-26", unit: "BCM", initialVolume: 120000.00, adjustedVolume: 120000.00, rate: 31500, subtotalInitial: 3780000000, subtotalAdjusted: 3780000000 },
      { id: "dbk_jan_op2", category: "Operating & Mining", area: "Pit Sapan", material: "Coal Winning (Pit Sapan)", period: "Jan-26", unit: "Ton", initialVolume: 45000.00, adjustedVolume: 45000.00, rate: 36000, subtotalInitial: 1620000000, subtotalAdjusted: 1620000000 }
    ];
  }
  if (baNo.includes("050/BA-HRGA") || (cust === "POS" && period === "May-26")) {
    return [
      { id: "pos_may_mdo1", category: "MDO", area: "Site POS", material: "Mine Development (MDO) - Clearing & Access Road", period: "May-26", unit: "Ha", initialVolume: 250.00, adjustedVolume: 250.00, rate: 15500000, subtotalInitial: 3875000000, subtotalAdjusted: 3875000000 },
      { id: "pos_may_mdo2", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", period: "May-26", unit: "USD/1KM", initialVolume: 93078.84, adjustedVolume: 93078.84, rate: 9450, subtotalInitial: 879595031, subtotalAdjusted: 879595031 }
    ];
  }
  if (baNo.includes("051/BA-POS") || (cust === "POS" && period === "Jun-26")) {
    return [
      { id: "pos_jun_op1", category: "Operating & Mining", area: "WM1", material: "Top Soil", period: "Jun-26", unit: "BCM", initialVolume: 6527.38, adjustedVolume: 6527.38, rate: 60500, subtotalInitial: 394906490, subtotalAdjusted: 394906490 },
      { id: "pos_jun_op2", category: "Operating & Mining", area: "WM1", material: "Saprolite", period: "Jun-26", unit: "WMT", initialVolume: 1102.09, adjustedVolume: 1102.09, rate: 62200, subtotalInitial: 68549998, subtotalAdjusted: 68549998 },
      { id: "pos_jun_op3", category: "Operating & Mining", area: "WM1", material: "Limonite", period: "Jun-26", unit: "WMT", initialVolume: 9307.14, adjustedVolume: 9307.14, rate: 60200, subtotalInitial: 560289828, subtotalAdjusted: 560289828 },
      { id: "pos_jun_op4", category: "Operating & Mining", area: "WM1", material: "Overburden/ Waste", period: "Jun-26", unit: "BCM", initialVolume: 35918.75, adjustedVolume: 35918.75, rate: 59500, subtotalInitial: 2137165625, subtotalAdjusted: 2137165625 },
      { id: "pos_jun_dist1", category: "Over Distance", area: "WM1", material: "Over/Underhaul For OB Removal", period: "Jun-26", unit: "BCM", parentMaterial: "Overburden/ Waste", distanceWeightAvg: 1450, initialVolume: 35918.75, adjustedVolume: 35918.75, rate: 8608, isDistanceVar: true, subtotalInitial: 139145695, subtotalAdjusted: 139145695 },
      { id: "pos_jun_mdo1", category: "MDO", area: "Site POS", material: "Mine Development (MDO) - Clearing & Access Road", period: "Jun-26", unit: "Ha", initialVolume: 2480.00, adjustedVolume: 2480.00, rate: 15500000, subtotalInitial: 38440000000, subtotalAdjusted: 38440000000 },
      { id: "pos_jun_mdo2", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", period: "Jun-26", unit: "USD/1KM", initialVolume: 43379.62, adjustedVolume: 43379.62, rate: 9450, subtotalInitial: 409942364, subtotalAdjusted: 409942364 }
    ];
  }
  if (baNo.includes("052/BA-POS")) {
    return [
      { id: "pos_jul_op1", category: "Operating & Mining", area: "WM1", material: "Top Soil", period: "Jul-26", unit: "BCM", initialVolume: 6527.38, adjustedVolume: 6527.38, rate: 60500, subtotalInitial: 394906490, subtotalAdjusted: 394906490 },
      { id: "pos_jul_op2", category: "Operating & Mining", area: "WM1", material: "Saprolite", period: "Jul-26", unit: "WMT", initialVolume: 1102.09, adjustedVolume: 1102.09, rate: 62200, subtotalInitial: 68549998, subtotalAdjusted: 68549998 },
      { id: "pos_jul_op3", category: "Operating & Mining", area: "WM1", material: "Limonite", period: "Jul-26", unit: "WMT", initialVolume: 9307.14, adjustedVolume: 9307.14, rate: 60200, subtotalInitial: 560289828, subtotalAdjusted: 560289828 },
      { id: "pos_jul_op4", category: "Operating & Mining", area: "WM1", material: "Overburden/ Waste", period: "Jul-26", unit: "BCM", initialVolume: 35918.75, adjustedVolume: 35918.75, rate: 59500, subtotalInitial: 2137165625, subtotalAdjusted: 2137165625 },
      { id: "pos_jul_dist1", category: "Over Distance", area: "WM1", material: "Over/Underhaul For OB Removal", period: "Jul-26", unit: "BCM", parentMaterial: "Overburden/ Waste", distanceWeightAvg: 1450, initialVolume: 35918.75, adjustedVolume: 35918.75, rate: 8608, isDistanceVar: true, subtotalInitial: 139145695, subtotalAdjusted: 139145695 },
      { id: "pos_jul_mdo1", category: "MDO", area: "Site POS", material: "Mine Development (MDO) - Clearing & Access Road", period: "Jul-26", unit: "Ha", initialVolume: 2628.00, adjustedVolume: 2628.00, rate: 15500000, subtotalInitial: 40734000000, subtotalAdjusted: 40734000000 },
      { id: "pos_jul_mdo2", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", period: "Jul-26", unit: "USD/1KM", initialVolume: 43842.42, adjustedVolume: 43842.42, rate: 9450, subtotalInitial: 414310839, subtotalAdjusted: 414310839 }
    ];
  }
  if (baNo.includes("053/BA-POS")) {
    return [
      { id: "pos_p_op1", category: "Operating & Mining", area: "WM1", material: "Top Soil", period: "Jul-26", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 60500, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: "pos_p_op2", category: "Operating & Mining", area: "WM1", material: "Saprolite", period: "Jul-26", unit: "WMT", initialVolume: 0, adjustedVolume: 0, rate: 62200, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: "pos_p_op3", category: "Operating & Mining", area: "WM1", material: "Limonite", period: "Jul-26", unit: "WMT", initialVolume: 0, adjustedVolume: 0, rate: 60200, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: "pos_p_op4", category: "Operating & Mining", area: "WM1", material: "Overburden/ Waste", period: "Jul-26", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 59500, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: "pos_p_dist1", category: "Over Distance", area: "WM1", material: "Over/Underhaul For OB Removal", period: "Jul-26", unit: "BCM", parentMaterial: "Overburden/ Waste", distanceWeightAvg: 1600, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
      { id: "pos_p_mdo1", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", period: "Jul-26", unit: "USD/1KM", initialVolume: 0, adjustedVolume: 0, rate: 9450, subtotalInitial: 0, subtotalAdjusted: 0 }
    ];
  }

  const mapZero = (arr: any[]) => (arr || []).map((it) => ({
    ...it,
    initialVolume: 0,
    adjustedVolume: 0,
    subtotalInitial: 0,
    subtotalAdjusted: 0
  }));

  if (cust === "BGG" || cust === "PT BGG") return mapZero(defaults.defaultBGGBAItems);
  if (cust === "PTRO" || cust === "PT Petrosea") return mapZero(defaults.defaultPTROBAItems || defaults.defaultDBKBAItems || FALLBACK_PTRO_BA_ITEMS);
  if (cust === "DBK") return mapZero(defaults.defaultDBKBAItems || defaults.defaultPTROBAItems || FALLBACK_PTRO_BA_ITEMS);
  if (cust === "SBS") return mapZero(defaults.defaultSBSBAOperatingItems).map((it: any) => ({ ...it, distance: 0, distanceWeightAvg: 0, rate: 0 }));
  return mapZero(defaults.defaultPOSBAOperatingItems);
}
