import React from "react";
import { FileText, Edit2, X } from "lucide-react";
import { BADetailSheet } from "./details/BADetailSheet";
import { InvoiceDetailSheet } from "./details/InvoiceDetailSheet";
import { PaymentCustomerDetailSheet } from "./details/PaymentCustomerDetailSheet";
import { DetailPaymentTracker } from "./details/DetailPaymentTracker";
import { DetailAuditTimeline } from "./details/DetailAuditTimeline";
import { DetailModalActions } from "./details/DetailModalActions";

export function DetailModal({ c }: { c: any }) {
  const {
    isSuper, isFinanceSpecialist, isSPV, isManager, isDirector, invoiceRows: rawInvoiceRows, paymentRows: rawPaymentRows, baRows: rawBaRows,
    detailViewItem, setDetailViewItem, showAddPartialPayment, setShowAddPartialPayment, partialPaymentForm,
    setPartialPaymentForm, rfIndexCalculated, invLineItems, formData, buildInvoiceItemsFromBA, customerContractMap, getItemEffectiveVolume,
    getItemEffectiveOverhaulMtr, calculateItemRateAndAmount, getCustomerCalculations,
    exportPaymentDetailPDF, exportBADocumentPDF,
    handleSavePartialPayment, handleVerifyPartialPayment, createInvoiceFromBA, handleVerifyBA, handleApproveBA,
    handleApproveInvoice, openEditModal
  } = (c || {}) as Record<string, any>;

  const invoiceRows: any[] = Array.isArray(rawInvoiceRows) ? rawInvoiceRows : [];
  const paymentRows: any[] = Array.isArray(rawPaymentRows) ? rawPaymentRows : [];
  const baRows: any[] = Array.isArray(rawBaRows) ? rawBaRows : [];

  if (!detailViewItem || !detailViewItem.data) return null;

  const { type, data } = detailViewItem;

  const headerTitle =
    type === "ba"
      ? `Berita Acara: ${data.baNumber}`
      : type === "invoice"
      ? `Invoice Master: ${data.invoiceNo}`
      : type === "payment"
      ? `Payment Log: ${data.invoiceNo}`
      : `Customer: ${data.fullName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-[4px] p-4 sm:p-5 w-full max-w-[96vw] 2xl:max-w-[1550px] shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto transition-all">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#A57C50] bg-[#A57C50]/10 px-2.5 py-0.5 rounded-[3px] border border-[#A57C50]/30">
              <FileText size={13} /> Detail View & Audit Log Tracking
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{headerTitle}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const itemToEdit = data;
                const typeToEdit = type;
                setDetailViewItem(null);
                if (typeof openEditModal === "function") {
                  openEditModal(typeToEdit, itemToEdit);
                }
              }}
              className="px-3 py-1.5 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Buka Form Modal Edit untuk Mengubah Data"
            >
              <Edit2 size={13} />
              <span>Edit Data</span>
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-[3px] hover:bg-slate-100 transition cursor-pointer"
              onClick={() => setDetailViewItem(null)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2-COLUMN LAYOUT: 8 cols Left (Tables/Data) + 4 cols Right (Summaries/Timeline/Audit) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN: 8 cols */}
          <div className="lg:col-span-8 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 pb-4 lg:pb-0 lg:pr-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Rincian Dokumen & Nilai Transaksi</h4>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  ID: #{data.id}
                </span>
              </div>
              {type === "invoice" && (
                <button
                  onClick={() => exportPaymentDetailPDF(data)}
                  className="px-3 py-1.5 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <FileText size={13} /> Cetak / Simpan PDF
                </button>
              )}
              {type === "ba" && (
                <button
                  onClick={() => exportBADocumentPDF(data)}
                  className="px-3 py-1.5 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <FileText size={13} /> Cetak Dokumen BA (PDF)
                </button>
              )}
            </div>

            {/* Sheets */}
            {type === "ba" && (
              <BADetailSheet
                data={data}
                invoiceRows={invoiceRows}
                exportBADocumentPDF={exportBADocumentPDF}
                createInvoiceFromBA={createInvoiceFromBA}
                setDetailViewItem={setDetailViewItem}
              />
            )}

            {type === "invoice" && (
              <InvoiceDetailSheet
                data={data}
                baRows={baRows}
                invLineItems={invLineItems}
                formData={formData}
                buildInvoiceItemsFromBA={buildInvoiceItemsFromBA}
                customerContractMap={customerContractMap}
                getItemEffectiveVolume={getItemEffectiveVolume}
                getItemEffectiveOverhaulMtr={getItemEffectiveOverhaulMtr}
                calculateItemRateAndAmount={calculateItemRateAndAmount}
                getCustomerCalculations={getCustomerCalculations}
                rfIndexCalculated={rfIndexCalculated}
              />
            )}

            {(type === "payment" || type === "customer") && (
              <PaymentCustomerDetailSheet type={type} data={data} />
            )}
          </div>

          {/* RIGHT COLUMN: 4 cols */}
          <div className="lg:col-span-4 space-y-4">
            {type === "invoice" && (
              <DetailPaymentTracker
                detailData={data}
                paymentRows={paymentRows}
                showAddPartialPayment={showAddPartialPayment}
                setShowAddPartialPayment={setShowAddPartialPayment}
                partialPaymentForm={partialPaymentForm}
                setPartialPaymentForm={setPartialPaymentForm}
                handleSavePartialPayment={handleSavePartialPayment}
                handleVerifyPartialPayment={handleVerifyPartialPayment}
              />
            )}

            <DetailAuditTimeline type={type} data={data} />
          </div>
        </div>

        {/* Modal Footer (Sticky at bottom) */}
        <DetailModalActions
          type={type}
          data={data}
          isSuper={isSuper}
          isFinanceSpecialist={isFinanceSpecialist}
          isSPV={isSPV}
          isManager={isManager}
          isDirector={isDirector}
          handleVerifyBA={handleVerifyBA}
          handleApproveBA={handleApproveBA}
          handleApproveInvoice={handleApproveInvoice}
          onClose={() => setDetailViewItem(null)}
        />
      </div>
    </div>
  );
}
