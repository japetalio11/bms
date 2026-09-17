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
  Ban
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

  // Current logged in user details for facility check
  const currentUser = useMemo(() => {
    try {
      const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null
      return userStr ? JSON.parse(userStr) : null
    } catch {
      return null
    }
  }, [])

  if (!referral) return null

  const currentFacilityId = currentUser?.facility_id || currentUser?.facilityId
  const isSystemAdmin = currentUser?.role === "SystemAdmin"
  const isDestination = isSystemAdmin || Boolean(currentFacilityId && referral.to_facility_id === currentFacilityId)
  const isOrigin = Boolean(currentFacilityId && referral.from_facility_id === currentFacilityId)

  // Helper properties derived from dynamic backend objects
  const motherUser = referral.pregnancy?.mother?.user
  const motherName = motherUser
    ? `${motherUser.first_name || ""} ${motherUser.last_name || ""}`.trim()
    : (referral.pregnancy?.mother?.first_name 
        ? `${referral.pregnancy.mother.first_name} ${referral.pregnancy.mother.last_name || ""}`.trim()
        : (referral.motherName || "Patient Record"))

  // Dynamically calculate risk level
  const dynamicRisk = extractRiskLevel(
    referral.pregnancy?.mother || referral,
    referral.pregnancy ? [referral.pregnancy] : [],
    referral.pregnancy?.prenatalVisits || []
  )
  const riskFlag = (dynamicRisk && dynamicRisk !== "Low Risk") 
    ? dynamicRisk 
    : (referral.pregnancy?.risk_flag || referral.riskFlag || dynamicRisk || "Low Risk")
  
  const riskLower = riskFlag.toLowerCase()
  const isHighRisk = riskLower.includes("high")
  const isMedRisk = riskLower.includes("med") || riskLower.includes("moderate")

  const status = referral.status ? (referral.status.charAt(0).toUpperCase() + referral.status.slice(1)) : "Pending"
  const statusLower = (referral.status || "pending").toLowerCase()
  const reasonText = referral.reason || referral.summary || "No clinical handoff summary specified."
  const destination = referral.toFacility?.facility_name || referral.external_facility_name || referral.destination || "N/A"
  const recordLink = referral.secure_link || referral.recordLink || "N/A"
  const transferCode = referral.shared_pin || referral.transferCode || "N/A"
  const referredBy = referral.fromFacility?.facility_name || referral.from_facility_id || "N/A"
  const initiatedAt = referral.date_referred ? new Date(referral.date_referred).toLocaleString() : "N/A"

  const gestationalAge = referral.pregnancy?.gestational_age 
    ? `${referral.pregnancy.gestational_age} Weeks`
    : (referral.pregnancy?.lmp ? `LMP: ${new Date(referral.pregnancy.lmp).toLocaleDateString()}` : "N/A")

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    if (!text || text === "N/A") return
    navigator.clipboard.writeText(text)
    setCopySuccess(label)
    setTimeout(() => setCopySuccess(""), 2000)
  }

  // Handle transfer status actions (e.g. Accept / Complete / Decline / Cancel)
  const handleStatusChange = async (newStatus: string) => {
    const id = referral.referral_id || referral.id
    if (!id) return

    setActionLoading(true)
    try {
      await referralRepository.respondToReferral(id, {
        status: newStatus,
        is_completed: newStatus === "completed" || newStatus === "accepted" || newStatus === "cancelled" || newStatus === "rejected",
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
    <div className="flex flex-col h-full bg-card text-card-foreground border-l border-border w-full xl:w-[450px]">
      {/* Header */}
      <div className="shrink-0 p-4 pb-4 border-b border-border flex items-start justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{motherName}</h2>
            {isOrigin && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Outgoing Referral
              </span>
            )}
            {isDestination && !isOrigin && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Incoming Referral
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
              isHighRisk ? 'bg-red-500/10 text-red-500' : 
              isMedRisk ? 'bg-amber-500/10 text-amber-500' : 
              'bg-green-500/10 text-green-500'
            }`}>
              {isHighRisk ? <Activity className="h-3 w-3" /> : isMedRisk ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {riskFlag}
            </div>
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
              statusLower === 'accepted' || statusLower === 'completed' ? 'bg-green-500/10 text-green-500' : 
              statusLower === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
              statusLower === 'rejected' || statusLower === 'cancelled' ? 'bg-red-500/10 text-red-500' :
              'bg-blue-500/10 text-blue-500'
            }`}>
              {statusLower === 'accepted' || statusLower === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : statusLower === 'pending' ? <Clock className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
              {status}
            </div>
            {referral.sync_status && referral.sync_status !== "synced" && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-amber-500/15 text-amber-600 border border-amber-500/20">
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
              className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              onClick={() => onDelete(referral)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="hidden md:flex h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        
        {/* Handoff Summary */}
        <div className="flex flex-col gap-3 p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground">Clinical Referral Handoff Summary</h3>
          <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-mono p-3 rounded-lg bg-muted/40 border border-border">
            {reasonText}
          </div>
        </div>

        {/* Destination Hospital */}
        <div className="flex flex-col gap-3 p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground">Destination Facility</h3>
          <div className="flex items-center justify-between h-8 px-3 rounded-md border border-border bg-card text-xs text-foreground">
            <span>{destination}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </div>

        {/* Transfer Patient Record Link */}
        <div className="flex flex-col gap-3 p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground">Transfer Patient Record Link</h3>
          <div className="flex items-center gap-2">
            <Input readOnly value={recordLink} className="h-8 text-xs bg-card border-border text-foreground" />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleCopy(recordLink, "link")}
              className="h-8 w-8 shrink-0 border-border text-foreground hover:bg-accent"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {copySuccess === "link" && <span className="text-[10px] text-green-500">Link copied to clipboard!</span>}
        </div>

        {/* Transfer Code */}
        <div className="flex flex-col gap-3 p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground">Transfer PIN / Code</h3>
          <div className="flex items-center gap-2">
            <Input readOnly value={transferCode} className="h-8 text-xs bg-card border-border text-foreground" />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleCopy(transferCode, "code")}
              className="h-8 w-8 shrink-0 border-border text-foreground hover:bg-accent"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {copySuccess === "code" && <span className="text-[10px] text-green-500">PIN code copied!</span>}
        </div>

        {/* Properties */}
        <div className="flex flex-col gap-5 p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground">Properties</h3>
          
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Patient Demographic</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Patient Name</span>
              </div>
              <span className="text-xs text-foreground flex-1">{motherName}</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Gestational Age</span>
              </div>
              <span className="text-xs text-foreground flex-1">{gestationalAge}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Transfer Logistics</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Send className="h-3.5 w-3.5" />
                <span className="text-xs">Referred By</span>
              </div>
              <span className="text-xs text-foreground flex-1">{referredBy}</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs">Destination Facility</span>
              </div>
              <span className="text-xs text-foreground flex-1">{destination}</span>
            </div>

            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Initiated At</span>
              </div>
              <span className="text-xs text-foreground flex-1">{initiatedAt}</span>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="flex flex-col gap-4 p-4 pb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">Activity Log</h3>
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          
          {referral.date_responded && (
            <div className="flex gap-3 mt-1">
              <div className="flex flex-col items-center mt-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">Status updated to {status}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(referral.date_responded).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-1">
            <div className="flex flex-col items-center mt-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">Initiated referral to {destination}</span>
              <span className="text-[10px] text-muted-foreground">{initiatedAt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 pb-8 md:pb-4 border-t border-border flex flex-col gap-2">
        {/* Receiving / Destination Facility Actions */}
        {isDestination && !isOrigin && (
          <>
            {statusLower === "pending" && (
              <div className="flex items-center gap-2">
                <Button 
                  disabled={actionLoading}
                  onClick={() => handleStatusChange("accepted")}
                  className="flex-1 h-8 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 border-none"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Accept Referral Transfer
                </Button>
                <Button 
                  disabled={actionLoading}
                  variant="outline"
                  onClick={() => handleStatusChange("rejected")}
                  className="h-8 text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Ban className="h-3.5 w-3.5 mr-1" />
                  Decline
                </Button>
              </div>
            )}
            {statusLower === "accepted" && (
              <Button 
                disabled={actionLoading}
                onClick={() => handleStatusChange("completed")}
                className="w-full h-8 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 border-none"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Mark Transfer Completed
              </Button>
            )}
          </>
        )}

        {/* Referring / Origin Facility Actions */}
        {isOrigin && (
          <div className="flex items-center gap-2">
            {statusLower === "pending" && (
              <Button 
                disabled={actionLoading}
                variant="outline"
                onClick={() => handleStatusChange("cancelled")}
                className="flex-1 h-8 text-xs font-medium text-amber-600 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-700"
              >
                Cancel Transfer
              </Button>
            )}
            {onDelete && (
              <Button
                disabled={actionLoading}
                onClick={() => onDelete(referral)}
                className="flex-1 h-8 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none"
              >
                Delete Referral
              </Button>
            )}
          </div>
        )}

        {/* System Admin or unassociated viewer fallback */}
        {!isOrigin && !isDestination && (
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                disabled={actionLoading}
                onClick={() => onDelete(referral)}
                className="w-full h-8 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none"
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
