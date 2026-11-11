import type { PosCustomerMode } from '@/types/store.types'

const LOCAL_POS_CUSTOMER_POLICY_KEY = 'olivelas_pos_customer_policy_v1'

export interface PosCustomerPolicyInput {
  genericCustomerReleasedByAdmin: boolean
  posCustomerMode: PosCustomerMode
}

export interface ResolvedPosCustomerPolicy {
  /** Se a área administrativa liberou o acesso ao Cliente Genérico para esta loja */
  genericCustomerReleasedByAdmin: boolean
  /** Escolha ativa da loja: 'REQUIRED' (cadastro obrigatório) ou 'ALLOW_GENERIC' (permite cliente genérico) */
  posCustomerMode: PosCustomerMode
  /** Resultado efetivo para o PDV (/sales): true somente se liberado na área administrativa E habilitado pela loja */
  canUseGenericCustomer: boolean
}

function readLocalPolicies(): Record<string, PosCustomerPolicyInput> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LOCAL_POS_CUSTOMER_POLICY_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, PosCustomerPolicyInput>
  } catch {
    return {}
  }
}

export function saveLocalPosCustomerPolicy(
  storeId: string,
  policy: PosCustomerPolicyInput
): void {
  if (typeof window === 'undefined' || !storeId) return
  try {
    const all = readLocalPolicies()
    all[storeId] = policy
    window.localStorage.setItem(LOCAL_POS_CUSTOMER_POLICY_KEY, JSON.stringify(all))
  } catch {
    // ignore storage errors
  }
}

export function getPosCustomerPolicy(
  themeConfig: unknown,
  storeId?: string | null
): ResolvedPosCustomerPolicy {
  const rec =
    themeConfig && typeof themeConfig === 'object' && !Array.isArray(themeConfig)
      ? (themeConfig as Record<string, unknown>)
      : {}

  const localOverride = storeId ? readLocalPolicies()[storeId] : undefined

  const hasRemoteRelease = typeof rec.genericCustomerReleasedByAdmin === 'boolean'
  const genericCustomerReleasedByAdmin = hasRemoteRelease
    ? Boolean(rec.genericCustomerReleasedByAdmin)
    : Boolean(localOverride?.genericCustomerReleasedByAdmin)

  const rawMode =
    typeof rec.posCustomerMode === 'string'
      ? rec.posCustomerMode
      : localOverride?.posCustomerMode

  const posCustomerMode: PosCustomerMode =
    rawMode === 'ALLOW_GENERIC' ? 'ALLOW_GENERIC' : 'REQUIRED'

  const canUseGenericCustomer =
    genericCustomerReleasedByAdmin && posCustomerMode === 'ALLOW_GENERIC'

  return {
    genericCustomerReleasedByAdmin,
    posCustomerMode,
    canUseGenericCustomer,
  }
}

export function isGenericCustomerRecord(
  customer: { name?: string | null } | null | undefined
): boolean {
  if (!customer?.name) return false
  const normalized = customer.name.trim().toLowerCase()
  return (
    normalized === 'cliente genérico' ||
    normalized === 'cliente generico' ||
    normalized === 'consumidor final'
  )
}
