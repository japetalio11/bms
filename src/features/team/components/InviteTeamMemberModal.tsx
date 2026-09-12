import * as React from "react"
import { useState } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

import { userRepository } from "@/lib/repositories/userRepository"

export function InviteTeamMemberModal({ children, onInviteSuccess }: { children: React.ReactNode, onInviteSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    role: "",
    sector: ""
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const generatePassword = () => {
    return Math.random().toString(36).slice(-8) + "Aa1!"
  }

  const handleInvite = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.role) {
      toast.error("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        password: generatePassword(),
      }

      await userRepository.inviteStaff(payload)

      toast.success("Team member invited successfully!")
      setOpen(false)
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        role: "",
        sector: ""
      })
      if (onInviteSuccess) onInviteSuccess()
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal 
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title="Invite Team Member"
      description="Send an invitation to join the platform. A temporary password will be automatically assigned."
    >
        <div className="flex flex-col gap-4 py-2">
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="first_name" className="text-xs font-medium text-foreground">First Name *</Label>
              <Input 
                id="first_name" 
                placeholder="Juan" 
                value={formData.first_name}
                onChange={handleInputChange}
                className="!h-8 bg-card border-border text-xs text-card-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="last_name" className="text-xs font-medium text-foreground">Last Name *</Label>
              <Input 
                id="last_name" 
                placeholder="Dela Cruz" 
                value={formData.last_name}
                onChange={handleInputChange}
                className="!h-8 bg-card border-border text-xs text-card-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="email" className="text-xs font-medium text-foreground">Email Address *</Label>
              <Input 
                id="email" 
                placeholder="name@example.com" 
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="!h-8 bg-card border-border text-xs text-card-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="phone_number" className="text-xs font-medium text-foreground">Phone Number</Label>
              <Input 
                id="phone_number" 
                placeholder="09123456789" 
                value={formData.phone_number}
                onChange={handleInputChange}
                className="!h-8 bg-card border-border text-xs text-card-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="role" className="text-xs font-medium text-foreground">Role *</Label>
              <Select value={formData.role} onValueChange={(val) => handleSelectChange('role', val)}>
                <SelectTrigger id="role" className="!h-8 w-full bg-card border-border text-xs text-card-foreground">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="Admin" className="text-xs">Administrator</SelectItem>
                  <SelectItem value="Manager" className="text-xs">Manager</SelectItem>
                  <SelectItem value="Doctor" className="text-xs">Doctor</SelectItem>
                  <SelectItem value="Nurse" className="text-xs">Nurse</SelectItem>
                  <SelectItem value="Midwife" className="text-xs">Midwife</SelectItem>
                  <SelectItem value="Staff" className="text-xs">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="sector" className="text-xs font-medium text-foreground">Sector</Label>
              <Select value={formData.sector} onValueChange={(val) => handleSelectChange('sector', val)}>
                <SelectTrigger id="sector" className="!h-8 w-full bg-card border-border text-xs text-card-foreground">
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="Local Government Unit" className="text-xs">Local Government Unit</SelectItem>
                  <SelectItem value="NGO" className="text-xs">NGO</SelectItem>
                  <SelectItem value="Private Sector" className="text-xs">Private Sector</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={loading}
            className="flex-1 text-xs font-medium border-border text-foreground hover:bg-accent"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleInvite}
            disabled={loading}
            className="flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Sending..." : "Send Invite"}
          </Button>
        </div>
    </ResponsiveModal>
  )
}
