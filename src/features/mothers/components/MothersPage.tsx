import { useState, useEffect, useMemo } from "react"
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
  Users,
  UserCheck,
  UserX,
} from "lucide-react"
import {
  extractRiskLevel,
  getRiskVariant,
  getRiskLabel,
  getRiskBadgeClasses,
} from "@/lib/riskUtils"

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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { UnifiedTableLoader } from "@/components/ui/unified-table-loader"
import { RegisterMotherModal } from "./RegisterMotherModal"
import { ConnectMotherModal } from "./ConnectMotherModal"
import { ExportMaternalDataModal } from "./ExportMaternalDataModal"
import { AssignStaffModal } from "./AssignStaffModal"
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal"
import { toast } from "sonner"
import { mothersApi } from "@/features/mothers/api/mothersApi"
import { formatDate } from "@/lib/utils"

export function MothersPage() {
  const navigate = useNavigate()
  const [motherList, setMotherList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRiskFilters, setSelectedRiskFilters] = useState<string[]>([])
  const [selectedBarangayFilters, setSelectedBarangayFilters] = useState<
    string[]
  >([])
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignModalMother, setAssignModalMother] = useState<any>(null)
  const [motherToDelete, setMotherToDelete] = useState<any>(null)
  const [isDeletingMother, setIsDeletingMother] = useState(false)

  const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null
  const currentUser = userStr ? JSON.parse(userStr) : null
  const isAdmin =
    currentUser?.role === "SystemAdmin" ||
    currentUser?.role === "Admin" ||
    currentUser?.role === "FacilityAdmin"

  const fetchMothers = async () => {
    setLoading(true)
    try {
      const facilityId =
        currentUser?.facility_id ||
        currentUser?.facility?.facility_id ||
        undefined
      const data = await mothersApi.getActiveMothers(facilityId)
      setMotherList(data)
    } catch (err) {
      console.error("Failed to fetch mothers:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMothers()

    const handleReconcile = () => {
      fetchMothers()
    }

    window.addEventListener("bms:temp-id-reconciled", handleReconcile)
    return () => {
      window.removeEventListener("bms:temp-id-reconciled", handleReconcile)
    }
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

  const displayedMothers = useMemo(() => {
    return motherList
      .map((m: any) => {
        const name =
          [
            m.user?.first_name || m.first_name,
            m.user?.middle_name || m.middle_name,
            m.user?.last_name || m.last_name,
          ]
            .filter(Boolean)
            .join(" ") ||
          m.name ||
          "Unknown"
        const currentPregnancy = m.pregnancies?.[0] || m.pregnancy
        const risk = extractRiskLevel(m, m.pregnancies, m.prenatalVisits)

        const lmpRaw = currentPregnancy?.lmp_date || currentPregnancy?.lmp
        const calculatedGA = lmpRaw
          ? calculateGAWeeks(lmpRaw)
          : currentPregnancy?.gestational_age_weeks || 0
        const gestationalAge = calculatedGA > 0 ? `${calculatedGA} Weeks` : "N/A"

        const eddVal = lmpRaw
          ? calculateEDD(lmpRaw)
          : currentPregnancy?.edd
            ? formatDate(currentPregnancy.edd)
            : "N/A"
        const station = m.user?.address || m.address || "N/A"

        const assignedWorker = m.assignedWorker || m.assigned_worker || null
        const assignedStaffName = assignedWorker?.first_name
          ? `${assignedWorker.first_name} ${assignedWorker.last_name || ""}`.trim()
          : m.assigned_worker_id
            ? "Assigned Staff"
            : "Unassigned"
        const assignedStaffRole = assignedWorker?.role || null

        return {
          id: m.id || m._id || m.mother_id || m.user_id,
          rawMother: m,
          name,
          risk,
          gestationalAge,
          edd: eddVal,
          station,
          assignedWorker,
          assignedStaffName,
          assignedStaffRole,
        }
      })
      .filter((m) => {
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase()
          const matchName = m.name.toLowerCase().includes(q)
          const matchStation = m.station.toLowerCase().includes(q)
          if (!matchName && !matchStation) return false
        }

        const mVariant = getRiskVariant(m.risk)

        if (activeTab === "high-risk") {
          if (mVariant !== "high") return false
        } else if (activeTab === "triage") {
          if (mVariant !== "none") return false
        } else if (activeTab === "postpartum") {
          const status =
            m.rawMother.pregnancies?.[0]?.pregnancy_status?.toLowerCase()
          if (status !== "postpartum" && status !== "delivered") return false
        }

        if (selectedRiskFilters.length > 0) {
          const match = selectedRiskFilters.some(
            (rf) => mVariant === getRiskVariant(rf)
          )
          if (!match) return false
        }

        if (selectedBarangayFilters.length > 0) {
          const match = selectedBarangayFilters.some((bg) =>
            m.station.toLowerCase().includes(bg.toLowerCase())
          )
          if (!match) return false
        }

        return true
      })
  }, [
    motherList,
    searchQuery,
    activeTab,
    selectedRiskFilters,
    selectedBarangayFilters,
  ])

  const getRiskBadge = (risk?: string | null) => {
    const variant = getRiskVariant(risk)
    const label = getRiskLabel(risk)
    const classes = getRiskBadgeClasses(risk)

    return (
      <Badge
        className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${classes.badge}`}
      >
        {variant === "high" ? (
          <Activity className="h-3 w-3" />
        ) : variant === "moderate" ? (
          <AlertTriangle className="h-3 w-3" />
        ) : variant === "low" ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <Activity className="h-3 w-3 opacity-60" />
        )}
        {label}
      </Badge>
    )
  }

  return (
    <div className="relative flex h-full w-full items-start overflow-hidden">
      <div className="relative flex h-full w-full min-w-0 flex-col overflow-y-auto text-foreground">
        <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-background p-4 pr-4 pb-4 pl-3 md:border-none">
          <div className="-mb-2 w-full shrink-0 [scrollbar-width:none] overflow-x-auto pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full md:w-max"
            >
              <TabsList className="h-9 w-full justify-start gap-1 rounded-lg border border-border bg-muted p-1 *:flex-1 md:w-max md:*:flex-initial">
                <TabsTrigger
                  value="all"
                  className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  All Mothers
                </TabsTrigger>
                <TabsTrigger
                  value="high-risk"
                  className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  High Risk Profiles
                </TabsTrigger>
                <TabsTrigger
                  value="triage"
                  className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  Pending Triage
                </TabsTrigger>
                <TabsTrigger
                  value="postpartum"
                  className="h-full rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  Postpartum
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
              <div className="flex w-full items-center gap-2 md:w-auto">
                <div className="relative w-full sm:w-[250px]">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search mothers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-full border-border bg-card pr-2 pl-8 text-xs font-normal"
                  />
                </div>
                <Button
                  onClick={() => setExportModalOpen(true)}
                  variant="outline"
                  className="h-8 shrink-0 gap-2 border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:hidden"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`hidden h-8 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex ${selectedRiskFilters.length > 0 ? "border-solid border-primary text-primary" : ""}`}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Risk Flag
                    {selectedRiskFilters.length > 0 && (
                      <span className="py-0.2 ml-1 rounded bg-primary/10 px-1 text-[10px] font-bold text-primary">
                        {selectedRiskFilters.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex w-[200px] flex-col gap-3 p-3"
                  align="start"
                >
                  <div className="flex flex-col gap-2.5">
                    {["Low Risk", "Moderate", "High Risk"].map((option) => {
                      const isChecked = selectedRiskFilters.includes(option)
                      return (
                        <div
                          key={option}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`filter-risk-${option}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRiskFilters((prev) => [
                                  ...prev,
                                  option,
                                ])
                              } else {
                                setSelectedRiskFilters((prev) =>
                                  prev.filter((item) => item !== option)
                                )
                              }
                            }}
                            className="h-3.5 w-3.5 rounded-[4px] border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                          <label
                            htmlFor={`filter-risk-${option}`}
                            className="cursor-pointer text-xs leading-none font-normal text-foreground"
                          >
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
                      className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear Filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`hidden h-8 gap-2 border-dashed border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex ${selectedBarangayFilters.length > 0 ? "border-solid border-primary text-primary" : ""}`}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Barangay / Address
                    {selectedBarangayFilters.length > 0 && (
                      <span className="py-0.2 ml-1 rounded bg-primary/10 px-1 text-[10px] font-bold text-primary">
                        {selectedBarangayFilters.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex w-[200px] flex-col gap-3 p-3"
                  align="start"
                >
                  <div className="flex flex-col gap-2.5">
                    {["San Vicente", "Bagumbayan", "Concepcion", "Iriga"].map(
                      (option) => {
                        const isChecked =
                          selectedBarangayFilters.includes(option)
                        return (
                          <div
                            key={option}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`filter-brgy-${option}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedBarangayFilters((prev) => [
                                    ...prev,
                                    option,
                                  ])
                                } else {
                                  setSelectedBarangayFilters((prev) =>
                                    prev.filter((item) => item !== option)
                                  )
                                }
                              }}
                              className="h-3.5 w-3.5 rounded-[4px] border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            />
                            <label
                              htmlFor={`filter-brgy-${option}`}
                              className="cursor-pointer text-xs leading-none font-normal text-foreground"
                            >
                              {option}
                            </label>
                          </div>
                        )
                      }
                    )}
                  </div>
                  {selectedBarangayFilters.length > 0 && (
                    <Button
                      onClick={() => setSelectedBarangayFilters([])}
                      variant="ghost"
                      className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear Filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex w-full items-center gap-2 xl:w-auto">
              <Button
                onClick={() => setExportModalOpen(true)}
                variant="outline"
                className="hidden h-8 gap-2 border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button
                onClick={fetchMothers}
                variant="outline"
                className="hidden h-8 gap-2 border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-muted md:flex"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                onClick={() => setConnectModalOpen(true)}
                variant="outline"
                className="h-8 w-full gap-2 border-border px-2 text-xs font-medium text-foreground hover:bg-muted md:w-auto"
              >
                <QrCode className="h-3.5 w-3.5" />
                Connect Mother (QR/Code)
              </Button>
              <Button
                onClick={() => setRegisterModalOpen(true)}
                className="h-8 w-full gap-2 bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 md:w-auto"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Register Mother
              </Button>
            </div>
          </div>

          <div className="mt-2 flex w-full items-center justify-between border-t border-sidebar-border pt-4 text-xs text-muted-foreground md:hidden">
            <span>Page 1 of 1</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 cursor-not-allowed border-sidebar-border bg-transparent opacity-50"
              >
                <ChevronsLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 cursor-not-allowed border-sidebar-border bg-transparent opacity-50"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 cursor-not-allowed border-sidebar-border bg-transparent opacity-50"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 cursor-not-allowed border-sidebar-border bg-transparent opacity-50"
              >
                <ChevronsRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 pr-4 pb-24 pl-3 md:pt-0 md:pb-4">
          <UnifiedTableLoader isLoading={loading} label="Loading mothers...">
            <div className="flex flex-col gap-4 md:hidden">
              {loading && displayedMothers.length === 0 ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={`mother-skel-card-${i}`}
                    className="flex flex-col gap-3 rounded-xl border border-sidebar-border bg-card p-4 dark:bg-black"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-16 rounded-sm" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))
              ) : displayedMothers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center md:hidden">
                  <Users className="mb-3 h-8 w-8 text-muted-foreground opacity-50" />
                  <h3 className="text-sm font-semibold text-card-foreground">
                    No Mothers Found
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    No records match your current criteria. Register a new mother to get started.
                  </p>
                  <Button
                    onClick={() => setRegisterModalOpen(true)}
                    className="mt-4 h-8 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Register Mother
                  </Button>
                </div>
              ) : (
                displayedMothers.map((mother: any) => (
                  <div
                    key={mother.id}
                    className="flex cursor-pointer flex-col gap-4 rounded-xl border border-sidebar-border bg-card p-4 transition-colors hover:border-foreground/20 dark:bg-black"
                    onClick={() => navigate(`/dashboard/mothers/${mother.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground dark:text-white">
                        {mother.name}
                      </h3>
                      {getRiskBadge(mother.risk)}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Gestational Age
                        </span>
                        <span className="text-xs font-medium text-foreground dark:text-white">
                          {mother.gestationalAge}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Estimated Due Date
                        </span>
                        <span className="text-xs font-medium text-foreground dark:text-white">
                          {mother.edd}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Address
                        </span>
                        <span className="text-xs font-medium text-foreground dark:text-white">
                          {mother.station}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Assigned Staff
                        </span>
                        <span className="text-xs font-medium text-foreground dark:text-white">
                          {mother.assignedStaffName !== "Unassigned" ? (
                            <span className="inline-flex items-center gap-1 text-primary">
                              <UserCheck className="h-3 w-3" />
                              {mother.assignedStaffName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {!loading && displayedMothers.length === 0 && (
              <div className="hidden flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center md:flex">
                <Users className="mb-3 h-8 w-8 text-muted-foreground opacity-50" />
                <h3 className="text-sm font-semibold text-card-foreground">
                  No Mothers Found
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  No records match your current criteria. Register a new mother to get started.
                </p>
                <Button
                  onClick={() => setRegisterModalOpen(true)}
                  className="mt-4 h-8 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                >
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Register Mother
                </Button>
              </div>
            )}

            {(loading || displayedMothers.length > 0) && (
              <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-xs md:block">
                <div className="min-w-[900px]">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-12 pl-4 text-center">
                        <Checkbox className="border-border" />
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                        Mother Name
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                        Risk Flag
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                        Gestational Age (Weeks)
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                        Estimated Due Date
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                        Address
                      </TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap text-foreground">
                        Assigned Staff
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && displayedMothers.length === 0 ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow
                          key={`mother-skel-${i}`}
                          className="border-border"
                        >
                          <TableCell className="pl-4">
                            <Skeleton className="h-4 w-4 rounded" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-20 rounded-sm" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-28" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-6 rounded-md" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      displayedMothers.map((mother: any) => (
                        <TableRow
                          key={mother.id}
                          className="group cursor-pointer border-border transition-colors hover:bg-muted/50"
                          onClick={() =>
                            navigate(`/dashboard/mothers/${mother.id}`)
                          }
                        >
                          <TableCell className="pl-4">
                            <Checkbox className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                          </TableCell>
                          <TableCell className="text-xs font-medium whitespace-nowrap text-foreground">
                            {mother.name}
                          </TableCell>
                          <TableCell>{getRiskBadge(mother.risk)}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-foreground">
                            {mother.gestationalAge}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-foreground">
                            {mother.edd}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-foreground">
                            {mother.station}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-foreground">
                            {mother.assignedStaffName !== "Unassigned" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                <UserCheck className="h-3 w-3" />
                                {mother.assignedStaffName}
                                {mother.assignedStaffRole && (
                                  <span className="opacity-70">({mother.assignedStaffRole})</span>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                <UserX className="h-3 w-3 opacity-60" />
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
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
                                <DropdownMenuLabel className="text-xs">
                                  Actions
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/dashboard/mothers/${mother.id}`)
                                  }
                                  className="cursor-pointer rounded-md text-xs"
                                >
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/dashboard/mothers/${mother.id}`)
                                  }}
                                  className="cursor-pointer rounded-md text-xs"
                                >
                                  Edit Profile
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setAssignModalMother(mother)
                                      setAssignModalOpen(true)
                                    }}
                                    className="cursor-pointer rounded-md text-xs text-primary focus:text-primary"
                                  >
                                    Assign Staff
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMotherToDelete(mother)
                                  }}
                                  className="cursor-pointer rounded-md text-xs text-destructive focus:text-destructive"
                                >
                                  Delete Profile
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
        )}
          </UnifiedTableLoader>

          <div className="mt-2 hidden flex-row items-center justify-between gap-4 text-xs text-muted-foreground md:flex">
            <div>0 of {displayedMothers.length} row(s) selected.</div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <div className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-sidebar-border bg-card px-2 py-1 transition-colors hover:bg-accent dark:bg-[#111] dark:hover:bg-[#222]">
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
                    className="h-7 w-7 cursor-not-allowed border-sidebar-border bg-transparent opacity-50"
                  >
                    <ChevronsLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 cursor-not-allowed border-sidebar-border bg-transparent opacity-50"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 cursor-not-allowed border-sidebar-border bg-transparent opacity-50"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 cursor-not-allowed border-sidebar-border bg-transparent opacity-50"
                  >
                    <ChevronsRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ExportMaternalDataModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        filteredMothers={displayedMothers}
        allMothers={motherList}
        currentFilterLabel={`${activeTab} (${displayedMothers.length})`}
      />
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
      <AssignStaffModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        motherId={assignModalMother?.id || assignModalMother?.mother_id || ""}
        motherName={assignModalMother?.name}
        currentStaffId={
          assignModalMother?.rawMother?.assigned_worker_id ||
          assignModalMother?.rawMother?.assignedWorker?.user_id ||
          assignModalMother?.assignedWorker?.user_id
        }
        currentStaffName={
          assignModalMother?.assignedStaffName !== "Unassigned"
            ? assignModalMother?.assignedStaffName
            : undefined
        }
        onSuccess={fetchMothers}
      />
      <ConfirmDeleteModal
        open={!!motherToDelete}
        onOpenChange={(open) => !open && setMotherToDelete(null)}
        title="Delete Mother Profile"
        description={`Are you sure you want to delete ${motherToDelete?.name || "this mother profile"}? This action will remove the record from your facility masterlist.`}
        isDeleting={isDeletingMother}
        onConfirm={async () => {
          if (!motherToDelete) return
          setIsDeletingMother(true)
          try {
            await mothersApi.deleteMother(motherToDelete.id)
            toast.success(`${motherToDelete.name || "Mother profile"} deleted`)
            setMotherToDelete(null)
            fetchMothers()
          } catch (err: any) {
            toast.error(
              err?.response?.data?.error ||
                err?.message ||
                "Failed to delete mother profile"
            )
          } finally {
            setIsDeletingMother(false)
          }
        }}
      />
    </div>
  )
}
