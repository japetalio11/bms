import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon, Search } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function CreateAppointmentModal({ 
  children,
  open,
  onOpenChange
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [startDate, setStartDate] = React.useState<Date>()

  return (
    <ResponsiveModal 
      open={open} 
      onOpenChange={onOpenChange}
      title="Schedule an Appointment"
      description="Set up a clinical checkup for a registered mother."
      trigger={children}
    >
      <div className="flex flex-col gap-4 py-2">
        {/* Mother Search */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="mother-search" className="text-xs font-medium text-foreground dark:text-white">Mother Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="mother-search" 
              placeholder="Search by name, ID, or contact number..." 
              className="!h-8 pl-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Appointment Type */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="type" className="text-xs font-medium text-foreground dark:text-white">Appointment Type</Label>
          <Select>
            <SelectTrigger id="type" className="!h-8 w-full bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-muted-foreground">
              <SelectValue placeholder="Choose appointment type" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white">
              <SelectItem value="prenatal" className="text-xs">Prenatal</SelectItem>
              <SelectItem value="postpartum" className="text-xs">Postpartum</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Schedule Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="start-date" className="text-xs font-medium text-foreground dark:text-white">Schedule Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "!h-8 w-full justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                    !startDate ? "text-muted-foreground" : "text-foreground dark:text-white"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {startDate ? format(startDate, "PPP") : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="start-time" className="text-xs font-medium text-foreground dark:text-white">Schedule Time</Label>
            <Input 
              id="start-time" 
              type="time"
              defaultValue="08:00" 
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
            />
          </div>
        </div>

        {/* System Logic Note (Simulated UI Feedback) */}
        <div className="bg-muted dark:bg-[#1a1a1a] border border-sidebar-border rounded-md p-3 mt-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground dark:text-white">System Note:</strong> Clicking Submit will save the appointment and automatically trigger background SMS/Push notification reminders to the mother via the Semaphore/Firebase integration.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-sidebar-border mt-2">
          <Button variant="ghost" className="h-8 text-xs text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/5" onClick={() => onOpenChange?.(false)}>Cancel</Button>
          <Button className="h-8 text-xs bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">Submit Appointment</Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
