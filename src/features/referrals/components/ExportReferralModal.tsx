import * as React from "react"
import { useState } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ExportReferralModal({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [format, setFormat] = useState("excel")
  const [scope, setScope] = useState("filtered")
  const [columns, setColumns] = useState("standard")

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Export Referral Data"
      description="Download a generated report of facility transfers and outcomes."
      className="sm:max-w-[500px]"
    >
      <div className="flex flex-col gap-6 py-4">
        
        {/* Section 1: File Format */}
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold text-foreground dark:text-white">File Format</Label>
          <RadioGroup value={format} onValueChange={setFormat} className="gap-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="excel" id="r1" />
              <Label htmlFor="r1" className="text-xs font-normal">Excel (.xlsx) - Best for spreadsheets and manual review</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="r2" />
              <Label htmlFor="r2" className="text-xs font-normal">CSV - Best for importing into other systems</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="r3" />
              <Label htmlFor="r3" className="text-xs font-normal">PDF Summary - Best for stakeholder meetings</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Section 2: Data Scope */}
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold text-foreground dark:text-white">Data Scope</Label>
          <RadioGroup value={scope} onValueChange={setScope} className="gap-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="filtered" id="s1" />
              <Label htmlFor="s1" className="text-xs font-normal">Current Filtered View (e.g., 5 items) - Useful if filtered by "In Transit".</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="s2" />
              <Label htmlFor="s2" className="text-xs font-normal">All Referrals (e.g., 87 items) - Pulls the entire ONLINE_REFERRAL table history.</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Section 3: Included Columns */}
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold text-foreground dark:text-white">Included Columns</Label>
          <RadioGroup value={columns} onValueChange={setColumns} className="gap-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard" id="c1" />
              <Label htmlFor="c1" className="text-xs font-normal">Standard View (Matches current table columns)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="c2" />
              <Label htmlFor="c2" className="text-xs font-normal">All Data Fields (Includes full HL7 payload data)</Label>
            </div>
          </RadioGroup>
        </div>

      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-sidebar-border">
        <Button variant="ghost" className="h-8 text-xs w-full sm:w-auto" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button className="h-8 text-xs w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90">
          Export Referrals
        </Button>
      </div>
    </ResponsiveModal>
  )
}
