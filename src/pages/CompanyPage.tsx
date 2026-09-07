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

  const [modalError, setModalError] = useState<string | null>(null);

  const openCreate = () => {
    setModalMode("create");
    setEditTarget(null);
    setModalError(null);
    setFormData({ code: "", name: "", isHo: false });
    setModalOpen(true);
  };

  const openEdit = (c: Company) => {
    setModalMode("edit");
    setEditTarget(c);
    setModalError(null);
    setFormData({ code: c.code, name: c.name, isHo: c.isHo });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSubmitting(true);
    setModalError(null);
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
      setModalError(err?.message || "Gagal menyimpan perusahaan");
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
        <p className="text-xs text-slate-500 font-medium">{filtered.length} perusahaan ditemukan</p>
        {canWrite && (
          <button onClick={openCreate} className="px-3.5 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white rounded-[3px] text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer">
            <Plus size={14} /> Tambah Perusahaan
          </button>
        )}
      </div>

      <div className="rounded-[4px] border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3.5 py-2.5 text-left font-black text-slate-700 uppercase tracking-wider text-[10.5px]">Code</th>
              <th className="px-3.5 py-2.5 text-left font-black text-slate-700 uppercase tracking-wider text-[10.5px]">Nama Perusahaan</th>
              <th className="px-3.5 py-2.5 text-center font-black text-slate-700 uppercase tracking-wider text-[10.5px]">Head Office</th>
              <th className="px-3.5 py-2.5 text-left font-black text-slate-700 uppercase tracking-wider text-[10.5px]">Dibuat</th>
              {canWrite && <th className="px-3.5 py-2.5 text-center font-black text-slate-700 uppercase tracking-wider text-[10.5px]">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada data perusahaan</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                <td className="px-3.5 py-2 font-mono text-xs font-bold text-[#A57C50]">{c.code}</td>
                <td className="px-3.5 py-2 font-medium text-slate-900">{c.name}</td>
                <td className="px-3.5 py-2 text-center">
                  {c.isHo ? (
                    <span className="px-2 py-0.5 rounded-[3px] bg-[#A57C50]/15 text-[#A57C50] border border-[#A57C50]/30 text-[10.5px] font-bold">HO</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-500 border border-slate-200 text-[10.5px] font-bold">Site</span>
                  )}
                </td>
                <td className="px-3.5 py-2 text-xs text-slate-500">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString("id-ID") : "-"}
                </td>
                {canWrite && (
                  <td className="px-3.5 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1 hover:bg-[#A57C50]/10 rounded-[3px] text-[#A57C50] transition cursor-pointer" title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1 hover:bg-rose-100 rounded-[3px] text-rose-600 transition cursor-pointer" title="Hapus">
                        <Trash2 size={13} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building size={18} className="text-[#A57C50]" />
                {modalMode === "create" ? "Tambah Perusahaan Baru" : "Edit Perusahaan"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-[3px] text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Code *</label>
                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="Contoh: BGG" className="w-full px-3 py-2 border border-slate-300 rounded-[3px] font-mono text-xs focus:outline-hidden focus:border-[#A57C50]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Perusahaan *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: PT Budi Gema Gempita" className="w-full px-3 py-2 border border-slate-300 rounded-[3px] text-xs focus:outline-hidden focus:border-[#A57C50]" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" checked={formData.isHo} onChange={(e) => setFormData({ ...formData, isHo: e.target.checked })} className="rounded-[2px] accent-[#A57C50]" />
                <label className="text-xs font-bold text-slate-700">Head Office (HO)</label>
              </div>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-[3px] flex items-center justify-between text-xs font-bold">
                <span>{modalError}</span>
                <button type="button" onClick={() => setModalError(null)} className="p-0.5 hover:bg-rose-100 rounded-[3px]">
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-[3px] text-xs font-bold text-slate-700 transition cursor-pointer">Batal</button>
              <button onClick={handleSave} disabled={submitting || !formData.code || !formData.name} className="px-4 py-1.5 bg-[#A57C50] hover:bg-[#8e6941] text-white rounded-[3px] text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                {modalMode === "create" ? "Buat Perusahaan" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-10 h-10 rounded-[3px] bg-rose-100 text-rose-600 flex items-center justify-center mx-auto"><Trash2 size={20} /></div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Hapus Perusahaan?</h3>
              <p className="text-xs text-slate-500">
                <strong className="font-mono text-rose-600">{deleteTarget.code}</strong> ({deleteTarget.name}) akan dihapus permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-[3px] text-xs font-bold text-slate-700 transition cursor-pointer">Batal</button>
              <button onClick={handleDelete} disabled={submitting} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[3px] text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer">
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
