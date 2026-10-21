import React, { useState, useMemo } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";
import type { TreasuryInvoice } from "../types";
import { SetPlanWeekModal } from "../modals/SetPlanWeekModal";
import { DpNotDeductedBadge, DP_NOT_DEDUCTED_TIP } from "./PivotAgingPlanningView";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

// Dealer keywords detector for heavy machinery / equipment suppliers
export function isDealerVendor(vendorName: string, category?: string): boolean {
  if (category && category.toUpperCase().includes("DEALER")) return true;
  const upper = vendorName.toUpperCase();
  const dealerKeywords = [
    "TRAKINDO",
    "HEXINDO",
    "KOBEXINDO",
    "UNITED TRACTORS",
    "KOMATSU",
    "PRIMA KARYA",
    "VOLVO",
    "HITACHI",
    "SCANIA",
    "MERCEDES",
    "CUMMINS",
    "TEREX",
    "LIEBHERR",
    "SANY",
    "XCMG",
    "CAT ",
    "CATERPILLAR",
  ];
  return dealerKeywords.some((kw) => upper.includes(kw));
}

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function getMonthNameIndo(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return INDONESIAN_MONTHS[d.getMonth()] || "-";
}

function isSamePlanMonth(invMonth?: string, targetMonth?: string): boolean {
  if (!invMonth || !targetMonth) return false;
  const a = invMonth.trim().toLowerCase();
  const b = targetMonth.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

export function WeeklyPlanningExcelView({ c }: Props) {
  const {
    invoices,
    allUnpaidInvoices,
    selectedInvoiceIds,
    setSelectedInvoiceIds,
    setShowCreatePlanModal,
    handleAssignPlan,
  } = c;

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "DEALER" | "NON_DEALER">("ALL");
  const [targetPlanMonth, setTargetPlanMonth] = useState<string>("September 2026");
  const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});
  const [showBatchWeekModal, setShowBatchWeekModal] = useState(false);
  const [assigningWeekId, setAssigningWeekId] = useState<number | null>(null);

  // Pool of planned invoices for the target month (Week 1-4 only)
  const activeInvoices = useMemo(() => {
    const list = allUnpaidInvoices && allUnpaidInvoices.length > 0 ? allUnpaidInvoices : invoices;
    return list.filter((inv) => {
      if (inv.status === "paid") return false;
      if (!inv.planWeek || inv.planWeek < 1 || inv.planWeek > 4) return false;
      return isSamePlanMonth(inv.planMonth, targetPlanMonth);
    });
  }, [invoices, allUnpaidInvoices, targetPlanMonth]);

  // Distinct sites
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    activeInvoices.forEach((i) => {
      const s = (i.site || "HO").trim().toUpperCase();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [activeInvoices]);

  // Group invoices by Vendor
  const vendorRows = useMemo(() => {
    const map = new Map<string, {
      key: string;
      vendorId: number;
      vendorName: string;
      categoryType: "DEALER" | "NON DEALER";
      sites: string[];
      dueMonths: Set<string>;
      totalMonthAmount: number;
      weekAmounts: { 1: number; 2: number; 3: number; 4: number; unassigned: number };
      items: TreasuryInvoice[];
    }>();

    activeInvoices.forEach((inv) => {
      const invSite = (inv.site || "HO").trim();
      if (siteFilter !== "ALL" && invSite.toUpperCase() !== siteFilter.trim().toUpperCase()) {
        return;
      }

      const vName = inv.vendor?.name || "VENDOR LAIN";
      const key = String(inv.vendorId || vName);
      const isDealer = isDealerVendor(vName, (inv.vendor as any)?.category || inv.category);

      let grp = map.get(key);
      if (!grp) {
        grp = {
          key,
          vendorId: inv.vendorId,
          vendorName: vName,
          categoryType: isDealer ? "DEALER" : "NON DEALER",
          sites: [],
          dueMonths: new Set<string>(),
          totalMonthAmount: 0,
          weekAmounts: { 1: 0, 2: 0, 3: 0, 4: 0, unassigned: 0 },
          items: [],
        };
        map.set(key, grp);
      }

      if (!grp.sites.includes(invSite)) {
        grp.sites.push(invSite);
      }

      if (inv.dueDate) {
        grp.dueMonths.add(getMonthNameIndo(inv.dueDate));
      }

      const amt = Number(inv.totalAmount || inv.remainingBalance || 0);
      grp.totalMonthAmount += amt;
      grp.items.push(inv);

      // Distribute into Week 1-4 or unassigned
      const w = inv.planWeek;
      if (w === 1 || w === 2 || w === 3 || w === 4) {
        grp.weekAmounts[w] += amt;
      } else {
        grp.weekAmounts.unassigned += amt;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalMonthAmount - a.totalMonthAmount);
  }, [activeInvoices, siteFilter]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return vendorRows.filter((r) => {
      if (categoryFilter === "DEALER" && r.categoryType !== "DEALER") return false;
      if (categoryFilter === "NON_DEALER" && r.categoryType !== "NON DEALER") return false;

      if (search) {
        const q = search.toLowerCase();
        const matchVendor = r.vendorName.toLowerCase().includes(q);
        const matchSite = r.sites.some((s) => s.toLowerCase().includes(q));
        const matchPO = r.items.some(
          (it) => it.poNo?.toLowerCase().includes(q) || it.invoiceNo.toLowerCase().includes(q)
        );
        if (!matchVendor && !matchSite && !matchPO) return false;
      }

      return true;
    });
  }, [vendorRows, categoryFilter, search]);

  // Grand Totals across all filtered rows
  const grandTotals = useMemo(() => {
    let totalValue = 0;
    const weeks = { 1: 0, 2: 0, 3: 0, 4: 0, unassigned: 0 };

    filteredRows.forEach((r) => {
      totalValue += r.totalMonthAmount;
      weeks[1] += r.weekAmounts[1];
      weeks[2] += r.weekAmounts[2];
      weeks[3] += r.weekAmounts[3];
      weeks[4] += r.weekAmounts[4];
      weeks.unassigned += r.weekAmounts.unassigned;
    });

    return { totalValue, weeks };
  }, [filteredRows]);

  // Category Breakdown Matrix (Dealer vs Non Dealer)
  const categoryMatrix = useMemo(() => {
    const dealer = { totalValue: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    const nonDealer = { totalValue: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

    filteredRows.forEach((r) => {
      const target = r.categoryType === "DEALER" ? dealer : nonDealer;
      target.totalValue += r.totalMonthAmount;
      target[1] += r.weekAmounts[1];
      target[2] += r.weekAmounts[2];
      target[3] += r.weekAmounts[3];
      target[4] += r.weekAmounts[4];
    });

    const total = {
      totalValue: dealer.totalValue + nonDealer.totalValue,
      1: dealer[1] + nonDealer[1],
      2: dealer[2] + nonDealer[2],
      3: dealer[3] + nonDealer[3],
      4: dealer[4] + nonDealer[4],
    };

    return { dealer, nonDealer, total };
  }, [filteredRows]);

  const toggleExpand = (key: string) => {
    setExpandedVendors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filteredRows.forEach((g) => (all[g.key] = true));
    setExpandedVendors(all);
  };

  const collapseAll = () => {
    setExpandedVendors({});
  };

  const toggleVendorSelection = (r: typeof vendorRows[0]) => {
    const itemIds = r.items.filter((i) => !i.dpNotDeducted).map((i) => i.id);
    const allSelected = itemIds.every((id) => selectedInvoiceIds.includes(id));

    if (allSelected) {
      setSelectedInvoiceIds((prev) => prev.filter((id) => !itemIds.includes(id)));
    } else {
      setSelectedInvoiceIds((prev) => Array.from(new Set([...prev, ...itemIds])));
    }
  };

  const toggleInvoiceSelection = (inv: TreasuryInvoice) => {
    if (inv.dpNotDeducted) return;
    const invId = inv.id;
    setSelectedInvoiceIds((prev) =>
      prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId]
    );
  };

  const totalSelectedAmount = useMemo(() => {
    return activeInvoices
      .filter((inv) => selectedInvoiceIds.includes(inv.id))
      .reduce((sum, inv) => sum + Number(inv.totalAmount || inv.remainingBalance || 0), 0);
  }, [activeInvoices, selectedInvoiceIds]);

  // Quick 1-click week assignment for an invoice or group of invoices
  const handleQuickAssignWeek = async (invoiceIds: number[], week: number) => {
    try {
      setAssigningWeekId(invoiceIds[0] || 0);
      await handleAssignPlan(invoiceIds, targetPlanMonth, week);
    } finally {
      setAssigningWeekId(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 font-sans text-xs overflow-hidden">
      {/* Top Controls & Filter Toolbar */}
      <div className="bg-white p-2.5 rounded-[4px] border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Month Selector */}
          <div className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-[3px] border border-stone-200">
            <Calendar className="w-3.5 h-3.5 text-[#A57C50]" />
            <span className="text-[10px] font-bold text-stone-600 uppercase">Target Rencana:</span>
            <select
              value={targetPlanMonth}
              onChange={(e) => setTargetPlanMonth(e.target.value)}
              className="font-bold text-stone-900 bg-transparent focus:outline-none cursor-pointer text-xs"
            >
              {[
                "September 2026",
                "Oktober 2026",
                "November 2026",
                "Desember 2026",
                "Januari 2027",
              ].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Dealer Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="p-1.5 border border-stone-300 rounded-[3px] font-semibold text-stone-800 bg-white focus:outline-none focus:border-[#A57C50] text-xs"
          >
            <option value="ALL">Semua Kategori (Dealer &amp; Non Dealer)</option>
            <option value="DEALER">Khusus DEALER</option>
            <option value="NON_DEALER">Khusus NON DEALER</option>
          </select>

          {/* Site Filter */}
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="p-1.5 border border-stone-300 rounded-[3px] font-semibold text-stone-800 bg-white focus:outline-none focus:border-[#A57C50] text-xs"
          >
            <option value="ALL">Semua Site ({availableSites.length})</option>
            {availableSites.map((s) => (
              <option key={s} value={s}>
                Site {s}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Cari vendor atau no PO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-stone-300 rounded-[3px] w-52 text-[11px] focus:outline-none focus:border-[#A57C50]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {selectedInvoiceIds.length > 0 && (
            <div className="inline-flex items-center gap-2 bg-stone-100 px-2.5 py-1 rounded-[3px] border border-stone-300">
              <span className="font-bold text-stone-900">{selectedInvoiceIds.length} PO Terpilih</span>
              <span className="font-mono font-bold text-blue-900">
                ({formatCurrency(totalSelectedAmount)})
              </span>
            </div>
          )}

          {/* Batch Week Allocator */}
          <button
            disabled={selectedInvoiceIds.length === 0}
            onClick={() => setShowBatchWeekModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[3px] bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Calendar className="w-3.5 h-3.5 text-[#A57C50]" /> Set Week (1–4)
          </button>

          <button
            onClick={() => c.setActiveTab("vendors")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs transition cursor-pointer"
          >
            Master Vendor
          </button>

          {/* Create Plan / Voucher */}
          <button
            disabled={selectedInvoiceIds.length === 0}
            onClick={() => setShowCreatePlanModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold shadow-2xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {selectedInvoiceIds.length > 0 ? `Create Voucher (${selectedInvoiceIds.length})` : "Create Voucher"}
          </button>

          <div className="flex items-center gap-1 border-l border-stone-200 pl-2">
            <button
              onClick={expandAll}
              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-[3px] font-semibold text-[10px] cursor-pointer"
            >
              Buka Semua
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-[3px] font-semibold text-[10px] cursor-pointer"
            >
              Tutup Semua
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Matching the Excel Format */}
      <div className="flex-1 min-h-0 bg-white rounded-[4px] border border-stone-200 shadow-2xs flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 z-20 shadow-2xs">
              {/* Header Row 1: Target Month Spanner */}
              <tr className="bg-[#1A1612] text-white font-bold uppercase tracking-wider text-[10px] border-b border-amber-900/30">
                <th colSpan={6} className="p-2 border-r border-amber-900/30 text-stone-300">
                  DAFTAR TAGIHAN &amp; JATUH TEMPO VENDOR
                </th>
                <th colSpan={4} className="p-2 text-center text-amber-400 bg-[#251F19] font-black border-r border-amber-900/30">
                  DISTRIBUSI MINGGUAN ({targetPlanMonth.toUpperCase()})
                </th>
                <th className="p-2 text-center text-stone-300">AKSI</th>
              </tr>

              {/* Header Row 2: Standard Columns */}
              <tr className="bg-[#1A1612] text-white font-bold uppercase tracking-wider text-[10px] border-b border-amber-900/30">
                <th className="p-2 w-8 text-center">No</th>
                <th className="p-2 w-8 text-center">Pilih</th>
                <th className="p-2 min-w-[220px]">Vendors</th>
                <th className="p-2 w-28 text-center">Dealer / Non Dealer</th>
                <th className="p-2 w-32 text-right">
                  {targetPlanMonth.split(" ")[0]}
                </th>
                <th className="p-2 w-24 text-center">Jatuh tempo</th>
                <th className="p-2 w-28 text-right bg-[#251F19] text-amber-300 border-l border-amber-900/30">
                  Week 1
                </th>
                <th className="p-2 w-28 text-right bg-[#251F19] text-amber-300">
                  Week 2
                </th>
                <th className="p-2 w-28 text-right bg-[#251F19] text-amber-300">
                  Week 3
                </th>
                <th className="p-2 w-28 text-right bg-[#251F19] text-amber-300 border-r border-amber-900/30">
                  Week 4
                </th>
                <th className="p-2 w-28 text-center">Set Week</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-stone-500 bg-white">
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="font-bold text-stone-800 text-sm">
                        Belum Ada Rencana Pembayaran untuk Periode {targetPlanMonth}
                      </p>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Silakan buka tab <strong className="text-stone-700">1. Pivot Hutang</strong>, pilih tagihan yang ingin dijadwalkan, lalu tentukan minggu pembayarannya (Week 1–4) atau klik tombol <strong className="text-stone-700">+ Buat Pengajuan RAB</strong>.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  const isExpanded = !!expandedVendors[r.key];
                  const itemIds = r.items.filter((i) => !i.dpNotDeducted).map((i) => i.id);
                  const isVendorFullySelected =
                    itemIds.length > 0 && itemIds.every((id) => selectedInvoiceIds.includes(id));
                  const isVendorPartiallySelected =
                    itemIds.some((id) => selectedInvoiceIds.includes(id)) && !isVendorFullySelected;

                  const dueMonthStr = Array.from(r.dueMonths).join(", ") || "-";

                  return (
                    <React.Fragment key={r.key}>
                      {/* Parent Vendor Row */}
                      <tr
                        className={`hover:bg-stone-50 transition cursor-pointer font-medium ${
                          isVendorFullySelected
                            ? "bg-amber-50/60"
                            : isVendorPartiallySelected
                            ? "bg-amber-50/30"
                            : idx % 2 === 0
                            ? "bg-white"
                            : "bg-stone-50/40"
                        }`}
                        onClick={() => toggleExpand(r.key)}
                      >
                        {/* No */}
                        <td className="p-2 text-center text-stone-400 font-mono text-[10px]">
                          {idx + 1}
                        </td>

                        {/* Checkbox */}
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isVendorFullySelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isVendorPartiallySelected;
                            }}
                            onChange={() => toggleVendorSelection(r)}
                            className="w-3.5 h-3.5 accent-[#A57C50] rounded-[2px] cursor-pointer"
                          />
                        </td>

                        {/* Vendors */}
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            )}
                            <span className="font-bold text-stone-900 uppercase">
                              {r.vendorName}
                            </span>
                            <span className="text-[10px] text-stone-400 font-normal">
                              ({r.items.length} PO)
                            </span>
                          </div>
                          {/* Site badges */}
                          <div className="flex items-center gap-1 mt-0.5 pl-5">
                            {r.sites.map((s) => (
                              <span
                                key={s}
                                className="px-1 py-0.2 rounded-[2px] bg-stone-100 border border-stone-200 text-stone-600 font-bold text-[8.5px]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Dealer / Non Dealer Badge */}
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-[2px] font-extrabold text-[9px] uppercase border ${
                              r.categoryType === "DEALER"
                                ? "bg-amber-100 border-amber-300 text-amber-900"
                                : "bg-stone-100 border-stone-200 text-stone-700"
                            }`}
                          >
                            {r.categoryType}
                          </span>
                        </td>

                        {/* Target Month Total */}
                        <td className="p-2 text-right font-mono font-bold text-stone-950">
                          {formatCurrency(r.totalMonthAmount)}
                        </td>

                        {/* Jatuh tempo */}
                        <td className="p-2 text-center text-stone-700 font-medium text-[10px]">
                          {dueMonthStr}
                        </td>

                        {/* Week 1 */}
                        <td className="p-2 text-right font-mono font-semibold bg-stone-50/50 border-l border-stone-200">
                          {r.weekAmounts[1] > 0 ? (
                            <span className="text-stone-900">{formatCurrency(r.weekAmounts[1])}</span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>

                        {/* Week 2 */}
                        <td className="p-2 text-right font-mono font-semibold bg-stone-50/50">
                          {r.weekAmounts[2] > 0 ? (
                            <span className="text-stone-900">{formatCurrency(r.weekAmounts[2])}</span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>

                        {/* Week 3 */}
                        <td className="p-2 text-right font-mono font-semibold bg-stone-50/50">
                          {r.weekAmounts[3] > 0 ? (
                            <span className="text-stone-900">{formatCurrency(r.weekAmounts[3])}</span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>

                        {/* Week 4 */}
                        <td className="p-2 text-right font-mono font-semibold bg-stone-50/50 border-r border-stone-200">
                          {r.weekAmounts[4] > 0 ? (
                            <span className="text-stone-900">{formatCurrency(r.weekAmounts[4])}</span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>

                        {/* Set Week Quick Actions */}
                        <td className="p-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {[1, 2, 3, 4].map((w) => (
                              <button
                                key={w}
                                onClick={() => handleQuickAssignWeek(itemIds, w)}
                                className="px-1.5 py-0.5 rounded-[2px] bg-stone-100 hover:bg-[#A57C50] hover:text-white border border-stone-200 font-bold text-[9px] text-stone-700 transition cursor-pointer"
                                title={`Alokasikan seluruh PO vendor ini ke Week ${w}`}
                              >
                                W{w}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-Rows (Individual POs) */}
                      {isExpanded &&
                        r.items.map((inv, invIdx) => {
                          const isInvSelected = selectedInvoiceIds.includes(inv.id);
                          const amt = Number(inv.totalAmount || inv.remainingBalance || 0);
                          const invMonth = getMonthNameIndo(inv.dueDate);

                          return (
                            <tr
                              key={inv.id}
                              className={`border-b border-stone-100 ${
                                isInvSelected ? "bg-amber-50/50" : "bg-stone-50/20"
                              } hover:bg-stone-100/70 transition cursor-pointer text-[10px]`}
                              onClick={() => toggleInvoiceSelection(inv)}
                            >
                              <td className="p-1.5 text-center text-stone-400 font-mono text-[9px] pl-6">
                                {idx + 1}.{invIdx + 1}
                              </td>
                              <td className="p-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isInvSelected}
                                  disabled={inv.dpNotDeducted}
                                  title={inv.dpNotDeducted ? DP_NOT_DEDUCTED_TIP : undefined}
                                  onChange={() => toggleInvoiceSelection(inv)}
                                  className="w-3 h-3 accent-[#A57C50] rounded-[2px] cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-1.5 pl-6">
                                <span className="font-bold text-blue-900 font-mono">{inv.poNo || "-"}</span>
                                <span className="mx-1 text-stone-300">|</span>
                                <span className="font-mono text-stone-500">{inv.invoiceNo}</span>
                                {inv.dpNotDeducted && <DpNotDeductedBadge />}
                                <span className="ml-1.5 text-stone-600 truncate">
                                  {inv.itemDescription
                                    ? inv.itemDescription.length > 50
                                      ? inv.itemDescription.slice(0, 50) + "…"
                                      : inv.itemDescription
                                    : ""}
                                </span>
                              </td>
                              <td className="p-1.5 text-center">
                                <span className="px-1.5 py-0.2 rounded-[2px] bg-stone-100 border border-stone-200 text-stone-600 font-bold text-[8.5px]">
                                  {inv.site || "HO"}
                                </span>
                              </td>
                              <td className="p-1.5 text-right font-mono font-bold text-stone-900">
                                {formatCurrency(amt)}
                              </td>
                              <td className="p-1.5 text-center text-stone-500 font-mono text-[9.5px]">
                                {inv.dueDate ? formatDate(inv.dueDate) : invMonth}
                              </td>

                              {/* Week 1 PO Cell */}
                              <td className="p-1.5 text-right font-mono text-[10px] bg-stone-50/30 border-l border-stone-100">
                                {inv.planWeek === 1 ? (
                                  <span className="font-bold text-blue-900">{formatCurrency(amt)}</span>
                                ) : (
                                  <span className="text-stone-200">-</span>
                                )}
                              </td>

                              {/* Week 2 PO Cell */}
                              <td className="p-1.5 text-right font-mono text-[10px] bg-stone-50/30">
                                {inv.planWeek === 2 ? (
                                  <span className="font-bold text-blue-900">{formatCurrency(amt)}</span>
                                ) : (
                                  <span className="text-stone-200">-</span>
                                )}
                              </td>

                              {/* Week 3 PO Cell */}
                              <td className="p-1.5 text-right font-mono text-[10px] bg-stone-50/30">
                                {inv.planWeek === 3 ? (
                                  <span className="font-bold text-blue-900">{formatCurrency(amt)}</span>
                                ) : (
                                  <span className="text-stone-200">-</span>
                                )}
                              </td>

                              {/* Week 4 PO Cell */}
                              <td className="p-1.5 text-right font-mono text-[10px] bg-stone-50/30 border-r border-stone-100">
                                {inv.planWeek === 4 ? (
                                  <span className="font-bold text-blue-900">{formatCurrency(amt)}</span>
                                ) : (
                                  <span className="text-stone-200">-</span>
                                )}
                              </td>

                              {/* Quick Week Setter for this PO */}
                              <td className="p-1 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-0.5">
                                  {[1, 2, 3, 4].map((w) => (
                                    <button
                                      key={w}
                                      onClick={() => handleQuickAssignWeek([inv.id], w)}
                                      className={`px-1 py-0.2 rounded-[2px] text-[8.5px] font-bold transition cursor-pointer ${
                                        inv.planWeek === w
                                          ? "bg-blue-600 text-white shadow-2xs"
                                          : "bg-stone-100 hover:bg-stone-200 text-stone-600"
                                      }`}
                                    >
                                      W{w}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dedicated Sticky Bottom Bar for Grand Total */}
        <div className="bg-[#1A1612] text-white font-bold border-t-2 border-amber-900/40 shrink-0 z-20 text-[11px] shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
          <table className="w-full text-left border-collapse text-[11px]">
            <tbody>
              <tr className="bg-[#1A1612]">
                <td className="p-2.5 w-8"></td>
                <td className="p-2.5 w-8"></td>
                <td className="p-2.5 min-w-[220px]"></td>
                <td className="p-2.5 w-28 text-right font-black uppercase tracking-wider text-stone-300 bg-[#1A1612]">
                  Total ({filteredRows.length} Vendor):
                </td>
                <td className="p-2.5 w-32 text-right font-mono font-black text-amber-400 text-xs bg-[#1A1612] whitespace-nowrap">
                  {formatCurrency(grandTotals.totalValue)}
                </td>
                <td className="p-2.5 w-24 bg-[#1A1612]"></td>
                <td className="p-2.5 w-28 text-right font-mono font-black text-amber-300 text-xs bg-[#251F19] border-l border-amber-900/40 whitespace-nowrap">
                  {formatCurrency(grandTotals.weeks[1])}
                </td>
                <td className="p-2.5 w-28 text-right font-mono font-black text-amber-300 text-xs bg-[#251F19] whitespace-nowrap">
                  {formatCurrency(grandTotals.weeks[2])}
                </td>
                <td className="p-2.5 w-28 text-right font-mono font-black text-amber-300 text-xs bg-[#251F19] whitespace-nowrap">
                  {formatCurrency(grandTotals.weeks[3])}
                </td>
                <td className="p-2.5 w-28 text-right font-mono font-black text-amber-300 text-xs bg-[#251F19] border-r border-amber-900/40 whitespace-nowrap">
                  {formatCurrency(grandTotals.weeks[4])}
                </td>
                <td className="p-2.5 w-28 bg-[#1A1612]"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Summary Matrix Box (Dealer vs Non Dealer) — Matching Excel Bottom Matrix */}
      <div className="bg-white p-3 rounded-[4px] border border-stone-200 shadow-2xs shrink-0">
        <div className="text-[11px] font-bold text-stone-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-stone-900">
            <TrendingUp className="w-3.5 h-3.5 text-[#A57C50]" /> Ringkasan Alokasi Cashflow (Dealer vs Non Dealer)
          </span>
          <span className="text-[10px] text-stone-500 font-normal">
            Target Bulan: <strong className="text-stone-800">{targetPlanMonth}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs border border-stone-300">
            <thead>
              <tr className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px] border-b border-stone-300">
                <th className="p-2 border-r border-stone-300 min-w-[140px]">Kategori</th>
                <th className="p-2 border-r border-stone-300 text-right w-36">Total Value</th>
                <th className="p-2 border-r border-stone-300 text-center w-28 text-stone-500">Distribusi &rarr;</th>
                <th className="p-2 border-r border-stone-300 text-right w-32 bg-stone-50 font-bold text-stone-900">Week 1</th>
                <th className="p-2 border-r border-stone-300 text-right w-32 bg-stone-50 font-bold text-stone-900">Week 2</th>
                <th className="p-2 border-r border-stone-300 text-right w-32 bg-stone-50 font-bold text-stone-900">Week 3</th>
                <th className="p-2 text-right w-32 bg-stone-50 font-bold text-stone-900">Week 4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-[11px]">
              {/* DEALER */}
              <tr className="hover:bg-amber-50/40">
                <td className="p-2 border-r border-stone-200 font-bold text-amber-900">
                  DEALER
                </td>
                <td className="p-2 border-r border-stone-200 text-right font-mono font-bold text-stone-900">
                  {formatCurrency(categoryMatrix.dealer.totalValue)}
                </td>
                <td className="p-2 border-r border-stone-200 text-center text-stone-300 font-mono">-</td>
                <td className="p-2 border-r border-stone-200 text-right font-mono font-semibold text-stone-800">
                  {formatCurrency(categoryMatrix.dealer[1])}
                </td>
                <td className="p-2 border-r border-stone-200 text-right font-mono font-semibold text-stone-800">
                  {formatCurrency(categoryMatrix.dealer[2])}
                </td>
                <td className="p-2 border-r border-stone-200 text-right font-mono font-semibold text-stone-800">
                  {formatCurrency(categoryMatrix.dealer[3])}
                </td>
                <td className="p-2 text-right font-mono font-semibold text-stone-800">
                  {formatCurrency(categoryMatrix.dealer[4])}
                </td>
              </tr>

              {/* NON DEALER */}
              <tr className="hover:bg-stone-50">
                <td className="p-2 border-r border-stone-200 font-bold text-stone-700">
                  NON DEALER
                </td>
                <td className="p-2 border-r border-stone-200 text-right font-mono font-bold text-stone-900">
                  {formatCurrency(categoryMatrix.nonDealer.totalValue)}
                </td>
                <td className="p-2 border-r border-stone-200 text-center text-stone-300 font-mono">-</td>
                <td className="p-2 border-r border-stone-200 text-right font-mono font-semibold text-stone-800">
                  {formatCurrency(categoryMatrix.nonDealer[1])}
                </td>
                <td className="p-2 border-r border-stone-200 text-right font-mono font-semibold text-stone-800">
                  {formatCurrency(categoryMatrix.nonDealer[2])}
                </td>
                <td className="p-2 border-r border-stone-200 text-right font-mono font-semibold text-stone-800">
                  {formatCurrency(categoryMatrix.nonDealer[3])}
                </td>
                <td className="p-2 text-right font-mono font-semibold text-stone-800">
                  {formatCurrency(categoryMatrix.nonDealer[4])}
                </td>
              </tr>

              {/* TOTAL */}
              <tr className="bg-stone-100 font-bold border-t-2 border-stone-400">
                <td className="p-2 border-r border-stone-300 font-black text-stone-900 uppercase">
                  Total
                </td>
                <td className="p-2 border-r border-stone-300 text-right font-mono font-black text-blue-900">
                  {formatCurrency(categoryMatrix.total.totalValue)}
                </td>
                <td className="p-2 border-r border-stone-300 text-center text-stone-300 font-mono">-</td>
                <td className="p-2 border-r border-stone-300 text-right font-mono font-black text-blue-900 bg-stone-200/60">
                  {formatCurrency(categoryMatrix.total[1])}
                </td>
                <td className="p-2 border-r border-stone-300 text-right font-mono font-black text-blue-900 bg-stone-200/60">
                  {formatCurrency(categoryMatrix.total[2])}
                </td>
                <td className="p-2 border-r border-stone-300 text-right font-mono font-black text-blue-900 bg-stone-200/60">
                  {formatCurrency(categoryMatrix.total[3])}
                </td>
                <td className="p-2 text-right font-mono font-black text-blue-900 bg-stone-200/60">
                  {formatCurrency(categoryMatrix.total[4])}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Set Week Modal */}
      {showBatchWeekModal && (
        <SetPlanWeekModal
          isOpen={showBatchWeekModal}
          onClose={() => setShowBatchWeekModal(false)}
          selectedInvoiceIds={selectedInvoiceIds}
          totalAmount={totalSelectedAmount}
          onConfirm={async (month, week) => {
            const ok = await handleAssignPlan(selectedInvoiceIds, month, week);
            if (ok) {
              setSelectedInvoiceIds([]);
              return true;
            }
            return false;
          }}
        />
      )}
    </div>
  );
}
