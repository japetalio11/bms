import React from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Search, PlusCircle, Moon, Sun, Droplet, UserPlus, Check, CalendarPlus, HeartPulse, Send, ShieldPlus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { useLocation } from "react-router-dom"
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge"
import { NotificationPopover } from "./NotificationPopover"

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  
  const paths = location.pathname.split('/').filter(Boolean)
  const getBreadcrumbName = (path: string) => {
    switch(path) {
      case 'dashboard': return 'Core Operations'
      case 'appointments': return 'Appointments'
      case 'calendar': return 'Calendar'
      case 'mothers': return 'Mothers'
      case 'referrals': return 'Referrals'
      case 'messages': return 'Messages'
      case 'team': return 'Team Management'
      case 'settings': return 'Settings'
      case 'analytics': return 'Analytics'
      default: return path.charAt(0).toUpperCase() + path.slice(1)
    }
  }

  return (
    <header className="bg-card flex h-14 shrink-0 items-center justify-between border-b border-border px-4 text-card-foreground shadow-xs">
      {/* --- DESKTOP LAYOUT --- */}
      <div className="hidden md:flex flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <div className="h-4 w-px bg-border" />
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            {paths.map((path, index) => {
              const isLast = index === paths.length - 1
              const href = `/${paths.slice(0, index + 1).join('/')}`
              
              return (
                <React.Fragment key={path}>
                  <BreadcrumbItem>
                    {!isLast ? (
                      <BreadcrumbLink href={href}>
                        {getBreadcrumbName(path)}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-xs">{getBreadcrumbName(path)}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center cursor-pointer hover:text-foreground transition-colors text-xs font-medium text-muted-foreground">
          Search for mothers, appointments...
        </div>
        
        <div className="h-4 w-px bg-border" />

        <NotificationPopover align="end" />

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground h-8 w-8 relative"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <div className="h-4 w-px bg-border" />
        <OfflineSyncBadge />
        <div className="h-4 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 gap-2 px-2 text-xs font-medium">
              <PlusCircle className="size-3.5" />
              <span>Quick Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-border shadow-md">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Quick Create</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <UserPlus className="h-4 w-4" />
              <span>Register Mother</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <CalendarPlus className="h-4 w-4" />
              <span>New Appointment</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <HeartPulse className="h-4 w-4" />
              <span>Log Vitals</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <Send className="h-4 w-4" />
              <span>Create Referral</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-md">
              <ShieldPlus className="h-4 w-4" />
              <span>Invite Team Member</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* --- MOBILE LAYOUT --- */}
      <div className="flex md:hidden w-full items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-normal">
                {paths.length > 0 ? getBreadcrumbName(paths[paths.length - 1]) : 'Dashboard'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-1">
          <NotificationPopover align="center" />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground h-8 w-8 relative"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <SidebarTrigger className="-mr-1" />
        </div>
      </div>
    </header>
  )
}
