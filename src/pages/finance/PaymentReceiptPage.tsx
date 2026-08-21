import React, { useEffect, useState } from "react";
import { Plus, Eye, Edit2, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { api, type User } from "../../lib/api";
import { formatIDR, formatDateInput } from "../../utils/finance/formatters";
import { RupiahInput } from "../../components/finance/shared/RupiahInput";
import { AuditTimeline, generateAuditTimeline } from "../../components/finance/shared/AuditTimeline";
import type { PaymentRow, InvoiceRow } from "../../types/finance";

interface PaymentReceiptPageProps {
  query?: string;
  onNotice: (msg: string) => void;
  user?: User;
}

export function PaymentReceiptPage({ query = "", onNotice }: PaymentReceiptPageProps) {
  const [loading, setLoading] = useState(true);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<PaymentRow | null>(null);
  const [detailItem, setDetailItem] = useState<PaymentRow | null>(null);

  const [formData, setFormData] = useState({
    invoiceNo: "",
    customerCode: "POS",
    amountPaid: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    receivingBank: "Bank Mandiri Escrow",
    refNo: "",
    notes: ""
  });

  async function loadData() {
    setLoading(true);
    try {
      const [payRes, invRes] = await Promise.all([
        api<PaymentRow[]>("/api/finance/payments").catch(() => []),
        api<InvoiceRow[]>("/api/finance/invoices").catch(() => [])
      ]);
      if (Array.isArray(payRes)) setPaymentRows(payRes);
      if (Array.isArray(invRes)) setInvoiceRows(invRes);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data pembayaran");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditItem(null);
    setFormData({
      invoiceNo: invoiceRows[0]?.invoiceNo || "",
      customerCode: invoiceRows[0]?.customerCode || "POS",
      amountPaid: 0,
      paymentDate: new Date().toISOString().split("T")[0],
      receivingBank: "Bank Mandiri Escrow",
      refNo: "",
      notes: ""
    });
    setModalOpen(true);
  };

  const openEditModal = (item: PaymentRow) => {
    setEditItem(item);
    setFormData({
      invoiceNo: item.invoiceNo || "",
      customerCode: item.customerCode || "POS",
      amountPaid: item.amountPaid || 0,
      paymentDate: formatDateInput(item.paymentDate) || new Date().toISOString().split("T")[0],
      receivingBank: item.receivingBank || "Bank Mandiri Escrow",
      refNo: item.refNo || "",
      notes: item.notes || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan pembayaran ini?")) return;
    try {
      await api(`/api/finance/payments/${id}`, { method: "DELETE" });
      onNotice("Catatan pembayaran berhasil dihapus.");
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus pembayaran");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amountPaid || formData.amountPaid <= 0) {
      onNotice("Nominal pembayaran harus lebih besar dari 0");
      return;
    }

    try {
      const payload = {
        ...formData,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate).toISOString() : new Date().toISOString(),
      };

      if (editItem) {
        await api(`/api/finance/payments/${editItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        onNotice("✅ Data pembayaran berhasil diperbarui.");
      } else {
        await api("/api/finance/payments", {
          method: "POST",
          body: JSON.stringify({ ...payload, verificationStatus: "Pending", createdBy: "AR Treasury Dept" })
        });
        onNotice("✅ Pembayaran baru berhasil dicatat.");
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan pembayaran");
    }
  };

  const filteredPayments = paymentRows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(query.toLowerCase())
  );

  const totalReceipt = paymentRows.reduce((sum, r) => sum + (r.amountPaid || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Payment & Receipt Log"
          description="Monitoring riwayat penerimaan kas/bank, rekonsiliasi pembayaran invoice klien, dan mutasi AR masuk."
        />
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
            title="Muat ulang data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-xs transition cursor-pointer"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Catat Pembayaran
          </button>
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Recorded Receipt</span>
          <div className="text-2xl font-black text-emerald-700 tracking-tight font-mono mt-1">
            {formatIDR(totalReceipt)}
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
          Menampilkan {filteredPayments.length} dari {paymentRows.length} riwayat mutasi pembayaran masuk
        </div>
      </div>

      <Panel title="💵 Log Mutasi Pembayaran Masuk (Receiving Cash/Bank)">
        <div className="table-wrapper overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
          <table className="data-table w-full text-xs text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                <th className="p-3">Target Invoice</th>
                <th className="p-3">Customer</th>
                <th className="p-3 text-right">Nominal Bayar (Rp)</th>
                <th className="p-3">Tgl Penerimaan</th>
                <th className="p-3">Receiving Bank</th>
                <th className="p-3">Ref No</th>
                <th className="p-3 text-center">Ketepatan Bayar</th>
                <th className="p-3">Catatan</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800 font-medium">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                    {loading ? "Memuat data pembayaran..." : "Tidak ada riwayat pembayaran yang ditemukan."}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold">
                      <span className="text-slate-800 font-bold">{row.invoiceNo}</span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{row.customerCode}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatIDR(row.amountPaid)}</td>
                    <td className="p-3 font-mono text-slate-600">
                      {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{row.receivingBank}</td>
                    <td className="p-3 font-mono text-slate-500">{row.refNo || "-"}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          row.daysLateOrEarly > 0
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {row.daysLateOrEarly > 0 ? `Telat ${row.daysLateOrEarly} Hari` : `On-Time / Awal`}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{row.notes || "-"}</td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition cursor-pointer"
                        onClick={() => setDetailItem(row)}
                        title="Lihat Detail & Tracking Log"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        onClick={() => openEditModal(row)}
                        title="Edit Payment"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                        onClick={() => handleDelete(row.id)}
                        title="Hapus Payment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* MODAL DETAIL VIEW */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider">Detail Pembayaran</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">Invoice: {detailItem.invoiceNo}</h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block">Customer Code</span>
                <span className="text-sm font-black text-slate-900">{detailItem.customerCode}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 font-bold block">Nominal Diterima</span>
                <span className="text-sm font-black text-emerald-800">{formatIDR(detailItem.amountPaid)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block">Receiving Bank</span>
                <span className="font-bold text-slate-800">{detailItem.receivingBank}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block">Tanggal Penerimaan</span>
                <span className="font-bold text-slate-800">
                  {detailItem.paymentDate ? new Date(detailItem.paymentDate).toLocaleDateString("id-ID") : "-"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                <span className="text-slate-500 font-bold block">Catatan / Referensi Transfer</span>
                <span className="font-medium text-slate-800">{detailItem.notes || detailItem.refNo || "-"}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Audit Flow & Settlement</h4>
              <AuditTimeline steps={generateAuditTimeline("payment", detailItem)} />
            </div>

            <div className="flex justify-end pt-2">
              <button
                className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                onClick={() => setDetailItem(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT/EDIT PAYMENT */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editItem ? "Edit Pembayaran Masuk" : "Catat Pembayaran Masuk Baru"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Invoice No *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 001/POS-AAP/RF/VII/2026"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                  value={formData.invoiceNo}
                  onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Code *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                    value={formData.customerCode}
                    onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                  >
                    <option value="POS">POS</option>
                    <option value="BGG">BGG</option>
                    <option value="DBK">DBK</option>
                    <option value="SBS">SBS</option>
                    <option value="ABN">ABN</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Penerimaan *</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  />
                </div>
              </div>

              <RupiahInput
                label="Nominal Pembayaran (Rp) *"
                required
                value={formData.amountPaid}
                onChange={(val) => setFormData({ ...formData, amountPaid: val })}
                placeholder="0"
                helperText="Masukkan nominal yang tertera di rekening koran bank"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Receiving Bank *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                    value={formData.receivingBank}
                    onChange={(e) => setFormData({ ...formData, receivingBank: e.target.value })}
                  >
                    <option value="Bank Mandiri Escrow">Bank Mandiri Escrow</option>
                    <option value="Bank BNI Operasional">Bank BNI Operasional</option>
                    <option value="Bank BRI Escrow">Bank BRI Escrow</option>
                    <option value="Bank BCA">Bank BCA</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ref / No. Bukti Transfer</label>
                  <input
                    type="text"
                    placeholder="Contoh: TRF-20260714-8891"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                    value={formData.refNo}
                    onChange={(e) => setFormData({ ...formData, refNo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tambahan mutasi bank..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition"
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold transition shadow-xs"
                >
                  {editItem ? "Simpan Perubahan" : "Simpan Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
