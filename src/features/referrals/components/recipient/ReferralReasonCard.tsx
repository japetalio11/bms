import React from "react"
import {
  AlertCircle,
  Building2,
  Clock,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ShieldAlert,
  ArrowRightCircle,
  Send,
  Calendar,
  UserCheck,
  AlertTriangle,
  Printer,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { PublicReferralData, ParsedReferralDetails } from "./referralTypes"
import {
  determineReferralUrgency,
  formatStatusConfig,
  calculateObstetricIndices,
  checkClinicalConsistency,
} from "./referralClinicalUtils"

interface ReferralReasonCardProps {
  data: PublicReferralData
  parsed: ParsedReferralDetails
  resolvedRiskLevel: string
  onOpenClarificationModal: () => void
  onPrint?: () => void
}

export function ReferralReasonCard({
  data,
  parsed,
  resolvedRiskLevel,
  onOpenClarificationModal,
  onPrint,
}: ReferralReasonCardProps) {
  const urgency = determineReferralUrgency(
    resolvedRiskLevel,
    parsed,
    data.cdss_alerts,
    data.obstetric_info?.latest_vitals
  )
  const statusConfig = formatStatusConfig(data.status)

  const lmpEffective = data.obstetric_info?.lmp_date || parsed.lmpParsed
  const obstetricMetrics = calculateObstetricIndices(
    lmpEffective,
    data.obstetric_info?.latest_vitals?.gestational_age_weeks || 0
  )
  const consistencyIssue = checkClinicalConsistency(
    urgency.tier,
    parsed,
    data.obstetric_info,
    data.cdss_alerts,
    obstetricMetrics.gestationalWeeks,
    data.obstetric_info?.latest_vitals?.fundic_height
  )

  const referralDateFormatted = data.date_referred
    ? new Date(data.date_referred).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Date Unspecified"

  return (
    <Card className="overflow-hidden border border-border/80 bg-card shadow-xs transition-all">
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 sm:px-6 ${urgency.containerClass}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`px-2.5 py-0.5 text-[10px] sm:text-xs tracking-wider uppercase ${urgency.badgeClass}`}>
            {urgency.badgeText}
          </Badge>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            {urgency.title}
          </span>

          {consistencyIssue && (
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-amber-800 dark:text-amber-300 border-b border-dashed border-amber-600/70 dark:border-amber-400/70 cursor-help"
              title={consistencyIssue.message}
            >
              <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Verify ({consistencyIssue.shortLabel})</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
          <span className="flex items-center gap-1 font-mono text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {referralDateFormatted}
          </span>
          <Badge variant="outline" className="font-mono text-[10px] font-semibold border-border/80 text-muted-foreground bg-transparent">
            REF #{data.referral_id.slice(-8).toUpperCase()}
          </Badge>
          {onPrint && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
              className="h-7 px-2 text-[11px] font-semibold gap-1 text-foreground border-border hover:bg-muted"
              title="Print clinical record or save as PDF"
            >
              <Printer className="h-3 w-3 text-primary" />
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-primary" />
                Reason for Referral / Chief Clinical Indication
              </span>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 sm:p-4 transition-colors">
                <p className="text-sm sm:text-base font-extrabold text-foreground leading-relaxed">
                  {parsed.chiefComplaint}
                </p>
                {data.obstetric_info?.latest_vitals?.danger_signs && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Danger Signs Observed: {data.obstetric_info.latest_vitals.danger_signs}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-3.5 space-y-1">
                <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Clinical Concern
                </span>
                <p className="text-xs sm:text-sm font-bold text-foreground">
                  {parsed.clinicalConcern}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Primary medical or obstetric rationale for transfer
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-3.5 space-y-1">
                <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ArrowRightCircle className="h-3 w-3 text-primary" />
                  Requested Clinical Action
                </span>
                <p className="text-xs sm:text-sm font-bold text-foreground">
                  {parsed.requestedAction}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Expected management required from receiving team
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground border border-border/60">
              <span className="font-bold text-foreground">Triage Protocol:</span>
              <span>{urgency.actionAdvice}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Referring Facility (Origin)
              </span>
              <Badge variant="outline" className="text-[9px] font-medium uppercase border-border/80 text-muted-foreground bg-transparent">
                Sending Clinic
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-sm sm:text-base font-extrabold text-foreground leading-snug">
                {data.referring_facility.name}
              </p>
              {data.referring_facility.type && (
                <p className="text-xs text-muted-foreground">
                  Facility Type: {data.referring_facility.type}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1 text-xs text-muted-foreground">
              {data.referring_facility.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                  <span className="line-clamp-2">{data.referring_facility.address}</span>
                </div>
              )}

              {data.referring_facility.contact ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <a
                    href={`tel:${data.referring_facility.contact}`}
                    className="font-bold text-foreground hover:underline"
                  >
                    {data.referring_facility.contact}
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  <span>No phone number listed</span>
                </div>
              )}

              {data.referring_facility.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <a
                    href={`mailto:${data.referring_facility.email}`}
                    className="truncate hover:underline text-foreground"
                  >
                    {data.referring_facility.email}
                  </a>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenClarificationModal}
                className="w-full h-8.5 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Contact Referring Provider</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
