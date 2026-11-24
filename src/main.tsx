import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startSync } from "./state/sync";
import "./lib/theme";
import "./styles.css";

startSync();

// Offline launch from the Home Screen. Production only, so dev reloads stay fresh.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
