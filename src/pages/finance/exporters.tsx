// =============================================================
// EXPORTER PDF / EXCEL modul Finance
// Setiap fungsi menerima snapshot state (ctx) dari controller.
// =============================================================

import { formatIDR, getBAStatusForExport, parsePeriodToMonthIndex } from "./helpers";

export function exportPaymentDetailPDFImpl(ctx: any, itemData: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
formData, rfIndexCalculated, invLineItems, customerContractMap, getItemEffectiveVolume, getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations, subtotalA, subtotalB, subtotalC, subtotalD, subtotalE, subtotalF
 } = ctx;
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
        <button class="btn-print" onclick="window.print()">ðŸ–¨ï¸ Cetak / Simpan PDF Dokumen Official (1 Halaman A4)</button>

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
}

export function exportARBAIMonitoringExcelImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, periodFilter = "Jul-26", invPeriodFilter = "Jul-26", query = "", onNotice = () => {}
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
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
    onNotice("✅ File Laporan Excel (AR & BAI Monitoring) berhasil di-export!");
}

export function exportARBAIMonitoringPDFImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, periodFilter = "Jul-26", invPeriodFilter = "Jul-26", query = ""
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
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
        <button class="btn-print" onclick="window.print()">ðŸ–¨ï¸ Cetak / Simpan Laporan PDF Official (A4 Landscape)</button>

        <div class="header-box">
          <div class="header-cell" style="width: 40%;">
            <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
          </div>
          <div class="header-cell title-area" style="width: 60%;">
            <h1>AR & BAI OUTSTANDING MONITORING REPORT</h1>
            <p>PT ANDALAN ARTHA PRIMANUSA â€” As of Date: ${formattedDate}</p>
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
}

export function exportBAOnlyExcelImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    baRows: rawBaRows, periodFilter = "Jul-26", query = "", onNotice = () => {}
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
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
    onNotice("ðŸ“Š File Excel Laporan BA Tracker berhasil di-export!");
}

export function exportBAOnlyPDFImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, periodFilter = "Jul-26", query = ""
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
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
        <button class="btn-print" onclick="window.print()">ðŸ–¨ï¸ Cetak Laporan PDF Official BA Tracker (A4 Landscape)</button>

        <div class="header-box">
          <div class="header-cell" style="width: 40%;">
            <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
          </div>
          <div class="header-cell title-area" style="width: 60%;">
            <h1>BERITA ACARA INVOICE (BAI) MONITORING REPORT</h1>
            <p>PT ANDALAN ARTHA PRIMANUSA â€” As of Date: ${formattedDate}</p>
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
}

export function exportAROnlyExcelImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    invoiceRows: rawInvoiceRows, invPeriodFilter = "Jul-26", query = "", onNotice = () => {}
  } = ctx || {};
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
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
    onNotice("ðŸ“Š File Excel Laporan AR Outstanding berhasil di-export!");
}

export function exportAROnlyPDFImpl(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    invoiceRows: rawInvoiceRows, invPeriodFilter = "Jul-26", query = ""
  } = ctx || {};
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
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
        <button class="btn-print" onclick="window.print()">ðŸ–¨ï¸ Cetak Laporan PDF Official AR Outstanding (A4 Landscape)</button>

        <div class="header-box">
          <div class="header-cell" style="width: 40%;">
            <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
          </div>
          <div class="header-cell title-area" style="width: 60%;">
            <h1>AR OUTSTANDING MONITORING REPORT</h1>
            <p>PT ANDALAN ARTHA PRIMANUSA â€” Periode Cut-Off: ${invPeriodFilter === "All" ? "Semua Periode" : `s/d ${invPeriodFilter}`} (Khusus Outstanding) â€” As of Date: ${formattedDate}</p>
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
}

