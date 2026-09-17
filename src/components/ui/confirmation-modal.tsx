import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ShieldAlert, AlertTriangle } from "lucide-react"

export interface ConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  type?: "success" | "warning" | "high-risk"
  actionLabel?: string
  onAction?: () => void
  details?: { label: string; value: string | number }[]
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title = "Confirmation",
  description = "The clinical operation was successfully processed and saved.",
  type = "success",
  actionLabel = "Done",
  onAction,
  details = []
}: ConfirmationModalProps) {
  const isHighRisk = type === "high-risk"
  const isWarning = type === "warning"

  const iconBg = isHighRisk 
    ? "bg-red-500/10 text-red-500 border-red-500/20" 
    : isWarning 
    ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"

  const buttonBg = isHighRisk
    ? "bg-red-600 hover:bg-red-700 text-white"
    : isWarning
    ? "bg-amber-600 hover:bg-amber-700 text-white"
    : "bg-primary hover:bg-primary/90 text-primary-foreground"

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[420px]"
    >
      <div className="flex flex-col items-center text-center gap-3.5 py-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-xs ${iconBg}`}>
          {isHighRisk ? (
            <ShieldAlert className="h-6 w-6" />
          ) : isWarning ? (
            <AlertTriangle className="h-6 w-6" />
          ) : (
            <CheckCircle2 className="h-6 w-6" />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirmation</span>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed px-2">{description}</p>
        </div>

        {details.length > 0 && (
          <div className="w-full bg-muted/40 border border-border rounded-lg p-3 text-left flex flex-col gap-2 mt-1">
            {details.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{d.label}</span>
                <span className="font-medium text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="w-full pt-3 border-t border-border mt-1">
          <Button
            onClick={() => {
              onAction?.()
              onOpenChange(false)
            }}
            className={`w-full h-8 text-xs font-medium cursor-pointer ${buttonBg}`}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
