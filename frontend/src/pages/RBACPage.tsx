import { ShieldCheck, UsersRound } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import type { Permission, RoleAccess, User } from "../lib/api";

export function RBACPage({
  user,
  roles,
  myPermissions
}: {
  user: User;
  roles: RoleAccess[];
  myPermissions: Permission[];
}) {
  const modules = Array.from(new Set(roles.flatMap((role) => role.permissions.map((permission) => permission.module)))).sort();
  const actions = Array.from(new Set(roles.flatMap((role) => role.permissions.map((permission) => permission.action)))).sort();

  if (user.role !== "Super Admin") {
    return <PageHeader title="Access Denied" description="Menu RBAC hanya tersedia untuk Super Admin." />;
  }

  return <section className="rbac-page">
    <PageHeader
      title="RBAC Management"
      description="Kontrol role, permission, scope akses, dan visibilitas menu frontend berdasarkan permission backend."
      meta={<span className="header-meta">Super Admin Only</span>}
    />

    <section className="rbac-summary">
      <article><UsersRound size={20} /><span>Roles</span><strong>{roles.length}</strong></article>
      <article><ShieldCheck size={20} /><span>Permission Catalog</span><strong>{modules.length} modules</strong></article>
      <article><ShieldCheck size={20} /><span>Current User Grants</span><strong>{myPermissions.length}</strong></article>
    </section>

    <section className="rbac-grid">
      <div className="rbac-card">
        <div className="panel-head"><h3>Role Access Detail</h3><span>{roles.length} role</span></div>
        <div className="rbac-role-list">
          {roles.map((role) => <article key={role.role}>
            <header>
              <strong>{role.role}</strong>
              <span>{role.permissions.length} permissions</span>
            </header>
            <p>Scopes: {role.scopes.join(", ")}</p>
            <div className="permission-tags">
              {role.permissions.slice(0, 12).map((permission) => <span key={`${role.role}-${permission.module}-${permission.action}`}>{permission.module}:{permission.action}</span>)}
              {role.permissions.length > 12 && <span>+{role.permissions.length - 12} more</span>}
            </div>
          </article>)}
        </div>
      </div>

      <div className="rbac-card">
        <div className="panel-head"><h3>Permission Matrix</h3><span>{modules.length} modules</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Module</th>{actions.map((action) => <th key={action}>{action}</th>)}</tr></thead>
            <tbody>
              {modules.map((module) => <tr key={module}>
                <td>{module}</td>
                {actions.map((action) => <td key={`${module}-${action}`}>{roles.some((role) => role.permissions.some((permission) => permission.module === module && permission.action === action)) ? "Available" : "-"}</td>)}
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section className="rbac-card">
      <div className="panel-head"><h3>Frontend Menu Rule</h3><span>Permission based</span></div>
      <p className="rbac-note">Sidebar hanya menampilkan menu ketika user punya minimal satu permission yang dibutuhkan menu tersebut. Menu RBAC Management, Role and Permission, dan System Settings hanya tampil untuk permission <strong>user_management:manage</strong>, sehingga secara default hanya Super Admin yang melihatnya.</p>
    </section>
  </section>;
}
