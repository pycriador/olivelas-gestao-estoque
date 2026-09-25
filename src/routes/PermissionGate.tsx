import React from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface PermissionGateProps {
  permission?: string
  requireAdmin?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({
  permission,
  requireAdmin = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, canManageStore } = usePermissions()

  if (requireAdmin && !canManageStore) {
    return <>{fallback}</>
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
