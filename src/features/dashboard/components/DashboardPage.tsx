import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Clock, MapPin, Car, ArrowRight, RefreshCw, MoreVertical, Plus, Download, Activity, CheckCircle2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { AppointmentSidepeek } from "./AppointmentSidepeek"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"

export function DashboardPage() {
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col gap-12 max-w-[900px] mx-auto px-8 pb-8 pt-10 w-full text-foreground">
      {/* Greeting Section */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Good morning, Joseph Angelo! 👋</h1>
        <p className="text-sm text-muted-foreground">Let's get back to work</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground truncate pr-2">Active Pregnancies</CardTitle>
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white shrink-0">
              <TrendingUp className="h-3 w-3 shrink-0" />
              +5%
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-4">45</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span className="truncate pr-2">Trending up this month</span>
                <TrendingUp className="h-3 w-3 text-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground truncate">Total registered expectant mothers</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground truncate pr-2">Appointments Today</CardTitle>
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white shrink-0">
              <Clock className="h-3 w-3 shrink-0" />
              Ongoing
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-4">8</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span className="truncate pr-2">3 in waiting room</span>
                <Clock className="h-3 w-3 text-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground truncate">Scheduled for today's queue</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground truncate pr-2">High-Risk Profiles</CardTitle>
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white shrink-0">
              <TrendingDown className="h-3 w-3 shrink-0" />
              -10%
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-4 text-red-500">2</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span className="truncate pr-2">Decrease since last week</span>
                <TrendingDown className="h-3 w-3 text-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground truncate">Requires immediate attention</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="bg-white dark:bg-[#111] border-sidebar-border text-foreground shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground truncate pr-2">Pending Syncs</CardTitle>
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white dark:bg-[#111] border border-sidebar-border text-black dark:text-white shrink-0">
              <RefreshCw className="h-3 w-3 shrink-0" />
              Queued
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-4">1</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span className="truncate pr-2">Auto-sync in 5 mins</span>
                <RefreshCw className="h-3 w-3 text-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground truncate">Waiting for network connection</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">Upcoming Appointments</h2>

        <Tabs defaultValue="today" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-auto justify-start rounded-md p-1 gap-1 *:flex-1 md:*:flex-initial overflow-x-auto no-scrollbar">
              <TabsTrigger value="today" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Today's Queue</TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Upcoming</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Completed</TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs font-medium data-[state=active]:!bg-background data-[state=active]:border-border data-[state=active]:text-foreground dark:data-[state=active]:!bg-black dark:data-[state=active]:border-[#333] dark:data-[state=active]:text-foreground dark:text-white border border-transparent text-muted-foreground hover:text-muted-foreground dark:text-white/70 dark:hover:text-foreground dark:text-foreground dark:text-white rounded-sm px-2 py-1 h-full transition-all">Cancelled</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:text-foreground dark:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button variant="outline" className="hidden md:flex h-8 px-2 text-xs font-medium gap-2 border-sidebar-border !bg-background text-foreground hover:text-foreground hover:bg-accent dark:!bg-black dark:text-foreground dark:text-white dark:hover:text-foreground dark:text-foreground dark:text-white dark:hover:bg-accent dark:hover:bg-white/5">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button className="w-full md:w-auto h-8 px-2 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
                <Plus className="h-3.5 w-3.5" />
                New Appointment
              </Button>
            </div>
          </div>

          <TabsContent value="today" className="m-0">
            {/* Mobile Card List */}
            <div className="flex md:hidden flex-col gap-4">
              <div 
                className="flex flex-col p-4 rounded-xl border border-sidebar-border bg-card dark:bg-[#111] gap-4 cursor-pointer hover:border-foreground/20 transition-colors"
                onClick={() => setSelectedAppointment({ motherName: 'Maria Santos', risk: 'High Risk', status: 'Confirmed', type: 'Prenatal', datetime: 'June 16, 2026 - 8:00 AM' })}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground dark:text-white">Maria Santos</h3>
                  <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-red-500/10 text-red-500 shrink-0"><Activity className="h-3 w-3" />High Risk</Badge>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Appointment Status</span>
                    <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-blue-500/10 text-blue-500"><CheckCircle2 className="h-3 w-3" />Confirmed</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <span className="text-xs text-foreground dark:text-white">Prenatal</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Date & Time</span>
                    <span className="text-xs text-foreground dark:text-white">June 16, 2026 - 8:00 AM</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-sidebar-border">
                  <span className="text-xs text-foreground dark:text-white font-medium">Actions</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-border shadow-md">
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md">View Profile</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Edit Appointment</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs text-[#ff7373] focus:text-[#ff7373] focus:bg-[#ff7373]/10 cursor-pointer rounded-md">Cancel</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Desktop Data Table */}
            <div className="hidden md:block rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
              <Table>
                <TableHeader className="bg-card dark:bg-[#111]">
                  <TableRow className="border-sidebar-border hover:bg-transparent">
                    <TableHead className="w-12 text-center pl-4"><Checkbox className="border-sidebar-border" /></TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Mother Name</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Risk Flag</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Appointment Status</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Type</TableHead>
                    <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Date & Time</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow 
                    className="border-sidebar-border hover:bg-accent dark:hover:bg-white/5 cursor-pointer"
                    onClick={() => setSelectedAppointment({ motherName: 'Maria Santos', risk: 'High Risk', status: 'Confirmed', type: 'Prenatal', datetime: 'June 16, 2026 - 8:00 AM' })}
                  >
                    <TableCell className="pl-4"><Checkbox className="border-sidebar-border" /></TableCell>
                    <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Maria Santos</TableCell>
                    <TableCell>
                      <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-red-500/10 text-red-500"><Activity className="h-3 w-3" />High Risk</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-blue-500/10 text-blue-500"><CheckCircle2 className="h-3 w-3" />Confirmed</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">Prenatal</TableCell>
                    <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">June 16, 2026 - 8:00 AM</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white hover:bg-transparent" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-border shadow-md">
                          <DropdownMenuItem className="text-xs cursor-pointer rounded-md">View Profile</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs cursor-pointer rounded-md">Edit Appointment</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs text-[#ff7373] focus:text-[#ff7373] focus:bg-[#ff7373]/10 cursor-pointer rounded-md">Cancel</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="upcoming">
            <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No upcoming appointments.
            </div>
          </TabsContent>
          <TabsContent value="completed">
            <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No completed appointments.
            </div>
          </TabsContent>
          <TabsContent value="cancelled">
            <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No cancelled appointments.
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop Floating Sidepeek Overlay */}
      {!isMobile && (
        <div 
          className={`fixed top-0 right-0 h-screen w-[100%] sm:w-[450px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${selectedAppointment ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <AppointmentSidepeek appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} />
        </div>
      )}

      {/* Mobile Sidepeek Drawer (from underneath with drag-to-dismiss) */}
      {isMobile && (
        <Drawer open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
          <DrawerContent className="p-0 bg-background dark:bg-background dark:bg-[#0a0a0a] border-t border-sidebar-border border-x-0 border-b-0 before:hidden rounded-t-xl overflow-hidden !h-[85dvh] flex flex-col focus-visible:outline-none">
            <div className="sr-only">
              <DrawerTitle>Appointment Details</DrawerTitle>
            </div>
            <AppointmentSidepeek appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
