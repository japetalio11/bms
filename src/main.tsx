import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { initStoragePersistence } from "@/lib/db/storagePersist"
import { syncEngine } from "@/lib/sync/syncEngine"
import { db } from "@/lib/db/bmsDatabase"

// Expose cache reset utility globally on window for easy developer & testing access
;(window as any).clearMotherCache = async (reload = true) => {
  try {
    await Promise.all([
      db.mothers.clear(),
      db.pregnancies.clear(),
      db.prenatalVisits.clear(),
      db.appointments.clear(),
      db.labRecords.clear(),
      db.supplements.clear(),
      db.ehrDocuments.clear(),
      db.offlineQueue.clear(),
    ])
    console.log("🧹 [BMS] All mother records and offline sync queues cleared from IndexedDB.")
    if (reload) {
      window.location.reload()
    }
    return { success: true }
  } catch (err) {
    console.error("Failed to clear IndexedDB cache:", err)
    throw err
  }
}

window.addEventListener("bms:purge-mother-cache", async () => {
  await (window as any).clearMotherCache?.(true)
})

// Initialize browser storage persistence for Dexie IndexedDB
initStoragePersistence().then((persisted) => {
  console.log(`[BMS App] Dexie IndexedDB storage persistence state: ${persisted ? "Persisted" : "Default"}`)
})

// Trigger background outbox sync check on startup
if (navigator.onLine) {
  syncEngine.processQueue()
}

// Register PWA Service Worker if supported
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js"
    navigator.serviceWorker
      .register(swUrl, { type: import.meta.env.DEV ? "module" : "classic" })
      .then((reg) => console.log("[SW] Service Worker registered successfully:", reg.scope))
      .catch((err) => {
        // Fallback to /sw.js
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("[SW] Fallback SW registered:", reg.scope))
          .catch((e) => console.warn("[SW] Service worker registration failed:", e))
      })
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
