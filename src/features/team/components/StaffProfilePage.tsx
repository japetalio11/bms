import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import {
  ChevronLeft,
  MapPin,
  Building2,
  Mail,
  Phone,
  AlertTriangle,
  Search,
  Activity,
  FileText,
  UserPlus,
  CheckCircle2,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Shield,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Clock,
  Pencil,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { UploadStaffAvatarModal } from "./UploadStaffAvatarModal"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import {
  userRepository,
  type StaffActivityItem,
} from "@/lib/repositories/userRepository"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: [
    "mod1-create",
    "mod1-view",
    "mod2-log",
    "mod2-cdss",
    "mod2-rx",
    "mod3-out",
    "mod3-in",
    "mod4-export",
    "mod4-manage",
  ],
  Doctor: [
    "mod1-create",
    "mod1-view",
    "mod2-log",
    "mod2-cdss",
    "mod2-rx",
    "mod3-out",
    "mod3-in",
    "mod4-export",
  ],
  Midwife: [
    "mod1-create",
    "mod1-view",
    "mod2-log",
    "mod2-cdss",
    "mod2-rx",
    "mod3-out",
    "mod3-in",
  ],
  Nurse: [
    "mod1-create",
    "mod1-view",
    "mod2-log",
    "mod2-rx",
    "mod3-out",
    "mod3-in",
  ],
  HealthWorker: ["mod1-create", "mod1-view", "mod2-log", "mod3-in"],
}

function formatActivityDate(dateInput?: string | Date | number | null): string {
  if (!dateInput) return "Recently"
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return "Recently"

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date)

  if (isToday) {
    return `Today, ${timeStr}`
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`
  }

  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)

  return `${dateStr}, ${timeStr}`
}

export function StaffProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [staff, setStaff] = useState<any>(null)
  const [allFacilityStaff, setAllFacilityStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const [isConfirmStatusModalOpen, setIsConfirmStatusModalOpen] =
    useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  const [activities, setActivities] = useState<StaffActivityItem[]>([])
  const [activitySearch, setActivitySearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activityPage, setActivityPage] = useState(1)
  const [hasMoreActivities, setHasMoreActivities] = useState(false)
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false)

  const currentUser = useLiveQuery(() => db.userSession.get("current_user"))
  const currentUserId =
    currentUser?.user_id || currentUser?._id || currentUser?.id
  const currentUserRole = currentUser?.role || ""
  const isPrivilegedAdmin =
    currentUserRole === "Admin" || currentUserRole === "SystemAdmin"
  const isSelf = Boolean(
    currentUserId &&
    id &&
    (id === currentUserId ||
      staff?.user_id === currentUserId ||
      staff?.id === currentUserId)
  )
  const canModifyRole = isPrivilegedAdmin

  const isTargetAdmin =
    staff?.role === "Admin" ||
    staff?.position === "Administrator" ||
    staff?.position === "Admin"
  const otherActiveAdminsCount = isTargetAdmin
    ? allFacilityStaff.filter((s) => {
        const sId = s.user_id || s.id
        const sRole = s.role || s.position
        const isAdminRole = sRole === "Admin" || sRole === "Administrator"
        return sId !== id && isAdminRole && s.status === "Active"
      }).length
    : 999

  const cannotDeactivateDueToAdminRule = Boolean(
    staff?.is_active && isTargetAdmin && otherActiveAdminsCount === 0
  )
  const canDeactivate =
    (isSelf || isPrivilegedAdmin) && !cannotDeactivateDueToAdminRule

  const fetchStaffDetails = async () => {
    if (!id) return
    try {
      const cachedStaff = await userRepository.getLocalCachedStaff()
      const localMatch = cachedStaff.find(
        (u) => u.id === id || u.user_id === id
      )
      if (localMatch) {
        setStaff(localMatch)
        const staffRole =
          localMatch.role || localMatch.position || "HealthWorker"
        setRole(staffRole)
        setSelectedPermissions(
          ROLE_PERMISSIONS[staffRole] || ROLE_PERMISSIONS["HealthWorker"]
        )
        setAllFacilityStaff(cachedStaff)
        setLoading(false)
      } else {
        setLoading(true)
      }

      const [data, facilityStaff] = await Promise.all([
        userRepository.getStaffProfile(id),
        userRepository.getFacilityStaff(),
      ])
      if (data) {
        setStaff(data)
        const staffRole = data.role || data.position || "HealthWorker"
        setRole(staffRole)
        setSelectedPermissions(
          ROLE_PERMISSIONS[staffRole] || ROLE_PERMISSIONS["HealthWorker"]
        )
      }
      if (facilityStaff) {
        setAllFacilityStaff(facilityStaff)
      }
    } catch (error) {
      console.error("[StaffProfilePage] Failed to fetch staff details:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchStaffDetails()
    }
  }, [id])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(activitySearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [activitySearch])

  const fetchActivities = useCallback(
    async (pageToFetch: number, search: string, reset: boolean) => {
      if (!id) return
      try {
        if (reset) {
          setIsLoadingActivities(true)
        } else {
          setIsLoadingMoreActivities(true)
        }

        const res = await userRepository.getStaffActivities(id, {
          search: search || undefined,
          page: pageToFetch,
          limit: 8,
        })

        if (reset) {
          setActivities(res.activities)
        } else {
          setActivities((prev) => [...prev, ...res.activities])
        }
        setHasMoreActivities(res.hasMore)
        setActivityPage(pageToFetch)
      } catch (err) {
        console.error(
          "[StaffProfilePage] Failed to fetch staff activities:",
          err
        )
      } finally {
        setIsLoadingActivities(false)
        setIsLoadingMoreActivities(false)
      }
    },
    [id]
  )

  useEffect(() => {
    if (id) {
      fetchActivities(1, debouncedSearch, true)
    }
  }, [id, debouncedSearch, fetchActivities])

  const handleLoadMoreActivities = () => {
    if (hasMoreActivities && !isLoadingMoreActivities) {
      fetchActivities(activityPage + 1, debouncedSearch, false)
    }
  }

  const handleRoleChange = (newRole: string) => {
    setRole(newRole)
    if (ROLE_PERMISSIONS[newRole]) {
      setSelectedPermissions(ROLE_PERMISSIONS[newRole])
    }
  }

  const handleTogglePermission = (permId: string) => {
    if (!canModifyRole) return
    setSelectedPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId]
    )
  }

  const handleSavePermissions = async () => {
    if (!id) return
    if (!canModifyRole) {
      toast.error("Only administrators can modify roles or permissions.")
      return
    }

    try {
      setIsSavingPermissions(true)
      await userRepository.updateStaffRole(id, role)
      toast.success("Role and permissions updated successfully")
      fetchStaffDetails()
      fetchActivities(1, debouncedSearch, true)
    } catch (error: any) {
      console.error("Failed to update role:", error)
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to update permissions"
      toast.error(errorMsg)
    } finally {
      setIsSavingPermissions(false)
    }
  }

  const handleDiscardPermissions = () => {
    if (staff) {
      const staffRole = staff.role || staff.position || "HealthWorker"
      setRole(staffRole)
      setSelectedPermissions(
        ROLE_PERMISSIONS[staffRole] || ROLE_PERMISSIONS["HealthWorker"]
      )
    }
  }

  const handleOpenPasswordModal = () => {
    setNewPassword("")
    setConfirmPassword("")
    setShowPassword(false)
    setCopiedPassword(false)
    setIsPasswordModalOpen(true)
  }

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%"
    let gen = ""
    for (let i = 0; i < 10; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(gen)
    setConfirmPassword(gen)
    navigator.clipboard
      .writeText(gen)
      .then(() => {
        setCopiedPassword(true)
        setTimeout(() => setCopiedPassword(false), 2000)
        toast.info("Generated password copied to clipboard")
      })
      .catch(() => {
        toast.info("Generated password set in input fields")
      })
  }

  const handleAdminResetPassword = async () => {
    if (!id || !staff) return
    if (!newPassword || newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters long.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    try {
      setIsResettingPassword(true)
      await userRepository.adminResetPassword(id, newPassword.trim())
      toast.success(
        `Password successfully reset for ${staff.first_name} ${staff.last_name}`
      )
      setIsPasswordModalOpen(false)
      setNewPassword("")
      setConfirmPassword("")
      fetchActivities(1, debouncedSearch, true)
    } catch (err: any) {
      console.error("Failed to reset password:", err)
      const errorMsg =
        err.response?.data?.error || err.message || "Failed to reset password"
      toast.error(errorMsg)
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleOpenStatusModal = () => {
    if (cannotDeactivateDueToAdminRule) {
      toast.error(
        "Cannot deactivate account. There must be at least 1 active administrator per facility."
      )
      return
    }
    setIsConfirmStatusModalOpen(true)
  }

  const handleConfirmStatusChange = async () => {
    if (!staff || !id) return
    const is_active = !staff.is_active

    if (
      !is_active &&
      (staff.role === "Admin" ||
        staff.position === "Administrator" ||
        staff.position === "Admin")
    ) {
      const allStaff = await userRepository.getFacilityStaff()
      const otherActiveAdmins = allStaff.filter((s) => {
        const sId = s.user_id || s.id
        const sRole = s.role || s.position
        const isAdminRole = sRole === "Admin" || sRole === "Administrator"
        return sId !== id && isAdminRole && s.status === "Active"
      })

      if (otherActiveAdmins.length === 0) {
        toast.error(
          "Cannot deactivate account. There must be at least 1 active administrator per facility."
        )
        setIsConfirmStatusModalOpen(false)
        return
      }
    }

    try {
      setIsUpdatingStatus(true)
      await userRepository.updateStaffStatus(id, is_active)
      toast.success(
        `Staff account ${is_active ? "activated" : "deactivated"} successfully`
      )
      setIsConfirmStatusModalOpen(false)
      fetchStaffDetails()
      fetchActivities(1, debouncedSearch, true)

      if (isSelf && !is_active) {
        toast.info("You have deactivated your own account. Logging out...")
        setTimeout(async () => {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          await db.userSession.delete("current_user")
          navigate("/login")
        }, 1200)
      }
    } catch (error: any) {
      console.error("Failed to update status:", error)
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to update account status"
      toast.error(errorMsg)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const renderActivityIcon = (iconType: string) => {
    switch (iconType) {
      case "activity":
        return <Activity className="h-3 w-3 text-primary" />
      case "file":
        return <FileText className="h-3 w-3 text-blue-500" />
      case "user":
        return <UserPlus className="h-3 w-3 text-emerald-500" />
      default:
        return <Shield className="h-3 w-3 text-amber-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading profile...</span>
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm font-medium">Staff member not found</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard/team")}
        >
          Back to Team
        </Button>
      </div>
    )
  }

  const staffName = `${staff.first_name} ${staff.middle_name ? staff.middle_name + " " : ""}${staff.last_name}`
  const initials = `${staff.first_name?.[0] || ""}${staff.last_name?.[0] || ""}`
  const status = staff.is_active ? "Active" : "Deactivated"

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pr-4 pb-24 pl-3 md:pb-4">
        <div className="-mb-2 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/dashboard/team")}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Team Management
          </Button>
        </div>
        <div className="mt-1 mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Staff Profile & Permissions
          </h1>
        </div>

        <div className="relative flex flex-col gap-6 rounded-xl border border-border bg-card p-5 shadow-sm lg:flex-row">
          <div className="flex items-center gap-4 border-b border-border pb-6 lg:col-span-4 lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
            <div className="relative group">
              <Avatar className="h-16 w-16 border border-border shadow-sm">
                <AvatarImage src={staff.profile_url || ""} />
                <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {(isSelf || isPrivilegedAdmin) && (
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="absolute -right-1 -bottom-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs transition-transform hover:scale-110"
                  title="Update Profile Picture"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mt-1 flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl leading-tight font-semibold text-card-foreground">
                  {staffName}
                </h2>
                <Badge
                  className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${staff.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-500"}`}
                >
                  {staff.is_active ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {status}
                </Badge>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Role: {staff.role || staff.position || "Staff"}
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 pb-2 lg:col-span-8 lg:pb-0 lg:pl-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Building2 className="h-3 w-3 opacity-70" />
                  Primary Facility
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {staff.facility?.facility_name || "N/A"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <MapPin className="h-3 w-3 opacity-70" />
                  Assigned Zone
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {staff.facility?.address || staff.address || "N/A"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Mail className="h-3 w-3 opacity-70" />
                  Email
                </span>
                <span className="truncate text-sm font-semibold text-card-foreground">
                  {staff.email || "N/A"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  <Phone className="h-3 w-3 opacity-70" />
                  Phone
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {staff.phone_number || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="absolute top-5 right-5 hidden items-center gap-2 lg:flex">
            {isPrivilegedAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-border text-xs font-medium hover:bg-accent"
                onClick={handleOpenPasswordModal}
              >
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                Reset Password
              </Button>
            )}
            {canDeactivate && (
              <Button
                variant="outline"
                size="sm"
                className={`h-8 text-xs font-medium ${staff.is_active ? "border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" : "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"}`}
                onClick={handleOpenStatusModal}
              >
                {staff.is_active
                  ? isSelf
                    ? "Self-Deactivate Account"
                    : "Deactivate Account"
                  : "Activate Account"}
              </Button>
            )}
            {cannotDeactivateDueToAdminRule && (
              <div title="Cannot deactivate sole active administrator in facility">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="h-8 cursor-not-allowed border-border text-xs font-medium opacity-50"
                >
                  Sole Admin Protected
                </Button>
              </div>
            )}
          </div>

          <div className="mt-2 flex w-full flex-wrap items-center gap-2 lg:hidden">
            {isPrivilegedAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 gap-1.5 border-border text-xs font-medium hover:bg-accent"
                onClick={handleOpenPasswordModal}
              >
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                Reset Password
              </Button>
            )}
            {canDeactivate && (
              <Button
                variant="outline"
                size="sm"
                className={`h-8 flex-1 text-xs font-medium ${staff.is_active ? "border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" : "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"}`}
                onClick={handleOpenStatusModal}
              >
                {staff.is_active
                  ? isSelf
                    ? "Self-Deactivate"
                    : "Deactivate Account"
                  : "Activate Account"}
              </Button>
            )}
            {cannotDeactivateDueToAdminRule && (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-8 flex-1 cursor-not-allowed border-border text-xs font-medium opacity-50"
              >
                Sole Admin Protected
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                System Permissions
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage module access and clinical authorization levels.
              </p>
            </div>

            <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-2 border-b border-border/50 pb-4">
                <label className="text-xs font-medium text-card-foreground">
                  Assigned Role
                </label>
                <Select
                  value={role}
                  onValueChange={handleRoleChange}
                  disabled={!canModifyRole}
                >
                  <SelectTrigger className="h-9 w-full border-border bg-card text-xs text-card-foreground disabled:opacity-70 md:w-[280px]">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin" className="text-xs">
                      Administrator
                    </SelectItem>
                    <SelectItem value="Doctor" className="text-xs">
                      Doctor
                    </SelectItem>
                    <SelectItem value="Nurse" className="text-xs">
                      Nurse
                    </SelectItem>
                    <SelectItem value="Midwife" className="text-xs">
                      Midwife
                    </SelectItem>
                    <SelectItem value="HealthWorker" className="text-xs">
                      Health Worker
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!canModifyRole ? (
                  <span className="text-[10px] text-muted-foreground">
                    Only administrators can modify roles and permissions.
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    Selecting a role automatically applies authorized clinical
                    presets.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 rounded-lg border border-border/30 bg-muted/40 p-4">
                  <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Module 1: Maternal Registry & Intake
                  </h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mod1-create"
                        checked={selectedPermissions.includes("mod1-create")}
                        onCheckedChange={() =>
                          handleTogglePermission("mod1-create")
                        }
                        disabled={!canModifyRole}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor="mod1-create"
                        className="cursor-pointer text-xs leading-none font-medium text-card-foreground"
                      >
                        Create and edit Mother profiles.
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mod1-view"
                        checked={selectedPermissions.includes("mod1-view")}
                        onCheckedChange={() =>
                          handleTogglePermission("mod1-view")
                        }
                        disabled={!canModifyRole}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor="mod1-view"
                        className="cursor-pointer text-xs leading-none font-medium text-card-foreground"
                      >
                        View baseline demographic data.
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border/30 bg-muted/40 p-4">
                  <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Module 2: Clinical Care & CDSS
                  </h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mod2-log"
                        checked={selectedPermissions.includes("mod2-log")}
                        onCheckedChange={() =>
                          handleTogglePermission("mod2-log")
                        }
                        disabled={!canModifyRole}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor="mod2-log"
                        className="cursor-pointer text-xs leading-none font-medium text-card-foreground"
                      >
                        Log Vital Signs and Encounter Notes.
                      </label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="mod2-cdss"
                        checked={selectedPermissions.includes("mod2-cdss")}
                        onCheckedChange={() =>
                          handleTogglePermission("mod2-cdss")
                        }
                        disabled={!canModifyRole}
                        className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="mod2-cdss"
                          className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-card-foreground"
                        >
                          Execute CDSS Risk Assessment & Override Triage
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </label>
                        <p className="text-[10px] text-muted-foreground">
                          Authorized for RHU Midwife, Doctor, or Admin
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mod2-rx"
                        checked={selectedPermissions.includes("mod2-rx")}
                        onCheckedChange={() =>
                          handleTogglePermission("mod2-rx")
                        }
                        disabled={!canModifyRole}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor="mod2-rx"
                        className="cursor-pointer text-xs leading-none font-medium text-card-foreground"
                      >
                        Add/Edit Prescriptions & Supplements.
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border/30 bg-muted/40 p-4">
                  <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Module 3: Inter-Clinic Referrals
                  </h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mod3-out"
                        checked={selectedPermissions.includes("mod3-out")}
                        onCheckedChange={() =>
                          handleTogglePermission("mod3-out")
                        }
                        disabled={!canModifyRole}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor="mod3-out"
                        className="cursor-pointer text-xs leading-none font-medium text-card-foreground"
                      >
                        Initiate outgoing e-Referrals to Hospitals.
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mod3-in"
                        checked={selectedPermissions.includes("mod3-in")}
                        onCheckedChange={() =>
                          handleTogglePermission("mod3-in")
                        }
                        disabled={!canModifyRole}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor="mod3-in"
                        className="cursor-pointer text-xs leading-none font-medium text-card-foreground"
                      >
                        View incoming referral statuses and transfer codes.
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border/30 bg-muted/40 p-4">
                  <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Module 4: Administration & Analytics
                  </h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mod4-export"
                        checked={selectedPermissions.includes("mod4-export")}
                        onCheckedChange={() =>
                          handleTogglePermission("mod4-export")
                        }
                        disabled={!canModifyRole}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor="mod4-export"
                        className="cursor-pointer text-xs leading-none font-medium text-card-foreground"
                      >
                        Export DOH/FHSIS statistical reports.
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mod4-manage"
                        checked={selectedPermissions.includes("mod4-manage")}
                        onCheckedChange={() =>
                          handleTogglePermission("mod4-manage")
                        }
                        disabled={!canModifyRole}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor="mod4-manage"
                        className="cursor-pointer text-xs leading-none font-medium text-card-foreground"
                      >
                        Manage team members and RBAC settings.
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {canModifyRole && (
                <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/50 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={handleDiscardPermissions}
                    disabled={isSavingPermissions}
                  >
                    Discard Changes
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 bg-primary text-xs font-medium text-primary-foreground shadow-none hover:bg-primary/90"
                    onClick={handleSavePermissions}
                    disabled={isSavingPermissions}
                  >
                    {isSavingPermissions && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Save Permissions
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Activity & Audit Log
              </h3>
              <p className="text-xs text-muted-foreground">
                Recent clinical actions and system audits performed by this
                user.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Filter logs by patient or action..."
                  className="h-9 w-full rounded-md border-border bg-card pl-8 text-xs text-card-foreground shadow-none"
                />
              </div>

              {isLoadingActivities ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">Loading activity logs...</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                  <Clock className="h-7 w-7 opacity-50" />
                  <span className="text-xs font-medium">
                    No activity records found
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {debouncedSearch
                      ? "Try a different search term"
                      : "Clinical visits and audit events will appear here"}
                  </span>
                </div>
              ) : (
                <div className="mt-2 ml-2 flex flex-col space-y-5 border-l border-border pl-2">
                  {activities.map((act) => (
                    <div key={act.id} className="relative pl-5">
                      <div className="absolute top-1 -left-[4.5px] h-2 w-2 rounded-full bg-primary ring-4 ring-card" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs leading-tight font-semibold text-card-foreground">
                          {act.title}
                        </span>
                        {act.subtitle && (
                          <span className="text-xs text-muted-foreground">
                            {act.subtitle}
                          </span>
                        )}
                        {act.details && (
                          <span className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
                            {act.details}
                          </span>
                        )}
                        <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                          {renderActivityIcon(act.iconType)}
                          {formatActivityDate(act.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasMoreActivities && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMoreActivities}
                  disabled={isLoadingMoreActivities}
                  className="mt-2 h-8 w-full gap-1.5 border-border bg-card text-[11px] font-medium text-card-foreground hover:bg-accent"
                >
                  {isLoadingMoreActivities && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {isLoadingMoreActivities ? "Loading more..." : "Load More"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Key className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-semibold">
                Reset Staff Password
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Set a new login password for{" "}
              <span className="font-semibold text-foreground">{staffName}</span>
              . They will use this password to sign in to BMS.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                New Password
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] text-primary hover:text-primary/90"
                onClick={handleGeneratePassword}
              >
                {copiedPassword ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {copiedPassword ? "Copied!" : "Generate Strong Password"}
              </Button>
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="mt-1 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Confirm Password
              </label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {newPassword &&
              confirmPassword &&
              newPassword !== confirmPassword && (
                <p className="text-[11px] font-medium text-red-500">
                  Passwords do not match.
                </p>
              )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isResettingPassword}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAdminResetPassword}
              disabled={
                isResettingPassword ||
                !newPassword ||
                newPassword.length < 6 ||
                newPassword !== confirmPassword
              }
              className="h-8 gap-1.5 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
            >
              {isResettingPassword && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Set New Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isConfirmStatusModalOpen}
        onOpenChange={setIsConfirmStatusModalOpen}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2">
              <div
                className={`rounded-full p-2 ${staff.is_active ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"}`}
              >
                {staff.is_active ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <DialogTitle className="text-base font-semibold">
                {staff.is_active
                  ? isSelf
                    ? "Self-Deactivate Account?"
                    : "Deactivate Staff Account?"
                  : "Activate Staff Account?"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              {staff.is_active ? (
                isSelf ? (
                  <span className="font-medium text-red-600 dark:text-red-400">
                    You are deactivating your own account. You will immediately
                    lose access to the system and be signed out.
                  </span>
                ) : (
                  `Are you sure you want to deactivate ${staffName}? They will no longer be able to log in or record clinical data until reactivated.`
                )
              ) : (
                `Are you sure you want to activate ${staffName}? Their login access and clinical permissions will be restored immediately.`
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmStatusModalOpen(false)}
              disabled={isUpdatingStatus}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmStatusChange}
              disabled={isUpdatingStatus}
              className={`h-8 gap-1.5 text-xs ${staff.is_active ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
            >
              {isUpdatingStatus && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {staff.is_active ? "Confirm Deactivation" : "Confirm Activation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UploadStaffAvatarModal
        open={isAvatarModalOpen}
        onOpenChange={setIsAvatarModalOpen}
        staffData={staff}
        onSuccess={() => {
          fetchStaffDetails()
          fetchActivities(1, debouncedSearch, true)
        }}
      />
    </div>
  )
}
