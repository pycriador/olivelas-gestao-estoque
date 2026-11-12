import * as React from 'react'
import { ShieldAlert, KeyRound, Clock, RefreshCw, Lock } from 'lucide-react'
import type { PortalCredentialStatus } from '../types/portal.types'
import { portalConfig } from '../config/portal.config'

interface CredentialErrorScreenProps {
  status: PortalCredentialStatus
  onRetry: () => void
}

export function CredentialErrorScreen({ status, onRetry }: CredentialErrorScreenProps) {
  const isExpired = status.code === 'EXPIRED'
  const isRevoked = status.code === 'REVOKED'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          {isExpired ? (
            <Clock className="h-8 w-8" />
          ) : isRevoked ? (
            <Lock className="h-8 w-8" />
          ) : (
            <ShieldAlert className="h-8 w-8" />
          )}
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30">
            <KeyRound className="h-3 w-3" />
            Proteção de Credencial HBAC • {status.code}
          </span>
          <h1 className="text-xl font-bold text-white">
            {isExpired
              ? 'Credencial do Portal Expirada'
              : isRevoked
              ? 'Credencial do Portal Revogada'
              : 'Acesso ao Portal Indisponível'}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">{status.message}</p>
        </div>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3.5 text-left space-y-1.5 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-500">Store ID Vinculado:</span>
            <code className="text-slate-300 font-mono">
              {portalConfig.storeId ? `${portalConfig.storeId.slice(0, 8)}...` : 'Não definido'}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-500">Token HBAC:</span>
            <code className="text-slate-300 font-mono">
              {portalConfig.hbacToken ? `${portalConfig.hbacToken.slice(0, 14)}...` : 'Ausente'}
            </code>
          </div>
        </div>

        <div className="pt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 px-4 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Verificar Credencial Novamente
          </button>
          <p className="text-[11px] text-slate-500">
            Administrador: gerencie ou renove o token exclusivo desta loja em{' '}
            <code className="text-slate-300">/global-admin?tab=api-hbac</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
