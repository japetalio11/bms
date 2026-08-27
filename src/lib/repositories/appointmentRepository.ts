import { db } from "@/lib/db/bmsDatabase"
import type { LocalAppointment } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export const appointmentRepository = {
  /**
   * Retrieves all appointments for a facility or user.
   */
  async getAllFacilityAppointments(facilityId?: string): Promise<LocalAppointment[]> {
    let localList: LocalAppointment[] = []
    try {
      if (facilityId) {
        localList = await db.appointments.where("facility_id").equals(facilityId).toArray()
      } else {
        localList = await db.appointments.toArray()
      }
    } catch (err) {
      console.warn("[appointmentRepository] Failed to query local Dexie DB:", err)
    }

    // Non-blocking background sync if online
    if (syncEngine.isNetworkOnline()) {
      (async () => {
        try {
          const endpoint = facilityId ? `/api/v1/appointment/get/facility/${facilityId}` : "/api/v1/appointment/getAll"
          const response = await apiClient.get(endpoint)
          const data = response.data
          const remoteList = data?.data || data?.result || (Array.isArray(data) ? data : [])

          if (Array.isArray(remoteList) && remoteList.length > 0) {
            const pendingItems = localList.filter((a) => a.sync_status !== "synced")
            const pendingIds = new Set(pendingItems.map((a) => a.id))

            const formattedRemote: LocalAppointment[] = remoteList
              .filter((a: any) => !pendingIds.has(a._id || a.id))
              .map((a: any) => ({
                ...a,
                id: a._id || a.id,
                mother_id: a.mother_id || a.motherId,
                user_id: a.user_id || a.userId,
                facility_id: a.facility_id || a.facilityId || facilityId,
                appointment_date: a.appointment_date || a.appointmentDate || a.date,
                sync_status: "synced" as const,
                updated_at: Date.now(),
              }))

            await db.appointments.bulkPut([...formattedRemote, ...pendingItems])
          }
        } catch (err) {
          console.warn("[appointmentRepository] Background appointment fetch failed:", err)
        }
      })()
    }

    return localList
  },

  /**
   * Creates an appointment offline-first.
   */
  async createAppointment(payload: any): Promise<LocalAppointment> {
    const tempId = `temp-appt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newAppointment: LocalAppointment = {
      ...payload,
      id: tempId,
      mother_id: payload.mother_id || payload.motherId,
      user_id: payload.user_id || payload.userId,
      facility_id: payload.facility_id || payload.facilityId,
      appointment_date: payload.appointment_date || payload.appointmentDate || payload.date,
      status: payload.status || "Scheduled",
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    // Write to Dexie DB
    await db.appointments.put(newAppointment)

    // Enqueue mutation
    await syncEngine.enqueueMutation({
      entity_type: "appointment",
      action: "CREATE",
      endpoint: "/api/v1/appointment/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newAppointment
  },

  /**
   * Cancels or updates an appointment offline-first.
   */
  async cancelAppointment(appointmentId: string, payload?: any) {
    const local = await db.appointments.get(appointmentId)
    if (local) {
      await db.appointments.update(appointmentId, {
        ...payload,
        status: "Cancelled",
        sync_status: local.sync_status === "pending_create" ? "pending_create" : "pending_update",
        updated_at: Date.now(),
      })
    }

    await syncEngine.enqueueMutation({
      entity_type: "appointment",
      action: "UPDATE",
      endpoint: `/api/v1/appointment/cancel/${appointmentId}`,
      method: "PUT",
      payload: payload || {},
      temp_id: appointmentId.startsWith("temp-") ? appointmentId : undefined,
    })

    return { success: true }
  },

  /**
   * Deletes an appointment offline-first.
   */
  async deleteAppointment(appointmentId: string) {
    await db.appointments.delete(appointmentId)

    if (!appointmentId.startsWith("temp-")) {
      await syncEngine.enqueueMutation({
        entity_type: "appointment",
        action: "DELETE",
        endpoint: `/api/v1/appointment/delete/${appointmentId}`,
        method: "DELETE",
        payload: {},
      })
    }

    return { success: true }
  },
}
