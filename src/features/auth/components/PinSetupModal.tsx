import React, { useState } from "react"
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react"
import { setupPin } from "@/lib/security/pinSessionStore"

interface PinSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<"create" | "confirm">("create")
  const [pin, setPin] = useState<string>("")
  const [confirmPin, setConfirmPin] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  if (!isOpen) return null

  const handleDigitTap = (digit: string) => {
    setError("")
    if (step === "create") {
      if (pin.length < 4) {
        const next = pin + digit
        setPin(next)
        if (next.length === 4) {
          setTimeout(() => setStep("confirm"), 150)
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit
        setConfirmPin(next)
        if (next.length === 4) {
          handleVerifyAndSave(pin, next)
        }
      }
    }
  }

  const handleDelete = () => {
    setError("")
    if (step === "create") {
      setPin((prev) => prev.slice(0, -1))
    } else {
      setConfirmPin((prev) => prev.slice(0, -1))
    }
  }

  const handleReset = () => {
    setPin("")
    setConfirmPin("")
    setStep("create")
    setError("")
  }

  const handleVerifyAndSave = async (firstPin: string, secondPin: string) => {
    if (firstPin !== secondPin) {
      setError("PINs do not match. Please try again.")
      setConfirmPin("")
      return
    }

    setIsSubmitting(true)
    try {
      const ok = await setupPin(firstPin)
      if (ok) {
        if (onSuccess) onSuccess()
        onClose()
      } else {
        setError("Failed to configure PIN encryption.")
      }
    } catch (err) {
      setError("An error occurred setting up PIN.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeDigits = step === "create" ? pin : confirmPin

  return (
    <div className="fixed inset-0 z-[9999] flex animate-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm duration-200 fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="h-7 w-7" />
        </div>

        <h2 className="text-xl font-bold tracking-tight">
          {step === "create"
            ? "Set Offline Security PIN"
            : "Confirm Your 4-Digit PIN"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {step === "create"
            ? "Create a 4-digit PIN to secure your patient data offline for 24-hour shifts."
            : "Re-enter your 4-digit PIN to confirm."}
        </p>

        <div className="my-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                activeDigits.length > idx
                  ? "scale-110 border-primary bg-primary shadow-sm"
                  : "border-muted-foreground/30 bg-muted/40"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 flex animate-in items-center justify-center gap-1.5 text-xs font-medium text-destructive slide-in-from-top-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="my-2 grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigitTap(digit)}
              className="flex h-14 items-center justify-center rounded-xl bg-muted/50 text-xl font-semibold transition-all hover:bg-primary/10 hover:text-primary active:scale-95 disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="flex h-14 items-center justify-center rounded-xl bg-muted/30 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-95"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigitTap("0")}
            className="flex h-14 items-center justify-center rounded-xl bg-muted/50 text-xl font-semibold transition-all hover:bg-primary/10 hover:text-primary active:scale-95 disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting || activeDigits.length === 0}
            className="flex h-14 items-center justify-center rounded-xl bg-muted/30 text-muted-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-30"
          >
            Clear
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-border/50 pt-4 text-[11px] text-muted-foreground/70">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>PBKDF2 Salted Key Derivation</span>
        </div>
      </div>
    </div>
  )
}
