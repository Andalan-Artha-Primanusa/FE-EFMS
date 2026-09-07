export const FALLBACK_BLANK_PTRO_ITEMS = [
  { id: "ptro_inv_a1", section: "A", description: "OVER BURDEN REMOVAL", unit: "Bcm", volume: 0, unitRateUSD: 1.490, kursBI: 17923.30 },
  { id: "ptro_inv_b1", section: "B", description: "COAL GETTING", unit: "Ton", volume: 0, unitRateUSD: 0.840, kursBI: 17923.30 },
  { id: "ptro_inv_c1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Overhaul OB", unit: "Bcm", volume: 0, overhaulMtr: 1000, baseMtr: 1000, unitRateUSD: 0.028, kursBI: 17923.30 },
  { id: "ptro_inv_c2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Overhaul Coal Getting", unit: "Ton", volume: 0, overhaulMtr: 3000, baseMtr: 3000, unitRateIDR: 230 },
];
export const FALLBACK_BLANK_DBK_ITEMS = FALLBACK_BLANK_PTRO_ITEMS;

export const FALLBACK_BLANK_BGG_ITEMS = [
  { id: "bgg_inv_a1", section: "A", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", unit: "Bcm", volume: 0, unitRateIDR: 29500 },
  { id: "bgg_inv_a2", section: "A", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", unit: "Bcm", volume: 0, unitRateIDR: 28750 },
  { id: "bgg_inv_b1", section: "B", description: "Coal Winning Pit Kungkilan", period: "Jun-26", unit: "Ton", volume: 0, unitRateIDR: 17500 },
  { id: "bgg_inv_c1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Over Distance For OB Removal", unit: "Bcm", volume: 0, overhaulMtr: 1000, unitRateIDR: 155.00 },
  { id: "bgg_inv_c2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Over Distance For Coal Winning", unit: "Ton", volume: 0, overhaulMtr: 4000, unitRateIDR: 19700 },
  { id: "bgg_inv_d1", section: "D", description: "Raise & Fall Factor (BBM)", unit: "Bcm", volume: 0, unitRateIDR: 0 },
  { id: "bgg_inv_e1", section: "E", description: "Discount on Overdistance (Deduction 25%)", amount: 0 },
  { id: "bgg_inv_f1", section: "F", description: "DP Fuel & Transport (Deduction)", amount: 0 },
];

export const FALLBACK_BLANK_SBS_ITEMS = [
  { id: "sbs_inv_a1", section: "A", description: "PIT E - DISPOSAL SEKATAN", unit: "BCM", volume: 0, distanceM: 3100, overhaulMtr: 3100, unitRateIDR: 22654 },
  { id: "sbs_inv_a2", section: "A", description: "PIT E - RENCANA JALAN", unit: "BCM", volume: 0, distanceM: 1350, overhaulMtr: 1350, unitRateIDR: 12638 },
  { id: "sbs_inv_a3", section: "A", description: "PIT E - RENCANA CSA", unit: "BCM", volume: 0, distanceM: 600, overhaulMtr: 600, unitRateIDR: 8346 },
  { id: "sbs_inv_a4", section: "A", description: "PIT E - JALAN BARITO", unit: "BCM", volume: 0, distanceM: 1850, overhaulMtr: 1850, unitRateIDR: 15500 },
  { id: "sbs_inv_a5", section: "A", description: "PIT E - SEKATAN", unit: "BCM", volume: 0, distanceM: 2150, overhaulMtr: 2150, unitRateIDR: 16931 },
  { id: "sbs_inv_a6", section: "A", description: "PIT E - TS MAHONI", unit: "BCM", volume: 0, distanceM: 3100, overhaulMtr: 3100, unitRateIDR: 22654 },
  { id: "sbs_inv_a7", section: "A", description: "PIT E - IPD WARWEFILL", unit: "BCM", volume: 0, distanceM: 600, overhaulMtr: 600, unitRateIDR: 8346 },
  { id: "sbs_inv_a8", section: "A", description: "PIT E - SEKATAN", unit: "BCM", volume: 0, distanceM: 2450, overhaulMtr: 2450, unitRateIDR: 19375 },
  { id: "sbs_inv_b1", section: "B", description: "Dozer CAT D10 - BDCT 1001", unit: "Hours", volume: 0, unitRateIDR: 1980000 },
  { id: "sbs_inv_b2", section: "B", description: "Dozer CAT D10 - BDCT 1002", unit: "Hours", volume: 0, unitRateIDR: 1980000 },
  { id: "sbs_inv_b3", section: "B", description: "Excavator CAT 395 - EXCT 3901", unit: "Hours", volume: 0, unitRateIDR: 1425000 },
  { id: "sbs_inv_b4", section: "B", description: "Excavator CAT 395 - EXCT 3902", unit: "Hours", volume: 0, unitRateIDR: 1425000 },
  { id: "sbs_inv_p1", section: "P", description: "1. Denda Ketidaktercapaian MA", unit: "Lot", volume: 1, unitRateIDR: 0, amount: 0, isDeduction: true },
  { id: "sbs_inv_p2", section: "P", description: "2. Kelebihan Pemakaian BBM Loader (Fuel Ratio)", unit: "Lot", volume: 1, unitRateIDR: 0, amount: 0, isDeduction: true },
  { id: "sbs_inv_p3", section: "P", description: "3. Kelebihan Pemakaian BBM Hauler (Fuel Consumption)", unit: "Lot", volume: 1, unitRateIDR: 0, amount: 0, isDeduction: true },
  { id: "sbs_inv_p4", section: "P", description: "4. Denda Ketidakcapaian Volume", unit: "Lot", volume: 1, unitRateIDR: 0, amount: 0, isDeduction: true },
];

export const FALLBACK_BLANK_POS_ITEMS = [
  { id: "pos_inv_a1", section: "A", description: "Topsoil Removal - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 3.380, volume: 0 },
  { id: "pos_inv_a2", section: "A", description: "Overburden/Waste - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 3.327, volume: 0 },
  { id: "pos_inv_a3", section: "A", description: "Limonite - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 3.363, volume: 0 },
  { id: "pos_inv_a4", section: "A", description: "Saprolite - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 3.472, volume: 0 },
  { id: "pos_inv_a5", section: "A", description: "Clear & Grub", unit: "USD/m2", baseRateUSD: 0.381, volume: 0 },
  { id: "pos_inv_b1", section: "B", description: "Over/Underhaul For OB Removal", unit: "USD/1KM", baseRateUSD: 0.538, volume: 0, overhaulMtr: 1000 },
  { id: "pos_inv_b2", section: "B", description: "Over/Underhaul For Top Soil Removal", unit: "USD/1KM", baseRateUSD: 0.538, volume: 0, overhaulMtr: 1000 },
  { id: "pos_inv_b3", section: "B", description: "Over/Underhaul For Limonite", unit: "USD/1KM", baseRateUSD: 0.526, volume: 0, overhaulMtr: 1000 },
  { id: "pos_inv_b4", section: "B", description: "Over/Underhaul For Saprolite", unit: "USD/1KM", baseRateUSD: 0.526, volume: 0, overhaulMtr: 1000 },
];

export const FALLBACK_BGG_BA_ITEMS = [
  { id: "bgg_op1_feb", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", unit: "BCM", initialVolume: 36168.37, adjustedVolume: 36168.37, rate: 27250, subtotalInitial: 985588083, subtotalAdjusted: 985588083 },
  { id: "bgg_op1_jun", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", unit: "BCM", initialVolume: 121490.00, adjustedVolume: 121490.00, rate: 29500, subtotalInitial: 3583955000, subtotalAdjusted: 3583955000 },
  { id: "bgg_op2_feb", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", unit: "BCM", initialVolume: 12056.12, adjustedVolume: 12056.12, rate: 26500, subtotalInitial: 319487180, subtotalAdjusted: 319487180 },
  { id: "bgg_op2_jun", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", unit: "BCM", initialVolume: 40496.67, adjustedVolume: 40496.67, rate: 28750, subtotalInitial: 1164279263, subtotalAdjusted: 1164279263 },
  { id: "bgg_cw_jun", category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning Pit Kungkilan", period: "Jun-26", unit: "Ton", initialVolume: 46683.48, adjustedVolume: 46683.48, rate: 17500, subtotalInitial: 816960900, subtotalAdjusted: 816960900 },
  { id: "bgg_od_ob_feb", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Feb-26", unit: "BCM", distanceWeightAvg: 1232, initialVolume: 48224.49, adjustedVolume: 48224.49, rate: 1393, isDistanceVar: true, subtotalInitial: 67153575, subtotalAdjusted: 67153575 },
  { id: "bgg_od_ob_jun", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Jun-26", unit: "BCM", distanceWeightAvg: 1239, initialVolume: 161986.66, adjustedVolume: 161986.66, rate: 1550, isDistanceVar: true, subtotalInitial: 251147442, subtotalAdjusted: 251147442 },
  { id: "bgg_od_cw_jun", category: "Over Distance", area: "Pit KKL", material: "Over Distance For Coal Winning", period: "Jun-26", unit: "Ton", distanceWeightAvg: 4582, initialVolume: 46683.48, adjustedVolume: 46683.48, rate: 19700, isDistanceVar: true, subtotalInitial: 919652140, subtotalAdjusted: 919652140 }
];

export const FALLBACK_POS_OPERATING_ITEMS = [
  { id: "ba_op1", category: "Operating & Mining", area: "WM1", material: "Top Soil", unit: "BCM", initialVolume: 2800, adjustedVolume: 2800, rate: 60500, subtotalInitial: 169400000, subtotalAdjusted: 169400000 },
  { id: "ba_op2", category: "Operating & Mining", area: "WM1", material: "Saprolite", unit: "WMT", initialVolume: 650, adjustedVolume: 650, rate: 62200, subtotalInitial: 40430000, subtotalAdjusted: 40430000 },
  { id: "ba_op3", category: "Operating & Mining", area: "WM1", material: "Limonite", unit: "WMT", initialVolume: 4120, adjustedVolume: 4120, rate: 60200, subtotalInitial: 248024000, subtotalAdjusted: 248024000 },
  { id: "ba_op4", category: "Operating & Mining", area: "WM1", material: "Overburden/ Waste", unit: "BCM", initialVolume: 15420.5, adjustedVolume: 15420.5, rate: 59500, subtotalInitial: 917519750, subtotalAdjusted: 917519750 },
  { id: "ba_dist1", category: "Over Distance", area: "WM1", material: "Over/Underhaul For OB Removal", unit: "BCM", parentMaterial: "Overburden/ Waste", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist2", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Top Soil Removal", unit: "BCM", parentMaterial: "Top Soil", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist3", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Limonite", unit: "BCM", parentMaterial: "Limonite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "ba_dist4", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Saprolite", unit: "BCM", parentMaterial: "Saprolite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
];

export const FALLBACK_POS_MDO_ITEMS = [
  { id: "ba_mdo1", category: "MDO", area: "Site POS", material: "Mine Development (MDO) - Clearing & Access Road", unit: "Ha", distanceWeightAvg: 0, initialVolume: 5.5, adjustedVolume: 5.5, rate: 15500000, subtotalInitial: 85250000, subtotalAdjusted: 85250000 },
  { id: "ba_mdo2", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", unit: "USD/1KM", distanceWeightAvg: 0, initialVolume: 1200, adjustedVolume: 1200, rate: 9450, subtotalInitial: 11340000, subtotalAdjusted: 11340000 }
];

export const FALLBACK_SBS_BA_ITEMS = [
  { id: "sbs_ba_a1", category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL SEKATAN", unit: "BCM", distance: 3150, initialVolume: 80114.79, adjustedVolume: 80114.79, rate: 22654, subtotalInitial: 1814920453, subtotalAdjusted: 1814920453 },
  { id: "sbs_ba_a2", category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA JALAN", unit: "BCM", distance: 1400, initialVolume: 23741.16, adjustedVolume: 23741.16, rate: 12638, subtotalInitial: 300040780, subtotalAdjusted: 300040780 },
  { id: "sbs_ba_a3", category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA CSA", unit: "BCM", distance: 650, initialVolume: 442.24, adjustedVolume: 442.24, rate: 8346, subtotalInitial: 3690935, subtotalAdjusted: 3690935 },
  { id: "sbs_ba_a4", category: "Operating & Mining", area: "Pit E", material: "PIT E - JALAN BARITO", unit: "BCM", distance: 1850, initialVolume: 33726.42, adjustedVolume: 33726.42, rate: 15500, subtotalInitial: 522759510, subtotalAdjusted: 522759510 },
  { id: "sbs_ba_a5", category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", unit: "BCM", distance: 2150, initialVolume: 110582.62, adjustedVolume: 110582.62, rate: 16931, subtotalInitial: 1872274339, subtotalAdjusted: 1872274339 },
  { id: "sbs_ba_a6", category: "Operating & Mining", area: "Pit E", material: "PIT E - TS MAHONI", unit: "BCM", distance: 3100, initialVolume: 1536.19, adjustedVolume: 1536.19, rate: 22654, subtotalInitial: 34800848, subtotalAdjusted: 34800848 },
  { id: "sbs_ba_a7", category: "Operating & Mining", area: "Pit E", material: "PIT E - IPD WARWEFILL", unit: "BCM", distance: 700, initialVolume: 3840.48, adjustedVolume: 3840.48, rate: 8346, subtotalInitial: 32052646, subtotalAdjusted: 32052646 },
  { id: "sbs_ba_a8", category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", unit: "BCM", distance: 2650, initialVolume: 1154.75, adjustedVolume: 1154.75, rate: 19375, subtotalInitial: 22373281, subtotalAdjusted: 22373281 }
];

export const FALLBACK_SBS_RENTAL_ITEMS = [
  { id: "sbs_rent_1", category: "Penunjang", area: "Pit E", material: "Bulldozer DZ709", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1980000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_2", category: "Penunjang", area: "Pit E", material: "Bulldozer DZ716", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1980000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_3", category: "Penunjang", area: "Pit E", material: "Excavator EX815", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1425000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_4", category: "Penunjang", area: "Pit E", material: "Excavator EX816", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1425000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_5", category: "Penunjang", area: "Pit E", material: "Excavator EX817", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1425000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_6", category: "Penunjang", area: "Pit E", material: "Motor Grader MG607", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1250000, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_rent_7", category: "Penunjang", area: "Pit E", material: "Motor Grader MG608", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1250000, subtotalInitial: 0, subtotalAdjusted: 0 }
];

export const FALLBACK_SBS_DEDUCTION_ITEMS = [
  { id: "sbs_ded_1", category: "Pengurang Biaya", area: "Pit E", material: "Denda ketidaktercapaian MA", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ded_2", category: "Pengurang Biaya", area: "Pit E", material: "Kelebihan Pemakaian BBM Loader", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ded_3", category: "Pengurang Biaya", area: "Pit E", material: "Kelebihan Pemakaian BBM Hauler", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  { id: "sbs_ded_4", category: "Pengurang Biaya", area: "Pit E", material: "Denda ketidakcapaian Volume", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 }
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
      { id: "pos_p_op1", category: "Operating & Mining", area: "WM1", material: "Top Soil", period: "Jul-26", unit: "BCM", initialVolume: 2800.00, adjustedVolume: 2800.00, rate: 60500, subtotalInitial: 169400000, subtotalAdjusted: 169400000 },
      { id: "pos_p_op2", category: "Operating & Mining", area: "WM1", material: "Saprolite", period: "Jul-26", unit: "WMT", initialVolume: 650.00, adjustedVolume: 650.00, rate: 62200, subtotalInitial: 40430000, subtotalAdjusted: 40430000 },
      { id: "pos_p_op3", category: "Operating & Mining", area: "WM1", material: "Limonite", period: "Jul-26", unit: "WMT", initialVolume: 4120.00, adjustedVolume: 4120.00, rate: 60200, subtotalInitial: 248024000, subtotalAdjusted: 248024000 },
      { id: "pos_p_op4", category: "Operating & Mining", area: "WM1", material: "Overburden/ Waste", period: "Jul-26", unit: "BCM", initialVolume: 15420.50, adjustedVolume: 15420.50, rate: 59500, subtotalInitial: 917519750, subtotalAdjusted: 917519750 },
      { id: "pos_p_dist1", category: "Over Distance", area: "WM1", material: "Over/Underhaul For OB Removal", period: "Jul-26", unit: "BCM", parentMaterial: "Overburden/ Waste", distanceWeightAvg: 1600, initialVolume: 15420.50, adjustedVolume: 15420.50, rate: 8608, isDistanceVar: true, subtotalInitial: 79650144, subtotalAdjusted: 79650144 },
      { id: "pos_p_mdo1", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", period: "Jul-26", unit: "USD/1KM", initialVolume: 44335.51, adjustedVolume: 44335.51, rate: 9450, subtotalInitial: 418970600, subtotalAdjusted: 418970600 }
    ];
  }

  if (cust === "BGG" || cust === "PT BGG") return defaults.defaultBGGBAItems;
  if (cust === "PTRO" || cust === "PT Petrosea") return defaults.defaultPTROBAItems || defaults.defaultDBKBAItems || FALLBACK_PTRO_BA_ITEMS;
  if (cust === "DBK") return defaults.defaultDBKBAItems || defaults.defaultPTROBAItems || FALLBACK_PTRO_BA_ITEMS;
  if (cust === "SBS") return defaults.defaultSBSBAOperatingItems;
  return defaults.defaultPOSBAOperatingItems;
}
