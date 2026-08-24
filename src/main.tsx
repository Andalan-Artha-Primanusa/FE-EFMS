import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallbackTitle="Aplikasi Mengalami Kendala">
    <App />
  </ErrorBoundary>
);
