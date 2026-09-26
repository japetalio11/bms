import {
  User,
  Droplet,
  Phone,
  MapPin,
  Calendar,
  Baby,
  Activity,
  Layers,
  Sparkles,
  Maximize2,
  AlertTriangle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { sanitizeMediaUrl } from "@/lib/utils"
import type { PublicReferralData, ParsedReferralDetails } from "./referralTypes"
import { calculateObstetricIndices, checkClinicalConsistency } from "./referralClinicalUtils"

interface MaternalSnapshotCardProps {
  patient?: PublicReferralData["patient"]
  obstetric?: PublicReferralData["obstetric_info"]
  parsed: ParsedReferralDetails
  onPhotoClick?: (photoUrl: string, name: string) => void
}

export function MaternalSnapshotCard({
  patient,
  obstetric,
  parsed,
  onPhotoClick,
}: MaternalSnapshotCardProps) {
  const lmpEffective = obstetric?.lmp_date || parsed.lmpParsed
  const obstetricMetrics = calculateObstetricIndices(
    lmpEffective,
    obstetric?.latest_vitals?.gestational_age_weeks || 0
  )

  const consistencyIssue = checkClinicalConsistency(
    "routine",
    parsed,
    obstetric,
    [],
    obstetricMetrics.gestationalWeeks,
    obstetric?.latest_vitals?.fundic_height
  )

  const gravida =
    obstetric?.gravida ??
    (parsed.gravidaParaParsed
      ? parseInt(parsed.gravidaParaParsed.match(/G(\d+)/i)?.[1] || "1", 10)
      : 1)
  const parity =
    obstetric?.parity ??
    (parsed.gravidaParaParsed
      ? parseInt(parsed.gravidaParaParsed.match(/P(\d+)/i)?.[1] || "0", 10)
      : 0)

  const age = patient?.age
  const isAdolescent = age !== undefined && age !== null && age > 0 && age < 18
  const isAMA = age !== undefined && age !== null && age >= 35

  const bloodType = patient?.blood_type || "On file"

  return (
    <Card className="border border-border/80 bg-card shadow-2xs">
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-center">
          
          <div className="space-y-3 lg:col-span-5 lg:border-r lg:border-border/70 lg:pr-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                Patient Identity
              </span>
              {patient?.family_serial_no && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  ID: {patient.family_serial_no}
                </span>
              )}
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="relative group shrink-0">
                <Avatar
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-border/80 shadow-xs cursor-pointer transition-transform hover:scale-105 overflow-hidden"
                  onClick={() => {
                    if (patient?.profile_url && onPhotoClick) {
                      onPhotoClick(patient.profile_url, patient?.name || "Patient")
                    }
                  }}
                  title={patient?.profile_url ? "Click to view full photo" : undefined}
                >
                  <AvatarImage
                    src={sanitizeMediaUrl(patient?.profile_url)}
                    alt={patient?.name}
                    className="object-cover rounded-2xl"
                  />
                  <AvatarFallback className="rounded-2xl bg-primary/10 text-base sm:text-xl font-black text-primary">
                    {patient?.name
                      ? patient.name
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "PT"}
                  </AvatarFallback>
                </Avatar>
                {patient?.profile_url && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onPhotoClick) {
                        onPhotoClick(patient.profile_url!, patient?.name || "Patient")
                      }
                    }}
                    className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs transition-transform hover:scale-110"
                    title="View Full Photo"
                  >
                    <Maximize2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                    {patient?.name || "Confidential Patient"}
                  </h2>

                  {isAdolescent && (
                    <Badge variant="outline" className="border-border/80 text-muted-foreground bg-transparent text-[10px] font-medium">
                      Adolescent ({age} yrs)
                    </Badge>
                  )}
                  {isAMA && (
                    <Badge variant="outline" className="border-border/80 text-muted-foreground bg-transparent text-[10px] font-medium">
                      AMA ({age} yrs)
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {age ? `${age} yrs old` : "Age N/A"} • {patient?.civil_status || "Civil Status N/A"}
                  </span>

                  <span className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                    <Droplet className="h-3 w-3 fill-current" />
                    Type: {bloodType}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  {patient?.phone && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <a href={`tel:${patient.phone}`} className="hover:underline font-semibold text-foreground">
                        {patient.phone}
                      </a>
                    </div>
                  )}
                  {patient?.address && (
                    <div className="flex items-center gap-1.5 truncate max-w-full">
                      <MapPin className="h-3.5 w-3.5 text-foreground shrink-0" />
                      <span className="truncate">{patient.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4 lg:col-span-7">
            
            <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 sm:p-3 space-y-0.5">
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Parity / Gravida
              </span>
              <p className="text-base sm:text-lg font-black text-foreground font-mono">
                G{gravida} P{parity}
              </p>
              <span className="text-[10px] text-muted-foreground block truncate">
                {parity === 0
                  ? "Nulliparous (1st)"
                  : parity >= 5
                    ? "Grand Multipara"
                    : `Multiparous (P${parity})`}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 sm:p-3 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Gestational Age
                </span>
                {consistencyIssue && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-400 border-b border-dashed border-amber-600/70 dark:border-amber-400/70 cursor-help"
                    title={consistencyIssue.message}
                  >
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                    Verify
                  </span>
                )}
              </div>
              <p className="text-base sm:text-lg font-black text-primary font-mono truncate">
                {obstetricMetrics.formattedAog}
              </p>
              <span className="text-[10px] text-muted-foreground block truncate">
                {obstetricMetrics.trimester}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 sm:p-3 space-y-0.5">
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Estimated EDD
              </span>
              <p className="text-xs sm:text-sm font-extrabold text-foreground truncate">
                {obstetricMetrics.eddFormatted}
              </p>
              <span className="text-[10px] text-muted-foreground block truncate font-mono">
                {obstetricMetrics.daysRemaining !== null
                  ? obstetricMetrics.daysRemaining >= 0
                    ? `${obstetricMetrics.daysRemaining}d to EDD`
                    : `${Math.abs(obstetricMetrics.daysRemaining)}d post-date`
                  : "Pending"}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 sm:p-3 space-y-0.5">
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                LMP Date
              </span>
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {lmpEffective
                  ? new Date(lmpEffective).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not Specified"}
              </p>
              <span className="text-[10px] text-muted-foreground block truncate">
                Status: {obstetric?.pregnancy_status || "Active Pregnancy"}
              </span>
            </div>

          </div>

        </div>
      </CardContent>
    </Card>
  )
}
