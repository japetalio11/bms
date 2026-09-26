import React, { useState, useMemo } from "react"
import {
  Search,
  Download,
  RefreshCw,
  PlusCircle,
  MoreVertical,
  Activity,
  HeartPulse,
  Scale,
  Calendar,
  CheckCircle2,
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

interface DeliveryNewbornTabProps {
  deliveryList: any[]
  newbornList: any[]
  postpartumList: any[]
  onViewRecord: (record: any) => void
  onEditRecord?: (record: any) => void
  onDeleteRecord?: (record: any) => void
  onNewRecord: () => void
  onRefresh: () => void
}

export const DeliveryNewbornTab: React.FC<DeliveryNewbornTabProps> = React.memo(
  ({
    deliveryList,
    newbornList,
    postpartumList,
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
      if (!searchQuery.trim()) return deliveryList
      const q = searchQuery.toLowerCase()
      return deliveryList.filter((d: any) => {
        const place = (d.place_of_delivery || "").toLowerCase()
        const mode = (d.mode_of_delivery || "").toLowerCase()
        const complications = (d.delivery_complications || "").toLowerCase()
        const dateStr = d.delivery_date ? formatDate(d.delivery_date).toLowerCase() : ""
        return (
          place.includes(q) ||
          mode.includes(q) ||
          complications.includes(q) ||
          dateStr.includes(q)
        )
      })
    }, [deliveryList, searchQuery])

    const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))

    React.useEffect(() => {
      setCurrentPage(1)
    }, [searchQuery])

    const paginatedDeliveries = useMemo(() => {
      const start = (currentPage - 1) * pageSize
      return filteredList.slice(start, start + pageSize)
    }, [filteredList, currentPage, pageSize])

    const getApgarBadgeStyle = (score: number) => {
      if (score >= 7) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      if (score >= 4) return "bg-amber-500/10 text-amber-600 border-amber-500/30"
      return "bg-rose-500/10 text-rose-600 border-rose-500/30"
    }

    const handleExportCSV = () => {
      if (filteredList.length === 0) return
      const headers = [
        "Delivery Date",
        "Place of Delivery",
        "Mode of Delivery",
        "Labor Duration (hrs)",
        "Blood Loss (mL)",
        "Newborns Count",
        "Complications",
      ]
      const rows = filteredList.map((d: any) => {
        const linkedNewborns =
          Array.isArray(d.newbornRecords) && d.newbornRecords.length > 0
            ? d.newbornRecords
            : newbornList.filter(
                (nb: any) =>
                  nb.delivery_id === d.delivery_id || nb.delivery_id === d.id
              )
        return [
          d.delivery_date ? formatDate(d.delivery_date) : "N/A",
          `"${(d.place_of_delivery || "").replace(/"/g, '""')}"`,
          `"${(d.mode_of_delivery || "").replace(/"/g, '""')}"`,
          d.duration_of_labor_hours ?? "N/A",
          d.blood_loss_ml ?? "N/A",
          linkedNewborns.length,
          `"${(d.delivery_complications || "None").replace(/"/g, '""')}"`,
        ]
      })

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `Delivery_Newborn_Records_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search delivery, place, mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs font-medium"
              onClick={handleExportCSV}
              disabled={filteredList.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs font-medium"
              onClick={onRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={onNewRecord}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Record Delivery
            </Button>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
            <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              No delivery records logged
            </h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {searchQuery
                ? "No delivery outcome matches your search criteria."
                : "No delivery or newborn birth record has been registered for this patient."}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 h-8 gap-1.5 text-xs font-medium"
              onClick={onNewRecord}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Record Delivery Outcome
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                    <TableHead className="w-[130px]">Delivery Date</TableHead>
                    <TableHead>Mode & Facility</TableHead>
                    <TableHead>Maternal Stats</TableHead>
                    <TableHead>Newborn Details</TableHead>
                    <TableHead>Complications</TableHead>
                    <TableHead className="w-[50px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDeliveries.map((d: any) => {
                    const linkedNewborns =
                      Array.isArray(d.newbornRecords) && d.newbornRecords.length > 0
                        ? d.newbornRecords
                        : newbornList.filter(
                            (nb: any) =>
                              nb.delivery_id === d.delivery_id || nb.delivery_id === d.id
                          )

                    return (
                      <TableRow
                        key={d.id || d.delivery_id}
                        className="cursor-pointer text-xs hover:bg-muted/40 transition-colors"
                        onClick={() => onViewRecord(d)}
                      >
                        <TableCell className="font-medium text-foreground whitespace-nowrap">
                          {d.delivery_date ? formatDate(d.delivery_date) : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">
                              {d.mode_of_delivery || "Normal Spontaneous (NSVD)"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {d.place_of_delivery || "Rural Health Unit"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5 text-muted-foreground text-[11px]">
                            <span>Labor: {d.duration_of_labor_hours ? `${d.duration_of_labor_hours} hrs` : "N/A"}</span>
                            <span>Loss: {d.blood_loss_ml ? `${d.blood_loss_ml} mL` : "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {linkedNewborns.length > 0 ? (
                              linkedNewborns.map((nb: any, idx: number) => (
                                <div
                                  key={nb.id || nb.newborn_id || idx}
                                  className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px]"
                                >
                                  <span className="font-medium text-foreground">
                                    {nb.sex} • {nb.birth_weight_kg} kg
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1 py-0 font-medium ${getApgarBadgeStyle(Number(nb.apgar_score || 0))}`}
                                  >
                                    APGAR {nb.apgar_score}
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-[11px]">
                                Newborn record registered
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-[11px] line-clamp-1 max-w-[180px]">
                            {d.delivery_complications || "None reported"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onViewRecord(d)}>
                                View Details
                              </DropdownMenuItem>
                              {onEditRecord && (
                                <DropdownMenuItem onClick={() => onEditRecord(d)}>
                                  Edit Record
                                </DropdownMenuItem>
                              )}
                              {onDeleteRecord && (
                                <DropdownMenuItem
                                  onClick={() => onDeleteRecord(d)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  Delete Record
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

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

            {newbornList.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  <span>Infant Birth Profiles ({newbornList.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {newbornList.map((nb: any, idx: number) => (
                    <div
                      key={nb.id || nb.newborn_id || idx}
                      className="flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            {nb.sex} Infant {newbornList.length > 1 ? `#${idx + 1}` : ""}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({nb.status_at_birth || "Live Birth"})
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-medium ${getApgarBadgeStyle(Number(nb.apgar_score || 0))}`}
                        >
                          APGAR {nb.apgar_score} / 10
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            Birth Weight
                          </span>
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Scale className="h-3 w-3 text-muted-foreground" />
                            {nb.birth_weight_kg} kg
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            Clinical Status
                          </span>
                          <span className="font-medium text-foreground">
                            {Number(nb.apgar_score) >= 7
                              ? "Reassuring"
                              : Number(nb.apgar_score) >= 4
                              ? "Depressed"
                              : "Critical"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)
