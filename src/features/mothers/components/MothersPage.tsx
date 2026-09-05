import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  RefreshCw,
  PlusCircle,
  MoreVertical,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Filter,
  AlertTriangle,
  Search,
  QrCode,
} from "lucide-react"
import { extractRiskLevel } from "@/lib/riskUtils"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RegisterMotherModal } from "./RegisterMotherModal"
import { ConnectMotherModal } from "./ConnectMotherModal"
import { ExportMaternalDataModal } from "./ExportMaternalDataModal"
import { formatDate } from "@/lib/utils"
import { mothersApi } from "../api"

export function MothersPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("all")
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [motherList, setMotherList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRiskFilters, setSelectedRiskFilters] = useState<string[]>([])
  const [selectedBarangayFilters, setSelectedBarangayFilters] = useState<string[]>([])

  const fetchMothers = async () => {
    setLoading(true)
    const userStr = localStorage.getItem("user")
    const user = userStr ? JSON.parse(userStr) : null

    try {
      const mothers = await mothersApi.getActiveMothers(user?.facility_id)
      setMotherList(mothers)
    } catch (err) {
      setMotherList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMothers()
  }, [])

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

  const displayedMothers = motherList
    .map((m: any) => {
      const name = [m.user?.first_name || m.first_name, m.user?.middle_name || m.middle_name, m.user?.last_name || m.last_name].filter(Boolean).join(" ") || m.name || "Unknown"
      const currentPregnancy = m.pregnancies?.[0] || m.pregnancy
      const latestVisit = currentPregnancy?.prenatalVisits?.[0]
      const risk = extractRiskLevel(m, m.pregnancies, m.prenatalVisits)

      const lmpRaw = currentPregnancy?.lmp_date || currentPregnancy?.lmp
      const calculatedGA = lmpRaw ? calculateGAWeeks(lmpRaw) : (currentPregnancy?.gestational_age_weeks || 0)
      const gestationalAge = calculatedGA > 0 ? `${calculatedGA} Weeks` : "N/A"

      const eddVal = lmpRaw ? calculateEDD(lmpRaw) : (currentPregnancy?.edd ? formatDate(currentPregnancy.edd) : "N/A")
      const station = m.user?.address || m.address || "N/A"

      return {
        id: m.id || m._id || m.mother_id || m.user_id,
        rawMother: m,
        name,
        risk,
        gestationalAge,
        edd: eddVal,
        station
      }
    })
    .filter((m) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase()
        const matchName = m.name.toLowerCase().includes(q)
        const matchStation = m.station.toLowerCase().includes(q)
        if (!matchName && !matchStation) return false
      }

      if (activeTab === "high-risk") {
        if (!m.risk || !m.risk.toLowerCase().includes("high")) return false
      } else if (activeTab === "triage") {
        if (m.risk !== null && m.risk !== undefined && m.risk !== "N/A") return false
      } else if (activeTab === "postpartum") {
        const status = m.rawMother.pregnancies?.[0]?.pregnancy_status?.toLowerCase()
        if (status !== "postpartum" && status !== "delivered") return false
      }

      if (selectedRiskFilters.length > 0) {
        if (!m.risk) return false
        const match = selectedRiskFilters.some((rf) => m.risk.toLowerCase().includes(rf.toLowerCase()))
        if (!match) return false
      }

      if (selectedBarangayFilters.length > 0) {
        const match = selectedBarangayFilters.some((bg) => m.station.toLowerCase().includes(bg.toLowerCase()))
        if (!match) return false
      }

      return true
    })

  const getRiskBadge = (risk?: string | null) => {
    if (!risk || risk === "N/A" || risk.trim() === "") {
      return (
        <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-muted text-muted-foreground">
          <Activity className="h-3 w-3 opacity-60" />
          No Risk Assessed
        </Badge>
      )
    }

    const lowerRisk = risk.toLowerCase()
    if (lowerRisk.includes("high")) {
      return <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-red-500/10 text-red-500"><Activity className="h-3 w-3" />High Risk</Badge>
    } else if (lowerRisk.includes("mod")) {
      return <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-amber-500/10 text-amber-500"><AlertTriangle className="h-3 w-3" />Moderate</Badge>
    } else {
      return <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-green-500/10 text-green-500"><CheckCircle2 className="h-3 w-3" />Low Risk</Badge>
    }
  }

  return (
    <div className="relative flex items-start w-full h-full overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-col w-full h-full text-foreground min-w-0 overflow-y-auto relative">
        <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background dark:bg-black p-4 pl-3 pr-4 pb-4 border-b md:border-none border-sidebar-border">

          {/* Tabs */}
          <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-max">
              <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="all" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">All Mothers</TabsTrigger>
                <TabsTrigger value="high-risk" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">High Risk Profiles</TabsTrigger>
                <TabsTrigger value="triage" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Pending Triage</TabsTrigger>
                <TabsTrigger value="postpartum" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Postpartum</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex w-full xl:w-auto flex-wrap items-center gap-2">
              <div className="flex w-full md:w-auto items-center gap-2">
                <div className="relative w-full sm:w-[250px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search mothers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 pr-2 w-full text-xs font-normal bg-background dark:bg-black border-sidebar-border"
                  />
                </div>
                <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 shrink-0 md:hidden border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:text-foreground dark:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                  <Filter className="h-3.5 w-3.5" />
                  Filter & Export
                </Button>
              </div>

              {/* Risk Flag Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:bg-white/5 ${selectedRiskFilters.length > 0 ? "border-solid border-primary text-primary" : ""}`}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    Risk Flag
                    {selectedRiskFilters.length > 0 && (
                      <span className="ml-1 rounded bg-primary/10 px-1 py-0.2 text-[10px] font-bold text-primary">
                        {selectedRiskFilters.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                  <div className="flex flex-col gap-2.5">
                    {["Low Risk", "Moderate", "High Risk"].map((option) => {
                      const isChecked = selectedRiskFilters.includes(option)
                      return (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-risk-${option}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRiskFilters((prev) => [...prev, option])
                              } else {
                                setSelectedRiskFilters((prev) => prev.filter((item) => item !== option))
                              }
                            }}
                            className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black h-3.5 w-3.5 rounded-[4px]"
                          />
                          <label htmlFor={`filter-risk-${option}`} className="text-xs font-normal text-foreground dark:text-white leading-none cursor-pointer">
                            {option}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                  {selectedRiskFilters.length > 0 && (
                    <Button
                      onClick={() => setSelectedRiskFilters([])}
                      variant="ghost"
                      className="h-7 text-xs w-full text-muted-foreground hover:text-foreground"
                    >
                      Clear Filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Barangay Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:bg-white/5 ${selectedBarangayFilters.length > 0 ? "border-solid border-primary text-primary" : ""}`}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    Barangay / Address
                    {selectedBarangayFilters.length > 0 && (
                      <span className="ml-1 rounded bg-primary/10 px-1 py-0.2 text-[10px] font-bold text-primary">
                        {selectedBarangayFilters.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                  <div className="flex flex-col gap-2.5">
                    {["San Vicente", "Bagumbayan", "Concepcion", "Iriga"].map((option) => {
                      const isChecked = selectedBarangayFilters.includes(option)
                      return (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-brgy-${option}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBarangayFilters((prev) => [...prev, option])
                              } else {
                                setSelectedBarangayFilters((prev) => prev.filter((item) => item !== option))
                              }
                            }}
                            className="border-sidebar-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black h-3.5 w-3.5 rounded-[4px]"
                          />
                          <label htmlFor={`filter-brgy-${option}`} className="text-xs font-normal text-foreground dark:text-white leading-none cursor-pointer">
                            {option}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                  {selectedBarangayFilters.length > 0 && (
                    <Button
                      onClick={() => setSelectedBarangayFilters([])}
                      variant="ghost"
                      className="h-7 text-xs w-full text-muted-foreground hover:text-foreground"
                    >
                      Clear Filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex w-full xl:w-auto items-center gap-2">
              <ExportMaternalDataModal>
                <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:text-foreground dark:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </ExportMaternalDataModal>
              <Button onClick={fetchMothers} variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:text-foreground dark:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={() => setConnectModalOpen(true)} variant="outline" className="w-full md:w-auto h-8 px-2 text-xs font-medium gap-2 border-primary/50 text-primary hover:bg-primary/10">
                <QrCode className="h-3.5 w-3.5" />
                Connect Mother (QR/Code)
              </Button>
              <Button onClick={() => setRegisterModalOpen(true)} className="w-full md:w-auto h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
                <PlusCircle className="h-3.5 w-3.5" />
                Register Mother
              </Button>
            </div>
          </div>

          {/* Mobile Top Pagination */}
          <div className="flex md:hidden items-center justify-between text-xs text-muted-foreground w-full pt-4 mt-2 border-t border-sidebar-border">
            <span>Page 1 of 1</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronsLeft className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronsRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 md:pt-0 pl-3 pr-4 pb-24 md:pb-4">
          {/* Mobile List View (Hidden on MD and up) */}
          <div className="flex md:hidden flex-col gap-4">
            {displayedMothers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-sidebar-border rounded-xl bg-card dark:bg-black">
                <p className="text-xs text-muted-foreground">No mothers found</p>
              </div>
            ) : (
              displayedMothers.map((mother: any) => (
                <div
                  key={mother.id}
                  className="flex flex-col p-4 rounded-xl border border-sidebar-border bg-card dark:bg-black gap-4 cursor-pointer hover:border-foreground/20 transition-colors"
                  onClick={() => navigate(`/dashboard/mothers/${mother.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground dark:text-white">{mother.name}</h3>
                    {getRiskBadge(mother.risk)}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Gestational Age</span>
                      <span className="text-xs text-foreground dark:text-white font-medium">{mother.gestationalAge}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Estimated Due Date</span>
                      <span className="text-xs text-foreground dark:text-white font-medium">{mother.edd}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Address</span>
                      <span className="text-xs text-foreground dark:text-white font-medium">{mother.station}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="bg-card dark:bg-[#111]">
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead className="w-12 text-center pl-4">
                      <Checkbox className="border-sidebar-border" />
                    </TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Mother Name</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Risk Flag</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Gestational Age (Weeks)</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Estimated Due Date</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Address</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedMothers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                        No mothers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedMothers.map((mother: any) => (
                      <TableRow
                        key={mother.id}
                        className="border-sidebar-border cursor-pointer transition-colors group hover:bg-accent dark:hover:bg-white/5"
                        onClick={() => navigate(`/dashboard/mothers/${mother.id}`)}
                      >
                        <TableCell className="pl-4">
                          <Checkbox className="border-sidebar-border data-[state=checked]:bg-primary dark:data-[state=checked]:bg-white data-[state=checked]:text-primary-foreground dark:data-[state=checked]:text-black" />
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">{mother.name}</TableCell>
                        <TableCell>{getRiskBadge(mother.risk)}</TableCell>
                        <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">{mother.gestationalAge}</TableCell>
                        <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">{mother.edd}</TableCell>
                        <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">{mother.station}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-foreground dark:text-white group-hover:text-foreground dark:text-foreground dark:text-white" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/dashboard/mothers/${mother.id}`)} className="text-xs cursor-pointer rounded-md">View Profile</DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/mothers/${mother.id}`) }} className="text-xs cursor-pointer rounded-md">Edit Profile</DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (confirm(`Are you sure you want to delete ${mother.name}?`)) {
                                    const token = localStorage.getItem("token")
                                    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"
                                    try {
                                      await fetch(`${baseUrl}/api/v1/mother/delete/soft/${mother.id}`, {
                                        method: "DELETE",
                                        headers: { Authorization: `Bearer ${token}` }
                                      })
                                      fetchMothers()
                                    } catch (err) {
                                      alert("Failed to delete mother profile")
                                    }
                                  }
                                }}
                                className="text-xs cursor-pointer rounded-md text-red-500 focus:text-red-500"
                              >
                                Delete Mother
                              </DropdownMenuItem>
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

          {/* Desktop Pagination Footer */}
          <div className="hidden md:flex flex-row items-center justify-between text-xs text-muted-foreground gap-4 mt-2">
            <div>0 of {displayedMothers.length} row(s) selected.</div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <div className="flex items-center justify-between border border-sidebar-border bg-card dark:bg-[#111] hover:bg-accent dark:hover:bg-[#222] cursor-pointer rounded-md px-2 py-1 gap-2 transition-colors">
                  <span>10</span>
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span>Page 1 of 1</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronsLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronsRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RegisterMotherModal
        open={registerModalOpen}
        onOpenChange={setRegisterModalOpen}
        onSuccess={fetchMothers}
      />
      <ConnectMotherModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        onSuccess={fetchMothers}
      />
    </div>
  )
}
