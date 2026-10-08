import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MessageSquare, Clock, MapPin, ShieldCheck, HeartHandshake } from "lucide-react"

interface TechSupportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TechSupportModal({ open, onOpenChange }: TechSupportModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Clinic Technical Support & Emergency Assistance"
      description="Direct contact channels for system administrators, IT officers, and emergency hotline dispatch."
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <HeartHandshake className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-foreground">BMS Health Support Desk is Active</span>
            <p className="text-muted-foreground mt-0.5">
              Available Monday through Friday, 8:00 AM – 5:00 PM for routine questions, and 24/7 on-call for emergency hospital transfer network escalations.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">RHU Health Hotline / SMS</div>
                <div className="text-xs text-muted-foreground font-mono">+63 (054) 871-2489 / 0917-123-4567</div>
              </div>
            </div>
            <a
              href="tel:+63548712489"
              className="px-2.5 py-1 rounded bg-muted hover:bg-accent text-xs font-medium text-foreground transition-colors"
            >
              Call
            </a>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Technical Support Email</div>
                <div className="text-xs text-muted-foreground font-mono">support@bms.gov.ph</div>
              </div>
            </div>
            <a
              href="mailto:support@bms.gov.ph"
              className="px-2.5 py-1 rounded bg-muted hover:bg-accent text-xs font-medium text-foreground transition-colors"
            >
              Email
            </a>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Municipal Health Office IT Desk</div>
                <div className="text-xs text-muted-foreground">Local Government Unit IT Operations Center</div>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Station 1</span>
          </div>
        </div>

        <div className="text-center pt-2">
          <Button
            variant="outline"
            className="w-full text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
