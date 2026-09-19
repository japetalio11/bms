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
  CloudOff,
  Users,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"

export function TeamManagementPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { isOnline } = useNetworkStatus()

  const currentUser = useLiveQuery(() => db.userSession.get("current_user"))
  const currentUserId =
    currentUser?.user_id || currentUser?._id || currentUser?.id
  const currentUserRole = currentUser?.role || ""
  const isPrivilegedAdmin =
    currentUserRole === "Admin" || currentUserRole === "SystemAdmin"

  const fetchStaff = async () => {
    const cached = await userRepository.getLocalCachedStaff()
    if (cached.length > 0) {
      setStaffList(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    try {
      const data = await userRepository.getFacilityStaff()
      setStaffList(data)
    } catch (e) {
      console.error("[TeamManagementPage] Failed to fetch staff:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (targetStaff: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const targetId = targetStaff.user_id || targetStaff.id
    const isSelf = currentUserId && targetId === currentUserId
    const is_active = targetStaff.status !== "Active"

    if (!isSelf && !isPrivilegedAdmin) {
      toast.error(
        "You do not have permission to modify someone else's account."
      )
      return
    }

    if (
      !is_active &&
      (targetStaff.role === "Admin" ||
        targetStaff.position === "Administrator" ||
        targetStaff.position === "Admin")
    ) {
      const otherActiveAdmins = staffList.filter((s) => {
        const sId = s.user_id || s.id
        const sRole = s.role || s.position
        const isAdminRole = sRole === "Admin" || sRole === "Administrator"
        return sId !== targetId && isAdminRole && s.status === "Active"
      })

      if (otherActiveAdmins.length === 0) {
        toast.error(
          "Cannot deactivate account. There must be at least 1 active administrator per facility."
        )
        return
      }
    }

    try {
      await userRepository.updateStaffStatus(targetId, is_active)
      toast.success(
        `Staff account ${is_active ? "activated" : "deactivated"} successfully`
      )
      fetchStaff()

      if (isSelf && !is_active) {
        toast.info("You have deactivated your own account. Logging out...")
        setTimeout(async () => {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          await db.userSession.delete("current_user")
          navigate("/login")
        }, 1200)
      }
    } catch (e: any) {
      console.error("Failed to update status:", e)
      const errorMsg =
        e.response?.data?.error ||
        e.message ||
        "Failed to update account status"
      toast.error(errorMsg)
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

  const filteredStaff = staffList.filter((staff) => {
    if (activeTab === "active" && staff.status !== "Active") return false
    if (activeTab === "deactivated" && staff.status !== "Deactivated")
      return false
    if (activeTab === "pending" && staff.status !== "Pending") return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !staff.name.toLowerCase().includes(query) &&
        !staff.email.toLowerCase().includes(query) &&
        !staff.position.toLowerCase().includes(query)
      ) {
        return false
      }
    }

    return true
  })

  const [touchStartPos, setTouchStartPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const [touchEndPos, setTouchEndPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndPos(null)
    setTouchStartPos({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndPos({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const onTouchEndHandler = () => {
    if (!touchStartPos || !touchEndPos) return

    const distanceX = touchStartPos.x - touchEndPos.x
    const distanceY = Math.abs(touchStartPos.y - touchEndPos.y)

    if (
      Math.abs(distanceX) > distanceY &&
      Math.abs(distanceX) > minSwipeDistance
    ) {
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
    <div className="relative flex h-full w-full items-start overflow-hidden">
      <div
        className="relative flex h-full w-full min-w-0 flex-col overflow-y-auto text-foreground"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-background p-4 pr-4 pb-4 pl-3 md:border-none">
          <div className="-mb-2 w-full shrink-0 [scrollbar-width:none] overflow-x-auto pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full md:w-max"
            >
              <TabsList className="h-9 w-full justify-start gap-1 rounded-md border border-border bg-muted p-1 *:flex-1 md:w-max md:*:flex-initial">
                <TabsTrigger
                  value="all"
                  className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
                >
                  All Team Members
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
                >
                  Active
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
                >
                  Pending Invites
                </TabsTrigger>
                <TabsTrigger
                  value="deactivated"
                  className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
                >
                  Deactivated
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {!isOnline && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                Working Offline — Team member accounts created or updated
                locally will automatically sync once internet connection is
                restored.
              </span>
            </div>
          )}

          <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
              <Input
                placeholder="Filter staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full border-border bg-card px-2 text-xs font-normal text-card-foreground sm:w-[250px]"
              />
              {Object.entries({
                Role: ["Administrator", "Manager", "Coordinator", "Staff"],
                Sector: [
                  "Local Government Unit",
                  "NGO",
                  "Private Sector",
                  "Academe",
                ],
              }).map(([filterName, options]) => (
                <Popover key={filterName}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="hidden h-8 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent md:flex"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      {filterName}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="flex w-[200px] flex-col gap-3 p-3"
                    align="start"
                  >
                    <div className="flex flex-col gap-2.5">
                      {options.map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`filter-${filterName}-${option}`}
                            className="h-3.5 w-3.5 rounded-[4px] border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                          <label
                            htmlFor={`filter-${filterName}-${option}`}
                            className="cursor-pointer text-xs leading-none font-normal text-foreground"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                    <Button className="h-7 w-full bg-primary text-xs text-primary-foreground hover:bg-primary/90">
                      Clear Filter
                    </Button>
                  </PopoverContent>
                </Popover>
              ))}
            </div>
            <div className="flex w-full items-center gap-2 xl:w-auto">
              <Button
                onClick={fetchStaff}
                variant="outline"
                className="hidden h-8 gap-2 border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent md:flex"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <InviteTeamMemberModal onInviteSuccess={fetchStaff}>
                <Button className="h-8 gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Team Member
                </Button>
              </InviteTeamMemberModal>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 md:hidden">
            <span className="text-xs font-medium text-muted-foreground">
              Page 1 of 1
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 cursor-not-allowed border-border bg-transparent opacity-50"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 cursor-not-allowed border-border bg-transparent opacity-50"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 pr-4 pb-24 pl-3 md:pt-0 md:pb-4">
          {filteredStaff.length === 0 && (
            <div className="hidden flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center md:flex">
              <Users className="mb-3 h-8 w-8 text-muted-foreground opacity-50" />
              <h3 className="text-sm font-semibold text-card-foreground">
                No Team Members Found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                No team members match your current criteria. Invite a new team member to get started.
              </p>
              <InviteTeamMemberModal>
                <Button className="mt-4 h-8 bg-primary text-xs text-primary-foreground hover:bg-primary/90">
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite Team Member
                </Button>
              </InviteTeamMemberModal>
            </div>
          )}

          {filteredStaff.length > 0 && (
            <div className="hidden overflow-x-auto rounded-md border border-border bg-card md:block">
              <div className="min-w-[900px]">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-12 pl-4 text-center">
                      <Checkbox className="border-border" />
                    </TableHead>
                    <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                      Position
                    </TableHead>
                    <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                      Sector
                    </TableHead>
                    <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                      Email
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Loading team members...
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((staff) => (
                      <TableRow
                        key={staff.id}
                        className={`group cursor-pointer border-border transition-colors hover:bg-accent/50`}
                        onClick={() => navigate(`/dashboard/team/${staff.id}`)}
                      >
                        <TableCell className="pl-4">
                          <Checkbox className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                        </TableCell>
                        <TableCell className="text-xs font-medium whitespace-nowrap text-card-foreground">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                              {staff.avatar ? (
                                <img
                                  src={staff.avatar}
                                  alt={staff.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-card-foreground">
                                  {staff.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span>{staff.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <Badge
                              className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${
                                staff.status === "Active"
                                  ? "bg-green-500/10 text-green-500"
                                  : staff.status === "Pending"
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-zinc-500/10 text-zinc-500"
                              }`}
                            >
                              {staff.status === "Active" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : staff.status === "Pending" ? (
                                <Clock className="h-3 w-3" />
                              ) : (
                                <Activity className="h-3 w-3" />
                              )}
                              {staff.status}
                            </Badge>
                            {staff.sync_status &&
                              staff.sync_status !== "synced" && (
                                <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                                  <CloudOff className="h-2.5 w-2.5" /> Pending
                                  Sync
                                </span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-card-foreground">
                          <div className="w-fit rounded bg-muted px-1.5 py-0.5 text-[10px] whitespace-nowrap">
                            {staff.position}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-card-foreground">
                          {staff.sector}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-card-foreground">
                          {staff.email}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const targetId = staff.user_id || staff.id
                            const isSelf =
                              currentUserId && targetId === currentUserId
                            const canManage = isSelf || isPrivilegedAdmin
                            if (!canManage) return null

                            const isTargetAdmin =
                              staff.role === "Admin" ||
                              staff.position === "Administrator" ||
                              staff.position === "Admin"
                            const otherActiveAdminsCount = isTargetAdmin
                              ? staffList.filter((s) => {
                                  const sId = s.user_id || s.id
                                  const sRole = s.role || s.position
                                  const isAdminRole =
                                    sRole === "Admin" ||
                                    sRole === "Administrator"
                                  return (
                                    sId !== targetId &&
                                    isAdminRole &&
                                    s.status === "Active"
                                  )
                                }).length
                              : 999

                            const cannotDeactivateDueToAdminRule =
                              staff.status === "Active" &&
                              isTargetAdmin &&
                              otherActiveAdminsCount === 0

                            return (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-foreground hover:bg-accent"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-[160px] rounded-xl border-border shadow-md"
                                >
                                  {isPrivilegedAdmin && (
                                    <DropdownMenuItem
                                      className="cursor-pointer rounded-md text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        navigate(`/dashboard/team/${staff.id}`)
                                      }}
                                    >
                                      Edit Profile
                                    </DropdownMenuItem>
                                  )}
                                  {!cannotDeactivateDueToAdminRule && (
                                    <DropdownMenuItem
                                      className={`cursor-pointer rounded-md text-xs ${staff.status === "Active" ? "text-red-500 hover:!bg-red-500/10 hover:!text-red-500" : "text-green-500 hover:!bg-green-500/10 hover:!text-green-500"}`}
                                      onClick={(e) =>
                                        handleDeactivate(staff, e)
                                      }
                                    >
                                      {staff.status === "Active"
                                        ? isSelf
                                          ? "Self-Deactivate"
                                          : "Deactivate"
                                        : "Activate"}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )
                          })()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          )}

          <div className="hidden flex-row items-center justify-between gap-4 text-xs text-muted-foreground md:flex">
            <div>0 of {filteredStaff.length} row(s) selected.</div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <div className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1 transition-colors hover:bg-accent">
                  <span>10</span>
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span>Page 1 of 1</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 cursor-not-allowed border-border bg-transparent opacity-50"
                  >
                    <ChevronsLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 cursor-not-allowed border-border bg-transparent opacity-50"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 cursor-not-allowed border-border bg-transparent opacity-50"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 cursor-not-allowed border-border bg-transparent opacity-50"
                  >
                    <ChevronsRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:hidden">
            {filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center md:hidden">
                <Users className="mb-3 h-8 w-8 text-muted-foreground opacity-50" />
                <h3 className="text-sm font-semibold text-card-foreground">
                  No Team Members Found
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  No team members match your current criteria. Invite a new team member to get started.
                </p>
                <InviteTeamMemberModal>
                  <Button className="mt-4 h-8 bg-primary text-xs text-primary-foreground hover:bg-primary/90">
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite Team Member
                  </Button>
                </InviteTeamMemberModal>
              </div>
            ) : (
              filteredStaff.map((staff) => (
              <div
                key={staff.id}
                className={`flex cursor-pointer flex-col gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50`}
                onClick={() => navigate(`/dashboard/team/${staff.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                      {staff.avatar ? (
                        <img
                          src={staff.avatar}
                          alt={staff.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-card-foreground">
                          {staff.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-card-foreground">
                      {staff.name}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white ${
                        staff.status === "Active"
                          ? "border-[#22C55E]/20 bg-[#22C55E]"
                          : staff.status === "Pending"
                            ? "border-amber-500/20 bg-amber-500"
                            : "border-zinc-500/20 bg-zinc-500"
                      }`}
                    >
                      {staff.status}
                    </div>
                    {staff.sync_status && staff.sync_status !== "synced" && (
                      <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                        <CloudOff className="h-2.5 w-2.5" /> Pending Sync
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Position
                    </span>
                    <div className="w-fit rounded bg-muted px-1.5 py-0.5 text-[10px] whitespace-nowrap">
                      {staff.position}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Sector
                    </span>
                    <span className="text-right text-xs text-card-foreground">
                      {staff.sector}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <span className="text-right text-xs text-card-foreground">
                      {staff.email}
                    </span>
                  </div>
                </div>

                {(() => {
                  const targetId = staff.user_id || staff.id
                  const isSelf = currentUserId && targetId === currentUserId
                  const canManage = isSelf || isPrivilegedAdmin
                  if (!canManage) return null

                  const isTargetAdmin =
                    staff.role === "Admin" ||
                    staff.position === "Administrator" ||
                    staff.position === "Admin"
                  const otherActiveAdminsCount = isTargetAdmin
                    ? staffList.filter((s) => {
                        const sId = s.user_id || s.id
                        const sRole = s.role || s.position
                        const isAdminRole =
                          sRole === "Admin" || sRole === "Administrator"
                        return (
                          sId !== targetId &&
                          isAdminRole &&
                          s.status === "Active"
                        )
                      }).length
                    : 999

                  const cannotDeactivateDueToAdminRule =
                    staff.status === "Active" &&
                    isTargetAdmin &&
                    otherActiveAdminsCount === 0

                  return (
                    <div className="flex items-center justify-end border-t border-border pt-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-[160px] rounded-xl border-border shadow-md"
                        >
                          {isPrivilegedAdmin && (
                            <DropdownMenuItem
                              className="cursor-pointer rounded-md text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/dashboard/team/${staff.id}`)
                              }}
                            >
                              Edit Profile
                            </DropdownMenuItem>
                          )}
                          {!cannotDeactivateDueToAdminRule && (
                            <DropdownMenuItem
                              className={`cursor-pointer rounded-md text-xs ${staff.status === "Active" ? "text-red-500 hover:!bg-red-500/10 hover:!text-red-500" : "text-green-500 hover:!bg-green-500/10 hover:!text-green-500"}`}
                              onClick={(e) => handleDeactivate(staff, e as any)}
                            >
                              {staff.status === "Active"
                                ? isSelf
                                  ? "Self-Deactivate"
                                  : "Deactivate"
                                : "Activate"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })()}
              </div>
            )))}
          </div>
        </div>
      </div>
    </div>
  )
}
