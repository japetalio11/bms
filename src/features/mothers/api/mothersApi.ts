import { apiClient } from "@/lib/apiClient"

export const mothersApi = {

  async getActiveMothers(facilityId?: string) {

    try {
      let endpoint = "/api/v1/mother/active"

      if (facilityId) {
        endpoint = `/api/v1/mother/active/${facilityId}`
      }
      const response = await apiClient.get(endpoint)
      const data = response.data
      
      if (Array.isArray(data?.result) && data.result.length > 0) {
        return data.result
      }
    } catch (err) {
    }

    const fallbackRes = await apiClient.get("/api/v1/mother/all")
    return fallbackRes.data?.result || []
  },

  async getMotherProfile(targetId: string) {
    try {
      const response = await apiClient.get(`/api/v1/mother/search/${targetId}`)
      if (response.data?.result) {
        return response.data.result
      }
    } catch (err) {
    }

    const fallbackRes = await apiClient.get(`/api/v1/mother/get/${targetId}`)
    return fallbackRes.data?.result || null
  },

  async registerMother(payload: any) {
    const response = await apiClient.post("/api/v1/mother/register", payload)
    return response.data
  },

  async updateMother(motherId: string, payload: any) {
    const response = await apiClient.put(`/api/v1/mother/update/${motherId}`, payload)
    return response.data
  },

  async uploadAvatar(file: File, motherId?: string) {
    const formData = new FormData()
    formData.append("file", file)

    const uploadRes = await apiClient.post("/api/v1/lab-screening/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    const photoUrl = uploadRes.data?.url || uploadRes.data?.fileUrl
    if (!photoUrl) {
      throw new Error("Failed to get image URL from server")
    }

    if (motherId) {
      await apiClient.put(`/api/v1/mother/update/${motherId}`, {
        photo_url: photoUrl,
      })
    }

    return photoUrl
  },

  async getPregnancies(motherId: string) {
    const response = await apiClient.get(`/api/v1/pregnancy/mother/${motherId}`)
    return response.data
  },

  async registerPregnancy(payload: any) {
    const response = await apiClient.post("/api/v1/pregnancy/register", payload)
    return response.data
  },

  async getPrenatalVisits(motherId: string) {
    const response = await apiClient.get(`/api/v1/prenatal-visit/mother/${motherId}`)
    return response.data
  },

  async registerPrenatalVisit(payload: any) {
    const response = await apiClient.post("/api/v1/prenatal-visit/register", payload)
    return response.data
  },

  async getAppointmentsByUser(userId: string) {
    const response = await apiClient.get(`/api/v1/appointment/get/user/${userId}`)
    return response.data
  },

  async registerAppointment(payload: any) {
    const response = await apiClient.post("/api/v1/appointment/register", payload)
    return response.data
  },

  async getLabRecords(motherId: string) {
    const response = await apiClient.get(`/api/v1/lab-screening/get/mother/${motherId}`)
    return response.data
  },

  async uploadLabFile(file: File) {
    const formData = new FormData()
    formData.append("file", file)
    const res = await apiClient.post("/api/v1/lab-screening/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data
  },

  async registerLabRecord(payload: any) {
    const response = await apiClient.post("/api/v1/lab-screening/register", payload)
    return response.data
  },

  async getSupplements(motherId: string) {
    const response = await apiClient.get(`/api/v1/supplement/get/mother/${motherId}`)
    return response.data
  },

  async registerSupplement(payload: any) {
    const response = await apiClient.post("/api/v1/supplement/register", payload)
    return response.data
  },

  async updateRecord(url: string, payload: any) {
    const response = await apiClient.put(url, payload)
    return response.data
  },

  async deleteRecord(url: string) {
    const response = await apiClient.delete(url)
    return response.data
  },
}
