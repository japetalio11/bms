import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format } from "date-fns"
import { toast } from "sonner"
import { Download, FileSpreadsheet, Printer, Loader2 } from "lucide-react"
import { downloadCsv, openPrintableReportWindow } from "@/lib/exportUtils"
import type { AppEvent } from "./CalendarPage"

export function ExportCalendarModal({
  children,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  events = [],
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

  const [fileFormat, setFileFormat] = React.useState<"csv" | "pdf">("csv")
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = () => {
    if (!events || events.length === 0) {
      toast.error("No calendar events available to export.")
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `Calendar_Schedule_Export_${timestamp}`

      if (fileFormat === "pdf") {
        const rowsHtml = events
          .map((ev, idx) => {
            const startStr = ev.start ? format(ev.start, "yyyy-MM-dd hh:mm a") : "N/A"
            const risk = ev.risk || "Low Risk"
            const status = ev.status || "Scheduled"

            return `
              <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td><strong>${ev.title || "Event"}</strong></td>
                <td>${ev.motherName || "N/A"}</td>
                <td>${ev.type || "Clinic Appointment"}</td>
                <td><strong>${startStr}</strong></td>
                <td><span class="badge ${risk.toLowerCase().includes("high") ? "badge-high" : "badge-low"}">${risk}</span></td>
                <td>${status}</td>
              </tr>
            `
          })
          .join("")

        const reportHtml = `
          <div class="header-container">
            <div class="header-sub">Republic of the Philippines • Department of Health</div>
            <div class="header-facility">Maternal & Child Health Care Center</div>
            <div class="header-title">Calendar Schedule & Clinic Agenda</div>
            <div class="meta-bar">
              <span>Total Scheduled Events: <strong>${events.length}</strong></span>
              <span>Generated: <strong>${new Date().toLocaleString()}</strong></span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align:center;">#</th>
                <th>Title / Agenda</th>
                <th>Mother's Name</th>
                <th style="width: 100px;">Event Type</th>
                <th style="width: 140px;">Date & Time</th>
                <th style="width: 80px;">Risk Level</th>
                <th style="width: 80px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="sig-box">
              <strong>Prepared By:</strong>
              Schedule Coordinator
            </div>
            <div class="sig-box">
              <strong>Noted By:</strong>
              Facility In-Charge
            </div>
          </div>
        `

        openPrintableReportWindow("Calendar Schedule Agenda", reportHtml)
        toast.success(`Generated schedule sheet for ${events.length} events`)
      } else {
        const headers = [
          "Event ID",
          "Title",
          "Mother Name",
          "Type",
          "Risk Level",
          "Status",
          "Start Time",
          "End Time",
        ]
        const rows = events.map((ev) => [
          String(ev.id || ""),
          typeof ev.title === "string" ? ev.title : String(ev.title || "Event"),
          String(ev.motherName || ""),
          String(ev.type || ""),
          String(ev.risk || "Low Risk"),
          String(ev.status || ""),
          ev.start ? format(ev.start, "yyyy-MM-dd HH:mm") : "",
          ev.end ? format(ev.end, "yyyy-MM-dd HH:mm") : "",
        ])

        downloadCsv(filename, headers, rows)
        toast.success(`Exported ${events.length} calendar events successfully`)
      }

      handleOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to export calendar")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      trigger={children}
      title="Export Calendar Schedule"
      description="Download or print a scheduled roster of clinical visits, reminders, and appointments."
    >
      <div className="flex flex-col gap-5 py-2">
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-medium text-foreground">File Format</h4>
          <RadioGroup
            value={fileFormat}
            onValueChange={(v: any) => setFileFormat(v)}
            className="gap-2.5"
          >
            <div className="flex cursor-pointer items-center space-x-2 rounded-lg border border-border/70 p-2.5 hover:bg-muted/40">
              <RadioGroupItem
                value="csv"
                id="format-csv"
                className="h-3.5 w-3.5 border-border data-[state=checked]:border-primary"
              />
              <Label htmlFor="format-csv" className="cursor-pointer text-xs font-normal">
                <span className="font-medium text-foreground">Universal CSV (.csv)</span>{" "}
                <span className="text-muted-foreground">- Spreadsheet compatible</span>
              </Label>
            </div>
            <div className="flex cursor-pointer items-center space-x-2 rounded-lg border border-border/70 p-2.5 hover:bg-muted/40">
              <RadioGroupItem
                value="pdf"
                id="format-pdf"
                className="h-3.5 w-3.5 border-border data-[state=checked]:border-primary"
              />
              <Label htmlFor="format-pdf" className="cursor-pointer text-xs font-normal">
                <span className="font-medium text-foreground">Printable Clinic Agenda (PDF)</span>{" "}
                <span className="text-muted-foreground">- DOH layout</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
          <span>Data Scope:</span>
          <span className="text-foreground">
            Exporting <strong>{events.length} event(s)</strong> currently loaded in active view.
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
        <Button
          variant="ghost"
          onClick={() => handleOpenChange(false)}
          className="h-8 flex-1 border-border text-xs font-medium text-foreground hover:bg-accent"
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : fileFormat === "pdf" ? (
            <Printer className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isExporting
            ? "Exporting..."
            : fileFormat === "pdf"
              ? "Generate Agenda Sheet"
              : "Export Calendar"}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
