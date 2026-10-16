import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  extractRiskLevel,
  getRiskBadgeClasses,
  getRiskLabel,
  getRiskVariant,
} from "@/lib/riskUtils"
import { mothersApi } from "../api"

export interface OverrideRiskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherData: any
  currentRisk?: string | null
  onSuccess?: () => void
}

export function OverrideRiskModal({
  open,
  onOpenChange,
  motherData,
  currentRisk: propCurrentRisk,
  onSuccess,
}: OverrideRiskModalProps) {
  const [selectedRisk, setSelectedRisk] = React.useState<string>("High Risk")
  const [overrideReason, setOverrideReason] = React.useState<string>("")
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  const pregnancies = motherData?.pregnancies || []
  const prenatalVisits = motherData?.prenatalVisits || []

  const activePregnancy = React.useMemo(() => {
    return (
      pregnancies.find(
        (p: any) =>
          String(p.pregnancy_status || p.status || "").toLowerCase() === "active"
      ) || pregnancies[0]
    )
  }, [pregnancies])

  const calculatedCurrentRisk = React.useMemo(() => {
    if (propCurrentRisk) return propCurrentRisk
    return extractRiskLevel(motherData, pregnancies, prenatalVisits)
  }, [propCurrentRisk, motherData, pregnancies, prenatalVisits])

  React.useEffect(() => {
    if (open) {
      setError(null)
      setOverrideReason("")
      const currentVariant = getRiskVariant(calculatedCurrentRisk)
      if (currentVariant === "high") {
        setSelectedRisk("Moderate Risk")
      } else if (currentVariant === "moderate") {
        setSelectedRisk("High Risk")
      } else {
        setSelectedRisk("Moderate Risk")
      }
    }
  }, [open, calculatedCurrentRisk])

  const motherName = React.useMemo(() => {
    if (!motherData) return "Patient"
    return (
      [
        motherData.user?.first_name || motherData.first_name,
        motherData.user?.last_name || motherData.last_name,
      ]
        .filter(Boolean)
        .join(" ") || "Patient"
    )
  }, [motherData])

  const currentBadgeClasses = getRiskBadgeClasses(calculatedCurrentRisk)
  const currentRiskLabel = getRiskLabel(calculatedCurrentRisk)

  const handleSubmit = async () => {
    setError(null)
    const motherId =
      motherData?.mother_id ||
      motherData?.user_id ||
      motherData?._id ||
      motherData?.id ||
      ""

    if (!motherId) {
      setError("Patient ID could not be identified.")
      return
    }

    if (!overrideReason.trim()) {
      setError("Please provide a clinical justification for overriding the risk level.")
      return
    }

    setLoading(true)
    try {
      const pregnancyId =
        activePregnancy?.pregnancy_id ||
        activePregnancy?._id ||
        activePregnancy?.id

      await mothersApi.overrideRiskLevel({
        motherId,
        pregnancyId,
        newRiskLevel: selectedRisk,
        overrideReason: overrideReason.trim(),
      })

      toast.success(
        `Risk level for ${motherName} successfully updated to ${selectedRisk}`
      )
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.details?.[0] ||
        err.message ||
        "Failed to override risk level"
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const riskOptions = [
    {
      value: "High Risk",
      title: "High Risk",
      subtitle: "Critical or complex medical factors requiring specialist/hospital referral",
      icon: ShieldAlert,
      badgeClass: "border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400",
      activeBorder: "border-red-500 ring-1 ring-red-500 bg-red-500/5",
    },
    {
      value: "Moderate Risk",
      title: "Moderate Risk",
      subtitle: "Elevated risk factors or vital changes requiring close monitoring",
      icon: AlertTriangle,
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400",
      activeBorder: "border-amber-500 ring-1 ring-amber-500 bg-amber-500/5",
    },
    {
      value: "Low Risk",
      title: "Low Risk",
      subtitle: "Standard clinical baseline with no emergent maternal warning signs",
      icon: CheckCircle2,
      badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
      activeBorder: "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-500/5",
    },
  ]

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Clinical Risk Level Override"
      description="Update or override the evaluated patient risk level based on clinical judgment."
      className="sm:max-w-md md:max-w-lg"
    >
      <div className="flex flex-col gap-4 py-2">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card/60 p-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground">
              {motherName}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {activePregnancy
                ? `Active Pregnancy: G${activePregnancy.gravida || 1}P${activePregnancy.parity || 0}`
                : "Maternal Health Profile"}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Current Assessed Risk
            </span>
            <Badge
              className={cn(
                "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold shadow-none",
                currentBadgeClasses.badge
              )}
            >
              <Activity className="h-3 w-3" />
              {currentRiskLabel}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold text-foreground">
            Select New Risk Level *
          </Label>
          <div className="flex flex-col gap-2">
            {riskOptions.map((opt) => {
              const Icon = opt.icon
              const isSelected = selectedRisk === opt.value
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setSelectedRisk(opt.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer",
                    isSelected
                      ? opt.activeBorder
                      : "border-border/60 bg-card hover:border-border hover:bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                      opt.badgeClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {opt.title}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-primary">
                          Selected
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] leading-relaxed text-muted-foreground">
                      {opt.subtitle}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="overrideReasonText"
              className="text-xs font-semibold text-foreground"
            >
              Clinical Justification / Reason *
            </Label>
            <span className="text-[10px] text-muted-foreground">Required</span>
          </div>
          <Textarea
            id="overrideReasonText"
            placeholder="Document reason for overriding risk (e.g. physician clinical review, external ultrasound findings, pre-existing cardiac condition)..."
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="h-20 resize-none border-border bg-card text-xs text-card-foreground"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="h-8 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Confirm Risk Override
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
