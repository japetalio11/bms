import * as React from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Download,
  RefreshCw,
  CalendarCheck,
  Filter,
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
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void
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
    setSelectedRiskFilters,
  } = props

  const goToBack = () => {
    onNavigate("PREV")
  }

  const goToNext = () => {
    onNavigate("NEXT")
  }

  const goToCurrent = () => {
    onNavigate("TODAY")
  }

  const handleViewChange = (newView: string) => {
    onViewChange(newView)
  }

  const toggleFilter = (
    list: string[],
    setList?: (val: string[]) => void,
    item?: string
  ) => {
    if (!setList || !item) return
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item))
    } else {
      setList([...list, item])
    }
  }

  return (
    <div className="flex flex-col gap-4 text-foreground">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-start">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={goToBack}
              className="h-8 w-8 shrink-0 border-border bg-transparent hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={goToCurrent}
              className="h-8 shrink-0 border-border bg-transparent px-3 text-xs font-medium hover:bg-accent"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="h-8 w-8 shrink-0 border-border bg-transparent hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="truncate text-lg font-semibold md:text-xl">
            {format(date, "MMMM yyyy")}
          </h2>
        </div>

        <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center md:w-auto">
          <Tabs
            value={view}
            onValueChange={(v) => handleViewChange(v)}
            className="w-full md:w-max"
          >
            <TabsList className="h-9 w-full justify-start gap-1 rounded-md border border-border bg-muted p-1 *:flex-1 md:w-max md:*:flex-initial">
              <TabsTrigger
                value="month"
                className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
              >
                Month Grid
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
              >
                Weekly Schedule
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <CreateAppointmentModal onSuccess={onRefresh}>
            <Button className="h-8 w-full gap-2 bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 md:w-auto">
              <PlusCircle className="h-3.5 w-3.5" />
              Create Appointment
            </Button>
          </CreateAppointmentModal>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="hidden w-full items-center gap-2 md:flex xl:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex h-8 shrink-0 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Appointment Type{" "}
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
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cal-filter-type-${option}`}
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
                        htmlFor={`cal-filter-type-${option}`}
                        className="cursor-pointer text-xs font-normal"
                      >
                        {option}
                      </label>
                    </div>
                  )
                )}
              </div>
              {selectedTypeFilters.length > 0 && setSelectedTypeFilters && (
                <Button
                  onClick={() => setSelectedTypeFilters([])}
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
                className="flex h-8 shrink-0 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Status{" "}
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
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cal-filter-status-${option}`}
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
                        htmlFor={`cal-filter-status-${option}`}
                        className="cursor-pointer text-xs font-normal"
                      >
                        {option}
                      </label>
                    </div>
                  )
                )}
              </div>
              {selectedStatusFilters.length > 0 && setSelectedStatusFilters && (
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
                className="flex h-8 shrink-0 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent"
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
                      id={`cal-filter-risk-${option}`}
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
                      htmlFor={`cal-filter-risk-${option}`}
                      className="cursor-pointer text-xs font-normal"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
              {selectedRiskFilters.length > 0 && setSelectedRiskFilters && (
                <Button
                  onClick={() => setSelectedRiskFilters([])}
                  className="h-7 w-full text-xs"
                >
                  Clear Filter
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="-mx-4 no-scrollbar flex w-full items-center justify-end gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:w-auto md:justify-start md:px-0 md:pb-0">
          <ExportCalendarModal events={events}>
            <Button
              variant="outline"
              className="hidden h-8 shrink-0 gap-2 border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent md:flex"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
          </ExportCalendarModal>

          <CheckAvailabilityModal events={events} date={date}>
            <Button
              variant="outline"
              className="flex h-8 shrink-0 gap-2 border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent"
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              Check Available Slots
            </Button>
          </CheckAvailabilityModal>

          <Button
            variant="outline"
            onClick={onRefresh}
            className="hidden h-8 shrink-0 gap-2 border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent md:flex"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
