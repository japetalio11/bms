import React from "react"
import {
  Building2,
  Check,
  XCircle,
  CheckCircle2,
  Clock,
  PlayCircle,
  MessageSquare,
  Copy,
  Printer,
  Sun,
  Moon,
  MoreVertical,
  Radio,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PublicReferralData } from "./referralTypes"
import { formatStatusConfig } from "./referralClinicalUtils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { sanitizeMediaUrl } from "@/lib/utils"

interface ReferralTriageHeaderProps {
  data: PublicReferralData | null
  theme: string
  onToggleTheme: () => void
  onCopyLink: () => void
  copyNotice: string
  onOpenActionModal: (action: "acknowledged" | "accepted" | "in_progress" | "completed" | "rejected") => void
  onOpenClarificationModal: () => void
  onOpenFormTab: () => void
}

export function ReferralTriageHeader({
  data,
  theme,
  onToggleTheme,
  onCopyLink,
  copyNotice,
  onOpenActionModal,
  onOpenClarificationModal,
  onOpenFormTab,
}: ReferralTriageHeaderProps) {
  const statusConfig = formatStatusConfig(data?.status)
  const normStatus = (data?.status || "pending").toLowerCase().replace(/\s+/g, "_")
  const isPending = normStatus === "pending"
  const isAcknowledged = normStatus === "acknowledged"
  const isAccepted = normStatus === "accepted"
  const isInProgress = normStatus === "in_progress"
  const isTerminal = normStatus === "completed" || normStatus === "rejected" || normStatus === "cancelled"

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 w-full items-center justify-between border-b border-border bg-card/95 px-3 sm:px-6 lg:px-8 backdrop-blur-md shadow-2xs transition-colors">
      {/* Left: Patient Avatar & Facility Routing Badge */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-border/80 shadow-xs shrink-0 overflow-hidden">
          <AvatarImage
            src={sanitizeMediaUrl(data?.patient?.profile_url)}
            alt={data?.patient?.name}
            className="object-cover rounded-xl"
          />
          <AvatarFallback className="rounded-xl bg-primary text-xs font-bold text-primary-foreground">
            {data?.patient?.name
              ? data.patient.name
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "B"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">
              {data?.patient?.name || "Maternal Referral Triage"}
            </span>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex h-4 border-primary/30 bg-primary/5 px-1.5 py-0 font-mono text-[9px] sm:text-[10px] text-primary font-semibold shrink-0"
            >
              e-Handoff
            </Badge>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[160px] sm:max-w-xs md:max-w-sm">
            Recipient:{" "}
            <span className="font-semibold text-foreground">
              {data?.destination_facility?.name || "Designated Hospital"}
            </span>
          </p>
        </div>
      </div>

      {/* Center/Right: Referral Status Badge + Clinical Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {copyNotice && (
          <span className="animate-fade-in hidden text-[11px] font-semibold text-emerald-600 lg:inline dark:text-emerald-400">
            {copyNotice}
          </span>
        )}

        {/* Status Badge in Header */}
        <Badge
          variant="outline"
          className={`hidden xs:inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold ${statusConfig.badgeClass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span>{statusConfig.label}</span>
        </Badge>

        {/* Desktop Triage Decision Suite */}
        <div className="hidden md:flex items-center gap-1.5">
          {/* Direct Inquiry Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenClarificationModal}
            className="h-8.5 gap-1.5 text-xs font-semibold border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary shadow-2xs"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Facility Inquiry</span>
          </Button>

          {/* Pending Triage Actions */}
          {(isPending || isAcknowledged) && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => onOpenActionModal("accepted")}
                className="h-8.5 gap-1.5 bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Accept Transfer</span>
              </Button>

              {isPending && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenActionModal("acknowledged")}
                  className="h-8.5 gap-1 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span>Acknowledge</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenActionModal("rejected")}
                className="h-8.5 gap-1 px-2.5 text-xs font-medium text-red-500 hover:bg-red-500/10 hover:text-red-600"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Decline</span>
              </Button>
            </div>
          )}

          {/* In-Care Actions */}
          {isAccepted && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => onOpenActionModal("in_progress")}
                className="h-8.5 gap-1.5 bg-purple-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 active:scale-95 transition-all"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>Patient Arrived</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenActionModal("completed")}
                className="h-8.5 gap-1.5 text-xs font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Complete</span>
              </Button>
            </div>
          )}

          {isInProgress && (
            <Button
              size="sm"
              onClick={() => onOpenActionModal("completed")}
              className="h-8.5 gap-1.5 bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Complete Care Handover</span>
            </Button>
          )}

          <div className="h-4 w-px bg-border/80 mx-1" />

          {/* Utility Tools */}
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyLink}
            className="h-8.5 gap-1.5 text-xs"
            title="Copy Referral Link"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Copy Link</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8.5 gap-1.5 text-xs"
            title="Print Clinical Referral"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Print</span>
          </Button>
        </div>

        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          className="h-8.5 w-8.5 rounded-lg shrink-0"
          title="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </Button>

        {/* Mobile Dropdown Menu for Utilities */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8.5 w-8.5 rounded-lg"
                title="More Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuItem onClick={onCopyLink} className="gap-2 cursor-pointer">
                <Copy className="h-3.5 w-3.5 text-primary" />
                <span>Copy Secure Link</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()} className="gap-2 cursor-pointer">
                <Printer className="h-3.5 w-3.5 text-primary" />
                <span>Print Referral Sheet</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenFormTab} className="gap-2 cursor-pointer">
                <Share2 className="h-3.5 w-3.5 text-primary" />
                <span>Official DOH Form View</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenClarificationModal} className="gap-2 cursor-pointer">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span>Send Inquiry to Origin</span>
              </DropdownMenuItem>
              {!isTerminal && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onOpenActionModal("accepted")} className="gap-2 text-emerald-600 font-semibold cursor-pointer">
                    <Check className="h-3.5 w-3.5" />
                    <span>Accept Transfer</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenActionModal("in_progress")} className="gap-2 text-purple-600 font-semibold cursor-pointer">
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>Mark Patient Arrived</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenActionModal("completed")} className="gap-2 text-emerald-700 font-semibold cursor-pointer">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark Completed</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenActionModal("rejected")} className="gap-2 text-red-600 font-semibold cursor-pointer">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Decline Referral</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
