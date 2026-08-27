/**
 * Requests browser persistent storage to ensure Dexie / IndexedDB data is never
 * evicted automatically by browser storage pressure.
 */
export async function initStoragePersistence(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted()
      if (!isPersisted) {
        const granted = await navigator.storage.persist()
        console.log(`[StoragePersist] Persistent storage request granted: ${granted}`)
        return granted
      } else {
        console.log("[StoragePersist] Storage is already persisted.")
        return true
      }
    } catch (err) {
      console.warn("[StoragePersist] Failed to request persistent storage:", err)
      return false
    }
  }
  return false
}
