import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, Paperclip, X } from "lucide-react";
import { api, API_BASE } from "../../lib/api";
import type { AccountMapping, TPODocType, TPODocument, TPORequest, TPOStatus } from "./types";

export const STATUS_LABEL: Record<TPOStatus, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  rejected: "Ditolak",
  verified: "Terverifikasi",
  in_voucher: "Di Voucher",
  paid: "Dibayar",
  posted: "Diposting",
};

const STATUS_TONE: Record<TPOStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_voucher: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-teal-50 text-teal-700 border-teal-200",
  posted: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export const DOC_TYPES: TPODocType[] = ["PO", "PI_SOFT", "PI_ASLI", "FAKTUR_PAJAK", "BAST", "GR"];
export const DOC_LABEL: Record<TPODocType, string> = {
  PO: "PO",
  PI_SOFT: "PI Soft",
  PI_ASLI: "PI Asli",
  FAKTUR_PAJAK: "Faktur Pajak",
  BAST: "BAST",
  GR: "GR",
};
export const DOC_SHORT: Record<TPODocType, string> = { ...DOC_LABEL, FAKTUR_PAJAK: "FP" };

export const REJECT_CATEGORIES = [
  { value: "ALOKASI", label: "Alokasi" },
  { value: "DOKUMEN", label: "Dokumen" },
  { value: "LAIN", label: "Lainnya" },
];

// Decimal-safe add/subtract: amounts are 2-decimal strings, so work in cents.
export const cents = (v: string | number | null | undefined) => Math.round((Number(v) || 0) * 100);
export const fromCents = (c: number) => (c / 100).toFixed(2);

export const inputCls =
  "w-full px-2 py-1.5 text-xs border border-slate-300 rounded-[3px] bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#A57C50] focus:border-[#A57C50] disabled:bg-slate-50 disabled:text-slate-500";
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
export const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export function StatusBadge({ status }: { status: TPOStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${STATUS_TONE[status] ?? STATUS_TONE.draft}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function OverdueBadge() {
  return <span className="inline-block px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold">Terlambat</span>;
}

export function Modal({ title, onClose, children, width = "max-w-2xl" }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className={`bg-white rounded-[4px] shadow-2xl border border-slate-200 w-full ${width} max-h-[92vh] flex flex-col overflow-hidden`}>
        <div className="bg-[#1A1612] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1 rounded-[3px] transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto text-xs">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-semibold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

// Account mappings (kind DP = Jenis Uang Muka, kind PPH = Jenis PPh).
export function useAccountMappings() {
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const reload = () =>
    api<{ success: boolean; mappings: AccountMapping[] }>("/api/tunai-po/account-mappings")
      .then((r) => setMappings(r.mappings || []))
      .catch(() => setMappings([]));
  useEffect(() => {
    reload();
  }, []);
  return { mappings, reload };
}

export const isDocRequired = (r: TPORequest, docType: TPODocType) => docType !== "FAKTUR_PAJAK" || r.isPkp;
export const docOf = (r: TPORequest, docType: TPODocType) => r.documents?.find((d) => d.docType === docType);

export async function saveDocument(requestId: number, docType: TPODocType, checked: boolean, note: string, file?: File) {
  const form = new FormData();
  form.append("checked", String(checked));
  form.append("note", note);
  if (file) form.append("file", file);
  const res = await api<{ success: boolean; document: TPODocument }>(`/api/tunai-po/requests/${requestId}/documents/${docType}`, {
    method: "POST",
    body: form,
  });
  return res.document;
}

export async function openDocumentFile(doc: TPODocument) {
  const token = localStorage.getItem("financeerp.token") || "";
  const res = await fetch(`${API_BASE}/api/tunai-po/documents/${doc.id}/file`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Gagal mengunduh dokumen");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.fileName || `${doc.docType}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Compact per-document toggle used by the tracking table: click = check/uncheck, clip = upload.
export function DocToggle({
  request,
  docType,
  canEdit,
  onSaved,
  onError,
}: {
  request: TPORequest;
  docType: TPODocType;
  canEdit: boolean;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!isDocRequired(request, docType)) return <span className="text-slate-400">—</span>;
  const doc = docOf(request, docType);
  const run = async (checked: boolean, file?: File) => {
    setBusy(true);
    try {
      await saveDocument(request.id, docType, checked, doc?.note || "", file);
      onSaved();
    } catch (e: any) {
      onError(e.message || "Gagal menyimpan dokumen");
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className={`inline-flex items-center gap-0.5 ${busy ? "opacity-50" : ""}`}>
      <button
        type="button"
        disabled={!canEdit || busy}
        onClick={() => run(!doc?.checked)}
        title={DOC_LABEL[docType]}
        className="cursor-pointer disabled:cursor-default"
      >
        {doc?.checked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
      </button>
      {doc?.fileName ? (
        <button type="button" onClick={() => openDocumentFile(doc).catch((e) => onError(e.message))} title={doc.fileName} className="cursor-pointer">
          <Paperclip className="w-3 h-3 text-blue-600" />
        </button>
      ) : (
        canEdit && (
          <label title="Upload" className="cursor-pointer">
            <Paperclip className="w-3 h-3 text-slate-300 hover:text-slate-500" />
            <input type="file" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && run(true, e.target.files[0])} />
          </label>
        )
      )}
    </span>
  );
}
