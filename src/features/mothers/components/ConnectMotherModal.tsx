import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { mothersApi } from "../api"

export function ConnectMotherModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [code, setCode] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      setError("Please enter or scan a Mother Code.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await mothersApi.assignFacility(code.trim())
      const motherName = res?.user ? `${res.user.first_name} ${res.user.last_name}` : "Mother"
      const facilityName = res?.user?.facility?.facility_name || "your facility"
      
      setSuccessMsg(`${motherName} successfully connected to ${facilityName}!`)
      setCode("")
      
      setTimeout(() => {
        setSuccessMsg(null)
        onOpenChange(false)
        onSuccess?.()
      }, 1500)
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to connect mother to facility.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Connect Self-Registered Mother"
      description="Scan or enter the Mother Code displayed on the patient's mobile app profile to pair her account with your health facility."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="mother-code" className="text-sm font-medium">
            Mother QR Code or ID <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <QrCode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="mother-code"
              placeholder="e.g. MTH-8F3A2190 or paste QR payload"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="pl-9 font-mono"
              autoFocus
              disabled={loading}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Type the code shown on the mother's profile (e.g. MTH-XXXXXXXX) or scan her QR code using a barcode scanner.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !code.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Mother"
            )}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
