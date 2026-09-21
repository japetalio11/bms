import React from "react"
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  getRiskVariant,
  getRiskLabel,
  getRiskBadgeClasses,
} from "@/lib/riskUtils"

interface RiskBadgeProps {
  risk?: string | null
  className?: string
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  risk,
  className = "",
}) => {
  const variant = getRiskVariant(risk)
  const label = getRiskLabel(risk)
  const classes = getRiskBadgeClasses(risk)

  return (
    <Badge
      className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${classes.badge} ${className}`}
    >
      {variant === "high" ? (
        <Activity className="h-3 w-3" />
      ) : variant === "moderate" ? (
        <AlertTriangle className="h-3 w-3" />
      ) : variant === "low" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Activity className="h-3 w-3 opacity-60" />
      )}
      {label}
    </Badge>
  )
}

