import React, { useEffect, useState, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { AuthContext } from "@/features/auth/context/AuthContext"
import { messageRepository } from "@/lib/repositories/messageRepository"
import { db, type LocalMessage } from "@/lib/db/bmsDatabase"
import { SocketContext } from "@/context/socketContextDefinition"
import { toast } from "sonner"

interface SocketNotificationPayload {
  notification_message?: string
  sender?: string
  [key: string]: unknown
}

interface SocketMessagePayload {
  message_id?: string
  _id?: string
  id?: string
  sender_id?: string
  receiver_id?: string
  message_content?: string
  message_type?: string
  message_date?: string
  is_read?: boolean
  [key: string]: unknown
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = React.useContext(AuthContext) || {}
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token || token === "offline-session-token") {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const backendUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    const newSocket = io(backendUrl, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socketRef.current = newSocket

    newSocket.on("connect", () => {
      setSocket(newSocket)
      setIsConnected(true)
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
    })

    newSocket.on("connect_error", (error) => {
      console.warn("[Socket.IO] Connection error:", error.message)
    })

    newSocket.on("notification:new", (notification: SocketNotificationPayload) => {
      const message = notification.notification_message || "You have a new notification"
      toast.info(message, {
        description: notification.sender || "System Alert",
        duration: 5000,
      })

      window.dispatchEvent(new CustomEvent("bms:notification:new", { detail: notification }))
    })

    newSocket.on("notification:read_all", (data: unknown) => {
      window.dispatchEvent(new CustomEvent("bms:notification:read_all", { detail: data }))
    })

    newSocket.on("message:new", async (message: SocketMessagePayload) => {
      try {
        if (message && message.sender_id && message.receiver_id) {
          const msgId = message.message_id || message._id || message.id || `msg-${Date.now()}`
          const localMsg: LocalMessage = {
            id: msgId,
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            message_content: message.message_content || "",
            message_type: message.message_type || "text",
            message_date: message.message_date || new Date().toISOString(),
            is_read: Boolean(message.is_read),
            sync_status: "synced",
            updated_at: Date.now(),
          }
          await db.messages.put(localMsg)
        }
        await messageRepository.getAllMessages()
      } catch (err) {
        console.warn("[Socket.IO] Error refreshing messages on message:new:", err)
      }
      window.dispatchEvent(new CustomEvent("bms:message:new", { detail: message }))
    })

    return () => {
      newSocket.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
    }
  }, [isAuthenticated, token])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
