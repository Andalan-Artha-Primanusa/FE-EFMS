import React, { useState, useMemo } from "react";
import {
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  Search,
  Square,
  TrendingUp,
  Upload,
} from "lucide-react";
import { formatCurrency } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";
import type { TreasuryInvoice } from "../types";
import { periodLabel } from "../../tunai-po/shared";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

interface VendorGroup {
  key: string;
  vendorId: number;
  vendorName: string;
  sites: string[];
  bankName: string;
  accountNumber: string;
  accountName: string;
  totalUnpaid: number;
  items: TreasuryInvoice[];
  monthAmounts: Record<string, number>;
  poNo?: string;
  pendingBank?: boolean;
}

// Open balance, not the gross invoice total (partial payments and consumed DP are already deducted).
const outstandingOf = (inv: TreasuryInvoice) => Number(inv.remainingBalance ?? inv.totalAmount ?? 0);

// Invoices whose PO was paid via Tunai PO but consumed no DP cannot go into a voucher.
export const DP_NOT_DEDUCTED_TIP = "PO sudah dibayar Tunai PO, invoice belum memotong DP";
export const DpNotDeductedBadge = () => (
  <span className="ml-1 px-1 rounded bg-rose-600 text-white font-bold text-[9px]" title={DP_NOT_DEDUCTED_TIP}>
    DP belum dipotong
  </span>
);

function formatMonthHeader(mKey: string): string {
  if (mKey === "BLANK" || !mKey) return "(blank)";
  const [yearStr, monthStr] = mKey.split("-");
  const monthIdx = parseInt(monthStr, 10) - 1;
  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];
  const mName = shortMonths[monthIdx] || monthStr;
  const yShort = yearStr ? yearStr.slice(2) : "";
  return `${mName}-${yShort}`;
}

export function PivotAgingPlanningView({ c }: Props) {
  const {
    invoices,
    allUnpaidInvoices,
    loading,
    selectedInvoiceIds,
    setSelectedInvoiceIds,
    setShowCreatePlanModal,
    setActiveTab,
    purchaseOrders,
  } = c;

  const poByNo = useMemo(() => new Map(purchaseOrders.map((p) => [p.poNo, p])), [purchaseOrders]);
  // "PO": one row per PO (a PO can carry DP, termin and final invoices); "VENDOR": one row per vendor.
  const [groupBy, setGroupBy] = useState<"VENDOR" | "PO">("VENDOR");

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState<"ALL" | "UNPLANNED" | "PLANNED">("ALL");
  const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});

  // Use full pool of unpaid invoices (up to 5,000) if available
  const activeInvoices = useMemo(() => {
    const list = allUnpaidInvoices && allUnpaidInvoices.length > 0 ? allUnpaidInvoices : invoices;
    return list.filter((inv) => inv.status !== "paid");
  }, [invoices, allUnpaidInvoices]);

  // Distinct available sites dynamically
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    activeInvoices.forEach((i) => {
      const s = (i.site || "HO").trim().toUpperCase();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [activeInvoices]);

  // Dynamically collect all chronological due date month periods present in active invoices
  const dueMonthColumns = useMemo(() => {
    const set = new Set<string>();
    activeInvoices.forEach((inv) => {
      if (inv.dueDate) {
        const d = new Date(inv.dueDate);
        if (!isNaN(d.getTime())) {
          set.add(d.toISOString().slice(0, 7)); // e.g. "2026-03"
          return;
        }
      }
      set.add("BLANK");
    });

    const sortedMonths = Array.from(set)
      .filter((k) => k !== "BLANK")
      .sort();

    if (set.has("BLANK")) {
      sortedMonths.push("BLANK");
    }
    return sortedMonths;
  }, [activeInvoices]);

  // Group strictly by Vendor (1 vendor = 1 row, aggregating across sites and months)
  const vendorGroups = useMemo(() => {
    const map = new Map<string, VendorGroup>();

    activeInvoices.forEach((inv) => {
      // If siteFilter is active, only include invoices matching the site
      const invSite = (inv.site || "HO").trim();
      if (siteFilter !== "ALL" && invSite.toUpperCase() !== siteFilter.trim().toUpperCase()) {
        return;
      }

      const vName = inv.vendor?.name || "VENDOR LAIN";
      const po = (inv.poNo || "").trim() || "TANPA PO";
      const key = groupBy === "PO" ? `${po}|${inv.vendorId}` : String(inv.vendorId || vName);

      let grp = map.get(key);
      if (!grp) {
        grp = {
          key,
          vendorId: inv.vendorId,
          vendorName: groupBy === "PO" ? `${po} — ${vName}` : vName,
          poNo: groupBy === "PO" ? po : undefined,
          pendingBank: !!inv.vendor?.pendingAccountNumber,
          sites: [],
          bankName: inv.vendor?.bankName || "",
          accountNumber: inv.vendor?.accountNumber || "",
          accountName: inv.vendor?.accountName || "",
          totalUnpaid: 0,
          items: [],
          monthAmounts: {},
        };
        map.set(key, grp);
      }

      if (!grp.sites.includes(invSite)) {
        grp.sites.push(invSite);
      }

      const amt = outstandingOf(inv);
      grp.totalUnpaid += amt;
      grp.items.push(inv);

      // Aggregate amount per due month
      let mKey = "BLANK";
      if (inv.dueDate) {
        const d = new Date(inv.dueDate);
        if (!isNaN(d.getTime())) {
          mKey = d.toISOString().slice(0, 7);
        }
      }
      grp.monthAmounts[mKey] = (grp.monthAmounts[mKey] || 0) + amt;
    });

    return Array.from(map.values()).sort((a, b) => b.totalUnpaid - a.totalUnpaid);
  }, [activeInvoices, siteFilter, groupBy]);

  // Filter vendor groups
  const filteredGroups = useMemo(() => {
    return vendorGroups.filter((grp) => {
      if (planFilter === "UNPLANNED") {
        const hasUnplanned = grp.items.some((it) => !it.planMonth || !it.planWeek);
        if (!hasUnplanned) return false;
      } else if (planFilter === "PLANNED") {
        const hasPlanned = grp.items.some((it) => it.planMonth && it.planWeek);
        if (!hasPlanned) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const matchVendor = grp.vendorName.toLowerCase().includes(q);
        const matchSite = grp.sites.some((s) => s.toLowerCase().includes(q));
        const matchPO = grp.items.some(
          (it) => it.poNo?.toLowerCase().includes(q) || it.invoiceNo.toLowerCase().includes(q)
        );
        if (!matchVendor && !matchSite && !matchPO) return false;
      }

      return true;
    });
  }, [vendorGroups, planFilter, search]);

  // Grand total per month column and overall total
  const grandTotals = useMemo(() => {
    const monthTotals: Record<string, number> = {};
    let overall = 0;

    filteredGroups.forEach((grp) => {
      dueMonthColumns.forEach((col) => {
        const amt = grp.monthAmounts[col] || 0;
        monthTotals[col] = (monthTotals[col] || 0) + amt;
      });
      overall += grp.totalUnpaid;
    });

    return { monthTotals, overall };
  }, [filteredGroups, dueMonthColumns]);

  const toggleExpand = (key: string) => {
    setExpandedVendors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filteredGroups.forEach((g) => (all[g.key] = true));
    setExpandedVendors(all);
  };

  const collapseAll = () => {
    setExpandedVendors({});
  };

  // Toggle selection on Vendor Level
  const toggleVendorSelection = (grp: VendorGroup) => {
    const itemIds = grp.items.filter((i) => !i.dpNotDeducted).map((i) => i.id);
    const allSelected = itemIds.every((id) => selectedInvoiceIds.includes(id));

    if (allSelected) {
      setSelectedInvoiceIds((prev) => prev.filter((id) => !itemIds.includes(id)));
    } else {
      setSelectedInvoiceIds((prev) => Array.from(new Set([...prev, ...itemIds])));
    }
  };

  // Toggle selection on PO Level
  const toggleInvoiceSelection = (inv: TreasuryInvoice) => {
    if (inv.dpNotDeducted) return;
    const invId = inv.id;
    setSelectedInvoiceIds((prev) =>
      prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId]
    );
  };

  // Total selected amount
  const totalSelectedAmount = useMemo(() => {
    return activeInvoices
      .filter((inv) => selectedInvoiceIds.includes(inv.id))
      .reduce((sum, inv) => sum + outstandingOf(inv), 0);
  }, [activeInvoices, selectedInvoiceIds]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 font-sans text-xs overflow-hidden">
      {/* Top Banner & Instructions */}
      <div className="bg-[#1A1612] text-white p-2.5 px-3 rounded-[4px] border border-amber-900/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs shrink-0">
        <div>
          <h2 className="text-xs font-bold flex items-center gap-2 text-white uppercase tracking-wider">
            <Layers className="w-4 h-4 text-[#A57C50]" /> 1. Pivot Hutang &amp; Matrix Aging
          </h2>
          <p className="text-[10px] text-stone-400 mt-0.5">
            Matriks jatuh tempo hutang multi-bulan. Pilih vendor/PO untuk membuat pengajuan RAB atau buka tab <strong>Payment Plan</strong> untuk alokasi mingguan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("planning")}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 text-amber-300 rounded-[3px] font-bold text-[10px] transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#A57C50]" /> Buka Payment Plan (Week 1–4) &rarr;
          </button>
          <button
            onClick={expandAll}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-[3px] font-semibold text-[10px] transition cursor-pointer"
          >
            Buka Semua
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-[3px] font-semibold text-[10px] transition cursor-pointer"
          >
            Tutup Semua
          </button>
        </div>
      </div>



      {/* Filter Toolbar */}
      <div className="bg-white p-2.5 rounded-[4px] border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Site Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-600 text-[11px]">Site:</span>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="p-1.5 border border-stone-300 rounded-[3px] font-semibold text-stone-800 bg-white text-[11px]"
            >
              <option value="ALL">Semua Site</option>
              {availableSites.map((s) => (
                <option key={s} value={s}>
                  {s === "HO" ? "HO (Jakarta)" : s}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-600 text-[11px]">Status Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="p-1.5 border border-stone-300 rounded-[3px] font-semibold text-stone-800 bg-white"
            >
              <option value="ALL">Semua Tagihan</option>
              <option value="UNPLANNED">Belum Di-plan (Draft)</option>
              <option value="PLANNED">Sudah Di-plan</option>
            </select>
          </div>

          {/* Grouping */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-600 text-[11px]">Kelompokkan:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "VENDOR" | "PO")}
              className="p-1.5 border border-stone-300 rounded-[3px] font-semibold text-stone-800 bg-white text-[11px]"
            >
              <option value="VENDOR">Per Vendor</option>
              <option value="PO">Per No. PO</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari vendor atau nomor PO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-stone-300 rounded-[3px] w-56 text-[11px] focus:outline-none focus:border-[#A57C50]"
            />
          </div>
        </div>

        {/* Action Button for Selected POs */}
        <div className="flex items-center gap-3">
          {selectedInvoiceIds.length > 0 && (
            <div className="inline-flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-[3px] border border-stone-300">
              <span className="font-bold text-stone-900">
                {selectedInvoiceIds.length} PO Terpilih
              </span>
              <span className="font-mono font-bold text-blue-700">
                ({formatCurrency(totalSelectedAmount)})
              </span>
            </div>
          )}

          <button
            disabled={selectedInvoiceIds.length === 0}
            onClick={() => setShowCreatePlanModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold shadow-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
          >
            <Plus className="w-3.5 h-3.5" /> Buat Pengajuan RAB / Voucher
          </button>
        </div>
      </div>

      {/* Pivot Table Matrix */}
      <div className="flex-1 min-h-0 bg-white rounded-[4px] border border-stone-200 shadow-xs flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 z-20 shadow-xs">
              <tr className="bg-[#1A1612] text-white font-bold uppercase tracking-wider border-b border-amber-900/30 text-[10px]">
                <th className="p-2.5 w-8 text-center">#</th>
                <th className="p-2.5 w-8 text-center">PILIH</th>
                <th className="p-2.5 min-w-[200px]">VENDOR &amp; REKENING</th>
                <th className="p-2.5 w-16 text-center">SITE</th>
                {dueMonthColumns.map((col) => (
                  <th
                    key={col}
                    className="p-2 text-right whitespace-nowrap min-w-[95px] text-[#A57C50]"
                  >
                    {formatMonthHeader(col)}
                  </th>
                ))}
                <th className="p-2.5 w-28 text-center">STATUS PLAN</th>
                <th className="p-2.5 w-32 text-right pr-4">TOTAL OUTSTANDING</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + dueMonthColumns.length}
                    className="p-8 text-center text-stone-400 font-medium"
                  >
                    Tidak ada tagihan yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((grp) => {
                  const isExpanded = !!expandedVendors[grp.key];
                  const itemIds = grp.items.filter((i) => !i.dpNotDeducted).map((i) => i.id);
                  const selectedCount = itemIds.filter((id) => selectedInvoiceIds.includes(id)).length;
                  const isAllSelected = selectedCount === itemIds.length && itemIds.length > 0;
                  const isPartial = selectedCount > 0 && selectedCount < itemIds.length;

                  // Check if items have plan
                  const plannedCount = grp.items.filter((it) => it.planMonth && it.planWeek).length;

                  return (
                    <React.Fragment key={grp.key}>
                      {/* Vendor Header Row */}
                      <tr className="hover:bg-stone-50 transition bg-stone-50/50 font-semibold">
                        <td
                          className="p-2.5 text-center cursor-pointer text-stone-500 hover:text-stone-900"
                          onClick={() => toggleExpand(grp.key)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 mx-auto text-[#A57C50]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mx-auto text-stone-400" />
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleVendorSelection(grp)}
                            className="cursor-pointer text-stone-700 hover:text-[#A57C50]"
                          >
                            {isAllSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#A57C50]" />
                            ) : isPartial ? (
                              <div className="w-4 h-4 border-2 border-[#A57C50] bg-[#A57C50]/20 rounded-[2px] flex items-center justify-center">
                                <div className="w-2 h-0.5 bg-[#A57C50]" />
                              </div>
                            ) : (
                              <Square className="w-4 h-4 text-stone-400" />
                            )}
                          </button>
                        </td>
                        <td className="p-2.5 cursor-pointer" onClick={() => toggleExpand(grp.key)}>
                          <div className="font-bold text-stone-900 uppercase">
                            {grp.vendorName}
                          </div>
                          <div className="text-[10px] text-stone-500 font-mono">
                            {grp.bankName || "BANK BELUM ADA"} • {grp.accountNumber || "NO REK KOSONG"} ({grp.accountName || "-"})
                            {grp.pendingBank && (
                              <span className="ml-1 px-1 rounded bg-rose-100 text-rose-700 font-sans font-bold" title="Perubahan rekening menunggu verifikasi; export Kopra diblokir">
                                Rekening pending
                              </span>
                            )}
                          </div>
                          {grp.poNo && (() => {
                            // Billed = DP invoices + finals minus DP they consume (Accurate totals are gross).
                            const po = poByNo.get(grp.poNo);
                            if (!po) return null;
                            const billed = grp.items.reduce(
                              (s, i) => s + Number(i.totalAmount || 0) - (i.isDownPayment ? 0 : Number(i.dpAmount || 0)),
                              0
                            );
                            const over = billed - Number(po.totalAmount) > 1;
                            return (
                              <div className={`text-[10px] font-sans ${over ? "text-rose-700 font-bold" : "text-stone-500"}`}>
                                Nilai PO {formatCurrency(Number(po.totalAmount))} • Outstanding ditagih {formatCurrency(billed)} • {po.status}
                                {over && " • OVERBILLING"}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {grp.sites.map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded-[3px] bg-stone-200 text-stone-800 font-bold text-[10px]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Monthly Aging Values for this Vendor */}
                        {dueMonthColumns.map((col) => {
                          const amt = grp.monthAmounts[col];
                          return (
                            <td
                              key={col}
                              className="p-2 text-right font-mono text-[11px] text-stone-800 whitespace-nowrap"
                            >
                              {amt ? (
                                formatCurrency(amt)
                              ) : (
                                <span className="text-stone-300">-</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="p-2.5 text-center">
                          {plannedCount === grp.items.length ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[10px]">
                              <Check className="w-3 h-3" /> {plannedCount}/{grp.items.length} PO Di-plan
                            </span>
                          ) : plannedCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px]">
                              {plannedCount}/{grp.items.length} PO Di-plan
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[10px] italic">
                              Belum Di-plan ({grp.items.length} PO)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-stone-950 text-xs pr-4 whitespace-nowrap">
                          {formatCurrency(grp.totalUnpaid)}
                        </td>
                      </tr>

                      {/* Expanded PO / Invoice Rows — flat, column-aligned with parent */}
                      {isExpanded && (
                        <>
                          {/* Sub-header row */}
                          <tr className="bg-stone-100/80 border-b border-stone-200">
                            <td colSpan={2} className="p-1.5 pl-10 text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                              #
                            </td>
                            <td className="p-1.5 text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                              Rincian {grp.items.length} PO — {grp.vendorName}
                              <span className="ml-2 font-mono text-blue-900">
                                Total: {formatCurrency(grp.totalUnpaid)}
                              </span>
                            </td>
                            <td className="p-1.5 text-center text-[9px] font-bold text-stone-500 uppercase">SITE</td>
                            {dueMonthColumns.map((col) => (
                              <td key={col} className="p-1.5 text-right text-[9px] font-bold text-stone-400 uppercase whitespace-nowrap">
                                {formatMonthHeader(col)}
                              </td>
                            ))}
                            <td className="p-1.5 text-center text-[9px] font-bold text-stone-500 uppercase">PLAN</td>
                            <td className="p-1.5 text-right pr-4 text-[9px] font-bold text-stone-500 uppercase">NOMINAL</td>
                          </tr>
                          {grp.items.map((inv, idx) => {
                            const isInvSelected = selectedInvoiceIds.includes(inv.id);
                            const amt = outstandingOf(inv);

                            // Determine which month column this invoice belongs to
                            let invMonthKey = "BLANK";
                            if (inv.dueDate) {
                              const d = new Date(inv.dueDate);
                              if (!isNaN(d.getTime())) {
                                invMonthKey = d.toISOString().slice(0, 7);
                              }
                            }

                            return (
                              <tr
                                key={inv.id}
                                className={`border-b border-stone-100 ${
                                  isInvSelected ? "bg-amber-50/50" : "bg-white"
                                } hover:bg-stone-50/80 transition cursor-pointer text-[10px]`}
                                onClick={() => toggleInvoiceSelection(inv)}
                              >
                                {/* # — indent to align under vendor */}
                                <td className="p-1.5 text-center text-stone-400 pl-10 w-8">
                                  {idx + 1}
                                </td>
                                {/* Checkbox */}
                                <td
                                  className="p-1.5 text-center w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isInvSelected}
                                    disabled={inv.dpNotDeducted}
                                    title={inv.dpNotDeducted ? DP_NOT_DEDUCTED_TIP : undefined}
                                    onChange={() => toggleInvoiceSelection(inv)}
                                    className="w-3.5 h-3.5 accent-[#A57C50] rounded-[2px] cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                                {/* PO + Invoice + Description (merged into VENDOR column) */}
                                <td className="p-1.5">
                                  <span className="font-bold text-blue-900 font-mono">{inv.poNo || "-"}</span>
                                  <span className="mx-1 text-stone-300">|</span>
                                  <span className="font-mono text-stone-500">{inv.invoiceNo}</span>
                                  {inv.isDownPayment && (
                                    <span className="ml-1 px-1 rounded bg-sky-100 text-sky-800 font-bold text-[9px]">DP</span>
                                  )}
                                  {inv.possibleDuplicate && (
                                    <span className="ml-1 px-1 rounded bg-rose-100 text-rose-700 font-bold text-[9px]" title="Vendor + PO + nominal sama dengan invoice lain">
                                      Duplikat?
                                    </span>
                                  )}
                                  {inv.accurateDeleted && (
                                    <span className="ml-1 px-1 rounded bg-stone-800 text-white font-bold text-[9px]">Dihapus di Accurate</span>
                                  )}
                                  {inv.dpNotDeducted && <DpNotDeductedBadge />}
                                  <span className="ml-1.5 text-stone-600 font-medium truncate">
                                    {inv.itemDescription
                                      ? inv.itemDescription.length > 60
                                        ? inv.itemDescription.slice(0, 60) + "…"
                                        : inv.itemDescription
                                      : ""}
                                  </span>
                                </td>
                                {/* SITE — aligned with parent SITE column */}
                                <td className="p-1.5 text-center">
                                  <span className="px-1.5 py-0.5 rounded-[2px] bg-stone-100 border border-stone-200 text-stone-700 font-bold text-[9px]">
                                    {inv.site || "HO"}
                                  </span>
                                </td>
                                {/* Month columns — amount goes under matching month */}
                                {dueMonthColumns.map((col) => (
                                  <td
                                    key={col}
                                    className="p-1.5 text-right font-mono text-[10px] whitespace-nowrap"
                                  >
                                    {col === invMonthKey ? (
                                      <span className="text-stone-800 font-semibold">{formatCurrency(amt)}</span>
                                    ) : (
                                      <span className="text-stone-200">-</span>
                                    )}
                                  </td>
                                ))}
                                {/* PLAN WEEK */}
                                <td className="p-1.5 text-center">
                                  {inv.planMonth && inv.planWeek ? (
                                    <span className="px-1.5 py-0.5 rounded-[2px] bg-blue-50 border border-blue-200 text-blue-900 font-bold text-[9px]">
                                      {periodLabel(inv)}
                                    </span>
                                  ) : (
                                    <span className="text-stone-300 text-[10px]">—</span>
                                  )}
                                </td>
                                {/* NOMINAL — aligned with TOTAL OUTSTANDING */}
                                <td className="p-1.5 text-right font-mono font-bold text-stone-900 pr-4 whitespace-nowrap">
                                  {formatCurrency(amt)}
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Grand Total Footer (Placed directly beneath each month column) */}
            <tfoot className="bg-[#1A1612] text-white font-bold border-t-2 border-amber-900/40 sticky bottom-0 z-20 text-[11px] shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
              <tr className="bg-[#1A1612]">
                <td
                  colSpan={4}
                  className="p-2.5 text-right font-black uppercase tracking-wider text-stone-300 bg-[#1A1612]"
                >
                  Grand Total:
                </td>
                {dueMonthColumns.map((col) => (
                  <td
                    key={col}
                    className="p-2 text-right font-mono font-bold text-amber-200 text-[11px] whitespace-nowrap bg-[#1A1612]"
                  >
                    {grandTotals.monthTotals[col]
                      ? formatCurrency(grandTotals.monthTotals[col])
                      : "-"}
                  </td>
                ))}
                <td className="p-2 text-center text-stone-400 font-normal text-[10px] bg-[#1A1612]">
                  {filteredGroups.length} Vendor
                </td>
                <td className="p-2.5 text-right font-mono font-black text-amber-400 text-xs pr-4 whitespace-nowrap bg-[#1A1612]">
                  {formatCurrency(grandTotals.overall)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
