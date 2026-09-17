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

interface PregnancyTabProps {
  pregnancyList: any[]
  onViewRecord: (record: any) => void
  onEditRecord?: (record: any) => void
  onDeleteRecord?: (record: any) => void
  onNewRecord: () => void
  onRefresh: () => void
}

export const PregnancyTab: React.FC<PregnancyTabProps> = React.memo(({
  pregnancyList,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  onNewRecord,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("")

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
      const lmp = p.lmp_date || p.lmp ? formatDate(p.lmp_date || p.lmp).toLowerCase() : ""
      return g.includes(q) || status.includes(q) || lmp.includes(q)
    })
  }, [pregnancyList, searchQuery])

  const handleExportCSV = () => {
    if (filteredList.length === 0) return
    const headers = ["Gravida", "Parity", "LMP", "EDD", "Gestational Age", "Status"]
    const rows = filteredList.map((p: any) => {
      const lmpVal = p.lmp_date || p.lmp
      const gaWeeks = lmpVal ? calculateGAWeeks(lmpVal) : (p.gestational_age_weeks || 0)
      const eddVal = lmpVal ? calculateEDD(lmpVal) : (p.edd ? formatDate(p.edd) : "N/A")
      return [
        p.gravida ?? 0,
        p.parity ?? 0,
        lmpVal ? formatDate(lmpVal) : "N/A",
        eddVal,
        gaWeeks > 0 ? `${gaWeeks} Weeks` : "N/A",
        p.pregnancy_status || "Active",
      ]
    })
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `pregnancy_records_${new Date().toISOString().slice(0, 10)}.csv`)
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
              placeholder="Search pregnancy..."
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
            New Pregnancy
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
        <div className="min-w-[900px]">
          <Table>
            <TableHeader className="bg-card dark:bg-[#111]">
              <TableRow className="border-sidebar-border hover:bg-transparent">
                <TableHead className="text-xs font-medium text-foreground dark:text-white pl-4 py-2 h-9">Gravida / Parity</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">LMP</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Estimated Due Date</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Gestational Age</TableHead>
                <TableHead className="text-xs font-medium text-foreground dark:text-white py-2 h-9">Status</TableHead>
                <TableHead className="w-12 py-2 h-9"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                    No pregnancy history found
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((p: any, i: number) => {
                  const lmpVal = p.lmp_date || p.lmp
                  const gaWeeks = lmpVal ? calculateGAWeeks(lmpVal) : (p.gestational_age_weeks || 0)
                  const eddVal = lmpVal ? calculateEDD(lmpVal) : (p.edd ? formatDate(p.edd) : "N/A")

                  return (
                    <TableRow
                      key={p.pregnancy_id || p.id || i}
                      className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => onViewRecord(p)}
                    >
                      <TableCell className="pl-4 text-xs font-medium text-foreground dark:text-white py-2">
                        G{p.gravida ?? "0"} P{p.parity ?? "0"}
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white py-2">
                        {lmpVal ? formatDate(lmpVal) : "N/A"}
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white py-2 font-medium">
                        {eddVal}
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white py-2">
                        {gaWeeks > 0 ? `${gaWeeks} Weeks` : "N/A"}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-[#24a1de]/10 text-[#24a1de] capitalize">
                          {p.pregnancy_status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
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
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
})

PregnancyTab.displayName = "PregnancyTab"
