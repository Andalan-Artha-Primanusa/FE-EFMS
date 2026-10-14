import React from "react";
import { ShieldCheck, CheckCircle2, UserCheck } from "lucide-react";

interface DetailModalActionsProps {
  type: string;
  data: any;
  isSuper: boolean;
  isFinanceSpecialist: boolean;
  isSPV: boolean;
  canApproveInvoice: boolean;
  canApproveBA: boolean;
  handleVerifyBA: (id: number) => void;
  handleApproveBA: (id: number) => void;
  handleApproveInvoice: (id: number) => void;
  onClose: () => void;
}

export const DetailModalActions: React.FC<DetailModalActionsProps> = ({
  type,
  data,
  isSuper,
  isFinanceSpecialist,
  isSPV,
  canApproveInvoice,
  canApproveBA,
  handleVerifyBA,
  handleApproveBA,
  handleApproveInvoice,
  onClose
}) => {
  return (
    <div className="sticky -bottom-6 sm:-bottom-7 bg-white border-t border-slate-200 pt-4 pb-6 sm:pb-7 -mx-6 sm:-mx-7 px-6 sm:px-7 rounded-b-[4px] z-20 flex justify-between items-center shadow-md">
      <div className="flex items-center gap-2">
        {type === "ba" && (
          <>
            {(isFinanceSpecialist || isSuper || isSPV) && !data.verifiedBy && !data.invoiceNoLinked && (["Submit", "Pending Berita Acara", "Draft", "Revisi", "Rejected"].includes(data.statusBA) || !data.statusBA) && (
              <button
                className="px-4 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                onClick={() => handleVerifyBA(data.id)}
              >
                <ShieldCheck size={14} /> Verifikasi Finance Specialist
              </button>
            )}
            {/* Approval hanya setelah verifikasi Finance Specialist (server menolak selain itu, termasuk approver = verifikator). */}
            {canApproveBA && data.statusBA === "Ready to Invoice" && Boolean(data.verifiedBy) && !data.invoiceNoLinked && (
              <button
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-[3px] shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                onClick={() => handleApproveBA(data.id)}
              >
                <CheckCircle2 size={14} /> Approve Manager
              </button>
            )}
          </>
        )}

        {type === "invoice" && (
          <>
            {canApproveInvoice && data.status === "Verified" && (
              <button
                className="px-4 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                onClick={() => handleApproveInvoice(data.id)}
              >
                <UserCheck size={14} /> Setujui Invoice (Manager FATB)
              </button>
            )}
          </>
        )}
      </div>
      <button
        className="px-6 py-2 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-xs cursor-pointer"
        onClick={onClose}
      >
        Tutup Detail
      </button>
    </div>
  );
};
