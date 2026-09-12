import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
  Loader2
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { UnifiedTableLoader } from "@/components/ui/unified-table-loader"

import { CreateAppointmentModal } from "./CreateAppointmentModal"
import { ExportAppointmentsDataModal } from "./ExportAppointmentsDataModal"
import { AppointmentSidepeek } from "@/features/dashboard/components/AppointmentSidepeek"
import { useIsMobile } from "@/hooks/use-mobile"
import { appointmentApi } from "../api"
import { mothersApi } from "@/features/mothers/api"
import { extractRiskLevel } from "@/lib/riskUtils"

export function AppointmentListPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([])
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
      const [appointments, mothers] = await Promise.all([
        appointmentApi.getAllFacilityAppointment(user?.facility_id),
        mothersApi.getActiveMothers(user?.facility_id).catch(() => []),
      ])

      const map = new Map<string, any>()
      if (Array.isArray(mothers)) {
        mothers.forEach((m: any) => {
          const keys = [m.id, m._id, m.mother_id, m.user_id, m.user?.user_id].filter(Boolean)
          keys.forEach((k) => map.set(k, m))
        })
      }
      setMothersMap(map)
      setAppointmentList(appointments || [])
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

  // Format appointment records for display
  const formattedAppointments = appointmentList.map((item: any) => {
    const targetKey = item.mother_id || item.user_id || item.motherId || item.userId
    const matchedMother = targetKey ? mothersMap.get(targetKey) : null
    const motherUser = item.user || item.patient?.user || item.patient || matchedMother?.user || matchedMother

    const name = [motherUser?.first_name || matchedMother?.first_name, motherUser?.middle_name || matchedMother?.middle_name, motherUser?.last_name || matchedMother?.last_name]
      .filter(Boolean)
      .join(" ") || motherUser?.name || matchedMother?.name || "Unknown Mother"

    const risk = extractRiskLevel(matchedMother || item, matchedMother?.pregnancies, matchedMother?.prenatalVisits)

    let dateStr = "N/A"
    if (item.appointment_date) {
      const d = new Date(item.appointment_date)
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      }
    }
    if (item.appointment_time) {
      dateStr = dateStr !== "N/A" ? `${dateStr} - ${item.appointment_time}` : item.appointment_time
    }

    const appDate = item.appointment_date ? new Date(item.appointment_date) : null
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
    } else if (lowerStatus === "confirmed" || lowerStatus === "active" || lowerStatus === "scheduled") {
      status = "Confirmed"
    } else {
      status = "Pending"
    }

    return {
      id: item.appointment_id || item.id,
      raw: item,
      name,
      risk,
      status,
      isPast,
      type: item.appointment_type || "Prenatal Checkup",
      date: dateStr,
      rawDate: item.appointment_date
    }
  })

  // Filter list by searchQuery, tab, and popover selections
  const filteredAppointments = formattedAppointments.filter((appointment) => {
    // 1. Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase()
      const matchName = appointment.name.toLowerCase().includes(q)
      const matchType = appointment.type.toLowerCase().includes(q)
      if (!matchName && !matchType) return false
    }

    // 2. Tab Filtering
    if (activeTab === "upcoming") {
      if (appointment.isPast || appointment.status === "Cancelled" || appointment.status === "Completed" || appointment.status === "Missed") return false
    } else if (activeTab === "completed") {
      if (appointment.status !== "Completed") return false
    } else if (activeTab === "cancelled") {
      if (appointment.status !== "Cancelled") return false
    }

    // 3. Status Filters
    if (selectedStatusFilters.length > 0) {
      const match = selectedStatusFilters.some(s => appointment.status.toLowerCase().includes(s.toLowerCase()))
      if (!match) return false
    }

    // 4. Risk Flag Filters
    if (selectedRiskFilters.length > 0) {
      const match = selectedRiskFilters.some(r => appointment.risk.toLowerCase().includes(r.toLowerCase()))
      if (!match) return false
    }

    // 5. Type Filters
    if (selectedTypeFilters.length > 0) {
      const match = selectedTypeFilters.some(t => appointment.type.toLowerCase().includes(t.toLowerCase()))
      if (!match) return false
    }

    return true
  })

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize))
  const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleFilter = (list: string[], setList: (val: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item))
    } else {
      setList([...list, item])
    }
  }

  // Touch Swipe Handling
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
    <div className="relative flex items-start w-full h-full overflow-hidden">
      {/* Main Content Area */}
      <div 
        className="flex flex-col w-full h-full text-foreground min-w-0 overflow-y-auto relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background p-4 pl-3 pr-4 pb-4 border-b md:border-none border-border">
          
          {/* Tabs */}
          <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }} className="w-full md:w-max">
              <TabsList className="bg-muted border border-border h-9 w-full md:w-max justify-start rounded-lg p-1 gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="all" className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1 h-full transition-all">All / Queue</TabsTrigger>
                <TabsTrigger value="upcoming" className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1 h-full transition-all">Upcoming</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1 h-full transition-all">Completed</TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1 h-full transition-all">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex w-full xl:w-auto flex-wrap items-center gap-2">
              <div className="flex w-full md:w-auto items-center gap-2">
                <Input 
                  placeholder="Search appointments..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="h-8 px-2 w-full sm:w-[250px] text-xs font-normal bg-card border-border" 
                />
              </div>

              {/* Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-border border-dashed bg-card text-foreground hover:bg-muted">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Appointment Status {selectedStatusFilters.length > 0 && `(${selectedStatusFilters.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                  <div className="flex flex-col gap-2.5">
                    {["Pending", "Confirmed", "Completed", "Cancelled"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`filter-status-${option}`}
                          checked={selectedStatusFilters.includes(option)}
                          onCheckedChange={() => toggleFilter(selectedStatusFilters, setSelectedStatusFilters, option)}
                          className="h-3.5 w-3.5 rounded-[4px]" 
                        />
                        <label htmlFor={`filter-status-${option}`} className="text-xs font-normal cursor-pointer">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedStatusFilters.length > 0 && (
                    <Button onClick={() => setSelectedStatusFilters([])} className="h-7 text-xs w-full">Clear Filter</Button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Risk Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-border border-dashed bg-card text-foreground hover:bg-muted">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Risk Flag {selectedRiskFilters.length > 0 && `(${selectedRiskFilters.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                  <div className="flex flex-col gap-2.5">
                    {["Low Risk", "Moderate", "High Risk"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`filter-risk-${option}`}
                          checked={selectedRiskFilters.includes(option)}
                          onCheckedChange={() => toggleFilter(selectedRiskFilters, setSelectedRiskFilters, option)}
                          className="h-3.5 w-3.5 rounded-[4px]" 
                        />
                        <label htmlFor={`filter-risk-${option}`} className="text-xs font-normal cursor-pointer">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedRiskFilters.length > 0 && (
                    <Button onClick={() => setSelectedRiskFilters([])} className="h-7 text-xs w-full">Clear Filter</Button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Type Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-border border-dashed bg-card text-foreground hover:bg-muted">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Type {selectedTypeFilters.length > 0 && `(${selectedTypeFilters.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                  <div className="flex flex-col gap-2.5">
                    {["Prenatal", "Postpartum", "High-Risk", "General"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`filter-type-${option}`}
                          checked={selectedTypeFilters.includes(option)}
                          onCheckedChange={() => toggleFilter(selectedTypeFilters, setSelectedTypeFilters, option)}
                          className="h-3.5 w-3.5 rounded-[4px]" 
                        />
                        <label htmlFor={`filter-type-${option}`} className="text-xs font-normal cursor-pointer">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedTypeFilters.length > 0 && (
                    <Button onClick={() => setSelectedTypeFilters([])} className="h-7 text-xs w-full">Clear Filter</Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex w-full xl:w-auto items-center gap-2">
              <ExportAppointmentsDataModal appointments={filteredAppointments}>
                <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-border bg-card text-foreground hover:bg-muted">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </ExportAppointmentsDataModal>

              <Button 
                variant="outline" 
                onClick={fetchAppointments} 
                className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-border bg-card text-foreground hover:bg-muted"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <CreateAppointmentModal onSuccess={fetchAppointments}>
                <Button className="w-full md:w-auto h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <PlusCircle className="h-3.5 w-3.5" />
                  New Appointment
                </Button>
              </CreateAppointmentModal>
            </div>
          </div>

          {/* Mobile Top Pagination */}
          <div className="flex md:hidden items-center justify-between text-xs text-muted-foreground w-full pt-4 mt-2 border-t border-sidebar-border">
            <span>Page {currentPage} of {totalPages}</span>
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
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                className="h-7 w-7 border-sidebar-border bg-transparent"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                disabled={currentPage >= totalPages} 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
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

        <div className="flex flex-col gap-4 p-4 md:pt-0 pl-3 pr-4 pb-24 md:pb-4">
          <UnifiedTableLoader isLoading={isLoading} label="Loading appointments...">
            {!isLoading && filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 gap-2 border border-dashed border-sidebar-border rounded-xl text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-xs font-medium text-foreground dark:text-white">No appointments found</p>
                <p className="text-[11px] text-muted-foreground">Try adjusting your filters or schedule a new appointment.</p>
              </div>
            ) : (
              <>
                {/* Mobile Card List */}
                <div className="flex md:hidden flex-col gap-4">
                  {isLoading && filteredAppointments.length === 0
                    ? [...Array(3)].map((_, i) => (
                        <div key={`appointment-skel-card-${i}`} className="flex flex-col p-4 rounded-xl border border-border bg-card text-card-foreground gap-3">
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
                          className={`flex flex-col p-4 rounded-xl border border-border bg-card text-card-foreground gap-4 cursor-pointer transition-colors ${selectedAppointment?.id === appointment.id ? 'ring-1 ring-ring' : 'hover:bg-accent'}`}
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{appointment.name}</h3>
                            <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${appointment.risk.toLowerCase().includes('high') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                              <Activity className="h-3 w-3" />
                              {appointment.risk}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Appointment Status</span>
                              <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${appointment.status === 'Confirmed' ? 'bg-blue-500/10 text-blue-500' : appointment.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                <CheckCircle2 className="h-3 w-3" />
                                {appointment.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Type</span>
                              <span className="text-xs text-foreground">{appointment.type}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Date & Time</span>
                              <span className="text-xs text-foreground">{appointment.date}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end pt-3 border-t border-border">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-border shadow-md">
                                <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); setSelectedAppointment(appointment); }}>View Details</DropdownMenuItem>
                                {appointment.status !== 'Cancelled' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-xs text-[#ff7373] focus:text-[#ff7373] focus:bg-[#ff7373]/10 cursor-pointer rounded-md" 
                                      onClick={(e) => { e.stopPropagation(); handleCancelAppointment(appointment.id); }}
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

                {/* Desktop Data Table */}
                <div className="hidden md:block rounded-xl border border-border overflow-x-auto bg-card shadow-xs">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="w-12 text-center pl-4">
                            <Checkbox className="border-border" />
                          </TableHead>
                          <TableHead className="text-xs font-medium text-foreground whitespace-nowrap">Mother Name</TableHead>
                          <TableHead className="text-xs font-medium text-foreground whitespace-nowrap">Risk Flag</TableHead>
                          <TableHead className="text-xs font-medium text-foreground whitespace-nowrap">Appointment Status</TableHead>
                          <TableHead className="text-xs font-medium text-foreground whitespace-nowrap">Type</TableHead>
                          <TableHead className="text-xs font-medium text-foreground whitespace-nowrap">Date & Time</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading && filteredAppointments.length === 0
                          ? [...Array(5)].map((_, i) => (
                              <TableRow key={`appointment-skel-${i}`} className="border-border">
                                <TableCell className="pl-4"><Skeleton className="h-4 w-4 rounded" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20 rounded-sm" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24 rounded-sm" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-6 rounded-md" /></TableCell>
                              </TableRow>
                            ))
                          : paginatedAppointments.map((appointment) => (
                              <TableRow 
                                key={appointment.id} 
                                className={`border-border cursor-pointer transition-colors group ${selectedAppointment?.id === appointment.id ? 'bg-muted/70' : 'hover:bg-muted/50'}`}
                                onClick={() => setSelectedAppointment(appointment)}
                              >
                                <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox className="border-border" />
                                </TableCell>
                                <TableCell className="text-xs font-medium text-foreground whitespace-nowrap">
                                  {appointment.name}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${appointment.risk.toLowerCase().includes('high') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                    <Activity className="h-3 w-3" />
                                    {appointment.risk}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${appointment.status === 'Confirmed' ? 'bg-blue-500/10 text-blue-500' : appointment.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                    <CheckCircle2 className="h-3 w-3" />
                                    {appointment.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-foreground whitespace-nowrap">
                                  {appointment.type}
                                </TableCell>
                                <TableCell className="text-xs text-foreground whitespace-nowrap">
                                  {appointment.date}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-border shadow-md">
                                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={() => setSelectedAppointment(appointment)}>View Details</DropdownMenuItem>
                                      {appointment.status !== 'Cancelled' && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem 
                                            className="text-xs text-[#ff7373] focus:text-[#ff7373] focus:bg-[#ff7373]/10 cursor-pointer rounded-md" 
                                            onClick={() => handleCancelAppointment(appointment.id)}
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

          {/* Desktop Pagination Footer */}
          {!isLoading && filteredAppointments.length > 0 && (
            <div className="hidden md:flex flex-row items-center justify-between text-xs text-muted-foreground gap-4 mt-2">
              <div>Total {filteredAppointments.length} appointment(s)</div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <div className="flex items-center justify-between border border-sidebar-border bg-card dark:bg-[#111] px-2 py-1 gap-2 rounded-md">
                    <span>10</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span>Page {currentPage} of {totalPages}</span>
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
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                      className="h-7 w-7 border-sidebar-border bg-transparent"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      disabled={currentPage >= totalPages} 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
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
            className={`fixed top-0 right-0 h-screen w-[100%] sm:w-[450px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${selectedAppointment ? 'translate-x-0' : 'translate-x-full'}`}
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
          <DrawerContent className="p-0 bg-card text-card-foreground border-t border-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden !h-[80dvh] flex flex-col focus-visible:outline-none shadow-2xl">
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


