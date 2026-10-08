import { useState, useEffect, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { syncEngine } from "@/lib/sync/syncEngine"
import {
  AlertTriangle,
  Server,
  Smartphone,
  GitMerge,
  Sliders,
  CheckCircle2,
  X,
  RefreshCw,
  Clock,
  FileText,
  User,
  HeartPulse,
  Calendar,
  Layers,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConflictResolutionModalProps {
  open: boolean
  onClose: () => void
  conflictId?: string
  entityId?: string
  onResolved?: (conflictId: string) => void
}

type ResolutionStrategy = "SERVER_WINS" | "CLIENT_WINS" | "FIELD_MERGE" | "CUSTOM"

export function ConflictResolutionModal({
  open,
  onClose,
  conflictId,
  entityId,
  onResolved,
}: ConflictResolutionModalProps) {
  const allConflicts = useLiveQuery(
    () => db.conflicts.where("status").equals("unresolved").toArray(),
    []
  )

  const activeConflict = useMemo(() => {
    if (!allConflicts || allConflicts.length === 0) return null
    if (conflictId) {
      return (
        allConflicts.find((c) => c.conflict_id === conflictId || String(c.id) === conflictId) || null
      )
    }
    if (entityId) {
      return allConflicts.find((c) => c.entity_id === entityId) || null
    }
    return allConflicts[0] || null
  }, [allConflicts, conflictId, entityId])

  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy>("FIELD_MERGE")
  const [fieldSelections, setFieldSelections] = useState<Record<string, "server" | "client" | "custom">>({})
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (activeConflict) {
      const initialSelections: Record<string, "server" | "client" | "custom"> = {}
      const initialCustom: Record<string, any> = {}

      const allKeys = Array.from(
        new Set([
          ...Object.keys(activeConflict.server_record || {}),
          ...Object.keys(activeConflict.client_payload || {}),
        ])
      ).filter(
        (k) =>
          !["version", "created_at", "updated_at", "sync_status", "user", "mother", "pregnancy"].includes(k)
      )

      allKeys.forEach((key) => {
        const clientVal = activeConflict.client_payload?.[key]
        const serverVal = activeConflict.server_record?.[key]

        if (clientVal !== undefined && clientVal !== null) {
          initialSelections[key] = "client"
          initialCustom[key] = clientVal
        } else {
          initialSelections[key] = "server"
          initialCustom[key] = serverVal
        }
      })

      setFieldSelections(initialSelections)
      setCustomFieldValues(initialCustom)
      setSelectedStrategy("FIELD_MERGE")
      setResolveError(null)
      setSuccessMessage(null)
    }
  }, [activeConflict])

  if (!open || !activeConflict) return null

  const serverData = activeConflict.server_record || {}
  const clientData = activeConflict.client_payload || {}

  const ignoredKeys = [
    "version",
    "created_at",
    "updated_at",
    "sync_status",
    "user",
    "mother",
    "pregnancy",
    "creator",
    "assignedWorker",
    "facilityEnrollments",
    "facilityDocuments",
  ]

  const relevantKeys = Array.from(
    new Set([...Object.keys(serverData), ...Object.keys(clientData)])
  ).filter((k) => !ignoredKeys.includes(k) && (serverData[k] !== undefined || clientData[k] !== undefined))

  const conflictingKeys = activeConflict.conflicting_fields?.length
    ? activeConflict.conflicting_fields
    : relevantKeys.filter((k) => {
        const sVal = serverData[k]
        const cVal = clientData[k]
        if (cVal === undefined || cVal === null) return false
        return JSON.stringify(sVal) !== JSON.stringify(cVal)
      })

  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-muted-foreground italic text-xs">Empty / Null</span>
    if (typeof val === "boolean") return val ? "True / Yes" : "False / No"
    if (typeof val === "object") {
      if (val instanceof Date) return val.toLocaleString()
      return JSON.stringify(val)
    }
    return String(val)
  }

  const computedPreview = () => {
    if (selectedStrategy === "SERVER_WINS") {
      return serverData
    }
    if (selectedStrategy === "CLIENT_WINS") {
      return clientData
    }
    if (selectedStrategy === "FIELD_MERGE") {
      const merged: Record<string, any> = { ...serverData }
      for (const [k, v] of Object.entries(clientData)) {
        if (v !== undefined && v !== null && !ignoredKeys.includes(k)) {
          merged[k] = v
        }
      }
      return merged
    }

    const customMerged: Record<string, any> = { ...serverData }
    for (const key of relevantKeys) {
      const choice = fieldSelections[key] || "client"
      if (choice === "server") {
        customMerged[key] = serverData[key]
      } else if (choice === "client") {
        customMerged[key] = clientData[key]
      } else if (choice === "custom") {
        customMerged[key] = customFieldValues[key]
      }
    }
    return customMerged
  }

  const handleFieldChoiceToggle = (key: string, choice: "server" | "client") => {
    setFieldSelections((prev) => ({
      ...prev,
      [key]: choice,
    }))
    setSelectedStrategy("CUSTOM")
  }

  const handleCustomInputChange = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }))
    setFieldSelections((prev) => ({
      ...prev,
      [key]: "custom",
    }))
    setSelectedStrategy("CUSTOM")
  }

  const handleResolve = async () => {
    setIsResolving(true)
    setResolveError(null)
    try {
      let customPayload: any = undefined

      if (selectedStrategy === "CUSTOM") {
        customPayload = computedPreview()
      } else if (selectedStrategy === "FIELD_MERGE") {
        customPayload = computedPreview()
      } else if (selectedStrategy === "CLIENT_WINS") {
        customPayload = clientData
      }

      const res = await syncEngine.resolveConflict(activeConflict.conflict_id, {
        strategy: selectedStrategy,
        customPayload,
      })

      setSuccessMessage(res.message || "Conflict resolved successfully!")
      if (onResolved) {
        onResolved(activeConflict.conflict_id)
      }

      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to resolve conflict. Please try again."
      setResolveError(msg)
    } finally {
      setIsResolving(false)
    }
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "mother":
        return <User className="w-5 h-5 text-pink-500" />
      case "pregnancy":
        return <HeartPulse className="w-5 h-5 text-rose-500" />
      case "prenatal_visit":
        return <FileText className="w-5 h-5 text-blue-500" />
      case "appointment":
        return <Calendar className="w-5 h-5 text-amber-500" />
      default:
        return <Layers className="w-5 h-5 text-primary" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-4xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        <div className="p-5 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg text-foreground">
                  Manual Conflict Resolution
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 capitalize">
                  {activeConflict.entity_type.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Version mismatch detected: Server (v{activeConflict.server_version}) vs Local Client (v{activeConflict.client_version}).
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-6 py-3 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {getEntityIcon(activeConflict.entity_type)}
            <span className="font-medium text-foreground">
              {activeConflict.entity_name || `Record ID: ${activeConflict.entity_id.slice(0, 12)}...`}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Detected {new Date(activeConflict.detected_at).toLocaleTimeString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">Conflicting Fields:</span>
            <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold border border-destructive/20">
              {conflictingKeys.length} {conflictingKeys.length === 1 ? "field" : "fields"}
            </span>
          </div>
        </div>

        <div className="p-4 border-b border-border bg-background flex flex-col gap-2 shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Choose Resolution Strategy
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setSelectedStrategy("FIELD_MERGE")}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                selectedStrategy === "FIELD_MERGE"
                  ? "bg-primary/10 border-primary text-primary shadow-sm"
                  : "bg-card border-border text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                <GitMerge className="w-3.5 h-3.5" />
                <span>Smart Auto-Merge</span>
              </div>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Keep non-overlapping fields from both server and local.
              </span>
            </button>

            <button
              onClick={() => setSelectedStrategy("SERVER_WINS")}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                selectedStrategy === "SERVER_WINS"
                  ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "bg-card border-border text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                <Server className="w-3.5 h-3.5" />
                <span>Keep Server Version</span>
              </div>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Discard local changes and accept server data.
              </span>
            </button>

            <button
              onClick={() => setSelectedStrategy("CLIENT_WINS")}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                selectedStrategy === "CLIENT_WINS"
                  ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm"
                  : "bg-card border-border text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Keep My Changes</span>
              </div>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Overwrite server with your local offline edit.
              </span>
            </button>

            <button
              onClick={() => setSelectedStrategy("CUSTOM")}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                selectedStrategy === "CUSTOM"
                  ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "bg-card border-border text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>Custom Field Picker</span>
              </div>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Select individual values field-by-field below.
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />
              Side-by-Side Field Comparison (Click cards to choose winning value)
            </span>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive/60 inline-block" />
                Conflict
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Selected
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {relevantKeys.map((key) => {
              const isConflictField = conflictingKeys.includes(key)
              const sVal = serverData[key]
              const cVal = clientData[key]
              const currentChoice = fieldSelections[key] || "client"

              return (
                <div
                  key={key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isConflictField
                      ? "bg-muted/20 border-destructive/30"
                      : "bg-muted/10 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">
                        {formatFieldName(key)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {key}
                      </span>
                    </div>

                    {isConflictField && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                        Discrepancy
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => handleFieldChoiceToggle(key, "server")}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        currentChoice === "server" || selectedStrategy === "SERVER_WINS"
                          ? "bg-blue-500/10 border-blue-500 shadow-xs"
                          : "bg-card border-border hover:border-blue-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          Server (v{activeConflict.server_version})
                        </span>
                        {(currentChoice === "server" || selectedStrategy === "SERVER_WINS") && (
                          <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="text-xs font-medium text-foreground break-all">
                        {formatValue(sVal)}
                      </div>
                    </div>

                    <div
                      onClick={() => handleFieldChoiceToggle(key, "client")}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        currentChoice === "client" || selectedStrategy === "CLIENT_WINS"
                          ? "bg-purple-500/10 border-purple-500 shadow-xs"
                          : "bg-card border-border hover:border-purple-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          My Local Edit (v{activeConflict.client_version})
                        </span>
                        {(currentChoice === "client" || selectedStrategy === "CLIENT_WINS") && (
                          <CheckCircle2 className="w-4 h-4 text-purple-500" />
                        )}
                      </div>
                      <div className="text-xs font-medium text-foreground break-all">
                        {formatValue(cVal)}
                      </div>
                    </div>
                  </div>

                  {selectedStrategy === "CUSTOM" && isConflictField && (
                    <div className="mt-2.5 pt-2.5 border-t border-border/60 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        Or type override:
                      </span>
                      <input
                        type="text"
                        value={
                          typeof customFieldValues[key] === "object"
                            ? JSON.stringify(customFieldValues[key])
                            : customFieldValues[key] ?? ""
                        }
                        onChange={(e) => handleCustomInputChange(key, e.target.value)}
                        placeholder={`Custom value for ${formatFieldName(key)}...`}
                        className="flex-1 px-2.5 py-1 text-xs rounded-md bg-background border border-input focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {resolveError && (
          <div className="px-5 py-2.5 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{resolveError}</span>
          </div>
        )}

        {successMessage && (
          <div className="px-5 py-2.5 bg-emerald-500/10 border-t border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground">
            Applying Strategy: <span className="font-semibold text-foreground">{selectedStrategy}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isResolving}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResolve}
              disabled={isResolving}
              className="gap-2 bg-primary text-primary-foreground font-semibold shadow-sm"
            >
              {isResolving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Resolving Conflict...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve and Synchronize</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
