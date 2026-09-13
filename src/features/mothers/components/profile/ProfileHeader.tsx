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

export const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(({
  motherData,
  pregnancies,
  prenatalVisits,
  onEditClick,
  onLogVitalsClick,
  onAvatarClick,
}) => {
  const currentPregnancy = useMemo(() => pregnancies[0] || motherData?.pregnancies?.[0] || null, [pregnancies, motherData])

  const name = useMemo(() => {
    if (!motherData) return "Loading..."
    return (
      [
        motherData.user?.first_name || motherData.first_name,
        motherData.user?.middle_name || motherData.middle_name,
        motherData.user?.last_name || motherData.last_name,
      ].filter(Boolean).join(" ") || motherData.name || "Mother Profile"
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
  const calculatedGA = useMemo(() => (lmpRaw ? calculateGAWeeks(lmpRaw) : (currentPregnancy?.gestational_age_weeks || 0)), [lmpRaw, currentPregnancy])
  const progressPercent = Math.min(100, Math.max(0, Math.round((calculatedGA / 40) * 100)))

  const calculatedAge = useMemo(() => {
    if (motherData?.age) return motherData.age
    if (motherData?.birth_date) {
      return Math.floor((new Date().getTime() - new Date(motherData.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }
    return null
  }, [motherData])

  const risk = useMemo(() => extractRiskLevel(motherData, pregnancies, prenatalVisits), [motherData, pregnancies, prenatalVisits])

  const getRiskBadge = (riskStr?: string | null) => {
    if (!riskStr || riskStr === "N/A" || riskStr.trim() === "") {
      return (
        <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-muted text-muted-foreground">
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
      <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${bgClass}`}>
        <Activity className="h-3 w-3" />
        {displayText}
      </Badge>
    )
  }

  const avatarUrl = motherData?.user?.profile_url || motherData?.profile_url || motherData?.photo_url || motherData?.user?.photo_url || ""

  return (
    <div className="flex flex-col gap-6 p-5 rounded-xl border border-border bg-card text-card-foreground shadow-xs relative">
      {/* Top Tier: Identity & Action Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        {/* Left Side: Avatar & Name */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-14 w-14 border border-border shadow-xs">
              {avatarUrl && (
                <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={onAvatarClick}
              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs hover:scale-110 transition-transform cursor-pointer"
              title="Upload Profile Picture"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground leading-none">{name}</h2>
            {getRiskBadge(risk)}
          </div>
        </div>

        {/* Right Side: Global Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button onClick={onEditClick} variant="outline" size="sm" className="flex-1 md:flex-none h-9 px-4 text-xs font-medium border-border bg-card text-foreground hover:bg-muted">
            Edit Profile
          </Button>
          <Button size="sm" onClick={onLogVitalsClick} className="flex-1 md:flex-none h-9 px-4 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs">
            Log Vitals
          </Button>
        </div>
      </div>

      {/* Bottom Tier: The Data Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
        {/* Block A: Pregnancy Progress */}
        <div className="flex flex-col gap-4 p-5 rounded-xl bg-muted/40 border border-border">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Baby className="h-3.5 w-3.5" />
                Pregnancy Progress
              </span>
              <span className="text-xs font-medium text-foreground bg-card px-2 py-0.5 rounded-sm border border-border">
                {getTrimesterFromGA(calculatedGA)}
              </span>
            </div>
            <span className="text-2xl font-bold text-foreground mt-1">
              {calculatedGA > 0 ? `${calculatedGA} Weeks` : "N/A"}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="flex flex-col gap-1.5 mt-auto">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span>Week 0</span>
              <span>Week 40</span>
            </div>
          </div>
        </div>

        {/* Block B: Obstetric Baseline */}
        <div className="flex flex-col gap-4 p-5 rounded-xl bg-muted/40 border border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Activity className="h-3.5 w-3.5" />
            Obstetric Baseline
          </span>
          <div className="grid grid-cols-2 gap-y-4 gap-x-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Baby className="h-3 w-3 opacity-70" />
                Gravida / Parity
              </span>
              <span className="text-sm font-semibold text-foreground">
                G{currentPregnancy?.gravida ?? currentPregnancy?.gravidity ?? 0} P{currentPregnancy?.parity ?? 0}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Calendar className="h-3 w-3 opacity-70" />
                LMP
              </span>
              <span className="text-sm font-semibold text-foreground">
                {lmpRaw ? formatDate(lmpRaw) : "N/A"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Calendar className="h-3 w-3 opacity-70" />
                EDD
              </span>
              <span className="text-sm font-semibold text-foreground">
                {lmpRaw ? calculateEDD(lmpRaw) : (currentPregnancy?.edd ? formatDate(currentPregnancy.edd) : "N/A")}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Droplet className="h-3 w-3 opacity-70" />
                BMI / Blood Type
              </span>
              <span className="text-sm font-semibold text-foreground">
                {currentPregnancy?.bmi_category || "Normal"} | {motherData?.blood_type || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Block C: Demographics & Contact */}
        <div className="flex flex-col gap-4 p-5 rounded-xl bg-muted/40 border border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <User className="h-3.5 w-3.5" />
            Demographics & Contact
          </span>
          <div className="grid grid-cols-2 gap-y-4 gap-x-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Calendar className="h-3 w-3 opacity-70" />
                Age / DOB
              </span>
              <span className="text-sm font-semibold text-foreground">
                {calculatedAge && calculatedAge > 0 ? `${calculatedAge} yrs` : "N/A"}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({motherData?.birth_date ? formatDate(motherData.birth_date) : "N/A"})
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Phone className="h-3 w-3 opacity-70" />
                Phone
              </span>
              <span className="text-sm font-semibold text-foreground">
                {motherData?.user?.phone_number || motherData?.phone_number || "N/A"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Hash className="h-3 w-3 opacity-70" />
                Serial No.
              </span>
              <span className="text-sm font-mono font-medium text-foreground">
                {motherData?.family_serial_no || "N/A"}
              </span>
            </div>
            <div className="flex flex-col gap-1 col-span-2 mt-[-4px]">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <MapPin className="h-3 w-3 opacity-70" />
                Address
              </span>
              <span className="text-sm font-semibold text-foreground truncate">
                {motherData?.user?.address || motherData?.address || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

ProfileHeader.displayName = "ProfileHeader"
