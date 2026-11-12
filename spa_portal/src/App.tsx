import * as React from 'react'
import { supabasePortalApi, classifyPortalApiError } from './api/supabasePortalClient'
import { portalConfig } from './config/portal.config'
import type { PortalCredentialStatus, PortalStore } from './types/portal.types'
import { CredentialErrorScreen } from './components/CredentialErrorScreen'
import { CatalogView } from './components/CatalogView'
import { OrderTrackingView } from './components/OrderTrackingView'

function extractOrderIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null

  // 1. Suporte a Hash (#/order/<uuid>)
  const hash = window.location.hash || ''
  const hashMatch = hash.match(/\/order\/([0-9a-fA-F-]{36})/)
  if (hashMatch?.[1]) return hashMatch[1]

  // 2. Suporte a Query String (?order=<uuid> ou ?orderId=<uuid>)
  const params = new URLSearchParams(window.location.search)
  return params.get('order') || params.get('orderId')
}

export function App() {
  const [credentialStatus, setCredentialStatus] = React.useState<PortalCredentialStatus | null>(
    null
  )
  const [store, setStore] = React.useState<PortalStore | null>(null)
  const [bootstrapping, setBootstrapping] = React.useState(true)
  const [activeOrderId, setActiveOrderId] = React.useState<string | null>(() =>
    extractOrderIdFromLocation()
  )
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    const root = document.documentElement
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [isDark])

  React.useEffect(() => {
    const onHashChange = () => {
      setActiveOrderId(extractOrderIdFromLocation())
    }
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate', onHashChange)
    }
  }, [])

  const bootstrapPortal = React.useCallback(async () => {
    setBootstrapping(true)
    try {
      const cred = await supabasePortalApi.validatePortalCredential()
      if (!cred.valid) {
        setCredentialStatus(cred)
        setBootstrapping(false)
        return
      }

      const storeProfile = await supabasePortalApi.fetchStoreProfile()
      setStore(storeProfile)
      setCredentialStatus(cred)

      if (storeProfile.name) {
        document.title = portalConfig.branding.customTitle || `${storeProfile.name} • Catálogo Online`
      }
    } catch (err: any) {
      const classified = classifyPortalApiError(err)
      setCredentialStatus(
        classified || {
          valid: false,
          code: 'NETWORK_ERROR',
          message: err?.message || 'Não foi possível carregar os dados da loja.',
        }
      )
    } finally {
      setBootstrapping(false)
    }
  }, [])

  React.useEffect(() => {
    bootstrapPortal()
  }, [bootstrapPortal])

  const handleOpenOrderTracking = (orderId: string) => {
    window.location.hash = `/order/${orderId}`
    setActiveOrderId(orderId)
  }

  const handleBackToCatalog = () => {
    window.location.hash = '/'
    setActiveOrderId(null)
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 space-y-3">
        <div className="h-10 w-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-slate-500">
          Validando credencial exclusiva da loja e carregando vitrine...
        </p>
      </div>
    )
  }

  if (!credentialStatus?.valid || !store) {
    return (
      <CredentialErrorScreen
        status={
          credentialStatus || {
            valid: false,
            code: 'INVALID_TOKEN',
            message: 'Credencial inválida ou loja indisponível.',
          }
        }
        onRetry={bootstrapPortal}
      />
    )
  }

  if (activeOrderId) {
    return (
      <OrderTrackingView
        orderId={activeOrderId}
        onBackToCatalog={handleBackToCatalog}
      />
    )
  }

  return (
    <CatalogView
      store={store}
      isDark={isDark}
      onToggleDark={() => setIsDark((d) => !d)}
      onOpenOrderTracking={handleOpenOrderTracking}
      onCredentialInvalidated={(status) => setCredentialStatus(status)}
    />
  )
}
