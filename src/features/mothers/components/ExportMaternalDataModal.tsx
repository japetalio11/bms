import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"

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
  currentFilterLabel = "Current View",
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

  const [formatType, setFormatType] = React.useState<"csv" | "excel" | "json">(
    "csv"
  )
  const [dataScope, setDataScope] = React.useState<"filtered" | "all">(
    "filtered"
  )
  const [columnScope, setColumnScope] = React.useState<"standard" | "all">(
    "standard"
  )
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    const dataset = dataScope === "filtered" ? filteredMothers : allMothers
    if (!dataset || dataset.length === 0) {
      toast.error("No maternal records found to export.")
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `maternal_registry_${dataScope}_${timestamp}`

      if (formatType === "json") {
        const jsonContent =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(dataset, null, 2))
        triggerDownload(jsonContent, `${filename}.json`)
        toast.success(`Exported ${dataset.length} maternal records as JSON`)
      } else {
        const csvRows: string[][] = []

        if (columnScope === "standard") {
          csvRows.push([
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
          ])

          for (const item of dataset) {
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

            csvRows.push([
              sanitizeCSVCell(serial),
              sanitizeCSVCell(name),
              sanitizeCSVCell(age),
              sanitizeCSVCell(dob),
              sanitizeCSVCell(risk),
              sanitizeCSVCell(ga),
              sanitizeCSVCell(edd),
              sanitizeCSVCell(address),
              sanitizeCSVCell(phone),
              sanitizeCSVCell(civil),
              sanitizeCSVCell(blood),
            ])
          }
        } else {
          csvRows.push([
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
          ])

          for (const item of dataset) {
            const raw = item.rawMother || item
            const user = raw.user || {}
            const preg = raw.pregnancies?.[0] || {}

            csvRows.push([
              sanitizeCSVCell(raw.mother_id || raw.id || item.id),
              sanitizeCSVCell(raw.user_id || user.user_id || "N/A"),
              sanitizeCSVCell(raw.family_serial_no || "N/A"),
              sanitizeCSVCell(user.first_name || raw.first_name || "N/A"),
              sanitizeCSVCell(user.middle_name || raw.middle_name || ""),
              sanitizeCSVCell(user.last_name || raw.last_name || "N/A"),
              sanitizeCSVCell(raw.age ? String(raw.age) : "N/A"),
              sanitizeCSVCell(
                raw.birth_date ? formatDate(raw.birth_date) : "N/A"
              ),
              sanitizeCSVCell(raw.civil_status || "N/A"),
              sanitizeCSVCell(raw.blood_type || "N/A"),
              sanitizeCSVCell(user.phone_number || raw.phone_number || "N/A"),
              sanitizeCSVCell(user.email || raw.email || "N/A"),
              sanitizeCSVCell(
                item.station || user.address || raw.address || "N/A"
              ),
              sanitizeCSVCell(
                item.risk || raw.risk_flag || raw.risk_level || "Low Risk"
              ),
              sanitizeCSVCell(preg.pregnancy_id || preg.id || "N/A"),
              sanitizeCSVCell(
                preg.gravida != null ? String(preg.gravida) : "0"
              ),
              sanitizeCSVCell(preg.parity != null ? String(preg.parity) : "0"),
              sanitizeCSVCell(
                preg.lmp_date ? formatDate(preg.lmp_date) : "N/A"
              ),
              sanitizeCSVCell(
                item.gestationalAge ||
                  (preg.gestational_age_weeks
                    ? `${preg.gestational_age_weeks} Weeks`
                    : "N/A")
              ),
              sanitizeCSVCell(
                item.edd || (preg.edd ? formatDate(preg.edd) : "N/A")
              ),
              sanitizeCSVCell(preg.bmi_category || "Normal"),
              sanitizeCSVCell(raw.sync_status || "synced"),
              sanitizeCSVCell(
                raw.updated_at
                  ? new Date(raw.updated_at).toLocaleString()
                  : "N/A"
              ),
            ])
          }
        }

        const csvContent =
          "\uFEFF" + csvRows.map((r) => r.join(",")).join("\r\n")
        const ext = formatType === "excel" ? "csv" : "csv"
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        triggerDownload(url, `${filename}.${ext}`)
        URL.revokeObjectURL(url)
        toast.success(
          `Exported ${dataset.length} maternal records successfully`
        )
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
      title="Export Maternal Data"
      description="Download clinical maternal registries compliant with DOH/FHSIS reporting guidelines."
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
                    Matches active search, risk flags, and barangays.
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
                    Complete active registry regardless of current filters.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              File Format
            </h4>
            <RadioGroup
              value={formatType}
              onValueChange={(val: any) => setFormatType(val)}
              className="gap-2"
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
                    Recommended for Google Sheets and DOH iClinicSys imports.
                  </span>
                </Label>
              </div>
              <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
                <RadioGroupItem value="excel" id="mf1" className="mt-0.5" />
                <Label
                  htmlFor="mf1"
                  className="flex-1 cursor-pointer text-xs font-normal"
                >
                  <span className="font-medium text-foreground">
                    Excel Compatible CSV (.csv)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Includes UTF-8 BOM encoding for Microsoft Excel.
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
                    Raw programmatic payload for system backups.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Registry Fields & Columns
          </h4>
          <RadioGroup
            value={columnScope}
            onValueChange={(val: any) => setColumnScope(val)}
            className="grid grid-cols-1 gap-2.5 md:grid-cols-2"
          >
            <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
              <RadioGroupItem value="standard" id="mc1" className="mt-0.5" />
              <Label
                htmlFor="mc1"
                className="flex-1 cursor-pointer text-xs font-normal"
              >
                <span className="font-medium text-foreground">
                  Standard Masterlist View
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Serial No, Mother Name, Age, DOB, Risk Flag, GA, EDD,
                  Barangay, Phone, Blood Type.
                </span>
              </Label>
            </div>
            <div className="flex cursor-pointer items-start space-x-2.5 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
              <RadioGroupItem value="all" id="mc2" className="mt-0.5" />
              <Label
                htmlFor="mc2"
                className="flex-1 cursor-pointer text-xs font-normal"
              >
                <span className="font-medium text-foreground">
                  Comprehensive EHR Export
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Includes UUIDs, Gravida/Parity, LMP, BMI Category, email, and
                  sync timestamps.
                </span>
              </Label>
            </div>
          </RadioGroup>
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
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isExporting
            ? "Exporting..."
            : `Export ${dataScope === "filtered" ? filteredMothers.length : allMothers.length} Mothers`}
        </Button>
      </div>
    </ResponsiveModal>
  )
}

function sanitizeCSVCell(value: any): string {
  if (value === null || value === undefined) return '""'
  let str = String(value).trim()
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    str = `"${str.replace(/"/g, '""')}"`
  } else {
    str = `"${str}"`
  }
  return str
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a")
  link.setAttribute("href", href)
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
