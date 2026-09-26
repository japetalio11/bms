import { motherRepository } from "@/lib/repositories/motherRepository"
import { appointmentRepository } from "@/lib/repositories/appointmentRepository"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"
import { db } from "@/lib/db/bmsDatabase"

export const mothersApi = {
  async getActiveMothers(facilityId?: string) {
    return await motherRepository.getActiveMothers(facilityId)
  },

  async getMotherProfile(targetId: string) {
    return await motherRepository.getMotherProfile(targetId)
  },

  async getCompositeProfile(targetId: string) {
    return await motherRepository.getCompositeProfile(targetId)
  },

  async registerMother(payload: any) {
    return await motherRepository.registerMother(payload)
  },

  async updateMother(motherId: string, payload: any, blobIds?: string[]) {
    return await motherRepository.updateMother(motherId, payload, blobIds)
  },

  async deleteMother(motherId: string) {
    return await motherRepository.deleteMother(motherId)
  },

  async uploadAvatar(file: File, motherId?: string) {
    const { url, blobId } = await motherRepository.uploadFile(file)
    if (motherId && url) {
      await motherRepository.updateMother(
        motherId,
        { photo_url: url, profile_url: url },
        blobId ? [blobId] : undefined
      )
    }
    return url
  },

  async getPregnancies(motherId: string) {
    const pregnancies = await motherRepository.getPregnancies(motherId)
    return { result: pregnancies, data: pregnancies }
  },

  async registerPregnancy(payload: any) {
    return await motherRepository.registerPregnancy(payload)
  },

  async getPrenatalVisits(motherId: string) {
    const visits = await motherRepository.getPrenatalVisits(motherId)
    return { result: visits, data: visits }
  },

  async registerPrenatalVisit(payload: any) {
    return await motherRepository.registerPrenatalVisit(payload)
  },

  async getAppointmentsByUser(userId: string, motherId?: string) {
    const appointments = await appointmentRepository.getAppointmentsForMother(userId, motherId)
    return { result: appointments, data: appointments }
  },

  async registerAppointment(payload: any) {
    return await appointmentRepository.createAppointment(payload)
  },

  async getLabRecords(motherId: string) {
    const labs = await motherRepository.getLabRecords(motherId)
    return { result: labs, data: labs }
  },

  async uploadLabFile(file: File) {
    const { url, blobId } = await motherRepository.uploadFile(file)
    return { url, fileUrl: url, file_url: url, blobId }
  },

  async registerLabRecord(payload: any) {
    return await motherRepository.registerLabRecord(payload)
  },

  async getSupplements(motherId: string) {
    const supplements = await motherRepository.getSupplements(motherId)
    return { result: supplements, data: supplements }
  },

  async registerSupplement(payload: any) {
    return await motherRepository.registerSupplement(payload)
  },

  async updateRecord(url: string, payload: any) {
    let entityType: any = "custom_request"
    if (url.includes("/delivery-outcome/")) entityType = "delivery_outcome"
    else if (url.includes("/newborn/")) entityType = "newborn_record"
    else if (url.includes("/pregnancy/")) entityType = "pregnancy"
    else if (url.includes("/prenatal-visit/")) entityType = "prenatal_visit"
    else if (url.includes("/appointment/")) entityType = "appointment"
    else if (url.includes("/lab-screening/")) entityType = "lab_record"
    else if (url.includes("/supplement/")) entityType = "supplement"

    const targetId = url.split("/").pop()

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.put(url, payload)
        return response.data
      } catch (err: any) {
        if (
          url.includes("/temp-") &&
          (err.response?.status === 404 || err.response?.status === 400)
        ) {
          console.warn(
            "[mothersApi] Online update for temp record handled locally:",
            url
          )
          return { success: true, offline: true }
        }
        console.warn("[mothersApi] Online update failed, enqueuing offline:", err)
      }
    }

    await syncEngine.enqueueMutation({
      entity_type: entityType,
      action: "UPDATE",
      endpoint: url,
      method: "PUT",
      payload,
      temp_id: targetId && !targetId.startsWith("temp-") ? undefined : targetId,
    })

    return { success: true, offline: true }
  },

  async deleteRecord(url: string) {
    let entityType: any = "custom_request"
    if (url.includes("/delivery-outcome/")) entityType = "delivery_outcome"
    else if (url.includes("/newborn/")) entityType = "newborn_record"
    else if (url.includes("/pregnancy/")) entityType = "pregnancy"
    else if (url.includes("/prenatal-visit/")) entityType = "prenatal_visit"
    else if (url.includes("/appointment/")) entityType = "appointment"
    else if (url.includes("/lab-screening/")) entityType = "lab_record"
    else if (url.includes("/supplement/")) entityType = "supplement"

    const targetId = url.split("/").pop()

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.delete(url)
        return response.data
      } catch (err: any) {
        if (
          url.includes("/temp-") ||
          err.response?.status === 404 ||
          err.response?.status === 400 ||
          err.response?.data?.error?.toLowerCase?.().includes("not found")
        ) {
          console.warn(
            "[mothersApi] Record already deleted or not found on server:",
            url
          )
          return { success: true, offline: true }
        }
        console.warn("[mothersApi] Online delete failed, enqueuing offline:", err)
      }
    }

    if (targetId && !targetId.startsWith("temp-")) {
      await syncEngine.enqueueMutation({
        entity_type: entityType,
        action: "DELETE",
        endpoint: url,
        method: "DELETE",
        payload: { id: targetId },
      })
    }

    return { success: true, offline: true }
  },

  async assignFacility(motherCode: string) {
    return await motherRepository.assignFacility(motherCode)
  },

  async assignStaff(motherId: string, assignedWorkerId: string, staffData?: any) {
    return await motherRepository.assignStaff(motherId, assignedWorkerId, staffData)
  },

  async registerDeliveryOutcome(payload: any) {
    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post("/api/v1/delivery-outcome/register", payload)
        const outcome = response.data?.data || response.data?.result
        if (outcome) {
          const dId = outcome.delivery_id || outcome.id
          await db.deliveries.put({
            ...outcome,
            id: dId,
            delivery_id: dId,
            pregnancy_id: payload.pregnancy_id,
            sync_status: "synced",
            updated_at: Date.now(),
          })
          if (Array.isArray(outcome.newbornRecords)) {
            for (const nb of outcome.newbornRecords) {
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
          if (Array.isArray(outcome.postpartumVisits)) {
            for (const pv of outcome.postpartumVisits) {
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
          if (payload.pregnancy_id) {
            await db.pregnancies
              .where("id")
              .equals(payload.pregnancy_id)
              .modify({ status: "Delivered", pregnancy_status: "Delivered" })
              .catch(() => {})
          }
        }
        return response.data
      } catch (err) {
        console.warn("[mothersApi] Online delivery registration failed, queuing offline:", err)
      }
    }

    const tempDeliveryId = `temp-del-${Date.now()}`
    const localDelivery = {
      id: tempDeliveryId,
      delivery_id: tempDeliveryId,
      pregnancy_id: payload.pregnancy_id,
      delivery_date: payload.delivery_date || new Date().toISOString(),
      place_of_delivery: payload.place_of_delivery,
      mode_of_delivery: payload.mode_of_delivery,
      duration_of_labor_hours: payload.duration_of_labor_hours,
      blood_loss_ml: payload.blood_loss_ml,
      delivery_complications: payload.delivery_complications,
      sync_status: "pending_create" as const,
      updated_at: Date.now(),
    }

    await db.deliveries.put(localDelivery)

    if (Array.isArray(payload.newborns)) {
      for (const nb of payload.newborns) {
        const tempNbId = `temp-nb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
        await db.newborns.put({
          id: tempNbId,
          newborn_id: tempNbId,
          delivery_id: tempDeliveryId,
          sex: nb.sex,
          birth_weight_kg: Number(nb.birth_weight_kg),
          status_at_birth: nb.status_at_birth,
          apgar_score: Number(nb.apgar_score),
          sync_status: "pending_create",
          updated_at: Date.now(),
        })
      }
    }

    if (payload.pregnancy_id) {
      await db.pregnancies
        .where("id")
        .equals(payload.pregnancy_id)
        .modify({ status: "Delivered", pregnancy_status: "Delivered" })
        .catch(() => {})
    }

    await syncEngine.enqueueMutation({
      entity_type: "delivery_outcome",
      action: "CREATE",
      endpoint: "/api/v1/delivery-outcome/register",
      method: "POST",
      payload,
      temp_id: tempDeliveryId,
    })

    return { success: true, offline: true, data: localDelivery }
  },
}
