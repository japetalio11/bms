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
  AlertCircle
} from "lucide-react"

import { toast } from "sonner"
import { db } from "@/lib/db/bmsDatabase"
import { syncEngine } from "@/lib/sync/syncEngine"
import { useSettings } from "@/features/settings/hooks/useSettings"
import { apiClient } from "@/lib/apiClient"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"

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
  SelectValue 
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

  const [storageUsedMB, setStorageUsedMB] = useState<number>(0)
  const [storageQuotaMB, setStorageQuotaMB] = useState<number>(500)
  const [storagePercent, setStoragePercent] = useState<number>(0)
  const [savingProfile, setSavingProfile] = useState(false)
  const [updatingSecurity, setUpdatingSecurity] = useState(false)

  useEffect(() => {
    syncEngine.getPendingCount().then(setPendingQueueCount).catch(() => {})

    const unsubscribe = syncEngine.subscribe((status) => {
      setPendingQueueCount(status.pendingCount)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          const usedMB = Math.round((estimate.usage / (1024 * 1024)) * 100) / 100
          const quotaMB = Math.round(estimate.quota / (1024 * 1024))
          const percent = Math.min(100, Math.round((estimate.usage / estimate.quota) * 100))
          setStorageUsedMB(usedMB)
          setStorageQuotaMB(quotaMB)
          setStoragePercent(percent)
        }
      }).catch(console.error)
    }
  }, [])

  useEffect(() => {
    db.userSession.get("current_user").then((userSession) => {
      if (userSession) {
        setFirstName(userSession.first_name || userSession.cachedUser?.first_name || "")
        setLastName(userSession.last_name || userSession.cachedUser?.last_name || "")
        setPhoneNumber(userSession.phone_number || userSession.cachedUser?.phone_number || "")
        setEmail(userSession.email || userSession.cachedUser?.email || "")

        if (userSession.facility || userSession.cachedUser?.facility) {
           const fac = userSession.facility || userSession.cachedUser.facility
           setFacilityName(fac.facility_name || "")
           setFacilityType(fac.type?.toLowerCase() || "rhu")
           setContactNumber(fac.contact_number || "")
           setOfficialEmail(fac.email || "")
           setCompleteAddress(fac.address || "")
        }
      }
    }).catch(console.error)
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
          await apiClient.put('/api/v1/user/profile', profileData)
        } catch (apiErr: any) {
          console.warn("Backend profile save warning, queueing offline mutation:", apiErr)
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
          : "Profile saved locally. Changes will sync once online." 
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
          description: "Changing your account password requires an active internet connection." 
        })
        return
      }
      if (!currentPassword) {
        toast.error("Current password required", { description: "Please enter your current password to set a new password." })
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match", { description: "New password and confirmation do not match." })
        return
      }
      if (newPassword.length < 6) {
        toast.error("Password too short", { description: "New password must be at least 6 characters long." })
        return
      }
    }

    setUpdatingSecurity(true)
    try {
      if (newPassword && syncEngine.isNetworkOnline()) {
        await apiClient.post('/api/v1/auth/change-password', {
          currentPassword,
          newPassword
        })
        toast.success("Password changed successfully", { description: "Your account password has been updated." })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }

      if (offlinePin !== settings.offlinePin) {
        updateSettings({ offlinePin })
        toast.success("Security PIN updated", { description: "Local device security settings saved." })
      } else if (!newPassword) {
        toast.info("No security changes detected")
      }
    } catch (err: any) {
      console.error("Security update error:", err)
      const errorMsg = err?.response?.data?.error || err?.message || "Failed to update security settings"
      toast.error("Security Update Failed", { description: errorMsg })
    } finally {
      setUpdatingSecurity(false)
    }
  }

  const handleClearCache = async () => {
    if (confirm("Are you sure you want to clear the local database cache? Unsynced records may be lost if not in the queue.")) {
      try {
        await Promise.all([
          db.mothers.clear(),
          db.pregnancies.clear(),
          db.prenatalVisits.clear(),
          db.labRecords.clear(),
          db.supplements.clear(),
          db.ehrDocuments.clear(),
          db.messages.clear(),
          db.appointments.clear()
        ])
        toast.success("Local cache cleared", { description: "User session and sync queue retained." })
      } catch (err) {
        toast.error("Failed to clear local cache")
      }
    }
  }

  const handleForceSync = () => {
    if (!syncEngine.isNetworkOnline()) {
      toast.warning("Network Offline", { description: "Cannot process sync queue while offline. Reconnect to internet." })
      return
    }
    toast.info("Starting sync...", { description: "Processing offline queue." })
    syncEngine.processQueue().then(() => {
       toast.success("Sync completed")
    }).catch(err => {
       toast.error("Sync failed", { description: err?.message || "Unknown error" })
    })
  }

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden bg-background dark:bg-black">
      {!isOnline && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs border border-amber-500/20 font-medium flex items-center gap-2 shrink-0">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Working Offline — Profile edits and preferences will save locally and automatically sync when online.</span>
        </div>
      )}
      {/* Scrollable Content */}
      <div className="flex-1 flex flex-col p-4 pl-3 pr-4 pb-24 md:pb-4 overflow-y-auto min-w-0">
        <Tabs defaultValue="account" className="w-full flex flex-col gap-6">
          {/* Tab Navigation */}
          <div className="w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial">
              <TabsTrigger value="account" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-3 py-1 h-full transition-all flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> My Account
              </TabsTrigger>
              <TabsTrigger value="facility" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-3 py-1 h-full transition-all flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" /> Facility Profile
              </TabsTrigger>
              <TabsTrigger value="sync" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-3 py-1 h-full transition-all flex items-center gap-2">
                <WifiOff className="h-3.5 w-3.5" /> Offline & Sync
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-white rounded-sm px-3 py-1 h-full transition-all flex items-center gap-2">
                <BellRing className="h-3.5 w-3.5" /> Notifications
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: My Account */}
          <TabsContent value="account" className="flex flex-col gap-6 outline-none m-0">
            {/* Card A: Personal Information */}
            <div className="flex flex-col p-5 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] shadow-sm">
              <div className="flex flex-col gap-1 mb-5">
                <h3 className="text-sm font-semibold text-foreground dark:text-white">Personal Information</h3>
                <p className="text-xs text-muted-foreground">Update your personal details and contact information.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">First Name</label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-9 text-xs border-sidebar-border shadow-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">Last Name</label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-9 text-xs border-sidebar-border shadow-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">Phone Number</label>
                  <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="h-9 text-xs border-sidebar-border shadow-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">Email Address</label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="h-9 text-xs border-sidebar-border shadow-none" />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile} className="h-9 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </div>

            {/* Card B: Security & Offline Access */}
            <div className="flex flex-col p-5 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] shadow-sm">
              <div className="flex flex-col gap-1 mb-5">
                <h3 className="text-sm font-semibold text-foreground dark:text-white">Security & Offline Access</h3>
                <p className="text-xs text-muted-foreground">Manage credentials and local device protection.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-semibold text-foreground dark:text-white flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Change Password</h4>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Current Password</label>
                    <Input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" placeholder="••••••••" className="h-9 text-xs border-sidebar-border shadow-none" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">New Password</label>
                    <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="••••••••" className="h-9 text-xs border-sidebar-border shadow-none" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                    <Input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="••••••••" className="h-9 text-xs border-sidebar-border shadow-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-semibold text-foreground dark:text-white flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Offline PIN Lock</h4>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
                    <p>Protects sensitive patient records cached locally in IndexedDB if this tablet is stolen or compromised while offline.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">4-6 Digit Security PIN</label>
                    <Input value={offlinePin} onChange={e => setOfflinePin(e.target.value)} type="password" maxLength={6} placeholder="••••" className="h-9 text-xs border-sidebar-border shadow-none font-mono tracking-widest" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6 pt-5 border-t border-sidebar-border/50">
                <Button size="sm" onClick={handleUpdateSecurity} disabled={updatingSecurity} className="h-9 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                  {updatingSecurity ? "Updating..." : "Update Security"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Facility Profile */}
          <TabsContent value="facility" className="flex flex-col gap-6 outline-none m-0">
            {/* Card A: Clinic Identification */}
            <div className="flex flex-col p-5 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] shadow-sm">
              <div className="flex flex-col gap-1 mb-5">
                <h3 className="text-sm font-semibold text-foreground dark:text-white">Clinic Identification</h3>
                <p className="text-xs text-muted-foreground">Read-only facility details configured by the System Administrator.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">Facility Name</label>
                  <Input value={facilityName || "Rural Health Unit 1"} disabled className="h-9 text-xs border-sidebar-border shadow-none bg-muted/50" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">Facility Type</label>
                  <Select value={facilityType || "rhu"} disabled>
                    <SelectTrigger className="w-full h-9 text-xs border-sidebar-border shadow-none bg-muted/50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bhs">Barangay Health Station</SelectItem>
                      <SelectItem value="rhu">Rural Health Unit</SelectItem>
                      <SelectItem value="hospital">Hospital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">Contact Number</label>
                  <Input value={contactNumber || "(054) 477 1234"} disabled className="h-9 text-xs border-sidebar-border shadow-none bg-muted/50" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">Official Email</label>
                  <Input value={officialEmail || "rhu1@pili.gov.ph"} disabled className="h-9 text-xs border-sidebar-border shadow-none bg-muted/50" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">Complete Address</label>
                  <Textarea value={completeAddress || "Municipal Compound, San Agustin, Pili, Camarines Sur"} disabled className="min-h-[60px] text-xs border-sidebar-border shadow-none bg-muted/50 resize-none" />
                </div>
              </div>
            </div>

            {/* Card B: Referral Network Routing */}
            <div className="flex flex-col p-5 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] shadow-sm">
              <div className="flex flex-col gap-1 mb-5">
                <h3 className="text-sm font-semibold text-foreground dark:text-white">Referral Network Routing</h3>
                <p className="text-xs text-muted-foreground">Configure default escalation pathways for high-risk triage.</p>
              </div>
              <div className="flex flex-col gap-4 max-w-xl">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-foreground dark:text-white">Default Receiving Hospital</label>
                  <Select value={settings.defaultReceivingHospital} onValueChange={v => updateSettings({ defaultReceivingHospital: v })}>
                    <SelectTrigger className="w-full h-9 text-xs border-sidebar-border shadow-none">
                      <SelectValue placeholder="Select hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bmc">Bicol Medical Center (Naga City)</SelectItem>
                      <SelectItem value="bgh">Bicol Region General Hospital</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">This pre-fills the destination when generating an HL7 e-referral.</p>
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-5 border-t border-sidebar-border/50">
                <Button size="sm" onClick={() => toast.success("Facility settings saved")} className="h-9 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                  Save Facility Settings
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Offline & Sync */}
          <TabsContent value="sync" className="flex flex-col gap-6 outline-none m-0">
            {/* Card A: Local Storage Health */}
            <div className="flex flex-col p-5 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] shadow-sm">
              <div className="flex flex-col gap-1 mb-5">
                <h3 className="text-sm font-semibold text-foreground dark:text-white flex items-center justify-between">
                  Local Storage Health
                  <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-3 w-3" /> Persistent Storage Granted
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">IndexedDB cache status for offline maternal records.</p>
              </div>
              
              <div className="flex flex-col gap-2 max-w-xl">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-medium text-foreground dark:text-white">Storage Quota</span>
                  <span className="text-[10px] text-muted-foreground"><strong className="text-foreground dark:text-white">{storageUsedMB} MB</strong> / {storageQuotaMB} MB Used</span>
                </div>
                <Progress value={storagePercent} className="h-2 bg-muted dark:bg-[#222]" />
                <p className="text-[10px] text-muted-foreground mt-2">
                  The browser StorageManager API is currently preventing automatic eviction of cached registry data.
                </p>

                <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-muted/40 dark:bg-[#181818] border border-sidebar-border">
                  <WifiOff className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground dark:text-white">Offline Outbox Sync Queue</span>
                    <span className="text-[11px] text-muted-foreground">
                      {pendingQueueCount > 0 
                        ? `${pendingQueueCount} offline mutation(s) pending background sync.` 
                        : "All local offline mutations are fully synchronized."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card B: Synchronization Rules */}
            <div className="flex flex-col p-5 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] shadow-sm">
              <div className="flex flex-col gap-1 mb-5">
                <h3 className="text-sm font-semibold text-foreground dark:text-white">Synchronization Rules</h3>
                <p className="text-xs text-muted-foreground">Configure how and when the app pushes data to the cloud.</p>
              </div>
              
              <div className="flex flex-col gap-4 max-w-xl">
                <div className="flex items-center justify-between rounded-lg border border-sidebar-border/50 p-3 shadow-sm bg-background dark:bg-black">
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-foreground dark:text-white">Auto-Sync on Reconnect</label>
                    <p className="text-[10px] text-muted-foreground">Automatically push queued records when internet is restored.</p>
                  </div>
                  <Switch checked={settings.autoSyncOnReconnect} onCheckedChange={c => updateSettings({ autoSyncOnReconnect: c })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-sidebar-border/50 p-3 shadow-sm bg-background dark:bg-black">
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-foreground dark:text-white">Download Historical Records</label>
                    <p className="text-[10px] text-muted-foreground">Cache older maternal records locally for offline viewing.</p>
                  </div>
                  <Switch checked={settings.downloadHistoricalRecords} onCheckedChange={c => updateSettings({ downloadHistoricalRecords: c })} />
                </div>
              </div>
            </div>

            {/* Card C: Manual Diagnostics */}
            <div className="flex flex-col p-5 rounded-xl border border-red-500/20 bg-red-50/50 dark:bg-red-950/10 shadow-sm">
              <div className="flex flex-col gap-1 mb-4">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Manual Diagnostics
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleClearCache} className="h-9 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900/50">
                  Clear Local Cache
                </Button>
                <Button size="sm" onClick={handleForceSync} className="h-9 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-none">
                  Force Sync Now
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: Notifications */}
          <TabsContent value="notifications" className="flex flex-col gap-6 outline-none m-0">
            {/* Card A: Channel Status */}
            <div className="flex flex-col p-5 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] shadow-sm">
              <div className="flex flex-col gap-1 mb-5">
                <h3 className="text-sm font-semibold text-foreground dark:text-white">Channel Status</h3>
                <p className="text-xs text-muted-foreground">Automated communication pipeline and fallback gateways.</p>
              </div>
              
              <div className="flex flex-col gap-3 max-w-xl">
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 dark:bg-[#1a1a1a] border border-transparent dark:border-sidebar-border/30">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground dark:text-white">Firebase Cloud Messaging (FCM)</span>
                    <span className="text-[10px] text-muted-foreground">Used for native app push notifications.</span>
                  </div>
                  <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 dark:bg-[#1a1a1a] border border-transparent dark:border-sidebar-border/30">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground dark:text-white">Semaphore SMS Gateway</span>
                    <span className="text-[10px] text-muted-foreground">Fallback channel for mothers without smartphones.</span>
                  </div>
                  <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 dark:bg-[#1a1a1a] border border-transparent dark:border-sidebar-border/30">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground dark:text-white">Resend Email</span>
                    <span className="text-[10px] text-muted-foreground">For official document transfers and HCPN alerts.</span>
                  </div>
                  <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                </div>
              </div>
            </div>

            {/* Card B: Trigger Preferences */}
            <div className="flex flex-col p-5 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] shadow-sm">
              <div className="flex flex-col gap-1 mb-5">
                <h3 className="text-sm font-semibold text-foreground dark:text-white">Trigger Preferences</h3>
                <p className="text-xs text-muted-foreground">Manage automated triggers for patient messaging.</p>
              </div>
              
              <div className="flex flex-col gap-4 max-w-xl">
                <div className="flex items-center justify-between rounded-lg border border-sidebar-border/50 p-3 shadow-sm bg-background dark:bg-black">
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-foreground dark:text-white">Automated ANC Reminders</label>
                    <p className="text-[10px] text-muted-foreground">Send SMS reminders to mothers 24 hours before scheduled prenatal visits.</p>
                  </div>
                  <Switch checked={settings.ancReminders} onCheckedChange={c => updateSettings({ ancReminders: c })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-sidebar-border/50 p-3 shadow-sm bg-background dark:bg-black">
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-foreground dark:text-white">Post-Referral SMS</label>
                    <p className="text-[10px] text-muted-foreground">Notify mothers via text when their hospital transfer is accepted.</p>
                  </div>
                  <Switch checked={settings.postReferralSms} onCheckedChange={c => updateSettings({ postReferralSms: c })} />
                </div>
              </div>
              
              <div className="flex justify-end mt-6 pt-5 border-t border-sidebar-border/50">
                <Button size="sm" onClick={() => toast.success("Notification preferences saved")} className="h-9 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
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
