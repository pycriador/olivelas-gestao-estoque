import React from 'react'
import { Link } from 'react-router-dom'
import { Lock, Sparkles, ArrowLeft, CreditCard, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { DEFAULT_PERMISSION_MODULES } from '@/constants/screenDependencies'
import { formatCurrency } from '@/utils/currency'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ModuleCode } from '@/types/permissionGroup.types'

interface PermissionGateProps {
  moduleCode?: ModuleCode
  permission?: string
  requireAdmin?: boolean
  fallback?: React.ReactNode
  showUpgradeScreen?: boolean
  children: React.ReactNode
}

export function PermissionGate({
  moduleCode,
  permission,
  requireAdmin = false,
  fallback = null,
  showUpgradeScreen = false,
  children,
}: PermissionGateProps) {
  const {
    hasPermission,
    hasModule,
    canManageStore,
    permissionProfile,
    isSubscriptionSuspended,
  } = usePermissions()

  const isAllowedByAdmin = !requireAdmin || canManageStore
  const isAllowedByModule = !moduleCode || hasModule(moduleCode)
  const isAllowedByPermission = !permission || hasPermission(permission)

  if (isAllowedByAdmin && isAllowedByModule && isAllowedByPermission && !isSubscriptionSuspended) {
    return <>{children}</>
  }

  if (!showUpgradeScreen) {
    return <>{fallback}</>
  }

  const targetModule = moduleCode
    ? DEFAULT_PERMISSION_MODULES.find((m) => m.code === moduleCode)
    : undefined

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-inner">
          {isSubscriptionSuspended ? (
            <ShieldAlert className="h-7 w-7 text-danger" />
          ) : (
            <Lock className="h-7 w-7" />
          )}
        </div>

        <div className="space-y-2">
          <Badge variant={isSubscriptionSuspended ? 'destructive' : 'outline'} className="text-[11px] px-2.5 py-0.5">
            {isSubscriptionSuspended
              ? 'Assinatura Suspensa / Pendente de Regularização'
              : 'Módulo Comercial Não Habilitado no Seu Perfil'}
          </Badge>

          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {isSubscriptionSuspended
              ? 'Acesso Temporariamente Bloqueado por Pendência Financeira'
              : targetModule
                ? targetModule.name
                : 'Funcionalidade Restrita no Plano Atual'}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {isSubscriptionSuspended
              ? 'Identificamos uma pendência financeira na assinatura do seu perfil. Entre em contato com a administração da plataforma para regularizar seu acesso imediato.'
              : targetModule
                ? targetModule.description
                : 'Esta tela não faz parte do pacote de funcionalidades ativo para o seu usuário.'}
          </p>
        </div>

        {targetModule && !isSubscriptionSuspended && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-left space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Valor Comercial do Módulo Adicional
              </span>
              <span className="text-sm font-extrabold text-primary">
                + {formatCurrency(targetModule.monthlyPrice)} / mês
              </span>
            </div>

            {permissionProfile?.customPlanName && (
              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t border-border/60">
                <span>Seu Plano Atual:</span>
                <span className="font-semibold text-foreground">
                  {permissionProfile.customPlanName}
                </span>
              </div>
            )}

            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>
                Liberação imediata pelo Global Admin em{' '}
                <code className="font-mono text-[10px]">/global-admin?tab=users</code>
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto h-9 text-xs font-semibold gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao Dashboard
            </Button>
          </Link>

          <Link to="/pricing" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto h-9 text-xs font-semibold gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Consultar Planos & Módulos
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
