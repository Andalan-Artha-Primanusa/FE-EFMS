import React from "react";

interface InvoiceDetailSummaryProps {
  detailData: any;
  cInfo: any;
  formattedDate: string;
}

export const InvoiceDetailSummary: React.FC<InvoiceDetailSummaryProps> = ({
  detailData,
  cInfo,
  formattedDate
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t-2 border-[#1A1612] text-[11px]">
      {/* Left: Bank Account Info from Master Data */}
      <div className="p-3 bg-slate-50 border border-slate-300 rounded-[4px] space-y-1">
        <p className="font-extrabold uppercase text-[#1A1612] tracking-wider text-[10px]">PLEASE MAKE PAYMENT TO THIS ACCOUNT:</p>
        <div className="pt-1 text-[11px] space-y-1">
          <div className="flex"><span className="w-24 font-bold text-slate-500">Bank Name</span><span className="font-extrabold text-[#1A1612]">: {detailData.bankName || cInfo?.bankName || "Bank BNI"}</span></div>
          <div className="flex"><span className="w-24 font-bold text-slate-500">A/C Name</span><span className="font-extrabold text-[#1A1612]">: {detailData.bankAccountName || "PT Andalan Artha Primanusa"}</span></div>
          <div className="flex"><span className="w-24 font-bold text-slate-500">A/C No</span><span className="font-black text-[#1A1612] font-mono">: {detailData.bankAccountNo || cInfo?.bankAccountNo || "-"}</span></div>
          <div className="flex"><span className="w-24 font-bold text-slate-500">Branch</span><span className="font-extrabold text-[#1A1612]">: {detailData.bankBranch || cInfo?.bankBranch || "Harmoni, Jakarta"}</span></div>
        </div>
      </div>

      {/* Right: Signature Area (Blank as requested) */}
      <div className="p-3 bg-slate-50 border border-slate-300 rounded-[4px] flex flex-col justify-between text-center">
        <div className="text-right text-[10px] text-slate-600 font-bold">
          Jakarta, {formattedDate}
        </div>
        <div className="pt-1">
          <p className="text-[10px] font-extrabold uppercase text-slate-700">SUBMITTED BY,</p>
          <p className="text-[11px] font-black text-[#1A1612]">PT ANDALAN ARTHA PRIMANUSA</p>
        </div>

        {/* Blank signature space (no stamp/signature) */}
        <div className="h-14 border-b border-dashed border-slate-400 my-2 flex items-center justify-center text-[10px] text-slate-400 italic">
          ( Area Tanda Tangan & Stempel — Kosong )
        </div>

        <div>
          <p className="text-[11px] font-black underline text-[#1A1612]">{detailData.directorName || cInfo?.directorName || ""}</p>
          <p className="text-[10px] font-bold text-slate-600">{detailData.directorTitle || cInfo?.directorTitle || "DIRECTOR"}</p>
        </div>
      </div>
    </div>
  );
};
