import React, { useEffect, useState } from "react";
import { Save, Loader2, FileText, Edit2, Lock, Upload, ExternalLink, Send } from "lucide-react";
import { api } from "../../../lib/api";
import { formatIDR, formatDateInput, getCustomerOfficialName, invoiceNett, invoiceOutstanding, RupiahInput, parsePeriodToYYYYMM, resolveDocumentUrl, INVOICE_LOCKED } from "../helpers";
import { ACCURATE_CUTOVER } from "./AccuratePostingPanel";

interface InvoiceBillingPanelProps {
  data: any;
  canEdit: boolean;
  canAlterPosted: boolean;
  onSaved: (updated: any) => void;
  onNotice: (msg: string) => void;
}

type DateKey = "invoiceDate" | "invoiceSubmissionDate" | "fpDate" | "directorSignedDate" | "invoiceSentDate";
type Form = Record<DateKey, string> & { invoiceNo: string; jobType: string; otherDeduction: number; fpChecked: boolean; fpNumber: string };

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
    fpChecked: Boolean(data.fpChecked),
    fpDate: formatDateInput(data.fpDate),
    fpNumber: data.fpNumber || "",
    directorSignedDate: formatDateInput(data.directorSignedDate),
    invoiceSentDate: formatDateInput(data.invoiceSentDate),
  });
  const [f, setF] = useState(init);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState<"" | "save" | "send">("");
  const [uploading, setUploading] = useState(false);
  const [sendDate, setSendDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  useEffect(() => { setF(init()); setEditing(false); }, [data]);

  const uploadSigned = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      onSaved(await api(`/api/finance/invoices/${data.id}/signed-pdf`, { method: "POST", body: form }));
      onNotice("Dokumen lampiran tersimpan");
    } catch (err: any) {
      onNotice(err?.message || "Gagal mengunggah dokumen lampiran");
    } finally {
      setUploading(false);
    }
  };

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
    if ((cur && !cur.startsWith("INV-")) || refLocked || data.invoiceCategory === "Rental" || data.invoiceCategory === "Mess" || (ym !== "" && ym < ACCURATE_CUTOVER)) return;
    try {
      const r = await api<{ invoiceNo?: string }>(`/api/finance/invoices/${data.id}/number-suggestion`);
      if (r?.invoiceNo) setF((prev) => (prev.invoiceNo === cur ? { ...prev, invoiceNo: r.invoiceNo! } : prev));
    } catch {
      // Accurate tak terjangkau: nomor yang ada dipakai.
    }
  };
  const canSend = INVOICE_LOCKED.has(data.status) && data.fpChecked && Boolean(data.signedInvoicePath) && Boolean(data.directorSignedDate);
  const save = async (extra: Partial<Form> = {}) => {
    const v = { ...f, ...extra };
    // Diterima Klien diubah sebelum invoice terkirim: Tgl Kirim di form ikut disimpan.
    if (!v.invoiceSentDate && v.invoiceSubmissionDate && v.invoiceSubmissionDate !== formatDateInput(data.invoiceSubmissionDate)) v.invoiceSentDate = sendDate;
    if (v.fpChecked && !v.fpDate) return onNotice("Tanggal Faktur Pajak wajib diisi");
    setSaving(extra.invoiceSentDate ? "send" : "save");
    try {
      const updated = await api(`/api/finance/invoices/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...v,
          invoiceDate: isoOrNull(v.invoiceDate),
          invoiceSubmissionDate: isoOrNull(v.invoiceSubmissionDate),
          fpDate: v.fpChecked ? isoOrNull(v.fpDate) : null,
          fpNumber: v.fpChecked ? v.fpNumber : "",
          directorSignedDate: isoOrNull(v.directorSignedDate),
          invoiceSentDate: isoOrNull(v.invoiceSentDate),
        }),
      });
      onSaved(updated);
      onNotice("Data penagihan invoice tersimpan");
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan data penagihan invoice");
    } finally {
      setSaving("");
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
  const dateRow = (label: string, key: DateKey, locked = false) =>
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
          {dateRow("Diterima Klien", "invoiceSubmissionDate", !f.invoiceSentDate && !data.invoiceSubmissionDate)}
          {row("Due Date", showDate(data.dueDate))}
          {row("Dokumen Lampiran", (
            <span className="flex flex-wrap items-center gap-2">
              {data.signedInvoicePath ? (
                <a href={resolveDocumentUrl(data.signedInvoicePath)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#A57C50] hover:underline">
                  <ExternalLink size={12} /> Lihat PDF
                </a>
              ) : <span className="text-slate-400">-</span>}
              {canEdit && (
                <label className={`px-2 py-0.5 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {data.signedInvoicePath ? "Ganti" : "Upload"}
                  <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={uploadSigned} />
                </label>
              )}
            </span>
          ))}
          {dateRow("TTD Direktur", "directorSignedDate")}
          {row("Faktur Pajak", f.fpChecked ? <span>✓ {showDate(f.fpDate)} {f.fpNumber && <span className="font-mono">{f.fpNumber}</span>}</span> : "-", (
            <span className="flex flex-wrap items-center gap-2">
              <input type="checkbox" className="accent-[#A57C50]" checked={f.fpChecked} onChange={(e) => set("fpChecked", e.target.checked)} />
              {f.fpChecked && <>
                <input type="date" className={`${inputCls} w-auto`} value={f.fpDate} onChange={(e) => set("fpDate", e.target.value)} />
                <input className={`${inputCls} w-auto flex-1 min-w-[140px] font-mono`} placeholder="No. FP" value={f.fpNumber} onChange={(e) => set("fpNumber", e.target.value)} />
              </>}
            </span>
          ))}
          {row("Tgl Kirim", f.invoiceSentDate ? showDate(f.invoiceSentDate) : canEdit ? (
            <input type="date" className={`${inputCls} w-auto`} min={f.directorSignedDate || undefined} max={f.invoiceSubmissionDate || undefined} value={sendDate} onChange={(e) => setSendDate(e.target.value)} />
          ) : "-", f.invoiceSentDate ? <input type="date" className={inputCls} value={f.invoiceSentDate} onChange={(e) => set("invoiceSentDate", e.target.value)} /> : undefined)}
        </div>
      </div>

      {(editing || (canEdit && !f.invoiceSentDate)) && (
        <div className="flex flex-wrap justify-end gap-2">
          {editing && <>
            <button
              type="button"
              disabled={!!saving}
              onClick={cancel}
              className="px-4 py-1.5 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!!saving || !dirty}
              onClick={() => save()}
              className="px-4 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
            </button>
          </>}
          {canEdit && !f.invoiceSentDate && (
            <button
              type="button"
              disabled={!canSend || !sendDate || sendDate < f.directorSignedDate || !!saving || dirty}
              onClick={() => save({ invoiceSentDate: sendDate })}
              className="px-4 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving === "send" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Kirim
            </button>
          )}
        </div>
      )}
    </div>
  );
};
