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
import { Badge } from "@/components/ui/badge"
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

interface PregnancyTabProps {
  pregnancyList: any[]
  onViewRecord: (record: any) => void
  onEditRecord?: (record: any) => void
  onDeleteRecord?: (record: any) => void
  onNewRecord: () => void
  onRefresh: () => void
}

export const PregnancyTab: React.FC<PregnancyTabProps> = React.memo(
  ({
    pregnancyList,
    onViewRecord,
    onEditRecord,
    onDeleteRecord,
    onNewRecord,
    onRefresh,
  }) => {
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 5

    const calculateGAWeeks = (lmpDateStr?: string | Date) => {
      if (!lmpDateStr) return 0
      const lmp = new Date(lmpDateStr)
      if (isNaN(lmp.getTime())) return 0
      const diffTime = new Date().getTime() - lmp.getTime()
      const weeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000))
      return Math.max(0, weeks)
    }

    const calculateEDD = (lmpDateStr?: string | Date) => {
      if (!lmpDateStr) return "N/A"
      const lmp = new Date(lmpDateStr)
      if (isNaN(lmp.getTime())) return "N/A"
      const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000)
      return formatDate(edd)
    }

    const filteredList = useMemo(() => {
      if (!searchQuery.trim()) return pregnancyList
      const q = searchQuery.toLowerCase()
      return pregnancyList.filter((p: any) => {
        const g = `g${p.gravida ?? "0"} p${p.parity ?? "0"}`.toLowerCase()
        const status = (p.pregnancy_status || "active").toLowerCase()
        const lmp =
          p.lmp_date || p.lmp
            ? formatDate(p.lmp_date || p.lmp).toLowerCase()
            : ""
        return g.includes(q) || status.includes(q) || lmp.includes(q)
      })
    }, [pregnancyList, searchQuery])

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
        "Gravida",
        "Parity",
        "LMP",
        "EDD",
        "Gestational Age",
        "Maternal Height",
        "8 ANC Completed",
        "Status",
      ]
      const rows = filteredList.map((p: any) => {
        const lmpVal = p.lmp_date || p.lmp
        const gaWeeks = lmpVal
          ? calculateGAWeeks(lmpVal)
          : p.gestational_age_weeks || 0
        const eddVal = p.edd_date
          ? formatDate(p.edd_date)
          : lmpVal
            ? calculateEDD(lmpVal)
            : p.edd
              ? formatDate(p.edd)
              : "N/A"
        return [
          p.gravida ?? 0,
          p.parity ?? 0,
          lmpVal ? formatDate(lmpVal) : "N/A",
          eddVal,
          lmpVal || p.gestational_age_weeks != null ? `${gaWeeks} Weeks` : "N/A",
          p.height_cm ? `${p.height_cm} cm` : "N/A",
          p.completed_8anc ? "Yes" : "No",
          p.pregnancy_status || "Active",
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
        `pregnancy_records_${new Date().toISOString().slice(0, 10)}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    return (
      <div className="mt-2 flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pregnancy..."
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
              New Pregnancy
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:hidden">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-xs text-muted-foreground">No pregnancy history found</p>
              <Button
                onClick={onNewRecord}
                size="sm"
                className="mt-3 h-8 gap-1.5 text-xs bg-primary text-primary-foreground"
              >
                <PlusCircle className="h-3.5 w-3.5" /> New Pregnancy
              </Button>
            </div>
          ) : (
            paginatedList.map((p: any, i: number) => {
              const lmpVal = p.lmp_date || p.lmp
              const gaWeeks = lmpVal
                ? calculateGAWeeks(lmpVal)
                : p.gestational_age_weeks || 0
              const eddVal = p.edd_date
                ? formatDate(p.edd_date)
                : lmpVal
                  ? calculateEDD(lmpVal)
                  : p.edd
                    ? formatDate(p.edd)
                    : "N/A"
              const hasHighRisk =
                p.prev_caesarean ||
                p.consecutive_miscarriages ||
                p.stillbirth_history ||
                p.pph_history ||
                p.has_tb ||
                p.has_heart_disease ||
                p.has_diabetes ||
                p.has_asthma ||
                p.has_goiter

              return (
                <div
                  key={p.pregnancy_id || p.id || i}
                  className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
                  onClick={() => onViewRecord(p)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        G{p.gravida ?? "0"} P{p.parity ?? "0"}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {lmpVal ? `LMP: ${formatDate(lmpVal)}` : "LMP: N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Badge className="inline-flex items-center rounded-sm border-none bg-[#24a1de]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#24a1de] capitalize shadow-none">
                        {p.pregnancy_status || "Active"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                          <DropdownMenuItem onClick={() => onViewRecord(p)} className="cursor-pointer text-xs">View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditRecord ? onEditRecord(p) : onViewRecord(p)} className="cursor-pointer text-xs">Edit Record</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDeleteRecord ? onDeleteRecord(p) : onViewRecord(p)} className="cursor-pointer text-xs text-red-500 focus:text-red-500">Delete Record</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                      <span className="text-[10px] text-muted-foreground">Estimated Due Date</span>
                      <span className="font-medium text-foreground">{eddVal}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                      <span className="text-[10px] text-muted-foreground">Gestational Age</span>
                      <span className="font-medium text-foreground">
                        {lmpVal || p.gestational_age_weeks != null ? `${gaWeeks} Weeks` : "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                      <span className="text-[10px] text-muted-foreground">Maternal Height</span>
                      <span className="font-medium text-foreground">
                        {p.height_cm ? `${p.height_cm} cm` : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                      <span className="text-[10px] text-muted-foreground">Benchmarks</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {p.completed_8anc && (
                          <Badge className="border-none bg-emerald-500/10 text-[9px] text-emerald-600 px-1 py-0">
                            8 ANC Done
                          </Badge>
                        )}
                        {hasHighRisk && (
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[9px] text-amber-600 px-1 py-0">
                            High Risk
                          </Badge>
                        )}
                        {!p.completed_8anc && !hasHighRisk && (
                          <span className="text-muted-foreground text-[11px]">Standard</span>
                        )}
                      </div>
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
                  <TableHead className="h-9 py-2 pl-4 text-xs font-medium text-foreground">
                    Gravida / Parity
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground">
                    LMP
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground">
                    Estimated Due Date
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground">
                    Gestational Age
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground">
                    Height
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground">
                    Status & Benchmarks
                  </TableHead>
                  <TableHead className="h-9 w-12 py-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-xs text-muted-foreground"
                    >
                      No pregnancy history found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((p: any, i: number) => {
                    const lmpVal = p.lmp_date || p.lmp
                    const gaWeeks = lmpVal
                      ? calculateGAWeeks(lmpVal)
                      : p.gestational_age_weeks || 0
                    const eddVal = p.edd_date
                      ? formatDate(p.edd_date)
                      : lmpVal
                        ? calculateEDD(lmpVal)
                        : p.edd
                          ? formatDate(p.edd)
                          : "N/A"
                    const hasHighRisk =
                      p.prev_caesarean ||
                      p.consecutive_miscarriages ||
                      p.stillbirth_history ||
                      p.pph_history ||
                      p.has_tb ||
                      p.has_heart_disease ||
                      p.has_diabetes ||
                      p.has_asthma ||
                      p.has_goiter

                    return (
                      <TableRow
                        key={p.pregnancy_id || p.id || i}
                        className="group cursor-pointer border-border transition-colors hover:bg-accent/50"
                        onClick={() => onViewRecord(p)}
                      >
                        <TableCell className="py-2 pl-4 text-xs font-medium text-foreground dark:text-white">
                          G{p.gravida ?? "0"} P{p.parity ?? "0"}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-foreground dark:text-white">
                          {lmpVal ? formatDate(lmpVal) : "N/A"}
                        </TableCell>
                        <TableCell className="py-2 text-xs font-medium text-foreground dark:text-white">
                          {eddVal}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-foreground dark:text-white">
                          {lmpVal || p.gestational_age_weeks != null ? `${gaWeeks} Weeks` : "N/A"}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-foreground dark:text-white">
                          {p.height_cm ? `${p.height_cm} cm` : "—"}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-[#24a1de]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#24a1de] capitalize shadow-none">
                              {p.pregnancy_status || "Active"}
                            </Badge>
                            {p.completed_8anc && (
                              <Badge className="border-none bg-emerald-500/10 text-[10px] text-emerald-600">
                                8 ANC Done
                              </Badge>
                            )}
                            {hasHighRisk && (
                              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600">
                                High Risk
                              </Badge>
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
                                onClick={() => onViewRecord(p)}
                                className="cursor-pointer rounded-md text-xs"
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  onEditRecord
                                    ? onEditRecord(p)
                                    : onViewRecord(p)
                                }
                                className="cursor-pointer rounded-md text-xs"
                              >
                                Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  onDeleteRecord
                                    ? onDeleteRecord(p)
                                    : onViewRecord(p)
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

PregnancyTab.displayName = "PregnancyTab"
