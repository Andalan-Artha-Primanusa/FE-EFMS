import React, { useState } from "react";
import {
  FileText, X, Zap, Upload, CheckCircle, ExternalLink,
  Receipt, Plus, CheckCircle2, ShieldCheck
} from "lucide-react";
import { formatIDR, formatDateInput } from "../../../utils/finance/formatters";
import { masterBankAccounts, customerContractMap } from "../../../utils/finance/sowCatalog";
import { getCustomerCalculations } from "../../../utils/finance/invoiceCalculations";
import { BAStatusBadge, InvoiceStatusBadge } from "../shared/StatusBadge";
import { AuditTimeline, generateAuditTimeline } from "../shared/AuditTimeline";
import { api, API_BASE, type User as UserType } from "../../../lib/api";

const resolveDocumentUrl = (path: string | undefined | null) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

export function exportPaymentDetailPDF(itemData: any, customerRows: any[] = [], baRows: any[] = []) {
  const printWin = window.open("", "_blank", "width=1000,height=800");
  if (!printWin) return;

  const custCode = (itemData?.customerCode || "POS").toUpperCase();
  const formattedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const logoUrl = `${window.location.origin}/andalan-logo.png`;
  const contractInfo = customerContractMap[custCode] || {};

  const activeItems: any[] = itemData?.items && Array.isArray(itemData.items) ? itemData.items : [];
  const c = getCustomerCalculations(activeItems, custCode, 16200, 1.0);

  let tableBodyHTML = "";
  let totalsFooterHTML = "";

  if (custCode === "BGG") {
    const secAItems = activeItems.filter((i: any) => i.section === "A" && (i.volume || 0) > 0);
    const secBItems = activeItems.filter((i: any) => i.section === "B" && (i.volume || 0) > 0);
    const secCItems = activeItems.filter((i: any) => i.section === "C" && (i.volume || 0) > 0);
    const secDItems = activeItems.filter((i: any) => i.section === "D" && (i.volume || 0) > 0);
    const secEItems = activeItems.filter((i: any) => i.section === "E" && (i.amount || 0) !== 0);
    const secFItems = activeItems.filter((i: any) => i.section === "F" && (i.amount || 0) !== 0);

    const volA = secAItems.reduce((s: number, i: any) => s + (i.volume || 0), 0);
    const volB = secBItems.reduce((s: number, i: any) => s + (i.volume || 0), 0);

    tableBodyHTML = `
      <tr class="sec-hdr">
        <td>A. OB REMOVAL</td>
        <td class="text-center font-mono">${volA.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
        <td class="text-center">Bcm</td>
        <td></td>
        <td class="text-right font-mono font-black">${c.subtotalA.toLocaleString("id-ID")}</td>
      </tr>
      <tr><td colspan="5" style="font-weight: bold; padding-left: 10px; background: #fafafa;">A1. Pit Kungkilan</td></tr>
      ${secAItems.map((i: any) => `
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
      ${secBItems.map((i: any) => `
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
      ${secCItems.map((i: any) => `
        <tr>
          <td style="padding-left: 20px;">${i.description}</td>
          <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
          <td class="text-center">${i.unit || "Bcm"}</td>
          <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
          <td class="text-right font-mono">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
        </tr>
      `).join("")}

      <tr class="sec-hdr">
        <td>D. RAISE & FALL'S FACTOR</td>
        <td></td>
        <td></td>
        <td></td>
        <td class="text-right font-mono font-black">${c.subtotalD.toLocaleString("id-ID")}</td>
      </tr>
      ${secDItems.map((i: any) => `
        <tr>
          <td style="padding-left: 20px;">${i.description}</td>
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
      ${secEItems.map((i: any) => `
        <tr>
          <td colspan="4" style="padding-left: 20px;">${i.description}</td>
          <td class="text-right font-mono">(${Math.abs(i.amount || 0).toLocaleString("id-ID")})</td>
        </tr>
      `).join("")}

      <tr class="sec-hdr" style="background: #fee2e2;">
        <td colspan="4">F. DP FUEL & TRANSPORT</td>
        <td class="text-right font-mono font-black">(${Math.abs(c.subtotalF).toLocaleString("id-ID")})</td>
      </tr>
      ${secFItems.map((i: any) => `
        <tr>
          <td colspan="4" style="padding-left: 20px;">${i.description}</td>
          <td class="text-right font-mono">(${Math.abs(i.amount || 0).toLocaleString("id-ID")})</td>
        </tr>
      `).join("")}
    `;

    totalsFooterHTML = `
      <tr class="tot-row"><td colspan="4"><strong>TOTAL</strong></td><td class="text-right font-mono"><strong>${c.totalGross.toLocaleString("id-ID")}</strong></td></tr>
      <tr class="tot-row"><td colspan="4">DPP PPN 11/12</td><td class="text-right font-mono">${c.dpp11_12.toLocaleString("id-ID")}</td></tr>
      <tr class="tot-row"><td colspan="4">VAT ( 12%)</td><td class="text-right font-mono">${c.vat12.toLocaleString("id-ID")}</td></tr>
      <tr class="tot-row"><td colspan="4">WITH HOLDING TAX ART 23</td><td class="text-right font-mono">(${c.pph23.toLocaleString("id-ID")})</td></tr>
      <tr class="net-row"><td colspan="4"><strong>TOTAL INVOICE</strong></td><td class="text-right net-val"><strong>${c.totalInvoice.toLocaleString("id-ID")}</strong></td></tr>
    `;
  } else {
    // Standard layout
    tableBodyHTML = activeItems.map((i: any) => `
      <tr>
        <td>${i.description}</td>
        <td class="text-center font-mono">${(i.volume || 0).toLocaleString("id-ID")}</td>
        <td class="text-center">${i.unit || "BCM"}</td>
        <td class="text-right font-mono">${(i.unitRateIDR || 0).toLocaleString("id-ID")}</td>
        <td class="text-right font-mono font-black">${Math.round((i.volume || 0) * (i.unitRateIDR || 0)).toLocaleString("id-ID")}</td>
      </tr>
    `).join("");

    totalsFooterHTML = `
      <tr class="tot-row"><td colspan="4"><strong>TOTAL GROSS</strong></td><td class="text-right font-mono"><strong>${c.totalGross.toLocaleString("id-ID")}</strong></td></tr>
      <tr class="tot-row"><td colspan="4">DPP PPN 11/12</td><td class="text-right font-mono">${c.dpp11_12.toLocaleString("id-ID")}</td></tr>
      <tr class="tot-row"><td colspan="4">VAT ( 12%)</td><td class="text-right font-mono">${c.vat12.toLocaleString("id-ID")}</td></tr>
      <tr class="tot-row"><td colspan="4">WITH HOLDING TAX ART 23</td><td class="text-right font-mono">(${c.pph23.toLocaleString("id-ID")})</td></tr>
      <tr class="net-row"><td colspan="4"><strong>TOTAL INVOICE</strong></td><td class="text-right net-val"><strong>${c.totalInvoice.toLocaleString("id-ID")}</strong></td></tr>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>INVOICE - ${itemData.invoiceNo}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; color: #1e293b; font-size: 11px; }
        .hdr-box { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 15px; }
        .logo { height: 45px; }
        table.main-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10.5px; }
        table.main-table th { background: #0f172a; color: #ffffff; padding: 6px 8px; text-transform: uppercase; font-size: 9.5px; border: 1px solid #cbd5e1; }
        table.main-table td { border: 1px solid #cbd5e1; padding: 5px 8px; }
        .sec-hdr { background: #e2e8f0; font-weight: bold; }
        .tot-row { background: #f8fafc; font-weight: bold; }
        .net-row { background: #0f172a; color: #ffffff; font-weight: 900; font-size: 12px; }
        .net-val { color: #38bdf8 !important; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: monospace; }
        .font-black { font-weight: 900; }
        .btn-print { background: #0e7490; color: #ffffff; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; margin-bottom: 12px; }
        @media print { .btn-print { display: none !important; } }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
      <div class="hdr-box">
        <img src="${logoUrl}" alt="ANDALAN" class="logo" />
        <h2 style="margin: 5px 0 0 0; text-transform: uppercase;">PT. ANDALAN ARTHA PRIMANUSA</h2>
        <p style="margin: 2px 0 0 0; color: #64748b;">Commercial Mining Contractor Services</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <div>
          <div><strong>Company:</strong> ${custCode}</div>
          <div><strong>Project:</strong> ${itemData.projectSite || contractInfo.project || "Mining Site"}</div>
          <div><strong>Period:</strong> ${itemData.workPeriod || "-"}</div>
        </div>
        <div style="text-align: right;">
          <div><strong>Invoice No.:</strong> ${itemData.invoiceNo}</div>
          <div><strong>Contract No.:</strong> ${itemData.contractNo || contractInfo.contract || "-"}</div>
          <div><strong>Date:</strong> ${formattedDate}</div>
        </div>
      </div>

      <table class="main-table">
        <thead>
          <tr>
            <th>DESCRIPTION</th>
            <th class="text-center">CLAIMED VOLUME</th>
            <th class="text-center">UoM</th>
            <th class="text-right">UNIT RATE (IDR)</th>
            <th class="text-right">AMOUNT (IDR)</th>
          </tr>
        </thead>
        <tbody>
          ${tableBodyHTML}
          ${totalsFooterHTML}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWin.document.open();
  printWin.document.write(htmlContent);
  printWin.document.close();
}

interface InvoiceDetailViewModalProps {
  detailItem: { type: "ba" | "invoice" | "payment" | "customer"; data: any } | null;
  onClose: () => void;
  onCreateInvoiceFromBA?: (ba: any) => void;
  onNotice: (msg: string) => void;
  onReload: () => void;
  invoiceRows?: any[];
  baRows?: any[];
}

export function InvoiceDetailViewModal({
  detailItem,
  onClose,
  onCreateInvoiceFromBA,
  onNotice,
  onReload,
  invoiceRows = [],
  baRows = []
}: InvoiceDetailViewModalProps) {
  if (!detailItem) return null;

  const [showAddPartialPayment, setShowAddPartialPayment] = useState(false);
  const [partialPaymentForm, setPartialPaymentForm] = useState({
    amountPaid: "",
    paymentDate: new Date().toISOString().split("T")[0],
    receivingBank: "Bank Mandiri Escrow",
    refNo: "",
    notes: ""
  });

  const handleSavePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailItem || detailItem.type !== "invoice") return;
    const amount = parseFloat(partialPaymentForm.amountPaid);
    if (!amount || amount <= 0) {
      onNotice("Nominal pembayaran harus lebih besar dari 0");
      return;
    }

    try {
      const payload = {
        invoiceNo: detailItem.data.invoiceNo,
        customerCode: detailItem.data.customerCode,
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

      onNotice("✅ Pembayaran cicilan berhasil dicatat (Menunggu Verifikasi).");
      setShowAddPartialPayment(false);
      setPartialPaymentForm({
        amountPaid: "",
        paymentDate: new Date().toISOString().split("T")[0],
        receivingBank: "Bank Mandiri Escrow",
        refNo: "",
        notes: ""
      });
      onReload();
    } catch (err: any) {
      onNotice(err?.message || "Gagal mencatat cicilan");
    }
  };

  const viewCustCode = (detailItem.data.customerCode || "POS").toUpperCase();
  const cInfo = customerContractMap[viewCustCode] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className={`bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 w-full ${detailItem.type === "invoice" ? "max-w-[95vw] 2xl:max-w-[1500px]" : "max-w-5xl"} shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto`}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
              <FileText size={14} /> Detail View & Audit Log Tracking
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {detailItem.type === "ba" ? `Berita Acara: ${detailItem.data.baNumber}` : detailItem.type === "invoice" ? `Invoice Master: ${detailItem.data.invoiceNo}` : `Detail Dokumen: ${detailItem.data.fullName || detailItem.data.customerCode}`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {detailItem.type === "invoice" && (
              <button
                type="button"
                onClick={() => exportPaymentDetailPDF(detailItem.data)}
                className="px-3.5 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold rounded-lg transition shadow-xs flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <FileText size={15} /> 📄 Export PDF Invoice
              </button>
            )}
            <button className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className={`grid grid-cols-1 ${detailItem.type === "invoice" ? "md:grid-cols-12" : "md:grid-cols-5"} gap-6`}>
          
          {/* LEFT COLUMN: Record Summary & Preview */}
          <div className={`${detailItem.type === "invoice" ? "md:col-span-8" : "md:col-span-3"} space-y-5 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6`}>
            
            {/* BA Detail Summary */}
            {detailItem.type === "ba" && (
              <div className="space-y-4">
                {(detailItem.data.statusBA === "Ready to Invoice" || detailItem.data.statusBA === "Approved") && onCreateInvoiceFromBA && (
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
                          Seluruh volume telah diverifikasi dan disetujui. Klik tombol untuk auto-generate invoice.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCreateInvoiceFromBA(detailItem.data)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Zap size={14} className="fill-amber-300 text-amber-300" />
                      <span>⚡ Terbitkan Invoice Sekarang</span>
                    </button>
                  </div>
                )}

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                    <div><span className="text-slate-500 block font-bold">No. BA:</span> <strong className="text-sm font-mono text-cyan-800">{detailItem.data.baNumber}</strong></div>
                    <div><span className="text-slate-500 block font-bold">Customer:</span> <strong className="text-sm text-slate-900">{detailItem.data.customerCode}</strong></div>
                    <div><span className="text-slate-500 block font-bold">Periode:</span> <strong className="text-slate-800">{detailItem.data.workPeriod || "-"}</strong></div>
                    <div><span className="text-slate-500 block font-bold">PIC Site:</span> <strong className="text-slate-800">{detailItem.data.picAAP || "-"}</strong></div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-xs text-emerald-800 font-bold block uppercase tracking-wider">Nominal Nilai Klaim BA</span>
                    <span className="text-xl font-black text-emerald-900 font-mono">{formatIDR(detailItem.data.workAmount || 0)}</span>
                  </div>
                </div>

                {/* PDF Preview Container */}
                <div className="space-y-3">
                  <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                        <Upload size={14} /> Berkas Draft BA (PDF)
                      </span>
                      {detailItem.data.draftBAPath ? (
                        <a href={resolveDocumentUrl(detailItem.data.draftBAPath)} target="_blank" rel="noreferrer" className="text-[11px] px-2.5 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold inline-flex items-center gap-1">
                          <ExternalLink size={12} /> Buka PDF Tab Baru
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle size={14} /> Berkas Final Signed BA (PDF)
                      </span>
                      {detailItem.data.finalBAPath ? (
                        <a href={resolveDocumentUrl(detailItem.data.finalBAPath)} target="_blank" rel="noreferrer" className="text-[11px] px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold inline-flex items-center gap-1">
                          <ExternalLink size={12} /> Buka PDF Tab Baru
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Detail Sheet */}
            {detailItem.type === "invoice" && (
              <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-4 shadow-xs text-xs text-slate-800">
                <div className="text-center pb-2 border-b border-slate-200">
                  <img src="/andalan-logo.png" alt="ANDALAN Logo" className="h-10 w-auto object-contain mx-auto" />
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200 text-[11px]">
                  <div>
                    <div><strong>Customer:</strong> {detailItem.data.customerCode}</div>
                    <div><strong>Project Site:</strong> {detailItem.data.projectSite || cInfo.project || "-"}</div>
                    <div><strong>Period:</strong> {detailItem.data.workPeriod || "-"}</div>
                  </div>
                  <div>
                    <div><strong>Invoice No.:</strong> <span className="font-mono font-bold text-cyan-900">{detailItem.data.invoiceNo}</span></div>
                    <div><strong>Contract No.:</strong> {detailItem.data.contractNo || cInfo.contract || "-"}</div>
                    <div><strong>Ref BA:</strong> {detailItem.data.baNoReference || "-"}</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center font-mono">
                  <span className="font-sans font-bold text-xs uppercase text-slate-300">Total Invoice (Net):</span>
                  <span className="text-xl font-black text-emerald-400">{formatIDR(detailItem.data.totalInvoice || 0)}</span>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Audit Timeline & Partial Payments */}
          <div className={`${detailItem.type === "invoice" ? "md:col-span-4" : "md:col-span-2"} space-y-5`}>
            
            {/* Multi-Tier Approval Status */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Multi-Tier Approval Timeline
              </h4>
              <AuditTimeline steps={generateAuditTimeline(detailItem.type, detailItem.data)} />
            </div>

            {/* Form Catat Cicilan Baru for Invoice */}
            {detailItem.type === "invoice" && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <Receipt size={14} className="text-cyan-800" /> Riwayat Pembayaran & Cicilan
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddPartialPayment(!showAddPartialPayment)}
                    className="px-2 py-1 rounded bg-cyan-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                  >
                    <Plus size={11} /> Catat Cicilan
                  </button>
                </div>

                {showAddPartialPayment && (
                  <form onSubmit={handleSavePartialPayment} className="space-y-2.5 bg-white p-3 rounded-lg border border-slate-300 text-xs">
                    <div>
                      <label className="font-bold text-[10px] uppercase text-slate-600 block">Nominal Cicilan (Rp)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-mono font-bold text-xs"
                        placeholder="0"
                        value={partialPaymentForm.amountPaid}
                        onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, amountPaid: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[10px] uppercase text-slate-600 block">Bank Penerima</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold"
                        value={partialPaymentForm.receivingBank}
                        onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, receivingBank: e.target.value })}
                      >
                        {masterBankAccounts.map((b) => (
                          <option key={b.id} value={b.bankName}>{b.bankName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-[10px] uppercase text-slate-600 block">No. Referensi Transfer</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold"
                        placeholder="TRF-..."
                        value={partialPaymentForm.refNo}
                        onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, refNo: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddPartialPayment(false)}
                        className="px-2.5 py-1 text-slate-600 font-bold text-xs"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-cyan-800 text-white font-bold rounded text-xs shadow-xs"
                      >
                        Simpan Cicilan
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
