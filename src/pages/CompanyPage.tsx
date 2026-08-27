import { useState, useEffect, useMemo } from "react";
import { Building, Plus, Edit2, Trash2, X, RefreshCw, Search, Check } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { getCompanies, createCompany, updateCompany, deleteCompany, type Company } from "../lib/api";
import { authorized } from "../lib/auth";
import type { User } from "../lib/api";

export function CompanyPage({
  viewTitle,
  query,
  onNotice,
  user
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
  user: User;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ code: "", name: "", isHo: false });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data perusahaan" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCompanies(); }, []);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 4500);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const filtered = useMemo(() => {
    return companies.filter((c) =>
      !query ||
      c.code.toLowerCase().includes(query.toLowerCase()) ||
      c.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [companies, query]);

  const openCreate = () => {
    setModalMode("create");
    setEditTarget(null);
    setFormData({ code: "", name: "", isHo: false });
    setModalOpen(true);
  };

  const openEdit = (c: Company) => {
    setModalMode("edit");
    setEditTarget(c);
    setFormData({ code: c.code, name: c.name, isHo: c.isHo });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      if (modalMode === "create") {
        await createCompany(formData);
        onNotice("Perusahaan berhasil dibuat");
      } else if (editTarget) {
        await updateCompany(editTarget.id, formData);
        onNotice("Perusahaan berhasil diupdate");
      }
      setModalOpen(false);
      await loadCompanies();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan perusahaan" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteCompany(deleteTarget.id);
      setDeleteTarget(null);
      onNotice("Perusahaan berhasil dihapus");
      await loadCompanies();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal menghapus perusahaan" });
    } finally {
      setSubmitting(false);
    }
  };

  const canWrite = authorized(user, "master_data", "write");

  return (
    <section className="space-y-4">
      <PageHeader title={viewTitle} description="Master data perusahaan dan entity legal" />

      {feedback && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-bold ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {feedback.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{filtered.length} perusahaan ditemukan</p>
        {canWrite && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
            <Plus size={16} /> Tambah Perusahaan
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-slate-700">Code</th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">Nama Perusahaan</th>
              <th className="px-4 py-3 text-center font-bold text-slate-700">Head Office</th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">Dibuat</th>
              {canWrite && <th className="px-4 py-3 text-center font-bold text-slate-700">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada data perusahaan</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-blue-700">{c.code}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-2.5 text-center">
                  {c.isHo ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">HO</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">Site</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString("id-ID") : "-"}
                </td>
                {canWrite && (
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition" title="Hapus">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Building size={20} className="text-blue-600" />
                {modalMode === "create" ? "Tambah Perusahaan Baru" : "Edit Perusahaan"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Code *</label>
                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="Contoh: BGG" className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Perusahaan *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: PT Budi Gema Gempita" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.isHo} onChange={(e) => setFormData({ ...formData, isHo: e.target.checked })} className="rounded" />
                <label className="text-xs font-bold text-slate-700">Head Office (HO)</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition">Batal</button>
              <button onClick={handleSave} disabled={submitting || !formData.code || !formData.name} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-2">
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                {modalMode === "create" ? "Buat Perusahaan" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto"><Trash2 size={24} /></div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">Hapus Perusahaan?</h3>
              <p className="text-xs text-slate-500">
                <strong className="font-mono text-rose-600">{deleteTarget.code}</strong> ({deleteTarget.name}) akan dihapus permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition">Batal</button>
              <button onClick={handleDelete} disabled={submitting} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50">
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
