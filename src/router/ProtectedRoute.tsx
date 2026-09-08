import { useOutletContext } from "react-router-dom";
import { type Permission, type RoleAccess, type User } from "../lib/api";
import { canAccessMenu } from "../lib/auth";
import { PermissionDeniedPage } from "../pages/PermissionDeniedPage";

export interface AppContext {
  user: User;
  permissions: Permission[];
  roles: RoleAccess[];
  notice: string;
  setNotice: (msg: string) => void;
}

interface ProtectedRouteProps {
  requiredView: string;
  children: React.ReactNode;
}

export function ProtectedRoute({ requiredView, children }: ProtectedRouteProps) {
  const { user, permissions } = useOutletContext<AppContext>();

  if (!canAccessMenu(requiredView, user.role, permissions, undefined, user)) {
    return <PermissionDeniedPage requiredView={requiredView} />;
  }

  return <>{children}</>;
}
