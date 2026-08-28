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
import { Calendar as CalendarIcon, Upload, Check, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { mothersApi } from "../api"

export interface RegisterLabModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherData: any
  visitationList?: any[]
  onSuccess?: () => void
}

export function RegisterLabModal({
  open,
  onOpenChange,
  motherData,
  visitationList = [],
  onSuccess,
}: RegisterLabModalProps) {
  const [pregnancyId, setPregnancyId] = React.useState<string>("")
  const [visitId, setVisitId] = React.useState<string>("")
  const [screeningType, setScreeningType] = React.useState<string>("CBC (Complete Blood Count)")
  const [result, setResult] = React.useState<string>("")
  const [fileUrl, setFileUrl] = React.useState<string>("")
  const [uploading, setUploading] = React.useState(false)
  const [screeningDate, setScreeningDate] = React.useState<Date>(new Date())
  const [remarks, setRemarks] = React.useState<string>("")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError(`Selected document (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed 10 MB limit.`)
      e.target.value = ""
      return
    }

    setUploading(true)
    setError(null)
    const token = localStorage.getItem("token")
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await mothersApi.uploadLabFile(file)
      if (res?.file_url) {
        setFileUrl(res.file_url)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

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
      setError("A recorded visitation encounter is required for lab screening.")
      return
    }

    if (!screeningType || !result || !screeningDate) {
      setError("Please fill in screening type, result, and screening date.")
      return
    }

    setLoading(true)

    try {
      const motherId = motherData?.mother_id || motherData?.user_id || motherData?._id || motherData?.id || ""

      const payload = {
        mother_id: motherId,
        pregnancy_id: pregnancyId,
        visit_id: visitId,
        screening_type: screeningType,
        result: result,
        file_url: fileUrl || undefined,
        date_of_screening: screeningDate.toISOString(),
        remarks: remarks || undefined,
      }

      await mothersApi.registerLabRecord(payload)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to log lab screening"
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Laboratory Record"
      description="Record laboratory screening test results for this mother."
      className="sm:max-w-[500px]"
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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground dark:text-white">Screening Type *</Label>
            <Select value={screeningType} onValueChange={setScreeningType}>
              <SelectTrigger className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
                <SelectValue placeholder="Select Screening" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CBC (Complete Blood Count)">CBC (Complete Blood Count)</SelectItem>
                <SelectItem value="Blood Typing (ABO/Rh)">Blood Typing (ABO/Rh)</SelectItem>
                <SelectItem value="Urinalysis">Urinalysis</SelectItem>
                <SelectItem value="HBsAg (Hepatitis B)">HBsAg (Hepatitis B)</SelectItem>
                <SelectItem value="HIV Screening">HIV Screening</SelectItem>
                <SelectItem value="Syphilis (VDRL/RPR)">Syphilis (VDRL/RPR)</SelectItem>
                <SelectItem value="OGTT (Glucose Tolerance)">OGTT (Glucose Tolerance)</SelectItem>
                <SelectItem value="Ultrasound">Ultrasound</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground dark:text-white">Date of Screening *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full !h-9 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                    !screeningDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {screeningDate ? format(screeningDate, "PPP") : <span>Pick Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={screeningDate}
                  onSelect={(d) => d && setScreeningDate(d)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="labResult" className="text-xs font-medium text-foreground dark:text-white">Screening Result *</Label>
          <Input
            id="labResult"
            placeholder="e.g. Normal, Non-reactive, Hemoglobin: 12.5 g/dL"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground dark:text-white">Document / Lab Attachment (Optional)</Label>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-sidebar-border bg-muted/30 dark:bg-[#0a0a0a]">
            <label className="cursor-pointer flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                className="w-full h-9 px-3 text-xs font-medium border-sidebar-border gap-2 pointer-events-none bg-background dark:bg-black"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    Uploading Document...
                  </>
                ) : fileUrl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Document Uploaded (Click to Change)
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Choose File (PNG, JPG, PDF)
                  </>
                )}
              </Button>
            </label>
          </div>
          {fileUrl && (
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium truncate">
              Attached: {fileUrl.split('/').pop()}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="labRemarks" className="text-xs font-medium text-foreground dark:text-white">Remarks / Findings</Label>
          <Textarea
            id="labRemarks"
            placeholder="Enter clinical observations or follow-up notes..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="resize-none h-[65px] bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
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
            {loading ? "Saving..." : "Save Lab Record"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
