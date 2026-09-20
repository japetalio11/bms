import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AppointmentSidepeek } from "@/features/dashboard/components/AppointmentSidepeek"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  RefreshCw,
  PlusCircle,
  MoreVertical,
  Activity,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Filter,
  CalendarDays,
  Loader2,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { UnifiedTableLoader } from "@/components/ui/unified-table-loader"

import { CreateAppointmentModal } from "./CreateAppointmentModal"
import { ExportAppointmentsDataModal } from "./ExportAppointmentsDataModal"
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { appointmentApi } from "../api"
import { db } from "@/lib/db/bmsDatabase"
import { extractRiskLevel } from "@/lib/riskUtils"

export function AppointmentListPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>(
    []
  )
  const [selectedRiskFilters, setSelectedRiskFilters] = useState<string[]>([])
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<string[]>([])

  const [appointmentList, setAppointmentList] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const [mothersMap, setMothersMap] = useState<Map<string, any>>(new Map())

  const fetchAppointments = async () => {
    setIsLoading(true)
    const userStr = localStorage.getItem("user")
    const user = userStr ? JSON.parse(userStr) : null

    try {
      const appointments = await appointmentApi.getAllFacilityAppointment(
        user?.facility_id
      )
      setAppointmentList(appointments || [])

      db.mothers
        .toArray()
        .then((cachedMothers) => {
          const map = new Map<string, any>()
          if (Array.isArray(cachedMothers)) {
            cachedMothers.forEach((m: any) => {
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
        })
        .catch(() => {})
    } catch (error) {
      console.error("Failed to fetch appointments:", error)
      setAppointmentList([])
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
    const appt = appointmentList.find(
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
    const appt = appointmentList.find(
      (a: any) =>
        a.id === appointmentToCancel || a.appointment_id === appointmentToCancel
    )
    if (appt && appt.status?.toLowerCase() === "completed") {
      toast.error("Completed appointments cannot be cancelled.")
      setAppointmentToCancel(null)
      return
    }
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

  const formattedAppointments = appointmentList.map((item: any) => {
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

    const risk = extractRiskLevel(
      matchedMother || item,
      matchedMother?.pregnancies,
      matchedMother?.prenatalVisits
    )

    let dateStr = "N/A"
    if (item.appointment_date) {
      const d = new Date(item.appointment_date)
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      }
    }
    if (item.appointment_time) {
      dateStr =
        dateStr !== "N/A"
          ? `${dateStr} - ${item.appointment_time}`
          : item.appointment_time
    }

    const appDate = item.appointment_date
      ? new Date(item.appointment_date)
      : null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isPast = appDate ? appDate < today : false

    let status = item.status || "Pending"
    const lowerStatus = status.toLowerCase()
    if (lowerStatus === "completed") {
      status = "Completed"
    } else if (lowerStatus === "cancelled") {
      status = "Cancelled"
    } else if (isPast) {
      status = "Missed"
    } else if (
      lowerStatus === "confirmed" ||
      lowerStatus === "active" ||
      lowerStatus === "scheduled"
    ) {
      status = "Confirmed"
    } else {
      status = "Pending"
    }

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
      name,
      risk,
      status,
      isPast,
      type: item.appointment_type || "Prenatal Checkup",
      date: dateStr,
      rawDate: item.appointment_date,
    }
  })

  const filteredAppointments = formattedAppointments.filter((appointment) => {
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase()
      const matchName = appointment.name.toLowerCase().includes(q)
      const matchType = appointment.type.toLowerCase().includes(q)
      if (!matchName && !matchType) return false
    }

    if (activeTab === "upcoming") {
      if (
        appointment.isPast ||
        appointment.status === "Cancelled" ||
        appointment.status === "Completed" ||
        appointment.status === "Missed"
      )
        return false
    } else if (activeTab === "completed") {
      if (appointment.status !== "Completed") return false
    } else if (activeTab === "cancelled") {
      if (appointment.status !== "Cancelled") return false
    }

    if (selectedStatusFilters.length > 0) {
      const match = selectedStatusFilters.some((s) =>
        appointment.status.toLowerCase().includes(s.toLowerCase())
      )
      if (!match) return false
    }

    if (selectedRiskFilters.length > 0) {
      const match = selectedRiskFilters.some((r) =>
        appointment.risk.toLowerCase().includes(r.toLowerCase())
      )
      if (!match) return false
    }

    if (selectedTypeFilters.length > 0) {
      const match = selectedTypeFilters.some((t) =>
        appointment.type.toLowerCase().includes(t.toLowerCase())
      )
      if (!match) return false
    }

    return true
  })

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / pageSize)
  )
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleFilter = (
    list: string[],
    setList: (val: string[]) => void,
    item: string
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item))
    } else {
      setList([...list, item])
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

      const tabs = ["all", "upcoming", "ongoing", "completed"]
      const currentIndex = tabs.indexOf(activeTab)

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1])
      }
    }
  }

  return (
    <div className="relative flex h-full w-full items-start overflow-hidden">
      <div
        className="relative flex h-full w-full min-w-0 flex-col overflow-y-auto text-foreground"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-background p-4 pr-4 pb-4 pl-3 md:border-none">
          <div className="-mb-2 w-full shrink-0 [scrollbar-width:none] overflow-x-auto pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val)
                setCurrentPage(1)
              }}
              className="w-full md:w-max"
            >
              <TabsList className="h-9 w-full justify-start gap-1 rounded-lg border border-border bg-muted p-1 *:flex-1 md:w-max md:*:flex-initial">
                <TabsTrigger
                  value="all"
                  className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  All / Queue
                </TabsTrigger>
                <TabsTrigger
                  value="upcoming"
                  className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  Upcoming
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  Completed
                </TabsTrigger>
                <TabsTrigger
                  value="cancelled"
                  className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  Cancelled
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
              <div className="flex w-full items-center gap-2 md:w-auto">
                <Input
                  placeholder="Search appointments..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-8 w-full border-border bg-card px-2 text-xs font-normal sm:w-[250px]"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden h-8 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Appointment Status{" "}
                    {selectedStatusFilters.length > 0 &&
                      `(${selectedStatusFilters.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex w-[200px] flex-col gap-3 p-3"
                  align="start"
                >
                  <div className="flex flex-col gap-2.5">
                    {["Pending", "Confirmed", "Completed", "Cancelled"].map(
                      (option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`filter-status-${option}`}
                            checked={selectedStatusFilters.includes(option)}
                            onCheckedChange={() =>
                              toggleFilter(
                                selectedStatusFilters,
                                setSelectedStatusFilters,
                                option
                              )
                            }
                            className="h-3.5 w-3.5 rounded-[4px]"
                          />
                          <label
                            htmlFor={`filter-status-${option}`}
                            className="cursor-pointer text-xs font-normal"
                          >
                            {option}
                          </label>
                        </div>
                      )
                    )}
                  </div>
                  {selectedStatusFilters.length > 0 && (
                    <Button
                      onClick={() => setSelectedStatusFilters([])}
                      className="h-7 w-full text-xs"
                    >
                      Clear Filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden h-8 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Risk Flag{" "}
                    {selectedRiskFilters.length > 0 &&
                      `(${selectedRiskFilters.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex w-[200px] flex-col gap-3 p-3"
                  align="start"
                >
                  <div className="flex flex-col gap-2.5">
                    {["Low Risk", "Moderate", "High Risk"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-risk-${option}`}
                          checked={selectedRiskFilters.includes(option)}
                          onCheckedChange={() =>
                            toggleFilter(
                              selectedRiskFilters,
                              setSelectedRiskFilters,
                              option
                            )
                          }
                          className="h-3.5 w-3.5 rounded-[4px]"
                        />
                        <label
                          htmlFor={`filter-risk-${option}`}
                          className="cursor-pointer text-xs font-normal"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedRiskFilters.length > 0 && (
                    <Button
                      onClick={() => setSelectedRiskFilters([])}
                      className="h-7 w-full text-xs"
                    >
                      Clear Filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden h-8 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Type{" "}
                    {selectedTypeFilters.length > 0 &&
                      `(${selectedTypeFilters.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex w-[200px] flex-col gap-3 p-3"
                  align="start"
                >
                  <div className="flex flex-col gap-2.5">
                    {["Prenatal", "Postpartum", "High-Risk", "General"].map(
                      (option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`filter-type-${option}`}
                            checked={selectedTypeFilters.includes(option)}
                            onCheckedChange={() =>
                              toggleFilter(
                                selectedTypeFilters,
                                setSelectedTypeFilters,
                                option
                              )
                            }
                            className="h-3.5 w-3.5 rounded-[4px]"
                          />
                          <label
                            htmlFor={`filter-type-${option}`}
                            className="cursor-pointer text-xs font-normal"
                          >
                            {option}
                          </label>
                        </div>
                      )
                    )}
                  </div>
                  {selectedTypeFilters.length > 0 && (
                    <Button
                      onClick={() => setSelectedTypeFilters([])}
                      className="h-7 w-full text-xs"
                    >
                      Clear Filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex w-full items-center gap-2 xl:w-auto">
              <ExportAppointmentsDataModal appointments={filteredAppointments}>
                <Button
                  variant="outline"
                  className="hidden h-8 gap-2 border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </ExportAppointmentsDataModal>

              <Button
                variant="outline"
                onClick={fetchAppointments}
                className="hidden h-8 gap-2 border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

              <CreateAppointmentModal onSuccess={fetchAppointments}>
                <Button className="h-8 w-full gap-2 bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 md:w-auto">
                  <PlusCircle className="h-3.5 w-3.5" />
                  New Appointment
                </Button>
              </CreateAppointmentModal>
            </div>
          </div>

          <div className="mt-2 flex w-full items-center justify-between border-t border-sidebar-border pt-4 text-xs text-muted-foreground md:hidden">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="h-7 w-7 border-sidebar-border bg-transparent"
              >
                <ChevronsLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="h-7 w-7 border-sidebar-border bg-transparent"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                className="h-7 w-7 border-sidebar-border bg-transparent"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="h-7 w-7 border-sidebar-border bg-transparent"
              >
                <ChevronsRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 pr-4 pb-24 pl-3 md:pt-0 md:pb-4">
          <UnifiedTableLoader
            isLoading={isLoading}
            label="Loading appointments..."
          >
            {!isLoading && filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
                <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground opacity-50" />
                <h3 className="text-sm font-semibold text-card-foreground">
                  No Appointments Found
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Try adjusting your filters or schedule a new appointment to get started.
                </p>
                <CreateAppointmentModal onSuccess={fetchAppointments}>
                  <Button
                    className="mt-4 h-8 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Schedule Appointment
                  </Button>
                </CreateAppointmentModal>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 md:hidden">
                  {isLoading && filteredAppointments.length === 0
                    ? [...Array(3)].map((_, i) => (
                        <div
                          key={`appointment-skel-card-${i}`}
                          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground"
                        >
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-16 rounded-sm" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-3/4" />
                          </div>
                        </div>
                      ))
                    : paginatedAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`flex cursor-pointer flex-col gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground transition-colors ${selectedAppointment?.id === appointment.id ? "ring-1 ring-ring" : "hover:bg-accent"}`}
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              {appointment.name}
                            </h3>
                            <Badge
                              className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${appointment.risk.toLowerCase().includes("high") ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}
                            >
                              <Activity className="h-3 w-3" />
                              {appointment.risk}
                            </Badge>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Appointment Status
                              </span>
                              <Badge
                                className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${appointment.status === "Confirmed" ? "bg-blue-500/10 text-blue-500" : appointment.status === "Cancelled" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                {appointment.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Type
                              </span>
                              <span className="text-xs text-foreground">
                                {appointment.type}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Date & Time
                              </span>
                              <span className="text-xs text-foreground">
                                {appointment.date}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end border-t border-border pt-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-[200px] rounded-xl border-border shadow-md"
                              >
                                <DropdownMenuItem
                                  className="cursor-pointer rounded-md text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedAppointment(appointment)
                                  }}
                                >
                                  View Details
                                </DropdownMenuItem>
                                {appointment.status !== "Cancelled" &&
                                  appointment.status !== "Completed" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="cursor-pointer rounded-md text-xs text-[#ff7373] focus:bg-[#ff7373]/10 focus:text-[#ff7373]"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleCancelAppointment(
                                            appointment.id
                                          )
                                        }}
                                      >
                                        Cancel Appointment
                                      </DropdownMenuItem>
                                    </>
                                  )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-xs md:block">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="w-12 pl-4 text-center">
                            <Checkbox className="border-border" />
                          </TableHead>
                          <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                            Mother Name
                          </TableHead>
                          <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                            Risk Flag
                          </TableHead>
                          <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                            Appointment Status
                          </TableHead>
                          <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                            Type
                          </TableHead>
                          <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                            Date & Time
                          </TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading && filteredAppointments.length === 0
                          ? [...Array(5)].map((_, i) => (
                              <TableRow
                                key={`appointment-skel-${i}`}
                                className="border-border"
                              >
                                <TableCell className="pl-4">
                                  <Skeleton className="h-4 w-4 rounded" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-5 w-20 rounded-sm" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-5 w-24 rounded-sm" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-20" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-28" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-6 w-6 rounded-md" />
                                </TableCell>
                              </TableRow>
                            ))
                          : paginatedAppointments.map((appointment) => (
                              <TableRow
                                key={appointment.id}
                                className={`group cursor-pointer border-border transition-colors ${selectedAppointment?.id === appointment.id ? "bg-muted/70" : "hover:bg-muted/50"}`}
                                onClick={() =>
                                  setSelectedAppointment(appointment)
                                }
                              >
                                <TableCell
                                  className="pl-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox className="border-border" />
                                </TableCell>
                                <TableCell className="text-xs font-medium whitespace-nowrap text-foreground">
                                  {appointment.name}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${appointment.risk.toLowerCase().includes("high") ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}
                                  >
                                    <Activity className="h-3 w-3" />
                                    {appointment.risk}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${appointment.status === "Confirmed" ? "bg-blue-500/10 text-blue-500" : appointment.status === "Cancelled" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    {appointment.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap text-foreground">
                                  {appointment.type}
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap text-foreground">
                                  {appointment.date}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-foreground"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-[200px] rounded-xl border-border shadow-md"
                                    >
                                      <DropdownMenuItem
                                        className="cursor-pointer rounded-md text-xs"
                                        onClick={() =>
                                          setSelectedAppointment(appointment)
                                        }
                                      >
                                        View Details
                                      </DropdownMenuItem>
                                      {appointment.status !== "Cancelled" &&
                                        appointment.status !== "Completed" && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              className="cursor-pointer rounded-md text-xs text-[#ff7373] focus:bg-[#ff7373]/10 focus:text-[#ff7373]"
                                              onClick={() =>
                                                handleCancelAppointment(
                                                  appointment.id
                                                )
                                              }
                                            >
                                              Cancel Appointment
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </UnifiedTableLoader>

          {!isLoading && filteredAppointments.length > 0 && (
            <div className="mt-2 hidden flex-row items-center justify-between gap-4 text-xs text-muted-foreground md:flex">
              <div>Total {filteredAppointments.length} appointment(s)</div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <div className="flex items-center justify-between gap-2 rounded-md border border-sidebar-border bg-card px-2 py-1 dark:bg-[#111]">
                    <span>10</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(1)}
                      className="h-7 w-7 border-sidebar-border bg-transparent"
                    >
                      <ChevronsLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage <= 1}
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      className="h-7 w-7 border-sidebar-border bg-transparent"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      className="h-7 w-7 border-sidebar-border bg-transparent"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="h-7 w-7 border-sidebar-border bg-transparent"
                    >
                      <ChevronsRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isMobile && (
        <>
          {selectedAppointment && (
            <div
              className="fixed inset-0 z-40 bg-black/20 transition-opacity dark:bg-black/40"
              onClick={() => setSelectedAppointment(null)}
            />
          )}
          <div
            className={`fixed top-0 right-0 z-50 h-screen w-[100%] shadow-2xl transition-transform duration-300 ease-in-out sm:w-[450px] ${selectedAppointment ? "translate-x-0" : "translate-x-full"}`}
          >
            <AppointmentSidepeek
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
              onCancelAppointment={handleCancelAppointment}
              onStatusChange={(id, newStatus, newRisk) => {
                setAppointmentList((prev) =>
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
          <DrawerContent className="flex !h-[80dvh] flex-col overflow-hidden rounded-t-xl border-x-0 border-t border-b-0 border-border bg-card p-0 text-card-foreground shadow-2xl before:hidden focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Appointment Details</DrawerTitle>
            </div>
            <AppointmentSidepeek
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
              onCancelAppointment={handleCancelAppointment}
              onStatusChange={(id, newStatus, newRisk) => {
                setAppointmentList((prev) =>
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
