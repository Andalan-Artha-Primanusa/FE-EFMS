// Finance Formatters — Pure utility functions, no React dependencies
// Source: extracted from FinancePage.tsx L1–L96

export const formatIDR = (val: number): string => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
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

export const formatDateInput = (dateStr: any): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

export const formatDateDisplay = (val: any): string => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const indonesianMonths = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

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
