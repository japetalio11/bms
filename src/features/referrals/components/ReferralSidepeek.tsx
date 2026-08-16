import * as React from "react"
import { 
  X, 
  Copy, 
  ChevronDown, 
  User, 
  Calendar, 
  Send, 
  Building2, 
  Clock, 
  AlertTriangle, 
  Activity, 
  Heart, 
  Droplet, 
  Thermometer, 
  Scale,
  History,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ReferralSidepeek({ 
  referral, 
  onClose 
}: { 
  referral: any
  onClose: () => void 
}) {
  if (!referral) return null

  return (
    <div className="flex flex-col h-full bg-background dark:bg-background dark:bg-[#0a0a0a] border-l border-sidebar-border w-full xl:w-[450px]">
      {/* Header */}
      <div className="shrink-0 p-4 pb-4 border-b border-sidebar-border flex items-start justify-between">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground dark:text-white">{referral.motherName}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
              referral.riskFlag === 'High Risk' ? 'bg-red-500/10 text-red-500' : 
              referral.riskFlag === 'Medium Risk' ? 'bg-amber-500/10 text-amber-500' : 
              'bg-green-500/10 text-green-500'
            }`}>
              {referral.riskFlag === 'High Risk' ? <Activity className="h-3 w-3" /> : referral.riskFlag === 'Medium Risk' ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {referral.riskFlag || 'High Risk'}
            </div>
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
              referral.status === 'Accepted' ? 'bg-green-500/10 text-green-500' : 
              referral.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 
              'bg-blue-500/10 text-blue-500'
            }`}>
              {referral.status === 'Accepted' ? <CheckCircle2 className="h-3 w-3" /> : referral.status === 'Pending' ? <Clock className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
              {referral.status}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="hidden md:flex h-6 w-6 text-muted-foreground hover:text-foreground dark:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        
        {/* Handoff Summary */}
        <div className="flex flex-col gap-3 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-white">Handoff Summary</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Patient presents with sudden onset of severe frontal headache and elevated blood pressure at 32 weeks gestation. Suspected early onset pre-eclampsia. Automated Triage flagged as High Risk. IV fluids initiated. Requesting immediate transfer for physician evaluation.
          </p>
        </div>

        {/* Preferred Hospital */}
        <div className="flex flex-col gap-3 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-white">Preferred Hospital</h3>
          <div className="flex items-center justify-between h-8 px-3 rounded-md border border-sidebar-border bg-background dark:bg-[#0a0a0a] text-xs text-foreground dark:text-white">
            <span>{referral.destination || "Bicol Medical Center"}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </div>

        {/* Transfer Patient Record Link */}
        <div className="flex flex-col gap-3 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-white">Transfer Patient Record Link</h3>
          <div className="flex items-center gap-2">
            <Input readOnly value={referral.recordLink} className="h-8 text-xs bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white" />
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 border-sidebar-border text-foreground dark:text-white hover:bg-accent dark:hover:bg-[#1a1a1a]">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <span className="text-[10px] text-muted-foreground">Share this link with partners so they can book dates within this block.</span>
        </div>

        {/* Transfer Code */}
        <div className="flex flex-col gap-3 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-white">Transfer Code</h3>
          <div className="flex items-center gap-2">
            <Input readOnly value={referral.transferCode} className="h-8 text-xs bg-background dark:bg-[#0a0a0a] border-sidebar-border text-foreground dark:text-white" />
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 border-sidebar-border text-foreground dark:text-white hover:bg-accent dark:hover:bg-[#1a1a1a]">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <span className="text-[10px] text-muted-foreground">Share this code with partners so they can access the booking link.</span>
        </div>

        {/* Properties */}
        <div className="flex flex-col gap-5 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-white">Properties</h3>
          
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Patient Demographic</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Patient Name</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">{referral.motherName}</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Gestational Age</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">2nd Trimester (24 Weeks)</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Transfer Logistics</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Send className="h-3.5 w-3.5" />
                <span className="text-xs">Referred By</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">Dr. Reyes (RHU)</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs">Destination Facility</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">{referral.destination}</span>
            </div>

            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Initiated At</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">June 16, 2026 8:00 AM</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Clinical Indicators</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs">Primary Danger Signs</span>
              </div>
              <div className="flex-1 flex gap-2 flex-wrap">
                <span className="inline-flex px-2 py-0.5 rounded-full border border-sidebar-border bg-background dark:bg-[#0a0a0a] text-foreground dark:text-white text-[10px] font-medium">Severe Headache</span>
                <span className="inline-flex px-2 py-0.5 rounded-full border border-sidebar-border bg-background dark:bg-[#0a0a0a] text-foreground dark:text-white text-[10px] font-medium">High Blood Pressure</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-muted-foreground font-medium">Maternal Vitals</span>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Activity className="h-3.5 w-3.5" />
                <span className="text-xs">Blood Pressure</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">120/80 mmHg</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Heart className="h-3.5 w-3.5" />
                <span className="text-xs">Heart Rate</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">75 bpm</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Droplet className="h-3.5 w-3.5" />
                <span className="text-xs">Blood Sugar</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">90 mg/dL</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Thermometer className="h-3.5 w-3.5" />
                <span className="text-xs">Body Temp</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">37.0 C</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[180px] shrink-0">
                <Scale className="h-3.5 w-3.5" />
                <span className="text-xs">Weight</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">65 kg</span>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="flex flex-col gap-4 p-4 pb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground dark:text-white">Activity Log</h3>
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Recent actions performed by this user.</p>
          
          <div className="flex gap-3 mt-1">
            <div className="flex flex-col items-center mt-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground dark:bg-white shrink-0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground dark:text-white">Hospital Accepted Transfer</span>
              <span className="text-[10px] text-muted-foreground">June 16, 2026 8:15AM</span>
            </div>
          </div>

          <div className="flex gap-3 mt-1">
            <div className="flex flex-col items-center mt-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground dark:bg-white shrink-0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground dark:text-white">Initiated referral to Bicol Medical Center</span>
              <span className="text-[10px] text-muted-foreground">June 16, 2026 8:00AM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 pb-8 md:pb-4 border-t border-sidebar-border flex flex-col gap-3">
        <Button className="w-full h-8 text-xs font-medium bg-[#ef4444] text-white hover:bg-[#dc2626] border-none">
          Cancel Transfer
        </Button>
        <Button variant="outline" className="w-full h-8 text-xs font-medium bg-[#1e1e1e] text-white hover:bg-[#2a2a2a] border border-sidebar-border dark:bg-[#1e1e1e] dark:text-white dark:border-sidebar-border">
          Print Transfer Form
        </Button>
      </div>
    </div>
  )
}
