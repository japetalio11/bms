import { appointmentRepository } from "@/lib/repositories/appointmentRepository"

export const appointmentApi = {
  async getAllFacilityAppointment(facilityId?: string) {
    return await appointmentRepository.getAllFacilityAppointments(facilityId)
  },

  async getAppointmentById(appointmentId: string) {
    const list = await appointmentRepository.getAllFacilityAppointments()
    return list.find((a) => a.id === appointmentId) || null
  },

  async updateAppointmentById(appointmentId: string, payload: any) {
    return await appointmentRepository.cancelAppointment(appointmentId, payload)
  },

  async createAppointment(payload: any) {
    return await appointmentRepository.createAppointment(payload)
  },

  async deleteAppointment(appointmentId: string) {
    return await appointmentRepository.deleteAppointment(appointmentId)
  },

  async cancelAppointment(appointmentId: string, payload?: any) {
    return await appointmentRepository.cancelAppointment(appointmentId, payload)
  },
}
