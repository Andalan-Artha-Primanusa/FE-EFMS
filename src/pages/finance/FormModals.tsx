import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, ChevronUp, GripVertical, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, TrendingDown, Archive, Scale, Search, Fuel, Loader2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, approveInvoiceTier2, getFinanceTemplates, getAuditLogs, getCompanies, type Company, User as UserType } from "../../lib/api";

import {
  resolveDocumentUrl, formatIDR, parseNumber, formatThousand, formatDateInput,
  indonesianMonths, formatMonthLabel, formatMonthInput, getRomanMonth,
  generateBANumberPreview, generateInvoiceNumberPreview, getYearFromPeriod,
  generateInvoiceNumber, getBAInvoiceStatus, renderBAStatusBadge,
  getBAStatusForExport, renderInvoiceStatusBadge, parsePeriodToMonthIndex,
  RupiahInput, VolumeInput, FormattedNumberInput, MonthPickerInput, generateAuditTimeline
} from "./helpers";
import { getSBSTarifByDistance, SBS_DISTANCE_TIERS } from "./calculations";

export const SITE_SOW_DEFAULTS: Record<string, Array<{ name: string; unit: string; defaultRate: number; category?: string; isDistanceVar?: boolean }>> = {
  BGG: [
    { name: "OVER BURDEN REMOVAL 1 (75%)", unit: "BCM", defaultRate: 29500, category: "Operating & Mining", isDistanceVar: false },
    { name: "OVER BURDEN REMOVAL 2 (25%)", unit: "BCM", defaultRate: 28750, category: "Operating & Mining", isDistanceVar: false },
    { name: "Coal Winning", unit: "Ton", defaultRate: 17500, category: "Operating & Mining", isDistanceVar: false },
    { name: "Over Distance For OB Removal", unit: "BCM", defaultRate: 1550, category: "Over Distance", isDistanceVar: true },
    { name: "Over Distance For Coal Winning", unit: "Ton", defaultRate: 19700, category: "Over Distance", isDistanceVar: true },
  ],
  POS: [
    { name: "Top Soil Removal", unit: "BCM", defaultRate: 60500, category: "Operating & Mining", isDistanceVar: false },
    { name: "Overburden / Waste Removal", unit: "BCM", defaultRate: 59500, category: "Operating & Mining", isDistanceVar: false },
    { name: "Limonite Ore Mining", unit: "WMT", defaultRate: 60200, category: "Operating & Mining", isDistanceVar: false },
    { name: "Saprolite Ore Mining", unit: "WMT", defaultRate: 62200, category: "Operating & Mining", isDistanceVar: false },
    { name: "Uncrushed Rock", unit: "BCM", defaultRate: 142275, category: "Operating & Mining", isDistanceVar: false },
    { name: "Cut & Fill / Earthwork", unit: "BCM", defaultRate: 38150, category: "Operating & Mining", isDistanceVar: false },
    { name: "Crushed Rock", unit: "BCM", defaultRate: 233900, category: "Operating & Mining", isDistanceVar: false },
    { name: "Land Clearing", unit: "m2", defaultRate: 6830, category: "Operating & Mining", isDistanceVar: false },
    { name: "Over/Underhaul For OB Removal", unit: "BCM", defaultRate: 9643, category: "Over Distance", isDistanceVar: true },
    { name: "Over/Underhaul For Top Soil Removal", unit: "BCM", defaultRate: 9643, category: "Over Distance", isDistanceVar: true },
    { name: "Over/Underhaul For Limonite", unit: "BCM", defaultRate: 9428, category: "Over Distance", isDistanceVar: true },
    { name: "Over/Underhaul For Saprolite", unit: "BCM", defaultRate: 9428, category: "Over Distance", isDistanceVar: true },
    { name: "Mine Development (MDO) - Clearing & Access Road", unit: "Ha", defaultRate: 15500000, category: "MDO", isDistanceVar: false },
    { name: "Rocks for construction - under/overhaul", unit: "USD/1KM", defaultRate: 9450, category: "MDO", isDistanceVar: true },
    { name: "Uncrushed rocks for construction (MDO)", unit: "BCM", defaultRate: 142275, category: "MDO", isDistanceVar: false },
    { name: "Road Construction & Drainage", unit: "Mtr", defaultRate: 450000, category: "MDO", isDistanceVar: false },
  ],
  PTRO: [
    { name: "OVER BURDEN", unit: "USD/Bcm", defaultRate: 26700, category: "Operating & Mining", isDistanceVar: false },
    { name: "COAL GETTING", unit: "USD/MT", defaultRate: 15050, category: "Operating & Mining", isDistanceVar: false },
    { name: "OVERHAUL OB", unit: "USD/BCM/100 Mtr", defaultRate: 500, category: "Over Distance", isDistanceVar: true },
    { name: "OVERHAUL COAL GETTING", unit: "IDR/TON/100 Mtr", defaultRate: 230, category: "Over Distance", isDistanceVar: true },
  ],
  DBK: [
    { name: "OVER BURDEN", unit: "USD/Bcm", defaultRate: 26700, category: "Operating & Mining", isDistanceVar: false },
    { name: "COAL GETTING", unit: "USD/MT", defaultRate: 15050, category: "Operating & Mining", isDistanceVar: false },
    { name: "OVERHAUL OB", unit: "USD/BCM/100 Mtr", defaultRate: 500, category: "Over Distance", isDistanceVar: true },
    { name: "OVERHAUL COAL GETTING", unit: "IDR/TON/100 Mtr", defaultRate: 230, category: "Over Distance", isDistanceVar: true },
  ],
  ABN: [
    { name: "Bulldozer D8R Rental", unit: "Hours", defaultRate: 2200000, category: "Operating & Mining", isDistanceVar: false },
    { name: "Bulldozer D85ESS Rental", unit: "Hours", defaultRate: 1950000, category: "Operating & Mining", isDistanceVar: false },
    { name: "Motor Grader 160K", unit: "Hours", defaultRate: 1720000, category: "Operating & Mining", isDistanceVar: false },
  ],
  SBS: [
    { name: "PIT E - DISPOSAL SEKATAN", unit: "BCM", defaultRate: 22654, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - RENCANA JALAN", unit: "BCM", defaultRate: 12638, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - RENCANA CSA", unit: "BCM", defaultRate: 8346, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - JALAN BARITO", unit: "BCM", defaultRate: 15500, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - SEKATAN", unit: "BCM", defaultRate: 16931, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - TS MAHONI", unit: "BCM", defaultRate: 22654, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - IPD WARWEFILL", unit: "BCM", defaultRate: 8346, category: "Operating & Mining", isDistanceVar: false },
    { name: "PIT E - SEKATAN (High Rate)", unit: "BCM", defaultRate: 19375, category: "Operating & Mining", isDistanceVar: false },
    { name: "Bulldozer DZ709", unit: "Hours", defaultRate: 1980000, category: "Penunjang", isDistanceVar: false },
    { name: "Bulldozer DZ716", unit: "Hours", defaultRate: 1980000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator EX815", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator EX816", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator EX817", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Motor Grader MG607", unit: "Hours", defaultRate: 1250000, category: "Penunjang", isDistanceVar: false },
    { name: "Motor Grader MG608", unit: "Hours", defaultRate: 1250000, category: "Penunjang", isDistanceVar: false },
    { name: "Dozer CAT D10 - BDCT 1001", unit: "Hours", defaultRate: 1980000, category: "Penunjang", isDistanceVar: false },
    { name: "Dozer CAT D10 - BDCT 1002", unit: "Hours", defaultRate: 1980000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator CAT 395 - EXCT 3901", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Excavator CAT 395 - EXCT 3902", unit: "Hours", defaultRate: 1425000, category: "Penunjang", isDistanceVar: false },
    { name: "Denda ketidaktercapaian MA", unit: "Lot", defaultRate: 0, category: "Pengurang Biaya", isDistanceVar: false },
    { name: "Kelebihan Pemakaian BBM Loader", unit: "Lot", defaultRate: 0, category: "Pengurang Biaya", isDistanceVar: false },
    { name: "Kelebihan Pemakaian BBM Hauler", unit: "Lot", defaultRate: 0, category: "Pengurang Biaya", isDistanceVar: false },
    { name: "Denda ketidakcapaian Volume", unit: "Lot", defaultRate: 0, category: "Pengurang Biaya", isDistanceVar: false },
  ]
};

export function getSiteSOWList(
  customerCode: string,
  activeSOWCatalog: any[] = [],
  mRate?: number,
  categoryFilter?: "Operating & Mining" | "Penunjang" | "MDO" | "Pengurang Biaya" | "Over Distance" | "All",
  isDistanceOnly: boolean = false
) {
  const code = (customerCode || "POS").toUpperCase();
  const defs = SITE_SOW_DEFAULTS[code] || SITE_SOW_DEFAULTS["POS"] || [];
  
  const matchedFromCatalog = (activeSOWCatalog || []).filter(s => {
    if (!s) return false;
    const c = (s.customer || s.customerCode || "").toUpperCase();
    return !c || c === code || (code === "POS" && (!c || c === "POS"));
  });

  const merged: Array<{ name: string; unit: string; defaultRate: number; category?: string; isDistanceVar?: boolean; isDeduction?: boolean }> = [];
  const seen = new Set<string>();

  defs.forEach(d => {
    const key = (d.name || "").toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      const isDed = (d.category || "").toLowerCase().includes("pengurang") || (d.name || "").toLowerCase().includes("denda") || (d.name || "").toLowerCase().includes("kelebihan");
      merged.push({ ...d, isDeduction: isDed });
    }
  });

  matchedFromCatalog.forEach(c => {
    const name = c.name || c.itemName;
    const key = (name || "").toLowerCase().trim();
    if (code === "SBS" && (key === "dozer cat d10" || key === "excavator cat 395")) {
      return;
    }
    if (key && !seen.has(key)) {
      seen.add(key);
      const isDist = key.includes("overhaul") || key.includes("distance") || (c.category || "").toLowerCase().includes("distance");
      const isDed = (c.category || "").toLowerCase().includes("pengurang") || (name || "").toLowerCase().includes("denda") || (name || "").toLowerCase().includes("kelebihan") || Boolean(c.isDeduction);
      merged.push({
        name: name,
        unit: c.unit || "BCM",
        defaultRate: c.defaultRate || c.rateIDR || (c.rateUSD ? Math.round(c.rateUSD * (mRate || 17923.30)) : 0),
        category: c.category || (isDed ? "Pengurang Biaya" : isDist ? "Over Distance" : "Operating & Mining"),
        isDistanceVar: isDist,
        isDeduction: isDed
      });
    }
  });

  return merged.filter(item => {
    if (isDistanceOnly) return Boolean(item.isDistanceVar);
    if (categoryFilter === "Pengurang Biaya") {
      return item.isDeduction || (item.category || "").toLowerCase().includes("pengurang") || (item.name || "").toLowerCase().includes("denda") || (item.name || "").toLowerCase().includes("kelebihan");
    }
    if (categoryFilter === "Penunjang") {
      return (item.category || "").toLowerCase().includes("penunjang") || item.unit === "Hours";
    }
    if (categoryFilter === "MDO") {
      return (item.category || "").toLowerCase().includes("mdo");
    }
    if (categoryFilter === "Operating & Mining") {
      return !item.isDistanceVar && !item.isDeduction && !(item.category || "").toLowerCase().includes("pengurang") && !(item.category || "").toLowerCase().includes("mdo") && !(item.category || "").toLowerCase().includes("penunjang") && item.unit !== "Hours";
    }
    if (categoryFilter === "Over Distance") {
      return Boolean(item.isDistanceVar);
    }
    return !item.isDistanceVar && !item.isDeduction;
  });
}

export function SOWSelectDropdown({
  value,
  onChange,
  onSelectSow,
  customerCode,
  activeSOWCatalog = [],
  mRate,
  categoryFilter,
  isDistanceOnly = false,
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectSow: (sow: { name: string; unit: string; defaultRate: number; isDistanceVar?: boolean; category?: string; isDeduction?: boolean }) => void;
  customerCode: string;
  activeSOWCatalog?: any[];
  mRate?: number;
  categoryFilter?: "Operating & Mining" | "Penunjang" | "MDO" | "Pengurang Biaya" | "Over Distance" | "All";
  isDistanceOnly?: boolean;
  className?: string;
}) {
  const options = useMemo(() => {
    return getSiteSOWList(customerCode, activeSOWCatalog, mRate, categoryFilter, isDistanceOnly);
  }, [customerCode, activeSOWCatalog, mRate, categoryFilter, isDistanceOnly]);

  const handleChange = (selectedName: string) => {
    onChange(selectedName);
    const found = options.find(o => o.name === selectedName);
    if (found) {
      onSelectSow(found);
    }
  };

  return (
    <select
      className={className || "w-full bg-cyan-50/60 hover:bg-cyan-50 focus:bg-white border border-cyan-300 focus:border-cyan-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none transition cursor-pointer shadow-2xs"}
      value={value || ""}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="" disabled>-- Pilih {isDistanceOnly ? "Variabel Jarak / Overhaul" : categoryFilter === "Penunjang" ? "Alat Berat / Unit" : categoryFilter === "Pengurang Biaya" ? "Pengurang Biaya / Denda" : "Master SOW"} --</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt.name}>
          {opt.name}
        </option>
      ))}
      {value && !options.some(o => o.name === value) && (
        <option value={value}>{value}</option>
      )}
    </select>
  );
}

export function FormModals({ c }: { c: any }) {
  const {
    baRows: rawBaRows, isFinanceSpecialist, isManager, invoiceRows: rawInvoiceRows, customerRows: rawCustomerRows,
    modalType, setModalType, editItem, isSaving, formData, setFormData,
    setDetailViewItem, isInlineEditingBA, setIsInlineEditingBA, mRate, setMRate,
    fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR, masterBankAccounts,
    rfIndexCalculated, activeSOWCatalog, defaultPOSBAOperatingItems, defaultPOSBAMDOItems, defaultBGGBAItems, defaultDBKBAItems, defaultSBSBAOperatingItems, defaultSBSBAMDOItems, defaultSBSBADeductionItems, latestKursBI,
    coalIndexMaster, getBGGActiveCoalTier, baOperatingItems, setBaOperatingItems, baMDOItems, setBaMDOItems, baDeductionItems, setBaDeductionItems, activeBAStep,
    setActiveBAStep, showAddRowDropdown, setShowAddRowDropdown, invLineItems, setInvLineItems, handleCompanySelect,
    loadDemoPOSData, loadDemoBGGData, loadDemoDBKData, loadDemoSBSData, removeInvLineItem,
    updateInvItemVolume, updateInvItemOverhaul, updateInvItemRateIDR, updateInvItemRateUSD, updateInvItemKurs,
    updateInvItemAmount, getItemEffectiveVolume, getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations,
    subtotalA, subtotalB, subtotalC, subtotalD, subtotalE,
    subtotalF, subtotalP, loadData, handleBASelect, createInvoiceFromBA,
    handleFileUpload, handleSave, onNotice, user
  } = (c || {}) as Record<string, any>;
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const customerRows: any[] = Array.isArray(rawCustomerRows) ? rawCustomerRows : [];

  const [auditTab, setAuditTab] = useState<"flow" | "activity">("flow");
  const [baAuditLogs, setBaAuditLogs] = useState<any[]>([]);

  const [companyList, setCompanyList] = useState<Company[]>([]);
  const [draggedInvId, setDraggedInvId] = useState<string | null>(null);
  const [dragOverInvId, setDragOverInvId] = useState<string | null>(null);
  const [isAddRowDropdownOpen, setIsAddRowDropdownOpen] = useState<boolean>(false);

  const handleAddInvLineItem = (section: string = "A") => {
    setIsAddRowDropdownOpen(false);
    if (typeof c?.addInvLineItem === "function") {
      c.addInvLineItem(section);
    } else {
      const currentCust = (formData?.customerCode || "POS").toUpperCase();
      const isUSD = currentCust === "POS" || currentCust === "PTRO" || currentCust === "DBK";
      const isSBS = currentCust === "SBS";
      const desc = isSBS
        ? (section === "B" ? "Alat Berat Tambahan (Jasa Penunjang)" : section === "P" ? "Pengurang Pembayaran Tambahan" : "Area Kerja OB Tambahan")
        : "Pekerjaan / Item Tambahan";
      const unit = isSBS
        ? (section === "B" ? "Hours" : section === "P" ? "Lot" : "BCM")
        : "Bcm";
      const newItem = {
        id: `custom_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        section,
        description: desc,
        unit: unit,
        volume: 0,
        unitRateUSD: isUSD ? 0 : undefined,
        unitRateIDR: isUSD ? undefined : 0,
        kursBI: latestKursBI || mRate || 17923.30,
        amount: 0,
        isCustom: true
      };
      if (typeof c?.setInvLineItems === "function") {
        c.setInvLineItems((prev: any[]) => [...(prev || []), newItem]);
      }
    }
  };

  const handleUpdateInvItemField = (id: string, field: string, val: any) => {
    if (typeof c?.updateInvItemField === "function") {
      c.updateInvItemField(id, field, val);
    } else if (typeof c?.setInvLineItems === "function") {
      c.setInvLineItems((prev: any[]) => (prev || []).map((item: any) => item.id === id ? { ...item, [field]: val } : item));
    }
  };

  const handleReorderInvLineItems = (startIndex: number, endIndex: number) => {
    if (typeof c?.reorderInvLineItems === "function") {
      c.reorderInvLineItems(startIndex, endIndex);
    } else if (typeof c?.setInvLineItems === "function") {
      c.setInvLineItems((prev: any[]) => {
        if (!Array.isArray(prev) || startIndex < 0 || startIndex >= prev.length || endIndex < 0 || endIndex >= prev.length) return prev;
        const result = Array.from(prev);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
      });
    }
  };

  const moveInvRow = (id: string, dir: "up" | "down") => {
    const list: any[] = invLineItems || [];
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < list.length) {
      handleReorderInvLineItems(idx, targetIdx);
    }
  };

  useEffect(() => {
    getCompanies().then((c) => { if (Array.isArray(c)) setCompanyList(c); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (modalType === "ba") {
      const fetchLogs = () => {
        const targetId = String(formData?.id || editItem?.id || "");
        getAuditLogs({ referenceType: "ba_tracker", referenceId: targetId })
          .then((logs) => {
            if (Array.isArray(logs) && logs.length > 0) {
              setBaAuditLogs(logs);
            }
          })
          .catch(() => {});
      };

      fetchLogs();
      const interval = setInterval(fetchLogs, 4000);
      return () => clearInterval(interval);
    }
  }, [modalType, formData?.id, editItem?.id]);

  if (!modalType || modalType === "none") return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-1.5 sm:p-3">
          <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 w-full ${modalType === "ba" || modalType === "pending_volume" || modalType === "invoice" ? "max-w-[96vw] 2xl:max-w-[1550px]" : "max-w-3xl"} shadow-2xl space-y-4 max-h-[96vh] overflow-y-auto transition-all`}>
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                  {modalType === "ba"
                    ? (editItem ? `Berita Acara: ${formData.baNumber || formData.signedBANumber || formData.draftBARefNo || "Draft BA"}` : "Input Berita Acara Baru")
                    : modalType === "invoice"
                    ? (editItem ? "Edit Invoice" : "Create Invoice")
                    : `${editItem ? "Edit Data" : "Tambah Data Baru"} — ${modalType === "pending_volume" ? "Pending Volume" : modalType === "payment" ? "Payment Receipt" : "Customer Master"}`
                  }
                </h3>
                {modalType === "ba" && editItem && (
                  <div className="shrink-0">
                    {renderBAStatusBadge(formData.statusBA || editItem.statusBA, formData.invoiceNoLinked || editItem.invoiceNoLinked, undefined, editItem || formData, invoiceRows)}
                  </div>
                )}
                {modalType === "invoice" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      Site: <strong className="text-cyan-900 font-black">{(formData.customerCode || "POS").toUpperCase()}</strong>
                    </span>
                    {(formData.customerCode || "").toUpperCase() === "POS" && (
                      <span className="text-xs font-bold text-slate-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                        RF Index: <strong className="text-amber-800 font-mono font-black">{rfIndexCalculated.toFixed(3)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {modalType === "ba" && editItem && (
                  <>
                    {(() => {
                      const modalInvStatus = getBAInvoiceStatus(editItem || formData, invoiceRows);
                      const isPOS = (editItem.customerCode === "POS" || formData.customerCode === "POS");
                      const linkedNo = (formData.invoiceNoLinked || editItem?.invoiceNoLinked || "").trim();
                      const isLinked = Boolean(linkedNo && linkedNo !== "-") || modalInvStatus.isFullyInvoiced;

                      if (isPOS) {
                        if (modalInvStatus.isFullyInvoiced || (isLinked && linkedNo.includes("&"))) {
                          return (
                            <div className="flex items-center gap-1.5">
                              {modalInvStatus.createdMiningInv && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    setDetailViewItem({ type: "invoice", data: modalInvStatus.createdMiningInv });
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                  title="Lihat Dokumen Invoice Mining"
                                >
                                  <Archive size={12} className="text-purple-700" />
                                  <span>Inv Mining</span>
                                  <ExternalLink size={10} className="text-purple-700 ml-0.5" />
                                </button>
                              )}
                              {modalInvStatus.createdMDOInv && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    setDetailViewItem({ type: "invoice", data: modalInvStatus.createdMDOInv });
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                  title="Lihat Dokumen Invoice MDO"
                                >
                                  <Archive size={12} className="text-purple-700" />
                                  <span>Inv MDO</span>
                                  <ExternalLink size={10} className="text-purple-700 ml-0.5" />
                                </button>
                              )}
                            </div>
                          );
                        }
                        if (formData.statusBA === "Ready to Invoice" || formData.statusBA === "Approved" || editItem.statusBA === "Ready to Invoice") {
                          return (
                            <div className="flex items-center gap-1.5">
                              {!modalInvStatus.createdMiningInv && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    createInvoiceFromBA(editItem || formData, "Operation & Mining");
                                  }}
                                  className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  <Pickaxe size={13} />
                                  <span>+ Inv Mining</span>
                                </button>
                              )}
                              {!modalInvStatus.createdMDOInv && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    createInvoiceFromBA(editItem || formData, "MDO");
                                  }}
                                  className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  <Building2 size={13} />
                                  <span>+ Inv MDO</span>
                                </button>
                              )}
                            </div>
                          );
                        }
                      } else {
                        // Non-POS (BGG, SBS, PTRO/DBK, ABN)
                        if (isLinked) {
                          const displayInvNo = linkedNo || modalInvStatus.createdInvoices[0]?.invoiceNo || "Terbit";
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setModalType("none");
                                const targetInv = modalInvStatus.createdInvoices[0] || invoiceRows.find((inv: any) => inv.invoiceNo === displayInvNo || inv.baNoReference === formData.baNumber || inv.baID === (editItem?.id || formData.id));
                                if (targetInv) {
                                  setDetailViewItem({ type: "invoice", data: targetInv });
                                } else {
                                  alert(`Invoice #${displayInvNo} telah resmi diterbitkan.`);
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-900 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                              title="Buka Dokumen Invoice"
                            >
                              <Archive size={13} className="text-purple-700" />
                              <span>Lihat Invoice</span>
                              <ExternalLink size={11} className="text-purple-700" />
                            </button>
                          );
                        }
                        if (formData.statusBA === "Ready to Invoice" || formData.statusBA === "Approved" || editItem.statusBA === "Ready to Invoice") {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setModalType("none");
                                createInvoiceFromBA(editItem || formData);
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Zap size={13} className="fill-amber-300 text-amber-300" />
                              <span>+ Terbitkan Invoice</span>
                            </button>
                          );
                        }
                      }
                      return null;
                    })()}
                    <button
                      type="button"
                      onClick={() => setIsInlineEditingBA(!isInlineEditingBA)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-xs border cursor-pointer ${
                        isInlineEditingBA
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                          : "bg-cyan-700 hover:bg-cyan-800 text-white border-cyan-800"
                      }`}
                    >
                      {isInlineEditingBA ? (
                        <>
                          <Eye size={13} /> Pratinjau
                        </>
                      ) : (
                        <>
                          <Edit2 size={13} /> Edit
                        </>
                      )}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  onClick={() => setModalType("none")}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 text-sm font-medium text-slate-800">

              {/* ================= MODAL INVOICE MASTER (PAYMENT DETAIL GENERATOR) ================= */}
              {modalType === "invoice" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                    {/* ZONA 1: PROMINENT BA REFERENCE BAR */}
                    <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="text-xs font-black text-cyan-950 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                        <FileCheck size={16} className="text-cyan-800" /> Referensi Berita Acara (BA):
                      </label>
                      <select
                        className="bg-white border border-cyan-300 font-bold text-slate-900 text-xs px-3 py-2 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full shadow-2xs cursor-pointer"
                        value={formData.baNoReference || ""}
                        onChange={(e) => handleBASelect(e.target.value)}
                      >
                        <option value="">-- Tanpa Referensi BA (Input Manual) --</option>
                        {baRows.map((ba: any) => (
                          <option key={ba.id} value={ba.baNumber}>
                            {ba.baNumber} — Client: {ba.customerCode} — Periode: {ba.workPeriod || "-"} ({formatIDR(ba.workAmount || 0)}) [{ba.statusBA || "Submit"}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ZONA 2: 2-Column Info Grid with Equal Label Spacing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
                      {/* Left Column */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-600 font-bold shrink-0">Site / Customer:</span>
                          <select
                            className="bg-slate-50 hover:bg-white border border-slate-300 font-black text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full transition cursor-pointer"
                            value={formData.customerCode || "POS"}
                            onChange={(e) => handleCompanySelect(e.target.value)}
                          >
                            <option value="BGG">BGG — PT Budi Gema Gempita</option>
                            <option value="POS">POS — PT Position</option>
                            <option value="SBS">SBS — PT Satria Bahana Sarana</option>
                            <option value="PTRO">PTRO — PT Petrosea</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-600 font-bold shrink-0">Kontraktor:</span>
                          <span className="font-extrabold text-slate-800 px-2.5 py-1 bg-slate-100/80 rounded-lg border border-slate-200 flex-1">
                            PT. ANDALAN ARTHA PRIMANUSA
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-600 font-bold shrink-0">Project Site:</span>
                          <input
                            className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full transition"
                            value={formData.projectSite || ""}
                            onChange={(e) => setFormData({ ...formData, projectSite: e.target.value })}
                            placeholder="Otomatis terisi dari Master Customer / BA"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-600 font-bold shrink-0">Period Covered:</span>
                          <div className="flex-1 w-full">
                            <MonthPickerInput
                              value={formData.workPeriod || ""}
                              onChange={(newPeriod) => {
                                const newInvNo = generateInvoiceNumber(formData.customerCode || "POS", newPeriod, invoiceRows.length);
                                setFormData({ ...formData, workPeriod: newPeriod, invoiceNo: newInvNo });
                              }}
                              format="short"
                              className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none w-full transition"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-600 font-bold shrink-0">Invoice No.:</span>
                          <input
                            className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-mono font-black text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full transition"
                            placeholder="003/POS-AAP/RF/VI/2026"
                            value={formData.invoiceNo || ""}
                            onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                            required
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-600 font-bold shrink-0">Activity Group:</span>
                          <input
                            className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full transition"
                            value={formData.activityGroup || "OPERATION & MINING"}
                            onChange={(e) => setFormData({ ...formData, activityGroup: e.target.value })}
                            placeholder="OPERATION & MINING"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-600 font-bold shrink-0">PO Number:</span>
                          <input
                            className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-700 outline-none flex-1 w-full transition font-mono"
                            placeholder="PO-POS-2026-001"
                            value={formData.noPO || formData.poNumber || ""}
                            onChange={(e) => setFormData({ ...formData, noPO: e.target.value, poNumber: e.target.value })}
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-600 font-bold shrink-0">Contract No:</span>
                          <input
                            className="bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 font-bold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full transition font-mono"
                            placeholder="Otomatis terisi dari Master Customer / BA"
                            value={formData.contractNo || ""}
                            onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DYNAMIC PAYMENT DETAIL TABLE PER CUSTOMER */}
                  {(() => {
                    const currentCust = (formData.customerCode || "").toUpperCase();
                    const cCalc = getCustomerCalculations(invLineItems, currentCust);

                    const renderActionCell = (item: any) => (
                      <td className="p-1.5 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <div
                            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition"
                            title="Klik & tahan untuk drag baris"
                          >
                            <GripVertical size={13} />
                          </div>
                          <button
                            type="button"
                            onClick={() => moveInvRow(item.id, "up")}
                            className="p-1 text-slate-400 hover:text-cyan-700 hover:bg-slate-200 rounded transition"
                            title="Pindah baris ke atas"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveInvRow(item.id, "down")}
                            className="p-1 text-slate-400 hover:text-cyan-700 hover:bg-slate-200 rounded transition"
                            title="Pindah baris ke bawah"
                          >
                            <ChevronDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeInvLineItem(item.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded ml-0.5 transition"
                            title="Hapus baris ini"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    );

                    const getRowDragProps = (item: any) => ({
                      draggable: true,
                      onDragStart: (e: React.DragEvent) => {
                        e.dataTransfer.setData("text/plain", item.id);
                        setDraggedInvId(item.id);
                      },
                      onDragOver: (e: React.DragEvent) => {
                        e.preventDefault();
                        if (dragOverInvId !== item.id) setDragOverInvId(item.id);
                      },
                      onDragLeave: () => {
                        if (dragOverInvId === item.id) setDragOverInvId(null);
                      },
                      onDrop: (e: React.DragEvent) => {
                        e.preventDefault();
                        const sourceId = e.dataTransfer.getData("text/plain") || draggedInvId;
                        if (sourceId && sourceId !== item.id) {
                          const fromIdx = (invLineItems || []).findIndex((i: any) => i.id === sourceId);
                          const toIdx = (invLineItems || []).findIndex((i: any) => i.id === item.id);
                          if (fromIdx !== -1 && toIdx !== -1) {
                            handleReorderInvLineItems(fromIdx, toIdx);
                          }
                        }
                        setDraggedInvId(null);
                        setDragOverInvId(null);
                      },
                      className: `hover:bg-slate-50 transition ${dragOverInvId === item.id ? "border-t-2 border-cyan-500 bg-cyan-50/50" : ""}`
                    });

                    const renderDescriptionCell = (item: any) => (
                      <td className="p-2 font-bold text-slate-800">
                        {item.isCustom ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none"
                              value={item.description}
                              placeholder="Deskripsi pekerjaan baru..."
                              onChange={(e) => handleUpdateInvItemField(item.id, "description", e.target.value)}
                            />
                            <span className="text-[10px] uppercase font-mono px-1 py-0.5 bg-cyan-100 text-cyan-800 rounded font-normal shrink-0">Kustom</span>
                          </div>
                        ) : (
                          <div>
                            <span>{item.subSection || item.description}</span>
                            {item.period && <span className="text-[10px] text-slate-500 font-mono font-normal ml-2">({item.period})</span>}
                          </div>
                        )}
                      </td>
                    );

                    const getCustomerCategories = (cust: string) => {
                      switch (cust) {
                        case "BGG":
                          return [
                            { section: "A", label: "A. OB Removal (Pit Kungkilan)", desc: "Overburden (Bcm)" },
                            { section: "B", label: "B. Coal Winning", desc: "Batubara (Ton)" },
                            { section: "C", label: "C. Over Distance", desc: "Jarak angkut lebih (Mtr)" },
                            { section: "D", label: "D. Raise & Fall's Factor", desc: "Eskalasi ICP / Fuel" },
                            { section: "E", label: "E. Discount on Overdistance", desc: "Deduction 25%" },
                            { section: "F", label: "F. DP Fuel & Transport", desc: "Potongan DP BBM" },
                          ];
                        case "PTRO":
                        case "DBK":
                          return [
                            { section: "A", label: "A. OB Removal (Pit Sapan)", desc: "OB Mining (USD/Bcm)" },
                            { section: "B", label: "B. Coal Winning (Pit Sapan)", desc: "Coal Mining (USD/Ton)" },
                            { section: "C", label: "C. Over Distance", desc: "Overhaul OB (USD) & Coal (IDR)" },
                          ];
                        case "SBS":
                          return [
                            { section: "A", label: "A. OB Removal", desc: "Per Area Kerja (BCM)" },
                            { section: "B", label: "B. Jasa Penunjang Produksi", desc: "Rental Alat Berat (Hours)" },
                            { section: "P", label: "P. Pengurang Pembayaran", desc: "Denda & Pemakaian BBM" },
                          ];
                        case "POS":
                        default:
                          return [
                            { section: "A", label: "A. Production / MDO", desc: "OB / Coal Removal (Bcm)" },
                            { section: "B", label: "B. Over Distance", desc: "Overhaul Jarak Angkut" },
                            { section: "C", label: "C. Land Clearing", desc: "Pembersihan Lahan (Ha)" },
                            { section: "D", label: "D. Raise & Fall's Factor", desc: "Eskalasi / Penyesuaian Harga" },
                          ];
                      }
                    };

                    return (
                      <div className="rounded-xl border border-slate-300 shadow-sm bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-800">
                            <Layers size={14} className="text-cyan-600" />
                            <span>Rincian Item Pembayaran ({currentCust})</span>
                            <span className="hidden sm:inline-block text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                              Drag ikon ⋮⋮ atau gunakan panah ↑↓ untuk pindah posisi baris
                            </span>
                          </span>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsAddRowDropdownOpen(prev => !prev)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg shadow-sm transition cursor-pointer"
                            >
                              <Plus size={13} />
                              <span>Tambah Baris</span>
                              <ChevronDown size={13} className={`transition-transform duration-200 ${isAddRowDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isAddRowDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setIsAddRowDropdownOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>Pilih Kategori Baris</span>
                                    <span className="text-[10px] font-mono font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">{currentCust}</span>
                                  </div>
                                  <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-50">
                                    {getCustomerCategories(currentCust).map((cat) => (
                                      <button
                                        key={cat.section}
                                        type="button"
                                        onClick={() => handleAddInvLineItem(cat.section)}
                                        className="w-full text-left px-3 py-2 hover:bg-cyan-50 flex flex-col gap-0.5 transition cursor-pointer group"
                                      >
                                        <span className="text-xs font-bold text-slate-800 group-hover:text-cyan-800 flex items-center justify-between">
                                          <span>{cat.label}</span>
                                          <span className="text-[10px] bg-slate-100 group-hover:bg-cyan-100 text-slate-600 group-hover:text-cyan-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                            Seksi {cat.section}
                                          </span>
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-normal">
                                          {cat.desc}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {currentCust === "SBS" ? (
                          <div className="space-y-4">
                            {/* TABEL UTAMA INVOICE PEKERJAAN (NILAI JKP) */}
                            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Receipt size={14} className="text-cyan-700" />
                                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                    Tabel Utama Invoice Pekerjaan (Nilai JKP)
                                  </h4>
                                </div>
                                <span className="text-[11px] text-slate-600 font-medium">
                                  OB Removal & Jasa Penunjang Produksi (SPPH-05852)
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                                      <th className="p-2.5 text-center w-24">AKSI</th>
                                      <th className="p-2.5">DESCRIPTION</th>
                                      <th className="p-2.5 text-center w-28">JARAK (M)</th>
                                      <th className="p-2.5 text-center w-36">CLAIMED UNIT</th>
                                      <th className="p-2.5 text-right w-36">UNIT RATE (IDR)</th>
                                      <th className="p-2.5 text-right w-44 font-extrabold">AMOUNT (IDR)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 font-medium">
                                    {/* Seksi A: OB REMOVAL */}
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline font-extrabold">OB REMOVAL (Per Area Kerja)</td>
                                      <td className="p-2 text-center text-slate-400 font-mono">-</td>
                                      <td className="p-2 text-center font-mono text-cyan-900 font-black">
                                        {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                                      </td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "A").map(item => {
                                      const currentDist = item.distanceM ?? item.overhaulMtr ?? "";
                                      const tier = getSBSTarifByDistance(Number(currentDist)).tier;
                                      return (
                                        <tr key={item.id} {...getRowDragProps(item)} className="hover:bg-slate-50/80">
                                          {renderActionCell(item)}
                                          {renderDescriptionCell(item)}
                                          <td className="p-2 text-center">
                                            <div className="flex flex-col items-center justify-center gap-0.5">
                                              <FormattedNumberInput
                                                className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-1.5 py-0.5 rounded text-center focus:bg-white focus:border-cyan-700 outline-none"
                                                placeholder="0"
                                                value={currentDist === 0 ? "" : currentDist}
                                                onChange={(val) => {
                                                  const dist = Number(val) || 0;
                                                  const { rate } = getSBSTarifByDistance(dist);
                                                  setInvLineItems(prev => prev.map(it => {
                                                    if (it.id !== item.id) return it;
                                                    return {
                                                      ...it,
                                                      distanceM: dist,
                                                      overhaulMtr: dist,
                                                      ...(rate > 0 ? { unitRateIDR: rate } : {})
                                                    };
                                                  }));
                                                }}
                                              />
                                              {tier && (
                                                <span className="text-[9px] text-cyan-800 font-mono font-bold leading-none">
                                                  {tier.rangeLabel}m
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <FormattedNumberInput
                                                allowDecimals
                                                maxDecimals={3}
                                                className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="0"
                                                value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                onChange={(val) => updateInvItemVolume(item.id, val)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-right">
                                            <FormattedNumberInput
                                              className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                              placeholder="0"
                                              value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                                              onChange={(val) => updateInvItemRateIDR(item.id, val)}
                                            />
                                          </td>
                                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                                            {formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}
                                          </td>
                                        </tr>
                                      );
                                    })}

                                    {/* Seksi B: JASA PENUNJANG PRODUKSI */}
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline font-extrabold">JASA PENUNJANG PRODUKSI (Rental Alat)</td>
                                      <td className="p-2 text-center text-slate-400 font-mono">-</td>
                                      <td className="p-2 text-center font-mono text-cyan-900 font-black">
                                        {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Hours
                                      </td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "B").map(item => (
                                      <tr key={item.id} {...getRowDragProps(item)} className="hover:bg-slate-50/80">
                                        {renderActionCell(item)}
                                        {renderDescriptionCell(item)}
                                        <td className="p-2 text-center text-slate-400 font-mono">-</td>
                                        <td className="p-2 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                            <FormattedNumberInput
                                              allowDecimals
                                              maxDecimals={3}
                                              className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                              placeholder="0"
                                              value={item.volume === 0 ? "" : (item.volume ?? "")}
                                              onChange={(val) => updateInvItemVolume(item.id, val)}
                                            />
                                            <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Hours"}</span>
                                          </div>
                                        </td>
                                        <td className="p-2 text-right">
                                          <FormattedNumberInput
                                            className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder="0"
                                            value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                                            onChange={(val) => updateInvItemRateIDR(item.id, val)}
                                          />
                                        </td>
                                        <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                                          {formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>

                                  {/* Footer Tabel Utama: Kalkulasi Pajak Bruto */}
                                  <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                                    <tr>
                                      <td colSpan={4} className="p-2.5 text-right font-black uppercase text-slate-700">TOTAL (NILAI PEKERJAAN BRUTO):</td>
                                      <td colSpan={2} className="p-2.5 text-right font-mono text-sm font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={4} className="p-2.5 text-right uppercase text-slate-600 font-bold">DPP PPN 11/12:</td>
                                      <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-800">{formatIDR(cCalc.dpp11_12)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={4} className="p-2.5 text-right uppercase text-emerald-800 font-extrabold">VAT ( 12% ) (+):</td>
                                      <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-emerald-700">{formatIDR(cCalc.vat12)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={4} className="p-2.5 text-right uppercase text-rose-800 font-extrabold">WITH HOLDING TAX ART 23 (2%) (-):</td>
                                      <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-rose-700">({formatIDR(cCalc.pph23)})</td>
                                    </tr>
                                    <tr className="bg-slate-900 text-white font-black text-sm border-t-2 border-slate-900">
                                      <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-cyan-300 font-black">TOTAL INVOICE:</td>
                                      <td colSpan={2} className="p-3 text-right font-mono text-base font-black text-emerald-400">{formatIDR(cCalc.totalInvoice)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>

                            {/* TABEL TERPISAH PENGURANG PEMBAYARAN */}
                            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <TrendingDown size={14} className="text-rose-600" />
                                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                    Pengurang Pembayaran
                                  </h4>
                                </div>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Denda Operasional & Kelebihan Konsumsi BBM
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                                      <th className="p-2.5 text-center w-24">AKSI</th>
                                      <th className="p-2.5">PENGURANG PEMBAYARAN</th>
                                      <th className="p-2.5 text-center w-36">CLAIMED UNIT</th>
                                      <th className="p-2.5 text-right w-36">UNIT RATE (IDR)</th>
                                      <th className="p-2.5 text-right w-44 font-extrabold">AMOUNT (IDR)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 font-medium">
                                    {invLineItems.filter(i => i.section === "P").map(item => (
                                      <tr key={item.id} {...getRowDragProps(item)} className="hover:bg-slate-50/70">
                                        {renderActionCell(item)}
                                        <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                        <td className="p-2 text-center font-mono text-slate-600">{item.unit || "Lot"}</td>
                                        <td className="p-2 text-right font-mono text-slate-400">-</td>
                                        <td className="p-2 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            <span className="text-slate-400 font-mono font-bold">(</span>
                                            <FormattedNumberInput
                                              className="w-36 bg-slate-50 hover:bg-white border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:border-cyan-700 outline-none"
                                              placeholder="0"
                                              value={item.amount === 0 ? "" : Math.abs(item.amount)}
                                              onChange={(val) => updateInvItemAmount(item.id, -Math.abs(val))}
                                            />
                                            <span className="text-slate-400 font-mono font-bold">)</span>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-xs">
                                    <tr>
                                      <td colSpan={4} className="p-2.5 text-right font-black uppercase text-slate-800">TOTAL PENGURANG PEMBAYARAN:</td>
                                      <td className="p-2.5 text-right font-mono text-sm font-black text-rose-700">({formatIDR(Math.abs(cCalc.subtotalP))})</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>

                            {/* TOTAL DIBAYAR (SETTLEMENT BERSIH) */}
                            <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                                  <CheckCircle2 size={16} className="text-emerald-400" /> TOTAL DIBAYAR
                                </h4>
                                <p className="text-[11px] text-slate-400 font-medium">
                                  Total Invoice ({formatIDR(cCalc.totalInvoice)}) dikurangi Pengurang Pembayaran ({formatIDR(Math.abs(cCalc.subtotalP))})
                                </p>
                              </div>
                              <div className="text-right w-full sm:w-auto bg-slate-800/90 border border-slate-700 px-5 py-2.5 rounded-xl shadow-xs">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Net Transfer Cash</span>
                                <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">{formatIDR(cCalc.totalDibayar)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                                <th className="p-2.5 text-center w-24">AKSI</th>
                                <th className="p-2.5">DESCRIPTION</th>
                                <th className="p-2.5 text-center">CLAIMED VOLUME / DISTANCE</th>
                                {(currentCust === "PTRO" || currentCust === "DBK") ? (
                                  <>
                                    <th className="p-2.5 text-right">UNIT RATE (USD)</th>
                                    <th className="p-2.5 text-right">KURS (USD to IDR)</th>
                                  </>
                                ) : (
                                  <th className="p-2.5 text-right">UNIT RATE (IDR)</th>
                                )}
                                <th className="p-2.5 text-right font-extrabold">AMOUNT (IDR)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-medium">

                              {/* BGG CUSTOMER TABLE (Gambar 2) */}
                              {currentCust === "BGG" && (
                                <>
                                  {/* Section A: OB Removal */}
                                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                    <td className="p-2 text-center text-slate-400">#</td>
                                    <td className="p-2 underline font-extrabold">A. OB REMOVAL (Pit Kungkilan)</td>
                                    <td className="p-2 text-center font-mono text-cyan-900">
                                      {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm
                                    </td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                  </tr>
                                  {invLineItems.filter(i => i.section === "A").map(item => (
                                    <tr key={item.id} {...getRowDragProps(item)}>
                                      {renderActionCell(item)}
                                      {renderDescriptionCell(item)}
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <FormattedNumberInput
                                            allowDecimals
                                            maxDecimals={3}
                                            className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder="0"
                                            value={item.volume === 0 ? "" : (item.volume ?? "")}
                                            onChange={(val) => updateInvItemVolume(item.id, val)}
                                          />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">
                                        <FormattedNumberInput
                                          className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder="0"
                                          value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                                          onChange={(val) => updateInvItemRateIDR(item.id, val)}
                                        />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                    </tr>
                                  ))}

                                  {/* Section B: Coal Winning */}
                                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                    <td className="p-2 text-center text-slate-400">#</td>
                                    <td className="p-2 underline font-extrabold">B. COAL WINNING (Pit Kungkilan)</td>
                                    <td className="p-2 text-center font-mono text-cyan-900">
                                      {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Ton
                                    </td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                  </tr>
                                  {invLineItems.filter(i => i.section === "B").map(item => (
                                    <tr key={item.id} {...getRowDragProps(item)}>
                                      {renderActionCell(item)}
                                      {renderDescriptionCell(item)}
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <FormattedNumberInput
                                            allowDecimals
                                            maxDecimals={3}
                                            className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder="0"
                                            value={item.volume === 0 ? "" : (item.volume ?? "")}
                                            onChange={(val) => updateInvItemVolume(item.id, val)}
                                          />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Ton"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">
                                        <FormattedNumberInput
                                          className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder="0"
                                          value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                                          onChange={(val) => updateInvItemRateIDR(item.id, val)}
                                        />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                    </tr>
                                  ))}

                                  {/* Section C: Over Distance */}
                                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                    <td className="p-2 text-center text-slate-400">#</td>
                                    <td className="p-2 underline font-extrabold">C. OVER DISTANCE</td>
                                    <td className="p-2 text-center"></td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                  </tr>
                                  {invLineItems.filter(i => i.section === "C").map(item => (
                                    <tr key={item.id} {...getRowDragProps(item)}>
                                      {renderActionCell(item)}
                                      <td className="p-2 font-bold text-slate-800">
                                        <div>{item.description}</div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <FormattedNumberInput
                                            className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder="1.000"
                                            value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                                            onChange={(val) => updateInvItemOverhaul(item.id, val)}
                                          />
                                          <span className="text-[11px] text-slate-600 font-bold">Mtr Jarak Riil</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <FormattedNumberInput
                                            allowDecimals
                                            maxDecimals={3}
                                            className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder="0"
                                            value={item.volume === 0 ? "" : (item.volume ?? "")}
                                            onChange={(val) => updateInvItemVolume(item.id, val)}
                                          />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">
                                        <FormattedNumberInput
                                          className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder="0"
                                          value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                                          onChange={(val) => updateInvItemRateIDR(item.id, val)}
                                        />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                    </tr>
                                  ))}

                                  {/* Section D: Raise & Fall */}
                                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                    <td className="p-2 text-center text-slate-400">#</td>
                                    <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
                                    <td className="p-2 text-center"></td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalD)}</td>
                                  </tr>
                                  {invLineItems.filter(i => i.section === "D").map(item => (
                                    <tr key={item.id} {...getRowDragProps(item)}>
                                      {renderActionCell(item)}
                                      {renderDescriptionCell(item)}
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <FormattedNumberInput
                                            allowDecimals
                                            maxDecimals={3}
                                            className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder="0"
                                            value={item.volume === 0 ? "" : (item.volume ?? "")}
                                            onChange={(val) => updateInvItemVolume(item.id, val)}
                                          />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">
                                        <FormattedNumberInput
                                          className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder="0"
                                          value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                                          onChange={(val) => updateInvItemRateIDR(item.id, val)}
                                        />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                    </tr>
                                  ))}

                                  {/* Section E: Discount Over Distance */}
                                  <tr className="bg-rose-50 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                    <td className="p-2 text-center text-rose-400">#</td>
                                    <td colSpan={3} className="p-2 underline font-extrabold">E. DISCOUNT ON OVERDISTANCE (Deduction 25%)</td>
                                    <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalE))})</td>
                                  </tr>
                                  {invLineItems.filter(i => i.section === "E").map(item => (
                                    <tr key={item.id} {...getRowDragProps(item)}>
                                      {renderActionCell(item)}
                                      <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                      <td className="p-2 text-right font-mono">
                                        <FormattedNumberInput
                                          className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none"
                                          placeholder="0"
                                          value={item.amount === 0 ? "" : Math.abs(item.amount)}
                                          onChange={(val) => updateInvItemAmount(item.id, -Math.abs(val))}
                                        />
                                      </td>
                                    </tr>
                                  ))}

                                  {/* Section F: DP Fuel & Transport */}
                                  <tr className="bg-rose-50 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                    <td className="p-2 text-center text-rose-400">#</td>
                                    <td colSpan={3} className="p-2 underline font-extrabold">F. DP FUEL & TRANSPORT (Deduction)</td>
                                    <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalF))})</td>
                                  </tr>
                                  {invLineItems.filter(i => i.section === "F").map(item => (
                                    <tr key={item.id} {...getRowDragProps(item)}>
                                      {renderActionCell(item)}
                                      <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                      <td className="p-2 text-right font-mono">
                                        <FormattedNumberInput
                                          className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none"
                                          placeholder="0"
                                          value={item.amount === 0 ? "" : Math.abs(item.amount)}
                                          onChange={(val) => updateInvItemAmount(item.id, -Math.abs(val))}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </>
                              )}

                              {/* PTRO / DBK CUSTOMER TABLE (Gambar 3) */}
                              {(currentCust === "PTRO" || currentCust === "DBK") && (
                                <>
                                  {/* Section A: OB Removal */}
                                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                    <td className="p-2 text-center text-slate-400">#</td>
                                    <td className="p-2 underline font-extrabold">A. OB REMOVAL (Pit Sapan)</td>
                                    <td className="p-2 text-center font-mono text-cyan-900">
                                      {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                                    </td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                  </tr>
                                  {invLineItems.filter(i => i.section === "A").map(item => (
                                    <tr key={item.id} {...getRowDragProps(item)}>
                                      {renderActionCell(item)}
                                      {renderDescriptionCell(item)}
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <FormattedNumberInput
                                            allowDecimals
                                            maxDecimals={3}
                                            className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder="0"
                                            value={item.volume === 0 ? "" : (item.volume ?? "")}
                                            onChange={(val) => updateInvItemVolume(item.id, val)}
                                          />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">
                                        <FormattedNumberInput
                                          allowDecimals
                                          maxDecimals={3}
                                          className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder="0.000"
                                          value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")}
                                          onChange={(val) => updateInvItemRateUSD(item.id, val)}
                                        />
                                      </td>
                                      <td className="p-2 text-right">
                                        <FormattedNumberInput
                                          allowDecimals
                                          maxDecimals={2}
                                          className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder="16.000"
                                          value={item.kursBI === 0 ? "" : (item.kursBI ?? "")}
                                          onChange={(val) => updateInvItemKurs(item.id, val)}
                                        />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                                        {formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17923.30)))}
                                      </td>
                                    </tr>
                                  ))}

                                  {/* Section B: Coal Winning */}
                                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                    <td className="p-2 text-center text-slate-400">#</td>
                                    <td className="p-2 underline font-extrabold">B. COAL WINNING (Pit Sapan)</td>
                                    <td className="p-2 text-center font-mono text-cyan-900">
                                      {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Ton
                                    </td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                  </tr>
                                  {invLineItems.filter(i => i.section === "B").map(item => (
                                    <tr key={item.id} {...getRowDragProps(item)}>
                                      {renderActionCell(item)}
                                      {renderDescriptionCell(item)}
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <FormattedNumberInput
                                            allowDecimals
                                            maxDecimals={3}
                                            className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder="0"
                                            value={item.volume === 0 ? "" : (item.volume ?? "")}
                                            onChange={(val) => updateInvItemVolume(item.id, val)}
                                          />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Ton"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">
                                        <FormattedNumberInput
                                          allowDecimals
                                          maxDecimals={3}
                                          className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder="0.000"
                                          value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")}
                                          onChange={(val) => updateInvItemRateUSD(item.id, val)}
                                        />
                                      </td>
                                      <td className="p-2 text-right">
                                        <FormattedNumberInput
                                          allowDecimals
                                          maxDecimals={2}
                                          className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder="16.000"
                                          value={item.kursBI === 0 ? "" : (item.kursBI ?? "")}
                                          onChange={(val) => updateInvItemKurs(item.id, val)}
                                        />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                                        {formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17923.30)))}
                                      </td>
                                    </tr>
                                  ))}

                                  {/* Section C: Over Distance */}
                                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                    <td className="p-2 text-center text-slate-400">#</td>
                                    <td className="p-2 underline font-extrabold">C. OVER DISTANCE</td>
                                    <td className="p-2 text-center"></td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right"></td>
                                    <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                  </tr>
                                  {invLineItems.filter(i => i.section === "C").map(item => {
                                    const effVol = getItemEffectiveVolume(item);
                                    const effMtr = getItemEffectiveOverhaulMtr(item);
                                    const baseMtr = item.baseMtr || (item.unit === "Ton" ? 3000 : 1000);
                                    const diff = Math.max(0, effMtr - baseMtr);
                                    const isCoal = item.subSection?.includes("Coal") || item.description?.includes("Coal") || item.unit === "Ton";
                                    const calculated = calculateItemRateAndAmount(item, "PTRO");

                                    return (
                                      <tr key={item.id} {...getRowDragProps(item)}>
                                        {renderActionCell(item)}
                                        <td className="p-2 font-bold text-slate-800">
                                          <div>{item.description}</div>
                                          <div className="flex items-center gap-1.5 mt-1">
                                            <FormattedNumberInput
                                              className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                              placeholder={String(baseMtr)}
                                              value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                                              onChange={(val) => updateInvItemOverhaul(item.id, val)}
                                            />
                                            <span className="text-[11px] text-slate-600 font-bold">
                                              mtr - {formatThousand(baseMtr)} mtr = ({diff > 0 ? `+${formatThousand(diff)}` : 0}) mtr
                                            </span>
                                          </div>
                                        </td>
                                        <td className="p-2 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                            <FormattedNumberInput
                                              allowDecimals
                                              maxDecimals={3}
                                              className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                              placeholder="0"
                                              value={item.volume === 0 ? "" : (item.volume ?? "")}
                                              onChange={(val) => updateInvItemVolume(item.id, val)}
                                            />
                                            <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
                                          </div>
                                        </td>
                                        <td className="p-2 text-right">
                                          {!isCoal ? (
                                            <FormattedNumberInput
                                              allowDecimals
                                              maxDecimals={3}
                                              className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                              placeholder="0.028"
                                              value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")}
                                              onChange={(val) => updateInvItemRateUSD(item.id, val)}
                                            />
                                          ) : (
                                            <span className="text-slate-400 font-mono text-[11px]">-</span>
                                          )}
                                        </td>
                                        <td className="p-2 text-right">
                                          {!isCoal ? (
                                            <FormattedNumberInput
                                              allowDecimals
                                              maxDecimals={3}
                                              className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                              placeholder="16.000"
                                              value={item.kursBI === 0 ? "" : (item.kursBI ?? "")}
                                              onChange={(val) => updateInvItemKurs(item.id, val)}
                                            />
                                          ) : (
                                            <span className="text-slate-400 font-mono text-[11px]">-</span>
                                          )}
                                        </td>
                                        <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                                          {formatIDR(calculated.amount)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </>
                              )}

                              {/* POS MINING BASELINE TABLE (Gambar 1) */}
                              {currentCust === "POS" && (
                                <>
                                  {/* SECTION A. PRODUCTION / MDO */}
                                  {invLineItems.filter(i => i.section === "A").length > 0 && (
                                    <>
                                      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                        <td className="p-2 text-center text-slate-400">#</td>
                                        <td className="p-2 underline">
                                          {formData.customerCode === "POS" && (formData.invoiceCategory === "MDO" || formData.activityGroup?.includes("MDO"))
                                            ? "A. MINE DEVELOPMENT (MDO)"
                                            : "A. PRODUCTION"}
                                        </td>
                                        <td className="p-2 text-center font-mono text-cyan-900">
                                          {formData.customerCode === "POS" && (formData.invoiceCategory === "MDO" || formData.activityGroup?.includes("MDO"))
                                            ? ""
                                            : `${invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm`
                                          }
                                        </td>
                                        <td className="p-2 text-right"></td>
                                        <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                      </tr>
                                      {invLineItems.filter(i => i.section === "A").map((item, idx) => {
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
                                        return (
                                          <tr key={item.id} {...getRowDragProps(item)}>
                                            {renderActionCell(item)}
                                            <td className="p-2 font-bold text-slate-800">
                                              {item.isCustom ? (
                                                <input
                                                  type="text"
                                                  className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none"
                                                  value={item.description}
                                                  placeholder="Deskripsi produksi kustom..."
                                                  onChange={(e) => handleUpdateInvItemField(item.id, "description", e.target.value)}
                                                />
                                              ) : (
                                                <>
                                                  <span className="text-cyan-900 font-mono mr-1.5 font-black">{`A${idx + 1}.`}</span>
                                                  <span>{cleanDesc}</span>
                                                </>
                                              )}
                                            </td>
                                            <td className="p-2 text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <FormattedNumberInput
                                                  allowDecimals
                                                  maxDecimals={3}
                                                  className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                  placeholder="0"
                                                  value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                  onChange={(val) => updateInvItemVolume(item.id, val)}
                                                />
                                                <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                              </div>
                                            </td>
                                            <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}

                                  {/* SECTION B. OVER DISTANCE */}
                                  {invLineItems.filter(i => i.section === "B").length > 0 && (
                                    <>
                                      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                        <td className="p-2 text-center text-slate-400">#</td>
                                        <td className="p-2 underline font-extrabold">B. OVER DISTANCE</td>
                                        <td className="p-2 text-center"></td>
                                        <td className="p-2 text-right"></td>
                                        <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                      </tr>
                                      {invLineItems.filter(i => i.section === "B").map((item, idx) => {
                                        const effVol = getItemEffectiveVolume(item);
                                        const effMtr = getItemEffectiveOverhaulMtr(item);
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        const diffMtr = effMtr - 1000;
                                        const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();

                                        return (
                                          <tr key={item.id} {...getRowDragProps(item)}>
                                            {renderActionCell(item)}
                                            <td className="p-2 font-bold text-slate-800">
                                              {item.isCustom ? (
                                                <div className="mb-1">
                                                  <input
                                                    type="text"
                                                    className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none"
                                                    value={item.description}
                                                    placeholder="Deskripsi overhaul kustom..."
                                                    onChange={(e) => handleUpdateInvItemField(item.id, "description", e.target.value)}
                                                  />
                                                </div>
                                              ) : (
                                                <div>
                                                  <span className="text-cyan-900 font-mono mr-1.5 font-black">{`B${idx + 1}.`}</span>
                                                  <span>{cleanDesc}</span>
                                                </div>
                                              )}
                                              <div className="flex items-center gap-1.5 mt-1">
                                                <FormattedNumberInput
                                                  className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                  placeholder="1.000"
                                                  value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                                                  onChange={(val) => updateInvItemOverhaul(item.id, val)}
                                                />
                                                <span className="text-[11px] text-slate-600 font-bold">mtr - 1.000 mtr = ({diffMtr > 0 ? `+${formatThousand(diffMtr)}` : formatThousand(diffMtr)}) mtr</span>
                                              </div>
                                            </td>
                                            <td className="p-2 text-center">
                                              <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-extrabold text-slate-800 text-xs">
                                                <span>{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                                                <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                              </div>
                                            </td>
                                            <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}

                                  {/* SECTION C. LAND CLEARING */}
                                  {invLineItems.filter(i => i.section === "C").length > 0 && (
                                    <>
                                      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                        <td className="p-2 text-center text-slate-400">#</td>
                                        <td className="p-2 underline font-extrabold">C. LAND CLEARING</td>
                                        <td className="p-2 text-center font-mono text-cyan-900">
                                          {invLineItems.filter(i => i.section === "C").reduce((sum, i) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} m2
                                        </td>
                                        <td className="p-2 text-right"></td>
                                        <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                      </tr>
                                      {invLineItems.filter(i => i.section === "C").map((item, idx) => {
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
                                        return (
                                          <tr key={item.id} {...getRowDragProps(item)}>
                                            {renderActionCell(item)}
                                            <td className="p-2 font-bold text-slate-800">
                                              {item.isCustom ? (
                                                <input
                                                  type="text"
                                                  className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none"
                                                  value={item.description}
                                                  placeholder="Deskripsi land clearing..."
                                                  onChange={(e) => handleUpdateInvItemField(item.id, "description", e.target.value)}
                                                />
                                              ) : (
                                                <>
                                                  <span className="text-cyan-900 font-mono mr-1.5 font-black">{`C${idx + 1}.`}</span>
                                                  <span>{cleanDesc}</span>
                                                </>
                                              )}
                                            </td>
                                            <td className="p-2 text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <FormattedNumberInput
                                                  allowDecimals
                                                  maxDecimals={3}
                                                  className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                  placeholder="0"
                                                  value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                  onChange={(val) => updateInvItemVolume(item.id, val)}
                                                />
                                                <span className="text-[11px] text-slate-600 font-bold">{item.unit || "m2"}</span>
                                              </div>
                                            </td>
                                            <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}

                                  {/* SECTION D. RAISE & FALL'S FACTOR */}
                                  {invLineItems.filter(i => i.section === "D").length > 0 && (
                                    <>
                                      <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                        <td className="p-2 text-center text-slate-400">#</td>
                                        <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
                                        <td className="p-2 text-center"></td>
                                        <td className="p-2 text-right"></td>
                                        <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalD)}</td>
                                      </tr>
                                      {invLineItems.filter(i => i.section === "D").map((item, idx) => {
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
                                        return (
                                          <tr key={item.id} {...getRowDragProps(item)}>
                                            {renderActionCell(item)}
                                            <td className="p-2 font-bold text-slate-800">
                                              {item.isCustom ? (
                                                <input
                                                  type="text"
                                                  className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none"
                                                  value={item.description}
                                                  placeholder="Deskripsi penyesuaian..."
                                                  onChange={(e) => handleUpdateInvItemField(item.id, "description", e.target.value)}
                                                />
                                              ) : (
                                                <>
                                                  <span className="text-cyan-900 font-mono mr-1.5 font-black">{`D${idx + 1}.`}</span>
                                                  <span>{cleanDesc}</span>
                                                </>
                                              )}
                                            </td>
                                            <td className="p-2 text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <FormattedNumberInput
                                                  allowDecimals
                                                  maxDecimals={3}
                                                  className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                  placeholder="0"
                                                  value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                  onChange={(val) => updateInvItemVolume(item.id, val)}
                                                />
                                                <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                              </div>
                                            </td>
                                            <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}
                                </>
                              )}
                            </tbody>

                            {/* ZONA 5: SUMMARY TOTALS & TAX BREAKDOWN */}
                            <tfoot className="border-t-2 border-slate-900 bg-slate-50 font-bold text-xs">
                              <tr>
                                <td colSpan={(currentCust === "PTRO" || currentCust === "DBK") ? 4 : 3} className="p-2.5 text-right font-black uppercase text-slate-700">SUBTOTAL REVENUE (GROSS):</td>
                                <td colSpan={2} className="p-2.5 text-right font-mono text-sm font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
                              </tr>
                              <tr>
                                <td colSpan={(currentCust === "PTRO" || currentCust === "DBK") ? 4 : 3} className="p-2.5 text-right uppercase text-slate-600 font-bold">DPP PPN 11/12:</td>
                                <td colSpan={2} className="p-2.5 text-right font-mono font-bold text-slate-800">{formatIDR(cCalc.dpp11_12 || Math.round(cCalc.totalGross * 11 / 12))}</td>
                              </tr>
                              <tr>
                                <td colSpan={(currentCust === "PTRO" || currentCust === "DBK") ? 4 : 3} className="p-2.5 text-right uppercase text-emerald-800 font-extrabold">VAT (12%) (+):</td>
                                <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-emerald-700">{formatIDR(cCalc.vat12 || Math.round((cCalc.dpp11_12 || (cCalc.totalGross * 11 / 12)) * 0.12))}</td>
                              </tr>
                              <tr>
                                <td colSpan={(currentCust === "PTRO" || currentCust === "DBK") ? 4 : 3} className="p-2.5 text-right uppercase text-rose-800 font-extrabold">WITHHOLDING TAX ART 23 (2%) (-):</td>
                                <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-rose-700">({formatIDR(cCalc.pph23 || Math.round(cCalc.totalGross * 0.02))})</td>
                              </tr>
                              <tr className="bg-slate-900 text-white font-black text-sm border-t-2 border-slate-900">
                                <td colSpan={(currentCust === "PTRO" || currentCust === "DBK") ? 4 : 3} className="p-3 text-right uppercase tracking-wider text-cyan-300">TOTAL INVOICE (NETTO):</td>
                                <td colSpan={2} className="p-3 text-right font-mono text-base font-black text-emerald-400">{formatIDR(cCalc.totalInvoice)}</td>
                              </tr>
                            </tfoot>
                          </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      * Pilih customer di atas untuk berganti otomatis format dan urutan field SOW (POS, BGG, PTRO, SBS). Kolom tabel & perhitungan otomatis menyesuaikan.
                    </span>
                  </div>
                </div>
              )}

              {/* ================= DEDICATED MODAL INPUT PENDING VOLUME ================= */}
              {modalType === "pending_volume" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-2">
                        <Scale size={16} className="text-indigo-700" /> Pencatatan Pending Volume (Over Kontrak / Stripping Ratio)
                      </h4>
                      <p className="text-[11px] text-indigo-900 font-medium mt-0.5">
                        Pencatatan pengerjaan material Top Soil & Overburden (OB) yang melebihi batas rasio kontrak terhadap Coal. Selisih volume di-pending untuk masuk penagihan invoice berikutnya.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-900 font-extrabold text-[11px] shrink-0">
                      Carry Over Invoice
                    </span>
                  </div>

                  {/* Info Box Rasio Kontrak Customer */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5">
                    <div className="font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                      <Info size={13} className="text-indigo-700" /> Kesepakatan Rasio Kontrak ({formData.customerCode || ""}):
                    </div>
                    <div className="text-slate-600 font-medium pl-4">
                      {formData.customerCode === "BGG" ? (
                        <span>Kontrak BGG: Perbandingan Top Soil & Overburden adalah maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>. Nilai coal 1 Ton dengan nilai top soil dan overburden maksimal 3 Bcm kontraknya. Kelebihan volume pengerjaan di-pending ke invoice selanjutnya.</span>
                      ) : formData.customerCode === "PTRO" || formData.customerCode === "DBK" ? (
                        <span>Kontrak PTRO (PT Petrosea): Perbandingan Overburden maksimal <strong>3.5 BCM / 1 Ton Coal</strong>. Selisih volume over-ratio di-carry over.</span>
                      ) : formData.customerCode === "POS" ? (
                        <span>Kontrak POS (PT Position): Perbandingan Waste/OB & Top Soil maksimal <strong>4.0 BCM / 1 Ton Ore</strong>. Selisih kuota masuk ke Pending Volume.</span>
                      ) : formData.customerCode === "SBS" ? (
                        <span>Kontrak SBS (PT Satria Bahana Sarana): Penagihan berbasis 8 titik Overburden per Disposal & Jasa Alat Berat Jam-Mesin (tanpa rasio batubara).</span>
                      ) : (
                        <span>Kontrak Standar: Rasio Top Soil & OB maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>.</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Customer Code <span className="text-rose-600">*</span>
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none text-xs"
                        value={formData.customerCode || "BGG"}
                        onChange={(e) => {
                          const code = e.target.value;
                          const r1 = code === "SBS" ? 27250 : 7467;
                          const r2 = code === "SBS" ? 26500 : 7261;
                          const v = Number(formData.originalOBVolume || 0);
                          setFormData({
                            ...formData,
                            customerCode: code,
                            ob1Rate: r1,
                            ob2Rate: r2,
                            workAmount: Math.round(v * (r1 * 0.75 + r2 * 0.25))
                          });
                        }}
                        required
                      >
                        <option value="BGG">BGG - PT Budi Gema Gempita (Quota SR 3:1)</option>
                        <option value="SBS">SBS - PT Satria Bahana Sarana</option>
                        <option value="PTRO">PTRO - PT Petrosea</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Periode Asal <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="month"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none text-xs"
                        value={formatMonthInput(formData.workPeriod || formData.sourcePeriod || "Agustus 2026")}
                        onChange={(e) => {
                          const mVal = e.target.value;
                          const formattedLabel = formatMonthLabel(mVal);
                          setFormData({ ...formData, workPeriod: formattedLabel, sourcePeriod: formattedLabel });
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Ref. Nomor BA (Opsional)
                      </label>
                      <input
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none text-xs font-mono"
                        placeholder="Contoh: 20/BAP-AAP-KKLII/26"
                        value={formData.sourceBARef || ""}
                        onChange={(e) => setFormData({ ...formData, sourceBARef: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <VolumeInput
                        label="Volume Saldo Pending"
                        unit="BCM"
                        required
                        value={formData.originalOBVolume || 0}
                        onChange={(v) => {
                          const r1 = Number(formData.ob1Rate || (formData.customerCode === "SBS" ? 27250 : 7467));
                          const r2 = Number(formData.ob2Rate || (formData.customerCode === "SBS" ? 26500 : 7261));
                          setFormData({
                            ...formData,
                            originalOBVolume: v,
                            remainingVolume: v,
                            workAmount: Math.round(v * (r1 * 0.75 + r2 * 0.25))
                          });
                        }}
                      />
                    </div>

                    <div>
                      <RupiahInput
                        label="Tarif OB1 75% (Rp)"
                        value={formData.ob1Rate || (formData.customerCode === "SBS" ? 27250 : 7467)}
                        onChange={(r1) => {
                          const r2 = Number(formData.ob2Rate || 7261);
                          const v = Number(formData.originalOBVolume || 0);
                          setFormData({ ...formData, ob1Rate: r1, workAmount: Math.round(v * (r1 * 0.75 + r2 * 0.25)) });
                        }}
                      />
                    </div>

                    <div>
                      <RupiahInput
                        label="Tarif OB2 25% (Rp)"
                        value={formData.ob2Rate || (formData.customerCode === "SBS" ? 26500 : 7261)}
                        onChange={(r2) => {
                          const r1 = Number(formData.ob1Rate || 7467);
                          const v = Number(formData.originalOBVolume || 0);
                          setFormData({ ...formData, ob2Rate: r2, workAmount: Math.round(v * (r1 * 0.75 + r2 * 0.25)) });
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
                        Estimasi Nilai Nominal Tertunda (Auto-calculated):
                      </span>
                      <strong className="text-sm font-mono font-black text-emerald-800">
                        {formatIDR(formData.workAmount || Math.round((Number(formData.originalOBVolume) || 0) * ((Number(formData.ob1Rate) || 7467) * 0.75 + (Number(formData.ob2Rate) || 7261) * 0.25)))}
                      </strong>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Formula: Vol × (75% × OB1 + 25% × OB2)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Catatan / Keterangan Pending Volume (Selisih Stripping Ratio)
                    </label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:border-cyan-700 focus:bg-white outline-none"
                      rows={2}
                      placeholder="Contoh: Pending volume selisih Top Soil & Overburden over-contract ratio (3:1) untuk carry-over ke invoice berikutnya..."
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* ================= MODAL BA TRACKER (UNIFIED WIDESCREEN DUAL-MODE WORKFLOW) ================= */}
              {modalType === "ba" && (() => {
                const isCustomerBGG = (formData.customerCode === "BGG" || formData.customerCode === "PT BGG");
                const isCustomerPOS = (formData.customerCode === "POS" || formData.customerCode === "IBP" || formData.customerCode === "BBA" || !formData.customerCode);
                const isCustomerSBS = formData.customerCode === "SBS";
                const isCustomerDBK = formData.customerCode === "PTRO" || formData.customerCode === "DBK";

                const allBAItems = [...baOperatingItems, ...baMDOItems, ...(baDeductionItems || [])];

                const isDistanceItem = (item: any) => {
                  if (!item) return false;
                  return Boolean(
                    item.isDistanceVar || 
                    item.category === "Over Distance" || 
                    (item.material && (
                      item.material.toLowerCase().includes("overhaul") || 
                      item.material.toLowerCase().includes("over distance") ||
                      item.material.toLowerCase().includes("distance")
                    ))
                  );
                };

                const getBaseDistance = (item: any) => {
                  if (item?.distanceBasis !== undefined && item?.distanceBasis !== null && Number(item.distanceBasis) > 0) {
                    return Number(item.distanceBasis);
                  }
                  const mLow = (item?.material || item?.description || item?.sowDescription || "").toLowerCase();
                  if (mLow.includes("coal") || mLow.includes("batubara")) {
                    return 3000;
                  }
                  return 1000;
                };

                const getBAEffectiveVolume = (item: any, allItems: any[], isSurvey: boolean = false) => {
                  if (isDistanceItem(item)) {
                    const selfVol = isSurvey ? Number(item.adjustedVolume ?? item.initialVolume ?? 0) : Number(item.initialVolume || 0);
                    if (selfVol > 0) return selfVol;

                    const mLow = (item.material || "").toLowerCase();
                    const itemPeriod = (item.period || item.notes || "").trim().toLowerCase();

                    // Klaim volume Over Distance OB digabung dari akumulasi OB 1 (75%) + OB 2 (25%)
                    if (mLow.includes("ob") || mLow.includes("overburden") || mLow.includes("waste") || mLow.includes("over burden")) {
                      const obParents = allItems.filter(p => {
                        if (p.id === item.id || isDistanceItem(p)) return false;
                        const pLow = (p.material || "").toLowerCase();
                        const isOB = pLow.includes("ob") || pLow.includes("overburden") || pLow.includes("waste") || pLow.includes("over burden");
                        if (!isOB) return false;
                        if (itemPeriod) {
                          const pPeriod = (p.period || p.notes || "").trim().toLowerCase();
                          return pPeriod === itemPeriod || !pPeriod;
                        }
                        return true;
                      });
                      if (obParents.length > 0) {
                        return obParents.reduce((acc, p) => acc + (isSurvey ? Number(p.adjustedVolume ?? p.initialVolume ?? 0) : Number(p.initialVolume || 0)), 0);
                      }
                    }

                    // Klaim volume Over Distance Coal dari volume Coal Winning
                    if (mLow.includes("coal") || mLow.includes("batubara")) {
                      const coalParents = allItems.filter(p => {
                        if (p.id === item.id || isDistanceItem(p)) return false;
                        const pLow = (p.material || "").toLowerCase();
                        const isCoal = pLow.includes("coal") || pLow.includes("batubara");
                        if (!isCoal) return false;
                        if (itemPeriod) {
                          const pPeriod = (p.period || p.notes || "").trim().toLowerCase();
                          return pPeriod === itemPeriod || !pPeriod;
                        }
                        return true;
                      });
                      if (coalParents.length > 0) {
                        return coalParents.reduce((acc, p) => acc + (isSurvey ? Number(p.adjustedVolume ?? p.initialVolume ?? 0) : Number(p.initialVolume || 0)), 0);
                      }
                    }

                    const parent = allItems.find(p => {
                      if (p.id === item.id) return false;
                      if (isDistanceItem(p)) return false;
                      if (item.parentMaterial) return p.material === item.parentMaterial;
                      const pLow = (p.material || "").toLowerCase();
                      if (mLow.includes("top soil")) return pLow.includes("top soil");
                      if (mLow.includes("limonite")) return pLow.includes("limonite");
                      if (mLow.includes("saprolite")) return pLow.includes("saprolite");
                      return false;
                    });
                    if (parent) {
                      return isSurvey ? Number(parent.adjustedVolume ?? parent.initialVolume ?? 0) : Number(parent.initialVolume || 0);
                    }
                  }
                  return isSurvey ? Number(item.adjustedVolume ?? item.initialVolume ?? 0) : Number(item.initialVolume || 0);
                };

                const getBAItemSubtotal = (item: any, volume: number) => {
                  const r = Number(item.rate || 0);
                  if (item.category === "DP Fuel" || item.isDeduction || (item.material || "").toLowerCase().includes("dp fuel")) {
                    const amt = r !== 0 ? r : (item.subtotalInitial ? Number(item.subtotalInitial) : 0);
                    const vol = volume > 0 ? volume : 1;
                    return -Math.abs(vol === 1 ? amt : vol * amt);
                  }
                  if (isDistanceItem(item)) {
                    const baseDist = getBaseDistance(item);
                    const dist = Number(item.distanceWeightAvg ?? baseDist);
                    // Untuk overhaul jika di bawah base (1.000m OB / 3.000m Coal) dianggap 0
                    const diffMtr = Math.max(0, dist - baseDist);
                    const isPer100m = isCustomerDBK || (item.unit || "").includes("100") || (item.material || "").includes("100m") || (item.material || "").toUpperCase().includes("PIT SAPAN") || (item.material || "").toUpperCase().includes("OVERHAUL COAL");
                    if (isPer100m) {
                      const diff100m = diffMtr / 100;
                      return Math.round(volume * diff100m * r);
                    }
                    const diffKm = diffMtr / 1000;
                    return Math.round(volume * diffKm * r);
                  }
                  return Math.round(volume * r);
                };

                const sumInitial = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, false)), 0);
                const sumAdjusted = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, true)), 0);
                const deltaAmount = sumAdjusted - sumInitial;

                return (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* KOLOM KIRI (LEBAR ~75% / xl:col-span-9 2xl:col-span-9): Workflow Stepper, SOW Tables, Survey & Signatures */}
                    <div className="xl:col-span-9 2xl:col-span-9 space-y-4 border-b xl:border-b-0 xl:border-r border-slate-200 pb-6 xl:pb-0 xl:pr-6">
                      
                      {/* Stepper Navigation Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setActiveBAStep(1)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition cursor-pointer ${activeBAStep === 1 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <Layers size={13} />
                          <span>1. SOW Operasi & Volume</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveBAStep(2)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition cursor-pointer ${activeBAStep === 2 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <Calculator size={13} />
                          <span>2. Survey & Delta BA</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveBAStep(3)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition cursor-pointer ${activeBAStep === 3 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <UserCheck size={13} />
                          <span>3. Tanda Tangan & Final</span>
                        </button>
                      </div>

                      {/* Header Info Strip: Customer, Periode, PIC */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        {isInlineEditingBA ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                Customer / Project <span className="text-rose-600">*</span>
                              </label>
                              <select
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold focus:border-cyan-700 outline-none"
                                value={formData.customerCode || ""}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  const isBGG = code === "BGG" || code === "PT BGG";
                                  const isDBK = code === "PTRO" || code === "DBK";
                                  const isSBS = code === "SBS";
                                  const currentPeriod = formData.workPeriod || "Agustus 2026";
                                  setFormData({ ...formData, customerCode: code });
                                  if (isBGG) {
                                    setBaOperatingItems([
                                      { id: `bgg_ob1_${Date.now()}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 1 (75%)", period: currentPeriod, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 29500, subtotalInitial: 0, subtotalAdjusted: 0 },
                                      { id: `bgg_ob2_${Date.now() + 1}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 2 (25%)", period: currentPeriod, notes: "", keterangan: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 28750, subtotalInitial: 0, subtotalAdjusted: 0 },
                                      { id: `bgg_cw_${Date.now() + 2}`, category: "Operating & Mining", area: "", material: "Coal Winning", period: currentPeriod, notes: "", keterangan: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: 17500, subtotalInitial: 0, subtotalAdjusted: 0 },
                                      { id: `bgg_od_ob_${Date.now() + 3}`, category: "Over Distance", area: "", material: "Over Distance For OB Removal", period: currentPeriod, notes: "", keterangan: "", unit: "BCM", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 1550, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
                                      { id: `bgg_od_cw_${Date.now() + 4}`, category: "Over Distance", area: "", material: "Over Distance For Coal Winning", period: currentPeriod, notes: "", keterangan: "", unit: "Ton", distanceBasis: 1000, distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 19700, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
                                    ]);
                                    setBaMDOItems([]);
                                    setBaDeductionItems([]);
                                  } else if (isDBK) {
                                    setBaOperatingItems((defaultDBKBAItems || []).map((it: any) => ({ ...it, period: currentPeriod, notes: "", keterangan: "" })));
                                    setBaMDOItems([]);
                                    setBaDeductionItems([]);
                                  } else if (isSBS) {
                                    setBaOperatingItems((defaultSBSBAOperatingItems || []).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, period: currentPeriod, notes: "", keterangan: "" })));
                                    setBaMDOItems((defaultSBSBAMDOItems || []).map((it: any) => ({ ...it, initialVolume: 0, adjustedVolume: 0, period: currentPeriod, notes: "", keterangan: "" })));
                                    setBaDeductionItems((defaultSBSBADeductionItems || []).map((it: any) => ({ ...it, initialVolume: 1, adjustedVolume: 1, rate: 0, period: currentPeriod, notes: "", keterangan: "", material: it.material === "Denda ketidakcapaian Volume" ? `Denda ketidakcapaian Volume ${currentPeriod}` : it.material })));
                                  } else {
                                    setBaOperatingItems(defaultPOSBAOperatingItems.map(it => ({ ...it, area: "", period: currentPeriod, notes: "", keterangan: "" })));
                                    setBaMDOItems(defaultPOSBAMDOItems.map(it => ({ ...it, area: "", period: currentPeriod, notes: "", keterangan: "" })));
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
                                  setFormData({ ...formData, workPeriod: val });
                                  setBaOperatingItems(prev => prev.map(it => ({ ...it, period: val })));
                                  setBaMDOItems(prev => prev.map(it => ({ ...it, period: val })));
                                  setBaDeductionItems(prev => (prev || []).map(it => ({ ...it, period: val, material: (it.material || "").startsWith("Denda ketidakcapaian Volume") ? `Denda ketidakcapaian Volume ${val}` : it.material })));
                                }}
                                format="long"
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                PIC Site AAP
                              </label>
                              <input
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none font-bold"
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

                      {/* Commercial Engine Status Badge */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {(formData.customerCode === "POS" || formData.customerCode === "IBP" || formData.customerCode === "BBA" || !formData.customerCode || isCustomerDBK) && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-50 border border-cyan-300 rounded-xl text-cyan-950 font-bold">
                            <DollarSign size={13} className="text-cyan-700" />
                            <span>Kurs BI M-Rate: <strong>Rp {formatThousand(latestKursBI || 17923.30)} / USD</strong> (Live Pricing Engine Sync)</span>
                          </div>
                        )}
                        {isCustomerSBS && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 font-bold">
                            <CheckCircle2 size={13} className="text-emerald-700" />
                            <span>Komersial SBS: <strong>8 OB Disposal + 7 Rental Alat + 4 Pengurang Biaya (IDR Tetap)</strong></span>
                          </div>
                        )}
                      </div>

                      {/* STEP 1: SOW Operasional & MDO */}
                      {activeBAStep === 1 && (
                        <div className="space-y-4">
                          {/* Tabel 1: Operating & Mining */}
                          <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-cyan-900 flex items-center gap-1.5">
                                  <Pickaxe size={14} className="text-cyan-700" /> {isCustomerBGG ? "Kategori: Penambangan Batubara & OB Removal (BGG)" : isCustomerSBS ? "Kategori 1: Operating & Mining (OB Removal)" : "Kategori 1: Operating & Mining"}
                                </span>
                                <div className="flex items-center gap-2">
                                  {isInlineEditingBA && (
                                    <div className="relative inline-block text-left">
                                      <button
                                        type="button"
                                        onClick={() => setShowAddRowDropdown(!showAddRowDropdown)}
                                        className="text-[11px] font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-cyan-300 shadow-2xs"
                                      >
                                        <Plus size={13} />
                                        <span>Tambah Baris</span>
                                        <ChevronDown size={12} className={`transition-transform duration-200 ${showAddRowDropdown ? "rotate-180" : ""}`} />
                                      </button>

                                    {showAddRowDropdown && (
                                      <div 
                                        className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100"
                                        onMouseLeave={() => setShowAddRowDropdown(false)}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBaOperatingItems([...baOperatingItems, {
                                              id: `op_${Date.now()}`,
                                              category: "Operating & Mining",
                                              area: isCustomerBGG ? "Pit KKL" : "WM1",
                                              material: "",
                                              unit: "BCM",
                                              initialVolume: 0,
                                              adjustedVolume: 0,
                                              rate: 0,
                                              subtotalInitial: 0,
                                              subtotalAdjusted: 0
                                            }]);
                                            setShowAddRowDropdown(false);
                                          }}
                                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-cyan-50 hover:text-cyan-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-800 shrink-0">
                                            <Pickaxe size={13} />
                                          </div>
                                          <div>
                                            <div className="font-bold">Variabel Material</div>
                                            <div className="text-[10px] text-slate-500 font-normal">Volume Produksi Batubara / OB / Tanah</div>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBaOperatingItems([...baOperatingItems, {
                                              id: `dist_${Date.now()}`,
                                              category: "Over Distance",
                                              area: isCustomerBGG ? "Pit KKL" : "WM1",
                                              material: "",
                                              unit: isCustomerBGG ? "Bcm.Hm" : "BCM",
                                              parentMaterial: "",
                                              distanceWeightAvg: isCustomerBGG ? 0 : 1000,
                                              initialVolume: 0,
                                              adjustedVolume: 0,
                                              rate: 0,
                                              isDistanceVar: true,
                                              subtotalInitial: 0,
                                              subtotalAdjusted: 0
                                            }]);
                                            setShowAddRowDropdown(false);
                                          }}
                                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-amber-50 hover:text-amber-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                                            <Layers size={13} />
                                          </div>
                                          <div>
                                            <div className="font-bold">Variabel Distance</div>
                                            <div className="text-[10px] text-slate-500 font-normal">Jarak Hauling & Over/Underhaul</div>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const curPer = formData.workPeriod || "Agustus 2026";
                                            setBaOperatingItems([...baOperatingItems, {
                                              id: `dp_fuel_${Date.now()}`,
                                              category: "DP Fuel",
                                              area: "",
                                              material: "DP Fuel & Transport (Pengurang Solar BGG)",
                                              period: curPer,
                                              notes: "Uang Muka / Budget Solar BGG",
                                              unit: "Lot",
                                              initialVolume: 1,
                                              adjustedVolume: 1,
                                              rate: 0,
                                              isDeduction: true,
                                              subtotalInitial: 0,
                                              subtotalAdjusted: 0
                                            }]);
                                            setShowAddRowDropdown(false);
                                          }}
                                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-rose-50 hover:text-rose-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-800 shrink-0">
                                            <Fuel size={13} />
                                          </div>
                                          <div>
                                            <div className="font-bold text-rose-900">+ DP Fuel & Transport (Potongan Solar)</div>
                                            <div className="text-[10px] text-slate-500 font-normal">Input budget / uang solar BGG (Pengurang)</div>
                                          </div>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                  <tr>
                                    <th className="p-2 w-16 sm:w-20">Area / Lokasi</th>
                                    <th className="p-2 min-w-[140px]">Material / Pekerjaan (Master SOW)</th>
                                    {isCustomerBGG && <th className="p-2 w-20 text-center">Bulan</th>}
                                    <th className="p-2 text-center w-12">Satuan</th>
                                    <th className="p-2 text-right w-20 sm:w-24">Volume TC</th>
                                    {isCustomerSBS && <th className="p-2 text-right w-20 sm:w-24 text-indigo-900 bg-indigo-50/70 border-x border-indigo-200">Jarak (M)</th>}
                                    <th className="p-2 text-right w-20 sm:w-24">SOW Rate (Rp)</th>
                                    <th className="p-2 text-right w-24 sm:w-28">Subtotal (Rp)</th>
                                    {isInlineEditingBA && <th className="p-2 text-center w-7">#</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {baOperatingItems.map((item, idx) => {
                                    const isDistance = isDistanceItem(item);
                                    const isDPFuel = item.category === "DP Fuel" || item.isDeduction || (item.material || "").toLowerCase().includes("dp fuel");
                                    const effVol = getBAEffectiveVolume(item, allBAItems, false);
                                    const subtotal = getBAItemSubtotal(item, effVol);

                                    return (
                                      <tr key={item.id || idx} className={`hover:bg-slate-50/80 transition ${isDPFuel ? "bg-rose-50/30" : isDistance ? "bg-amber-50/20" : ""}`}>
                                        <td className="p-2 font-bold text-slate-800 align-top">
                                          {!isInlineEditingBA ? (
                                            <span className="pt-1 block">{item.area || (isCustomerBGG ? "Pit KKL" : "WM1")}</span>
                                          ) : (
                                            <input
                                              className="w-16 sm:w-20 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-bold focus:border-cyan-700 outline-none"
                                              value={item.area || ""}
                                              placeholder={isCustomerBGG ? "Pit KKL" : "WM1"}
                                              onChange={(e) => {
                                                const updated = [...baOperatingItems];
                                                updated[idx].area = e.target.value;
                                                setBaOperatingItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 font-medium text-slate-900 align-top">
                                          {isDPFuel ? (
                                            <div>
                                              {!isInlineEditingBA ? (
                                                <span className="font-bold text-slate-900 pt-1 block">{item.material || "DP Fuel & Transport (Pengurang Solar BGG)"}</span>
                                              ) : (
                                                <input
                                                  type="text"
                                                  className="w-full bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:border-cyan-700 outline-none"
                                                  value={item.material || ""}
                                                  placeholder="DP Fuel & Transport (Pengurang Solar BGG)"
                                                  onChange={(e) => {
                                                    const updated = [...baOperatingItems];
                                                    updated[idx].material = e.target.value;
                                                    setBaOperatingItems(updated);
                                                  }}
                                                />
                                              )}
                                            </div>
                                          ) : !isDistance ? (
                                            !isInlineEditingBA ? (
                                              <span className="font-bold text-slate-900 pt-1 block">{item.material || "-"}</span>
                                            ) : (
                                              <SOWSelectDropdown
                                                value={item.material || ""}
                                                customerCode={formData.customerCode || ""}
                                                activeSOWCatalog={activeSOWCatalog}
                                                mRate={mRate}
                                                categoryFilter="Operating & Mining"
                                                isDistanceOnly={false}
                                                onChange={(val) => {
                                                  const updated = [...baOperatingItems];
                                                  updated[idx].material = val;
                                                  setBaOperatingItems(updated);
                                                }}
                                                onSelectSow={(sow) => {
                                                  const updated = [...baOperatingItems];
                                                  updated[idx].material = sow.name;
                                                  updated[idx].unit = sow.unit;
                                                  updated[idx].rate = sow.defaultRate;
                                                  if (sow.isDistanceVar) {
                                                    updated[idx].isDistanceVar = true;
                                                  }
                                                  setBaOperatingItems(updated);
                                                }}
                                              />
                                            )
                                          ) : (
                                            <div>
                                              {!isInlineEditingBA ? (
                                                <div className="font-bold text-slate-900 pt-0.5">{item.material || "Distance / Overhaul"}</div>
                                              ) : (
                                                <div className="mb-1">
                                                  <SOWSelectDropdown
                                                    value={item.material || ""}
                                                    customerCode={formData.customerCode || ""}
                                                    activeSOWCatalog={activeSOWCatalog}
                                                    mRate={mRate}
                                                    categoryFilter="Over Distance"
                                                    isDistanceOnly={true}
                                                    onChange={(val) => {
                                                      const updated = [...baOperatingItems];
                                                      updated[idx].material = val;
                                                      setBaOperatingItems(updated);
                                                    }}
                                                    onSelectSow={(sow) => {
                                                      const updated = [...baOperatingItems];
                                                      updated[idx].material = sow.name;
                                                      updated[idx].unit = sow.unit;
                                                      updated[idx].rate = sow.defaultRate;
                                                      updated[idx].isDistanceVar = true;
                                                      setBaOperatingItems(updated);
                                                    }}
                                                  />
                                                </div>
                                              )}
                                                {(() => {
                                                  const baseDist = getBaseDistance(item);
                                                  const distVal = Number(item.distanceWeightAvg ?? baseDist);
                                                  const diffMtr = Math.max(0, distVal - baseDist);
                                                  const diffKm = diffMtr / 1000;
                                                  return (
                                                    <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-slate-700 bg-amber-50/80 border border-amber-200 px-2 py-0.5 rounded-md w-fit flex-wrap sm:flex-nowrap">
                                                      <span className="font-bold text-amber-900">Jarak (Meter):</span>
                                                      {!isInlineEditingBA ? (
                                                        <span className="font-bold text-slate-900 bg-white border border-amber-300 px-1.5 py-0.5 rounded font-mono">
                                                          {item.distanceWeightAvg !== undefined && item.distanceWeightAvg !== null && item.distanceWeightAvg !== "" ? Number(item.distanceWeightAvg).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : formatThousand(baseDist)}
                                                        </span>
                                                      ) : (
                                                        <FormattedNumberInput
                                                          allowDecimals
                                                          maxDecimals={3}
                                                          className="w-20 bg-white border border-amber-400 rounded px-1.5 py-0.5 text-right font-mono font-bold text-amber-950 text-xs focus:border-amber-600 outline-none"
                                                          value={item.distanceWeightAvg === 0 ? "" : (item.distanceWeightAvg ?? "")}
                                                          placeholder={formatThousand(baseDist)}
                                                          onChange={(val) => {
                                                            const updated = [...baOperatingItems];
                                                            updated[idx].distanceWeightAvg = val;
                                                            setBaOperatingItems(updated);
                                                          }}
                                                        />
                                                      )}
                                                      <span className="text-slate-500 font-sans text-[10px]">
                                                        mtr - {formatThousand(baseDist)} mtr = <strong className={diffMtr > 0 ? "text-emerald-700" : "text-slate-500"}>{diffMtr.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} mtr</strong>
                                                        {" "}(<span className="font-semibold">{diffKm.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 3})} Km</span>)
                                                      </span>
                                                    </div>
                                                  );
                                                })()}
                                            </div>
                                          )}
                                        </td>
                                        {isCustomerBGG && (
                                          <td className="p-2 font-medium text-slate-800 align-top text-center">
                                            {!isInlineEditingBA ? (
                                              (item.period || item.keterangan || item.notes) ? (
                                                <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[11px] font-bold text-amber-950 inline-block text-center min-w-[50px] mt-0.5 font-mono">
                                                  {item.period || item.keterangan || item.notes}
                                                </span>
                                              ) : null
                                            ) : (
                                              <MonthPickerInput
                                                value={item.period || item.keterangan || item.notes || formData.workPeriod || "Agustus 2026"}
                                                onChange={(newPeriod) => {
                                                  const updated = [...baOperatingItems];
                                                  updated[idx].period = newPeriod;
                                                  updated[idx].keterangan = newPeriod;
                                                  updated[idx].notes = newPeriod;
                                                  setBaOperatingItems(updated);
                                                }}
                                                format="short"
                                                className="w-20 sm:w-22 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded px-1 py-1 text-xs font-bold text-slate-900 text-center focus:border-cyan-700 outline-none shadow-2xs font-mono"
                                              />
                                            )}
                                          </td>
                                        )}
                                        <td className="p-2 text-center font-mono font-bold text-slate-800 align-top">
                                          {isDPFuel ? (
                                            <span className="text-slate-400 font-bold pt-1 block">-</span>
                                          ) : !isInlineEditingBA ? (
                                            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[38px] mt-0.5">
                                              {item.unit || "BCM"}
                                            </span>
                                          ) : (
                                            <input
                                              className="w-12 bg-slate-50 border border-slate-300 rounded px-1 py-1 text-xs font-mono font-bold text-center focus:border-cyan-700 outline-none"
                                              value={item.unit || ""}
                                              placeholder="BCM"
                                              onChange={(e) => {
                                                const updated = [...baOperatingItems];
                                                updated[idx].unit = e.target.value;
                                                setBaOperatingItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>

                                        {/* Volume Awal & SOW Rate */}
                                        {isDPFuel ? (
                                          <td colSpan={2} className="p-2 text-right font-mono align-top">
                                            {!isInlineEditingBA ? (
                                              <span className="font-bold text-slate-900 pt-1 block">{item.rate ? formatThousand(item.rate) : "0"}</span>
                                            ) : (
                                              <div className="flex justify-end pt-0.5">
                                                <FormattedNumberInput
                                                  className="w-36 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                                                  value={item.rate}
                                                  placeholder="0"
                                                  onChange={(num) => {
                                                    const updated = [...baOperatingItems];
                                                    updated[idx].rate = num;
                                                    updated[idx].initialVolume = 1;
                                                    updated[idx].adjustedVolume = 1;
                                                    updated[idx].subtotalInitial = -num;
                                                    updated[idx].subtotalAdjusted = -num;
                                                    setBaOperatingItems(updated);
                                                  }}
                                                />
                                              </div>
                                            )}
                                          </td>
                                        ) : (
                                          <>
                                            <td className="p-2 text-right font-mono align-top">
                                              {!isDistance ? (
                                                !isInlineEditingBA ? (
                                                  <span className="font-bold text-slate-900 pt-1 block">{item.initialVolume ? Number(item.initialVolume).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : "0,000"}</span>
                                                ) : (
                                                  <FormattedNumberInput
                                                    allowDecimals
                                                    maxDecimals={3}
                                                    className="w-20 sm:w-24 bg-white border border-slate-300 rounded px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                                    value={item.initialVolume ? item.initialVolume : ""}
                                                    placeholder="0,000"
                                                    onChange={(val) => {
                                                      const updated = [...baOperatingItems];
                                                      updated[idx].initialVolume = val;
                                                      updated[idx].adjustedVolume = val;
                                                      setBaOperatingItems(updated);
                                                    }}
                                                  />
                                                )
                                              ) : (
                                                <div className="flex flex-col items-end pt-0.5">
                                                  <div className="px-2 py-0.5 bg-amber-50/90 border border-amber-300 rounded font-mono font-black text-amber-950 text-xs shadow-2xs">
                                                    {effVol.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                                  </div>
                                                  <span className="text-[9px] text-amber-800 font-semibold italic mt-0.5 whitespace-nowrap">
                                                    Auto-sync {item.parentMaterial ? item.parentMaterial.replace("Volume ", "") : "Produksi"}
                                                  </span>
                                                </div>
                                              )}
                                            </td>
                                              {isCustomerSBS && (
                                                <td className="p-2 text-right font-mono align-top bg-indigo-50/30 border-x border-indigo-100">
                                                  {!isInlineEditingBA ? (
                                                    <div className="pt-1">
                                                      <span className="font-bold text-slate-900 font-mono">{item.distance ? formatThousand(item.distance) : "-"}</span>
                                                      {(() => {
                                                        const lookup = getSBSTarifByDistance(Number(item.distance || 0));
                                                        return lookup.tier ? (
                                                          <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-100/80 px-1 py-0.2 rounded ml-1">
                                                            {lookup.tier.rangeLabel}m
                                                          </span>
                                                        ) : null;
                                                      })()}
                                                    </div>
                                                  ) : (
                                                    <div className="flex flex-col items-end">
                                                      <FormattedNumberInput
                                                        allowDecimals
                                                        maxDecimals={3}
                                                        className="w-20 sm:w-24 bg-white border border-indigo-300 rounded px-1.5 py-1 text-right font-mono font-bold text-xs text-indigo-950 focus:border-indigo-600 outline-none"
                                                        value={item.distance === 0 ? "" : (item.distance ?? "")}
                                                        placeholder="0"
                                                        onChange={(distVal) => {
                                                          const updated = [...baOperatingItems];
                                                          updated[idx].distance = distVal;
                                                          const lookup = getSBSTarifByDistance(distVal);
                                                          if (lookup.rate > 0) {
                                                            updated[idx].rate = lookup.rate;
                                                          }
                                                          const vInit = Number(updated[idx].initialVolume || 0);
                                                          const vAdj = Number(updated[idx].adjustedVolume ?? updated[idx].initialVolume ?? 0);
                                                          const r = Number(updated[idx].rate || 0);
                                                          updated[idx].subtotalInitial = Math.round(vInit * r);
                                                          updated[idx].subtotalAdjusted = Math.round(vAdj * r);
                                                          setBaOperatingItems(updated);
                                                        }}
                                                      />
                                                      {(() => {
                                                        const lookup = getSBSTarifByDistance(Number(item.distance || 0));
                                                        return lookup.tier ? (
                                                          <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-100/70 px-1 py-0.2 rounded mt-0.5 whitespace-nowrap">
                                                            {lookup.tier.rangeLabel}m
                                                          </span>
                                                        ) : null;
                                                      })()}
                                                    </div>
                                                  )}
                                                </td>
                                              )}
                                            <td className="p-2 text-right font-mono align-top">
                                                {!isInlineEditingBA ? (
                                                  <span className="pt-1 block">{formatIDR(item.rate || 0)}</span>
                                                ) : (
                                                  <FormattedNumberInput
                                                    allowDecimals
                                                    maxDecimals={3}
                                                    className="w-20 sm:w-24 bg-slate-50 hover:bg-white border border-slate-300 rounded px-1.5 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                                    value={item.rate === 0 ? "" : (item.rate ?? "")}
                                                    placeholder="0"
                                                    onChange={(val) => {
                                                      const updated = [...baOperatingItems];
                                                      updated[idx].rate = val;
                                                      const vInit = Number(updated[idx].initialVolume || 0);
                                                      const vAdj = Number(updated[idx].adjustedVolume ?? updated[idx].initialVolume ?? 0);
                                                      updated[idx].subtotalInitial = Math.round(vInit * val);
                                                      updated[idx].subtotalAdjusted = Math.round(vAdj * val);
                                                      setBaOperatingItems(updated);
                                                    }}
                                                  />
                                                )}
                                              </td>
                                          </>
                                        )}

                                        <td className="p-2 text-right font-mono font-extrabold align-top">
                                          <div className={`pt-1 ${subtotal < 0 ? "text-rose-700 font-black" : "text-slate-900"}`}>{formatIDR(subtotal)}</div>
                                        </td>
                                        {isInlineEditingBA && (
                                          <td className="p-2 text-center align-top">
                                            <div className="pt-0.5">
                                              <button
                                                type="button"
                                                onClick={() => setBaOperatingItems(baOperatingItems.filter((_, i) => i !== idx))}
                                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Tabel 2: MDO / Jasa Penunjang Produksi (POS & SBS) */}
                          {(isCustomerPOS || isCustomerSBS) && (
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5">
                                  <Building2 size={14} className="text-indigo-700" />
                                  {isCustomerSBS
                                    ? "Kategori 2: Jasa Penunjang Produksi (Rental Alat)"
                                    : "Kategori 2: Mine Development Operation (MDO)"}
                                </span>
                                {isInlineEditingBA && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const defItem = isCustomerSBS
                                        ? (activeSOWCatalog.find(s => s.category === "Penunjang" || s.unit === "Hours") || { name: "Bulldozer DZ709", unit: "Hours", defaultRate: 1980000 })
                                        : (activeSOWCatalog.find(s => s.category === "MDO") || activeSOWCatalog[activeSOWCatalog.length - 1]);
                                      setBaMDOItems([...baMDOItems, {
                                        id: `${isCustomerSBS ? "rent" : "mdo"}_${Date.now()}`,
                                        category: isCustomerSBS ? "Penunjang" : "MDO",
                                        area: isCustomerSBS ? "Pit E" : "Site POS",
                                        material: defItem.name,
                                        unit: defItem.unit || (isCustomerSBS ? "Hours" : "Ha"),
                                        initialVolume: 0,
                                        adjustedVolume: 0,
                                        rate: defItem.defaultRate || 0,
                                        subtotalInitial: 0,
                                        subtotalAdjusted: 0
                                      }]);
                                    }}
                                    className="text-[11px] font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Plus size={13} /> {isCustomerSBS ? "Tambah Baris Alat" : "Tambah Baris MDO"}
                                  </button>
                                )}
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                    <tr>
                                      <th className="p-2">Area / Lokasi</th>
                                      <th className="p-2 min-w-[180px]">
                                        {isCustomerSBS ? "Peralatan / Unit (Master SOW)" : "Material / Pekerjaan MDO (Master SOW)"}
                                      </th>
                                      <th className="p-2 text-center">Satuan</th>
                                      <th className="p-2 text-right">{isCustomerSBS ? "Volume Awal (Jam)" : "Volume Awal"}</th>
                                      <th className="p-2 text-right">SOW Rate (Rp)</th>
                                      <th className="p-2 text-right">Subtotal (Rp)</th>
                                      {isInlineEditingBA && <th className="p-2 text-center">#</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {baMDOItems.map((item, idx) => (
                                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                                        <td className="p-2 font-bold text-slate-800">
                                          {!isInlineEditingBA ? (item.area || (isCustomerSBS ? "Pit E" : "Site POS")) : (
                                            <input
                                              className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-cyan-700 outline-none"
                                              value={item.area || ""}
                                              placeholder={isCustomerSBS ? "Pit E" : "Site POS"}
                                              onChange={(e) => {
                                                const updated = [...baMDOItems];
                                                updated[idx].area = e.target.value;
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 font-medium text-slate-900">
                                          {!isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900">{item.material}</span>
                                          ) : (
                                            <SOWSelectDropdown
                                              className="w-full bg-indigo-50/60 hover:bg-indigo-50 focus:bg-white border border-indigo-300 focus:border-indigo-700 rounded px-2 py-1 text-xs font-bold text-slate-900 outline-none transition cursor-pointer"
                                              value={item.material || ""}
                                              customerCode={formData.customerCode || ""}
                                              activeSOWCatalog={activeSOWCatalog}
                                              mRate={mRate}
                                              categoryFilter={isCustomerSBS ? "Penunjang" : "MDO"}
                                              isDistanceOnly={false}
                                              onChange={(val) => {
                                                const updated = [...baMDOItems];
                                                updated[idx].material = val;
                                                setBaMDOItems(updated);
                                              }}
                                              onSelectSow={(sow) => {
                                                const updated = [...baMDOItems];
                                                updated[idx].material = sow.name;
                                                updated[idx].unit = sow.unit;
                                                updated[idx].rate = sow.defaultRate;
                                                const vol = Number(updated[idx].initialVolume || 0);
                                                const r = Number(sow.defaultRate || 0);
                                                updated[idx].subtotalInitial = Math.round(vol * r);
                                                updated[idx].subtotalAdjusted = Math.round(Number(updated[idx].adjustedVolume || vol) * r);
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                         </td>
                                        <td className="p-2 text-center font-mono font-bold text-slate-800">
                                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px]">
                                            {item.unit || (isCustomerSBS ? "Hours" : "Ha")}
                                          </span>
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                          {!isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900">{item.initialVolume ? Number(item.initialVolume).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : "0"}</span>
                                          ) : (
                                            <FormattedNumberInput
                                              allowDecimals
                                              maxDecimals={3}
                                              className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.initialVolume ? item.initialVolume : ""}
                                              placeholder="0,000"
                                              onChange={(val) => {
                                                const updated = [...baMDOItems];
                                                updated[idx].initialVolume = val;
                                                updated[idx].adjustedVolume = val;
                                                const r = Number(updated[idx].rate || 0);
                                                updated[idx].subtotalInitial = Math.round(val * r);
                                                updated[idx].subtotalAdjusted = Math.round(val * r);
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                          {!isInlineEditingBA ? (
                                            <span>{formatIDR(item.rate || 0)}</span>
                                          ) : (
                                            <FormattedNumberInput
                                              allowDecimals
                                              maxDecimals={3}
                                              className="w-24 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.rate === 0 ? "" : (item.rate ?? "")}
                                              placeholder="0"
                                              onChange={(r) => {
                                                const updated = [...baMDOItems];
                                                updated[idx].rate = r;
                                                const vol = Number(updated[idx].initialVolume || 0);
                                                updated[idx].subtotalInitial = Math.round(vol * r);
                                                updated[idx].subtotalAdjusted = Math.round(Number(updated[idx].adjustedVolume || vol) * r);
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 text-right font-mono font-extrabold text-emerald-800">
                                          {formatIDR(Math.round((Number(item.initialVolume) || 0) * (Number(item.rate) || 0)))}
                                        </td>
                                        {isInlineEditingBA && (
                                          <td className="p-2 text-center">
                                            <button
                                              type="button"
                                              onClick={() => setBaMDOItems(baMDOItems.filter((_, i) => i !== idx))}
                                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                    {baMDOItems.length === 0 && (
                                      <tr>
                                        <td colSpan={isInlineEditingBA ? 7 : 6} className="p-4 text-center text-slate-400 bg-slate-50 italic">
                                          Belum ada data alat berat / jasa penunjang.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Tabel 3: Pengurang Biaya (SBS Only) */}
                          {isCustomerSBS && (
                            <div className="space-y-2 mt-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5">
                                  <TrendingDown size={14} className="text-rose-700" /> Kategori 3: Pengurang Biaya (Denda & BBM SBS)
                                </span>
                                {isInlineEditingBA && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newDed = {
                                        id: `sbs_ded_${Date.now()}`,
                                        category: "Pengurang Biaya",
                                        area: "Pit E",
                                        material: "",
                                        unit: "Lot",
                                        initialVolume: 1,
                                        adjustedVolume: 1,
                                        rate: 0,
                                        isDeduction: true,
                                        subtotalInitial: 0,
                                        subtotalAdjusted: 0,
                                        notes: "",
                                        keterangan: "",
                                        period: formData.workPeriod || "Agustus 2026"
                                      };
                                      setBaDeductionItems([...(baDeductionItems || []), newDed]);
                                    }}
                                    className="text-[11px] font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer border border-rose-200"
                                  >
                                    <Plus size={12} />
                                    <span>Tambah Pengurang Biaya</span>
                                  </button>
                                )}
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-rose-200 bg-white shadow-2xs">
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-rose-100/70 text-rose-900 text-[10px] font-black uppercase tracking-wider border-b border-rose-200">
                                      <th className="p-2 text-center w-10">No</th>
                                      <th className="p-2 min-w-[220px]">Deskripsi Pengurang Biaya (Master SOW)</th>
                                      <th className="p-2 min-w-[160px]">Keterangan</th>
                                      <th className="p-2 text-center w-20">Satuan</th>
                                      <th className="p-2 text-right w-36">Nilai Potongan (Rp)</th>
                                      <th className="p-2 text-right w-36">Subtotal (Rp)</th>
                                      {isInlineEditingBA && <th className="p-2 text-center w-10">#</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-rose-100">
                                    {(baDeductionItems || []).map((item: any, idx: number) => (
                                      <tr key={item.id || idx} className="hover:bg-rose-50/40 transition">
                                        <td className="p-2 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                                        <td className="p-2">
                                          {!isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900">{item.material}</span>
                                          ) : (
                                            <SOWSelectDropdown
                                              value={item.material || ""}
                                              customerCode="SBS"
                                              activeSOWCatalog={activeSOWCatalog}
                                              categoryFilter="Pengurang Biaya"
                                              className="w-full bg-rose-50/60 hover:bg-rose-50 focus:bg-white border border-rose-300 focus:border-rose-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none transition cursor-pointer"
                                              onChange={(val) => {
                                                const updated = [...(baDeductionItems || [])];
                                                updated[idx].material = val;
                                                setBaDeductionItems(updated);
                                              }}
                                              onSelectSow={(sow) => {
                                                const updated = [...(baDeductionItems || [])];
                                                updated[idx].material = sow.name;
                                                updated[idx].unit = sow.unit || "Lot";
                                                setBaDeductionItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2">
                                          {!isInlineEditingBA ? (
                                            <span className="text-slate-600 font-medium">{item.keterangan || item.notes || "-"}</span>
                                          ) : (
                                            <input
                                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-medium focus:border-rose-600 outline-none"
                                              placeholder="Catatan..."
                                              value={item.keterangan || item.notes || ""}
                                              onChange={(e) => {
                                                const updated = [...(baDeductionItems || [])];
                                                updated[idx].keterangan = e.target.value;
                                                updated[idx].notes = e.target.value;
                                                setBaDeductionItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 text-center font-mono font-bold text-slate-800">
                                          <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded text-xs inline-block text-center min-w-[45px]">
                                            {item.unit || "Lot"}
                                          </span>
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                          {!isInlineEditingBA ? (
                                            <span className="font-extrabold text-rose-700">({formatIDR(Math.abs(item.rate || 0))})</span>
                                          ) : (
                                            <FormattedNumberInput
                                              allowDecimals
                                              maxDecimals={3}
                                              className="w-32 bg-white border border-rose-300 rounded px-2 py-1 text-right font-mono font-bold text-xs text-rose-900 focus:border-rose-700 outline-none"
                                              value={item.rate === 0 ? "" : Math.abs(item.rate ?? 0)}
                                              placeholder="0"
                                              onChange={(r) => {
                                                const updated = [...(baDeductionItems || [])];
                                                const absVal = Math.abs(r);
                                                updated[idx].rate = absVal;
                                                updated[idx].initialVolume = 1;
                                                updated[idx].adjustedVolume = 1;
                                                updated[idx].subtotalInitial = -absVal;
                                                updated[idx].subtotalAdjusted = -absVal;
                                                setBaDeductionItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 text-right font-mono font-extrabold text-rose-700">
                                          ({formatIDR(Math.abs(Number(item.rate) || 0))})
                                        </td>
                                        {isInlineEditingBA && (
                                          <td className="p-2 text-center">
                                            <button
                                              type="button"
                                              onClick={() => setBaDeductionItems(baDeductionItems.filter((_: any, i: number) => i !== idx))}
                                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                    {(!baDeductionItems || baDeductionItems.length === 0) && (
                                      <tr>
                                        <td colSpan={isInlineEditingBA ? 7 : 6} className="p-4 text-center text-slate-400 bg-rose-50/20 italic">
                                          Tidak ada pengurang pembayaran / denda.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Estimasi Unbilled Revenue Box */}
                          <div className="bg-gradient-to-r from-[#4E2F16] via-[#613B1C] to-[#7A4B24] text-amber-100 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border border-[#8B5A2B]/50 shadow-md">
                            <div>
                              <div className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">
                                Estimasi Nilai Pengakuan Awal (Unbilled Revenue):
                              </div>
                              <div className="text-[10px] text-amber-100/80 font-medium">
                                Akun: (Dr) 11300 Pendapatan Belum Ditagih / (Cr) 41100 Pendapatan Operasional
                              </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                              {formatIDR(sumInitial)}
                            </div>
                          </div>

                          {/* Navigation Buttons */}
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(2)}
                              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                            >
                              <span>Lanjut ke Step 2 (Hasil Survey & Draft BA)</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                    {/* STEP 2: Survey Lapangan & Delta Selisih (UNIFIED FOR POS & BGG) */}
                    {activeBAStep === 2 && (
                      <div className="space-y-4">
                        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-cyan-950">
                          <Calculator className="text-cyan-700 shrink-0 mt-0.5" size={16} />
                          <div>
                            <strong>Step 2 — Penyesuaian Hasil Joint Survey Lapangan:</strong> Masukkan volume hasil joint visit / survey bersama client. Volume pada variabel distance otomatis tersinkronisasi dan sistem menghitung <strong>Delta Selisih</strong> (+/-) secara live.
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                            <table className="w-full text-xs text-left min-w-[780px]">
                              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                <tr>
                                  <th className="p-2.5 min-w-[240px]">Material / Pekerjaan</th>
                                  <th className="p-2.5 text-center w-20">Satuan</th>
                                  <th className="p-2.5 text-right w-28">Volume TC</th>
                                  <th className="p-2.5 text-right w-32">Vol Hasil Survey</th>
                                  <th className="p-2.5 text-right w-28">Rate SOW (Rp)</th>
                                  <th className="p-2.5 text-right w-32">Subtotal Baru (Rp)</th>
                                  <th className="p-2.5 text-right w-32">Delta (+/- Rp)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {allBAItems.map((item, idx) => {
                                  const isDistance = isDistanceItem(item);
                                  const isDPFuel = item.category === "DP Fuel" || item.isDeduction || (item.material || "").toLowerCase().includes("dp fuel");
                                  const volAwal = getBAEffectiveVolume(item, allBAItems, false);
                                  const volAdj = getBAEffectiveVolume(item, allBAItems, true);
                                  const r = Number(item.rate || 0);
                                  const subAwal = getBAItemSubtotal(item, volAwal);
                                  const subAdj = getBAItemSubtotal(item, volAdj);
                                  const delta = subAdj - subAwal;
                                  const isOp = item.category === "Operating & Mining" || item.category === "Over Distance";

                                  return (
                                    <tr key={item.id || idx} className={`hover:bg-slate-50/80 transition ${isDPFuel ? "bg-slate-50/40" : isDistance ? "bg-amber-50/20" : ""}`}>
                                      <td className="p-2.5 font-bold text-slate-900 align-top">
                                        <div className="flex items-center gap-1.5">
                                          <span>{item.material || "-"}</span>
                                          {!isDPFuel && (item.keterangan || item.notes) && (
                                            <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-900 border border-cyan-300 rounded text-[10px] font-black">
                                              {item.keterangan || item.notes}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                          {item.category} • {item.area || (isCustomerBGG ? "Pit KKL" : "WM1")}
                                          {isDistance && (
                                            <span className="text-cyan-800 font-mono ml-1 font-bold">
                                              (Dist: {item.distanceWeightAvg || 0} {item.unit === "Bcm.Hm" ? "Hm" : "m"})
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-2.5 text-center font-mono font-bold text-slate-700 align-top">
                                        {isDPFuel ? (
                                          <span className="text-slate-400 font-bold pt-1 block">-</span>
                                        ) : (
                                          <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px] mt-0.5">
                                            {item.unit || "BCM"}
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-slate-600 align-top">
                                         <span className="pt-1 block">{isDPFuel ? "-" : volAwal.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                                       </td>
                                       <td className="p-2.5 text-right font-mono align-top">
                                         {isDPFuel ? (
                                           <span className="pt-1 block text-slate-400 font-mono">-</span>
                                         ) : !isDistance ? (
                                           !isInlineEditingBA ? (
                                             <span className="font-bold text-slate-900 pt-1 block">{volAdj.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                                           ) : (
                                             <FormattedNumberInput
                                               allowDecimals
                                               maxDecimals={3}
                                               className="w-24 bg-cyan-50 border border-cyan-300 rounded px-2 py-1 text-right font-mono font-bold text-xs text-cyan-950 focus:border-cyan-700 outline-none"
                                               value={item.adjustedVolume !== undefined ? item.adjustedVolume : ""}
                                               placeholder="0,000"
                                               onChange={(val) => {
                                                 if (item.isDeduction || item.category === "Pengurang Biaya") {
                                                   const deds = [...(baDeductionItems || [])];
                                                   const dIdx = deds.findIndex(d => d.id === item.id);
                                                   if (dIdx >= 0) {
                                                     deds[dIdx].adjustedVolume = val;
                                                     setBaDeductionItems(deds);
                                                   }
                                                 } else if (isOp) {
                                                   const ops = [...baOperatingItems];
                                                   const opIdx = ops.findIndex(o => o.id === item.id);
                                                   if (opIdx >= 0) {
                                                     ops[opIdx].adjustedVolume = val;
                                                     setBaOperatingItems(ops);
                                                   }
                                                 } else {
                                                   const mdos = [...baMDOItems];
                                                   const mIdx = mdos.findIndex(m => m.id === item.id);
                                                   if (mIdx >= 0) {
                                                     mdos[mIdx].adjustedVolume = val;
                                                     setBaMDOItems(mdos);
                                                   }
                                                 }
                                               }}
                                             />
                                           )
                                         ) : (
                                           <div className="flex flex-col items-end pt-0.5">
                                             <span className="font-mono font-bold text-amber-950 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded text-xs shadow-2xs">
                                               {volAdj.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                             </span>
                                            <span className="text-[9px] text-amber-800 font-semibold italic mt-0.5 whitespace-nowrap">
                                              Auto-sync survey
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-slate-700 align-top">
                                        <span className="pt-1 block font-mono text-slate-800">{isDPFuel ? (r ? formatThousand(r) : "0") : formatIDR(r)}</span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 align-top">
                                        <div className="pt-1">{formatIDR(subAdj)}</div>
                                      </td>
                                      <td className={`p-2.5 text-right font-mono font-black align-top ${delta >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                        <div className="pt-1">{delta >= 0 ? `+${formatIDR(delta)}` : `-${formatIDR(Math.abs(delta))}`}</div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Delta Summary Box */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Awal (Site)</span>
                              <span className="text-sm font-black font-mono text-slate-800">{formatIDR(sumInitial)}</span>
                            </div>
                            <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                              <span className="text-[10px] font-bold uppercase text-cyan-800 block">Total Survey Bersama</span>
                              <span className="text-sm font-black font-mono text-cyan-950">{formatIDR(sumAdjusted)}</span>
                            </div>
                            <div className={`p-3 rounded-xl border ${deltaAmount >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300"}`}>
                              <span className={`text-[10px] font-bold uppercase block ${deltaAmount >= 0 ? "text-emerald-800" : "text-rose-800"}`}>Delta Selisih Survey</span>
                              <span className={`text-sm font-black font-mono ${deltaAmount >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
                                {deltaAmount >= 0 ? `+${formatIDR(deltaAmount)}` : `-${formatIDR(Math.abs(deltaAmount))}`}
                              </span>
                            </div>
                          </div>

                          {/* Upload Draft BA PDF */}
                          {isInlineEditingBA && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                  <Upload size={14} className="text-cyan-700" /> Upload Berkas Draft BA Joint Survey (PDF)
                                </label>
                                {formData.draftBAPath && (
                                  <a
                                    href={resolveDocumentUrl(formData.draftBAPath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-cyan-700 hover:text-cyan-900 font-bold inline-flex items-center gap-1 underline"
                                  >
                                    <ExternalLink size={11} /> Buka Draft PDF
                                  </a>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="application/pdf"
                                className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-700 file:text-white hover:file:bg-cyan-800 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, "draftBAPath")}
                              />
                            </div>
                          )}

                          {/* Navigation Buttons */}
                          <div className="flex justify-between items-center pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(1)}
                              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition text-xs cursor-pointer"
                            >
                              Kembali ke Step 1
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(3)}
                              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                            >
                              <span>Lanjut ke Step 3 (Tanda Tangan & Final)</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: Tanda Tangan & Finalisasi Berita Acara */}
                      {activeBAStep === 3 && (
                        <div className="space-y-4">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-950">
                            <UserCheck className="text-emerald-700 shrink-0 mt-0.5" size={16} />
                            <div>
                              <strong>Step 3 — Verifikasi & Final Signed BA:</strong> Verifikasi internal oleh Finance Specialist. Approval FATB Manager akan diproses saat Invoice digenerate oleh Finance site.
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                No. BA Resmi Customer <span className="text-rose-600">*</span>
                              </label>
                              {!isInlineEditingBA ? (
                                <div className="p-2 bg-white border border-slate-200 rounded font-mono font-bold text-xs text-slate-900">
                                  {formData.signedBANumber || formData.baNumber || "052/BA-POS-NIKEL/VII/2026"}
                                </div>
                              ) : (
                                <input
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold text-xs focus:border-emerald-700 outline-none"
                                  placeholder="052/BA-POS-NIKEL/VII/2026"
                                  value={formData.signedBANumber || formData.baNumber || ""}
                                  onChange={(e) => setFormData({ ...formData, signedBANumber: e.target.value, baNumber: e.target.value })}
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Tanggal Ditandatangani Customer
                              </label>
                              {!isInlineEditingBA ? (
                                <div className="p-2 bg-white border border-slate-200 rounded text-xs text-slate-900 font-bold">
                                  {formData.baSignedDate ? new Date(formData.baSignedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                                </div>
                              ) : (
                                <input
                                  type="date"
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-emerald-700 outline-none"
                                  value={formData.baSignedDate || ""}
                                  onChange={(e) => setFormData({ ...formData, baSignedDate: e.target.value })}
                                />
                              )}
                            </div>
                          </div>

                          {/* Single Verifikator Card: Finance Specialist */}
                          <div className="pt-1">
                            <div className={`p-4 rounded-xl border shadow-xs text-center space-y-2.5 transition ${formData.verifiedBy ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-200"}`}>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Verifikator: Finance Specialist</span>
                                {formData.verifiedBy ? (
                                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                    <CheckCircle size={12} /> Selesai Diverifikasi
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                    <Clock size={12} /> Menunggu Verifikasi
                                  </span>
                                )}
                              </div>

                              <div className="py-1">
                                {formData.verifiedBy ? (
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      <CheckCircle size={13} className="text-emerald-700" /> Digital Verified by Finance Specialist
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-800">{formData.verifiedBy}</span>
                                    {formData.verifiedAt && (
                                      <span className="text-[10px] text-slate-500 font-mono">{new Date(formData.verifiedAt).toLocaleString("id-ID")}</span>
                                    )}
                                    <span className="text-[10px] text-emerald-700 font-bold mt-0.5">Status BA: Siap Terbitkan Invoice</span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                      <Clock size={13} className="text-amber-700" /> Menunggu Verifikasi Dokumen & Volume Joint Survey
                                    </span>

                                    {/* Action Buttons for Finance Specialist / SPV */}
                                    {editItem && (
                                      <div className="flex flex-col sm:flex-row gap-2 pt-2 max-w-md mx-auto">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await verifyBATracker(editItem.id, "verify", formData.notes || "Verifikasi dokumen & volume BA disetujui Finance Specialist");
                                              onNotice("Berita Acara berhasil diverifikasi oleh Finance Specialist. Status: Siap Terbitkan Invoice.");
                                              setFormData({ ...formData, verifiedBy: user?.name || "Finance Specialist AAP", verifiedAt: new Date().toISOString(), statusBA: "Ready to Invoice" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`Gagal verifikasi: ${err?.message}`);
                                            }
                                          }}
                                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <Check size={14} /> Verifikasi BA (Approve & Ready to Invoice)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await verifyBATracker(editItem.id, "reject", formData.notes || "Volume / data BA memerlukan revisi");
                                              onNotice("Berita Acara dikembalikan untuk revisi.");
                                              setFormData({ ...formData, statusBA: "Revisi" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`Gagal reject: ${err?.message}`);
                                            }
                                          }}
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <X size={14} /> Revisi
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                <strong className="block text-xs text-slate-900">Finance Specialist</strong>
                                <span className="text-[10px] text-slate-500">PT Andalan Artha Primanusa</span>
                              </div>
                            </div>
                          </div>

                          {/* Upload Final Signed BA PDF */}
                          {isInlineEditingBA && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                  <Upload size={14} className="text-emerald-700" /> Upload Berkas Final Signed BA (PDF TTD Customer) <span className="text-rose-600">*</span>
                                </label>
                                {formData.finalBAPath && (
                                  <a
                                    href={resolveDocumentUrl(formData.finalBAPath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 underline"
                                  >
                                    <ExternalLink size={11} /> Buka Final Signed PDF
                                  </a>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="application/pdf"
                                className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, "finalBAPath")}
                              />
                            </div>
                          )}

                          {/* Status Ready to Invoice / Invoiced Action Banner */}
                          {(() => {
                            const step3InvStatus = getBAInvoiceStatus(editItem || formData, invoiceRows);
                            const linkedNo = (formData.invoiceNoLinked || editItem?.invoiceNoLinked || "").trim();
                            const isLinked = Boolean(linkedNo && linkedNo !== "-") || step3InvStatus.isFullyInvoiced;
                            const isPOS = (editItem?.customerCode === "POS" || formData.customerCode === "POS");

                            if (isLinked) {
                              const displayInvNo = linkedNo || step3InvStatus.createdInvoices[0]?.invoiceNo || "Terbit";
                              return (
                                <div className="bg-purple-50 border border-purple-300 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-purple-950 shadow-xs">
                                  <div className="flex items-center gap-2.5">
                                    <Archive size={16} className="text-purple-700 shrink-0" />
                                    <span className="font-black text-purple-900">Arsip: Telah Terbit Invoice #{displayInvNo}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModalType("none");
                                      const targetInv = step3InvStatus.createdInvoices[0] || invoiceRows.find((inv: any) => inv.invoiceNo === displayInvNo || inv.baNoReference === formData.baNumber || inv.baID === (editItem?.id || formData.id));
                                      if (targetInv) {
                                        setDetailViewItem({ type: "invoice", data: targetInv });
                                      } else {
                                        alert(`Invoice #${displayInvNo} telah tercatat.`);
                                      }
                                    }}
                                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                  >
                                    <ExternalLink size={12} /> Lihat Invoice
                                  </button>
                                </div>
                              );
                            }

                            if (formData.statusBA === "Ready to Invoice" || formData.statusBA === "Approved") {
                              return (
                                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-950 shadow-xs">
                                  <div className="flex items-center gap-2.5">
                                    <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                                    <span className="font-black text-emerald-900">BA Disetujui (Ready to Invoice)</span>
                                  </div>
                                  {isPOS ? (
                                    <div className="flex items-center gap-2">
                                      {!step3InvStatus.createdMiningInv && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setModalType("none");
                                            createInvoiceFromBA(editItem || formData, "Operation & Mining");
                                          }}
                                          className="bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold py-2 px-3 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                        >
                                          <Pickaxe size={14} /> + Inv Mining
                                        </button>
                                      )}
                                      {!step3InvStatus.createdMDOInv && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setModalType("none");
                                            createInvoiceFromBA(editItem || formData, "MDO");
                                          }}
                                          className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold py-2 px-3 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                        >
                                          <Building2 size={14} /> + Inv MDO
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setModalType("none");
                                        createInvoiceFromBA(editItem || formData);
                                      }}
                                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-black py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                    >
                                      <Zap size={14} /> + Terbitkan Invoice
                                    </button>
                                  )}
                                </div>
                              );
                            }

                            return null;
                          })()}

                          {/* Navigation Buttons */}
                          <div className="flex justify-start items-center pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(2)}
                              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition text-xs cursor-pointer"
                            >
                              Kembali ke Step 2
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Catatan / Bottleneck */}
                      <div className="pt-2 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Operasional / Bottleneck</label>
                        {!isInlineEditingBA ? (
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                            {formData.notes || formData.notesBottleneck || "Tidak ada catatan khusus."}
                          </div>
                        ) : (
                          <textarea
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                            rows={1}
                            placeholder="Catatan tambahan..."
                            value={formData.notes || ""}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        )}
                      </div>
                    </div>

                    {/* KOLOM KANAN (LEBAR ~25% / xl:col-span-3 2xl:col-span-3): Document Viewer & Quick Intelligence Hub */}
                    <div className="xl:col-span-3 2xl:col-span-3 space-y-4">
                      {/* Ringkasan Dokumen Card */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">Ringkasan Berita Acara</span>
                          <span className="text-[10px] font-mono font-bold text-slate-500">ID: #{formData.id || editItem?.id || "New"}</span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Total Nilai Klaim BA:</span>
                            <span className="font-mono font-black text-emerald-800 text-sm">{formatIDR(sumAdjusted || sumInitial || formData.workAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Status BA:</span>
                            <span>{renderBAStatusBadge(formData.statusBA || "Submit", formData.invoiceNoLinked, undefined, editItem || formData, invoiceRows)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Customer:</span>
                            <span className="font-bold text-slate-900">{formData.customerCode || ""}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Periode:</span>
                            <span className="text-slate-800 font-bold">{formData.workPeriod || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Lead Time Approval:</span>
                            <span className="text-amber-700 font-extrabold">{formData.leadTimeDays || 0} Hari</span>
                          </div>
                        </div>
                      </div>

                      {/* PDF PREVIEWS CONTAINER */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 tracking-wider">
                          <FileText size={14} className="text-cyan-700" /> Pratinjau Dokumen PDF
                        </div>

                        {/* Draft BA Card */}
                        <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2.5 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                              <FileText size={13} className="text-cyan-400" /> Draft BA PDF (Internal Routing)
                            </span>
                            {formData.draftBAPath ? (
                              <a
                                href={resolveDocumentUrl(formData.draftBAPath)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold inline-flex items-center gap-1 transition shadow-xs"
                              >
                                <ExternalLink size={11} /> Buka Tab Baru
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </div>
                          {formData.draftBAPath ? (
                            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 flex items-center gap-3">
                              <div className="p-2.5 bg-cyan-950/80 border border-cyan-700/50 rounded-lg text-cyan-400 shrink-0">
                                <FileText size={22} />
                              </div>
                              <div className="min-w-0 flex-1 text-xs">
                                <span className="font-mono font-bold text-slate-200 block truncate" title={formData.draftBAPath}>
                                  {formData.draftBARefNo ? `Draft-${formData.draftBARefNo.replace(/\//g, '_')}.pdf` : formData.draftBAPath.split('/').pop() || "draft_berita_acara.pdf"}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                  <span>Site: <strong className="text-cyan-300">{formData.customerCode || "POS"}</strong></span>
                                  <span>•</span>
                                  <span>Routing: <strong className="text-slate-300">{formData.internalRoutingDate || "Tercatat"}</strong></span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                              Draft BA PDF belum diunggah.
                            </div>
                          )}
                        </div>

                        {/* Final Signed BA Card */}
                        <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2.5 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle size={13} className="text-emerald-400" /> Final Signed BA PDF (TTD Resmi)
                            </span>
                            {formData.finalBAPath ? (
                              <a
                                href={resolveDocumentUrl(formData.finalBAPath)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1 transition shadow-xs"
                              >
                                <ExternalLink size={11} /> Buka Tab Baru
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </div>
                          {formData.finalBAPath ? (
                            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 flex items-center gap-3">
                              <div className="p-2.5 bg-emerald-950/80 border border-emerald-700/50 rounded-lg text-emerald-400 shrink-0">
                                <CheckCircle size={22} />
                              </div>
                              <div className="min-w-0 flex-1 text-xs">
                                <span className="font-mono font-bold text-emerald-200 block truncate" title={formData.finalBAPath}>
                                  {formData.signedBANumber ? `Signed-${formData.signedBANumber.replace(/\//g, '_')}.pdf` : formData.baNumber ? `BA-${formData.baNumber.replace(/\//g, '_')}.pdf` : formData.finalBAPath.split('/').pop() || "signed_berita_acara.pdf"}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                  <span>TTD: <strong className="text-emerald-300">{formData.baSignedDate || "Selesai"}</strong></span>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-bold">Terverifikasi ✓</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                              Final Signed BA PDF dapat diunggah pada Step 3.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AUDIT & WORKFLOW INTELLIGENCE (2 TABS: FLOW & ACTIVITY) */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        {/* Tab Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                            <button
                              type="button"
                              onClick={() => setAuditTab("flow")}
                              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${auditTab === "flow" ? "bg-white text-cyan-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"}`}
                            >
                              <ShieldCheck size={12} />
                              <span>Flow Alur</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAuditTab("activity")}
                              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${auditTab === "activity" ? "bg-white text-cyan-900 shadow-xs font-black" : "text-slate-600 hover:text-slate-900"}`}
                            >
                              <History size={12} />
                              <span>Activity Log</span>
                            </button>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-500">Live Audit</span>
                        </div>

                        {/* TAB 1: FLOW ALUR */}
                        {auditTab === "flow" && (
                          <div className="space-y-2.5 text-xs">
                            {/* 1. Draft BA Dibuat */}
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-black">1</span>
                                  <span>Draft BA Dibuat</span>
                                </div>
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {formData.baSubmittedDate ? new Date(formData.baSubmittedDate).toLocaleDateString("id-ID") : "Tercatat"}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed">
                                Dibuat oleh <strong>{formData.picAAP || "Operations / Site Engineer"}</strong> ({formatIDR(sumInitial)}).
                              </p>
                            </div>

                            {/* 2. Verifikasi Finance Supervisor */}
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${formData.verifiedBy ? "bg-emerald-100 text-emerald-800" : formData.statusBA === "Revisi" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>2</span>
                                  <span>Verifikasi Finance Supervisor</span>
                                </div>
                                {formData.verifiedBy ? (
                                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                                    <CheckCircle size={10} /> Terverifikasi
                                  </span>
                                ) : formData.statusBA === "Revisi" ? (
                                  <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-0.5">
                                    <X size={10} /> Revisi
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                                    <Clock size={10} /> Menunggu
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed">
                                {formData.verifiedBy ? `Volume & nilai klaim diverifikasi oleh ${formData.verifiedBy}.` : "Menunggu verifikasi keabsahan volume bersama oleh Finance Supervisor."}
                              </p>
                            </div>

                            {/* 3. Invoice & Approval FATB Manager */}
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${formData.invoiceNoLinked ? "bg-purple-100 text-purple-800" : (formData.statusBA === "Ready to Invoice" || formData.verifiedBy) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>3</span>
                                  <span>Invoice & Approval FATB</span>
                                </div>
                                {formData.invoiceNoLinked ? (
                                  <span className="text-[10px] text-purple-800 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                    #{formData.invoiceNoLinked}
                                  </span>
                                ) : (formData.statusBA === "Ready to Invoice" || formData.verifiedBy) ? (
                                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Siap Terbit
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    Menunggu BA
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed">
                                {formData.invoiceNoLinked
                                  ? `Invoice #${formData.invoiceNoLinked} telah diterbitkan dan diajukan ke FATB Manager.`
                                  : (formData.statusBA === "Ready to Invoice" || formData.verifiedBy)
                                  ? "BA telah diverifikasi. Finance Site dapat men-generate invoice untuk diapprove FATB Manager."
                                  : "Invoice akan digenerate oleh Finance site setelah BA diverifikasi oleh Finance Supervisor."}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* TAB 2: ACTIVITY LOG */}
                        {auditTab === "activity" && (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
                            {baAuditLogs.length > 0 ? (
                              baAuditLogs.map((log: any, lIdx: number) => (
                                <div key={log.id || lIdx} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 text-[11px]">{log.user || "System"}</span>
                                    <span className="text-[10px] font-mono text-slate-500">{log.createdAt ? new Date(log.createdAt).toLocaleString("id-ID") : "-"}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
                                      {log.action || "Activity"}
                                    </span>
                                    <span className="text-[11px] text-slate-700">{log.referenceType ? `${log.referenceType} #${log.referenceId}` : (log.module || "BA Update")}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              generateAuditTimeline("ba", formData).map((step: any) => (
                                <div key={step.step} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 text-[11px]">{step.user}</span>
                                    <span className="text-[10px] font-mono text-slate-500">{step.time}</span>
                                  </div>
                                  <p className="text-slate-600 text-[11px]">{step.desc}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ================= MODAL PAYMENT RECEIPT ================= */}
              {modalType === "payment" && (
                <>
                  {/* Section 1: Target Invoice */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">1. Target Invoice Pembayaran</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Invoice Target <span className="text-rose-600">*</span></label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 focus:bg-white outline-none" placeholder="088/BGG-AAP/II/2026" value={formData.invoiceNo || ""} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Customer Code <span className="text-rose-600">*</span></label>
                        <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.customerCode || ""} onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}>
                          <option value="">— Pilih Customer —</option>
                          {companyList.map((c) => (
                            <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Nominal & Rekening Bank */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">2. Nominal Uang Masuk & Rekening Bank</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <RupiahInput
                        label="Jumlah Uang Masuk Received (Rp)"
                        value={formData.amountPaid || 0}
                        onChange={(val) => setFormData({ ...formData, amountPaid: val })}
                        required={true}
                        helperText="Otomatis mengurangi sisa Outstanding & update status Lunas/Partial"
                      />
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tanggal Pembayaran <span className="text-rose-600">*</span></label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.paymentDate || ""} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Bank Receiving (Tujuan Transaksi)</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Contoh: BRI Escrow / Mandiri 0000 OP" value={formData.receivingBank || ""} onChange={(e) => setFormData({ ...formData, receivingBank: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Referensi Bank / Transfer</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:border-cyan-700 focus:bg-white outline-none" placeholder="TRF-BRI-00129" value={formData.refNo || ""} onChange={(e) => setFormData({ ...formData, refNo: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Catatan Pembayaran */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Catatan Pembayaran</label>
                      <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" rows={2} placeholder="Keterangan cicilan 1 / pelunasan BGG..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* ================= MODAL CUSTOMER MASTER ================= */}
              {modalType === "customer" && (
                <>
                  {/* Section 1: Identitas Customer */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">1. Profil Perusahaan & Credit Terms</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Kode Customer <span className="text-rose-600">*</span></label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold uppercase focus:border-cyan-700 focus:bg-white outline-none" placeholder="BGG" value={formData.code || ""} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Termin Hari (Credit Terms) <span className="text-rose-600">*</span></label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.terminDays || 30} onChange={(e) => setFormData({ ...formData, terminDays: Number(e.target.value) })} required />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Nama Lengkap Perusahaan <span className="text-rose-600">*</span></label>
                      <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" placeholder="PT Budi Gema Gempita" value={formData.fullName || ""} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Induk Perusahaan (Group Parent)</label>
                      <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Petrindo Jaya Kreasi Tbk / PTBA" value={formData.groupParent || ""} onChange={(e) => setFormData({ ...formData, groupParent: e.target.value })} />
                    </div>
                  </div>

                  {/* Section 2: Kontak AR */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">2. Contact Person & Penagihan AR</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">PIC AR</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Bpk. Hendra" value={formData.contactPerson || ""} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email AR</label>
                        <input type="email" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="ar@bgg.co.id" value={formData.emailAR || ""} onChange={(e) => setFormData({ ...formData, emailAR: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Telepon</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="+62 21 555 0192" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Kontrak & Nilai Kerjasama */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">3. Kontrak & Nilai Kerjasama</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Kontrak</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="09/BGG-AAP/VIII/2018" value={formData.contractNo || ""} onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })} />
                      </div>
                      <RupiahInput
                        label="Nilai Kontrak (Rp)"
                        value={formData.contractValue || 0}
                        onChange={(val) => setFormData({ ...formData, contractValue: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Catatan Kontrak / Syarat</label>
                      <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" rows={2} placeholder="Termin per pekerjaan, 7 tahun..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-200">
                <div>
                  {modalType === "ba" && editItem && !isInlineEditingBA && (
                    <button
                      type="button"
                      onClick={() => setIsInlineEditingBA(true)}
                      className="px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Edit2 size={14} /> Ubah / Edit Data BA Ini
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-xs text-xs cursor-pointer"
                    onClick={() => setModalType("none")}
                  >
                    {modalType === "ba" && !isInlineEditingBA ? "Tutup Pratinjau" : "Batal"}
                  </button>
                  
                  {(modalType !== "ba" || isInlineEditingBA) && (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="primary px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-400 text-white font-black shadow-md transition text-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          <span>{modalType === "ba" ? "Simpan Perubahan Berita Acara" : "Simpan Data"}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
  );
}

