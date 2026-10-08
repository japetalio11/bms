import React, { useState, useEffect, useCallback } from "react"
import {
  Lock,
  ShieldCheck,
  AlertCircle,
  Delete,
  KeyRound,
  ShieldAlert,
  AlertTriangle,
  LogOut,
  Loader2,
  ArrowLeft,
  RotateCcw,
} from "lucide-react"
import {
  isPinLocked,
  unlockWithPin,
  hasPinConfigured,
  subscribePinSession,
  tryRestoreSessionOnReload,
  clearPinConfig,
  getPinFailedAttempts,
  incrementPinFailedAttempts,
  resetPinFailedAttempts,
  MAX_PIN_ATTEMPTS,
} from "@/lib/security/pinSessionStore"
import { db } from "@/lib/db/bmsDatabase"

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
  const [isResetting, setIsResetting] = useState<boolean>(false)
  const [failedAttempts, setFailedAttempts] = useState<number>(() =>
    getPinFailedAttempts()
  )
  const [viewMode, setViewMode] = useState<"keypad" | "forgot_confirm" | "locked_out">(
    () => (getPinFailedAttempts() >= MAX_PIN_ATTEMPTS ? "locked_out" : "keypad")
  )

  useEffect(() => {
    tryRestoreSessionOnReload().then((restored) => {
      if (restored) {
        setLocked(false)
        resetPinFailedAttempts()
        setFailedAttempts(0)
      }
    })

    const unsubscribe = subscribePinSession((isLockedState) => {
      setLocked(isLockedState)
      const attempts = getPinFailedAttempts()
      setFailedAttempts(attempts)
      if (attempts >= MAX_PIN_ATTEMPTS) {
        setViewMode("locked_out")
      }
    })

    const interval = setInterval(() => {
      if (hasPinConfigured()) {
        const isCurrentlyLocked = isPinLocked()
        setLocked(isCurrentlyLocked)
        const attempts = getPinFailedAttempts()
        setFailedAttempts(attempts)
        if (attempts >= MAX_PIN_ATTEMPTS) {
          setViewMode("locked_out")
        }
      }
    }, 5000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const handleClear = useCallback(() => {
    setPin("")
    setError("")
  }, [])

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1))
    setError("")
  }, [])

  const handleSubmit = useCallback(
    async (pinToSubmit = pin) => {
      if (pinToSubmit.length < 4) {
        setError("Please enter your 4 to 6 digit PIN")
        return
      }

      setIsVerifying(true)
      setError("")

      try {
        const success = await unlockWithPin(pinToSubmit)
        if (success) {
          resetPinFailedAttempts()
          setFailedAttempts(0)
          setLocked(false)
          setPin("")
          setViewMode("keypad")
          if (onUnlocked) onUnlocked()
        } else {
          const nextAttempts = incrementPinFailedAttempts()
          setFailedAttempts(nextAttempts)
          setPin("")

          if (nextAttempts >= MAX_PIN_ATTEMPTS) {
            setViewMode("locked_out")
            setError("")
          } else {
            const remaining = MAX_PIN_ATTEMPTS - nextAttempts
            setError(
              `Invalid PIN. ${remaining} attempt${
                remaining === 1 ? "" : "s"
              } remaining before lockout.`
            )
          }
        }
      } catch (err) {
        setError("Failed to verify PIN offline.")
      } finally {
        setIsVerifying(false)
      }
    },
    [pin, onUnlocked]
  )

  const handleDigitTap = useCallback(
    (num: string) => {
      if (viewMode !== "keypad" || isVerifying) return
      const nextPin = pin + num
      if (nextPin.length <= 6) {
        setPin(nextPin)
        setError("")
        if (nextPin.length === 4 || nextPin.length === 6) {
          handleSubmit(nextPin)
        }
      }
    },
    [pin, viewMode, isVerifying, handleSubmit]
  )

  useEffect(() => {
    if (!locked || viewMode !== "keypad" || isVerifying) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        handleDigitTap(e.key)
      } else if (e.key === "Backspace") {
        e.preventDefault()
        handleDelete()
      } else if (e.key === "Escape") {
        e.preventDefault()
        handleClear()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [locked, viewMode, isVerifying, handleDigitTap, handleDelete, handleClear])

  const handleResetAndReLogin = async () => {
    setIsResetting(true)
    try {
      clearPinConfig()
      resetPinFailedAttempts()
      await db.clearClinicalCache(false).catch(() => {})
    } catch (err) {
      console.warn("[PinUnlockModal] Cleanup error during re-login reset:", err)
    } finally {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {}
      setLocked(false)
      window.dispatchEvent(new CustomEvent("bms:auth-change"))
      window.location.href = "/login"
    }
  }

  if (!locked) return null

  if (viewMode === "locked_out" || viewMode === "forgot_confirm") {
    const isLockedOut = viewMode === "locked_out"

    return (
      <div className="fixed inset-0 z-[9999] flex animate-in items-center justify-center bg-background/95 p-4 backdrop-blur-md duration-200 fade-in">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-2xl">
          <div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
              isLockedOut
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            {isLockedOut ? (
              <ShieldAlert className="h-7 w-7" />
            ) : (
              <KeyRound className="h-7 w-7" />
            )}
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            {isLockedOut ? "Maximum PIN Attempts Reached" : "Forgot Offline Security PIN?"}
          </h2>

          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {isLockedOut
              ? "For your security, offline shift access is locked after 3 unsuccessful attempts. Re-login with your credentials to reset and create a new 4-digit PIN."
              : "Re-authenticating with your account credentials will clear the current offline PIN and allow you to set a fresh PIN upon log-in."}
          </p>

          <div className="my-5 rounded-xl border border-border/60 bg-muted/40 p-3.5 text-left text-xs space-y-2">
            <div className="flex items-start gap-2 text-muted-foreground">
              <RotateCcw className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>Clears locally stored PIN security credentials.</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>Redirects you to a fresh sign-in screen.</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <KeyRound className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>Prompts you to set a new 4-digit PIN immediately after login.</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={isResetting}
              onClick={handleResetAndReLogin}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md transition-all hover:bg-primary/90 active:scale-98 disabled:opacity-60"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Clearing Session & Redirecting...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Re-login & Create New PIN</span>
                </>
              )}
            </button>

            {!isLockedOut && (
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  setError("")
                  setViewMode("keypad")
                }}
                className="w-full py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to PIN Entry</span>
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-border/50 pt-3.5 text-[11px] text-muted-foreground/70">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Encrypted with AES-256-GCM WebCrypto</span>
          </div>
        </div>
      </div>
    )
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

        {failedAttempts > 0 && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span>
              Attempt {failedAttempts} of {MAX_PIN_ATTEMPTS}
            </span>
          </div>
        )}

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
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
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

        <div className="mt-3">
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => {
              setError("")
              setViewMode("forgot_confirm")
            }}
            className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
          >
            Forgot your PIN? Re-login to reset
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-border/50 pt-4 text-[11px] text-muted-foreground/70">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Encrypted with AES-256-GCM WebCrypto</span>
        </div>
      </div>
    </div>
  )
}
