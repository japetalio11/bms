import React, { useState, useEffect, useMemo } from "react"
import { useParams, useSearchParams, Link } from "react-router-dom"
import { apiClient } from "@/lib/apiClient"
import { useTheme } from "@/components/theme-provider"
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Calendar,
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
  ChevronRight,
  Sun,
  Moon,
  Baby,
  Droplet,
  FileSpreadsheet,
  Check,
  XCircle,
  Sparkles,
  ExternalLink,
  Pill,
  Microscope,
  Stethoscope,
  RefreshCw,
  Share2,
  Copy,
  Eye,
  Download,
  AlertCircle,
  FileCheck,
  Info,
  Layers,
  ChevronDown,
} from "lucide-react"
import {
  extractRiskLevel,
  getRiskVariant,
  getRiskLabel,
  getRiskBadgeClasses,
} from "@/lib/riskUtils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface SharedJourneyResponse {
  isPinRequired: boolean
  isPinVerified: boolean
  pinError?: string | null
  patient_preview?: {
    initials: string
    facility_name: string
    created_at: string
  }
  patient?: {
    mother_id: string
    user_id?: string
    name: string
    first_name?: string
    middle_name?: string
    last_name?: string
    birth_date?: string
    age?: number
    blood_type?: string
    civil_status?: string
    phone_number?: string
    email?: string
    address?: string
    profile_url?: string
    family_serial_no?: string
    primary_facility?: {
      facility_id: string
      facility_name: string
      address?: string
      contact_number?: string
      email?: string
      type?: string
    } | null
  }
  current_pregnancy?: {
    pregnancy_id: string
    date_of_registration: string
    lmp_date: string
    edd?: string | null
    gestational_age_weeks?: number
    gravida?: number
    parity?: number
    pregnancy_status?: string
    previous_delivery_history?: string
    co_morbidities?: string
    age_group?: string
    bmi_category?: string
    deworming_given?: boolean
    deworming_date?: string
    latest_vitals?: {
      visit_date: string
      gestational_age_weeks?: number
      bp?: string
      bp_systolic?: number
      bp_diastolic?: number
      pulse_rate?: number
      temp?: number
      weight_kg?: number
      fundic_height?: number
      fetal_heart_tone?: number
      risk_level?: string
      danger_signs?: string
      chief_complaint?: string
    } | null
  } | null
  all_pregnancies?: any[]
  prenatal_visits?: any[]
  lab_screenings?: any[]
  supplements?: any[]
  delivery_outcomes?: any[]
  referrals?: any[]
  share_metadata?: {
    share_id: string
    created_at: string
    last_accessed_at: string
    access_count: number
  }
}

export function PublicSharedJourneyPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const pinFromUrl = searchParams.get("pin") || ""

  const { theme, setTheme } = useTheme()
  const [enteredPin, setEnteredPin] = useState(pinFromUrl)
  const [data, setData] = useState<SharedJourneyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [pinError, setPinError] = useState("")
  const [generalError, setGeneralError] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null)
  const [selectedMediaTitle, setSelectedMediaTitle] = useState<string>("")
  const [copyNotice, setCopyNotice] = useState("")

  const fetchSharedJourney = async (pinToUse?: string) => {
    if (!token) return
    setLoading(true)
    setPinError("")
    setGeneralError("")

    const pinParam = pinToUse !== undefined ? pinToUse : enteredPin
    console.log(
      `[SharedJourney] 🔍 Fetching shared journey: token=${token}, pin=${pinParam || "(none)"}`
    )
    console.log(
      `[SharedJourney] 🌐 Endpoint target: ${apiClient.defaults.baseURL}/api/v1/mother/shared/${token}`
    )

    try {
      const res = await apiClient.get(`/api/v1/mother/shared/${token}`, {
        params: pinParam ? { pin: pinParam } : undefined,
      })

      console.log(`[SharedJourney] ✅ Response status: ${res.status}`, res.data)
      const result: SharedJourneyResponse = res.data?.data || res.data
      setData(result)

      if (result.isPinRequired && !result.isPinVerified && pinParam) {
        const errMsg =
          result.pinError ||
          "Invalid 6-digit security PIN. Please request the current code from the mother."
        console.warn(`[SharedJourney] ⚠️ PIN verification rejected: ${errMsg}`)
        setPinError(errMsg)
      } else if (result.isPinVerified) {
        console.log(
          `[SharedJourney] 🎉 PIN Verified! Patient: ${result.patient?.name}`
        )
      }
    } catch (err: any) {
      console.error("[SharedJourney] ❌ Request failed:", {
        message: err.message,
        name: err.name,
        code: err.code,
        status: err.response?.status,
        responseData: err.response?.data,
        config: err.config,
      })

      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        console.warn("[SharedJourney] ⚠️ Request was canceled by browser.")
        setPinError("Request was canceled by the browser. Please try again.")
        return
      }

      if (err.response?.status === 404) {
        setGeneralError(
          "This pregnancy record link is invalid, deactivated, or has expired."
        )
      } else {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to load shared pregnancy record. Please check connection."
        setPinError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSharedJourney(pinFromUrl)
  }, [token])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const cleanPin = enteredPin.trim()
    console.log(`[SharedJourney] 🚀 PIN submit triggered: "${cleanPin}"`)

    if (!cleanPin || cleanPin.length !== 6) {
      setPinError(
        "Please enter the complete 6-digit PIN code displayed on the mother's screen."
      )
      return
    }

    await fetchSharedJourney(cleanPin)

    try {
      setSearchParams({ pin: cleanPin }, { replace: true })
    } catch (e) {}
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopyNotice("Link copied to clipboard!")
    setTimeout(() => setCopyNotice(""), 3000)
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const patient = data?.patient
  const currentPregnancy = data?.current_pregnancy
  const latestVitals = currentPregnancy?.latest_vitals
  const prenatalVisits = data?.prenatal_visits || []
  const labScreenings = data?.lab_screenings || []
  const supplements = data?.supplements || []
  const deliveryOutcomes = data?.delivery_outcomes || []
  const allPregnancies = data?.all_pregnancies || []

  const resolvedRiskLevel = useMemo(() => {
    if (!patient) return "Low Risk"
    const risk =
      extractRiskLevel(patient, allPregnancies, prenatalVisits) ||
      latestVitals?.risk_level ||
      "Low Risk"
    return risk
  }, [patient, allPregnancies, prenatalVisits, latestVitals])

  const riskLower = (resolvedRiskLevel || "").toLowerCase()
  const isHighRisk = riskLower.includes("high")
  const isMediumRisk =
    riskLower.includes("med") || riskLower.includes("moderate")

  const riskBadgeClass = isHighRisk
    ? "bg-red-500/10 text-red-500 border border-red-500/20"
    : isMediumRisk
      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
      : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"

  const gestationalWeeks =
    currentPregnancy?.gestational_age_weeks ||
    latestVitals?.gestational_age_weeks ||
    0
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((gestationalWeeks / 40) * 100))
  )

  const getTrimester = (weeks: number) => {
    if (weeks === 0) return "Pre-natal"
    if (weeks <= 12) return "1st Trimester"
    if (weeks <= 27) return "2nd Trimester"
    return "3rd Trimester"
  }

  const openMediaViewer = (url: string, title: string) => {
    setSelectedMediaUrl(url)
    setSelectedMediaTitle(title)
  }

  if (data?.isPinRequired && !data.isPinVerified) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground selection:bg-primary/20">
        <div className="absolute top-4 right-4 flex items-center gap-2">
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
              <Lock className="h-7 w-7 animate-pulse text-primary" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Secure Medical Record
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              This patient pregnancy journey and electronic health record is
              encrypted and PIN protected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {data.patient_preview && (
              <div className="space-y-1.5 rounded-xl border border-border bg-muted/60 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-semibold text-foreground">
                    {data.patient_preview.initials}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Facility of Record:
                  </span>
                  <span className="font-semibold text-foreground">
                    {data.patient_preview.facility_name}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-center text-xs font-semibold text-foreground">
                  Enter 6-Digit Access PIN
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value.replace(/\D/g, ""))
                    if (pinError) setPinError("")
                  }}
                  className="h-12 bg-background text-center font-mono text-xl tracking-[0.2em] sm:text-2xl sm:tracking-[0.35em]"
                  autoFocus
                />
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                  Ask the mother to read or show the 6-digit code on her mobile
                  app profile.
                </p>
                {pinError && (
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {pinError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || enteredPin.length !== 6}
                className="h-10 w-full gap-2 font-semibold shadow-sm"
              >
                {loading ? "Verifying PIN..." : "Unlock Medical Journey"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (generalError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-md border-red-500/20 bg-card p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="mb-2 text-xl text-foreground">
            Record Unavailable
          </CardTitle>
          <CardDescription className="mb-6 text-xs text-muted-foreground">
            {generalError}
          </CardDescription>
          <Link to="/">
            <Button variant="outline" className="w-full">
              Return to BMS Home
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">
            Retrieving secured patient EHR & clinical journey...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 px-3 backdrop-blur-md sm:px-6 lg:px-8 print:hidden">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm">
            B
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="truncate text-xs sm:text-sm font-bold tracking-tight text-foreground">
                BirthCare Network
              </span>
              <Badge
                variant="outline"
                className="hidden xs:flex h-4 items-center gap-1 border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0 font-mono text-[10px] text-emerald-600 dark:text-emerald-400"
              >
                <ShieldCheck className="h-3 w-3" />
                Verified Passport
              </Badge>
            </div>
            <p className="truncate text-[10px] sm:text-[11px] text-muted-foreground">
              Primary Clinic:{" "}
              <span className="font-semibold text-foreground">
                {patient?.primary_facility?.facility_name ||
                  "Community Health Center"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {copyNotice && (
            <span className="animate-fade-in hidden text-[11px] font-medium text-emerald-600 sm:inline dark:text-emerald-400">
              {copyNotice}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 gap-1.5 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share Link</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print Medical Chart</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg"
            title="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Avatar className="h-16 w-16 sm:h-24 sm:w-24 shrink-0 rounded-2xl border-2 border-border shadow-sm">
                <AvatarImage
                  src={patient?.profile_url || ""}
                  alt={patient?.name}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-xl sm:text-2xl font-bold text-primary">
                  {patient?.name?.slice(0, 2).toUpperCase() || "MO"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">
                    {patient?.name || "Patient Record"}
                  </h1>

                  <Badge
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${riskBadgeClass}`}
                  >
                    <Activity className="h-3 w-3" />
                    {resolvedRiskLevel.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {patient?.age && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {patient.age} yrs old • {patient.civil_status || "Single"}
                    </span>
                  )}
                  {patient?.blood_type && (
                    <span className="flex items-center gap-1 font-semibold text-red-500">
                      <Droplet className="h-3.5 w-3.5" />
                      Blood Type: {patient.blood_type}
                    </span>
                  )}
                  {patient?.phone_number && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {patient.phone_number}
                    </span>
                  )}
                  {patient?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {patient.address}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <span>Registered Facility:</span>
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    {patient?.primary_facility?.facility_name ||
                      "Community Health Center"}
                  </span>
                  {patient?.family_serial_no && (
                    <>
                      <span>•</span>
                      <span>
                        Family Serial:{" "}
                        <strong className="font-mono text-foreground">
                          {patient.family_serial_no}
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end w-full lg:w-auto">
              <div className="space-y-1 rounded-xl border border-border bg-muted/50 p-3.5 text-left lg:text-right w-full lg:w-auto">
                <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Current Pregnancy Stage
                </span>
                <p className="text-base font-bold text-primary">
                  {gestationalWeeks > 0
                    ? `${gestationalWeeks} Weeks (${getTrimester(gestationalWeeks)})`
                    : "Active Pregnancy"}
                </p>
                <div className="h-1.5 w-full max-w-full sm:w-48 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="block text-[10px] text-muted-foreground">
                  {progressPercent}% Gestational Progress
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-border pt-4 sm:grid-cols-4 sm:gap-3 sm:pt-5">
            <div className="rounded-xl border border-border/50 bg-muted/40 p-2.5 sm:p-3">
              <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Obstetric History
              </span>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-foreground">
                G{currentPregnancy?.gravida ?? 1} P
                {currentPregnancy?.parity ?? 0}
              </p>
              <span className="text-[11px] text-muted-foreground">
                Gravida / Parity
              </span>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/40 p-2.5 sm:p-3">
              <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Est. Due Date (EDD)
              </span>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-foreground">
                {currentPregnancy?.edd
                  ? new Date(currentPregnancy.edd).toLocaleDateString()
                  : "Pending Scan"}
              </p>
              <span className="text-[11px] text-muted-foreground">
                LMP:{" "}
                {currentPregnancy?.lmp_date
                  ? new Date(currentPregnancy.lmp_date).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/40 p-2.5 sm:p-3">
              <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Latest Blood Pressure
              </span>
              <p className="mt-0.5 font-mono text-sm sm:text-base font-bold text-foreground">
                {latestVitals?.bp || "120/80"}
              </p>
              <span className="text-[11px] text-muted-foreground">
                PR: {latestVitals?.pulse_rate || 80} bpm • Temp:{" "}
                {latestVitals?.temp || 36.5}°C
              </span>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/40 p-2.5 sm:p-3">
              <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Clinical Consultations
              </span>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-foreground">
                {prenatalVisits.length} Checkups
              </p>
              <span className="text-[11px] text-muted-foreground">
                {labScreenings.length} Lab Scans • {supplements.length} Rx
              </span>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="flex h-auto w-full max-w-full overflow-x-auto whitespace-nowrap scrollbar-none gap-1 rounded-xl border border-border bg-muted/70 p-1 print:hidden flex-nowrap sm:flex-wrap">
            <TabsTrigger
              value="overview"
              className="shrink-0 gap-1.5 rounded-lg text-xs font-semibold"
            >
              <FileText className="h-3.5 w-3.5" />
              Journey Overview
            </TabsTrigger>
            <TabsTrigger
              value="vitals"
              className="shrink-0 gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Heart className="h-3.5 w-3.5" />
              Vitals & Trends
            </TabsTrigger>
            <TabsTrigger
              value="visits"
              className="shrink-0 gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Activity className="h-3.5 w-3.5" />
              Checkups ({prenatalVisits.length})
            </TabsTrigger>
            <TabsTrigger
              value="labs"
              className="shrink-0 gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Microscope className="h-3.5 w-3.5" />
              Diagnostics & Scans ({labScreenings.length})
            </TabsTrigger>
            <TabsTrigger
              value="supplements"
              className="shrink-0 gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Pill className="h-3.5 w-3.5" />
              Prescriptions ({supplements.length})
            </TabsTrigger>
            {deliveryOutcomes.length > 0 && (
              <TabsTrigger
                value="deliveries"
                className="shrink-0 gap-1.5 rounded-lg text-xs font-semibold"
              >
                <Baby className="h-3.5 w-3.5" />
                Past Deliveries ({deliveryOutcomes.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="border-border bg-card shadow-sm lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Pregnancy Journey Timeline & Clinical Notes
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Synthesized care continuum recorded across healthcare
                    facilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div
                      className={`rounded-xl border p-3.5 ${gestationalWeeks >= 1 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          1st Trimester
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          Weeks 1 - 12
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Registration, baseline labs, initial vitals, ultrasound
                        dating.
                      </p>
                      {gestationalWeeks > 12 && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </div>
                      )}
                    </div>

                    <div
                      className={`rounded-xl border p-3.5 ${gestationalWeeks > 12 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          2nd Trimester
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          Weeks 13 - 27
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Fundic height monitoring, fetal heart tone, OGTT,
                        anomaly scans.
                      </p>
                      {gestationalWeeks > 27 && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </div>
                      )}
                    </div>

                    <div
                      className={`rounded-xl border p-3.5 ${gestationalWeeks > 27 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          3rd Trimester
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          Weeks 28 - 40+
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Birth preparedness, presentation check, frequent vitals
                        & delivery triage.
                      </p>
                      {gestationalWeeks >= 37 && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-primary">
                          <Baby className="h-3 w-3" /> Full Term
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                    <span className="block text-xs font-bold text-foreground">
                      Clinical History & Co-morbidities
                    </span>
                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <span className="block text-[11px] text-muted-foreground">
                          Co-morbidities / Risk Factors:
                        </span>
                        <span className="font-medium text-foreground">
                          {currentPregnancy?.co_morbidities ||
                            "None recorded (Unremarkable)"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-muted-foreground">
                          Previous Delivery Notes:
                        </span>
                        <span className="font-medium text-foreground">
                          {currentPregnancy?.previous_delivery_history ||
                            "No previous complications noted"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-muted-foreground">
                          Deworming Dose Given:
                        </span>
                        <span className="font-medium text-foreground">
                          {currentPregnancy?.deworming_given
                            ? `Yes (${new Date(currentPregnancy.deworming_date || "").toLocaleDateString()})`
                            : "Not yet administered"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-muted-foreground">
                          BMI Category:
                        </span>
                        <span className="font-medium text-foreground">
                          {currentPregnancy?.bmi_category || "Normal"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Latest Triage Snapshot
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {latestVitals?.visit_date
                      ? `Recorded on ${new Date(latestVitals.visit_date).toLocaleDateString()}`
                      : "Latest vital metrics"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                    <span className="text-muted-foreground">
                      Blood Pressure
                    </span>
                    <span className="font-mono text-sm font-bold text-foreground">
                      {latestVitals?.bp || "120/80"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                    <span className="text-muted-foreground">
                      Pulse / Heart Rate
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      {latestVitals?.pulse_rate
                        ? `${latestVitals.pulse_rate} bpm`
                        : "80 bpm"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                    <span className="text-muted-foreground">Temperature</span>
                    <span className="font-mono font-medium text-foreground">
                      {latestVitals?.temp
                        ? `${latestVitals.temp} °C`
                        : "36.5 °C"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                    <span className="text-muted-foreground">Weight</span>
                    <span className="font-mono font-medium text-foreground">
                      {latestVitals?.weight_kg
                        ? `${latestVitals.weight_kg} kg`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                    <span className="text-muted-foreground">Fundic Height</span>
                    <span className="font-mono font-medium text-foreground">
                      {latestVitals?.fundic_height
                        ? `${latestVitals.fundic_height} cm`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 py-1.5">
                    <span className="text-muted-foreground">
                      Fetal Heart Tone
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      {latestVitals?.fetal_heart_tone
                        ? `${latestVitals.fetal_heart_tone} bpm`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">
                      Risk Assessment
                    </span>
                    <span
                      className={`font-semibold ${isHighRisk ? "font-bold text-red-500" : isMediumRisk ? "font-bold text-amber-500" : "text-emerald-500"}`}
                    >
                      {resolvedRiskLevel}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vitals" className="space-y-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Heart className="h-4 w-4 text-primary" />
                  Longitudinal Vitals Track Record
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical measurements recorded at each prenatal clinic visit
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {prenatalVisits.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    No longitudinal vitals records found for this patient.
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto scrollbar-thin">
                    <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs font-semibold">
                          Visit Date
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          AOG
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Blood Pressure
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Heart Rate
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Temp
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Weight
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Fundic Ht / FHT
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Assessed Risk
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prenatalVisits.map((v: any, idx: number) => (
                        <TableRow
                          key={v.visit_id || idx}
                          className="border-border"
                        >
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {new Date(v.visit_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            {v.age_of_gestation_weeks
                              ? `${v.age_of_gestation_weeks} wks`
                              : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold">
                            {v.bp_systolic}/{v.bp_diastolic}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {v.pulse_rate_bpm ? `${v.pulse_rate_bpm} bpm` : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {v.temperature_celsius
                              ? `${v.temperature_celsius}°C`
                              : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {v.weight_kg ? `${v.weight_kg} kg` : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {v.fundic_height_cm
                              ? `${v.fundic_height_cm} cm`
                              : "-"}{" "}
                            /{" "}
                            {v.fetal_heart_tone_bpm
                              ? `${v.fetal_heart_tone_bpm} bpm`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${getRiskBadgeClasses(v.risk_level_assessed).badge}`}
                            >
                              {getRiskLabel(v.risk_level_assessed) || "Low Risk"}
                            </Badge>
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

          <TabsContent value="visits" className="space-y-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-primary" />
                  Prenatal Checkup & Consultation Records
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed clinician notes, chief complaints, danger signs, and
                  attending staff
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {prenatalVisits.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    No prenatal consultations recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prenatalVisits.map((visit: any, index: number) => (
                      <div
                        key={visit.visit_id || index}
                        className="space-y-3 rounded-xl border border-border bg-muted/30 p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 border-b border-border/50 pb-2 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="text-xs font-semibold"
                            >
                              Visit #{visit.visit_number || index + 1}
                            </Badge>
                            <span className="text-xs font-bold text-foreground">
                              {new Date(visit.visit_date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • Trimester {visit.trimester || 1} (
                              {visit.age_of_gestation_weeks} wks)
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            Attending:{" "}
                            <strong className="text-foreground">
                              {visit.healthWorker
                                ? `${visit.healthWorker.first_name} ${visit.healthWorker.last_name}`
                                : "Healthcare Provider"}
                            </strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                          <div>
                            <span className="block text-[11px] text-muted-foreground">
                              Chief Complaint:
                            </span>
                            <span className="font-medium text-foreground">
                              {visit.chief_complaint ||
                                "Routine prenatal assessment"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] text-muted-foreground">
                              Danger Signs Observed:
                            </span>
                            <span
                              className={
                                visit.danger_signs_observed
                                  ? "font-bold text-red-500"
                                  : "text-foreground"
                              }
                            >
                              {visit.danger_signs_observed || "None"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11px] text-muted-foreground">
                              Vitals at Consultation:
                            </span>
                            <span className="font-mono text-foreground">
                              BP: {visit.bp_systolic}/{visit.bp_diastolic} | PR:{" "}
                              {visit.pulse_rate_bpm || "-"} | Temp:{" "}
                              {visit.temperature_celsius || "-"}°C
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="labs" className="space-y-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Microscope className="h-4 w-4 text-primary" />
                  Diagnostic Reports, Laboratory & Ultrasound Scans
                </CardTitle>
                <CardDescription className="text-xs">
                  Click on any scan or laboratory document to view in high
                  resolution or open PDF
                </CardDescription>
              </CardHeader>
              <CardContent>
                {labScreenings.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    No diagnostic tests or uploaded scans available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {labScreenings.map((lab: any, index: number) => {
                      const fileUrl = lab.file_url
                      const isPdf =
                        fileUrl &&
                        (fileUrl.toLowerCase().includes(".pdf") ||
                          fileUrl.toLowerCase().includes("/pdf"))

                      return (
                        <div
                          key={lab.screening_id || index}
                          className="flex flex-col justify-between rounded-xl border border-border bg-muted/40 p-4 transition-all hover:border-primary/40"
                        >
                          <div>
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div>
                                <h4 className="line-clamp-1 text-xs font-bold text-foreground">
                                  {lab.screening_type}
                                </h4>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(
                                    lab.date_of_screening
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className="border-primary/30 text-[10px] font-semibold text-primary"
                              >
                                {lab.result || "Uploaded"}
                              </Badge>
                            </div>

                            {lab.remarks && (
                              <p className="mb-3 line-clamp-2 text-[11px] text-muted-foreground">
                                Remarks: {lab.remarks}
                              </p>
                            )}
                          </div>

                          {fileUrl ? (
                            isPdf ? (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 flex items-center justify-between rounded-lg border border-border bg-background p-2.5 text-xs font-medium text-primary hover:bg-muted"
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                  View PDF Report
                                </span>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <div
                                onClick={() =>
                                  openMediaViewer(fileUrl, lab.screening_type)
                                }
                                className="group relative mt-2 h-32 cursor-pointer overflow-hidden rounded-lg border border-border bg-black/5"
                              >
                                <img
                                  src={fileUrl}
                                  alt={lab.screening_type}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                                  <Eye className="h-4 w-4" /> View Scan
                                </div>
                              </div>
                            )
                          ) : (
                            <span className="mt-2 text-[10px] text-muted-foreground italic">
                              No image attachment attached
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supplements" className="space-y-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Pill className="h-4 w-4 text-primary" />
                  Prescriptions & Micronutrient Supplements Log
                </CardTitle>
                <CardDescription className="text-xs">
                  Iron + Folic Acid, Calcium Carbonate, and micronutrient
                  distribution track record
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {supplements.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    No prescription or supplement records found.
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto scrollbar-thin">
                    <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs font-semibold">
                          Supplement / Medication
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Dosage / Tablets Given
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Date Prescribed
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Adherence Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplements.map((supp: any, idx: number) => (
                        <TableRow
                          key={supp.supplement_id || idx}
                          className="border-border"
                        >
                          <TableCell className="text-xs font-semibold text-foreground">
                            {supp.supplement_type}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {supp.tablets_given_count} Tablets
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(supp.date_given).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${supp.is_completed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-amber-500/30 bg-amber-500/10 text-amber-500"}`}
                            >
                              {supp.is_completed
                                ? "Course Completed"
                                : "Ongoing Course"}
                            </Badge>
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

          {deliveryOutcomes.length > 0 && (
            <TabsContent value="deliveries" className="space-y-4">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Baby className="h-4 w-4 text-primary" />
                    Previous Deliveries & Newborn History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {deliveryOutcomes.map((d: any, idx: number) => (
                    <div
                      key={d.delivery_id || idx}
                      className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <span className="font-bold text-foreground">
                          Delivery Date:{" "}
                          {new Date(d.delivery_date).toLocaleDateString()}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          Mode: {d.mode_of_delivery}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-muted-foreground sm:grid-cols-3">
                        <div>
                          Place:{" "}
                          <strong className="text-foreground">
                            {d.place_of_delivery}
                          </strong>
                        </div>
                        <div>
                          Blood Loss:{" "}
                          <strong className="text-foreground">
                            {d.blood_loss_ml
                              ? `${d.blood_loss_ml} mL`
                              : "Normal"}
                          </strong>
                        </div>
                        <div>
                          Complications:{" "}
                          <strong className="text-foreground">
                            {d.delivery_complications || "None"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Dialog
        open={!!selectedMediaUrl}
        onOpenChange={(open) => !open && setSelectedMediaUrl(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-4xl overflow-hidden border-none bg-black/95 p-2 text-white">
          <div className="flex items-center justify-between border-b border-white/10 p-2">
            <span className="text-xs font-semibold">{selectedMediaTitle}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMediaUrl(null)}
              className="text-xs text-white hover:bg-white/10"
            >
              Close
            </Button>
          </div>
          {selectedMediaUrl && (
            <div className="flex max-h-[80vh] items-center justify-center p-2">
              <img
                src={selectedMediaUrl}
                alt={selectedMediaTitle}
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PublicSharedJourneyPage
