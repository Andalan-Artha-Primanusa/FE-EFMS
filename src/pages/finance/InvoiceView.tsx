import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale, Truck, BookOpen } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, approveInvoiceTier2, getFinanceTemplates, User as UserType } from "../../lib/api";

import {
  resolveDocumentUrl, formatIDR, parseNumber, formatThousand, formatDateInput,
  indonesianMonths, formatMonthLabel, formatMonthInput, getRomanMonth,
  generateBANumberPreview, generateInvoiceNumberPreview, getYearFromPeriod,
  generateInvoiceNumber, getBAInvoiceStatus, renderBAStatusBadge,
  getBAStatusForExport, renderInvoiceStatusBadge, parsePeriodToMonthIndex,
  RupiahInput, MonthPickerInput, generateAuditTimeline, getCustomerOfficialName
} from "./helpers";

export function InvoiceView({ c }: { c: any }) {
  const {
    baRows: rawBaRows, isSuper, isFinanceSpecialist, isSPV, isManager, isDirector, invoiceRows: rawInvoiceRows,
    invStatusFilter, setInvStatusFilter, invCardTab, setInvCardTab, invPeriodFilter,
    setInvPeriodFilter, showExportARDropdown, setShowExportARDropdown, showInputARDropdown, setShowInputARDropdown,
    setDetailViewItem, templateRows: rawTemplateRows, exportAROnlyExcel, exportAROnlyPDF, exportCoretaxEFakturCSV, exportEBupotPPh23CSV, openCreateModal,
    openEditModal, handleVerifyInvoice, handleApproveInvoice, handleApproveInvoiceTier1, handleApproveInvoiceTier2, handleDelete,
    sbsPenalties: rawSbsPenalties, sbsPenaltyModalOpen, sbsPenaltyEditItem, handleSaveSBSPenalty, handleDeleteSBSPenalty, openSBSPenaltyModal, closeSBSPenaltyModal,
    query = "", accountingJournals: rawAccountingJournals
  } = (c || {}) as Record<string, any>;
  const templateRows = typeof rawTemplateRows === "function" ? rawTemplateRows : () => [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const sbsPenalties: any[] = Array.isArray(rawSbsPenalties) ? rawSbsPenalties : [];
  const accountingJournals: any[] = Array.isArray(rawAccountingJournals) ? rawAccountingJournals : [];
  const safeInvoiceRows: any[] = invoiceRows;
  const safeBaRows: any[] = baRows;

  // Local state for SBS Penalty Form modal
  const [sbsFormState, setSbsFormState] = useState<{
    id?: number;
    workPeriod: string;
    claimRefNo: string;
    description: string;
    claimAmount: number;
    deductedAmount: number;
    status: "Pending Cut" | "Deducted";
    notes: string;
  }>({
    workPeriod: "Mar-26",
    claimRefNo: "",
    description: "",
    claimAmount: 0,
    deductedAmount: 0,
    status: "Pending Cut",
    notes: ""
  });

  useEffect(() => {
    if (sbsPenaltyEditItem) {
      setSbsFormState({
        id: sbsPenaltyEditItem.id,
        workPeriod: sbsPenaltyEditItem.workPeriod || "Mar-26",
        claimRefNo: sbsPenaltyEditItem.claimRefNo || "",
        description: sbsPenaltyEditItem.description || "",
        claimAmount: Number(sbsPenaltyEditItem.claimAmount || 0),
        deductedAmount: Number(sbsPenaltyEditItem.deductedAmount || 0),
        status: sbsPenaltyEditItem.status || "Pending Cut",
        notes: sbsPenaltyEditItem.notes || ""
      });
    } else {
      setSbsFormState({
        workPeriod: "Mar-26",
        claimRefNo: "",
        description: "",
        claimAmount: 0,
        deductedAmount: 0,
        status: "Pending Cut",
        notes: ""
      });
    }
  }, [sbsPenaltyEditItem, sbsPenaltyModalOpen]);

  return (
        <div className="space-y-6">
          {(() => {
            const targetPeriodIndex = parsePeriodToMonthIndex(invPeriodFilter);
            const periodFilteredUnpaidInvoices = safeInvoiceRows.filter((r) => {
              if (invPeriodFilter !== "All") {
                const rowPeriodIndex = parsePeriodToMonthIndex(r?.workPeriod || "");
                if (rowPeriodIndex > targetPeriodIndex) return false;
              }
              const outstandingAmount = r?.outstanding ?? ((r?.totalInvoice || 0) - (r?.totalPaid || 0));
              if (outstandingAmount <= 0 || r?.status === "Paid") return false;
              return true;
            });
            const totalARAndalan = periodFilteredUnpaidInvoices.reduce((acc, r) => acc + (r?.outstanding ?? ((r?.totalInvoice || 0) - (r?.totalPaid || 0))), 0);

            // Penalty & Section P deductions dataset dynamically derived from live SBS Penalty Ledger (Eksklusif SBS Project)
            const penaltyDataRows = sbsPenalties
              .filter((p) => {
                if (invPeriodFilter !== "All") {
                  const rowPeriodIndex = parsePeriodToMonthIndex(p?.workPeriod || "");
                  if (rowPeriodIndex > targetPeriodIndex) return false;
                }
                return true;
              })
              .map((p) => ({
                id: p.id,
                customerCode: "SBS",
                workPeriod: p.workPeriod || "-",
                invoiceNo: p.claimRefNo || "-",
                claimRefNo: p.claimRefNo || "-",
                remarks: p.description || p.notes || "Klaim Penalti Section P SBS",
                amount: Number(p.claimAmount || 0),
                deductedAmount: Number(p.deductedAmount || 0),
                invoiceDate: p.createdAt ? p.createdAt.substring(0, 10) : "-",
                invoiceSubmission: "-",
                dueDate: "-",
                outstanding: Number(p.outstandingAmount ?? (Number(p.claimAmount || 0) - Number(p.deductedAmount || 0))),
                status: p.status || "Pending Cut",
                rawItem: p
              }));
            const totalPenaltyUncut = penaltyDataRows
              .filter((p) => p.status === "Pending Cut")
              .reduce((acc, r) => acc + (r.outstanding || 0), 0);

            // Subject To Invoice dataset dynamically derived from live unbilled BA Trackers
            const subjectToInvoiceDataRows = safeBaRows
              .filter((ba) => {
                if (invPeriodFilter !== "All") {
                  const rowPeriodIndex = parsePeriodToMonthIndex(ba?.workPeriod || "");
                  if (rowPeriodIndex > targetPeriodIndex) return false;
                }
                const isUnlinked = !ba.invoiceNoLinked || ba.invoiceNoLinked === "-" || ba.invoiceNoLinked.trim() === "";
                return isUnlinked;
              })
              .map((ba) => ({
                id: `sti-ba-${ba.id}`,
                customerCode: (ba.customerCode || "POS").toUpperCase(),
                workPeriod: ba.workPeriod || "-",
                invoiceNo: ba.baNumber || ba.draftBARefNo || "-",
                remarks: ba.notes || `Klaim BA Lapangan (${ba.activityGroup || "OB & Coal"})`,
                amount: Number(ba.workAmount || 0),
                invoiceDate: ba.baSubmittedDate || ba.createdAt || "-",
                invoiceSubmission: "-",
                dueDate: "-",
                outstanding: Number(ba.workAmount || 0),
                status: ba.statusBA === "Approved" || ba.statusBA === "Ready to Invoice" ? "Ready to Invoice" : (ba.statusBA || "Draft")
              }));
            const totalSubjectToInvoice = subjectToInvoiceDataRows.reduce((acc, r) => acc + (r.outstanding || 0), 0);

            return (
              <div className="space-y-6">
                {/* 3 INTERACTIVE STAT CARDS CONTAINER WITH ACTIVITY GROUP TOGGLE */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
                        <Receipt size={18} />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                          Master Penagihan & Outstanding AR
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                      {/* Period Filter Dropdown for Invoice & AR Aging Cut-off */}
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">PERIODE:</span>
                        <select
                          className="bg-white text-slate-900 font-bold text-xs px-2 py-1 rounded border border-slate-300 focus:border-cyan-700 focus:outline-none cursor-pointer shadow-2xs"
                          value={invPeriodFilter}
                          onChange={(e) => setInvPeriodFilter(e.target.value)}
                        >
                          <option value="All">Semua Periode</option>
                          <option value="Agt-26">Agt-26 (Bulan Berjalan)</option>
                          <option value="Jul-26">Jul-26</option>
                          <option value="Jun-26">Jun-26</option>
                          <option value="Mei-26">Mei-26</option>
                          <option value="Apr-26">Apr-26</option>
                          <option value="Mar-26">Mar-26</option>
                          <option value="Feb-26">Feb-26</option>
                          <option value="Jan-26">Jan-26</option>
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <select
                          className="bg-white text-slate-900 font-bold text-xs px-2 py-1 rounded border border-slate-300 focus:border-cyan-700 focus:outline-none cursor-pointer shadow-2xs"
                          value={invStatusFilter}
                          onChange={(e) => setInvStatusFilter(e.target.value)}
                        >
                          <option value="All">Semua Status</option>
                          <option value="Draft">Draft (Menunggu Approval)</option>
                          <option value="Approved">Disetujui Manager FATB</option>
                          <option value="Paid">Paid (Lunas)</option>
                          <option value="Tax_Reported">Tax Reported (SPT)</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>

                      {/* Dropdown 1: Export AR */}
                      <div className="relative z-30">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-cyan-700 text-cyan-800 hover:bg-cyan-50 shadow-2xs transition cursor-pointer shrink-0"
                          onClick={() => setShowExportARDropdown(!showExportARDropdown)}
                          title="Export Laporan AR Outstanding"
                        >
                          <FileText size={14} />
                          <span>Export AR</span>
                          <ChevronDown size={13} className="text-cyan-700" />
                        </button>

                        {showExportARDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowExportARDropdown(false)} />
                            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50 text-xs font-bold divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportAROnlyExcel();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileSpreadsheet size={15} className="text-emerald-600" /> Export Excel AR Outstanding
                              </button>
                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportAROnlyPDF();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileText size={15} className="text-rose-600" /> Export PDF AR Outstanding
                              </button>
                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-violet-50 hover:text-violet-800 flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportCoretaxEFakturCSV();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileSpreadsheet size={15} className="text-violet-600" /> e-Faktur Coretax (PPN 12%)
                              </button>
                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportEBupotPPh23CSV();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileText size={15} className="text-amber-600" /> e-Bupot PPh 23 (2%)
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Button: Catat Klaim Penalti SBS (khusus tab Penalty Uncut) */}
                      {invCardTab === "PENALTY_UNCUT" && (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition shrink-0 cursor-pointer"
                          onClick={() => openSBSPenaltyModal()}
                          title="Catat Klaim Denda / Penalti Section P PT SBS"
                        >
                          <Plus size={15} />
                          <span>+ Klaim Penalti SBS</span>
                        </button>
                      )}

                      {/* Dropdown 2: Input / Buat Invoice */}
                      <div className="relative z-30">
                        <button
                          type="button"
                          className="primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-2xs transition shrink-0 cursor-pointer"
                          onClick={() => setShowInputARDropdown(!showInputARDropdown)}
                          title="Buat Invoice Baru (Ops / MDO)"
                        >
                          <Plus size={15} />
                          <span>+ Input / Buat Invoice</span>
                          <ChevronDown size={13} className="text-cyan-200" />
                        </button>

                        {showInputARDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowInputARDropdown(false)} />
                            <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs font-bold divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-cyan-50 hover:text-cyan-900 flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "POS", activityGroup: "OPERATION & MINING", invoiceCategory: "Operation & Mining" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Pickaxe size={16} className="text-cyan-700 mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-extrabold">1. Invoice Operations & Mining (POS)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">OB Removal, Top Soil, Nikel Ore, Overhaul & RF</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-indigo-50 hover:text-indigo-900 flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "POS", activityGroup: "MINE DEVELOPMENT OPERATION (MDO)", invoiceCategory: "MDO" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Building2 size={16} className="text-indigo-700 mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-extrabold">2. Invoice Mine Development (POS)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">MDO SOW: Jetty, Road & Infrastruktur</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-amber-50 hover:text-amber-950 flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "BGG", activityGroup: "OVERBURDEN & COAL MINING" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Scale size={16} className="text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-extrabold">3. Invoice PT BGG (Lahat)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">OB, Coal, Distance Slip & SR True-Up</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "PTRO", activityGroup: "COAL HAULING & MINING SERVICES" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Pickaxe size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-extrabold">4. Invoice PT Petrosea (PTRO)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">Pekerjaan Tambang & Hauling</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-orange-50 hover:text-orange-950 flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "SBS", activityGroup: "OVERBURDEN & JASA PENUNJANG PRODUKSI" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Truck size={16} className="text-orange-600 mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-extrabold">5. Invoice PT SBS (Tanjung Enim)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">OB 8 Titik Disposal, Jam Alat & Denda</span>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3 STAT CARDS WITH CLEAN SUBTLE ACTIVE STYLING */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono">
                    {/* Card 1: Total AR Andalan */}
                    <div
                      onClick={() => setInvCardTab("AR_ANDALAN")}
                      className={`cursor-pointer transition rounded-xl p-2.5 sm:p-3 text-center border ${invCardTab === "AR_ANDALAN" ? "bg-cyan-50/50 border-cyan-700 ring-1 ring-cyan-600/40 shadow-2xs" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"}`}
                    >
                      <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider text-slate-600 block">
                        Total AR Andalan
                      </span>
                      <span className="text-sm sm:text-base lg:text-lg font-bold font-mono text-slate-900 mt-0.5 block truncate">
                        {formatIDR(totalARAndalan)}
                      </span>
                    </div>

                    {/* Card 2: Total progress Pinalty yang belum di potong */}
                    <div
                      onClick={() => setInvCardTab("PENALTY_UNCUT")}
                      className={`cursor-pointer transition rounded-xl p-2.5 sm:p-3 text-center border ${invCardTab === "PENALTY_UNCUT" ? "bg-amber-50/60 border-amber-600 ring-1 ring-amber-600/40 shadow-2xs" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"}`}
                    >
                      <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider text-slate-600 block">
                        Total Penalti Belum Potong
                      </span>
                      <span className="text-sm sm:text-base lg:text-lg font-bold font-mono text-amber-800 mt-0.5 block truncate">
                        {formatIDR(totalPenaltyUncut)}
                      </span>
                    </div>

                    {/* Card 3: Total Subject To Invoice */}
                    <div
                      onClick={() => setInvCardTab("SUBJECT_TO_INVOICE")}
                      className={`cursor-pointer transition rounded-xl p-2.5 sm:p-3 text-center border ${invCardTab === "SUBJECT_TO_INVOICE" ? "bg-emerald-50/60 border-emerald-600 ring-1 ring-emerald-600/40 shadow-2xs" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"}`}
                    >
                      <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider text-slate-600 block">
                        Total Subject To Invoice
                      </span>
                      <span className="text-sm sm:text-base lg:text-lg font-bold font-mono text-emerald-800 mt-0.5 block truncate">
                        {formatIDR(totalSubjectToInvoice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table Sajian Terkelompok Per Client */}
                <Panel title={invCardTab === "AR_ANDALAN" ? "Tabel Outstandings AR — Total AR Andalan (Per Klien)" : invCardTab === "PENALTY_UNCUT" ? "Tabel Progress Penalti Belum Terpotong — Eksklusif PT SBS (Section P)" : "Tabel Subject To Invoice — BA Ready To Invoice (Per Klien)"}>
                  <div className="table-wrapper overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
                    <table className="data-table w-full min-w-[1350px] text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200">
                          <th className="p-2.5 whitespace-nowrap min-w-[130px]">Project</th>
                          <th className="p-2.5 whitespace-nowrap min-w-[110px]">Inv. Progress</th>
                          <th className="p-2.5 whitespace-nowrap min-w-[180px]">No. Invoice</th>
                          <th className="p-2.5 whitespace-nowrap min-w-[180px]">Remarks</th>
                          <th className="p-2.5 text-right font-bold whitespace-nowrap min-w-[140px]">Amount</th>
                          <th className="p-2.5 whitespace-nowrap min-w-[110px]">Invoice Date</th>
                          <th className="p-2.5 whitespace-nowrap min-w-[130px]">Invoice Submission</th>
                          <th className="p-2.5 whitespace-nowrap min-w-[110px]">Due Date</th>
                          <th className="p-2.5 text-right font-bold whitespace-nowrap min-w-[140px]">Outstanding</th>
                          <th className="p-2.5 text-center whitespace-nowrap min-w-[160px]">Status</th>
                          {invCardTab === "AR_ANDALAN" && <th className="p-2.5 text-center whitespace-nowrap min-w-[170px] sticky right-0 z-20 bg-slate-100 text-slate-700 border-l border-slate-200 font-sans">AKSI</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium font-sans">
                        {/* TAB 1: TOTAL AR ANDALAN */}
                        {invCardTab === "AR_ANDALAN" && (() => {
                          const targetPeriodIndex = parsePeriodToMonthIndex(invPeriodFilter);
                          const filteredInv = invoiceRows.filter((r) => {
                            const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
                            if (!matchQ) return false;

                            if (invStatusFilter !== "All") {
                              const s = (r.status || "").trim();
                              if (invStatusFilter === "Draft") {
                                if (s !== "Draft" && s !== "Draft Invoice" && s !== "Pending" && s !== "Submitted" && s !== "") return false;
                              } else if (invStatusFilter === "Issued") {
                                if (s !== "Issued" && s !== "Approved_Tier2" && s !== "Approved") return false;
                              } else if (s !== invStatusFilter) {
                                return false;
                              }
                            }
                            
                            // Period Cut-Off: Tampilkan invoice periode terpilih & periode sebelumnya
                            if (invPeriodFilter !== "All") {
                              const rowPeriodIndex = parsePeriodToMonthIndex(r.workPeriod || "");
                              if (rowPeriodIndex > targetPeriodIndex) return false;
                            }

                            // Khusus filter "All": Tampilkan invoice yang belum lunas (outstanding > 0 dan status bukan Paid/Tax_Reported)
                            const outstandingAmount = r.outstanding !== undefined ? Number(r.outstanding) : ((Number(r.totalInvoice) || 0) - (Number(r.totalPaid) || 0));
                            if (invStatusFilter === "All" && (outstandingAmount <= 0 || r.status === "Paid" || r.status === "Tax_Reported")) {
                              return false;
                            }

                            return true;
                          });

                          const groupedCust: any[] = Array.from(new Set(filteredInv.map((r) => r.customerCode || "OTHER")));

                          if (groupedCust.length === 0) {
                            return (
                              <tr>
                                <td colSpan={11} className="p-6 text-center text-slate-500 font-bold font-sans">
                                  Tidak ada data invoice penagihan yang sesuai.
                                </td>
                              </tr>
                            );
                          }

                          return groupedCust.map((custCode) => {
                            const clientRows = filteredInv.filter((r) => (r.customerCode || "OTHER") === custCode);
                            const clientTotalAR = clientRows.reduce((sum, r) => {
                              const out = r.outstanding !== undefined ? Number(r.outstanding) : ((Number(r.totalInvoice) || 0) - (Number(r.totalPaid) || 0));
                              return sum + (isNaN(out) ? 0 : out);
                            }, 0);
                            const clientTotalAmount = clientRows.reduce((sum, r) => {
                              const amt = Number(r.totalInvoice || 0);
                              return sum + (isNaN(amt) ? 0 : amt);
                            }, 0);

                            return (
                              <Fragment key={custCode}>
                                {/* Client Group Header Banner */}
                                <tr className="bg-slate-50/90 font-extrabold text-xs border-t border-b border-slate-200 font-sans">
                                  <td colSpan={11} className="p-2.5 px-3 bg-slate-100/60 uppercase tracking-wider relative font-sans">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-cyan-700 inline-block"></span>
                                      <span className="font-extrabold text-slate-900 text-xs">CLIENT / SITE: {custCode}</span>
                                      <span className="text-[10px] text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {clientRows.length} Invoice Outstanding
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                  {clientRows.map((row: any) => {
                                    const isImmutable = row.status === "Tax_Reported" || row.status === "Paid";
                                    return (
                                      <tr key={row.id} className="hover:bg-slate-50 transition group">
                                        <td className="p-2.5">
                                          <div className="font-extrabold text-slate-900">{row.customerCode}</div>
                                          <div className="text-[10px] text-slate-500 font-medium">{getCustomerOfficialName(row.customerCode)}</div>
                                        </td>
                                        <td className="p-2.5 text-slate-700 font-medium">{row.workPeriod || "Juni 2026"}</td>
                                        <td className="p-2.5 font-mono font-bold text-cyan-800">
                                          <div>{row.invoiceNo}</div>
                                          {row.relatedInvoiceNo && (
                                            <div className="text-[10px] text-indigo-700 font-sans font-bold flex items-center gap-1 mt-0.5">
                                              <span>🔗 Pasangan:</span>
                                              <span className="font-mono">{row.relatedInvoiceNo}</span>
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-slate-700 font-medium">{row.jobType || row.notes || "OB & CG"}</td>
                                        <td className="p-2.5 text-right font-mono text-slate-900">{formatIDR(row.totalInvoice)}</td>
                                        <td className="p-2.5 text-slate-700">{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("id-ID") : "-"}</td>
                                        <td className="p-2.5 text-slate-700">{row.invoiceIssuedDate ? new Date(row.invoiceIssuedDate).toLocaleDateString("id-ID") : "-"}</td>
                                        <td className="p-2.5 text-slate-700">{row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-"}</td>
                                        <td className="p-2.5 text-right font-mono font-bold text-rose-700">{formatIDR(row.outstanding)}</td>
                                        <td className="p-2.5 text-center">
                                          {renderInvoiceStatusBadge(row.status)}
                                          {(() => {
                                            const matchedJrn = accountingJournals.find((j: any) => j.sourceModule === "INVOICE" && j.sourceReference === row.invoiceNo && j.status !== "Void" && j.status !== "Reversed");
                                            if (!matchedJrn) return null;
                                            return (
                                              <div className="mt-1">
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold" title={`Jurnal Piutang: ${matchedJrn.journalNumber} (${matchedJrn.status})`}>
                                                  <BookOpen size={10} className="text-emerald-700" />
                                                  {matchedJrn.journalNumber}
                                                </span>
                                              </div>
                                            );
                                          })()}
                                        </td>
                                        <td className="p-2.5 text-right whitespace-nowrap sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200">
                                          <div className="flex items-center justify-end gap-1.5 flex-nowrap min-w-[150px]">
                                            {(isManager || isDirector || isSuper) && (row.status === "Draft" || !row.status || row.status === "Pending" || row.status === "Submitted" || row.status === "Verified") && (
                                              <button
                                                className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] rounded shadow-xs inline-flex items-center gap-1 transition shrink-0 whitespace-nowrap font-sans cursor-pointer"
                                                onClick={() => handleApproveInvoice(row.id)}
                                                title="Setujui Invoice (Manager FATB)"
                                              >
                                                <UserCheck size={12} /> Approve FATB
                                              </button>
                                            )}
                                            <button className="p-1.5 rounded border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition shrink-0 cursor-pointer" onClick={() => setDetailViewItem({ type: "invoice", data: row })} title="Lihat Detail & Tracking Log">
                                              <Eye size={14} />
                                            </button>
                                            {isImmutable ? (
                                              <span className="p-1.5 rounded border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed" title={`Terkunci: Status ${row.status} tidak dapat diubah (Immutability Lock)`}>
                                                <Lock size={14} />
                                              </span>
                                            ) : (
                                              <>
                                                <button className="p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer" onClick={() => openEditModal("invoice", row)} title="Edit Invoice">
                                                  <Edit2 size={14} />
                                                </button>
                                                <button className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shrink-0 cursor-pointer" onClick={() => handleDelete("invoice", row.id)} title="Hapus Invoice">
                                                  <Trash2 size={14} />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                {/* Client Group Subtotal Row */}
                                <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200 font-sans">
                                  <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-xs font-extrabold text-slate-700 font-sans">TOTAL AR {custCode}:</td>
                                  <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-slate-900 font-sans">{formatIDR(clientTotalAmount)}</td>
                                  <td colSpan={3}></td>
                                  <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-rose-700 font-sans">{formatIDR(clientTotalAR)}</td>
                                  <td colSpan={2} className="sticky right-0 bg-slate-50 border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]"></td>
                                </tr>
                              </Fragment>
                            );
                          });
                        })()}

                        {/* TAB 2: TOTAL PROGRESS PINALTY YANG BELUM DI POTONG */}
                        {invCardTab === "PENALTY_UNCUT" && (() => {
                          const filteredPen = penaltyDataRows.filter((r) => {
                            const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
                            return matchQ;
                          });
                          const groupedCust: any[] = Array.from(new Set(filteredPen.map((r) => r.customerCode)));

                          if (groupedCust.length === 0) {
                            return (
                              <tr>
                                <td colSpan={10} className="p-8 text-center text-slate-500 font-medium italic bg-slate-50/50 font-sans">
                                  Tidak ada klaim progress penalti / Section P belum dipotong pada kontrak PT SBS untuk periode ini.
                                </td>
                              </tr>
                            );
                          }

                          return groupedCust.map((custCode) => {
                            const clientRows = filteredPen.filter((r) => r.customerCode === custCode);
                            const clientTotalPenalty = clientRows.reduce((sum, r) => sum + r.outstanding, 0);

                            return (
                              <Fragment key={custCode}>
                                <tr className="bg-slate-50/90 font-extrabold text-xs border-t border-b border-slate-200 font-sans">
                                  <td colSpan={10} className="p-2.5 px-3 bg-slate-100/60 uppercase tracking-wider font-sans">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                                      <span className="font-extrabold text-slate-900 text-xs">CLIENT / SITE: {custCode}</span>
                                      <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                                        Progress Pinalty Belum Dipotong
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                  {clientRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition">
                                      <td className="p-2.5">
                                        <div className="font-extrabold text-slate-900">{row.customerCode}</div>
                                        <div className="text-[10px] text-slate-500 font-medium">{getCustomerOfficialName(row.customerCode)}</div>
                                      </td>
                                      <td className="p-2.5 font-medium text-slate-700">{row.workPeriod}</td>
                                      <td className="p-2.5 text-slate-600 font-mono text-xs font-bold">{row.claimRefNo || row.invoiceNo}</td>
                                      <td className="p-2.5 text-slate-700 font-medium">{row.remarks}</td>
                                      <td className="p-2.5 text-right font-mono text-slate-900">{formatIDR(row.amount)}</td>
                                      <td className="p-2.5 text-right font-mono text-slate-500">{formatIDR(row.deductedAmount || 0)}</td>
                                      <td className="p-2.5 text-slate-400 font-mono text-xs">{row.invoiceDate || "-"}</td>
                                      <td className="p-2.5 text-slate-400">-</td>
                                      <td className="p-2.5 text-right font-mono font-bold text-amber-800">{formatIDR(row.outstanding)}</td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === "Deducted" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-amber-100 text-amber-900 border border-amber-300"}`}>
                                          {row.status}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-center sticky right-0 bg-white border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => openSBSPenaltyModal(row.rawItem || row)}
                                            className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition cursor-pointer"
                                            title="Edit Klaim Penalti SBS"
                                          >
                                            <Edit2 size={14} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteSBSPenalty(row.id)}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                            title="Hapus Klaim Penalti"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200 font-sans">
                                    <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-xs font-extrabold text-slate-700 font-sans">TOTAL PROGRESS PINALTY {custCode}:</td>
                                    <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-slate-900 font-sans">{formatIDR(clientTotalPenalty)}</td>
                                    <td colSpan={3}></td>
                                    <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-amber-800 font-sans">{formatIDR(clientTotalPenalty)}</td>
                                    <td colSpan={2} className="sticky right-0 bg-slate-50 border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]"></td>
                                  </tr>
                              </Fragment>
                            );
                          });
                        })()}

                        {/* TAB 3: TOTAL SUBJECT TO INVOICE */}
                        {invCardTab === "SUBJECT_TO_INVOICE" && (() => {
                          const filteredSti = subjectToInvoiceDataRows.filter((r) => {
                            const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
                            return matchQ;
                          });
                          const groupedCust: any[] = Array.from(new Set(filteredSti.map((r) => r.customerCode)));

                          if (groupedCust.length === 0) {
                            return (
                              <tr>
                                <td colSpan={10} className="p-8 text-center text-slate-500 font-medium italic bg-slate-50/50 font-sans">
                                  Semua Berita Acara telah diterbitkan invoice (tidak ada BA pending penagihan).
                                </td>
                              </tr>
                            );
                          }

                          return groupedCust.map((custCode) => {
                            const clientRows = filteredSti.filter((r) => r.customerCode === custCode);
                            const clientTotalSti = clientRows.reduce((sum, r) => sum + r.outstanding, 0);

                            return (
                              <Fragment key={custCode}>
                                <tr className="bg-slate-50/90 font-extrabold text-xs border-t border-b border-slate-200 font-sans">
                                  <td colSpan={10} className="p-2.5 px-3 bg-slate-100/60 uppercase tracking-wider font-sans">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                                      <span className="font-extrabold text-slate-900 text-xs">CLIENT / SITE: {custCode}</span>
                                      <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                                        Ready to Invoice
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {clientRows.map((row) => (
                                  <tr key={row.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2.5 font-bold text-slate-900">{row.customerCode}</td>
                                    <td className="p-2.5 font-medium text-slate-700">{row.workPeriod}</td>
                                    <td className="p-2.5 text-slate-400 font-mono text-xs">{row.invoiceNo}</td>
                                    <td className="p-2.5 text-slate-700 font-medium">{row.remarks}</td>
                                    <td className="p-2.5 text-right font-mono text-slate-900">{formatIDR(row.amount)}</td>
                                    <td className="p-2.5 text-slate-400">-</td>
                                    <td className="p-2.5 text-slate-400">-</td>
                                    <td className="p-2.5 text-slate-400">-</td>
                                    <td className="p-2.5 text-right font-mono font-bold text-emerald-800">{formatIDR(row.outstanding)}</td>
                                    <td className="p-2.5 text-center">
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === "Ready to Invoice" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-cyan-100 text-cyan-900 border border-cyan-300"}`}>
                                        {row.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200 font-sans">
                                  <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-xs font-extrabold text-slate-700 font-sans">TOTAL SUBJECT TO INVOICE {custCode}:</td>
                                  <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-slate-900 font-sans">{formatIDR(clientTotalSti)}</td>
                                  <td colSpan={3}></td>
                                  <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-emerald-800 font-sans">{formatIDR(clientTotalSti)}</td>
                                  <td></td>
                                </tr>
                              </Fragment>
                            );
                          });
                        })()}
                      </tbody>

                      {/* GRAND SUMMARY FOOTER ROW (CLEAN LIGHT CORPORATE THEME) */}
                      <tfoot className="bg-slate-50/95 text-slate-800 font-bold text-xs border-t-2 border-slate-200 font-sans">
                        <tr>
                          <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-xs font-black text-slate-800 font-sans">
                            {invCardTab === "AR_ANDALAN" ? "TOTAL AR ANDALAN" : invCardTab === "PENALTY_UNCUT" ? "TOTAL PROGRESS PINALTY" : "TOTAL SUBJECT TO INVOICE"}:
                          </td>
                          <td className="p-3 text-right font-mono text-xs sm:text-sm font-black text-slate-900 font-sans">
                            {invCardTab === "AR_ANDALAN" ? formatIDR(totalARAndalan) : invCardTab === "PENALTY_UNCUT" ? formatIDR(totalPenaltyUncut) : formatIDR(totalSubjectToInvoice)}
                          </td>
                          <td colSpan={3}></td>
                          <td className="p-3 text-right font-mono text-sm sm:text-base font-black text-rose-800 font-sans">
                            {invCardTab === "AR_ANDALAN" ? formatIDR(totalARAndalan) : invCardTab === "PENALTY_UNCUT" ? formatIDR(totalPenaltyUncut) : formatIDR(totalSubjectToInvoice)}
                          </td>
                          <td colSpan={invCardTab === "SUBJECT_TO_INVOICE" ? 1 : 2} className="sticky right-0 bg-slate-50 border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Panel>

                {/* MODAL CRUD: SBS PROGRESS PENALTY (SECTION P) */}
                {sbsPenaltyModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-6 py-4 bg-gradient-to-r from-amber-800 to-amber-900 text-white flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-extrabold flex items-center gap-2">
                            <Scale size={18} className="text-amber-300" />
                            {sbsFormState.id ? "Edit Klaim Penalti PT SBS" : "Catat Klaim Penalti Baru PT SBS"}
                          </h3>
                          <p className="text-xs text-amber-200 mt-0.5">Klausul Denda Keterlambatan / Deviasi KPI Section P (Tanjung Enim)</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => closeSBSPenaltyModal()}
                          className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveSBSPenalty(sbsFormState);
                        }}
                        className="p-6 space-y-4 text-xs font-medium text-slate-700"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <MonthPickerInput
                            label="Periode Proyek *"
                            value={sbsFormState.workPeriod}
                            onChange={(val) => setSbsFormState({ ...sbsFormState, workPeriod: val })}
                            format="short"
                            required
                          />

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Status Pemotongan *</label>
                            <select
                              value={sbsFormState.status}
                              onChange={(e) => setSbsFormState({ ...sbsFormState, status: e.target.value as any })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                            >
                              <option value="Pending Cut">Pending Cut (Belum Dipotong)</option>
                              <option value="Deducted">Deducted (Sudah Dipotong)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">No. Ref / BA Klaim Penalti</label>
                          <input
                            type="text"
                            value={sbsFormState.claimRefNo}
                            onChange={(e) => setSbsFormState({ ...sbsFormState, claimRefNo: e.target.value })}
                            placeholder="cth: BA-PEN-SBS/III/2026"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Deskripsi / Klausul Denda *</label>
                          <input
                            type="text"
                            value={sbsFormState.description}
                            onChange={(e) => setSbsFormState({ ...sbsFormState, description: e.target.value })}
                            placeholder="cth: *Progress Pinalty yang belum di potong - Underperformance Pit E"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <RupiahInput
                            label="Nilai Klaim Denda (Rp) *"
                            value={sbsFormState.claimAmount}
                            onChange={(val) => setSbsFormState({ ...sbsFormState, claimAmount: val })}
                            placeholder="0"
                            required
                          />

                          <RupiahInput
                            label="Sudah Dipotong (Rp)"
                            value={sbsFormState.deductedAmount}
                            onChange={(val) => setSbsFormState({ ...sbsFormState, deductedAmount: val })}
                            placeholder="0"
                          />
                        </div>

                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                          <span className="font-bold text-amber-900">Sisa Denda (Outstanding):</span>
                          <span className="font-mono font-black text-sm text-amber-900">
                            {formatIDR(Math.max(0, sbsFormState.claimAmount - sbsFormState.deductedAmount))}
                          </span>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                          <textarea
                            rows={2}
                            value={sbsFormState.notes}
                            onChange={(e) => setSbsFormState({ ...sbsFormState, notes: e.target.value })}
                            placeholder="Catatan memo persetujuan / mitigasi komersial..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                          />
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => closeSBSPenaltyModal()}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-lg transition cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Check size={16} />
                            <span>{sbsFormState.id ? "Simpan Perubahan" : "Simpan Klaim Penalti"}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
  );
}

