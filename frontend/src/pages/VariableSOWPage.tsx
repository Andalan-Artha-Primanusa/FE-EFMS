import { useEffect, useState } from "react";
import { Clock, Edit2, Plus, Trash2, X, Eye, Filter, Layers, Pickaxe, CheckCircle, Search } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { api } from "../lib/api";

export function VariableSOWPage({
  viewTitle,
  query,
  onNotice
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [sowRows, setSowRows] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    category: "Operation & Mining",
    itemName: "",
    rateUSD: 0,
    unit: "USD/BCM",
    customer: "POS",
    description: "",
    status: "Active"
  });

  async function loadData() {
    setLoading(true);
    try {
      const res = await api<any[]>("/api/master-data/variable-sow");
      setSowRows(Array.isArray(res) ? res : []);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data Variable SOW");
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
      category: "Operation & Mining",
      itemName: "",
      rateUSD: 0,
      unit: "USD/BCM",
      customer: "POS",
      description: "",
      status: "Active"
    });
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditItem(item);
    setFormData({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = "/api/master-data/variable-sow";
      if (editItem?.id) {
        endpoint += `/${editItem.id}`;
        await api(endpoint, { method: "PUT", body: JSON.stringify(formData) });
        onNotice("Master Variable SOW berhasil diperbarui!");
      } else {
        await api(endpoint, { method: "POST", body: JSON.stringify(formData) });
        onNotice("Master Variable SOW baru berhasil ditambahkan!");
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menyimpan data Variable SOW");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tarif Variable SOW ini?")) return;
    try {
      await api(`/api/master-data/variable-sow/${id}`, { method: "DELETE" });
      onNotice("Variable SOW berhasil dihapus!");
      await loadData();
    } catch (err: any) {
      onNotice(err?.message || "Gagal menghapus data Variable SOW");
    }
  };

  if (loading) {
    return (
      <div className="workspace-body">
        <PageHeader title={viewTitle} description="Memuat data Master Variable SOW..." />
        <div className="panel flex items-center justify-center p-12 text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Clock className="animate-spin mr-2 text-cyan-600" size={20} /> Memuat data...
        </div>
      </div>
    );
  }

  const filteredRows = sowRows.filter((r) => {
    const matchQ = JSON.stringify(r).toLowerCase().includes(query.toLowerCase());
    if (!matchQ) return false;
    if (categoryFilter !== "All" && r.category !== categoryFilter) return false;
    if (customerFilter !== "All" && r.customer !== customerFilter) return false;
    return true;
  });

  return (
    <div className="workspace-body space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Master Data — Variable Scope of Work (SOW)"
          description="Katalog tarif satuan dasar pertambangan (USD/BCM, USD/1KM, USD/m2) untuk Operation & Mining, Rehabilitation, dan Mine Development (MDO)."
        />
        <button
          className="primary flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm transition shrink-0"
          onClick={openCreateModal}
        >
          <Plus size={16} /> Tambah Variable SOW Baru
        </button>
      </div>

      {/* Filter Tabs & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Item SOW</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{sowRows.length} Item</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Kategori SOW</span>
          <div className="text-sm font-black text-cyan-800 mt-1">Operation, Rehab, MDO</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Filter Kategori</span>
          <select
            className="bg-slate-50 text-slate-900 text-xs font-bold p-2 rounded-lg border border-slate-300 focus:outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">Semua Kategori</option>
            <option value="Operation & Mining">Operation & Mining</option>
            <option value="Rehabilitation">Rehabilitation</option>
            <option value="Mine Development (MDO)">Mine Development (MDO)</option>
          </select>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Filter Customer</span>
          <select
            className="bg-slate-50 text-slate-900 text-xs font-bold p-2 rounded-lg border border-slate-300 focus:outline-none"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          >
            <option value="All">Semua Customer</option>
            <option value="POS">POS - PT Position</option>
            <option value="BGG">BGG - PT Budi Gema Gempita</option>
            <option value="SBS">SBS - PT Satria Bahana Sarana</option>
            <option value="DBK">DBK - PT Daya Bumindo Karunia</option>
          </select>
        </div>
      </div>

      {/* Main Table Panel */}
      <Panel title="📋 Katalog Tarif Master Variable SOW">
        <div className="table-wrapper overflow-x-auto rounded-lg border border-slate-200">
          <table className="data-table w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                <th className="p-3">Kategori SOW</th>
                <th className="p-3">Nama Pekerjaan (SOW Item)</th>
                <th className="p-3 text-right">Base Rate (USD)</th>
                <th className="p-3 text-center">Satuan (Unit)</th>
                <th className="p-3">Customer / Proyek</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-900 font-medium">
              {filteredRows.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-extrabold text-cyan-800">{row.category}</td>
                  <td className="p-3 font-bold text-slate-900">{row.itemName}</td>
                  <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                    ${Number(row.rateUSD).toFixed(3)}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                      {row.unit}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-800">{row.customer}</td>
                  <td className="p-3 text-slate-600">{row.description || "-"}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === "Active" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-slate-100 text-slate-600 border border-slate-300"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      className="p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
                      onClick={() => openEditModal(row)}
                      title="Edit SOW"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                      onClick={() => handleDelete(row.id)}
                      title="Hapus SOW"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                    Tidak ada data Variable SOW yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* CREATE & EDIT MODAL FORM */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 w-full max-w-xl shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto transition-all">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                  <Layers size={14} /> Master Data Entri
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {editItem ? "Edit Variable SOW" : "Tambah Variable SOW Baru"}
                </h3>
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm font-medium text-slate-800">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Kategori Pekerjaan <span className="text-rose-600">*</span>
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="Operation & Mining">Operation & Mining</option>
                  <option value="Rehabilitation">Rehabilitation</option>
                  <option value="Mine Development (MDO)">Mine Development (MDO)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Pekerjaan (SOW Item) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none"
                  placeholder="Contoh: Overburden/Waste - Base Rate (1000m)"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Base Rate (USD) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2.5 text-slate-900 font-extrabold focus:border-cyan-700 focus:bg-white outline-none"
                      placeholder="3.327"
                      value={formData.rateUSD}
                      onChange={(e) => setFormData({ ...formData, rateUSD: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Satuan (Unit) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  >
                    <option value="USD/BCM">USD/BCM</option>
                    <option value="USD/1KM">USD/1KM</option>
                    <option value="USD/m2">USD/m2</option>
                    <option value="USD/TON">USD/TON</option>
                    <option value="USD/Jam HM">USD/Jam HM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Customer / Proyek Target <span className="text-rose-600">*</span>
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none"
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    required
                  >
                    <option value="POS">POS - PT Position</option>
                    <option value="BGG">BGG - PT Budi Gema Gempita</option>
                    <option value="SBS">SBS - PT Satria Bahana Sarana</option>
                    <option value="DBK">DBK - PT Daya Bumindo Karunia</option>
                    <option value="ABN">ABN - PT Andalan Bhumi Nusantara</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Status</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Keterangan / Description</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
                  rows={2}
                  placeholder="Keterangan tarif SOW..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition shadow-sm"
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="primary px-6 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold shadow-md transition"
                >
                  Simpan SOW
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
