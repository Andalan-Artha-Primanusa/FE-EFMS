import React, { useEffect, useState } from "react";
import { Plus, Eye, Edit2, Trash2, Building2, RefreshCw } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { api, type User } from "../../lib/api";
import { formatIDR } from "../../utils/finance/formatters";
import { RupiahInput } from "../../components/finance/shared/RupiahInput";
import { AuditTimeline, generateAuditTimeline } from "../../components/finance/shared/AuditTimeline";
import type { CustomerRow } from "../../types/finance";

interface CustomerCreditTermsPageProps {
  query?: string;
  onNotice: (msg: string) => void;
  user?: User;
}

export function CustomerCreditTermsPage({ query = "", onNotice }: CustomerCreditTermsPageProps) {
  const [loading, setLoading] = useState(true);
  const [customerRows, setCustomerRows] = useState<CustomerRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<CustomerRow | null>(null);
  const [detailItem, setDetailItem] = useState<CustomerRow | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    fullName: "",
    groupParent: "",
    terminDays: 30,
    contactPerson: "",
    emailAR: "",
    phone: "",
    contractNo: "",
    contractValue: 0,
    notes: ""
  });

  async function loadData() {
    setLoading(true);
    try {
      const data = await api<CustomerRow[]>("/api/finance/customers");
      if (Array.isArray(data)) setCustomerRows(data);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data customer");
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
      code: "",
      fullName: "",
      groupParent: "",
      terminDays: 30,
      contactPerson: "",
      emailAR: "",
      phone: "",
      contractNo: "",
      contractValue: 0,
      notes: ""
    });
    setModalOpen(true);
  };

  const openEditModal = (c: CustomerRow) => {
    setEditItem(c);
    setFormData({
      code: c.code || "",
      fullName: c.fullName || "",
      groupParent: c.groupParent || "",
      terminDays: c.terminDays || 30,
      contactPerson: c.contactPerson || c.contactAR || "",
      emailAR: c.emailAR || "",
      phone: c.phone || "",
      contractNo: c.contractNo || "",
      contractValue: c.contractValue || 0,
      notes: c.notes || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data customer ini?")) return;
    try {
      await api(`/api/finance/customers/${id}`, { method: "DELETE" });
      onNotice("Data customer berhasil dihapus.");
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus customer");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.fullName) {
      onNotice("Kode dan nama customer wajib diisi");
      return;
    }

    try {
      if (editItem) {
        await api(`/api/finance/customers/${editItem.id}`, {
          method: "PUT",
          body: JSON.stringify(formData)
        });
        onNotice("✅ Data customer berhasil diperbarui.");
      } else {
        await api("/api/finance/customers", {
          method: "POST",
          body: JSON.stringify(formData)
        });
        onNotice("✅ Customer baru berhasil ditambahkan.");
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan customer");
    }
  };

  const filteredCustomers = customerRows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Customer Master & Credit Terms"
          description="Direktori pelanggan, grup induk entitas (Petrindo, PTBA, Harum Energy), default termin pembayaran, dan performa pembayaran historis."
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
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-xs transition shrink-0 cursor-pointer"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Tambah Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200 shadow-xs">
            {loading ? "Memuat master data customer..." : "Tidak ada data customer yang cocok dengan pencarian."}
          </div>
        ) : (
          filteredCustomers.map((c: any) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 relative hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                    <Building2 size={12} /> {c.code}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{c.fullName}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Grup: <span className="text-slate-800 font-bold">{c.groupParent || "-"}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Termin Hari</span>
                  <div className="text-lg font-black text-amber-700">{c.terminDays || 30} Hari</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-xs text-slate-700 space-y-1.5 font-medium">
                <div>
                  <span className="text-slate-500 font-bold">No. Kontrak:</span> {c.contractNo || "-"}
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Nilai Kontrak:</span>{" "}
                  <span className="font-extrabold text-slate-900">{formatIDR(c.contractValue || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Kontak AR:</span>{" "}
                  {c.contactPerson || c.contactAR || "-"} {c.emailAR ? `(${c.emailAR})` : ""}
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Catatan:</span> {c.notes || "-"}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  className="text-xs font-bold text-cyan-800 hover:text-cyan-900 flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-50 border border-cyan-200 cursor-pointer transition"
                  onClick={() => setDetailItem(c)}
                >
                  <Eye size={13} /> View Audit
                </button>
                <button
                  className="text-xs font-bold text-slate-700 hover:text-cyan-800 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 cursor-pointer transition"
                  onClick={() => openEditModal(c)}
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 cursor-pointer transition"
                  onClick={() => handleDelete(c.id)}
                >
                  <Trash2 size={13} /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DETAIL MODAL */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider">Audit Master Customer</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{detailItem.fullName} ({detailItem.code})</h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block">Termin Kredit</span>
                <span className="text-sm font-black text-slate-900">{detailItem.terminDays || 30} Hari</span>
              </div>
              <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                <span className="text-cyan-800 font-bold block">Nilai Kontrak</span>
                <span className="text-sm font-black text-cyan-950">{formatIDR(detailItem.contractValue || 0)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                <span className="text-slate-500 font-bold block">Nomor Kontrak Kerja</span>
                <span className="font-bold text-slate-900">{detailItem.contractNo || "-"}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Legal & Contract Timeline</h4>
              <AuditTimeline steps={generateAuditTimeline("customer", detailItem)} />
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

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editItem ? `Edit Customer: ${editItem.fullName}` : "Tambah Master Customer Baru"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-3">
                <span className="text-xs font-black uppercase text-cyan-800 tracking-wider block border-b border-slate-200 pb-1">
                  📌 1. Profil Perusahaan & Credit Terms
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kode Customer *</label>
                    <input
                      required
                      placeholder="Contoh: POS, BGG, SBS"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold uppercase text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Termin Pembayaran (Hari) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                      value={formData.terminDays}
                      onChange={(e) => setFormData({ ...formData, terminDays: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Perusahaan *</label>
                  <input
                    required
                    placeholder="Contoh: PT Budi Gema Gempita"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Induk Perusahaan (Group Parent)</label>
                  <input
                    placeholder="Contoh: Petrindo Jaya Kreasi Tbk / PTBA"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                    value={formData.groupParent}
                    onChange={(e) => setFormData({ ...formData, groupParent: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-black uppercase text-cyan-800 tracking-wider block border-b border-slate-200 pb-1">
                  📞 2. Kontak & Komunikasi AR
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">PIC AR</label>
                    <input
                      placeholder="Bpk. Hendra"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email AR</label>
                    <input
                      type="email"
                      placeholder="ar@customer.co.id"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                      value={formData.emailAR}
                      onChange={(e) => setFormData({ ...formData, emailAR: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telepon</label>
                    <input
                      placeholder="+62 21 555 0192"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-black uppercase text-cyan-800 tracking-wider block border-b border-slate-200 pb-1">
                  📄 3. Kontrak & Nilai Kerjasama
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">No. Kontrak</label>
                    <input
                      placeholder="002/POS-AAP/2025"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                      value={formData.contractNo}
                      onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                    />
                  </div>
                  <RupiahInput
                    label="Nilai Kontrak (Rp)"
                    value={formData.contractValue}
                    onChange={(val) => setFormData({ ...formData, contractValue: val })}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan Kontrak</label>
                  <textarea
                    rows={2}
                    placeholder="Ketentuan termin, klausul khusus..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-cyan-700 outline-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
                  {editItem ? "Simpan Perubahan" : "Simpan Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
