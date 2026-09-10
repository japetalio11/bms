import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShieldCheck, FileText } from "lucide-react"

interface TermsOfServiceModalProps {
  open: boolean
  onClose: () => void
}

export function TermsOfServiceModal({ open, onClose }: TermsOfServiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center gap-2 pb-2 border-b">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <DialogTitle className="text-base font-semibold">Terms of Service</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Birth Monitoring System (BMS) — Healthcare Terms & End-User License Agreement
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs text-muted-foreground leading-relaxed my-2">
          <div className="rounded-md bg-muted/50 p-3 text-[11px]">
            <p className="font-semibold text-foreground">Effective Date: September 2026</p>
            <p>
              Please read these Terms of Service carefully before utilizing the Birth Monitoring System (BMS) platform, software tools, decision support algorithms, and related mobile/web services.
            </p>
          </div>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">1. System Purpose & Authorized Scope</h3>
            <p>
              The Birth Monitoring System (BMS) is a dedicated digital maternal health monitoring and clinical decision-support application. Access is restricted to authorized healthcare personnel (Doctors, Nurses, Midwives, Health Workers) and registered healthcare facilities (RHUs, Hospitals, Lying-In Clinics, Barangay Health Stations).
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">2. Clinical Decision Support System (CDSS) Disclaimer</h3>
            <p>
              Automated clinical alerts, pregnancy risk scores, and supplementation recommendations provided by the BMS CDSS module are designed strictly to assist health workers in decision-making. 
              <strong> They do not replace professional medical judgment.</strong> Licensed healthcare practitioners remain sole authority and responsible party for patient diagnosis, treatment planning, and emergency obstetric care.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">3. User Credentials & Facility Administration</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>Facility Administrators are responsible for creating, verifying, and revoking staff access.</li>
              <li>Users must maintain password confidentiality and report compromised credentials immediately.</li>
              <li>Unauthorized access or sharing of facility credentials is strictly prohibited.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">4. Patient Records & Data Integrity</h3>
            <p>
              Health workers must ensure accuracy and timeliness when recording prenatal visits, lab screenings, delivery outcomes, and newborn metrics. All entries are bound to immutable audit logs tracking user operations for quality assurance and legal compliance.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">5. Offline Synchronization & Service Availability</h3>
            <p>
              BMS provides offline caching via local browser storage (IndexedDB) to maintain service in remote areas. Users agree to sync queued offline records as soon as internet connectivity is re-established.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">6. Modifications & Contact</h3>
            <p>
              These terms may be updated periodically to reflect evolving Department of Health (DOH) directives and statutory privacy standards. For technical or administrative inquiries, contact your Facility System Administrator.
            </p>
          </section>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button type="button" onClick={onClose} size="sm" className="h-8 text-xs">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            I Understand & Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
