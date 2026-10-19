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

interface PrescriptionsTabProps {
  supplementList: any[]
  onViewRecord: (record: any) => void
  onEditRecord?: (record: any) => void
  onDeleteRecord?: (record: any) => void
  onNewRecord: () => void
  onRefresh: () => void
}

export const PrescriptionsTab: React.FC<PrescriptionsTabProps> = React.memo(
  ({
    supplementList,
    onViewRecord,
    onEditRecord,
    onDeleteRecord,
    onNewRecord,
    onRefresh,
  }) => {
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 5

    const filteredList = useMemo(() => {
      if (!searchQuery.trim()) return supplementList
      const q = searchQuery.toLowerCase()
      return supplementList.filter((sup: any) => {
        const type = (sup.supplement_type || "").toLowerCase()
        const notes = (sup.notes || sup.remarks || "").toLowerCase()
        const dateStr = sup.date_given
          ? formatDate(sup.date_given).toLowerCase()
          : ""
        return type.includes(q) || notes.includes(q) || dateStr.includes(q)
      })
    }, [supplementList, searchQuery])

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
        "Date Given",
        "Supplement Type",
        "Tablets Given",
        "Status",
        "Sync Status",
      ]
      const rows = filteredList.map((sup: any) => [
        formatDate(sup.date_given),
        `"${(sup.supplement_type || "N/A").replace(/"/g, '""')}"`,
        sup.tablets_given_count ?? "N/A",
        sup.is_completed ? "Completed" : "In Progress",
        sup.sync_status || "synced",
      ])
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute(
        "download",
        `prescription_records_${new Date().toISOString().slice(0, 10)}.csv`
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
                placeholder="Search prescriptions..."
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
              New Prescription
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:hidden">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-xs text-muted-foreground">No supplementation / medication records found</p>
              <Button
                onClick={onNewRecord}
                size="sm"
                className="mt-3 h-8 gap-1.5 text-xs bg-primary text-primary-foreground"
              >
                <PlusCircle className="h-3.5 w-3.5" /> New Prescription
              </Button>
            </div>
          ) : (
            paginatedList.map((sup: any, i: number) => (
              <div
                key={sup.supplement_id || sup.id || i}
                className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
                onClick={() => onViewRecord(sup)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {sup.supplement_type || "Supplement"}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(sup.date_given)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Badge
                      className={`inline-flex items-center rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${
                        sup.is_completed
                          ? "bg-green-500/10 text-green-600"
                          : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {sup.is_completed ? "Completed" : "In Progress"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                        <DropdownMenuItem onClick={() => onViewRecord(sup)} className="cursor-pointer text-xs">View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditRecord ? onEditRecord(sup) : onViewRecord(sup)} className="cursor-pointer text-xs">Edit Record</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteRecord ? onDeleteRecord(sup) : onViewRecord(sup)} className="cursor-pointer text-xs text-red-500 focus:text-red-500">Delete Record</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                    <span className="text-[10px] text-muted-foreground">Tablets / Dose</span>
                    <span className="font-semibold text-foreground">{sup.tablets_given_count ?? "N/A"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                    <span className="text-[10px] text-muted-foreground">Remarks</span>
                    <span className="font-medium text-foreground line-clamp-1">
                      {sup.notes || sup.remarks || "No instructions logged"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="h-9 py-2 pl-4 text-xs font-medium text-foreground">
                    Date Given
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground">
                    Supplement Type
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground">
                    Tablets Given
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground">
                    Status
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground">
                    Sync Status
                  </TableHead>
                  <TableHead className="h-9 w-12 py-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-xs text-muted-foreground"
                    >
                      No supplementation / medication records found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((sup: any, i: number) => (
                    <TableRow
                      key={sup.supplement_id || sup.id || i}
                      className="group cursor-pointer border-border transition-colors hover:bg-accent/50"
                      onClick={() => onViewRecord(sup)}
                    >
                      <TableCell className="py-2 pl-4 text-xs font-medium text-foreground dark:text-white">
                        {formatDate(sup.date_given)}
                      </TableCell>
                      <TableCell className="py-2 text-xs font-semibold text-foreground dark:text-white">
                        {sup.supplement_type || "N/A"}
                      </TableCell>
                      <TableCell className="py-2 text-xs text-foreground dark:text-white">
                        {sup.tablets_given_count ?? "N/A"} tabs
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${sup.is_completed ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}
                        >
                          {sup.is_completed ? "Completed" : "In Progress"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground capitalize">
                        {sup.sync_status || "synced"}
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
                              onClick={() => onViewRecord(sup)}
                              className="cursor-pointer rounded-md text-xs"
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onEditRecord
                                  ? onEditRecord(sup)
                                  : onViewRecord(sup)
                              }
                              className="cursor-pointer rounded-md text-xs"
                            >
                              Edit Record
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onDeleteRecord
                                  ? onDeleteRecord(sup)
                                  : onViewRecord(sup)
                              }
                              className="cursor-pointer rounded-md text-xs text-red-500 focus:text-red-500"
                            >
                              Delete Record
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

PrescriptionsTab.displayName = "PrescriptionsTab"
