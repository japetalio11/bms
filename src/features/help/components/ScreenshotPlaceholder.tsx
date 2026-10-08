import * as React from "react"
import { useState } from "react"
import type { ScreenshotMockupConfig } from "../types/helpTypes"
import {
  Maximize2,
  Minimize2,
  Info,
  Sparkles,
  Calendar,
  Users,
  HeartPulse,
  ArrowRightLeft,
  Lock,
  PlusCircle,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScreenshotPlaceholderProps {
  config: ScreenshotMockupConfig
  className?: string
}

export function ScreenshotPlaceholder({ config, className = "" }: ScreenshotPlaceholderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const renderSchematicContent = () => {
    switch (config.layoutType) {
      case "dashboard":
        return (
          <div className="flex h-full w-full bg-slate-50 dark:bg-zinc-950 font-sans text-xs select-none">
            <div className="w-44 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 hidden sm:flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
                <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center font-bold text-primary text-[10px]">BMS</div>
                <div className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200">RHU Clinic 1</div>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-primary/10 text-primary font-medium">
                <div className="h-3 w-3 rounded bg-primary" /> Dashboard
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 text-slate-600 dark:text-zinc-400">
                <Users className="h-3 w-3" /> Mothers
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 text-slate-600 dark:text-zinc-400">
                <Calendar className="h-3 w-3" /> Calendar
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 text-slate-600 dark:text-zinc-400">
                <ArrowRightLeft className="h-3 w-3" /> Referrals
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-10 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 flex items-center justify-between">
                <div className="text-[11px] font-medium text-slate-500">Core Operations / Dashboard</div>
                <div className="flex items-center gap-2">
                  <div className="h-5 px-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] flex items-center gap-1 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
                  </div>
                  <div className="h-6 px-2.5 rounded bg-primary text-white text-[10px] font-medium flex items-center gap-1 shadow-sm">
                    <PlusCircle className="h-3 w-3" /> Quick Create
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="text-[10px] text-slate-500">Active Pregnancies</div>
                    <div className="text-base font-bold text-slate-800 dark:text-zinc-100">128</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="text-[10px] text-slate-500">Today's Visits</div>
                    <div className="text-base font-bold text-slate-800 dark:text-zinc-100">14</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="text-[10px] text-red-600 dark:text-red-400 font-medium">High Risk Alerts</div>
                    <div className="text-base font-bold text-red-600 dark:text-red-400">3</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="text-[10px] text-slate-500">Pending Sync</div>
                    <div className="text-base font-bold text-slate-800 dark:text-zinc-100">0</div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200 mb-2">Today's Appointments Roster</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">Maria Santos (28 y/o)</span>
                        <span className="ml-2 text-slate-400 text-[10px]">Prenatal Visit #3 • 26 wks</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-medium">High Risk</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">Elena Ramos (24 y/o)</span>
                        <span className="ml-2 text-slate-400 text-[10px]">Routine Follow-up • 14 wks</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium">Low Risk</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "register-modal":
        return (
          <div className="flex h-full w-full items-center justify-center bg-slate-900/40 p-4 font-sans text-xs">
            <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-4">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">Register New Mother</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">Step 1 of 3</span>
              </div>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-medium text-slate-500 mb-1">First Name *</div>
                    <div className="h-7 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-2 flex items-center text-slate-800 dark:text-zinc-200">Maria</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-slate-500 mb-1">Last Name *</div>
                    <div className="h-7 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-2 flex items-center text-slate-800 dark:text-zinc-200">Santos</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-medium text-slate-500 mb-1">Date of Birth *</div>
                    <div className="h-7 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-2 flex items-center text-slate-800 dark:text-zinc-200">1996-05-14</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-slate-500 mb-1">Blood Type</div>
                    <div className="h-7 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-2 flex items-center text-slate-800 dark:text-zinc-200">O Positive (O+)</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-slate-500 mb-1">PhilHealth / Family Serial No.</div>
                  <div className="h-7 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-2 flex items-center text-slate-500 font-mono">12-025489123-4</div>
                </div>
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[10px] text-amber-800 dark:text-amber-300">
                  Default Mobile Password: <strong className="font-mono">Mother@123</strong>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="px-3 py-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium">Cancel</div>
                  <div className="px-3 py-1 rounded bg-primary text-white font-medium">Next: Address &gt;</div>
                </div>
              </div>
            </div>
          </div>
        )

      case "profile-vitals":
        return (
          <div className="flex h-full w-full flex-col bg-slate-50 dark:bg-zinc-950 p-3 font-sans text-xs">
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 mb-2 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">Maria Santos</div>
                  <div className="text-[10px] text-slate-500">Gravida 2, Para 1 • EDC: Nov 24, 2026 (28 weeks)</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold border border-red-300 dark:border-red-800">High Risk (MEOWS)</span>
                  <div className="px-2.5 py-1 rounded bg-primary text-white text-[10px] font-medium">+ Log Vitals</div>
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-2">Checkup Vitals & Danger Signs</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="p-2 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <div className="text-[10px] text-slate-500">Blood Pressure</div>
                    <div className="text-sm font-bold text-red-600 dark:text-red-400">145 / 95 mmHg</div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <div className="text-[10px] text-slate-500">Fundic Height</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-zinc-100">28 cm</div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <div className="text-[10px] text-slate-500">Fetal Heart Tone</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-zinc-100">144 bpm</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-red-700 dark:text-red-400">CDSS Warning: Stage 1 Gestational Hypertension</div>
                    <div className="text-[10px] text-red-600 dark:text-red-400">Systolic BP ≥140 mmHg detected. Assess for proteinuria, headache, or visual changes. Consult attending MHO immediately.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "referral":
        return (
          <div className="flex h-full w-full flex-col bg-slate-50 dark:bg-zinc-950 p-3 font-sans text-xs">
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xs mb-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">Inter-Clinic Emergency Referral Slip</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500 text-white font-bold animate-pulse">EMERGENCY</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-500">Patient:</span> <strong className="text-slate-800 dark:text-zinc-200">Maria Santos (28 y/o)</strong>
                </div>
                <div>
                  <span className="text-slate-500">Receiving Hospital:</span> <strong className="text-slate-800 dark:text-zinc-200">Bicol Medical Center (BMC)</strong>
                </div>
                <div>
                  <span className="text-slate-500">Reason:</span> <strong className="text-slate-800 dark:text-zinc-200">Severe Pre-eclampsia (BP 160/100)</strong>
                </div>
                <div>
                  <span className="text-slate-500">Transport:</span> <strong className="text-slate-800 dark:text-zinc-200">RHU Ambulance with Midwife</strong>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 flex flex-col items-center justify-center text-center">
              <div className="h-14 w-14 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-mono font-bold text-xs text-primary mb-1">
                QR CODE
              </div>
              <div className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Public Live Tracking Code: REF-2026-0891</div>
              <div className="text-[10px] text-slate-500 max-w-xs mt-0.5">Receiving ER staff and ambulance crew can scan or tap link to monitor real-time clinical notes.</div>
            </div>
          </div>
        )

      case "offline-pin":
        return (
          <div className="flex h-full w-full items-center justify-center bg-slate-950 p-4 font-sans text-xs">
            <div className="w-64 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 text-center shadow-2xl flex flex-col items-center">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
                <Lock className="h-5 w-5" />
              </div>
              <div className="font-bold text-sm text-zinc-100">Station Locked</div>
              <div className="text-[10px] text-zinc-400 mb-3">Enter your 4-digit quick unlock PIN</div>
              
              <div className="flex gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <div className="h-3 w-3 rounded-full bg-primary" />
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
              </div>

              <div className="grid grid-cols-3 gap-2 w-full max-w-[160px]">
                {["1","2","3","4","5","6","7","8","9","C","0","OK"].map((btn) => (
                  <div key={btn} className="h-8 rounded-lg bg-zinc-800 text-zinc-200 font-semibold flex items-center justify-center text-xs border border-zinc-700/50 hover:bg-zinc-700">
                    {btn}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6 text-center text-slate-400">
            <div>
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/40" />
              <div className="font-medium text-xs text-slate-600 dark:text-zinc-300">{config.title}</div>
              <div className="text-[10px] text-slate-400">{config.caption}</div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={`group relative my-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all ${className}`}>
      <div className="flex h-9 items-center justify-between border-b border-border/80 bg-muted/60 px-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground ml-1">
            bms.portal/{config.layoutType}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline">
            Interface Preview
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit preview" : "Expand preview"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <div className={`relative w-full overflow-hidden transition-all duration-300 bg-black/5 dark:bg-black/30 flex items-center justify-center ${isFullscreen ? "h-[560px]" : "h-72 sm:h-80 lg:h-96"}`}>
        {config.customImageUrl ? (
          <img
            src={config.customImageUrl}
            alt={config.title}
            className="h-full w-full object-contain sm:object-cover object-top"
          />
        ) : (
          renderSchematicContent()
        )}
      </div>

      <div className="border-t border-border/60 bg-card p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-foreground">{config.title}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{config.caption}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
