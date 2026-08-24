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

export function InvoiceView({ c }: { c: any }) {
  const {
    baRows: rawBaRows, isSPV, isManager, isDirector, invoiceRows: rawInvoiceRows,
    invStatusFilter, setInvStatusFilter, invCardTab, setInvCardTab, invPeriodFilter,
    setInvPeriodFilter, showExportARDropdown, setShowExportARDropdown, showInputARDropdown, setShowInputARDropdown,
    setDetailViewItem, templateRows: rawTemplateRows, exportAROnlyExcel, exportAROnlyPDF, openCreateModal,
    openEditModal, handleVerifyInvoice, handleApproveInvoiceTier1, handleApproveInvoiceTier2, handleDelete,
    query = ""
  } = (c || {}) as Record<string, any>;
  const templateRows = typeof rawTemplateRows === "function" ? rawTemplateRows : () => [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
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
            const arMonitoringBaseline = (templateRows("ar_monitoring_baseline") || [])[0] || {};
            const totalPenaltyUncut = Number(arMonitoringBaseline.totalPenaltyUncut ?? 998082501);
            const unlinkedBASum = safeBaRows.filter((r) => !r?.invoiceNoLinked).reduce((acc, r) => acc + (r?.workAmount || 0), 0);
            const totalSubjectToInvoice = unlinkedBASum > 0 ? unlinkedBASum : Number(arMonitoringBaseline.totalSubjectToFallback ?? 57583855425);

            // Penalty static baseline dataset from Excel (Sheet AR Monitoring Row 48-53)
            // Baseline AR Monitoring dari master data backend (finance_templates)
            const penaltyDataRows = templateRows("ar_penalty_baseline") || [];

            // Subject To Invoice dataset combining Excel baseline (Sheet AR Monitoring Row 55-63) and unlinked BAs
            const subjectToInvoiceDataRows = [
              ...(templateRows("ar_subject_invoice_baseline") || []),
              ...safeBaRows.filter((r) => !r?.invoiceNoLinked).map((ba) => ({
                id: `sti-ba-${ba.id}`,
                customerCode: ba.customerCode || "OTHER",
                workPeriod: ba.workPeriod || "Jul-26",
                invoiceNo: "-",
                remarks: ba.notes || "OB & CG",
                amount: ba.workAmount || 0,
                outstanding: ba.workAmount || 0,
                status: ba.statusBA === "Approved" ? "Ready to Invoice" : "Pending BAI"
              }))
            ];

            return (
              <div className="space-y-6">
                {/* 3 INTERACTIVE STAT CARDS CONTAINER WITH ACTIVITY GROUP TOGGLE */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                          Master Penagihan & Outstanding AR
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Pilih kartu di bawah untuk menyaring sajian tabel sesuai baseline Excel
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
                      {/* Period Filter Dropdown for Invoice & AR Aging Cut-off */}
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider pl-1.5">PERIODE:</span>
                        <select
                          className="bg-white text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-cyan-700 focus:outline-none cursor-pointer shadow-xs"
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
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <select
                          className="bg-white text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-cyan-700 focus:outline-none cursor-pointer shadow-xs"
                          value={invStatusFilter}
                          onChange={(e) => setInvStatusFilter(e.target.value)}
                        >
                          <option value="All">Semua Status</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Paid">Paid (Lunas)</option>
                          <option value="Partial">Partial</option>
                          <option value="Open">Open</option>
                        </select>
                      </div>

                      {/* Dropdown 1: Export AR */}
                      <div className="relative">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-white border border-cyan-700 text-cyan-800 hover:bg-cyan-50 shadow-xs transition cursor-pointer shrink-0"
                          onClick={() => setShowExportARDropdown(!showExportARDropdown)}
                          title="Export Laporan AR Outstanding"
                        >
                          <FileText size={15} />
                          <span>Export AR</span>
                          <ChevronDown size={14} className="text-cyan-700" />
                        </button>

                        {showExportARDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowExportARDropdown(false)} />
                            <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-xs font-bold divide-y divide-slate-100">
                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportAROnlyExcel();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileSpreadsheet size={15} className="text-emerald-600" /> Export Excel AR
                              </button>
                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
                                onClick={() => {
                                  exportAROnlyPDF();
                                  setShowExportARDropdown(false);
                                }}
                              >
                                <FileText size={15} className="text-rose-600" /> Export PDF AR
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Dropdown 2: Input / Buat Invoice */}
                      <div className="relative">
                        <button
                          type="button"
                          className="primary flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition shrink-0 cursor-pointer"
                          onClick={() => setShowInputARDropdown(!showInputARDropdown)}
                          title="Buat Invoice Baru (Ops / MDO)"
                        >
                          <Plus size={16} />
                          <span>+ Input / Buat Invoice</span>
                          <ChevronDown size={14} className="text-cyan-200" />
                        </button>

                        {showInputARDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowInputARDropdown(false)} />
                            <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 text-xs font-bold divide-y divide-slate-100">
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
                                  <strong className="block text-slate-900 font-extrabold">2. Invoice Mine Development / MDO (POS)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">Cut & Fill, Clearing, Access Road & Konstruksi</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-start gap-2.5 transition cursor-pointer"
                                onClick={() => {
                                  openCreateModal("invoice", { customerCode: "BGG", activityGroup: "OB REMOVAL & COAL WINNING" });
                                  setShowInputARDropdown(false);
                                }}
                              >
                                <Plus size={16} className="text-emerald-700 mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block text-slate-900 font-extrabold">3. Invoice Standar (BGG / DBK / SBS)</strong>
                                  <span className="text-[10px] text-slate-500 font-normal">Faktur penagihan mitra tambang lainnya</span>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3 STAT CARDS WITH CLEAN SUBTLE ACTIVE STYLING */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                    {/* Card 1: Total AR Andalan */}
                    <div
                      onClick={() => setInvCardTab("AR_ANDALAN")}
                      className={`cursor-pointer transition rounded-xl p-4 text-center border ${invCardTab === "AR_ANDALAN" ? "bg-cyan-50/50 border-cyan-700 ring-1 ring-cyan-600/40 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"}`}
                    >
                      <span className="text-xs font-sans font-extrabold uppercase tracking-wider text-slate-600 block">
                        Total AR Andalan
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                        {formatIDR(totalARAndalan)}
                      </span>
                      <span className="text-[11px] font-sans text-slate-500 font-medium block mt-1">
                        BGG + DBK + SBS + POS Outstanding
                      </span>
                    </div>

                    {/* Card 2: Total progress Pinalty yang belum di potong */}
                    <div
                      onClick={() => setInvCardTab("PENALTY_UNCUT")}
                      className={`cursor-pointer transition rounded-xl p-4 text-center border ${invCardTab === "PENALTY_UNCUT" ? "bg-amber-50/60 border-amber-600 ring-1 ring-amber-600/40 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"}`}
                    >
                      <span className="text-xs font-sans font-extrabold uppercase tracking-wider text-slate-600 block">
                        Total progress Pinalty belum dipotong
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-amber-800 mt-1 block">
                        {formatIDR(totalPenaltyUncut)}
                      </span>
                      <span className="text-[11px] font-sans text-slate-500 font-medium block mt-1">
                        Klaim Penalti Progress Outstanding
                      </span>
                    </div>

                    {/* Card 3: Total Subject To Invoice */}
                    <div
                      onClick={() => setInvCardTab("SUBJECT_TO_INVOICE")}
                      className={`cursor-pointer transition rounded-xl p-4 text-center border ${invCardTab === "SUBJECT_TO_INVOICE" ? "bg-emerald-50/60 border-emerald-600 ring-1 ring-emerald-600/40 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"}`}
                    >
                      <span className="text-xs font-sans font-extrabold uppercase tracking-wider text-slate-600 block">
                        Total Subject To Invoice
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">
                        {formatIDR(totalSubjectToInvoice)}
                      </span>
                      <span className="text-[11px] font-sans text-slate-500 font-medium block mt-1">
                        Total BA Siap Tagih (Ready to Invoice)
                      </span>
                    </div>
                  </div>
                </div>

                {/* TABLE SAJIAN TERKELOMPOK PER CLIENT MATCHING EXCEL GAMBAR 3 */}
                <Panel title={invCardTab === "AR_ANDALAN" ? "Tabel Outstandings AR â€” Total AR Andalan (Per Client)" : invCardTab === "PENALTY_UNCUT" ? "Tabel Progress Pinalty yang Belum Dipotong (Per Client)" : "Tabel Subject To Invoice â€” BA Ready To Invoice (Per Client)"}>
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
                            if (invStatusFilter !== "All" && r.status !== invStatusFilter) return false;
                            
                            // Period Cut-Off: Tampilkan invoice periode terpilih & periode sebelumnya
                            if (invPeriodFilter !== "All") {
                              const rowPeriodIndex = parsePeriodToMonthIndex(r.workPeriod || "");
                              if (rowPeriodIndex > targetPeriodIndex) return false;
                            }

                            // Khusus invoice yang belum terbayar (outstanding > 0 dan status bukan Paid)
                            const outstandingAmount = r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0));
                            if (invStatusFilter === "All" && (outstandingAmount <= 0 || r.status === "Paid")) {
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
                            const clientTotalAR = clientRows.reduce((sum, r) => sum + (r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0))), 0);
                            const clientTotalAmount = clientRows.reduce((sum, r) => sum + (r.totalInvoice || 0), 0);

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
                                {clientRows.map((row: any) => (
                                  <tr key={row.id} className="hover:bg-slate-50 transition group">
                                    <td className="p-2.5 font-bold text-slate-900">{row.customerCode}</td>
                                    <td className="p-2.5 text-slate-700 font-medium">{row.workPeriod || "Juni 2026"}</td>
                                    <td className="p-2.5 font-mono font-bold text-cyan-800">{row.invoiceNo}</td>
                                    <td className="p-2.5 text-slate-700 font-medium">{row.jobType || row.notes || "OB & CG"}</td>
                                    <td className="p-2.5 text-right font-mono text-slate-900">{formatIDR(row.totalInvoice)}</td>
                                    <td className="p-2.5 text-slate-700">{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("id-ID") : "-"}</td>
                                    <td className="p-2.5 text-slate-700">{row.invoiceIssuedDate ? new Date(row.invoiceIssuedDate).toLocaleDateString("id-ID") : "-"}</td>
                                    <td className="p-2.5 text-slate-700">{row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-"}</td>
                                    <td className="p-2.5 text-right font-mono font-bold text-rose-700">{formatIDR(row.outstanding)}</td>
                                    <td className="p-2.5 text-center">
                                      {renderInvoiceStatusBadge(row.status)}
                                    </td>
                                    <td className="p-2.5 text-right whitespace-nowrap sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200">
                                      <div className="flex items-center justify-end gap-1.5 flex-nowrap min-w-[150px]">
                                        {isSPV && (row.status === "Draft" || !row.status || row.status === "Pending") && (
                                          <button
                                            className="px-2 py-1 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-[11px] rounded shadow-sm inline-flex items-center gap-1 transition shrink-0 whitespace-nowrap font-sans"
                                            onClick={() => handleVerifyInvoice(row.id)}
                                            title="Verifikasi Invoice (SPV)"
                                          >
                                            <ShieldCheck size={12} /> Verifikasi SPV
                                          </button>
                                        )}
                                        {isManager && (row.status === "Verified" || row.status === "Draft" || row.status === "Pending") && (
                                          <button
                                            className="px-2 py-1 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] rounded shadow-sm inline-flex items-center gap-1 transition shrink-0 whitespace-nowrap font-sans"
                                            onClick={() => handleApproveInvoiceTier1(row.id)}
                                            title="Approve Tier 1 (Manager)"
                                          >
                                            <UserCheck size={12} /> Approve Mgr (T1)
                                          </button>
                                        )}
                                        {isDirector && (row.status === "Approved_Tier1" || row.status === "Verified") && (
                                          <button
                                            className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] rounded shadow-sm inline-flex items-center gap-1 transition shrink-0 whitespace-nowrap font-sans"
                                            onClick={() => handleApproveInvoiceTier2(row.id)}
                                            title="Approve Tier 2 (Direktur Eksekutif)"
                                          >
                                            <FileCheck size={12} /> Approve Dir (T2)
                                          </button>
                                        )}
                                        <button className="p-1.5 rounded border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition shrink-0" onClick={() => setDetailViewItem({ type: "invoice", data: row })} title="Lihat Detail & Tracking Log">
                                          <Eye size={14} />
                                        </button>
                                        <button className="p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition shrink-0" onClick={() => openEditModal("invoice", row)} title="Edit Invoice">
                                          <Edit2 size={14} />
                                        </button>
                                        <button className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shrink-0" onClick={() => handleDelete("invoice", row.id)} title="Hapus Invoice">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
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
                                    <td className="p-2.5 font-bold text-slate-900">{row.customerCode}</td>
                                    <td className="p-2.5 font-medium text-slate-700">{row.workPeriod}</td>
                                    <td className="p-2.5 text-slate-400 font-mono text-xs">{row.invoiceNo}</td>
                                    <td className="p-2.5 text-slate-700 font-medium">{row.remarks}</td>
                                    <td className="p-2.5 text-right font-mono text-slate-900">{formatIDR(row.amount)}</td>
                                    <td className="p-2.5 text-slate-400">-</td>
                                    <td className="p-2.5 text-slate-400">-</td>
                                    <td className="p-2.5 text-slate-400">-</td>
                                    <td className="p-2.5 text-right font-mono font-bold text-amber-800">{formatIDR(row.outstanding)}</td>
                                    <td className="p-2.5 text-center">
                                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        {row.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200 font-sans">
                                  <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-xs font-extrabold text-slate-700 font-sans">TOTAL PROGRESS PINALTY {custCode}:</td>
                                  <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-slate-900 font-sans">{formatIDR(clientTotalPenalty)}</td>
                                  <td colSpan={3}></td>
                                  <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-amber-800 font-sans">{formatIDR(clientTotalPenalty)}</td>
                                  <td></td>
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
                          <td colSpan={invCardTab === "AR_ANDALAN" ? 2 : 1} className="sticky right-0 bg-slate-50 border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Panel>
              </div>
            );
          })()}
        </div>
  );
}

