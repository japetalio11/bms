import React, { useState, useMemo } from "react"
import { Search, Download, RefreshCw, PlusCircle, MoreVertical } from "lucide-react"
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

export const LaboratoryTab: React.FC<LaboratoryTabProps> = React.memo(({
  labRecordList,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  onNewRecord,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return labRecordList
    const q = searchQuery.toLowerCase()
    return labRecordList.filter((lab: any) => {
      const type = (lab.screening_type || "").toLowerCase()
      const result = (lab.result || "").toLowerCase()
      const remarks = (lab.remarks || "").toLowerCase()
      const dateStr = lab.date_of_screening ? formatDate(lab.date_of_screening).toLowerCase() : ""
      return type.includes(q) || result.includes(q) || remarks.includes(q) || dateStr.includes(q)
    })
  }, [labRecordList, searchQuery])

  const handleExportCSV = () => {
    if (filteredList.length === 0) return
    const headers = ["Date of Screening", "Screening Type", "Result", "Remarks", "Sync Status"]
    const rows = filteredList.map((lab: any) => [
      formatDate(lab.date_of_screening),
      `"${(lab.screening_type || "N/A").replace(/"/g, '""')}"`,
      `"${(lab.result || "N/A").replace(/"/g, '""')}"`,
      `"${(lab.remarks || "None").replace(/"/g, '""')}"`,
      lab.sync_status || "synced",
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `laboratory_records_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Control Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <div className="relative w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lab records..."
              className="h-8 pl-8 text-xs font-normal bg-background dark:bg-black border-sidebar-border"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
            className="h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:bg-accent dark:!bg-black dark:text-white dark:hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            onClick={onNewRecord}
            className="h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Laboratory Record
          </Button>
        </div>
      </div>

      {/* Table Container */}
      {filteredList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border border-sidebar-border rounded-xl bg-card dark:bg-[#111]">
          <p className="text-xs text-muted-foreground">No laboratory records found</p>
        </div>
      ) : (
        <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-[#0a0a0a]">
          <Table>
            <TableHeader className="bg-card dark:bg-[#111]">
              <TableRow className="border-sidebar-border hover:bg-transparent">
                <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4 py-2 h-9">Date of Screening</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Screening Type</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Result</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Remarks</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Sync Status</TableHead>
                <TableHead className="w-12 py-2 h-9"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((lab: any, i: number) => (
                <TableRow
                  key={lab.screening_id || lab.id || i}
                  className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => onViewRecord(lab)}
                >
                  <TableCell className="text-xs font-medium text-foreground dark:text-white pl-4 py-2">
                    {formatDate(lab.date_of_screening)}
                  </TableCell>
                  <TableCell className="text-xs text-foreground dark:text-white py-2 font-semibold">
                    {lab.screening_type || "N/A"}
                  </TableCell>
                  <TableCell className="text-xs text-foreground dark:text-white py-2">{lab.result || "N/A"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">{lab.remarks || "None"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2 capitalize">{lab.sync_status || "synced"}</TableCell>
                  <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground dark:text-white hover:text-foreground">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                        <DropdownMenuItem onClick={() => onViewRecord(lab)} className="text-xs cursor-pointer rounded-md">
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => (onEditRecord ? onEditRecord(lab) : onViewRecord(lab))} className="text-xs cursor-pointer rounded-md">
                          Edit Record
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => (onDeleteRecord ? onDeleteRecord(lab) : onViewRecord(lab))}
                          className="text-xs cursor-pointer rounded-md text-red-500 focus:text-red-500"
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
    </div>
  )
})

LaboratoryTab.displayName = "LaboratoryTab"
