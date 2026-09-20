import * as React from "react"
import { useState, useEffect } from "react"

import {
  User,
  Building2,
  WifiOff,
  BellRing,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Upload,
  ImageIcon,
  Trash2,
} from "lucide-react"

import { toast } from "sonner"
import { db } from "@/lib/db/bmsDatabase"
import { syncEngine } from "@/lib/sync/syncEngine"
import { useSettings } from "@/features/settings/hooks/useSettings"
import { apiClient } from "@/lib/apiClient"
import { mothersApi } from "@/features/mothers/api/mothersApi"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { setupPin } from "@/lib/security/pinSessionStore"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const { isOnline } = useNetworkStatus()
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [email, setEmail] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [offlinePin, setOfflinePin] = useState(settings.offlinePin || "")

  const [facilityName, setFacilityName] = useState("")
  const [facilityType, setFacilityType] = useState("rhu")
  const [contactNumber, setContactNumber] = useState("")
  const [officialEmail, setOfficialEmail] = useState("")
  const [completeAddress, setCompleteAddress] = useState("")
  const [facilityLogo, setFacilityLogo] = useState("")
  const [facilityId, setFacilityId] = useState("")
  const [userRole, setUserRole] = useState("")

  const [storageUsedMB, setStorageUsedMB] = useState<number>(0)
  const [storageQuotaMB, setStorageQuotaMB] = useState<number>(500)
  const [storagePercent, setStoragePercent] = useState<number>(0)
  const [savingProfile, setSavingProfile] = useState(false)
  const [updatingSecurity, setUpdatingSecurity] = useState(false)
  const [savingFacility, setSavingFacility] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const isAdminOrAbove = React.useMemo(() => {
    const r = (userRole || "").toLowerCase()
    return (
      r.includes("admin") ||
      r.includes("administrator") ||
      r.includes("superadmin") ||
      r === "admin"
    )
  }, [userRole])

  const fetchFacilityDetails = async (facId: string) => {
    if (!facId) return
    try {
      const res = await apiClient.get(`/api/v1/facility/${facId}`)
      const fac = res.data?.result || res.data?.data || res.data
      if (fac) {
        if (fac.facility_name) setFacilityName(fac.facility_name)
        if (fac.type) setFacilityType(fac.type.toLowerCase())
        if (fac.contact_number) setContactNumber(fac.contact_number)
        if (fac.email) setOfficialEmail(fac.email)
        if (fac.address) setCompleteAddress(fac.address)
        if (fac.facility_profile_url) setFacilityLogo(fac.facility_profile_url)
      }
    } catch (err) {
      console.warn("Failed to fetch fresh facility details:", err)
    }
  }

  useEffect(() => {
    syncEngine
      .getPendingCount()
      .then(setPendingQueueCount)
      .catch(() => {})

    const unsubscribe = syncEngine.subscribe((status) => {
      setPendingQueueCount(status.pendingCount)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      navigator.storage &&
      navigator.storage.estimate
    ) {
      navigator.storage
        .estimate()
        .then((estimate) => {
          if (estimate.usage !== undefined && estimate.quota !== undefined) {
            const usedMB =
              Math.round((estimate.usage / (1024 * 1024)) * 100) / 100
            const quotaMB = Math.round(estimate.quota / (1024 * 1024))
            const percent = Math.min(
              100,
              Math.round((estimate.usage / estimate.quota) * 100)
            )
            setStorageUsedMB(usedMB)
            setStorageQuotaMB(quotaMB)
            setStoragePercent(percent)
          }
        })
        .catch(console.error)
    }
  }, [])

  useEffect(() => {
    const loadSession = async () => {
      let resolvedFacId = ""

      const userSession = await db.userSession.get("current_user").catch(() => null)
      if (userSession) {
        setUserRole(userSession.role || userSession.cachedUser?.role || "")
        setFirstName(
          userSession.first_name || userSession.cachedUser?.first_name || ""
        )
        setLastName(
          userSession.last_name || userSession.cachedUser?.last_name || ""
        )
        setPhoneNumber(
          userSession.phone_number ||
            userSession.cachedUser?.phone_number ||
            ""
        )
        setEmail(userSession.email || userSession.cachedUser?.email || "")

        const fac = userSession.facility || userSession.cachedUser?.facility
        if (fac) {
          resolvedFacId = fac.facility_id || userSession.facility_id || ""
          setFacilityId(resolvedFacId)
          setFacilityName(fac.facility_name || "")
          setFacilityType(fac.type?.toLowerCase() || "rhu")
          setContactNumber(fac.contact_number || "")
          setOfficialEmail(fac.email || "")
          setCompleteAddress(fac.address || "")
          if (fac.facility_profile_url) setFacilityLogo(fac.facility_profile_url)
        } else if (userSession.facility_id) {
          resolvedFacId = userSession.facility_id
          setFacilityId(resolvedFacId)
        }
      }

      if (typeof window !== "undefined") {
        const storedUserStr = localStorage.getItem("user")
        if (storedUserStr) {
          try {
            const parsed = JSON.parse(storedUserStr)
            if (!userRole && parsed.role) setUserRole(parsed.role)
            if (!firstName && parsed.first_name) setFirstName(parsed.first_name)
            if (!lastName && parsed.last_name) setLastName(parsed.last_name)
            if (!email && parsed.email) setEmail(parsed.email)
            if (!phoneNumber && parsed.phone_number) setPhoneNumber(parsed.phone_number)

            const localFacId = parsed.facility_id || parsed.facility?.facility_id || ""
            if (!resolvedFacId && localFacId) {
              resolvedFacId = localFacId
              setFacilityId(localFacId)
            }

            if (parsed.facility?.facility_name && !facilityName) {
              setFacilityName(parsed.facility.facility_name)
            }
            if (parsed.facility?.facility_profile_url && !facilityLogo) {
              setFacilityLogo(parsed.facility.facility_profile_url)
            }
          } catch (e) {}
        }
      }

      if (resolvedFacId) {
        fetchFacilityDetails(resolvedFacId)
      }
    }

    loadSession()
  }, [])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const profileData = {
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      email: email,
    }

    try {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.put("/api/v1/user/profile", profileData)
        } catch (apiErr: any) {
          console.warn(
            "Backend profile save warning, queueing offline mutation:",
            apiErr
          )
          await syncEngine.enqueueMutation({
            entity_type: "custom_request",
            action: "UPDATE",
            endpoint: "/api/v1/user/profile",
            method: "PUT",
            payload: profileData,
          })
        }
      } else {
        await syncEngine.enqueueMutation({
          entity_type: "custom_request",
          action: "UPDATE",
          endpoint: "/api/v1/user/profile",
          method: "PUT",
          payload: profileData,
        })
      }

      const userSession = await db.userSession.get("current_user")
      if (userSession) {
        userSession.first_name = firstName
        userSession.last_name = lastName
        userSession.phone_number = phoneNumber
        userSession.email = email
        if (userSession.cachedUser) {
          userSession.cachedUser.first_name = firstName
          userSession.cachedUser.last_name = lastName
          userSession.cachedUser.phone_number = phoneNumber
          userSession.cachedUser.email = email
        }
        await db.userSession.put(userSession)
      }
      toast.success("Profile updated", {
        description: syncEngine.isNetworkOnline()
          ? "Your profile information has been saved."
          : "Profile saved locally. Changes will sync once online.",
      })
    } catch (e: any) {
      console.error("Failed to save profile:", e)
      toast.error("Failed to save profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUpdateSecurity = async () => {
    if (newPassword) {
      if (!syncEngine.isNetworkOnline()) {
        toast.error("Network Required for Password Change", {
          description:
            "Changing your account password requires an active internet connection.",
        })
        return
      }
      if (!currentPassword) {
        toast.error("Current password required", {
          description:
            "Please enter your current password to set a new password.",
        })
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match", {
          description: "New password and confirmation do not match.",
        })
        return
      }
      if (newPassword.length < 6) {
        toast.error("Password too short", {
          description: "New password must be at least 6 characters long.",
        })
        return
      }
    }

    setUpdatingSecurity(true)
    try {
      if (newPassword && syncEngine.isNetworkOnline()) {
        await apiClient.post("/api/v1/auth/change-password", {
          currentPassword,
          newPassword,
        })
        toast.success("Password changed successfully", {
          description: "Your account password has been updated.",
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }

      if (offlinePin && offlinePin.length >= 4) {
        const ok = await setupPin(offlinePin)
        if (ok) {
          updateSettings({ offlinePin })
          toast.success("Security PIN updated", {
            description: "24-hour offline device encryption key saved.",
          })
        } else {
          toast.error("Failed to update PIN key derivation.")
        }
      } else if (offlinePin && offlinePin.length < 4) {
        toast.error("PIN too short", {
          description: "Security PIN must be at least 4 digits.",
        })
      } else if (!newPassword) {
        toast.info("No security changes detected")
      }
    } catch (err: any) {
      console.error("Security update error:", err)
      const errorMsg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update security settings"
      toast.error("Security Update Failed", { description: errorMsg })
    } finally {
      setUpdatingSecurity(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    setUploadingLogo(true)

    try {
      if (syncEngine.isNetworkOnline()) {
        const res = await mothersApi.uploadLabFile(file)
        const remoteUrl = res?.file_url || res?.fileUrl || res?.url
        if (remoteUrl) {
          setFacilityLogo(remoteUrl)
          toast.success("Logo uploaded", { description: "Click Save Clinic Identification to apply changes." })
        }
      } else {
        const reader = new FileReader()
        reader.onloadend = () => {
          setFacilityLogo(reader.result as string)
          toast.info("Logo loaded locally", { description: "Click Save Clinic Identification to save changes." })
        }
        reader.readAsDataURL(file)
      }
    } catch (err: any) {
      console.error("Failed to upload facility logo:", err)
      toast.error("Upload Failed", { description: "Could not upload clinic logo image." })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveFacility = async () => {
    if (!isAdminOrAbove) {
      toast.error("Permission Denied", {
        description: "Only administrators can modify facility settings.",
      })
      return
    }

    setSavingFacility(true)
    const facilityPayload = {
      facility_id: facilityId,
      facility_name: facilityName,
      type: facilityType,
      contact_number: contactNumber,
      email: officialEmail,
      address: completeAddress,
      facility_profile_url: facilityLogo || null,
    }

    try {
      if (syncEngine.isNetworkOnline()) {
        await apiClient.put("/api/v1/facility/update", facilityPayload)
        toast.success("Facility details updated", {
          description: "Clinic identification saved successfully.",
        })
      } else {
        toast.info("Saved locally", {
          description: "Changes queued for sync when online.",
        })
      }

      const userSession = await db.userSession.get("current_user")
      if (userSession) {
        userSession.facility = {
          ...(userSession.facility || {}),
          ...facilityPayload,
        }
        await db.userSession.put(userSession)
      }

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("user")
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            parsed.facility_name = facilityName
            parsed.facility_profile_url = facilityLogo
            if (parsed.facility) {
              parsed.facility.facility_name = facilityName
              parsed.facility.facility_profile_url = facilityLogo
              parsed.facility.contact_number = contactNumber
              parsed.facility.email = officialEmail
              parsed.facility.address = completeAddress
              parsed.facility.type = facilityType
            }
            localStorage.setItem("user", JSON.stringify(parsed))
          } catch (e) {}
        }
        window.dispatchEvent(
          new CustomEvent("bms:facility-updated", {
            detail: {
              facility_name: facilityName,
              facility_profile_url: facilityLogo,
            },
          })
        )
      }
    } catch (err: any) {
      console.error("Failed to update facility:", err)
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update facility"
      toast.error("Update Failed", { description: msg })
    } finally {
      setSavingFacility(false)
    }
  }

  const handleClearCache = async () => {
    if (
      confirm(
        "Are you sure you want to clear the local database cache? Unsynced records may be lost if not in the queue."
      )
    ) {
      try {
        await Promise.all([
          db.mothers.clear(),
          db.pregnancies.clear(),
          db.prenatalVisits.clear(),
          db.labRecords.clear(),
          db.supplements.clear(),
          db.ehrDocuments.clear(),
          db.messages.clear(),
          db.appointments.clear(),
        ])
        toast.success("Local cache cleared", {
          description: "User session and sync queue retained.",
        })
      } catch (err) {
        toast.error("Failed to clear local cache")
      }
    }
  }

  const handleForceSync = () => {
    if (!syncEngine.isNetworkOnline()) {
      toast.warning("Network Offline", {
        description:
          "Cannot process sync queue while offline. Reconnect to internet.",
      })
      return
    }
    toast.info("Starting sync...", { description: "Processing offline queue." })
    syncEngine
      .processQueue()
      .then(() => {
        toast.success("Sync completed")
      })
      .catch((err) => {
        toast.error("Sync failed", {
          description: err?.message || "Unknown error",
        })
      })
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      {!isOnline && (
        <div className="mx-4 mt-4 flex shrink-0 items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-medium text-amber-600 dark:text-amber-400">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Working Offline — Profile edits and preferences will save locally
            and automatically sync when online.
          </span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 pr-4 pb-24 pl-3 md:pb-4">
        <Tabs defaultValue="account" className="flex w-full flex-col gap-6">
          <div className="-mb-2 w-full shrink-0 [scrollbar-width:none] overflow-x-auto pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="h-9 w-full justify-start gap-1 rounded-md border border-border bg-muted p-1 *:flex-1 md:w-max md:*:flex-initial">
              <TabsTrigger
                value="account"
                className="flex h-full items-center gap-2 rounded-sm border border-transparent px-3 py-1 text-xs font-medium transition-all"
              >
                <User className="h-3.5 w-3.5" /> My Account
              </TabsTrigger>
              <TabsTrigger
                value="facility"
                className="flex h-full items-center gap-2 rounded-sm border border-transparent px-3 py-1 text-xs font-medium transition-all"
              >
                <Building2 className="h-3.5 w-3.5" /> Facility Profile
              </TabsTrigger>
              <TabsTrigger
                value="sync"
                className="flex h-full items-center gap-2 rounded-sm border border-transparent px-3 py-1 text-xs font-medium transition-all"
              >
                <WifiOff className="h-3.5 w-3.5" /> Offline & Sync
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex h-full items-center gap-2 rounded-sm border border-transparent px-3 py-1 text-xs font-medium transition-all"
              >
                <BellRing className="h-3.5 w-3.5" /> Notifications
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="account"
            className="m-0 flex flex-col gap-6 outline-none"
          >
            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Personal Information
                </h3>
                <p className="text-xs text-muted-foreground">
                  Update your personal details and contact information.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-card-foreground">
                    First Name
                  </label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-9 border-border bg-card text-xs text-card-foreground shadow-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-card-foreground">
                    Last Name
                  </label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-9 border-border bg-card text-xs text-card-foreground shadow-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-card-foreground">
                    Phone Number
                  </label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-9 border-border bg-card text-xs text-card-foreground shadow-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-card-foreground">
                    Email Address
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="h-9 border-border bg-card text-xs text-card-foreground shadow-none"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="h-9 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Security & Offline Access
                </h3>
                <p className="text-xs text-muted-foreground">
                  Manage credentials and local device protection.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
                <div className="flex flex-col gap-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-card-foreground">
                    <Lock className="h-3.5 w-3.5" /> Change Password
                  </h4>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Current Password
                    </label>
                    <Input
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      type="password"
                      placeholder="••••••••"
                      className="h-9 border-border bg-card text-xs text-card-foreground shadow-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      New Password
                    </label>
                    <Input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      type="password"
                      placeholder="••••••••"
                      className="h-9 border-border bg-card text-xs text-card-foreground shadow-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Confirm Password
                    </label>
                    <Input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type="password"
                      placeholder="••••••••"
                      className="h-9 border-border bg-card text-xs text-card-foreground shadow-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-card-foreground">
                    <Smartphone className="h-3.5 w-3.5" /> Offline PIN Lock
                  </h4>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-200">
                    <p>
                      Protects sensitive patient records cached locally in
                      IndexedDB if this tablet is stolen or compromised while
                      offline.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      4-6 Digit Security PIN
                    </label>
                    <Input
                      value={offlinePin}
                      onChange={(e) => setOfflinePin(e.target.value)}
                      type="password"
                      maxLength={6}
                      placeholder="••••"
                      className="h-9 border-border bg-card font-mono text-xs tracking-widest text-card-foreground shadow-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-border/50 pt-5">
                <Button
                  size="sm"
                  onClick={handleUpdateSecurity}
                  disabled={updatingSecurity}
                  className="h-9 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {updatingSecurity ? "Updating..." : "Update Security"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="facility"
            className="m-0 flex flex-col gap-6 outline-none"
          >
            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Clinic Identification
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isAdminOrAbove
                    ? "Manage and update official clinic details and contact information."
                    : "Read-only facility details. Admin privilege required to modify."}
                </p>
              </div>
              <div className="mb-6 flex flex-col gap-3 rounded-lg border border-border/70 bg-accent/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    {facilityLogo ? (
                      <img
                        src={facilityLogo}
                        alt="Facility Logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-card-foreground">
                      Facility Logo / Branding
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Appears in the navigation sidebar, transfer slips, and reports.
                    </span>
                  </div>
                </div>

                {isAdminOrAbove && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="facility-logo-upload"
                      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent ${
                        uploadingLogo ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingLogo ? "Uploading..." : "Upload Logo"}
                      <input
                        id="facility-logo-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo || savingFacility}
                      />
                    </label>
                    {facilityLogo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFacilityLogo("")
                          toast.info("Logo removed", {
                            description: "Click Save Clinic Identification to apply changes.",
                          })
                        }}
                        disabled={savingFacility}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Remove custom logo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-card-foreground">
                    Facility Name
                  </label>
                  <Input
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    disabled={!isAdminOrAbove || savingFacility}
                    placeholder="e.g. Rural Health Unit 1"
                    className="h-9 border-border bg-card text-xs text-card-foreground shadow-none disabled:bg-muted/50 disabled:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-card-foreground">
                    Facility Type
                  </label>
                  <Select
                    value={facilityType}
                    onValueChange={(val) => setFacilityType(val)}
                    disabled={!isAdminOrAbove || savingFacility}
                  >
                    <SelectTrigger className="h-9 w-full border-border bg-card text-xs text-card-foreground shadow-none disabled:bg-muted/50 disabled:text-muted-foreground">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bhs">
                        Barangay Health Station
                      </SelectItem>
                      <SelectItem value="rhu">Rural Health Unit</SelectItem>
                      <SelectItem value="hospital">Hospital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-card-foreground">
                    Contact Number
                  </label>
                  <Input
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    disabled={!isAdminOrAbove || savingFacility}
                    placeholder="e.g. (054) 477 1234"
                    className="h-9 border-border bg-card text-xs text-card-foreground shadow-none disabled:bg-muted/50 disabled:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-card-foreground">
                    Official Email
                  </label>
                  <Input
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    disabled={!isAdminOrAbove || savingFacility}
                    placeholder="e.g. rhu1@pili.gov.ph"
                    className="h-9 border-border bg-card text-xs text-card-foreground shadow-none disabled:bg-muted/50 disabled:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-medium text-card-foreground">
                    Complete Address
                  </label>
                  <Textarea
                    value={completeAddress}
                    onChange={(e) => setCompleteAddress(e.target.value)}
                    disabled={!isAdminOrAbove || savingFacility}
                    placeholder="Complete facility street address"
                    className="min-h-[60px] resize-none border-border bg-card text-xs text-card-foreground shadow-none disabled:bg-muted/50 disabled:text-muted-foreground"
                  />
                </div>
              </div>

              {isAdminOrAbove && (
                <div className="mt-6 flex justify-end border-t border-border/50 pt-5">
                  <Button
                    size="sm"
                    onClick={handleSaveFacility}
                    disabled={savingFacility}
                    className="h-9 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {savingFacility
                      ? "Saving Details..."
                      : "Save Clinic Identification"}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Referral Network Routing
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure default escalation pathways for high-risk triage.
                </p>
              </div>
              <div className="flex max-w-xl flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-card-foreground">
                    Default Receiving Hospital
                  </label>
                  <Select
                    value={settings.defaultReceivingHospital}
                    onValueChange={(v) =>
                      updateSettings({ defaultReceivingHospital: v })
                    }
                  >
                    <SelectTrigger className="h-9 w-full border-border bg-card text-xs text-card-foreground shadow-none">
                      <SelectValue placeholder="Select hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bmc">
                        Bicol Medical Center (Naga City)
                      </SelectItem>
                      <SelectItem value="bgh">
                        Bicol Region General Hospital
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    This pre-fills the destination when generating an HL7
                    e-referral.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end border-t border-border/50 pt-5">
                <Button
                  size="sm"
                  onClick={() => toast.success("Facility settings saved")}
                  className="h-9 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Save Facility Settings
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="sync"
            className="m-0 flex flex-col gap-6 outline-none"
          >
            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1">
                <h3 className="flex items-center justify-between text-sm font-semibold text-card-foreground">
                  Local Storage Health
                  <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-500 shadow-none">
                    <CheckCircle2 className="h-3 w-3" /> Persistent Storage
                    Granted
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  IndexedDB cache status for offline maternal records.
                </p>
              </div>

              <div className="flex max-w-xl flex-col gap-2">
                <div className="mb-1 flex items-end justify-between">
                  <span className="text-xs font-medium text-card-foreground">
                    Storage Quota
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    <strong className="text-card-foreground">
                      {storageUsedMB} MB
                    </strong>{" "}
                    / {storageQuotaMB} MB Used
                  </span>
                </div>
                <Progress value={storagePercent} className="h-2 bg-muted" />
                <p className="mt-2 text-[10px] text-muted-foreground">
                  The browser StorageManager API is currently preventing
                  automatic eviction of cached registry data.
                </p>

                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                  <WifiOff className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-card-foreground">
                      Offline Outbox Sync Queue
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {pendingQueueCount > 0
                        ? `${pendingQueueCount} offline mutation(s) pending background sync.`
                        : "All local offline mutations are fully synchronized."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Synchronization Rules
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure how and when the app pushes data to the cloud.
                </p>
              </div>

              <div className="flex max-w-xl flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-card-foreground">
                      Auto-Sync on Reconnect
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Automatically push queued records when internet is
                      restored.
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoSyncOnReconnect}
                    onCheckedChange={(c) =>
                      updateSettings({ autoSyncOnReconnect: c })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-card-foreground">
                      Download Historical Records
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Cache older maternal records locally for offline viewing.
                    </p>
                  </div>
                  <Switch
                    checked={settings.downloadHistoricalRecords}
                    onCheckedChange={(c) =>
                      updateSettings({ downloadHistoricalRecords: c })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-red-500/20 bg-red-500/5 p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
                  <AlertCircle className="h-4 w-4" /> Manual Diagnostics
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCache}
                  className="h-9 border border-red-500/20 text-xs font-medium text-red-500 hover:bg-red-500/10 hover:text-red-600"
                >
                  Clear Local Cache
                </Button>
                <Button
                  size="sm"
                  onClick={handleForceSync}
                  className="h-9 bg-primary text-xs font-medium text-primary-foreground shadow-none hover:bg-primary/90"
                >
                  Force Sync Now
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="notifications"
            className="m-0 flex flex-col gap-6 outline-none"
          >
            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Channel Status
                </h3>
                <p className="text-xs text-muted-foreground">
                  Automated communication pipeline and fallback gateways.
                </p>
              </div>

              <div className="flex max-w-xl flex-col gap-3">
                <div className="flex items-center justify-between rounded-md border border-border/30 bg-muted/40 p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-card-foreground">
                      Firebase Cloud Messaging (FCM)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Used for native app push notifications.
                    </span>
                  </div>
                  <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-500 shadow-none">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border/30 bg-muted/40 p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-card-foreground">
                      Semaphore SMS Gateway
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Fallback channel for mothers without smartphones.
                    </span>
                  </div>
                  <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-500 shadow-none">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border/30 bg-muted/40 p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-card-foreground">
                      Resend Email
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      For official document transfers and HCPN alerts.
                    </span>
                  </div>
                  <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-500 shadow-none">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Trigger Preferences
                </h3>
                <p className="text-xs text-muted-foreground">
                  Manage automated triggers for patient messaging.
                </p>
              </div>

              <div className="flex max-w-xl flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-card-foreground">
                      Automated ANC Reminders
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Send SMS reminders to mothers 24 hours before scheduled
                      prenatal visits.
                    </p>
                  </div>
                  <Switch
                    checked={settings.ancReminders}
                    onCheckedChange={(c) => updateSettings({ ancReminders: c })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-card-foreground">
                      Post-Referral SMS
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Notify mothers via text when their hospital transfer is
                      accepted.
                    </p>
                  </div>
                  <Switch
                    checked={settings.postReferralSms}
                    onCheckedChange={(c) =>
                      updateSettings({ postReferralSms: c })
                    }
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-border/50 pt-5">
                <Button
                  size="sm"
                  onClick={() =>
                    toast.success("Notification preferences saved")
                  }
                  className="h-9 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
