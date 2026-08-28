import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale, Search, Fuel } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, approveInvoiceTier2, getFinanceTemplates, getAuditLogs, User as UserType } from "../../lib/api";

import {
  resolveDocumentUrl, formatIDR, parseNumber, formatThousand, formatDateInput,
  indonesianMonths, formatMonthLabel, formatMonthInput, getRomanMonth,
  generateBANumberPreview, generateInvoiceNumberPreview, getYearFromPeriod,
  generateInvoiceNumber, getBAInvoiceStatus, renderBAStatusBadge,
  getBAStatusForExport, renderInvoiceStatusBadge, parsePeriodToMonthIndex,
  RupiahInput, generateAuditTimeline
} from "./helpers";

// Search Select Component for SOW Master Catalog per Site
function SowSearchSelect({
  value,
  onChange,
  onSelectSow,
  customerCode,
  activeSOWCatalog = [],
  mRate,
  placeholder = "Ketik / cari Master SOW...",
  id = "sow-select",
  isDistanceOnly = false
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectSow: (sow: { name: string; unit: string; defaultRate: number; isDistanceVar?: boolean }) => void;
  customerCode: string;
  activeSOWCatalog?: any[];
  mRate?: number;
  placeholder?: string;
  id?: string;
  isDistanceOnly?: boolean;
}) {
  const siteSowOptions = useMemo(() => {
    const code = (customerCode || "POS").toUpperCase();

    // 1. Get from activeSOWCatalog matching this customer
    const matchedFromCatalog = (activeSOWCatalog || []).filter(s => {
      if (!s) return false;
      const c = (s.customer || s.customerCode || "").toUpperCase();
      return !c || c === code || (code === "POS" && (!c || c === "POS"));
    });

    // 2. Default standard SOW list per site
    const siteDefaults: Record<string, Array<{ name: string; unit: string; defaultRate: number; category?: string; isDistanceVar?: boolean }>> = {
      BGG: [
        { name: "OVER BURDEN REMOVAL 1 (75%)", unit: "BCM", defaultRate: 29500, category: "Penambangan BGG", isDistanceVar: false },
        { name: "OVER BURDEN REMOVAL 2 (25%)", unit: "BCM", defaultRate: 28750, category: "Penambangan BGG", isDistanceVar: false },
        { name: "Coal Winning", unit: "Ton", defaultRate: 17500, category: "Penambangan BGG", isDistanceVar: false },
        { name: "Over Distance For OB Removal", unit: "BCM", defaultRate: 1550, category: "Over Distance", isDistanceVar: true },
        { name: "Over Distance For Coal Winning", unit: "Ton", defaultRate: 19700, category: "Over Distance", isDistanceVar: true },
      ],
      POS: [
        { name: "Top Soil Removal", unit: "BCM", defaultRate: 60500, category: "Operation & Mining", isDistanceVar: false },
        { name: "Overburden / Waste Removal", unit: "BCM", defaultRate: 59500, category: "Operation & Mining", isDistanceVar: false },
        { name: "Limonite Ore Mining", unit: "WMT", defaultRate: 60200, category: "Operation & Mining", isDistanceVar: false },
        { name: "Saprolite Ore Mining", unit: "WMT", defaultRate: 62200, category: "Operation & Mining", isDistanceVar: false },
        { name: "Uncrushed Rock", unit: "BCM", defaultRate: 142275, category: "Operation & Mining", isDistanceVar: false },
        { name: "Cut & Fill / Earthwork", unit: "BCM", defaultRate: 38150, category: "Operation & Mining", isDistanceVar: false },
        { name: "Crushed Rock", unit: "BCM", defaultRate: 233900, category: "Operation & Mining", isDistanceVar: false },
        { name: "Land Clearing", unit: "m2", defaultRate: 6830, category: "Operation & Mining", isDistanceVar: false },
        { name: "Over/Underhaul For OB Removal", unit: "BCM", defaultRate: 9643, category: "Over Distance", isDistanceVar: true },
        { name: "Over/Underhaul For Top Soil Removal", unit: "BCM", defaultRate: 9643, category: "Over Distance", isDistanceVar: true },
        { name: "Over/Underhaul For Limonite", unit: "BCM", defaultRate: 9428, category: "Over Distance", isDistanceVar: true },
        { name: "Over/Underhaul For Saprolite", unit: "BCM", defaultRate: 9428, category: "Over Distance", isDistanceVar: true },
        { name: "Mine Development (MDO) - Clearing & Access Road", unit: "Ha", defaultRate: 15500000, category: "MDO", isDistanceVar: false },
        { name: "Rocks for construction - under/overhaul", unit: "USD/1KM", defaultRate: 9450, category: "MDO", isDistanceVar: true },
        { name: "Uncrushed rocks for construction (MDO)", unit: "BCM", defaultRate: 142275, category: "MDO", isDistanceVar: false },
        { name: "Road Construction & Drainage", unit: "Mtr", defaultRate: 450000, category: "MDO", isDistanceVar: false },
      ],
      DBK: [
        { name: "OB Removal (Pit Sapan)", unit: "BCM", defaultRate: 31500, category: "Operation & Mining", isDistanceVar: false },
        { name: "Coal Winning (Pit Sapan)", unit: "Ton", defaultRate: 36000, category: "Operation & Mining", isDistanceVar: false },
        { name: "Land Clearing & Grubbing", unit: "Ha", defaultRate: 12500000, category: "Operation & Mining", isDistanceVar: false },
      ],
      SBS: [
        { name: "OB Removal Area Kerja", unit: "BCM", defaultRate: 28000, category: "Operation & Mining", isDistanceVar: false },
        { name: "Jasa Penunjang Produksi", unit: "Hours", defaultRate: 350000, category: "Penunjang", isDistanceVar: false },
        { name: "Hauling & Water Management", unit: "Hours", defaultRate: 420000, category: "Penunjang", isDistanceVar: false },
      ]
    };

    const defaults = siteDefaults[code] || siteDefaults["POS"];
    const merged: Array<{ name: string; unit: string; defaultRate: number; category?: string; isDistanceVar?: boolean }> = [];
    const seen = new Set<string>();

    matchedFromCatalog.forEach(c => {
      const key = (c.name || "").toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        const isDist = key.includes("overhaul") || key.includes("distance") || (c.category || "").toLowerCase().includes("distance");
        merged.push({
          name: c.name,
          unit: c.unit || "BCM",
          defaultRate: c.defaultRate || c.rateIDR || (c.rateUSD ? Math.round(c.rateUSD * (mRate || 17923.30)) : 0),
          category: c.category,
          isDistanceVar: isDist
        });
      }
    });

    defaults.forEach(d => {
      const key = (d.name || "").toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(d);
      }
    });

    // Filter strictly based on isDistanceOnly:
    // If isDistanceOnly is true, only return distance/overhaul items.
    // If isDistanceOnly is false, only return material/production items.
    return merged.filter(item => isDistanceOnly ? Boolean(item.isDistanceVar) : !item.isDistanceVar);
  }, [customerCode, activeSOWCatalog, mRate, isDistanceOnly]);

  const handleLookupAndSelect = (inputName: string) => {
    onChange(inputName);
    const norm = inputName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!norm) return;

    // Find exact or closest match within the filtered list
    const matched = siteSowOptions.find(o => o.name.toLowerCase().trim() === inputName.toLowerCase().trim()) ||
      siteSowOptions.find(o => {
        const itemNorm = o.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return itemNorm.includes(norm) || norm.includes(itemNorm);
      });

    if (matched) {
      onSelectSow(matched);
    }
  };

  const datalistId = `sow-datalist-${id}`;

  return (
    <div className="relative w-full">
      <input
        list={datalistId}
        type="text"
        className="w-full bg-cyan-50/60 hover:bg-cyan-50 focus:bg-white border border-cyan-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-cyan-700 outline-none transition"
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => handleLookupAndSelect(e.target.value)}
      />
      <datalist id={datalistId}>
        {siteSowOptions.map((sow, idx) => (
          <option key={idx} value={sow.name} />
        ))}
      </datalist>
    </div>
  );
}

export function FormModals({ c }: { c: any }) {
  const {
    baRows: rawBaRows, isFinanceSpecialist, isManager, invoiceRows: rawInvoiceRows, customerRows: rawCustomerRows,
    modalType, setModalType, editItem, formData, setFormData,
    setDetailViewItem, isInlineEditingBA, setIsInlineEditingBA, mRate, setMRate,
    fuelPriceUSD, setFuelPriceUSD, laborPriceIDR, setLaborPriceIDR, masterBankAccounts,
    rfIndexCalculated, activeSOWCatalog, defaultPOSBAOperatingItems, defaultPOSBAMDOItems, defaultBGGBAItems,
    baOperatingItems, setBaOperatingItems, baMDOItems, setBaMDOItems, activeBAStep,
    setActiveBAStep, showAddRowDropdown, setShowAddRowDropdown, invLineItems, handleCompanySelect,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-2 sm:p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 w-full ${modalType === "ba" || modalType === "pending_volume" || modalType === "invoice" ? "max-w-[98vw] 2xl:max-w-[1680px]" : "max-w-3xl"} shadow-2xl space-y-6 max-h-[96vh] overflow-y-auto transition-all`}>
            {/* Modal Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                    <FileText size={14} /> {modalType === "ba" ? "Berita Acara & Audit Intelligence Hub" : "Form Entri Keuangan"}
                  </span>
                  {modalType === "ba" && editItem && (
                    renderBAStatusBadge(formData.statusBA || editItem.statusBA, formData.invoiceNoLinked || editItem.invoiceNoLinked, undefined, editItem || formData, invoiceRows)
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {modalType === "ba"
                    ? (editItem ? `Berita Acara: ${formData.baNumber || formData.signedBANumber || formData.draftBARefNo || "Draft BA"}` : "Input Berita Acara Baru")
                    : `${editItem ? "Edit Data" : "Tambah Data Baru"} — ${modalType === "pending_volume" ? "Pending Volume (Joint Survey)" : modalType === "invoice" ? "Invoice" : modalType === "payment" ? "Payment Receipt" : "Customer Master"}`
                  }
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {modalType === "ba" && editItem && (
                  <>
                    {(formData.statusBA === "Ready to Invoice" || formData.statusBA === "Approved" || editItem.statusBA === "Ready to Invoice") && (
                      (editItem.customerCode === "POS" || formData.customerCode === "POS") ? (
                        (() => {
                          const modalInvStatus = getBAInvoiceStatus(editItem || formData, invoiceRows);
                          if (modalInvStatus.isFullyInvoiced) {
                            return (
                              <span className="px-3 py-1.5 rounded-xl bg-purple-100 border border-purple-300 text-purple-900 font-extrabold text-xs flex items-center gap-1.5 shadow-xs">
                                <Archive size={14} className="text-purple-700" />
                                <span>2/2 Invoice Telah Terbit</span>
                              </span>
                            );
                          }
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
                                  title="Auto-generate Form Invoice Kategori 1: Operations & Mining"
                                >
                                  <Pickaxe size={14} />
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
                                  title="Auto-generate Form Invoice Kategori 2: Mine Development (MDO)"
                                >
                                  <Building2 size={14} />
                                  <span>+ Inv MDO</span>
                                </button>
                              )}
                              {modalInvStatus.isPartiallyInvoiced && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetInv = modalInvStatus.createdMiningInv || modalInvStatus.createdMDOInv;
                                    if (targetInv) {
                                      setDetailViewItem({ type: "invoice", data: targetInv });
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 font-extrabold text-xs flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Archive size={12} className="text-purple-700" />
                                  <span>{modalInvStatus.createdMiningInv ? "Inv Mining ✓" : "Inv MDO ✓"}</span>
                                  <ExternalLink size={11} className="text-purple-700 ml-0.5" />
                                </button>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setModalType("none");
                            createInvoiceFromBA(editItem || formData);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                          title="Auto-generate Form Invoice dari BA ini"
                        >
                          <Zap size={14} className="fill-amber-300 text-amber-300" />
                          <span>+ Terbitkan Invoice</span>
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      onClick={() => setIsInlineEditingBA(!isInlineEditingBA)}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs border cursor-pointer ${
                        isInlineEditingBA
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                          : "bg-cyan-700 hover:bg-cyan-800 text-white border-cyan-800"
                      }`}
                      title={isInlineEditingBA ? "Alihkan ke Mode Pratinjau Bersih" : "Buka Mode Edit Data"}
                    >
                      {isInlineEditingBA ? (
                        <>
                          <Eye size={14} /> Mode Pratinjau
                        </>
                      ) : (
                        <>
                          <Edit2 size={14} /> Mode Edit Data
                        </>
                      )}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
                  onClick={() => setModalType("none")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 text-sm font-medium text-slate-800">

              {/* ================= MODAL INVOICE MASTER (PAYMENT DETAIL GENERATOR) ================= */}
              {modalType === "invoice" && (
                <div className="space-y-5 text-xs">
                  {/* Header Info Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2">
                      <h4 className="text-sm font-black text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
                        <FileText size={16} className="text-cyan-800" /> INVOICE GENERATOR
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={loadDemoPOSData}
                          className="px-2 py-1 text-[11px] font-extrabold text-cyan-900 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 rounded transition flex items-center gap-1 cursor-pointer"
                          title="Isi otomatis dengan template data POS Mining"
                        >
                          <Pickaxe size={12} /> Template POS
                        </button>
                        <button
                          type="button"
                          onClick={loadDemoBGGData}
                          className="px-2 py-1 text-[11px] font-extrabold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded transition flex items-center gap-1 cursor-pointer"
                          title="Isi otomatis dengan template data BGG Mining"
                        >
                          <Pickaxe size={12} /> Template BGG
                        </button>
                        <button
                          type="button"
                          onClick={loadDemoDBKData}
                          className="px-2 py-1 text-[11px] font-extrabold text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded transition flex items-center gap-1 cursor-pointer"
                          title="Isi otomatis dengan template data DBK Petrosea"
                        >
                          <Pickaxe size={12} /> Template DBK
                        </button>
                        <button
                          type="button"
                          onClick={loadDemoSBSData}
                          className="px-2 py-1 text-[11px] font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded transition flex items-center gap-1 cursor-pointer"
                          title="Isi otomatis dengan template data SBS Mining"
                        >
                          <Pickaxe size={12} /> Template SBS
                        </button>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-300">
                          RF Index: <strong className="text-amber-700 font-mono font-black">{rfIndexCalculated.toFixed(3)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Prominent BA Reference Bar */}
                    <div className="bg-cyan-50/80 border border-cyan-200 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="text-xs font-extrabold text-cyan-950 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                        <FileCheck size={15} className="text-cyan-800" /> Pilih No. BA (Auto-Fill):
                      </label>
                      <select
                        className="bg-white border border-cyan-300 font-bold text-cyan-950 text-xs px-3 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full shadow-xs"
                        value={formData.baNoReference || ""}
                        onChange={(e) => handleBASelect(e.target.value)}
                      >
                        <option value="">-- Tanpa BA Reference (Input Manual) --</option>
                        {baRows.map((ba: any) => (
                          <option key={ba.id} value={ba.baNumber}>
                            {ba.baNumber} — Client: {ba.customerCode} — Periode: {ba.workPeriod || "-"} ({formatIDR(ba.workAmount || 0)}) [{ba.statusBA || "Submit"}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2-Column Info Grid with Equal Label Spacing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                      {/* Left Column */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Company:</span>
                          <select
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            value={formData.customerCode || ""}
                            onChange={(e) => handleCompanySelect(e.target.value)}
                          >
                            <option value="">-- Pilih Customer --</option>
                            {customerRows.map((c: any) => (
                              <option key={c.id || c.code} value={c.code}>
                                {c.code} — {c.fullName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Contractor:</span>
                          <span className="font-extrabold text-slate-800 px-2 py-1 bg-slate-100/70 rounded border border-slate-200 flex-1">
                            PT. ANDALAN ARTHA PRIMANUSA
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Project:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full"
                            value={formData.projectSite || ""}
                            onChange={(e) => setFormData({ ...formData, projectSite: e.target.value })}
                            placeholder="Otomatis terisi dari Master Customer / BA"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Period Covered:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            placeholder="Juni 2026 / Jul-26"
                            value={formData.workPeriod || ""}
                            onChange={(e) => {
                              const newPeriod = e.target.value;
                              const newInvNo = generateInvoiceNumber(formData.customerCode || "POS", newPeriod, invoiceRows.length);
                              setFormData({ ...formData, workPeriod: newPeriod, invoiceNo: newInvNo });
                            }}
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Invoice No.:</span>
                          <input
                            className="bg-white border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            placeholder="003/POS-AAP/RF/VI/2026"
                            value={formData.invoiceNo || ""}
                            onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                            required
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Activity Group:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            value={formData.activityGroup || "OPERATION & MINING"}
                            onChange={(e) => setFormData({ ...formData, activityGroup: e.target.value })}
                            placeholder="OPERATION & MINING"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">PO Number:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            placeholder="PO-POS-2026-001"
                            value={formData.noPO || formData.poNumber || ""}
                            onChange={(e) => setFormData({ ...formData, noPO: e.target.value, poNumber: e.target.value })}
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Contract Number:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full"
                            placeholder="Otomatis terisi dari Master Customer / BA"
                            value={formData.contractNo || ""}
                            onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Master Bank Account Selector */}
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <label className="text-xs font-black uppercase text-cyan-900 tracking-wider flex items-center gap-1.5 shrink-0">
                          <Receipt size={15} className="text-cyan-800" /> Rekening Pembayaran (Master Bank Account):
                        </label>
                        <select
                          className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:border-cyan-600 outline-none shadow-xs"
                          value={formData.bankName || "Bank BNI"}
                          onChange={(e) => {
                            const selectedBank = masterBankAccounts.find(b => b.bankName === e.target.value) || masterBankAccounts[0];
                            setFormData({
                              ...formData,
                              bankName: selectedBank.bankName,
                              bankAccountName: selectedBank.bankAccountName,
                              bankAccountNo: selectedBank.bankAccountNo,
                              bankBranch: selectedBank.bankBranch,
                            });
                          }}
                        >
                          {masterBankAccounts.map((b) => (
                            <option key={b.id} value={b.bankName}>
                              {b.bankName} — A/C {b.bankAccountNo} ({b.bankBranch})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-sans text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">Bank Name:</span> <strong>{formData.bankName || "Bank BNI"}</strong></div>
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">A/C Name:</span> <strong>{formData.bankAccountName || "PT Andalan Artha Primanusa"}</strong></div>
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">A/C No:</span> <strong className="text-cyan-900 font-black">{formData.bankAccountNo || "8188788882"}</strong></div>
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">Branch:</span> <strong>{formData.bankBranch || "Harmoni, Jakarta"}</strong></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">M-Rate (Kurs Tengah BI)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                          <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={mRate === 0 ? "" : mRate} onFocus={(e) => e.target.select()} onChange={(e) => setMRate(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">Fuel Price ($F_n$ USD/L)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">$</span>
                          <input type="number" step="0.001" className="w-full bg-slate-50 border border-slate-300 rounded pl-6 pr-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={fuelPriceUSD === 0 ? "" : fuelPriceUSD} onFocus={(e) => e.target.select()} onChange={(e) => setFuelPriceUSD(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">Labor Price ($L_n$ IDR)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                          <input type="number" className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={laborPriceIDR === 0 ? "" : laborPriceIDR} onFocus={(e) => e.target.select()} onChange={(e) => setLaborPriceIDR(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DYNAMIC PAYMENT DETAIL TABLE PER CUSTOMER */}
                  {(() => {
                    const currentCust = (formData.customerCode || "POS").toUpperCase();
                    const cCalc = getCustomerCalculations(invLineItems, currentCust);

                    return (
                      <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                              <th className="p-2.5 text-center w-10">Del</th>
                              <th className="p-2.5">DESCRIPTION</th>
                              <th className="p-2.5 text-center">{currentCust === "SBS" ? "CLAIMED UNIT" : "CLAIMED VOLUME / DISTANCE"}</th>
                              {currentCust === "DBK" ? (
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
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">
                                      {item.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-mono font-normal">({item.period})</span>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section B: Coal Winning */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">B. COAL WINNING</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Ton
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Ton"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
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
                                {invLineItems.filter(i => i.section === "C").map(item => {
                                  const effVol = getItemEffectiveVolume(item);
                                  const effMtr = getItemEffectiveOverhaulMtr(item);
                                  const { unitRate, amount } = calculateItemRateAndAmount(item, "BGG");
                                  const diffMtr = effMtr - 1000;
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition">
                                      <td className="p-2 text-center">
                                        <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                      </td>
                                      <td className="p-2 font-bold text-slate-800">
                                        <div>{item.subSection || item.description}</div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <input
                                            type="number"
                                            className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder="1000"
                                            value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => updateInvItemOverhaul(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                          />
                                          <span className="text-[10px] text-slate-600 font-mono font-bold">mtr - 1000 mtr = ({diffMtr > 0 ? `+${diffMtr}` : diffMtr}) mtr</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <input
                                            type="number"
                                            step="0.01"
                                            className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder={String(effVol)}
                                            value={item.volume === 0 ? "" : (item.volume ?? "")}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                          />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || (item.subSection?.includes("Coal") ? "Ton" : "Bcm")}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">
                                        <input
                                          type="number"
                                          className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder={String(unitRate)}
                                          value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                                          onFocus={(e) => e.target.select()}
                                          onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                        />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                    </tr>
                                  );
                                })}

                                {/* Section D: Raise & Fall Factor */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
                                  <td className="p-2 text-center"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalD)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "D").map(item => {
                                  const effVol = getItemEffectiveVolume(item);
                                  const { unitRate, amount } = calculateItemRateAndAmount(item, "BGG");
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition">
                                      <td className="p-2 text-center">
                                        <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                      </td>
                                      <td className="p-2 font-bold text-slate-800">
                                        {item.subSection || ""} {item.description}
                                      </td>
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <input
                                            type="number"
                                            step="0.01"
                                            className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                            placeholder={String(effVol)}
                                            value={item.volume === 0 ? "" : (item.volume ?? "")}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                          />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">
                                        <input
                                          type="number"
                                          className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                          placeholder={String(unitRate)}
                                          value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")}
                                          onFocus={(e) => e.target.select()}
                                          onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                        />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                    </tr>
                                  );
                                })}

                                {/* Section E: Discount on Overdistance */}
                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                  <td className="p-2 text-center text-rose-400">#</td>
                                  <td colSpan={3} className="p-2 underline">E. DISCOUNT ON OVERDISTANCE (Deduction 25%)</td>
                                  <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalE))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "E").map(item => {
                                  const { amount } = calculateItemRateAndAmount(item, "BGG");
                                  return (
                                    <tr key={item.id} className="hover:bg-rose-50/30 transition">
                                      <td className="p-2 text-center">
                                        <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                      </td>
                                      <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                      <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(amount))})</td>
                                    </tr>
                                  );
                                })}

                                {/* Section F: DP Fuel & Transport */}
                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                  <td className="p-2 text-center text-rose-400">#</td>
                                  <td colSpan={3} className="p-2 underline">F. DP FUEL & TRANSPORT (Deduction)</td>
                                  <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalF))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "F").map(item => (
                                  <tr key={item.id} className="hover:bg-rose-50/30 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                    <td className="p-2 text-right font-mono">
                                      <input type="number" className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.amount === 0 ? "" : Math.abs(item.amount)} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemAmount(item.id, -(e.target.value === "" ? 0 : Math.abs(parseFloat(e.target.value)) || 0))} />
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )}

                            {/* DBK PETROSEA CUSTOMER TABLE (Gambar 3 - Dual Currency) */}
                            {currentCust === "DBK" && (
                              <>
                                {/* Section A: OB Removal */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">A. OB REMOVAL (Pit Sapan)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })} Bcm
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "A").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.001" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.001" className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateUSD(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="17140.76" value={item.kursBI === 0 ? "" : (item.kursBI ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemKurs(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17140.76)))}</td>
                                  </tr>
                                ))}

                                {/* Section B: Coal Winning */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">B. COAL WINNING (Pit Sapan)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })} Ton
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.001" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Ton"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.001" className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateUSD(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="17140.76" value={item.kursBI === 0 ? "" : (item.kursBI ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemKurs(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17140.76)))}</td>
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
                                  const baseM = item.baseMtr || 1000;
                                  const diff = (item.overhaulMtr || baseM) - baseM;
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition">
                                      <td className="p-2 text-center">
                                        <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                      </td>
                                      <td className="p-2 font-bold text-slate-800">
                                        <div>{item.subSection}</div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                                          <span>Dist:</span>
                                          <input type="number" className="w-16 bg-slate-50 border border-slate-300 font-mono text-[10px] px-1 py-0.5 rounded text-right" placeholder={String(baseM)} value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemOverhaul(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                          <span>m - {baseM}m = {diff}m</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <input type="number" step="0.001" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right font-mono text-slate-400">-</td>
                                      <td className="p-2 text-right">
                                        <input type="number" step="0.01" className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">{item.volume && item.unitRateIDR ? formatIDR(Math.round(item.volume * item.unitRateIDR)) : "-"}</td>
                                    </tr>
                                  );
                                })}
                              </>
                            )}

                            {/* SBS CUSTOMER TABLE (Gambar 4 - OB & Jasa Penunjang & Deductions) */}
                            {currentCust === "SBS" && (
                              <>
                                {/* Section OB Removal */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">OB REMOVAL (Per Area Kerja)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "A").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section Jasa Penunjang Produksi */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">JASA PENUNJANG PRODUKSI (Rental Alat)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Hours
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Hours"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section P: Pengurang Pembayaran */}
                                <tr className="bg-rose-50 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                  <td className="p-2 text-center text-rose-400">#</td>
                                  <td colSpan={3} className="p-2 underline font-extrabold">PENGURANG PEMBAYARAN (Denda & BBM)</td>
                                  <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalP))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "P").map(item => (
                                  <tr key={item.id} className="hover:bg-rose-50/30 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                    <td className="p-2 text-right font-mono">
                                      <input type="number" className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.amount === 0 ? "" : Math.abs(item.amount)} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemAmount(item.id, -(e.target.value === "" ? 0 : Math.abs(parseFloat(e.target.value)) || 0))} />
                                    </td>
                                  </tr>
                                ))}
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
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <span className="text-cyan-900 font-mono mr-1.5 font-black">{`A${idx + 1}.`}</span>
                                            <span>{cleanDesc}</span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <input
                                                type="number"
                                                step="0.01"
                                                className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="0"
                                                value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
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
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <div>
                                              <span className="text-cyan-900 font-mono mr-1.5 font-black">{`B${idx + 1}.`}</span>
                                              <span>{cleanDesc}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                              <input
                                                type="number"
                                                className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="1000"
                                                value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateInvItemOverhaul(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">mtr - 1000 mtr = ({diffMtr}) mtr</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-extrabold text-slate-800 text-xs">
                                              <span>{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
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
                                      <td className="p-2 text-center"></td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "C").map((item, idx) => {
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <span className="text-cyan-900 font-mono mr-1.5 font-black">{`C${idx + 1}.`}</span>
                                            <span>{cleanDesc}</span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <input
                                                type="number"
                                                step="0.01"
                                                className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="0"
                                                value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
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
                                      const effVol = getItemEffectiveVolume(item);
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();

                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <span className="text-cyan-900 font-mono mr-1.5 font-black">{`D${idx + 1}.`}</span>
                                            <span>{cleanDesc}</span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-extrabold text-slate-800 text-xs">
                                              <span>{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
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

                          {/* SUMMARY TOTALS & TAX BREAKDOWN */}
                          <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-xs">
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right font-extrabold uppercase text-slate-800">TOTAL (REVENUE GROSS):</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono text-base font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
                            </tr>
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-slate-700">DPP PPN 11/12:</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.dpp11_12)}</td>
                            </tr>
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-emerald-800">VAT ( 12% ) (+):</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-emerald-700">{formatIDR(cCalc.vat12)}</td>
                            </tr>
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-rose-800">WITH HOLDING TAX ART 23 (-):</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-rose-700">({formatIDR(cCalc.pph23)})</td>
                            </tr>
                            <tr className="bg-slate-900 text-white font-black text-sm border-t-2 border-slate-900">
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-3 text-right uppercase tracking-wider text-cyan-300">TOTAL INVOICE (NET):</td>
                              <td colSpan={2} className="p-3 text-right font-mono text-lg text-emerald-400">{formatIDR(cCalc.totalInvoice)}</td>
                            </tr>
                            {currentCust === "SBS" && (
                              <tr className="bg-emerald-800 text-white font-black text-base border-t-2 border-emerald-950">
                                <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-emerald-200">TOTAL DIBAYAR (NET AFTER DEDUCTIONS):</td>
                                <td colSpan={2} className="p-3 text-right font-mono text-xl text-white underline">{formatIDR(cCalc.totalDibayar)}</td>
                              </tr>
                            )}
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Helper legend footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      * Pilih customer di atas untuk berganti otomatis format dan urutan field SOW (POS, BGG, DBK, SBS). Kolom tabel & perhitungan otomatis menyesuaikan.
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
                      <Info size={13} className="text-indigo-700" /> Kesepakatan Rasio Kontrak ({formData.customerCode || "POS"}):
                    </div>
                    <div className="text-slate-600 font-medium pl-4">
                      {formData.customerCode === "BGG" ? (
                        <span>Kontrak BGG: Perbandingan Top Soil & Overburden adalah maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>. Nilai coal 1 Ton dengan nilai top soil dan overburden maksimal 3 Bcm kontraknya. Kelebihan volume pengerjaan di-pending ke invoice selanjutnya.</span>
                      ) : formData.customerCode === "DBK" ? (
                        <span>Kontrak DBK: Perbandingan Overburden maksimal <strong>3.5 BCM / 1 Ton Coal</strong>. Selisih volume over-ratio di-carry over.</span>
                      ) : formData.customerCode === "POS" ? (
                        <span>Kontrak POS: Perbandingan Waste/OB & Top Soil maksimal <strong>4.0 BCM / 1 Ton Ore</strong>. Selisih kuota masuk ke Pending Volume.</span>
                      ) : formData.customerCode === "SBS" ? (
                        <span>Kontrak SBS: Perbandingan OB maksimal <strong>3.0 BCM / 1 Ton Coal</strong>. Volume over-contract dicatat sebagai pending volume.</span>
                      ) : (
                        <span>Kontrak Standar: Rasio Top Soil & OB maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>.</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Customer Code <span className="text-rose-600">*</span>
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:bg-white outline-none text-xs"
                        value={formData.customerCode || "POS"}
                        onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                        required
                      >
                        <option value="POS">POS - PT Position</option>
                        <option value="BGG">BGG - PT Budi Gema Gempita (Rasio 3:1)</option>
                        <option value="SBS">SBS - PT Satria Bahana Sarana (Rasio 3:1)</option>
                        <option value="DBK">DBK - PT Daya Bumindo Karunia (Rasio 3.5:1)</option>
                        <option value="ABN">ABN - PT Andalan Bhumi Nusantara (Rasio 3:1)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Periode Pekerjaan <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="month"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:bg-white outline-none text-xs"
                        value={formatMonthInput(formData.workPeriod || "Juni 2026")}
                        onChange={(e) => {
                          const mVal = e.target.value;
                          const formattedLabel = formatMonthLabel(mVal);
                          setFormData({ ...formData, workPeriod: formattedLabel });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <RupiahInput
                        label="Estimasi Nominal Pending Volume (Rp)"
                        value={formData.workAmount || 0}
                        onChange={(val) => setFormData({ ...formData, workAmount: val })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        PIC / Tim Joint Survey
                      </label>
                      <input
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white outline-none text-xs"
                        placeholder="Surveyor Site / Mine Engineer"
                        value={formData.picAAP || ""}
                        onChange={(e) => setFormData({ ...formData, picAAP: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Catatan / Keterangan Pending Volume (Selisih Stripping Ratio)
                    </label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:border-indigo-600 focus:bg-white outline-none"
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

                const allBAItems = [...baOperatingItems, ...baMDOItems];

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
                    const dist = Number(item.distanceWeightAvg ?? 1000);
                    // Jarak dasar adalah 1.000 meter. Jarak lebih/kurang dibagi 1.000 (Km)
                    // Kurang dari 1.000 mtr menghasilkan nilai negatif (mengurangi pendapatan)
                    const diffKm = (dist - 1000) / 1000;
                    return Math.round(volume * diffKm * r);
                  }
                  return Math.round(volume * r);
                };

                const sumInitial = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, false)), 0);
                const sumAdjusted = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, true)), 0);
                const deltaAmount = sumAdjusted - sumInitial;

                return (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* KOLOM KIRI (LEBAR ~70%-75% / xl:col-span-8 2xl:col-span-9): Workflow Stepper, SOW Tables, Survey & Signatures */}
                    <div className="xl:col-span-8 2xl:col-span-9 space-y-4 border-b xl:border-b-0 xl:border-r border-slate-200 pb-6 xl:pb-0 xl:pr-6">
                      
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
                                value={formData.customerCode || "POS"}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  const isBGG = code === "BGG" || code === "PT BGG";
                                  const currentPeriod = formData.workPeriod || "Agustus 2026";
                                  setFormData({ ...formData, customerCode: code });
                                  if (isBGG) {
                                    setBaOperatingItems([
                                      { id: `bgg_ob1_${Date.now()}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 1 (75%)", period: currentPeriod, notes: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 29500, subtotalInitial: 0, subtotalAdjusted: 0 },
                                      { id: `bgg_ob2_${Date.now() + 1}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 2 (25%)", period: currentPeriod, notes: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 28750, subtotalInitial: 0, subtotalAdjusted: 0 },
                                      { id: `bgg_cw_${Date.now() + 2}`, category: "Operating & Mining", area: "", material: "Coal Winning", period: currentPeriod, notes: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: 17500, subtotalInitial: 0, subtotalAdjusted: 0 },
                                      { id: `bgg_od_ob_${Date.now() + 3}`, category: "Over Distance", area: "", material: "Over Distance For OB Removal", period: currentPeriod, notes: "", unit: "BCM", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 1550, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
                                      { id: `bgg_od_cw_${Date.now() + 4}`, category: "Over Distance", area: "", material: "Over Distance For Coal Winning", period: currentPeriod, notes: "", unit: "Ton", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 19700, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
                                    ]);
                                    setBaMDOItems([]);
                                  } else {
                                    setBaOperatingItems(defaultPOSBAOperatingItems.map(it => ({ ...it, area: "", period: currentPeriod })));
                                    setBaMDOItems(defaultPOSBAMDOItems.map(it => ({ ...it, area: "", period: currentPeriod })));
                                  }
                                }}
                              >
                                <option value="POS">POS – PT Position / Paramitha</option>
                                <option value="SBS">SBS – PT Sumber Bara Sejahtera</option>
                                <option value="BGG">BGG – PT Budi Gema Gempita</option>
                                <option value="DBK">DBK – PT Dayabumi Kencana</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                Periode Pekerjaan <span className="text-rose-600">*</span>
                              </label>
                              <input
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                                placeholder="e.g. Agustus 2026"
                                value={formData.workPeriod || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormData({ ...formData, workPeriod: val });
                                  setBaOperatingItems(prev => prev.map(it => ({ ...it, period: val, keterangan: val })));
                                  setBaMDOItems(prev => prev.map(it => ({ ...it, period: val, keterangan: val })));
                                }}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                PIC Site AAP
                              </label>
                              <input
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                                placeholder="Operations / Site Engineer"
                                value={formData.picAAP || ""}
                                onChange={(e) => setFormData({ ...formData, picAAP: e.target.value })}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-800">
                            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Customer</span> <strong className="text-slate-900 font-bold">{formData.customerCode || "POS"}</strong></div>
                            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Periode</span> <strong className="text-slate-800">{formData.workPeriod || "-"}</strong></div>
                            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">PIC Site</span> <strong className="text-slate-800">{formData.picAAP || "-"}</strong></div>
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
                                  <Pickaxe size={14} className="text-cyan-700" /> {isCustomerBGG ? "Kategori: Penambangan Batubara & OB Removal (BGG)" : "Kategori 1: Operating & Mining"}
                                </span>
                                <div className="flex items-center gap-2">
                                  {isInlineEditingBA && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curPer = formData.workPeriod || "Agustus 2026";
                                        if (isCustomerBGG) {
                                          setBaOperatingItems([
                                            { id: `bgg_ob1_${Date.now()}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 1 (75%)", period: curPer, notes: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 29500, subtotalInitial: 0, subtotalAdjusted: 0 },
                                            { id: `bgg_ob2_${Date.now() + 1}`, category: "Operating & Mining", area: "", material: "OVER BURDEN REMOVAL 2 (25%)", period: curPer, notes: "", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 28750, subtotalInitial: 0, subtotalAdjusted: 0 },
                                            { id: `bgg_cw_${Date.now() + 2}`, category: "Operating & Mining", area: "", material: "Coal Winning", period: curPer, notes: "", unit: "Ton", initialVolume: 0, adjustedVolume: 0, rate: 17500, subtotalInitial: 0, subtotalAdjusted: 0 },
                                            { id: `bgg_od_ob_${Date.now() + 3}`, category: "Over Distance", area: "", material: "Over Distance For OB Removal", period: curPer, notes: "", unit: "BCM", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 1550, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
                                            { id: `bgg_od_cw_${Date.now() + 4}`, category: "Over Distance", area: "", material: "Over Distance For Coal Winning", period: curPer, notes: "", unit: "Ton", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 19700, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 }
                                          ]);
                                          setBaMDOItems([]);
                                        } else {
                                          setBaOperatingItems(defaultPOSBAOperatingItems.map(it => ({ ...it, area: "", period: curPer })));
                                          setBaMDOItems(defaultPOSBAMDOItems.map(it => ({ ...it, area: "", period: curPer })));
                                        }
                                      }}
                                      className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-300 shadow-2xs"
                                      title="Muat Ulang Item SOW Standar Kontrak"
                                    >
                                      <RefreshCw size={12} />
                                      <span>Muat Template SOW</span>
                                    </button>
                                  )}
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
                                    <th className="p-2.5 w-24">Area / Lokasi</th>
                                    <th className="p-2.5 min-w-[200px]">Material / Pekerjaan (Master SOW)</th>
                                    <th className="p-2.5 w-28 text-center">Keterangan</th>
                                    <th className="p-2.5 text-center w-18">Satuan</th>
                                    <th className="p-2.5 text-right w-28">Volume Awal</th>
                                    <th className="p-2.5 text-right w-28">SOW Rate (Rp)</th>
                                    <th className="p-2.5 text-right w-32">Subtotal (Rp)</th>
                                    {isInlineEditingBA && <th className="p-2.5 text-center w-10">#</th>}
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
                                        <td className="p-2.5 font-bold text-slate-800 align-top">
                                          {!isInlineEditingBA ? (
                                            <span className="pt-1 block">{item.area || (isCustomerBGG ? "Pit KKL" : "WM1")}</span>
                                          ) : (
                                            <input
                                              className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-cyan-700 outline-none"
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
                                        <td className="p-2.5 font-medium text-slate-900 align-top">
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
                                              <SowSearchSelect
                                                id={`sow-op-${idx}`}
                                                isDistanceOnly={false}
                                                value={item.material || ""}
                                                customerCode={formData.customerCode || "POS"}
                                                activeSOWCatalog={activeSOWCatalog}
                                                mRate={mRate}
                                                placeholder="Cari Master SOW (e.g. Volume OB)..."
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
                                                  <SowSearchSelect
                                                    id={`sow-dist-${idx}`}
                                                    isDistanceOnly={true}
                                                    value={item.material || ""}
                                                    customerCode={formData.customerCode || "POS"}
                                                    activeSOWCatalog={activeSOWCatalog}
                                                    mRate={mRate}
                                                    placeholder="Cari Variabel Distance / Overhaul..."
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
                                               <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-slate-700 whitespace-nowrap bg-amber-50/80 border border-amber-200 px-2.5 py-1 rounded-md w-fit">
                                                 <span className="font-bold text-amber-900">Jarak (Meter):</span>
                                                 {!isInlineEditingBA ? (
                                                   <span className="font-bold text-slate-900 bg-white border border-amber-300 px-1.5 py-0.5 rounded font-mono">
                                                     {item.distanceWeightAvg || 0}
                                                   </span>
                                                 ) : (
                                                   <input
                                                     type="number"
                                                     className="w-20 bg-white border border-amber-400 rounded px-2 py-0.5 text-right font-mono font-bold text-amber-950 text-xs focus:border-amber-600 outline-none"
                                                     value={item.distanceWeightAvg === 0 ? "" : (item.distanceWeightAvg ?? "")}
                                                     placeholder="1000"
                                                     onFocus={(e) => e.target.select()}
                                                     onChange={(e) => {
                                                       const updated = [...baOperatingItems];
                                                       updated[idx].distanceWeightAvg = parseFloat(e.target.value) || 0;
                                                       setBaOperatingItems(updated);
                                                     }}
                                                   />
                                                 )}
                                                 <span className="text-slate-500 font-sans text-[10px]">
                                                   mtr - 1000 mtr = <strong className={Number(item.distanceWeightAvg ?? 1000) >= 1000 ? "text-emerald-700" : "text-rose-600"}>{Number(item.distanceWeightAvg ?? 1000) - 1000} mtr</strong>
                                                   {" "}(<span className="font-semibold">{((Number(item.distanceWeightAvg ?? 1000) - 1000) / 1000).toLocaleString('id-ID', {minimumFractionDigits: 3, maximumFractionDigits: 3})} Km</span>)
                                                 </span>
                                               </div>
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-2.5 font-medium text-slate-800 align-top text-center">
                                          {!isInlineEditingBA ? (
                                            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-700 inline-block text-center min-w-[55px] mt-0.5">
                                              {item.period || item.notes || item.keterangan || "-"}
                                            </span>
                                          ) : (
                                            <input
                                              type="text"
                                              className="w-24 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-900 text-center focus:border-cyan-700 outline-none"
                                              value={item.period ?? item.notes ?? item.keterangan ?? ""}
                                              placeholder="e.g. Jun-26"
                                              onChange={(e) => {
                                                const updated = [...baOperatingItems];
                                                updated[idx].period = e.target.value;
                                                updated[idx].notes = e.target.value;
                                                updated[idx].keterangan = e.target.value;
                                                setBaOperatingItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2.5 text-center font-mono font-bold text-slate-800 align-top">
                                          {isDPFuel ? (
                                            <span className="text-slate-400 font-bold pt-1 block">-</span>
                                          ) : !isInlineEditingBA ? (
                                            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px] mt-0.5">
                                              {item.unit || "BCM"}
                                            </span>
                                          ) : (
                                            <input
                                              className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-mono font-bold text-center focus:border-cyan-700 outline-none"
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

                                        {/* Volume Awal & SOW Rate (Merged to single nominal input with thousand separator if DP Fuel) */}
                                        {isDPFuel ? (
                                          <td colSpan={2} className="p-2.5 text-right font-mono align-top">
                                            {!isInlineEditingBA ? (
                                              <span className="font-bold text-slate-900 pt-1 block">{item.rate ? formatThousand(item.rate) : "0"}</span>
                                            ) : (
                                              <div className="flex justify-end pt-0.5">
                                                <input
                                                  type="text"
                                                  className="w-40 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2.5 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                                                  value={item.rate ? formatThousand(item.rate) : ""}
                                                  placeholder="0"
                                                  onFocus={(e) => e.target.select()}
                                                  onChange={(e) => {
                                                    const num = parseNumber(e.target.value);
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
                                            <td className="p-2.5 text-right font-mono align-top">
                                              {!isDistance ? (
                                                !isInlineEditingBA ? (
                                                  <span className="font-bold text-slate-900 pt-1 block">{item.initialVolume ? Number(item.initialVolume).toLocaleString("id-ID", { minimumFractionDigits: 3 }) : "0.000"}</span>
                                                ) : (
                                                  <input
                                                    type="number"
                                                    step="0.001"
                                                    className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                                    value={item.initialVolume ? item.initialVolume : ""}
                                                    placeholder="0.000"
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                      const updated = [...baOperatingItems];
                                                      const val = parseFloat(e.target.value) || 0;
                                                      updated[idx].initialVolume = val;
                                                      updated[idx].adjustedVolume = val;
                                                      setBaOperatingItems(updated);
                                                    }}
                                                  />
                                                )
                                              ) : (
                                                <div className="flex flex-col items-end pt-0.5">
                                                  <div className="px-2.5 py-1 bg-amber-50/90 border border-amber-300 rounded font-mono font-black text-amber-950 text-xs shadow-2xs">
                                                    {effVol.toLocaleString("id-ID", { minimumFractionDigits: 3 })}
                                                  </div>
                                                  <span className="text-[9px] text-amber-800 font-semibold italic mt-0.5 whitespace-nowrap">
                                                    Auto-sync {item.parentMaterial ? item.parentMaterial.replace("Volume ", "") : "Produksi"}
                                                  </span>
                                                </div>
                                              )}
                                            </td>
                                            <td className="p-2.5 text-right font-mono align-top">
                                              {!isInlineEditingBA ? (
                                                <span className="pt-1 block">{formatIDR(item.rate || 0)}</span>
                                              ) : (
                                                <input
                                                  type="number"
                                                  className="w-24 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                                  value={item.rate === 0 ? "" : (item.rate ?? "")}
                                                  placeholder="0"
                                                  onFocus={(e) => e.target.select()}
                                                  onChange={(e) => {
                                                    const updated = [...baOperatingItems];
                                                    updated[idx].rate = parseFloat(e.target.value) || 0;
                                                    setBaOperatingItems(updated);
                                                  }}
                                                />
                                              )}
                                            </td>
                                          </>
                                        )}

                                        <td className="p-2.5 text-right font-mono font-extrabold align-top">
                                          <div className={`pt-1 ${subtotal < 0 ? "text-rose-700 font-black" : "text-slate-900"}`}>{formatIDR(subtotal)}</div>
                                        </td>
                                        {isInlineEditingBA && (
                                          <td className="p-2.5 text-center align-top">
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

                          {/* Tabel 2: MDO (Hanya jika Customer bukan BGG / untuk POS) */}
                          {!isCustomerBGG && (
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5">
                                  <Building2 size={14} className="text-indigo-700" /> Kategori 2: Mine Development Operation (MDO)
                                </span>
                                {isInlineEditingBA && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const defMdo = activeSOWCatalog.find(s => s.category === "MDO") || activeSOWCatalog[activeSOWCatalog.length - 1];
                                      setBaMDOItems([...baMDOItems, {
                                        id: `mdo_${Date.now()}`,
                                        category: "MDO",
                                        area: "Site POS",
                                        material: defMdo.name,
                                        unit: defMdo.unit,
                                        initialVolume: 0,
                                        adjustedVolume: 0,
                                        rate: defMdo.defaultRate,
                                        subtotalInitial: 0,
                                        subtotalAdjusted: 0
                                      }]);
                                    }}
                                    className="text-[11px] font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Plus size={13} /> Tambah Baris MDO
                                  </button>
                                )}
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                    <tr>
                                      <th className="p-2">Area / Lokasi</th>
                                      <th className="p-2 min-w-[180px]">Material / Pekerjaan MDO (Master SOW)</th>
                                      <th className="p-2 text-center">Satuan</th>
                                      <th className="p-2 text-right">Volume Awal</th>
                                      <th className="p-2 text-right">SOW Rate (Rp)</th>
                                      <th className="p-2 text-right">Subtotal (Rp)</th>
                                      {isInlineEditingBA && <th className="p-2 text-center">#</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {baMDOItems.map((item, idx) => (
                                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                                        <td className="p-2 font-bold text-slate-800">
                                          {!isInlineEditingBA ? (item.area || "Site POS") : (
                                            <input
                                              className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-cyan-700 outline-none"
                                              value={item.area || ""}
                                              placeholder="Site POS"
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
                                            <select
                                              className="w-full bg-indigo-50/50 border border-indigo-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:border-indigo-700 outline-none"
                                              value={item.material || "Mine Development (MDO) - Clearing & Access Road"}
                                              onChange={(e) => {
                                                const matName = e.target.value;
                                                const sow = activeSOWCatalog.find(s => s.name === matName);
                                                const updated = [...baMDOItems];
                                                updated[idx].material = matName;
                                                if (sow) {
                                                  updated[idx].unit = sow.unit;
                                                  updated[idx].rate = sow.defaultRate;
                                                }
                                                const vol = Number(updated[idx].initialVolume || 0);
                                                const r = Number(updated[idx].rate || 0);
                                                updated[idx].subtotalInitial = Math.round(vol * r);
                                                updated[idx].subtotalAdjusted = Math.round(Number(updated[idx].adjustedVolume || vol) * r);
                                                setBaMDOItems(updated);
                                              }}
                                            >
                                              {activeSOWCatalog.filter(s => s.category === "MDO").map(sow => (
                                                <option key={sow.name} value={sow.name}>
                                                  {sow.name}
                                                </option>
                                              ))}
                                              {!activeSOWCatalog.some(s => s.name === item.material) && item.material && (
                                                <option value={item.material}>{item.material}</option>
                                              )}
                                            </select>
                                          )}
                                        </td>
                                        <td className="p-2 text-center font-mono font-bold text-slate-800">
                                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px]">
                                            {item.unit || "Ha"}
                                          </span>
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                          {!isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900">{item.initialVolume ? item.initialVolume.toLocaleString("id-ID") : "0"}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              step="0.01"
                                              className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.initialVolume ? item.initialVolume : ""}
                                              placeholder="0.00"
                                              onChange={(e) => {
                                                const updated = [...baMDOItems];
                                                const val = parseFloat(e.target.value) || 0;
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
                                            <input
                                              type="number"
                                              className="w-24 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.rate === 0 ? "" : (item.rate ?? "")}
                                              placeholder="0"
                                              onChange={(e) => {
                                                const updated = [...baMDOItems];
                                                const r = parseFloat(e.target.value) || 0;
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
                                    {baOperatingItems.length === 0 && (
                                      <tr>
                                        <td colSpan={isInlineEditingBA ? 8 : 7} className="p-8 text-center text-slate-500 bg-slate-50/70">
                                          <div className="flex flex-col items-center justify-center gap-2.5">
                                            <span className="text-xs font-bold text-slate-700">Belum ada item rincian SOW untuk Berita Acara ini.</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (isCustomerBGG) {
                                                  setBaOperatingItems(defaultBGGBAItems);
                                                  setBaMDOItems([]);
                                                } else {
                                                  setBaOperatingItems(defaultPOSBAOperatingItems);
                                                  setBaMDOItems(defaultPOSBAMDOItems);
                                                }
                                              }}
                                              className="px-3.5 py-1.5 bg-cyan-800 hover:bg-cyan-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                                            >
                                              <RefreshCw size={13} />
                                              <span>Muat Template SOW {isCustomerBGG ? "BGG (8 Item Kontrak Sesuai Invoice 091)" : "POS"}</span>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Estimasi Unbilled Revenue Box */}
                          <div className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border border-slate-800 shadow-md">
                            <div>
                              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                                Estimasi Nilai Pengakuan Awal (Unbilled Revenue):
                              </div>
                              <div className="text-[10px] text-cyan-300">
                                Akun: (Dr) 11300 Pendapatan Belum Ditagih / (Cr) 41100 Pendapatan Operasional
                              </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
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
                                  <th className="p-2.5 text-right w-28">Vol Awal</th>
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
                                          {!isDPFuel && (item.period || item.notes || item.keterangan) && (
                                            <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-900 border border-cyan-300 rounded text-[10px] font-black">
                                              {item.period || item.notes || item.keterangan}
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
                                        <span className="pt-1 block">{isDPFuel ? "-" : volAwal.toLocaleString("id-ID", { minimumFractionDigits: 3 })}</span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono align-top">
                                        {isDPFuel ? (
                                          <span className="pt-1 block text-slate-400 font-mono">-</span>
                                        ) : !isDistance ? (
                                          !isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900 pt-1 block">{volAdj.toLocaleString("id-ID", { minimumFractionDigits: 3 })}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              step="0.001"
                                              className="w-24 bg-cyan-50 border border-cyan-300 rounded px-2 py-1 text-right font-mono font-bold text-xs text-cyan-950 focus:border-cyan-700 outline-none"
                                              value={item.adjustedVolume !== undefined ? item.adjustedVolume : ""}
                                              placeholder="0.000"
                                              onFocus={(e) => e.target.select()}
                                              onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (isOp) {
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
                                              {volAdj.toLocaleString("id-ID", { minimumFractionDigits: 3 })}
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

                          {/* Status Ready to Invoice Action Banner */}
                          {(formData.statusBA === "Ready to Invoice" || formData.statusBA === "Approved") && (
                            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-950 shadow-xs">
                              <div className="flex items-center gap-2.5">
                                <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
                                <div>
                                  <strong className="block font-black text-emerald-900">Berita Acara Telah Disetujui (Ready to Invoice)</strong>
                                  <span className="text-emerald-800 text-[11px]">Dokumen siap diterbitkan invoice penagihan resmi ke pelanggan.</span>
                                </div>
                              </div>
                              {formData.customerCode === "POS" ? (
                                <div className="flex items-center gap-2">
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
                          )}

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

                    {/* KOLOM KANAN (LEBAR ~25%-30% / xl:col-span-4 2xl:col-span-3): Document Viewer & Quick Intelligence Hub */}
                    <div className="xl:col-span-4 2xl:col-span-3 space-y-4">
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
                            <span className="font-bold text-slate-900">{formData.customerCode || "POS"}</span>
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
                        <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                              <Upload size={13} /> Draft BA PDF
                            </span>
                            {formData.draftBAPath ? (
                              <a
                                href={resolveDocumentUrl(formData.draftBAPath)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold inline-flex items-center gap-1"
                              >
                                <ExternalLink size={11} /> Buka Tab Baru
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </div>
                          {formData.draftBAPath ? (
                            <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                              <iframe src={resolveDocumentUrl(formData.draftBAPath)} className="w-full h-full" title="Draft BA PDF Preview" />
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                              Draft BA PDF belum diunggah.
                            </div>
                          )}
                        </div>

                        {/* Final Signed BA Card */}
                        <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={13} /> Final Signed BA PDF
                            </span>
                            {formData.finalBAPath ? (
                              <a
                                href={resolveDocumentUrl(formData.finalBAPath)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1"
                              >
                                <ExternalLink size={11} /> Buka Tab Baru
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </div>
                          {formData.finalBAPath ? (
                            <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                              <iframe src={resolveDocumentUrl(formData.finalBAPath)} className="w-full h-full" title="Final BA PDF Preview" />
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

                            {/* 2. Verifikasi Finance Specialist */}
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${formData.verifiedBy ? "bg-emerald-100 text-emerald-800" : formData.statusBA === "Revisi" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>2</span>
                                  <span>Verifikasi Finance Specialist</span>
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
                                {formData.verifiedBy ? `Volume & nilai klaim diverifikasi oleh ${formData.verifiedBy}.` : "Menunggu verifikasi keabsahan volume bersama oleh Finance Specialist."}
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
                                  : "Invoice akan digenerate oleh Finance site setelah BA diverifikasi oleh Finance Specialist."}
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
                        <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.customerCode || "BGG"} onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}>
                          <option value="BGG">BGG</option>
                          <option value="SBS">SBS</option>
                          <option value="DBK">DBK</option>
                          <option value="POS">POS</option>
                          <option value="ABN">ABN</option>
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
                      className="primary px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black shadow-md transition text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      <span>{modalType === "ba" ? "Simpan Perubahan Berita Acara" : "Simpan Data"}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
  );
}

