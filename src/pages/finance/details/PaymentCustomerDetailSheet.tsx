import React, { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { formatIDR } from "../helpers";
import { api } from "../../../lib/api";
import { AccurateDocBadges } from "./AccuratePostingPanel";

interface PaymentAccurateStatusProps {
  data: any;
  hasFaktur?: boolean;
  canSync?: boolean;
  onSaved?: (updated: any) => void;
  onNotice?: (msg: string) => void;
}

// Status Penerimaan Penjualan Accurate satu payment; gagal = error + Posting Ulang.
export const PaymentAccurateStatus: React.FC<PaymentAccurateStatusProps> = ({ data, hasFaktur, canSync, onSaved, onNotice }) => {
  const [syncing, setSyncing] = useState(false);
  const acc = data.accurate;
  // Terverifikasi sebelum faktur ada & belum terposting: boleh diposting manual.
  const unposted = !acc && hasFaktur && data.verificationStatus === "Verified";
  if (!acc && !unposted) return null;
  const failed = unposted || acc.status === "Gagal";

  const sync = async () => {
    setSyncing(true);
    try {
      const updated = await api<any>(`/api/finance/payments/${data.id}/accurate-sync`, { method: "POST" });
      onSaved?.(updated);
      onNotice?.(updated?.accurate?.status === "Gagal" ? updated.accurate.error || "Posting ke Accurate gagal" : "Terposting ke Accurate");
    } catch (err: any) {
      onNotice?.(err?.message || "Posting ke Accurate gagal");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <AccurateDocBadges accurate={acc} />
      {acc?.error && failed && <p className="text-[11px] font-bold text-red-700 break-words">{acc.error}</p>}
      {failed && canSync && (
        <button
          type="button"
          disabled={syncing}
          onClick={sync}
          className="px-2.5 py-1 text-[11px] font-extrabold bg-[#A57C50] hover:bg-[#8e6941] disabled:opacity-60 text-white rounded-[3px] flex items-center gap-1.5 transition shadow-xs cursor-pointer"
        >
          {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Posting Ulang
        </button>
      )}
    </div>
  );
};

// Verifikator mengisi / mengganti nomor bukti payment terverifikasi yang belum terposting.
const ReceiptNoFill: React.FC<PaymentAccurateStatusProps> = ({ data, onSaved, onNotice }) => {
  const [value, setValue] = useState(data.receiptNo || "");
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api<any>(`/api/finance/payments/${data.id}/receipt-no`, { method: "PUT", body: JSON.stringify({ receiptNo: value.trim() }) });
      onSaved?.(updated);
      onNotice?.(updated?.accurate?.status === "Gagal" ? updated.accurate.error || "Posting ke Accurate gagal" : "Nomor bukti tersimpan");
    } catch (err: any) {
      onNotice?.(err?.message || "Gagal menyimpan nomor bukti");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-1.5">
      <input
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="006/BBM-MDR OP/X/26"
        className="flex-1 min-w-0 basis-40 bg-white border border-slate-300 rounded-[3px] px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:border-[#A57C50] outline-none"
      />
      <button
        type="submit"
        disabled={saving}
        className="px-2.5 py-1.5 text-[11px] font-extrabold bg-[#A57C50] hover:bg-[#8e6941] disabled:opacity-60 text-white rounded-[3px] flex items-center gap-1.5 transition shadow-xs cursor-pointer"
      >
        {saving && <Loader2 size={12} className="animate-spin" />}
        Simpan
      </button>
    </form>
  );
};

interface PaymentCustomerDetailSheetProps extends Omit<PaymentAccurateStatusProps, "data"> {
  type: "payment" | "customer";
  data: any;
}

export const PaymentCustomerDetailSheet: React.FC<PaymentCustomerDetailSheetProps> = ({
  type,
  data,
  ...accurate
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
          <div><span className="text-slate-500 block">PPh 23 Dipotong:</span> <strong className="font-mono">{formatIDR(data.pph23Withheld || 0)}</strong></div>
        </div>
        <div className="min-w-0">
          <span className="text-slate-500 block">No. Bukti Penerimaan Accurate:</span>
          {data.verificationStatus === "Verified" && accurate.canSync && (!data.receiptNo || data.accurate?.status !== "Terposting") ? (
            <ReceiptNoFill data={data} {...accurate} />
          ) : (
            <strong className="font-mono break-all">{data.receiptNo || "-"}</strong>
          )}
          <div className="mt-1"><PaymentAccurateStatus data={data} {...accurate} /></div>
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
