import { useState } from "react";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/LoginPage";
import type { User } from "./lib/api";

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("financeerp.user");
    return raw ? JSON.parse(raw) : null;
  });

  return user ? <AppShell user={user} onLogout={() => setUser(null)} /> : <LoginPage onLogin={setUser} />;
}
