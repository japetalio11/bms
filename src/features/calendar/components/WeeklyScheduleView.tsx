import * as React from "react"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import type { AppEvent } from "./CalendarPage"
import { CustomEvent } from "./CustomEvent"
import { CalendarOff, Calendar as CalendarIcon } from "lucide-react"

interface WeeklyScheduleViewProps {
  viewDate: Date
  selectedDate: Date
  events: AppEvent[]
  isMobile: boolean
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: AppEvent) => void
}

export function WeeklyScheduleView({
  viewDate,
  selectedDate,
  events,
  isMobile,
  onSelectDate,
  onSelectEvent,
}: WeeklyScheduleViewProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60
    }
  }, [])

  const startDate = startOfWeek(viewDate)

  const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i))

  return (
    <div className="flex w-full flex-1 overflow-hidden border-t border-l border-border bg-background">
      <div
        ref={scrollRef}
        className="relative flex h-full w-full overflow-x-auto overflow-y-auto"
      >
        <div className="flex h-max w-full min-w-max">
          <div className="sticky left-0 z-30 flex w-12 shrink-0 flex-col border-r border-border bg-background md:w-16">
            <div className="sticky top-0 z-40 h-24 shrink-0 border-b border-border bg-background"></div>
            <div className="relative h-[1440px] shrink-0">
              {Array.from({ length: 24 }).map((_, i) => {
                const hour = i
                const ampm = hour >= 12 ? "PM" : "AM"
                const displayHour = hour % 12 === 0 ? 12 : hour % 12
                return (
                  <div
                    key={i}
                    className="absolute flex w-full justify-end pr-2 text-[10px] text-muted-foreground"
                    style={{ top: `${i === 0 ? 2 : i * 60 - 8}px` }}
                  >
                    {displayHour} {ampm}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex min-w-[700px] flex-1">
            {days.map((day, idx) => {
              const isActiveDay = isSameDay(day, selectedDate)

              const dayEvents = events.filter(
                (e) => e.start && isSameDay(e.start, day)
              )

              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const dayEventsCount = events.filter(
                (e) =>
                  e.start && isSameDay(e.start, day) && e.status !== "Cancelled"
              ).length
              const MAX_DAILY_CAPACITY = 5
              const remainingSlots = Math.max(
                0,
                MAX_DAILY_CAPACITY - dayEventsCount
              )
              const isFullyBooked = remainingSlots === 0

              const badgeText = isFullyBooked
                ? "Fully Booked"
                : `${remainingSlots} Slots Available`
              const BadgeIcon = isFullyBooked ? CalendarOff : CalendarIcon
              const showBadge = !isWeekend

              return (
                <div
                  key={idx}
                  className={`relative flex min-w-0 flex-1 flex-col border-r border-border transition-colors ${isActiveDay ? "bg-primary/5" : "hover:bg-accent/40"}`}
                >
                  <div
                    onClick={() => onSelectDate(day)}
                    className="relative sticky top-0 z-20 flex h-24 shrink-0 cursor-pointer flex-col items-center justify-between border-b border-border bg-background/95 px-1 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={`text-xs leading-none font-medium ${isWeekend ? "text-muted-foreground" : "text-foreground"}`}
                      >
                        {format(day, "E")}
                      </span>
                      <div
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isActiveDay ? "bg-primary text-primary-foreground" : isWeekend ? "text-muted-foreground" : "text-foreground"}`}
                      >
                        {format(day, "d")}
                      </div>
                    </div>

                    {showBadge ? (
                      <div className="mt-1 flex w-full justify-center">
                        {isMobile ? (
                          <div
                            title={badgeText}
                            className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold text-white shadow-xs ${isFullyBooked ? "bg-[#ff7373]" : "bg-[#22C55E]"}`}
                          >
                            {isFullyBooked ? (
                              <CalendarOff className="h-2.5 w-2.5" />
                            ) : (
                              remainingSlots
                            )}
                          </div>
                        ) : (
                          <div
                            title={badgeText}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap text-white shadow-xs transition-transform hover:scale-105 ${
                              isFullyBooked
                                ? "border border-[#ff7373]/30 bg-[#ff7373] text-white"
                                : "border border-[#22C55E]/30 bg-[#22C55E] text-white"
                            }`}
                          >
                            <BadgeIcon className="h-2.5 w-2.5 shrink-0" />
                            <span>
                              {isFullyBooked
                                ? "Full"
                                : `${remainingSlots} Slots`}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>

                  <div
                    className="relative h-[1440px] shrink-0 cursor-pointer"
                    onClick={() => onSelectDate(day)}
                  >
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className="pointer-events-none absolute w-full border-t border-sidebar-border/30"
                        style={{ top: `${i * 60}px` }}
                      ></div>
                    ))}

                    {dayEvents.map((event) => {
                      if (!event.start) return null
                      const startHour =
                        event.start.getHours() + event.start.getMinutes() / 60
                      let endHour = event.end
                        ? event.end.getHours() + event.end.getMinutes() / 60
                        : startHour + 1
                      if (endHour <= startHour) endHour = startHour + 1

                      const clampedStartHour = Math.max(
                        0,
                        Math.min(24, startHour)
                      )
                      const clampedEndHour = Math.max(0, Math.min(24, endHour))
                      const duration = clampedEndHour - clampedStartHour

                      const top = clampedStartHour * 60
                      const height = Math.max(30, duration * 60)

                      return (
                        <div
                          key={event.id}
                          className="absolute z-10 w-full px-1"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <CustomEvent event={event} onClick={onSelectEvent} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
