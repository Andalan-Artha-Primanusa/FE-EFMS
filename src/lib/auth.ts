import { menuPermissionMap } from "../data/navigation";
import type { Permission } from "./api";

export function isSuperAdminRole(role: string) {
  return role?.toLowerCase() === "super admin" || role?.toLowerCase() === "system administrator";
}

export function canAccessMenu(item: string, role: string, permissions: Permission[]) {
  if (isSuperAdminRole(role)) return true;
  const required = menuPermissionMap[item] ?? [];
  if (!required.length) return true;
  return required.some((grant) => {
    const [module, action] = grant.split(":");
    return permissions.some((permission) => permission.module === module && (permission.action === action || permission.action === "*"));
  });
}
