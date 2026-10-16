// =============================================================
// EXPORTER PDF / EXCEL modul Finance
// Setiap fungsi menerima snapshot state (ctx) dari controller.
// =============================================================

import { invoiceTaxes } from "./ba_calculations";
import { pendingAmount } from "./modals/PendingVolumeRecordModal";
import { formatIDR, getBAInvoiceStatus, getBAStatusForExport, getCustomerOfficialName, parsePeriodToMonthIndex } from "./helpers";

export function exportPaymentDetailPDFImpl(ctx: any, itemData: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { 
    formData, rfIndexCalculated, invLineItems, customerContractMap, getItemEffectiveVolume,
    getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations, baRows, buildInvoiceItemsFromBA
  } = ctx;
    const printWin = window.open("", "_blank", "width=1000,height=800");
    if (!printWin) return;

    const custCode = (itemData?.customerCode || formData?.customerCode || "").toUpperCase();
    const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const logoUrl = `${window.location.origin}/andalan-logo.png`;

    const targetBA = baRows?.find((b: any) => b.baNumber === itemData?.baNoReference || b.baNumber === itemData?.baNumber || b.id === itemData?.baID);
    const rawItems = (itemData?.items && Array.isArray(itemData.items) && itemData.items.length > 0)
      ? itemData.items
      : (itemData?.lineItems && Array.isArray(itemData.lineItems) && itemData.lineItems.length > 0)
        ? itemData.lineItems
        : null;
    let activeItems = rawItems
      ? rawItems
      : (invLineItems && invLineItems.length > 0 && (!itemData?.invoiceNo || formData?.invoiceNo === itemData?.invoiceNo)
          ? invLineItems
          : (typeof buildInvoiceItemsFromBA === "function"
              ? buildInvoiceItemsFromBA(targetBA || itemData, custCode, itemData?.invoiceCategory)
              : (itemData?.items || itemData?.lineItems || []))
        );

    if ((!activeItems || activeItems.length === 0 || activeItems.every((i: any) => !(i.volume > 0 || i.amount > 0 || i.unitRateIDR > 0))) && typeof buildInvoiceItemsFromBA === "function") {
      activeItems = buildInvoiceItemsFromBA(itemData, custCode, itemData?.invoiceCategory);
    }

    let c = getCustomerCalculations(activeItems, custCode);

    if (c.totalGross === 0 && (itemData?.revenueGross > 0 || itemData?.subTotalDPP > 0 || itemData?.totalInvoice > 0)) {
      const gross = Number(itemData.revenueGross || itemData.subTotalDPP || 0);
      const tax = invoiceTaxes(gross);
      const dpp = Number(itemData.subTotalDPP || tax.dpp11_12);
      const vat = Number(itemData.ppn11 || tax.vat12);
      const pph = Number(itemData.pph23 || tax.pph23);
      const totInv = Number(itemData.totalInvoice || tax.total);
      const totPay = Number(itemData.totalReceipt || itemData.outstanding || totInv);
      c = {
        ...c,
        totalGross: gross,
        subtotalA: gross,
        dpp11_12: dpp,
        vat12: vat,
        pph23: pph,
        totalInvoice: totInv,
        totalDibayar: totPay,
      };
    }

    const contractInfo = customerContractMap[custCode];

    let tableBodyHTML = "";
    let totalsFooterHTML = "";
    let noteHTML = "";

    if (custCode === "BGG") {
      // BGG Table Layout (Gambar 2)
      const secAItems = activeItems.filter((i: any) => i.section === "A");
      const secBItems = activeItems.filter((i: any) => i.section === "B");
      const secCItems = activeItems.filter((i: any) => i.section === "C");
      const secDItems = activeItems.filter((i: any) => i.section === "D");
      const secEItems = activeItems.filter((i: any) => i.section === "E");
      const secFItems = activeItems.filter((i: any) => i.section === "F");

      const volA = secAItems.reduce((s: number, i: any) => s + (getItemEffectiveVolume(i, activeItems) || i.volume || 0), 0);
      const volB = secBItems.reduce((s: number, i: any) => s + (getItemEffectiveVolume(i, activeItems) || i.volume || 0), 0);

      tableBodyHTML = `
        <tr class="sec-hdr">
          <td>A. OB REMOVAL</td>
          <td class="text-center font-mono">${volA.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td class="text-center">Bcm</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalA.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="5" style="font-weight: bold; padding-left: 10px; background: #fafafa;">A1. Pit Kungkilan</td></tr>
        ${secAItems.map((i: any) => {
          const effVol = getItemEffectiveVolume(i, activeItems);
          const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
          return `
            <tr>
              <td style="padding-left: 20px;">${i.description} &nbsp; &nbsp; <span style="font-size: 8.5px; color: #475569;">${i.period || ""}</span></td>
              <td class="text-center font-mono">${effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
              <td class="text-center">${i.unit || "Bcm"}</td>
              <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
              <td class="text-right font-mono">${amount.toLocaleString("id-ID")}</td>
            </tr>
          `;
        }).join("")}

        <tr class="sec-hdr">
          <td>B. COAL WINNING</td>
          <td class="text-center font-mono">${volB.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td class="text-center">Ton</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalB.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="5" style="font-weight: bold; padding-left: 10px; background: #fafafa;">B1. Pit Kungkilan</td></tr>
        ${secBItems.map((i: any) => {
          const effVol = getItemEffectiveVolume(i, activeItems);
          const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
          return `
            <tr>
              <td style="padding-left: 20px;">${i.description}</td>
              <td class="text-center font-mono">${effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
              <td class="text-center">${i.unit || "Ton"}</td>
              <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
              <td class="text-right font-mono">${amount.toLocaleString("id-ID")}</td>
            </tr>
          `;
        }).join("")}

        <tr class="sec-hdr">
          <td>C. OVER DISTANCE</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalC.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="5" style="font-weight: bold; padding-left: 10px; background: #fafafa;">C1. Over Distance For OB Removal</td></tr>
        ${secCItems.filter((i: any) => i.subSection?.includes("OB") || i.description?.includes("OB")).map((i: any) => {
          const effVol = getItemEffectiveVolume(i, activeItems);
          const effMtr = getItemEffectiveOverhaulMtr(i);
          const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
          const diffMtr = Number((effMtr - 1000).toFixed(3));
          return `
            <tr>
              <td style="padding-left: 20px;">
                Pit Kungkilan<br/>
                <span style="font-size: 8.5px; color: #475569;">${effMtr} mtr - 1000 mtr = ${diffMtr > 0 ? `+${diffMtr}` : diffMtr} mtr &nbsp; &nbsp; ${i.period || ""}</span>
              </td>
              <td class="text-center font-mono">${effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
              <td class="text-center">${i.unit || "Bcm"}</td>
              <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
              <td class="text-right font-mono">${amount.toLocaleString("id-ID")}</td>
            </tr>
          `;
        }).join("")}
        <tr><td colspan="5" style="font-weight: bold; padding-left: 10px; background: #fafafa;">C2. Over Distance For Coal Winning</td></tr>
        ${secCItems.filter((i: any) => !i.subSection?.includes("OB") && !i.description?.includes("OB")).map((i: any) => {
          const effVol = getItemEffectiveVolume(i, activeItems);
          const effMtr = getItemEffectiveOverhaulMtr(i);
          const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
          const diffMtr = Number((effMtr - 1000).toFixed(3));
          return `
            <tr>
              <td style="padding-left: 20px;">
                Pit Kungkilan<br/>
                <span style="font-size: 8.5px; color: #475569;">${effMtr} mtr - 1000 mtr = ${diffMtr > 0 ? `+${diffMtr}` : diffMtr} mtr &nbsp; &nbsp; ${i.period || ""}</span>
              </td>
              <td class="text-center font-mono">${effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
              <td class="text-center">${i.unit || "Ton"}</td>
              <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
              <td class="text-right font-mono">${amount.toLocaleString("id-ID")}</td>
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
        ${secDItems.map((i: any) => {
          const effVol = getItemEffectiveVolume(i, activeItems);
          const { unitRate, amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
          return `
            <tr>
              <td style="padding-left: 20px;">${i.subSection || ""} ${i.description} &nbsp; &nbsp; <span style="font-size: 8.5px; color: #475569;">${i.period || ""}</span></td>
              <td class="text-center font-mono">${effVol.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
              <td class="text-center">${i.unit || "Bcm"}</td>
              <td class="text-right font-mono">${unitRate.toLocaleString("id-ID")}</td>
              <td class="text-right font-mono">${amount.toLocaleString("id-ID")}</td>
            </tr>
          `;
        }).join("")}

        <tr class="sec-hdr" style="background: #fee2e2;">
          <td colspan="4">E. DISCOUNT ON OVERDISTANCE</td>
          <td class="text-right font-mono font-black">(${Math.abs(c.subtotalE).toLocaleString("id-ID")})</td>
        </tr>
        ${secEItems.map((i: any) => {
          const { amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
          return `
            <tr>
              <td colspan="4" style="padding-left: 20px;">${i.description}</td>
              <td class="text-right font-mono">(${Math.abs(amount).toLocaleString("id-ID")})</td>
            </tr>
          `;
        }).join("")}

        <tr class="sec-hdr" style="background: #fee2e2;">
          <td colspan="4">F. DP FUEL & TRANSPORT (Deduction)</td>
          <td class="text-right font-mono font-black">(${Math.abs(c.subtotalF).toLocaleString("id-ID")})</td>
        </tr>
        ${secFItems.map((i: any) => {
          const { amount } = calculateItemRateAndAmount(i, "BGG", activeItems);
          return `
            <tr>
              <td colspan="4" style="padding-left: 20px;">${i.description}</td>
              <td class="text-right font-mono">(${Math.abs(amount).toLocaleString("id-ID")})</td>
            </tr>
          `;
        }).join("")}
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
    } else if (custCode === "PTRO" || custCode === "DBK") {
      // PTRO / DBK Table Layout (Petrosea - Dual Currency USD & IDR)
      const secAItems = activeItems.filter((i: any) => i.section === "A");
      const secBItems = activeItems.filter((i: any) => i.section === "B");
      const secCItems = activeItems.filter((i: any) => {
        if (i.section !== "C") return false;
        const baseM = i.baseMtr || ((i.subSection || i.description || "").toLowerCase().includes("coal") ? 3000 : 1000);
        return (i.overhaulMtr ?? baseM) > baseM;
      });

      const volA = secAItems.reduce((s: number, i: any) => s + (i.volume || 0), 0);
      const volB = secBItems.reduce((s: number, i: any) => s + (i.volume || 0), 0);

      tableBodyHTML = `
        <tr class="sec-hdr">
          <td>A. OB REMOVAL</td>
          <td class="text-center font-mono">${volA.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-center">Bcm</td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalA.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="6" style="font-weight: bold; padding-left: 10px; background: #fafafa;">A1. PIT SAPAN</td></tr>
        ${secAItems.map((i: any) => `
          <tr>
            <td style="padding-left: 20px;">${i.description}</td>
            <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-center">${i.unit || "Bcm"}</td>
            <td class="text-right font-mono">${(i.unitRateUSD || 0).toFixed(3)}</td>
            <td class="text-right font-mono">${(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}

        <tr class="sec-hdr">
          <td>B. COAL WINNING</td>
          <td class="text-center font-mono">${volB.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-center">Ton</td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalB.toLocaleString("id-ID")}</td>
        </tr>
        <tr><td colspan="6" style="font-weight: bold; padding-left: 10px; background: #fafafa;">B1. PIT SAPAN</td></tr>
        ${secBItems.map((i: any) => `
          <tr>
            <td style="padding-left: 20px;">PIT SAPAN</td>
            <td class="text-center font-mono">${(i.actualVolume || i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-center">${i.unit || "Ton"}</td>
            <td class="text-right font-mono">${(i.unitRateUSD || 0).toFixed(3)}</td>
            <td class="text-right font-mono">${(i.kursBI || 17140.76).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateUSD || 0) * (i.kursBI || 17140.76)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}

        ${secCItems.length > 0 ? `
        <tr class="sec-hdr">
          <td>C. OVER DISTANCE</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalC.toLocaleString("id-ID")}</td>
        </tr>
        ${secCItems.map((i: any) => {
          const isCoal = (i.subSection || i.description || "").toLowerCase().includes("coal") || (i.subSection || i.description || "").toLowerCase().includes("batubara");
          const baseM = i.baseMtr || (isCoal ? 3000 : 1000);
          const diff = Math.max(0, (i.overhaulMtr || baseM) - baseM);
          const usdRate = i.unitRateUSD || 0.028;
          const idrRate = i.unitRateIDR || 230;
          const kurs = i.kursBI || 0;
          const amount = !isCoal
            ? Math.round((i.volume || 0) * (diff / 100) * usdRate * kurs)
            : Math.round((i.volume || 0) * (diff / 100) * idrRate);

          return `
            <tr>
              <td style="padding-left: 20px;">
                <strong>${i.subSection || i.description || ""}</strong><br/>
                PIT SAPAN<br/>
                <span style="font-size: 8.5px; color: #475569;">${(i.overhaulMtr || baseM).toLocaleString("id-ID", { minimumFractionDigits: 2 })} mtr - ${baseM} mtr = ${diff.toFixed(2)} mtr</span>
              </td>
              <td class="text-center font-mono">${i.volume ? i.volume.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}</td>
              <td class="text-center">${i.unit || (isCoal ? "Ton" : "Bcm")}</td>
              <td class="text-right font-mono">${!isCoal ? usdRate.toFixed(3) : "-"}</td>
              <td class="text-right font-mono">${!isCoal ? kurs.toLocaleString("id-ID", { minimumFractionDigits: 2 }) : idrRate.toLocaleString("id-ID")}</td>
              <td class="text-right font-mono font-bold">${amount.toLocaleString("id-ID")}</td>
            </tr>
          `;
        }).join("")}
        ` : ""}
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
      const secAItems = activeItems.filter((i: any) => i.section === "A");
      const secBItems = activeItems.filter((i: any) => i.section === "B");
      const secPItems = activeItems.filter((i: any) => i.section === "P");

      const volA = secAItems.reduce((s: number, i: any) => s + (i.volume || 0), 0);
      const volB = secBItems.reduce((s: number, i: any) => s + (i.volume || 0), 0);

      tableBodyHTML = `
        <tr class="sec-hdr">
          <td>OB REMOVAL (Per Area Kerja)</td>
          <td class="text-center font-mono">-</td>
          <td class="text-center font-mono">${volA.toLocaleString("id-ID", { minimumFractionDigits: 2 })} BCM</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalA.toLocaleString("id-ID")}</td>
        </tr>
        ${secAItems.map((i: any) => {
          const dist = i.distanceM ?? i.overhaulMtr;
          return `
          <tr>
            <td style="padding-left: 20px;">${i.description}</td>
            <td class="text-center font-mono font-bold">${dist ? Number(dist).toLocaleString("id-ID") + " m" : "-"}</td>
            <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} ${i.unit || "BCM"}</td>
            <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
          </tr>
          `;
        }).join("")}

        <tr class="sec-hdr">
          <td>JASA PENUNJANG PRODUKSI (Rental Alat)</td>
          <td class="text-center font-mono">-</td>
          <td class="text-center font-mono">${volB.toLocaleString("id-ID", { minimumFractionDigits: 2 })} Hours</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalB.toLocaleString("id-ID")}</td>
        </tr>
        ${secBItems.map((i: any) => `
          <tr>
            <td style="padding-left: 20px;">${i.description}</td>
            <td class="text-center font-mono">-</td>
            <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })} ${i.unit || "Hours"}</td>
            <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
            <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
          </tr>
        `).join("")}
      `;

      totalsFooterHTML = `
        <tr class="tot-row">
          <td colspan="4"><strong>TOTAL (NILAI PEKERJAAN BRUTO)</strong></td>
          <td class="text-right font-mono"><strong>${c.totalGross.toLocaleString("id-ID")}</strong></td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">DPP PPN 11/12</td>
          <td class="text-right font-mono">${c.dpp11_12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">VAT ( 12% ) (+)</td>
          <td class="text-right font-mono">${c.vat12.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="tot-row">
          <td colspan="4">WITH HOLDING TAX ART 23 (2%) (-)</td>
          <td class="text-right font-mono">(${c.pph23.toLocaleString("id-ID")})</td>
        </tr>
        <tr class="net-row">
          <td colspan="4"><strong>TOTAL INVOICE</strong></td>
          <td class="text-right net-val font-mono"><strong>${c.totalInvoice.toLocaleString("id-ID")}</strong></td>
        </tr>
      `;

      noteHTML = `
        <div style="margin-top: 10px; margin-bottom: 6px;">
          <table class="main-table" style="margin-bottom: 0;">
            <thead>
              <tr class="sec-hdr">
                <th colspan="4" style="text-align: left; padding: 4px 6px;">BLOK 2: TABEL KHUSUS PENGURANG PEMBAYARAN (DENDA & BBM)</th>
              </tr>
              <tr style="background: #f8fafc;">
                <th width="45%" style="text-align: left;">PENGURANG PEMBAYARAN</th>
                <th width="20%" style="text-align: center;">CLAIMED UNIT</th>
                <th width="15%" style="text-align: right;">UNIT RATE (IDR)</th>
                <th width="20%" style="text-align: right;">AMOUNT (IDR)</th>
              </tr>
            </thead>
            <tbody>
              ${secPItems.map((p: any) => `
                <tr>
                  <td style="padding-left: 15px;">${p.description}</td>
                  <td class="text-center font-mono">${p.unit || "-"}</td>
                  <td class="text-right font-mono">-</td>
                  <td class="text-right font-mono font-bold">${p.amount ? `(${Math.abs(p.amount).toLocaleString("id-ID")})` : "-"}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr class="tot-row">
                <td colspan="3"><strong>TOTAL PENGURANG PEMBAYARAN</strong></td>
                <td class="text-right font-mono font-bold">(${Math.abs(c.subtotalP).toLocaleString("id-ID")})</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="margin-top: 6px; margin-bottom: 8px; border: 1.5px solid #0f172a; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
          <div>
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0f172a;">BLOK 3: TOTAL DIBAYAR (KAS BERSIH DITERIMA)</div>
            <div style="font-size: 8.5px; color: #475569;">TOTAL INVOICE (Rp ${c.totalInvoice.toLocaleString("id-ID")}) - PENGURANG PEMBAYARAN (Rp ${Math.abs(c.subtotalP).toLocaleString("id-ID")})</div>
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #0f172a; font-family: monospace;">
            Rp ${c.totalDibayar.toLocaleString("id-ID")}
          </div>
        </div>
      `;
    } else {
      // Default: POS Mining Table Layout (Gambar 1)
      const secAItems = activeItems.filter((i: any) => i.section === "A");
      const secBItems = activeItems.filter((i: any) => i.section === "B");
      const secCItems = activeItems.filter((i: any) => i.section === "C");
      const secDItems = activeItems.filter((i: any) => i.section === "D");

      const isFacility = (itemData?.jobType || "").toLowerCase().includes("mess") || (itemData?.jobType || "").toLowerCase().includes("mob") || (itemData?.jobType || "").toLowerCase().includes("facility") || (itemData?.invoiceNo || "").toLowerCase().includes("bc-");
      const isMDO = (itemData?.invoiceCategory === "MDO" || itemData?.activityGroup?.includes("MDO") || formData?.invoiceCategory === "MDO");
      const volA = secAItems.reduce((s: number, i: any) => s + (i.volume || 0), 0);

      const secAHTML = secAItems.length > 0 ? `
        <tr class="sec-hdr">
          <td>${isFacility ? "A. PEKERJAAN FASILITAS / KLAIM PROYEK" : isMDO ? "A. MINE DEVELOPMENT (MDO)" : "A. PRODUCTION"}</td>
          <td class="text-center font-mono">${(isMDO || isFacility) ? "" : volA.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td class="text-center">${(isMDO || isFacility) ? "" : "Bcm"}</td>
          <td></td>
          <td class="text-right font-mono font-black">${c.subtotalA.toLocaleString("id-ID")}</td>
        </tr>
        ${secAItems.map((item: any, idx: number) => {
          const { unitRate, amount } = calculateItemRateAndAmount(item, "POS");
          const effUnitRate = unitRate > 0 ? unitRate : Number(item.unitRateIDR || (item.volume > 0 ? Math.round((item.amount || 0) / item.volume) : 0));
          const effAmount = amount !== 0 ? amount : Number(item.amount || Math.round((item.volume || 0) * effUnitRate));
          const cleanDesc = (item.description || "").replace(/^[A-Z][0-9]*[\.\s\-]+\s*/i, "").trim();
          return `<tr>
            <td style="padding-left: 15px;"><strong>A${idx + 1}.</strong> ${cleanDesc}</td>
            <td class="text-center font-mono">${(item.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="text-center">${item.unit || "Bcm"}</td>
            <td class="text-right font-mono">${effUnitRate.toLocaleString("id-ID")}</td>
            <td class="text-right font-mono"><strong>${effAmount.toLocaleString("id-ID")}</strong></td>
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
        ${secBItems.map((item: any, idx: number) => {
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
        ${secCItems.map((item: any, idx: number) => {
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
        ${secDItems.map((item: any, idx: number) => {
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
          .net-row { background: #f1f5f9; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-weight: 900; font-size: 11px; }
          .net-row td { padding: 6px; font-size: 11px; font-weight: 900; border: 1.2px solid #0f172a; }
          .net-val { font-size: 12.5px; font-weight: 900; color: #0f172a; text-decoration: underline; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono, td, th, span, div, p, strong { font-family: 'Plus Jakarta Sans', sans-serif !important; font-variant-numeric: tabular-nums; }
          .note-box { font-size: 9px; margin-bottom: 6px; font-weight: 600; }
          .footer-box { border: 1.5px solid #0f172a; display: table; width: 100%; box-sizing: border-box; page-break-inside: avoid; }
          .footer-cell { display: table-cell; width: 50%; padding: 6px 10px; vertical-align: top; font-size: 9.5px; }
          .footer-left { border-right: 1.5px solid #0f172a; }
          .sig-space { height: 42px; border-bottom: 1.2px dashed #64748b; margin: 4px 0; }
          .btn-print { background: #A57C50; color: white; border: none; padding: 7px 16px; font-weight: bold; border-radius: 3px; cursor: pointer; margin-bottom: 10px; font-size: 11px; transition: background 0.15s; }
          .btn-print:hover { background: #8e6941; }
          @media print { .btn-print { display: none; } body { padding: 0; } .page-container { min-height: auto; } }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF Dokumen Official (1 Halaman A4)</button>

        <div class="page-container">
          <div>
            <div class="logo-header">
              <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
            </div>

            <table class="info-table">
              <tr>
                <td width="14%"><strong>Company</strong></td>
                <td width="36%">: <strong>${itemData?.customerCode === "POS" ? "PT. POSITION" : itemData?.customerCode === "BGG" ? "PT. BUDI GEMA GEMPITA" : (itemData?.customerCode === "PTRO" || itemData?.customerCode === "DBK") ? "PT. PETROSEA" : itemData?.customerCode === "SBS" ? "PT. SATRIA BAHANA SARANA" : (itemData?.customerCode || "—")}</strong></td>
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
                <td><strong>Project / Site</strong></td>
                <td>: <strong>${itemData?.projectSite || contractInfo?.project || "MINING PROJECT"}</strong></td>
                <td><strong>Activity Group</strong></td>
                <td>: <strong>${(itemData?.activityGroup || itemData?.jobType || (itemData?.invoiceCategory === "MDO" ? "MINE DEVELOPMENT OPERATION (MDO)" : "OPERATION & MINING")).toUpperCase()}</strong></td>
              </tr>
              <tr>
                <td><strong>Period Covered</strong></td>
                <td>: <strong>${itemData?.workPeriod || "-"}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </table>

            <div class="title-box">
              <h2>INVOICE</h2>
              ${custCode === "SBS" ? `
                <div class="contract-sub">(NO KONTRAK : <strong>${itemData?.contractNo || "-"}</strong>)</div>
              ` : `
                <div class="contract-sub">Contract Number : <strong>${itemData?.contractNo || contractInfo?.contract || "001/AAP/2025"}</strong></div>
              `}
            </div>

            <table class="main-table">
              <thead>
                <tr>
                  ${custCode === "SBS" ? `
                    <th width="35%">DESCRIPTION</th>
                    <th width="12%" class="text-center">JARAK (M)</th>
                    <th width="18%" class="text-center">CLAIMED UNIT</th>
                    <th width="15%" class="text-right">UNIT RATE (IDR)</th>
                    <th width="20%" class="text-right">AMOUNT (IDR)</th>
                  ` : `
                    <th width="${(custCode === "PTRO" || custCode === "DBK") ? "35%" : "40%"}">DESCRIPTION</th>
                    <th width="16%" class="text-center">CLAIMED VOLUME</th>
                    <th width="8%" class="text-center">UoM</th>
                    ${(custCode === "PTRO" || custCode === "DBK") ? `
                      <th width="11%" class="text-right">UNIT RATE (USD)</th>
                      <th width="13%" class="text-right">KURS (USD to IDR)</th>
                    ` : `
                      <th width="16%" class="text-right">UNIT RATE (IDR)</th>
                    `}
                    <th width="20%" class="text-right">AMOUNT (IDR)</th>
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

          <div class="footer-box">
            <div class="footer-cell footer-left">
              <strong style="text-transform: uppercase;">PLEASE MAKE PAYMENT TO THIS ACCOUNT:</strong><br/><br/>
              <table style="width: 100%; font-size: 9.5px;">
                <tr><td width="85">Bank Name</td><td>: <strong>${itemData?.bankName || contractInfo?.bankName || "Bank BNI"}</strong></td></tr>
                <tr><td>A/C Name</td><td>: <strong>${itemData?.bankAccountName || "PT Andalan Artha Primanusa"}</strong></td></tr>
                <tr><td>A/C No</td><td>: <strong style="font-size: 11px;">${itemData?.bankAccountNo || contractInfo?.bankAccountNo || "-"}</strong></td></tr>
                <tr><td>Branch</td><td>: <strong>${itemData?.bankBranch || contractInfo?.bankBranch || "Harmoni, Jakarta"}</strong></td></tr>
              </table>
            </div>
            <div class="footer-cell" style="text-align: center;">
              <div style="text-align: right; font-size: 9px; font-weight: bold; margin-bottom: 4px;">Jakarta, ${formattedDate}</div>
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

    printWin.document.write(htmlContent);
    printWin.document.close();
}

export function exportBADocumentPDFImpl(ctx: any, baData: any) {
  const printWin = window.open("", "_blank", "width=1000,height=800");
  if (!printWin) return;

  const custCode = (baData?.customerCode || "BGG").toUpperCase();
  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const logoUrl = `${window.location.origin}/andalan-logo.png`;

  const clientNames: Record<string, string> = {
    BGG: "PT. BUDI GEMA GEMPITA",
    SBS: "PT. SATRIA BAHANA SARANA",
    POS: "PT. POSITION",
    PTRO: "PT. PETROSEA TBK",
    DBK: "PT. PETROSEA TBK"
  };
  const clientName = clientNames[custCode] || `PT. ${custCode}`;
  const siteName = baData?.projectSite || (custCode === "BGG" ? "Pit Kungkilan / IUP BGG Lahat" : custCode === "SBS" ? "Pit E / Tanjung Enim" : custCode === "POS" ? "POS Mining Site" : "DBK Mining Project");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BERITA ACARA - ${baData?.baNumber || "BA"}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..900;1,300..900&display=swap');
        @page { size: A4 portrait; margin: 8mm 10mm; }
        * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
        body { color: #0f172a; margin: 0; padding: 6px; font-size: 9.5px; line-height: 1.3; }
        .page-container { border: 1.5px solid #0f172a; padding: 16px 20px; min-height: 98vh; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
        .kop-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px; }
        .kop-table td { vertical-align: middle; }
        .logo-img { height: 38px; width: auto; object-fit: contain; }
        .doc-header { text-align: center; margin-bottom: 12px; }
        .doc-header h2 { font-size: 13px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 0; letter-spacing: 0.8px; color: #0f172a; }
        .doc-header .doc-num { font-size: 10.5px; font-weight: 700; margin-top: 3px; color: #334155; }
        .narrative { font-size: 9.5px; line-height: 1.4; text-align: justify; margin-bottom: 10px; }
        .narrative p { margin: 0 0 5px 0; }
        .narrative ol { margin: 3px 0 8px 16px; padding: 0; }
        .narrative li { margin-bottom: 3px; }
        .vol-table { width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin: 10px 0; page-break-inside: avoid; }
        .vol-table th { background: #f1f5f9; color: #0f172a; border: 1.2px solid #0f172a; padding: 6px 8px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; text-align: center; }
        .vol-table td { border: 1.2px solid #334155; padding: 5px 8px; font-size: 9.5px; color: #0f172a; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-variant-numeric: tabular-nums; }
        .sig-section { margin-top: 12px; page-break-inside: avoid; }
        .sig-loc-date { text-align: right; font-size: 9.5px; font-weight: 700; margin-bottom: 6px; }
        .sig-grid { display: table; width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .sig-party-title { font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; color: #0f172a; }
        .sig-box-row { display: table-row; }
        .sig-cell { display: table-cell; width: 33.33%; padding: 4px 6px; text-align: center; vertical-align: top; }
        .sig-role { font-size: 9px; font-weight: 700; color: #475569; min-height: 13px; }
        .sig-space { height: 40px; border-bottom: 1px dashed #94a3b8; margin: 4px auto; width: 85%; }
        .sig-name { font-size: 9.5px; font-weight: 900; text-decoration: underline; text-transform: uppercase; }
        .sig-title { font-size: 8.5px; color: #475569; }
        .btn-print { background: #A57C50; color: white; border: none; padding: 7px 16px; font-weight: bold; border-radius: 3px; cursor: pointer; margin-bottom: 10px; font-size: 11px; transition: background 0.15s; }
        .btn-print:hover { background: #8e6941; }
        @media print { .btn-print { display: none; } body { padding: 0; } .page-container { min-height: auto; } }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF Berita Acara Official (A4 Portrait)</button>
      <div class="page-container">
        <div>
          <table class="kop-table">
            <tr>
              <td width="55%">
                <strong style="font-size: 13px; text-transform: uppercase; color: #0f172a;">${clientName}</strong><br/>
                <span style="font-size: 8.5px; color: #475569;">Joint Survey & Operational Mining Report</span>
              </td>
              <td width="45%" style="text-align: right;">
                <img src="${logoUrl}" alt="ANDALAN" class="logo-img" /><br/>
                <span style="font-size: 8.5px; font-weight: 700; color: #334155;">PT ANDALAN ARTHA PRIMANUSA</span>
              </td>
            </tr>
          </table>

          <div class="doc-header">
            <h2>BERITA ACARA KESEPAKATAN PERHITUNGAN JOINT SURVEY</h2>
            <div class="doc-num">Nomor : <strong>${baData?.baNumber || "SRV-OB/001/2026"}</strong></div>
          </div>

          <div class="narrative">
            <p>
              Pada hari ini, <strong>${formattedDate}</strong> telah selesai dilakukan perhitungan bersama (Joint Survey) hasil pelaksanaan pekerjaan penambangan batubara oleh Kontraktor <strong>PT. Andalan Artha Primanusa</strong> di area operasional <strong>${siteName}</strong> milik <strong>${clientName}</strong> untuk periode kerja <strong>${baData?.workPeriod || "-"}</strong> dengan rincian kesepakatan sebagai berikut:
            </p>
            <ol>
              <li>Pengukuran topografi original, progres penggalian (cut), dan penimbunan (fill) dilakukan secara bersama-sama oleh Tim Surveyor kedua belah pihak.</li>
              <li>Hasil perhitungan volume telah diverifikasi dan disepakati bersama memenuhi standar toleransi batas deviasi (&le; 2%).</li>
              <li>Jarak angkut rata-rata (Hauling Distance) dan rute disposal telah diukur dan disetujui sesuai peta situasi kerja tambang.</li>
            </ol>
          </div>

          <table class="vol-table">
            <thead>
              <tr>
                <th width="8%">No</th>
                <th width="42%">Uraian Pekerjaan / Lokasi</th>
                <th width="20%">Volume Kesepakatan</th>
                <th width="12%">Satuan</th>
                <th width="18%">Nilai Klaim (IDR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center font-mono">1</td>
                <td><strong>Pemindahan Overburden (OB Removal)</strong><br/><span style="font-size: 8.5px; color: #475569;">${siteName}</span></td>
                <td class="text-center font-mono font-bold">${(baData?.claimedVolume || baData?.volumeOB || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                <td class="text-center">BCM</td>
                <td class="text-right font-mono font-bold">${formatIDR(baData?.workAmount || 0)}</td>
              </tr>
              ${baData?.coalVolume ? `
              <tr>
                <td class="text-center font-mono">2</td>
                <td><strong>Pengangkutan Batubara (Coal Winning)</strong></td>
                <td class="text-center font-mono font-bold">${Number(baData.coalVolume).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                <td class="text-center">MT / Ton</td>
                <td class="text-right font-mono font-bold">-</td>
              </tr>
              ` : ""}
              ${baData?.rentalHours ? `
              <tr>
                <td class="text-center font-mono">3</td>
                <td><strong>Jasa Penunjang & Rental Alat Berat</strong></td>
                <td class="text-center font-mono font-bold">${Number(baData.rentalHours).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                <td class="text-center">Hours</td>
                <td class="text-right font-mono font-bold">-</td>
              </tr>
              ` : ""}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 900;">
                <td colspan="4" class="text-right" style="padding: 6px 8px; font-size: 9.5px;">TOTAL NILAI KESEPAKATAN PEKERJAAN (BRUTO):</td>
                <td class="text-right font-mono" style="padding: 6px 8px; font-size: 10px; color: #0f172a; text-decoration: underline;">${formatIDR(baData?.workAmount || 0)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="narrative" style="margin-top: 6px;">
            <p>Demikian Berita Acara ini dibuat dengan sebenarnya dan ditandatangani oleh kedua belah pihak untuk dipergunakan sebagai dasar penerbitan Tagihan / Invoice resmi.</p>
          </div>
        </div>

        <div class="sig-section">
          <div class="sig-loc-date">${baData?.siteLocation || "Lahat"}, ${formattedDate}</div>
          
          <div style="margin-bottom: 8px;">
            <div class="sig-party-title">1. Pihak ${clientName}</div>
            <div class="sig-grid">
              <div class="sig-box-row">
                <div class="sig-cell">
                  <div class="sig-role">Diketahui oleh,</div>
                  <div class="sig-space"></div>
                  <div class="sig-name">${baData?.clientKTT || "M. Idris E.K. Ode"}</div>
                  <div class="sig-title">Kepala Teknik Tambang (KTT)</div>
                </div>
                <div class="sig-cell">
                  <div class="sig-role">Disetujui oleh,</div>
                  <div class="sig-space"></div>
                  <div class="sig-name">${baData?.clientKabag || "Mahbub Junaedi"}</div>
                  <div class="sig-title">Kabag. Produksi / Operational</div>
                </div>
                <div class="sig-cell">
                  <div class="sig-role">Disiapkan oleh,</div>
                  <div class="sig-space"></div>
                  <div class="sig-name">${baData?.clientSurveyor || "DN. Wilopo"}</div>
                  <div class="sig-title">Surveyor Tambang</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="sig-party-title">2. Pihak PT. Andalan Artha Primanusa</div>
            <div class="sig-grid">
              <div class="sig-box-row">
                <div class="sig-cell">
                  <div class="sig-role">Diketahui oleh,</div>
                  <div class="sig-space"></div>
                  <div class="sig-name">${baData?.aapPJO || "Eko Guswandono"}</div>
                  <div class="sig-title">Project Manager / PJO</div>
                </div>
                <div class="sig-cell">
                  <div class="sig-role">Disetujui oleh,</div>
                  <div class="sig-space"></div>
                  <div class="sig-name">${baData?.aapKabag || "Alexander Galingging"}</div>
                  <div class="sig-title">Kabag. Engineering & Produksi</div>
                </div>
                <div class="sig-cell">
                  <div class="sig-role">Disiapkan oleh,</div>
                  <div class="sig-space"></div>
                  <div class="sig-name">${baData?.picAAP || "Agus Prasetyo"}</div>
                  <div class="sig-title">Surveyor / Finance PIC</div>
                </div>
              </div>
            </div>
          </div>
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
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, periodFilter = "All", invPeriodFilter = "All", query = "", onNotice = () => {}
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
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.workPeriod || "-"}</td>
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
      const st = getBAStatusForExport(r, invoiceRows);
      if (st.label.startsWith("ARSIP")) return false;
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
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, periodFilter = "All", invPeriodFilter = "All", query = ""
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
            <td>${row.workPeriod || "-"}</td>
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
    const targetBARows = baRows.filter((r) => {
      const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (periodFilter !== "All" && r.workPeriod !== periodFilter) return false;
      const st = getBAStatusForExport(r, invoiceRows);
      if (st.label.startsWith("ARSIP")) return false;
      return true;
    });
    const groupedBACust = Array.from(new Set(targetBARows.map((r) => r.customerCode || "OTHER")));
    groupedBACust.forEach((custCode) => {
      const custRows = targetBARows.filter((r) => (r.customerCode || "OTHER") === custCode);
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

          .sig-table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: avoid; border: 1.5px solid #0f172a; }
          .sig-table th { background: #f1f5f9; color: #0f172a; border: 1.5px solid #0f172a; padding: 6px; font-size: 9px; font-weight: 800; }
          .sig-table td { border: 1.5px solid #0f172a; padding: 8px; text-align: center; height: 55px; vertical-align: bottom; font-weight: 800; font-size: 9px; }

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
              <td><u>Lambang Hermawan</u><br/><span style="font-size: 8.5px; color: #475569; font-weight: 700;">Finance Supervisor</span></td>
              <td><u>M Axel Valentino</u><br/><span style="font-size: 8.5px; color: #475569; font-weight: 700;">FATB Manager</span></td>
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
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, periodFilter = "All", query = "", onNotice = () => {}
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  
  // Export includes only active BA rows for the selected periodFilter (BA On Progress & BA Ready to Invoice, excluding ARSIP)
  const targetRows = baRows.filter((r) => {
      const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
      if (!matchQ) return false;
      if (periodFilter !== "All" && r.workPeriod !== periodFilter) return false;
      const st = getBAStatusForExport(r, invoiceRows);
      if (st.label.startsWith("ARSIP")) return false;
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
        const st = getBAStatusForExport(ba, invoiceRows);
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
              <td colspan="2" style="text-align: right; padding: 8px; border: 1px solid #1A1612;">TOTAL PROYEKSI PENDAPATAN BA:</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #1A1612; color: #FBF6F0; font-weight: 900;">${formatIDR(totalBAMoney)}</td>
              <td colspan="2" style="border: 1px solid #1A1612;"></td>
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
}

export function exportBAOnlyPDFImpl(ctx: any) {
  const {
    baRows: rawBaRows, invoiceRows: rawInvoiceRows, pendingVolumeLedgers: rawLedgers, periodFilter = "All", query = ""
  } = ctx || {};
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];
  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const ledgers: any[] = Array.isArray(rawLedgers) ? rawLedgers : [];
  const printWin = window.open("", "_blank", "width=1280,height=900");
  if (!printWin) return;

  const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));
  const fmtNum = (n: number) => Math.round(n || 0) ? Math.round(n).toLocaleString("id-ID") : "-";
  const periodDate = (p: string) => {
    const idx = parsePeriodToMonthIndex(p || "");
    return idx % 100 ? new Date(Math.floor(idx / 100), (idx % 100) - 1, 1) : null;
  };
  const fmtPeriod = (p: string) => periodDate(p)?.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }).replace(" ", "-") || p || "-";
  // Nominal laporan = nilai invoice (DPP + PPN 12% x 11/12 − PPh 23)
  const withTax = (gross: number) => invoiceTaxes(Number(gross || 0)).total;

  // BA aktif (belum arsip/terbit invoice) sesuai filter periode
  const targetRows = baRows
    .filter((r) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))
    .filter((r) => periodFilter === "All" || r.workPeriod === periodFilter)
    .map((r) => ({ ba: r, st: getBAStatusForExport(r, invoiceRows) }))
    .filter(({ st }) => !st.label.startsWith("ARSIP"));

  const groupedCust = Array.from(new Set(targetRows.map(({ ba }) => ba.customerCode || "OTHER")));
  const bodyHTML = groupedCust.map((custCode) => {
    const custRows = targetRows.filter(({ ba }) => (ba.customerCode || "OTHER") === custCode);
    const subtotal = custRows.reduce((s, { ba }) => s + withTax(ba.workAmount), 0);
    return custRows.map(({ ba, st }, i) => {
      // Keterangan hanya dari catatan manual (modal Catatan BA); diagnosa otomatis tidak dicetak
      const notes = String(ba.notes || "").split("\n").map((l: string) => l.trim().replace(/^-\s*/, "")).filter(Boolean);
      const ready = st.label === "READY TO INVOICE"; // sudah di-approve Manager
      // Final: nilai joint survey sudah diverifikasi Finance Specialist
      const final = Boolean(ba.verifiedBy) && Number(ba.adjustedWorkAmount || 0) > 0;
      return `
        <tr>
          ${i === 0 ? `<td rowspan="${custRows.length + 1}" class="proj">${esc(custCode)}</td>` : ""}
          <td class="c">${fmtPeriod(ba.workPeriod)}</td>
          <td class="r">${fmtNum(withTax(ba.workAmount))}</td>
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

  // Ringkasan periode: periode terpilih, atau periode terbaru bila "Semua Periode"
  const summaryIdx = periodFilter !== "All"
    ? parsePeriodToMonthIndex(periodFilter)
    : Math.max(0, ...targetRows.map(({ ba }) => parsePeriodToMonthIndex(ba.workPeriod || "")).filter((i) => i % 100));
  const monthName = summaryIdx ? new Date(Math.floor(summaryIdx / 100), (summaryIdx % 100) - 1, 1).toLocaleDateString("en-US", { month: "long" }) : "";
  const totalInvoice = targetRows
    .filter(({ ba }) => parsePeriodToMonthIndex(ba.workPeriod || "") === summaryIdx)
    .reduce((s, { ba }) => s + withTax(ba.workAmount), 0);
  const pendingVolume = withTax(ledgers
    .filter((l) => l.remainingVolume > 0 && parsePeriodToMonthIndex(l.workPeriod || l.sourcePeriod || "") === summaryIdx)
    .reduce((s, l) => s + pendingAmount(l.remainingVolume || 0, l.ob1Rate || 0, l.ob2Rate || 0, l.customerCode), 0));

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Berita Acara Invoice (BAI) Monitoring</title>
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
    .notes { margin-top: 18px; font-size: 9px; }
    .notes i { display: block; margin-top: 2px; }
    .btn-print { background: #A57C50; color: white; border: none; padding: 7px 18px; font-weight: bold; border-radius: 3px; cursor: pointer; margin-bottom: 12px; font-size: 11px; }
    @media print { .btn-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF BAI Monitoring (A4 Landscape)</button>
  <div class="head">
    <div>
      <h1>Berita Acara Invoice (BAI) Monitoring</h1>
      <div class="meta">As of <b>${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</b>${periodFilter !== "All" ? ` &nbsp;·&nbsp; Periode <b>${esc(fmtPeriod(periodFilter))}</b>` : ""}</div>
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
        <th style="width:19%">Total Invoice ${monthName}</th>
        <th style="width:14%">Nominal (Rp)</th>
        <th style="width:28%">Pending Volume ${monthName} (Rp)</th>
        <th style="width:39%">Est Total ${monthName} (Rp)</th>
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

  <div class="notes">Notes :<i>Nilai Nominal sudah termasuk pajak. Status Nominal Final = nilai BA Joint Survey sudah diverifikasi Finance Specialist.</i></div>
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
            <td style="border: 1px solid #cbd5e1; padding: 5px;">${row.workPeriod || "-"}</td>
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
              <td colspan="8" style="text-align: right; padding: 8px; border: 1px solid #1A1612;">GRAND TOTAL AR OUTSTANDING ANDALAN:</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #1A1612; color: #FBF6F0; font-weight: 900;">${formatIDR(totalARAndalan)}</td>
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
  const outstandingOf = (r: any) => r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0));

  const targetInvoices = invoiceRows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(query.toLowerCase()) && inPeriod(r.workPeriod) && outstandingOf(r) > 0 && r.status !== "Paid"
  );
  const groupedCust = Array.from(new Set(targetInvoices.map((r) => r.customerCode || "OTHER")));

  let arRows = "";
  const grand = { out: 0, ded: 0, nett: 0 };
  groupedCust.forEach((custCode) => {
    const rows = targetInvoices.filter((r) => (r.customerCode || "OTHER") === custCode);
    const sub = { out: 0, ded: 0, nett: 0 };
    arRows += `<tr class="cust"><td colspan="11">${custCode}</td></tr>`;
    rows.forEach((r, i) => {
      const out = outstandingOf(r);
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
          <td class="c">${fmtDate(r.invoiceIssuedDate)}</td>
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
    .map((ba) => ({ ba, st: getBAInvoiceStatus(ba, invoiceRows) }))
    .filter(({ ba, st }) => inPeriod(ba.workPeriod) && !st.isFullyInvoiced)
    .map(({ ba, st }) => {
      const cust = (ba.customerCode || "POS").toUpperCase();
      const amount = cust === "POS" && st.isPartiallyInvoiced ? Math.round(Number(ba.workAmount || 0) / 2) : Number(ba.workAmount || 0);
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

export function exportCoretaxEFakturCSVImpl(ctx: any, targetInvoices?: any[] | any) {
  const invoices: any[] = Array.isArray(targetInvoices)
    ? targetInvoices
    : (targetInvoices ? [targetInvoices] : (ctx?.invoiceRows || []));

  if (invoices.length === 0) {
    alert("Tidak ada data invoice untuk diexport ke e-Faktur Coretax.");
    return;
  }

  // Tax Master Customer Mapping Grounded in Official Tax Registry
  const taxCustomerRegistry: Record<string, { npwp: string; name: string; address: string; trxType: string }> = {
    BGG: {
      npwp: "027359184012000",
      name: "PT BUDI GEMA GEMPITA",
      address: "Plaza Mandiri Lt. 28, Jl. Jend. Gatot Subroto Kav. 36-38, Jakarta Selatan",
      trxType: "01"
    },
    SBS: {
      npwp: "010718495313000",
      name: "PT SATRIA BAHANA SARANA",
      address: "Jl. Raya Tanjung Enim, Muara Enim, Sumatera Selatan",
      trxType: "04" // DPP Nilai Lain 11/12
    },
    PTRO: {
      npwp: "013092817054000",
      name: "PT PETROSEA TBK",
      address: "Indy Bintaro Office Park, Gedung B, Tangerang Selatan",
      trxType: "01"
    },
    POS: {
      npwp: "028842196064000",
      name: "PT POSITION",
      address: "Wisma Argo Manunggal Lt. 15, Jakarta Selatan",
      trxType: "01"
    }
  };

  const sellerNPWP = "024178800041000";
  const sellerName = "PT ANDALAN ARTHA PRIMANUSA";

  let csvContent = "FK;KD_JENIS_TRANSAKSI;FG_PENGGANTI;NOMOR_FAKTUR;MASA_PAJAK;TAHUN_PAJAK;TANGGAL_FAKTUR;NPWP_PENJUAL;NAMA_PENJUAL;NPWP_PEMBELI;NAMA_PEMBELI;ALAMAT_PEMBELI;JUMLAH_DPP;JUMLAH_PPN;JUMLAH_PPNBM;ID_KETERANGAN_TAMBAHAN;FG_UANG_MUKA;UANG_MUKA_DPP;UANG_MUKA_PPN;UANG_MUKA_PPNBM;REFERENSI\r\n";
  csvContent += "LT;KODE_OBJEK;NAMA_BARANG;HARGA_SATUAN;JUMLAH_BARANG;HARGA_TOTAL;DISKON;DPP;TARIF_PPN;PPN;TARIF_PPNBM;PPNBM\r\n";

  invoices.forEach((inv) => {
    const custCode = (inv.customerCode || "BGG").toUpperCase();
    const custInfo = taxCustomerRegistry[custCode] || taxCustomerRegistry.BGG;
    const invDate = inv.invoiceDate ? new Date(inv.invoiceDate) : new Date();
    const masaPajak = invDate.getMonth() + 1;
    const tahunPajak = invDate.getFullYear();
    const tglFaktur = `${String(invDate.getDate()).padStart(2, "0")}/${String(masaPajak).padStart(2, "0")}/${tahunPajak}`;
    const cleanInvNo = (inv.invoiceNo || "").replace(/[^0-9]/g, "").padEnd(16, "0").slice(0, 16);

    let dpp = Number(inv.subTotalDPP || inv.revenueGross || 0);
    let ppn = Number(inv.ppn12 || inv.ppn11 || 0);
    if (custCode === "SBS") {
      const gross = Number(inv.revenueGross || inv.subTotalDPP || 0);
      ({ dpp11_12: dpp, vat12: ppn } = invoiceTaxes(gross));
    } else if (ppn === 0 && dpp > 0) {
      ppn = Math.round(dpp * 0.12);
    }

    const ref = `${inv.invoiceNo || "-"} (${inv.workPeriod || "-"})`;

    // FK Row
    csvContent += `FK;${custInfo.trxType};0;${cleanInvNo};${masaPajak};${tahunPajak};${tglFaktur};${sellerNPWP};${sellerName};${custInfo.npwp};${custInfo.name};"${custInfo.address}";${Math.round(dpp)};${Math.round(ppn)};0;${custCode === "SBS" ? "DPP_NILAI_LAIN_11_12" : ""};0;0;0;0;"${ref}"\r\n`;

    // OF Row (Line Item)
    const itemName = custCode === "SBS" ? "JASA PENAMBANGAN & PENUNJANG PRODUKSI SBS" : `JASA PENAMBANGAN MINING ${custCode}`;
    csvContent += `OF;MINING_SRV;"${itemName}";${Math.round(dpp)};1;${Math.round(dpp)};0;${Math.round(dpp)};12;${Math.round(ppn)};0;0\r\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `CORETAX_EFAKTUR_${invoices.length > 1 ? "BATCH" : (invoices[0]?.customerCode || "INVOICE")}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportEBupotPPh23CSVImpl(ctx: any, targetInvoices?: any[] | any) {
  const invoices: any[] = Array.isArray(targetInvoices)
    ? targetInvoices
    : (targetInvoices ? [targetInvoices] : (ctx?.invoiceRows || []));

  if (invoices.length === 0) {
    alert("Tidak ada data invoice untuk diexport ke e-Bupot PPh 23.");
    return;
  }

  const taxCustomerRegistry: Record<string, { npwp: string; name: string }> = {
    BGG: { npwp: "027359184012000", name: "PT BUDI GEMA GEMPITA" },
    SBS: { npwp: "010718495313000", name: "PT SATRIA BAHANA SARANA" },
    PTRO: { npwp: "013092817054000", name: "PT PETROSEA TBK" },
    POS: { npwp: "028842196064000", name: "PT POSITION" }
  };

  const sellerNPWP = "024178800041000";
  const sellerName = "PT ANDALAN ARTHA PRIMANUSA";

  let csvContent = "KODE_OBJEK_PAJAK;NPWP_PEMOTONG;NAMA_PEMOTONG;NPWP_BERHAK;NAMA_BERHAK;NO_DOKUMEN_DASAR;TGL_DOKUMEN;JUMLAH_BRUTO;TARIF;JUMLAH_PPH;STATUS_PEMOTONGAN\r\n";

  invoices.forEach((inv) => {
    const custCode = (inv.customerCode || "BGG").toUpperCase();
    const custInfo = taxCustomerRegistry[custCode] || taxCustomerRegistry.BGG;
    const invDate = inv.invoiceDate ? new Date(inv.invoiceDate) : new Date();
    const tglDok = `${String(invDate.getDate()).padStart(2, "0")}/${String(invDate.getMonth() + 1).padStart(2, "0")}/${invDate.getFullYear()}`;

    const gross = Number(inv.revenueGross || inv.subTotalDPP || 0);
    const pph = Number(inv.pph23 || Math.round(gross * 0.02));

    csvContent += `24-104-01;${custInfo.npwp};"${custInfo.name}";${sellerNPWP};"${sellerName}";"${inv.invoiceNo || "-"}";${tglDok};${Math.round(gross)};2%;${Math.round(pph)};DIPOTONG\r\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `CORETAX_EBUPOT_PPH23_${invoices.length > 1 ? "BATCH" : (invoices[0]?.customerCode || "INVOICE")}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function createFinanceExporters(exportCtx: any) {
  return {
    exportPaymentDetailPDF: (itemData: any) => exportPaymentDetailPDFImpl(exportCtx, itemData),
    exportBADocumentPDF: (baData: any) => exportBADocumentPDFImpl(exportCtx, baData),
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

