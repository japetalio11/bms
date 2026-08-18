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
  Baby
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

import axios from "axios";

export function MotherProfilePage({motherId} : {motherId?: string}) {
  const navigate = useNavigate()
  const { id } = useParams()
  const targetId = id || motherId
  const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

  const [activeTab, setActiveTab] = useState("pregnancy")
  const [motherData, setMotherData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [pregnancy, setPregnancy] = useState<any>(null);
  const [visitation, setVisitation] = useState<any>(null);
  const [appointment, setAppointments] = useState<any>(null);
  const [labRecords, setLabRecords] = useState<any>(null);
  const [supplements, setSupplements] = useState<any>(null);

  const fetchMotherProfile = async () => {
    if (!targetId) return
    setLoading(true)
    const token = localStorage.getItem("token")
    
    try {
      const res = await fetch(`${baseUrl}/api/v1/mother/search/${targetId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (res.ok && data.result) {
        setMotherData(data.result)
      }
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }

  const fetchPregnancy = async () => {
    if (!targetId) return
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token")
      const response = await axios.get(`${baseUrl}/api/v1/pregnancy/mother/${targetId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      setPregnancy(response.data);
      
    } catch (err : any) {
      setError(err.message || "Failed to load pregnancy")
    } finally {
      setIsLoading(false);
    }
  }

  const fetchVisit = async () => {

    try {
      setLoading(true);

      const token = localStorage.getItem("token")
      const response = await axios.get(`${baseUrl}/api/v1/prenatal-visit/mother/${targetId}`, {
        headers : {
          Authorization : `Bearer ${token}`
        }
      })

      setVisitation(response.data)

    } catch (err : any) {
      setError(err.message || "Failed to load Visitation")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAppointments = async () => {

    try {
      setIsLoading(true);

      const token = localStorage.getItem("token")
      const response = await axios.get(`${baseUrl}/api/v1/appointment/get/user/${targetId}`, {
        headers : {
          Authorization : `Bearer ${token}`
        }
      })

      setAppointments(response.data)

    } catch (err : any) {
      setError(err.message || "Failed to load Appointments")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLabRecord = async () => {

    try {

      setIsLoading(true)
      const token = localStorage.getItem("token")

      const response = await axios.get(`${baseUrl}/api/v1/lab-screening/get/mother/${targetId}`, {
        headers : {
          Authorization : `Bearer ${token}`
        }
      })

      setLabRecords(response.data)

    } catch (err :any) {
      setError(err.message || "Failed to load Laboratory Records")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSupplementRecord = async () => {
    if (!targetId) return
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")

      const response = await axios.get(`${baseUrl}/api/v1/supplement/get/mother/${targetId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      setSupplements(response.data)
    } catch (err: any) {
      setError(err.message || "Failed to load Supplementation Records")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMotherProfile()
    fetchPregnancy()
    fetchVisit()
    fetchAppointments()
    fetchLabRecord()
    fetchSupplementRecord()
  }, [id, motherId])

  const name = motherData ? [motherData.user?.first_name, motherData.user?.middle_name, motherData.user?.last_name].filter(Boolean).join(" ") : "Loading..."
  const currentPregnancy = motherData?.pregnancies?.[0]

  const calculatedAge = motherData?.age || (motherData?.birth_date ? Math.floor((new Date().getTime() - new Date(motherData.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null)
  const ageDisplay = calculatedAge && calculatedAge > 0 ? `${calculatedAge} yrs` : "N/A"

  const gestationalWeeks = currentPregnancy?.gestational_age_weeks || 0
  const progressPercent = Math.min(100, Math.max(0, Math.round((gestationalWeeks / 40) * 100)))

  const mother = {
    id: motherData?.mother_id || id,
    name,
    ageDisplay,
    dob: motherData?.birth_date ? new Date(motherData.birth_date).toLocaleDateString() : "N/A",
    gestationalAge: currentPregnancy?.gestational_age_weeks ? `${currentPregnancy.gestational_age_weeks} Weeks` : "N/A",
    trimester: currentPregnancy?.trimester ? `${currentPregnancy.trimester} Trimester` : "N/A",
    risk: currentPregnancy?.risk_flag || "Low Risk",
    gravida: currentPregnancy?.gravidity ?? 0,
    parity: currentPregnancy?.parity ?? 0,
    lmp: currentPregnancy?.lmp ? new Date(currentPregnancy.lmp).toLocaleDateString() : "N/A",
    edd: currentPregnancy?.edd ? new Date(currentPregnancy.edd).toLocaleDateString() : "N/A",
    bmi: "Normal",
    bloodType: motherData?.blood_type || "N/A",
    phone: motherData?.user?.phone_number || "N/A",
    address: motherData?.user?.address || "N/A",
    fsn: motherData?.family_serial_no || "N/A"
  }

  const pregnancyList = (Array.isArray(pregnancy) ? pregnancy : pregnancy?.data || pregnancy?.result) || motherData?.pregnancies || [];

  const visitationList = (Array.isArray(visitation) ? visitation : visitation?.data || visitation?.result || motherData?.prenatalVisits || []);

  const appointmentList = (Array.isArray(appointment) ? appointment : appointment?.data || appointment?.result || motherData?.appointments || []);

  const labRecordList = (Array.isArray(labRecords) ? labRecords : labRecords?.data || labRecords?.result || motherData?.labRecords || []);

  const supplementList = (Array.isArray(supplements) ? supplements : supplements?.data || supplements?.result || motherData?.supplementationRecords || []);

  const getRiskBadge = (riskStr: string) => {
    const isHigh = riskStr?.toLowerCase().includes("high")
    const isMod = riskStr?.toLowerCase().includes("mod")
    const bgClass = isHigh
      ? "bg-red-500/10 text-red-500"
      : isMod
      ? "bg-yellow-500/10 text-yellow-500"
      : "bg-green-500/10 text-green-500"

    return (
      <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${bgClass}`}>
        <Activity className="h-3 w-3" />
        {riskStr || "Low Risk"}
      </Badge>
    )
  }

  const tabTriggerClass = "text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all"

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full p-8 text-xs text-muted-foreground bg-background dark:bg-black">
        Loading mother profile...
      </div>
    )
  }

  return (
    <div className="relative flex items-start w-full h-full overflow-hidden bg-background dark:bg-black">
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
          <div className="flex flex-col gap-6 p-5 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] shadow-sm relative">
            
            {/* Top Tier: Identity & Action Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
              {/* Left Side: Avatar & Name */}
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-sidebar-border shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {mother.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground dark:text-white leading-none">{mother.name}</h2>
                  {getRiskBadge(mother.risk)}
                </div>
              </div>

              {/* Right Side: Global Actions */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button onClick={() => setEditModalOpen(true)} variant="outline" size="sm" className="flex-1 md:flex-none h-9 px-4 text-xs font-medium border-sidebar-border bg-transparent hover:bg-muted dark:hover:bg-[#1a1a1a]">
                  Edit Profile
                </Button>
                <Button size="sm" className="flex-1 md:flex-none h-9 px-4 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-none">
                  Log Vitals
                </Button>
              </div>
            </div>

            {/* Bottom Tier: The Data Blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
              
              {/* Block A: Pregnancy Progress */}
              <div className="flex flex-col gap-4 p-5 rounded-lg bg-muted/50 dark:bg-[#1a1a1a]/50 border border-transparent dark:border-sidebar-border/30">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Baby className="h-3.5 w-3.5" />
                      Pregnancy Progress
                    </span>
                    <span className="text-xs font-medium text-foreground dark:text-white bg-background dark:bg-black px-2 py-0.5 rounded-sm border border-sidebar-border/50">
                      {mother.trimester}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-foreground dark:text-white mt-1">{mother.gestationalAge}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="flex flex-col gap-1.5 mt-auto">
                  <div className="h-1.5 w-full bg-sidebar-border dark:bg-[#333] rounded-full overflow-hidden">
                    <div className="h-full bg-primary dark:bg-white rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                    <span>Week 0</span>
                    <span>Week 40</span>
                  </div>
                </div>
              </div>

              {/* Block B: Obstetric Baseline */}
              <div className="flex flex-col gap-4 p-5 rounded-lg bg-muted/50 dark:bg-[#1a1a1a]/50 border border-transparent dark:border-sidebar-border/30">
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
                    <span className="text-sm font-semibold text-foreground dark:text-white">G{mother.gravida} P{mother.parity}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 opacity-70" />
                      LMP
                    </span>
                    <span className="text-sm font-semibold text-foreground dark:text-white">{mother.lmp}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 opacity-70" />
                      EDD
                    </span>
                    <span className="text-sm font-semibold text-foreground dark:text-white">{mother.edd}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Droplet className="h-3 w-3 opacity-70" />
                      BMI / Blood Type
                    </span>
                    <span className="text-sm font-semibold text-foreground dark:text-white">{mother.bmi} | {mother.bloodType}</span>
                  </div>
                </div>
              </div>

              {/* Block C: Demographics & Contact */}
              <div className="flex flex-col gap-4 p-5 rounded-lg bg-muted/50 dark:bg-[#1a1a1a]/50 border border-transparent dark:border-sidebar-border/30">
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
                    <span className="text-sm font-semibold text-foreground dark:text-white">{mother.ageDisplay} <span className="text-xs font-normal text-muted-foreground ml-1">({mother.dob})</span></span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Phone className="h-3 w-3 opacity-70" />
                      Phone
                    </span>
                    <span className="text-sm font-semibold text-foreground dark:text-white">{mother.phone}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Hash className="h-3 w-3 opacity-70" />
                      Serial No.
                    </span>
                    <span className="text-sm font-mono font-medium text-foreground dark:text-white">{mother.fsn}</span>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2 mt-[-4px]">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 opacity-70" />
                      Address
                    </span>
                    <span className="text-sm font-semibold text-foreground dark:text-white truncate">{mother.address}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Tabs Container */}
          <div className="sticky top-0 z-10 w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-background dark:bg-black pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-max">
              <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="pregnancy" className={tabTriggerClass}>Pregnancy</TabsTrigger>
                <TabsTrigger value="encounters" className={tabTriggerClass}>Encounter History</TabsTrigger>
                <TabsTrigger value="appointments" className={tabTriggerClass}>Appointments</TabsTrigger>
                <TabsTrigger value="laboratory" className={tabTriggerClass}>Laboratory Records</TabsTrigger>
                <TabsTrigger value="prescriptions" className={tabTriggerClass}>Prescriptions & Supplements</TabsTrigger>
                <TabsTrigger value="allergies" className={tabTriggerClass}>Allergies</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Section B: Tabbed Content Areas */}
          <div className="w-full">

            {activeTab === "pregnancy" && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-[#0a0a0a]">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="bg-card dark:bg-[#111]">
                        <TableRow className="border-sidebar-border hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4 py-2 h-9">Reg. Date</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">LMP</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">EDD</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Gestational Age</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Gravida/Parity</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Co-morbidities</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Deworming</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Status</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Risk Flag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pregnancyList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
                              No pregnancy records found
                            </TableCell>
                          </TableRow>
                        ) : (
                          pregnancyList.map((p: any, i: number) => (
                            <TableRow key={p.pregnancy_id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors">
                              <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4 py-2">
                                {p.date_of_registration ? new Date(p.date_of_registration).toLocaleDateString() : "N/A"}
                              </TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{p.lmp ? new Date(p.lmp).toLocaleDateString() : (p.lmp_date ? new Date(p.lmp_date).toLocaleDateString() : "N/A")}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{p.edd ? new Date(p.edd).toLocaleDateString() : "N/A"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{p.gestational_age_weeks ? `${p.gestational_age_weeks} Weeks` : "N/A"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">G{p.gravidity ?? p.gravida ?? 0} P{p.parity ?? 0}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{p.co_morbidities || "None"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{p.deworming_given ? "Given" : "Not Given"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{p.pregnancy_status || "Active"}</TableCell>
                              <TableCell className="py-2">{getRiskBadge(p.risk_flag || "Low Risk")}</TableCell>
                            </TableRow>
                          ))
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
                    <Input placeholder="Search encounters..." className="h-8 w-[200px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Trimester
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Risk Level
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Refresh</span>
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
                          visitationList.map((visit: any, i: number) => (
                            <TableRow key={visit.visit_id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors">
                              <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4 py-2">
                                {visit.visit_date ? new Date(visit.visit_date).toLocaleDateString() : "N/A"}
                              </TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.trimester || "N/A"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.blood_pressure || "N/A"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.fetal_heart_rate ? `${visit.fetal_heart_rate} bpm` : "N/A"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.fundal_height ? `${visit.fundal_height} cm` : "N/A"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.weight ? `${visit.weight} kg` : "N/A"}</TableCell>
                              <TableCell className="py-2">
                                {getRiskBadge(visit.risk_level || mother.risk)}
                              </TableCell>
                              <TableCell className="text-right py-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground dark:text-white hover:text-foreground">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                                    <DropdownMenuItem className="text-xs cursor-pointer rounded-md">View Full Consultation</DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Edit Notes</DropdownMenuItem>
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

            {activeTab === "appointments" && (
              <div className="flex flex-col gap-4 mt-2">
                {/* Control Bar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <Input placeholder="Search appointments..." className="h-8 w-[200px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Appointment Status
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Risk Flag
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Type
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
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
                            <TableRow key={p.appointment_id || p._id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors">
                              <TableCell className="pl-4 text-xs font-medium text-foreground dark:text-white py-2">
                                {p.appointment_date ? `${new Date(p.appointment_date).toLocaleDateString()} ${p.appointment_time || ""}` : (p.appointmentDateTime ? new Date(p.appointmentDateTime).toLocaleString() : "N/A")}
                              </TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{p.appointment_type || p.type || "Prenatal Visit"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2">{p.reason || "N/A"}</TableCell>
                              <TableCell className="text-xs py-2">
                                <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-blue-500/10 text-blue-500 capitalize">
                                  {p.status || p.appointmentStatus || "Scheduled"}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                                  View
                                </Button>
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
                    <Input placeholder="Search lab records..." className="h-8 w-[200px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Trimester
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Review Status
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {labRecordList.map((lab: any, i: number) => (
                          <TableRow key={lab.screening_id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors">
                            <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4 py-2">
                              {lab.date_of_screening ? new Date(lab.date_of_screening).toLocaleDateString() : "N/A"}
                            </TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white py-2 font-semibold">{lab.screening_type || "N/A"}</TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white py-2">{lab.result || "N/A"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground py-2">{lab.remarks || "None"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground py-2 capitalize">{lab.sync_status || "synced"}</TableCell>
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
                    <Input placeholder="Search prescriptions..." className="h-8 w-[200px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Status
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Type
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Prescribing Doctor
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplementList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                              No supplementation / medication records found
                            </TableCell>
                          </TableRow>
                        ) : (
                          supplementList.map((sup: any, i: number) => (
                            <TableRow key={sup.supplement_id || i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors">
                              <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4 py-2">
                                {sup.date_given ? new Date(sup.date_given).toLocaleDateString() : "N/A"}
                              </TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2 font-semibold">{sup.supplement_type || "N/A"}</TableCell>
                              <TableCell className="text-xs text-foreground dark:text-white py-2">{sup.tablets_given_count ?? "N/A"} tabs</TableCell>
                              <TableCell className="py-2">
                                <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${sup.is_completed ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                                  {sup.is_completed ? "Completed" : "In Progress"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2 capitalize">{sup.sync_status || "synced"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "allergies" && (
              <div className="flex flex-col gap-4 mt-2">
                {/* Control Bar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    <Input placeholder="Search allergies..." className="h-8 w-[200px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
                    <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5 shadow-none">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Severity
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    <Button variant="ghost" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 text-muted-foreground hover:text-foreground">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                    <Button variant="ghost" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 text-muted-foreground hover:text-foreground">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </Button>
                    <Button className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
                      <PlusCircle className="h-3.5 w-3.5" />
                      New Allergy
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="bg-card dark:bg-[#111]">
                        <TableRow className="border-sidebar-border hover:bg-transparent">
                          <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4">Allergy Name</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Severity/Reaction</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Identified Date</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                            No known allergies
                          </TableCell>
                        </TableRow>
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
    </div>
  )
}
