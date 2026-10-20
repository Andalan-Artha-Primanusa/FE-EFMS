import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from "lucide-react";
import { forgotPassword, login, resetPassword, verifyTwoFactorLogin, type User } from "../lib/api";
import feastLogo from "../assets/feast-logo.webp";
import loginFinanceBg from "../assets/login-finance-bg.webp";
import andalanLogo from "../assets/andalan-logo.png";

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA challenge state
  const [twoFactor, setTwoFactor] = useState<{ userId: number; email: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // Forgot / reset password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotStage, setForgotStage] = useState<"request" | "reset">("request");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password);
      if (result.requires2FA) {
        setTwoFactor({ userId: result.userId, email: result.email });
        setOtp("");
        setOtpError("");
        return;
      }
      localStorage.setItem("financeerp.token", result.token);
      localStorage.setItem("financeerp.user", JSON.stringify(result.user));
      onLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!twoFactor) return;
    if (!otp.trim()) {
      setOtpError("Kode verifikasi wajib diisi.");
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      const result = await verifyTwoFactorLogin(twoFactor.userId, otp.trim());
      localStorage.setItem("financeerp.token", result.token);
      localStorage.setItem("financeerp.user", JSON.stringify(result.user));
      onLogin(result.user);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Kode verifikasi salah.");
    } finally {
      setOtpLoading(false);
    }
  }

  function openForgot() {
    setForgotOpen(true);
    setForgotStage("request");
    setForgotEmail(email);
    setForgotMessage("");
    setForgotError("");
    setForgotToken("");
    setForgotNewPassword("");
  }

  async function submitForgot(event: React.FormEvent) {
    event.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotMessage("");
    try {
      if (forgotStage === "request") {
        const res = await forgotPassword(forgotEmail);
        if (res.resetToken) {
          setForgotToken(res.resetToken);
          setForgotStage("reset");
          setForgotMessage(res.status);
        } else {
          setForgotMessage(res.status || "Jika email terdaftar, instruksi reset telah dibuat.");
        }
      } else {
        if (forgotNewPassword.length < 8) {
          setForgotError("Password baru minimal 8 karakter.");
          return;
        }
        await resetPassword(forgotToken, forgotNewPassword);
        setForgotMessage("Password berhasil direset. Silakan login dengan password baru.");
        setTimeout(() => setForgotOpen(false), 2000);
        setForgotStage("request");
        setForgotToken("");
        setForgotNewPassword("");
      }
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <main className="login-page antialiased text-finance-ink">
      <section className="login-panel bg-white">
        <div className="login-logo mx-auto">
          <img src={feastLogo} alt="FEAST - Financial Enterprise Andalan System" />
        </div>
        {!twoFactor ? (
        <form data-enter-submit onSubmit={submit} className="login-form">
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="text" placeholder="name@company.com" /></label>
          <label>
            Password
            <div className="relative flex items-center w-full">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                className="w-full pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn-icon absolute right-3 text-slate-400 hover:text-slate-700 transition focus:outline-hidden cursor-pointer flex items-center justify-center p-0 m-0 border-0 bg-transparent shadow-none"
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <div className="error">{error}</div>}
          <button className="w-full transition disabled:cursor-wait disabled:opacity-70 !bg-[#a57c50] !text-white hover:!bg-[#8f683e] !shadow-[0_12px_24px_rgba(165,124,80,.28)] !rounded-lg !py-3 !font-extrabold text-sm" disabled={loading}>
            {loading ? "Memeriksa..." : "Login"}
          </button>
          <button
            type="button"
            onClick={openForgot}
            className="w-full transition !bg-[#261a10] !text-[#eedcc9] hover:!bg-[#3b291a] hover:!text-white !shadow-[0_12px_24px_rgba(38,26,16,.25)] !rounded-lg !py-2.5 !font-bold text-xs inline-flex items-center gap-1.5 justify-center"
          >
            <KeyRound size={13} /> Lupa password?
          </button>
        </form>
        ) : (
        <form data-enter-submit onSubmit={submitOtp} className="login-form">
          <div className="flex items-center justify-center gap-2 text-[#a57c50]">
            <ShieldCheck size={20} />
            <span className="font-bold text-sm text-slate-800">Verifikasi Dua Langkah</span>
          </div>
          <p className="text-center text-xs text-slate-500 -mt-2">
            Masukkan kode 6 digit dari aplikasi authenticator untuk <b>{twoFactor.email}</b>
          </p>
          <label>Kode Verifikasi
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="000000"
              className="text-center tracking-[0.5em] font-mono text-lg"
            />
          </label>
          {otpError && <div className="error">{otpError}</div>}
          <button className="w-full transition disabled:cursor-wait disabled:opacity-70 !bg-[#a57c50] !text-white hover:!bg-[#8f683e] !shadow-[0_12px_24px_rgba(165,124,80,.28)] !rounded-lg !py-3 !font-extrabold text-sm" disabled={otpLoading}>
            {otpLoading ? "Memverifikasi..." : "Verifikasi & Masuk"}
          </button>
          <button
            type="button"
            onClick={() => setTwoFactor(null)}
            className="w-full transition !bg-[#261a10] !text-[#eedcc9] hover:!bg-[#3b291a] hover:!text-white !shadow-[0_12px_24px_rgba(38,26,16,.25)] !rounded-lg !py-2.5 !font-bold text-xs inline-flex items-center gap-1.5 justify-center"
          >
            <KeyRound size={13} /> Kembali ke login
          </button>
        </form>
        )}
        <div className="powered-by justify-center !border-t-0">
          <span>Powered by</span>
          <img src={andalanLogo} alt="Andalan" className="!h-12 !w-auto !object-center" />
        </div>
      </section>
      <section className="relative overflow-hidden bg-slate-950 min-h-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative w-full h-full max-h-[94vh] rounded-[4px] overflow-hidden shadow-2xl border border-slate-800/80 group">
          <img
            src={loginFinanceBg}
            alt="FEAST - Financial Enterprise Andalan System Workspace"
            className="w-full h-full object-cover object-center select-none transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-extrabold tracking-wider uppercase mb-2 backdrop-blur-md w-fit">
              Financial Enterprise System
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Next-Gen Mining & Financial Accounting
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md">
              Integrasi otomatis Berita Acara, Multi-Scheme Raise & Fall, dan pembukuan Enterprise PT Andalan Artha Primanusa.
            </p>
          </div>
        </div>
      </section>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <KeyRound size={18} className="text-[#a57c50]" /> Reset Password
              </h3>
              <button onClick={() => setForgotOpen(false)} className="p-1 hover:bg-slate-100 rounded-[3px] text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {forgotMessage && (
              <div className="p-3 rounded-[3px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">{forgotMessage}</div>
            )}
            {forgotError && (
              <div className="p-3 rounded-[3px] bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">{forgotError}</div>
            )}

            <form data-enter-submit onSubmit={submitForgot} className="space-y-3">
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Email Terdaftar</span>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[3px] focus:outline-hidden focus:border-[#a57c50] font-semibold text-xs"
                />
              </label>

              {forgotStage === "reset" && (
                <>
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-700 mb-1">Token Reset</span>
                    <input
                      type="text"
                      required
                      value={forgotToken}
                      onChange={(e) => setForgotToken(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-[3px] focus:outline-hidden focus:border-[#a57c50] font-mono text-xs"
                    />
                    <span className="block mt-1 text-[11px] text-slate-400">Token otomatis terisi dari respons server (berlaku 1 jam).</span>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-700 mb-1">Password Baru</span>
                    <div className="relative flex items-center w-full">
                      <input
                        type={showForgotNewPassword ? "text" : "password"}
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Minimal 8 karakter"
                        className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-[3px] focus:outline-hidden focus:border-[#a57c50] font-semibold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="btn-icon absolute right-3 text-slate-400 hover:text-slate-700 transition focus:outline-hidden cursor-pointer flex items-center justify-center p-0 m-0 border-0 bg-transparent shadow-none"
                        title={showForgotNewPassword ? "Sembunyikan password" : "Lihat password"}
                        tabIndex={-1}
                      >
                        {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-2.5 !bg-[#a57c50] hover:!bg-[#8f683e] text-white rounded-[3px] text-xs font-bold transition disabled:opacity-50 !shadow-[0_10px_20px_rgba(165,124,80,.25)]"
              >
                {forgotLoading ? "Memproses..." : forgotStage === "request" ? "Kirim Permintaan Reset" : "Simpan Password Baru"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
