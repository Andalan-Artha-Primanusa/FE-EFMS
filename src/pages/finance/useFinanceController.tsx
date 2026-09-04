import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoice, approveInvoiceTier1, approveInvoiceTier2, getFinanceTemplates, getSBSPenalties, saveSBSPenalty, deleteSBSPenalty, SBSPenaltyItem, User as UserType, generateJournalFromInvoice, generateJournalFromPayment } from "../../lib/api";
import { authorized } from "../../lib/auth";

import {
  resolveDocumentUrl, formatIDR, parseNumber, formatThousand, formatDateInput,
  indonesianMonths, formatMonthLabel, formatMonthInput, getRomanMonth,
  generateBANumberPreview, generateInvoiceNumberPreview, getYearFromPeriod,
  generateInvoiceNumber, getBAInvoiceStatus, renderBAStatusBadge,
  getBAStatusForExport, renderInvoiceStatusBadge, parsePeriodToMonthIndex,
  RupiahInput, generateAuditTimeline
} from "./helpers";
import { calcRFIndex, createFinanceCalculations, getSBSTarifByDistance, SBS_DISTANCE_TIERS } from "./calculations";
import {
  exportPaymentDetailPDFImpl, exportBADocumentPDFImpl, exportARBAIMonitoringExcelImpl, exportARBAIMonitoringPDFImpl,
  exportBAOnlyExcelImpl, exportBAOnlyPDFImpl, exportAROnlyExcelImpl, exportAROnlyPDFImpl,
  exportCoretaxEFakturCSVImpl, exportEBupotPPh23CSVImpl
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
  const [sbsPenalties, setSbsPenalties] = useState<SBSPenaltyItem[]>([]);
  const [sbsPenaltyModalOpen, setSbsPenaltyModalOpen] = useState<boolean>(false);
  const [sbsPenaltyEditItem, setSbsPenaltyEditItem] = useState<SBSPenaltyItem | null>(null);
  const [rawShowPendingVolumeDrawer, setRawShowPendingVolumeDrawer] = useState<boolean>(false);
  const [baFilter, setBaFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [invStatusFilter, setInvStatusFilter] = useState("All");
  const [invCardTab, setInvCardTab] = useState<"AR_ANDALAN" | "PENALTY_UNCUT" | "SUBJECT_TO_INVOICE">("AR_ANDALAN");
  const [invPeriodFilter, setInvPeriodFilter] = useState("All");

  // Modal Input & Edit State
  const [modalType, setRawModalType] = useState<"none" | "ba" | "invoice" | "payment" | "customer" | "pending_volume">("none");
  const [editItem, setEditItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({ customerCode: "POS", workPeriod: "Juni 2026" });
  const [showActivityGroupDropdown, setShowActivityGroupDropdown] = useState(false);
  const [showExportBADropdown, setShowExportBADropdown] = useState(false);
  const [showInputBADropdown, setShowInputBADropdown] = useState(false);
  const [showExportARDropdown, setShowExportARDropdown] = useState(false);
  const [showInputARDropdown, setShowInputARDropdown] = useState(false);
  const [baRowActionDropdownId, setBaRowActionDropdownId] = useState<number | null>(null);

  // Modal Detail View 2 Kolom State
  const [detailViewItem, setRawDetailViewItem] = useState<{ type: "ba" | "invoice" | "payment" | "customer"; data: any } | null>(null);
  const [isInlineEditingBA, setIsInlineEditingBA] = useState<boolean>(true);

  // Ponytail Single-Modal Invariant: Guarantee strict mutual exclusivity across all modals (FormModals, DetailModal, Drawers)
  const setDetailViewItem = useCallback((item: { type: "ba" | "invoice" | "payment" | "customer"; data: any } | null | ((prev: any) => any)) => {
    if (typeof item === "function") {
      setRawDetailViewItem((prev: any) => {
        const next = item(prev);
        if (next) {
          setRawModalType("none");
          setRawShowPendingVolumeDrawer(false);
        }
        return next;
      });
    } else {
      if (item) {
        setRawModalType("none");
        setRawShowPendingVolumeDrawer(false);
      }
      setRawDetailViewItem(item);
    }
  }, []);

  const setModalType = useCallback((type: "none" | "ba" | "invoice" | "payment" | "customer" | "pending_volume" | ((prev: any) => any)) => {
    if (typeof type === "function") {
      setRawModalType((prev: any) => {
        const next = type(prev);
        if (next && next !== "none") {
          setRawDetailViewItem(null);
          setRawShowPendingVolumeDrawer(false);
        }
        return next;
      });
    } else {
      if (type && type !== "none") {
        setRawDetailViewItem(null);
        setRawShowPendingVolumeDrawer(false);
      }
      setRawModalType(type);
    }
  }, []);

  const showPendingVolumeDrawer = rawShowPendingVolumeDrawer;
  const setShowPendingVolumeDrawer = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === "function") {
      setRawShowPendingVolumeDrawer((prev) => {
        const next = val(prev);
        if (next) {
          setRawModalType("none");
          setRawDetailViewItem(null);
        }
        return next;
      });
    } else {
      if (val) {
        setRawModalType("none");
        setRawDetailViewItem(null);
      }
      setRawShowPendingVolumeDrawer(val);
    }
  }, []);

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
  const [raiseFallMasters, setRaiseFallMasters] = useState<any[]>([]);
  const [raiseFallMaster, setRaiseFallMaster] = useState<any>(null);

  const [dynamicSowOptions, setDynamicSowOptions] = useState<any[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<any[]>([]);
  const [latestKursBI, setLatestKursBI] = useState(17923.30);
  const [coalIndexMaster, setCoalIndexMaster] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/api/master-data/raise-fall")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRaiseFallMasters(data);
        }
      })
      .catch(() => {});

    api<any[]>("/api/master-data/coal-index")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCoalIndexMaster(data);
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
      .then((data) => {
        if (Array.isArray(data)) setBankAccountOptions(data);
      })
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
      const custUpper = (formData.customerCode || "POS").toUpperCase();
      const matched = raiseFallMasters.find((r) => r.customerCode?.toUpperCase() === custUpper) || raiseFallMasters[0];
      setRaiseFallMaster(matched);
      if (matched.actualMRateXn > 0) setMRate(matched.actualMRateXn);
      if (matched.actualFuelFn > 0) setFuelPriceUSD(matched.actualFuelFn);
      if (matched.actualLaborLn > 0) setLaborPriceIDR(matched.actualLaborLn);
    }
  }, [formData.customerCode, raiseFallMasters]);

  // Helper untuk mendapatkan status Tier Coal Index aktif untuk BGG
  const getBGGActiveCoalTier = (periodStr?: string): "Tier 1" | "Tier 2" | "Tier 3" => {
    if (!Array.isArray(coalIndexMaster) || coalIndexMaster.length === 0) return "Tier 3";
    if (periodStr) {
      const match = coalIndexMaster.find(c => (c.period || "").toLowerCase().includes(periodStr.toLowerCase()) || periodStr.toLowerCase().includes((c.period || "").toLowerCase()));
      if (match) return (match.activeTier as any) || (match.avgR3 > 75 ? "Tier 3" : match.avgR3 >= 50 ? "Tier 2" : "Tier 1");
    }
    const latest = coalIndexMaster[0];
    return (latest.activeTier as any) || (latest.avgR3 > 75 ? "Tier 3" : latest.avgR3 >= 50 ? "Tier 2" : "Tier 1");
  };

  // Helper untuk mengambil unit rate dari Master Data Variable SOW per customer
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
  const rfIndexCalculated = calcRFIndex(fuelPriceUSD, laborPriceIDR, mRate, raiseFallMaster);

  // Master Data Variable SOW Options (Dynamic from API with fallback)
  const defaultMasterVariableOptions = templateRows("variable_sow_defaults");

  const masterVariableOptions = dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;

  // Dynamic Master SOW Catalog derived live from master data API (dynamicSowOptions) & latestKursBI/MRate
  const activeSOWCatalog = useMemo(() => {
    const currentKurs = latestKursBI || mRate || 17923.30;
    if (dynamicSowOptions && dynamicSowOptions.length > 0) {
      const custUpper = (formData.customerCode || "").toUpperCase();
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
          if (isOverhaul && s.rateUSD) {
            rateIDR = Math.round(s.rateUSD * currentKurs);
          }

          let cleanUnit = (s.unit || "BCM").replace(/^USD\//i, "").replace(/^IDR\//i, "").trim();
          if (cleanUnit.toUpperCase() === "1KM") cleanUnit = "USD/1KM";

          return {
            name: s.itemName || s.name,
            category: category,
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
  }, [dynamicSowOptions, formData.customerCode, latestKursBI, mRate, templateRows]);

  // ============ TEMPLATES PER CUSTOMER (dari backend finance_templates) ============
  const FALLBACK_BLANK_PTRO_ITEMS = [
    { id: "ptro_inv_a1", section: "A", description: "OVER BURDEN REMOVAL", unit: "Bcm", volume: 0, unitRateUSD: 1.490, kursBI: 17923.30 },
    { id: "ptro_inv_b1", section: "B", description: "COAL GETTING", unit: "Ton", volume: 0, unitRateUSD: 0.840, kursBI: 17923.30 },
    { id: "ptro_inv_c1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Overhaul OB", unit: "Bcm", volume: 0, overhaulMtr: 1000, baseMtr: 1000, unitRateUSD: 0.028, kursBI: 17923.30 },
    { id: "ptro_inv_c2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Overhaul Coal Getting", unit: "Ton", volume: 0, overhaulMtr: 3000, baseMtr: 3000, unitRateIDR: 230 },
  ];
  const FALLBACK_BLANK_DBK_ITEMS = FALLBACK_BLANK_PTRO_ITEMS;

  const FALLBACK_BLANK_BGG_ITEMS = [
    { id: "bgg_inv_a1", section: "A", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", unit: "Bcm", volume: 0, unitRateIDR: 29500 },
    { id: "bgg_inv_a2", section: "A", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", unit: "Bcm", volume: 0, unitRateIDR: 28750 },
    { id: "bgg_inv_b1", section: "B", description: "Coal Winning Pit Kungkilan", period: "Jun-26", unit: "Ton", volume: 0, unitRateIDR: 17500 },
    { id: "bgg_inv_c1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Over Distance For OB Removal", unit: "Bcm", volume: 0, overhaulMtr: 1000, unitRateIDR: 155.00 },
    { id: "bgg_inv_c2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Over Distance For Coal Winning", unit: "Ton", volume: 0, overhaulMtr: 4000, unitRateIDR: 19700 },
    { id: "bgg_inv_d1", section: "D", description: "Raise & Fall Factor (BBM)", unit: "Bcm", volume: 0, unitRateIDR: 0 },
    { id: "bgg_inv_e1", section: "E", description: "Discount on Overdistance (Deduction 25%)", amount: 0 },
    { id: "bgg_inv_f1", section: "F", description: "DP Fuel & Transport (Deduction)", amount: 0 },
  ];

  const FALLBACK_BLANK_SBS_ITEMS = [
    { id: "sbs_inv_a1", section: "A", description: "PIT E - DISPOSAL SEKATAN", unit: "BCM", volume: 0, distanceM: 3100, overhaulMtr: 3100, unitRateIDR: 22654 },
    { id: "sbs_inv_a2", section: "A", description: "PIT E - RENCANA JALAN", unit: "BCM", volume: 0, distanceM: 1350, overhaulMtr: 1350, unitRateIDR: 12638 },
    { id: "sbs_inv_a3", section: "A", description: "PIT E - RENCANA CSA", unit: "BCM", volume: 0, distanceM: 600, overhaulMtr: 600, unitRateIDR: 8346 },
    { id: "sbs_inv_a4", section: "A", description: "PIT E - JALAN BARITO", unit: "BCM", volume: 0, distanceM: 1850, overhaulMtr: 1850, unitRateIDR: 15500 },
    { id: "sbs_inv_a5", section: "A", description: "PIT E - SEKATAN", unit: "BCM", volume: 0, distanceM: 2150, overhaulMtr: 2150, unitRateIDR: 16931 },
    { id: "sbs_inv_a6", section: "A", description: "PIT E - TS MAHONI", unit: "BCM", volume: 0, distanceM: 3100, overhaulMtr: 3100, unitRateIDR: 22654 },
    { id: "sbs_inv_a7", section: "A", description: "PIT E - IPD WARWEFILL", unit: "BCM", volume: 0, distanceM: 600, overhaulMtr: 600, unitRateIDR: 8346 },
    { id: "sbs_inv_a8", section: "A", description: "PIT E - SEKATAN", unit: "BCM", volume: 0, distanceM: 2450, overhaulMtr: 2450, unitRateIDR: 19375 },
    { id: "sbs_inv_b1", section: "B", description: "Dozer CAT D10 - BDCT 1001", unit: "Hours", volume: 0, unitRateIDR: 1980000 },
    { id: "sbs_inv_b2", section: "B", description: "Dozer CAT D10 - BDCT 1002", unit: "Hours", volume: 0, unitRateIDR: 1980000 },
    { id: "sbs_inv_b3", section: "B", description: "Excavator CAT 395 - EXCT 3901", unit: "Hours", volume: 0, unitRateIDR: 1425000 },
    { id: "sbs_inv_b4", section: "B", description: "Excavator CAT 395 - EXCT 3902", unit: "Hours", volume: 0, unitRateIDR: 1425000 },
    { id: "sbs_inv_p1", section: "P", description: "1. Denda Ketidaktercapaian MA", unit: "Lot", volume: 1, unitRateIDR: 0, amount: 0, isDeduction: true },
    { id: "sbs_inv_p2", section: "P", description: "2. Kelebihan Pemakaian BBM Loader (Fuel Ratio)", unit: "Lot", volume: 1, unitRateIDR: 0, amount: 0, isDeduction: true },
    { id: "sbs_inv_p3", section: "P", description: "3. Kelebihan Pemakaian BBM Hauler (Fuel Consumption)", unit: "Lot", volume: 1, unitRateIDR: 0, amount: 0, isDeduction: true },
    { id: "sbs_inv_p4", section: "P", description: "4. Denda Ketidakcapaian Volume", unit: "Lot", volume: 1, unitRateIDR: 0, amount: 0, isDeduction: true },
  ];

  const FALLBACK_BLANK_POS_ITEMS = [
    { id: "pos_inv_a1", section: "A", description: "Topsoil Removal - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 3.380, volume: 0 },
    { id: "pos_inv_a2", section: "A", description: "Overburden/Waste - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 3.327, volume: 0 },
    { id: "pos_inv_a3", section: "A", description: "Limonite - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 3.363, volume: 0 },
    { id: "pos_inv_a4", section: "A", description: "Saprolite - Base Rate (1000m)", unit: "USD/BCM", baseRateUSD: 3.472, volume: 0 },
    { id: "pos_inv_a5", section: "A", description: "Clear & Grub", unit: "USD/m2", baseRateUSD: 0.381, volume: 0 },
    { id: "pos_inv_b1", section: "B", description: "Over/Underhaul For OB Removal", unit: "USD/1KM", baseRateUSD: 0.538, volume: 0, overhaulMtr: 1000 },
    { id: "pos_inv_b2", section: "B", description: "Over/Underhaul For Top Soil Removal", unit: "USD/1KM", baseRateUSD: 0.538, volume: 0, overhaulMtr: 1000 },
    { id: "pos_inv_b3", section: "B", description: "Over/Underhaul For Limonite", unit: "USD/1KM", baseRateUSD: 0.526, volume: 0, overhaulMtr: 1000 },
    { id: "pos_inv_b4", section: "B", description: "Over/Underhaul For Saprolite", unit: "USD/1KM", baseRateUSD: 0.526, volume: 0, overhaulMtr: 1000 },
  ];

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
        if (mat.includes("OVER BURDEN")) {
          const usd = r.rateUSD || obRateUSD;
          rate = Math.round(usd * currentKurs);
        } else if (mat.includes("COAL GETTING") || mat.includes("COAL WINNING")) {
          const usd = r.rateUSD || cgRateUSD;
          rate = Math.round(usd * currentKurs);
        } else if (mat.includes("OVERHAUL OB") || mat.includes("OVER DISTANCE FOR OB")) {
          const usd = r.rateUSD || odObRateUSD;
          rate = Math.round(usd * currentKurs);
        } else if (mat.includes("OVERHAUL COAL") || mat.includes("OVER DISTANCE FOR COAL")) {
          rate = r.rate || odCgRateIDR;
        }
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

  const FALLBACK_SBS_BA_ITEMS = [
    { id: "sbs_ba_a1", category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL SEKATAN", unit: "BCM", distance: 3150, initialVolume: 80114.79, adjustedVolume: 80114.79, rate: 22654, subtotalInitial: 1814920453, subtotalAdjusted: 1814920453 },
    { id: "sbs_ba_a2", category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA JALAN", unit: "BCM", distance: 1400, initialVolume: 23741.16, adjustedVolume: 23741.16, rate: 12638, subtotalInitial: 300040780, subtotalAdjusted: 300040780 },
    { id: "sbs_ba_a3", category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA CSA", unit: "BCM", distance: 650, initialVolume: 442.24, adjustedVolume: 442.24, rate: 8346, subtotalInitial: 3690935, subtotalAdjusted: 3690935 },
    { id: "sbs_ba_a4", category: "Operating & Mining", area: "Pit E", material: "PIT E - JALAN BARITO", unit: "BCM", distance: 1850, initialVolume: 33726.42, adjustedVolume: 33726.42, rate: 15500, subtotalInitial: 522759510, subtotalAdjusted: 522759510 },
    { id: "sbs_ba_a5", category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", unit: "BCM", distance: 2150, initialVolume: 110582.62, adjustedVolume: 110582.62, rate: 16931, subtotalInitial: 1872274339, subtotalAdjusted: 1872274339 },
    { id: "sbs_ba_a6", category: "Operating & Mining", area: "Pit E", material: "PIT E - TS MAHONI", unit: "BCM", distance: 3100, initialVolume: 1536.19, adjustedVolume: 1536.19, rate: 22654, subtotalInitial: 34800848, subtotalAdjusted: 34800848 },
    { id: "sbs_ba_a7", category: "Operating & Mining", area: "Pit E", material: "PIT E - IPD WARWEFILL", unit: "BCM", distance: 700, initialVolume: 3840.48, adjustedVolume: 3840.48, rate: 8346, subtotalInitial: 32052646, subtotalAdjusted: 32052646 },
    { id: "sbs_ba_a8", category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", unit: "BCM", distance: 2650, initialVolume: 1154.75, adjustedVolume: 1154.75, rate: 19375, subtotalInitial: 22373281, subtotalAdjusted: 22373281 }
  ];

  const FALLBACK_SBS_RENTAL_ITEMS = [
    { id: "sbs_rent_1", category: "Penunjang", area: "Pit E", material: "Bulldozer DZ709", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1980000, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "sbs_rent_2", category: "Penunjang", area: "Pit E", material: "Bulldozer DZ716", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1980000, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "sbs_rent_3", category: "Penunjang", area: "Pit E", material: "Excavator EX815", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1425000, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "sbs_rent_4", category: "Penunjang", area: "Pit E", material: "Excavator EX816", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1425000, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "sbs_rent_5", category: "Penunjang", area: "Pit E", material: "Excavator EX817", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1425000, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "sbs_rent_6", category: "Penunjang", area: "Pit E", material: "Motor Grader MG607", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1250000, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "sbs_rent_7", category: "Penunjang", area: "Pit E", material: "Motor Grader MG608", unit: "Hours", initialVolume: 0, adjustedVolume: 0, rate: 1250000, subtotalInitial: 0, subtotalAdjusted: 0 }
  ];

  const FALLBACK_SBS_DEDUCTION_ITEMS = [
    { id: "sbs_ded_1", category: "Pengurang Biaya", area: "Pit E", material: "Denda ketidaktercapaian MA", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "sbs_ded_2", category: "Pengurang Biaya", area: "Pit E", material: "Kelebihan Pemakaian BBM Loader", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "sbs_ded_3", category: "Pengurang Biaya", area: "Pit E", material: "Kelebihan Pemakaian BBM Hauler", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "sbs_ded_4", category: "Pengurang Biaya", area: "Pit E", material: "Denda ketidakcapaian Volume", unit: "Lot", initialVolume: 1, adjustedVolume: 1, rate: 0, isDeduction: true, subtotalInitial: 0, subtotalAdjusted: 0 }
  ];

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

  const [baOperatingItems, setBaOperatingItems] = useState<any[]>(FALLBACK_POS_OPERATING_ITEMS);
  const [baMDOItems, setBaMDOItems] = useState<any[]>(FALLBACK_POS_MDO_ITEMS);
  const [baDeductionItems, setBaDeductionItems] = useState<any[]>([]);
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

  const handleCompanySelect = (code: string) => {
    const mapMatch = customerContractMap[code];
    const cust = customerRows.find((c: any) => c.code === code);

    // Auto-switch template item list based on customer
    if (code === "BGG") setInvLineItems(blankBGGItems.map(i => ({ ...i })));
    else if (code === "PTRO" || code === "DBK") setInvLineItems(blankPTROItems.map(i => ({ ...i })));
    else if (code === "SBS") setInvLineItems(blankSBSItems.map(i => ({ ...i })));
    else setInvLineItems(blankPOSItems.map(i => ({ ...i })));

    setFormData((prev: any) => {
      const period = prev.workPeriod || "Juni 2026";
      const autoInvNo = generateInvoiceNumber(code, period, invoiceRows.length);
      const defaultSites: Record<string, string> = {
        BGG: "PT Budi Gema Gempita Site",
        POS: "POS PROJECT",
        IBP: "PT Indo Bhumi Pasifik Site",
        BBA: "PT Bara Batubara Aditama Site",
        SBS: "SBS - Tanjung Enim",
        PTRO: "PT Petrosea Site",
      };
      const defaultContracts: Record<string, string> = {
        BGG: "09/BGG-AAP/VIII/2018",
        POS: "002/POS-AAP/2025",
        IBP: "001/IBP-AAP/2026",
        BBA: "001/BBA-AAP/2026",
        SBS: "230/AAP-SBS/EXT/XII/24",
        PTRO: "001/PTRO-AAP/2024",
      };
      return {
        ...prev,
        customerCode: code,
        projectSite: mapMatch?.project || defaultSites[code] || cust?.projectSite || (cust ? `${cust.fullName} Site` : `${code} Site`),
        contractNo: mapMatch?.contract || defaultContracts[code] || cust?.contractNo || (cust ? `001/${cust.code}-AAP/2026` : ""),
        noPO: mapMatch?.noPO || prev.noPO || (code === "SBS" ? "SPPH-05852" : `PO-${code}-2026-001`),
        bankName: mapMatch?.bankName || prev.bankName || (code === "BGG" ? "Bank Mandiri" : (code === "PTRO" || code === "SBS") ? "Bank BRI" : "Bank BNI"),
        bankAccountNo: mapMatch?.bankAccountNo || prev.bankAccountNo || (code === "BGG" ? "070-00-2888000-8" : (code === "PTRO" || code === "SBS") ? "0417-01-880088-30-8" : "8188788882"),
        bankBranch: mapMatch?.bankBranch || prev.bankBranch || (code === "BGG" ? "Plaza Mandiri Jakarta" : (code === "PTRO" || code === "SBS") ? "S. Parman - Slipi Jakarta" : "Harmoni, Jakarta"),
        directorName: mapMatch?.directorName || "GAHARI CHRISTINE",
        directorTitle: mapMatch?.directorTitle || (code === "SBS" ? "DIREKTUR UTAMA" : "DIRECTOR"),
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

  const loadDemoPTROData = () => {
    setFormData({
      customerCode: "PTRO",
      invoiceNo: "013/AAP-PTRO/VI/2026",
      workPeriod: "01 - 30 JUNI 2026",
      projectSite: "PT Petrosea Site",
      contractNo: "001/PTRO-AAP/2024",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    });
    if (demoPTROItems.length > 0) {
      setInvLineItems(demoPTROItems);
    } else {
      const kurs = latestKursBI;
      const obRate   = getSowMasterRate("PTRO", "OVER BURDEN REMOVAL",   1.49,  true);
      const cgRate   = getSowMasterRate("PTRO", "COAL GETTING",           0.84,  true);
      const odObRate = getSowMasterRate("PTRO", "Overhaul OB",            0.028, true);
      const odCgRate = getSowMasterRate("PTRO", "Overhaul Coal Getting",  230,   false);
      setInvLineItems([
        { id: "ptro_inv_a1", section: "A", description: "OVER BURDEN REMOVAL", unit: "Bcm", volume: 259165.259, unitRateUSD: obRate,   kursBI: kurs },
        { id: "ptro_inv_b1", section: "B", description: "COAL GETTING",        unit: "Ton", volume: 19456.32,   unitRateUSD: cgRate,   kursBI: kurs },
        { id: "ptro_inv_c1", section: "C", subSection: "C1. Over Distance For OB Removal",   unit: "Bcm", volume: 259165.259, overhaulMtr: 1012.92, baseMtr: 1000, unitRateUSD: odObRate, kursBI: kurs },
        { id: "ptro_inv_c2", section: "C", subSection: "C2. Over Distance For Coal Winning", unit: "Ton", volume: 34025.212,   overhaulMtr: 3174.88, baseMtr: 3000, unitRateIDR: odCgRate },
      ]);
    }
    onNotice("Template preset Petrosea (PTRO Juni 2026) berhasil dimuat — rate & kurs dari master data.");
  };
  const loadDemoDBKData = loadDemoPTROData;

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
    const itemsWithDist = demoSBSItems.map((item: any) => {
      if (item.section === "A" && !item.distanceM) {
        if (item.unitRateIDR === 22654) return { ...item, distanceM: 3100, overhaulMtr: 3100 };
        if (item.unitRateIDR === 12638) return { ...item, distanceM: 1350, overhaulMtr: 1350 };
        if (item.unitRateIDR === 8346) return { ...item, distanceM: 600, overhaulMtr: 600 };
        if (item.unitRateIDR === 15500) return { ...item, distanceM: 1850, overhaulMtr: 1850 };
        if (item.unitRateIDR === 16931) return { ...item, distanceM: 2150, overhaulMtr: 2150 };
        if (item.unitRateIDR === 19375) return { ...item, distanceM: 2450, overhaulMtr: 2450 };
      }
      return item;
    });
    setInvLineItems(itemsWithDist);
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

  const addInvLineItem = (section: string = "A") => {
    const cust = (formData.customerCode || "POS").toUpperCase();
    const isUSD = cust === "POS" || cust === "PTRO" || cust === "DBK";
    const isSBS = cust === "SBS";
    const desc = isSBS
      ? (section === "B" ? "Alat Berat Tambahan (Jasa Penunjang)" : section === "P" ? "Pengurang Pembayaran Tambahan" : "Area Kerja OB Tambahan")
      : "Pekerjaan / Item Tambahan";
    const unit = isSBS
      ? (section === "B" ? "Hours" : section === "P" ? "Lot" : "BCM")
      : "Bcm";
    const newItem = {
      id: `custom_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      section: section,
      description: desc,
      unit: unit,
      volume: 0,
      unitRateUSD: isUSD ? 0 : undefined,
      unitRateIDR: isUSD ? undefined : 0,
      kursBI: latestKursBI || mRate || 17923.30,
      amount: 0,
      isCustom: true
    };
    setInvLineItems(prev => [...prev, newItem]);
  };

  const updateInvItemField = (id: string, field: string, val: any) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const reorderInvLineItems = (startIndex: number, endIndex: number) => {
    setInvLineItems(prev => {
      if (startIndex < 0 || startIndex >= prev.length || endIndex < 0 || endIndex >= prev.length) return prev;
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
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
      const [dashRes, baRes, invRes, payRes, custRes, pVolRes, sbsPenRes] = await Promise.all([
        (viewTitle === "Finance & AR Dashboard" || viewTitle === "Finance AR Dashboard" || viewTitle.includes("AR Dashboard"))
          ? api<any>("/api/finance/dashboard").catch(() => null)
          : Promise.resolve(null),
        api<any[]>("/api/finance/ba-trackers").catch(() => []),
        api<any[]>("/api/finance/invoices").catch(() => []),
        api<any[]>("/api/finance/payments").catch(() => []),
        api<any[]>("/api/finance/customers").catch(() => []),
        api<any[]>("/api/finance/pending-volumes").catch(() => []),
        getSBSPenalties().catch(() => [])
      ]);

      if (dashRes) setDashboardData(dashRes);
      if (Array.isArray(baRes)) setBaRows(baRes);
      if (Array.isArray(invRes)) setInvoiceRows(invRes);
      if (Array.isArray(payRes)) setPaymentRows(payRes);
      if (Array.isArray(custRes)) setCustomerRows(custRes);
      if (Array.isArray(pVolRes)) setPendingVolumeLedgers(pVolRes);
      if (Array.isArray(sbsPenRes)) setSbsPenalties(sbsPenRes);
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

      try {
        await generateJournalFromPayment(paymentId);
      } catch (e: any) {
        console.error("Gagal generate journal from payment", e);
      }

      onNotice("Pembayaran cicilan berhasil diverifikasi. Jurnal dibuat.");

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
    const code = custCode || ba?.customerCode || "";

    // If POS/IBP/BBA and Category is MDO (Mine Development Operation)
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

    // If POS/IBP/BBA Facility / Backcharge / Non-Mining (e.g. Mess Facility, Mobilization)
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

    // 1. If BA has explicit item array from Step 1 / Step 2
    if (ba?.items && Array.isArray(ba.items) && ba.items.length > 0) {
      if (code === "POS" || code === "IBP" || code === "BBA") {
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
    if (code === "POS" || code === "IBP" || code === "BBA") {
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
    } else if (code === "DBK" || code === "PTRO") {
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
      if (ba?.volume > 0 || ba?.rate > 0 || ba?.revenueGross > 0) {
        const gross = Number(ba.revenueGross || ba.workAmount || 0);
        const vol = Number(ba.volume || 165000);
        const rate = Number(ba.rate || (vol > 0 && gross > 0 ? Math.round(gross / vol) : 31500));
        return [
          {
            id: "ptro_inv_auto_1",
            section: "A",
            description: ba.jobType || "OVER BURDEN REMOVAL",
            unit: ba.volumeUnit || "Bcm",
            volume: vol,
            unitRateIDR: rate,
            amount: gross > 0 ? gross : Math.round(vol * rate),
            amountIDR: gross > 0 ? gross : Math.round(vol * rate),
            notes: ba.workPeriod || "-"
          }
        ];
      }
      return (demoPTROItems.length > 0 ? demoPTROItems : demoDBKItems).map(i => ({ ...i }));
    } else if (code === "ABN") {
      const sourceBA = (ba?.items && ba.items.length > 0) ? ba : baRows?.find((b: any) => b.baNumber === ba?.baNoReference || b.baNumber === ba?.baNumber || b.id === ba?.baID);
      const itemsToProcess = sourceBA?.items && Array.isArray(sourceBA.items) && sourceBA.items.length > 0 ? sourceBA.items : ba?.items;

      if (itemsToProcess && Array.isArray(itemsToProcess) && itemsToProcess.length > 0) {
        const invItems: any[] = [];
        itemsToProcess.forEach((bi: any, idx: number) => {
          const vol = Number(bi.adjustedVolume ?? bi.initialVolume ?? 0);
          const rate = Number(bi.rate || 1950000);
          invItems.push({
            id: bi.id || `abn_inv_${idx}`,
            section: "A",
            description: bi.material || `Sewa Alat Berat ABN ${idx + 1}`,
            sowDescription: bi.material || `Sewa Alat Berat ABN ${idx + 1}`,
            unit: bi.unit || "Hours",
            volume: vol,
            unitRateIDR: rate,
            amount: Math.round(vol * rate),
            amountIDR: Math.round(vol * rate),
            notes: bi.notes || ba.workPeriod || "-"
          });
        });
        return invItems;
      }
      if (ba?.volume > 0 || ba?.rate > 0 || ba?.revenueGross > 0) {
        const gross = Number(ba.revenueGross || ba.workAmount || 0);
        const vol = Number(ba.volume || 745.35);
        const rate = Number(ba.rate || (vol > 0 && gross > 0 ? Math.round(gross / vol) : 1950000));
        return [
          {
            id: "abn_inv_auto_1",
            section: "A",
            description: ba.jobType || "Sewa Alat Berat Bulldozer & Grader",
            unit: ba.volumeUnit || "Hours",
            volume: vol,
            unitRateIDR: rate,
            amount: gross > 0 ? gross : Math.round(vol * rate),
            amountIDR: gross > 0 ? gross : Math.round(vol * rate),
            notes: ba.workPeriod || "-"
          }
        ];
      }
      return [
        { id: "abn_inv_1", section: "A", description: "Bulldozer D85ESS Rental", unit: "Hours", volume: 420, unitRateIDR: 1950000, amount: 819000000, amountIDR: 819000000 },
        { id: "abn_inv_2", section: "A", description: "Motor Grader 160K", unit: "Hours", volume: 483.14, unitRateIDR: 1720000, amount: 831000000, amountIDR: 831000000 },
      ];
    } else if (code === "SBS") {
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

        // Sertakan 4 baris Section P pengurang pembayaran SBS jika belum ada
        if (!invItems.some(i => i.section === "P")) {
          const sbsDeductions = (blankSBSItems.length > 0 ? blankSBSItems : demoSBSItems).filter((it: any) => it.section === "P");
          sbsDeductions.forEach((d: any) => {
            invItems.push({ ...d });
          });
        }

        return invItems;
      }

      // If ba itself has volume & rate or revenueGross:
      if (ba?.volume > 0 || ba?.rate > 0 || ba?.revenueGross > 0 || ba?.workAmount > 0) {
        const gross = Number(ba.revenueGross || ba.workAmount || 0);
        const vol = Number(ba.volume || 1079);
        const rate = Number(ba.rate || (vol > 0 && gross > 0 ? Math.round(gross / vol) : 3392925));
        const isEquipment = (ba.volumeUnit || "").toLowerCase().includes("jam") || (ba.jobType || "").toLowerCase().includes("equipment");

        return [
          {
            id: "sbs_inv_auto_1",
            section: isEquipment ? "B" : "A",
            description: ba.jobType || (isEquipment ? "Jasa Penunjang Produksi (Rental Alat Berat)" : "OB REMOVAL (Per Area Kerja)"),
            unit: ba.volumeUnit || (isEquipment ? "Hours" : "BCM"),
            volume: vol,
            unitRateIDR: rate,
            amount: gross > 0 ? gross : Math.round(vol * rate),
            amountIDR: gross > 0 ? gross : Math.round(vol * rate),
            notes: ba.workPeriod || "-"
          },
          ...blankSBSItems.filter((it: any) => it.section === "P")
        ];
      }

      return (demoSBSItems.length > 0 ? demoSBSItems : blankSBSItems).map(i => ({ ...i }));
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
  const exportBADocumentPDF = (baData: any) => exportBADocumentPDFImpl(exportCtx, baData);
  const exportARBAIMonitoringExcel = () => exportARBAIMonitoringExcelImpl(exportCtx);
  const exportARBAIMonitoringPDF = () => exportARBAIMonitoringPDFImpl(exportCtx);
  const exportBAOnlyExcel = () => exportBAOnlyExcelImpl(exportCtx);
  const exportBAOnlyPDF = () => exportBAOnlyPDFImpl(exportCtx);
  const exportAROnlyExcel = () => exportAROnlyExcelImpl(exportCtx);
  const exportAROnlyPDF = () => exportAROnlyPDFImpl(exportCtx);
  const exportCoretaxEFakturCSV = (itemData?: any) => exportCoretaxEFakturCSVImpl(exportCtx, itemData);
  const exportEBupotPPh23CSV = (itemData?: any) => exportEBupotPPh23CSVImpl(exportCtx, itemData);

  const handleBASelect = (baNumber: string) => {
    if (!baNumber) {
      setFormData((prev: any) => ({ ...prev, baNoReference: "" }));
      return;
    }
    const selectedBa = baRows.find((r) => r.baNumber === baNumber);
    if (selectedBa) {
      const cust = customerRows.find((c: any) => c.code === selectedBa.customerCode);
      const code = selectedBa.customerCode || "";
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

    const code = ba.customerCode || "";
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
      baID: ba.id,
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
    if (cust === "DBK") return defaultDBKBAItems;
    if (cust === "SBS") return defaultSBSBAOperatingItems;
    return defaultPOSBAOperatingItems;
  }, [defaultBGGBAItems, defaultDBKBAItems, defaultSBSBAOperatingItems, defaultPOSBAOperatingItems, FALLBACK_BGG_BA_ITEMS]);

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
    const ops = initialItems.filter((i: any) => !i.isDeduction && i.category !== "Pengurang Biaya" && i.category !== "MDO" && i.category !== "Penunjang" && i.unit !== "Hours");
    const mdo = initialItems.filter((i: any) => !i.isDeduction && (i.category === "MDO" || i.category === "Penunjang" || i.unit === "Hours"));
    const deds = initialItems.filter((i: any) => i.isDeduction || i.category === "Pengurang Biaya");
    setBaOperatingItems(ops);
    setBaMDOItems(mdo);
    setBaDeductionItems(deds);
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
    { id: `bgg_ob1_${Date.now()}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 1 (75%)", period: period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 29500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_ob2_${Date.now() + 1}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 2 (25%)", period: period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 28750, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_cw_${Date.now() + 2}`, category: "Operating & Mining", area: "", material: "Coal Winning", period: period, notes: "", keterangan: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: 17500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_od_ob_${Date.now() + 3}`, category: "Over Distance", area: "", material: "Over Distance For OB Removal", period: period, notes: "", keterangan: "", unit: "BCM", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 1550, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `bgg_od_cw_${Date.now() + 4}`, category: "Over Distance", area: "", material: "Over Distance For Coal Winning", period: period, notes: "", keterangan: "", unit: "Ton", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 19700, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
  ], []);

  const createBlankSBSBAItems = useCallback((period = getCurrentMonthPeriod()) => [
    { id: `sbs_ba_a1_${Date.now()}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - DISPOSAL SEKATAN", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 22654, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a2_${Date.now() + 1}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA JALAN", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 12638, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a3_${Date.now() + 2}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - RENCANA CSA", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 8346, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a4_${Date.now() + 3}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - JALAN BARITO", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 15500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a5_${Date.now() + 4}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 16931, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a6_${Date.now() + 5}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - TS MAHONI", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 22654, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a7_${Date.now() + 6}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - IPD WARWEFILL", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 8346, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: `sbs_ba_a8_${Date.now() + 7}`, category: "Operating & Mining", area: "Pit E", material: "PIT E - SEKATAN", period, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 19375, subtotalInitial: 0, subtotalAdjusted: 0 }
  ], []);

  const openCreateModal = (type: "ba" | "invoice" | "payment" | "customer" | "pending_volume", initialData: any = {}) => {
    setEditItem(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    const curMonth = getCurrentMonthPeriod();
    if (type === "ba") {
      const cust = initialData.customerCode || "";
      const isBGG = cust === "BGG" || cust === "PT BGG";
      const isDBK = cust === "DBK";
      const isSBS = cust === "SBS";
      const defaultPeriod = initialData.workPeriod || curMonth;
      setIsInlineEditingBA(true);
      setFormData({
        statusBA: "Submit",
        baSubmittedDate: todayStr,
        workPeriod: defaultPeriod,
        customerCode: cust,
        picAAP: initialData?.picAAP || user?.name || "Operations / Site Engineer",
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
      setBaOperatingItems(
        isBGG ? createBlankBGGBAItems(defaultPeriod)
        : isDBK ? (defaultDBKBAItems || []).map((it: any) => ({ ...it, period: defaultPeriod, notes: "", keterangan: "" }))
        : isSBS ? createBlankSBSBAItems(defaultPeriod)
        : defaultPOSBAOperatingItems.map(it => ({ ...it, area: "", period: defaultPeriod, notes: "", keterangan: "" }))
      );
      setBaMDOItems(
        isSBS ? (defaultSBSBAMDOItems || []).map((it: any) => ({ ...it, area: "Pit E", period: defaultPeriod, notes: "", keterangan: "" }))
        : isBGG || isDBK ? []
        : defaultPOSBAMDOItems.map(it => ({ ...it, area: "", period: defaultPeriod, notes: "", keterangan: "" }))
      );
      setBaDeductionItems(
        isSBS ? (defaultSBSBADeductionItems || []).map((it: any) => ({ ...it, area: "Pit E", period: defaultPeriod, notes: "", keterangan: "", material: it.material === "Denda ketidakcapaian Volume" ? `Denda ketidakcapaian Volume ${defaultPeriod}` : it.material }))
        : []
      );
      setActiveBAStep(1);
    } else if (type === "pending_volume") {
      const defaultCust = initialData?.customerCode || "BGG";
      const r1 = defaultCust === "SBS" ? 27250 : 7467;
      const r2 = defaultCust === "SBS" ? 26500 : 7261;
      setFormData({
        customerCode: defaultCust,
        workPeriod: initialData?.workPeriod || curMonth,
        sourcePeriod: initialData?.sourcePeriod || curMonth,
        sourceBARef: initialData?.sourceBARef || "-",
        originalOBVolume: 0,
        absorbedVolume: 0,
        remainingVolume: 0,
        ob1Rate: r1,
        ob2Rate: r2,
        workAmount: 0,
        picAAP: "Surveyor Site",
        notes: "",
        ...initialData,
      });
    } else if (type === "invoice") {
      const defaultCompany = initialData?.customerCode || "POS";
      const defaultPeriod = initialData?.workPeriod || "Juni 2026";
      const autoInvNo = generateInvoiceNumber(defaultCompany, defaultPeriod, invoiceRows.length);
      const cInfo = customerContractMap[defaultCompany];
      const defaultSites: Record<string, string> = {
        BGG: "PT Budi Gema Gempita Site",
        POS: "POS PROJECT",
        IBP: "PT Indo Bhumi Pasifik Site",
        BBA: "PT Bara Batubara Aditama Site",
        SBS: "SBS - Tanjung Enim",
        PTRO: "PT Petrosea Site",
      };
      const defaultContracts: Record<string, string> = {
        BGG: "09/BGG-AAP/VIII/2018",
        POS: "002/POS-AAP/2025",
        IBP: "001/IBP-AAP/2026",
        BBA: "001/BBA-AAP/2026",
        SBS: "230/AAP-SBS/EXT/XII/24",
        PTRO: "001/PTRO-AAP/2024",
      };
      setFormData({
        customerCode: defaultCompany,
        workPeriod: defaultPeriod,
        invoiceNo: autoInvNo,
        activityGroup: initialData?.activityGroup || "OPERATION & MINING",
        projectSite: initialData?.projectSite || cInfo?.project || defaultSites[defaultCompany] || "POS PROJECT",
        contractNo: initialData?.contractNo || cInfo?.contract || defaultContracts[defaultCompany] || "002/POS-AAP/2025",
        noPO: initialData?.noPO || (defaultCompany === "SBS" ? "SPPH-05852" : `PO-${defaultCompany}-2026-001`),
        bankName: cInfo?.bankName || (defaultCompany === "BGG" ? "Bank Mandiri" : (defaultCompany === "PTRO" || defaultCompany === "SBS") ? "Bank BRI" : "Bank BNI"),
        bankAccountNo: cInfo?.bankAccountNo || (defaultCompany === "BGG" ? "070-00-2888000-8" : (defaultCompany === "PTRO" || defaultCompany === "SBS") ? "0417-01-880088-30-8" : "8188788882"),
        bankBranch: cInfo?.bankBranch || (defaultCompany === "BGG" ? "Plaza Mandiri Jakarta" : (defaultCompany === "PTRO" || defaultCompany === "SBS") ? "S. Parman - Slipi Jakarta" : "Harmoni, Jakarta"),
        directorName: cInfo?.directorName || "GAHARI CHRISTINE",
        directorTitle: cInfo?.directorTitle || (defaultCompany === "SBS" ? "DIREKTUR UTAMA" : "DIRECTOR"),
        ...initialData,
      });
      if (defaultCompany === "BGG") setInvLineItems(blankBGGItems.map(i => ({ ...i })));
      else if (defaultCompany === "PTRO" || defaultCompany === "DBK") setInvLineItems(blankPTROItems.map(i => ({ ...i })));
      else if (defaultCompany === "SBS") setInvLineItems(blankSBSItems.map(i => ({ ...i })));
      else setInvLineItems(blankPOSItems.map(i => ({ ...i })));
    }
    setModalType(type);
  };

  const openEditModal = (type: "ba" | "invoice" | "payment" | "customer" | "pending_volume", item: any) => {
    if (type === "ba") {
      openBAModal(item, true);
      return;
    }
    if (type === "pending_volume") {
      setEditItem(item);
      const r1 = item.ob1Rate ?? (item.customerCode === "SBS" ? 27250 : 7467);
      const r2 = item.ob2Rate ?? (item.customerCode === "SBS" ? 26500 : 7261);
      const vol = item.originalOBVolume ?? 0;
      setFormData({
        ...item,
        customerCode: item.customerCode || "BGG",
        workPeriod: item.sourcePeriod || "Agustus 2026",
        sourcePeriod: item.sourcePeriod || "Agustus 2026",
        sourceBARef: item.sourceBaRef || item.sourceBARef || "-",
        originalOBVolume: vol,
        absorbedVolume: item.absorbedVolume ?? 0,
        remainingVolume: item.remainingVolume ?? vol,
        ob1Rate: r1,
        ob2Rate: r2,
        workAmount: Math.round(vol * (r1 * 0.75 + r2 * 0.25)),
        status: item.status || "Active",
        notes: item.notes || ""
      });
      setShowPendingVolumeDrawer(false);
      setModalType("pending_volume");
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
      const code = (item.customerCode || "").toUpperCase();
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
    if (isSaving) return;
    setIsSaving(true);
    try {
      let endpoint = "";
      let payload: any = { ...formData };

      if (modalType === "ba") {
        endpoint = "/api/finance/ba-trackers";
        const isBGG = formData.customerCode === "BGG" || formData.customerCode === "PT BGG";

        const calculateItemSubtotal = (it: any, vol: number) => {
          const r = Number(it.rate || 0);
          if (it.category === "DP Fuel" || it.category === "Pengurang Biaya" || it.isDeduction || (it.material || "").toLowerCase().includes("dp fuel") || (it.material || "").toLowerCase().includes("denda") || (it.material || "").toLowerCase().includes("kelebihan pemakaian bbm")) {
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

        const allItems = [...baOperatingItems, ...baMDOItems, ...baDeductionItems].map((it) => {
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
          customerCode: formData.customerCode || "",
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
        endpoint = "/api/finance/pending-volumes";
        const vol = Number(formData.originalOBVolume || 0);
        if (vol <= 0) {
          onNotice("Volume Saldo Pending (BCM) wajib diisi lebih besar dari 0");
          setIsSaving(false);
          return;
        }
        const r1 = Number(formData.ob1Rate || (formData.customerCode === "SBS" ? 27250 : 7467));
        const r2 = Number(formData.ob2Rate || (formData.customerCode === "SBS" ? 26500 : 7261));
        const rem = formData.remainingVolume !== undefined ? Number(formData.remainingVolume) : vol;
        payload = {
          customerCode: formData.customerCode || "BGG",
          sourcePeriod: formData.sourcePeriod || formData.workPeriod || "Agustus 2026",
          sourceBARef: formData.sourceBARef || "-",
          originalOBVolume: vol,
          absorbedVolume: Number(formData.absorbedVolume || 0),
          remainingVolume: rem,
          ob1Rate: r1,
          ob2Rate: r2,
          status: rem <= 0 ? "Settled" : (Number(formData.absorbedVolume || 0) > 0 ? "Partially Settled" : "Active"),
          notes: formData.notes || ""
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
          customerCode: formData.customerCode || "",
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
          totalDibayar: (formData.customerCode === "SBS") ? calcs.totalDibayar : netTotalInvoiceCalc,
          invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : new Date().toISOString(),
          notes: formData.customerCode === "SBS" ? "PAYMENT DETAIL (PPN & PPh Dikenakan Sebelum Pengurang Pembayaran)" : `PAYMENT DETAIL (RF Index: ${rfIndexCalculated.toFixed(3)})`
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

      const savedModalType = modalType;
      setModalType("none");
      setEditItem(null);
      await loadData();
      if (savedModalType === "pending_volume") {
        setShowPendingVolumeDrawer(true);
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyBA = async (id: number) => {
    try {
      const updated = await verifyBATracker(id, "verify", "Verifikasi Berita Acara oleh Finance Specialist");
      onNotice("Berita Acara berhasil diverifikasi oleh Finance Specialist.");
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
      const updated = await verifyInvoice(id, "verify", "Verifikasi rincian Invoice oleh Finance Specialist");
      onNotice("Invoice berhasil diverifikasi oleh Finance Specialist. Menunggu Approval Manager FATB.");
      await loadData();
      if (detailViewItem && detailViewItem.type === "invoice" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "invoice", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi Invoice");
    }
  };

  const handleApproveInvoice = async (id: number) => {
    try {
      const updated = await approveInvoice(id, "approve", "Persetujuan Invoice oleh Manager FATB");
      onNotice("Invoice berhasil disetujui oleh Manager FATB. Status: Disetujui & Jurnal Piutang AR Terbit.");
      await loadData();
      if (detailViewItem && detailViewItem.type === "invoice" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "invoice", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyetujui Invoice");
    }
  };

  const handleApproveInvoiceTier1 = async (id: number) => {
    return handleApproveInvoice(id);
  };

  const handleApproveInvoiceTier2 = async (id: number) => {
    return handleApproveInvoice(id);
  };

  const handleDelete = async (type: "ba" | "invoice" | "payment" | "customer" | "pending_volume", id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      let endpoint = "";
      if (type === "ba") endpoint = `/api/finance/ba-trackers/${id}`;
      else if (type === "invoice") endpoint = `/api/finance/invoices/${id}`;
      else if (type === "payment") endpoint = `/api/finance/payments/${id}`;
      else if (type === "customer") endpoint = `/api/finance/customers/${id}`;
      else if (type === "pending_volume") endpoint = `/api/finance/pending-volumes/${id}`;

      await api(endpoint, { method: "DELETE" });
      onNotice("Data berhasil dihapus!");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus data");
    }
  };

  const handleSaveSBSPenalty = async (item: Partial<SBSPenaltyItem>) => {
    try {
      await saveSBSPenalty(item);
      onNotice("Catatan Klaim Penalti SBS berhasil disimpan.");
      setSbsPenaltyModalOpen(false);
      setSbsPenaltyEditItem(null);
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan klaim penalti SBS");
    }
  };

  const handleDeleteSBSPenalty = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan klaim penalti SBS ini?")) return;
    try {
      await deleteSBSPenalty(id);
      onNotice("Catatan Klaim Penalti SBS berhasil dihapus.");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus klaim penalti SBS");
    }
  };

  const openSBSPenaltyModal = (item?: SBSPenaltyItem) => {
    setSbsPenaltyEditItem(item || null);
    setSbsPenaltyModalOpen(true);
  };

  const closeSBSPenaltyModal = () => {
    setSbsPenaltyEditItem(null);
    setSbsPenaltyModalOpen(false);
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
    sbsPenalties, setSbsPenalties, sbsPenaltyModalOpen, setSbsPenaltyModalOpen, sbsPenaltyEditItem, setSbsPenaltyEditItem,
    handleSaveSBSPenalty, handleDeleteSBSPenalty, openSBSPenaltyModal, closeSBSPenaltyModal,
    showPendingVolumeDrawer, setShowPendingVolumeDrawer, baFilter, setBaFilter, periodFilter,
    setPeriodFilter, invStatusFilter, setInvStatusFilter, invCardTab, setInvCardTab,
    invPeriodFilter, setInvPeriodFilter, modalType, setModalType, editItem,
    setEditItem, isSaving, formData, setFormData, showActivityGroupDropdown, setShowActivityGroupDropdown,
    showExportBADropdown, setShowExportBADropdown, showInputBADropdown, setShowInputBADropdown, showExportARDropdown,
    setShowExportARDropdown, showInputARDropdown, setShowInputARDropdown, baRowActionDropdownId, setBaRowActionDropdownId,
    detailViewItem, setDetailViewItem, isInlineEditingBA, setIsInlineEditingBA, showAddPartialPayment,
    setShowAddPartialPayment, partialPaymentForm, setPartialPaymentForm, mRate, setMRate,
    fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR, dynamicSowOptions,
    setDynamicSowOptions, bankAccountOptions, setBankAccountOptions, getSowMasterRate, financeTemplates,
    setFinanceTemplates, templatesLoaded, setTemplatesLoaded, templateRows, masterBankAccounts,
    
    rfIndexCalculated, defaultMasterVariableOptions, masterVariableOptions, activeSOWCatalog, applyRateLookup,
    blankPOSItems, demoPOSItems, blankBGGItems, demoBGGItems, blankPTROItems, blankDBKItems,
    demoPTROItems, demoDBKItems, blankSBSItems, demoSBSItems, defaultPOSBAOperatingItems, defaultPOSBAMDOItems,
    defaultBGGBAItems, defaultPTROBAItems, defaultDBKBAItems, defaultSBSBAOperatingItems, defaultSBSBAMDOItems, defaultSBSBADeductionItems, latestKursBI, coalIndexMaster, getBGGActiveCoalTier, baOperatingItems, setBaOperatingItems, baMDOItems, setBaMDOItems, baDeductionItems, setBaDeductionItems,
    activeBAStep, setActiveBAStep, showAddRowDropdown, setShowAddRowDropdown, posInvoiceCategory,
    setPosInvoiceCategory, invLineItems, setInvLineItems, selectedVarA, setSelectedVarA,
    selectedVarB, setSelectedVarB, selectedVarC, setSelectedVarC, selectedVarD,
    setSelectedVarD, selectedVarE, setSelectedVarE, selectedVarF, setSelectedVarF,
    selectedVarP, setSelectedVarP, addVariableToSection, customerContractMap, handleCompanySelect,
    loadDemoPOSData, loadDemoBGGData, loadDemoPTROData, loadDemoDBKData, loadDemoSBSData, removeInvLineItem,
    addInvLineItem, updateInvItemField, reorderInvLineItems,
    updateInvItemVolume, updateInvItemOverhaul, updateInvItemRateIDR, updateInvItemRateUSD, updateInvItemKurs,
    updateInvItemAmount, getItemEffectiveVolume, getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations,
    getSBSTarifByDistance, SBS_DISTANCE_TIERS,
    calcs, subtotalA, subtotalB, subtotalC, subtotalD,
    subtotalE, subtotalF, subtotalP, totalGrossCalc, dpp11_12Calc,
    vat12Calc, pph23Calc, netTotalInvoiceCalc, totalDibayarCalc, exportPaymentDetailPDF, exportBADocumentPDF,
    exportARBAIMonitoringExcel, exportARBAIMonitoringPDF, exportBAOnlyExcel, exportBAOnlyPDF, exportAROnlyExcel,
    exportAROnlyPDF, exportCoretaxEFakturCSV, exportEBupotPPh23CSV, loadData, handleSavePartialPayment, handleVerifyPartialPayment, buildInvoiceItemsFromBA,
    handleBASelect, createInvoiceFromBA, openBAModal, openCreateModal, openEditModal,
    handleFileUpload, handleSave, handleVerifyBA, handleApproveBA, handleSaveBGGBA,
    handleGenerateInvoiceFromBA, handleVerifyInvoice, handleApproveInvoice, handleApproveInvoiceTier1, handleApproveInvoiceTier2, handleDelete,
    volPreview, ratePreview, grossPreview, solarPreview, subtotalDPPPreview,
    ppn11Preview, pph23Preview, totalNetInvoicePreview, totalAgingMatrix, viewTitle,
    query, onNotice, user
  };
}
