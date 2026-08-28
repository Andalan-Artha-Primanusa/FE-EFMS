import { useState, useEffect, useMemo } from "react";
import { Building2, Plus, Edit2, Trash2, X, RefreshCw, Search, Check } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  getOrgUnits,
  createOrgUnit,
  updateOrgUnit,
  deleteOrgUnit,
  getCompanies,
  ORG_UNIT_TYPES,
  type OrgUnit,
  type Company
} from "../lib/api";
import { authorized } from "../lib/auth";
import type { User } from "../lib/api";

const TYPE_LABEL: Record<string, string> = {
  business_unit: "Business Unit",
  branch: "Branch",
  site: "Site",
  department: "Department",
  division: "Division",
  cost_center: "Cost Center",
  profit_center: "Profit Center",
  project: "Project"
};

const TYPE_COLOR: Record<string, string> = {
  business_unit: "bg-violet-100 text-violet-700",
  branch: "bg-sky-100 text-sky-700",
  site: "bg-emerald-100 text-emerald-700",
  department: "bg-amber-100 text-amber-700",
  division: "bg-indigo-100 text-indigo-700",
  cost_center: "bg-cyan-100 text-cyan-700",
  profit_center: "bg-pink-100 text-pink-700",
  project: "bg-blue-100 text-blue-700"
};

export function OrgUnitsPage({
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
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<OrgUnit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgUnit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formData, setFormData] = useState({
    type: "site",
    companyId: 0,
    code: "",
    name: "",
    parentId: "",
    status: "active"
  });

  const loadUnits = async () => {
    setLoading(true);
    try {
      const data = await getOrgUnits({ type: typeFilter || undefined, withCompany: 1 as any });
      setUnits(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data org unit" });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
      setFormData((f) => (f.companyId || data.length ? f : { ...f, companyId: data[0]?.id ?? 0 }));
    } catch {
      setCompanies([]);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadUnits();
  }, [typeFilter]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 4500);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const filtered = useMemo(() => {
    return units.filter((u) =>
      !query ||
      u.code.toLowerCase().includes(query.toLowerCase()) ||
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      (u.type || "").toLowerCase().includes(query.toLowerCase())
    );
  }, [units, query]);

  const companyName = (id: number) => companies.find((c) => c.id === id)?.name ?? "—";

  const openCreate = () => {
    setModalMode("create");
    setEditTarget(null);
    setFormData({ type: "site", companyId: companies[0]?.id ?? 0, code: "", name: "", parentId: "", status: "active" });
    setModalOpen(true);
  };

  const openEdit = (u: OrgUnit) => {
    setModalMode("edit");
    setEditTarget(u);
    setFormData({
      type: u.type,
      companyId: u.companyId,
      code: u.code,
      name: u.name,
      parentId: u.parentId ? String(u.parentId) : "",
      status: u.status
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const payload = {
        type: formData.type,
        companyId: formData.companyId,
        code: formData.code.toUpperCase(),
        name: formData.name,
        parentId: formData.parentId ? Number(formData.parentId) : null,
        status: formData.status
      };
      if (modalMode === "create") {
        await createOrgUnit(payload);
        onNotice("Org unit berhasil dibuat");
      } else if (editTarget) {
        await updateOrgUnit(editTarget.id, payload);
        onNotice("Org unit berhasil diupdate");
      }
      setModalOpen(false);
      await loadUnits();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan org unit" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteOrgUnit(deleteTarget.id);
      setDeleteTarget(null);
      onNotice("Org unit berhasil dihapus");
      await loadUnits();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal menghapus org unit" });
    } finally {
      setSubmitting(false);
    }
  };

  const canWrite = authorized(user, "master_data", "write");

  return (
    <section className="space-y-4">
      <PageHeader title={viewTitle} description="Master data organizational units: sites, department, project, cost center, dll." />

      {feedback && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-bold ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {feedback.message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query ?? ""}
              readOnly
              placeholder="Cari..."
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden w-56"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="">Semua Tipe</option>
            {ORG_UNIT_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>
            ))}
          </select>
        </div>
        <p className="text-sm text-slate-500">{filtered.length} org unit ditemukan</p>
        {canWrite && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
            <Plus size={16} /> Tambah Org Unit
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-slate-700">Tipe</th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">Code</th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">Nama</th>
              <th className="px-4 py-3 text-left font-bold text-slate-700">Perusahaan</th>
              <th className="px-4 py-3 text-center font-bold text-slate-700">Status</th>
              {canWrite && <th className="px-4 py-3 text-center font-bold text-slate-700">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Tidak ada data org unit</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${TYPE_COLOR[u.type] ?? "bg-slate-100 text-slate-600"}`}>
                    {TYPE_LABEL[u.type] ?? u.type}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-blue-700">{u.code}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{u.name}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">
                  {u.companyCode ? (
                    <span className="font-mono font-bold text-slate-700">{u.companyCode}</span>
                  ) : (
                    companies.find((c) => c.id === u.companyId)?.name ?? `#${u.companyId}`
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${u.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                {canWrite && (
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(u)} className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition" title="Hapus">
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
                <Building2 size={20} className="text-blue-600" />
                {modalMode === "create" ? "Tambah Org Unit Baru" : "Edit Org Unit"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Org Unit *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  {ORG_UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Perusahaan *</label>
                <select
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  {companies.length === 0 && <option value={0}>Perusahaan belum tersedia</option>}
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Code *</label>
                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="Contoh: JKT / FIN-AP / CC-MINING" className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: Site Jakarta" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parent ID</label>
                  <input type="number" value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })} placeholder="Opsional" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition">Batal</button>
              <button onClick={handleSave} disabled={submitting || !formData.code || !formData.name || !formData.companyId} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-2">
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                {modalMode === "create" ? "Buat Org Unit" : "Simpan"}
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
              <h3 className="font-bold text-slate-900 text-lg">Hapus Org Unit?</h3>
              <p className="text-xs text-slate-500">
                <strong className="font-mono text-rose-600">{deleteTarget.code}</strong> ({TYPE_LABEL[deleteTarget.type] ?? deleteTarget.type}) akan dihapus permanen.
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
