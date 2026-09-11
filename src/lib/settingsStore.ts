export interface AppSettings {
  autoSyncOnReconnect: boolean
  downloadHistoricalRecords: boolean
  ancReminders: boolean
  postReferralSms: boolean
  defaultReceivingHospital: string
  offlinePin: string
}

const defaultSettings: AppSettings = {
  autoSyncOnReconnect: true,
  downloadHistoricalRecords: false,
  ancReminders: true,
  postReferralSms: true,
  defaultReceivingHospital: "bmc",
  offlinePin: "",
}

const SETTINGS_KEY = "bms_app_settings"

export const settingsStore = {
  getSettings: (): AppSettings => {
    if (typeof window === "undefined") return defaultSettings
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.warn("Failed to parse app settings from localStorage", e)
    }
    return defaultSettings
  },

  updateSettings: (newSettings: Partial<AppSettings>) => {
    if (typeof window === "undefined") return
    const current = settingsStore.getSettings()
    const updated = { ...current, ...newSettings }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
    // Dispatch an event so hooks can listen to changes
    window.dispatchEvent(new Event("bms_settings_changed"))
  },
}
