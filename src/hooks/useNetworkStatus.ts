import { useState, useEffect } from "react"
import { syncEngine } from "@/lib/sync/syncEngine"

export interface NetworkSyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncedAt: number | null
  error: string | null
  forceSync: () => void
}

export function useNetworkStatus(): NetworkSyncStatus {
  const [isOnline, setIsOnline] = useState<boolean>(syncEngine.isNetworkOnline())
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null as number | null,
    error: null as string | null,
  })

  useEffect(() => {
    const handleOnline = () => syncEngine.setNetworkOnline(true)
    const handleOffline = () => syncEngine.setNetworkOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    const unsubscribe = syncEngine.subscribe((state: any) => {
      if (typeof state.isOnline === "boolean") {
        setIsOnline(state.isOnline)
      }
      setSyncState(state)
    })

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      unsubscribe()
    }
  }, [])

  const forceSync = () => {
    syncEngine.processQueue()
  }

  return {
    isOnline,
    isSyncing: syncState.isSyncing,
    pendingCount: syncState.pendingCount,
    lastSyncedAt: syncState.lastSyncedAt,
    error: syncState.error,
    forceSync,
  }
}
