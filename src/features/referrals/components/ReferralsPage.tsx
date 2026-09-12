import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  MoreVertical,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  PlusCircle,
  Download,
  Plus,
  Copy,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  WifiOff,
  CloudOff
} from "lucide-react"

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { ReferralSidepeek } from "./ReferralSidepeek"
import { CreateReferralModal } from "./CreateReferralModal"
import { ExportReferralModal } from "./ExportReferralModal"
import { ReferralSuccessModal, type ReferralSuccessData } from "./ReferralSuccessModal"
import { referralRepository } from "@/lib/repositories/referralRepository"
import type { LocalReferral } from "@/lib/db/bmsDatabase"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { syncEngine } from "@/lib/sync/syncEngine"

export function ReferralsPage() {
  const [activeTab, setActiveTab] = useState("today")
  const [referrals, setReferrals] = useState<LocalReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRiskFilters, setSelectedRiskFilters] = useState<string[]>([])
  const [selectedReferral, setSelectedReferral] = useState<LocalReferral | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [successData, setSuccessData] = useState<ReferralSuccessData | null>(null)
  const [copyNotification, setCopyNotification] = useState<string>("")
  
  const isMobile = useIsMobile()
  const { isOnline } = useNetworkStatus()

  // Load referrals from repository / backend
  const loadReferrals = async () => {
    setLoading(true)
    try {
      const data = await referralRepository.getAllReferrals()
      setReferrals(data)
    } catch (err) {
      console.error("[ReferralsPage] Failed to fetch referrals:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReferrals()

    const unsubscribe = syncEngine.subscribe(() => {
      loadReferrals()
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (isOnline) {
      loadReferrals()
    }
  }, [isOnline])

  // Filter referrals based on tab, search query, and risk filters
  const filteredReferrals = useMemo(() => {
    return referrals.filter((ref) => {
      const statusLower = (ref.status || "pending").toLowerCase()
      
      // Tab filter
      if (activeTab === "accepted" && statusLower !== "accepted" && statusLower !== "completed") {
        return false
      }
      if (activeTab === "pending" && statusLower !== "pending") {
        return false
      }
      if (activeTab === "in-transit" && statusLower !== "in_transit" && statusLower !== "in-transit" && statusLower !== "transferred") {
        return false
      }
      if (activeTab === "admitted" && statusLower !== "admitted" && statusLower !== "completed") {
        return false
      }

      // Risk Level Filter
      const risk = ref.pregnancy?.risk_flag || ref.riskFlag || "Low Risk"
      if (selectedRiskFilters.length > 0 && !selectedRiskFilters.includes(risk)) {
        return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const motherName = ref.pregnancy?.mother 
          ? `${ref.pregnancy.mother.first_name || ""} ${ref.pregnancy.mother.last_name || ""}`.toLowerCase()
          : (ref.motherName || "").toLowerCase()
        const code = (ref.shared_pin || ref.transferCode || "").toLowerCase()
        const dest = (ref.toFacility?.facility_name || ref.external_facility_name || ref.destination || "").toLowerCase()
        const reason = (ref.reason || "").toLowerCase()

        if (!motherName.includes(q) && !code.includes(q) && !dest.includes(q) && !reason.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [referrals, activeTab, searchQuery, selectedRiskFilters])

  // Swipe gesture handling for mobile tabs
  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null)
  const [touchEndPos, setTouchEndPos] = useState<{x: number, y: number} | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndPos(null)
    setTouchStartPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndPos({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchEndHandler = () => {
    if (!touchStartPos || !touchEndPos) return
    
    const distanceX = touchStartPos.x - touchEndPos.x
    const distanceY = Math.abs(touchStartPos.y - touchEndPos.y)
    
    if (Math.abs(distanceX) > distanceY && Math.abs(distanceX) > minSwipeDistance) {
      const isLeftSwipe = distanceX > minSwipeDistance
      const isRightSwipe = distanceX < -minSwipeDistance

      const tabs = ["today", "accepted", "pending", "in-transit", "admitted"]
      const currentIndex = tabs.indexOf(activeTab)

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1])
      }
    }
  }

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRowIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedRowIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedRowIds.size === filteredReferrals.length) {
      setSelectedRowIds(new Set())
    } else {
      setSelectedRowIds(new Set(filteredReferrals.map((r) => r.id)))
    }
  }

  const handleCopyText = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!text || text === "N/A") return
    navigator.clipboard.writeText(text)
    setCopyNotification(`${label} copied!`)
    setTimeout(() => setCopyNotification(""), 2000)
  }

  return (
    <div className="relative flex items-start w-full h-full overflow-hidden bg-background dark:bg-black">
      {copyNotification && (
        <div className="fixed bottom-4 right-4 z-[100] px-3 py-2 text-xs bg-foreground text-background font-medium rounded-md shadow-lg transition-all">
          {copyNotification}
        </div>
      )}

      <div 
        className="flex flex-col w-full h-full text-foreground min-w-0 overflow-y-auto relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background dark:bg-black p-4 pl-3 pr-4 pb-4 border-b md:border-none border-sidebar-border">
          {/* Tabs */}
          <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-max">
              <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="today" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Today's Queue</TabsTrigger>
                <TabsTrigger value="accepted" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Accepted</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Pending</TabsTrigger>
                <TabsTrigger value="in-transit" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">In Transit</TabsTrigger>
                <TabsTrigger value="admitted" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Admitted</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Toolbar */}
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs border border-amber-500/20 font-medium">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>Working Offline — Referrals created or updated locally will automatically sync with the server once internet connectivity is restored.</span>
            </div>
          )}

          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex w-full xl:w-auto flex-wrap items-center gap-2">
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search referrals..." 
                className="h-8 px-2 w-full sm:w-[250px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" 
              />
              
              {/* Filter 1: ML Risk Level */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-white dark:hover:bg-white/5">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Risk Level {selectedRiskFilters.length > 0 ? `(${selectedRiskFilters.length})` : ""}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                  <div className="flex flex-col gap-2.5">
                    {["High Risk", "Medium Risk", "Low Risk"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`filter-risk-${option}`} 
                          checked={selectedRiskFilters.includes(option)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedRiskFilters([...selectedRiskFilters, option])
                            else setSelectedRiskFilters(selectedRiskFilters.filter((r) => r !== option))
                          }}
                          className="border-sidebar-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-3.5 w-3.5 rounded-[4px]" 
                        />
                        <label htmlFor={`filter-risk-${option}`} className="text-xs font-normal cursor-pointer text-foreground dark:text-white">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedRiskFilters.length > 0 && (
                    <Button 
                      onClick={() => setSelectedRiskFilters([])}
                      className="h-7 text-xs w-full bg-primary text-primary-foreground"
                    >
                      Clear Filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex w-full xl:w-auto items-center gap-2">
              <Button variant="outline" onClick={() => setIsExportOpen(true)} className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button variant="outline" onClick={loadReferrals} className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} className="h-8 text-xs font-medium gap-1.5 bg-foreground text-background hover:bg-foreground/90">
                <Plus className="h-3.5 w-3.5" />
                Create Referral
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 md:pt-0 pl-3 pr-4 pb-24 md:pb-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading online referrals...
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredReferrals.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-sidebar-border rounded-xl bg-card/50">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-3 opacity-50" />
              <h3 className="text-sm font-semibold text-foreground dark:text-white">No Referrals Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No active e-Referral transfers match your current filter criteria. Initiate a new inter-clinic referral to get started.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4 h-8 text-xs bg-foreground text-background hover:bg-foreground/90">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Initiate First Referral
              </Button>
            </div>
          )}

          {/* Desktop Data Table */}
          {!loading && filteredReferrals.length > 0 && (
            <div className="hidden md:block rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-[#0a0a0a]">
              <div className="min-w-[1100px]">
                <Table>
                  <TableHeader className="bg-card dark:bg-[#111]">
                    <TableRow className="border-sidebar-border hover:bg-transparent">
                      <TableHead className="w-12 text-center pl-4">
                        <Checkbox 
                          checked={selectedRowIds.size === filteredReferrals.length && filteredReferrals.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="border-sidebar-border" 
                        />
                      </TableHead>
                      <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Mother Name</TableHead>
                      <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Initiated At</TableHead>
                      <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Risk Flag</TableHead>
                      <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Transfer Record Link</TableHead>
                      <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Transfer Code</TableHead>
                      <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Destination Facility</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReferrals.map((ref) => {
                      const motherName = ref.pregnancy?.mother 
                        ? `${ref.pregnancy.mother.first_name || ""} ${ref.pregnancy.mother.last_name || ""}`.trim()
                        : (ref.motherName || "Patient Record")
                      const initiatedAt = ref.date_referred ? new Date(ref.date_referred).toLocaleString() : (ref.initiatedAt || "N/A")
                      const riskFlag = ref.pregnancy?.risk_flag || ref.riskFlag || "Low Risk"
                      const status = ref.status ? (ref.status.charAt(0).toUpperCase() + ref.status.slice(1)) : "Pending"
                      const recordLink = ref.secure_link || ref.recordLink || "N/A"
                      const transferCode = ref.shared_pin || ref.transferCode || "N/A"
                      const destination = ref.toFacility?.facility_name || ref.external_facility_name || ref.destination || "N/A"

                      return (
                        <TableRow 
                          key={ref.id} 
                          className={`border-sidebar-border cursor-pointer transition-colors group ${selectedReferral?.id === ref.id ? 'bg-accent dark:bg-white/10' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                          onClick={() => setSelectedReferral(ref)}
                        >
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedRowIds.has(ref.id)}
                              onCheckedChange={() => toggleSelectRow(ref.id)}
                              className="border-sidebar-border data-[state=checked]:bg-primary dark:data-[state=checked]:bg-white data-[state=checked]:text-primary-foreground dark:data-[state=checked]:text-black" 
                            />
                          </TableCell>
                          <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">
                            {motherName}
                          </TableCell>
                          <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                            {initiatedAt}
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
                              riskFlag === 'High Risk' ? 'bg-red-500/10 text-red-500' : 
                              riskFlag === 'Medium Risk' ? 'bg-amber-500/10 text-amber-500' : 
                              'bg-green-500/10 text-green-500'
                            }`}>
                              {riskFlag === 'High Risk' ? <Activity className="h-3 w-3" /> : riskFlag === 'Medium Risk' ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              {riskFlag}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
                                status === 'Accepted' || status === 'Completed' ? 'bg-green-500/10 text-green-500' : 
                                status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 
                                'bg-blue-500/10 text-blue-500'
                              }`}>
                                {status === 'Accepted' || status === 'Completed' ? <CheckCircle2 className="h-3 w-3" /> : status === 'Pending' ? <Clock className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                                {status}
                              </div>
                              {ref.sync_status && ref.sync_status !== "synced" && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <CloudOff className="h-2.5 w-2.5" /> Pending Sync
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {recordLink !== "N/A" ? (
                                <a href={recordLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{recordLink}</a>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                              {recordLink !== "N/A" && (
                                <Copy className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" onClick={(e) => handleCopyText(recordLink, "Link", e)} />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-foreground dark:text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {transferCode}
                              {transferCode !== "N/A" && (
                                <Copy className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" onClick={(e) => handleCopyText(transferCode, "PIN Code", e)} />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                            {destination}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white group-hover:text-foreground dark:text-white">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                                <DropdownMenuItem onClick={() => setSelectedReferral(ref)} className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => {
                                  await referralRepository.respondToReferral(ref.referral_id || ref.id, { status: "cancelled" })
                                  loadReferrals()
                                }} className="text-xs cursor-pointer rounded-md text-red-500 hover:!text-red-500 hover:!bg-red-500/10">
                                  Cancel Transfer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Desktop Pagination Footer */}
          {!loading && filteredReferrals.length > 0 && (
            <div className="hidden md:flex flex-row items-center justify-between text-xs text-muted-foreground gap-4">
              <div>{selectedRowIds.size} of {filteredReferrals.length} row(s) selected.</div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <span>Total Items: {filteredReferrals.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Card List */}
          {!loading && filteredReferrals.length > 0 && (
            <div className="flex md:hidden flex-col gap-4">
              {filteredReferrals.map((ref) => {
                const motherName = ref.pregnancy?.mother 
                  ? `${ref.pregnancy.mother.first_name || ""} ${ref.pregnancy.mother.last_name || ""}`.trim()
                  : (ref.motherName || "Patient Record")
                const initiatedAt = ref.date_referred ? new Date(ref.date_referred).toLocaleString() : (ref.initiatedAt || "N/A")
                const riskFlag = ref.pregnancy?.risk_flag || ref.riskFlag || "Low Risk"
                const status = ref.status ? (ref.status.charAt(0).toUpperCase() + ref.status.slice(1)) : "Pending"
                const transferCode = ref.shared_pin || ref.transferCode || "N/A"
                const destination = ref.toFacility?.facility_name || ref.external_facility_name || ref.destination || "N/A"

                return (
                  <div 
                    key={ref.id} 
                    className={`flex flex-col p-4 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] gap-4 cursor-pointer transition-colors ${selectedReferral?.id === ref.id ? 'ring-1 ring-ring dark:ring-white/20' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                    onClick={() => setSelectedReferral(ref)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold text-foreground dark:text-white">{motherName}</h3>
                        <span className="text-xs text-muted-foreground">{initiatedAt}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
                          riskFlag === 'High Risk' ? 'bg-red-500/10 text-red-500' : 
                          riskFlag === 'Medium Risk' ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-green-500/10 text-green-500'
                        }`}>
                          {riskFlag === 'High Risk' ? <Activity className="h-3 w-3" /> : riskFlag === 'Medium Risk' ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {riskFlag}
                        </div>
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
                          status === 'Accepted' || status === 'Completed' ? 'bg-green-500/10 text-green-500' : 
                          status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {status === 'Accepted' || status === 'Completed' ? <CheckCircle2 className="h-3 w-3" /> : status === 'Pending' ? <Clock className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                          {status}
                        </div>
                        {ref.sync_status && ref.sync_status !== "synced" && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <CloudOff className="h-2.5 w-2.5" /> Pending Sync
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Destination</span>
                        <span className="text-xs text-foreground dark:text-white text-right">{destination}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Transfer Code</span>
                        <div className="flex items-center gap-2 text-xs font-mono text-foreground dark:text-white text-right">
                          {transferCode}
                          {transferCode !== "N/A" && (
                            <Copy className="h-3 w-3 text-muted-foreground cursor-pointer" onClick={(e) => handleCopyText(transferCode, "PIN Code", e)} />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-3 border-t border-sidebar-border" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                          <DropdownMenuItem onClick={() => setSelectedReferral(ref)} className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            await referralRepository.respondToReferral(ref.referral_id || ref.id, { status: "cancelled" })
                            loadReferrals()
                          }} className="text-xs cursor-pointer rounded-md text-red-500 hover:!text-red-500 hover:!bg-red-500/10">
                            Cancel Transfer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Desktop Floating Sidepeek Overlay */}
      {!isMobile && (
        <div 
          className={`fixed top-0 right-0 h-screen w-[100%] sm:w-[450px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${selectedReferral ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <ReferralSidepeek 
            referral={selectedReferral} 
            onClose={() => setSelectedReferral(null)} 
            onUpdated={loadReferrals}
          />
        </div>
      )}

      {/* Mobile Sidepeek Drawer (from underneath with drag-to-dismiss) */}
      {isMobile && (
        <Drawer open={!!selectedReferral} onOpenChange={(open) => !open && setSelectedReferral(null)}>
          <DrawerContent className="p-0 bg-background dark:bg-[#0a0a0a] border-t border-sidebar-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden !h-[85dvh] flex flex-col focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Referral Details</DrawerTitle>
            </div>
            <ReferralSidepeek 
              referral={selectedReferral} 
              onClose={() => setSelectedReferral(null)} 
              onUpdated={loadReferrals}
            />
          </DrawerContent>
        </Drawer>
      )}

      <CreateReferralModal 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onCreated={loadReferrals}
        onSuccessCreated={(data) => {
          setSuccessData(data)
          setIsSuccessOpen(true)
        }}
      />
      <ExportReferralModal 
        open={isExportOpen} 
        onOpenChange={setIsExportOpen} 
        referrals={referrals}
        filteredCount={filteredReferrals.length}
      />
      <ReferralSuccessModal
        open={isSuccessOpen}
        onOpenChange={setIsSuccessOpen}
        referralData={successData}
      />
    </div>
  )
}
