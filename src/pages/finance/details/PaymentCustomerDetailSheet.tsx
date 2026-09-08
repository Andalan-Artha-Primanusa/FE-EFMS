import React from "react";
import { formatIDR } from "../helpers";

interface PaymentCustomerDetailSheetProps {
  type: "payment" | "customer";
  data: any;
}

export const PaymentCustomerDetailSheet: React.FC<PaymentCustomerDetailSheetProps> = ({
  type,
  data
}) => {
  if (type === "payment") {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
          <div><span className="text-slate-500 block font-bold">Target Invoice:</span> <strong className="text-sm font-mono text-cyan-800">{data.invoiceNo}</strong></div>
          <div><span className="text-slate-500 block font-bold">Customer:</span> <strong className="text-sm text-slate-900">{data.customerCode}</strong></div>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-xs text-emerald-800 font-bold block uppercase">Jumlah Uang Masuk Received</span>
          <span className="text-2xl font-black text-emerald-900">{formatIDR(data.amountPaid)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-slate-500 block">Bank Receiving:</span> <strong>{data.receivingBank}</strong></div>
          <div><span className="text-slate-500 block">No. Ref Transfer:</span> <strong className="font-mono">{data.refNo}</strong></div>
        </div>
        <div><span className="text-slate-500 block">Ketepatan Bayar:</span> <span className="font-bold text-amber-700">{data.daysLateOrEarly > 0 ? `Telat ${data.daysLateOrEarly} Hari` : "On-Time / Tepat Waktu"}</span></div>
        <div><span className="text-slate-500 block">Catatan:</span> <p className="text-slate-700 font-medium">{data.notes}</p></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800">
      <div><span className="text-slate-500 block font-bold">Nama Customer:</span> <strong className="text-base text-slate-900">{data.fullName} ({data.code})</strong></div>
      <div><span className="text-slate-500 block font-bold">Induk Perusahaan:</span> <strong className="text-slate-800">{data.groupParent}</strong></div>
      <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200">
        <div><span className="text-slate-500 block">Termin Hari:</span> <strong className="text-amber-700 font-extrabold text-sm">{data.terminDays} Hari</strong></div>
        <div><span className="text-slate-500 block">Nilai Kontrak:</span> <strong className="text-slate-900 font-black">{formatIDR(data.contractValue)}</strong></div>
      </div>
      <div><span className="text-slate-500 block font-bold">No. Kontrak:</span> <strong className="text-slate-800">{data.contractNo}</strong></div>
      <div><span className="text-slate-500 block font-bold">Kontak Penagihan AR:</span> <p className="text-slate-700 font-medium">{data.contactAR} ({data.emailAR} | {data.phone})</p></div>
    </div>
  );
};
