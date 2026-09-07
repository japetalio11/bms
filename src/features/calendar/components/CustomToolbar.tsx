import * as React from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle, 
  Download, 
  RefreshCw, 
  CalendarCheck,
  Filter
} from "lucide-react"
import { format } from "date-fns"
import { ExportCalendarModal } from "./ExportCalendarModal"
import { CheckAvailabilityModal } from "./CheckAvailabilityModal"
import { CreateAppointmentModal } from "@/features/appointments/components/CreateAppointmentModal"
import type { AppEvent } from "./CalendarPage"

export interface CustomToolbarProps {
  date: Date
  view: string
  onViewChange: (view: string) => void
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onRefresh?: () => void
  isLoading?: boolean
  events?: AppEvent[]
  selectedTypeFilters?: string[]
  setSelectedTypeFilters?: (val: string[]) => void
  selectedStatusFilters?: string[]
  setSelectedStatusFilters?: (val: string[]) => void
  selectedRiskFilters?: string[]
  setSelectedRiskFilters?: (val: string[]) => void
}

export function CustomToolbar(props: CustomToolbarProps) {
  const { 
    date, 
    onNavigate, 
    view, 
    onViewChange,
    onRefresh,
    isLoading,
    events = [],
    selectedTypeFilters = [],
    setSelectedTypeFilters,
    selectedStatusFilters = [],
    setSelectedStatusFilters,
    selectedRiskFilters = [],
    setSelectedRiskFilters
  } = props

  const goToBack = () => {
    onNavigate('PREV')
  }

  const goToNext = () => {
    onNavigate('NEXT')
  }

  const goToCurrent = () => {
    onNavigate('TODAY')
  }

  const handleViewChange = (newView: string) => {
    onViewChange(newView)
  }

  const toggleFilter = (list: string[], setList?: (val: string[]) => void, item?: string) => {
    if (!setList || !item) return
    if (list.includes(item)) {
      setList(list.filter(i => i !== item))
    } else {
      setList([...list, item])
    }
  }

  return (
    <div className="flex flex-col gap-4 text-foreground dark:text-white">
      {/* Top Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" onClick={goToBack} className="h-8 w-8 bg-transparent border-sidebar-border hover:bg-accent dark:hover:bg-white/5 shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToCurrent} className="h-8 px-3 text-xs font-medium bg-transparent border-sidebar-border hover:bg-accent dark:hover:bg-white/5 shrink-0">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext} className="h-8 w-8 bg-transparent border-sidebar-border hover:bg-accent dark:hover:bg-white/5 shrink-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg md:text-xl font-semibold truncate">{format(date, 'MMMM yyyy')}</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
          <Tabs value={view} onValueChange={(v) => handleViewChange(v)} className="w-full md:w-max">
            <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
              <TabsTrigger value="month" className="text-xs font-medium border border-transparent rounded-sm px-2 py-1 h-full transition-all">Month Grid</TabsTrigger>
              <TabsTrigger value="week" className="text-xs font-medium border border-transparent rounded-sm px-2 py-1 h-full transition-all">Weekly Schedule</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <CreateAppointmentModal onSuccess={onRefresh}>
            <Button className="w-full md:w-auto h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
              <PlusCircle className="h-3.5 w-3.5" />
              Create Appointment
            </Button>
          </CreateAppointmentModal>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Filters */}
        <div className="hidden md:flex w-full xl:w-auto items-center gap-2">
          {/* Appointment Type Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground dark:!bg-black dark:text-white shrink-0">
                <PlusCircle className="h-3.5 w-3.5" />
                Appointment Type {selectedTypeFilters.length > 0 && `(${selectedTypeFilters.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
              <div className="flex flex-col gap-2.5">
                {["Prenatal", "Postpartum", "High-Risk", "General"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`cal-filter-type-${option}`}
                      checked={selectedTypeFilters.includes(option)}
                      onCheckedChange={() => toggleFilter(selectedTypeFilters, setSelectedTypeFilters, option)}
                      className="h-3.5 w-3.5 rounded-[4px]" 
                    />
                    <label htmlFor={`cal-filter-type-${option}`} className="text-xs font-normal cursor-pointer">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
              {selectedTypeFilters.length > 0 && setSelectedTypeFilters && (
                <Button onClick={() => setSelectedTypeFilters([])} className="h-7 text-xs w-full">Clear Filter</Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground dark:!bg-black dark:text-white shrink-0">
                <PlusCircle className="h-3.5 w-3.5" />
                Status {selectedStatusFilters.length > 0 && `(${selectedStatusFilters.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
              <div className="flex flex-col gap-2.5">
                {["Pending", "Confirmed", "Completed", "Cancelled"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`cal-filter-status-${option}`}
                      checked={selectedStatusFilters.includes(option)}
                      onCheckedChange={() => toggleFilter(selectedStatusFilters, setSelectedStatusFilters, option)}
                      className="h-3.5 w-3.5 rounded-[4px]" 
                    />
                    <label htmlFor={`cal-filter-status-${option}`} className="text-xs font-normal cursor-pointer">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
              {selectedStatusFilters.length > 0 && setSelectedStatusFilters && (
                <Button onClick={() => setSelectedStatusFilters([])} className="h-7 text-xs w-full">Clear Filter</Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Risk Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground dark:!bg-black dark:text-white shrink-0">
                <PlusCircle className="h-3.5 w-3.5" />
                Risk Flag {selectedRiskFilters.length > 0 && `(${selectedRiskFilters.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
              <div className="flex flex-col gap-2.5">
                {["Low Risk", "Moderate", "High Risk"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`cal-filter-risk-${option}`}
                      checked={selectedRiskFilters.includes(option)}
                      onCheckedChange={() => toggleFilter(selectedRiskFilters, setSelectedRiskFilters, option)}
                      className="h-3.5 w-3.5 rounded-[4px]" 
                    />
                    <label htmlFor={`cal-filter-risk-${option}`} className="text-xs font-normal cursor-pointer">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
              {selectedRiskFilters.length > 0 && setSelectedRiskFilters && (
                <Button onClick={() => setSelectedRiskFilters([])} className="h-7 text-xs w-full">Clear Filter</Button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className="flex w-full md:w-auto overflow-x-auto no-scrollbar items-center gap-2 pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 justify-end md:justify-start">
          <ExportCalendarModal events={events}>
            <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white shrink-0">
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
          </ExportCalendarModal>
          
          <CheckAvailabilityModal events={events} date={date}>
            <Button variant="outline" className="flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white shrink-0">
              <CalendarCheck className="h-3.5 w-3.5" />
              Check Available Slots
            </Button>
          </CheckAvailabilityModal>

          <Button 
            variant="outline" 
            onClick={onRefresh} 
            className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

