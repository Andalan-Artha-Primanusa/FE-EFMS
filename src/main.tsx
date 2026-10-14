import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/app.css";

// Prevent mouse wheel on number inputs from changing values during scroll
document.addEventListener("wheel", () => {
  if (document.activeElement && (document.activeElement as HTMLInputElement).type === "number") {
    (document.activeElement as HTMLElement).blur();
  }
}, { passive: true });

// Koma di input angka = desimal (seperti titik/numpad), sama seperti Excel
document.addEventListener("keydown", (e) => {
  const el = e.target as HTMLInputElement;
  if (e.key === "," && el?.tagName === "INPUT" && el.type === "number") {
    e.preventDefault();
    document.execCommand("insertText", false, ".");
  }
});

// Form data: Enter di input tidak menyimpan (kebiasaan Enter setelah isi angka); simpan pakai Ctrl+S.
// Form bertanda data-enter-submit (login, password, OTP) tetap submit dengan Enter.
const SUBMIT_BTN = 'button[type="submit"]:not(:disabled), button:not([type]):not(:disabled), input[type="submit"]:not(:disabled)';
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const el = e.target as HTMLInputElement;
    if (el?.tagName === "INPUT" && el.form && !el.form.hasAttribute("data-enter-submit")) e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    // Form yang sedang difokus, atau form terakhir yang tampil (modal dirender paling akhir)
    const form = (document.activeElement as HTMLInputElement)?.form
      ?? Array.from(document.forms).reverse().find((f) => f.offsetParent !== null);
    const btn = form?.querySelector<HTMLButtonElement>(SUBMIT_BTN);
    if (form && btn) form.requestSubmit(btn);
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallbackTitle="Aplikasi Mengalami Kendala">
    <App />
  </ErrorBoundary>
);
