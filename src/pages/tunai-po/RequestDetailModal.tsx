import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Loader2, Paperclip } from "lucide-react";
import { api, useReloadOnSave } from "../../lib/api";
import { viewPath } from "../../data/navigation";
import { formatCurrency, formatDate } from "../../lib/format";
import type { AccountMapping, AuditLogRow, TPODocType, TPORequest, TPOStatus } from "./types";
import {
  AmountInput,
  DOC_ACCEPT,
  DOC_LABEL,
  DOC_TYPES,
  Field,
  Modal,
  OverdueBadge,
  PaidDateModal,
  REJECT_CATEGORIES,
  STATUS_LABEL,
  SUBMIT_DOCS,
  StatusBadge,
  VendorBank,
  btnDanger,
  btnPrimary,
  btnSecondary,
  cents,
  docOf,
  docProgress,
  fromCents,
  inputCls,
  isDocRequired,
  openDocumentFile,
  openRefundFile,
  periodLabel,
  saveDocument,
  submitDocsReady,
} from "./shared";
import { Info } from "./RequestFormModal";

const LOG_LABEL: Record<string, string> = {
  create: "Dibuat",
  update: "Diubah",
  delete: "Dihapus",
  submit: "Diajukan",
  verify: "Diverifikasi",
  reject: "Ditolak",
  document: "Dokumen",
  in_voucher: "Masuk Voucher",
  paid: "Lunas",
  posted: "Diposting",
  refund: "Refund",
};

const scrollIntoView = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: "smooth", block: "nearest" });

const DOC_SECTIONS: [string, TPODocType[]][] = [
  ["Wajib", SUBMIT_DOCS],
  ["Susulan", DOC_TYPES.filter((t) => !SUBMIT_DOCS.includes(t))],
];

const FLOW: TPOStatus[] = ["draft", "submitted", "verified", "in_voucher", "paid", "posted"];

function StatusSteps({ status }: { status: TPOStatus }) {
  const at = FLOW.indexOf(status === "rejected" ? "draft" : status);
  return (
    <ol className="flex flex-wrap gap-1">
      {FLOW.map((s, i) => (
        <li
          key={s}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
            i === at ? "border-[#A57C50] bg-[#A57C50] text-white" : i < at ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400"
          }`}
        >
          {i < at && <Check className="w-3 h-3" />}
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}

type Props = {
  requestId: number;
  userId?: number;
  canSubmit: boolean;
  canVerify: boolean;
  canDocs: boolean;
  canVoucher: boolean;
  mappings: AccountMapping[];
  onClose: () => void;
  onChanged: () => void;
  onEdit?: (r: TPORequest) => void;
  onError: (msg: string) => void;
};

export function RequestDetailModal({ requestId, userId, canSubmit, canVerify, canDocs, canVoucher, mappings, onClose, onChanged, onEdit, onError }: Props) {
  const navigate = useNavigate();
  const [req, setReq] = useState<TPORequest | null>(null);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [mode, setMode] = useState<"" | "verify" | "reject" | "refund">("");
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [r, l] = await Promise.all([
        api<{ success: boolean; request: TPORequest }>(`/api/tunai-po/requests/${requestId}`),
        api<{ success: boolean; logs: AuditLogRow[] }>(`/api/tunai-po/requests/${requestId}/logs`).catch(() => ({ logs: [] as AuditLogRow[] })),
      ]);
      setReq(r.request);
      setLogs(l.logs || []);
    } catch (e: any) {
      onError(e.message || "Gagal memuat pengajuan");
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);
  useReloadOnSave(load);

  const action = async (path: string, init: RequestInit = { method: "POST" }) => {
    setBusy(true);
    try {
      await api(`/api/tunai-po/requests/${requestId}${path}`, init);
      setMode("");
      await load();
      onChanged();
      return true;
    } catch (e: any) {
      onError(e.message || "Gagal memproses");
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!req) {
    return (
      <Modal title="Detail" onClose={onClose}>
        <div className="flex justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      </Modal>
    );
  }

  const isOwner = !!userId && req.createdBy === userId;
  const ownerEditable = canSubmit && isOwner && (req.status === "draft" || req.status === "rejected");
  const bankReady = !!req.vendor?.bankVerifiedAt && !req.vendor.pendingAccountNumber && !!req.vendor.accountNumber?.trim();
  const progress = docProgress(req);
  const refundable = cents(req.payAmount) - cents(req.refundAmount);
  const dpName =(code?: string) => mappings.find((m) => m.kind === "DP" && m.code === code)?.name || code || "-";

  const accTotal = cents(req.accSubtotal) + cents(req.accVat);
  const amountRows: [string, number, number][] = [
    ["DPP", cents(req.accSubtotal), cents(req.subtotalAmount)],
    ["PPN", cents(req.accVat), cents(req.vatAmount)],
    ["Total", accTotal, cents(req.totalAmount)],
  ];

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          {req.poNo} <StatusBadge status={req.status} />
          {req.docsOverdue && <OverdueBadge />}
        </span>
      }
      onClose={onClose}
      width="max-w-4xl"
    >
      <div className="space-y-4">
        <StatusSteps status={req.status} />
        {req.status === "rejected" && (
          <div className="border border-rose-200 bg-rose-50 rounded-[3px] p-3 text-rose-800">
            <div className="font-bold">
              Ditolak ({REJECT_CATEGORIES.find((c) => c.value === req.rejectCategory)?.label || req.rejectCategory || "-"}) · {req.rejectCount}x
            </div>
            <div className="whitespace-pre-wrap">{req.rejectReason}</div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-[3px] p-3">
          <Info label="Vendor" value={req.vendor?.name || "-"} />
          <Info label="Site" value={req.site || "-"} />
          <Info label="Periode" value={periodLabel(req)} />
          <Info label="No. Proforma" value={req.proformaNo || "-"} />
          <Info label="Jenis Uang Muka" value={dpName(req.dpType)} />
          <Info label="PKP" value={req.isPkp ? "Ya" : "Tidak"} />
          <Info label="No. Voucher" value={req.voucherNo || "-"} />
          <Info label="Tanggal Bayar" value={formatDate(req.paidAt)} />
          <Info label="Jatuh Tempo Dokumen" value={<span className={req.docsOverdue ? "text-rose-700" : ""}>{formatDate(req.docsDueAt)}</span>} />
          {req.accurateDpNo && <Info label="No. DP Accurate" value={req.accurateDpNo} />}
          <div className="col-span-full">
            <Info label="Keterangan" value={req.description || "-"} />
          </div>
          {req.vendor && (
            <div className="col-span-full">
              <Info
                label="Rekening Vendor"
                value={
                  <VendorBank
                    vendor={req.vendor}
                    userId={userId}
                    canEdit={canDocs && req.status !== "paid" && req.status !== "posted"}
                    canVerify={canVerify}
                    onChanged={load}
                    onError={onError}
                  />
                }
              />
            </div>
          )}
        </div>

        <table className="w-full border border-slate-200">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-2"></th>
              <th className="text-right p-2">Accurate</th>
              <th className="text-right p-2">Pengajuan</th>
            </tr>
          </thead>
          <tbody>
            {amountRows.map(([label, acc, cur]) => (
              <tr key={label} className={`border-t border-slate-200 ${acc !== cur ? "bg-amber-50" : ""}`}>
                <td className="p-2 font-semibold text-slate-700">{label}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(fromCents(acc))}</td>
                <td className={`p-2 text-right font-mono ${acc !== cur ? "font-bold text-amber-700" : ""}`}>{formatCurrency(fromCents(cur))}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200">
              <td className="p-2 font-semibold text-slate-700">PPh {req.pphType ? `(${req.pphType})` : ""}</td>
              <td className="p-2"></td>
              <td className="p-2 text-right font-mono">{formatCurrency(req.pphAmount)}</td>
            </tr>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="p-2 font-bold text-slate-900">Total Bayar</td>
              <td className="p-2"></td>
              <td className="p-2 text-right font-mono font-bold">{formatCurrency(req.payAmount)}</td>
            </tr>
            {req.refunds?.map((r) => (
              <tr key={r.id} className="border-t border-slate-200">
                <td className="p-2 font-semibold text-slate-700">Refund {formatDate(r.refundDate)}</td>
                <td className="p-2 text-right">
                  <button type="button" onClick={() => openRefundFile(r).catch((e) => onError(e.message))} className="inline-flex items-center gap-1 text-blue-700 hover:underline cursor-pointer max-w-[180px] truncate">
                    <Paperclip className="w-3 h-3 shrink-0" /> {r.fileName}
                  </button>
                </td>
                <td className="p-2 text-right font-mono text-rose-700">{formatCurrency(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <div className="font-bold text-slate-700 mb-1">
            Checklist Dokumen{" "}
            <span className="font-normal text-slate-400">
              ({progress.done}/{progress.total})
            </span>
          </div>
          <div className="space-y-2">
            {DOC_SECTIONS.map(([label, types]) => (
              <div key={label} className="border border-slate-200 rounded-[3px] divide-y divide-slate-200">
                <div className="px-2 py-1 bg-slate-50 font-semibold text-slate-600">{label}</div>
                {types.map((t) => (
                  <DocRow key={t} req={req} docType={t} canEdit={canDocs} onSaved={() => { load(); onChanged(); }} onError={onError} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {mode && (
          <div ref={scrollIntoView} key={mode}>
            {mode === "verify" && <VerifyForm req={req} mappings={mappings} busy={busy} onCancel={() => setMode("")} onSubmit={(body) => action("/verify", { method: "POST", body: JSON.stringify(body) })} />}
            {mode === "reject" && <RejectForm busy={busy} onCancel={() => setMode("")} onSubmit={(body) => action("/reject", { method: "POST", body: JSON.stringify(body) })} />}
            {mode === "refund" && <RefundForm max={refundable} busy={busy} onCancel={() => setMode("")} onSubmit={(body) => action("/refund", { method: "POST", body })} />}
          </div>
        )}

        {!mode && (
          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200">
            {ownerEditable && (
              <button
                disabled={busy}
                className={btnDanger}
                onClick={async () => {
                  if (!window.confirm("Hapus pengajuan ini?")) return;
                  if (await action("", { method: "DELETE" })) onClose();
                }}
              >
                Hapus
              </button>
            )}
            {ownerEditable && onEdit && (
              <button disabled={busy} className={btnSecondary} onClick={() => onEdit(req)}>
                Ubah
              </button>
            )}
            {ownerEditable && (
              <button disabled={busy || !submitDocsReady(req)} className={btnPrimary} onClick={() => action("/submit")}>
                Ajukan
              </button>
            )}
            {canVerify && (req.status === "submitted" || (req.status === "verified" && !req.paymentPlanId)) && (
              <button disabled={busy} className={btnDanger} onClick={() => setMode("reject")}>
                Tolak
              </button>
            )}
            {canVerify && req.status === "submitted" && (
              <button disabled={busy || !submitDocsReady(req) || !bankReady} className={btnPrimary} onClick={() => setMode("verify")}>
                Verifikasi
              </button>
            )}
            {canVoucher && req.status === "verified" && !req.paymentPlanId && (
              <button className={btnPrimary} onClick={() => navigate(`${viewPath("Voucher Payment")}?create=${req.kind}`)}>
                Buat Voucher
              </button>
            )}
            {canVerify && req.status === "in_voucher" && req.voucherHasProof && (
              <button disabled={busy} className={btnPrimary} onClick={() => setPaying(true)}>
                Tandai Lunas
              </button>
            )}
            {canVerify && (req.status === "paid" || req.status === "posted") && refundable > 0 && (
              <button disabled={busy} className={btnDanger} onClick={() => setMode("refund")}>
                Refund
              </button>
            )}
          </div>
        )}
        {/* Marks the whole voucher paid. */}
        {paying && (
          <PaidDateModal
            voucherNo={req.voucherNo}
            onClose={() => setPaying(false)}
            onSubmit={(paidDate) => {
              setPaying(false);
              action("/paid", { method: "POST", body: JSON.stringify({ paidDate }) });
            }}
          />
        )}

        <details className="group border border-slate-200 rounded-[3px]">
          <summary className="flex items-center gap-2 p-2 font-bold text-slate-700 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
            Riwayat <span className="font-normal text-slate-400">({logs.length})</span>
          </summary>
          <div className="border-t border-slate-200 divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {logs.length === 0 && <div className="p-2 text-slate-400">-</div>}
            {logs.map((l) => (
              <div key={l.id} className="px-3 py-1.5 grid grid-cols-1 sm:grid-cols-[130px_120px_1fr] gap-x-3">
                <span className="text-slate-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("id-ID")}</span>
                <span className="font-semibold text-slate-800">{LOG_LABEL[l.action] || l.action}</span>
                <span className="text-slate-600 truncate">
                  {l.user}
                  {l.action === "document" && l.after?.docType && (
                    <span className="text-slate-500">
                      {" · "}
                      {DOC_LABEL[l.after.docType as TPODocType] || l.after.docType} {l.after.checked ? "✓" : "✗"}
                      {l.after.file ? ` · ${l.after.file}` : ""}
                    </span>
                  )}
                  {l.action === "reject" && l.after?.rejectReason && <span className="text-rose-700"> · {l.after.rejectReason}</span>}
                  {l.action === "refund" && l.after?.amount && <span className="text-rose-700"> · {formatCurrency(l.after.amount)}</span>}
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </Modal>
  );
}

function DocRow({ req, docType, canEdit, onSaved, onError }: { req: TPORequest; docType: TPODocType; canEdit: boolean; onSaved: () => void; onError: (m: string) => void }) {
  const doc = docOf(req, docType);
  const [note, setNote] = useState(doc?.note || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setNote(doc?.note || ""), [doc?.note]);
  const required = isDocRequired(req, docType);

  const save = async (checked: boolean, file?: File) => {
    setBusy(true);
    try {
      await saveDocument(req.id, docType, checked, note, file);
      onSaved();
    } catch (e: any) {
      onError(e.message || "Gagal menyimpan dokumen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 sm:gap-3 p-2 ${required ? "" : "opacity-50"}`}>
      <label className="flex items-center gap-2 w-36 shrink-0 font-semibold text-slate-700">
        <input type="checkbox" checked={!!doc?.checked} disabled={!canEdit || busy || !required} onChange={(e) => save(e.target.checked)} />
        {DOC_LABEL[docType]}
      </label>
      {required ? (
        <>
          <input
            value={note}
            disabled={!canEdit || busy}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (doc?.note || "") && save(!!doc?.checked)}
            placeholder="Catatan"
            className={`${inputCls} flex-1 min-w-40`}
          />
          {doc?.fileName && (
            <button type="button" onClick={() => openDocumentFile(doc).catch((e) => onError(e.message))} className="inline-flex items-center gap-1 text-blue-700 hover:underline cursor-pointer max-w-[180px] truncate">
              <Paperclip className="w-3 h-3 shrink-0" /> {doc.fileName}
            </button>
          )}
          {canEdit && (
            <label className={`${btnSecondary} ${busy ? "opacity-50" : ""}`}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />} Upload
              <input type="file" accept={DOC_ACCEPT} className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && save(true, e.target.files[0])} />
            </label>
          )}
          <span className="sm:w-28 sm:text-right text-slate-500">{doc?.checkedAt ? formatDate(doc.checkedAt) : ""}</span>
        </>
      ) : (
        <span className="text-slate-400">—</span>
      )}
    </div>
  );
}

function VerifyForm({ req, mappings, busy, onCancel, onSubmit }: { req: TPORequest; mappings: AccountMapping[]; busy: boolean; onCancel: () => void; onSubmit: (body: object) => void }) {
  const [f, setF] = useState({
    subtotalAmount: req.subtotalAmount,
    vatAmount: req.vatAmount,
    pphType: req.pphType || "",
    pphAmount: req.pphAmount || "0",
    dpType: req.dpType || "",
    isPkp: req.isPkp,
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [vendorOverdue, setVendorOverdue] = useState(0);
  useEffect(() => {
    api<{ requests: TPORequest[] }>(`/api/tunai-po/requests?vendorId=${req.vendorId}&overdue=1`)
      .then((r) => setVendorOverdue(r.requests?.length || 0))
      .catch(() => setVendorOverdue(0));
  }, [req.vendorId]);
  // Adjustable PPN, none when non-PKP. Accurate computes the Uang Muka PPN itself (11% DPP); a total off by more than Rp 1 stops posting.
  const vat = f.isPkp ? cents(f.vatAmount) : 0;
  const total = cents(f.subtotalAmount) + vat;
  const pph = f.pphType ? cents(f.pphAmount) : 0;
  const expectedVat = Math.round(cents(f.subtotalAmount) * 0.11);

  return (
    <div className="border border-emerald-200 bg-emerald-50 rounded-[3px] p-3 space-y-3">
      {f.isPkp && Math.abs(vat - expectedVat) > 100 && (
        <div className="border border-amber-200 bg-amber-50 text-amber-700 font-semibold rounded-[3px] px-2 py-1.5">PPN ≠ 11% DPP ({formatCurrency(fromCents(expectedVat))}): posting Accurate akan berhenti</div>
      )}
      {vendorOverdue > 0 && <div className="border border-rose-200 bg-rose-50 text-rose-700 font-semibold rounded-[3px] px-2 py-1.5">Vendor: {vendorOverdue} pengajuan dokumennya terlambat</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="DPP">
          <AmountInput value={f.subtotalAmount} onChange={(v) => set({ subtotalAmount: v })} />
        </Field>
        <Field label="PPN">
          <AmountInput disabled={!f.isPkp} value={f.isPkp ? f.vatAmount : "0"} onChange={(v) => set({ vatAmount: v })} />
        </Field>
        <Field label="Total">
          <div className="px-2 py-1.5 border border-slate-200 bg-white rounded-[3px] text-right font-mono">{formatCurrency(fromCents(total))}</div>
        </Field>
        <Field label="Jenis PPh">
          <select value={f.pphType} onChange={(e) => set({ pphType: e.target.value })} className={inputCls}>
            <option value="">Tanpa PPh</option>
            {mappings.filter((m) => m.kind === "PPH").map((m) => (
              <option key={m.id} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nominal PPh">
          <AmountInput disabled={!f.pphType} value={f.pphType ? f.pphAmount : "0"} onChange={(v) => set({ pphAmount: v })} />
        </Field>
        <Field label="Total Bayar">
          <div className="px-2 py-1.5 border border-slate-200 bg-white rounded-[3px] text-right font-mono font-bold">{formatCurrency(fromCents(total - pph))}</div>
        </Field>
        <Field label="Jenis Uang Muka">
          <select value={f.dpType} onChange={(e) => set({ dpType: e.target.value })} className={inputCls}>
            <option value="">—</option>
            {mappings.filter((m) => m.kind === "DP").map((m) => (
              <option key={m.id} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 sm:mt-5 font-semibold text-slate-700">
          <input type="checkbox" checked={f.isPkp} onChange={(e) => set({ isPkp: e.target.checked })} /> PKP
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button className={btnSecondary} onClick={onCancel} disabled={busy}>
          Batal
        </button>
        <button
          className={btnPrimary}
          disabled={busy || !f.dpType || total <= 0}
          onClick={() => {
            // A non-STOK Uang Muka account must be listed on the Accurate vendor, else posting fails after the transfer.
            const dp = mappings.find((m) => m.kind === "DP" && m.code === f.dpType);
            if (f.dpType !== "STOK" && !window.confirm(`Akun Uang Muka ${dp?.name || f.dpType} (${dp?.accurateAccountNo || "-"}) terdaftar di Pemasok ${req.vendor?.name || ""}?`)) return;
            onSubmit({
              subtotalAmount: fromCents(cents(f.subtotalAmount)),
              vatAmount: fromCents(vat),
              pphType: f.pphType,
              pphAmount: fromCents(pph),
              dpType: f.dpType,
              isPkp: f.isPkp,
            });
          }}
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Verifikasi
        </button>
      </div>
    </div>
  );
}

function RefundForm({ max, busy, onCancel, onSubmit }: { max: number; busy: boolean; onCancel: () => void; onSubmit: (body: FormData) => void }) {
  const today = new Date().toLocaleDateString("sv-SE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [file, setFile] = useState<File | null>(null);
  const value = cents(amount);
  return (
    <div className="border border-rose-200 bg-rose-50 rounded-[3px] p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label={`Nominal (maks. ${formatCurrency(fromCents(max))})`}>
          <AmountInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Tanggal Refund">
          <input type="date" required max={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Bukti">
          <input type="file" accept={DOC_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] || null)} className={inputCls} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button className={btnSecondary} onClick={onCancel} disabled={busy}>
          Batal
        </button>
        <button
          className={btnDanger}
          disabled={busy || value <= 0 || value > max || !date || !file}
          onClick={() => {
            const body = new FormData();
            body.append("amount", fromCents(value));
            body.append("refundDate", date);
            body.append("file", file!);
            onSubmit(body);
          }}
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Simpan Refund
        </button>
      </div>
    </div>
  );
}

function RejectForm({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (body: object) => void }) {
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="border border-rose-200 bg-rose-50 rounded-[3px] p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Kategori">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {REJECT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Alasan">
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button className={btnSecondary} onClick={onCancel} disabled={busy}>
          Batal
        </button>
        <button className={btnDanger} disabled={busy || !category || !reason.trim()} onClick={() => onSubmit({ category, reason: reason.trim() })}>
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Tolak
        </button>
      </div>
    </div>
  );
}
