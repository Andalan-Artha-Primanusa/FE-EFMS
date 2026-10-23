import * as React from "react";
import { Archive, Clock } from "lucide-react";
import { API_BASE } from "../../lib/api";
import { customerByCode } from "./masterRegistry";

// =============================================================
// Helper murni modul Finance (dipisah dari file monolith)
// =============================================================

export const resolveDocumentUrl = (path: string | undefined | null) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

export const formatIDR = (val: any, maxDecimals: number = 0) => {
  if (val === undefined || val === null || val === "") return "Rp 0";
  const num = typeof val === "number" ? val : parseDecimalNumber(val);
  if (isNaN(num)) return "Rp 0";
  const roundNum = maxDecimals === 0 ? Math.round(num) : num;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: maxDecimals,
    maximumFractionDigits: maxDecimals
  }).format(roundNum);
};

export const parseNumber = (str: any): number => {
  return parseDecimalNumber(str);
};

export const formatThousand = (val: any, maxDecimals: number = 0): string => {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "number" ? val : parseDecimalNumber(val);
  if (isNaN(num) || num === 0) return "0";
  const roundNum = maxDecimals === 0 ? Math.round(num) : num;
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: maxDecimals,
    maximumFractionDigits: maxDecimals
  }).format(roundNum);
};

/** Nama resmi customer dari Master Customer (kode bila belum terdaftar). */
export const getCustomerOfficialName = (code: string | undefined | null): string => {
  const c = String(code || "").toUpperCase().trim();
  return customerByCode(c)?.fullName || c;
};

// Kunci localStorage draf input modal (per user + jenis modal + id data yang diedit).
const draftUser = () => { try { return JSON.parse(localStorage.getItem("financeerp.user") || "{}")?.id ?? "anon"; } catch { return "anon"; } };
export const draftKey = (type: string, id?: any) => `efms:draft:${draftUser()}:${type}:${id ?? "new"}`;

export const formatDateInput = (dateStr: any) => {
  if (!dateStr) return "";
  // Tanggal kalender sesuai yang tertulis di server; konversi ke UTC bisa mundur sehari (mis. 06:00+07:00).
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.startsWith("0001-") ? "" : dateStr.slice(0, 10);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

export const indonesianMonths = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const shortMonthsEN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortMonthsID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function parsePeriodToYYYYMM(periodStr: string): string {
  if (!periodStr) return "";
  const trimmed = periodStr.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}-\d{4}$/.test(trimmed)) {
    const [m, y] = trimmed.split("-");
    return `${y}-${m.padStart(2, "0")}`;
  }

  const parts = trimmed.split(/[\s-_/]+/);
  if (parts.length >= 2) {
    let monthPart = parts[0].toLowerCase();
    let yearPart = parts[1];

    if (/^\d{4}$/.test(parts[0]) && isNaN(Number(parts[1]))) {
      yearPart = parts[0];
      monthPart = parts[1].toLowerCase();
    } else if (parts[0].length === 2 && /^\d{2}$/.test(parts[0]) && isNaN(Number(parts[1]))) {
      yearPart = `20${parts[0]}`;
      monthPart = parts[1].toLowerCase();
    }

    if (yearPart.length === 2 && /^\d{2}$/.test(yearPart)) {
      yearPart = `20${yearPart}`;
    }

    let mIdx = indonesianMonths.findIndex(m => m.toLowerCase().startsWith(monthPart));
    if (mIdx === -1) {
      mIdx = shortMonthsEN.findIndex(m => m.toLowerCase().startsWith(monthPart));
    }
    if (mIdx === -1) {
      mIdx = shortMonthsID.findIndex(m => m.toLowerCase().startsWith(monthPart));
    }
    if (mIdx !== -1 && /^\d{4}$/.test(yearPart)) {
      return `${yearPart}-${String(mIdx + 1).padStart(2, "0")}`;
    }
  }
  return "";
}

export function matchPeriod(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const s1 = p1.trim().toLowerCase();
  const s2 = p2.trim().toLowerCase();
  if (s1 === s2) return true;

  const ym1 = parsePeriodToYYYYMM(p1);
  const ym2 = parsePeriodToYYYYMM(p2);
  if (ym1 && ym2 && ym1 === ym2) return true;

  const getMonthKey = (s: string) => {
    if (s.includes("jan")) return 1;
    if (s.includes("feb")) return 2;
    if (s.includes("mar")) return 3;
    if (s.includes("apr")) return 4;
    if (s.includes("may") || s.includes("mei")) return 5;
    if (s.includes("jun")) return 6;
    if (s.includes("jul")) return 7;
    if (s.includes("aug") || s.includes("agt") || s.includes("agus")) return 8;
    if (s.includes("sep")) return 9;
    if (s.includes("oct") || s.includes("okt")) return 10;
    if (s.includes("nov")) return 11;
    if (s.includes("dec") || s.includes("des")) return 12;
    const m = s.match(/(?:^|\D)(0?[1-9]|1[0-2])(?:\D|$)/);
    return m ? parseInt(m[1], 10) : 0;
  };

  const getYear = (s: string) => {
    const m4 = s.match(/20\d{2}/);
    if (m4) return parseInt(m4[0], 10);
    const m2 = s.match(/(?:^|\D)(\d{2})(?:\D|$)/);
    if (m2) {
      const y = parseInt(m2[1], 10);
      if (y >= 20 && y <= 35) return 2000 + y;
    }
    return 0;
  };

  const m1 = getMonthKey(s1);
  const m2 = getMonthKey(s2);
  const y1 = getYear(s1);
  const y2 = getYear(s2);

  if (m1 > 0 && m2 > 0 && m1 === m2) {
    if (y1 > 0 && y2 > 0) return y1 === y2;
    return true;
  }
  return s1.includes(s2) || s2.includes(s1);
}

export function formatYYYYMMToPeriod(yyyyMm: string, format: "short" | "long" = "short"): string {
  if (!yyyyMm || !yyyyMm.includes("-")) return yyyyMm;
  const [year, monthStr] = yyyyMm.split("-");
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return yyyyMm;

  if (format === "long") {
    return `${indonesianMonths[monthIndex]} ${year}`;
  }
  const shortM = shortMonthsID[monthIndex] || shortMonthsEN[monthIndex];
  const shortY = year.length === 4 ? year.substring(2) : year;
  return `${shortM}-${shortY}`;
}

export function MonthPickerInput({
  label,
  value,
  onChange,
  required,
  format = "short",
  className,
  placeholder,
  helperText
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  format?: "short" | "long";
  className?: string;
  placeholder?: string;
  helperText?: string;
}) {
  const yyyyMm = parsePeriodToYYYYMM(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onChange("");
      return;
    }
    const formatted = formatYYYYMMToPeriod(val, format);
    onChange(formatted);
  };

  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}
      <input
        type="month"
        value={yyyyMm}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        className={className || "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-xs"}
      />
      {helperText && <p className="text-[10px] text-slate-400 font-normal">{helperText}</p>}
    </div>
  );
}

export function formatMonthLabel(yyyyMm: string): string {
  if (!yyyyMm || !yyyyMm.includes("-")) return yyyyMm;
  const [year, monthStr] = yyyyMm.split("-");
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    return `${indonesianMonths[monthIndex]} ${year}`;
  }
  return yyyyMm;
}

export function formatMonthInput(label: string): string {
  return parsePeriodToYYYYMM(label);
}

export function getRomanMonth(periodOrDateStr: string): string {
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

export function generateBANumberPreview(lastSeqNumber: number, customerCode: string, monthStr: string, yearStr: string): string {
  const nextSeq = String(lastSeqNumber + 1).padStart(2, "0");
  const code = (customerCode || "").toUpperCase();
  const romanMonthMap: Record<string, string> = {
    "01": "I", "02": "II", "03": "III", "04": "IV", "05": "V", "06": "VI",
    "07": "VII", "08": "VIII", "09": "IX", "10": "X", "11": "XI", "12": "XII"
  };
  const romanMonth = romanMonthMap[monthStr] || "VI";
  return `${nextSeq}/BA-${code}-NIKEL/${romanMonth}/${yearStr}`;
}

export function generateInvoiceNumberPreview(lastSeqNumber: number, customerCode: string, monthStr: string, yearStr: string): string {
  const nextSeq = String(lastSeqNumber + 1).padStart(3, "0");
  const code = (customerCode || "").toUpperCase();
  const romanMonthMap: Record<string, string> = {
    "01": "I", "02": "II", "03": "III", "04": "IV", "05": "V", "06": "VI",
    "07": "VII", "08": "VIII", "09": "IX", "10": "X", "11": "XI", "12": "XII"
  };
  const romanMonth = romanMonthMap[monthStr] || "VI";
  return `${nextSeq}/${code}-AAP/RF/${romanMonth}/${yearStr}`;
}

export function getYearFromPeriod(periodOrDateStr: string): string {
  const str = periodOrDateStr || "";
  const match4 = str.match(/\b20\d{2}\b/);
  if (match4) return match4[0];
  const match2 = str.match(/-(\d{2})$/);
  if (match2) return `20${match2[1]}`;
  return String(new Date().getFullYear());
}

export function generateInvoiceNumber(customerCode: string, workPeriod: string, existingRowsCount: number): string {
  const code = (customerCode || "").toUpperCase();
  const nextSeq = String(existingRowsCount + 1).padStart(3, "0");
  const romanMonth = getRomanMonth(workPeriod);
  const yearStr = getYearFromPeriod(workPeriod);
  return `${nextSeq}/${code}-AAP/RF/${romanMonth}/${yearStr}`;
}

// Sama dengan isInvoiceLocked BE: piutang & jurnal diakui sejak approval Manager FATB; nilai & tanggal invoice beku.
export const INVOICE_LOCKED = new Set(["Approved", "Tax_Reported", "Faktur Pajak Terlapor", "Paid", "Lunas"]);

export function getBAInvoiceStatus(ba: any, allInvoices: any[]) {
  if (!ba) {
    return {
      isFullyInvoiced: false,
      isPartiallyInvoiced: false,
      createdMiningInv: null,
      createdMDOInv: null,
      createdInvoices: [],
      remainingCount: 1,
    };
  }

  const baNum = (ba.baNumber || "").trim().toLowerCase();
  const linkedNo = (ba.invoiceNoLinked || "").trim().toLowerCase();
  const custCode = (ba.customerCode || "").trim().toUpperCase();

  const isCustMatch = (c1: string, c2: string) => {
    if (!c1 || !c2) return true;
    if (c1 === c2) return true;
    if ((c1 === "PTRO" || c1 === "DBK") && (c2 === "PTRO" || c2 === "DBK")) return true;
    if ((c1 === "BGG" || c1 === "PT BGG") && (c2 === "BGG" || c2 === "PT BGG")) return true;
    return false;
  };

  // Find all invoices that reference this BA or whose invoiceNo matches linkedNo OR matches baID
  const matchedInvoices = (allInvoices || []).filter((inv) => {
    const invBaId = inv.baId ?? inv.baID;
    if (invBaId && ba.id && Number(invBaId) === Number(ba.id)) return true;
    const invCust = (inv.customerCode || "").trim().toUpperCase();
    if (custCode && invCust && !isCustMatch(custCode, invCust)) return false;
    const invRef = (inv.baNoReference || "").trim().toLowerCase();
    const invNo = (inv.invoiceNo || "").trim().toLowerCase();
    if (baNum && invRef === baNum) return true;
    if (linkedNo && linkedNo !== "-" && invNo === linkedNo) return true;
    return false;
  });

  const isPOS = custCode === "POS";

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

export function renderBAStatusBadge(status: string, invoiceNoLinked?: string, isInvoiced?: boolean, baRow?: any, allInvoices?: any[]) {
  const s = (status || "").trim();
  const linked = (invoiceNoLinked || baRow?.invoiceNoLinked || "").trim();
  const isPOS = baRow?.customerCode === "POS";

  if (allInvoices && baRow) {
    const invStatus = getBAInvoiceStatus(baRow, allInvoices);
    if (isPOS) {
      if (invStatus.isFullyInvoiced) {
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap">
            <Archive size={12} className="text-purple-700 shrink-0" />
            <span>Arsip (2/2 Terbit)</span>
          </span>
        );
      } else if (invStatus.isPartiallyInvoiced) {
        const created = invStatus.createdMiningInv ? "Mining" : "MDO";
        const createdInvNo = invStatus.createdMiningInv?.invoiceNo || invStatus.createdMDOInv?.invoiceNo || "";

        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap" title={`Terbit: ${created} (${createdInvNo})`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>1/2 Inv ({created})</span>
          </span>
        );
      }
    } else {
      // Non-POS (BGG, SBS, PTRO/DBK, ABN)
      if (invStatus.isFullyInvoiced) {
        const inv = invStatus.createdInvoices[0];
        const isDraft = inv?.status === "Draft" || inv?.status === "Submitted" || inv?.status === "Pending Approval";
        const invNo = inv?.invoiceNo || linked;
        if (isDraft) {
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap" title={`Draft Invoice: ${invNo}`}>
              <Clock size={12} className="text-amber-700 shrink-0" />
              <span>Draf Inv ({invNo})</span>
            </span>
          );
        }
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap" title={`Arsip Invoice: ${invNo}`}>
            <Archive size={12} className="text-purple-700 shrink-0" />
            <span>Arsip ({invNo})</span>
          </span>
        );
      }
    }
  }

  if (allInvoices === undefined && (isInvoiced || (linked && linked !== "-") || s === "Arsip" || s === "Invoiced")) {
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap">
        <Archive size={12} className="text-purple-700 shrink-0" />
        <span>Arsip {linked && linked !== "-" ? `(${linked})` : ""}</span>
      </span>
    );
  }

  if (s === "Submit" || s.startsWith("Draft") || s.startsWith("Siap") || s.startsWith("Submited") || s.startsWith("Submitted")) {
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
        Draft
      </span>
    );
  }
  if (s === "Pending Berita Acara" || s.startsWith("Pending") || s.startsWith("Verified")) {
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
        Pending BA
      </span>
    );
  }
  if (s === "Ready to Invoice") {
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
        Menunggu Approval Manager
      </span>
    );
  }
  if (s.startsWith("Approved")) {
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
        Ready to Invoice
      </span>
    );
  }
  if (s === "Revisi" || s.startsWith("Reject")) {
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
        Revisi
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
      {status || "Draft"}
    </span>
  );
}

/** BA boleh ditagih: sudah diverifikasi Finance Specialist dan disetujui Manager (sama dengan BE requireBAApproved). */
export const isBAApproved = (ba: any): boolean => ba?.statusBA === "Approved" && Boolean(ba?.verifiedBy) && Boolean(ba?.approvedBy);

export function getBAStatusForExport(ba: any, allInvoices: any[]) {
  const invStatus = getBAInvoiceStatus(ba, allInvoices);
  const s = (ba?.statusBA || "Submit").trim();
  const isPOS = (ba?.customerCode || "") === "POS";

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

  if (s === "Approved") {
    return { label: "READY TO INVOICE", badgeClass: "bg-emerald", subtext: "" };
  }
  if (s === "Ready to Invoice") {
    return { label: "MENUNGGU APPROVAL MANAGER", badgeClass: "bg-amber", subtext: "" };
  }
  return { label: "ON PROGRESS", badgeClass: "bg-amber", subtext: "" };
}

export function renderInvoiceStatusBadge(status: string) {
  const s = (status || "").trim();
  if (s === "Paid") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block whitespace-nowrap">Paid (Lunas)</span>;
  if (s === "Tax_Reported") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 font-extrabold inline-block whitespace-nowrap">Tax Reported (SPT)</span>;
  if (s === "Overdue") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block whitespace-nowrap">Overdue</span>;
  if (s === "Verified") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 inline-block whitespace-nowrap">Verified Finance</span>;
  if (s === "Approved" || s === "Issued" || s === "Approved_Tier1" || s === "Approved_Tier2") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 font-extrabold inline-block whitespace-nowrap">Disetujui Manager FATB</span>;
  if (s === "Rejected") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block whitespace-nowrap">Rejected</span>;
  if (s === "Draft" || s === "Draft Invoice" || !s || s === "Pending" || s === "Submitted") {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-block whitespace-nowrap">Draft (Menunggu Approval FATB)</span>;
  }
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 inline-block whitespace-nowrap">{status}</span>;
}

export function parsePeriodToMonthIndex(periodStr: string): number {
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
export function RupiahInput({
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
          className="w-full bg-white border border-slate-300 rounded-[3px] p-2 pl-9 text-slate-900 font-mono font-bold focus:border-[#A57C50] outline-none text-xs"
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

export const parseDecimalNumber = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  const isNegative = str.startsWith("-");
  const clean = str.replace(/[^0-9.,]/g, "");
  if (!clean) return 0;

  let num = 0;
  if (clean.includes(".") && clean.includes(",")) {
    const lastDot = clean.lastIndexOf(".");
    const lastComma = clean.lastIndexOf(",");
    if (lastComma > lastDot) {
      const intP = clean.slice(0, lastComma).replace(/\./g, "");
      const decP = clean.slice(lastComma + 1);
      num = parseFloat(`${intP}.${decP}`);
    } else {
      const intP = clean.slice(0, lastDot).replace(/,/g, "");
      const decP = clean.slice(lastDot + 1);
      num = parseFloat(`${intP}.${decP}`);
    }
  } else if (clean.includes(",")) {
    const [intPart, ...decParts] = clean.split(",");
    const decPart = decParts.join("");
    num = parseFloat(`${intPart}.${decPart}`);
  } else if (clean.includes(".")) {
    const dotCount = (clean.match(/\./g) || []).length;
    if (dotCount > 1) {
      num = parseFloat(clean.replace(/\./g, ""));
    } else {
      const parts = clean.split(".");
      if (parts[1].length === 3 && parts[0].length >= 1 && parts[0].length <= 3 && parts[0] !== "0") {
        // Thousand format (e.g. 1.000, 3.000, 4.246, 245.620); >3 digit sebelum titik (229501.879) = desimal
        num = parseFloat(clean.replace(/\./g, ""));
      } else {
        // Single dot decimal format (e.g. 1.5, 0.526, 12.8, 896.486 when typed with dot)
        num = parseFloat(clean);
      }
    }
  } else {
    num = parseFloat(clean);
  }

  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
};

export const formatDecimalDisplay = (val: any, allowDecimals: boolean = true, maxDecimals: number = 3): string => {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "number" ? val : parseDecimalNumber(val);
  if (isNaN(num) || num === 0) return "";
  if (!allowDecimals) {
    return Math.round(num).toLocaleString("id-ID");
  }
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

// Component helper input Volume dengan Auto Thousand Separator (.) & Desimal (,)
export function VolumeInput({
  label,
  value,
  onChange,
  unit = "BCM",
  required,
  placeholder,
  helperText
}: {
  label: string;
  value: number | string;
  onChange: (val: number) => void;
  unit?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <div className="relative">
        <FormattedNumberInput
          maxDecimals={3}
          className="w-full bg-white border border-slate-300 rounded-[3px] p-2.5 pr-14 text-slate-900 font-mono font-bold focus:border-[#A57C50] outline-none text-xs"
          placeholder={placeholder || "0,000"}
          value={value}
          onChange={onChange}
          required={required}
        />
        {unit && (
          <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400 pointer-events-none font-mono">
            {unit}
          </span>
        )}
      </div>
      {helperText && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{helperText}</p>}
    </div>
  );
}

// Angka ketikan user (numpad): satu titik ATAU satu koma = desimal, seperti Excel. Selain itu (paste "229.501,879" / "1.000.000") pakai parser umum.
const parseTypedNumber = (s: string): number =>
  (s.match(/[.,]/g) || []).length === 1 ? parseDecimalNumber(s.replace(".", ",")) : parseDecimalNumber(s);
// Minimalist Table & Form Number Input dengan Auto Thousand Separator (.) & Desimal (,)
export function FormattedNumberInput({
  value,
  onChange,
  placeholder = "0",
  allowDecimals = true,
  maxDecimals = 3,
  className = "",
  onFocus,
  onBlur,
  required,
}: {
  value: number | string | undefined | null;
  onChange: (val: number) => void;
  placeholder?: string;
  allowDecimals?: boolean;
  maxDecimals?: number;
  className?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  const [localStr, setLocalStr] = React.useState<string>(() => formatDecimalDisplay(value, allowDecimals, maxDecimals));
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setLocalStr(formatDecimalDisplay(value, allowDecimals, maxDecimals));
    }
  }, [value, isFocused, allowDecimals, maxDecimals]);

  // Field tanpa desimal (maxDecimals 0) tetap membaca titik sebagai ribuan.
  const parseInput = maxDecimals > 0 ? parseTypedNumber : parseDecimalNumber;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (allowDecimals) {
      let clean = raw.replace(/[^0-9.,-]/g, "");
      setLocalStr(clean);
      onChange(parseInput(clean));
    } else {
      let clean = raw.replace(/[^0-9.,-]/g, "");
      setLocalStr(clean);
      const parsed = parseDecimalNumber(clean);
      const cleanNum = (parsed > 0 && parsed < 50) ? Math.round(parsed * 1000) : Math.round(parsed);
      onChange(cleanNum);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (!allowDecimals) {
      const parsed = parseDecimalNumber(localStr);
      const cleanNum = (parsed > 0 && parsed < 50) ? Math.round(parsed * 1000) : Math.round(parsed);
      onChange(cleanNum);
      setLocalStr(cleanNum === 0 ? "" : (cleanNum < 0 ? "-" : "") + Math.abs(cleanNum).toLocaleString("id-ID"));
      onBlur?.(e);
      return;
    }
    const parsed = parseInput(localStr);
    onChange(parsed);
    setLocalStr(formatDecimalDisplay(parsed, allowDecimals, maxDecimals));
    onBlur?.(e);
  };

  return (
    <input
      type="text"
      className={className || "w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 font-mono font-bold focus:border-[#A57C50] outline-none text-xs"}
      value={isFocused ? localStr : formatDecimalDisplay(value, allowDecimals, maxDecimals)}
      placeholder={placeholder}
      required={required}
      onFocus={(e) => {
        setIsFocused(true);
        if (!allowDecimals) {
          const curNum = typeof value === "number" ? value : parseDecimalNumber(value);
          const cleanNum = (curNum > 0 && curNum < 50) ? Math.round(curNum * 1000) : Math.round(curNum || 0);
          setLocalStr(cleanNum === 0 ? "" : String(cleanNum));
        } else {
          const curNum = typeof value === "number" ? value : parseDecimalNumber(value);
          if (!curNum && curNum !== 0) {
            setLocalStr("");
          } else if (curNum === 0) {
            setLocalStr("");
          } else {
            const hasDec = curNum % 1 !== 0;
            if (!hasDec) {
              setLocalStr(String(curNum));
            } else {
              setLocalStr(String(curNum).replace(".", ","));
            }
          }
        }
        e.target.select();
        onFocus?.(e);
      }}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

export const generateAuditTimeline = (type: string, item: any) => {
  const formatDateDisplay = (val: any) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (type === "ba") {
    const isVerified = Boolean(item.verifiedBy || ["Pending Berita Acara", "Verified", "Ready to Invoice", "Approved"].includes(item.statusBA));
    const isRejected = item.statusBA === "Revisi" || item.statusBA === "Rejected";

    return [
      {
        step: 1,
        title: "Draft BA Dibuat (Site Entri)",
        user: item.picAAP || "Operations / Site Engineer",
        role: "Site Engineer / Finance Site",
        time: item.createdAt ? formatDateDisplay(item.createdAt) : item.baSubmittedDate ? formatDateDisplay(item.baSubmittedDate) : formatDateDisplay(new Date()),
        status: "completed",
        desc: `Draft Berita Acara ${item.baNumber || item.draftBARefNo || ""} dibuat oleh ${item.picAAP || "Operations / Site Engineer"}.`
      },
      {
        step: 2,
        title: "Verifikasi Finance Specialist",
        user: item.verifiedBy ? item.verifiedBy : (isVerified ? "Finance Specialist (Verified)" : "Belum Diverifikasi"),
        role: "Finance Specialist",
        time: item.verifiedAt ? formatDateDisplay(item.verifiedAt) : (isVerified ? "Terverifikasi" : "Menunggu Specialist"),
        status: isVerified ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.verifiedBy
          ? `Volume joint survey & nilai klaim diverifikasi sah oleh ${item.verifiedBy}.`
          : (isVerified ? "Verifikasi keabsahan volume disetujui Finance Specialist." : "Menunggu verifikasi hasil survey oleh Finance Specialist.")
      },
      {
        step: 3,
        title: "Invoice & Approval FATB Manager",
        user: item.invoiceNoLinked ? "Finance Site (Invoice Terbit)" : "Siap Diterbitkan",
        role: "Finance Site & FATB Manager",
        time: item.invoiceIssuedDate ? formatDateDisplay(item.invoiceIssuedDate) : (item.invoiceNoLinked ? "Invoice Terbit" : (isVerified ? "Siap Terbit" : "Menunggu BA Verified")),
        status: item.invoiceNoLinked ? "completed" : (isVerified ? "active" : "pending"),
        desc: item.invoiceNoLinked
          ? `Invoice #${item.invoiceNoLinked} telah diterbitkan dan diajukan untuk approval FATB Manager.`
          : (isVerified ? "BA terverifikasi. Finance Site dapat men-generate invoice untuk diapprove FATB Manager." : "Invoice dapat digenerate setelah BA diverifikasi oleh Finance Specialist.")
      }
    ];
  }

  if (type === "invoice") {
    const isApproved = Boolean(item.approvedManagerBy || ["Approved", "Approved_Tier1", "Approved_Tier2", "Issued", "Paid"].includes(item.status));
    const isPaid = item.status === "Paid" || (item.totalPaid && item.totalPaid >= item.totalInvoice);
    const isRejected = item.status === "Rejected";

    return [
      {
        step: 1,
        title: "Invoice Diterbitkan (Draft)",
        user: item.createdBy || "Admin Finance Site / HO",
        role: "Admin Finance Site / HO",
        time: item.createdAt ? formatDateDisplay(item.createdAt) : formatDateDisplay(item.invoiceDate),
        status: "completed",
        desc: `Master Invoice ${item.invoiceNo} dibuat berdasarkan BA Ref: ${item.baNoReference || "-"}.`
      },
      {
        step: 2,
        title: "Persetujuan Manager FATB",
        user: item.approvedManagerBy ? item.approvedManagerBy : (isApproved ? "Manager FATB (Approved)" : "Belum Disetujui"),
        role: "Manager FATB",
        time: item.approvedManagerAt ? formatDateDisplay(item.approvedManagerAt) : (isApproved ? "Disetujui" : "Menunggu Manager FATB"),
        status: isApproved ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.approvedManagerBy
          ? `Invoice disetujui sah oleh ${item.approvedManagerBy}. Jurnal piutang AR diposting ke buku besar.`
          : (isApproved ? "Persetujuan Manager FATB selesai. Invoice resmi terbit." : "Menunggu pengesahan dan persetujuan tunggal Manager FATB.")
      },
      {
        step: 3,
        title: "Penerimaan & Pelunasan AR",
        user: isPaid ? "Treasury Dept (Lunas)" : "AR Treasury",
        role: "Treasury Dept",
        time: isPaid ? formatDateDisplay(new Date()) : "Menunggu Pelunasan",
        status: isPaid ? "completed" : (isApproved ? "active" : "pending"),
        desc: isPaid
          ? `Pembayaran piutang lunas terverifikasi di mutasi rekening koran.`
          : `Saldo tagihan berjalan: ${formatIDR(item.outstanding || item.totalInvoice)}.`
      }
    ];
  }
  // Payment & customer memakai log audit server (DetailAuditTimeline).
  return [];
};
