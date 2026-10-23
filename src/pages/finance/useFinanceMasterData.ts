import { useState, useEffect, useCallback, useMemo } from "react";
import { api, getFinanceTemplates } from "../../lib/api";
import { matchPeriod } from "./helpers";
import { isOBMaterial, isDistanceItem } from "./ba_calculations";
import { setMasterData, rfMasterFor, kursForPeriod, customerKind, baseDistanceFor, sowNamePartialMatch, isRentalAlatSOW } from "./masterRegistry";
import { getSBSTarifByDistance } from "./distance_tiers";

// Master data finance dari BE. RF & kurs mengikuti customer + periode dokumen (BA / Invoice) yang sedang dibuka.
// Baris Master Variable SOW BE -> bentuk katalog FE (tarif USD dikonversi dengan kurs periode saat dipakai).
// Item Inactive tidak ikut kalkulasi BA/Invoice (sama dengan BE sowFor/obSplitSOWs).
const mapSowRow = (d: any) => ({
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
  rateIDR: d.rateIDR || 0,
  tier1Rate: d.tier1Rate || 0,
  tier2Rate: d.tier2Rate || 0,
  tier3Rate: d.tier3Rate || 0,
  splitPercentage: d.splitPercentage || 0,
  baseDistanceMeters: d.baseDistanceMeters || 0,
  maxDistanceMeters: d.maxDistanceMeters || 0,
  fuelLtrPerHour: d.fuelLtrPerHour || 0,
  description: d.description || "",
  status: d.status,
  isDistanceVar: d.category === "Over Distance" || d.category === "Distance" || (d.unit || "").toLowerCase().includes("100 m") || (d.unit || "").toLowerCase().includes("1km") || (d.itemName || "").toLowerCase().includes("overhaul") || (d.itemName || "").toLowerCase().includes("over distance"),
});

export function useFinanceMasterData(customerCode: string = "", customerRows: any[] = [], workPeriod: string = "") {
  const [mRate, setMRate] = useState(0);
  const [fuelPriceUSD, setFuelPriceUSD] = useState(0);
  const [laborPriceIDR, setLaborPriceIDR] = useState(0);
  const [raiseFallMasters, setRaiseFallMasters] = useState<any[]>([]);
  const [raiseFallMaster, setRaiseFallMaster] = useState<any>(null);
  const [minWageMasters, setMinWageMasters] = useState<any[]>([]);

  const [dynamicSowOptions, setDynamicSowOptions] = useState<any[]>([]);
  // Katalog Variable SOW lengkap (termasuk Inactive) untuk tampilan Client Setup; kalkulasi memakai dynamicSowOptions (Active).
  const [sowCatalog, setSowCatalog] = useState<any[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<any[]>([]);
  const [coalIndexMaster, setCoalIndexMaster] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const [financeTemplates, setFinanceTemplates] = useState<any[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  useEffect(() => {
    getFinanceTemplates()
      .then((templates) => {
        if (Array.isArray(templates) && templates.length > 0) {
          setFinanceTemplates(templates);
        }
        setTemplatesLoaded(true);
      })
      .catch(() => setTemplatesLoaded(true));

    api<any[]>("/api/master-data/raise-fall")
      .then((data) => {
        if (Array.isArray(data)) setRaiseFallMasters(data);
      })
      .catch(() => {});

    api<any[]>("/api/master-data/coal-index")
      .then((data) => { if (Array.isArray(data) && data.length > 0) setCoalIndexMaster(data); })
      .catch(() => {});

    api<any[]>("/api/master-data/min-wages")
      .then((data) => { if (Array.isArray(data)) setMinWageMasters(data); })
      .catch(() => {});

    api<any[]>("/api/master-data/variable-sow")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSowCatalog(data);
          setDynamicSowOptions(data.filter((d) => d.status !== "Inactive").map(mapSowRow));
        }
      })
      .catch(() => {});

    api<any[]>("/api/master-data/daily-exchange-rates")
      .then((data) => { if (Array.isArray(data)) setExchangeRates(data); })
      .catch(() => {});

    api<any[]>("/api/master-data/bank-accounts")
      .then((data) => { if (Array.isArray(data)) setBankAccounts(data); })
      .catch(() => {});
  }, []);

  // Registry master dipakai helper hitung (ba_calculations, tarif jarak, nama customer).
  // Diisi saat render (bukan useEffect) agar view yang membaca registry di render yang sama tidak tertinggal satu langkah.
  useMemo(() => {
    setMasterData({ customers: customerRows || [], raiseFall: raiseFallMasters, exchangeRates, minWages: minWageMasters, bankAccounts, sows: dynamicSowOptions, coalIndex: coalIndexMaster });
  }, [customerRows, raiseFallMasters, exchangeRates, minWageMasters, bankAccounts, dynamicSowOptions, coalIndexMaster]);

  // Kurs = M-Rate periode dokumen dari Master Kurs BI (bukan rata-rata seluruh periode).
  const latestKursBI = useMemo(() => kursForPeriod(workPeriod, exchangeRates), [exchangeRates, workPeriod]);

  // Master Raise & Fall customer untuk periode dokumen.
  useEffect(() => {
    const matched = rfMasterFor(customerCode, workPeriod) || null;
    setRaiseFallMaster(matched);
    setMRate(latestKursBI || matched?.actualMRateXn || 0);
    setFuelPriceUSD(matched?.actualFuelFn || 0);
    setLaborPriceIDR(matched?.actualLaborLn || 0);
  }, [customerCode, workPeriod, raiseFallMasters, customerRows, latestKursBI]);

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
  // Indeks RF periode dihitung BE dari bobot & basis Master Raise & Fall; tanpa master periode = tanpa eskalasi.
  const rfIndexCalculated = Number(raiseFallMaster?.rfIndexResult) > 0 ? Number(raiseFallMaster.rfIndexResult) : 1.0;

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

  // Tier tarif dari Master Coal Index periode (dihitung BE). Tanpa data periode -> tarif dasar SOW.
  const getBGGActiveCoalTier = (periodStr?: string): string | undefined => {
    const match = coalIndexMaster.find((c) => matchPeriod(c.period, periodStr || workPeriod));
    return match?.activeTier || undefined;
  };

  const defaultMasterVariableOptions = templateRows("variable_sow_defaults");
  const masterVariableOptions = dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;

  // Tarif SOW periode: tier Coal Index (BGG) & kurs BI periode tersebut (sama dengan BE sowRateIDR).
  const getSowMasterRate = useCallback((customer: string, itemName: string, fallbackRate: number, isUSD: boolean = false, period?: string): number => {
    const custUpper = customerKind(customer || customerCode);
    const itemNorm = (itemName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!itemNorm) return fallbackRate;

    const currentKurs = kursForPeriod(period) || latestKursBI || mRate || 0;
    const catalog = dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;

    // Filter catalog for customer: baris milik customer didahulukan dari baris generik (tanpa kode customer),
    // lalu yang punya tarif non-nol.
    const ownRow = (s: any) => ((s.customer || s.customerCode || "").toUpperCase() ? 1 : 0);
    const hasRate = (s: any) => (s.rateIDR || s.tier1Rate || s.tier2Rate || s.tier3Rate || s.rateUSD || s.baseRateUSD) ? 1 : 0;
    const filtered = catalog
      .filter((s: any) => {
        const sCust = (s.customer || s.customerCode || "").toUpperCase();
        return !sCust || sCust === custUpper || ((custUpper === "POS" || custUpper === "IBP" || custUpper === "BBA") && (!sCust || sCust === "POS"));
      })
      .sort((a: any, b: any) => ownRow(b) - ownRow(a) || hasRate(b) - hasRate(a));

    // Match priority 1: Exact normalized match
    let match = filtered.find((s: any) => {
      const sName = (s.itemName || s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return sName === itemNorm;
    });

    // Match priority 2: Substring inclusion (item jarak tidak boleh jatuh ke tarif produksi induknya, dan sebaliknya)
    if (!match) {
      match = filtered.find((s: any) => sowNamePartialMatch((s.itemName || s.name || "").toLowerCase().replace(/[^a-z0-9]/g, ""), itemNorm));
    }

    // Match priority 3: Domain keyword matching
    if (!match) {
      if (custUpper === "BGG") {
        if (itemNorm.includes("75") || (isOBMaterial(itemNorm) && itemNorm.includes("1") && !itemNorm.includes("distance") && !itemNorm.includes("overhaul"))) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").includes("75%"));
        } else if (itemNorm.includes("25") || (isOBMaterial(itemNorm) && itemNorm.includes("2") && !itemNorm.includes("distance") && !itemNorm.includes("overhaul"))) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").includes("25%"));
        } else if ((itemNorm.includes("distance") || itemNorm.includes("overhaul")) && (itemNorm.includes("coal") || itemNorm.includes("cw"))) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("distance") || n.includes("overhaul")) && (n.includes("coal") || n.includes("cw"));
          });
        } else if ((itemNorm.includes("distance") || itemNorm.includes("overhaul")) && (isOBMaterial(itemNorm) || itemNorm.includes("burden") || itemNorm.includes("waste"))) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("distance") || n.includes("overhaul")) && (isOBMaterial(n) || n.includes("burden") || n.includes("waste"));
          });
        } else if (itemNorm.includes("coal") && !itemNorm.includes("distance") && !itemNorm.includes("overhaul")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("coal") && !n.includes("distance") && !n.includes("overhaul");
          });
        } else if ((isOBMaterial(itemNorm) || itemNorm.includes("burden") || itemNorm.includes("overburden")) && !itemNorm.includes("distance") && !itemNorm.includes("overhaul")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("over burden") || isOBMaterial(n)) && !n.includes("distance") && !n.includes("overhaul");
          });
        }
      } else if (custUpper === "PTRO" || custUpper === "DBK") {
        if ((itemNorm.includes("overhaul") || itemNorm.includes("distance")) && (isOBMaterial(itemNorm) || itemNorm.includes("burden"))) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("overhaul ob"));
        } else if ((itemNorm.includes("overhaul") || itemNorm.includes("distance")) && itemNorm.includes("coal")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("overhaul coal"));
        } else if (itemNorm.includes("overburden") || itemNorm.includes("burden") || isOBMaterial(itemNorm)) {
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
        const isOverhaul = itemNorm.includes("overhaul") || itemNorm.includes("underhaul") || itemNorm.includes("distance");
        if (itemNorm.includes("topsoil") || itemNorm.includes("top soil")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("top") && (isOverhaul ? (n.includes("over") || n.includes("under")) : (!n.includes("over") && !n.includes("under")));
          });
        } else if (itemNorm.includes("limonite")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("limonite") && (isOverhaul ? (n.includes("over") || n.includes("under")) : (!n.includes("over") && !n.includes("under")));
          });
        } else if (itemNorm.includes("saprolite")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("saprolite") && (isOverhaul ? (n.includes("over") || n.includes("under")) : (!n.includes("over") && !n.includes("under")));
          });
        } else if (itemNorm.includes("overburden") || itemNorm.includes("burden") || itemNorm.includes("waste") || isOBMaterial(itemNorm)) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("waste") || n.includes("overburden") || isOBMaterial(n)) && (isOverhaul ? (n.includes("over") || n.includes("under")) : (!n.includes("over") && !n.includes("under")));
          });
        } else if (itemNorm.includes("clear") || itemNorm.includes("grub")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("clear") || n.includes("grub");
          });
        } else if (itemNorm.includes("recontour")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("recontour"));
        } else if (itemNorm.includes("reveget")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("reveget"));
        } else if (itemNorm.includes("uncrushed")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("uncrushed") && (isOverhaul ? (n.includes("over") || n.includes("under")) : (!n.includes("over") && !n.includes("under")));
          });
        } else if (itemNorm.includes("crusher") || itemNorm.includes("crushed")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("crusher"));
        } else if (itemNorm.includes("geotextile")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("geotextile") && !itemNorm.includes("ditch"));
        } else if (itemNorm.includes("culvert")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("culvert"));
        } else if (itemNorm.includes("subbase") || itemNorm.includes("sub base")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("sub base") || n.includes("subbase");
          });
        } else if (itemNorm.includes("basecourse") || itemNorm.includes("base course")) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return (n.includes("base course") || n.includes("basecourse")) && !n.includes("sub");
          });
        } else if (itemNorm.includes("sediment")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("sediment"));
        } else if (itemNorm.includes("berm")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("berm"));
        } else if (itemNorm.includes("ditch")) {
          const withGeo = itemNorm.includes("tanpa") ? false : itemNorm.includes("geotextile") || itemNorm.includes("lapis");
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("ditch") && (withGeo ? !n.includes("tanpa") : n.includes("tanpa"));
          });
        } else if (itemNorm.includes("boulder") || (itemNorm.includes("rock") && !itemNorm.includes("crush"))) {
          match = filtered.find((s: any) => {
            const n = (s.itemName || s.name || "").toLowerCase();
            return n.includes("boulder") || (n.includes("rock") && !n.includes("crush"));
          });
        } else if (itemNorm.includes("rehandle") || itemNorm.includes("rehandling")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("rehandl"));
        } else if (itemNorm.includes("haulroad") || itemNorm.includes("road maintenance")) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("haul road") || (s.itemName || s.name || "").toLowerCase().includes("maintenance"));
        } else if (itemNorm.includes("cutfill") || (itemNorm.includes("cut") && itemNorm.includes("fill"))) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("cut & fill"));
        } else if (itemNorm.includes("cuthal") || (itemNorm.includes("cut") && itemNorm.includes("haul"))) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("cut & haul"));
        } else if (itemNorm.includes("cutdispose") || (itemNorm.includes("cut") && itemNorm.includes("dispose"))) {
          match = filtered.find((s: any) => (s.itemName || s.name || "").toLowerCase().includes("cut & dispose"));
        }
      }
    }

    if (match) {
      const activeTier = custUpper === "BGG" ? getBGGActiveCoalTier(period) : undefined;
      if (activeTier === "Tier 1" && match.tier1Rate) return match.tier1Rate;
      if (activeTier === "Tier 2" && match.tier2Rate) return match.tier2Rate;
      if (activeTier === "Tier 3" && match.tier3Rate) return match.tier3Rate;
      if (isUSD) {
        if (match.rateUSD) return match.rateUSD;
        if (match.baseRateUSD) return match.baseRateUSD;
        if (match.rateIDR && currentKurs > 0) return Number((match.rateIDR / currentKurs).toFixed(4));
      } else {
        if (match.rateIDR) return match.rateIDR;
        if (match.baseRateIDR) return match.baseRateIDR;
        if (match.tier3Rate) return match.tier3Rate;
        if (match.tier2Rate) return match.tier2Rate;
        if (match.tier1Rate) return match.tier1Rate;
        if (match.rateUSD) return match.rateUSD * currentKurs;
        if (match.baseRateUSD) return match.baseRateUSD * currentKurs;
      }
    }
    return fallbackRate;
  }, [dynamicSowOptions, defaultMasterVariableOptions, customerCode, latestKursBI, mRate, coalIndexMaster]);

  const activeSOWCatalog = useMemo(() => {
    const currentKurs = latestKursBI || mRate || 0;
    const catalog = dynamicSowOptions && dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;
    if (catalog && catalog.length > 0) {
      const custUpper = (customerCode || "").toUpperCase();
      const filtered = catalog.filter((s: any) => {
        const sCust = (s.customer || s.customerCode || "").toUpperCase();
        if (isRentalAlatSOW(s)) return false;
        return !sCust || sCust === custUpper || ((custUpper === "POS" || custUpper === "IBP" || custUpper === "BBA") && (!sCust || sCust === "POS"));
      // Baris milik customer didahulukan: dropdown SOW memakai baris pertama per nama, jangan sampai baris generik menang.
      }).sort((a: any, b: any) => ((b.customer || b.customerCode) ? 1 : 0) - ((a.customer || a.customerCode) ? 1 : 0));
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
          let rateIDR = s.rateIDR ? s.rateIDR : (s.rateUSD ? s.rateUSD * currentKurs : (s.baseRateUSD ? s.baseRateUSD * currentKurs : 0));
          if (isOverhaul && s.rateUSD) rateIDR = s.rateUSD * currentKurs;

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
            itemName: s.itemName || s.name,
            category,
            unit: cleanUnit || "BCM",
            defaultRate: rateIDR,
            rateIDR,
            rateUSD: s.rateUSD || s.baseRateUSD || 0,
            usdRate: s.rateUSD || s.baseRateUSD || 0,
            tier1Rate: s.tier1Rate || 0,
            tier2Rate: s.tier2Rate || 0,
            tier3Rate: s.tier3Rate || 0,
            splitPercentage: s.splitPercentage || 0,
            baseDistanceMeters: s.baseDistanceMeters || (custUpper === "BGG" ? 1000 : (isCoalOverhaul ? 3000 : 1000)),
            defaultDistance: s.baseDistanceMeters || (custUpper === "BGG" ? 1000 : (isCoalOverhaul ? 3000 : 1000)),
            isDistanceVar: Boolean(s.isDistanceVar || isOverhaul || category === "Over Distance"),
            customer: s.customer || s.customerCode || custUpper,
            customerCode: s.customerCode || s.customer || custUpper,
            overhaulRate: 0,
            id: s.id
          };
        });
      }
    }
    return templateRows("sow_catalog");
  }, [dynamicSowOptions, defaultMasterVariableOptions, customerCode, latestKursBI, mRate, templateRows, coalIndexMaster, getBGGActiveCoalTier]);

  const customerContractMap: Record<string, any> = useMemo(() => {
    const map: Record<string, any> = {};
    (customerRows || []).forEach((c: any) => {
      if (c && c.code) {
        // Kontrak & site dari Master Customer; rekening dari Master Rekening Bank (relasi bankAccountId).
        const bank = bankAccounts.find((b: any) => b.id === c.bankAccountId);
        map[String(c.code).toUpperCase()] = {
          project: c.projectSite || "",
          contract: c.contractNo || "",
          bankName: bank?.bankName || "",
          bankAccountNo: bank?.accountNo || "",
          bankBranch: bank?.branch || "",
          directorName: "",
          directorTitle: ""
        };
      }
    });
    templateRows("customer_contracts").forEach((c: any) => {
      if (c && c.customerCode) map[String(c.customerCode).toUpperCase()] = { ...map[String(c.customerCode).toUpperCase()], ...c };
    });
    return map;
  }, [financeTemplates, customerRows, bankAccounts]);

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
    return rows && rows.length > 0 ? applyRateLookup(rows, "POS") : [];
  }, [financeTemplates, dynamicSowOptions, mRate, templateRows, applyRateLookup]);

  const demoPOSItems = useMemo(() => templateRows("invoice_demo_POS"), [financeTemplates]);

  const blankBGGItems = useMemo(() => {
    const rows = templateRows("invoice_blank_BGG");
    return rows && rows.length > 0 ? applyRateLookup(rows, "BGG") : [];
  }, [financeTemplates, dynamicSowOptions, mRate, templateRows, applyRateLookup]);

  const demoBGGItems = useMemo(() => templateRows("invoice_demo_BGG"), [financeTemplates]);

  const blankPTROItems = useMemo(() => {
    const rows = templateRows("invoice_blank_PTRO");
    const baseRows = rows && rows.length > 0 ? rows : [];
    const currentKurs = latestKursBI || mRate || 0;
    const obRateUSD = getSowMasterRate("PTRO", "OVER BURDEN REMOVAL", 0, true);
    const cgRateUSD = getSowMasterRate("PTRO", "COAL GETTING", 0, true);
    const odObRateUSD = getSowMasterRate("PTRO", "Overhaul OB", 0, true);
    const odCgRateIDR = getSowMasterRate("PTRO", "Overhaul Coal Getting", 0, false);
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
    return rows && rows.length > 0 ? applyRateLookup(rows, "SBS") : [];
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
      // Baris Rental POS: tarif sewa & harga solar diatur tabel rental (baris BBM bermaterial sama dengan sewa).
      if (!mat || it.isCustom || it.category === "Rental") return it;
      // OB SBS tanpa tarif: ambil dari rentang Tarif Jarak Angkut (aturan sama dengan BE).
      const dist = Number(it.distanceM || it.distance || it.distanceWeightAvg || 0);
      if (customerKind(cust) === "SBS" && !it.isDeduction && !Number(it.rate) && dist > 0) {
        const r = getSBSTarifByDistance(dist).rate;
        if (r > 0) return { ...it, rate: r };
      }
      const isUSD = Boolean(it.isUSD);
      const itemPeriod = it.period || period;
      const masterRateIDR = getSowMasterRate(cust, mat, it.rate || 0, false, itemPeriod);
      const masterRateUSD = isUSD ? getSowMasterRate(cust, mat, it.rateUSD || 0, true, itemPeriod) : 0;
      // Basis jarak over distance selalu dari Master SOW customer (bukan nilai lama yang tersimpan di baris).
      const masterBase = isDistanceItem(it) ? baseDistanceFor(cust, mat) : 0;
      if (masterBase > 0) it = { ...it, distanceBasis: masterBase };
      if (masterRateIDR > 0) {
        return {
          ...it,
          rate: masterRateIDR,
          ...(isUSD ? { rateUSD: masterRateUSD } : {})
        };
      }
      return it;
    });
  }, [getSowMasterRate, getBGGActiveCoalTier]);

  const defaultPOSBAOperatingItems = useMemo(() => {
    const rows = templateRows("ba_operating_POS");
    const base = zeroBAVolumes(rows);
    return syncBARatesWithMasterData(base, "POS");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

  const defaultPOSBAMDOItems = useMemo(() => {
    const rows = templateRows("ba_mdo_POS");
    const base = zeroBAVolumes(rows);
    return syncBARatesWithMasterData(base, "POS");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

  const defaultBGGBAItems = useMemo(() => {
    const rows = templateRows("ba_items_BGG");
    const base = zeroBAVolumes(rows);
    return syncBARatesWithMasterData(base, "BGG");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

  const defaultPTROBAItems = useMemo(() => {
    const currentKurs = latestKursBI || mRate || 0;
    const obRateUSD = getSowMasterRate("PTRO", "OVER BURDEN REMOVAL", 0, true);
    const cgRateUSD = getSowMasterRate("PTRO", "COAL GETTING", 0, true);
    const odObRateUSD = getSowMasterRate("PTRO", "Overhaul OB", 0, true);
    const odCgRateIDR = getSowMasterRate("PTRO", "Overhaul Coal Getting", 0, false);
    const rows = templateRows("ba_items_PTRO");
    if (rows.length > 0) {
      return rows.map(r => {
        let rate = r.rate || 0;
        const mat = (r.material || "").toUpperCase();
        if (mat.includes("OVER BURDEN")) rate = (r.rateUSD || obRateUSD) * currentKurs;
        else if (mat.includes("COAL GETTING") || mat.includes("COAL WINNING")) rate = (r.rateUSD || cgRateUSD) * currentKurs;
        else if (mat.includes("OVERHAUL OB") || mat.includes("OVER DISTANCE FOR OB")) rate = (r.rateUSD || odObRateUSD) * currentKurs;
        else if (mat.includes("OVERHAUL COAL") || mat.includes("OVER DISTANCE FOR COAL")) rate = r.rate || odCgRateIDR;
        return { ...r, rate, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0 };
      });
    }
    return [
      { id: "ptro_ba_ob", category: "Operating & Mining", area: "Pit Sapan", material: "OVER BURDEN REMOVAL", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: obRateUSD, distanceBasis: 0, isDistanceVar: false, rate: obRateUSD * currentKurs, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "ptro_ba_cg", category: "Operating & Mining", area: "Pit Sapan", material: "COAL GETTING", unit: "MT", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: cgRateUSD, distanceBasis: 0, isDistanceVar: false, rate: cgRateUSD * currentKurs, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "ptro_ba_odob", category: "Over Distance", area: "Pit Sapan", material: "Overhaul OB", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: odObRateUSD, distanceBasis: 1000, isDistanceVar: true, distanceWeightAvg: 1000, rate: odObRateUSD * currentKurs, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "ptro_ba_odcg", category: "Over Distance", area: "Pit Sapan", material: "Overhaul Coal Getting", unit: "TON", initialVolume: 0, adjustedVolume: 0, isUSD: false, rateIDR: odCgRateIDR, distanceBasis: 3000, isDistanceVar: true, distanceWeightAvg: 3000, rate: odCgRateIDR, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
    ];
  }, [financeTemplates, templateRows, dynamicSowOptions, latestKursBI, mRate, getSowMasterRate]);

  const defaultDBKBAItems = useMemo(() => {
    const currentKurs = latestKursBI || mRate || 0;
    const obRateUSD = getSowMasterRate("DBK", "OVER BURDEN REMOVAL", 0, true);
    const cgRateUSD = getSowMasterRate("DBK", "COAL GETTING", 0, true);
    const odObRateUSD = getSowMasterRate("DBK", "Overhaul OB", 0, true);
    const odCgRateIDR = getSowMasterRate("DBK", "Overhaul Coal Getting", 0, false);
    const rows = templateRows("ba_items_DBK");
    if (rows.length > 0) {
      return rows.map(r => {
        let rate = r.rate || 0;
        const mat = (r.material || "").toUpperCase();
        if (mat.includes("OVER BURDEN")) rate = (r.rateUSD || obRateUSD) * currentKurs;
        else if (mat.includes("COAL GETTING") || mat.includes("COAL WINNING")) rate = (r.rateUSD || cgRateUSD) * currentKurs;
        else if (mat.includes("OVERHAUL OB") || mat.includes("OVER DISTANCE FOR OB")) rate = (r.rateUSD || odObRateUSD) * currentKurs;
        else if (mat.includes("OVERHAUL COAL") || mat.includes("OVER DISTANCE FOR COAL")) rate = r.rate || odCgRateIDR;
        return { ...r, rate, initialVolume: 0, adjustedVolume: 0, subtotalInitial: 0, subtotalAdjusted: 0 };
      });
    }
    return [
      { id: "dbk_ba_ob", category: "Operating & Mining", area: "Pit DBK", material: "OVER BURDEN REMOVAL", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: obRateUSD, distanceBasis: 0, isDistanceVar: false, rate: obRateUSD * currentKurs, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "dbk_ba_cg", category: "Operating & Mining", area: "Pit DBK", material: "COAL GETTING", unit: "MT", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: cgRateUSD, distanceBasis: 0, isDistanceVar: false, rate: cgRateUSD * currentKurs, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "dbk_ba_odob", category: "Over Distance", area: "Pit DBK", material: "Overhaul OB", unit: "BCM", initialVolume: 0, adjustedVolume: 0, isUSD: true, rateUSD: odObRateUSD, distanceBasis: 1000, isDistanceVar: true, distanceWeightAvg: 1000, rate: odObRateUSD * currentKurs, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
      { id: "dbk_ba_odcg", category: "Over Distance", area: "Pit DBK", material: "Overhaul Coal Getting", unit: "TON", initialVolume: 0, adjustedVolume: 0, isUSD: false, rateIDR: odCgRateIDR, distanceBasis: 3000, isDistanceVar: true, distanceWeightAvg: 3000, rate: odCgRateIDR, subtotalInitial: 0, subtotalAdjusted: 0, notes: "", keterangan: "" },
    ];
  }, [financeTemplates, templateRows, dynamicSowOptions, latestKursBI, mRate, getSowMasterRate]);

  const defaultSBSBAOperatingItems = useMemo(() => {
    const rows = templateRows("ba_operating_SBS");
    // Tarif OB SBS diisi dari jarak angkut (Tarif Jarak Angkut), bukan tarif bawaan template.
    const base = zeroBAVolumes(rows, true);
    return syncBARatesWithMasterData(base, "SBS");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

  const defaultSBSBAMDOItems = useMemo(() => {
    const rows = templateRows("ba_mdo_SBS");
    const base = zeroBAVolumes(rows);
    return syncBARatesWithMasterData(base, "SBS");
  }, [financeTemplates, templateRows, syncBARatesWithMasterData]);

  const defaultSBSBADeductionItems = useMemo(() => {
    const rows = templateRows("ba_deductions_SBS");
    const base = rows.length > 0 ? rows : [];
    return base.map((r: any) => ({ ...r, rate: 0, subtotalInitial: 0, subtotalAdjusted: 0 }));
  }, [financeTemplates, templateRows]);

  const reloadMasterData = useCallback(async () => {
    const [sowData, fxData, rfData, coalData, umkData, bankData] = await Promise.all([
      api<any[]>("/api/master-data/variable-sow").catch(() => null),
      api<any[]>("/api/master-data/daily-exchange-rates").catch(() => null),
      api<any[]>("/api/master-data/raise-fall").catch(() => null),
      api<any[]>("/api/master-data/coal-index").catch(() => null),
      api<any[]>("/api/master-data/min-wages").catch(() => null),
      api<any[]>("/api/master-data/bank-accounts").catch(() => null),
    ]);
    if (Array.isArray(coalData)) setCoalIndexMaster(coalData);
    if (Array.isArray(umkData)) setMinWageMasters(umkData);
    if (Array.isArray(rfData)) setRaiseFallMasters(rfData);
    if (Array.isArray(fxData)) setExchangeRates(fxData);
    if (Array.isArray(bankData)) setBankAccounts(bankData);
    if (Array.isArray(sowData)) setSowCatalog(sowData);
    if (Array.isArray(sowData)) setDynamicSowOptions(sowData.filter((d) => d.status !== "Inactive").map(mapSowRow));
  }, []);

  return {
    mRate, setMRate, fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR,
    raiseFallMasters, setRaiseFallMasters, raiseFallMaster, setRaiseFallMaster,
    minWageMasters, setMinWageMasters,
    dynamicSowOptions, setDynamicSowOptions, sowCatalog, bankAccountOptions, setBankAccountOptions,
    latestKursBI, coalIndexMaster, setCoalIndexMaster, exchangeRates, bankAccounts,
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
