import * as React from "react"
import { InboxSidebar } from "./InboxSidebar"
import { ChatArea } from "./ChatArea"
import { ChatDetailsSidepeek } from "./ChatDetailsSidepeek"
import { useEffect, useState } from "react"
import { motherRepository } from "@/lib/repositories/motherRepository"
import { messageRepository } from "@/lib/repositories/messageRepository"
import { db } from "@/lib/db/bmsDatabase"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { syncEngine } from "@/lib/sync/syncEngine"

export function MessagesPage() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const { isOnline } = useNetworkStatus()

  // Sync messages and mothers from backend when online
  const loadAndSyncData = async () => {
    try {
      const currentUser = await db.userSession.get("current_user")
      if (currentUser?.facility_id && currentUser?.role !== "Mother") {
        motherRepository.getActiveMothers(currentUser.facility_id).catch(() => {})
      }
      await messageRepository.getAllMessages()
    } catch (error) {
      console.error("[MessagesPage] Failed to sync messages:", error)
    }
  }

  useEffect(() => {
    loadAndSyncData()

    const unsubscribe = syncEngine.subscribe(() => {
      loadAndSyncData()
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (isOnline) {
      loadAndSyncData()
    }
  }, [isOnline])

  return (
    <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden bg-background">
      <div className="flex w-full h-full overflow-hidden">
        {/* Left Column */}
        <InboxSidebar activeChatId={activeChatId} setActiveChatId={setActiveChatId} />

        {/* Center Column */}
        <ChatArea activeChatId={activeChatId} />

        {/* Right Column */}
        {activeChatId && <ChatDetailsSidepeek activeChatId={activeChatId} />}
      </div>
    </div>
  )
}
