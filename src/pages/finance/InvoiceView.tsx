import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Check, Send, Zap, TrendingUp, Archive, Scale, Truck, BookOpen, Loader2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, approveInvoiceTier2, getFinanceTemplates, User as UserType } from "../../lib/api";
import { SBSPenaltyModal } from "./modals/SBSPenaltyModal";

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
    query = "", accountingJournals: rawAccountingJournals, deletingKey, actionLoadingKey
  } = (c || {}) as Record<string, any>;
  const templateRows = typeof rawTemplateRows === "function" ? rawTemplateRows : () => [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const sbsPenalties: any[] = Array.isArray(rawSbsPenalties) ? rawSbsPenalties : [];
  const accountingJournals: any[] = Array.isArray(rawAccountingJournals) ? rawAccountingJournals : [];
  const safeInvoiceRows: any[] = invoiceRows;
  const safeBaRows: any[] = baRows;

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
                const invStatus = getBAInvoiceStatus(ba, safeInvoiceRows);
                return !invStatus.isFullyInvoiced;
              })
              .map((ba) => {
                const invStatus = getBAInvoiceStatus(ba, safeInvoiceRows);
                const totalWork = Number(ba.workAmount || 0);
                const isPart = ba.customerCode === "POS" && invStatus.isPartiallyInvoiced;
                const stiAmount = isPart ? Math.round(totalWork / 2) : totalWork;
                return {
                  id: `sti-ba-${ba.id}`,
                  customerCode: (ba.customerCode || "POS").toUpperCase(),
                  workPeriod: ba.workPeriod || "-",
                  invoiceNo: ba.baNumber || ba.draftBARefNo || "-",
                  remarks: isPart
                    ? `Klaim BA Lapangan (Sisa 1/2 Inv ${invStatus.createdMiningInv ? "MDO" : "Mining"})`
                    : (ba.notes || `Klaim BA Lapangan (${ba.activityGroup || "OB & Coal"})`),
                  amount: stiAmount,
                  invoiceDate: ba.baSubmittedDate || ba.createdAt || "-",
                  invoiceSubmission: "-",
                  dueDate: "-",
                  outstanding: stiAmount,
                  status: ba.statusBA === "Approved" || ba.statusBA === "Ready to Invoice" ? "Ready to Invoice" : (ba.statusBA || "Draft")
                };
              });
            const totalSubjectToInvoice = subjectToInvoiceDataRows.reduce((acc, r) => acc + (r.outstanding || 0), 0);

            return (
              <div className="space-y-4">
                {/* 3 INTERACTIVE STAT CARDS CONTAINER WITH ACTIVITY GROUP TOGGLE — FEAST Enterprise Standard */}
                <div className="bg-white border border-slate-200 p-3.5 sm:p-4 shadow-sm space-y-3" style={{ borderRadius: 4 }}>
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-[3px] bg-[#FBF6F0] border border-[#E7D3BC] text-[#A57C50] shrink-0">
                        <Receipt className="w-4 h-4 text-[#A57C50]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                          Master Penagihan & Outstanding AR
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                      {/* Period Filter Dropdown for Invoice & AR Aging Cut-off */}
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-[3px] border border-slate-200">
                        <span className="text-[11px] font-semibold text-slate-500">Periode:</span>
                        <select
                          className="bg-transparent text-slate-900 font-semibold text-xs focus:outline-none cursor-pointer"
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
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-[3px] border border-slate-200">
                        <select
                          className="bg-transparent text-slate-900 font-semibold text-xs focus:outline-none cursor-pointer"
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
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[3px] bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                          onClick={() => setShowExportARDropdown(!showExportARDropdown)}
                          title="Export Laporan AR Outstanding"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Export AR</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {showExportARDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowExportARDropdown(false)} />
                            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-[4px] shadow-xl border border-slate-200 py-1 z-50 text-xs font-semibold divide-y divide-slate-100">
                              <button
                                type="button"
                                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportAROnlyExcel();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Excel AR Outstanding
                              </button>
                              <button
                                type="button"
                                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportAROnlyPDF();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-600" /> Export PDF AR Outstanding
                              </button>
                              <button
                                type="button"
                                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-[#FBF6F0] flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportCoretaxEFakturCSV();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-[#A57C50]" /> e-Faktur Coretax (PPN 12%)
                              </button>
                              <button
                                type="button"
                                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportEBupotPPh23CSV();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-600" /> e-Bupot PPh 23 (2%)
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Button: Catat Klaim Penalti SBS (khusus tab Penalty Uncut) */}
                      {invCardTab === "PENALTY_UNCUT" && (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[3px] bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition shrink-0 cursor-pointer"
                          onClick={() => openSBSPenaltyModal()}
                          title="Catat Klaim Denda / Penalti Section P PT SBS"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Klaim Penalti SBS</span>
                        </button>
                      )}

                      {/* Dropdown 2: Input / Buat Invoice */}
                      <div className="relative z-30">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 shrink-0 cursor-pointer"
                          style={{ background: "#A57C50", borderRadius: 3 }}
                          onClick={() => setShowInputARDropdown(!showInputARDropdown)}
                          title="Buat Invoice Baru (Ops / MDO)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Input / Buat Invoice</span>
                          <ChevronDown className="w-3 h-3 text-white/80" />
                        </button>

                        {showInputARDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowInputARDropdown(false)} />
                            <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-[4px] shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-semibold divide-y divide-slate-100">
                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-[#FBF6F0] flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "POS", activityGroup: "OPERATION & MINING", invoiceCategory: "Operation & Mining" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Pickaxe className="w-4 h-4 text-[#A57C50] mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-bold">1. Invoice Operations & Mining (POS)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">OB Removal, Top Soil, Nikel Ore, Overhaul & RF</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-[#FBF6F0] flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "POS", activityGroup: "MINE DEVELOPMENT OPERATION (MDO)", invoiceCategory: "MDO" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Building2 className="w-4 h-4 text-[#6E5033] mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-bold">2. Invoice Mine Development (POS)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">MDO SOW: Jetty, Road & Infrastruktur</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-[#FBF6F0] flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "BGG", activityGroup: "OVERBURDEN & COAL MINING" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Scale className="w-4 h-4 text-[#A57C50] mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-bold">3. Invoice PT BGG (Lahat)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">OB, Coal, Distance Slip & SR True-Up</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-[#FBF6F0] flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "PTRO", activityGroup: "COAL HAULING & MINING SERVICES" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Pickaxe className="w-4 h-4 text-[#A57C50] mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-bold">4. Invoice PT Petrosea (PTRO)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">Pekerjaan Tambang & Hauling</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-[#FBF6F0] flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "SBS", activityGroup: "OVERBURDEN & JASA PENUNJANG PRODUKSI" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Truck className="w-4 h-4 text-[#A57C50] mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-bold">5. Invoice PT SBS (Tanjung Enim)</strong>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Card 1: Total AR Andalan */}
                    <div
                      onClick={() => setInvCardTab("AR_ANDALAN")}
                      className={`cursor-pointer transition p-4 border ${
                        invCardTab === "AR_ANDALAN"
                          ? "bg-[#FBF6F0] border-[#A57C50] ring-1 ring-[#A57C50] shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      style={{ borderRadius: 4 }}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">
                        Total AR Andalan
                      </span>
                      <span className="text-xl font-bold font-tabular text-slate-900 mt-1 block truncate">
                        {formatIDR(totalARAndalan)}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">Invoice belum lunas</span>
                    </div>

                    {/* Card 2: Total progress Pinalty yang belum di potong */}
                    <div
                      onClick={() => setInvCardTab("PENALTY_UNCUT")}
                      className={`cursor-pointer transition p-4 border ${
                        invCardTab === "PENALTY_UNCUT"
                          ? "bg-amber-50 border-amber-600 ring-1 ring-amber-600 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      style={{ borderRadius: 4 }}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">
                        Total Penalti Belum Potong
                      </span>
                      <span className="text-xl font-bold font-tabular text-amber-900 mt-1 block truncate">
                        {formatIDR(totalPenaltyUncut)}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">Klaim denda Section P</span>
                    </div>

                    {/* Card 3: Total Subject To Invoice */}
                    <div
                      onClick={() => setInvCardTab("SUBJECT_TO_INVOICE")}
                      className={`cursor-pointer transition p-4 border ${
                        invCardTab === "SUBJECT_TO_INVOICE"
                          ? "bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      style={{ borderRadius: 4 }}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">
                        Total Subject To Invoice
                      </span>
                      <span className="text-xl font-bold font-tabular text-emerald-900 mt-1 block truncate">
                        {formatIDR(totalSubjectToInvoice)}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">BA siap diterbitkan tagihan</span>
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
                              } else if (invStatusFilter === "Issued" || invStatusFilter === "Approved") {
                                if (s !== "Issued" && s !== "Approved_Tier2" && s !== "Approved" && s !== "Approved_FATB" && s !== "Approved_Tier1") return false;
                              } else if (invStatusFilter === "Paid") {
                                if (s !== "Paid" && s !== "Lunas") return false;
                              } else if (invStatusFilter === "Tax_Reported") {
                                if (s !== "Tax_Reported" && s !== "Faktur Pajak Terlapor") return false;
                              } else if (invStatusFilter === "Overdue") {
                                const isOverdue = (r.agingDays > 0 && r.status !== "Paid" && r.status !== "Tax_Reported") || (r.dueDate && new Date(r.dueDate) < new Date() && r.status !== "Paid" && r.status !== "Tax_Reported");
                                if (!isOverdue) return false;
                              } else if (s !== invStatusFilter) {
                                return false;
                              }
                            }
                            
                            // Period Cut-Off: Tampilkan invoice periode terpilih & periode sebelumnya
                            if (invPeriodFilter !== "All") {
                              const rowPeriodIndex = parsePeriodToMonthIndex(r.workPeriod || "");
                              if (rowPeriodIndex > targetPeriodIndex) return false;
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
                                             {(isManager || isDirector || isSuper) && (row.status === "Draft" || !row.status || row.status === "Pending" || row.status === "Submitted" || row.status === "Verified") && (() => {
                                               const isApproving = actionLoadingKey === `approve-inv-${row.id}`;
                                               return (
                                                 <button
                                                   disabled={isApproving}
                                                   className={`px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] rounded shadow-xs inline-flex items-center gap-1 transition shrink-0 whitespace-nowrap font-sans cursor-pointer ${isApproving ? "opacity-60 cursor-not-allowed" : ""}`}
                                                   onClick={() => handleApproveInvoice(row.id)}
                                                   title="Setujui Invoice (Manager FATB)"
                                                 >
                                                   {isApproving ? <Loader2 size={12} className="animate-spin text-white" /> : <UserCheck size={12} />}
                                                   <span>{isApproving ? "Menyetujui..." : "Approve FATB"}</span>
                                                 </button>
                                               );
                                             })()}
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
                                                {(() => {
                                                  const isDeleting = deletingKey === `invoice-${row.id}`;
                                                  return (
                                                    <button
                                                      disabled={isDeleting}
                                                      className={`p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shrink-0 cursor-pointer ${isDeleting ? "opacity-60 cursor-not-allowed" : ""}`}
                                                      onClick={() => handleDelete("invoice", row.id)}
                                                      title="Hapus Invoice"
                                                    >
                                                      {isDeleting ? <Loader2 size={14} className="animate-spin text-rose-600" /> : <Trash2 size={14} />}
                                                    </button>
                                                  );
                                                })()}
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
                                          {(() => {
                                            const isDeletingSBS = deletingKey === `sbs-penalty-${row.id}`;
                                            return (
                                              <button
                                                type="button"
                                                disabled={isDeletingSBS}
                                                onClick={() => handleDeleteSBSPenalty(row.id)}
                                                className={`p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer ${isDeletingSBS ? "opacity-60 cursor-not-allowed" : ""}`}
                                                title="Hapus Klaim Penalti"
                                              >
                                                {isDeletingSBS ? <Loader2 size={14} className="animate-spin text-rose-600" /> : <Trash2 size={14} />}
                                              </button>
                                            );
                                          })()}
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
                <SBSPenaltyModal
                  isOpen={sbsPenaltyModalOpen}
                  editItem={sbsPenaltyEditItem}
                  onClose={closeSBSPenaltyModal}
                  onSave={handleSaveSBSPenalty}
                />
              </div>
            );
          })()}
        </div>
  );
}

