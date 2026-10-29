import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { userService } from '@/services/userService'
import {
  DEFAULT_PIN_REQUIREMENTS,
  evaluatePinRequirements,
  generateCompliantPin,
  normalizePinRequirements,
} from '@/utils/pinValidator'
import { cn } from '@/utils/cn'
import type { EmployeePinRequirements, StoreMember } from '@/types/user.types'

export const EmployeePinResetModal: React.FC = () => {
  const { user } = useAuth()
  const { storeId, storeName } = useTenant()

  const [pendingMember, setPendingMember] = useState<StoreMember | null>(null)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    const checkPinResetRequirement = async () => {
      if (!user?.id || !storeId || storeId === 'all') {
        if (active) setPendingMember(null)
        return
      }

      try {
        const members = await userService.listStoreMembers(storeId)
        if (!active) return
        const found = members.find(
          (m) =>
            (m.userId === user.id ||
              m.email.toLowerCase() === (user.email || '').toLowerCase()) &&
            Boolean(m.requirePinReset)
        )
        setPendingMember(found || null)
      } catch {
        // Ignore transient lookup error
      }
    }

    checkPinResetRequirement()

    const handlePermissionsUpdated = () => {
      checkPinResetRequirement()
    }
    window.addEventListener(
      'olivelas:employee-permissions-updated',
      handlePermissionsUpdated
    )
    return () => {
      active = false
      window.removeEventListener(
        'olivelas:employee-permissions-updated',
        handlePermissionsUpdated
      )
    }
  }, [user?.id, user?.email, storeId])

  const requirements: EmployeePinRequirements = useMemo(
    () =>
      normalizePinRequirements(
        pendingMember?.pinRequirements || DEFAULT_PIN_REQUIREMENTS
      ),
    [pendingMember?.pinRequirements]
  )

  const evaluation = useMemo(
    () => evaluatePinRequirements(newPin, requirements),
    [newPin, requirements]
  )

  const pinsMatch = newPin.length > 0 && newPin === confirmPin

  if (!pendingMember) return null

  const handleGenerateSuggestion = () => {
    const generated = generateCompliantPin(requirements)
    setNewPin(generated)
    setConfirmPin(generated)
    setShowPin(true)
    toast.info(`Sugestão de PIN gerada: ${generated}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evaluation.isValid) {
      toast.error('O novo PIN ainda não atende a todos os pré-requisitos.')
      return
    }
    if (!pinsMatch) {
      toast.error('A confirmação do PIN não confere.')
      return
    }

    setSubmitting(true)
    try {
      await userService.completeEmployeePinReset(
        storeId,
        pendingMember.userId,
        newPin.trim(),
        requirements
      )
      toast.success('PIN redefinido com sucesso!')
      setPendingMember(null)
      setNewPin('')
      setConfirmPin('')
      window.dispatchEvent(
        new CustomEvent('olivelas:employee-permissions-updated')
      )
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao redefinir o PIN.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={Boolean(pendingMember)}
      onClose={() => {
        toast.warning(
          'A redefinição do PIN é obrigatória antes de continuar operando nesta loja.'
        )
      }}
      title="Redefinição Obrigatória de PIN no Login"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <KeyRound className="h-4 w-4 text-amber-500" />
              Ação Obrigatória de Segurança ({storeName})
            </span>
            <Badge variant="warning">Reset no Login</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            O administrador da loja solicitou que você cadastre um novo{' '}
            <b>PIN de segurança</b> seguindo os pré-requisitos abaixo.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground">
              Novo PIN ({requirements.minLength} a {requirements.maxLength}{' '}
              caracteres)
            </label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleGenerateSuggestion}
              className="h-6 px-2 text-[11px] text-primary"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Sugerir PIN Forte
            </Button>
          </div>

          <div className="relative">
            <Input
              type={showPin ? 'text' : 'password'}
              maxLength={requirements.maxLength}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Digite seu novo PIN"
              className="pr-10 font-mono text-sm tracking-wider"
              required
            />
            <button
              type="button"
              onClick={() => setShowPin((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPin ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Confirmar Novo PIN
            </label>
            <Input
              type={showPin ? 'text' : 'password'}
              maxLength={requirements.maxLength}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Repita o novo PIN"
              className="font-mono text-sm tracking-wider"
              required
            />
          </div>
        </div>

        {/* Checklist dos Pré-requisitos */}
        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-foreground">
              Pré-requisitos do PIN:
            </span>
            <span
              className={cn(
                'font-bold',
                evaluation.isValid
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {evaluation.isValid
                ? `Atende a todos (${evaluation.strengthLabel})`
                : 'Pendente'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {evaluation.checks.map((chk) => (
              <div
                key={chk.key}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]',
                  chk.passed
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'border-border bg-background text-muted-foreground'
                )}
              >
                {chk.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                )}
                <span>{chk.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="submit"
            variant="default"
            disabled={!evaluation.isValid || !pinsMatch}
            isLoading={submitting}
            className="w-full"
          >
            <Lock className="mr-1.5 h-4 w-4" />
            Salvar Novo PIN e Continuar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
