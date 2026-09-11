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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutGrid, Users, Calendar, CalendarCheck, ArrowRightLeft, MessageSquare, SlidersHorizontal, ChevronsUpDown, LogOut, FileText } from "lucide-react"
import headerIcon from "@/assets/icon.svg"
import rhuLogo from "@/assets/pili-rhu-logo.jpg"
import { apiClient } from "@/lib/apiClient"

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpenMobile } = useSidebar()

  const [user, setUser] = useState<any>(null)
  const [facilityName, setFacilityName] = useState<string>("Rural Health Unit 1")

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
          apiClient.get(`/api/v1/facility/${parsed.facility_id}`)
            .then(res => {
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

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    localStorage.clear()
    sessionStorage.clear()
    setOpenMobile(false)
    navigate("/")
  }

  const userName = [user?.first_name, user?.middle_name, user?.last_name]
    .filter(Boolean)
    .join(" ") || user?.name || "Healthcare Staff"

  const userEmail = user?.email || "staff@bms.gov.ph"
  const userRole = user?.role || "Specialized Service"
  const profileUrl = user?.profile_url || ""

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col p-0">
        <div className="flex h-14 items-center px-4 gap-2 border-b border-sidebar-border transition-all duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-transparent overflow-hidden transition-all duration-200 ease-linear">
            <img src={headerIcon} alt="Unite Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col overflow-hidden transition-all duration-200 ease-linear max-w-[250px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="text-xl font-semibold text-[#FF3B30] tracking-tight whitespace-nowrap" style={{ fontFamily: "'Poppins', sans-serif" }}>
              unite
            </span>
          </div>
        </div>
        <div className="px-4 pt-2 pb-2 transition-all duration-200 ease-linear group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2 text-left transition-all duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-border bg-transparent overflow-hidden transition-all duration-200 ease-linear">
              <img src={rhuLogo} alt={facilityName} className="h-full w-full object-contain scale-[1.2]" />
            </div>
            <div className="flex flex-col flex-1 text-left overflow-hidden transition-all duration-200 ease-linear max-w-[250px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">
              <span className="text-xs font-medium text-foreground truncate" title={facilityName}>{facilityName}</span>
              <span className="text-[10px] font-normal text-muted-foreground truncate">{userRole}</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Core Operations */}
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100 relative overflow-hidden">
            <span className="transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">Core Operations</span>
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-px bg-sidebar-border opacity-0 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-100" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard' || location.pathname === '/dashboard/'}
                  onClick={() => handleNavigate('/dashboard')}
                >
                  <LayoutGrid className="mr-2" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/mothers'}
                  onClick={() => handleNavigate('/dashboard/mothers')}
                >
                  <Users className="mr-2" />
                  <span>Mothers</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/appointments'}
                  onClick={() => handleNavigate('/dashboard/appointments')}
                >
                  <CalendarCheck className="mr-2" />
                  <span>Appointments</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/calendar'}
                  onClick={() => handleNavigate('/dashboard/calendar')}
                >
                  <Calendar className="mr-2" />
                  <span>Calendar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/ehr'}
                  onClick={() => handleNavigate('/dashboard/ehr')}
                >
                  <FileText className="mr-2" />
                  <span>EHR Records</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/referrals'}
                  onClick={() => handleNavigate('/dashboard/referrals')}
                >
                  <ArrowRightLeft className="mr-2" />
                  <span>Inter-Clinic Referrals</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/messages'}
                  onClick={() => handleNavigate('/dashboard/messages')}
                >
                  <MessageSquare className="mr-2" />
                  <span>Messages</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Administration */}
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100 relative overflow-hidden">
            <span className="transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">System Administration</span>
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-px bg-sidebar-border opacity-0 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-100" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/team'}
                  onClick={() => handleNavigate('/dashboard/team')}
                >
                  <Users className="mr-2" />
                  <span>Team Management</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === '/dashboard/settings'}
                  onClick={() => handleNavigate('/dashboard/settings')}
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
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 ease-linear group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                  <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                    <AvatarImage src={profileUrl} alt={userName} />
                    <AvatarFallback className="rounded-lg text-xs font-semibold">{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 text-left overflow-hidden transition-all duration-200 ease-linear max-w-[250px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 whitespace-nowrap">
                    <span className="truncate font-medium text-xs" title={userName}>{userName}</span>
                    <span className="truncate text-[10px] font-normal text-muted-foreground" title={userEmail}>{userEmail}</span>
                  </div>
                  <div className="transition-all duration-200 ease-linear overflow-hidden whitespace-nowrap max-w-[20px] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 ml-auto">
                    <ChevronsUpDown className="size-4 text-muted-foreground" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-dropdown-menu-trigger-width]">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10 gap-2">
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

