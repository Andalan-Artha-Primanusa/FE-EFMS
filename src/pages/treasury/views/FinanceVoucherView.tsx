import React, { useState, useMemo, useEffect } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  PlusCircle,
  Printer,
  RotateCcw,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";
import type { TreasuryInvoice, TreasuryVendor } from "../types";
import { VoucherPaymentOfficialPrint } from "../components/VoucherPaymentOfficialPrint";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

interface SavedVoucherGroup {
  id: string; // key: site|voucherNo|vendorId
  site: string;
  voucherNo: string;
  voucherDate: string;
  vendorId: number;
  vendorName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  category: string;
  totalAmount: number;
  invoices: TreasuryInvoice[];
}

export function FinanceVoucherView({ c }: Props) {
  const {
    invoices,
    allUnpaidInvoices,
    handleAssignVoucher,
    handleRemoveVoucher,
    fetchNextVoucherNo,
  } = c;

  const [activeSubTab, setActiveSubTab] = useState<"SAVED" | "ASSIGN">("SAVED");
  const [search, setSearch] = useState("");
  const [selectedSite, setSelectedSite] = useState<string>("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [weekFilter, setWeekFilter] = useState<number>(0);
  const [expandedVouchers, setExpandedVouchers] = useState<Record<string, boolean>>({});

  // States for Assigning Voucher
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
  const [inputVoucherNo, setInputVoucherNo] = useState<string>("001");
  const [inputVoucherDate, setInputVoucherDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active voucher for PDF modal
  const [activePrintVoucher, setActivePrintVoucher] = useState<SavedVoucherGroup | null>(null);

  // Full pool of active unpaid invoices
  const poolInvoices = useMemo(() => {
    const list = allUnpaidInvoices && allUnpaidInvoices.length > 0 ? allUnpaidInvoices : invoices;
    return list.filter((inv) => inv.status !== "paid");
  }, [invoices, allUnpaidInvoices]);

  // Load next recommended voucher transaction number globally across system
  useEffect(() => {
    fetchNextVoucherNo("").then((nextNo) => {
      setInputVoucherNo(nextNo);
    });
  }, [fetchNextVoucherNo]);

  // Toggle expand voucher in row view
  const toggleExpandVoucher = (key: string) => {
    setExpandedVouchers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllVouchers = () => {
    const all: Record<string, boolean> = {};
    filteredSavedVouchers.forEach((g) => (all[g.id] = true));
    setExpandedVouchers(all);
  };

  const collapseAllVouchers = () => {
    setExpandedVouchers({});
  };

  // Distinct available sites dynamically from dataset
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    poolInvoices.forEach((i) => {
      const s = (i.site || "HO").trim().toUpperCase();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [poolInvoices]);

  // Distinct plan months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    poolInvoices.forEach((i) => {
      if (i.planMonth) set.add(i.planMonth);
    });
    return Array.from(set);
  }, [poolInvoices]);

  // 1. Group SAVED vouchers (Vouchers that already have voucherNo assigned in database)
  const savedVouchers = useMemo(() => {
    const map = new Map<string, SavedVoucherGroup>();

    poolInvoices.forEach((inv) => {
      if (!inv.voucherNo) return; // only assigned vouchers

      const site = (inv.site || "HO").trim();
      const vNo = inv.voucherNo.trim();
      const vName = (inv.vendor?.name || "VENDOR LAIN").trim();
      const groupKey = `${site}|${vNo}|${inv.vendorId || vName}`;

      let grp = map.get(groupKey);
      if (!grp) {
        const vDateFormatted = inv.voucherDate
          ? new Date(inv.voucherDate).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })
          : new Date().toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            });

        grp = {
          id: groupKey,
          site,
          voucherNo: vNo,
          voucherDate: vDateFormatted,
          vendorId: inv.vendorId,
          vendorName: vName,
          bankName: inv.vendor?.bankName || "",
          accountNumber: inv.vendor?.accountNumber || "",
          accountName: inv.vendor?.accountName || vName,
          category: inv.category || "ACCOUNT PAYABLE (AP)",
          totalAmount: 0,
          invoices: [],
        };
        map.set(groupKey, grp);
      }

      const amt = Number(inv.totalAmount || inv.remainingBalance || 0);
      grp.totalAmount += amt;
      grp.invoices.push(inv);
    });

    return Array.from(map.values()).sort((a, b) => {
      return a.voucherNo.localeCompare(b.voucherNo, undefined, { numeric: true });
    });
  }, [poolInvoices]);

  // Filter saved vouchers
  const filteredSavedVouchers = useMemo(() => {
    return savedVouchers.filter((g) => {
      const gSite = (g.site || "HO").trim().toUpperCase();
      if (selectedSite !== "ALL" && gSite !== selectedSite.trim().toUpperCase()) return false;

      if (monthFilter !== "ALL") {
        const hasMonth = g.invoices.some((i) => i.planMonth === monthFilter);
        if (!hasMonth) return false;
      }
      if (weekFilter > 0) {
        const hasWeek = g.invoices.some((i) => i.planWeek === weekFilter);
        if (!hasWeek) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const matchV = g.vendorName.toLowerCase().includes(q);
        const matchNo = g.voucherNo.toLowerCase().includes(q);
        const matchBank =
          g.bankName.toLowerCase().includes(q) || g.accountNumber.toLowerCase().includes(q);
        const matchPO = g.invoices.some(
          (i) =>
            (i.poNo && i.poNo.toLowerCase().includes(q)) ||
            (i.invoiceNo && i.invoiceNo.toLowerCase().includes(q)) ||
            (i.itemDescription && i.itemDescription.toLowerCase().includes(q))
        );
        if (!matchV && !matchNo && !matchBank && !matchPO) return false;
      }
      return true;
    });
  }, [savedVouchers, selectedSite, monthFilter, weekFilter, search]);

  // 2. Group UNASSIGNED invoices (Draft POs ready to be bundled into a new voucher payment)
  const filteredUnassignedVendors = useMemo(() => {
    // Only invoices without voucherNo
    const list = poolInvoices.filter((inv) => !inv.voucherNo);

    // Group by Site + Vendor
    const map = new Map<
      string,
      {
        key: string;
        site: string;
        vendorId: number;
        vendorName: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
        invoices: TreasuryInvoice[];
        totalAmount: number;
      }
    >();

    list.forEach((inv) => {
      const site = (inv.site || "HO").trim();
      const siteUpper = site.toUpperCase();

      if (selectedSite !== "ALL" && siteUpper !== selectedSite.trim().toUpperCase()) {
        return;
      }

      if (monthFilter !== "ALL" && inv.planMonth !== monthFilter) {
        return;
      }

      if (weekFilter > 0 && inv.planWeek !== weekFilter) {
        return;
      }

      if (search) {
        const q = search.toLowerCase();
        const vName = (inv.vendor?.name || "").toLowerCase();
        const matchV = vName.includes(q);
        const matchPO =
          (inv.poNo && inv.poNo.toLowerCase().includes(q)) ||
          (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(q));
        const matchDesc = inv.itemDescription && inv.itemDescription.toLowerCase().includes(q);
        if (!matchV && !matchPO && !matchDesc) return;
      }

      const vName = inv.vendor?.name || "VENDOR LAIN";
      const key = `${site}|${inv.vendorId || vName}`;

      let vGrp = map.get(key);
      if (!vGrp) {
        vGrp = {
          key,
          site,
          vendorId: inv.vendorId,
          vendorName: vName,
          bankName: inv.vendor?.bankName || "",
          accountNumber: inv.vendor?.accountNumber || "",
          accountName: inv.vendor?.accountName || vName,
          invoices: [],
          totalAmount: 0,
        };
        map.set(key, vGrp);
      }

      const amt = Number(inv.totalAmount || inv.remainingBalance || 0);
      vGrp.totalAmount += amt;
      vGrp.invoices.push(inv);
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [poolInvoices, selectedSite, monthFilter, weekFilter, search]);

  // Grand totals for saved vouchers
  const savedVouchersGrandTotal = useMemo(() => {
    let totalAmt = 0;
    let totalPOs = 0;
    filteredSavedVouchers.forEach((g) => {
      totalAmt += g.totalAmount;
      totalPOs += g.invoices.length;
    });
    return {
      count: filteredSavedVouchers.length,
      totalPOs,
      totalAmt,
    };
  }, [filteredSavedVouchers]);

  // Grand totals for unassigned draft POs
  const unassignedGrandTotal = useMemo(() => {
    let totalAmt = 0;
    let totalPOs = 0;
    filteredUnassignedVendors.forEach((g) => {
      totalAmt += g.totalAmount;
      totalPOs += g.invoices.length;
    });
    return {
      vendorCount: filteredUnassignedVendors.length,
      totalPOs,
      totalAmt,
    };
  }, [filteredUnassignedVendors]);

  // Selection handlers
  const handleToggleInvoice = (invId: number, vendorInvoices: TreasuryInvoice[]) => {
    setSelectedInvoiceIds((prev) => {
      // If selecting a new invoice, verify it belongs to the same vendor and site
      if (!prev.includes(invId)) {
        const existingInv = poolInvoices.find((i) => prev.includes(i.id));
        const newInv = poolInvoices.find((i) => i.id === invId);
        if (existingInv && newInv) {
          if (existingInv.site !== newInv.site || existingInv.vendorId !== newInv.vendorId) {
            // Reset to this vendor only to enforce 1 Site + 1 Vendor rule
            return [invId];
          }
        }
        return [...prev, invId];
      } else {
        return prev.filter((id) => id !== invId);
      }
    });
  };

  const handleSelectAllForVendor = (vendorInvoices: TreasuryInvoice[]) => {
    const vInvIds = vendorInvoices.map((i) => i.id);
    const allSelected = vInvIds.every((id) => selectedInvoiceIds.includes(id));

    if (allSelected) {
      setSelectedInvoiceIds((prev) => prev.filter((id) => !vInvIds.includes(id)));
    } else {
      // Enforce 1 Site + 1 Vendor: replace selection with all POs of this vendor
      setSelectedInvoiceIds(vInvIds);
    }
  };

  // Execute Assign Voucher to Selected POs
  const handleExecuteAssignVoucher = async () => {
    if (selectedInvoiceIds.length === 0) return;
    if (!inputVoucherNo.trim()) {
      alert("Nomor voucher wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await handleAssignVoucher(
        selectedInvoiceIds,
        inputVoucherNo.trim(),
        inputVoucherDate
      );
      if (ok) {
        setSelectedInvoiceIds([]);
        // Refresh next global voucher transaction number
        const nextNo = await fetchNextVoucherNo("");
        setInputVoucherNo(nextNo);
        setActiveSubTab("SAVED");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Release Voucher
  const handleReleaseVoucher = async (grp: SavedVoucherGroup) => {
    const invIds = grp.invoices.map((i) => i.id);
    if (
      !confirm(
        `Apakah Anda yakin ingin melepaskan Nomor Voucher ${grp.voucherNo} untuk ${grp.vendorName}? Transaksi PO akan kembali ke status draft.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await handleRemoveVoucher(invIds);
      // Refresh next global voucher transaction number
      const nextNo = await fetchNextVoucherNo("");
      setInputVoucherNo(nextNo);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to Mandiri Kopra Consolidated Excel Format
  const handleExportKopraConsolidated = (vGroups: SavedVoucherGroup[]) => {
    if (vGroups.length === 0) {
      alert("Tidak ada voucher yang dapat diekspor.");
      return;
    }

    const rows: any[][] = [];
    // Baris 0 - 9 instruksi template
    for (let i = 0; i < 9; i++) rows.push([]);

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    rows.push(["", "Transfer Date", "Debit Account No."]);
    rows.push(["", "X(8)", "X(40)"]);
    rows.push(["", "yyyymmdd", "Numeric Only"]);
    rows.push(["", todayStr, "1120018514542"]); // Rekening Mandiri PT Andalan
    rows.push(["", "RECORDS"]);
    rows.push([
      "No.",
      "Transfer Method",
      "Destination Acc No.",
      "Transfer Currency",
      "Transfer Amount",
      "Destination Acc Name",
      "Destination Acc Address",
      "Destination Bank Code",
      "Charge Instruction",
      "Transaction Reference",
      "Remark",
      "Beneficiary Notification E-mail",
    ]);

    let seq = 1;
    vGroups.forEach((grp) => {
      const bankUpper = (grp.bankName || "").toUpperCase();
      const isMandiri = bankUpper.includes("MANDIRI");
      const method = isMandiri ? "In-House" : "BI FAST";

      let bankCode = "CENAIDJA"; // BCA default
      if (isMandiri) bankCode = "BMRIIDJA";
      else if (bankUpper.includes("BNI")) bankCode = "BNINIDJA";
      else if (bankUpper.includes("BRI")) bankCode = "BRINIDJA";
      else if (bankUpper.includes("DBS")) bankCode = "DBSSIDJA";

      const poListStr = grp.invoices
        .map((i) => i.poNo)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");
      const remark = `VCR ${grp.voucherNo} - ${grp.site} - ${poListStr}`.slice(0, 70);

      rows.push([
        seq,
        method,
        grp.accountNumber || "-",
        "IDR",
        grp.totalAmount,
        grp.accountName || grp.vendorName,
        grp.site || "HO",
        bankCode,
        "OUR",
        `VCR-${grp.voucherNo}-${grp.site}`.slice(0, 19),
        remark,
        "",
      ]);
      seq++;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "INPUT TRANSACTION HERE");

    const filename = `KOPRA_TRANSFER_VOUCHERS_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 font-sans text-xs overflow-hidden">
      {/* Top Banner */}
      <div className="bg-[#1A1612] text-white p-3 rounded-[4px] border border-amber-900/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-[3px] bg-[#A57C50] text-stone-950 font-black text-[10px] uppercase tracking-wider">
              Voucher Payment & Kopra
            </span>
            <h2 className="text-sm font-bold flex items-center gap-2 text-white">
              <FileText className="w-4 h-4 text-[#A57C50]" /> Eksekusi Voucher Payment (Finance HO)
            </h2>
          </div>
          <p className="text-[11px] text-stone-400 mt-1 max-w-3xl">
            Nomor Voucher bertambah per <strong>transaksi voucher payment</strong>. Pembayaran yang dieksekusi oleh Finance HO adalah yang tercantum pada rekap voucher yang di-print, terikat ketat <strong>per Site dan per Vendor</strong>.
          </p>
        </div>

        {/* Sub-tab switcher & Expand/Collapse */}
        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === "SAVED" && filteredSavedVouchers.length > 0 && (
            <div className="flex items-center gap-1.5 mr-2">
              <button
                onClick={expandAllVouchers}
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-[3px] font-semibold text-[11px] transition cursor-pointer"
              >
                Buka Semua
              </button>
              <button
                onClick={collapseAllVouchers}
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-[3px] font-semibold text-[11px] transition cursor-pointer"
              >
                Tutup Semua
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-stone-900/80 p-1 rounded-[4px] border border-stone-800 shrink-0">
            <button
              onClick={() => setActiveSubTab("SAVED")}
              className={`px-3 py-1.5 rounded-[3px] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                activeSubTab === "SAVED"
                  ? "bg-[#A57C50] text-white shadow-xs"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Rekap Voucher Terbit ({filteredSavedVouchers.length})
            </button>
            <button
              onClick={() => setActiveSubTab("ASSIGN")}
              className={`px-3 py-1.5 rounded-[3px] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                activeSubTab === "ASSIGN"
                  ? "bg-[#A57C50] text-white shadow-xs"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> Buat Voucher Baru ({filteredUnassignedVendors.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-2.5 rounded-[4px] border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Site Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-600 text-[11px]">Filter Site:</span>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
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

          {/* Month Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-600 text-[11px]">Plan Bulan:</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="p-1.5 border border-stone-300 rounded-[3px] font-semibold text-stone-800 bg-white text-[11px]"
            >
              <option value="ALL">Semua Bulan</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Week Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-600 text-[11px]">Week:</span>
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(Number(e.target.value))}
              className="p-1.5 border border-stone-300 rounded-[3px] font-semibold text-stone-800 bg-white text-[11px]"
            >
              <option value={0}>Semua Week</option>
              <option value={1}>Week 1</option>
              <option value={2}>Week 2</option>
              <option value={3}>Week 3</option>
              <option value={4}>Week 4</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari voucher / vendor / bank / PO..."
              className="pl-8 pr-3 py-1.5 border border-stone-300 rounded-[3px] font-medium text-stone-800 bg-white w-64 text-[11px] focus:outline-none focus:border-[#A57C50]"
            />
          </div>

          {/* Reset Filters */}
          {(selectedSite !== "ALL" || monthFilter !== "ALL" || weekFilter !== 0 || search) && (
            <button
              onClick={() => {
                setSelectedSite("ALL");
                setMonthFilter("ALL");
                setWeekFilter(0);
                setSearch("");
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-rose-600 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filter
            </button>
          )}
        </div>

        {/* Right Info & Export All CTA */}
        <div className="flex items-center gap-2">
          {activeSubTab === "SAVED" && filteredSavedVouchers.length > 0 && (
            <button
              onClick={() => handleExportKopraConsolidated(filteredSavedVouchers)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export {filteredSavedVouchers.length} Voucher ke Kopra (.xlsx)
            </button>
          )}

          <div className="text-[11px] font-mono font-bold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-[3px] border border-stone-300">
            No Voucher Transaksi Berikutnya: <span className="text-blue-900 font-black">{inputVoucherNo}</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: REKAP VOUCHER TERBIT (SAVED) - TABEL BARIS FLEKSIBEL */}
      {activeSubTab === "SAVED" && (
        <div className="flex-1 min-h-0 bg-white rounded-[4px] border border-stone-200 shadow-xs flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr className="bg-[#1A1612] text-white font-bold uppercase tracking-wider border-b border-amber-900/30">
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 w-24 text-center">NO VOUCHER</th>
                  <th className="p-2.5 w-16 text-center">SITE</th>
                  <th className="p-2.5 w-24 text-center">TGL VOUCHER</th>
                  <th className="p-2.5">VENDOR &amp; REKENING TUJUAN</th>
                  <th className="p-2.5 w-24 text-center">JUMLAH PO</th>
                  <th className="p-2.5 w-36 text-right pr-4">TOTAL DIBAYARKAN</th>
                  <th className="p-2.5 w-44 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredSavedVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-stone-400 font-medium">
                      <FileText className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                      Belum ada voucher resmi yang sesuai filter ini.
                      <div className="mt-3">
                        <button
                          onClick={() => setActiveSubTab("ASSIGN")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Buat Voucher Baru Sekarang
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSavedVouchers.map((grp) => {
                    const isExpanded = !!expandedVouchers[grp.id];
                    return (
                      <React.Fragment key={grp.id}>
                        {/* Voucher Summary Row */}
                        <tr className="hover:bg-stone-50 transition bg-white font-semibold">
                          <td
                            className="p-2.5 text-center cursor-pointer text-stone-500 hover:text-stone-900"
                            onClick={() => toggleExpandVoucher(grp.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 mx-auto text-[#A57C50]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 mx-auto text-stone-400" />
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-[3px] bg-blue-900 text-white font-mono font-black text-[11px] shadow-xs">
                              {grp.voucherNo}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-[3px] bg-stone-200 text-stone-800 font-black text-[10px]">
                              {grp.site}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono text-stone-700 text-[11px]">
                            {grp.voucherDate}
                          </td>
                          <td className="p-2.5 cursor-pointer" onClick={() => toggleExpandVoucher(grp.id)}>
                            <div className="font-bold text-stone-900 uppercase">
                              {grp.vendorName}
                            </div>
                            <div className="text-[10px] text-stone-500 font-mono">
                              Bank: <strong className="text-stone-800">{grp.bankName || "-"}</strong> • Rek:{" "}
                              <span className="text-blue-900 font-bold">{grp.accountNumber || "-"}</span> a/n {grp.accountName}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-[3px] bg-stone-100 border border-stone-300 text-stone-800 font-bold text-[10px]">
                              {grp.invoices.length} PO
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-stone-950 text-xs pr-4">
                            {formatCurrency(grp.totalAmount)}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              <button
                                onClick={() => setActivePrintVoucher(grp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold text-[10px] shadow-xs transition cursor-pointer"
                              >
                                <Printer className="w-3 h-3" /> Cetak PDF
                              </button>
                              <button
                                onClick={() => handleExportKopraConsolidated([grp])}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-[3px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] transition cursor-pointer shadow-xs"
                              >
                                <FileSpreadsheet className="w-3 h-3" /> Kopra
                              </button>
                              <button
                                onClick={() => handleReleaseVoucher(grp)}
                                disabled={isSubmitting}
                                title="Lepas / Batalkan Voucher"
                                className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-[3px] border border-transparent hover:border-red-200 transition cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Sub-table for PO Details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0 bg-stone-50/70 border-b border-stone-200">
                              <div className="p-3 pl-10 pr-4">
                                <div className="text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                                  <span>
                                    Rincian {grp.invoices.length} PO Terikat Dalam Voucher #{grp.voucherNo} (Site {grp.site})
                                  </span>
                                  <span className="font-mono text-blue-900 font-bold">
                                    Subtotal: {formatCurrency(grp.totalAmount)}
                                  </span>
                                </div>
                                <table className="w-full text-left border border-stone-200 rounded-[3px] bg-white text-[10px]">
                                  <thead>
                                    <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                                      <th className="p-1.5 w-8 text-center">#</th>
                                      <th className="p-1.5 w-36">NO PO</th>
                                      <th className="p-1.5 w-32">NO INVOICE</th>
                                      <th className="p-1.5">DESKRIPSI / KETERANGAN</th>
                                      <th className="p-1.5 w-32">AKUN COA</th>
                                      <th className="p-1.5 w-24 text-center">JATUH TEMPO</th>
                                      <th className="p-1.5 w-24 text-center">PLAN MINGGU</th>
                                      <th className="p-1.5 w-32 text-right pr-3">NOMINAL NET</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-100">
                                    {grp.invoices.map((inv, idx) => (
                                      <tr key={inv.id} className="hover:bg-amber-50/40 transition">
                                        <td className="p-1.5 text-center text-stone-400 font-mono">{idx + 1}</td>
                                        <td className="p-1.5 font-bold text-blue-900 font-mono">{inv.poNo || "-"}</td>
                                        <td className="p-1.5 font-mono text-stone-600">{inv.invoiceNo}</td>
                                        <td className="p-1.5 text-stone-800 font-medium">{inv.itemDescription || "-"}</td>
                                        <td className="p-1.5 text-stone-600">{inv.coaName || "HUTANG USAHA"}</td>
                                        <td className="p-1.5 text-center text-stone-500">{inv.dueDate ? formatDate(inv.dueDate) : "-"}</td>
                                        <td className="p-1.5 text-center">
                                          {inv.planMonth && inv.planWeek ? (
                                            <span className="px-1.5 py-0.5 rounded-[2px] bg-blue-50 border border-blue-200 text-blue-900 font-bold text-[9px]">
                                              {inv.planMonth} W{inv.planWeek}
                                            </span>
                                          ) : (
                                            <span className="text-stone-300">-</span>
                                          )}
                                        </td>
                                        <td className="p-1.5 text-right font-mono font-bold text-stone-900 pr-3">
                                          {formatCurrency(Number(inv.totalAmount || inv.remainingBalance || 0))}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-[#1A1612] text-white font-bold border-t-2 border-amber-900/40 sticky bottom-0 z-20 text-[11px] shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
                <tr className="bg-[#1A1612]">
                  <td colSpan={5} className="p-2.5 text-right font-black uppercase tracking-wider text-stone-300 bg-[#1A1612]">
                    Grand Total ({savedVouchersGrandTotal.count} Voucher Terbit):
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-amber-200 bg-[#1A1612]">
                    {savedVouchersGrandTotal.totalPOs} PO
                  </td>
                  <td className="p-2.5 text-right font-mono font-black text-amber-400 text-xs pr-4 whitespace-nowrap bg-[#1A1612]">
                    {formatCurrency(savedVouchersGrandTotal.totalAmt)}
                  </td>
                  <td className="p-2.5 bg-[#1A1612]"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: PENETAPAN NO VOUCHER BARU (ASSIGN DRAFT PO) */}
      {activeSubTab === "ASSIGN" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* Action Box when POs are selected */}
          <div className="bg-amber-50/70 border border-[#A57C50]/40 p-2.5 rounded-[4px] flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-stone-800 text-[11px]">
                {selectedInvoiceIds.length} PO Terpilih untuk Transaksi Voucher
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-stone-600">Site:</span>
                <span className="px-2 py-0.5 bg-[#1A1612] text-[#A57C50] font-black rounded-[3px] text-[10px]">
                  {selectedSite}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-stone-600">No Voucher:</span>
                <input
                  type="text"
                  value={inputVoucherNo}
                  onChange={(e) => setInputVoucherNo(e.target.value)}
                  placeholder="001"
                  className="w-20 px-2 py-1 text-[11px] font-mono font-bold border border-stone-300 rounded-[3px] text-blue-900 bg-white text-center focus:border-[#A57C50] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-stone-600">Tanggal:</span>
                <input
                  type="date"
                  value={inputVoucherDate}
                  onChange={(e) => setInputVoucherDate(e.target.value)}
                  className="px-2 py-1 text-[11px] font-mono border border-stone-300 rounded-[3px] bg-white focus:border-[#A57C50] focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleExecuteAssignVoucher}
              disabled={selectedInvoiceIds.length === 0 || isSubmitting}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[3px] font-extrabold text-xs transition cursor-pointer shadow-sm ${
                selectedInvoiceIds.length > 0 && !isSubmitting
                  ? "bg-[#A57C50] hover:bg-[#8e6941] text-white"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
            >
              <Check className="w-3.5 h-3.5" /> Tetapkan &amp; Simpan Voucher (
              {selectedInvoiceIds.length} PO)
            </button>
          </div>

          {/* Vendors & POs Table */}
          {filteredUnassignedVendors.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-[4px] border border-stone-200 text-stone-400 font-medium">
              Tidak ada PO draft yang belum dibuatkan voucher untuk site {selectedSite}.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto space-y-3 pr-1">
              {filteredUnassignedVendors.map((vGrp) => {
                const vendorInvIds = vGrp.invoices.map((i) => i.id);
                const allSelected = vendorInvIds.every((id) => selectedInvoiceIds.includes(id));
                const someSelected = vendorInvIds.some((id) => selectedInvoiceIds.includes(id));

                return (
                  <div
                    key={vGrp.key}
                    className="bg-white rounded-[4px] border border-stone-200 shadow-xs overflow-hidden"
                  >
                    {/* Vendor Header */}
                    <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSelectAllForVendor(vGrp.invoices)}
                          className="text-stone-700 hover:text-[#A57C50] cursor-pointer"
                        >
                          {allSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#A57C50]" />
                          ) : someSelected ? (
                            <Square className="w-4 h-4 text-[#A57C50] fill-[#A57C50]/20" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 bg-stone-200 text-stone-800 font-black rounded-[2px] text-[9px]">
                              {vGrp.site}
                            </span>
                            <h3 className="font-bold text-stone-950 uppercase text-xs">
                              {vGrp.vendorName}
                            </h3>
                          </div>
                          <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                            Bank: {vGrp.bankName || "-"} • No Rek: {vGrp.accountNumber || "-"} a/n{" "}
                            {vGrp.accountName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-stone-500 block">
                          Total {vGrp.invoices.length} PO:
                        </span>
                        <span className="font-mono font-bold text-xs text-stone-900">
                          {formatCurrency(vGrp.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* PO List Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-stone-100 bg-stone-50/50 text-[10px] text-stone-500 uppercase font-semibold">
                            <th className="p-2 w-8 text-center">PILIH</th>
                            <th className="p-2 w-36">NO PO</th>
                            <th className="p-2 w-32">NO INVOICE</th>
                            <th className="p-2">DESKRIPSI / KETERANGAN</th>
                            <th className="p-2 w-28 text-center">PLAN PERIOD</th>
                            <th className="p-2 w-28 text-right">NOMINAL NET</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {vGrp.invoices.map((inv) => {
                            const isChecked = selectedInvoiceIds.includes(inv.id);
                            return (
                              <tr
                                key={inv.id}
                                onClick={() => handleToggleInvoice(inv.id, vGrp.invoices)}
                                className={`hover:bg-stone-50/80 cursor-pointer transition ${
                                  isChecked ? "bg-amber-50/50" : ""
                                }`}
                              >
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // handled by tr click
                                    className="cursor-pointer accent-[#A57C50]"
                                  />
                                </td>
                                <td className="p-2 font-bold text-blue-900 font-mono">
                                  {inv.poNo || "NON PO"}
                                </td>
                                <td className="p-2 font-mono text-stone-700">
                                  {inv.invoiceNo}
                                </td>
                                <td className="p-2 text-stone-800">
                                  {inv.itemDescription || "-"}
                                </td>
                                <td className="p-2 text-center text-stone-600 font-semibold text-[10px]">
                                  {inv.planMonth
                                    ? `${inv.planMonth} W${inv.planWeek || 1}`
                                    : "Belum di-plan"}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-stone-950">
                                  {formatCurrency(
                                    Number(inv.totalAmount || inv.remainingBalance || 0)
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Grand Total Bar for ASSIGN view */}
          <div className="shrink-0 bg-[#1A1612] p-2.5 px-4 text-white font-bold rounded-[4px] border border-amber-900/30 flex items-center justify-between text-xs shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
            <span className="text-stone-300 font-medium">
              Total Draft PO Belum Dibuat Voucher ({unassignedGrandTotal.vendorCount} Vendor, {unassignedGrandTotal.totalPOs} PO):
            </span>
            <span className="font-mono text-amber-400 font-black text-xs">
              {formatCurrency(unassignedGrandTotal.totalAmt)}
            </span>
          </div>
        </div>
      )}

      {/* Official Voucher Payment Printable Modal */}
      {activePrintVoucher && (
        <VoucherPaymentOfficialPrint
          isOpen={!!activePrintVoucher}
          onClose={() => setActivePrintVoucher(null)}
          voucherData={{
            voucherNo: activePrintVoucher.voucherNo,
            voucherDate: activePrintVoucher.voucherDate,
            site: activePrintVoucher.site,
            category: activePrintVoucher.category,
            vendor: {
              name: activePrintVoucher.vendorName,
              bankName: activePrintVoucher.bankName,
              accountNumber: activePrintVoucher.accountNumber,
              accountName: activePrintVoucher.accountName,
            },
            invoices: activePrintVoucher.invoices,
          }}
        />
      )}
    </div>
  );
}
