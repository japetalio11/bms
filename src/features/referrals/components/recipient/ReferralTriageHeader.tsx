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
  onPrint?: () => void
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
  onPrint,
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
              className="hidden sm:inline-flex h-4 border-border/80 bg-transparent px-1.5 py-0 font-mono text-[9px] sm:text-[10px] text-muted-foreground font-medium shrink-0"
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

      <div className="flex items-center gap-1.5 sm:gap-2">
        {copyNotice && (
          <span className="animate-fade-in hidden text-[11px] font-semibold text-emerald-600 lg:inline dark:text-emerald-400">
            {copyNotice}
          </span>
        )}

        <Badge
          variant="outline"
          className={`hidden xs:inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.badgeClass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span>{statusConfig.label}</span>
        </Badge>

        <div className="hidden md:flex items-center gap-1.5">
          {(isPending || isAcknowledged) && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => onOpenActionModal("accepted")}
                className="h-8.5 gap-1.5 bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Accept Transfer</span>
              </Button>

              {isPending && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenActionModal("acknowledged")}
                  className="h-8.5 gap-1 text-xs font-medium text-foreground hover:bg-muted border-border"
                >
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span>Acknowledge</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenActionModal("rejected")}
                className="h-8.5 gap-1 px-2.5 text-xs font-semibold border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-600 active:scale-95 transition-all"
                title="Decline patient transfer (requires clinical rationale)"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Decline</span>
              </Button>
            </div>
          )}

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
                className="h-8.5 gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
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
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onPrint || (() => window.print())}
          className="h-8.5 gap-1.5 px-2.5 sm:px-3 text-xs font-semibold border-border text-foreground hover:bg-muted shrink-0"
          title="Print clinical record or save as PDF"
        >
          <Printer className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Print / PDF</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8.5 w-8.5 rounded-lg border-border"
              title="More Options & Utilities"
            >
              <MoreVertical className="h-4 w-4 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 text-xs">
            <DropdownMenuItem onClick={onOpenClarificationModal} className="gap-2 cursor-pointer font-medium">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <span>Facility Inquiry (Message Origin)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyLink} className="gap-2 cursor-pointer">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Copy Referral Link</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPrint || (() => window.print())} className="gap-2 cursor-pointer">
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Print Referral Sheet</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenFormTab} className="gap-2 cursor-pointer">
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Official DOH Form View</span>
            </DropdownMenuItem>

            {!isTerminal && (
              <div className="md:hidden">
                <DropdownMenuSeparator />
                {(isPending || isAcknowledged) && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onOpenActionModal("accepted")}
                      className="gap-2 text-emerald-600 font-semibold cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Accept Transfer</span>
                    </DropdownMenuItem>
                    {isPending && (
                      <DropdownMenuItem
                        onClick={() => onOpenActionModal("acknowledged")}
                        className="gap-2 text-blue-600 font-medium cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Acknowledge Referral</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onOpenActionModal("rejected")}
                      className="gap-2 text-red-600 font-semibold cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Decline Referral</span>
                    </DropdownMenuItem>
                  </>
                )}
                {isAccepted && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onOpenActionModal("in_progress")}
                      className="gap-2 text-purple-600 font-semibold cursor-pointer"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      <span>Mark Patient Arrived</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onOpenActionModal("completed")}
                      className="gap-2 text-emerald-700 font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Completed</span>
                    </DropdownMenuItem>
                  </>
                )}
                {isInProgress && (
                  <DropdownMenuItem
                    onClick={() => onOpenActionModal("completed")}
                    className="gap-2 text-emerald-700 font-semibold cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Complete Care Handover</span>
                  </DropdownMenuItem>
                )}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
      </div>
    </header>
  )
}
