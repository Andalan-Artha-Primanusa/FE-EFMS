import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, approveInvoiceTier2, getFinanceTemplates, User as UserType } from "../../lib/api";
import { authorized } from "../../lib/auth";

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
  // Action authorization is permission / T-Code driven (matches backend checkRolePermission),
  // internally fail-closed: absent permissions deny. Super Admin bypasses via authorized().
  // write/save/submit tier -> operational_transaction:write (BA/Inv/Pay/Cust CRUD route guard)
  const isFinanceSpecialist = authorized(user, "operational_transaction", "write");
  // SPV verify tier -> ba_tracker:verify | invoice:verify
  const isSPV = authorized(user, "ba_tracker", "verify") || authorized(user, "invoice", "verify");
  // Manager approve tier -> ba_tracker:approve | invoice:approve_tier1
  const isManager = authorized(user, "ba_tracker", "approve") || authorized(user, "invoice", "approve_tier1");
  // Director / executive approve tier -> invoice:approve_tier2
  const isDirector = authorized(user, "invoice", "approve_tier2");
  const [invoiceRows, setInvoiceRows] = useState<any[]>([]);
  const [paymentRows, setPaymentRows] = useState<any[]>([]);
  const [customerRows, setCustomerRows] = useState<any[]>([]);
  const [pendingVolumeLedgers, setPendingVolumeLedgers] = useState<any[]>([]);
  const [showPendingVolumeDrawer, setShowPendingVolumeDrawer] = useState<boolean>(false);
  const [baFilter, setBaFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("Jul-26");
  const [invStatusFilter, setInvStatusFilter] = useState("All");
  const [invCardTab, setInvCardTab] = useState<"AR_ANDALAN" | "PENALTY_UNCUT" | "SUBJECT_TO_INVOICE">("AR_ANDALAN");
  const [invPeriodFilter, setInvPeriodFilter] = useState("Jul-26");

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

  const defaultPOSBAOperatingItems = useMemo(() => templateRows("ba_operating_POS"), [financeTemplates]);
  const defaultPOSBAMDOItems = useMemo(() => templateRows("ba_mdo_POS"), [financeTemplates]);
  const defaultBGGBAItems = useMemo(() => templateRows("ba_items_BGG"), [financeTemplates]);

  const [baOperatingItems, setBaOperatingItems] = useState<any[]>(defaultPOSBAOperatingItems);
  const [baMDOItems, setBaMDOItems] = useState<any[]>(defaultPOSBAMDOItems);
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
    onNotice("âš¡ Sampel data POS Mining (Juni 2026) berhasil dimuat!");
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
    onNotice("âš¡ Sampel data BGG Mining (Juni 2026 - Gambar 2) berhasil dimuat!");
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
    onNotice("âš¡ Sampel data DBK Petrosea Mining (Gambar 3) berhasil dimuat!");
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
    onNotice("âš¡ Sampel data SBS Mining (Gambar 4) berhasil dimuat!");
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

  // Snapshot state untuk exporter PDF/Excel (logika ada di exporters.tsx)
  const exportCtx = {
    baRows, calculateItemRateAndAmount, customerContractMap, formData, getCustomerCalculations, getItemEffectiveOverhaulMtr,
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

      onNotice("âœ… Pembayaran cicilan berhasil dicatat (Menunggu Verifikasi 1-Level).");
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

      onNotice("ðŸŽ‰ Pembayaran cicilan berhasil diverifikasi!");

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
      return demoBGGItems.map(i => ({ ...i }));
    } else if (code === "DBK") {
      return demoDBKItems.map(i => ({ ...i }));
    } else if (code === "SBS") {
      return demoSBSItems.map(i => ({ ...i }));
    }

    return blankPOSItems.map(i => ({ ...i }));
  };

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

      onNotice(`ðŸŽ‰ No. BA ${selectedBa.baNumber} dipilih! Volume survei klaim [${cat}] & seluruh field penagihan berhasil diisi otomatis.`);
    }
  };

  const createInvoiceFromBA = (ba: any, category: "Operation & Mining" | "MDO" = "Operation & Mining") => {
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
    onNotice(`ðŸš€ Menyiapkan Form Invoice Baru [${category}] dari No. BA ${ba.baNumber} (${code}) â€” Data terisi otomatis!`);
  };

  const openBAModal = (item: any, isEditMode: boolean = false) => {
    setEditItem(item);
    setIsInlineEditingBA(isEditMode);
    const bggData = item.bggData;
    const bggTotalTerbongkar = bggData?.agreedSurveyVolume || bggData?.volumeBGG || 247557.933;
    const bggCoalVolumeBCM = bggData?.coalVolumeBCM || 0;
    const bggCoalVolumeTon = bggData?.coalVolumeTon || 0;
    const bggOBDistanceHm = bggData?.obOverDistanceHm || 0;
    const bggNettOB = bggData?.nettOBVolume || Math.max(0, bggTotalTerbongkar - bggCoalVolumeBCM);

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
    const isBGG = item.customerCode === "BGG" || item.customerCode === "PT BGG";
    if (item.items && item.items.length > 0) {
      const ops = item.items.filter((i: any) => i.category === "Operating & Mining" || i.category === "Over Distance" || i.category === "Penambangan BGG" || i.category === "Mining");
      const mdo = item.items.filter((i: any) => i.category === "MDO");
      setBaOperatingItems(ops.length > 0 ? ops : (isBGG ? defaultBGGBAItems : defaultPOSBAOperatingItems));
      setBaMDOItems(mdo.length > 0 ? mdo : (isBGG ? [] : defaultPOSBAMDOItems));
    } else {
      setBaOperatingItems(isBGG ? defaultBGGBAItems : defaultPOSBAOperatingItems);
      setBaMDOItems(isBGG ? [] : defaultPOSBAMDOItems);
    }
    setActiveBAStep(1);
    setDetailViewItem(null);
    setModalType("ba");
  };

  const openCreateModal = (type: "ba" | "invoice" | "payment" | "customer" | "pending_volume", initialData: any = {}) => {
    setEditItem(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (type === "ba") {
      const cust = initialData.customerCode || "POS";
      const isBGG = cust === "BGG" || cust === "PT BGG";
      setIsInlineEditingBA(true);
      setFormData({
        statusBA: "Submit",
        baSubmittedDate: todayStr,
        workPeriod: "Juni 2026",
        customerCode: cust,
        picAAP: "Operations / Site Engineer",
        step1Locked: false,
        draftBARefNo: "",
        signedBANumber: "",
        bggTotalTerbongkar: initialData.bggTotalTerbongkar ?? "",
        bggCoalVolumeBCM: initialData.bggCoalVolumeBCM ?? "",
        bggCoalVolumeTon: initialData.bggCoalVolumeTon ?? "",
        bggOBDistanceHm: initialData.bggOBDistanceHm ?? 0,
        bggNettOB: 0,
        ...initialData,
      });
      setBaOperatingItems(isBGG ? defaultBGGBAItems : defaultPOSBAOperatingItems);
      setBaMDOItems(isBGG ? [] : defaultPOSBAMDOItems);
      setActiveBAStep(1);
    } else if (type === "pending_volume") {
      setFormData({
        customerCode: "POS",
        workPeriod: "Juni 2026",
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
    } else {
      setFormData({
        activityGroup: "OPERATION & MINING",
        ...initialData,
      });
    }
    if (type === "invoice" && !initialData?.invoiceNo) {
      const cust = initialData?.customerCode || "POS";
      if (cust === "BGG") setInvLineItems(blankBGGItems);
      else if (cust === "DBK") setInvLineItems(blankDBKItems);
      else if (cust === "SBS") setInvLineItems(blankSBSItems);
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
    setModalType(type);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onNotice(`â³ Mengunggah berkas PDF "${file.name}" ke server...`);
      try {
        const res = await uploadDocumentFile(file, "Berita Acara", fieldName === "draftBAPath" ? "Draft BA" : "Final Signed BA");
        const permanentUrl = res.url || `/uploads/${res.storedName}`;
        setFormData((prev: any) => ({
          ...prev,
          [fieldName]: permanentUrl,
          [`${fieldName}Name`]: file.name
        }));
        onNotice(`âœ… Berkas PDF "${file.name}" berhasil disimpan permanen di server!`);
      } catch (err: any) {
        onNotice(`âŒ Gagal mengunggah PDF: ${err?.message || "Kesalahan server"}`);
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
        if (formData.customerCode === "BGG" || formData.customerCode === "PT BGG") {
          const totTerbongkar = Number(formData.bggTotalTerbongkar ?? 247557.933);
          const coalBCM = Number(formData.bggCoalVolumeBCM ?? 37346.784);
          const nettOB = Math.max(0, totTerbongkar - coalBCM);
          const coalTon = Number(formData.bggCoalVolumeTon ?? 46683.48);
          const odHm = Number(formData.bggOBDistanceHm ?? 2.38526);
          const ob1 = nettOB * 0.75;
          const ob2 = nettOB * 0.25;
          const subOB1 = Math.round(ob1 * 29500);
          const subOB2 = Math.round(ob2 * 28750);
          const subCoal = Math.round(coalTon * 17500);
          const subODOB = Math.round(nettOB * odHm * 155);
          const subODCoal = Math.round(coalTon * 19700);
          const bggGross = subOB1 + subOB2 + subCoal + subODOB + subODCoal;

          payload = {
            ...formData,
            customerCode: "BGG",
            workPeriod: formData.workPeriod || "Juni 2026",
            picAAP: formData.picAAP || "Dhini Andini (Finance Site)",
            initialWorkAmount: bggGross,
            adjustedWorkAmount: bggGross,
            workAmount: bggGross,
            step1Locked: true,
            bggData: {
              locationPit: "Pit Kungkilan",
              volumeBGG: totTerbongkar,
              volumeAAP: totTerbongkar,
              agreedSurveyVolume: totTerbongkar,
              coalVolumeBCM: coalBCM,
              coalVolumeTon: coalTon,
              nettOBVolume: nettOB,
              strippingRatio: coalTon > 0 ? nettOB / coalTon : 0,
              obOverDistanceHm: odHm,
              coalOverDistanceM: 581.77,
              ...(formData.bggData || {}),
            }
          };
        } else {
          const allItems = [...baOperatingItems, ...baMDOItems];
          const initSum = allItems.reduce((acc, item) => acc + (Number(item.initialVolume || 0) * Number(item.rate || 0)), 0);
          const adjSum = allItems.reduce((acc, item) => acc + (Number(item.adjustedVolume || item.initialVolume || 0) * Number(item.rate || 0)), 0);
          
          payload = {
            ...formData,
            customerCode: formData.customerCode || "POS",
            workPeriod: formData.workPeriod || "Juni 2026",
            picAAP: formData.picAAP || "Operations / Site Engineer",
            items: allItems,
            initialWorkAmount: initSum,
            adjustedWorkAmount: adjSum > 0 ? adjSum : initSum,
            workAmount: adjSum > 0 ? adjSum : (formData.workAmount || initSum),
            step1Locked: true,
          };
        }
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
          notesBottleneck: "âš ï¸ Pending: Joint Survey Tambahan",
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

      if (payload.workEndDate) payload.workEndDate = new Date(payload.workEndDate).toISOString();
      if (payload.baSubmittedDate) payload.baSubmittedDate = new Date(payload.baSubmittedDate).toISOString();
      if (payload.baSentDate) payload.baSentDate = new Date(payload.baSentDate).toISOString();
      if (payload.internalRoutingDate) payload.internalRoutingDate = new Date(payload.internalRoutingDate).toISOString();
      if (payload.baSignedDate) payload.baSignedDate = new Date(payload.baSignedDate).toISOString();
      if (payload.invoiceIssuedDate) payload.invoiceIssuedDate = new Date(payload.invoiceIssuedDate).toISOString();
      if (payload.baDate) payload.baDate = new Date(payload.baDate).toISOString();
      if (payload.invoiceDate) payload.invoiceDate = new Date(payload.invoiceDate).toISOString();
      if (payload.paymentDate) payload.paymentDate = new Date(payload.paymentDate).toISOString();

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
      onNotice("âœ… Berita Acara berhasil diverifikasi oleh SPV Site!");
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
      onNotice("ðŸŽ‰ Berita Acara disetujui (Approved by Manager)!");
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
      onNotice(isSubmit ? "ðŸ“¤ Berita Acara BGG berhasil diajukan ke HO untuk verifikasi!" : "ðŸ’¾ Draft Berita Acara BGG berhasil disimpan!");
      await loadData();
    } catch (err: any) {
      onNotice(`âŒ Gagal menyimpan BA: ${err?.message || err}`);
    }
  };

  const handleGenerateInvoiceFromBA = async (baId: number) => {
    try {
      const newInv: any = await generateInvoiceFromBA(baId);
      onNotice(`âš¡ Berhasil membuat Draft Mining Invoice No. ${newInv?.invoiceNo || "091/BGG-AAP/VI/2026"} dari Berita Acara!`);
      await loadData();
    } catch (err: any) {
      onNotice(`âŒ Gagal membuat invoice: ${err?.message || err}`);
    }
  };

  const handleVerifyInvoice = async (id: number) => {
    try {
      const updated = await verifyInvoice(id, "verify", "Verifikasi rincian Invoice oleh SPV Site");
      onNotice("âœ… Invoice berhasil diverifikasi oleh SPV! Menunggu Approval Tier 1 (Manager).");
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
      onNotice("ðŸŽ‰ Approval Tier 1 (Manager) Berhasil! Menunggu Approval Tier 2 (Direktur).");
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
      onNotice("ðŸš€ Approval Tier 2 (Direktur) Berhasil! Status Invoice: Issued.");
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
