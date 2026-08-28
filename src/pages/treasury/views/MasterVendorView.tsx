import React, { useState } from "react";
import { Building2, Edit2, Mail, RefreshCw, Save, Search, X } from "lucide-react";
import type { useTreasuryController } from "../useTreasuryController";
import type { TreasuryVendor } from "../types";

type Props = {
  c: ReturnType<typeof useTreasuryController>;
};

export function MasterVendorView({ c }: Props) {
  const { vendors, handleUpdateVendor, refreshAll } = c;

  const [search, setSearch] = useState("");
  const [editingVendor, setEditingVendor] = useState<TreasuryVendor | null>(null);
  const [formData, setFormData] = useState<Partial<TreasuryVendor>>({});

  const filtered = vendors.filter((v) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        (v.accountNumber && v.accountNumber.includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.bankName && v.bankName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const startEdit = (v: TreasuryVendor) => {
    setEditingVendor(v);
    setFormData({
      email: v.email || "",
      bankName: v.bankName || "",
      bankCode: v.bankCode || "",
      accountNumber: v.accountNumber || "",
      accountName: v.accountName || "",
      npwp: v.npwp || "",
      defaultTop: v.defaultTop || 30,
    });
  };

  const saveEdit = async () => {
    if (!editingVendor) return;
    await handleUpdateVendor(editingVendor.id, formData);
    setEditingVendor(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Nama Vendor, No Rekening, Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => refreshAll()}
            className="p-1.5 text-slate-600 hover:text-blue-600 border border-slate-300 rounded hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-800">{filtered.length}</span> Master Vendor
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-2.5">No</th>
                <th className="p-2.5">Nama Vendor</th>
                <th className="p-2.5">Email Vendor (Notifikasi Kopra Kolom L)</th>
                <th className="p-2.5">Bank Tujuan</th>
                <th className="p-2.5">No. Rekening</th>
                <th className="p-2.5">Nama Pemilik Rekening</th>
                <th className="p-2.5 text-center">TOP Default</th>
                <th className="p-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Tidak ada master vendor yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((v, idx) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5 text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-900">{v.name}</td>

                    <td className="p-2.5">
                      {v.email ? (
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <Mail className="w-3 h-3 text-blue-500" /> {v.email}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic">Belum diset</span>
                      )}
                    </td>

                    <td className="p-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {v.bankName || "MANDIRI"}
                      </span>
                      {v.bankCode && <span className="text-[10px] text-slate-400 font-mono ml-1">({v.bankCode})</span>}
                    </td>

                    <td className="p-2.5 font-mono font-bold text-blue-700">
                      {v.accountNumber || <span className="text-rose-500 font-normal italic">Kosong</span>}
                    </td>

                    <td className="p-2.5 text-slate-700 font-medium">{v.accountName || v.name}</td>

                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {v.defaultTop} Hari
                      </span>
                    </td>

                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => startEdit(v)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Vendor Modal */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Edit Detail Bank &amp; Email: {editingVendor.name}
              </h3>
              <button onClick={() => setEditingVendor(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Vendor (Untuk Injeksi Notifikasi Kopra Mandiri Kolom L):
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="finance@vendor.com"
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Bank:</label>
                  <input
                    type="text"
                    value={formData.bankName || ""}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="MANDIRI, BCA, BRI..."
                    className="w-full p-2 border border-slate-300 rounded uppercase font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Code (BIC):</label>
                  <input
                    type="text"
                    value={formData.bankCode || ""}
                    onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
                    placeholder="BMRIIDJA, BNINIDJA..."
                    className="w-full p-2 border border-slate-300 rounded uppercase font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Rekening Bank:</label>
                <input
                  type="text"
                  value={formData.accountNumber || ""}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Hanya angka, contoh: 1120018514542"
                  className="w-full p-2 border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Pemilik Rekening:</label>
                <input
                  type="text"
                  value={formData.accountName || ""}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="Sesuai buku tabungan"
                  className="w-full p-2 border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NPWP:</label>
                  <input
                    type="text"
                    value={formData.npwp || ""}
                    onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                    placeholder="00.000.000.0-000.000"
                    className="w-full p-2 border border-slate-300 rounded font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default TOP (Hari):</label>
                  <input
                    type="number"
                    value={formData.defaultTop || 30}
                    onChange={(e) => setFormData({ ...formData, defaultTop: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingVendor(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
              >
                Batal
              </button>
              <button
                onClick={saveEdit}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm"
              >
                <Save className="w-3.5 h-3.5" /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
