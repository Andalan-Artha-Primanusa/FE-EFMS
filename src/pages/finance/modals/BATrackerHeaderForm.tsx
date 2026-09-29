import React from "react";
import { Layers, Calculator, UserCheck } from "lucide-react";
import { MonthPickerInput, matchPeriod } from "../helpers";
import { resolveHOMasterLaborAndCurrency, calculateTripleFactorRF } from "../ba_calculations";

interface BATrackerHeaderFormProps {
  activeBAStep: number;
  setActiveBAStep: (step: number) => void;
  isInlineEditingBA: boolean;
  formData: any;
  setFormData: (data: any) => void;
  baOperatingItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
  baMDOItems: any[];
  setBaMDOItems: React.Dispatch<React.SetStateAction<any[]>>;
  baDeductionItems: any[];
  setBaDeductionItems: React.Dispatch<React.SetStateAction<any[]>>;
  latestKursBI: number;
  user: any;
  rfIndexCalculated?: number;
  coalIndexMaster?: any[];
  fuelPriceUSD?: number;
  laborPriceIDR?: number;
  defaultPOSBAOperatingItems: any[];
  defaultPOSBAMDOItems: any[];
  defaultDBKBAItems: any[];
  defaultPTROBAItems?: any[];
  defaultBGGBAItems?: any[];
  defaultSBSBAOperatingItems: any[];
  defaultSBSBAMDOItems: any[];
  defaultSBSBADeductionItems: any[];
  raiseFallMaster?: any;
  raiseFallMasters?: any[];
  minWageMasters?: any[];
  getBGGActiveCoalTier?: (period?: string) => string;
}

export function BATrackerHeaderForm({
  activeBAStep,
  setActiveBAStep,
  isInlineEditingBA,
  formData,
  setFormData,
  setBaOperatingItems,
  setBaMDOItems,
  setBaDeductionItems,
  latestKursBI,
  user,
  rfIndexCalculated = 1.560,
  coalIndexMaster = [],
  fuelPriceUSD = 1.15,
  laborPriceIDR = 29500,
  defaultPOSBAOperatingItems = [],
  defaultPOSBAMDOItems = [],
  defaultDBKBAItems = [],
  defaultPTROBAItems = [],
  defaultBGGBAItems = [],
  defaultSBSBAOperatingItems = [],
  defaultSBSBAMDOItems = [],
  defaultSBSBADeductionItems = [],
  raiseFallMaster,
  raiseFallMasters = [],
  minWageMasters = [],
  getBGGActiveCoalTier,
}: BATrackerHeaderFormProps) {
  const isCustomerDBK = formData.customerCode === "PTRO" || formData.customerCode === "DBK";
  const isCustomerSBS = formData.customerCode === "SBS";

  return (
    <div className="space-y-3">
      {/* Stepper Navigation Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-[4px] border border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveBAStep(1)}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[3px] transition cursor-pointer ${activeBAStep === 1 ? "bg-[#A57C50] text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
        >
          <Layers size={13} />
          <span>1. SOW Operasi & Volume</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBAStep(2)}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[3px] transition cursor-pointer ${activeBAStep === 2 ? "bg-[#A57C50] text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
        >
          <Calculator size={13} />
          <span>2. Survey & Delta BA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBAStep(3)}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[3px] transition cursor-pointer ${activeBAStep === 3 ? "bg-[#A57C50] text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
        >
          <UserCheck size={13} />
          <span>3. Tanda Tangan & Final</span>
        </button>
      </div>

      {/* Header Info Strip: Customer, Periode, PIC */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px]">
        {isInlineEditingBA ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Customer / Project <span className="text-rose-600">*</span>
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 font-bold focus:border-[#A57C50] outline-none"
                value={formData.customerCode || ""}
                onChange={(e) => {
                  const code = e.target.value;
                  const isBGG = code === "BGG" || code === "PT BGG";
                  const isPOS = code === "POS" || code === "PT POSITION" || code === "PT. POSITION" || code === "PT POS";
                  const isPTRO = code === "PTRO" || code === "PT Petrosea";
                  const isDBK = code === "DBK";
                  const isSBS = code === "SBS";
                  const currentPeriod = formData.workPeriod || "Agustus 2026";
                  
                  if (isPOS) {
                    const matched = (raiseFallMasters || []).find((r: any) => {
                      const rCust = (r.customerCode || "").trim().toUpperCase();
                      return rCust.includes("POS") && matchPeriod(r.period, currentPeriod);
                    });
                    const hoResolved = resolveHOMasterLaborAndCurrency({
                      customerCode: code,
                      period: currentPeriod,
                      raiseFallMasters,
                      minWageMasters,
                      latestKursBI,
                      mRate: Number(latestKursBI || 0),
                    });
                    const fn = Number(matched?.actualFuelFn ?? 0);
                    const ln = Number(matched?.actualLaborLn || hoResolved.laborLn);
                    const xn = Number(matched?.actualMRateXn || hoResolved.currencyXn);
                    const { rfIndex: rf } = calculateTripleFactorRF(fn, ln, xn);
                    setFormData({
                      ...formData,
                      customerCode: code,
                      rfIndexCalculated: rf,
                      posData: {
                        actualFuelFn: fn,
                        actualLaborLn: ln,
                        actualMRateXn: xn,
                        posRfIndex: rf,
                        fuelPeriods: {
                          [currentPeriod]: { actualFuelFn: fn, actualLaborLn: ln, actualMRateXn: xn, posRfIndex: rf }
                        }
                      }
                    });
                  } else if (isPTRO || isDBK) {
                    const matched = (raiseFallMasters || []).find((r: any) => {
                      const rCust = (r.customerCode || "").trim().toUpperCase();
                      return (rCust.includes("PTRO") || rCust.includes("DBK")) && matchPeriod(r.period, currentPeriod);
                    });
                    const currentM = Number(matched?.actualMRateXn || latestKursBI || 0);
                    setFormData({
                      ...formData,
                      customerCode: code,
                      rfIndexCalculated: 1.0,
                      ptroData: {
                        actualMRate: currentM,
                        obRateUSD: 1.490,
                        cgRateUSD: 0.840,
                        odObRateUSD: 0.028,
                        odCgRateIDR: 230,
                        fuelPeriods: {
                          [currentPeriod]: {
                            actualMRate: currentM,
                            obRateUSD: 1.490,
                            cgRateUSD: 0.840,
                            odObRateUSD: 0.028,
                            odCgRateIDR: 230,
                          }
                        }
                      }
                    });
                  } else if (isSBS) {
                    const curSBS = formData.sbsData || {};
                    const newFuelPeriods = { ...(curSBS.fuelPeriods || {}) };
                    if (!newFuelPeriods[currentPeriod]) {
                      newFuelPeriods[currentPeriod] = {
                        dendaMA: 191073864,
                        dendaBBMLoader: 0,
                        dendaBBMHauler: 520428670,
                        dendaVolume: 60674886,
                      };
                    }
                    const activeP = newFuelPeriods[currentPeriod];
                    setFormData({
                      ...formData,
                      customerCode: code,
                      rfIndexCalculated: 1.0,
                      sbsData: {
                        ...curSBS,
                        dendaMA: activeP.dendaMA,
                        dendaBBMLoader: activeP.dendaBBMLoader,
                        dendaBBMHauler: activeP.dendaBBMHauler,
                        dendaVolume: activeP.dendaVolume,
                        fuelPeriods: newFuelPeriods,
                      }
                    });
                  } else if (isBGG) {
                    const matched = (raiseFallMasters || []).find((r: any) => {
                      const rCust = (r.customerCode || "").trim().toUpperCase();
                      return (rCust === "BGG" || !rCust) && matchPeriod(r.period, currentPeriod);
                    });
                    const p1F = Number(matched?.bggFuelP1 ?? 0);
                    const p1T = Number(matched?.bggTransportP1 ?? 0);
                    const p2F = Number(matched?.bggFuelP2 ?? 0);
                    const p2T = Number(matched?.bggTransportP2 ?? 0);
                    const avg = Number(matched?.actualFuelFn || ((p1F + p1T > 0 && p2F + p2T > 0) ? (p1F + p1T + p2F + p2T) / 2 : (p1F + p1T || p2F + p2T || 0)));
                    const rf = Number(matched?.rfIndexResult || (avg > 0 ? Number((0.60 + 0.40 * (avg / 9000)).toFixed(3)) : 1.560));
                    setFormData({
                      ...formData,
                      customerCode: code,
                      rfIndexCalculated: rf,
                      bggData: {
                        bggFuelP1: p1F,
                        bggTransportP1: p1T,
                        bggFuelP2: p2F,
                        bggTransportP2: p2T,
                        bggAvgFn: avg,
                        bggRfIndex: rf,
                        fuelPeriods: {
                          [currentPeriod]: {
                            bggFuelP1: p1F,
                            bggTransportP1: p1T,
                            bggFuelP2: p2F,
                            bggTransportP2: p2T,
                            bggAvgFn: avg,
                            bggRfIndex: rf,
                          }
                        }
                      }
                    });
                  } else {
                    setFormData({ ...formData, customerCode: code });
                  }

                  if (isBGG) {
                    const activeTier = getBGGActiveCoalTier ? getBGGActiveCoalTier(currentPeriod) : "Tier 2";
                    const ob1Rate = activeTier === "Tier 3" ? 29500 : (activeTier === "Tier 1" ? 27000 : 27250);
                    const ob2Rate = activeTier === "Tier 3" ? 28750 : (activeTier === "Tier 1" ? 26250 : 26500);
                    const cwRate = activeTier === "Tier 3" ? 17500 : (activeTier === "Tier 1" ? 15000 : 16500);
                    const odObRate = activeTier === "Tier 3" ? 650 : (activeTier === "Tier 1" ? 500 : 600);
                    const odCwRate = activeTier === "Tier 3" ? 550 : (activeTier === "Tier 1" ? 400 : 500);
                    const bggRows = (defaultBGGBAItems && defaultBGGBAItems.length > 0) ? defaultBGGBAItems : [
                      { id: `bgg_ob1_${Date.now()}`, category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: currentPeriod, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: ob1Rate, subtotalInitial: 0, subtotalAdjusted: 0 },
                      { id: `bgg_ob2_${Date.now() + 1}`, category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: currentPeriod, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: ob2Rate, subtotalInitial: 0, subtotalAdjusted: 0 },
                      { id: `bgg_cw_${Date.now() + 2}`, category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning", period: currentPeriod, notes: "", keterangan: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: cwRate, subtotalInitial: 0, subtotalAdjusted: 0 },
                      { id: `bgg_od_ob_${Date.now() + 3}`, category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: currentPeriod, notes: "", keterangan: "", unit: "BCM", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: odObRate, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
                      { id: `bgg_od_cw_${Date.now() + 4}`, category: "Over Distance", area: "Pit KKL", material: "Over Distance For Coal Winning", period: currentPeriod, notes: "", keterangan: "", unit: "Ton", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: odCwRate, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
                    ];
                    setBaOperatingItems((bggRows || []).map((it: any) => {
                      let r = it.rate;
                      const m = (it.material || "").toUpperCase();
                      if (m.includes("REMOVAL 1") || m.includes("75%")) r = ob1Rate;
                      else if (m.includes("REMOVAL 2") || m.includes("25%")) r = ob2Rate;
                      else if (m.includes("COAL WINNING")) r = cwRate;
                      else if (m.includes("OVER DISTANCE FOR OB")) r = odObRate;
                      else if (m.includes("OVER DISTANCE FOR COAL")) r = odCwRate;
                      return { ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "", rate: r };
                    }));
                    setBaMDOItems([]);
                    setBaDeductionItems([]);
                  } else if (isPTRO || isDBK) {
                    const ptroRows = (defaultPTROBAItems && defaultPTROBAItems.length > 0) ? defaultPTROBAItems : defaultDBKBAItems;
                    setBaOperatingItems((ptroRows || []).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaMDOItems([]);
                    setBaDeductionItems([]);
                  } else if (isSBS) {
                    setBaOperatingItems((defaultSBSBAOperatingItems || []).map((it: any) => ({ ...it, distance: it.distance ?? it.distanceM ?? it.distanceWeightAvg ?? 0, distanceWeightAvg: it.distanceWeightAvg ?? it.distance ?? 0, rate: it.rate || 0, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaMDOItems((defaultSBSBAMDOItems || []).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaDeductionItems((defaultSBSBADeductionItems || []).map((it: any) => ({ ...it, initialVolume: 1, adjustedVolume: 1, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "", material: it.material === "Denda ketidakcapaian Volume" ? `Denda ketidakcapaian Volume ${currentPeriod}` : it.material })));
                  } else {
                    setBaOperatingItems(defaultPOSBAOperatingItems.map(it => ({ ...it, area: "", initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaMDOItems(defaultPOSBAMDOItems.map(it => ({ ...it, area: "", initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0, period: currentPeriod, notes: "", keterangan: "" })));
                    setBaDeductionItems([]);
                  }
                }}
              >
                <option value="POS">POS – PT Position</option>
                <option value="IBP">IBP – PT Indo Bhumi Pasifik</option>
                <option value="BBA">BBA – PT Bara Batubara Aditama</option>
                <option value="SBS">SBS – PT Satria Bahana Sarana</option>
                <option value="BGG">BGG – PT Budi Gema Gempita</option>
                <option value="PTRO">PTRO – PT Petrosea</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Periode Pekerjaan <span className="text-rose-600">*</span>
              </label>
              <MonthPickerInput
                value={formData.workPeriod || ""}
                onChange={(val) => {
                  const custClean = (formData.customerCode || "BGG").trim().toUpperCase();
                  const matched = (raiseFallMasters || []).find((r: any) => {
                    const rCust = (r.customerCode || "").trim().toUpperCase();
                    return (rCust === custClean || (!rCust && custClean === "BGG") || (custClean.includes("POS") && rCust.includes("POS")) || ((custClean.includes("PTRO") || custClean.includes("DBK")) && (rCust.includes("PTRO") || rCust.includes("DBK")))) &&
                      matchPeriod(r.period, val);
                  });

                  setFormData((prev: any) => {
                    if (custClean.includes("POS")) {
                      const curPOS = prev.posData || {};
                      const newFuelPeriods = { ...(curPOS.fuelPeriods || {}) };
                      const hoResolved = resolveHOMasterLaborAndCurrency({
                        customerCode: custClean,
                        period: val,
                        raiseFallMasters,
                        minWageMasters,
                        latestKursBI,
                        mRate: Number(latestKursBI || 0),
                      });
                      const fn = Number(matched?.actualFuelFn ?? newFuelPeriods[val]?.actualFuelFn ?? curPOS.actualFuelFn ?? 0);
                      const ln = Number(matched?.actualLaborLn ?? newFuelPeriods[val]?.actualLaborLn ?? curPOS.actualLaborLn ?? hoResolved.laborLn);
                      const xn = Number(matched?.actualMRateXn ?? newFuelPeriods[val]?.actualMRateXn ?? curPOS.actualMRateXn ?? hoResolved.currencyXn);
                      const { rfIndex: rf } = calculateTripleFactorRF(fn, ln, xn);
                      newFuelPeriods[val] = { actualFuelFn: fn, actualLaborLn: ln, actualMRateXn: xn, posRfIndex: rf };
                      return {
                        ...prev,
                        workPeriod: val,
                        rfIndexCalculated: rf > 0 ? rf : prev.rfIndexCalculated,
                        posData: {
                          ...curPOS,
                          actualFuelFn: fn,
                          actualLaborLn: ln,
                          actualMRateXn: xn,
                          posRfIndex: rf,
                          fuelPeriods: newFuelPeriods,
                        }
                      };
                    } else if (custClean.includes("PTRO") || custClean.includes("DBK")) {
                      const curPTRO = prev.ptroData || {};
                      const newFuelPeriods = { ...(curPTRO.fuelPeriods || {}) };
                      const currentM = Number(matched?.actualMRateXn || newFuelPeriods[val]?.actualMRate || curPTRO.actualMRate || latestKursBI || 0);
                      newFuelPeriods[val] = {
                        actualMRate: currentM,
                        obRateUSD: 1.490,
                        cgRateUSD: 0.840,
                        odObRateUSD: 0.028,
                        odCgRateIDR: 230,
                      };
                      return {
                        ...prev,
                        workPeriod: val,
                        rfIndexCalculated: 1.0,
                        ptroData: {
                          ...curPTRO,
                          actualMRate: currentM,
                          fuelPeriods: newFuelPeriods,
                        }
                      };
                    } else if (custClean.includes("SBS")) {
                      const curSBS = prev.sbsData || {};
                      const newFuelPeriods = { ...(curSBS.fuelPeriods || {}) };
                      if (!newFuelPeriods[val]) {
                        newFuelPeriods[val] = {
                          dendaMA: curSBS.dendaMA || 0,
                          dendaBBMLoader: curSBS.dendaBBMLoader || 0,
                          dendaBBMHauler: curSBS.dendaBBMHauler || 0,
                          dendaVolume: curSBS.dendaVolume || 0,
                        };
                      }
                      const activeP = newFuelPeriods[val];
                      return {
                        ...prev,
                        workPeriod: val,
                        rfIndexCalculated: 1.0,
                        sbsData: {
                          ...curSBS,
                          dendaMA: activeP.dendaMA,
                          dendaBBMLoader: activeP.dendaBBMLoader,
                          dendaBBMHauler: activeP.dendaBBMHauler,
                          dendaVolume: activeP.dendaVolume,
                          fuelPeriods: newFuelPeriods,
                        }
                      };
                    } else {
                      // BGG / default
                      const curBgg = prev.bggData || {};
                      const newFuelPeriods = { ...(curBgg.fuelPeriods || {}) };
                      const p1F = Number(matched?.bggFuelP1 ?? newFuelPeriods[val]?.bggFuelP1 ?? curBgg.bggFuelP1 ?? 0);
                      const p1T = Number(matched?.bggTransportP1 ?? newFuelPeriods[val]?.bggTransportP1 ?? curBgg.bggTransportP1 ?? 0);
                      const p2F = Number(matched?.bggFuelP2 ?? newFuelPeriods[val]?.bggFuelP2 ?? curBgg.bggFuelP2 ?? 0);
                      const p2T = Number(matched?.bggTransportP2 ?? newFuelPeriods[val]?.bggTransportP2 ?? curBgg.bggTransportP2 ?? 0);
                      const tot1 = p1F + p1T;
                      const tot2 = p2F + p2T;
                      const avg = Number(matched?.actualFuelFn || newFuelPeriods[val]?.bggAvgFn || ((tot1 > 0 && tot2 > 0) ? (tot1 + tot2) / 2 : (tot1 || tot2 || 0)));
                      const rf = Number(matched?.rfIndexResult || newFuelPeriods[val]?.bggRfIndex || (avg > 0 ? 0.60 + 0.40 * (avg / 9000) : 0));
                      newFuelPeriods[val] = { bggFuelP1: p1F, bggTransportP1: p1T, bggFuelP2: p2F, bggTransportP2: p2T, bggAvgFn: avg, bggRfIndex: rf };
                      return {
                        ...prev,
                        workPeriod: val,
                        rfIndexCalculated: rf > 0 ? rf : prev.rfIndexCalculated,
                        bggData: {
                          ...curBgg,
                          bggFuelP1: p1F,
                          bggTransportP1: p1T,
                          bggFuelP2: p2F,
                          bggTransportP2: p2T,
                          bggAvgFn: avg,
                          bggRfIndex: rf,
                          fuelPeriods: newFuelPeriods,
                        }
                      };
                    }
                  });
                  if (custClean.includes("BGG") && getBGGActiveCoalTier) {
                    const activeTier = getBGGActiveCoalTier(val);
                    const ob1Rate = activeTier === "Tier 3" ? 29500 : (activeTier === "Tier 1" ? 27000 : 27250);
                    const ob2Rate = activeTier === "Tier 3" ? 28750 : (activeTier === "Tier 1" ? 26250 : 26500);
                    const cwRate = activeTier === "Tier 3" ? 17500 : (activeTier === "Tier 1" ? 15000 : 16500);
                    const odObRate = activeTier === "Tier 3" ? 650 : (activeTier === "Tier 1" ? 500 : 600);
                    const odCwRate = activeTier === "Tier 3" ? 550 : (activeTier === "Tier 1" ? 400 : 500);
                    setBaOperatingItems(prev => prev.map(it => {
                      let r = it.rate;
                      const m = (it.material || "").toUpperCase();
                      if (m.includes("REMOVAL 1") || m.includes("75%")) r = ob1Rate;
                      else if (m.includes("REMOVAL 2") || m.includes("25%")) r = ob2Rate;
                      else if (m.includes("COAL WINNING")) r = cwRate;
                      else if (m.includes("OVER DISTANCE FOR OB")) r = odObRate;
                      else if (m.includes("OVER DISTANCE FOR COAL")) r = odCwRate;
                      return { ...it, period: val, rate: r };
                    }));
                  } else if (custClean.includes("PTRO") || custClean.includes("DBK")) {
                    const currentM = Number(matched?.actualMRateXn || latestKursBI || 0);
                    setBaOperatingItems(prev => prev.map(it => {
                      let r = it.rate;
                      if (currentM > 0 && it.isUSD && it.rateUSD > 0) {
                        r = Number((it.rateUSD * currentM).toFixed(3));
                      }
                      return { ...it, period: val, rate: r };
                    }));
                  } else {
                    setBaOperatingItems(prev => prev.map(it => ({ ...it, period: val })));
                  }
                  setBaMDOItems(prev => prev.map(it => ({ ...it, period: val })));
                  setBaDeductionItems(prev => (prev || []).map(it => ({ ...it, period: val, material: (it.material || "").startsWith("Denda ketidakcapaian Volume") ? `Denda ketidakcapaian Volume ${val}` : it.material })));
                }}
                format="long"
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 text-xs focus:border-[#A57C50] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                PIC Site AAP
              </label>
              <input
                className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 text-xs focus:border-[#A57C50] outline-none font-bold"
                placeholder="Operations / Site Engineer"
                value={formData.picAAP !== undefined ? formData.picAAP : (user?.name || "Operations / Site Engineer")}
                onChange={(e) => setFormData({ ...formData, picAAP: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-800">
            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Customer</span> <strong className="text-slate-900 font-bold">{formData.customerCode || ""}</strong></div>
            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Periode</span> <strong className="text-slate-800">{formData.workPeriod || "-"}</strong></div>
            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">PIC Site</span> <strong className="text-slate-800">{formData.picAAP || "-"}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}
