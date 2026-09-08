import { getSBSTarifByDistance } from "./calculations";
import { buildBGGInvoiceItemsFromBA } from "./invoiceItemGeneratorBGG";

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
}

export function buildInvoiceItemsFromBA(
  ba: any,
  custCode?: string,
  category: "Operation & Mining" | "MDO" = "Operation & Mining",
  ctx: InvoiceItemGeneratorContext = {}
): any[] {
  const code = custCode || ba?.customerCode || "";
  const {
    baRows = [],
    baMDOItems = [],
    latestKursBI = 17923.30,
    rfIndexCalculated = 1.0,
    demoBGGItems = [],
    demoPTROItems = [],
    demoDBKItems = [],
    blankSBSItems = [],
    demoSBSItems = []
  } = ctx;

  // 1. POS/IBP/BBA MDO (Mine Development Operation)
  if ((code === "POS" || code === "IBP" || code === "BBA") && category === "MDO") {
    const mdo1 = ba?.items?.find((i: any) => (i.material || "").toLowerCase().includes("mine dev") || (i.material || "").toLowerCase().includes("mdo")) || baMDOItems?.[0];
    const mdo2 = ba?.items?.find((i: any) => (i.material || "").toLowerCase().includes("rock") || (i.material || "").toLowerCase().includes("konstruksi")) || baMDOItems?.[1];

    const vol1 = mdo1?.adjustedVolume > 0 ? mdo1.adjustedVolume : (mdo1?.initialVolume || mdo1?.volume || 5.5);
    const vol2 = mdo2?.adjustedVolume > 0 ? mdo2.adjustedVolume : (mdo2?.initialVolume || mdo2?.volume || 1200);

    return [
      { id: "MDO_1", section: "A", code: "MDO1", description: "Mine Development (MDO Cut & Fill & Access Road)", volume: vol1, unit: "Ha", baseRateUSD: 0, unitRateIDR: 15500000 },
      { id: "MDO_2", section: "A", code: "MDO2", description: "Rocks for construction - under/overhaul", volume: vol2, unit: "USD/1KM", baseRateUSD: 0.526, unitRateIDR: 9450 }
    ];
  }

  // 2. POS/IBP/BBA Facility / Backcharge / Non-Mining
  const isPOSFacility = (code === "POS" || code === "IBP" || code === "BBA") && ((ba?.jobType || "").toLowerCase().includes("mess") || (ba?.jobType || "").toLowerCase().includes("mob") || (ba?.jobType || "").toLowerCase().includes("facility") || (ba?.invoiceNo || "").toLowerCase().includes("bc-"));
  if (isPOSFacility) {
    const gross = Number(ba.revenueGross || ba.workAmount || 2313397963);
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

  // 3. POS Standard Production
  if (code === "POS" || code === "IBP" || code === "BBA") {
    if (ba?.items && Array.isArray(ba.items) && ba.items.length > 0) {
      const posItems: any[] = [];
      ba.items.forEach((bi: any, idx: number) => {
        const isDist = bi.isDistanceVar || bi.category === "Over Distance";
        const vol = Number(bi.adjustedVolume ?? bi.initialVolume ?? 0);
        const overhaulMtr = Number(bi.distanceWeightAvg ?? 1000);
        const rate = Number(bi.rate || bi.unitRateIDR || 0);
        // Omit distance items if amount is 0 (vol == 0, distance <= 1000, or rate == 0)
        if (isDist && (vol <= 0 || overhaulMtr <= 1000 || rate <= 0)) {
          return;
        }
        posItems.push({
          id: bi.id || `pos_inv_${idx}`,
          section: isDist ? "B" : "A",
          code: bi.code || `POS_${idx}`,
          description: bi.material || bi.description || "Pekerjaan Penambangan POS",
          unit: bi.unit || "BCM",
          volume: vol,
          overhaulMtr: isDist ? overhaulMtr : 1000,
          baseRateUSD: bi.baseRateUSD || 0,
          unitRateIDR: rate,
        });
      });
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
      const kurs = latestKursBI || 17923.30;
      itemsToProcess.forEach((bi: any, idx: number) => {
        const mLow = (bi.material || bi.sowDescription || "").toLowerCase();
        const isDist = bi.isDistanceVar || bi.category === "Over Distance" || mLow.includes("overhaul") || mLow.includes("distance");
        const isCoal = mLow.includes("coal") || mLow.includes("batubara");
        const vol = Number(bi.adjustedVolume ?? bi.initialVolume ?? 0);

        if (isDist) {
          const baseM = isCoal ? 3000 : 1000;
          const curMtr = Number(bi.distanceWeightAvg ?? baseM);
          const diff = Math.max(0, curMtr - baseM);
          const usdRate = bi.rateUSD || 0.028;
          const idrRate = bi.rateIDR || bi.rate || 230;
          const amt = !isCoal 
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
            unit: isCoal ? "Ton" : "Bcm",
            volume: vol,
            overhaulMtr: curMtr,
            baseMtr: baseM,
            unitRateUSD: !isCoal ? usdRate : undefined,
            unitRateIDR: isCoal ? idrRate : undefined,
            kursBI: !isCoal ? kurs : undefined,
            amount: amt,
            amountIDR: amt,
            notes: bi.notes || bi.keterangan || ""
          });
        } else if (isCoal) {
          const usdRate = bi.rateUSD || 0.840;
          invItems.push({
            id: bi.id || `ptro_inv_b_${idx}`,
            section: "B",
            description: bi.material || "COAL GETTING",
            sowDescription: "COAL GETTING",
            unit: "Ton",
            volume: vol,
            unitRateUSD: usdRate,
            kursBI: kurs,
            amount: Math.round(vol * usdRate * kurs),
            amountIDR: Math.round(vol * usdRate * kurs),
            notes: bi.notes || bi.keterangan || ""
          });
        } else {
          const usdRate = bi.rateUSD || 1.490;
          invItems.push({
            id: bi.id || `ptro_inv_a_${idx}`,
            section: "A",
            description: bi.material || "OVER BURDEN REMOVAL",
            sowDescription: "OVER BURDEN REMOVAL",
            unit: "Bcm",
            volume: vol,
            unitRateUSD: usdRate,
            kursBI: kurs,
            amount: Math.round(vol * usdRate * kurs),
            amountIDR: Math.round(vol * usdRate * kurs),
            notes: bi.notes || bi.keterangan || ""
          });
        }
      });
      return invItems;
    }
    return (demoPTROItems.length > 0 ? demoPTROItems : demoDBKItems).map(i => ({ ...i }));
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
          invItems.push({
            id: bi.id || `sbs_inv_p_${idx}`,
            section: "P",
            description: bi.material || bi.description,
            unit: bi.unit || "Lot",
            amount: -Math.abs(amt),
            amountIDR: -Math.abs(amt),
            isDeduction: true,
            notes: bi.notes || bi.period || ba.workPeriod || "-"
          });
          return;
        }
        const unit = (bi.unit || "BCM").trim();
        const matLower = (bi.material || bi.description || "").toLowerCase();
        const isHours = unit.toLowerCase().includes("hour") || unit.toLowerCase() === "jam" || matLower.includes("dozer") || matLower.includes("excavator") || matLower.includes("grader");
        const section = isHours ? "B" : "A";
        const vol = Number(bi.adjustedVolume ?? bi.initialVolume ?? bi.volume ?? 0);
        const dist = Number(bi.distanceM ?? bi.distance ?? bi.distanceWeightAvg ?? 0);
        let rate = Number(bi.rate || bi.unitRateIDR || 0);
        if (section === "A" && dist > 0) {
          const bracketTarif = getSBSTarifByDistance(dist);
          if (bracketTarif.rate > 0) rate = bracketTarif.rate;
        } else if (section === "B" && rate === 0) {
          if (matLower.includes("d10") || matLower.includes("dozer")) rate = 1980000;
          else if (matLower.includes("395") || matLower.includes("excavator")) rate = 1425000;
        }
        invItems.push({
          id: bi.id || `sbs_inv_${section.toLowerCase()}_${idx}`,
          section,
          description: bi.material || bi.description || bi.sowDescription || `Pekerjaan SBS ${idx + 1}`,
          sowDescription: bi.material || bi.description || bi.sowDescription || `Pekerjaan SBS ${idx + 1}`,
          unit: isHours ? "Hours" : "BCM",
          volume: vol,
          distanceM: dist,
          distance: dist,
          unitRateIDR: rate,
          amount: Math.round(vol * rate),
          amountIDR: Math.round(vol * rate),
          notes: bi.notes || bi.period || ba.workPeriod || "-"
        });
      });

      if (!invItems.some(i => i.section === "P")) {
        const sbsDeductions = (blankSBSItems.length > 0 ? blankSBSItems : demoSBSItems).filter((it: any) => it.section === "P");
        sbsDeductions.forEach((d: any) => {
          invItems.push({ ...d });
        });
      }

      return invItems;
    }
    return (demoSBSItems.length > 0 ? demoSBSItems : blankSBSItems).map(i => ({ ...i }));
  }

  return [];
}
