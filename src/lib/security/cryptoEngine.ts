/**
 * Web Crypto API Utility Engine for BMS Offline Encryption
 * Uses PBKDF2 for PIN key derivation and AES-256-GCM for field-level encryption.
 */

// Helper to convert Uint8Array to base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Helper to convert base64 string to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Generates a cryptographic salt for PBKDF2 key derivation.
 */
export function generateSalt(length = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Derives an AES-256-GCM CryptoKey from a user's 4-digit / 6-digit numeric PIN and salt.
 */
export async function derivePinKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const pinBuffer = encoder.encode(pin)

  // Import raw PIN bytes as key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    pinBuffer,
    "PBKDF2",
    false,
    ["deriveKey", "deriveBits"]
  )

  // Derive AES-GCM 256-bit key
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // Non-extractable for security
    ["encrypt", "decrypt"]
  )
}

/**
 * Generates a verification hash for checking PIN validity without keeping key in plaintext.
 */
export async function computePinHash(pin: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder()
  const data = new Uint8Array([...salt, ...encoder.encode(pin)])
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return arrayBufferToBase64(hashBuffer)
}

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Returns an encrypted payload string containing formatted IV and Ciphertext (`enc:IV_BASE64:CIPHER_BASE64`).
 */
export async function encryptField(plainText: string | undefined | null, key: CryptoKey | null): Promise<string> {
  if (!plainText || typeof plainText !== "string") return plainText || ""
  if (!key) return plainText // Fallback if session key not initialized

  try {
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for AES-GCM
    const encodedData = encoder.encode(plainText)

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedData
    )

    const ivB64 = arrayBufferToBase64(iv)
    const cipherB64 = arrayBufferToBase64(cipherBuffer)
    return `enc:${ivB64}:${cipherB64}`
  } catch (err) {
    console.error("[CryptoEngine] Failed to encrypt field:", err)
    return plainText
  }
}

/**
 * Decrypts an encrypted payload string (`enc:IV_BASE64:CIPHER_BASE64`).
 * Returns original plaintext string.
 */
export async function decryptField(encryptedPayload: string | undefined | null, key: CryptoKey | null): Promise<string> {
  if (!encryptedPayload || typeof encryptedPayload !== "string") return encryptedPayload || ""
  if (!encryptedPayload.startsWith("enc:")) return encryptedPayload // Not encrypted or legacy plaintext
  if (!key) return "[Encrypted Field - Enter PIN to view]"

  try {
    const parts = encryptedPayload.split(":")
    if (parts.length !== 3) return encryptedPayload

    const iv = base64ToUint8Array(parts[1])
    const cipherBuffer = base64ToUint8Array(parts[2])

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      cipherBuffer as BufferSource
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (err) {
    console.warn("[CryptoEngine] Failed to decrypt field with current key:", err)
    return "[Encrypted Field - Invalid PIN]"
  }
}

/**
 * Recursively encrypts specified sensitive field keys in an object payload.
 */
export async function encryptObjectFields<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: string[],
  key: CryptoKey | null
): Promise<T> {
  if (!obj || !key) return obj
  const clone: Record<string, any> = { ...obj }

  for (const k of sensitiveKeys) {
    if (typeof clone[k] === "string" && clone[k] && !clone[k].startsWith("enc:")) {
      clone[k] = await encryptField(clone[k], key)
    }
  }
  return clone as T
}

/**
 * Recursively decrypts specified sensitive field keys in an object payload.
 */
export async function decryptObjectFields<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: string[],
  key: CryptoKey | null
): Promise<T> {
  if (!obj || !key) return obj
  const clone: Record<string, any> = { ...obj }

  for (const k of sensitiveKeys) {
    if (typeof clone[k] === "string" && clone[k] && clone[k].startsWith("enc:")) {
      clone[k] = await decryptField(clone[k], key)
    }
  }
  return clone as T
}
