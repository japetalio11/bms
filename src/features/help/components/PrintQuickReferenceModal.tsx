import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Printer, AlertTriangle } from "lucide-react"

interface PrintQuickReferenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrintQuickReferenceModal({ open, onOpenChange }: PrintQuickReferenceModalProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Clinic Desk Quick Reference Guide"
      description="Printable A4 reference sheet for Rural Health Unit consultation desks and birthing rooms."
      className="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border print:hidden">
          <p className="text-xs text-muted-foreground">
            Formatted for standard A4 / Letter paper. Pin this at the triage desk or nurse station.
          </p>
          <Button onClick={handlePrint} className="gap-2 bg-primary text-primary-foreground text-xs font-semibold">
            <Printer className="h-4 w-4" /> Print Reference Sheet
          </Button>
        </div>

        <div className="rounded-xl border border-border p-6 bg-white dark:bg-zinc-950 text-foreground font-sans space-y-6 print:border-none print:p-0">
          <div className="text-center pb-4 border-b-2 border-primary/30">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Rural Health Unit • Maternal & Neonatal Health Division
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mt-1">
              BMS Web Portal — Clinical Desk Quick Reference
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Standard Operating Protocols for Registration, CDSS Vitals, and Emergency Inter-Clinic Referrals
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> 1. Daily Operating Procedures
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 dark:bg-zinc-900 font-semibold text-slate-700 dark:text-zinc-300">
                  <tr>
                    <th className="p-2 border-b border-r border-slate-200 dark:border-zinc-800 w-1/4">Action</th>
                    <th className="p-2 border-b border-r border-slate-200 dark:border-zinc-800 w-1/3">Where to Click</th>
                    <th className="p-2 border-b border-slate-200 dark:border-zinc-800">Key Information & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-slate-600 dark:text-zinc-400">
                  <tr>
                    <td className="p-2 font-medium text-slate-900 dark:text-zinc-100 border-r border-slate-200 dark:border-zinc-800">Register New Mother</td>
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 font-mono text-[11px]">Header [+ Quick Create] &gt; Register Mother</td>
                    <td className="p-2">Requires PhilHealth No., mobile phone, barangay. Initial mobile password is <strong className="text-primary font-mono">Mother@123</strong>.</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium text-slate-900 dark:text-zinc-100 border-r border-slate-200 dark:border-zinc-800">Record Prenatal Vitals</td>
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 font-mono text-[11px]">Mother Profile &gt; [Log Vitals]</td>
                    <td className="p-2">Enter BP, Weight, Fundic Height (cm), FHT (bpm). Check danger signs to run CDSS risk scoring.</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium text-slate-900 dark:text-zinc-100 border-r border-slate-200 dark:border-zinc-800">Schedule Checkup</td>
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 font-mono text-[11px]">Header [+ Quick Create] &gt; New Appointment</td>
                    <td className="p-2">Automatically queues SMS notification to the mother's registered mobile number.</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium text-slate-900 dark:text-zinc-100 border-r border-slate-200 dark:border-zinc-800">Lock Shift (Desk Break)</td>
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 font-mono text-[11px]">Sidebar Profile Avatar &gt; [Lock Offline Shift]</td>
                    <td className="p-2">Protects patient records with your 4-digit PIN. Unlocks in 2 seconds upon return.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> 2. Clinical Vitals Normal Ranges & CDSS Danger Signs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-zinc-100">Normal Range Guidelines</div>
                <div className="text-[11px] space-y-0.5 text-slate-600 dark:text-zinc-400">
                  <div>• <strong>Blood Pressure:</strong> 90/60 to 120/80 mmHg (Flag if Systolic ≥140 or Diastolic ≥90)</div>
                  <div>• <strong>Fetal Heart Tone (FHT):</strong> 110 to 160 beats per minute (bpm)</div>
                  <div>• <strong>Temperature:</strong> 36.5°C to 37.5°C (Fever is ≥38.0°C)</div>
                  <div>• <strong>Fundic Height:</strong> Approx. gestational weeks in cm (±2 cm) after 20 weeks</div>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 space-y-1">
                <div className="font-semibold text-red-700 dark:text-red-400">Red Flag Obstetric Danger Signs</div>
                <div className="text-[11px] space-y-0.5 text-red-700 dark:text-red-400">
                  <div>1. Vaginal bleeding at any gestational age</div>
                  <div>2. Severe persistent headache or blurring of vision (Pre-eclampsia)</div>
                  <div>3. Generalized facial / upper extremity edema</div>
                  <div>4. Convulsions or loss of consciousness (Eclampsia)</div>
                  <div>5. Premature rupture of membranes / amniotic fluid leakage</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> 3. Emergency Referral Protocol
            </h2>
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs space-y-1 text-slate-700 dark:text-zinc-300">
              <p><strong>Step 1:</strong> Stabilize patient (Secure IV line, start oxygen if indicated, administer loading dose of Magnesium Sulfate if eclamptic).</p>
              <p><strong>Step 2:</strong> Click <strong>+ Quick Create &gt; Create Referral</strong>. Select receiving facility (e.g. BMC or Provincial Hospital) and select 'Emergency'.</p>
              <p><strong>Step 3:</strong> Provide public tracking QR code / link to the ambulance crew and notify receiving ER triage team.</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 text-center text-[10px] text-slate-400">
            Birth Monitoring System (BMS) • Department of Health Clinical Standards • Data Privacy Act of 2012
          </div>
        </div>
      </div>
    </ResponsiveModal>
  )
}
