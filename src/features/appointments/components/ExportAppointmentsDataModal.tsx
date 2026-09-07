import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ExportAppointmentsDataModal({ 
  children,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  appointments = []
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  appointments?: any[]
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = externalOpen !== undefined
  const isOpen = isControlled ? externalOpen : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (externalOnOpenChange) {
      externalOnOpenChange(newOpen)
    }
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
  }

  const [fileFormat, setFileFormat] = React.useState("csv")

  const handleExport = () => {
    if (!appointments || appointments.length === 0) {
      alert("No appointments available to export.")
      return
    }

    const headers = ["Appointment ID", "Mother Name", "Risk Flag", "Status", "Type", "Date & Time"]
    const rows = appointments.map(app => [
      `"${app.id || ''}"`,
      `"${app.name || ''}"`,
      `"${app.risk || 'Low Risk'}"`,
      `"${app.status || ''}"`,
      `"${app.type || ''}"`,
      `"${app.date || ''}"`
    ])

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Appointments_Export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    handleOpenChange(false)
  }

  return (
    <ResponsiveModal 
      open={isOpen}
      onOpenChange={handleOpenChange}
      trigger={children}
      title="Export Appointments Data"
      description="Download a generated schedule report based on your current filters."
    >
      <div className="flex flex-col gap-6 py-2">
        {/* File Format */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-medium text-foreground dark:text-white">File Format</h4>
          <RadioGroup value={fileFormat} onValueChange={setFileFormat} className="gap-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="af2" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="af2" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">CSV</span> <span className="text-muted-foreground">- Standard spreadsheet format</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="excel" id="af1" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="af1" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">Excel (.xlsx)</span> <span className="text-muted-foreground">- Sheet document</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Data Scope */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-medium text-foreground dark:text-white">Data Scope</h4>
          <RadioGroup defaultValue="filtered" className="gap-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="filtered" id="as1" className="border-sidebar-border data-[state=checked]:border-white data-[state=checked]:text-foreground dark:text-white" />
              <Label htmlFor="as1" className="text-xs font-normal">
                <span className="text-foreground dark:text-white">Current Filtered View</span> <span className="text-muted-foreground">({appointments.length} items)</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4 border-t border-sidebar-border mt-2">
        <Button variant="ghost" className="h-8 text-xs text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/5" onClick={() => handleOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleExport} className="h-8 text-xs bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
          Export Appointments
        </Button>
      </div>
    </ResponsiveModal>
  )
}

