import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { customerService } from '@/services/customerService'
import { parseApiError } from '@/utils/errorHandler'
import { UserPlus, Check } from 'lucide-react'
import type { Customer } from '@/types/customer.types'

interface CustomerQuickCreateModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  onSuccess: (customer: Customer) => void
}

export function CustomerQuickCreateModal({
  isOpen,
  onClose,
  storeId,
  onSuccess,
}: CustomerQuickCreateModalProps) {
  const queryClient = useQueryClient()
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    notes: '',
  })

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        document: '',
        phone: '',
        email: '',
        notes: '',
      })
      setErrorMsg(null)
    }
  }, [isOpen])

  const createMutation = useMutation({
    mutationFn: (newCustomer: Partial<Customer>) =>
      customerService.createCustomer(storeId, newCustomer),
    onSuccess: (createdCustomer) => {
      // Invalida caches de clientes para que o combobox e listagens reflitam imediatamente
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
      queryClient.invalidateQueries({ queryKey: ['customers-recent'] })
      queryClient.invalidateQueries({ queryKey: ['customers-search', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })

      onSuccess(createdCustomer)
      onClose()
    },
    onError: (err) => {
      setErrorMsg(parseApiError(err))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setErrorMsg('Informe o nome do cliente.')
      return
    }

    createMutation.mutate({
      name: formData.name.trim(),
      document: formData.document.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      status: 'ACTIVE',
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UserPlus className="h-4 w-4" />
          </div>
          <span>Cadastrar Cliente</span>
        </div>
      }
      description="Cadastre rapidamente o cliente e vincule-o a esta venda"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
        {errorMsg && (
          <div className="p-2.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
            {errorMsg}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Nome Completo / Razão Social *
          </label>
          <Input
            placeholder="Ex: João Silva"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-9 text-xs"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">CPF ou CNPJ</label>
            <Input
              placeholder="000.000.000-00"
              value={formData.document}
              onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Telefone / WhatsApp</label>
            <Input
              placeholder="(11) 98765-4321"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="h-9 text-xs font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">E-mail</label>
          <Input
            type="email"
            placeholder="cliente@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Observações</label>
          <Input
            placeholder="Ex: Entrega na portaria, desconto de 5%..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="h-9 text-xs"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-9 text-xs"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto h-9 text-xs font-semibold shadow-xs"
            isLoading={createMutation.isPending}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" /> Salvar e Selecionar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
