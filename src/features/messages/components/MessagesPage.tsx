import * as React from "react"
import { InboxSidebar } from "./InboxSidebar"
import { ChatArea } from "./ChatArea"
import { ChatDetailsSidepeek } from "./ChatDetailsSidepeek"
import { useEffect, useState } from "react"
import { db } from "@/lib/db/bmsDatabase"

export function MessagesPage() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  // Sync messages from backend when online
  useEffect(() => {
    const syncMessages = async () => {
      if (navigator.onLine) {
        try {
          const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"
          const token = localStorage.getItem("token")
          const currentUser = await db.userSession.get("current_user")
          
          if (!token || !currentUser) return

          const response = await fetch(`${baseUrl}/api/v1/message/getAll`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const result = await response.json()
            const messages = result.data || []
            
            // Format to match LocalMessage and bulkPut
            const formattedMessages = messages.map((msg: any) => {
              const otherUser = msg.sender_id === currentUser.user_id ? msg.receiver : msg.sender
              return {
                id: msg.message_id,
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                message_type: msg.message_type,
                message_content: msg.message_content,
                message_date: new Date(msg.message_date).toISOString(),
                is_read: msg.is_read,
                contact_name: otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : undefined,
                sync_status: "synced",
                updated_at: Date.now()
              }
            })

            if (formattedMessages.length > 0) {
              await db.messages.bulkPut(formattedMessages)
            }
          }
        } catch (error) {
          console.error("Failed to sync messages:", error)
        }
      }
    }
    syncMessages()
  }, [])

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
