import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { 
  User, 
  Building2, 
  Calendar as CalendarIcon, 
  Activity, 
  Heart, 
  Thermometer, 
  Scale, 
  Ruler, 
  FileText, 
  Mail,
  CheckCircle2
} from "lucide-react"
import { motherRepository } from "@/lib/repositories/motherRepository"
import { referralRepository } from "@/lib/repositories/referralRepository"
import { apiClient } from "@/lib/apiClient"
import { db } from "@/lib/db/bmsDatabase"
import type { ReferralSuccessData } from "./ReferralSuccessModal"
import { ReferralSuccessModal } from "./ReferralSuccessModal"

interface Facility {
  facility_id: string
  facility_name: string
  type?: string
}

function calculateAge(birthDateStr?: string): string {
  if (!birthDateStr) return "N/A"
  const dob = new Date(birthDateStr)
  if (isNaN(dob.getTime())) return "N/A"
  const diffMs = Date.now() - dob.getTime()
  const ageDate = new Date(diffMs)
  return Math.abs(ageDate.getUTCFullYear() - 1970).toString()
}

function getMotherFullName(m: any): string {
  if (!m) return ""
  const firstName = m.first_name || m.firstName || m.user?.first_name || m.user?.firstName || ""
  const lastName = m.last_name || m.lastName || m.user?.last_name || m.user?.lastName || ""
  const middleName = m.middle_name || m.middleName || m.user?.middle_name || ""
  const full = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim()
  if (full) return full
  if (m.name) return m.name
  return `Mother #${(m.mother_id || m._id || m.id || "").slice(-4)}`
}

export function CreateReferralModal({
  open,
  onOpenChange,
  onCreated,
  onSuccessCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  onSuccessCreated?: (data: ReferralSuccessData) => void
}) {
  const [localSuccessOpen, setLocalSuccessOpen] = useState<boolean>(false)
  const [localSuccessData, setLocalSuccessData] = useState<ReferralSuccessData | null>(null)

  const [mothers, setMothers] = useState<any[]>([])
  const [selectedMotherId, setSelectedMotherId] = useState<string>("")
  const [selectedPregnancyId, setSelectedPregnancyId] = useState<string>("")
  
  // Destination Facility
  const [destinationFacility, setDestinationFacility] = useState<string>("Bicol Medical Center")

  // Optional Email Notification State
  const [sendEmailNotification, setSendEmailNotification] = useState<boolean>(false)
  const [recipientEmail, setRecipientEmail] = useState<string>("")

  // Mother Demographics
  const [motherFullName, setMotherFullName] = useState<string>("")
  const [motherAge, setMotherAge] = useState<string>("")
  const [motherAddress, setMotherAddress] = useState<string>("")
  const [motherPhone, setMotherPhone] = useState<string>("")
  const [motherCivilStatus, setMotherCivilStatus] = useState<string>("")
  const [motherBday, setMotherBday] = useState<string>("")

  // Vitals (V/S)
  const [temp, setTemp] = useState<string>("36.5")
  const [pulseRate, setPulseRate] = useState<string>("80")
  const [bloodPressure, setBloodPressure] = useState<string>("120/80")
  const [weight, setWeight] = useState<string>("55")
  const [height, setHeight] = useState<string>("155")

  // Clinical & Obstetrical History
  const [chiefComplaint, setChiefComplaint] = useState<string>("for prenatal check up; high-risk")
  const [lmpDate, setLmpDate] = useState<Date | undefined>(undefined)
  const [edcDate, setEdcDate] = useState<Date | undefined>(undefined)
  const [lmp, setLmp] = useState<string>("")
  const [edc, setEdc] = useState<string>("")
  const [aog, setAog] = useState<string>("")
  const [gravidaPara, setGravidaPara] = useState<string>("G1P0")
  const [previousDelivery, setPreviousDelivery] = useState<string>("None")
  const [comorbidities, setComorbidities] = useState<string>("None")

  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>("")

  // Current User's Facility ID
  const userFacilityId = useMemo(() => {
    try {
      const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null
      if (userStr) {
        const u = JSON.parse(userStr)
        return u.facility_id || u.facility?.facility_id || ""
      }
    } catch {}
    return ""
  }, [])

  // Fetch Mothers on Modal Open
  useEffect(() => {
    if (!open) return

    const loadModalData = async () => {
      setErrorMsg("")
      try {
        const activeMothers = await motherRepository.getActiveMothers()
        setMothers(activeMothers)
      } catch (err) {
        console.warn("Failed to load active mothers for referral modal:", err)
      }
    }

    loadModalData()
  }, [open])

  // Selected Mother Object
  const selectedMother = useMemo(() => {
    return mothers.find((m) => (m.mother_id || m._id || m.id) === selectedMotherId) || null
  }, [mothers, selectedMotherId])

  // When a mother is selected, populate demographics, pregnancy, and vitals
  useEffect(() => {
    if (!selectedMother) {
      setSelectedPregnancyId("")
      setMotherFullName("")
      setMotherAge("")
      setMotherAddress("")
      setMotherPhone("")
      setMotherCivilStatus("")
      setMotherBday("")
      return
    }

    const fullName = getMotherFullName(selectedMother)
    const birthDate = selectedMother.birth_date || selectedMother.date_of_birth || selectedMother.dob || ""
    const bdayStr = birthDate ? new Date(birthDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"
    const ageCalculated = calculateAge(birthDate)

    setMotherFullName(fullName)
    setMotherAge(ageCalculated !== "N/A" ? ageCalculated : (selectedMother.age ? String(selectedMother.age) : "N/A"))
    setMotherAddress(selectedMother.address || selectedMother.barangay || "N/A")
    setMotherPhone(selectedMother.phone_number || selectedMother.phone || "N/A")
    setMotherCivilStatus(selectedMother.civil_status || "Single")
    setMotherBday(bdayStr)

    // Load active pregnancy & vitals
    const findPregnancyAndVisits = async () => {
      try {
        let preg: any = null
        const localPregnancies = await db.pregnancies.where("mother_id").equals(selectedMotherId).toArray()
        if (localPregnancies.length > 0) {
          preg = localPregnancies[0]
        } else {
          const res = await apiClient.get(`/api/v1/pregnancy/mother/${selectedMotherId}`)
          const data = res.data?.data || res.data?.result || (Array.isArray(res.data) ? res.data[0] : res.data)
          preg = Array.isArray(data) ? data[0] : data
        }

        if (preg) {
          const pregId = preg.pregnancy_id || preg._id || preg.id || ""
          setSelectedPregnancyId(pregId)

          if (preg.lmp) {
            const parsedLmp = new Date(preg.lmp)
            if (!isNaN(parsedLmp.getTime())) {
              setLmpDate(parsedLmp)
              setLmp(format(parsedLmp, "yyyy-MM-dd"))
            }
          }
          if (preg.edd || preg.edc) {
            const parsedEdc = new Date(preg.edd || preg.edc)
            if (!isNaN(parsedEdc.getTime())) {
              setEdcDate(parsedEdc)
              setEdc(format(parsedEdc, "yyyy-MM-dd"))
            }
          }
          if (preg.gestational_age) setAog(`${preg.gestational_age} weeks`)
          if (preg.gravida !== undefined || preg.para !== undefined) {
            setGravidaPara(`G${preg.gravida ?? 1}P${preg.para ?? 0}`)
          }
        } else {
          setSelectedPregnancyId("")
        }

        // Fetch latest prenatal visit for vitals
        const visits = await db.prenatalVisits.where("mother_id").equals(selectedMotherId).toArray()
        if (visits.length > 0) {
          const latest = visits[visits.length - 1]
          if (latest.blood_pressure) setBloodPressure(latest.blood_pressure)
          if (latest.heart_rate) setPulseRate(String(latest.heart_rate))
          if (latest.weight) setWeight(String(latest.weight))
          if (latest.temperature) setTemp(String(latest.temperature))
          if (latest.height) setHeight(String(latest.height))
        }
      } catch (err) {
        console.warn("Error pre-filling pregnancy/visit data:", err)
      }
    }

    findPregnancyAndVisits()
  }, [selectedMother, selectedMotherId])

  // Build formatted text snippet matching actual user sample
  const formattedReferralMessage = useMemo(() => {
    const destName = destinationFacility.trim() || "Destination Facility"

    return `BMC ONLINE REFERRAL (${destName.toUpperCase()})

Good morning/Good afternoon

For online referral:

Complete name: ${motherFullName || "N/A"}
Age: ${motherAge || "N/A"}
Address: ${motherAddress || "N/A"}
CP Number: ${motherPhone || "N/A"}
Civil status: ${motherCivilStatus || "N/A"}
Bday: ${motherBday || "N/A"}

V/S:
T: ${temp ? temp + "°C" : "N/A"}
PR: ${pulseRate ? pulseRate + " bpm" : "N/A"}
BP: ${bloodPressure || "N/A"}
wt: ${weight ? weight + " kg" : "N/A"}
ht: ${height ? height + " cm" : "N/A"}

CC: ${chiefComplaint || "for prenatal check up; high-risk"}

LMP - ${lmp || "N/A"}
EDC - ${edc || "N/A"}
AOG - ${aog || "N/A"}
${gravidaPara || "G1P0"}

Previous Delivery: ${previousDelivery || "None"}
Co-morbidities: ${comorbidities || "None"}

Thank you. 💛`
  }, [
    destinationFacility,
    motherFullName, motherAge, motherAddress, motherPhone, motherCivilStatus, motherBday,
    temp, pulseRate, bloodPressure, weight, height,
    chiefComplaint, lmp, edc, aog, gravidaPara, previousDelivery, comorbidities
  ])

  const handleSubmit = async () => {
    setErrorMsg("")

    if (!selectedMotherId) {
      setErrorMsg("Please select a patient / mother.")
      return
    }

    if (!destinationFacility.trim()) {
      setErrorMsg("Please enter the destination facility.")
      return
    }

    if (sendEmailNotification && !recipientEmail.trim()) {
      setErrorMsg("Please enter the recipient email address for notification.")
      return
    }

    let currentFacilityId = userFacilityId
    let pregIdToUse = selectedPregnancyId

    setLoading(true)
    try {
      // Ensure pregnancy record exists in local DB / backend if not yet created
      if (!pregIdToUse) {
        try {
          const createdPreg = await motherRepository.registerPregnancy({
            mother_id: selectedMotherId,
            gravida: 1,
            para: 0,
            lmp: lmp || undefined,
            edd: edc || undefined,
          })
          pregIdToUse = createdPreg?.pregnancy_id || createdPreg?.id || `preg-${selectedMotherId}`
        } catch (pregErr) {
          console.warn("Pregnancy registration notice:", pregErr)
          pregIdToUse = `preg-${selectedMotherId}`
        }
      }

      const createdReferral = await referralRepository.createReferral({
        pregnancy_id: pregIdToUse,
        from_facility_id: currentFacilityId || "default",
        external_facility_name: destinationFacility.trim(),
        reason: formattedReferralMessage,
      })

      // Send Email Notification if requested
      if (sendEmailNotification && recipientEmail.trim()) {
        try {
          const emailSubject = `URGENT e-Referral Handoff: ${motherFullName || "Patient"} -> ${destinationFacility}`
          const link = createdReferral.secure_link || createdReferral.recordLink || "https://bms.link/referral"
          const pin = createdReferral.shared_pin || createdReferral.transferCode || "N/A"

          const emailBody = `SPECIALIZED e-REFERRAL HANDOFF NOTIFICATION

A new patient transfer has been registered for ${destinationFacility.trim()}.

--------------------------------------------------
CLINICAL HANDOFF REPORT
--------------------------------------------------
${formattedReferralMessage}

--------------------------------------------------
REFERRAL ACCESS & SECURITY DETAILS
--------------------------------------------------
Secure Patient Record Link: ${link}
Transfer PIN / Security Code: ${pin}

Please use the PIN code or link above to log in and accept this referral in the BMS Portal.

Sent via Birth Monitoring System (BMS) Referral Network.`

          await apiClient.post("/api/v1/send/send-email", {
            email: recipientEmail.trim(),
            message: emailBody,
            subject: emailSubject,
          }).catch((emailErr) => {
            console.warn("Email API response notice:", emailErr?.response?.data?.error || emailErr.message)
          })
        } catch (err) {
          console.warn("Email dispatch error:", err)
        }
      }

      const successPayload: ReferralSuccessData = {
        motherName: motherFullName || "Patient",
        destination: destinationFacility.trim(),
        pinCode: createdReferral.shared_pin || createdReferral.transferCode || "DNAG0T",
        link: createdReferral.secure_link || createdReferral.recordLink || "https://bms.link/referral",
        formattedMessage: formattedReferralMessage,
      }

      // Reset Form
      setSelectedMotherId("")
      setSelectedPregnancyId("")
      setSendEmailNotification(false)
      setRecipientEmail("")
      setLmpDate(undefined)
      setEdcDate(undefined)
      setLmp("")
      setEdc("")
      setChiefComplaint("for prenatal check up; high-risk")
      setPreviousDelivery("None")
      setComorbidities("None")

      // Close Create Modal first
      onOpenChange(false)
      onCreated?.()

      // Pop out Success Modal with 200ms delay to allow Dialog lock unmount
      setTimeout(() => {
        if (onSuccessCreated) {
          onSuccessCreated(successPayload)
        } else {
          setLocalSuccessData(successPayload)
          setLocalSuccessOpen(true)
        }
      }, 200)
    } catch (err: any) {
      console.error("Create referral error:", err)
      setErrorMsg(err?.response?.data?.error || "Failed to submit referral. Please check inputs and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Initiate Online Referral"
      description="Create a structured clinical e-Referral handoff to higher-level facilities."
      className="sm:max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col"
    >
      <div className="flex flex-col gap-4 py-2 overflow-y-auto max-h-[75vh] pr-1">
        {errorMsg && (
          <div className="p-2.5 text-xs text-red-500 bg-red-500/10 rounded-md border border-red-500/20 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Section 1: Patient Selection & Single Destination Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border border-border">
          {/* Mother Selection */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Select Patient / Mother
            </Label>
            <Select value={selectedMotherId} onValueChange={setSelectedMotherId}>
              <SelectTrigger className="h-8 text-xs bg-card border-border text-card-foreground">
                <SelectValue placeholder="Search or select patient by name..." />
              </SelectTrigger>
              <SelectContent className="max-h-[220px]">
                {mothers.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    No active mothers registered
                  </SelectItem>
                ) : (
                  mothers.map((m) => {
                    const id = m.mother_id || m._id || m.id
                    const fullName = getMotherFullName(m)
                    const phone = m.phone_number || m.phone || ""
                    const addr = m.address || m.barangay || ""
                    const labelText = `${fullName}${addr ? ` (${addr})` : ""}${phone ? ` - ${phone}` : ""}`
                    return (
                      <SelectItem key={id} value={id} className="text-xs">
                        {labelText}
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Destination Facility (Single Form Input) */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Destination Facility
            </Label>
            <Input
              value={destinationFacility}
              onChange={(e) => setDestinationFacility(e.target.value)}
              className="h-8 text-xs bg-card border-border text-card-foreground"
              placeholder="e.g. Bicol Medical Center / Naga City RHU..."
            />
          </div>
        </div>

        {/* Selected Patient Demographics Card */}
        {selectedMother && (
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {motherFullName}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">ID: {selectedMotherId.slice(-6)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-[10px] text-muted-foreground block">Age & Bday</span>
                <span className="font-medium text-foreground">{motherAge} yrs ({motherBday})</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Civil Status</span>
                <span className="font-medium text-foreground">{motherCivilStatus}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">CP Number</span>
                <span className="font-mono text-foreground">{motherPhone}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Address</span>
                <span className="font-medium text-foreground truncate block">{motherAddress}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Vital Signs (V/S) */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-amber-500" />
            Vital Signs (V/S)
          </Label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Thermometer className="h-3 w-3 text-red-500" /> T (°C)
              </span>
              <Input
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="36.5"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3 text-rose-500" /> PR (bpm)
              </span>
              <Input
                value={pulseRate}
                onChange={(e) => setPulseRate(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="80"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3 text-blue-500" /> BP (mmHg)
              </span>
              <Input
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="120/80"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Scale className="h-3 w-3 text-emerald-500" /> wt (kg)
              </span>
              <Input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="55"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Ruler className="h-3 w-3 text-purple-500" /> ht (cm)
              </span>
              <Input
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="155"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Chief Complaint (CC) */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Chief Complaint (CC)
          </Label>
          <Input
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            className="h-8 text-xs bg-card border-border text-card-foreground"
            placeholder="e.g. for prenatal check up; high-risk"
          />
        </div>

        {/* Section 4: Obstetrical History & Custom DatePickers */}
        <div className="flex flex-col gap-2.5">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            Obstetrical History
          </Label>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* LMP DatePicker */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">LMP</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-start text-left font-normal text-xs bg-card border-border px-2 text-card-foreground",
                      !lmpDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{lmpDate ? format(lmpDate, "PP") : "Pick LMP"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={lmpDate}
                    onSelect={(date) => {
                      setLmpDate(date)
                      setLmp(date ? format(date, "yyyy-MM-dd") : "")
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* EDC DatePicker */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">EDC / EDD</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-start text-left font-normal text-xs bg-card border-border px-2 text-card-foreground",
                      !edcDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{edcDate ? format(edcDate, "PP") : "Pick EDC"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={edcDate}
                    onSelect={(date) => {
                      setEdcDate(date)
                      setEdc(date ? format(date, "yyyy-MM-dd") : "")
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* AOG */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">AOG (Gestation)</span>
              <Input
                value={aog}
                onChange={(e) => setAog(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="e.g. 32 weeks"
              />
            </div>

            {/* Gravida/Para */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Gravida / Para</span>
              <Input
                value={gravidaPara}
                onChange={(e) => setGravidaPara(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="G1P0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Previous Delivery</span>
              <Input
                value={previousDelivery}
                onChange={(e) => setPreviousDelivery(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="None"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Co-morbidities</span>
              <Input
                value={comorbidities}
                onChange={(e) => setComorbidities(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="None"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Optional Specialized Email Notification */}
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-muted/40">
          <div className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
              id="send-email-check"
              checked={sendEmailNotification}
              onCheckedChange={(checked) => setSendEmailNotification(!!checked)}
              className="h-4 w-4 border-border"
            />
            <label htmlFor="send-email-check" className="text-xs font-semibold text-foreground cursor-pointer select-none flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-blue-500" />
              Send specialized email notification to receiving facility / physician?
            </label>
          </div>

          {sendEmailNotification && (
            <div className="flex flex-col gap-1.5 mt-1 pl-6">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Recipient Email Address
              </Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="h-8 text-xs bg-card border-border text-card-foreground"
                placeholder="e.g. physician@hospital.gov.ph or referral@bicolmedicalcenter.ph"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-border">
        <Button variant="ghost" className="h-8 text-xs w-full sm:w-auto" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          disabled={loading || !selectedMotherId}
          onClick={handleSubmit}
          className="h-8 text-xs w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
        >
          {loading ? "Submitting Handoff..." : "Submit Online Referral"}
        </Button>
      </div>

      {/* Fallback Success Confirmation Modal */}
      <ReferralSuccessModal
        open={localSuccessOpen}
        onOpenChange={setLocalSuccessOpen}
        referralData={localSuccessData}
      />
    </ResponsiveModal>
  )
}
