import { menuPermissionMap } from "../data/navigation";
import type { Permission, RoleAccess, TCode, User } from "./api";

export function isSuperAdminRole(role: string) {
  const normalized = role?.toLowerCase() ?? "";
  return normalized === "super admin" || normalized === "system administrator" || normalized === "erp super admin" || normalized.includes("super admin");
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

export function canAccessMenu(item: string, role: string, permissions: Permission[], tcodes?: TCode[]) {
  if (isSuperAdminRole(role)) return true;

  if (tcodes && tcodes.length > 0) {
    const itemSlug = item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return tcodes.some((tc) => {
      const tcSlug = tc.route.replace(/^\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return tcSlug === itemSlug || tc.description.toLowerCase() === item.toLowerCase();
    });
  }

  const required = menuPermissionMap[item] ?? [];
  if (!required.length) return true;
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

export const defaultCompanyOptions = [
  { id: 1, code: "HO", name: "Head Office" },
  { id: 2, code: "AAP", name: "PT Andalan Artha Primanusa" },
  { id: 3, code: "BGG", name: "PT Budi Gema Gempita" },
  { id: 4, code: "POS", name: "PT Prima Orbit Sejahtera" },
  { id: 5, code: "SBS", name: "PT Sumber Bara Sejahtera" },
  { id: 6, code: "DBK", name: "PT Duta Bara Kaltim" }
];

export function companyOptionsForUser(user: User) {
  const scope = companyScopeOf(user);
  if (scope.all) return defaultCompanyOptions;
  const byCode = defaultCompanyOptions.filter((company) => scope.codes.includes(company.code));
  const byId = defaultCompanyOptions.filter((company) => scope.ids.includes(company.id));
  const options = [...byCode, ...byId].filter((company, index, list) => list.findIndex((item) => item.id === company.id) === index);
  if (options.length) return options;
  return [{ id: user.companyId ?? 1, code: user.companyCode ?? "COMPANY", name: user.companyName ?? user.companyCode ?? "Company User" }];
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
  if (!rowCompanyCode && !rowCompanyId && !rowCompanyName) return false;
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
