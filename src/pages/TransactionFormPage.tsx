import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { createTransaction, updateTransaction, type Transaction } from "../lib/api";

export function TransactionFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const transaction = location.state?.transaction as Transaction | undefined;

  const [form, setForm] = useState({
    type: transaction?.type ?? "Payment Request",
    companyId: 1,
    description: transaction?.description ?? "",
    amount: transaction?.amount ?? 0
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (transaction) {
        await updateTransaction(transaction.id, form);
      } else {
        await createTransaction(form);
      }
      navigate("/", { state: { notice: "Pengajuan transaksi disimpan dan masuk approval workflow." } });
    } catch (err) {
      console.error(err instanceof Error ? err.message : "Gagal menyimpan transaksi");
    }
  }

  return (
    <div className="entity-page max-w-3xl mx-auto mt-6">
      <div className="entity-page-head flex items-center gap-4">
        <button className="icon-btn" onClick={() => navigate(-1)} title="Kembali">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-finance-navy">
            {transaction ? "Edit pengajuan transaksi" : "Pengajuan transaksi"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Isi formulir pengajuan transaksi di bawah ini.</p>
        </div>
      </div>
      
      <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
        <label>
          <span>Jenis transaksi</span>
          <select 
            value={form.type} 
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full mt-2"
          >
            {["Purchase Request", "Expense Request", "Cash Advance", "Reimbursement", "Payment Request"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        
        <label>
          <span>Deskripsi</span>
          <textarea 
            value={form.description} 
            onChange={(e) => setForm({ ...form, description: e.target.value })} 
            placeholder="Contoh: pembayaran termin vendor hauling" 
            required 
            className="w-full mt-2"
          />
        </label>
        
        <label>
          <span>Nominal</span>
          <input 
            type="number" 
            min="1" 
            value={form.amount || ""} 
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} 
            required 
            className="w-full mt-2"
          />
        </label>
        
        <div className="form-actions mt-4 pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" className="ghost" onClick={() => navigate(-1)}>Batal</button>
          <button type="submit" className="primary">
            {transaction ? "Update dan kirim ulang approval" : "Submit ke approval"}
          </button>
        </div>
      </form>
    </div>
  );
}
