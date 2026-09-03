import React, { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  DollarSign,
  Download,
  Filter,
  Flame,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  Upload,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function ApAgingView({ c }: Props) {
  const {
    invoices,
    totalInvoices,
    agingSummary,
    loading,
    invFilter,
    setInvFilter,
    selectedInvoiceIds,
    setSelectedInvoiceIds,
    partialAmounts,
    setPartialAmounts,
    setShowImportAccurateModal,
    setShowCreatePlanModal,
    fetchInvoices,
  } = c;

  const toggleSelectAll = () => {
    if (selectedInvoiceIds.length === invoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(invoices.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    if (selectedInvoiceIds.includes(id)) {
      setSelectedInvoiceIds(selectedInvoiceIds.filter((x) => x !== id));
    } else {
      setSelectedInvoiceIds([...selectedInvoiceIds, id]);
    }
  };

  const getOverdueDays = (dueDateStr: string) => {
    const due = new Date(dueDateStr).getTime();
    const now = new Date().getTime();
    return Math.floor((now - due) / (1000 * 60 * 60 * 24));
  };

  const getAgingCategory = (days: number) => {
    if (days <= 0) return { label: "Not Due", cat: "Cat 1", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (days <= 30) return { label: "1-30 Days", cat: "Cat 2", color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
    if (days <= 60) return { label: "31-60 Days", cat: "Cat 3", color: "bg-blue-50 text-blue-700 border-blue-200" };
    if (days <= 90) return { label: "61-90 Days", cat: "Cat 4", color: "bg-amber-50 text-amber-700 border-amber-200" };
    if (days <= 120) return { label: "91-120 Days", cat: "Cat 5", color: "bg-orange-50 text-orange-700 border-orange-200" };
    return { label: "> 120 Days", cat: "Cat 6 (Critical)", color: "bg-rose-50 text-rose-700 border-rose-200 font-semibold" };
  };

  const getPriorityBadge = (tag: string) => {
    switch (tag) {
      case "BLOCK_SUPPLY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <ShieldAlert className="w-3 h-3" /> Block Supply
          </span>
        );
      case "SOLAR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Flame className="w-3 h-3 text-amber-600" /> Solar / Fuel
          </span>
        );
      case "LEASING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Truck className="w-3 h-3 text-purple-600" /> Leasing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-slate-600 bg-slate-100">
            Regular AP
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Top Metrics Banner */}
      {agingSummary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Total Outstanding</div>
            <div className="text-base font-bold text-slate-900 mt-1">
              {formatCurrency(Number(agingSummary.totalOutstanding || 0))}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{agingSummary.totalInvoices} Invoices</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-sm bg-rose-50/20">
            <div className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Total Overdue
            </div>
            <div className="text-base font-bold text-rose-700 mt-1">
              {formatCurrency(Number(agingSummary.totalOverdue || 0))}
            </div>
            <div className="text-xs text-rose-500 mt-0.5">Cat 2 - Cat 6</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-emerald-600 font-medium">Cat 1 (Belum Jatuh Tempo)</div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {formatCurrency(Number(agingSummary.category1NotDue || 0))}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Due date &gt; today</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-amber-600 font-medium">Cat 2-4 (1-90 Hari)</div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {formatCurrency(
                Number(agingSummary.category2_1to30 || 0) +
                  Number(agingSummary.category3_31to60 || 0) +
                  Number(agingSummary.category4_61to90 || 0)
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Normal AP Aging</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-sm bg-rose-50/40">
            <div className="text-xs text-rose-700 font-medium">Cat 6 (&gt; 120 Hari)</div>
            <div className="text-sm font-bold text-rose-700 mt-1">
              {formatCurrency(Number(agingSummary.category6_Gt120 || 0))}
            </div>
            <div className="text-xs text-rose-600 mt-0.5">Prioritas Kritis</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-xs text-slate-500 font-medium">Priority Alerts</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-red-100 text-red-700">
                {agingSummary.criticalCount} Block
              </span>
              <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-700">
                {agingSummary.solarCount} Solar
              </span>
              <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-700">
                {agingSummary.leasingCount} Lease
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Action Controls & Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Invoice, PO, Vendor..."
              value={invFilter.search}
              onChange={(e) => setInvFilter({ ...invFilter, search: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Site Filter */}
          <select
            value={invFilter.site}
            onChange={(e) => setInvFilter({ ...invFilter, site: e.target.value })}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Semua Site</option>
            <option value="BGG">BGG</option>
            <option value="POS">POS</option>
            <option value="PTRO">PTRO</option>
            <option value="HO">HO / JAKARTA</option>
          </select>

          {/* Aging Category Filter */}
          <select
            value={invFilter.agingCategory}
            onChange={(e) => setInvFilter({ ...invFilter, agingCategory: e.target.value })}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Semua Aging</option>
            <option value="1">Cat 1 (Belum Jatuh Tempo)</option>
            <option value="2">Cat 2 (1-30 Hari Overdue)</option>
            <option value="3">Cat 3 (31-60 Hari Overdue)</option>
            <option value="4">Cat 4 (61-90 Hari Overdue)</option>
            <option value="5">Cat 5 (91-120 Hari Overdue)</option>
            <option value="6">Cat 6 (&gt; 120 Hari Overdue)</option>
          </select>

          {/* Priority Tag Filter */}
          <select
            value={invFilter.priorityTag}
            onChange={(e) => setInvFilter({ ...invFilter, priorityTag: e.target.value })}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Semua Prioritas</option>
            <option value="BLOCK_SUPPLY">Block Supply (Kritis)</option>
            <option value="SOLAR">Solar / Fuel</option>
            <option value="LEASING">Leasing</option>
            <option value="REGULAR">Regular AP</option>
          </select>

          {/* Status Filter */}
          <select
            value={invFilter.status}
            onChange={(e) => setInvFilter({ ...invFilter, status: e.target.value })}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Semua Status</option>
            <option value="unpaid">Belum Lunas (Unpaid)</option>
            <option value="partially_paid">Bayar Sebagian (Partial)</option>
            <option value="pending_paid">Terkunci Voucher (Pending)</option>
            <option value="paid">Lunas (Paid)</option>
          </select>

          <button
            onClick={() => fetchInvoices()}
            className="p-1.5 text-slate-600 hover:text-blue-600 border border-slate-300 rounded hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportAccurateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50 transition"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" /> Import Accurate (.xlsx)
          </button>

          <button
            disabled={selectedInvoiceIds.length === 0}
            onClick={() => setShowCreatePlanModal(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white rounded shadow-sm transition ${
              selectedInvoiceIds.length > 0
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Buat Pengajuan RAB ({selectedInvoiceIds.length})
          </button>
        </div>
      </div>

      {/* 3. Invoices Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-2.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={invoices.length > 0 && selectedInvoiceIds.length === invoices.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-2.5">Pemasok &amp; Site</th>
                <th className="p-2.5">No Invoice / PO</th>
                <th className="p-2.5">Faktur Pajak / Deskripsi</th>
                <th className="p-2.5">Jatuh Tempo</th>
                <th className="p-2.5">Aging &amp; Prioritas</th>
                <th className="p-2.5 text-right">Total Tagihan</th>
                <th className="p-2.5 text-right">Sisa Utang</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-center">Rencana Bayar (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Memuat data tagihan...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Tidak ada tagihan yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isSelected = selectedInvoiceIds.includes(inv.id);
                  const overdueDays = getOverdueDays(inv.dueDate);
                  const aging = getAgingCategory(overdueDays);
                  const currentAmt = partialAmounts[inv.id] !== undefined ? partialAmounts[inv.id] : inv.remainingBalance;

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? "bg-blue-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(inv.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Vendor & Site */}
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{inv.vendor?.name || "-"}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="px-1 py-0.2 bg-slate-100 rounded text-slate-700 font-mono text-[10px]">
                            {inv.site || "HO"}
                          </span>
                          <span>TOP: {inv.topDays} Hari</span>
                        </div>
                      </td>

                      {/* No Invoice & PO */}
                      <td className="p-2.5 font-mono text-[11px]">
                        <div className="font-semibold text-blue-700">{inv.invoiceNo}</div>
                        <div className="text-slate-500 text-[10px] mt-0.5">PO: {inv.poNo || "-"}</div>
                        {inv.grNo && <div className="text-slate-400 text-[10px]">GR: {inv.grNo}</div>}
                      </td>

                      {/* Tax Invoice & Remarks */}
                      <td className="p-2.5 max-w-xs">
                        <div className="text-slate-800 line-clamp-1" title={inv.itemDescription}>
                          {inv.itemDescription || "-"}
                        </div>
                        {inv.taxInvoiceNo && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            FP: {inv.taxInvoiceNo}
                          </div>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="text-slate-900 font-medium">{formatDate(inv.dueDate)}</div>
                        <div className="text-[10px] text-slate-400">
                          Inv: {formatDate(inv.invoiceDate)}
                        </div>
                      </td>

                      {/* Aging & Priority */}
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] border ${aging.color}`}
                          >
                            {aging.label} {overdueDays > 0 ? `(${overdueDays}h)` : ""}
                          </span>
                          {getPriorityBadge(inv.priorityTag)}
                        </div>
                      </td>

                      {/* Total Gross */}
                      <td className="p-2.5 text-right font-medium text-slate-800">
                        {formatCurrency(Number(inv.totalAmount || 0))}
                        {Number(inv.dpAmount || 0) > 0 && (
                          <div className="text-[10px] text-emerald-600">
                            DP: {formatCurrency(Number(inv.dpAmount))}
                          </div>
                        )}
                      </td>

                      {/* Remaining Balance */}
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatCurrency(Number(inv.remainingBalance || 0))}
                        {Number(inv.paidAmount || 0) > 0 && (
                          <div className="text-[10px] text-blue-600 font-normal">
                            Paid: {formatCurrency(Number(inv.paidAmount))}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : inv.status === "pending_paid"
                              ? "bg-amber-100 text-amber-700"
                              : inv.status === "partially_paid"
                              ? "bg-cyan-100 text-cyan-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Plan Amount Input (For Partial Payment) */}
                      <td className="p-2.5 text-center">
                        {isSelected ? (
                          <input
                            type="number"
                            value={currentAmt}
                            max={Number(inv.remainingBalance)}
                            min={0}
                            onChange={(e) =>
                              setPartialAmounts({
                                ...partialAmounts,
                                [inv.id]: e.target.value,
                              })
                            }
                            className="w-24 px-1.5 py-1 text-xs text-right border border-blue-400 rounded bg-white font-mono font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="Nominal"
                          />
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan {invoices.length} dari {totalInvoices} tagihan
          </div>
          <div>{selectedInvoiceIds.length} tagihan dipilih untuk pembuatan voucher</div>
        </div>
      </div>
    </div>
  );
}
