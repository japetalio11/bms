import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { 
  ChevronLeft, 
  MoreVertical, 
  PlusCircle, 
  Download, 
  RefreshCw, 
  Activity, 
  Calendar,
  Droplet,
  Phone,
  MapPin,
  Hash,
  User,
  Baby,
  Search,
  Pencil,
} from "lucide-react"
import { extractRiskLevel } from "@/lib/riskUtils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditMotherModal } from "./EditMotherModal"
import { LogVitalsModal } from "./LogVitalsModal"
import { RegisterPregnancyModal } from "./RegisterPregnancyModal"
import { RegisterAppointmentModal } from "./RegisterAppointmentModal"
import { RegisterLabModal } from "./RegisterLabModal"
import { RegisterSupplementModal } from "./RegisterSupplementModal"
import { DetailSideSheet } from "./DetailSideSheet"
import { formatDate } from "@/lib/utils"

import { UploadAvatarModal } from "./UploadAvatarModal"
import { mothersApi } from "../api"
import { db } from "@/lib/db/bmsDatabase"

export function MotherProfilePage({motherId} : {motherId?: string}) {
  const navigate = useNavigate()
  const { id } = useParams()
  const targetId = id || motherId

  const [activeTab, setActiveTab] = useState("pregnancy")
  const [motherData, setMotherData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [logVitalsModalOpen, setLogVitalsModalOpen] = useState(false)
  const [registerPregnancyModalOpen, setRegisterPregnancyModalOpen] = useState(false)
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [labModalOpen, setLabModalOpen] = useState(false)
  const [supplementModalOpen, setSupplementModalOpen] = useState(false)

  // Side sheet state
  const [sideSheetOpen, setSideSheetOpen] = useState(false)
  const [sideSheetType, setSideSheetType] = useState<"pregnancy" | "visitation" | "appointment" | "laboratory" | "prescription" | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const openSideSheet = (type: "pregnancy" | "visitation" | "appointment" | "laboratory" | "prescription", record: any) => {
    setSideSheetType(type)
    setSelectedRecord(record)
    setSideSheetOpen(true)
  }

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [pregnancy, setPregnancy] = useState<any>(null);
  const [visitation, setVisitation] = useState<any>(null);
  const [appointment, setAppointments] = useState<any>(null);
  const [labRecords, setLabRecords] = useState<any>(null);
  const [supplements, setSupplements] = useState<any>(null);

  const fetchAllData = async () => {
    if (!targetId) return
    setLoading(true)
    setIsLoading(true)
    setError(null)

    try {
      // 1. Fetch main Mother Profile
      let motherRes = await mothersApi.getMotherProfile(targetId)
      if (!motherRes) {
        try {
          motherRes = (await db.mothers.get(targetId)) || null
          if (!motherRes) {
            const allMothers = await db.mothers.toArray()
            motherRes = allMothers.find((m) => m.id === targetId || m._id === targetId || m.mother_id === targetId || m.user_id === targetId) || null
          }
        } catch {
          // Ignore Dexie read error fallback
        }
      }
      if (motherRes) {
        setMotherData(motherRes)
      }

      // 2. Fetch sub-records in parallel using Promise.allSettled
      const uId = motherRes?.user_id || motherRes?.user?.user_id || motherRes?._id || motherRes?.id || targetId

      await Promise.allSettled([
        mothersApi.getPregnancies(targetId).then((r) => setPregnancy(r)).catch(() => {}),
        mothersApi.getPrenatalVisits(targetId).then((r) => setVisitation(r)).catch(() => {}),
        mothersApi.getAppointmentsByUser(uId).then((r) => setAppointments(r)).catch(() => {}),
        mothersApi.getLabRecords(targetId).then((r) => setLabRecords(r)).catch(() => {}),
        mothersApi.getSupplements(targetId).then((r) => setSupplements(r)).catch(() => {}),
      ])
    } catch (err: any) {
      console.warn("[MotherProfilePage] Load error:", err)
      setError(err?.message || "Failed to load profile details")
    } finally {
      setLoading(false)
      setIsLoading(false)
    }
  }

  const fetchMotherProfile = fetchAllData
  const fetchPregnancy = fetchAllData
  const fetchVisit = fetchAllData
  const fetchAppointments = fetchAllData
  const fetchLabRecord = fetchAllData
  const fetchSupplementRecord = fetchAllData

  useEffect(() => {
    fetchAllData()
  }, [id, motherId])

  const calculateEDD = (lmpDateStr?: string | Date) => {
    if (!lmpDateStr) return "N/A"
    const lmp = new Date(lmpDateStr)
    if (isNaN(lmp.getTime())) return "N/A"
    const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000)
    return formatDate(edd)
  }

  const calculateGAWeeks = (lmpDateStr?: string | Date) => {
    if (!lmpDateStr) return 0
    const lmp = new Date(lmpDateStr)
    if (isNaN(lmp.getTime())) return 0
    const diffTime = new Date().getTime() - lmp.getTime()
    const weeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000))
    return Math.max(0, weeks)
  }

  const getTrimesterFromGA = (weeks: number) => {
    if (weeks === 0) return "N/A"
    if (weeks <= 12) return "1st Trimester"
    if (weeks <= 27) return "2nd Trimester"
    return "3rd Trimester"
  }

  const name = motherData
    ? ([motherData.user?.first_name || motherData.first_name, motherData.user?.middle_name || motherData.middle_name, motherData.user?.last_name || motherData.last_name].filter(Boolean).join(" ") || motherData.name || "Mother Profile")
    : "Loading..."
  
  const pregnancyList = (Array.isArray(pregnancy) ? pregnancy : pregnancy?.data || pregnancy?.result) || motherData?.pregnancies || [];
  const currentPregnancy = pregnancyList[0] || motherData?.pregnancies?.[0]

  const calculatedAge = motherData?.age || (motherData?.birth_date ? Math.floor((new Date().getTime() - new Date(motherData.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null)
  const ageDisplay = calculatedAge && calculatedAge > 0 ? `${calculatedAge} yrs` : "N/A"

  const lmpRaw = currentPregnancy?.lmp_date || currentPregnancy?.lmp
  const calculatedGA = lmpRaw ? calculateGAWeeks(lmpRaw) : (currentPregnancy?.gestational_age_weeks || 0)
  const gestationalWeeks = calculatedGA
  const progressPercent = Math.min(100, Math.max(0, Math.round((gestationalWeeks / 40) * 100)))

  const visitationList = (Array.isArray(visitation) ? visitation : visitation?.data || visitation?.result || motherData?.prenatalVisits || []);
  const appointmentList = (Array.isArray(appointment) ? appointment : appointment?.data || appointment?.result || motherData?.appointments || []);
  const labRecordList = (Array.isArray(labRecords) ? labRecords : labRecords?.data || labRecords?.result || motherData?.labRecords || []);
  const supplementList = (Array.isArray(supplements) ? supplements : supplements?.data || supplements?.result || motherData?.supplementationRecords || []);

  const fullMotherData = {
    ...motherData,
    mother_id: motherData?.mother_id || motherData?.user_id || motherData?._id || motherData?.id || targetId,
    _id: motherData?.mother_id || motherData?.user_id || motherData?._id || motherData?.id || targetId,
    id: motherData?.mother_id || motherData?.user_id || motherData?._id || motherData?.id || targetId,
    pregnancies: pregnancyList,
    prenatalVisits: visitationList,
    appointments: appointmentList,
    labRecords: labRecordList,
    supplementationRecords: supplementList,
  }

  const mother = {
    id: motherData?.mother_id || motherData?.user_id || motherData?._id || motherData?.id || targetId,
    name,
    ageDisplay,
    dob: motherData?.birth_date ? formatDate(motherData.birth_date) : "N/A",
    gestationalAge: calculatedGA > 0 ? `${calculatedGA} Weeks` : "N/A",
    trimester: getTrimesterFromGA(calculatedGA),
    risk: extractRiskLevel(motherData, pregnancyList, visitationList),
    gravida: currentPregnancy?.gravida ?? currentPregnancy?.gravidity ?? 0,
    parity: currentPregnancy?.parity ?? 0,
    lmp: lmpRaw ? formatDate(lmpRaw) : "N/A",
    edd: lmpRaw ? calculateEDD(lmpRaw) : (currentPregnancy?.edd ? formatDate(currentPregnancy.edd) : "N/A"),
    bmi: currentPregnancy?.bmi_category || "Normal",
    bloodType: motherData?.blood_type || "N/A",
    phone: motherData?.user?.phone_number || motherData?.phone_number || "N/A",
    address: motherData?.user?.address || motherData?.address || "N/A",
    fsn: motherData?.family_serial_no || "N/A"
  }

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

  const tabTriggerClass = "text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1 h-full transition-all"

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full p-8 text-xs text-muted-foreground bg-background">
        Loading mother profile...
      </div>
    )
  }

  return (
    <div className="relative flex items-start w-full h-full overflow-hidden bg-background">
      {/* Main Content Area */}
      <div className="flex flex-col w-full h-full text-foreground min-w-0 overflow-y-auto relative">
        
        {/* Scrollable Content */}
        <div className="flex flex-col gap-4 p-4 pl-3 pr-4 pb-24 md:pb-4">
          
          {/* Back button */}
          <div className="flex items-center -mb-2">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 -ml-2" onClick={() => navigate('/dashboard/mothers')}>
              <ChevronLeft className="h-4 w-4" />
              Back to Masterlist
            </Button>
          </div>

          {/* Section A: Profile Header */}
          <div className="flex flex-col gap-6 p-5 rounded-xl border border-border bg-card text-card-foreground shadow-xs relative">
            
            {/* Top Tier: Identity & Action Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
              {/* Left Side: Avatar & Name */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-14 w-14 border border-border shadow-xs">
                    {(motherData?.user?.profile_url || motherData?.profile_url || motherData?.photo_url || motherData?.user?.photo_url) && (
                      <AvatarImage src={motherData?.user?.profile_url || motherData?.profile_url || motherData?.photo_url || motherData?.user?.photo_url} alt={mother.name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {mother.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => setAvatarModalOpen(true)}
                    className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs hover:scale-110 transition-transform"
                    title="Upload Profile Picture"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground leading-none">{mother.name}</h2>
                  {getRiskBadge(mother.risk)}
                </div>
              </div>

              {/* Right Side: Global Actions */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button onClick={() => setEditModalOpen(true)} variant="outline" size="sm" className="flex-1 md:flex-none h-9 px-4 text-xs font-medium border-border bg-card text-foreground hover:bg-muted">
                  Edit Profile
                </Button>
                <Button size="sm" onClick={() => setLogVitalsModalOpen(true)} className="flex-1 md:flex-none h-9 px-4 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs">
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
                      {mother.trimester}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-foreground mt-1">{mother.gestationalAge}</span>
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
                    <span className="text-sm font-semibold text-foreground">G{mother.gravida} P{mother.parity}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 opacity-70" />
                      LMP
                    </span>
                    <span className="text-sm font-semibold text-foreground">{mother.lmp}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 opacity-70" />
                      EDD
                    </span>
                    <span className="text-sm font-semibold text-foreground">{mother.edd}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Droplet className="h-3 w-3 opacity-70" />
                      BMI / Blood Type
                    </span>
                    <span className="text-sm font-semibold text-foreground">{mother.bmi} | {mother.bloodType}</span>
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
                    <span className="text-sm font-semibold text-foreground">{mother.ageDisplay} <span className="text-xs font-normal text-muted-foreground ml-1">({mother.dob})</span></span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Phone className="h-3 w-3 opacity-70" />
                      Phone
                    </span>
                    <span className="text-sm font-semibold text-foreground">{mother.phone}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Hash className="h-3 w-3 opacity-70" />
                      Serial No.
                    </span>
                    <span className="text-sm font-mono font-medium text-foreground">{mother.fsn}</span>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2 mt-[-4px]">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 opacity-70" />
                      Address
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate">{mother.address}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Tabs Container */}
          <div className="sticky top-0 z-10 w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-background pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-max">
              <TabsList className="bg-muted border border-border h-9 w-full md:w-max justify-start rounded-lg p-1 gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="pregnancy" className={tabTriggerClass}>Pregnancy</TabsTrigger>
                <TabsTrigger value="encounters" className={tabTriggerClass}>Visitation</TabsTrigger>
                <TabsTrigger value="appointments" className={tabTriggerClass}>Appointments</TabsTrigger>
                <TabsTrigger value="laboratory" className={tabTriggerClass}>Laboratory Records</TabsTrigger>
                <TabsTrigger value="prescriptions" className={tabTriggerClass}>Prescriptions & Supplements</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Section B: Tabbed Content Areas */}
          <div className="w-full">

            {activeTab === "pregnancy" && (
              <div className="flex flex-col gap-4 mt-2">
                {/* Control Bar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <div className="relative w-[200px]">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search pregnancy..." className="h-8 pl-8 text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="outline" onClick={fetchPregnancy} className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button onClick={() => setRegisterPregnancyModalOpen(true)} className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
                      <PlusCircle className="h-3.5 w-3.5" />
                      New Pregnancy
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="bg-card dark:bg-[#111]">
                        <TableRow className="border-sidebar-border hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4 py-2 h-9">Gravida / Parity</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">LMP</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Estimated Due Date</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Gestational Age</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Status</TableHead>
                          <TableHead className="w-12 py-2 h-9"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pregnancyList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                              No pregnancy history found
                            </TableCell>
                          </TableRow>
                        ) : (
                          pregnancyList.map((p: any, i: number) => {
                            const lmpVal = p.lmp_date || p.lmp
                            const gaWeeks = lmpVal ? calculateGAWeeks(lmpVal) : (p.gestational_age_weeks || 0)
                            const eddVal = lmpVal ? calculateEDD(lmpVal) : (p.edd ? formatDate(p.edd) : "N/A")

                            return (
                              <TableRow key={p.pregnancy_id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openSideSheet("pregnancy", p)}>
                                <TableCell className="pl-4 text-xs font-medium text-foreground dark:text-white py-2">
                                  G{p.gravida ?? "0"} P{p.parity ?? "0"}
                                </TableCell>
                                <TableCell className="text-xs text-foreground dark:text-white py-2">{lmpVal ? formatDate(lmpVal) : "N/A"}</TableCell>
                                <TableCell className="text-xs text-foreground dark:text-white py-2 font-medium">{eddVal}</TableCell>
                                <TableCell className="text-xs text-foreground dark:text-white py-2">{gaWeeks > 0 ? `${gaWeeks} Weeks` : "N/A"}</TableCell>
                                <TableCell className="py-2">
                                  <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-[#24a1de]/10 text-[#24a1de] capitalize">
                                    {p.pregnancy_status || "Active"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground dark:text-white hover:text-foreground">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                                      <DropdownMenuItem onClick={() => openSideSheet("pregnancy", p)} className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openSideSheet("pregnancy", p)} className="text-xs cursor-pointer rounded-md">Edit Record</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openSideSheet("pregnancy", p)} className="text-xs cursor-pointer rounded-md text-red-500 focus:text-red-500">Delete Record</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "encounters" && (
              <div className="flex flex-col gap-4 mt-2">
                {/* Control Bar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <div className="relative w-[200px]">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search visitations..." className="h-8 pl-8 text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="outline" onClick={fetchVisit} className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button onClick={() => setLogVitalsModalOpen(true)} className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
                      <PlusCircle className="h-3.5 w-3.5" />
                      New Visitation
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-[#0a0a0a]">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="bg-card dark:bg-[#111]">
                        <TableRow className="border-sidebar-border hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4 py-2 h-9 w-[15%]">Visit Date</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9 w-[10%]">Trimester</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9 w-[15%]">Blood Pressure</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9 w-[15%]">Fetal Heart Tone</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9 w-[15%]">Fundic Height</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9 w-[10%]">Weight</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9 w-[15%]">Risk Level</TableHead>
                          <TableHead className="w-12 py-2 h-9"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visitationList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                              No encounters recorded
                            </TableCell>
                          </TableRow>
                        ) : (
                          visitationList.map((visit: any, i: number) => {
                            const bpDisplay = (visit.bp_systolic && visit.bp_diastolic)
                              ? `${visit.bp_systolic}/${visit.bp_diastolic} mmHg`
                              : (visit.blood_pressure || "N/A")

                            const fetalHeart = (visit.fetal_heart_tone_bpm ?? visit.fetal_heart_rate)
                              ? `${visit.fetal_heart_tone_bpm ?? visit.fetal_heart_rate} bpm`
                              : "N/A"

                            const fundicHeight = (visit.fundic_height_cm ?? visit.fundal_height)
                              ? `${visit.fundic_height_cm ?? visit.fundal_height} cm`
                              : "N/A"

                            const weightDisplay = (visit.weight_kg ?? visit.weight)
                              ? `${visit.weight_kg ?? visit.weight} kg`
                              : "N/A"

                            const trimesterDisplay = visit.trimester ? `${visit.trimester}${visit.trimester === 1 ? 'st' : visit.trimester === 2 ? 'nd' : 'rd'} Trimester` : "N/A"

                            return (
                              <TableRow key={visit.visit_id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openSideSheet("visitation", visit)}>
                                <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4 py-2">
                                  {formatDate(visit.visit_date)}
                                </TableCell>
                                <TableCell className="text-xs text-foreground dark:text-white py-2">{trimesterDisplay}</TableCell>
                                <TableCell className="text-xs text-foreground dark:text-white py-2 font-medium">{bpDisplay}</TableCell>
                                <TableCell className="text-xs text-foreground dark:text-white py-2">{fetalHeart}</TableCell>
                                <TableCell className="text-xs text-foreground dark:text-white py-2">{fundicHeight}</TableCell>
                                <TableCell className="text-xs text-foreground dark:text-white py-2">{weightDisplay}</TableCell>
                                <TableCell className="py-2">
                                  {getRiskBadge(visit.risk_level_assessed || visit.risk_level || mother.risk)}
                                </TableCell>
                                <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground dark:text-white hover:text-foreground">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                                      <DropdownMenuItem onClick={() => openSideSheet("visitation", visit)} className="text-xs cursor-pointer rounded-md">View Consultation</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openSideSheet("visitation", visit)} className="text-xs cursor-pointer rounded-md">Edit Record</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openSideSheet("visitation", visit)} className="text-xs cursor-pointer rounded-md text-red-500 focus:text-red-500">Delete Record</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appointments" && (
              <div className="flex flex-col gap-4 mt-2">
                {/* Control Bar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <div className="relative w-[200px]">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search appointments..." className="h-8 pl-8 text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="outline" onClick={fetchAppointments} className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button onClick={() => setAppointmentModalOpen(true)} className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
                      <PlusCircle className="h-3.5 w-3.5" />
                      New Appointment
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="bg-card dark:bg-[#111]">
                        <TableRow className="border-sidebar-border hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4 py-2 h-9">Date & Time</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Type</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Reason</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Status</TableHead>
                          <TableHead className="w-12 py-2 h-9"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointmentList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                              No appointments recorded
                            </TableCell>
                          </TableRow>
                        ) : (
                          appointmentList.map((p : any, i : number) => (
                            <TableRow key={p.appointment_id || p._id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openSideSheet("appointment", p)}>
                              <TableCell className="pl-4 text-xs font-medium text-foreground dark:text-white py-2">
                                {p.appointment_date ? `${formatDate(p.appointment_date)} ${p.appointment_time || ""}` : (p.appointmentDateTime ? formatDate(p.appointmentDateTime) : "N/A")}
                              </TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{p.appointment_type || p.type || "Prenatal Visit"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2">{p.reason || "N/A"}</TableCell>
                              <TableCell className="text-xs py-2">
                                <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-blue-500/10 text-blue-500 capitalize">
                                  {p.status || p.appointmentStatus || "Scheduled"}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground dark:text-white hover:text-foreground">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                                    <DropdownMenuItem onClick={() => openSideSheet("appointment", p)} className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openSideSheet("appointment", p)} className="text-xs cursor-pointer rounded-md">Edit Record</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openSideSheet("appointment", p)} className="text-xs cursor-pointer rounded-md text-red-500 focus:text-red-500">Delete Record</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "laboratory" && (
              <div className="flex flex-col gap-4 mt-2">
                {/* Control Bar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <div className="relative w-[200px]">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search lab records..." className="h-8 pl-8 text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="outline" onClick={fetchLabRecord} className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button onClick={() => setLabModalOpen(true)} className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
                      <PlusCircle className="h-3.5 w-3.5" />
                      New Laboratory Record
                    </Button>
                  </div>
                </div>

              {labRecordList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-sidebar-border rounded-xl bg-card dark:bg-[#111]">
                    <p className="text-xs text-muted-foreground">No laboratory records found</p>
                  </div>
              ) : (
                  <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-[#0a0a0a]">
                    <Table>
                      <TableHeader className="bg-card dark:bg-[#111]">
                        <TableRow className="border-sidebar-border hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4 py-2 h-9">Date of Screening</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Screening Type</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Result</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Remarks</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Sync Status</TableHead>
                          <TableHead className="w-12 py-2 h-9"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {labRecordList.map((lab: any, i: number) => (
                          <TableRow key={lab.screening_id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openSideSheet("laboratory", lab)}>
                            <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4 py-2">
                              {formatDate(lab.date_of_screening)}
                            </TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white py-2 font-semibold">{lab.screening_type || "N/A"}</TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white py-2">{lab.result || "N/A"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground py-2">{lab.remarks || "None"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground py-2 capitalize">{lab.sync_status || "synced"}</TableCell>
                            <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground dark:text-white hover:text-foreground">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                                  <DropdownMenuItem onClick={() => openSideSheet("laboratory", lab)} className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openSideSheet("laboratory", lab)} className="text-xs cursor-pointer rounded-md">Edit Record</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openSideSheet("laboratory", lab)} className="text-xs cursor-pointer rounded-md text-red-500 focus:text-red-500">Delete Record</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
              )}
              </div>
            )}

            {activeTab === "prescriptions" && (
              <div className="flex flex-col gap-4 mt-2">
                {/* Control Bar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <div className="relative w-[200px]">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search prescriptions..." className="h-8 pl-8 text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="outline" onClick={fetchSupplementRecord} className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button onClick={() => setSupplementModalOpen(true)} className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
                      <PlusCircle className="h-3.5 w-3.5" />
                      New Prescription
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="bg-card dark:bg-[#111]">
                        <TableRow className="border-sidebar-border hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4 py-2 h-9">Date Given</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Supplement Type</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Tablets Given</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Status</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Sync Status</TableHead>
                          <TableHead className="w-12 py-2 h-9"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplementList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                              No supplementation / medication records found
                            </TableCell>
                          </TableRow>
                        ) : (
                          supplementList.map((sup: any, i: number) => (
                            <TableRow key={sup.supplement_id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openSideSheet("prescription", sup)}>
                              <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4 py-2">
                                {formatDate(sup.date_given)}
                              </TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2 font-semibold">{sup.supplement_type || "N/A"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{sup.tablets_given_count ?? "N/A"} tabs</TableCell>
                              <TableCell className="py-2">
                                <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${sup.is_completed ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                                  {sup.is_completed ? "Completed" : "In Progress"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2 capitalize">{sup.sync_status || "synced"}</TableCell>
                              <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground dark:text-white hover:text-foreground">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                                    <DropdownMenuItem onClick={() => openSideSheet("prescription", sup)} className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openSideSheet("prescription", sup)} className="text-xs cursor-pointer rounded-md">Edit Record</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openSideSheet("prescription", sup)} className="text-xs cursor-pointer rounded-md text-red-500 focus:text-red-500">Delete Record</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <EditMotherModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        motherData={motherData}
        onSuccess={fetchMotherProfile}
      />
      <UploadAvatarModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        motherData={fullMotherData}
        onSuccess={fetchMotherProfile}
      />
      <LogVitalsModal
        open={logVitalsModalOpen}
        onOpenChange={setLogVitalsModalOpen}
        motherData={fullMotherData}
        onSuccess={() => {
          fetchMotherProfile()
          fetchVisit()
        }}
      />
      <RegisterPregnancyModal
        open={registerPregnancyModalOpen}
        onOpenChange={setRegisterPregnancyModalOpen}
        motherData={fullMotherData}
        onSuccess={() => {
          fetchMotherProfile()
          fetchPregnancy()
        }}
      />
      <RegisterAppointmentModal
        open={appointmentModalOpen}
        onOpenChange={setAppointmentModalOpen}
        motherData={fullMotherData}
        onSuccess={fetchAppointments}
      />
      <RegisterLabModal
        open={labModalOpen}
        onOpenChange={setLabModalOpen}
        motherData={fullMotherData}
        visitationList={visitationList}
        onSuccess={fetchLabRecord}
      />
      <RegisterSupplementModal
        open={supplementModalOpen}
        onOpenChange={setSupplementModalOpen}
        motherData={fullMotherData}
        visitationList={visitationList}
        onSuccess={fetchSupplementRecord}
      />
      <DetailSideSheet
        open={sideSheetOpen}
        onOpenChange={setSideSheetOpen}
        type={sideSheetType}
        data={selectedRecord}
        motherName={mother.name}
        onSuccess={() => {
          fetchMotherProfile()
          fetchPregnancy()
          fetchVisit()
          fetchAppointments()
          fetchLabRecord()
          fetchSupplementRecord()
        }}
      />
    </div>
  )
}
