import { motherRepository } from "@/lib/repositories/motherRepository"
import { appointmentRepository } from "@/lib/repositories/appointmentRepository"
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

  async getAppointmentsByUser(userId: string) {
    const appointments = await appointmentRepository.getAllFacilityAppointments()
    const filtered = appointments.filter(
      (a) => a.user_id === userId || a.mother_id === userId || a.id === userId
    )
    return { result: filtered, data: filtered }
  },

  async registerAppointment(payload: any) {
    return await appointmentRepository.createAppointment(payload)
  },

  async getLabRecords(motherId: string) {
    const labs = await motherRepository.getLabRecords(motherId)
    return { result: labs, data: labs }
  },

  async uploadLabFile(file: File) {
    const { url } = await motherRepository.uploadFile(file)
    return { url, fileUrl: url, file_url: url }
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

  async assignFacility(motherCode: string) {
    return await motherRepository.assignFacility(motherCode)
  },
}
