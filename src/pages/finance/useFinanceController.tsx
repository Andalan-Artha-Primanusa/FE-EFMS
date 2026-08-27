import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, approveInvoiceTier2, getFinanceTemplates, User as UserType } from "../../lib/api";

import {
  resolveDocumentUrl, formatIDR, parseNumber, formatThousand, formatDateInput,
  indonesianMonths, formatMonthLabel, formatMonthInput, getRomanMonth,
  generateBANumberPreview, generateInvoiceNumberPreview, getYearFromPeriod,
  generateInvoiceNumber, getBAInvoiceStatus, renderBAStatusBadge,
  getBAStatusForExport, renderInvoiceStatusBadge, parsePeriodToMonthIndex,
  RupiahInput, generateAuditTimeline
} from "./helpers";
import { calcRFIndex, createFinanceCalculations } from "./calculations";
import {
  exportPaymentDetailPDFImpl, exportARBAIMonitoringExcelImpl, exportARBAIMonitoringPDFImpl,
  exportBAOnlyExcelImpl, exportBAOnlyPDFImpl, exportAROnlyExcelImpl, exportAROnlyPDFImpl,
} from "./exporters";

export function useFinanceController({
  viewTitle,
  query,
  onNotice,
  user
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
  user?: UserType;
}) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [baRows, setBaRows] = useState<any[]>([]);

  const userRole = user?.role || "Super Admin";
  const isSuper = userRole === "Super Admin" || userRole === "Superadmin";
  const isFinanceSpecialist = isSuper || userRole.includes("Specialist") || userRole.includes("Finance") || userRole.includes("SPV") || userRole.includes("Supervisor") || userRole.includes("Admin");
  const isSPV = isFinanceSpecialist;
  const isManager = isSuper || userRole.includes("Manager") || userRole.includes("FATB") || userRole.includes("Head") || userRole.includes("Director") || userRole.includes("Direktur");
  const isDirector = isSuper || userRole.includes("Director") || userRole.includes("Direktur");
  const [invoiceRows, setInvoiceRows] = useState<any[]>([]);
  const [paymentRows, setPaymentRows] = useState<any[]>([]);
  const [customerRows, setCustomerRows] = useState<any[]>([]);
  const [pendingVolumeLedgers, setPendingVolumeLedgers] = useState<any[]>([]);
  const [showPendingVolumeDrawer, setShowPendingVolumeDrawer] = useState<boolean>(false);
  const [baFilter, setBaFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [invStatusFilter, setInvStatusFilter] = useState("All");
  const [invCardTab, setInvCardTab] = useState<"AR_ANDALAN" | "PENALTY_UNCUT" | "SUBJECT_TO_INVOICE">("AR_ANDALAN");
  const [invPeriodFilter, setInvPeriodFilter] = useState("All");

  // Modal Input & Edit State
  const [modalType, setModalType] = useState<"none" | "ba" | "invoice" | "payment" | "customer" | "pending_volume">("none");
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ customerCode: "POS", workPeriod: "Juni 2026" });
  const [showActivityGroupDropdown, setShowActivityGroupDropdown] = useState(false);
  const [showExportBADropdown, setShowExportBADropdown] = useState(false);
  const [showInputBADropdown, setShowInputBADropdown] = useState(false);
  const [showExportARDropdown, setShowExportARDropdown] = useState(false);
  const [showInputARDropdown, setShowInputARDropdown] = useState(false);
  const [baRowActionDropdownId, setBaRowActionDropdownId] = useState<number | null>(null);

  // Modal Detail View 2 Kolom State
  const [detailViewItem, setDetailViewItem] = useState<{ type: "ba" | "invoice" | "payment" | "customer"; data: any } | null>(null);
  const [isInlineEditingBA, setIsInlineEditingBA] = useState<boolean>(true);

  // State Form Partial Payment (Catat Cicilan Baru)
  const [showAddPartialPayment, setShowAddPartialPayment] = useState(false);
  const [partialPaymentForm, setPartialPaymentForm] = useState({
    amountPaid: "",
    paymentDate: new Date().toISOString().split("T")[0],
    receivingBank: "Bank Mandiri Escrow",
    refNo: "",
    notes: ""
  });

  // State Kalkulator POS Mining & Raise & Fall (RF) Escalation
  const [mRate, setMRate] = useState(17923.30);
  const [fuelPriceUSD, setFuelPriceUSD] = useState(1.422);
  const [laborPriceIDR, setLaborPriceIDR] = useState(3721423);

  const [dynamicSowOptions, setDynamicSowOptions] = useState<any[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/api/master-data/raise-fall")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const activeRf = data[0];
          if (activeRf.actualMRateXn > 0) setMRate(activeRf.actualMRateXn);
          if (activeRf.actualFuelFn > 0) setFuelPriceUSD(activeRf.actualFuelFn);
          if (activeRf.actualLaborLn > 0) setLaborPriceIDR(activeRf.actualLaborLn);
        }
      })
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
              customer: d.customer || d.customerCode || "POS",
              customerCode: d.customerCode || d.customer || "POS",
              baseRateUSD: d.rateUSD || 0,
              rateUSD: d.rateUSD || 0,
              rateIDR: d.rateIDR || (d.rateUSD ? Math.round(d.rateUSD * 17923.30) : 0)
            }))
          );
        }
      })
      .catch(() => {});

    api<any[]>("/api/master-data/bank-accounts")
      .then((data) => {
        if (Array.isArray(data)) setBankAccountOptions(data);
      })
      .catch(() => {});
  }, []);

  // Helper untuk mengambil unit rate dari Master Data Variable SOW per customer
  const getSowMasterRate = (customer: string, itemName: string, fallbackRate: number, isUSD: boolean = false) => {
    const custUpper = customer.toUpperCase();
    const itemNorm = itemName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = dynamicSowOptions.find(s => {
      const sCust = (s.customer || s.customerCode || "").toUpperCase();
      const sName = (s.itemName || s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return (sCust === custUpper || (!sCust && custUpper === "POS")) && (sName.includes(itemNorm) || itemNorm.includes(sName));
    });
    if (match) {
      if (isUSD && match.rateUSD) return match.rateUSD;
      if (!isUSD && match.rateIDR) return match.rateIDR;
      if (!isUSD && match.rateUSD) return Math.round(match.rateUSD * (mRate || 17923.30));
    }
    return fallbackRate;
  };

  // ---- Finance Templates: master data terpusat dari backend ----
  const [financeTemplates, setFinanceTemplates] = useState<any[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  useEffect(() => {
    getFinanceTemplates()
      .then((grouped: Record<string, any[]>) => { if (grouped) setFinanceTemplates(Object.values(grouped).flat()); })
      .catch(() => {})
      .finally(() => setTemplatesLoaded(true));
  }, []);

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

  // RF Index dihitung lewat control rumus terpisah (calculations.tsx)
  const rfIndexCalculated = calcRFIndex(fuelPriceUSD, laborPriceIDR, mRate);

  // Master Data Variable SOW Options (Dynamic from API with fallback)
  const defaultMasterVariableOptions = templateRows("variable_sow_defaults");

  const masterVariableOptions = dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;

  // Dynamic Master SOW Catalog derived live from master data API (dynamicSowOptions) & MRate
  const activeSOWCatalog = useMemo(() => {
    if (dynamicSowOptions && dynamicSowOptions.length > 0) {
      const custUpper = (formData.customerCode || "POS").toUpperCase();
      const filtered = dynamicSowOptions.filter((s) => {
        const sCust = (s.customer || s.customerCode || "").toUpperCase();
        return !sCust || sCust === custUpper || (custUpper === "POS" && (!sCust || sCust === "POS"));
      });
      if (filtered.length > 0) {
        return filtered.map((s) => {
          let category = "Operating & Mining";
          const catNorm = (s.category || "").toLowerCase();
          if (catNorm.includes("mdo") || catNorm.includes("development") || catNorm.includes("mine development")) {
            category = "MDO";
          }
          const rateIDR = s.rateIDR ? s.rateIDR : (s.rateUSD ? Math.round(s.rateUSD * (mRate || 17923.30)) : (s.baseRateUSD ? Math.round(s.baseRateUSD * (mRate || 17923.30)) : 0));
          let cleanUnit = (s.unit || "BCM").replace(/^USD\//i, "").trim();
          if (cleanUnit.toUpperCase() === "1KM") cleanUnit = "USD/1KM";

          return {
            name: s.itemName || s.name,
            category: category,
            unit: cleanUnit || "BCM",
            defaultRate: rateIDR,
            usdRate: s.rateUSD || s.baseRateUSD || 0,
            defaultDistance: (s.itemName || "").toLowerCase().includes("overhaul") ? 1000 : 1000,
            overhaulRate: 0,
            id: s.id
          };
        });
      }
    }
      return templateRows("sow_catalog");
  }, [dynamicSowOptions, formData.customerCode, mRate]);

  // ============ TEMPLATES PER CUSTOMER (dari backend finance_templates) ============
  const applyRateLookup = (items: any[]): any[] =>
    items.map((it: any) => {
      if (!it || !it.lookup) return it;
      const fb = Number(it.baseRateUSD ?? it.unitRateIDR ?? 0);
      const rate = getSowMasterRate(it.customer || "POS", it.lookup, fb, Boolean(it.lookupUSD));
      if (it.lookupUSD) {
        return it.unitRateUSD !== undefined ? { ...it, unitRateUSD: rate } : { ...it, baseRateUSD: rate };
      }
      return { ...it, unitRateIDR: rate };
    });

  const blankPOSItems = useMemo(() => applyRateLookup(templateRows("invoice_blank_POS")), [financeTemplates, dynamicSowOptions, mRate]);
  const demoPOSItems = useMemo(() => templateRows("invoice_demo_POS"), [financeTemplates]);
  const blankBGGItems = useMemo(() => applyRateLookup(templateRows("invoice_blank_BGG")), [financeTemplates, dynamicSowOptions, mRate]);
  const demoBGGItems = useMemo(() => templateRows("invoice_demo_BGG"), [financeTemplates]);
  const blankDBKItems = useMemo(() => applyRateLookup(templateRows("invoice_blank_DBK")), [financeTemplates, dynamicSowOptions, mRate]);
  const demoDBKItems = useMemo(() => templateRows("invoice_demo_DBK"), [financeTemplates]);
  const blankSBSItems = useMemo(() => applyRateLookup(templateRows("invoice_blank_SBS")), [financeTemplates, dynamicSowOptions, mRate]);
  const demoSBSItems = useMemo(() => templateRows("invoice_demo_SBS"), [financeTemplates]);

  const FALLBACK_BGG_BA_ITEMS = [
    { id: "bgg_op1_feb", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", unit: "BCM", initialVolume: 36168.37, adjustedVolume: 36168.37, rate: 27250, subtotalInitial: 985588083, subtotalAdjusted: 985588083 },
    { id: "bgg_op1_jun", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", unit: "BCM", initialVolume: 121490.00, adjustedVolume: 121490.00, rate: 29500, subtotalInitial: 3583955000, subtotalAdjusted: 3583955000 },
    { id: "bgg_op2_feb", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", unit: "BCM", initialVolume: 12056.12, adjustedVolume: 12056.12, rate: 26500, subtotalInitial: 319487180, subtotalAdjusted: 319487180 },
    { id: "bgg_op2_jun", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", unit: "BCM", initialVolume: 40496.67, adjustedVolume: 40496.67, rate: 28750, subtotalInitial: 1164279263, subtotalAdjusted: 1164279263 },
    { id: "bgg_cw_jun", category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning Pit Kungkilan", period: "Jun-26", unit: "Ton", initialVolume: 46683.48, adjustedVolume: 46683.48, rate: 17500, subtotalInitial: 816960900, subtotalAdjusted: 816960900 },
    { id: "bgg_od_ob_feb", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Feb-26", unit: "BCM", distanceWeightAvg: 1232, initialVolume: 48224.49, adjustedVolume: 48224.49, rate: 1393, isDistanceVar: true, subtotalInitial: 67153575, subtotalAdjusted: 67153575 },
    { id: "bgg_od_ob_jun", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Jun-26", unit: "BCM", distanceWeightAvg: 1239, initialVolume: 161986.66, adjustedVolume: 161986.66, rate: 1550, isDistanceVar: true, subtotalInitial: 251147442, subtotalAdjusted: 251147442 },
    { id: "bgg_od_cw_jun", category: "Over Distance", area: "Pit KKL", material: "Over Distance For Coal Winning", period: "Jun-26", unit: "Ton", distanceWeightAvg: 4582, initialVolume: 46683.48, adjustedVolume: 46683.48, rate: 19700, isDistanceVar: true, subtotalInitial: 919652140, subtotalAdjusted: 919652140 }
  ];

  const FALLBACK_POS_OPERATING_ITEMS = [
    { id: "ba_op1", category: "Operating & Mining", area: "WM1", material: "Top Soil", unit: "BCM", initialVolume: 2800, adjustedVolume: 2800, rate: 60500, subtotalInitial: 169400000, subtotalAdjusted: 169400000 },
    { id: "ba_op2", category: "Operating & Mining", area: "WM1", material: "Saprolite", unit: "WMT", initialVolume: 650, adjustedVolume: 650, rate: 62200, subtotalInitial: 40430000, subtotalAdjusted: 40430000 },
    { id: "ba_op3", category: "Operating & Mining", area: "WM1", material: "Limonite", unit: "WMT", initialVolume: 4120, adjustedVolume: 4120, rate: 60200, subtotalInitial: 248024000, subtotalAdjusted: 248024000 },
    { id: "ba_op4", category: "Operating & Mining", area: "WM1", material: "Overburden/ Waste", unit: "BCM", initialVolume: 15420.5, adjustedVolume: 15420.5, rate: 59500, subtotalInitial: 917519750, subtotalAdjusted: 917519750 },
    { id: "ba_dist1", category: "Over Distance", area: "WM1", material: "Over/Underhaul For OB Removal", unit: "BCM", parentMaterial: "Overburden/ Waste", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_dist2", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Top Soil Removal", unit: "BCM", parentMaterial: "Top Soil", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_dist3", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Limonite", unit: "BCM", parentMaterial: "Limonite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_dist4", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Saprolite", unit: "BCM", parentMaterial: "Saprolite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
  ];

  const FALLBACK_POS_MDO_ITEMS = [
    { id: "ba_mdo1", category: "MDO", area: "Site POS", material: "Mine Development (MDO) - Clearing & Access Road", unit: "Ha", distanceWeightAvg: 0, initialVolume: 5.5, adjustedVolume: 5.5, rate: 15500000, subtotalInitial: 85250000, subtotalAdjusted: 85250000 },
    { id: "ba_mdo2", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", unit: "USD/1KM", distanceWeightAvg: 0, initialVolume: 1200, adjustedVolume: 1200, rate: 9450, subtotalInitial: 11340000, subtotalAdjusted: 11340000 }
  ];

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

  const [baOperatingItems, setBaOperatingItems] = useState<any[]>(FALLBACK_POS_OPERATING_ITEMS);
  const [baMDOItems, setBaMDOItems] = useState<any[]>(FALLBACK_POS_MDO_ITEMS);
  const [activeBAStep, setActiveBAStep] = useState<number>(1);
  const [showAddRowDropdown, setShowAddRowDropdown] = useState<boolean>(false);
  const [posInvoiceCategory, setPosInvoiceCategory] = useState<"Operation & Mining" | "MDO">("Operation & Mining");

  const [invLineItems, setInvLineItems] = useState<any[]>(blankPOSItems);

  // Hydrate item dari template backend setelah data master termuat
  useEffect(() => {
    if (!templatesLoaded) return;
    if (blankPOSItems.length > 0 && invLineItems.length === 0) setInvLineItems(blankPOSItems);
    if (defaultPOSBAOperatingItems.length > 0 && baOperatingItems.length === 0) setBaOperatingItems(defaultPOSBAOperatingItems);
    if (defaultPOSBAMDOItems.length > 0 && baMDOItems.length === 0) setBaMDOItems(defaultPOSBAMDOItems);
  }, [templatesLoaded, blankPOSItems, defaultPOSBAOperatingItems, defaultPOSBAMDOItems]);
  const [selectedVarA, setSelectedVarA] = useState("");
  const [selectedVarB, setSelectedVarB] = useState("");
  const [selectedVarC, setSelectedVarC] = useState("");
  const [selectedVarD, setSelectedVarD] = useState("");
  const [selectedVarE, setSelectedVarE] = useState("");
  const [selectedVarF, setSelectedVarF] = useState("");
  const [selectedVarP, setSelectedVarP] = useState("");

  const addVariableToSection = (section: string, code: string) => {
    if (!code) return;
    const opt = masterVariableOptions.find(o => o.code === code);
    if (!opt) return;

    const newItem = {
      id: `SOW_${Date.now()}`,
      section,
      code: opt.code,
      description: `${section}.${invLineItems.filter(i => i.section === section).length + 1} ${opt.name}`,
      volume: 0,
      unit: opt.unit,
      baseRateUSD: opt.baseRateUSD,
      unitRateIDR: opt.rateIDR || Math.round((opt.baseRateUSD || 1) * mRate),
      overhaulMtr: opt.overhaulMtr || 1000,
      type: section === "D" && opt.code.includes("OVERHAUL") ? "overhaul" : section === "D" && opt.code.includes("CLEARING") ? "land_clearing" : "production"
    };

    setInvLineItems(prev => [...prev, newItem]);
    if (section === "A") setSelectedVarA("");
    if (section === "B") setSelectedVarB("");
    if (section === "C") setSelectedVarC("");
    if (section === "D") setSelectedVarD("");
    if (section === "E") setSelectedVarE("");
    if (section === "F") setSelectedVarF("");
    if (section === "P") setSelectedVarP("");
  };

  const customerContractMap: Record<string, { project: string; contract: string; noPO?: string; bankName?: string; bankAccountNo?: string; bankBranch?: string; directorName?: string; directorTitle?: string }> = useMemo(() => {
    const map: Record<string, any> = {};
    templateRows("customer_contracts").forEach((c: any) => {
      if (c && c.customerCode) map[String(c.customerCode).toUpperCase()] = c;
    });
    return map;
  }, [financeTemplates]);

  const handleCompanySelect = (code: string) => {
    const mapMatch = customerContractMap[code];
    const cust = customerRows.find((c: any) => c.code === code);

    // Auto-switch template item list based on customer
    if (code === "BGG") setInvLineItems(blankBGGItems);
    else if (code === "DBK") setInvLineItems(blankDBKItems);
    else if (code === "SBS") setInvLineItems(blankSBSItems);
    else setInvLineItems(blankPOSItems);

    setFormData((prev: any) => {
      const period = prev.workPeriod || "Juni 2026";
      const autoInvNo = generateInvoiceNumber(code, period, invoiceRows.length);
      return {
        ...prev,
        customerCode: code,
        projectSite: mapMatch?.project || cust?.projectSite || (cust ? `${cust.fullName} Site` : ""),
        contractNo: mapMatch?.contract || cust?.contractNo || (cust ? `001/${cust.code}-AAP/2026` : ""),
        noPO: mapMatch?.noPO || prev.noPO || "",
        bankName: mapMatch?.bankName || prev.bankName || "Bank BNI",
        bankAccountNo: mapMatch?.bankAccountNo || prev.bankAccountNo || "8188788882",
        bankBranch: mapMatch?.bankBranch || prev.bankBranch || "Harmoni, Jakarta",
        directorName: mapMatch?.directorName || "GAHARI CHRISTINE",
        directorTitle: mapMatch?.directorTitle || "DIRECTOR",
        invoiceNo: autoInvNo
      };
    });
  };

  const loadDemoPOSData = () => {
    setFormData({
      customerCode: "POS",
      invoiceNo: "003/POS-AAP/RF/VI/2026",
      workPeriod: "Juni 2026",
      projectSite: "POS PROJECT",
      contractNo: "002/POS-AAP/2025",
      bankName: "Bank BNI",
      bankAccountNo: "8188788882",
      bankBranch: "Harmoni, Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    });
    setInvLineItems(demoPOSItems);
    onNotice("Template preset POS Mining (Juni 2026) berhasil dimuat.");
  };

  const loadDemoBGGData = () => {
    setFormData({
      customerCode: "BGG",
      invoiceNo: "091/BGG-AAP/VI/2026",
      workPeriod: "1-30 JUN 26",
      projectSite: "BGG MINING PROJECT",
      contractNo: "001/BGG-AAP/2025",
      bankName: "Bank Mandiri",
      bankAccountNo: "070-00-2888000-8",
      bankBranch: "Plaza Mandiri Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    });
    setInvLineItems(demoBGGItems);
    onNotice("Template preset BGG Mining (Juni 2026) berhasil dimuat.");
  };

  const loadDemoDBKData = () => {
    setFormData({
      customerCode: "DBK",
      invoiceNo: "011/AAP-PTRO/IV/2026",
      workPeriod: "01 - 30 APRIL 26",
      projectSite: "DBK MINING PROJECT",
      contractNo: "011/AAP-PTRO/IV/2026",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "CHRISTIANTO CITRA",
      directorTitle: "DIRECTOR"
    });
    setInvLineItems(demoDBKItems);
    onNotice("Template preset DBK Petrosea Mining berhasil dimuat.");
  };

  const loadDemoSBSData = () => {
    setFormData({
      customerCode: "SBS",
      invoiceNo: "019/SBS-AAP/VI/2026",
      workPeriod: "01 - 30 JUNI 2026",
      projectSite: "SBS - Tanjung Enim",
      contractNo: "SPPH-05852",
      noPO: "I05790/0002",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIREKTUR UTAMA"
    });
    setInvLineItems(demoSBSItems);
    onNotice("Template preset SBS Mining berhasil dimuat.");
  };

  const removeInvLineItem = (idToRemove: string) => {
    setInvLineItems(prev => prev.filter(item => item.id !== idToRemove));
  };

  const updateInvItemVolume = (id: string, vol: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, volume: vol } : item));
  };

  const updateInvItemOverhaul = (id: string, mtr: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, overhaulMtr: mtr } : item));
  };

  const updateInvItemRateIDR = (id: string, rate: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, unitRateIDR: rate } : item));
  };

  const updateInvItemRateUSD = (id: string, rate: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, unitRateUSD: rate } : item));
  };

  const updateInvItemKurs = (id: string, kurs: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, kursBI: kurs } : item));
  };

  const updateInvItemAmount = (id: string, amt: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, amount: amt } : item));
  };

  // Rumus item invoice disediakan control calculations.tsx
  const {
    getItemEffectiveVolume, getItemEffectiveOverhaulMtr,
    calculateItemRateAndAmount, getCustomerCalculations,
  } = createFinanceCalculations({ formData, invLineItems, rfIndexCalculated, getSowMasterRate, mRate });

  const calcs = getCustomerCalculations(invLineItems, formData.customerCode);
  const subtotalA = calcs.subtotalA;
  const subtotalB = calcs.subtotalB;
  const subtotalC = calcs.subtotalC;
  const subtotalD = calcs.subtotalD;
  const subtotalE = calcs.subtotalE;
  const subtotalF = calcs.subtotalF;
  const subtotalP = calcs.subtotalP;
  const totalGrossCalc = calcs.totalGross;
  const dpp11_12Calc = calcs.dpp11_12;
  const vat12Calc = calcs.vat12;
  const pph23Calc = calcs.pph23;
  const netTotalInvoiceCalc = calcs.totalInvoice;
  const totalDibayarCalc = calcs.totalDibayar;



  async function loadData() {
    setLoading(true);
    try {
      const [dashRes, baRes, invRes, payRes, custRes, pVolRes] = await Promise.all([
        (viewTitle === "Finance & AR Dashboard" || viewTitle === "Finance AR Dashboard" || viewTitle.includes("AR Dashboard"))
          ? api<any>("/api/finance/dashboard").catch(() => null)
          : Promise.resolve(null),
        api<any[]>("/api/finance/ba-trackers").catch(() => []),
        api<any[]>("/api/finance/invoices").catch(() => []),
        api<any[]>("/api/finance/payments").catch(() => []),
        api<any[]>("/api/finance/customers").catch(() => []),
        api<any[]>("/api/finance/pending-volumes").catch(() => [])
      ]);

      if (dashRes) setDashboardData(dashRes);
      if (Array.isArray(baRes)) setBaRows(baRes);
      if (Array.isArray(invRes)) setInvoiceRows(invRes);
      if (Array.isArray(payRes)) setPaymentRows(payRes);
      if (Array.isArray(custRes)) setCustomerRows(custRes);
      if (Array.isArray(pVolRes)) setPendingVolumeLedgers(pVolRes);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data finance");
    } finally {
      setLoading(false);
    }
  }

  const handleSavePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailViewItem || detailViewItem.type !== "invoice") return;
    const amount = parseFloat(partialPaymentForm.amountPaid);
    if (!amount || amount <= 0) {
      onNotice("Nominal pembayaran harus lebih besar dari 0");
      return;
    }

    try {
      const payload = {
        invoiceNo: detailViewItem.data.invoiceNo,
        customerCode: detailViewItem.data.customerCode,
        amountPaid: amount,
        paymentDate: partialPaymentForm.paymentDate ? new Date(partialPaymentForm.paymentDate).toISOString() : new Date().toISOString(),
        receivingBank: partialPaymentForm.receivingBank || "Bank Mandiri Escrow",
        refNo: partialPaymentForm.refNo || "-",
        notes: partialPaymentForm.notes || "Cicilan Klien",
        verificationStatus: "Pending",
        createdBy: "AR Treasury Dept"
      };

      await api("/api/finance/payments", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      onNotice("Pembayaran cicilan berhasil dicatat (Menunggu Verifikasi).");
      setShowAddPartialPayment(false);
      setPartialPaymentForm({
        amountPaid: "",
        paymentDate: new Date().toISOString().split("T")[0],
        receivingBank: "Bank Mandiri Escrow",
        refNo: "",
        notes: ""
      });

      // Reload invoices & payments
      const [invRes, payRes] = await Promise.all([
        api<any[]>("/api/finance/invoices"),
        api<any[]>("/api/finance/payments")
      ]);
      setInvoiceRows(Array.isArray(invRes) ? invRes : []);
      setPaymentRows(Array.isArray(payRes) ? payRes : []);

      // Update detail view item data with updated invoice
      const updatedInv = Array.isArray(invRes) ? invRes.find((i: any) => i.invoiceNo === detailViewItem.data.invoiceNo) : null;
      if (updatedInv) {
        setDetailViewItem({ type: "invoice", data: updatedInv });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal mencatat cicilan");
    }
  };

  const handleVerifyPartialPayment = async (paymentId: number) => {
    try {
      await api(`/api/finance/payments/${paymentId}/verify`, {
        method: "PUT",
        body: JSON.stringify({ verifiedBy: "Hendra Wijaya (Finance Specialist)" })
      });

      onNotice("Pembayaran cicilan berhasil diverifikasi.");

      // Reload invoices & payments
      const [invRes, payRes] = await Promise.all([
        api<any[]>("/api/finance/invoices"),
        api<any[]>("/api/finance/payments")
      ]);
      setInvoiceRows(Array.isArray(invRes) ? invRes : []);
      setPaymentRows(Array.isArray(payRes) ? payRes : []);

      // Update detail view item data with updated invoice
      if (detailViewItem && detailViewItem.type === "invoice") {
        const updatedInv = Array.isArray(invRes) ? invRes.find((i: any) => i.invoiceNo === detailViewItem.data.invoiceNo) : null;
        if (updatedInv) {
          setDetailViewItem({ type: "invoice", data: updatedInv });
        }
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi cicilan");
    }
  };

  useEffect(() => {
    loadData();
    if (customerRows.length === 0) {
      api<any[]>("/api/finance/customers").then(res => {
        if (Array.isArray(res)) setCustomerRows(res);
      }).catch(() => {});
    }
  }, [viewTitle]);

  const buildInvoiceItemsFromBA = (ba: any, custCode?: string, category: "Operation & Mining" | "MDO" = "Operation & Mining") => {
    const code = custCode || ba?.customerCode || "POS";

    // If POS and Category is MDO (Mine Development Operation)
    if (code === "POS" && category === "MDO") {
      const mdo1 = ba?.items?.find((i: any) => (i.material || "").toLowerCase().includes("mine dev") || (i.material || "").toLowerCase().includes("mdo")) || baMDOItems?.[0];
      const mdo2 = ba?.items?.find((i: any) => (i.material || "").toLowerCase().includes("rock") || (i.material || "").toLowerCase().includes("konstruksi")) || baMDOItems?.[1];

      const vol1 = mdo1?.adjustedVolume > 0 ? mdo1.adjustedVolume : (mdo1?.initialVolume || mdo1?.volume || 5.5);
      const vol2 = mdo2?.adjustedVolume > 0 ? mdo2.adjustedVolume : (mdo2?.initialVolume || mdo2?.volume || 1200);

      return [
        { id: "MDO_1", section: "A", code: "MDO1", description: "Mine Development (MDO Cut & Fill & Access Road)", volume: vol1, unit: "Ha", baseRateUSD: 0, unitRateIDR: 15500000 },
        { id: "MDO_2", section: "A", code: "MDO2", description: "Rocks for construction - under/overhaul", volume: vol2, unit: "USD/1KM", baseRateUSD: 0.526, unitRateIDR: 9450 }
      ];
    }

    // 1. If BA has explicit item array from Step 1 / Step 2
    if (ba?.items && Array.isArray(ba.items) && ba.items.length > 0) {
      if (code === "POS") {
        return blankPOSItems.map((invItem) => {
          const itemCopy: any = { ...invItem };
          const matched = ba.items.find((bi: any) => {
            const m = (bi.material || "").toLowerCase();
            if (itemCopy.id === "A1" || itemCopy.code === "A1") return m.includes("overburden") || m.includes("waste") || m.includes("ob");
            if (itemCopy.id === "A2" || itemCopy.code === "A2") return m.includes("top soil") || m.includes("topsoil");
            if (itemCopy.id === "A3" || itemCopy.code === "A3") return m.includes("limonite");
            if (itemCopy.id === "A4" || itemCopy.code === "A4") return m.includes("saprolite");
            if (itemCopy.id === "C1" || itemCopy.code === "C1") return m.includes("clearing") || m.includes("grub");
            return false;
          });

          if (matched) {
            const vol = matched.adjustedVolume > 0 ? matched.adjustedVolume : (matched.initialVolume || matched.volume || 0);
            itemCopy.volume = vol;
            if (matched.rate) itemCopy.unitRateIDR = matched.rate;
          }

          if (itemCopy.section === "B") {
            const matchedForDist = ba.items.find((bi: any) => {
              const m = (bi.material || "").toLowerCase();
              if (itemCopy.id === "B1") return m.includes("overburden") || m.includes("waste") || m.includes("ob");
              if (itemCopy.id === "B2") return m.includes("top soil") || m.includes("topsoil");
              if (itemCopy.id === "B3") return m.includes("limonite");
              if (itemCopy.id === "B4") return m.includes("saprolite");
              return false;
            });
            if (matchedForDist) {
              itemCopy.overhaulMtr = matchedForDist.distanceWeightAvg || matchedForDist.overhaulMtr || 1000;
            }
          }
          return itemCopy;
        });
      }
    }

    // 2. Map realistic data by customer and BA details
    if (code === "POS") {
      if (ba?.baNumber?.includes("053") || (ba?.workAmount && ba.workAmount < 5000000000 && !ba.baNumber?.includes("052"))) {
        return [
          { id: "A1", section: "A", code: "A1", description: "OVER BURDEN REMOVAL", volume: 15420.50, unit: "Bcm", baseRateUSD: 3.327 },
          { id: "A2", section: "A", code: "A2", description: "TOP SOIL REMOVAL", volume: 2800.00, unit: "Bcm", baseRateUSD: 3.380 },
          { id: "A3", section: "A", code: "A3", description: "LIMONITE", volume: 4120.00, unit: "Bcm", baseRateUSD: 3.363 },
          { id: "A4", section: "A", code: "A4", description: "SAPROLITE", volume: 650.00, unit: "Bcm", baseRateUSD: 3.472 },
          { id: "B1", section: "B", code: "B1", description: "Over/Underhaul For OB Removal", overhaulMtr: 600, volume: 15420.50, unit: "Bcm", baseRateUSD: 0.538 },
          { id: "B2", section: "B", code: "B2", description: "Over/Underhaul For Top Soil Removal", overhaulMtr: 1100, volume: 2800.00, unit: "Bcm", baseRateUSD: 0.538 },
          { id: "B3", section: "B", code: "B3", description: "Over/Underhaul For Limonite", overhaulMtr: 1000, volume: 4120.00, unit: "Bcm", baseRateUSD: 0.526 },
          { id: "B4", section: "B", code: "B4", description: "Over/Underhaul For Saprolite", overhaulMtr: 750, volume: 650.00, unit: "Bcm", baseRateUSD: 0.526 },
          { id: "C1", section: "C", code: "C1", description: "Land Clearing", volume: 8500.00, unit: "m2", baseRateUSD: 0.381 },
          { id: "D1", section: "D", code: "D1", description: "OB Removal (RF Factor)", volume: 15420.50, unit: "Bcm", baseRateUSD: 3.327, type: "production" },
          { id: "D2", section: "D", code: "D2", description: "Over/Underhaul For OB Removal (RF)", overhaulMtr: 600, volume: 15420.50, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
          { id: "D3", section: "D", code: "D3", description: "Top Soil Removal (RF Factor)", volume: 2800.00, unit: "Bcm", baseRateUSD: 3.380, type: "production" },
          { id: "D4", section: "D", code: "D4", description: "Over/Underhaul For Top Soil Removal (RF)", overhaulMtr: 1100, volume: 2800.00, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
          { id: "D5", section: "D", code: "D5", description: "Limonite (RF Factor)", volume: 4120.00, unit: "Bcm", baseRateUSD: 3.363, type: "production" },
          { id: "D6", section: "D", code: "D6", description: "Over/Underhaul For Limonite (RF)", overhaulMtr: 1000, volume: 4120.00, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
          { id: "D7", section: "D", code: "D7", description: "Land Clearing (RF Factor)", volume: 8500.00, unit: "m2", baseRateUSD: 0.381, type: "land_clearing" },
          { id: "D8", section: "D", code: "D8", description: "Saprolite (RF Factor)", volume: 650.00, unit: "Bcm", baseRateUSD: 3.472, type: "production" },
          { id: "D9", section: "D", code: "D9", description: "Over/Underhaul For Saprolite (RF)", overhaulMtr: 750, volume: 650.00, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
        ];
      }
      return demoPOSItems.map(i => ({ ...i }));
    } else if (code === "BGG") {
      if (ba?.items && Array.isArray(ba.items) && ba.items.length > 0) {
        const invItems: any[] = [];
        let totalOB = 0;
        let totalCoal = 0;
        let obDistMtr = 1000;
        let coalDistMtr = 1000;
        let dpFuelVal = 0;

        // First pass: extract volume totals & distances
        ba.items.forEach((bi: any) => {
          const isDPFuel = bi.category === "DP Fuel" || bi.isDeduction || (bi.material || "").toLowerCase().includes("dp fuel");
          const isOD = bi.isDistanceVar || bi.category === "Over Distance" || (bi.material || "").toLowerCase().includes("distance") || (bi.material || "").toLowerCase().includes("overhaul");
          const isCoal = (bi.material || "").toLowerCase().includes("coal");
          const vol = Number(bi.adjustedVolume ?? bi.initialVolume ?? 0);

          if (isDPFuel) {
            dpFuelVal = Math.abs(Number(bi.rate || bi.subtotalAdjusted || bi.subtotalInitial || 0));
          } else if (isOD) {
            if (isCoal) {
              coalDistMtr = Number(bi.distanceWeightAvg ?? 1000);
            } else {
              obDistMtr = Number(bi.distanceWeightAvg ?? 1000);
            }
          } else {
            if (isCoal) {
              totalCoal += vol;
            } else {
              totalOB += vol;
            }
          }
        });

        // 1. SECTION A: OB Removal
        const ob1Item = ba.items.find((bi: any) => (bi.material || "").includes("75%"));
        const ob2Item = ba.items.find((bi: any) => (bi.material || "").includes("25%"));
        const ob1Vol = ob1Item ? Number(ob1Item.adjustedVolume ?? ob1Item.initialVolume ?? (totalOB * 0.75)) : (totalOB * 0.75);
        const ob2Vol = ob2Item ? Number(ob2Item.adjustedVolume ?? ob2Item.initialVolume ?? (totalOB * 0.25)) : (totalOB * 0.25);
        const ob1Rate = Number(ob1Item?.rate || 29500);
        const ob2Rate = Number(ob2Item?.rate || 28750);

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

        // 2. SECTION B: Coal Winning
        const cwItem = ba.items.find((bi: any) => (bi.material || "").toLowerCase().includes("coal") && !((bi.material || "").toLowerCase().includes("distance")));
        const cwVol = cwItem ? Number(cwItem.adjustedVolume ?? cwItem.initialVolume ?? totalCoal) : totalCoal;
        const cwRate = Number(cwItem?.rate || 17500);

        invItems.push({
          id: `bgg_inv_b1`,
          section: "B",
          subSection: "B1. Pit Kungkilan",
          description: "Coal Winning Pit Kungkilan",
          sowDescription: "Coal Winning",
          unit: "Ton",
          volume: cwVol,
          unitRateIDR: cwRate,
          amount: Math.round(cwVol * cwRate),
          amountIDR: Math.round(cwVol * cwRate),
          notes: ba.workPeriod || "-"
        });

        // 3. SECTION C: Over Distance
        const odOBDiffHm = (obDistMtr - 1000) / 100;
        const odCWRate = (coalDistMtr > 1000 ? Math.round(550 * ((coalDistMtr - 1000) / 100)) : 19700);
        const odOBRate = (obDistMtr > 1000 ? Math.round(650 * odOBDiffHm) : 1550);
        const odOBAmt = Math.round(totalOB * odOBRate);
        const odCWAmt = Math.round(cwVol * odCWRate);

        invItems.push({
          id: `bgg_inv_c1`,
          section: "C",
          subSection: "C1. Over Distance For OB Removal",
          description: "Over Distance For OB Removal",
          sowDescription: "Over Distance For OB Removal",
          unit: "Bcm",
          overhaulMtr: obDistMtr,
          volume: totalOB,
          unitRateIDR: odOBRate,
          amount: odOBAmt,
          amountIDR: odOBAmt,
          notes: ba.workPeriod || "-"
        });

        invItems.push({
          id: `bgg_inv_c2`,
          section: "C",
          subSection: "C2. Over Distance For Coal Winning",
          description: "Over Distance For Coal Winning",
          sowDescription: "Over Distance For Coal Winning",
          unit: "Ton",
          overhaulMtr: coalDistMtr,
          volume: cwVol,
          unitRateIDR: odCWRate,
          amount: odCWAmt,
          amountIDR: odCWAmt,
          notes: ba.workPeriod || "-"
        });

        // 4. SECTION D: Raise & Fall's Factor (Default RF factor 0.56 atau index 1.56 dari Excel)
        const rfIdx = rfIndexCalculated > 1 ? rfIndexCalculated : 1.56;
        const rfFactor = rfIdx - 1; // 0.56

        const rfOB1Rate = Math.round(ob1Rate * rfFactor); // 16520
        const rfOB2Rate = Math.round(ob2Rate * rfFactor); // 16100
        const rfOBDistRate = Math.round(650 * rfFactor * odOBDiffHm); // 868.24
        const rfCWRate = Math.round(cwRate * rfFactor); // 9800
        const rfCWDistRate = Math.round(550 * rfFactor * ((coalDistMtr - 1000) / 100)); // 11031.85

        const rfOB1Amt = Math.round(ob1Vol * rfOB1Rate);
        const rfOB2Amt = Math.round(ob2Vol * rfOB2Rate);
        const rfOBDistAmt = Math.round(totalOB * rfOBDistRate);
        const rfCWAmt = Math.round(cwVol * rfCWRate);
        const rfCWDistAmt = Math.round(cwVol * rfCWDistRate);

        invItems.push({
          id: `bgg_inv_d1_1`,
          section: "D",
          subSection: "D1. OB Removal Pit Kungkilan",
          description: "OVER BURDEN REMOVAL 1 (75%)",
          sowDescription: "OVER BURDEN REMOVAL 1 (75%)",
          unit: "Bcm",
          volume: ob1Vol,
          unitRateIDR: rfOB1Rate,
          amount: rfOB1Amt,
          amountIDR: rfOB1Amt,
          notes: ba.workPeriod || "-"
        });

        invItems.push({
          id: `bgg_inv_d1_2`,
          section: "D",
          subSection: "D1. OB Removal Pit Kungkilan",
          description: "OVER BURDEN REMOVAL 2 (25%)",
          sowDescription: "OVER BURDEN REMOVAL 2 (25%)",
          unit: "Bcm",
          volume: ob2Vol,
          unitRateIDR: rfOB2Rate,
          amount: rfOB2Amt,
          amountIDR: rfOB2Amt,
          notes: ba.workPeriod || "-"
        });

        invItems.push({
          id: `bgg_inv_d2`,
          section: "D",
          subSection: "D2. Over Distance For OB Removal",
          description: "Pit Kungkilan",
          sowDescription: "Over Distance For OB Removal",
          unit: "Bcm",
          overhaulMtr: obDistMtr,
          volume: totalOB,
          unitRateIDR: rfOBDistRate,
          amount: rfOBDistAmt,
          amountIDR: rfOBDistAmt,
          notes: ba.workPeriod || "-"
        });

        invItems.push({
          id: `bgg_inv_d3`,
          section: "D",
          subSection: "D3. Coal Winning",
          description: "Pit Kungkilan",
          sowDescription: "Coal Winning",
          unit: "Ton",
          volume: cwVol,
          unitRateIDR: rfCWRate,
          amount: rfCWAmt,
          amountIDR: rfCWAmt,
          notes: ba.workPeriod || "-"
        });

        invItems.push({
          id: `bgg_inv_d4`,
          section: "D",
          subSection: "D4. Over Distance For Coal Winning",
          description: "Pit Kungkilan",
          sowDescription: "Over Distance For Coal Winning",
          unit: "Ton",
          overhaulMtr: coalDistMtr,
          volume: cwVol,
          unitRateIDR: rfCWDistRate,
          amount: rfCWDistAmt,
          amountIDR: rfCWDistAmt,
          notes: ba.workPeriod || "-"
        });

        // 5. SECTION E: Discount on Overdistance (Deduction 25% dari OD Base & RF)
        invItems.push({
          id: `bgg_inv_e1`,
          section: "E",
          subSection: "E.1",
          description: "E.1 Overdistance for OB Removal",
          sowDescription: "Overdistance for OB Removal",
          unit: "Lot",
          volume: 0,
          unitRateIDR: 0,
          amount: -Math.round(odOBAmt * 0.25),
          amountIDR: -Math.round(odOBAmt * 0.25),
          isDeduction: true,
          notes: "Diskon 25% Over Distance OB"
        });

        invItems.push({
          id: `bgg_inv_e2`,
          section: "E",
          subSection: "E.2",
          description: "E.2 Overdistance for Coal Winning",
          sowDescription: "Overdistance for Coal Winning",
          unit: "Lot",
          volume: 0,
          unitRateIDR: 0,
          amount: -Math.round(odCWAmt * 0.25),
          amountIDR: -Math.round(odCWAmt * 0.25),
          isDeduction: true,
          notes: "Diskon 25% Over Distance Coal"
        });

        invItems.push({
          id: `bgg_inv_e3`,
          section: "E",
          subSection: "E.3",
          description: "E.3 Raise & Fall's Overdistance for OB Removal",
          sowDescription: "Raise & Fall's Overdistance for OB Removal",
          unit: "Lot",
          volume: 0,
          unitRateIDR: 0,
          amount: -Math.round(rfOBDistAmt * 0.25),
          amountIDR: -Math.round(rfOBDistAmt * 0.25),
          isDeduction: true,
          notes: "Diskon 25% RF Over Distance OB"
        });

        invItems.push({
          id: `bgg_inv_e4`,
          section: "E",
          subSection: "E.4",
          description: "E.4 Raise & Fall's Overdistance for Coal Winning",
          sowDescription: "Raise & Fall's Overdistance for Coal Winning",
          unit: "Lot",
          volume: 0,
          unitRateIDR: 0,
          amount: -Math.round(rfCWDistAmt * 0.25),
          amountIDR: -Math.round(rfCWDistAmt * 0.25),
          isDeduction: true,
          notes: "Diskon 25% RF Over Distance Coal"
        });

        // 6. SECTION F: DP Fuel & Transport (Deduction)
        const finalDPFuel = dpFuelVal > 0 ? dpFuelVal : 3749363200;
        invItems.push({
          id: `bgg_inv_f1`,
          section: "F",
          subSection: "F.1",
          description: `F.1 DP Fuel & Transport (Pengurang Solar BGG ${ba.workPeriod || ""})`,
          sowDescription: "DP Fuel & Transport",
          unit: "Lot",
          volume: 0,
          unitRateIDR: 0,
          amount: -Math.abs(finalDPFuel),
          amountIDR: -Math.abs(finalDPFuel),
          isDeduction: true,
          notes: "Potongan DP Fuel & Transport"
        });

        return invItems;
      }
      return demoBGGItems.map(i => ({ ...i }));
    } else if (code === "DBK") {
      if (ba?.items && Array.isArray(ba.items) && ba.items.length > 0) {
        return ba.items.map((bi: any, idx: number) => ({
          id: bi.id || `dbk_inv_${idx}`,
          sowDescription: bi.material || bi.sowDescription || "Pekerjaan Penambangan DBK",
          unit: bi.unit || "BCM",
          volume: Number(bi.adjustedVolume ?? bi.initialVolume ?? 0),
          unitRateIDR: Number(bi.rate || 0),
          amountIDR: Number(bi.subtotalAdjusted ?? bi.subtotalInitial ?? (Number(bi.rate || 0) * Number(bi.adjustedVolume ?? bi.initialVolume ?? 0))),
          notes: bi.notes || bi.period || "-",
        }));
      }
      return demoDBKItems.map(i => ({ ...i }));
    } else if (code === "SBS") {
      if (ba?.items && Array.isArray(ba.items) && ba.items.length > 0) {
        return ba.items.map((bi: any, idx: number) => ({
          id: bi.id || `sbs_inv_${idx}`,
          sowDescription: bi.material || bi.sowDescription || "Pekerjaan Penambangan SBS",
          unit: bi.unit || "BCM",
          volume: Number(bi.adjustedVolume ?? bi.initialVolume ?? 0),
          unitRateIDR: Number(bi.rate || 0),
          amountIDR: Number(bi.subtotalAdjusted ?? bi.subtotalInitial ?? (Number(bi.rate || 0) * Number(bi.adjustedVolume ?? bi.initialVolume ?? 0))),
          notes: bi.notes || bi.period || "-",
        }));
      }
      return demoSBSItems.map(i => ({ ...i }));
    }

    return [];
  };

  // Snapshot state untuk exporter PDF/Excel (logika ada di exporters.tsx)
  const exportCtx = {
    baRows, buildInvoiceItemsFromBA, calculateItemRateAndAmount, customerContractMap, formData, getCustomerCalculations, getItemEffectiveOverhaulMtr,
    getItemEffectiveVolume, invLineItems, invoiceRows, invPeriodFilter, onNotice, periodFilter,
    query, rfIndexCalculated, subtotalA, subtotalB, subtotalC, subtotalD,
    subtotalE, subtotalF
  };
  const exportPaymentDetailPDF = (itemData: any) => exportPaymentDetailPDFImpl(exportCtx, itemData);
  const exportARBAIMonitoringExcel = () => exportARBAIMonitoringExcelImpl(exportCtx);
  const exportARBAIMonitoringPDF = () => exportARBAIMonitoringPDFImpl(exportCtx);
  const exportBAOnlyExcel = () => exportBAOnlyExcelImpl(exportCtx);
  const exportBAOnlyPDF = () => exportBAOnlyPDFImpl(exportCtx);
  const exportAROnlyExcel = () => exportAROnlyExcelImpl(exportCtx);
  const exportAROnlyPDF = () => exportAROnlyPDFImpl(exportCtx);

  const handleBASelect = (baNumber: string) => {
    if (!baNumber) {
      setFormData((prev: any) => ({ ...prev, baNoReference: "" }));
      return;
    }
    const selectedBa = baRows.find((r) => r.baNumber === baNumber);
    if (selectedBa) {
      const cust = customerRows.find((c: any) => c.code === selectedBa.customerCode);
      const code = selectedBa.customerCode || "POS";
      const cInfo = customerContractMap[code];
      const projectSite = cust?.fullName ? `${cust.fullName} Site` : selectedBa.projectSite || cInfo?.project || `${code} PROJECT`;
      const contractNo = cust?.contractNo || selectedBa.contractNo || cInfo?.contract || `002/${code}-AAP/2025`;
      const workPeriod = selectedBa.workPeriod || "Jul-26";
      const cat = (formData.invoiceCategory || (formData.activityGroup?.includes("MDO") ? "MDO" : "Operation & Mining")) as "Operation & Mining" | "MDO";
      let autoInvNo = generateInvoiceNumber(code, workPeriod, invoiceRows.length);
      if (code === "POS" && cat === "MDO") {
        autoInvNo = autoInvNo.replace(/RF|MINING/g, "MDO");
      }
      const poNum = selectedBa.noPO || selectedBa.poNumber || (code === "POS" ? "PO-POS-2026-001" : code === "BGG" ? "PO-BGG-2026-003" : `PO-${code}-2026-001`);

      setFormData((prev: any) => ({
        ...prev,
        baNoReference: selectedBa.baNumber,
        customerCode: code,
        projectSite: projectSite,
        contractNo: contractNo,
        workPeriod: workPeriod,
        invoiceNo: autoInvNo,
        noPO: poNum,
        poNumber: poNum,
        activityGroup: (code === "POS" && cat === "MDO") ? "MINE DEVELOPMENT OPERATION (MDO)" : (selectedBa.activityGroup || "OPERATION & MINING"),
        invoiceCategory: cat,
        bankName: cInfo?.bankName || prev.bankName || "Bank BNI",
        bankAccountNo: cInfo?.bankAccountNo || prev.bankAccountNo || "8188788882",
        bankBranch: cInfo?.bankBranch || prev.bankBranch || "Harmoni, Jakarta",
      }));

      const filledItems = buildInvoiceItemsFromBA(selectedBa, code, cat);
      setInvLineItems(filledItems);

      onNotice(`No. BA ${selectedBa.baNumber} dipilih. Volume survei klaim [${cat}] & seluruh data penagihan berhasil diisi otomatis.`);
    }
  };

  const createInvoiceFromBA = (ba: any, category: "Operation & Mining" | "MDO" = "Operation & Mining") => {
    // Gatekeeping: Pastikan BA sudah diverifikasi sebelum bisa buat invoice
    if (ba.statusBA !== "Ready to Invoice" && !ba.verifiedBy) {
      onNotice("Perhatian: Berita Acara belum diverifikasi oleh Finance Specialist. Mohon verifikasi BA terlebih dahulu.");
      return;
    }

    const code = ba.customerCode || "POS";
    const period = ba.workPeriod || "Jul-26";
    const cust = customerRows.find((c: any) => c.code === code);
    const cInfo = customerContractMap[code];
    let autoInvNo = generateInvoiceNumber(code, period, invoiceRows.length);
    if (code === "POS" && category === "MDO") {
      autoInvNo = autoInvNo.replace(/RF|MINING/g, "MDO");
    }
    const projectSite = cust?.fullName ? `${cust.fullName} Site` : ba.projectSite || cInfo?.project || `${code} PROJECT`;
    const contractNo = cust?.contractNo || ba.contractNo || cInfo?.contract || `002/${code}-AAP/2025`;
    const poNum = ba.noPO || ba.poNumber || (code === "POS" ? "PO-POS-2026-001" : code === "BGG" ? "PO-BGG-2026-003" : `PO-${code}-2026-001`);
    const actGroup = (code === "POS" && category === "MDO") ? "MINE DEVELOPMENT OPERATION (MDO)" : "OPERATION & MINING";

    setEditItem(null);
    setFormData({
      customerCode: code,
      workPeriod: period,
      invoiceNo: autoInvNo,
      baNoReference: ba.baNumber,
      noPO: poNum,
      poNumber: poNum,
      status: "Draft",
      activityGroup: actGroup,
      invoiceCategory: category,
      projectSite: projectSite,
      contractNo: contractNo,
      bankName: cInfo?.bankName || "Bank BNI",
      bankAccountNo: cInfo?.bankAccountNo || "8188788882",
      bankBranch: cInfo?.bankBranch || "Harmoni, Jakarta",
      directorName: cInfo?.directorName || "GAHARI CHRISTINE",
      directorTitle: cInfo?.directorTitle || "DIRECTOR",
    });

    const filledItems = buildInvoiceItemsFromBA(ba, code, category);
    setInvLineItems(filledItems);
    setDetailViewItem(null);
    setModalType("invoice");
    onNotice(`Menyiapkan Form Draf Invoice [${category}] dari No. BA ${ba.baNumber} (${code}) — Silakan Finance Site periksa rincian sebelum disimpan.`);
  };

  const getInitialBAItemsForRecord = useCallback((item: any) => {
    if (!item) return [];
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      return item.items;
    }
    const baNo = (item.baNumber || item.draftBARefNo || "").trim();
    const period = (item.workPeriod || "").trim();
    const cust = (item.customerCode || "").trim();

    // 1. BGG Jan-26: 20/BAP-AAP-KKLII/26 (Total Rp 6.660.392.676)
    if (baNo.includes("20/BAP-AAP-KKL") || (cust === "BGG" && period === "Jan-26")) {
      return [
        { id: "bgg_jan_ob1", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Jan-26", unit: "BCM", initialVolume: 158500.00, adjustedVolume: 158500.00, rate: 27250, subtotalInitial: 4319125000, subtotalAdjusted: 4319125000 },
        { id: "bgg_jan_ob2", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Jan-26", unit: "BCM", initialVolume: 52833.33, adjustedVolume: 52833.33, rate: 26500, subtotalInitial: 1400083245, subtotalAdjusted: 1400083245 },
        { id: "bgg_jan_cw", category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning Pit Kungkilan", period: "Jan-26", unit: "Ton", initialVolume: 16858.73, adjustedVolume: 16858.73, rate: 16500, subtotalInitial: 278169045, subtotalAdjusted: 278169045 },
        { id: "bgg_jan_odob", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Jan-26", unit: "BCM", distanceWeightAvg: 1220, initialVolume: 211333.33, adjustedVolume: 211333.33, rate: 1450, isDistanceVar: true, subtotalInitial: 306433328, subtotalAdjusted: 306433328 },
        { id: "bgg_jan_odcw", category: "Over Distance", area: "Pit KKL", material: "Over Distance For Coal Winning", period: "Jan-26", unit: "Ton", distanceWeightAvg: 4200, initialVolume: 16858.73, adjustedVolume: 16858.73, rate: 21150, isDistanceVar: true, subtotalInitial: 356582058, subtotalAdjusted: 356582058 }
      ];
    }

    // 2. BGG Feb-26: 21/BAP-AAP-KKL/II/26 (Total Rp 7.850.000.000)
    if (baNo.includes("21/BAP-AAP-KKL") || (cust === "BGG" && period === "Feb-26")) {
      return [
        { id: "bgg_feb_ob1", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", unit: "BCM", initialVolume: 185000.00, adjustedVolume: 185000.00, rate: 27250, subtotalInitial: 5041250000, subtotalAdjusted: 5041250000 },
        { id: "bgg_feb_ob2", category: "Operating & Mining", area: "Pit KKL", material: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", unit: "BCM", initialVolume: 61666.67, adjustedVolume: 61666.67, rate: 26500, subtotalInitial: 1634166755, subtotalAdjusted: 1634166755 },
        { id: "bgg_feb_cw", category: "Operating & Mining", area: "Pit KKL", material: "Coal Winning Pit Kungkilan", period: "Feb-26", unit: "Ton", initialVolume: 25000.00, adjustedVolume: 25000.00, rate: 16500, subtotalInitial: 412500000, subtotalAdjusted: 412500000 },
        { id: "bgg_feb_odob", category: "Over Distance", area: "Pit KKL", material: "Over Distance For OB Removal", period: "Feb-26", unit: "BCM", distanceWeightAvg: 1232, initialVolume: 246666.67, adjustedVolume: 246666.67, rate: 1393, isDistanceVar: true, subtotalInitial: 343606671, subtotalAdjusted: 343606671 },
        { id: "bgg_feb_odcw", category: "Over Distance", area: "Pit KKL", material: "Over Distance For Coal Winning", period: "Feb-26", unit: "Ton", distanceWeightAvg: 4040, initialVolume: 25000.00, adjustedVolume: 25000.00, rate: 16739, isDistanceVar: true, subtotalInitial: 418476574, subtotalAdjusted: 418476574 }
      ];
    }

    // 3. BGG Mar-26: 22/BAP-AAP-KKL/III/26 (Total Rp 20.299.536.335)
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

    // 4. BGG Jun-26: SRV-OB/BGG/06/06/26 (Invoice 091 - Total Rp 8.108.223.583)
    if (baNo.includes("SRV-OB/BGG") || (cust === "BGG" && (period.includes("Jun") || period === "Juni 2026"))) {
      return FALLBACK_BGG_BA_ITEMS;
    }

    // 5. SBS Jan-26: 127-128/SBS-Banko/PRO/III/2026 (Total Rp 4.850.000.000)
    if (cust === "SBS" && (baNo.includes("127-128") || period === "Jan-26")) {
      return [
        { id: "sbs_jan_op1", category: "Operating & Mining", area: "Pit SBS", material: "OB Removal Area Kerja", period: "Jan-26", unit: "BCM", initialVolume: 135000.00, adjustedVolume: 135000.00, rate: 28000, subtotalInitial: 3780000000, subtotalAdjusted: 3780000000 },
        { id: "sbs_jan_op2", category: "Operating & Mining", area: "Pit SBS", material: "Jasa Penunjang Produksi", period: "Jan-26", unit: "Hours", initialVolume: 1800.00, adjustedVolume: 1800.00, rate: 350000, subtotalInitial: 630000000, subtotalAdjusted: 630000000 },
        { id: "sbs_jan_op3", category: "Operating & Mining", area: "Pit SBS", material: "Hauling & Water Management", period: "Jan-26", unit: "Hours", initialVolume: 1047.62, adjustedVolume: 1047.62, rate: 420000, subtotalInitial: 440000000, subtotalAdjusted: 440000000 }
      ];
    }

    // 6. SBS Dec-25: 55-56/SBS-Banko/PRO/I/2026 (Total Rp 3.231.259.551)
    if (cust === "SBS" && (baNo.includes("55-56") || period === "Dec-25")) {
      return [
        { id: "sbs_dec_op1", category: "Operating & Mining", area: "Pit SBS", material: "OB Removal Area Kerja", period: "Dec-25", unit: "BCM", initialVolume: 90000.00, adjustedVolume: 90000.00, rate: 28000, subtotalInitial: 2520000000, subtotalAdjusted: 2520000000 },
        { id: "sbs_dec_op2", category: "Operating & Mining", area: "Pit SBS", material: "Jasa Penunjang Produksi", period: "Dec-25", unit: "Hours", initialVolume: 1100.00, adjustedVolume: 1100.00, rate: 350000, subtotalInitial: 385000000, subtotalAdjusted: 385000000 },
        { id: "sbs_dec_op3", category: "Operating & Mining", area: "Pit SBS", material: "Hauling & Water Management", period: "Dec-25", unit: "Hours", initialVolume: 776.81, adjustedVolume: 776.81, rate: 420000, subtotalInitial: 326259551, subtotalAdjusted: 326259551 }
      ];
    }

    // 7. SBS Feb-26: 270-273/SBS-Banko/PRO/III/2026 (Total Rp 3.950.000.000)
    if (cust === "SBS" && (baNo.includes("270-273") || period === "Feb-26")) {
      return [
        { id: "sbs_feb_op1", category: "Operating & Mining", area: "Pit SBS", material: "OB Removal Area Kerja", period: "Feb-26", unit: "BCM", initialVolume: 110000.00, adjustedVolume: 110000.00, rate: 28000, subtotalInitial: 3080000000, subtotalAdjusted: 3080000000 },
        { id: "sbs_feb_op2", category: "Operating & Mining", area: "Pit SBS", material: "Jasa Penunjang Produksi", period: "Feb-26", unit: "Hours", initialVolume: 1400.00, adjustedVolume: 1400.00, rate: 350000, subtotalInitial: 490000000, subtotalAdjusted: 490000000 },
        { id: "sbs_feb_op3", category: "Operating & Mining", area: "Pit SBS", material: "Hauling & Water Management", period: "Feb-26", unit: "Hours", initialVolume: 904.76, adjustedVolume: 904.76, rate: 420000, subtotalInitial: 380000000, subtotalAdjusted: 380000000 }
      ];
    }

    // 8. DBK Jan-26: 01/DBK-AAP/I/2026 (Total Rp 5.400.000.000)
    if (cust === "DBK") {
      return [
        { id: "dbk_jan_op1", category: "Operating & Mining", area: "Pit Sapan", material: "OB Removal (Pit Sapan)", period: "Jan-26", unit: "BCM", initialVolume: 120000.00, adjustedVolume: 120000.00, rate: 31500, subtotalInitial: 3780000000, subtotalAdjusted: 3780000000 },
        { id: "dbk_jan_op2", category: "Operating & Mining", area: "Pit Sapan", material: "Coal Winning (Pit Sapan)", period: "Jan-26", unit: "Ton", initialVolume: 45000.00, adjustedVolume: 45000.00, rate: 36000, subtotalInitial: 1620000000, subtotalAdjusted: 1620000000 }
      ];
    }

    // 9. POS May-26: 050/BA-HRGA/AAP-POS/V/2026 (Total Rp 4.754.595.031)
    if (baNo.includes("050/BA-HRGA") || (cust === "POS" && period === "May-26")) {
      return [
        { id: "pos_may_mdo1", category: "MDO", area: "Site POS", material: "Mine Development (MDO) - Clearing & Access Road", period: "May-26", unit: "Ha", initialVolume: 250.00, adjustedVolume: 250.00, rate: 15500000, subtotalInitial: 3875000000, subtotalAdjusted: 3875000000 },
        { id: "pos_may_mdo2", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", period: "May-26", unit: "USD/1KM", initialVolume: 93078.84, adjustedVolume: 93078.84, rate: 9450, subtotalInitial: 879595031, subtotalAdjusted: 879595031 }
      ];
    }

    // 10. POS Jun-26: 051/BA-POS-NIKEL/VI/2026 (Total Rp 42.150.000.000)
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

    // 11. POS Jul-26 (052): 052/BA-POS-NIKEL/VII/2026 (Total Rp 44.448.368.475)
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

    // 12. POS Jul-26 Pending (053): 053/BA-POS-PENDING-VOL/VII/2026 (Total Rp 1.873.994.494)
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

    if (cust === "BGG" || cust === "PT BGG") return defaultBGGBAItems;
    return defaultPOSBAOperatingItems;
  }, [defaultBGGBAItems, defaultPOSBAOperatingItems, FALLBACK_BGG_BA_ITEMS]);

  const openBAModal = (item: any, isEditMode: boolean = false) => {
    setEditItem(item);
    setIsInlineEditingBA(isEditMode);
    const bggData = item.bggData;
    const bggTotalTerbongkar = bggData?.agreedSurveyVolume || bggData?.volumeBGG || 0;
    const bggCoalVolumeBCM = bggData?.coalVolumeBCM || 0;
    const bggCoalVolumeTon = bggData?.coalVolumeTon || 0;
    const bggOBDistanceHm = bggData?.obOverDistanceHm || 0;
    const bggNettOB = bggData?.nettOBVolume || (bggTotalTerbongkar > 0 ? Math.max(0, bggTotalTerbongkar - bggCoalVolumeBCM) : 0);

    setFormData({
      ...item,
      bggTotalTerbongkar,
      bggCoalVolumeBCM,
      bggCoalVolumeTon,
      bggOBDistanceHm,
      bggNettOB,
      workEndDate: formatDateInput(item.workEndDate),
      baSubmittedDate: formatDateInput(item.baSubmittedDate),
      baSentDate: formatDateInput(item.baSentDate),
      internalRoutingDate: formatDateInput(item.internalRoutingDate),
      baSignedDate: formatDateInput(item.baSignedDate),
      invoiceIssuedDate: formatDateInput(item.invoiceIssuedDate),
      baDate: formatDateInput(item.baDate),
      invoiceDate: formatDateInput(item.invoiceDate),
      paymentDate: formatDateInput(item.paymentDate),
    });
    const initialItems = getInitialBAItemsForRecord(item);
    const ops = initialItems.filter((i: any) => i.category === "Operating & Mining" || i.category === "Over Distance" || i.category === "Penambangan BGG" || i.category === "Mining");
    const mdo = initialItems.filter((i: any) => i.category === "MDO");
    setBaOperatingItems(ops);
    setBaMDOItems(mdo);
    setActiveBAStep(1);
    setDetailViewItem(null);
    setModalType("ba");
  };

  const getCurrentMonthPeriod = () => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const now = new Date();
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const createBlankBGGBAItems = useCallback((period = getCurrentMonthPeriod()) => [
    { id: `bgg_ob1_${Date.now()}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 1 (75%)", period: period, notes: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 29500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_ob2_${Date.now() + 1}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 2 (25%)", period: period, notes: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 28750, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_cw_${Date.now() + 2}`, category: "Operating & Mining", area: "", material: "Coal Winning", period: period, notes: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: 17500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_od_ob_${Date.now() + 3}`, category: "Over Distance", area: "", material: "Over Distance For OB Removal", period: period, notes: "", unit: "BCM", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 1550, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_od_cw_${Date.now() + 4}`, category: "Over Distance", area: "", material: "Over Distance For Coal Winning", period: period, notes: "", unit: "Ton", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 19700, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
  ], []);

  const openCreateModal = (type: "ba" | "invoice" | "payment" | "customer" | "pending_volume", initialData: any = {}) => {
    setEditItem(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    const curMonth = getCurrentMonthPeriod();
    if (type === "ba") {
      const cust = initialData.customerCode || "BGG";
      const isBGG = cust === "BGG" || cust === "PT BGG";
      const defaultPeriod = initialData.workPeriod || curMonth;
      setIsInlineEditingBA(true);
      setFormData({
        statusBA: "Submit",
        baSubmittedDate: todayStr,
        workPeriod: defaultPeriod,
        customerCode: cust,
        picAAP: "Operations / Site Engineer",
        step1Locked: false,
        draftBARefNo: "",
        signedBANumber: "",
        invoiceNoLinked: "",
        invoiceIssuedDate: "",
        verifiedBy: "",
        verifiedAt: "",
        approvedBy: "",
        approvedAt: "",
        bggTotalTerbongkar: initialData.bggTotalTerbongkar ?? "",
        bggCoalVolumeBCM: initialData.bggCoalVolumeBCM ?? "",
        bggCoalVolumeTon: initialData.bggCoalVolumeTon ?? "",
        bggOBDistanceHm: initialData.bggOBDistanceHm ?? 0,
        bggNettOB: 0,
        ...initialData,
      });
      setBaOperatingItems(isBGG ? createBlankBGGBAItems(defaultPeriod) : defaultPOSBAOperatingItems.map(it => ({ ...it, area: "", period: defaultPeriod })));
      setBaMDOItems(isBGG ? [] : defaultPOSBAMDOItems.map(it => ({ ...it, area: "", period: defaultPeriod })));
      setActiveBAStep(1);
    } else if (type === "pending_volume") {
      setFormData({
        customerCode: "POS",
        workPeriod: curMonth,
        workAmount: 0,
        picAAP: "Surveyor Site",
        notes: "Pending Volume Hasil Joint Survey",
        ...initialData,
      });
    } else if (type === "invoice") {
      const defaultCompany = initialData?.customerCode || "POS";
      const defaultPeriod = initialData?.workPeriod || "Juni 2026";
      const autoInvNo = generateInvoiceNumber(defaultCompany, defaultPeriod, invoiceRows.length);
      const cInfo = customerContractMap[defaultCompany];
      setFormData({
        customerCode: defaultCompany,
        workPeriod: defaultPeriod,
        invoiceNo: autoInvNo,
        activityGroup: "OPERATION & MINING",
        projectSite: cInfo?.project || "POS PROJECT",
        contractNo: cInfo?.contract || "002/POS-AAP/2025",
        bankName: cInfo?.bankName || "Bank BNI",
        bankAccountNo: cInfo?.bankAccountNo || "8188788882",
        bankBranch: cInfo?.bankBranch || "Harmoni, Jakarta",
        directorName: cInfo?.directorName || "GAHARI CHRISTINE",
        directorTitle: cInfo?.directorTitle || "DIRECTOR",
        ...initialData,
      });
      if (defaultCompany === "BGG") setInvLineItems(blankBGGItems);
      else if (defaultCompany === "DBK") setInvLineItems(blankDBKItems);
      else if (defaultCompany === "SBS") setInvLineItems(blankSBSItems);
      else setInvLineItems(blankPOSItems);
    }
    setModalType(type);
  };

  const openEditModal = (type: "ba" | "invoice" | "payment" | "customer", item: any) => {
    if (type === "ba") {
      openBAModal(item, true);
      return;
    }
    setEditItem(item);
    setFormData({
      ...item,
      workEndDate: formatDateInput(item.workEndDate),
      baSubmittedDate: formatDateInput(item.baSubmittedDate),
      baSentDate: formatDateInput(item.baSentDate),
      internalRoutingDate: formatDateInput(item.internalRoutingDate),
      baSignedDate: formatDateInput(item.baSignedDate),
      invoiceIssuedDate: formatDateInput(item.invoiceIssuedDate),
      baDate: formatDateInput(item.baDate),
      invoiceDate: formatDateInput(item.invoiceDate),
      paymentDate: formatDateInput(item.paymentDate),
    });

    if (type === "invoice") {
      const code = (item.customerCode || "POS").toUpperCase();
      const cat = item.invoiceCategory;
      const items = (item.items && Array.isArray(item.items) && item.items.length > 0)
        ? item.items
        : buildInvoiceItemsFromBA(baRows.find((b: any) => b.baNumber === item.baNoReference) || item, code, cat);
      setInvLineItems(items);
    }
    setModalType(type);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onNotice(`Mengunggah berkas PDF "${file.name}" ke server...`);
      try {
        const res = await uploadDocumentFile(file, "Berita Acara", fieldName === "draftBAPath" ? "Draft BA" : "Final Signed BA");
        const permanentUrl = res.url || `/uploads/${res.storedName}`;
        setFormData((prev: any) => ({
          ...prev,
          [fieldName]: permanentUrl,
          [`${fieldName}Name`]: file.name
        }));
        onNotice(`Berkas PDF "${file.name}" berhasil disimpan di server.`);
      } catch (err: any) {
        onNotice(`Gagal mengunggah PDF: ${err?.message || "Kesalahan server"}`);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = "";
      let payload: any = { ...formData };

      if (modalType === "ba") {
        endpoint = "/api/finance/ba-trackers";
        const isBGG = formData.customerCode === "BGG" || formData.customerCode === "PT BGG";

        const calculateItemSubtotal = (it: any, vol: number) => {
          const r = Number(it.rate || 0);
          if (it.category === "DP Fuel" || it.isDeduction || (it.material || "").toLowerCase().includes("dp fuel")) {
            const amt = r !== 0 ? r : (it.subtotalInitial ? Number(it.subtotalInitial) : 0);
            const v = vol > 0 ? vol : 1;
            return -Math.abs(v === 1 ? amt : v * amt);
          }
          if (it.isDistanceVar || it.category === "Over Distance" || it.material?.toLowerCase().includes("distance") || it.material?.toLowerCase().includes("overhaul")) {
            const dist = Number(it.distanceWeightAvg ?? 1000);
            const diffKm = (dist - 1000) / 1000;
            return Math.round(vol * diffKm * r);
          }
          return Math.round(vol * r);
        };

        const allItems = [...baOperatingItems, ...baMDOItems].map((it) => {
          const vInit = Number(it.initialVolume || 0);
          const vAdj = Number(it.adjustedVolume ?? it.initialVolume ?? 0);
          return {
            ...it,
            subtotalInitial: calculateItemSubtotal(it, vInit),
            subtotalAdjusted: calculateItemSubtotal(it, vAdj),
          };
        });

        const initSum = allItems.reduce((acc, item) => acc + Number(item.subtotalInitial || 0), 0);
        const adjSum = allItems.reduce((acc, item) => acc + Number(item.subtotalAdjusted || 0), 0);
        const finalAmount = adjSum !== 0 ? adjSum : (initSum !== 0 ? initSum : Number(formData.workAmount || 0));

        payload = {
          ...formData,
          customerCode: formData.customerCode || "POS",
          workPeriod: formData.workPeriod || "Juni 2026",
          picAAP: formData.picAAP || "Operations / Site Engineer",
          items: allItems,
          initialWorkAmount: initSum,
          adjustedWorkAmount: adjSum,
          workAmount: finalAmount,
          step1Locked: true,
          ...(isBGG ? {
            bggData: {
              agreedSurveyVolume: Number(formData.bggTotalTerbongkar || 0),
              coalVolumeBCM: Number(formData.bggCoalVolumeBCM || 0),
              coalVolumeTon: Number(formData.bggCoalVolumeTon || 0),
              nettOBVolume: Number(formData.bggNettOB || 0),
              obOverDistanceHm: Number(formData.bggOBDistanceHm || 0),
              ...(formData.bggData || {}),
            }
          } : {})
        };
      }
      else if (modalType === "pending_volume") {
        endpoint = "/api/finance/ba-trackers";
        payload = {
          baNumber: `053/BA-${formData.customerCode || "POS"}-PENDING-VOL/${(formData.workPeriod || "JUL-26").toUpperCase().replace(/\s+/g, '')}`,
          customerCode: formData.customerCode || "POS",
          workPeriod: formData.workPeriod || "Juni 2026",
          workAmount: Number(formData.workAmount || 0),
          statusBA: "Submit",
          picAAP: formData.picAAP || "Surveyor Site",
          notesBottleneck: "Pending: Joint Survey Tambahan",
          notes: formData.notes || "Pending Volume Hasil Joint Survey Tambahan",
          baSubmittedDate: new Date().toISOString()
        };
      }
      else if (modalType === "invoice") endpoint = "/api/finance/invoices";
      else if (modalType === "payment") endpoint = "/api/finance/payments";
      else if (modalType === "customer") endpoint = "/api/finance/customers";
      if (modalType === "invoice") {
        payload = {
          ...formData,
          status: formData.status || "Draft",
          items: invLineItems,
          invoiceNo: formData.invoiceNo || "003/POS-AAP/RF/VI/2026",
          customerCode: formData.customerCode || "POS",
          projectSite: formData.projectSite || "POS PROJECT",
          contractNo: formData.contractNo || "002/POS-AAP/2025",
          workPeriod: formData.workPeriod || "Juni 2026",
          jobType: "Mining Production & Overhaul Billing",
          volumeUnit: "BCM",
          revenueGross: totalGrossCalc,
          subTotalDPP: dpp11_12Calc,
          ppn11: vat12Calc,
          pph23: pph23Calc,
          totalInvoice: netTotalInvoiceCalc,
          invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : new Date().toISOString(),
          notes: `PAYMENT DETAIL (RF Index: ${rfIndexCalculated.toFixed(3)})`
        };
      }

      const dateKeys = [
        "workEndDate", "baSubmittedDate", "baSentDate", "internalRoutingDate",
        "baSignedDate", "invoiceIssuedDate", "baDate", "invoiceDate", "paymentDate",
        "verifiedAt", "approvedAt", "dueDate", "taxReportedDate"
      ];
      dateKeys.forEach((key) => {
        if (payload[key] && typeof payload[key] === "string" && payload[key].trim() !== "") {
          try {
            payload[key] = new Date(payload[key]).toISOString();
          } catch {
            payload[key] = null;
          }
        } else if (payload[key] === "" || payload[key] === undefined) {
          payload[key] = null;
        }
      });

      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        await api(endpoint, { method: "PUT", body: JSON.stringify(payload) });
        onNotice("Data berhasil diperbarui!");
      } else {
        await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
        onNotice("Data baru berhasil ditambahkan!");
      }

      if (modalType === "invoice" && payload.baNoReference) {
        const targetBA = baRows.find((r) => r.baNumber === payload.baNoReference);
        if (targetBA) {
          await api(`/api/finance/ba-trackers/${targetBA.id}`, {
            method: "PUT",
            body: JSON.stringify({
              ...targetBA,
              statusBA: "Ready to Invoice",
              invoiceNoLinked: payload.invoiceNo
            })
          }).catch(() => {});
        }
      }

      setModalType("none");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan data");
    }
  };

  const handleVerifyBA = async (id: number) => {
    try {
      const updated = await verifyBATracker(id, "verify", "Verifikasi Berita Acara oleh SPV Site");
      onNotice("Berita Acara berhasil diverifikasi oleh SPV Site.");
      await loadData();
      if (detailViewItem && detailViewItem.type === "ba" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "ba", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi BA");
    }
  };

  const handleApproveBA = async (id: number) => {
    try {
      const updated = await approveBATracker(id, "approve", "Disetujui oleh Manager");
      onNotice("Berita Acara disetujui (Approved by Manager).");
      await loadData();
      if (detailViewItem && detailViewItem.type === "ba" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "ba", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyetujui BA");
    }
  };

  const handleSaveBGGBA = async (baPayload: any, isSubmit = false) => {
    try {
      if (baPayload.id) {
        await api(`/api/finance/ba-trackers/${baPayload.id}`, {
          method: "PUT",
          body: JSON.stringify(baPayload),
        });
      } else {
        await api(`/api/finance/ba-trackers`, {
          method: "POST",
          body: JSON.stringify(baPayload),
        });
      }
      onNotice(isSubmit ? "Berita Acara BGG berhasil diajukan ke HO untuk verifikasi." : "Draft Berita Acara BGG berhasil disimpan.");
      await loadData();
    } catch (err: any) {
      onNotice(`Gagal menyimpan BA: ${err?.message || err}`);
    }
  };

  const handleGenerateInvoiceFromBA = async (baId: number) => {
    try {
      const newInv: any = await generateInvoiceFromBA(baId);
      onNotice(`Berhasil membuat Draft Mining Invoice No. ${newInv?.invoiceNo || "091/BGG-AAP/VI/2026"} dari Berita Acara.`);
      await loadData();
    } catch (err: any) {
      onNotice(`Gagal membuat invoice: ${err?.message || err}`);
    }
  };

  const handleVerifyInvoice = async (id: number) => {
    try {
      const updated = await verifyInvoice(id, "verify", "Verifikasi rincian Invoice oleh SPV Site");
      onNotice("Invoice berhasil diverifikasi oleh SPV. Menunggu Approval Tier 1 (Manager).");
      await loadData();
      if (detailViewItem && detailViewItem.type === "invoice" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "invoice", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi Invoice");
    }
  };

  const handleApproveInvoiceTier1 = async (id: number) => {
    try {
      const updated = await approveInvoiceTier1(id, "approve", "Persetujuan Tier 1 oleh Finance Manager");
      onNotice("Approval Tier 1 (Manager) Berhasil. Menunggu Approval Tier 2 (Direktur).");
      await loadData();
      if (detailViewItem && detailViewItem.type === "invoice" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "invoice", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyetujui Approval Tier 1 Invoice");
    }
  };

  const handleApproveInvoiceTier2 = async (id: number) => {
    try {
      const updated = await approveInvoiceTier2(id, "approve", "Persetujuan Eksekutif Tier 2 oleh Direktur");
      onNotice("Approval Tier 2 (Direktur) Berhasil. Status Invoice: Issued.");
      await loadData();
      if (detailViewItem && detailViewItem.type === "invoice" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "invoice", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyetujui Approval Tier 2 Invoice");
    }
  };

  const handleDelete = async (type: "ba" | "invoice" | "payment" | "customer", id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      let endpoint = "";
      if (type === "ba") endpoint = `/api/finance/ba-trackers/${id}`;
      else if (type === "invoice") endpoint = `/api/finance/invoices/${id}`;
      else if (type === "payment") endpoint = `/api/finance/payments/${id}`;
      else if (type === "customer") endpoint = `/api/finance/customers/${id}`;

      await api(endpoint, { method: "DELETE" });
      onNotice("Data berhasil dihapus!");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus data");
    }
  };

  if (loading) {
    return (
      <div className="workspace-body">
        <PageHeader title={viewTitle} description="Memuat data keuangan dan penagihan..." />
        <div className="panel flex items-center justify-center p-12 text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Clock className="animate-spin mr-2 text-cyan-600" size={20} /> Memuat data...
        </div>
      </div>
    );
  }

  // Kalkulasi Live Preview untuk Modal Invoice Standard
  const volPreview = Number(formData.volume || 0);
  const ratePreview = Number(formData.rate || 0);
  const grossPreview = volPreview * ratePreview;
  const solarPreview = Number(formData.solarDeduction || 0);
  const subtotalDPPPreview = grossPreview - solarPreview;
  const ppn11Preview = subtotalDPPPreview * 0.11;
  const pph23Preview = subtotalDPPPreview * 0.02;
  const totalNetInvoicePreview = subtotalDPPPreview + ppn11Preview - pph23Preview;
  // Total Rekapitulasi Aging Matrix untuk Footer Dashboard Table
  const totalAgingMatrix = (dashboardData?.agingMatrix ?? []).reduce(
    (acc: any, row: any) => ({
      notDue: acc.notDue + (row.notDue || 0),
      bucket1_30: acc.bucket1_30 + (row.bucket1_30 || 0),
      bucket31_60: acc.bucket31_60 + (row.bucket31_60 || 0),
      bucket61_90: acc.bucket61_90 + (row.bucket61_90 || 0),
      bucketOver90: acc.bucketOver90 + (row.bucketOver90 || 0),
      total: acc.total + (row.total || 0),
      invoiceCount: acc.invoiceCount + (row.invoiceCount || 0),
    }),
    { notDue: 0, bucket1_30: 0, bucket31_60: 0, bucket61_90: 0, bucketOver90: 0, total: 0, invoiceCount: 0 }
  );

  return {
    loading, setLoading, dashboardData, setDashboardData, baRows,
    setBaRows, userRole, isSuper, isFinanceSpecialist, isSPV,
    isManager, isDirector, invoiceRows, setInvoiceRows, paymentRows,
    setPaymentRows, customerRows, setCustomerRows, pendingVolumeLedgers, setPendingVolumeLedgers,
    showPendingVolumeDrawer, setShowPendingVolumeDrawer, baFilter, setBaFilter, periodFilter,
    setPeriodFilter, invStatusFilter, setInvStatusFilter, invCardTab, setInvCardTab,
    invPeriodFilter, setInvPeriodFilter, modalType, setModalType, editItem,
    setEditItem, formData, setFormData, showActivityGroupDropdown, setShowActivityGroupDropdown,
    showExportBADropdown, setShowExportBADropdown, showInputBADropdown, setShowInputBADropdown, showExportARDropdown,
    setShowExportARDropdown, showInputARDropdown, setShowInputARDropdown, baRowActionDropdownId, setBaRowActionDropdownId,
    detailViewItem, setDetailViewItem, isInlineEditingBA, setIsInlineEditingBA, showAddPartialPayment,
    setShowAddPartialPayment, partialPaymentForm, setPartialPaymentForm, mRate, setMRate,
    fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR, dynamicSowOptions,
    setDynamicSowOptions, bankAccountOptions, setBankAccountOptions, getSowMasterRate, financeTemplates,
    setFinanceTemplates, templatesLoaded, setTemplatesLoaded, templateRows, masterBankAccounts,
    
    rfIndexCalculated, defaultMasterVariableOptions, masterVariableOptions, activeSOWCatalog, applyRateLookup,
    blankPOSItems, demoPOSItems, blankBGGItems, demoBGGItems, blankDBKItems,
    demoDBKItems, blankSBSItems, demoSBSItems, defaultPOSBAOperatingItems, defaultPOSBAMDOItems,
    defaultBGGBAItems, baOperatingItems, setBaOperatingItems, baMDOItems, setBaMDOItems,
    activeBAStep, setActiveBAStep, showAddRowDropdown, setShowAddRowDropdown, posInvoiceCategory,
    setPosInvoiceCategory, invLineItems, setInvLineItems, selectedVarA, setSelectedVarA,
    selectedVarB, setSelectedVarB, selectedVarC, setSelectedVarC, selectedVarD,
    setSelectedVarD, selectedVarE, setSelectedVarE, selectedVarF, setSelectedVarF,
    selectedVarP, setSelectedVarP, addVariableToSection, customerContractMap, handleCompanySelect,
    loadDemoPOSData, loadDemoBGGData, loadDemoDBKData, loadDemoSBSData, removeInvLineItem,
    updateInvItemVolume, updateInvItemOverhaul, updateInvItemRateIDR, updateInvItemRateUSD, updateInvItemKurs,
    updateInvItemAmount, getItemEffectiveVolume, getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations,
    calcs, subtotalA, subtotalB, subtotalC, subtotalD,
    subtotalE, subtotalF, subtotalP, totalGrossCalc, dpp11_12Calc,
    vat12Calc, pph23Calc, netTotalInvoiceCalc, totalDibayarCalc, exportPaymentDetailPDF,
    exportARBAIMonitoringExcel, exportARBAIMonitoringPDF, exportBAOnlyExcel, exportBAOnlyPDF, exportAROnlyExcel,
    exportAROnlyPDF, loadData, handleSavePartialPayment, handleVerifyPartialPayment, buildInvoiceItemsFromBA,
    handleBASelect, createInvoiceFromBA, openBAModal, openCreateModal, openEditModal,
    handleFileUpload, handleSave, handleVerifyBA, handleApproveBA, handleSaveBGGBA,
    handleGenerateInvoiceFromBA, handleVerifyInvoice, handleApproveInvoiceTier1, handleApproveInvoiceTier2, handleDelete,
    volPreview, ratePreview, grossPreview, solarPreview, subtotalDPPPreview,
    ppn11Preview, pph23Preview, totalNetInvoicePreview, totalAgingMatrix, viewTitle,
    query, onNotice, user
  };
}
