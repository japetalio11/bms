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
  Wind,
  Gauge
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

  const latestVisit = referral.pregnancy?.prenatalVisits?.[referral.pregnancy.prenatalVisits.length - 1] || {}
  const bloodPressure = latestVisit.blood_pressure || "N/A"
  const heartRate = latestVisit.heart_rate ? `${latestVisit.heart_rate} bpm` : "N/A"
  const bloodSugar = latestVisit.blood_sugar ? `${latestVisit.blood_sugar} mg/dL` : "N/A"
  const bodyTemp = latestVisit.temperature ? `${latestVisit.temperature} C` : "N/A"
  const weight = latestVisit.weight ? `${latestVisit.weight} kg` : "N/A"
  const respRate = latestVisit.respiratory_rate ? `${latestVisit.respiratory_rate} rpm` : "N/A"
  const o2Sat = latestVisit.oxygen_saturation ? `${latestVisit.oxygen_saturation} %` : "N/A"

  // Mock danger signs for demonstration if none exist, normally extracted from complications
  const dangerSigns = referral.pregnancy?.complications 
    ? referral.pregnancy.complications.split(',').map((s: string) => s.trim())
    : []

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
    <div className="flex h-full w-full flex-col border-l border-white/10 bg-[#111111] text-zinc-100 xl:w-[450px]">
      <div className="flex shrink-0 items-start justify-between border-b border-white/10 p-4 pb-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-white">
            {motherName}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isHighRisk
                  ? "bg-red-500/20 text-red-400"
                  : isMedRisk
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-green-500/20 text-green-400"
              }`}
            >
              {isHighRisk ? (
                <AlertTriangle className="h-3 w-3" />
              ) : isMedRisk ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {riskFlag}
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                statusLower === "accepted" || statusLower === "completed"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : statusLower === "pending"
                    ? "bg-amber-500/20 text-amber-400"
                    : statusLower === "rejected" || statusLower === "cancelled"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-blue-500/20 text-blue-400"
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
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-7 w-7 text-zinc-400 hover:text-white md:flex"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-2 border-b border-white/10 p-4">
          <h3 className="text-xs font-semibold text-white">
            Handoff Summary
          </h3>
          <p className="text-xs leading-relaxed text-zinc-300">
            {reasonText}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-b border-white/10 p-4">
          <h3 className="text-xs font-semibold text-white">
            Preferred Hospital
          </h3>
          <div className="flex h-8 items-center justify-between rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-xs text-white">
            <span>{destination}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-white/10 p-4">
          <h3 className="text-xs font-semibold text-white">
            Transfer Patient Record Link
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex h-8 flex-1 items-center justify-between rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-xs text-white">
              <span className="truncate">{recordLink}</span>
              <button onClick={() => handleCopy(recordLink, "link")} className="ml-2 shrink-0 text-zinc-400 hover:text-white">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400">
            {copySuccess === "link" ? <span className="text-green-400">Link copied to clipboard!</span> : "Share this link with partners so they can book dates within this block."}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-b border-white/10 p-4">
          <h3 className="text-xs font-semibold text-white">
            Transfer Code
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex h-8 flex-1 items-center justify-between rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-xs text-white">
              <span className="truncate">{transferCode}</span>
              <button onClick={() => handleCopy(transferCode, "code")} className="ml-2 shrink-0 text-zinc-400 hover:text-white">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400">
            {copySuccess === "code" ? <span className="text-green-400">Code copied to clipboard!</span> : "Share this code with partners so they can access the booking link."}
          </p>
        </div>

        <div className="flex flex-col gap-5 border-b border-white/10 p-4">
          <h3 className="text-xs font-semibold text-white">Properties</h3>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-medium text-zinc-400">
              Patient Demographic
            </span>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Patient Name</span>
              </div>
              <span className="flex-1 text-xs text-white">
                {motherName}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Gestational Age</span>
              </div>
              <span className="flex-1 text-xs text-white">
                {gestationalAge}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-medium text-zinc-400">
              Transfer Logistics
            </span>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Send className="h-3.5 w-3.5" />
                <span className="text-xs">Referred By</span>
              </div>
              <span className="flex-1 text-xs text-white">
                {referredBy}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs">Destination Facility</span>
              </div>
              <span className="flex-1 text-xs text-white">
                {destination}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Initiated At</span>
              </div>
              <span className="flex-1 text-xs text-white">
                {initiatedAt}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-medium text-zinc-400">
              Clinical Indicators
            </span>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs">Primary Danger Signs</span>
              </div>
              {dangerSigns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {dangerSigns.map((sign: string, idx: number) => (
                    <span key={idx} className="rounded-full border border-white/10 bg-[#1A1A1A] px-2.5 py-1 text-[10px] text-white">
                      {sign}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-zinc-500 pl-5">None reported</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-medium text-zinc-400">
              Maternal Vitals
            </span>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Activity className="h-3.5 w-3.5" />
                <span className="text-xs">Blood Pressure</span>
              </div>
              <span className="flex-1 text-xs text-white">{bloodPressure}</span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Heart className="h-3.5 w-3.5" />
                <span className="text-xs">Heart Rate</span>
              </div>
              <span className="flex-1 text-xs text-white">{heartRate}</span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Droplet className="h-3.5 w-3.5" />
                <span className="text-xs">Blood Sugar</span>
              </div>
              <span className="flex-1 text-xs text-white">{bloodSugar}</span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Thermometer className="h-3.5 w-3.5" />
                <span className="text-xs">Body Temp</span>
              </div>
              <span className="flex-1 text-xs text-white">{bodyTemp}</span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Scale className="h-3.5 w-3.5" />
                <span className="text-xs">Weight</span>
              </div>
              <span className="flex-1 text-xs text-white">{weight}</span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Wind className="h-3.5 w-3.5" />
                <span className="text-xs">Respiratory Rate</span>
              </div>
              <span className="flex-1 text-xs text-white">{respRate}</span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-zinc-400">
                <Gauge className="h-3.5 w-3.5" />
                <span className="text-xs">O2 Saturation</span>
              </div>
              <span className="flex-1 text-xs text-white">{o2Sat}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 pb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-white">
              Activity Log <History className="ml-1 inline h-3 w-3 text-zinc-400" />
            </h3>
          </div>
          <p className="text-[10px] text-zinc-400">Recent actions performed by this user.</p>

          {referral.date_responded && (
            <div className="mt-2 flex gap-3">
              <div className="mt-1.5 flex flex-col items-center">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-white">
                  Status updated to {status}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {new Date(referral.date_responded).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <div className="mt-1.5 flex flex-col items-center">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-white">
                Initiated referral to {destination}
              </span>
              <span className="text-[10px] text-zinc-400">
                {initiatedAt}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-white/10 bg-[#111111] p-4 pb-8 md:pb-4">
        {statusLower === "pending" && isOrigin ? (
          <Button
            disabled={actionLoading}
            onClick={() => handleStatusChange("cancelled")}
            className="h-9 w-full bg-red-400/90 text-xs font-medium text-red-950 hover:bg-red-400"
          >
            Cancel Transfer
          </Button>
        ) : statusLower === "pending" && isDestination ? (
          <div className="flex gap-2">
            <Button
              disabled={actionLoading}
              onClick={() => handleStatusChange("accepted")}
              className="h-9 flex-1 bg-emerald-400/90 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
            >
              Accept Transfer
            </Button>
            <Button
              disabled={actionLoading}
              onClick={() => handleStatusChange("rejected")}
              className="h-9 flex-1 bg-red-400/90 text-xs font-medium text-red-950 hover:bg-red-400"
            >
              Decline
            </Button>
          </div>
        ) : null}

        <Button
          variant="outline"
          className="h-9 w-full border-white/10 bg-[#1A1A1A] text-xs font-medium text-white hover:bg-white/10 hover:text-white"
        >
          Print Transfer Form
        </Button>
      </div>
    </div>
  )
}
