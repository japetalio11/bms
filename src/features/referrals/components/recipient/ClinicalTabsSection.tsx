import React from "react"
import {
  FileText,
  Activity,
  Microscope,
  Pill,
  Baby,
  FileSpreadsheet,
  Printer,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Building2,
  FileCheck2,
  User,
  AlertCircle,
  Stethoscope,
  FileSignature,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  PublicReferralData,
  PrenatalVisitItem,
  LabScreeningItem,
  SupplementItem,
  DeliveryOutcomeItem,
  NewbornRecordItem,
  PostpartumVisitItem,
  ParsedReferralDetails,
  DocumentModalData,
} from "./referralTypes"

interface ClinicalTabsSectionProps {
  data: PublicReferralData
  parsed: ParsedReferralDetails
  activeTab: string
  onTabChange: (tab: string) => void
  onOpenDocument: (doc: DocumentModalData) => void
}

export function ClinicalTabsSection({
  data,
  parsed,
  activeTab,
  onTabChange,
  onOpenDocument,
}: ClinicalTabsSectionProps) {
  const prenatalVisits = data.prenatal_visits || []
  const labScreenings = data.lab_screenings || []
  const supplements = data.supplements || []
  const deliveryOutcomes = data.delivery_outcomes || []
  const patient = data.patient
  const obstetric = data.obstetric_info
  const vitals = obstetric?.latest_vitals

  const getApgarBadgeStyle = (score: number) => {
    if (score >= 7) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    if (score >= 4) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
  }

  const getApgarStatusText = (score: number) => {
    if (score >= 7) return "Reassuring Transition"
    if (score >= 4) return "Moderately Depressed"
    return "Critical Neonatal Distress"
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Detailed Medical Records & Audit Trails
        </h3>
        <span className="text-[11px] text-muted-foreground font-medium">
          Select section to inspect longitudinal data
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
        {/* Navigation Tabs Pill Bar */}
        <TabsList className="h-10 sm:h-11 w-full justify-start rounded-xl border border-border bg-muted/80 p-1 backdrop-blur-sm overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-nowrap shrink-0">
          <TabsTrigger
            value="narrative"
            className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Handover Notes</span>
          </TabsTrigger>

          <TabsTrigger
            value="visits"
            className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Consultations</span>
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
              {prenatalVisits.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="labs"
            className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
          >
            <Microscope className="h-3.5 w-3.5" />
            <span>Labs & Scans</span>
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
              {labScreenings.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="supplements"
            className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
          >
            <Pill className="h-3.5 w-3.5" />
            <span>Medications</span>
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
              {supplements.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="deliveries"
            className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
          >
            <Baby className="h-3.5 w-3.5" />
            <span>Delivery & Newborn</span>
            {deliveryOutcomes.length > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-600">
                {deliveryOutcomes.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="form"
            className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-2xs data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Official DOH Form</span>
          </TabsTrigger>
        </TabsList>

        {/* =============================================================== */}
        {/* TAB 1: Clinical Handover Notes & Communication Audit            */}
        {/* =============================================================== */}
        <TabsContent value="narrative" className="space-y-4">
          <Card className="border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Referring Provider Handover Narrative & Coordination Audit
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">
                  By {data.referring_facility.name}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
              {/* Sanitized Narrative Commentary */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Physician / Health Worker Commentary:
                </span>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                  {parsed.cleanNarrative}
                </div>
              </div>

              {/* Receiving Hospital Response Notes */}
              {data.response_notes && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    Receiving Hospital Coordination & Response Notes:
                  </span>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {data.response_notes}
                  </div>
                </div>
              )}

              {/* Clinical Outcome Note */}
              {data.outcome && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 sm:p-4 text-xs">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                    Recorded Clinical Outcome:
                  </span>
                  <p className="text-foreground font-semibold">{data.outcome}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =============================================================== */}
        {/* TAB 2: Prenatal Consultation History Logs                       */}
        {/* =============================================================== */}
        <TabsContent value="visits" className="space-y-4">
          <Card className="border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs sm:text-sm font-bold uppercase text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Longitudinal Prenatal Consultation Records
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Chronological consultation logs recorded during this pregnancy.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {prenatalVisits.length} Consultations
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {prenatalVisits.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No individual prenatal visit consultation logs found for this pregnancy.
                </div>
              ) : (
                <>
                  {/* Mobile View (< sm) */}
                  <div className="block sm:hidden divide-y divide-border px-3">
                    {prenatalVisits.map((visit: PrenatalVisitItem, index: number) => (
                      <div key={visit.visit_id || index} className="py-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">
                            {new Date(visit.visit_date).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              Trimester {visit.trimester || 1}
                            </span>
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              {visit.age_of_gestation_weeks ? `${visit.age_of_gestation_weeks} wks` : "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">BP & Temp</span>
                            <span className="font-mono font-bold text-foreground">
                              {visit.bp_systolic || 120}/{visit.bp_diastolic || 80} • {visit.temperature_celsius || 36.5}°C
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Fundic / FHT</span>
                            <span className="font-mono font-bold text-foreground">
                              {visit.fundic_height_cm || "-"} cm / {visit.fetal_heart_tone_bpm || "-"} bpm
                            </span>
                          </div>
                        </div>

                        <div className="text-xs">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Complaint: </span>
                          <span className="font-medium text-foreground">{visit.chief_complaint || "Routine checkup"}</span>
                          {visit.danger_signs_observed && (
                            <p className="mt-1 text-[11px] font-bold text-red-500">
                              Danger Observed: {visit.danger_signs_observed}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View (>= sm) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-xs font-bold">Date</TableHead>
                          <TableHead className="text-xs font-bold">Trimester</TableHead>
                          <TableHead className="text-xs font-bold">AOG</TableHead>
                          <TableHead className="text-xs font-bold">BP / Temp</TableHead>
                          <TableHead className="text-xs font-bold">Fundic / FHT</TableHead>
                          <TableHead className="text-xs font-bold">Chief Complaint & Danger Signs</TableHead>
                          <TableHead className="text-xs font-bold">Health Worker</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prenatalVisits.map((visit: PrenatalVisitItem, index: number) => (
                          <TableRow key={visit.visit_id || index} className="border-border hover:bg-muted/30">
                            <TableCell className="text-xs font-semibold whitespace-nowrap">
                              {new Date(visit.visit_date).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-xs">
                              Trim {visit.trimester || 1}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-primary font-mono">
                              {visit.age_of_gestation_weeks ? `${visit.age_of_gestation_weeks} wks` : "N/A"}
                            </TableCell>
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                              <span className="font-bold">
                                {visit.bp_systolic || 120}/{visit.bp_diastolic || 80}
                              </span>{" "}
                              • {visit.temperature_celsius || 36.5}°C
                            </TableCell>
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                              {visit.fundic_height_cm ? `${visit.fundic_height_cm} cm` : "-"} /{" "}
                              {visit.fetal_heart_tone_bpm ? `${visit.fetal_heart_tone_bpm} bpm` : "-"}
                            </TableCell>
                            <TableCell className="max-w-[240px] text-xs">
                              <p className="font-medium truncate">
                                {visit.chief_complaint || "Routine prenatal consultation"}
                              </p>
                              {visit.danger_signs_observed && (
                                <span className="mt-0.5 block truncate text-[10px] font-bold text-red-500">
                                  Danger: {visit.danger_signs_observed}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                              {visit.healthWorker
                                ? `${visit.healthWorker.first_name || ""} ${visit.healthWorker.last_name || ""}`.trim()
                                : "Healthcare Provider"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =============================================================== */}
        {/* TAB 3: Diagnostic & Laboratory Documents Archive                */}
        {/* =============================================================== */}
        <TabsContent value="labs" className="space-y-4">
          <Card className="border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs sm:text-sm font-bold uppercase text-foreground flex items-center gap-2">
                    <Microscope className="h-4 w-4 text-primary" />
                    Diagnostic Screenings, Blood Tests & Ultrasound Scans
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Blood screenings, urinalysis, rapid serology, and obstetric ultrasound scans.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {labScreenings.length} Screenings
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {labScreenings.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No laboratory or diagnostic screening records attached to this pregnancy handoff.
                </div>
              ) : (
                <>
                  {/* Mobile View (< sm) */}
                  <div className="block sm:hidden divide-y divide-border px-3">
                    {labScreenings.map((lab: LabScreeningItem, index: number) => (
                      <div key={lab.screening_id || index} className="py-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-xs text-foreground block">{lab.screening_type}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(lab.date_of_screening).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
                            {lab.result || "Completed"}
                          </Badge>
                        </div>

                        {lab.remarks && (
                          <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                            {lab.remarks}
                          </p>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onOpenDocument({
                              title: lab.screening_type,
                              type: lab.screening_type.toLowerCase().includes("ultrasound") ? "ultrasound" : "lab",
                              date: lab.date_of_screening,
                              result: lab.result,
                              remarks: lab.remarks,
                              fileUrl: lab.file_url,
                              metadata: {
                                "Investigation ID": lab.screening_id || `LAB-${index + 1}`,
                                "Patient": patient?.name || "Patient",
                                "Date Taken": new Date(lab.date_of_screening).toLocaleDateString(),
                                "Origin Facility": data.referring_facility.name,
                              },
                            })
                          }
                          className="w-full h-9 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Open Full Document</span>
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View (>= sm) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-xs font-bold">Date</TableHead>
                          <TableHead className="text-xs font-bold">Investigation Type</TableHead>
                          <TableHead className="text-xs font-bold">Result Finding</TableHead>
                          <TableHead className="text-xs font-bold">Clinical Remarks</TableHead>
                          <TableHead className="text-xs font-bold">Document Viewer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {labScreenings.map((lab: LabScreeningItem, index: number) => (
                          <TableRow key={lab.screening_id || index} className="border-border hover:bg-muted/30">
                            <TableCell className="text-xs font-semibold whitespace-nowrap">
                              {new Date(lab.date_of_screening).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-foreground">
                              {lab.screening_type}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="rounded-md bg-muted/80 px-2.5 py-1 text-[11px] font-semibold border border-border/60">
                                {lab.result || "Completed"}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {lab.remarks || "No abnormalities noted"}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  onOpenDocument({
                                    title: lab.screening_type,
                                    type: lab.screening_type.toLowerCase().includes("ultrasound") ? "ultrasound" : "lab",
                                    date: lab.date_of_screening,
                                    result: lab.result,
                                    remarks: lab.remarks,
                                    fileUrl: lab.file_url,
                                    metadata: {
                                      "Investigation ID": lab.screening_id || `LAB-${index + 1}`,
                                      "Patient": patient?.name || "Patient",
                                      "Date Taken": new Date(lab.date_of_screening).toLocaleDateString(),
                                      "Origin Facility": data.referring_facility.name,
                                    },
                                  })
                                }
                                className="h-7 gap-1.5 text-xs font-medium border-primary/20 hover:bg-primary/10 hover:text-primary"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Open Full Document</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =============================================================== */}
        {/* TAB 4: Prescriptions & Supplements Log                          */}
        {/* =============================================================== */}
        <TabsContent value="supplements" className="space-y-4">
          <Card className="border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs sm:text-sm font-bold uppercase text-foreground flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    Prescriptions & Micronutrient Supplementation
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Medications, micronutrient supplementation, and tocolytics dispensed.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {supplements.length} Prescriptions
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {supplements.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No supplementation or medication records logged for this pregnancy.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs font-bold">Date Dispensed</TableHead>
                        <TableHead className="text-xs font-bold">Medication / Supplement</TableHead>
                        <TableHead className="text-xs font-bold">Dosage & Quantity</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold">Slip</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplements.map((supp: SupplementItem, index: number) => (
                        <TableRow key={supp.supplement_id || index} className="border-border hover:bg-muted/30">
                          <TableCell className="text-xs font-semibold whitespace-nowrap">
                            {new Date(supp.date_given).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-foreground">
                            {supp.supplement_type}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">
                            {supp.tablets_given_count} units
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Dispensed
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onOpenDocument({
                                  title: `Prescription: ${supp.supplement_type}`,
                                  type: "prescription",
                                  date: supp.date_given,
                                  result: `Dispensed: ${supp.tablets_given_count || 0} units`,
                                  remarks: "Administered as standard prenatal supplementation protocol",
                                  metadata: {
                                    "Item": supp.supplement_type,
                                    "Quantity": `${supp.tablets_given_count || 0} units`,
                                    "Date Given": new Date(supp.date_given).toLocaleDateString(),
                                    "Patient": patient?.name || "Patient",
                                  },
                                })
                              }
                              className="h-7 gap-1 text-xs text-muted-foreground hover:text-primary"
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              <span>View Slip</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =============================================================== */}
        {/* TAB 5: Delivery & Newborn Outcomes                              */}
        {/* =============================================================== */}
        <TabsContent value="deliveries" className="space-y-4">
          {deliveryOutcomes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center shadow-xs">
              <div className="mb-3 rounded-full bg-primary/10 p-3.5 text-primary">
                <Baby className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Active Prenatal / Intrapartum Care Stage
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                This referral is currently for antenatal care or triage prior to delivery. Once birth occurs, infant birth weights, APGAR transitions, and postpartum evaluations will be archived here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {deliveryOutcomes.map((d: DeliveryOutcomeItem, idx: number) => {
                const linkedNewborns = d.newbornRecords || []
                const linkedPostpartum = d.postpartumVisits || []

                return (
                  <Card key={d.delivery_id || idx} className="overflow-hidden border-border bg-card shadow-xs">
                    <CardHeader className="border-b border-border/60 bg-muted/20 p-4 sm:p-5 pb-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Baby className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                              Delivery Outcome {deliveryOutcomes.length > 1 ? `#${deliveryOutcomes.length - idx}` : ""}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Registered on {new Date(d.delivery_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-xs font-semibold text-primary">
                            Mode: {d.mode_of_delivery || "NSVD"}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-medium">
                            {d.place_of_delivery || "Health Facility"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-5 space-y-4">
                      {/* Labor Metrics */}
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs sm:grid-cols-4">
                        <div>
                          <span className="block text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground">Place</span>
                          <span className="font-semibold text-foreground truncate block">{d.place_of_delivery}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground">Labor Duration</span>
                          <span className="font-semibold text-foreground block">{d.duration_of_labor_hours ? `${d.duration_of_labor_hours} hrs` : "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground">Blood Loss</span>
                          <span className="font-mono font-semibold text-foreground block">{d.blood_loss_ml ? `${d.blood_loss_ml} mL` : "Normal"}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground">Complications</span>
                          <span className={`font-medium block truncate ${d.delivery_complications && d.delivery_complications !== "None" ? "text-red-500 font-bold" : "text-foreground"}`}>
                            {d.delivery_complications || "None reported"}
                          </span>
                        </div>
                      </div>

                      {/* Newborn Records */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Baby className="h-3.5 w-3.5 text-primary" /> Newborn Infants ({linkedNewborns.length})
                        </span>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                          {linkedNewborns.map((nb: NewbornRecordItem, nIdx: number) => (
                            <div key={nb.newborn_id || nIdx} className="rounded-xl border border-border bg-card p-3 space-y-2">
                              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                                <span className="font-bold text-xs text-foreground">
                                  {nb.sex} Infant ({nb.birth_weight_kg} kg)
                                </span>
                                <Badge className={`text-[10px] font-bold ${getApgarBadgeStyle(nb.apgar_score)}`}>
                                  APGAR {nb.apgar_score}/10
                                </Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                                <span>Status: {nb.status_at_birth || "Alive"}</span>
                                <span>{getApgarStatusText(nb.apgar_score)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* =============================================================== */}
        {/* TAB 6: Official Philippine DOH Referral Form                    */}
        {/* =============================================================== */}
        <TabsContent value="form" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Standard Clinical Maternal Referral Form
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Philippine Department of Health BEmONC / CEmONC Referral Handoff Sheet
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
                Print Clinical Sheet
              </Button>
            </div>
          </div>

          {/* Printable Official Form */}
          <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-8 md:p-10 shadow-xs space-y-6 text-foreground">
            {/* Header */}
            <div className="border-b-2 border-primary/30 pb-4 sm:pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5 sm:space-y-1">
                <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-primary uppercase block">
                  Republic of the Philippines • Department of Health
                </span>
                <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground uppercase">
                  Official Maternal Care Referral Form
                </h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Regional Maternal & Neonatal Emergency Referral Network
                </p>
              </div>

              <div className="text-left sm:text-right space-y-0.5">
                <Badge variant="outline" className="font-mono text-[10px] sm:text-xs font-bold border-primary/40 bg-primary/5 text-primary">
                  REF #{data.referral_id.slice(-8).toUpperCase()}
                </Badge>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {new Date(data.date_referred).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Routing Facilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Referring Facility (Origin)
                </span>
                <p className="text-sm font-bold text-foreground">{data.referring_facility.name}</p>
                {data.referring_facility.address && <p className="text-muted-foreground">{data.referring_facility.address}</p>}
                {data.referring_facility.contact && <p className="font-mono text-muted-foreground">Tel: {data.referring_facility.contact}</p>}
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" /> Destination Facility (Receiving)
                </span>
                <p className="text-sm font-bold text-foreground">{data.destination_facility.name}</p>
                {data.destination_facility.address && <p className="text-muted-foreground">{data.destination_facility.address}</p>}
                {data.destination_facility.contact && <p className="font-mono text-muted-foreground">Tel: {data.destination_facility.contact}</p>}
              </div>
            </div>

            {/* Patient Demographics */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-foreground border-b border-border pb-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Patient Demographics & Obstetric Baseline
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/10 p-3 rounded-xl border border-border">
                <div>
                  <span className="text-muted-foreground text-[10px] block">Patient Name:</span>
                  <span className="font-bold text-foreground text-sm">{patient?.name || "Confidential Patient"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Age / Civil Status:</span>
                  <span className="font-semibold text-foreground">{patient?.age ? `${patient.age} yrs` : "N/A"} • {patient?.civil_status || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Blood Type:</span>
                  <span className="font-bold text-red-500">{patient?.blood_type || "Recorded"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Contact Phone:</span>
                  <span className="font-mono text-foreground">{patient?.phone || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Clinical Assessment */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-foreground border-b border-border pb-1 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-primary" /> Clinical Indication & Assessment
              </h3>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1">
                <span className="font-bold text-foreground block">Primary Referral Reason:</span>
                <p className="text-sm font-bold text-foreground">{parsed.chiefComplaint}</p>
                {vitals?.danger_signs && (
                  <p className="font-bold text-red-500 pt-1">Danger Signs: {vitals.danger_signs}</p>
                )}
              </div>
            </div>

            {/* Vitals Snapshot */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-foreground border-b border-border pb-1 flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-primary" /> Examination Vitals at Transfer
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">BP</span>
                  <span className="font-mono font-bold text-foreground text-sm">{vitals?.bp || "120/80"}</span>
                </div>
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pulse</span>
                  <span className="font-mono font-bold text-foreground text-sm">{vitals?.pulse_rate ? `${vitals.pulse_rate} bpm` : "80 bpm"}</span>
                </div>
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Temp</span>
                  <span className="font-mono font-bold text-foreground text-sm">{vitals?.temp ? `${vitals.temp}°C` : "36.5°C"}</span>
                </div>
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Fundic Ht</span>
                  <span className="font-mono font-bold text-foreground text-sm">{vitals?.fundic_height ? `${vitals.fundic_height} cm` : "28 cm"}</span>
                </div>
                <div className="rounded-lg border border-border p-2 bg-muted/20 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">FHT</span>
                  <span className="font-mono font-bold text-foreground text-sm">{vitals?.fetal_heart_tone ? `${vitals.fetal_heart_tone} bpm` : "140 bpm"}</span>
                </div>
              </div>
            </div>

            {/* Official Sign-off */}
            <div className="border-t-2 border-border pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Referring Health Worker</span>
                <div className="border-b border-dashed border-foreground/40 pb-1 pt-6 font-semibold">
                  Digitally Authenticated by {data.referring_facility.name}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Receiving Triage Officer</span>
                <div className="border-b border-dashed border-foreground/40 pb-1 pt-6 font-semibold">
                  {data.status === "accepted" || data.status === "completed" || data.status === "in_progress"
                    ? `Acknowledged by ${data.destination_facility.name}`
                    : "Pending Receiving Evaluation"}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
