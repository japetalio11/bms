import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  X,
  Upload,
} from "lucide-react"
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
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

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

  const connectMotherWithCode = async (targetCode: string) => {
    let clean = targetCode.trim()
    if (!clean) {
      setError("Please enter or scan a Mother Code.")
      return
    }

    if (clean.includes("{") && clean.includes("}")) {
      try {
        const start = clean.indexOf("{")
        const end = clean.lastIndexOf("}")
        const parsed = JSON.parse(clean.substring(start, end + 1))
        clean = (
          parsed.mother_id ||
          parsed.user_id ||
          parsed.motherCode ||
          parsed.code ||
          parsed.id ||
          clean
        ).trim()
      } catch (e) {}
    }

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await mothersApi.assignFacility(clean)
      const motherName = res?.user
        ? `${res.user.first_name} ${res.user.last_name}`
        : "Mother"
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
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to connect mother to facility."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const html5QrCode = new Html5Qrcode("qr-file-scanner-hidden")
      const decodedText = await html5QrCode.scanFile(file, true)
      await html5QrCode.clear()

      let extracted = decodedText.trim()
      try {
        const parsed = JSON.parse(decodedText)
        extracted =
          parsed.mother_id ||
          parsed.user_id ||
          parsed.motherCode ||
          parsed.code ||
          parsed.id ||
          decodedText
      } catch (err) {}

      setCode(extracted)
      await connectMotherWithCode(extracted)
    } catch (err: any) {
      setError(
        "Could not read a valid QR code from this image. Please ensure the QR code is clearly visible or enter the code manually."
      )
    } finally {
      setLoading(false)
      if (e.target) e.target.value = ""
    }
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

        const scanConfig = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            return {
              width: Math.max(200, Math.floor(minEdge * 0.8)),
              height: Math.max(200, Math.floor(minEdge * 0.8)),
            }
          },
          aspectRatio: 1.0,
        }

        const onScanSuccess = async (decodedText: string) => {
          let extracted = decodedText.trim()
          try {
            const parsed = JSON.parse(decodedText)

            extracted =
              parsed.mother_id ||
              parsed.user_id ||
              parsed.motherCode ||
              parsed.code ||
              parsed.id ||
              decodedText
          } catch (e) {}

          setCode(extracted)
          await stopScanner()
          await connectMotherWithCode(extracted)
        }

        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            scanConfig,
            onScanSuccess,
            () => {}
          )
        } catch (camErr) {
          console.warn(
            "Environment camera not available, falling back to default/user camera:",
            camErr
          )
          try {
            await html5QrCode.start(
              { facingMode: "user" },
              scanConfig,
              onScanSuccess,
              () => {}
            )
          } catch (userCamErr) {
            console.warn(
              "User facing camera mode failed, attempting first available camera:",
              userCamErr
            )
            const devices = await Html5Qrcode.getCameras()
            if (devices && devices.length > 0) {
              await html5QrCode.start(
                devices[0].id,
                scanConfig,
                onScanSuccess,
                () => {}
              )
            } else {
              throw userCamErr
            }
          }
        }
      } catch (err: any) {
        console.error("Camera scanner initialization error:", err)
        setError(
          "Unable to access camera. Please allow camera permissions or enter code manually."
        )
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
    await connectMotherWithCode(code)
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
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="mother-code" className="text-sm font-medium">
            Mother QR Code or ID <span className="text-red-400">*</span>
          </Label>

          <div className="relative flex items-center">
            <div className="pointer-events-none absolute top-1/2 left-3 z-10 flex -translate-y-1/2 items-center justify-center text-muted-foreground">
              <QrCode className="h-4 w-4" />
            </div>
            <Input
              id="mother-code"
              placeholder="e.g. MTH-8F3A2190 or scan QR code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-10 border-sidebar-border pr-24 pl-9 font-mono text-xs focus-visible:ring-1"
              autoFocus
              disabled={loading}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={toggleScanner}
              disabled={loading}
              className={`absolute top-1/2 right-1.5 h-7 -translate-y-1/2 gap-1.5 px-2 text-[11px] font-medium transition-colors ${
                isScanning
                  ? "border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  : "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
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

          {isScanning && (
            <div className="flex animate-in flex-col gap-2 pt-2 duration-200 fade-in-0 zoom-in-95">
              <div className="relative min-h-[250px] w-full overflow-hidden rounded-xl border border-primary/30 bg-black shadow-inner">
                <div id="qr-reader" className="h-full w-full" />
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                Point your camera at the QR code displayed on the mother's app
                screen.
              </p>
            </div>
          )}

          <div id="qr-file-scanner-hidden" style={{ display: "none" }} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span>Type the mother code, scan with camera, or:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="h-6 gap-1 px-2 text-[11px] text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Upload className="h-3 w-3" />
              Upload QR Image
            </Button>
          </div>
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
