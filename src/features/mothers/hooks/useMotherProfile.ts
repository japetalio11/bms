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

    // 1. Locate mother record
    let mother: any = await db.mothers.get(targetId)
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

    // 2. Fetch related child entities
    const [allPregs, allVisits, allLabs, allSupps, allAppts] = await Promise.all([
      db.pregnancies.toArray(),
      db.prenatalVisits.toArray(),
      db.labRecords.toArray(),
      db.supplements.toArray(),
      db.appointments.toArray(),
    ])

    const pregnancies = allPregs
      .filter((p: any) => p.mother_id === mid || (uid && p.mother_id === uid) || p.id === mid)
      .sort((a: any, b: any) => new Date(b.date_of_registration || b.created_at || 0).getTime() - new Date(a.date_of_registration || a.created_at || 0).getTime())

    const pregIds = new Set(pregnancies.map((p: any) => p.pregnancy_id || p.id).filter(Boolean))

    const prenatalVisits = allVisits
      .filter((v: any) => v.mother_id === mid || (v.pregnancy_id && pregIds.has(v.pregnancy_id)))
      .sort((a: any, b: any) => new Date(b.visit_date || b.created_at || 0).getTime() - new Date(a.visit_date || a.created_at || 0).getTime())

    const labRecords = allLabs
      .filter((l: any) => l.mother_id === mid || (l.pregnancy_id && pregIds.has(l.pregnancy_id)))
      .sort((a: any, b: any) => new Date(b.date_of_screening || b.created_at || 0).getTime() - new Date(a.date_of_screening || a.created_at || 0).getTime())

    const supplements = allSupps
      .filter((s: any) => s.mother_id === mid || (s.pregnancy_id && pregIds.has(s.pregnancy_id)))
      .sort((a: any, b: any) => new Date(b.date_given || b.created_at || 0).getTime() - new Date(a.date_given || a.created_at || 0).getTime())

    const appointments = allAppts
      .filter((a: any) => (uid && a.user_id === uid) || a.mother_id === mid)
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
