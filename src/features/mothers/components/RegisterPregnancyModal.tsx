import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { validatePregnancyData } from "@/lib/clinicalValidation"
import { mothersApi } from "../api"

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
  const [eddDate, setEddDate] = React.useState<Date>()
  const [heightCm, setHeightCm] = React.useState<string>("")
  const [completed8Anc, setCompleted8Anc] = React.useState<boolean>(false)
  const [gravida, setGravida] = React.useState<number>(1)
  const [parity, setParity] = React.useState<number>(0)
  const [previousDeliveryHistory, setPreviousDeliveryHistory] =
    React.useState<string>("")
  const [coMorbidities, setCoMorbidities] = React.useState<string>("")
  const [ageGroup, setAgeGroup] = React.useState<string>("20-34 years")
  const [bmi1stTrimester, setBmi1stTrimester] = React.useState<string>("")
  const [bmiCategory, setBmiCategory] = React.useState<string>("Normal")
  const [pregnancyStatus, setPregnancyStatus] = React.useState<string>("Active")

  const [prevCaesarean, setPrevCaesarean] = React.useState(false)
  const [consecutiveMiscarriages, setConsecutiveMiscarriages] = React.useState(false)
  const [stillbirthHistory, setStillbirthHistory] = React.useState(false)
  const [pphHistory, setPphHistory] = React.useState(false)

  const [hasTb, setHasTb] = React.useState(false)
  const [hasHeartDisease, setHasHeartDisease] = React.useState(false)
  const [hasDiabetes, setHasDiabetes] = React.useState(false)
  const [hasAsthma, setHasAsthma] = React.useState(false)
  const [hasGoiter, setHasGoiter] = React.useState(false)

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const motherId =
    motherData?.mother_id ||
    motherData?.user_id ||
    motherData?._id ||
    motherData?.id

  const handleSelectLmp = (date?: Date) => {
    setLmpDate(date)
    if (date) {
      const calculated = new Date(date.getTime() + 280 * 24 * 60 * 60 * 1000)
      setEddDate(calculated)
    }
  }

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

    const pregVal = validatePregnancyData({
      lmp_date: lmpDate.toISOString(),
      edd_date: eddDate ? eddDate.toISOString() : undefined,
      height_cm: heightCm ? Number(heightCm) : undefined,
      gravida: Number(gravida),
      parity: Number(parity),
      pregnancy_status: pregnancyStatus,
    })

    if (!pregVal.isValid) {
      setError(pregVal.errors.join(" "))
      return
    }

    setLoading(true)

    try {
      const payload = {
        motherId,
        lmp_date: lmpDate.toISOString(),
        edd_date: eddDate ? eddDate.toISOString() : undefined,
        height_cm: heightCm ? Number(heightCm) : undefined,
        completed_8anc: completed8Anc,
        gravida: Number(gravida),
        parity: Number(parity),
        previous_delivery_history: previousDeliveryHistory || undefined,
        co_morbidities: coMorbidities || undefined,
        age_group: ageGroup,
        bmi_1st_trimester: bmi1stTrimester
          ? Number(bmi1stTrimester)
          : undefined,
        bmi_category: bmiCategory,
        pregnancy_status: pregnancyStatus,
        prev_caesarean: prevCaesarean,
        consecutive_miscarriages: consecutiveMiscarriages,
        stillbirth_history: stillbirthHistory,
        pph_history: pphHistory,
        has_tb: hasTb,
        has_heart_disease: hasHeartDisease,
        has_diabetes: hasDiabetes,
        has_asthma: hasAsthma,
        has_goiter: hasGoiter,
      }

      await mothersApi.registerPregnancy(payload)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error ||
        err.message ||
        "Failed to register pregnancy"
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
      className="sm:max-w-3xl lg:max-w-4xl"
    >
      <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto px-1 py-2">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2.5 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Obstetric Baseline & Status */}
        <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/50 p-3.5">
          <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Obstetric Baseline & Status
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                LMP Date *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "!h-8 w-full justify-start border-border bg-card text-left text-xs font-normal",
                      !lmpDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {lmpDate ? (
                      format(lmpDate, "PPP")
                    ) : (
                      <span>Pick LMP Date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={lmpDate}
                    onSelect={handleSelectLmp}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Estimated Due Date (EDD)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "!h-8 w-full justify-start border-border bg-card text-left text-xs font-normal",
                      !eddDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {eddDate ? (
                      format(eddDate, "PPP")
                    ) : (
                      <span>Pick EDD Date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={eddDate}
                    onSelect={setEddDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Maternal Height (cm)
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 152.5"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="!h-8 border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Pregnancy Status *
              </Label>
              <Select
                value={pregnancyStatus}
                onValueChange={setPregnancyStatus}
              >
                <SelectTrigger className="!h-8 border-border bg-card text-xs text-card-foreground">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="gravida"
                className="text-xs font-medium text-foreground"
              >
                Gravida (G) *
              </Label>
              <Input
                id="gravida"
                type="number"
                min={1}
                value={gravida}
                onChange={(e) => setGravida(Number(e.target.value))}
                className="!h-8 border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="parity"
                className="text-xs font-medium text-foreground"
              >
                Parity (P) *
              </Label>
              <Input
                id="parity"
                type="number"
                min={0}
                value={parity}
                onChange={(e) => setParity(Number(e.target.value))}
                className="!h-8 border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Age Group *
              </Label>
              <Select value={ageGroup} onValueChange={setAgeGroup}>
                <SelectTrigger className="!h-8 border-border bg-card text-xs text-card-foreground">
                  <SelectValue placeholder="Age Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="< 19 years">&lt; 19 years</SelectItem>
                  <SelectItem value="20-34 years">20-34 years</SelectItem>
                  <SelectItem value="35+ years">35+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 sm:pt-5">
              <Checkbox
                id="completed8Anc"
                checked={completed8Anc}
                onCheckedChange={(checked) => setCompleted8Anc(Boolean(checked))}
              />
              <Label htmlFor="completed8Anc" className="text-xs cursor-pointer text-foreground font-medium">
                Completed 8 ANC Visits
              </Label>
            </div>
          </div>
        </div>

        {/* 2 Column Layout for Risk History/Conditions & Clinical Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Risk & Pre-existing Conditions */}
          <div className="flex flex-col gap-4">
            {/* Obstetric High-Risk History */}
            <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/50 p-3.5">
              <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Obstetric High-Risk History
              </h4>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="prevCaesarean"
                    checked={prevCaesarean}
                    onCheckedChange={(checked) => setPrevCaesarean(Boolean(checked))}
                  />
                  <Label htmlFor="prevCaesarean" className="text-xs cursor-pointer">
                    Previous C-Section
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="consecutiveMiscarriages"
                    checked={consecutiveMiscarriages}
                    onCheckedChange={(checked) => setConsecutiveMiscarriages(Boolean(checked))}
                  />
                  <Label htmlFor="consecutiveMiscarriages" className="text-xs cursor-pointer">
                    Consecutive Miscarriages
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="stillbirthHistory"
                    checked={stillbirthHistory}
                    onCheckedChange={(checked) => setStillbirthHistory(Boolean(checked))}
                  />
                  <Label htmlFor="stillbirthHistory" className="text-xs cursor-pointer">
                    Stillbirth History
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pphHistory"
                    checked={pphHistory}
                    onCheckedChange={(checked) => setPphHistory(Boolean(checked))}
                  />
                  <Label htmlFor="pphHistory" className="text-xs cursor-pointer">
                    PPH History
                  </Label>
                </div>
              </div>
            </div>

            {/* Pre-existing & Chronic Conditions */}
            <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/50 p-3.5">
              <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Pre-existing & Chronic Conditions
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasHeartDisease"
                    checked={hasHeartDisease}
                    onCheckedChange={(checked) => setHasHeartDisease(Boolean(checked))}
                  />
                  <Label htmlFor="hasHeartDisease" className="text-xs cursor-pointer text-destructive font-medium">
                    Heart Disease
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasDiabetes"
                    checked={hasDiabetes}
                    onCheckedChange={(checked) => setHasDiabetes(Boolean(checked))}
                  />
                  <Label htmlFor="hasDiabetes" className="text-xs cursor-pointer">
                    Diabetes
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasTb"
                    checked={hasTb}
                    onCheckedChange={(checked) => setHasTb(Boolean(checked))}
                  />
                  <Label htmlFor="hasTb" className="text-xs cursor-pointer">
                    Tuberculosis
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasAsthma"
                    checked={hasAsthma}
                    onCheckedChange={(checked) => setHasAsthma(Boolean(checked))}
                  />
                  <Label htmlFor="hasAsthma" className="text-xs cursor-pointer">
                    Asthma
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasGoiter"
                    checked={hasGoiter}
                    onCheckedChange={(checked) => setHasGoiter(Boolean(checked))}
                  />
                  <Label htmlFor="hasGoiter" className="text-xs cursor-pointer">
                    Goiter
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clinical & Nutrition Indicators */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/50 p-3.5">
            <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Clinical & Nutrition Indicators
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="bmi1st"
                  className="text-xs font-medium text-foreground"
                >
                  1st Tri BMI
                </Label>
                <Input
                  id="bmi1st"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 22.5"
                  value={bmi1stTrimester}
                  onChange={(e) => setBmi1stTrimester(e.target.value)}
                  className="!h-8 border-border bg-card text-xs text-card-foreground"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  BMI Category
                </Label>
                <Select value={bmiCategory} onValueChange={setBmiCategory}>
                  <SelectTrigger className="!h-8 border-border bg-card text-xs text-card-foreground">
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
              <Label
                htmlFor="coMorbidities"
                className="text-xs font-medium text-foreground"
              >
                Other Co-morbidities
              </Label>
              <Input
                id="coMorbidities"
                placeholder="e.g. Chronic Kidney Disease, Epilepsy"
                value={coMorbidities}
                onChange={(e) => setCoMorbidities(e.target.value)}
                className="!h-8 border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="previousDelivery"
                className="text-xs font-medium text-foreground"
              >
                Previous Delivery History Notes
              </Label>
              <Textarea
                id="previousDelivery"
                placeholder="Notes on previous deliveries..."
                value={previousDeliveryHistory}
                onChange={(e) => setPreviousDeliveryHistory(e.target.value)}
                className="h-[76px] resize-none border-border bg-card text-xs text-card-foreground"
              />
            </div>
          </div>
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
            {loading ? "Registering..." : "Save Pregnancy"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
