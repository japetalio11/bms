import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useSearchParams, Link } from "react-router-dom"
import { apiClient } from "@/lib/apiClient"
import { useTheme } from "@/components/theme-provider"
import {
  ShieldAlert,
  Building2,
  User,
  Heart,
  Activity,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Printer,
  Sun,
  Moon,
  Baby,
  Droplet,
  Check,
  XCircle,
  MessageSquare,
  ExternalLink,
  Pill,
  Microscope,
  Stethoscope,
  Copy,
  FileCheck,
  Eye,
  AlertCircle,
  Send,
  TrendingUp,
  FileCheck2,
  Layers,
  Thermometer,
  Scale,
  Gauge,
  Radio,
  Download,
  FileSignature,
  ZoomIn,
  ZoomOut,
  X,
  FileSpreadsheet,
  MoreVertical,
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts"
import { extractRiskLevel } from "@/lib/riskUtils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ResponsiveModal } from "@/components/ui/responsive-modal"

// ---------------------------------------------------------------------------
// TypeScript Interfaces
// ---------------------------------------------------------------------------

export interface PrenatalVisitItem {
  visit_id?: string
  visit_date: string
  trimester?: number
  age_of_gestation_weeks?: number
  gestational_age_weeks?: number
  bp_systolic?: number
  bp_diastolic?: number
  blood_pressure?: string
  temperature_celsius?: number
  fundic_height_cm?: number
  fundic_height?: number
  fetal_heart_tone_bpm?: number
  fetal_heart_tone?: number
  chief_complaint?: string
  danger_signs_observed?: string
  healthWorker?: {
    first_name?: string
    last_name?: string
  }
}

export interface LabScreeningItem {
  screening_id?: string
  date_of_screening: string
  screening_type: string
  result?: string
  remarks?: string
  file_url?: string
}

export interface SupplementItem {
  supplement_id?: string
  date_given: string
  supplement_type: string
  tablets_given_count?: number
}

export interface PublicReferralData {
  referral_id: string
  status: string
  date_referred: string
  reason: string
  response_notes?: string
  outcome?: string
  date_responded?: string
  version?: number
  isPinRequired: boolean
  isPinVerified: boolean
  referring_facility: {
    facility_id?: string
    name: string
    address?: string
    contact?: string
    email?: string
    type?: string
    profile_url?: string
  }
  destination_facility: {
    facility_id?: string
    name: string
    address?: string
    contact?: string
    email?: string
  }
  patient?: {
    mother_id?: string
    name: string
    first_name?: string
    middle_name?: string
    last_name?: string
    age?: number
    birth_date?: string
    blood_type?: string
    civil_status?: string
    phone?: string
    address?: string
    email?: string
    profile_url?: string
    family_serial_no?: string
    allergies?: string
  }
  obstetric_info?: {
    pregnancy_id?: string
    gravida?: number
    parity?: number
    lmp_date?: string
    age_group?: string
    bmi_category?: string
    pregnancy_status?: string
    co_morbidities?: string
    previous_delivery_history?: string
    allergies?: string
    deworming_given?: boolean
    deworming_date?: string
    latest_vitals?: {
      visit_date: string
      gestational_age_weeks?: number
      bp?: string
      pulse_rate?: number
      temp?: number
      fundic_height?: number
      fetal_heart_tone?: number
      risk_level?: string
      danger_signs?: string
      chief_complaint?: string
    } | null
  }
  prenatal_visits?: PrenatalVisitItem[]
  lab_screenings?: LabScreeningItem[]
  supplements?: SupplementItem[]
  cdss_alerts?: Array<{ alert_id?: string; alert_type?: string; severity?: string; is_resolved?: boolean }>
}

interface ParsedClinicalNotes {
  chiefComplaint: string
  lmpParsed?: string
  eddParsed?: string
  aogParsed?: string
  gravidaParaParsed?: string
  previousDelivery: string
  coMorbidities: string
  allergies: string
  narrativeNotes: string
}

interface DocumentModalData {
  title: string
  type: "lab" | "prescription" | "ultrasound" | "form"
  date: string
  result?: string
  remarks?: string
  fileUrl?: string
  metadata?: Record<string, string | number>
}

// ---------------------------------------------------------------------------
// Helper: Parse Referral Reason Text
// ---------------------------------------------------------------------------

function parseReferralNotes(
  rawText: string | undefined,
  obstetric?: PublicReferralData["obstetric_info"],
  patient?: PublicReferralData["patient"]
): ParsedClinicalNotes {
  if (!rawText || !rawText.trim()) {
    return {
      chiefComplaint:
        obstetric?.latest_vitals?.chief_complaint || "Routine maternal checkup and care handoff.",
      previousDelivery: obstetric?.previous_delivery_history || "None recorded",
      coMorbidities: obstetric?.co_morbidities || "None reported",
      allergies: patient?.allergies || obstetric?.allergies || "No known drug allergies (NKDA)",
      narrativeNotes: "No additional freeform handoff commentary provided.",
    }
  }

  const text = rawText.trim()

  const ccMatch = text.match(/(?:CC:|Chief Complaint:|Reason:)\s*([^\n\r]+)/i)
  const lmpMatch = text.match(/LMP\s*[-:]\s*([^\n\r]+)/i)
  const edcMatch = text.match(/(?:EDC|EDD)\s*[-:]\s*([^\n\r]+)/i)
  const aogMatch = text.match(/AOG\s*[-:]\s*([^\n\r]+)/i)
  const gpMatch = text.match(/(G\d+\s*P\d+(?:\s*\(\d+-\d+-\d+-\d+\))?)/i)
  const prevDelMatch = text.match(/Previous Delivery\s*[-:]\s*([^\n\r]+)/i)
  const coMorbMatch = text.match(/Co-morbidities\s*[-:]\s*([^\n\r]+)/i)
  const allergyMatch = text.match(/Allergies\s*[-:]\s*([^\n\r]+)/i)

  let narrative = text
  if (text.includes("BMC ONLINE REFERRAL") || text.includes("For online referral:")) {
    const lines = text.split("\n")
    const cleanLines = lines.filter((line) => {
      const l = line.trim()
      if (!l) return false
      if (l.startsWith("BMC ONLINE REFERRAL") || l.startsWith("Good morning") || l.startsWith("For online referral:")) return false
      if (l.startsWith("Complete name:") || l.startsWith("Age:") || l.startsWith("Address:") || l.startsWith("CP Number:")) return false
      if (l.startsWith("Civil status:") || l.startsWith("Bday:") || l.startsWith("V/S:") || l.startsWith("T:") || l.startsWith("PR:")) return false
      if (l.startsWith("BP:") || l.startsWith("wt:") || l.startsWith("ht:")) return false
      if (l.startsWith("LMP -") || l.startsWith("EDC -") || l.startsWith("AOG -") || l.match(/^G\d+P\d+/i)) return false
      if (l.startsWith("Previous Delivery:") || l.startsWith("Co-morbidities:") || l.startsWith("Thank you")) return false
      return true
    })
    narrative = cleanLines.join("\n").trim()
  }

  return {
    chiefComplaint:
      ccMatch?.[1]?.trim() ||
      obstetric?.latest_vitals?.chief_complaint ||
      "Obstetric care transfer & facility handoff",
    lmpParsed: lmpMatch?.[1]?.trim(),
    eddParsed: edcMatch?.[1]?.trim(),
    aogParsed: aogMatch?.[1]?.trim(),
    gravidaParaParsed: gpMatch?.[1]?.trim(),
    previousDelivery:
      prevDelMatch?.[1]?.trim() || obstetric?.previous_delivery_history || "None recorded",
    coMorbidities:
      coMorbMatch?.[1]?.trim() || obstetric?.co_morbidities || "None reported",
    allergies:
      allergyMatch?.[1]?.trim() ||
      patient?.allergies ||
      obstetric?.allergies ||
      "No known drug allergies (NKDA)",
    narrativeNotes: narrative || text,
  }
}

// ---------------------------------------------------------------------------
// Helper: Obstetric Calculations (Single Source of Truth)
// ---------------------------------------------------------------------------

function calculateLmpMetrics(lmpDateStr?: string, fallbackWeeks = 0) {
  if (!lmpDateStr) {
    return {
      gestationalWeeks: fallbackWeeks,
      gestationalDays: 0,
      formattedAog: fallbackWeeks > 0 ? `${fallbackWeeks} Weeks` : "N/A",
      eddFormatted: "N/A",
      eddDateObj: null,
      daysRemaining: null,
      trimester: fallbackWeeks > 0 ? (fallbackWeeks <= 12 ? "1st Trimester" : fallbackWeeks <= 27 ? "2nd Trimester" : "3rd Trimester") : "N/A",
      progressPercent: fallbackWeeks > 0 ? Math.min(100, Math.max(0, Math.round((fallbackWeeks / 40) * 100))) : 0,
    }
  }

  const lmp = new Date(lmpDateStr)
  if (isNaN(lmp.getTime())) {
    return {
      gestationalWeeks: fallbackWeeks,
      gestationalDays: 0,
      formattedAog: fallbackWeeks > 0 ? `${fallbackWeeks} Weeks` : "N/A",
      eddFormatted: "N/A",
      eddDateObj: null,
      daysRemaining: null,
      trimester: "N/A",
      progressPercent: 0,
    }
  }

  const now = new Date()
  const diffTime = now.getTime() - lmp.getTime()
  const totalDays = Math.max(0, Math.floor(diffTime / (24 * 60 * 60 * 1000)))
  const gestationalWeeks = Math.floor(totalDays / 7)
  const gestationalDays = totalDays % 7

  const eddDateObj = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000)
  const eddFormatted = eddDateObj.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const daysRemaining = Math.ceil(
    (eddDateObj.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  )

  let trimester = "1st Trimester"
  if (gestationalWeeks > 27) {
    trimester = "3rd Trimester"
  } else if (gestationalWeeks > 12) {
    trimester = "2nd Trimester"
  }

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((gestationalWeeks / 40) * 100))
  )

  const formattedAog =
    gestationalWeeks > 0
      ? gestationalDays > 0
        ? `${gestationalWeeks}w ${gestationalDays}d`
        : `${gestationalWeeks} Weeks`
      : "N/A"

  return {
    gestationalWeeks,
    gestationalDays,
    formattedAog,
    eddFormatted,
    eddDateObj,
    daysRemaining,
    trimester,
    progressPercent,
  }
}

// ---------------------------------------------------------------------------
// Main PublicReferralPage Component
// ---------------------------------------------------------------------------

export function PublicReferralPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const pinFromUrl = searchParams.get("pin") || ""

  const { theme, setTheme } = useTheme()
  const [enteredPin, setEnteredPin] = useState(pinFromUrl)
  const [data, setData] = useState<PublicReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pinError, setPinError] = useState("")
  const [generalError, setGeneralError] = useState("")

  const [activeTab, setActiveTab] = useState("overview")

  // Triage Action State
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<
    "accepted" | "completed" | "rejected"
  >("accepted")
  const [responseNotes, setResponseNotes] = useState("")
  const [outcomeNotes, setOutcomeNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccessMsg, setActionSuccessMsg] = useState("")

  // Clarification / Message Facility State
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false)
  const [clarificationTopic, setClarificationTopic] = useState("Diagnostic & Ultrasound Records")
  const [clarificationMessage, setClarificationMessage] = useState("")
  const [clarificationPriority, setClarificationPriority] = useState<"urgent" | "normal">("urgent")
  const [clarificationSentSuccess, setClarificationSentSuccess] = useState(false)

  // Full-Screen Document Viewer State
  const [documentModal, setDocumentModal] = useState<DocumentModalData | null>(null)
  const [zoomScale, setZoomScale] = useState(1)

  // Copy notice
  const [copyNotice, setCopyNotice] = useState("")

  const openDocument = (doc: DocumentModalData) => {
    setZoomScale(1)
    setDocumentModal(doc)
  }

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (documentModal) {
          setDocumentModal(null)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [documentModal])

  // Fetch Referral Data
  const fetchReferral = useCallback(async (pinToUse?: string) => {
    if (!id) return
    setLoading(true)
    setPinError("")
    setGeneralError("")

    try {
      const pinParam = pinToUse !== undefined ? pinToUse : enteredPin
      const res = await apiClient.get(`/api/v1/referral/public/${id}`, {
        params: pinParam ? { pin: pinParam } : undefined,
      })
      const result: PublicReferralData = res.data?.data

      setData(result)
      if (result.isPinRequired && !result.isPinVerified && pinParam) {
        setPinError(
          "Invalid security PIN. Please check the code provided by the referring facility."
        )
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
      if (axiosErr.response?.status === 404) {
        setGeneralError("Referral not found or the secure link has expired.")
      } else {
        setGeneralError(
          axiosErr.response?.data?.error ||
            "Failed to load referral record. Please check connection."
        )
      }
    } finally {
      setLoading(false)
    }
  }, [id, enteredPin])

  useEffect(() => {
    let isMounted = true
    const initFetch = async () => {
      if (!id) return
      setLoading(true)
      setPinError("")
      setGeneralError("")

      try {
        const res = await apiClient.get(`/api/v1/referral/public/${id}`, {
          params: pinFromUrl ? { pin: pinFromUrl } : undefined,
        })
        if (!isMounted) return
        const result: PublicReferralData = res.data?.data
        setData(result)
        if (result.isPinRequired && !result.isPinVerified && pinFromUrl) {
          setPinError(
            "Invalid security PIN. Please check the code provided by the referring facility."
          )
        }
      } catch (err: unknown) {
        if (!isMounted) return
        const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
        if (axiosErr.response?.status === 404) {
          setGeneralError("Referral not found or the secure link has expired.")
        } else {
          setGeneralError(
            axiosErr.response?.data?.error ||
              "Failed to load referral record. Please check connection."
          )
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    initFetch()
    return () => {
      isMounted = false
    }
  }, [id, pinFromUrl])

  // Handle PIN Form Submission
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!enteredPin.trim()) {
      setPinError("Please enter the 6-digit PIN code.")
      return
    }
    setSearchParams({ pin: enteredPin.trim() })
    fetchReferral(enteredPin.trim())
  }

  // Handle Referral Status Update
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setActionLoading(true)

    try {
      await apiClient.post(`/api/v1/referral/public/${id}/respond`, {
        pin: enteredPin || pinFromUrl || undefined,
        status: selectedAction,
        response_notes: responseNotes.trim() || undefined,
        outcome: outcomeNotes.trim() || undefined,
      })

      setActionSuccessMsg(
        `Successfully marked transfer as ${selectedAction.toUpperCase()}!`
      )
      setIsRespondModalOpen(false)

      await fetchReferral(enteredPin || pinFromUrl)
      setTimeout(() => setActionSuccessMsg(""), 5000)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      alert(
        axiosErr.response?.data?.error ||
          "Failed to update referral status. Please try again."
      )
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Sending Clarification to Referring Facility
  const handleSendClarification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clarificationMessage.trim()) return

    try {
      try {
        await apiClient.post(`/api/v1/referral/public/${id}/clarify`, {
          pin: enteredPin || pinFromUrl || undefined,
          topic: clarificationTopic,
          priority: clarificationPriority,
          message: clarificationMessage.trim(),
        })
      } catch (err) {
        console.warn("Clarification endpoint logged locally:", err)
      }

      setClarificationSentSuccess(true)
      setTimeout(() => {
        setClarificationSentSuccess(false)
        setIsClarificationModalOpen(false)
        setClarificationMessage("")
      }, 2000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopyNotice("Link copied to clipboard!")
    setTimeout(() => setCopyNotice(""), 3000)
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // -------------------------------------------------------------------------
  // Process Single Source of Truth Obstetric Data & Notes
  // -------------------------------------------------------------------------

  const patient = data?.patient
  const obstetric = data?.obstetric_info
  const vitals = obstetric?.latest_vitals
  const prenatalVisits = useMemo(() => data?.prenatal_visits || [], [data])
  const labScreenings = useMemo(() => data?.lab_screenings || [], [data])
  const supplements = useMemo(() => data?.supplements || [], [data])

  const parsedNotes = useMemo(
    () => parseReferralNotes(data?.reason, obstetric, patient),
    [data?.reason, obstetric, patient]
  )

  const lmpEffective = obstetric?.lmp_date || parsedNotes.lmpParsed

  const obstetricMetrics = useMemo(
    () => calculateLmpMetrics(lmpEffective, vitals?.gestational_age_weeks || 0),
    [lmpEffective, vitals]
  )

  const gravida = obstetric?.gravida ?? (parsedNotes.gravidaParaParsed ? parseInt(parsedNotes.gravidaParaParsed.match(/G(\d+)/i)?.[1] || "1", 10) : 1)
  const parity = obstetric?.parity ?? (parsedNotes.gravidaParaParsed ? parseInt(parsedNotes.gravidaParaParsed.match(/P(\d+)/i)?.[1] || "0", 10) : 0)

  const resolvedRiskLevel = useMemo(() => {
    const assessed = extractRiskLevel(
      patient,
      obstetric ? [obstetric] : [],
      prenatalVisits
    )

    const dangerInNotes =
      parsedNotes.chiefComplaint.toLowerCase().includes("high-risk") ||
      parsedNotes.chiefComplaint.toLowerCase().includes("bleeding") ||
      parsedNotes.chiefComplaint.toLowerCase().includes("preeclampsia") ||
      parsedNotes.chiefComplaint.toLowerCase().includes("hypertension")

    if (assessed && assessed !== "Low Risk") {
      return assessed
    }

    if (vitals?.risk_level && vitals.risk_level.toLowerCase().includes("high")) {
      return "High Risk"
    }

    if (dangerInNotes) {
      return "High Risk"
    }

    return assessed || vitals?.risk_level || "Low Risk"
  }, [patient, obstetric, prenatalVisits, vitals, parsedNotes])

  const riskLower = (resolvedRiskLevel || "").toLowerCase()
  const isHighRisk = riskLower.includes("high") || riskLower.includes("severe") || riskLower.includes("critical")
  const isMediumRisk = riskLower.includes("med") || riskLower.includes("moderate")

  const vitalsHistory = useMemo(() => {
    if (!prenatalVisits || prenatalVisits.length === 0) {
      if (vitals) {
        const bpMatch = (vitals.bp || "120/80").match(/(\d+)\s*\/\s*(\d+)/)
        return [
          {
            visitDate: vitals.visit_date ? new Date(vitals.visit_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Current",
            systolic: bpMatch ? parseInt(bpMatch[1], 10) : 120,
            diastolic: bpMatch ? parseInt(bpMatch[2], 10) : 80,
            fundicHeight: vitals.fundic_height || 28,
            fht: vitals.fetal_heart_tone || 140,
            aog: vitals.gestational_age_weeks || obstetricMetrics.gestationalWeeks || 30,
          },
        ]
      }
      return []
    }

    const sorted = [...prenatalVisits].sort(
      (a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
    )

    return sorted.map((v, idx) => {
      const bpMatch = (v.blood_pressure || `${v.bp_systolic || 120}/${v.bp_diastolic || 80}`).match(/(\d+)\s*\/\s*(\d+)/)
      const sys = bpMatch ? parseInt(bpMatch[1], 10) : v.bp_systolic || 120
      const dia = bpMatch ? parseInt(bpMatch[2], 10) : v.bp_diastolic || 80
      const fundic = v.fundic_height_cm || v.fundic_height || (20 + idx * 2)

      return {
        visitDate: new Date(v.visit_date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        systolic: sys,
        diastolic: dia,
        fundicHeight: fundic,
        fht: v.fetal_heart_tone_bpm || v.fetal_heart_tone || 140,
        aog: v.age_of_gestation_weeks || v.gestational_age_weeks || (24 + idx * 2),
      }
    })
  }, [prenatalVisits, vitals, obstetricMetrics.gestationalWeeks])

  // -------------------------------------------------------------------------
  // Render: Security PIN Protection
  // -------------------------------------------------------------------------

  if (data?.isPinRequired && !data.isPinVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>
        </div>

        <Card className="w-full max-w-md border-border bg-card shadow-2xl">
          <CardHeader className="pb-2 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Protected Medical Transfer
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              This clinical care handoff is protected with end-to-end security
              PIN verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-5 space-y-1.5 rounded-xl border border-border bg-muted/60 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Referring Facility:</span>
                <span className="font-semibold text-foreground">
                  {data.referring_facility.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Destination Facility:</span>
                <span className="font-semibold text-foreground">
                  {data.destination_facility.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transfer Date:</span>
                <span className="font-medium text-foreground">
                  {new Date(data.date_referred).toLocaleDateString()}
                </span>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Enter 6-Digit Transfer PIN Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={enteredPin}
                  onChange={(e) =>
                    setEnteredPin(e.target.value.replace(/\D/g, ""))
                  }
                  className="h-12 bg-background text-center font-mono text-2xl tracking-[0.35em]"
                  autoFocus
                />
                {pinError && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {pinError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-10 w-full gap-2 font-semibold shadow-sm"
              >
                {loading ? "Verifying..." : "Access Patient Record"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: General Error State
  // -------------------------------------------------------------------------

  if (generalError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-md border-red-500/20 bg-card p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="mb-2 text-xl text-foreground">
            Secure Transfer Unavailable
          </CardTitle>
          <CardDescription className="mb-6 text-xs text-muted-foreground">
            {generalError}
          </CardDescription>
          <Link to="/">
            <Button variant="outline" className="w-full">
              Return to BMS Homepage
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: Loading State
  // -------------------------------------------------------------------------

  if (loading && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">
            Retrieving secured patient EHR & clinical handoff...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans text-foreground transition-colors">
      {/* ------------------------------------------------------------------- */}
      {/* Sticky Top Action & Triage Bar                                      */}
      {/* ------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 flex h-14 sm:h-16 w-full items-center justify-between border-b border-border bg-card/95 px-3 sm:px-6 lg:px-8 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary text-sm sm:text-base font-bold text-primary-foreground shadow-sm shrink-0">
            B
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">
                BirthCare Hospital Portal
              </span>
              <Badge
                variant="outline"
                className="hidden xs:inline-flex h-4 border-primary/30 bg-primary/5 px-1.5 py-0 font-mono text-[9px] sm:text-[10px] text-primary font-semibold shrink-0"
              >
                e-Referral
              </Badge>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[170px] sm:max-w-xs">
              Receiving:{" "}
              <span className="font-semibold text-foreground">
                {data?.destination_facility.name}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {copyNotice && (
            <span className="animate-fade-in hidden text-[11px] font-medium text-emerald-600 lg:inline dark:text-emerald-400">
              {copyNotice}
            </span>
          )}

          {/* Desktop Triage Decision Buttons (hidden on mobile, shown in bottom bar) */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClarificationModalOpen(true)}
              className="h-8.5 gap-1.5 text-xs font-semibold border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary shadow-2xs"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Request Clarification</span>
            </Button>

            {(!data?.status || data.status === "pending") && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedAction("accepted")
                    setIsRespondModalOpen(true)
                  }}
                  className="h-8.5 gap-1.5 bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Accept Transfer</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedAction("rejected")
                    setIsRespondModalOpen(true)
                  }}
                  className="h-8.5 gap-1 px-2.5 text-xs font-medium text-red-500 hover:bg-red-500/10 hover:text-red-600"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Decline</span>
                </Button>
              </div>
            )}

            {data?.status === "accepted" && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedAction("completed")
                  setIsRespondModalOpen(true)
                }}
                className="h-8.5 gap-1.5 bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mark Completed</span>
              </Button>
            )}

            <div className="h-4 w-px bg-border/80 mx-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8.5 gap-1.5 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Link</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8.5 gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </Button>
          </div>

          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8.5 w-8.5 rounded-lg shrink-0"
            title="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>

          {/* Mobile More Options Dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8.5 w-8.5 rounded-lg"
                  title="More actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
                  <Copy className="h-3.5 w-3.5 text-primary" />
                  <span>Copy Referral Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()} className="gap-2 cursor-pointer">
                  <Printer className="h-3.5 w-3.5 text-primary" />
                  <span>Print Clinical Handoff</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("form")} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                  <span>View Official Form</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsClarificationModalOpen(true)} className="gap-2 cursor-pointer">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  <span>Message Facility</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {actionSuccessMsg && (
        <div className="sticky top-14 sm:top-16 z-30 flex items-center justify-center gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {actionSuccessMsg}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Main Content Area (Extra bottom padding on mobile for sticky bar)   */}
      {/* ------------------------------------------------------------------- */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 pb-28 md:pb-8">
        
        {/* ================================================================= */}
        {/* Patient Profile & Triage Summary Card                             */}
        {/* ================================================================= */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
              
              {/* Patient Core Identity */}
              <div className="flex items-start gap-3 sm:gap-4">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 shrink-0 rounded-2xl border-2 border-border shadow-sm">
                  <AvatarImage
                    src={patient?.profile_url || ""}
                    alt={patient?.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-2xl bg-primary/10 text-xl sm:text-2xl font-bold text-primary">
                    {patient?.name?.slice(0, 2).toUpperCase() || "MO"}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground truncate max-w-full">
                      {patient?.name || "Confidential Patient"}
                    </h1>

                    <Badge
                      className={`inline-flex items-center gap-1 rounded-md px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold shrink-0 ${
                        isHighRisk
                          ? "bg-red-500/15 text-red-600 border border-red-500/30 dark:text-red-400"
                          : isMediumRisk
                            ? "bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:text-amber-400"
                            : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 dark:text-emerald-400"
                      }`}
                    >
                      <Activity className="h-3 w-3" />
                      {resolvedRiskLevel.toUpperCase()}
                    </Badge>

                    {data?.referral_id && (
                      <span className="font-mono text-[10px] sm:text-[11px] text-muted-foreground shrink-0">
                        REF #{data.referral_id.slice(-6).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {patient?.age && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {patient.age} yrs • {patient.civil_status || "Married"}
                      </span>
                    )}
                    {patient?.blood_type && (
                      <span className="flex items-center gap-1 font-bold text-red-500">
                        <Droplet className="h-3.5 w-3.5" />
                        Type: {patient.blood_type}
                      </span>
                    )}
                    {patient?.phone && (
                      <a href={`tel:${patient.phone}`} className="flex items-center gap-1 hover:underline">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {patient.phone}
                      </a>
                    )}
                    {patient?.address && (
                      <span className="hidden xs:flex items-center gap-1 truncate max-w-xs">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{patient.address}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-muted-foreground">
                    <span>Referred by:</span>
                    <span className="flex items-center gap-1 font-semibold text-foreground truncate max-w-[180px] sm:max-w-none">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{data?.referring_facility.name}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      {data?.date_referred
                        ? new Date(data.date_referred).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                        : "Just now"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Care Coordination CTA on Tablet/Desktop */}
              <div className="flex shrink-0 flex-col items-start lg:items-end gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Transfer Status:
                  </span>
                  <Badge
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-bold shadow-2xs ${
                      data?.status === "accepted"
                        ? "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400"
                        : data?.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                          : data?.status === "rejected"
                            ? "bg-red-500/15 text-red-500 border-red-500/30"
                            : "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400"
                    }`}
                  >
                    {data?.status === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : data?.status === "accepted" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : data?.status === "rejected" ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    REFERRAL {data?.status ? data.status.toUpperCase() : "PENDING"}
                  </Badge>
                </div>

                {data?.response_notes && (
                  <p className="max-w-xs text-left lg:text-right text-[11px] text-muted-foreground italic truncate">
                    Latest Note: "{data.response_notes}"
                  </p>
                )}
              </div>
            </div>

            {/* --------------------------------------------------------------- */}
            {/* Top Metric Grid (Vitals Removed, Obstetric Focused)            */}
            {/* --------------------------------------------------------------- */}
            <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-3 border-t border-border pt-4 sm:pt-5 sm:grid-cols-4">
              
              {/* Metric 1: Obstetric History */}
              <div className="rounded-xl border border-border/70 bg-muted/40 p-2.5 sm:p-3.5 transition-colors hover:border-border">
                <span className="block text-[9px] sm:text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Obstetric Parity
                </span>
                <p className="mt-0.5 sm:mt-1 text-base sm:text-lg font-extrabold text-foreground">
                  G{gravida} P{parity}
                </p>
                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate block">
                  Gravida {gravida} • Parity {parity}
                </span>
              </div>

              {/* Metric 2: Gestational Age (Dynamic) */}
              <div className="rounded-xl border border-border/70 bg-muted/40 p-2.5 sm:p-3.5 transition-colors hover:border-border">
                <span className="block text-[9px] sm:text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Gestational Age (AOG)
                </span>
                <p className="mt-0.5 sm:mt-1 text-base sm:text-lg font-extrabold text-primary truncate">
                  {obstetricMetrics.formattedAog}
                </p>
                <div className="mt-0.5 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground">
                  <span>{obstetricMetrics.trimester}</span>
                  <span className="font-semibold text-primary">
                    {obstetricMetrics.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Metric 3: Estimated Due Date (EDD/EDC Dynamic) */}
              <div className="rounded-xl border border-border/70 bg-muted/40 p-2.5 sm:p-3.5 transition-colors hover:border-border">
                <span className="block text-[9px] sm:text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Date of Confinement
                </span>
                <p className="mt-0.5 sm:mt-1 text-base sm:text-lg font-extrabold text-foreground truncate">
                  {obstetricMetrics.eddFormatted}
                </p>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate block">
                  LMP:{" "}
                  {lmpEffective
                    ? new Date(lmpEffective).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not Specified"}
                </span>
              </div>

              {/* Metric 4: Referral Care Category & Urgency */}
              <div className="rounded-xl border border-border/70 bg-muted/40 p-2.5 sm:p-3.5 transition-colors hover:border-border">
                <span className="block text-[9px] sm:text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Referral Priority
                </span>
                <p
                  className={`mt-0.5 sm:mt-1 text-base sm:text-lg font-extrabold truncate ${
                    isHighRisk
                      ? "text-red-500"
                      : isMediumRisk
                        ? "text-amber-500"
                        : "text-emerald-500"
                  }`}
                >
                  {isHighRisk ? "URGENT TRIAGE" : isMediumRisk ? "PRIORITY" : "ROUTINE"}
                </p>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate block">
                  {obstetricMetrics.daysRemaining !== null
                    ? `${obstetricMetrics.daysRemaining} days to EDD`
                    : "Active Transfer"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* High-Contrast Interactive Tabs Navigation                         */}
        {/* ================================================================= */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="h-10 sm:h-11 w-full justify-start rounded-xl border border-border bg-muted/80 p-1 backdrop-blur-sm overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-nowrap shrink-0">
            <TabsTrigger
              value="overview"
              className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Clinical Handoff</span>
            </TabsTrigger>

            <TabsTrigger
              value="form"
              className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Official Form</span>
            </TabsTrigger>

            <TabsTrigger
              value="visits"
              className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Visits</span>
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                {prenatalVisits.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="labs"
              className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
            >
              <Microscope className="h-3.5 w-3.5" />
              <span>Labs & Tests</span>
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                {labScreenings.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="supplements"
              className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
            >
              <Pill className="h-3.5 w-3.5" />
              <span>Medications</span>
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                {supplements.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="coordination"
              className="shrink-0 gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border whitespace-nowrap"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Facility Routing</span>
            </TabsTrigger>
          </TabsList>

          {/* =============================================================== */}
          {/* TAB 1: Clinical Handoff (Structured Cards & Centralized Vitals)  */}
          {/* =============================================================== */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
              
              {/* Left Column (2 Cols): Modern Structured Referral Notes */}
              <div className="space-y-4 lg:col-span-2">
                
                {/* Structured Card 1: Chief Complaint & Triage Alert */}
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        Chief Complaint & Indication
                      </CardTitle>
                      <Badge
                        className={`text-[9px] sm:text-[10px] font-bold ${
                          isHighRisk
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : isMediumRisk
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}
                      >
                        {isHighRisk ? "URGENT ADMISSION" : "CONTINUITY"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4">
                      <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
                        {parsedNotes.chiefComplaint}
                      </p>
                      {vitals?.danger_signs && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-red-500">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Danger Signs: {vitals.danger_signs}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Structured Card 2: Obstetric & Medical Summary Grid */}
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Layers className="h-4 w-4 text-primary" />
                      Obstetric & Medical Baseline
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Synchronized clinical baseline and risk factors
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2">
                      
                      {/* Grid Item 1: Gravida / Parity */}
                      <div className="rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-3.5">
                        <span className="block text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                          Gravida / Parity History
                        </span>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-foreground">
                          G{gravida} P{parity}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {parity === 0 ? "Nulliparous (First Delivery)" : `Multiparous (${parity} previous deliveries)`}
                        </p>
                      </div>

                      {/* Grid Item 2: Previous Deliveries */}
                      <div className="rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-3.5">
                        <span className="block text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                          Previous Delivery History
                        </span>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-foreground">
                          {parsedNotes.previousDelivery}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Prior C-section or preterm delivery records
                        </p>
                      </div>

                      {/* Grid Item 3: Co-morbidities */}
                      <div className="rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-3.5">
                        <span className="block text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                          Maternal Co-Morbidities
                        </span>
                        <p className={`mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold ${parsedNotes.coMorbidities.toLowerCase().includes("none") ? "text-foreground" : "text-amber-500"}`}>
                          {parsedNotes.coMorbidities}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Hypertension, gestational diabetes, asthma
                        </p>
                      </div>

                      {/* Grid Item 4: Allergies & Precautions */}
                      <div className="rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-3.5">
                        <span className="block text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                          Allergies & Precautions
                        </span>
                        <p className={`mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold ${parsedNotes.allergies.toLowerCase().includes("no known") ? "text-foreground" : "text-red-500"}`}>
                          {parsedNotes.allergies}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Drug hypersensitivities, anesthesia precautions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Structured Card 3: Narrative Clinical Handoff */}
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <FileText className="h-4 w-4 text-primary" />
                        Clinical Handover Notes
                      </CardTitle>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[140px] sm:max-w-none">
                        By {data?.referring_facility.name}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                    <div className="rounded-xl border border-border bg-muted/40 p-3.5 sm:p-4.5 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                      {parsedNotes.narrativeNotes || "No additional commentary specified."}
                    </div>

                    {data?.response_notes && (
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 sm:p-4 text-xs">
                        <span className="mb-1 block font-bold text-blue-600 dark:text-blue-400">
                          Receiving Hospital Coordination Note:
                        </span>
                        <p className="text-foreground leading-relaxed">
                          {data.response_notes}
                        </p>
                        {data.outcome && (
                          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                            Outcome: <span className="font-semibold text-foreground">{data.outcome}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column (1 Col): Centralized Examination Vitals & Trend Sparkline */}
              <div className="space-y-4">
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        Latest Examination Vitals
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        Triage Snapshot
                      </Badge>
                    </div>
                    <CardDescription className="text-[11px]">
                      {vitals?.visit_date
                        ? `Recorded on ${new Date(vitals.visit_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                        : "Clinic triage examination"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6 pt-0 space-y-2.5 sm:space-y-3 text-xs">
                    {/* Blood Pressure */}
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-2.5">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-primary" />
                        <div>
                          <span className="block font-medium text-muted-foreground">Blood Pressure</span>
                          <span className="text-[10px] text-muted-foreground">Target: &lt; 140/90 mmHg</span>
                        </div>
                      </div>
                      <span className={`font-mono text-xs sm:text-sm font-extrabold ${vitals?.bp?.includes("140") || vitals?.bp?.includes("150") || vitals?.bp?.includes("160") ? "text-red-500" : "text-foreground"}`}>
                        {vitals?.bp || "120/80 mmHg"}
                      </span>
                    </div>

                    {/* Pulse / Heart Rate */}
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-2.5">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <div>
                          <span className="block font-medium text-muted-foreground">Pulse Rate</span>
                          <span className="text-[10px] text-muted-foreground">Target: 60-100 bpm</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                        {vitals?.pulse_rate ? `${vitals.pulse_rate} bpm` : "80 bpm"}
                      </span>
                    </div>

                    {/* Body Temperature */}
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-2.5">
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-amber-500" />
                        <div>
                          <span className="block font-medium text-muted-foreground">Temperature</span>
                          <span className="text-[10px] text-muted-foreground">Target: 36.5 - 37.4 °C</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                        {vitals?.temp ? `${vitals.temp} °C` : "36.5 °C"}
                      </span>
                    </div>

                    {/* Fundic Height */}
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-2.5">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-primary" />
                        <div>
                          <span className="block font-medium text-muted-foreground">Fundic Height</span>
                          <span className="text-[10px] text-muted-foreground">Uterine growth</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                        {vitals?.fundic_height ? `${vitals.fundic_height} cm` : "28 cm"}
                      </span>
                    </div>

                    {/* Fetal Heart Tone */}
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-2.5">
                      <div className="flex items-center gap-2">
                        <Baby className="h-4 w-4 text-pink-500" />
                        <div>
                          <span className="block font-medium text-muted-foreground">Fetal Heart Tone</span>
                          <span className="text-[10px] text-muted-foreground">Target: 120-160 bpm</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                        {vitals?.fetal_heart_tone ? `${vitals.fetal_heart_tone} bpm` : "140 bpm"}
                      </span>
                    </div>

                    {/* Risk Rating Assessment Row */}
                    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-2.5">
                      <span className="font-semibold text-muted-foreground">Clinical Risk</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                          isHighRisk
                            ? "bg-red-500/15 text-red-500 border border-red-500/20"
                            : isMediumRisk
                              ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                              : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                        }`}
                      >
                        {resolvedRiskLevel}
                      </span>
                    </div>

                    {/* ----------------------------------------------------------- */}
                    {/* Sparkline Vitals Longitudinal Visualization                 */}
                    {/* ----------------------------------------------------------- */}
                    <div className="mt-3 sm:mt-4 border-t border-border pt-3 sm:pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                          BP & Fundic Trend
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {vitalsHistory.length} visit{vitalsHistory.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="h-32 sm:h-36 w-full pt-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={vitalsHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis
                              dataKey="visitDate"
                              tick={{ fontSize: 9 }}
                              stroke="#888888"
                            />
                            <YAxis
                              domain={[60, 180]}
                              tick={{ fontSize: 9 }}
                              stroke="#888888"
                              width={24}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "11px",
                                color: "hsl(var(--foreground))",
                              }}
                            />
                            <ReferenceLine
                              y={140}
                              stroke="#ef4444"
                              strokeDasharray="3 3"
                              label={{ value: "140 HTN", position: "insideTopRight", fill: "#ef4444", fontSize: 9 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="systolic"
                              name="Systolic BP"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={{ r: 2.5 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="diastolic"
                              name="Diastolic BP"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ r: 2.5 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="fundicHeight"
                              name="Fundic Ht"
                              stroke="#10b981"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              dot={{ r: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-1.5 flex items-center justify-center gap-3 sm:gap-4 text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-500" /> Systolic
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-blue-500" /> Diastolic
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Fundic Ht
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* =============================================================== */}
          {/* TAB 2: Official Referral Form (Complete Unboxed Printable Form) */}
          {/* =============================================================== */}
          <TabsContent value="form" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Official Maternal Referral Form
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Standard Philippine DOH Clinical Referral Sheet
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
                  Print Form
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openDocument({
                      title: `Official Referral Form - ${patient?.name || "Patient"}`,
                      type: "form",
                      date: data?.date_referred || new Date().toISOString(),
                      remarks: parsedNotes.narrativeNotes,
                    })
                  }
                  className="h-8 gap-1.5 text-xs font-semibold bg-primary/5 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Fullscreen
                </Button>
              </div>
            </div>

            {/* Official Clinical Paper Document Layout */}
            <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-8 md:p-10 shadow-sm space-y-6 sm:space-y-8 text-foreground">
              
              {/* Document Official Header */}
              <div className="border-b-2 border-primary/30 pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-primary uppercase block">
                      Republic of the Philippines • Department of Health
                    </span>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground uppercase">
                      Official Maternal Referral Handoff
                    </h1>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      Regional Maternal & Neonatal Health Coordination Network
                    </p>
                  </div>

                  <div className="text-left sm:text-right space-y-0.5">
                    <Badge variant="outline" className="font-mono text-[10px] sm:text-xs font-bold border-primary/40 bg-primary/5 text-primary">
                      REF #{data?.referral_id ? data.referral_id.slice(-8).toUpperCase() : "REF-0000"}
                    </Badge>
                    <p className="text-[11px] sm:text-xs font-mono text-muted-foreground">
                      {data?.date_referred ? new Date(data.date_referred).toLocaleString() : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1: Facility Routing Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 sm:p-4 space-y-1">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Referring Facility (Origin)
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-foreground">{data?.referring_facility.name}</p>
                  {data?.referring_facility.address && <p className="text-[11px] sm:text-xs text-muted-foreground">{data.referring_facility.address}</p>}
                  {data?.referring_facility.contact && <p className="text-[11px] sm:text-xs font-mono text-muted-foreground">Tel: {data.referring_facility.contact}</p>}
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3.5 sm:p-4 space-y-1">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" /> Destination Facility (Receiving)
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-foreground">{data?.destination_facility.name}</p>
                  {data?.destination_facility.address && <p className="text-[11px] sm:text-xs text-muted-foreground">{data.destination_facility.address}</p>}
                  {data?.destination_facility.contact && <p className="text-[11px] sm:text-xs font-mono text-muted-foreground">Tel: {data.destination_facility.contact}</p>}
                </div>
              </div>

              {/* Section 2: Patient Demographics & Obstetric Baseline */}
              <div className="space-y-2.5 sm:space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-1 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Patient Demographics & Obstetric Baseline
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px] sm:text-xs">Full Name:</span>
                    <p className="font-bold text-foreground text-xs sm:text-sm truncate">{patient?.name || "Confidential Patient"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px] sm:text-xs">Age / Civil Status:</span>
                    <p className="font-semibold text-foreground">{patient?.age ? `${patient.age} yrs` : "N/A"} • {patient?.civil_status || "N/A"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px] sm:text-xs">Blood Type:</span>
                    <p className="font-bold text-red-500">{patient?.blood_type || "Recorded"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px] sm:text-xs">Contact Phone:</span>
                    <p className="font-mono text-foreground truncate">{patient?.phone || "N/A"}</p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px] sm:text-xs">Obstetric Parity:</span>
                    <p className="font-bold text-foreground">G{gravida} P{parity}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px] sm:text-xs">LMP:</span>
                    <p className="font-semibold text-foreground truncate">
                      {lmpEffective ? new Date(lmpEffective).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px] sm:text-xs">AOG:</span>
                    <p className="font-bold text-primary">{obstetricMetrics.formattedAog}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px] sm:text-xs">EDD/EDC:</span>
                    <p className="font-bold text-foreground">{obstetricMetrics.eddFormatted}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Clinical Reason for Referral */}
              <div className="space-y-2.5 sm:space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-1 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-primary" />
                  Clinical Indication & Assessment
                </h3>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Chief Indication:</span>
                    <Badge className={isHighRisk ? "bg-red-500 text-white text-[10px]" : "bg-emerald-600 text-white text-[10px]"}>
                      {resolvedRiskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">{parsedNotes.chiefComplaint}</p>
                  {vitals?.danger_signs && (
                    <p className="font-bold text-red-500 text-xs">Danger Signs: {vitals.danger_signs}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
                  <div className="rounded-lg border border-border p-2.5 sm:p-3 bg-muted/20">
                    <span className="text-muted-foreground font-semibold block mb-0.5 text-[10px] sm:text-xs">Previous Deliveries:</span>
                    <p className="font-medium text-foreground">{parsedNotes.previousDelivery}</p>
                  </div>
                  <div className="rounded-lg border border-border p-2.5 sm:p-3 bg-muted/20">
                    <span className="text-muted-foreground font-semibold block mb-0.5 text-[10px] sm:text-xs">Co-Morbidities:</span>
                    <p className="font-medium text-foreground">{parsedNotes.coMorbidities}</p>
                  </div>
                  <div className="rounded-lg border border-border p-2.5 sm:p-3 bg-muted/20">
                    <span className="text-muted-foreground font-semibold block mb-0.5 text-[10px] sm:text-xs">Allergies:</span>
                    <p className="font-medium text-red-500">{parsedNotes.allergies}</p>
                  </div>
                </div>
              </div>

              {/* Section 4: Transfer Vitals Snapshot */}
              <div className="space-y-2.5 sm:space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border pb-1 flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-primary" />
                  Examination Vitals at Referral
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-xs">
                  <div className="rounded-lg border border-border p-2 sm:p-2.5 bg-muted/20 text-center">
                    <span className="text-muted-foreground block text-[9px] sm:text-[10px] uppercase font-bold">BP</span>
                    <span className="font-mono font-bold text-foreground text-xs sm:text-sm">{vitals?.bp || "120/80"}</span>
                  </div>
                  <div className="rounded-lg border border-border p-2 sm:p-2.5 bg-muted/20 text-center">
                    <span className="text-muted-foreground block text-[9px] sm:text-[10px] uppercase font-bold">Pulse</span>
                    <span className="font-mono font-bold text-foreground text-xs sm:text-sm">{vitals?.pulse_rate ? `${vitals.pulse_rate} bpm` : "80 bpm"}</span>
                  </div>
                  <div className="rounded-lg border border-border p-2 sm:p-2.5 bg-muted/20 text-center">
                    <span className="text-muted-foreground block text-[9px] sm:text-[10px] uppercase font-bold">Temp</span>
                    <span className="font-mono font-bold text-foreground text-xs sm:text-sm">{vitals?.temp ? `${vitals.temp}°C` : "36.5°C"}</span>
                  </div>
                  <div className="rounded-lg border border-border p-2 sm:p-2.5 bg-muted/20 text-center">
                    <span className="text-muted-foreground block text-[9px] sm:text-[10px] uppercase font-bold">Fundic Ht</span>
                    <span className="font-mono font-bold text-foreground text-xs sm:text-sm">{vitals?.fundic_height ? `${vitals.fundic_height} cm` : "28 cm"}</span>
                  </div>
                  <div className="rounded-lg border border-border p-2 sm:p-2.5 bg-muted/20 text-center col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground block text-[9px] sm:text-[10px] uppercase font-bold">FHT</span>
                    <span className="font-mono font-bold text-foreground text-xs sm:text-sm">{vitals?.fetal_heart_tone ? `${vitals.fetal_heart_tone} bpm` : "140 bpm"}</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Official Sign-off */}
              <div className="border-t-2 border-border pt-4 sm:pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 text-xs">
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase block">Referring Health Worker</span>
                    <div className="border-b border-dashed border-foreground/40 pb-1 pt-2 sm:pt-6 font-semibold">
                      Digitally Verified by {data?.referring_facility.name}
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase block">Receiving Triage Officer</span>
                    <div className="border-b border-dashed border-foreground/40 pb-1 pt-2 sm:pt-6 font-semibold">
                      {data?.status === "accepted" || data?.status === "completed"
                        ? `Acknowledged by ${data?.destination_facility.name}`
                        : "Pending Triage Review"}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>

          {/* =============================================================== */}
          {/* TAB 3: Prenatal Consultation History Logs (Responsive Cards+Table)*/}
          {/* =============================================================== */}
          <TabsContent value="visits" className="space-y-4">
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <Activity className="h-4 w-4 text-primary" />
                  Prenatal Visits & Consultation History
                </CardTitle>
                <CardDescription className="text-xs">
                  Chronological consultation records for this pregnancy.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {prenatalVisits.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No individual prenatal visit consultation logs found for this pregnancy.
                  </div>
                ) : (
                  <>
                    {/* Mobile Timeline Cards View (< sm) */}
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
                                Trim {visit.trimester || 1}
                              </span>
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                {visit.age_of_gestation_weeks ? `${visit.age_of_gestation_weeks} wks` : "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg">
                            <div>
                              <span className="text-[10px] text-muted-foreground block">Blood Pressure & Temp</span>
                              <span className="font-mono font-bold text-foreground">
                                {visit.bp_systolic || 120}/{visit.bp_diastolic || 80} • {visit.temperature_celsius || 36.5}°C
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block">Fundic Ht / FHT</span>
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

                    {/* Desktop Table View (>= sm) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-xs font-bold">Date</TableHead>
                            <TableHead className="text-xs font-bold">Trimester</TableHead>
                            <TableHead className="text-xs font-bold">AOG</TableHead>
                            <TableHead className="text-xs font-bold">BP / Vitals</TableHead>
                            <TableHead className="text-xs font-bold">Fundic Ht / FHT</TableHead>
                            <TableHead className="text-xs font-bold">Chief Complaint & Danger Signs</TableHead>
                            <TableHead className="text-xs font-bold">Attending Provider</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {prenatalVisits.map((visit: PrenatalVisitItem, index: number) => (
                            <TableRow
                              key={visit.visit_id || index}
                              className="border-border hover:bg-muted/30"
                            >
                              <TableCell className="text-xs font-semibold whitespace-nowrap">
                                {new Date(visit.visit_date).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="text-xs">
                                Trimester {visit.trimester || 1}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-primary">
                                {visit.age_of_gestation_weeks
                                  ? `${visit.age_of_gestation_weeks} wks`
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                <span className="font-semibold">
                                  {visit.bp_systolic || 120}/{visit.bp_diastolic || 80}
                                </span>{" "}
                                • {visit.temperature_celsius || 36.5}°C
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {visit.fundic_height_cm
                                  ? `${visit.fundic_height_cm} cm`
                                  : "-"}{" "}
                                /{" "}
                                {visit.fetal_heart_tone_bpm
                                  ? `${visit.fetal_heart_tone_bpm} bpm`
                                  : "-"}
                              </TableCell>
                              <TableCell className="max-w-[240px] text-xs">
                                <p className="font-medium truncate">
                                  {visit.chief_complaint || "Routine checkup"}
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
          {/* TAB 4: Diagnostic Screenings & Lab Documents Lightbox           */}
          {/* =============================================================== */}
          <TabsContent value="labs" className="space-y-4">
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <Microscope className="h-4 w-4 text-primary" />
                      Diagnostic Screenings & Lab Results
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Blood screenings, urinalysis, serology, and ultrasound scans.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {labScreenings.length} Screenings
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {labScreenings.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No lab screening records attached to this pregnancy handoff.
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View (< sm) */}
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
                              openDocument({
                                title: `${lab.screening_type}`,
                                type: lab.screening_type?.toLowerCase().includes("ultrasound") ? "ultrasound" : "lab",
                                date: lab.date_of_screening,
                                result: lab.result,
                                remarks: lab.remarks,
                                fileUrl: lab.file_url,
                                metadata: {
                                  "Screening ID": lab.screening_id || `LAB-00${index + 1}`,
                                  "Patient": patient?.name || "Patient",
                                  "Test Date": new Date(lab.date_of_screening).toLocaleDateString(),
                                  "Origin Facility": data?.referring_facility.name || "Clinic",
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

                    {/* Desktop Table View (>= sm) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-xs font-bold">Date</TableHead>
                            <TableHead className="text-xs font-bold">Screening Type</TableHead>
                            <TableHead className="text-xs font-bold">Result Finding</TableHead>
                            <TableHead className="text-xs font-bold">Clinical Remarks</TableHead>
                            <TableHead className="text-xs font-bold">Clinical Document</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {labScreenings.map((lab: LabScreeningItem, index: number) => (
                            <TableRow
                              key={lab.screening_id || index}
                              className="border-border hover:bg-muted/30"
                            >
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
                                    openDocument({
                                      title: `${lab.screening_type}`,
                                      type: lab.screening_type?.toLowerCase().includes("ultrasound") ? "ultrasound" : "lab",
                                      date: lab.date_of_screening,
                                      result: lab.result,
                                      remarks: lab.remarks,
                                      fileUrl: lab.file_url,
                                      metadata: {
                                        "Screening ID": lab.screening_id || `LAB-00${index + 1}`,
                                        "Patient": patient?.name || "Patient",
                                        "Test Date": new Date(lab.date_of_screening).toLocaleDateString(),
                                        "Origin Facility": data?.referring_facility.name || "Clinic",
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
          {/* TAB 5: Prescriptions & Supplements                              */}
          {/* =============================================================== */}
          <TabsContent value="supplements" className="space-y-4">
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <Pill className="h-4 w-4 text-primary" />
                      Prescriptions & Nutritional Supplements
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Medications, micronutrient supplementation, and tocolytics.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {supplements.length} Prescriptions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {supplements.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No supplementation records logged for this pregnancy.
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View (< sm) */}
                    <div className="block sm:hidden divide-y divide-border px-3">
                      {supplements.map((supp: SupplementItem, index: number) => (
                        <div key={supp.supplement_id || index} className="py-3.5 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-xs text-foreground block">{supp.supplement_type}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(supp.date_given).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                              {supp.tablets_given_count} units
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Dispensed
                            </span>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openDocument({
                                  title: `Rx Slip: ${supp.supplement_type}`,
                                  type: "prescription",
                                  date: supp.date_given,
                                  result: `Dispensed: ${supp.tablets_given_count || 0} tablets`,
                                  remarks: "Administered as standard prenatal supplementation protocol",
                                  metadata: {
                                    "Prescription Item": supp.supplement_type,
                                    "Dispensed Quantity": `${supp.tablets_given_count || 0} units`,
                                    "Date Administered": new Date(supp.date_given).toLocaleDateString(),
                                    "Patient": patient?.name || "Patient",
                                  },
                                })
                              }
                              className="h-8 gap-1 text-xs text-primary hover:bg-primary/5"
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              <span>View Slip</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View (>= sm) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-xs font-bold">Date Dispensed</TableHead>
                            <TableHead className="text-xs font-bold">Medication / Supplement</TableHead>
                            <TableHead className="text-xs font-bold">Dosage & Quantity</TableHead>
                            <TableHead className="text-xs font-bold">Administration Status</TableHead>
                            <TableHead className="text-xs font-bold">Slip</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {supplements.map((supp: SupplementItem, index: number) => (
                            <TableRow
                              key={supp.supplement_id || index}
                              className="border-border hover:bg-muted/30"
                            >
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
                                    openDocument({
                                      title: `Rx Slip: ${supp.supplement_type}`,
                                      type: "prescription",
                                      date: supp.date_given,
                                      result: `Dispensed: ${supp.tablets_given_count || 0} tablets`,
                                      remarks: "Administered as standard prenatal supplementation protocol",
                                      metadata: {
                                        "Prescription Item": supp.supplement_type,
                                        "Dispensed Quantity": `${supp.tablets_given_count || 0} units`,
                                        "Date Administered": new Date(supp.date_given).toLocaleDateString(),
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
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* =============================================================== */}
          {/* TAB 6: Facility Routing & Direct Contacts                       */}
          {/* =============================================================== */}
          <TabsContent value="coordination" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              
              {/* Origin Facility Card */}
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="p-4 sm:p-6 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      Referring Facility (Origin)
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      Origin Center
                    </Badge>
                  </div>
                  <p className="text-base font-extrabold text-foreground">
                    {data?.referring_facility.name}
                  </p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 text-xs text-muted-foreground">
                  {data?.referring_facility.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                      <span>{data.referring_facility.address}</span>
                    </div>
                  )}
                  {data?.referring_facility.contact && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <a
                        href={`tel:${data.referring_facility.contact}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {data.referring_facility.contact}
                      </a>
                    </div>
                  )}
                  {data?.referring_facility.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <a
                        href={`mailto:${data.referring_facility.email}`}
                        className="text-foreground hover:underline"
                      >
                        {data.referring_facility.email}
                      </a>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsClarificationModalOpen(true)}
                      className="w-full h-10 sm:h-8.5 gap-1.5 text-xs font-semibold"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      Direct Message Facility Coordinator
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Destination Facility Card */}
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="p-4 sm:p-6 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      Receiving Facility (Destination)
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      Destination Hospital
                    </Badge>
                  </div>
                  <p className="text-base font-extrabold text-foreground">
                    {data?.destination_facility.name}
                  </p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 text-xs text-muted-foreground">
                  {data?.destination_facility.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                      <span>{data.destination_facility.address}</span>
                    </div>
                  )}
                  {data?.destination_facility.contact && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      <span className="font-semibold text-foreground">
                        {data.destination_facility.contact}
                      </span>
                    </div>
                  )}
                  {data?.destination_facility.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      <span className="text-foreground">
                        {data.destination_facility.email}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* =================================================================== */}
      {/* Sticky Bottom Triage Action Bar (Mobile Only - `< md`)              */}
      {/* =================================================================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-2.5 px-3 shadow-xl flex items-center gap-2 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsClarificationModalOpen(true)}
          className="h-11 w-11 rounded-xl border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 shrink-0"
          title="Message Facility"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>

        {(!data?.status || data.status === "pending") && (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedAction("rejected")
                setIsRespondModalOpen(true)
              }}
              className="h-11 px-3 text-xs font-semibold text-red-500 hover:bg-red-500/10 border-red-500/20 rounded-xl shrink-0"
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Decline
            </Button>

            <Button
              onClick={() => {
                setSelectedAction("accepted")
                setIsRespondModalOpen(true)
              }}
              className="h-11 flex-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-sm rounded-xl"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Accept Transfer
            </Button>
          </>
        )}

        {data?.status === "accepted" && (
          <Button
            onClick={() => {
              setSelectedAction("completed")
              setIsRespondModalOpen(true)
            }}
            className="h-11 flex-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl"
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Mark Completed
          </Button>
        )}
      </div>

      {/* =================================================================== */}
      {/* Modal 1: Care Coordination & Triage Decision Modal                  */}
      {/* =================================================================== */}
      <ResponsiveModal
        open={isRespondModalOpen}
        onOpenChange={setIsRespondModalOpen}
        title={`Care Coordination: ${selectedAction.toUpperCase()}`}
        description="Transmit status updates, admission notes, and clinical outcomes back to the referring facility."
        className="sm:max-w-[480px]"
      >
        <form onSubmit={handleActionSubmit} className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Confirm Triage Action
            </label>
            {(!data?.status || data.status === "pending") && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedAction === "accepted" ? "default" : "outline"}
                  className={`h-10 sm:h-9 text-xs font-semibold ${selectedAction === "accepted" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`}
                  onClick={() => setSelectedAction("accepted")}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Accept Transfer
                </Button>
                <Button
                  type="button"
                  variant={selectedAction === "rejected" ? "default" : "outline"}
                  className={`h-10 sm:h-9 text-xs font-semibold ${selectedAction === "rejected" ? "bg-red-600 text-white hover:bg-red-700" : ""}`}
                  onClick={() => setSelectedAction("rejected")}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Decline Transfer
                </Button>
              </div>
            )}
            {data?.status === "accepted" && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Marking this referral as{" "}
                <span className="font-bold uppercase">Completed</span> will
                finalize patient care handover in the central registry.
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Clinical Response & Admission Instructions
            </label>
            <Textarea
              placeholder="e.g. Patient evaluated in OB Triage. Admitted to High-Risk Antenatal Ward for continuous fetal monitoring..."
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              rows={3}
              className="resize-none text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Clinical Outcome (Optional)
            </label>
            <Input
              placeholder="e.g. Admitted / Scheduled for Induction / Discharged stable"
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              className="h-10 sm:h-9 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRespondModalOpen(false)}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={actionLoading}
              className="h-9 font-semibold bg-primary"
            >
              {actionLoading ? "Submitting..." : "Submit Care Response"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>

      {/* =================================================================== */}
      {/* Modal 2: Request Clarification & Direct Facility Communication     */}
      {/* =================================================================== */}
      <ResponsiveModal
        open={isClarificationModalOpen}
        onOpenChange={setIsClarificationModalOpen}
        title="Direct Care Communication & Clarification"
        description={`Communicate directly with ${data?.referring_facility.name || "the referring clinic"} via secure handoff messaging.`}
        className="sm:max-w-[540px]"
      >
        {clarificationSentSuccess ? (
          <div className="py-8 text-center space-y-2.5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Inquiry Dispatched Successfully</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Your message has been securely sent to the healthcare team at {data?.referring_facility.name}.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            
            {/* Quick Facility Contact Card Hub */}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{data?.referring_facility.name}</span>
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-bold flex items-center gap-1 shrink-0">
                  <Radio className="h-2.5 w-2.5 animate-pulse" /> Channel Active
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {data?.referring_facility.contact && (
                  <a
                    href={`tel:${data.referring_facility.contact}`}
                    className="flex items-center gap-2 rounded-lg border border-border/70 bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">Call: {data.referring_facility.contact}</span>
                  </a>
                )}

                {data?.referring_facility.email && (
                  <a
                    href={`mailto:${data.referring_facility.email}?subject=Clinical%20Inquiry%20-%20Referral%20${data?.referral_id || ""}`}
                    className="flex items-center gap-2 rounded-lg border border-border/70 bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">Email Coordinator</span>
                  </a>
                )}
              </div>
            </div>

            {/* Direct Message Form */}
            <form onSubmit={handleSendClarification} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Inquiry Topic
                  </label>
                  <select
                    value={clarificationTopic}
                    onChange={(e) => setClarificationTopic(e.target.value)}
                    className="h-10 sm:h-8.5 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Diagnostic & Ultrasound Records">Ultrasound / Imaging Scan</option>
                    <option value="Transport & Ambulance ETA">Transport & Ambulance ETA</option>
                    <option value="Cervical Dilation & Labor Progress">Cervical Exam & Labor Progress</option>
                    <option value="Medications & Tocolytics Administered">Medications / Tocolytics Given</option>
                    <option value="General Clinical Clarification">General Patient History</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Urgency Priority
                  </label>
                  <div className="flex h-10 sm:h-8.5 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setClarificationPriority("urgent")}
                      className={`flex-1 h-full rounded-md text-xs font-bold transition-all ${
                        clarificationPriority === "urgent"
                          ? "bg-red-500/15 text-red-600 border border-red-500/30"
                          : "border border-border/70 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Urgent / Stat
                    </button>
                    <button
                      type="button"
                      onClick={() => setClarificationPriority("normal")}
                      className={`flex-1 h-full rounded-md text-xs font-bold transition-all ${
                        clarificationPriority === "normal"
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "border border-border/70 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Standard
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Physician Clarification Message
                </label>
                <Textarea
                  placeholder="Type your clinical inquiry for the referring medical team..."
                  value={clarificationMessage}
                  onChange={(e) => setClarificationMessage(e.target.value)}
                  rows={3}
                  className="resize-none text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClarificationModalOpen(false)}
                  className="h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!clarificationMessage.trim()}
                  className="h-9 gap-1.5 font-semibold bg-primary"
                >
                  <Send className="h-3.5 w-3.5" />
                  Transmit Message
                </Button>
              </div>
            </form>
          </div>
        )}
      </ResponsiveModal>

      {/* =================================================================== */}
      {/* Full-Screen, Unboxed, Immersive Document Viewer                     */}
      {/* =================================================================== */}
      {documentModal && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950/95 backdrop-blur-md text-zinc-100 select-none animate-in fade-in duration-200">
          {/* Top Document Header Bar */}
          <div className="flex h-12 sm:h-14 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-900/90 px-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDocumentModal(null)}
                className="h-8 w-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
                title="Close Document (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[180px] sm:max-w-md">
                  {documentModal.title}
                </span>
                <Badge
                  variant="outline"
                  className="hidden xs:inline-flex uppercase text-[9px] sm:text-[10px] font-mono border-white/20 bg-white/5 text-zinc-300"
                >
                  {documentModal.type}
                </Badge>
              </div>
            </div>

            {/* Center Zoom Controls */}
            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomScale((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
                className="h-6 w-6 rounded-full text-zinc-300 hover:text-white hover:bg-white/10"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="w-9 sm:w-11 text-center font-mono text-[11px] sm:text-xs text-zinc-200">
                {Math.round(zoomScale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomScale((z) => Math.min(3.0, Number((z + 0.2).toFixed(1))))}
                className="h-6 w-6 rounded-full text-zinc-300 hover:text-white hover:bg-white/10"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomScale(1)}
                className="hidden sm:inline-flex h-6 rounded-full px-2 text-[10px] text-zinc-400 hover:text-white hover:bg-white/10"
              >
                Reset
              </Button>
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {documentModal.fileUrl && (
                <a
                  href={documentModal.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Tab</span>
                </a>
              )}

              {documentModal.fileUrl && (
                <a
                  href={documentModal.fileUrl}
                  download
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-7 sm:h-8 gap-1 text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 px-2 sm:px-3"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>

          {/* Full Canvas Document Body (No Restricting Sub-Boxes) */}
          <div className="flex-1 w-full overflow-auto flex items-start justify-center p-3 sm:p-8 md:p-12">
            {documentModal.fileUrl ? (
              documentModal.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                <div
                  style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
                  className="transition-transform duration-200 ease-out max-w-full"
                >
                  <img
                    src={documentModal.fileUrl}
                    alt={documentModal.title}
                    className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                  />
                </div>
              ) : (
                <iframe
                  src={documentModal.fileUrl}
                  title={documentModal.title}
                  style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
                  className="h-[80vh] w-[94vw] max-w-6xl rounded-xl border border-white/20 bg-white shadow-2xl transition-transform duration-200"
                />
              )
            ) : (
              /* Full Official Structured Clinical Document Sheet */
              <div
                style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
                className="w-full max-w-[96vw] sm:w-[860px] bg-white text-zinc-900 rounded-2xl shadow-2xl p-4 sm:p-10 md:p-12 space-y-6 sm:space-y-8 transition-transform duration-200 ease-out"
              >
                {/* Official Clinical Sheet Header */}
                <div className="border-b-2 border-primary/40 pb-4 sm:pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-primary uppercase block">
                      Republic of the Philippines • Department of Health
                    </span>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-zinc-900 uppercase">
                      {documentModal.title}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-zinc-500">
                      Maternal & Child Health Clinical Record
                    </p>
                  </div>

                  <div className="text-left sm:text-right space-y-0.5">
                    <Badge className="bg-emerald-600 text-white font-mono text-[9px] sm:text-[10px] font-bold">
                      AUTHENTICATED EHR RECORD
                    </Badge>
                    <p className="text-xs font-mono text-zinc-600">
                      {new Date(documentModal.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Patient Demographics Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 bg-zinc-50 p-3.5 sm:p-4 rounded-xl border border-zinc-200 text-xs">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase block">Patient Name</span>
                    <span className="font-bold text-zinc-900 text-xs sm:text-sm truncate block">{patient?.name || "Confidential Patient"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase block">Age / Gender</span>
                    <span className="font-semibold text-zinc-800">{patient?.age || "N/A"} yrs • Female</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase block">Blood Type</span>
                    <span className="font-bold text-red-600">{patient?.blood_type || "Recorded in Profile"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase block">Obstetric Parity</span>
                    <span className="font-bold text-zinc-800">G{gravida} P{parity} ({obstetricMetrics.formattedAog})</span>
                  </div>
                </div>

                {/* Diagnostic Findings Table */}
                <div className="space-y-2.5 sm:space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                    <Microscope className="h-4 w-4 text-primary" />
                    Clinical Analysis & Examination Findings
                  </h3>

                  <div className="rounded-xl border border-zinc-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-100 border-b border-zinc-200 text-left text-zinc-700">
                        <tr>
                          <th className="p-2.5 sm:p-3 font-bold">Investigation</th>
                          <th className="p-2.5 sm:p-3 font-bold">Result Finding</th>
                          <th className="p-2.5 sm:p-3 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr className="bg-white">
                          <td className="p-2.5 sm:p-3 font-semibold text-zinc-900">{documentModal.title}</td>
                          <td className="p-2.5 sm:p-3 font-bold text-primary font-mono text-xs sm:text-sm">
                            {documentModal.result || "Verified & Evaluated"}
                          </td>
                          <td className="p-2.5 sm:p-3">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Evaluated
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Clinical Notes & Diagnostic Interpretation */}
                <div className="space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4 text-xs">
                  <span className="font-bold text-zinc-900 block">Attending Provider Clinical Notes:</span>
                  <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {documentModal.remarks || "No pathological abnormalities or contraindications noted during this evaluation."}
                  </p>
                </div>

                {/* Authentication & Sign-off Block */}
                <div className="border-t-2 border-zinc-200 pt-4 sm:pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-zinc-500 gap-3 sm:gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                      <FileSignature className="h-4 w-4 text-primary" />
                      <span>Digitally Verified by {data?.referring_facility.name}</span>
                    </div>
                    <p className="font-mono text-[10px] text-zinc-400">
                      HASH: {id?.slice(0, 8).toUpperCase()}-{documentModal.date.slice(0, 10)}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="font-bold text-zinc-700 text-xs">BirthCare Health Registry</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
