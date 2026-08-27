import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import type { OfflineQueueItem } from "@/lib/db/bmsDatabase"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Trash2,
  HardDrive
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  onClose: () => void
}

export function SyncQueueDrawer({ open, onClose }: Props) {
  const { isOnline, isSyncing, pendingCount, forceSync, lastSyncedAt, error } = useNetworkStatus()
  const queueItems = useLiveQuery(() => db.offlineQueue.orderBy("created_at").toArray(), [])

  const [motherCount, setMotherCount] = useState(0)
  const [appointmentCount, setAppointmentCount] = useState(0)
  const [visitCount, setVisitCount] = useState(0)

  useEffect(() => {
    async function loadStats() {
      const m = await db.mothers.count()
      const a = await db.appointments.count()
      const v = await db.prenatalVisits.count()
      setMotherCount(m)
      setAppointmentCount(a)
      setVisitCount(v)
    }
    if (open) {
      loadStats()
    }
  }, [open])

  if (!open) return null

  const handleClearQueue = async () => {
    if (confirm("Are you sure you want to clear the pending offline queue? Unsynced changes will be discarded.")) {
      await db.offlineQueue.clear()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="w-full max-w-md bg-background border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Offline Memory & Sync</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Status Box */}
          <div className="rounded-xl border border-border p-4 space-y-3 bg-card shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Network Connection</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isOnline
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
              <span>Last Synced</span>
              <span>{lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "Not synced yet"}</span>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              disabled={!isOnline || isSyncing || pendingCount === 0}
              onClick={forceSync}
              className="w-full flex items-center justify-center gap-2"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing Pending Mutations..." : `Sync Now (${pendingCount} Pending)`}
            </Button>
          </div>

          {/* Dexie Database Stats */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              Dexie Persistent Storage Cache
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="text-lg font-bold">{motherCount}</div>
                <div className="text-[11px] text-muted-foreground">Mothers</div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="text-lg font-bold">{visitCount}</div>
                <div className="text-[11px] text-muted-foreground">Visits</div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="text-lg font-bold">{appointmentCount}</div>
                <div className="text-[11px] text-muted-foreground">Appointments</div>
              </div>
            </div>
          </div>

          {/* Pending Mutations List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Pending Outbox Queue ({queueItems?.length || 0})
              </h3>
              {queueItems && queueItems.length > 0 && (
                <Button variant="ghost" size="xs" onClick={handleClearQueue} className="text-xs text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear Queue
                </Button>
              )}
            </div>

            {!queueItems || queueItems.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium">All changes synced!</p>
                <p className="text-xs text-muted-foreground">
                  Your offline memory is 100% up to date with the server.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {queueItems.map((item: OfflineQueueItem) => (
                  <div key={item.id} className="p-3 rounded-lg border border-border bg-card text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="capitalize">
                        {item.action} {item.entity_type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-muted-foreground truncate font-mono text-[10px]">
                      {item.endpoint}
                    </div>
                    {item.retry_count > 0 && (
                      <div className="text-amber-500 font-semibold text-[10px]">
                        Retries: {item.retry_count} {item.last_error ? `(${item.last_error})` : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border text-xs text-center text-muted-foreground bg-muted/20">
          Dexie IndexedDB ensures 100% memory persistence across restarts.
        </div>
      </div>
    </div>
  )
}
