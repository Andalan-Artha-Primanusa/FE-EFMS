import React, { useEffect, useState, Fragment } from "react";
import {
  Plus, RefreshCw, ChevronDown, Eye, Edit2, Trash2,
  FileSpreadsheet, FileText, CheckCircle2, UserCheck, FileCheck,
  Receipt, Pickaxe, Building2, ExternalLink
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, type User as UserType } from "../../lib/api";
import { formatIDR } from "../../utils/finance/formatters";
import { parsePeriodToMonthIndex } from "../../utils/finance/parsePeriod";
import { InvoiceStatusBadge } from "../../components/finance/shared/StatusBadge";
import { InvoiceModalForm } from "../../components/finance/invoice/InvoiceModalForm";
import { InvoiceDetailViewModal } from "../../components/finance/invoice/InvoiceDetailViewModal";
import { exportAROnlyExcel, exportAROnlyPDF } from "../../utils/finance/exportHelpers";
import type { InvoiceRow, BARow, CustomerRow } from "../../types/finance";

interface InvoiceManagementPageProps {
  query?: string;
  onNotice: (msg: string) => void;
  user?: UserType;
}

export function InvoiceManagementPage({ query = "", onNotice, user }: InvoiceManagementPageProps) {
  const [loading, setLoading] = useState(true);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
  const [baRows, setBaRows] = useState<BARow[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerRow[]>([]);

  // Filter & tab states
  const [invCardTab, setInvCardTab] = useState<"AR_ANDALAN" | "PENALTY_UNCUT" | "SUBJECT_TO_INVOICE">("AR_ANDALAN");
  const [invPeriodFilter, setInvPeriodFilter] = useState("Jul-26");
  const [invStatusFilter, setInvStatusFilter] = useState("All");
  const [showExportARDropdown, setShowExportARDropdown] = useState(false);
  const [showInputARDropdown, setShowInputARDropdown] = useState(false);

  // Modal Detail & Form
  const [detailItem, setDetailItem] = useState<InvoiceRow | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InvoiceRow | null>(null);
  const [modalCustCode, setModalCustCode] = useState("POS");
  const [modalActGroup, setModalActGroup] = useState("OPERATION & MINING");
  const [modalInvCategory, setModalInvCategory] = useState("Operation & Mining");

  const userRole = user?.role || "Super Admin";
  const isSuper = userRole === "Super Admin" || userRole === "Superadmin";
  const isSPV = isSuper || userRole.includes("Specialist") || userRole.includes("SPV") || userRole.includes("Supervisor") || userRole.includes("Admin");
  const isManager = isSuper || userRole.includes("Manager") || userRole.includes("FATB") || userRole.includes("Head");
  const isDirector = isSuper || userRole.includes("Director") || userRole.includes("Direktur");

  async function loadData() {
    setLoading(true);
    try {
      const [invRes, baRes, custRes] = await Promise.all([
        api<any[]>("/api/finance/invoices").catch(() => []),
        api<any[]>("/api/finance/ba-trackers").catch(() => []),
        api<any[]>("/api/finance/customers").catch(() => [])
      ]);
      if (Array.isArray(invRes)) setInvoiceRows(invRes);
      if (Array.isArray(baRes)) setBaRows(baRes);
      if (Array.isArray(custRes)) setCustomerRows(custRes);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data Invoice");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const targetPeriodIndex = parsePeriodToMonthIndex(invPeriodFilter);
  const periodFilteredUnpaidInvoices = invoiceRows.filter((r) => {
    if (invPeriodFilter !== "All") {
      const rowPeriodIndex = parsePeriodToMonthIndex(r.workPeriod || "");
      if (rowPeriodIndex > targetPeriodIndex) return false;
    }
    const outstandingAmount = r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0));
    if (outstandingAmount <= 0 || r.status === "Paid") return false;
    return true;
  });

  const totalARAndalan = periodFilteredUnpaidInvoices.reduce((acc, r) => acc + (r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0))), 0);
  const totalPenaltyUncut = 998082501;
  const unlinkedBASum = baRows.filter((r) => !r.invoiceNoLinked).reduce((acc, r) => acc + (r.workAmount || 0), 0);
  const totalSubjectToInvoice = unlinkedBASum > 0 ? unlinkedBASum : 57583855425;

  const penaltyDataRows = [
    { id: "pen-1", customerCode: "SBS", workPeriod: "Dec-25", invoiceNo: "-", remarks: "*Progress Pinalty yang belum di potong", amount: 559207510, outstanding: 559207510, status: "Pending Cut" },
    { id: "pen-2", customerCode: "SBS", workPeriod: "Feb-26", invoiceNo: "-", remarks: "*Progress Pinalty yang belum di potong", amount: 35619126, outstanding: 35619126, status: "Pending Cut" },
    { id: "pen-3", customerCode: "SBS", workPeriod: "Mar-26", invoiceNo: "-", remarks: "*Progress Pinalty yang belum di potong", amount: 403255865, outstanding: 403255865, status: "Pending Cut" }
  ];

  const subjectToInvoiceDataRows = [
    { id: "sti-1", customerCode: "DBK", workPeriod: "May-26", invoiceNo: "-", remarks: "OB & CG", amount: 5263565882, outstanding: 5263565882, status: "Ready to Invoice" },
    { id: "sti-2", customerCode: "DBK", workPeriod: "Jun-26", invoiceNo: "-", remarks: "OB & CG", amount: 7871921068, outstanding: 7871921068, status: "Pending BAI" },
    { id: "sti-3", customerCode: "DBK", workPeriod: "Jul-26", invoiceNo: "-", remarks: "OB & CG", amount: 7939562262, outstanding: 7939562262, status: "Pending BAI" },
    { id: "sti-4", customerCode: "BGG", workPeriod: "Jul-26", invoiceNo: "-", remarks: "OB & CG", amount: 6968660678, outstanding: 6968660678, status: "Ready to Invoice" },
    { id: "sti-5", customerCode: "SBS", workPeriod: "Jul-26", invoiceNo: "-", remarks: "OB & CG", amount: 15518233011, outstanding: 15518233011, status: "Pending BAI" },
    { id: "sti-6", customerCode: "POS", workPeriod: "Jul-26", invoiceNo: "-", remarks: "OB & CG", amount: 14021912524, outstanding: 14021912524, status: "Ready to Invoice" },
    ...baRows.filter((r) => !r.invoiceNoLinked).map((ba) => ({
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

  const currentDisplayRows = invCardTab === "AR_ANDALAN"
    ? periodFilteredUnpaidInvoices
    : invCardTab === "PENALTY_UNCUT"
    ? penaltyDataRows
    : subjectToInvoiceDataRows;

  const filteredInvoices = currentDisplayRows.filter((r) => {
    const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
    if (!matchQ) return false;
    if (invStatusFilter !== "All" && r.status !== invStatusFilter) return false;
    return true;
  });

  const groupedCust = Array.from(new Set(filteredInvoices.map((r) => r.customerCode || "OTHER")));

  const handleVerifySPV = async (id: number) => {
    try {
      await api(`/api/finance/invoices/${id}/verify`, { method: "PUT" });
      onNotice("✅ Invoice berhasil diverifikasi oleh SPV.");
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal verifikasi invoice");
    }
  };

  const handleApproveTier1 = async (id: number) => {
    try {
      await api(`/api/finance/invoices/${id}/approve-tier1`, { method: "PUT" });
      onNotice("✅ Persetujuan Tier 1 (FATB Manager) berhasil.");
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal approve Tier 1");
    }
  };

  const handleApproveTier2 = async (id: number) => {
    try {
      await api(`/api/finance/invoices/${id}/approve-tier2`, { method: "PUT" });
      onNotice("🎉 Persetujuan Tier 2 (Direktur) berhasil. Invoice resmi diterbitkan!");
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal approve Tier 2");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data Invoice ini?")) return;
    try {
      await api(`/api/finance/invoices/${id}`, { method: "DELETE" });
      onNotice("Invoice berhasil dihapus.");
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus invoice");
    }
  };

  const openCreateModal = (custCode: string = "POS", actGroup: string = "OPERATION & MINING", invCat: string = "Operation & Mining") => {
    setEditItem(null);
    setModalCustCode(custCode);
    setModalActGroup(actGroup);
    setModalInvCategory(invCat);
    setInvoiceModalOpen(true);
  };

  const openEditModal = (inv: InvoiceRow) => {
    setEditItem(inv);
    setModalCustCode(inv.customerCode || "POS");
    setInvoiceModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 3 STAT CARDS CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Master Penagihan & Outstanding AR
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Monitoring status penagihan invoice, progres persetujuan bertingkat, dan klaim outstanding.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">PERIODE:</span>
              <select
                className="bg-white text-slate-900 font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-300 focus:border-cyan-700 focus:outline-none cursor-pointer"
                value={invPeriodFilter}
                onChange={(e) => setInvPeriodFilter(e.target.value)}
              >
                <option value="All">Semua Periode</option>
                <option value="Jul-26">Jul-26</option>
                <option value="Jun-26">Jun-26</option>
                <option value="Mei-26">Mei-26</option>
                <option value="Apr-26">Apr-26</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <select
                className="bg-white text-slate-900 font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-300 focus:border-cyan-700 focus:outline-none cursor-pointer"
                value={invStatusFilter}
                onChange={(e) => setInvStatusFilter(e.target.value)}
              >
                <option value="All">Semua Status</option>
                <option value="Overdue">Overdue</option>
                <option value="Paid">Paid (Lunas)</option>
                <option value="Verified">Verified SPV</option>
                <option value="Approved_Tier1">Approved Tier 1</option>
                <option value="Issued">Issued (Tier 2)</option>
              </select>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-white border border-cyan-700 text-cyan-800 hover:bg-cyan-50 shadow-xs transition cursor-pointer shrink-0"
                onClick={() => setShowExportARDropdown(!showExportARDropdown)}
              >
                <FileText size={15} />
                <span>Export AR</span>
                <ChevronDown size={14} />
              </button>

              {showExportARDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportARDropdown(false)} />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-xs font-bold divide-y divide-slate-100">
                    <button
                      type="button"
                      className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition cursor-pointer"
                      onClick={() => {
                        exportAROnlyExcel(invoiceRows, query, invPeriodFilter, onNotice);
                        setShowExportARDropdown(false);
                      }}
                    >
                      <FileSpreadsheet size={15} className="text-emerald-600" /> Export Excel AR
                    </button>
                    <button
                      type="button"
                      className="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
                      onClick={() => {
                        exportAROnlyPDF(invoiceRows, query, invPeriodFilter);
                        setShowExportARDropdown(false);
                      }}
                    >
                      <FileText size={15} className="text-rose-600" /> Export PDF AR
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Input Dropdown */}
            <div className="relative">
              <button
                type="button"
                className="primary flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-xs transition shrink-0 cursor-pointer"
                onClick={() => setShowInputARDropdown(!showInputARDropdown)}
              >
                <Plus size={16} />
                <span>+ Input / Buat Invoice</span>
                <ChevronDown size={14} />
              </button>

              {showInputARDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowInputARDropdown(false)} />
                  <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 text-xs font-bold divide-y divide-slate-100">
                    <button
                      type="button"
                      className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-cyan-50 flex items-start gap-2.5 transition cursor-pointer"
                      onClick={() => {
                        openCreateModal("POS", "OPERATION & MINING", "Operation & Mining");
                        setShowInputARDropdown(false);
                      }}
                    >
                      <Pickaxe size={16} className="text-cyan-700 mt-0.5 shrink-0" />
                      <div>
                        <strong className="block text-slate-900 font-extrabold">1. Invoice Operations & Mining (POS)</strong>
                        <span className="text-[10px] text-slate-500 font-normal">OB Removal, Top Soil, Nikel Ore, Overhaul</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-indigo-50 flex items-start gap-2.5 transition cursor-pointer"
                      onClick={() => {
                        openCreateModal("POS", "MINE DEVELOPMENT OPERATION (MDO)", "MDO");
                        setShowInputARDropdown(false);
                      }}
                    >
                      <Building2 size={16} className="text-indigo-700 mt-0.5 shrink-0" />
                      <div>
                        <strong className="block text-slate-900 font-extrabold">2. Invoice Mine Development / MDO (POS)</strong>
                        <span className="text-[10px] text-slate-500 font-normal">Cut & Fill, Clearing, Access Road</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="w-full px-3.5 py-2.5 text-left text-slate-800 hover:bg-emerald-50 flex items-start gap-2.5 transition cursor-pointer"
                      onClick={() => {
                        openCreateModal("BGG", "OB REMOVAL & COAL WINNING", "Mining");
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

        {/* 3 Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div
            onClick={() => setInvCardTab("AR_ANDALAN")}
            className={`p-4 rounded-2xl border transition cursor-pointer space-y-1 ${
              invCardTab === "AR_ANDALAN"
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black uppercase tracking-wider">1. AR Outstanding Andalan</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${invCardTab === "AR_ANDALAN" ? "bg-slate-800 text-cyan-300" : "bg-white text-slate-700 border"}`}>
                {periodFilteredUnpaidInvoices.length} Inv
              </span>
            </div>
            <div className="text-2xl font-black font-mono pt-1">{formatIDR(totalARAndalan)}</div>
            <p className={`text-[11px] ${invCardTab === "AR_ANDALAN" ? "text-slate-300" : "text-slate-500"}`}>
              Tagihan aktif belum lunas
            </p>
          </div>

          <div
            onClick={() => setInvCardTab("PENALTY_UNCUT")}
            className={`p-4 rounded-2xl border transition cursor-pointer space-y-1 ${
              invCardTab === "PENALTY_UNCUT"
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black uppercase tracking-wider">2. Penalty Belum Dipotong</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${invCardTab === "PENALTY_UNCUT" ? "bg-slate-800 text-amber-300" : "bg-white text-slate-700 border"}`}>
                3 Item
              </span>
            </div>
            <div className="text-2xl font-black font-mono pt-1">{formatIDR(totalPenaltyUncut)}</div>
            <p className={`text-[11px] ${invCardTab === "PENALTY_UNCUT" ? "text-slate-300" : "text-slate-500"}`}>
              Denda MA / BBM tertahan
            </p>
          </div>

          <div
            onClick={() => setInvCardTab("SUBJECT_TO_INVOICE")}
            className={`p-4 rounded-2xl border transition cursor-pointer space-y-1 ${
              invCardTab === "SUBJECT_TO_INVOICE"
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black uppercase tracking-wider">3. Subject to Invoice (BAI)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${invCardTab === "SUBJECT_TO_INVOICE" ? "bg-slate-800 text-emerald-300" : "bg-white text-slate-700 border"}`}>
                {subjectToInvoiceDataRows.length} BA
              </span>
            </div>
            <div className="text-2xl font-black font-mono pt-1">{formatIDR(totalSubjectToInvoice)}</div>
            <p className={`text-[11px] ${invCardTab === "SUBJECT_TO_INVOICE" ? "text-slate-300" : "text-slate-500"}`}>
              Proyeksi pendapatan BA siap tagih
            </p>
          </div>
        </div>
      </div>

      {/* TABLE PANEL */}
      <Panel title={`Rincian Penagihan: ${invCardTab === "AR_ANDALAN" ? "AR Outstanding" : invCardTab === "PENALTY_UNCUT" ? "Penalty Belum Dipotong" : "Subject to Invoice"}`}>
        <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
          <table className="data-table w-full min-w-[1250px] text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200 font-sans">
                <th className="p-3">Customer</th>
                <th className="p-3">Periode</th>
                <th className="p-3">No. Invoice</th>
                <th className="p-3">Description / SOW</th>
                <th className="p-3 text-right">Total Invoice (Rp)</th>
                {invCardTab === "AR_ANDALAN" && (
                  <>
                    <th className="p-3">Invoice Date</th>
                    <th className="p-3">Issued Date</th>
                    <th className="p-3">Due Date</th>
                  </>
                )}
                <th className="p-3 text-right">Outstanding (Rp)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right sticky right-0 bg-slate-100 text-slate-700 border-l border-slate-200">Aksi & Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
              {/* TAB 1: AR ANDALAN */}
              {invCardTab === "AR_ANDALAN" && (() => {
                const filteredInv = periodFilteredUnpaidInvoices.filter((r) => {
                  const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
                  if (!matchQ) return false;
                  if (invStatusFilter !== "All" && r.status !== invStatusFilter) return false;
                  return true;
                });
                const groupedCust = Array.from(new Set(filteredInv.map((r) => r.customerCode || "OTHER")));

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
                            <InvoiceStatusBadge status={row.status || "Draft"} />
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap min-w-[150px]">
                              {isSPV && (row.status === "Draft" || !row.status || row.status === "Pending") && (
                                <button
                                  className="px-2 py-1 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-[11px] rounded shadow-sm inline-flex items-center gap-1 transition shrink-0 whitespace-nowrap font-sans cursor-pointer"
                                  onClick={() => handleVerifySPV(row.id)}
                                  title="Verifikasi Invoice (SPV)"
                                >
                                  Verifikasi SPV
                                </button>
                              )}
                              {isManager && (row.status === "Verified" || row.status === "Draft" || row.status === "Pending") && (
                                <button
                                  className="px-2 py-1 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] rounded shadow-sm inline-flex items-center gap-1 transition shrink-0 whitespace-nowrap font-sans cursor-pointer"
                                  onClick={() => handleApproveTier1(row.id)}
                                  title="Approve Tier 1 (Manager)"
                                >
                                  Approve Mgr (T1)
                                </button>
                              )}
                              {isDirector && (row.status === "Approved_Tier1" || row.status === "Verified") && (
                                <button
                                  className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] rounded shadow-sm inline-flex items-center gap-1 transition shrink-0 whitespace-nowrap font-sans cursor-pointer"
                                  onClick={() => handleApproveTier2(row.id)}
                                  title="Approve Tier 2 (Direktur Eksekutif)"
                                >
                                  Approve Dir (T2)
                                </button>
                              )}
                              <button className="p-1.5 rounded border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition shrink-0 cursor-pointer" onClick={() => setDetailItem(row)} title="Lihat Detail & Tracking Log">
                                <Eye size={14} />
                              </button>
                              <button className="p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer" onClick={() => openEditModal(row)} title="Edit Invoice">
                                <Edit2 size={14} />
                              </button>
                              <button className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shrink-0 cursor-pointer" onClick={() => handleDelete(row.id)} title="Hapus Invoice">
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
                const groupedCust = Array.from(new Set(filteredPen.map((r) => r.customerCode)));

                return groupedCust.map((custCode) => {
                  const clientRows = filteredPen.filter((r) => r.customerCode === custCode);
                  const clientTotalPenalty = clientRows.reduce((sum, r) => sum + r.outstanding, 0);

                  return (
                    <Fragment key={custCode}>
                      <tr className="bg-slate-50/90 font-extrabold text-xs border-t border-b border-slate-200 font-sans">
                        <td colSpan={8} className="p-2.5 px-3 bg-slate-100/60 uppercase tracking-wider font-sans">
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
                          <td className="p-2.5 text-right font-mono font-bold text-amber-800">{formatIDR(row.outstanding)}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              {row.status}
                            </span>
                          </td>
                          <td></td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200 font-sans">
                        <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-xs font-extrabold text-slate-700 font-sans">TOTAL PROGRESS PINALTY {custCode}:</td>
                        <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-slate-900 font-sans">{formatIDR(clientTotalPenalty)}</td>
                        <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-amber-800 font-sans">{formatIDR(clientTotalPenalty)}</td>
                        <td colSpan={2}></td>
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
                const groupedCust = Array.from(new Set(filteredSti.map((r) => r.customerCode)));

                return groupedCust.map((custCode) => {
                  const clientRows = filteredSti.filter((r) => r.customerCode === custCode);
                  const clientTotalSti = clientRows.reduce((sum, r) => sum + r.outstanding, 0);

                  return (
                    <Fragment key={custCode}>
                      <tr className="bg-slate-50/90 font-extrabold text-xs border-t border-b border-slate-200 font-sans">
                        <td colSpan={8} className="p-2.5 px-3 bg-slate-100/60 uppercase tracking-wider font-sans">
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
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-800">{formatIDR(row.outstanding)}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === "Ready to Invoice" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-cyan-100 text-cyan-900 border border-cyan-300"}`}>
                              {row.status}
                            </span>
                          </td>
                          <td></td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200 font-sans">
                        <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-xs font-extrabold text-slate-700 font-sans">TOTAL SUBJECT TO INVOICE {custCode}:</td>
                        <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-slate-900 font-sans">{formatIDR(clientTotalSti)}</td>
                        <td className="p-2.5 text-right font-mono text-xs sm:text-sm font-black text-emerald-800 font-sans">{formatIDR(clientTotalSti)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </Fragment>
                  );
                });
              })()}
            </tbody>

            {/* GRAND SUMMARY FOOTER ROW */}
            <tfoot className="bg-slate-50/95 text-slate-800 font-bold text-xs border-t-2 border-slate-200 font-sans">
              <tr>
                <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-xs font-black text-slate-800 font-sans">
                  {invCardTab === "AR_ANDALAN" ? "TOTAL AR ANDALAN" : invCardTab === "PENALTY_UNCUT" ? "TOTAL PROGRESS PINALTY" : "TOTAL SUBJECT TO INVOICE"}:
                </td>
                <td className="p-3 text-right font-mono text-xs sm:text-sm font-black text-slate-900 font-sans">
                  {invCardTab === "AR_ANDALAN" ? formatIDR(totalARAndalan) : invCardTab === "PENALTY_UNCUT" ? formatIDR(totalPenaltyUncut) : formatIDR(totalSubjectToInvoice)}
                </td>
                {invCardTab === "AR_ANDALAN" && <td colSpan={3}></td>}
                <td className="p-3 text-right font-mono text-sm sm:text-base font-black text-rose-800 font-sans">
                  {invCardTab === "AR_ANDALAN" ? formatIDR(totalARAndalan) : invCardTab === "PENALTY_UNCUT" ? formatIDR(totalPenaltyUncut) : formatIDR(totalSubjectToInvoice)}
                </td>
                <td colSpan={invCardTab === "AR_ANDALAN" ? 2 : 1} className="sticky right-0 bg-slate-50 border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* MODAL INVOICE FORM (CREATE / EDIT) */}
      <InvoiceModalForm
        isOpen={invoiceModalOpen}
        editItem={editItem}
        baRows={baRows}
        invoiceRows={invoiceRows}
        customerRows={customerRows}
        initialCustomerCode={modalCustCode}
        initialActivityGroup={modalActGroup}
        initialInvoiceCategory={modalInvCategory}
        onClose={() => setInvoiceModalOpen(false)}
        onSaved={loadData}
        onNotice={onNotice}
        user={user}
      />

      {/* DETAIL MODAL (2-KOLOM DENGAN PRATINJAU PDF & CATAT CICILAN) */}
      <InvoiceDetailViewModal
        detailItem={detailItem ? { type: "invoice", data: detailItem } : null}
        onClose={() => setDetailItem(null)}
        onNotice={onNotice}
        onReload={loadData}
        invoiceRows={invoiceRows}
        baRows={baRows}
      />
    </div>
  );
}
