import * as React from "react"
import { useState } from "react"
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
  CloudOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { referralRepository } from "@/lib/repositories/referralRepository"

export function ReferralSidepeek({ 
  referral, 
  onClose,
  onUpdated,
}: { 
  referral: any
  onClose: () => void 
  onUpdated?: () => void
}) {
  const [copySuccess, setCopySuccess] = useState<string>("")
  const [actionLoading, setActionLoading] = useState<boolean>(false)

  if (!referral) return null

  // Helper properties derived from dynamic backend objects
  const motherName = referral.pregnancy?.mother 
    ? `${referral.pregnancy.mother.first_name || ""} ${referral.pregnancy.mother.last_name || ""}`.trim()
    : (referral.motherName || "Patient Record")

  const riskFlag = referral.pregnancy?.risk_flag || referral.riskFlag || "Low Risk"
  const status = referral.status ? (referral.status.charAt(0).toUpperCase() + referral.status.slice(1)) : "Pending"
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

  // Handle transfer status actions (e.g. Accept / Cancel)
  const handleStatusChange = async (newStatus: string) => {
    const id = referral.referral_id || referral.id
    if (!id) return

    setActionLoading(true)
    try {
      await referralRepository.respondToReferral(id, {
        status: newStatus,
        is_completed: newStatus === "completed" || newStatus === "accepted" || newStatus === "cancelled",
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
          <h2 className="text-base font-semibold text-foreground">{motherName}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
              riskFlag === 'High Risk' ? 'bg-red-500/10 text-red-500' : 
              riskFlag === 'Medium Risk' ? 'bg-amber-500/10 text-amber-500' : 
              'bg-green-500/10 text-green-500'
            }`}>
              {riskFlag === 'High Risk' ? <Activity className="h-3 w-3" /> : riskFlag === 'Medium Risk' ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {riskFlag}
            </div>
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
              status === 'Accepted' || status === 'Completed' ? 'bg-green-500/10 text-green-500' : 
              status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 
              'bg-blue-500/10 text-blue-500'
            }`}>
              {status === 'Accepted' || status === 'Completed' ? <CheckCircle2 className="h-3 w-3" /> : status === 'Pending' ? <Clock className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
            </div>
            {referral.sync_status && referral.sync_status !== "synced" && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-amber-500/15 text-amber-600 border border-amber-500/20">
                <CloudOff className="h-3 w-3" />
                Pending Offline Sync
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="hidden md:flex h-6 w-6 text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
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
        {status === "Pending" && (
          <Button 
            disabled={actionLoading}
            onClick={() => handleStatusChange("accepted")}
            className="w-full h-8 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 border-none"
          >
            Accept Referral Transfer
          </Button>
        )}
        <Button 
          disabled={actionLoading}
          onClick={() => handleStatusChange("cancelled")}
          className="w-full h-8 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none"
        >
          Cancel Transfer
        </Button>
      </div>
    </div>
  )
}
