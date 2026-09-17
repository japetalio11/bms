import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  MoreVertical,
  Plus,
  Download,
  Activity,
  CheckCircle2,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AppointmentSidepeek } from "./AppointmentSidepeek"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { isToday, isFuture, parseISO, format } from "date-fns"
import { appointmentRepository } from "@/lib/repositories/appointmentRepository"
import { motherRepository } from "@/lib/repositories/motherRepository"
import { extractRiskLevel } from "@/lib/riskUtils"
import { CreateAppointmentModal } from "@/features/appointments/components/CreateAppointmentModal"

export function DashboardPage() {
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const currentUser = useLiveQuery(() => db.userSession.get("current_user"))
  const firstName = currentUser?.first_name || "User"
  const facilityId = currentUser?.facility_id

  useEffect(() => {
    const initDashboardData = async () => {
      try {
        await Promise.all([
          motherRepository.getActiveMothers(facilityId).catch(() => {}),
          appointmentRepository
            .getAllFacilityAppointments(facilityId)
            .catch(() => {}),
        ])
      } catch (err) {
        console.warn("[DashboardPage] Initial sync warning:", err)
      }
    }
    initDashboardData()
  }, [facilityId])

  const activePregnanciesCount =
    useLiveQuery(async () => {
      const pCount = await db.pregnancies.count()
      if (pCount > 0) return pCount
      const mCount = await db.mothers.count()
      return mCount
    }, []) ?? 0

  const pendingSyncsCount = useLiveQuery(() => db.offlineQueue.count(), []) ?? 0

  const enrichedAppointments =
    useLiveQuery(async () => {
      const [apps, mothers] = await Promise.all([
        db.appointments.toArray(),
        db.mothers.toArray(),
      ])

      const motherNameMap = new Map<string, string>()
      for (const m of mothers) {
        const name =
          `${m.first_name || m.user?.first_name || ""} ${m.last_name || m.user?.last_name || ""}`.trim()
        if (name) {
          if (m.id) motherNameMap.set(m.id, name)
          if (m.mother_id) motherNameMap.set(m.mother_id, name)
          if (m.user_id) motherNameMap.set(m.user_id, name)
          if (m._id) motherNameMap.set(m._id, name)
        }
      }

      return apps.map((app) => {
        const targetId = app.mother_id || app.user_id
        let motherName = (targetId && motherNameMap.get(targetId)) || ""

        if (!motherName && app.user) {
          motherName =
            `${app.user.first_name || ""} ${app.user.last_name || ""}`.trim()
        }
        if (!motherName) {
          motherName = app.patient_name || app.motherName || "Patient"
        }
        return { ...app, motherName }
      })
    }, []) ?? []

  const todayAppointments = enrichedAppointments.filter((app) => {
    if (
      !app.appointment_date ||
      app.status === "cancelled" ||
      app.status === "Cancelled"
    )
      return false
    try {
      const dateStr = app.appointment_date.split("T")[0]
      const todayStr = new Date().toISOString().split("T")[0]
      return dateStr === todayStr || isToday(parseISO(app.appointment_date))
    } catch {
      return false
    }
  })

  const upcomingAppointments = enrichedAppointments.filter((app) => {
    if (
      !app.appointment_date ||
      app.status === "cancelled" ||
      app.status === "Cancelled" ||
      app.status === "completed" ||
      app.status === "Completed"
    )
      return false
    try {
      const dateStr = app.appointment_date.split("T")[0]
      const todayStr = new Date().toISOString().split("T")[0]
      return (
        dateStr > todayStr ||
        (isFuture(parseISO(app.appointment_date)) &&
          !isToday(parseISO(app.appointment_date)))
      )
    } catch {
      return false
    }
  })

  const completedAppointments = enrichedAppointments.filter(
    (app) => app.status === "completed" || app.status === "Completed"
  )
  const cancelledAppointments = enrichedAppointments.filter(
    (app) => app.status === "cancelled" || app.status === "Cancelled"
  )

  const [highRiskCount, setHighRiskCount] = useState<number>(0)

  useEffect(() => {
    const fetchHighRiskProfiles = async () => {
      let remoteSuccess = false
      if (navigator.onLine && facilityId) {
        try {
          const baseUrl =
            import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"
          const token = localStorage.getItem("token")
          const response = await fetch(
            `${baseUrl}/api/v1/cdss/facility/${facilityId}/high-risk`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
          if (response.ok) {
            const data = await response.json()
            setHighRiskCount(
              data.count || (Array.isArray(data.data) ? data.data.length : 0)
            )
            remoteSuccess = true
          }
        } catch (error) {
          console.warn("CDSS high-risk remote query error", error)
        }
      }

      if (!remoteSuccess) {
        try {
          const mothers = await db.mothers.toArray()
          const localHighRisk = mothers.filter(
            (m) => extractRiskLevel(m) === "High Risk"
          ).length
          setHighRiskCount(localHighRisk)
        } catch {
          setHighRiskCount(0)
        }
      }
    }
    fetchHighRiskProfiles()
  }, [facilityId])

  const handleRefresh = async () => {
    toast.info("Refreshing dashboard data...")
    try {
      await Promise.all([
        motherRepository.getActiveMothers(facilityId).catch(() => {}),
        appointmentRepository
          .getAllFacilityAppointments(facilityId)
          .catch(() => {}),
      ])
      toast.success("Dashboard refreshed")
    } catch (err) {
      toast.error("Failed to refresh data")
    }
  }

  const handleExportCSV = () => {
    if (enrichedAppointments.length === 0) {
      toast.info("No appointments to export")
      return
    }
    const headers = [
      "Mother Name",
      "Status",
      "Type",
      "Date & Time",
      "Facility ID",
    ]
    const rows = enrichedAppointments.map((app) => [
      `"${app.motherName || ""}"`,
      `"${app.status || "Scheduled"}"`,
      `"${app.type || (app as any).appointment_type || "Prenatal"}"`,
      `"${formatDateTime(app.appointment_date, app.time_slot)}"`,
      `"${app.facility_id || ""}"`,
    ])
    const csvString = [headers.join(","), ...rows.map((e) => e.join(","))].join(
      "\n"
    )
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `Appointments_Export_${new Date().toISOString().split("T")[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("Appointments exported to CSV")
  }

  const handleCancelAppointment = async (
    appId: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation()
    const app = enrichedAppointments.find(
      (a: any) => a.id === appId || a.appointment_id === appId
    )
    if (app && (app.status === "completed" || app.status === "Completed")) {
      toast.error("Completed appointments cannot be cancelled.")
      return
    }
    try {
      await appointmentRepository.cancelAppointment(appId)
      toast.success("Appointment cancelled")
    } catch (err) {
      toast.error("Failed to cancel appointment")
    }
  }

  const formatDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return "N/A"
    try {
      const d = parseISO(dateStr)
      const formattedDate = format(d, "MMMM d, yyyy")
      const formattedTime = timeStr || format(d, "h:mm a")
      return `${formattedDate} - ${formattedTime}`
    } catch {
      return dateStr
    }
  }

  const renderAppointmentList = (appointments: any[]) => {
    if (appointments.length === 0) {
      return (
        <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed border-sidebar-border text-sm text-muted-foreground">
          No appointments found for this category.
        </div>
      )
    }

    return (
      <>
        <div className="flex flex-col gap-4 md:hidden">
          {appointments.map((app, idx) => (
            <div
              key={app.id || idx}
              className="flex cursor-pointer flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-foreground/20"
              onClick={() =>
                setSelectedAppointment({
                  ...app,
                  datetime: formatDateTime(app.appointment_date, app.time_slot),
                })
              }
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {app.motherName}
                </h3>
                {app.status === "cancelled" && (
                  <Badge className="inline-flex shrink-0 items-center gap-1 rounded-sm border-none bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-500 shadow-none">
                    Cancelled
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Appointment Status
                  </span>
                  <Badge
                    className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${app.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {app.status || "Scheduled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <span className="text-xs text-foreground">
                    {app.type || "Prenatal"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Date & Time
                  </span>
                  <span className="text-xs text-foreground">
                    {formatDateTime(app.appointment_date, app.time_slot)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs font-medium text-foreground">
                  Actions
                </span>
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
                      onClick={(e) => {
                        e.stopPropagation()
                        const targetId = app.mother_id || app.user_id
                        if (targetId) navigate(`/dashboard/mothers/${targetId}`)
                        else toast.info("No mother profile associated")
                      }}
                    >
                      View Profile
                    </DropdownMenuItem>
                    {app.status !== "cancelled" &&
                      app.status !== "Cancelled" &&
                      app.status !== "completed" &&
                      app.status !== "Completed" && (
                        <DropdownMenuItem
                          className="cursor-pointer rounded-md text-xs text-[#ff7373] focus:bg-[#ff7373]/10 focus:text-[#ff7373]"
                          onClick={(e) => handleCancelAppointment(app.id, e)}
                        >
                          Cancel
                        </DropdownMenuItem>
                      )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-xs md:block">
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
                  Appointment Status
                </TableHead>
                <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                  Type
                </TableHead>
                <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                  Date & Time
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((app, idx) => (
                <TableRow
                  key={app.id || idx}
                  className="cursor-pointer border-border hover:bg-muted/50"
                  onClick={() =>
                    setSelectedAppointment({
                      ...app,
                      datetime: formatDateTime(
                        app.appointment_date,
                        app.time_slot
                      ),
                    })
                  }
                >
                  <TableCell className="pl-4">
                    <Checkbox className="border-border" />
                  </TableCell>
                  <TableCell className="text-xs font-medium whitespace-nowrap text-foreground">
                    {app.motherName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${app.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {app.status || "Scheduled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-foreground">
                    {app.type || "Prenatal"}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-foreground">
                    {formatDateTime(app.appointment_date, app.time_slot)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-foreground hover:bg-muted"
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
                            const targetId = app.mother_id || app.user_id
                            if (targetId)
                              navigate(`/dashboard/mothers/${targetId}`)
                            else toast.info("No mother profile associated")
                          }}
                        >
                          View Profile
                        </DropdownMenuItem>
                        {app.status !== "cancelled" &&
                          app.status !== "Cancelled" &&
                          app.status !== "completed" &&
                          app.status !== "Completed" && (
                            <DropdownMenuItem
                              className="cursor-pointer rounded-md text-xs text-[#ff7373] focus:bg-[#ff7373]/10 focus:text-[#ff7373]"
                              onClick={(e) =>
                                handleCancelAppointment(app.id, e)
                              }
                            >
                              Cancel
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-12 px-8 pt-10 pb-8 text-foreground">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Good morning, {firstName}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">Let's get back to work</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border bg-card text-card-foreground shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="truncate pr-2 text-xs font-normal text-muted-foreground">
              Active Pregnancies
            </CardTitle>
            <div className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              <TrendingUp className="h-3 w-3 shrink-0" />
              Live
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-2xl font-semibold">
              {activePregnanciesCount}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span className="truncate pr-2">Local Database</span>
                <TrendingUp className="h-3 w-3 shrink-0 text-foreground" />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Total registered mothers
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card text-card-foreground shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="truncate pr-2 text-xs font-normal text-muted-foreground">
              Appointments Today
            </CardTitle>
            <div className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              Ongoing
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-2xl font-semibold">
              {todayAppointments.length}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span className="truncate pr-2">Total for today</span>
                <Clock className="h-3 w-3 shrink-0 text-foreground" />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Scheduled in your queue
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card text-card-foreground shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="truncate pr-2 text-xs font-normal text-muted-foreground">
              High-Risk Profiles
            </CardTitle>
            <div className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              <Activity className="h-3 w-3 shrink-0" />
              Alert
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`mb-4 text-2xl font-semibold ${highRiskCount > 0 ? "text-red-500" : "text-foreground"}`}
            >
              {highRiskCount}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span className="truncate pr-2">Backend Synced</span>
                <TrendingDown className="h-3 w-3 shrink-0 text-foreground" />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card text-card-foreground shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="truncate pr-2 text-xs font-normal text-muted-foreground">
              Pending Syncs
            </CardTitle>
            <div className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              <RefreshCw
                className={`h-3 w-3 shrink-0 ${pendingSyncsCount > 0 ? "animate-spin-slow" : ""}`}
              />
              Queued
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-2xl font-semibold">
              {pendingSyncsCount}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span className="truncate pr-2">Local offline edits</span>
                <RefreshCw className="h-3 w-3 shrink-0 text-foreground" />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Waiting for network connection
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Upcoming Appointments
        </h2>

        <Tabs defaultValue="today" className="w-full">
          <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <TabsList className="no-scrollbar h-9 w-full justify-start gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1 *:flex-1 md:w-auto md:*:flex-initial">
              <TabsTrigger
                value="today"
                className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                Today's Queue ({todayAppointments.length})
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                Upcoming ({upcomingAppointments.length})
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

            <div className="flex w-full shrink-0 items-center gap-2 md:w-auto">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="hidden h-8 gap-2 border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="hidden h-8 gap-2 border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <CreateAppointmentModal onSuccess={handleRefresh}>
                <Button className="h-8 w-full gap-2 bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 md:w-auto">
                  <Plus className="h-3.5 w-3.5" />
                  New Appointment
                </Button>
              </CreateAppointmentModal>
            </div>
          </div>

          <TabsContent value="today" className="m-0">
            {renderAppointmentList(todayAppointments)}
          </TabsContent>
          <TabsContent value="upcoming" className="m-0">
            {renderAppointmentList(upcomingAppointments)}
          </TabsContent>
          <TabsContent value="completed" className="m-0">
            {renderAppointmentList(completedAppointments)}
          </TabsContent>
          <TabsContent value="cancelled" className="m-0">
            {renderAppointmentList(cancelledAppointments)}
          </TabsContent>
        </Tabs>
      </div>

      {!isMobile && (
        <div
          className={`fixed top-0 right-0 z-50 h-screen w-[100%] shadow-2xl transition-transform duration-300 ease-in-out sm:w-[450px] ${selectedAppointment ? "translate-x-0" : "translate-x-full"}`}
        >
          <AppointmentSidepeek
            appointment={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            onStatusChange={(_id, newStatus) => {
              setSelectedAppointment((prev: any) =>
                prev ? { ...prev, status: newStatus } : null
              )
            }}
          />
        </div>
      )}

      {isMobile && (
        <Drawer
          open={!!selectedAppointment}
          onOpenChange={(open) => !open && setSelectedAppointment(null)}
        >
          <DrawerContent className="flex !h-[85dvh] flex-col overflow-hidden rounded-t-xl border-x-0 border-t border-b-0 border-border bg-card p-0 text-card-foreground shadow-2xl before:hidden focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Appointment Details</DrawerTitle>
            </div>
            <AppointmentSidepeek
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
              onStatusChange={(_id, newStatus) => {
                setSelectedAppointment((prev: any) =>
                  prev ? { ...prev, status: newStatus } : null
                )
              }}
            />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
