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
  CloudOff,
  ExternalLink,
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
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { ReferralSidepeek } from "./ReferralSidepeek"
import { CreateReferralModal } from "./CreateReferralModal"
import { ExportReferralModal } from "./ExportReferralModal"
import {
  ReferralSuccessModal,
  type ReferralSuccessData,
} from "./ReferralSuccessModal"
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal"
import { referralRepository } from "@/lib/repositories/referralRepository"
import type { LocalReferral } from "@/lib/db/bmsDatabase"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { syncEngine } from "@/lib/sync/syncEngine"
import { extractRiskLevel } from "@/lib/riskUtils"
import { toast } from "sonner"

export function ReferralsPage() {
  const [activeTab, setActiveTab] = useState("today")
  const [referrals, setReferrals] = useState<LocalReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRiskFilters, setSelectedRiskFilters] = useState<string[]>([])
  const [selectedReferral, setSelectedReferral] =
    useState<LocalReferral | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [successData, setSuccessData] = useState<ReferralSuccessData | null>(
    null
  )
  const [copyNotification, setCopyNotification] = useState<string>("")
  const [referralToDelete, setReferralToDelete] =
    useState<LocalReferral | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isMobile = useIsMobile()
  const { isOnline } = useNetworkStatus()

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

  const handleDeleteReferral = async () => {
    if (!referralToDelete) return
    setIsDeleting(true)
    try {
      const id = referralToDelete.referral_id || referralToDelete.id
      await referralRepository.deleteReferral(id)
      toast.success("Referral deleted successfully")
      if (
        selectedReferral?.id === referralToDelete.id ||
        selectedReferral?.referral_id === id
      ) {
        setSelectedReferral(null)
      }
      setReferralToDelete(null)
      await loadReferrals()
    } catch (err) {
      console.error("[ReferralsPage] Failed to delete referral:", err)
      toast.error("Failed to delete referral")
    } finally {
      setIsDeleting(false)
    }
  }

  const currentUser = useMemo(() => {
    try {
      const userStr =
        typeof window !== "undefined" ? localStorage.getItem("user") : null
      return userStr ? JSON.parse(userStr) : null
    } catch {
      return null
    }
  }, [])
  const currentFacilityId = currentUser?.facility_id || currentUser?.facilityId

  const resolveRisk = (ref: LocalReferral) => {
    const calculated = extractRiskLevel(
      ref.pregnancy?.mother || ref,
      ref.pregnancy ? [ref.pregnancy] : [],
      ref.pregnancy?.prenatalVisits || []
    )
    if (calculated && calculated !== "Low Risk") return calculated
    return ref.pregnancy?.risk_flag || ref.riskFlag || calculated || "Low Risk"
  }

  const filteredReferrals = useMemo(() => {
    return referrals.filter((ref) => {
      const statusLower = (ref.status || "pending").toLowerCase()

      if (
        activeTab === "accepted" &&
        statusLower !== "accepted" &&
        statusLower !== "completed"
      ) {
        return false
      }
      if (activeTab === "pending" && statusLower !== "pending") {
        return false
      }
      if (
        activeTab === "in-transit" &&
        statusLower !== "in_transit" &&
        statusLower !== "in-transit" &&
        statusLower !== "transferred"
      ) {
        return false
      }
      if (
        activeTab === "admitted" &&
        statusLower !== "admitted" &&
        statusLower !== "completed"
      ) {
        return false
      }

      const risk = resolveRisk(ref)
      if (
        selectedRiskFilters.length > 0 &&
        !selectedRiskFilters.includes(risk)
      ) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const motherName = ref.pregnancy?.mother
          ? `${ref.pregnancy.mother.first_name || ""} ${ref.pregnancy.mother.last_name || ""}`.toLowerCase()
          : (ref.motherName || "").toLowerCase()
        const code = (ref.shared_pin || ref.transferCode || "").toLowerCase()
        const dest = (
          ref.toFacility?.facility_name ||
          ref.external_facility_name ||
          ref.destination ||
          ""
        ).toLowerCase()
        const reason = (ref.reason || "").toLowerCase()

        if (
          !motherName.includes(q) &&
          !code.includes(q) &&
          !dest.includes(q) &&
          !reason.includes(q)
        ) {
          return false
        }
      }

      return true
    })
  }, [referrals, activeTab, searchQuery, selectedRiskFilters])

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
    <div className="relative flex h-full w-full items-start overflow-hidden bg-background">
      {copyNotification && (
        <div className="fixed right-4 bottom-4 z-[100] rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background shadow-lg transition-all">
          {copyNotification}
        </div>
      )}

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
                  value="today"
                  className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
                >
                  Today's Queue
                </TabsTrigger>
                <TabsTrigger
                  value="accepted"
                  className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
                >
                  Accepted
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
                >
                  Pending
                </TabsTrigger>
                <TabsTrigger
                  value="in-transit"
                  className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
                >
                  In Transit
                </TabsTrigger>
                <TabsTrigger
                  value="admitted"
                  className="h-full rounded-sm border border-transparent px-2 py-1 text-xs font-medium transition-all"
                >
                  Admitted
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {!isOnline && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                Working Offline — Referrals created or updated locally will
                automatically sync with the server once internet connectivity is
                restored.
              </span>
            </div>
          )}

          <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search referrals..."
                className="h-8 w-full border-border bg-card px-2 text-xs font-normal text-card-foreground sm:w-[250px]"
              />

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden h-8 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent md:flex"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Risk Level{" "}
                    {selectedRiskFilters.length > 0
                      ? `(${selectedRiskFilters.length})`
                      : ""}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex w-[200px] flex-col gap-3 p-3"
                  align="start"
                >
                  <div className="flex flex-col gap-2.5">
                    {["High Risk", "Medium Risk", "Low Risk"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-risk-${option}`}
                          checked={selectedRiskFilters.includes(option)}
                          onCheckedChange={(checked) => {
                            if (checked)
                              setSelectedRiskFilters([
                                ...selectedRiskFilters,
                                option,
                              ])
                            else
                              setSelectedRiskFilters(
                                selectedRiskFilters.filter((r) => r !== option)
                              )
                          }}
                          className="h-3.5 w-3.5 rounded-[4px] border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                        <label
                          htmlFor={`filter-risk-${option}`}
                          className="cursor-pointer text-xs font-normal text-foreground"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedRiskFilters.length > 0 && (
                    <Button
                      onClick={() => setSelectedRiskFilters([])}
                      className="h-7 w-full bg-primary text-xs text-primary-foreground"
                    >
                      Clear Filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex w-full items-center gap-2 xl:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsExportOpen(true)}
                className="h-8 gap-2 border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                onClick={loadReferrals}
                className="h-8 gap-2 border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="h-8 gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Referral
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 pr-4 pb-24 pl-3 md:pt-0 md:pb-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading online
              referrals...
            </div>
          )}

          {!loading && filteredReferrals.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <FileSpreadsheet className="mb-3 h-8 w-8 text-muted-foreground opacity-50" />
              <h3 className="text-sm font-semibold text-card-foreground">
                No Referrals Found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                No active e-Referral transfers match your current filter
                criteria. Initiate a new inter-clinic referral to get started.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 h-8 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Initiate First Referral
              </Button>
            </div>
          )}

          {!loading && filteredReferrals.length > 0 && (
            <div className="hidden overflow-x-auto rounded-md border border-border bg-card md:block">
              <div className="min-w-[1100px]">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-12 pl-4 text-center">
                        <Checkbox
                          checked={
                            selectedRowIds.size === filteredReferrals.length &&
                            filteredReferrals.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                          className="border-border"
                        />
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                        Mother Name
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                        Initiated At
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                        Risk Flag
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                        Transfer Record Link
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                        Transfer Code
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                        Destination Facility
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReferrals.map((ref) => {
                      const motherUser = ref.pregnancy?.mother?.user
                      const motherName = motherUser
                        ? `${motherUser.first_name || ""} ${motherUser.last_name || ""}`.trim()
                        : ref.pregnancy?.mother?.first_name
                          ? `${ref.pregnancy.mother.first_name} ${ref.pregnancy.mother.last_name || ""}`.trim()
                          : ref.motherName || "Patient Record"
                      const initiatedAt = ref.date_referred
                        ? new Date(ref.date_referred).toLocaleString()
                        : ref.initiatedAt || "N/A"
                      const riskFlag = resolveRisk(ref)
                      const riskLower = riskFlag.toLowerCase()
                      const isHighRisk = riskLower.includes("high")
                      const isMedRisk =
                        riskLower.includes("med") ||
                        riskLower.includes("moderate")

                      const status = ref.status
                        ? ref.status.charAt(0).toUpperCase() +
                          ref.status.slice(1)
                        : "Pending"
                      const statusLower = (
                        ref.status || "pending"
                      ).toLowerCase()
                      const recordLink =
                        ref.secure_link || ref.recordLink || "N/A"
                      const transferCode =
                        ref.shared_pin || ref.transferCode || "N/A"
                      const destination =
                        ref.toFacility?.facility_name ||
                        ref.external_facility_name ||
                        ref.destination ||
                        "N/A"

                      const isOrigin = Boolean(
                        currentFacilityId &&
                        ref.from_facility_id === currentFacilityId
                      )
                      const isDestination =
                        currentUser?.role === "SystemAdmin" ||
                        Boolean(
                          currentFacilityId &&
                          ref.to_facility_id === currentFacilityId
                        )

                      return (
                        <TableRow
                          key={ref.id}
                          className={`group cursor-pointer border-border transition-colors ${selectedReferral?.id === ref.id ? "bg-accent" : "hover:bg-accent/50"}`}
                          onClick={() => setSelectedReferral(ref)}
                        >
                          <TableCell
                            className="pl-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedRowIds.has(ref.id)}
                              onCheckedChange={() => toggleSelectRow(ref.id)}
                              className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            />
                          </TableCell>
                          <TableCell className="text-xs font-medium whitespace-nowrap text-card-foreground">
                            <div className="flex items-center gap-2">
                              <span>{motherName}</span>
                              {isOrigin && (
                                <span className="rounded bg-blue-500/10 px-1 py-0.5 text-[9px] font-medium text-blue-600 dark:text-blue-400">
                                  Out
                                </span>
                              )}
                              {isDestination && !isOrigin && (
                                <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                                  In
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-card-foreground">
                            {initiatedAt}
                          </TableCell>
                          <TableCell>
                            <div
                              className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${
                                isHighRisk
                                  ? "bg-red-500/10 text-red-500"
                                  : isMedRisk
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-green-500/10 text-green-500"
                              }`}
                            >
                              {isHighRisk ? (
                                <Activity className="h-3 w-3" />
                              ) : isMedRisk ? (
                                <AlertTriangle className="h-3 w-3" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              {riskFlag}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <div
                                className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${
                                  statusLower === "accepted" ||
                                  statusLower === "completed"
                                    ? "bg-green-500/10 text-green-500"
                                    : statusLower === "pending"
                                      ? "bg-amber-500/10 text-amber-500"
                                      : statusLower === "rejected" ||
                                          statusLower === "cancelled"
                                        ? "bg-red-500/10 text-red-500"
                                        : "bg-blue-500/10 text-blue-500"
                                }`}
                              >
                                {statusLower === "accepted" ||
                                statusLower === "completed" ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : statusLower === "pending" ? (
                                  <Clock className="h-3 w-3" />
                                ) : (
                                  <Activity className="h-3 w-3" />
                                )}
                                {status}
                              </div>
                              {ref.sync_status &&
                                ref.sync_status !== "synced" && (
                                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                                    <CloudOff className="h-2.5 w-2.5" /> Pending
                                    Sync
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-card-foreground">
                            {recordLink !== "N/A" ? (
                              <div
                                className="flex max-w-[170px] items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <a
                                  href={recordLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={recordLink}
                                  className="inline-flex max-w-[130px] items-center gap-1 truncate rounded bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {recordLink.replace(
                                      /^https?:\/\/[^/]+/,
                                      ""
                                    ) || "View Link"}
                                  </span>
                                </a>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                                  title="Copy Referral Link"
                                  onClick={(e) =>
                                    handleCopyText(recordLink, "Link", e)
                                  }
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                N/A
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap text-card-foreground">
                            <div className="flex items-center gap-2">
                              {transferCode}
                              {transferCode !== "N/A" && (
                                <Copy
                                  className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                                  onClick={(e) =>
                                    handleCopyText(transferCode, "PIN Code", e)
                                  }
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-card-foreground">
                            {destination}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-foreground hover:bg-accent"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-[160px] rounded-xl border-border shadow-md"
                              >
                                <DropdownMenuItem
                                  onClick={() => setSelectedReferral(ref)}
                                  className="cursor-pointer rounded-md text-xs"
                                >
                                  View Details
                                </DropdownMenuItem>
                                {isDestination &&
                                  !isOrigin &&
                                  statusLower === "pending" && (
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        await referralRepository.respondToReferral(
                                          ref.referral_id || ref.id,
                                          { status: "accepted" }
                                        )
                                        loadReferrals()
                                      }}
                                      className="cursor-pointer rounded-md text-xs text-emerald-600 hover:!bg-emerald-500/10 hover:!text-emerald-600"
                                    >
                                      Accept Transfer
                                    </DropdownMenuItem>
                                  )}
                                {isOrigin && statusLower === "pending" && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      await referralRepository.respondToReferral(
                                        ref.referral_id || ref.id,
                                        { status: "cancelled" }
                                      )
                                      loadReferrals()
                                    }}
                                    className="cursor-pointer rounded-md text-xs text-amber-600 hover:!bg-amber-500/10 hover:!text-amber-600"
                                  >
                                    Cancel Transfer
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setReferralToDelete(ref)}
                                  className="cursor-pointer rounded-md text-xs text-red-500 hover:!bg-red-500/10 hover:!text-red-500"
                                >
                                  Delete Referral
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

          {!loading && filteredReferrals.length > 0 && (
            <div className="hidden flex-row items-center justify-between gap-4 text-xs text-muted-foreground md:flex">
              <div>
                {selectedRowIds.size} of {filteredReferrals.length} row(s)
                selected.
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <span>Total Items: {filteredReferrals.length}</span>
                </div>
              </div>
            </div>
          )}

          {!loading && filteredReferrals.length > 0 && (
            <div className="flex flex-col gap-4 md:hidden">
              {filteredReferrals.map((ref) => {
                const motherName = ref.pregnancy?.mother
                  ? `${ref.pregnancy.mother.first_name || ""} ${ref.pregnancy.mother.last_name || ""}`.trim()
                  : ref.motherName || "Patient Record"
                const initiatedAt = ref.date_referred
                  ? new Date(ref.date_referred).toLocaleString()
                  : ref.initiatedAt || "N/A"
                const riskFlag = resolveRisk(ref)
                const riskLower = riskFlag.toLowerCase()
                const isHighRisk = riskLower.includes("high")
                const isMedRisk =
                  riskLower.includes("med") || riskLower.includes("moderate")

                const status = ref.status
                  ? ref.status.charAt(0).toUpperCase() + ref.status.slice(1)
                  : "Pending"
                const statusLower = (ref.status || "pending").toLowerCase()
                const transferCode = ref.shared_pin || ref.transferCode || "N/A"
                const destination =
                  ref.toFacility?.facility_name ||
                  ref.external_facility_name ||
                  ref.destination ||
                  "N/A"

                const isOrigin = Boolean(
                  currentFacilityId &&
                  ref.from_facility_id === currentFacilityId
                )
                const isDestination =
                  currentUser?.role === "SystemAdmin" ||
                  Boolean(
                    currentFacilityId &&
                    ref.to_facility_id === currentFacilityId
                  )

                return (
                  <div
                    key={ref.id}
                    className={`flex cursor-pointer flex-col gap-4 rounded-xl border border-border bg-card p-4 transition-colors ${selectedReferral?.id === ref.id ? "ring-1 ring-ring" : "hover:bg-accent/50"}`}
                    onClick={() => setSelectedReferral(ref)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-card-foreground">
                            {motherName}
                          </h3>
                          {isOrigin && (
                            <span className="rounded bg-blue-500/10 px-1 py-0.5 text-[9px] font-medium text-blue-600 dark:text-blue-400">
                              Out
                            </span>
                          )}
                          {isDestination && !isOrigin && (
                            <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                              In
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {initiatedAt}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${
                            isHighRisk
                              ? "bg-red-500/10 text-red-500"
                              : isMedRisk
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-green-500/10 text-green-500"
                          }`}
                        >
                          {isHighRisk ? (
                            <Activity className="h-3 w-3" />
                          ) : isMedRisk ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {riskFlag}
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${
                            statusLower === "accepted" ||
                            statusLower === "completed"
                              ? "bg-green-500/10 text-green-500"
                              : statusLower === "pending"
                                ? "bg-amber-500/10 text-amber-500"
                                : statusLower === "rejected" ||
                                    statusLower === "cancelled"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          {statusLower === "accepted" ||
                          statusLower === "completed" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : statusLower === "pending" ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <Activity className="h-3 w-3" />
                          )}
                          {status}
                        </div>
                        {ref.sync_status && ref.sync_status !== "synced" && (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                            <CloudOff className="h-2.5 w-2.5" /> Pending Sync
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Destination
                        </span>
                        <span className="text-right text-xs text-card-foreground">
                          {destination}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Transfer Code
                        </span>
                        <div className="flex items-center gap-2 text-right font-mono text-xs text-card-foreground">
                          {transferCode}
                          {transferCode !== "N/A" && (
                            <Copy
                              className="h-3 w-3 cursor-pointer text-muted-foreground"
                              onClick={(e) =>
                                handleCopyText(transferCode, "PIN Code", e)
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-end border-t border-border pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-[160px] rounded-xl border-border shadow-md"
                        >
                          <DropdownMenuItem
                            onClick={() => setSelectedReferral(ref)}
                            className="cursor-pointer rounded-md text-xs"
                          >
                            View Details
                          </DropdownMenuItem>
                          {isDestination &&
                            !isOrigin &&
                            statusLower === "pending" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  await referralRepository.respondToReferral(
                                    ref.referral_id || ref.id,
                                    { status: "accepted" }
                                  )
                                  loadReferrals()
                                }}
                                className="cursor-pointer rounded-md text-xs text-emerald-600 hover:!bg-emerald-500/10 hover:!text-emerald-600"
                              >
                                Accept Transfer
                              </DropdownMenuItem>
                            )}
                          {isOrigin && statusLower === "pending" && (
                            <DropdownMenuItem
                              onClick={async () => {
                                await referralRepository.respondToReferral(
                                  ref.referral_id || ref.id,
                                  { status: "cancelled" }
                                )
                                loadReferrals()
                              }}
                              className="cursor-pointer rounded-md text-xs text-amber-600 hover:!bg-amber-500/10 hover:!text-amber-600"
                            >
                              Cancel Transfer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setReferralToDelete(ref)}
                            className="cursor-pointer rounded-md text-xs text-red-500 hover:!bg-red-500/10 hover:!text-red-500"
                          >
                            Delete Referral
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {!isMobile && (
        <div
          className={`fixed top-0 right-0 z-50 h-screen w-[100%] shadow-2xl transition-transform duration-300 ease-in-out sm:w-[450px] ${selectedReferral ? "translate-x-0" : "translate-x-full"}`}
        >
          <ReferralSidepeek
            referral={selectedReferral}
            onClose={() => setSelectedReferral(null)}
            onUpdated={loadReferrals}
            onDelete={(ref) => setReferralToDelete(ref)}
          />
        </div>
      )}

      {isMobile && (
        <Drawer
          open={!!selectedReferral}
          onOpenChange={(open) => !open && setSelectedReferral(null)}
        >
          <DrawerContent className="flex !h-[85dvh] flex-col overflow-hidden rounded-t-xl border-x-0 border-t border-b-0 border-border bg-card p-0 before:hidden focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Referral Details</DrawerTitle>
            </div>
            <ReferralSidepeek
              referral={selectedReferral}
              onClose={() => setSelectedReferral(null)}
              onUpdated={loadReferrals}
              onDelete={(ref) => setReferralToDelete(ref)}
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

      <ConfirmDeleteModal
        open={!!referralToDelete}
        onOpenChange={(open) => !open && setReferralToDelete(null)}
        title="Delete Referral"
        description="Are you sure you want to delete this referral record? It will be permanently removed from local storage and the database."
        confirmText="Delete"
        isDeleting={isDeleting}
        onConfirm={handleDeleteReferral}
      />
    </div>
  )
}
