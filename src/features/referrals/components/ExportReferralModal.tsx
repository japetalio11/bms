import * as React from "react"
import { useState } from "react"
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

export interface ExportReferralModalProps {
  children?: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  referrals?: any[]
  filteredCount?: number
}

export function ExportReferralModal({
  children,
  open,
  onOpenChange,
  referrals = [],
  filteredCount = 0,
}: ExportReferralModalProps) {
  const [format, setFormat] = useState<"csv" | "excel" | "pdf" | "json">("csv")
  const [scope, setScope] = useState<"filtered" | "all">("filtered")
  const [columns, setColumns] = useState<"standard" | "all">("standard")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isExporting, setIsExporting] = useState(false)

  const totalCount = referrals.length
  const activeFilteredCount = filteredCount || totalCount

  const handleExport = () => {
    let dataToExport =
      scope === "filtered" ? referrals.slice(0, activeFilteredCount) : referrals

    if (!dataToExport || dataToExport.length === 0) {
      toast.error("No referral records found to export.")
      return
    }

    if (statusFilter !== "all") {
      dataToExport = dataToExport.filter((r) => {
        const s = (r.status || "").toLowerCase()
        return s === statusFilter.toLowerCase()
      })
    }

    if (dataToExport.length === 0) {
      toast.error("No referrals match the selected status filter.")
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `Maternal_Referrals_Registry_${timestamp}`

      if (format === "json") {
        downloadJson(`${filename}.json`, dataToExport)
        toast.success(`Exported ${dataToExport.length} referral records as JSON`)
      } else if (format === "pdf") {
        const rowsHtml = dataToExport
          .map((r, idx) => {
            const mother = r.pregnancy?.mother || r.patient || {}
            const user = mother.user || {}
            const motherName =
              [
                user.first_name || mother.first_name,
                user.middle_name || mother.middle_name,
                user.last_name || mother.last_name,
              ]
                .filter(Boolean)
                .join(" ") ||
              r.motherName ||
              "Patient"
            const refCode = (r.referral_id || r.id || "N/A").slice(-8).toUpperCase()
            const dest =
              r.toFacility?.facility_name ||
              r.external_facility_name ||
              r.destination ||
              "Regional Hospital"
            const fromFac =
              r.fromFacility?.facility_name ||
              r.origin_facility_name ||
              "Referring Health Center"
            const status = r.status || "Pending"
            const risk = r.pregnancy?.risk_flag || r.riskFlag || "High Risk"
            const dateStr = r.date_referred
              ? formatDate(r.date_referred)
              : formatDate(r.created_at || new Date())

            const statusClass =
              status.toLowerCase() === "accepted" ||
              status.toLowerCase() === "completed"
                ? "badge badge-low"
                : status.toLowerCase() === "pending"
                  ? "badge badge-mod"
                  : "badge badge-high"

            return `
              <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td><strong style="font-family: monospace;">REF-${refCode}</strong></td>
                <td><strong>${motherName}</strong></td>
                <td>${fromFac}</td>
                <td><strong>${dest}</strong></td>
                <td>${r.reason_for_referral || r.reason || "High-risk obstetric management"}</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>${dateStr}</td>
              </tr>
            `
          })
          .join("")

        const reportHtml = `
          <div class="header-container">
            <div class="header-sub">Republic of the Philippines • Department of Health</div>
            <div class="header-facility">National Maternal & Neonatal Emergency Referral Network (BEmONC / CEmONC)</div>
            <div class="header-title">Inter-Facility Referral Registry Report</div>
            <div class="meta-bar">
              <span>Scope: <strong>${scope === "filtered" ? "Active Filtered Referrals" : "Full Referral Ledger"}</strong></span>
              <span>Total Records: <strong>${dataToExport.length} Transfers</strong></span>
              <span>Generated: <strong>${new Date().toLocaleString()}</strong></span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align:center;">#</th>
                <th style="width: 80px;">Control No</th>
                <th>Mother's Name</th>
                <th>Origin Facility</th>
                <th>Destination Facility</th>
                <th>Reason for Referral</th>
                <th style="width: 75px;">Status</th>
                <th style="width: 80px;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="sig-box">
              <strong>Referral Coordinator:</strong>
              Nurse / Midwife In-Charge
            </div>
            <div class="sig-box">
              <strong>Medical Health Officer:</strong>
              Receiving & Transfer Officer
            </div>
          </div>
        `

        openPrintableReportWindow("Maternal Referral Registry", reportHtml)
        toast.success(`Generated referral summary for ${dataToExport.length} records`)
      } else {
        // CSV / Excel Export
        let headers: string[] = []
        let rows: (string | number)[][] = []

        if (columns === "standard") {
          headers = [
            "Referral ID",
            "Mother Name",
            "Initiated At",
            "Risk Flag",
            "Status",
            "Originating Facility",
            "Destination Facility",
            "Reason for Referral",
            "Transfer Code / PIN",
          ]

          rows = dataToExport.map((r) => {
            const mother = r.pregnancy?.mother || r.patient || {}
            const user = mother.user || {}
            const motherName =
              [
                user.first_name || mother.first_name,
                user.middle_name || mother.middle_name,
                user.last_name || mother.last_name,
              ]
                .filter(Boolean)
                .join(" ") ||
              r.motherName ||
              "N/A"
            const dest =
              r.toFacility?.facility_name ||
              r.external_facility_name ||
              r.destination ||
              "N/A"
            const fromFac =
              r.fromFacility?.facility_name ||
              r.origin_facility_name ||
              "Current Facility"

            return [
              r.referral_id || r.id || "N/A",
              motherName,
              r.date_referred ? new Date(r.date_referred).toLocaleString() : "N/A",
              r.pregnancy?.risk_flag || r.riskFlag || "Low Risk",
              r.status || "Pending",
              fromFac,
              dest,
              r.reason_for_referral || r.reason || "N/A",
              r.shared_pin || r.transferCode || "N/A",
            ]
          })
        } else {
          headers = [
            "Referral ID",
            "Mother Name",
            "Family Serial No.",
            "Contact Phone",
            "Initiated At",
            "Risk Flag",
            "Urgency Classification",
            "Status",
            "Originating Facility",
            "Destination Facility",
            "Reason for Referral",
            "Clinical Notes",
            "Transfer Code",
            "Secure Digital Link",
          ]

          rows = dataToExport.map((r) => {
            const mother = r.pregnancy?.mother || r.patient || {}
            const user = mother.user || {}
            const motherName =
              [
                user.first_name || mother.first_name,
                user.middle_name || mother.middle_name,
                user.last_name || mother.last_name,
              ]
                .filter(Boolean)
                .join(" ") ||
              r.motherName ||
              "N/A"
            const dest =
              r.toFacility?.facility_name ||
              r.external_facility_name ||
              r.destination ||
              "N/A"
            const fromFac =
              r.fromFacility?.facility_name ||
              r.origin_facility_name ||
              "Current Facility"

            return [
              r.referral_id || r.id || "N/A",
              motherName,
              mother.family_serial_no || "N/A",
              user.phone_number || mother.phone_number || "N/A",
              r.date_referred ? new Date(r.date_referred).toLocaleString() : "N/A",
              r.pregnancy?.risk_flag || r.riskFlag || "Low Risk",
              r.urgency || "Routine",
              r.status || "Pending",
              fromFac,
              dest,
              r.reason_for_referral || r.reason || "N/A",
              r.clinical_notes || r.notes || "N/A",
              r.shared_pin || r.transferCode || "N/A",
              r.secure_link || r.recordLink || "N/A",
            ]
          })
        }

        downloadCsv(filename, headers, rows)
        toast.success(`Exported ${dataToExport.length} referral records successfully`)
      }

      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to export referral data")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      trigger={children}
      title="Export Referral & Transfer Registry"
      description="Download generated reports of facility transfers, clinical handovers, and patient outcomes."
      className="sm:max-w-[700px]"
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Download className="h-3.5 w-3.5 text-primary" />
              Data Scope
            </h4>
            <RadioGroup
              value={scope}
              onValueChange={(val: any) => setScope(val)}
              className="gap-2"
            >
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="filtered" id="rs1" className="mt-0.5" />
                <Label
                  htmlFor="rs1"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Current Filtered View
                  </span>{" "}
                  <span className="text-xs font-bold text-primary">
                    ({activeFilteredCount} items)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Matches active referral filters and search query.
                  </span>
                </Label>
              </div>
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="all" id="rs2" className="mt-0.5" />
                <Label
                  htmlFor="rs2"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    All Facility Referrals
                  </span>{" "}
                  <span className="text-xs font-bold text-muted-foreground">
                    ({totalCount} items)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Complete inter-facility referral history.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              Report Format
            </h4>
            <RadioGroup
              value={format}
              onValueChange={(val: any) => setFormat(val)}
              className="gap-2"
            >
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="csv" id="rf-csv" className="mt-0.5" />
                <Label
                  htmlFor="rf-csv"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Universal CSV (.csv)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Spreadsheet compatible with UTF-8 BOM encoding.
                  </span>
                </Label>
              </div>
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="pdf" id="rf-pdf" className="mt-0.5" />
                <Label
                  htmlFor="rf-pdf"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Printable Registry Sheet (PDF)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Official BEmONC/CEmONC referral audit layout.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Included Columns
            </h4>
            <RadioGroup
              value={columns}
              onValueChange={(val: any) => setColumns(val)}
              className="gap-2"
            >
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="standard" id="rc1" className="mt-0.5" />
                <Label
                  htmlFor="rc1"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">Standard View</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    ID, Mother, Date, Status, Origin, Destination, Transfer Code.
                  </span>
                </Label>
              </div>
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="all" id="rc2" className="mt-0.5" />
                <Label
                  htmlFor="rc2"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">Comprehensive Export</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Includes full clinical notes, urgency, and secure link.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Filter className="h-3.5 w-3.5 text-primary" />
              Status Filter
            </h4>
            <div className="flex flex-col gap-2 pt-1">
              <Label className="text-xs text-muted-foreground">
                Filter exported referrals by transfer status:
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select transfer status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transfer Statuses</SelectItem>
                  <SelectItem value="pending">Pending Acceptance</SelectItem>
                  <SelectItem value="accepted">Accepted / In Transit</SelectItem>
                  <SelectItem value="completed">Completed / Admitted</SelectItem>
                  <SelectItem value="declined">Declined / Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:flex-row">
        <Button
          variant="ghost"
          className="h-8 w-full text-xs sm:w-auto"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex h-8 w-full items-center gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : format === "pdf" ? (
            <Printer className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isExporting
            ? "Exporting..."
            : format === "pdf"
              ? "Generate Printable Sheet"
              : `Export ${scope === "filtered" ? activeFilteredCount : totalCount} Referrals`}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
