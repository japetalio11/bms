import * as React from "react"
import { useState } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Send } from "lucide-react"
import { referralRepository } from "@/lib/repositories/referralRepository"

interface CloseReferralModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  referral: any
  onSuccess?: () => void
}

export function CloseReferralModal({
  open,
  onOpenChange,
  referral,
  onSuccess,
}: CloseReferralModalProps) {
  const [outcome, setOutcome] = useState<string>("Normal Spontaneous Vaginal Delivery (NSVD)")
  const [customOutcome, setCustomOutcome] = useState<string>("")
  const [responseNotes, setResponseNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  if (!referral) return null

  const referralId = referral.referral_id || referral.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!referralId) {
      toast.error("Invalid referral identifier")
      return
    }

    const finalOutcome = outcome === "Other" ? customOutcome.trim() : outcome
    if (!finalOutcome) {
      toast.error("Please specify the clinical outcome")
      return
    }

    setIsSubmitting(true)
    try {
      await referralRepository.respondToReferral(referralId, {
        status: "completed",
        outcome: finalOutcome,
        response_notes: responseNotes.trim() || "Maternal care completed. Counter-referral feedback logged.",
        is_completed: true,
      })

      toast.success("Counter-referral recorded. Referral loop successfully closed.")
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      console.error("[CloseReferralModal] Error closing referral:", err)
      toast.error(err.response?.data?.error || "Failed to record discharge feedback.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Close Referral & Log Counter-Feedback"
      description="Record the patient's delivery outcome and discharge recommendations to close the two-way referral loop back to the originating health facility."
      className="sm:max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Clinical Outcome / Treatment Result <span className="text-red-500">*</span>
          </Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger className="h-8 text-xs border-border bg-background">
              <SelectValue placeholder="Select clinical outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Normal Spontaneous Vaginal Delivery (NSVD)">
                Normal Spontaneous Vaginal Delivery (NSVD)
              </SelectItem>
              <SelectItem value="Cesarean Delivery (CS)">
                Cesarean Delivery (CS)
              </SelectItem>
              <SelectItem value="Assisted Vaginal Delivery (Vacuum/Forceps)">
                Assisted Vaginal Delivery (Vacuum/Forceps)
              </SelectItem>
              <SelectItem value="Preeclampsia / Eclampsia Stabilized">
                Preeclampsia / Eclampsia Stabilized
              </SelectItem>
              <SelectItem value="Preterm Labor Arrested">
                Preterm Labor Arrested
              </SelectItem>
              <SelectItem value="Postpartum Hemorrhage Managed">
                Postpartum Hemorrhage Managed
              </SelectItem>
              <SelectItem value="Transferred to Tertiary Specialty Center">
                Transferred to Tertiary Specialty Center
              </SelectItem>
              <SelectItem value="Other">Other Outcome</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {outcome === "Other" && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground">
              Specify Outcome Details <span className="text-red-500">*</span>
            </Label>
            <Input
              value={customOutcome}
              onChange={(e) => setCustomOutcome(e.target.value)}
              placeholder="e.g. Sepsis resolved, mother stabilized"
              className="h-8 text-xs border-border bg-background"
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Discharge Notes & Advice for Referring Midwife/RHU
          </Label>
          <Textarea
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            placeholder="e.g. Infant delivered male (3.2 kg, APGAR 9/10). Mother discharged stable. Continue oral Iron + Folic Acid. Schedule 1-week postpartum check-up for wound inspection."
            rows={4}
            className="text-xs border-border bg-background resize-none"
          />
          <span className="text-[10px] text-muted-foreground">
            These notes will be delivered back to the originating health facility to guide local postpartum monitoring.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-8 text-xs font-medium"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>Close Loop & Dispatch Feedback</span>
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
