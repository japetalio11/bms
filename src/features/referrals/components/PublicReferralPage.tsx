import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useSearchParams, Link } from "react-router-dom"
import { apiClient } from "@/lib/apiClient"
import { useTheme } from "@/components/theme-provider"
import {
  ShieldAlert,
  Building2,
  Lock,
  ArrowRight,
  AlertTriangle,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react"
import { extractRiskLevel } from "@/lib/riskUtils"
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

// Recipient Sub-components & Utilities
import type {
  PublicReferralData,
  DocumentModalData,
} from "./recipient/referralTypes"
import {
  parseReferralDetails,
  determineReferralUrgency,
  formatStatusConfig,
} from "./recipient/referralClinicalUtils"
import { ReferralTriageHeader } from "./recipient/ReferralTriageHeader"
import { ReferralReasonCard } from "./recipient/ReferralReasonCard"
import { MaternalSnapshotCard } from "./recipient/MaternalSnapshotCard"
import { ClinicalAlertsBanner } from "./recipient/ClinicalAlertsBanner"
import { RecentClinicalSnapshot } from "./recipient/RecentClinicalSnapshot"
import { ClinicalTabsSection } from "./recipient/ClinicalTabsSection"
import {
  TriageResponseModal,
  ClarificationModal,
  DocumentLightbox,
} from "./recipient/RecipientActionModals"

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

  // Active secondary tab
  const [activeTab, setActiveTab] = useState("narrative")

  // Triage Action State
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<
    "acknowledged" | "accepted" | "in_progress" | "completed" | "rejected"
  >("accepted")
  const [responseNotes, setResponseNotes] = useState("")
  const [outcomeNotes, setOutcomeNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccessMsg, setActionSuccessMsg] = useState("")

  // Clarification / Direct Message Facility State
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false)
  const [clarificationTopic, setClarificationTopic] = useState("Diagnostic & Ultrasound Records")
  const [clarificationMessage, setClarificationMessage] = useState("")
  const [clarificationPriority, setClarificationPriority] = useState<"urgent" | "normal">("urgent")
  const [clarificationLoading, setClarificationLoading] = useState(false)
  const [clarificationSentSuccess, setClarificationSentSuccess] = useState(false)

  // Fullscreen Document / Lightbox State
  const [documentModal, setDocumentModal] = useState<DocumentModalData | null>(null)
  const [zoomScale, setZoomScale] = useState(1)

  // Link copy feedback notice
  const [copyNotice, setCopyNotice] = useState("")

  const openDocument = (doc: DocumentModalData) => {
    setZoomScale(1)
    setDocumentModal(doc)
  }

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
        setGeneralError("Referral not found or the secure handoff link has expired.")
      } else {
        setGeneralError(
          axiosErr.response?.data?.error ||
            "Failed to load referral record. Please check network connection."
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
          setGeneralError("Referral not found or the secure handoff link has expired.")
        } else {
          setGeneralError(
            axiosErr.response?.data?.error ||
              "Failed to load referral record. Please check network connection."
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
        `Referral status updated to ${selectedAction.toUpperCase().replace("_", " ")}!`
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
    if (!clarificationMessage.trim() || !id) return
    setClarificationLoading(true)

    try {
      await apiClient.post(`/api/v1/referral/public/${id}/clarify`, {
        pin: enteredPin || pinFromUrl || undefined,
        topic: clarificationTopic,
        priority: clarificationPriority,
        message: clarificationMessage.trim(),
        sender_name: data?.destination_facility?.name || "Receiving Facility",
      })

      setClarificationSentSuccess(true)
      setTimeout(() => {
        setClarificationSentSuccess(false)
        setIsClarificationModalOpen(false)
        setClarificationMessage("")
      }, 2000)

      // Refresh data so audit notes show the inquiry
      fetchReferral(enteredPin || pinFromUrl)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      alert(
        axiosErr.response?.data?.error ||
          "Failed to dispatch inquiry to referring facility."
      )
    } finally {
      setClarificationLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopyNotice("Secure referral link copied to clipboard!")
    setTimeout(() => setCopyNotice(""), 3000)
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Process Clinical Data
  const patient = data?.patient
  const obstetric = data?.obstetric_info
  const prenatalVisits = useMemo(() => data?.prenatal_visits || [], [data])

  const parsedNotes = useMemo(
    () => parseReferralDetails(data?.reason, obstetric, patient),
    [data?.reason, obstetric, patient]
  )

  const resolvedRiskLevel = useMemo(() => {
    const assessed = extractRiskLevel(
      patient,
      obstetric ? [obstetric] : [],
      prenatalVisits
    )

    if (assessed && assessed !== "Low Risk") {
      return assessed
    }

    if (
      obstetric?.latest_vitals?.risk_level &&
      obstetric.latest_vitals.risk_level.toLowerCase().includes("high")
    ) {
      return "High Risk"
    }

    const dangerInNotes =
      parsedNotes.chiefComplaint.toLowerCase().includes("high-risk") ||
      parsedNotes.chiefComplaint.toLowerCase().includes("bleeding") ||
      parsedNotes.chiefComplaint.toLowerCase().includes("preeclampsia") ||
      parsedNotes.chiefComplaint.toLowerCase().includes("hypertension")

    if (dangerInNotes) {
      return "High Risk"
    }

    return assessed || obstetric?.latest_vitals?.risk_level || "Low Risk"
  }, [patient, obstetric, prenatalVisits, parsedNotes])

  // -------------------------------------------------------------------------
  // Render: Security PIN Protection
  // -------------------------------------------------------------------------

  if (data?.isPinRequired && !data.isPinVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground transition-colors">
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
            title="Toggle Theme"
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
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Protected Maternal Referral
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              This clinical handover is encrypted with end-to-end PIN verification.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="mb-5 space-y-2 rounded-xl border border-border bg-muted/50 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Referring Origin:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  {data.referring_facility.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Destination Center:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  {data.destination_facility.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transfer Timestamp:</span>
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
                className="h-10 w-full gap-2 font-semibold shadow-sm bg-primary"
              >
                {loading ? "Authenticating..." : "Access Clinical Handover"}
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
            Referral Record Unavailable
          </CardTitle>
          <CardDescription className="mb-6 text-xs text-muted-foreground">
            {generalError}
          </CardDescription>
          <Link to="/">
            <Button variant="outline" className="w-full">
              Return to System Portal
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
          <p className="text-sm font-semibold text-muted-foreground">
            Loading maternal referral and clinical handover data...
          </p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const normStatus = (data.status || "pending").toLowerCase().replace(/\s+/g, "_")
  const isTerminal = normStatus === "completed" || normStatus === "rejected" || normStatus === "cancelled"

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans text-foreground transition-colors">
      {/* 1. Sticky Top Action & Triage Bar */}
      <ReferralTriageHeader
        data={data}
        theme={theme}
        onToggleTheme={toggleTheme}
        onCopyLink={handleCopyLink}
        copyNotice={copyNotice}
        onOpenActionModal={(action) => {
          setSelectedAction(action)
          setIsRespondModalOpen(true)
        }}
        onOpenClarificationModal={() => setIsClarificationModalOpen(true)}
        onOpenFormTab={() => setActiveTab("form")}
      />

      {/* Action Success Alert Toast Banner */}
      {actionSuccessMsg && (
        <div className="sticky top-14 sm:top-16 z-30 flex items-center justify-center gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {actionSuccessMsg}
        </div>
      )}

      {/* 2. Main Clinical Handoff Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 pb-28 md:pb-12">
        
        {/* Section 1: SITUATION (Why Was This Mother Referred?) */}
        <ReferralReasonCard
          data={data}
          parsed={parsedNotes}
          resolvedRiskLevel={resolvedRiskLevel}
          onOpenClarificationModal={() => setIsClarificationModalOpen(true)}
        />

        {/* Section 2: BACKGROUND (Patient Identity & Obstetric Matrix) */}
        <MaternalSnapshotCard
          patient={data.patient}
          obstetric={data.obstetric_info}
          parsed={parsedNotes}
          onPhotoClick={(photoUrl, name) => {
            openDocument({
              title: `${name} — Identification Photo`,
              fileUrl: photoUrl,
              file_url: photoUrl,
              date: new Date().toISOString(),
              type: "Clinical Photo ID",
              remarks: "Patient identification photograph from official maternal health record.",
            })
          }}
        />

        {/* Section 3: CLINICAL ALERTS & RISK FACTORS */}
        <ClinicalAlertsBanner
          data={data}
          parsed={parsedNotes}
        />

        {/* Section 4: ASSESSMENT (Recent Clinical Snapshot) */}
        <RecentClinicalSnapshot
          data={data}
          onOpenDocument={openDocument}
          onOpenVisitsTab={() => setActiveTab("visits")}
          onOpenLabsTab={() => setActiveTab("labs")}
          onOpenMedsTab={() => setActiveTab("supplements")}
        />

        {/* Section 5: LONGITUDINAL RECORDS & AUDIT HUB */}
        <ClinicalTabsSection
          data={data}
          parsed={parsedNotes}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenDocument={openDocument}
        />

      </main>

      {/* 3. Sticky Bottom Action Bar (Mobile Screens `< md`) */}
      {!isTerminal && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-2.5 px-3 shadow-xl flex items-center gap-2 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsClarificationModalOpen(true)}
            className="h-10 px-3 text-xs font-semibold border-primary/30 text-primary rounded-xl"
            title="Message Facility"
          >
            Inquire
          </Button>

          {normStatus === "pending" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAction("rejected")
                  setIsRespondModalOpen(true)
                }}
                className="h-10 px-3 text-xs font-semibold text-red-500 hover:bg-red-500/10 border-red-500/20 rounded-xl"
              >
                Decline
              </Button>
              <Button
                onClick={() => {
                  setSelectedAction("accepted")
                  setIsRespondModalOpen(true)
                }}
                className="h-10 flex-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl"
              >
                Accept Transfer
              </Button>
            </>
          )}

          {normStatus === "accepted" && (
            <div className="flex-1 flex gap-2">
              <Button
                onClick={() => {
                  setSelectedAction("in_progress")
                  setIsRespondModalOpen(true)
                }}
                className="h-10 flex-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
              >
                Patient Arrived
              </Button>
              <Button
                onClick={() => {
                  setSelectedAction("completed")
                  setIsRespondModalOpen(true)
                }}
                className="h-10 flex-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                Complete
              </Button>
            </div>
          )}

          {normStatus === "in_progress" && (
            <Button
              onClick={() => {
                setSelectedAction("completed")
                setIsRespondModalOpen(true)
              }}
              className="h-10 flex-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              Complete Care Handover
            </Button>
          )}
        </div>
      )}

      {/* 4. Interactive Modals Suite */}
      <TriageResponseModal
        open={isRespondModalOpen}
        onOpenChange={setIsRespondModalOpen}
        data={data}
        selectedAction={selectedAction}
        onSelectAction={setSelectedAction}
        responseNotes={responseNotes}
        onResponseNotesChange={setResponseNotes}
        outcomeNotes={outcomeNotes}
        onOutcomeNotesChange={setOutcomeNotes}
        onSubmit={handleActionSubmit}
        loading={actionLoading}
      />

      <ClarificationModal
        open={isClarificationModalOpen}
        onOpenChange={setIsClarificationModalOpen}
        facilityName={data.referring_facility.name}
        facilityContact={data.referring_facility.contact}
        facilityEmail={data.referring_facility.email}
        topic={clarificationTopic}
        onTopicChange={setClarificationTopic}
        priority={clarificationPriority}
        onPriorityChange={setClarificationPriority}
        message={clarificationMessage}
        onMessageChange={setClarificationMessage}
        onSubmit={handleSendClarification}
        loading={clarificationLoading}
        sentSuccess={clarificationSentSuccess}
      />

      <DocumentLightbox
        documentModal={documentModal}
        onClose={() => setDocumentModal(null)}
        zoomScale={zoomScale}
        onZoomIn={() => setZoomScale((z) => Math.min(3.0, Number((z + 0.2).toFixed(1))))}
        onZoomOut={() => setZoomScale((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
        onZoomReset={() => setZoomScale(1)}
        patientName={patient?.name}
        facilityName={data.referring_facility.name}
      />
    </div>
  )
}

export default PublicReferralPage
