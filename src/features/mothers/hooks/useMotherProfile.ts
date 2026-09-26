import { useState, useEffect, useTransition } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { motherRepository } from "@/lib/repositories/motherRepository"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export interface MotherProfileData {
  mother: any | null
  pregnancies: any[]
  prenatalVisits: any[]
  appointments: any[]
  labRecords: any[]
  supplements: any[]
  deliveries: any[]
  newborns: any[]
  postpartumVisits: any[]
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

  const liveData = useLiveQuery(async () => {
    if (!targetId) return null

    let mother: any = await db.mothers.get(targetId)
    if (!mother) {
      mother = await db.mothers.where("mother_id").equals(targetId).first()
    }
    if (!mother) {
      mother = await db.mothers.where("user_id").equals(targetId).first()
    }
    if (!mother) {
      const allM = await db.mothers.toArray()
      mother =
        allM.find(
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
    const searchKeys = Array.from(
      new Set([mid, uid, targetId].filter(Boolean))
    ) as string[]

    const [
      allPregs,
      directVisits,
      directLabs,
      directSupps,
      apptsByMother,
      apptsByUser,
    ] = await Promise.all([
      db.pregnancies.where("mother_id").anyOf(searchKeys).toArray(),
      db.prenatalVisits.where("mother_id").anyOf(searchKeys).toArray(),
      db.labRecords.where("mother_id").anyOf(searchKeys).toArray(),
      db.supplements.where("mother_id").anyOf(searchKeys).toArray(),
      db.appointments.where("mother_id").anyOf(searchKeys).toArray(),
      uid
        ? db.appointments.where("user_id").equals(uid).toArray()
        : Promise.resolve([]),
    ])

    const pregnancies = allPregs.sort(
      (a: any, b: any) =>
        new Date(b.date_of_registration || b.created_at || 0).getTime() -
        new Date(a.date_of_registration || a.created_at || 0).getTime()
    )

    const pregIds = Array.from(
      new Set(
        pregnancies.map((p: any) => p.pregnancy_id || p.id).filter(Boolean)
      )
    ) as string[]

    let additionalVisits: any[] = []
    let additionalLabs: any[] = []
    let additionalSupps: any[] = []
    let deliveries: any[] = []
    let newborns: any[] = []
    let postpartumVisits: any[] = []

    if (pregIds.length > 0) {
      const [pVisits, pLabs, pSupps, pDeliveries] = await Promise.all([
        db.prenatalVisits.where("pregnancy_id").anyOf(pregIds).toArray(),
        db.labRecords.where("pregnancy_id").anyOf(pregIds).toArray(),
        db.supplements.where("pregnancy_id").anyOf(pregIds).toArray(),
        db.deliveries.where("pregnancy_id").anyOf(pregIds).toArray(),
      ])
      additionalVisits = pVisits
      additionalLabs = pLabs
      additionalSupps = pSupps
      deliveries = pDeliveries

      const deliveryIds = Array.from(
        new Set(
          deliveries.map((d: any) => d.delivery_id || d.id).filter(Boolean)
        )
      ) as string[]

      if (deliveryIds.length > 0) {
        const [pNewborns, pPostpartum] = await Promise.all([
          db.newborns.where("delivery_id").anyOf(deliveryIds).toArray(),
          db.postpartumVisits.where("delivery_id").anyOf(deliveryIds).toArray(),
        ])
        newborns = pNewborns
        postpartumVisits = pPostpartum
      }
    }

    const visitMap = new Map<string, any>()
    ;[...directVisits, ...additionalVisits].forEach((v) =>
      visitMap.set(v.id || v.visit_id, v)
    )
    const prenatalVisits = Array.from(visitMap.values()).sort(
      (a: any, b: any) =>
        new Date(b.visit_date || b.created_at || 0).getTime() -
        new Date(a.visit_date || a.created_at || 0).getTime()
    )

    const labMap = new Map<string, any>()
    ;[...directLabs, ...additionalLabs].forEach((l) =>
      labMap.set(l.id || l.screening_id, l)
    )
    const labRecords = Array.from(labMap.values()).sort(
      (a: any, b: any) =>
        new Date(b.date_of_screening || b.created_at || 0).getTime() -
        new Date(a.date_of_screening || a.created_at || 0).getTime()
    )

    const suppMap = new Map<string, any>()
    ;[...directSupps, ...additionalSupps].forEach((s) =>
      suppMap.set(s.id || s.supplement_id, s)
    )
    const supplements = Array.from(suppMap.values()).sort(
      (a: any, b: any) =>
        new Date(b.date_given || b.created_at || 0).getTime() -
        new Date(a.date_given || a.created_at || 0).getTime()
    )

    const apptMap = new Map<string, any>()
    ;[...apptsByMother, ...apptsByUser].forEach((a) =>
      apptMap.set(a.id || a.appointment_id, a)
    )
    const appointments = Array.from(apptMap.values()).sort(
      (a: any, b: any) =>
        new Date(b.appointment_date || 0).getTime() -
        new Date(a.appointment_date || 0).getTime()
    )

    const deliveryMap = new Map<string, any>()
    deliveries.forEach((d: any) => {
      const key = String(d.delivery_id || d.id || "")
      if (key) deliveryMap.set(key, d)
    })
    const allDeliveries = Array.from(deliveryMap.values()).sort(
      (a: any, b: any) =>
        new Date(b.delivery_date || b.created_at || 0).getTime() -
        new Date(a.delivery_date || a.created_at || 0).getTime()
    )

    const newbornMap = new Map<string, any>()
    newborns.forEach((nb: any) => {
      const key = String(nb.newborn_id || nb.id || "")
      if (key) newbornMap.set(key, nb)
    })
    allDeliveries.forEach((d: any) => {
      if (Array.isArray(d.newbornRecords)) {
        d.newbornRecords.forEach((nb: any) => {
          const key = String(nb.newborn_id || nb.id || "")
          if (key) newbornMap.set(key, nb)
        })
      }
    })
    const allNewborns = Array.from(newbornMap.values())

    const postpartumMap = new Map<string, any>()
    postpartumVisits.forEach((pv: any) => {
      const key = String(pv.postpartum_visit_id || pv.id || "")
      if (key) postpartumMap.set(key, pv)
    })
    const allPostpartum = Array.from(postpartumMap.values())

    return {
      mother,
      pregnancies,
      prenatalVisits,
      appointments,
      labRecords,
      supplements,
      deliveries: allDeliveries,
      newborns: allNewborns,
      postpartumVisits: allPostpartum,
    }
  }, [targetId])

  const refresh = async () => {
    if (!targetId) return
    setIsSyncing(true)
    setError(null)

    try {
      if (syncEngine.isNetworkOnline()) {
        await syncEngine.processQueue().catch(() => {})
        await motherRepository.getActiveMothers().catch(() => {})

        const pregList = await db.pregnancies
          .where("mother_id")
          .equals(targetId)
          .toArray()
        const pregIds = pregList
          .map((p: any) => p.pregnancy_id || p.id)
          .filter(Boolean)

        for (const pid of pregIds) {
          try {
            const res = await apiClient.get(
              `/api/v1/delivery-outcome/get/pregnancy/${pid}`
            )
            const list = res.data?.data || res.data?.result || []
            if (Array.isArray(list)) {
              if (list.length > 0) {
                await db.deliveries
                  .where("pregnancy_id")
                  .equals(pid)
                  .filter((d: any) => String(d.id || "").startsWith("temp-"))
                  .delete()
                  .catch(() => {})
                await db.newborns
                  .filter((nb: any) => String(nb.id || "").startsWith("temp-"))
                  .delete()
                  .catch(() => {})
              }

              for (const item of list) {
                const dId = item.delivery_id || item.id
                await db.deliveries.put({
                  ...item,
                  id: dId,
                  delivery_id: dId,
                  pregnancy_id: pid,
                  sync_status: "synced",
                  updated_at: Date.now(),
                })
                if (Array.isArray(item.newbornRecords)) {
                  for (const nb of item.newbornRecords) {
                    const nbId = nb.newborn_id || nb.id
                    await db.newborns.put({
                      ...nb,
                      id: nbId,
                      newborn_id: nbId,
                      delivery_id: dId,
                      sync_status: "synced",
                      updated_at: Date.now(),
                    })
                  }
                }
                if (Array.isArray(item.postpartumVisits)) {
                  for (const pv of item.postpartumVisits) {
                    const pvId = pv.postpartum_visit_id || pv.id
                    await db.postpartumVisits.put({
                      ...pv,
                      id: pvId,
                      postpartum_visit_id: pvId,
                      delivery_id: dId,
                      sync_status: "synced",
                      updated_at: Date.now(),
                    })
                  }
                }
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      console.warn("[useMotherProfile] Background fetch failed:", err)
      setError(err?.message || "Failed to synchronize profile data")
    } finally {
      setIsSyncing(false)
      setHasInitialSynced(true)
    }
  }

  useEffect(() => {
    setHasInitialSynced(false)
    startTransition(() => {
      refresh()
    })
  }, [targetId])

  const isLoading = !hasInitialSynced && liveData === null

  return {
    mother: liveData?.mother || null,
    pregnancies: liveData?.pregnancies || [],
    prenatalVisits: liveData?.prenatalVisits || [],
    appointments: liveData?.appointments || [],
    labRecords: liveData?.labRecords || [],
    supplements: liveData?.supplements || [],
    deliveries: liveData?.deliveries || [],
    newborns: liveData?.newborns || [],
    postpartumVisits: liveData?.postpartumVisits || [],
    isLoading,
    isSyncing,
    error,
    refresh,
  }
}
