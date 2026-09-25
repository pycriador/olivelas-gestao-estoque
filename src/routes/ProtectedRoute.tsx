import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactElement
  requireGlobalAdmin?: boolean
}

export function ProtectedRoute({ children, requireGlobalAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isGlobalAdmin } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-xs text-muted-foreground animate-pulse">Carregando permissões e sessão...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireGlobalAdmin && !isGlobalAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
