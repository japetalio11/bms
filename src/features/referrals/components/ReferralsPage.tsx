import * as React from "react"
import { useState } from "react"
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
  AlertTriangle
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

const MOCK_REFERRALS = [
  {
    id: "1",
    motherName: "Maria Santos",
    initiatedAt: "June 16, 2026 - 8:00 AM",
    riskFlag: "High Risk",
    status: "Accepted",
    recordLink: "https://bms.link/abc",
    transferCode: "DNAG0T",
    destination: "Bicol Medical Center"
  },
  {
    id: "2",
    motherName: "Anna Cruz",
    initiatedAt: "June 16, 2026 - 9:30 AM",
    riskFlag: "Medium Risk",
    status: "Pending",
    recordLink: "https://bms.link/def",
    transferCode: "X9K2P1",
    destination: "Bicol Regional Training and Teaching Hospital"
  },
  {
    id: "3",
    motherName: "Liza Reyes",
    initiatedAt: "June 16, 2026 - 10:15 AM",
    riskFlag: "Low Risk",
    status: "In Transit",
    recordLink: "https://bms.link/ghi",
    transferCode: "L5M9Q8",
    destination: "Ziga Memorial District Hospital"
  }
]

export function ReferralsPage() {
  const [activeTab, setActiveTab] = useState("today")
  const [selectedReferral, setSelectedReferral] = useState<any>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  
  const isMobile = useIsMobile()

  // Swipe gesture handling
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

  return (
    <div className="relative flex items-start w-full h-full overflow-hidden bg-background dark:bg-black">
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
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex w-full xl:w-auto flex-wrap items-center gap-2">
              <Input placeholder="Search referrals..." className="h-8 px-2 w-full sm:w-[250px] text-xs font-normal bg-background dark:bg-black border-sidebar-border" />
              
              {/* Filter 1: ML Risk Level */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-white dark:hover:bg-white/5">
                    <PlusCircle className="h-3.5 w-3.5" />
                    ML Risk Level
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                  <div className="flex flex-col gap-2.5">
                    {["High Risk", "Medium Risk", "Low Risk"].map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox id={`filter-risk-${option}`} className="border-sidebar-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-3.5 w-3.5 rounded-[4px]" />
                          <label htmlFor={`filter-risk-${option}`} className="text-xs font-normal cursor-pointer text-foreground dark:text-white">
                            {option}
                          </label>
                        </div>
                      ))}
                  </div>
                  <Button className="h-7 text-xs w-full bg-primary text-primary-foreground">
                    Clear Filter
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Filter 2: Time Elapsed */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border border-dashed !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:text-white dark:hover:bg-white/5">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Time Elapsed
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                  <div className="flex flex-col gap-2.5">
                    {["< 1 hour", "1-4 hours", "> 4 hours"].map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox id={`filter-time-${option}`} className="border-sidebar-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-3.5 w-3.5 rounded-[4px]" />
                          <label htmlFor={`filter-time-${option}`} className="text-xs font-normal cursor-pointer text-foreground dark:text-white">
                            {option}
                          </label>
                        </div>
                      ))}
                  </div>
                  <Button className="h-7 text-xs w-full bg-primary text-primary-foreground">
                    Clear Filter
                  </Button>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex w-full xl:w-auto items-center gap-2">
              <Button variant="outline" onClick={() => setIsExportOpen(true)} className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button variant="outline" className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5">
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} className="h-8 text-xs font-medium gap-1.5 bg-foreground text-background hover:bg-foreground/90">
                <Plus className="h-3.5 w-3.5" />
                Create Referral
              </Button>
            </div>
          </div>

          {/* Mobile Pagination (Sticky) */}
          <div className="md:hidden flex items-center justify-between pt-2 border-t border-sidebar-border mt-2">
            <span className="text-xs text-muted-foreground font-medium">Page 1 of 1</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 border-sidebar-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 md:pt-0 pl-3 pr-4 pb-24 md:pb-4">
          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-[#0a0a0a]">
            <div className="min-w-[1100px]">
              <Table>
                <TableHeader className="bg-card dark:bg-[#111]">
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead className="w-12 text-center pl-4">
                      <Checkbox className="border-sidebar-border" />
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
                  {MOCK_REFERRALS.map((ref) => (
                    <TableRow 
                      key={ref.id} 
                      className={`border-sidebar-border cursor-pointer transition-colors group ${selectedReferral?.id === ref.id ? 'bg-accent dark:bg-white/10' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                      onClick={() => setSelectedReferral(ref)}
                    >
                      <TableCell className="pl-4">
                        <Checkbox className="border-sidebar-border data-[state=checked]:bg-primary dark:data-[state=checked]:bg-white data-[state=checked]:text-primary-foreground dark:data-[state=checked]:text-black" />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">
                        {ref.motherName}
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        {ref.initiatedAt}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
                          ref.riskFlag === 'High Risk' ? 'bg-red-500/10 text-red-500' : 
                          ref.riskFlag === 'Medium Risk' ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-green-500/10 text-green-500'
                        }`}>
                          {ref.riskFlag === 'High Risk' ? <Activity className="h-3 w-3" /> : ref.riskFlag === 'Medium Risk' ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {ref.riskFlag}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
                          ref.status === 'Accepted' ? 'bg-green-500/10 text-green-500' : 
                          ref.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {ref.status === 'Accepted' ? <CheckCircle2 className="h-3 w-3" /> : ref.status === 'Pending' ? <Clock className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                          {ref.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <a href={ref.recordLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{ref.recordLink}</a>
                          <Copy className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" onClick={(e) => { e.stopPropagation(); /* copy logic */ }} />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-foreground dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {ref.transferCode}
                          <Copy className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" onClick={(e) => { e.stopPropagation(); /* copy logic */ }} />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">
                        {ref.destination}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white group-hover:text-foreground dark:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Print Form</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md text-red-500 hover:!text-red-500 hover:!bg-red-500/10">Cancel Transfer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Desktop Pagination Footer */}
          <div className="hidden md:flex flex-row items-center justify-between text-xs text-muted-foreground gap-4">
            <div>0 of {MOCK_REFERRALS.length} row(s) selected.</div>
            
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

          {/* Mobile Card List */}
          <div className="flex md:hidden flex-col gap-4">
            {MOCK_REFERRALS.map((ref) => (
              <div 
                key={ref.id} 
                className={`flex flex-col p-4 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] gap-4 cursor-pointer transition-colors ${selectedReferral?.id === ref.id ? 'ring-1 ring-ring dark:ring-white/20' : 'hover:bg-accent dark:hover:bg-white/5'}`}
                onClick={() => setSelectedReferral(ref)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-foreground dark:text-white">{ref.motherName}</h3>
                    <span className="text-xs text-muted-foreground">{ref.initiatedAt}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
                      ref.riskFlag === 'High Risk' ? 'bg-red-500/10 text-red-500' : 
                      ref.riskFlag === 'Medium Risk' ? 'bg-amber-500/10 text-amber-500' : 
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {ref.riskFlag === 'High Risk' ? <Activity className="h-3 w-3" /> : ref.riskFlag === 'Medium Risk' ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                      {ref.riskFlag}
                    </div>
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
                      ref.status === 'Accepted' ? 'bg-green-500/10 text-green-500' : 
                      ref.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {ref.status === 'Accepted' ? <CheckCircle2 className="h-3 w-3" /> : ref.status === 'Pending' ? <Clock className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                      {ref.status}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Destination</span>
                    <span className="text-xs text-foreground dark:text-white text-right">{ref.destination}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Transfer Code</span>
                    <div className="flex items-center gap-2 text-xs font-mono text-foreground dark:text-white text-right">
                      {ref.transferCode}
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-sidebar-border">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Print Form</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md text-red-500 hover:!text-red-500 hover:!bg-red-500/10">Cancel Transfer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Desktop Floating Sidepeek Overlay */}
      {!isMobile && (
        <div 
          className={`fixed top-0 right-0 h-screen w-[100%] sm:w-[450px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${selectedReferral ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <ReferralSidepeek referral={selectedReferral} onClose={() => setSelectedReferral(null)} />
        </div>
      )}

      {/* Mobile Sidepeek Drawer (from underneath with drag-to-dismiss) */}
      {isMobile && (
        <Drawer open={!!selectedReferral} onOpenChange={(open) => !open && setSelectedReferral(null)}>
          <DrawerContent className="p-0 bg-background dark:bg-background dark:bg-[#0a0a0a] border-t border-sidebar-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden !h-[85dvh] flex flex-col focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Referral Details</DrawerTitle>
            </div>
            <ReferralSidepeek referral={selectedReferral} onClose={() => setSelectedReferral(null)} />
          </DrawerContent>
        </Drawer>
      )}

      <CreateReferralModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <ExportReferralModal open={isExportOpen} onOpenChange={setIsExportOpen} />
    </div>
  )
}
