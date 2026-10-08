import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import type { OfflineQueueItem, SyncConflict } from "@/lib/db/bmsDatabase"
import { syncEngine } from "@/lib/sync/syncEngine"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  X,
  Trash2,
  Users,
  Calendar,
  Activity,
  Share2,
  FileText,
  RotateCcw,
  GitMerge,
  Server,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConflictResolutionModal } from "@/features/sync/components/ConflictResolutionModal"
import { isDemoMode } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
}

export function SyncQueueDrawer({ open, onClose }: Props) {
  const { isOnline, isSyncing, pendingCount, forceSync, lastSyncedAt, error } = useNetworkStatus()
  const queueItems = useLiveQuery(() => db.offlineQueue.orderBy("created_at").toArray(), [])
  const conflicts = useLiveQuery(() => db.conflicts.where("status").equals("unresolved").toArray(), [])

  const [activeTab, setActiveTab] = useState<"queue" | "conflicts">("queue")
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null)
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false)

  const [motherCount, setMotherCount] = useState(0)
  const [appointmentCount, setAppointmentCount] = useState(0)
  const [visitCount, setVisitCount] = useState(0)
  const [referralCount, setReferralCount] = useState(0)
  const [ehrCount, setEhrCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => {
    if (conflicts && conflicts.length > 0 && activeTab === "queue") {
      setActiveTab("conflicts")
    }
  }, [conflicts?.length])

  useEffect(() => {
    async function loadStats() {
      const [m, a, v, r, e] = await Promise.all([
        db.mothers.count(),
        db.appointments.count(),
        db.prenatalVisits.count(),
        db.referrals.count(),
        db.ehrDocuments.count(),
      ])
      setMotherCount(m)
      setAppointmentCount(a)
      setVisitCount(v)
      setReferralCount(r)
      setEhrCount(e)

      const [mErr, rErr, aErr, vErr, eErr] = await Promise.all([
        db.mothers.where("sync_status").equals("error").count().catch(() => 0),
        db.referrals.where("sync_status").equals("error").count().catch(() => 0),
        db.appointments.where("sync_status").equals("error").count().catch(() => 0),
        db.prenatalVisits.where("sync_status").equals("error").count().catch(() => 0),
        db.ehrDocuments.where("sync_status").equals("error").count().catch(() => 0),
      ])
      setErrorCount(mErr + rErr + aErr + vErr + eErr)
    }

    if (open) {
      loadStats()
    }
  }, [open, queueItems, conflicts, isSyncing])

  if (!open) return null

  const handleClearQueue = async () => {
    if (
      confirm(
        "Are you sure you want to clear the pending offline queue and discard unsynced offline records?"
      )
    ) {
      await db.offlineQueue.clear()
      await db.mothers.where("sync_status").notEqual("synced").delete().catch(() => {})
      await db.pregnancies.where("sync_status").notEqual("synced").delete().catch(() => {})
      await db.appointments.where("sync_status").notEqual("synced").delete().catch(() => {})
      await db.referrals.where("sync_status").notEqual("synced").delete().catch(() => {})
      await db.ehrDocuments.where("sync_status").notEqual("synced").delete().catch(() => {})
      await db.labRecords.where("sync_status").notEqual("synced").delete().catch(() => {})
      await db.supplements.where("sync_status").notEqual("synced").delete().catch(() => {})
      setErrorCount(0)
    }
  }

  const handleRetryAll = async () => {
    const items = await db.offlineQueue.toArray()
    for (const item of items) {
      if (item.id) {
        await db.offlineQueue.update(item.id, {
          status: "pending",
          last_error: undefined,
          retry_count: 0,
        })
      }
    }
    forceSync()
  }

  const openConflictResolver = (conflictId: string) => {
    setSelectedConflictId(conflictId)
    setIsConflictModalOpen(true)
  }

  const handleSimulateConflict = async () => {
    const existingMothers = await db.mothers.toArray().catch(() => [])
    const realMother = existingMothers.find(
      (m) => m.id && !m.id.startsWith("temp-") && !m.id.startsWith("demo-")
    )

    const targetEntityId = realMother?.id || "demo-mother-maria-santos"
    const targetName = realMother
      ? `${realMother.first_name || ""} ${realMother.last_name || ""}`.trim()
      : "Maria Santos (Demo Patient)"

    const demoConflictId = `demo_conflict_${Date.now()}`
    await db.conflicts.put({
      conflict_id: demoConflictId,
      entity_type: "mother",
      entity_id: targetEntityId,
      entity_name: targetName,
      endpoint: `/api/v1/mother/update/${targetEntityId}`,
      method: "PUT",
      server_version: (realMother?.version || 1) + 2,
      client_version: realMother?.version || 1,
      server_record: {
        ...(realMother || {}),
        first_name: realMother?.first_name || "Maria",
        middle_name: realMother?.middle_name || "De Guzman",
        last_name: realMother?.last_name || "Santos",
        civil_status: "Married",
        blood_type: "O+",
        phone_number: "+63 917 123 4567",
        address: "Zone 4, Brgy. San Vicente, Main Health Center",
        notes: "Updated by RHU Central Midwife via web portal.",
        version: (realMother?.version || 1) + 2,
      },
      client_payload: {
        ...(realMother || {}),
        first_name: realMother?.first_name || "Maria",
        middle_name: realMother?.middle_name || "De Guzman",
        last_name: realMother?.last_name || "Santos",
        civil_status: "Single",
        blood_type: "B+",
        phone_number: "+63 917 999 8888",
        address: "Sitio Riverside, Purok 2, Remote Outreach Station",
        notes: "Recorded offline during remote barangay outreach mission.",
        version: realMother?.version || 1,
      },
      conflicting_fields: [
        "civil_status",
        "blood_type",
        "phone_number",
        "address",
        "notes",
      ],
      status: "unresolved",
      detected_at: Date.now(),
      last_error: `Conflict detected on ${targetName}: Server record was modified concurrently.`,
    })
    await syncEngine.notify()
    setSelectedConflictId(demoConflictId)
    setIsConflictModalOpen(true)
  }

  const hasFailedItems =
    queueItems &&
    queueItems.some((item) => item.status === "error" || Boolean(item.last_error))

  const conflictCount = conflicts?.length || 0

  return (
    <>
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

          <div className="flex border-b border-border bg-muted/20 p-1">
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "queue"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Outbox Queue</span>
              <span className="px-1.5 py-0.2 rounded-full bg-muted text-[10px]">
                {queueItems?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("conflicts")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "conflicts"
                  ? "bg-background text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Conflicts</span>
              {conflictCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {conflictCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-3 p-5 border-b border-border">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Network & Sync Status
              </span>

              <div className="flex items-center">
                <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                  {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
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

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  disabled={!isOnline || isSyncing || (pendingCount === 0 && !hasFailedItems)}
                  onClick={forceSync}
                  className="w-full flex items-center justify-center gap-2"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing
                    ? "Syncing Pending Mutations..."
                    : `Sync Now (${pendingCount} Pending)`}
                </Button>

                {hasFailedItems && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryAll}
                    disabled={!isOnline || isSyncing}
                    className="w-full text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry Failed Mutations
                  </Button>
                )}
              </div>
            </div>

            {activeTab === "conflicts" && (
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Unresolved MVCC Conflicts ({conflictCount})
                  </span>
                  {isDemoMode() && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={handleSimulateConflict}
                      className="h-6 text-[10px] gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    >
                      <GitMerge className="w-3 h-3" />
                      Simulate Demo Conflict
                    </Button>
                  )}
                </div>

                {conflictCount === 0 ? (
                  <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/20 border border-border">
                    <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">No Pending Conflicts</span>
                        <span className="text-[11px] text-muted-foreground">
                          All local edits match the server version.
                        </span>
                      </div>
                    </div>
                    {isDemoMode() && (
                      <div className="pt-2 border-t border-border/50">
                        <Button
                          size="sm"
                          onClick={handleSimulateConflict}
                          className="w-full gap-2 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>Launch Demo Conflict Resolver</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block mb-0.5">Action Required</span>
                        These records were modified concurrently. Review the side-by-side differences to choose or merge values.
                      </div>
                    </div>

                    {conflicts?.map((c: SyncConflict) => (
                      <div
                        key={c.id || c.conflict_id}
                        className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold capitalize text-foreground flex items-center gap-1.5">
                            <GitMerge className="w-3.5 h-3.5 text-amber-500" />
                            {c.entity_type.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(c.detected_at).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="text-xs text-foreground font-medium">
                          {c.entity_name || `ID: ${c.entity_id.slice(0, 14)}...`}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>Versions:</span>
                          <span className="font-mono bg-muted px-1.5 py-0.2 rounded text-[10px]">
                            Server v{c.server_version}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="font-mono bg-muted px-1.5 py-0.2 rounded text-[10px]">
                            Local v{c.client_version}
                          </span>
                        </div>

                        {c.conflicting_fields && c.conflicting_fields.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.conflicting_fields.slice(0, 3).map((f) => (
                              <span
                                key={f}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono"
                              >
                                {f}
                              </span>
                            ))}
                            {c.conflicting_fields.length > 3 && (
                              <span className="text-[10px] text-muted-foreground self-center">
                                +{c.conflicting_fields.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="pt-2 flex items-center gap-2">
                          <Button
                            size="xs"
                            onClick={() => openConflictResolver(c.conflict_id)}
                            className="flex-1 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                          >
                            <GitMerge className="w-3 h-3" />
                            Review & Resolve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "queue" && (
              <>
                <div className="flex flex-col gap-3 p-5 border-b border-border">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Dexie Persistent Storage Cache
                  </span>

                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">Mothers</span>
                    </div>
                    <span className="flex-1 text-xs font-medium text-foreground">
                      {motherCount} records
                    </span>
                  </div>

                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      <span className="text-xs">Visits</span>
                    </div>
                    <span className="flex-1 text-xs font-medium text-foreground">
                      {visitCount} records
                    </span>
                  </div>

                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Appointments</span>
                    </div>
                    <span className="flex-1 text-xs font-medium text-foreground">
                      {appointmentCount} records
                    </span>
                  </div>

                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Share2 className="h-3.5 w-3.5" />
                      <span className="text-xs">Referrals</span>
                    </div>
                    <span className="flex-1 text-xs font-medium text-foreground">
                      {referralCount} records
                    </span>
                  </div>

                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-xs">EHR Documents</span>
                    </div>
                    <span className="flex-1 text-xs font-medium text-foreground">
                      {ehrCount} records
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Pending Outbox Queue ({queueItems?.length || 0})
                    </span>
                    {queueItems && queueItems.length > 0 && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={handleClearQueue}
                        className="h-6 text-[10px] text-destructive hover:bg-destructive/10 px-2"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>

                  {!queueItems || queueItems.length === 0 ? (
                    errorCount > 0 ? (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold">Offline Sync Warning</span>
                          <span className="text-[11px]">
                            {errorCount} record(s) failed during previous sync attempts.
                            Reconnect online and click &quot;Sync Now&quot; to re-attempt syncing.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 pt-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">
                            All changes synced!
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Your offline memory is 100% up to date with the server.
                          </span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 mt-2">
                      {queueItems.map((item: OfflineQueueItem) => {
                        const isItemConflict = item.status === "conflict" || Boolean(item.conflict_id)
                        const isItemError =
                          (item.status === "error" || Boolean(item.last_error)) && !isItemConflict
                        return (
                          <div
                            key={item.id}
                            className={`flex flex-col gap-1.5 p-2.5 rounded-lg border ${
                              isItemConflict
                                ? "bg-amber-500/5 border-amber-500/30"
                                : isItemError
                                ? "bg-destructive/5 border-destructive/30"
                                : "bg-muted/30 border-border"
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <div className="flex items-center gap-1.5">
                                {isItemConflict ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                ) : isItemError ? (
                                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                                <span
                                  className={`text-xs capitalize ${
                                    isItemConflict
                                      ? "text-amber-600 dark:text-amber-400 font-medium"
                                      : isItemError
                                      ? "text-destructive font-medium"
                                      : "text-foreground"
                                  }`}
                                >
                                  {item.action} {item.entity_type.replace("_", " ")}
                                </span>
                              </div>
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
                            {item.last_error && (
                              <div
                                className={`text-[10px] p-1.5 rounded font-medium ${
                                  isItemConflict
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    : "bg-destructive/10 text-destructive"
                                }`}
                              >
                                {isItemConflict ? "MVCC Conflict: " : "Error: "}
                                {item.last_error}
                              </div>
                            )}
                            {isItemConflict && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() =>
                                  openConflictResolver(item.conflict_id || item.temp_id || "")
                                }
                                className="mt-1 text-xs text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                              >
                                <GitMerge className="w-3 h-3 mr-1" />
                                Resolve Conflict
                              </Button>
                            )}
                            {item.retry_count > 0 && !item.last_error && !isItemConflict && (
                              <div className="text-amber-500 font-semibold text-[10px]">
                                Retries: {item.retry_count}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConflictResolutionModal
        open={isConflictModalOpen}
        onClose={() => {
          setIsConflictModalOpen(false)
          setSelectedConflictId(null)
        }}
        conflictId={selectedConflictId || undefined}
      />
    </>
  )
}
