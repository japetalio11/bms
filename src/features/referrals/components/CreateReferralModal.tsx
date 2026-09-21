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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  CheckCircle2,
} from "lucide-react"
import { motherRepository } from "@/lib/repositories/motherRepository"
import { referralRepository } from "@/lib/repositories/referralRepository"
import { apiClient } from "@/lib/apiClient"
import { db } from "@/lib/db/bmsDatabase"
import { useLiveQuery } from "dexie-react-hooks"
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
  const firstName =
    m.first_name || m.firstName || m.user?.first_name || m.user?.firstName || ""
  const lastName =
    m.last_name || m.lastName || m.user?.last_name || m.user?.lastName || ""
  const middleName = m.middle_name || m.middleName || m.user?.middle_name || ""
  const full =
    `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim()
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
  const [localSuccessData, setLocalSuccessData] =
    useState<ReferralSuccessData | null>(null)
  const [step, setStep] = useState<number>(1)

  const [mothers, setMothers] = useState<any[]>([])
  const [selectedMotherId, setSelectedMotherId] = useState<string>("")
  const [selectedPregnancyId, setSelectedPregnancyId] = useState<string>("")

  const [destinationFacility, setDestinationFacility] = useState<string>(
    "Bicol Medical Center"
  )

  const [sendEmailNotification, setSendEmailNotification] =
    useState<boolean>(false)
  const [recipientEmail, setRecipientEmail] = useState<string>("")

  const [motherFullName, setMotherFullName] = useState<string>("")
  const [motherAge, setMotherAge] = useState<string>("")
  const [motherAddress, setMotherAddress] = useState<string>("")
  const [motherPhone, setMotherPhone] = useState<string>("")
  const [motherCivilStatus, setMotherCivilStatus] = useState<string>("")
  const [motherBday, setMotherBday] = useState<string>("")

  const [temp, setTemp] = useState<string>("36.5")
  const [pulseRate, setPulseRate] = useState<string>("80")
  const [bloodPressure, setBloodPressure] = useState<string>("120/80")
  const [weight, setWeight] = useState<string>("55")
  const [height, setHeight] = useState<string>("155")

  const [chiefComplaint, setChiefComplaint] = useState<string>(
    "for prenatal check up; high-risk"
  )
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

  const sessionUser = useLiveQuery(() => db.userSession.get("current_user"))

  const currentUser = useMemo(() => {
    if (sessionUser) return sessionUser
    try {
      const userStr =
        typeof window !== "undefined" ? localStorage.getItem("user") : null
      if (userStr) return JSON.parse(userStr)
    } catch {}
    return null
  }, [sessionUser])

  const userFacilityId = useMemo(() => {
    return currentUser?.facility_id || currentUser?.facility?.facility_id || ""
  }, [currentUser])

  const isSysAdmin = currentUser?.role === "SystemAdmin"

  useEffect(() => {
    if (!open) {
      setTimeout(() => setStep(1), 300)
      return
    }

    const loadModalData = async () => {
      setErrorMsg("")
      try {
        const facilityIdToQuery = isSysAdmin ? undefined : userFacilityId
        const activeMothers = await motherRepository.getActiveMothers(
          facilityIdToQuery || undefined
        )

        const scopedMothers = isSysAdmin
          ? activeMothers
          : activeMothers.filter((m) => {
              if (!userFacilityId) return true
              const isDirect = m.facility_id === userFacilityId
              const isUserFacility = m.user?.facility_id === userFacilityId
              const isInFacilityIds =
                Array.isArray(m.facility_ids) &&
                m.facility_ids.includes(userFacilityId)
              const isInEnrollments =
                Array.isArray(m.facilityEnrollments) &&
                m.facilityEnrollments.some(
                  (e: any) =>
                    e.facility_id === userFacilityId &&
                    (e.status === "Active" || !e.status)
                )
              return (
                isDirect ||
                isUserFacility ||
                isInFacilityIds ||
                isInEnrollments
              )
            })

        setMothers(scopedMothers)
      } catch (err) {
        console.warn("Failed to load active mothers for referral modal:", err)
      }
    }

    loadModalData()
  }, [open, userFacilityId, isSysAdmin])

  const selectedMother = useMemo(() => {
    return (
      mothers.find(
        (m) => (m.mother_id || m._id || m.id) === selectedMotherId
      ) || null
    )
  }, [mothers, selectedMotherId])

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
    const birthDate =
      selectedMother.birth_date ||
      selectedMother.date_of_birth ||
      selectedMother.dob ||
      ""
    const bdayStr = birthDate
      ? new Date(birthDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "N/A"
    const ageCalculated = calculateAge(birthDate)

    setMotherFullName(fullName)
    setMotherAge(
      ageCalculated !== "N/A"
        ? ageCalculated
        : selectedMother.age
          ? String(selectedMother.age)
          : "N/A"
    )
    setMotherAddress(selectedMother.address || selectedMother.barangay || "N/A")
    setMotherPhone(selectedMother.phone_number || selectedMother.phone || "N/A")
    setMotherCivilStatus(selectedMother.civil_status || "Single")
    setMotherBday(bdayStr)

    const findPregnancyAndVisits = async () => {
      try {
        let preg: any = null
        const localPregnancies = await db.pregnancies
          .where("mother_id")
          .equals(selectedMotherId)
          .toArray()
        if (localPregnancies.length > 0) {
          preg = localPregnancies[0]
        } else {
          const res = await apiClient.get(
            `/api/v1/pregnancy/mother/${selectedMotherId}`
          )
          const data =
            res.data?.data ||
            res.data?.result ||
            (Array.isArray(res.data) ? res.data[0] : res.data)
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

        const visits = await db.prenatalVisits
          .where("mother_id")
          .equals(selectedMotherId)
          .toArray()
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
    motherFullName,
    motherAge,
    motherAddress,
    motherPhone,
    motherCivilStatus,
    motherBday,
    temp,
    pulseRate,
    bloodPressure,
    weight,
    height,
    chiefComplaint,
    lmp,
    edc,
    aog,
    gravidaPara,
    previousDelivery,
    comorbidities,
  ])

  const handleSubmit = async () => {
    setErrorMsg("")

    if (!selectedMotherId) {
      setErrorMsg("Please select a patient / mother.")
      return
    }

    if (!isSysAdmin && userFacilityId && selectedMother) {
      const isDirect = selectedMother.facility_id === userFacilityId
      const isUserFacility = selectedMother.user?.facility_id === userFacilityId
      const isInFacilityIds =
        Array.isArray(selectedMother.facility_ids) &&
        selectedMother.facility_ids.includes(userFacilityId)
      const isInEnrollments =
        Array.isArray(selectedMother.facilityEnrollments) &&
        selectedMother.facilityEnrollments.some(
          (e: any) =>
            e.facility_id === userFacilityId &&
            (e.status === "Active" || !e.status)
        )
      const isAssigned =
        selectedMother.assigned_worker_id === currentUser?.user_id ||
        selectedMother.created_by_id === currentUser?.user_id

      if (
        !isDirect &&
        !isUserFacility &&
        !isInFacilityIds &&
        !isInEnrollments &&
        !isAssigned
      ) {
        setErrorMsg(
          "Access denied: You can only refer patients registered or actively enrolled in your facility."
        )
        return
      }
    }

    if (!destinationFacility.trim()) {
      setErrorMsg("Please enter the destination facility.")
      return
    }

    if (sendEmailNotification && !recipientEmail.trim()) {
      setErrorMsg("Please enter the recipient email address for notification.")
      return
    }

    const currentFacilityId =
      userFacilityId ||
      selectedMother?.facility_id ||
      selectedMother?.user?.facility_id

    if (!currentFacilityId && !isSysAdmin) {
      setErrorMsg("Your facility could not be determined. Please re-login.")
      return
    }

    let pregIdToUse = selectedPregnancyId

    setLoading(true)
    try {
      if (!pregIdToUse) {
        try {
          const createdPreg = await motherRepository.registerPregnancy({
            mother_id: selectedMotherId,
            gravida: 1,
            para: 0,
            lmp: lmp || undefined,
            edd: edc || undefined,
          })
          pregIdToUse =
            createdPreg?.pregnancy_id ||
            createdPreg?.id ||
            `preg-${selectedMotherId}`
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
        mother_name: motherFullName.trim() || undefined,
      })

      if (sendEmailNotification && recipientEmail.trim()) {
        try {
          const emailSubject = `URGENT e-Referral Handoff: ${motherFullName || "Patient"} -> ${destinationFacility}`
          const link =
            createdReferral.secure_link ||
            createdReferral.recordLink ||
            "https://bms.link/referral"
          const pin =
            createdReferral.shared_pin || createdReferral.transferCode || "N/A"

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

          await apiClient
            .post("/api/v1/send/send-email", {
              email: recipientEmail.trim(),
              message: emailBody,
              subject: emailSubject,
            })
            .catch((emailErr) => {
              console.warn(
                "Email API response notice:",
                emailErr?.response?.data?.error || emailErr.message
              )
            })
        } catch (err) {
          console.warn("Email dispatch error:", err)
        }
      }

      const successPayload: ReferralSuccessData = {
        motherName: motherFullName || "Patient",
        destination: destinationFacility.trim(),
        pinCode:
          createdReferral.shared_pin ||
          createdReferral.transferCode ||
          "DNAG0T",
        link:
          createdReferral.secure_link ||
          createdReferral.recordLink ||
          "https://bms.link/referral",
        formattedMessage: formattedReferralMessage,
      }

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

      onOpenChange(false)
      onCreated?.()

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
      setErrorMsg(
        err?.response?.data?.error ||
          "Failed to submit referral. Please check inputs and try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Initiate Online Referral"
      description={`Step ${step} of 3: ${step === 1 ? 'Patient & Destination' : step === 2 ? 'Clinical Assessment' : 'Notification & Handoff'}`}
      className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[500px]"
    >
      <div className="flex max-h-[75vh] flex-col gap-6 overflow-y-auto py-2 pr-1">
        {errorMsg && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-2.5 text-xs font-medium text-red-500">
            {errorMsg}
          </div>
        )}

        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-in-out" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">
              Select Patient / Mother
            </Label>
            <Select
              value={selectedMotherId}
              onValueChange={setSelectedMotherId}
            >
              <SelectTrigger className="h-8 border-border bg-card text-xs text-card-foreground">
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
                    return (
                      <SelectItem key={id} value={id} className="text-xs">
                        {fullName}
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground">
              Destination Facility
            </Label>
            <Input
              value={destinationFacility}
              onChange={(e) => setDestinationFacility(e.target.value)}
              className="h-8 border-border bg-card text-xs text-card-foreground"
              placeholder="e.g. Bicol Medical Center / Naga City RHU..."
            />
          </div>
        </div>

        {selectedMother && (
          <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {motherFullName}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ID: {selectedMotherId.slice(-6)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
              <div>
                <span className="block text-[10px] text-muted-foreground">
                  Age & Bday
                </span>
                <span className="font-medium text-foreground">
                  {motherAge} yrs ({motherBday})
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground">
                  Civil Status
                </span>
                <span className="font-medium text-foreground">
                  {motherCivilStatus}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground">
                  CP Number
                </span>
                <span className="font-mono text-foreground">{motherPhone}</span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground">
                  Address
                </span>
                <span className="block truncate font-medium text-foreground">
                  {motherAddress}
                </span>
              </div>
            </div>
          </div>
        )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-4">
              <Label className="text-sm font-semibold text-foreground">
            Vital Signs (V/S)
          </Label>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                T (°C)
              </Label>
              <Input
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="36.5"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                PR (bpm)
              </Label>
              <Input
                value={pulseRate}
                onChange={(e) => setPulseRate(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="80"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                BP (mmHg)
              </Label>
              <Input
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="120/80"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                wt (kg)
              </Label>
              <Input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="55"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                ht (cm)
              </Label>
              <Input
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="155"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-semibold text-foreground">
            Chief Complaint (CC)
          </Label>
          <Input
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            className="h-8 border-border bg-card text-xs text-card-foreground"
            placeholder="e.g. for prenatal check up; high-risk"
          />
        </div>

        <div className="flex flex-col gap-4">
          <Label className="text-sm font-semibold text-foreground">
            Obstetrical History
          </Label>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                LMP
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-start border-border bg-card px-2 text-left text-xs font-normal text-card-foreground",
                      !lmpDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">
                      {lmpDate ? format(lmpDate, "PP") : "Pick LMP"}
                    </span>
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

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                EDC / EDD
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-start border-border bg-card px-2 text-left text-xs font-normal text-card-foreground",
                      !edcDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">
                      {edcDate ? format(edcDate, "PP") : "Pick EDC"}
                    </span>
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

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                AOG (Gestation)
              </Label>
              <Input
                value={aog}
                onChange={(e) => setAog(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="e.g. 32 weeks"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                Gravida / Para
              </Label>
              <Input
                value={gravidaPara}
                onChange={(e) => setGravidaPara(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="G1P0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                Previous Delivery
              </Label>
              <Input
                value={previousDelivery}
                onChange={(e) => setPreviousDelivery(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="None"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-foreground">
                Co-morbidities
              </Label>
              <Input
                value={comorbidities}
                onChange={(e) => setComorbidities(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="None"
              />
            </div>
          </div>
        </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-4">
              <div className="flex cursor-pointer items-center space-x-2">
            <Checkbox
              id="send-email-check"
              checked={sendEmailNotification}
              onCheckedChange={(checked) => setSendEmailNotification(!!checked)}
              className="h-4 w-4 border-border"
            />
            <label
              htmlFor="send-email-check"
              className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground select-none"
            >
              Send specialized email notification to receiving facility /
              physician?
            </label>
          </div>

          {sendEmailNotification && (
            <div className="mt-1 flex flex-col gap-1.5 pl-6">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Recipient Email Address
              </Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="h-8 border-border bg-card text-xs text-card-foreground"
                placeholder="e.g. physician@hospital.gov.ph or referral@bicolmedicalcenter.ph"
              />
            </div>
          )}
        </div>
            
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mt-2">
              <h4 className="text-xs font-semibold text-primary mb-1">Ready to Submit</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Please review the patient's handoff details. Once submitted, the destination facility will be notified of this high-risk referral and provided with a secure PIN to view clinical records.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-3 sm:flex-row mt-2">
        {step === 1 && (
           <>
             <Button variant="ghost" className="h-8 w-full text-xs sm:w-auto" onClick={() => onOpenChange(false)}>Cancel</Button>
             <Button className="h-8 w-full bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto" onClick={() => {
                if (!selectedMotherId) { setErrorMsg("Please select a patient / mother."); return; }
                if (!destinationFacility.trim()) { setErrorMsg("Please enter the destination facility."); return; }
                setErrorMsg("");
                setStep(2);
             }}>Next Step</Button>
           </>
        )}
        {step === 2 && (
           <>
             <Button variant="ghost" className="h-8 w-full text-xs sm:w-auto" onClick={() => setStep(1)}>Back</Button>
             <Button className="h-8 w-full bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto" onClick={() => setStep(3)}>Next Step</Button>
           </>
        )}
        {step === 3 && (
           <>
             <Button variant="ghost" className="h-8 w-full text-xs sm:w-auto" onClick={() => setStep(2)}>Back</Button>
             <Button disabled={loading || !selectedMotherId} onClick={handleSubmit} className="h-8 w-full bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto">
               {loading ? "Submitting Handoff..." : "Submit Online Referral"}
             </Button>
           </>
        )}
      </div>

      <ReferralSuccessModal
        open={localSuccessOpen}
        onOpenChange={setLocalSuccessOpen}
        referralData={localSuccessData}
      />
    </ResponsiveModal>
  )
}
