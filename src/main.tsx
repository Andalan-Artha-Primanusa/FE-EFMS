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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallbackTitle="Aplikasi Mengalami Kendala">
    <App />
  </ErrorBoundary>
);
