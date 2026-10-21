import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../../lib/api";
import { formatCurrency } from "../../../lib/format";
import type { useTreasuryController } from "../useTreasuryController";
import { VOUCHER_CATEGORIES } from "../types";
import { AmountInput, Field, Modal, btnPrimary, btnSecondary, cents, fromCents, inputCls, useAccountMappings } from "../../tunai-po/shared";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
  category: string;
  onClose: () => void;
};

type Line = { accountNo: string; description: string; amount: string };
const emptyLine: Line = { accountNo: "", description: "", amount: "" };

// Non-PO voucher (Tunai Non PO / Asuransi / Infrastruktur): typed-in payee, one Accurate account per line.
export function NonPOVoucherModal({ c, category, onClose }: Props) {
  const { mappings } = useAccountMappings();
  const pphTypes = mappings.filter((m) => m.kind === "PPH");
  const [accounts, setAccounts] = useState<{ no: string; name: string }[]>([]);
  const [banks, setBanks] = useState<{ code: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyBankId: c.companyBanks[0]?.id || 0,
    voucherDate: new Date().toISOString().slice(0, 10),
    site: "",
    payeeName: "",
    payeeBankCode: "",
    payeeAccountNumber: "",
    payeeAccountName: "",
    justification: "",
    pphType: "",
    pphAmount: "",
  });
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  useEffect(() => {
    api<{ success: boolean; accounts: { no: string; name: string }[] }>("/api/treasury/accurate/gl-accounts")
      .then((r) => setAccounts(r.accounts || []))
      .catch(() => setAccounts([]));
    api<{ success: boolean; banks: { code: string; name: string }[] }>("/api/treasury/payee-banks")
      .then((r) => setBanks(r.banks || []))
      .catch(() => setBanks([]));
  }, []);

  // Banks may load after the modal opens; never send companyBankId 0.
  useEffect(() => {
    if (!form.companyBankId && c.companyBanks[0]) set({ companyBankId: c.companyBanks[0].id });
  }, [c.companyBanks]);

  const gross = lines.reduce((s, l) => s + cents(l.amount), 0);
  const pay = gross - cents(form.pphAmount);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await c.handleCreateNonPO({
      ...form,
      category,
      pphAmount: fromCents(cents(form.pphAmount)),
      lines: lines.map((l) => ({ accountNo: l.accountNo.trim(), description: l.description.trim(), amount: fromCents(cents(l.amount)) })),
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal title={`Voucher ${VOUCHER_CATEGORIES[category] || category}`} onClose={onClose} width="max-w-4xl">
      <form onSubmit={save} className="space-y-4 text-xs">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Rekening Sumber">
            <select value={form.companyBankId} onChange={(e) => set({ companyBankId: Number(e.target.value) })} className={inputCls}>
              {c.companyBanks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} ({b.accountNumber})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tanggal Voucher">
            <input type="date" required value={form.voucherDate} onChange={(e) => set({ voucherDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Site">
            <input required value={form.site} onChange={(e) => set({ site: e.target.value.toUpperCase() })} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Field label="Penerima">
            <input required value={form.payeeName} onChange={(e) => set({ payeeName: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Bank">
            <select required value={form.payeeBankCode} onChange={(e) => set({ payeeBankCode: e.target.value })} className={inputCls}>
              <option value="">Pilih bank</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="No. Rekening">
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{6,}"
              value={form.payeeAccountNumber}
              onChange={(e) => set({ payeeAccountNumber: e.target.value.replace(/\D/g, "") })}
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="Nama Rekening">
            <input required value={form.payeeAccountName} onChange={(e) => set({ payeeAccountName: e.target.value })} className={inputCls} />
          </Field>
        </div>

        <Field label="Keterangan">
          <input value={form.justification} onChange={(e) => set({ justification: e.target.value })} className={inputCls} />
        </Field>

        <datalist id="accurate-gl-accounts">
          {accounts.map((a) => (
            <option key={a.no} value={a.no}>
              {a.name}
            </option>
          ))}
        </datalist>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <th className="p-1.5 text-left w-48">Akun Accurate</th>
              <th className="p-1.5 text-left">Keterangan</th>
              <th className="p-1.5 text-right w-44">Nominal</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-1">
                  <input required list="accurate-gl-accounts" value={l.accountNo} onChange={(e) => setLine(i, { accountNo: e.target.value })} className={`${inputCls} font-mono`} />
                  <div className="text-[10px] text-slate-500 truncate">{accounts.find((a) => a.no === l.accountNo)?.name}</div>
                </td>
                <td className="p-1">
                  <input required maxLength={255} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} className={inputCls} />
                </td>
                <td className="p-1">
                  <AmountInput value={l.amount} onChange={(v) => setLine(i, { amount: v })} />
                </td>
                <td className="p-1 text-center">
                  {lines.length > 1 && (
                    <button type="button" onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))} className="text-rose-600 hover:text-rose-800 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setLines((ls) => [...ls, { ...emptyLine }])} className={btnSecondary}>
          <Plus className="w-3.5 h-3.5" /> Baris
        </button>

        <div className="grid grid-cols-3 gap-3 items-end">
          <Field label="Jenis PPh">
            <select value={form.pphType} onChange={(e) => set({ pphType: e.target.value, pphAmount: e.target.value ? form.pphAmount : "" })} className={inputCls}>
              <option value="">Tanpa PPh</option>
              {pphTypes.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nominal PPh">
            <AmountInput value={form.pphAmount} onChange={(v) => set({ pphAmount: v })} disabled={!form.pphType} />
          </Field>
          <div className="text-right space-y-0.5">
            <div className="text-slate-500">Bruto {formatCurrency(fromCents(gross))}</div>
            <div className="font-bold text-sm text-slate-900">Dibayar {formatCurrency(fromCents(pay))}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Batal
          </button>
          <button type="submit" disabled={saving || pay <= 0} className={btnPrimary}>
            Simpan Voucher
          </button>
        </div>
      </form>
    </Modal>
  );
}
