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
import { ShieldAlert, Check } from "lucide-react"

interface PrivacyPolicyModalProps {
  open: boolean
  onClose: () => void
}

export function PrivacyPolicyModal({ open, onClose }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center gap-2 pb-2 border-b">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <div>
            <DialogTitle className="text-base font-semibold">Privacy Policy</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Compliance with Republic Act No. 10173 (Data Privacy Act of 2012)
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs text-muted-foreground leading-relaxed my-2">
          <div className="rounded-md bg-muted/50 p-3 text-[11px]">
            <p className="font-semibold text-foreground">Data Privacy Commitment</p>
            <p>
              The Birth Monitoring System (BMS) is committed to strictly preserving the privacy, confidentiality, and security of Sensitive Personal Information (SPI) and Personal Health Information (PHI) processed across healthcare facilities.
            </p>
          </div>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">1. Information We Process</h3>
            <p>To deliver maternal care, prenatal monitoring, and referral services, BMS processes:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Health Worker & Admin Profiles:</strong> Names, official email addresses, contact numbers, assigned facility affiliations, and system roles.</li>
              <li><strong>Maternal Health Records:</strong> Demographics, pregnancy history (Gravida/Parity), gestational age, vital signs, lab screening results, risk classifications, and postpartum details.</li>
              <li><strong>Newborn Data:</strong> Birth date/time, birth weight, APGAR scores, sex, and delivery outcome summaries.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">2. Legal Basis & Purpose of Processing</h3>
            <p>
              Processing is conducted pursuant to public health objectives, medical diagnosis, maternal health tracking, and compliance with Philippine Department of Health (DOH) clinical standards under RA 10173.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">3. Data Protection & Security Safeguards</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>In-Transit Encryption:</strong> All data transmitted between client devices and central servers is encrypted via TLS 1.3 (HTTPS).</li>
              <li><strong>Local Storage Protection:</strong> Offline queues stored in client IndexedDB are restricted to the local device origin.</li>
              <li><strong>Access Controls:</strong> Role-Based Access Control (RBAC) ensures health workers can only access patient records assigned to their active facility.</li>
              <li><strong>Audit Logging:</strong> System operations generate immutable audit logs to detect unauthorized access attempts.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">4. Inter-Facility Referral Sharing</h3>
            <p>
              Patient health records are shared only with designated target facilities during official online referrals, secured via unique referral links and PIN verification.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground text-xs">5. Data Subject Rights & Contacts</h3>
            <p>
              Patients and staff retain the right to inspect, correct, or inquire about their stored health records. For data privacy inquiries, contact your local Rural Health Unit Data Protection Officer (DPO).
            </p>
          </section>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button type="button" onClick={onClose} size="sm" className="h-8 text-xs">
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Acknowledge Privacy Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
