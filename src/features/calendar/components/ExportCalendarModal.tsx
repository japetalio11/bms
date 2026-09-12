import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format } from "date-fns"
import type { AppEvent } from "./CalendarPage"

export function ExportCalendarModal({ 
  children,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  events = []
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  events?: AppEvent[]
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
    if (!events || events.length === 0) {
      alert("No calendar events available to export.")
      return
    }

    const headers = ["Event ID", "Title", "Mother Name", "Type", "Risk Level", "Status", "Start Time", "End Time"]
    const rows = events.map(ev => [
      `"${ev.id || ''}"`,
      `"${ev.title || ''}"`,
      `"${ev.motherName || ''}"`,
      `"${ev.type || ''}"`,
      `"${ev.risk || 'Low Risk'}"`,
      `"${ev.status || ''}"`,
      `"${ev.start ? format(ev.start, 'yyyy-MM-dd HH:mm') : ''}"`,
      `"${ev.end ? format(ev.end, 'yyyy-MM-dd HH:mm') : ''}"`
    ])

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Calendar_Schedule_Export_${new Date().toISOString().slice(0, 10)}.csv`)
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
      title="Export Calendar Data"
      description="Download a generated report based on your current filters."
    >
      <div className="flex flex-col gap-5 py-2">
        {/* File Format */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-medium text-foreground">File Format</h4>
          <RadioGroup value={fileFormat} onValueChange={setFileFormat} className="gap-2.5">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="format-csv" className="border-border data-[state=checked]:border-primary h-3.5 w-3.5" />
              <Label htmlFor="format-csv" className="text-xs font-normal">
                <span className="text-foreground">CSV</span> <span className="text-muted-foreground">- Standard schedule data</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="format-pdf" className="border-border data-[state=checked]:border-primary h-3.5 w-3.5" />
              <Label htmlFor="format-pdf" className="text-xs font-normal">
                <span className="text-foreground">PDF Summary</span> <span className="text-muted-foreground">- Print report</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Data Scope */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-medium text-foreground">Data Scope</h4>
          <div className="text-xs text-muted-foreground">
            Exporting <strong className="text-foreground">{events.length}</strong> event(s) currently loaded in calendar view.
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
        <Button variant="ghost" onClick={() => handleOpenChange(false)} className="flex-1 text-xs font-medium border-border text-foreground hover:bg-accent h-8">
          Cancel
        </Button>
        <Button onClick={handleExport} className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8">
          Export Calendar
        </Button>
      </div>
    </ResponsiveModal>
  )
}
