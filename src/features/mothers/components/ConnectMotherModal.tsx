import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, CheckCircle2, AlertCircle, Loader2, Camera, X } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
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
  const [isScanning, setIsScanning] = React.useState(false)
  const scannerRef = React.useRef<Html5Qrcode | null>(null)

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        await scannerRef.current.clear()
      } catch (e) {
        console.error("Error stopping scanner:", e)
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const startScanner = () => {
    setError(null)
    setIsScanning(true)
    setTimeout(async () => {
      try {
        const scannerContainer = document.getElementById("qr-reader")
        if (!scannerContainer) return

        const html5QrCode = new Html5Qrcode("qr-reader")
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            let extracted = decodedText.trim()
            try {
              const parsed = JSON.parse(decodedText)
              extracted = parsed.motherCode || parsed.code || parsed.id || decodedText
            } catch (e) {
              // Raw text string
            }

            setCode(extracted)
            stopScanner()
          },
          () => {
            // Ignore frame scan errors
          }
        )
      } catch (err: any) {
        console.error("Camera scanner initialization error:", err)
        setError("Unable to access camera. Please allow camera permissions or enter code manually.")
        setIsScanning(false)
      }
    }, 150)
  }

  const toggleScanner = () => {
    if (isScanning) {
      stopScanner()
    } else {
      startScanner()
    }
  }

  // Cleanup camera when modal closes or component unmounts
  React.useEffect(() => {
    if (!open) {
      stopScanner()
      setCode("")
      setError(null)
      setSuccessMsg(null)
    }
    return () => {
      stopScanner()
    }
  }, [open])

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
      await stopScanner()
      
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
      onOpenChange={(val) => {
        if (!val) stopScanner()
        onOpenChange(val)
      }}
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

          {/* Perfectly Aligned Input Bar with Integrated Camera Scan Toggle */}
          <div className="relative flex items-center">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground pointer-events-none z-10">
              <QrCode className="h-4 w-4" />
            </div>
            <Input
              id="mother-code"
              placeholder="e.g. MTH-8F3A2190 or scan QR code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="pl-9 pr-24 h-10 font-mono text-xs border-sidebar-border focus-visible:ring-1"
              autoFocus
              disabled={loading}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={toggleScanner}
              disabled={loading}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2 text-[11px] gap-1.5 font-medium transition-colors ${
                isScanning
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              }`}
            >
              {isScanning ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Close
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  Scan QR
                </>
              )}
            </Button>
          </div>

          {/* Live Camera Scanner Viewport */}
          {isScanning && (
            <div className="flex flex-col gap-2 pt-2 animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="relative w-full rounded-xl overflow-hidden border border-primary/30 shadow-inner bg-black min-h-[250px]">
                <div id="qr-reader" className="w-full h-full" />
              </div>
              <p className="text-[11px] text-center text-muted-foreground">
                Point your camera at the QR code displayed on the mother's app screen.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-1">
            Type the code shown on the mother's profile (e.g. MTH-XXXXXXXX) or scan her QR code directly using your camera or a barcode scanner.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              stopScanner()
              onOpenChange(false)
            }}
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
