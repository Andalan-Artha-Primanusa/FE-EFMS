import { ArrowLeft, Camera, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import type { AuditLog, User } from "../lib/api";

export function AccountSettingsPage({
  user,
  auditLogs,
  onBack
}: {
  user: User;
  auditLogs: AuditLog[];
  onBack: () => void;
}) {
  const userLogs = auditLogs.filter((log) => !log.user || log.user === user.name).slice(0, 12);

  return <section className="account-page">
    <PageHeader
      title="Account Settings"
      description="Profil akun, data karyawan, akses role, keamanan login, dan riwayat aktivitas user."
      meta={<button className="ghost" onClick={onBack}><ArrowLeft size={16} /> Back</button>}
    />

    <section className="account-profile account-profile-page">
      <div className="account-avatar large">
        <UserRound size={52} />
        <button title="Upload foto karyawan"><Camera size={16} /></button>
      </div>
      <div>
        <p className="eyebrow">Employee Account</p>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <span className="header-meta">{user.role}</span>
      </div>
    </section>

    <div className="account-grid account-grid-page">
      <section>
        <h4>Data Karyawan</h4>
        <dl>
          <div><dt>Employee ID</dt><dd>EMP-{String(user.id).padStart(5, "0")}</dd></div>
          <div><dt>Full Name</dt><dd>{user.name}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Status</dt><dd>{user.status}</dd></div>
          <div><dt>Department</dt><dd>Belum tersedia di API</dd></div>
          <div><dt>Position</dt><dd>{user.role}</dd></div>
          <div><dt>Company</dt><dd>Belum tersedia di API</dd></div>
        </dl>
      </section>

      <section>
        <h4>Akses dan Keamanan</h4>
        <dl>
          <div><dt>Role</dt><dd>{user.role}</dd></div>
          <div><dt>2FA</dt><dd>{user.twoFactorEnabled ? "Enabled" : "Not enabled"}</dd></div>
          <div><dt>Login Method</dt><dd>Email + Password</dd></div>
          <div><dt>Session</dt><dd>JWT authenticated</dd></div>
          <div><dt>Scope</dt><dd>Company, Site, Department, Project</dd></div>
          <div><dt>Password Policy</dt><dd>Managed by backend auth</dd></div>
        </dl>
      </section>
    </div>

    <section className="permission-section account-section-page">
      <h4><ShieldCheck size={16} /> Permission Summary</h4>
      <div className="permission-tags">
        {permissionHints(user.role).map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>

    <section className="permission-section account-section-page">
      <h4><KeyRound size={16} /> Aktivitas Akun</h4>
      <div className="account-activity account-activity-page">
        {userLogs.map((log) => <div key={log.id}>
          <strong>{log.action} - {log.module}</strong>
          <span>{log.referenceType} #{log.referenceId}</span>
          <small>{new Date(log.createdAt).toLocaleString("id-ID")}</small>
        </div>)}
        {!userLogs.length && <p>Belum ada audit log spesifik untuk akun ini.</p>}
      </div>
    </section>
  </section>;
}

function permissionHints(role: string) {
  if (role === "Super Admin") return ["Full access", "User & Role Management", "Master Data", "Approval", "Accounting", "Audit Trail"];
  if (role.includes("Finance")) return ["Approval", "Accounting", "Financial Report", "Dashboard"];
  if (role.includes("Budget")) return ["Budget Management", "Budget Control", "Approval"];
  return ["Read Master Data", "Submit Request", "View Dashboard"];
}
