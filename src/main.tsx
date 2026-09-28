import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { initStoragePersistence } from "@/lib/db/storagePersist"
import { syncEngine } from "@/lib/sync/syncEngine"

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault?.()
  const reloadKey = `bms_chunk_reload_${window.location.pathname}`
  if (!sessionStorage.getItem(reloadKey)) {
    sessionStorage.setItem(reloadKey, "true")
    window.location.reload()
  }
})

initStoragePersistence()

if (navigator.onLine) {
  syncEngine.processQueue()
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js"
    navigator.serviceWorker
      .register(swUrl, { type: import.meta.env.DEV ? "module" : "classic" })
      .catch(() => {
        navigator.serviceWorker.register("/sw.js").catch(() => {})
      })
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
