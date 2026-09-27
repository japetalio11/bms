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

export interface ExportMaternalDataModalProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  filteredMothers?: any[]
  allMothers?: any[]
  currentFilterLabel?: string
}

export function ExportMaternalDataModal({
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  filteredMothers = [],
  allMothers = [],
}: ExportMaternalDataModalProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = (val: boolean) => {
    if (isControlled) {
      setControlledOpen?.(val)
    } else {
      setInternalOpen(val)
    }
  }

  const [formatType, setFormatType] = React.useState<"csv" | "excel" | "json" | "pdf">("csv")
  const [dataScope, setDataScope] = React.useState<"filtered" | "all">("filtered")
  const [columnScope, setColumnScope] = React.useState<"standard" | "all">("standard")
  const [riskFilter, setRiskFilter] = React.useState<string>("all")
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    let dataset = dataScope === "filtered" ? filteredMothers : allMothers
    if (!dataset || dataset.length === 0) {
      toast.error("No maternal records found to export.")
      return
    }

    // Apply risk filter if selected
    if (riskFilter !== "all") {
      dataset = dataset.filter((item) => {
        const raw = item.rawMother || item
        const risk = (
          item.risk ||
          raw.risk_flag ||
          raw.risk_level ||
          "Low Risk"
        ).toLowerCase()
        if (riskFilter === "high") return risk.includes("high")
        if (riskFilter === "mod_high")
          return risk.includes("high") || risk.includes("moderate")
        if (riskFilter === "low") return risk.includes("low")
        return true
      })
    }

    if (dataset.length === 0) {
      toast.error("No maternal records match the selected risk filter.")
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `Maternal_Registry_${dataScope}_${timestamp}`

      if (formatType === "json") {
        downloadJson(`${filename}.json`, dataset)
        toast.success(`Exported ${dataset.length} maternal records as JSON`)
      } else if (formatType === "pdf") {
        const rowsHtml = dataset
          .map((item, idx) => {
            const raw = item.rawMother || item
            const user = raw.user || {}
            const serial = raw.family_serial_no || "N/A"
            const name =
              item.name ||
              [
                user.first_name || raw.first_name,
                user.middle_name || raw.middle_name,
                user.last_name || raw.last_name,
              ]
                .filter(Boolean)
                .join(" ") ||
              "Unknown"
            const age = raw.age ? String(raw.age) : "N/A"
            const risk = item.risk || raw.risk_flag || raw.risk_level || "Low Risk"
            const riskBadgeClass = risk.toLowerCase().includes("high")
              ? "badge badge-high"
              : risk.toLowerCase().includes("mod")
                ? "badge badge-mod"
                : "badge badge-low"
            const ga =
              item.gestationalAge ||
              (raw.pregnancies?.[0]?.gestational_age_weeks
                ? `${raw.pregnancies[0].gestational_age_weeks} wks`
                : "N/A")
            const edd =
              item.edd ||
              (raw.pregnancies?.[0]?.edd
                ? formatDate(raw.pregnancies[0].edd)
                : "N/A")
            const address = item.station || user.address || raw.address || "N/A"
            const phone = user.phone_number || raw.phone_number || "N/A"

            return `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td><strong>${name}</strong><br/><span style="color:#6b7280; font-size:9px;">Serial: ${serial}</span></td>
                <td>${age}</td>
                <td><span class="${riskBadgeClass}">${risk}</span></td>
                <td>${ga}</td>
                <td>${edd}</td>
                <td>${address}</td>
                <td>${phone}</td>
              </tr>
            `
          })
          .join("")

        const reportHtml = `
          <div class="header-container">
            <div class="header-sub">Republic of the Philippines • Department of Health</div>
            <div class="header-facility">Rural Health Unit / Maternal Care Division</div>
            <div class="header-title">Maternal Masterlist & Registry Report</div>
            <div class="meta-bar">
              <span>Scope: <strong>${dataScope === "filtered" ? "Filtered Active Cohort" : "Complete Facility Registry"}</strong></span>
              <span>Total Records: <strong>${dataset.length} Mothers</strong></span>
              <span>Generated: <strong>${new Date().toLocaleString()}</strong></span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th>Mother's Name / Serial</th>
                <th style="width: 40px;">Age</th>
                <th style="width: 80px;">Risk Level</th>
                <th style="width: 60px;">GA</th>
                <th style="width: 75px;">EDD</th>
                <th>Barangay / Address</th>
                <th style="width: 85px;">Contact No.</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="sig-box">
              <strong>Prepared By:</strong>
              Midwife / BHW In-Charge
            </div>
            <div class="sig-box">
              <strong>Attested By:</strong>
              Municipal Health Officer / Facility Administrator
            </div>
          </div>
        `

        openPrintableReportWindow("Maternal Masterlist Report", reportHtml)
        toast.success(`Generated printable summary for ${dataset.length} mothers`)
      } else {
        // CSV / Excel Export
        let headers: string[] = []
        let rows: (string | number)[][] = []

        if (columnScope === "standard") {
          headers = [
            "Family Serial No.",
            "Mother Name",
            "Age",
            "Date of Birth",
            "Risk Flag",
            "Gestational Age",
            "EDD",
            "Barangay / Address",
            "Contact Number",
            "Civil Status",
            "Blood Type",
          ]

          rows = dataset.map((item) => {
            const raw = item.rawMother || item
            const user = raw.user || {}
            const serial = raw.family_serial_no || "N/A"
            const name =
              item.name ||
              [
                user.first_name || raw.first_name,
                user.middle_name || raw.middle_name,
                user.last_name || raw.last_name,
              ]
                .filter(Boolean)
                .join(" ") ||
              "Unknown"
            const age = raw.age ? String(raw.age) : "N/A"
            const dob = raw.birth_date ? formatDate(raw.birth_date) : "N/A"
            const risk =
              item.risk || raw.risk_flag || raw.risk_level || "Low Risk"
            const ga =
              item.gestationalAge ||
              (raw.pregnancies?.[0]?.gestational_age_weeks
                ? `${raw.pregnancies[0].gestational_age_weeks} Weeks`
                : "N/A")
            const edd =
              item.edd ||
              (raw.pregnancies?.[0]?.edd
                ? formatDate(raw.pregnancies[0].edd)
                : "N/A")
            const address = item.station || user.address || raw.address || "N/A"
            const phone = user.phone_number || raw.phone_number || "N/A"
            const civil = raw.civil_status || "N/A"
            const blood = raw.blood_type || "N/A"

            return [
              serial,
              name,
              age,
              dob,
              risk,
              ga,
              edd,
              address,
              phone,
              civil,
              blood,
            ]
          })
        } else {
          headers = [
            "Mother ID",
            "User ID",
            "Family Serial No.",
            "First Name",
            "Middle Name",
            "Last Name",
            "Age",
            "Date of Birth",
            "Civil Status",
            "Blood Type",
            "Phone Number",
            "Email",
            "Address / Barangay",
            "Risk Level Assessed",
            "Active Pregnancy ID",
            "Gravida",
            "Parity",
            "LMP Date",
            "Gestational Age",
            "EDD",
            "BMI Category",
            "Sync Status",
            "Updated At",
          ]

          rows = dataset.map((item) => {
            const raw = item.rawMother || item
            const user = raw.user || {}
            const preg = raw.pregnancies?.[0] || {}

            return [
              raw.mother_id || raw.id || item.id,
              raw.user_id || user.user_id || "N/A",
              raw.family_serial_no || "N/A",
              user.first_name || raw.first_name || "N/A",
              user.middle_name || raw.middle_name || "",
              user.last_name || raw.last_name || "N/A",
              raw.age ? String(raw.age) : "N/A",
              raw.birth_date ? formatDate(raw.birth_date) : "N/A",
              raw.civil_status || "N/A",
              raw.blood_type || "N/A",
              user.phone_number || raw.phone_number || "N/A",
              user.email || raw.email || "N/A",
              item.station || user.address || raw.address || "N/A",
              item.risk || raw.risk_flag || raw.risk_level || "Low Risk",
              preg.pregnancy_id || preg.id || "N/A",
              preg.gravida != null ? String(preg.gravida) : "0",
              preg.parity != null ? String(preg.parity) : "0",
              preg.lmp_date ? formatDate(preg.lmp_date) : "N/A",
              item.gestationalAge ||
                (preg.gestational_age_weeks
                  ? `${preg.gestational_age_weeks} Weeks`
                  : "N/A"),
              item.edd || (preg.edd ? formatDate(preg.edd) : "N/A"),
              preg.bmi_category || "Normal",
              raw.sync_status || "synced",
              raw.updated_at
                ? new Date(raw.updated_at).toLocaleString()
                : "N/A",
            ]
          })
        }

        downloadCsv(filename, headers, rows)
        toast.success(`Exported ${dataset.length} maternal records successfully`)
      }

      setIsOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to export maternal records")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={children}
      title="Export Maternal Registry Report"
      description="Download clinical maternal registries and masterlists compliant with DOH/FHSIS reporting guidelines."
      className="sm:max-w-[780px] md:max-w-[840px]"
    >
      <div className="flex flex-col gap-4 py-1">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Download className="h-3.5 w-3.5 text-primary" />
              Data Scope
            </h4>
            <RadioGroup
              value={dataScope}
              onValueChange={(val: any) => setDataScope(val)}
              className="gap-2"
            >
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="filtered" id="ms1" className="mt-0.5" />
                <Label
                  htmlFor="ms1"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Current Filtered View
                  </span>{" "}
                  <span className="text-xs font-bold text-primary">
                    ({filteredMothers.length} mothers)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Matches active search, risk flags, and selected barangays.
                  </span>
                </Label>
              </div>
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="all" id="ms2" className="mt-0.5" />
                <Label
                  htmlFor="ms2"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    All Facility Registry
                  </span>{" "}
                  <span className="text-xs font-bold text-muted-foreground">
                    ({allMothers.length} mothers)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Complete facility register regardless of active UI filters.
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
              value={formatType}
              onValueChange={(val: any) => setFormatType(val)}
              className="grid grid-cols-1 gap-2"
            >
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="csv" id="mf2" className="mt-0.5" />
                <Label
                  htmlFor="mf2"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Universal CSV (.csv)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Excel & DOH iClinicSys compatible spreadsheet with UTF-8 BOM.
                  </span>
                </Label>
              </div>
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="pdf" id="mf4" className="mt-0.5" />
                <Label
                  htmlFor="mf4"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Printable Registry Sheet (PDF)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    DOH official header layout with signature blocks.
                  </span>
                </Label>
              </div>
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="json" id="mf3" className="mt-0.5" />
                <Label
                  htmlFor="mf3"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Structured JSON (.json)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Raw database payload for system migration and backups.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Registry Fields & Columns
            </h4>
            <RadioGroup
              value={columnScope}
              onValueChange={(val: any) => setColumnScope(val)}
              className="flex flex-col gap-2"
            >
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="standard" id="mc1" className="mt-0.5" />
                <Label
                  htmlFor="mc1"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Standard Masterlist View
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Serial No, Name, Age, DOB, Risk, GA, EDD, Barangay, Phone.
                  </span>
                </Label>
              </div>
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="all" id="mc2" className="mt-0.5" />
                <Label
                  htmlFor="mc2"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Comprehensive EHR Export
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Includes Gravida, Parity, LMP, BMI, emails, and sync IDs.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Filter className="h-3.5 w-3.5 text-primary" />
              Risk Level Filtering
            </h4>
            <div className="flex flex-col gap-2 pt-1">
              <Label className="text-xs text-muted-foreground">
                Filter exported cohort by assessed CDSS risk:
              </Label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels (Complete Register)</SelectItem>
                  <SelectItem value="high">High Risk Only (Requires CEmONC Monitoring)</SelectItem>
                  <SelectItem value="mod_high">Moderate & High Risk</SelectItem>
                  <SelectItem value="low">Low Risk (Routine Care)</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                Helpful for isolating critical maternal cases for emergency coordination.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
        <Button
          variant="ghost"
          className="h-8 text-xs text-foreground hover:bg-accent"
          onClick={() => setIsOpen(false)}
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
          ) : formatType === "pdf" ? (
            <Printer className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isExporting
            ? "Generating Report..."
            : formatType === "pdf"
              ? "Generate Printable Sheet"
              : `Export ${dataScope === "filtered" ? filteredMothers.length : allMothers.length} Mothers`}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
