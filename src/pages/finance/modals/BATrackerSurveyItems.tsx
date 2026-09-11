import React, { useState, useEffect, useMemo } from "react";
import { ArrowRight, Calendar, Calculator, Flame, TrendingUp, DollarSign, ShieldAlert } from "lucide-react";
import { formatIDR, FormattedNumberInput, matchPeriod } from "../helpers";
import { BAOperatingTable } from "./BAOperatingTable";
import { BAMDOTable } from "./BAMDOTable";
import { BADeductionTable } from "./BADeductionTable";
import { calculateBACommercialBreakdown } from "../ba_calculations";

interface BATrackerSurveyItemsProps {
  formData: any;
  setFormData?: (data: any) => void;
  baOperatingItems: any[];
  setBaOperatingItems: React.Dispatch<React.SetStateAction<any[]>>;
  baMDOItems: any[];
  setBaMDOItems: React.Dispatch<React.SetStateAction<any[]>>;
  baDeductionItems: any[];
  setBaDeductionItems: React.Dispatch<React.SetStateAction<any[]>>;
  isInlineEditingBA: boolean;
  activeSOWCatalog: any[];
  mRate: number;
  allBAItems: any[];
  isDistanceItem: (item: any) => boolean;
  getBAEffectiveVolume: (item: any, allItems: any[], isSurvey: boolean) => number;
  getBAItemSubtotal: (item: any, volume: number) => number;
  sumInitial: number;
  setActiveBAStep: (step: number) => void;
  rfIndexCalculated?: number;
  latestKursBI?: number;
  raiseFallMasters?: any[];
  reorderBAItems?: (startIndex: number, endIndex: number, listType?: "operating" | "mdo" | "deduction") => void;
  moveBAItem?: (id: string, dir: "up" | "down", listType?: "operating" | "mdo" | "deduction") => void;
  getSowMasterRate?: (cust: string, name: string, fb: number, isUSD?: boolean, tier?: string) => number;
  getBGGActiveCoalTier?: (period?: string) => string;
}

export function BATrackerSurveyItems({
  formData,
  setFormData,
  baOperatingItems,
  setBaOperatingItems,
  baMDOItems,
  setBaMDOItems,
  baDeductionItems,
  setBaDeductionItems,
  isInlineEditingBA,
  activeSOWCatalog,
  mRate,
  allBAItems,
  isDistanceItem,
  getBAEffectiveVolume,
  getBAItemSubtotal,
  sumInitial,
  setActiveBAStep,
  rfIndexCalculated = 1.560,
  latestKursBI,
  raiseFallMasters = [],
  reorderBAItems,
  moveBAItem,
  getSowMasterRate,
  getBGGActiveCoalTier,
}: BATrackerSurveyItemsProps) {
  const isCustomerDBK = formData.customerCode === "PTRO" || formData.customerCode === "DBK" || formData.customerCode === "PT Petrosea";
  const isPTRO = isCustomerDBK;
  const isBGG = formData.customerCode === "BGG" || formData.customerCode === "PT BGG";
  const isPOS = formData.customerCode === "POS" || formData.customerCode === "PT POSITION" || formData.customerCode === "PT. POSITION" || formData.customerCode === "PT POS";
  const isSBS = formData.customerCode === "SBS";

  // Discover all distinct periods from items
  const uniquePeriods = useMemo(() => {
    const setP = new Set<string>();
    if (formData.workPeriod && formData.workPeriod.trim()) {
      setP.add(formData.workPeriod.trim());
    }
    for (const it of baOperatingItems) {
      if (it.period && it.period.trim()) {
        setP.add(it.period.trim());
      }
    }
    if (setP.size === 0) setP.add("Agustus 2026");
    return Array.from(setP);
  }, [formData.workPeriod, baOperatingItems]);

  const [activeFuelPeriod, setActiveFuelPeriod] = useState<string>(() => formData.workPeriod || "Agustus 2026");

  useEffect(() => {
    if (uniquePeriods.length > 0 && !uniquePeriods.includes(activeFuelPeriod)) {
      setActiveFuelPeriod(uniquePeriods[0]);
    }
  }, [uniquePeriods, activeFuelPeriod]);

  // State / BGG Data 1-Factor Fuel per period
  const bggData = formData.bggData || {};
  const fuelPeriods = bggData.fuelPeriods || {};

  const getPeriodFuelData = (period: string) => {
    if (fuelPeriods[period]) {
      const e = fuelPeriods[period];
      if (e.bggFuelP1 > 0 || e.bggTransportP1 > 0 || e.bggFuelP2 > 0 || e.bggTransportP2 > 0 || e.bggAvgFn > 0 || e.bggRfIndex > 0) {
        return e;
      }
    }
    const matchedKey = Object.keys(fuelPeriods).find((k) => matchPeriod(k, period));
    if (matchedKey && fuelPeriods[matchedKey]) {
      const e = fuelPeriods[matchedKey];
      if (e.bggFuelP1 > 0 || e.bggTransportP1 > 0 || e.bggFuelP2 > 0 || e.bggTransportP2 > 0 || e.bggAvgFn > 0 || e.bggRfIndex > 0) {
        return e;
      }
    }

    // Check top-level bggData
    if (matchPeriod(formData.workPeriod, period) || Object.keys(fuelPeriods).length === 0) {
      if (Number(bggData.bggFuelP1 ?? 0) > 0 || Number(bggData.bggTransportP1 ?? 0) > 0 || Number(bggData.bggFuelP2 ?? 0) > 0 || Number(bggData.bggTransportP2 ?? 0) > 0) {
        return {
          bggFuelP1: Number(bggData.bggFuelP1 ?? 0),
          bggTransportP1: Number(bggData.bggTransportP1 ?? 0),
          bggFuelP2: Number(bggData.bggFuelP2 ?? 0),
          bggTransportP2: Number(bggData.bggTransportP2 ?? 0),
          bggAvgFn: Number(bggData.bggAvgFn ?? 0),
          bggRfIndex: Number(bggData.bggRfIndex ?? 0),
        };
      }
    }

    // 1. Search in raiseFallMasters (Master Data)
    if (Array.isArray(raiseFallMasters) && raiseFallMasters.length > 0) {
      const custClean = (formData.customerCode || "BGG").trim().toUpperCase();
      const matched = raiseFallMasters.find((r: any) => {
        const rCust = (r.customerCode || "").trim().toUpperCase();
        const custMatch = rCust === custClean || (!rCust && custClean === "BGG");
        const periodMatch = matchPeriod(r.period, period);
        return custMatch && periodMatch;
      });
      if (matched) {
        const p1F = Number(matched.bggFuelP1 ?? 0);
        const p1T = Number(matched.bggTransportP1 ?? 0);
        const p2F = Number(matched.bggFuelP2 ?? 0);
        const p2T = Number(matched.bggTransportP2 ?? 0);
        const tot1 = p1F + p1T;
        const tot2 = p2F + p2T;
        const avg = Number(matched.actualFuelFn || ((tot1 > 0 && tot2 > 0) ? (tot1 + tot2) / 2 : (tot1 || tot2 || 0)));
        const rf = Number(matched.rfIndexResult || (avg > 0 ? 0.60 + 0.40 * (avg / 9000) : 0));
        return {
          bggFuelP1: p1F,
          bggTransportP1: p1T,
          bggFuelP2: p2F,
          bggTransportP2: p2T,
          bggAvgFn: avg,
          bggRfIndex: rf,
        };
      }
    }

    if (fuelPeriods[period]) return fuelPeriods[period];
    if (matchedKey && fuelPeriods[matchedKey]) return fuelPeriods[matchedKey];

    return {
      bggFuelP1: Number(bggData.bggFuelP1 ?? 0),
      bggTransportP1: Number(bggData.bggTransportP1 ?? 0),
      bggFuelP2: Number(bggData.bggFuelP2 ?? 0),
      bggTransportP2: Number(bggData.bggTransportP2 ?? 0),
      bggAvgFn: Number(bggData.bggAvgFn ?? 0),
      bggRfIndex: Number(bggData.bggRfIndex ?? 0),
    };
  };

  // State / POS Data 3-Factor (Fuel, Labor, Fixed) per period
  const posData = formData.posData || {};
  const posFuelPeriods = posData.fuelPeriods || {};

  const getPeriodPOSData = (period: string) => {
    if (posFuelPeriods[period]) {
      const e = posFuelPeriods[period];
      if (e.actualFuelFn > 0 || e.actualLaborLn > 0 || e.actualMRateXn > 0 || e.posRfIndex > 0) {
        return e;
      }
    }
    const matchedKey = Object.keys(posFuelPeriods).find((k) => matchPeriod(k, period));
    if (matchedKey && posFuelPeriods[matchedKey]) {
      const e = posFuelPeriods[matchedKey];
      if (e.actualFuelFn > 0 || e.actualLaborLn > 0 || e.actualMRateXn > 0 || e.posRfIndex > 0) {
        return e;
      }
    }

    if (matchPeriod(formData.workPeriod, period) || Object.keys(posFuelPeriods).length === 0) {
      if (Number(posData.actualFuelFn ?? 0) > 0 || Number(posData.actualLaborLn ?? 0) > 0 || Number(posData.actualMRateXn ?? 0) > 0) {
        return {
          actualFuelFn: Number(posData.actualFuelFn ?? 0),
          actualLaborLn: Number(posData.actualLaborLn ?? 0),
          actualMRateXn: Number(posData.actualMRateXn ?? 0),
          posRfIndex: Number(posData.posRfIndex ?? 0),
        };
      }
    }

    if (Array.isArray(raiseFallMasters) && raiseFallMasters.length > 0) {
      const matched = raiseFallMasters.find((r: any) => {
        const rCust = (r.customerCode || "").trim().toUpperCase();
        const custMatch = rCust.includes("POS");
        const periodMatch = matchPeriod(r.period, period);
        return custMatch && periodMatch;
      });
      if (matched) {
        const fn = Number(matched.actualFuelFn ?? 0);
        const ln = Number(matched.actualLaborLn ?? 0);
        const xn = Number(matched.actualMRateXn ?? 0);
        const a = Number(matched.weightFuelA ?? 0.34);
        const b = Number(matched.weightLaborB ?? 0.25);
        const c = Number(matched.weightFixedC ?? 0.41);
        const fo = Number(matched.baseFuelFo ?? 10699.970229);
        const lo = Number(matched.baseLaborLo ?? 3594536);
        const xo = Number(matched.baseForexXo ?? 15388.75);

        const d = (fo > 0 && fn > 0 && xn > 0) ? (a * fn * xn) / fo : 0;
        const l = (lo > 0 && xo > 0 && ln > 0 && xn > 0) ? (b * ln * xn) / (lo * xo) : 0;
        const f = c;
        const rf = Number(matched.rfIndexResult || ((d > 0 || l > 0) ? Number((d + l + f).toFixed(3)) : 0));

        return {
          actualFuelFn: fn,
          actualLaborLn: ln,
          actualMRateXn: xn,
          posRfIndex: rf,
        };
      }
    }

    if (posFuelPeriods[period]) return posFuelPeriods[period];
    if (matchedKey && posFuelPeriods[matchedKey]) return posFuelPeriods[matchedKey];

    return {
      actualFuelFn: Number(posData.actualFuelFn ?? 0),
      actualLaborLn: Number(posData.actualLaborLn ?? 0),
      actualMRateXn: Number(posData.actualMRateXn ?? 0),
      posRfIndex: Number(posData.posRfIndex ?? 0),
    };
  };

  // State / PTRO Data (M-Rate / Kurs Transaksi USD to IDR) per period
  const ptroData = formData.ptroData || {};
  const ptroFuelPeriods = ptroData.fuelPeriods || {};

  const getPeriodPTROData = (period: string) => {
    if (ptroFuelPeriods[period]) {
      const e = ptroFuelPeriods[period];
      if (e.actualMRate > 0) return e;
    }
    const matchedKey = Object.keys(ptroFuelPeriods).find((k) => matchPeriod(k, period));
    if (matchedKey && ptroFuelPeriods[matchedKey]) {
      const e = ptroFuelPeriods[matchedKey];
      if (e.actualMRate > 0) return e;
    }

    if (Number(ptroData.actualMRate ?? 0) > 0) {
      return {
        actualMRate: Number(ptroData.actualMRate),
        obRateUSD: Number(ptroData.obRateUSD || 1.490),
        cgRateUSD: Number(ptroData.cgRateUSD || 0.840),
        odObRateUSD: Number(ptroData.odObRateUSD || 0.028),
        odCgRateIDR: Number(ptroData.odCgRateIDR || 230),
      };
    }

    if (Array.isArray(raiseFallMasters) && raiseFallMasters.length > 0) {
      const matched = raiseFallMasters.find((r: any) => {
        const rCust = (r.customerCode || "").trim().toUpperCase();
        const custMatch = rCust.includes("PTRO") || rCust.includes("DBK") || rCust.includes("PETROSEA");
        const periodMatch = matchPeriod(r.period, period);
        return custMatch && periodMatch;
      });
      if (matched && matched.actualMRateXn) {
        return {
          actualMRate: Number(matched.actualMRateXn),
          obRateUSD: 1.490,
          cgRateUSD: 0.840,
          odObRateUSD: 0.028,
          odCgRateIDR: 230,
        };
      }
    }
    const defaultM = Number(ptroData.actualMRate || latestKursBI || mRate || 0);
    return {
      actualMRate: defaultM,
      obRateUSD: Number(ptroData.obRateUSD || 1.490),
      cgRateUSD: Number(ptroData.cgRateUSD || 0.840),
      odObRateUSD: Number(ptroData.odObRateUSD || 0.028),
      odCgRateIDR: Number(ptroData.odCgRateIDR || 230),
    };
  };

  const activePeriodFuel = getPeriodFuelData(activeFuelPeriod);
  const activePeriodPOS = getPeriodPOSData(activeFuelPeriod);
  const activePeriodPTRO = getPeriodPTROData(activeFuelPeriod);

  const fuelP1 = Number(activePeriodFuel.bggFuelP1 ?? 0);
  const transP1 = Number(activePeriodFuel.bggTransportP1 ?? 0);
  const totalP1 = fuelP1 + transP1;

  const fuelP2 = Number(activePeriodFuel.bggFuelP2 ?? 0);
  const transP2 = Number(activePeriodFuel.bggTransportP2 ?? 0);
  const totalP2 = fuelP2 + transP2;

  const avgFn = (totalP1 > 0 && totalP2 > 0) ? (totalP1 + totalP2) / 2 : (totalP1 > 0 ? totalP1 : (totalP2 > 0 ? totalP2 : 0));
  const fo = 9000;
  const computedBggRf = avgFn > 0 ? Number((0.60 + 0.40 * (avgFn / fo)).toFixed(3)) : 0;

  // POS 3-Faktor DLF
  const posFn = Number(activePeriodPOS.actualFuelFn ?? 0);
  const posLn = Number(activePeriodPOS.actualLaborLn ?? 0);
  const posXn = Number(activePeriodPOS.actualMRateXn ?? 0);
  const posD = (posFn > 0 && posXn > 0) ? (0.34 * posFn * posXn) / 10699.970229 : 0;
  const posL = (posLn > 0 && posXn > 0) ? (0.25 * posLn * posXn) / (3594536 * 15388.75) : 0;
  const posF = 0.41;
  const computedPosRf = (posD > 0 || posL > 0) ? Number((posD + posL + posF).toFixed(3)) : 0;

  // PTRO Kurs M-Rate
  const ptroKurs = Number(activePeriodPTRO.actualMRate || latestKursBI || mRate || 0);

  const effectiveRF = isBGG
    ? (activePeriodFuel.bggRfIndex || computedBggRf)
    : isPOS
      ? (activePeriodPOS.posRfIndex || computedPosRf)
      : (rfIndexCalculated > 0 ? rfIndexCalculated : 1.0);

  const handleFuelParamChange = (field: string, val: number) => {
    if (!setFormData) return;
    setFormData((prev: any) => {
      const curBgg = prev.bggData || {};
      const curPeriods = { ...(curBgg.fuelPeriods || {}) };
      const curP = { ...(curPeriods[activeFuelPeriod] || getPeriodFuelData(activeFuelPeriod)), [field]: val };
      
      const p1F = field === "bggFuelP1" ? val : Number(curP.bggFuelP1 ?? curBgg.bggFuelP1 ?? 0);
      const p1T = field === "bggTransportP1" ? val : Number(curP.bggTransportP1 ?? curBgg.bggTransportP1 ?? 0);
      const p2F = field === "bggFuelP2" ? val : Number(curP.bggFuelP2 ?? curBgg.bggFuelP2 ?? 0);
      const p2T = field === "bggTransportP2" ? val : Number(curP.bggTransportP2 ?? curBgg.bggTransportP2 ?? 0);
      
      const tot1 = p1F + p1T;
      const tot2 = p2F + p2T;
      const newAvg = (tot1 > 0 && tot2 > 0) ? (tot1 + tot2) / 2 : (tot1 > 0 ? tot1 : (tot2 > 0 ? tot2 : 0));
      const newRf = newAvg > 0 ? Number((0.60 + 0.40 * (newAvg / 9000)).toFixed(3)) : 0;
      
      curP.bggFuelP1 = p1F;
      curP.bggTransportP1 = p1T;
      curP.bggFuelP2 = p2F;
      curP.bggTransportP2 = p2T;
      curP.bggAvgFn = newAvg;
      curP.bggRfIndex = newRf;
      
      curPeriods[activeFuelPeriod] = curP;

      const isWorkPeriod = matchPeriod(activeFuelPeriod, prev.workPeriod) || uniquePeriods.length === 1;

      return {
        ...prev,
        rfIndexCalculated: isWorkPeriod && newRf > 0 ? newRf : prev.rfIndexCalculated,
        bggData: {
          ...curBgg,
          bggFuelP1: isWorkPeriod ? p1F : (curBgg.bggFuelP1 ?? p1F),
          bggTransportP1: isWorkPeriod ? p1T : (curBgg.bggTransportP1 ?? p1T),
          bggFuelP2: isWorkPeriod ? p2F : (curBgg.bggFuelP2 ?? p2F),
          bggTransportP2: isWorkPeriod ? p2T : (curBgg.bggTransportP2 ?? p2T),
          bggAvgFn: isWorkPeriod ? newAvg : (curBgg.bggAvgFn ?? newAvg),
          bggRfIndex: isWorkPeriod ? newRf : (curBgg.bggRfIndex ?? newRf),
          fuelPeriods: curPeriods,
        }
      };
    });
  };

  const handlePOSParamChange = (field: string, val: number) => {
    if (!setFormData) return;
    setFormData((prev: any) => {
      const curPOS = prev.posData || {};
      const curPeriods = { ...(curPOS.fuelPeriods || {}) };
      const curP = { ...(curPeriods[activeFuelPeriod] || getPeriodPOSData(activeFuelPeriod)), [field]: val };
      
      const fn = field === "actualFuelFn" ? val : Number(curP.actualFuelFn ?? curPOS.actualFuelFn ?? 0);
      const ln = field === "actualLaborLn" ? val : Number(curP.actualLaborLn ?? curPOS.actualLaborLn ?? 0);
      const xn = field === "actualMRateXn" ? val : Number(curP.actualMRateXn ?? curPOS.actualMRateXn ?? 0);
      
      const d = (fn > 0 && xn > 0) ? (0.34 * fn * xn) / 10699.970229 : 0;
      const l = (ln > 0 && xn > 0) ? (0.25 * ln * xn) / (3594536 * 15388.75) : 0;
      const f = 0.41;
      const newRf = (d > 0 || l > 0) ? Number((d + l + f).toFixed(3)) : 0;
      
      curP.actualFuelFn = fn;
      curP.actualLaborLn = ln;
      curP.actualMRateXn = xn;
      curP.posRfIndex = newRf;
      
      curPeriods[activeFuelPeriod] = curP;

      const isWorkPeriod = matchPeriod(activeFuelPeriod, prev.workPeriod) || uniquePeriods.length === 1;

      return {
        ...prev,
        rfIndexCalculated: isWorkPeriod && newRf > 0 ? newRf : prev.rfIndexCalculated,
        posData: {
          ...curPOS,
          actualFuelFn: isWorkPeriod ? fn : (curPOS.actualFuelFn ?? fn),
          actualLaborLn: isWorkPeriod ? ln : (curPOS.actualLaborLn ?? ln),
          actualMRateXn: isWorkPeriod ? xn : (curPOS.actualMRateXn ?? xn),
          posRfIndex: isWorkPeriod ? newRf : (curPOS.posRfIndex ?? newRf),
          fuelPeriods: curPeriods,
        }
      };
    });
  };

  const handlePTROParamChange = (field: string, val: number) => {
    if (!setFormData) return;
    const newKurs = field === "actualMRate" ? val : 0;

    // Live update rates in baOperatingItems for USD-linked items
    if (field === "actualMRate" && newKurs > 0 && setBaOperatingItems) {
      setBaOperatingItems((prev) =>
        prev.map((it) => {
          if (it.isUSD || (it.rateUSD && it.rateUSD > 0)) {
            const rUSD = Number(
              it.rateUSD ||
                ((it.material || "").toLowerCase().includes("coal")
                  ? 0.840
                  : (it.material || "").toLowerCase().includes("overhaul") || (it.material || "").toLowerCase().includes("over distance")
                  ? 0.028
                  : 1.490)
            );
            const newIDRRate = Math.round(rUSD * newKurs);
            const effVol = getBAEffectiveVolume(it, prev, false);
            return {
              ...it,
              rate: newIDRRate,
              subtotalInitial: getBAItemSubtotal({ ...it, rate: newIDRRate }, effVol),
              subtotalAdjusted: getBAItemSubtotal({ ...it, rate: newIDRRate }, getBAEffectiveVolume(it, prev, true)),
            };
          }
          return it;
        })
      );
    }

    setFormData((prev: any) => {
      const curPTRO = prev.ptroData || {};
      const curPeriods = { ...(curPTRO.fuelPeriods || {}) };
      const curP = { ...(curPeriods[activeFuelPeriod] || getPeriodPTROData(activeFuelPeriod)), [field]: val };
      
      curPeriods[activeFuelPeriod] = curP;

      const isWorkPeriod = matchPeriod(activeFuelPeriod, prev.workPeriod) || uniquePeriods.length === 1;

      return {
        ...prev,
        ptroData: {
          ...curPTRO,
          actualMRate: isWorkPeriod && field === "actualMRate" ? val : (curPTRO.actualMRate ?? curP.actualMRate),
          [field]: val,
          fuelPeriods: curPeriods,
        }
      };
    });
  };

  // State / SBS Data (Denda / Deductions per period)
  const sbsData = formData.sbsData || {};
  const sbsFuelPeriods = sbsData.fuelPeriods || {};

  const getPeriodSBSData = (period: string) => {
    if (sbsFuelPeriods[period]) {
      return sbsFuelPeriods[period];
    }
    const matchedKey = Object.keys(sbsFuelPeriods).find((k) => matchPeriod(k, period));
    if (matchedKey && sbsFuelPeriods[matchedKey]) {
      return sbsFuelPeriods[matchedKey];
    }
    const dMA = baDeductionItems.find((it) => (it.material || "").toLowerCase().includes("ma"))?.rate || 0;
    const dLoader = baDeductionItems.find((it) => (it.material || "").toLowerCase().includes("loader"))?.rate || 0;
    const dHauler = baDeductionItems.find((it) => (it.material || "").toLowerCase().includes("hauler"))?.rate || 0;
    const dVol = baDeductionItems.find((it) => (it.material || "").toLowerCase().includes("volume"))?.rate || 0;

    if (matchPeriod(formData.workPeriod, period)) {
      return {
        dendaMA: Number(sbsData.dendaMA ?? dMA),
        dendaBBMLoader: Number(sbsData.dendaBBMLoader ?? dLoader),
        dendaBBMHauler: Number(sbsData.dendaBBMHauler ?? dHauler),
        dendaVolume: Number(sbsData.dendaVolume ?? dVol),
      };
    }

    return {
      dendaMA: 0,
      dendaBBMLoader: 0,
      dendaBBMHauler: 0,
      dendaVolume: 0,
    };
  };

  const activePeriodSBS = getPeriodSBSData(activeFuelPeriod);

  const handleSBSParamChange = (field: string, val: number) => {
    if (!setFormData) return;
    const curP = { ...getPeriodSBSData(activeFuelPeriod), [field]: val };
    const newFuelPeriods = { ...(sbsData.fuelPeriods || {}) };
    newFuelPeriods[activeFuelPeriod] = curP;

    const newSBS: any = {
      ...sbsData,
      fuelPeriods: newFuelPeriods,
    };
    if (matchPeriod(activeFuelPeriod, formData.workPeriod) || uniquePeriods.length === 1) {
      newSBS[field] = val;
    }

    // Auto-update rate on corresponding baDeductionItems
    setBaDeductionItems((prev) =>
      (prev || []).map((it) => {
        const m = (it.material || "").toLowerCase();
        let newRate = it.rate;
        if (field === "dendaMA" && m.includes("ma")) newRate = val;
        else if (field === "dendaBBMLoader" && m.includes("loader")) newRate = val;
        else if (field === "dendaBBMHauler" && m.includes("hauler")) newRate = val;
        else if (field === "dendaVolume" && m.includes("volume")) newRate = val;
        return {
          ...it,
          rate: newRate,
          subtotalInitial: -Math.abs(newRate),
          subtotalAdjusted: -Math.abs(newRate),
        };
      })
    );

    setFormData({
      ...formData,
      sbsData: newSBS,
    });
  };

  const currentAllBAItems = [...baOperatingItems, ...(baMDOItems || []), ...(baDeductionItems || [])];
  const sumAdjusted = currentAllBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, currentAllBAItems, true)), 0);
  const breakdown = calculateBACommercialBreakdown(
    formData.customerCode,
    currentAllBAItems,
    effectiveRF,
    isCustomerDBK,
    false,
    isBGG ? bggData.fuelPeriods : isPOS ? posData.fuelPeriods : isPTRO ? ptroData.fuelPeriods : sbsData.fuelPeriods
  );

  return (
    <div className="space-y-4">
      {/* Tabel 1: Operating & Mining */}
      <BAOperatingTable
        formData={formData}
        baOperatingItems={baOperatingItems}
        setBaOperatingItems={setBaOperatingItems}
        baMDOItems={baMDOItems}
        setBaMDOItems={setBaMDOItems}
        baDeductionItems={baDeductionItems}
        setBaDeductionItems={setBaDeductionItems}
        isInlineEditingBA={isInlineEditingBA}
        activeSOWCatalog={activeSOWCatalog}
        mRate={mRate}
        allBAItems={allBAItems}
        isDistanceItem={isDistanceItem}
        getBAEffectiveVolume={getBAEffectiveVolume}
        getBAItemSubtotal={getBAItemSubtotal}
        reorderBAItems={reorderBAItems}
        moveBAItem={moveBAItem}
        getSowMasterRate={getSowMasterRate}
        getBGGActiveCoalTier={getBGGActiveCoalTier}
        rfIndexCalculated={effectiveRF}
      />

      {/* Tabel 2: MDO / Support (POS & SBS) */}
      <BAMDOTable
        formData={formData}
        baMDOItems={baMDOItems}
        setBaMDOItems={setBaMDOItems}
        isInlineEditingBA={isInlineEditingBA}
        activeSOWCatalog={activeSOWCatalog}
        mRate={mRate}
      />

      {/* Rekapitulasi Tagihan Gross & Pajak / Summary Table (Invoice Equivalent) */}
      <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-xs bg-white">
        <table className="w-full text-xs font-mono border-collapse">
          <tbody>
            <tr className="border-b border-slate-200 hover:bg-slate-50/60">
              <td className="p-2 font-bold uppercase text-slate-800 tracking-wider">
                TOTAL
              </td>
              <td className="p-2 text-right font-bold text-slate-900 w-44 sm:w-56">
                {formatIDR(breakdown.totalGross > 0 ? breakdown.totalGross : (sumAdjusted > 0 ? sumAdjusted : sumInitial))}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-50/60">
              <td className="p-2 font-bold uppercase text-slate-700 tracking-wider">
                DPP PPN 11/12
              </td>
              <td className="p-2 text-right font-medium text-slate-800 w-44 sm:w-56">
                {formatIDR(breakdown.dpp11_12)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-50/60">
              <td className="p-2 font-bold uppercase text-slate-700 tracking-wider">
                VAT ( 12%)
              </td>
              <td className="p-2 text-right font-medium text-slate-800 w-44 sm:w-56">
                {formatIDR(breakdown.vat12)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 hover:bg-slate-50/60">
              <td className="p-2 font-bold uppercase text-slate-700 tracking-wider">
                WITH HOLDING TAX ART 23 (2%)
              </td>
              <td className="p-2 text-right font-medium text-slate-800 w-44 sm:w-56">
                ({formatIDR(breakdown.pph23Amount)})
              </td>
            </tr>
            <tr className="bg-slate-100/80 font-black text-slate-900 border-t border-slate-300">
              <td className="p-2 font-black uppercase text-slate-900 tracking-wider text-xs">
                TOTAL INVOICE
              </td>
              <td className="p-2 text-right font-black text-slate-950 w-44 sm:w-56 text-sm">
                {formatIDR(breakdown.netTotalInvoice > 0 ? breakdown.netTotalInvoice : (sumAdjusted > 0 ? sumAdjusted : sumInitial))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabel 3: Pengurang Pembayaran (Section P / Denda & Penalti SBS) */}
      <BADeductionTable
        formData={formData}
        baDeductionItems={baDeductionItems}
        setBaDeductionItems={setBaDeductionItems}
        isInlineEditingBA={isInlineEditingBA}
        activeSOWCatalog={activeSOWCatalog}
      />

      {/* TOTAL DIBAYAR (Khusus SBS Setelah Pengurang Pembayaran) */}
      {isSBS && (
        <div className="overflow-x-auto rounded-[4px] border border-emerald-300 shadow-xs bg-emerald-50/60">
          <table className="w-full text-xs font-mono border-collapse">
            <tbody>
              <tr className="bg-emerald-100/90 font-black text-emerald-950">
                <td className="p-2.5 font-black uppercase tracking-wider text-xs flex items-center gap-2">
                  <span>TOTAL DIBAYAR</span>
                </td>
                <td className="p-2.5 text-right font-black text-emerald-900 w-44 sm:w-56 text-sm">
                  {formatIDR(breakdown.totalDibayar || breakdown.netTotalInvoice)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* CARD PARAMETER 1-FAKTOR BBM (BGG) - MOVED TO BOTTOM */}
      {isBGG && (
        <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-[4px] space-y-2.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-amber-200/80 pb-2">
            <span className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
              <Flame size={14} className="text-[#A57C50]" />
              Parameter 1-Faktor BBM (BGG)
            </span>
            <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-[3px] border border-amber-300/60 self-start sm:self-auto">
              Base Fuel (Fo): Rp 9.000 (Konstan Kontrak)
            </span>
          </div>

          {/* TAB PERIODE JIKA TERDAPAT MULTI-PERIODE */}
          {uniquePeriods.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-1 border-b border-amber-200/60">
              <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1 mr-1">
                <Calendar size={13} className="text-[#A57C50]" />
                Tab Periode:
              </span>
              {uniquePeriods.map((p) => {
                const isActive = activeFuelPeriod === p;
                const pData = getPeriodFuelData(p);
                const pP1 = Number(pData.bggFuelP1 ?? 0) + Number(pData.bggTransportP1 ?? 0);
                const pP2 = Number(pData.bggFuelP2 ?? 0) + Number(pData.bggTransportP2 ?? 0);
                const pAvg = (pP1 > 0 && pP2 > 0) ? (pP1 + pP2) / 2 : (pP1 > 0 ? pP1 : (pP2 > 0 ? pP2 : 0));
                const pRf = pData.bggRfIndex || (pAvg > 0 ? Number((0.60 + 0.40 * (pAvg / 9000)).toFixed(3)) : 0);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setActiveFuelPeriod(p)}
                    className={`px-3 py-1.5 text-xs rounded-[3px] font-bold transition flex items-center gap-2 cursor-pointer border ${
                      isActive
                        ? "bg-[#A57C50] text-white border-[#A57C50] shadow-xs"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs"
                    }`}
                  >
                    <span>{p}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] font-bold ${
                        isActive
                          ? "bg-black/15 text-amber-50 border border-white/20"
                          : "bg-amber-100/70 text-amber-900 border border-amber-200"
                      }`}
                    >
                      RF: {Number(pRf).toFixed(3)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="overflow-x-auto rounded-[3px] border border-amber-200 bg-white shadow-2xs">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-100/70 text-amber-950 font-extrabold text-[10px] uppercase border-b border-amber-200">
                  <th className="p-2 text-left w-36 border-r border-amber-200">Periode ({activeFuelPeriod})</th>
                  <th className="p-2 text-right border-r border-amber-200 w-32">Fuel (Rp)</th>
                  <th className="p-2 text-right border-r border-amber-200 w-32">Transport (Rp)</th>
                  <th className="p-2 text-right w-36">Total (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 font-medium">
                <tr>
                  <td className="p-2 font-bold text-slate-900 border-r border-amber-100 bg-amber-50/30">
                    PERIODE I
                  </td>
                  <td className="p-1.5 border-r border-amber-100">
                    {!isInlineEditingBA ? (
                      <span className="block text-right font-mono font-bold text-slate-800 p-1">
                        {fuelP1 > 0 ? fuelP1.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : "0"}
                      </span>
                    ) : (
                      <FormattedNumberInput
                        allowDecimals
                        maxDecimals={3}
                        placeholder="0,00"
                        className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-[#A57C50]"
                        value={fuelP1}
                        onChange={(val) => handleFuelParamChange("bggFuelP1", Number(val || 0))}
                      />
                    )}
                  </td>
                  <td className="p-1.5 border-r border-amber-100">
                    {!isInlineEditingBA ? (
                      <span className="block text-right font-mono font-bold text-slate-800 p-1">
                        {transP1 > 0 ? transP1.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : "0"}
                      </span>
                    ) : (
                      <FormattedNumberInput
                        allowDecimals
                        maxDecimals={3}
                        placeholder="0,00"
                        className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-[#A57C50]"
                        value={transP1}
                        onChange={(val) => handleFuelParamChange("bggTransportP1", Number(val || 0))}
                      />
                    )}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900 bg-amber-50/30">
                    Rp {totalP1.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </td>
                </tr>

                <tr>
                  <td className="p-2 font-bold text-slate-900 border-r border-amber-100 bg-amber-50/30">
                    PERIODE II
                  </td>
                  <td className="p-1.5 border-r border-amber-100">
                    {!isInlineEditingBA ? (
                      <span className="block text-right font-mono font-bold text-slate-800 p-1">
                        {fuelP2 > 0 ? fuelP2.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : "0"}
                      </span>
                    ) : (
                      <FormattedNumberInput
                        allowDecimals
                        maxDecimals={3}
                        placeholder="0,00"
                        className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-[#A57C50]"
                        value={fuelP2}
                        onChange={(val) => handleFuelParamChange("bggFuelP2", Number(val || 0))}
                      />
                    )}
                  </td>
                  <td className="p-1.5 border-r border-amber-100">
                    {!isInlineEditingBA ? (
                      <span className="block text-right font-mono font-bold text-slate-800 p-1">
                        {transP2 > 0 ? transP2.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : "0"}
                      </span>
                    ) : (
                      <FormattedNumberInput
                        allowDecimals
                        maxDecimals={3}
                        placeholder="0,00"
                        className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-[#A57C50]"
                        value={transP2}
                        onChange={(val) => handleFuelParamChange("bggTransportP2", Number(val || 0))}
                      />
                    )}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900 bg-amber-50/30">
                    Rp {totalP2.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-amber-100/90 font-bold border-t-2 border-amber-300 text-amber-950">
                  <td colSpan={2} className="p-2 text-left uppercase text-[10px] tracking-wider border-r border-amber-200">
                    RATA-RATA TOTAL AKTUAL FUEL (Fn) - {activeFuelPeriod}
                  </td>
                  <td className="p-2 text-right text-[10px] uppercase font-bold text-amber-900 border-r border-amber-200">
                    TOTAL (AVERAGE)
                  </td>
                  <td className="p-2 text-right font-mono font-black text-amber-950 text-xs">
                    Rp {avgFn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Live Calculation Preview Banner */}
          <div className="p-2.5 bg-amber-100/70 text-amber-950 rounded-[3px] border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                Live Calculation Preview ({activeFuelPeriod}):
              </span>
              <span className="text-xs font-mono text-slate-700">
                Formula: 0,60 + 0,40 × ({avgFn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 9.000)
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-bold uppercase text-amber-900">Index RF ({activeFuelPeriod}) =</span>
              <span className="text-sm font-black font-mono text-amber-950 bg-white px-2.5 py-0.5 rounded-[3px] border border-amber-300 shadow-2xs">
                {effectiveRF.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Parameter 3-Faktor Escalation (POS): Fuel (D), Labor (L), Fixed (F) */}
      {isPOS && (
        <div className="mt-6 p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-[4px] space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-amber-200/80 pb-2">
            <span className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-[#A57C50]" />
              Parameter 3-Faktor Escalation: BBM, Tenaga Kerja & Forex (POS)
            </span>
            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto text-[10px] font-bold">
              <span className="bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-[3px] border border-amber-300/60">
                Formula: D + L + F (a=0.34, b=0.25, c=0.41)
              </span>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-[3px] border border-amber-200">
                Fo: Rp 10.699,97 | Lo: Rp 3.594.536 | Xo: Rp 15.388,75
              </span>
            </div>
          </div>

          {/* TAB PERIODE JIKA TERDAPAT MULTI-PERIODE */}
          {uniquePeriods.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-1 border-b border-amber-200/60">
              <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1 mr-1">
                <Calendar size={13} className="text-[#A57C50]" />
                Tab Periode:
              </span>
              {uniquePeriods.map((p) => {
                const isActive = activeFuelPeriod === p;
                const pData = getPeriodPOSData(p);
                const pFn = Number(pData.actualFuelFn ?? 0);
                const pLn = Number(pData.actualLaborLn ?? 0);
                const pXn = Number(pData.actualMRateXn ?? 0);
                const pD = (pFn > 0 && pXn > 0) ? (0.34 * pFn * pXn) / 10699.970229 : 0;
                const pL = (pLn > 0 && pXn > 0) ? (0.25 * pLn * pXn) / (3594536 * 15388.75) : 0;
                const pF = 0.41;
                const pRf = pData.posRfIndex || ((pD > 0 || pL > 0) ? Number((pD + pL + pF).toFixed(3)) : 0);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setActiveFuelPeriod(p)}
                    className={`px-3 py-1.5 text-xs rounded-[3px] font-bold transition flex items-center gap-2 cursor-pointer border ${
                      isActive
                        ? "bg-[#A57C50] text-white border-[#A57C50] shadow-xs"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs"
                    }`}
                  >
                    <span>{p}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] font-bold ${
                        isActive
                          ? "bg-black/15 text-amber-50 border border-white/20"
                          : "bg-amber-100/70 text-amber-900 border border-amber-200"
                      }`}
                    >
                      RF: {Number(pRf).toFixed(3)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3 Parameter Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Fuel Price (Fn) */}
            <div className="bg-white border border-amber-200 rounded-[3px] p-2.5 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                  <Flame size={12} className="text-[#A57C50]" />
                  Actual Fuel (Fn in USD)
                </label>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  Weight (a): 34%
                </span>
              </div>
              {!isInlineEditingBA ? (
                <div className="font-mono font-bold text-slate-900 text-sm pt-1">
                  $ {posFn > 0 ? posFn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : "0,00"}
                </div>
              ) : (
                <FormattedNumberInput
                  allowDecimals
                  maxDecimals={6}
                  placeholder="0,000"
                  className="w-full bg-white border border-slate-300 font-mono font-bold text-slate-900 p-1.5 rounded-[3px] outline-none focus:border-[#A57C50] text-sm"
                  value={posFn}
                  onChange={(val) => handlePOSParamChange("actualFuelFn", Number(val || 0))}
                />
              )}
              <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                Komponen D = <strong className="text-amber-900 font-bold">{posD.toFixed(6)}</strong>
              </div>
            </div>

            {/* 2. Labor / UMK (Ln) */}
            <div className="bg-white border border-amber-200 rounded-[3px] p-2.5 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                  <TrendingUp size={12} className="text-[#A57C50]" />
                  Actual Labor / UMK (Ln in IDR)
                </label>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  Weight (b): 25%
                </span>
              </div>
              {!isInlineEditingBA ? (
                <div className="font-mono font-bold text-slate-900 text-sm pt-1">
                  Rp {posLn > 0 ? posLn.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "0"}
                </div>
              ) : (
                <FormattedNumberInput
                  allowDecimals
                  maxDecimals={2}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 font-mono font-bold text-slate-900 p-1.5 rounded-[3px] outline-none focus:border-[#A57C50] text-sm"
                  value={posLn}
                  onChange={(val) => handlePOSParamChange("actualLaborLn", Number(val || 0))}
                />
              )}
              <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                Komponen L = <strong className="text-amber-900 font-bold">{posL.toFixed(6)}</strong>
              </div>
            </div>

            {/* 3. Forex / M-Rate (Xn) */}
            <div className="bg-white border border-amber-200 rounded-[3px] p-2.5 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                  <Calculator size={12} className="text-[#A57C50]" />
                  Actual Forex / M-Rate (Xn in IDR)
                </label>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  Fixed (c): 41%
                </span>
              </div>
              {!isInlineEditingBA ? (
                <div className="font-mono font-bold text-slate-900 text-sm pt-1">
                  Rp {posXn > 0 ? posXn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : "0,00"}
                </div>
              ) : (
                <FormattedNumberInput
                  allowDecimals
                  maxDecimals={3}
                  placeholder="0,00"
                  className="w-full bg-white border border-slate-300 font-mono font-bold text-slate-900 p-1.5 rounded-[3px] outline-none focus:border-[#A57C50] text-sm"
                  value={posXn}
                  onChange={(val) => handlePOSParamChange("actualMRateXn", Number(val || 0))}
                />
              )}
              <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                Komponen F = <strong className="text-amber-900 font-bold">{posF.toFixed(6)}</strong>
              </div>
            </div>
          </div>

          {/* Live Calculation Preview Banner */}
          <div className="p-2.5 bg-amber-100/70 text-amber-950 rounded-[3px] border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                Live Calculation Preview ({activeFuelPeriod}):
              </span>
              <span className="text-xs font-mono text-slate-700">
                Formula: D ({posD.toFixed(4)}) + L ({posL.toFixed(4)}) + F ({posF.toFixed(2)})
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-bold uppercase text-amber-900">Index RF ({activeFuelPeriod}) =</span>
              <span className="text-sm font-black font-mono text-amber-950 bg-white px-2.5 py-0.5 rounded-[3px] border border-amber-300 shadow-2xs">
                {effectiveRF.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => setActiveBAStep(2)}
          className="px-4 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold rounded-[3px] flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
        >
          <span>Lanjut ke Step 2 (Hasil Survey & Draft BA)</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
