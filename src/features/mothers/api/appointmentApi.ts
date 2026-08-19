import { apiClient } from "@/lib/apiClient"

export const appointmentApi = {

  async getAllFacilityAppointment(facilityId?: string) {

    try {

      let endpoint = "/api/v1/appointment/getAll"

      if (facilityId) {
        endpoint = `/api/v1/appointment/get/facility/${facilityId}`
      }

      const response = await apiClient.get(endpoint)
      const data = response.data

      if (Array.isArray(data?.data)) {
        return data.data
      }

    } catch (error) {
      console.error("Failed to fetch facility appointments:", error)
      return []
    }
  },

  async getAppointmentById(appointmentId: string) {

    try {

      if (!appointmentId) return null

      const response = await apiClient.get(`/api/v1/appointment/get/${appointmentId}`)
      
      return response.data?.data || null
      
    } catch (error) {
      console.error("Failed to fetch appointment details:", error)
      return null
    }
  },

  async updateAppointmentById(appointmentId: string, payload: any) {

    try {

      if (!appointmentId) throw new Error("Missing appointment ID")
        
      const response = await apiClient.put(`/api/v1/appointment/update/${appointmentId}`, payload)
      
      return response.data?.data || response.data

    } catch (error) {
      console.error("Failed to update appointment:", error)
      throw error
    }
  },

  async createAppointment(payload: any) {

    try {

      const response = await apiClient.post("/api/v1/appointment/register", payload)
      
      return response.data?.data || response.data

    } catch (error) {
      console.error("Failed to create appointment:", error)
      throw error
    }
  },

  async deleteAppointment(appointmentId: string) {

    try {

      if (!appointmentId) throw new Error("Missing appointment ID")

      const response = await apiClient.delete(`/api/v1/appointment/delete/${appointmentId}`)
      
      return response.data

    } catch (error) {
      console.error("Failed to delete appointment:", error)
      throw error
    }
  },

  async cancelAppointment(appointmentId: string, payload?: any) {

    try {

      if (!appointmentId) throw new Error("Missing appointment ID")
      
        const response = await apiClient.put(`/api/v1/appointment/cancel/${appointmentId}`, payload || {})
      
        return response.data?.data || response.data
        
    } catch (error) {
      console.error("Failed to cancel appointment:", error)
      throw error
    }
  },
}
