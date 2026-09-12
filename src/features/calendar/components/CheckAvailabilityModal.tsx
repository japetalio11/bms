import * as React from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import type { AppEvent } from "./CalendarPage"

export function CheckAvailabilityModal({ 
  children,
  events = [],
  date = new Date()
}: { 
  children: React.ReactNode
  events?: AppEvent[]
  date?: Date
}) {
  const MAX_DAILY_CAPACITY = 5

  const availableDaysInMonth = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    const days = eachDayOfInterval({ start, end })

    return days.filter(d => {
      const dayStart = new Date(d)
      dayStart.setHours(0, 0, 0, 0)
      if (dayStart < today) return false
      const isWeekend = d.getDay() === 0 || d.getDay() === 6
      if (isWeekend) return false
      const count = events.filter(e => e.start && isSameDay(e.start, d) && e.status !== 'Cancelled').length
      return count < MAX_DAILY_CAPACITY
    })
  }, [events, date])

  const formattedMonth = format(date, 'MMMM yyyy')
  const openDateNumbers = availableDaysInMonth.map(d => format(d, 'd')).join(", ")

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[300px] bg-popover border-border text-popover-foreground p-3 rounded-lg shadow-xl gap-2 flex flex-col z-50">
        <p className="text-xs font-normal text-muted-foreground leading-relaxed">
          There are <strong className="text-foreground font-semibold">{availableDaysInMonth.length}</strong> available booking days for <strong className="text-foreground font-semibold">{formattedMonth}</strong> (Max 5 visits/day):
        </p>
        {availableDaysInMonth.length > 0 ? (
          <p className="text-xs font-medium text-foreground tracking-wide break-words max-h-[100px] overflow-y-auto">
            Dates: {openDateNumbers}
          </p>
        ) : (
          <p className="text-xs italic text-red-400">No open slots available this month.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}

