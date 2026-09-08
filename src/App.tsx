import { useState, lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import type { User } from "./lib/api";

const AuthenticatedApp = lazy(() => import("./AuthenticatedApp").then((m) => ({ default: m.AuthenticatedApp })));

function ShellLoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
      <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Memuat FEAST ERP...</span>
    </div>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("financeerp.user");
      if (!raw || raw === "undefined" || raw === "null") return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse user from localStorage:", e);
      localStorage.removeItem("financeerp.user");
      return null;
    }
  });

  return (
    <BrowserRouter>
      {!user ? (
        <Routes>
          <Route path="*" element={<LoginPage onLogin={setUser} />} />
        </Routes>
      ) : (
        <Suspense fallback={<ShellLoadingFallback />}>
          <AuthenticatedApp user={user} onLogout={() => setUser(null)} />
        </Suspense>
      )}
    </BrowserRouter>
  );
}
