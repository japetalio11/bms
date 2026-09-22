import { db } from "@/lib/db/bmsDatabase"
import type {
  LocalMother,
  LocalPrenatalVisit,
  LocalPregnancy,
  LocalLabRecord,
  LocalSupplement,
} from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

import { extractRiskLevel, calculateOfflineTEWSRisk } from "@/lib/riskUtils"
import {
  validatePrenatalVitals,
  validatePregnancyData,
  validateSupplementData,
  validateLabData,
} from "@/lib/clinicalValidation"

export const motherRepository = {
  async getActiveMothers(facilityId?: string): Promise<LocalMother[]> {
    let currentUser: any = null
    try {
      currentUser = await db.userSession.get("current_user")
      if (!currentUser && typeof window !== "undefined") {
        const stored = localStorage.getItem("user")
        if (stored) currentUser = JSON.parse(stored)
      }
    } catch {}

    const isSysAdmin = currentUser?.role === "SystemAdmin"
    const effectiveFacilityId =
      facilityId ||
      (!isSysAdmin
        ? currentUser?.facility_id || currentUser?.facility?.facility_id
        : undefined)

    let localMothers: LocalMother[] = []
    let allPregnancies: LocalPregnancy[] = []
    let allVisits: LocalPrenatalVisit[] = []

    try {
      localMothers = await db.mothers.toArray()
      allPregnancies = await db.pregnancies.toArray()
      allVisits = await db.prenatalVisits.toArray()
    } catch (err) {
      console.warn("[motherRepository] Local DB query error:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const endpoint = effectiveFacilityId
          ? `/api/v1/mother/active/${effectiveFacilityId}`
          : "/api/v1/mother/active"
        const response = await apiClient.get(endpoint)
        const remoteList =
          response.data?.result ||
          response.data?.data ||
          (Array.isArray(response.data) ? response.data : [])

        if (Array.isArray(remoteList)) {
          const pendingItems = localMothers.filter(
            (m) => m.sync_status !== "synced"
          )
          const pendingTempIds = new Set(pendingItems.map((m) => m.id))

          const remotePregs: LocalPregnancy[] = []
          const remoteVisits: LocalPrenatalVisit[] = []

          const formattedRemote: LocalMother[] = remoteList
            .filter(
              (m: any) => !pendingTempIds.has(m._id || m.id || m.mother_id)
            )
            .map((m: any) => {
              const motherId = m.mother_id || m._id || m.id
              const firstName = m.first_name || m.user?.first_name || ""
              const lastName = m.last_name || m.user?.last_name || ""
              const middleName = m.middle_name || m.user?.middle_name || ""
              const phoneNumber = m.phone_number || m.user?.phone_number || ""
              const photoUrl = m.photo_url || m.user?.profile_url || ""
              const userId = m.user_id || m.user?.user_id

              if (Array.isArray(m.pregnancies)) {
                for (const p of m.pregnancies) {
                  const pId = p.pregnancy_id || p._id || p.id
                  remotePregs.push({
                    ...p,
                    id: pId,
                    pregnancy_id: pId,
                    mother_id: motherId,
                    sync_status: "synced",
                    updated_at: Date.now(),
                  })
                  if (Array.isArray(p.prenatalVisits)) {
                    for (const v of p.prenatalVisits) {
                      const vId = v.visit_id || v._id || v.id
                      remoteVisits.push({
                        ...v,
                        id: vId,
                        visit_id: vId,
                        pregnancy_id: pId,
                        mother_id: motherId,
                        sync_status: "synced",
                        updated_at: Date.now(),
                      })
                    }
                  }
                }
              }

              const enrollments = m.facilityEnrollments || []
              const facilityIds = Array.from(
                new Set(
                  [
                    m.facility_id,
                    m.user?.facility_id,
                    ...enrollments
                      .filter((e: any) => e.status === "Active" || !e.status)
                      .map((e: any) => e.facility_id),
                  ].filter(Boolean)
                )
              ) as string[]

              return {
                ...m,
                id: motherId,
                _id: motherId,
                mother_id: motherId,
                user_id: userId,
                first_name: firstName,
                last_name: lastName,
                middle_name: middleName,
                phone_number: phoneNumber,
                photo_url: photoUrl,
                assigned_worker_id: m.assigned_worker_id || m.assignedWorker?.user_id,
                created_by_id: m.created_by_id || m.creator?.user_id,
                assignedWorker: m.assignedWorker || m.assigned_worker,
                assigned_worker: m.assignedWorker || m.assigned_worker,
                creator: m.creator,
                facility_id: m.facility_id || m.user?.facility_id || effectiveFacilityId,
                facility_ids: facilityIds,
                facilityEnrollments: enrollments,
                sync_status: "synced" as const,
                updated_at: Date.now(),
              }
            })

          const remoteIds = new Set(formattedRemote.map((m) => m.id))
          const staleMothers = localMothers.filter((m) => {
            if (m.sync_status !== "synced") return false
            if (remoteIds.has(m.id)) return false
            if (effectiveFacilityId) {
              const matchesThisFacility =
                m.facility_id === effectiveFacilityId ||
                m.user?.facility_id === effectiveFacilityId ||
                m.facility_ids?.includes(effectiveFacilityId) ||
                (Array.isArray(m.facilityEnrollments) &&
                  m.facilityEnrollments.some(
                    (e: any) =>
                      e.facility_id === effectiveFacilityId &&
                      (e.status === "Active" || !e.status)
                  ))
              return matchesThisFacility
            }
            return true
          })
          for (const sm of staleMothers) {
            await db.mothers.delete(sm.id).catch(() => {})
          }

          const remainingPending: LocalMother[] = []
          for (const pending of pendingItems) {
            if (pending.id && String(pending.id).startsWith("temp-")) {
              const pFname = (
                pending.first_name ||
                pending.user?.first_name ||
                ""
              )
                .toLowerCase()
                .trim()
              const pLname = (
                pending.last_name ||
                pending.user?.last_name ||
                ""
              )
                .toLowerCase()
                .trim()
              const pPhone = (
                pending.phone_number ||
                pending.user?.phone_number ||
                ""
              ).trim()
              const pEmail = (pending.email || pending.user?.email || "")
                .toLowerCase()
                .trim()
              const pSerial = (pending.family_serial_no || "").trim()

              const matchedRemote = formattedRemote.find((rm: any) => {
                const rSerial = (rm.family_serial_no || "").trim()
                const rPhone = (
                  rm.phone_number ||
                  rm.user?.phone_number ||
                  ""
                ).trim()
                const rEmail = (rm.email || rm.user?.email || "")
                  .toLowerCase()
                  .trim()
                const rFname = (rm.first_name || rm.user?.first_name || "")
                  .toLowerCase()
                  .trim()
                const rLname = (rm.last_name || rm.user?.last_name || "")
                  .toLowerCase()
                  .trim()

                if (pSerial && rSerial && pSerial === rSerial) return true
                if (pPhone && rPhone && pPhone === rPhone) return true
                if (pEmail && rEmail && pEmail === rEmail) return true
                return (
                  pFname && pLname && pFname === rFname && pLname === rLname
                )
              })

              if (matchedRemote) {
                const canonicalId = matchedRemote.mother_id || matchedRemote.id
                console.log(
                  `[motherRepository] Auto-reconciling pending temp mother ${pending.id} -> ${canonicalId}`
                )
                await db.mothers.delete(pending.id).catch(() => {})
                await syncEngine
                  .cancelPendingMutation(pending.id)
                  .catch(() => {})
                await db.pregnancies
                  .where("mother_id")
                  .equals(pending.id)
                  .modify({ mother_id: canonicalId })
                  .catch(() => {})
                await db.prenatalVisits
                  .where("mother_id")
                  .equals(pending.id)
                  .modify({ mother_id: canonicalId })
                  .catch(() => {})
                await db.appointments
                  .where("mother_id")
                  .equals(pending.id)
                  .modify({ mother_id: canonicalId })
                  .catch(() => {})
                await db.labRecords
                  .where("mother_id")
                  .equals(pending.id)
                  .modify({ mother_id: canonicalId })
                  .catch(() => {})
                await db.supplements
                  .where("mother_id")
                  .equals(pending.id)
                  .modify({ mother_id: canonicalId })
                  .catch(() => {})
                await db.ehrDocuments
                  .where("mother_id")
                  .equals(pending.id)
                  .modify({ mother_id: canonicalId })
                  .catch(() => {})
                continue
              }
            }
            remainingPending.push(pending)
          }

          await db.mothers.bulkPut([...formattedRemote, ...remainingPending])
          if (remotePregs.length > 0)
            await db.pregnancies.bulkPut(remotePregs).catch(() => {})
          if (remoteVisits.length > 0)
            await db.prenatalVisits.bulkPut(remoteVisits).catch(() => {})

          localMothers = await db.mothers.toArray()
          allPregnancies = await db.pregnancies.toArray()
          allVisits = await db.prenatalVisits.toArray()
        }
      } catch (err) {
        console.warn(
          "[motherRepository] Remote fetch failed, returning local Dexie mothers:",
          err
        )
      }
    }

    const pregMap = new Map<string, LocalPregnancy[]>()
    for (const p of allPregnancies) {
      const mid = p.mother_id || p.motherId || p.targetId
      if (mid) {
        if (!pregMap.has(mid)) pregMap.set(mid, [])
        pregMap.get(mid)!.push(p)
      }
    }

    const visitMap = new Map<string, LocalPrenatalVisit[]>()
    for (const v of allVisits) {
      const mid = v.mother_id || v.motherId || v.targetId
      if (mid) {
        if (!visitMap.has(mid)) visitMap.set(mid, [])
        visitMap.get(mid)!.push(v)
      }
      if (v.pregnancy_id) {
        if (!visitMap.has(`preg:${v.pregnancy_id}`))
          visitMap.set(`preg:${v.pregnancy_id}`, [])
        visitMap.get(`preg:${v.pregnancy_id}`)!.push(v)
      }
    }

    const currentUserId = currentUser?.user_id || currentUser?.id

    // Auto-repair / backfill any local pending mothers in Dexie so existing offline records are always valid
    for (const m of localMothers) {
      const isTempOrPending =
        m.sync_status === "pending_create" ||
        String(m.id || "").startsWith("temp-") ||
        String(m.mother_id || "").startsWith("temp-")

      if (isTempOrPending) {
        let needsUpdate = false
        const updates: any = {}

        if (!m.created_by_id && currentUserId) {
          updates.created_by_id = currentUserId
          m.created_by_id = currentUserId
          needsUpdate = true
        }
        if (!m.assigned_worker_id && currentUserId) {
          updates.assigned_worker_id = currentUserId
          m.assigned_worker_id = currentUserId
          needsUpdate = true
        }
        if (!m.facility_id && effectiveFacilityId) {
          updates.facility_id = effectiveFacilityId
          m.facility_id = effectiveFacilityId
          needsUpdate = true
        }
        if (!m.facility_ids || m.facility_ids.length === 0) {
          const fid = m.facility_id || effectiveFacilityId
          if (fid) {
            updates.facility_ids = [fid]
            m.facility_ids = [fid]
            needsUpdate = true
          }
        }
        if (!m.facilityEnrollments || m.facilityEnrollments.length === 0) {
          const fid = m.facility_id || effectiveFacilityId
          if (fid) {
            updates.facilityEnrollments = [{ facility_id: fid, status: "Active" }]
            m.facilityEnrollments = [{ facility_id: fid, status: "Active" }]
            needsUpdate = true
          }
        }
        if (!m.name) {
          const fn = [
            m.first_name || m.user?.first_name,
            m.middle_name || m.user?.middle_name,
            m.last_name || m.user?.last_name,
          ]
            .filter(Boolean)
            .join(" ")
          if (fn) {
            updates.name = fn
            m.name = fn
            needsUpdate = true
          }
        }

        if (needsUpdate && m.id) {
          db.mothers.update(m.id, updates).catch(() => {})
        }
      }
    }

    const seen = new Set<string>()
    const deduplicated: LocalMother[] = []

    for (const mother of localMothers) {
      const motherId = mother.mother_id || mother._id || mother.id
      const userId = mother.user_id || mother.user?.user_id

      const hasMid = Boolean(motherId && String(motherId).trim() !== "")
      const hasUid = Boolean(userId && String(userId).trim() !== "")

      if (
        (hasMid && seen.has(`mid:${motherId}`)) ||
        (hasUid && seen.has(`uid:${userId}`))
      ) {
        continue
      }

      if (hasMid) seen.add(`mid:${motherId}`)
      if (hasUid) seen.add(`uid:${userId}`)

      const pregs = mother.pregnancies?.length
        ? mother.pregnancies
        : (motherId && pregMap.get(motherId)) ||
          (userId && pregMap.get(userId)) ||
          []

      const pregVisits = pregs.flatMap(
        (p: any) =>
          p.prenatalVisits ||
          (p.pregnancy_id && visitMap.get(`preg:${p.pregnancy_id}`)) ||
          (p.id && visitMap.get(`preg:${p.id}`)) ||
          []
      )
      const mappedVisits = [
        ...(motherId ? visitMap.get(motherId) || [] : []),
        ...(userId ? visitMap.get(userId) || [] : []),
      ]

      const visits = [
        ...(mother.prenatalVisits || []),
        ...pregVisits,
        ...mappedVisits,
      ]

      const computedRisk = extractRiskLevel(mother, pregs, visits)

      deduplicated.push({
        ...mother,
        pregnancies: pregs,
        prenatalVisits: visits,
        risk_flag: computedRisk,
        risk_level: computedRisk,
        risk: computedRisk,
      })
    }

    let result = deduplicated
    if (effectiveFacilityId) {
      const effFidStr = String(effectiveFacilityId).trim()
      result = deduplicated.filter((m) => {
        const isPending =
          m.sync_status === "pending_create" ||
          String(m.id || "").startsWith("temp-") ||
          String(m.mother_id || "").startsWith("temp-")

        if (isPending) {
          if (!m.facility_id || String(m.facility_id).trim() === effFidStr) {
            return true
          }
        }

        const matchFacId =
          m.facility_id && String(m.facility_id).trim() === effFidStr
        const matchUserFacId =
          m.user?.facility_id && String(m.user.facility_id).trim() === effFidStr
        const matchFacIds =
          Array.isArray(m.facility_ids) &&
          m.facility_ids.some((fid) => String(fid).trim() === effFidStr)
        const matchEnrollments =
          Array.isArray(m.facilityEnrollments) &&
          m.facilityEnrollments.some(
            (e: any) =>
              String(e.facility_id).trim() === effFidStr &&
              (e.status === "Active" || !e.status)
          )

        return Boolean(
          matchFacId || matchUserFacId || matchFacIds || matchEnrollments
        )
      })
    }

    const isHealthcareStaff =
      currentUser?.role &&
      ![
        "SystemAdmin",
        "Admin",
        "Administrator",
        "FacilityAdmin",
        "Mother",
      ].includes(currentUser.role)

    if (isHealthcareStaff && currentUserId) {
      const uidStr = String(currentUserId).trim()
      result = result.filter((m) => {
        if (
          m.sync_status === "pending_create" ||
          String(m.id || "").startsWith("temp-") ||
          String(m.mother_id || "").startsWith("temp-")
        ) {
          return true
        }

        const matchWorker =
          m.assigned_worker_id && String(m.assigned_worker_id).trim() === uidStr
        const matchCreator =
          m.created_by_id && String(m.created_by_id).trim() === uidStr
        const matchAssignedWorker =
          m.assignedWorker?.user_id &&
          String(m.assignedWorker.user_id).trim() === uidStr
        const matchAssignedWorkerLegacy =
          m.assigned_worker?.user_id &&
          String(m.assigned_worker.user_id).trim() === uidStr
        const matchCreatorObj =
          m.creator?.user_id && String(m.creator.user_id).trim() === uidStr

        return Boolean(
          matchWorker ||
            matchCreator ||
            matchAssignedWorker ||
            matchAssignedWorkerLegacy ||
            matchCreatorObj
        )
      })
    }

    return result
  },

  async getCompositeProfile(targetId: string): Promise<any> {
    let localMother: any = await db.mothers.get(targetId)
    if (!localMother) {
      localMother = await db.mothers.where("mother_id").equals(targetId).first()
    }
    if (!localMother) {
      localMother = await db.mothers.where("user_id").equals(targetId).first()
    }
    if (!localMother) {
      const allM = await db.mothers.toArray()
      localMother =
        allM.find(
          (m: any) =>
            m.id === targetId ||
            m._id === targetId ||
            m.mother_id === targetId ||
            m.user_id === targetId
        ) || null
    }

    const mid = localMother?.mother_id || localMother?.id || targetId
    const uid = localMother?.user_id || localMother?.user?.user_id || targetId
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
      db.pregnancies
        .where("mother_id")
        .anyOf(searchKeys)
        .toArray()
        .catch(() => []),
      db.prenatalVisits
        .where("mother_id")
        .anyOf(searchKeys)
        .toArray()
        .catch(() => []),
      db.labRecords
        .where("mother_id")
        .anyOf(searchKeys)
        .toArray()
        .catch(() => []),
      db.supplements
        .where("mother_id")
        .anyOf(searchKeys)
        .toArray()
        .catch(() => []),
      db.appointments
        .where("mother_id")
        .anyOf(searchKeys)
        .toArray()
        .catch(() => []),
      uid
        ? db.appointments
            .where("user_id")
            .equals(uid)
            .toArray()
            .catch(() => [])
        : Promise.resolve([]),
    ])

    const localPregs = allPregs
    const pregIds = Array.from(
      new Set(
        localPregs.map((p: any) => p.pregnancy_id || p.id).filter(Boolean)
      )
    ) as string[]

    let additionalVisits: any[] = []
    let additionalLabs: any[] = []
    let additionalSupps: any[] = []

    if (pregIds.length > 0) {
      const [pVisits, pLabs, pSupps] = await Promise.all([
        db.prenatalVisits
          .where("pregnancy_id")
          .anyOf(pregIds)
          .toArray()
          .catch(() => []),
        db.labRecords
          .where("pregnancy_id")
          .anyOf(pregIds)
          .toArray()
          .catch(() => []),
        db.supplements
          .where("pregnancy_id")
          .anyOf(pregIds)
          .toArray()
          .catch(() => []),
      ])
      additionalVisits = pVisits
      additionalLabs = pLabs
      additionalSupps = pSupps
    }

    const visitMap = new Map<string, any>()
    ;[...directVisits, ...additionalVisits].forEach((v) =>
      visitMap.set(v.id || v.visit_id, v)
    )
    const localVisits = Array.from(visitMap.values())

    const labMap = new Map<string, any>()
    ;[...directLabs, ...additionalLabs].forEach((l) =>
      labMap.set(l.id || l.screening_id, l)
    )
    const localLabs = Array.from(labMap.values())

    const suppMap = new Map<string, any>()
    ;[...directSupps, ...additionalSupps].forEach((s) =>
      suppMap.set(s.id || s.supplement_id, s)
    )
    const localSupps = Array.from(suppMap.values())

    const apptMap = new Map<string, any>()
    ;[...apptsByMother, ...apptsByUser].forEach((a) =>
      apptMap.set(a.id || a.appointment_id, a)
    )
    const localAppts = Array.from(apptMap.values())

    const localComposite = localMother
      ? {
          ...localMother,
          mother_id: mid,
          user_id: uid,
          pregnancies: localPregs,
          prenatalVisits: localVisits,
          labRecords: localLabs,
          supplements: localSupps,
          appointments: localAppts,
        }
      : null

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(
          `/api/v1/mother/composite/${targetId}`
        )
        const data =
          response.data?.result || response.data?.data || response.data
        if (data) {
          const canonicalId = data.mother_id || data.id || targetId
          const canonicalUid = data.user_id || data.user?.user_id || uid
          const photoUrl =
            data.photo_url ||
            data.user?.profile_url ||
            data.user?.photo_url ||
            data.profile_url ||
            ""

          let shouldUpdateMother = true
          if (
            localMother &&
            localMother.updated_at &&
            localMother.sync_status?.startsWith("pending_")
          ) {
            shouldUpdateMother = false
          }

          const enrollments = data.facilityEnrollments || []
          const facilityIds = Array.from(
            new Set(
              [
                data.facility_id,
                data.user?.facility_id,
                ...enrollments
                  .filter((e: any) => e.status === "Active" || !e.status)
                  .map((e: any) => e.facility_id),
              ].filter(Boolean)
            )
          ) as string[]

          const syncedMother: LocalMother = {
            ...data,
            id: canonicalId,
            _id: canonicalId,
            mother_id: canonicalId,
            user_id: canonicalUid,
            photo_url: photoUrl,
            profile_url: photoUrl,
            facility_id: data.facility_id || data.user?.facility_id,
            facility_ids: facilityIds,
            facilityEnrollments: enrollments,
            user: {
              ...(data.user || {}),
              ...(photoUrl
                ? { profile_url: photoUrl, photo_url: photoUrl }
                : {}),
            },
            sync_status: "synced",
            updated_at: Date.now(),
          }

          const pregs = (data.pregnancies || []).map((p: any) => ({
            ...p,
            id: p.pregnancy_id || p.id,
            pregnancy_id: p.pregnancy_id || p.id,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          const visits = (data.prenatalVisits || []).map((v: any) => ({
            ...v,
            id: v.visit_id || v.id,
            visit_id: v.visit_id || v.id,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          const labs = (data.labRecords || []).map((l: any) => ({
            ...l,
            id: l.screening_id || l.id,
            screening_id: l.screening_id || l.id,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          const supps = (data.supplements || []).map((s: any) => ({
            ...s,
            id: s.supplement_id || s.id,
            supplement_id: s.supplement_id || s.id,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          const appts = (data.appointments || []).map((a: any) => ({
            ...a,
            id: a.appointment_id || a.id,
            appointment_id: a.appointment_id || a.id,
            user_id: canonicalUid,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          await db.transaction(
            "rw",
            [
              db.mothers,
              db.pregnancies,
              db.prenatalVisits,
              db.labRecords,
              db.supplements,
              db.appointments,
            ],
            async () => {
              if (shouldUpdateMother) {
                await db.mothers.put(syncedMother)
              } else if (localMother) {
                await db.mothers.update(localMother.id, {
                  mother_id: canonicalId,
                  user_id: canonicalUid,
                  id: canonicalId,
                  _id: canonicalId,
                })
              }

              const remotePregIds = new Set(pregs.map((p: any) => p.id))
              const stalePregs = localPregs.filter(
                (p: any) =>
                  p.sync_status === "synced" && !remotePregIds.has(p.id)
              )
              for (const sp of stalePregs) {
                await db.pregnancies.delete(sp.id).catch(() => {})
              }
              if (pregs.length > 0) await db.pregnancies.bulkPut(pregs)

              const remoteVisitIds = new Set(visits.map((v: any) => v.id))
              const staleVisits = localVisits.filter(
                (v: any) =>
                  v.sync_status === "synced" && !remoteVisitIds.has(v.id)
              )
              for (const sv of staleVisits) {
                await db.prenatalVisits.delete(sv.id).catch(() => {})
                if (sv.visit_id)
                  await db.prenatalVisits
                    .where("visit_id")
                    .equals(sv.visit_id)
                    .delete()
                    .catch(() => {})
              }
              if (visits.length > 0) await db.prenatalVisits.bulkPut(visits)

              const remoteLabIds = new Set(labs.map((l: any) => l.id))
              const staleLabs = localLabs.filter(
                (l: any) =>
                  l.sync_status === "synced" && !remoteLabIds.has(l.id)
              )
              for (const sl of staleLabs) {
                await db.labRecords.delete(sl.id).catch(() => {})
                if (sl.screening_id)
                  await db.labRecords
                    .where("screening_id")
                    .equals(sl.screening_id)
                    .delete()
                    .catch(() => {})
              }
              if (labs.length > 0) await db.labRecords.bulkPut(labs)

              const remoteSuppIds = new Set(supps.map((s: any) => s.id))
              const staleSupps = localSupps.filter(
                (s: any) =>
                  s.sync_status === "synced" && !remoteSuppIds.has(s.id)
              )
              for (const ss of staleSupps) {
                await db.supplements.delete(ss.id).catch(() => {})
                if (ss.supplement_id)
                  await db.supplements
                    .where("supplement_id")
                    .equals(ss.supplement_id)
                    .delete()
                    .catch(() => {})
              }
              if (supps.length > 0) await db.supplements.bulkPut(supps)

              const remoteApptIds = new Set(appts.map((a: any) => a.id))
              const staleAppts = localAppts.filter(
                (a: any) =>
                  a.sync_status === "synced" && !remoteApptIds.has(a.id)
              )
              for (const sa of staleAppts) {
                await db.appointments.delete(sa.id).catch(() => {})
                if (sa.appointment_id)
                  await db.appointments
                    .where("appointment_id")
                    .equals(sa.appointment_id)
                    .delete()
                    .catch(() => {})
              }
              if (appts.length > 0) await db.appointments.bulkPut(appts)
            }
          )

          return {
            ...syncedMother,
            pregnancies: pregs,
            prenatalVisits: visits,
            labRecords: labs,
            supplements: supps,
            appointments: appts,
          }
        }
      } catch (err) {
        console.warn(
          `[motherRepository] Fetch composite profile ${targetId} failed, returning local:`,
          err
        )
      }
    }

    return localComposite
  },

  async getMotherProfile(targetId: string): Promise<LocalMother | null> {
    return await this.getCompositeProfile(targetId)
  },

  async registerMother(payload: any): Promise<LocalMother> {
    let currentUser: any = null
    try {
      currentUser = await db.userSession.get("current_user")
      if (!currentUser && typeof window !== "undefined") {
        const stored = localStorage.getItem("user")
        if (stored) currentUser = JSON.parse(stored)
      }
    } catch {}

    const firstName = payload.first_name || payload.firstName || ""
    const lastName = payload.last_name || payload.lastName || ""
    const middleName = payload.middle_name || payload.middleName || ""
    const phoneNumber = payload.phone_number || payload.phoneNumber || ""
    const address = payload.address || ""
    const currentUserId = currentUser?.user_id || currentUser?.id
    const isHealthcareStaff =
      currentUser?.role &&
      ![
        "SystemAdmin",
        "Admin",
        "Administrator",
        "FacilityAdmin",
        "Mother",
      ].includes(currentUser.role)

    const facilityId =
      payload.facility_id ||
      payload.facilityId ||
      currentUser?.facility_id ||
      currentUser?.facility?.facility_id ||
      ""

    const assignedWorkerId =
      payload.assigned_worker_id ||
      payload.assignedWorkerId ||
      (isHealthcareStaff && currentUserId ? currentUserId : undefined)

    const creatorId = currentUserId || undefined

    const facilityIds = facilityId ? [facilityId] : []
    const facilityEnrollments = facilityId
      ? [{ facility_id: facilityId, status: "Active" }]
      : []

    const fullName =
      [firstName, middleName, lastName].filter(Boolean).join(" ") || "Unknown"

    const sanitizedPayload = {
      ...payload,
      facility_id: facilityId || null,
      ...(assignedWorkerId ? { assigned_worker_id: assignedWorkerId } : {}),
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post(
          "/api/v1/mother/register",
          sanitizedPayload
        )
        const m =
          response.data?.mother ||
          response.data?.result?.mother ||
          response.data?.result ||
          response.data
        const canonicalId = m.mother_id || m.id || m._id
        const canonicalUserId = m.user_id || m.user?.user_id

        const syncedMother: LocalMother = {
          ...m,
          id: canonicalId,
          _id: canonicalId,
          mother_id: canonicalId,
          user_id: canonicalUserId,
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          name: fullName,
          phone_number: phoneNumber,
          address: address,
          facility_id: m.facility_id || facilityId,
          facility_ids: m.facility_ids || facilityIds,
          facilityEnrollments: m.facilityEnrollments || facilityEnrollments,
          assigned_worker_id: m.assigned_worker_id || assignedWorkerId,
          created_by_id: m.created_by_id || creatorId,
          assignedWorker: m.assignedWorker || (assignedWorkerId === currentUserId ? currentUser : undefined),
          assigned_worker: m.assignedWorker || (assignedWorkerId === currentUserId ? currentUser : undefined),
          creator: m.creator || (creatorId === currentUserId ? currentUser : undefined),
          user: {
            ...(m.user || {}),
            _id: canonicalUserId,
            user_id: canonicalUserId,
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName,
            phone_number: phoneNumber,
            address: address,
            facility_id: m.facility_id || facilityId,
            role: "Mother",
          },
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.mothers.put(syncedMother)
        return syncedMother
      } catch (err: any) {
        if (
          err.response?.status >= 400 &&
          err.response?.status < 500 &&
          err.response?.status !== 408 &&
          err.response?.status !== 429
        ) {
          throw err
        }
        console.warn(
          "[motherRepository] Online registerMother failed, falling back to offline outbox:",
          err
        )
      }
    }

    const tempId = `temp-mother-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newMother: LocalMother = {
      ...payload,
      id: tempId,
      _id: tempId,
      mother_id: tempId,
      user_id: tempId,
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName,
      name: fullName,
      phone_number: phoneNumber,
      address: address,
      facility_id: facilityId,
      facility_ids: facilityIds,
      facilityEnrollments: facilityEnrollments,
      assigned_worker_id: assignedWorkerId,
      created_by_id: creatorId,
      assignedWorker: assignedWorkerId === currentUserId ? currentUser : undefined,
      assigned_worker: assignedWorkerId === currentUserId ? currentUser : undefined,
      creator: creatorId === currentUserId ? currentUser : undefined,
      user: {
        _id: tempId,
        user_id: tempId,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone_number: phoneNumber,
        address: address,
        facility_id: facilityId,
        role: "Mother",
      },
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.mothers.put(newMother)

    await syncEngine.enqueueMutation({
      entity_type: "mother",
      action: "CREATE",
      endpoint: "/api/v1/mother/register",
      method: "POST",
      payload: sanitizedPayload,
      temp_id: tempId,
    })

    return newMother
  },

  async updateMother(motherId: string, payload: any) {
    let local: any = await db.mothers.get(motherId)
    if (!local) {
      const all = await db.mothers.toArray()
      local =
        all.find(
          (m: any) =>
            m.id === motherId ||
            m._id === motherId ||
            m.mother_id === motherId ||
            m.user_id === motherId
        ) || null
    }

    const photoUrl = payload.photo_url || payload.profile_url || ""
    if (local) {
      const actualKey = local.id
      const birthDate = payload.birth_date || local.birth_date
      let calculatedAge = local.age
      if (birthDate) {
        calculatedAge = Math.floor(
          (Date.now() - new Date(birthDate).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      }

      const updatedUser = {
        ...(local.user || {}),
        ...(photoUrl ? { profile_url: photoUrl, photo_url: photoUrl } : {}),
        ...(payload.first_name !== undefined
          ? { first_name: payload.first_name }
          : {}),
        ...(payload.middle_name !== undefined
          ? { middle_name: payload.middle_name }
          : {}),
        ...(payload.last_name !== undefined
          ? { last_name: payload.last_name }
          : {}),
        ...(payload.address !== undefined ? { address: payload.address } : {}),
        ...(payload.phone_number !== undefined
          ? { phone_number: payload.phone_number }
          : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(birthDate ? { birth_date: birthDate } : {}),
      }

      await db.mothers.update(actualKey, {
        ...payload,
        ...(photoUrl ? { photo_url: photoUrl, profile_url: photoUrl } : {}),
        ...(calculatedAge ? { age: calculatedAge } : {}),
        user: updatedUser,
        sync_status:
          local.sync_status === "pending_create"
            ? "pending_create"
            : "pending_update",
        updated_at: Date.now(),
      })
    }

    await syncEngine.enqueueMutation({
      entity_type: "mother",
      action: "UPDATE",
      endpoint: `/api/v1/mother/update/${motherId}`,
      method: "PUT",
      payload,
      temp_id: motherId.startsWith("temp-") ? motherId : undefined,
    })

    return { success: true }
  },

  async deleteMother(motherId: string) {
    if (motherId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(motherId)
    }

    try {
      await db.transaction(
        "rw",
        [
          db.mothers,
          db.pregnancies,
          db.prenatalVisits,
          db.labRecords,
          db.supplements,
          db.appointments,
        ],
        async () => {
          await db.mothers.delete(motherId).catch(() => {})
          await db.mothers
            .where("mother_id")
            .equals(motherId)
            .delete()
            .catch(() => {})
          await db.pregnancies
            .where("mother_id")
            .equals(motherId)
            .delete()
            .catch(() => {})
          await db.prenatalVisits
            .where("mother_id")
            .equals(motherId)
            .delete()
            .catch(() => {})
          await db.labRecords
            .where("mother_id")
            .equals(motherId)
            .delete()
            .catch(() => {})
          await db.supplements
            .where("mother_id")
            .equals(motherId)
            .delete()
            .catch(() => {})
          await db.appointments
            .where("mother_id")
            .equals(motherId)
            .delete()
            .catch(() => {})
        }
      )
    } catch (dbErr) {
      console.warn("[motherRepository] Local deletion error:", dbErr)
    }

    if (!motherId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/mother/delete/soft/${motherId}`)
          return { success: true }
        } catch (apiErr) {
          console.warn(
            "[motherRepository] Online deleteMother failed, queueing mutation:",
            apiErr
          )
        }
      }

      await syncEngine.enqueueMutation({
        entity_type: "mother",
        action: "DELETE",
        endpoint: `/api/v1/mother/delete/soft/${motherId}`,
        method: "DELETE",
        payload: {},
      })
    }

    return { success: true }
  },

  async deletePregnancy(pregnancyId: string) {
    if (pregnancyId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(pregnancyId)
    }
    await db.pregnancies.delete(pregnancyId).catch(() => {})
    await db.pregnancies
      .where("pregnancy_id")
      .equals(pregnancyId)
      .delete()
      .catch(() => {})
    await db.prenatalVisits
      .where("pregnancy_id")
      .equals(pregnancyId)
      .delete()
      .catch(() => {})

    if (!pregnancyId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/pregnancy/delete/${pregnancyId}`)
          return { success: true }
        } catch (err) {
          console.warn(
            "[motherRepository] Online deletePregnancy failed, queueing:",
            err
          )
        }
      }
      await syncEngine.enqueueMutation({
        entity_type: "pregnancy",
        action: "DELETE",
        endpoint: `/api/v1/pregnancy/delete/${pregnancyId}`,
        method: "DELETE",
        payload: {},
      })
    }
    return { success: true }
  },

  async deletePrenatalVisit(visitId: string) {
    if (visitId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(visitId)
    }
    await db.prenatalVisits.delete(visitId).catch(() => {})
    await db.prenatalVisits
      .where("visit_id")
      .equals(visitId)
      .delete()
      .catch(() => {})

    if (!visitId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/prenatal-visit/delete/${visitId}`)
          return { success: true }
        } catch (err: any) {
          console.error(
            "[motherRepository] Online deletePrenatalVisit failed:",
            err
          )
          throw err
        }
      }
      await syncEngine.enqueueMutation({
        entity_type: "prenatal_visit",
        action: "DELETE",
        endpoint: `/api/v1/prenatal-visit/delete/${visitId}`,
        method: "DELETE",
        payload: {},
      })
    }
    return { success: true }
  },

  async deleteLabRecord(screeningId: string) {
    if (screeningId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(screeningId)
    }
    await db.labRecords.delete(screeningId).catch(() => {})
    await db.labRecords
      .where("screening_id")
      .equals(screeningId)
      .delete()
      .catch(() => {})

    if (!screeningId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/lab-screening/delete/${screeningId}`)
          return { success: true }
        } catch (err) {
          console.warn(
            "[motherRepository] Online deleteLabRecord failed, queueing:",
            err
          )
        }
      }
      await syncEngine.enqueueMutation({
        entity_type: "lab_record",
        action: "DELETE",
        endpoint: `/api/v1/lab-screening/delete/${screeningId}`,
        method: "DELETE",
        payload: {},
      })
    }
    return { success: true }
  },

  async deleteSupplement(supplementId: string) {
    if (supplementId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(supplementId)
    }
    await db.supplements.delete(supplementId).catch(() => {})
    await db.supplements
      .where("supplement_id")
      .equals(supplementId)
      .delete()
      .catch(() => {})

    if (!supplementId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/supplement/delete/${supplementId}`)
          return { success: true }
        } catch (err) {
          console.warn(
            "[motherRepository] Online deleteSupplement failed, queueing:",
            err
          )
        }
      }
      await syncEngine.enqueueMutation({
        entity_type: "supplement",
        action: "DELETE",
        endpoint: `/api/v1/supplement/delete/${supplementId}`,
        method: "DELETE",
        payload: {},
      })
    }
    return { success: true }
  },

  async registerPrenatalVisit(payload: any): Promise<LocalPrenatalVisit> {
    const vitalsValidation = validatePrenatalVitals({
      trimester: payload.trimester,
      visit_number: payload.visit_number,
      age_of_gestation_weeks: payload.age_of_gestation_weeks,
      weight_kg: payload.weight_kg,
      temperature_celsius: payload.temperature_celsius,
      pulse_rate_bpm: payload.pulse_rate_bpm,
      bp_systolic: payload.bp_systolic,
      bp_diastolic: payload.bp_diastolic,
      fundic_height_cm: payload.fundic_height_cm,
      fetal_heart_tone_bpm: payload.fetal_heart_tone_bpm,
    })

    if (!vitalsValidation.isValid) {
      const err: any = new Error(vitalsValidation.errors.join(" "))
      err.response = {
        data: {
          error: "Invalid medical data provided",
          details: vitalsValidation.errors,
        },
        status: 400,
      }
      throw err
    }

    let motherId =
      payload.mother_id || payload.motherId || payload.targetId || ""
    let pregnancyId = payload.pregnancy_id || payload.pregnancyId || ""

    if (pregnancyId && pregnancyId.startsWith("temp-")) {
      try {
        const allPregs = await db.pregnancies.toArray()
        const matched = allPregs.find(
          (p) =>
            p.id === pregnancyId ||
            p.temp_id === pregnancyId ||
            (motherId && (p.mother_id === motherId || p.motherId === motherId))
        )
        if (
          matched &&
          matched.pregnancy_id &&
          !matched.pregnancy_id.startsWith("temp-")
        ) {
          pregnancyId = matched.pregnancy_id
          payload.pregnancy_id = matched.pregnancy_id
        }
      } catch (e) {}
    }

    if (!motherId && pregnancyId) {
      try {
        const preg = await db.pregnancies.get(pregnancyId)
        if (preg) {
          motherId = preg.mother_id || preg.motherId || preg.targetId || ""
        }
      } catch (err) {
        console.warn(
          "[motherRepository] Failed to resolve motherId from pregnancy:",
          err
        )
      }
    }

    if (motherId && motherId.startsWith("temp-")) {
      try {
        const allMothers = await db.mothers.toArray()
        const matched = allMothers.find(
          (m) =>
            m.id === motherId || m.temp_id === motherId || m._id === motherId
        )
        if (
          matched &&
          matched.mother_id &&
          !matched.mother_id.startsWith("temp-")
        ) {
          motherId = matched.mother_id
          payload.mother_id = matched.mother_id
        }
      } catch (e) {}
    }

    let assessedRisk = payload.risk_level_assessed
    if (!assessedRisk || assessedRisk === "N/A") {
      let motherAge: number | null = null
      let parity: number | null = null
      let prevDelivery: string | null = null
      let baselineSys: number | null = null
      let baselineDia: number | null = null

      try {
        if (motherId) {
          const m = await db.mothers.get(motherId)
          if (m?.age) motherAge = Number(m.age)
        }
        if (pregnancyId) {
          const p = await db.pregnancies.get(pregnancyId)
          if (p) {
            if (p.parity != null) parity = Number(p.parity)
            if (p.previous_delivery_history)
              prevDelivery = p.previous_delivery_history
          }
          const allVisits = await db.prenatalVisits.toArray()
          const baseline = allVisits.find(
            (v: any) =>
              v.pregnancy_id === pregnancyId &&
              (v.trimester === 1 || v.visit_number === 1)
          )
          if (baseline) {
            if (baseline.bp_systolic) baselineSys = Number(baseline.bp_systolic)
            if (baseline.bp_diastolic)
              baselineDia = Number(baseline.bp_diastolic)
          }
        }
      } catch (err) {
        console.warn(
          "[motherRepository] Failed to gather demographic context for TEWS risk:",
          err
        )
      }

      const calculated = calculateOfflineTEWSRisk({
        bp_systolic: payload.bp_systolic,
        bp_diastolic: payload.bp_diastolic,
        pulse_rate_bpm: payload.pulse_rate_bpm,
        temperature_celsius: payload.temperature_celsius,
        danger_signs_observed: payload.danger_signs_observed,
        mother_age: motherAge,
        parity: parity,
        previous_delivery_history: prevDelivery,
        baseline_bp_systolic: baselineSys,
        baseline_bp_diastolic: baselineDia,
      })

      assessedRisk = calculated.risk_level
      payload.risk_level_assessed = assessedRisk
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post(
          "/api/v1/prenatal-visit/register",
          payload
        )
        const v =
          response.data?.prenatalVisit || response.data?.result || response.data
        const canonicalId = v.visit_id || v._id || v.id
        const finalRisk =
          v.risk_level_assessed ||
          response.data?.cdssAssessment?.risk_level ||
          assessedRisk

        const syncedVisit: LocalPrenatalVisit = {
          ...payload,
          ...v,
          risk_level_assessed: finalRisk,
          id: canonicalId,
          visit_id: canonicalId,
          mother_id: motherId || v.mother_id,
          visit_date:
            payload.visit_date || v.visit_date || new Date().toISOString(),
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.prenatalVisits.put(syncedVisit)

        if (finalRisk) {
          try {
            if (payload.pregnancy_id) {
              await db.pregnancies.update(payload.pregnancy_id, {
                risk_flag: finalRisk,
                risk_level: finalRisk,
              })
            }
            if (motherId) {
              await db.mothers.update(motherId, {
                risk_flag: finalRisk,
                risk_level: finalRisk,
                risk: finalRisk,
              })
            }
          } catch (err) {
            console.warn(
              "[motherRepository] Failed to sync risk flag to pregnancy/mother:",
              err
            )
          }
        }

        return syncedVisit
      } catch (err: any) {
        if (
          err.response?.status >= 400 &&
          err.response?.status < 500 &&
          err.response?.status !== 408 &&
          err.response?.status !== 429
        ) {
          throw err
        }
        console.warn(
          "[motherRepository] Online registerPrenatalVisit failed, falling back to offline outbox:",
          err
        )
      }
    }

    const tempId = `temp-visit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newVisit: LocalPrenatalVisit = {
      ...payload,
      risk_level_assessed: assessedRisk,
      id: tempId,
      visit_id: tempId,
      mother_id: motherId,
      visit_date: payload.visit_date || new Date().toISOString(),
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.prenatalVisits.put(newVisit)

    if (assessedRisk) {
      try {
        if (payload.pregnancy_id) {
          await db.pregnancies.update(payload.pregnancy_id, {
            risk_flag: assessedRisk,
            risk_level: assessedRisk,
          })
        }
        if (motherId) {
          await db.mothers.update(motherId, {
            risk_flag: assessedRisk,
            risk_level: assessedRisk,
            risk: assessedRisk,
          })
        }
      } catch (err) {
        console.warn(
          "[motherRepository] Failed to sync risk flag to pregnancy/mother:",
          err
        )
      }
    }

    await syncEngine.enqueueMutation({
      entity_type: "prenatal_visit",
      action: "CREATE",
      endpoint: "/api/v1/prenatal-visit/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newVisit
  },

  async getPrenatalVisits(motherId: string): Promise<LocalPrenatalVisit[]> {
    let localVisits: LocalPrenatalVisit[] = []
    try {
      const allVisits = await db.prenatalVisits.toArray()
      const allPreg = await db.pregnancies.toArray()

      const pregMap = new Map(
        allPreg.map((p) => [
          p.pregnancy_id || p.id || p._id,
          p.mother_id || p.motherId || p.targetId,
        ])
      )
      for (const v of allVisits) {
        if (!v.mother_id && v.pregnancy_id && pregMap.has(v.pregnancy_id)) {
          const parentMid = pregMap.get(v.pregnancy_id)
          if (parentMid && v.id) {
            v.mother_id = parentMid
            await db.prenatalVisits.update(v.id, { mother_id: parentMid })
          }
        }
      }

      const motherPregIds = new Set(
        allPreg
          .filter((p) => {
            const pMid = p.mother_id || p.motherId || p.targetId
            return (
              pMid === motherId ||
              (pMid &&
                motherId &&
                (pMid.includes(motherId) || motherId.includes(pMid)))
            )
          })
          .map((p) => p.pregnancy_id || p.id || p._id)
          .filter(Boolean)
      )

      localVisits = allVisits.filter((v) => {
        const vMid = v.mother_id || v.motherId || v.targetId
        const vPid = v.pregnancy_id || v.pregnancyId
        const matchesMother = Boolean(
          vMid === motherId ||
          (vMid &&
            motherId &&
            (vMid.includes(motherId) || motherId.includes(vMid)))
        )
        const matchesPregnancy = Boolean(vPid && motherPregIds.has(vPid))
        return matchesMother || matchesPregnancy
      })
    } catch (err) {
      console.warn("[motherRepository] Local visits query failed:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(
          `/api/v1/prenatal-visit/mother/${motherId}`
        )
        const remoteList =
          response.data?.result ||
          response.data?.data ||
          (Array.isArray(response.data) ? response.data : [])
        if (Array.isArray(remoteList)) {
          const pendingVisits = localVisits.filter(
            (v) => v.sync_status !== "synced"
          )
          const pendingIds = new Set(pendingVisits.map((v) => v.id))

          const formattedRemote: LocalPrenatalVisit[] = remoteList
            .filter((v: any) => !pendingIds.has(v.visit_id || v._id || v.id))
            .map((v: any) => ({
              ...v,
              id: v.visit_id || v._id || v.id,
              mother_id: motherId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          const pendingQueue = await syncEngine.getQueue()
          const pendingTempIds = new Set(
            pendingQueue.map((m) => m.temp_id).filter(Boolean)
          )

          const remoteIds = new Set(formattedRemote.map((v) => v.id))
          const remoteVisitIds = new Set(
            remoteList
              .map((v: any) => v.visit_id || v._id || v.id)
              .filter(Boolean)
          )

          const toDelete = localVisits.filter((v) => {
            const isPendingInOutbox =
              (v.id && pendingTempIds.has(v.id)) ||
              (v.visit_id && pendingTempIds.has(v.visit_id))
            if (isPendingInOutbox) return false
            return (
              !remoteIds.has(v.id) &&
              (!v.visit_id || !remoteVisitIds.has(v.visit_id))
            )
          })

          for (const item of toDelete) {
            if (item.id) await db.prenatalVisits.delete(item.id).catch(() => {})
            if (item.visit_id)
              await db.prenatalVisits
                .where("visit_id")
                .equals(item.visit_id)
                .delete()
                .catch(() => {})
          }

          if (formattedRemote.length > 0 || pendingVisits.length > 0) {
            await db.prenatalVisits.bulkPut([
              ...formattedRemote,
              ...pendingVisits,
            ])
          }
        }
      } catch (err) {
        console.warn(
          `[motherRepository] Fetch prenatal visits for ${motherId} failed, returning Dexie data:`,
          err
        )
      }
    }

    const finalAllVisits = await db.prenatalVisits.toArray()
    const finalAllPreg = await db.pregnancies.toArray()
    const finalMotherPregIds = new Set(
      finalAllPreg
        .filter((p) => {
          const pMid = p.mother_id || p.motherId || p.targetId
          return (
            pMid === motherId ||
            (pMid &&
              motherId &&
              (pMid.includes(motherId) || motherId.includes(pMid)))
          )
        })
        .map((p) => p.pregnancy_id || p.id || p._id)
        .filter(Boolean)
    )

    return finalAllVisits.filter((v) => {
      const vMid = v.mother_id || v.motherId || v.targetId
      const vPid = v.pregnancy_id || v.pregnancyId
      const matchesMother = Boolean(
        vMid === motherId ||
        (vMid &&
          motherId &&
          (vMid.includes(motherId) || motherId.includes(vMid)))
      )
      const matchesPregnancy = Boolean(vPid && finalMotherPregIds.has(vPid))
      return matchesMother || matchesPregnancy
    })
  },

  async registerLabRecord(payload: any): Promise<LocalLabRecord> {
    let motherId =
      payload.mother_id || payload.motherId || payload.targetId || ""
    let pregnancyId = payload.pregnancy_id || payload.pregnancyId || ""

    if (pregnancyId && pregnancyId.startsWith("temp-")) {
      try {
        const allPregs = await db.pregnancies.toArray()
        const matched = allPregs.find(
          (p) =>
            p.id === pregnancyId ||
            p.temp_id === pregnancyId ||
            (motherId && (p.mother_id === motherId || p.motherId === motherId))
        )
        if (
          matched &&
          matched.pregnancy_id &&
          !matched.pregnancy_id.startsWith("temp-")
        ) {
          pregnancyId = matched.pregnancy_id
          payload.pregnancy_id = matched.pregnancy_id
        }
      } catch (e) {}
    }

    if (!motherId && pregnancyId) {
      try {
        const preg = await db.pregnancies.get(pregnancyId)
        if (preg) motherId = preg.mother_id || preg.motherId || ""
      } catch {}
    }

    if (motherId && motherId.startsWith("temp-")) {
      try {
        const allMothers = await db.mothers.toArray()
        const matched = allMothers.find(
          (m) =>
            m.id === motherId || m.temp_id === motherId || m._id === motherId
        )
        if (
          matched &&
          matched.mother_id &&
          !matched.mother_id.startsWith("temp-")
        ) {
          motherId = matched.mother_id
          payload.mother_id = matched.mother_id
        }
      } catch (e) {}
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post(
          "/api/v1/lab-screening/register",
          payload
        )
        const l = response.data?.result || response.data?.data || response.data
        const canonicalId = l.screening_id || l._id || l.id

        const syncedLab: LocalLabRecord = {
          ...payload,
          ...l,
          id: canonicalId,
          screening_id: canonicalId,
          mother_id: motherId,
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.labRecords.put(syncedLab)
        return syncedLab
      } catch (err: any) {
        if (
          err.response?.status >= 400 &&
          err.response?.status < 500 &&
          err.response?.status !== 408 &&
          err.response?.status !== 429
        ) {
          throw err
        }
        console.warn(
          "[motherRepository] Online registerLabRecord failed, falling back to offline outbox:",
          err
        )
      }
    }

    const tempId = `temp-lab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newLab: LocalLabRecord = {
      ...payload,
      id: tempId,
      mother_id: motherId,
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.labRecords.put(newLab)

    await syncEngine.enqueueMutation({
      entity_type: "lab_record",
      action: "CREATE",
      endpoint: "/api/v1/lab-screening/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newLab
  },

  async uploadFile(file: File): Promise<{ url: string; blobId?: string }> {
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 10 MB.`
      )
    }

    const tempBlobId = `blob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    await db.blobs.put({
      id: tempBlobId,
      data: file,
      filename: file.name,
      mime_type: file.type,
    })

    if (!syncEngine.isNetworkOnline()) {
      const base64Url = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      return { url: base64Url, blobId: tempBlobId }
    }

    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await apiClient.post(
        "/api/v1/lab-screening/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      )

      const remoteUrl =
        res.data?.file_url ||
        res.data?.fileUrl ||
        res.data?.url ||
        res.data?.result ||
        ""
      await db.blobs.delete(tempBlobId)
      return { url: remoteUrl }
    } catch (err) {
      console.warn(
        "[motherRepository] File upload failed online, saved blob locally for sync:",
        err
      )
      const base64Url = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      return { url: base64Url, blobId: tempBlobId }
    }
  },

  async registerPregnancy(payload: any): Promise<LocalPregnancy> {
    let motherId =
      payload.motherId || payload.mother_id || payload.targetId || ""

    if (motherId && motherId.startsWith("temp-")) {
      try {
        const allMothers = await db.mothers.toArray()
        const matched = allMothers.find(
          (m) =>
            m.id === motherId || m.temp_id === motherId || m._id === motherId
        )
        if (
          matched &&
          matched.mother_id &&
          !matched.mother_id.startsWith("temp-")
        ) {
          motherId = matched.mother_id
          payload.motherId = matched.mother_id
          payload.mother_id = matched.mother_id
        }
      } catch (e) {}
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post(
          "/api/v1/pregnancy/register",
          payload
        )
        const p =
          response.data?.pregnancy || response.data?.result || response.data
        const canonicalId = p.pregnancy_id || p._id || p.id

        const syncedPreg: LocalPregnancy = {
          ...payload,
          ...p,
          id: canonicalId,
          pregnancy_id: canonicalId,
          mother_id: motherId,
          pregnancy_status:
            payload.pregnancy_status || p.pregnancy_status || "Active",
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.pregnancies.put(syncedPreg)
        return syncedPreg
      } catch (err: any) {
        if (
          err.response?.status >= 400 &&
          err.response?.status < 500 &&
          err.response?.status !== 408 &&
          err.response?.status !== 429
        ) {
          throw err
        }
        console.warn(
          "[motherRepository] Online registerPregnancy failed, falling back to offline outbox:",
          err
        )
      }
    }

    const tempId = `temp-preg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newPregnancy: LocalPregnancy = {
      ...payload,
      id: tempId,
      pregnancy_id: tempId,
      mother_id: motherId,
      pregnancy_status: payload.pregnancy_status || "Active",
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.pregnancies.put(newPregnancy)

    await syncEngine.enqueueMutation({
      entity_type: "pregnancy",
      action: "CREATE",
      endpoint: "/api/v1/pregnancy/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newPregnancy
  },

  async getPregnancies(motherId: string): Promise<LocalPregnancy[]> {
    let local: LocalPregnancy[] = []
    try {
      const allPreg = await db.pregnancies.toArray()
      local = allPreg.filter((p) => {
        const pMid = p.mother_id || p.motherId || p.targetId
        return (
          pMid === motherId ||
          pMid.includes(motherId) ||
          motherId.includes(pMid)
        )
      })
    } catch (err) {
      console.warn("[motherRepository] Local pregnancies query failed:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(
          `/api/v1/pregnancy/mother/${motherId}`
        )
        const remoteList =
          response.data?.result ||
          response.data?.data ||
          (Array.isArray(response.data) ? response.data : [])
        if (Array.isArray(remoteList)) {
          const pending = local.filter((p) => p.sync_status !== "synced")
          const pendingIds = new Set(pending.map((p) => p.id))

          const formattedRemote: LocalPregnancy[] = remoteList
            .filter(
              (p: any) => !pendingIds.has(p.pregnancy_id || p._id || p.id)
            )
            .map((p: any) => ({
              ...p,
              id: p.pregnancy_id || p._id || p.id,
              mother_id: motherId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          const remoteIds = new Set(formattedRemote.map((p) => p.id))
          const toDelete = local.filter(
            (p) => p.sync_status === "synced" && !remoteIds.has(p.id)
          )
          for (const item of toDelete) {
            await db.pregnancies.delete(item.id)
            if (item.pregnancy_id)
              await db.pregnancies
                .where("pregnancy_id")
                .equals(item.pregnancy_id)
                .delete()
          }

          if (formattedRemote.length > 0 || pending.length > 0) {
            await db.pregnancies.bulkPut([...formattedRemote, ...pending])
          }
          const allUpdated = await db.pregnancies.toArray()
          return allUpdated.filter((p) => {
            const pMid = p.mother_id || p.motherId || p.targetId
            return (
              pMid === motherId ||
              pMid.includes(motherId) ||
              motherId.includes(pMid)
            )
          })
        }
      } catch (err) {
        console.warn(
          `[motherRepository] Fetch pregnancies for ${motherId} failed:`,
          err
        )
      }
    }

    return local
  },

  async getLabRecords(motherId: string): Promise<LocalLabRecord[]> {
    let local: LocalLabRecord[] = []
    try {
      const allLabs = await db.labRecords.toArray()
      local = allLabs.filter((l) => {
        const lMid = l.mother_id || l.motherId || l.targetId
        return (
          lMid === motherId ||
          lMid.includes(motherId) ||
          motherId.includes(lMid)
        )
      })
    } catch (err) {
      console.warn("[motherRepository] Local lab records query failed:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(
          `/api/v1/lab-screening/get/mother/${motherId}`
        )
        const remoteList =
          response.data?.result ||
          response.data?.data ||
          (Array.isArray(response.data) ? response.data : [])
        if (Array.isArray(remoteList)) {
          const pending = local.filter((l) => l.sync_status !== "synced")
          const pendingIds = new Set(pending.map((l) => l.id))

          const formattedRemote: LocalLabRecord[] = remoteList
            .filter((l: any) => !pendingIds.has(l._id || l.id))
            .map((l: any) => ({
              ...l,
              id: l._id || l.id,
              mother_id: motherId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          const remoteIds = new Set(formattedRemote.map((l) => l.id))
          const toDelete = local.filter(
            (l) => l.sync_status === "synced" && !remoteIds.has(l.id)
          )
          for (const item of toDelete) {
            await db.labRecords.delete(item.id)
            if (item.screening_id)
              await db.labRecords
                .where("screening_id")
                .equals(item.screening_id)
                .delete()
          }

          if (formattedRemote.length > 0 || pending.length > 0) {
            await db.labRecords.bulkPut([...formattedRemote, ...pending])
          }
          const allUpdated = await db.labRecords.toArray()
          return allUpdated.filter((l) => {
            const lMid = l.mother_id || l.motherId || l.targetId
            return (
              lMid === motherId ||
              lMid.includes(motherId) ||
              motherId.includes(lMid)
            )
          })
        }
      } catch (err) {
        console.warn(
          `[motherRepository] Fetch lab records for ${motherId} failed:`,
          err
        )
      }
    }

    return local
  },

  async registerSupplement(payload: any): Promise<LocalSupplement> {
    let motherId =
      payload.motherId || payload.mother_id || payload.targetId || ""
    let pregnancyId = payload.pregnancy_id || payload.pregnancyId || ""

    if (pregnancyId && pregnancyId.startsWith("temp-")) {
      try {
        const allPregs = await db.pregnancies.toArray()
        const matched = allPregs.find(
          (p) =>
            p.id === pregnancyId ||
            p.temp_id === pregnancyId ||
            (motherId && (p.mother_id === motherId || p.motherId === motherId))
        )
        if (
          matched &&
          matched.pregnancy_id &&
          !matched.pregnancy_id.startsWith("temp-")
        ) {
          pregnancyId = matched.pregnancy_id
          payload.pregnancy_id = matched.pregnancy_id
        }
      } catch (e) {}
    }

    if (!motherId && pregnancyId) {
      try {
        const preg = await db.pregnancies.get(pregnancyId)
        if (preg) motherId = preg.mother_id || preg.motherId || ""
      } catch {}
    }

    if (motherId && motherId.startsWith("temp-")) {
      try {
        const allMothers = await db.mothers.toArray()
        const matched = allMothers.find(
          (m) =>
            m.id === motherId || m.temp_id === motherId || m._id === motherId
        )
        if (
          matched &&
          matched.mother_id &&
          !matched.mother_id.startsWith("temp-")
        ) {
          motherId = matched.mother_id
          payload.mother_id = matched.mother_id
          payload.motherId = matched.mother_id
        }
      } catch (e) {}
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post(
          "/api/v1/supplement/register",
          payload
        )
        const s =
          response.data?.result ||
          response.data?.supplement_record ||
          response.data
        const canonicalId = s.supplement_id || s._id || s.id

        const syncedSupp: LocalSupplement = {
          ...payload,
          ...s,
          id: canonicalId,
          supplement_id: canonicalId,
          mother_id: motherId,
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.supplements.put(syncedSupp)
        return syncedSupp
      } catch (err: any) {
        if (
          err.response?.status >= 400 &&
          err.response?.status < 500 &&
          err.response?.status !== 408 &&
          err.response?.status !== 429
        ) {
          throw err
        }
        console.warn(
          "[motherRepository] Online registerSupplement failed, falling back to offline outbox:",
          err
        )
      }
    }

    const tempId = `temp-supp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newSupplement: LocalSupplement = {
      ...payload,
      id: tempId,
      supplement_id: tempId,
      mother_id: motherId,
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.supplements.put(newSupplement)

    await syncEngine.enqueueMutation({
      entity_type: "supplement",
      action: "CREATE",
      endpoint: "/api/v1/supplement/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newSupplement
  },

  async getSupplements(motherId: string): Promise<LocalSupplement[]> {
    let local = await db.supplements
      .where("mother_id")
      .equals(motherId)
      .toArray()

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(
          `/api/v1/supplement/get/mother/${motherId}`
        )
        const remoteList = response.data?.result || response.data?.data || []
        if (Array.isArray(remoteList)) {
          const pending = local.filter((s) => s.sync_status !== "synced")
          const pendingIds = new Set(pending.map((s) => s.id))

          const formattedRemote: LocalSupplement[] = remoteList
            .filter((s: any) => !pendingIds.has(s._id || s.id))
            .map((s: any) => ({
              ...s,
              id: s._id || s.id,
              mother_id: motherId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          const remoteIds = new Set(formattedRemote.map((s) => s.id))
          const toDelete = local.filter(
            (s) => s.sync_status === "synced" && !remoteIds.has(s.id)
          )
          for (const item of toDelete) {
            await db.supplements.delete(item.id)
            if (item.supplement_id)
              await db.supplements
                .where("supplement_id")
                .equals(item.supplement_id)
                .delete()
          }

          if (formattedRemote.length > 0 || pending.length > 0) {
            await db.supplements.bulkPut([...formattedRemote, ...pending])
          }
          return await db.supplements
            .where("mother_id")
            .equals(motherId)
            .toArray()
        }
      } catch (err) {
        console.warn(
          `[motherRepository] Fetch supplements for ${motherId} failed:`,
          err
        )
      }
    }

    return local
  },

  async assignFacility(motherCode: string): Promise<any> {
    if (syncEngine.isNetworkOnline()) {
      const response = await apiClient.post("/api/v1/mother/assign-facility", {
        mother_code: motherCode,
      })
      if (response.data?.mother) {
        const m = response.data.mother
        const motherId = m.mother_id || m.id
        await db.mothers.put({
          ...m,
          id: motherId,
          _id: motherId,
          mother_id: motherId,
          user_id: m.user_id || m.user?.user_id,
          sync_status: "synced",
          updated_at: Date.now(),
        })
      }
      return response.data
    } else {
      throw new Error(
        "Connecting a mother via code requires an active network connection."
      )
    }
  },

  async enrollMotherInFacility(
    motherId: string,
    facilityId: string,
    notes?: string
  ): Promise<any> {
    if (syncEngine.isNetworkOnline()) {
      const response = await apiClient.post("/api/v1/mother/enroll", {
        mother_id: motherId,
        facility_id: facilityId,
        notes,
      })
      const local = await db.mothers.get(motherId)
      if (local) {
        const currentIds = new Set(
          local.facility_ids || [local.facility_id].filter(Boolean)
        )
        currentIds.add(facilityId)
        await db.mothers.update(motherId, {
          facility_ids: Array.from(currentIds),
          updated_at: Date.now(),
        })
      }
      return response.data
    } else {
      await syncEngine.enqueueMutation({
        entity_type: "mother",
        action: "UPDATE",
        endpoint: "/api/v1/mother/enroll",
        method: "POST",
        payload: { mother_id: motherId, facility_id: facilityId, notes },
      })
      const local = await db.mothers.get(motherId)
      if (local) {
        const currentIds = new Set(
          local.facility_ids || [local.facility_id].filter(Boolean)
        )
        currentIds.add(facilityId)
        await db.mothers.update(motherId, {
          facility_ids: Array.from(currentIds),
          updated_at: Date.now(),
        })
      }
      return { success: true, offline: true }
    }
  },

  async getMotherFacilities(motherId: string): Promise<any> {
    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(
          `/api/v1/mother/${motherId}/facilities`
        )
        return response.data
      } catch (e) {
        console.warn(
          "[motherRepository] Failed to fetch facilities for mother:",
          e
        )
      }
    }
    const local = await db.mothers.get(motherId)
    return {
      homeFacility: local?.facility || null,
      enrollments: local?.facilityEnrollments || [],
    }
  },

  async assignStaff(
    motherId: string,
    assignedWorkerId: string,
    staffData?: any
  ): Promise<any> {
    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.put(
          `/api/v1/mother/assign-staff/${motherId}`,
          { assigned_worker_id: assignedWorkerId }
        )
        const updated = response.data?.result || response.data
        if (updated) {
          const mId = updated.mother_id || updated.id || motherId
          await db.mothers
            .where("id")
            .equals(mId)
            .modify({
              assigned_worker_id: assignedWorkerId,
              assignedWorker: updated.assignedWorker || staffData,
              assigned_worker: updated.assignedWorker || staffData,
              updated_at: Date.now(),
            })
            .catch(() => {})
        }
        return response.data
      } catch (err) {
        console.warn(
          "[motherRepository] assignStaff online call failed, queuing offline:",
          err
        )
      }
    }

    await syncEngine.enqueueMutation({
      entity_type: "mother",
      action: "UPDATE",
      endpoint: `/api/v1/mother/assign-staff/${motherId}`,
      method: "PUT",
      payload: { assigned_worker_id: assignedWorkerId },
      temp_id: motherId.startsWith("temp-") ? motherId : undefined,
    })

    await db.mothers
      .where("id")
      .equals(motherId)
      .modify({
        assigned_worker_id: assignedWorkerId,
        assignedWorker: staffData,
        assigned_worker: staffData,
        updated_at: Date.now(),
      })
      .catch(() => {})

    return { success: true, offline: true }
  },
}
