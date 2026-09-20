import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  UserCheck,
  Search,
  Check,
  UserX,
  Loader2,
  ShieldAlert,
} from "lucide-react"
import { apiClient } from "@/lib/apiClient"
import { mothersApi } from "../api"
import { toast } from "sonner"
import { clsx } from "clsx"

interface StaffMember {
  user_id: string
  first_name: string
  last_name: string
  middle_name?: string
  role: string
  email?: string
  phone_number?: string
  profile_url?: string
}

interface AssignStaffModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherId: string
  currentStaffId?: string | null
  currentStaffName?: string | null
  motherName?: string
  onSuccess?: () => void
}

export function AssignStaffModal({
  open,
  onOpenChange,
  motherId,
  currentStaffId,
  currentStaffName,
  motherName,
  onSuccess,
}: AssignStaffModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [staffList, setStaffList] = React.useState<StaffMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(
    currentStaffId || null
  )
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setSelectedStaffId(currentStaffId || null)
      setSearchQuery("")
      setError(null)
      fetchStaff()
    }
  }, [open, currentStaffId])

  const fetchStaff = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get("/api/v1/user/facility")
      const list = res.data?.result || res.data?.data || []
      const filtered = Array.isArray(list)
        ? list.filter((u: any) => u.role !== "Mother")
        : []
      setStaffList(filtered)
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to load facility healthcare staff."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!motherId) return
    setSubmitting(true)
    setError(null)

    try {
      const selectedStaff = staffList.find(
        (s) => s.user_id === selectedStaffId
      )
      await mothersApi.assignStaff(
        motherId,
        selectedStaffId || "",
        selectedStaff
      )

      if (selectedStaffId && selectedStaff) {
        const staffName = `${selectedStaff.first_name} ${selectedStaff.last_name}`
        toast.success(`Assigned to ${staffName}`)
      } else {
        toast.success("Assigned staff cleared")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Failed to update assigned staff."
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredStaff = React.useMemo(() => {
    if (!searchQuery.trim()) return staffList
    const q = searchQuery.toLowerCase()
    return staffList.filter((s) => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase()
      const role = (s.role || "").toLowerCase()
      const email = (s.email || "").toLowerCase()
      return name.includes(q) || role.includes(q) || email.includes(q)
    })
  }, [staffList, searchQuery])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Doctor":
        return (
          <Badge className="border-none bg-blue-500/10 text-[10px] font-medium text-blue-500 shadow-none">
            Doctor
          </Badge>
        )
      case "Midwife":
        return (
          <Badge className="border-none bg-purple-500/10 text-[10px] font-medium text-purple-500 shadow-none">
            Midwife
          </Badge>
        )
      case "Nurse":
        return (
          <Badge className="border-none bg-emerald-500/10 text-[10px] font-medium text-emerald-500 shadow-none">
            Nurse
          </Badge>
        )
      case "HealthWorker":
        return (
          <Badge className="border-none bg-amber-500/10 text-[10px] font-medium text-amber-500 shadow-none">
            Health Worker
          </Badge>
        )
      case "Admin":
      case "SystemAdmin":
        return (
          <Badge className="border-none bg-rose-500/10 text-[10px] font-medium text-rose-500 shadow-none">
            Admin
          </Badge>
        )
      default:
        return (
          <Badge className="border-none bg-muted text-[10px] font-medium text-muted-foreground shadow-none">
            {role}
          </Badge>
        )
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Assign Healthcare Worker"
      description={
        motherName
          ? `Select the primary healthcare staff responsible for ${motherName}.`
          : "Assign a primary staff provider to care for this mother."
      }
    >
      <div className="flex flex-col gap-4 py-1">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name or role..."
            className="h-8 border-border bg-card pr-3 pl-8 text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex max-h-[280px] flex-col gap-1.5 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
              <Loader2 className="mb-2 h-5 w-5 animate-spin text-primary" />
              Loading facility staff...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No healthcare staff members found.
            </div>
          ) : (
            <>
              {/* Unassigned Option */}
              <div
                onClick={() => setSelectedStaffId(null)}
                className={clsx(
                  "flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-all",
                  selectedStaffId === null
                    ? "border-primary/50 bg-primary/5 text-foreground ring-1 ring-primary/30"
                    : "border-border bg-card/60 hover:border-border/80 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserX className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">
                      Unassigned
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      No primary staff assigned
                    </span>
                  </div>
                </div>
                {selectedStaffId === null && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>

              {filteredStaff.map((staff) => {
                const isSelected = selectedStaffId === staff.user_id
                const isCurrent = currentStaffId === staff.user_id
                const fullName = `${staff.first_name} ${staff.last_name}`

                return (
                  <div
                    key={staff.user_id}
                    onClick={() => setSelectedStaffId(staff.user_id)}
                    className={clsx(
                      "flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-all",
                      isSelected
                        ? "border-primary/50 bg-primary/5 text-foreground ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-border/80 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0 border border-border">
                        <AvatarImage src={staff.profile_url} />
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {staff.first_name.charAt(0)}
                          {staff.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {fullName}
                          </span>
                          {getRoleBadge(staff.role)}
                          {isCurrent && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {staff.email || staff.phone_number || "No contact info"}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-8 text-xs font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAssign}
            disabled={submitting || loading}
            className="h-8 gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                Save Assignment
              </>
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
