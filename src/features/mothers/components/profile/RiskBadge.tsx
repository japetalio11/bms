import React from "react"
import { Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RiskBadgeProps {
  risk?: string | null
  className?: string
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ risk, className = "" }) => {
  if (!risk || risk === "N/A" || risk.trim() === "") {
    return (
      <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-muted text-muted-foreground ${className}`}>
        <Activity className="h-3 w-3 opacity-60" />
        No Risk Assessed
      </Badge>
    )
  }

  const lower = risk.toLowerCase()
  let displayText = risk
  let bgClass = "bg-green-500/10 text-green-500"

  if (lower.includes("high")) {
    displayText = "High Risk"
    bgClass = "bg-red-500/10 text-red-500"
  } else if (lower.includes("mod")) {
    displayText = "Moderate Risk"
    bgClass = "bg-yellow-500/10 text-yellow-500"
  } else if (lower.includes("low")) {
    displayText = "Low Risk"
    bgClass = "bg-green-500/10 text-green-500"
  }

  return (
    <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${bgClass} ${className}`}>
      <Activity className="h-3 w-3" />
      {displayText}
    </Badge>
  )
}
