import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function LogVitalsModal({ 
  children,
  open,
  onOpenChange
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <ResponsiveModal 
      open={open}
      onOpenChange={onOpenChange}
      trigger={children}
      title="Log Vitals"
      description="Record the clinical measurements for this encounter."
    >
      <div className="flex flex-col gap-6 py-2">
        {/* Section 1: Clinical Danger Signs */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wider text-red-500">Clinical Danger Signs</h4>
          <div className="flex flex-col gap-3 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
            <div className="flex items-center space-x-2">
              <Checkbox id="danger1" className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" />
              <Label htmlFor="danger1" className="text-xs font-medium text-red-800 dark:text-red-200 cursor-pointer">
                Any type of vaginal bleeding
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="danger2" className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" />
              <Label htmlFor="danger2" className="text-xs font-medium text-red-800 dark:text-red-200 cursor-pointer">
                Headache, dizziness, and blurred vision
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="danger3" className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" />
              <Label htmlFor="danger3" className="text-xs font-medium text-red-800 dark:text-red-200 cursor-pointer">
                Puffiness of the face and hands
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="danger4" className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" />
              <Label htmlFor="danger4" className="text-xs font-medium text-red-800 dark:text-red-200 cursor-pointer">
                Being pale or anemic
              </Label>
            </div>
          </div>
        </div>

        {/* Section 2: Maternal Vitals */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wider">Maternal Vitals</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sys" className="text-xs text-muted-foreground">Systolic (mmHg)</Label>
              <Input id="sys" type="number" placeholder="120" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dia" className="text-xs text-muted-foreground">Diastolic (mmHg)</Label>
              <Input id="dia" type="number" placeholder="80" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hr" className="text-xs text-muted-foreground">Heart Rate (bpm)</Label>
              <Input id="hr" type="number" placeholder="85" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="temp" className="text-xs text-muted-foreground">Body Temp (°C)</Label>
              <Input id="temp" type="number" step="0.1" placeholder="36.5" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sugar" className="text-xs text-muted-foreground">Blood Sugar (mg/dL)</Label>
              <Input id="sugar" type="number" placeholder="95" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weight" className="text-xs text-muted-foreground">Weight (kg)</Label>
              <Input id="weight" type="number" step="0.1" placeholder="65.2" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resp" className="text-xs text-muted-foreground">Resp Rate (cpm)</Label>
              <Input id="resp" type="number" placeholder="18" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="o2" className="text-xs text-muted-foreground">O2 Saturation (%)</Label>
              <Input id="o2" type="number" placeholder="98" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
          </div>
        </div>

        {/* Section 3: Fetal & Visit Metrics */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wider">Fetal & Visit Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gest" className="text-xs text-muted-foreground">Gestational Age (Weeks)</Label>
              <Input id="gest" type="number" placeholder="24" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fht" className="text-xs text-muted-foreground">Fetal Heart Tone (bpm)</Label>
              <Input id="fht" type="number" placeholder="140" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fundic" className="text-xs text-muted-foreground">Fundic Height (cm)</Label>
              <Input id="fundic" type="number" placeholder="24" className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4 border-t border-sidebar-border mt-2">
        <Button variant="ghost" className="h-8 text-xs text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/5" onClick={() => onOpenChange?.(false)}>
          Cancel
        </Button>
        <Button className="h-8 text-xs bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
          Run Risk Triage
        </Button>
      </div>
    </ResponsiveModal>
  )
}
