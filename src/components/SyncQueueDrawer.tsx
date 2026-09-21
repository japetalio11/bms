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
  HardDrive,
  Users,
  Calendar,
  Activity
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
    if (confirm("Are you sure you want to clear the pending offline queue and discard unsynced offline records?")) {
      await db.offlineQueue.clear()
      await db.mothers.where("sync_status").notEqual("synced").delete()
      await db.pregnancies.where("sync_status").notEqual("synced").delete()
      await db.appointments.where("sync_status").notEqual("synced").delete()
      await db.labRecords.where("sync_status").notEqual("synced").delete()
      await db.supplements.where("sync_status").notEqual("synced").delete()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="w-full max-w-md bg-background border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Offline Memory & Sync</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 p-5 border-b border-border">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Network & Sync Status
            </span>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Wifi className="h-3.5 w-3.5" />
                <span className="text-xs">Connection</span>
              </div>
              <span
                className={`flex-1 text-xs font-semibold ${
                  isOnline
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Last Synced</span>
              </div>
              <span className="flex-1 text-xs font-medium text-foreground">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "Not synced yet"}
              </span>
            </div>

            {error && (
              <div className="p-2.5 mt-2 rounded-lg bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2">
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
          </div>

          <div className="flex flex-col gap-3 p-5 border-b border-border">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Dexie Persistent Storage Cache
            </span>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs">Mothers</span>
              </div>
              <span className="flex-1 text-xs font-medium text-foreground">{motherCount} records</span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                <span className="text-xs">Visits</span>
              </div>
              <span className="flex-1 text-xs font-medium text-foreground">{visitCount} records</span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Appointments</span>
              </div>
              <span className="flex-1 text-xs font-medium text-foreground">{appointmentCount} records</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Pending Outbox Queue ({queueItems?.length || 0})
              </span>
              {queueItems && queueItems.length > 0 && (
                <Button variant="ghost" size="xs" onClick={handleClearQueue} className="h-6 text-[10px] text-destructive hover:bg-destructive/10 px-2">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {!queueItems || queueItems.length === 0 ? (
              <div className="flex items-center gap-3 pt-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">All changes synced!</span>
                  <span className="text-[10px] text-muted-foreground">
                    Your offline memory is 100% up to date with the server.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 mt-2">
                {queueItems.map((item: OfflineQueueItem) => (
                  <div key={item.id} className="flex flex-col gap-1 pb-3 border-b border-border last:border-0">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-xs capitalize text-foreground">
                        {item.action} {item.entity_type.replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.created_at).toLocaleTimeString()}
                        </span>
                        {item.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              if (item.id) await db.offlineQueue.delete(item.id)
                            }}
                            title="Dismiss item"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
      </div>
    </div>
  )
}
