import React from "react";
import { UserCheck, CheckCircle, Clock, CheckCircle2, ExternalLink, Pickaxe, Building2, Zap } from "lucide-react";
import { getBAInvoiceStatus, generateAuditTimeline, isBAApproved } from "../helpers";
import { bggOBBillableFactor, customerKind } from "../ba_calculations";
import { BAGLJournalPreview } from "./BAGLJournalPreview";
import { verifyBATracker } from "../../../lib/api";

interface BATrackerFinancialRecapProps {
  formData: any;
  setFormData: (data: any) => void;
  editItem: any;
  isInlineEditingBA: boolean;
  isFinanceSpecialist: boolean;
  user: any;
  invoiceRows: any[];
  setModalType: (type: string) => void;
  setDetailViewItem: (item: any) => void;
  createInvoiceFromBA: (ba: any, cat?: string) => void;
  setActiveBAStep: (step: number) => void;
  baAuditLogs: any[];
  auditTab: "flow" | "activity";
  setAuditTab: (tab: "flow" | "activity") => void;
  allBAItems?: any[];
  rfIndexCalculated?: number;
  latestKursBI?: number;
}

export function BATrackerFinancialRecap({
  formData,
  setFormData,
  editItem,
  isInlineEditingBA,
  isFinanceSpecialist,
  user,
  invoiceRows = [],
  setModalType,
  setDetailViewItem,
  createInvoiceFromBA,
  setActiveBAStep,
  baAuditLogs = [],
  auditTab,
  setAuditTab,
  allBAItems = [],
  rfIndexCalculated = 1.0,
  latestKursBI = 0,
}: BATrackerFinancialRecapProps) {
  const isPOS = customerKind(formData.customerCode || editItem?.customerCode) === "POS";
  const step3InvStatus = getBAInvoiceStatus(editItem || formData, invoiceRows);
  const isLinked = Boolean(formData.invoiceNoLinked || editItem?.invoiceNoLinked) || step3InvStatus.isFullyInvoiced;
  const displayInvNo = formData.invoiceNoLinked || editItem?.invoiceNoLinked || step3InvStatus.createdInvoices[0]?.invoiceNo || "Terbit";

  return (
    <div className="space-y-4">
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-[4px] p-3 flex items-start gap-2.5 text-xs text-amber-950">
        <UserCheck className="text-[#A57C50] shrink-0 mt-0.5" size={16} />
        <div>
          <strong>Step 3 — Verifikasi & Final Signed BA:</strong> Verifikasi internal oleh Finance Specialist. Approval FATB Manager akan diproses saat Invoice digenerate oleh Finance site.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-[4px] border border-slate-200">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            No. BA Resmi Customer <span className="text-rose-600">*</span>
          </label>
          {!isInlineEditingBA ? (
            <div className="p-2 bg-white border border-slate-200 rounded-[3px] font-mono font-bold text-xs text-slate-900">
              {formData.signedBANumber || formData.baNumber || "052/BA-POS-NIKEL/VII/2026"}
            </div>
          ) : (
            <input
              className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 font-mono font-bold text-xs focus:border-[#A57C50] outline-none"
              placeholder="052/BA-POS-NIKEL/VII/2026"
              value={formData.signedBANumber || formData.baNumber || ""}
              onChange={(e) => setFormData({ ...formData, signedBANumber: e.target.value, baNumber: e.target.value })}
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Tanggal Ditandatangani Customer
          </label>
          {!isInlineEditingBA ? (
            <div className="p-2 bg-white border border-slate-200 rounded-[3px] text-xs text-slate-900 font-bold">
              {formData.baSignedDate ? new Date(formData.baSignedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
            </div>
          ) : (
            <input
              type="date"
              className="w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 text-xs focus:border-[#A57C50] outline-none"
              value={formData.baSignedDate || ""}
              onChange={(e) => setFormData({ ...formData, baSignedDate: e.target.value })}
            />
          )}
        </div>
      </div>

      {/* Single Verifikator Card: Finance Specialist */}
      <div className="pt-1">
        <div className={`p-4 rounded-[4px] border shadow-xs text-center space-y-2.5 transition ${formData.verifiedBy ? "bg-[#A57C50]/5 border-[#A57C50]/30" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Verifikator: Finance Specialist</span>
            {formData.verifiedBy ? (
              <span className="text-[10px] text-[#A57C50] font-bold flex items-center gap-1">
                <CheckCircle size={12} /> Selesai Diverifikasi
              </span>
            ) : (
              <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                <Clock size={12} /> Menunggu Verifikasi
              </span>
            )}
          </div>

          <div className="py-1">
            {formData.verifiedBy ? (
              <div className="inline-flex flex-col items-center gap-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[3px] text-xs font-bold bg-[#A57C50]/10 text-[#A57C50] border border-[#A57C50]/30">
                  <CheckCircle size={13} className="text-[#A57C50]" /> Digital Verified by Finance Specialist
                </span>
                <span className="text-[11px] font-bold text-[#1A1612]">{formData.verifiedBy}</span>
                {formData.verifiedAt && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(formData.verifiedAt).toLocaleString("id-ID")}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs text-slate-500 font-medium block">
                  Verifikasi draft Berita Acara ini untuk memvalidasi angka rekonsiliasi dan menerbitkan status penagihan.
                </span>
                {isFinanceSpecialist && !isInlineEditingBA && editItem && (
                  <button
                    type="button"
                    onClick={async () => {
                      // Verifikasi lewat endpoint server (verifikator = user login, akrual GL diposting server).
                      try {
                        const updated: any = await verifyBATracker(editItem.id, "verify", "Verifikasi Berita Acara oleh Finance Specialist");
                        setFormData({ ...formData, statusBA: updated?.statusBA, verifiedBy: updated?.verifiedBy, verifiedAt: updated?.verifiedAt });
                      } catch (err: any) {
                        alert(err?.message || "Gagal memverifikasi Berita Acara");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle size={14} /> Verifikasi Berita Acara Ini
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Symmetric GL Journal Entry Preview */}
      <BAGLJournalPreview
        customerCode={formData.customerCode || editItem?.customerCode || ""}
        allBAItems={allBAItems}
        rfIndexCalculated={Number(
          (customerKind(formData.customerCode) === "BGG" && (formData.bggData?.bggRfIndex || formData.bggRfIndex)) ||
          (customerKind(formData.customerCode) === "POS" && (formData.posData?.posRfIndex || formData.posRfIndex)) ||
          formData.rfIndexCalculated ||
          rfIndexCalculated ||
          1.0
        )}
        isCustomerDBK={customerKind(formData.customerCode) === "PTRO"}
        fuelPeriods={formData.bggData?.fuelPeriods || formData.posData?.fuelPeriods || formData.ptroData?.fuelPeriods || formData.sbsData?.fuelPeriods}
        obFactor={bggOBBillableFactor(formData.customerCode, formData)}
      />

      {/* Invoice Generation & Linked Status */}
      {isLinked ? (
        <div className="bg-[#A57C50]/5 border border-[#A57C50]/20 rounded-[4px] p-3 flex items-center justify-between gap-3 text-xs text-[#1A1612] shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#A57C50] shrink-0" />
            <span>Invoice telah diterbitkan: <strong className="font-mono text-[#1A1612]">{displayInvNo}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => {
              setModalType("none");
              const targetInv = step3InvStatus.createdInvoices[0] || invoiceRows.find((inv: any) => inv.invoiceNo === displayInvNo || inv.baNoReference === formData.baNumber || inv.baID === (editItem?.id || formData.id));
              if (targetInv) {
                setDetailViewItem({ type: "invoice", data: targetInv });
              }
            }}
            className="bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold py-1.5 px-3.5 rounded-[3px] flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
          >
            <ExternalLink size={12} /> Lihat Invoice
          </button>
        </div>
      ) : isBAApproved(formData) ? (
        <div className="bg-[#A57C50]/5 border border-[#A57C50]/20 rounded-[4px] p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#1A1612] shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-[#A57C50] shrink-0" />
            <span className="font-black text-[#1A1612]">BA Disetujui Manager (Ready to Invoice)</span>
          </div>
          {isPOS ? (
            <div className="flex items-center gap-2">
              {!step3InvStatus.createdMiningInv && (
                <button
                  type="button"
                  onClick={() => {
                    setModalType("none");
                    createInvoiceFromBA(editItem || formData, "Operation & Mining");
                  }}
                  className="bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold py-2 px-3 rounded-[3px] flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                >
                  <Pickaxe size={14} /> + Inv Mining
                </button>
              )}
              {!step3InvStatus.createdMDOInv && (
                <button
                  type="button"
                  onClick={() => {
                    setModalType("none");
                    createInvoiceFromBA(editItem || formData, "MDO");
                  }}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-2 px-3 rounded-[3px] flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
                >
                  <Building2 size={14} /> + Inv MDO
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setModalType("none");
                createInvoiceFromBA(editItem || formData);
              }}
              className="bg-[#A57C50] hover:bg-[#8e6941] text-white font-black py-2 px-3.5 rounded-[3px] flex items-center gap-1.5 transition text-xs shadow-xs whitespace-nowrap cursor-pointer"
            >
              <Zap size={14} /> + Terbitkan Invoice
            </button>
          )}
        </div>
      ) : null}

      {/* Navigation Buttons */}
      <div className="flex justify-start items-center pt-2">
        <button
          type="button"
          onClick={() => setActiveBAStep(2)}
          className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-[3px] transition text-xs cursor-pointer"
        >
          Kembali ke Step 2
        </button>
      </div>
    </div>
  );
}
