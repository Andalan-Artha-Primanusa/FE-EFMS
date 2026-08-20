import { useState } from "react";
import { X } from "lucide-react";
import { createTransaction, updateTransaction, type Transaction } from "../lib/api";

export function TransactionModal({
  transaction,
  onClose,
  onSaved
}: {
  transaction?: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    type: transaction?.type ?? "Payment Request",
    companyId: 1,
    description: transaction?.description ?? "",
    amount: transaction?.amount ?? 0
  });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (transaction) {
      await updateTransaction(transaction.id, form);
    } else {
      await createTransaction(form);
    }
    onSaved();
  }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}>
    <div className="panel-head"><h3>{transaction ? "Edit pengajuan transaksi" : "Pengajuan transaksi"}</h3><button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button></div>
    <label>Jenis transaksi<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{["Purchase Request", "Expense Request", "Cash Advance", "Reimbursement", "Payment Request"].map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Deskripsi<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Contoh: pembayaran termin vendor hauling" required /></label>
    <label>Nominal<input type="number" min="1" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required /></label>
    <button className="primary">{transaction ? "Update dan kirim ulang approval" : "Submit ke approval"}</button>
  </form></div>;
}
