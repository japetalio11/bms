import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ExportMaternalDataModal({ 
  children,
  open,
  onOpenChange
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <ResponsiveModal 
      open={open}
      onOpenChange={onOpenChange}
      trigger={children}
      title="Export Maternal Data"
      description="Download a generated report based on your current filters to comply with DOH/FHSIS standards."
    >
      <div className="flex flex-col gap-6 py-2">
        {/* File Format */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-medium text-foreground dark:text-white">File Format</h4>
          <RadioGroup defaultValue="excel" className="gap-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="excel" id="mf1" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="mf1" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">Excel (.xlsx)</span> <span className="text-muted-foreground">- Best for spreadsheets and manual review</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="mf2" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="mf2" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">CSV</span> <span className="text-muted-foreground">- Best for importing into other systems (e.g., iClinicSys)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="mf3" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="mf3" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">PDF Summary</span> <span className="text-muted-foreground">- Best for stakeholder/LGU meetings</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Data Scope */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-medium text-foreground dark:text-white">Data Scope</h4>
          <RadioGroup defaultValue="filtered" className="gap-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="filtered" id="ms1" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="ms1" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">Current Filtered View</span> <span className="text-muted-foreground">(e.g., 12 items) - Useful if filtered by "High Risk" or specific "Barangay".</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="ms2" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="ms2" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">All Mothers</span> <span className="text-muted-foreground">(e.g., 152 items) - Pulls from the entire PATIENT and PREGNANCY registry.</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Included Columns */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-medium text-foreground dark:text-white">Included Columns</h4>
          <RadioGroup defaultValue="standard" className="gap-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard" id="mc1" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="mc1" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">Standard View</span> <span className="text-muted-foreground">(Matches your current table columns: Mother Name, Risk Flag, Gestational Age, EDD, BHS)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="mc2" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="mc2" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">All Data Fields</span> <span className="text-muted-foreground">(Includes hidden metadata, full obstetric history, baseline vitals, and audit logs)</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4 border-t border-sidebar-border mt-2">
        <Button variant="ghost" className="h-8 text-xs text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/5" onClick={() => onOpenChange?.(false)}>
          Cancel
        </Button>
        <Button className="h-8 text-xs bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
          Export Mothers
        </Button>
      </div>
    </ResponsiveModal>
  )
}
