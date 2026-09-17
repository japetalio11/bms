import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { AppHeader } from "./AppHeader"
import {
  PlusCircle,
  UserPlus,
  CalendarPlus,
  HeartPulse,
  Send,
  ShieldPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PinSetupModal } from "@/features/auth/components/PinSetupModal"
import { hasPinConfigured } from "@/lib/security/pinSessionStore"

export function DashboardLayout() {
  const [showPinSetup, setShowPinSetup] = useState<boolean>(false)

  useEffect(() => {
    if (!hasPinConfigured()) {
      setShowPinSetup(true)
    }
  }, [])

  return (
    <SidebarProvider>
      <PinSetupModal
        isOpen={showPinSetup}
        onClose={() => setShowPinSetup(false)}
      />
      <AppSidebar />
      <SidebarInset className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <AppHeader />

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full border bg-foreground p-0 text-background shadow-lg hover:bg-foreground/90 md:hidden">
              <PlusCircle className="size-6" />
              <span className="sr-only">Quick Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={12}
            className="w-56 rounded-xl border-border shadow-md md:hidden"
          >
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Quick Create
            </DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-md">
              <UserPlus className="h-4 w-4" />
              <span>Register Mother</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-md">
              <CalendarPlus className="h-4 w-4" />
              <span>New Appointment</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-md">
              <HeartPulse className="h-4 w-4" />
              <span>Log Vitals</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-md">
              <Send className="h-4 w-4" />
              <span>Create Referral</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-md">
              <ShieldPlus className="h-4 w-4" />
              <span>Invite Team Member</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarInset>
    </SidebarProvider>
  )
}
