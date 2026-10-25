import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, Paperclip, X } from "lucide-react";
import { api, API_BASE } from "../../lib/api";
import type { AccountMapping, TPODocType, TPODocument, TPORequest, TPOStatus } from "./types";
import type { TreasuryVendor } from "../treasury/types";

export const STATUS_LABEL: Record<TPOStatus, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  rejected: "Ditolak",
  verified: "Terverifikasi",
  in_voucher: "Di Voucher",
  paid: "Lunas",
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
  PI_ASLI: "Invoice Asli",
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
      <div className={`bg-white rounded-[4px] shadow-2xl border border-slate-200 w-full ${width} max-h-[92dvh] flex flex-col overflow-hidden`}>
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

// Submission period is stored as "Oktober 2026" + week, like the invoice plan columns.
// Weeks run Monday-Sunday and belong to the month holding their Thursday (ISO rule): 4 or 5 weeks per month.
// Mirrors weeksInPlanMonth in the backend.
const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export type Period = { planMonth: string; planWeek: number };
const firstThursday = (y: number, m: number) => 1 + ((11 - new Date(y, m, 1).getDay()) % 7);
// planWeeksOf("Oktober 2026") lists the month's weeks with their Monday-Sunday range; [] for an unknown label.
export const planWeeksOf = (label: string) => {
  const [name, year] = label.split(" ");
  const m = MONTHS_ID.indexOf(name);
  const y = Number(year);
  const out: { week: number; monday: Date; sunday: Date }[] = [];
  if (m < 0 || !y) return out;
  for (let thu = firstThursday(y, m); thu <= new Date(y, m + 1, 0).getDate(); thu += 7) {
    out.push({ week: out.length + 1, monday: new Date(y, m, thu - 3), sunday: new Date(y, m, thu + 3) });
  }
  return out;
};
export const currentPeriod = (d = new Date()): Period => {
  const thu = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + 3);
  return { planMonth: `${MONTHS_ID[thu.getMonth()]} ${thu.getFullYear()}`, planWeek: Math.ceil(thu.getDate() / 7) };
};
export const periodLabel = (p: Partial<Period>) => (p.planMonth && p.planWeek ? `Week ${p.planWeek} ${p.planMonth}` : "-");
export const weekRange = (w: { monday: Date; sunday: Date }) => {
  const dm = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  return `${dm(w.monday)} – ${dm(w.sunday)}`;
};

// MonthInput edits a "Oktober 2026" label with the native month picker.
export function MonthInput({ value, onChange, className = inputCls }: { value: string; onChange: (label: string) => void; className?: string }) {
  const [name, year] = value.split(" ");
  const m = MONTHS_ID.indexOf(name);
  return (
    <input
      type="month"
      required
      value={m >= 0 ? `${year}-${String(m + 1).padStart(2, "0")}` : ""}
      onChange={(e) => {
        const [y, mm] = e.target.value.split("-").map(Number);
        onChange(y ? `${MONTHS_ID[mm - 1]} ${y}` : "");
      }}
      className={className}
    />
  );
}

export function PeriodInput({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const weeks = planWeeksOf(value.planMonth);
  return (
    <div className="flex gap-2">
      <MonthInput
        value={value.planMonth}
        onChange={(planMonth) => onChange({ planMonth, planWeek: value.planWeek <= planWeeksOf(planMonth).length ? value.planWeek : 0 })}
      />
      <select required value={value.planWeek || ""} onChange={(e) => onChange({ ...value, planWeek: Number(e.target.value) })} className={inputCls}>
        <option value="">Week</option>
        {weeks.map((w) => (
          <option key={w.week} value={w.week}>
            Week {w.week} · {weekRange(w)}
          </option>
        ))}
      </select>
    </div>
  );
}

// Account mappings: DP/PPH/TAX (Tunai PO) dan ITEM/CUSTOMER/PROJECT/KONTRAK/SALES (posting revenue). Kode bisa sama antar kind.
export function useAccountMappings(base = "/api/tunai-po") {
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const reload = () =>
    api<{ success: boolean; mappings: AccountMapping[] }>(`${base}/account-mappings`)
      .then((r) => setMappings(r.mappings || []))
      .catch(() => setMappings([]));
  useEffect(() => {
    reload();
  }, []);
  return { mappings, reload };
}

const MAPPING_KIND: Record<string, string> = { DP: "Uang Muka", PPH: "PPh", TAX: "Pajak", ITEM: "Item Penjualan", CUSTOMER: "Pelanggan", PROJECT: "Proyek", KONTRAK: "Aset Kontrak", SALES: "Penjualan", BANK: "Kas/Bank" };

export function MappingsModal({ kinds, base = "/api/tunai-po", onClose, onSaved, onError }: { kinds?: string[]; base?: string; onClose: () => void; onSaved?: () => void; onError: (m: string) => void }) {
  const { mappings } = useAccountMappings(base);
  const [edits, setEdits] = useState<Record<number, { name: string; accurateAccountNo: string }>>({});
  const [busy, setBusy] = useState(false);
  const val = (m: AccountMapping) => edits[m.id] || { name: m.name || "", accurateAccountNo: m.accurateAccountNo || "" };
  const rows = kinds ? mappings.filter((m) => kinds.includes(m.kind)) : mappings;

  const save = async () => {
    setBusy(true);
    try {
      for (const [id, body] of Object.entries(edits)) {
        await api(`${base}/account-mappings/${id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      onSaved?.();
      onClose();
    } catch (e: any) {
      onError(e.message || "Gagal menyimpan akun");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Pemetaan Akun Accurate" onClose={onClose}>
      <table className="w-full">
        <thead className="sticky top-0 bg-white text-slate-600">
          <tr>
            <th className="text-left p-1">Jenis</th>
            <th className="text-left p-1">Kode</th>
            <th className="text-left p-1">Nama</th>
            <th className="text-left p-1">Kode Accurate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-t border-slate-100">
              <td className="p-1 font-semibold">{MAPPING_KIND[m.kind] || m.kind}</td>
              <td className="p-1 font-mono">{m.code}</td>
              <td className="p-1">
                <input value={val(m).name} onChange={(e) => setEdits((x) => ({ ...x, [m.id]: { ...val(m), name: e.target.value } }))} className={inputCls} />
              </td>
              <td className="p-1">
                <input value={val(m).accurateAccountNo} onChange={(e) => setEdits((x) => ({ ...x, [m.id]: { ...val(m), accurateAccountNo: e.target.value } }))} className={`${inputCls} font-mono`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pt-3 mt-3 border-t border-slate-200 flex justify-end gap-2">
        <button onClick={onClose} className={btnSecondary}>
          Batal
        </button>
        <button onClick={save} disabled={busy || !Object.keys(edits).length} className={btnPrimary}>
          Simpan
        </button>
      </div>
    </Modal>
  );
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

// Vendor bank account (maker-checker): a change is staged and becomes active only after another user verifies it.
export function VendorBank({
  vendor,
  userId,
  canEdit,
  canVerify,
  onChanged,
  onError,
}: {
  vendor: TreasuryVendor;
  userId?: number;
  canEdit: boolean;
  canVerify?: boolean;
  onChanged: (v?: TreasuryVendor) => void;
  onError: (msg: string) => void;
}) {
  const [edit, setEdit] = useState<{ bankName: string; accountNumber: string; accountName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = !!vendor.pendingAccountNumber;
  const verified = !!vendor.bankVerifiedAt && !pending;
  const canApprove = !!canVerify && (pending ? vendor.bankChangeRequestedBy !== userId : !vendor.bankVerifiedAt && !!vendor.accountNumber);
  const link = "font-bold underline cursor-pointer disabled:opacity-50";

  const run = async (path: string, init: RequestInit) => {
    setBusy(true);
    try {
      const r = await api<{ success: boolean; vendor?: TreasuryVendor }>(`/api/tunai-po/vendors/${vendor.id}${path}`, init);
      setEdit(null);
      onChanged(r.vendor);
    } catch (e: any) {
      onError(e.message || "Gagal memproses rekening");
    } finally {
      setBusy(false);
    }
  };
  const verify = (approve: boolean) => run("/verify-bank", { method: "POST", body: JSON.stringify({ approve }) });

  if (edit) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={edit.bankName} onChange={(e) => setEdit({ ...edit, bankName: e.target.value })} placeholder="Bank" className={inputCls} />
        <input value={edit.accountNumber} onChange={(e) => setEdit({ ...edit, accountNumber: e.target.value })} placeholder="No. Rekening" className={`${inputCls} font-mono`} />
        <input value={edit.accountName} onChange={(e) => setEdit({ ...edit, accountName: e.target.value })} placeholder="Atas Nama" className={inputCls} />
        <div className="sm:col-span-3 flex justify-end gap-2">
          <button type="button" onClick={() => setEdit(null)} className={btnSecondary}>
            Batal
          </button>
          <button
            type="button"
            disabled={busy || !edit.bankName.trim() || !edit.accountNumber.trim() || !edit.accountName.trim()}
            onClick={() => run("/bank", { method: "PUT", body: JSON.stringify(edit) })}
            className={btnPrimary}
          >
            Ajukan Perubahan
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      <div className={verified ? "" : "text-rose-700"}>
        {vendor.bankName || "-"} {vendor.accountNumber || ""} {vendor.accountName ? `a.n. ${vendor.accountName}` : ""}
        {!vendor.bankVerifiedAt && <span className="ml-1 font-bold">(belum terverifikasi)</span>}
      </div>
      {pending && (
        <div className="text-rose-700">
          Menunggu verifikasi: {vendor.pendingBankName} {vendor.pendingAccountNumber} a.n. {vendor.pendingAccountName}
        </div>
      )}
      <div className="flex gap-3 text-[10px]">
        {canEdit && (
          <button
            type="button"
            className={`${link} text-blue-700`}
            onClick={() =>
              setEdit({
                bankName: vendor.pendingBankName || vendor.bankName || "",
                accountNumber: vendor.pendingAccountNumber || vendor.accountNumber || "",
                accountName: vendor.pendingAccountName || vendor.accountName || "",
              })
            }
          >
            Ubah
          </button>
        )}
        {canApprove && (
          <button
            type="button"
            disabled={busy}
            className={`${link} text-emerald-700`}
            onClick={() => {
              const b = pending ? [vendor.pendingBankName, vendor.pendingAccountNumber, vendor.pendingAccountName] : [vendor.bankName, vendor.accountNumber, vendor.accountName];
              if (window.confirm(`Verifikasi rekening ${b[0]} ${b[1]} a.n. ${b[2]} untuk ${vendor.name}? Pastikan sudah dikonfirmasi ke vendor (call-back).`)) verify(true);
            }}
          >
            Verifikasi
          </button>
        )}
        {canApprove && pending && (
          <button type="button" disabled={busy} className={`${link} text-rose-700`} onClick={() => verify(false)}>
            Tolak
          </button>
        )}
      </div>
    </div>
  );
}

// Amount input shown with id-ID separators (1.234.567,89); value and onChange use a plain "1234567.89" string.
export function AmountInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [int, dec] = String(value ?? "").split(".");
  const shown = int === "" && dec === undefined ? "" : `${(Number(int) || 0).toLocaleString("id-ID")}${dec !== undefined ? `,${dec}` : ""}`;
  return (
    <input
      inputMode="decimal"
      disabled={disabled}
      value={shown}
      onChange={(e) => {
        const [i, d] = e.target.value.replace(/[^\d,]/g, "").split(",");
        onChange(d === undefined ? i : `${i}.${d.slice(0, 2)}`);
      }}
      className={`${inputCls} text-right font-mono`}
    />
  );
}
