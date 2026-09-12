import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { apiClient } from "@/lib/apiClient"
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
  Download,
  CheckCircle2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

import { userRepository } from "@/lib/repositories/userRepository"

export function StaffProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [staff, setStaff] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState("")

  const fetchStaffDetails = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await userRepository.getStaffProfile(id)
      if (data) {
        setStaff(data)
        setRole(data.role || data.position || "")
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

  const handleSavePermissions = async () => {
    if (!id) return
    try {
      await userRepository.updateStaffRole(id, role)
      toast.success("Permissions updated successfully")
      fetchStaffDetails()
    } catch (error) {
      console.error("Failed to update role:", error)
      toast.error("Failed to update permissions")
    }
  }

  const handleDeactivate = async () => {
    if (!staff || !id) return
    const is_active = !staff.is_active
    try {
      await userRepository.updateStaffStatus(id, is_active)
      toast.success(`Staff account ${is_active ? 'activated' : 'deactivated'} successfully`)
      fetchStaffDetails()
    } catch (error) {
      console.error("Failed to update status:", error)
      toast.error("Failed to update account status")
    }
  }

  if (loading) {
    return <div className="flex w-full h-full items-center justify-center text-muted-foreground">Loading profile...</div>
  }

  if (!staff) {
    return <div className="flex w-full h-full items-center justify-center text-muted-foreground">Staff not found</div>
  }

  const staffName = `${staff.first_name} ${staff.middle_name ? staff.middle_name + " " : ""}${staff.last_name}`
  const initials = `${staff.first_name?.[0] || ""}${staff.last_name?.[0] || ""}`
  const status = staff.is_active ? "Active" : "Deactivated"

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden bg-background">
      {/* Scrollable Content */}
      <div className="flex-1 flex flex-col gap-4 p-4 pl-3 pr-4 pb-24 md:pb-4 overflow-y-auto min-w-0">
        
        {/* Global Page Header */}
        <div className="flex items-center -mb-2">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 -ml-2" onClick={() => navigate('/dashboard/team')}>
            <ChevronLeft className="h-4 w-4" />
            Back to Team Management
          </Button>
        </div>
        <div className="flex items-center justify-between mt-1 mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Staff Profile & Permissions</h1>
        </div>

        {/* Tier 1: Identity & Employment Profile */}
        <div className="flex flex-col lg:flex-row gap-6 p-5 rounded-xl border border-border bg-card shadow-sm relative">
          
          {/* Left Side (Identity) */}
          <div className="flex items-center gap-4 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0 lg:pr-6">
            <Avatar className="h-16 w-16 border border-border shadow-sm">
              <AvatarImage src={staff.profile_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-card-foreground leading-tight">{staffName}</h2>
                <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${staff.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {staff.is_active ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Center (Facility & Contact Context) */}
          <div className="flex flex-col gap-3 lg:col-span-8 pb-2 lg:pb-0 lg:pl-2 flex-1">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 opacity-70" />
                  Primary Facility
                </span>
                <span className="text-sm font-semibold text-card-foreground">{staff.facility?.facility_name || "N/A"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 opacity-70" />
                  Assigned Zone
                </span>
                <span className="text-sm font-semibold text-card-foreground">{staff.facility?.address || "N/A"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Mail className="h-3 w-3 opacity-70" />
                  Email
                </span>
                <span className="text-sm font-semibold text-card-foreground">{staff.email || "N/A"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Phone className="h-3 w-3 opacity-70" />
                  Phone
                </span>
                <span className="text-sm font-semibold text-card-foreground">{staff.phone_number || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Right Side (Administrative Actions) */}
          <div className="absolute top-5 right-5 hidden lg:flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground">
              Reset Password
            </Button>
            <Button variant="outline" size="sm" className={`h-8 text-xs font-medium ${staff.is_active ? 'border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' : 'border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30'}`} onClick={handleDeactivate}>
              {staff.is_active ? 'Deactivate Account' : 'Activate Account'}
            </Button>
          </div>
          <div className="flex lg:hidden items-center gap-2 mt-4 w-full">
            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs font-medium text-muted-foreground hover:text-foreground border border-border">
              Reset Password
            </Button>
            <Button variant="outline" size="sm" className={`flex-1 h-8 text-xs font-medium ${staff.is_active ? 'border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' : 'border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30'}`} onClick={handleDeactivate}>
              {staff.is_active ? 'Deactivate Account' : 'Activate Account'}
            </Button>
          </div>
        </div>

        {/* Tier 2: The Two-Column Management Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A: Role & Permissions Matrix */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">System Permissions</h3>
              <p className="text-xs text-muted-foreground">Manage module access and clinical authorization levels.</p>
            </div>
            
            <div className="flex flex-col gap-6 p-5 rounded-xl border border-border bg-card shadow-sm">
              
              {/* Global Role Selector */}
              <div className="flex flex-col gap-2 pb-4 border-b border-border/50">
                <label className="text-xs font-medium text-card-foreground">Assigned Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full md:w-[280px] h-9 text-xs border-border bg-card text-card-foreground">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_admin" className="text-xs">System Administrator</SelectItem>
                    <SelectItem value="rhu_midwife" className="text-xs">RHU Midwife/Nurse</SelectItem>
                    <SelectItem value="bhs_worker" className="text-xs">BHS Worker</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Module Permissions */}
              <div className="flex flex-col gap-4">
                
                {/* Module 1 */}
                <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/40 border border-border/30">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Module 1: Maternal Registry & Intake</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mod1-create" defaultChecked className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      <label htmlFor="mod1-create" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-card-foreground">
                        Create and edit Mother profiles.
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mod1-view" defaultChecked className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      <label htmlFor="mod1-view" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-card-foreground">
                        View baseline demographic data.
                      </label>
                    </div>
                  </div>
                </div>

                {/* Module 2 */}
                <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/40 border border-border/30">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Module 2: Clinical Care & CDSS</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mod2-log" defaultChecked={role !== 'bhs_worker'} className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      <label htmlFor="mod2-log" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-card-foreground">
                        Log Vital Signs and Encounter Notes.
                      </label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox id="mod2-cdss" defaultChecked={role === 'system_admin' || role === 'rhu_midwife'} className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="mod2-cdss" className="text-xs font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5 text-card-foreground">
                          Execute CDSS Risk Assessment & Override Triage
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </label>
                        <p className="text-[10px] text-muted-foreground">Restrict to RHU Midwife/Doctor</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mod2-rx" defaultChecked={role !== 'bhs_worker'} className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      <label htmlFor="mod2-rx" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-card-foreground">
                        Add/Edit Prescriptions & Supplements.
                      </label>
                    </div>
                  </div>
                </div>

                {/* Module 3 */}
                <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/40 border border-border/30">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Module 3: Inter-Clinic Referrals</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mod3-out" defaultChecked={role !== 'bhs_worker'} className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      <label htmlFor="mod3-out" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-card-foreground">
                        Initiate outgoing e-Referrals to Hospitals.
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mod3-in" defaultChecked className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      <label htmlFor="mod3-in" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-card-foreground">
                        View incoming referral statuses and transfer codes.
                      </label>
                    </div>
                  </div>
                </div>

                {/* Module 4 */}
                <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/40 border border-border/30">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Module 4: Administration & Analytics</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mod4-export" defaultChecked={role === 'system_admin'} className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      <label htmlFor="mod4-export" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-card-foreground">
                        Export DOH/FHSIS statistical reports.
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mod4-manage" defaultChecked={role === 'system_admin'} className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      <label htmlFor="mod4-manage" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-card-foreground">
                        Manage team members and RBAC settings.
                      </label>
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Action Bar */}
              <div className="flex items-center justify-end gap-2 mt-2 pt-4 border-t border-border/50">
                <Button variant="ghost" size="sm" className="h-9 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setRole(staff.role)}>
                  Discard Changes
                </Button>
                <Button size="sm" className="h-9 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-none" onClick={handleSavePermissions}>
                  Save Permissions
                </Button>
              </div>

            </div>
          </div>

          {/* Column B: Immutable Activity Log */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">Activity & Audit Log</h3>
              <p className="text-xs text-muted-foreground">Recent actions performed by this user.</p>
            </div>
            
            <div className="flex flex-col gap-4 p-5 rounded-xl border border-border bg-card shadow-sm">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Filter logs by patient or action..."
                  className="w-full h-9 pl-8 bg-card border-border text-xs rounded-md shadow-none text-card-foreground"
                />
              </div>

              {/* Vertical Timeline Feed */}
              <div className="flex flex-col mt-2 pl-2 border-l border-border ml-2 space-y-6">
                
                {/* Timeline Item 1 */}
                <div className="relative pl-5">
                  <div className="absolute w-2 h-2 bg-primary rounded-full -left-[4.5px] top-1 ring-4 ring-card" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-card-foreground leading-tight">
                      Logged Vitals & Triggered CDSS
                    </span>
                    <span className="text-xs text-muted-foreground">for <span className="font-medium text-card-foreground">Maria Santos</span></span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Activity className="h-3 w-3" /> Today, 10:45 AM
                    </span>
                  </div>
                </div>

                {/* Timeline Item 2 */}
                <div className="relative pl-5">
                  <div className="absolute w-2 h-2 bg-muted-foreground/40 rounded-full -left-[4.5px] top-1 ring-4 ring-card" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-card-foreground leading-tight">
                      Initiated Referral
                    </span>
                    <span className="text-xs text-muted-foreground">to <span className="font-medium text-card-foreground">Bicol Medical Center</span> for <span className="font-medium text-card-foreground">Anna Ramuel</span></span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Yesterday, 2:15 PM
                    </span>
                  </div>
                </div>

                {/* Timeline Item 3 */}
                <div className="relative pl-5">
                  <div className="absolute w-2 h-2 bg-muted-foreground/40 rounded-full -left-[4.5px] top-1 ring-4 ring-card" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-card-foreground leading-tight">
                      Registered New Mother
                    </span>
                    <span className="text-xs text-muted-foreground">Patient: <span className="font-medium text-card-foreground">Jessa Dimaculangan</span></span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <UserPlus className="h-3 w-3" /> June 15, 2026, 9:00 AM
                    </span>
                  </div>
                </div>

                {/* Timeline Item 4 */}
                <div className="relative pl-5">
                  <div className="absolute w-2 h-2 bg-muted-foreground/40 rounded-full -left-[4.5px] top-1 ring-4 ring-card" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-card-foreground leading-tight">
                      Exported DOH Report
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Download className="h-3 w-3" /> June 01, 2026, 5:00 PM
                    </span>
                  </div>
                </div>

              </div>

              {/* Pagination */}
              <Button variant="outline" size="sm" className="w-full mt-4 h-8 text-[11px] font-medium border-border bg-card text-card-foreground hover:bg-accent">
                Load More
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
