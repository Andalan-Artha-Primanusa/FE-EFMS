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

export function BATrackerView({ c }: { c: any }) {
  const {
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, pendingVolumeLedgers: rawPendingVolumeLedgers, setShowPendingVolumeDrawer, baFilter,
    setBaFilter, periodFilter, setPeriodFilter, showExportBADropdown, setShowExportBADropdown,
    showInputBADropdown, setShowInputBADropdown, baRowActionDropdownId, setBaRowActionDropdownId, setDetailViewItem,
    exportBAOnlyExcel, exportBAOnlyPDF, createInvoiceFromBA, openBAModal, openCreateModal,
    handleGenerateInvoiceFromBA, handleDelete, query = "", onNotice
  } = (c || {}) as Record<string, any>;
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const pendingVolumeLedgers: any[] = Array.isArray(rawPendingVolumeLedgers) ? rawPendingVolumeLedgers : [];
  const safeBaRows: any[] = baRows;
        const availablePeriods: any[] = Array.from(new Set(safeBaRows.map((r) => r?.workPeriod).filter(Boolean)));
        if (!availablePeriods.includes("Jul-26")) availablePeriods.unshift("Jul-26");
        if (!availablePeriods.includes("Jun-26")) availablePeriods.unshift("Jun-26");

        const periodRows = periodFilter === "All" ? safeBaRows : safeBaRows.filter((r) => r?.workPeriod === periodFilter);

        // Helper: Check if BA already has all required invoices created
        const isBAInvoiced = (r: any) => {
          if (!r) return false;
          const invStatus = getBAInvoiceStatus(r, invoiceRows);
          return invStatus.isFullyInvoiced;
        };

        // Stage 1: Draft / Joint Survey
        const stageDraftRows = periodRows.filter((r) => r.statusBA === "Submit" || r.statusBA === "Draft" || (r.statusBA || "").startsWith("Submit"));
        const stageDraftNominal = stageDraftRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Stage 2: Verifikasi Internal SPV
        const stageVerifRows = periodRows.filter((r) => r.statusBA === "Pending Berita Acara" || r.statusBA === "Pending" || r.statusBA === "Pending BAI" || r.statusBA === "Verified");
        const stageVerifNominal = stageVerifRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Stage 3: Revisi / Tertahan
        const stageRevisiRows = periodRows.filter((r) => r.statusBA === "Revisi" || (r.statusBA || "").startsWith("Reject"));
        const stageRevisiNominal = stageRevisiRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Stage 4: Siap Terbit Invoice (HANYA YANG BELUM TERBIT INVOICE)
        const stageReadyRows = periodRows.filter((r) => (r.statusBA === "Ready to Invoice" || r.statusBA === "Approved") && !isBAInvoiced(r));
        const stageReadyNominal = stageReadyRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Stage 5: Arsip (HANYA YANG BENAR-BENAR SUDAH ADA INVOICENYA)
        const stageArsipRows = periodRows.filter((r) => (r.statusBA === "Ready to Invoice" || r.statusBA === "Approved" || r.statusBA === "Invoiced" || r.statusBA === "Arsip") && isBAInvoiced(r));
        const stageArsipNominal = stageArsipRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

        // Top Summary Calculations
        const nominalApprovedPeriod = stageReadyNominal;
        const baOnProgressNominal = stageDraftNominal + stageVerifNominal + stageRevisiNominal;
        const baOnProgressCount = stageDraftRows.length + stageVerifRows.length + stageRevisiRows.length;

        // Pending Volume: Kelebihan volume pengerjaan Top Soil & Overburden di luar rasio kontrak terhadap Coal (Carry Over untuk invoice periode berikutnya)
        const pendingVolumeRows = periodRows.filter((r) =>
          (r.baNumber || "").toUpperCase().includes("PENDING") ||
          (r.notes || "").toLowerCase().includes("pending volume") ||
          (r.notesBottleneck || "").toLowerCase().includes("pending") ||
          r.isPendingVolume ||
          (r.pendingVolumeAmount && r.pendingVolumeAmount > 0)
        );
        const pendingVolumeNominal = pendingVolumeRows.reduce((sum, r) => sum + (r.pendingVolumeAmount || r.workAmount || 0), 0);

        const estTotalRevPeriod = periodRows.reduce((acc, r) => acc + (r.workAmount || 0), 0);

        const filteredBARows = baRows.filter((r) => {
          const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
          if (!matchQ) return false;
          if (periodFilter !== "All" && r.workPeriod !== periodFilter) return false;
          if (baFilter === "Submit") return r.statusBA === "Submit" || r.statusBA === "Draft" || (r.statusBA || "").startsWith("Submit");
          if (baFilter === "Pending Berita Acara") return r.statusBA === "Pending Berita Acara" || r.statusBA === "Pending" || r.statusBA === "Pending BAI" || r.statusBA === "Verified";
          if (baFilter === "Revisi") return r.statusBA === "Revisi" || (r.statusBA || "").startsWith("Reject");
          if (baFilter === "Ready to Invoice") return (r.statusBA === "Ready to Invoice" || r.statusBA === "Approved") && !isBAInvoiced(r);
          if (baFilter === "Arsip") return (r.statusBA === "Ready to Invoice" || r.statusBA === "Approved" || r.statusBA === "Invoiced" || r.statusBA === "Arsip") && isBAInvoiced(r);
          return true;
        });

        const groupedCustomers: any[] = Array.from(new Set(filteredBARows.map((r) => r.customerCode || "OTHER")));

        return (
          <>
            {/* Header & Filter Periode Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-100/70 border border-cyan-300 text-cyan-900 shrink-0 shadow-2xs">
                    <Calendar size={22} className="text-cyan-800" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Siklus & Proyeksi Berita Acara ({periodFilter === "All" ? "Semua Periode" : `Periode ${periodFilter}`})
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Kelola dokumen klaim produksi tambang dari join survey hingga siap terbit tagihan resmi.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                  {/* Filter Periode Dropdown */}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Periode:
                    </span>
                    <select
                      className="bg-white text-slate-900 font-extrabold text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:border-cyan-700 focus:outline-none cursor-pointer shadow-xs"
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
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-cyan-700 text-cyan-800 hover:bg-cyan-50 shadow-xs transition cursor-pointer shrink-0"
                      onClick={() => setShowExportBADropdown(!showExportBADropdown)}
                      title="Export Laporan Berita Acara (BA)"
                    >
                      <FileText size={15} />
                      <span>Export BA</span>
                      <ChevronDown size={14} className="text-cyan-700" />
                    </button>

                    {showExportBADropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowExportBADropdown(false)} />
                        <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-xs font-bold divide-y divide-slate-100">
                          <button
                            className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition cursor-pointer"
                            onClick={() => {
                              exportBAOnlyExcel();
                              setShowExportBADropdown(false);
                            }}
                          >
                            <FileSpreadsheet size={15} className="text-emerald-600" /> Export Excel BA
                          </button>
                          <button
                            className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
                            onClick={() => {
                              exportBAOnlyPDF();
                              setShowExportBADropdown(false);
                            }}
                          >
                            <FileText size={15} className="text-rose-600" /> Export PDF BA
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Dropdown 2: Input / Tambah BA */}
                  <div className="relative">
                    <button
                      className="primary flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition shrink-0 cursor-pointer"
                      onClick={() => setShowInputBADropdown(!showInputBADropdown)}
                      title="Tambah BA Baru atau Input Pending Volume"
                    >
                      <Plus size={16} />
                      <span>+ Input / Tambah BA</span>
                      <ChevronDown size={14} className="text-cyan-200" />
                    </button>

                    {showInputBADropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowInputBADropdown(false)} />
                        <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 text-xs font-bold divide-y divide-slate-100">
                          <button
                            className="w-full px-3.5 py-2.5 text-left text-amber-950 bg-amber-50/50 hover:bg-amber-100 flex items-center gap-2 transition cursor-pointer"
                            onClick={() => {
                              openCreateModal("ba", { customerCode: "BGG" });
                              setShowInputBADropdown(false);
                            }}
                          >
                            <Scale size={15} className="text-amber-600 shrink-0" />
                            <div>
                              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                                + Input BA PT BGG (Joint Survey)
                                <span className="bg-amber-200 text-amber-900 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">Site</span>
                              </div>
                              <div className="text-[10px] text-amber-700 font-normal">Input Volume Terbongkar & Batubara (1 Inv)</div>
                            </div>
                          </button>
                          <button
                            className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 flex items-center gap-2 transition cursor-pointer"
                            onClick={() => {
                              openCreateModal("ba", { customerCode: "POS" });
                              setShowInputBADropdown(false);
                            }}
                          >
                            <Plus size={15} className="text-cyan-700 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-900">+ Buat BA PT POS (Operating & MDO)</div>
                              <div className="text-[10px] text-slate-500 font-normal">Entri 2 Kategori: Mining & MDO (2 Inv)</div>
                            </div>
                          </button>
                          <button
                            className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2 transition cursor-pointer"
                            onClick={() => {
                              openCreateModal("pending_volume");
                              setShowInputBADropdown(false);
                            }}
                          >
                            <Layers size={15} className="text-indigo-600 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-900">+ Input Pending Volume</div>
                              <div className="text-[10px] text-slate-500 font-normal">Kelebihan rasio Top Soil & OB kontrak</div>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* TOP CALCULATION STAT CARDS (4 CARDS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
                {/* Card 1: Total BA Siap Invoice (Approved) */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 shadow-2xs space-y-1 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-700 shrink-0" /> Total BA Siap Invoice (Approved)
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 shrink-0">
                      {stageReadyRows.length} Dokumen
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-950 pt-1 truncate">
                    {formatIDR(stageReadyNominal)}
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Volume terkonfirmasi siap terbit tagihan resmi
                  </p>
                </div>

                {/* Card 2: BA On Progress */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-2xs space-y-1 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Clock size={16} className="text-amber-700 shrink-0" /> BA On Progress
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                      {baOnProgressCount} Dokumen
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-950 pt-1 truncate">
                    {formatIDR(baOnProgressNominal)}
                  </div>
                  <p className="text-[11px] text-amber-700 font-medium">
                    Menunggu finalisasi survey / approval SPV
                  </p>
                </div>

                {/* Card 3: Pending Volume (Over Kontrak / Stripping Ratio) */}
                {(() => {
                  const activePendingLedgers = pendingVolumeLedgers.filter((l: any) => l.remainingVolume > 0 || l.status === "Active" || l.status === "Partially Settled");
                  const ledgerPendingNominal = activePendingLedgers.reduce((sum: number, l: any) => sum + (l.remainingVolume * (l.ob1Rate * 0.75 + l.ob2Rate * 0.25 || 27000)), 0);
                  const totalPendingDisplay = ledgerPendingNominal > 0 ? ledgerPendingNominal : pendingVolumeNominal;
                  const totalPendingCount = activePendingLedgers.length > 0 ? activePendingLedgers.length : pendingVolumeRows.length;

                  return (
                    <div 
                      onClick={() => setShowPendingVolumeDrawer(true)}
                      className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 hover:border-indigo-400 hover:shadow-md transition cursor-pointer space-y-1 relative overflow-hidden group"
                      title="Klik untuk membuka Kartu Kontrol Saldo Pending Volume (Carry-Forward OB)"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5 group-hover:text-indigo-950">
                          <Scale size={16} className="text-indigo-700 shrink-0 group-hover:scale-110 transition" /> Pending Volume
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 shrink-0 flex items-center gap-1">
                          <span>{totalPendingCount > 0 ? `${totalPendingCount} Periode` : "Carry Over"}</span>
                          <ChevronRight size={10} className="text-indigo-700" />
                        </span>
                      </div>
                      <div className="text-2xl font-black font-mono text-indigo-950 pt-1 truncate">
                        {formatIDR(totalPendingDisplay)}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-indigo-700 font-medium">
                        <span className="truncate">Saldo OB di atas rasio SOW (3:1)</span>
                        <span className="text-[10px] font-bold underline shrink-0">Buka Kartu Kontrol ↗</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 4: Estimasi Total Revenue */}
                <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200/80 shadow-2xs space-y-1 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-cyan-700 shrink-0" /> Estimasi Total Revenue
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-200 shrink-0">
                      {periodFilter === "All" ? "Semua Periode" : periodFilter}
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-cyan-950 pt-1 truncate">
                    {formatIDR(estTotalRevPeriod)}
                  </div>
                  <p className="text-[11px] text-cyan-700 font-medium">
                    Proyeksi pendapatan operasional periode berjalan
                  </p>
                </div>
              </div>
            </div>

            {/* Grouped Table Panel */}
            <Panel title={`Daftar Berita Acara Pekerjaan (Filter: ${baFilter === "All" ? "Semua Status" : baFilter}, Periode: ${periodFilter})`}>
              {/* CHEVRON / ARROW PROCESS STEPPER FILTER (HORIZONTALLY SCROLLABLE & COMPACT) */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Layers size={14} className="text-cyan-700" /> Alur Siklus Dokumen (Klik Tahap untuk Filter):
                  </span>
                  {baFilter !== "All" && (
                    <button
                      type="button"
                      onClick={() => setBaFilter("All")}
                      className="text-[11px] font-extrabold text-cyan-800 hover:text-cyan-950 underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Reset (Tampilkan Semua)
                    </button>
                  )}
                </div>

                {/* Connected Arrow / Chevron Process Bar with Horizontal Scrollbar Container */}
                <div className="w-full overflow-x-auto pb-2.5">
                  <div className="flex items-stretch min-w-[1150px] bg-slate-200/90 p-1.5 rounded-2xl border border-slate-300 shadow-2xs gap-0">
                    {/* Step 1: Draft & Survey */}
                    <div
                      onClick={() => setBaFilter(baFilter === "Submit" ? "All" : "Submit")}
                      style={{
                        clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%)",
                      }}
                      className={`flex-1 min-w-[220px] py-3 pl-4 pr-7 transition-all cursor-pointer select-none relative ${
                        baFilter === "Submit"
                          ? "bg-slate-800 text-white shadow-md z-10 brightness-110"
                          : "bg-white hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                          <Pickaxe size={14} className={baFilter === "Submit" ? "text-cyan-400" : "text-slate-600"} />
                          1. Draft & Survey
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                          baFilter === "Submit" ? "bg-slate-700 text-cyan-300 border border-slate-600" : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}>
                          {stageDraftRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-1 font-mono font-black text-sm whitespace-nowrap ${baFilter === "Submit" ? "text-white" : "text-slate-900"}`}>
                        {formatIDR(stageDraftNominal)}
                      </div>
                      <div className={`text-[10px] font-medium mt-0.5 whitespace-nowrap ${baFilter === "Submit" ? "text-slate-300" : "text-slate-500"}`}>
                        Entri site & survey lapangan
                      </div>
                    </div>

                    {/* Step 2: Verifikasi SPV */}
                    <div
                      onClick={() => setBaFilter(baFilter === "Pending Berita Acara" ? "All" : "Pending Berita Acara")}
                      style={{
                        clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%, 15px 50%)",
                      }}
                      className={`flex-1 min-w-[220px] py-3 pl-7 pr-7 transition-all cursor-pointer select-none relative ${
                        baFilter === "Pending Berita Acara"
                          ? "bg-amber-600 text-white shadow-md z-10 brightness-105"
                          : "bg-white hover:bg-amber-50/70 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                          <ShieldCheck size={14} className={baFilter === "Pending Berita Acara" ? "text-amber-200" : "text-amber-600"} />
                          2. Verifikasi SPV
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                          baFilter === "Pending Berita Acara" ? "bg-amber-800 text-amber-100 border border-amber-500" : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}>
                          {stageVerifRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-1 font-mono font-black text-sm whitespace-nowrap ${baFilter === "Pending Berita Acara" ? "text-white" : "text-amber-900"}`}>
                        {formatIDR(stageVerifNominal)}
                      </div>
                      <div className={`text-[10px] font-medium mt-0.5 whitespace-nowrap ${baFilter === "Pending Berita Acara" ? "text-amber-100" : "text-slate-500"}`}>
                        Pemeriksaan internal FATB
                      </div>
                    </div>

                    {/* Step 3: Revisi / Tertahan */}
                    <div
                      onClick={() => setBaFilter(baFilter === "Revisi" ? "All" : "Revisi")}
                      style={{
                        clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%, 15px 50%)",
                      }}
                      className={`flex-1 min-w-[220px] py-3 pl-7 pr-7 transition-all cursor-pointer select-none relative ${
                        baFilter === "Revisi"
                          ? "bg-rose-600 text-white shadow-md z-10 brightness-105"
                          : "bg-white hover:bg-rose-50/70 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                          <AlertCircle size={14} className={baFilter === "Revisi" ? "text-rose-200" : "text-rose-600"} />
                          3. Revisi / Tertahan
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                          baFilter === "Revisi" ? "bg-rose-800 text-rose-100 border border-rose-500" : "bg-rose-100 text-rose-900 border border-rose-300"
                        }`}>
                          {stageRevisiRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-1 font-mono font-black text-sm whitespace-nowrap ${baFilter === "Revisi" ? "text-white" : "text-rose-900"}`}>
                        {formatIDR(stageRevisiNominal)}
                      </div>
                      <div className={`text-[10px] font-medium mt-0.5 whitespace-nowrap ${baFilter === "Revisi" ? "text-rose-100" : "text-slate-500"}`}>
                        Perlu perbaikan catatan
                      </div>
                    </div>

                    {/* Step 4: Siap Terbit Invoice */}
                    <div
                      onClick={() => setBaFilter(baFilter === "Ready to Invoice" ? "All" : "Ready to Invoice")}
                      style={{
                        clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%, 15px 50%)",
                      }}
                      className={`flex-1 min-w-[220px] py-3 pl-7 pr-7 transition-all cursor-pointer select-none relative ${
                        baFilter === "Ready to Invoice"
                          ? "bg-emerald-600 text-white shadow-md z-10 brightness-105"
                          : "bg-white hover:bg-emerald-50/70 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                          <FileCheck size={14} className={baFilter === "Ready to Invoice" ? "text-emerald-200" : "text-emerald-700"} />
                          4. Siap Terbit Invoice
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                          baFilter === "Ready to Invoice" ? "bg-emerald-900 text-emerald-100 border border-emerald-500" : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}>
                          {stageReadyRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-1 font-mono font-black text-sm whitespace-nowrap ${baFilter === "Ready to Invoice" ? "text-white" : "text-emerald-900"}`}>
                        {formatIDR(stageReadyNominal)}
                      </div>
                      <div className={`text-[10px] font-bold mt-0.5 flex items-center gap-1 whitespace-nowrap ${baFilter === "Ready to Invoice" ? "text-amber-300" : "text-emerald-700"}`}>
                        <Zap size={11} className={baFilter === "Ready to Invoice" ? "fill-amber-300 text-amber-300" : "fill-amber-500 text-amber-500"} />
                        1-Click Terbitkan Tagihan
                      </div>
                    </div>

                    {/* Step 5: Arsip (Sudah Terbit Invoice) */}
                    <div
                      onClick={() => setBaFilter(baFilter === "Arsip" ? "All" : "Arsip")}
                      style={{
                        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 15px 50%)",
                      }}
                      className={`flex-1 min-w-[220px] py-3 pl-7 pr-4 transition-all cursor-pointer select-none relative ${
                        baFilter === "Arsip"
                          ? "bg-purple-800 text-white shadow-md z-10 brightness-105"
                          : "bg-white hover:bg-purple-50/70 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                          <Archive size={14} className={baFilter === "Arsip" ? "text-purple-200" : "text-purple-700"} />
                          5. Arsip (Invoiced)
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
                          baFilter === "Arsip" ? "bg-purple-950 text-purple-200 border border-purple-600" : "bg-purple-100 text-purple-900 border border-purple-300"
                        }`}>
                          {stageArsipRows.length} BA
                        </span>
                      </div>
                      <div className={`mt-1 font-mono font-black text-sm whitespace-nowrap ${baFilter === "Arsip" ? "text-white" : "text-purple-900"}`}>
                        {formatIDR(stageArsipNominal)}
                      </div>
                      <div className={`text-[10px] font-medium mt-0.5 whitespace-nowrap ${baFilter === "Arsip" ? "text-purple-200" : "text-slate-500"}`}>
                        Sudah Resmi Terbit Invoice
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="data-table w-full min-w-[1250px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3 whitespace-nowrap min-w-[220px]">Identitas BA & Customer</th>
                      <th className="p-3 whitespace-nowrap min-w-[110px]">Periode & SOW</th>
                      <th className="p-3 text-right whitespace-nowrap min-w-[160px]">Nilai Klaim (Rp)</th>
                      <th className="p-3 whitespace-nowrap min-w-[160px]">Alur Tanggal & Lead Time</th>
                      <th className="p-3 text-center whitespace-nowrap min-w-[160px]">Status Siklus BA</th>
                      <th className="p-3 whitespace-nowrap min-w-[120px]">Berkas PDF</th>
                      <th className="p-3 min-w-[220px]">Catatan / Bottleneck</th>
                      <th className="p-3 text-right whitespace-nowrap min-w-[160px] sticky right-0 bg-slate-100 text-slate-700 border-l border-slate-200">Aksi & Integrasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
                    {groupedCustomers.map((custCode) => {
                      const custRows = filteredBARows.filter((r) => (r.customerCode || "OTHER") === custCode);
                      const custSubtotal = custRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

                      return (
                        <Fragment key={custCode}>
                          {/* Client Header Row */}
                          <tr className="bg-slate-50/90 font-extrabold text-xs border-t border-b border-slate-200">
                            <td colSpan={8} className="p-2.5 bg-slate-100/60 uppercase tracking-wider relative">
                              <div className="flex items-center justify-between">
                                <div className="sticky left-3 flex items-center gap-2 z-10">
                                  <span className="w-2 h-2 rounded-full bg-cyan-700 inline-block"></span>
                                  <span className="font-extrabold text-slate-900 text-xs">{custCode}</span>
                                  <span className="text-[10px] text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {custRows.length} Dokumen BA
                                  </span>
                                </div>
                                <div className="sticky right-3 font-mono text-slate-800 text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1.5 ml-auto z-10">
                                  <span className="text-slate-500 font-bold text-[10.5px]">TOTAL {custCode}:</span>
                                  <strong className="text-slate-900 text-xs font-black">{formatIDR(custSubtotal)}</strong>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Client Rows */}
                          {custRows.map((row: any) => {
                            const invStatus = getBAInvoiceStatus(row, invoiceRows);
                            const isInvoiced = invStatus.isFullyInvoiced;
                            const isReady = (row.statusBA === "Ready to Invoice" || row.statusBA === "Approved") && !isInvoiced;
                            const linkedInvoice = invStatus.createdMiningInv || invStatus.createdMDOInv || invStatus.createdInvoices[0] || null;
                            const isDropdownOpen = baRowActionDropdownId === row.id;

                            return (
                              <tr key={row.id} className={`hover:bg-slate-50/90 transition group ${isDropdownOpen ? "relative z-30" : ""}`}>
                                {/* Kolom 1: Identitas BA & Customer */}
                                <td className="p-3">
                                  <div className="space-y-1">
                                    <div className="font-mono font-black text-slate-900 text-xs">
                                      {row.baNumber}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                      <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 font-extrabold text-[10px]">
                                        {row.customerCode || "—"}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                                        {row.dataSource || "Joint Survey"}
                                      </span>
                                      <span className="text-slate-500 font-medium text-[10px]">
                                        PIC: {row.picAAP || "Site Engineer"}
                                      </span>
                                    </div>
                                    {/* Ratio OB:Coal Indicator (for BGG / Coal clients) */}
                                    {row.customerCode === "BGG" && row.coalVolume && row.coalVolume > 0 && row.obVolume && (
                                      <div className="pt-0.5 flex items-center gap-1">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-800">
                                          SR {(row.obVolume / row.coalVolume).toFixed(2)} : 1
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Kolom 2: Periode & SOW */}
                                <td className="p-3 text-slate-700 whitespace-nowrap">
                                  <div className="font-bold text-slate-900">{row.workPeriod || "-"}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {row.items?.length ? `${row.items.length} Rincian Item` : "Operasional"}
                                  </div>
                                </td>

                                {/* Kolom 3: Nilai Klaim (Rp) */}
                                <td className="p-3 text-right whitespace-nowrap">
                                  <div className="font-mono font-black text-emerald-700 text-sm">
                                    {formatIDR(row.workAmount || 0)}
                                  </div>
                                  {row.initialWorkAmount && row.adjustedWorkAmount && row.initialWorkAmount !== row.adjustedWorkAmount && (
                                    <div className={`text-[10px] font-mono font-bold ${row.adjustedWorkAmount >= row.initialWorkAmount ? "text-emerald-600" : "text-rose-600"}`}>
                                      {row.adjustedWorkAmount >= row.initialWorkAmount ? `+${formatIDR(row.adjustedWorkAmount - row.initialWorkAmount)} (Survey)` : `-${formatIDR(row.initialWorkAmount - row.adjustedWorkAmount)} (Survey)`}
                                    </div>
                                  )}
                                </td>

                                {/* Kolom 4: Alur Tanggal & Lead Time */}
                                <td className="p-3 text-[11px] text-slate-700 whitespace-nowrap">
                                  <div>
                                    <span className="text-slate-400 font-medium">Diajukan: </span>
                                    <span className="font-semibold">{row.baSubmittedDate ? new Date(row.baSubmittedDate).toLocaleDateString("id-ID") : "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-medium">TTD Klien: </span>
                                    <span className="font-semibold">{row.baSignedDate ? new Date(row.baSignedDate).toLocaleDateString("id-ID") : "-"}</span>
                                    {row.leadTimeDays ? (
                                      <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                                        {row.leadTimeDays} hari
                                      </span>
                                    ) : null}
                                  </div>
                                </td>

                                {/* Kolom 5: Status Siklus BA */}
                                <td className="p-3 text-center whitespace-nowrap">
                                  {renderBAStatusBadge(row.statusBA, row.invoiceNoLinked, isInvoiced, row, invoiceRows)}
                                </td>

                                {/* Kolom 6: Berkas PDF */}
                                <td className="p-3 whitespace-nowrap text-xs">
                                  <div className="flex flex-col gap-1">
                                    {row.draftBAPath && (
                                      <a
                                        href={`/api/finance/files/${row.draftBAPath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-900 hover:underline font-bold transition cursor-pointer"
                                        title="Buka Draft PDF BA (New Tab)"
                                      >
                                        <FileText size={12} /> Draft PDF
                                      </a>
                                    )}
                                    {row.finalBAPath && (
                                      <a
                                        href={`/api/finance/files/${row.finalBAPath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline font-bold transition cursor-pointer"
                                        title="Buka Final PDF BA (New Tab)"
                                      >
                                        <CheckCircle size={12} /> Final PDF
                                      </a>
                                    )}
                                    {!row.draftBAPath && !row.finalBAPath && (
                                      <span className="text-[10px] text-slate-400 italic">Belum Ada PDF</span>
                                    )}
                                  </div>
                                </td>

                                {/* Kolom 7: Catatan & Bottleneck */}
                                <td className="p-3 min-w-[220px]">
                                  <div className="text-[11px] line-clamp-2">
                                    {row.notesBottleneck && <span className="font-bold text-slate-800 block">{row.notesBottleneck}</span>}
                                    <span className="text-slate-500">{row.notes || "-"}</span>
                                  </div>
                                </td>

                                {/* Kolom 8: Aksi & Integrasi */}
                                <td className={`p-3 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 shadow-l ${isDropdownOpen ? "z-30" : "z-0"}`}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* POS: Kondisi 1 dari 2 Invoice Terbit (Parsial) */}
                                    {row.customerCode === "POS" && invStatus.isPartiallyInvoiced && (
                                      <div className="flex items-center gap-1">
                                        {/* Tombol Terbitkan Sisa Invoice */}
                                        {invStatus.createdMiningInv ? (
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
                                    {row.customerCode === "POS" && isReady && !invStatus.isPartiallyInvoiced && (
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

                                    {/* Non-POS: Ready to Invoice (1-Click) */}
                                    {row.customerCode !== "POS" && isReady && (
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
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                        Menunggu Verifikasi
                                      </span>
                                    )}

                                    <button
                                      className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition cursor-pointer"
                                      onClick={() => openBAModal(row, false)}
                                      title="View Detail & Audit Trail"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                      onClick={() => openBAModal(row, true)}
                                      title="Edit Berita Acara (Mode Edit)"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                      onClick={() => handleDelete("ba", row.id)}
                                      title="Hapus BA"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
          </>
        );
}

