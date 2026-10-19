import React, { useState, useMemo } from "react"
import {
  Search,
  Download,
  RefreshCw,
  PlusCircle,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { formatDate } from "@/lib/utils"
import { RiskBadge } from "./RiskBadge"

interface VisitationTabProps {
  visitationList: any[]
  defaultRisk?: string
  pregnancy?: any
  mother?: any
  onViewRecord: (record: any) => void
  onEditRecord?: (record: any) => void
  onDeleteRecord?: (record: any) => void
  onNewRecord: () => void
  onRefresh: () => void
  onOverrideRiskClick?: () => void
  onInitiateReferral?: () => void
}

export const VisitationTab: React.FC<VisitationTabProps> = React.memo(
  ({
    visitationList,
    defaultRisk,
    pregnancy,
    mother,
    onViewRecord,
    onEditRecord,
    onDeleteRecord,
    onNewRecord,
    onRefresh,
    onOverrideRiskClick,
    onInitiateReferral,
  }) => {
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 5

    const filteredList = useMemo(() => {
      if (!searchQuery.trim()) return visitationList
      const q = searchQuery.toLowerCase()
      return visitationList.filter((v: any) => {
        const dateStr = v.visit_date
          ? formatDate(v.visit_date).toLowerCase()
          : ""
        const bp =
          `${v.bp_systolic || ""}/${v.bp_diastolic || ""} ${v.blood_pressure || ""}`.toLowerCase()
        const notes = (v.notes || v.remarks || "").toLowerCase()
        const risk = (v.risk_level_assessed || v.risk_level || "").toLowerCase()
        return (
          dateStr.includes(q) ||
          bp.includes(q) ||
          notes.includes(q) ||
          risk.includes(q)
        )
      })
    }, [visitationList, searchQuery])

    const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))

    React.useEffect(() => {
      setCurrentPage(1)
    }, [searchQuery])

    const paginatedList = useMemo(() => {
      const start = (currentPage - 1) * pageSize
      return filteredList.slice(start, start + pageSize)
    }, [filteredList, currentPage, pageSize])

    const handleExportCSV = () => {
      if (filteredList.length === 0) return
      const headers = [
        "Visit Date",
        "Trimester",
        "Blood Pressure",
        "Fetal Heart Tone",
        "Fetal Presentation",
        "Fundic Height",
        "Weight",
        "Danger Signs",
        "Risk Level",
      ]
      const rows = filteredList.map((visit: any) => {
        const bpDisplay =
          visit.bp_systolic && visit.bp_diastolic
            ? `${visit.bp_systolic}/${visit.bp_diastolic} mmHg`
            : visit.blood_pressure || "N/A"
        const fetalHeart =
          (visit.fetal_heart_tone_bpm ?? visit.fetal_heart_rate)
            ? `${visit.fetal_heart_tone_bpm ?? visit.fetal_heart_rate} bpm`
            : "N/A"
        const fundicHeight =
          (visit.fundic_height_cm ?? visit.fundal_height)
            ? `${visit.fundic_height_cm ?? visit.fundal_height} cm`
            : "N/A"
        const weightDisplay =
          (visit.weight_kg ?? visit.weight)
            ? `${visit.weight_kg ?? visit.weight} kg`
            : "N/A"
        const trimesterDisplay = visit.trimester
          ? `${visit.trimester}${visit.trimester === 1 ? "st" : visit.trimester === 2 ? "nd" : "rd"} Trimester`
          : "N/A"
        const riskLevel =
          visit.risk_level_assessed ||
          visit.risk_level ||
          defaultRisk ||
          "Low Risk"

        const signs = []
        if (visit.has_vaginal_bleeding) signs.push("Bleeding")
        if (visit.has_pallor) signs.push("Pallor")
        if (visit.has_edema) signs.push("Edema")
        if (visit.has_fever) signs.push("Fever")

        return [
          formatDate(visit.visit_date),
          trimesterDisplay,
          bpDisplay,
          fetalHeart,
          visit.fetal_presentation || "Cephalic",
          fundicHeight,
          weightDisplay,
          signs.length > 0 ? signs.join(", ") : "None",
          riskLevel,
        ]
      })
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute(
        "download",
        `visitation_records_${new Date().toISOString().slice(0, 10)}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    const latestVisit = useMemo(() => {
      if (!visitationList || visitationList.length === 0) return null
      return [...visitationList].sort((a, b) => {
        const dateA = new Date(a.visit_date || 0).getTime()
        const dateB = new Date(b.visit_date || 0).getTime()
        if (dateA !== dateB) return dateB - dateA
        return (Number(b.visit_number) || 0) - (Number(a.visit_number) || 0)
      })[0]
    }, [visitationList])

    return (
      <div className="mt-2 flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search visitations..."
                className="h-8 border-sidebar-border bg-background pl-8 text-xs font-normal dark:bg-black"
              />
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="h-8 gap-2 border-sidebar-border !bg-background px-2 text-xs font-medium text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="outline"
              onClick={onRefresh}
              className="h-8 gap-2 border-sidebar-border !bg-background px-2 text-xs font-medium text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              onClick={onNewRecord}
              className="h-8 gap-2 bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-zinc-200 dark:bg-white dark:text-black"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Visitation
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:hidden">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-xs text-muted-foreground">No encounters recorded</p>
              <Button
                onClick={onNewRecord}
                size="sm"
                className="mt-3 h-8 gap-1.5 text-xs bg-primary text-primary-foreground"
              >
                <PlusCircle className="h-3.5 w-3.5" /> New Visitation
              </Button>
            </div>
          ) : (
            paginatedList.map((visit: any, i: number) => {
              const bpDisplay =
                visit.bp_systolic && visit.bp_diastolic
                  ? `${visit.bp_systolic}/${visit.bp_diastolic} mmHg`
                  : visit.blood_pressure || "N/A"

              const fetalHeart =
                (visit.fetal_heart_tone_bpm ?? visit.fetal_heart_rate)
                  ? `${visit.fetal_heart_tone_bpm ?? visit.fetal_heart_rate} bpm`
                  : "N/A"

              const fundicHeight =
                (visit.fundic_height_cm ?? visit.fundal_height)
                  ? `${visit.fundic_height_cm ?? visit.fundal_height} cm`
                  : "N/A"

              const weightDisplay =
                (visit.weight_kg ?? visit.weight)
                  ? `${visit.weight_kg ?? visit.weight} kg`
                  : "N/A"

              const trimesterDisplay = visit.trimester
                ? `${visit.trimester}${visit.trimester === 1 ? "st" : visit.trimester === 2 ? "nd" : "rd"} Trimester`
                : "N/A"

              const hasDangerSigns = Boolean(
                visit.has_vaginal_bleeding ||
                visit.has_pallor ||
                visit.has_edema ||
                visit.has_fever ||
                (visit.danger_signs_observed && visit.danger_signs_observed.trim())
              )

              return (
                <div
                  key={visit.visit_id || visit.id || i}
                  className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
                  onClick={() => onViewRecord(visit)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {formatDate(visit.visit_date)}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {trimesterDisplay}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <RiskBadge
                        risk={
                          visit.risk_level_assessed ||
                          visit.risk_level ||
                          defaultRisk
                        }
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                          <DropdownMenuItem onClick={() => onViewRecord(visit)} className="cursor-pointer text-xs">View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditRecord ? onEditRecord(visit) : onViewRecord(visit)} className="cursor-pointer text-xs">Edit Record</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDeleteRecord ? onDeleteRecord(visit) : onViewRecord(visit)} className="cursor-pointer text-xs text-red-500 focus:text-red-500">Delete Record</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                      <span className="text-[10px] text-muted-foreground">Blood Pressure</span>
                      <span className="font-semibold text-foreground">{bpDisplay}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                      <span className="text-[10px] text-muted-foreground">FHT & Presentation</span>
                      <span className="font-medium text-foreground">
                        {fetalHeart} • {visit.fetal_presentation || "Cephalic"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                      <span className="text-[10px] text-muted-foreground">Fundic Ht / Weight</span>
                      <span className="font-medium text-foreground">
                        {fundicHeight} / {weightDisplay}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                      <span className="text-[10px] text-muted-foreground">Signs & Symptoms</span>
                      {hasDangerSigns ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {visit.has_vaginal_bleeding && (
                            <span className="rounded-sm bg-red-500/10 px-1 py-0 text-[10px] font-medium text-red-600">
                              Bleeding
                            </span>
                          )}
                          {visit.has_pallor && (
                            <span className="rounded-sm bg-amber-500/10 px-1 py-0 text-[10px] font-medium text-amber-600">
                              Pallor
                            </span>
                          )}
                          {visit.has_edema && (
                            <span className="rounded-sm bg-amber-500/10 px-1 py-0 text-[10px] font-medium text-amber-600">
                              Edema
                            </span>
                          )}
                          {visit.has_fever && (
                            <span className="rounded-sm bg-red-500/10 px-1 py-0 text-[10px] font-medium text-red-600">
                              Fever
                            </span>
                          )}
                          {visit.danger_signs_observed && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {visit.danger_signs_observed}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">None reported</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="h-9 w-[15%] py-2 pl-4 text-xs font-medium text-foreground">
                    Visit Date
                  </TableHead>
                  <TableHead className="h-9 w-[10%] py-2 text-xs font-medium text-foreground">
                    Trimester
                  </TableHead>
                  <TableHead className="h-9 w-[15%] py-2 text-xs font-medium text-foreground">
                    Blood Pressure
                  </TableHead>
                  <TableHead className="h-9 w-[15%] py-2 text-xs font-medium text-foreground">
                    FHT & Presentation
                  </TableHead>
                  <TableHead className="h-9 w-[15%] py-2 text-xs font-medium text-foreground">
                    Fundic Height
                  </TableHead>
                  <TableHead className="h-9 w-[10%] py-2 text-xs font-medium text-foreground">
                    Weight
                  </TableHead>
                  <TableHead className="h-9 w-[15%] py-2 text-xs font-medium text-foreground">
                    Risk & Symptoms
                  </TableHead>
                  <TableHead className="h-9 w-12 py-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-xs text-muted-foreground"
                    >
                      No encounters recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((visit: any, i: number) => {
                    const bpDisplay =
                      visit.bp_systolic && visit.bp_diastolic
                        ? `${visit.bp_systolic}/${visit.bp_diastolic} mmHg`
                        : visit.blood_pressure || "N/A"

                    const fetalHeart =
                      (visit.fetal_heart_tone_bpm ?? visit.fetal_heart_rate)
                        ? `${visit.fetal_heart_tone_bpm ?? visit.fetal_heart_rate} bpm`
                        : "N/A"

                    const fundicHeight =
                      (visit.fundic_height_cm ?? visit.fundal_height)
                        ? `${visit.fundic_height_cm ?? visit.fundal_height} cm`
                        : "N/A"

                    const weightDisplay =
                      (visit.weight_kg ?? visit.weight)
                        ? `${visit.weight_kg ?? visit.weight} kg`
                        : "N/A"

                    const trimesterDisplay = visit.trimester
                      ? `${visit.trimester}${visit.trimester === 1 ? "st" : visit.trimester === 2 ? "nd" : "rd"} Trimester`
                      : "N/A"

                    const hasDangerSigns = Boolean(
                      visit.has_vaginal_bleeding ||
                      visit.has_pallor ||
                      visit.has_edema ||
                      visit.has_fever ||
                      (visit.danger_signs_observed && visit.danger_signs_observed.trim())
                    )

                    return (
                      <TableRow
                        key={visit.visit_id || visit.id || i}
                        className="group cursor-pointer border-border transition-colors hover:bg-accent/50"
                        onClick={() => onViewRecord(visit)}
                      >
                        <TableCell className="py-2 pl-4 text-xs font-medium text-foreground dark:text-white">
                          {formatDate(visit.visit_date)}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-foreground dark:text-white">
                          {trimesterDisplay}
                        </TableCell>
                        <TableCell className="py-2 text-xs font-medium text-foreground dark:text-white">
                          {bpDisplay}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-foreground dark:text-white">
                          <div>{fetalHeart}</div>
                          {visit.fetal_presentation && (
                            <span className="text-[10px] text-muted-foreground">
                              {visit.fetal_presentation}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-foreground dark:text-white">
                          {fundicHeight}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-foreground dark:text-white">
                          {weightDisplay}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col items-start gap-1">
                            <RiskBadge
                              risk={
                                visit.risk_level_assessed ||
                                visit.risk_level ||
                                defaultRisk
                              }
                            />
                            {hasDangerSigns && (
                              <span className="text-[10px] font-medium text-destructive">
                                Danger Signs
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          className="py-2 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-foreground hover:text-foreground dark:text-white"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-[160px] rounded-xl border-border shadow-md"
                            >
                              <DropdownMenuItem
                                onClick={() => onViewRecord(visit)}
                                className="cursor-pointer rounded-md text-xs"
                              >
                                View Consultation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  onEditRecord
                                    ? onEditRecord(visit)
                                    : onViewRecord(visit)
                                }
                                className="cursor-pointer rounded-md text-xs"
                              >
                                Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  onDeleteRecord
                                    ? onDeleteRecord(visit)
                                    : onViewRecord(visit)
                                }
                                className="cursor-pointer rounded-md text-xs text-red-500 focus:text-red-500"
                              >
                                Delete Record
                              </DropdownMenuItem>
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

        {filteredList.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredList.length)} of{" "}
              {filteredList.length} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span className="font-medium text-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }
)

VisitationTab.displayName = "VisitationTab"
