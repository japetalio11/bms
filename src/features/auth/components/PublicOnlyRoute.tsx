import React from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { UnifiedPageLoader } from "@/components/ui/unified-page-loader"

interface PublicOnlyRouteProps {
  children?: React.ReactNode
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <UnifiedPageLoader label="Loading..." />
  }

  if (isAuthenticated) {
    const fromPath = (location.state as any)?.from?.pathname || "/dashboard"
    return <Navigate to={fromPath} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default PublicOnlyRoute
