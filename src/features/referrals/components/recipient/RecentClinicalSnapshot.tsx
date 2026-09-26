import React from "react"
import {
  Stethoscope,
  Gauge,
  Heart,
  Thermometer,
  Scale,
  Baby,
  Pill,
  Microscope,
  Calendar,
  Eye,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  History,
  Clock,
  ArrowRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  PublicReferralData,
  LabScreeningItem,
  SupplementItem,
  DocumentModalData,
} from "./referralTypes"
import { classifyVitals } from "./referralClinicalUtils"

interface RecentClinicalSnapshotProps {
  data: PublicReferralData
  onOpenDocument: (doc: DocumentModalData) => void
  onOpenVisitsTab: () => void
  onOpenLabsTab: () => void
  onOpenMedsTab: () => void
}

export function RecentClinicalSnapshot({
  data,
  onOpenDocument,
  onOpenVisitsTab,
  onOpenLabsTab,
  onOpenMedsTab,
}: RecentClinicalSnapshotProps) {
  const latestVitals = data.obstetric_info?.latest_vitals
  const latestVisit = data.prenatal_visits?.[0]

  const bpString = latestVitals?.bp || latestVisit?.blood_pressure || (latestVisit?.bp_systolic && latestVisit?.bp_diastolic ? `${latestVisit.bp_systolic}/${latestVisit.bp_diastolic}` : "120/80")
  const pulse = latestVitals?.pulse_rate || latestVisit?.pulse_rate_bpm || 80
  const temp = latestVitals?.temp || latestVisit?.temperature_celsius || 36.5
  const fundic = latestVitals?.fundic_height || latestVisit?.fundic_height_cm || 28
  const fht = latestVitals?.fetal_heart_tone || latestVisit?.fetal_heart_tone_bpm || 140

  const vitalsEval = classifyVitals(bpString, pulse, temp, fht)

  const vitalsDate = latestVitals?.visit_date || latestVisit?.visit_date
  const vitalsDateFormatted = vitalsDate
    ? new Date(vitalsDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Latest Triage"

  const attendingWorker =
    latestVisit?.healthWorker?.first_name || latestVisit?.healthWorker?.last_name
      ? `${latestVisit.healthWorker.first_name || ""} ${latestVisit.healthWorker.last_name || ""}`.trim()
      : "Attending Health Worker"

  const recentLabs = (data.lab_screenings || []).slice(0, 3)
  const recentSupplements = (data.supplements || []).slice(0, 3)
  const recentAppointments = (data.appointments || []).slice(0, 2)
  const previousReferrals = (data.previous_referrals || []).slice(0, 2)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Stethoscope className="h-4 w-4 text-primary" />
          Recent Clinical Snapshot & Findings
        </h3>
        <span className="text-[11px] text-muted-foreground font-medium">
          Recorded prior to transfer
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        
        {/* Card 1: Examination Vitals & Fetal Wellbeing */}
        <Card className="border border-border/80 bg-card shadow-2xs flex flex-col justify-between">
          <CardHeader className="p-3.5 sm:p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                Latest Vital Signs
              </CardTitle>
              <Badge variant="outline" className="text-[9px] font-mono">
                {vitalsDateFormatted}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              By: {attendingWorker}
            </p>
          </CardHeader>

          <CardContent className="p-3.5 sm:p-4 pt-1 space-y-2 flex-1 text-xs">
            {/* Blood Pressure */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground block font-medium">Blood Pressure</span>
                <span className="text-xs sm:text-sm font-black text-foreground font-mono">
                  {bpString} mmHg
                </span>
              </div>
              <Badge className={`text-[9px] font-bold ${vitalsEval.bpBadgeClass}`}>
                {vitalsEval.bpLabel}
              </Badge>
            </div>

            {/* Pulse & Temperature */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-500" /> Pulse
                </span>
                <span className="text-xs font-bold text-foreground font-mono">
                  {pulse} bpm
                </span>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
                  <Thermometer className="h-3 w-3 text-amber-500" /> Temp
                </span>
                <span className="text-xs font-bold text-foreground font-mono">
                  {temp}°C
                </span>
              </div>
            </div>

            {/* Fundic Height & FHT */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
                  <Scale className="h-3 w-3 text-primary" /> Fundic Ht
                </span>
                <span className="text-xs font-bold text-foreground font-mono">
                  {fundic} cm
                </span>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
                  <Baby className="h-3 w-3 text-pink-500" /> FHT (Fetal)
                </span>
                <span className="text-xs font-bold text-foreground font-mono">
                  {fht} bpm
                </span>
              </div>
            </div>
          </CardContent>

          <div className="border-t border-border/60 px-3.5 py-2 bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenVisitsTab}
              className="w-full h-7 text-[11px] font-semibold text-primary hover:bg-primary/5 flex items-center justify-between"
            >
              <span>View Visit History ({data.prenatal_visits?.length || 0})</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </Card>

        {/* Card 2: Recent Medications & Supplements */}
        <Card className="border border-border/80 bg-card shadow-2xs flex flex-col justify-between">
          <CardHeader className="p-3.5 sm:p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-primary" />
                Medications & Supplements
              </CardTitle>
              <Badge variant="outline" className="text-[9px]">
                {data.supplements?.length || 0} Logged
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Micronutrients & pre-referral doses
            </p>
          </CardHeader>

          <CardContent className="p-3.5 sm:p-4 pt-1 space-y-2 flex-1 text-xs">
            {recentSupplements.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-xs">
                No medication records logged.
              </div>
            ) : (
              recentSupplements.map((s, idx) => (
                <div
                  key={s.supplement_id || idx}
                  className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground truncate max-w-[130px]">
                      {s.supplement_type}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                      {s.tablets_given_count || 1} units
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>
                      {new Date(s.date_given).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Dispensed
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Deworming Indicator */}
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2 text-[11px]">
              <span className="font-medium text-muted-foreground">Deworming:</span>
              <span className="font-semibold text-foreground">
                {data.obstetric_info?.deworming_given
                  ? `Administered (${data.obstetric_info.deworming_date ? new Date(data.obstetric_info.deworming_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Yes"})`
                  : "Not Administered"}
              </span>
            </div>
          </CardContent>

          <div className="border-t border-border/60 px-3.5 py-2 bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenMedsTab}
              className="w-full h-7 text-[11px] font-semibold text-primary hover:bg-primary/5 flex items-center justify-between"
            >
              <span>View All Medications</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </Card>

        {/* Card 3: Recent Diagnostic & Lab Screenings */}
        <Card className="border border-border/80 bg-card shadow-2xs flex flex-col justify-between">
          <CardHeader className="p-3.5 sm:p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                <Microscope className="h-3.5 w-3.5 text-primary" />
                Diagnostic & Lab Results
              </CardTitle>
              <Badge variant="outline" className="text-[9px]">
                {data.lab_screenings?.length || 0} Records
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Blood, urinalysis & imaging scans
            </p>
          </CardHeader>

          <CardContent className="p-3.5 sm:p-4 pt-1 space-y-2 flex-1 text-xs">
            {recentLabs.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-xs">
                No laboratory screenings attached.
              </div>
            ) : (
              recentLabs.map((lab, idx) => (
                <div
                  key={lab.screening_id || idx}
                  className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground truncate max-w-[130px]">
                      {lab.screening_type}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onOpenDocument({
                          title: lab.screening_type,
                          type: lab.screening_type.toLowerCase().includes("ultrasound") ? "ultrasound" : "lab",
                          date: lab.date_of_screening,
                          result: lab.result,
                          remarks: lab.remarks,
                          fileUrl: lab.file_url,
                        })
                      }
                      className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10"
                    >
                      <Eye className="mr-1 h-2.5 w-2.5" />
                      View
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">
                      {lab.result || "Evaluated"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(lab.date_of_screening).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>

          <div className="border-t border-border/60 px-3.5 py-2 bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenLabsTab}
              className="w-full h-7 text-[11px] font-semibold text-primary hover:bg-primary/5 flex items-center justify-between"
            >
              <span>View All Labs & Scans</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </Card>

        {/* Card 4: Recent Encounters & Care Continuity */}
        <Card className="border border-border/80 bg-card shadow-2xs flex flex-col justify-between">
          <CardHeader className="p-3.5 sm:p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Continuity & Encounters
              </CardTitle>
              <Badge variant="outline" className="text-[9px]">
                Timeline
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Encounters & previous transfers
            </p>
          </CardHeader>

          <CardContent className="p-3.5 sm:p-4 pt-1 space-y-2 flex-1 text-xs">
            {/* Last Encounter */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Last Clinical Encounter
              </span>
              <p className="font-semibold text-foreground text-xs">
                {latestVisit ? (
                  <>
                    Visit on {new Date(latestVisit.visit_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {latestVisit.chief_complaint ? ` (${latestVisit.chief_complaint})` : ""}
                  </>
                ) : (
                  "Intake / Registration Visit"
                )}
              </p>
            </div>

            {/* Upcoming Appointment */}
            {recentAppointments.length > 0 ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-primary block">
                  Scheduled Appointment
                </span>
                <p className="font-semibold text-foreground text-xs">
                  {recentAppointments[0].appointment_type} on{" "}
                  {new Date(recentAppointments[0].appointment_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            ) : null}

            {/* Previous Referrals */}
            {previousReferrals.length > 0 ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                  <History className="h-3 w-3" /> Prior Referral Logged
                </span>
                <p className="font-medium text-foreground text-[11px] truncate">
                  {new Date(previousReferrals[0].date_referred).toLocaleDateString("en-US", { month: "short", day: "numeric" })} to{" "}
                  {previousReferrals[0].toFacility?.facility_name || previousReferrals[0].external_facility_name || "Facility"}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground">
                First documented referral for this pregnancy.
              </div>
            )}
          </CardContent>

          <div className="border-t border-border/60 px-3.5 py-2 bg-muted/10">
            <div className="text-[10px] text-muted-foreground flex items-center justify-between">
              <span>BMS Central Coordination</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Active Handover</span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  )
}
