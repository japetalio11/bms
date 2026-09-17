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
  onViewRecord: (record: any) => void
  onEditRecord?: (record: any) => void
  onDeleteRecord?: (record: any) => void
  onNewRecord: () => void
  onRefresh: () => void
}

export const VisitationTab: React.FC<VisitationTabProps> = React.memo(
  ({
    visitationList,
    defaultRisk,
    onViewRecord,
    onEditRecord,
    onDeleteRecord,
    onNewRecord,
    onRefresh,
  }) => {
    const [searchQuery, setSearchQuery] = useState("")

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

    const handleExportCSV = () => {
      if (filteredList.length === 0) return
      const headers = [
        "Visit Date",
        "Trimester",
        "Blood Pressure",
        "Fetal Heart Tone",
        "Fundic Height",
        "Weight",
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

        return [
          formatDate(visit.visit_date),
          trimesterDisplay,
          bpDisplay,
          fetalHeart,
          fundicHeight,
          weightDisplay,
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

    return (
      <div className="mt-2 flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
            <div className="relative w-[200px]">
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search visitations..."
                className="h-8 border-sidebar-border bg-background pl-8 text-xs font-normal dark:bg-black"
              />
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 xl:w-auto">
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

        <div className="overflow-x-auto rounded-md border border-sidebar-border bg-background dark:bg-[#0a0a0a]">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader className="bg-card dark:bg-[#111]">
                <TableRow className="border-sidebar-border hover:bg-transparent">
                  <TableHead className="h-9 w-[15%] py-2 pl-4 text-xs font-medium text-foreground dark:text-white">
                    Visit Date
                  </TableHead>
                  <TableHead className="h-9 w-[10%] py-2 text-xs font-medium text-foreground dark:text-white">
                    Trimester
                  </TableHead>
                  <TableHead className="h-9 w-[15%] py-2 text-xs font-medium text-foreground dark:text-white">
                    Blood Pressure
                  </TableHead>
                  <TableHead className="h-9 w-[15%] py-2 text-xs font-medium text-foreground dark:text-white">
                    Fetal Heart Tone
                  </TableHead>
                  <TableHead className="h-9 w-[15%] py-2 text-xs font-medium text-foreground dark:text-white">
                    Fundic Height
                  </TableHead>
                  <TableHead className="h-9 w-[10%] py-2 text-xs font-medium text-foreground dark:text-white">
                    Weight
                  </TableHead>
                  <TableHead className="h-9 w-[15%] py-2 text-xs font-medium text-foreground dark:text-white">
                    Risk Level
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
                  filteredList.map((visit: any, i: number) => {
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

                    return (
                      <TableRow
                        key={visit.visit_id || visit.id || i}
                        className="cursor-pointer border-sidebar-border transition-colors hover:bg-accent dark:hover:bg-white/5"
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
                          {fetalHeart}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-foreground dark:text-white">
                          {fundicHeight}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-foreground dark:text-white">
                          {weightDisplay}
                        </TableCell>
                        <TableCell className="py-2">
                          <RiskBadge
                            risk={
                              visit.risk_level_assessed ||
                              visit.risk_level ||
                              defaultRisk
                            }
                          />
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
      </div>
    )
  }
)

VisitationTab.displayName = "VisitationTab"
