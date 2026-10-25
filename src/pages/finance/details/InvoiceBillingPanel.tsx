import React, { useEffect, useState } from "react";
import { Save, Loader2, FileText, Edit2, Lock } from "lucide-react";
import { api } from "../../../lib/api";
import { formatIDR, formatDateInput, getCustomerOfficialName, invoiceNett, invoiceOutstanding, RupiahInput, parsePeriodToYYYYMM } from "../helpers";
import { ACCURATE_CUTOVER } from "./AccuratePostingPanel";

interface InvoiceBillingPanelProps {
  data: any;
  canEdit: boolean;
  canAlterPosted: boolean;
  onSaved: (updated: any) => void;
  onNotice: (msg: string) => void;
}

type Form = { invoiceNo: string; jobType: string; invoiceDate: string; invoiceSubmissionDate: string; otherDeduction: number };

const isoOrNull = (d: string) => (d ? new Date(d).toISOString() : null);
const showDate = (d: string) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const inputCls = "w-full bg-white border border-slate-300 rounded-[3px] px-2 py-1.5 text-slate-900 font-bold focus:border-[#A57C50] outline-none text-xs";

// Data penagihan invoice: nilai (Amount/Outstanding) mengikuti BA & pembayaran; nomor, remarks, tanggal & backcharge bisa diedit.
export const InvoiceBillingPanel: React.FC<InvoiceBillingPanelProps> = ({ data, canEdit, canAlterPosted, onSaved, onNotice }) => {
  const init = (): Form => ({
    invoiceNo: data.invoiceNo || "",
    jobType: data.jobType || "",
    invoiceDate: formatDateInput(data.invoiceDate),
    invoiceSubmissionDate: formatDateInput(data.invoiceSubmissionDate),
    otherDeduction: Number(data.otherDeduction || 0),
  });
  const [f, setF] = useState(init);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setF(init()); setEditing(false); }, [data]);

  const outstanding = invoiceOutstanding(data);
  const set = (key: keyof Form, val: any) => setF((prev) => ({ ...prev, [key]: val }));
  const dirty = JSON.stringify(f) !== JSON.stringify(init());
  // No. Invoice & Invoice Date invoice yang sudah dijurnal hanya oleh Manager FATB.
  const refLocked = !canAlterPosted;

  const cancel = () => { setF(init()); setEditing(false); };
  // Nomor kosong / sementara (INV-...) diisi usulan penomoran faktur Accurate; tetap bisa diubah.
  const startEdit = async () => {
    setEditing(true);
    const cur = f.invoiceNo;
    const ym = parsePeriodToYYYYMM(data.workPeriod || "");
    if ((cur && !cur.startsWith("INV-")) || refLocked || data.invoiceCategory === "Rental" || (ym !== "" && ym < ACCURATE_CUTOVER)) return;
    try {
      const r = await api<{ invoiceNo?: string }>(`/api/finance/invoices/${data.id}/number-suggestion`);
      if (r?.invoiceNo) setF((prev) => (prev.invoiceNo === cur ? { ...prev, invoiceNo: r.invoiceNo! } : prev));
    } catch {
      // Accurate tak terjangkau: nomor yang ada dipakai.
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      const updated = await api(`/api/finance/invoices/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...f,
          invoiceDate: isoOrNull(f.invoiceDate),
          invoiceSubmissionDate: isoOrNull(f.invoiceSubmissionDate),
        }),
      });
      onSaved(updated);
      onNotice("Data penagihan invoice tersimpan");
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan data penagihan invoice");
    } finally {
      setSaving(false);
    }
  };

  const tile = (label: string, value: number, accent = false) => (
    <div className={`p-2.5 rounded-[4px] shadow-xs border ${accent ? "bg-[#A57C50]/5 border-[#A57C50]/20" : "bg-white border-slate-200"}`}>
      <span className={`text-[10px] block uppercase font-bold tracking-wider ${accent ? "text-[#A57C50]" : "text-slate-500"}`}>{label}</span>
      <strong className="text-[#1A1612] text-sm font-black font-mono">{formatIDR(value)}</strong>
    </div>
  );

  const row = (label: string, view: React.ReactNode, input?: React.ReactNode, locked = false) => (
    <div className="flex items-center gap-3 min-h-[34px] py-1 border-b border-slate-100 last:border-b-0">
      <span className="w-36 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex-1 min-w-0 text-xs font-bold text-slate-900">
        {editing && input && !locked ? input : (
          <span className="inline-flex items-center gap-1.5">
            {view}
            {editing && locked && <Lock size={11} className="text-slate-400" aria-label="Terkunci" />}
          </span>
        )}
      </div>
    </div>
  );
  const dateRow = (label: string, key: "invoiceDate" | "invoiceSubmissionDate", locked = false) =>
    row(label, showDate(f[key]), <input type="date" className={inputCls} value={f[key]} onChange={(e) => set(key, e.target.value)} />, locked);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-[4px] p-4 shadow-xs space-y-3.5">
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <FileText className="text-[#A57C50]" size={16} />
          <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1612]">Data Penagihan</h4>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="px-3 py-1 text-xs font-extrabold bg-[#A57C50] hover:bg-[#8e6941] text-white rounded-[3px] flex items-center gap-1 transition shadow-xs cursor-pointer"
          >
            <Edit2 size={13} /> Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {tile("Total Invoice", Number(data.totalInvoice || 0))}
        {tile("Outstanding Receivable", outstanding)}
        {editing ? (
          <div className="p-2.5 rounded-[4px] shadow-xs border bg-white border-[#A57C50] [&_label]:hidden">
            <span className="text-[10px] block uppercase font-bold tracking-wider text-slate-500 mb-1">Deduction Backcharge</span>
            <RupiahInput label="" value={f.otherDeduction} onChange={(v) => set("otherDeduction", v)} />
          </div>
        ) : tile("Deduction Backcharge", f.otherDeduction)}
        {tile("Nett", invoiceNett({ ...data, otherDeduction: f.otherDeduction }), true)}
      </div>

      <div className="grid grid-cols-1 gap-x-6 bg-white border border-slate-200 rounded-[4px] px-3 py-1">
        <div>
          {row("Project", <>{data.customerCode} <span className="text-[10px] text-slate-500 font-medium">{getCustomerOfficialName(data.customerCode)}</span></>)}
          {row("Inv. Progress", data.workPeriod || "-")}
          {row("No. Invoice", <span className="font-mono">{f.invoiceNo}</span>, <input className={`${inputCls} font-mono`} value={f.invoiceNo} onChange={(e) => set("invoiceNo", e.target.value)} />, refLocked)}
          {row("Remarks", f.jobType || "-", <input className={inputCls} value={f.jobType} onChange={(e) => set("jobType", e.target.value)} />)}
        </div>
        <div>
          {dateRow("Invoice Date", "invoiceDate", refLocked)}
          {dateRow("Invoice Submission", "invoiceSubmissionDate")}
          {row("Due Date", showDate(data.dueDate))}
        </div>
      </div>

      {editing && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={cancel}
            className="px-4 py-1.5 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-xs cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={save}
            className="px-4 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
        </div>
      )}
    </div>
  );
};
