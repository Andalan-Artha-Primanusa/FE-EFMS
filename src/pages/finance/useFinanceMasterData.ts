import { useState, useEffect, useCallback, useMemo } from "react";
import { api, getFinanceTemplates } from "../../lib/api";
import { calcRFIndex } from "./calculations";
import {
  FALLBACK_BLANK_PTRO_ITEMS,
  FALLBACK_BLANK_BGG_ITEMS,
  FALLBACK_BLANK_SBS_ITEMS,
  FALLBACK_BLANK_POS_ITEMS,
  FALLBACK_BGG_BA_ITEMS,
  FALLBACK_POS_OPERATING_ITEMS,
  FALLBACK_POS_MDO_ITEMS,
  FALLBACK_SBS_BA_ITEMS,
  FALLBACK_SBS_RENTAL_ITEMS,
  FALLBACK_SBS_DEDUCTION_ITEMS
} from "./demoDataSeed";

export function useFinanceMasterData(customerCode: string = "POS", customerRows: any[] = []) {
  const [mRate, setMRate] = useState(17923.30);
  const [fuelPriceUSD, setFuelPriceUSD] = useState(1.422);
  const [laborPriceIDR, setLaborPriceIDR] = useState(3721423);
  const [raiseFallMasters, setRaiseFallMasters] = useState<any[]>([]);
  const [raiseFallMaster, setRaiseFallMaster] = useState<any>(null);

  const [dynamicSowOptions, setDynamicSowOptions] = useState<any[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<any[]>([]);
  const [latestKursBI, setLatestKursBI] = useState(17923.30);
  const [coalIndexMaster, setCoalIndexMaster] = useState<any[]>([]);

  const [financeTemplates, setFinanceTemplates] = useState<any[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  useEffect(() => {
    getFinanceTemplates()
      .then((grouped: Record<string, any[]>) => { if (grouped) setFinanceTemplates(Object.values(grouped).flat()); })
      .catch(() => {})
      .finally(() => setTemplatesLoaded(true));

    api<any[]>("/api/master-data/raise-fall")
      .then((data) => { if (Array.isArray(data) && data.length > 0) setRaiseFallMasters(data); })
      .catch(() => {});

    api<any[]>("/api/master-data/coal-index")
      .then((data) => { if (Array.isArray(data) && data.length > 0) setCoalIndexMaster(data); })
      .catch(() => {});

    api<any[]>("/api/master-data/variable-sow")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDynamicSowOptions(
            data.map((d) => ({
              id: d.id,
              code: d.itemName ? d.itemName.toUpperCase().replace(/[^A-Z0-9]/g, "_") : `SOW_${d.id}`,
              name: d.itemName,
              itemName: d.itemName,
              category: d.category,
              unit: d.unit,
              customer: d.customer || d.customerCode || "",
              customerCode: d.customerCode || d.customer || "",
              baseRateUSD: d.rateUSD || 0,
              rateUSD: d.rateUSD || 0,
              rateIDR: d.rateIDR || (d.rateUSD ? Math.round(d.rateUSD * 17923.30) : 0)
            }))
          );
        }
      })
      .catch(() => {});

    api<any[]>("/api/master-data/bank-accounts")
      .then((data) => { if (Array.isArray(data)) setBankAccountOptions(data); })
      .catch(() => {});

    api<any[]>("/api/master-data/daily-exchange-rates")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = [...data].sort((a, b) =>
            new Date(b.date || b.tanggal || 0).getTime() - new Date(a.date || a.tanggal || 0).getTime()
          );
          const tengah = sorted[0].tengah || sorted[0].midRate || sorted[0].kurs_tengah || 0;
          if (tengah > 0) setLatestKursBI(tengah);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (raiseFallMasters.length > 0) {
      const custUpper = (customerCode || "POS").toUpperCase();
      const matched = raiseFallMasters.find((r) => r.customerCode?.toUpperCase() === custUpper) || raiseFallMasters[0];
      setRaiseFallMaster(matched);
      if (matched.actualMRateXn > 0) setMRate(matched.actualMRateXn);
      if (matched.actualFuelFn > 0) setFuelPriceUSD(matched.actualFuelFn);
      if (matched.actualLaborLn > 0) setLaborPriceIDR(matched.actualLaborLn);
    }
  }, [customerCode, raiseFallMasters]);

  const templateRows = useCallback((key: string): any[] => {
    const row = financeTemplates.find((t: any) => t.templateKey === key);
    if (!row) return [];
    try {
      const parsed = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [financeTemplates]);

  const masterBankAccounts = useMemo(() => templateRows("bank_accounts"), [financeTemplates]);
  const rfIndexCalculated = calcRFIndex(fuelPriceUSD, laborPriceIDR, mRate, raiseFallMaster);

  const getBGGActiveCoalTier = (periodStr?: string): "Tier 1" | "Tier 2" | "Tier 3" => {
    if (!Array.isArray(coalIndexMaster) || coalIndexMaster.length === 0) return "Tier 3";
    if (periodStr) {
      const match = coalIndexMaster.find(c => (c.period || "").toLowerCase().includes(periodStr.toLowerCase()) || periodStr.toLowerCase().includes((c.period || "").toLowerCase()));
      if (match) return (match.activeTier as any) || (match.avgR3 > 75 ? "Tier 3" : match.avgR3 >= 50 ? "Tier 2" : "Tier 1");
    }
    const latest = coalIndexMaster[0];
    return (latest.activeTier as any) || (latest.avgR3 > 75 ? "Tier 3" : latest.avgR3 >= 50 ? "Tier 2" : "Tier 1");
  };

  const getSowMasterRate = (customer: string, itemName: string, fallbackRate: number, isUSD: boolean = false, tier?: string) => {
    const custUpper = customer.toUpperCase();
    const itemNorm = itemName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = dynamicSowOptions.find(s => {
      const sCust = (s.customer || s.customerCode || "").toUpperCase();
      const sName = (s.itemName || s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return (sCust === custUpper || (!sCust && custUpper === "POS")) && (sName.includes(itemNorm) || itemNorm.includes(sName));
    });
    if (match) {
      if (tier === "Tier 1" && match.tier1Rate) return match.tier1Rate;
      if (tier === "Tier 2" && match.tier2Rate) return match.tier2Rate;
      if (tier === "Tier 3" && match.tier3Rate) return match.tier3Rate;
      if (isUSD && match.rateUSD) return match.rateUSD;
      if (!isUSD && match.rateIDR) return match.rateIDR;
      if (!isUSD && match.rateUSD) return Math.round(match.rateUSD * (latestKursBI || mRate || 17923.30));
    }
    return fallbackRate;
  };

  const defaultMasterVariableOptions = templateRows("variable_sow_defaults");
  const masterVariableOptions = dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;

  const activeSOWCatalog = useMemo(() => {
    const currentKurs = latestKursBI || mRate || 17923.30;
    if (dynamicSowOptions && dynamicSowOptions.length > 0) {
      const custUpper = (customerCode || "").toUpperCase();
      const filtered = dynamicSowOptions.filter((s) => {
        const sCust = (s.customer || s.customerCode || "").toUpperCase();
        return !sCust || sCust === custUpper || ((custUpper === "POS" || custUpper === "IBP" || custUpper === "BBA") && (!sCust || sCust === "POS"));
      });
      if (filtered.length > 0) {
        return filtered.map((s) => {
          let category = s.category || "Operating & Mining";
          const catNorm = category.toLowerCase();
          if (catNorm.includes("mdo") || catNorm.includes("development") || catNorm.includes("mine development")) {
            category = "MDO";
          } else if (catNorm.includes("distance") || catNorm.includes("overhaul")) {
            category = "Over Distance";
          }
          const isOverhaul = (s.itemName || s.name || "").toLowerCase().includes("overhaul") || catNorm.includes("distance");
          const isCoalOverhaul = isOverhaul && ((s.itemName || s.name || "").toLowerCase().includes("coal") || (s.itemName || s.name || "").toLowerCase().includes("batubara"));
          let rateIDR = s.rateIDR ? s.rateIDR : (s.rateUSD ? Math.round(s.rateUSD * currentKurs) : (s.baseRateUSD ? Math.round(s.baseRateUSD * currentKurs) : 0));
          if (isOverhaul && s.rateUSD) rateIDR = Math.round(s.rateUSD * currentKurs);

          let cleanUnit = (s.unit || "BCM").replace(/^USD\//i, "").replace(/^IDR\//i, "").trim();
          if (cleanUnit.toUpperCase() === "1KM") cleanUnit = "USD/1KM";

          return {
            name: s.itemName || s.name,
            category,
            unit: cleanUnit || "BCM",
            defaultRate: rateIDR,
            usdRate: s.rateUSD || s.baseRateUSD || 0,
            defaultDistance: isCoalOverhaul ? 3000 : (isOverhaul ? 1000 : 1000),
            overhaulRate: 0,
            id: s.id
          };
        });
      }
    }
    return templateRows("sow_catalog");
  }, [dynamicSowOptions, customerCode, latestKursBI, mRate, templateRows]);

  const customerContractMap: Record<string, any> = useMemo(() => {
    const map: Record<string, any> = {};
    (customerRows || []).forEach((c: any) => {
      if (c && c.code) {
        map[String(c.code).toUpperCase()] = {
          project: c.projectSite || `${c.fullName} Site`,
          contract: c.contractNo || `001/${c.code}-AAP/2026`,
          bankName: c.bankName || "Bank BNI",
          bankAccountNo: c.bankAccountNo || "8188788882",
          bankBranch: c.bankBranch || "Harmoni, Jakarta",
          directorName: "GAHARI CHRISTINE",
          directorTitle: "DIRECTOR"
        };
      }
    });
    templateRows("customer_contracts").forEach((c: any) => {
      if (c && c.customerCode) map[String(c.customerCode).toUpperCase()] = { ...map[String(c.customerCode).toUpperCase()], ...c };
    });
    return map;
  }, [financeTemplates, customerRows]);

  const applyRateLookup = (items: any[]): any[] =>
    items.map((it: any) => {
      if (!it || !it.lookup) return it;
      const fb = Number(it.baseRateUSD ?? it.unitRateIDR ?? 0);
      const rate = getSowMasterRate(it.customer || "", it.lookup, fb, Boolean(it.lookupUSD));
      if (it.lookupUSD) {
        return it.unitRateUSD !== undefined ? { ...it, unitRateUSD: rate } : { ...it, baseRateUSD: rate };
      }
      return { ...it, unitRateIDR: rate };
    });

  const blankPOSItems = useMemo(() => {
    const rows = templateRows("invoice_blank_POS");
    return rows && rows.length > 0 ? applyRateLookup(rows) : FALLBACK_BLANK_POS_ITEMS;
  }, [financeTemplates, dynamicSowOptions, mRate, templateRows]);

  const demoPOSItems = useMemo(() => templateRows("invoice_demo_POS"), [financeTemplates]);

  const blankBGGItems = useMemo(() => {
    const rows = templateRows("invoice_blank_BGG");
    return rows && rows.length > 0 ? applyRateLookup(rows) : FALLBACK_BLANK_BGG_ITEMS;
  }, [financeTemplates, dynamicSowOptions, mRate, templateRows]);

  const demoBGGItems = useMemo(() => templateRows("invoice_demo_BGG"), [financeTemplates]);

  const blankPTROItems = useMemo(() => {
    const rows = templateRows("invoice_blank_PTRO");
    const baseRows = rows && rows.length > 0 ? rows : FALLBACK_BLANK_PTRO_ITEMS;
    const currentKurs = latestKursBI || mRate || 17923.30;
    return baseRows.map(r => ({
      ...r,
      kursBI: r.kursBI || currentKurs,
      unitRateUSD: r.unitRateUSD || (r.description?.includes("OVER BURDEN") ? 1.490 : r.description?.includes("COAL") ? 0.840 : r.unitRateUSD)
    }));
  }, [financeTemplates, dynamicSowOptions, mRate, latestKursBI, templateRows]);
  const blankDBKItems = blankPTROItems;
  const demoPTROItems = useMemo(() => templateRows("invoice_demo_PTRO"), [financeTemplates]);
  const demoDBKItems = demoPTROItems;

  const blankSBSItems = useMemo(() => {
    const rows = templateRows("invoice_blank_SBS");
    return rows && rows.length > 0 ? applyRateLookup(rows) : FALLBACK_BLANK_SBS_ITEMS;
  }, [financeTemplates, dynamicSowOptions, mRate, templateRows]);
  const demoSBSItems = useMemo(() => templateRows("invoice_demo_SBS"), [financeTemplates]);

  const defaultPOSBAOperatingItems = useMemo(() => {
    const rows = templateRows("ba_operating_POS");
    return rows.length > 0 ? rows : FALLBACK_POS_OPERATING_ITEMS;
  }, [financeTemplates, templateRows]);

  const defaultPOSBAMDOItems = useMemo(() => {
    const rows = templateRows("ba_mdo_POS");
    return rows.length > 0 ? rows : FALLBACK_POS_MDO_ITEMS;
  }, [financeTemplates, templateRows]);

  const defaultBGGBAItems = useMemo(() => {
    const rows = templateRows("ba_items_BGG");
    return rows.length > 0 ? rows : FALLBACK_BGG_BA_ITEMS;
  }, [financeTemplates, templateRows]);

  const defaultPTROBAItems = useMemo(() => {
    const currentKurs = latestKursBI || mRate || 17923.30;
    const obRateUSD = getSowMasterRate("PTRO", "OVER BURDEN REMOVAL", 1.490, true);
    const cgRateUSD = getSowMasterRate("PTRO", "COAL GETTING", 0.840, true);
    const odObRateUSD = getSowMasterRate("PTRO", "Overhaul OB", 0.028, true);
    const odCgRateIDR = getSowMasterRate("PTRO", "Overhaul Coal Getting", 230, false);
    const rows = templateRows("ba_items_PTRO");
    if (rows.length > 0) {
      return rows.map(r => {
        let rate = r.rate || 0;
        const mat = (r.material || "").toUpperCase();
        if (mat.includes("OVER BURDEN")) rate = Math.round((r.rateUSD || obRateUSD) * currentKurs);
        else if (mat.includes("COAL GETTING") || mat.includes("COAL WINNING")) rate = Math.round((r.rateUSD || cgRateUSD) * currentKurs);
        else if (mat.includes("OVERHAUL OB") || mat.includes("OVER DISTANCE FOR OB")) rate = Math.round((r.rateUSD || odObRateUSD) * currentKurs);
        else if (mat.includes("OVERHAUL COAL") || mat.includes("OVER DISTANCE FOR COAL")) rate = r.rate || odCgRateIDR;
        return { ...r, rate, subtotalInitial: (r.initialVolume || 0) * rate, subtotalAdjusted: (r.adjustedVolume || 0) * rate };
      });
    }
    return [
      { id: "ptro_ba_ob", category: "Operating & Mining", area: "Pit Sapan", material: "OVER BURDEN REMOVAL", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: obRateUSD, distanceBasis: 0, isDistanceVar: false, rate: Math.round(obRateUSD * currentKurs), subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "ptro_ba_cg", category: "Operating & Mining", area: "Pit Sapan", material: "COAL GETTING", unit: "MT", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: cgRateUSD, distanceBasis: 0, isDistanceVar: false, rate: Math.round(cgRateUSD * currentKurs), subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "ptro_ba_odob", category: "Over Distance", area: "Pit Sapan", material: "Overhaul OB", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: odObRateUSD, distanceBasis: 1000, isDistanceVar: true, distanceWeightAvg: 1000, rate: Math.round(odObRateUSD * currentKurs), subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "ptro_ba_odcg", category: "Over Distance", area: "Pit Sapan", material: "Overhaul Coal Getting", unit: "TON", initialVolume: 0, adjustedVolume: 0, isUSD: false, rateIDR: odCgRateIDR, distanceBasis: 3000, isDistanceVar: true, distanceWeightAvg: 3000, rate: odCgRateIDR, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
    ];
  }, [financeTemplates, templateRows, dynamicSowOptions, latestKursBI, mRate]);
  const defaultDBKBAItems = defaultPTROBAItems;

  const defaultSBSBAOperatingItems = useMemo(() => {
    const rows = templateRows("ba_operating_SBS");
    return rows.length > 0 ? rows : FALLBACK_SBS_BA_ITEMS;
  }, [financeTemplates, templateRows]);

  const defaultSBSBAMDOItems = useMemo(() => {
    const rows = templateRows("ba_mdo_SBS");
    return rows.length > 0 ? rows : FALLBACK_SBS_RENTAL_ITEMS;
  }, [financeTemplates, templateRows]);

  const defaultSBSBADeductionItems = useMemo(() => {
    const rows = templateRows("ba_deductions_SBS");
    return rows.length > 0 ? rows : FALLBACK_SBS_DEDUCTION_ITEMS;
  }, [financeTemplates, templateRows]);

  return {
    mRate, setMRate, fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR,
    raiseFallMasters, setRaiseFallMasters, raiseFallMaster, setRaiseFallMaster,
    dynamicSowOptions, setDynamicSowOptions, bankAccountOptions, setBankAccountOptions,
    latestKursBI, setLatestKursBI, coalIndexMaster, setCoalIndexMaster,
    financeTemplates, setFinanceTemplates, templatesLoaded, setTemplatesLoaded,
    templateRows, masterBankAccounts, rfIndexCalculated, getBGGActiveCoalTier,
    getSowMasterRate, defaultMasterVariableOptions, masterVariableOptions,
    activeSOWCatalog, customerContractMap, applyRateLookup,
    blankPOSItems, demoPOSItems, blankBGGItems, demoBGGItems, blankPTROItems, blankDBKItems,
    demoPTROItems, demoDBKItems, blankSBSItems, demoSBSItems,
    defaultPOSBAOperatingItems, defaultPOSBAMDOItems, defaultBGGBAItems,
    defaultPTROBAItems, defaultDBKBAItems, defaultSBSBAOperatingItems,
    defaultSBSBAMDOItems, defaultSBSBADeductionItems
  };
}
