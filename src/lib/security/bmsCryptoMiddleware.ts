import { getActiveCryptoKey } from "./pinSessionStore"
import { encryptObjectFields, decryptObjectFields } from "./cryptoEngine"

export const SENSITIVE_PHI_MAP: Record<string, string[]> = {
  mothers: [
    "first_name",
    "last_name",
    "middle_name",
    "phone_number",
    "address",
    "photo_url",
  ],
  prenatalVisits: ["notes", "blood_pressure"],
  messages: ["content"],
  ehrDocuments: ["document_name", "notes", "file_url"],
  notifications: ["title", "message"],
}

export async function prepareEntityForSave<T extends Record<string, any>>(
  tableName: string,
  entity: T
): Promise<T> {
  const sensitiveKeys = SENSITIVE_PHI_MAP[tableName]
  if (!sensitiveKeys || !entity) return entity

  const key = getActiveCryptoKey()
  return encryptObjectFields(entity, sensitiveKeys, key)
}

export async function prepareEntityAfterRead<T extends Record<string, any>>(
  tableName: string,
  entity: T
): Promise<T> {
  const sensitiveKeys = SENSITIVE_PHI_MAP[tableName]
  if (!sensitiveKeys || !entity) return entity

  const key = getActiveCryptoKey()
  return decryptObjectFields(entity, sensitiveKeys, key)
}

export async function prepareEntityListAfterRead<T extends Record<string, any>>(
  tableName: string,
  entities: T[]
): Promise<T[]> {
  if (!Array.isArray(entities) || entities.length === 0) return entities
  const sensitiveKeys = SENSITIVE_PHI_MAP[tableName]
  if (!sensitiveKeys) return entities

  const key = getActiveCryptoKey()
  return Promise.all(
    entities.map((item) => decryptObjectFields(item, sensitiveKeys, key))
  )
}
