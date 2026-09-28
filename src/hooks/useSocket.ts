import { useContext } from "react"
import { SocketContext } from "@/context/socketContextDefinition"

export function useSocket() {
  return useContext(SocketContext)
}
