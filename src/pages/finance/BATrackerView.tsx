import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale, Truck, Loader2, StickyNote, Settings } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, getFinanceTemplates, User as UserType } from "../../lib/api";
import { BANotesUpdateModal } from "./modals/BANotesUpdateModal";
import { pendingAmount } from "./modals/PendingVolumeRecordModal";
import { companyScopeOf } from "../../lib/auth";
import { MappingsModal } from "../tunai-po/shared";

import {
  resolveDocumentUrl, formatIDR, parseNumber, formatThousand, formatDateInput,
  indonesianMonths, formatMonthLabel, formatMonthInput, getRomanMonth,
  generateBANumberPreview, generateInvoiceNumberPreview, getYearFromPeriod,
  generateInvoiceNumber, getBAInvoiceStatus, renderBAStatusBadge,
  getBAStatusForExport, renderInvoiceStatusBadge, parsePeriodToMonthIndex,
  RupiahInput, generateAuditTimeline, getCustomerOfficialName, isBAApproved
} from "./helpers";

const BA_SITES = [
  { code: "BGG", label: "BGG (PT Budi Gema Gempita)" },
  { code: "POS", label: "POS (PT Position)" },
  { code: "PTRO", label: "PTRO (PT Petrosea)" },
  { code: "SBS", label: "SBS (PT Satria Bahana Sarana)" },
  { code: "IBP", label: "IBP" },
  { code: "BBA", label: "BBA" },
];

export function BATrackerView({ c }: { c: any }) {
  const {
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, pendingVolumeLedgers: rawPendingVolumeLedgers, setShowPendingVolumeDrawer, baFilter,
    setBaFilter, periodFilter, setPeriodFilter, showExportBADropdown, setShowExportBADropdown,
    showInputBADropdown, setShowInputBADropdown, baRowActionDropdownId, setBaRowActionDropdownId, setDetailViewItem,
    exportBAOnlyExcel, exportBAOnlyPDF, createInvoiceFromBA, openBAModal, openCreateModal,
    handleGenerateInvoiceFromBA, handleDelete, handleVerifyBA, handleApproveBA, query = "", onNotice, handleAccrueBA, accountingJournals: rawAccountingJournals,
    deletingKey, actionLoadingKey, loadData, user, can = () => false, canVerifyBA, canApproveInvoice
  } = (c || {}) as Record<string, any>;
  // Site yang boleh dibuatkan BA mengikuti scope RBAC user (SITE hanya site miliknya).
  const siteScope = user ? companyScopeOf(user) : { all: false, codes: [] as string[] };
  const baSiteOptions = BA_SITES.filter((s) => siteScope.all || siteScope.codes.includes(s.code));
  const [quickNoteModalItem, setQuickNoteModalItem] = useState<any | null>(null);
  const [showMappings, setShowMappings] = useState(false);
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const pendingVolumeLedgers: any[] = Array.isArray(rawPendingVolumeLedgers) ? rawPendingVolumeLedgers : [];
  const accountingJournals: any[] = Array.isArray(rawAccountingJournals) ? rawAccountingJournals : [];
  const safeBaRows: any[] = baRows;
        const availablePeriods: any[] = Array.from(new Set(safeBaRows.map((r) => r?.workPeriod).filter(Boolean)));

        const periodRows = periodFilter === "All" ? safeBaRows : safeBaRows.filter((r) => r?.workPeriod === periodFilter);

        // Helper: Check if BA already has all required invoices created
        const isBAInvoiced = (r: any) => {
          if (!r) return false;
          const invStatus = getBAInvoiceStatus(r, invoiceRows);
          return invStatus.isFullyInvoiced;
        };

        // Stage 1: Draft / Joint Survey (belum diajukan)
        const isStageDraft = (r: any) => r.statusBA === "Draft";
        // Stage 2: diajukan (Submit) s.d. menunggu approval Manager
        const isStageVerif = (r: any) => (r.statusBA || "").startsWith("Submit") || r.statusBA === "Pending Berita Acara" || r.statusBA === "Pending" || r.statusBA === "Pending BAI" || r.statusBA === "Verified" || (r.statusBA === "Ready to Invoice" && !isBAInvoiced(r));
        const stageDraftRows = periodRows.filter(isStageDraft);
        const stageDraftNominal = stageDraftRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Stage 2: Verifikasi Internal SPV
        const stageVerifRows = periodRows.filter(isStageVerif);
        const stageVerifNominal = stageVerifRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Stage 3: Revisi / Tertahan
        const stageRevisiRows = periodRows.filter((r) => r.statusBA === "Revisi" || (r.statusBA || "").startsWith("Reject"));
        const stageRevisiNominal = stageRevisiRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Stage 4: Siap Terbit Invoice (HANYA YANG BELUM TERBIT INVOICE)
        const stageReadyRows = periodRows.filter((r) => isBAApproved(r) && !isBAInvoiced(r));
        const stageReadyNominal = stageReadyRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Stage 5: Arsip (HANYA YANG BENAR-BENAR SUDAH ADA INVOICENYA)
        const stageArsipRows = periodRows.filter((r) => (r.statusBA === "Ready to Invoice" || r.statusBA === "Approved" || r.statusBA === "Invoiced" || r.statusBA === "Arsip") && isBAInvoiced(r));
        const stageArsipNominal = stageArsipRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Top Summary Calculations
        const nominalApprovedPeriod = stageReadyNominal;
        const baOnProgressNominal = stageDraftNominal + stageVerifNominal + stageRevisiNominal;
        const baOnProgressCount = stageDraftRows.length + stageVerifRows.length + stageRevisiRows.length;

        const estTotalRevPeriod = periodRows.reduce((acc, r) => acc + (r.workAmount || 0), 0);

        const filteredBARows = baRows.filter((r) => {
          const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
          if (!matchQ) return false;
          if (periodFilter !== "All" && r.workPeriod !== periodFilter) return false;
          if (baFilter === "Submit") return isStageDraft(r);
          if (baFilter === "Pending Berita Acara") return isStageVerif(r);
          if (baFilter === "Revisi") return r.statusBA === "Revisi" || (r.statusBA || "").startsWith("Reject");
          if (baFilter === "Ready to Invoice") return isBAApproved(r) && !isBAInvoiced(r);
          if (baFilter === "Arsip") return (r.statusBA === "Ready to Invoice" || r.statusBA === "Approved" || r.statusBA === "Invoiced" || r.statusBA === "Arsip") && isBAInvoiced(r);
          return true;
        });

        const groupedCustomers: any[] = Array.from(new Set(filteredBARows.map((r) => r.customerCode || "OTHER")));

        return (
          <>
            {/* Header & Filter Periode Bar — FEAST Enterprise Standard */}
            <div className="bg-white border border-slate-200 p-3.5 sm:p-4 shadow-sm space-y-3" style={{ borderRadius: 4 }}>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-[3px] bg-[#FBF6F0] border border-[#E7D3BC] text-[#A57C50] shrink-0">
                    <Calendar className="w-4 h-4 text-[#A57C50]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Siklus & Proyeksi Berita Acara ({periodFilter === "All" ? "Semua Periode" : `Periode ${periodFilter}`})
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                  {/* Filter Periode Dropdown */}
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-[3px] border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Periode:
                    </span>
                    <select
                      className="bg-transparent text-slate-900 font-semibold text-xs focus:outline-none cursor-pointer"
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                    >
                      <option value="All">Semua Periode</option>
                      {availablePeriods.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown 1: Export BA */}
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[3px] bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                      onClick={() => setShowExportBADropdown(!showExportBADropdown)}
                      title="Export Laporan Berita Acara (BA)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Export BA</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {showExportBADropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowExportBADropdown(false)} />
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-[4px] shadow-lg border border-slate-200 py-1 z-20 text-xs font-semibold divide-y divide-slate-100">
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition cursor-pointer"
                            onClick={() => {
                              exportBAOnlyExcel();
                              setShowExportBADropdown(false);
                            }}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Excel BA
                          </button>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
                            onClick={() => {
                              exportBAOnlyPDF();
                              setShowExportBADropdown(false);
                            }}
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-600" /> Export PDF BA
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {(canVerifyBA || canApproveInvoice) && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[3px] bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                      onClick={() => setShowMappings(true)}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Akun Accurate</span>
                    </button>
                  )}

                  {/* Input / Tambah BA: user SITE hanya site miliknya (tanpa dropdown), HO semua site */}
                  {!can("ba_tracker", "write") ? null : !siteScope.all ? (
                    <div className="flex items-center gap-1.5">
                      {baSiteOptions.map((s) => (
                        <button
                          key={s.code}
                          type="button"
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 shrink-0 cursor-pointer"
                          style={{ background: "#A57C50", borderRadius: 3 }}
                          onClick={() => openCreateModal("ba", { customerCode: s.code })}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat BA {s.code}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[3px] bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                        onClick={() => openCreateModal("pending_volume")}
                      >
                        <Layers className="w-3.5 h-3.5 text-[#6E5033]" />
                        <span>Input Pending Volume</span>
                      </button>
                    </div>
                  ) : (
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 shrink-0 cursor-pointer"
                      style={{ background: "#A57C50", borderRadius: 3 }}
                      onClick={() => setShowInputBADropdown(!showInputBADropdown)}
                      title="Tambah BA Baru atau Input Pending Volume"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Input / Tambah BA</span>
                      <ChevronDown className="w-3 h-3 text-white/80" />
                    </button>

                    {showInputBADropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowInputBADropdown(false)} />
                        <div className="absolute right-0 mt-1 w-64 bg-white rounded-[4px] shadow-lg border border-slate-200 py-1 z-20 text-xs font-semibold divide-y divide-slate-100">
                          {baSiteOptions.map((s) => (
                            <button
                              key={s.code}
                              type="button"
                              className="w-full px-3 py-2 text-left text-slate-800 hover:bg-[#FBF6F0] flex items-center gap-2 transition cursor-pointer"
                              onClick={() => {
                                openCreateModal("ba", { customerCode: s.code });
                                setShowInputBADropdown(false);
                              }}
                            >
                              <Building2 className="w-3.5 h-3.5 text-[#A57C50] shrink-0" />
                              <span>Buat BA {s.label}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-slate-800 hover:bg-[#FBF6F0] flex items-center gap-2 transition cursor-pointer"
                            onClick={() => {
                              openCreateModal("pending_volume");
                              setShowInputBADropdown(false);
                            }}
                          >
                            <Layers className="w-3.5 h-3.5 text-[#6E5033] shrink-0" />
                            <span>Input Pending Volume</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  )}
                </div>
              </div>

              {/* TOP CALCULATION STAT CARDS (4 CARDS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-0.5">
                {/* Card 1: Total BA Siap Invoice (Approved) */}
                <div className="p-4 bg-white border border-slate-200 shadow-sm space-y-1 relative" style={{ borderRadius: 4 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Siap Invoice
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[3px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {stageReadyRows.length} Dokumen
                    </span>
                  </div>
                  <div className="text-xl font-bold font-tabular text-slate-900 pt-0.5 truncate">
                    {formatIDR(stageReadyNominal)}
                  </div>
                  <div className="text-[11px] text-slate-400">Total BA disetujui</div>
                </div>

                {/* Card 2: BA On Progress */}
                <div className="p-4 bg-white border border-slate-200 shadow-sm space-y-1 relative" style={{ borderRadius: 4 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> BA On Progress
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[3px] bg-amber-50 text-amber-800 border border-amber-200">
                      {baOnProgressCount} Dokumen
                    </span>
                  </div>
                  <div className="text-xl font-bold font-tabular text-slate-900 pt-0.5 truncate">
                    {formatIDR(baOnProgressNominal)}
                  </div>
                  <div className="text-[11px] text-slate-400">Draft, verifikasi & revisi</div>
                </div>

                {/* Card 3: Pending Volume */}
                {(() => {
                  const totalPendingDisplay = pendingVolumeLedgers.reduce((sum: number, l: any) => sum + pendingAmount(l.originalOBVolume || 0, l.ob1Rate || 0, l.ob2Rate || 0, l.customerCode), 0);
                  const totalPendingCount = pendingVolumeLedgers.length;

                  return (
                    <div 
                      onClick={() => setShowPendingVolumeDrawer(true)}
                      className="p-4 bg-white border border-slate-200 shadow-sm hover:border-[#A57C50] transition cursor-pointer space-y-1 relative group"
                      style={{ borderRadius: 4 }}
                      title="Buka Kartu Pending Volume"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-slate-600" /> Pending Volume
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[3px] bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-0.5">
                          <span>{totalPendingCount} Catatan</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                      <div className="text-xl font-bold font-tabular text-slate-900 pt-0.5 truncate">
                        {formatIDR(totalPendingDisplay)}
                      </div>
                      <div className="text-[11px] text-slate-400">Amount (IDR)</div>
                    </div>
                  );
                })()}

                {/* Card 4: Estimasi Total Revenue */}
                <div className="p-4 bg-white border border-slate-200 shadow-sm space-y-1 relative" style={{ borderRadius: 4 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#A57C50]" /> Estimasi Revenue
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[3px] bg-[#FBF6F0] text-[#A57C50] border border-[#E7D3BC]">
                      {periodFilter === "All" ? "Semua" : periodFilter}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-tabular text-slate-900 pt-0.5 truncate">
                    {formatIDR(estTotalRevPeriod)}
                  </div>
                  <div className="text-[11px] text-slate-400">Nilai total pengerjaan</div>
                </div>
              </div>
            </div>

            {/* Grouped Table Panel */}
            <Panel title="Daftar Berita Acara Pekerjaan">
              {/* CHEVRON / ARROW PROCESS STEPPER FILTER */}
              <div className="space-y-1.5 mb-2.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#A57C50]" /> Alur Siklus Dokumen
                  </span>
                  {baFilter !== "All" && (
                    <button
                      type="button"
                      onClick={() => setBaFilter("All")}
                      className="text-[11px] font-semibold text-[#A57C50] hover:text-[#8C6740] cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset Filter
                    </button>
                  )}
                </div>
                {/* Process Bar Container */}
                <div className="w-full overflow-x-auto pb-1.5 no-scrollbar">
                  <div className="flex items-stretch min-w-[900px] bg-slate-100 p-1 border border-slate-200 gap-1" style={{ borderRadius: 4 }}>
                    {/* Step 1: Draft & Survey */}
                    <div

                      onClick={() => setBaFilter(baFilter === "Submit" ? "All" : "Submit")}
                      style={{
                        clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)",
                      }}
                      className={`flex-1 min-w-[170px] py-1.5 pl-3.5 pr-6 transition-all cursor-pointer select-none relative ${
                        baFilter === "Submit"
                          ? "bg-slate-800 text-white shadow-md z-10 brightness-110"
                          : "bg-white hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                          <Pickaxe size={12} className={baFilter === "Submit" ? "text-cyan-400" : "text-slate-600"} />
                          1. Draft & Survey
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                          baFilter === "Submit" ? "bg-slate-700 text-cyan-300 border border-slate-600" : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}>
                          {stageDraftRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-0.5 font-mono font-bold text-xs whitespace-nowrap ${baFilter === "Submit" ? "text-white" : "text-slate-900"}`}>
                        {formatIDR(stageDraftNominal)}
                      </div>
                    </div>

                    {/* Step 2: Verifikasi SPV */}
                    <div
                      onClick={() => setBaFilter(baFilter === "Pending Berita Acara" ? "All" : "Pending Berita Acara")}
                      style={{
                        clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)",
                      }}
                      className={`flex-1 min-w-[170px] py-1.5 pl-6 pr-6 transition-all cursor-pointer select-none relative ${
                        baFilter === "Pending Berita Acara"
                          ? "bg-amber-600 text-white shadow-md z-10 brightness-105"
                          : "bg-white hover:bg-amber-50/70 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                          <ShieldCheck size={12} className={baFilter === "Pending Berita Acara" ? "text-amber-200" : "text-amber-600"} />
                          2. Verifikasi
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                          baFilter === "Pending Berita Acara" ? "bg-amber-800 text-amber-100 border border-amber-500" : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}>
                          {stageVerifRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-0.5 font-mono font-bold text-xs whitespace-nowrap ${baFilter === "Pending Berita Acara" ? "text-white" : "text-amber-900"}`}>
                        {formatIDR(stageVerifNominal)}
                      </div>
                    </div>

                    {/* Step 3: Revisi / Tertahan */}
                    <div
                      onClick={() => setBaFilter(baFilter === "Revisi" ? "All" : "Revisi")}
                      style={{
                        clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)",
                      }}
                      className={`flex-1 min-w-[170px] py-1.5 pl-6 pr-6 transition-all cursor-pointer select-none relative ${
                        baFilter === "Revisi"
                          ? "bg-rose-600 text-white shadow-md z-10 brightness-105"
                          : "bg-white hover:bg-rose-50/70 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                          <AlertCircle size={12} className={baFilter === "Revisi" ? "text-rose-200" : "text-rose-600"} />
                          3. Revisi
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                          baFilter === "Revisi" ? "bg-rose-800 text-rose-100 border border-rose-500" : "bg-rose-100 text-rose-900 border border-rose-300"
                        }`}>
                          {stageRevisiRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-0.5 font-mono font-bold text-xs whitespace-nowrap ${baFilter === "Revisi" ? "text-white" : "text-rose-900"}`}>
                        {formatIDR(stageRevisiNominal)}
                      </div>
                    </div>

                    {/* Step 4: Siap Terbit Invoice */}
                    <div
                      onClick={() => setBaFilter(baFilter === "Ready to Invoice" ? "All" : "Ready to Invoice")}
                      style={{
                        clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)",
                      }}
                      className={`flex-1 min-w-[170px] py-1.5 pl-6 pr-6 transition-all cursor-pointer select-none relative ${
                        baFilter === "Ready to Invoice"
                          ? "bg-emerald-600 text-white shadow-md z-10 brightness-105"
                          : "bg-white hover:bg-emerald-50/70 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                          <FileCheck size={12} className={baFilter === "Ready to Invoice" ? "text-emerald-200" : "text-emerald-700"} />
                          4. Siap Invoice
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                          baFilter === "Ready to Invoice" ? "bg-emerald-900 text-emerald-100 border border-emerald-500" : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}>
                          {stageReadyRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-0.5 font-mono font-bold text-xs whitespace-nowrap ${baFilter === "Ready to Invoice" ? "text-white" : "text-emerald-900"}`}>
                        {formatIDR(stageReadyNominal)}
                      </div>
                    </div>

                    {/* Step 5: Arsip (Sudah Terbit Invoice) */}
                    <div
                      onClick={() => setBaFilter(baFilter === "Arsip" ? "All" : "Arsip")}
                      style={{
                        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)",
                      }}
                      className={`flex-1 min-w-[170px] py-1.5 pl-6 pr-3.5 transition-all cursor-pointer select-none relative ${
                        baFilter === "Arsip"
                          ? "bg-purple-800 text-white shadow-md z-10 brightness-105"
                          : "bg-white hover:bg-purple-50/70 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                          <Archive size={12} className={baFilter === "Arsip" ? "text-purple-200" : "text-purple-700"} />
                          5. Arsip
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                          baFilter === "Arsip" ? "bg-purple-950 text-purple-200 border border-purple-600" : "bg-purple-100 text-purple-900 border border-purple-300"
                        }`}>
                          {stageArsipRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-0.5 font-mono font-bold text-xs whitespace-nowrap ${baFilter === "Arsip" ? "text-white" : "text-purple-900"}`}>
                        {formatIDR(stageArsipNominal)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="data-table w-full min-w-[1100px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold text-[10px] uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2 whitespace-nowrap min-w-[190px]">Identitas BA & Customer</th>
                      <th className="p-2 whitespace-nowrap min-w-[95px]">Periode & SOW</th>
                      <th className="p-2 text-right whitespace-nowrap min-w-[135px]">Nilai Klaim (Rp)</th>
                      <th className="p-2 whitespace-nowrap min-w-[140px]">Alur Tanggal & Lead Time</th>
                      <th className="p-2 text-center whitespace-nowrap min-w-[140px]">Status Siklus BA</th>
                      <th className="p-2 whitespace-nowrap min-w-[100px]">Berkas PDF</th>
                      <th className="p-2 min-w-[180px]">Catatan / Bottleneck</th>
                      <th className="p-2 text-right whitespace-nowrap min-w-[140px] bg-slate-100 text-slate-800">Aksi & Integrasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
                    {groupedCustomers.map((custCode) => {
                      const custRows = filteredBARows.filter((r) => (r.customerCode || "OTHER") === custCode)
                        .sort((a, b) => parsePeriodToMonthIndex(b.workPeriod || "") - parsePeriodToMonthIndex(a.workPeriod || ""));
                      const custSubtotal = custRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

                      return (
                        <Fragment key={custCode}>
                          {/* Client Header Row */}
                          <tr className="bg-slate-50/95 font-extrabold text-xs border-t border-b border-slate-200">
                            <td colSpan={8} className="p-2 bg-slate-100/70 uppercase tracking-wider relative">
                              <div className="sticky left-3 flex items-center gap-2 z-10">
                                <span className="w-2 h-2 rounded-full bg-cyan-700 inline-block"></span>
                                <span className="font-extrabold text-slate-900 text-xs tracking-wide">{custCode} • {getCustomerOfficialName(custCode)}</span>
                                <span className="text-[10px] text-slate-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                                  {custRows.length} Dokumen BA
                                </span>
                              </div>
                            </td>
                          </tr>

                          {/* Client Rows */}
                          {custRows.map((row: any) => {
                            const invStatus = getBAInvoiceStatus(row, invoiceRows);
                            const isInvoiced = invStatus.isFullyInvoiced;
                            const isReady = isBAApproved(row) && !isInvoiced;
                            const linkedInvoice = invStatus.createdMiningInv || invStatus.createdMDOInv || invStatus.createdInvoices[0] || null;
                            const isDropdownOpen = baRowActionDropdownId === row.id;

                            return (
                              <tr key={row.id} className={`hover:bg-slate-50/90 transition group ${isDropdownOpen ? "relative z-30" : ""}`}>
                                {/* Kolom 1: Identitas BA & Customer */}
                                <td className="p-2">
                                  <div className="space-y-0.5">
                                    <div className="font-mono font-bold text-slate-900 text-xs">
                                      {row.baNumber}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                      <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-900 font-bold text-[9px]" title={getCustomerOfficialName(row.customerCode)}>
                                        {row.customerCode || "—"} • {getCustomerOfficialName(row.customerCode)}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium text-[9px]">
                                        {row.dataSource || "Joint Survey"}
                                      </span>
                                      <span className="text-slate-500 font-medium text-[9px]">
                                        PIC: {row.picAAP || "Site Engineer"}
                                      </span>
                                    </div>
                                    {/* Ratio OB:Coal Indicator (for BGG / Coal clients) */}
                                    {row.customerCode === "BGG" && row.coalVolume && row.coalVolume > 0 && row.obVolume && (
                                      <div className="pt-0.5 flex items-center gap-1">
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-slate-100 text-slate-800">
                                          SR {(row.obVolume / row.coalVolume).toFixed(2)} : 1
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Kolom 2: Periode & SOW */}
                                <td className="p-2 text-slate-700 whitespace-nowrap">
                                  <div className="font-bold text-slate-900 text-xs">{row.workPeriod || "-"}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {row.items?.length ? `${row.items.length} Rincian Item` : "Operasional"}
                                  </div>
                                </td>

                                {/* Kolom 3: Nilai Klaim (Rp) */}
                                <td className="p-2 text-right whitespace-nowrap">
                                  <div className="font-mono font-bold text-emerald-700 text-xs">
                                    {formatIDR(row.workAmount || 0)}
                                  </div>
                                  {row.initialWorkAmount && row.adjustedWorkAmount && row.initialWorkAmount !== row.adjustedWorkAmount && (() => {
                                    const diffVal = row.adjustedWorkAmount - row.initialWorkAmount;
                                    const devPct = row.initialWorkAmount > 0 ? (Math.abs(diffVal) / row.initialWorkAmount) * 100 : 0;
                                    const isExcess = devPct > 3.0;
                                    return (
                                      <div className="space-y-0.5 pt-0.5">
                                        <div className={`text-[9px] font-mono font-bold ${diffVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                          {diffVal >= 0 ? `+${formatIDR(diffVal)} (Survey)` : `-${formatIDR(Math.abs(diffVal))} (Survey)`}
                                        </div>
                                        {isExcess && (
                                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Deviasi hasil joint survey melebihi batas toleransi 3%">
                                            ⚠️ Deviasi {devPct.toFixed(1)}%
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>

                                {/* Kolom 4: Alur Tanggal & Lead Time */}
                                <td className="p-2 text-[10px] text-slate-700 whitespace-nowrap">
                                  <div>
                                    <span className="text-slate-400 font-medium">Diajukan: </span>
                                    <span className="font-semibold">{row.baSubmittedDate ? new Date(row.baSubmittedDate).toLocaleDateString("id-ID") : "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-medium">TTD Klien: </span>
                                    <span className="font-semibold">{row.baSignedDate ? new Date(row.baSignedDate).toLocaleDateString("id-ID") : "-"}</span>
                                    {row.leadTimeDays ? (
                                      <span className="ml-1 px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-bold text-[9px]">
                                        {row.leadTimeDays} hari
                                      </span>
                                    ) : null}
                                  </div>
                                </td>

                                {/* Kolom 5: Status Siklus BA */}
                                <td className="p-2 text-center whitespace-nowrap">
                                  {renderBAStatusBadge(row.statusBA, row.invoiceNoLinked, isInvoiced, row, invoiceRows)}
                                  {(() => {
                                    const matchedAccrual = accountingJournals.find((j: any) => j.sourceModule === "BA_ACCRUAL" && j.sourceReference === row.baNumber && j.status !== "Void");
                                    if (!matchedAccrual) return null;
                                    const isRev = matchedAccrual.status === "Reversed";
                                    return (
                                      <div className="mt-1">
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${isRev ? "bg-slate-50 text-slate-500 border-slate-300" : "bg-blue-50 text-blue-800 border-blue-300"}`} title={`Jurnal Akrual: ${matchedAccrual.journalNumber} (${matchedAccrual.status})`}>
                                          <Scale size={10} className={isRev ? "text-slate-400" : "text-blue-700"} />
                                          {matchedAccrual.journalNumber} {isRev ? "(Cleared)" : "(Akrual)"}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </td>

                                {/* Kolom 6: Berkas PDF */}
                                <td className="p-2 whitespace-nowrap text-[10px]">
                                  <div className="flex flex-col gap-0.5">
                                    {row.draftBAPath && (
                                      <a
                                        href={resolveDocumentUrl(row.draftBAPath)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-900 hover:underline font-bold transition cursor-pointer"
                                        title="Buka Draft PDF BA (New Tab)"
                                      >
                                        <FileText size={11} /> Draft PDF
                                      </a>
                                    )}
                                    {row.finalBAPath && (
                                      <a
                                        href={resolveDocumentUrl(row.finalBAPath)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline font-bold transition cursor-pointer"
                                        title="Buka Final PDF BA (New Tab)"
                                      >
                                        <CheckCircle size={11} /> Final PDF
                                      </a>
                                    )}
                                    {!row.draftBAPath && !row.finalBAPath && (
                                      <span className="text-[9px] text-slate-400 italic">Belum Ada PDF</span>
                                    )}
                                  </div>
                                </td>

                                {/* Kolom 7: Catatan & Bottleneck (Click-to-Edit) */}
                                <td
                                  className="p-2 min-w-[180px] cursor-pointer group/note hover:bg-amber-50/70 transition rounded-lg"
                                  onClick={() => setQuickNoteModalItem(row)}
                                  title="Klik untuk cepat update Catatan & Bottleneck Harian"
                                >
                                  <div className="text-[10px] line-clamp-2">
                                    {row.notesBottleneck && <span className="font-bold text-slate-800 block">{row.notesBottleneck}</span>}
                                    <span className="text-slate-600 group-hover/note:text-amber-900">{row.notes || "-"}</span>
                                    <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 font-bold opacity-0 group-hover/note:opacity-100 transition mt-0.5 ml-1">
                                      <StickyNote size={10} /> Edit Keterangan
                                    </span>
                                  </div>
                                </td>

                                {/* Kolom 8: Aksi & Integrasi */}
                                <td className={`p-2 text-right whitespace-nowrap bg-white group-hover:bg-slate-50 ${isDropdownOpen ? "relative z-30" : ""}`}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* POS: Kondisi 1 dari 2 Invoice Terbit (Parsial) */}
                                    {row.customerCode === "POS" && invStatus.isPartiallyInvoiced && (
                                      <div className="flex items-center gap-1">
                                        {/* Tombol Terbitkan Sisa Invoice */}
                                        {!can("invoice", "write") ? null : invStatus.createdMiningInv ? (
                                          <button
                                            type="button"
                                            className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                            onClick={() => createInvoiceFromBA(row, "MDO")}
                                            title="Terbitkan Sisa Invoice Kategori 2: Mine Development (MDO)"
                                          >
                                            <Building2 size={13} />
                                            <span>+ Inv MDO</span>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            className="px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                            onClick={() => createInvoiceFromBA(row, "Operation & Mining")}
                                            title="Terbitkan Sisa Invoice Kategori 1: Operations & Mining"
                                          >
                                            <Pickaxe size={13} />
                                            <span>+ Inv Mining</span>
                                          </button>
                                        )}

                                        {/* Tombol Buka Invoice yang Sudah Dibuat */}
                                        <button
                                          type="button"
                                          className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-950 font-extrabold text-[10.5px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                          onClick={() => {
                                            const targetInv = invStatus.createdMiningInv || invStatus.createdMDOInv;
                                            if (targetInv) {
                                              setDetailViewItem({ type: "invoice", data: targetInv });
                                              onNotice(`Membuka Detail Invoice ${targetInv.invoiceNo}`);
                                            }
                                          }}
                                          title={`Lihat Invoice yang sudah terbit (${invStatus.createdMiningInv?.invoiceNo || invStatus.createdMDOInv?.invoiceNo})`}
                                        >
                                          <Archive size={11} className="text-purple-700" />
                                          <span>{invStatus.createdMiningInv ? "Inv Mining ✓" : "Inv MDO ✓"}</span>
                                          <ExternalLink size={10} className="text-purple-700" />
                                        </button>
                                      </div>
                                    )}

                                    {/* POS: Kondisi Belum Ada Invoice Sama Sekali (0 dari 2) */}
                                    {can("invoice", "write") && row.customerCode === "POS" && isReady && !invStatus.isPartiallyInvoiced && (
                                      <div className="relative inline-block text-left">
                                        <button
                                          type="button"
                                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                          onClick={() => setBaRowActionDropdownId(isDropdownOpen ? null : row.id)}
                                          title="Pilih Jenis Invoice POS yang ingin Diterbitkan"
                                        >
                                          <Zap size={13} className="text-amber-300 fill-amber-300" />
                                          <span>+ Invoice</span>
                                          <ChevronDown size={12} className="text-emerald-200" />
                                        </button>

                                        {isDropdownOpen && (
                                          <>
                                            <div className="fixed inset-0 z-40" onClick={() => setBaRowActionDropdownId(null)} />
                                            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs font-bold divide-y divide-slate-100 text-left">
                                              <button
                                                type="button"
                                                className="w-full px-3 py-2 text-slate-800 hover:bg-cyan-50 hover:text-cyan-900 flex items-start gap-2 transition cursor-pointer"
                                                onClick={() => {
                                                  setBaRowActionDropdownId(null);
                                                  createInvoiceFromBA(row, "Operation & Mining");
                                                }}
                                              >
                                                <Pickaxe size={15} className="text-cyan-700 mt-0.5 shrink-0" />
                                                <div>
                                                  <strong className="block text-slate-900 font-extrabold text-[11px]">1. Inv Operations & Mining</strong>
                                                  <span className="text-[10px] text-slate-500 font-normal">OB, Top Soil, Ore & Overhaul</span>
                                                </div>
                                              </button>
                                              <button
                                                type="button"
                                                className="w-full px-3 py-2 text-slate-800 hover:bg-indigo-50 hover:text-indigo-900 flex items-start gap-2 transition cursor-pointer"
                                                onClick={() => {
                                                  setBaRowActionDropdownId(null);
                                                  createInvoiceFromBA(row, "MDO");
                                                }}
                                              >
                                                <Building2 size={15} className="text-indigo-700 mt-0.5 shrink-0" />
                                                <div>
                                                  <strong className="block text-slate-900 font-extrabold text-[11px]">2. Inv Mine Dev (MDO)</strong>
                                                  <span className="text-[10px] text-slate-500 font-normal">Cut & Fill & Access Road</span>
                                                </div>
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}

                                     {/* Tombol Akrualkan Pendapatan (Unbilled AR) */}
                                     {can("accounting", "generate") && (isReady || row.statusBA === "Approved") && !accountingJournals.some((j: any) => j.sourceModule === "BA_ACCRUAL" && j.sourceReference === row.baNumber && j.status !== "Void") && (() => {
                                       const isAccruing = actionLoadingKey === `accrue-ba-${row.id}`;
                                       return (
                                         <button
                                           type="button"
                                           disabled={isAccruing}
                                           className={`px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold text-[10px] shadow-2xs flex items-center gap-1 transition cursor-pointer ${isAccruing ? "opacity-60 cursor-not-allowed" : ""}`}
                                           onClick={() => handleAccrueBA && handleAccrueBA(row.id)}
                                           title="Akrualkan Pendapatan (Unbilled AR) ke General Ledger"
                                         >
                                           {isAccruing ? <Loader2 size={11} className="text-blue-700 animate-spin" /> : <Scale size={11} className="text-blue-700" />}
                                           <span>{isAccruing ? "Mengakrualkan..." : "Akrual AR"}</span>
                                         </button>
                                       );
                                     })()}

                                    {/* Non-POS: Ready to Invoice (1-Click) */}
                                    {can("invoice", "write") && row.customerCode !== "POS" && isReady && (
                                      <button
                                        type="button"
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                        onClick={() => createInvoiceFromBA(row)}
                                        title="Terbitkan Invoice Langsung dari BA ini (1-Click)"
                                      >
                                        <Zap size={13} className="text-amber-300 fill-amber-300" />
                                        <span>+ Invoice</span>
                                      </button>
                                    )}

                                    {/* Selesai Semua (Arsip 2/2 untuk POS atau 1/1 untuk non-POS) */}
                                    {invStatus.isFullyInvoiced && (
                                      <div className="relative inline-block text-left">
                                        {row.customerCode === "POS" ? (
                                          <>
                                            <button
                                              type="button"
                                              className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-950 font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                              onClick={() => setBaRowActionDropdownId(isDropdownOpen ? null : row.id)}
                                              title="Buka Pilihan Invoice yang Sudah Terbit (2 Dokumen)"
                                            >
                                              <Archive size={12} className="text-purple-700" />
                                              <span>2 Inv Terbit</span>
                                              <ChevronDown size={11} className="text-purple-700" />
                                            </button>

                                            {isDropdownOpen && (
                                              <>
                                                <div className="fixed inset-0 z-40" onClick={() => setBaRowActionDropdownId(null)} />
                                                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs font-bold divide-y divide-slate-100 text-left">
                                                  {invStatus.createdMiningInv && (
                                                    <button
                                                      type="button"
                                                      className="w-full px-3 py-2 text-slate-800 hover:bg-cyan-50 hover:text-cyan-900 flex items-start gap-2 transition cursor-pointer"
                                                      onClick={() => {
                                                        setBaRowActionDropdownId(null);
                                                        setDetailViewItem({ type: "invoice", data: invStatus.createdMiningInv });
                                                      }}
                                                    >
                                                      <Pickaxe size={14} className="text-cyan-700 mt-0.5 shrink-0" />
                                                      <div>
                                                        <strong className="block text-slate-900 font-extrabold text-[11px]">1. Inv Operations & Mining</strong>
                                                        <span className="text-[10px] text-slate-500 font-mono font-bold">{invStatus.createdMiningInv.invoiceNo} ↗</span>
                                                      </div>
                                                    </button>
                                                  )}
                                                  {invStatus.createdMDOInv && (
                                                    <button
                                                      type="button"
                                                      className="w-full px-3 py-2 text-slate-800 hover:bg-indigo-50 hover:text-indigo-900 flex items-start gap-2 transition cursor-pointer"
                                                      onClick={() => {
                                                        setBaRowActionDropdownId(null);
                                                        setDetailViewItem({ type: "invoice", data: invStatus.createdMDOInv });
                                                      }}
                                                    >
                                                      <Building2 size={14} className="text-indigo-700 mt-0.5 shrink-0" />
                                                      <div>
                                                        <strong className="block text-slate-900 font-extrabold text-[11px]">2. Inv Mine Dev (MDO)</strong>
                                                        <span className="text-[10px] text-slate-500 font-mono font-bold">{invStatus.createdMDOInv.invoiceNo} ↗</span>
                                                      </div>
                                                    </button>
                                                  )}
                                                </div>
                                              </>
                                            )}
                                          </>
                                        ) : (
                                          <button
                                            type="button"
                                            className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-950 font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                            onClick={() => {
                                              if (linkedInvoice) {
                                                setDetailViewItem({ type: "invoice", data: linkedInvoice });
                                                onNotice(`Membuka Detail Invoice No. ${linkedInvoice.invoiceNo} (${linkedInvoice.customerCode})`);
                                              } else {
                                                onNotice(`Invoice No. ${row.invoiceNoLinked || "-"} terhubung dengan BA ${row.baNumber}.`);
                                              }
                                            }}
                                            title={linkedInvoice ? `Klik untuk Buka Detail Invoice ${linkedInvoice.invoiceNo}` : `Invoice sudah terbit: ${row.invoiceNoLinked || "-"}`}
                                          >
                                            <Archive size={12} className="text-purple-700" />
                                            <span>Inv Terbit</span>
                                            <ExternalLink size={11} className="text-purple-700 ml-0.5" />
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Belum Diverifikasi (Belum Ready to Invoice) */}
                                    {!isReady && !invStatus.isFullyInvoiced && !invStatus.isPartiallyInvoiced && (
                                      !row.verifiedBy && !row.invoiceNoLinked && can("ba_tracker", "verify") ? (
                                        <button
                                          type="button"
                                          disabled={actionLoadingKey === `verify-ba-${row.id}`}
                                          className="px-2.5 py-1 rounded-lg bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-60"
                                          onClick={() => handleVerifyBA(row.id)}
                                          title="Verifikasi BA (Finance Specialist)"
                                        >
                                          <ShieldCheck size={13} />
                                          <span>Verifikasi</span>
                                        </button>
                                      ) : row.verifiedBy && row.statusBA === "Ready to Invoice" && can("ba_tracker", "approve") ? (
                                        <button
                                          type="button"
                                          disabled={actionLoadingKey === `approve-ba-${row.id}`}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-60"
                                          onClick={() => handleApproveBA(row.id)}
                                          title={`Approve Manager (diverifikasi oleh ${row.verifiedBy})`}
                                        >
                                          <CheckCircle2 size={13} />
                                          <span>Approve</span>
                                        </button>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                          {row.verifiedBy ? "Menunggu Approval Manager" : "Menunggu Verifikasi"}
                                        </span>
                                      )
                                    )}

                                    <button
                                      className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition cursor-pointer"
                                      onClick={() => openBAModal(row, false)}
                                      title="View Detail & Audit Trail"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    {can("ba_tracker", "write") && (
                                      <>
                                        <button
                                          className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition cursor-pointer"
                                          onClick={() => setQuickNoteModalItem(row)}
                                          title="Update Keterangan & Bottleneck Harian (Cepat)"
                                        >
                                          <StickyNote size={14} className="text-amber-700" />
                                        </button>
                                        <button
                                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                          onClick={() => openBAModal(row, true)}
                                          title="Edit Berita Acara (Mode Edit)"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                      </>
                                    )}
                                    {can("ba_tracker", "delete") && (() => {
                                       const isDeletingBA = deletingKey === `ba-${row.id}`;
                                       return (
                                         <button
                                           className={`p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer ${isDeletingBA ? "opacity-60 cursor-not-allowed" : ""}`}
                                           onClick={() => handleDelete("ba", row.id)}
                                           disabled={isDeletingBA}
                                           title="Hapus BA"
                                         >
                                           {isDeletingBA ? <Loader2 size={14} className="animate-spin text-rose-600" /> : <Trash2 size={14} />}
                                         </button>
                                       );
                                     })()}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Client Subtotal Footer Row (Di Bawah List per Site) */}
                          <tr className="bg-slate-50/95 font-bold text-xs border-t border-b-2 border-slate-300">
                            <td colSpan={2} className="p-2.5 pl-4 uppercase tracking-wider text-slate-800 font-extrabold text-[11px]">
                              TOTAL {custCode} ({custRows.length} DOKUMEN BA):
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-slate-950 text-xs whitespace-nowrap">
                              {formatIDR(custSubtotal)}
                            </td>
                            <td colSpan={5} className="p-2.5 text-right text-[10.5px] text-slate-500 font-medium italic">
                              Subtotal Berita Acara site {custCode}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}

                    {filteredBARows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                          Tidak ada data Berita Acara untuk filter status ({baFilter}) dan periode ({periodFilter}).
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Summary Grand Footer Table */}
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50/95 text-slate-800 font-bold text-xs uppercase">
                    <tr>
                      <td colSpan={2} className="p-3 font-black text-slate-800 tracking-wider">
                        TOTAL KLAIM BA {periodFilter === "All" ? "SEMUA PERIODE" : periodFilter} — ALL SITE
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-slate-900 font-black">
                        {formatIDR(nominalApprovedPeriod + baOnProgressNominal)}
                      </td>
                      <td colSpan={5} className="p-3 text-right">
                        <div className="flex justify-end items-center gap-4 font-mono text-xs">
                          <div className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <span className="text-emerald-800 font-sans uppercase font-bold text-[10.5px] mr-1.5">Ready to Invoice:</span>
                            <span className="text-emerald-950 font-black text-xs">{formatIDR(nominalApprovedPeriod)}</span>
                          </div>
                          <div className="bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            <span className="text-amber-800 font-sans uppercase font-bold text-[10.5px] mr-1.5">BA On Progress:</span>
                            <span className="text-amber-950 font-extrabold text-xs">{formatIDR(baOnProgressNominal)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Panel>
            <BANotesUpdateModal
              isOpen={Boolean(quickNoteModalItem)}
              baItem={quickNoteModalItem}
              onClose={() => setQuickNoteModalItem(null)}
              onSuccess={() => {
                if (loadData) loadData();
              }}
              onNotice={onNotice}
            />
            {showMappings && <MappingsModal kinds={["ITEM", "CUSTOMER", "PROJECT", "KONTRAK", "SALES"]} base="/api/finance" onClose={() => setShowMappings(false)} onError={onNotice} />}
          </>
        );
}

