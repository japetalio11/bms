import {
  derivePinKey,
  generateSalt,
  computePinHash,
  arrayBufferToBase64,
  base64ToUint8Array,
} from "./cryptoEngine"

const PIN_SALT_KEY = "bms_pin_salt"
const PIN_HASH_KEY = "bms_pin_hash"
const PIN_EXPIRY_KEY = "bms_pin_expiry"
const PIN_SESSION_VAL_KEY = "bms_pin_session_val"
const DURATION_24_HOURS_MS = 24 * 60 * 60 * 1000

let activeCryptoKey: CryptoKey | null = null
let sessionExpiryTime: number | null = null
let isRestoringSession: boolean = false
const listeners: Set<(isLocked: boolean) => void> = new Set()

function notifyListeners() {
  const locked = isPinLocked()
  listeners.forEach((cb) => cb(locked))
}

export async function tryRestoreSessionOnReload(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (activeCryptoKey) return true

  const storedExpiryStr = localStorage.getItem(PIN_EXPIRY_KEY)
  const storedSessionPin = sessionStorage.getItem(PIN_SESSION_VAL_KEY)
  const storedSaltB64 = localStorage.getItem(PIN_SALT_KEY)

  if (!storedExpiryStr || !storedSessionPin || !storedSaltB64) {
    return false
  }

  const expiry = parseInt(storedExpiryStr, 10)
  if (isNaN(expiry) || Date.now() > expiry) {
    lockPinSession()
    return false
  }

  try {
    isRestoringSession = true
    const salt = base64ToUint8Array(storedSaltB64)
    const key = await derivePinKey(storedSessionPin, salt)

    activeCryptoKey = key
    sessionExpiryTime = expiry
    notifyListeners()
    return true
  } catch (err) {
    console.warn("[PinSessionStore] Failed to restore session on reload:", err)
    lockPinSession()
    return false
  } finally {
    isRestoringSession = false
  }
}

if (typeof window !== "undefined") {
  tryRestoreSessionOnReload()
}

export function hasPinConfigured(): boolean {
  if (typeof window === "undefined") return false
  return (
    !!localStorage.getItem(PIN_HASH_KEY) && !!localStorage.getItem(PIN_SALT_KEY)
  )
}

export function isPinLocked(): boolean {
  if (!hasPinConfigured()) return false
  if (isRestoringSession) return false

  const storedExpiryStr =
    typeof window !== "undefined" ? localStorage.getItem(PIN_EXPIRY_KEY) : null
  const expiry = storedExpiryStr
    ? parseInt(storedExpiryStr, 10)
    : sessionExpiryTime

  if (expiry && Date.now() > expiry) {
    lockPinSession()
    return true
  }

  if (!activeCryptoKey) {
    const storedSessionPin =
      typeof window !== "undefined"
        ? sessionStorage.getItem(PIN_SESSION_VAL_KEY)
        : null
    if (storedSessionPin && expiry && Date.now() <= expiry) {
      tryRestoreSessionOnReload()
      return false
    }
    return true
  }

  return false
}

export function getActiveCryptoKey(): CryptoKey | null {
  if (isPinLocked()) return null
  return activeCryptoKey
}

export async function setupPin(pin: string): Promise<boolean> {
  try {
    const salt = generateSalt(16)
    const saltB64 = arrayBufferToBase64(salt)
    const pinHash = await computePinHash(pin, salt)

    localStorage.setItem(PIN_SALT_KEY, saltB64)
    localStorage.setItem(PIN_HASH_KEY, pinHash)

    const key = await derivePinKey(pin, salt)
    const expiry = Date.now() + DURATION_24_HOURS_MS

    activeCryptoKey = key
    sessionExpiryTime = expiry
    localStorage.setItem(PIN_EXPIRY_KEY, expiry.toString())
    sessionStorage.setItem(PIN_SESSION_VAL_KEY, pin)

    notifyListeners()
    return true
  } catch (err) {
    console.error("[PinSessionStore] Failed to setup PIN:", err)
    return false
  }
}

export async function unlockWithPin(pin: string): Promise<boolean> {
  const storedSaltB64 = localStorage.getItem(PIN_SALT_KEY)
  const storedHash = localStorage.getItem(PIN_HASH_KEY)

  if (!storedSaltB64 || !storedHash) {
    console.warn("[PinSessionStore] No PIN configured on device.")
    return false
  }

  try {
    const salt = base64ToUint8Array(storedSaltB64)
    const computedHash = await computePinHash(pin, salt)

    if (computedHash !== storedHash) {
      return false
    }

    const key = await derivePinKey(pin, salt)
    const expiry = Date.now() + DURATION_24_HOURS_MS

    activeCryptoKey = key
    sessionExpiryTime = expiry
    localStorage.setItem(PIN_EXPIRY_KEY, expiry.toString())
    sessionStorage.setItem(PIN_SESSION_VAL_KEY, pin)

    notifyListeners()
    return true
  } catch (err) {
    console.error("[PinSessionStore] Error unlocking with PIN:", err)
    return false
  }
}

export function lockPinSession(): void {
  activeCryptoKey = null
  sessionExpiryTime = null
  if (typeof window !== "undefined") {
    localStorage.removeItem(PIN_EXPIRY_KEY)
    sessionStorage.removeItem(PIN_SESSION_VAL_KEY)
  }
  notifyListeners()
}

export function clearPinConfig(): void {
  activeCryptoKey = null
  sessionExpiryTime = null
  if (typeof window !== "undefined") {
    localStorage.removeItem(PIN_SALT_KEY)
    localStorage.removeItem(PIN_HASH_KEY)
    localStorage.removeItem(PIN_EXPIRY_KEY)
    sessionStorage.removeItem(PIN_SESSION_VAL_KEY)
  }
  notifyListeners()
}

export function subscribePinSession(
  callback: (isLocked: boolean) => void
): () => void {
  listeners.add(callback)
  callback(isPinLocked())
  return () => {
    listeners.delete(callback)
  }
}
