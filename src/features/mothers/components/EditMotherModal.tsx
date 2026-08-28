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

export function EditMotherModal({
  open,
  onOpenChange,
  motherData,
  onSuccess
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  motherData?: any
  onSuccess?: () => void
}) {
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
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (motherData) {
      setFirstName(motherData.user?.first_name || motherData.first_name || "")
      setLastName(motherData.user?.last_name || motherData.last_name || "")
      setMiddleName(motherData.user?.middle_name || motherData.middle_name || "")
      setPhone(motherData.user?.phone_number || motherData.phone_number || "")
      setEmail(motherData.user?.email || motherData.email || "")
      setAddress(motherData.user?.address || motherData.address || "")
      setFamilySerialNo(motherData.family_serial_no || "")
      setCivilStatus(motherData.civil_status || "Single")
      setBloodType(motherData.blood_type || "O+")
      const rawDob = motherData.birth_date || motherData.date_of_birth || motherData.user?.birth_date || motherData.user?.date_of_birth
      if (rawDob) {
        setDob(new Date(rawDob))
      }
    }
  }, [motherData, open])

  const handleSave = async () => {
    if (!firstName || !lastName || !address || !dob) {
      setError("Please fill in required fields (First name, Last name, Address, Date of Birth)")
      return
    }

    setLoading(true)
    setError(null)

    const motherId = motherData?.mother_id || motherData?.user_id || motherData?._id || motherData?.id

    try {
      await mothersApi.updateMother(motherId, {
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
      })

      onSuccess?.()
      onOpenChange?.(false)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to update mother profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Mother Profile"
      description="Update demographic and baseline medical details."
    >
      <div className="flex flex-col gap-4 py-2 overflow-hidden">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-center text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="editFirstName" className="text-xs font-medium text-foreground dark:text-white">First Name</Label>
            <Input id="editFirstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="editLastName" className="text-xs font-medium text-foreground dark:text-white">Last Name</Label>
            <Input id="editLastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="editMiddleName" className="text-xs font-medium text-foreground dark:text-white">Middle Name</Label>
            <Input id="editMiddleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
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
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="editPhone" className="text-xs font-medium text-foreground dark:text-white">Phone Number</Label>
            <Input id="editPhone" value={phone} onChange={(e) => setPhone(e.target.value)} className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="editEmail" className="text-xs font-medium text-foreground dark:text-white">Email</Label>
            <Input id="editEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="editFamilySerialNo" className="text-xs font-medium text-foreground dark:text-white">Serial No.</Label>
            <Input id="editFamilySerialNo" value={familySerialNo} onChange={(e) => setFamilySerialNo(e.target.value)} className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-foreground dark:text-white">Civil Status</Label>
            <Select value={civilStatus} onValueChange={setCivilStatus}>
              <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
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
            <Label className="text-xs font-medium text-foreground dark:text-white">Blood Type</Label>
            <Select value={bloodType} onValueChange={setBloodType}>
              <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="editAddress" className="text-xs font-medium text-foreground dark:text-white">Address</Label>
          <Textarea
            id="editAddress"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="resize-none h-[70px] bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-sidebar-border mt-2">
          <Button variant="ghost" onClick={() => onOpenChange?.(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="h-8 text-xs bg-[#111] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
