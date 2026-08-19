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
import axios from "axios"

export interface RegisterPregnancyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherData: any
  onSuccess?: () => void
}

export function RegisterPregnancyModal({
  open,
  onOpenChange,
  motherData,
  onSuccess,
}: RegisterPregnancyModalProps) {
  const [lmpDate, setLmpDate] = React.useState<Date>()
  const [gravida, setGravida] = React.useState<number>(1)
  const [parity, setParity] = React.useState<number>(0)
  const [previousDeliveryHistory, setPreviousDeliveryHistory] = React.useState<string>("")
  const [coMorbidities, setCoMorbidities] = React.useState<string>("")
  const [ageGroup, setAgeGroup] = React.useState<string>("20-34 years")
  const [bmi1stTrimester, setBmi1stTrimester] = React.useState<string>("")
  const [bmiCategory, setBmiCategory] = React.useState<string>("Normal")
  const [pregnancyStatus, setPregnancyStatus] = React.useState<string>("Active")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const motherId = motherData?.mother_id || motherData?.user_id

  const handleSubmit = async () => {
    setError(null)

    if (!motherId) {
      setError("Mother record not found.")
      return
    }

    if (!lmpDate) {
      setError("Please select a Last Menstrual Period (LMP) date.")
      return
    }

    setLoading(true)
    const token = localStorage.getItem("token")
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      const payload = {
        motherId,
        lmp_date: lmpDate.toISOString(),
        gravida: Number(gravida),
        parity: Number(parity),
        previous_delivery_history: previousDeliveryHistory || undefined,
        co_morbidities: coMorbidities || undefined,
        age_group: ageGroup,
        bmi_1st_trimester: bmi1stTrimester ? Number(bmi1stTrimester) : undefined,
        bmi_category: bmiCategory,
        pregnancy_status: pregnancyStatus,
      }

      const response = await axios.post(`${baseUrl}/api/v1/pregnancy/register`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 200 || response.status === 201) {
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to register pregnancy"
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Pregnancy Record"
      description="Register a new pregnancy for this mother."
    >
      <div className="flex flex-col gap-4 py-2 overflow-y-auto max-h-[80vh] px-1">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2.5 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Section 1: Core Details */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Obstetric Baseline & Status</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">LMP Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full !h-8 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                      !lmpDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {lmpDate ? format(lmpDate, "PPP") : <span>Pick LMP Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={lmpDate}
                    onSelect={setLmpDate}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Pregnancy Status *</Label>
              <Select value={pregnancyStatus} onValueChange={setPregnancyStatus}>
                <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gravida" className="text-xs font-medium text-foreground dark:text-white">Gravida (G) *</Label>
              <Input
                id="gravida"
                type="number"
                min={1}
                value={gravida}
                onChange={(e) => setGravida(Number(e.target.value))}
                className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parity" className="text-xs font-medium text-foreground dark:text-white">Parity (P) *</Label>
              <Input
                id="parity"
                type="number"
                min={0}
                value={parity}
                onChange={(e) => setParity(Number(e.target.value))}
                className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Age Group *</Label>
              <Select value={ageGroup} onValueChange={setAgeGroup}>
                <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
                  <SelectValue placeholder="Age Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="< 19 years">&lt; 19 years</SelectItem>
                  <SelectItem value="20-34 years">20-34 years</SelectItem>
                  <SelectItem value="35+ years">35+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="h-px bg-sidebar-border/60 my-1" />

        {/* Section 2: Clinical Assessment */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Clinical & Health Indicators</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bmi1st" className="text-xs font-medium text-foreground dark:text-white">1st Tri BMI</Label>
              <Input
                id="bmi1st"
                type="number"
                step="0.1"
                placeholder="e.g. 22.5"
                value={bmi1stTrimester}
                onChange={(e) => setBmi1stTrimester(e.target.value)}
                className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">BMI Category</Label>
              <Select value={bmiCategory} onValueChange={setBmiCategory}>
                <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
                  <SelectValue placeholder="BMI Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Underweight">Underweight</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Overweight">Overweight</SelectItem>
                  <SelectItem value="Obese">Obese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coMorbidities" className="text-xs font-medium text-foreground dark:text-white">Co-morbidities</Label>
            <Input
              id="coMorbidities"
              placeholder="e.g. Hypertension, Diabetes, Asthma"
              value={coMorbidities}
              onChange={(e) => setCoMorbidities(e.target.value)}
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="previousDelivery" className="text-xs font-medium text-foreground dark:text-white">Previous Delivery History</Label>
            <Textarea
              id="previousDelivery"
              placeholder="Notes on previous deliveries..."
              value={previousDeliveryHistory}
              onChange={(e) => setPreviousDeliveryHistory(e.target.value)}
              className="resize-none h-[60px] bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
            />
          </div>
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
            {loading ? "Registering..." : "Save Pregnancy"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
