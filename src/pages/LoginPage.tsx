import { useState } from "react";
import { LockKeyhole } from "lucide-react";
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
    <main className="login-page antialiased text-finance-ink">
      <section className="login-panel bg-white">
        <div className="login-logo mx-auto"><img src="/feast-logo.png" alt="FEAST - Financial Enterprise Andalan System" /></div>
        <form onSubmit={submit} className="login-form">
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></label>
          {error && <div className="error">{error}</div>}
          <button className="transition disabled:cursor-wait disabled:opacity-70 !bg-[#20a6b8] !text-white hover:!bg-[#1c92a2] !shadow-[0_16px_30px_rgba(32,166,184,.25)]" disabled={loading}>{loading ? "Memeriksa..." : "Login"}</button>
        </form>
        <div className="powered-by justify-center !border-t-0">
          <span>Powered by</span>
          <img src="/andalan-logo.png" alt="Andalan" className="!h-12 !w-auto !object-center" />
        </div>
      </section>
      <section className="relative overflow-hidden bg-slate-900">
        <img 
          src="http://content.didimax.co.id/Upload/2023/01/16/zcvERBwM/20230116090648517.jpg" 
          alt="Professional working in office" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-slate-900/20"></div>
      </section>
    </main>
  );
}
