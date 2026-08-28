import { useEffect, useState } from "react";
import { ArrowLeft, Camera, KeyRound, ShieldCheck, UserRound, RefreshCw, CheckCircle2, AlertCircle, QrCode, Smartphone } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { changePassword, disableTwoFactor, enableTwoFactor, generateTwoFactorSetup, getProfile, updateProfile, uploadAvatar, type TwoFactorSetup, type User } from "../lib/api";
import type { AuditLog } from "../lib/api";
import { isHeadOfficeUser } from "../lib/auth";

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
  const [pwdForm, setPwdForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // Profile state
  const [profile, setProfile] = useState<Partial<{
    name: string; position: string; phone: string; avatarUrl: string; department: string; twoFactorOn: boolean;
  }> | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // 2FA state
  const [twoFactorOn, setTwoFactorOn] = useState(Boolean((user as any).twoFactorEnabled));
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [enableCode, setEnableCode] = useState("");
  const [twoFaFeedback, setTwoFaFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [showBackup, setShowBackup] = useState(false);

  async function loadProfile() {
    try {
      const p = await getProfile();
      setProfile({
        name: p.name,
        position: p.position,
        phone: p.phone,
        avatarUrl: p.avatarUrl,
        department: p.department,
        twoFactorOn: p.twoFactorOn
      });
      setTwoFactorOn(p.twoFactorOn);
    } catch {
      setProfile(null);
    }
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback(null);
    try {
      const p = await updateProfile({ name: profile?.name, position: profile?.position, phone: profile?.phone });
      setProfile({ ...profile, name: p.name, position: p.position, phone: p.phone, department: p.department, twoFactorOn: p.twoFactorOn });
      setProfileFeedback({ ok: true, message: "Profil berhasil diperbarui." });
    } catch (err: any) {
      setProfileFeedback({ ok: false, message: err?.message || "Gagal memperbarui profil." });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFeedback(null);
    try {
      const p = await uploadAvatar(file);
      setProfile((prev) => ({ ...prev, avatarUrl: p.avatarUrl }));
      setProfileFeedback({ ok: true, message: "Foto profil berhasil diunggah." });
    } catch (err: any) {
      setProfileFeedback({ ok: false, message: err?.message || "Gagal unggah foto profil." });
    }
  }

  async function openSetup() {
    setSetupOpen(true);
    setSetupLoading(true);
    setTwoFaFeedback(null);
    setEnableCode("");
    setShowBackup(false);
    try {
      const s = await generateTwoFactorSetup();
      setSetup(s);
    } catch (err: any) {
      setTwoFaFeedback({ ok: false, message: err?.message || "Gagal memulai setup 2FA." });
    } finally {
      setSetupLoading(false);
    }
  }

  async function submitEnable(e: React.FormEvent) {
    e.preventDefault();
    if (!enableCode.trim()) {
      setTwoFaFeedback({ ok: false, message: "Masukkan kode 6 digit untuk konfirmasi." });
      return;
    }
    setTwoFaLoading(true);
    setTwoFaFeedback(null);
    try {
      const res = await enableTwoFactor(enableCode.trim());
      if (res.backupCodes) setSetup({ ...setup!, backupCodes: res.backupCodes });
      setTwoFactorOn(true);
      setTwoFaFeedback({ ok: true, message: "2FA berhasil diaktifkan. Simpan backup codes Anda." });
      setEnableCode("");
    } catch (err: any) {
      setTwoFaFeedback({ ok: false, message: err?.message || "Gagal mengaktifkan 2FA." });
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function submitDisable(e: React.FormEvent) {
    e.preventDefault();
    if (!disableCode.trim()) {
      setTwoFaFeedback({ ok: false, message: "Masukkan kode OTP atau backup code untuk konfirmasi." });
      return;
    }
    setTwoFaLoading(true);
    setTwoFaFeedback(null);
    try {
      await disableTwoFactor(disableCode.trim());
      setTwoFactorOn(false);
      setDisableCode("");
      setTwoFaFeedback({ ok: true, message: "2FA berhasil dinonaktifkan." });
    } catch (err: any) {
      setTwoFaFeedback({ ok: false, message: err?.message || "Gagal menonaktifkan 2FA." });
    } finally {
      setTwoFaLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const displayName = profile?.name ?? user.name;
  const displayPosition = profile?.position ?? user.role;
  const displayDepartment = profile?.department ?? (user as any).department;
  const avatarUrl = profile?.avatarUrl ?? (user as any).avatarUrl;

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdForm.oldPassword || !pwdForm.newPassword) {
      setPwdFeedback({ ok: false, message: "Password lama dan baru wajib diisi." });
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdFeedback({ ok: false, message: "Password baru minimal 8 karakter." });
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirm) {
      setPwdFeedback({ ok: false, message: "Konfirmasi password tidak sama." });
      return;
    }
    setPwdSaving(true);
    try {
      await changePassword(pwdForm.oldPassword, pwdForm.newPassword);
      setPwdFeedback({ ok: true, message: "Password berhasil diubah." });
      setPwdForm({ oldPassword: "", newPassword: "", confirm: "" });
    } catch (err: any) {
      setPwdFeedback({ ok: false, message: err?.message || "Gagal mengubah password." });
    } finally {
      setPwdSaving(false);
    }
  }

  return <section className="account-page">
    <PageHeader
      title="Account Settings"
      description="Profil akun, data karyawan, akses role, keamanan login, dan riwayat aktivitas user."
      meta={<button className="ghost" onClick={onBack}><ArrowLeft size={16} /> Back</button>}
    />

    <section className="account-profile account-profile-page">
      <div className="account-avatar large">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
        ) : (
          <UserRound size={52} />
        )}
        <label title="Upload foto karyawan" className="cursor-pointer">
          <Camera size={16} />
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
        </label>
      </div>
      <div>
        <p className="eyebrow">Employee Account</p>
        <h2>{displayName}</h2>
        <p>{user.email}</p>
        <span className="header-meta">{displayPosition}</span>
      </div>
    </section>

    <div className="account-grid account-grid-page">
      <section>
        <h4>Data Karyawan</h4>
        <dl>
          <div><dt>Employee ID</dt><dd>EMP-{String(user.id).padStart(5, "0")}</dd></div>
          <div><dt>Full Name</dt><dd>{displayName}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Status</dt><dd>{user.status}</dd></div>
          <div><dt>Department</dt><dd>{displayDepartment ?? "Belum tersedia di API"}</dd></div>
          <div><dt>Position</dt><dd>{displayPosition}</dd></div>
          <div><dt>Phone</dt><dd>{profile?.phone || "Belum diisi"}</dd></div>
          <div><dt>Company</dt><dd>{isHeadOfficeUser(user) ? "HO - All Company" : user.companyName ?? user.companyCode ?? "Belum tersedia di API"}</dd></div>
        </dl>
      </section>

      <section>
        <h4>Akses dan Keamanan</h4>
        <dl>
          <div><dt>Role</dt><dd>{user.role}</dd></div>
          <div><dt>2FA</dt><dd>{twoFactorOn ? "Enabled" : "Not enabled"}</dd></div>
          <div><dt>Login Method</dt><dd>Email + Password</dd></div>
          <div><dt>Session</dt><dd>JWT authenticated</dd></div>
          <div><dt>Scope</dt><dd>{isHeadOfficeUser(user) ? "All Company" : user.companyCode ?? "Company"}</dd></div>
          <div><dt>Password Policy</dt><dd>Managed by backend auth</dd></div>
        </dl>
      </section>
    </div>

    <section className="permission-section account-section-page">
      <h4><UserRound size={16} /> Edit Profil</h4>
      <form onSubmit={submitProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-sm">
        <label className="block">
          <span className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</span>
          <input
            value={profile?.name ?? user.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-xs"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-slate-700 mb-1">Position</span>
          <input
            value={profile?.position ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, position: e.target.value }))}
            placeholder="cth. Finance Manager"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-xs"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-slate-700 mb-1">No. Telepon</span>
          <input
            value={profile?.phone ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            placeholder="cth. +62 812 3456 7890"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-xs"
          />
        </label>
        <div className="sm:col-span-3 flex items-center justify-between gap-3 flex-wrap">
          {profileFeedback && (
            <span className={`text-xs font-bold inline-flex items-center gap-1.5 ${profileFeedback.ok ? "text-emerald-600" : "text-rose-600"}`}>
              {profileFeedback.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {profileFeedback.message}
            </span>
          )}
          <button
            type="submit"
            disabled={profileSaving}
            className="px-4 py-2 bg-[#20a6b8] hover:bg-[#1c92a2] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition disabled:opacity-50 sm:ml-auto"
          >
            {profileSaving ? <RefreshCw size={13} className="animate-spin" /> : <UserRound size={13} />}
            Simpan Profil
          </button>
        </div>
      </form>
    </section>

    <section className="permission-section account-section-page">
      <h4><ShieldCheck size={16} /> Permission Summary</h4>
      <div className="permission-tags">
        {effectiveAccess(user).map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>

    <section className="permission-section account-section-page">
      <h4><ShieldCheck size={16} /> Autentikasi Dua Faktor (2FA)</h4>
      <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
        <div className="text-sm text-slate-600 flex items-center gap-2">
          <Smartphone size={16} className={twoFactorOn ? "text-emerald-600" : "text-slate-400"} />
          <span className="font-bold">
            {twoFactorOn
              ? "2FA aktif — masuk memerlukan kode authenticator."
              : "2FA nonaktif — tambahkan lapisan keamanan ekstra untuk login Anda."}
          </span>
        </div>
        {twoFactorOn ? (
          <button
            onClick={openSetup}
            className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-700 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition"
          >
            <ShieldCheck size={13} /> Nonaktifkan 2FA
          </button>
        ) : (
          <button
            onClick={openSetup}
            className="px-4 py-2 bg-[#20a6b8] hover:bg-[#1c92a2] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition"
          >
            <QrCode size={13} /> Aktifkan 2FA
          </button>
        )}
      </div>
      {twoFaFeedback && (
        <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${twoFaFeedback.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-900" : "bg-rose-50 border border-rose-200 text-rose-900"}`}>
          {twoFaFeedback.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {twoFaFeedback.message}
        </div>
      )}
    </section>

    <section className="permission-section account-section-page">
      <h4><KeyRound size={16} /> Ganti Password</h4>
      <form onSubmit={submitPassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-sm">
        <input
          type="password"
          required
          value={pwdForm.oldPassword}
          onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
          placeholder="Password lama"
          className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-xs"
        />
        <input
          type="password"
          required
          value={pwdForm.newPassword}
          onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
          placeholder="Password baru (min. 8 karakter)"
          className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-xs"
        />
        <input
          type="password"
          required
          value={pwdForm.confirm}
          onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
          placeholder="Konfirmasi password baru"
          className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold text-xs"
        />
        <div className="sm:col-span-3 flex items-center justify-between gap-3 flex-wrap">
          {pwdFeedback && (
            <span className={`text-xs font-bold inline-flex items-center gap-1.5 ${pwdFeedback.ok ? "text-emerald-600" : "text-rose-600"}`}>
              {pwdFeedback.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {pwdFeedback.message}
            </span>
          )}
          <button
            type="submit"
            disabled={pwdSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition disabled:opacity-50 sm:ml-auto"
          >
            {pwdSaving ? <RefreshCw size={13} className="animate-spin" /> : <KeyRound size={13} />}
            Simpan Password Baru
          </button>
        </div>
      </form>
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

    {setupOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#20a6b8]" /> {twoFactorOn ? "Nonaktifkan 2FA" : "Aktifkan 2FA"}
            </h3>
            <button onClick={() => setSetupOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">✕</button>
          </div>

          {twoFactorOn ? (
            <>
              <p className="text-slate-600 text-xs">
                Untuk menonaktifkan 2FA, masukkan kode OTP saat ini <b>atau</b> salah satu backup code Anda.
              </p>
              <form onSubmit={submitDisable} className="space-y-3">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Kode OTP / Backup Code</span>
                  <input
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    autoFocus
                    placeholder="000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] font-mono text-xs"
                  />
                </label>
                <button type="submit" disabled={twoFaLoading} className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
                  {twoFaLoading ? "Memproses..." : "Nonaktifkan 2FA"}
                </button>
              </form>
            </>
          ) : setupLoading ? (
            <div className="text-center py-6 text-slate-500 text-xs">Menyiapkan kunci 2FA...</div>
          ) : setup ? (
            <>
              <p className="text-slate-600 text-xs">
                Pindai kode QR di bawah dengan aplikasi authenticator (Google Authenticator, Authy, dll),
                lalu masukkan kode 6 digit untuk konfirmasi.
              </p>
              <div className="flex justify-center">
                {setup.otpAuthUrl && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setup.otpAuthUrl)}`} alt="2FA QR Code" className="rounded-xl border border-slate-200" />}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <span className="block text-[11px] text-slate-400 font-bold mb-1">Secret Key</span>
                <code className="text-xs font-mono text-slate-800 break-all">{setup.secret}</code>
              </div>
              <form onSubmit={submitEnable} className="space-y-3">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Kode Verifikasi</span>
                  <input
                    value={enableCode}
                    onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] font-mono text-xs text-center tracking-[0.4em]"
                  />
                </label>
                <button type="submit" disabled={twoFaLoading} className="w-full py-2.5 bg-[#20a6b8] hover:bg-[#1c92a2] text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
                  {twoFaLoading ? "Memverifikasi..." : "Verifikasi & Aktifkan"}
                </button>
              </form>

              {setup.backupCodes && setup.backupCodes.length > 0 && !showBackup && (
                <button
                  type="button"
                  onClick={() => setShowBackup(true)}
                  className="w-full py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Lihat Backup Codes
                </button>
              )}
              {showBackup && setup.backupCodes && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <p className="text-[11px] font-bold text-amber-800">Simpan kode berikut di tempat aman. Setiap kode hanya bisa dipakai sekali.</p>
                  {setup.backupCodes.map((code) => (
                    <code key={code} className="block text-xs font-mono text-amber-900 tracking-wider">{code}</code>
                  ))}
                </div>
              )}

              {twoFaFeedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${twoFaFeedback.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-900" : "bg-rose-50 border border-rose-200 text-rose-900"}`}>
                  {twoFaFeedback.message}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    )}
  </section>;
}

// Menampilkan akses efektif dari backend (permissions + T-Codes), bukan tebakan nama role.
// Fail-safe: jika data permission belum dimuat, tampilkan peringatan alih-alih menebak hak akses.
function effectiveAccess(user: User): string[] {
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  const tcs = Array.isArray(user.tcodes) ? user.tcodes : [];

  if (!perms.length && !tcs.length) {
    return ["Permission data not loaded — access is enforced by backend"];
  }

  const labels: string[] = [];
  const seen = new Set<string>();
  tcs.forEach((tc) => {
    if (tc.description && !seen.has(tc.description)) {
      seen.add(tc.description);
      labels.push(tc.description);
    }
  });
  perms.forEach((p) => {
    if (p.action === "manage" || p.action === "*") return;
    const label = `${p.module} : ${p.action}`;
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  });
  return labels.length ? labels : ["No explicit permissions"];
}
