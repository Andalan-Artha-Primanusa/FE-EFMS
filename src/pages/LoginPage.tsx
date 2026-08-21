import { useState } from "react";
<<<<<<< HEAD
=======
import { LockKeyhole } from "lucide-react";
>>>>>>> mockup-fe
import { login, type User } from "../lib/api";

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("admin@financeerp.local");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password);
      localStorage.setItem("financeerp.token", result.token);
      localStorage.setItem("financeerp.user", JSON.stringify(result.user));
      onLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
<<<<<<< HEAD
    <main className="min-h-screen w-full flex bg-white text-gray-900 font-sans">
      {/* Kiri: Form Login */}
      <section className="w-full lg:w-5/12 xl:w-1/2 flex flex-col justify-between px-6 py-10 sm:px-12 sm:py-16 lg:px-20 xl:px-32 relative z-10">
        
        {/* Header Logo */}
        <div className="flex-none">
          <img src="/feast-logo.png" alt="FEAST Logo" className="h-16 sm:h-20 object-contain" />
        </div>

        {/* Center Form */}
        <div className="flex-1 flex flex-col justify-center w-full max-w-lg mx-auto py-12 lg:py-0">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1e40af] mb-3 tracking-tight">Selamat Datang</h1>
          <p className="text-gray-500 mb-10 text-base sm:text-lg">Silakan masuk untuk melanjutkan ke pusat kendali finance.</p>
          
          <form onSubmit={submit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <label className="text-sm sm:text-base font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition-all text-base sm:text-lg"
                placeholder="name@company.com"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2.5">
              <label className="text-sm sm:text-base font-semibold text-gray-700">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition-all text-base sm:text-lg"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-3 text-sm sm:text-base text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-[#1e40af] focus:ring-[#1e40af]" />
                Ingat Saya
              </label>
              <a href="#" className="text-sm sm:text-base text-[#1e40af] hover:text-blue-800 font-medium transition-colors">
                Lupa Kata Sandi?
              </a>
            </div>

            {error && <div className="text-red-600 text-sm sm:text-base p-4 bg-red-50 rounded-xl border border-red-100">{error}</div>}
            
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-[#1e40af]/30 disabled:opacity-70 disabled:cursor-wait text-lg"
            >
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
        </div>

        {/* Footer Powered By */}
        <div className="flex-none flex items-center gap-3 text-sm sm:text-base text-gray-500 pt-8 border-t border-gray-100">
          <span>Powered by</span>
          <img src="/andalan-logo.png" alt="Andalan Logo" className="h-8 sm:h-10 object-contain" />
        </div>
      </section>

      {/* Kanan: Visual/Foto */}
      <section className="hidden lg:block lg:w-7/12 xl:w-1/2 bg-gray-900 relative overflow-hidden">
        {/* Gambar placeholder, user bisa ganti URL-nya */}
        <img 
          src="http://content.didimax.co.id/Upload/2023/01/16/zcvERBwM/20230116090648517.jpg" 
          alt="Professional working in office" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        {/* Overlay agar gambar tidak terlalu gelap tapi tetap bertekstur enterprise */}
        <div className="absolute inset-0 bg-[#0f172a]/10"></div>
=======
    <main className="login-page antialiased text-finance-ink">
      <section className="login-panel bg-white">
        <div className="login-logo"><img src="/feast-logo.webp" alt="FEAST - Financial Enterprise Andalan System" /></div>
        <p className="eyebrow">Financial Enterprise Andalan System</p>
        <h1>Masuk ke pusat kendali finance end-to-end.</h1>
        <p className="login-copy">Kelola budget, approval, AP/AR, cash bank, accounting engine, closing, dan management dashboard dalam satu workflow.</p>
        <form onSubmit={submit} className="login-form">
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></label>
          {error && <div className="error">{error}</div>}
          <button className="transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70" disabled={loading}>{loading ? "Memeriksa..." : "Login"}</button>
        </form>
        <div className="login-foot">
          <span><LockKeyhole size={16} /> RBAC, 2FA-ready, audit trail</span>
          <a>Lupa password</a>
        </div>
        <div className="powered-by">
          <span>Powered by</span>
          <img src="/andalan-logo.png" alt="Andalan" />
        </div>
      </section>
      <section className="login-visual">
        <div className="visual-copy">
          <span>Finance Operations</span>
          <strong>Real-time financial governance for multi-level approval and closing.</strong>
        </div>
        <div className="visual-grid">
          {["Budget Lock", "Multi Approval", "Auto Journal", "Bank Reconcile", "AP Aging", "AR Collection"].map((item) => <span key={item}>{item}</span>)}
        </div>
>>>>>>> mockup-fe
      </section>
    </main>
  );
}
