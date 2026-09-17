import { useState, useEffect } from "react"
import { settingsStore, type AppSettings } from "@/lib/settingsStore"

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(settingsStore.getSettings())

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings(settingsStore.getSettings())
    }

    window.addEventListener("bms_settings_changed", handleSettingsChange)
    return () => {
      window.removeEventListener("bms_settings_changed", handleSettingsChange)
    }
  }, [])

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    settingsStore.updateSettings(newSettings)
  }

  return { settings, updateSettings }
}
