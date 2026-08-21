// Finance Number Generators — Nomor surat BA dan Invoice
// Source: extracted from FinancePage.tsx L73–L135

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

export function getYearFromPeriod(periodOrDateStr: string): string {
  const str = periodOrDateStr || "";
  const match4 = str.match(/\b20\d{2}\b/);
  if (match4) return match4[0];
  const match2 = str.match(/-(\d{2})$/);
  if (match2) return `20${match2[1]}`;
  return String(new Date().getFullYear());
}

export function generateBANumberPreview(lastSeqNumber: number, customerCode: string, monthStr: string, yearStr: string): string {
  const nextSeq = String(lastSeqNumber + 1).padStart(2, "0");
  const code = (customerCode || "POS").toUpperCase();
  const romanMonthMap: Record<string, string> = {
    "01": "I", "02": "II", "03": "III", "04": "IV", "05": "V", "06": "VI",
    "07": "VII", "08": "VIII", "09": "IX", "10": "X", "11": "XI", "12": "XII"
  };
  const romanMonth = romanMonthMap[monthStr] || "VI";
  return `${nextSeq}/BA-${code}-NIKEL/${romanMonth}/${yearStr}`;
}

export function generateInvoiceNumberPreview(lastSeqNumber: number, customerCode: string, monthStr: string, yearStr: string): string {
  const nextSeq = String(lastSeqNumber + 1).padStart(3, "0");
  const code = (customerCode || "POS").toUpperCase();
  const romanMonthMap: Record<string, string> = {
    "01": "I", "02": "II", "03": "III", "04": "IV", "05": "V", "06": "VI",
    "07": "VII", "08": "VIII", "09": "IX", "10": "X", "11": "XI", "12": "XII"
  };
  const romanMonth = romanMonthMap[monthStr] || "VI";
  return `${nextSeq}/${code}-AAP/RF/${romanMonth}/${yearStr}`;
}

export function generateInvoiceNumber(customerCode: string, workPeriod: string, existingRowsCount: number): string {
  const code = (customerCode || "POS").toUpperCase();
  const nextSeq = String(existingRowsCount + 1).padStart(3, "0");
  const romanMonth = getRomanMonth(workPeriod);
  const yearStr = getYearFromPeriod(workPeriod);
  return `${nextSeq}/${code}-AAP/RF/${romanMonth}/${yearStr}`;
}
