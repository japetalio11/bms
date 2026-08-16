import * as React from "react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { 
  ChevronLeft, 
  MoreVertical, 
  PlusCircle, 
  Download, 
  RefreshCw, 
  Activity, 
  CheckCircle2, 
  Clock, 
  FileText,
  AlertCircle,
  Calendar,
  Droplet,
  Phone,
  MapPin,
  Hash,
  User,
  Baby
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { clsx } from "clsx"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
export function MotherProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState("encounters")

  // Mock Mother Data
  const mother = {
    id,
    name: "Maria Santos",
    age: "28",
    dob: "Oct 12, 1997",
    gestationalAge: "28 Weeks",
    trimester: "3rd Trimester",
    gravida: 3,
    parity: 2,
    lmp: "Nov 10, 2025",
    edd: "Aug 17, 2026",
    bmi: "22.5 Normal",
    bloodType: "O+",
    phone: "+63 912 345 6789",
    address: "Brgy. San Jose, Pili, Camarines Sur",
    fsn: "FSN-2026-001"
  }

  // Consistent tab class extracted from other pages
  const tabTriggerClass = "text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all"

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
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="bg-primary/10 text-primary">MS</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground dark:text-white leading-none">{mother.name}</h2>
                  <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-red-500/10 text-red-500">
                    <Activity className="h-3 w-3" />
                    High Risk
                  </Badge>
                </div>
              </div>

              {/* Right Side: Global Actions */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" className="flex-1 md:flex-none h-9 px-4 text-xs font-medium border-sidebar-border bg-transparent hover:bg-muted dark:hover:bg-[#1a1a1a]">
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
                
                {/* Progress Bar (28 out of 40 weeks = 70%) */}
                <div className="flex flex-col gap-1.5 mt-auto">
                  <div className="h-1.5 w-full bg-sidebar-border dark:bg-[#333] rounded-full overflow-hidden">
                    <div className="h-full bg-primary dark:bg-white rounded-full w-[70%]" />
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
                    <span className="text-sm font-semibold text-foreground dark:text-white">{mother.age} yrs <span className="text-xs font-normal text-muted-foreground ml-1">({mother.dob})</span></span>
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
                        {[
                          { date: "June 16, 2026", tri: "3rd", bp: "120/80 mmHg", fht: "140 bpm", fh: "28 cm", wt: "65 kg", risk: "Low Risk" },
                          { date: "May 15, 2026", tri: "2nd", bp: "118/78 mmHg", fht: "142 bpm", fh: "24 cm", wt: "63 kg", risk: "Low Risk" },
                        ].map((visit, i) => (
                          <TableRow key={i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors">
                            <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4 py-2">{visit.date}</TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.tri}</TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.bp}</TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.fht}</TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.fh}</TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white py-2">{visit.wt}</TableCell>
                            <TableCell className="py-2">
                              <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-green-500/10 text-green-500">
                                <Activity className="h-3 w-3" />
                                {visit.risk}
                              </Badge>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appointments" && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <Tabs defaultValue="all" className="w-full md:w-max">
                    <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                      <TabsTrigger value="all" className={tabTriggerClass}>All Appointments</TabsTrigger>
                      <TabsTrigger value="completed" className={tabTriggerClass}>Completed</TabsTrigger>
                      <TabsTrigger value="scheduled" className={tabTriggerClass}>Scheduled</TabsTrigger>
                      <TabsTrigger value="cancelled" className={tabTriggerClass}>Cancelled</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
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
                          <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4">Date & Time</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Risk Flag</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Appointment Status</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Type</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { date: "June 16, 2026 - 8:00 AM", risk: "Low Risk", status: "Completed", type: "Prenatal" },
                          { date: "June 30, 2026 - 8:00 AM", risk: "Moderate", status: "Scheduled", type: "Prenatal" },
                        ].map((apt, i) => (
                          <TableRow key={i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer">
                            <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4">{apt.date}</TableCell>
                            <TableCell>
                              <Badge className={clsx(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none",
                                apt.risk === "Low Risk" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                              )}>
                                <Activity className="h-3 w-3" />
                                {apt.risk}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={clsx(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none",
                                apt.status === "Completed" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                              )}>
                                {apt.status === "Completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {apt.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white">{apt.type}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white hover:text-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                                  <DropdownMenuItem className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Reschedule</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "laboratory" && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <Tabs defaultValue="all" className="w-full md:w-max">
                    <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                      <TabsTrigger value="all" className={tabTriggerClass}>All Records</TabsTrigger>
                      <TabsTrigger value="incomplete" className={tabTriggerClass}>Incomplete</TabsTrigger>
                      <TabsTrigger value="pending" className={tabTriggerClass}>Pending Review</TabsTrigger>
                      <TabsTrigger value="missing" className={tabTriggerClass}>Missing</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
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

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[
                    { title: "Complete Blood Count", status: "Reviewed", statusColor: "bg-green-500/10 text-green-500" },
                    { title: "Urinalysis", status: "Reviewed", statusColor: "bg-green-500/10 text-green-500" },
                    { title: "Blood Typing", status: "Missing", statusColor: "bg-[#ef4444]/10 text-[#ef4444]", empty: true },
                    { title: "Hepatitis B Screening", status: "Uploaded", statusColor: "bg-[#3b82f6]/10 text-[#3b82f6]" },
                    { title: "Syphilis Screening", status: "Missing", statusColor: "bg-[#ef4444]/10 text-[#ef4444]", empty: true },
                    { title: "HIV Screening", status: "Missing", statusColor: "bg-[#ef4444]/10 text-[#ef4444]", empty: true },
                  ].map((lab, i) => (
                    <div key={i} className="flex flex-col rounded-xl border border-sidebar-border bg-card dark:bg-[#111] overflow-hidden group cursor-pointer hover:border-foreground/30 transition-colors">
                      {lab.empty ? (
                        <div className="h-32 bg-muted/30 dark:bg-[#1a1a1a] flex items-center justify-center border-b border-sidebar-border border-dashed">
                          <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      ) : (
                        <div className="h-32 bg-muted dark:bg-[#1a1a1a] flex flex-col p-3 border-b border-sidebar-border">
                          <div className="flex-1 rounded border border-sidebar-border border-dashed bg-background/50 flex flex-col items-center justify-center gap-2">
                             <FileText className="h-6 w-6 text-muted-foreground opacity-50" />
                             <span className="text-[10px] text-muted-foreground font-mono">PDF Document</span>
                          </div>
                        </div>
                      )}
                      <div className="p-4 flex flex-col gap-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-foreground dark:text-white leading-tight">{lab.title}</h4>
                          <span className={clsx("inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-medium border border-transparent shadow-none", lab.statusColor)}>
                            {lab.status}
                          </span>
                        </div>
                        {lab.empty ? (
                          <span className="text-[10px] text-muted-foreground">Required standard DOH screening.</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Uploaded June 16, 2026</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "prescriptions" && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <Tabs defaultValue="all" className="w-full md:w-max">
                    <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                      <TabsTrigger value="all" className={tabTriggerClass}>All Prescriptions</TabsTrigger>
                      <TabsTrigger value="active" className={tabTriggerClass}>Active</TabsTrigger>
                      <TabsTrigger value="discontinued" className={tabTriggerClass}>Discontinued</TabsTrigger>
                      <TabsTrigger value="supplements" className={tabTriggerClass}>Supplements</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
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
                          <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4">Prescription Name</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Status</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Type</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Frequency</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Dosage</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Start Date</TableHead>
                          <TableHead className="text-xs font-medium text-foreground dark:text-white">Prescribed By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { name: "Ferrous Sulfate (Iron)", status: "Active", type: "Supplement", freq: "Once daily", dose: "500 mg", date: "June 16, 2026", dr: "Dr. P. Villamer" },
                          { name: "Amoxicillin", status: "Discontinued", type: "Medicine", freq: "Twice daily", dose: "500 mg", date: "May 10, 2026", dr: "Dr. P. Villamer" },
                        ].map((med, i) => (
                          <TableRow key={i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer">
                            <TableCell className="text-xs font-semibold text-foreground dark:text-white pl-4">{med.name}</TableCell>
                            <TableCell>
                              <span className={clsx(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-medium border",
                                med.status === "Active" ? "bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]" : "bg-muted dark:bg-[#1a1a1a] border-sidebar-border text-muted-foreground"
                              )}>
                                <div className={clsx("h-1.5 w-1.5 rounded-full", med.status === "Active" ? "bg-[#22C55E]" : "bg-muted-foreground")} />
                                {med.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white">{med.type}</TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white">{med.freq}</TableCell>
                            <TableCell className="text-xs text-foreground dark:text-white">{med.dose}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{med.date}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{med.dr}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "allergies" && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <Tabs defaultValue="all" className="w-full md:w-max">
                    <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                      <TabsTrigger value="all" className={tabTriggerClass}>All Allergies</TabsTrigger>
                      <TabsTrigger value="severe" className={tabTriggerClass}>Severe</TabsTrigger>
                      <TabsTrigger value="moderate" className={tabTriggerClass}>Moderate</TabsTrigger>
                      <TabsTrigger value="mild" className={tabTriggerClass}>Mild</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
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
                        {[
                          { name: "Penicillin", severity: "Severe (Anaphylaxis)", color: "bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]", dot: "bg-[#ef4444]", date: "Jan 12, 2020" },
                          { name: "Peanuts", severity: "Moderate (Hives)", color: "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]", dot: "bg-[#F59E0B]", date: "Mar 05, 2015" },
                        ].map((allergy, i) => (
                          <TableRow key={i} className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer">
                            <TableCell className="text-xs font-semibold text-foreground dark:text-white pl-4">{allergy.name}</TableCell>
                            <TableCell>
                               <span className={clsx(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-medium border shadow-none",
                                allergy.color
                              )}>
                                <div className={clsx("h-1.5 w-1.5 rounded-full", allergy.dot)} />
                                {allergy.severity}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{allergy.date}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white hover:text-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                                  <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Edit Details</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs text-[#ff7373] focus:text-[#ff7373] focus:bg-[#ff7373]/10 cursor-pointer rounded-md">Remove</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
