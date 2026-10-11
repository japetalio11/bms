import { useState, useEffect, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { syncEngine } from "@/lib/sync/syncEngine"
import {
  AlertTriangle,
  Server,
  Smartphone,
  CheckCircle2,
  X,
  RefreshCw,
  Clock,
  User,
  HeartPulse,
  Calendar,
  Layers,
  Baby,
  MapPin,
  Phone,
  Activity,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ConflictResolutionModalProps {
  open: boolean
  onClose: () => void
  conflictId?: string
  entityId?: string
  onResolved?: (conflictId: string) => void
}

type ResolutionStrategy = "SERVER_WINS" | "CLIENT_WINS" | "FIELD_MERGE" | "CUSTOM"

const isIdField = (key: string): boolean => {
  const k = key.toLowerCase()
  if (k === "id" || k === "_id" || k === "uuid") return true
  if (k.endsWith("_id") && !k.includes("philhealth")) return true
  if (k.endsWith("id") && k !== "valid" && !k.includes("philhealth")) return true
  if (k.endsWith("_by") || k.startsWith("created_by") || k.startsWith("updated_by")) return true
  return false
}

const isSystemMetaField = (key: string): boolean => {
  const k = key.toLowerCase()
  const meta = [
    "version",
    "__v",
    "sync_status",
    "created_at",
    "updated_at",
    "deleted",
    "is_deleted",
    "user",
    "mother",
    "pregnancy",
    "creator",
    "assignedworker",
    "assigned_worker",
    "facilityenrollments",
    "facilitydocuments",
    "password",
    "token",
    "salt",
    "endpoint",
    "method",
    "detected_at",
    "last_error",
  ]
  return meta.includes(k)
}

export const isIgnoredConflictField = (key: string): boolean => {
  return isIdField(key) || isSystemMetaField(key)
}

function tryParseDate(val: any, fieldName?: string): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val
  if (typeof val === "number" && val > 946684800000 && val < 2524608000000) {
    return new Date(val)
  }
  if (typeof val === "string") {
    const trimmed = val.trim()
    const isoRegex =
      /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
    if (isoRegex.test(trimmed)) {
      const d = new Date(trimmed)
      if (!isNaN(d.getTime())) return d
    }
    const nameHints = ["date", "dob", "birth", "lmp", "edd", "schedule"]
    if (fieldName && nameHints.some((h) => fieldName.toLowerCase().includes(h))) {
      const d = new Date(trimmed)
      if (!isNaN(d.getTime())) return d
    }
  }
  return null
}

function formatEnglishDate(date: Date, rawVal?: any): string {
  const rawStr = typeof rawVal === "string" ? rawVal.trim() : ""
  const isDateOnly =
    rawStr.length === 10 ||
    rawStr.includes("T00:00:00") ||
    (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0)

  if (isDateOnly) {
    return date.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  )
}

export const formatFieldName = (key: string): string => {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

function RenderConflictValue({ value, fieldKey }: { value: any; fieldKey: string }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground italic text-xs">Empty / Not recorded</span>
  }

  if (typeof value === "boolean") {
    return (
      <Badge
        variant={value ? "default" : "secondary"}
        className={`text-xs ${value ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""}`}
      >
        {value ? "Yes / Observed" : "No / None"}
      </Badge>
    )
  }

  const parsedDate = tryParseDate(value, fieldKey)
  if (parsedDate) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
        {formatEnglishDate(parsedDate, value)}
      </span>
    )
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if ("street" in value || "barangay" in value || "city" in value || "province" in value) {
      const parts = [
        value.street,
        value.barangay && `Brgy. ${value.barangay}`,
        value.city,
        value.province,
      ].filter(Boolean)
      return (
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground text-xs">{parts.join(", ") || "Address recorded"}</span>
            {value.zip && <span className="text-[10px] text-muted-foreground">ZIP: {value.zip}</span>}
          </div>
        </div>
      )
    }

    if ("name" in value || "relationship" in value || "phone" in value || "contact_number" in value) {
      return (
        <div className="flex items-start gap-1.5">
          <Phone className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground text-xs">{value.name || "Emergency Contact"}</span>
            <span className="text-[11px] text-muted-foreground">
              {[value.relationship && `(${value.relationship})`, value.phone || value.contact_number]
                .filter(Boolean)
                .join(" • ")}
            </span>
          </div>
        </div>
      )
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic text-xs">No entries recorded (0 items)</span>
    }

    if (fieldKey.toLowerCase().includes("pregnanc")) {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <span className="text-[11px] font-semibold text-primary">
            {value.length} Pregnancy Record{value.length === 1 ? "" : "s"}
          </span>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
            {value.map((p: any, idx: number) => {
              const lmp = tryParseDate(p.lmp_date || p.lmp)
              const edd = tryParseDate(p.edd_date || p.edd)
              return (
                <div key={idx} className="p-2 rounded-md bg-muted/50 border border-border/70 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      Gravida {p.gravida ?? 1}, Parity {p.parity ?? 0}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {p.pregnancy_status || "Active"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    LMP: {lmp ? formatEnglishDate(lmp, p.lmp_date) : "N/A"} • EDD: {edd ? formatEnglishDate(edd, p.edd_date) : "N/A"}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (fieldKey.toLowerCase().includes("visit")) {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <span className="text-[11px] font-semibold text-primary">
            {value.length} Prenatal Visit{value.length === 1 ? "" : "s"}
          </span>
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
            {value.map((v: any, idx: number) => {
              const vDate = tryParseDate(v.visit_date || v.created_at)
              const bp =
                v.bp_systolic && v.bp_diastolic
                  ? `${v.bp_systolic}/${v.bp_diastolic} mmHg`
                  : v.blood_pressure || "N/A"
              return (
                <div key={idx} className="p-2 rounded-md bg-muted/50 border border-border/70 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      Visit #{v.visit_number ?? idx + 1} ({v.age_of_gestation_weeks ?? "?"} wks)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {vDate ? formatEnglishDate(vDate) : ""}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    BP: {bp} • Weight: {v.weight_kg ? `${v.weight_kg} kg` : "N/A"}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (fieldKey.toLowerCase().includes("appointment")) {
      return (
        <div className="flex flex-col gap-1 w-full">
          <span className="text-[11px] font-semibold text-primary">
            {value.length} Scheduled Appointment{value.length === 1 ? "" : "s"}
          </span>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
            {value.map((a: any, idx: number) => {
              const aDate = tryParseDate(a.scheduled_date || a.appointment_date)
              return (
                <div key={idx} className="p-1.5 rounded bg-muted/50 border border-border/70 text-xs">
                  <div className="font-semibold text-foreground">{a.appointment_type || a.title || "Checkup"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {aDate ? formatEnglishDate(aDate) : "No date"} ({a.status || "Scheduled"})
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (value.every((item) => typeof item === "string" || typeof item === "number")) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-[11px] px-2 py-0.5">
              {String(item)}
            </Badge>
          ))}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          {value.length} record items
        </span>
        <div className="flex flex-col gap-1 text-[11px] max-h-28 overflow-y-auto pr-1">
          {value.slice(0, 5).map((item: any, idx: number) => {
            const summary = Object.entries(item)
              .filter(([k]) => !isIdField(k) && !isSystemMetaField(k))
              .slice(0, 2)
              .map(([k, v]) => `${formatFieldName(k)}: ${v}`)
              .join(" • ")
            return (
              <div key={idx} className="px-2 py-1 rounded bg-muted/40 text-foreground">
                #{idx + 1}: {summary || "Record entry"}
              </div>
            )
          })}
          {value.length > 5 && (
            <span className="text-[10px] text-muted-foreground italic">+ {value.length - 5} more entries</span>
          )}
        </div>
      </div>
    )
  }

  if (typeof value === "object" && value !== null) {
    const cleanPairs = Object.entries(value).filter(
      ([k]) => !isIdField(k) && !isSystemMetaField(k)
    )
    if (cleanPairs.length === 0) {
      return <span className="text-muted-foreground italic text-xs">Empty record</span>
    }
    return (
      <div className="flex flex-col gap-1 text-xs">
        {cleanPairs.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-0.5 border-b border-border/40 last:border-none">
            <span className="text-muted-foreground font-medium">{formatFieldName(k)}:</span>
            <span className="font-semibold text-foreground text-right">{String(v)}</span>
          </div>
        ))}
      </div>
    )
  }

  const strVal = String(value)
  if (fieldKey.includes("height_cm")) return `${strVal} cm`
  if (fieldKey.includes("weight_kg")) return `${strVal} kg`
  if (fieldKey.includes("temperature")) return `${strVal} °C`
  if (fieldKey.includes("bp_") || fieldKey.includes("blood_pressure")) return `${strVal} mmHg`
  if (fieldKey.includes("pulse_rate") || fieldKey.includes("heart_rate")) return `${strVal} bpm`
  if (fieldKey.includes("gestation_weeks") || fieldKey.includes("age_of_gestation")) return `${strVal} weeks`

  return <span className="font-medium text-foreground">{strVal}</span>
}

interface CategoryDef {
  id: string
  label: string
  icon: any
  description: string
  match: (key: string) => boolean
}

const MOTHER_CATEGORIES: CategoryDef[] = [
  {
    id: "basic_info",
    label: "Mother Basic Info",
    icon: User,
    description: "Personal demographics, civil status, contact information, and address",
    match: (key) => {
      const k = key.toLowerCase()
      const basicKeywords = [
        "name", "first", "last", "middle", "extension",
        "birth", "dob", "age",
        "civil", "marital",
        "blood",
        "phone", "contact", "mobile", "email",
        "address", "street", "barangay", "city", "province", "zip", "sitio", "purok",
        "emergency",
        "occupation", "education", "religion",
        "philhealth", "household", "family_serial",
        "photo", "avatar"
      ]
      return basicKeywords.some((w) => k.includes(w))
    },
  },
  {
    id: "clinical",
    label: "Clinical Profile",
    icon: HeartPulse,
    description: "Anthropometrics, vitals baselines, chronic conditions, and risk flags",
    match: (key) => {
      const k = key.toLowerCase()
      const clinicalKeywords = [
        "height", "weight", "bmi", "nutritional",
        "allerg", "medical_history", "surgical", "family_history",
        "co_morbidit", "morbid", "tb", "heart", "diabet", "asthma", "goiter", "hypertension",
        "risk", "tetanus", "immuniz"
      ]
      return clinicalKeywords.some((w) => k.includes(w))
    },
  },
  {
    id: "pregnancy",
    label: "Pregnancy Records",
    icon: Baby,
    description: "Obstetric history, gravida, parity, LMP, and active pregnancies",
    match: (key) => {
      const k = key.toLowerCase()
      const pregKeywords = [
        "pregnanc", "gravida", "parity", "lmp", "edd", "anc", "caesarean", "csection",
        "miscarriage", "stillbirth", "pph", "delivery_history", "gestation"
      ]
      return pregKeywords.some((w) => k.includes(w))
    },
  },
  {
    id: "visitations",
    label: "Visits & Records",
    icon: Calendar,
    description: "Prenatal encounters, scheduled appointments, lab screenings, and prescriptions",
    match: (key) => {
      const k = key.toLowerCase()
      const visitKeywords = [
        "visit", "prenatal", "appointment", "lab", "screen", "supplement", "prescription",
        "delivery", "deliveries", "newborn", "postpartum"
      ]
      return visitKeywords.some((w) => k.includes(w))
    },
  },
  {
    id: "other",
    label: "Other Details",
    icon: Layers,
    description: "Miscellaneous clinical fields and observations",
    match: () => true,
  },
]

export function ConflictResolutionModal({
  open,
  onClose,
  conflictId,
  entityId,
  onResolved,
}: ConflictResolutionModalProps) {
  const allConflicts = useLiveQuery(
    () => db.conflicts.where("status").equals("unresolved").toArray(),
    []
  )

  const activeConflict = useMemo(() => {
    if (!allConflicts || allConflicts.length === 0) return null
    if (conflictId) {
      return (
        allConflicts.find(
          (c) => c.conflict_id === conflictId || String(c.id) === conflictId
        ) || null
      )
    }
    if (entityId) {
      return allConflicts.find((c) => c.entity_id === entityId) || null
    }
    return allConflicts[0] || null
  }, [allConflicts, conflictId, entityId])

  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy>("FIELD_MERGE")
  const [fieldSelections, setFieldSelections] = useState<Record<string, "server" | "client" | "custom">>({})
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string>("basic_info")

  const serverData = useMemo(() => activeConflict?.server_record || {}, [activeConflict])
  const clientData = useMemo(() => activeConflict?.client_payload || {}, [activeConflict])

  const relevantKeys = useMemo(() => {
    if (!activeConflict) return []
    const combined = Array.from(
      new Set([...Object.keys(serverData), ...Object.keys(clientData)])
    )
    return combined.filter(
      (k) =>
        !isIgnoredConflictField(k) &&
        (serverData[k] !== undefined || clientData[k] !== undefined)
    )
  }, [activeConflict, serverData, clientData])

  const conflictingKeys = useMemo(() => {
    if (!activeConflict) return []
    return relevantKeys.filter((k) => {
      const sVal = serverData[k]
      const cVal = clientData[k]
      if (cVal === undefined || cVal === null) return false
      return JSON.stringify(sVal) !== JSON.stringify(cVal)
    })
  }, [activeConflict, relevantKeys, serverData, clientData])

  const isMotherEntity = activeConflict?.entity_type === "mother"

  const categories = useMemo(() => {
    if (!isMotherEntity) {
      return [
        {
          id: "all",
          label: "Entity Fields",
          icon: Layers,
          description: "All attributes detected for this record",
          keys: relevantKeys,
          conflictCount: conflictingKeys.length,
        },
      ]
    }

    const assigned = new Set<string>()
    const defs = MOTHER_CATEGORIES.map((cat) => {
      let keysForCat: string[] = []
      if (cat.id === "other") {
        keysForCat = relevantKeys.filter((k) => !assigned.has(k))
      } else {
        keysForCat = relevantKeys.filter((k) => !assigned.has(k) && cat.match(k))
        keysForCat.forEach((k) => assigned.add(k))
      }

      const conflictsInCat = keysForCat.filter((k) => conflictingKeys.includes(k)).length
      return {
        ...cat,
        keys: keysForCat,
        conflictCount: conflictsInCat,
      }
    }).filter((c) => c.keys.length > 0)

    defs.push({
      id: "all",
      label: "All Fields",
      icon: Layers,
      description: "View every field across all sections",
      keys: relevantKeys,
      conflictCount: conflictingKeys.length,
      match: () => true,
    })

    return defs
  }, [isMotherEntity, relevantKeys, conflictingKeys])

  useEffect(() => {
    if (categories.length > 0) {
      const firstWithConflict = categories.find((c) => c.id !== "all" && c.conflictCount > 0)
      if (firstWithConflict) {
        setActiveCategoryId(firstWithConflict.id)
      } else {
        setActiveCategoryId(categories[0].id)
      }
    }
  }, [categories])

  useEffect(() => {
    if (activeConflict && relevantKeys.length > 0) {
      const initialSelections: Record<string, "server" | "client" | "custom"> = {}
      const initialCustom: Record<string, any> = {}

      relevantKeys.forEach((key) => {
        const clientVal = clientData[key]
        const serverVal = serverData[key]

        if (clientVal !== undefined && clientVal !== null) {
          initialSelections[key] = "client"
          initialCustom[key] = clientVal
        } else {
          initialSelections[key] = "server"
          initialCustom[key] = serverVal
        }
      })

      setFieldSelections(initialSelections)
      setCustomFieldValues(initialCustom)
      setSelectedStrategy("FIELD_MERGE")
      setResolveError(null)
      setSuccessMessage(null)
    }
  }, [activeConflict, relevantKeys, clientData, serverData])

  if (!open || !activeConflict) return null

  const activeCategory =
    categories.find((c) => c.id === activeCategoryId) || categories[0] || {
      id: "all",
      label: "All Fields",
      description: "Record fields",
      keys: relevantKeys,
      conflictCount: conflictingKeys.length,
    }

  const computedPreview = () => {
    if (selectedStrategy === "SERVER_WINS") {
      return serverData
    }
    if (selectedStrategy === "CLIENT_WINS") {
      return clientData
    }
    if (selectedStrategy === "FIELD_MERGE") {
      const merged: Record<string, any> = { ...serverData }
      for (const [k, v] of Object.entries(clientData)) {
        if (v !== undefined && v !== null && !isIgnoredConflictField(k)) {
          merged[k] = v
        }
      }
      return merged
    }

    const customMerged: Record<string, any> = { ...serverData }
    for (const key of relevantKeys) {
      const choice = fieldSelections[key] || "client"
      if (choice === "server") {
        customMerged[key] = serverData[key]
      } else if (choice === "client") {
        customMerged[key] = clientData[key]
      } else if (choice === "custom") {
        customMerged[key] = customFieldValues[key]
      }
    }
    return customMerged
  }

  const handleFieldChoiceToggle = (key: string, choice: "server" | "client") => {
    setFieldSelections((prev) => ({
      ...prev,
      [key]: choice,
    }))
    setSelectedStrategy("CUSTOM")
  }

  const handleCustomInputChange = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }))
    setFieldSelections((prev) => ({
      ...prev,
      [key]: "custom",
    }))
    setSelectedStrategy("CUSTOM")
  }

  const handleSelectAllForCategory = (choice: "server" | "client") => {
    setFieldSelections((prev) => {
      const next = { ...prev }
      activeCategory.keys.forEach((key) => {
        next[key] = choice
      })
      return next
    })
    setSelectedStrategy("CUSTOM")
  }

  const handleResolve = async () => {
    setIsResolving(true)
    setResolveError(null)
    try {
      let customPayload: any = undefined

      if (selectedStrategy === "CUSTOM" || selectedStrategy === "FIELD_MERGE") {
        customPayload = computedPreview()
      } else if (selectedStrategy === "CLIENT_WINS") {
        customPayload = clientData
      }

      const res = await syncEngine.resolveConflict(activeConflict.conflict_id, {
        strategy: selectedStrategy,
        customPayload,
      })

      setSuccessMessage(res.message || "Conflict resolved successfully!")
      if (onResolved) {
        onResolved(activeConflict.conflict_id)
      }

      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to resolve conflict. Please try again."
      setResolveError(msg)
    } finally {
      setIsResolving(false)
    }
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "mother":
        return <User className="w-5 h-5 text-primary" />
      case "pregnancy":
        return <Baby className="w-5 h-5 text-rose-500" />
      case "prenatal_visit":
        return <Activity className="w-5 h-5 text-blue-500" />
      case "appointment":
        return <Calendar className="w-5 h-5 text-amber-500" />
      default:
        return <Layers className="w-5 h-5 text-primary" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-4xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95">
        <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base sm:text-lg text-foreground">
                  Synchronize & Resolve Conflict
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 capitalize">
                  {activeConflict.entity_type.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Concurrent update detected between Cloud Server (v{activeConflict.server_version}) and Local Device (v{activeConflict.client_version}).
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-4 sm:px-6 py-2.5 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {getEntityIcon(activeConflict.entity_type)}
            <span className="font-semibold text-foreground">
              {activeConflict.entity_name || "Patient Record"}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Detected {new Date(activeConflict.detected_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">Total Discrepancies:</span>
            <Badge variant="destructive" className="text-xs px-2 py-0.5 font-bold">
              {conflictingKeys.length} {conflictingKeys.length === 1 ? "field" : "fields"}
            </Badge>
          </div>
        </div>

        {categories.length > 1 && (
          <div className="border-b border-border bg-muted/30 px-3 sm:px-5 py-2 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center gap-1.5 min-w-max">
              {categories.map((cat) => {
                const Icon = cat.icon || Layers
                const isSelected = activeCategoryId === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "bg-background/80 hover:bg-muted text-foreground border border-border/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{cat.label}</span>
                    {cat.conflictCount > 0 ? (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-destructive/15 text-destructive border border-destructive/25"
                        }`}
                      >
                        {cat.conflictCount}
                      </span>
                    ) : (
                      <Check className={`w-3 h-3 ${isSelected ? "text-primary-foreground/80" : "text-emerald-500"}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="px-4 sm:px-5 py-2.5 border-b border-border bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Strategy:
            </span>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
              <button
                onClick={() => setSelectedStrategy("FIELD_MERGE")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  selectedStrategy === "FIELD_MERGE"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Auto-Merge
              </button>
              <button
                onClick={() => setSelectedStrategy("SERVER_WINS")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  selectedStrategy === "SERVER_WINS"
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Server Wins
              </button>
              <button
                onClick={() => setSelectedStrategy("CLIENT_WINS")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  selectedStrategy === "CLIENT_WINS"
                    ? "bg-purple-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Keep Local
              </button>
              <button
                onClick={() => setSelectedStrategy("CUSTOM")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  selectedStrategy === "CUSTOM"
                    ? "bg-amber-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Custom Field Picker
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Section tools:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAllForCategory("server")}
              className="h-7 text-[11px] px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            >
              Take Server
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAllForCategory("client")}
              className="h-7 text-[11px] px-2 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
            >
              Take Local
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                {activeCategory.label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({activeCategory.description})
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                Discrepancy
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Matching
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {activeCategory.keys.map((key) => {
              const isConflictField = conflictingKeys.includes(key)
              const sVal = serverData[key]
              const cVal = clientData[key]
              const currentChoice = fieldSelections[key] || "client"

              return (
                <div
                  key={key}
                  className={`p-3 rounded-xl border transition-all ${
                    isConflictField
                      ? "bg-amber-500/5 border-amber-500/30"
                      : "bg-muted/10 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">
                        {formatFieldName(key)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {key}
                      </span>
                    </div>

                    {isConflictField ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        Discrepancy Detected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Values Match
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div
                      onClick={() => handleFieldChoiceToggle(key, "server")}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        currentChoice === "server" || selectedStrategy === "SERVER_WINS"
                          ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/30 shadow-xs"
                          : "bg-card border-border hover:border-blue-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          Cloud Server (v{activeConflict.server_version})
                        </span>
                        {(currentChoice === "server" || selectedStrategy === "SERVER_WINS") && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="text-xs break-words">
                        <RenderConflictValue value={sVal} fieldKey={key} />
                      </div>
                    </div>

                    <div
                      onClick={() => handleFieldChoiceToggle(key, "client")}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        currentChoice === "client" || selectedStrategy === "CLIENT_WINS"
                          ? "bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/30 shadow-xs"
                          : "bg-card border-border hover:border-purple-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          My Local Device (v{activeConflict.client_version})
                        </span>
                        {(currentChoice === "client" || selectedStrategy === "CLIENT_WINS") && (
                          <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <div className="text-xs break-words">
                        <RenderConflictValue value={cVal} fieldKey={key} />
                      </div>
                    </div>
                  </div>

                  {selectedStrategy === "CUSTOM" && isConflictField && (
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        Custom override:
                      </span>
                      <input
                        type="text"
                        value={
                          typeof customFieldValues[key] === "object"
                            ? ""
                            : customFieldValues[key] ?? ""
                        }
                        onChange={(e) => handleCustomInputChange(key, e.target.value)}
                        placeholder={`Enter custom value for ${formatFieldName(key)}...`}
                        className="flex-1 px-2.5 py-1 text-xs rounded-md bg-background border border-input focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {resolveError && (
          <div className="px-5 py-2.5 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{resolveError}</span>
          </div>
        )}

        {successMessage && (
          <div className="px-5 py-2.5 bg-emerald-500/10 border-t border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="p-3.5 sm:p-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground">
            Active Strategy:{" "}
            <span className="font-semibold text-foreground">
              {selectedStrategy === "FIELD_MERGE"
                ? "Smart Auto-Merge"
                : selectedStrategy === "SERVER_WINS"
                ? "Server Wins"
                : selectedStrategy === "CLIENT_WINS"
                ? "Keep Local"
                : "Custom Field Picker"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isResolving}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResolve}
              disabled={isResolving}
              className="gap-2 bg-primary text-primary-foreground font-semibold shadow-sm"
            >
              {isResolving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Resolving Conflict...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve & Synchronize</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
