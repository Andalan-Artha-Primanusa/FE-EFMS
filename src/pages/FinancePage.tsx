import { useEffect, useState, useMemo, Fragment } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Edit2, FileSpreadsheet, FileText, Filter, Plus, Trash2, X, DollarSign, Calendar, Info, Layers, UserCheck, ShieldAlert, ShieldCheck, ArrowUpRight, CheckCircle, BarChart3, Eye, User, FileCheck, History, Upload, FileCode, ExternalLink, Calculator, Pickaxe, RefreshCw, Printer, ChevronDown, ChevronRight, Receipt, Lock, Unlock, ArrowRight, Building2, Sparkles, Check, Send, Zap, TrendingUp, Archive, Scale } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { api, API_BASE, uploadDocumentFile, verifyBATracker, approveBATracker, generateInvoiceFromBA, verifyInvoice, approveInvoiceTier1, approveInvoiceTier2, User as UserType } from "../lib/api";

const resolveDocumentUrl = (path: string | undefined | null) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

const formatIDR = (val: number) => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
};

const parseNumber = (str: any): number => {
  if (typeof str === "number") return str;
  if (!str) return 0;
  const clean = String(str).replace(/[^0-9]/g, "");
  return parseInt(clean, 10) || 0;
};

const formatThousand = (val: any): string => {
  if (val === undefined || val === null || val === "") return "";
  const num = parseNumber(val);
  if (num === 0) return "0";
  return new Intl.NumberFormat("id-ID").format(num);
};

const formatDateInput = (dateStr: any) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const indonesianMonths = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatMonthLabel(yyyyMm: string): string {
  if (!yyyyMm || !yyyyMm.includes("-")) return yyyyMm;
  const [year, monthStr] = yyyyMm.split("-");
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    return `${indonesianMonths[monthIndex]} ${year}`;
  }
  return yyyyMm;
}

function formatMonthInput(label: string): string {
  if (!label) return "";
  if (/^\d{4}-\d{2}$/.test(label)) return label;
  const parts = label.trim().split(/[\s-]+/);
  if (parts.length >= 2) {
    let monthName = parts[0].toLowerCase();
    let year = parts[1];
    if (year.length === 2) year = `20${year}`;
    const mIdx = indonesianMonths.findIndex(m => m.toLowerCase().startsWith(monthName));
    if (mIdx !== -1) {
      const monthNum = String(mIdx + 1).padStart(2, '0');
      return `${year}-${monthNum}`;
    }
  }
  return label;
}

function getRomanMonth(periodOrDateStr: string): string {
  const romanMap: { [key: number]: string } = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
    7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"
  };

  const pLower = (periodOrDateStr || "").toLowerCase().trim();

  if (pLower.includes("jul") || pLower.includes("-07") || pLower.includes("juli")) return "VII";
  if (pLower.includes("agu") || pLower.includes("aug") || pLower.includes("-08") || pLower.includes("agustus")) return "VIII";
  if (pLower.includes("sep") || pLower.includes("-09") || pLower.includes("september")) return "IX";
  if (pLower.includes("okt") || pLower.includes("oct") || pLower.includes("-10") || pLower.includes("oktober")) return "X";
  if (pLower.includes("nov") || pLower.includes("-11") || pLower.includes("november")) return "XI";
  if (pLower.includes("des") || pLower.includes("dec") || pLower.includes("-12") || pLower.includes("desember")) return "XII";
  if (pLower.includes("jan") || pLower.includes("-01") || pLower.includes("januari")) return "I";
  if (pLower.includes("feb") || pLower.includes("-02") || pLower.includes("februari")) return "II";
  if (pLower.includes("mar") || pLower.includes("-03") || pLower.includes("maret")) return "III";
  if (pLower.includes("apr") || pLower.includes("-04") || pLower.includes("april")) return "IV";
  if (pLower.includes("mei") || pLower.includes("may") || pLower.includes("-05")) return "V";
  if (pLower.includes("jun") || pLower.includes("-06") || pLower.includes("juni")) return "VI";

  const now = new Date();
  return romanMap[now.getMonth() + 1] || "VIII";
}

function generateBANumberPreview(lastSeqNumber: number, customerCode: string, monthStr: string, yearStr: string): string {
  const nextSeq = String(lastSeqNumber + 1).padStart(2, "0");
  const code = (customerCode || "POS").toUpperCase();
  const romanMonthMap: Record<string, string> = {
    "01": "I", "02": "II", "03": "III", "04": "IV", "05": "V", "06": "VI",
    "07": "VII", "08": "VIII", "09": "IX", "10": "X", "11": "XI", "12": "XII"
  };
  const romanMonth = romanMonthMap[monthStr] || "VI";
  return `${nextSeq}/BA-${code}-NIKEL/${romanMonth}/${yearStr}`;
}

function generateInvoiceNumberPreview(lastSeqNumber: number, customerCode: string, monthStr: string, yearStr: string): string {
  const nextSeq = String(lastSeqNumber + 1).padStart(3, "0");
  const code = (customerCode || "POS").toUpperCase();
  const romanMonthMap: Record<string, string> = {
    "01": "I", "02": "II", "03": "III", "04": "IV", "05": "V", "06": "VI",
    "07": "VII", "08": "VIII", "09": "IX", "10": "X", "11": "XI", "12": "XII"
  };
  const romanMonth = romanMonthMap[monthStr] || "VI";
  return `${nextSeq}/${code}-AAP/RF/${romanMonth}/${yearStr}`;
}

function getYearFromPeriod(periodOrDateStr: string): string {
  const str = periodOrDateStr || "";
  const match4 = str.match(/\b20\d{2}\b/);
  if (match4) return match4[0];
  const match2 = str.match(/-(\d{2})$/);
  if (match2) return `20${match2[1]}`;
  return String(new Date().getFullYear());
}

function generateInvoiceNumber(customerCode: string, workPeriod: string, existingRowsCount: number): string {
  const code = (customerCode || "POS").toUpperCase();
  const nextSeq = String(existingRowsCount + 1).padStart(3, "0");
  const romanMonth = getRomanMonth(workPeriod);
  const yearStr = getYearFromPeriod(workPeriod);
  return `${nextSeq}/${code}-AAP/RF/${romanMonth}/${yearStr}`;
}

export const SOW_MASTER_CATALOG = [
  // Kategori 1: Operating & Mining
  { name: "Top Soil", category: "Operating & Mining", unit: "BCM", defaultRate: 60500, usdRate: 3.38, defaultDistance: 1000, overhaulRate: 9643 },
  { name: "Overburden/ Waste", category: "Operating & Mining", unit: "BCM", defaultRate: 59500, usdRate: 3.327, defaultDistance: 1000, overhaulRate: 9643 },
  { name: "Limonite", category: "Operating & Mining", unit: "WMT", defaultRate: 60200, usdRate: 3.363, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Saprolite", category: "Operating & Mining", unit: "WMT", defaultRate: 62200, usdRate: 3.472, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Uncrushed Rock", category: "Operating & Mining", unit: "BCM", defaultRate: 142275, usdRate: 7.938, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Cut", category: "Operating & Mining", unit: "BCM", defaultRate: 38150, usdRate: 2.129, defaultDistance: 1000, overhaulRate: 9340 },
  { name: "Crushed Rock", category: "Operating & Mining", unit: "BCM", defaultRate: 233900, usdRate: 13.05, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Land Clearing", category: "Operating & Mining", unit: "m2", defaultRate: 6830, usdRate: 0.381, defaultDistance: 0, overhaulRate: 0 },
  // Kategori 2: Mine Development Operation (MDO)
  { name: "Mine Development (MDO) - Clearing & Access Road", category: "MDO", unit: "Ha", defaultRate: 15500000, usdRate: 0, defaultDistance: 0, overhaulRate: 0 },
  { name: "Rocks for construction - under/overhaul", category: "MDO", unit: "USD/1KM", defaultRate: 9450, usdRate: 0.526, defaultDistance: 1000, overhaulRate: 9450 },
  { name: "Uncrushed rocks for construction (MDO)", category: "MDO", unit: "BCM", defaultRate: 142275, usdRate: 7.938, defaultDistance: 1000, overhaulRate: 9428 },
  { name: "Road Construction & Drainage", category: "MDO", unit: "Mtr", defaultRate: 450000, usdRate: 0, defaultDistance: 0, overhaulRate: 0 },
];

function getBAInvoiceStatus(ba: any, allInvoices: any[]) {
  if (!ba) {
    return {
      isFullyInvoiced: false,
      isPartiallyInvoiced: false,
      createdMiningInv: null,
      createdMDOInv: null,
      createdInvoices: [],
      remainingCount: 0,
    };
  }

  const baNum = (ba.baNumber || "").trim().toLowerCase();
  const linkedNo = (ba.invoiceNoLinked || "").trim().toLowerCase();

  // Find all invoices that reference this BA or whose invoiceNo matches linkedNo
  const matchedInvoices = (allInvoices || []).filter((inv) => {
    const invRef = (inv.baNoReference || "").trim().toLowerCase();
    const invNo = (inv.invoiceNo || "").trim().toLowerCase();
    if (baNum && invRef === baNum) return true;
    if (linkedNo && linkedNo !== "-" && invNo === linkedNo) return true;
    return false;
  });

  const isPOS = (ba.customerCode || "POS") === "POS";

  if (isPOS) {
    const createdMiningInv = matchedInvoices.find((inv) => 
      inv.invoiceCategory === "Operation & Mining" ||
      inv.activityGroup === "OPERATION & MINING" ||
      (inv.invoiceNo || "").includes("MINING") ||
      (inv.invoiceNo || "").includes("RF")
    ) || null;

    const createdMDOInv = matchedInvoices.find((inv) => 
      inv.invoiceCategory === "MDO" ||
      (inv.activityGroup || "").includes("MDO") ||
      (inv.invoiceNo || "").includes("MDO")
    ) || null;

    const isFullyInvoiced = Boolean(createdMiningInv && createdMDOInv);
    const isPartiallyInvoiced = Boolean((createdMiningInv || createdMDOInv) && !isFullyInvoiced);

    return {
      isFullyInvoiced,
      isPartiallyInvoiced,
      createdMiningInv,
      createdMDOInv,
      createdInvoices: matchedInvoices,
      remainingCount: (createdMiningInv ? 0 : 1) + (createdMDOInv ? 0 : 1),
    };
  } else {
    const isFullyInvoiced = matchedInvoices.length > 0;
    return {
      isFullyInvoiced,
      isPartiallyInvoiced: false,
      createdMiningInv: matchedInvoices[0] || null,
      createdMDOInv: null,
      createdInvoices: matchedInvoices,
      remainingCount: isFullyInvoiced ? 0 : 1,
    };
  }
}

function renderBAStatusBadge(status: string, invoiceNoLinked?: string, isInvoiced?: boolean, baRow?: any, allInvoices?: any[]) {
  const s = (status || "").trim();
  const isPOS = baRow?.customerCode === "POS";

  if (isPOS && allInvoices && baRow) {
    const invStatus = getBAInvoiceStatus(baRow, allInvoices);
    if (invStatus.isFullyInvoiced) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1 shadow-2xs">
            <Archive size={11} className="text-purple-700" /> Arsip (2/2 Terbit)
          </span>
          <span className="text-[9px] font-mono text-purple-800 font-bold text-center leading-tight">
            {invStatus.createdMiningInv?.invoiceNo} &<br/>{invStatus.createdMDOInv?.invoiceNo}
          </span>
        </div>
      );
    } else if (invStatus.isPartiallyInvoiced) {
      const created = invStatus.createdMiningInv ? "Mining" : "MDO";
      const missing = invStatus.createdMiningInv ? "MDO" : "Mining";
      const createdInvNo = invStatus.createdMiningInv?.invoiceNo || invStatus.createdMDOInv?.invoiceNo;

      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            1/2 Inv Terbit
          </span>
          <div className="text-[9px] flex flex-col items-center leading-tight">
            <span className="text-emerald-700 font-bold">✓ {created}: {createdInvNo}</span>
            <span className="text-amber-800 font-extrabold">⏳ Belum: Inv {missing}</span>
          </div>
        </div>
      );
    }
  }

  const linked = (invoiceNoLinked || "").trim();
  if (isInvoiced || s === "Arsip" || s === "Invoiced") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1 shadow-2xs">
          <Archive size={11} className="text-purple-700" /> Arsip
        </span>
        {linked && linked !== "-" && (
          <span className="text-[10px] font-mono text-purple-700 font-bold">
            {linked}
          </span>
        )}
      </div>
    );
  }

  if (s === "Submit" || s.startsWith("Draft") || s.startsWith("Siap") || s.startsWith("Submited") || s.startsWith("Submitted")) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-block whitespace-nowrap shadow-2xs">
        Submit
      </span>
    );
  }
  if (s === "Pending Berita Acara" || s.startsWith("Pending") || s.startsWith("Verified")) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-block whitespace-nowrap shadow-2xs">
        Pending Berita Acara
      </span>
    );
  }
  if (s === "Ready to Invoice" || s.startsWith("Approved")) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block whitespace-nowrap shadow-2xs">
        Ready to Invoice
      </span>
    );
  }
  if (s === "Revisi" || s.startsWith("Reject")) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block whitespace-nowrap shadow-2xs">
        Revisi
      </span>
    );
  }
  return (
    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-block whitespace-nowrap shadow-2xs">
      {status || "Submit"}
    </span>
  );
}

function getBAStatusForExport(ba: any, allInvoices: any[]) {
  const invStatus = getBAInvoiceStatus(ba, allInvoices);
  const s = (ba?.statusBA || "Submit").trim();
  const isPOS = (ba?.customerCode || "POS") === "POS";

  if (isPOS) {
    if (invStatus.isFullyInvoiced) {
      return {
        label: "ARSIP (2/2 TERBIT)",
        badgeClass: "bg-purple",
        subtext: `${invStatus.createdMiningInv?.invoiceNo || ""} & ${invStatus.createdMDOInv?.invoiceNo || ""}`,
      };
    }
    if (invStatus.isPartiallyInvoiced) {
      const created = invStatus.createdMiningInv ? "MINING" : "MDO";
      const missing = invStatus.createdMiningInv ? "MDO" : "MINING";
      const invNo = invStatus.createdMiningInv?.invoiceNo || invStatus.createdMDOInv?.invoiceNo || "";
      return {
        label: "1/2 INV TERBIT",
        badgeClass: "bg-amber",
        subtext: `✓ ${created}: ${invNo} | ⏳ Belum: ${missing}`,
      };
    }
  } else {
    if (invStatus.isFullyInvoiced || s === "Arsip" || s === "Invoiced") {
      return {
        label: "ARSIP",
        badgeClass: "bg-purple",
        subtext: ba?.invoiceNoLinked || "",
      };
    }
  }

  if (s === "Ready to Invoice" || s === "Approved") {
    return { label: "READY TO INVOICE", badgeClass: "bg-emerald", subtext: "" };
  }
  if (s === "Pending Berita Acara" || s === "Verified" || s === "Pending") {
    return { label: "PENDING BERITA ACARA", badgeClass: "bg-amber", subtext: "" };
  }
  if (s === "Revisi" || s.startsWith("Reject")) {
    return { label: "REVISI", badgeClass: "bg-rose", subtext: "" };
  }
  return { label: "SUBMIT", badgeClass: "bg-slate", subtext: "" };
}

function renderInvoiceStatusBadge(status: string) {
  const s = (status || "").trim();
  if (s === "Paid") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block whitespace-nowrap">Paid</span>;
  if (s === "Overdue") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block whitespace-nowrap">Overdue</span>;
  if (s === "Verified") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 inline-block whitespace-nowrap">Verified SPV</span>;
  if (s === "Approved_Tier1") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 inline-block whitespace-nowrap">Approved Mgr (Tier 1)</span>;
  if (s === "Issued" || s === "Approved_Tier2") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 font-extrabold inline-block whitespace-nowrap">Issued (Approved Dir)</span>;
  if (s === "Rejected") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block whitespace-nowrap">Rejected</span>;
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-block whitespace-nowrap">{status || "Draft"}</span>;
}

function parsePeriodToMonthIndex(periodStr: string): number {
  if (!periodStr || periodStr === "All") return 999999;
  const s = periodStr.toLowerCase().trim();

  let month = 0;
  if (s.includes("jan")) month = 1;
  else if (s.includes("feb")) month = 2;
  else if (s.includes("mar")) month = 3;
  else if (s.includes("apr")) month = 4;
  else if (s.includes("mei") || s.includes("may")) month = 5;
  else if (s.includes("jun")) month = 6;
  else if (s.includes("jul")) month = 7;
  else if (s.includes("agt") || s.includes("aug") || s.includes("agus")) month = 8;
  else if (s.includes("sep")) month = 9;
  else if (s.includes("okt") || s.includes("oct")) month = 10;
  else if (s.includes("nov")) month = 11;
  else if (s.includes("des") || s.includes("dec")) month = 12;

  let year = 2026;
  const matchYear = s.match(/20\d{2}|\d{2}/);
  if (matchYear) {
    const yNum = parseInt(matchYear[0], 10);
    year = yNum < 100 ? 2000 + yNum : yNum;
  }

  return year * 100 + month;
}

// Component helper input Rupiah dengan Auto Thousand Separator (.)
function RupiahInput({
  label,
  value,
  onChange,
  required,
  placeholder,
  helperText
}: {
  label: string;
  value: number | string;
  onChange: (val: number) => void;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}) {
  const displayVal = (value === 0 || value === "0" || !value) ? "" : formatThousand(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = parseNumber(e.target.value);
    onChange(rawVal);
  };

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-xs font-extrabold text-slate-400">Rp</span>
        <input
          type="text"
          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 pl-9 text-slate-900 font-mono font-bold focus:border-cyan-700 focus:bg-white outline-none text-xs"
          placeholder={placeholder || "0"}
          value={displayVal}
          onFocus={(e) => e.target.select()}
          onChange={handleChange}
          required={required}
        />
      </div>
      {helperText && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{helperText}</p>}
    </div>
  );
}

const masterBankAccounts = [
  { id: "BNI", bankName: "Bank BNI", bankAccountName: "PT Andalan Artha Primanusa", bankAccountNo: "8188788882", bankBranch: "Harmoni, Jakarta" },
  { id: "MANDIRI", bankName: "Bank Mandiri", bankAccountName: "PT Andalan Artha Primanusa", bankAccountNo: "122-00-0987654-3", bankBranch: "Sudirman, Jakarta" },
  { id: "BRI", bankName: "Bank BRI Escrow", bankAccountName: "PT Andalan Artha Primanusa", bankAccountNo: "0341-01-000123-30-5", bankBranch: "Kemang, Jakarta" },
  { id: "BCA", bankName: "Bank BCA", bankAccountName: "PT Andalan Artha Primanusa", bankAccountNo: "001-388-9900", bankBranch: "Kuningan, Jakarta" },
];

// Generator Timeline Audit Log untuk Modal Detail View 2 Kolom
const generateAuditTimeline = (type: string, item: any) => {
  const formatDateDisplay = (val: any) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (type === "ba") {
    const isVerified = Boolean(item.verifiedBy || ["Pending Berita Acara", "Verified", "Ready to Invoice", "Approved"].includes(item.statusBA));
    const isApproved = item.statusBA === "Ready to Invoice" || item.statusBA === "Approved";
    const isRejected = item.statusBA === "Revisi" || item.statusBA === "Rejected";

    return [
      {
        step: 1,
        title: "BA Dibuat (Draft)",
        user: item.picAAP || "Admin Finance Site",
        role: "Admin Finance Site",
        time: item.createdAt ? formatDateDisplay(item.createdAt) : item.workEndDate ? formatDateDisplay(item.workEndDate) : "31/01/2026",
        status: "completed",
        desc: `Draft Berita Acara #${item.baNumber} dibuat oleh Admin Finance Site.`
      },
      {
        step: 2,
        title: "Verifikasi SPV Site",
        user: item.verifiedBy ? item.verifiedBy : (isVerified ? "SPV Verifikator (Verified)" : "Belum Diverifikasi"),
        role: "SPV Verifikator",
        time: item.verifiedAt ? formatDateDisplay(item.verifiedAt) : (isVerified ? "Terverifikasi" : "Menunggu SPV"),
        status: isVerified ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.verifiedBy
          ? `Dokumen BA diverifikasi & dicatat oleh akun: ${item.verifiedBy}.`
          : (isVerified ? "Pemeriksaan fisik & data BA telah disetujui SPV." : "Menunggu verifikasi rincian operasional oleh SPV Site.")
      },
      {
        step: 3,
        title: "Approval Manager (Final BA)",
        user: item.approvedBy ? item.approvedBy : (isApproved ? "Finance Manager (Approved)" : "Belum Disetujui"),
        role: "Manager",
        time: item.approvedAt ? formatDateDisplay(item.approvedAt) : (item.baSignedDate ? formatDateDisplay(item.baSignedDate) : "Menunggu Manager"),
        status: isApproved ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.approvedBy
          ? `Persetujuan BA disahkan oleh akun: ${item.approvedBy}. Status BA Approved.`
          : (isApproved ? "Berita Acara telah disetujui Manager & TTD aktif." : "Menunggu persetujuan utama dari Manager.")
      },
      {
        step: 4,
        title: "Relasi Invoice Penagihan",
        user: item.invoiceNoLinked ? "Admin Finance HO" : "Belum Diterbitkan",
        role: "Admin Finance HO",
        time: item.invoiceIssuedDate ? formatDateDisplay(item.invoiceIssuedDate) : "Belum Terbit",
        status: item.invoiceNoLinked ? "completed" : "pending",
        desc: item.invoiceNoLinked ? `Terhubung resmi ke Invoice Penagihan #${item.invoiceNoLinked}` : "Invoice penagihan belum diterbitkan dari BA ini."
      }
    ];
  }

  if (type === "invoice") {
    const isVerified = Boolean(item.verifiedBy || ["Verified", "Approved_Tier1", "Issued", "Paid"].includes(item.status));
    const isTier1 = Boolean(item.approvedManagerBy || ["Approved_Tier1", "Issued", "Paid"].includes(item.status));
    const isTier2 = Boolean(item.approvedDirectorBy || ["Issued", "Paid"].includes(item.status));
    const isRejected = item.status === "Rejected";

    return [
      {
        step: 1,
        title: "Invoice Diterbitkan (Draft)",
        user: item.createdBy || "Admin Finance Site / HO",
        role: "Admin Finance",
        time: item.createdAt ? formatDateDisplay(item.createdAt) : formatDateDisplay(item.invoiceDate),
        status: "completed",
        desc: `Master Invoice ${item.invoiceNo} dibuat berdasarkan BA Ref: ${item.baNoReference || "-"}.`
      },
      {
        step: 2,
        title: "Verifikasi SPV Site",
        user: item.verifiedBy ? item.verifiedBy : (isVerified ? "SPV Verifikator (Verified)" : "Belum Diverifikasi"),
        role: "SPV Verifikator",
        time: item.verifiedAt ? formatDateDisplay(item.verifiedAt) : (isVerified ? "Terverifikasi" : "Menunggu SPV"),
        status: isVerified ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.verifiedBy
          ? `Rincian Invoice & kesesuaian BA diverifikasi oleh akun: ${item.verifiedBy}.`
          : (isVerified ? "Verifikasi rincian volume & nilai invoice disetujui SPV." : "Menunggu verifikasi rincian invoice oleh SPV Site.")
      },
      {
        step: 3,
        title: "Approval Tier 1 (Manager)",
        user: item.approvedManagerBy ? item.approvedManagerBy : (isTier1 ? "Finance Manager (Approved T1)" : "Belum Disetujui"),
        role: "Manager",
        time: item.approvedManagerAt ? formatDateDisplay(item.approvedManagerAt) : (isTier1 ? "Disetujui T1" : "Menunggu Manager"),
        status: isTier1 ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.approvedManagerBy
          ? `Persetujuan Tier 1 diberikan oleh akun: ${item.approvedManagerBy}.`
          : (isTier1 ? "Approval Tier 1 Manager selesai, siap lanjut ke Direktur." : "Menunggu persetujuan utama (Tier 1) Finance Manager.")
      },
      {
        step: 4,
        title: "Approval Tier 2 (Direktur)",
        user: item.approvedDirectorBy ? item.approvedDirectorBy : (isTier2 ? "Direktur Utama (Approved T2)" : "Belum Disetujui"),
        role: "Direktur",
        time: item.approvedDirectorAt ? formatDateDisplay(item.approvedDirectorAt) : (isTier2 ? "Disetujui T2" : "Menunggu Direktur"),
        status: isTier2 ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.approvedDirectorBy
          ? `Persetujuan Tier 2 (Eksekutif) disahkan oleh akun: ${item.approvedDirectorBy}. Status resmi: Issued.`
          : (isTier2 ? "Approval Tier 2 Direktur selesai. Invoice terbit resmi (Issued)." : "Menunggu persetujuan eksekutif (Tier 2) Direktur.")
      }
    ];
  }
  if (type === "payment") {
    return [
      { step: 1, title: "Uang Masuk Dicatat", user: "Rina Setyowati", role: "Treasury Admin", time: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("id-ID") : "11/03/2026", status: "completed", desc: `Menerima dana ${formatIDR(item.amountPaid)} melalui ${item.receivingBank}.` },
      { step: 2, title: "Rekonsiliasi Bank", user: "Deni Arisandi", role: "Bank Reconciliation", time: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("id-ID") : "11/03/2026", status: "completed", desc: `Nomor referensi transfer ${item.refNo} terkonfirmasi di mutasi bank.` },
      { step: 3, title: "Credit Matching ke Invoice", user: "System Engine", role: "Auto Settlement", time: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("id-ID") : "11/03/2026", status: "completed", desc: `Kredit otomatis dialokasikan ke Invoice ${item.invoiceNo} (${item.customerCode}).` }
    ];
  }
  return [
    { step: 1, title: "Registrasi Customer", user: "Legal Commercial AAP", role: "Commercial Dept", time: "01/01/2024", status: "completed", desc: `Pendaftaran entitas pelanggan ${item.fullName} (${item.code}).` },
    { step: 2, title: "Approval Credit Terms", user: "Chief Financial Officer (CFO)", role: "Board Executive", time: "05/01/2024", status: "completed", desc: `Persetujuan termin pembayaran ${item.terminDays} Hari.` },
    { step: 3, title: "Kontrak Kerjasama Aktif", user: "Legal Compliance Manager", role: "Legal Dept", time: "15/01/2024", status: "completed", desc: `Kontrak #${item.contractNo} nilai ${formatIDR(item.contractValue)} berjalan.` }
  ];
};

export function FinancePage({
  viewTitle,
  query,
  onNotice,
  user
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
  user?: UserType;
}) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [baRows, setBaRows] = useState<any[]>([]);

  const userRole = user?.role || "Super Admin";
  const isSuper = userRole === "Super Admin" || userRole === "Superadmin";
  const isFinanceSpecialist = isSuper || userRole.includes("Specialist") || userRole.includes("Finance") || userRole.includes("SPV") || userRole.includes("Supervisor") || userRole.includes("Admin");
  const isSPV = isFinanceSpecialist;
  const isManager = isSuper || userRole.includes("Manager") || userRole.includes("FATB") || userRole.includes("Head") || userRole.includes("Director") || userRole.includes("Direktur");
  const isDirector = isSuper || userRole.includes("Director") || userRole.includes("Direktur");
  const [invoiceRows, setInvoiceRows] = useState<any[]>([]);
  const [paymentRows, setPaymentRows] = useState<any[]>([]);
  const [customerRows, setCustomerRows] = useState<any[]>([]);
  const [pendingVolumeLedgers, setPendingVolumeLedgers] = useState<any[]>([]);
  const [showPendingVolumeDrawer, setShowPendingVolumeDrawer] = useState<boolean>(false);
  const [baFilter, setBaFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("Jul-26");
  const [invStatusFilter, setInvStatusFilter] = useState("All");
  const [invCardTab, setInvCardTab] = useState<"AR_ANDALAN" | "PENALTY_UNCUT" | "SUBJECT_TO_INVOICE">("AR_ANDALAN");
  const [invPeriodFilter, setInvPeriodFilter] = useState("Jul-26");

  // Modal Input & Edit State
  const [modalType, setModalType] = useState<"none" | "ba" | "invoice" | "payment" | "customer" | "pending_volume">("none");
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ customerCode: "POS", workPeriod: "Juni 2026" });
  const [showActivityGroupDropdown, setShowActivityGroupDropdown] = useState(false);
  const [showExportBADropdown, setShowExportBADropdown] = useState(false);
  const [showInputBADropdown, setShowInputBADropdown] = useState(false);
  const [showExportARDropdown, setShowExportARDropdown] = useState(false);
  const [showInputARDropdown, setShowInputARDropdown] = useState(false);
  const [baRowActionDropdownId, setBaRowActionDropdownId] = useState<number | null>(null);

  // Modal Detail View 2 Kolom State
  const [detailViewItem, setDetailViewItem] = useState<{ type: "ba" | "invoice" | "payment" | "customer"; data: any } | null>(null);
  const [isInlineEditingBA, setIsInlineEditingBA] = useState<boolean>(true);

  // State Form Partial Payment (Catat Cicilan Baru)
  const [showAddPartialPayment, setShowAddPartialPayment] = useState(false);
  const [partialPaymentForm, setPartialPaymentForm] = useState({
    amountPaid: "",
    paymentDate: new Date().toISOString().split("T")[0],
    receivingBank: "Bank Mandiri Escrow",
    refNo: "",
    notes: ""
  });

  // State Kalkulator POS Mining & Raise & Fall (RF) Escalation
  const [mRate, setMRate] = useState(17923.30);
  const [fuelPriceUSD, setFuelPriceUSD] = useState(1.422);
  const [laborPriceIDR, setLaborPriceIDR] = useState(3721423);

  const [dynamicSowOptions, setDynamicSowOptions] = useState<any[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/api/master-data/raise-fall")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const activeRf = data[0];
          if (activeRf.actualMRateXn > 0) setMRate(activeRf.actualMRateXn);
          if (activeRf.actualFuelFn > 0) setFuelPriceUSD(activeRf.actualFuelFn);
          if (activeRf.actualLaborLn > 0) setLaborPriceIDR(activeRf.actualLaborLn);
        }
      })
      .catch(() => {});

    api<any[]>("/api/master-data/variable-sow")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDynamicSowOptions(
            data.map((d) => ({
              id: d.id,
              code: d.itemName ? d.itemName.toUpperCase().replace(/[^A-Z0-9]/g, "_") : `SOW_${d.id}`,
              name: d.itemName,
              itemName: d.itemName,
              category: d.category,
              unit: d.unit,
              customer: d.customer || d.customerCode || "POS",
              customerCode: d.customerCode || d.customer || "POS",
              baseRateUSD: d.rateUSD || 0,
              rateUSD: d.rateUSD || 0,
              rateIDR: d.rateIDR || (d.rateUSD ? Math.round(d.rateUSD * 17923.30) : 0)
            }))
          );
        }
      })
      .catch(() => {});

    api<any[]>("/api/master-data/bank-accounts")
      .then((data) => {
        if (Array.isArray(data)) setBankAccountOptions(data);
      })
      .catch(() => {});
  }, []);

  // Helper untuk mengambil unit rate dari Master Data Variable SOW per customer
  const getSowMasterRate = (customer: string, itemName: string, fallbackRate: number, isUSD: boolean = false) => {
    const custUpper = customer.toUpperCase();
    const itemNorm = itemName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = dynamicSowOptions.find(s => {
      const sCust = (s.customer || s.customerCode || "").toUpperCase();
      const sName = (s.itemName || s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return (sCust === custUpper || (!sCust && custUpper === "POS")) && (sName.includes(itemNorm) || itemNorm.includes(sName));
    });
    if (match) {
      if (isUSD && match.rateUSD) return match.rateUSD;
      if (!isUSD && match.rateIDR) return match.rateIDR;
      if (!isUSD && match.rateUSD) return Math.round(match.rateUSD * (mRate || 17923.30));
    }
    return fallbackRate;
  };

  // Real-time RF Index Calculation Constants & Value
  const baseFuelPrice = 10699.97;
  const baseLaborPrice = 3594536;
  const baseForexRate = 15388.75;
  const weightA = 0.34;
  const weightB = 0.25;
  const weightC = 0.41;
  const obBaseRateUSD = 3.327;

  const fuelTerm = (obBaseRateUSD * weightA * (fuelPriceUSD * mRate)) / baseFuelPrice;
  const laborTerm = (obBaseRateUSD * weightB * (laborPriceIDR * mRate)) / (baseLaborPrice * baseForexRate);
  const fixedTerm = obBaseRateUSD * weightC;
  const rfIndexCalculated = (fuelTerm + laborTerm + fixedTerm) / obBaseRateUSD;

  // Master Data Variable SOW Options (Dynamic from API with fallback)
  const defaultMasterVariableOptions = [
    { code: "OB", name: "OVER BURDEN REMOVAL", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.327 },
    { code: "TOPSOIL", name: "TOP SOIL REMOVAL", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.380 },
    { code: "LIMONITE", name: "LIMONITE ORE", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.363 },
    { code: "SAPROLITE", name: "SAPROLITE ORE", category: "Operation & Mining", unit: "Bcm", baseRateUSD: 3.472 },
    { code: "OVERHAUL_OB", name: "Over/Underhaul For OB Removal", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 450, baseRateUSD: 0.538 },
    { code: "OVERHAUL_TOP", name: "Over/Underhaul For Top Soil Removal", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 1200, baseRateUSD: 0.538 },
    { code: "OVERHAUL_LIM", name: "Over/Underhaul For Limonite", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 1000, baseRateUSD: 0.526 },
    { code: "OVERHAUL_SAP", name: "Over/Underhaul For Saprolite", category: "Operation & Mining", unit: "Bcm", overhaulMtr: 500, baseRateUSD: 0.526 },
    { code: "LAND_CLEARING", name: "Land Clearing", category: "Rehabilitation", unit: "m2", baseRateUSD: 0.381 },
    { code: "RECLAIM", name: "Reclaim & Revegetation", category: "Rehabilitation", unit: "m2", baseRateUSD: 0.450 },
    { code: "MDO", name: "Mine Development (MDO Cut & Fill)", category: "Mine Development (MDO)", unit: "Bcm", baseRateUSD: 4.100 },
    { code: "GEOTEXTILE", name: "Geotextile Installation", category: "Mine Development (MDO)", unit: "m2", baseRateUSD: 1.250 },
  ];

  const masterVariableOptions = dynamicSowOptions.length > 0 ? dynamicSowOptions : defaultMasterVariableOptions;

  // Dynamic Master SOW Catalog derived live from master data API (dynamicSowOptions) & MRate
  const activeSOWCatalog = useMemo(() => {
    if (dynamicSowOptions && dynamicSowOptions.length > 0) {
      const custUpper = (formData.customerCode || "POS").toUpperCase();
      const filtered = dynamicSowOptions.filter((s) => {
        const sCust = (s.customer || s.customerCode || "").toUpperCase();
        return !sCust || sCust === custUpper || (custUpper === "POS" && (!sCust || sCust === "POS"));
      });
      if (filtered.length > 0) {
        return filtered.map((s) => {
          let category = "Operating & Mining";
          const catNorm = (s.category || "").toLowerCase();
          if (catNorm.includes("mdo") || catNorm.includes("development") || catNorm.includes("mine development")) {
            category = "MDO";
          }
          const rateIDR = s.rateIDR ? s.rateIDR : (s.rateUSD ? Math.round(s.rateUSD * (mRate || 17923.30)) : (s.baseRateUSD ? Math.round(s.baseRateUSD * (mRate || 17923.30)) : 0));
          let cleanUnit = (s.unit || "BCM").replace(/^USD\//i, "").trim();
          if (cleanUnit.toUpperCase() === "1KM") cleanUnit = "USD/1KM";

          return {
            name: s.itemName || s.name,
            category: category,
            unit: cleanUnit || "BCM",
            defaultRate: rateIDR,
            usdRate: s.rateUSD || s.baseRateUSD || 0,
            defaultDistance: (s.itemName || "").toLowerCase().includes("overhaul") ? 1000 : 1000,
            overhaulRate: 0,
            id: s.id
          };
        });
      }
    }
    return SOW_MASTER_CATALOG;
  }, [dynamicSowOptions, formData.customerCode, mRate]);

  // ================= TEMPLATES PER CUSTOMER (POS, BGG, DBK, SBS) =================

  // 1. POS Mining (Gambar 1 / Baseline)
  const blankPOSItems = [
    { id: "A1", section: "A", code: "A1", description: "OVER BURDEN REMOVAL", volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Overburden/Waste", 3.327, true) },
    { id: "A2", section: "A", code: "A2", description: "TOP SOIL REMOVAL", volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Topsoil Removal - Base Rate", 3.380, true) },
    { id: "A3", section: "A", code: "A3", description: "LIMONITE", volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Limonite - Base Rate", 3.363, true) },
    { id: "A4", section: "A", code: "A4", description: "SAPROLITE", volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Saprolite - Base Rate", 3.472, true) },

    { id: "B1", section: "B", code: "B1", description: "B1. Over/Underhaul For OB Removal", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "OB/Waste - over/underhaul", 0.538, true) },
    { id: "B2", section: "B", code: "B2", description: "B2. Over/Underhaul For Top Soil Removal", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Topsoil Removal - over/underhaul", 0.538, true) },
    { id: "B3", section: "B", code: "B3", description: "B3. Over/Underhaul For Limonite", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Limonite - over/underhaul", 0.526, true) },
    { id: "B4", section: "B", code: "B4", description: "B4. Over/Underhaul For Saprolite", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Saprolite - over/underhaul", 0.526, true) },

    { id: "C1", section: "C", code: "C1", description: "C1. Land Clearing", volume: 0, unit: "m2", baseRateUSD: getSowMasterRate("POS", "Clear & Grub", 0.381, true) },

    { id: "D1", section: "D", code: "D1", description: "D1. OB Removal (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Overburden/Waste", 3.327, true), type: "production" },
    { id: "D2", section: "D", code: "D2", description: "D2. Over/Underhaul For OB Removal (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "OB/Waste - over/underhaul", 0.538, true), type: "overhaul" },
    { id: "D3", section: "D", code: "D3", description: "D3. Top Soil Removal (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Topsoil Removal - Base Rate", 3.380, true), type: "production" },
    { id: "D4", section: "D", code: "D4", description: "D4. Over/Underhaul For Top Soil Removal (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Topsoil Removal - over/underhaul", 0.538, true), type: "overhaul" },
    { id: "D5", section: "D", code: "D5", description: "D5. Limonite (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Limonite - Base Rate", 3.363, true), type: "production" },
    { id: "D6", section: "D", code: "D6", description: "D6. Over/Underhaul For Limonite (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Limonite - over/underhaul", 0.526, true), type: "overhaul" },
    { id: "D7", section: "D", code: "D7", description: "D7. Land Clearing (RF Factor)", volume: 0, unit: "m2", baseRateUSD: getSowMasterRate("POS", "Clear & Grub", 0.381, true), type: "land_clearing" },
    { id: "D8", section: "D", code: "D8", description: "D8. Saprolite (RF Factor)", volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Saprolite - Base Rate", 3.472, true), type: "production" },
    { id: "D9", section: "D", code: "D9", description: "D9. Over/Underhaul For Saprolite (RF)", overhaulMtr: 1000, volume: 0, unit: "Bcm", baseRateUSD: getSowMasterRate("POS", "Saprolite - over/underhaul", 0.526, true), type: "overhaul" },
  ];

  const demoPOSItems = [
    { id: "A1", section: "A", code: "A1", description: "OVER BURDEN REMOVAL", volume: 35918.75, unit: "Bcm", baseRateUSD: 3.327 },
    { id: "A2", section: "A", code: "A2", description: "TOP SOIL REMOVAL", volume: 6527.38, unit: "Bcm", baseRateUSD: 3.380 },
    { id: "A3", section: "A", code: "A3", description: "LIMONITE", volume: 9307.14, unit: "Bcm", baseRateUSD: 3.363 },
    { id: "A4", section: "A", code: "A4", description: "SAPROLITE", volume: 1102.09, unit: "Bcm", baseRateUSD: 3.472 },

    { id: "B1", section: "B", code: "B1", description: "B1. Over/Underhaul For OB Removal", overhaulMtr: 450, volume: 35918.75, unit: "Bcm", baseRateUSD: 0.538 },
    { id: "B2", section: "B", code: "B2", description: "B2. Over/Underhaul For Top Soil Removal", overhaulMtr: 1200, volume: 6527.38, unit: "Bcm", baseRateUSD: 0.538 },
    { id: "B3", section: "B", code: "B3", description: "B3. Over/Underhaul For Limonite", overhaulMtr: 1000, volume: 9307.14, unit: "Bcm", baseRateUSD: 0.526 },
    { id: "B4", section: "B", code: "B4", description: "B4. Over/Underhaul For Saprolite", overhaulMtr: 500, volume: 1102.09, unit: "Bcm", baseRateUSD: 0.526 },

    { id: "C1", section: "C", code: "C1", description: "C1. Land Clearing", volume: 20769.27, unit: "m2", baseRateUSD: 0.381 },

    { id: "D1", section: "D", code: "D1", description: "D1. OB Removal (RF Factor)", volume: 35918.75, unit: "Bcm", baseRateUSD: 3.327, type: "production" },
    { id: "D2", section: "D", code: "D2", description: "D2. Over/Underhaul For OB Removal (RF)", overhaulMtr: 450, volume: 35918.75, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
    { id: "D3", section: "D", code: "D3", description: "D3. Top Soil Removal (RF Factor)", volume: 6527.38, unit: "Bcm", baseRateUSD: 3.380, type: "production" },
    { id: "D4", section: "D", code: "D4", description: "D4. Over/Underhaul For Top Soil Removal (RF)", overhaulMtr: 1200, volume: 6527.38, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
    { id: "D5", section: "D", code: "D5", description: "D5. Limonite (RF Factor)", volume: 9307.14, unit: "Bcm", baseRateUSD: 3.363, type: "production" },
    { id: "D6", section: "D", code: "D6", description: "D6. Over/Underhaul For Limonite (RF)", overhaulMtr: 1000, volume: 9307.14, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
    { id: "D7", section: "D", code: "D7", description: "D7. Land Clearing (RF Factor)", volume: 20769.27, unit: "m2", baseRateUSD: 0.381, type: "land_clearing" },
    { id: "D8", section: "D", code: "D8", description: "D8. Saprolite (RF Factor)", volume: 1102.09, unit: "Bcm", baseRateUSD: 3.472, type: "production" },
    { id: "D9", section: "D", code: "D9", description: "D9. Over/Underhaul For Saprolite (RF)", overhaulMtr: 500, volume: 1102.09, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
  ];

  // 2. BGG Mining (Gambar 2) — Dynamic from SOW Master
  const blankBGGItems = [
    { id: "BGG_A1", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: getSowMasterRate("BGG", "OVER BURDEN REMOVAL 1 (75%) (Feb-26)", 27250) },
    { id: "BGG_A2", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: getSowMasterRate("BGG", "OVER BURDEN REMOVAL 1 (75%) (Jun-26)", 29500) },
    { id: "BGG_A3", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: getSowMasterRate("BGG", "OVER BURDEN REMOVAL 2 (25%) (Feb-26)", 26500) },
    { id: "BGG_A4", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: getSowMasterRate("BGG", "OVER BURDEN REMOVAL 2 (25%) (Jun-26)", 28750) },

    { id: "BGG_B1", section: "B", subSection: "B1. Pit Kungkilan", description: "Pit Kungkilan", period: "Jun-26", volume: 0, unit: "Ton", unitRateIDR: getSowMasterRate("BGG", "Coal Winning Pit Kungkilan", 17500) },

    { id: "BGG_C1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Pit Kungkilan", overhaulMtr: 1232, period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: getSowMasterRate("BGG", "Over Distance For OB Removal (Feb-26)", 1393) },
    { id: "BGG_C2", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Pit Kungkilan", overhaulMtr: 1239, period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: getSowMasterRate("BGG", "Over Distance For OB Removal (Jun-26)", 1550) },
    { id: "BGG_C3", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Pit Kungkilan", overhaulMtr: 4582, period: "Jun-26", volume: 0, unit: "Ton", unitRateIDR: getSowMasterRate("BGG", "Over Distance For Coal Winning (Jun-26)", 19700) },

    { id: "BGG_D1", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: 7467 },
    { id: "BGG_D2", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: 16520 },
    { id: "BGG_D3", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: 7261 },
    { id: "BGG_D4", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: 16100 },
    { id: "BGG_D5", section: "D", subSection: "D2. Over Distance For OB Removal", description: "Pit Kungkilan", period: "Feb-26", volume: 0, unit: "Bcm", unitRateIDR: 382 },
    { id: "BGG_D6", section: "D", subSection: "D2. Over Distance For OB Removal", description: "Pit Kungkilan", period: "Jun-26", volume: 0, unit: "Bcm", unitRateIDR: 868 },
    { id: "BGG_D7", section: "D", subSection: "D3. Coal Winning", description: "Pit Kungkilan", period: "Jun-26", volume: 0, unit: "Ton", unitRateIDR: 9800 },
    { id: "BGG_D8", section: "D", subSection: "D4. Over Distance For Coal Winning", description: "Pit Kungkilan", period: "Jun-26", volume: 0, unit: "Ton", unitRateIDR: 11032 },

    { id: "BGG_E1", section: "E", description: "E.1 Overdistance for OB Removal", amount: -96363648, isDeduction: true },
    { id: "BGG_E2", section: "E", description: "E.2 Overdistance for Coal Winning", amount: -229913035, isDeduction: true },
    { id: "BGG_E3", section: "E", description: "E.3 Raise & Fall's Overdistance for OB Removal", amount: -44360682, isDeduction: true },
    { id: "BGG_E4", section: "E", description: "E.4 Raise & Fall's Overdistance for Coal Winning", amount: -128751300, isDeduction: true },

    { id: "BGG_F1", section: "F", description: "F.1 Fuel & Transport PI JUNI 26", amount: -3749363200, isDeduction: true },
  ];

  const demoBGGItems = [
    { id: "BGG_A1", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", volume: 36168.37, unit: "Bcm", unitRateIDR: 27250 },
    { id: "BGG_A2", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", volume: 121490.00, unit: "Bcm", unitRateIDR: 29500 },
    { id: "BGG_A3", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", volume: 12056.12, unit: "Bcm", unitRateIDR: 26500 },
    { id: "BGG_A4", section: "A", subSection: "A1. Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", volume: 40496.67, unit: "Bcm", unitRateIDR: 28750 },

    { id: "BGG_B1", section: "B", subSection: "B1. Pit Kungkilan", description: "Pit Kungkilan", period: "Jun-26", volume: 46683.48, unit: "Ton", unitRateIDR: 17500 },

    { id: "BGG_C1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Pit Kungkilan", overhaulMtr: 1232, period: "Feb-26", volume: 48224.49, unit: "Bcm", unitRateIDR: 1393 },
    { id: "BGG_C2", section: "C", subSection: "C1. Over Distance For OB Removal", description: "Pit Kungkilan", overhaulMtr: 1239, period: "Jun-26", volume: 161986.66, unit: "Bcm", unitRateIDR: 1550 },
    { id: "BGG_C3", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "Pit Kungkilan", overhaulMtr: 4582, period: "Jun-26", volume: 46683.48, unit: "Ton", unitRateIDR: 19700 },

    { id: "BGG_D1", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Feb-26", volume: 36168.37, unit: "Bcm", unitRateIDR: 7467 },
    { id: "BGG_D2", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 1 (75%)", period: "Jun-26", volume: 121490.00, unit: "Bcm", unitRateIDR: 16520 },
    { id: "BGG_D3", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Feb-26", volume: 12056.12, unit: "Bcm", unitRateIDR: 7261 },
    { id: "BGG_D4", section: "D", subSection: "D1. OB Removal Pit Kungkilan", description: "OVER BURDEN REMOVAL 2 (25%)", period: "Jun-26", volume: 40496.67, unit: "Bcm", unitRateIDR: 16100 },
    { id: "BGG_D5", section: "D", subSection: "D2. Over Distance For OB Removal", description: "Pit Kungkilan", period: "Feb-26", volume: 48224.49, unit: "Bcm", unitRateIDR: 382 },
    { id: "BGG_D6", section: "D", subSection: "D2. Over Distance For OB Removal", description: "Pit Kungkilan", period: "Jun-26", volume: 161986.66, unit: "Bcm", unitRateIDR: 868 },
    { id: "BGG_D7", section: "D", subSection: "D3. Coal Winning", description: "Pit Kungkilan", period: "Jun-26", volume: 46683.48, unit: "Ton", unitRateIDR: 9800 },
    { id: "BGG_D8", section: "D", subSection: "D4. Over Distance For Coal Winning", description: "Pit Kungkilan", period: "Jun-26", volume: 46683.48, unit: "Ton", unitRateIDR: 11032 },

    { id: "BGG_E1", section: "E", description: "E.1 Overdistance for OB Removal", amount: -96363648, isDeduction: true },
    { id: "BGG_E2", section: "E", description: "E.2 Overdistance for Coal Winning", amount: -229913035, isDeduction: true },
    { id: "BGG_E3", section: "E", description: "E.3 Raise & Fall's Overdistance for OB Removal", amount: -44360682, isDeduction: true },
    { id: "BGG_E4", section: "E", description: "E.4 Raise & Fall's Overdistance for Coal Winning", amount: -128751300, isDeduction: true },

    { id: "BGG_F1", section: "F", description: "F.1 Fuel & Transport PI JUNI 26", amount: -3749363200, isDeduction: true },
  ];

  // 3. DBK Mining (Gambar 3 - Dual Currency USD & IDR) — Dynamic from SOW Master
  const blankDBKItems = [
    { id: "DBK_A1", section: "A", subSection: "A1. PIT SAPAN", description: "OVER BURDEN REMOVAL", volume: 0, unit: "Bcm", unitRateUSD: getSowMasterRate("DBK", "PIT SAPAN OB Removal", 1.831, true), kursBI: 17140.76 },
    { id: "DBK_B1", section: "B", subSection: "B1. PIT SAPAN", description: "COAL WINNING", volume: 0, unit: "Ton", unitRateUSD: getSowMasterRate("DBK", "PIT SAPAN Coal Winning", 0.887, true), kursBI: 17140.76 },
    { id: "DBK_C1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "PIT SAPAN", overhaulMtr: 957, baseMtr: 1000, volume: 0, unit: "Bcm", unitRateIDR: getSowMasterRate("DBK", "PIT SAPAN Overhaul OB", 296.86) },
    { id: "DBK_C2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "PIT SAPAN", overhaulMtr: 3682, baseMtr: 3000, volume: 0, unit: "Ton", unitRateIDR: getSowMasterRate("DBK", "PIT SAPAN Overhaul Coal", 1042.84) },
  ];

  const demoDBKItems = [
    { id: "DBK_A1", section: "A", subSection: "A1. PIT SAPAN", description: "OVER BURDEN REMOVAL", volume: 199108.568, unit: "Bcm", unitRateUSD: 1.490, kursBI: 17140.76 },
    { id: "DBK_B1", section: "B", subSection: "B1. PIT SAPAN", description: "COAL WINNING", volume: 18816.190, actualVolume: 28633.341, unit: "Ton", unitRateUSD: 0.840, kursBI: 17140.76 },
    { id: "DBK_C1", section: "C", subSection: "C1. Over Distance For OB Removal", description: "PIT SAPAN", overhaulMtr: 956.680, baseMtr: 1000, volume: 0, unit: "Bcm", unitRateIDR: 0 },
    { id: "DBK_C2", section: "C", subSection: "C2. Over Distance For Coal Winning", description: "PIT SAPAN", overhaulMtr: 3681.60, baseMtr: 3000, volume: 195165.425, unit: "Ton", unitRateIDR: 230.00 },
  ];

  // 4. SBS Mining (Gambar 4 - Area Kerja & Jasa Penunjang Hours & Pengurang) — Dynamic from SOW Master
  const blankSBSItems = [
    { id: "SBS_A1", section: "A", description: "PIT E - DISPOSAL SEKATAN", volume: 0, unit: "BCM", unitRateIDR: getSowMasterRate("SBS", "PIT E - DISPOSAL SEKATAN", 22654) },
    { id: "SBS_A2", section: "A", description: "PIT E - RENCANA JALAN", volume: 0, unit: "BCM", unitRateIDR: getSowMasterRate("SBS", "PIT E - RENCANA JALAN", 12638) },
    { id: "SBS_A3", section: "A", description: "PIT E - RENCANA CSA", volume: 0, unit: "BCM", unitRateIDR: getSowMasterRate("SBS", "PIT E - RENCANA CSA", 8346) },
    { id: "SBS_A4", section: "A", description: "PIT E - JALAN BARITO", volume: 0, unit: "BCM", unitRateIDR: getSowMasterRate("SBS", "PIT E - JALAN BARITO", 15500) },
    { id: "SBS_A5", section: "A", description: "PIT E - SEKATAN", volume: 0, unit: "BCM", unitRateIDR: getSowMasterRate("SBS", "PIT E - SEKATAN", 16931) },
    { id: "SBS_A6", section: "A", description: "PIT E - TS MAHONI", volume: 0, unit: "BCM", unitRateIDR: getSowMasterRate("SBS", "PIT E - TS MAHONI", 22654) },
    { id: "SBS_A7", section: "A", description: "PIT E - IPD WARWEFILL", volume: 0, unit: "BCM", unitRateIDR: getSowMasterRate("SBS", "PIT E - IPD WARWEFILL", 8346) },
    { id: "SBS_A8", section: "A", description: "PIT E - SEKATAN", volume: 0, unit: "BCM", unitRateIDR: getSowMasterRate("SBS", "PIT E - SEKATAN", 19375) },

    { id: "SBS_B1", section: "B", description: "Dozer CAT D10 - BDCT 1001", volume: 0, unit: "Hours", unitRateIDR: getSowMasterRate("SBS", "Dozer CAT D10", 1980000) },
    { id: "SBS_B2", section: "B", description: "Dozer CAT D10 - BDCT 1002", volume: 0, unit: "Hours", unitRateIDR: getSowMasterRate("SBS", "Dozer CAT D10", 1980000) },
    { id: "SBS_B3", section: "B", description: "Excavator CAT 395 - EXCT 3901", volume: 0, unit: "Hours", unitRateIDR: getSowMasterRate("SBS", "Excavator CAT 395", 1425000) },
    { id: "SBS_B4", section: "B", description: "Excavator CAT 395 - EXCT 3902", volume: 0, unit: "Hours", unitRateIDR: getSowMasterRate("SBS", "Excavator CAT 395", 1425000) },

    { id: "SBS_P1", section: "P", description: "1. Denda Ketidaktercapaian MA", unit: "Hours", amount: -191073864, isDeduction: true },
    { id: "SBS_P2", section: "P", description: "2. Kelebihan Pemakaian BBM Loader", unit: "", amount: 0, isDeduction: true },
    { id: "SBS_P3", section: "P", description: "3. Kelebihan Pemakaian BBM Hauler", unit: "", amount: -520428670, isDeduction: true },
    { id: "SBS_P4", section: "P", description: "4. Denda ketidakcapaian volume April 2025 - Juni 2026", unit: "", amount: -60674886, isDeduction: true },
  ];

  const demoSBSItems = [
    { id: "SBS_A1", section: "A", description: "PIT E - DISPOSAL SEKATAN", volume: 80114.79, unit: "BCM", unitRateIDR: 22654 },
    { id: "SBS_A2", section: "A", description: "PIT E - RENCANA JALAN", volume: 23741.16, unit: "BCM", unitRateIDR: 12638 },
    { id: "SBS_A3", section: "A", description: "PIT E - RENCANA CSA", volume: 442.24, unit: "BCM", unitRateIDR: 8346 },
    { id: "SBS_A4", section: "A", description: "PIT E - JALAN BARITO", volume: 33726.42, unit: "BCM", unitRateIDR: 15500 },
    { id: "SBS_A5", section: "A", description: "PIT E - SEKATAN", volume: 110582.62, unit: "BCM", unitRateIDR: 16931 },
    { id: "SBS_A6", section: "A", description: "PIT E - TS MAHONI", volume: 1536.19, unit: "BCM", unitRateIDR: 22654 },
    { id: "SBS_A7", section: "A", description: "PIT E - IPD WARWEFILL", volume: 3840.48, unit: "BCM", unitRateIDR: 8346 },
    { id: "SBS_A8", section: "A", description: "PIT E - SEKATAN", volume: 1154.75, unit: "BCM", unitRateIDR: 19375 },

    { id: "SBS_B1", section: "B", description: "Dozer CAT D10 - BDCT 1001", volume: 250.70, unit: "Hours", unitRateIDR: 1980000 },
    { id: "SBS_B2", section: "B", description: "Dozer CAT D10 - BDCT 1002", volume: 298.40, unit: "Hours", unitRateIDR: 1980000 },
    { id: "SBS_B3", section: "B", description: "Excavator CAT 395 - EXCT 3901", volume: 386.30, unit: "Hours", unitRateIDR: 1425000 },
    { id: "SBS_B4", section: "B", description: "Excavator CAT 395 - EXCT 3902", volume: 400.60, unit: "Hours", unitRateIDR: 1425000 },

    { id: "SBS_P1", section: "P", description: "1. Denda Ketidaktercapaian MA", unit: "Hours", amount: -191073864, isDeduction: true },
    { id: "SBS_P2", section: "P", description: "2. Kelebihan Pemakaian BBM Loader", unit: "", amount: 0, isDeduction: true },
    { id: "SBS_P3", section: "P", description: "3. Kelebihan Pemakaian BBM Hauler", unit: "", amount: -520428670, isDeduction: true },
    { id: "SBS_P4", section: "P", description: "4. Denda ketidakcapaian volume April 2025 - Juni 2026", unit: "", amount: -60674886, isDeduction: true },
  ];

  const defaultPOSBAOperatingItems = [
    { id: "ba_op1", category: "Operating & Mining", area: "WM1", material: "Top Soil", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 60500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_op2", category: "Operating & Mining", area: "WM1", material: "Saprolite", unit: "WMT", initialVolume: 0, adjustedVolume: 0, rate: 62200, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_op3", category: "Operating & Mining", area: "WM1", material: "Limonite", unit: "WMT", initialVolume: 0, adjustedVolume: 0, rate: 60200, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_op4", category: "Operating & Mining", area: "WM1", material: "Overburden/ Waste", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 59500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_dist1", category: "Over Distance", area: "WM1", material: "Over/Underhaul For OB Removal", unit: "BCM", parentMaterial: "Overburden/ Waste", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_dist2", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Top Soil Removal", unit: "BCM", parentMaterial: "Top Soil", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8608, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_dist3", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Limonite", unit: "BCM", parentMaterial: "Limonite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_dist4", category: "Over Distance", area: "WM1", material: "Over/Underhaul For Saprolite", unit: "BCM", parentMaterial: "Saprolite", distanceWeightAvg: 1000, initialVolume: 0, adjustedVolume: 0, rate: 8416, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  ];

  const defaultPOSBAMDOItems = [
    { id: "ba_mdo1", category: "MDO", area: "Site POS", material: "Mine Development (MDO) - Clearing & Access Road", unit: "Ha", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 15500000, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "ba_mdo2", category: "MDO", area: "Site POS", material: "Rocks for construction - under/overhaul", unit: "USD/1KM", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 9450, subtotalInitial: 0, subtotalAdjusted: 0 },
  ];

  const defaultBGGBAItems = [
    { id: "bgg_op1", category: "Operating & Mining", area: "Pit KKL", material: "Volume Overburden (OB)", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 29500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "bgg_op2", category: "Operating & Mining", area: "Pit KKL", material: "Volume Batubara (Coal)", unit: "BCM", initialVolume: 0, adjustedVolume: 0, rate: 17500, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "bgg_dist1", category: "Over Distance", area: "Pit KKL", material: "Distance / Overhaul For OB Removal", unit: "Bcm.Hm", parentMaterial: "Volume Overburden (OB)", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 155, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
    { id: "bgg_dist2", category: "Over Distance", area: "Pit KKL", material: "Distance / Overhaul For Coal Winning", unit: "BCM", parentMaterial: "Volume Batubara (Coal)", distanceWeightAvg: 0, initialVolume: 0, adjustedVolume: 0, rate: 19700, isDistanceVar: true, subtotalInitial: 0, subtotalAdjusted: 0 },
  ];

  const [baOperatingItems, setBaOperatingItems] = useState<any[]>(defaultPOSBAOperatingItems);
  const [baMDOItems, setBaMDOItems] = useState<any[]>(defaultPOSBAMDOItems);
  const [activeBAStep, setActiveBAStep] = useState<number>(1);
  const [showAddRowDropdown, setShowAddRowDropdown] = useState<boolean>(false);
  const [posInvoiceCategory, setPosInvoiceCategory] = useState<"Operation & Mining" | "MDO">("Operation & Mining");

  const [invLineItems, setInvLineItems] = useState<any[]>(blankPOSItems);
  const [selectedVarA, setSelectedVarA] = useState("");
  const [selectedVarB, setSelectedVarB] = useState("");
  const [selectedVarC, setSelectedVarC] = useState("");
  const [selectedVarD, setSelectedVarD] = useState("");
  const [selectedVarE, setSelectedVarE] = useState("");
  const [selectedVarF, setSelectedVarF] = useState("");
  const [selectedVarP, setSelectedVarP] = useState("");

  const addVariableToSection = (section: string, code: string) => {
    if (!code) return;
    const opt = masterVariableOptions.find(o => o.code === code);
    if (!opt) return;

    const newItem = {
      id: `SOW_${Date.now()}`,
      section,
      code: opt.code,
      description: `${section}.${invLineItems.filter(i => i.section === section).length + 1} ${opt.name}`,
      volume: 0,
      unit: opt.unit,
      baseRateUSD: opt.baseRateUSD,
      unitRateIDR: opt.rateIDR || Math.round((opt.baseRateUSD || 1) * mRate),
      overhaulMtr: opt.overhaulMtr || 1000,
      type: section === "D" && opt.code.includes("OVERHAUL") ? "overhaul" : section === "D" && opt.code.includes("CLEARING") ? "land_clearing" : "production"
    };

    setInvLineItems(prev => [...prev, newItem]);
    if (section === "A") setSelectedVarA("");
    if (section === "B") setSelectedVarB("");
    if (section === "C") setSelectedVarC("");
    if (section === "D") setSelectedVarD("");
    if (section === "E") setSelectedVarE("");
    if (section === "F") setSelectedVarF("");
    if (section === "P") setSelectedVarP("");
  };

  const customerContractMap: Record<string, { project: string; contract: string; noPO?: string; bankName?: string; bankAccountNo?: string; bankBranch?: string; directorName?: string; directorTitle?: string }> = {
    POS: {
      project: "POS PROJECT",
      contract: "002/POS-AAP/2025",
      bankName: "Bank BNI",
      bankAccountNo: "8188788882",
      bankBranch: "Harmoni, Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    },
    BGG: {
      project: "BGG MINING PROJECT",
      contract: "001/BGG-AAP/2025",
      bankName: "Bank Mandiri",
      bankAccountNo: "070-00-2888000-8",
      bankBranch: "Plaza Mandiri Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    },
    DBK: {
      project: "DBK MINING PROJECT",
      contract: "011/AAP-PTRO/IV/2026",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "CHRISTIANTO CITRA",
      directorTitle: "DIRECTOR"
    },
    SBS: {
      project: "SBS - Tanjung Enim",
      contract: "SPPH-05852",
      noPO: "I05790/0002",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIREKTUR UTAMA"
    },
    ABN: {
      project: "PT Andalan Bhumi Nusantara Site",
      contract: "005/ABN-AAP/2025",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    }
  };

  const handleCompanySelect = (code: string) => {
    const mapMatch = customerContractMap[code];
    const cust = customerRows.find((c: any) => c.code === code);

    // Auto-switch template item list based on customer
    if (code === "BGG") setInvLineItems(blankBGGItems);
    else if (code === "DBK") setInvLineItems(blankDBKItems);
    else if (code === "SBS") setInvLineItems(blankSBSItems);
    else setInvLineItems(blankPOSItems);

    setFormData((prev: any) => {
      const period = prev.workPeriod || "Juni 2026";
      const autoInvNo = generateInvoiceNumber(code, period, invoiceRows.length);
      return {
        ...prev,
        customerCode: code,
        projectSite: mapMatch?.project || cust?.projectSite || (cust ? `${cust.fullName} Site` : ""),
        contractNo: mapMatch?.contract || cust?.contractNo || (cust ? `001/${cust.code}-AAP/2026` : ""),
        noPO: mapMatch?.noPO || prev.noPO || "",
        bankName: mapMatch?.bankName || prev.bankName || "Bank BNI",
        bankAccountNo: mapMatch?.bankAccountNo || prev.bankAccountNo || "8188788882",
        bankBranch: mapMatch?.bankBranch || prev.bankBranch || "Harmoni, Jakarta",
        directorName: mapMatch?.directorName || "GAHARI CHRISTINE",
        directorTitle: mapMatch?.directorTitle || "DIRECTOR",
        invoiceNo: autoInvNo
      };
    });
  };

  const loadDemoPOSData = () => {
    setFormData({
      customerCode: "POS",
      invoiceNo: "003/POS-AAP/RF/VI/2026",
      workPeriod: "Juni 2026",
      projectSite: "POS PROJECT",
      contractNo: "002/POS-AAP/2025",
      bankName: "Bank BNI",
      bankAccountNo: "8188788882",
      bankBranch: "Harmoni, Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    });
    setInvLineItems(demoPOSItems);
    onNotice("⚡ Sampel data POS Mining (Juni 2026) berhasil dimuat!");
  };

  const loadDemoBGGData = () => {
    setFormData({
      customerCode: "BGG",
      invoiceNo: "091/BGG-AAP/VI/2026",
      workPeriod: "1-30 JUN 26",
      projectSite: "BGG MINING PROJECT",
      contractNo: "001/BGG-AAP/2025",
      bankName: "Bank Mandiri",
      bankAccountNo: "070-00-2888000-8",
      bankBranch: "Plaza Mandiri Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIRECTOR"
    });
    setInvLineItems(demoBGGItems);
    onNotice("⚡ Sampel data BGG Mining (Juni 2026 - Gambar 2) berhasil dimuat!");
  };

  const loadDemoDBKData = () => {
    setFormData({
      customerCode: "DBK",
      invoiceNo: "011/AAP-PTRO/IV/2026",
      workPeriod: "01 - 30 APRIL 26",
      projectSite: "DBK MINING PROJECT",
      contractNo: "011/AAP-PTRO/IV/2026",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "CHRISTIANTO CITRA",
      directorTitle: "DIRECTOR"
    });
    setInvLineItems(demoDBKItems);
    onNotice("⚡ Sampel data DBK Petrosea Mining (Gambar 3) berhasil dimuat!");
  };

  const loadDemoSBSData = () => {
    setFormData({
      customerCode: "SBS",
      invoiceNo: "019/SBS-AAP/VI/2026",
      workPeriod: "01 - 30 JUNI 2026",
      projectSite: "SBS - Tanjung Enim",
      contractNo: "SPPH-05852",
      noPO: "I05790/0002",
      bankName: "Bank BRI",
      bankAccountNo: "0417-01-880088-30-8",
      bankBranch: "S. Parman - Slipi Jakarta",
      directorName: "GAHARI CHRISTINE",
      directorTitle: "DIREKTUR UTAMA"
    });
    setInvLineItems(demoSBSItems);
    onNotice("⚡ Sampel data SBS Mining (Gambar 4) berhasil dimuat!");
  };

  const removeInvLineItem = (idToRemove: string) => {
    setInvLineItems(prev => prev.filter(item => item.id !== idToRemove));
  };

  const updateInvItemVolume = (id: string, vol: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, volume: vol } : item));
  };

  const updateInvItemOverhaul = (id: string, mtr: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, overhaulMtr: mtr } : item));
  };

  const updateInvItemRateIDR = (id: string, rate: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, unitRateIDR: rate } : item));
  };

  const updateInvItemRateUSD = (id: string, rate: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, unitRateUSD: rate } : item));
  };

  const updateInvItemKurs = (id: string, kurs: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, kursBI: kurs } : item));
  };

  const updateInvItemAmount = (id: string, amt: number) => {
    setInvLineItems(prev => prev.map(item => item.id === id ? { ...item, amount: amt } : item));
  };

  const getItemEffectiveVolume = (item: any) => {
    if (!item) return 0;
    if (formData.customerCode === "POS") {
      if (item.section === "B") {
        if (item.code === "B1" || item.description.includes("OB Removal")) {
          const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A1" || i.description.includes("OVER BURDEN")));
          if (itemA) return itemA.volume || 0;
        }
        if (item.code === "B2" || item.description.includes("Top Soil")) {
          const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A2" || i.description.includes("TOP SOIL")));
          if (itemA) return itemA.volume || 0;
        }
        if (item.code === "B3" || item.description.includes("Limonite")) {
          const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A3" || i.description.includes("LIMONITE")));
          if (itemA) return itemA.volume || 0;
        }
        if (item.code === "B4" || item.description.includes("Saprolite")) {
          const itemA = invLineItems.find(i => i.section === "A" && (i.code === "A4" || i.description.includes("SAPROLITE")));
          if (itemA) return itemA.volume || 0;
        }
      }
      if (item.section === "D") {
        if (item.code === "D1" || item.description.startsWith("D1.")) return (invLineItems.find(i => i.code === "A1")?.volume || 0);
        if (item.code === "D2" || item.description.startsWith("D2.")) return (invLineItems.find(i => i.code === "A1")?.volume || 0);
        if (item.code === "D3" || item.description.startsWith("D3.")) return (invLineItems.find(i => i.code === "A2")?.volume || 0);
        if (item.code === "D4" || item.description.startsWith("D4.")) return (invLineItems.find(i => i.code === "A2")?.volume || 0);
        if (item.code === "D5" || item.description.startsWith("D5.")) return (invLineItems.find(i => i.code === "A3")?.volume || 0);
        if (item.code === "D6" || item.description.startsWith("D6.")) return (invLineItems.find(i => i.code === "A3")?.volume || 0);
        if (item.code === "D7" || item.description.startsWith("D7.")) return (invLineItems.find(i => i.section === "C")?.volume || item.volume || 0);
        if (item.code === "D8" || item.description.startsWith("D8.")) return (invLineItems.find(i => i.code === "A4")?.volume || 0);
        if (item.code === "D9" || item.description.startsWith("D9.")) return (invLineItems.find(i => i.code === "A4")?.volume || 0);
      }
    }
    return item.volume || 0;
  };

  const getItemEffectiveOverhaulMtr = (item: any) => {
    if (!item) return 1000;
    if (formData.customerCode === "POS") {
      if (item.section === "D") {
        if (item.code === "D2" || item.description.startsWith("D2.")) return (invLineItems.find(i => i.code === "B1")?.overhaulMtr ?? 1000);
        if (item.code === "D4" || item.description.startsWith("D4.")) return (invLineItems.find(i => i.code === "B2")?.overhaulMtr ?? 1000);
        if (item.code === "D6" || item.description.startsWith("D6.")) return (invLineItems.find(i => i.code === "B3")?.overhaulMtr ?? 1000);
        if (item.code === "D9" || item.description.startsWith("D9.")) return (invLineItems.find(i => i.code === "B4")?.overhaulMtr ?? 1000);
      }
    }
    return item.overhaulMtr ?? (item.baseMtr ?? 1000);
  };

  const calculateItemRateAndAmount = (item: any, currentCust?: string) => {
    const cust = currentCust || formData.customerCode || "POS";
    const rfFactor = rfIndexCalculated - 1;
    const vol = getItemEffectiveVolume(item);
    const mtr = getItemEffectiveOverhaulMtr(item);

    let unitRate = 0;
    let amount = 0;

    // Explicit amount item (e.g. Discounts / Deductions)
    if (item.amount !== undefined && item.amount !== null && item.amount !== 0) {
      return { unitRate: 0, amount: item.amount };
    }

    // Customer: DBK (Dual Currency USD to IDR)
    if (cust === "DBK") {
      if (item.unitRateUSD && item.kursBI) {
        unitRate = Math.round(item.unitRateUSD * item.kursBI);
        amount = Math.round(vol * item.unitRateUSD * item.kursBI);
      } else if (item.unitRateIDR) {
        unitRate = item.unitRateIDR;
        amount = Math.round(vol * unitRate);
      }
      return { unitRate, amount };
    }

    // Customer: BGG or SBS with explicit unitRateIDR
    if (item.unitRateIDR !== undefined) {
      unitRate = item.unitRateIDR;
      amount = Math.round(vol * unitRate);
      return { unitRate, amount };
    }

    // Customer: POS (Formula USD * mRate & RF Index)
    if (item.section === "A") {
      unitRate = Math.round((item.baseRateUSD || 0) * mRate);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "B") {
      const effMtr = (mtr - 1000) / 1000;
      unitRate = Math.round(effMtr * (item.baseRateUSD || 0) * mRate);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "C") {
      unitRate = Math.round((item.baseRateUSD || 0) * mRate);
      amount = Math.round(vol * unitRate);
    } else if (item.section === "D") {
      if (item.type === "overhaul" || item.description.toLowerCase().includes("overhaul")) {
        const effMtr = (mtr - 1000) / 1000;
        const baseRateIDR = Math.round(effMtr * (item.baseRateUSD || 0) * mRate);
        unitRate = Math.round(baseRateIDR * rfFactor);
        amount = Math.round(vol * unitRate);
      } else {
        const baseRateIDR = Math.round((item.baseRateUSD || 0) * mRate);
        unitRate = Math.round(baseRateIDR * rfFactor);
        amount = Math.round(vol * unitRate);
      }
    }

    return { unitRate, amount };
  };

  const getCustomerCalculations = (itemsList: any[], custCode?: string) => {
    const cust = custCode || formData.customerCode || "POS";
    const subA = itemsList.filter(i => i.section === "A").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subB = itemsList.filter(i => i.section === "B").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subC = itemsList.filter(i => i.section === "C").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subD = itemsList.filter(i => i.section === "D").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subE = itemsList.filter(i => i.section === "E").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subF = itemsList.filter(i => i.section === "F").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);
    const subP = itemsList.filter(i => i.section === "P").reduce((sum, i) => sum + calculateItemRateAndAmount(i, cust).amount, 0);

    let totalGross = 0;
    let dpp11_12 = 0;
    let vat12 = 0;
    let pph23 = 0;
    let totalInvoice = 0;
    let totalDibayar = 0;

    if (cust === "BGG") {
      // Total = A + B + C + D + E (deduction) + F (deduction)
      totalGross = subA + subB + subC + subD + subE + subF;
      dpp11_12 = Math.round(totalGross * 11 / 12);
      vat12 = Math.round(dpp11_12 * 0.12);
      pph23 = Math.round(totalGross * 0.02);
      totalInvoice = dpp11_12 + vat12 - pph23;
      totalDibayar = totalInvoice;
    } else if (cust === "DBK") {
      totalGross = subA + subB + subC;
      dpp11_12 = Math.round(totalGross * 11 / 12);
      vat12 = Math.round(dpp11_12 * 0.12);
      pph23 = Math.round(totalGross * 0.02);
      totalInvoice = totalGross + vat12 - pph23;
      totalDibayar = totalInvoice;
    } else if (cust === "SBS") {
      // Total Operational = A (OB) + B (Jasa Penunjang)
      totalGross = subA + subB;
      dpp11_12 = Math.round(totalGross * 11 / 12);
      vat12 = Math.round(dpp11_12 * 0.12);
      pph23 = Math.round(totalGross * 0.02);
      totalInvoice = totalGross + vat12 - pph23;
      const totalPengurang = Math.abs(subP);
      totalDibayar = totalInvoice - totalPengurang;
    } else {
      // POS
      totalGross = subA + subB + subC + subD;
      dpp11_12 = Math.round(totalGross * 11 / 12);
      vat12 = Math.round(dpp11_12 * 0.12);
      pph23 = Math.round(totalGross * 0.02);
      totalInvoice = dpp11_12 + vat12 - pph23;
      totalDibayar = totalInvoice;
    }

    return {
      subtotalA: subA,
      subtotalB: subB,
      subtotalC: subC,
      subtotalD: subD,
      subtotalE: subE,
      subtotalF: subF,
      subtotalP: subP,
      totalGross,
      dpp11_12,
      vat12,
      pph23,
      totalInvoice,
      totalDibayar
    };
  };

  const calcs = getCustomerCalculations(invLineItems, formData.customerCode);
  const subtotalA = calcs.subtotalA;
  const subtotalB = calcs.subtotalB;
  const subtotalC = calcs.subtotalC;
  const subtotalD = calcs.subtotalD;
  const subtotalE = calcs.subtotalE;
  const subtotalF = calcs.subtotalF;
  const subtotalP = calcs.subtotalP;
  const totalGrossCalc = calcs.totalGross;
  const dpp11_12Calc = calcs.dpp11_12;
  const vat12Calc = calcs.vat12;
  const pph23Calc = calcs.pph23;
  const netTotalInvoiceCalc = calcs.totalInvoice;
  const totalDibayarCalc = calcs.totalDibayar;

  const exportPaymentDetailPDF = (itemData: any) => {
    const printWin = window.open("", "_blank", "width=1000,height=800");
    if (!printWin) return;

    const custCode = itemData?.customerCode || formData.customerCode || "POS";
    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const logoUrl = `${window.location.origin}/andalan-logo.png`;
    const c = getCustomerCalculations(invLineItems, custCode);
    const contractInfo = customerContractMap[custCode];

    let tableBodyHTML = "";
    let totalsFooterHTML = "";
    let noteHTML = "";

    if (custCode === "BGG") {
      // BGG Table Layout (Gambar 2)
      const secAItems = invLineItems.filter(i => i.section === "A");
      const secBItems = invLineItems.filter(i => i.section === "B");
      const secCItems = invLineItems.filter(i => i.section === "C");
      const secDItems = invLineItems.filter(i => i.section === "D");
      const secEItems = invLineItems.filter(i => i.section === "E");
      const secFItems = invLineItems.filter(i => i.section === "F");

      const volA = secAItems.reduce((s, i) => s + (i.volume || 0), 0);
      const volB = secBItems.reduce((s, i) => s + (i.volume || 0), 0);

      tableBodyHTML = `
        <tr class="sec-hdr">
          <td>A. OB REMOVAL</td>
          <td class="text-center font-mono">${volA.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td class="text-center">Bcm</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalA.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="5" style="font-weight: bold; padding-left: 10px; background: #fafafa;">A1. Pit Kungkilan</td></tr>
        ${secAItems.map(i => `
          <tr>
            <td style="padding-left: 20px;">${i.description} &nbsp; &nbsp; <span style="font-size: 8.5px; color: #475569;">${i.period || ""}</span></td>
            <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${i.unit || "Bcm"}</td>
            <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}

        <tr class="sec-hdr">
          <td>B. COAL WINNING</td>
          <td class="text-center font-mono">${volB.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td class="text-center">Ton</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalB.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="5" style="font-weight: bold; padding-left: 10px; background: #fafafa;">B1. Pit Kungkilan</td></tr>
        ${secBItems.map(i => `
          <tr>
            <td style="padding-left: 20px;">${i.description}</td>
            <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${i.unit || "Ton"}</td>
            <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}

        <tr class="sec-hdr">
          <td>C. OVER DISTANCE</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalC.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="5" style="font-weight: bold; padding-left: 10px; background: #fafafa;">C1. Over Distance For OB Removal</td></tr>
        ${secCItems.filter(i => i.subSection?.includes("OB")).map(i => {
          const diffMtr = (i.overhaulMtr || 1000) - 1000;
          return `
            <tr>
              <td style="padding-left: 20px;">
                Pit Kungkilan<br/>
                <span style="font-size: 8.5px; color: #475569;">${(i.overhaulMtr/1000).toFixed(3)} mtr - 1000 mtr = ${diffMtr} mtr &nbsp; &nbsp; ${i.period || ""}</span>
              </td>
              <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
              <td class="text-center">${i.unit || "Bcm"}</td>
              <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
              <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
            </tr>
          `;
        }).join("")}
        <tr><td colspan="5" style="font-weight: bold; padding-left: 10px; background: #fafafa;">C2. Over Distance For Coal Winning</td></tr>
        ${secCItems.filter(i => !i.subSection?.includes("OB")).map(i => {
          const diffMtr = (i.overhaulMtr || 1000) - 1000;
          return `
            <tr>
              <td style="padding-left: 20px;">
                Pit Kungkilan<br/>
                <span style="font-size: 8.5px; color: #475569;">${(i.overhaulMtr/1000).toFixed(3)} mtr - 1000 mtr = ${(diffMtr/1000).toFixed(3)} mtr &nbsp; &nbsp; ${i.period || ""}</span>
              </td>
              <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
              <td class="text-center">${i.unit || "Ton"}</td>
              <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
              <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
            </tr>
          `;
        }).join("")}

        <tr class="sec-hdr">
          <td>D. RAISE & FALL'S FACTOR</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalD.toLocaleString("id-ID")}</td>
        </tr>
        ${secDItems.map(i => `
          <tr>
            <td style="padding-left: 20px;">${i.subSection || ""} ${i.description} &nbsp; &nbsp; <span style="font-size: 8.5px; color: #475569;">${i.period || ""}</span></td>
            <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${i.unit || "Bcm"}</td>
            <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}

        <tr class="sec-hdr" style="background: #fee2e2;">
          <td colspan="4">E. DISCOUNT ON OVERDISTANCE</td>
          <td class="text-right font-mono font-black">(${Math.abs(c.subtotalE).toLocaleString("id-ID")})</td>
        </tr>
        ${secEItems.map(i => `
          <tr>
            <td colspan="4" style="padding-left: 20px;">${i.description}</td>
            <td class="text-right font-mono">(${Math.abs(i.amount || 0).toLocaleString("id-ID")})</td>
          </tr>
        `).join("")}

        <tr class="sec-hdr" style="background: #fee2e2;">
          <td colspan="4">F. DP FUEL & TRANSPORT</td>
          <td class="text-right font-mono font-black">(${Math.abs(c.subtotalF).toLocaleString("id-ID")})</td>
        </tr>
        ${secFItems.map(i => `
          <tr>
            <td colspan="4" style="padding-left: 20px;">${i.description}</td>
            <td class="text-right font-mono">(${Math.abs(i.amount || 0).toLocaleString("id-ID")})</td>
          </tr>
        `).join("")}
      `;

      totalsFooterHTML = `
        <tr class="tot-row">
          <td colspan="4"><strong>TOTAL</strong></td>
          <td class="text-right font-mono"><strong>${c.totalGross.toLocaleString("id-ID")}</strong></td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">DPP PPN 11/12</td>
          <td class="text-right font-mono">${c.dpp11_12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">VAT ( 12%)</td>
          <td class="text-right font-mono">${c.vat12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">WITH HOLDING TAX ART 23</td>
          <td class="text-right font-mono">(${c.pph23.toLocaleString("id-ID")})</td>
        </tr>
        <tr class="net-row">
          <td colspan="4"><strong>TOTAL INVOICE</strong></td>
          <td class="text-right net-val"><strong>${c.totalInvoice.toLocaleString("id-ID")}</strong></td>
        </tr>
      `;

      noteHTML = `
        <div class="note-box">
          Note:<br/>
          1. Raise & Fall's Factor Feb 26: <strong>1,274</strong><br/>
          2. Raise & Fall's Factor Juni 26: <strong>1,560</strong>
        </div>
      `;
    } else if (custCode === "DBK") {
      // DBK Table Layout (Gambar 3 - Dual Currency USD & IDR)
      const secAItems = invLineItems.filter(i => i.section === "A");
      const secBItems = invLineItems.filter(i => i.section === "B");
      const secCItems = invLineItems.filter(i => i.section === "C");

      const volA = secAItems.reduce((s, i) => s + (i.volume || 0), 0);
      const volB = secBItems.reduce((s, i) => s + (i.volume || 0), 0);

      tableBodyHTML = `
        <tr class="sec-hdr">
          <td>A. OB REMOVAL</td>
          <td class="text-center font-mono">${volA.toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
          <td class="text-center">Bcm</td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalA.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="6" style="font-weight: bold; padding-left: 10px; background: #fafafa;">A1. PIT SAPAN</td></tr>
        ${secAItems.map(i => `
          <tr>
            <td style="padding-left: 20px;">${i.description}</td>
            <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
            <td class="text-center">${i.unit || "Bcm"}</td>
            <td class="text-right font-mono">${(i.unitRateUSD || 0).toFixed(3)}</td>
            <td class="text-right font-mono">${(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}

        <tr class="sec-hdr">
          <td>B. COAL WINNING</td>
          <td class="text-center font-mono">${volB.toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
          <td class="text-center">Ton</td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalB.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="6" style="font-weight: bold; padding-left: 10px; background: #fafafa;">B1. PIT SAPAN</td></tr>
        ${secBItems.map(i => `
          <tr>
            <td style="padding-left: 20px;">PIT SAPAN</td>
            <td class="text-center font-mono">${(i.actualVolume || i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
            <td class="text-center">${i.unit || "Ton"}</td>
            <td class="text-right font-mono">${(i.unitRateUSD || 0).toFixed(3)}</td>
            <td class="text-right font-mono">${(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}

        <tr class="sec-hdr">
          <td>C. OVER DISTANCE</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalC.toLocaleString("id-ID")}</td>
        </tr>
        ${secCItems.map(i => {
          const baseM = i.baseMtr || 1000;
          const diff = (i.overhaulMtr || baseM) - baseM;
          return `
            <tr>
              <td style="padding-left: 20px;">
                <strong>${i.subSection || ""}</strong><br/>
                PIT SAPAN<br/>
                <span style="font-size: 8.5px; color: #475569;">${(i.overhaulMtr || baseM).toLocaleString("id-ID", { minimumFractionDigits: 2 })} mtr - ${baseM} mtr = ${diff < 0 ? `(${Math.abs(diff).toFixed(2)})` : diff.toFixed(2)} mtr</span>
              </td>
              <td class="text-center font-mono">${i.volume ? i.volume.toLocaleString("id-ID", { minimumFractionDigits: 3 }) : ""}</td>
              <td class="text-center">${i.volume ? (i.unit || "") : ""}</td>
              <td></td>
              <td class="text-right font-mono">${i.unitRateIDR ? i.unitRateIDR.toFixed(2) : ""}</td>
              <td class="text-right font-mono">${i.volume && i.unitRateIDR ? Math.round(i.volume * i.unitRateIDR).toLocaleString("id-ID") : "-"}</td>
            </tr>
          `;
        }).join("")}
      `;

      totalsFooterHTML = `
        <tr class="tot-row">
          <td colspan="5"><strong>TOTAL</strong></td>
          <td class="text-right font-mono"><strong>${c.totalGross.toLocaleString("id-ID")}</strong></td>
        </tr>
        <tr class="tot-row">
          <td colspan="5">DPP PPN 11/12</td>
          <td class="text-right font-mono">${c.dpp11_12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="5">VAT ( 12%)</td>
          <td class="text-right font-mono">${c.vat12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="5">WITH HOLDING TAX ART 23 (2%)</td>
          <td class="text-right font-mono">(${c.pph23.toLocaleString("id-ID")})</td>
        </tr>
        <tr class="net-row">
          <td colspan="5"><strong>TOTAL INVOICE</strong></td>
          <td class="text-right net-val"><strong>${c.totalInvoice.toLocaleString("id-ID")}</strong></td>
        </tr>
      `;
    } else if (custCode === "SBS") {
      // SBS Table Layout (Gambar 4)
      const secAItems = invLineItems.filter(i => i.section === "A");
      const secBItems = invLineItems.filter(i => i.section === "B");
      const secPItems = invLineItems.filter(i => i.section === "P");

      const volA = secAItems.reduce((s, i) => s + (i.volume || 0), 0);
      const volB = secBItems.reduce((s, i) => s + (i.volume || 0), 0);

      tableBodyHTML = `
        <tr class="sec-hdr">
          <td>OB REMOVAL</td>
          <td class="text-center font-mono">${volA.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td class="text-center">UoM</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalA.toLocaleString("id-ID")}</td>
        </tr>
        ${secAItems.map(i => `
          <tr>
            <td style="padding-left: 20px;">${i.description}</td>
            <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${i.unit || "BCM"}</td>
            <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}

        <tr class="sec-hdr">
          <td>JASA PENUNJANG PRODUKSI</td>
          <td class="text-center font-mono">${volB.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td class="text-center">UoM</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalB.toLocaleString("id-ID")}</td>
        </tr>
        ${secBItems.map(i => `
          <tr>
            <td style="padding-left: 20px;">${i.description}</td>
            <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${i.unit || "Hours"}</td>
            <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}
      `;

      totalsFooterHTML = `
        <tr class="tot-row">
          <td colspan="4"><strong>TOTAL</strong></td>
          <td class="text-right font-mono"><strong>${c.totalGross.toLocaleString("id-ID")}</strong></td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">DPP PPN 11/12</td>
          <td class="text-right font-mono">${c.dpp11_12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">VAT ( 12%)</td>
          <td class="text-right font-mono">${c.vat12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">WITH HOLDING TAX ART 23 (2%)</td>
          <td class="text-right font-mono">(${c.pph23.toLocaleString("id-ID")})</td>
        </tr>
        <tr class="net-row">
          <td colspan="4"><strong>TOTAL INVOICE</strong></td>
          <td class="text-right net-val"><strong>${c.totalInvoice.toLocaleString("id-ID")}</strong></td>
        </tr>
      `;

      noteHTML = `
        <div style="margin-top: 10px; margin-bottom: 6px;">
          <table class="main-table">
            <thead>
              <tr style="background: #f8fafc;">
                <th width="45%" style="text-align: left;">Pengurang Pembayaran</th>
                <th width="20%" style="text-align: center;">Claimed Unit</th>
                <th width="15%" style="text-align: right;">Unit Rate (IDR)</th>
                <th width="20%" style="text-align: right;">Amount (IDR)</th>
              </tr>
            </thead>
            <tbody>
              ${secPItems.map(p => `
                <tr>
                  <td>${p.description}</td>
                  <td class="text-center">${p.unit || ""}</td>
                  <td></td>
                  <td class="text-right font-mono font-bold">${p.amount ? `(${Math.abs(p.amount).toLocaleString("id-ID")})` : "-"}</td>
                </tr>
              `).join("")}
              <tr class="net-row" style="background: #ecfdf5; border-top: 2px solid #059669; border-bottom: 2px solid #059669;">
                <td colspan="3"><strong>TOTAL DIBAYAR</strong></td>
                <td class="text-right font-mono" style="font-size: 12.5px; font-weight: 900; color: #047857;">${c.totalDibayar.toLocaleString("id-ID")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else {
      // Default: POS Mining Table Layout (Gambar 1)
      const secAItems = invLineItems.filter(i => i.section === "A");
      const secBItems = invLineItems.filter(i => i.section === "B");
      const secCItems = invLineItems.filter(i => i.section === "C");
      const secDItems = invLineItems.filter(i => i.section === "D");

      const volA = secAItems.reduce((s, i) => s + (i.volume || 0), 0);
      const isMDO = (formData.invoiceCategory === "MDO" || formData.activityGroup?.includes("MDO"));

      const secAHTML = secAItems.length > 0 ? `
        <tr class="sec-hdr">
          <td>${isMDO ? "A. MINE DEVELOPMENT (MDO)" : "A. PRODUCTION"}</td>
          <td class="text-center font-mono">${isMDO ? "" : volA.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td class="text-center">${isMDO ? "" : "Bcm"}</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalA.toLocaleString("id-ID")}</td>
        </tr>
        ${secAItems.map((item, idx) => {
          const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
          const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
          return `<tr>
            <td style="padding-left: 15px;"><strong>A${idx + 1}.</strong> ${cleanDesc}</td>
            <td class="text-center font-mono">${(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${item.unit || "Bcm"}</td>
            <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
            <td class="text-right font-mono"><strong>${amount.toLocaleString("id-ID")}</strong></td>
          </tr>`;
        }).join("")}
      ` : "";

      const secBHTML = secBItems.length > 0 ? `
        <tr class="sec-hdr">
          <td>B. OVER / UNDER DISTANCE</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalB < 0 ? `(${Math.abs(c.subtotalB).toLocaleString("id-ID")})` : c.subtotalB.toLocaleString("id-ID")}</td>
        </tr>
        ${secBItems.map((item, idx) => {
          const effVol = getItemEffectiveVolume(item);
          const effMtr = getItemEffectiveOverhaulMtr(item);
          const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
          const diffMtr = effMtr - 1000;
          const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
          return `<tr>
            <td style="padding-left: 15px;">
              <div><strong>B${idx + 1}.</strong> ${cleanDesc}</div>
              <div style="font-size: 8.5px; color: #64748b;">${effMtr} mtr - 1000 mtr = (${diffMtr}) mtr</div>
            </td>
            <td class="text-center font-mono">${effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${item.unit || "Bcm"}</td>
            <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
            <td class="text-right font-mono"><strong>${amount < 0 ? `(${Math.abs(amount).toLocaleString("id-ID")})` : amount.toLocaleString("id-ID")}</strong></td>
          </tr>`;
        }).join("")}
      ` : "";

      const secCHTML = secCItems.length > 0 ? `
        <tr class="sec-hdr">
          <td>C. LAND CLEARING</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalC.toLocaleString("id-ID")}</td>
        </tr>
        ${secCItems.map((item, idx) => {
          const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
          const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
          return `<tr>
            <td style="padding-left: 15px;"><strong>C${idx + 1}.</strong> ${cleanDesc}</td>
            <td class="text-center font-mono">${(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${item.unit || "m2"}</td>
            <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
            <td class="text-right font-mono"><strong>${amount.toLocaleString("id-ID")}</strong></td>
          </tr>`;
        }).join("")}
      ` : "";

      const secDHTML = secDItems.length > 0 ? `
        <tr class="sec-hdr">
          <td>D. RAISE & FALL'S FACTOR</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalD.toLocaleString("id-ID")}</td>
        </tr>
        ${secDItems.map((item, idx) => {
          const effVol = getItemEffectiveVolume(item);
          const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
          const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
          return `<tr>
            <td style="padding-left: 15px;"><strong>D${idx + 1}.</strong> ${cleanDesc}</td>
            <td class="text-center font-mono">${effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${item.unit || "Bcm"}</td>
            <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
            <td class="text-right font-mono"><strong>${amount < 0 ? `(${Math.abs(amount).toLocaleString("id-ID")})` : amount.toLocaleString("id-ID")}</strong></td>
          </tr>`;
        }).join("")}
      ` : "";

      tableBodyHTML = `${secAHTML}${secBHTML}${secCHTML}${secDHTML}`;

      totalsFooterHTML = `
        <tr class="tot-row">
          <td colspan="4"><strong>TOTAL (REVENUE GROSS)</strong></td>
          <td class="text-right font-mono"><strong>${c.totalGross.toLocaleString("id-ID")}</strong></td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">DPP PPN 11/12</td>
          <td class="text-right font-mono">${c.dpp11_12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">VAT ( 12% )</td>
          <td class="text-right font-mono">${c.vat12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">WITH HOLDING TAX ART 23</td>
          <td class="text-right font-mono">(${c.pph23.toLocaleString("id-ID")})</td>
        </tr>
        <tr class="net-row">
          <td colspan="4"><strong>TOTAL INVOICE (NET)</strong></td>
          <td class="text-right net-val"><strong>${c.totalInvoice.toLocaleString("id-ID")}</strong></td>
        </tr>
      `;

      noteHTML = `
        <div class="note-box">
          Note:<br/>
          1. Raise & Fall's Factor: <strong>${rfIndexCalculated.toFixed(3)}</strong>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>INVOICE - ${itemData?.invoiceNo || "Invoice"}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..900;1,300..900&display=swap');
          @page { size: A4 portrait; margin: 8mm 10mm; }
          * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
          body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; color: #0f172a; margin: 0; padding: 5px; font-size: 9.5px; line-height: 1.2; }
          .logo-header { text-align: center; margin-bottom: 8px; }
          .logo-img { height: 42px; width: auto; object-fit: contain; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5px; }
          .info-table td { padding: 2.5px 0; vertical-align: top; }
          .title-box { text-align: center; margin-bottom: 8px; margin-top: 2px; }
          .title-box h2 { font-size: 15px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 0; letter-spacing: 1.5px; color: #0f172a; }
          .contract-sub { font-size: 10.5px; font-weight: 700; margin-top: 3px; color: #334155; }
          .main-table { width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-bottom: 8px; page-break-inside: avoid; }
          .main-table th { background: #f1f5f9; color: #0f172a; border: 1.5px solid #0f172a; padding: 6px 7px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; }
          .main-table td { border: 1.2px solid #334155; padding: 5px 7px; font-size: 9.5px; color: #0f172a; }
          .sec-hdr { background: #f8fafc; font-weight: 800; text-decoration: underline; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; }
          .tot-row { background: #ffffff; font-weight: 700; border-top: 1.2px solid #334155; }
          .net-row { background: #f1f5f9; color: #0f172a; border-top: 2.5px solid #0f172a; border-bottom: 2.5px solid #0f172a; font-weight: 900; font-size: 11.5px; }
          .net-row td { padding: 7px; font-size: 11.5px; font-weight: 900; border: 1.5px solid #0f172a; }
          .net-val { font-size: 13px; font-weight: 900; color: #0f172a; text-decoration: underline; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono, td, th, span, div, p, strong { font-family: 'Plus Jakarta Sans', sans-serif !important; font-variant-numeric: tabular-nums; }
          .note-box { font-size: 9px; margin-bottom: 8px; font-weight: 600; }
          .footer-box { border: 2px solid #0f172a; display: table; width: 100%; box-sizing: border-box; page-break-inside: avoid; }
          .footer-cell { display: table-cell; width: 50%; padding: 8px 12px; vertical-align: top; font-size: 9.5px; }
          .footer-left { border-right: 2px solid #0f172a; }
          .sig-space { height: 48px; border-bottom: 1.2px dashed #64748b; margin: 6px 0; }
          .btn-print { background: #0e7490; color: white; border: none; padding: 7px 16px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-bottom: 10px; font-size: 11px; }
          @media print { .btn-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF Dokumen Official (1 Halaman A4)</button>

        <div class="logo-header">
          <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
        </div>

        <table class="info-table">
          <tr>
            <td width="13%"><strong>Company</strong></td>
            <td width="37%">: <strong>${itemData?.customerCode === "POS" ? "PT. POSITION" : itemData?.customerCode === "BGG" ? "PT. BUDI GEMA GEMPITA" : itemData?.customerCode === "DBK" ? "PT. PETROSEA TBK" : itemData?.customerCode === "SBS" ? "PT SATRIA BAHANA SARANA" : (itemData?.customerCode || "PT. ANDALAN")}</strong></td>
            <td width="16%"><strong>Invoice No.</strong></td>
            <td width="34%">: <strong>${itemData?.invoiceNo || "001/INV/2026"}</strong></td>
          </tr>
          <tr>
            <td><strong>Contractor</strong></td>
            <td>: <strong>PT. ANDALAN ARTHA PRIMANUSA</strong></td>
            <td><strong>PO Number</strong></td>
            <td>: <strong>${itemData?.noPO || itemData?.poNumber || (custCode === "SBS" ? "I05790/0002" : custCode === "POS" ? "PO-POS/2026/001" : "-")}</strong></td>
          </tr>
          <tr>
            <td><strong>Project</strong></td>
            <td>: <strong>${itemData?.projectSite || contractInfo?.project || "MINING PROJECT"}</strong></td>
            <td><strong>Activity Group</strong></td>
            <td>: <strong>${(itemData?.activityGroup || itemData?.jobType || (itemData?.invoiceCategory === "MDO" ? "MINE DEVELOPMENT OPERATION (MDO)" : "OPERATION & MINING")).toUpperCase()}</strong></td>
          </tr>
          <tr>
            <td><strong>Period Covered</strong></td>
            <td>: <strong>${itemData?.workPeriod || "Juni 2026"}</strong></td>
            <td></td>
            <td></td>
          </tr>
        </table>

        <div class="title-box">
          <h2>INVOICE</h2>
          ${custCode === "SBS" ? `
            <div class="contract-sub">(NO KONTRAK : <strong>${itemData?.contractNo || "SPPH-05852"}</strong>)</div>
          ` : `
            <div class="contract-sub">Contract Number : <strong>${itemData?.contractNo || contractInfo?.contract || "001/AAP/2025"}</strong></div>
          `}
        </div>

        <table class="main-table">
          <thead>
            <tr>
              <th width="${custCode === "DBK" ? "35%" : "40%"}">DESCRIPTION</th>
              <th width="16%" class="text-center">${custCode === "SBS" ? "CLAIMED UNIT" : "CLAIMED VOLUME"}</th>
              <th width="8%" class="text-center">UoM</th>
              ${custCode === "DBK" ? `
                <th width="11%" class="text-right">UNIT RATE (USD)</th>
                <th width="13%" class="text-right">KURS (USD to IDR)</th>
              ` : `
                <th width="16%" class="text-right">UNIT RATE (IDR)</th>
              `}
              <th width="20%" class="text-right">AMOUNT (IDR)</th>
            </tr>
          </thead>
          <tbody>
            ${tableBodyHTML}
          </tbody>
          <tfoot>
            ${totalsFooterHTML}
          </tfoot>
        </table>

        ${noteHTML}

        <div class="footer-box">
          <div class="footer-cell footer-left">
            <strong style="text-transform: uppercase;">PLEASE MAKE PAYMENT TO THIS ACCOUNT:</strong><br/><br/>
            <table style="width: 100%; font-size: 9.5px;">
              <tr><td width="85">Bank Name</td><td>: <strong>${itemData?.bankName || contractInfo?.bankName || "Bank BNI"}</strong></td></tr>
              <tr><td>A/C Name</td><td>: <strong>${itemData?.bankAccountName || "PT Andalan Artha Primanusa"}</strong></td></tr>
              <tr><td>A/C No</td><td>: <strong style="font-size: 11px;">${itemData?.bankAccountNo || contractInfo?.bankAccountNo || "8188788882"}</strong></td></tr>
              <tr><td>Branch</td><td>: <strong>${itemData?.bankBranch || contractInfo?.bankBranch || "Harmoni, Jakarta"}</strong></td></tr>
            </table>
          </div>
          <div class="footer-cell" style="text-align: center;">
            <div style="text-align: right; font-size: 9px; font-weight: bold; margin-bottom: 4px;">Jakarta, ${formattedDate}</div>
            <strong style="font-size: 9.5px;">SUBMITTED BY,</strong><br/>
            <strong style="font-size: 10px;">PT ANDALAN ARTHA PRIMANUSA</strong>
            <div class="sig-space"></div>
            <strong style="text-decoration: underline; font-size: 10px;">${itemData?.directorName || contractInfo?.directorName || "GAHARI CHRISTINE"}</strong><br/>
            <span style="font-size: 9px;">${itemData?.directorTitle || contractInfo?.directorTitle || "DIRECTOR"}</span>
          </div>
        </div>
      </body>
      </html>
    `;

    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const exportARBAIMonitoringExcel = () => {
    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const targetPeriodIndex = parsePeriodToMonthIndex(invPeriodFilter);
    const targetInvoices = invoiceRows.filter((r) => {
      const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (invPeriodFilter !== "All") {
        const rowPeriodIndex = parsePeriodToMonthIndex(r.workPeriod || "");
        if (rowPeriodIndex > targetPeriodIndex) return false;
      }
      const outstandingAmount = r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0));
      if (outstandingAmount <= 0 || r.status === "Paid") return false;
      return true;
    });
    const groupedCust = Array.from(new Set(targetInvoices.map((r) => r.customerCode || "OTHER")));

    let totalARAndalan = 0;
    let excelRowsAR = "";

    groupedCust.forEach((custCode) => {
      const clientRows = targetInvoices.filter((r) => (r.customerCode || "OTHER") === custCode);
      const clientTotalAR = clientRows.reduce((sum, r) => sum + (r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0))), 0);
      const clientTotalAmount = clientRows.reduce((sum, r) => sum + (r.totalInvoice || 0), 0);
      totalARAndalan += clientTotalAR;

      excelRowsAR += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="9" style="padding: 6px; border: 1px solid #cbd5e1;">CLIENT / SITE: ${custCode} (${clientRows.length} Invoice Outstanding)</td>
        </tr>
      `;

      clientRows.forEach((row) => {
        const invDate = row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("id-ID") : "-";
        const invIssued = row.invoiceIssuedDate ? new Date(row.invoiceIssuedDate).toLocaleDateString("id-ID") : "-";
        const dueDate = row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-";
        excelRowsAR += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.customerCode}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.workPeriod || "Juni 2026"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; font-family: monospace; font-weight: bold;">${row.invoiceNo}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.jobType || row.notes || "OB & CG"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right;">${formatIDR(row.totalInvoice)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${invDate}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${invIssued}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${dueDate}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right; font-weight: bold; color: #991b1b;">${formatIDR(row.outstanding)}</td>
          </tr>
        `;
      });

      excelRowsAR += `
        <tr style="background-color: #f8fafc; font-weight: bold;">
          <td colspan="4" style="border: 1px solid #cbd5e1; text-align: right; padding: 6px;">Total AR ${custCode}:</td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px;">${formatIDR(clientTotalAmount)}</td>
          <td colspan="3" style="border: 1px solid #cbd5e1;"></td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; color: #0f172a;">${formatIDR(clientTotalAR)}</td>
        </tr>
      `;
    });

    let excelRowsBA = "";
    const targetRows = baRows.filter((r) => {
      const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (periodFilter !== "All" && r.workPeriod !== periodFilter) return false;
      return true;
    });

    const groupedBACust = Array.from(new Set(targetRows.map((r) => r.customerCode || "OTHER")));
    let totalBAMoney = 0;

    groupedBACust.forEach((custCode) => {
      const custRows = targetRows.filter((r) => (r.customerCode || "OTHER") === custCode);
      const custSubtotal = custRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);
      totalBAMoney += custSubtotal;

      excelRowsBA += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="2" style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 900; color: #0f172a;">CLIENT / SITE: ${custCode} (${custRows.length} BA)</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: 900; color: #0e7490;">Subtotal: ${formatIDR(custSubtotal)}</td>
          <td colspan="2" style="border: 1px solid #cbd5e1;"></td>
        </tr>
      `;

      custRows.forEach((ba) => {
        const nominal = ba.workAmount || 0;
        const st = getBAStatusForExport(ba, invoiceRows);
        const notes = ba.notesBottleneck ? `${ba.notesBottleneck} ${ba.notes || ""}` : (ba.notes || "-");
        excelRowsBA += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold;">${ba.customerCode}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${ba.workPeriod || "-"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right; font-weight: bold;">${formatIDR(nominal)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${st.label} ${st.subtext ? `(${st.subtext})` : ""}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${notes}</td>
          </tr>
        `;
      });
    });

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>AR & BAI Monitoring</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }
          th { background-color: #0f172a; color: #ffffff; padding: 8px; border: 1px solid #0f172a; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
          .title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: #475569; margin-bottom: 15px; }
          .grand-total { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 13px; }
          .section-title { font-size: 14px; font-weight: bold; color: #0e7490; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="title">PT ANDALAN ARTHA PRIMANUSA</div>
        <div class="title">AR OUTSTANDING & BERITA ACARA INVOICE (BAI) MONITORING REPORT</div>
        <div class="subtitle">As of Date: ${formattedDate}</div>

        <div class="section-title">1. AR OUTSTANDING MONITORING</div>
        <table>
          <thead>
            <tr>
              <th>Project / Client</th>
              <th>Periode Pekerjaan</th>
              <th>No. Invoice</th>
              <th>Remarks / Activity</th>
              <th>Amount (Gross IDR)</th>
              <th>Invoice Date</th>
              <th>Invoice Submission</th>
              <th>Due Date</th>
              <th>Outstanding AR (IDR)</th>
            </tr>
          </thead>
          <tbody>
            ${excelRowsAR}
            <tr class="grand-total">
              <td colspan="8" style="text-align: right; padding: 8px; border: 1px solid #0f172a;">GRAND TOTAL AR OUTSTANDING ANDALAN:</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #0f172a; color: #38bdf8;">${formatIDR(totalARAndalan)}</td>
            </tr>
          </tbody>
        </table>

        <br/>
        <div class="section-title">2. BERITA ACARA INVOICE (BAI) MONITORING</div>
        <table>
          <thead>
            <tr>
              <th>Project / Client</th>
              <th>Periode Pekerjaan</th>
              <th>Nominal (IDR)</th>
              <th>Status BA / Invoicing</th>
              <th>Keterangan / Bottleneck Notes</th>
            </tr>
          </thead>
          <tbody>
            ${excelRowsBA}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AR_&_BAI_Outstanding_ANDALAN_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    onNotice("📊 File Laporan Excel (AR & BAI Monitoring) berhasil di-export!");
  };

  const exportARBAIMonitoringPDF = () => {
    const printWin = window.open("", "_blank", "width=1200,height=900");
    if (!printWin) return;

    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const logoUrl = `${window.location.origin}/andalan-logo.png`;
    const targetPeriodIndex = parsePeriodToMonthIndex(invPeriodFilter);
    const targetInvoices = invoiceRows.filter((r) => {
      const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (invPeriodFilter !== "All") {
        const rowPeriodIndex = parsePeriodToMonthIndex(r.workPeriod || "");
        if (rowPeriodIndex > targetPeriodIndex) return false;
      }
      const outstandingAmount = r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0));
      if (outstandingAmount <= 0 || r.status === "Paid") return false;
      return true;
    });
    const groupedCust = Array.from(new Set(targetInvoices.map((r) => r.customerCode || "OTHER")));

    let totalARAndalan = 0;
    let pdfRowsAR = "";

    groupedCust.forEach((custCode) => {
      const clientRows = targetInvoices.filter((r) => (r.customerCode || "OTHER") === custCode);
      const clientTotalAR = clientRows.reduce((sum, r) => sum + (r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0))), 0);
      const clientTotalAmount = clientRows.reduce((sum, r) => sum + (r.totalInvoice || 0), 0);
      totalARAndalan += clientTotalAR;

      pdfRowsAR += `
        <tr class="client-banner">
          <td colspan="9">CLIENT / SITE: <strong>${custCode}</strong> (${clientRows.length} Invoice Outstanding)</td>
        </tr>
      `;

      clientRows.forEach((row) => {
        const invDate = row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("id-ID") : "-";
        const invIssued = row.invoiceIssuedDate ? new Date(row.invoiceIssuedDate).toLocaleDateString("id-ID") : "-";
        const dueDate = row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-";
        pdfRowsAR += `
          <tr>
            <td><strong>${row.customerCode}</strong></td>
            <td>${row.workPeriod || "Juni 2026"}</td>
            <td class="font-mono" style="font-weight: 700; color: #0e7490;">${row.invoiceNo}</td>
            <td>${row.jobType || row.notes || "OB & CG"}</td>
            <td class="text-right font-mono">${formatIDR(row.totalInvoice)}</td>
            <td class="text-center">${invDate}</td>
            <td class="text-center">${invIssued}</td>
            <td class="text-center">${dueDate}</td>
            <td class="text-right font-mono" style="font-weight: 800; color: #b91c1c;">${formatIDR(row.outstanding)}</td>
          </tr>
        `;
      });

      pdfRowsAR += `
        <tr class="subtotal-row">
          <td colspan="4" class="text-right uppercase">Total AR ${custCode}:</td>
          <td class="text-right font-mono">${formatIDR(clientTotalAmount)}</td>
          <td colspan="3"></td>
          <td class="text-right font-mono" style="font-weight: 900; color: #0f172a;">${formatIDR(clientTotalAR)}</td>
        </tr>
      `;
    });

    let pdfRowsBA = "";
    const groupedBACust = Array.from(new Set(baRows.map((r) => r.customerCode || "OTHER")));
    groupedBACust.forEach((custCode) => {
      const custRows = baRows.filter((r) => (r.customerCode || "OTHER") === custCode);
      const custSubtotal = custRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);

      pdfRowsBA += `
        <tr class="client-banner" style="background: #e2e8f0; font-weight: 800;">
          <td colSpan="2" style="padding: 5px 8px; font-weight: 900; color: #0f172a;">
            CLIENT / SITE: <strong>${custCode}</strong> <span style="font-size: 8.5px; font-weight: 700; color: #475569;">(${custRows.length} BA)</span>
          </td>
          <td class="text-right font-mono" style="font-weight: 900; color: #0e7490;">
            Subtotal: ${formatIDR(custSubtotal)}
          </td>
          <td colSpan="2"></td>
        </tr>
      `;

      custRows.forEach((ba) => {
        const nominal = ba.workAmount || 0;
        const st = getBAStatusForExport(ba, invoiceRows);
        const notes = ba.notesBottleneck ? `${ba.notesBottleneck} - ${ba.notes || ""}` : (ba.notes || "-");
        pdfRowsBA += `
          <tr>
            <td><strong>${ba.customerCode}</strong></td>
            <td class="text-center">${ba.workPeriod || "-"}</td>
            <td class="text-right font-mono" style="font-weight: 700;">${formatIDR(nominal)}</td>
            <td class="text-center">
              <span class="badge ${st.badgeClass}">${st.label}</span>
              ${st.subtext ? `<div style="font-size: 7.5px; color: #475569; font-weight: 700; margin-top: 2px;">${st.subtext}</div>` : ""}
            </td>
            <td>${notes}</td>
          </tr>
        `;
      });
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AR & BAI OUTSTANDING MONITORING REPORT - ANDALAN</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..900;1,300..900&display=swap');
          @page { size: A4 landscape; margin: 6mm 8mm; }
          * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
          body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; color: #0f172a; margin: 0; padding: 8px; font-size: 9px; line-height: 1.25; }
          .header-box { display: table; width: 100%; margin-bottom: 10px; border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; }
          .header-cell { display: table-cell; vertical-align: middle; }
          .logo-img { height: 40px; width: auto; }
          .title-area { text-align: right; }
          .title-area h1 { font-size: 14px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
          .title-area p { font-size: 10px; margin: 2px 0 0 0; color: #475569; font-weight: 700; }

          .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #77542e; background: #faf6f0; padding: 4px 8px; border-left: 4px solid #a57c50; margin-top: 10px; margin-bottom: 6px; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8.5px; page-break-inside: avoid; border: 1.5px solid #0f172a; }
          th { background: #0f172a; color: #ffffff; padding: 6px 7px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; border: 1.5px solid #0f172a; text-align: center; }
          td { border: 1.2px solid #334155; padding: 5px 6px; color: #0f172a; }

          .client-banner { background: #e2e8f0; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
          .client-banner td { border: 1.5px solid #0f172a; }
          .subtotal-row { background: #f8fafc; font-weight: 800; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; }
          .grand-total { background: #0f172a; color: #ffffff; font-weight: 900; font-size: 10.5px; border-top: 2px solid #0f172a; }
          .grand-total td { padding: 7px; border: 1.5px solid #0f172a; }

          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono, td, th, span, div, p, strong { font-family: 'Plus Jakarta Sans', sans-serif !important; font-variant-numeric: tabular-nums; }

          .badge { padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 8px; text-transform: uppercase; display: inline-block; }
          .bg-emerald { background: #dcfce7; color: #166534; border: 1.2px solid #16a34a; }
          .bg-cyan { background: #faf6f0; color: #77542e; border: 1.2px solid #a57c50; }
          .bg-amber { background: #fef3c7; color: #92400e; border: 1.2px solid #d97706; }
          .bg-slate { background: #f1f5f9; color: #334155; border: 1.2px solid #64748b; }
          .bg-rose { background: #ffe4e6; color: #9f1239; border: 1.2px solid #e11d48; }
          .bg-purple { background: #f3e8ff; color: #6b21a8; border: 1.2px solid #a855f7; }

          .sig-table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: avoid; border: 1.5px solid #0f172a; }
          .sig-table th { background: #f1f5f9; color: #0f172a; border: 1.5px solid #0f172a; padding: 6px; font-size: 9px; font-weight: 800; }
          .sig-table td { border: 1.5px solid #0f172a; padding: 8px; text-align: center; height: 55px; vertical-align: bottom; font-weight: 800; font-size: 9px; }

          .btn-print { background: #1e2b4d; color: white; border: none; padding: 7px 18px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-bottom: 10px; font-size: 11px; }
          @media print { .btn-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan Laporan PDF Official (A4 Landscape)</button>

        <div class="header-box">
          <div class="header-cell" style="width: 40%;">
            <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
          </div>
          <div class="header-cell title-area" style="width: 60%;">
            <h1>AR & BAI OUTSTANDING MONITORING REPORT</h1>
            <p>PT ANDALAN ARTHA PRIMANUSA — As of Date: ${formattedDate}</p>
          </div>
        </div>

        <div class="section-title">1. AR OUTSTANDING MONITORING REPORT</div>
        <table>
          <thead>
            <tr>
              <th width="10%">Project</th>
              <th width="8%">Periode</th>
              <th width="18%">No. Invoice</th>
              <th width="18%">Activity / Remarks</th>
              <th width="12%">Amount (Gross)</th>
              <th width="8%">Inv Date</th>
              <th width="8%">Submitted</th>
              <th width="8%">Due Date</th>
              <th width="10%">Outstanding (AR)</th>
            </tr>
          </thead>
          <tbody>
            ${pdfRowsAR}
            <tr class="grand-total">
              <td colspan="8" class="text-right">GRAND TOTAL AR OUTSTANDING ANDALAN:</td>
              <td class="text-right font-mono" style="color: #38bdf8;">${formatIDR(totalARAndalan)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">2. BERITA ACARA INVOICE (BAI) MONITORING REPORT</div>
        <table>
          <thead>
            <tr>
              <th width="12%">Project / Client</th>
              <th width="12%">Periode Pekerjaan</th>
              <th width="18%">Nominal Work (IDR)</th>
              <th width="16%">Status BA / Invoicing</th>
              <th width="42%">Keterangan / Bottleneck & Progress Notes</th>
            </tr>
          </thead>
          <tbody>
            ${pdfRowsBA}
          </tbody>
        </table>

        <table class="sig-table">
          <thead>
            <tr>
              <th width="33%">DISIAPKAN OLEH</th>
              <th width="33%">DISETUJUI OLEH</th>
              <th width="34%">DIKETAHUI OLEH</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><u>Finance Specialist</u><br/><span style="font-size: 8.5px; color: #475569; font-weight: 700;">Finance & Verification Specialist</span></td>
              <td><u>FATB Manager</u><br/><span style="font-size: 8.5px; color: #475569; font-weight: 700;">Finance, Accounting, Tax & Budgeting</span></td>
              <td><u>Direktur</u><br/><span style="font-size: 8.5px; color: #475569; font-weight: 700;">Board of Directors</span></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const exportBAOnlyExcel = () => {
    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    
    // Export includes all BA rows for the selected periodFilter (not constrained by card status filter)
    const targetRows = baRows.filter((r) => {
      const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (periodFilter !== "All" && r.workPeriod !== periodFilter) return false;
      return true;
    });

    const groupedCust = Array.from(new Set(targetRows.map((r) => r.customerCode || "OTHER")));

    let totalBAMoney = 0;
    let excelRows = "";

    groupedCust.forEach((custCode) => {
      const custRows = targetRows.filter((r) => (r.customerCode || "OTHER") === custCode);
      const custSubtotal = custRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);
      totalBAMoney += custSubtotal;

      excelRows += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="2" style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 900; color: #0f172a;">CLIENT / SITE: ${custCode} (${custRows.length} BA)</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: 900; color: #0e7490;">Subtotal: ${formatIDR(custSubtotal)}</td>
          <td colspan="2" style="border: 1px solid #cbd5e1;"></td>
        </tr>
      `;

      custRows.forEach((ba) => {
        const nominal = ba.workAmount || 0;
        const statusBA = ba.statusBA || "Draft";
        const notes = ba.notesBottleneck ? `${ba.notesBottleneck} - ${ba.notes || ""}` : (ba.notes || "-");
        excelRows += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold;">${ba.customerCode}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${ba.workPeriod || "-"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right; font-weight: bold;">${formatIDR(nominal)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${statusBA}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${notes}</td>
          </tr>
        `;
      });
    });

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }
          th { background-color: #0f172a; color: #ffffff; padding: 8px; border: 1px solid #0f172a; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
          .title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: #475569; margin-bottom: 15px; }
          .grand-total { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="title">PT ANDALAN ARTHA PRIMANUSA</div>
        <div class="title">BERITA ACARA INVOICE (BAI) MONITORING REPORT</div>
        <div class="subtitle">Periode: ${periodFilter === "All" ? "Semua Periode" : periodFilter} | As of Date: ${formattedDate}</div>

        <table>
          <thead>
            <tr>
              <th>Project / Client</th>
              <th>Periode Pekerjaan</th>
              <th>Nominal (IDR)</th>
              <th>Status BA / Invoicing</th>
              <th>Keterangan / Bottleneck & Progress Notes</th>
            </tr>
          </thead>
          <tbody>
            ${excelRows}
            <tr class="grand-total">
              <td colspan="2" style="text-align: right; padding: 8px; border: 1px solid #0f172a;">TOTAL PROYEKSI PENDAPATAN BA:</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #0f172a; color: #38bdf8;">${formatIDR(totalBAMoney)}</td>
              <td colspan="2" style="border: 1px solid #0f172a;"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BAI_Monitoring_ANDALAN_${periodFilter}_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    onNotice("📊 File Excel Laporan BA Tracker berhasil di-export!");
  };

  const exportBAOnlyPDF = () => {
    const printWin = window.open("", "_blank", "width=1200,height=900");
    if (!printWin) return;

    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const logoUrl = `${window.location.origin}/andalan-logo.png`;

    // Export includes all BA rows for the selected periodFilter (not constrained by card status filter)
    const targetRows = baRows.filter((r) => {
      const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (periodFilter !== "All" && r.workPeriod !== periodFilter) return false;
      return true;
    });
    const groupedCust = Array.from(new Set(targetRows.map((r) => r.customerCode || "OTHER")));

    let totalBAMoney = 0;
    let pdfRowsBA = "";

    groupedCust.forEach((custCode) => {
      const custRows = targetRows.filter((r) => (r.customerCode || "OTHER") === custCode);
      const custSubtotal = custRows.reduce((sum, r) => sum + (r.workAmount || 0), 0);
      totalBAMoney += custSubtotal;

      pdfRowsBA += `
        <tr class="client-banner" style="background: #e2e8f0; font-weight: 800;">
          <td colSpan="2" style="padding: 5px 8px; font-weight: 900; color: #0f172a;">
            CLIENT / SITE: <strong>${custCode}</strong> <span style="font-size: 8.5px; font-weight: 700; color: #475569;">(${custRows.length} BA)</span>
          </td>
          <td class="text-right font-mono" style="font-weight: 900; color: #0891b2;">
            Subtotal: ${formatIDR(custSubtotal)}
          </td>
          <td colSpan="2"></td>
        </tr>
      `;

      custRows.forEach((ba) => {
        const nominal = ba.workAmount || 0;
        const st = getBAStatusForExport(ba, invoiceRows);
        const notes = ba.notesBottleneck ? `${ba.notesBottleneck} - ${ba.notes || ""}` : (ba.notes || "-");
        pdfRowsBA += `
          <tr>
            <td><strong>${ba.customerCode}</strong></td>
            <td class="text-center">${ba.workPeriod || "-"}</td>
            <td class="text-right font-mono" style="font-weight: 700;">${formatIDR(nominal)}</td>
            <td class="text-center">
              <span class="badge ${st.badgeClass}">${st.label}</span>
              ${st.subtext ? `<div style="font-size: 7.5px; color: #475569; font-weight: 700; margin-top: 2px;">${st.subtext}</div>` : ""}
            </td>
            <td>${notes}</td>
          </tr>
        `;
      });
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BERITA ACARA INVOICE (BAI) MONITORING REPORT - ANDALAN</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..900;1,300..900&display=swap');
          @page { size: A4 landscape; margin: 8mm 10mm; }
          * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
          body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; color: #0f172a; margin: 0; padding: 8px; font-size: 9.5px; line-height: 1.25; }
          .header-box { display: table; width: 100%; margin-bottom: 12px; border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; }
          .header-cell { display: table-cell; vertical-align: middle; }
          .logo-img { height: 42px; width: auto; }
          .title-area { text-align: right; }
          .title-area h1 { font-size: 15px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
          .title-area p { font-size: 10px; margin: 2px 0 0 0; color: #475569; font-weight: 700; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5px; page-break-inside: avoid; border: 1.5px solid #0f172a; }
          th { background: #0f172a; color: #ffffff; padding: 7px 8px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; border: 1.5px solid #0f172a; text-align: center; }
          td { border: 1.2px solid #334155; padding: 6px 8px; color: #0f172a; }

          .client-banner { background: #e2e8f0; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
          .client-banner td { border: 1.5px solid #0f172a; }

          .grand-total { background: #0f172a; color: #ffffff; font-weight: 900; font-size: 11px; border-top: 2px solid #0f172a; }
          .grand-total td { padding: 8px; border: 1.5px solid #0f172a; }

          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono, td, th, span, div, p, strong { font-family: 'Plus Jakarta Sans', sans-serif !important; font-variant-numeric: tabular-nums; }

          .badge { padding: 3px 7px; border-radius: 4px; font-weight: 800; font-size: 8.5px; text-transform: uppercase; display: inline-block; }
          .bg-emerald { background: #dcfce7; color: #166534; border: 1.2px solid #16a34a; }
          .bg-cyan { background: #faf6f0; color: #77542e; border: 1.2px solid #a57c50; }
          .bg-amber { background: #fef3c7; color: #92400e; border: 1.2px solid #d97706; }
          .bg-slate { background: #f1f5f9; color: #334155; border: 1.2px solid #64748b; }
          .bg-rose { background: #ffe4e6; color: #9f1239; border: 1.2px solid #e11d48; }
          .bg-purple { background: #f3e8ff; color: #6b21a8; border: 1.2px solid #a855f7; }

          .sig-table { width: 100%; border-collapse: collapse; margin-top: 20px; page-break-inside: avoid; border: 1.5px solid #0f172a; }
          .sig-table th { background: #f1f5f9; color: #0f172a; border: 1.5px solid #0f172a; padding: 7px; font-size: 10px; font-weight: 800; }
          .sig-table td { border: 1.5px solid #0f172a; padding: 8px; text-align: center; height: 2.2cm; min-height: 2.2cm; vertical-align: bottom; font-weight: 800; font-size: 10px; }

          .btn-print { background: #1e2b4d; color: white; border: none; padding: 7px 18px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-bottom: 10px; font-size: 11px; }
          @media print { .btn-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">🖨️ Cetak Laporan PDF Official BA Tracker (A4 Landscape)</button>

        <div class="header-box">
          <div class="header-cell" style="width: 40%;">
            <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
          </div>
          <div class="header-cell title-area" style="width: 60%;">
            <h1>BERITA ACARA INVOICE (BAI) MONITORING REPORT</h1>
            <p>PT ANDALAN ARTHA PRIMANUSA — As of Date: ${formattedDate}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="14%">Project / Client</th>
              <th width="14%">Periode Pekerjaan</th>
              <th width="20%">Nominal Work (IDR)</th>
              <th width="18%">Status BA / Invoicing</th>
              <th width="34%">Keterangan / Bottleneck Notes</th>
            </tr>
          </thead>
          <tbody>
            ${pdfRowsBA}
            <tr class="grand-total">
              <td colspan="2" class="text-right">TOTAL PENDAPATAN BA:</td>
              <td class="text-right font-mono" style="color: #38bdf8;">${formatIDR(totalBAMoney)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <table class="sig-table">
          <thead>
            <tr>
              <th width="50%">DIVERIFIKASI OLEH</th>
              <th width="50%">DISETUJUI OLEH</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><u>Finance Specialist</u><br/><span style="font-size: 8px; color: #64748b;">Finance & Verification Specialist</span></td>
              <td><u>FATB Manager</u><br/><span style="font-size: 8px; color: #64748b;">Finance, Accounting, Tax & Budgeting</span></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const exportAROnlyExcel = () => {
    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const targetPeriodIndex = parsePeriodToMonthIndex(invPeriodFilter);
    const targetInvoices = invoiceRows.filter((r) => {
      const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (invPeriodFilter !== "All") {
        const rowPeriodIndex = parsePeriodToMonthIndex(r.workPeriod || "");
        if (rowPeriodIndex > targetPeriodIndex) return false;
      }
      const outstandingAmount = r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0));
      if (outstandingAmount <= 0 || r.status === "Paid") return false;
      return true;
    });
    const groupedCust = Array.from(new Set(targetInvoices.map((r) => r.customerCode || "OTHER")));

    let totalARAndalan = 0;
    let excelRowsAR = "";

    groupedCust.forEach((custCode) => {
      const clientRows = targetInvoices.filter((r) => (r.customerCode || "OTHER") === custCode);
      const clientTotalAR = clientRows.reduce((sum, r) => sum + (r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0))), 0);
      const clientTotalAmount = clientRows.reduce((sum, r) => sum + (r.totalInvoice || 0), 0);
      totalARAndalan += clientTotalAR;

      excelRowsAR += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="9" style="padding: 6px; border: 1px solid #cbd5e1;">CLIENT / SITE: ${custCode} (${clientRows.length} Invoice Outstanding)</td>
        </tr>
      `;

      clientRows.forEach((row) => {
        const invDate = row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("id-ID") : "-";
        const invIssued = row.invoiceIssuedDate ? new Date(row.invoiceIssuedDate).toLocaleDateString("id-ID") : "-";
        const dueDate = row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-";
        excelRowsAR += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.customerCode}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.workPeriod || "Juni 2026"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; font-family: monospace; font-weight: bold;">${row.invoiceNo}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.jobType || row.notes || "OB & CG"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right;">${formatIDR(row.totalInvoice)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${invDate}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${invIssued}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${dueDate}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right; font-weight: bold; color: #991b1b;">${formatIDR(row.outstanding)}</td>
          </tr>
        `;
      });

      excelRowsAR += `
        <tr style="background-color: #f8fafc; font-weight: bold;">
          <td colspan="4" style="border: 1px solid #cbd5e1; text-align: right; padding: 6px;">Total AR ${custCode}:</td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px;">${formatIDR(clientTotalAmount)}</td>
          <td colspan="3" style="border: 1px solid #cbd5e1;"></td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; color: #0f172a;">${formatIDR(clientTotalAR)}</td>
        </tr>
      `;
    });

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }
          th { background-color: #0f172a; color: #ffffff; padding: 8px; border: 1px solid #0f172a; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
          .title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: #475569; margin-bottom: 15px; }
          .grand-total { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="title">PT ANDALAN ARTHA PRIMANUSA</div>
        <div class="title">AR OUTSTANDING MONITORING REPORT</div>
        <div class="subtitle">As of Date: ${formattedDate}</div>

        <table>
          <thead>
            <tr>
              <th>Project / Client</th>
              <th>Periode Pekerjaan</th>
              <th>No. Invoice</th>
              <th>Remarks / Activity</th>
              <th>Amount (Gross IDR)</th>
              <th>Invoice Date</th>
              <th>Invoice Submission</th>
              <th>Due Date</th>
              <th>Outstanding AR (IDR)</th>
            </tr>
          </thead>
          <tbody>
            ${excelRowsAR}
            <tr class="grand-total">
              <td colspan="8" style="text-align: right; padding: 8px; border: 1px solid #0f172a;">GRAND TOTAL AR OUTSTANDING ANDALAN:</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #0f172a; color: #38bdf8;">${formatIDR(totalARAndalan)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AR_Outstanding_ANDALAN_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    onNotice("📊 File Excel Laporan AR Outstanding berhasil di-export!");
  };

  const exportAROnlyPDF = () => {
    const printWin = window.open("", "_blank", "width=1200,height=900");
    if (!printWin) return;

    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const logoUrl = `${window.location.origin}/andalan-logo.png`;
    const targetPeriodIndex = parsePeriodToMonthIndex(invPeriodFilter);
    const targetInvoices = invoiceRows.filter((r) => {
      const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (invPeriodFilter !== "All") {
        const rowPeriodIndex = parsePeriodToMonthIndex(r.workPeriod || "");
        if (rowPeriodIndex > targetPeriodIndex) return false;
      }
      const outstandingAmount = r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0));
      if (outstandingAmount <= 0 || r.status === "Paid") return false;
      return true;
    });
    const groupedCust = Array.from(new Set(targetInvoices.map((r) => r.customerCode || "OTHER")));

    let totalARAndalan = 0;
    let pdfRowsAR = "";

    groupedCust.forEach((custCode) => {
      const clientRows = targetInvoices.filter((r) => (r.customerCode || "OTHER") === custCode);
      const clientTotalAR = clientRows.reduce((sum, r) => sum + (r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0))), 0);
      const clientTotalAmount = clientRows.reduce((sum, r) => sum + (r.totalInvoice || 0), 0);
      totalARAndalan += clientTotalAR;

      pdfRowsAR += `
        <tr class="client-banner">
          <td colspan="9">CLIENT / SITE: <strong>${custCode}</strong> (${clientRows.length} Invoice Outstanding)</td>
        </tr>
      `;

      clientRows.forEach((row) => {
        const invDate = row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("id-ID") : "-";
        const invIssued = row.invoiceIssuedDate ? new Date(row.invoiceIssuedDate).toLocaleDateString("id-ID") : "-";
        const dueDate = row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-";
        pdfRowsAR += `
          <tr>
            <td><strong>${row.customerCode}</strong></td>
            <td>${row.workPeriod || "Juni 2026"}</td>
            <td class="font-mono" style="font-weight: 700; color: #0e7490;">${row.invoiceNo}</td>
            <td>${row.jobType || row.notes || "OB & CG"}</td>
            <td class="text-right font-mono">${formatIDR(row.totalInvoice)}</td>
            <td class="text-center">${invDate}</td>
            <td class="text-center">${invIssued}</td>
            <td class="text-center">${dueDate}</td>
            <td class="text-right font-mono" style="font-weight: 800; color: #b91c1c;">${formatIDR(row.outstanding)}</td>
          </tr>
        `;
      });

      pdfRowsAR += `
        <tr class="subtotal-row">
          <td colspan="4" class="text-right uppercase">Total AR ${custCode}:</td>
          <td class="text-right font-mono">${formatIDR(clientTotalAmount)}</td>
          <td colspan="3"></td>
          <td class="text-right font-mono" style="font-weight: 900; color: #0f172a;">${formatIDR(clientTotalAR)}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AR OUTSTANDING MONITORING REPORT - ANDALAN</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..900;1,300..900&display=swap');
          @page { size: A4 landscape; margin: 8mm 10mm; }
          * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
          body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; color: #0f172a; margin: 0; padding: 8px; font-size: 9.5px; line-height: 1.25; }
          .header-box { display: table; width: 100%; margin-bottom: 12px; border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; }
          .header-cell { display: table-cell; vertical-align: middle; }
          .logo-img { height: 42px; width: auto; }
          .title-area { text-align: right; }
          .title-area h1 { font-size: 15px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
          .title-area p { font-size: 10px; margin: 2px 0 0 0; color: #475569; font-weight: 700; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9px; page-break-inside: avoid; border: 1.5px solid #0f172a; }
          th { background: #0f172a; color: #ffffff; padding: 7px 8px; font-size: 9px; font-weight: 800; text-transform: uppercase; border: 1.5px solid #0f172a; text-align: center; }
          td { border: 1.2px solid #334155; padding: 6px 7px; color: #0f172a; }

          .client-banner { background: #e2e8f0; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
          .client-banner td { border: 1.5px solid #0f172a; }
          .subtotal-row { background: #f8fafc; font-weight: 800; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; }
          .grand-total { background: #0f172a; color: #ffffff; font-weight: 900; font-size: 11px; border-top: 2px solid #0f172a; }
          .grand-total td { padding: 8px; border: 1.5px solid #0f172a; }

          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono, td, th, span, div, p, strong { font-family: 'Plus Jakarta Sans', sans-serif !important; font-variant-numeric: tabular-nums; }

          .sig-table { width: 100%; border-collapse: collapse; margin-top: 20px; page-break-inside: avoid; border: 1.5px solid #0f172a; }
          .sig-table th { background: #f1f5f9; color: #0f172a; border: 1.5px solid #0f172a; padding: 7px; font-size: 10px; font-weight: 800; }
          .sig-table td { border: 1.5px solid #0f172a; padding: 8px; text-align: center; height: 2.2cm; min-height: 2.2cm; vertical-align: bottom; font-weight: 800; font-size: 10px; }

          .btn-print { background: #0e7490; color: white; border: none; padding: 7px 18px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-bottom: 10px; font-size: 11px; }
          @media print { .btn-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">🖨️ Cetak Laporan PDF Official AR Outstanding (A4 Landscape)</button>

        <div class="header-box">
          <div class="header-cell" style="width: 40%;">
            <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
          </div>
          <div class="header-cell title-area" style="width: 60%;">
            <h1>AR OUTSTANDING MONITORING REPORT</h1>
            <p>PT ANDALAN ARTHA PRIMANUSA — Periode Cut-Off: ${invPeriodFilter === "All" ? "Semua Periode" : `s/d ${invPeriodFilter}`} (Khusus Outstanding) — As of Date: ${formattedDate}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="10%">Project</th>
              <th width="8%">Periode</th>
              <th width="18%">No. Invoice</th>
              <th width="18%">Activity / Remarks</th>
              <th width="12%">Amount (Gross)</th>
              <th width="8%">Inv Date</th>
              <th width="8%">Submitted</th>
              <th width="8%">Due Date</th>
              <th width="10%">Outstanding (AR)</th>
            </tr>
          </thead>
          <tbody>
            ${pdfRowsAR}
            <tr class="grand-total">
              <td colspan="8" class="text-right">GRAND TOTAL AR OUTSTANDING ANDALAN:</td>
              <td class="text-right font-mono" style="color: #38bdf8;">${formatIDR(totalARAndalan)}</td>
            </tr>
          </tbody>
        </table>

        <table class="sig-table">
          <thead>
            <tr>
              <th width="33%">DISIAPKAN OLEH</th>
              <th width="33%">DISETUJUI OLEH</th>
              <th width="34%">DIKETAHUI OLEH</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><u>Finance Specialist</u><br/><span style="font-size: 8.5px; color: #475569; font-weight: 700;">Finance & Verification Specialist</span></td>
              <td><u>FATB Manager</u><br/><span style="font-size: 8.5px; color: #475569; font-weight: 700;">Finance, Accounting, Tax & Budgeting</span></td>
              <td><u>Direktur</u><br/><span style="font-size: 8.5px; color: #475569; font-weight: 700;">Board of Directors</span></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  async function loadData() {
    setLoading(true);
    try {
      const [dashRes, baRes, invRes, payRes, custRes, pVolRes] = await Promise.all([
        (viewTitle === "Finance & AR Dashboard" || viewTitle === "Finance AR Dashboard" || viewTitle.includes("AR Dashboard"))
          ? api<any>("/api/finance/dashboard").catch(() => null)
          : Promise.resolve(null),
        api<any[]>("/api/finance/ba-trackers").catch(() => []),
        api<any[]>("/api/finance/invoices").catch(() => []),
        api<any[]>("/api/finance/payments").catch(() => []),
        api<any[]>("/api/finance/customers").catch(() => []),
        api<any[]>("/api/finance/pending-volumes").catch(() => [])
      ]);

      if (dashRes) setDashboardData(dashRes);
      if (Array.isArray(baRes)) setBaRows(baRes);
      if (Array.isArray(invRes)) setInvoiceRows(invRes);
      if (Array.isArray(payRes)) setPaymentRows(payRes);
      if (Array.isArray(custRes)) setCustomerRows(custRes);
      if (Array.isArray(pVolRes)) setPendingVolumeLedgers(pVolRes);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data finance");
    } finally {
      setLoading(false);
    }
  }

  const handleSavePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailViewItem || detailViewItem.type !== "invoice") return;
    const amount = parseFloat(partialPaymentForm.amountPaid);
    if (!amount || amount <= 0) {
      onNotice("Nominal pembayaran harus lebih besar dari 0");
      return;
    }

    try {
      const payload = {
        invoiceNo: detailViewItem.data.invoiceNo,
        customerCode: detailViewItem.data.customerCode,
        amountPaid: amount,
        paymentDate: partialPaymentForm.paymentDate ? new Date(partialPaymentForm.paymentDate).toISOString() : new Date().toISOString(),
        receivingBank: partialPaymentForm.receivingBank || "Bank Mandiri Escrow",
        refNo: partialPaymentForm.refNo || "-",
        notes: partialPaymentForm.notes || "Cicilan Klien",
        verificationStatus: "Pending",
        createdBy: "AR Treasury Dept"
      };

      await api("/api/finance/payments", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      onNotice("✅ Pembayaran cicilan berhasil dicatat (Menunggu Verifikasi 1-Level).");
      setShowAddPartialPayment(false);
      setPartialPaymentForm({
        amountPaid: "",
        paymentDate: new Date().toISOString().split("T")[0],
        receivingBank: "Bank Mandiri Escrow",
        refNo: "",
        notes: ""
      });

      // Reload invoices & payments
      const [invRes, payRes] = await Promise.all([
        api<any[]>("/api/finance/invoices"),
        api<any[]>("/api/finance/payments")
      ]);
      setInvoiceRows(Array.isArray(invRes) ? invRes : []);
      setPaymentRows(Array.isArray(payRes) ? payRes : []);

      // Update detail view item data with updated invoice
      const updatedInv = Array.isArray(invRes) ? invRes.find((i: any) => i.invoiceNo === detailViewItem.data.invoiceNo) : null;
      if (updatedInv) {
        setDetailViewItem({ type: "invoice", data: updatedInv });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal mencatat cicilan");
    }
  };

  const handleVerifyPartialPayment = async (paymentId: number) => {
    try {
      await api(`/api/finance/payments/${paymentId}/verify`, {
        method: "PUT",
        body: JSON.stringify({ verifiedBy: "Hendra Wijaya (Finance Specialist)" })
      });

      onNotice("🎉 Pembayaran cicilan berhasil diverifikasi!");

      // Reload invoices & payments
      const [invRes, payRes] = await Promise.all([
        api<any[]>("/api/finance/invoices"),
        api<any[]>("/api/finance/payments")
      ]);
      setInvoiceRows(Array.isArray(invRes) ? invRes : []);
      setPaymentRows(Array.isArray(payRes) ? payRes : []);

      // Update detail view item data with updated invoice
      if (detailViewItem && detailViewItem.type === "invoice") {
        const updatedInv = Array.isArray(invRes) ? invRes.find((i: any) => i.invoiceNo === detailViewItem.data.invoiceNo) : null;
        if (updatedInv) {
          setDetailViewItem({ type: "invoice", data: updatedInv });
        }
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi cicilan");
    }
  };

  useEffect(() => {
    loadData();
    if (customerRows.length === 0) {
      api<any[]>("/api/finance/customers").then(res => {
        if (Array.isArray(res)) setCustomerRows(res);
      }).catch(() => {});
    }
  }, [viewTitle]);

  const buildInvoiceItemsFromBA = (ba: any, custCode?: string, category: "Operation & Mining" | "MDO" = "Operation & Mining") => {
    const code = custCode || ba?.customerCode || "POS";

    // If POS and Category is MDO (Mine Development Operation)
    if (code === "POS" && category === "MDO") {
      const mdo1 = ba?.items?.find((i: any) => (i.material || "").toLowerCase().includes("mine dev") || (i.material || "").toLowerCase().includes("mdo")) || baMDOItems?.[0];
      const mdo2 = ba?.items?.find((i: any) => (i.material || "").toLowerCase().includes("rock") || (i.material || "").toLowerCase().includes("konstruksi")) || baMDOItems?.[1];

      const vol1 = mdo1?.adjustedVolume > 0 ? mdo1.adjustedVolume : (mdo1?.initialVolume || mdo1?.volume || 5.5);
      const vol2 = mdo2?.adjustedVolume > 0 ? mdo2.adjustedVolume : (mdo2?.initialVolume || mdo2?.volume || 1200);

      return [
        { id: "MDO_1", section: "A", code: "MDO1", description: "Mine Development (MDO Cut & Fill & Access Road)", volume: vol1, unit: "Ha", baseRateUSD: 0, unitRateIDR: 15500000 },
        { id: "MDO_2", section: "A", code: "MDO2", description: "Rocks for construction - under/overhaul", volume: vol2, unit: "USD/1KM", baseRateUSD: 0.526, unitRateIDR: 9450 }
      ];
    }

    // 1. If BA has explicit item array from Step 1 / Step 2
    if (ba?.items && Array.isArray(ba.items) && ba.items.length > 0) {
      if (code === "POS") {
        return blankPOSItems.map((invItem) => {
          const itemCopy: any = { ...invItem };
          const matched = ba.items.find((bi: any) => {
            const m = (bi.material || "").toLowerCase();
            if (itemCopy.id === "A1" || itemCopy.code === "A1") return m.includes("overburden") || m.includes("waste") || m.includes("ob");
            if (itemCopy.id === "A2" || itemCopy.code === "A2") return m.includes("top soil") || m.includes("topsoil");
            if (itemCopy.id === "A3" || itemCopy.code === "A3") return m.includes("limonite");
            if (itemCopy.id === "A4" || itemCopy.code === "A4") return m.includes("saprolite");
            if (itemCopy.id === "C1" || itemCopy.code === "C1") return m.includes("clearing") || m.includes("grub");
            return false;
          });

          if (matched) {
            const vol = matched.adjustedVolume > 0 ? matched.adjustedVolume : (matched.initialVolume || matched.volume || 0);
            itemCopy.volume = vol;
            if (matched.rate) itemCopy.unitRateIDR = matched.rate;
          }

          if (itemCopy.section === "B") {
            const matchedForDist = ba.items.find((bi: any) => {
              const m = (bi.material || "").toLowerCase();
              if (itemCopy.id === "B1") return m.includes("overburden") || m.includes("waste") || m.includes("ob");
              if (itemCopy.id === "B2") return m.includes("top soil") || m.includes("topsoil");
              if (itemCopy.id === "B3") return m.includes("limonite");
              if (itemCopy.id === "B4") return m.includes("saprolite");
              return false;
            });
            if (matchedForDist) {
              itemCopy.overhaulMtr = matchedForDist.distanceWeightAvg || matchedForDist.overhaulMtr || 1000;
            }
          }
          return itemCopy;
        });
      }
    }

    // 2. Map realistic data by customer and BA details
    if (code === "POS") {
      if (ba?.baNumber?.includes("053") || (ba?.workAmount && ba.workAmount < 5000000000 && !ba.baNumber?.includes("052"))) {
        return [
          { id: "A1", section: "A", code: "A1", description: "OVER BURDEN REMOVAL", volume: 15420.50, unit: "Bcm", baseRateUSD: 3.327 },
          { id: "A2", section: "A", code: "A2", description: "TOP SOIL REMOVAL", volume: 2800.00, unit: "Bcm", baseRateUSD: 3.380 },
          { id: "A3", section: "A", code: "A3", description: "LIMONITE", volume: 4120.00, unit: "Bcm", baseRateUSD: 3.363 },
          { id: "A4", section: "A", code: "A4", description: "SAPROLITE", volume: 650.00, unit: "Bcm", baseRateUSD: 3.472 },
          { id: "B1", section: "B", code: "B1", description: "Over/Underhaul For OB Removal", overhaulMtr: 600, volume: 15420.50, unit: "Bcm", baseRateUSD: 0.538 },
          { id: "B2", section: "B", code: "B2", description: "Over/Underhaul For Top Soil Removal", overhaulMtr: 1100, volume: 2800.00, unit: "Bcm", baseRateUSD: 0.538 },
          { id: "B3", section: "B", code: "B3", description: "Over/Underhaul For Limonite", overhaulMtr: 1000, volume: 4120.00, unit: "Bcm", baseRateUSD: 0.526 },
          { id: "B4", section: "B", code: "B4", description: "Over/Underhaul For Saprolite", overhaulMtr: 750, volume: 650.00, unit: "Bcm", baseRateUSD: 0.526 },
          { id: "C1", section: "C", code: "C1", description: "Land Clearing", volume: 8500.00, unit: "m2", baseRateUSD: 0.381 },
          { id: "D1", section: "D", code: "D1", description: "OB Removal (RF Factor)", volume: 15420.50, unit: "Bcm", baseRateUSD: 3.327, type: "production" },
          { id: "D2", section: "D", code: "D2", description: "Over/Underhaul For OB Removal (RF)", overhaulMtr: 600, volume: 15420.50, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
          { id: "D3", section: "D", code: "D3", description: "Top Soil Removal (RF Factor)", volume: 2800.00, unit: "Bcm", baseRateUSD: 3.380, type: "production" },
          { id: "D4", section: "D", code: "D4", description: "Over/Underhaul For Top Soil Removal (RF)", overhaulMtr: 1100, volume: 2800.00, unit: "Bcm", baseRateUSD: 0.538, type: "overhaul" },
          { id: "D5", section: "D", code: "D5", description: "Limonite (RF Factor)", volume: 4120.00, unit: "Bcm", baseRateUSD: 3.363, type: "production" },
          { id: "D6", section: "D", code: "D6", description: "Over/Underhaul For Limonite (RF)", overhaulMtr: 1000, volume: 4120.00, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
          { id: "D7", section: "D", code: "D7", description: "Land Clearing (RF Factor)", volume: 8500.00, unit: "m2", baseRateUSD: 0.381, type: "land_clearing" },
          { id: "D8", section: "D", code: "D8", description: "Saprolite (RF Factor)", volume: 650.00, unit: "Bcm", baseRateUSD: 3.472, type: "production" },
          { id: "D9", section: "D", code: "D9", description: "Over/Underhaul For Saprolite (RF)", overhaulMtr: 750, volume: 650.00, unit: "Bcm", baseRateUSD: 0.526, type: "overhaul" },
        ];
      }
      return demoPOSItems.map(i => ({ ...i }));
    } else if (code === "BGG") {
      return demoBGGItems.map(i => ({ ...i }));
    } else if (code === "DBK") {
      return demoDBKItems.map(i => ({ ...i }));
    } else if (code === "SBS") {
      return demoSBSItems.map(i => ({ ...i }));
    }

    return blankPOSItems.map(i => ({ ...i }));
  };

  const handleBASelect = (baNumber: string) => {
    if (!baNumber) {
      setFormData((prev: any) => ({ ...prev, baNoReference: "" }));
      return;
    }
    const selectedBa = baRows.find((r) => r.baNumber === baNumber);
    if (selectedBa) {
      const cust = customerRows.find((c: any) => c.code === selectedBa.customerCode);
      const code = selectedBa.customerCode || "POS";
      const cInfo = customerContractMap[code];
      const projectSite = cust?.fullName ? `${cust.fullName} Site` : selectedBa.projectSite || cInfo?.project || `${code} PROJECT`;
      const contractNo = cust?.contractNo || selectedBa.contractNo || cInfo?.contract || `002/${code}-AAP/2025`;
      const workPeriod = selectedBa.workPeriod || "Jul-26";
      const cat = (formData.invoiceCategory || (formData.activityGroup?.includes("MDO") ? "MDO" : "Operation & Mining")) as "Operation & Mining" | "MDO";
      let autoInvNo = generateInvoiceNumber(code, workPeriod, invoiceRows.length);
      if (code === "POS" && cat === "MDO") {
        autoInvNo = autoInvNo.replace(/RF|MINING/g, "MDO");
      }
      const poNum = selectedBa.noPO || selectedBa.poNumber || (code === "POS" ? "PO-POS-2026-001" : code === "BGG" ? "PO-BGG-2026-003" : `PO-${code}-2026-001`);

      setFormData((prev: any) => ({
        ...prev,
        baNoReference: selectedBa.baNumber,
        customerCode: code,
        projectSite: projectSite,
        contractNo: contractNo,
        workPeriod: workPeriod,
        invoiceNo: autoInvNo,
        noPO: poNum,
        poNumber: poNum,
        activityGroup: (code === "POS" && cat === "MDO") ? "MINE DEVELOPMENT OPERATION (MDO)" : (selectedBa.activityGroup || "OPERATION & MINING"),
        invoiceCategory: cat,
        bankName: cInfo?.bankName || prev.bankName || "Bank BNI",
        bankAccountNo: cInfo?.bankAccountNo || prev.bankAccountNo || "8188788882",
        bankBranch: cInfo?.bankBranch || prev.bankBranch || "Harmoni, Jakarta",
      }));

      const filledItems = buildInvoiceItemsFromBA(selectedBa, code, cat);
      setInvLineItems(filledItems);

      onNotice(`🎉 No. BA ${selectedBa.baNumber} dipilih! Volume survei klaim [${cat}] & seluruh field penagihan berhasil diisi otomatis.`);
    }
  };

  const createInvoiceFromBA = (ba: any, category: "Operation & Mining" | "MDO" = "Operation & Mining") => {
    const code = ba.customerCode || "POS";
    const period = ba.workPeriod || "Jul-26";
    const cust = customerRows.find((c: any) => c.code === code);
    const cInfo = customerContractMap[code];
    let autoInvNo = generateInvoiceNumber(code, period, invoiceRows.length);
    if (code === "POS" && category === "MDO") {
      autoInvNo = autoInvNo.replace(/RF|MINING/g, "MDO");
    }
    const projectSite = cust?.fullName ? `${cust.fullName} Site` : ba.projectSite || cInfo?.project || `${code} PROJECT`;
    const contractNo = cust?.contractNo || ba.contractNo || cInfo?.contract || `002/${code}-AAP/2025`;
    const poNum = ba.noPO || ba.poNumber || (code === "POS" ? "PO-POS-2026-001" : code === "BGG" ? "PO-BGG-2026-003" : `PO-${code}-2026-001`);
    const actGroup = (code === "POS" && category === "MDO") ? "MINE DEVELOPMENT OPERATION (MDO)" : "OPERATION & MINING";

    setEditItem(null);
    setFormData({
      customerCode: code,
      workPeriod: period,
      invoiceNo: autoInvNo,
      baNoReference: ba.baNumber,
      noPO: poNum,
      poNumber: poNum,
      activityGroup: actGroup,
      invoiceCategory: category,
      projectSite: projectSite,
      contractNo: contractNo,
      bankName: cInfo?.bankName || "Bank BNI",
      bankAccountNo: cInfo?.bankAccountNo || "8188788882",
      bankBranch: cInfo?.bankBranch || "Harmoni, Jakarta",
      directorName: cInfo?.directorName || "GAHARI CHRISTINE",
      directorTitle: cInfo?.directorTitle || "DIRECTOR",
    });

    const filledItems = buildInvoiceItemsFromBA(ba, code, category);
    setInvLineItems(filledItems);

    setDetailViewItem(null);
    setModalType("invoice");
    onNotice(`🚀 Menyiapkan Form Invoice Baru [${category}] dari No. BA ${ba.baNumber} (${code}) — Data terisi otomatis!`);
  };

  const openBAModal = (item: any, isEditMode: boolean = false) => {
    setEditItem(item);
    setIsInlineEditingBA(isEditMode);
    const bggData = item.bggData;
    const bggTotalTerbongkar = bggData?.agreedSurveyVolume || bggData?.volumeBGG || 247557.933;
    const bggCoalVolumeBCM = bggData?.coalVolumeBCM || 0;
    const bggCoalVolumeTon = bggData?.coalVolumeTon || 0;
    const bggOBDistanceHm = bggData?.obOverDistanceHm || 0;
    const bggNettOB = bggData?.nettOBVolume || Math.max(0, bggTotalTerbongkar - bggCoalVolumeBCM);

    setFormData({
      ...item,
      bggTotalTerbongkar,
      bggCoalVolumeBCM,
      bggCoalVolumeTon,
      bggOBDistanceHm,
      bggNettOB,
      workEndDate: formatDateInput(item.workEndDate),
      baSubmittedDate: formatDateInput(item.baSubmittedDate),
      baSentDate: formatDateInput(item.baSentDate),
      internalRoutingDate: formatDateInput(item.internalRoutingDate),
      baSignedDate: formatDateInput(item.baSignedDate),
      invoiceIssuedDate: formatDateInput(item.invoiceIssuedDate),
      baDate: formatDateInput(item.baDate),
      invoiceDate: formatDateInput(item.invoiceDate),
      paymentDate: formatDateInput(item.paymentDate),
    });
    const isBGG = item.customerCode === "BGG" || item.customerCode === "PT BGG";
    if (item.items && item.items.length > 0) {
      const ops = item.items.filter((i: any) => i.category === "Operating & Mining" || i.category === "Over Distance" || i.category === "Penambangan BGG" || i.category === "Mining");
      const mdo = item.items.filter((i: any) => i.category === "MDO");
      setBaOperatingItems(ops.length > 0 ? ops : (isBGG ? defaultBGGBAItems : defaultPOSBAOperatingItems));
      setBaMDOItems(mdo.length > 0 ? mdo : (isBGG ? [] : defaultPOSBAMDOItems));
    } else {
      setBaOperatingItems(isBGG ? defaultBGGBAItems : defaultPOSBAOperatingItems);
      setBaMDOItems(isBGG ? [] : defaultPOSBAMDOItems);
    }
    setActiveBAStep(1);
    setDetailViewItem(null);
    setModalType("ba");
  };

  const openCreateModal = (type: "ba" | "invoice" | "payment" | "customer" | "pending_volume", initialData: any = {}) => {
    setEditItem(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (type === "ba") {
      const cust = initialData.customerCode || "POS";
      const isBGG = cust === "BGG" || cust === "PT BGG";
      setIsInlineEditingBA(true);
      setFormData({
        statusBA: "Submit",
        baSubmittedDate: todayStr,
        workPeriod: "Juni 2026",
        customerCode: cust,
        picAAP: "Operations / Site Engineer",
        step1Locked: false,
        draftBARefNo: "",
        signedBANumber: "",
        bggTotalTerbongkar: initialData.bggTotalTerbongkar ?? "",
        bggCoalVolumeBCM: initialData.bggCoalVolumeBCM ?? "",
        bggCoalVolumeTon: initialData.bggCoalVolumeTon ?? "",
        bggOBDistanceHm: initialData.bggOBDistanceHm ?? 0,
        bggNettOB: 0,
        ...initialData,
      });
      setBaOperatingItems(isBGG ? defaultBGGBAItems : defaultPOSBAOperatingItems);
      setBaMDOItems(isBGG ? [] : defaultPOSBAMDOItems);
      setActiveBAStep(1);
    } else if (type === "pending_volume") {
      setFormData({
        customerCode: "POS",
        workPeriod: "Juni 2026",
        workAmount: 0,
        picAAP: "Surveyor Site",
        notes: "Pending Volume Hasil Joint Survey",
        ...initialData,
      });
    } else if (type === "invoice") {
      const defaultCompany = initialData?.customerCode || "POS";
      const defaultPeriod = initialData?.workPeriod || "Juni 2026";
      const autoInvNo = generateInvoiceNumber(defaultCompany, defaultPeriod, invoiceRows.length);
      const cInfo = customerContractMap[defaultCompany];
      setFormData({
        customerCode: defaultCompany,
        workPeriod: defaultPeriod,
        invoiceNo: autoInvNo,
        activityGroup: "OPERATION & MINING",
        projectSite: cInfo?.project || "POS PROJECT",
        contractNo: cInfo?.contract || "002/POS-AAP/2025",
        bankName: cInfo?.bankName || "Bank BNI",
        bankAccountNo: cInfo?.bankAccountNo || "8188788882",
        bankBranch: cInfo?.bankBranch || "Harmoni, Jakarta",
        directorName: cInfo?.directorName || "GAHARI CHRISTINE",
        directorTitle: cInfo?.directorTitle || "DIRECTOR",
        ...initialData,
      });
      if (defaultCompany === "BGG") setInvLineItems(blankBGGItems);
      else if (defaultCompany === "DBK") setInvLineItems(blankDBKItems);
      else if (defaultCompany === "SBS") setInvLineItems(blankSBSItems);
      else setInvLineItems(blankPOSItems);
    } else {
      setFormData({
        activityGroup: "OPERATION & MINING",
        ...initialData,
      });
    }
    if (type === "invoice" && !initialData?.invoiceNo) {
      const cust = initialData?.customerCode || "POS";
      if (cust === "BGG") setInvLineItems(blankBGGItems);
      else if (cust === "DBK") setInvLineItems(blankDBKItems);
      else if (cust === "SBS") setInvLineItems(blankSBSItems);
      else setInvLineItems(blankPOSItems);
    }
    setModalType(type);
  };

  const openEditModal = (type: "ba" | "invoice" | "payment" | "customer", item: any) => {
    if (type === "ba") {
      openBAModal(item, true);
      return;
    }
    setEditItem(item);
    setFormData({
      ...item,
      workEndDate: formatDateInput(item.workEndDate),
      baSubmittedDate: formatDateInput(item.baSubmittedDate),
      baSentDate: formatDateInput(item.baSentDate),
      internalRoutingDate: formatDateInput(item.internalRoutingDate),
      baSignedDate: formatDateInput(item.baSignedDate),
      invoiceIssuedDate: formatDateInput(item.invoiceIssuedDate),
      baDate: formatDateInput(item.baDate),
      invoiceDate: formatDateInput(item.invoiceDate),
      paymentDate: formatDateInput(item.paymentDate),
    });
    setModalType(type);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onNotice(`⏳ Mengunggah berkas PDF "${file.name}" ke server...`);
      try {
        const res = await uploadDocumentFile(file, "Berita Acara", fieldName === "draftBAPath" ? "Draft BA" : "Final Signed BA");
        const permanentUrl = res.url || `/uploads/${res.storedName}`;
        setFormData((prev: any) => ({
          ...prev,
          [fieldName]: permanentUrl,
          [`${fieldName}Name`]: file.name
        }));
        onNotice(`✅ Berkas PDF "${file.name}" berhasil disimpan permanen di server!`);
      } catch (err: any) {
        onNotice(`❌ Gagal mengunggah PDF: ${err?.message || "Kesalahan server"}`);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = "";
      let payload: any = { ...formData };

      if (modalType === "ba") {
        endpoint = "/api/finance/ba-trackers";
        if (formData.customerCode === "BGG" || formData.customerCode === "PT BGG") {
          const totTerbongkar = Number(formData.bggTotalTerbongkar || 247557.933);
          const coalBCM = Number(formData.bggCoalVolumeBCM || 37346.784);
          const nettOB = Math.max(0, totTerbongkar - coalBCM);
          const coalTon = Number(formData.bggCoalVolumeTon || 46683.48);
          const odHm = Number(formData.bggOBDistanceHm || 2.38526);
          const ob1 = nettOB * 0.75;
          const ob2 = nettOB * 0.25;
          const subOB1 = Math.round(ob1 * 29500);
          const subOB2 = Math.round(ob2 * 28750);
          const subCoal = Math.round(coalTon * 17500);
          const subODOB = Math.round(nettOB * odHm * 155);
          const subODCoal = Math.round(coalTon * 19700);
          const bggGross = subOB1 + subOB2 + subCoal + subODOB + subODCoal;

          payload = {
            ...formData,
            customerCode: "BGG",
            workPeriod: formData.workPeriod || "Juni 2026",
            picAAP: formData.picAAP || "Dhini Andini (Finance Site)",
            initialWorkAmount: bggGross,
            adjustedWorkAmount: bggGross,
            workAmount: bggGross,
            step1Locked: true,
            bggData: {
              locationPit: "Pit Kungkilan",
              volumeBGG: totTerbongkar,
              volumeAAP: totTerbongkar,
              agreedSurveyVolume: totTerbongkar,
              coalVolumeBCM: coalBCM,
              coalVolumeTon: coalTon,
              nettOBVolume: nettOB,
              strippingRatio: coalTon > 0 ? nettOB / coalTon : 0,
              obOverDistanceHm: odHm,
              coalOverDistanceM: 581.77,
              ...(formData.bggData || {}),
            }
          };
        } else {
          const allItems = [...baOperatingItems, ...baMDOItems];
          const initSum = allItems.reduce((acc, item) => acc + (Number(item.initialVolume || 0) * Number(item.rate || 0)), 0);
          const adjSum = allItems.reduce((acc, item) => acc + (Number(item.adjustedVolume || item.initialVolume || 0) * Number(item.rate || 0)), 0);
          
          payload = {
            ...formData,
            customerCode: formData.customerCode || "POS",
            workPeriod: formData.workPeriod || "Juni 2026",
            picAAP: formData.picAAP || "Operations / Site Engineer",
            items: allItems,
            initialWorkAmount: initSum,
            adjustedWorkAmount: adjSum > 0 ? adjSum : initSum,
            workAmount: adjSum > 0 ? adjSum : (formData.workAmount || initSum),
            step1Locked: true,
          };
        }
      }
      else if (modalType === "pending_volume") {
        endpoint = "/api/finance/ba-trackers";
        payload = {
          baNumber: `053/BA-${formData.customerCode || "POS"}-PENDING-VOL/${(formData.workPeriod || "JUL-26").toUpperCase().replace(/\s+/g, '')}`,
          customerCode: formData.customerCode || "POS",
          workPeriod: formData.workPeriod || "Juni 2026",
          workAmount: Number(formData.workAmount || 0),
          statusBA: "Submit",
          picAAP: formData.picAAP || "Surveyor Site",
          notesBottleneck: "⚠️ Pending: Joint Survey Tambahan",
          notes: formData.notes || "Pending Volume Hasil Joint Survey Tambahan",
          baSubmittedDate: new Date().toISOString()
        };
      }
      else if (modalType === "invoice") endpoint = "/api/finance/invoices";
      else if (modalType === "payment") endpoint = "/api/finance/payments";
      else if (modalType === "customer") endpoint = "/api/finance/customers";
      if (modalType === "invoice") {
        payload = {
          ...formData,
          invoiceNo: formData.invoiceNo || "003/POS-AAP/RF/VI/2026",
          customerCode: formData.customerCode || "POS",
          projectSite: formData.projectSite || "POS PROJECT",
          contractNo: formData.contractNo || "002/POS-AAP/2025",
          workPeriod: formData.workPeriod || "Juni 2026",
          jobType: "Mining Production & Overhaul Billing",
          volumeUnit: "BCM",
          revenueGross: totalGrossCalc,
          subTotalDPP: dpp11_12Calc,
          ppn11: vat12Calc,
          pph23: pph23Calc,
          totalInvoice: netTotalInvoiceCalc,
          invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate).toISOString() : new Date().toISOString(),
          notes: `PAYMENT DETAIL (RF Index: ${rfIndexCalculated.toFixed(3)})`
        };
      }

      if (payload.workEndDate) payload.workEndDate = new Date(payload.workEndDate).toISOString();
      if (payload.baSubmittedDate) payload.baSubmittedDate = new Date(payload.baSubmittedDate).toISOString();
      if (payload.baSentDate) payload.baSentDate = new Date(payload.baSentDate).toISOString();
      if (payload.internalRoutingDate) payload.internalRoutingDate = new Date(payload.internalRoutingDate).toISOString();
      if (payload.baSignedDate) payload.baSignedDate = new Date(payload.baSignedDate).toISOString();
      if (payload.invoiceIssuedDate) payload.invoiceIssuedDate = new Date(payload.invoiceIssuedDate).toISOString();
      if (payload.baDate) payload.baDate = new Date(payload.baDate).toISOString();
      if (payload.invoiceDate) payload.invoiceDate = new Date(payload.invoiceDate).toISOString();
      if (payload.paymentDate) payload.paymentDate = new Date(payload.paymentDate).toISOString();

      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        await api(endpoint, { method: "PUT", body: JSON.stringify(payload) });
        onNotice("Data berhasil diperbarui!");
      } else {
        await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
        onNotice("Data baru berhasil ditambahkan!");
      }

      if (modalType === "invoice" && payload.baNoReference) {
        const targetBA = baRows.find((r) => r.baNumber === payload.baNoReference);
        if (targetBA) {
          await api(`/api/finance/ba-trackers/${targetBA.id}`, {
            method: "PUT",
            body: JSON.stringify({
              ...targetBA,
              statusBA: "Ready to Invoice",
              invoiceNoLinked: payload.invoiceNo
            })
          }).catch(() => {});
        }
      }

      setModalType("none");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan data");
    }
  };

  const handleVerifyBA = async (id: number) => {
    try {
      const updated = await verifyBATracker(id, "verify", "Verifikasi Berita Acara oleh SPV Site");
      onNotice("✅ Berita Acara berhasil diverifikasi oleh SPV Site!");
      await loadData();
      if (detailViewItem && detailViewItem.type === "ba" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "ba", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi BA");
    }
  };

  const handleApproveBA = async (id: number) => {
    try {
      const updated = await approveBATracker(id, "approve", "Disetujui oleh Manager");
      onNotice("🎉 Berita Acara disetujui (Approved by Manager)!");
      await loadData();
      if (detailViewItem && detailViewItem.type === "ba" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "ba", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyetujui BA");
    }
  };

  const handleSaveBGGBA = async (baPayload: any, isSubmit = false) => {
    try {
      if (baPayload.id) {
        await api(`/api/finance/ba-trackers/${baPayload.id}`, {
          method: "PUT",
          body: JSON.stringify(baPayload),
        });
      } else {
        await api(`/api/finance/ba-trackers`, {
          method: "POST",
          body: JSON.stringify(baPayload),
        });
      }
      onNotice(isSubmit ? "📤 Berita Acara BGG berhasil diajukan ke HO untuk verifikasi!" : "💾 Draft Berita Acara BGG berhasil disimpan!");
      await loadData();
    } catch (err: any) {
      onNotice(`❌ Gagal menyimpan BA: ${err?.message || err}`);
    }
  };

  const handleGenerateInvoiceFromBA = async (baId: number) => {
    try {
      const newInv: any = await generateInvoiceFromBA(baId);
      onNotice(`⚡ Berhasil membuat Draft Mining Invoice No. ${newInv?.invoiceNo || "091/BGG-AAP/VI/2026"} dari Berita Acara!`);
      await loadData();
    } catch (err: any) {
      onNotice(`❌ Gagal membuat invoice: ${err?.message || err}`);
    }
  };

  const handleVerifyInvoice = async (id: number) => {
    try {
      const updated = await verifyInvoice(id, "verify", "Verifikasi rincian Invoice oleh SPV Site");
      onNotice("✅ Invoice berhasil diverifikasi oleh SPV! Menunggu Approval Tier 1 (Manager).");
      await loadData();
      if (detailViewItem && detailViewItem.type === "invoice" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "invoice", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal memverifikasi Invoice");
    }
  };

  const handleApproveInvoiceTier1 = async (id: number) => {
    try {
      const updated = await approveInvoiceTier1(id, "approve", "Persetujuan Tier 1 oleh Finance Manager");
      onNotice("🎉 Approval Tier 1 (Manager) Berhasil! Menunggu Approval Tier 2 (Direktur).");
      await loadData();
      if (detailViewItem && detailViewItem.type === "invoice" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "invoice", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyetujui Approval Tier 1 Invoice");
    }
  };

  const handleApproveInvoiceTier2 = async (id: number) => {
    try {
      const updated = await approveInvoiceTier2(id, "approve", "Persetujuan Eksekutif Tier 2 oleh Direktur");
      onNotice("🚀 Approval Tier 2 (Direktur) Berhasil! Status Invoice: Issued.");
      await loadData();
      if (detailViewItem && detailViewItem.type === "invoice" && detailViewItem.data.id === id) {
        setDetailViewItem({ type: "invoice", data: updated });
      }
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyetujui Approval Tier 2 Invoice");
    }
  };

  const handleDelete = async (type: "ba" | "invoice" | "payment" | "customer", id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      let endpoint = "";
      if (type === "ba") endpoint = `/api/finance/ba-trackers/${id}`;
      else if (type === "invoice") endpoint = `/api/finance/invoices/${id}`;
      else if (type === "payment") endpoint = `/api/finance/payments/${id}`;
      else if (type === "customer") endpoint = `/api/finance/customers/${id}`;

      await api(endpoint, { method: "DELETE" });
      onNotice("Data berhasil dihapus!");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus data");
    }
  };

  if (loading) {
    return (
      <div className="workspace-body">
        <PageHeader title={viewTitle} description="Memuat data keuangan dan penagihan..." />
        <div className="panel flex items-center justify-center p-12 text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Clock className="animate-spin mr-2 text-cyan-600" size={20} /> Memuat data...
        </div>
      </div>
    );
  }

  // Kalkulasi Live Preview untuk Modal Invoice Standard
  const volPreview = Number(formData.volume || 0);
  const ratePreview = Number(formData.rate || 0);
  const grossPreview = volPreview * ratePreview;
  const solarPreview = Number(formData.solarDeduction || 0);
  const subtotalDPPPreview = grossPreview - solarPreview;
  const ppn11Preview = subtotalDPPPreview * 0.11;
  const pph23Preview = subtotalDPPPreview * 0.02;
  const totalNetInvoicePreview = subtotalDPPPreview + ppn11Preview - pph23Preview;
  // Total Rekapitulasi Aging Matrix untuk Footer Dashboard Table
  const totalAgingMatrix = (dashboardData?.agingMatrix ?? []).reduce(
    (acc: any, row: any) => ({
      notDue: acc.notDue + (row.notDue || 0),
      bucket1_30: acc.bucket1_30 + (row.bucket1_30 || 0),
      bucket31_60: acc.bucket31_60 + (row.bucket31_60 || 0),
      bucket61_90: acc.bucket61_90 + (row.bucket61_90 || 0),
      bucketOver90: acc.bucketOver90 + (row.bucketOver90 || 0),
      total: acc.total + (row.total || 0),
      invoiceCount: acc.invoiceCount + (row.invoiceCount || 0),
    }),
    { notDue: 0, bucket1_30: 0, bucket31_60: 0, bucket61_90: 0, bucketOver90: 0, total: 0, invoiceCount: 0 }
  );

  return (
    <div className="workspace-body space-y-6">
      {/* EXECUTIVE DASHBOARD VIEW */}
      {(viewTitle === "Finance & AR Dashboard" || viewTitle === "Finance AR Dashboard" || viewTitle.includes("AR Dashboard")) && (
        <>
          {/* Top KPI Cards - Neutral & Clean Corporate Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {(dashboardData?.kpis ?? []).map((kpi: any, idx: number) => {
              const label = String(kpi?.Label || kpi?.label || "");
              const tone = String(kpi?.Tone || kpi?.tone || "");
              const isMoney = label.toUpperCase().includes("TOTAL AR") || label.toUpperCase().includes("AR CRITICAL");
              const isPct = label.includes("%");
              const isDays = label.toUpperCase().includes("DSO");
              const rawVal = kpi?.Value !== undefined ? kpi?.Value : kpi?.value;
              const numVal = typeof rawVal === "number" ? rawVal : parseFloat(rawVal || 0) || 0;

              let valStr = String(rawVal ?? 0);
              if (isMoney) valStr = formatIDR(numVal);
              else if (isPct) valStr = `${numVal.toFixed(1)}%`;
              else if (isDays) valStr = `${Math.round(numVal)} Hari`;

              let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
              let badgeText = "Healthy";
              if (tone === "critical") {
                badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                badgeText = "High Risk";
              } else if (tone === "warning") {
                badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                badgeText = "Attention";
              }

              return (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                  <div className="my-2.5">
                    <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">{valStr}</span>
                  </div>
                  <div className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border w-fit font-bold ${badgeStyle}`}>
                    {badgeText}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Aging Bucket Distribution Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={16} className="text-cyan-700" /> Distribusi Umur Piutang (Aging Share)
              </span>
              <span className="text-slate-600 font-bold font-mono">Total AR: {formatIDR(totalAgingMatrix.total)}</span>
            </div>
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.notDue / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-cyan-500 h-full transition-all"
                title={`Not Due: ${formatIDR(totalAgingMatrix.notDue)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucket1_30 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`1-30 Hari: ${formatIDR(totalAgingMatrix.bucket1_30)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucket31_60 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`31-60 Hari: ${formatIDR(totalAgingMatrix.bucket31_60)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucket61_90 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-orange-500 h-full transition-all"
                title={`61-90 Hari: ${formatIDR(totalAgingMatrix.bucket61_90)}`}
              />
              <div
                style={{ width: `${totalAgingMatrix.total ? (totalAgingMatrix.bucketOver90 / totalAgingMatrix.total) * 100 : 0}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`>90 Hari: ${formatIDR(totalAgingMatrix.bucketOver90)}`}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold pt-1">
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span> Not Due ({formatIDR(totalAgingMatrix.notDue)})</div>
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> 1-30 Hari ({formatIDR(totalAgingMatrix.bucket1_30)})</div>
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> 31-60 Hari ({formatIDR(totalAgingMatrix.bucket31_60)})</div>
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> 61-90 Hari ({formatIDR(totalAgingMatrix.bucket61_90)})</div>
              <div className="flex items-center gap-1.5 text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> &gt;90 Hari ({formatIDR(totalAgingMatrix.bucketOver90)})</div>
            </div>
          </div>

          {/* Aging Matrix Table dengan Summary Total Footer Row */}
          <Panel title="📊 Aging Analysis — Posisi Piutang Saat Ini per Customer">
            <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
              <table className="data-table w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Not Due</th>
                    <th className="p-3 text-right">1 - 30 Hari</th>
                    <th className="p-3 text-right">31 - 60 Hari</th>
                    <th className="p-3 text-right">61 - 90 Hari</th>
                    <th className="p-3 text-right">&gt; 90 Hari</th>
                    <th className="p-3 text-right font-black">Total Outstanding</th>
                    <th className="p-3 text-center">Inv Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
                  {(dashboardData?.agingMatrix ?? []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-bold text-cyan-900">{row.customer}</td>
                      <td className="p-3 text-right font-mono text-slate-500">{row.notDue ? formatIDR(row.notDue) : "-"}</td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-semibold">{row.bucket1_30 ? formatIDR(row.bucket1_30) : "-"}</td>
                      <td className="p-3 text-right font-mono text-amber-700 font-semibold">{row.bucket31_60 ? formatIDR(row.bucket31_60) : "-"}</td>
                      <td className="p-3 text-right font-mono text-orange-700 font-semibold">{row.bucket61_90 ? formatIDR(row.bucket61_90) : "-"}</td>
                      <td className="p-3 text-right font-mono text-rose-700 font-semibold">{row.bucketOver90 ? formatIDR(row.bucketOver90) : "-"}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">{formatIDR(row.total)}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600">{row.invoiceCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/95 text-slate-800 font-bold text-xs border-t-2 border-slate-200 uppercase">
                    <td className="p-3 font-black text-slate-800">TOTAL SUMMARY AR</td>
                    <td className="p-3 text-right font-mono text-slate-600">{formatIDR(totalAgingMatrix.notDue)}</td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-bold">{formatIDR(totalAgingMatrix.bucket1_30)}</td>
                    <td className="p-3 text-right font-mono text-amber-700 font-bold">{formatIDR(totalAgingMatrix.bucket31_60)}</td>
                    <td className="p-3 text-right font-mono text-orange-700 font-bold">{formatIDR(totalAgingMatrix.bucket61_90)}</td>
                    <td className="p-3 text-right font-mono text-rose-700 font-bold">{formatIDR(totalAgingMatrix.bucketOver90)}</td>
                    <td className="p-3 text-right font-mono text-sm font-black text-slate-950">{formatIDR(totalAgingMatrix.total)}</td>
                    <td className="p-3 text-center text-slate-700 font-mono font-bold">{totalAgingMatrix.invoiceCount} Inv</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>

          {/* Top Overdue & BA Bottlenecks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Panel title="⚠️ Top Invoice Overdue — Prioritas Collection Action">
                <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                  <table className="data-table w-full text-xs text-left border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                        <th className="p-3">No. Invoice</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Periode</th>
                        <th className="p-3 text-right">Outstanding</th>
                        <th className="p-3 text-center">Aging Days</th>
                        <th className="p-3 text-center">Bucket</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
                      {(dashboardData?.topOverdueInvoices ?? []).map((inv: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono font-bold text-cyan-900">{inv.invoiceNo}</td>
                          <td className="p-3 font-bold text-slate-900">{inv.customerCode}</td>
                          <td className="p-3 text-slate-600 font-mono">{inv.workPeriod}</td>
                          <td className="p-3 text-right font-mono font-bold text-rose-700">{formatIDR(inv.outstanding)}</td>
                          <td className="p-3 text-center font-mono font-bold text-amber-700">{inv.agingDays} hari</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              {inv.agingBucket}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition cursor-pointer"
                              onClick={() => setDetailViewItem({ type: "invoice", data: inv })}
                              title="Lihat Detail & Tracking Log"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {(dashboardData?.topOverdueInvoices ?? []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500 font-medium">
                            🎉 Tidak ada tagihan yang melewati jatuh tempo (Overdue). Semua penagihan dalam batas waktu lancar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <div>
              <Panel title="🐢 Internal BA Bottleneck Summary">
                <div className="space-y-3">
                  {(dashboardData?.baBottlenecks ?? []).map((b: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-xs space-y-1 hover:border-slate-300 transition">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-cyan-900 text-sm">{b.customer}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-200/80 text-slate-700">{b.baCount} BA</span>
                      </div>
                      <div className="text-xs text-slate-600 flex justify-between pt-1 font-medium">
                        <span>Avg Lead Time BA:</span>
                        <span className="font-bold text-amber-700 font-mono">{b.avgLeadTimeBA ? `${Math.round(b.avgLeadTimeBA)} hari` : "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
      {viewTitle === "Invoice Management" && (
        <div className="space-y-6">
          {(() => {
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

            // Penalty static baseline dataset from Excel (Sheet AR Monitoring Row 48-53)
            const penaltyDataRows = [
              { id: "pen-1", customerCode: "SBS", workPeriod: "Dec-25", invoiceNo: "-", remarks: "*Progress Pinalty yang belum di potong", amount: 559207510, outstanding: 559207510, status: "Pending Cut" },
              { id: "pen-2", customerCode: "SBS", workPeriod: "Feb-26", invoiceNo: "-", remarks: "*Progress Pinalty yang belum di potong", amount: 35619126, outstanding: 35619126, status: "Pending Cut" },
              { id: "pen-3", customerCode: "SBS", workPeriod: "Mar-26", invoiceNo: "-", remarks: "*Progress Pinalty yang belum di potong", amount: 403255865, outstanding: 403255865, status: "Pending Cut" }
            ];

            // Subject To Invoice dataset combining Excel baseline (Sheet AR Monitoring Row 55-63) and unlinked BAs
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
                <Panel title={invCardTab === "AR_ANDALAN" ? "Tabel Outstandings AR — Total AR Andalan (Per Client)" : invCardTab === "PENALTY_UNCUT" ? "Tabel Progress Pinalty yang Belum Dipotong (Per Client)" : "Tabel Subject To Invoice — BA Ready To Invoice (Per Client)"}>
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
                          const groupedCust = Array.from(new Set(filteredPen.map((r) => r.customerCode)));

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
                          const groupedCust = Array.from(new Set(filteredSti.map((r) => r.customerCode)));

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
      )}

      {/* BA TRACKER VIEW WITH PERIOD FILTER & STAT CARDS */}
      {viewTitle === "Berita Acara (BA) Tracker" && (() => {
        const availablePeriods = Array.from(new Set(baRows.map((r) => r.workPeriod).filter(Boolean)));
        if (!availablePeriods.includes("Jul-26")) availablePeriods.unshift("Jul-26");
        if (!availablePeriods.includes("Jun-26")) availablePeriods.unshift("Jun-26");

        const periodRows = periodFilter === "All" ? baRows : baRows.filter((r) => r.workPeriod === periodFilter);

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

        const groupedCustomers = Array.from(new Set(filteredBARows.map((r) => r.customerCode || "OTHER")));

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
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border border-emerald-200/80 shadow-2xs space-y-1 relative overflow-hidden">
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
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-amber-50/50 border border-amber-200/80 shadow-2xs space-y-1 relative overflow-hidden">
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
                      className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 border border-indigo-200/80 hover:border-indigo-400 hover:shadow-md transition cursor-pointer space-y-1 relative overflow-hidden group"
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
                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-cyan-50/50 border border-cyan-200/80 shadow-2xs space-y-1 relative overflow-hidden">
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
                                            <span>⚡ + Inv MDO</span>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            className="px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                            onClick={() => createInvoiceFromBA(row, "Operation & Mining")}
                                            title="Terbitkan Sisa Invoice Kategori 1: Operations & Mining"
                                          >
                                            <Pickaxe size={13} />
                                            <span>⚡ + Inv Mining</span>
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
                                              onNotice(`📄 Membuka Detail Invoice ${targetInv.invoiceNo}`);
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
                                                onNotice(`📄 Membuka Detail Invoice No. ${linkedInvoice.invoiceNo} (${linkedInvoice.customerCode})`);
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
                                    {(row.customerCode === "BGG" || row.customerCode === "PT BGG") && !row.invoiceNoLinked && (
                                      <button
                                        type="button"
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                                        onClick={() => handleGenerateInvoiceFromBA(row.id)}
                                        title="1-Click: Buat Invoice Penambangan BGG dari BA ini"
                                      >
                                        <Zap size={13} className="text-amber-300" />
                                        <span>⚡ Buat Inv</span>
                                      </button>
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
      })()}

      {/* PAYMENT & RECEIPT LOG VIEW */}
      {viewTitle === "Payment & Receipt Log" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Recorded Receipt</span>
              <div className="text-2xl font-black text-emerald-700 tracking-tight font-mono mt-1">
                {formatIDR(paymentRows.reduce((sum, r) => sum + (r.amountPaid || 0), 0))}
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              Menampilkan {paymentRows.length} riwayat mutasi pembayaran masuk (Pelunasan & Cicilan Partial)
            </div>
          </div>

          <Panel title="💵 Log Mutasi Pembayaran Masuk (Receiving Cash/Bank)">
            <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
              <table className="data-table w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                    <th className="p-3">Target Invoice</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Nominal Bayar (Rp)</th>
                    <th className="p-3">Tgl Penerimaan</th>
                    <th className="p-3">Receiving Bank</th>
                    <th className="p-3">Ref No</th>
                    <th className="p-3 text-center">Ketepatan Bayar</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
                  {paymentRows
                    .filter((r) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))
                    .map((row: any) => {
                      const linkedInvoice = invoiceRows.find((inv) => inv.invoiceNo === row.invoiceNo);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono font-bold">
                            {linkedInvoice ? (
                              <button
                                type="button"
                                onClick={() => setDetailViewItem({ type: "invoice", data: linkedInvoice })}
                                className="text-cyan-800 hover:text-cyan-950 hover:underline font-bold inline-flex items-center gap-1.5 cursor-pointer"
                                title="Buka Detail & Riwayat Invoice Terkait"
                              >
                                <span>{row.invoiceNo}</span>
                                <ExternalLink size={12} className="text-cyan-600 shrink-0" />
                              </button>
                            ) : (
                              <span className="text-slate-800 font-bold">{row.invoiceNo}</span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{row.customerCode}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatIDR(row.amountPaid)}</td>
                          <td className="p-3 font-mono text-slate-600">{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString("id-ID") : "-"}</td>
                          <td className="p-3 font-semibold text-slate-800">{row.receivingBank}</td>
                          <td className="p-3 font-mono text-slate-500">{row.refNo}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.daysLateOrEarly > 0 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                              {row.daysLateOrEarly > 0 ? `Telat ${row.daysLateOrEarly} Hari` : `On-Time / Awal`}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{row.notes}</td>
                          <td className="p-3 text-right space-x-1.5">
                            <button className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition cursor-pointer" onClick={() => setDetailViewItem({ type: "payment", data: row })} title="Lihat Detail & Tracking Log">
                              <Eye size={14} />
                            </button>
                            <button className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer" onClick={() => openEditModal("payment", row)} title="Edit Payment">
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                              onClick={() => handleDelete("payment", row.id)}
                              title="Hapus Payment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* CUSTOMER MASTER VIEW */}
      {(viewTitle === "Customer & Credit Terms" || viewTitle === "Customer Master & Credit Terms") && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <PageHeader
              title="Customer Master & Credit Terms"
              description="Direktori pelanggan, grup induk entitas (Petrindo, PTBA, Harum Energy), default termin pembayaran, dan performa pembayaran historis."
            />
            <button
              className="primary flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition shrink-0"
              onClick={() => openCreateModal("customer")}
            >
              <Plus size={16} /> Tambah Customer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerRows
              .filter((r) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))
              .map((c: any) => (
                <div key={c.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 relative hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 rounded-md">
                        {c.code}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 mt-1">{c.fullName}</h3>
                      <p className="text-xs text-slate-500 font-medium">Grup: <span className="text-slate-800 font-bold">{c.groupParent}</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Termin Hari</span>
                      <div className="text-lg font-black text-amber-700">{c.terminDays} Hari</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 text-xs text-slate-700 space-y-1.5 font-medium">
                    <div><span className="text-slate-500 font-bold">No. Kontrak:</span> {c.contractNo}</div>
                    <div><span className="text-slate-500 font-bold">Nilai Kontrak:</span> <span className="font-extrabold text-slate-900">{formatIDR(c.contractValue)}</span></div>
                    <div><span className="text-slate-500 font-bold">Kontak AR:</span> {c.contactAR} ({c.emailAR})</div>
                    <div><span className="text-slate-500 font-bold">Catatan:</span> {c.notes}</div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button className="text-xs font-bold text-cyan-800 hover:text-cyan-900 flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-50 border border-cyan-200" onClick={() => setDetailViewItem({ type: "customer", data: c })}>
                      <Eye size={13} /> View Audit
                    </button>
                    <button className="text-xs font-bold text-slate-700 hover:text-cyan-800 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 border border-slate-200" onClick={() => openEditModal("customer", c)}>
                      <Edit2 size={13} /> Edit
                    </button>
                    <button className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-200" onClick={() => handleDelete("customer", c.id)}>
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {/* ================= MODAL DETAIL VIEW & AUDIT TIMELINE WITH PDF PREVIEW (2 KOLOM) ================= */}
      {detailViewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 w-full ${detailViewItem.type === "invoice" ? "max-w-[95vw]" : "max-w-5xl"} shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto transition-all`}>
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                  <FileText size={14} /> Detail View & Audit Log Tracking
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {detailViewItem.type === "ba" ? `Berita Acara: ${detailViewItem.data.baNumber}` : detailViewItem.type === "invoice" ? `Invoice Master: ${detailViewItem.data.invoiceNo}` : detailViewItem.type === "payment" ? `Payment Log: ${detailViewItem.data.invoiceNo}` : `Customer: ${detailViewItem.data.fullName}`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {detailViewItem.type === "invoice" && (
                  <button
                    type="button"
                    onClick={() => exportPaymentDetailPDF(detailViewItem.data)}
                    title="Export / Cetak Dokumen Official INVOICE PDF"
                    className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold rounded-lg transition shadow-xs flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <FileText size={15} /> 📄 Export PDF Invoice
                  </button>
                )}
                <button className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition" onClick={() => setDetailViewItem(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 2-COLUMN LAYOUT (WIDE DISPLAY FOR PAYMENT DETAIL) */}
            <div className={`grid grid-cols-1 ${detailViewItem.type === "invoice" ? "md:grid-cols-12" : "md:grid-cols-5"} gap-6`}>
              {/* LEFT COLUMN (WIDE FOR INVOICE): Structured Record Summary & PDF Preview */}
              <div className={`${detailViewItem.type === "invoice" ? "md:col-span-8" : "md:col-span-3"} space-y-5 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Rincian Dokumen & Nilai Transaksi</h4>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      ID: #{detailViewItem.data.id}
                    </span>
                  </div>
                  {detailViewItem.type === "invoice" && (
                    <button
                      type="button"
                      onClick={() => exportPaymentDetailPDF(detailViewItem.data)}
                      className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold text-xs transition flex items-center gap-1 shadow-xs"
                    >
                      <FileText size={13} /> 🖨️ Cetak / Simpan PDF
                    </button>
                  )}
                </div>

                {/* BA Detail Summary */}
                {detailViewItem.type === "ba" && (
                  <div className="space-y-4">
                    {/* Quick 1-Click Invoice Callout if Ready */}
                    {(detailViewItem.data.statusBA === "Ready to Invoice" || detailViewItem.data.statusBA === "Approved") && (
                      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-600 text-white rounded-xl">
                            <Zap size={20} className="fill-amber-300 text-amber-300" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                              BA Lengkap & Siap Terbit Invoice!
                            </h4>
                            <p className="text-[11px] text-emerald-800 font-medium">
                              Seluruh volume telah diverifikasi dan ditandatangani. Klik tombol untuk auto-generate form Invoice.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => createInvoiceFromBA(detailViewItem.data)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer shrink-0"
                        >
                          <Zap size={14} className="fill-amber-300 text-amber-300" />
                          <span>⚡ Terbitkan Invoice Sekarang</span>
                        </button>
                      </div>
                    )}

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                        <div><span className="text-slate-500 block font-bold">No. BA:</span> <strong className="text-sm font-mono text-cyan-800">{detailViewItem.data.baNumber}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Customer Code:</span> <strong className="text-sm text-slate-900">{detailViewItem.data.customerCode}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Periode Pekerjaan:</span> <strong className="text-slate-800">{detailViewItem.data.workPeriod || "-"}</strong></div>
                        <div><span className="text-slate-500 block font-bold">PIC AAP:</span> <strong className="text-slate-800">{detailViewItem.data.picAAP || "-"}</strong></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-3 border-b border-slate-200 text-[11px]">
                        <div><span className="text-slate-500 block font-bold">Tgl Routing Internal:</span> <strong>{detailViewItem.data.internalRoutingDate ? new Date(detailViewItem.data.internalRoutingDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Tgl BA Diajukan:</span> <strong>{detailViewItem.data.baSubmittedDate ? new Date(detailViewItem.data.baSubmittedDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Tgl BA Dikirim:</span> <strong>{detailViewItem.data.baSentDate ? new Date(detailViewItem.data.baSentDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                        <div><span className="text-slate-500 block font-bold">Tgl TTD BA:</span> <strong>{detailViewItem.data.baSignedDate ? new Date(detailViewItem.data.baSignedDate).toLocaleDateString("id-ID") : "-"}</strong></div>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="text-xs text-emerald-800 font-bold block uppercase font-bold tracking-wider">Nominal Pekerjaan (Nilai Klaim BA)</span>
                        <span className="text-xl font-black text-emerald-900 font-mono">{formatIDR(detailViewItem.data.workAmount || 0)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <div><span className="text-slate-500 block font-bold">Lead Time Approval:</span> <strong className="text-amber-700 font-extrabold text-sm">{detailViewItem.data.leadTimeDays || 0} Hari</strong></div>
                        <div><span className="text-slate-500 block font-bold mb-1">Status BA:</span> {renderBAStatusBadge(detailViewItem.data.statusBA, detailViewItem.data.invoiceNoLinked, undefined, detailViewItem.data, invoiceRows)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">Bottleneck & Notes:</span>
                        <p className="text-amber-800 font-bold mt-0.5">{detailViewItem.data.notesBottleneck}</p>
                        <p className="text-slate-600 text-xs mt-0.5">{detailViewItem.data.notes}</p>
                      </div>
                    </div>

                    {/* PDF PREVIEW CONTAINER SECTION */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h5 className="text-xs font-black uppercase text-cyan-800 tracking-wider flex items-center gap-1.5">
                          <FileText size={15} /> Pratinjau Dokumen PDF (Draft & Final BA)
                        </h5>
                      </div>

                      {/* Draft BA Preview Card */}
                      <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                            <Upload size={14} /> Draft BA PDF Document
                          </span>
                          {detailViewItem.data.draftBAPath ? (
                            <a
                              href={resolveDocumentUrl(detailViewItem.data.draftBAPath)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] px-2.5 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Buka PDF Tab Baru
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                          )}
                        </div>
                        {detailViewItem.data.draftBAPath ? (
                          <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                            <iframe src={resolveDocumentUrl(detailViewItem.data.draftBAPath)} className="w-full h-full" title="Draft BA PDF Preview" />
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                            Draft BA PDF belum diunggah saat entri baru.
                          </div>
                        )}
                      </div>

                      {/* Final BA Preview Card */}
                      <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle size={14} /> Final Signed BA PDF Document
                          </span>
                          {detailViewItem.data.finalBAPath ? (
                            <a
                              href={resolveDocumentUrl(detailViewItem.data.finalBAPath)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Buka PDF Tab Baru
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum Diunggah (Edit untuk upload)</span>
                          )}
                        </div>
                        {detailViewItem.data.finalBAPath ? (
                          <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                            <iframe src={resolveDocumentUrl(detailViewItem.data.finalBAPath)} className="w-full h-full" title="Final BA PDF Preview" />
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                            Final BA Signed PDF dapat diunggah saat mengedit status BA ke Approved.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Detail Summary — Official INVOICE Document Sheet (Dynamic Layout per Customer) */}
                {detailViewItem.type === "invoice" && (() => {
                  const viewCustCode = (detailViewItem.data.customerCode || "POS").toUpperCase();
                  const cCalc = getCustomerCalculations(invLineItems, viewCustCode);
                  const cInfo = customerContractMap[viewCustCode];
                  const isMDO = detailViewItem.data.invoiceCategory === "MDO" || (detailViewItem.data.activityGroup || "").includes("MDO") || (detailViewItem.data.invoiceNo || "").includes("MDO");
                  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

                  return (
                    <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-4 shadow-sm text-xs text-slate-800">
                      {/* Official ANDALAN Logo Header */}
                      <div className="text-center pb-2 border-b border-slate-200">
                        <img src="/andalan-logo.png" alt="ANDALAN Logo" className="h-10 w-auto object-contain mx-auto" />
                      </div>

                      {/* Header Info Block */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200 text-[11px]">
                        <div className="space-y-1">
                          <div className="flex">
                            <span className="w-24 font-bold text-slate-500">Company</span>
                            <span className="font-extrabold text-slate-900">
                              : {viewCustCode === "POS" ? "PT. POSITION" : viewCustCode === "BGG" ? "PT. BUDI GEMA GEMPITA" : viewCustCode === "DBK" ? "PT. PETROSEA TBK" : viewCustCode === "SBS" ? "PT SATRIA BAHANA SARANA" : (detailViewItem.data.customerCode || "PT. ANDALAN")}
                            </span>
                          </div>
                          <div className="flex">
                            <span className="w-24 font-bold text-slate-500">Contractor</span>
                            <span className="font-extrabold text-slate-900">: PT. ANDALAN ARTHA PRIMANUSA</span>
                          </div>
                          <div className="flex">
                            <span className="w-24 font-bold text-slate-500">Project</span>
                            <span className="font-extrabold text-slate-900">: {detailViewItem.data.projectSite || cInfo?.project || "MINING PROJECT"}</span>
                          </div>
                          <div className="flex">
                            <span className="w-24 font-bold text-slate-500">Period Covered</span>
                            <span className="font-extrabold text-slate-900">: {detailViewItem.data.workPeriod || "Juni 2026"}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex">
                            <span className="w-32 font-bold text-slate-500">Invoice No.</span>
                            <span className="font-extrabold text-slate-900 font-mono">: {detailViewItem.data.invoiceNo}</span>
                          </div>
                          <div className="flex">
                            <span className="w-32 font-bold text-slate-500">PO Number</span>
                            <span className="font-extrabold text-slate-900">: {detailViewItem.data.noPO || detailViewItem.data.poNumber || (viewCustCode === "SBS" ? "I05790/0002" : viewCustCode === "POS" ? "PO-POS/2026/001" : "-")}</span>
                          </div>
                          <div className="flex">
                            <span className="w-32 font-bold text-slate-500">Activity Group</span>
                            <span className="font-extrabold text-cyan-900">: {(detailViewItem.data.activityGroup || detailViewItem.data.jobType || (isMDO ? "MINE DEVELOPMENT OPERATION (MDO)" : "OPERATION & MINING")).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center py-1.5 border-b border-slate-200">
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-widest underline decoration-2 underline-offset-4">
                          INVOICE
                        </h4>
                        {viewCustCode === "SBS" ? (
                          <p className="text-xs font-bold text-slate-700 mt-1">
                            (NO KONTRAK : <strong className="font-extrabold text-slate-900">{detailViewItem.data.contractNo || "SPPH-05852"}</strong>)
                          </p>
                        ) : (
                          <p className="text-xs font-bold text-slate-700 mt-1">
                            Contract Number : <strong className="font-extrabold text-slate-900">{detailViewItem.data.contractNo || cInfo?.contract || "002/POS-AAP/2025"}</strong>
                          </p>
                        )}
                      </div>

                      {/* Official INVOICE Table (Dynamic Layout per Customer) */}
                      <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-xs">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/90 text-slate-900 font-extrabold text-[11px] uppercase border-b border-slate-300">
                              <th className="p-2.5 border-r border-slate-300">DESCRIPTION</th>
                              <th className="p-2.5 text-center border-r border-slate-300">{viewCustCode === "SBS" ? "CLAIMED UNIT" : "CLAIMED VOLUME"}</th>
                              <th className="p-2.5 text-center border-r border-slate-300">UoM</th>
                              {viewCustCode === "DBK" ? (
                                <>
                                  <th className="p-2.5 text-right border-r border-slate-300">UNIT RATE (USD)</th>
                                  <th className="p-2.5 text-right border-r border-slate-300">KURS (USD to IDR)</th>
                                </>
                              ) : (
                                <th className="p-2.5 text-right border-r border-slate-300">UNIT RATE (IDR)</th>
                              )}
                              <th className="p-2.5 text-right font-extrabold">AMOUNT (IDR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-900">
                            {/* BGG LAYOUT */}
                            {viewCustCode === "BGG" && (
                              <>
                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">A. OB REMOVAL</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">Bcm</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-1.5 pl-4 text-slate-700">A1. Pit Kungkilan</td></tr>
                                {invLineItems.filter(i => i.section === "A").map(i => (
                                  <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                      {i.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-normal">{i.period}</span>
                                    </td>
                                    <td className="p-2 text-center font-mono border-r border-slate-200">{(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
                                    <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">B. COAL WINNING</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">Ton</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold"><td colSpan={5} className="p-1.5 pl-4 text-slate-700">B1. Pit Kungkilan</td></tr>
                                {invLineItems.filter(i => i.section === "B").map(i => (
                                  <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                                    <td className="p-2 text-center font-mono border-r border-slate-200">{(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{i.unit || "Ton"}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
                                    <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">C. OVER DISTANCE</td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalC)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "C").map(i => {
                                  const diffMtr = (i.overhaulMtr || 1000) - 1000;
                                  return (
                                    <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                      <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                        <div>{i.subSection || "Over Distance"}</div>
                                        <div className="text-[10px] text-slate-500 font-mono font-normal">
                                          {(i.overhaulMtr/1000).toFixed(3)} mtr - 1000 mtr = {diffMtr} mtr &nbsp; &nbsp; {i.period}
                                        </div>
                                      </td>
                                      <td className="p-2 text-center font-mono border-r border-slate-200">{(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                      <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
                                      <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
                                      <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateIDR || 0)))}</td>
                                    </tr>
                                  );
                                })}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">D. RAISE & FALL'S FACTOR</td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalD)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "D").map(i => (
                                  <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                      {i.subSection || ""} {i.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-normal">{i.period}</span>
                                    </td>
                                    <td className="p-2 text-center font-mono border-r border-slate-200">{(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
                                    <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t border-b border-rose-200">
                                  <td colSpan={4} className="p-2 underline">E. DISCOUNT ON OVERDISTANCE</td>
                                  <td className="p-2 text-right font-mono font-black text-rose-900">({formatIDR(Math.abs(cCalc.subtotalE))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "E").map(i => (
                                  <tr key={i.id} className="hover:bg-rose-50/30 border-b border-slate-200">
                                    <td colSpan={4} className="p-2 pl-6 font-medium text-slate-700">{i.description}</td>
                                    <td className="p-2 text-right font-mono font-bold text-rose-800">({formatIDR(Math.abs(i.amount || 0))})</td>
                                  </tr>
                                ))}

                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t border-b border-rose-200">
                                  <td colSpan={4} className="p-2 underline">F. DP FUEL & TRANSPORT</td>
                                  <td className="p-2 text-right font-mono font-black text-rose-900">({formatIDR(Math.abs(cCalc.subtotalF))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "F").map(i => (
                                  <tr key={i.id} className="hover:bg-rose-50/30 border-b border-slate-200">
                                    <td colSpan={4} className="p-2 pl-6 font-medium text-slate-700">{i.description}</td>
                                    <td className="p-2 text-right font-mono font-bold text-rose-800">({formatIDR(Math.abs(i.amount || 0))})</td>
                                  </tr>
                                ))}
                              </>
                            )}

                            {/* DBK LAYOUT (Dual Currency USD & IDR) */}
                            {viewCustCode === "DBK" && (
                              <>
                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">A. OB REMOVAL</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">Bcm</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold"><td colSpan={6} className="p-1.5 pl-4 text-slate-700">A1. PIT SAPAN</td></tr>
                                {invLineItems.filter(i => i.section === "A").map(i => (
                                  <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                                    <td className="p-2 text-center font-mono border-r border-slate-200">{(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{i.unit || "Bcm"}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateUSD || 0).toFixed(3)}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)))}</td>
                                  </tr>
                                ))}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">B. COAL WINNING</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">Ton</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold"><td colSpan={6} className="p-1.5 pl-4 text-slate-700">B1. PIT SAPAN</td></tr>
                                {invLineItems.filter(i => i.section === "B").map(i => (
                                  <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">PIT SAPAN</td>
                                    <td className="p-2 text-center font-mono border-r border-slate-200">{(i.actualVolume || i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{i.unit || "Ton"}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateUSD || 0).toFixed(3)}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)))}</td>
                                  </tr>
                                ))}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">C. OVER DISTANCE</td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalC)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "C").map(i => {
                                  const baseM = i.baseMtr || 1000;
                                  const diff = (i.overhaulMtr || baseM) - baseM;
                                  return (
                                    <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                      <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                        <div>{i.subSection}</div>
                                        <div className="text-[10px] text-slate-500 font-mono font-normal">
                                          PIT SAPAN {(i.overhaulMtr || baseM).toLocaleString("id-ID", { minimumFractionDigits: 2 })} mtr - {baseM} mtr = {diff < 0 ? `(${Math.abs(diff).toFixed(2)})` : diff.toFixed(2)} mtr
                                        </div>
                                      </td>
                                      <td className="p-2 text-center font-mono border-r border-slate-200">{i.volume ? i.volume.toLocaleString("id-ID", { minimumFractionDigits: 3 }) : ""}</td>
                                      <td className="p-2 text-center border-r border-slate-200">{i.volume ? (i.unit || "") : ""}</td>
                                      <td className="p-2 border-r border-slate-200"></td>
                                      <td className="p-2 text-right font-mono border-r border-slate-200">{i.unitRateIDR ? i.unitRateIDR.toFixed(2) : ""}</td>
                                      <td className="p-2 text-right font-mono font-extrabold">{i.volume && i.unitRateIDR ? formatIDR(Math.round(i.volume * i.unitRateIDR)) : "-"}</td>
                                    </tr>
                                  );
                                })}
                              </>
                            )}

                            {/* SBS LAYOUT (OB Area Kerja + Jasa Penunjang Hours) */}
                            {viewCustCode === "SBS" && (
                              <>
                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">OB REMOVAL</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">UoM</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "A").map(i => (
                                  <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                                    <td className="p-2 text-center font-mono border-r border-slate-200">{(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{i.unit || "BCM"}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
                                    <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                  <td className="p-2 underline border-r border-slate-200">JASA PENUNJANG PRODUKSI</td>
                                  <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 font-bold">UoM</td>
                                  <td className="p-2 text-right border-r border-slate-200"></td>
                                  <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(i => (
                                  <tr key={i.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{i.description}</td>
                                    <td className="p-2 text-center font-mono border-r border-slate-200">{(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{i.unit || "Hours"}</td>
                                    <td className="p-2 text-right font-mono border-r border-slate-200">{(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
                                    <td className="p-2 text-right font-mono font-extrabold">{formatIDR(Math.round((i.volume || 0) * (i.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}
                              </>
                            )}

                            {/* POS DEFAULT LAYOUT */}
                            {viewCustCode === "POS" && (() => {
                              const secAItems = invLineItems.filter(i => i.section === "A");
                              const secBItems = invLineItems.filter(i => i.section === "B");
                              const secCItems = invLineItems.filter(i => i.section === "C");
                              const secDItems = invLineItems.filter(i => i.section === "D");

                              return (
                                <>
                                  {secAItems.length > 0 && (
                                    <>
                                      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                        <td className="p-2 underline border-r border-slate-200">{isMDO ? "A. MINE DEVELOPMENT (MDO)" : "A. PRODUCTION"}</td>
                                        <td className="p-2 text-center font-mono border-r border-slate-200 font-black">
                                          {secAItems.reduce((sum, i) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-2 text-center border-r border-slate-200 font-bold">{isMDO ? "" : "Bcm"}</td>
                                        <td className="p-2 text-right border-r border-slate-200"></td>
                                        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalA)}</td>
                                      </tr>
                                      {secAItems.map((item) => {
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        return (
                                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                                            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                                            <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                              {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                                            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}

                                  {secBItems.length > 0 && (
                                    <>
                                      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                        <td className="p-2 underline border-r border-slate-200">B. OVER DISTANCE</td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 text-right border-r border-slate-200"></td>
                                        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalB)}</td>
                                      </tr>
                                      {secBItems.map((item) => {
                                        const effVol = getItemEffectiveVolume(item);
                                        const effMtr = getItemEffectiveOverhaulMtr(item);
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        const diffMtr = effMtr - 1000;
                                        return (
                                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                                            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">
                                              <div>{item.description}</div>
                                              <div className="text-[10px] text-slate-500 font-mono font-normal">
                                                {effMtr} mtr - 1000 mtr = ({diffMtr}) mtr
                                              </div>
                                            </td>
                                            <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                              {effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                                            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}

                                  {secCItems.length > 0 && (
                                    <>
                                      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                        <td className="p-2 underline border-r border-slate-200">C. LAND CLEARING</td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 text-right border-r border-slate-200"></td>
                                        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalC)}</td>
                                      </tr>
                                      {secCItems.map((item) => {
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        return (
                                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                                            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                                            <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                              {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                                            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}

                                  {secDItems.length > 0 && (
                                    <>
                                      <tr className="bg-slate-100/70 font-extrabold text-slate-900 border-t border-b border-slate-300">
                                        <td className="p-2 underline border-r border-slate-200">D. RAISE & FALL'S FACTOR</td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 border-r border-slate-200"></td>
                                        <td className="p-2 text-right border-r border-slate-200"></td>
                                        <td className="p-2 text-right font-mono font-black">{formatIDR(cCalc.subtotalD)}</td>
                                      </tr>
                                      {secDItems.map((item) => {
                                        const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                        return (
                                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                                            <td className="p-2 pl-6 font-bold text-slate-800 border-r border-slate-200">{item.description}</td>
                                            <td className="p-2 text-center font-mono font-bold border-r border-slate-200">
                                              {(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 text-center border-r border-slate-200 text-slate-500 font-normal">{item.unit}</td>
                                            <td className="p-2 text-right font-mono border-r border-slate-200">{unitRate.toLocaleString("id-ID")}</td>
                                            <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                          </tr>
                                        );
                                      })}
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </tbody>

                          {/* TOTALS FOOTER */}
                          <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-[11px]">
                            <tr className="border-b border-slate-200">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left font-extrabold uppercase text-slate-900 border-r border-slate-200">TOTAL (REVENUE GROSS):</td>
                              <td className="p-2 text-right font-mono font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left uppercase text-slate-800 border-r border-slate-200">DPP PPN 11/12:</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.dpp11_12)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left uppercase text-slate-800 border-r border-slate-200">VAT ( 12% ) (+):</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.vat12)}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-2 text-left uppercase text-slate-800 border-r border-slate-200">WITH HOLDING TAX ART 23 (-):</td>
                              <td className="p-2 text-right font-mono font-extrabold text-slate-900">({formatIDR(cCalc.pph23)})</td>
                            </tr>
                            <tr className="bg-slate-100 text-slate-950 font-black text-xs sm:text-sm border-t-2 border-b-2 border-slate-400">
                              <td colSpan={viewCustCode === "DBK" ? 5 : 4} className="p-3 text-left uppercase tracking-wider text-slate-950 font-black border-r border-slate-300">TOTAL INVOICE (NET):</td>
                              <td className="p-3 text-right font-black text-sm sm:text-base text-slate-950 underline">{formatIDR(cCalc.totalInvoice)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* SBS Special Deductions Table (Gambar 4) */}
                      {viewCustCode === "SBS" && (
                        <div className="pt-1">
                          <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-xs">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-100/90 text-slate-900 font-extrabold text-[11px] uppercase border-b border-slate-300">
                                  <th className="p-2.5 border-r border-slate-300" style={{ width: "45%" }}>Pengurang Pembayaran</th>
                                  <th className="p-2.5 text-center border-r border-slate-300" style={{ width: "20%" }}>Claimed Unit</th>
                                  <th className="p-2.5 text-right border-r border-slate-300" style={{ width: "15%" }}>Unit Rate (IDR)</th>
                                  <th className="p-2.5 text-right font-extrabold" style={{ width: "20%" }}>Amount (IDR)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-900">
                                {invLineItems.filter(i => i.section === "P").map(p => (
                                  <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-200">
                                    <td className="p-2 font-bold text-slate-800 border-r border-slate-200">{p.description}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{p.unit || ""}</td>
                                    <td className="p-2 text-right border-r border-slate-200"></td>
                                    <td className="p-2 text-right font-mono font-bold text-rose-800 border-r border-slate-200">{p.amount ? `(${formatIDR(Math.abs(p.amount))})` : "-"}</td>
                                  </tr>
                                ))}
                                <tr className="bg-emerald-50 text-emerald-950 font-black text-sm border-t-2 border-emerald-400">
                                  <td colSpan={3} className="p-3 text-left uppercase tracking-wider text-emerald-950 font-black border-r border-emerald-300">TOTAL DIBAYAR:</td>
                                  <td className="p-3 text-right font-black text-base text-emerald-900 underline">{formatIDR(cCalc.totalDibayar)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Notes Footer */}
                      {(() => {
                        if (isMDO) return null;
                        return (
                          <div className="pt-2 text-[10px] font-mono text-slate-600 space-y-0.5">
                            <p className="font-bold text-slate-800">Note:</p>
                            {viewCustCode === "BGG" ? (
                              <>
                                <p>1. Raise & Fall's Factor Feb 26: <strong className="text-slate-900">1,274</strong></p>
                                <p>2. Raise & Fall's Factor Juni 26: <strong className="text-slate-900">1,560</strong></p>
                              </>
                            ) : (
                              <p>1. Raise & Fall's Factor: <strong className="text-slate-900">{rfIndexCalculated.toFixed(3)}</strong></p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Bottom Info Grid: Bank Account from Master Data & Blank Signature Area */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t-2 border-slate-900 text-[11px]">
                        {/* Left: Bank Account Info from Master Data */}
                        <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-1">
                          <p className="font-extrabold uppercase text-slate-900 tracking-wider">PLEASE MAKE PAYMENT TO THIS ACCOUNT:</p>
                          <div className="pt-1 text-[11px] space-y-1">
                            <div className="flex"><span className="w-24 font-bold text-slate-500">Bank Name</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.bankName || cInfo?.bankName || "Bank BNI"}</span></div>
                            <div className="flex"><span className="w-24 font-bold text-slate-500">A/C Name</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.bankAccountName || "PT Andalan Artha Primanusa"}</span></div>
                            <div className="flex"><span className="w-24 font-bold text-slate-500">A/C No</span><span className="font-black text-cyan-900">: {detailViewItem.data.bankAccountNo || cInfo?.bankAccountNo || "8188788882"}</span></div>
                            <div className="flex"><span className="w-24 font-bold text-slate-500">Branch</span><span className="font-extrabold text-slate-900">: {detailViewItem.data.bankBranch || cInfo?.bankBranch || "Harmoni, Jakarta"}</span></div>
                          </div>
                        </div>

                        {/* Right: Signature Area (Blank as requested) */}
                        <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg flex flex-col justify-between text-center">
                          <div className="text-right text-[10px] text-slate-600 font-bold">
                            Jakarta, {formattedDate}
                          </div>
                          <div className="pt-1">
                            <p className="text-[10px] font-extrabold uppercase text-slate-700">SUBMITTED BY,</p>
                            <p className="text-[11px] font-black text-slate-900">PT ANDALAN ARTHA PRIMANUSA</p>
                          </div>

                          {/* Blank signature space (no stamp/signature) */}
                          <div className="h-14 border-b border-dashed border-slate-400 my-2 flex items-center justify-center text-[10px] text-slate-400 italic">
                            ( Area Tanda Tangan & Stempel — Kosong )
                          </div>

                          <div>
                            <p className="text-[11px] font-black underline text-slate-900">{detailViewItem.data.directorName || cInfo?.directorName || "GAHARI CHRISTINE"}</p>
                            <p className="text-[10px] font-bold text-slate-600">{detailViewItem.data.directorTitle || cInfo?.directorTitle || "DIRECTOR"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment Detail Summary */}
                {detailViewItem.type === "payment" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                      <div><span className="text-slate-500 block font-bold">Target Invoice:</span> <strong className="text-sm font-mono text-cyan-800">{detailViewItem.data.invoiceNo}</strong></div>
                      <div><span className="text-slate-500 block font-bold">Customer:</span> <strong className="text-sm text-slate-900">{detailViewItem.data.customerCode}</strong></div>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-xs text-emerald-800 font-bold block uppercase">Jumlah Uang Masuk Received</span>
                      <span className="text-2xl font-black text-emerald-900">{formatIDR(detailViewItem.data.amountPaid)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500 block">Bank Receiving:</span> <strong>{detailViewItem.data.receivingBank}</strong></div>
                      <div><span className="text-slate-500 block">No. Ref Transfer:</span> <strong className="font-mono">{detailViewItem.data.refNo}</strong></div>
                    </div>
                    <div><span className="text-slate-500 block">Ketepatan Bayar:</span> <span className="font-bold text-amber-700">{detailViewItem.data.daysLateOrEarly > 0 ? `Telat ${detailViewItem.data.daysLateOrEarly} Hari` : "On-Time / Tepat Waktu"}</span></div>
                    <div><span className="text-slate-500 block">Catatan:</span> <p className="text-slate-700 font-medium">{detailViewItem.data.notes}</p></div>
                  </div>
                )}

                {/* Customer Detail Summary */}
                {detailViewItem.type === "customer" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                    <div><span className="text-slate-500 block font-bold">Nama Customer:</span> <strong className="text-base text-slate-900">{detailViewItem.data.fullName} ({detailViewItem.data.code})</strong></div>
                    <div><span className="text-slate-500 block font-bold">Induk Perusahaan:</span> <strong className="text-slate-800">{detailViewItem.data.groupParent}</strong></div>
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200">
                      <div><span className="text-slate-500 block">Termin Hari:</span> <strong className="text-amber-700 font-extrabold text-sm">{detailViewItem.data.terminDays} Hari</strong></div>
                      <div><span className="text-slate-500 block">Nilai Kontrak:</span> <strong className="text-slate-900 font-black">{formatIDR(detailViewItem.data.contractValue)}</strong></div>
                    </div>
                    <div><span className="text-slate-500 block font-bold">No. Kontrak:</span> <strong className="text-slate-800">{detailViewItem.data.contractNo}</strong></div>
                    <div><span className="text-slate-500 block font-bold">Kontak Penagihan AR:</span> <p className="text-slate-700 font-medium">{detailViewItem.data.contactAR} ({detailViewItem.data.emailAR} | {detailViewItem.data.phone})</p></div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN (DYNAMIC SPAN FOR INVOICE): Vertical Audit Trail & Payment Tracker */}
              <div className={`${detailViewItem.type === "invoice" ? "md:col-span-4" : "md:col-span-2"} space-y-4`}>
                {/* PAYMENT TRACKER FOR INVOICE */}
                {detailViewItem.type === "invoice" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="text-cyan-800" size={16} />
                        <h4 className="text-xs font-black uppercase tracking-wider text-cyan-800">
                          Payment Tracker (Cicilan)
                        </h4>
                      </div>
                      <button
                        onClick={() => setShowAddPartialPayment(!showAddPartialPayment)}
                        className="px-3 py-1 text-xs font-extrabold bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <Plus size={14} /> {showAddPartialPayment ? "Batal" : "Catat Cicilan"}
                      </button>
                    </div>

                    {/* Progress Bar & Summary */}
                    {(() => {
                      const totalInv = detailViewItem.data.totalReceipt || detailViewItem.data.totalInvoice || 1;
                      const paid = detailViewItem.data.totalPaid || 0;
                      const outstanding = detailViewItem.data.outstanding !== undefined ? detailViewItem.data.outstanding : (totalInv - paid);
                      const percent = Math.min(100, Math.round((paid / totalInv) * 100));

                      return (
                        <div className="space-y-2.5 text-xs">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                              <span className="text-[10px] text-emerald-800 block uppercase font-bold tracking-wider">Total Terbayar</span>
                              <strong className="text-emerald-900 text-sm font-black">{formatIDR(paid)}</strong>
                            </div>
                            <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                              <span className="text-[10px] text-rose-800 block uppercase font-bold tracking-wider">Sisa Tagihan</span>
                              <strong className="text-rose-900 text-sm font-black">{formatIDR(outstanding)}</strong>
                            </div>
                          </div>

                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-600">Status Pelunasan</span>
                              <span className="text-cyan-800 font-extrabold">{percent}% Lunas</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                              <div className="bg-gradient-to-r from-cyan-600 to-emerald-500 h-full transition-all duration-300" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Form Catat Cicilan Baru */}
                    {showAddPartialPayment && (
                      <form onSubmit={handleSavePartialPayment} className="bg-white border border-slate-300 p-3.5 rounded-xl shadow-xs space-y-3 text-xs text-slate-800 mt-2">
                        <div className="font-extrabold text-cyan-800 border-b border-slate-200 pb-2 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                          <DollarSign size={14} className="text-cyan-700" /> Form Entri Cicilan Baru
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Nominal Bayar (Rp) <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="Contoh: 5000000000"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-extrabold focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition font-mono"
                            value={partialPaymentForm.amountPaid}
                            onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, amountPaid: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                              Tgl Bayar <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="date"
                              required
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition"
                              value={partialPaymentForm.paymentDate}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, paymentDate: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                              Bank Penerima
                            </label>
                            <input
                              type="text"
                              placeholder="Bank Mandiri Escrow"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition"
                              value={partialPaymentForm.receivingBank}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, receivingBank: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                              No. Ref Transfer
                            </label>
                            <input
                              type="text"
                              placeholder="TRF-MND-XXXX"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition font-mono"
                              value={partialPaymentForm.refNo}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, refNo: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                              Catatan
                            </label>
                            <input
                              type="text"
                              placeholder="Cicilan ke-1"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:border-cyan-700 focus:bg-white focus:ring-2 focus:ring-cyan-600/20 outline-none transition"
                              value={partialPaymentForm.notes}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, notes: e.target.value })}
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 text-xs mt-1"
                        >
                          Simpan Cicilan (Menunggu Verifikasi)
                        </button>
                      </form>
                    )}

                    {/* Riwayat List Cicilan */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 max-h-60 overflow-y-auto pr-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Daftar History Cicilan:</span>
                      {(() => {
                        const linkedPayments = paymentRows.filter((p: any) => p.invoiceNo === detailViewItem.data.invoiceNo);
                        if (linkedPayments.length === 0) {
                          return <p className="text-[11px] text-slate-500 italic py-1">Belum ada rincian cicilan yang terdaftar.</p>;
                        }
                        return linkedPayments.map((p: any, pIdx: number) => {
                          const isVerified = p.verificationStatus === "Verified" || !p.verificationStatus;
                          return (
                            <div key={p.id || pIdx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-xs text-xs">
                              <div className="flex justify-between items-start">
                                <span className="font-black text-emerald-700 font-mono text-sm">{formatIDR(p.amountPaid)}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${isVerified ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                                  {isVerified ? "✓ Verified" : "⏳ Pending Verifikasi"}
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
                                <span>Tgl: {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("id-ID") : "-"}</span>
                                <span>{p.receivingBank || "-"}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1.5 border-t border-slate-100 font-medium">
                                <span>Inputter: <strong className="text-slate-800 font-bold">{p.createdBy || "AR Admin"}</strong></span>
                                {isVerified && p.verifiedBy && (
                                  <span>Verifikator: <strong className="text-cyan-800 font-bold">{p.verifiedBy}</strong></span>
                                )}
                              </div>
                              {!isVerified && (
                                <button
                                  onClick={() => handleVerifyPartialPayment(p.id)}
                                  className="w-full mt-2 py-1.5 text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                  <CheckCircle2 size={14} /> Verifikasi Pembayaran (1-Level)
                                </button>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-800 flex items-center gap-1.5">
                    <History size={16} /> Audit Trail & Flow Tracking
                  </h4>
                  <span className="text-[11px] text-slate-400 font-bold">Jejak Aktivitas User</span>
                </div>

                {/* Vertical Stepper Timeline */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {generateAuditTimeline(detailViewItem.type, detailViewItem.data).map((log: any, idx: number) => {
                    let circleColor = "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100";
                    if (log.status === "pending") circleColor = "bg-slate-300 text-slate-600";
                    else if (log.status === "warning") circleColor = "bg-amber-500 text-white ring-4 ring-amber-100";
                    else if (log.status === "rejected") circleColor = "bg-rose-600 text-white ring-4 ring-rose-100";

                    return (
                      <div key={idx} className="relative group">
                        {/* Circle Node */}
                        <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${circleColor}`}>
                          {idx + 1}
                        </div>

                        {/* Log Content Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs space-y-1">
                          <div className="flex justify-between items-start">
                            <h5 className="font-extrabold text-slate-900 text-xs">{log.title}</h5>
                            <span className="text-[10px] font-mono text-slate-500 font-bold">{log.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <User size={12} className="text-cyan-700" />
                            <span className="font-bold text-slate-900">{log.user}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">{log.role}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 pt-0.5 font-medium leading-relaxed">{log.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer (Sticky at bottom) */}
            <div className="sticky -bottom-6 sm:-bottom-7 bg-white border-t border-slate-200 pt-4 pb-6 sm:pb-7 -mx-6 sm:-mx-7 px-6 sm:px-7 rounded-b-2xl z-20 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                {detailViewItem.type === "ba" && (
                  <>
                    {isSPV && (["Submit", "Pending Berita Acara", "Draft", "Revisi", "Rejected"].includes(detailViewItem.data.statusBA) || !detailViewItem.data.statusBA) && (
                      <button
                        className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                        onClick={() => handleVerifyBA(detailViewItem.data.id)}
                      >
                        <ShieldCheck size={14} /> Verifikasi SPV Site
                      </button>
                    )}
                    {isManager && (["Pending Berita Acara", "Verified", "Submit", "Draft", "Revisi"].includes(detailViewItem.data.statusBA)) && (
                      <button
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                        onClick={() => handleApproveBA(detailViewItem.data.id)}
                      >
                        <CheckCircle2 size={14} /> Approve Manager
                      </button>
                    )}
                  </>
                )}

                {detailViewItem.type === "invoice" && (
                  <>
                    {isSPV && (detailViewItem.data.status === "Draft" || !detailViewItem.data.status || detailViewItem.data.status === "Pending") && (
                      <button
                        className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                        onClick={() => handleVerifyInvoice(detailViewItem.data.id)}
                      >
                        <ShieldCheck size={14} /> Verifikasi SPV
                      </button>
                    )}
                    {isManager && (detailViewItem.data.status === "Verified" || detailViewItem.data.status === "Draft" || detailViewItem.data.status === "Pending") && (
                      <button
                        className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                        onClick={() => handleApproveInvoiceTier1(detailViewItem.data.id)}
                      >
                        <UserCheck size={14} /> Approve Mgr (Tier 1)
                      </button>
                    )}
                    {isDirector && (detailViewItem.data.status === "Approved_Tier1" || detailViewItem.data.status === "Verified") && (
                      <button
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                        onClick={() => handleApproveInvoiceTier2(detailViewItem.data.id)}
                      >
                        <FileCheck size={14} /> Approve Dir (Tier 2)
                      </button>
                    )}
                  </>
                )}
              </div>
              <button
                className="px-6 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-sm"
                onClick={() => setDetailViewItem(null)}
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODERN BEGINNER-FRIENDLY MODAL FORMS */}
      {modalType !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-2 sm:p-4">
          <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 w-full ${modalType === "ba" || modalType === "pending_volume" || modalType === "invoice" ? "max-w-[98vw] 2xl:max-w-[1680px]" : "max-w-3xl"} shadow-2xl space-y-6 max-h-[96vh] overflow-y-auto transition-all`}>
            {/* Modal Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                    <FileText size={14} /> {modalType === "ba" ? "Berita Acara & Audit Intelligence Hub" : "Form Entri Keuangan"}
                  </span>
                  {modalType === "ba" && editItem && (
                    renderBAStatusBadge(formData.statusBA || editItem.statusBA, formData.invoiceNoLinked || editItem.invoiceNoLinked, undefined, editItem || formData, invoiceRows)
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {modalType === "ba"
                    ? (editItem ? `Berita Acara: ${formData.baNumber || formData.signedBANumber || formData.draftBARefNo || "Draft BA"}` : "Input Berita Acara Baru")
                    : `${editItem ? "Edit Data" : "Tambah Data Baru"} — ${modalType === "pending_volume" ? "Pending Volume (Joint Survey)" : modalType === "invoice" ? "Invoice" : modalType === "payment" ? "Payment Receipt" : "Customer Master"}`
                  }
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {modalType === "ba" && editItem && (
                  <>
                    {(formData.statusBA === "Ready to Invoice" || formData.statusBA === "Approved" || editItem.statusBA === "Ready to Invoice") && (
                      (editItem.customerCode === "POS" || formData.customerCode === "POS") ? (
                        (() => {
                          const modalInvStatus = getBAInvoiceStatus(editItem || formData, invoiceRows);
                          if (modalInvStatus.isFullyInvoiced) {
                            return (
                              <span className="px-3 py-1.5 rounded-xl bg-purple-100 border border-purple-300 text-purple-900 font-extrabold text-xs flex items-center gap-1.5 shadow-xs">
                                <Archive size={14} className="text-purple-700" />
                                <span>2/2 Invoice Telah Terbit</span>
                              </span>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1.5">
                              {/* Tombol Inv Mining jika belum dibuat */}
                              {!modalInvStatus.createdMiningInv && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    createInvoiceFromBA(editItem || formData, "Operation & Mining");
                                  }}
                                  className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                  title="Auto-generate Form Invoice Kategori 1: Operations & Mining"
                                >
                                  <Pickaxe size={14} />
                                  <span>⚡ Terbitkan Inv Mining</span>
                                </button>
                              )}
                              {/* Tombol Inv MDO jika belum dibuat */}
                              {!modalInvStatus.createdMDOInv && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    createInvoiceFromBA(editItem || formData, "MDO");
                                  }}
                                  className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                  title="Auto-generate Form Invoice Kategori 2: Mine Development (MDO)"
                                >
                                  <Building2 size={14} />
                                  <span>🏗️ Terbitkan Inv MDO</span>
                                </button>
                              )}
                              {/* Info Invoice yang sudah terbit jika ada */}
                              {modalInvStatus.isPartiallyInvoiced && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetInv = modalInvStatus.createdMiningInv || modalInvStatus.createdMDOInv;
                                    if (targetInv) {
                                      setDetailViewItem({ type: "invoice", data: targetInv });
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 font-extrabold text-xs flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Archive size={12} className="text-purple-700" />
                                  <span>{modalInvStatus.createdMiningInv ? "Inv Mining ✓" : "Inv MDO ✓"}</span>
                                  <ExternalLink size={11} className="text-purple-700 ml-0.5" />
                                </button>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setModalType("none");
                            createInvoiceFromBA(editItem || formData);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                          title="Auto-generate Form Invoice dari BA ini"
                        >
                          <Zap size={14} className="fill-amber-300 text-amber-300" />
                          <span>⚡ Terbitkan Invoice</span>
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      onClick={() => setIsInlineEditingBA(!isInlineEditingBA)}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs border cursor-pointer ${
                        isInlineEditingBA
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                          : "bg-cyan-700 hover:bg-cyan-800 text-white border-cyan-800"
                      }`}
                      title={isInlineEditingBA ? "Alihkan ke Mode Pratinjau Bersih" : "Buka Mode Edit Data"}
                    >
                      {isInlineEditingBA ? (
                        <>
                          <Eye size={14} /> 👁️ Mode Pratinjau
                        </>
                      ) : (
                        <>
                          <Edit2 size={14} /> ✏️ Mode Edit Data
                        </>
                      )}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
                  onClick={() => setModalType("none")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 text-sm font-medium text-slate-800">

              {/* ================= MODAL INVOICE MASTER (PAYMENT DETAIL GENERATOR) ================= */}
              {modalType === "invoice" && (
                <div className="space-y-5 text-xs">
                  {/* Header Info Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2">
                      <h4 className="text-sm font-black text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
                        <FileText size={16} className="text-cyan-800" /> INVOICE GENERATOR
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={loadDemoPOSData}
                          className="px-2 py-1 text-[11px] font-extrabold text-cyan-900 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 rounded transition flex items-center gap-1"
                          title="Isi otomatis dengan data demo POS Mining"
                        >
                          <Pickaxe size={12} /> ⚡ Demo POS
                        </button>
                        <button
                          type="button"
                          onClick={loadDemoBGGData}
                          className="px-2 py-1 text-[11px] font-extrabold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded transition flex items-center gap-1"
                          title="Isi otomatis dengan data demo BGG Mining (Gambar 2)"
                        >
                          <Pickaxe size={12} /> ⚡ Demo BGG
                        </button>
                        <button
                          type="button"
                          onClick={loadDemoDBKData}
                          className="px-2 py-1 text-[11px] font-extrabold text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded transition flex items-center gap-1"
                          title="Isi otomatis dengan data demo DBK Petrosea (Gambar 3)"
                        >
                          <Pickaxe size={12} /> ⚡ Demo DBK
                        </button>
                        <button
                          type="button"
                          onClick={loadDemoSBSData}
                          className="px-2 py-1 text-[11px] font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded transition flex items-center gap-1"
                          title="Isi otomatis dengan data demo SBS Mining (Gambar 4)"
                        >
                          <Pickaxe size={12} /> ⚡ Demo SBS
                        </button>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-300">
                          RF Index: <strong className="text-amber-700 font-mono font-black">{rfIndexCalculated.toFixed(3)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Prominent BA Reference Bar */}
                    <div className="bg-cyan-50/80 border border-cyan-200 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="text-xs font-extrabold text-cyan-950 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                        <FileCheck size={15} className="text-cyan-800" /> Pilih No. BA (Auto-Fill):
                      </label>
                      <select
                        className="bg-white border border-cyan-300 font-bold text-cyan-950 text-xs px-3 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full shadow-xs"
                        value={formData.baNoReference || ""}
                        onChange={(e) => handleBASelect(e.target.value)}
                      >
                        <option value="">-- Tanpa BA Reference (Input Manual) --</option>
                        {baRows.map((ba: any) => (
                          <option key={ba.id} value={ba.baNumber}>
                            {ba.baNumber} — Client: {ba.customerCode} — Periode: {ba.workPeriod || "-"} ({formatIDR(ba.workAmount || 0)}) [{ba.statusBA || "Submit"}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2-Column Info Grid with Equal Label Spacing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                      {/* Left Column */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Company:</span>
                          <select
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            value={formData.customerCode || ""}
                            onChange={(e) => handleCompanySelect(e.target.value)}
                          >
                            <option value="">-- Pilih Customer --</option>
                            {customerRows.map((c: any) => (
                              <option key={c.id || c.code} value={c.code}>
                                {c.code} — {c.fullName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Contractor:</span>
                          <span className="font-extrabold text-slate-800 px-2 py-1 bg-slate-100/70 rounded border border-slate-200 flex-1">
                            PT. ANDALAN ARTHA PRIMANUSA
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Project:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full"
                            value={formData.projectSite || ""}
                            onChange={(e) => setFormData({ ...formData, projectSite: e.target.value })}
                            placeholder="Otomatis terisi dari Master Customer / BA"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Period Covered:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            placeholder="Juni 2026 / Jul-26"
                            value={formData.workPeriod || ""}
                            onChange={(e) => {
                              const newPeriod = e.target.value;
                              const newInvNo = generateInvoiceNumber(formData.customerCode || "POS", newPeriod, invoiceRows.length);
                              setFormData({ ...formData, workPeriod: newPeriod, invoiceNo: newInvNo });
                            }}
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Invoice No.:</span>
                          <input
                            className="bg-white border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            placeholder="003/POS-AAP/RF/VI/2026"
                            value={formData.invoiceNo || ""}
                            onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                            required
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Activity Group:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            value={formData.activityGroup || "OPERATION & MINING"}
                            onChange={(e) => setFormData({ ...formData, activityGroup: e.target.value })}
                            placeholder="OPERATION & MINING"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">PO Number:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-2.5 py-1.5 rounded-lg focus:border-cyan-600 outline-none flex-1 w-full"
                            placeholder="PO-POS-2026-001"
                            value={formData.noPO || formData.poNumber || ""}
                            onChange={(e) => setFormData({ ...formData, noPO: e.target.value, poNumber: e.target.value })}
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-28 text-slate-500 font-bold shrink-0">Contract Number:</span>
                          <input
                            className="bg-white border border-slate-300 font-extrabold text-slate-800 text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 w-full"
                            placeholder="Otomatis terisi dari Master Customer / BA"
                            value={formData.contractNo || ""}
                            onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Master Bank Account Selector */}
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <label className="text-xs font-black uppercase text-cyan-900 tracking-wider flex items-center gap-1.5 shrink-0">
                          <Receipt size={15} className="text-cyan-800" /> Rekening Pembayaran (Master Bank Account):
                        </label>
                        <select
                          className="bg-white border border-slate-300 font-extrabold text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:border-cyan-600 outline-none shadow-xs"
                          value={formData.bankName || "Bank BNI"}
                          onChange={(e) => {
                            const selectedBank = masterBankAccounts.find(b => b.bankName === e.target.value) || masterBankAccounts[0];
                            setFormData({
                              ...formData,
                              bankName: selectedBank.bankName,
                              bankAccountName: selectedBank.bankAccountName,
                              bankAccountNo: selectedBank.bankAccountNo,
                              bankBranch: selectedBank.bankBranch,
                            });
                          }}
                        >
                          {masterBankAccounts.map((b) => (
                            <option key={b.id} value={b.bankName}>
                              {b.bankName} — A/C {b.bankAccountNo} ({b.bankBranch})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-sans text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">Bank Name:</span> <strong>{formData.bankName || "Bank BNI"}</strong></div>
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">A/C Name:</span> <strong>{formData.bankAccountName || "PT Andalan Artha Primanusa"}</strong></div>
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">A/C No:</span> <strong className="text-cyan-900 font-black">{formData.bankAccountNo || "8188788882"}</strong></div>
                        <div><span className="text-slate-500 block font-sans text-[10px] font-bold">Branch:</span> <strong>{formData.bankBranch || "Harmoni, Jakarta"}</strong></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">M-Rate (Kurs Tengah BI)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                          <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={mRate === 0 ? "" : mRate} onFocus={(e) => e.target.select()} onChange={(e) => setMRate(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">Fuel Price ($F_n$ USD/L)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">$</span>
                          <input type="number" step="0.001" className="w-full bg-slate-50 border border-slate-300 rounded pl-6 pr-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={fuelPriceUSD === 0 ? "" : fuelPriceUSD} onFocus={(e) => e.target.select()} onChange={(e) => setFuelPriceUSD(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-500">Labor Price ($L_n$ IDR)</label>
                        <div className="relative mt-0.5">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                          <input type="number" className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={laborPriceIDR === 0 ? "" : laborPriceIDR} onFocus={(e) => e.target.select()} onChange={(e) => setLaborPriceIDR(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DYNAMIC PAYMENT DETAIL TABLE PER CUSTOMER */}
                  {(() => {
                    const currentCust = (formData.customerCode || "POS").toUpperCase();
                    const cCalc = getCustomerCalculations(invLineItems, currentCust);

                    return (
                      <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                              <th className="p-2.5 text-center w-10">Del</th>
                              <th className="p-2.5">DESCRIPTION</th>
                              <th className="p-2.5 text-center">{currentCust === "SBS" ? "CLAIMED UNIT" : "CLAIMED VOLUME / DISTANCE"}</th>
                              {currentCust === "DBK" ? (
                                <>
                                  <th className="p-2.5 text-right">UNIT RATE (USD)</th>
                                  <th className="p-2.5 text-right">KURS (USD to IDR)</th>
                                </>
                              ) : (
                                <th className="p-2.5 text-right">UNIT RATE (IDR)</th>
                              )}
                              <th className="p-2.5 text-right font-extrabold">AMOUNT (IDR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-medium">

                            {/* BGG CUSTOMER TABLE (Gambar 2) */}
                            {currentCust === "BGG" && (
                              <>
                                {/* Section A: OB Removal */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">A. OB REMOVAL (Pit Kungkilan)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "A").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">
                                      {item.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-mono font-normal">({item.period})</span>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section B: Coal Winning */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">B. COAL WINNING</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Ton
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Ton"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section C: Over Distance */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">C. OVER DISTANCE</td>
                                  <td className="p-2 text-center"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "C").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">
                                      <div>{item.subSection || "Over Distance"}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Dist: {item.overhaulMtr} mtr &nbsp; &nbsp; ({item.period})
                                      </div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section D: Raise & Fall Factor */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
                                  <td className="p-2 text-center"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalD)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "D").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">
                                      {item.subSection || ""} {item.description} &nbsp; &nbsp; <span className="text-[10px] text-slate-500 font-mono">({item.period})</span>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section E: Discount on Overdistance */}
                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                  <td className="p-2 text-center text-rose-400">#</td>
                                  <td colSpan={3} className="p-2 underline">E. DISCOUNT ON OVERDISTANCE (Deduction)</td>
                                  <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalE))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "E").map(item => (
                                  <tr key={item.id} className="hover:bg-rose-50/30 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                    <td className="p-2 text-right font-mono">
                                      <input type="number" className="w-32 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.amount === 0 ? "" : Math.abs(item.amount)} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemAmount(item.id, -(e.target.value === "" ? 0 : Math.abs(parseFloat(e.target.value)) || 0))} />
                                    </td>
                                  </tr>
                                ))}

                                {/* Section F: DP Fuel & Transport */}
                                <tr className="bg-rose-50/70 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                  <td className="p-2 text-center text-rose-400">#</td>
                                  <td colSpan={3} className="p-2 underline">F. DP FUEL & TRANSPORT (Deduction)</td>
                                  <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalF))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "F").map(item => (
                                  <tr key={item.id} className="hover:bg-rose-50/30 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                    <td className="p-2 text-right font-mono">
                                      <input type="number" className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.amount === 0 ? "" : Math.abs(item.amount)} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemAmount(item.id, -(e.target.value === "" ? 0 : Math.abs(parseFloat(e.target.value)) || 0))} />
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )}

                            {/* DBK PETROSEA CUSTOMER TABLE (Gambar 3 - Dual Currency) */}
                            {currentCust === "DBK" && (
                              <>
                                {/* Section A: OB Removal */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">A. OB REMOVAL (Pit Sapan)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })} Bcm
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "A").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.001" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.001" className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateUSD(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="17140.76" value={item.kursBI === 0 ? "" : (item.kursBI ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemKurs(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17140.76)))}</td>
                                  </tr>
                                ))}

                                {/* Section B: Coal Winning */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">B. COAL WINNING (Pit Sapan)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 3 })} Ton
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.001" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Ton"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.001" className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.unitRateUSD === 0 ? "" : (item.unitRateUSD ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateUSD(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="17140.76" value={item.kursBI === 0 ? "" : (item.kursBI ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemKurs(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateUSD || 0) * (item.kursBI || 17140.76)))}</td>
                                  </tr>
                                ))}

                                {/* Section C: Over Distance */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">C. OVER DISTANCE</td>
                                  <td className="p-2 text-center"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "C").map(item => {
                                  const baseM = item.baseMtr || 1000;
                                  const diff = (item.overhaulMtr || baseM) - baseM;
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition">
                                      <td className="p-2 text-center">
                                        <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                      </td>
                                      <td className="p-2 font-bold text-slate-800">
                                        <div>{item.subSection}</div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                                          <span>Dist:</span>
                                          <input type="number" className="w-16 bg-slate-50 border border-slate-300 font-mono text-[10px] px-1 py-0.5 rounded text-right" placeholder={String(baseM)} value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemOverhaul(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                          <span>m - {baseM}m = {diff}m</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <input type="number" step="0.001" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0.000" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                          <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Bcm"}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-right font-mono text-slate-400">-</td>
                                      <td className="p-2 text-right">
                                        <input type="number" step="0.01" className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                      </td>
                                      <td className="p-2 text-right font-mono font-extrabold text-slate-900">{item.volume && item.unitRateIDR ? formatIDR(Math.round(item.volume * item.unitRateIDR)) : "-"}</td>
                                    </tr>
                                  );
                                })}
                              </>
                            )}

                            {/* SBS CUSTOMER TABLE (Gambar 4 - OB & Jasa Penunjang & Deductions) */}
                            {currentCust === "SBS" && (
                              <>
                                {/* Section OB Removal */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">OB REMOVAL (Per Area Kerja)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "A").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "A").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "BCM"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section Jasa Penunjang Produksi */}
                                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                  <td className="p-2 text-center text-slate-400">#</td>
                                  <td className="p-2 underline font-extrabold">JASA PENUNJANG PRODUKSI (Rental Alat)</td>
                                  <td className="p-2 text-center font-mono text-cyan-900">
                                    {invLineItems.filter(i => i.section === "B").reduce((s, i) => s + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Hours
                                  </td>
                                  <td className="p-2 text-right"></td>
                                  <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "B").map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <input type="number" step="0.01" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.volume === 0 ? "" : (item.volume ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                        <span className="text-[11px] text-slate-600 font-bold">{item.unit || "Hours"}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input type="number" className="w-24 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none" placeholder="0" value={item.unitRateIDR === 0 ? "" : (item.unitRateIDR ?? "")} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemRateIDR(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(Math.round((item.volume || 0) * (item.unitRateIDR || 0)))}</td>
                                  </tr>
                                ))}

                                {/* Section P: Pengurang Pembayaran */}
                                <tr className="bg-rose-50 font-extrabold text-rose-900 border-t-2 border-rose-300">
                                  <td className="p-2 text-center text-rose-400">#</td>
                                  <td colSpan={3} className="p-2 underline font-extrabold">PENGURANG PEMBAYARAN (Denda & BBM)</td>
                                  <td className="p-2 text-right font-mono text-rose-900 font-extrabold">({formatIDR(Math.abs(cCalc.subtotalP))})</td>
                                </tr>
                                {invLineItems.filter(i => i.section === "P").map(item => (
                                  <tr key={item.id} className="hover:bg-rose-50/30 transition">
                                    <td className="p-2 text-center">
                                      <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"><X size={14} /></button>
                                    </td>
                                    <td colSpan={3} className="p-2 font-medium text-slate-700">{item.description}</td>
                                    <td className="p-2 text-right font-mono">
                                      <input type="number" className="w-36 bg-slate-50 border border-rose-300 font-mono font-extrabold text-rose-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white outline-none" placeholder="0" value={item.amount === 0 ? "" : Math.abs(item.amount)} onFocus={(e) => e.target.select()} onChange={(e) => updateInvItemAmount(item.id, -(e.target.value === "" ? 0 : Math.abs(parseFloat(e.target.value)) || 0))} />
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )}

                            {/* POS MINING BASELINE TABLE (Gambar 1) */}
                            {currentCust === "POS" && (
                              <>
                                {/* SECTION A. PRODUCTION / MDO */}
                                {invLineItems.filter(i => i.section === "A").length > 0 && (
                                  <>
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline">
                                        {formData.customerCode === "POS" && (formData.invoiceCategory === "MDO" || formData.activityGroup?.includes("MDO"))
                                          ? "A. MINE DEVELOPMENT (MDO)"
                                          : "A. PRODUCTION"}
                                      </td>
                                      <td className="p-2 text-center font-mono text-cyan-900">
                                        {formData.customerCode === "POS" && (formData.invoiceCategory === "MDO" || formData.activityGroup?.includes("MDO"))
                                          ? ""
                                          : `${invLineItems.filter(i => i.section === "A").reduce((sum, i) => sum + (i.volume || 0), 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} Bcm`
                                        }
                                      </td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalA)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "A").map((item, idx) => {
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <span className="text-cyan-900 font-mono mr-1.5 font-black">{`A${idx + 1}.`}</span>
                                            <span>{cleanDesc}</span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <input
                                                type="number"
                                                step="0.01"
                                                className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="0"
                                                value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}

                                {/* SECTION B. OVER DISTANCE */}
                                {invLineItems.filter(i => i.section === "B").length > 0 && (
                                  <>
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline font-extrabold">B. OVER DISTANCE</td>
                                      <td className="p-2 text-center"></td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalB)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "B").map((item, idx) => {
                                      const effVol = getItemEffectiveVolume(item);
                                      const effMtr = getItemEffectiveOverhaulMtr(item);
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const diffMtr = effMtr - 1000;
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();

                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <div>
                                              <span className="text-cyan-900 font-mono mr-1.5 font-black">{`B${idx + 1}.`}</span>
                                              <span>{cleanDesc}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                              <input
                                                type="number"
                                                className="w-20 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="1000"
                                                value={item.overhaulMtr === 0 ? "" : (item.overhaulMtr ?? "")}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateInvItemOverhaul(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">mtr - 1000 mtr = ({diffMtr}) mtr</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-extrabold text-slate-800 text-xs">
                                              <span>{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}

                                {/* SECTION C. LAND CLEARING */}
                                {invLineItems.filter(i => i.section === "C").length > 0 && (
                                  <>
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline font-extrabold">C. LAND CLEARING</td>
                                      <td className="p-2 text-center"></td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalC)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "C").map((item, idx) => {
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <span className="text-cyan-900 font-mono mr-1.5 font-black">{`C${idx + 1}.`}</span>
                                            <span>{cleanDesc}</span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <input
                                                type="number"
                                                step="0.01"
                                                className="w-28 bg-slate-50 border border-slate-300 font-mono font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded text-right focus:bg-white focus:border-cyan-600 outline-none"
                                                placeholder="0"
                                                value={item.volume === 0 ? "" : (item.volume ?? "")}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateInvItemVolume(item.id, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                                              />
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}

                                {/* SECTION D. RAISE & FALL'S FACTOR */}
                                {invLineItems.filter(i => i.section === "D").length > 0 && (
                                  <>
                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                      <td className="p-2 text-center text-slate-400">#</td>
                                      <td className="p-2 underline font-extrabold">D. RAISE & FALL'S FACTOR</td>
                                      <td className="p-2 text-center"></td>
                                      <td className="p-2 text-right"></td>
                                      <td className="p-2 text-right font-mono text-slate-900 font-extrabold">{formatIDR(cCalc.subtotalD)}</td>
                                    </tr>
                                    {invLineItems.filter(i => i.section === "D").map((item, idx) => {
                                      const effVol = getItemEffectiveVolume(item);
                                      const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
                                      const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();

                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition">
                                          <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeInvLineItem(item.id)} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Hapus Variable Ini">
                                              <X size={14} />
                                            </button>
                                          </td>
                                          <td className="p-2 font-bold text-slate-800">
                                            <span className="text-cyan-900 font-mono mr-1.5 font-black">{`D${idx + 1}.`}</span>
                                            <span>{cleanDesc}</span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-extrabold text-slate-800 text-xs">
                                              <span>{effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                                              <span className="text-[11px] text-slate-600 font-bold">{item.unit}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-right font-mono text-slate-700">{formatIDR(unitRate)}</td>
                                          <td className="p-2 text-right font-mono font-extrabold text-slate-900">{formatIDR(amount)}</td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}
                              </>
                            )}
                          </tbody>

                          {/* SUMMARY TOTALS & TAX BREAKDOWN */}
                          <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-xs">
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right font-extrabold uppercase text-slate-800">TOTAL (REVENUE GROSS):</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono text-base font-black text-slate-900">{formatIDR(cCalc.totalGross)}</td>
                            </tr>
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-slate-700">DPP PPN 11/12:</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-slate-900">{formatIDR(cCalc.dpp11_12)}</td>
                            </tr>
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-emerald-800">VAT ( 12% ) (+):</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-emerald-700">{formatIDR(cCalc.vat12)}</td>
                            </tr>
                            <tr>
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-2.5 text-right uppercase text-rose-800">WITH HOLDING TAX ART 23 (-):</td>
                              <td colSpan={2} className="p-2.5 text-right font-mono font-extrabold text-rose-700">({formatIDR(cCalc.pph23)})</td>
                            </tr>
                            <tr className="bg-slate-900 text-white font-black text-sm border-t-2 border-slate-900">
                              <td colSpan={currentCust === "DBK" ? 4 : 3} className="p-3 text-right uppercase tracking-wider text-cyan-300">TOTAL INVOICE (NET):</td>
                              <td colSpan={2} className="p-3 text-right font-mono text-lg text-emerald-400">{formatIDR(cCalc.totalInvoice)}</td>
                            </tr>
                            {currentCust === "SBS" && (
                              <tr className="bg-emerald-800 text-white font-black text-base border-t-2 border-emerald-950">
                                <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-emerald-200">TOTAL DIBAYAR (NET AFTER DEDUCTIONS):</td>
                                <td colSpan={2} className="p-3 text-right font-mono text-xl text-white underline">{formatIDR(cCalc.totalDibayar)}</td>
                              </tr>
                            )}
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Helper legend footer */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      * Pilih customer di atas untuk berganti otomatis format dan urutan field SOW (POS, BGG, DBK, SBS). Kolom tabel & perhitungan otomatis menyesuaikan.
                    </span>
                  </div>
                </div>
              )}

              {/* ================= DEDICATED MODAL INPUT PENDING VOLUME ================= */}
              {modalType === "pending_volume" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-gradient-to-r from-indigo-50 via-white to-purple-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-2">
                        <Scale size={16} className="text-indigo-700" /> Pencatatan Pending Volume (Over Kontrak / Stripping Ratio)
                      </h4>
                      <p className="text-[11px] text-indigo-900 font-medium mt-0.5">
                        Pencatatan pengerjaan material Top Soil & Overburden (OB) yang melebihi batas rasio kontrak terhadap Coal. Selisih volume di-pending untuk masuk penagihan invoice berikutnya.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-900 font-extrabold text-[11px] shrink-0">
                      Carry Over Invoice
                    </span>
                  </div>

                  {/* Info Box Rasio Kontrak Customer */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5">
                    <div className="font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                      <Info size={13} className="text-indigo-700" /> Kesepakatan Rasio Kontrak ({formData.customerCode || "POS"}):
                    </div>
                    <div className="text-slate-600 font-medium pl-4">
                      {formData.customerCode === "BGG" ? (
                        <span>Kontrak BGG: Perbandingan Top Soil & Overburden adalah maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>. Nilai coal 1 Ton dengan nilai top soil dan overburden maksimal 3 Bcm kontraknya. Kelebihan volume pengerjaan di-pending ke invoice selanjutnya.</span>
                      ) : formData.customerCode === "DBK" ? (
                        <span>Kontrak DBK: Perbandingan Overburden maksimal <strong>3.5 BCM / 1 Ton Coal</strong>. Selisih volume over-ratio di-carry over.</span>
                      ) : formData.customerCode === "POS" ? (
                        <span>Kontrak POS: Perbandingan Waste/OB & Top Soil maksimal <strong>4.0 BCM / 1 Ton Ore</strong>. Selisih kuota masuk ke Pending Volume.</span>
                      ) : formData.customerCode === "SBS" ? (
                        <span>Kontrak SBS: Perbandingan OB maksimal <strong>3.0 BCM / 1 Ton Coal</strong>. Volume over-contract dicatat sebagai pending volume.</span>
                      ) : (
                        <span>Kontrak Standar: Rasio Top Soil & OB maksimal <strong>3.0 BCM / 1 Ton Coal (3 : 1)</strong>.</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Customer Code <span className="text-rose-600">*</span>
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:bg-white outline-none text-xs"
                        value={formData.customerCode || "POS"}
                        onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                        required
                      >
                        <option value="POS">POS - PT Position</option>
                        <option value="BGG">BGG - PT Budi Gema Gempita (Rasio 3:1)</option>
                        <option value="SBS">SBS - PT Satria Bahana Sarana (Rasio 3:1)</option>
                        <option value="DBK">DBK - PT Daya Bumindo Karunia (Rasio 3.5:1)</option>
                        <option value="ABN">ABN - PT Andalan Bhumi Nusantara (Rasio 3:1)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Periode Pekerjaan <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="month"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:bg-white outline-none text-xs"
                        value={formatMonthInput(formData.workPeriod || "Juni 2026")}
                        onChange={(e) => {
                          const mVal = e.target.value;
                          const formattedLabel = formatMonthLabel(mVal);
                          setFormData({ ...formData, workPeriod: formattedLabel });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <RupiahInput
                        label="Estimasi Nominal Pending Volume (Rp)"
                        value={formData.workAmount || 0}
                        onChange={(val) => setFormData({ ...formData, workAmount: val })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        PIC / Tim Joint Survey
                      </label>
                      <input
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-indigo-600 focus:bg-white outline-none text-xs"
                        placeholder="Surveyor Site / Mine Engineer"
                        value={formData.picAAP || ""}
                        onChange={(e) => setFormData({ ...formData, picAAP: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Catatan / Keterangan Pending Volume (Selisih Stripping Ratio)
                    </label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:border-indigo-600 focus:bg-white outline-none"
                      rows={2}
                      placeholder="Contoh: Pending volume selisih Top Soil & Overburden over-contract ratio (3:1) untuk carry-over ke invoice berikutnya..."
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* ================= MODAL BA TRACKER (UNIFIED WIDESCREEN DUAL-MODE WORKFLOW) ================= */}
              {modalType === "ba" && (() => {
                const isCustomerBGG = (formData.customerCode === "BGG" || formData.customerCode === "PT BGG");

                const allBAItems = [...baOperatingItems, ...baMDOItems];

                const isDistanceItem = (item: any) => {
                  if (!item) return false;
                  return Boolean(
                    item.isDistanceVar || 
                    item.category === "Over Distance" || 
                    (item.material && (
                      item.material.toLowerCase().includes("overhaul") || 
                      item.material.toLowerCase().includes("over distance") ||
                      item.material.toLowerCase().includes("distance")
                    ))
                  );
                };

                const getBAEffectiveVolume = (item: any, allItems: any[], isSurvey: boolean = false) => {
                  if (isDistanceItem(item)) {
                    const parent = allItems.find(p => {
                      if (p.id === item.id) return false;
                      if (isDistanceItem(p)) return false;
                      if (item.parentMaterial) return p.material === item.parentMaterial;
                      const mLow = (item.material || "").toLowerCase();
                      const pLow = (p.material || "").toLowerCase();
                      if (mLow.includes("ob") || mLow.includes("waste") || mLow.includes("overburden")) return pLow.includes("ob") || pLow.includes("waste") || pLow.includes("overburden");
                      if (mLow.includes("coal") || mLow.includes("batubara")) return pLow.includes("coal") || pLow.includes("batubara");
                      if (mLow.includes("top soil")) return pLow.includes("top soil");
                      if (mLow.includes("limonite")) return pLow.includes("limonite");
                      if (mLow.includes("saprolite")) return pLow.includes("saprolite");
                      return false;
                    });
                    if (parent) {
                      return isSurvey ? Number(parent.adjustedVolume ?? parent.initialVolume ?? 0) : Number(parent.initialVolume || 0);
                    }
                  }
                  return isSurvey ? Number(item.adjustedVolume ?? item.initialVolume ?? 0) : Number(item.initialVolume || 0);
                };

                const getBAItemSubtotal = (item: any, volume: number) => {
                  const r = Number(item.rate || 0);
                  if (isDistanceItem(item)) {
                    if (item.unit === "Bcm.Hm" || item.material?.toLowerCase().includes("ob removal") || item.material?.toLowerCase().includes("hm")) {
                      const hm = Number(item.distanceWeightAvg || 0);
                      return Math.round(volume * hm * r);
                    }
                    if (item.material?.toLowerCase().includes("over/underhaul") || item.material?.toLowerCase().includes("overhaul")) {
                      const dist = Number(item.distanceWeightAvg ?? 1000);
                      const diff100 = (dist - 1000) / 100;
                      return Math.round(volume * diff100 * r);
                    }
                  }
                  return Math.round(volume * r);
                };

                const sumInitial = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, false)), 0);
                const sumAdjusted = allBAItems.reduce((acc, it) => acc + getBAItemSubtotal(it, getBAEffectiveVolume(it, allBAItems, true)), 0);
                const deltaAmount = sumAdjusted - sumInitial;

                return (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* KOLOM KIRI (LEBAR ~70%-75% / xl:col-span-8 2xl:col-span-9): Workflow Stepper, SOW Tables, Survey & Signatures */}
                    <div className="xl:col-span-8 2xl:col-span-9 space-y-4 border-b xl:border-b-0 xl:border-r border-slate-200 pb-6 xl:pb-0 xl:pr-6">
                      
                      {/* Stepper Navigation Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setActiveBAStep(1)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 1 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <Layers size={13} />
                          <span>1. SOW Operasi & Volume</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveBAStep(2)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 2 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <Calculator size={13} />
                          <span>2. Survey & Delta BA</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveBAStep(3)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 3 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <UserCheck size={13} />
                          <span>3. Tanda Tangan & Final</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveBAStep(4)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition ${activeBAStep === 4 ? "bg-cyan-800 text-white shadow-xs font-extrabold" : "text-slate-600 hover:bg-slate-200"}`}
                        >
                          <History size={13} />
                          <span>4. Jejak Audit & Flow</span>
                        </button>
                      </div>

                      {/* Header Info Strip: Customer, Periode, PIC */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        {isInlineEditingBA ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                Customer / Project <span className="text-rose-600">*</span>
                              </label>
                              <select
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold focus:border-cyan-700 outline-none"
                                value={formData.customerCode || "POS"}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  const isBGG = code === "BGG" || code === "PT BGG";
                                  setFormData({ ...formData, customerCode: code });
                                  if (isBGG) {
                                    setBaOperatingItems(defaultBGGBAItems);
                                    setBaMDOItems([]);
                                  } else {
                                    setBaOperatingItems(defaultPOSBAOperatingItems);
                                    setBaMDOItems(defaultPOSBAMDOItems);
                                  }
                                }}
                                required
                              >
                                <option value="POS">POS – PT Position / Paramitha</option>
                                <option value="SBS">SBS – PT Sumber Bara Sejahtera</option>
                                <option value="BGG">BGG – PT Budi Gema Gempita</option>
                                <option value="DBK">DBK – PT Dayabumi Kencana</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                Periode Pekerjaan <span className="text-rose-600">*</span>
                              </label>
                              <input
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                                placeholder="June 2026 / Juni 2026"
                                value={formData.workPeriod || ""}
                                onChange={(e) => setFormData({ ...formData, workPeriod: e.target.value })}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                                PIC Site AAP
                              </label>
                              <input
                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                                placeholder="Operations / Site Engineer"
                                value={formData.picAAP || ""}
                                onChange={(e) => setFormData({ ...formData, picAAP: e.target.value })}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-800">
                            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Customer</span> <strong className="text-slate-900 font-bold">{formData.customerCode || "POS"}</strong></div>
                            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">Periode</span> <strong className="text-slate-800">{formData.workPeriod || "-"}</strong></div>
                            <div><span className="text-slate-500 block font-bold text-[10px] uppercase">PIC Site</span> <strong className="text-slate-800">{formData.picAAP || "-"}</strong></div>
                          </div>
                        )}
                      </div>

                      {/* STEP 1: SOW Operasional & MDO */}
                      {activeBAStep === 1 && (() => {
                        const coalItem1 = allBAItems.find(it => (it.material || "").toLowerCase().includes("coal") || (it.material || "").toLowerCase().includes("batubara"));
                        const obItems1 = allBAItems.filter(it => !isDistanceItem(it) && ((it.material || "").toLowerCase().includes("ob") || (it.material || "").toLowerCase().includes("overburden") || (it.material || "").toLowerCase().includes("waste") || (it.material || "").toLowerCase().includes("top soil")));
                        const coalVolStep1 = coalItem1 ? Number(coalItem1.initialVolume || 0) : 0;
                        const obVolStep1 = obItems1.reduce((sum, it) => sum + Number(it.initialVolume || 0), 0);
                        const srStep1 = coalVolStep1 > 0 ? (obVolStep1 / coalVolStep1) : 0;
                        const maxQuotaOB1 = coalVolStep1 * 3.0;
                        const excessOB1 = obVolStep1 > maxQuotaOB1 ? (obVolStep1 - maxQuotaOB1) : 0;

                        return (
                          <div className="space-y-4">
                            {/* Stripping Ratio 3:1 SOW Quota Live Indicator for BGG */}
                            {isCustomerBGG && coalVolStep1 > 0 && (
                              <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${excessOB1 > 0 ? "bg-amber-50/90 border-amber-300 text-amber-950" : "bg-emerald-50/90 border-emerald-300 text-emerald-950"}`}>
                                <Scale className={excessOB1 > 0 ? "text-amber-700 shrink-0 mt-0.5" : "text-emerald-700 shrink-0 mt-0.5"} size={18} />
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="font-extrabold uppercase tracking-wide">
                                      Validasi Kuota Stripping Ratio Kontrak SOW (Maks. 3.0 : 1)
                                    </strong>
                                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${excessOB1 > 0 ? "bg-amber-200 text-amber-900 border border-amber-400" : "bg-emerald-200 text-emerald-900 border border-emerald-400"}`}>
                                      SR Aktual: {srStep1.toFixed(2)} : 1
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                                    <div>Coal: <strong>{coalVolStep1.toLocaleString('id-ID', {minimumFractionDigits: 2})} Ton</strong></div>
                                    <div>Kapasitas Kuota OB (3x): <strong>{maxQuotaOB1.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong></div>
                                    <div>Volume OB Aktual: <strong>{obVolStep1.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong></div>
                                  </div>
                                  {excessOB1 > 0 ? (
                                    <div className="text-[11px] text-amber-900 font-bold bg-amber-100/90 p-2 rounded-lg mt-1 border border-amber-200">
                                      ⚠️ Volume OB melebihi kuota kontrak sebesar <strong>{excessOB1.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong>. Volume kelebihan ini otomatis dialokasikan ke <strong>Pending Volume (Carry-Forward)</strong> dan akan diserap saat ada sisa kuota di invoice berikutnya.
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-emerald-900 font-semibold bg-emerald-100/80 p-1.5 rounded-lg mt-1 border border-emerald-200">
                                      ✅ Volume OB berada di dalam kuota kontrak SOW ({srStep1.toFixed(2)} ≤ 3.0). Seluruh volume siap ditagihkan penuh.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Tabel 1: Operating & Mining */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-cyan-900 flex items-center gap-1.5">
                                  <Pickaxe size={14} className="text-cyan-700" /> {isCustomerBGG ? "Kategori: Penambangan Batubara & OB Removal (BGG)" : "Kategori 1: Operating & Mining"}
                                </span>
                                {isInlineEditingBA && (
                                  <div className="relative inline-block text-left">
                                    <button
                                      type="button"
                                      onClick={() => setShowAddRowDropdown(!showAddRowDropdown)}
                                      className="text-[11px] font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-cyan-300 shadow-2xs"
                                    >
                                      <Plus size={13} />
                                      <span>Tambah Baris</span>
                                      <ChevronDown size={12} className={`transition-transform duration-200 ${showAddRowDropdown ? "rotate-180" : ""}`} />
                                    </button>

                                    {showAddRowDropdown && (
                                      <div 
                                        className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100"
                                        onMouseLeave={() => setShowAddRowDropdown(false)}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBaOperatingItems([...baOperatingItems, {
                                              id: `op_${Date.now()}`,
                                              category: "Operating & Mining",
                                              area: isCustomerBGG ? "Pit KKL" : "WM1",
                                              material: "",
                                              unit: "BCM",
                                              initialVolume: 0,
                                              adjustedVolume: 0,
                                              rate: 0,
                                              subtotalInitial: 0,
                                              subtotalAdjusted: 0
                                            }]);
                                            setShowAddRowDropdown(false);
                                          }}
                                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-cyan-50 hover:text-cyan-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-800 shrink-0">
                                            <Pickaxe size={13} />
                                          </div>
                                          <div>
                                            <div className="font-bold">Variabel Material</div>
                                            <div className="text-[10px] text-slate-500 font-normal">Volume Produksi Batubara / OB / Tanah</div>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBaOperatingItems([...baOperatingItems, {
                                              id: `dist_${Date.now()}`,
                                              category: "Over Distance",
                                              area: isCustomerBGG ? "Pit KKL" : "WM1",
                                              material: "",
                                              unit: isCustomerBGG ? "Bcm.Hm" : "BCM",
                                              parentMaterial: "",
                                              distanceWeightAvg: isCustomerBGG ? 0 : 1000,
                                              initialVolume: 0,
                                              adjustedVolume: 0,
                                              rate: 0,
                                              isDistanceVar: true,
                                              subtotalInitial: 0,
                                              subtotalAdjusted: 0
                                            }]);
                                            setShowAddRowDropdown(false);
                                          }}
                                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-amber-50 hover:text-amber-950 font-bold flex items-center gap-2.5 transition cursor-pointer"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                                            <Layers size={13} />
                                          </div>
                                          <div>
                                            <div className="font-bold">Variabel Distance</div>
                                            <div className="text-[10px] text-slate-500 font-normal">Jarak Hauling & Over/Underhaul</div>
                                          </div>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                  <tr>
                                    <th className="p-2.5 w-24">Area / Lokasi</th>
                                    <th className="p-2.5 min-w-[200px]">Material / Pekerjaan (Master SOW)</th>
                                    <th className="p-2.5 text-center w-18">Satuan</th>
                                    <th className="p-2.5 text-right w-28">Volume Awal</th>
                                    <th className="p-2.5 text-right w-28">SOW Rate (Rp)</th>
                                    <th className="p-2.5 text-right w-32">Subtotal (Rp)</th>
                                    {isInlineEditingBA && <th className="p-2.5 text-center w-10">#</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {baOperatingItems.map((item, idx) => {
                                    const isDistance = isDistanceItem(item);
                                    const effVol = getBAEffectiveVolume(item, allBAItems, false);
                                    const subtotal = getBAItemSubtotal(item, effVol);

                                    return (
                                      <tr key={item.id || idx} className={`hover:bg-slate-50/80 transition ${isDistance ? "bg-amber-50/20" : ""}`}>
                                        <td className="p-2.5 font-bold text-slate-800 align-top">
                                          {!isInlineEditingBA ? (
                                            <span className="pt-1 block">{item.area || (isCustomerBGG ? "Pit KKL" : "WM1")}</span>
                                          ) : (
                                            <input
                                              className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-cyan-700 outline-none"
                                              value={item.area || ""}
                                              placeholder={isCustomerBGG ? "Pit KKL" : "WM1"}
                                              onChange={(e) => {
                                                const updated = [...baOperatingItems];
                                                updated[idx].area = e.target.value;
                                                setBaOperatingItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2.5 font-medium text-slate-900 align-top">
                                          {!isDistance ? (
                                            !isInlineEditingBA ? (
                                              <span className="font-bold text-slate-900 pt-1 block">{item.material || "-"}</span>
                                            ) : (
                                              <input
                                                className="w-full bg-cyan-50/50 border border-cyan-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:border-cyan-700 outline-none"
                                                value={item.material || ""}
                                                placeholder="Nama Material (e.g. Volume OB)..."
                                                onChange={(e) => {
                                                  const updated = [...baOperatingItems];
                                                  updated[idx].material = e.target.value;
                                                  setBaOperatingItems(updated);
                                                }}
                                              />
                                            )
                                          ) : (
                                            <div>
                                              {!isInlineEditingBA ? (
                                                <div className="font-bold text-slate-900 pt-0.5">{item.material || "Distance / Overhaul"}</div>
                                              ) : (
                                                <input
                                                  className="w-full bg-amber-50/50 border border-amber-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:border-amber-700 outline-none mb-1"
                                                  value={item.material || ""}
                                                  placeholder="Nama Variabel Distance (e.g. Distance OB Removal)..."
                                                  onChange={(e) => {
                                                    const updated = [...baOperatingItems];
                                                    updated[idx].material = e.target.value;
                                                    setBaOperatingItems(updated);
                                                  }}
                                                />
                                              )}
                                              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-slate-700 whitespace-nowrap bg-amber-50/80 border border-amber-200 px-2 py-1 rounded-md w-fit">
                                                {isCustomerBGG ? (
                                                  <>
                                                    <span className="font-bold text-amber-900">Jarak (Hm):</span>
                                                    {!isInlineEditingBA ? (
                                                      <span className="font-bold text-slate-900 bg-white border border-amber-300 px-1.5 py-0.5 rounded font-mono">{item.distanceWeightAvg || 0} Hm</span>
                                                    ) : (
                                                      <input
                                                        type="number"
                                                        step="0.001"
                                                        className="w-18 bg-white border border-amber-300 rounded px-1.5 py-0.5 text-right font-mono font-bold text-amber-950 text-xs focus:border-amber-600 outline-none"
                                                        placeholder="0.000"
                                                        value={item.distanceWeightAvg === 0 ? "" : (item.distanceWeightAvg ?? "")}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                          const updated = [...baOperatingItems];
                                                          updated[idx].distanceWeightAvg = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                                          setBaOperatingItems(updated);
                                                        }}
                                                      />
                                                    )}
                                                    <span>Hm</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <span className="font-medium text-slate-600">Jarak:</span>
                                                    {!isInlineEditingBA ? (
                                                      <span className="font-bold text-slate-900">{item.distanceWeightAvg || 1000} mtr - 1000 mtr = ({Number(item.distanceWeightAvg || 1000) - 1000}) mtr</span>
                                                    ) : (
                                                      <>
                                                        <input
                                                          type="number"
                                                          className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right font-mono font-bold text-slate-900 text-xs focus:border-cyan-700 outline-none"
                                                          placeholder="1000"
                                                          value={item.distanceWeightAvg === 0 ? "" : (item.distanceWeightAvg ?? "")}
                                                          onFocus={(e) => e.target.select()}
                                                          onChange={(e) => {
                                                            const updated = [...baOperatingItems];
                                                            updated[idx].distanceWeightAvg = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                                            setBaOperatingItems(updated);
                                                          }}
                                                        />
                                                        <span className="text-slate-600 font-sans">mtr - 1000 mtr = <strong className="font-mono text-cyan-900">({Number(item.distanceWeightAvg || 1000) - 1000}) mtr</strong></span>
                                                      </>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-center font-mono font-bold text-slate-800 align-top">
                                          {!isInlineEditingBA ? (
                                            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px] mt-0.5">
                                              {item.unit || "BCM"}
                                            </span>
                                          ) : (
                                            <input
                                              className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-mono font-bold text-center focus:border-cyan-700 outline-none"
                                              value={item.unit || ""}
                                              placeholder="BCM"
                                              onChange={(e) => {
                                                const updated = [...baOperatingItems];
                                                updated[idx].unit = e.target.value;
                                                setBaOperatingItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono align-top">
                                          {!isDistance ? (
                                            !isInlineEditingBA ? (
                                              <span className="font-bold text-slate-900 pt-1 block">{item.initialVolume ? Number(item.initialVolume).toLocaleString("id-ID", { minimumFractionDigits: 3 }) : "0.000"}</span>
                                            ) : (
                                              <input
                                                type="number"
                                                step="0.001"
                                                className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                                value={item.initialVolume ? item.initialVolume : ""}
                                                placeholder="0.000"
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => {
                                                  const updated = [...baOperatingItems];
                                                  const val = parseFloat(e.target.value) || 0;
                                                  updated[idx].initialVolume = val;
                                                  updated[idx].adjustedVolume = val;
                                                  setBaOperatingItems(updated);
                                                }}
                                              />
                                            )
                                          ) : (
                                            <div className="flex flex-col items-end pt-0.5">
                                              <div className="px-2.5 py-1 bg-amber-50/90 border border-amber-300 rounded font-mono font-black text-amber-950 text-xs shadow-2xs">
                                                {effVol.toLocaleString("id-ID", { minimumFractionDigits: 3 })}
                                              </div>
                                              <span className="text-[9px] text-amber-800 font-semibold italic mt-0.5 whitespace-nowrap">
                                                Auto-sync {item.parentMaterial ? item.parentMaterial.replace("Volume ", "") : "Produksi"}
                                              </span>
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono align-top">
                                          {!isInlineEditingBA ? (
                                            <span className="pt-1 block">{formatIDR(item.rate || 0)}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              className="w-24 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.rate === 0 ? "" : (item.rate ?? "")}
                                              placeholder="0"
                                              onFocus={(e) => e.target.select()}
                                              onChange={(e) => {
                                                const updated = [...baOperatingItems];
                                                updated[idx].rate = parseFloat(e.target.value) || 0;
                                                setBaOperatingItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-extrabold text-slate-900 align-top">
                                          <div className="pt-1">{formatIDR(subtotal)}</div>
                                        </td>
                                        {isInlineEditingBA && (
                                          <td className="p-2.5 text-center align-top">
                                            <div className="pt-0.5">
                                              <button
                                                type="button"
                                                onClick={() => setBaOperatingItems(baOperatingItems.filter((_, i) => i !== idx))}
                                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Tabel 2: MDO (Hanya jika Customer bukan BGG / untuk POS) */}
                          {!isCustomerBGG && (
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5">
                                  <Building2 size={14} className="text-indigo-700" /> Kategori 2: Mine Development Operation (MDO)
                                </span>
                                {isInlineEditingBA && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const defMdo = activeSOWCatalog.find(s => s.category === "MDO") || activeSOWCatalog[activeSOWCatalog.length - 1];
                                      setBaMDOItems([...baMDOItems, {
                                        id: `mdo_${Date.now()}`,
                                        category: "MDO",
                                        area: "Site POS",
                                        material: defMdo.name,
                                        unit: defMdo.unit,
                                        initialVolume: 0,
                                        adjustedVolume: 0,
                                        rate: defMdo.defaultRate,
                                        subtotalInitial: 0,
                                        subtotalAdjusted: 0
                                      }]);
                                    }}
                                    className="text-[11px] font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Plus size={13} /> Tambah Baris MDO
                                  </button>
                                )}
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                    <tr>
                                      <th className="p-2">Area / Lokasi</th>
                                      <th className="p-2 min-w-[180px]">Material / Pekerjaan MDO (Master SOW)</th>
                                      <th className="p-2 text-center">Satuan</th>
                                      <th className="p-2 text-right">Volume Awal</th>
                                      <th className="p-2 text-right">SOW Rate (Rp)</th>
                                      <th className="p-2 text-right">Subtotal (Rp)</th>
                                      {isInlineEditingBA && <th className="p-2 text-center">#</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {baMDOItems.map((item, idx) => (
                                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                                        <td className="p-2 font-bold text-slate-800">
                                          {!isInlineEditingBA ? (item.area || "Site POS") : (
                                            <input
                                              className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-cyan-700 outline-none"
                                              value={item.area || ""}
                                              placeholder="Site POS"
                                              onChange={(e) => {
                                                const updated = [...baMDOItems];
                                                updated[idx].area = e.target.value;
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 font-medium text-slate-900">
                                          {!isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900">{item.material}</span>
                                          ) : (
                                            <select
                                              className="w-full bg-indigo-50/50 border border-indigo-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:border-indigo-700 outline-none"
                                              value={item.material || "Mine Development (MDO) - Clearing & Access Road"}
                                              onChange={(e) => {
                                                const matName = e.target.value;
                                                const sow = activeSOWCatalog.find(s => s.name === matName);
                                                const updated = [...baMDOItems];
                                                updated[idx].material = matName;
                                                if (sow) {
                                                  updated[idx].unit = sow.unit;
                                                  updated[idx].rate = sow.defaultRate;
                                                }
                                                const vol = Number(updated[idx].initialVolume || 0);
                                                const r = Number(updated[idx].rate || 0);
                                                updated[idx].subtotalInitial = Math.round(vol * r);
                                                updated[idx].subtotalAdjusted = Math.round(Number(updated[idx].adjustedVolume || vol) * r);
                                                setBaMDOItems(updated);
                                              }}
                                            >
                                              {activeSOWCatalog.filter(s => s.category === "MDO").map(sow => (
                                                <option key={sow.name} value={sow.name}>
                                                  {sow.name}
                                                </option>
                                              ))}
                                              {!activeSOWCatalog.some(s => s.name === item.material) && item.material && (
                                                <option value={item.material}>{item.material}</option>
                                              )}
                                            </select>
                                          )}
                                        </td>
                                        <td className="p-2 text-center font-mono font-bold text-slate-800">
                                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px]">
                                            {item.unit || "Ha"}
                                          </span>
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                          {!isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900">{item.initialVolume ? item.initialVolume.toLocaleString("id-ID") : "0"}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              step="0.01"
                                              className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.initialVolume ? item.initialVolume : ""}
                                              placeholder="0.00"
                                              onChange={(e) => {
                                                const updated = [...baMDOItems];
                                                const val = parseFloat(e.target.value) || 0;
                                                updated[idx].initialVolume = val;
                                                updated[idx].adjustedVolume = val;
                                                const r = Number(updated[idx].rate || 0);
                                                updated[idx].subtotalInitial = Math.round(val * r);
                                                updated[idx].subtotalAdjusted = Math.round(val * r);
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                          {!isInlineEditingBA ? (
                                            <span>{formatIDR(item.rate || 0)}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              className="w-24 bg-slate-50 hover:bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs focus:border-cyan-700 outline-none"
                                              value={item.rate === 0 ? "" : (item.rate ?? "")}
                                              placeholder="0"
                                              onChange={(e) => {
                                                const updated = [...baMDOItems];
                                                const r = parseFloat(e.target.value) || 0;
                                                updated[idx].rate = r;
                                                const vol = Number(updated[idx].initialVolume || 0);
                                                updated[idx].subtotalInitial = Math.round(vol * r);
                                                updated[idx].subtotalAdjusted = Math.round(Number(updated[idx].adjustedVolume || vol) * r);
                                                setBaMDOItems(updated);
                                              }}
                                            />
                                          )}
                                        </td>
                                        <td className="p-2 text-right font-mono font-extrabold text-emerald-800">
                                          {formatIDR(Math.round((Number(item.initialVolume) || 0) * (Number(item.rate) || 0)))}
                                        </td>
                                        {isInlineEditingBA && (
                                          <td className="p-2 text-center">
                                            <button
                                              type="button"
                                              onClick={() => setBaMDOItems(baMDOItems.filter((_, i) => i !== idx))}
                                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Estimasi Unbilled Revenue Box */}
                          <div className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border border-slate-800 shadow-md">
                            <div>
                              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                                Estimasi Nilai Pengakuan Awal (Unbilled Revenue):
                              </div>
                              <div className="text-[10px] text-cyan-300">
                                Akun: (Dr) 11300 Pendapatan Belum Ditagih / (Cr) 41100 Pendapatan Operasional
                              </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                              {formatIDR(sumInitial)}
                            </div>
                          </div>

                          {/* Navigation Buttons */}
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(2)}
                              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                            >
                              <span>Lanjut ke Step 2 (Hasil Survey & Draft BA)</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* STEP 2: Survey Lapangan & Delta Selisih (UNIFIED FOR POS & BGG) */}
                    {activeBAStep === 2 && (() => {
                      const coalItem2 = allBAItems.find(it => (it.material || "").toLowerCase().includes("coal") || (it.material || "").toLowerCase().includes("batubara"));
                      const obItems2 = allBAItems.filter(it => !isDistanceItem(it) && ((it.material || "").toLowerCase().includes("ob") || (it.material || "").toLowerCase().includes("overburden") || (it.material || "").toLowerCase().includes("waste") || (it.material || "").toLowerCase().includes("top soil")));
                      const coalVolStep2 = coalItem2 ? Number(coalItem2.adjustedVolume ?? coalItem2.initialVolume ?? 0) : 0;
                      const obVolStep2 = obItems2.reduce((sum, it) => sum + Number(it.adjustedVolume ?? it.initialVolume ?? 0), 0);
                      const srStep2 = coalVolStep2 > 0 ? (obVolStep2 / coalVolStep2) : 0;
                      const maxQuotaOB2 = coalVolStep2 * 3.0;
                      const excessOB2 = obVolStep2 > maxQuotaOB2 ? (obVolStep2 - maxQuotaOB2) : 0;

                      return (
                        <div className="space-y-4">
                          {/* Stripping Ratio 3:1 SOW Quota Live Indicator for BGG */}
                          {isCustomerBGG && coalVolStep2 > 0 && (
                            <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${excessOB2 > 0 ? "bg-amber-50/90 border-amber-300 text-amber-950" : "bg-emerald-50/90 border-emerald-300 text-emerald-950"}`}>
                              <Scale className={excessOB2 > 0 ? "text-amber-700 shrink-0 mt-0.5" : "text-emerald-700 shrink-0 mt-0.5"} size={18} />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <strong className="font-extrabold uppercase tracking-wide">
                                    Hasil Survey: Kuota Stripping Ratio Kontrak SOW (Maks. 3.0 : 1)
                                  </strong>
                                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${excessOB2 > 0 ? "bg-amber-200 text-amber-900 border border-amber-400" : "bg-emerald-200 text-emerald-900 border border-emerald-400"}`}>
                                    SR Survey: {srStep2.toFixed(2)} : 1
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                                  <div>Coal Survey: <strong>{coalVolStep2.toLocaleString('id-ID', {minimumFractionDigits: 2})} Ton</strong></div>
                                  <div>Kapasitas Kuota OB (3x): <strong>{maxQuotaOB2.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong></div>
                                  <div>Volume OB Survey: <strong>{obVolStep2.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong></div>
                                </div>
                                {excessOB2 > 0 ? (
                                  <div className="text-[11px] text-amber-900 font-bold bg-amber-100/90 p-2 rounded-lg mt-1 border border-amber-200">
                                    ⚠️ Hasil survey menunjukkan kelebihan OB sebesar <strong>{excessOB2.toLocaleString('id-ID', {minimumFractionDigits: 2})} BCM</strong>. Volume kelebihan ini otomatis dicatat ke <strong>Pending Volume</strong> dan tidak ditagihkan pada invoice periode ini.
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-emerald-900 font-semibold bg-emerald-100/80 p-1.5 rounded-lg mt-1 border border-emerald-200">
                                    ✅ Hasil survey berada di dalam batas rasio kontrak ({srStep2.toFixed(2)} ≤ 3.0). Seluruh volume hasil survey lolos tagih.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-cyan-950">
                            <Calculator className="text-cyan-700 shrink-0 mt-0.5" size={16} />
                            <div>
                              <strong>Step 2 — Penyesuaian Hasil Joint Survey Lapangan:</strong> Masukkan volume hasil joint visit / survey bersama client. Volume pada variabel distance otomatis tersinkronisasi dan sistem menghitung <strong>Delta Selisih</strong> (+/-) secara live.
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                            <table className="w-full text-xs text-left min-w-[780px]">
                              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                <tr>
                                  <th className="p-2.5 min-w-[240px]">Material / Pekerjaan</th>
                                  <th className="p-2.5 text-center w-20">Satuan</th>
                                  <th className="p-2.5 text-right w-28">Vol Awal</th>
                                  <th className="p-2.5 text-right w-32">Vol Hasil Survey</th>
                                  <th className="p-2.5 text-right w-28">Rate SOW (Rp)</th>
                                  <th className="p-2.5 text-right w-32">Subtotal Baru (Rp)</th>
                                  <th className="p-2.5 text-right w-32">Delta (+/- Rp)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {allBAItems.map((item, idx) => {
                                  const isDistance = isDistanceItem(item);
                                  const volAwal = getBAEffectiveVolume(item, allBAItems, false);
                                  const volAdj = getBAEffectiveVolume(item, allBAItems, true);
                                  const r = Number(item.rate || 0);
                                  const subAwal = getBAItemSubtotal(item, volAwal);
                                  const subAdj = getBAItemSubtotal(item, volAdj);
                                  const delta = subAdj - subAwal;
                                  const isOp = item.category === "Operating & Mining" || item.category === "Over Distance";

                                  return (
                                    <tr key={item.id || idx} className={`hover:bg-slate-50/80 transition ${isDistance ? "bg-amber-50/20" : ""}`}>
                                      <td className="p-2.5 font-bold text-slate-900 align-top">
                                        <div>{item.material || "-"}</div>
                                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                          {item.category} • {item.area || (isCustomerBGG ? "Pit KKL" : "WM1")}
                                          {isDistance && (
                                            <span className="text-cyan-800 font-mono ml-1 font-bold">
                                              (Dist: {item.distanceWeightAvg || 0} {item.unit === "Bcm.Hm" ? "Hm" : "m"})
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-2.5 text-center font-mono font-bold text-slate-700 align-top">
                                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs inline-block text-center min-w-[45px] mt-0.5">
                                          {item.unit || "BCM"}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-slate-600 align-top">
                                        <span className="pt-1 block">{volAwal.toLocaleString("id-ID", { minimumFractionDigits: 3 })}</span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono align-top">
                                        {!isDistance ? (
                                          !isInlineEditingBA ? (
                                            <span className="font-bold text-slate-900 pt-1 block">{volAdj.toLocaleString("id-ID", { minimumFractionDigits: 3 })}</span>
                                          ) : (
                                            <input
                                              type="number"
                                              step="0.001"
                                              className="w-24 bg-cyan-50 border border-cyan-300 rounded px-2 py-1 text-right font-mono font-bold text-xs text-cyan-950 focus:border-cyan-700 outline-none"
                                              value={item.adjustedVolume !== undefined ? item.adjustedVolume : ""}
                                              placeholder="0.000"
                                              onFocus={(e) => e.target.select()}
                                              onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (isOp) {
                                                  const ops = [...baOperatingItems];
                                                  const opIdx = ops.findIndex(o => o.id === item.id);
                                                  if (opIdx >= 0) {
                                                    ops[opIdx].adjustedVolume = val;
                                                    setBaOperatingItems(ops);
                                                  }
                                                } else {
                                                  const mdos = [...baMDOItems];
                                                  const mIdx = mdos.findIndex(m => m.id === item.id);
                                                  if (mIdx >= 0) {
                                                    mdos[mIdx].adjustedVolume = val;
                                                    setBaMDOItems(mdos);
                                                  }
                                                }
                                              }}
                                            />
                                          )
                                        ) : (
                                          <div className="flex flex-col items-end pt-0.5">
                                            <span className="font-mono font-bold text-amber-950 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded text-xs shadow-2xs">
                                              {volAdj.toLocaleString("id-ID", { minimumFractionDigits: 3 })}
                                            </span>
                                            <span className="text-[9px] text-amber-800 font-semibold italic mt-0.5 whitespace-nowrap">
                                              Auto-sync survey
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-slate-700 align-top">
                                        <span className="pt-1 block">{formatIDR(r)}</span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 align-top">
                                        <div className="pt-1">{formatIDR(subAdj)}</div>
                                      </td>
                                      <td className={`p-2.5 text-right font-mono font-black align-top ${delta >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                        <div className="pt-1">{delta >= 0 ? `+${formatIDR(delta)}` : `-${formatIDR(Math.abs(delta))}`}</div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Delta Summary Box */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Awal (Site)</span>
                              <span className="text-sm font-black font-mono text-slate-800">{formatIDR(sumInitial)}</span>
                            </div>
                            <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                              <span className="text-[10px] font-bold uppercase text-cyan-800 block">Total Survey Bersama</span>
                              <span className="text-sm font-black font-mono text-cyan-950">{formatIDR(sumAdjusted)}</span>
                            </div>
                            <div className={`p-3 rounded-xl border ${deltaAmount >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300"}`}>
                              <span className={`text-[10px] font-bold uppercase block ${deltaAmount >= 0 ? "text-emerald-800" : "text-rose-800"}`}>Delta Selisih Survey</span>
                              <span className={`text-sm font-black font-mono ${deltaAmount >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
                                {deltaAmount >= 0 ? `+${formatIDR(deltaAmount)}` : `-${formatIDR(Math.abs(deltaAmount))}`}
                              </span>
                            </div>
                          </div>

                          {/* Upload Draft BA PDF */}
                          {isInlineEditingBA && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                  <Upload size={14} className="text-cyan-700" /> Upload Berkas Draft BA Joint Survey (PDF)
                                </label>
                                {formData.draftBAPath && (
                                  <a
                                    href={resolveDocumentUrl(formData.draftBAPath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-cyan-700 hover:text-cyan-900 font-bold inline-flex items-center gap-1 underline"
                                  >
                                    <ExternalLink size={11} /> Buka Draft PDF
                                  </a>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="application/pdf"
                                className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-700 file:text-white hover:file:bg-cyan-800 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, "draftBAPath")}
                              />
                            </div>
                          )}

                          {/* Navigation Buttons */}
                          <div className="flex justify-between items-center pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(1)}
                              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition text-xs cursor-pointer"
                            >
                              ⬅ Kembali ke Step 1
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(3)}
                              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                            >
                              <span>Lanjut ke Step 3 (Tanda Tangan & Final)</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                      {/* STEP 3: Tanda Tangan & Finalisasi Berita Acara */}
                      {activeBAStep === 3 && (
                        <div className="space-y-4">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-950">
                            <UserCheck className="text-emerald-700 shrink-0 mt-0.5" size={16} />
                            <div>
                              <strong>Step 3 — Verifikasi, Persetujuan & Final Signed BA:</strong> Tanda tangan digital internal (Finance Specialist & FATB Manager) dan pengesahan Berita Acara resmi customer.
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                No. BA Resmi Customer <span className="text-rose-600">*</span>
                              </label>
                              {!isInlineEditingBA ? (
                                <div className="p-2 bg-white border border-slate-200 rounded font-mono font-bold text-xs text-slate-900">
                                  {formData.signedBANumber || formData.baNumber || "052/BA-POS-NIKEL/VII/2026"}
                                </div>
                              ) : (
                                <input
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold text-xs focus:border-emerald-700 outline-none"
                                  placeholder="052/BA-POS-NIKEL/VII/2026"
                                  value={formData.signedBANumber || formData.baNumber || ""}
                                  onChange={(e) => setFormData({ ...formData, signedBANumber: e.target.value, baNumber: e.target.value })}
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                Tanggal Ditandatangani Customer
                              </label>
                              {!isInlineEditingBA ? (
                                <div className="p-2 bg-white border border-slate-200 rounded text-xs text-slate-900 font-bold">
                                  {formData.baSignedDate ? new Date(formData.baSignedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                                </div>
                              ) : (
                                <input
                                  type="date"
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-emerald-700 outline-none"
                                  value={formData.baSignedDate || ""}
                                  onChange={(e) => setFormData({ ...formData, baSignedDate: e.target.value })}
                                />
                              )}
                            </div>
                          </div>

                          {/* Dual Signatures Box with Real Action Buttons */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            {/* TTD 1: Finance Specialist */}
                            <div className={`p-4 rounded-xl border shadow-xs text-center space-y-2.5 transition ${formData.verifiedBy ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-200"}`}>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">1. Verifikasi Specialist</span>
                                {formData.verifiedBy ? (
                                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                    <CheckCircle size={12} /> Selesai
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                    <Clock size={12} /> Pending
                                  </span>
                                )}
                              </div>

                              <div className="py-1">
                                {formData.verifiedBy ? (
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      <CheckCircle size={13} className="text-emerald-700" /> Digital Verified
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-800">{formData.verifiedBy}</span>
                                    {formData.verifiedAt && (
                                      <span className="text-[10px] text-slate-500 font-mono">{new Date(formData.verifiedAt).toLocaleString("id-ID")}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                      <Clock size={13} className="text-amber-700" /> Menunggu Verifikasi Specialist
                                    </span>
                                    
                                    {/* Action Buttons for Finance Specialist / SPV */}
                                    {editItem && isFinanceSpecialist && (
                                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await verifyBATracker(editItem.id, "verify", formData.notes || "Verifikasi dokumen & volume BA disetujui Finance Specialist");
                                              onNotice("✅ Berita Acara berhasil diverifikasi oleh Finance Specialist! Status diteruskan ke FATB Manager.");
                                              setFormData({ ...formData, verifiedBy: user?.name || "Finance Specialist AAP", statusBA: "Pending Berita Acara" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`❌ Gagal verifikasi: ${err?.message}`);
                                            }
                                          }}
                                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <Check size={14} /> Verifikasi BA (Approve)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await verifyBATracker(editItem.id, "reject", formData.notes || "Volume / data BA memerlukan revisi");
                                              onNotice("⚠️ Berita Acara dikembalikan untuk revisi.");
                                              setFormData({ ...formData, statusBA: "Revisi" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`❌ Gagal reject: ${err?.message}`);
                                            }
                                          }}
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <X size={14} /> Revisi
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                <strong className="block text-xs text-slate-900">Finance Specialist</strong>
                                <span className="text-[10px] text-slate-500">PT Andalan Artha Primanusa</span>
                              </div>
                            </div>

                            {/* TTD 2: FATB Manager */}
                            <div className={`p-4 rounded-xl border shadow-xs text-center space-y-2.5 transition ${formData.approvedBy ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-200"}`}>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">2. Approval FATB Manager</span>
                                {formData.approvedBy ? (
                                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                    <ShieldCheck size={12} /> Approved
                                  </span>
                                ) : formData.verifiedBy ? (
                                  <span className="text-[10px] text-cyan-700 font-bold flex items-center gap-1">
                                    <Clock size={12} /> Siap Di-Approve
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                    <Lock size={12} /> Menunggu Step 1
                                  </span>
                                )}
                              </div>

                              <div className="py-1">
                                {formData.approvedBy ? (
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      <ShieldCheck size={13} className="text-emerald-700" /> Approved by FATB Manager
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-800">{formData.approvedBy}</span>
                                    {formData.approvedAt && (
                                      <span className="text-[10px] text-slate-500 font-mono">{new Date(formData.approvedAt).toLocaleString("id-ID")}</span>
                                    )}
                                  </div>
                                ) : formData.verifiedBy ? (
                                  <div className="space-y-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-900 border border-cyan-300">
                                      <Clock size={13} className="text-cyan-700" /> Menunggu Approval FATB Manager
                                    </span>

                                    {/* Action Buttons for FATB Manager */}
                                    {editItem && isManager && (
                                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await approveBATracker(editItem.id, "approve", formData.notes || "Persetujuan Berita Acara disetujui resmi FATB Manager");
                                              onNotice("🎉 Berita Acara disetujui FATB Manager! Status: BA Ready to Invoice.");
                                              setFormData({ ...formData, approvedBy: user?.name || "FATB Manager AAP", statusBA: "Ready to Invoice" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`❌ Gagal approve: ${err?.message}`);
                                            }
                                          }}
                                          className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <ShieldCheck size={14} /> Approve BA (Manager)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await approveBATracker(editItem.id, "reject", formData.notes || "Ditolak FATB Manager untuk evaluasi");
                                              onNotice("⚠️ Berita Acara ditolak oleh FATB Manager.");
                                              setFormData({ ...formData, statusBA: "Revisi" });
                                              await loadData();
                                            } catch (err: any) {
                                              onNotice(`❌ Gagal reject: ${err?.message}`);
                                            }
                                          }}
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition text-xs shadow-xs cursor-pointer"
                                        >
                                          <X size={14} /> Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="py-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                      <Lock size={13} className="text-slate-400" /> Terkunci (Perlu Verifikasi Specialist)
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                <strong className="block text-xs text-slate-900">FATB Manager</strong>
                                <span className="text-[10px] text-slate-500">PT Andalan Artha Primanusa</span>
                              </div>
                            </div>
                          </div>

                          {/* Upload Final Signed BA PDF */}
                          {isInlineEditingBA && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                  <Upload size={14} className="text-emerald-700" /> Upload Berkas Final Signed BA (PDF TTD Customer) <span className="text-rose-600">*</span>
                                </label>
                                {formData.finalBAPath && (
                                  <a
                                    href={resolveDocumentUrl(formData.finalBAPath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 underline"
                                  >
                                    <ExternalLink size={11} /> Buka Final Signed PDF
                                  </a>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="application/pdf"
                                className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, "finalBAPath")}
                              />
                            </div>
                          )}

                          {/* Status Ready to Invoice Action Banner */}
                          {(formData.statusBA === "Ready to Invoice" || formData.statusBA === "Approved") && (
                            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-950 shadow-xs">
                              <div className="flex items-center gap-2.5">
                                <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
                                <div>
                                  <strong className="block font-black text-emerald-900">Berita Acara Telah Disetujui (Ready to Invoice)</strong>
                                  <span className="text-emerald-800 text-[11px]">Dokumen siap diterbitkan invoice penagihan resmi ke pelanggan.</span>
                                </div>
                              </div>
                              {formData.customerCode === "POS" ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModalType("none");
                                      createInvoiceFromBA(editItem || formData, "Operation & Mining");
                                    }}
                                    className="bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold py-2 px-3 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                  >
                                    <Pickaxe size={14} /> ⚡ Inv Mining
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModalType("none");
                                      createInvoiceFromBA(editItem || formData, "MDO");
                                    }}
                                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold py-2 px-3 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                  >
                                    <Building2 size={14} /> 🏗️ Inv MDO
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalType("none");
                                    createInvoiceFromBA(editItem || formData);
                                  }}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-black py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                                >
                                  <Zap size={14} /> ⚡ Terbitkan Invoice
                                </button>
                              )}
                            </div>
                          )}

                          {/* Navigation Buttons */}
                          <div className="flex justify-between items-center pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(2)}
                              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition text-xs cursor-pointer"
                            >
                              ⬅ Kembali ke Step 2
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(4)}
                              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs cursor-pointer"
                            >
                              <span>Lihat Jejak Audit (Step 4)</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 4: Jejak Audit & Flow Tracking */}
                      {activeBAStep === 4 && (
                        <div className="space-y-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                              <History size={16} className="text-cyan-800" />
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Jejak Audit & Alur Persetujuan Berita Acara
                              </h4>
                            </div>

                            <div className="space-y-3">
                              {/* 1. Draft BA Dibuat */}
                              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 font-bold text-xs">1</div>
                                <div className="space-y-0.5 text-xs flex-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900 font-bold">Draft BA Dibuat (Site Entri)</strong>
                                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      {formData.baSubmittedDate ? new Date(formData.baSubmittedDate).toLocaleDateString("id-ID") : "Tercatat"}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 text-[11px]">
                                    Draft Berita Acara dibuat oleh <strong>{formData.picAAP || "Admin Finance Site"}</strong> dan dicatat sebagai estimasi Unbilled Revenue ({formatIDR(sumInitial)}).
                                  </p>
                                </div>
                              </div>

                              {/* 2. Verifikasi Specialist */}
                              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                <div className={`p-2 rounded-lg shrink-0 font-bold text-xs ${formData.verifiedBy ? "bg-emerald-100 text-emerald-800" : formData.statusBA === "Revisi" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>2</div>
                                <div className="space-y-0.5 text-xs flex-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900 font-bold">Verifikasi Specialist & Joint Survey</strong>
                                    {formData.verifiedBy ? (
                                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle size={11} /> Terverifikasi ({formData.verifiedBy})
                                      </span>
                                    ) : formData.statusBA === "Revisi" ? (
                                      <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                        <X size={11} /> Perlu Revisi
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                        <Clock size={11} /> Menunggu Verifikasi
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-600 text-[11px]">
                                    {formData.verifiedBy
                                      ? `Pemeriksaan fisik volume joint survey disetujui oleh ${formData.verifiedBy}.${formData.verifiedAt ? ` (${new Date(formData.verifiedAt).toLocaleString("id-ID")})` : ""}`
                                      : "Menunggu verifikasi keabsahan volume survei bersama oleh Finance Specialist / SPV Site."}
                                  </p>
                                </div>
                              </div>

                              {/* 3. Approval FATB Manager */}
                              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                <div className={`p-2 rounded-lg shrink-0 font-bold text-xs ${formData.approvedBy ? "bg-emerald-100 text-emerald-800" : formData.verifiedBy ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-500"}`}>3</div>
                                <div className="space-y-0.5 text-xs flex-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900 font-bold">Approval FATB Manager (Final BA)</strong>
                                    {formData.approvedBy ? (
                                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                        <ShieldCheck size={11} /> Disetujui ({formData.approvedBy})
                                      </span>
                                    ) : formData.verifiedBy ? (
                                      <span className="text-[10px] text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200 flex items-center gap-1">
                                        <Clock size={11} /> Menunggu Approval
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                                        <Lock size={11} /> Antrian Verifikasi
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-600 text-[11px]">
                                    {formData.approvedBy
                                      ? `Berita Acara telah disetujui resmi oleh ${formData.approvedBy}.${formData.approvedAt ? ` (${new Date(formData.approvedAt).toLocaleString("id-ID")})` : ""}`
                                      : "Persetujuan final dokumen BA dan pengesahan nilai klaim oleh FATB Manager."}
                                  </p>
                                </div>
                              </div>

                              {/* 4. Relasi Invoice Penagihan */}
                              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                <div className={`p-2 rounded-lg shrink-0 font-bold text-xs ${formData.invoiceNoLinked ? "bg-purple-100 text-purple-800" : (formData.statusBA === "Ready to Invoice" || formData.approvedBy) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>4</div>
                                <div className="space-y-0.5 text-xs flex-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-slate-900 font-bold">Relasi Invoice Penagihan</strong>
                                    {formData.invoiceNoLinked ? (
                                      <span className="text-[10px] text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                        Invoice #{formData.invoiceNoLinked}
                                      </span>
                                    ) : (formData.statusBA === "Ready to Invoice" || formData.approvedBy) ? (
                                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        Siap Terbit Invoice
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                        Menunggu BA Approved
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-600 text-[11px]">
                                    {formData.invoiceNoLinked
                                      ? `Invoice resmi #${formData.invoiceNoLinked} telah diterbitkan dan tercatat pada buku Order to Cash AR.`
                                      : (formData.statusBA === "Ready to Invoice" || formData.approvedBy)
                                      ? "Status Berita Acara siap diterbitkan Invoice oleh Tim Finance HO melalui tombol 'Terbitkan Invoice'."
                                      : "Faktur penagihan belum dapat diterbitkan sebelum Berita Acara selesai disetujui."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Navigation Buttons */}
                          <div className="flex justify-start pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveBAStep(3)}
                              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition text-xs cursor-pointer"
                            >
                              ⬅ Kembali ke Step 3
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Catatan / Bottleneck */}
                      <div className="pt-2 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Operasional / Bottleneck</label>
                        {!isInlineEditingBA ? (
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                            {formData.notes || formData.notesBottleneck || "Tidak ada catatan khusus."}
                          </div>
                        ) : (
                          <textarea
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:border-cyan-700 outline-none"
                            rows={1}
                            placeholder="Catatan tambahan..."
                            value={formData.notes || ""}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        )}
                      </div>
                    </div>

                    {/* KOLOM KANAN (LEBAR ~25%-30% / xl:col-span-4 2xl:col-span-3): Document Viewer & Quick Intelligence Hub */}
                    <div className="xl:col-span-4 2xl:col-span-3 space-y-4">
                      {/* Ringkasan Dokumen Card */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">Ringkasan Berita Acara</span>
                          <span className="text-[10px] font-mono font-bold text-slate-500">ID: #{formData.id || editItem?.id || "New"}</span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Total Nilai Klaim BA:</span>
                            <span className="font-mono font-black text-emerald-800 text-sm">{formatIDR(sumAdjusted || sumInitial || formData.workAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Status BA:</span>
                            <span>{renderBAStatusBadge(formData.statusBA || "Submit", formData.invoiceNoLinked, undefined, editItem || formData, invoiceRows)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Customer:</span>
                            <span className="font-bold text-slate-900">{formData.customerCode || "POS"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Periode:</span>
                            <span className="text-slate-800 font-bold">{formData.workPeriod || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Lead Time Approval:</span>
                            <span className="text-amber-700 font-extrabold">{formData.leadTimeDays || 0} Hari</span>
                          </div>
                        </div>
                      </div>

                      {/* PDF PREVIEWS CONTAINER */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 tracking-wider">
                          <FileText size={14} className="text-cyan-700" /> Pratinjau Dokumen PDF
                        </div>

                        {/* Draft BA Card */}
                        <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                              <Upload size={13} /> Draft BA PDF
                            </span>
                            {formData.draftBAPath ? (
                              <a
                                href={resolveDocumentUrl(formData.draftBAPath)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold inline-flex items-center gap-1"
                              >
                                <ExternalLink size={11} /> Buka Tab Baru
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </div>
                          {formData.draftBAPath ? (
                            <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                              <iframe src={resolveDocumentUrl(formData.draftBAPath)} className="w-full h-full" title="Draft BA PDF Preview" />
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                              Draft BA PDF belum diunggah.
                            </div>
                          )}
                        </div>

                        {/* Final Signed BA Card */}
                        <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={13} /> Final Signed BA PDF
                            </span>
                            {formData.finalBAPath ? (
                              <a
                                href={resolveDocumentUrl(formData.finalBAPath)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1"
                              >
                                <ExternalLink size={11} /> Buka Tab Baru
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </div>
                          {formData.finalBAPath ? (
                            <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                              <iframe src={resolveDocumentUrl(formData.finalBAPath)} className="w-full h-full" title="Final BA PDF Preview" />
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                              Final Signed BA PDF dapat diunggah pada Step 3.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ================= MODAL PAYMENT RECEIPT ================= */}
              {modalType === "payment" && (
                <>
                  {/* Section 1: Target Invoice */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📌 1. Target Invoice Pembayaran</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Invoice Target <span className="text-rose-600">*</span></label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-cyan-700 focus:bg-white outline-none" placeholder="088/BGG-AAP/II/2026" value={formData.invoiceNo || ""} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Customer Code <span className="text-rose-600">*</span></label>
                        <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.customerCode || "BGG"} onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}>
                          <option value="BGG">BGG</option>
                          <option value="SBS">SBS</option>
                          <option value="DBK">DBK</option>
                          <option value="POS">POS</option>
                          <option value="ABN">ABN</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Nominal & Rekening Bank */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">💰 2. Nominal Uang Masuk & Rekening Bank</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <RupiahInput
                        label="Jumlah Uang Masuk Received (Rp)"
                        value={formData.amountPaid || 0}
                        onChange={(val) => setFormData({ ...formData, amountPaid: val })}
                        required={true}
                        helperText="Otomatis mengurangi sisa Outstanding & update status Lunas/Partial"
                      />
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tanggal Pembayaran <span className="text-rose-600">*</span></label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.paymentDate || ""} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Bank Receiving (Tujuan Transaksi)</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Contoh: BRI Escrow / Mandiri 0000 OP" value={formData.receivingBank || ""} onChange={(e) => setFormData({ ...formData, receivingBank: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Referensi Bank / Transfer</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:border-cyan-700 focus:bg-white outline-none" placeholder="TRF-BRI-00129" value={formData.refNo || ""} onChange={(e) => setFormData({ ...formData, refNo: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Catatan Pembayaran */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Catatan Pembayaran</label>
                      <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" rows={2} placeholder="Keterangan cicilan 1 / pelunasan BGG..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* ================= MODAL CUSTOMER MASTER ================= */}
              {modalType === "customer" && (
                <>
                  {/* Section 1: Identitas Customer */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📌 1. Profil Perusahaan & Credit Terms</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Kode Customer <span className="text-rose-600">*</span></label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold uppercase focus:border-cyan-700 focus:bg-white outline-none" placeholder="BGG" value={formData.code || ""} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Termin Hari (Credit Terms) <span className="text-rose-600">*</span></label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" value={formData.terminDays || 30} onChange={(e) => setFormData({ ...formData, terminDays: Number(e.target.value) })} required />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Nama Lengkap Perusahaan <span className="text-rose-600">*</span></label>
                      <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none" placeholder="PT Budi Gema Gempita" value={formData.fullName || ""} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Induk Perusahaan (Group Parent)</label>
                      <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Petrindo Jaya Kreasi Tbk / PTBA" value={formData.groupParent || ""} onChange={(e) => setFormData({ ...formData, groupParent: e.target.value })} />
                    </div>
                  </div>

                  {/* Section 2: Kontak AR */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📞 2. Contact Person & Penagihan AR</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">PIC AR</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="Bpk. Hendra" value={formData.contactPerson || ""} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email AR</label>
                        <input type="email" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="ar@bgg.co.id" value={formData.emailAR || ""} onChange={(e) => setFormData({ ...formData, emailAR: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Telepon</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="+62 21 555 0192" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Kontrak & Nilai Kerjasama */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">📄 3. Kontrak & Nilai Kerjasama</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">No. Kontrak</label>
                        <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" placeholder="09/BGG-AAP/VIII/2018" value={formData.contractNo || ""} onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })} />
                      </div>
                      <RupiahInput
                        label="Nilai Kontrak (Rp)"
                        value={formData.contractValue || 0}
                        onChange={(val) => setFormData({ ...formData, contractValue: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Catatan Kontrak / Syarat</label>
                      <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" rows={2} placeholder="Termin per pekerjaan, 7 tahun..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-200">
                <div>
                  {modalType === "ba" && editItem && !isInlineEditingBA && (
                    <button
                      type="button"
                      onClick={() => setIsInlineEditingBA(true)}
                      className="px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Edit2 size={14} /> ✏️ Ubah / Edit Data BA Ini
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-xs text-xs cursor-pointer"
                    onClick={() => setModalType("none")}
                  >
                    {modalType === "ba" && !isInlineEditingBA ? "Tutup Pratinjau" : "Batal"}
                  </button>
                  
                  {(modalType !== "ba" || isInlineEditingBA) && (
                    <button
                      type="submit"
                      className="primary px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black shadow-md transition text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      <span>{modalType === "ba" ? "Simpan Perubahan Berita Acara" : "Simpan Data"}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================= MODAL KARTU KONTROL PENDING VOLUME ================= */}
      {showPendingVolumeDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Scale size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Kartu Kontrol Saldo Pending Volume (Carry-Forward OB)
                  </h3>
                  <p className="text-xs text-indigo-200 font-medium">
                    Monitoring kuota rasio kontrak SOW (Maks. 3:1 OB/Coal) & penyerapan otomatis pada invoice berikutnya
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingVolumeDrawer(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              {/* Top 4 KPI Metrics */}
              {(() => {
                const activeLedgers = pendingVolumeLedgers.filter((l: any) => l.remainingVolume > 0 || l.status === "Active" || l.status === "Partially Settled");
                const totalRemainingVol = activeLedgers.reduce((s: number, l: any) => s + (l.remainingVolume || 0), 0);
                const totalAbsorbedVol = pendingVolumeLedgers.reduce((s: number, l: any) => s + (l.absorbedVolume || 0), 0);
                const totalNominalEst = activeLedgers.reduce((sum: number, l: any) => sum + (l.remainingVolume * (l.ob1Rate * 0.75 + l.ob2Rate * 0.25 || 27000)), 0);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                        <Layers size={13} className="text-indigo-700" /> Saldo Pending Aktif
                      </span>
                      <div className="text-xl font-black font-mono text-indigo-950">
                        {totalRemainingVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-xs font-sans font-bold text-indigo-700">BCM</span>
                      </div>
                      <p className="text-[10px] text-indigo-700">Sisa volume OB belum tertagih</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                        <DollarSign size={13} className="text-emerald-700" /> Estimasi Nilai Tertunda
                      </span>
                      <div className="text-xl font-black font-mono text-emerald-950 truncate">
                        {formatIDR(totalNominalEst)}
                      </div>
                      <p className="text-[10px] text-emerald-700">Proyeksi klaim saat kuota tersedia</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-cyan-700" /> Berhasil Diserap
                      </span>
                      <div className="text-xl font-black font-mono text-cyan-950">
                        {totalAbsorbedVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })} <span className="text-xs font-sans font-bold text-cyan-700">BCM</span>
                      </div>
                      <p className="text-[10px] text-cyan-700">Volume telah dicairkan ke invoice</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                        <Clock size={13} className="text-slate-600" /> Antrean Carry-Forward
                      </span>
                      <div className="text-xl font-black font-mono text-slate-900">
                        {activeLedgers.length} <span className="text-xs font-sans font-bold text-slate-600">Periode</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Prioritas penyerapan FIFO</p>
                    </div>
                  </div>
                );
              })()}

              {/* SOW Contract Rules Box */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50 border border-indigo-200/70 rounded-2xl flex items-start gap-3">
                <Info size={18} className="text-indigo-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-indigo-950 uppercase tracking-wide text-[11px]">
                    Aturan Rasio Kontrak SOW (Stripping Ratio Rule):
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    Pada kontrak <strong>PT BGG</strong> & <strong>PT SBS</strong>, kapasitas tagih OB dibatasi maksimal <strong>3.0 BCM per 1 Ton Coal (3 : 1)</strong>. Apabila volume OB aktual melebihi kapasitas kuota, kelebihan volume otomatis dicatat ke buku besar pending ini dengan tetap mempertahankan tarif periode asalnya (OB1 75% & OB2 25%). Pada invoice berikutnya yang rasio OB-nya di bawah 3:1, sisa kuota kosong (*headroom*) akan otomatis menyerap antrean saldo pending tertua.
                  </p>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <FileText size={15} className="text-indigo-700" /> Rincian Buku Besar Pending Volume (Carry-Forward OB)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPendingVolumeDrawer(false);
                      openCreateModal("pending_volume");
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Plus size={13} /> + Catat Pending Volume Baru
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-xs text-left min-w-[780px]">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Customer / Project</th>
                        <th className="p-3 text-center">Periode Asal</th>
                        <th className="p-3">Ref. No BA</th>
                        <th className="p-3 text-right">Volume Awal</th>
                        <th className="p-3 text-right">Terserap</th>
                        <th className="p-3 text-right">Sisa Saldo</th>
                        <th className="p-3 text-right">Tarif Asal SOW</th>
                        <th className="p-3 text-right">Estimasi Nominal (Rp)</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pendingVolumeLedgers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                            Belum ada entri pending volume yang tercatat.
                          </td>
                        </tr>
                      ) : (
                        pendingVolumeLedgers.map((item: any, idx: number) => {
                          const estAmount = (item.remainingVolume || 0) * ((item.ob1Rate || 0) * 0.75 + (item.ob2Rate || 0) * 0.25 || 27000);
                          const isSettled = item.remainingVolume <= 0 || item.status === "Settled";
                          const isPartially = item.absorbedVolume > 0 && item.remainingVolume > 0;

                          return (
                            <tr key={item.id || idx} className={`hover:bg-indigo-50/30 transition ${isSettled ? "bg-slate-50/50 opacity-70" : ""}`}>
                              <td className="p-3 font-bold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-mono font-black text-[10px]">
                                    {item.customerCode}
                                  </span>
                                  <span>{item.customerCode === "BGG" ? "PT Budi Gema Gempita" : item.customerCode === "SBS" ? "PT Sumber Bara Sejahtera" : "PT Position"}</span>
                                </div>
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-800">
                                <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                  {item.sourcePeriod}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-600 text-[11px]">
                                {item.sourceBARef || "-"}
                              </td>
                              <td className="p-3 text-right font-mono text-slate-700">
                                {(item.originalOBVolume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-cyan-800">
                                {(item.absorbedVolume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                              </td>
                              <td className="p-3 text-right font-mono font-black text-indigo-950">
                                <span className={item.remainingVolume > 0 ? "px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200" : ""}>
                                  {(item.remainingVolume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono text-[11px] text-slate-600">
                                <div>75%: Rp {(item.ob1Rate || 7467).toLocaleString("id-ID")}</div>
                                <div className="text-[10px] text-slate-400">25%: Rp {(item.ob2Rate || 7261).toLocaleString("id-ID")}</div>
                              </td>
                              <td className="p-3 text-right font-mono font-black text-emerald-800">
                                {formatIDR(estAmount)}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  isSettled
                                    ? "bg-slate-100 text-slate-700 border-slate-300"
                                    : isPartially
                                    ? "bg-amber-100 text-amber-900 border-amber-300"
                                    : "bg-indigo-100 text-indigo-900 border-indigo-300"
                                }`}>
                                  {item.status || (isSettled ? "Settled" : "Active")}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Settlement History Invoices */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="font-extrabold uppercase tracking-wider text-slate-700 text-[10px] flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-700" /> Riwayat Penagihan & Pencairan Carry-Forward:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Invoice #088/BGG-AAP/II/2026</span>
                      <strong className="text-slate-800">Menyerap Pending Nov & Des 25</strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">Dicairkan</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Invoice #089/BGG-AAP/IV/2026</span>
                      <strong className="text-slate-800">Menyerap Pending Des 25 & Jan 26</strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">Dicairkan</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Invoice #090/BGG-AAP/V/2026</span>
                      <strong className="text-slate-800">Menyerap Pending Feb 26 (48.224 BCM)</strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">Dicairkan</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPendingVolumeDrawer(false)}
                className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl transition text-xs shadow-xs cursor-pointer"
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
