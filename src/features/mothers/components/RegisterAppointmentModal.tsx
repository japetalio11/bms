import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { mothersApi } from "../api"

export interface RegisterAppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherData: any
  onSuccess?: () => void
}

export function RegisterAppointmentModal({
  open,
  onOpenChange,
  motherData,
  onSuccess,
}: RegisterAppointmentModalProps) {
  const [appointmentDate, setAppointmentDate] = React.useState<Date>()
  const [appointmentTime, setAppointmentTime] = React.useState<string>("09:00 AM")
  const [appointmentType, setAppointmentType] = React.useState<string>("Prenatal Visit")
  const [reason, setReason] = React.useState<string>("")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const userId = motherData?.user?.user_id || motherData?.user_id

  const handleSubmit = async () => {
    setError(null)

    if (!userId) {
      setError("User record for mother not found.")
      return
    }

    if (!appointmentDate) {
      setError("Please select an appointment date.")
      return
    }

    if (!appointmentTime) {
      setError("Please enter or select an appointment time.")
      return
    }

    setLoading(true)
    const token = localStorage.getItem("token")
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      const payload = {
        user_id: userId,
        appointment_date: appointmentDate.toISOString(),
        appointment_time: appointmentTime,
        appointment_type: appointmentType,
        reason: reason || undefined,
      }

      await mothersApi.registerAppointment(payload)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to schedule appointment"
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule New Appointment"
      description="Book a prenatal visit, postpartum checkup, or consultation for this mother."
      className="sm:max-w-[480px]"
    >
      <div className="flex flex-col gap-4 py-2 overflow-y-auto max-h-[80vh] px-1">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2.5 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground dark:text-white">Appointment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full !h-9 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                    !appointmentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {appointmentDate ? format(appointmentDate, "PPP") : <span>Pick Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={appointmentDate}
                  onSelect={setAppointmentDate}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appointmentTime" className="text-xs font-medium text-foreground dark:text-white">Appointment Time *</Label>
            <Input
              id="appointmentTime"
              type="text"
              placeholder="e.g. 09:00 AM"
              value={appointmentTime}
              onChange={(e) => setAppointmentTime(e.target.value)}
              className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground dark:text-white">Appointment Type *</Label>
          <Select value={appointmentType} onValueChange={setAppointmentType}>
            <SelectTrigger className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Prenatal Visit">Prenatal Visit</SelectItem>
              <SelectItem value="Postpartum Checkup">Postpartum Checkup</SelectItem>
              <SelectItem value="Immunization">Immunization</SelectItem>
              <SelectItem value="Consultation">Consultation</SelectItem>
              <SelectItem value="Ultrasound / Lab">Ultrasound / Lab</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason" className="text-xs font-medium text-foreground dark:text-white">Reason / Purpose</Label>
          <Textarea
            id="reason"
            placeholder="Enter reason for appointment or health worker notes..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="resize-none h-[75px] bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-sidebar-border mt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-medium"
          >
            {loading ? "Scheduling..." : "Schedule Appointment"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
