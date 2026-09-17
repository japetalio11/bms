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
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

import { mothersApi } from "../api"

export function RegisterMotherModal({ 
  children,
  open,
  onOpenChange,
  onSuccess
}: { 
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [step, setStep] = React.useState(1)
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [middleName, setMiddleName] = React.useState("")
  const [dob, setDob] = React.useState<Date>()
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [familySerialNo, setFamilySerialNo] = React.useState("")
  const [civilStatus, setCivilStatus] = React.useState("Single")
  const [bloodType, setBloodType] = React.useState("O+")
  const [password] = React.useState("Mother@123")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setTimeout(() => setStep(1), 300)
      setError(null)
    }
  }, [open])

  const handleRegister = async () => {
    if (!firstName || !lastName || !address || !dob) {
      setError("Please fill in required fields (First name, Last name, Address, Date of Birth)")
      return
    }

    setLoading(true)
    setError(null)

    const userStr = localStorage.getItem("user")
    const user = userStr ? JSON.parse(userStr) : null

    try {
      await mothersApi.registerMother({
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        address,
        phone_number: phone,
        email,
        birth_date: dob.toISOString(),
        civil_status: civilStatus,
        blood_type: bloodType,
        family_serial_no: familySerialNo,
        facility_id: user?.facility_id || null,
        password,
      })

      onSuccess?.()
      onOpenChange?.(false)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to register mother")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal 
      open={open} 
      onOpenChange={onOpenChange}
      title="Register a Mother"
      description={`Step ${step} of 2: ${step === 1 ? 'Demographics' : 'Medical Details'}`}
      trigger={children}
    >
      <div className="flex flex-col gap-6 py-2 overflow-hidden">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-center text-xs text-destructive">
            {error}
          </div>
        )}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-in-out" 
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName" className="text-xs font-medium text-foreground">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Maria" className="!h-8 bg-card border-border text-xs text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName" className="text-xs font-medium text-foreground">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Santos" className="!h-8 bg-card border-border text-xs text-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="middleName" className="text-xs font-medium text-foreground">Middle Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Dela Cruz" className="!h-8 bg-card border-border text-xs text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-foreground">Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full !h-8 justify-start text-left font-normal bg-card border-border text-xs text-foreground",
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
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone" className="text-xs font-medium text-foreground">Phone Number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" className="!h-8 bg-card border-border text-xs text-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-xs font-medium text-foreground">Email <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@example.com" className="!h-8 bg-card border-border text-xs text-foreground" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address" className="text-xs font-medium text-foreground">Address</Label>
              <Textarea 
                id="address" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Complete address including barangay..." 
                className="resize-none h-[80px] bg-card border-border text-xs text-foreground"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
              <Button variant="ghost" onClick={() => onOpenChange?.(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                Next Step
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-2">
              <Label htmlFor="familySerialNo" className="text-xs font-medium text-foreground">Family Serial No. <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input id="familySerialNo" value={familySerialNo} onChange={(e) => setFamilySerialNo(e.target.value)} placeholder="F-2026-001" className="!h-8 bg-card border-border text-xs text-foreground" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-foreground">Civil Status</Label>
                <Select value={civilStatus} onValueChange={setCivilStatus}>
                  <SelectTrigger className="!h-8 bg-card border-border text-xs text-foreground">
                    <SelectValue placeholder="Civil status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                    <SelectItem value="Separated">Separated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-foreground">Blood Type</Label>
                <Select value={bloodType} onValueChange={setBloodType}>
                  <SelectTrigger className="!h-8 bg-card border-border text-xs text-foreground">
                    <SelectValue placeholder="Blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="h-8 text-xs">
                Back
              </Button>
              <Button onClick={handleRegister} disabled={loading} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? "Registering..." : "Register Mother"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  )
}
