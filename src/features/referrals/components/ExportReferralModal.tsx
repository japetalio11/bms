import * as React from "react"
import { useState } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ExportReferralModal({
  open,
  onOpenChange,
  referrals = [],
  filteredCount = 0,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  referrals?: any[]
  filteredCount?: number
}) {
  const [format, setFormat] = useState("csv")
  const [scope, setScope] = useState("all")
  const [columns, setColumns] = useState("standard")

  const totalCount = referrals.length

  const handleExport = () => {
    const dataToExport = scope === "filtered" ? referrals.slice(0, filteredCount || totalCount) : referrals

    if (format === "csv" || format === "excel") {
      const headers = ["Referral ID", "Mother Name", "Initiated At", "Risk Flag", "Status", "Destination Facility", "Transfer Code", "Secure Link"]
      const rows = dataToExport.map((r) => {
        const motherName = r.pregnancy?.mother 
          ? `${r.pregnancy.mother.first_name || ""} ${r.pregnancy.mother.last_name || ""}`.trim()
          : (r.motherName || "N/A")
        const dest = r.toFacility?.facility_name || r.external_facility_name || r.destination || "N/A"
        return [
          r.referral_id || r.id || "N/A",
          `"${motherName}"`,
          r.date_referred ? new Date(r.date_referred).toLocaleString() : "N/A",
          r.pregnancy?.risk_flag || r.riskFlag || "Low Risk",
          r.status || "Pending",
          `"${dest}"`,
          r.shared_pin || r.transferCode || "N/A",
          r.secure_link || r.recordLink || "N/A",
        ].join(",")
      })

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `referrals_export_${Date.now()}.${format === "excel" ? "csv" : "csv"}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      alert(`Report generated for ${dataToExport.length} referral records.`)
    }

    onOpenChange(false)
  }

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
              <RadioGroupItem value="csv" id="r2" />
              <Label htmlFor="r2" className="text-xs font-normal">CSV (.csv) - Spreadsheet compatible</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="excel" id="r1" />
              <Label htmlFor="r1" className="text-xs font-normal">Excel Compatible (.csv)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="r3" />
              <Label htmlFor="r3" className="text-xs font-normal">Summary Report - Stakeholder format</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Section 2: Data Scope */}
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold text-foreground dark:text-white">Data Scope</Label>
          <RadioGroup value={scope} onValueChange={setScope} className="gap-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="filtered" id="s1" />
              <Label htmlFor="s1" className="text-xs font-normal">
                Current Filtered View ({filteredCount} items)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="s2" />
              <Label htmlFor="s2" className="text-xs font-normal">
                All Referrals ({totalCount} items) - Pulls entire referral table history
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Section 3: Included Columns */}
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold text-foreground dark:text-white">Included Columns</Label>
          <RadioGroup value={columns} onValueChange={setColumns} className="gap-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard" id="c1" />
              <Label htmlFor="c1" className="text-xs font-normal">Standard View (Matches referral table)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="c2" />
              <Label htmlFor="c2" className="text-xs font-normal">All Data Fields (Includes full e-Referral record payload)</Label>
            </div>
          </RadioGroup>
        </div>

      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-sidebar-border">
        <Button variant="ghost" className="h-8 text-xs w-full sm:w-auto" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleExport} className="h-8 text-xs w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90">
          Export Referrals
        </Button>
      </div>
    </ResponsiveModal>
  )
}
