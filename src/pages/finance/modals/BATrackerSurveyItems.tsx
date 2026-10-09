import React, { useState, useEffect, useMemo } from "react";
import { ArrowRight, Calendar, Calculator, Flame, TrendingUp, DollarSign, ShieldAlert, Lock, Plus, Trash2 } from "lucide-react";
import { formatIDR, FormattedNumberInput, matchPeriod } from "../helpers";
import { BAOperatingTable } from "./BAOperatingTable";
import { BAMDOTable } from "./BAMDOTable";
import { BADeductionTable } from "./BADeductionTable";
import { calculateBACommercialBreakdown, resolveHOMasterLaborAndCurrency, calculateTripleFactorRF } from "../ba_calculations";
import { computeRFIndex, rfMasterFor, rfTemplateFor, ptroContractRates } from "../masterRegistry";

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
  minWageMasters?: any[];
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
  rfIndexCalculated = 1.0,
  latestKursBI,
  raiseFallMasters = [],
  minWageMasters = [],
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
    return Array.from(setP);
  }, [formData.workPeriod, baOperatingItems]);

  const [activeFuelPeriod, setActiveFuelPeriod] = useState<string>(() => formData.workPeriod || "");

  const getPeriodMonthName = (period?: string) => {
    if (!period) return "";
    const clean = period.trim();
    const lower = clean.toLowerCase();
    if (lower.includes("jan")) return "Januari";
    if (lower.includes("feb")) return "Februari";
    if (lower.includes("mar")) return "Maret";
    if (lower.includes("apr")) return "April";
    if (lower.includes("mei") || lower.includes("may")) return "Mei";
    if (lower.includes("jun")) return "Juni";
    if (lower.includes("jul")) return "Juli";
    if (lower.includes("agu") || lower.includes("aug")) return "Agustus";
    if (lower.includes("sep")) return "September";
    if (lower.includes("okt") || lower.includes("oct")) return "Oktober";
    if (lower.includes("nov")) return "November";
    if (lower.includes("des") || lower.includes("dec")) return "Desember";

    const parts = clean.split(/[- /_]+/);
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= 12 && part.length <= 2) {
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return months[num - 1];
      }
    }
    return clean;
  };

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
        const rf = Number(matched.rfIndexResult || computeRFIndex(matched, avg));
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
    const hoResolved = resolveHOMasterLaborAndCurrency({
      customerCode: formData.customerCode,
      period,
      raiseFallMasters,
      minWageMasters,
      latestKursBI,
      mRate,
    });

    let fn = 0;
    let ln = hoResolved.laborLn;
    let xn = hoResolved.currencyXn;
    let rf = 0;

    const matchedKey = Object.keys(posFuelPeriods).find((k) => matchPeriod(k, period));
    const targetPeriodData = posFuelPeriods[period] || (matchedKey ? posFuelPeriods[matchedKey] : null);

    const defaultRefills: any[] = [];
    let fuelRefills = defaultRefills;
    if (targetPeriodData && Array.isArray(targetPeriodData.fuelRefills) && targetPeriodData.fuelRefills.length > 0) {
      fuelRefills = targetPeriodData.fuelRefills;
    } else if (Array.isArray(posData.fuelRefills) && posData.fuelRefills.length > 0) {
      fuelRefills = posData.fuelRefills;
    }

    if (targetPeriodData) {
      fn = Number(targetPeriodData.actualFuelFn ?? 0);
      if (Number(targetPeriodData.actualLaborLn ?? 0) > 0) ln = Number(targetPeriodData.actualLaborLn);
      if (Number(targetPeriodData.actualMRateXn ?? 0) > 0) xn = Number(targetPeriodData.actualMRateXn);
      if (Number(targetPeriodData.posRfIndex ?? 0) > 0) rf = Number(targetPeriodData.posRfIndex);
    } else if (matchPeriod(formData.workPeriod, period) || Object.keys(posFuelPeriods).length === 0) {
      fn = Number(posData.actualFuelFn ?? 0);
      if (Number(posData.actualLaborLn ?? 0) > 0) ln = Number(posData.actualLaborLn);
      if (Number(posData.actualMRateXn ?? 0) > 0) xn = Number(posData.actualMRateXn);
      if (Number(posData.posRfIndex ?? 0) > 0) rf = Number(posData.posRfIndex);
    }

    let totLiters = 0;
    let totCost = 0;
    fuelRefills.forEach((r: any) => {
      const l = Number(r.liters || 0);
      const p = Number(r.pricePerLiter || 0);
      if (l > 0) {
        totLiters += l;
        totCost += l * p;
      }
    });
    const avgPriceIDR = totLiters > 0 ? (totCost / totLiters) : 0;
    if (avgPriceIDR > 0 && xn > 0 && (!fn || fn === 0)) {
      fn = Number((avgPriceIDR / xn).toFixed(6));
    }

    if (Array.isArray(raiseFallMasters) && raiseFallMasters.length > 0) {
      const matched = raiseFallMasters.find((r: any) => {
        const rCust = (r.customerCode || "").trim().toUpperCase();
        return rCust.includes("POS") && matchPeriod(r.period, period);
      });
      if (matched) {
        if (!fn && Number(matched.actualFuelFn ?? 0) > 0) fn = Number(matched.actualFuelFn);
        if (Number(matched.actualLaborLn ?? 0) > 0) ln = Number(matched.actualLaborLn);
        if (Number(matched.actualMRateXn ?? 0) > 0) xn = Number(matched.actualMRateXn);
        if (Number(matched.rfIndexResult ?? 0) > 0) rf = Number(matched.rfIndexResult);
      }
    }

    if (!rf) {
      const { rfIndex } = calculateTripleFactorRF(fn, ln, xn);
      rf = rfIndex;
    }

    return {
      actualFuelFn: fn,
      actualLaborLn: ln,
      actualMRateXn: xn,
      posRfIndex: rf,
      fuelRefills,
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
        obRateUSD: Number(ptroData.obRateUSD || ptroContractRates(formData.customerCode).obRateUSD),
        cgRateUSD: Number(ptroData.cgRateUSD || ptroContractRates(formData.customerCode).cgRateUSD),
        odObRateUSD: Number(ptroData.odObRateUSD || ptroContractRates(formData.customerCode).odObRateUSD),
        odCgRateIDR: Number(ptroData.odCgRateIDR || ptroContractRates(formData.customerCode).odCgRateIDR),
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
          ...ptroContractRates(formData.customerCode),
        };
      }
    }
    const defaultM = Number(ptroData.actualMRate || latestKursBI || mRate || 0);
    return {
      actualMRate: defaultM,
      obRateUSD: Number(ptroData.obRateUSD || ptroContractRates(formData.customerCode).obRateUSD),
      cgRateUSD: Number(ptroData.cgRateUSD || ptroContractRates(formData.customerCode).cgRateUSD),
      odObRateUSD: Number(ptroData.odObRateUSD || ptroContractRates(formData.customerCode).odObRateUSD),
      odCgRateIDR: Number(ptroData.odCgRateIDR || ptroContractRates(formData.customerCode).odCgRateIDR),
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
  const bggRfMaster = rfMasterFor(formData.customerCode, activeFuelPeriod) || rfTemplateFor(formData.customerCode);
  const fo = Number(bggRfMaster?.baseFuelFo || 0);
  const computedBggRf = computeRFIndex(bggRfMaster, avgFn);

  // POS 3-Faktor DLF
  const hoPOSResolved = resolveHOMasterLaborAndCurrency({
    customerCode: formData.customerCode,
    period: activeFuelPeriod,
    raiseFallMasters,
    minWageMasters,
    latestKursBI,
    mRate,
  });
  const posFn = Number(activePeriodPOS.actualFuelFn ?? 0);
  const posLn = Number(activePeriodPOS.actualLaborLn || hoPOSResolved.laborLn);
  const posXn = Number(activePeriodPOS.actualMRateXn || hoPOSResolved.currencyXn);
  const { posD, posL, posF, rfIndex: computedPosRf } = calculateTripleFactorRF(posFn, posLn, posXn);

  const posRefills: any[] = Array.isArray(activePeriodPOS.fuelRefills) ? activePeriodPOS.fuelRefills : [];
  let posTotalLiters = 0;
  let posTotalCost = 0;
  posRefills.forEach((r: any) => {
    const l = Number(r.liters || 0);
    const p = Number(r.pricePerLiter || 0);
    if (l > 0) {
      posTotalLiters += l;
      posTotalCost += l * p;
    }
  });
  const posAvgPriceIDR = posTotalLiters > 0 ? (posTotalCost / posTotalLiters) : 0;

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
      const newRf = computeRFIndex(rfMasterFor(formData.customerCode, activeFuelPeriod) || rfTemplateFor(formData.customerCode), newAvg);
      
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
    const newKurs = field === "actualMRateXn" ? val : 0;
    if (field === "actualMRateXn" && newKurs > 0) {
      if (setBaOperatingItems) {
        setBaOperatingItems((prev) =>
          prev.map((it) => {
            if (it.isUSD || (it.rateUSD && it.rateUSD > 0)) {
              const rUSD = Number(it.rateUSD || 0);
              if (rUSD > 0) {
                const newIDRRate = Math.round(rUSD * newKurs);
                const effVol = getBAEffectiveVolume(it, prev, false);
                return {
                  ...it,
                  rate: newIDRRate,
                  subtotalInitial: getBAItemSubtotal({ ...it, rate: newIDRRate }, effVol),
                  subtotalAdjusted: getBAItemSubtotal({ ...it, rate: newIDRRate }, getBAEffectiveVolume(it, prev, true)),
                };
              }
            }
            return it;
          })
        );
      }
      if (setBaMDOItems) {
        setBaMDOItems((prev) =>
          prev.map((it) => {
            if (it.isUSD || (it.rateUSD && it.rateUSD > 0)) {
              const rUSD = Number(it.rateUSD || 0);
              if (rUSD > 0) {
                const newIDRRate = Math.round(rUSD * newKurs);
                const initVol = Number(it.initialVolume || 0);
                const adjVol = Number(it.adjustedVolume || 0);
                return {
                  ...it,
                  rate: newIDRRate,
                  subtotalInitial: Math.round(initVol * newIDRRate),
                  subtotalAdjusted: Math.round(adjVol * newIDRRate),
                };
              }
            }
            return it;
          })
        );
      }
    }

    setFormData((prev: any) => {
      const curPOS = prev.posData || {};
      const curPeriods = { ...(curPOS.fuelPeriods || {}) };
      const curP = { ...(curPeriods[activeFuelPeriod] || getPeriodPOSData(activeFuelPeriod)), [field]: val };
      
      const hoResolved = resolveHOMasterLaborAndCurrency({
        customerCode: prev.customerCode,
        period: activeFuelPeriod,
        raiseFallMasters,
        minWageMasters,
        latestKursBI,
        mRate,
      });

      const fn = field === "actualFuelFn" ? val : Number(curP.actualFuelFn ?? curPOS.actualFuelFn ?? 0);
      const ln = field === "actualLaborLn" ? val : Number(curP.actualLaborLn ?? curPOS.actualLaborLn ?? hoResolved.laborLn);
      const xn = field === "actualMRateXn" ? val : Number(curP.actualMRateXn ?? curPOS.actualMRateXn ?? hoResolved.currencyXn);
      
      const { rfIndex: newRf } = calculateTripleFactorRF(fn, ln, xn);
      
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

  const handlePOSRefillChange = (index: number, field: "label" | "date" | "liters" | "pricePerLiter", value: any) => {
    if (!setFormData) return;
    setFormData((prev: any) => {
      const curPOS = prev.posData || {};
      const curPeriods = { ...(curPOS.fuelPeriods || {}) };
      const curP = { ...(curPeriods[activeFuelPeriod] || getPeriodPOSData(activeFuelPeriod)) };
      
      const prevRefills: any[] = Array.isArray(curP.fuelRefills) && curP.fuelRefills.length > 0 
        ? curP.fuelRefills.map((r: any) => ({ ...r }))
        : (activePeriodPOS.fuelRefills || []).map((r: any) => ({ ...r }));
      
      if (!prevRefills[index]) return prev;
      prevRefills[index] = {
        ...prevRefills[index],
        [field]: (field === "label" || field === "date") ? value : Math.max(0, Number(value || 0)),
      };

      let totL = 0;
      let totC = 0;
      prevRefills.forEach((r: any) => {
        const l = Number(r.liters || 0);
        const p = Number(r.pricePerLiter || 0);
        if (l > 0) {
          totL += l;
          totC += l * p;
        }
      });
      const avgPriceIDR = totL > 0 ? totC / totL : 0;

      const hoResolved = resolveHOMasterLaborAndCurrency({
        customerCode: prev.customerCode,
        period: activeFuelPeriod,
        raiseFallMasters,
        minWageMasters,
        latestKursBI,
        mRate,
      });

      const ln = Number(curP.actualLaborLn ?? curPOS.actualLaborLn ?? hoResolved.laborLn);
      const xn = Number(curP.actualMRateXn ?? curPOS.actualMRateXn ?? hoResolved.currencyXn);
      const newFn = (avgPriceIDR > 0 && xn > 0) ? Number((avgPriceIDR / xn).toFixed(6)) : Number(curP.actualFuelFn || 0);

      const { rfIndex: newRf } = calculateTripleFactorRF(newFn, ln, xn);

      curP.fuelRefills = prevRefills;
      curP.actualFuelFn = newFn;
      curP.actualLaborLn = ln;
      curP.actualMRateXn = xn;
      curP.posRfIndex = newRf;
      curP.actualFuelCost = totC;
      curP.posTotalCost = totC;

      curPeriods[activeFuelPeriod] = curP;

      const isWorkPeriod = matchPeriod(activeFuelPeriod, prev.workPeriod) || uniquePeriods.length === 1;

      if (setBaOperatingItems && isWorkPeriod) {
        setBaOperatingItems((prevItems) => {
          let modified = false;
          const nextItems = prevItems.map((it) => {
            const mLow = (it.material || "").toLowerCase();
            const cLow = (it.category || "").toLowerCase();
            if (it.section === "E" || cLow === "dp fuel" || mLow.includes("dp fuel") || mLow.includes("pengurang solar")) {
              modified = true;
              return {
                ...it,
                rate: totC,
                subtotalInitial: totC,
                subtotalAdjusted: totC,
              };
            }
            return it;
          });
          return modified ? nextItems : prevItems;
        });
      }

      return {
        ...prev,
        rfIndexCalculated: isWorkPeriod && newRf > 0 ? newRf : prev.rfIndexCalculated,
        posData: {
          ...curPOS,
          fuelRefills: isWorkPeriod ? prevRefills : (curPOS.fuelRefills || prevRefills),
          actualFuelFn: isWorkPeriod ? newFn : (curPOS.actualFuelFn ?? newFn),
          actualLaborLn: isWorkPeriod ? ln : (curPOS.actualLaborLn ?? ln),
          actualMRateXn: isWorkPeriod ? xn : (curPOS.actualMRateXn ?? xn),
          posRfIndex: isWorkPeriod ? newRf : (curPOS.posRfIndex ?? newRf),
          actualFuelCost: isWorkPeriod ? totC : (curPOS.actualFuelCost ?? totC),
          posTotalCost: isWorkPeriod ? totC : (curPOS.posTotalCost ?? totC),
          fuelPeriods: curPeriods,
        }
      };
    });
  };

  const handleAddPOSRefillRow = () => {
    if (!setFormData) return;
    setFormData((prev: any) => {
      const curPOS = prev.posData || {};
      const curPeriods = { ...(curPOS.fuelPeriods || {}) };
      const curP = { ...(curPeriods[activeFuelPeriod] || getPeriodPOSData(activeFuelPeriod)) };
      const prevRefills: any[] = Array.isArray(curP.fuelRefills) && curP.fuelRefills.length > 0
        ? curP.fuelRefills.map((r: any) => ({ ...r }))
        : (activePeriodPOS.fuelRefills || []).map((r: any) => ({ ...r }));
      
      const newIdx = prevRefills.length + 1;
      const todayStr = new Date().toISOString().split("T")[0];
      prevRefills.push({
        id: `pos-rf-${Date.now()}-${newIdx}`,
        date: todayStr,
        label: `Pengisian ${newIdx}`,
        liters: 0,
        pricePerLiter: 0,
      });

      curP.fuelRefills = prevRefills;
      curPeriods[activeFuelPeriod] = curP;
      const isWorkPeriod = matchPeriod(activeFuelPeriod, prev.workPeriod) || uniquePeriods.length === 1;

      return {
        ...prev,
        posData: {
          ...curPOS,
          fuelRefills: isWorkPeriod ? prevRefills : (curPOS.fuelRefills || prevRefills),
          fuelPeriods: curPeriods,
        }
      };
    });
  };

  const handleRemovePOSRefillRow = (index: number) => {
    if (!setFormData) return;
    setFormData((prev: any) => {
      const curPOS = prev.posData || {};
      const curPeriods = { ...(curPOS.fuelPeriods || {}) };
      const curP = { ...(curPeriods[activeFuelPeriod] || getPeriodPOSData(activeFuelPeriod)) };
      const prevRefills: any[] = Array.isArray(curP.fuelRefills) && curP.fuelRefills.length > 0
        ? curP.fuelRefills.map((r: any) => ({ ...r }))
        : (activePeriodPOS.fuelRefills || []).map((r: any) => ({ ...r }));
      
      if (prevRefills.length <= 1) return prev;
      prevRefills.splice(index, 1);

      let totL = 0;
      let totC = 0;
      prevRefills.forEach((r: any) => {
        const l = Number(r.liters || 0);
        const p = Number(r.pricePerLiter || 0);
        if (l > 0) {
          totL += l;
          totC += l * p;
        }
      });
      const avgPriceIDR = totL > 0 ? totC / totL : 0;

      const hoResolved = resolveHOMasterLaborAndCurrency({
        customerCode: prev.customerCode,
        period: activeFuelPeriod,
        raiseFallMasters,
        minWageMasters,
        latestKursBI,
        mRate,
      });

      const ln = Number(curP.actualLaborLn ?? curPOS.actualLaborLn ?? hoResolved.laborLn);
      const xn = Number(curP.actualMRateXn ?? curPOS.actualMRateXn ?? hoResolved.currencyXn);
      const newFn = (avgPriceIDR > 0 && xn > 0) ? Number((avgPriceIDR / xn).toFixed(6)) : Number(curP.actualFuelFn || 0);

      const { rfIndex: newRf } = calculateTripleFactorRF(newFn, ln, xn);

      curP.fuelRefills = prevRefills;
      curP.actualFuelFn = newFn;
      curP.actualLaborLn = ln;
      curP.actualMRateXn = xn;
      curP.posRfIndex = newRf;
      curP.actualFuelCost = totC;
      curP.posTotalCost = totC;

      curPeriods[activeFuelPeriod] = curP;
      const isWorkPeriod = matchPeriod(activeFuelPeriod, prev.workPeriod) || uniquePeriods.length === 1;

      if (setBaOperatingItems && isWorkPeriod) {
        setBaOperatingItems((prevItems) => {
          let modified = false;
          const nextItems = prevItems.map((it) => {
            const mLow = (it.material || "").toLowerCase();
            const cLow = (it.category || "").toLowerCase();
            if (it.section === "E" || cLow === "dp fuel" || mLow.includes("dp fuel") || mLow.includes("pengurang solar")) {
              modified = true;
              return {
                ...it,
                rate: totC,
                subtotalInitial: totC,
                subtotalAdjusted: totC,
              };
            }
            return it;
          });
          return modified ? nextItems : prevItems;
        });
      }

      return {
        ...prev,
        rfIndexCalculated: isWorkPeriod && newRf > 0 ? newRf : prev.rfIndexCalculated,
        posData: {
          ...curPOS,
          fuelRefills: isWorkPeriod ? prevRefills : (curPOS.fuelRefills || prevRefills),
          actualFuelFn: isWorkPeriod ? newFn : (curPOS.actualFuelFn ?? newFn),
          actualLaborLn: isWorkPeriod ? ln : (curPOS.actualLaborLn ?? ln),
          actualMRateXn: isWorkPeriod ? xn : (curPOS.actualMRateXn ?? xn),
          posRfIndex: isWorkPeriod ? newRf : (curPOS.posRfIndex ?? newRf),
          actualFuelCost: isWorkPeriod ? totC : (curPOS.actualFuelCost ?? totC),
          posTotalCost: isWorkPeriod ? totC : (curPOS.posTotalCost ?? totC),
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
                  ? ptroContractRates(formData.customerCode).cgRateUSD
                  : (it.material || "").toLowerCase().includes("overhaul") || (it.material || "").toLowerCase().includes("over distance")
                  ? ptroContractRates(formData.customerCode).odObRateUSD
                  : ptroContractRates(formData.customerCode).obRateUSD)
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
        allBAItems={currentAllBAItems}
        rfIndexCalculated={effectiveRF}
        getSowMasterRate={getSowMasterRate}
      />

      {/* Rekapitulasi Tagihan Gross & Pajak / Summary Table (Invoice Equivalent) */}
      {!isPOS ? (
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
      ) : (
        (baMDOItems || []).some((it) => Number(it.initialVolume || 0) > 0) && (
          <div className="overflow-x-auto rounded-[4px] border border-[#A57C50]/40 shadow-xs bg-amber-50/30 px-3.5 py-2.5 flex items-center justify-between">
            <span className="font-extrabold text-xs text-[#1A1612] uppercase tracking-wider">
              GRAND TOTAL GABUNGAN INVOICE POS (OPERATING + MDO):
            </span>
            <span className="font-mono font-black text-sm text-[#A57C50]">
              {formatIDR(breakdown.netTotalInvoice)}
            </span>
          </div>
        )
      )}

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
                const pRf = pData.bggRfIndex || computeRFIndex(rfMasterFor(formData.customerCode, p) || rfTemplateFor(formData.customerCode), pAvg);
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
                const pRf = pData.posRfIndex || calculateTripleFactorRF(pFn, pLn, pXn, formData.customerCode, p).rfIndex;
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

          {/* Info Banner Alur Site vs HO */}
          <div className="text-[11px] bg-amber-100/60 border border-amber-200 text-amber-950 p-2 rounded-[3px] flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A57C50]"></span>
              <strong>Standar Enterprise:</strong> Finance Site hanya menginput harga aktual Fuel (Fn). Indikator Labor (Ln) dan Kurs (Xn) ditarik otomatis dari Master Data Finance HO.
            </span>
          </div>

          {/* TABEL PENGISIAN FUEL AKTUAL (~5 KALI ISI ULANG) */}
          <div className="overflow-x-auto rounded-[3px] border border-amber-200 bg-white shadow-2xs">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-100/70 text-amber-950 font-extrabold text-[10px] uppercase border-b border-amber-200">
                  <th className="p-2 text-left w-36 border-r border-amber-200">Periode</th>
                  <th className="p-2 text-right border-r border-amber-200 w-32">Qty</th>
                  <th className="p-2 text-right border-r border-amber-200 w-36">Unit Price/Harga</th>
                  <th className="p-2 text-right border-r border-amber-200 w-40">Total</th>
                  {isInlineEditingBA && <th className="p-2 text-center w-12">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 font-medium">
                {posRefills.map((refill: any, idx: number) => {
                  const rowTotal = Number(refill.liters || 0) * Number(refill.pricePerLiter || 0);
                  return (
                    <tr key={refill.id || idx} className="hover:bg-amber-50/20">
                      <td className="p-1.5 border-r border-amber-100 bg-amber-50/30">
                        {!isInlineEditingBA ? (
                          <span className="font-bold text-slate-900 px-1">{refill.date || refill.label || `Pengisian ${idx + 1}`}</span>
                        ) : (
                          <input
                            type="date"
                            value={refill.date || ""}
                            onChange={(e) => handlePOSRefillChange(idx, "date", e.target.value)}
                            className="w-full bg-white border border-slate-300 font-bold text-slate-900 p-1 rounded-[3px] outline-none focus:border-[#A57C50] text-xs"
                          />
                        )}
                      </td>
                      <td className="p-1.5 border-r border-amber-100">
                        {!isInlineEditingBA ? (
                          <span className="block text-right font-mono font-bold text-slate-800 p-1">
                            {Number(refill.liters || 0) > 0 ? Number(refill.liters).toLocaleString("id-ID") : "0"}
                          </span>
                        ) : (
                          <FormattedNumberInput
                            allowDecimals
                            maxDecimals={2}
                            placeholder="0"
                            className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-[#A57C50]"
                            value={Number(refill.liters || 0)}
                            onChange={(val) => handlePOSRefillChange(idx, "liters", Number(val || 0))}
                          />
                        )}
                      </td>
                      <td className="p-1.5 border-r border-amber-100">
                        {!isInlineEditingBA ? (
                          <span className="block text-right font-mono font-bold text-slate-800 p-1">
                            {Number(refill.pricePerLiter || 0) > 0
                              ? Number(refill.pricePerLiter).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "0,00"}
                          </span>
                        ) : (
                          <FormattedNumberInput
                            allowDecimals
                            maxDecimals={2}
                            placeholder="0,00"
                            className="w-full bg-white border border-slate-300 font-mono font-bold text-right p-1.5 rounded-[3px] outline-none focus:border-[#A57C50]"
                            value={Number(refill.pricePerLiter || 0)}
                            onChange={(val) => handlePOSRefillChange(idx, "pricePerLiter", Number(val || 0))}
                          />
                        )}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900 bg-amber-50/30 border-r border-amber-100">
                        Rp {rowTotal.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      {isInlineEditingBA && (
                        <td className="p-1 text-center">
                          {posRefills.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleRemovePOSRefillRow(idx)}
                              title="Hapus baris pengisian"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-[3px] transition cursor-pointer mx-auto flex items-center justify-center"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                handlePOSRefillChange(0, "liters", 0);
                                handlePOSRefillChange(0, "pricePerLiter", 0);
                              }}
                              title="Reset baris pengisian"
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[3px] transition cursor-pointer mx-auto flex items-center justify-center"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {/* Ringkasan Total Refill & Average Rp/L */}
                <tr className="bg-amber-100/90 font-bold border-t-2 border-amber-300 text-amber-950">
                  <td className="p-2 text-left uppercase text-[10px] tracking-wider border-r border-amber-200">
                    TOTAL PENGISIAN BBM ({activeFuelPeriod})
                  </td>
                  <td className="p-2 text-right font-mono font-bold border-r border-amber-200">
                    {posTotalLiters.toLocaleString("id-ID")} L
                  </td>
                  <td className="p-2 text-right font-mono font-bold border-r border-amber-200">
                    <span className="text-[10px] text-amber-900 block font-sans uppercase">Fuel Price {getPeriodMonthName(activeFuelPeriod)}:</span>
                    Rp {posAvgPriceIDR.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-2 text-right font-mono font-black text-amber-950 text-xs border-r border-amber-200">
                    <div>Rp {posTotalCost.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <span className="text-[9px] text-[#A57C50] font-sans font-bold block">Sinkron ke DP Fuel (Seksi E)</span>
                  </td>
                  {isInlineEditingBA && <td className="p-2 bg-amber-100/90"></td>}
                </tr>
                {/* Konversi ke USD Fn */}
                <tr className="bg-amber-50 font-bold border-t border-amber-200 text-amber-950">
                  <td colSpan={2} className="p-2 text-left uppercase text-[10px] tracking-wider border-r border-amber-200">
                    RATA-RATA HARGA FUEL AKTUAL (Fn in USD) = Avg Rp / M-Rate BI ({posXn > 0 ? posXn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"})
                  </td>
                  <td colSpan={isInlineEditingBA ? 3 : 2} className="p-2 text-right font-mono font-black text-amber-950 text-xs">
                    <div className="flex items-center justify-end gap-2">
                      <span>Fn (USD/Liter):</span>
                      {!isInlineEditingBA ? (
                        <span className="bg-white px-2 py-0.5 rounded-[3px] border border-amber-300 shadow-2xs">
                          $ {posFn > 0 ? posFn.toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 6 }) : "0,00"}
                        </span>
                      ) : (
                        <div className="w-32">
                          <FormattedNumberInput
                            allowDecimals
                            maxDecimals={6}
                            placeholder="0,0000"
                            className="w-full bg-white border border-amber-300 font-mono font-bold text-right p-1 rounded-[3px] outline-none focus:border-[#A57C50] text-xs"
                            value={posFn}
                            onChange={(val) => handlePOSParamChange("actualFuelFn", Number(val || 0))}
                          />
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 font-sans font-normal">(D = {posD.toFixed(4)})</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tombol Tambah Baris Pengisian jika Mode Edit Aktif */}
          {isInlineEditingBA && (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleAddPOSRefillRow}
                className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-[3px] border border-amber-300 flex items-center gap-1 transition cursor-pointer shadow-2xs"
              >
                <Plus size={12} />
                <span>Tambah Baris Pengisian BBM</span>
              </button>
            </div>
          )}

          {/* 2 Parameter Master Data HO (Labor & Kurs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. Labor / UMK (Ln) - Auto from Master Data HO (Locked) */}
            <div className="bg-slate-50 border border-slate-200 rounded-[3px] p-2.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                  <TrendingUp size={12} className="text-slate-600" />
                  Actual Labor / UMK (Ln in IDR)
                </label>
                <span className="text-[9px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded-[3px] border border-slate-300 flex items-center gap-1">
                  <Lock size={10} className="text-slate-500" />
                  Auto Master HO
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate" title={hoPOSResolved.laborSource}>
                Sumber: {hoPOSResolved.laborSource}
              </div>
              <div className="w-full bg-slate-100/90 border border-slate-300 font-mono font-bold text-slate-800 p-1.5 rounded-[3px] text-sm flex items-center justify-between cursor-not-allowed select-none">
                <span>Rp {posLn > 0 ? posLn.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "0"}</span>
                <span className="text-[9px] font-sans font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider flex items-center gap-1">
                  <Lock size={9} /> Locked
                </span>
              </div>
              <div className="text-[10px] text-slate-600 font-mono pt-0.5 flex items-center justify-between border-t border-slate-200/60">
                <span>Komponen L (25%):</span>
                <strong className="text-slate-900 font-bold">{posL.toFixed(6)}</strong>
              </div>
            </div>

            {/* 2. Forex / M-Rate (Xn) - Auto from Master Data HO (Locked) */}
            <div className="bg-slate-50 border border-slate-200 rounded-[3px] p-2.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                  <Calculator size={12} className="text-slate-600" />
                  Actual Forex / M-Rate (Xn in IDR)
                </label>
                <span className="text-[9px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded-[3px] border border-slate-300 flex items-center gap-1">
                  <Lock size={10} className="text-slate-500" />
                  Auto Kurs BI HO
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate" title={hoPOSResolved.currencySource}>
                Sumber: {hoPOSResolved.currencySource}
              </div>
              <div className="w-full bg-slate-100/90 border border-slate-300 font-mono font-bold text-slate-800 p-1.5 rounded-[3px] text-sm flex items-center justify-between cursor-not-allowed select-none">
                <span>Rp {posXn > 0 ? posXn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : "0,00"}</span>
                <span className="text-[9px] font-sans font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider flex items-center gap-1">
                  <Lock size={9} /> Locked
                </span>
              </div>
              <div className="text-[10px] text-slate-600 font-mono pt-0.5 flex items-center justify-between border-t border-slate-200/60">
                <span>Fixed F (41%):</span>
                <strong className="text-slate-900 font-bold">{posF.toFixed(6)}</strong>
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
