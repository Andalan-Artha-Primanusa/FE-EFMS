import { InvoiceItemGeneratorContext } from "./invoiceItemGenerator";

export function buildBGGInvoiceItemsFromBA(ba: any, ctx: InvoiceItemGeneratorContext): any[] {
  const { rfIndexCalculated = 1.0, demoBGGItems = [], blankBGGItems = [] } = ctx;

  if (ba?.items && Array.isArray(ba.items) && ba.items.length > 0) {
    const invItems: any[] = [];
    const ob1Item = ba.items.find((bi: any) => (bi.material || "").includes("OVER BURDEN REMOVAL 1") || (bi.material || "").includes("75%"));
    const ob2Item = ba.items.find((bi: any) => (bi.material || "").includes("OVER BURDEN REMOVAL 2") || (bi.material || "").includes("25%"));
    const singleOBItem = ba.items.find((bi: any) => {
      const m = (bi.material || "").toLowerCase();
      return (m.includes("over burden") || m.includes("ob removal") || m.includes("overburden")) && !m.includes("distance") && !m.includes("75%") && !m.includes("25%") && !m.includes(" 1") && !m.includes(" 2");
    });
    const obDistItem = ba.items.find((bi: any) => (bi.material || "").toLowerCase().includes("distance") && (bi.material || "").toLowerCase().includes("ob"));
    const coalDistItem = ba.items.find((bi: any) => (bi.material || "").toLowerCase().includes("distance") && (bi.material || "").toLowerCase().includes("coal"));
    const dpFuelItem = ba.items.find((bi: any) => (bi.material || "").toLowerCase().includes("dp fuel") || (bi.category || "").toLowerCase().includes("dp fuel"));

    let ob1Vol = 0;
    let ob2Vol = 0;
    let ob1Rate = 27250;
    let ob2Rate = 26500;
    let totalOB = 0;

    if (ob1Item || ob2Item) {
      ob1Vol = ob1Item ? Number(ob1Item.adjustedVolume ?? ob1Item.initialVolume ?? 0) : 0;
      ob2Vol = ob2Item ? Number(ob2Item.adjustedVolume ?? ob2Item.initialVolume ?? 0) : 0;
      ob1Rate = Number(ob1Item?.rate || 27250);
      ob2Rate = Number(ob2Item?.rate || 26500);
      totalOB = ob1Vol + ob2Vol;
    } else if (singleOBItem) {
      totalOB = Number(singleOBItem.adjustedVolume ?? singleOBItem.initialVolume ?? 0);
      ob1Vol = Math.round(totalOB * 0.75 * 1000) / 1000;
      ob2Vol = Math.round((totalOB - ob1Vol) * 1000) / 1000;
      const baseRate = Number(singleOBItem?.rate || 27250);
      ob1Rate = baseRate;
      ob2Rate = baseRate === 27250 ? 26500 : (baseRate === 29500 ? 28750 : (baseRate === 27000 ? 27000 : baseRate - 750));
    }

    const obDistMtr = Number(ba.bggData?.obInvoiceAvgDist || (obDistItem ? obDistItem.distanceWeightAvg : 0) || (ba.bggData?.obOverDistanceHm ? 1000 + ba.bggData.obOverDistanceHm * 100 : 1324.532));
    const coalDistMtr = Number(ba.bggData?.coalAvgDist || (coalDistItem ? coalDistItem.distanceWeightAvg : 0) || (ba.bggData?.coalOverDistanceM ? 1000 + ba.bggData.coalOverDistanceM : 4975.810));
    const dpFuelVal = dpFuelItem ? Number(dpFuelItem.rate || dpFuelItem.subtotalAdjusted || dpFuelItem.subtotalInitial || dpFuelItem.amount || 0) : 0;

    const cwItem = ba.items.find((bi: any) => (bi.material || "").toLowerCase().includes("coal") && !((bi.material || "").toLowerCase().includes("distance")));
    const totalCoal = cwItem ? Number(cwItem.adjustedVolume ?? cwItem.initialVolume ?? 0) : Number(ba.bggData?.coalVolumeTon || 0);

    invItems.push({
      id: `bgg_inv_a1`,
      section: "A",
      subSection: "A1. Pit Kungkilan",
      description: "OVER BURDEN REMOVAL 1 (75%)",
      sowDescription: "OVER BURDEN REMOVAL 1 (75%)",
      unit: "Bcm",
      volume: ob1Vol,
      unitRateIDR: ob1Rate,
      amount: Math.round(ob1Vol * ob1Rate),
      amountIDR: Math.round(ob1Vol * ob1Rate),
      notes: ba.workPeriod || "-"
    });

    invItems.push({
      id: `bgg_inv_a2`,
      section: "A",
      subSection: "A1. Pit Kungkilan",
      description: "OVER BURDEN REMOVAL 2 (25%)",
      sowDescription: "OVER BURDEN REMOVAL 2 (25%)",
      unit: "Bcm",
      volume: ob2Vol,
      unitRateIDR: ob2Rate,
      amount: Math.round(ob2Vol * ob2Rate),
      amountIDR: Math.round(ob2Vol * ob2Rate),
      notes: ba.workPeriod || "-"
    });

    const cwVol = totalCoal;
    const cwRate = Number(cwItem?.rate || 16500);

    invItems.push({
      id: `bgg_inv_b1`,
      section: "B",
      subSection: "B1. Pit Kungkilan",
      description: "Pit Kungkilan",
      sowDescription: "Coal Winning",
      unit: "Ton",
      volume: cwVol,
      unitRateIDR: cwRate,
      amount: Math.round(cwVol * cwRate),
      amountIDR: Math.round(cwVol * cwRate),
      notes: ba.workPeriod || "-"
    });

    const odOBDiffMtr = Math.max(0, obDistMtr - 1000);
    const odCWDiffMtr = Math.max(0, coalDistMtr - 1000);
    const baseODOBRate = Number(obDistItem?.rate || 600);
    const baseODCWRate = Number(coalDistItem?.rate || 500);
    const odOBRate = odOBDiffMtr > 0 ? Number((baseODOBRate * (odOBDiffMtr / 100)).toFixed(3)) : 0;
    const odCWRate = odCWDiffMtr > 0 ? Number((baseODCWRate * (odCWDiffMtr / 100)).toFixed(3)) : 0;
    const odOBAmt = Math.round(totalOB * odOBRate);
    const odCWAmt = Math.round(cwVol * odCWRate);

    if (odOBAmt > 0 && totalOB > 0) {
      invItems.push({
        id: `bgg_inv_c1`,
        section: "C",
        subSection: "C1. Over Distance For OB Removal",
        description: "Pit Kungkilan",
        sowDescription: "Over Distance For OB Removal",
        unit: "Bcm",
        overhaulMtr: obDistMtr,
        volume: totalOB,
        unitRateIDR: odOBRate,
        amount: odOBAmt,
        amountIDR: odOBAmt,
        notes: `${obDistMtr.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} mtr - 1.000 mtr = ${odOBDiffMtr.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} mtr`
      });
    }

    if (odCWAmt > 0 && cwVol > 0) {
      invItems.push({
        id: `bgg_inv_c2`,
        section: "C",
        subSection: "C2. Over Distance For Coal Winning",
        description: "Pit Kungkilan",
        sowDescription: "Over Distance For Coal Winning",
        unit: "Ton",
        overhaulMtr: coalDistMtr,
        volume: cwVol,
        unitRateIDR: odCWRate,
        amount: odCWAmt,
        amountIDR: odCWAmt,
        notes: `${coalDistMtr.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} mtr - 1.000 mtr = ${odCWDiffMtr.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} mtr`
      });
    }

    const rfIdx = rfIndexCalculated > 0 ? rfIndexCalculated : 1.581;
    const rfFactor = Math.max(0, rfIdx - 1.0);

    const rfBaseOB1 = ob1Rate || 27250;
    const rfBaseOB2 = ob2Rate || 26500;
    const rfBaseCoal = cwRate || 16500;
    const rfBaseODOB = baseODOBRate;
    const rfBaseODCoal = baseODCWRate;

    const rfOB1Rate = Number((rfBaseOB1 * rfFactor).toFixed(3));
    const rfOB2Rate = Number((rfBaseOB2 * rfFactor).toFixed(3));
    const rfOBDistRate = Number((rfBaseODOB * rfFactor * (odOBDiffMtr / 100)).toFixed(3));
    const rfCWRate = Number((rfBaseCoal * rfFactor).toFixed(3));
    const rfCWDistRate = Number((rfBaseODCoal * rfFactor * (odCWDiffMtr / 100)).toFixed(3));

    const rfOB1Amt = Math.round(ob1Vol * rfOB1Rate);
    const rfOB2Amt = Math.round(ob2Vol * rfOB2Rate);
    const rfOBDistAmt = Math.round(totalOB * (rfBaseODOB * rfFactor * (odOBDiffMtr / 100)));
    const rfCWAmt = Math.round(cwVol * (rfBaseCoal * rfFactor));
    const rfCWDistAmt = Math.round(cwVol * (rfBaseODCoal * rfFactor * (odCWDiffMtr / 100)));

    if (rfFactor > 0) {
      invItems.push(
        { id: `bgg_inv_d1_1`, section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", sowDescription: "OVER BURDEN REMOVAL 1 (75%) (RF)", unit: "Bcm", volume: ob1Vol, unitRateIDR: rfOB1Rate, amount: rfOB1Amt, amountIDR: rfOB1Amt, notes: ba.workPeriod || "-" },
        { id: `bgg_inv_d1_2`, section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", sowDescription: "OVER BURDEN REMOVAL 2 (25%) (RF)", unit: "Bcm", volume: ob2Vol, unitRateIDR: rfOB2Rate, amount: rfOB2Amt, amountIDR: rfOB2Amt, notes: ba.workPeriod || "-" },
        { id: `bgg_inv_d2`, section: "D", subSection: "D2. Over Distance For OB Removal", description: "Pit Kungkilan", sowDescription: "Over Distance For OB Removal (RF)", unit: "Bcm", overhaulMtr: obDistMtr, volume: totalOB, unitRateIDR: rfOBDistRate, amount: rfOBDistAmt, amountIDR: rfOBDistAmt, notes: ba.workPeriod || "-" },
        { id: `bgg_inv_d3`, section: "D", subSection: "D3. Coal Winning", description: "Pit Kungkilan", sowDescription: "Coal Winning (RF)", unit: "Ton", volume: cwVol, unitRateIDR: rfCWRate, amount: rfCWAmt, amountIDR: rfCWAmt, notes: ba.workPeriod || "-" },
        { id: `bgg_inv_d4`, section: "D", subSection: "D4. Over Distance For Coal Winning", description: "Pit Kungkilan", sowDescription: "Over Distance For Coal Winning (RF)", unit: "Ton", overhaulMtr: coalDistMtr, volume: cwVol, unitRateIDR: rfCWDistRate, amount: rfCWDistAmt, amountIDR: rfCWDistAmt, notes: ba.workPeriod || "-" }
      );
    }

    if (odOBAmt > 0) {
      invItems.push({ id: `bgg_inv_e1`, section: "E", subSection: "E.1", description: "E.1 Overdistance for OB Removal", sowDescription: "Overdistance for OB Removal (Disc 25%)", unit: "Lot", volume: 0, unitRateIDR: 0, amount: -Math.round(odOBAmt * 0.25), amountIDR: -Math.round(odOBAmt * 0.25), isDeduction: true, notes: "Diskon 25% Over Distance OB" });
    }
    if (odCWAmt > 0) {
      invItems.push({ id: `bgg_inv_e2`, section: "E", subSection: "E.2", description: "E.2 Overdistance for Coal Winning", sowDescription: "Overdistance for Coal Winning (Disc 25%)", unit: "Lot", volume: 0, unitRateIDR: 0, amount: -Math.round(odCWAmt * 0.25), amountIDR: -Math.round(odCWAmt * 0.25), isDeduction: true, notes: "Diskon 25% Over Distance Coal" });
    }
    if (rfOBDistAmt > 0) {
      invItems.push({ id: `bgg_inv_e3`, section: "E", subSection: "E.3", description: "E.3 Raise & Fall's Overdistance for OB Removal", sowDescription: "R&F Overdistance for OB (Disc 25%)", unit: "Lot", volume: 0, unitRateIDR: 0, amount: -Math.round(rfOBDistAmt * 0.25), amountIDR: -Math.round(rfOBDistAmt * 0.25), isDeduction: true, notes: "Diskon 25% RF Over Distance OB" });
    }
    if (rfCWDistAmt > 0) {
      invItems.push({ id: `bgg_inv_e4`, section: "E", subSection: "E.4", description: "E.4 Raise & Fall's Overdistance for Coal Winning", sowDescription: "R&F Overdistance for Coal (Disc 25%)", unit: "Lot", volume: 0, unitRateIDR: 0, amount: -Math.round(rfCWDistAmt * 0.25), amountIDR: -Math.round(rfCWDistAmt * 0.25), isDeduction: true, notes: "Diskon 25% RF Over Distance Coal" });
    }

    if (dpFuelVal > 0) {
      invItems.push({
        id: `bgg_inv_f1`,
        section: "F",
        subSection: "F.1",
        description: `F.1 DP Fuel & Transport (Pengurang Solar BGG ${ba.workPeriod || ""})`,
        sowDescription: "DP Fuel & Transport",
        unit: "Lot",
        volume: 0,
        unitRateIDR: 0,
        amount: -Math.abs(dpFuelVal),
        amountIDR: -Math.abs(dpFuelVal),
        isDeduction: true,
        notes: "Potongan DP Fuel & Transport"
      });
    }

    // Append any additional custom items added to BA Tracker
    const standardIds = new Set([ob1Item?.id, ob2Item?.id, obDistItem?.id, coalDistItem?.id, cwItem?.id, dpFuelItem?.id]);
    const customBAItems = ba.items.filter((bi: any) => bi && !standardIds.has(bi.id) && (bi.isCustom || bi.section || bi.material));

    customBAItems.forEach((cItem: any, cIdx: number) => {
      const vol = Number(cItem.adjustedVolume ?? cItem.initialVolume ?? 1);
      const rate = Number(cItem.rate || 0);
      const isDed = cItem.isDeduction || cItem.category === "DP Fuel" || cItem.category === "Discount" || cItem.section === "E" || cItem.section === "F";
      const amt = isDed ? -Math.abs(rate !== 0 ? vol * rate : (cItem.subtotalAdjusted || cItem.subtotalInitial || 0)) : Math.round(vol * rate);
      const sec = cItem.section || (isDed ? "F" : "A");

      invItems.push({
        id: cItem.id || `bgg_custom_inv_${cIdx}`,
        section: sec,
        subSection: `${sec}. Add-on / Variabel Tambahan`,
        description: cItem.material || cItem.description || "Variabel SOW Tambahan",
        sowDescription: cItem.material || "Variabel SOW Tambahan",
        unit: cItem.unit || (isDed ? "Lot" : "BCM"),
        volume: vol,
        unitRateIDR: rate,
        amount: amt,
        amountIDR: amt,
        isDeduction: isDed,
        notes: cItem.notes || ba.workPeriod || "-"
      });
    });

    return invItems;
  }
  return (blankBGGItems && blankBGGItems.length > 0 ? blankBGGItems : []).map(i => ({ ...i }));
}
