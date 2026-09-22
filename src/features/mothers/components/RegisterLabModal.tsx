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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon, Upload, Check, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { validateLabData } from "@/lib/clinicalValidation"
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
  const [screeningType, setScreeningType] = React.useState<string>(
    "General Screening"
  )
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
      setError(
        `Selected document (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed 10 MB limit.`
      )
      e.target.value = ""
      return
    }

    setUploading(true)
    setError(null)
    const token = localStorage.getItem("token")
    const baseUrl =
      import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await mothersApi.uploadLabFile(file)
      if (res?.file_url) {
        setFileUrl(res.file_url)
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to upload file"
      )
    } finally {
      setUploading(false)
    }
  }

  const pregnancies = motherData?.pregnancies || []
  const allVisits =
    visitationList.length > 0
      ? visitationList
      : motherData?.prenatalVisits || []

  const availableVisits = React.useMemo(() => {
    if (!pregnancyId) return allVisits
    const matched = allVisits.filter((v: any) => v.pregnancy_id === pregnancyId)
    return matched.length > 0 ? matched : allVisits
  }, [allVisits, pregnancyId])

  React.useEffect(() => {
    if (pregnancies.length > 0 && !pregnancyId) {
      const activePreg =
        pregnancies.find(
          (p: any) => p.pregnancy_status?.toLowerCase() === "active"
        ) || pregnancies[0]
      const chosenPId =
        activePreg.pregnancy_id || activePreg._id || activePreg.id || ""
      setPregnancyId(chosenPId)
    }
  }, [motherData, open, pregnancies, pregnancyId])

  React.useEffect(() => {
    if (availableVisits.length > 0) {
      const currentExists = availableVisits.some(
        (v: any) => (v.visit_id || v._id || v.id) === visitId
      )
      if (!currentExists || !visitId) {
        setVisitId(
          availableVisits[0].visit_id ||
            availableVisits[0]._id ||
            availableVisits[0].id ||
            ""
        )
      }
    } else {
      setVisitId("")
    }
  }, [availableVisits, open])

  const handleSubmit = async () => {
    setError(null)

    if (!pregnancyId) {
      setError("Target pregnancy record is required.")
      return
    }

    if (!screeningType || !screeningDate) {
      setError("Please fill in screening type and screening date.")
      return
    }

    const labVal = validateLabData({
      screening_type: screeningType,
      result: result || undefined,
      date_of_screening: screeningDate.toISOString(),
    })

    if (!labVal.isValid) {
      setError(labVal.errors.join(" "))
      return
    }

    setLoading(true)

    try {
      const motherId =
        motherData?.mother_id ||
        motherData?.user_id ||
        motherData?._id ||
        motherData?.id ||
        ""

      const payload = {
        mother_id: motherId,
        pregnancy_id: pregnancyId,
        visit_id: (visitId && visitId !== "baseline") ? visitId : undefined,
        screening_type: screeningType,
        result: result.trim() || "Pending",
        file_url: fileUrl || undefined,
        date_of_screening: screeningDate.toISOString(),
        remarks: remarks || undefined,
      }

      await mothersApi.registerLabRecord(payload)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error ||
        err.message ||
        "Failed to log lab screening"
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
      <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto px-1 py-2">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2.5 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground">
              Target Pregnancy *
            </Label>
            <Select
              value={pregnancyId}
              onValueChange={(val) => {
                setPregnancyId(val)
                const matching = allVisits.filter(
                  (v: any) => v.pregnancy_id === val
                )
                if (matching.length > 0) {
                  setVisitId(
                    matching[0].visit_id ||
                      matching[0]._id ||
                      matching[0].id ||
                      ""
                  )
                } else {
                  setVisitId("baseline")
                }
              }}
            >
              <SelectTrigger className="!h-9 border-border bg-card text-xs text-card-foreground">
                <SelectValue placeholder="Select Pregnancy" />
              </SelectTrigger>
              <SelectContent>
                {pregnancies.map((p: any, idx: number) => {
                  const pId = p.pregnancy_id || p._id || p.id || String(idx)
                  return (
                    <SelectItem key={pId} value={pId}>
                      Pregnancy #{pregnancies.length - idx} (
                      {p.pregnancy_status || "Active"})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground">
              Associated Visit
            </Label>
            <Select value={visitId || "baseline"} onValueChange={setVisitId}>
              <SelectTrigger className="!h-9 border-border bg-card text-xs text-card-foreground">
                <SelectValue placeholder="Select Visit" />
              </SelectTrigger>
              <SelectContent>
                {availableVisits.length === 0 ? (
                  <SelectItem value="baseline">
                    Baseline Visit (Auto-create)
                  </SelectItem>
                ) : (
                  availableVisits.map((v: any, idx: number) => {
                    const vId = v.visit_id || v._id || v.id || String(idx)
                    return (
                      <SelectItem key={vId} value={vId}>
                        Visit #{v.visit_number || idx + 1} -{" "}
                        {format(new Date(v.visit_date), "MMM d, yyyy")}
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
            <Label
              htmlFor="screeningType"
              className="text-xs font-medium text-foreground"
            >
              Screening Type *
            </Label>
            <Input
              id="screeningType"
              list="common-screening-types"
              placeholder="e.g. CBC, Urinalysis, Blood Typing"
              value={screeningType}
              onChange={(e) => setScreeningType(e.target.value)}
              className="!h-9 border-border bg-card text-xs text-card-foreground"
            />
            <datalist id="common-screening-types">
              <option value="General Screening" />
              <option value="CBC (Complete Blood Count)" />
              <option value="Blood Typing (ABO/Rh)" />
              <option value="Urinalysis" />
              <option value="HBsAg (Hepatitis B)" />
              <option value="HIV Screening" />
              <option value="Syphilis (VDRL/RPR)" />
              <option value="OGTT (Glucose Tolerance)" />
              <option value="Ultrasound" />
              <option value="Pap Smear" />
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground">
              Date of Screening *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "!h-9 w-full justify-start border-border bg-card text-left text-xs font-normal",
                    !screeningDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {screeningDate ? (
                    format(screeningDate, "PPP")
                  ) : (
                    <span>Pick Date</span>
                  )}
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
          <Label
            htmlFor="labResult"
            className="text-xs font-medium text-foreground"
          >
            Screening Result (Optional)
          </Label>
          <Input
            id="labResult"
            placeholder="e.g. Normal, Non-reactive, Hemoglobin: 12.5 g/dL"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="!h-9 border-border bg-card text-xs text-card-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Document / Lab Attachment (Optional)
          </Label>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3">
            <label className="flex-1 cursor-pointer">
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
                className="pointer-events-none h-9 w-full gap-2 border-border bg-card px-3 text-xs font-medium text-card-foreground"
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
            <span className="truncate text-[10px] font-medium text-emerald-600">
              Attached: {fileUrl.split("/").pop()}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="labRemarks"
            className="text-xs font-medium text-foreground"
          >
            Remarks / Findings
          </Label>
          <Textarea
            id="labRemarks"
            placeholder="Enter clinical observations or follow-up notes..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="h-[65px] resize-none border-border bg-card text-xs text-card-foreground"
          />
        </div>

        <div className="mt-1 flex justify-end gap-2 border-t border-border pt-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-8 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Saving..." : "Save Lab Record"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
