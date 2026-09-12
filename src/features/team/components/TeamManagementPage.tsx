import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { apiClient } from "@/lib/apiClient"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle2,
  Clock,
  Activity,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  PlusCircle,
  UserPlus,
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
import { Badge } from "@/components/ui/badge"
import { InviteTeamMemberModal } from "./InviteTeamMemberModal"
import { useIsMobile } from "@/hooks/use-mobile"
import { userRepository } from "@/lib/repositories/userRepository"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { syncEngine } from "@/lib/sync/syncEngine"

export function TeamManagementPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { isOnline } = useNetworkStatus()

  const fetchStaff = async () => {
    setLoading(true)
    try {
      const data = await userRepository.getFacilityStaff()
      setStaffList(data)
    } catch (e) {
      console.error("[TeamManagementPage] Failed to fetch staff:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (id: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const is_active = currentStatus !== "Active"
    try {
      await userRepository.updateStaffStatus(id, is_active)
      toast.success(`Staff account ${is_active ? 'activated' : 'deactivated'} successfully`)
      fetchStaff()
    } catch (e) {
      console.error("Failed to update status:", e)
      toast.error("Failed to update account status")
    }
  }

  useEffect(() => {
    fetchStaff()

    const unsubscribe = syncEngine.subscribe(() => {
      fetchStaff()
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (isOnline) {
      fetchStaff()
    }
  }, [isOnline])

  // Filter staffList based on activeTab and searchQuery
  const filteredStaff = staffList.filter((staff) => {
    // Tab filter
    if (activeTab === "active" && staff.status !== "Active") return false;
    if (activeTab === "deactivated" && staff.status !== "Deactivated") return false;
    if (activeTab === "pending" && staff.status !== "Pending") return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !staff.name.toLowerCase().includes(query) && 
        !staff.email.toLowerCase().includes(query) && 
        !staff.position.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    
    return true;
  })

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

      const tabs = ["all", "active", "pending", "deactivated"]
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
    <div className="relative flex items-start w-full h-full overflow-hidden">
      <div 
        className="flex flex-col w-full h-full text-foreground min-w-0 overflow-y-auto relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background p-4 pl-3 pr-4 pb-4 border-b md:border-none border-border">
          {/* Tabs */}
          <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-max">
              <TabsList className="bg-muted border border-border h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="all" className="text-xs font-medium border border-transparent rounded-sm px-2 py-1 h-full transition-all">All Team Members</TabsTrigger>
                <TabsTrigger value="active" className="text-xs font-medium border border-transparent rounded-sm px-2 py-1 h-full transition-all">Active</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs font-medium border border-transparent rounded-sm px-2 py-1 h-full transition-all">Pending Invites</TabsTrigger>
                <TabsTrigger value="deactivated" className="text-xs font-medium border border-transparent rounded-sm px-2 py-1 h-full transition-all">Deactivated</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Toolbar */}
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs border border-amber-500/20 font-medium">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>Working Offline — Team member accounts created or updated locally will automatically sync once internet connection is restored.</span>
            </div>
          )}

          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex w-full xl:w-auto flex-wrap items-center gap-2">
              <Input 
                placeholder="Filter staff..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 px-2 w-full sm:w-[250px] text-xs font-normal bg-card border-border text-card-foreground" 
              />
              {Object.entries({
                "Role": ["Administrator", "Manager", "Coordinator", "Staff"],
                "Sector": ["Local Government Unit", "NGO", "Private Sector", "Academe"]
              }).map(([filterName, options]) => (
                <Popover key={filterName}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-border border-dashed bg-card text-card-foreground hover:bg-accent">
                      <PlusCircle className="h-3.5 w-3.5" />
                      {filterName}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-3 flex flex-col gap-3" align="start">
                    <div className="flex flex-col gap-2.5">
                      {options.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox id={`filter-${filterName}-${option}`} className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-3.5 w-3.5 rounded-[4px]" />
                            <label htmlFor={`filter-${filterName}-${option}`} className="text-xs font-normal text-foreground leading-none cursor-pointer">
                              {option}
                            </label>
                          </div>
                        ))}
                    </div>
                    <Button className="h-7 text-xs w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Clear Filter
                    </Button>
                  </PopoverContent>
                </Popover>
              ))}
            </div>
            <div className="flex w-full xl:w-auto items-center gap-2">
              <Button onClick={fetchStaff} variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-border bg-card text-card-foreground hover:bg-accent">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <InviteTeamMemberModal onInviteSuccess={fetchStaff}>
                <Button className="h-8 text-xs font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Team Member
                </Button>
              </InviteTeamMemberModal>
            </div>
          </div>

          {/* Mobile Pagination (Sticky) */}
          <div className="md:hidden flex items-center justify-between pt-2 border-t border-border mt-2">
            <span className="text-xs text-muted-foreground font-medium">Page 1 of 1</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7 border-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 border-border bg-transparent opacity-50 cursor-not-allowed">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 md:pt-0 pl-3 pr-4 pb-24 md:pb-4">
          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-md border border-border overflow-x-auto bg-card">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-12 text-center pl-4">
                      <Checkbox className="border-border" />
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap">Name</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap">Position</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap">Sector</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap">Email</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading team members...
                      </TableCell>
                    </TableRow>
                  ) : filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No team members found.
                      </TableCell>
                    </TableRow>
                  ) : filteredStaff.map((staff) => (
                    <TableRow 
                      key={staff.id} 
                      className={`border-border cursor-pointer transition-colors group hover:bg-accent/50`}
                      onClick={() => navigate(`/dashboard/team/${staff.id}`)}
                    >
                      <TableCell className="pl-4">
                        <Checkbox className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-card-foreground whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded-full overflow-hidden bg-muted shrink-0">
                            {staff.avatar ? (
                              <img src={staff.avatar} alt={staff.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold text-card-foreground">
                                {staff.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span>{staff.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
                            staff.status === 'Active' ? 'bg-green-500/10 text-green-500' : 
                            staff.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 
                            'bg-zinc-500/10 text-zinc-500'
                          }`}>
                            {staff.status === 'Active' ? <CheckCircle2 className="h-3 w-3" /> : 
                             staff.status === 'Pending' ? <Clock className="h-3 w-3" /> : 
                             <Activity className="h-3 w-3" />}
                            {staff.status}
                          </Badge>
                          {staff.sync_status && staff.sync_status !== "synced" && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <CloudOff className="h-2.5 w-2.5" /> Pending Sync
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-card-foreground whitespace-nowrap">
                        <div className="w-fit bg-muted px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                          {staff.position}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-card-foreground whitespace-nowrap">
                        {staff.sector}
                      </TableCell>
                      <TableCell className="text-xs text-card-foreground whitespace-nowrap">
                        {staff.email}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-accent" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/team/${staff.id}`); }}>Edit Profile</DropdownMenuItem>
                            <DropdownMenuItem 
                              className={`text-xs cursor-pointer rounded-md ${staff.status === 'Active' ? 'text-red-500 hover:!text-red-500 hover:!bg-red-500/10' : 'text-green-500 hover:!text-green-500 hover:!bg-green-500/10'}`}
                              onClick={(e) => handleDeactivate(staff.id, staff.status, e)}
                            >
                              {staff.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
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
            <div>0 of {filteredStaff.length} row(s) selected.</div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <div className="flex items-center justify-between border border-border bg-card hover:bg-accent cursor-pointer rounded-md px-2 py-1 gap-2 transition-colors">
                  <span>10</span>
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span>Page 1 of 1</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7 border-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronsLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 border-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 border-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7 border-border bg-transparent opacity-50 cursor-not-allowed">
                    <ChevronsRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="flex md:hidden flex-col gap-4">
            {filteredStaff.map((staff) => (
              <div 
                key={staff.id} 
                className={`flex flex-col p-4 rounded-xl border border-border bg-card gap-4 cursor-pointer transition-colors hover:bg-accent/50`}
                onClick={() => navigate(`/dashboard/team/${staff.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                      {staff.avatar ? (
                        <img src={staff.avatar} alt={staff.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-card-foreground">
                          {staff.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-card-foreground">{staff.name}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white whitespace-nowrap border ${
                      staff.status === 'Active' ? 'bg-[#22C55E] border-[#22C55E]/20' : 
                      staff.status === 'Pending' ? 'bg-amber-500 border-amber-500/20' : 
                      'bg-zinc-500 border-zinc-500/20'
                    }`}>
                      {staff.status}
                    </div>
                    {staff.sync_status && staff.sync_status !== "synced" && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <CloudOff className="h-2.5 w-2.5" /> Pending Sync
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Position</span>
                    <div className="w-fit bg-muted px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                      {staff.position}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sector</span>
                    <span className="text-xs text-card-foreground text-right">{staff.sector}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <span className="text-xs text-card-foreground text-right">{staff.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-border">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/team/${staff.id}`); }}>Edit Profile</DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`text-xs cursor-pointer rounded-md ${staff.status === 'Active' ? 'text-red-500 hover:!text-red-500 hover:!bg-red-500/10' : 'text-green-500 hover:!text-green-500 hover:!bg-green-500/10'}`}
                        onClick={(e) => handleDeactivate(staff.id, staff.status, e as any)}
                      >
                        {staff.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>


    </div>
  )
}
