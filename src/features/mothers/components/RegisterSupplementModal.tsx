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
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { mothersApi } from "../api"

export interface RegisterSupplementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherData: any
  visitationList?: any[]
  onSuccess?: () => void
}

export function RegisterSupplementModal({
  open,
  onOpenChange,
  motherData,
  visitationList = [],
  onSuccess,
}: RegisterSupplementModalProps) {
  const [pregnancyId, setPregnancyId] = React.useState<string>("")
  const [visitId, setVisitId] = React.useState<string>("")
  const [supplementType, setSupplementType] = React.useState<string>("Iron + Folic Acid")
  const [tabletsCount, setTabletsCount] = React.useState<number>(30)
  const [dateGiven, setDateGiven] = React.useState<Date>(new Date())

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const pregnancies = motherData?.pregnancies || []
  const visits = visitationList.length > 0 ? visitationList : (motherData?.prenatalVisits || [])

  React.useEffect(() => {
    if (pregnancies.length > 0) {
      const activePreg = pregnancies.find((p: any) => p.pregnancy_status?.toLowerCase() === "active") || pregnancies[0]
      setPregnancyId(activePreg.pregnancy_id || activePreg._id || activePreg.id || "")
    }
  }, [motherData, open])

  React.useEffect(() => {
    if (visits.length > 0) {
      setVisitId(visits[0].visit_id || visits[0]._id || visits[0].id || "")
    }
  }, [visits, open])

  const handleSubmit = async () => {
    setError(null)

    if (!pregnancyId) {
      setError("Target pregnancy record is required.")
      return
    }

    if (!visitId) {
      setError("Associated visit encounter is required.")
      return
    }

    if (!supplementType || !tabletsCount || !dateGiven) {
      setError("Please fill in supplement type, tablets count, and date given.")
      return
    }

    setLoading(true)
    const token = localStorage.getItem("token")
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      const payload = {
        pregnancy_id: pregnancyId,
        visit_id: visitId,
        supplement_type: supplementType,
        tablets_given_count: Number(tabletsCount),
        date_given: dateGiven.toISOString(),
      }

      await mothersApi.registerSupplement(payload)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to log prescription/supplement record"
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Prescription & Supplement"
      description="Record iron, calcium, or medication supplementation for this mother."
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
            <Label className="text-xs font-medium text-foreground dark:text-white">Target Pregnancy *</Label>
            <Select value={pregnancyId} onValueChange={setPregnancyId}>
              <SelectTrigger className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
                <SelectValue placeholder="Select Pregnancy" />
              </SelectTrigger>
              <SelectContent>
                {pregnancies.map((p: any, idx: number) => {
                  const pId = p.pregnancy_id || p._id || p.id || String(idx)
                  return (
                    <SelectItem key={pId} value={pId}>
                      Pregnancy #{pregnancies.length - idx} ({p.pregnancy_status || "Active"})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground dark:text-white">Associated Visit *</Label>
            <Select value={visitId} onValueChange={setVisitId}>
              <SelectTrigger className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
                <SelectValue placeholder="Select Visit" />
              </SelectTrigger>
              <SelectContent>
                {visits.length === 0 ? (
                  <SelectItem value="none" disabled>No visits recorded yet</SelectItem>
                ) : (
                  visits.map((v: any, idx: number) => {
                    const vId = v.visit_id || v._id || v.id || String(idx)
                    return (
                      <SelectItem key={vId} value={vId}>
                        Visit #{v.visit_number || idx + 1} ({v.visit_date ? new Date(v.visit_date).toLocaleDateString() : "N/A"})
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground dark:text-white">Supplement / Medication Type *</Label>
          <Select value={supplementType} onValueChange={setSupplementType}>
            <SelectTrigger className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
              <SelectValue placeholder="Select Supplement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Iron + Folic Acid">Iron + Folic Acid</SelectItem>
              <SelectItem value="Calcium Carbonate">Calcium Carbonate</SelectItem>
              <SelectItem value="Deworming Tablet (Albendazole)">Deworming Tablet (Albendazole)</SelectItem>
              <SelectItem value="Multivitamins">Multivitamins</SelectItem>
              <SelectItem value="Vitamin A">Vitamin A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tabletsCount" className="text-xs font-medium text-foreground dark:text-white">Tablets Given Count *</Label>
            <Input
              id="tabletsCount"
              type="number"
              min={1}
              value={tabletsCount}
              onChange={(e) => setTabletsCount(Number(e.target.value))}
              className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground dark:text-white">Date Given *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full !h-9 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                    !dateGiven && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateGiven ? format(dateGiven, "PPP") : <span>Pick Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateGiven}
                  onSelect={(d) => d && setDateGiven(d)}
                />
              </PopoverContent>
            </Popover>
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
            {loading ? "Saving..." : "Save Prescription"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
