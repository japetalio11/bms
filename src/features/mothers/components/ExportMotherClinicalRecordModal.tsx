import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import {
  downloadCsv,
  downloadJson,
  openPrintableReportWindow,
} from "@/lib/exportUtils"

export interface ExportMotherClinicalRecordModalProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  motherData: any
  pregnancyList?: any[]
  prenatalVisits?: any[]
  labRecords?: any[]
  supplements?: any[]
  deliveries?: any[]
  newborns?: any[]
  postpartumVisits?: any[]
}

export function ExportMotherClinicalRecordModal({
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  motherData,
  pregnancyList = [],
  prenatalVisits = [],
  labRecords = [],
  supplements = [],
  deliveries = [],
  newborns = [],
  postpartumVisits = [],
}: ExportMotherClinicalRecordModalProps) {
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

  const [formatType, setFormatType] = React.useState<"pdf" | "csv" | "json">("pdf")
  const [includePrenatal, setIncludePrenatal] = React.useState(true)
  const [includeLabs, setIncludeLabs] = React.useState(true)
  const [includeSupplements, setIncludeSupplements] = React.useState(true)
  const [includeDelivery, setIncludeDelivery] = React.useState(true)
  const [includePostpartum, setIncludePostpartum] = React.useState(true)
  const [isExporting, setIsExporting] = React.useState(false)

  const rawUser = motherData?.user || {}
  const motherName =
    [
      rawUser.first_name || motherData?.first_name,
      rawUser.middle_name || motherData?.middle_name,
      rawUser.last_name || motherData?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    motherData?.name ||
    "Mother Profile"

  const activePregnancy = pregnancyList[0] || motherData?.pregnancies?.[0] || {}
  const serialNo = motherData?.family_serial_no || "N/A"
  const age = motherData?.age || "N/A"
  const bloodType = motherData?.blood_type || "N/A"
  const phone = rawUser.phone_number || motherData?.phone_number || "N/A"
  const address = motherData?.station || rawUser.address || motherData?.address || "N/A"
  const risk = motherData?.risk || motherData?.risk_flag || motherData?.risk_level || "Low Risk"

  const handleExport = () => {
    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const sanitizedName = motherName.replace(/[^a-zA-Z0-9]/g, "_")
      const filename = `Clinical_Record_${sanitizedName}_${timestamp}`

      if (formatType === "json") {
        const payload = {
          patient: {
            name: motherName,
            serial_no: serialNo,
            age,
            birth_date: motherData?.birth_date,
            blood_type: bloodType,
            civil_status: motherData?.civil_status,
            phone,
            address,
            risk_level: risk,
          },
          obstetric_profile: activePregnancy,
          prenatal_encounters: includePrenatal ? prenatalVisits : [],
          laboratory_screenings: includeLabs ? labRecords : [],
          prescriptions_supplements: includeSupplements ? supplements : [],
          delivery_outcomes: includeDelivery ? deliveries : [],
          newborn_records: includeDelivery ? newborns : [],
          postpartum_encounters: includePostpartum ? postpartumVisits : [],
          exported_at: new Date().toISOString(),
        }
        downloadJson(`${filename}.json`, payload)
        toast.success(`Exported complete clinical record for ${motherName}`)
      } else if (formatType === "pdf") {
        let sectionsHtml = ""

        // Obstetric Details
        sectionsHtml += `
          <div class="section-title">I. Obstetric & Maternal Baseline</div>
          <div class="card-grid">
            <div class="card-item">
              <div class="card-label">Gravida / Parity</div>
              <div class="card-value">G${activePregnancy.gravida ?? 0} P${activePregnancy.parity ?? 0}</div>
            </div>
            <div class="card-item">
              <div class="card-label">Last Menstrual Period (LMP)</div>
              <div class="card-value">${activePregnancy.lmp_date ? formatDate(activePregnancy.lmp_date) : "N/A"}</div>
            </div>
            <div class="card-item">
              <div class="card-label">Estimated Date of Delivery (EDD)</div>
              <div class="card-value">${activePregnancy.edd ? formatDate(activePregnancy.edd) : "N/A"}</div>
            </div>
            <div class="card-item">
              <div class="card-label">Gestational Age / BMI</div>
              <div class="card-value">${activePregnancy.gestational_age_weeks ? `${activePregnancy.gestational_age_weeks} Weeks` : "N/A"} (${activePregnancy.bmi_category || "Normal"})</div>
            </div>
          </div>
        `

        // Prenatal Encounters
        if (includePrenatal && prenatalVisits.length > 0) {
          const prenatalRows = prenatalVisits
            .map((v) => `
              <tr>
                <td>${v.visit_date ? formatDate(v.visit_date) : "N/A"}</td>
                <td>${v.gestational_age_weeks ? `${v.gestational_age_weeks} wks` : "N/A"}</td>
                <td>${v.blood_pressure || v.bp || "N/A"}</td>
                <td>${v.pulse_rate ? `${v.pulse_rate} bpm` : "N/A"}</td>
                <td>${v.weight_kg ? `${v.weight_kg} kg` : "N/A"}</td>
                <td>${v.fundal_height_cm ? `${v.fundal_height_cm} cm` : "N/A"}</td>
                <td>${v.fetal_heart_tone || v.fetal_heart_rate ? `${v.fetal_heart_tone || v.fetal_heart_rate} bpm` : "N/A"}</td>
                <td>${v.findings_summary || v.notes || "Routine examination normal"}</td>
              </tr>
            `)
            .join("")

          sectionsHtml += `
            <div class="section-title">II. Prenatal Clinical Encounters (${prenatalVisits.length})</div>
            <table>
              <thead>
                <tr>
                  <th>Visit Date</th>
                  <th>GA</th>
                  <th>BP</th>
                  <th>Pulse</th>
                  <th>Weight</th>
                  <th>Fundal Ht</th>
                  <th>FHR</th>
                  <th>Clinical Notes & Findings</th>
                </tr>
              </thead>
              <tbody>
                ${prenatalRows}
              </tbody>
            </table>
          `
        }

        // Labs
        if (includeLabs && labRecords.length > 0) {
          const labRows = labRecords
            .map((l) => `
              <tr>
                <td>${l.date_conducted || l.date ? formatDate(l.date_conducted || l.date) : "N/A"}</td>
                <td><strong>${l.test_type || l.name || "Lab Test"}</strong></td>
                <td>${l.result || l.findings || "N/A"}</td>
                <td>${l.normal_range || "N/A"}</td>
                <td>${l.interpretation || l.status || "Completed"}</td>
              </tr>
            `)
            .join("")

          sectionsHtml += `
            <div class="section-title">III. Laboratory Tests & Diagnostic Screenings (${labRecords.length})</div>
            <table>
              <thead>
                <tr>
                  <th>Test Date</th>
                  <th>Test Description</th>
                  <th>Result / Findings</th>
                  <th>Reference Range</th>
                  <th>Clinical Status</th>
                </tr>
              </thead>
              <tbody>
                ${labRows}
              </tbody>
            </table>
          `
        }

        // Prescriptions & Supplements
        if (includeSupplements && supplements.length > 0) {
          const supRows = supplements
            .map((s) => `
              <tr>
                <td>${s.date_given || s.date ? formatDate(s.date_given || s.date) : "N/A"}</td>
                <td><strong>${s.supplement_name || s.medicine_name || "Supplement"}</strong></td>
                <td>${s.dosage || "Standard"}</td>
                <td>${s.quantity || s.quantity_given || "N/A"}</td>
                <td>${s.instructions || s.remarks || "Take as directed"}</td>
              </tr>
            `)
            .join("")

          sectionsHtml += `
            <div class="section-title">IV. Prescriptions & Micronutrient Supplementation (${supplements.length})</div>
            <table>
              <thead>
                <tr>
                  <th>Date Given</th>
                  <th>Medication / Supplement</th>
                  <th>Dosage</th>
                  <th>Qty Dispensed</th>
                  <th>Instructions / Notes</th>
                </tr>
              </thead>
              <tbody>
                ${supRows}
              </tbody>
            </table>
          `
        }

        // Delivery & Newborns
        if (includeDelivery && (deliveries.length > 0 || newborns.length > 0)) {
          const delivRows = deliveries
            .map((d) => `
              <tr>
                <td>${d.delivery_date ? formatDate(d.delivery_date) : "N/A"}</td>
                <td>${d.delivery_type || "Spontaneous Vaginal Delivery"}</td>
                <td>${d.birth_attendant || d.attendant_name || "Midwife"}</td>
                <td>${d.birth_place || d.facility_name || "Health Facility"}</td>
                <td>${d.outcome || "Live Birth"}</td>
              </tr>
            `)
            .join("")

          const newbornRows = newborns
            .map((n) => `
              <tr>
                <td>${n.first_name ? `${n.first_name} ${n.last_name || ""}` : "Baby"}</td>
                <td>${n.gender || n.sex || "N/A"}</td>
                <td>${n.birth_weight_kg ? `${n.birth_weight_kg} kg` : "N/A"}</td>
                <td>${n.apgar_1min ? `1m: ${n.apgar_1min} | 5m: ${n.apgar_5min || "N/A"}` : "N/A"}</td>
                <td>${n.immunization_status || "BCG & HepB Given"}</td>
              </tr>
            `)
            .join("")

          sectionsHtml += `
            <div class="section-title">V. Delivery Outcomes & Newborn Record</div>
            ${
              deliveries.length > 0
                ? `
              <table>
                <thead>
                  <tr>
                    <th>Delivery Date</th>
                    <th>Delivery Mode</th>
                    <th>Birth Attendant</th>
                    <th>Facility / Place</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>${delivRows}</tbody>
              </table>
            `
                : ""
            }
            ${
              newborns.length > 0
                ? `
              <table style="margin-top: 6px;">
                <thead>
                  <tr>
                    <th>Newborn Name</th>
                    <th>Sex</th>
                    <th>Birth Weight</th>
                    <th>APGAR Scores</th>
                    <th>Initial Care</th>
                  </tr>
                </thead>
                <tbody>${newbornRows}</tbody>
              </table>
            `
                : ""
            }
          `
        }

        // Postpartum
        if (includePostpartum && postpartumVisits.length > 0) {
          const postRows = postpartumVisits
            .map((p) => `
              <tr>
                <td>${p.visit_date ? formatDate(p.visit_date) : "N/A"}</td>
                <td>${p.days_postpartum ? `Day ${p.days_postpartum}` : "N/A"}</td>
                <td>${p.bp || p.blood_pressure || "N/A"}</td>
                <td>${p.lochia_condition || p.lochia || "Normal"}</td>
                <td>${p.breastfeeding_status || "Exclusive Breastfeeding"}</td>
                <td>${p.family_planning_method || "Counseling Done"}</td>
              </tr>
            `)
            .join("")

          sectionsHtml += `
            <div class="section-title">VI. Postpartum Care Encounters (${postpartumVisits.length})</div>
            <table>
              <thead>
                <tr>
                  <th>Visit Date</th>
                  <th>Timeline</th>
                  <th>Vitals (BP)</th>
                  <th>Lochia Status</th>
                  <th>Breastfeeding</th>
                  <th>Family Planning Method</th>
                </tr>
              </thead>
              <tbody>
                ${postRows}
              </tbody>
            </table>
          `
        }

        const riskBadge = risk.toLowerCase().includes("high")
          ? '<span class="badge badge-high">High Risk</span>'
          : risk.toLowerCase().includes("mod")
            ? '<span class="badge badge-mod">Moderate Risk</span>'
            : '<span class="badge badge-low">Low Risk</span>'

        const reportHtml = `
          <div class="header-container">
            <div class="header-sub">Republic of the Philippines • Department of Health</div>
            <div class="header-facility">Barangay Health Center & Rural Health Unit</div>
            <div class="header-title">Individual Maternal Health Record (EHR Summary)</div>
            <div class="meta-bar">
              <span>Patient Serial: <strong>${serialNo}</strong></span>
              <span>Risk Status: ${riskBadge}</span>
              <span>Report Generated: <strong>${new Date().toLocaleString()}</strong></span>
            </div>
          </div>

          <div class="card-grid" style="margin-top: 10px;">
            <div class="card-item">
              <div class="card-label">Patient Full Name</div>
              <div class="card-value" style="font-size: 13px; font-weight: bold;">${motherName}</div>
            </div>
            <div class="card-item">
              <div class="card-label">Age / Date of Birth</div>
              <div class="card-value">${age} years old (${motherData?.birth_date ? formatDate(motherData.birth_date) : "N/A"})</div>
            </div>
            <div class="card-item">
              <div class="card-label">Barangay / Address</div>
              <div class="card-value">${address}</div>
            </div>
            <div class="card-item">
              <div class="card-label">Contact Number & Blood Type</div>
              <div class="card-value">${phone} | Blood Type: ${bloodType}</div>
            </div>
          </div>

          ${sectionsHtml}

          <div class="signature-section" style="margin-top: 30px;">
            <div class="sig-box">
              <strong>Prepared & Certified By:</strong>
              Attending Midwife / Registered Nurse
            </div>
            <div class="sig-box">
              <strong>Approved By:</strong>
              Rural Health Physician / Clinic Administrator
            </div>
          </div>
        `

        openPrintableReportWindow(`Clinical Record - ${motherName}`, reportHtml)
        toast.success(`Generated printable clinical summary for ${motherName}`)
      } else {
        // CSV Export of encounters
        const headers = [
          "Patient Serial No.",
          "Patient Name",
          "Record Type",
          "Date",
          "Clinical Details / Values",
          "Risk Flag",
        ]
        const rows: string[][] = []

        if (includePrenatal) {
          prenatalVisits.forEach((v) => {
            rows.push([
              serialNo,
              motherName,
              "Prenatal Checkup",
              v.visit_date ? formatDate(v.visit_date) : "N/A",
              `GA: ${v.gestational_age_weeks || "N/A"} wks | BP: ${v.blood_pressure || "N/A"} | Pulse: ${v.pulse_rate || "N/A"} | FHR: ${v.fetal_heart_tone || "N/A"} | Notes: ${v.findings_summary || "Normal"}`,
              v.risk_level || risk,
            ])
          })
        }

        if (includeLabs) {
          labRecords.forEach((l) => {
            rows.push([
              serialNo,
              motherName,
              "Lab Screening",
              l.date_conducted || l.date ? formatDate(l.date_conducted || l.date) : "N/A",
              `Test: ${l.test_type || "Lab"} | Result: ${l.result || "N/A"} | Range: ${l.normal_range || "N/A"}`,
              risk,
            ])
          })
        }

        if (includeSupplements) {
          supplements.forEach((s) => {
            rows.push([
              serialNo,
              motherName,
              "Prescription / Supplement",
              s.date_given || s.date ? formatDate(s.date_given || s.date) : "N/A",
              `Item: ${s.supplement_name || "Medicine"} | Dose: ${s.dosage || "N/A"} | Qty: ${s.quantity || "N/A"}`,
              risk,
            ])
          })
        }

        if (includeDelivery) {
          deliveries.forEach((d) => {
            rows.push([
              serialNo,
              motherName,
              "Delivery Outcome",
              d.delivery_date ? formatDate(d.delivery_date) : "N/A",
              `Mode: ${d.delivery_type || "Vaginal"} | Place: ${d.birth_place || "Facility"} | Attendant: ${d.birth_attendant || "Midwife"}`,
              risk,
            ])
          })
        }

        if (includePostpartum) {
          postpartumVisits.forEach((p) => {
            rows.push([
              serialNo,
              motherName,
              "Postpartum Visit",
              p.visit_date ? formatDate(p.visit_date) : "N/A",
              `Timeline: Day ${p.days_postpartum || "N/A"} | BP: ${p.bp || "N/A"} | Lochia: ${p.lochia_condition || "Normal"} | Family Planning: ${p.family_planning_method || "Counselled"}`,
              risk,
            ])
          })
        }

        downloadCsv(filename, headers, rows)
        toast.success(`Exported clinical record encounters for ${motherName}`)
      }

      setIsOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to generate clinical report")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={children}
      title="Export Clinical Health Record (EHR Summary)"
      description={`Generate a complete medical chart and clinical history summary for ${motherName}.`}
      className="sm:max-w-[700px]"
    >
      <div className="flex flex-col gap-5 py-2">
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground">{motherName}</span>
            <span className="text-[11px] text-muted-foreground">
              Serial No: <strong className="font-mono text-foreground">{serialNo}</strong> • Age: {age} • Blood Type: {bloodType}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assessed Risk</span>
            <span className="text-xs font-bold text-primary">{risk}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Label className="text-xs font-semibold text-foreground">Report Format</Label>
          <RadioGroup
            value={formatType}
            onValueChange={(v: any) => setFormatType(v)}
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            <div className="flex cursor-pointer items-start space-x-2 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
              <RadioGroupItem value="pdf" id="rf1" className="mt-0.5" />
              <Label htmlFor="rf1" className="cursor-pointer text-xs">
                <span className="font-medium text-foreground block">Printable Chart (PDF)</span>
                <span className="text-[10px] text-muted-foreground">Clean A4 medical layout</span>
              </Label>
            </div>
            <div className="flex cursor-pointer items-start space-x-2 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
              <RadioGroupItem value="csv" id="rf2" className="mt-0.5" />
              <Label htmlFor="rf2" className="cursor-pointer text-xs">
                <span className="font-medium text-foreground block">Encounter CSV</span>
                <span className="text-[10px] text-muted-foreground">Spreadsheet timeline</span>
              </Label>
            </div>
            <div className="flex cursor-pointer items-start space-x-2 rounded-lg border border-border/70 bg-background/50 p-2.5 transition-colors hover:bg-muted/40">
              <RadioGroupItem value="json" id="rf3" className="mt-0.5" />
              <Label htmlFor="rf3" className="cursor-pointer text-xs">
                <span className="font-medium text-foreground block">Complete JSON</span>
                <span className="text-[10px] text-muted-foreground">Full EHR exchange</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2.5">
          <Label className="text-xs font-semibold text-foreground">Included Clinical Modules</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center space-x-2 rounded-lg border border-border/60 p-2">
              <Checkbox
                id="inc-prenatal"
                checked={includePrenatal}
                onCheckedChange={(c) => setIncludePrenatal(!!c)}
              />
              <Label htmlFor="inc-prenatal" className="cursor-pointer text-xs">
                Prenatal Encounters & Vitals ({prenatalVisits.length})
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-border/60 p-2">
              <Checkbox
                id="inc-labs"
                checked={includeLabs}
                onCheckedChange={(c) => setIncludeLabs(!!c)}
              />
              <Label htmlFor="inc-labs" className="cursor-pointer text-xs">
                Laboratory & Screenings ({labRecords.length})
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-border/60 p-2">
              <Checkbox
                id="inc-supplements"
                checked={includeSupplements}
                onCheckedChange={(c) => setIncludeSupplements(!!c)}
              />
              <Label htmlFor="inc-supplements" className="cursor-pointer text-xs">
                Prescriptions & Supplements ({supplements.length})
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-border/60 p-2">
              <Checkbox
                id="inc-delivery"
                checked={includeDelivery}
                onCheckedChange={(c) => setIncludeDelivery(!!c)}
              />
              <Label htmlFor="inc-delivery" className="cursor-pointer text-xs">
                Delivery & Newborn Records ({deliveries.length + newborns.length})
              </Label>
            </div>
            <div className="col-span-1 sm:col-span-2 flex items-center space-x-2 rounded-lg border border-border/60 p-2">
              <Checkbox
                id="inc-postpartum"
                checked={includePostpartum}
                onCheckedChange={(c) => setIncludePostpartum(!!c)}
              />
              <Label htmlFor="inc-postpartum" className="cursor-pointer text-xs">
                Postpartum Follow-up Care ({postpartumVisits.length})
              </Label>
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
            ? "Preparing Report..."
            : formatType === "pdf"
              ? "Print Clinical Record"
              : "Export Record"}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
