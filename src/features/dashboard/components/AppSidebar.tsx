import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutGrid,
  Users,
  Calendar,
  CalendarCheck,
  ArrowRightLeft,
  MessageSquare,
  SlidersHorizontal,
  ChevronsUpDown,
  LogOut,
  FileText,
  Lock,
} from "lucide-react"
import headerIcon from "@/assets/icon.svg"
import rhuLogo from "@/assets/pili-rhu-logo.jpg"
import { apiClient } from "@/lib/apiClient"
import { db } from "@/lib/db/bmsDatabase"
import { lockPinSession, clearPinConfig } from "@/lib/security/pinSessionStore"

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpenMobile } = useSidebar()

  const [user, setUser] = useState<any>(null)
  const [facilityName, setFacilityName] = useState<string>(
    "Rural Health Unit 1"
  )

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        setUser(parsed)

        if (parsed.facility_name) {
          setFacilityName(parsed.facility_name)
        } else if (parsed.facility?.facility_name) {
          setFacilityName(parsed.facility.facility_name)
        } else if (parsed.facility_id) {
          apiClient
            .get(`/api/v1/facility/${parsed.facility_id}`)
            .then((res) => {
              const fac = res.data?.result || res.data?.data || res.data
              if (fac?.facility_name) {
                setFacilityName(fac.facility_name)
              }
            })
            .catch(() => {})
        }
      } catch (err) {
        console.error("Failed to parse user from localStorage", err)
      }
    }
  }, [])

  const handleNavigate = (path: string) => {
    setOpenMobile(false)
    setTimeout(() => {
      navigate(path)
    }, 350)
  }

  const handleLogout = async () => {
    try {
      const pendingCount = await db.offlineQueue.count()
      if (pendingCount > 0) {
        const confirmLogout = window.confirm(
          `You have ${pendingCount} unsynced offline change(s) in your queue. Logging out now will clear the local patient cache on this device. Do you wish to proceed?`
        )
        if (!confirmLogout) return
      }
      await db.clearClinicalCache(false)
    } catch (err) {
      console.warn("Error cleaning up offline database on logout:", err)
    } finally {
      clearPinConfig()
      localStorage.removeItem("user")
      localStorage.removeItem("token")
      localStorage.clear()
      sessionStorage.clear()
      setOpenMobile(false)
      navigate("/")
    }
  }

  const userName =
    [user?.first_name, user?.middle_name, user?.last_name]
      .filter(Boolean)
      .join(" ") ||
    user?.name ||
    "Healthcare Staff"

  const userEmail = user?.email || "staff@bms.gov.ph"
  const userRole = user?.role || "Specialized Service"
  const profileUrl = user?.profile_url || ""

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col p-0">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 transition-all duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent transition-all duration-200 ease-linear">
            <img
              src={headerIcon}
              alt="BMS Logo"
              className="h-full w-full object-contain dark:invert"
            />
          </div>
          <div className="flex max-w-[250px] flex-col overflow-hidden transition-all duration-200 ease-linear group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="text-xl font-bold tracking-wider whitespace-nowrap text-foreground uppercase">
              BMS
            </span>
          </div>
        </div>
        <div className="px-4 pt-2 pb-2 transition-all duration-200 ease-linear group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2 text-left transition-all duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent ring-1 ring-border transition-all duration-200 ease-linear">
              <img
                src={rhuLogo}
                alt={facilityName}
                className="h-full w-full scale-[1.2] object-contain"
              />
            </div>
            <div className="flex max-w-[250px] flex-1 flex-col overflow-hidden text-left whitespace-nowrap transition-all duration-200 ease-linear group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
              <span
                className="truncate text-xs font-medium text-foreground"
                title={facilityName}
              >
                {facilityName}
              </span>
              <span className="truncate text-[10px] font-normal text-muted-foreground">
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="relative overflow-hidden group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100">
            <span className="whitespace-nowrap transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0">
              Core Operations
            </span>
            <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-sidebar-border opacity-0 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-100" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={
                    location.pathname === "/dashboard" ||
                    location.pathname === "/dashboard/"
                  }
                  onClick={() => handleNavigate("/dashboard")}
                >
                  <LayoutGrid className="mr-2" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/dashboard/mothers"}
                  onClick={() => handleNavigate("/dashboard/mothers")}
                >
                  <Users className="mr-2" />
                  <span>Mothers</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/dashboard/appointments"}
                  onClick={() => handleNavigate("/dashboard/appointments")}
                >
                  <CalendarCheck className="mr-2" />
                  <span>Appointments</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/dashboard/calendar"}
                  onClick={() => handleNavigate("/dashboard/calendar")}
                >
                  <Calendar className="mr-2" />
                  <span>Calendar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/dashboard/ehr"}
                  onClick={() => handleNavigate("/dashboard/ehr")}
                >
                  <FileText className="mr-2" />
                  <span>EHR Records</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/dashboard/referrals"}
                  onClick={() => handleNavigate("/dashboard/referrals")}
                >
                  <ArrowRightLeft className="mr-2" />
                  <span>Inter-Clinic Referrals</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/dashboard/messages"}
                  onClick={() => handleNavigate("/dashboard/messages")}
                >
                  <MessageSquare className="mr-2" />
                  <span>Messages</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="relative overflow-hidden group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100">
            <span className="whitespace-nowrap transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0">
              System Administration
            </span>
            <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-sidebar-border opacity-0 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-100" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/dashboard/team"}
                  onClick={() => handleNavigate("/dashboard/team")}
                >
                  <Users className="mr-2" />
                  <span>Team Management</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/dashboard/settings"}
                  onClick={() => handleNavigate("/dashboard/settings")}
                >
                  <SlidersHorizontal className="mr-2" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="transition-all duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!p-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                    <AvatarImage src={profileUrl} alt={userName} />
                    <AvatarFallback className="rounded-lg text-xs font-semibold">
                      {userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex max-w-[250px] flex-1 flex-col overflow-hidden text-left whitespace-nowrap transition-all duration-200 ease-linear group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                    <span
                      className="truncate text-xs font-medium"
                      title={userName}
                    >
                      {userName}
                    </span>
                    <span
                      className="truncate text-[10px] font-normal text-muted-foreground"
                      title={userEmail}
                    >
                      {userEmail}
                    </span>
                  </div>
                  <div className="ml-auto max-w-[20px] overflow-hidden whitespace-nowrap transition-all duration-200 ease-linear group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                    <ChevronsUpDown className="size-4 text-muted-foreground" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => lockPinSession()}
                  className="cursor-pointer gap-2"
                >
                  <Lock className="h-4 w-4 text-amber-500" />
                  Lock Offline Shift
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer gap-2 text-red-500 focus:bg-red-500/10 focus:text-red-500"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
