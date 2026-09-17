/**
 * PIN Session Manager & In-Memory Key Store for BMS PWA
 * Manages 24-hour shift sessions and in-memory AES-256-GCM encryption keys.
 * Preserves 24-hour shift sessions across page refreshes via tab-scoped sessionStorage.
 */

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
const DURATION_24_HOURS_MS = 24 * 60 * 60 * 1000 // 24 Hours in Milliseconds

let activeCryptoKey: CryptoKey | null = null
let sessionExpiryTime: number | null = null
let isRestoringSession: boolean = false
const listeners: Set<(isLocked: boolean) => void> = new Set()

function notifyListeners() {
  const locked = isPinLocked()
  listeners.forEach((cb) => cb(locked))
}

/**
 * Automatically restores active 24-hour PIN session on page reload (F5).
 */
export async function tryRestoreSessionOnReload(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (activeCryptoKey) return true // Already active

  const storedExpiryStr = localStorage.getItem(PIN_EXPIRY_KEY)
  const storedSessionPin = sessionStorage.getItem(PIN_SESSION_VAL_KEY)
  const storedSaltB64 = localStorage.getItem(PIN_SALT_KEY)

  if (!storedExpiryStr || !storedSessionPin || !storedSaltB64) {
    return false
  }

  const expiry = parseInt(storedExpiryStr, 10)
  if (isNaN(expiry) || Date.now() > expiry) {
    // Session expired
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

// Automatically attempt session restoration on module import / page load
if (typeof window !== "undefined") {
  tryRestoreSessionOnReload()
}

/**
 * Checks if a PIN has been configured on this device.
 */
export function hasPinConfigured(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem(PIN_HASH_KEY) && !!localStorage.getItem(PIN_SALT_KEY)
}

/**
 * Returns true if the 24-hour PIN session has expired or key is missing.
 */
export function isPinLocked(): boolean {
  if (!hasPinConfigured()) return false // If no PIN is configured, don't lock UI
  if (isRestoringSession) return false

  // Check stored expiry
  const storedExpiryStr = typeof window !== "undefined" ? localStorage.getItem(PIN_EXPIRY_KEY) : null
  const expiry = storedExpiryStr ? parseInt(storedExpiryStr, 10) : sessionExpiryTime

  if (expiry && Date.now() > expiry) {
    lockPinSession()
    return true
  }

  if (!activeCryptoKey) {
    // Attempt sync restoration check
    const storedSessionPin = typeof window !== "undefined" ? sessionStorage.getItem(PIN_SESSION_VAL_KEY) : null
    if (storedSessionPin && expiry && Date.now() <= expiry) {
      tryRestoreSessionOnReload()
      return false
    }
    return true
  }

  return false
}

/**
 * Gets the current active CryptoKey (or null if locked).
 */
export function getActiveCryptoKey(): CryptoKey | null {
  if (isPinLocked()) return null
  return activeCryptoKey
}

/**
 * Configures a new 4-digit / 6-digit PIN on this device and unlocks a 24-hour session.
 */
export async function setupPin(pin: string): Promise<boolean> {
  try {
    const salt = generateSalt(16)
    const saltB64 = arrayBufferToBase64(salt)
    const pinHash = await computePinHash(pin, salt)

    localStorage.setItem(PIN_SALT_KEY, saltB64)
    localStorage.setItem(PIN_HASH_KEY, pinHash)

    // Derive key and activate 24-hour session
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

/**
 * Validates entered PIN offline and unlocks the 24-hour session if valid.
 */
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
      return false // PIN incorrect
    }

    // Derive key and set 24-hour session
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

/**
 * Manually locks the PIN session (e.g. user taps "Lock App").
 */
export function lockPinSession(): void {
  activeCryptoKey = null
  sessionExpiryTime = null
  if (typeof window !== "undefined") {
    localStorage.removeItem(PIN_EXPIRY_KEY)
    sessionStorage.removeItem(PIN_SESSION_VAL_KEY)
  }
  notifyListeners()
}

/**
 * Clears all PIN state (e.g., full account logout).
 */
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

/**
 * Subscribes to PIN lock state changes.
 */
export function subscribePinSession(callback: (isLocked: boolean) => void): () => void {
  listeners.add(callback)
  callback(isPinLocked())
  return () => {
    listeners.delete(callback)
  }
}
