import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./lib/app-context";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

// Offline app shell (production only; the dev server serves fresh files).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js").catch(() => undefined));
}
