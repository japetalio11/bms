import * as React from "react"
import { useMemo, useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import type { Event as RBCEvent } from "react-big-calendar"
import { Calendar, dateFnsLocalizer } from "react-big-calendar"
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks, startOfDay } from "date-fns"
import { enUS } from "date-fns/locale"

import { CustomToolbar } from "./CustomToolbar"
import { CustomEvent } from "./CustomEvent"
import { WeeklyScheduleView } from "./WeeklyScheduleView"
import { CreateAppointmentModal } from "@/features/appointments/components/CreateAppointmentModal"
import { AppointmentSidepeek } from "@/features/dashboard/components/AppointmentSidepeek"
import { appointmentApi } from "@/features/appointments/api"

import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = {
  "en-US": enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export interface AppEvent extends RBCEvent {
  id?: string
  type?: 'appointment' | 'availability'
  status?: string
  risk?: string
  travelTime?: string
  motherName?: string
  name?: string
  date?: string
}

export function CalendarPage() {
  const isMobile = useIsMobile()
  const isMobileRef = React.useRef(isMobile)
  React.useEffect(() => {
    isMobileRef.current = isMobile
  }, [isMobile])

  const [view, setView] = useState<any>('month')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  
  const [rawAppointments, setRawAppointments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<string[]>([])
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([])
  const [selectedRiskFilters, setSelectedRiskFilters] = useState<string[]>([])

  const fetchAppointments = async () => {
    setIsLoading(true)
    const userStr = localStorage.getItem("user")
    const user = userStr ? JSON.parse(userStr) : null
    try {
      const data = await appointmentApi.getAllFacilityAppointment(user?.facility_id)
      setRawAppointments(data || [])
    } catch (err) {
      console.error("Failed to fetch calendar appointments:", err)
      setRawAppointments([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return
    try {
      await appointmentApi.cancelAppointment(appointmentId)
      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment(null)
      }
      fetchAppointments()
    } catch (err) {
      console.error("Failed to cancel appointment:", err)
      alert("Could not cancel appointment. Please try again.")
    }
  }

  // Swipe gesture handling
  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null)
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndPos(null)
    setTouchStartPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchEndHandler = () => {
    if (!touchStartPos || !touchEndPos) return
    
    const distanceX = touchStartPos.x - touchEndPos.x
    const distanceY = Math.abs(touchStartPos.y - touchEndPos.y)
    
    if (Math.abs(distanceX) > distanceY && Math.abs(distanceX) > minSwipeDistance) {
      const isLeftSwipe = distanceX > minSwipeDistance
      const isRightSwipe = distanceX < -minSwipeDistance

      const views = ["month", "week"]
      const currentIndex = views.indexOf(view)

      if (isLeftSwipe && currentIndex < views.length - 1) {
        setView(views[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setView(views[currentIndex - 1])
      }
    }
  }

  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Transform raw appointments to RBC events and apply toolbar filters
  const events: AppEvent[] = useMemo(() => {
    const list: AppEvent[] = rawAppointments.map((item: any) => {
      const motherUser = item.user || item.patient?.user || item.patient
      const name = [motherUser?.first_name, motherUser?.middle_name, motherUser?.last_name]
        .filter(Boolean)
        .join(" ") || motherUser?.name || "Unknown Mother"

      const risk = item.risk_flag || item.risk_level || item.risk || "Low Risk"
      let status = item.status || "Pending"
      const lowerStatus = status.toLowerCase()
      if (lowerStatus === "confirmed" || lowerStatus === "active" || lowerStatus === "scheduled") {
        status = "Confirmed"
      } else if (lowerStatus === "completed") {
        status = "Completed"
      } else if (lowerStatus === "cancelled") {
        status = "Cancelled"
      } else {
        status = "Pending"
      }

      let startDate = new Date()
      if (item.appointment_date) {
        const parsed = new Date(item.appointment_date)
        if (!isNaN(parsed.getTime())) {
          startDate = parsed
        }
      }
      if (item.appointment_time) {
        const timeMatch = item.appointment_time.match(/(\d+):(\d+)\s*(AM|PM)?/i)
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10)
          const minutes = parseInt(timeMatch[2], 10)
          const ampm = timeMatch[3]
          if (ampm) {
            if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12
            if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0
          }
          startDate.setHours(hours, minutes, 0, 0)
        }
      }

      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

      return {
        id: item.appointment_id || item.id,
        title: `${item.appointment_type || 'Prenatal Checkup'} - ${name}`,
        start: startDate,
        end: endDate,
        allDay: false,
        type: 'appointment' as const,
        motherName: name,
        name,
        risk,
        status,
        date: `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${item.appointment_time || "08:00 AM"}`
      }
    })

    return list.filter((ev) => {
      if (selectedTypeFilters.length > 0) {
        const match = selectedTypeFilters.some(t => (ev.title || '').toLowerCase().includes(t.toLowerCase()))
        if (!match) return false
      }
      if (selectedStatusFilters.length > 0) {
        const match = selectedStatusFilters.some(s => (ev.status || '').toLowerCase().includes(s.toLowerCase()))
        if (!match) return false
      }
      if (selectedRiskFilters.length > 0) {
        const match = selectedRiskFilters.some(r => (ev.risk || '').toLowerCase().includes(r.toLowerCase()))
        if (!match) return false
      }
      return true
    })
  }, [rawAppointments, selectedTypeFilters, selectedStatusFilters, selectedRiskFilters])

  const dayPropGetter = React.useCallback((currentDay: Date) => {
    if (currentDay.getDate() === selectedDate.getDate() && currentDay.getMonth() === selectedDate.getMonth() && currentDay.getFullYear() === selectedDate.getFullYear()) {
      return {
        className: 'bg-white/5 dark:bg-white/10 transition-colors',
      }
    }
    return {}
  }, [selectedDate])

  const CustomDateCellWrapper = ({ children, value }: any) => {
    return React.cloneElement(React.Children.only(children), {
      style: { ...children.props.style, position: 'relative' },
      onClick: (e: any) => {
        if (children.props.onClick) children.props.onClick(e);
        if (isMobile) {
          handleSelectSlot({ start: value });
        }
      },
    })
  }

  const formats = {
    dateFormat: 'd',
    weekdayFormat: 'EEE',
  }

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY' | Date) => {
    if (action instanceof Date) {
      setViewDate(action)
      return
    }

    if (action === 'TODAY') {
      const today = startOfDay(new Date())
      setViewDate(today)
      setSelectedDate(today)
      return
    }

    if (view === 'month') {
      if (action === 'PREV') setViewDate(prev => subMonths(prev, 1))
      if (action === 'NEXT') setViewDate(prev => addMonths(prev, 1))
    } else if (view === 'week') {
      if (action === 'PREV') setViewDate(prev => subWeeks(prev, 1))
      if (action === 'NEXT') setViewDate(prev => addWeeks(prev, 1))
    }
  }

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedDate(slotInfo.start)
    setViewDate(slotInfo.start)
    const day = slotInfo.start.getDay()
    if (!isMobileRef.current && day !== 0 && day !== 6) {
      setIsCreateModalOpen(true)
    }
  }

  const handleSelectEvent = (event: AppEvent) => {
    setSelectedAppointment(event)
  }

  const selectedDateEvents = useMemo(() => {
    return events.filter(e => e.start && selectedDate &&
      e.start.getDate() === selectedDate.getDate() &&
      e.start.getMonth() === selectedDate.getMonth() &&
      e.start.getFullYear() === selectedDate.getFullYear()
    )
  }, [events, selectedDate])

  return (
    <div 
      className="flex flex-col h-full bg-background dark:bg-black p-4 text-foreground relative min-h-0 w-full overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
    >
      {/* Extracted Toolbar */}
      <div className="shrink-0 mb-4 z-10">
        <CustomToolbar
          date={viewDate}
          view={view}
          onViewChange={setView}
          onNavigate={handleNavigate}
          onRefresh={fetchAppointments}
          isLoading={isLoading}
          events={events}
          selectedTypeFilters={selectedTypeFilters}
          setSelectedTypeFilters={setSelectedTypeFilters}
          selectedStatusFilters={selectedStatusFilters}
          setSelectedStatusFilters={setSelectedStatusFilters}
          selectedRiskFilters={selectedRiskFilters}
          setSelectedRiskFilters={setSelectedRiskFilters}
        />
      </div>

      <div className={`flex-1 w-full bg-transparent relative overflow-hidden ${isMobile ? 'flex flex-col' : ''}`}>
        <div
          className={`absolute inset-0 transition-all duration-300 ease-in-out ${view === 'month'
            ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
            : 'opacity-0 -translate-x-4 pointer-events-none z-0'
            }`}
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view="month"
            onView={() => { }}
            date={viewDate}
            onNavigate={handleNavigate}
            selectable
            longPressThreshold={10}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            titleAccessor={(event: AppEvent) => String(event.title || "")}
            dayPropGetter={dayPropGetter}
            components={{
              toolbar: () => null,
              event: (isMobile ? () => null : CustomEvent) as any,
              dateCellWrapper: CustomDateCellWrapper,
            } as any}
            tooltipAccessor={(() => "") as any}
            formats={formats}
            className="w-full h-full custom-calendar"
          />
        </div>

        <div
          className={`absolute inset-0 transition-all duration-300 ease-in-out flex flex-col ${view === 'week'
            ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
            : 'opacity-0 translate-x-4 pointer-events-none z-0'
            }`}
        >
          <WeeklyScheduleView
            viewDate={viewDate}
            selectedDate={selectedDate}
            events={events}
            isMobile={isMobile}
            onSelectDate={(d) => handleSelectSlot({ start: d })}
            onSelectEvent={handleSelectEvent}
          />
        </div>
      </div>

      {/* Mobile Selected Date Events (Bottom Section) */}
      {isMobile && view === 'month' && (
        <div className="shrink-0 mt-4 border-t border-sidebar-border pt-4 pb-28">
          <h3 className="text-sm font-semibold mb-3">Events on {format(selectedDate, 'MMM d, yyyy')}</h3>
          <div className="flex flex-col gap-2 min-h-[60px] max-h-[180px] overflow-y-auto no-scrollbar pr-1">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map(event => (
                <CustomEvent key={event.id} event={event} onClick={handleSelectEvent} />
              ))
            ) : (
              <div className="text-sm text-muted-foreground italic flex items-center justify-center h-full">
                No events on this day
              </div>
            )}
          </div>
        </div>
      )}

      <CreateAppointmentModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen}
        onSuccess={fetchAppointments}
      />

      {/* Desktop Floating Sidepeek Overlay */}
      {!isMobile && (
        <>
          {selectedAppointment && (
            <div 
              className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 transition-opacity"
              onClick={() => setSelectedAppointment(null)}
            />
          )}
          <div
            className={`fixed top-0 right-0 h-screen w-[100%] sm:w-[400px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${selectedAppointment ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <AppointmentSidepeek
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
              onCancelAppointment={handleCancelAppointment}
            />
          </div>
        </>
      )}

      {/* Mobile Sidepeek Drawer */}
      {isMobile && (
        <Drawer open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
          <DrawerContent className="p-0 bg-background dark:bg-[#0a0a0a] border-t border-sidebar-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden !h-[80dvh] flex flex-col focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Appointment Details</DrawerTitle>
            </div>
            <AppointmentSidepeek
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
              onCancelAppointment={handleCancelAppointment}
            />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}

