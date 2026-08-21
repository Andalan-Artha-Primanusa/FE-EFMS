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
      </section>
    </main>
  );
}
