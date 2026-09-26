import React, { useState, useEffect } from "react"
import {
  X,
  Check,
  XCircle,
  PlayCircle,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  Radio,
  Phone,
  Mail,
  FileText,
  Badge,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Download,
  Printer,
  FileSignature,
  Microscope,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import type { PublicReferralData, DocumentModalData } from "./referralTypes"

// ---------------------------------------------------------------------------
// 1. Triage Decision Modal
// ---------------------------------------------------------------------------

interface TriageResponseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PublicReferralData | null
  selectedAction: "acknowledged" | "accepted" | "in_progress" | "completed" | "rejected"
  onSelectAction: (action: "acknowledged" | "accepted" | "in_progress" | "completed" | "rejected") => void
  responseNotes: string
  onResponseNotesChange: (val: string) => void
  outcomeNotes: string
  onOutcomeNotesChange: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
}

export function TriageResponseModal({
  open,
  onOpenChange,
  data,
  selectedAction,
  onSelectAction,
  responseNotes,
  onResponseNotesChange,
  outcomeNotes,
  onOutcomeNotesChange,
  onSubmit,
  loading,
}: TriageResponseModalProps) {
  const normStatus = (data?.status || "pending").toLowerCase().replace(/\s+/g, "_")
  const isPending = normStatus === "pending"
  const isAccepted = normStatus === "accepted"

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Clinical Care Disposition: ${selectedAction.toUpperCase().replace("_", " ")}`}
      description="Update referral triage status, assign care units, or record clinical outcomes."
      className="sm:max-w-[500px]"
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            Select Triage Action
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={selectedAction === "accepted" ? "default" : "outline"}
              className={`h-9 text-xs font-semibold ${selectedAction === "accepted" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`}
              onClick={() => onSelectAction("accepted")}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Accept Transfer
            </Button>

            <Button
              type="button"
              variant={selectedAction === "in_progress" ? "default" : "outline"}
              className={`h-9 text-xs font-semibold ${selectedAction === "in_progress" ? "bg-purple-600 text-white hover:bg-purple-700" : ""}`}
              onClick={() => onSelectAction("in_progress")}
            >
              <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
              Patient Arrived
            </Button>

            <Button
              type="button"
              variant={selectedAction === "completed" ? "default" : "outline"}
              className={`h-9 text-xs font-semibold ${selectedAction === "completed" ? "bg-emerald-700 text-white hover:bg-emerald-800" : ""}`}
              onClick={() => onSelectAction("completed")}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Mark Completed
            </Button>

            <Button
              type="button"
              variant={selectedAction === "rejected" ? "default" : "outline"}
              className={`h-9 text-xs font-semibold ${selectedAction === "rejected" ? "bg-red-600 text-white hover:bg-red-700" : ""}`}
              onClick={() => onSelectAction("rejected")}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Decline Transfer
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Clinical Response & Admission Instructions
          </label>
          <Textarea
            placeholder="e.g. Patient evaluated in OB Triage. Admitted to High-Risk Antenatal Ward for continuous fetal monitoring..."
            value={responseNotes}
            onChange={(e) => onResponseNotesChange(e.target.value)}
            rows={3}
            className="resize-none text-xs"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Clinical Outcome / Disposition (Optional)
          </label>
          <Input
            placeholder="e.g. Admitted / Scheduled for Induction / Stabilized"
            value={outcomeNotes}
            onChange={(e) => onOutcomeNotesChange(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            className="h-9 font-semibold bg-primary"
          >
            {loading ? "Recording..." : "Transmit Decision"}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}

// ---------------------------------------------------------------------------
// 2. Direct Facility Clarification / Inquiry Modal
// ---------------------------------------------------------------------------

interface ClarificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facilityName: string
  facilityContact?: string
  facilityEmail?: string
  topic: string
  onTopicChange: (topic: string) => void
  priority: "urgent" | "normal"
  onPriorityChange: (priority: "urgent" | "normal") => void
  message: string
  onMessageChange: (msg: string) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  sentSuccess: boolean
}

export function ClarificationModal({
  open,
  onOpenChange,
  facilityName,
  facilityContact,
  facilityEmail,
  topic,
  onTopicChange,
  priority,
  onPriorityChange,
  message,
  onMessageChange,
  onSubmit,
  loading,
  sentSuccess,
}: ClarificationModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Direct Facility Communication & Inquiry"
      description={`Communicate directly with ${facilityName} for immediate clinical coordination.`}
      className="sm:max-w-[520px]"
    >
      {sentSuccess ? (
        <div className="py-8 text-center space-y-2.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Clinical Inquiry Transmitted</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Your inquiry has been logged in the referral audit and dispatched to the attending staff at {facilityName}.
          </p>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Quick Contact Box */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{facilityName}</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                <Radio className="h-2.5 w-2.5 animate-pulse" /> Direct Coordination
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {facilityContact && (
                <a
                  href={`tel:${facilityContact}`}
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">Call: {facilityContact}</span>
                </a>
              )}

              {facilityEmail && (
                <a
                  href={`mailto:${facilityEmail}`}
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-card p-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">Email Facility</span>
                </a>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Inquiry Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => onTopicChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Diagnostic & Ultrasound Records">Ultrasound / Imaging Scan</option>
                  <option value="Transport & Ambulance ETA">Transport & Ambulance ETA</option>
                  <option value="Cervical Dilation & Labor Progress">Cervical Exam & Labor Progress</option>
                  <option value="Medications & Tocolytics Administered">Medications Given Prior</option>
                  <option value="General Clinical Clarification">General Patient History</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Urgency Level
                </label>
                <div className="flex h-9 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPriorityChange("urgent")}
                    className={`flex-1 h-full rounded-md text-xs font-bold transition-all ${
                      priority === "urgent"
                        ? "bg-red-500/15 text-red-600 border border-red-500/30"
                        : "border border-border/70 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Urgent / STAT
                  </button>
                  <button
                    type="button"
                    onClick={() => onPriorityChange("normal")}
                    className={`flex-1 h-full rounded-md text-xs font-bold transition-all ${
                      priority === "normal"
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "border border-border/70 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Routine
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                Clinical Question / Message
              </label>
              <Textarea
                placeholder="Type your clinical inquiry for the referring provider..."
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
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
                onClick={() => onOpenChange(false)}
                className="h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !message.trim()}
                className="h-9 gap-1.5 font-semibold bg-primary"
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? "Transmitting..." : "Send Message"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </ResponsiveModal>
  )
}

// ---------------------------------------------------------------------------
// 3. Fullscreen Document Lightbox & Image Viewer
// ---------------------------------------------------------------------------

interface DocumentLightboxProps {
  documentModal: DocumentModalData | null
  onClose: () => void
  zoomScale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  patientName?: string
  facilityName?: string
}

export function DocumentLightbox({
  documentModal,
  onClose,
  zoomScale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  patientName,
  facilityName,
}: DocumentLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!documentModal) return null

  const isImage = documentModal.fileUrl && Boolean(documentModal.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i))

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950/95 backdrop-blur-md text-zinc-100 select-none animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex h-12 sm:h-14 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-900/90 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
            title="Close Viewer (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[180px] sm:max-w-md">
              {documentModal.title}
            </span>
          </div>
        </div>

        {/* Center Zoom Controls */}
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
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
            onClick={onZoomIn}
            className="h-6 w-6 rounded-full text-zinc-300 hover:text-white hover:bg-white/10"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomReset}
            className="hidden sm:inline-flex h-6 rounded-full px-2 text-[10px] text-zinc-400 hover:text-white hover:bg-white/10"
          >
            Reset
          </Button>
        </div>

        {/* Right Tools */}
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

      {/* Canvas */}
      <div className="flex-1 w-full overflow-auto flex items-start justify-center p-3 sm:p-8 md:p-12">
        {documentModal.fileUrl ? (
          isImage ? (
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
          /* Clinical Document Record Sheet */
          <div
            style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
            className="w-full max-w-[96vw] sm:w-[820px] bg-white text-zinc-900 rounded-2xl shadow-2xl p-4 sm:p-8 md:p-10 space-y-6 transition-transform duration-200 ease-out"
          >
            <div className="border-b-2 border-primary/40 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-primary uppercase block">
                  Republic of the Philippines • Department of Health
                </span>
                <h2 className="text-lg sm:text-xl font-black text-zinc-900 uppercase">
                  {documentModal.title}
                </h2>
                <p className="text-xs text-zinc-500">Authenticated Maternal EHR Attachment</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="font-mono text-xs text-zinc-500">
                  {new Date(documentModal.date).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Patient</span>
                <span className="font-bold text-zinc-900">{patientName || "Patient"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Facility</span>
                <span className="font-semibold text-zinc-800">{facilityName || "Clinic"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Result</span>
                <span className="font-bold text-primary">{documentModal.result || "Evaluated"}</span>
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs">
              <span className="font-bold text-zinc-900 block">Attending Provider Clinical Notes:</span>
              <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                {documentModal.remarks || "No pathological abnormalities or contraindications noted during evaluation."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
