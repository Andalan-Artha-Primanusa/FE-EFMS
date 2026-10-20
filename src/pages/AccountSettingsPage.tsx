import { useEffect, useState } from "react";
import { ArrowLeft, Camera, KeyRound, ShieldCheck, UserRound, RefreshCw, CheckCircle2, AlertCircle, QrCode, Smartphone, History } from "lucide-react";
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

  const scope = isHeadOfficeUser(user) ? "All Company" : user.companyCode ?? "Company";
  const access = effectiveAccess(user);

  return <section className="account-page">
    <PageHeader
      title="Account Settings"
      description="Profil akun, data karyawan, akses role, keamanan login, dan riwayat aktivitas user."
      meta={<button className="ghost" onClick={onBack}><ArrowLeft size={16} /> Back</button>}
    />

    <section className="account-profile account-profile-page">
      <div className="account-avatar large">
        {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <UserRound size={48} />}
        <label title="Upload foto karyawan">
          <Camera size={15} />
          <input type="file" accept="image/*" hidden onChange={handleAvatar} />
        </label>
      </div>
      <div className="min-w-0 flex-1">
        <p className="eyebrow">Employee Account</p>
        <h2>{displayName}</h2>
        <p>{displayPosition} · {user.email}</p>
        <div className="account-badges">
          <span>{user.role}</span>
          <span className={user.status === "active" ? "ok" : "warn"}>{user.status}</span>
          <span className={twoFactorOn ? "ok" : "warn"}>2FA {twoFactorOn ? "aktif" : "nonaktif"}</span>
          <span>{scope}</span>
        </div>
      </div>
    </section>

    <div className="account-grid account-grid-page">
      <section>
        <h4><UserRound size={16} /> Data Karyawan</h4>
        <dl>
          <div><dt>Employee ID</dt><dd>EMP-{String(user.id).padStart(5, "0")}</dd></div>
          <div><dt>Full Name</dt><dd>{displayName}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Status</dt><dd className="capitalize">{user.status}</dd></div>
          <div><dt>Department</dt><dd>{displayDepartment || "—"}</dd></div>
          <div><dt>Position</dt><dd>{displayPosition}</dd></div>
          <div><dt>Phone</dt><dd>{profile?.phone || "—"}</dd></div>
          <div><dt>Company</dt><dd>{isHeadOfficeUser(user) ? "HO - All Company" : user.companyName ?? user.companyCode ?? "—"}</dd></div>
        </dl>
      </section>

      <section>
        <h4><ShieldCheck size={16} /> Akses dan Keamanan</h4>
        <dl>
          <div><dt>Role</dt><dd>{user.role}</dd></div>
          <div><dt>Login Method</dt><dd>Email + Password</dd></div>
          <div><dt>Session</dt><dd>JWT authenticated</dd></div>
          <div><dt>Scope</dt><dd>{scope}</dd></div>
          <div><dt>Password Policy</dt><dd>Managed by backend auth</dd></div>
        </dl>
        <div className={`account-2fa ${twoFactorOn ? "on" : ""}`}>
          <Smartphone size={18} />
          <div className="flex-1">
            <strong>Autentikasi Dua Faktor {twoFactorOn ? "aktif" : "nonaktif"}</strong>
            <small>{twoFactorOn ? "Login memerlukan kode authenticator." : "Tambahkan lapisan keamanan ekstra untuk login."}</small>
          </div>
          {twoFactorOn ? (
            <button onClick={openSetup} className="account-btn danger"><ShieldCheck size={13} /> Nonaktifkan</button>
          ) : (
            <button onClick={openSetup} className="account-btn"><QrCode size={13} /> Aktifkan 2FA</button>
          )}
        </div>
        {twoFaFeedback && !setupOpen && (
          <p className={`account-feedback ${twoFaFeedback.ok ? "ok" : ""}`}>
            {twoFaFeedback.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {twoFaFeedback.message}
          </p>
        )}
      </section>

      <section>
        <h4><UserRound size={16} /> Edit Profil</h4>
        <form data-enter-submit onSubmit={submitProfile} className="account-form">
          <label>
            <span>Nama Lengkap</span>
            <input value={profile?.name ?? user.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <label>
            <span>Position</span>
            <input value={profile?.position ?? ""} onChange={(e) => setProfile((p) => ({ ...p, position: e.target.value }))} placeholder="cth. Finance Manager" />
          </label>
          <label>
            <span>No. Telepon</span>
            <input value={profile?.phone ?? ""} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="cth. +62 812 3456 7890" />
          </label>
          <footer>
            {profileFeedback && (
              <p className={`account-feedback ${profileFeedback.ok ? "ok" : ""}`}>
                {profileFeedback.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {profileFeedback.message}
              </p>
            )}
            <button type="submit" disabled={profileSaving} className="account-btn">
              {profileSaving ? <RefreshCw size={13} className="animate-spin" /> : <UserRound size={13} />}
              Simpan Profil
            </button>
          </footer>
        </form>
      </section>

      <section>
        <h4><KeyRound size={16} /> Ganti Password</h4>
        <form data-enter-submit onSubmit={submitPassword} className="account-form">
          <label>
            <span>Password Lama</span>
            <input type="password" required value={pwdForm.oldPassword} onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })} />
          </label>
          <label>
            <span>Password Baru</span>
            <input type="password" required value={pwdForm.newPassword} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} placeholder="Minimal 8 karakter" />
          </label>
          <label>
            <span>Konfirmasi Password Baru</span>
            <input type="password" required value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} />
          </label>
          <footer>
            {pwdFeedback && (
              <p className={`account-feedback ${pwdFeedback.ok ? "ok" : ""}`}>
                {pwdFeedback.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {pwdFeedback.message}
              </p>
            )}
            <button type="submit" disabled={pwdSaving} className="account-btn">
              {pwdSaving ? <RefreshCw size={13} className="animate-spin" /> : <KeyRound size={13} />}
              Simpan Password
            </button>
          </footer>
        </form>
      </section>
    </div>

    <section className="permission-section account-section-page">
      <h4><ShieldCheck size={16} /> Permission Summary</h4>
      {access.length ? (
        <div className="permission-groups">
          {access.map(([module, actions]) => <div key={module}>
            <strong>{module.replace(/_/g, " ")}</strong>
            <div className="permission-tags">{actions.map((a) => <span key={a}>{a}</span>)}</div>
          </div>)}
        </div>
      ) : <p className="text-xs text-slate-500">Tidak ada permission eksplisit — akses dikontrol backend.</p>}
    </section>

    <section className="permission-section account-section-page">
      <h4><History size={16} /> Aktivitas Akun</h4>
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
        <div className="bg-white rounded-[4px] max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-sm">
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
              <form data-enter-submit onSubmit={submitDisable} className="space-y-3">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Kode OTP / Backup Code</span>
                  <input
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    autoFocus
                    placeholder="000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-[3px] focus:outline-hidden focus:border-[#20a6b8] font-mono text-xs"
                  />
                </label>
                <button type="submit" disabled={twoFaLoading} className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[3px] text-xs font-bold transition disabled:opacity-50">
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
                {setup.otpAuthUrl && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setup.otpAuthUrl)}`} alt="2FA QR Code" className="rounded-[3px] border border-slate-200" />}
              </div>
              <div className="p-3 bg-slate-50 rounded-[3px] text-center">
                <span className="block text-[11px] text-slate-400 font-bold mb-1">Secret Key</span>
                <code className="text-xs font-mono text-slate-800 break-all">{setup.secret}</code>
              </div>
              <form data-enter-submit onSubmit={submitEnable} className="space-y-3">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Kode Verifikasi</span>
                  <input
                    value={enableCode}
                    onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-[3px] focus:outline-hidden focus:border-[#20a6b8] font-mono text-xs text-center tracking-[0.4em]"
                  />
                </label>
                <button type="submit" disabled={twoFaLoading} className="w-full py-2.5 bg-[#20a6b8] hover:bg-[#1c92a2] text-white rounded-[3px] text-xs font-bold transition disabled:opacity-50">
                  {twoFaLoading ? "Memverifikasi..." : "Verifikasi & Aktifkan"}
                </button>
              </form>

              {setup.backupCodes && setup.backupCodes.length > 0 && !showBackup && (
                <button
                  type="button"
                  onClick={() => setShowBackup(true)}
                  className="w-full py-2 border border-slate-200 rounded-[3px] text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Lihat Backup Codes
                </button>
              )}
              {showBackup && setup.backupCodes && (
                <div className="p-3 rounded-[3px] bg-amber-50 border border-amber-200 space-y-1.5">
                  <p className="text-[11px] font-bold text-amber-800">Simpan kode berikut di tempat aman. Setiap kode hanya bisa dipakai sekali.</p>
                  {setup.backupCodes.map((code) => (
                    <code key={code} className="block text-xs font-mono text-amber-900 tracking-wider">{code}</code>
                  ))}
                </div>
              )}

              {twoFaFeedback && (
                <div className={`p-3 rounded-[3px] text-xs font-semibold ${twoFaFeedback.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-900" : "bg-rose-50 border border-rose-200 text-rose-900"}`}>
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

// Menampilkan akses efektif dari backend (permissions + T-Codes), dikelompokkan per modul.
// Fail-safe: jika data permission belum dimuat, kembalikan kosong alih-alih menebak hak akses.
function effectiveAccess(user: User): [string, string[]][] {
  const groups = new Map<string, Set<string>>();
  const add = (group: string, item: string) => (groups.get(group) ?? groups.set(group, new Set()).get(group)!).add(item);
  (Array.isArray(user.tcodes) ? user.tcodes : []).forEach((tc) => tc.description && add("t-code", tc.description));
  (Array.isArray(user.permissions) ? user.permissions : []).forEach((p) => p.action !== "manage" && p.action !== "*" && add(p.module, p.action));
  return [...groups].map(([group, items]) => [group, [...items]]);
}
