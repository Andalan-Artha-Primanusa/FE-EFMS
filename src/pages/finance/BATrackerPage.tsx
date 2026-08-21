import React, { useEffect, useState, Fragment } from "react";
import {
  Calendar, FileText, Plus, RefreshCw, ChevronDown, ChevronRight,
  Pickaxe, ShieldCheck, AlertCircle, FileCheck, Archive, Zap, Scale,
  Eye, Edit2, Trash2, Layers, CheckCircle, ExternalLink, Building2,
  DollarSign, CheckCircle2, TrendingUp, Info, Clock, User, FileSpreadsheet
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, type User as UserType } from "../../lib/api";
import { formatIDR, formatDateInput } from "../../utils/finance/formatters";
import { BAStatusBadge, getBAInvoiceStatus, getBAStatusForExport } from "../../components/finance/shared/StatusBadge";
import { normalizeBARow } from "../../components/finance/ba/BAInvoiceHelpers";
import { BAModalForm } from "../../components/finance/ba/BAModalForm";
import { InvoiceDetailViewModal } from "../../components/finance/invoice/InvoiceDetailViewModal";
import { exportBAOnlyExcel, exportBAOnlyPDF } from "../../utils/finance/exportHelpers";
import type { BARow, InvoiceRow } from "../../types/finance";

interface BATrackerPageProps {
  query?: string;
  onNotice: (msg: string) => void;
  user?: UserType;
  onNavigateToInvoice?: (baRow: any, category?: string) => void;
}

export function BATrackerPage({ query = "", onNotice, onNavigateToInvoice, user }: BATrackerPageProps) {
  const [loading, setLoading] = useState(true);
  const [baRows, setBaRows] = useState<BARow[]>([]);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
  const [pendingVolumeLedgers, setPendingVolumeLedgers] = useState<any[]>([]);

  // Filter & tab states
  const [periodFilter, setPeriodFilter] = useState("Jul-26");
  const [baFilter, setBaFilter] = useState("All");
  const [showExportBADropdown, setShowExportBADropdown] = useState(false);
  const [showInputBADropdown, setShowInputBADropdown] = useState(false);
  const [baRowActionDropdownId, setBaRowActionDropdownId] = useState<number | null>(null);
  const [showPendingVolumeDrawer, setShowPendingVolumeDrawer] = useState(false);

  // Modal Form States
  const [baModalOpen, setBaModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<BARow | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  const [detailViewItem, setDetailViewItem] = useState<{ type: "ba" | "invoice"; data: any } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [baRes, invRes, pVolRes] = await Promise.all([
        api<any[]>("/api/finance/ba-trackers").catch(() => []),
        api<any[]>("/api/finance/invoices").catch(() => []),
        api<any[]>("/api/finance/pending-volumes").catch(() => [])
      ]);
      if (Array.isArray(baRes)) setBaRows(baRes.map(normalizeBARow));
      if (Array.isArray(invRes)) setInvoiceRows(invRes);
      if (Array.isArray(pVolRes)) setPendingVolumeLedgers(pVolRes);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data Berita Acara");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const availablePeriods = Array.from(new Set(baRows.map((r) => r.workPeriod).filter(Boolean)));
  if (!availablePeriods.includes("Jul-26")) availablePeriods.unshift("Jul-26");
  if (!availablePeriods.includes("Jun-26")) availablePeriods.unshift("Jun-26");

  const periodRows = periodFilter === "All" ? baRows : baRows.filter((r) => r.workPeriod === periodFilter);

  const isBAInvoiced = (r: any) => {
    if (!r) return false;
    const invStatus = getBAInvoiceStatus(r, invoiceRows);
    return invStatus.isFullyInvoiced;
  };

  const stageDraftRows = periodRows.filter((r) => r.statusBA === "Submit" || r.statusBA === "Draft" || (r.statusBA || "").startsWith("Submit"));
  const stageDraftNominal = stageDraftRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

  const stageVerifRows = periodRows.filter((r) => r.statusBA === "Pending Berita Acara" || r.statusBA === "Pending" || r.statusBA === "Pending BAI" || r.statusBA === "Verified");
  const stageVerifNominal = stageVerifRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

  const stageRevisiRows = periodRows.filter((r) => r.statusBA === "Revisi" || (r.statusBA || "").startsWith("Reject"));
  const stageRevisiNominal = stageRevisiRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

  const stageReadyRows = periodRows.filter((r) => (r.statusBA === "Ready to Invoice" || r.statusBA === "Approved") && !isBAInvoiced(r));
  const stageReadyNominal = stageReadyRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

  const stageArsipRows = periodRows.filter((r) => (r.statusBA === "Ready to Invoice" || r.statusBA === "Approved" || r.statusBA === "Invoiced" || r.statusBA === "Arsip") && isBAInvoiced(r));
  const stageArsipNominal = stageArsipRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

  const baOnProgressNominal = stageDraftNominal + stageVerifNominal + stageRevisiNominal;
  const baOnProgressCount = stageDraftRows.length + stageVerifRows.length + stageRevisiRows.length;
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

  const groupedCustomers = Array.from(new Set(filteredBARows.map((r) => r.customerCode || "OTHER")));

  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data Berita Acara ini?")) return;
    try {
      await api(`/api/finance/ba-trackers/${id}`, { method: "DELETE" });
      onNotice("Berita Acara berhasil dihapus.");
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus BA");
    }
  };

  const openBAModal = (item: any, editMode: boolean = false) => {
    setEditItem(item);
    setIsEditMode(editMode);
    setBaModalOpen(true);
  };

  const openCreateModal = (custCode: string = "POS") => {
    setEditItem(null);
    setIsEditMode(true);
    setBaModalOpen(true);
  };

  return (
    <div className="space-y-6">
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
                Kelola dokumen klaim produksi tambang dari joint survey hingga siap terbit tagihan resmi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Periode:</span>
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

            {/* Export Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-cyan-700 text-cyan-800 hover:bg-cyan-50 shadow-xs transition cursor-pointer shrink-0"
                onClick={() => setShowExportBADropdown(!showExportBADropdown)}
              >
                <FileText size={15} />
                <span>Export BA</span>
                <ChevronDown size={14} />
              </button>

              {showExportBADropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportBADropdown(false)} />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-xs font-bold divide-y divide-slate-100">
                    <button
                      className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition cursor-pointer"
                      onClick={() => {
                        exportBAOnlyExcel(baRows, query, periodFilter, onNotice);
                        setShowExportBADropdown(false);
                      }}
                    >
                      <FileSpreadsheet size={15} className="text-emerald-600" /> Export Excel BA
                    </button>
                    <button
                      className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
                      onClick={() => {
                        exportBAOnlyPDF(baRows, invoiceRows, query, periodFilter);
                        setShowExportBADropdown(false);
                      }}
                    >
                      <FileText size={15} className="text-rose-600" /> Export PDF BA
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Input BA Dropdown */}
            <div className="relative">
              <button
                className="primary flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white shadow-xs transition shrink-0 cursor-pointer"
                onClick={() => setShowInputBADropdown(!showInputBADropdown)}
              >
                <Plus size={16} />
                <span>+ Input / Tambah BA</span>
                <ChevronDown size={14} />
              </button>

              {showInputBADropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowInputBADropdown(false)} />
                  <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 text-xs font-bold divide-y divide-slate-100">
                    <button
                      className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-cyan-50 flex items-center gap-2 transition cursor-pointer"
                      onClick={() => {
                        openCreateModal("POS");
                        setShowInputBADropdown(false);
                      }}
                    >
                      <Plus size={15} className="text-cyan-700" />
                      <div>
                        <div className="font-bold">+ BA PT POS (Operating & MDO)</div>
                      </div>
                    </button>
                    <button
                      className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-amber-50 flex items-center gap-2 transition cursor-pointer"
                      onClick={() => {
                        openCreateModal("BGG");
                        setShowInputBADropdown(false);
                      }}
                    >
                      <Scale size={15} className="text-amber-600" />
                      <div>
                        <div className="font-bold">+ BA PT BGG (Joint Survey)</div>
                      </div>
                    </button>
                    <button
                      className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-indigo-50 flex items-center gap-2 transition cursor-pointer"
                      onClick={() => {
                        setShowPendingVolumeDrawer(true);
                        setShowInputBADropdown(false);
                      }}
                    >
                      <Layers size={15} className="text-indigo-600" />
                      <div>
                        <div className="font-bold">Buka Kartu Pending Volume</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4 STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border border-emerald-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-700" /> Total BA Siap Invoice
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                {stageReadyRows.length} Dokumen
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-950 pt-1 truncate">
              {formatIDR(stageReadyNominal)}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium">Volume terkonfirmasi siap terbit tagihan resmi</p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-amber-50/50 border border-amber-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Clock size={16} className="text-amber-700" /> BA On Progress
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                {baOnProgressCount} Dokumen
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-950 pt-1 truncate">
              {formatIDR(baOnProgressNominal)}
            </div>
            <p className="text-[11px] text-amber-700 font-medium">Menunggu finalisasi survey / verifikasi SPV</p>
          </div>

          <div
            onClick={() => setShowPendingVolumeDrawer(true)}
            className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 border border-indigo-200/80 hover:border-indigo-400 hover:shadow-md transition cursor-pointer space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Scale size={16} className="text-indigo-700 group-hover:scale-110 transition" /> Pending Volume
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                <span>{pendingVolumeLedgers.length} Periode</span>
                <ChevronRight size={10} />
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-indigo-950 pt-1 truncate">
              {formatIDR(
                pendingVolumeLedgers.reduce((sum, l) => sum + ((l.remainingVolume || 0) * (l.ob1Rate * 0.75 + l.ob2Rate * 0.25 || 27000)), 0)
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-indigo-700 font-medium">
              <span className="truncate">Saldo OB di atas rasio SOW (3:1)</span>
              <span className="text-[10px] font-bold underline shrink-0">Buka Kartu ↗</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-cyan-50/50 border border-cyan-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-cyan-700" /> Estimasi Total Revenue
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-200">
                {periodFilter === "All" ? "Semua Periode" : periodFilter}
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-cyan-950 pt-1 truncate">
              {formatIDR(estTotalRevPeriod)}
            </div>
            <p className="text-[11px] text-cyan-700 font-medium">Proyeksi pendapatan operasional periode berjalan</p>
          </div>
        </div>
      </div>

      {/* TABLE PANEL */}
      <Panel title={`Daftar Berita Acara Pekerjaan (Filter: ${baFilter === "All" ? "Semua Status" : baFilter}, Periode: ${periodFilter})`}>
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
                            <div className="space-y-0.5">
                              <div className="font-mono font-black text-slate-900 text-xs">
                                {row.baNumber}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 font-extrabold text-[10px]">
                                  {row.customerCode || "POS"}
                                </span>
                                <span className="text-slate-500 font-medium">
                                  PIC: {row.picAAP || "Site Engineer"}
                                </span>
                              </div>
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
                                  ⏱️ {row.leadTimeDays}h
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Kolom 5: Status Siklus BA */}
                          <td className="p-3 text-center whitespace-nowrap">
                            {BAStatusBadge({
                              status: row.statusBA,
                              invoiceNoLinked: row.invoiceNoLinked,
                              isInvoiced,
                              baRow: row,
                              allInvoices: invoiceRows
                            })}
                          </td>

                          {/* Kolom 6: Berkas PDF */}
                          <td className="p-3 whitespace-nowrap text-xs">
                            <div className="flex flex-col gap-1">
                              {row.draftBAPath && (
                                <a
                                  href={row.draftBAPath.startsWith("http") || row.draftBAPath.startsWith("blob:") ? row.draftBAPath : `/api/uploads/${row.draftBAPath.replace(/^\/+/, '')}`}
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
                                  href={row.finalBAPath.startsWith("http") || row.finalBAPath.startsWith("blob:") ? row.finalBAPath : `/api/uploads/${row.finalBAPath.replace(/^\/+/, '')}`}
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
                                  {invStatus.createdMiningInv ? (
                                    <button
                                      type="button"
                                      className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                      onClick={() => onNavigateToInvoice && onNavigateToInvoice(row, "MDO")}
                                      title="Terbitkan Sisa Invoice Kategori 2: Mine Development (MDO)"
                                    >
                                      <Building2 size={13} />
                                      <span>⚡ + Inv MDO</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                      onClick={() => onNavigateToInvoice && onNavigateToInvoice(row, "Operation & Mining")}
                                      title="Terbitkan Sisa Invoice Kategori 1: Operations & Mining"
                                    >
                                      <Pickaxe size={13} />
                                      <span>⚡ + Inv Mining</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-950 font-extrabold text-[10.5px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                    onClick={() => {
                                      const targetInv = invStatus.createdMiningInv || invStatus.createdMDOInv;
                                      if (targetInv) {
                                        setDetailViewItem({ type: "invoice", data: targetInv });
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
                                            if (onNavigateToInvoice) onNavigateToInvoice(row, "Operation & Mining");
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
                                            if (onNavigateToInvoice) onNavigateToInvoice(row, "MDO");
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
                                  onClick={() => onNavigateToInvoice && onNavigateToInvoice(row)}
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

                              <button
                                className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition cursor-pointer"
                                onClick={() => setDetailViewItem({ type: "ba", data: row })}
                                title="View Detail 2-Kolom & PDF Preview"
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
                                onClick={() => handleDelete(row.id)}
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
                  {formatIDR(stageReadyNominal + baOnProgressNominal)}
                </td>
                <td colSpan={5} className="p-3 text-right">
                  <div className="flex justify-end items-center gap-4 font-mono text-xs">
                    <div className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <span className="text-emerald-800 font-sans uppercase font-bold text-[10.5px] mr-1.5">Ready to Invoice:</span>
                      <span className="text-emerald-950 font-black text-xs">{formatIDR(stageReadyNominal)}</span>
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

      {/* MODAL BA FORM (CREATE / EDIT) */}
      <BAModalForm
        isOpen={baModalOpen}
        editItem={editItem}
        initialEditMode={isEditMode}
        onClose={() => setBaModalOpen(false)}
        onSaved={loadData}
        onNotice={onNotice}
        user={user}
      />

      {/* MODAL DETAIL VIEW 2 KOLOM & PDF PREVIEW */}
      <InvoiceDetailViewModal
        detailItem={detailViewItem}
        onClose={() => setDetailViewItem(null)}
        onCreateInvoiceFromBA={(ba) => {
          setDetailViewItem(null);
          if (onNavigateToInvoice) onNavigateToInvoice(ba);
        }}
        onNotice={onNotice}
        onReload={loadData}
        invoiceRows={invoiceRows}
        baRows={baRows}
      />

      {/* MODAL KARTU KONTROL PENDING VOLUME */}
      {showPendingVolumeDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <Scale size={20} className="text-indigo-700" />
                <h3 className="text-base font-black text-slate-900">
                  Kartu Kontrol Saldo Pending Volume (Carry-Forward OB)
                </h3>
              </div>
              <button
                onClick={() => setShowPendingVolumeDrawer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-center">Periode Asal</th>
                    <th className="p-3">Ref BA</th>
                    <th className="p-3 text-right">Volume Awal</th>
                    <th className="p-3 text-right">Terserap</th>
                    <th className="p-3 text-right">Sisa Saldo</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingVolumeLedgers.map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{item.customerCode}</td>
                      <td className="p-3 text-center font-mono font-bold">{item.sourcePeriod}</td>
                      <td className="p-3 font-mono text-slate-600">{item.sourceBARef || "-"}</td>
                      <td className="p-3 text-right font-mono">{(item.originalOBVolume || 0).toLocaleString("id-ID")} BCM</td>
                      <td className="p-3 text-right font-mono text-cyan-800">{(item.absorbedVolume || 0).toLocaleString("id-ID")} BCM</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-950">{(item.remainingVolume || 0).toLocaleString("id-ID")} BCM</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {item.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pendingVolumeLedgers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">
                        Belum ada catatan pending volume.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                className="px-5 py-2 rounded-lg bg-indigo-900 text-white font-bold text-xs hover:bg-indigo-950 transition"
                onClick={() => setShowPendingVolumeDrawer(false)}
              >
                Tutup Kartu Kontrol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
