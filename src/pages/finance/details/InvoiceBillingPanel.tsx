import React, { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { api } from "../../../lib/api";
import { formatIDR, formatDateInput, getCustomerOfficialName, RupiahInput } from "../helpers";

interface InvoiceBillingPanelProps {
  data: any;
  canEdit: boolean;
  canAlterPosted: boolean;
  onSaved: (updated: any) => void;
  onNotice: (msg: string) => void;
}

const isoOrNull = (d: string) => (d ? new Date(d).toISOString() : null);
const showDate = (d: string) => (d ? new Date(d).toLocaleDateString("id-ID") : "-");
const inputCls = "w-full bg-white border border-slate-300 rounded-[3px] p-2 text-slate-900 font-bold focus:border-[#A57C50] outline-none text-xs";

// Data penagihan invoice: nilai (Amount/Outstanding) mengikuti BA & pembayaran; nomor, remarks, tanggal & backcharge bisa diedit.
export const InvoiceBillingPanel: React.FC<InvoiceBillingPanelProps> = ({ data, canEdit, canAlterPosted, onSaved, onNotice }) => {
  const init = () => ({
    invoiceNo: data.invoiceNo || "",
    jobType: data.jobType || "",
    invoiceDate: formatDateInput(data.invoiceDate),
    invoiceSubmissionDate: formatDateInput(data.invoiceSubmissionDate),
    dueDate: formatDateInput(data.dueDate),
    otherDeduction: Number(data.otherDeduction || 0),
  });
  const [f, setF] = useState(init);
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(init()), [data]);

  const outstanding = Number(data.outstanding ?? (Number(data.totalInvoice || 0) - Number(data.totalPaid || 0)));
  const set = (key: string, val: any) => setF((prev) => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api(`/api/finance/invoices/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...f,
          invoiceDate: isoOrNull(f.invoiceDate),
          invoiceSubmissionDate: isoOrNull(f.invoiceSubmissionDate),
          dueDate: isoOrNull(f.dueDate),
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

  const cell = (label: string, content: React.ReactNode) => (
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      {content}
    </div>
  );
  const text = (v: React.ReactNode, cls = "") => <div className={`text-xs font-bold text-slate-900 py-2 ${cls}`}>{v}</div>;
  // No. Invoice & Invoice Date invoice yang sudah dijurnal hanya oleh Manager FATB.
  const canEditRef = canEdit && canAlterPosted;
  const dateCell = (label: string, key: "invoiceDate" | "invoiceSubmissionDate" | "dueDate", editable = canEdit) =>
    cell(label, editable ? <input type="date" className={inputCls} value={f[key]} onChange={(e) => set(key, e.target.value)} /> : text(showDate(f[key])));

  return (
    <div className="p-4 border border-slate-200 rounded-[4px] bg-slate-50 space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cell("Project", text(<>{data.customerCode} <span className="text-[10px] text-slate-500 font-medium">{getCustomerOfficialName(data.customerCode)}</span></>))}
        {cell("Inv. Progress", text(data.workPeriod || "-"))}
        {cell("No. Invoice", canEditRef ? <input className={`${inputCls} font-mono`} value={f.invoiceNo} onChange={(e) => set("invoiceNo", e.target.value)} /> : text(f.invoiceNo, "font-mono"))}
        {cell("Remarks", canEdit ? <input className={inputCls} value={f.jobType} onChange={(e) => set("jobType", e.target.value)} /> : text(f.jobType || "-"))}
        {cell("Amount", text(formatIDR(data.totalInvoice), "font-mono"))}
        {dateCell("Invoice Date", "invoiceDate", canEditRef)}
        {dateCell("Invoice Submission", "invoiceSubmissionDate")}
        {dateCell("Due Date", "dueDate")}
        {cell("Outstanding Receivable", text(formatIDR(outstanding), "font-mono"))}
        {canEdit
          ? <RupiahInput label="Deduction Backcharge" value={f.otherDeduction} onChange={(v) => set("otherDeduction", v)} />
          : cell("Deduction Backcharge", text(formatIDR(f.otherDeduction), "font-mono"))}
        {cell("Nett", text(formatIDR(outstanding - f.otherDeduction), "font-mono text-rose-700"))}
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className={`px-4 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs rounded-[3px] shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
        </div>
      )}
    </div>
  );
};
