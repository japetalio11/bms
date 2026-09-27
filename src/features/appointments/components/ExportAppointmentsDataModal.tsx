import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Loader2,
  Filter,
} from "lucide-react"
import {
  downloadCsv,
  downloadJson,
  openPrintableReportWindow,
} from "@/lib/exportUtils"

export interface ExportAppointmentsDataModalProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  appointments?: any[]
}

export function ExportAppointmentsDataModal({
  children,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  appointments = [],
}: ExportAppointmentsDataModalProps) {
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

  const [fileFormat, setFileFormat] = React.useState<"csv" | "excel" | "pdf" | "json">("csv")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = () => {
    let dataset = appointments
    if (!dataset || dataset.length === 0) {
      toast.error("No appointments available to export.")
      return
    }

    if (statusFilter !== "all") {
      dataset = dataset.filter((a) => {
        const s = (a.status || "").toLowerCase()
        return s === statusFilter.toLowerCase()
      })
    }

    if (dataset.length === 0) {
      toast.error("No appointments match the selected filter.")
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `Clinic_Appointments_Roster_${timestamp}`

      if (fileFormat === "json") {
        downloadJson(`${filename}.json`, dataset)
        toast.success(`Exported ${dataset.length} appointment records as JSON`)
      } else if (fileFormat === "pdf") {
        const rowsHtml = dataset
          .map((app, idx) => {
            const name = app.name || "Patient"
            const type = app.type || "Prenatal Checkup"
            const risk = app.risk || "Low Risk"
            const status = app.status || "Scheduled"
            const dateStr = app.date || (app.appointment_date ? formatDate(app.appointment_date) : "N/A")
            const timeStr = app.appointment_time || "Morning"

            const statusClass =
              status.toLowerCase() === "completed" || status.toLowerCase() === "confirmed"
                ? "badge badge-low"
                : status.toLowerCase() === "pending"
                  ? "badge badge-mod"
                  : "badge badge-high"

            return `
              <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td><strong>${name}</strong></td>
                <td>${type}</td>
                <td><strong>${dateStr}</strong><br/><span style="color:#6b7280; font-size:9px;">${timeStr}</span></td>
                <td><span class="badge ${risk.toLowerCase().includes("high") ? "badge-high" : "badge-low"}">${risk}</span></td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>${app.notes || app.reason || "Routine visit"}</td>
              </tr>
            `
          })
          .join("")

        const reportHtml = `
          <div class="header-container">
            <div class="header-sub">Republic of the Philippines • Department of Health</div>
            <div class="header-facility">Rural Health Unit & BHW Community Care Clinic</div>
            <div class="header-title">Clinic Appointments & Daily Schedule Roster</div>
            <div class="meta-bar">
              <span>Total Scheduled: <strong>${dataset.length} Appointments</strong></span>
              <span>Filter: <strong>${statusFilter === "all" ? "All Active Statuses" : statusFilter}</strong></span>
              <span>Generated: <strong>${new Date().toLocaleString()}</strong></span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align:center;">#</th>
                <th>Patient Name</th>
                <th style="width: 90px;">Visit Type</th>
                <th style="width: 100px;">Date & Time</th>
                <th style="width: 75px;">Risk Level</th>
                <th style="width: 75px;">Status</th>
                <th>Remarks / Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="sig-box">
              <strong>Triage Nurse / Midwife:</strong>
              Roster In-Charge
            </div>
            <div class="sig-box">
              <strong>Clinic Supervisor:</strong>
              RHU Admin
            </div>
          </div>
        `

        openPrintableReportWindow("Clinic Appointments Schedule", reportHtml)
        toast.success(`Generated schedule sheet for ${dataset.length} appointments`)
      } else {
        const headers = [
          "Appointment ID",
          "Patient Name",
          "Contact Number",
          "Appointment Type",
          "Scheduled Date",
          "Time Slot",
          "Risk Flag",
          "Status",
          "Notes / Reason",
        ]

        const rows = dataset.map((app) => [
          app.id || app.appointment_id || "N/A",
          app.name || "N/A",
          app.phone || app.phone_number || "N/A",
          app.type || "Routine Checkup",
          app.date || (app.appointment_date ? formatDate(app.appointment_date) : "N/A"),
          app.appointment_time || "N/A",
          app.risk || "Low Risk",
          app.status || "Scheduled",
          app.notes || app.reason || "N/A",
        ])

        downloadCsv(filename, headers, rows)
        toast.success(`Exported ${dataset.length} appointments successfully`)
      }

      handleOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to export appointments")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      trigger={children}
      title="Export Appointments & Schedule Roster"
      description="Download generated clinic schedules, triage rosters, and appointment lists."
      className="sm:max-w-[650px]"
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              Report Format
            </h4>
            <RadioGroup
              value={fileFormat}
              onValueChange={(val: any) => setFileFormat(val)}
              className="gap-2"
            >
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="csv" id="af2" className="mt-0.5" />
                <Label htmlFor="af2" className="flex-1 cursor-pointer text-xs font-normal">
                  <span className="font-medium text-foreground">Universal CSV (.csv)</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Excel compatible schedule spreadsheet.
                  </span>
                </Label>
              </div>
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="pdf" id="af4" className="mt-0.5" />
                <Label htmlFor="af4" className="flex-1 cursor-pointer text-xs font-normal">
                  <span className="font-medium text-foreground">Printable Clinic Roster (PDF)</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Clean daily/weekly print layout for triage desk.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Filter className="h-3.5 w-3.5 text-primary" />
              Appointment Status Filter
            </h4>
            <div className="flex flex-col gap-2 pt-1">
              <Label className="text-xs text-muted-foreground">
                Filter roster by booking status:
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select appointment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses ({appointments.length})</SelectItem>
                  <SelectItem value="confirmed">Confirmed Appointments</SelectItem>
                  <SelectItem value="pending">Pending Requests</SelectItem>
                  <SelectItem value="completed">Completed Visits</SelectItem>
                  <SelectItem value="cancelled">Cancelled / Missed</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                Loaded scope: <strong>{appointments.length} appointments</strong> in view.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
        <Button
          variant="ghost"
          className="h-8 text-xs text-foreground hover:bg-accent"
          onClick={() => handleOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex h-8 items-center gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
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
              ? "Generate Schedule Sheet"
              : `Export ${appointments.length} Appointments`}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
