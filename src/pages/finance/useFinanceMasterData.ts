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
  const [mRate, setMRate] = useState(0);
  const [fuelPriceUSD, setFuelPriceUSD] = useState(0);
  const [laborPriceIDR, setLaborPriceIDR] = useState(0);
  const [raiseFallMasters, setRaiseFallMasters] = useState<any[]>([]);
  const [raiseFallMaster, setRaiseFallMaster] = useState<any>(null);

  const [dynamicSowOptions, setDynamicSowOptions] = useState<any[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<any[]>([]);
  const [latestKursBI, setLatestKursBI] = useState(0);
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
              baseRateUSD: d.rateUSD || d.baseRateUSD || 0,
              rateUSD: d.rateUSD || d.baseRateUSD || 0,
              rateIDR: d.rateIDR || d.baseRateIDR || 0,
              baseDistanceMeters: d.baseDistanceMeters || 0,
              isDistanceVar: d.category === "Distance" || (d.unit || "").toLowerCase().includes("m") || (d.unit || "").toLowerCase().includes("km"),
            }))
          );
        }
      })
      .catch(() => {});

    api<any[]>("/api/master-data/daily-exchange-rates")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = [...data].sort((a, b) =>
            new Date(b.date || b.tanggal || 0).getTime() - new Date(a.date || a.tanggal || 0).getTime()
          );
          const tengah = sorted[0].tengah || sorted[0].midRate || sorted[0].kurs_tengah || sorted[0].kursTengah || 0;
          if (tengah > 0) setLatestKursBI(tengah);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (raiseFallMasters.length > 0) {
      const custUpper = (customerCode || "POS").toUpperCase();
      const matched = raiseFallMasters.find((r) => r.customerCode?.toUpperCase() === custUpper);
      if (matched) {
        setRaiseFallMaster(matched);
        setMRate(matched.actualMRateXn || 0);
        setFuelPriceUSD(matched.actualFuelFn || 0);
        setLaborPriceIDR(matched.actualLaborLn || 0);
      } else {
        setRaiseFallMaster(null);
        setMRate(0);
        setFuelPriceUSD(0);
        setLaborPriceIDR(0);
      }
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

  const normalizeMonthKey = (str: string): string => {
    const s = (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (s.includes("jan")) return "jan";
    if (s.includes("feb")) return "feb";
    if (s.includes("mar")) return "mar";
    if (s.includes("apr")) return "apr";
    if (s.includes("may") || s.includes("mei")) return "mei";
    if (s.includes("jun")) return "jun";
    if (s.includes("jul")) return "jul";
    if (s.includes("aug") || s.includes("agt") || s.includes("agus")) return "agu";
    if (s.includes("sep")) return "sep";
    if (s.includes("oct") || s.includes("okt")) return "okt";
    if (s.includes("nov")) return "nov";
    if (s.includes("dec") || s.includes("des")) return "des";
    return s;
  };

  const getBGGActiveCoalTier = (periodStr?: string): "Tier 1" | "Tier 2" | "Tier 3" => {
    if (!Array.isArray(coalIndexMaster) || coalIndexMaster.length === 0) return "Tier 2";
    if (periodStr) {
      const pKey = normalizeMonthKey(periodStr);
      const match = coalIndexMaster.find(c => {
        const cKey = normalizeMonthKey(c.period || "");
        return (pKey && cKey && pKey === cKey) ||
          (c.period || "").toLowerCase().includes(periodStr.toLowerCase()) ||
          periodStr.toLowerCase().includes((c.period || "").toLowerCase());
      });
      if (match) return (match.activeTier as any) || (match.avgR3 > 75 ? "Tier 3" : match.avgR3 >= 50 ? "Tier 2" : "Tier 1");
    }
    const latest = coalIndexMaster[0];
    return (latest.activeTier as any) || (latest.avgR3 > 75 ? "Tier 3" : latest.avgR3 >= 50 ? "Tier 2" : "Tier 1");
  };

  const defaultMasterVariableOptions = templateRows("variable_sow_defaults");
  const masterVariableOptions = dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;

  const getSowMasterRate = useCallback((customer: string, itemName: string, fallbackRate: number, isUSD: boolean = false, tier?: string): number => {
    const custUpper = (customer || customerCode || "POS").toUpperCase();
    const itemNorm = (itemName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!itemNorm) return fallbackRate;

    const currentKurs = latestKursBI || mRate || 17923.30;
    const catalog = dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;

    // Filter catalog for customer and prioritize items with configured non-zero rates
    const filtered = catalog
      .filter((s: any) => {
        const sCust = (s.customer || s.customerCode || "").toUpperCase();
        return !sCust || sCust === custUpper || ((custUpper === "POS" || custUpper === "IBP" || custUpper === "BBA") && (!sCust || sCust === "POS"));
      })
      .sort((a: any, b: any) => {
        const aHasRate = (a.rateIDR || a.tier1Rate || a.tier2Rate || a.tier3Rate || a.rateUSD || a.baseRateUSD) ? 1 : 0;
        const bHasRate = (b.rateIDR || b.tier1Rate || b.tier2Rate || b.tier3Rate || b.rateUSD || b.baseRateUSD) ? 1 : 0;
        return bHasRate - aHasRate;
      });

    // Match priority 1: Exact normalized match
    let match = filtered.find((s: any) => {
      const sName = (s.itemName || s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return sName === itemNorm;
    });

    // Match priority 2: Substring inclusion
    if (!match) {
      match = filtered.find((s: any) => {
        const sName = (s.itemName || s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return sName.length > 3 && itemNorm.length > 3 && (sName.includes(itemNorm) || itemNorm.includes(sName));
      });
    }

    // Match priority 3: Domain keyword matching
    if (!match) {
      if (custUpper === "BGG") {
        if (itemNorm.includes("75") || (itemNorm.includes("ob") && itemNorm.includes("1") && !itemNorm.includes("distance") && !itemNorm.includes("overhaul"))) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").includes("75%"));
        } else if (itemNorm.includes("25") || (itemNorm.includes("ob") && itemNorm.includes("2") && !itemNorm.includes("distance") && !itemNorm.includes("overhaul"))) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").includes("25%"));
        } else if ((itemNorm.includes("distance") || itemNorm.includes("overhaul")) && (itemNorm.includes("coal") || itemNorm.includes("cw"))) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("distance") || n.includes("overhaul")) && (n.includes("coal") || n.includes("cw"));
          });
        } else if ((itemNorm.includes("distance") || itemNorm.includes("overhaul")) && (itemNorm.includes("ob") || itemNorm.includes("burden") || itemNorm.includes("waste"))) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("distance") || n.includes("overhaul")) && (n.includes("ob") || n.includes("burden") || n.includes("waste"));
          });
        } else if (itemNorm.includes("coal") && !itemNorm.includes("distance") && !itemNorm.includes("overhaul")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("coal") && !n.includes("distance") && !n.includes("overhaul");
          });
        } else if ((itemNorm.includes("ob") || itemNorm.includes("burden") || itemNorm.includes("overburden")) && !itemNorm.includes("distance") && !itemNorm.includes("overhaul")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("over burden") || n.includes("ob")) && !n.includes("distance") && !n.includes("overhaul");
          });
        }
      } else if (custUpper === "PTRO" || custUpper === "DBK") {
        if ((itemNorm.includes("overhaul") || itemNorm.includes("distance")) && (itemNorm.includes("ob") || itemNorm.includes("burden"))) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("overhaul ob"));
        } else if ((itemNorm.includes("overhaul") || itemNorm.includes("distance")) && itemNorm.includes("coal")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("overhaul coal"));
        } else if (itemNorm.includes("overburden") || itemNorm.includes("burden") || itemNorm.includes("ob")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("over burden") || n.includes("overburden")) && !n.includes("overhaul");
          });
        } else if (itemNorm.includes("coal")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("coal getting") || n.includes("coal winning")) && !n.includes("overhaul");
          });
        }
      } else if (custUpper === "SBS") {
        if (itemNorm.includes("d10") || itemNorm.includes("bdct")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("d10"));
        } else if (itemNorm.includes("395") || itemNorm.includes("exct")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("395"));
        }
      } else if (custUpper === "POS") {
        if (itemNorm.includes("topsoil") || itemNorm.includes("top soil")) {
          const isOverhaul = itemNorm.includes("overhaul") || itemNorm.includes("underhaul") || itemNorm.includes("distance");
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("top") && (isOverhaul ? (n.includes("over") || n.includes("under")) : (!n.includes("over") && !n.includes("under")));
          });
        } else if (itemNorm.includes("limonite")) {
          const isOverhaul = itemNorm.includes("overhaul") || itemNorm.includes("underhaul") || itemNorm.includes("distance");
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("limonite") && (isOverhaul ? (n.includes("over") || n.includes("under")) : (!n.includes("over") && !n.includes("under")));
          });
        } else if (itemNorm.includes("saprolite")) {
          const isOverhaul = itemNorm.includes("overhaul") || itemNorm.includes("underhaul") || itemNorm.includes("distance");
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("saprolite") && (isOverhaul ? (n.includes("over") || n.includes("under")) : (!n.includes("over") && !n.includes("under")));
          });
        } else if (itemNorm.includes("overburden") || itemNorm.includes("burden") || itemNorm.includes("waste") || itemNorm.includes("ob")) {
          const isOverhaul = itemNorm.includes("overhaul") || itemNorm.includes("underhaul") || itemNorm.includes("distance");
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("waste") || n.includes("overburden") || n.includes("ob")) && (isOverhaul ? (n.includes("over") || n.includes("under")) : (!n.includes("over") && !n.includes("under")));
          });
        }
      }
    }

    if (match) {
      const activeTier = tier || (custUpper === "BGG" ? getBGGActiveCoalTier() : undefined);
      if (activeTier === "Tier 1" && match.tier1Rate) return match.tier1Rate;
      if (activeTier === "Tier 2" && match.tier2Rate) return match.tier2Rate;
      if (activeTier === "Tier 3" && match.tier3Rate) return match.tier3Rate;
      if (isUSD) {
        if (match.rateUSD) return match.rateUSD;
        if (match.baseRateUSD) return match.baseRateUSD;
        if (match.rateIDR) return Number((match.rateIDR / currentKurs).toFixed(4));
      } else {
        if (match.rateIDR) return match.rateIDR;
        if (match.baseRateIDR) return match.baseRateIDR;
        if (match.tier3Rate) return match.tier3Rate;
        if (match.tier2Rate) return match.tier2Rate;
        if (match.tier1Rate) return match.tier1Rate;
        if (match.rateUSD) return Math.round(match.rateUSD * currentKurs);
        if (match.baseRateUSD) return Math.round(match.baseRateUSD * currentKurs);
      }
    }
    return fallbackRate;
  }, [dynamicSowOptions, defaultMasterVariableOptions, customerCode, latestKursBI, mRate, coalIndexMaster]);

  const activeSOWCatalog = useMemo(() => {
    const currentKurs = latestKursBI || mRate || 17923.30;
    const catalog = dynamicSowOptions && dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;
    if (catalog && catalog.length > 0) {
      const custUpper = (customerCode || "").toUpperCase();
      const filtered = catalog.filter((s: any) => {
        const sCust = (s.customer || s.customerCode || "").toUpperCase();
        return !sCust || sCust === custUpper || ((custUpper === "POS" || custUpper === "IBP" || custUpper === "BBA") && (!sCust || sCust === "POS"));
      });
      if (filtered.length > 0) {
        return filtered.map((s: any) => {
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

          if (custUpper === "BGG") {
            const activeTier = getBGGActiveCoalTier();
            if (activeTier === "Tier 1" && s.tier1Rate) rateIDR = s.tier1Rate;
            else if (activeTier === "Tier 2" && s.tier2Rate) rateIDR = s.tier2Rate;
            else if (activeTier === "Tier 3" && s.tier3Rate) rateIDR = s.tier3Rate;
            else if (s.tier3Rate) rateIDR = s.tier3Rate;
          }

          let cleanUnit = (s.unit || "BCM").replace(/^USD\//i, "").replace(/^IDR\//i, "").trim();
          if (cleanUnit.toUpperCase() === "1KM") cleanUnit = "USD/1KM";

          return {
            name: s.itemName || s.name,
            category,
            unit: cleanUnit || "BCM",
            defaultRate: rateIDR,
            usdRate: s.rateUSD || s.baseRateUSD || 0,
            defaultDistance: custUpper === "BGG" ? 1000 : (isCoalOverhaul ? 3000 : 1000),
            overhaulRate: 0,
            id: s.id
          };
        });
      }
    }
    return templateRows("sow_catalog");
  }, [dynamicSowOptions, defaultMasterVariableOptions, customerCode, latestKursBI, mRate, templateRows]);

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

  const applyRateLookup = useCallback((items: any[], defaultCust?: string): any[] =>
    items.map((it: any) => {
      if (!it || !it.lookup) return it;
      const cust = it.customer || defaultCust || customerCode || "";
      const fb = Number(it.baseRateUSD ?? it.unitRateIDR ?? 0);
      const rate = getSowMasterRate(cust, it.lookup, fb, Boolean(it.lookupUSD));
      if (it.lookupUSD) {
        return it.unitRateUSD !== undefined ? { ...it, unitRateUSD: rate } : { ...it, baseRateUSD: rate };
      }
      return { ...it, unitRateIDR: rate };
    }), [customerCode, getSowMasterRate]);

  const blankPOSItems = useMemo(() => {
    const rows = templateRows("invoice_blank_POS");
    return rows && rows.length > 0 ? applyRateLookup(rows, "POS") : FALLBACK_BLANK_POS_ITEMS;
  }, [financeTemplates, dynamicSowOptions, mRate, templateRows, applyRateLookup]);

  const demoPOSItems = useMemo(() => templateRows("invoice_demo_POS"), [financeTemplates]);

  const blankBGGItems = useMemo(() => {
    const rows = templateRows("invoice_blank_BGG");
    return rows && rows.length > 0 ? applyRateLookup(rows, "BGG") : FALLBACK_BLANK_BGG_ITEMS;
  }, [financeTemplates, dynamicSowOptions, mRate, templateRows, applyRateLookup]);

  const demoBGGItems = useMemo(() => templateRows("invoice_demo_BGG"), [financeTemplates]);

  const blankPTROItems = useMemo(() => {
    const rows = templateRows("invoice_blank_PTRO");
    const baseRows = rows && rows.length > 0 ? rows : FALLBACK_BLANK_PTRO_ITEMS;
    const currentKurs = latestKursBI || mRate || 17923.30;
    const obRateUSD = getSowMasterRate("PTRO", "OVER BURDEN REMOVAL", 1.490, true);
    const cgRateUSD = getSowMasterRate("PTRO", "COAL GETTING", 0.840, true);
    const odObRateUSD = getSowMasterRate("PTRO", "Overhaul OB", 0.028, true);
    const odCgRateIDR = getSowMasterRate("PTRO", "Overhaul Coal Getting", 230, false);
    return baseRows.map(r => {
      const d = (r.description || "").toUpperCase();
      let rateUSD = r.unitRateUSD;
      let rateIDR = r.unitRateIDR;
      if (d.includes("OVER BURDEN") && !d.includes("OVER DISTANCE") && !d.includes("OVERHAUL")) rateUSD = obRateUSD;
      else if (d.includes("COAL") && !d.includes("OVER DISTANCE") && !d.includes("OVERHAUL")) rateUSD = cgRateUSD;
      else if ((d.includes("OVER DISTANCE") || d.includes("OVERHAUL")) && d.includes("OB")) rateUSD = odObRateUSD;
      else if ((d.includes("OVER DISTANCE") || d.includes("OVERHAUL")) && d.includes("COAL")) rateIDR = odCgRateIDR;
      return {
        ...r,
        kursBI: r.kursBI || currentKurs,
        unitRateUSD: rateUSD,
        unitRateIDR: rateIDR
      };
    });
  }, [financeTemplates, dynamicSowOptions, mRate, latestKursBI, templateRows, getSowMasterRate]);
  const blankDBKItems = blankPTROItems;
  const demoPTROItems = useMemo(() => templateRows("invoice_demo_PTRO"), [financeTemplates]);
  const demoDBKItems = demoPTROItems;

  const blankSBSItems = useMemo(() => {
    const rows = templateRows("invoice_blank_SBS");
    return rows && rows.length > 0 ? applyRateLookup(rows, "SBS") : FALLBACK_BLANK_SBS_ITEMS;
  }, [financeTemplates, dynamicSowOptions, mRate, templateRows, applyRateLookup]);
  const demoSBSItems = useMemo(() => templateRows("invoice_demo_SBS"), [financeTemplates]);

  const zeroBAVolumes = (items: any[], zeroDistanceAndRate: boolean = false): any[] =>
    (items || []).map((it) => ({
      ...it,
      initialVolume: 0,
      adjustedVolume: 0,
      subtotalInitial: 0,
      subtotalAdjusted: 0,
      ...(zeroDistanceAndRate ? { distance: 0, distanceWeightAvg: 0, rate: 0 } : {}),
    }));

  const syncBARatesWithMasterData = useCallback((items: any[], cust: string, period?: string): any[] => {
    return (items || []).map((it) => {
      const mat = it.material || it.name || it.description || "";
      if (!mat || it.isCustom) return it;
      const isUSD = Boolean(it.isUSD);
      const itemPeriod = it.period || period;
      const tier = cust.toUpperCase() === "BGG" ? getBGGActiveCoalTier(itemPeriod) : undefined;
      const masterRate = getSowMasterRate(cust, mat, it.rate || 0, isUSD, tier);
      if (masterRate > 0) {
        return {
          ...it,
          rate: masterRate,
          ...(isUSD ? { rateUSD: getSowMasterRate(cust, mat, it.rateUSD || 0, true, tier) } : {})
        };
      }
      return it;
    });
  }, [getSowMasterRate, getBGGActiveCoalTier]);

  const defaultPOSBAOperatingItems = useMemo(() => {
    const rows = templateRows("ba_operating_POS");
    const base = zeroBAVolumes(rows.length > 0 ? rows : FALLBACK_POS_OPERATING_ITEMS);
    return syncBARatesWithMasterData(base, "POS");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

  const defaultPOSBAMDOItems = useMemo(() => {
    const rows = templateRows("ba_mdo_POS");
    const base = zeroBAVolumes(rows.length > 0 ? rows : FALLBACK_POS_MDO_ITEMS);
    return syncBARatesWithMasterData(base, "POS");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

  const defaultBGGBAItems = useMemo(() => {
    const rows = templateRows("ba_items_BGG");
    const base = zeroBAVolumes(rows.length > 0 ? rows : FALLBACK_BGG_BA_ITEMS);
    return syncBARatesWithMasterData(base, "BGG");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

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
        return { ...r, rate, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0 };
      });
    }
    return [
      { id: "ptro_ba_ob", category: "Operating & Mining", area: "Pit Sapan", material: "OVER BURDEN REMOVAL", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: obRateUSD, distanceBasis: 0, isDistanceVar: false, rate: Math.round(obRateUSD * currentKurs), subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "ptro_ba_cg", category: "Operating & Mining", area: "Pit Sapan", material: "COAL GETTING", unit: "MT", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: cgRateUSD, distanceBasis: 0, isDistanceVar: false, rate: Math.round(cgRateUSD * currentKurs), subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "ptro_ba_odob", category: "Over Distance", area: "Pit Sapan", material: "Overhaul OB", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: odObRateUSD, distanceBasis: 1000, isDistanceVar: true, distanceWeightAvg: 1000, rate: Math.round(odObRateUSD * currentKurs), subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "ptro_ba_odcg", category: "Over Distance", area: "Pit Sapan", material: "Overhaul Coal Getting", unit: "TON", initialVolume: 0, adjustedVolume: 0, isUSD: false, rateIDR: odCgRateIDR, distanceBasis: 3000, isDistanceVar: true, distanceWeightAvg: 3000, rate: odCgRateIDR, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
    ];
  }, [financeTemplates, templateRows, dynamicSowOptions, latestKursBI, mRate, getSowMasterRate]);
  const defaultDBKBAItems = defaultPTROBAItems;

  const defaultSBSBAOperatingItems = useMemo(() => {
    const rows = templateRows("ba_operating_SBS");
    const base = zeroBAVolumes(rows.length > 0 ? rows : FALLBACK_SBS_BA_ITEMS, true);
    return syncBARatesWithMasterData(base, "SBS");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

  const defaultSBSBAMDOItems = useMemo(() => {
    const rows = templateRows("ba_mdo_SBS");
    const base = zeroBAVolumes(rows.length > 0 ? rows : FALLBACK_SBS_RENTAL_ITEMS);
    return syncBARatesWithMasterData(base, "SBS");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

  const defaultSBSBADeductionItems = useMemo(() => {
    const rows = templateRows("ba_deductions_SBS");
    const base = rows.length > 0 ? rows : FALLBACK_SBS_DEDUCTION_ITEMS;
    return base.map((r: any) => ({ ...r, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 }));
  }, [financeTemplates, templateRows]);

  const reloadMasterData = useCallback(async () => {
    try {
      const [sowData, fxData, rfData] = await Promise.all([
        api<any[]>("/api/master-data/variable-sow").catch(() => []),
        api<any[]>("/api/master-data/daily-exchange-rates").catch(() => []),
        api<any[]>("/api/master-data/raise-fall").catch(() => []),
      ]);
      if (Array.isArray(rfData) && rfData.length > 0) {
        setRaiseFallMasters(rfData);
      }
      if (Array.isArray(sowData) && sowData.length > 0) {
        setDynamicSowOptions(
          sowData.map((d) => ({
            id: d.id,
            code: d.itemName ? d.itemName.toUpperCase().replace(/[^A-Z0-9]/g, "_") : `SOW_${d.id}`,
            name: d.itemName,
            itemName: d.itemName,
            category: d.category,
            unit: d.unit,
            customer: d.customer || d.customerCode || "",
            customerCode: d.customerCode || d.customer || "",
            baseRateUSD: d.rateUSD || d.baseRateUSD || 0,
            rateUSD: d.rateUSD || d.baseRateUSD || 0,
            rateIDR: d.rateIDR || d.baseRateIDR || (d.rateUSD ? Math.round(d.rateUSD * (latestKursBI || 0)) : 0),
            tier1Rate: d.tier1Rate || 0,
            tier2Rate: d.tier2Rate || 0,
            tier3Rate: d.tier3Rate || 0,
            splitPercentage: d.splitPercentage || 0,
            baseDistanceMeters: d.baseDistanceMeters || 0,
          }))
        );
      }
      if (Array.isArray(fxData) && fxData.length > 0) {
        const sorted = [...fxData].sort((a, b) =>
          new Date(b.date || b.tanggal || 0).getTime() - new Date(a.date || a.tanggal || 0).getTime()
        );
        const tengah = sorted[0].tengah || sorted[0].midRate || sorted[0].kurs_tengah || sorted[0].kursTengah || 0;
        if (tengah > 0) setLatestKursBI(tengah);
      }
    } catch {
      // silent
    }
  }, [latestKursBI]);

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
    defaultSBSBAMDOItems, defaultSBSBADeductionItems, syncBARatesWithMasterData, reloadMasterData
  };
}
