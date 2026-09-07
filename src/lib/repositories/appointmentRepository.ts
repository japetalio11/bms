import { db } from "@/lib/db/bmsDatabase"
import type { LocalAppointment } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

const DEFAULT_APPOINTMENTS: LocalAppointment[] = [
  {
    id: "APPT-1001",
    appointment_id: "APPT-1001",
    mother_id: "MOTH-1001",
    user_id: "USR-1001",
    facility_id: "default",
    appointment_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    appointment_time: "09:00 AM",
    appointment_type: "Prenatal Checkup",
    status: "Scheduled",
    risk_level: "Low Risk",
    sync_status: "synced",
    updated_at: Date.now(),
    user: {
      first_name: "Maria",
      last_name: "Santos",
      phone_number: "09171234567"
    }
  },
  {
    id: "APPT-1002",
    appointment_id: "APPT-1002",
    mother_id: "MOTH-1002",
    user_id: "USR-1002",
    facility_id: "default",
    appointment_date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
    appointment_time: "10:30 AM",
    appointment_type: "High-Risk Consultation",
    status: "Scheduled",
    risk_level: "High Risk",
    sync_status: "synced",
    updated_at: Date.now(),
    user: {
      first_name: "Ana",
      last_name: "Reyes",
      phone_number: "09189876543"
    }
  },
  {
    id: "APPT-1003",
    appointment_id: "APPT-1003",
    mother_id: "MOTH-1003",
    user_id: "USR-1003",
    facility_id: "default",
    appointment_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    appointment_time: "02:00 PM",
    appointment_type: "Postpartum Follow-up",
    status: "Completed",
    risk_level: "Low Risk",
    sync_status: "synced",
    updated_at: Date.now(),
    user: {
      first_name: "Elena",
      last_name: "Torres",
      phone_number: "09195554321"
    }
  }
]

export const appointmentRepository = {
  /**
   * Retrieves all appointments for a facility or user.
   * Reads local Dexie DB, then syncs with backend if online.
   */
  async getAllFacilityAppointments(facilityId?: string): Promise<LocalAppointment[]> {
    let localList: LocalAppointment[] = []
    try {
      localList = await db.appointments.toArray()
    } catch (err) {
      console.warn("[appointmentRepository] Failed to query local Dexie DB:", err)
    }

    // Sync with backend if online
    if (syncEngine.isNetworkOnline()) {
      try {
        const endpoint = facilityId ? `/api/v1/appointment/get/facility/${facilityId}` : "/api/v1/appointment/getAll"
        const response = await apiClient.get(endpoint)
        const data = response.data
        const remoteList = data?.data || data?.result || (Array.isArray(data) ? data : [])

        if (Array.isArray(remoteList) && remoteList.length > 0) {
          const pendingItems = localList.filter((a) => a.sync_status !== "synced")
          const pendingIds = new Set(pendingItems.map((a) => a.id))

          const formattedRemote: LocalAppointment[] = remoteList
            .filter((a: any) => !pendingIds.has(a._id || a.id || a.appointment_id))
            .map((a: any) => ({
              ...a,
              id: a._id || a.id || a.appointment_id,
              appointment_id: a.appointment_id || a._id || a.id,
              mother_id: a.mother_id || a.motherId,
              user_id: a.user_id || a.userId || a.user?.user_id,
              facility_id: a.facility_id || a.facilityId || a.user?.facility_id || facilityId,
              appointment_date: a.appointment_date || a.appointmentDate || a.date,
              appointment_time: a.appointment_time || a.appointmentTime || a.time,
              appointment_type: a.appointment_type || a.appointmentType || a.type,
              status: a.status || "Scheduled",
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          await db.appointments.bulkPut([...formattedRemote, ...pendingItems])
          localList = await db.appointments.toArray()
        }
      } catch (err) {
        console.warn("[appointmentRepository] Remote appointment fetch failed:", err)
      }
    }

    // If local database has 0 items, seed default sample appointments
    if (localList.length === 0) {
      try {
        await db.appointments.bulkPut(DEFAULT_APPOINTMENTS)
        localList = DEFAULT_APPOINTMENTS
      } catch (e) {
        console.warn("[appointmentRepository] Failed to seed default appointments:", e)
      }
    }

    if (facilityId) {
      const filtered = localList.filter(
        (a) => !a.facility_id || a.facility_id === facilityId || a.facilityId === facilityId
      )
      return filtered.length > 0 ? filtered : localList
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
      appointment_time: payload.appointment_time || payload.appointmentTime || payload.time,
      appointment_type: payload.appointment_type || payload.appointmentType || payload.type,
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

