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

interface LaboratoryTabProps {
  labRecordList: any[]
  onViewRecord: (record: any) => void
  onEditRecord?: (record: any) => void
  onDeleteRecord?: (record: any) => void
  onNewRecord: () => void
  onRefresh: () => void
}

export const LaboratoryTab: React.FC<LaboratoryTabProps> = React.memo(
  ({
    labRecordList,
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
      if (!searchQuery.trim()) return labRecordList
      const q = searchQuery.toLowerCase()
      return labRecordList.filter((lab: any) => {
        const type = (lab.screening_type || "").toLowerCase()
        const result = (lab.result || "").toLowerCase()
        const remarks = (lab.remarks || "").toLowerCase()
        const dateStr = lab.date_of_screening
          ? formatDate(lab.date_of_screening).toLowerCase()
          : ""
        return (
          type.includes(q) ||
          result.includes(q) ||
          remarks.includes(q) ||
          dateStr.includes(q)
        )
      })
    }, [labRecordList, searchQuery])

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
        "Date of Screening",
        "Screening Type",
        "Result",
        "Remarks",
        "Sync Status",
      ]
      const rows = filteredList.map((lab: any) => [
        formatDate(lab.date_of_screening),
        `"${(lab.screening_type || "N/A").replace(/"/g, '""')}"`,
        `"${(lab.result || "N/A").replace(/"/g, '""')}"`,
        `"${(lab.remarks || "None").replace(/"/g, '""')}"`,
        lab.sync_status || "synced",
      ])
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute(
        "download",
        `laboratory_records_${new Date().toISOString().slice(0, 10)}.csv`
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
                placeholder="Search lab records..."
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
              New Laboratory Record
            </Button>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-sidebar-border bg-card p-8 text-center dark:bg-[#111]">
            <p className="text-xs text-muted-foreground">
              No laboratory records found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-sidebar-border bg-background dark:bg-[#0a0a0a]">
            <Table>
              <TableHeader className="bg-card dark:bg-[#111]">
                <TableRow className="border-sidebar-border hover:bg-transparent">
                  <TableHead className="h-9 py-2 pl-4 text-xs font-medium text-foreground dark:text-white">
                    Date of Screening
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground dark:text-white">
                    Screening Type
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground dark:text-white">
                    Result
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground dark:text-white">
                    Remarks
                  </TableHead>
                  <TableHead className="h-9 py-2 text-xs font-medium text-foreground dark:text-white">
                    Sync Status
                  </TableHead>
                  <TableHead className="h-9 w-12 py-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedList.map((lab: any, i: number) => (
                  <TableRow
                    key={lab.screening_id || lab.id || i}
                    className="cursor-pointer border-sidebar-border transition-colors hover:bg-accent dark:hover:bg-white/5"
                    onClick={() => onViewRecord(lab)}
                  >
                    <TableCell className="py-2 pl-4 text-xs font-medium text-foreground dark:text-white">
                      {formatDate(lab.date_of_screening)}
                    </TableCell>
                    <TableCell className="py-2 text-xs font-semibold text-foreground dark:text-white">
                      {lab.screening_type || "N/A"}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-foreground dark:text-white">
                      {lab.result || "N/A"}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      {lab.remarks || "None"}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground capitalize">
                      {lab.sync_status || "synced"}
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
                            onClick={() => onViewRecord(lab)}
                            className="cursor-pointer rounded-md text-xs"
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              onEditRecord
                                ? onEditRecord(lab)
                                : onViewRecord(lab)
                            }
                            className="cursor-pointer rounded-md text-xs"
                          >
                            Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              onDeleteRecord
                                ? onDeleteRecord(lab)
                                : onViewRecord(lab)
                            }
                            className="cursor-pointer rounded-md text-xs text-red-500 focus:text-red-500"
                          >
                            Delete Record
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredList.length > pageSize && (
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
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

LaboratoryTab.displayName = "LaboratoryTab"
