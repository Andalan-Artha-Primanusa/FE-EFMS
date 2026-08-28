import { useState } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { forgotPassword, login, resetPassword, verifyTwoFactorLogin, type User } from "../lib/api";
import feastLogo from "../assets/feast-logo.webp";
import mockupFeast from "../assets/mockup-feast.webp";
import andalanLogo from "../assets/andalan-logo.png";

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("admin@financeerp.local");
  const [password, setPassword] = useState("Admin@12345");
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
        <form onSubmit={submit} className="login-form">
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></label>
          {error && <div className="error">{error}</div>}
          <button className="transition disabled:cursor-wait disabled:opacity-70 !bg-[#20a6b8] !text-white hover:!bg-[#1c92a2] !shadow-[0_16px_30px_rgba(32,166,184,.25)]" disabled={loading}>{loading ? "Memeriksa..." : "Login"}</button>
          <button type="button" onClick={openForgot} className="text-xs font-bold text-slate-500 hover:text-[#20a6b8] transition inline-flex items-center gap-1.5 justify-center">
            <KeyRound size={13} /> Lupa password?
          </button>
        </form>
        ) : (
        <form onSubmit={submitOtp} className="login-form">
          <div className="flex items-center justify-center gap-2 text-[#20a6b8]">
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
          <button className="transition disabled:cursor-wait disabled:opacity-70 !bg-[#20a6b8] !text-white hover:!bg-[#1c92a2] !shadow-[0_16px_30px_rgba(32,166,184,.25)]" disabled={otpLoading}>{otpLoading ? "Memverifikasi..." : "Verifikasi & Masuk"}</button>
          <button
            type="button"
            onClick={() => setTwoFactor(null)}
            className="text-xs font-bold text-slate-500 hover:text-[#20a6b8] transition inline-flex items-center gap-1.5 justify-center"
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
      <section className="relative overflow-hidden bg-slate-950 min-h-full flex items-center justify-center p-3 sm:p-5 lg:p-6">
        <img
          src={mockupFeast}
          alt="FEAST - Financial Enterprise Andalan System"
          className="w-full h-full max-h-[94vh] object-contain object-center drop-shadow-2xl rounded-2xl select-none pointer-events-none transition duration-300 hover:scale-[1.01]"
        />
      </section>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <KeyRound size={18} className="text-[#20a6b8]" /> Reset Password
              </h3>
              <button onClick={() => setForgotOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {forgotMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">{forgotMessage}</div>
            )}
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">{forgotError}</div>
            )}

            <form onSubmit={submitForgot} className="space-y-3">
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Email Terdaftar</span>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] font-semibold text-xs"
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] font-mono text-xs"
                    />
                    <span className="block mt-1 text-[11px] text-slate-400">Token otomatis terisi dari respons server (berlaku 1 jam).</span>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-700 mb-1">Password Baru</span>
                    <input
                      type="password"
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#20a6b8] font-semibold text-xs"
                    />
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-2.5 bg-[#20a6b8] hover:bg-[#1c92a2] text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
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
