import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  UsersRound,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  KeyRound,
  User,
  Shield,
  Eye,
  RefreshCw,
  Sparkles,
  Info,
  Check,
  Building,
  Briefcase,
  Plus
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  createRole,
  updateRolePermissions,
  deleteRole as deleteRoleApi,
  resetUserPassword,
  type Permission,
  type RoleAccess,
  type User as UserType
} from "../lib/api";

export function isSuperAdminRole(role: string | undefined | null): boolean {
  const r = (role ?? "").trim().toLowerCase();
  return r === "super admin" || r === "erp super admin" || r.includes("super admin") || r.includes("superadmin");
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  "Super Admin": { bg: "bg-purple-100 text-purple-900 border-purple-300", text: "text-purple-700", border: "border-purple-300" },
  "Director": { bg: "bg-indigo-100 text-indigo-900 border-indigo-300", text: "text-indigo-700", border: "border-indigo-300" },
  "Direktur": { bg: "bg-indigo-100 text-indigo-900 border-indigo-300", text: "text-indigo-700", border: "border-indigo-300" },
  "Finance Manager": { bg: "bg-blue-100 text-blue-900 border-blue-300", text: "text-blue-700", border: "border-blue-300" },
  "FATB Manager": { bg: "bg-blue-100 text-blue-900 border-blue-300", text: "text-blue-700", border: "border-blue-300" },
  "Manager": { bg: "bg-blue-100 text-blue-900 border-blue-300", text: "text-blue-700", border: "border-blue-300" },
  "SPV Verificator": { bg: "bg-emerald-100 text-emerald-900 border-emerald-300", text: "text-emerald-700", border: "border-emerald-300" },
  "SPV Site": { bg: "bg-emerald-100 text-emerald-900 border-emerald-300", text: "text-emerald-700", border: "border-emerald-300" },
  "SPV": { bg: "bg-emerald-100 text-emerald-900 border-emerald-300", text: "text-emerald-700", border: "border-emerald-300" },
  "Finance Specialist": { bg: "bg-teal-100 text-teal-900 border-teal-300", text: "text-teal-700", border: "border-teal-300" },
  "Admin Finance Site": { bg: "bg-sky-100 text-sky-900 border-sky-300", text: "text-sky-700", border: "border-sky-300" },
  "Admin Finance HO": { bg: "bg-cyan-100 text-cyan-900 border-cyan-300", text: "text-cyan-700", border: "border-cyan-300" },
  "Treasury": { bg: "bg-amber-100 text-amber-900 border-amber-300", text: "text-amber-700", border: "border-amber-300" },
  "Treasury Admin": { bg: "bg-amber-100 text-amber-900 border-amber-300", text: "text-amber-700", border: "border-amber-300" },
  "Account Receivable Officer": { bg: "bg-orange-100 text-orange-900 border-orange-300", text: "text-orange-700", border: "border-orange-300" },
  "AR Admin": { bg: "bg-orange-100 text-orange-900 border-orange-300", text: "text-orange-700", border: "border-orange-300" },
  "Account Payable Officer": { bg: "bg-rose-100 text-rose-900 border-rose-300", text: "text-rose-700", border: "border-rose-300" },
  "Cashier": { bg: "bg-yellow-100 text-yellow-900 border-yellow-300", text: "text-yellow-700", border: "border-yellow-300" },
  "Accounting": { bg: "bg-violet-100 text-violet-900 border-violet-300", text: "text-violet-700", border: "border-violet-300" },
  "Auditor": { bg: "bg-slate-200 text-slate-800 border-slate-300", text: "text-slate-700", border: "border-slate-300" },
};

export function RBACPage({
  user,
  roles,
  myPermissions
}: {
  user: UserType;
  roles: RoleAccess[];
  myPermissions: Permission[];
}) {
  const [activeTab, setActiveTab] = useState<"users" | "matrix" | "simulate">("users");
  const [userList, setUserList] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Admin Finance Site",
    status: "active"
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<UserType | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<string>("Finance Manager");

  // Role list (local, sinkron dengan BE setelah create/update/delete)
  const [roleList, setRoleList] = useState<RoleAccess[]>(roles);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Role editor modal (create / edit permissions)
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<"create" | "edit">("create");
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [roleGrants, setRoleGrants] = useState<string[]>([]);
  const [roleTarget, setRoleTarget] = useState<string | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleAccess | null>(null);

  // Reset password user modal
  const [resetTarget, setResetTarget] = useState<UserType | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetResult, setResetResult] = useState<{ generated: boolean; password: string } | null>(null);

  const modules = Array.from(new Set(roleList.flatMap((role) => role.permissions.map((permission) => permission.module)))).sort();
  const actions = Array.from(new Set(roleList.flatMap((role) => role.permissions.map((permission) => permission.action)))).sort();

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUserList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data pengguna" });
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAllRoles = async () => {
    setLoadingRoles(true);
    try {
      const data = await getRoles();
      setRoleList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data role" });
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    loadAllUsers();
    loadAllRoles();
  }, []);

  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      const matchQuery =
        (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.role || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === "All" || u.role === roleFilter;
      const matchStatus = statusFilter === "All" || u.status === statusFilter;
      return matchQuery && matchRole && matchStatus;
    });
  }, [userList, searchQuery, roleFilter, statusFilter]);

  const allAvailableRoles = useMemo(() => {
    const fromRoles = roleList.map((r) => r.role);
    const defaults = [
      "Super Admin",
      "Director",
      "Finance Manager",
      "FATB Manager",
      "SPV Verificator",
      "Finance Specialist",
      "Admin Finance Site",
      "Admin Finance HO",
      "Treasury",
      "Account Receivable Officer",
      "Account Payable Officer",
      "Accounting",
      "Budget Controller",
      "Tax Officer",
      "Department User",
      "Department Head",
      "General Manager",
      "Auditor"
    ];
    return Array.from(new Set([...fromRoles, ...defaults])).sort();
  }, [roleList]);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "Admin Finance Site",
      status: "active"
    });
    setModalOpen(true);
  };

  const openEditModal = (target: UserType) => {
    setModalMode("edit");
    setSelectedUser(target);
    setFormData({
      name: target.name,
      email: target.email,
      password: "",
      role: target.role,
      status: target.status || "active"
    });
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setFeedback({ type: "error", message: "Nama dan Email wajib diisi!" });
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === "create") {
        await createUser(formData);
        setFeedback({ type: "success", message: `User '${formData.name}' berhasil ditambahkan dengan role '${formData.role}'!` });
      } else if (selectedUser) {
        await updateUser(selectedUser.id, formData);
        setFeedback({ type: "success", message: `Data user '${formData.name}' dan hak akses role berhasil diperbarui!` });
      }
      setModalOpen(false);
      await loadAllUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan data pengguna" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteUser(deleteTarget.id);
      setFeedback({ type: "success", message: `User '${deleteTarget.name}' berhasil dihapus dari sistem.` });
      setDeleteTarget(null);
      await loadAllUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal menghapus user" });
    } finally {
      setSubmitting(false);
    }
  };

  const grantsOf = (access: RoleAccess | undefined) =>
    Array.from(new Set((access?.permissions ?? []).map((p) => `${p.module}:${p.action}`)));

  const isGranted = (module: string, action: string) =>
    roleGrants.includes(`${module}:*`) || roleGrants.includes(`${module}:${action}`);

  const toggleGrant = (module: string, action: string) => {
    const exact = `${module}:${action}`;
    const wildcard = `${module}:*`;
    setRoleGrants((prev) => {
      if (prev.includes(wildcard)) return prev.filter((g) => g !== wildcard);
      if (prev.includes(exact)) return prev.filter((g) => g !== exact);
      return [...prev.filter((g) => g !== exact), exact];
    });
  };

  const toggleModuleAll = (module: string) => {
    const wildcard = `${module}:*`;
    setRoleGrants((prev) =>
      prev.includes(wildcard)
        ? prev.filter((g) => g !== wildcard)
        : [...prev.filter((g) => !g.startsWith(`${module}:`)), wildcard]
    );
  };

  const openCreateRoleModal = () => {
    setRoleModalMode("create");
    setRoleTarget(null);
    setRoleForm({ name: "", description: "" });
    setRoleGrants([]);
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (access: RoleAccess) => {
    setRoleModalMode("edit");
    setRoleTarget(access.role);
    setRoleForm({ name: access.role, description: "" });
    setRoleGrants(grantsOf(access));
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      setFeedback({ type: "error", message: "Nama role wajib diisi!" });
      return;
    }
    setSubmitting(true);
    try {
      if (roleModalMode === "create") {
        await createRole({ name: roleForm.name.trim(), description: roleForm.description, permissions: roleGrants });
        setFeedback({ type: "success", message: `Role '${roleForm.name}' berhasil dibuat dengan ${roleGrants.length} permission.` });
      } else if (roleTarget) {
        await updateRolePermissions(roleTarget, roleGrants);
        setFeedback({ type: "success", message: `Permission role '${roleTarget}' berhasil diperbarui (${roleGrants.length} grants).` });
      }
      setRoleModalOpen(false);
      await loadAllRoles();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan role" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    setSubmitting(true);
    try {
      await deleteRoleApi(deleteRoleTarget.role);
      setFeedback({ type: "success", message: `Role '${deleteRoleTarget.role}' berhasil dihapus.` });
      setDeleteRoleTarget(null);
      await loadAllRoles();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal menghapus role" });
    } finally {
      setSubmitting(false);
    }
  };

  const openResetPasswordModal = (target: UserType) => {
    setResetTarget(target);
    setResetPasswordValue("");
    setResetResult(null);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setSubmitting(true);
    try {
      const res = await resetUserPassword(resetTarget.id, resetPasswordValue || undefined);
      if (res.temporaryPassword) {
        setResetResult({ generated: true, password: res.temporaryPassword });
      } else {
        setResetResult({ generated: false, password: resetPasswordValue });
      }
      setFeedback({ type: "success", message: `Password user '${resetTarget.name}' berhasil direset.` });
      await loadAllUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal reset password" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoleAccess = useMemo(() => {
    return roleList.find((r) => r.role === formData.role) || { role: formData.role, permissions: [], scopes: ["company", "site"] };
  }, [roleList, formData.role]);

  const simulatedRoleAccess = useMemo(() => {
    return roleList.find((r) => r.role === simulatedRole) || { role: simulatedRole, permissions: [], scopes: ["company", "site"] };
  }, [roleList, simulatedRole]);

  if (!isSuperAdminRole(user.role)) {
    return (
      <section className="p-6 max-w-3xl mx-auto space-y-4">
        <PageHeader title="Access Denied" description="Menu User & RBAC Management hanya tersedia untuk Super Admin." />
        <div className="p-4 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 flex items-center gap-2.5 text-sm font-semibold">
          <Lock size={18} className="text-rose-600" />
          Role Anda saat ini: <strong>{user.role || "unknown"}</strong>. Hubungi Super Admin untuk meminta akses.
        </div>
      </section>
    );
  }

  return (
    <section className="rbac-page p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="User & RBAC Management"
        description="Kelola akun pengguna, penugasan role akses, izin operasional finance, dan matriks permission sistem."
        meta={
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck size={14} className="text-purple-700" /> Super Admin Access
            </span>
          </div>
        }
      />

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 shadow-md border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            {feedback.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/5 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Highlights */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UsersRound size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pengguna</p>
            <h3 className="text-2xl font-black text-slate-900">{userList.length} User</h3>
          </div>
        </article>

        <article className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Aktif</p>
            <h3 className="text-2xl font-black text-slate-900">{userList.filter((u) => u.status === "active").length} Aktif</h3>
          </div>
        </article>

        <article className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Katalog Role</p>
            <h3 className="text-2xl font-black text-slate-900">{allAvailableRoles.length} Role</h3>
          </div>
        </article>

        <article className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modul Terproteksi</p>
            <h3 className="text-2xl font-black text-slate-900">{modules.length} Modul</h3>
          </div>
        </article>
      </section>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === "users"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UsersRound size={17} /> Manajemen Pengguna & Akun ({userList.length})
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === "matrix"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck size={17} /> Role & Permission Matrix
        </button>
        <button
          onClick={() => setActiveTab("simulate")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === "simulate"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles size={17} /> Simulasi Hak Akses Role
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari user (nama, email, role)..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden bg-white text-slate-700 font-medium"
              >
                <option value="All">Semua Role</option>
                {allAvailableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden bg-white text-slate-700 font-medium"
              >
                <option value="All">Semua Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="locked">Locked</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={loadAllUsers}
                disabled={loadingUsers}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                title="Refresh data"
              >
                <RefreshCw size={17} className={loadingUsers ? "animate-spin" : ""} />
              </button>

              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition"
              >
                <UserPlus size={16} /> Tambah Pengguna Baru
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs uppercase font-extrabold text-slate-500 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Pengguna</th>
                    <th className="py-3.5 px-4">Role Akses</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Login Terakhir</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tidak ada data pengguna yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const color = roleColors[u.role] || {
                        bg: "bg-slate-100 text-slate-800 border-slate-300",
                        text: "text-slate-700"
                      };
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                                {u.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-snug">{u.name}</p>
                                <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border inline-flex items-center gap-1 shadow-2xs ${color.bg}`}>
                              <Shield size={12} className={color.text} />
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.status === "active" ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
                              </span>
                            ) : u.status === "locked" ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1.5">
                                <Lock size={12} className="text-rose-600" /> Terkunci
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5">
                                Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("id-ID") : "Belum pernah login"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(u)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 font-bold text-xs inline-flex items-center gap-1 transition shadow-2xs"
                                title="Ubah Role & Data User"
                              >
                                <Edit2 size={13} /> Edit Role
                              </button>
                              <button
                                onClick={() => openResetPasswordModal(u)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-amber-700 font-bold text-xs inline-flex items-center gap-1 transition shadow-2xs"
                                title="Reset password user"
                              >
                                <KeyRound size={13} /> Reset Password
                              </button>
                              {u.id !== 1 && (
                                <button
                                  onClick={() => setDeleteTarget(u)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 transition shadow-2xs"
                                  title="Hapus User"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE & PERMISSION MATRIX */}
      {activeTab === "matrix" && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
              <p className="font-medium">
                Kelola permission per role langsung dari matriks. Role <strong>Super Admin</strong> terkunci dan tidak dapat diubah/dihapus.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAllRoles}
                disabled={loadingRoles}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                title="Refresh data role"
              >
                <RefreshCw size={17} className={loadingRoles ? "animate-spin" : ""} />
              </button>
              <button
                onClick={openCreateRoleModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition"
              >
                <Plus size={16} /> Buat Role Baru
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleList.map((role) => {
              const color = roleColors[role.role] || {
                bg: "bg-slate-100 text-slate-900 border-slate-200",
                text: "text-slate-700"
              };
              const locked = isSuperAdminRole(role.role);
              return (
                <article key={role.role} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <header className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black border inline-flex items-center gap-1.5 ${color.bg}`}>
                        {locked ? <Lock size={12} className={color.text} /> : <Shield size={12} className={color.text} />}
                        {role.role}
                      </span>
                      <span className="text-xs font-extrabold text-slate-500 font-mono">
                        {role.permissions.length} Hak Akses
                      </span>
                    </header>
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                      Scope: <span className="font-semibold text-slate-700">{role.scopes.join(", ")}</span>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {role.permissions.slice(0, 10).map((p) => (
                        <span
                          key={`${role.role}-${p.module}-${p.action}`}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded-md"
                        >
                          {p.module}:{p.action}
                        </span>
                      ))}
                      {role.permissions.length > 10 && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">
                          +{role.permissions.length - 10} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                  <footer className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-slate-100">
                    {locked ? (
                      <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1">
                        <Lock size={12} /> Terkunci (Super Admin)
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => openEditRoleModal(role)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 font-bold text-xs inline-flex items-center gap-1 transition shadow-2xs"
                          title="Ubah permission role"
                        >
                          <Edit2 size={13} /> Edit Permission
                        </button>
                        <button
                          onClick={() => setDeleteRoleTarget(role)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 transition shadow-2xs"
                          title="Hapus role"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>

          {/* Full Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Full Permission Matrix</h3>
                <p className="text-xs text-slate-500">Pemetaan seluruh modul terhadap tindakan operasional yang diizinkan</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                {modules.length} Modul Terdefinisi
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-bold text-slate-900">Modul</th>
                    {actions.map((action) => (
                      <th key={action} className="py-3 px-3 text-center">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {modules.map((module) => (
                    <tr key={module} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900 font-mono">{module}</td>
                      {actions.map((action) => {
                        const hasGrant = roleList.some((role) =>
                          role.permissions.some((p) => p.module === module && (p.action === action || p.action === "*"))
                        );
                        return (
                          <td key={`${module}-${action}`} className="py-2.5 px-3 text-center">
                            {hasGrant ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md inline-flex items-center gap-1">
                                <Check size={12} /> Diizinkan
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: SIMULASI HAK AKSES */}
      {activeTab === "simulate" && (
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Sparkles size={20} className="text-blue-600" /> Simulasi Hak Akses Role
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih salah satu role untuk menginspeksi menu dan tindakan apa saja yang dapat diakses oleh user dengan role tersebut.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Pilih Role:</label>
              <select
                value={simulatedRole}
                onChange={(e) => setSimulatedRole(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden"
              >
                {allAvailableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BA Tracker Actions */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-600" /> Berita Acara (BA) Tracker
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Lihat BA Tracker</span>
                  <span className="font-bold text-emerald-600">✓ Ya</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Buat & Edit BA</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "ba_tracker" && (p.action === "write" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Verifikasi BA (SPV)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "ba_tracker" && (p.action === "verify" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Approve BA (Manager)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "ba_tracker" && (p.action === "approve" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
              </ul>
            </div>

            {/* Invoice Actions */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building size={16} className="text-indigo-600" /> Invoice Management (AR)
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Buat Draft Tagihan</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "invoice" && (p.action === "write" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Verifikasi Faktur (SPV)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "invoice" && (p.action === "verify" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Approval Tier 1 (Manager)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "invoice" && (p.action === "approve_tier1" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Approval Tier 2 (Direktur)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "invoice" && (p.action === "approve_tier2" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
              </ul>
            </div>

            {/* Payment & Master Data */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-purple-600" /> Payment & Master Data
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Catat Cicilan Pembayaran</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "payment" && (p.action === "write" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Verifikasi Transfer Bank</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "payment" && (p.action === "verify" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>Kelola Master Data & SOW</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "master_data" && (p.action === "write" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 font-medium">
                  <span>User & RBAC Management</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "user_management" && (p.action === "manage" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-emerald-600">✓ Super Admin</span>
                  ) : (
                    <span className="font-bold text-rose-500">✕ Terkunci</span>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* MODAL: TAMBAH / EDIT USER */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                {modalMode === "create" ? <UserPlus size={20} className="text-blue-600" /> : <Edit2 size={20} className="text-blue-600" />}
                {modalMode === "create" ? "Tambah Pengguna Baru" : "Edit Pengguna & Role Akses"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 mt-4 text-sm font-medium">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Hendra Wijaya"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Perusahaan *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Contoh: hendra.wijaya@financeerp.local"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password {modalMode === "edit" ? "(Kosongkan jika tidak diubah)" : "*"}
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={modalMode === "edit" ? "••••••••" : "Default: Admin@12345"}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Penugasan *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-xs"
                  >
                    {allAvailableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-xs"
                  >
                    <option value="active">Active (Aktif)</option>
                    <option value="inactive">Inactive (Nonaktif)</option>
                    <option value="locked">Locked (Terkunci)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Permissions Preview Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-blue-600" /> Hak Akses Role: {formData.role}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{selectedRoleAccess.permissions.length} grants</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {selectedRoleAccess.permissions.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Hak akses default profil ini aktif.</span>
                  ) : (
                    selectedRoleAccess.permissions.map((p) => (
                      <span key={`${p.module}-${p.action}`} className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-mono font-bold rounded-md border border-slate-200">
                        {p.module}:{p.action}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  {modalMode === "create" ? "Simpan Pengguna" : "Update Pengguna & Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">Konfirmasi Hapus Pengguna</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus akun <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? Aksi ini akan dicatat ke audit log.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Ya, Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BUAT / EDIT ROLE & PERMISSION */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                {roleModalMode === "create" ? <Plus size={20} className="text-blue-600" /> : <ShieldCheck size={20} className="text-blue-600" />}
                {roleModalMode === "create" ? "Buat Role Baru" : `Edit Permission: ${roleTarget}`}
              </h3>
              <button onClick={() => setRoleModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 mt-4 text-sm font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Role *</label>
                  <input
                    type="text"
                    required
                    disabled={roleModalMode === "edit"}
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="Contoh: Procurement Officer"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
                  <input
                    type="text"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    placeholder="Tujuan role ini (opsional)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-blue-600" /> Permission Matrix
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">{roleGrants.length} grants dipilih</span>
                </div>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white sticky top-0 shadow-sm">
                      <tr className="text-slate-500 uppercase font-extrabold border-b border-slate-200">
                        <th className="py-2 px-4">Modul</th>
                        {actions.map((action) => (
                          <th key={action} className="py-2 px-2 text-center">{action}</th>
                        ))}
                        <th className="py-2 px-2 text-center text-blue-600">Semua</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modules.map((module) => (
                        <tr key={module} className="hover:bg-slate-50/60">
                          <td className="py-2 px-4 font-bold text-slate-900 font-mono">{module}</td>
                          {actions.map((action) => (
                            <td key={`${module}-${action}`} className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={isGranted(module, action)}
                                onChange={() => toggleGrant(module, action)}
                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                              />
                            </td>
                          ))}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={roleGrants.includes(`${module}:*`)}
                              onChange={() => toggleModuleAll(module)}
                              title={`Izinkan semua aksi pada modul ${module}`}
                              className="w-4 h-4 accent-blue-600 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                      {modules.length === 0 && (
                        <tr>
                          <td colSpan={actions.length + 2} className="py-6 text-center text-slate-400">
                            Katalog permission belum tersedia.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  {roleModalMode === "create" ? "Simpan Role Baru" : "Update Permission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS ROLE */}
      {deleteRoleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">Konfirmasi Hapus Role</h3>
              <p className="text-xs text-slate-500">
                Role <strong>{deleteRoleTarget.role}</strong> dengan {deleteRoleTarget.permissions.length} hak akses akan dihapus permanen.
                Role yang masih digunakan user tidak dapat dihapus.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteRoleTarget(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteRole}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Ya, Hapus Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD USER */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <KeyRound size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">Reset Password</h3>
              <p className="text-xs text-slate-500">
                Atur password baru untuk <strong>{resetTarget.name}</strong> ({resetTarget.email}).
                Kosongkan agar sistem membuat password sementara otomatis.
              </p>
            </div>

            {resetResult ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                  {resetResult.generated ? (
                    <>
                      Password sementara berhasil dibuat. Berikan ke user:
                      <div className="mt-2 px-3 py-2 bg-white rounded-lg font-mono font-black text-base tracking-wider text-emerald-800 select-all border border-emerald-200">
                        {resetResult.password}
                      </div>
                    </>
                  ) : (
                    <>Password user telah diubah sesuai input admin.</>
                  )}
                </div>
                <button
                  onClick={() => setResetTarget(null)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru (opsional)</label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      placeholder="Minimal 8 karakter, kosongkan untuk auto-generate"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setResetTarget(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={submitting}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                    Reset Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
