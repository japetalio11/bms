import { motherRepository } from "@/lib/repositories/motherRepository"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export const mothersApi = {
  async getActiveMothers(facilityId?: string) {
    return await motherRepository.getActiveMothers(facilityId)
  },

  async getMotherProfile(targetId: string) {
    return await motherRepository.getMotherProfile(targetId)
  },

  async registerMother(payload: any) {
    return await motherRepository.registerMother(payload)
  },

  async updateMother(motherId: string, payload: any) {
    return await motherRepository.updateMother(motherId, payload)
  },

  async uploadAvatar(file: File, motherId?: string) {
    const { url } = await motherRepository.uploadFile(file)
    if (motherId && url) {
      await motherRepository.updateMother(motherId, { photo_url: url, profile_url: url })
    }
    return url
  },

  async getPregnancies(motherId: string) {
    if (!syncEngine.isNetworkOnline()) {
      return { result: [] }
    }
    try {
      const response = await apiClient.get(`/api/v1/pregnancy/mother/${motherId}`)
      return response.data
    } catch {
      return { result: [] }
    }
  },

  async registerPregnancy(payload: any) {
    if (syncEngine.isNetworkOnline()) {
      const response = await apiClient.post("/api/v1/pregnancy/register", payload)
      return response.data
    }
    return { success: true, offline: true }
  },

  async getPrenatalVisits(motherId: string) {
    const visits = await motherRepository.getPrenatalVisits(motherId)
    return { result: visits, data: visits }
  },

  async registerPrenatalVisit(payload: any) {
    return await motherRepository.registerPrenatalVisit(payload)
  },

  async getAppointmentsByUser(userId: string) {
    if (!syncEngine.isNetworkOnline()) {
      return { result: [] }
    }
    try {
      const response = await apiClient.get(`/api/v1/appointment/get/user/${userId}`)
      return response.data
    } catch {
      return { result: [] }
    }
  },

  async registerAppointment(payload: any) {
    if (syncEngine.isNetworkOnline()) {
      const response = await apiClient.post("/api/v1/appointment/register", payload)
      return response.data
    }
    return { success: true, offline: true }
  },

  async getLabRecords(motherId: string) {
    if (!syncEngine.isNetworkOnline()) {
      return { result: [] }
    }
    try {
      const response = await apiClient.get(`/api/v1/lab-screening/get/mother/${motherId}`)
      return response.data
    } catch {
      return { result: [] }
    }
  },

  async uploadLabFile(file: File) {
    const { url } = await motherRepository.uploadFile(file)
    return { url, fileUrl: url, file_url: url }
  },

  async registerLabRecord(payload: any) {
    return await motherRepository.registerLabRecord(payload)
  },

  async getSupplements(motherId: string) {
    if (!syncEngine.isNetworkOnline()) {
      return { result: [] }
    }
    try {
      const response = await apiClient.get(`/api/v1/supplement/get/mother/${motherId}`)
      return response.data
    } catch {
      return { result: [] }
    }
  },

  async registerSupplement(payload: any) {
    if (syncEngine.isNetworkOnline()) {
      const response = await apiClient.post("/api/v1/supplement/register", payload)
      return response.data
    }
    return { success: true, offline: true }
  },

  async updateRecord(url: string, payload: any) {
    if (syncEngine.isNetworkOnline()) {
      const response = await apiClient.put(url, payload)
      return response.data
    }
    return { success: true, offline: true }
  },

  async deleteRecord(url: string) {
    if (syncEngine.isNetworkOnline()) {
      const response = await apiClient.delete(url)
      return response.data
    }
    return { success: true, offline: true }
  },
}
