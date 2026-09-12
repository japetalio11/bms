import { db } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export interface LocalStaffUser {
  id: string // user_id or temp-uuid
  user_id?: string
  first_name: string
  last_name: string
  middle_name?: string
  name: string
  email: string
  phone_number?: string
  role: string
  position: string
  sector: string
  avatar?: string
  profile_url?: string
  status: "Active" | "Deactivated" | "Pending"
  is_active: boolean
  facility_id?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export const userRepository = {
  /**
   * Retrieves all facility staff members.
   * Reads local Dexie DB cache first, then syncs with backend if online.
   */
  async getFacilityStaff(): Promise<LocalStaffUser[]> {
    let localStaff: LocalStaffUser[] = []
    try {
      const cached = await db.userSession.get("facility_staff_cache")
      if (cached && Array.isArray(cached.data)) {
        localStaff = cached.data
      }
    } catch (err) {
      console.warn("[userRepository] Failed to query local staff cache:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get("/api/v1/user/facility")
        const remoteList = response.data?.result || response.data?.data || (Array.isArray(response.data) ? response.data : [])

        if (Array.isArray(remoteList)) {
          const pendingItems = localStaff.filter((u) => u.sync_status !== "synced")
          const pendingIds = new Set(pendingItems.map((u) => u.id))

          const formattedRemote: LocalStaffUser[] = remoteList
            .filter((user: any) => user.role !== "Mother" && user.role !== "MOTHER" && !pendingIds.has(user.user_id || user._id || user.id))
            .map((user: any) => {
              const userId = user.user_id || user._id || user.id
              const fullName = `${user.first_name || ""} ${user.middle_name ? user.middle_name + " " : ""}${user.last_name || ""}`.trim()
              const statusVal = user.is_active ? "Active" : "Deactivated"

              return {
                ...user,
                id: userId,
                user_id: userId,
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                middle_name: user.middle_name || "",
                name: fullName || "Staff Member",
                avatar: user.profile_url || user.photo_url || "",
                status: statusVal,
                is_active: user.is_active ?? true,
                position: user.role || "Staff",
                sector: user.facility?.facility_name || user.sector || "N/A",
                email: user.email || "",
                phone_number: user.phone_number || "",
                facility_id: user.facility_id || user.facility?.facility_id,
                sync_status: "synced" as const,
                updated_at: Date.now(),
              }
            })

          const merged = [...pendingItems, ...formattedRemote]
          await db.userSession.put({ id: "facility_staff_cache", data: merged, updated_at: Date.now() })
          return merged
        }
      } catch (apiErr) {
        console.warn("[userRepository] Backend fetch failed, returning cached staff list:", apiErr)
      }
    }

    return localStaff
  },

  /**
   * Retrieves a staff profile by ID.
   */
  async getStaffProfile(targetId: string): Promise<LocalStaffUser | null> {
    const allStaff = await this.getFacilityStaff()
    const found = allStaff.find((u) => u.id === targetId || u.user_id === targetId) || null

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/user/${targetId}`)
        const user = response.data?.result || response.data?.data || response.data
        if (user) {
          const userId = user.user_id || user._id || user.id || targetId
          const fullName = `${user.first_name || ""} ${user.middle_name ? user.middle_name + " " : ""}${user.last_name || ""}`.trim()
          const updatedRecord: LocalStaffUser = {
            ...user,
            id: userId,
            user_id: userId,
            name: fullName || "Staff Member",
            avatar: user.profile_url || user.photo_url || "",
            status: user.is_active ? "Active" : "Deactivated",
            position: user.role || "Staff",
            sector: user.facility?.facility_name || user.sector || "N/A",
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }

          // Update cache
          const currentList = await this.getFacilityStaff()
          const filtered = currentList.filter((u) => u.id !== userId)
          await db.userSession.put({ id: "facility_staff_cache", data: [...filtered, updatedRecord], updated_at: Date.now() })
          return updatedRecord
        }
      } catch (err) {
        console.warn(`[userRepository] Remote profile fetch for ${targetId} failed:`, err)
      }
    }

    return found
  },

  /**
   * Invites / creates a new staff account (offline-first).
   */
  async inviteStaff(payload: {
    first_name: string
    last_name: string
    email: string
    phone_number?: string
    role: string
    sector?: string
    password?: string
  }): Promise<LocalStaffUser> {
    const tempId = `temp-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const fullName = `${payload.first_name} ${payload.last_name}`.trim()
    const currentUser = await db.userSession.get("current_user")
    const facilityId = currentUser?.facility_id || ""

    const newStaff: LocalStaffUser = {
      id: tempId,
      user_id: tempId,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      phone_number: payload.phone_number || "",
      name: fullName,
      role: payload.role,
      position: payload.role,
      sector: payload.sector || "N/A",
      status: "Pending",
      is_active: true,
      facility_id: facilityId,
      sync_status: syncEngine.isNetworkOnline() ? "synced" : "pending_create",
      updated_at: Date.now(),
    }

    // Save locally to cache immediately
    const currentList = await this.getFacilityStaff()
    await db.userSession.put({ id: "facility_staff_cache", data: [newStaff, ...currentList], updated_at: Date.now() })

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post("/api/v1/auth/create-staff", payload)
        const created = response.data?.user || response.data?.data || response.data?.result || response.data
        const canonicalId = created?.user_id || created?._id || created?.id || tempId

        const savedItem: LocalStaffUser = {
          ...newStaff,
          ...created,
          id: canonicalId,
          user_id: canonicalId,
          sync_status: "synced",
          updated_at: Date.now(),
        }

        const updatedList = (await this.getFacilityStaff()).map((u) => (u.id === tempId ? savedItem : u))
        await db.userSession.put({ id: "facility_staff_cache", data: updatedList, updated_at: Date.now() })
        return savedItem
      } catch (err: any) {
        if (err.response?.status >= 400 && err.response?.status < 500) {
          throw err
        }
        console.warn("[userRepository] Server error, queuing offline staff creation:", err)
      }
    }

    // Save offline outbox queue
    newStaff.sync_status = "pending_create"
    await syncEngine.enqueueMutation({
      entity_type: "custom_request",
      action: "CREATE",
      endpoint: "/api/v1/auth/create-staff",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newStaff
  },

  /**
   * Updates staff active status (activate/deactivate) offline-first.
   */
  async updateStaffStatus(userId: string, is_active: boolean): Promise<boolean> {
    const currentList = await this.getFacilityStaff()
    const updatedList = currentList.map((u) => {
      if (u.id === userId || u.user_id === userId) {
        return {
          ...u,
          is_active,
          status: (is_active ? "Active" : "Deactivated") as any,
          sync_status: (u.sync_status === "pending_create" ? "pending_create" : "pending_update") as any,
          updated_at: Date.now(),
        }
      }
      return u
    })
    await db.userSession.put({ id: "facility_staff_cache", data: updatedList, updated_at: Date.now() })

    if (syncEngine.isNetworkOnline()) {
      try {
        await apiClient.put(`/api/v1/user/${userId}/deactivate`, { is_active })
        const syncedList = (await this.getFacilityStaff()).map((u) => {
          if (u.id === userId || u.user_id === userId) {
            return { ...u, sync_status: "synced" as const }
          }
          return u
        })
        await db.userSession.put({ id: "facility_staff_cache", data: syncedList, updated_at: Date.now() })
        return true
      } catch (err) {
        console.warn("[userRepository] Online deactivate failed, queuing offline update:", err)
      }
    }

    await syncEngine.enqueueMutation({
      entity_type: "custom_request",
      action: "UPDATE",
      endpoint: `/api/v1/user/${userId}/deactivate`,
      method: "PUT",
      payload: { is_active },
    })

    return true
  },

  /**
   * Updates staff role / permissions offline-first.
   */
  async updateStaffRole(userId: string, role: string): Promise<boolean> {
    const currentList = await this.getFacilityStaff()
    const updatedList = currentList.map((u) => {
      if (u.id === userId || u.user_id === userId) {
        return {
          ...u,
          role,
          position: role,
          sync_status: (u.sync_status === "pending_create" ? "pending_create" : "pending_update") as any,
          updated_at: Date.now(),
        }
      }
      return u
    })
    await db.userSession.put({ id: "facility_staff_cache", data: updatedList, updated_at: Date.now() })

    if (syncEngine.isNetworkOnline()) {
      try {
        await apiClient.put(`/api/v1/user/${userId}/role`, { role })
        const syncedList = (await this.getFacilityStaff()).map((u) => {
          if (u.id === userId || u.user_id === userId) {
            return { ...u, sync_status: "synced" as const }
          }
          return u
        })
        await db.userSession.put({ id: "facility_staff_cache", data: syncedList, updated_at: Date.now() })
        return true
      } catch (err) {
        console.warn("[userRepository] Online role update failed, queuing offline mutation:", err)
      }
    }

    await syncEngine.enqueueMutation({
      entity_type: "custom_request",
      action: "UPDATE",
      endpoint: `/api/v1/user/${userId}/role`,
      method: "PUT",
      payload: { role },
    })

    return true
  },
}
