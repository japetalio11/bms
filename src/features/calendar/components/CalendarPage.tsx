import * as React from "react"
import { useMemo, useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import type { Event as RBCEvent } from "react-big-calendar"
import { Calendar, dateFnsLocalizer } from "react-big-calendar"
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfDay,
} from "date-fns"
import { enUS } from "date-fns/locale"

import { CustomToolbar } from "./CustomToolbar"
import { CustomEvent } from "./CustomEvent"
import { WeeklyScheduleView } from "./WeeklyScheduleView"
import { CreateAppointmentModal } from "@/features/appointments/components/CreateAppointmentModal"
import { AppointmentSidepeek } from "@/features/dashboard/components/AppointmentSidepeek"
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal"
import { toast } from "sonner"
import { appointmentApi } from "@/features/appointments/api"
import { mothersApi } from "@/features/mothers/api"
import { extractRiskLevel, getRiskVariant } from "@/lib/riskUtils"

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
  type?: "appointment" | "availability"
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

  const [view, setView] = useState<any>("month")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)

  const [rawAppointments, setRawAppointments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<string[]>([])
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>(
    []
  )
  const [selectedRiskFilters, setSelectedRiskFilters] = useState<string[]>([])

  const [mothersMap, setMothersMap] = useState<Map<string, any>>(new Map())

  const fetchAppointments = async () => {
    setIsLoading(true)
    const userStr = localStorage.getItem("user")
    const user = userStr ? JSON.parse(userStr) : null
    try {
      const [data, mothers] = await Promise.all([
        appointmentApi.getAllFacilityAppointment(user?.facility_id),
        mothersApi.getActiveMothers(user?.facility_id).catch(() => []),
      ])

      const map = new Map<string, any>()
      if (Array.isArray(mothers)) {
        mothers.forEach((m: any) => {
          const keys = [
            m.id,
            m._id,
            m.mother_id,
            m.user_id,
            m.user?.user_id,
          ].filter(Boolean)
          keys.forEach((k) => map.set(k, m))
        })
      }
      setMothersMap(map)
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

  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(
    null
  )
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancelAppointment = (appointmentId: string) => {
    const appt = rawAppointments.find(
      (a: any) => a.id === appointmentId || a.appointment_id === appointmentId
    )
    if (appt && appt.status?.toLowerCase() === "completed") {
      toast.error("Completed appointments cannot be cancelled.")
      return
    }
    setAppointmentToCancel(appointmentId)
  }

  const executeCancelAppointment = async () => {
    if (!appointmentToCancel) return
    setIsCancelling(true)
    try {
      await appointmentApi.cancelAppointment(appointmentToCancel)
      if (selectedAppointment?.id === appointmentToCancel) {
        setSelectedAppointment(null)
      }
      toast.success("Appointment cancelled successfully")
      setAppointmentToCancel(null)
      fetchAppointments()
    } catch (err) {
      console.error("Failed to cancel appointment:", err)
      toast.error("Could not cancel appointment. Please try again.")
    } finally {
      setIsCancelling(false)
    }
  }

  const [touchStartPos, setTouchStartPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const [touchEndPos, setTouchEndPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndPos(null)
    setTouchStartPos({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndPos({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const onTouchEndHandler = () => {
    if (!touchStartPos || !touchEndPos) return

    const distanceX = touchStartPos.x - touchEndPos.x
    const distanceY = Math.abs(touchStartPos.y - touchEndPos.y)

    if (
      Math.abs(distanceX) > distanceY &&
      Math.abs(distanceX) > minSwipeDistance
    ) {
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
  const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null
  const currentUser = userStr ? JSON.parse(userStr) : null
  const isAdmin =
    currentUser?.role === "SystemAdmin" ||
    currentUser?.role === "Admin" ||
    currentUser?.role === "Administrator" ||
    currentUser?.role === "FacilityAdmin"
  const currentUserId = currentUser?.user_id || currentUser?.id

  const events: AppEvent[] = useMemo(() => {
    const list: AppEvent[] = rawAppointments
      .filter((item: any) => {
        if (isAdmin || !currentUserId) return true

        const targetKey =
          item.mother_id || item.user_id || item.motherId || item.userId
        const matchedMother = targetKey ? mothersMap.get(targetKey) : null

        const isDirectWorker =
          item.user_id === currentUserId ||
          item.userId === currentUserId ||
          item.assigned_worker_id === currentUserId ||
          item.created_by_id === currentUserId

        if (isDirectWorker) return true

        if (matchedMother) {
          const assignedWorkerId =
            matchedMother.assigned_worker_id ||
            matchedMother.assignedWorker?.user_id ||
            matchedMother.assigned_worker?.user_id ||
            matchedMother.created_by_id ||
            matchedMother.creator?.user_id
          return assignedWorkerId === currentUserId
        }

        return false
      })
      .map((item: any) => {
      const targetKey =
        item.mother_id || item.user_id || item.motherId || item.userId
      const matchedMother = targetKey ? mothersMap.get(targetKey) : null
      const motherUser =
        item.user ||
        item.patient?.user ||
        item.patient ||
        matchedMother?.user ||
        matchedMother

      const name =
        [
          motherUser?.first_name || matchedMother?.first_name,
          motherUser?.middle_name || matchedMother?.middle_name,
          motherUser?.last_name || matchedMother?.last_name,
        ]
          .filter(Boolean)
          .join(" ") ||
        motherUser?.name ||
        matchedMother?.name ||
        "Unknown Mother"

      const currentPregnancy =
        matchedMother?.pregnancies?.[0] || matchedMother?.pregnancy
      const visits = [
        ...(matchedMother?.prenatalVisits || []),
        ...(currentPregnancy?.prenatalVisits || []),
        ...(Array.isArray(matchedMother?.pregnancies)
          ? matchedMother.pregnancies.flatMap((p: any) => p.prenatalVisits || [])
          : []),
      ]

      const risk = extractRiskLevel(
        matchedMother || item,
        matchedMother?.pregnancies,
        visits
      )
      let status = item.status || "Pending"
      const lowerStatus = status.toLowerCase()
      if (
        lowerStatus === "confirmed" ||
        lowerStatus === "active" ||
        lowerStatus === "scheduled"
      ) {
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
        raw: item,
        mother_id:
          item.mother_id ||
          matchedMother?.mother_id ||
          matchedMother?.id ||
          item.user_id,
        user_id: item.user_id || matchedMother?.user_id,
        pregnancy_id:
          item.pregnancy_id ||
          matchedMother?.pregnancies?.[0]?.pregnancy_id ||
          matchedMother?.pregnancies?.[0]?.id,
        mother: matchedMother,
        title: `${item.appointment_type || "Prenatal Checkup"} - ${name}`,
        start: startDate,
        end: endDate,
        allDay: false,
        type: "appointment" as const,
        motherName: name,
        name,
        risk,
        status,
        date: `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${item.appointment_time || "08:00 AM"}`,
      }
    })

    return list.filter((ev) => {
      if (selectedTypeFilters.length > 0) {
        const match = selectedTypeFilters.some((t) =>
          String(ev.title || "")
            .toLowerCase()
            .includes(t.toLowerCase())
        )
        if (!match) return false
      }
      if (selectedStatusFilters.length > 0) {
        const match = selectedStatusFilters.some((s) =>
          String(ev.status || "")
            .toLowerCase()
            .includes(s.toLowerCase())
        )
        if (!match) return false
      }
      if (selectedRiskFilters.length > 0) {
        const evVariant = getRiskVariant(ev.risk)
        const match = selectedRiskFilters.some(
          (r) => evVariant === getRiskVariant(r)
        )
        if (!match) return false
      }
      return true
    })
  }, [
    rawAppointments,
    selectedTypeFilters,
    selectedStatusFilters,
    selectedRiskFilters,
  ])

  const dayPropGetter = React.useCallback(
    (currentDay: Date) => {
      if (
        currentDay.getDate() === selectedDate.getDate() &&
        currentDay.getMonth() === selectedDate.getMonth() &&
        currentDay.getFullYear() === selectedDate.getFullYear()
      ) {
        return {
          className: "bg-white/5 dark:bg-white/10 transition-colors",
        }
      }
      return {}
    },
    [selectedDate]
  )

  const CustomDateCellWrapper = ({ children, value }: any) => {
    return React.cloneElement(React.Children.only(children), {
      style: { ...children.props.style, position: "relative" },
      onClick: (e: any) => {
        if (children.props.onClick) children.props.onClick(e)
        if (isMobile) {
          handleSelectSlot({ start: value })
        }
      },
    })
  }

  const formats = {
    dateFormat: "d",
    weekdayFormat: "EEE",
  }

  const handleNavigate = (action: "PREV" | "NEXT" | "TODAY" | Date) => {
    if (action instanceof Date) {
      setViewDate(action)
      return
    }

    if (action === "TODAY") {
      const today = startOfDay(new Date())
      setViewDate(today)
      setSelectedDate(today)
      return
    }

    if (view === "month") {
      if (action === "PREV") setViewDate((prev) => subMonths(prev, 1))
      if (action === "NEXT") setViewDate((prev) => addMonths(prev, 1))
    } else if (view === "week") {
      if (action === "PREV") setViewDate((prev) => subWeeks(prev, 1))
      if (action === "NEXT") setViewDate((prev) => addWeeks(prev, 1))
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
    return events.filter(
      (e) =>
        e.start &&
        selectedDate &&
        e.start.getDate() === selectedDate.getDate() &&
        e.start.getMonth() === selectedDate.getMonth() &&
        e.start.getFullYear() === selectedDate.getFullYear()
    )
  }, [events, selectedDate])

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-background p-4 text-foreground"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
    >
      <div className="z-10 mb-4 shrink-0">
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

      <div
        className={`relative w-full flex-1 overflow-hidden bg-transparent ${isMobile ? "flex flex-col" : ""}`}
      >
        <div
          className={`absolute inset-0 transition-all duration-300 ease-in-out ${
            view === "month"
              ? "pointer-events-auto z-10 translate-x-0 opacity-100"
              : "pointer-events-none z-0 -translate-x-4 opacity-0"
          }`}
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view="month"
            onView={() => {}}
            date={viewDate}
            onNavigate={handleNavigate}
            selectable
            longPressThreshold={10}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            titleAccessor={(event: AppEvent) => String(event.title || "")}
            dayPropGetter={dayPropGetter}
            components={
              {
                toolbar: () => null,
                event: (isMobile ? () => null : CustomEvent) as any,
                dateCellWrapper: CustomDateCellWrapper,
              } as any
            }
            tooltipAccessor={(() => "") as any}
            formats={formats}
            className="custom-calendar h-full w-full"
          />
        </div>

        <div
          className={`absolute inset-0 flex flex-col transition-all duration-300 ease-in-out ${
            view === "week"
              ? "pointer-events-auto z-10 translate-x-0 opacity-100"
              : "pointer-events-none z-0 translate-x-4 opacity-0"
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

      {isMobile && view === "month" && (
        <div className="mt-4 shrink-0 border-t border-sidebar-border pt-4 pb-28">
          <h3 className="mb-3 text-sm font-semibold">
            Events on {format(selectedDate, "MMM d, yyyy")}
          </h3>
          <div className="no-scrollbar flex max-h-[180px] min-h-[60px] flex-col gap-2 overflow-y-auto pr-1">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event) => (
                <CustomEvent
                  key={event.id}
                  event={event}
                  onClick={handleSelectEvent}
                />
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground italic">
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

      {!isMobile && (
        <>
          {selectedAppointment && (
            <div
              className="fixed inset-0 z-40 bg-black/20 transition-opacity dark:bg-black/40"
              onClick={() => setSelectedAppointment(null)}
            />
          )}
          <div
            className={`fixed top-0 right-0 z-50 h-screen w-[100%] shadow-2xl transition-transform duration-300 ease-in-out sm:w-[400px] ${selectedAppointment ? "translate-x-0" : "translate-x-full"}`}
          >
            <AppointmentSidepeek
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
              onCancelAppointment={handleCancelAppointment}
              onStatusChange={(id, newStatus, newRisk) => {
                setRawAppointments((prev) =>
                  prev.map((a) => {
                    const targetId = a.appointment_id || a.id
                    if (targetId === id) {
                      return {
                        ...a,
                        status: newStatus,
                        ...(newRisk
                          ? {
                              risk: newRisk,
                              risk_level: newRisk,
                              risk_flag: newRisk,
                            }
                          : {}),
                      }
                    }
                    return a
                  })
                )
                setSelectedAppointment((prev: any) =>
                  prev
                    ? {
                        ...prev,
                        status: newStatus,
                        ...(newRisk
                          ? {
                              risk: newRisk,
                              risk_level: newRisk,
                              risk_flag: newRisk,
                            }
                          : {}),
                      }
                    : null
                )
              }}
            />
          </div>
        </>
      )}

      {isMobile && (
        <Drawer
          open={!!selectedAppointment}
          onOpenChange={(open) => !open && setSelectedAppointment(null)}
        >
          <DrawerContent className="flex !h-[80dvh] flex-col overflow-hidden rounded-t-xl border-x-0 border-t border-b-0 border-border bg-card p-0 text-card-foreground before:hidden focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Appointment Details</DrawerTitle>
            </div>
            <AppointmentSidepeek
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
              onCancelAppointment={handleCancelAppointment}
              onStatusChange={(id, newStatus, newRisk) => {
                setRawAppointments((prev) =>
                  prev.map((a) => {
                    const targetId = a.appointment_id || a.id
                    if (targetId === id) {
                      return {
                        ...a,
                        status: newStatus,
                        ...(newRisk
                          ? {
                              risk: newRisk,
                              risk_level: newRisk,
                              risk_flag: newRisk,
                            }
                          : {}),
                      }
                    }
                    return a
                  })
                )
                setSelectedAppointment((prev: any) =>
                  prev
                    ? {
                        ...prev,
                        status: newStatus,
                        ...(newRisk
                          ? {
                              risk: newRisk,
                              risk_level: newRisk,
                              risk_flag: newRisk,
                            }
                          : {}),
                      }
                    : null
                )
              }}
            />
          </DrawerContent>
        </Drawer>
      )}

      <ConfirmDeleteModal
        open={!!appointmentToCancel}
        onOpenChange={(open) => !open && setAppointmentToCancel(null)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment? This record will be marked as cancelled in the facility queue."
        confirmText="Cancel Appointment"
        isDeleting={isCancelling}
        onConfirm={executeCancelAppointment}
      />
    </div>
  )
}
