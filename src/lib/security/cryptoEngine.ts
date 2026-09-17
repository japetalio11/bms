export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export function generateSalt(length = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

export async function derivePinKey(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const pinBuffer = encoder.encode(pin)

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    pinBuffer,
    "PBKDF2",
    false,
    ["deriveKey", "deriveBits"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function computePinHash(
  pin: string,
  salt: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder()
  const data = new Uint8Array([...salt, ...encoder.encode(pin)])
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return arrayBufferToBase64(hashBuffer)
}

export async function encryptField(
  plainText: string | undefined | null,
  key: CryptoKey | null
): Promise<string> {
  if (!plainText || typeof plainText !== "string") return plainText || ""
  if (!key) return plainText

  try {
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))
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

export async function decryptField(
  encryptedPayload: string | undefined | null,
  key: CryptoKey | null
): Promise<string> {
  if (!encryptedPayload || typeof encryptedPayload !== "string")
    return encryptedPayload || ""
  if (!encryptedPayload.startsWith("enc:")) return encryptedPayload
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
    console.warn(
      "[CryptoEngine] Failed to decrypt field with current key:",
      err
    )
    return "[Encrypted Field - Invalid PIN]"
  }
}

export async function encryptObjectFields<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: string[],
  key: CryptoKey | null
): Promise<T> {
  if (!obj || !key) return obj
  const clone: Record<string, any> = { ...obj }

  for (const k of sensitiveKeys) {
    if (
      typeof clone[k] === "string" &&
      clone[k] &&
      !clone[k].startsWith("enc:")
    ) {
      clone[k] = await encryptField(clone[k], key)
    }
  }
  return clone as T
}

export async function decryptObjectFields<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: string[],
  key: CryptoKey | null
): Promise<T> {
  if (!obj || !key) return obj
  const clone: Record<string, any> = { ...obj }

  for (const k of sensitiveKeys) {
    if (
      typeof clone[k] === "string" &&
      clone[k] &&
      clone[k].startsWith("enc:")
    ) {
      clone[k] = await decryptField(clone[k], key)
    }
  }
  return clone as T
}
