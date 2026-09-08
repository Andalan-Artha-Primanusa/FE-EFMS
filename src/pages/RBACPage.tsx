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
  Building2,
  MapPin,
  RotateCcw,
  Briefcase,
  Plus,
  Hash,
  Layers,
  Receipt,
  DollarSign,
  FileCheck
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
  getCompanies,
  DEFAULT_COMPANIES,
  getTCodes,
  createTCode,
  updateTCode,
  deleteTCode,
  type Permission,
  type RoleAccess,
  type TCode,
  type User as UserType,
  type Company
} from "../lib/api";
import { authorized, companyOptionsForUser, isHeadOfficeUser, loadCompanies as loadAuthCompanies, roleScopeOf, rolesAssignableBy, userScopeType } from "../lib/auth";

export function isSuperAdminRole(role: string | undefined | null): boolean {
  const r = (role ?? "").trim().toLowerCase();
  return r === "super admin" || r === "erp super admin" || r.includes("super admin") || r.includes("superadmin");
}

// Standard Default Preset Grants per Official Role
const OFFICIAL_ROLE_DEFAULT_GRANTS: Record<string, string[]> = {
  "Super Admin": [
    "master_data:*", "budget:*", "transaction_request:*", "approval:*",
    "operational_transaction:*", "ba_tracker:*", "invoice:*", "payment:*",
    "accounting:*", "reconciliation:*", "period_closing:*", "financial_report:*",
    "management_dashboard:*", "user_management:*", "audit_trail:*", "treasury:*"
  ],
  "FATB Manager": [
    "master_data:*", "budget:*", "transaction_request:read", "approval:act",
    "operational_transaction:read", "ba_tracker:read", "ba_tracker:write", "ba_tracker:verify", "ba_tracker:approve",
    "invoice:read", "invoice:write", "invoice:verify", "invoice:approve_tier1",
    "payment:read", "payment:write", "payment:verify",
    "accounting:read", "accounting:generate", "accounting:approve", "accounting:post",
    "reconciliation:run", "period_closing:review", "period_closing:close",
    "financial_report:read", "management_dashboard:read", "audit_trail:read", "treasury:*"
  ],
  "Finance Superintendent": [
    "master_data:*", "budget:read", "budget:approve", "transaction_request:read", "approval:act",
    "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write", "ba_tracker:verify",
    "invoice:read", "invoice:write", "invoice:verify",
    "payment:read", "payment:write", "payment:verify",
    "accounting:read", "accounting:generate", "reconciliation:run",
    "period_closing:review", "financial_report:read", "management_dashboard:read", "treasury:read"
  ],
  "Finance Specialist (SPV)": [
    "master_data:read", "budget:read", "transaction_request:read",
    "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write", "ba_tracker:verify",
    "invoice:read", "invoice:write", "invoice:verify",
    "payment:read", "payment:write", "payment:verify",
    "accounting:read", "accounting:generate", "reconciliation:run",
    "financial_report:read"
  ],
  "Finance Specialist": [
    "master_data:read", "budget:read", "transaction_request:read",
    "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write", "ba_tracker:verify",
    "invoice:read", "invoice:write", "invoice:verify",
    "payment:read", "payment:write", "payment:verify",
    "accounting:read", "accounting:generate", "reconciliation:run",
    "financial_report:read"
  ],
  "Foreman Finance": [
    "master_data:read", "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write"
  ],
  "Foreman": [
    "master_data:read", "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write"
  ],
  "Admin Finance": [
    "master_data:read", "master_data:write", "budget:read", "transaction_request:read", "transaction_request:submit",
    "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write",
    "invoice:read", "invoice:write",
    "payment:read", "payment:write",
    "accounting:read", "accounting:generate", "reconciliation:run",
    "financial_report:read", "treasury:read"
  ],
  "Admin Finance HO": [
    "master_data:read", "master_data:write", "budget:read", "transaction_request:read", "transaction_request:submit",
    "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write",
    "invoice:read", "invoice:write",
    "payment:read", "payment:write",
    "accounting:read", "accounting:generate", "reconciliation:run",
    "financial_report:read", "treasury:read"
  ],
  "Finance Admin": [
    "master_data:read", "master_data:write", "budget:read", "transaction_request:read", "transaction_request:submit",
    "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write",
    "invoice:read", "invoice:write",
    "payment:read", "payment:write",
    "accounting:read", "accounting:generate", "reconciliation:run",
    "financial_report:read", "treasury:read"
  ],
  "Finance Intern": [
    "master_data:read", "operational_transaction:read",
    "ba_tracker:read", "invoice:read", "payment:read", "financial_report:read"
  ],
  "Admin Finance Site": [
    "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write", "invoice:read", "invoice:write", "payment:read"
  ],
  "Admin Finance Site BGG": [
    "raise_fall:read", "raise_fall:write", "raise_fall:delete", "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write", "invoice:read", "invoice:write", "payment:read"
  ],
  "Admin Finance Site POS": [
    "raise_fall:read", "raise_fall:write", "raise_fall:delete", "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write", "invoice:read", "invoice:write", "payment:read"
  ],
  "Admin Finance Site SBS": [
    "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write", "invoice:read", "invoice:write", "payment:read"
  ],
  "Admin Finance Site PTRO": [
    "operational_transaction:read", "operational_transaction:write",
    "ba_tracker:read", "ba_tracker:write", "invoice:read", "invoice:write", "payment:read"
  ]
};

// Official Role Catalog metadata
export const OFFICIAL_ROLES_METADATA: Array<{
  role: string;
  category: "Super Admin" | "Head Office" | "Site Entity";
  description: string;
  scopeLabel: string;
  scopes: string[];
  isSystem?: boolean;
}> = [
  {
    role: "Super Admin",
    category: "Super Admin",
    description: "Akses penuh tanpa batas ke seluruh modul, konfigurasi keamanan, dan penugasan RBAC.",
    scopeLabel: "Global Enterprise (All Sites)",
    scopes: ["all"],
    isSystem: true
  },
  {
    role: "FATB Manager",
    category: "Head Office",
    description: "Finance, Accounting, Tax, & Budget Manager. Approval Tier 1, lock period, review finansial & budget.",
    scopeLabel: "Head Office (Global Consolidated)",
    scopes: ["company", "site", "department", "project"]
  },
  {
    role: "Finance Superintendent",
    category: "Head Office",
    description: "Superintendent Keuangan & Kontrol. Verifikasi invoice, BA, payment, treasury, & review GL.",
    scopeLabel: "Head Office (Global Consolidated)",
    scopes: ["company", "site", "department", "project"]
  },
  {
    role: "Finance Specialist (SPV)",
    category: "Head Office",
    description: "Specialist / SPV Verifikator Keuangan. Verifikasi Berita Acara (BA), draft invoice, & bukti pembayaran.",
    scopeLabel: "Head Office (Global Consolidated)",
    scopes: ["company", "site", "department"]
  },
  {
    role: "Foreman Finance",
    category: "Head Office",
    description: "Foreman / Pengawas Keuangan Operasional. Pencatatan transaksi operasional & input Berita Acara (BA).",
    scopeLabel: "Head Office (Global Consolidated)",
    scopes: ["site", "department"]
  },
  {
    role: "Admin Finance",
    category: "Head Office",
    description: "Administrator Keuangan Kantor Pusat. Master data, draft invoice/BA, penerimaan kas, & rekonsiliasi.",
    scopeLabel: "Head Office (Global Consolidated)",
    scopes: ["company", "site", "department"]
  },
  {
    role: "Finance Intern",
    category: "Head Office",
    description: "Magang Keuangan (View Only). Akses monitoring laporan keuangan, invoice, BA, dan transaksi.",
    scopeLabel: "Head Office (Global Consolidated)",
    scopes: ["site", "department"]
  },
  {
    role: "Admin Finance Site BGG",
    category: "Site Entity",
    description: "Administrator Keuangan Site PT Budi Gema Gempita. Transaksi operasional, BA, & invoice site BGG.",
    scopeLabel: "Restricted Site BGG",
    scopes: ["site BGG"]
  },
  {
    role: "Admin Finance Site POS",
    category: "Site Entity",
    description: "Administrator Keuangan Site PT Position. Transaksi operasional, BA, & invoice site POS.",
    scopeLabel: "Restricted Site POS",
    scopes: ["site POS"]
  },
  {
    role: "Admin Finance Site SBS",
    category: "Site Entity",
    description: "Administrator Keuangan Site PT Satria Bahana Sarana. Transaksi operasional, BA, & invoice site SBS.",
    scopeLabel: "Restricted Site SBS",
    scopes: ["site SBS"]
  },
  {
    role: "Admin Finance Site PTRO",
    category: "Site Entity",
    description: "Administrator Keuangan Site PT Petrosea. Transaksi operasional, BA, & invoice site PTRO.",
    scopeLabel: "Restricted Site PTRO",
    scopes: ["site PTRO"]
  },
  {
    role: "Admin Finance Site",
    category: "Site Entity",
    description: "Administrator Keuangan Site Umum. Pengelolaan transaksi operasional, BA, & invoice di site penugasan.",
    scopeLabel: "Restricted Site",
    scopes: ["site"]
  }
];

// Full system master permissions catalog
const ALL_SYSTEM_PERMISSIONS: Array<{ module: string; action: string; description: string }> = [
  { module: "master_data", action: "read", description: "Melihat master data COA, customer, vendor, parameter site" },
  { module: "master_data", action: "write", description: "Membuat dan mengupdate data master" },
  { module: "master_data", action: "delete", description: "Menghapus data master" },
  { module: "raise_fall", action: "read", description: "Melihat parameter indeks dan eskalasi Raise & Fall" },
  { module: "raise_fall", action: "write", description: "Membuat dan mengupdate formula & indeks Raise & Fall" },
  { module: "raise_fall", action: "delete", description: "Menghapus rekam kalkulasi Raise & Fall" },
  { module: "budget", action: "read", description: "Melihat perencanaan dan monitoring budget" },
  { module: "budget", action: "submit", description: "Mengajukan draft budget tahunan/bulanan" },
  { module: "budget", action: "approve", description: "Menyetujui pengajuan budget" },
  { module: "budget", action: "lock", description: "Melakukan lock dan publish budget resmi" },
  { module: "transaction_request", action: "read", description: "Melihat pengajuan transaksi dan reimbursement" },
  { module: "transaction_request", action: "submit", description: "Membuat pengajuan transaksi baru" },
  { module: "approval", action: "act", description: "Melakukan approval, rejection, atau hold transaksi" },
  { module: "operational_transaction", action: "read", description: "Melihat transaksi operasional harian" },
  { module: "operational_transaction", action: "write", description: "Mencatat transaksi operasional lapangan" },
  { module: "ba_tracker", action: "read", description: "Melihat daftar Berita Acara (BA) dan volume" },
  { module: "ba_tracker", action: "write", description: "Input dan edit data Berita Acara (BA)" },
  { module: "ba_tracker", action: "delete", description: "Menghapus draft Berita Acara" },
  { module: "ba_tracker", action: "verify", description: "Verifikasi Berita Acara oleh SPV / Specialist" },
  { module: "ba_tracker", action: "approve", description: "Approve Berita Acara oleh Manager" },
  { module: "invoice", action: "read", description: "Melihat data invoice penagihan AR" },
  { module: "invoice", action: "write", description: "Membuat draft invoice penagihan" },
  { module: "invoice", action: "delete", description: "Menghapus draft invoice" },
  { module: "invoice", action: "verify", description: "Verifikasi draft invoice oleh SPV / Specialist" },
  { module: "invoice", action: "approve_tier1", description: "Approval Tier 1 invoice oleh FATB Manager" },
  { module: "invoice", action: "approve_tier2", description: "Approval Tier 2 invoice oleh Direksi" },
  { module: "payment", action: "read", description: "Melihat log dan rekap pembayaran" },
  { module: "payment", action: "write", description: "Mencatat penerimaan pembayaran baru" },
  { module: "payment", action: "delete", description: "Menghapus data pembayaran" },
  { module: "payment", action: "verify", description: "Verifikasi bukti transfer pembayaran" },
  { module: "accounting", action: "read", description: "Melihat jurnal dan buku besar (General Ledger)" },
  { module: "accounting", action: "generate", description: "Generate jurnal otomatis dari transaksi" },
  { module: "accounting", action: "approve", description: "Review dan approval jurnal akuntansi" },
  { module: "accounting", action: "post", description: "Posting jurnal ke Buku Besar (General Ledger)" },
  { module: "accounting", action: "write", description: "Membuat manual journal entry dan COA" },
  { module: "reconciliation", action: "run", description: "Menjalankan modul rekonsiliasi bank/vendor/customer" },
  { module: "period_closing", action: "review", description: "Review closing periode akuntansi" },
  { module: "period_closing", action: "close", description: "Lock periode dan closing resmi" },
  { module: "financial_report", action: "read", description: "Melihat laporan keuangan neraca, laba rugi, cashflow" },
  { module: "management_dashboard", action: "read", description: "Melihat KPI dan grafik analitik manajemen" },
  { module: "user_management", action: "manage", description: "Mengelola user, role, dan hak akses RBAC" },
  { module: "audit_trail", action: "read", description: "Melihat log audit trail dan riwayat aktivitas" },
  { module: "audit_trail", action: "write", description: "Mencatat jejak audit ke sistem" },
  { module: "treasury", action: "read", description: "Melihat manajemen kas bank dan payment plan" },
  { module: "treasury", action: "write", description: "Membuat payment plan dan transaksi kas bank" },
  { module: "treasury", action: "approve", description: "Menyetujui payment plan treasury" }
];

export function RBACPage({
  user,
  roles,
  myPermissions,
  myTcodes,
  initialTab = "users",
  pageTitle = "User & RBAC Management",
  onNotice
}: {
  user: UserType;
  roles: RoleAccess[];
  myPermissions: Permission[];
  myTcodes?: TCode[];
  initialTab?: "users" | "matrix" | "simulate" | "tcodes";
  pageTitle?: string;
  onNotice?: (msg: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"users" | "matrix" | "simulate" | "tcodes">(initialTab);
  const [userList, setUserList] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [companyList, setCompanyList] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Floating Toast State
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    if (onNotice) onNotice(message);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Admin Finance",
    status: "active",
    companyCode: "HO",
    companyName: "Head Office",
    companyScope: "ALL" as string[] | "ALL"
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<UserType | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<string>("FATB Manager");

  const [userGrants, setUserGrants] = useState<string[]>([]);
  const [userGrantSearch, setUserGrantSearch] = useState("");

  // Role list
  const [roleList, setRoleList] = useState<RoleAccess[]>(roles || []);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Role editor modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<"create" | "edit">("create");
  const [roleModalError, setRoleModalError] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [roleGrants, setRoleGrants] = useState<string[]>([]);
  const [roleTarget, setRoleTarget] = useState<string | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleAccess | null>(null);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<UserType | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetModalError, setResetModalError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ generated: boolean; password: string } | null>(null);

  // T-Code management
  const [tcodesList, setTcodesList] = useState<TCode[]>([]);
  const [loadingTcodes, setLoadingTcodes] = useState(false);
  const [tcodeModalOpen, setTcodeModalOpen] = useState(false);
  const [tcodeModalMode, setTcodeModalMode] = useState<"create" | "edit">("create");
  const [tcodeModalError, setTcodeModalError] = useState<string | null>(null);
  const [tcodeForm, setTcodeForm] = useState({ code: "", description: "", route: "", module: "", action: "read" });
  const [tcodeTarget, setTcodeTarget] = useState<TCode | null>(null);
  const [deleteTcodeTarget, setDeleteTcodeTarget] = useState<TCode | null>(null);

  const loadTcodes = async () => {
    setLoadingTcodes(true);
    try {
      const data = await getTCodes();
      setTcodesList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast("error", err?.message || "Gagal memuat T-Codes");
    } finally {
      setLoadingTcodes(false);
    }
  };

  const handleCreateTCode = async () => {
    setTcodeModalError(null);
    try {
      await createTCode(tcodeForm);
      setTcodeModalOpen(false);
      setTcodeForm({ code: "", description: "", route: "", module: "", action: "read" });
      showToast("success", `T-Code ${tcodeForm.code} berhasil dibuat.`);
      await loadTcodes();
    } catch (err: any) {
      setTcodeModalError(err?.message || "Gagal membuat T-Code");
    }
  };

  const handleUpdateTCode = async () => {
    if (!tcodeTarget) return;
    setTcodeModalError(null);
    try {
      await updateTCode(tcodeTarget.id, tcodeForm);
      setTcodeModalOpen(false);
      setTcodeTarget(null);
      setTcodeForm({ code: "", description: "", route: "", module: "", action: "read" });
      showToast("success", `T-Code ${tcodeForm.code} berhasil diupdate.`);
      await loadTcodes();
    } catch (err: any) {
      setTcodeModalError(err?.message || "Gagal update T-Code");
    }
  };

  const handleDeleteTCode = async () => {
    if (!deleteTcodeTarget) return;
    try {
      await deleteTCode(deleteTcodeTarget.id);
      const code = deleteTcodeTarget.code;
      setDeleteTcodeTarget(null);
      showToast("success", `T-Code ${code} berhasil dihapus.`);
      await loadTcodes();
    } catch (err: any) {
      showToast("error", err?.message || "Gagal hapus T-Code");
    }
  };

  // Build hydrated roles catalog from official metadata + API
  const unifiedRoleList = useMemo<RoleAccess[]>(() => {
    const apiRoleMap = new Map<string, RoleAccess>();
    roleList.forEach((r) => apiRoleMap.set(r.role, r));

    return OFFICIAL_ROLES_METADATA.map((meta) => {
      const existing = apiRoleMap.get(meta.role);
      const defaultGrants = OFFICIAL_ROLE_DEFAULT_GRANTS[meta.role] || [];
      const permissions: Permission[] =
        existing && existing.permissions.length > 0
          ? existing.permissions
          : defaultGrants.map((g) => {
              const [mod, act] = g.split(":");
              const match = ALL_SYSTEM_PERMISSIONS.find((p) => p.module === mod && (p.action === act || act === "*"));
              return { module: mod, action: act, description: match?.description || g };
            });

      return {
        role: meta.role,
        isSystem: meta.isSystem ?? false,
        scopes: meta.scopes,
        permissions: permissions,
        tcodes: existing?.tcodes ?? []
      };
    });
  }, [roleList]);

  const allAvailableRoles = useMemo(() => {
    return OFFICIAL_ROLES_METADATA.map((m) => m.role);
  }, []);

  const modules = useMemo(() => {
    const set = new Set<string>();
    ALL_SYSTEM_PERMISSIONS.forEach((p) => set.add(p.module));
    return Array.from(set).sort();
  }, []);

  const actions = useMemo(() => {
    const set = new Set<string>();
    ALL_SYSTEM_PERMISSIONS.forEach((p) => set.add(p.action));
    return Array.from(set).sort();
  }, []);

  const permissionsByModule = useMemo(() => {
    const groups: Record<string, Array<{ module: string; action: string; description: string; grant: string }>> = {};
    ALL_SYSTEM_PERMISSIONS.forEach((p) => {
      const grant = `${p.module}:${p.action}`;
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push({ ...p, grant });
    });
    return groups;
  }, []);

  const defaultGrantsForRole = (roleName: string) => {
    if (OFFICIAL_ROLE_DEFAULT_GRANTS[roleName]) {
      return OFFICIAL_ROLE_DEFAULT_GRANTS[roleName];
    }
    const matched = unifiedRoleList.find((r) => r.role === roleName);
    if (!matched) return [];
    return Array.from(new Set(matched.permissions.map((p) => `${p.module}:${p.action}`)));
  };

  const toggleUserGrant = (grant: string) => {
    setUserGrants((prev) => (prev.includes(grant) ? prev.filter((g) => g !== grant) : [...prev, grant]));
  };

  const toggleUserModuleAll = (moduleGrants: string[]) => {
    const allChecked = moduleGrants.every((g) => userGrants.includes(g));
    if (allChecked) {
      setUserGrants((prev) => prev.filter((g) => !moduleGrants.includes(g)));
    } else {
      setUserGrants((prev) => Array.from(new Set([...prev, ...moduleGrants])));
    }
  };

  const resetUserGrantsToRoleDefault = () => {
    const defaults = defaultGrantsForRole(formData.role);
    setUserGrants(defaults);
    showToast("info", `Hak akses direset ke preset role '${formData.role}' (${defaults.length} grants).`);
  };

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUserList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast("error", err?.message || "Gagal memuat data pengguna");
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
      showToast("error", err?.message || "Gagal memuat data role");
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await loadAuthCompanies();
      setCompanyList(Array.isArray(data) && data.length > 0 ? data : DEFAULT_COMPANIES);
    } catch {
      setCompanyList(DEFAULT_COMPANIES);
    }
  };

  useEffect(() => {
    loadAllUsers();
    loadAllRoles();
    loadCompanies();
  }, []);

  useEffect(() => {
    if (activeTab === "tcodes") loadTcodes();
  }, [activeTab]);

  const scopedCompanies = useMemo(() => {
    const map = new Map<string, { id: number; code: string; name: string; isHo: boolean }>();
    DEFAULT_COMPANIES.forEach((c) => map.set(c.code, { id: c.id, code: c.code, name: c.name, isHo: c.isHo }));
    if (companyList && companyList.length > 0) {
      companyList.forEach((c) => map.set(c.code, { id: c.id, code: c.code, name: c.name, isHo: c.isHo }));
    }
    const base = Array.from(map.values()).sort((a, b) => {
      if (a.code === "HO") return -1;
      if (b.code === "HO") return 1;
      return a.code.localeCompare(b.code);
    });
    if (isHeadOfficeUser(user) || isSuperAdminRole(user.role)) return base;
    const allowed = companyOptionsForUser(user);
    if (!allowed || allowed.length === 0) return base;
    return base.filter((company) => allowed.some((item) => item.code === company.code || item.id === company.id));
  }, [companyList, user]);

  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      const matchQuery =
        (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.role || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.companyCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.companyName || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === "All" || u.role === roleFilter;
      const matchCompany = companyFilter === "All" || u.companyCode === companyFilter;
      const matchStatus = statusFilter === "All" || u.status === statusFilter;
      return matchQuery && matchRole && matchCompany && matchStatus;
    });
  }, [userList, searchQuery, roleFilter, companyFilter, statusFilter]);

  const handleRoleChange = (newRole: string) => {
    let targetCompanyCode = formData.companyCode;

    if (newRole.includes("BGG")) {
      targetCompanyCode = "BGG";
    } else if (newRole.includes("POS")) {
      targetCompanyCode = "POS";
    } else if (newRole.includes("SBS")) {
      targetCompanyCode = "SBS";
    } else if (newRole.includes("PTRO")) {
      targetCompanyCode = "PTRO";
    } else {
      targetCompanyCode = "HO";
    }

    const selectedCompany =
      scopedCompanies.find((c) => c.code === targetCompanyCode) ||
      DEFAULT_COMPANIES.find((c) => c.code === targetCompanyCode);

    setFormData({
      ...formData,
      role: newRole,
      companyCode: targetCompanyCode,
      companyName: selectedCompany?.name ?? formData.companyName,
      companyScope: targetCompanyCode === "HO" ? ("ALL" as const) : [targetCompanyCode]
    });

    const presetGrants = defaultGrantsForRole(newRole);
    setUserGrants(presetGrants);
    if (modalError) setModalError(null);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedUser(null);
    setModalError(null);
    const initialRole = "Admin Finance";
    const initialCompanyCode = "HO";
    const defaultCompany =
      scopedCompanies.find((c) => c.code === initialCompanyCode) || scopedCompanies[0] || DEFAULT_COMPANIES[0];
    setFormData({
      name: "",
      email: "",
      password: "",
      role: initialRole,
      status: "active",
      companyCode: defaultCompany?.code ?? "HO",
      companyName: defaultCompany?.name ?? "Head Office",
      companyScope: defaultCompany?.code === "HO" ? "ALL" : (defaultCompany?.code ? [defaultCompany.code] : ["HO"])
    });
    setUserGrants(defaultGrantsForRole(initialRole));
    setUserGrantSearch("");
    setModalOpen(true);
  };

  const openEditModal = (target: UserType) => {
    setModalMode("edit");
    setSelectedUser(target);
    setModalError(null);
    const targetComp =
      scopedCompanies.find((c) => c.code === target.companyCode) ||
      DEFAULT_COMPANIES.find((c) => c.code === target.companyCode) ||
      scopedCompanies[0];
    setFormData({
      name: target.name,
      email: target.email,
      password: "",
      role: target.role,
      status: target.status || "active",
      companyCode: target.companyCode ?? targetComp?.code ?? "HO",
      companyName: target.companyName ?? targetComp?.name ?? "Head Office",
      companyScope:
        target.companyScope ??
        (target.companyCode === "HO" ? "ALL" : target.companyCode ? [target.companyCode] : ["HO"])
    });
    if (target.permissions && target.permissions.length > 0) {
      setUserGrants(target.permissions.map((p) => `${p.module}:${p.action}`));
    } else {
      setUserGrants(defaultGrantsForRole(target.role));
    }
    setUserGrantSearch("");
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setModalError("Nama dan Email wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const selectedCompany = scopedCompanies.find((company) => company.code === formData.companyCode);
      const payload = {
        ...formData,
        companyName: selectedCompany?.name ?? formData.companyName,
        companyScope: formData.companyCode === "HO" ? ("ALL" as const) : [formData.companyCode],
        permissions: userGrants
      };
      if (modalMode === "create") {
        await createUser(payload);
        showToast("success", `User '${formData.name}' berhasil ditambahkan dengan role '${formData.role}'!`);
      } else if (selectedUser) {
        await updateUser(selectedUser.id, payload);
        showToast("success", `Data user '${formData.name}' berhasil diperbarui!`);
      }
      setModalOpen(false);
      await loadAllUsers();
    } catch (err: any) {
      setModalError(err?.message || "Gagal menyimpan data pengguna. Periksa kembali email atau kelengkapan data.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteUser(deleteTarget.id);
      const name = deleteTarget.name;
      setDeleteTarget(null);
      showToast("success", `User '${name}' berhasil dihapus dari sistem.`);
      await loadAllUsers();
    } catch (err: any) {
      showToast("error", err?.message || "Gagal menghapus user");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateRoleModal = () => {
    setRoleModalMode("create");
    setRoleTarget(null);
    setRoleModalError(null);
    setRoleForm({ name: "", description: "" });
    setRoleGrants([]);
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (access: RoleAccess) => {
    setRoleModalMode("edit");
    setRoleTarget(access.role);
    setRoleModalError(null);
    setRoleForm({ name: access.role, description: "" });
    setRoleGrants(access.permissions.map((p) => `${p.module}:${p.action}`));
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleModalError(null);

    if (!roleForm.name.trim()) {
      setRoleModalError("Nama role wajib diisi!");
      return;
    }
    setSubmitting(true);
    try {
      if (roleModalMode === "create") {
        await createRole({ name: roleForm.name.trim(), description: roleForm.description, permissions: roleGrants });
        showToast("success", `Role '${roleForm.name}' berhasil dibuat.`);
      } else if (roleTarget) {
        await updateRolePermissions(roleTarget, roleGrants);
        showToast("success", `Permission role '${roleTarget}' berhasil diperbarui.`);
      }
      setRoleModalOpen(false);
      await loadAllRoles();
    } catch (err: any) {
      setRoleModalError(err?.message || "Gagal menyimpan role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    setSubmitting(true);
    try {
      await deleteRoleApi(deleteRoleTarget.role);
      const r = deleteRoleTarget.role;
      setDeleteRoleTarget(null);
      showToast("success", `Role '${r}' berhasil dihapus.`);
      await loadAllRoles();
    } catch (err: any) {
      showToast("error", err?.message || "Gagal menghapus role");
    } finally {
      setSubmitting(false);
    }
  };

  const openResetPasswordModal = (target: UserType) => {
    setResetTarget(target);
    setResetPasswordValue("");
    setResetModalError(null);
    setResetResult(null);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setSubmitting(true);
    setResetModalError(null);
    try {
      const res = await resetUserPassword(resetTarget.id, resetPasswordValue || undefined);
      if (res.temporaryPassword) {
        setResetResult({ generated: true, password: res.temporaryPassword });
      } else {
        setResetResult({ generated: false, password: resetPasswordValue });
      }
      showToast("success", `Password user '${resetTarget.name}' berhasil direset.`);
      await loadAllUsers();
    } catch (err: any) {
      setResetModalError(err?.message || "Gagal reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const simulatedRoleAccess = useMemo(() => {
    return (
      unifiedRoleList.find((r) => r.role === simulatedRole) || {
        role: simulatedRole,
        permissions: [],
        scopes: ["company", "site"],
        isSystem: false,
        tcodes: []
      }
    );
  }, [unifiedRoleList, simulatedRole]);

  if (!authorized(user, "user_management", "manage")) {
    return (
      <section className="w-full space-y-4">
        <PageHeader title="Access Denied" description="Menu User & RBAC Management hanya tersedia untuk kredensial dengan izin user_management:manage." />
        <div className="p-4 rounded-md bg-[#fff1f2] text-[#b91c1c] border border-[#fecaca] flex items-center gap-2.5 text-sm font-semibold">
          <Lock size={18} className="text-[#b91c1c]" />
          Role Anda saat ini: <strong>{user.role || "unknown"}</strong>. Hubungi Super Admin untuk meminta akses.
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-5">
      <PageHeader
        title={pageTitle}
        description="Kelola akun pengguna, penugasan role akses, izin operasional finance, dan matriks permission sistem."
        meta={
          <span className="badge font-mono font-bold">
            Super Admin Access
          </span>
        }
      />

      {/* Floating Global Confirmation Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] max-w-xl w-[92%] sm:w-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#1e2b4d] text-white shadow-2xl border border-slate-700/80 backdrop-blur-md transition-all duration-300 pointer-events-auto">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            {toast.type === "success" ? (
              <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />
            ) : toast.type === "error" ? (
              <AlertCircle size={17} className="text-rose-400 shrink-0" />
            ) : (
              <Info size={17} className="text-sky-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 transition rounded hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* KPI Highlights (AAP Standard Grid) */}
      <div className="kpi-grid">
        <article className="kpi-card">
          <span>Total Pengguna</span>
          <strong>{userList.length}</strong>
          <small className="text-slate-500">Akun terdaftar</small>
        </article>

        <article className="kpi-card">
          <span>User Aktif</span>
          <strong className="text-[#2e7d53]">{userList.filter((u) => u.status === "active").length}</strong>
          <small className="good">Operasional Aktif</small>
        </article>

        <article className="kpi-card">
          <span>Katalog Role</span>
          <strong>{allAvailableRoles.length}</strong>
          <small className="info">7 HO + 5 Site Presets</small>
        </article>

        <article className="kpi-card">
          <span>Modul Terproteksi</span>
          <strong>{modules.length}</strong>
          <small className="text-slate-500">Akses Matrix</small>
        </article>
      </div>

      {/* Tabs Navigation (FEAST Clean Tabs) */}
      <div className="flex border-b border-[#E6E1D9] gap-6 text-sm">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === "users"
              ? "border-[#a57c50] text-[#1e2b4d]"
              : "border-transparent text-[#6B6055] hover:text-[#1A1612]"
          }`}
        >
          <UsersRound size={16} /> Manajemen Pengguna ({userList.length})
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === "matrix"
              ? "border-[#a57c50] text-[#1e2b4d]"
              : "border-transparent text-[#6B6055] hover:text-[#1A1612]"
          }`}
        >
          <ShieldCheck size={16} /> Role & Permission Matrix
        </button>
        <button
          onClick={() => setActiveTab("simulate")}
          className={`pb-3 font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === "simulate"
              ? "border-[#a57c50] text-[#1e2b4d]"
              : "border-transparent text-[#6B6055] hover:text-[#1A1612]"
          }`}
        >
          <Sparkles size={16} /> Simulasi Hak Akses Role
        </button>
        {userScopeType(user) === "GLOBAL" && (
          <button
            onClick={() => {
              setActiveTab("tcodes");
              if (tcodesList.length === 0) loadTcodes();
            }}
            className={`pb-3 font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === "tcodes"
                ? "border-[#a57c50] text-[#1e2b4d]"
                : "border-transparent text-[#6B6055] hover:text-[#1A1612]"
            }`}
          >
            <Hash size={16} /> T-Codes ({tcodesList.length})
          </button>
        )}
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#E6E1D9] shadow-xs">
            <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari user (nama, email, role)..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-[#cbd5e1] focus:outline-hidden focus:border-[#a57c50]"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded border border-[#cbd5e1] bg-white font-semibold text-slate-700"
              >
                <option value="All">Semua Role</option>
                {allAvailableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded border border-[#cbd5e1] bg-white font-semibold text-slate-700"
              >
                <option value="All">Semua Scope</option>
                {scopedCompanies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded border border-[#cbd5e1] bg-white font-semibold text-slate-700"
              >
                <option value="All">Semua Status</option>
                <option value="active">Active (Aktif)</option>
                <option value="inactive">Inactive (Nonaktif)</option>
                <option value="locked">Locked (Terkunci)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={loadAllUsers}
                disabled={loadingUsers}
                className="p-2 rounded border border-[#cbd5e1] hover:bg-slate-50 text-slate-600 transition"
                title="Refresh data"
              >
                <RefreshCw size={14} className={loadingUsers ? "animate-spin" : ""} />
              </button>

              <button
                onClick={openCreateModal}
                className="px-3.5 py-1.5 bg-[#1e2b4d] hover:bg-[#16203b] text-white rounded font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <UserPlus size={14} /> Tambah Pengguna
              </button>
            </div>
          </div>

          {/* User Table (FEAST Data Table Standard) */}
          <div className="table-wrap bg-white rounded-lg border border-[#E6E1D9] overflow-hidden shadow-xs">
            <table>
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Role Akses</th>
                  <th>Company Scope</th>
                  <th>Status</th>
                  <th>Login Terakhir</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Tidak ada data pengguna yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded bg-[#1e2b4d] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {u.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[#1A1612] leading-tight">{u.name}</p>
                              <p className="text-[11px] text-[#6B6055] font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="font-semibold text-[#1A1612] inline-flex items-center gap-1">
                            <Shield size={12} className="text-[#a57c50]" />
                            {u.role}
                          </span>
                          {u.permissions && u.permissions.length > 0 && (
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                              +{u.permissions.length} custom grants
                            </span>
                          )}
                        </td>
                        <td>
                          {isHeadOfficeUser(u) || u.companyCode === "HO" ? (
                            <span className="badge info font-mono">
                              HO (Global)
                            </span>
                          ) : (
                            <span className="badge wait font-mono">
                              {u.companyCode ?? "-"} (Site)
                            </span>
                          )}
                        </td>
                        <td>
                          {u.status === "active" ? (
                            <span className="badge ok">
                              Aktif
                            </span>
                          ) : u.status === "locked" ? (
                            <span className="badge bad">
                              Terkunci
                            </span>
                          ) : (
                            <span className="badge">
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="text-xs text-[#6B6055] font-mono">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("id-ID") : "Belum pernah login"}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(u)}
                              className="px-2 py-1 rounded border border-[#cbd5e1] hover:border-[#a57c50] hover:bg-[#FAF8F4] text-[#1e2b4d] font-bold text-xs inline-flex items-center gap-1 transition"
                              title="Ubah Role & Hak Akses"
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                            <button
                              onClick={() => openResetPasswordModal(u)}
                              className="px-2 py-1 rounded border border-[#cbd5e1] hover:border-[#a57c50] hover:bg-[#FAF8F4] text-[#6B6055] font-bold text-xs inline-flex items-center gap-1 transition"
                              title="Reset Password"
                            >
                              <KeyRound size={11} /> Reset
                            </button>
                            {u.id !== 1 && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="p-1 rounded border border-[#cbd5e1] hover:border-[#b3352b] hover:bg-[#f8e6e3] text-[#b3352b] transition"
                                title="Hapus User"
                              >
                                <Trash2 size={12} />
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
      )}

      {/* TAB 2: ROLE & PERMISSION MATRIX */}
      {activeTab === "matrix" && (
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#E6E1D9] shadow-xs">
            <div className="flex items-start gap-2 text-xs text-[#5A5046]">
              <Info size={15} className="mt-0.5 shrink-0 text-[#a57c50]" />
              <p className="font-medium">
                Katalog permission per role operasional finance. Role <strong>Super Admin</strong> terkunci demi kepatuhan governance enterprise.
              </p>
            </div>
            <button
              onClick={loadAllRoles}
              disabled={loadingRoles}
              className="p-1.5 rounded border border-[#cbd5e1] hover:bg-slate-50 text-slate-600 transition shrink-0"
              title="Refresh data role"
            >
              <RefreshCw size={14} className={loadingRoles ? "animate-spin" : ""} />
            </button>
          </div>

          {/* SECTION 1: Head Office Management Roles */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A5046] flex items-center gap-1.5">
              <Building2 size={15} className="text-[#a57c50]" />
              1. Head Office (HO) Management & Operational Roles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {unifiedRoleList
                .filter((r) => {
                  const meta = OFFICIAL_ROLES_METADATA.find((m) => m.role === r.role);
                  return meta?.category === "Super Admin" || meta?.category === "Head Office";
                })
                .map((role) => {
                  const meta = OFFICIAL_ROLES_METADATA.find((m) => m.role === role.role);
                  const locked = role.isSystem || role.role === "Super Admin";

                  return (
                    <article
                      key={role.role}
                      className="p-3.5 bg-white rounded-lg border border-[#E6E1D9] shadow-xs flex flex-col justify-between hover:border-[#a57c50]/50 transition"
                    >
                      <div>
                        <header className="flex items-start justify-between pb-2 border-b border-[#E6E1D9] gap-2">
                          <div>
                            <span className="font-bold text-xs text-[#1e2b4d] inline-flex items-center gap-1">
                              {locked ? <Lock size={11} className="text-slate-400" /> : <Shield size={11} className="text-[#a57c50]" />}
                              {role.role}
                            </span>
                            <p className="text-[11px] text-[#6B6055] mt-0.5">{meta?.description}</p>
                          </div>
                          <span className="badge font-mono text-[10px] font-bold shrink-0">
                            {role.permissions.length} Grants
                          </span>
                        </header>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#6B6055]">
                          <span>Scope:</span>
                          <span className="font-semibold text-[#1A1612]">{meta?.scopeLabel}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {role.permissions.slice(0, 8).map((p) => (
                            <span
                              key={`${role.role}-${p.module}-${p.action}`}
                              className="px-1.5 py-0.5 bg-[#FAF8F4] text-[#3A322A] text-[10px] font-mono font-medium rounded border border-[#E6E1D9]"
                            >
                              {p.module}:{p.action}
                            </span>
                          ))}
                          {role.permissions.length > 8 && (
                            <span className="px-1.5 py-0.5 bg-[#F2EEE8] text-[#6B6055] text-[10px] font-bold rounded">
                              +{role.permissions.length - 8} lainnya
                            </span>
                          )}
                        </div>
                      </div>

                      <footer className="flex items-center justify-end gap-1.5 pt-2.5 mt-2.5 border-t border-[#E6E1D9]">
                        {locked ? (
                          <span className="text-[10px] font-bold text-slate-400 inline-flex items-center gap-1">
                            <Lock size={11} /> Terkunci (Super Admin)
                          </span>
                        ) : (
                          <button
                            onClick={() => openEditRoleModal(role)}
                            className="px-2.5 py-1 rounded border border-[#cbd5e1] hover:border-[#a57c50] hover:bg-[#FAF8F4] text-[#1e2b4d] font-bold text-xs inline-flex items-center gap-1 transition"
                            title="Ubah permission role"
                          >
                            <Edit2 size={11} /> Edit Permission
                          </button>
                        )}
                      </footer>
                    </article>
                  );
                })}
            </div>
          </div>

          {/* SECTION 2: Site Entities Preset Roles */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A5046] flex items-center gap-1.5">
              <MapPin size={15} className="text-[#a57c50]" />
              2. Site-Specific Admin Presets (Restricted Scope)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {unifiedRoleList
                .filter((r) => {
                  const meta = OFFICIAL_ROLES_METADATA.find((m) => m.role === r.role);
                  return meta?.category === "Site Entity";
                })
                .map((role) => {
                  const meta = OFFICIAL_ROLES_METADATA.find((m) => m.role === role.role);

                  return (
                    <article
                      key={role.role}
                      className="p-3.5 bg-white rounded-lg border border-[#E6E1D9] shadow-xs flex flex-col justify-between hover:border-[#a57c50]/50 transition"
                    >
                      <div>
                        <header className="flex items-start justify-between pb-2 border-b border-[#E6E1D9] gap-2">
                          <div>
                            <span className="font-bold text-xs text-[#1e2b4d] inline-flex items-center gap-1">
                              <MapPin size={11} className="text-[#a57c50]" />
                              {role.role}
                            </span>
                            <p className="text-[11px] text-[#6B6055] mt-0.5">{meta?.description}</p>
                          </div>
                          <span className="badge wait font-mono text-[10px] font-bold shrink-0">
                            {role.permissions.length} Grants
                          </span>
                        </header>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#6B6055]">
                          <span>Scope:</span>
                          <span className="font-semibold text-[#1A1612]">{meta?.scopeLabel}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {role.permissions.slice(0, 8).map((p) => (
                            <span
                              key={`${role.role}-${p.module}-${p.action}`}
                              className="px-1.5 py-0.5 bg-[#FAF8F4] text-[#3A322A] text-[10px] font-mono font-medium rounded border border-[#E6E1D9]"
                            >
                              {p.module}:{p.action}
                            </span>
                          ))}
                          {role.permissions.length > 8 && (
                            <span className="px-1.5 py-0.5 bg-[#F2EEE8] text-[#6B6055] text-[10px] font-bold rounded">
                              +{role.permissions.length - 8} lainnya
                            </span>
                          )}
                        </div>
                      </div>

                      <footer className="flex items-center justify-end gap-1.5 pt-2.5 mt-2.5 border-t border-[#E6E1D9]">
                        <button
                          onClick={() => openEditRoleModal(role)}
                          className="px-2.5 py-1 rounded border border-[#cbd5e1] hover:border-[#a57c50] hover:bg-[#FAF8F4] text-[#1e2b4d] font-bold text-xs inline-flex items-center gap-1 transition"
                          title="Ubah permission role"
                        >
                          <Edit2 size={11} /> Edit Permission
                        </button>
                      </footer>
                    </article>
                  );
                })}
            </div>
          </div>

          {/* Full Matrix Table (Scrollable Box with Sticky Headers) */}
          <div className="bg-white rounded-lg border border-[#E6E1D9] shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-[#E6E1D9] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-[#1e2b4d] text-sm flex items-center gap-1.5">
                  <Layers size={15} className="text-[#a57c50]" />
                  Full Permission Matrix
                </h3>
                <p className="text-xs text-[#6B6055]">Pemetaan seluruh modul terhadap tindakan operasional yang diizinkan pada sistem FEAST</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">
                  💡 Geser horizontal & vertikal untuk melihat seluruh aksi
                </span>
                <span className="badge font-bold text-xs">
                  {modules.length} Modul
                </span>
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[360px] divide-y divide-[#E6E1D9]">
              <table className="w-full text-left text-xs text-slate-600 border-collapse min-w-[780px]">
                <thead className="bg-[#FAF8F4] text-[#5A5046] uppercase font-bold text-[11px] border-b border-[#E6E1D9] sticky top-0 z-20 shadow-xs">
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-[#1A1612] sticky left-0 bg-[#FAF8F4] z-30 border-r border-[#E6E1D9]">
                      Modul
                    </th>
                    {actions.map((action) => (
                      <th key={action} className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D9]">
                  {modules.map((module) => (
                    <tr key={module} className="hover:bg-[#FAF8F4] group">
                      <td className="py-2 px-3 font-bold text-[#1A1612] font-mono sticky left-0 bg-white group-hover:bg-[#FAF8F4] z-10 border-r border-[#E6E1D9] whitespace-nowrap">
                        {module}
                      </td>
                      {actions.map((action) => {
                        const hasGrant = unifiedRoleList.some((role) =>
                          role.permissions.some((p) => p.module === module && (p.action === action || p.action === "*"))
                        );
                        return (
                          <td key={`${module}-${action}`} className="py-2 px-2.5 text-center whitespace-nowrap">
                            {hasGrant ? (
                              <span className="badge ok text-[10px]">
                                Diizinkan
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
        <section className="bg-white p-5 rounded-lg border border-[#E6E1D9] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-[#E6E1D9]">
            <div>
              <h3 className="font-bold text-[#1e2b4d] text-base flex items-center gap-2">
                <Sparkles size={17} className="text-[#a57c50]" /> Simulasi Hak Akses Role
              </h3>
              <p className="text-xs text-[#6B6055] mt-0.5">
                Pilih role untuk menginspeksi menu dan tindakan apa saja yang dapat diakses oleh user dengan role tersebut.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-[#5A5046]">Pilih Role:</label>
              <select
                value={simulatedRole}
                onChange={(e) => setSimulatedRole(e.target.value)}
                className="px-3 py-1.5 text-xs rounded border border-[#cbd5e1] bg-white font-bold text-[#1A1612] focus:outline-hidden"
              >
                {allAvailableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* BA Tracker Actions */}
            <div className="p-3.5 rounded-lg border border-[#E6E1D9] bg-[#FAF8F4] space-y-2.5">
              <h4 className="font-bold text-xs text-[#1e2b4d] uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={14} className="text-[#a57c50]" /> Berita Acara (BA) Tracker
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Lihat BA Tracker</span>
                  <span className="font-bold text-[#2e7d53]">✓ Ya</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Buat & Edit BA</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "ba_tracker" && (p.action === "write" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Verifikasi BA (SPV)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "ba_tracker" && (p.action === "verify" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Approve BA (Manager)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "ba_tracker" && (p.action === "approve" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
              </ul>
            </div>

            {/* Invoice Actions */}
            <div className="p-3.5 rounded-lg border border-[#E6E1D9] bg-[#FAF8F4] space-y-2.5">
              <h4 className="font-bold text-xs text-[#1e2b4d] uppercase tracking-wider flex items-center gap-1.5">
                <Receipt size={14} className="text-[#a57c50]" /> Invoice Management (AR)
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Buat Draft Tagihan</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "invoice" && (p.action === "write" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Verifikasi Faktur (SPV)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "invoice" && (p.action === "verify" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Approval Tier 1 (FATB Manager)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "invoice" && (p.action === "approve_tier1" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Approval Tier 2 (Direktur)</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "invoice" && (p.action === "approve_tier2" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
              </ul>
            </div>

            {/* Payment & Master Data */}
            <div className="p-3.5 rounded-lg border border-[#E6E1D9] bg-[#FAF8F4] space-y-2.5">
              <h4 className="font-bold text-xs text-[#1e2b4d] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={14} className="text-[#a57c50]" /> Payment & Master Data
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Catat Cicilan Pembayaran</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "payment" && (p.action === "write" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Verifikasi Transfer Bank</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "payment" && (p.action === "verify" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>Kelola Master Data & SOW</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "master_data" && (p.action === "write" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Diizinkan</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
                <li className="flex items-center justify-between p-2 rounded bg-white border border-[#E6E1D9]">
                  <span>User & RBAC Management</span>
                  {simulatedRoleAccess.permissions.some((p) => p.module === "user_management" && (p.action === "manage" || p.action === "*")) || isSuperAdminRole(simulatedRole) ? (
                    <span className="font-bold text-[#2e7d53]">✓ Super Admin</span>
                  ) : (
                    <span className="font-bold text-[#b3352b]">✕ Terkunci</span>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: T-CODE MANAGEMENT */}
      {activeTab === "tcodes" && userScopeType(user) === "GLOBAL" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-lg border border-[#E6E1D9] shadow-xs">
            <div>
              <h3 className="font-bold text-[#1e2b4d] text-sm flex items-center gap-1.5">
                <Hash size={15} className="text-[#a57c50]" /> Transaction Codes (T-Codes)
              </h3>
              <p className="text-xs text-[#6B6055]">Pintasan navigasi cepat ERP-style untuk modul FEAST</p>
            </div>
            <button
              onClick={() => {
                setTcodeModalMode("create");
                setTcodeModalError(null);
                setTcodeForm({ code: "", description: "", route: "", module: "", action: "read" });
                setTcodeModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#1e2b4d] text-white rounded font-bold text-xs hover:bg-[#16203b] flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus size={14} /> Tambah T-Code
            </button>
          </div>

          <div className="table-wrap rounded-lg border border-[#E6E1D9] bg-white shadow-xs overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Route</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tcodesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Belum ada T-Code yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  tcodesList.map((tc) => (
                    <tr key={tc.id}>
                      <td className="font-mono font-bold text-[#a57c50]">{tc.code}</td>
                      <td className="text-[#1A1612]">{tc.description}</td>
                      <td className="font-mono text-[#6B6055]">{tc.route}</td>
                      <td className="font-mono">{tc.module}</td>
                      <td className="font-mono">{tc.action}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setTcodeModalMode("edit");
                              setTcodeModalError(null);
                              setTcodeTarget(tc);
                              setTcodeForm({
                                code: tc.code,
                                description: tc.description,
                                route: tc.route,
                                module: tc.module,
                                action: tc.action
                              });
                              setTcodeModalOpen(true);
                            }}
                            className="p-1 rounded border border-[#cbd5e1] hover:border-[#a57c50] hover:bg-[#FAF8F4] text-[#1e2b4d] transition"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => setDeleteTcodeTarget(tc)}
                            className="p-1 rounded border border-[#cbd5e1] hover:border-[#b3352b] hover:bg-[#f8e6e3] text-[#b3352b] transition"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL: TAMBAH / EDIT USER & HAK AKSES ROLE (2-Column Side-by-Side) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-[#E6E1D9] max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E6E1D9] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#FAF8F4] text-[#a57c50] border border-[#E6E1D9] flex items-center justify-center font-bold">
                  {modalMode === "create" ? <UserPlus size={16} /> : <Edit2 size={15} />}
                </div>
                <div>
                  <h3 className="font-bold text-[#1e2b4d] text-sm">
                    {modalMode === "create" ? "Tambah Akun Pengguna Baru" : `Edit Pengguna: ${selectedUser?.name}`}
                  </h3>
                  <p className="text-xs text-[#6B6055]">
                    Konfigurasi kredensial login, role penugasan, company scope, dan hak akses izin modular.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body - 2 Columns */}
            <form onSubmit={handleSaveUser} className="flex-1 flex flex-col overflow-hidden pt-3.5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto pr-1 flex-1">
                {/* SISI KIRI (Left Column - 5 cols): Kredensial & Role Scope */}
                <div className="lg:col-span-5 space-y-3.5">
                  <div className="p-3.5 bg-[#FAF8F4] rounded-lg border border-[#E6E1D9] space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A5046] flex items-center gap-1.5">
                      <User size={13} className="text-[#a57c50]" />
                      1. Kredensial & Profil Akun
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-[#415064] mb-1">Nama Lengkap *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (modalError) setModalError(null);
                        }}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-[#cbd5e1] rounded focus:outline-hidden focus:border-[#a57c50]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#415064] mb-1">Alamat Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (modalError) setModalError(null);
                        }}
                        placeholder="Contoh: budi.santoso@andalan.co.id"
                        className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-[#cbd5e1] rounded focus:outline-hidden focus:border-[#a57c50]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-[#415064] mb-1">
                          Password {modalMode === "edit" ? "(Opsional)" : "*"}
                        </label>
                        <div className="relative">
                          <KeyRound size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => {
                              setFormData({ ...formData, password: e.target.value });
                              if (modalError) setModalError(null);
                            }}
                            placeholder={modalMode === "edit" ? "••••••••" : "Admin@123"}
                            className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono bg-white border border-[#cbd5e1] rounded focus:outline-hidden focus:border-[#a57c50]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#415064] mb-1">Status Akun</label>
                        <select
                          value={formData.status}
                          onChange={(e) => {
                            setFormData({ ...formData, status: e.target.value });
                            if (modalError) setModalError(null);
                          }}
                          className="w-full px-2 py-1.5 text-xs font-bold bg-white border border-[#cbd5e1] rounded focus:outline-hidden"
                        >
                          <option value="active">Active (Aktif)</option>
                          <option value="inactive">Inactive (Nonaktif)</option>
                          <option value="locked">Locked (Terkunci)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#FAF8F4] rounded-lg border border-[#E6E1D9] space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A5046] flex items-center gap-1.5">
                      <Briefcase size={13} className="text-[#a57c50]" />
                      2. Role & Penugasan Scope
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-[#415064] mb-1">Role Penugasan *</label>
                      <select
                        value={formData.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-[#cbd5e1] rounded focus:outline-hidden"
                      >
                        <optgroup label="⭐ Super Admin">
                          <option value="Super Admin">Super Admin (Akses Penuh Seluruh Sistem)</option>
                        </optgroup>
                        <optgroup label="🏢 Head Office (HO)">
                          <option value="FATB Manager">FATB Manager (Finance, Accounting, Tax, Budget Manager)</option>
                          <option value="Finance Superintendent">Finance Superintendent (Superintendent Keuangan & Kontrol)</option>
                          <option value="Finance Specialist (SPV)">Finance Specialist (SPV) (Specialist / SPV Verifikator Keuangan)</option>
                          <option value="Foreman Finance">Foreman Finance (Foreman / Pengawas Keuangan Lapangan)</option>
                          <option value="Admin Finance">Admin Finance (Administrator Keuangan HO)</option>
                          <option value="Finance Intern">Finance Intern (Magang Keuangan - View Only)</option>
                        </optgroup>
                        <optgroup label="📍 Site-Specific Admin Presets">
                          <option value="Admin Finance Site BGG">Admin Finance Site BGG (Site PT Budi Gema Gempita)</option>
                          <option value="Admin Finance Site POS">Admin Finance Site POS (Site PT Position)</option>
                          <option value="Admin Finance Site SBS">Admin Finance Site SBS (Site PT Satria Bahana Sarana)</option>
                          <option value="Admin Finance Site PTRO">Admin Finance Site PTRO (Site PT Petrosea)</option>
                          <option value="Admin Finance Site">Admin Finance Site (General Site Admin)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-[#415064]">Company Scope *</label>
                        <span className="badge text-[10px] font-mono">
                          {formData.companyCode === "HO" ? "HO (Global)" : `Site ${formData.companyCode}`}
                        </span>
                      </div>
                      <select
                        value={formData.companyCode}
                        onChange={(e) => {
                          const selectedCompany = scopedCompanies.find((company) => company.code === e.target.value);
                          setFormData({
                            ...formData,
                            companyCode: e.target.value,
                            companyName: selectedCompany?.name ?? "",
                            companyScope: e.target.value === "HO" ? ("ALL" as const) : [e.target.value]
                          });
                          if (modalError) setModalError(null);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-[#cbd5e1] rounded focus:outline-hidden"
                      >
                        {scopedCompanies.map((company) => (
                          <option key={company.code} value={company.code}>
                            {company.code === "HO"
                              ? "HO - Head Office (Kantor Pusat - Akses Seluruh Site)"
                              : `${company.code} - ${company.name} (Akses Khusus Site ${company.code})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SISI KANAN (Right Column - 7 cols): Khusus Hak Akses Role & Custom User Grants */}
                <div className="lg:col-span-7 flex flex-col p-3.5 bg-[#FAF8F4] rounded-lg border border-[#E6E1D9] min-h-[420px]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E6E1D9] flex-shrink-0">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={15} className="text-[#a57c50]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e2b4d]">
                          3. Hak Akses Role & Custom Permissions
                        </h4>
                        <span className="badge font-mono text-[10px] font-bold">
                          {userGrants.length} aktif
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B6055] mt-0.5">
                        Centang untuk menyesuaikan izin perorangan pada role <strong>{formData.role}</strong>.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={resetUserGrantsToRoleDefault}
                      className="px-2 py-1 text-xs font-bold text-[#1e2b4d] hover:bg-white bg-[#FAF8F4] border border-[#cbd5e1] rounded inline-flex items-center gap-1 transition shrink-0"
                      title="Kembalikan centang sesuai preset default role terpilih"
                    >
                      <RotateCcw size={11} /> Reset ke Preset
                    </button>
                  </div>

                  {/* Search Filter for Grants */}
                  <div className="pt-2 pb-1.5 flex-shrink-0">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={userGrantSearch}
                        onChange={(e) => setUserGrantSearch(e.target.value)}
                        placeholder="Filter hak akses..."
                        className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-[#cbd5e1] rounded focus:outline-hidden focus:border-[#a57c50]"
                      />
                    </div>
                  </div>

                  {/* Scrollable Permissions Checklist */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 mt-1 max-h-[320px]">
                    {Object.entries(permissionsByModule).map(([modName, modGrants]) => {
                      const filteredGrants = modGrants.filter(
                        (p) =>
                          !userGrantSearch ||
                          p.module.toLowerCase().includes(userGrantSearch.toLowerCase()) ||
                          p.action.toLowerCase().includes(userGrantSearch.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(userGrantSearch.toLowerCase()))
                      );
                      if (filteredGrants.length === 0) return null;

                      const grantKeys = modGrants.map((g) => g.grant);
                      const allChecked = grantKeys.every((k) => userGrants.includes(k));
                      const someChecked = grantKeys.some((k) => userGrants.includes(k));

                      return (
                        <div key={modName} className="bg-white rounded border border-[#E6E1D9] overflow-hidden shadow-2xs">
                          <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#FAF8F4] border-b border-[#E6E1D9]">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = someChecked && !allChecked;
                                }}
                                onChange={() => toggleUserModuleAll(grantKeys)}
                                className="w-3.5 h-3.5 accent-[#1e2b4d] rounded cursor-pointer"
                              />
                              <span className="text-xs font-bold text-[#1A1612] font-mono uppercase">{modName}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {modGrants.filter((g) => userGrants.includes(g.grant)).length}/{modGrants.length}
                            </span>
                          </div>

                          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {filteredGrants.map((p) => {
                              const isChecked = userGrants.includes(p.grant);
                              return (
                                <label
                                  key={p.grant}
                                  className={`flex items-start gap-1.5 p-1.5 rounded border text-xs cursor-pointer select-none ${
                                    isChecked
                                      ? "bg-[#FAF8F4] border-[#a57c50] text-[#1e2b4d] font-bold"
                                      : "bg-white border-[#E6E1D9] text-[#5A5046] hover:bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleUserGrant(p.grant)}
                                    className="w-3.5 h-3.5 mt-0.5 accent-[#1e2b4d] rounded cursor-pointer shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold text-[11px] font-mono">{p.action}</span>
                                    </div>
                                    {p.description && (
                                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-1" title={p.description}>
                                        {p.description}
                                      </p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* In-Modal Error Alert Banner */}
              {modalError && (
                <div className="p-2.5 bg-[#f8e6e3] text-[#b3352b] border border-[#b3352b]/30 rounded flex items-center justify-between gap-2 text-xs font-bold mt-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-[#b3352b]" />
                    <span>{modalError}</span>
                  </div>
                  <button type="button" onClick={() => setModalError(null)} className="p-1 hover:bg-[#b3352b]/10 rounded">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-[#E6E1D9] flex-shrink-0">
                <div className="text-xs text-[#6B6055]">
                  {modalMode === "create" ? "Kredensial login akun akan langsung aktif." : "Perubahan akan segera berlaku setelah disimpan."}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 border border-[#cbd5e1] hover:bg-slate-100 rounded text-xs font-bold text-slate-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-[#1e2b4d] hover:bg-[#16203b] text-white rounded text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    {modalMode === "create" ? "Simpan Pengguna" : "Update Pengguna"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD CONFIRMATION */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-2xl border border-[#E6E1D9] space-y-3.5">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-[#1e2b4d] text-base">Reset Password Pengguna</h3>
              <p className="text-xs text-[#6B6055]">
                Atur ulang password untuk akun <strong>{resetTarget.name}</strong> ({resetTarget.email}).
              </p>
            </div>

            {resetModalError && (
              <div className="p-2.5 bg-[#f8e6e3] text-[#b3352b] border border-[#b3352b]/30 rounded flex items-center gap-2 text-xs font-bold">
                <AlertCircle size={15} className="shrink-0" />
                <span>{resetModalError}</span>
              </div>
            )}

            {resetResult ? (
              <div className="p-3.5 bg-[#e4f1e9] border border-[#2e7d53]/30 rounded text-center space-y-2">
                <p className="text-xs font-bold text-[#2e7d53]">Password Berhasil Direset!</p>
                <div className="p-2 bg-white border border-[#2e7d53]/40 rounded font-mono font-bold text-sm text-[#1A1612]">
                  {resetResult.password}
                </div>
                <p className="text-[11px] text-[#2e7d53]">Salin password ini dan berikan kepada pengguna terkait.</p>
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(null);
                    setResetResult(null);
                  }}
                  className="w-full py-1.5 bg-[#2e7d53] text-white font-bold text-xs rounded hover:bg-[#246342] transition"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#415064] mb-1">Password Baru (Opsional)</label>
                  <input
                    type="password"
                    value={resetPasswordValue}
                    onChange={(e) => {
                      setResetPasswordValue(e.target.value);
                      if (resetModalError) setResetModalError(null);
                    }}
                    placeholder="Kosongkan untuk auto-generate"
                    className="w-full px-3 py-1.5 text-xs border border-[#cbd5e1] rounded font-mono focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Jika dikosongkan, sistem akan meng-generate temporary password acak.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setResetTarget(null)}
                    className="px-3 py-1.5 border border-[#cbd5e1] hover:bg-slate-100 rounded text-xs font-bold text-slate-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={submitting}
                    className="px-4 py-1.5 bg-[#a57c50] hover:bg-[#8C6740] text-white rounded text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw size={13} className="animate-spin" /> : <KeyRound size={13} />}
                    Reset Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-2xl border border-[#E6E1D9] space-y-3.5">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-[#1e2b4d] text-base">Konfirmasi Hapus Pengguna</h3>
              <p className="text-xs text-[#6B6055]">
                Apakah Anda yakin ingin menghapus akun <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? Aksi ini akan dicatat ke audit trail.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 border border-[#cbd5e1] hover:bg-slate-100 rounded text-xs font-bold text-slate-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={submitting}
                className="px-4 py-1.5 bg-[#b3352b] hover:bg-[#8f2a22] text-white rounded text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ROLE & PERMISSIONS */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-2xl w-full p-5 shadow-2xl border border-[#E6E1D9] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D9]">
              <h3 className="font-bold text-[#1e2b4d] text-sm flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#a57c50]" />
                {roleModalMode === "create" ? "Buat Role Baru" : `Edit Permission: ${roleTarget}`}
              </h3>
              <button onClick={() => setRoleModalOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-3.5 mt-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#415064] mb-1">Nama Role *</label>
                  <input
                    type="text"
                    required
                    disabled={roleModalMode === "edit"}
                    value={roleForm.name}
                    onChange={(e) => {
                      setRoleForm({ ...roleForm, name: e.target.value });
                      if (roleModalError) setRoleModalError(null);
                    }}
                    placeholder="Contoh: Finance Specialist"
                    className="w-full px-2.5 py-1.5 border border-[#cbd5e1] rounded font-semibold disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#415064] mb-1">Deskripsi</label>
                  <input
                    type="text"
                    value={roleForm.description}
                    onChange={(e) => {
                      setRoleForm({ ...roleForm, description: e.target.value });
                      if (roleModalError) setRoleModalError(null);
                    }}
                    placeholder="Tujuan role ini"
                    className="w-full px-2.5 py-1.5 border border-[#cbd5e1] rounded font-semibold"
                  />
                </div>
              </div>

              <div className="border border-[#E6E1D9] rounded overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-[#FAF8F4] border-b border-[#E6E1D9]">
                  <span className="text-xs font-bold text-[#5A5046] uppercase tracking-wider">Permission Matrix</span>
                  <span className="badge font-mono text-[10px] font-bold">{roleGrants.length} grants dipilih</span>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F4] sticky top-0 shadow-2xs">
                      <tr className="text-[#5A5046] uppercase font-bold text-[11px] border-b border-[#E6E1D9]">
                        <th className="py-2 px-3">Modul</th>
                        {actions.map((action) => (
                          <th key={action} className="py-2 px-2 text-center">{action}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E1D9]">
                      {modules.map((module) => (
                        <tr key={module} className="hover:bg-[#FAF8F4]">
                          <td className="py-1.5 px-3 font-bold text-[#1A1612] font-mono">{module}</td>
                          {actions.map((action) => {
                            const exact = `${module}:${action}`;
                            const isChecked = roleGrants.includes(exact) || roleGrants.includes(`${module}:*`);
                            return (
                              <td key={`${module}-${action}`} className="py-1.5 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setRoleGrants((prev) =>
                                      prev.includes(exact) ? prev.filter((g) => g !== exact) : [...prev, exact]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 accent-[#1e2b4d] cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {roleModalError && (
                <div className="p-2.5 bg-[#f8e6e3] text-[#b3352b] border border-[#b3352b]/30 rounded flex items-center gap-2 text-xs font-bold">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{roleModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E1D9]">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-3 py-1.5 border border-[#cbd5e1] hover:bg-slate-100 rounded text-xs font-bold text-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#1e2b4d] hover:bg-[#16203b] text-white rounded text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  {roleModalMode === "create" ? "Simpan Role" : "Update Permission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT T-CODE */}
      {tcodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-2xl border border-[#E6E1D9] space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1e2b4d] text-sm flex items-center gap-1.5">
                <Hash size={16} className="text-[#a57c50]" />
                {tcodeModalMode === "create" ? "Tambah T-Code" : "Edit T-Code"}
              </h3>
              <button
                onClick={() => {
                  setTcodeModalOpen(false);
                  setTcodeTarget(null);
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-[#415064] mb-1">T-Code *</label>
                <input
                  type="text"
                  required
                  value={tcodeForm.code}
                  onChange={(e) => {
                    setTcodeForm({ ...tcodeForm, code: e.target.value.toUpperCase() });
                    if (tcodeModalError) setTcodeModalError(null);
                  }}
                  placeholder="Contoh: /nFB01"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#cbd5e1] rounded font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#415064] mb-1">Deskripsi *</label>
                <input
                  type="text"
                  required
                  value={tcodeForm.description}
                  onChange={(e) => {
                    setTcodeForm({ ...tcodeForm, description: e.target.value });
                    if (tcodeModalError) setTcodeModalError(null);
                  }}
                  placeholder="Contoh: Create Journal Entry"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#cbd5e1] rounded font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#415064] mb-1">Route Path *</label>
                <input
                  type="text"
                  required
                  value={tcodeForm.route}
                  onChange={(e) => {
                    setTcodeForm({ ...tcodeForm, route: e.target.value });
                    if (tcodeModalError) setTcodeModalError(null);
                  }}
                  placeholder="Contoh: /journal-entry"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#cbd5e1] rounded font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#415064] mb-1">Modul</label>
                  <select
                    value={tcodeForm.module}
                    onChange={(e) => {
                      setTcodeForm({ ...tcodeForm, module: e.target.value });
                      if (tcodeModalError) setTcodeModalError(null);
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-[#cbd5e1] rounded font-mono"
                  >
                    <option value="">Pilih Modul</option>
                    {modules.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#415064] mb-1">Action</label>
                  <select
                    value={tcodeForm.action}
                    onChange={(e) => {
                      setTcodeForm({ ...tcodeForm, action: e.target.value });
                      if (tcodeModalError) setTcodeModalError(null);
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-[#cbd5e1] rounded font-mono"
                  >
                    {actions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {tcodeModalError && (
              <div className="p-2.5 bg-[#f8e6e3] text-[#b3352b] border border-[#b3352b]/30 rounded flex items-center gap-2 text-xs font-bold">
                <AlertCircle size={15} className="shrink-0" />
                <span>{tcodeModalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTcodeModalOpen(false);
                  setTcodeTarget(null);
                }}
                className="px-3 py-1.5 border border-[#cbd5e1] hover:bg-slate-100 rounded text-xs font-bold text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={tcodeModalMode === "create" ? handleCreateTCode : handleUpdateTCode}
                className="px-4 py-1.5 bg-[#1e2b4d] text-white rounded text-xs font-bold shadow-xs transition hover:bg-[#16203b]"
              >
                {tcodeModalMode === "create" ? "Simpan T-Code" : "Update T-Code"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE T-CODE CONFIRMATION */}
      {deleteTcodeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-2xl border border-[#E6E1D9] space-y-3.5">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-[#1e2b4d] text-base">Konfirmasi Hapus T-Code</h3>
              <p className="text-xs text-[#6B6055]">
                Apakah Anda yakin ingin menghapus T-Code <strong>{deleteTcodeTarget.code}</strong> ({deleteTcodeTarget.description})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                onClick={() => setDeleteTcodeTarget(null)}
                className="px-3.5 py-1.5 border border-[#cbd5e1] hover:bg-slate-100 rounded text-xs font-bold text-slate-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteTCode}
                className="px-4 py-1.5 bg-[#b3352b] hover:bg-[#8f2a22] text-white rounded text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Trash2 size={12} />
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
