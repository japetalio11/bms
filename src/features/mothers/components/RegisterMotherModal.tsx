import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function RegisterMotherModal({ 
  children,
  open,
  onOpenChange
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [step, setStep] = React.useState(1)
  const [dob, setDob] = React.useState<Date>()
  const [lmp, setLmp] = React.useState<Date>()
  const [edd, setEdd] = React.useState<Date>()

  // Reset step when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => setStep(1), 300) // Reset after animation
    }
  }, [open])

  return (
    <ResponsiveModal 
      open={open} 
      onOpenChange={onOpenChange}
      title="Register a Mother"
      description={`Step ${step} of 2: ${step === 1 ? 'Demographics' : 'Obstetric History'}`}
      trigger={children}
    >
      <div className="flex flex-col gap-6 py-2 overflow-hidden">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-sidebar-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#111] dark:bg-white transition-all duration-300 ease-in-out" 
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName" className="text-xs font-medium text-foreground dark:text-white">First Name</Label>
                <Input id="firstName" placeholder="Maria" className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName" className="text-xs font-medium text-foreground dark:text-white">Last Name</Label>
                <Input id="lastName" placeholder="Santos" className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="middleName" className="text-xs font-medium text-foreground dark:text-white">Middle Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input id="middleName" placeholder="Dela Cruz" className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-foreground dark:text-white">Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full !h-8 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                        !dob && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dob ? format(dob, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dob}
                      onSelect={setDob}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone" className="text-xs font-medium text-foreground dark:text-white">Phone Number</Label>
                <Input id="phone" type="number" placeholder="09123456789" className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-xs font-medium text-foreground dark:text-white">Email <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input id="email" type="email" placeholder="maria@example.com" className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address" className="text-xs font-medium text-foreground dark:text-white">Address</Label>
              <Textarea 
                id="address" 
                placeholder="Complete address including barangay..." 
                className="resize-none h-[80px] bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-sidebar-border mt-2">
              <Button variant="ghost" onClick={() => onOpenChange?.(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} className="h-8 text-xs bg-[#111] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                Next Step
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="gravidity" className="text-xs font-medium text-foreground dark:text-white">Gravidity (G)</Label>
                <Input id="gravidity" type="number" min="0" placeholder="0" className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="parity" className="text-xs font-medium text-foreground dark:text-white">Parity (P)</Label>
                <Input id="parity" type="number" min="0" placeholder="0" className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-foreground dark:text-white">Last Menstrual Period (LMP)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full !h-8 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                        !lmp && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {lmp ? format(lmp, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={lmp}
                      onSelect={setLmp}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-foreground dark:text-white">Estimated Due Date (EDD)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full !h-8 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs",
                        !edd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {edd ? format(edd, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={edd}
                      onSelect={setEdd}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-foreground dark:text-white">Allergies</Label>
                <Select>
                  <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
                    <SelectValue placeholder="Select allergy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="penicillin">Penicillin</SelectItem>
                    <SelectItem value="latex">Latex</SelectItem>
                    <SelectItem value="sulfa">Sulfa Drugs</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-foreground dark:text-white">Allergy Severity</Label>
                <div className="flex gap-2">
                  <Select>
                    <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 text-destructive border-sidebar-border bg-background dark:bg-[#0a0a0a]">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-sidebar-border mt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="h-8 text-xs">
                Back
              </Button>
              <Button onClick={() => onOpenChange?.(false)} className="h-8 text-xs bg-[#111] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                Register Mother
              </Button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  )
}
