export async function initStoragePersistence(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted()
      if (!isPersisted) {
        return await navigator.storage.persist()
      }
      return true
    } catch {
      return false
    }
  }
  return false
}
