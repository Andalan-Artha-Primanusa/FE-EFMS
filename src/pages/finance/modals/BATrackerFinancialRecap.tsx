import React from "react";
import { UserCheck, CheckCircle2, ExternalLink, Pickaxe, Building2, Zap } from "lucide-react";
import { getBAInvoiceStatus, isBAApproved, isPOSDualBA } from "../helpers";
import { isRentalBA } from "../ba_calculations";

interface BATrackerFinancialRecapProps {
  formData: any;
  editItem: any;
  user: any;
  invoiceRows: any[];
  setModalType: (type: string) => void;
  setDetailViewItem: (item: any) => void;
  createInvoiceFromBA?: (ba: any, cat?: string) => void;
  setActiveBAStep: (step: number) => void;
  baAuditLogs: any[];
  auditTab: "flow" | "activity";
  setAuditTab: (tab: "flow" | "activity") => void;
}

export function BATrackerFinancialRecap({
  formData,
  editItem,
  user,
  invoiceRows = [],
  setModalType,
  setDetailViewItem,
  createInvoiceFromBA,
  setActiveBAStep,
  baAuditLogs = [],
  auditTab,
  setAuditTab,
}: BATrackerFinancialRecapProps) {
  const isRental = isRentalBA(formData) || isRentalBA(editItem);
  const isPOS = isPOSDualBA(editItem || formData);
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
          {!createInvoiceFromBA ? null : isPOS ? (
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
          onClick={() => setActiveBAStep(isRental ? 1 : 2)}
          className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-[3px] transition text-xs cursor-pointer"
        >
          Kembali ke Step {isRental ? 1 : 2}
        </button>
      </div>
    </div>
  );
}
