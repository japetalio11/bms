import React from "react"
import {
  ShieldAlert,
  AlertTriangle,
  HeartPulse,
  Pill,
  CheckCircle2,
  Info,
  Flame,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { PublicReferralData, ParsedReferralDetails } from "./referralTypes"
import { compileClinicalAlerts } from "./referralClinicalUtils"

interface ClinicalAlertsBannerProps {
  data: PublicReferralData
  parsed: ParsedReferralDetails
}

export function ClinicalAlertsBanner({ data, parsed }: ClinicalAlertsBannerProps) {
  const alerts = compileClinicalAlerts(
    data.obstetric_info,
    data.patient,
    data.prenatal_visits || [],
    data.cdss_alerts || [],
    parsed
  )

  const hasCritical = alerts.some((a) => a.severity === "critical")

  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-xs text-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">
            No Active Danger Signs or High-Severity CDSS Alerts Logged in Patient Record
          </span>
        </div>
        <Badge variant="outline" className="border-border/80 text-muted-foreground font-medium text-[10px]">
          Standard Baseline
        </Badge>
      </div>
    )
  }

  return (
    <Card
      className={`border shadow-xs overflow-hidden transition-colors ${
        hasCritical
          ? "border-red-500/30 bg-red-500/[0.02]"
          : "border-amber-500/30 bg-amber-500/[0.02]"
      }`}
    >
      <CardContent className="p-3.5 sm:p-4.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            {hasCritical ? (
              <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-foreground">
              Clinical Alerts & Documented Risk Factors
            </h3>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] font-mono font-medium border-border/80 text-muted-foreground bg-transparent"
          >
            {alerts.length} Documented Indicator{alerts.length > 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {alerts.map((alert) => {
            const isCrit = alert.severity === "critical"
            const isWarn = alert.severity === "warning"
            const isActionable = alert.type === "cdss" || alert.type === "danger" || isCrit

            const containerStyle = isCrit
              ? "border-red-500/30 bg-red-500/5 text-red-950 dark:text-red-100"
              : isWarn
                ? "border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100"
                : "border-border/80 bg-muted/20 text-foreground"

            const badgeStyle = isCrit
              ? "bg-red-600 text-white border-transparent font-bold shadow-xs"
              : isActionable
                ? "bg-amber-500 text-amber-950 border-transparent font-black shadow-xs"
                : "bg-transparent text-muted-foreground border-border/80 font-medium"

            const typeLabel =
              alert.type === "cdss"
                ? "CDSS Alert"
                : alert.type === "danger"
                  ? "Danger Sign"
                  : alert.type === "allergy"
                    ? "Precaution"
                    : alert.type === "age"
                      ? "Age Risk"
                      : "Obstetric Risk"

            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-3 space-y-1 text-xs transition-all ${containerStyle}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-extrabold text-foreground truncate block">
                    {alert.title}
                  </span>
                  <Badge variant={isActionable ? "default" : "outline"} className={`text-[9px] uppercase shrink-0 ${badgeStyle}`}>
                    {typeLabel}
                  </Badge>
                </div>
                {alert.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {alert.description}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
