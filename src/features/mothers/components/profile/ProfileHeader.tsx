import React, { useMemo } from "react"
import {
  Activity,
  Calendar,
  Droplet,
  Phone,
  MapPin,
  Hash,
  User,
  Baby,
  Pencil,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { extractRiskLevel } from "@/lib/riskUtils"

interface ProfileHeaderProps {
  motherData: any
  pregnancies: any[]
  prenatalVisits: any[]
  onEditClick: () => void
  onLogVitalsClick: () => void
  onAvatarClick: () => void
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(
  ({
    motherData,
    pregnancies,
    prenatalVisits,
    onEditClick,
    onLogVitalsClick,
    onAvatarClick,
  }) => {
    const currentPregnancy = useMemo(
      () => pregnancies[0] || motherData?.pregnancies?.[0] || null,
      [pregnancies, motherData]
    )

    const name = useMemo(() => {
      if (!motherData) return "Loading..."
      return (
        [
          motherData.user?.first_name || motherData.first_name,
          motherData.user?.middle_name || motherData.middle_name,
          motherData.user?.last_name || motherData.last_name,
        ]
          .filter(Boolean)
          .join(" ") ||
        motherData.name ||
        "Mother Profile"
      )
    }, [motherData])

    const calculateGAWeeks = (lmpDateStr?: string | Date) => {
      if (!lmpDateStr) return 0
      const lmp = new Date(lmpDateStr)
      if (isNaN(lmp.getTime())) return 0
      const diffTime = new Date().getTime() - lmp.getTime()
      const weeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000))
      return Math.max(0, weeks)
    }

    const calculateEDD = (lmpDateStr?: string | Date) => {
      if (!lmpDateStr) return "N/A"
      const lmp = new Date(lmpDateStr)
      if (isNaN(lmp.getTime())) return "N/A"
      const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000)
      return formatDate(edd)
    }

    const getTrimesterFromGA = (weeks: number) => {
      if (weeks === 0) return "N/A"
      if (weeks <= 12) return "1st Trimester"
      if (weeks <= 27) return "2nd Trimester"
      return "3rd Trimester"
    }

    const lmpRaw = currentPregnancy?.lmp_date || currentPregnancy?.lmp
    const calculatedGA = useMemo(
      () =>
        lmpRaw
          ? calculateGAWeeks(lmpRaw)
          : currentPregnancy?.gestational_age_weeks || 0,
      [lmpRaw, currentPregnancy]
    )
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((calculatedGA / 40) * 100))
    )

    const calculatedAge = useMemo(() => {
      if (motherData?.age) return motherData.age
      if (motherData?.birth_date) {
        return Math.floor(
          (new Date().getTime() - new Date(motherData.birth_date).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      }
      return null
    }, [motherData])

    const risk = useMemo(
      () => extractRiskLevel(motherData, pregnancies, prenatalVisits),
      [motherData, pregnancies, prenatalVisits]
    )

    const getRiskBadge = (riskStr?: string | null) => {
      if (!riskStr || riskStr === "N/A" || riskStr.trim() === "") {
        return (
          <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-none">
            <Activity className="h-3 w-3 opacity-60" />
            No Risk Assessed
          </Badge>
        )
      }

      const lower = riskStr.toLowerCase()
      let displayText = riskStr
      let bgClass = "bg-green-500/10 text-green-500"

      if (lower.includes("high")) {
        displayText = "High Risk"
        bgClass = "bg-red-500/10 text-red-500"
      } else if (lower.includes("mod")) {
        displayText = "Moderate Risk"
        bgClass = "bg-yellow-500/10 text-yellow-500"
      } else if (lower.includes("low")) {
        displayText = "Low Risk"
        bgClass = "bg-green-500/10 text-green-500"
      }

      return (
        <Badge
          className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${bgClass}`}
        >
          <Activity className="h-3 w-3" />
          {displayText}
        </Badge>
      )
    }

    const avatarUrl =
      motherData?.user?.profile_url ||
      motherData?.profile_url ||
      motherData?.photo_url ||
      motherData?.user?.photo_url ||
      ""

    const connectedFacilities = useMemo(() => {
      const list: Array<{ name: string; type?: string; isHome?: boolean }> = []
      const homeName =
        motherData?.user?.facility?.facility_name ||
        motherData?.facility?.facility_name
      if (homeName) {
        list.push({
          name: homeName,
          type:
            motherData?.user?.facility?.type ||
            motherData?.facility?.type ||
            "Home Facility",
          isHome: true,
        })
      }
      const enrollments = motherData?.facilityEnrollments || []
      for (const e of enrollments) {
        const fName = e.facility?.facility_name
        if (fName && !list.some((item) => item.name === fName)) {
          list.push({
            name: fName,
            type: e.facility?.type || "Enrolled",
            isHome: false,
          })
        }
      }
      return list
    }, [motherData])

    return (
      <div className="relative flex flex-col gap-6 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
        <div className="flex w-full flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="group relative">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 shadow-xs">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLElement).style.display = "none"
                      const fallback = e.currentTarget
                        .nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = "flex"
                    }}
                  />
                ) : null}
                <span
                  className={`text-base font-bold text-primary ${
                    avatarUrl ? "hidden" : "flex"
                  }`}
                >
                  {name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={onAvatarClick}
                className="absolute -right-1 -bottom-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs transition-transform hover:scale-110"
                title="Upload Profile Picture"
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl leading-none font-bold text-foreground">
                  {name}
                </h2>
                {getRiskBadge(risk)}
              </div>
              {connectedFacilities.length > 0 && (
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {connectedFacilities.map((fac, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        fac.isHome
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      <Building2 className="h-3 w-3 opacity-70" />
                      {fac.name}
                      {fac.isHome ? " (Home)" : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full items-center gap-2 md:w-auto">
            <Button
              onClick={onEditClick}
              variant="outline"
              size="sm"
              className="h-9 flex-1 border-border bg-card px-4 text-xs font-medium text-foreground hover:bg-muted md:flex-none"
            >
              Edit Profile
            </Button>
            <Button
              size="sm"
              onClick={onLogVitalsClick}
              className="h-9 flex-1 bg-primary px-4 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 md:flex-none"
            >
              Log Vitals
            </Button>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-5">
            <div className="flex flex-col gap-1">
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <Baby className="h-3.5 w-3.5" />
                  Pregnancy Progress
                </span>
                <span className="rounded-sm border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground">
                  {getTrimesterFromGA(calculatedGA)}
                </span>
              </div>
              <span className="mt-1 text-2xl font-bold text-foreground">
                {calculatedGA > 0 ? `${calculatedGA} Weeks` : "N/A"}
              </span>
            </div>

            <div className="mt-auto flex flex-col gap-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full border border-border/50 bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                <span>Week 0</span>
                <span>Week 40</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-5">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              <Activity className="h-3.5 w-3.5" />
              Obstetric Baseline
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Baby className="h-3 w-3 opacity-70" />
                  Gravida / Parity
                </span>
                <span className="text-sm font-semibold text-foreground">
                  G
                  {currentPregnancy?.gravida ??
                    currentPregnancy?.gravidity ??
                    0}{" "}
                  P{currentPregnancy?.parity ?? 0}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Calendar className="h-3 w-3 opacity-70" />
                  LMP
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {lmpRaw ? formatDate(lmpRaw) : "N/A"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Calendar className="h-3 w-3 opacity-70" />
                  EDD
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {lmpRaw
                    ? calculateEDD(lmpRaw)
                    : currentPregnancy?.edd
                      ? formatDate(currentPregnancy.edd)
                      : "N/A"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Droplet className="h-3 w-3 opacity-70" />
                  BMI / Blood Type
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {currentPregnancy?.bmi_category || "Normal"} |{" "}
                  {motherData?.blood_type || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-5">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              <User className="h-3.5 w-3.5" />
              Demographics & Contact
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Calendar className="h-3 w-3 opacity-70" />
                  Age / DOB
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {calculatedAge && calculatedAge > 0
                    ? `${calculatedAge} yrs`
                    : "N/A"}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (
                    {motherData?.birth_date
                      ? formatDate(motherData.birth_date)
                      : "N/A"}
                    )
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Phone className="h-3 w-3 opacity-70" />
                  Phone
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {motherData?.user?.phone_number ||
                    motherData?.phone_number ||
                    "N/A"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Hash className="h-3 w-3 opacity-70" />
                  Serial No.
                </span>
                <span className="font-mono text-sm font-medium text-foreground">
                  {motherData?.family_serial_no || "N/A"}
                </span>
              </div>
              <div className="col-span-2 mt-[-4px] flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <MapPin className="h-3 w-3 opacity-70" />
                  Address
                </span>
                <span className="truncate text-sm font-semibold text-foreground">
                  {motherData?.user?.address || motherData?.address || "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ProfileHeader.displayName = "ProfileHeader"
