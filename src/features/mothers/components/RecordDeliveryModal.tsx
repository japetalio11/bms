import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Activity,
  HeartPulse,
  Clock,
  MapPin,
  Stethoscope,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { mothersApi } from "../api"

export interface RecordDeliveryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherData: any
  pregnancyList: any[]
  onSuccess?: () => void
}

interface NewbornEntry {
  sex: "Female" | "Male" | "Ambiguous"
  birth_weight_kg: string
  status_at_birth: "Alive" | "Fresh Stillbirth" | "Macerated Stillbirth"
  apgar_score: number
}

export function RecordDeliveryModal({
  open,
  onOpenChange,
  motherData,
  pregnancyList,
  onSuccess,
}: RecordDeliveryModalProps) {
  const activePreg = React.useMemo(() => {
    return (
      pregnancyList?.find(
        (p) =>
          p.pregnancy_status === "Active" ||
          p.status === "Active" ||
          !p.pregnancy_status
      ) ||
      pregnancyList?.[0] ||
      null
    )
  }, [pregnancyList])

  const [selectedPregnancyId, setSelectedPregnancyId] = React.useState<string>("")
  const [deliveryDate, setDeliveryDate] = React.useState<Date>(new Date())
  const [placeOfDelivery, setPlaceOfDelivery] = React.useState<string>("Rural Health Unit / Birthing Clinic")
  const [modeOfDelivery, setModeOfDelivery] = React.useState<string>("Normal Spontaneous Vaginal Delivery (NSVD)")
  const [durationOfLabor, setDurationOfLabor] = React.useState<string>("")
  const [bloodLossMl, setBloodLossMl] = React.useState<string>("")
  const [deliveryComplications, setDeliveryComplications] = React.useState<string>("")

  const [newborns, setNewborns] = React.useState<NewbornEntry[]>([
    {
      sex: "Female",
      birth_weight_kg: "3.2",
      status_at_birth: "Alive",
      apgar_score: 9,
    },
  ])

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (activePreg) {
      setSelectedPregnancyId(activePreg.pregnancy_id || activePreg.id || "")
    }
  }, [activePreg, open])

  const handleAddNewborn = () => {
    setNewborns((prev) => [
      ...prev,
      {
        sex: "Male",
        birth_weight_kg: "3.0",
        status_at_birth: "Alive",
        apgar_score: 9,
      },
    ])
  }

  const handleRemoveNewborn = (index: number) => {
    if (newborns.length <= 1) return
    setNewborns((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateNewborn = (index: number, field: keyof NewbornEntry, value: any) => {
    setNewborns((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const getWeightInterpretation = (weightStr: string) => {
    const w = parseFloat(weightStr)
    if (isNaN(w) || w <= 0) return null
    if (w < 2.5) {
      return {
        text: "Low birth weight (< 2.5 kg)",
        className: "text-amber-500",
      }
    }
    if (w > 4.0) {
      return {
        text: "Macrosomia (> 4.0 kg)",
        className: "text-purple-500",
      }
    }
    return {
      text: "Normal weight (2.5 - 4.0 kg)",
      className: "text-emerald-500",
    }
  }

  const getApgarDetails = (score: number) => {
    if (score >= 7) {
      return {
        label: "Normal / Reassuring",
        badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
        activeBtnClass: "border-emerald-500 bg-emerald-500 text-white",
      }
    }
    if (score >= 4) {
      return {
        label: "Moderately Depressed",
        badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
        activeBtnClass: "border-amber-500 bg-amber-500 text-white",
      }
    }
    return {
      label: "Critical / Immediate Resuscitation",
      badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/30",
      activeBtnClass: "border-rose-500 bg-rose-500 text-white",
    }
  }

  const handleSubmit = async () => {
    setError(null)

    if (!selectedPregnancyId) {
      setError("Please select the associated pregnancy.")
      return
    }

    if (!placeOfDelivery || !modeOfDelivery) {
      setError("Please specify the place and mode of delivery.")
      return
    }

    for (let i = 0; i < newborns.length; i++) {
      const nb = newborns[i]
      const weight = parseFloat(nb.birth_weight_kg)
      if (isNaN(weight) || weight <= 0 || weight > 10) {
        setError(`Newborn #${i + 1}: Please enter a valid birth weight in kg.`)
        return
      }
    }

    try {
      setLoading(true)
      const payload = {
        pregnancy_id: selectedPregnancyId,
        delivery_date: deliveryDate.toISOString(),
        place_of_delivery: placeOfDelivery,
        mode_of_delivery: modeOfDelivery,
        duration_of_labor_hours: durationOfLabor ? parseFloat(durationOfLabor) : null,
        blood_loss_ml: bloodLossMl ? parseInt(bloodLossMl, 10) : null,
        delivery_complications: deliveryComplications.trim() || null,
        newborns: newborns.map((nb) => ({
          sex: nb.sex,
          birth_weight_kg: parseFloat(nb.birth_weight_kg),
          status_at_birth: nb.status_at_birth,
          apgar_score: Number(nb.apgar_score),
        })),
      }

      await mothersApi.registerDeliveryOutcome(payload)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to record delivery outcome.")
    } finally {
      setLoading(false)
    }
  }

  const motherDisplayName =
    [
      motherData?.user?.first_name || motherData?.first_name,
      motherData?.user?.last_name || motherData?.last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Mother"

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[620px] p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-foreground">
              Record Delivery & Newborn Outcome
            </h2>
            <p className="text-xs text-muted-foreground">
              Patient: <span className="font-medium text-foreground">{motherDisplayName}</span>
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-border pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>1. Maternal Delivery Details</span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Associated Pregnancy</Label>
                <Select
                  value={selectedPregnancyId}
                  onValueChange={setSelectedPregnancyId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select pregnancy" />
                  </SelectTrigger>
                  <SelectContent>
                    {pregnancyList?.map((p) => {
                      const id = p.pregnancy_id || p.id
                      const lmp = p.lmp_date || p.lmp
                      return (
                        <SelectItem key={id} value={id} className="text-xs">
                          {`Gravida ${p.gravida || 1}, Para ${p.parity || 0} (${lmp ? format(new Date(lmp), "MMM d, yyyy") : "LMP N/A"})`}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Delivery Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-8 w-full justify-start text-left text-xs font-normal",
                        !deliveryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      {deliveryDate ? format(deliveryDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={(d) => d && setDeliveryDate(d)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Place of Delivery</Label>
                <Select
                  value={placeOfDelivery}
                  onValueChange={setPlaceOfDelivery}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select place" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rural Health Unit / Birthing Clinic" className="text-xs">
                      Rural Health Unit / Birthing Clinic
                    </SelectItem>
                    <SelectItem value="District Hospital" className="text-xs">
                      District Hospital
                    </SelectItem>
                    <SelectItem value="Provincial / Tertiary Hospital" className="text-xs">
                      Provincial / Tertiary Hospital
                    </SelectItem>
                    <SelectItem value="Private Hospital / Clinic" className="text-xs">
                      Private Hospital / Clinic
                    </SelectItem>
                    <SelectItem value="Home Delivery" className="text-xs">
                      Home Delivery
                    </SelectItem>
                    <SelectItem value="In-Transit" className="text-xs">
                      In-Transit
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Mode of Delivery</Label>
                <Select
                  value={modeOfDelivery}
                  onValueChange={setModeOfDelivery}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal Spontaneous Vaginal Delivery (NSVD)" className="text-xs">
                      Normal Spontaneous (NSVD)
                    </SelectItem>
                    <SelectItem value="Cesarean Section (C-Section)" className="text-xs">
                      Cesarean Section (C-Section)
                    </SelectItem>
                    <SelectItem value="Assisted Vaginal (Forceps / Vacuum)" className="text-xs">
                      Assisted Vaginal (Forceps / Vacuum)
                    </SelectItem>
                    <SelectItem value="Vaginal Birth After Cesarean (VBAC)" className="text-xs">
                      Vaginal Birth After Cesarean (VBAC)
                    </SelectItem>
                    <SelectItem value="Breech Extraction" className="text-xs">
                      Breech Extraction
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Duration of Labor</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    className="h-8 text-xs pr-14"
                    placeholder="e.g. 8.5"
                    value={durationOfLabor}
                    onChange={(e) => setDurationOfLabor(e.target.value)}
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-muted-foreground pointer-events-none">
                    hours
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Estimated Blood Loss</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="10"
                    min="0"
                    className="h-8 text-xs pr-10"
                    placeholder="e.g. 300"
                    value={bloodLossMl}
                    onChange={(e) => setBloodLossMl(e.target.value)}
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-muted-foreground pointer-events-none">
                    mL
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Clinical Notes & Complications</Label>
              <Textarea
                className="resize-none text-xs"
                rows={2}
                placeholder="Labor notes, perineal condition, or any complications."
                value={deliveryComplications}
                onChange={(e) => setDeliveryComplications(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <HeartPulse className="h-3.5 w-3.5 text-primary" />
                <span>2. Newborn Vital Statistics</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 font-normal"
                onClick={handleAddNewborn}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Newborn
              </Button>
            </div>

            <div className="space-y-4">
              {newborns.map((nb, idx) => {
                const weightStatus = getWeightInterpretation(nb.birth_weight_kg)
                const apgarStatus = getApgarDetails(nb.apgar_score)

                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-card p-4 space-y-3.5"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <span className="text-xs font-semibold text-foreground">
                        {newborns.length > 1 ? `Newborn #${idx + 1}` : "Newborn Details"}
                      </span>
                      {newborns.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveNewborn(idx)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Sex</Label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["Female", "Male", "Ambiguous"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleUpdateNewborn(idx, "sex", s)}
                              className={cn(
                                "flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                                nb.sex === s
                                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {s === "Ambiguous" ? "Other" : s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Birth Weight</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.5"
                            max="8.0"
                            className="h-8 text-xs pr-8"
                            placeholder="3.2"
                            value={nb.birth_weight_kg}
                            onChange={(e) => handleUpdateNewborn(idx, "birth_weight_kg", e.target.value)}
                          />
                          <span className="absolute right-3 top-2 text-[11px] text-muted-foreground pointer-events-none">
                            kg
                          </span>
                        </div>
                        {weightStatus && (
                          <p className={cn("text-[10px] font-medium leading-none mt-1", weightStatus.className)}>
                            {weightStatus.text}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Status at Birth</Label>
                        <Select
                          value={nb.status_at_birth}
                          onValueChange={(val: any) => handleUpdateNewborn(idx, "status_at_birth", val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Alive" className="text-xs">Live Birth</SelectItem>
                            <SelectItem value="Fresh Stillbirth" className="text-xs">Fresh Stillbirth</SelectItem>
                            <SelectItem value="Macerated Stillbirth" className="text-xs">Macerated Stillbirth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">APGAR Score</Label>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", apgarStatus.badgeClass)}>
                          Score: {nb.apgar_score}/10 — {apgarStatus.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-11 gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleUpdateNewborn(idx, "apgar_score", score)}
                            className={cn(
                              "flex h-7 w-full items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                              nb.apgar_score === score
                                ? apgarStatus.activeBtnClass
                                : "border-border bg-background text-foreground hover:bg-muted"
                            )}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Recording..." : "Save Delivery & Newborn"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
