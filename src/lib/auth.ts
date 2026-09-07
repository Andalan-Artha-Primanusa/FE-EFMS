import { useEffect, useState } from "react";
import { menuPermissionMap } from "../data/navigation";
import { DEFAULT_COMPANIES, getCompanies, type Company, type Permission, type RoleAccess, type TCode, type User } from "./api";

export function isSuperAdminRole(role: string) {
  const normalized = role?.toLowerCase() ?? "";
  return normalized === "super admin" || normalized === "super_admin" || normalized === "system administrator" || normalized === "erp super admin" || normalized.includes("super admin") || normalized.includes("super_admin");
}

// RBAC check for Coal Index: Hanya Finance SPV, FATB Manager, dan Direktur (+ Super Admin)
export function canManageCoalIndex(user?: User): boolean {
  if (!user) return false;
  const role = (user.role ?? "").toLowerCase().trim();
  if (isSuperAdminRole(role)) return true;

  // Finance SPV / Supervisor
  if (
    role.includes("spv") ||
    role.includes("supervisor") ||
    role.includes("superintendent") ||
    role.includes("finance specialist")
  ) {
    return true;
  }

  // FATB Manager / Finance Manager / Department Head FATB
  if (
    role.includes("manager") ||
    role.includes("fatb")
  ) {
    return true;
  }

  // Direktur / Director / C-Level / General Manager
  if (
    role.includes("director") ||
    role.includes("direktur") ||
    role.includes("c-level") ||
    role.includes("general manager") ||
    role.includes("cfo") ||
    role.includes("ceo")
  ) {
    return true;
  }

  return false;
}

// Audit Trail (dan Notification) access driven by permission/T-Code — backend module
// "audit_trail" (read) dengan T-Code GOV_AUDIT / GOV_NOTIF. Bukan dari nama role.
// Fail-closed: tanpa permission/T-Code yang relevan, tidak dapat melihat.
export function canViewAuditTrail(user?: User): boolean {
  return authorized(user, "audit_trail", "read", "GOV_AUDIT");
}

// Effective default organizational scope of a ROLE, from backend metadata
// (role.scopeType / isSystem). Falling back only for legacy/unknown role records
// is as safe (non-elevating) and never keys on a role name for security.
export function roleScopeOf(role: Partial<RoleAccess>): "GLOBAL" | "HO" | "SITE" {
  const st = (role.scopeType || "").toUpperCase();
  if (st === "GLOBAL" || st === "HO" || st === "SITE") return st as "GLOBAL" | "HO" | "SITE";
  if (role.isSystem || isSuperAdminRole(role.role ?? "")) return "GLOBAL";
  return "SITE";
}

// Assignable roles for create/edit user. Driven by (a) the ACTING USER's effective
// scope (user.scopeType) and (b) each role's DEFAULT metadata scope from the backend
// (role.scopeType / isSystem). Mirrors backend CanManageRoleAtScope + RoleScopeType:
//   GLOBAL -> semua assignable role
//   HO     -> role HO & SITE (bukan GLOBAL / Super Admin)
//   SITE   -> hanya role SITE
export function rolesAssignableBy(currentUser: User, roleRecords: RoleAccess[]): string[] {
  const st = userScopeType(currentUser);
  const names = (r: RoleAccess) => r.role;
  if (st === "GLOBAL") return roleRecords.map(names);
  if (st === "HO") {
    return roleRecords.filter((r) => roleScopeOf(r) !== "GLOBAL").map(names);
  }
  return roleRecords.filter((r) => roleScopeOf(r) === "SITE").map(names);
}

// Central feature/action authorization (NOT data scope). Drives FE action guards
// from the user's effective permissions (module:action) and optionally a T-Code.
// Mirrors the backend requirePermission/checkRolePermission model so FE and BE agree.
// Super Admin bypasses; otherwise unknown/absent permission is treated as DENY (fail-closed).
export function hasPermission(permissions: Permission[], module: string, action: string): boolean {
  return Array.isArray(permissions) && permissions.some(
    (p) => p.module === module && (p.action === action || p.action === "*")
  );
}

export function hasTCode(tcodes: TCode[], code: string): boolean {
  return Array.isArray(tcodes) && tcodes.some((t) => t.code === code);
}

export function userPermissionsOf(user?: User): Permission[] {
  return user && Array.isArray(user.permissions) ? user.permissions : [];
}

export function userTCodesOf(user?: User): TCode[] {
  return user && Array.isArray(user.tcodes) ? user.tcodes : [];
}

// Check whether the acting user may perform the given module:action. When a T-Code is
// supplied and the user has T-Codes loaded, the T-Code is authoritative (fail-closed).
export function authorized(
  user: User | undefined,
  module: string,
  action: string,
  tcode?: string
): boolean {
  const role = user?.role ?? "";
  if (isSuperAdminRole(role)) return true;
  const tcodes = userTCodesOf(user);
  if (tcode && tcodes.length > 0) {
    return hasTCode(tcodes, tcode);
  }
  return hasPermission(userPermissionsOf(user), module, action);
}

export function canAccessMenu(item: string, role: string, permissions: Permission[], tcodes?: TCode[], user?: User) {
  if (isSuperAdminRole(role)) return true;

  // Site-specific Master Data restrictions:
  // For site accounts (scope SITE / role includes "site"):
  // Master data only allows "RAISE & FALL", and even then strictly for BGG and POS sites.
  const isSiteUser = (user && !isHeadOfficeUser(user)) || (role && role.toLowerCase().includes("site"));
  if (isSiteUser) {
    const isMasterDataItem = [
      "Chart of Accounts", "Company", "Site", "Department", "Cost Center", "Project",
      "Vendor", "Client Setup", "Customer Master & Credit Terms", "Customer", "Employee",
      "Bank", "Tax", "Currency", "Coal Index", "Variable SOW", "RAISE & FALL"
    ].includes(item);

    if (isMasterDataItem) {
      if (item !== "RAISE & FALL") return false;
      const userSite = (user?.companyCode || (user ? companyScopeOf(user).codes[0] : "") || "").toUpperCase();
      const roleUpper = (role || "").toUpperCase();
      const isBGGorPOS = userSite === "BGG" || userSite === "POS" || roleUpper.includes("BGG") || roleUpper.includes("POS");
      if (!isBGGorPOS) return false;
      return true;
    }
  }

  if (tcodes && tcodes.length > 0) {
    const itemSlug = item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return tcodes.some((tc) => {
      const tcSlug = tc.route.replace(/^\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return tcSlug === itemSlug || tc.description.toLowerCase() === item.toLowerCase();
    });
  }

  // Fail-closed RBAC: unmapped menu item => access denied by default
  const required = menuPermissionMap[item] ?? null;
  if (required === null) return false;
  if (!required.length) return true; // explicitly-empty = intentionally open
  return required.some((grant) => {
    const [module, action] = grant.split(":");
    return permissions.some((permission) => permission.module === module && (permission.action === action || permission.action === "*"));
  });
}

// Returns effective scope type: GLOBAL | HO | SITE. Prefers the authoritative
// scopeType sent by the backend, falling back to legacy heuristics.
export function userScopeType(user: User): "GLOBAL" | "HO" | "SITE" {
  const st = (user.scopeType || "").toUpperCase();
  if (st === "GLOBAL" || st === "HO" || st === "SITE") return st as "GLOBAL" | "HO" | "SITE";
  if (isSuperAdminRole(user.role)) return "GLOBAL";
  const role = user.role?.toLowerCase() ?? "";
  const company = `${user.companyCode ?? ""} ${user.companyName ?? ""}`.toLowerCase();
  const hoish = user.isHeadOffice === true || user.companyScope === "ALL" || role.includes(" ho") || role.endsWith("ho") || company.includes("head office") || company === "ho";
  return hoish ? "HO" : "SITE";
}

export function isHeadOfficeUser(user: User) {
  const st = userScopeType(user);
  return st === "GLOBAL" || st === "HO";
}

export function companyScopeOf(user: User) {
  if (isHeadOfficeUser(user)) return { all: true, codes: [] as string[], ids: [] as number[], names: [] as string[] };
  const codes = Array.isArray(user.companyScope)
    ? user.companyScope
    : user.companyCode
    ? [user.companyCode]
    : [];
  const ids = typeof user.companyId === "number" ? [user.companyId] : [];
  const names = user.companyName ? [user.companyName.toLowerCase()] : [];
  return { all: false, codes: codes.map((code) => code.toUpperCase()), ids, names };
}

let cachedCompanies: Company[] = [...DEFAULT_COMPANIES];
let companyLoadPromise: Promise<Company[]> | null = null;

// Loads the company list from the backend (/api/companies) once and caches it.
// All FE dropdowns consume this cache so nothing is hardcoded client-side.
export function loadCompanies(): Promise<Company[]> {
  if (!companyLoadPromise) {
    companyLoadPromise = getCompanies()
      .then((companies) => (Array.isArray(companies) && companies.length > 0 ? companies : DEFAULT_COMPANIES))
      .then((companies) => {
        cachedCompanies = companies;
        return companies;
      })
      .catch(() => {
        cachedCompanies = DEFAULT_COMPANIES;
        return DEFAULT_COMPANIES;
      });
  }
  return companyLoadPromise;
}

export function getCachedCompanies(): Company[] {
  return cachedCompanies;
}

export async function reloadCompanies(): Promise<Company[]> {
  companyLoadPromise = null;
  const companies = await loadCompanies();
  return companies;
}

export function companyOptionsForUser(user: User): Company[] {
  const scope = companyScopeOf(user);
  const all = getCachedCompanies();
  if (scope.all) return all;
  const sanity = (c: Company) => (Number.isFinite(Number(c.id)) ? Number(c.id) : -1);
  const byCode = all.filter((company) => scope.codes.includes(String(company.code ?? "").toUpperCase()));
  const byId = all.filter((company) => scope.ids.includes(sanity(company)));
  const options = [...byCode, ...byId].filter((company, index, list) => list.findIndex((item) => String(item.id) === String(company.id)) === index);
  if (options.length) return options;
  const fallback = all.filter((company) => String(company.code ?? "").toUpperCase() === String(user.companyCode ?? "").toUpperCase());
  if (fallback.length) return fallback;
  if (user.companyId != null && Number.isFinite(Number(user.companyId))) {
    const bySelfId = all.filter((company) => Number(company.id) === Number(user.companyId));
    if (bySelfId.length) return bySelfId;
  }
  return all.length ? [all[0]] : [];
}

// React hook: loads the company list (API-backed) and returns the scoped options
// for the given user, re-rendering once the data arrives.
export function useCompanyOptions(user: User): { companies: Company[]; options: Company[]; loading: boolean } {
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(getCachedCompanies().length === 0);
  useEffect(() => {
    loadCompanies().finally(() => {
      setLoading(false);
      setTick((t) => t + 1);
    });
  }, []);
  void tick;
  return { companies: getCachedCompanies(), options: companyOptionsForUser(user), loading };
}

export function companyCodeOf(row: any) {
  const metadata = typeof row?.metadata === "string" ? safeJson(row.metadata) : row?.metadata;
  return String(row?.companyCode ?? row?.customerCode ?? metadata?.companyCode ?? metadata?.customerCode ?? "").toUpperCase();
}

export function companyNameOf(row: any) {
  const metadata = typeof row?.metadata === "string" ? safeJson(row.metadata) : row?.metadata;
  return String(row?.companyName ?? row?.company ?? row?.customerName ?? metadata?.companyName ?? "").toLowerCase();
}

export function companyIdOf(row: any) {
  const metadata = typeof row?.metadata === "string" ? safeJson(row.metadata) : row?.metadata;
  const value = row?.companyId ?? row?.company_id ?? metadata?.companyId;
  return value == null ? null : Number(value);
}

export function canAccessCompanyRow(row: any, user: User) {
  const scope = companyScopeOf(user);
  if (scope.all) return true;
  const rowCompanyCode = companyCodeOf(row);
  const rowCompanyId = companyIdOf(row);
  const rowCompanyName = companyNameOf(row);
  if (!rowCompanyCode && !rowCompanyId && !rowCompanyName) return true;
  return (rowCompanyCode && scope.codes.includes(rowCompanyCode)) || (rowCompanyId != null && scope.ids.includes(rowCompanyId)) || (rowCompanyName && scope.names.some((name) => rowCompanyName.includes(name) || name.includes(rowCompanyName)));
}

export function filterRowsByCompanyScope<T>(rows: T[], user: User) {
  return rows.filter((row) => canAccessCompanyRow(row, user));
}

export function scopedEndpoint(endpoint: string, user: User) {
  const scope = companyScopeOf(user);
  if (scope.all || endpoint.includes("companyCode=") || endpoint.includes("companyId=")) return endpoint;
  const params = new URLSearchParams();
  if (scope.codes[0]) params.set("companyCode", scope.codes[0]);
  if (scope.ids[0] != null) params.set("companyId", String(scope.ids[0]));
  const suffix = params.toString();
  if (!suffix) return endpoint;
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${suffix}`;
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
