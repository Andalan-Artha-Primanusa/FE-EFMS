// =============================================================
// EXPORTER PDF / EXCEL modul Finance
// Setiap fungsi menerima snapshot state (ctx) dari controller.
// =============================================================

import { getBGGRFIndexForPeriod, isUnbilledPending } from "./ba_calculations";
import { baseDistanceFor, customerByCode } from "./masterRegistry";
import { baCalc, baUninvoicedCalc, calcCategory, pendingCalc, formatIDR, getBAStatusForExport, getCustomerOfficialName, invoiceCalc, invoiceOutstanding, isAROpen, isBAUninvoiced, parsePeriodToMonthIndex } from "./helpers";

// Blok TTD laporan monitoring (PDF & Excel)
const SIGNATURE_HTML = `
  <table style="width:100%; margin-top:28px; border:none; page-break-inside:avoid;">
    <tr>
      <td style="width:50%; border:none; text-align:center;">Dibuat Oleh,</td>
      <td style="width:50%; border:none; text-align:center;">Diverifikasi Oleh,</td>
    </tr>
    <tr><td style="height:60px; border:none;"></td><td style="height:60px; border:none;"></td></tr>
    <tr>
      <td style="border:none; text-align:center; font-weight:bold;"><u>Lambang Hermawan</u></td>
      <td style="border:none; text-align:center; font-weight:bold;"><u>M Axel Valentino</u></td>
    </tr>
    <tr>
      <td style="border:none; text-align:center;">SPV Finance</td>
      <td style="border:none; text-align:center;">FATB Manager</td>
    </tr>
  </table>`;

const matchQuery = (r: any, query: string) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase());

// AR = aturan AR Dashboard (invoice terkunci, outstanding > 0); periode s.d. filter.
const arInvoices = (invoiceRows: any[], invPeriodFilter: string, query: string) => {
  const target = parsePeriodToMonthIndex(invPeriodFilter);
  return invoiceRows.filter((r) => matchQuery(r, query) && isAROpen(r) && (invPeriodFilter === "All" || parsePeriodToMonthIndex(r.workPeriod || "") <= target));
};

// BAI = BA belum terbit invoice, semua periode per hari ini; nominal = Total Invoice BE (POS 1/2: kategori yang belum terbit).
const baiRows = (baRows: any[], invoiceRows: any[], query: string) => baRows
  .filter((ba) => matchQuery(ba, query) && isBAUninvoiced(ba, invoiceRows))
  .map((ba) => ({ ba, st: getBAStatusForExport(ba, invoiceRows), nominal: baUninvoicedCalc(ba, invoiceRows).totalInvoice }));

export function exportPaymentDetailPDFImpl(ctx: any, itemData: any) {
  const printWin = window.open("", "_blank", "width=1000,height=800");
  if (!printWin) return;
  printWin.document.write(buildInvoiceHTML(ctx, itemData));
  printWin.document.close();
}

// HTML invoice dipakai bersama oleh preview (DetailModal) dan cetak agar tampilannya identik.
export function buildInvoiceHTML(ctx: any, itemData: any, preview = false) {
  const { customerContractMap = {}, baRows } = ctx;
    const custCode = (itemData?.customerCode || "").toUpperCase();
    // Tanggal invoice kosong dicetak "-" (bukan tanggal hari ini) agar dokumen resmi tidak salah tanggal.
    const fmtInvDate = (locale: string, opts: Intl.DateTimeFormatOptions) => itemData?.invoiceDate ? new Date(itemData.invoiceDate).toLocaleDateString(locale, opts) : "-";
    // "Sep-26" -> { short: "Sept 26", covered: "1-30 SEPTEMBER 26" }
    const periodParts = (p: string) => {
      const ym = parsePeriodToMonthIndex(p), y = Math.floor(ym / 100), m = ym % 100;
      if (!m || m > 12) return { short: p, covered: p, coveredID: p, monthYear: p };
      const d = new Date(y, m - 1, 1), yy = String(y).slice(2), last = new Date(y, m, 0).getDate();
      return {
        short: `${d.toLocaleString("en-GB", { month: "short" })} ${yy}`,
        covered: `1-${last} ${d.toLocaleString("en-US", { month: "long" }).toUpperCase()} ${yy}`,
        coveredID: `01 - ${last} ${d.toLocaleString("id-ID", { month: "long" }).toUpperCase()} ${y}`,
        monthYear: `${d.toLocaleString("en-US", { month: "long" }).toUpperCase()} ${y}`,
      };
    };
    const isBGG = custCode === "BGG";
    const isPTRO = custCode === "PTRO" || custCode === "DBK";
    const isSBS = custCode === "SBS";
    const isPOS = !isBGG && !isPTRO && !isSBS;
    const isMDO = itemData?.invoiceCategory === "MDO" || /MDO/i.test(itemData?.activityGroup || "");
    const isRental = itemData?.invoiceCategory === "Rental" || /RENTAL/i.test(itemData?.activityGroup || "");
    const logoUrl = `${window.location.origin}/andalan-logo.png`;

    // Baris & total = angka BE: item invoice tersimpan; tanpa invoice/item, calc BA kategori tersebut.
    const targetBA = baRows?.find((b: any) => b.baNumber === itemData?.baNoReference || b.baNumber === itemData?.baNumber || b.id === (itemData?.baId ?? itemData?.baID)) || (itemData?.calc ? itemData : undefined);
    const category = calcCategory(isRental ? "Rental" : isMDO ? "MDO" : itemData?.invoiceCategory);
    const activeItems: any[] = [itemData?.items, itemData?.lineItems].find((l) => Array.isArray(l) && l.length)
      || (targetBA?.calc?.lines || []).filter((l: any) => l.category === category);
    const c = itemData?.totalInvoice !== undefined ? invoiceCalc(itemData) : baCalc(targetBA, category);
    const amt = (i: any) => Number(i.amount || 0);
    const rate = (i: any) => Number(i.unitRateIDR || i.rate || 0);
    const vol = (i: any) => Number(i.volume || 0);
    const sum = (items: any[], f: (i: any) => number = amt) => items.reduce((s: number, i: any) => s + f(i), 0);
    const bySection = (sec: string) => activeItems.filter((i: any) => i.section === sec);
    const mtrOf = (i: any) => Number(i.overhaulMtr ?? i.distanceM ?? i.distance ?? i.distanceWeightAvg ?? i.baseMtr ?? 0);

    const contractInfo = customerContractMap[custCode];

    let tableBodyHTML = "";
    let totalsFooterHTML = "";
    let noteHTML = "";

    if (custCode === "BGG") {
      // BGG — format resmi "PAYMENT DETAIL".
      const n0 = (v: number) => Math.round(v || 0).toLocaleString("id-ID");
      const v2 = (v: number) => (v || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const label = (i: any) => String(i.sowDescription || i.description || "").replace(/\s*\(RF\)$/, "");
      const byGroup = (items: any[]) => [...items.reduce((m: Map<string, any[]>, i: any) => m.set(i.subSection || "", [...(m.get(i.subSection || "") || []), i]), new Map<string, any[]>())];
      const valRow = (desc: string, i: any, pad: number, bold = false) =>
        `<tr${bold ? ' style="font-weight: bold;"' : ""}><td style="padding-left: ${pad}px;">${desc}</td><td class="text-right">${v2(vol(i))}</td><td class="text-center">${i.unit || ""}</td><td class="text-right">${n0(rate(i))}</td><td class="text-right">${n0(amt(i))}</td></tr>`;
      const subHdr = (text: string, volTxt = "", unit = "") => `<tr style="font-weight: bold;"><td style="padding-left: 10px;">${text}</td><td class="text-right">${volTxt}</td><td class="text-center">${unit}</td><td></td><td></td></tr>`;
      const secHdr = (title: string, amount: number, volTxt = "", unit = "") => `<tr class="sec-hdr"><td style="text-decoration: underline;">${title}</td><td class="text-right">${volTxt}</td><td class="text-center">${unit}</td><td></td><td class="text-right">${amount < 0 ? `(${n0(Math.abs(amount))})` : n0(amount)}</td></tr>`;
      const pitRow = (i: any) => `<tr style="font-weight: bold;"><td style="padding-left: 22px;">${i.description}</td><td></td><td></td><td></td><td></td></tr>`;
      const odRow = (i: any) => {
        const effMtr = mtrOf(i);
        const base = Number(i.baseMtr) || baseDistanceFor("BGG", label(i));
        const mtr = (m: number) => m.toLocaleString("id-ID", { maximumFractionDigits: 3 });
        return valRow(base ? `${mtr(effMtr)} &nbsp;mtr &nbsp;- &nbsp;${mtr(base)} &nbsp;mtr =&nbsp;&nbsp; ${mtr(Math.max(0, effMtr - base))} &nbsp;mtr` : `${mtr(effMtr)} &nbsp;mtr`, i, 34);
      };
      const dedRows = (items: any[]) => items.map((i: any) =>
        `<tr><td colspan="4" style="padding-left: 10px;">${i.description}</td><td class="text-right">(${n0(Math.abs(amt(i)))})</td></tr>`).join("");

      const secAItems = bySection("A");
      const secBItems = bySection("B");
      const secCItems = bySection("C");
      const secDItems = bySection("D");
      const secEItems = bySection("E");
      const secFItems = bySection("F");
      const volOf = (items: any[]) => sum(items, vol);

      tableBodyHTML = `
        ${secHdr("A. OB REMOVAL", sum(secAItems), v2(volOf(secAItems)), "Bcm")}
        ${byGroup(secAItems).map(([sub, items]) => subHdr(sub, v2(volOf(items)), "Bcm") + items.map((i: any) => valRow(label(i), i, 22)).join("")).join("")}

        ${secHdr("B. COAL WINNING", sum(secBItems), v2(volOf(secBItems)), "Ton")}
        ${byGroup(secBItems).map(([sub, items]) => items.length === 1 && sub.includes(items[0].description)
          ? valRow(sub, items[0], 10, true)
          : subHdr(sub, v2(volOf(items)), "Ton") + items.map((i: any) => valRow(label(i), i, 22)).join("")).join("")}

        ${secHdr("C. OVER DISTANCE", sum(secCItems))}
        ${byGroup(secCItems).map(([sub, items]) => subHdr(sub) + items.map((i: any) => pitRow(i) + odRow(i)).join("")).join("")}

        ${secHdr("D. RAISE & FALL'S FACTOR", sum(secDItems))}
        ${byGroup(secDItems).map(([sub, items]) => subHdr(sub) + items.map((i: any) => valRow(sub.includes(label(i)) ? i.description : label(i), i, 22)).join("")).join("")}

        ${secHdr("E. DISCOUNT ON OVERDISTANCE", sum(secEItems))}
        ${dedRows(secEItems)}

        ${secHdr("F. DP FUEL & TRANSPORT", sum(secFItems))}
        ${dedRows(secFItems)}
      `;

      totalsFooterHTML = `
        <tr class="tot-row"><td colspan="4">TOTAL</td><td class="text-right">${n0(c.gross)}</td></tr>
        <tr class="tot-row"><td colspan="4">DPP PPN 11/12</td><td class="text-right">${n0(c.dpp11_12)}</td></tr>
        <tr class="tot-row"><td colspan="4">VAT ( 12%)</td><td class="text-right">${n0(c.vat12)}</td></tr>
        <tr class="tot-row"><td colspan="4">WITH HOLDING TAX ART 23</td><td class="text-right">(${n0(c.pph23)})</td></tr>
        <tr class="tot-row"><td colspan="4">TOTAL INVOICE</td><td class="text-right">${n0(c.totalInvoice)}</td></tr>
      `;

      // Note: indeks Raise & Fall tiap periode baris Seksi D (dari invoice; fallback Master RF periode).
      const rfByPeriod = new Map<string, number>();
      for (const i of secDItems) {
        const p = String(i.workPeriod || i.period || i.notes || "").trim();
        if (p && !rfByPeriod.has(p)) rfByPeriod.set(p, Number(i.rfIndex) || getBGGRFIndexForPeriod(p, 1, targetBA?.bggData?.fuelPeriods));
      }
      noteHTML = rfByPeriod.size ? `
        <div class="note-box">
          Note:<br/><br/>
          <table style="border-collapse: collapse; font-size: 9.5px;">
            ${[...rfByPeriod].map(([p, rf], n) => `<tr><td style="padding: 1px 0; width: 320px;">${n + 1}. Raise &amp; Fall's Factor ${periodParts(p).short}</td><td style="font-weight: bold;">${rf.toLocaleString("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td></tr>`).join("")}
          </table>
        </div>
      ` : "";
    } else if (custCode === "PTRO" || custCode === "DBK") {
      // PTRO / DBK Table Layout (Petrosea "PAYMENT DETAIL" - Dual Currency USD & IDR)
      const num = (v: number, min: number, max = min) => v.toLocaleString("id-ID", { minimumFractionDigits: min, maximumFractionDigits: max });
      const n0 = (v: number) => (v < 0 ? `(${Math.abs(v).toLocaleString("id-ID")})` : v.toLocaleString("id-ID"));
      const secAItems = bySection("A");
      const secBItems = bySection("B");
      const secCItems = bySection("C");
      const otherItems = activeItems.filter((i: any) => !["A", "B", "C"].includes(i.section));
      const isCoalItem = (i: any) => /coal|batubara/i.test(i.subSection || i.description || "");
      // Basis jarak tampilan: item, Master SOW, lalu default kontrak (OB 1.000 m, Coal 3.000 m).
      const baseMtrOf = (i: any) => Number(i.baseMtr) || baseDistanceFor("PTRO", i.description || i.sowDescription || "") || (isCoalItem(i) ? 3000 : 1000);

      const volA = sum(secAItems, vol);
      const volB = sum(secBItems, vol);
      const pit = "PIT SAPAN";
      const emptyCells = (n: number) => "<td></td>".repeat(n);
      const rateRow = (i: any, v: number, unit: string) => {
        const usd = Number(i.unitRateUSD) > 0;
        return `
            <td class="text-right font-mono">${num(v, 3)}</td>
            <td class="text-center">${unit}</td>
            <td class="text-center font-mono">${usd ? num(Number(i.unitRateUSD), 3) : ""}</td>
            <td class="text-center font-mono">${usd ? "" : num(rate(i), 2)}</td>
            <td class="text-center font-mono">${usd ? num(Number(i.kursBI || 0), 2) : ""}</td>
            <td class="text-right font-mono">${n0(amt(i))}</td>`;
      };
      const pitHdr = (label: string, items: any[], unit: string) =>
        `<tr><td><strong>${label}</strong></td><td class="text-right font-mono">${num(sum(items, vol), 3)}</td><td class="text-center">${unit}</td>${emptyCells(4)}</tr>`;
      const descRow = (i: any, fallback: string, unit: string) =>
        `<tr><td style="padding-left: 10px;">${(i.description || fallback).toUpperCase()}</td>${rateRow(i, vol(i), i.unit || unit)}</tr>`;

      const overDistanceHTML = (label: string, items: any[]) => items.length ? `
          <tr><td><strong>${label}</strong></td>${emptyCells(6)}</tr>
          <tr><td style="padding-left: 10px;"><strong>${pit}</strong></td>${emptyCells(6)}</tr>
          ${items.map((i: any) => {
            const baseM = baseMtrOf(i);
            const mtr = Number(i.overhaulMtr) || baseM;
            const diff = mtr - baseM;
            return `<tr>
            <td style="padding-left: 10px;">${num(mtr, isCoalItem(i) ? 2 : 3)} mtr - ${baseM} mtr = &nbsp; ${diff < 0 ? `(${num(Math.abs(diff), 2)})` : num(diff, 2)} mtr</td>
            ${amt(i) ? rateRow(i, vol(i), i.unit || "") : emptyCells(6)}
          </tr>`;
          }).join("")}` : "";

      tableBodyHTML = `
        <tr class="sec-hdr">
          <td><u>A. OB REMOVAL</u></td>
          <td class="text-right font-mono">${num(volA, 3)}</td>
          <td class="text-center">Bcm</td>
          ${emptyCells(4)}
        </tr>
        <tr class="gap-row">${emptyCells(7)}</tr>
        ${secAItems.length ? pitHdr(`A1. ${pit}`, secAItems, secAItems[0].unit || "Bcm") + secAItems.map((i: any) => descRow(i, "OVER BURDEN REMOVAL", "Bcm")).join("") : ""}
        <tr class="gap-row">${emptyCells(7)}</tr>

        <tr class="sec-hdr">
          <td><u>B. COAL WINNING</u></td>
          <td class="text-right font-mono">${num(volB, 3)}</td>
          <td class="text-center">Ton</td>
          ${emptyCells(4)}
        </tr>
        <tr class="gap-row">${emptyCells(7)}</tr>
        ${secBItems.length === 1
          ? `<tr><td><strong>B1. ${pit}</strong></td>${rateRow(secBItems[0], vol(secBItems[0]), secBItems[0].unit || "Ton")}</tr>`
          : secBItems.length ? pitHdr(`B1. ${pit}`, secBItems, secBItems[0].unit || "Ton") + secBItems.map((i: any) => descRow(i, "COAL GETTING", "Ton")).join("") : ""}
        <tr class="gap-row">${emptyCells(7)}</tr>

        ${secCItems.length > 0 ? `
        <tr class="sec-hdr">
          <td><u>C. OVER DISTANCE</u></td>
          ${emptyCells(6)}
        </tr>
        <tr class="gap-row">${emptyCells(7)}</tr>
        ${overDistanceHTML("C1. Over Distance For OB Removal", secCItems.filter((i: any) => !isCoalItem(i)))}
        <tr class="gap-row">${emptyCells(7)}</tr>
        ${overDistanceHTML("C2. Over Distance For Coal Winning", secCItems.filter(isCoalItem))}
        ` : ""}
        ${otherItems.map((i: any) => `<tr><td colspan="6" style="padding-left: 10px;">${(i.description || "").toUpperCase()}</td><td class="text-right font-mono">${n0(amt(i))}</td></tr>`).join("")}
        <tr class="filler-row">${emptyCells(7)}</tr>
      `;

      totalsFooterHTML = `
        <tr class="tot-row">
          <td colspan="6"><strong>TOTAL</strong></td>
          <td class="text-right font-mono"><strong>${c.gross.toLocaleString("id-ID")}</strong></td>
        </tr>
        <tr class="tot-row">
          <td colspan="6"><strong>DPP PPN 11/12</strong></td>
          <td class="text-right font-mono"><strong>${c.dpp11_12.toLocaleString("id-ID")}</strong></td>
        </tr>
        <tr class="tot-row">
          <td colspan="6"><strong>VAT ( 12%)</strong></td>
          <td class="text-right font-mono"><strong>${c.vat12.toLocaleString("id-ID")}</strong></td>
        </tr>
        <tr class="tot-row">
          <td colspan="6"><strong>WITH HOLDING TAX ART 23 (2%)</strong></td>
          <td class="text-right font-mono"><strong>(${c.pph23.toLocaleString("id-ID")})</strong></td>
        </tr>
        <tr class="tot-row">
          <td colspan="6"><strong>TOTAL INVOICE</strong></td>
          <td class="text-right font-mono"><strong>${c.totalInvoice.toLocaleString("id-ID")}</strong></td>
        </tr>
      `;
    } else if (custCode === "SBS") {
      // SBS — format resmi "PAYMENT DETAIL" + tabel Pengurang Pembayaran & TOTAL DIBAYAR.
      const n0 = (v: number) => { const r = Math.round(v || 0); return r < 0 ? `(${Math.abs(r).toLocaleString("id-ID")})` : r.toLocaleString("id-ID"); };
      const v2 = (v: number) => (v || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const secAItems = bySection("A");
      const secBItems = bySection("B");
      const secPItems = bySection("P");
      const gap = `<tr class="gap-row"><td></td><td></td><td></td><td></td><td></td></tr>`;
      const secHdr = (title: string, items: any[], unit = "") =>
        `<tr class="sec-hdr"><td style="text-decoration: underline;">${title}</td><td class="text-right">${v2(sum(items, vol))}</td><td class="text-center">${unit}</td><td></td><td class="text-right">${n0(sum(items))}</td></tr>${gap}`;
      const row = (i: any) =>
        `<tr><td style="padding-left: 10px;">${i.description}</td><td class="text-right">${v2(vol(i))}</td><td class="text-center">${i.unit || ""}</td><td class="text-right">${n0(rate(i))}</td><td class="text-right">${n0(amt(i))}</td></tr>`;

      tableBodyHTML = `
        ${gap}
        ${secHdr("OB REMOVAL", secAItems, secAItems[0]?.unit || "")}
        ${secAItems.map(row).join("")}
        ${gap}
        ${secHdr("JASA PENUNJANG PRODUKSI", secBItems)}
        ${secBItems.map(row).join("")}
        ${gap}
      `;

      totalsFooterHTML = `
        <tr class="tot-row"><td colspan="4">TOTAL</td><td class="text-right">${n0(c.gross)}</td></tr>
        <tr class="tot-row"><td colspan="4">DPP PPN 11/12</td><td class="text-right">${n0(c.dpp11_12)}</td></tr>
        <tr class="tot-row"><td colspan="4">VAT ( 12%)</td><td class="text-right">${n0(c.vat12)}</td></tr>
        <tr class="tot-row"><td colspan="4">WITH HOLDING TAX ART 23 (2%)</td><td class="text-right">(${n0(c.pph23)})</td></tr>
        <tr class="tot-row"><td colspan="4">TOTAL INVOICE</td><td class="text-right">${n0(c.totalInvoice)}</td></tr>
      `;

      noteHTML = `
        <table class="main-table" style="margin-top: 10px;">
          <thead>
            <tr>
              <th width="48%" style="text-transform: none; text-align: left;">Pengurang Pembayaran</th>
              <th width="22%" colspan="2" class="text-center" style="text-transform: none;">Claimed Unit</th>
              <th width="12%" class="text-center" style="text-transform: none;">Unit Rate<br/>(IDR)</th>
              <th width="18%" class="text-center" style="text-transform: none;">Amount (IDR)</th>
            </tr>
          </thead>
          <tbody>
            ${gap}
            ${secPItems.map((p: any, n: number) => `<tr><td style="padding-left: 10px;">${n + 1}. ${p.description}</td><td class="text-right">${vol(p) ? v2(vol(p)) : ""}</td><td class="text-center">${p.unit || ""}</td><td class="text-right">${rate(p) ? n0(rate(p)) : ""}</td><td class="text-right">${amt(p) ? `(${n0(Math.abs(amt(p)))})` : ""}</td></tr>`).join("")}
            ${gap}
          </tbody>
        </table>
        <table class="main-table" style="margin-top: 10px;">
          <tr class="tot-row"><td width="82%">TOTAL DIBAYAR</td><td width="18%" class="text-right">${n0(c.totalDibayar)}</td></tr>
        </table>
      `;
    } else {
      // POS — format resmi "PAYMENT DETAIL": huruf seksi berurutan, A per Area.
      const n0 = (v: number) => { const r = Math.round(v || 0); return r < 0 ? `(${Math.abs(r).toLocaleString("id-ID")})` : r.toLocaleString("id-ID"); };
      const v2 = (v: number) => (v || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const uom = (u: string) => /^bcm$/i.test(u || "") ? "Bcm" : (u || "");
      const desc = (i: any) => String(i.description || "").replace(/^[A-Z][0-9]*[.\s-]+\s*/i, "").trim();
      const withArea = (i: any) => i.subSection && !desc(i).includes(i.subSection) ? `${desc(i)} (${i.subSection})` : desc(i);
      const row = (d: string, i: any, pad: number) =>
        `<tr><td style="padding-left: ${pad}px;">${d}</td><td class="text-right">${v2(vol(i))}</td><td class="text-center">${uom(i.unit)}</td><td class="text-right">${n0(rate(i))}</td><td class="text-right">${n0(amt(i))}</td></tr>`;
      const bold = (d: string, items: any[] = [], withTotals = false) =>
        `<tr style="font-weight: bold;"><td>${d}</td><td class="text-right">${withTotals ? v2(sum(items, vol)) : ""}</td><td class="text-center">${withTotals ? uom(items[0]?.unit) : ""}</td><td></td><td class="text-right">${withTotals ? n0(sum(items)) : ""}</td></tr>`;
      const dedRow = (L: string, i: any, n: number) =>
        `<tr><td colspan="4" style="padding-left: 6px;">${L}${n + 1}. ${desc(i)}</td><td class="text-right">(${Math.abs(amt(i)).toLocaleString("id-ID")})</td></tr>`;
      let letter = 0;
      const section = (title: string, items: any[], body: (L: string) => string, volItems?: any[]) => {
        const L = "ABCDEFGH"[letter++];
        return `<tr class="sec-hdr"><td style="text-decoration: underline;">${L}. ${title}</td><td class="text-right">${volItems ? v2(sum(volItems, vol)) : ""}</td><td class="text-center">${volItems ? uom(volItems[0]?.unit) : ""}</td><td></td><td class="text-right">${n0(sum(items))}</td></tr>${body(L)}`;
      };

      const isFacility = ["mess", "mob", "facility"].some((k) => (itemData?.jobType || "").toLowerCase().includes(k)) || (itemData?.invoiceNo || "").toLowerCase().includes("bc-");
      const isLC = (i: any) => i.section === "C" || /land clearing/i.test(i.description || "");
      const mining = isRental ? [] : activeItems;
      const prodItems = mining.filter((i: any) => i.section === "A" && !isLC(i));
      const distItems = mining.filter((i: any) => i.section === "B");
      const lcItems = mining.filter((i: any) => (i.section === "A" || i.section === "C") && isLC(i));
      const rfItems = mining.filter((i: any) => i.section === "D");
      const dedItems = mining.filter((i: any) => i.section === "E");
      const rf = Number(rfItems[0]?.rfIndex) || Number(/RF\s*([\d.]+)/.exec(rfItems[0]?.description || "")?.[1]) || Number(targetBA?.calc?.rfIndex) || Number(targetBA?.posData?.posRfIndex) || 0;
      const areas = [...new Set(prodItems.map((i: any) => i.subSection || ""))];
      const byArea = areas.some(Boolean);

      const parts: string[] = [];
      if (isRental) {
        // Rental POS — format sheet "SEP RENTAL": A sewa (Hrs), B BBM (Ltr), C potongan; tanpa R&F.
        const list = (L: string, items: any[]) => items.map((i: any, n: number) => row(`${L}${n + 1}. ${i.description || ""}`, i, 6)).join("");
        parts.push(section("RENTAL", bySection("A"), (L) => list(L, bySection("A")), bySection("A")));
        parts.push(section("BBM (FUEL)", bySection("B"), (L) => list(L, bySection("B")), bySection("B")));
        parts.push(section("RECONCILE - DEDUCTION", bySection("C"), (L) => bySection("C").map((i: any, n: number) => dedRow(L, i, n)).join("")));
      }
      if (prodItems.length) parts.push(section(isFacility ? "PEKERJAAN FASILITAS / KLAIM PROYEK" : "PRODUCTION", prodItems, (L) => byArea
        ? areas.map((a, n) => { const its = prodItems.filter((i: any) => (i.subSection || "") === a); return bold(`${L}${n + 1}. Area/${a || "-"}`, its, true) + its.map((i: any) => row(desc(i), i, 24)).join(""); }).join("")
        : prodItems.map((i: any, n: number) => row(`${L}${n + 1}. ${desc(i)}`, i, 6)).join(""), byArea ? prodItems : undefined));
      if (distItems.length) parts.push(section("OVER DISTANCE", distItems, (L) => distItems.map((i: any, n: number) => {
        const eff = mtrOf(i), base = Number(i.baseMtr || 0), diff = eff - base;
        const m = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
        return bold(`${L}${n + 1}. ${withArea(i)}`) + row(base ? `${m(eff)} &nbsp;mtr &nbsp;- &nbsp;${m(base)} mtr &nbsp;= &nbsp;&nbsp;${diff < 0 ? `(${m(-diff)})` : m(diff)} &nbsp;mtr` : `${m(eff)} &nbsp;mtr`, i, 24);
      }).join("")));
      if (lcItems.length) parts.push(section("LAND CLEARING", lcItems, (L) => lcItems.map((i: any, n: number) => row(`${L}${n + 1}. ${desc(i)}`, i, 6)).join("")));
      if (rfItems.length) parts.push(section("RAISE & FALL'S FACTOR", rfItems, (L) => rfItems.map((i: any, n: number) => row(`${L}${n + 1}. ${withArea(i)}`, i, 6)).join("")));
      if (dedItems.length) parts.push(section("PENGURANG PEMBAYARAN", dedItems, (L) => dedItems.map((i: any, n: number) => dedRow(L, i, n)).join("")));
      tableBodyHTML = parts.join("");

      totalsFooterHTML = `
        <tr class="tot-row"><td colspan="4">TOTAL</td><td class="text-right">${n0(c.gross)}</td></tr>
        <tr class="tot-row"><td colspan="4">DPP PPN 11/12</td><td class="text-right">${n0(c.dpp11_12)}</td></tr>
        <tr class="tot-row"><td colspan="4">VAT ( 12%)</td><td class="text-right">${n0(c.vat12)}</td></tr>
        <tr class="tot-row"><td colspan="4">WITH HOLDING TAX ART 23</td><td class="text-right">(${n0(c.pph23)})</td></tr>
        <tr class="tot-row"><td colspan="4">TOTAL INVOICE</td><td class="text-right">${n0(c.totalInvoice)}</td></tr>
      `;

      const avgFuel = Number(targetBA?.posData?.rental?.avgFuelPrice || rate(bySection("B")[0] || {}));
      noteHTML = isRental ? `
        <div class="note-box" style="font-weight: normal;">
          Note:<br/>
          <table style="border-collapse: collapse; font-size: 9.5px;">
            <tr><td style="padding: 1px 0; width: 420px;">1. Harga solar rata-rata ${periodParts(itemData?.workPeriod || "-").monthYear} (Rp/Ltr)</td><td style="font-weight: bold;">${avgFuel.toLocaleString("id-ID", { maximumFractionDigits: 6 })}</td></tr>
          </table>
        </div>
      ` : rfItems.length && rf ? `
        <div class="note-box" style="font-weight: normal;">
          Note:<br/>
          <table style="border-collapse: collapse; font-size: 9.5px;">
            <tr><td style="padding: 1px 0; width: 420px;">1. Raise &amp; Fall's Factor</td><td style="font-weight: bold;">${rf.toLocaleString("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td></tr>
          </table>
        </div>
      ` : "";
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>INVOICE - ${itemData?.invoiceNo || "Invoice"}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..900;1,300..900&display=swap');
          @page { size: A4 portrait; margin: 6mm 8mm; }
          * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
          body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; color: #0f172a; margin: 0; padding: 4px; font-size: 9.5px; line-height: 1.25; }
          .page-container { border: 1.5px solid #0f172a; padding: 12px 14px; min-height: 98vh; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
          .logo-header { text-align: center; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1.5px solid #0f172a; }
          .logo-img { height: 42px; width: auto; object-fit: contain; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9.5px; }
          .info-table td { padding: 2px 0; vertical-align: top; }
          .title-box { text-align: center; margin-bottom: 6px; margin-top: 2px; }
          .title-box h2 { font-size: 14px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 0; letter-spacing: 1.5px; color: #0f172a; }
          .contract-sub { font-size: 10px; font-weight: 700; margin-top: 2px; color: #334155; }
          .main-table { width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-bottom: 6px; page-break-inside: avoid; }
          .main-table th { background: #f1f5f9; color: #0f172a; border: 1.2px solid #0f172a; padding: 5px 6px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; }
          .main-table td { border: 1px solid #334155; padding: 4px 6px; font-size: 9.5px; color: #0f172a; }
          .sec-hdr { background: #e2e8f0; font-weight: 800; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; }
          .tot-row { background: #ffffff; font-weight: 700; border-top: 1.2px solid #334155; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono, td, th, span, div, p, strong { font-family: 'Plus Jakarta Sans', sans-serif !important; font-variant-numeric: tabular-nums; }
          .note-box { font-size: 9px; margin-bottom: 6px; font-weight: 600; }
          .footer-box { border: 1.5px solid #0f172a; display: table; width: 100%; box-sizing: border-box; page-break-inside: avoid; }
          .footer-cell { display: table-cell; width: 50%; padding: 6px 10px; vertical-align: top; font-size: 9.5px; }
          .footer-left { border-right: 1.5px solid #0f172a; }
          .footer-date { width: 50%; margin-left: 50%; text-align: center; font-size: 9.5px; font-weight: bold; padding: 6px 0 4px; page-break-after: avoid; }
          .sig-space { height: 100px; margin: 2px 0; }
          .btn-print { background: #A57C50; color: white; border: none; padding: 7px 16px; font-weight: bold; border-radius: 3px; cursor: pointer; margin-bottom: 10px; font-size: 11px; transition: background 0.15s; }
          .btn-print:hover { background: #8e6941; }
          @media print { .btn-print { display: none; } body { padding: 0; } .page-container { min-height: auto; } }
          ${preview ? ".page-container { min-height: auto; }" : ""}
          .flat .main-table th, .flat .sec-hdr { background: #fff; border-top: none; border-bottom: none; }
          .flat .main-table th { border: 1.2px solid #0f172a; }
          .flat .main-table tbody td { border-top: none; border-bottom: none; padding: 2px 6px; }
          .flat .gap-row td { height: 10px; }
          .flat .filler-row td { height: 160px; }
          .flat .tot-row td { padding: 1px 6px; border-top: 1px solid #334155; border-bottom: 1px solid #334155; }
          .flat .footer-date { margin-left: 41%; text-align: left; font-weight: normal; }
        </style>
      </head>
      <body>
        ${preview ? "" : `<button class="btn-print" onclick="window.print()">Cetak / Simpan PDF Dokumen Official (1 Halaman A4)</button>`}

        <div class="page-container${isPTRO || isSBS ? " flat" : ""}">
          <div>
            <div class="logo-header">
              <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
            </div>

            ${isBGG ? `
            <table class="info-table">
              <tr>
                <td width="14%"><strong>Company</strong></td>
                <td width="40%">: <strong>PT. BUDI GEMA GEMPITA</strong></td>
                <td width="16%"><strong>Invoice No.</strong></td>
                <td width="30%">: <strong>${itemData?.invoiceNo || "-"}</strong></td>
              </tr>
              <tr>
                <td><strong>Contractor</strong></td>
                <td>: <strong>PT. ANDALAN ARTHA PRIMANUSA</strong></td>
                <td><strong>Period Covered</strong></td>
                <td>: <strong>${periodParts(itemData?.workPeriod || "-").covered}</strong></td>
              </tr>
              <tr>
                <td><strong>Project</strong></td>
                <td>: <strong>${(itemData?.projectSite || contractInfo?.project || "BGG MINING PROJECT").toUpperCase()}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </table>
            ` : isPTRO ? `
            <table class="info-table">
              <tr>
                <td width="12%"><strong>Company</strong></td>
                <td width="42%">: <strong>PT. PETROSEA TBK</strong></td>
                <td width="16%"><strong>Invoice No</strong></td>
                <td width="30%">: <strong>${itemData?.invoiceNo || "-"}</strong></td>
              </tr>
              <tr>
                <td><strong>Contractor</strong></td>
                <td>: <strong>PT. ANDALAN ARTHA PRIMANUSA</strong></td>
                <td><strong>Period Covered</strong></td>
                <td>: <strong>${periodParts(itemData?.workPeriod || "-").coveredID}</strong></td>
              </tr>
              <tr>
                <td><strong>Project</strong></td>
                <td>: <strong>${(itemData?.projectSite || contractInfo?.project || "DBK MINING PROJECT").toUpperCase()}</strong></td>
                <td><strong>No PO</strong></td>
                <td>: <strong>${itemData?.noPO || itemData?.poNumber || "-"}</strong></td>
              </tr>
            </table>
            ` : isPOS ? `
            <table class="info-table">
              <tr>
                <td width="12%"><strong>Company</strong></td>
                <td width="42%">: <strong>${custCode === "POS" ? "PT. POSITION" : getCustomerOfficialName(custCode)}</strong></td>
                <td width="16%"><strong>Invoice No.</strong></td>
                <td width="30%">: <strong>${itemData?.invoiceNo || "-"}</strong></td>
              </tr>
              <tr>
                <td><strong>Contractor</strong></td>
                <td>: <strong>PT. ANDALAN ARTHA PRIMANUSA</strong></td>
                <td><strong>Activity Group</strong></td>
                <td>: <strong>${isRental ? "RENTAL ALAT (DAYWORK)" : isMDO ? "MINE DEVELOPMENT (MDO)" : "OPERATION &amp; MINING"}</strong></td>
              </tr>
              <tr>
                <td><strong>Project</strong></td>
                <td>: <strong>${custCode} PROJECT</strong></td>
                <td><strong>Period Covered</strong></td>
                <td>: <strong>${periodParts(itemData?.workPeriod || "-").monthYear}</strong></td>
              </tr>
            </table>
            ` : `
            <table class="info-table">
              <tr>
                <td width="12%"><strong>Company</strong></td>
                <td width="42%">: <strong>PT SATRIA BAHANA SARANA</strong></td>
                <td width="16%"><strong>Invoice No.</strong></td>
                <td width="30%">: <strong>${itemData?.invoiceNo || "-"}</strong></td>
              </tr>
              <tr>
                <td><strong>Contractor</strong></td>
                <td>: <strong>PT ANDALAN ARTHA PRIMANUSA</strong></td>
                <td><strong>Period Covered</strong></td>
                <td>: <strong>${periodParts(itemData?.workPeriod || "-").coveredID}</strong></td>
              </tr>
              <tr>
                <td><strong>Project</strong></td>
                <td>: <strong>${itemData?.projectSite || contractInfo?.project || "SBS - Tanjung Enim"}</strong></td>
                <td><strong>No PO</strong></td>
                <td>: <strong>${itemData?.noPO || itemData?.poNumber || "-"}</strong></td>
              </tr>
            </table>
            `}

            <div class="title-box">
              <h2>PAYMENT DETAIL</h2>
              ${isBGG ? "" : isPOS ? `
                <table style="margin: 4px auto 0; font-size: 9.5px; font-weight: 700; border-collapse: collapse;">
                  ${String(itemData?.contractNo || contractInfo?.contract || "-").split(/\s*[;\n]\s*/).map((k, n) => `<tr><td style="padding: 1px 6px; vertical-align: top;">${n ? "" : "NO KONTRAK :"}</td><td style="text-align: left; padding: 1px 0;">${k}</td></tr>`).join("")}
                </table>
              ` : isPTRO ? `
                <div class="contract-sub">Contract No : ${itemData?.contractNo || contractInfo?.contract || "-"}</div>
              ` : `
                <div class="contract-sub">(NO KONTRAK : ${itemData?.contractNo || contractInfo?.contract || "-"})</div>
              `}
            </div>

            <table class="main-table">
              <thead>
                <tr>
                  ${!isPTRO ? `
                    <th width="48%">DESCRIPTION</th>
                    <th width="22%" colspan="2" class="text-center">CLAIMED ${isSBS ? "UNIT" : "VOLUME"}</th>
                    <th width="12%" class="text-center">UNIT RATE${isPOS ? "" : "<br/>(IDR)"}</th>
                    <th width="18%" class="text-center">AMOUNT<br/>(IDR)</th>
                  ` : `
                    <th width="38%" class="text-center">DESCRIPTION</th>
                    <th width="18%" colspan="2" class="text-center">CLAIMED VOLUME</th>
                    <th width="9%" class="text-center">UNIT RATE<br/>(USD)</th>
                    <th width="9%" class="text-center">UNIT RATE<br/>(IDR)</th>
                    <th width="10%" class="text-center">KURS<br/>(USD to IDR)</th>
                    <th width="16%" class="text-center">AMOUNT (IDR)</th>
                  `}
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
          </div>

          <div class="footer-date"${isBGG || isPOS ? ' style="width: 100%; margin-left: 0; font-weight: normal;"' : ""}>${isPOS ? `Jakarta ${fmtInvDate("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : isSBS ? `Jakarta, ${fmtInvDate("en-GB", { day: "2-digit", month: "long", year: "2-digit" })}` : `Jakarta, ${fmtInvDate("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}</div>
          <div class="footer-box">
            <div class="footer-cell footer-left">
              <strong style="text-transform: uppercase;">PLEASE MAKE PAYMENT TO THIS ACCOUNT:</strong><br/><br/>
              <table style="width: 100%; font-size: 9.5px;">
                <tr><td width="85">Bank Name</td><td>: <strong>${itemData?.bankName || contractInfo?.bankName || "Bank BNI"}</strong></td></tr>
                <tr><td>A/C Name</td><td>: <strong>${itemData?.bankAccountName || "PT Andalan Artha Primanusa"}</strong></td></tr>
                <tr><td>A/C No</td><td>: <strong style="font-size: 11px;">${itemData?.bankAccountNo || contractInfo?.bankAccountNo || "-"}</strong></td></tr>
                <tr><td>Branch</td><td>: <strong>${(itemData?.bankBranch || contractInfo?.bankBranch || "Harmoni, Jakarta").replace(/,\s*/, isPOS || isSBS ? "<br/>" : ", ")}</strong></td></tr>
              </table>
            </div>
            <div class="footer-cell" style="text-align: center;">
              <strong style="font-size: 9.5px;">SUBMITTED BY,</strong><br/>
              <strong style="font-size: 10px;">PT ANDALAN ARTHA PRIMANUSA</strong>
              <div class="sig-space"></div>
              <strong style="text-decoration: underline; font-size: 10px;">${itemData?.directorName || contractInfo?.directorName || ""}</strong><br/>
              <span style="font-size: 9px;">${itemData?.directorTitle || contractInfo?.directorTitle || "DIRECTOR"}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
}

export function exportARBAIMonitoringExcelImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, invPeriodFilter = "All", query = "", onNotice = () => {}
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const targetInvoices = arInvoices(invoiceRows, invPeriodFilter, query);
    const groupedCust = Array.from(new Set(targetInvoices.map((r) => r.customerCode || "OTHER")));

    let totalARAndalan = 0;
    let excelRowsAR = "";

    groupedCust.forEach((custCode) => {
      const clientRows = targetInvoices.filter((r) => (r.customerCode || "OTHER") === custCode);
      const clientTotalAR = clientRows.reduce((sum, r) => sum + invoiceOutstanding(r), 0);
      const clientTotalAmount = clientRows.reduce((sum, r) => sum + (r.totalInvoice || 0), 0);
      totalARAndalan += clientTotalAR;

      excelRowsAR += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="9" style="padding: 6px; border: 1px solid #cbd5e1;">CLIENT / SITE: ${custCode} (${clientRows.length} Invoice Outstanding)</td>
        </tr>
      `;

      clientRows.forEach((row) => {
        const invDate = row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("id-ID") : "-";
        const invIssued = row.invoiceSubmissionDate ? new Date(row.invoiceSubmissionDate).toLocaleDateString("id-ID") : "-";
        const dueDate = row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-";
        excelRowsAR += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.customerCode}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.workPeriod || "-"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; font-family: monospace; font-weight: bold;">${row.invoiceNo}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.jobType || row.notes || "OB & CG"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right;">${formatIDR(row.totalInvoice)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${invDate}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${invIssued}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${dueDate}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right; font-weight: bold; color: #991b1b;">${formatIDR(invoiceOutstanding(row))}</td>
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
    const targetRows = baiRows(baRows, invoiceRows, query);

    const groupedBACust = Array.from(new Set(targetRows.map(({ ba }) => ba.customerCode || "OTHER")));
    groupedBACust.forEach((custCode) => {
      const custRows = targetRows.filter(({ ba }) => (ba.customerCode || "OTHER") === custCode);
      const custSubtotal = custRows.reduce((sum, { nominal }) => sum + nominal, 0);

      excelRowsBA += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="2" style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 900; color: #0f172a;">CLIENT / SITE: ${custCode} (${custRows.length} BA)</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: 900; color: #0e7490;">Subtotal: ${formatIDR(custSubtotal)}</td>
          <td colspan="2" style="border: 1px solid #cbd5e1;"></td>
        </tr>
      `;

      custRows.forEach(({ ba, st, nominal }) => {
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
              <th>Total Invoice (IDR)</th>
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
        ${SIGNATURE_HTML}
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
    onNotice("✅ File Laporan Excel (AR & BAI Monitoring) berhasil di-export!");
}

export function exportARBAIMonitoringPDFImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, invPeriodFilter = "All", query = ""
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const printWin = window.open("", "_blank", "width=1200,height=900");
  if (!printWin) return;

    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const logoUrl = `${window.location.origin}/andalan-logo.png`;
    const targetInvoices = arInvoices(invoiceRows, invPeriodFilter, query);
    const groupedCust = Array.from(new Set(targetInvoices.map((r) => r.customerCode || "OTHER")));

    let totalARAndalan = 0;
    let pdfRowsAR = "";

    groupedCust.forEach((custCode) => {
      const clientRows = targetInvoices.filter((r) => (r.customerCode || "OTHER") === custCode);
      const clientTotalAR = clientRows.reduce((sum, r) => sum + invoiceOutstanding(r), 0);
      const clientTotalAmount = clientRows.reduce((sum, r) => sum + (r.totalInvoice || 0), 0);
      totalARAndalan += clientTotalAR;

      pdfRowsAR += `
        <tr class="client-banner">
          <td colspan="9">CLIENT / SITE: <strong>${custCode}</strong> (${clientRows.length} Invoice Outstanding)</td>
        </tr>
      `;

      clientRows.forEach((row) => {
        const invDate = row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("id-ID") : "-";
        const invIssued = row.invoiceSubmissionDate ? new Date(row.invoiceSubmissionDate).toLocaleDateString("id-ID") : "-";
        const dueDate = row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-";
        pdfRowsAR += `
          <tr>
            <td><strong>${row.customerCode}</strong></td>
            <td>${row.workPeriod || "-"}</td>
            <td class="font-mono" style="font-weight: 700; color: #0e7490;">${row.invoiceNo}</td>
            <td>${row.jobType || row.notes || "OB & CG"}</td>
            <td class="text-right font-mono">${formatIDR(row.totalInvoice)}</td>
            <td class="text-center">${invDate}</td>
            <td class="text-center">${invIssued}</td>
            <td class="text-center">${dueDate}</td>
            <td class="text-right font-mono" style="font-weight: 800; color: #b91c1c;">${formatIDR(invoiceOutstanding(row))}</td>
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
    const targetBARows = baiRows(baRows, invoiceRows, query);
    const groupedBACust = Array.from(new Set(targetBARows.map(({ ba }) => ba.customerCode || "OTHER")));
    groupedBACust.forEach((custCode) => {
      const custRows = targetBARows.filter(({ ba }) => (ba.customerCode || "OTHER") === custCode);
      const custSubtotal = custRows.reduce((sum, { nominal }) => sum + nominal, 0);

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

      custRows.forEach(({ ba, st, nominal }) => {
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
          .header-box { position: relative; margin-bottom: 12px; border-bottom: 2.5px solid #0f172a; padding-bottom: 8px; min-height: 44px; }
          .logo-area { position: absolute; right: 0; top: 0; }
          .logo-img { height: 38px; width: auto; }
          .title-area { width: 100%; text-align: center; }
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

          .btn-print { background: #A57C50; color: white; border: none; padding: 7px 18px; font-weight: bold; border-radius: 3px; cursor: pointer; margin-bottom: 10px; font-size: 11px; transition: background 0.15s; }
          .btn-print:hover { background: #8e6941; }
          @media print { .btn-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">Cetak / Simpan Laporan PDF Official (A4 Landscape)</button>

        <div class="header-box">
          <div class="title-area">
            <h1>AR & BAI OUTSTANDING MONITORING REPORT</h1>
            <p>PT ANDALAN ARTHA PRIMANUSA — As of Date: ${formattedDate}</p>
          </div>
          <div class="logo-area">
            <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
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
              <th width="12%">Total Invoice</th>
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
              <th width="18%">Nominal (IDR)</th>
              <th width="16%">Status BA / Invoicing</th>
              <th width="42%">Keterangan / Bottleneck & Progress Notes</th>
            </tr>
          </thead>
          <tbody>
            ${pdfRowsBA}
          </tbody>
        </table>

        ${SIGNATURE_HTML}
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
}

export function exportBAOnlyExcelImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, query = "", onNotice = () => {}
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  
  // Export semua BA aktif per hari ini, semua periode (BA On Progress & BA Ready to Invoice, tanpa ARSIP)
  const targetRows = baiRows(baRows, invoiceRows, query);

    const groupedCust = Array.from(new Set(targetRows.map(({ ba }) => ba.customerCode || "OTHER")));

    let totalBAMoney = 0;
    let excelRows = "";

    groupedCust.forEach((custCode) => {
      const custRows = targetRows.filter(({ ba }) => (ba.customerCode || "OTHER") === custCode);
      const custSubtotal = custRows.reduce((sum, { nominal }) => sum + nominal, 0);
      totalBAMoney += custSubtotal;

      excelRows += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="2" style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 900; color: #0f172a;">CLIENT / SITE: ${custCode} (${custRows.length} BA)</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: 900; color: #0e7490;">Subtotal: ${formatIDR(custSubtotal)}</td>
          <td colspan="2" style="border: 1px solid #cbd5e1;"></td>
        </tr>
      `;

      custRows.forEach(({ ba, st, nominal }) => {
        const statusBA = st.label;
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
          table { border-collapse: collapse; width: 100%; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 11px; }
          th { background-color: #A57C50; color: #ffffff; padding: 8px; border: 1px solid #8C6740; text-align: center; font-weight: bold; }
          td { border: 1px solid #D6CFC7; padding: 6px; }
          .title { font-size: 15px; font-weight: 900; color: #1A1612; margin-bottom: 3px; }
          .subtitle { font-size: 11px; color: #6B6055; margin-bottom: 12px; }
          .grand-total { background-color: #1A1612; color: #ffffff; font-weight: bold; font-size: 11.5px; }
        </style>
      </head>
      <body>
        <div class="title">PT ANDALAN ARTHA PRIMANUSA — FATB DIVISION</div>
        <div class="title">Report Berita Acara Invoice (BAI) Monitoring</div>
        <div class="subtitle">As of Date: ${formattedDate}</div>

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
              <td colspan="2" style="text-align: right; padding: 8px; border: 1px solid #1A1612;">TOTAL PROYEKSI PENDAPATAN BA:</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #1A1612; color: #FBF6F0; font-weight: 900;">${formatIDR(totalBAMoney)}</td>
              <td colspan="2" style="border: 1px solid #1A1612;"></td>
            </tr>
          </tbody>
        </table>
        ${SIGNATURE_HTML}
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BAI_Monitoring_ANDALAN_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    onNotice("📊 File Excel Laporan BA Tracker berhasil di-export!");
}

export function exportBAOnlyPDFImpl(ctx: any) {
  const {
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, query = ""
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const printWin = window.open("", "_blank", "width=1280,height=900");
  if (!printWin) return;

  const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));
  const fmtNum = (n: number) => Math.round(n || 0) ? Math.round(n).toLocaleString("id-ID") : "-";
  const periodDate = (p: string) => {
    const idx = parsePeriodToMonthIndex(p || "");
    return idx % 100 ? new Date(Math.floor(idx / 100), (idx % 100) - 1, 1) : null;
  };
  const fmtPeriod = (p: string) => periodDate(p)?.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }).replace(" ", "-") || p || "-";
  const targetRows = baiRows(baRows, invoiceRows, query);

  const groupedCust = Array.from(new Set(targetRows.map(({ ba }) => ba.customerCode || "OTHER")));
  const bodyHTML = groupedCust.map((custCode) => {
    const custRows = targetRows.filter(({ ba }) => (ba.customerCode || "OTHER") === custCode)
      .sort((a, b) => parsePeriodToMonthIndex(a.ba.workPeriod || "") - parsePeriodToMonthIndex(b.ba.workPeriod || ""));
    const subtotal = custRows.reduce((s, { nominal }) => s + nominal, 0);
    return custRows.map(({ ba, st, nominal }, i) => {
      // Keterangan hanya dari catatan manual (modal Catatan BA); diagnosa otomatis tidak dicetak
      const notes = String(ba.notes || "").split("\n").map((l: string) => l.trim().replace(/^-\s*/, "")).filter(Boolean);
      const ready = st.label === "READY TO INVOICE"; // sudah di-approve Manager
      // Final: nilai joint survey sudah diverifikasi Finance Specialist
      const final = Boolean(ba.verifiedBy) && Number(ba.adjustedWorkAmount || 0) > 0;
      return `
        <tr>
          ${i === 0 ? `<td rowspan="${custRows.length + 1}" class="proj">${esc(custCode)}</td>` : ""}
          <td class="c">${fmtPeriod(ba.workPeriod)}</td>
          <td class="r">${fmtNum(nominal)}</td>
          <td class="c">${ready ? "BA Ready to Invoice" : "Pending BAI"}</td>
          <td class="note">${notes.length > 1 ? `<ul>${notes.map((l: string) => `<li>${esc(l)}</li>`).join("")}</ul>` : esc(notes[0] || "")}</td>
          <td class="c">${final ? "Final" : "Draft"}</td>
        </tr>`;
    }).join("") + `
        <tr class="sub">
          <td>Total ${esc(custCode)}</td>
          <td class="r">${fmtNum(subtotal)}</td>
          <td colspan="3"></td>
        </tr>`;
  }).join("");

  // Outstanding per hari ini: semua BA belum terbit invoice + pending volume BA BGG belum ditagih
  const totalInvoice = targetRows.reduce((s, { nominal }) => s + nominal, 0);
  const pendingVolume = baRows.filter(isUnbilledPending).reduce((s, b) => s + pendingCalc(b).totalInvoice, 0);

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Report Berita Acara Invoice (BAI) Monitoring</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 12mm; }
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; padding: 12px; font-size: 10px; color: #222; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
    .head h1 { font-size: 16px; margin: 0; }
    .head .meta { margin-top: 4px; font-size: 9.5px; }
    .logo { height: 44px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { background: #A57C50; color: #fff; font-weight: bold; padding: 5px 6px; border: 1px solid #8A6640; }
    td { border: 1px solid #BFBFBF; padding: 4px 6px; vertical-align: middle; }
    tr { page-break-inside: avoid; }
    .r { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .c { text-align: center; }
    .proj { font-size: 14px; font-weight: bold; text-align: center; }
    .sub td { background: #F5EFE6; font-weight: bold; }
    .note ul { margin: 0; padding-left: 13px; }
    .note li { margin: 1px 0; }
    .summary { margin-top: 16px; }
    .summary td { padding: 5px 6px; font-weight: bold; }
    .btn-print { background: #A57C50; color: white; border: none; padding: 7px 18px; font-weight: bold; border-radius: 3px; cursor: pointer; margin-bottom: 12px; font-size: 11px; }
    @media print { .btn-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF BAI Monitoring (A4 Landscape)</button>
  <div class="head">
    <div>
      <h1>Report Berita Acara Invoice (BAI) Monitoring</h1>
      <div class="meta">As of <b>${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</b></div>
    </div>
    <img src="${window.location.origin}/andalan-logo.png" alt="ANDALAN" class="logo" />
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:9%">Project</th>
        <th style="width:10%">Periode Pekerjaan</th>
        <th style="width:14%">Nominal (Rp)</th>
        <th style="width:14%">Status BA/Invoicing</th>
        <th style="width:42%">Keterangan</th>
        <th style="width:11%">Status Nominal</th>
      </tr>
    </thead>
    <tbody>
      ${bodyHTML || `<tr><td colspan="6" class="c">Tidak ada Berita Acara aktif untuk periode ini.</td></tr>`}
    </tbody>
  </table>

  <table class="summary">
    <thead>
      <tr>
        <th style="width:19%">Total Invoice</th>
        <th style="width:14%">Nominal (Rp)</th>
        <th style="width:28%">Pending Volume (Rp)</th>
        <th style="width:39%">Est Total (Rp)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="c">All Site</td>
        <td class="r">${fmtNum(totalInvoice)}</td>
        <td class="r">${fmtNum(pendingVolume)}</td>
        <td class="r">${fmtNum(totalInvoice + pendingVolume)}</td>
      </tr>
    </tbody>
  </table>

  ${SIGNATURE_HTML}
</body>
</html>`;

  printWin.document.open();
  printWin.document.write(htmlContent);
  printWin.document.close();
}

export function exportAROnlyExcelImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    invoiceRows: rawInvoiceRows, invPeriodFilter = "All", query = "", onNotice = () => {}
  } = ctx || {};
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const targetInvoices = arInvoices(invoiceRows, invPeriodFilter, query);
    const groupedCust = Array.from(new Set(targetInvoices.map((r) => r.customerCode || "OTHER")));

    let totalARAndalan = 0;
    let excelRowsAR = "";

    groupedCust.forEach((custCode) => {
      const clientRows = targetInvoices.filter((r) => (r.customerCode || "OTHER") === custCode);
      const clientTotalAR = clientRows.reduce((sum, r) => sum + invoiceOutstanding(r), 0);
      const clientTotalAmount = clientRows.reduce((sum, r) => sum + (r.totalInvoice || 0), 0);
      totalARAndalan += clientTotalAR;

      excelRowsAR += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="9" style="padding: 6px; border: 1px solid #cbd5e1;">CLIENT / SITE: ${custCode} (${clientRows.length} Invoice Outstanding)</td>
        </tr>
      `;

      clientRows.forEach((row) => {
        const invDate = row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString("id-ID") : "-";
        const invIssued = row.invoiceSubmissionDate ? new Date(row.invoiceSubmissionDate).toLocaleDateString("id-ID") : "-";
        const dueDate = row.dueDate ? new Date(row.dueDate).toLocaleDateString("id-ID") : "-";
        excelRowsAR += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.customerCode}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.workPeriod || "-"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; font-family: monospace; font-weight: bold;">${row.invoiceNo}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.jobType || row.notes || "OB & CG"}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right;">${formatIDR(row.totalInvoice)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${invDate}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${invIssued}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${dueDate}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right; font-weight: bold; color: #991b1b;">${formatIDR(invoiceOutstanding(row))}</td>
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
          table { border-collapse: collapse; width: 100%; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 11px; }
          th { background-color: #A57C50; color: #ffffff; padding: 8px; border: 1px solid #8C6740; text-align: center; font-weight: bold; }
          td { border: 1px solid #D6CFC7; padding: 6px; }
          .title { font-size: 15px; font-weight: 900; color: #1A1612; margin-bottom: 3px; }
          .subtitle { font-size: 11px; color: #6B6055; margin-bottom: 12px; }
          .grand-total { background-color: #1A1612; color: #ffffff; font-weight: bold; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="title">PT ANDALAN ARTHA PRIMANUSA — FATB DIVISION</div>
        <div class="title">AR OUTSTANDING MONITORING REPORT</div>
        <div class="subtitle">As of Date: ${formattedDate}</div>

        <table>
          <thead>
            <tr>
              <th>Project / Client</th>
              <th>Periode Pekerjaan</th>
              <th>No. Invoice</th>
              <th>Remarks / Activity</th>
              <th>Total Invoice (IDR)</th>
              <th>Invoice Date</th>
              <th>Invoice Submission</th>
              <th>Due Date</th>
              <th>Outstanding AR (IDR)</th>
            </tr>
          </thead>
          <tbody>
            ${excelRowsAR}
            <tr class="grand-total">
              <td colspan="8" style="text-align: right; padding: 8px; border: 1px solid #1A1612;">GRAND TOTAL AR OUTSTANDING ANDALAN:</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #1A1612; color: #FBF6F0; font-weight: 900;">${formatIDR(totalARAndalan)}</td>
            </tr>
          </tbody>
        </table>
        ${SIGNATURE_HTML}
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
    onNotice("File Excel Laporan AR Outstanding berhasil di-export!");
}

export function exportAROnlyPDFImpl(ctx: any) {
  const { invoiceRows: rawInvoiceRows, baRows: rawBaRows, sbsPenalties: rawPenalties, invPeriodFilter = "All", query = "" } = ctx || {};
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const penalties: any[] = Array.isArray(rawPenalties) ? rawPenalties : [];
  const printWin = window.open("", "_blank", "width=1200,height=900");
  if (!printWin) return;

  const today = new Date();
  const fmtDate = (d: any) => d && !isNaN(new Date(d).getTime()) ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-") : "";
  const fmtNum = (n: number) => Math.round(n || 0) ? Math.round(n).toLocaleString("id-ID") : "-";
  const fmtPeriod = (p: string) => {
    const idx = parsePeriodToMonthIndex(p || "");
    const m = idx % 100;
    return m ? new Date(Math.floor(idx / 100), m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }).replace(" ", "-") : (p || "-");
  };
  const targetPeriodIndex = parsePeriodToMonthIndex(invPeriodFilter);
  const inPeriod = (p: string) => invPeriodFilter === "All" || parsePeriodToMonthIndex(p || "") <= targetPeriodIndex;
  const targetInvoices = arInvoices(invoiceRows, invPeriodFilter, query);
  const groupedCust = Array.from(new Set(targetInvoices.map((r) => r.customerCode || "OTHER")));

  let arRows = "";
  const grand = { out: 0, ded: 0, nett: 0 };
  groupedCust.forEach((custCode) => {
    const rows = targetInvoices.filter((r) => (r.customerCode || "OTHER") === custCode);
    const sub = { out: 0, ded: 0, nett: 0 };
    arRows += `<tr class="cust"><td colspan="11">${custCode}</td></tr>`;
    rows.forEach((r, i) => {
      const out = invoiceOutstanding(r);
      const ded = Number(r.otherDeduction || 0);
      sub.out += out; sub.ded += ded; sub.nett += out - ded;
      arRows += `
        <tr>
          <td class="c">${i + 1}</td>
          <td class="c">${fmtPeriod(r.workPeriod)}</td>
          <td>${r.invoiceNo || ""}</td>
          <td>${r.jobType || r.notes || "OB & CG"}</td>
          <td class="r">${fmtNum(r.totalInvoice)}</td>
          <td class="c">${fmtDate(r.invoiceDate)}</td>
          <td class="c">${fmtDate(r.invoiceSubmissionDate)}</td>
          <td class="c ${r.dueDate ? (new Date(r.dueDate) < today ? "due-late" : "due-ok") : ""}">${fmtDate(r.dueDate)}</td>
          <td class="r">${fmtNum(out)}</td>
          <td class="r">${fmtNum(ded)}</td>
          <td class="r">${fmtNum(out - ded)}</td>
        </tr>`;
    });
    grand.out += sub.out; grand.ded += sub.ded; grand.nett += sub.nett;
    arRows += `
      <tr class="subtotal">
        <td colspan="8">Total AR ${custCode}</td>
        <td class="r">${fmtNum(sub.out)}</td>
        <td class="r">${fmtNum(sub.ded)}</td>
        <td class="r">${fmtNum(sub.nett)}</td>
      </tr>`;
  });

  // Subject To Invoice: BA yang belum (sepenuhnya) ter-invoice — sama dengan tab "Subject To Invoice"
  const sti = { out: 0, ded: 0, nett: 0 };
  const stiRows = baRows
    .filter((ba) => inPeriod(ba.workPeriod) && isBAUninvoiced(ba, invoiceRows))
    .map((ba) => {
      const cust = (ba.customerCode || "POS").toUpperCase();
      const amount = baUninvoicedCalc(ba, invoiceRows).totalInvoice;
      // Deduction SBS = penalti Section P yang belum dipotong pada periode yang sama
      const ded = cust === "SBS"
        ? penalties
            .filter((p) => p.status !== "Deducted" && parsePeriodToMonthIndex(p.workPeriod || "") === parsePeriodToMonthIndex(ba.workPeriod || ""))
            .reduce((s, p) => s + Number(p.outstandingAmount ?? (Number(p.claimAmount || 0) - Number(p.deductedAmount || 0))), 0)
        : 0;
      sti.out += amount; sti.ded += ded; sti.nett += amount - ded;
      return `
        <tr>
          <td class="c b">${cust}</td>
          <td class="c">${fmtPeriod(ba.workPeriod)}</td>
          <td></td>
          <td>${ba.activityGroup || ba.jobType || "OB & CG"}</td>
          <td class="r">${fmtNum(amount)}</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="r">${fmtNum(amount)}</td>
          <td class="r">${fmtNum(ded)}</td>
          <td class="r">${fmtNum(amount - ded)}</td>
        </tr>`;
    }).join("");

  const headRow = (outLabel: string) => `
    <tr>
      <th style="width:5%">Project</th>
      <th style="width:6%">Inv. Progress</th>
      <th style="width:14%">No. Invoice</th>
      <th style="width:15%">Remarks</th>
      <th style="width:9%">Amount (Rp)</th>
      <th style="width:6%">Invoice Date</th>
      <th style="width:7%">Invoice Submission</th>
      <th style="width:6%">Due Date</th>
      <th style="width:11%">${outLabel} (Rp)</th>
      <th style="width:10%">Deduction Backcharge (Rp)</th>
      <th style="width:11%">Nett (Rp)</th>
    </tr>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AR Outstanding - ANDALAN</title>
      <style>
        @page { size: A4 landscape; margin: 8mm 10mm; }
        * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; padding: 12px; font-size: 9px; color: #222; }
        .head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
        .head h1 { font-size: 16px; margin: 0; }
        .head p { margin: 4px 0 0; font-size: 9.5px; }
        .logo { height: 44px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
        th { background: #A57C50; color: #fff; font-weight: bold; padding: 5px 4px; border: 1px solid #8A6640; }
        td { border: 1px solid #BFBFBF; padding: 4px; vertical-align: middle; }
        tr { page-break-inside: avoid; }
        .r { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .c { text-align: center; white-space: nowrap; }
        .b { font-weight: bold; }
        .cust td { font-size: 11px; font-weight: bold; padding: 5px 4px; }
        .subtotal td, .grand td, .sti-total td { background: #F5EFE6; font-weight: bold; }
        .grand td { font-size: 10.5px; padding: 6px 4px; }
        .due-ok { background: #C6EFCE; color: #000; }
        .due-late { background: #FFC7CE; color: #000; }
        .btn-print { background: #A57C50; color: white; border: none; padding: 7px 18px; font-weight: bold; border-radius: 3px; cursor: pointer; margin-bottom: 12px; font-size: 11px; }
        @media print { .btn-print { display: none; } body { padding: 0; } }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF AR Outstanding (A4 Landscape)</button>
      <div class="head">
        <div>
          <h1>AR Outstanding</h1>
          <p>As of <b>${today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</b></p>
        </div>
        <img src="${window.location.origin}/andalan-logo.png" alt="ANDALAN" class="logo" />
      </div>

      <table>
        <thead>${headRow("Outstanding Receivable")}</thead>
        <tbody>
          ${arRows}
          <tr class="grand">
            <td colspan="8">Total AR Andalan</td>
            <td class="r">${fmtNum(grand.out)}</td>
            <td class="r">${fmtNum(grand.ded)}</td>
            <td class="r">${fmtNum(grand.nett)}</td>
          </tr>
        </tbody>
      </table>

      <table style="margin-top: 18px; page-break-inside: avoid;">
        <thead>
          <tr><th colspan="11" style="text-align:left">Subject To Invoice</th></tr>
          ${headRow("Outstanding")}
        </thead>
        <tbody>
          ${stiRows || `<tr><td colspan="11" class="c">Tidak ada BA pending penagihan.</td></tr>`}
          <tr class="sti-total">
            <td colspan="8">Total Subject To Invoice</td>
            <td class="r">${fmtNum(sti.out)}</td>
            <td class="r">${fmtNum(sti.ded)}</td>
            <td class="r">${fmtNum(sti.nett)}</td>
          </tr>
        </tbody>
      </table>
      ${SIGNATURE_HTML}
    </body>
    </html>
  `;

  printWin.document.open();
  printWin.document.write(htmlContent);
  printWin.document.close();
}

// =============================================================================
// MODUL PAJAK TERPADU: DJP CORETAX 2025/2026 E-FAKTUR & E-BUPOT PPH 23 EXPORTERS
// =============================================================================

const SELLER_NPWP = "024178800041000";
const SELLER_NAME = "PT ANDALAN ARTHA PRIMANUSA";

const taxInvoiceList = (ctx: any, targetInvoices?: any[] | any): any[] =>
  Array.isArray(targetInvoices) ? targetInvoices : (targetInvoices ? [targetInvoices] : (ctx?.invoiceRows || []));

// Pembeli dari Master Customer; customer tanpa NPWP dikosongkan dan dilaporkan.
const taxBuyer = (ctx: any, code: string, missing: Set<string>) => {
  const m = customerByCode(code) || (ctx?.customerRows || []).find((c: any) => String(c.code || "").toUpperCase() === code) || {};
  const npwp = String(m.taxId || m.npwp || "").replace(/\D/g, "");
  if (!npwp) missing.add(code);
  return { npwp, name: getCustomerOfficialName(code), address: m.address || "" };
};

const downloadTaxCSV = (ctx: any, csv: string, prefix: string, invoices: any[], missing: Set<string>) => {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${prefix}_${invoices.length > 1 ? "BATCH" : (invoices[0]?.customerCode || "INVOICE")}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  if (missing.size) ctx?.onNotice?.(`NPWP belum ada di Master Customer: ${[...missing].join(", ")}`);
};

const taxDate = (inv: any) => (inv.invoiceDate ? new Date(inv.invoiceDate) : new Date());

export function exportCoretaxEFakturCSVImpl(ctx: any, targetInvoices?: any[] | any) {
  const invoices = taxInvoiceList(ctx, targetInvoices);
  if (invoices.length === 0) {
    alert("Tidak ada data invoice untuk diexport ke e-Faktur Coretax.");
    return;
  }

  const missing = new Set<string>();
  let csvContent = "FK;KD_JENIS_TRANSAKSI;FG_PENGGANTI;NOMOR_FAKTUR;MASA_PAJAK;TAHUN_PAJAK;TANGGAL_FAKTUR;NPWP_PENJUAL;NAMA_PENJUAL;NPWP_PEMBELI;NAMA_PEMBELI;ALAMAT_PEMBELI;JUMLAH_DPP;JUMLAH_PPN;JUMLAH_PPNBM;ID_KETERANGAN_TAMBAHAN;FG_UANG_MUKA;UANG_MUKA_DPP;UANG_MUKA_PPN;UANG_MUKA_PPNBM;REFERENSI\r\n";
  csvContent += "LT;KODE_OBJEK;NAMA_BARANG;HARGA_SATUAN;JUMLAH_BARANG;HARGA_TOTAL;DISKON;DPP;TARIF_PPN;PPN;TARIF_PPNBM;PPNBM\r\n";

  invoices.forEach((inv) => {
    const custCode = (inv.customerCode || "").toUpperCase();
    const buyer = taxBuyer(ctx, custCode, missing);
    const invDate = taxDate(inv);
    const masaPajak = invDate.getMonth() + 1;
    const tahunPajak = invDate.getFullYear();
    const tglFaktur = `${String(invDate.getDate()).padStart(2, "0")}/${String(masaPajak).padStart(2, "0")}/${tahunPajak}`;
    const cleanInvNo = (inv.invoiceNo || "").replace(/[^0-9]/g, "").padEnd(16, "0").slice(0, 16);
    const { gross, dpp11_12: dpp, vat12: ppn } = invoiceCalc(inv);
    const ref = `${inv.invoiceNo || "-"} (${inv.workPeriod || "-"})`;

    csvContent += `FK;04;0;${cleanInvNo};${masaPajak};${tahunPajak};${tglFaktur};${SELLER_NPWP};${SELLER_NAME};${buyer.npwp};${buyer.name};"${buyer.address}";${dpp};${ppn};0;DPP_NILAI_LAIN_11_12;0;0;0;0;"${ref}"\r\n`;
    csvContent += `OF;MINING_SRV;"JASA PENAMBANGAN ${custCode}";${gross};1;${gross};0;${dpp};12;${ppn};0;0\r\n`;
  });

  downloadTaxCSV(ctx, csvContent, "CORETAX_EFAKTUR", invoices, missing);
}

export function exportEBupotPPh23CSVImpl(ctx: any, targetInvoices?: any[] | any) {
  const invoices = taxInvoiceList(ctx, targetInvoices);
  if (invoices.length === 0) {
    alert("Tidak ada data invoice untuk diexport ke e-Bupot PPh 23.");
    return;
  }

  const missing = new Set<string>();
  let csvContent = "KODE_OBJEK_PAJAK;NPWP_PEMOTONG;NAMA_PEMOTONG;NPWP_BERHAK;NAMA_BERHAK;NO_DOKUMEN_DASAR;TGL_DOKUMEN;JUMLAH_BRUTO;TARIF;JUMLAH_PPH;STATUS_PEMOTONGAN\r\n";

  invoices.forEach((inv) => {
    const buyer = taxBuyer(ctx, (inv.customerCode || "").toUpperCase(), missing);
    const invDate = taxDate(inv);
    const tglDok = `${String(invDate.getDate()).padStart(2, "0")}/${String(invDate.getMonth() + 1).padStart(2, "0")}/${invDate.getFullYear()}`;
    const { gross, pph23 } = invoiceCalc(inv);
    csvContent += `24-104-01;${buyer.npwp};"${buyer.name}";${SELLER_NPWP};"${SELLER_NAME}";"${inv.invoiceNo || "-"}";${tglDok};${gross};2%;${pph23};DIPOTONG\r\n`;
  });

  downloadTaxCSV(ctx, csvContent, "CORETAX_EBUPOT_PPH23", invoices, missing);
}

export function createFinanceExporters(exportCtx: any) {
  return {
    exportPaymentDetailPDF: (itemData: any) => exportPaymentDetailPDFImpl(exportCtx, itemData),
    exportARBAIMonitoringExcel: () => exportARBAIMonitoringExcelImpl(exportCtx),
    exportARBAIMonitoringPDF: () => exportARBAIMonitoringPDFImpl(exportCtx),
    exportBAOnlyExcel: () => exportBAOnlyExcelImpl(exportCtx),
    exportBAOnlyPDF: () => exportBAOnlyPDFImpl(exportCtx),
    exportAROnlyExcel: () => exportAROnlyExcelImpl(exportCtx),
    exportAROnlyPDF: () => exportAROnlyPDFImpl(exportCtx),
    exportCoretaxEFakturCSV: (itemData?: any) => exportCoretaxEFakturCSVImpl(exportCtx, itemData),
    exportEBupotPPh23CSV: (itemData?: any) => exportEBupotPPh23CSVImpl(exportCtx, itemData),
  };
}

