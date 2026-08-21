import { formatIDR } from "./formatters";
import { getBAStatusForExport } from "../../components/finance/shared/StatusBadge";
import { customerContractMap } from "./sowCatalog";
import { getCustomerCalculations } from "./invoiceCalculations";

export function exportBAOnlyExcel(baRows: any[], query: string, periodFilter: string, onNotice: (msg: string) => void) {
  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  
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
}

export function exportBAOnlyPDF(baRows: any[], invoiceRows: any[], query: string, periodFilter: string) {
  const printWin = window.open("", "_blank", "width=1200,height=900");
  if (!printWin) return;

  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const logoUrl = `${window.location.origin}/andalan-logo.png`;

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
      <tr class="client-banner">
        <td colSpan="2" style="padding: 6px 10px; font-weight: 800; color: #16203b;">
          CLIENT / SITE: <strong style="color: #16203b;">${custCode}</strong> <span style="font-size: 8.5px; font-weight: 600; color: #64748b;">(${custRows.length} BA)</span>
        </td>
        <td class="text-right font-mono" style="font-weight: 800; color: #8e683e;">
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
          <td><strong style="color: #16203b;">${ba.customerCode}</strong></td>
          <td class="text-center">${ba.workPeriod || "-"}</td>
          <td class="text-right font-mono" style="font-weight: 700; color: #1e293b;">${formatIDR(nominal)}</td>
          <td class="text-center">
            <span class="badge ${st.badgeClass}">${st.label}</span>
            ${st.subtext ? `<div style="font-size: 7.5px; color: #64748b; font-weight: 600; margin-top: 2px;">${st.subtext}</div>` : ""}
          </td>
          <td style="color: #334155;">${notes}</td>
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
        * { 
          box-sizing: border-box; 
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          -webkit-print-color-adjust: exact !important; 
          print-color-adjust: exact !important; 
          color-adjust: exact !important; 
        }
        body { 
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; 
          color: #16203b; 
          margin: 0; 
          padding: 10px; 
          font-size: 9.5px; 
          line-height: 1.35; 
          background: #ffffff;
        }
        .header-box { display: table; width: 100%; margin-bottom: 14px; border-bottom: 2.5px solid #a57c50; padding-bottom: 8px; }
        .header-cell { display: table-cell; vertical-align: middle; }
        .logo-img { height: 42px; width: auto; }
        .title-area { text-align: right; }
        .title-area h1 { font-size: 15px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: #16203b; }
        .title-area p { font-size: 9.5px; margin: 3px 0 0 0; color: #64748b; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9.5px; page-break-inside: avoid; border: 1px solid #cbd5e1; }
        th { background: #a57c50 !important; color: #ffffff !important; padding: 8px 10px; font-size: 9px; font-weight: 800; text-transform: uppercase; border: 1px solid #cbd5e1; text-align: center; letter-spacing: 0.4px; }
        td { border: 1px solid #cbd5e1; padding: 6.5px 10px; color: #1e293b; font-size: 9.5px; }
        .client-banner { background: #faf6f0 !important; font-weight: 700; color: #16203b; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
        .client-banner td { border: 1px solid #cbd5e1; padding: 6px 10px; }
        .grand-total { background: #a57c50 !important; color: #ffffff !important; font-weight: 800; font-size: 10.5px; border-top: 1px solid #cbd5e1; }
        .grand-total td { padding: 8.5px 10px; border: 1px solid #cbd5e1; color: #ffffff !important; font-weight: 800; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge { padding: 2.5px 7px; border-radius: 4px; font-weight: 700; font-size: 8px; text-transform: uppercase; display: inline-block; }
        .bg-emerald { background: #ecfdf5 !important; color: #166534 !important; border: 1px solid #86efac; }
        .bg-cyan { background: #faf6f0 !important; color: #77542e !important; border: 1px solid #e5d7c2; }
        .bg-amber { background: #fffbeb !important; color: #92400e !important; border: 1px solid #fde68a; }
        .bg-slate { background: #f8fafc !important; color: #475569 !important; border: 1px solid #cbd5e1; }
        .bg-rose { background: #fff1f2 !important; color: #9f1239 !important; border: 1px solid #fecdd3; }
        .bg-purple { background: #faf5ff !important; color: #6b21a8 !important; border: 1px solid #e9d5ff; }
        .btn-print { background: #a57c50; color: #ffffff; border: 1px solid #8e683e; padding: 8px 18px; font-weight: 700; border-radius: 6px; cursor: pointer; margin-bottom: 12px; font-size: 11px; }
        @media print { 
          .btn-print { display: none !important; } 
        }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">🖨️ Cetak Laporan PDF Official BA Tracker (A4 Landscape)</button>
      <div class="header-box">
        <div class="header-cell" style="width: 35%;">
          <img src="${logoUrl}" alt="ANDALAN Logo" class="logo-img" />
        </div>
        <div class="header-cell title-area" style="width: 65%;">
          <h1>BERITA ACARA INVOICE (BAI) MONITORING REPORT</h1>
          <p>PT ANDALAN ARTHA PRIMANUSA — As of Date: ${formattedDate}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th width="14%">Project</th>
            <th width="10%">Periode</th>
            <th width="15%">Nominal (Rp)</th>
            <th width="18%">Status BA / Invoicing</th>
            <th width="43%">Keterangan / Progress Notes</th>
          </tr>
        </thead>
        <tbody>
          ${pdfRowsBA}
          <tr class="grand-total">
            <td colspan="2" class="text-right" style="padding-right: 12px; color: #ffffff !important;">GRAND TOTAL PROYEKSI BA:</td>
            <td class="text-right font-mono" style="color: #ffffff !important; font-weight: 900;">${formatIDR(totalBAMoney)}</td>
            <td colspan="2"></td>
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

export function exportAROnlyExcel(invoiceRows: any[], query: string, invPeriodFilter: string, onNotice: (msg: string) => void) {
  const targetRows = invoiceRows.filter((r) => {
    const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
    if (!matchQ) return false;
    const outstanding = r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0));
    return outstanding > 0 && r.status !== "Paid";
  });

  const groupedCust = Array.from(new Set(targetRows.map((r) => r.customerCode || "OTHER")));
  let totalAR = 0;
  let excelRows = "";

  groupedCust.forEach((custCode) => {
    const custRows = targetRows.filter((r) => (r.customerCode || "OTHER") === custCode);
    const subtotal = custRows.reduce((sum, r) => sum + (r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0))), 0);
    totalAR += subtotal;

    excelRows += `
      <tr style="background-color: #f1f5f9; font-weight: bold;">
        <td colspan="4" style="border: 1px solid #cbd5e1; padding: 6px;">CLIENT: ${custCode} (${custRows.length} Invoice)</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; color: #b91c1c;">${formatIDR(subtotal)}</td>
      </tr>
    `;

    custRows.forEach((inv) => {
      excelRows += `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 5px;">${inv.customerCode}</td>
          <td style="border: 1px solid #cbd5e1; padding: 5px;">${inv.invoiceNo}</td>
          <td style="border: 1px solid #cbd5e1; padding: 5px;">${inv.workPeriod || "-"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right;">${formatIDR(inv.totalInvoice || 0)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: right; font-weight: bold; color: #b91c1c;">${formatIDR(inv.outstanding || 0)}</td>
        </tr>
      `;
    });
  });

  const excelTemplate = `
    <html>
    <head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /></head>
    <body>
      <h2>PT ANDALAN ARTHA PRIMANUSA - AR OUTSTANDING REPORT</h2>
      <p>Periode: ${invPeriodFilter} | Total AR: ${formatIDR(totalAR)}</p>
      <table border="1">
        <thead>
          <tr style="background: #0f172a; color: white;">
            <th>Customer</th><th>Invoice No</th><th>Periode</th><th>Total Invoice</th><th>Outstanding</th>
          </tr>
        </thead>
        <tbody>${excelRows}</tbody>
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
}

export function exportAROnlyPDF(invoiceRows: any[], query: string, invPeriodFilter: string) {
  const printWin = window.open("", "_blank", "width=1200,height=900");
  if (!printWin) return;

  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const targetRows = invoiceRows.filter((r) => {
    const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
    if (!matchQ) return false;
    const outstanding = r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0));
    return outstanding > 0 && r.status !== "Paid";
  });

  const groupedCust = Array.from(new Set(targetRows.map((r) => r.customerCode || "OTHER")));
  let totalAR = 0;
  let rowsHTML = "";

  groupedCust.forEach((custCode) => {
    const custRows = targetRows.filter((r) => (r.customerCode || "OTHER") === custCode);
    const subtotal = custRows.reduce((sum, r) => sum + (r.outstanding ?? ((r.totalInvoice || 0) - (r.totalPaid || 0))), 0);
    totalAR += subtotal;

    rowsHTML += `
      <tr style="background: #faf6f0; font-weight: bold;">
        <td colspan="4">CLIENT / SITE: ${custCode} (${custRows.length} Invoice)</td>
        <td style="text-align: right; color: #b91c1c;">Subtotal: ${formatIDR(subtotal)}</td>
      </tr>
    `;

    custRows.forEach((row) => {
      rowsHTML += `
        <tr>
          <td>${row.customerCode}</td>
          <td>${row.invoiceNo}</td>
          <td>${row.workPeriod || "-"}</td>
          <td style="text-align: right;">${formatIDR(row.totalInvoice || 0)}</td>
          <td style="text-align: right; font-weight: bold; color: #b91c1c;">${formatIDR(row.outstanding || 0)}</td>
        </tr>
      `;
    });
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AR OUTSTANDING REPORT - ANDALAN</title>
      <style>
        body { font-family: sans-serif; padding: 20px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #a57c50; color: white; padding: 8px; }
        td { border: 1px solid #cbd5e1; padding: 6px; }
        .btn-print { padding: 8px 16px; background: #a57c50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 12px; }
        @media print { .btn-print { display: none; } }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">🖨️ Cetak PDF</button>
      <h2>PT ANDALAN ARTHA PRIMANUSA — AR OUTSTANDING REPORT</h2>
      <p>Periode: ${invPeriodFilter} | Tanggal: ${formattedDate} | Total AR: ${formatIDR(totalAR)}</p>
      <table>
        <thead>
          <tr>
            <th>Customer</th><th>No. Invoice</th><th>Periode</th><th>Total Invoice</th><th>Outstanding</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </body>
    </html>
  `;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}
