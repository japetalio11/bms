import * as React from "react"
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

export function CreateReferralModal({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Inter-Clinic Referral"
      description="Initiate a transfer to a higher-level facility within the Health Care Provider Network (HCPN)."
      className="sm:max-w-[600px]"
    >
      <div className="flex flex-col gap-4 py-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mother Search */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground dark:text-white">Mother Search</Label>
            <Input className="h-8 text-xs bg-background dark:bg-black border-sidebar-border" placeholder="Search patient..." />
          </div>

          {/* Destination Facility */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground dark:text-white">Destination Facility</Label>
            <Select>
              <SelectTrigger className="h-8 text-xs bg-background dark:bg-black border-sidebar-border">
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bmc">Bicol Medical Center</SelectItem>
                <SelectItem value="brtth">Bicol Regional Training and Teaching Hospital</SelectItem>
                <SelectItem value="zsp">Ziga Memorial District Hospital</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reason for Referral */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-foreground dark:text-white">Reason for Referral</Label>
          <Select>
            <SelectTrigger className="h-8 text-xs bg-background dark:bg-black border-sidebar-border">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preeclampsia">Pre-eclampsia</SelectItem>
              <SelectItem value="hemorrhage">Postpartum Hemorrhage</SelectItem>
              <SelectItem value="fetal_distress">Fetal Distress</SelectItem>
              <SelectItem value="other">Other / Need Specialist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chief Complaint */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-foreground dark:text-white">Chief Complaint</Label>
          <Textarea 
            className="min-h-[80px] text-xs bg-background dark:bg-black border-sidebar-border resize-none" 
            placeholder="Describe the chief complaint..." 
          />
        </div>

        {/* Previous Delivery Note */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-foreground dark:text-white">Previous Delivery Note</Label>
          <Textarea 
            className="min-h-[80px] text-xs bg-background dark:bg-black border-sidebar-border resize-none" 
            placeholder="Include relevant obstetrical history context..." 
          />
        </div>

        {/* Co-morbidities */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-foreground dark:text-white">Co-morbidities</Label>
          <Textarea 
            className="min-h-[80px] text-xs bg-background dark:bg-black border-sidebar-border resize-none" 
            placeholder="List any co-morbidities..." 
          />
        </div>

      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-sidebar-border">
        <Button variant="ghost" className="h-8 text-xs w-full sm:w-auto" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button className="h-8 text-xs w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90">
          Submit Referral
        </Button>
      </div>
    </ResponsiveModal>
  )
}
