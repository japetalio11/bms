import * as React from "react"
import { Calendar as CalendarIcon, Activity, CheckCircle2, Clock } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useIsMobile } from "@/hooks/use-mobile"

export function CustomEvent({ event, onClick }: any) {
  const isMobile = useIsMobile();
  if (event.type === 'availability') {
    return (
      <div 
        onClick={(e) => {
          if (onClick) onClick(event);
        }}
        className="flex w-full justify-end pr-1 mt-1"
      >
        <div className={`inline-flex items-center gap-1.5 rounded-sm font-medium text-white whitespace-nowrap border bg-[#22C55E] border-[#22C55E]/20 cursor-pointer ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[10px]'}`}>
          <CalendarIcon className={isMobile ? "h-3.5 w-3.5" : "h-3 w-3"} />
          {event.title}
        </div>
      </div>
    )
  }

  // Default Appointment Event
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div 
          onClick={(e) => {
            if (onClick) onClick(event);
          }}
          className={`flex bg-card border border-border rounded-md text-card-foreground overflow-hidden my-0.5 mx-0.5 cursor-pointer hover:bg-accent transition-colors ${isMobile ? 'gap-3 p-3' : 'gap-1.5 px-1.5 py-1'}`}
        >
          <div className={`${isMobile ? 'w-1.5' : 'w-[3px]'} ${event.status === 'Confirmed' ? 'bg-[#22C55E]' : 'bg-yellow-500'} rounded-full shrink-0 my-0.5`}></div>
          <div className="flex flex-col min-w-0 justify-center leading-tight">
            <span className={`${isMobile ? 'text-sm' : 'text-[10px]'} font-semibold truncate leading-tight`}>{event.title}</span>
            {event.risk && (
              <div className={`flex items-center gap-1 ${event.risk === 'High Risk' ? 'text-red-500' : 'text-[#22C55E]'} ${isMobile ? 'text-xs mt-1' : 'text-[9px] mt-0.5'}`}>
                <Activity className={`${isMobile ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'} shrink-0`} />
                <span className="truncate">{event.risk}</span>
              </div>
            )}
          </div>
        </div>
      </HoverCardTrigger>
      
      <HoverCardContent side="bottom" align="start" className="w-[300px] bg-popover border border-border p-3 flex flex-col gap-3 rounded-lg shadow-xl z-50">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-medium text-foreground leading-tight">{event.title}</h4>
          <div className={`flex items-center gap-1 ${event.status === 'Confirmed' ? 'bg-[#22c55e]' : 'bg-yellow-500'} text-white px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0`}>
            {event.status === 'Confirmed' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {event.status || 'Pending'}
          </div>
        </div>
        
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-normal shrink-0">
              <CalendarIcon className="h-3.5 w-3.5" />
              Date & Time
            </div>
            <div className="text-xs text-foreground font-normal text-right">June 29, 2026 8:00 AM</div>
          </div>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-normal shrink-0">
              <Activity className="h-3.5 w-3.5" />
              Risk Level
            </div>
            <div className={`text-xs font-medium text-right ${event.risk === 'High Risk' ? 'text-red-500' : 'text-[#22C55E]'}`}>{event.risk || 'Low Risk'}</div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
