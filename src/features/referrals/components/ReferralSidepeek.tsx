import * as React from "react"
import { useState, useMemo } from "react"
import {
  X,
  Copy,
  ChevronDown,
  User,
  Calendar,
  Send,
  Building2,
  Clock,
  AlertTriangle,
  Activity,
  Heart,
  Droplet,
  Thermometer,
  Scale,
  History,
  CheckCircle2,
  CloudOff,
  Trash2,
  Check,
  Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { referralRepository } from "@/lib/repositories/referralRepository"
import { extractRiskLevel } from "@/lib/riskUtils"

export function ReferralSidepeek({
  referral,
  onClose,
  onUpdated,
  onDelete,
}: {
  referral: any
  onClose: () => void
  onUpdated?: () => void
  onDelete?: (referral: any) => void
}) {
  const [copySuccess, setCopySuccess] = useState<string>("")
  const [actionLoading, setActionLoading] = useState<boolean>(false)

  const currentUser = useMemo(() => {
    try {
      const userStr =
        typeof window !== "undefined" ? localStorage.getItem("user") : null
      return userStr ? JSON.parse(userStr) : null
    } catch {
      return null
    }
  }, [])

  if (!referral) return null

  const currentFacilityId = currentUser?.facility_id || currentUser?.facilityId
  const isSystemAdmin = currentUser?.role === "SystemAdmin"
  const isDestination =
    isSystemAdmin ||
    Boolean(currentFacilityId && referral.to_facility_id === currentFacilityId)
  const isOrigin = Boolean(
    currentFacilityId && referral.from_facility_id === currentFacilityId
  )

  const motherUser = referral.pregnancy?.mother?.user
  const motherName = motherUser
    ? `${motherUser.first_name || ""} ${motherUser.last_name || ""}`.trim()
    : referral.pregnancy?.mother?.first_name
      ? `${referral.pregnancy.mother.first_name} ${referral.pregnancy.mother.last_name || ""}`.trim()
      : referral.motherName || "Patient Record"

  const dynamicRisk = extractRiskLevel(
    referral.pregnancy?.mother || referral,
    referral.pregnancy ? [referral.pregnancy] : [],
    referral.pregnancy?.prenatalVisits || []
  )
  const riskFlag =
    dynamicRisk && dynamicRisk !== "Low Risk"
      ? dynamicRisk
      : referral.pregnancy?.risk_flag ||
        referral.riskFlag ||
        dynamicRisk ||
        "Low Risk"

  const riskLower = riskFlag.toLowerCase()
  const isHighRisk = riskLower.includes("high")
  const isMedRisk = riskLower.includes("med") || riskLower.includes("moderate")

  const status = referral.status
    ? referral.status.charAt(0).toUpperCase() + referral.status.slice(1)
    : "Pending"
  const statusLower = (referral.status || "pending").toLowerCase()
  const reasonText =
    referral.reason ||
    referral.summary ||
    "No clinical handoff summary specified."
  const destination =
    referral.toFacility?.facility_name ||
    referral.external_facility_name ||
    referral.destination ||
    "N/A"
  const recordLink = referral.secure_link || referral.recordLink || "N/A"
  const transferCode = referral.shared_pin || referral.transferCode || "N/A"
  const referredBy =
    referral.fromFacility?.facility_name || referral.from_facility_id || "N/A"
  const initiatedAt = referral.date_referred
    ? new Date(referral.date_referred).toLocaleString()
    : "N/A"

  const gestationalAge = referral.pregnancy?.gestational_age
    ? `${referral.pregnancy.gestational_age} Weeks`
    : referral.pregnancy?.lmp
      ? `LMP: ${new Date(referral.pregnancy.lmp).toLocaleDateString()}`
      : "N/A"

  const handleCopy = (text: string, label: string) => {
    if (!text || text === "N/A") return
    navigator.clipboard.writeText(text)
    setCopySuccess(label)
    setTimeout(() => setCopySuccess(""), 2000)
  }

  const handleStatusChange = async (newStatus: string) => {
    const id = referral.referral_id || referral.id
    if (!id) return

    setActionLoading(true)
    try {
      await referralRepository.respondToReferral(id, {
        status: newStatus,
        is_completed:
          newStatus === "completed" ||
          newStatus === "accepted" ||
          newStatus === "cancelled" ||
          newStatus === "rejected",
      })
      onUpdated?.()
      onClose()
    } catch (err) {
      console.error(`Failed to update referral status to ${newStatus}:`, err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-card text-card-foreground xl:w-[450px]">
      <div className="flex shrink-0 items-start justify-between border-b border-border p-4 pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {motherName}
            </h2>
            {isOrigin && (
              <span className="rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                Outgoing Referral
              </span>
            )}
            {isDestination && !isOrigin && (
              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Incoming Referral
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${
                isHighRisk
                  ? "bg-red-500/10 text-red-500"
                  : isMedRisk
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-green-500/10 text-green-500"
              }`}
            >
              {isHighRisk ? (
                <Activity className="h-3 w-3" />
              ) : isMedRisk ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {riskFlag}
            </div>
            <div
              className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${
                statusLower === "accepted" || statusLower === "completed"
                  ? "bg-green-500/10 text-green-500"
                  : statusLower === "pending"
                    ? "bg-amber-500/10 text-amber-500"
                    : statusLower === "rejected" || statusLower === "cancelled"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-blue-500/10 text-blue-500"
              }`}
            >
              {statusLower === "accepted" || statusLower === "completed" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : statusLower === "pending" ? (
                <Clock className="h-3 w-3" />
              ) : (
                <Activity className="h-3 w-3" />
              )}
              {status}
            </div>
            {referral.sync_status && referral.sync_status !== "synced" && (
              <div className="inline-flex items-center gap-1 rounded-sm border border-amber-500/20 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                <CloudOff className="h-3 w-3" />
                Pending Offline Sync
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              title="Delete Referral"
              className="h-7 w-7 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
              onClick={() => onDelete(referral)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-7 w-7 text-muted-foreground hover:text-foreground md:flex"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <h3 className="text-xs font-semibold text-foreground">
            Clinical Referral Handoff Summary
          </h3>
          <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">
            {reasonText}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-border p-4">
          <h3 className="text-xs font-semibold text-foreground">
            Destination Facility
          </h3>
          <div className="flex h-8 items-center justify-between rounded-md border border-border bg-card px-3 text-xs text-foreground">
            <span>{destination}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-border p-4">
          <h3 className="text-xs font-semibold text-foreground">
            Transfer Patient Record Link
          </h3>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={recordLink}
              className="h-8 border-border bg-card text-xs text-foreground"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(recordLink, "link")}
              className="h-8 w-8 shrink-0 border-border text-foreground hover:bg-accent"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {copySuccess === "link" && (
            <span className="text-[10px] text-green-500">
              Link copied to clipboard!
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 border-b border-border p-4">
          <h3 className="text-xs font-semibold text-foreground">
            Transfer PIN / Code
          </h3>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={transferCode}
              className="h-8 border-border bg-card text-xs text-foreground"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(transferCode, "code")}
              className="h-8 w-8 shrink-0 border-border text-foreground hover:bg-accent"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {copySuccess === "code" && (
            <span className="text-[10px] text-green-500">PIN code copied!</span>
          )}
        </div>

        <div className="flex flex-col gap-5 border-b border-border p-4">
          <h3 className="text-xs font-semibold text-foreground">Properties</h3>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-medium text-muted-foreground">
              Patient Demographic
            </span>

            <div className="flex items-center">
              <div className="flex w-[180px] shrink-0 items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Patient Name</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {motherName}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[180px] shrink-0 items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Gestational Age</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {gestationalAge}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-medium text-muted-foreground">
              Transfer Logistics
            </span>

            <div className="flex items-center">
              <div className="flex w-[180px] shrink-0 items-center gap-2 text-muted-foreground">
                <Send className="h-3.5 w-3.5" />
                <span className="text-xs">Referred By</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {referredBy}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[180px] shrink-0 items-center gap-2 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs">Destination Facility</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {destination}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[180px] shrink-0 items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Initiated At</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {initiatedAt}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 pb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              Activity Log
            </h3>
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {referral.date_responded && (
            <div className="mt-1 flex gap-3">
              <div className="mt-1.5 flex flex-col items-center">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">
                  Status updated to {status}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(referral.date_responded).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="mt-1 flex gap-3">
            <div className="mt-1.5 flex flex-col items-center">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                Initiated referral to {destination}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {initiatedAt}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4 pb-8 md:pb-4">
        {isDestination && !isOrigin && (
          <>
            {statusLower === "pending" && (
              <div className="flex items-center gap-2">
                <Button
                  disabled={actionLoading}
                  onClick={() => handleStatusChange("accepted")}
                  className="h-8 flex-1 border-none bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Accept Referral Transfer
                </Button>
                <Button
                  disabled={actionLoading}
                  variant="outline"
                  onClick={() => handleStatusChange("rejected")}
                  className="h-8 border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <Ban className="mr-1 h-3.5 w-3.5" />
                  Decline
                </Button>
              </div>
            )}
            {statusLower === "accepted" && (
              <Button
                disabled={actionLoading}
                onClick={() => handleStatusChange("completed")}
                className="h-8 w-full border-none bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Mark Transfer Completed
              </Button>
            )}
          </>
        )}

        {isOrigin && (
          <div className="flex items-center gap-2">
            {statusLower === "pending" && (
              <Button
                disabled={actionLoading}
                variant="outline"
                onClick={() => handleStatusChange("cancelled")}
                className="h-8 flex-1 border-amber-500/30 text-xs font-medium text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
              >
                Cancel Transfer
              </Button>
            )}
            {onDelete && (
              <Button
                disabled={actionLoading}
                onClick={() => onDelete(referral)}
                className="text-destructive-foreground h-8 flex-1 border-none bg-destructive text-xs font-medium hover:bg-destructive/90"
              >
                Delete Referral
              </Button>
            )}
          </div>
        )}

        {!isOrigin && !isDestination && (
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                disabled={actionLoading}
                onClick={() => onDelete(referral)}
                className="text-destructive-foreground h-8 w-full border-none bg-destructive text-xs font-medium hover:bg-destructive/90"
              >
                Delete Referral
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
