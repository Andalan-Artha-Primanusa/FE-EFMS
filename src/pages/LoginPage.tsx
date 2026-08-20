import { useState } from "react";
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
    <main className="min-h-screen w-full flex bg-white text-gray-800 font-sans">
      {/* Kiri: Form Login */}
      <section className="w-full lg:w-1/2 flex flex-col justify-between p-8 md:p-16 lg:px-24 py-12">
        <div className="flex flex-col w-full max-w-md mx-auto mt-8 lg:mt-12">
          {/* Logo FEAST */}
          <div className="mb-16">
            <img src="/feast-logo.png" alt="FEAST Logo" className="h-10 object-contain" />
          </div>
          
          {/* Teks Sambutan */}
          <h1 className="text-4xl font-semibold text-[#1e40af] mb-2 tracking-tight">Selamat Datang</h1>
          <p className="text-gray-500 mb-10 text-sm">Silakan masuk untuk melanjutkan ke pusat kendali finance.</p>
          
          {/* Form */}
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#1e40af]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="name@company.com"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#1e40af]">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Ingat Saya
              </label>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                Lupa Kata Sandi?
              </a>
            </div>

            {error && <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md mt-2 border border-red-100">{error}</div>}
            
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-medium py-3 rounded-md transition-colors disabled:opacity-70 disabled:cursor-wait"
            >
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
        </div>

        {/* Footer Powered By */}
        <div className="flex items-center justify-center lg:justify-start gap-2 mt-20 text-sm text-gray-500">
          <span>Powered by</span>
          <img src="/andalan-logo.png" alt="Andalan Logo" className="h-6 object-contain" />
        </div>
      </section>

      {/* Kanan: Visual/Foto */}
      <section className="hidden lg:block lg:w-1/2 bg-gray-100 relative">
        <img 
          src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2000&auto=format&fit=crop" 
          alt="Professional working in office" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
      </section>
    </main>
  );
}
