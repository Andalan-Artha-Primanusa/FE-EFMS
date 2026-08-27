import { menuPermissionMap } from "../data/navigation";
import type { Permission, TCode, User } from "./api";

export function isSuperAdminRole(role: string) {
  const normalized = role?.toLowerCase() ?? "";
  return normalized === "super admin" || normalized === "system administrator" || normalized === "erp super admin" || normalized.includes("super admin");
}

export function canViewAuditTrail(role: string) {
  const normalized = role?.toLowerCase() ?? "";
  return isSuperAdminRole(role) || normalized.includes("manager") || normalized.includes("admin");
}

export function canAccessMenu(item: string, role: string, permissions: Permission[], tcodes?: TCode[]) {
  if (isSuperAdminRole(role)) return true;
  if (item === "Audit Trail" && canViewAuditTrail(role)) return true;

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

export function isHeadOfficeUser(user: User) {
  const role = user.role?.toLowerCase() ?? "";
  const company = `${user.companyCode ?? ""} ${user.companyName ?? ""}`.toLowerCase();
  return isSuperAdminRole(user.role) || user.isHeadOffice === true || user.companyScope === "ALL" || role.includes(" ho") || role.endsWith("ho") || company.includes("head office") || company === "ho";
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
