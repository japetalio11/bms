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
import { Eye, EyeOff } from "lucide-react"

import { userRepository } from "@/lib/repositories/userRepository"

export function InviteTeamMemberModal({ children, onInviteSuccess }: { children: React.ReactNode, onInviteSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    role: "",
    password: ""
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

    const assignedPassword = formData.password.trim() || generatePassword()
    if (assignedPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        role: formData.role,
        password: assignedPassword,
      }

      await userRepository.inviteStaff(payload)

      toast.success("Team member created successfully!")
      setOpen(false)
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        role: "",
        password: ""
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
      title="Create Staff Member"
      description="Enter the staff member's details and set up their account credentials."
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

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="role" className="text-xs font-medium text-foreground">Role *</Label>
              <Select value={formData.role} onValueChange={(val) => handleSelectChange('role', val)}>
                <SelectTrigger id="role" className="!h-8 w-full bg-card border-border text-xs text-card-foreground">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="Doctor" className="text-xs">Doctor</SelectItem>
                  <SelectItem value="Nurse" className="text-xs">Nurse</SelectItem>
                  <SelectItem value="Midwife" className="text-xs">Midwife</SelectItem>
                  <SelectItem value="HealthWorker" className="text-xs">Health Worker</SelectItem>
                  <SelectItem value="Admin" className="text-xs">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="password" className="text-xs font-medium text-foreground">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  placeholder="Leave empty to auto-generate" 
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="!h-8 pr-8 bg-card border-border text-xs text-card-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
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
            {loading ? "Creating..." : "Create Staff"}
          </Button>
        </div>
    </ResponsiveModal>
  )
}
