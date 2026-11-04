import React, { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import type { TPOKind, TPOLookup, TPOPurchaseOrder, TPORequest } from "./types";
import { AmountInput, Field, Modal, PeriodInput, VendorBank, btnPrimary, btnSecondary, cents, currentPeriod, fromCents, inputCls } from "./shared";

type Props = {
  kind: TPOKind;
  editing?: TPORequest | null;
  onClose: () => void;
  onSaved: (req: TPORequest) => void;
  onError: (msg: string) => void;
};

// Jenis Uang Muka and PKP are set by finance at verification.
export function RequestFormModal({ kind, editing, onClose, onSaved, onError }: Props) {
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
  });
  const [period, setPeriod] = useState(editing?.planMonth ? { planMonth: editing.planMonth, planWeek: editing.planWeek || 0 } : currentPeriod());
  const hasPeriod = !!period.planMonth && period.planWeek > 0;
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

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
      setPoNo(r.purchaseOrder.poNo);
      if (!editing) {
        set({ subtotalAmount: String(r.purchaseOrder.subtotalAmount ?? ""), vatAmount: String(r.purchaseOrder.vatAmount ?? "") });
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

  const save = async () => {
    if (!lookup) return;
    setSaving(true);
    try {
      const body = JSON.stringify({
        kind,
        poNo: lookup.purchaseOrder.poNo,
        proformaNo: form.proformaNo.trim(),
        description: form.description.trim(),
        subtotalAmount: fromCents(cents(form.subtotalAmount)),
        vatAmount: fromCents(cents(form.vatAmount)),
        ...period,
      });
      const res = editing
        ? await api<{ success: boolean; request: TPORequest }>(`/api/tunai-po/requests/${editing.id}`, { method: "PUT", body })
        : await api<{ success: boolean; request: TPORequest }>("/api/tunai-po/requests", { method: "POST", body });
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
                    {[o.vendor?.name, o.site, `Sisa ${formatCurrency(o.remaining)}`].filter(Boolean).join(" · ")}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-[3px] p-3">
            <Info label="Vendor" value={vendor?.name || "-"} />
            <Info label="Site" value={po.site || "-"} />
            <Info label="DPP PO" value={formatCurrency(po.subtotalAmount)} />
            <Info label="PPN PO" value={formatCurrency(po.vatAmount)} />
            <Info label="Total PO" value={formatCurrency(po.totalAmount)} />
            <Info label="Sudah Diajukan" value={formatCurrency(lookup!.requestedTotal)} />
            <Info label="Sisa" value={formatCurrency(fromCents(remaining))} strong />
            {vendor && (
              <div className="col-span-full">
                <Info
                  label="Rekening Vendor"
                  value={<VendorBank vendor={vendor} canEdit onChanged={(v) => v && setLookup((l) => l && { ...l, vendor: v })} onError={onError} />}
                />
              </div>
            )}
          </div>
        )}

        {po && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Periode Pengajuan">
                <PeriodInput value={period} onChange={setPeriod} />
              </Field>
            </div>
            <Field label="No. Proforma">
              <input value={form.proformaNo} onChange={(e) => set({ proformaNo: e.target.value })} className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Keterangan">
                <textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label="DPP">
              <AmountInput value={form.subtotalAmount} onChange={(v) => set({ subtotalAmount: v })} />
            </Field>
            <Field label="PPN">
              <AmountInput value={form.vatAmount} onChange={(v) => set({ vatAmount: v })} />
            </Field>
            <Field label="Total">
              <div className={`px-2 py-1.5 border rounded-[3px] text-right font-mono font-bold ${total > remaining ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-900"}`}>
                {formatCurrency(fromCents(total))}
              </div>
            </Field>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Batal
          </button>
          <button type="button" disabled={!po || saving || total <= 0 || total > remaining || !hasPeriod || !form.proformaNo.trim()} onClick={save} className={btnPrimary}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {editing && editing.status !== "draft" ? "Simpan" : "Simpan Draft"}
          </button>
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
