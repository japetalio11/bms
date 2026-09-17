import * as React from "react"
import {
  Calendar as CalendarIcon,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useIsMobile } from "@/hooks/use-mobile"

export function CustomEvent({ event, onClick }: any) {
  const isMobile = useIsMobile()
  if (event.type === "availability") {
    return (
      <div
        onClick={(e) => {
          if (onClick) onClick(event)
        }}
        className="mt-1 flex w-full justify-end pr-1"
      >
        <div
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-[#22C55E]/20 bg-[#22C55E] font-medium whitespace-nowrap text-white ${isMobile ? "px-3 py-1.5 text-xs" : "px-2 py-0.5 text-[10px]"}`}
        >
          <CalendarIcon className={isMobile ? "h-3.5 w-3.5" : "h-3 w-3"} />
          {event.title}
        </div>
      </div>
    )
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          onClick={(e) => {
            if (onClick) onClick(event)
          }}
          className={`mx-0.5 my-0.5 flex cursor-pointer overflow-hidden rounded-md border border-border bg-card text-card-foreground transition-colors hover:bg-accent ${isMobile ? "gap-3 p-3" : "gap-1.5 px-1.5 py-1"}`}
        >
          <div
            className={`${isMobile ? "w-1.5" : "w-[3px]"} ${event.status === "Confirmed" ? "bg-[#22C55E]" : "bg-yellow-500"} my-0.5 shrink-0 rounded-full`}
          ></div>
          <div className="flex min-w-0 flex-col justify-center leading-tight">
            <span
              className={`${isMobile ? "text-sm" : "text-[10px]"} truncate leading-tight font-semibold`}
            >
              {event.title}
            </span>
            {event.risk && (
              <div
                className={`flex items-center gap-1 ${event.risk === "High Risk" ? "text-red-500" : "text-[#22C55E]"} ${isMobile ? "mt-1 text-xs" : "mt-0.5 text-[9px]"}`}
              >
                <Activity
                  className={`${isMobile ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} shrink-0`}
                />
                <span className="truncate">{event.risk}</span>
              </div>
            )}
          </div>
        </div>
      </HoverCardTrigger>

      <HoverCardContent
        side="bottom"
        align="start"
        className="z-50 flex w-[300px] flex-col gap-3 rounded-lg border border-border bg-popover p-3 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm leading-tight font-medium text-foreground">
            {event.title}
          </h4>
          <div
            className={`flex items-center gap-1 ${event.status === "Confirmed" ? "bg-[#22c55e]" : "bg-yellow-500"} shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium text-white`}
          >
            {event.status === "Confirmed" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {event.status || "Pending"}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              Date & Time
            </div>
            <div className="text-right text-xs font-normal text-foreground">
              June 29, 2026 8:00 AM
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Risk Level
            </div>
            <div
              className={`text-right text-xs font-medium ${event.risk === "High Risk" ? "text-red-500" : "text-[#22C55E]"}`}
            >
              {event.risk || "Low Risk"}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
