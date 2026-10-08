import React, { useState } from "react"
import {
  User,
  Phone,
  Calendar,
  MapPin,
  Droplet,
  Gauge,
  Heart,
  Thermometer,
  Scale,
  Ruler,
  Baby,
  Activity,
  AlertCircle,
  ShieldAlert,
  Check,
  XCircle,
  MessageSquare,
  Printer,
  Copy,
  Clock,
  Building2,
  ArrowRight,
  CheckCircle2,
  Maximize2,
  Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { sanitizeMediaUrl } from "@/lib/utils"
import type { PublicReferralData, ParsedReferralDetails, DocumentModalData } from "./referralTypes"
import {
  getUnifiedClinicalData,
  classifyVitals,
  determineReferralUrgency,
  formatStatusConfig,
} from "./referralClinicalUtils"

interface UnifiedReferralHandoffCardProps {
  data: PublicReferralData
  parsed: ParsedReferralDetails
  resolvedRiskLevel: string
  onOpenActionModal: (
    action: "acknowledged" | "accepted" | "in_progress" | "completed" | "rejected"
  ) => void
  onOpenClarificationModal: () => void
  onPrint?: () => void
  onPhotoClick?: (doc: DocumentModalData) => void
}

export function UnifiedReferralHandoffCard({
  data,
  parsed,
  resolvedRiskLevel,
  onOpenActionModal,
  onOpenClarificationModal,
  onPrint,
  onPhotoClick,
}: UnifiedReferralHandoffCardProps) {
  const [phoneCopied, setPhoneCopied] = useState(false)
  const unified = getUnifiedClinicalData(data, parsed)
  const urgency = determineReferralUrgency(
    resolvedRiskLevel,
    parsed,
    data.cdss_alerts,
    data.obstetric_info?.latest_vitals
  )
  const statusConfig = formatStatusConfig(data.status)
  const vitalsEval = classifyVitals(
    unified.bp,
    unified.pulse,
    unified.temp,
    unified.fht
  )

  const handleCopyPhone = () => {
    if (!unified.phone || unified.phone === "N/A") return
    navigator.clipboard.writeText(unified.phone)
    setPhoneCopied(true)
    setTimeout(() => setPhoneCopied(false), 2000)
  }

  const isPending = unified.status === "pending"
  const isAcknowledged = unified.status === "acknowledged"
  const isAccepted = unified.status === "accepted"
  const isInProgress = unified.status === "in_progress"
  const isTerminal =
    unified.status === "completed" ||
    unified.status === "rejected" ||
    unified.status === "cancelled"

  return (
    <Card className="overflow-hidden border border-border/80 bg-card shadow-md transition-all">
      {/* ── TOP HEADER STRIP: Origin -> Destination, Status, Time ── */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2.5 border-b px-4 py-3 sm:px-6 ${urgency.containerClass}`}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold ${urgency.badgeClass}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                urgency.tier === "emergency"
                  ? "bg-red-500 animate-pulse"
                  : urgency.tier === "urgent"
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />
            <span>{urgency.badgeText}</span>
          </Badge>

          <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">
            {unified.referringFacilityName}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">
            {unified.destinationFacilityName}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 font-mono text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {unified.dateReferredFormatted}
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[10px] font-bold border-border/80 text-foreground bg-background/80"
          >
            REF #{unified.referralCode}
          </Badge>
          <Badge
            variant="outline"
            className={`px-2 py-0.5 text-[11px] font-bold ${statusConfig.badgeClass}`}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* ── DANGER / CRITICAL ALERT CALLOUT (IF PRESENT) ── */}
        {unified.dangerSigns && (
          <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <span className="font-bold uppercase tracking-wider text-[11px] text-red-600 dark:text-red-400 mr-2">
                Critical Danger Sign:
              </span>
              <span>{unified.dangerSigns}</span>
            </div>
          </div>
        )}

        {/* ── MAIN 3-COLUMN CLINICAL SLIP (MATCHING BMC MESSENGER FORMAT) ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* ════════ COLUMN 1: PATIENT DEMOGRAPHICS (4 COLS) ════════ */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3.5 lg:col-span-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Patient Demographics
                </span>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Droplet className="h-3 w-3 fill-current" />
                  Type: {unified.bloodType}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <Avatar
                  className="h-14 w-14 rounded-xl border border-border shadow-xs shrink-0 cursor-pointer overflow-hidden transition-transform hover:scale-105"
                  onClick={() => {
                    if (unified.profileUrl && onPhotoClick) {
                      onPhotoClick({
                        title: `${unified.patientName} — Photo ID`,
                        fileUrl: unified.profileUrl,
                        file_url: unified.profileUrl,
                        date: new Date().toISOString(),
                        type: "Clinical Photo ID",
                      })
                    }
                  }}
                  title={unified.profileUrl ? "Click to view photo" : undefined}
                >
                  <AvatarImage
                    src={sanitizeMediaUrl(unified.profileUrl)}
                    alt={unified.patientName}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-sm">
                    {unified.patientName
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "PT"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <h3 className="text-base font-extrabold text-foreground tracking-tight truncate leading-tight">
                    {unified.patientName}
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {unified.age} • {unified.civilStatus}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary/70 shrink-0" />
                    Bday: <span className="font-medium text-foreground">{unified.birthday}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-border/50 text-xs">
                {/* Phone / CP */}
                <div className="flex items-center justify-between rounded-lg bg-card/60 border border-border/60 p-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-mono font-bold text-foreground text-xs truncate">
                      {unified.phone}
                    </span>
                  </div>
                  {unified.phone && unified.phone !== "N/A" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPhone}
                      className="h-6 px-1.5 text-[10px] font-semibold text-primary hover:text-primary"
                    >
                      {phoneCopied ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3" /> Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Copy
                        </span>
                      )}
                    </Button>
                  )}
                </div>

                {/* Address */}
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground p-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[11px] font-medium text-foreground leading-snug">
                    {unified.address}
                  </span>
                </div>
              </div>
            </div>

            {/* Allergies / Quick Flag */}
            <div className="pt-2 border-t border-border/60 text-[11px] flex items-center justify-between text-muted-foreground">
              <span>Allergies:</span>
              <span className="font-semibold text-foreground truncate max-w-[170px]">
                {unified.allergies}
              </span>
            </div>
          </div>

          {/* ════════ COLUMN 2: TRIAGE VITALS & OB INDICES (4 COLS) ════════ */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3 lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5 text-primary" />
                  Triage Vitals (V/S)
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  Pre-transfer
                </span>
              </div>

              {/* BP Highlight Box */}
              <div className="rounded-xl border border-border/80 bg-card p-2.5 flex items-center justify-between mb-2.5 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Blood Pressure
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono text-foreground tracking-tight">
                    {unified.bp} <span className="text-xs font-normal text-muted-foreground">mmHg</span>
                  </span>
                </div>
                <Badge className={`text-[10px] font-bold px-2 py-0.5 ${vitalsEval.bpBadgeClass}`}>
                  {vitalsEval.bpLabel}
                </Badge>
              </div>

              {/* Vitals Grid: Temp, Pulse, Weight, Height */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Thermometer className="h-3 w-3 text-amber-500" /> Temp (T)
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-foreground">
                    {unified.temp}
                  </span>
                </div>

                <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Heart className="h-3 w-3 text-rose-500" /> Pulse (PR)
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-foreground">
                    {unified.pulse}
                  </span>
                </div>

                <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Scale className="h-3 w-3 text-blue-500" /> Weight (wt)
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-foreground">
                    {unified.weight}
                  </span>
                </div>

                <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Ruler className="h-3 w-3 text-indigo-500" /> Height (ht)
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-foreground">
                    {unified.height}
                  </span>
                </div>
              </div>

              {/* FHT & Fundic Ht */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Baby className="h-3 w-3 text-pink-500" /> FHT:
                  </span>
                  <span className="font-mono font-bold text-foreground">{unified.fht}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3 text-primary" /> Fundic:
                  </span>
                  <span className="font-mono font-bold text-foreground">{unified.fundicHeight}</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/50">
              Recorded by referring midwife prior to transport
            </div>
          </div>

          {/* ════════ COLUMN 3: OB METRICS, CHIEF COMPLAINT & RISKS (4 COLS) ════════ */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3.5 lg:col-span-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-primary" />
                  Indication & Obstetric History
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] font-extrabold border-primary/40 text-primary bg-primary/5"
                >
                  {unified.gravidaPara}
                </Badge>
              </div>

              {/* Chief Complaint / Indication Box */}
              <div className="rounded-xl border border-border/80 bg-card p-3 space-y-1 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Chief Complaint (CC) / Reason:
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-foreground leading-snug">
                  {unified.chiefComplaint}
                </p>
              </div>

              {/* LMP, EDC, AOG Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg border border-border/60 bg-card/60 p-2 text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold">LMP</span>
                  <span className="text-[11px] font-bold text-foreground font-mono truncate block">
                    {unified.lmp}
                  </span>
                </div>

                <div className="rounded-lg border border-border/60 bg-card/60 p-2 text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold">EDC</span>
                  <span className="text-[11px] font-bold text-foreground font-mono truncate block">
                    {unified.edc}
                  </span>
                </div>

                <div className="rounded-lg border border-border/60 bg-card/60 p-2 text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold">AOG</span>
                  <span className="text-[11px] font-bold text-foreground font-mono truncate block text-primary">
                    {unified.aog}
                  </span>
                </div>
              </div>

              {/* Previous Delivery & Co-morbidities */}
              <div className="space-y-2 pt-1 border-t border-border/50 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-card/50 border border-border/50 p-2">
                  <span className="text-[11px] text-muted-foreground font-medium">Previous Delivery:</span>
                  <span className="text-xs font-bold text-foreground">
                    {unified.previousDelivery}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-card/50 border border-border/50 p-2">
                  <span className="text-[11px] text-muted-foreground font-medium">Co-morbidities:</span>
                  <span className="text-xs font-bold text-foreground">
                    {unified.coMorbidities}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Referring Contact:</span>
              <span className="font-semibold text-foreground">
                {unified.referringFacilityContact || "On File"}
              </span>
            </div>
          </div>
        </div>

        {/* ── UNIFIED TRIAGE ACTION STRIP ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70">
          <div className="flex items-center gap-2">
            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
                className="h-9 gap-1.5 text-xs font-semibold border-border hover:bg-muted text-foreground"
                title="Print or Save Handoff Slip as PDF"
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
                <span>Print / PDF Slip</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenClarificationModal}
              className="h-9 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5"
              title="Send inquiry or request more diagnostics from referring clinic"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Inquire / Clarify</span>
            </Button>
          </div>

          {/* Action Decision Buttons */}
          <div className="flex items-center gap-2">
            {(isPending || isAcknowledged) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenActionModal("rejected")}
                  className="h-9 gap-1.5 px-3 text-xs font-semibold text-red-600 dark:text-red-400 border-red-500/40 hover:bg-red-500/10 transition-all"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Decline</span>
                </Button>

                {isPending && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenActionModal("acknowledged")}
                    className="h-9 gap-1 text-xs font-medium text-foreground hover:bg-muted border-border"
                  >
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    <span>Acknowledge</span>
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => onOpenActionModal("accepted")}
                  className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 text-xs font-bold shadow-xs transition-all"
                >
                  <Check className="h-4 w-4" />
                  <span>Accept Transfer</span>
                </Button>
              </>
            )}

            {isAccepted && (
              <>
                <Button
                  size="sm"
                  onClick={() => onOpenActionModal("in_progress")}
                  className="h-9 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Mark Patient Arrived</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onOpenActionModal("completed")}
                  className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Complete Handover</span>
                </Button>
              </>
            )}

            {isInProgress && (
              <Button
                size="sm"
                onClick={() => onOpenActionModal("completed")}
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Complete Care Handover</span>
              </Button>
            )}

            {isTerminal && (
              <Badge
                variant="outline"
                className={`h-9 px-3 text-xs font-bold ${statusConfig.badgeClass}`}
              >
                Transfer {statusConfig.label}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
