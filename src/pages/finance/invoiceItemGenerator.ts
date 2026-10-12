import { getSBSTarifByDistance } from "./calculations";
import { buildBGGInvoiceItemsFromBA } from "./invoiceItemGeneratorBGG";
import { getBAEffectiveVolume, isOBMaterial } from "./ba_calculations";
import { ptroContractRates } from "./masterRegistry";

export interface InvoiceItemGeneratorContext {
  baRows?: any[];
  baMDOItems?: any[];
  latestKursBI?: number;
  rfIndexCalculated?: number;
  demoBGGItems?: any[];
  demoPTROItems?: any[];
  demoDBKItems?: any[];
  blankSBSItems?: any[];
  demoSBSItems?: any[];
  blankBGGItems?: any[];
  blankPTROItems?: any[];
  blankPOSItems?: any[];
}

// Item BA kategori Mine Development (MDO); sama dengan isMDOItem di BE.
const isMDOItem = (bi: any) =>
  [bi?.category, bi?.material].some((s) => /mdo|mine dev/i.test(s || ""));

export function buildInvoiceItemsFromBA(
  ba: any,
  custCode?: string,
  category: "Operation & Mining" | "MDO" = "Operation & Mining",
  ctx: InvoiceItemGeneratorContext = {}
): any[] {
  const code = custCode || ba?.customerCode || "";
  const {
    baRows = [],
    latestKursBI = 0,
    rfIndexCalculated = 1.0,
    demoBGGItems = [],
    demoPTROItems = [],
    demoDBKItems = [],
    blankSBSItems = [],
    demoSBSItems = [],
    blankBGGItems = [],
    blankPTROItems = [],
    blankPOSItems = []
  } = ctx;

  // 1. POS/IBP/BBA MDO tanpa item MDO di BA: template kosong (item MDO diproses di blok 3).
  if ((code === "POS" || code === "IBP" || code === "BBA") && category === "MDO" &&
    !(ba?.items || []).some(isMDOItem)) {
    return [
      { id: "MDO_1", section: "A", code: "MDO1", description: "Mine Development (MDO Cut & Fill & Access Road)", volume: 0, unit: "Ha", baseRateUSD: 0, unitRateIDR: 0, amount: 0, amountIDR: 0 },
      { id: "MDO_2", section: "A", code: "MDO2", description: "Rocks for construction - under/overhaul", volume: 0, unit: "USD/1KM", baseRateUSD: 0, unitRateIDR: 0, amount: 0, amountIDR: 0 }
    ];
  }

  // 2. POS/IBP/BBA Facility / Backcharge / Non-Mining
  const isPOSFacility = (code === "POS" || code === "IBP" || code === "BBA") && ((ba?.jobType || "").toLowerCase().includes("mess") || (ba?.jobType || "").toLowerCase().includes("mob") || (ba?.jobType || "").toLowerCase().includes("facility") || (ba?.invoiceNo || "").toLowerCase().includes("bc-"));
  if (isPOSFacility) {
    const gross = Number(ba.revenueGross || ba.workAmount || 0);
    const vol = Number(ba.volume || 1);
    const rate = Number(ba.rate || (vol > 0 ? Math.round(gross / vol) : gross));
    return [
      {
        id: "pos_inv_fac_1",
        section: "A",
        code: "A1",
        description: ba.jobType || "Mess Facility Construction / Backcharge Claim",
        volume: vol,
        unit: ba.volumeUnit || "Unit",
        baseRateUSD: 0,
        unitRateIDR: rate,
        amount: gross,
        amountIDR: gross
      }
    ];
  }

  // 3. POS Standard Production (Operation & Mining / MDO)
  if (code === "POS" || code === "IBP" || code === "BBA") {
    if (ba?.items && Array.isArray(ba.items) && ba.items.length > 0) {
      const isMDOCat = category === "MDO";
      const itemsToUse = ba.items.filter((bi: any) => isMDOItem(bi) === isMDOCat);

      const posItems: any[] = [];
      let gross = 0;
      itemsToUse.forEach((bi: any, idx: number) => {
        const mat = (bi.material || bi.description || "").toLowerCase();
        const cat = (bi.category || "").toLowerCase();
        const isDed = bi.isDeduction || cat === "pengurang biaya" || cat === "pengurang pembayaran" || cat === "dp fuel" ||
          ["dp fuel", "denda", "pengurang solar", "potongan solar"].some((k) => mat.includes(k));
        const isDist = !isDed && (bi.isDistanceVar || cat.includes("distance") || mat.includes("overhaul") || mat.includes("underhaul"));
        const vol = getBAEffectiveVolume(bi, itemsToUse, true);
        const overhaulMtr = Number(bi.distanceWeightAvg || bi.distanceM || 0);
        const baseMtr = Number(bi.distanceBasis || 1000);
        const rate = Number(bi.rate || bi.unitRateIDR || 0);
        // Over/underhaul hanya ditagih bila jarak berbeda dari basis (underhaul = pengurang, sama dengan BA).
        if (isDist && (vol <= 0 || !overhaulMtr || overhaulMtr === baseMtr || rate <= 0)) {
          return;
        }
        const amt = isDed
          ? -Math.abs(Number(bi.subtotalAdjusted || bi.subtotalInitial || Math.round(vol * rate)))
          : isDist
            ? Math.round(vol * ((overhaulMtr - baseMtr) / 1000) * rate)
            : Math.round(vol * rate);
        if (!isDed) gross += amt;

        posItems.push({
          id: bi.id || `pos_inv_${idx}`,
          section: isDed ? "E" : isDist ? "B" : "A",
          isDeduction: isDed,
          baseMtr: isDist ? baseMtr : 0,
          code: bi.code || `POS_${idx}`,
          description: bi.material || bi.description || (isMDOCat ? "Pekerjaan Mine Development POS" : "Pekerjaan Penambangan POS"),
          sowDescription: bi.material || bi.description || (isMDOCat ? "Pekerjaan Mine Development POS" : "Pekerjaan Penambangan POS"),
          unit: bi.unit || (isMDOCat ? "Ha" : "BCM"),
          volume: vol,
          overhaulMtr: isDist ? overhaulMtr : 1000,
          baseRateUSD: bi.baseRateUSD || 0,
          unitRateIDR: rate,
          amount: amt,
          amountIDR: amt,
          notes: bi.notes || bi.keterangan || ba?.workPeriod || "-"
        });
      });

      // Raise & Fall: indeks RF BA dikalikan ke pendapatan kotor (sama dengan generator BE).
      const rf = Number(ba?.posData?.posRfIndex || 1);
      if (rf > 0 && rf !== 1 && gross > 0) {
        const rfAmt = Math.round(gross * rf) - gross;
        const desc = `Raise & Fall (Indeks RF ${rf.toFixed(3)})`;
        posItems.push({ id: "pos_rf_auto", section: "D", code: "RF", category: "Raise & Fall", description: desc, sowDescription: desc, unit: "Lot", volume: 1, unitRateIDR: rfAmt, amount: rfAmt, amountIDR: rfAmt, isDeduction: rfAmt < 0 });
      }
      // DP Fuel (biaya solar aktual) dipotong di invoice OP bila BA tidak memuat item potongan.
      const fuelCost = Number(ba?.posData?.actualFuelCost || 0);
      if (!isMDOCat && fuelCost > 0 && !posItems.some((p) => p.isDeduction)) {
        posItems.push({ id: "pos_dp_fuel_auto", section: "E", code: "E1", category: "DP Fuel", description: "DP Fuel & Transport (Pengurang Solar)", sowDescription: "DP Fuel & Transport (Pengurang Solar)", unit: "Lot", volume: 1, unitRateIDR: fuelCost, amount: -fuelCost, amountIDR: -fuelCost, isDeduction: true });
      }
      return posItems;
    }
  }

  // 4. BGG Customer
  if (code === "BGG" || code === "PT BGG") {
    return buildBGGInvoiceItemsFromBA(ba, ctx);
  }

  // 5. DBK / PTRO Customer
  if (code === "DBK" || code === "PTRO") {
    const sourceBA = (ba?.items && ba.items.length > 0) ? ba : baRows?.find((b: any) => b.baNumber === ba?.baNoReference || b.baNumber === ba?.baNumber || b.id === ba?.baID);
    const itemsToProcess = sourceBA?.items && Array.isArray(sourceBA.items) && sourceBA.items.length > 0 ? sourceBA.items : ba?.items;

    if (itemsToProcess && Array.isArray(itemsToProcess) && itemsToProcess.length > 0) {
      const invItems: any[] = [];
      const kurs = latestKursBI || 0;
      itemsToProcess.forEach((bi: any, idx: number) => {
        const mLow = (bi.material || bi.sowDescription || bi.description || "").toLowerCase();
        const isDist = bi.isDistanceVar || bi.category === "Over Distance" || mLow.includes("overhaul") || mLow.includes("distance");
        const isCoal = mLow.includes("coal") || mLow.includes("batubara");
        const isOB = isOBMaterial(mLow);
        const vol = getBAEffectiveVolume(bi, itemsToProcess, true);

        if (isDist) {
          const baseM = isCoal ? 3000 : 1000;
          const curMtr = Number(bi.distanceWeightAvg ?? baseM);
          const diff = Math.max(0, curMtr - baseM);
          const usdRate = bi.rateUSD || (bi.isUSD ? bi.rate : 0.028);
          const idrRate = bi.rateIDR || bi.rate || 230;
          const isUSD = bi.isUSD || !isCoal;
          const amt = isUSD 
            ? Math.round(vol * (diff / 100) * usdRate * kurs)
            : Math.round(vol * (diff / 100) * idrRate);

          if (amt <= 0 || vol <= 0 || diff <= 0) {
            return; // Omit 0 rupiah overdistance
          }

          invItems.push({
            id: bi.id || `ptro_inv_c_${idx}`,
            section: "C",
            subSection: !isCoal ? "C1. Over Distance For OB Removal" : "C2. Over Distance For Coal Winning",
            description: bi.material || (isCoal ? "Overhaul Coal Getting (>3000m)" : "Overhaul OB (>1000m)"),
            sowDescription: bi.material || (isCoal ? "Overhaul Coal Getting (>3000m)" : "Overhaul OB (>1000m)"),
            unit: bi.unit || (isCoal ? "Ton" : "Bcm"),
            volume: vol,
            overhaulMtr: curMtr,
            baseMtr: baseM,
            unitRateUSD: isUSD ? usdRate : undefined,
            unitRateIDR: !isUSD ? idrRate : Number((usdRate * kurs).toFixed(3)),
            kursBI: isUSD ? kurs : undefined,
            amount: amt,
            amountIDR: amt,
            notes: bi.notes || bi.keterangan || ""
          });
        } else if (isCoal) {
          const usdRate = bi.rateUSD || (bi.isUSD ? bi.rate : ptroContractRates(ba.customerCode).cgRateUSD);
          const rateIDR = bi.rateIDR || bi.rate || Number((usdRate * kurs).toFixed(3));
          const amt = Number(bi.subtotalAdjusted || bi.subtotalInitial || Math.round(vol * usdRate * kurs));
          invItems.push({
            id: bi.id || `ptro_inv_b_${idx}`,
            section: "B",
            description: bi.material || "COAL GETTING",
            sowDescription: bi.material || "COAL GETTING",
            unit: bi.unit || "Ton",
            volume: vol,
            unitRateUSD: usdRate,
            unitRateIDR: rateIDR,
            kursBI: kurs,
            amount: amt,
            amountIDR: amt,
            notes: bi.notes || bi.keterangan || ""
          });
        } else if (isOB) {
          const usdRate = bi.rateUSD || (bi.isUSD ? bi.rate : ptroContractRates(ba.customerCode).obRateUSD);
          const rateIDR = bi.rateIDR || bi.rate || Number((usdRate * kurs).toFixed(3));
          const amt = Number(bi.subtotalAdjusted || bi.subtotalInitial || Math.round(vol * usdRate * kurs));
          invItems.push({
            id: bi.id || `ptro_inv_a_${idx}`,
            section: "A",
            description: bi.material || "OVER BURDEN REMOVAL",
            sowDescription: bi.material || "OVER BURDEN REMOVAL",
            unit: bi.unit || "Bcm",
            volume: vol,
            unitRateUSD: usdRate,
            unitRateIDR: rateIDR,
            kursBI: kurs,
            amount: amt,
            amountIDR: amt,
            notes: bi.notes || bi.keterangan || ""
          });
        } else {
          const isUSD = bi.isUSD || bi.rateUSD > 0;
          const usdRate = bi.rateUSD || 0;
          const rateIDR = bi.rate || bi.unitRateIDR || (isUSD ? Number((usdRate * kurs).toFixed(3)) : 0);
          const amt = Number(bi.subtotalAdjusted || bi.subtotalInitial || Math.round(vol * rateIDR));
          invItems.push({
            id: bi.id || `ptro_inv_custom_${idx}`,
            section: bi.section || "A",
            description: bi.material || bi.description || "Pekerjaan Penunjang",
            sowDescription: bi.material || bi.description || "Pekerjaan Penunjang",
            unit: bi.unit || "Unit",
            volume: vol,
            unitRateUSD: isUSD ? usdRate : undefined,
            unitRateIDR: rateIDR,
            kursBI: isUSD ? kurs : undefined,
            amount: amt,
            amountIDR: amt,
            notes: bi.notes || bi.keterangan || ""
          });
        }
      });
      return invItems;
    }
    return (blankPTROItems && blankPTROItems.length > 0 ? blankPTROItems : []).map(i => ({ ...i }));
  }

  // 6. SBS Customer
  if (code === "SBS") {
    const sourceBA = (ba?.items && ba.items.length > 0) ? ba : baRows?.find((b: any) => b.baNumber === ba?.baNoReference || b.baNumber === ba?.baNumber || b.id === ba?.baID);
    const itemsToProcess = sourceBA?.items && Array.isArray(sourceBA.items) && sourceBA.items.length > 0 ? sourceBA.items : ba?.items;

    if (itemsToProcess && Array.isArray(itemsToProcess) && itemsToProcess.length > 0) {
      const invItems: any[] = [];
      itemsToProcess.forEach((bi: any, idx: number) => {
        if (bi.category === "Pengurang Biaya" || bi.category === "Pengurang Pembayaran" || bi.isDeduction) {
          const amt = Number(bi.rate || bi.subtotalAdjusted || bi.subtotalInitial || bi.amount || 0);
          if (amt !== 0) {
            invItems.push({
              id: bi.id || `sbs_inv_p_${idx}`,
              section: "P",
              description: bi.material || bi.description,
              sowDescription: bi.material || bi.description,
              unit: bi.unit || "Lot",
              amount: -Math.abs(amt),
              amountIDR: -Math.abs(amt),
              isDeduction: true,
              notes: bi.notes || bi.period || ba.workPeriod || "-"
            });
          }
          return;
        }
        const unit = (bi.unit || "BCM").trim();
        const matLower = (bi.material || bi.description || "").toLowerCase();
        const isHours = unit.toLowerCase().includes("hour") || unit.toLowerCase() === "jam" || matLower.includes("dozer") || matLower.includes("excavator") || matLower.includes("grader") || bi.category === "Penunjang";
        const section = isHours ? "B" : "A";
        const vol = getBAEffectiveVolume(bi, itemsToProcess, true);
        const dist = Number(bi.distanceM ?? bi.distance ?? bi.distanceWeightAvg ?? 0);
        let rate = Number(bi.rate || bi.unitRateIDR || 0);
        if (section === "A" && dist > 0 && rate === 0) {
          const bracketTarif = getSBSTarifByDistance(dist);
          if (bracketTarif.rate > 0) rate = bracketTarif.rate;
        }
        const amt = Number(bi.subtotalAdjusted || bi.subtotalInitial || Math.round(vol * rate));
        invItems.push({
          id: bi.id || `sbs_inv_${section.toLowerCase()}_${idx}`,
          section,
          description: bi.material || bi.description || bi.sowDescription || `Pekerjaan SBS ${idx + 1}`,
          sowDescription: bi.material || bi.description || bi.sowDescription || `Pekerjaan SBS ${idx + 1}`,
          unit: isHours ? "Hours" : (unit || "BCM"),
          volume: vol,
          distanceM: dist,
          distance: dist,
          unitRateIDR: rate,
          amount: amt,
          amountIDR: amt,
          notes: bi.notes || bi.period || ba.workPeriod || "-"
        });
      });

      return invItems;
    }
    return (blankSBSItems && blankSBSItems.length > 0 ? blankSBSItems : []).map(i => ({ ...i }));
  }

  return [];
}
