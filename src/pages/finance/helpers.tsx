import * as React from "react";
import { Archive, Clock } from "lucide-react";
import { API_BASE } from "../../lib/api";

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

export const formatIDR = (val: any) => {
  if (val === undefined || val === null || val === "") return "Rp 0";
  const num = typeof val === "number" ? val : Number(val);
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
};

export const parseNumber = (str: any): number => {
  if (typeof str === "number") return str;
  if (!str) return 0;
  const clean = String(str).replace(/[^0-9]/g, "");
  return parseInt(clean, 10) || 0;
};

export const formatThousand = (val: any): string => {
  if (val === undefined || val === null || val === "") return "";
  const num = parseNumber(val);
  if (num === 0) return "0";
  return new Intl.NumberFormat("id-ID").format(num);
};

export const formatDateInput = (dateStr: any) => {
  if (!dateStr) return "";
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

  const parts = trimmed.split(/[\s-]+/);
  if (parts.length >= 2) {
    const monthPart = parts[0].toLowerCase();
    let yearPart = parts[1];
    if (yearPart.length === 2) yearPart = `20${yearPart}`;

    let mIdx = indonesianMonths.findIndex(m => m.toLowerCase().startsWith(monthPart));
    if (mIdx === -1) {
      mIdx = shortMonthsEN.findIndex(m => m.toLowerCase().startsWith(monthPart));
    }
    if (mIdx === -1) {
      mIdx = shortMonthsID.findIndex(m => m.toLowerCase().startsWith(monthPart));
    }
    if (mIdx !== -1) {
      return `${yearPart}-${String(mIdx + 1).padStart(2, "0")}`;
    }
  }
  return "";
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

export function getBAInvoiceStatus(ba: any, allInvoices: any[]) {
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

  const custCode = (ba.customerCode || "").trim().toUpperCase();

  // Find all invoices that reference this BA or whose invoiceNo matches linkedNo AND customer
  const matchedInvoices = (allInvoices || []).filter((inv) => {
    const invCust = (inv.customerCode || "").trim().toUpperCase();
    if (custCode && invCust && custCode !== invCust) return false;
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
  const isPOS = baRow?.customerCode === "POS";

  if (allInvoices && baRow) {
    const invStatus = getBAInvoiceStatus(baRow, allInvoices);
    if (isPOS) {
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
    } else {
      // Non-POS (BGG, SBS, DBK)
      if (invStatus.isFullyInvoiced) {
        const inv = invStatus.createdInvoices[0];
        const isDraft = inv?.status === "Draft" || inv?.status === "Submitted" || inv?.status === "Pending Approval";
        if (isDraft) {
          return (
            <div className="flex flex-col items-center gap-0.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                <Clock size={11} className="text-amber-700" /> Invoice Draft (Menunggu Mgr)
              </span>
              <span className="text-[10px] font-mono text-amber-800 font-bold">
                {inv.invoiceNo}
              </span>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1 shadow-2xs">
              <Archive size={11} className="text-purple-700" /> Arsip (Inv Terbit)
            </span>
            <span className="text-[10px] font-mono text-purple-700 font-bold">
              {inv?.invoiceNo || invoiceNoLinked}
            </span>
          </div>
        );
      }
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
  const [localStr, setLocalStr] = React.useState<string>(() => {
    if (value === 0 || value === "0" || !value) return "";
    const n = typeof value === "number" ? value : parseFloat(String(value));
    if (isNaN(n)) return "";
    return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  });

  React.useEffect(() => {
    if (value === 0 || value === "0" || !value) {
      if (localStr === "" || localStr === "0") return;
    }
    const currentNum = parseFloat(localStr.replace(/\./g, "").replace(",", "."));
    const propNum = typeof value === "number" ? value : parseFloat(String(value));
    if (currentNum !== propNum && !isNaN(propNum)) {
      setLocalStr(propNum.toLocaleString("id-ID", { maximumFractionDigits: 2 }));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits, dots and comma
    const clean = raw.replace(/[^0-9.,]/g, "");
    setLocalStr(clean);
    const normalized = clean.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized);
    onChange(isNaN(num) ? 0 : num);
  };

  const handleBlur = () => {
    const normalized = localStr.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized);
    if (!isNaN(num) && num > 0) {
      setLocalStr(num.toLocaleString("id-ID", { maximumFractionDigits: 2 }));
    } else if (isNaN(num) || num === 0) {
      setLocalStr("");
    }
  };

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 pr-14 text-slate-900 font-mono font-bold focus:border-cyan-700 focus:bg-white outline-none text-xs"
          placeholder={placeholder || "0,00"}
          value={localStr}
          onChange={handleChange}
          onBlur={handleBlur}
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

// Minimalist Table & Form Number Input dengan Auto Thousand Separator (.) & Desimal (,)
export function FormattedNumberInput({
  value,
  onChange,
  placeholder = "0",
  allowDecimals = false,
  maxDecimals = 3,
  className = "",
  onFocus,
  onBlur,
}: {
  value: number | string | undefined | null;
  onChange: (val: number) => void;
  placeholder?: string;
  allowDecimals?: boolean;
  maxDecimals?: number;
  className?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  const formatVal = (v: any): string => {
    if (v === undefined || v === null || v === "") return "";
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\./g, "").replace(",", "."));
    if (isNaN(n) || n === 0) return "";
    if (allowDecimals) {
      return n.toLocaleString("id-ID", { maximumFractionDigits: maxDecimals });
    }
    return Math.round(n).toLocaleString("id-ID");
  };

  const [localStr, setLocalStr] = React.useState<string>(() => formatVal(value));
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setLocalStr(formatVal(value));
    }
  }, [value, isFocused]);

  const parseVal = (str: string): number => {
    if (!str || !str.trim()) return 0;
    const clean = str.replace(/[^0-9.,-]/g, "");
    const normalized = clean.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = allowDecimals ? raw.replace(/[^0-9.,-]/g, "") : raw.replace(/[^0-9.-]/g, "");
    setLocalStr(clean);
    onChange(parseVal(clean));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const parsed = parseVal(localStr);
    onChange(parsed);
    setLocalStr(formatVal(parsed));
    onBlur?.(e);
  };

  return (
    <input
      type="text"
      className={className}
      value={isFocused ? localStr : formatVal(value)}
      placeholder={placeholder}
      onFocus={(e) => {
        setIsFocused(true);
        const curNum = typeof value === "number" ? value : parseVal(String(value || ""));
        setLocalStr(curNum && curNum !== 0 ? (allowDecimals ? String(curNum).replace(".", ",") : String(Math.round(curNum))) : "");
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
