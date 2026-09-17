import React, { useState, useMemo } from "react"
import { Search, Download, RefreshCw, PlusCircle, MoreVertical } from "lucide-react"
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

interface AppointmentsTabProps {
  appointmentList: any[]
  onViewRecord: (record: any) => void
  onEditRecord?: (record: any) => void
  onDeleteRecord?: (record: any) => void
  onNewRecord: () => void
  onRefresh: () => void
}

export const AppointmentsTab: React.FC<AppointmentsTabProps> = React.memo(({
  appointmentList,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  onNewRecord,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return appointmentList
    const q = searchQuery.toLowerCase()
    return appointmentList.filter((p: any) => {
      const type = (p.appointment_type || p.type || "").toLowerCase()
      const reason = (p.reason || "").toLowerCase()
      const status = (p.status || p.appointmentStatus || "").toLowerCase()
      const dateStr = p.appointment_date ? formatDate(p.appointment_date).toLowerCase() : ""
      return type.includes(q) || reason.includes(q) || status.includes(q) || dateStr.includes(q)
    })
  }, [appointmentList, searchQuery])

  const handleExportCSV = () => {
    if (filteredList.length === 0) return
    const headers = ["Date", "Time", "Type", "Reason", "Status"]
    const rows = filteredList.map((p: any) => [
      p.appointment_date ? formatDate(p.appointment_date) : "N/A",
      p.appointment_time || "N/A",
      p.appointment_type || p.type || "Prenatal Visit",
      `"${(p.reason || "N/A").replace(/"/g, '""')}"`,
      p.status || p.appointmentStatus || "Scheduled",
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `appointment_records_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status?: string) => {
    const s = (status || "scheduled").toLowerCase()
    let bgClass = "bg-blue-500/10 text-blue-500"
    if (s.includes("completed") || s.includes("done")) {
      bgClass = "bg-green-500/10 text-green-500"
    } else if (s.includes("cancel") || s.includes("missed")) {
      bgClass = "bg-red-500/10 text-red-500"
    } else if (s.includes("pending")) {
      bgClass = "bg-yellow-500/10 text-yellow-500"
    }
    return (
      <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none capitalize ${bgClass}`}>
        {status || "Scheduled"}
      </Badge>
    )
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
              placeholder="Search appointments..."
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
            New Appointment
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
        <div className="min-w-[900px]">
          <Table>
            <TableHeader className="bg-card dark:bg-[#111]">
              <TableRow className="border-sidebar-border hover:bg-transparent">
                <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4 py-2 h-9">Date & Time</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Type</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Reason</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Status</TableHead>
                <TableHead className="w-12 py-2 h-9"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                    No appointments recorded
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((p: any, i: number) => (
                  <TableRow
                    key={p.appointment_id || p._id || p.id || i}
                    className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => onViewRecord(p)}
                  >
                    <TableCell className="pl-4 text-xs font-medium text-foreground dark:text-white py-2">
                      {p.appointment_date
                        ? `${formatDate(p.appointment_date)} ${p.appointment_time || ""}`
                        : (p.appointmentDateTime ? formatDate(p.appointmentDateTime) : "N/A")}
                    </TableCell>
                    <TableCell className="text-xs text-foreground dark:text-white py-2">
                      {p.appointment_type || p.type || "Prenatal Visit"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">
                      {p.reason || "N/A"}
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      {getStatusBadge(p.status || p.appointmentStatus)}
                    </TableCell>
                    <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground dark:text-white hover:text-foreground">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                          <DropdownMenuItem onClick={() => onViewRecord(p)} className="text-xs cursor-pointer rounded-md">
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => (onEditRecord ? onEditRecord(p) : onViewRecord(p))} className="text-xs cursor-pointer rounded-md">
                            Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => (onDeleteRecord ? onDeleteRecord(p) : onViewRecord(p))}
                            className="text-xs cursor-pointer rounded-md text-red-500 focus:text-red-500"
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
    </div>
  )
})

AppointmentsTab.displayName = "AppointmentsTab"
