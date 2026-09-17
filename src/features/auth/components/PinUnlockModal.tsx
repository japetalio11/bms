import React, { useState, useEffect } from "react"
import { Lock, ShieldCheck, AlertCircle, Delete, KeyRound } from "lucide-react"
import {
  isPinLocked,
  unlockWithPin,
  hasPinConfigured,
  subscribePinSession,
  tryRestoreSessionOnReload,
} from "@/lib/security/pinSessionStore"

interface PinUnlockModalProps {
  onUnlocked?: () => void
}

export const PinUnlockModal: React.FC<PinUnlockModalProps> = ({
  onUnlocked,
}) => {
  const [locked, setLocked] = useState<boolean>(false)
  const [pin, setPin] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isVerifying, setIsVerifying] = useState<boolean>(false)

  useEffect(() => {
    tryRestoreSessionOnReload().then((restored) => {
      if (restored) setLocked(false)
    })

    const unsubscribe = subscribePinSession((isLockedState) => {
      setLocked(isLockedState)
    })

    const interval = setInterval(() => {
      if (hasPinConfigured()) {
        setLocked(isPinLocked())
      }
    }, 5000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  if (!locked) return null

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num)
      setError("")
    }
  }

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1))
    setError("")
  }

  const handleClear = () => {
    setPin("")
    setError("")
  }

  const handleSubmit = async (pinToSubmit = pin) => {
    if (pinToSubmit.length < 4) {
      setError("Please enter your 4 to 6 digit PIN")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      const success = await unlockWithPin(pinToSubmit)
      if (success) {
        setLocked(false)
        setPin("")
        if (onUnlocked) onUnlocked()
      } else {
        setError("Invalid PIN. Please try again.")
        setPin("")
      }
    } catch (err) {
      setError("Failed to verify PIN offline.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDigitTap = (num: string) => {
    const nextPin = pin + num
    if (nextPin.length <= 6) {
      setPin(nextPin)
      setError("")
      if (nextPin.length === 4 || nextPin.length === 6) {
        handleSubmit(nextPin)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex animate-in items-center justify-center bg-background/95 p-4 backdrop-blur-md duration-200 fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>

        <h2 className="text-xl font-bold tracking-tight">
          Offline Shift Locked
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your 4-digit PIN to unlock offline patient records for 24 hours.
        </p>

        <div className="my-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                pin.length > idx
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
              disabled={isVerifying}
              onClick={() => handleDigitTap(digit)}
              className="flex h-14 items-center justify-center rounded-xl bg-muted/50 text-xl font-semibold transition-all hover:bg-primary/10 hover:text-primary active:scale-95 disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={isVerifying || pin.length === 0}
            className="flex h-14 items-center justify-center rounded-xl bg-muted/30 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-30"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleDigitTap("0")}
            className="flex h-14 items-center justify-center rounded-xl bg-muted/50 text-xl font-semibold transition-all hover:bg-primary/10 hover:text-primary active:scale-95 disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isVerifying || pin.length === 0}
            className="flex h-14 items-center justify-center rounded-xl bg-muted/30 text-muted-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-30"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-border/50 pt-4 text-[11px] text-muted-foreground/70">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Encrypted with AES-256-GCM WebCrypto</span>
        </div>
      </div>
    </div>
  )
}
