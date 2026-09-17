import * as React from "react"
import { clsx } from "clsx"
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
      let currentUser = await db.userSession.get("current_user")
      if (!currentUser && typeof window !== "undefined") {
        const stored = localStorage.getItem("user")
        if (stored) {
          try {
            currentUser = JSON.parse(stored)
          } catch {}
        }
      }

      const facilityId = currentUser?.facility_id || currentUser?.facility?.facility_id
      if (currentUser?.role !== "Mother") {
        await motherRepository.getActiveMothers(facilityId || undefined).catch((err) => {
          console.warn("[MessagesPage] Failed to fetch active mothers:", err)
        })
      }
      await messageRepository.getAllMessages().catch((err) => {
        console.warn("[MessagesPage] Failed to fetch all messages:", err)
      })
    } catch (error) {
      console.error("[MessagesPage] Failed to sync messages:", error)
    }
  }

  useEffect(() => {
    loadAndSyncData()

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = syncEngine.subscribe(() => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        loadAndSyncData()
      }, 600)
    })

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      unsubscribe()
    }
  }, [])

  return (
    <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden bg-background">
      <div className="flex w-full h-full overflow-hidden">
        {/* Left Column (Inbox list: visible on desktop, or on mobile when no active chat is open) */}
        <div className={clsx("h-full", activeChatId ? "hidden lg:flex" : "flex w-full lg:w-auto")}>
          <InboxSidebar activeChatId={activeChatId} setActiveChatId={setActiveChatId} />
        </div>

        {/* Center Column (Chat area: visible on desktop, or on mobile when a chat is open) */}
        <div className={clsx("h-full flex-1", activeChatId ? "flex" : "hidden lg:flex")}>
          <ChatArea activeChatId={activeChatId} onBack={() => setActiveChatId(null)} />
        </div>

        {/* Right Column (Details: visible only on desktop when a chat is selected) */}
        {activeChatId && <ChatDetailsSidepeek activeChatId={activeChatId} />}
      </div>
    </div>
  )
}
