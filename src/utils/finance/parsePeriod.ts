// Period parser utility
// Source: extracted from FinancePage.tsx L362–L388

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
