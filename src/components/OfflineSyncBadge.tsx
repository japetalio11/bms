import { useState } from "react"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SyncQueueDrawer } from "@/components/SyncQueueDrawer"

export function OfflineSyncBadge() {
  const { isOnline, isSyncing, pendingCount, forceSync } = useNetworkStatus()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm border ${
            !isOnline
              ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40 hover:bg-amber-500/20"
              : isSyncing
              ? "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40 hover:bg-blue-500/20"
              : pendingCount > 0
              ? "bg-orange-500/10 text-orange-600 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 hover:bg-orange-500/20"
              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-500/20"
          }`}
          title="Click to view offline storage and sync queue"
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>Offline Mode</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span>Syncing Data...</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              <span>{pendingCount} Pending Sync</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span>Online & Synced</span>
            </>
          )}
        </button>

        {isOnline && pendingCount > 0 && !isSyncing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={forceSync}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Sync Now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <SyncQueueDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
