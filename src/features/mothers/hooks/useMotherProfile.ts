import { useState, useEffect, useTransition } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { motherRepository } from "@/lib/repositories/motherRepository"

export interface MotherProfileData {
  mother: any | null
  pregnancies: any[]
  prenatalVisits: any[]
  appointments: any[]
  labRecords: any[]
  supplements: any[]
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useMotherProfile(targetId?: string): MotherProfileData {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasInitialSynced, setHasInitialSynced] = useState(false)
  const [, startTransition] = useTransition()

  // Reactive Dexie query via useLiveQuery: delivers cached data in <10ms and updates reactively
  const liveData = useLiveQuery(async () => {
    if (!targetId) return null

    // 1. Locate mother record via index first, fallback to scan only if not found
    let mother: any = await db.mothers.get(targetId)
    if (!mother) {
      mother = await db.mothers.where("mother_id").equals(targetId).first()
    }
    if (!mother) {
      mother = await db.mothers.where("user_id").equals(targetId).first()
    }
    if (!mother) {
      const allM = await db.mothers.toArray()
      mother = allM.find(
        (m: any) =>
          m.id === targetId ||
          m._id === targetId ||
          m.mother_id === targetId ||
          m.user_id === targetId ||
          m.temp_id === targetId
      ) || null
    }

    if (!mother) return null

    const mid = mother.mother_id || mother._id || mother.id || targetId
    const uid = mother.user_id || mother.user?.user_id
    const searchKeys = Array.from(new Set([mid, uid, targetId].filter(Boolean))) as string[]

    // 2. Fetch related child entities using indexed Dexie queries instead of full-table scans
    const [allPregs, directVisits, directLabs, directSupps, apptsByMother, apptsByUser] = await Promise.all([
      db.pregnancies.where("mother_id").anyOf(searchKeys).toArray(),
      db.prenatalVisits.where("mother_id").anyOf(searchKeys).toArray(),
      db.labRecords.where("mother_id").anyOf(searchKeys).toArray(),
      db.supplements.where("mother_id").anyOf(searchKeys).toArray(),
      db.appointments.where("mother_id").anyOf(searchKeys).toArray(),
      uid ? db.appointments.where("user_id").equals(uid).toArray() : Promise.resolve([]),
    ])

    const pregnancies = allPregs
      .sort((a: any, b: any) => new Date(b.date_of_registration || b.created_at || 0).getTime() - new Date(a.date_of_registration || a.created_at || 0).getTime())

    const pregIds = Array.from(new Set(pregnancies.map((p: any) => p.pregnancy_id || p.id).filter(Boolean))) as string[]

    // Also fetch any visits, labs, or supplements linked via pregnancy_id if not already matched
    let additionalVisits: any[] = []
    let additionalLabs: any[] = []
    let additionalSupps: any[] = []

    if (pregIds.length > 0) {
      const [pVisits, pLabs, pSupps] = await Promise.all([
        db.prenatalVisits.where("pregnancy_id").anyOf(pregIds).toArray(),
        db.labRecords.where("pregnancy_id").anyOf(pregIds).toArray(),
        db.supplements.where("pregnancy_id").anyOf(pregIds).toArray(),
      ])
      additionalVisits = pVisits
      additionalLabs = pLabs
      additionalSupps = pSupps
    }

    // Merge and deduplicate by primary id
    const visitMap = new Map<string, any>()
    ;[...directVisits, ...additionalVisits].forEach(v => visitMap.set(v.id || v.visit_id, v))
    const prenatalVisits = Array.from(visitMap.values())
      .sort((a: any, b: any) => new Date(b.visit_date || b.created_at || 0).getTime() - new Date(a.visit_date || a.created_at || 0).getTime())

    const labMap = new Map<string, any>()
    ;[...directLabs, ...additionalLabs].forEach(l => labMap.set(l.id || l.screening_id, l))
    const labRecords = Array.from(labMap.values())
      .sort((a: any, b: any) => new Date(b.date_of_screening || b.created_at || 0).getTime() - new Date(a.date_of_screening || a.created_at || 0).getTime())

    const suppMap = new Map<string, any>()
    ;[...directSupps, ...additionalSupps].forEach(s => suppMap.set(s.id || s.supplement_id, s))
    const supplements = Array.from(suppMap.values())
      .sort((a: any, b: any) => new Date(b.date_given || b.created_at || 0).getTime() - new Date(a.date_given || a.created_at || 0).getTime())

    const apptMap = new Map<string, any>()
    ;[...apptsByMother, ...apptsByUser].forEach(a => apptMap.set(a.id || a.appointment_id, a))
    const appointments = Array.from(apptMap.values())
      .sort((a: any, b: any) => new Date(b.appointment_date || 0).getTime() - new Date(a.appointment_date || 0).getTime())

    return {
      mother,
      pregnancies,
      prenatalVisits,
      appointments,
      labRecords,
      supplements,
    }
  }, [targetId])

  // Background refresh using the composite endpoint
  const refresh = async () => {
    if (!targetId) return
    setIsSyncing(true)
    setError(null)

    try {
      await motherRepository.getCompositeProfile(targetId)
    } catch (err: any) {
      console.warn("[useMotherProfile] Background composite fetch failed:", err)
      setError(err?.message || "Failed to synchronize profile data")
    } finally {
      setIsSyncing(false)
      setHasInitialSynced(true)
    }
  }

  // Fetch on mount or when targetId changes
  useEffect(() => {
    setHasInitialSynced(false)
    startTransition(() => {
      refresh()
    })
  }, [targetId])

  // isLoading is ONLY true on initial load when Dexie has NO cached data for this mother
  const isLoading = !hasInitialSynced && liveData === null

  return {
    mother: liveData?.mother || null,
    pregnancies: liveData?.pregnancies || [],
    prenatalVisits: liveData?.prenatalVisits || [],
    appointments: liveData?.appointments || [],
    labRecords: liveData?.labRecords || [],
    supplements: liveData?.supplements || [],
    isLoading,
    isSyncing,
    error,
    refresh,
  }
}
