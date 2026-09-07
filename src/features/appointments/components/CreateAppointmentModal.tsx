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
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { mothersApi } from "@/features/mothers/api"
import { appointmentApi } from "../api"

export function CreateAppointmentModal({ 
  children,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = externalOpen !== undefined
  const isOpen = isControlled ? externalOpen : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (externalOnOpenChange) {
      externalOnOpenChange(newOpen)
    }
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
  }

  const [mothers, setMothers] = React.useState<any[]>([])
  const [loadingMothers, setLoadingMothers] = React.useState(false)
  const [selectedMotherId, setSelectedMotherId] = React.useState("")
  const [appointmentType, setAppointmentType] = React.useState("Prenatal Checkup")
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = React.useState("08:00")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")

  React.useEffect(() => {
    if (isOpen) {
      fetchMothers()
    }
  }, [isOpen])

  const fetchMothers = async () => {
    setLoadingMothers(true)
    const userStr = localStorage.getItem("user")
    const user = userStr ? JSON.parse(userStr) : null
    try {
      const data = await mothersApi.getActiveMothers(user?.facility_id)
      setMothers(data || [])
    } catch (err) {
      console.error("Failed to load mothers:", err)
    } finally {
      setLoadingMothers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    if (!selectedMotherId) {
      setErrorMessage("Please select a registered mother.")
      return
    }

    if (!startDate) {
      setErrorMessage("Please select a date for the appointment.")
      return
    }

    setIsSubmitting(true)
    const userStr = localStorage.getItem("user")
    const user = userStr ? JSON.parse(userStr) : null

    try {
      const dateStr = format(startDate, "yyyy-MM-dd")
      const selectedMother = mothers.find((m) => (m.user_id || m.mother_id || m._id || m.id) === selectedMotherId)
      const motherUser = selectedMother?.user || selectedMother

      await appointmentApi.createAppointment({
        user_id: selectedMotherId,
        mother_id: selectedMother?.mother_id || selectedMother?._id || selectedMotherId,
        facility_id: user?.facility_id || user?.facilityId || user?.facility?._id,
        appointment_date: dateStr,
        appointment_time: startTime,
        appointment_type: appointmentType,
        user: motherUser,
      })

      handleOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to create appointment"
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ResponsiveModal 
      open={isOpen} 
      onOpenChange={handleOpenChange}
      title="Schedule an Appointment"
      description="Set up a clinical checkup for a registered mother."
      trigger={children}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-md p-2 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Mother Selection */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="mother-select" className="text-xs font-medium text-foreground dark:text-white">
            Select Registered Mother
          </Label>
          <Select value={selectedMotherId} onValueChange={setSelectedMotherId}>
            <SelectTrigger id="mother-select" className="!h-8 w-full bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
              <SelectValue placeholder={loadingMothers ? "Loading mothers..." : "Choose a mother"} />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white max-h-56">
              {mothers.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground text-center">
                  {loadingMothers ? "Loading..." : "No registered mothers found"}
                </div>
              ) : (
                mothers.map((m) => {
                  const id = m.user_id || m.mother_id
                  const name = [m.user?.first_name, m.user?.middle_name, m.user?.last_name].filter(Boolean).join(" ") || m.name || "Unknown Mother"
                  return (
                    <SelectItem key={id} value={id} className="text-xs">
                      {name} ({m.user?.phone_number || "No contact"})
                    </SelectItem>
                  )
                })
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Appointment Type */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="type" className="text-xs font-medium text-foreground dark:text-white">Appointment Type</Label>
          <Select value={appointmentType} onValueChange={setAppointmentType}>
            <SelectTrigger id="type" className="!h-8 w-full bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
              <SelectValue placeholder="Choose appointment type" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" className="bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white">
              <SelectItem value="Prenatal Checkup" className="text-xs">Prenatal Checkup</SelectItem>
              <SelectItem value="Postpartum Follow-up" className="text-xs">Postpartum Follow-up</SelectItem>
              <SelectItem value="High-Risk Consultation" className="text-xs">High-Risk Consultation</SelectItem>
              <SelectItem value="General Visit" className="text-xs">General Visit</SelectItem>
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
                  type="button"
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
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="start-time" className="text-xs font-medium text-foreground dark:text-white">Schedule Time</Label>
            <Input 
              id="start-time" 
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
            />
          </div>
        </div>

        {/* System Logic Note */}
        <div className="bg-muted dark:bg-[#1a1a1a] border border-sidebar-border rounded-md p-3 mt-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground dark:text-white">System Note:</strong> Submitting saves the appointment to the database and schedules automated check-in notifications for the mother.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-sidebar-border mt-2">
          <Button type="button" variant="ghost" className="h-8 text-xs text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/5" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="h-8 text-xs bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200 gap-2">
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Submit Appointment
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}

