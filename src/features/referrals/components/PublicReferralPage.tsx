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
  MessageSquare,
  Sparkles,
  ExternalLink,
  Pill,
  Microscope,
  Stethoscope,
  RefreshCw,
  Share2,
  Copy
} from "lucide-react"
import { extractRiskLevel } from "@/lib/riskUtils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ResponsiveModal } from "@/components/ui/responsive-modal"

interface PublicReferralData {
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
  prenatal_visits?: any[]
  lab_screenings?: any[]
  supplements?: any[]
  cdss_alerts?: any[]
}

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

  // Tabs state
  const [activeTab, setActiveTab] = useState("overview")

  // Care coordination / Response state
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<"accepted" | "completed" | "rejected">("accepted")
  const [responseNotes, setResponseNotes] = useState("")
  const [outcomeNotes, setOutcomeNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccessMsg, setActionSuccessMsg] = useState("")

  // Toast / Copy helper
  const [copyNotice, setCopyNotice] = useState("")

  const fetchReferral = async (pinToUse?: string) => {
    if (!id) return
    setLoading(true)
    setPinError("")
    setGeneralError("")

    try {
      const pinParam = pinToUse !== undefined ? pinToUse : enteredPin
      const res = await apiClient.get(`/api/v1/referral/public/${id}`, {
        params: pinParam ? { pin: pinParam } : undefined
      })
      const result: PublicReferralData = res.data?.data

      setData(result)
      if (result.isPinRequired && !result.isPinVerified && pinParam) {
        setPinError("Invalid security PIN. Please check the code provided by the referring facility.")
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setGeneralError("Referral not found or the secure link has expired.")
      } else {
        setGeneralError(err.response?.data?.error || "Failed to load referral record. Please check connection.")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReferral(pinFromUrl)
  }, [id])

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!enteredPin.trim()) {
      setPinError("Please enter the 6-digit PIN code.")
      return
    }
    setSearchParams({ pin: enteredPin.trim() })
    fetchReferral(enteredPin.trim())
  }

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setActionLoading(true)

    try {
      const res = await apiClient.post(`/api/v1/referral/public/${id}/respond`, {
        pin: enteredPin || pinFromUrl || undefined,
        status: selectedAction,
        response_notes: responseNotes.trim() || undefined,
        outcome: outcomeNotes.trim() || undefined,
      })

      setActionSuccessMsg(`Successfully marked transfer as ${selectedAction.toUpperCase()}!`)
      setIsRespondModalOpen(false)
      // Refresh current data
      await fetchReferral(enteredPin || pinFromUrl)
      setTimeout(() => setActionSuccessMsg(""), 5000)
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update referral status. Please try again.")
    } finally {
      setActionLoading(false)
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

  // Derived patient metrics matching MotherProfilePage
  const patient = data?.patient
  const obstetric = data?.obstetric_info
  const vitals = obstetric?.latest_vitals
  const prenatalVisits = data?.prenatal_visits || []
  const labScreenings = data?.lab_screenings || []
  const supplements = data?.supplements || []

  const calculateGAWeeks = (lmpDateStr?: string) => {
    if (!lmpDateStr) return 0
    const lmp = new Date(lmpDateStr)
    if (isNaN(lmp.getTime())) return 0
    const diffTime = new Date().getTime() - lmp.getTime()
    const weeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000))
    return Math.max(0, weeks)
  }

  const calculateEDD = (lmpDateStr?: string) => {
    if (!lmpDateStr) return "N/A"
    const lmp = new Date(lmpDateStr)
    if (isNaN(lmp.getTime())) return "N/A"
    const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000)
    return edd.toLocaleDateString()
  }

  const gestationalWeeks = obstetric?.lmp_date 
    ? calculateGAWeeks(obstetric.lmp_date) 
    : (vitals?.gestational_age_weeks || 0)

  const progressPercent = Math.min(100, Math.max(0, Math.round((gestationalWeeks / 40) * 100)))

  const getTrimester = (weeks: number) => {
    if (weeks === 0) return "N/A"
    if (weeks <= 12) return "1st Trimester"
    if (weeks <= 27) return "2nd Trimester"
    return "3rd Trimester"
  }

  // Consistent risk level extraction matching MotherProfilePage and MothersPage
  const resolvedRiskLevel = useMemo(() => {
    return extractRiskLevel(
      patient,
      obstetric ? [obstetric] : [],
      prenatalVisits
    ) || vitals?.risk_level || "Low Risk"
  }, [patient, obstetric, prenatalVisits, vitals])

  const riskLower = (resolvedRiskLevel || "").toLowerCase()
  const isHighRisk = riskLower.includes("high")
  const isMediumRisk = riskLower.includes("med") || riskLower.includes("moderate")

  const riskBadgeClass = isHighRisk
    ? "bg-red-500/10 text-red-500 border border-red-500/20"
    : isMediumRisk
    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"

  // PIN gate view
  if (data?.isPinRequired && !data.isPinVerified) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </Button>
        </div>

        <Card className="w-full max-w-md shadow-2xl border-border bg-card">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Protected Medical Transfer</CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              This clinical care handoff is protected with end-to-end security PIN verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-5 p-3.5 rounded-xl bg-muted/60 border border-border text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Referring:</span>
                <span className="font-semibold text-foreground">{data.referring_facility.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Destination:</span>
                <span className="font-semibold text-foreground">{data.destination_facility.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Transfer Date:</span>
                <span className="font-medium text-foreground">{new Date(data.date_referred).toLocaleDateString()}</span>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Enter 6-Digit Transfer PIN Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ""))}
                  className="text-center font-mono text-2xl tracking-[0.35em] h-12 bg-background"
                  autoFocus
                />
                {pinError && (
                  <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {pinError}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full h-10 font-semibold gap-2 shadow-sm">
                {loading ? "Verifying..." : "Access Patient Record"}
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
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-6 shadow-xl border-red-500/20 bg-card">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="text-xl mb-2 text-foreground">Secure Transfer Unavailable</CardTitle>
          <CardDescription className="text-muted-foreground mb-6 text-xs">
            {generalError}
          </CardDescription>
          <Link to="/">
            <Button variant="outline" className="w-full">Return to BMS Homepage</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Retrieving secured patient EHR & clinical handoff...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-sm">
            B
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground tracking-tight">BirthCare Network</span>
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/5">
                e-Referral Handoff
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              To: <span className="font-semibold text-foreground">{data?.destination_facility.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {copyNotice && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 animate-fade-in hidden sm:inline">
              {copyNotice}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-8 gap-1.5 text-xs">
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copy Link</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print Record</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 rounded-lg" title="Toggle Theme">
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </Button>
        </div>
      </header>

      {/* Action Notification Banner if updated */}
      {actionSuccessMsg && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {actionSuccessMsg}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* PROFILE HEADER (Identical aesthetic & metrics to MotherProfilePage) */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Left: Avatar & Identity */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-border shadow-sm shrink-0">
                <AvatarImage src={patient?.profile_url || ""} alt={patient?.name} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl rounded-2xl">
                  {patient?.name?.slice(0, 2).toUpperCase() || "MO"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {patient?.name || "Confidential Patient"}
                  </h1>
                  
                  {/* Urgency / Clinical Risk Badge (Kept cleanly beside mother name) */}
                  <Badge className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${riskBadgeClass}`}>
                    <Activity className="h-3 w-3" />
                    {resolvedRiskLevel.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {patient?.age && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {patient.age} yrs old • {patient.civil_status || "Married"}
                    </span>
                  )}
                  {patient?.blood_type && (
                    <span className="flex items-center gap-1 font-semibold text-red-500">
                      <Droplet className="h-3.5 w-3.5" />
                      Blood: {patient.blood_type}
                    </span>
                  )}
                  {patient?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {patient.phone}
                    </span>
                  )}
                  {patient?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {patient.address}
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground pt-1 flex flex-wrap items-center gap-2">
                  <span>Referred by:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    {data?.referring_facility.name}
                  </span>
                  <span>•</span>
                  <span>{data?.date_referred ? new Date(data.date_referred).toLocaleString() : ""}</span>
                </div>
              </div>
            </div>

            {/* Right: Receiving Controls & Response Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
              {/* Referral Transfer Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground hidden lg:inline">Transfer Status:</span>
                <Badge className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border-none shadow-xs ${
                  data?.status === 'accepted' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                  data?.status === 'completed' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                  data?.status === 'rejected' ? 'bg-red-500/15 text-red-500' :
                  'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}>
                  {data?.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   data?.status === 'accepted' ? <Check className="h-3.5 w-3.5" /> :
                   data?.status === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  REFERRAL {data?.status ? data.status.toUpperCase() : "PENDING"}
                </Badge>
              </div>

              {/* Lifecycle-aware Action Buttons */}
              <div className="flex items-center gap-2">
                {/* 1. When Referral is Pending: Only Accept or Decline are allowed */}
                {(!data?.status || data.status === "pending") && (
                  <>
                    <Button
                      onClick={() => {
                        setSelectedAction("accepted")
                        setIsRespondModalOpen(true)
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 text-xs font-semibold shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept Transfer
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedAction("rejected")
                        setIsRespondModalOpen(true)
                      }}
                      className="text-red-500 hover:bg-red-500/10 hover:text-red-600 gap-1.5 h-9 text-xs font-medium"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </>
                )}

                {/* 2. When Referral is Accepted: Show Mark Completed */}
                {data?.status === "accepted" && (
                  <Button
                    onClick={() => {
                      setSelectedAction("completed")
                      setIsRespondModalOpen(true)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 text-xs font-semibold shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Completed
                  </Button>
                )}

                {/* 3. When Completed: Care successfully transitioned */}
                {data?.status === "completed" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Care Handoff Completed
                  </div>
                )}

                {/* 4. When Rejected: Finalized declined transfer */}
                {data?.status === "rejected" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-semibold">
                    <XCircle className="h-4 w-4" />
                    Referral Declined
                  </div>
                )}
              </div>

              {data?.response_notes && (
                <p className="text-[11px] text-muted-foreground italic text-right max-w-xs truncate">
                  Latest Response: "{data.response_notes}"
                </p>
              )}
            </div>

          </div>

          {/* Quick Obstetric Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Obstetric History</span>
              <p className="text-base font-bold text-foreground mt-0.5">
                G{obstetric?.gravida ?? 1} P{obstetric?.parity ?? 0}
              </p>
              <span className="text-[11px] text-muted-foreground">Gravida / Parity</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Gestational Age</span>
              <p className="text-base font-bold text-primary mt-0.5">
                {gestationalWeeks > 0 ? `${gestationalWeeks} Weeks` : "N/A"}
              </p>
              <span className="text-[11px] text-muted-foreground">{getTrimester(gestationalWeeks)}</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Est. Due Date (EDD)</span>
              <p className="text-base font-bold text-foreground mt-0.5">
                {calculateEDD(obstetric?.lmp_date)}
              </p>
              <span className="text-[11px] text-muted-foreground">LMP: {obstetric?.lmp_date ? new Date(obstetric.lmp_date).toLocaleDateString() : "N/A"}</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Latest Blood Pressure</span>
              <p className="text-base font-bold font-mono text-foreground mt-0.5">
                {vitals?.bp || "120/80"}
              </p>
              <span className="text-[11px] text-muted-foreground">PR: {vitals?.pulse_rate || "80"} bpm • Temp: {vitals?.temp || "36.5"}°C</span>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION (Matching Mother Profile structure) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/70 p-1 border border-border rounded-xl">
            <TabsTrigger value="overview" className="gap-1.5 text-xs font-semibold rounded-lg">
              <FileText className="h-3.5 w-3.5" />
              Clinical Handoff
            </TabsTrigger>
            <TabsTrigger value="visits" className="gap-1.5 text-xs font-semibold rounded-lg">
              <Activity className="h-3.5 w-3.5" />
              Prenatal Visits ({prenatalVisits.length})
            </TabsTrigger>
            <TabsTrigger value="labs" className="gap-1.5 text-xs font-semibold rounded-lg">
              <Microscope className="h-3.5 w-3.5" />
              Laboratory & Screenings ({labScreenings.length})
            </TabsTrigger>
            <TabsTrigger value="supplements" className="gap-1.5 text-xs font-semibold rounded-lg">
              <Pill className="h-3.5 w-3.5" />
              Prescriptions & Supplements ({supplements.length})
            </TabsTrigger>
            <TabsTrigger value="coordination" className="gap-1.5 text-xs font-semibold rounded-lg">
              <Building2 className="h-3.5 w-3.5" />
              Facility Routing & Notes
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CLINICAL HANDOFF SUMMARY */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Clinical Referral Reason Card */}
              <Card className="lg:col-span-2 border-border shadow-sm bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Official Clinical Referral Notes & Chief Complaint
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Transmitted directly from {data?.referring_facility.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/40 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed border border-border">
                    {data?.reason || "No clinical handoff text specified."}
                  </div>

                  {data?.response_notes && (
                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
                        Receiving Facility Coordination Note:
                      </span>
                      <p className="text-foreground">{data.response_notes}</p>
                      {data.outcome && (
                        <p className="text-muted-foreground mt-1 text-[11px]">Outcome: {data.outcome}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Patient Vitals & Clinical Snapshot */}
              <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Latest Examination Vitals
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    {vitals?.visit_date ? `Recorded on ${new Date(vitals.visit_date).toLocaleDateString()}` : "Clinic triage snapshot"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Blood Pressure</span>
                    <span className="font-bold font-mono text-foreground">{vitals?.bp || "120/80"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Heart / Pulse Rate</span>
                    <span className="font-medium font-mono text-foreground">{vitals?.pulse_rate ? `${vitals.pulse_rate} bpm` : "80 bpm"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Temperature</span>
                    <span className="font-medium font-mono text-foreground">{vitals?.temp ? `${vitals.temp} °C` : "36.5 °C"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Fundic Height</span>
                    <span className="font-medium font-mono text-foreground">{vitals?.fundic_height ? `${vitals.fundic_height} cm` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Fetal Heart Tone</span>
                    <span className="font-medium font-mono text-foreground">{vitals?.fetal_heart_tone ? `${vitals.fetal_heart_tone} bpm` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-muted-foreground">Risk Assessment</span>
                    <span className={`font-semibold ${isHighRisk ? "text-red-500 font-bold" : isMediumRisk ? "text-amber-500 font-bold" : "text-emerald-500"}`}>
                      {resolvedRiskLevel}
                    </span>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* TAB 2: PRENATAL VISITS HISTORY */}
          <TabsContent value="visits" className="space-y-4">
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Prenatal Visits & Consultation History
                </CardTitle>
                <CardDescription className="text-xs">
                  Complete sequence of prenatal checkups recorded for this pregnancy.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {prenatalVisits.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    No individual prenatal visit consultation logs found for this pregnancy.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs font-semibold">Date</TableHead>
                        <TableHead className="text-xs font-semibold">Trimester</TableHead>
                        <TableHead className="text-xs font-semibold">AOG</TableHead>
                        <TableHead className="text-xs font-semibold">BP / Vitals</TableHead>
                        <TableHead className="text-xs font-semibold">Fundic Ht / FHT</TableHead>
                        <TableHead className="text-xs font-semibold">Chief Complaint / Danger Signs</TableHead>
                        <TableHead className="text-xs font-semibold">Attending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prenatalVisits.map((visit: any, index: number) => (
                        <TableRow key={visit.visit_id || index} className="border-border">
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {new Date(visit.visit_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs">
                            Trimester {visit.trimester || 1}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            {visit.age_of_gestation_weeks ? `${visit.age_of_gestation_weeks} wks` : "N/A"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {visit.bp_systolic}/{visit.bp_diastolic} • {visit.temperature_celsius}°C
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {visit.fundic_height_cm ? `${visit.fundic_height_cm} cm` : "-"} / {visit.fetal_heart_tone_bpm ? `${visit.fetal_heart_tone_bpm} bpm` : "-"}
                          </TableCell>
                          <TableCell className="text-xs max-w-[220px]">
                            <p className="truncate">{visit.chief_complaint || "Routine checkup"}</p>
                            {visit.danger_signs_observed && (
                              <span className="text-[10px] text-red-500 font-semibold block truncate">
                                Danger: {visit.danger_signs_observed}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {visit.healthWorker ? `${visit.healthWorker.first_name} ${visit.healthWorker.last_name}` : "Healthcare Provider"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: LABORATORY & SCREENINGS */}
          <TabsContent value="labs" className="space-y-4">
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Microscope className="h-4 w-4 text-primary" />
                  Diagnostic Screenings & Lab Tests
                </CardTitle>
                <CardDescription className="text-xs">
                  Diagnostic lab results, blood screenings, urinalysis, and ultrasound documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {labScreenings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    No lab screening records attached to this pregnancy handoff.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs font-semibold">Date</TableHead>
                        <TableHead className="text-xs font-semibold">Screening Type</TableHead>
                        <TableHead className="text-xs font-semibold">Result</TableHead>
                        <TableHead className="text-xs font-semibold">Remarks</TableHead>
                        <TableHead className="text-xs font-semibold">Attachment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labScreenings.map((lab: any, index: number) => (
                        <TableRow key={lab.screening_id || index} className="border-border">
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {new Date(lab.date_of_screening).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground">
                            {lab.screening_type}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                              {lab.result}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {lab.remarks || "None"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {lab.file_url ? (
                              <a
                                href={lab.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                              >
                                <ExternalLink className="h-3 w-3" /> View Doc
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">No file</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: PRESCRIPTIONS & SUPPLEMENTS */}
          <TabsContent value="supplements" className="space-y-4">
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  Prescriptions & Nutritional Supplements
                </CardTitle>
                <CardDescription className="text-xs">
                  Medications and maternal supplements administered (Iron, Folic Acid, Calcium, Vitamin A).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {supplements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    No supplementation records logged for this pregnancy.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs font-semibold">Date Given</TableHead>
                        <TableHead className="text-xs font-semibold">Supplement / Medication</TableHead>
                        <TableHead className="text-xs font-semibold">Tablets Given</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplements.map((supp: any, index: number) => (
                        <TableRow key={supp.supplement_id || index} className="border-border">
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {new Date(supp.date_given).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground">
                            {supp.supplement_type}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-medium">
                            {supp.tablets_given_count} tablets
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Dispensed
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: FACILITY ROUTING & NOTES */}
          <TabsContent value="coordination" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Origin Facility */}
              <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Referring Facility (Origin)
                  </CardTitle>
                  <p className="text-base font-bold text-foreground">
                    {data?.referring_facility.name}
                  </p>
                </CardHeader>
                <CardContent className="text-xs space-y-2 text-muted-foreground">
                  {data?.referring_facility.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{data.referring_facility.address}</span>
                    </div>
                  )}
                  {data?.referring_facility.contact && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{data.referring_facility.contact}</span>
                    </div>
                  )}
                  {data?.referring_facility.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span>{data.referring_facility.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Receiving Facility */}
              <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    Receiving Facility (Destination)
                  </CardTitle>
                  <p className="text-base font-bold text-foreground">
                    {data?.destination_facility.name}
                  </p>
                </CardHeader>
                <CardContent className="text-xs space-y-2 text-muted-foreground">
                  {data?.destination_facility.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{data.destination_facility.address}</span>
                    </div>
                  )}
                  {data?.destination_facility.contact && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{data.destination_facility.contact}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>

      </main>

      {/* ACTION / RESPONSE MODAL */}
      <ResponsiveModal
        open={isRespondModalOpen}
        onOpenChange={setIsRespondModalOpen}
        title={`Care Coordination: ${selectedAction.toUpperCase()}`}
        description="Transmit status updates, admission notes, and clinical outcomes back to the referring facility."
        className="sm:max-w-[480px]"
      >
        <form onSubmit={handleActionSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Confirm Action
            </label>
            {(!data?.status || data.status === "pending") && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedAction === "accepted" ? "default" : "outline"}
                  className={`h-9 text-xs font-semibold ${selectedAction === "accepted" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  onClick={() => setSelectedAction("accepted")}
                >
                  Accept Transfer
                </Button>
                <Button
                  type="button"
                  variant={selectedAction === "rejected" ? "default" : "outline"}
                  className={`h-9 text-xs font-semibold ${selectedAction === "rejected" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                  onClick={() => setSelectedAction("rejected")}
                >
                  Decline Transfer
                </Button>
              </div>
            )}
            {data?.status === "accepted" && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Marking this referral as <span className="font-bold uppercase">Completed</span> will finalize patient care handover.
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Clinical Response & Coordination Notes
            </label>
            <Textarea
              placeholder="e.g. Patient evaluated in OB Triage. Admitted to High-Risk Antenatal Ward for continuous fetal monitoring..."
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Clinical Outcome (Optional)
            </label>
            <Input
              placeholder="e.g. Admitted / Scheduled for Induction / Discharged stable"
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRespondModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={actionLoading}
              className="font-semibold"
            >
              {actionLoading ? "Submitting..." : "Submit Care Response"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>

    </div>
  )
}

