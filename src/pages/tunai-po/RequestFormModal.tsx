import React, { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { AccountMapping, TPOLookup, TPOPurchaseOrder, TPORequest } from "./types";
import { Field, Modal, btnPrimary, btnSecondary, cents, fromCents, inputCls } from "./shared";

type Props = {
  editing?: TPORequest | null;
  mappings: AccountMapping[];
  onClose: () => void;
  onSaved: (req: TPORequest) => void;
  onError: (msg: string) => void;
};

export function RequestFormModal({ editing, mappings, onClose, onSaved, onError }: Props) {
  const [poNo, setPoNo] = useState(editing?.poNo || "");
  const [options, setOptions] = useState<TPOPurchaseOrder[]>([]);
  const [lookup, setLookup] = useState<TPOLookup | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    proformaNo: editing?.proformaNo || "",
    description: editing?.description || "",
    subtotalAmount: editing?.subtotalAmount || "",
    vatAmount: editing?.vatAmount || "",
    dpType: editing?.dpType || "",
    isPkp: editing?.isPkp ?? false,
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const dpTypes = mappings.filter((m) => m.kind === "DP");

  // PO picker: native datalist fed by the PO search endpoint.
  useEffect(() => {
    if (editing) return;
    const t = setTimeout(() => {
      api<{ success: boolean; purchaseOrders: TPOPurchaseOrder[] }>(`/api/tunai-po/purchase-orders?search=${encodeURIComponent(poNo)}&limit=50`)
        .then((r) => setOptions(r.purchaseOrders || []))
        .catch(() => setOptions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [poNo, editing]);

  const doLookup = async (no = poNo) => {
    if (!no.trim()) return;
    setLooking(true);
    try {
      const r = await api<{ success: boolean } & TPOLookup>(`/api/tunai-po/purchase-orders/lookup?poNo=${encodeURIComponent(no.trim())}`);
      setLookup(r);
      if (!editing) {
        set({ subtotalAmount: String(r.purchaseOrder.subtotalAmount ?? ""), vatAmount: String(r.purchaseOrder.vatAmount ?? ""), isPkp: r.suggestedPkp });
      }
    } catch (e: any) {
      setLookup(null);
      onError(e.message || "PO tidak ditemukan");
    } finally {
      setLooking(false);
    }
  };

  useEffect(() => {
    if (editing) doLookup(editing.poNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = cents(form.subtotalAmount) + cents(form.vatAmount);
  // The edited request is already counted in requestedTotal unless it was rejected.
  const remaining = lookup ? cents(lookup.remaining) + (editing && editing.status !== "rejected" ? cents(editing.totalAmount) : 0) : 0;
  const vendor = lookup?.vendor || lookup?.purchaseOrder.vendor;
  const bankOk = !!vendor?.bankVerifiedAt && !vendor?.pendingAccountNumber;

  const save = async (submit: boolean) => {
    if (!lookup) return;
    setSaving(true);
    try {
      const body = JSON.stringify({
        poNo: lookup.purchaseOrder.poNo,
        proformaNo: form.proformaNo.trim(),
        description: form.description.trim(),
        subtotalAmount: fromCents(cents(form.subtotalAmount)),
        vatAmount: fromCents(cents(form.vatAmount)),
        dpType: form.dpType,
        isPkp: form.isPkp,
      });
      let res = editing
        ? await api<{ success: boolean; request: TPORequest }>(`/api/tunai-po/requests/${editing.id}`, { method: "PUT", body })
        : await api<{ success: boolean; request: TPORequest }>("/api/tunai-po/requests", { method: "POST", body });
      if (submit) res = await api<{ success: boolean; request: TPORequest }>(`/api/tunai-po/requests/${res.request.id}/submit`, { method: "POST" });
      onSaved(res.request);
    } catch (e: any) {
      onError(e.message || "Gagal menyimpan pengajuan");
    } finally {
      setSaving(false);
    }
  };

  const po = lookup?.purchaseOrder;
  return (
    <Modal title={editing ? `Ubah Pengajuan — ${editing.poNo}` : "Pengajuan Baru"} onClose={onClose} width="max-w-3xl">
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="No. PO">
              <input
                list="tpo-po-options"
                value={poNo}
                disabled={!!editing}
                onChange={(e) => {
                  setPoNo(e.target.value);
                  if (options.some((o) => o.poNo === e.target.value)) doLookup(e.target.value);
                }}
                onKeyDown={(e) => e.key === "Enter" && doLookup()}
                className={inputCls}
              />
              <datalist id="tpo-po-options">
                {options.map((o) => (
                  <option key={o.id} value={o.poNo}>
                    {[o.vendor?.name, o.site, formatCurrency(o.totalAmount)].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </datalist>
            </Field>
          </div>
          {!editing && (
            <button type="button" onClick={() => doLookup()} disabled={looking || !poNo.trim()} className={btnSecondary}>
              {looking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Cek PO
            </button>
          )}
        </div>

        {po && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-[3px] p-3">
            <Info label="Vendor" value={vendor?.name || "-"} />
            <Info label="Site" value={po.site || "-"} />
            <Info label="DPP PO" value={formatCurrency(po.subtotalAmount)} />
            <Info label="PPN PO" value={formatCurrency(po.vatAmount)} />
            <Info label="Total PO" value={formatCurrency(po.totalAmount)} />
            <Info label="Sudah Diajukan" value={formatCurrency(lookup!.requestedTotal)} />
            <Info label="Sisa" value={formatCurrency(fromCents(remaining))} strong />
            <Info
              label="Rekening Vendor"
              value={
                <span className={bankOk ? "" : "text-rose-700"}>
                  {vendor?.bankName || "-"} {vendor?.accountNumber || ""} {vendor?.accountName ? `a.n. ${vendor.accountName}` : ""}
                  {!bankOk && <span className="ml-1 font-bold">(belum terverifikasi)</span>}
                </span>
              }
            />
          </div>
        )}

        {po && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. Proforma">
              <input value={form.proformaNo} onChange={(e) => set({ proformaNo: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Jenis Uang Muka">
              <select value={form.dpType} onChange={(e) => set({ dpType: e.target.value })} className={inputCls}>
                <option value="">—</option>
                {dpTypes.map((m) => (
                  <option key={m.id} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Keterangan">
                <textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label="DPP">
              <input type="number" step="0.01" value={form.subtotalAmount} onChange={(e) => set({ subtotalAmount: e.target.value })} className={`${inputCls} text-right font-mono`} />
            </Field>
            <Field label="PPN">
              <input type="number" step="0.01" value={form.vatAmount} onChange={(e) => set({ vatAmount: e.target.value })} className={`${inputCls} text-right font-mono`} />
            </Field>
            <Field label="Total">
              <div className={`px-2 py-1.5 border rounded-[3px] text-right font-mono font-bold ${total > remaining ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-900"}`}>
                {formatCurrency(fromCents(total))}
              </div>
            </Field>
            <label className="flex items-center gap-2 mt-5 font-semibold text-slate-700">
              <input type="checkbox" checked={form.isPkp} onChange={(e) => set({ isPkp: e.target.checked })} /> PKP
            </label>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Batal
          </button>
          <button type="button" disabled={!po || saving} onClick={() => save(false)} className={btnSecondary}>
            {editing && editing.status !== "draft" ? "Simpan" : "Simpan Draft"}
          </button>
          {(!editing || editing.status === "draft" || editing.status === "rejected") && (
            <button type="button" disabled={!po || saving || total <= 0} onClick={() => save(true)} className={btnPrimary}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Ajukan
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function Info({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`text-slate-900 ${strong ? "font-bold" : "font-semibold"}`}>{value}</div>
    </div>
  );
}
