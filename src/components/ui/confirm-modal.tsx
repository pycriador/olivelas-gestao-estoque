import * as React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, Info, Power } from 'lucide-react'

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'primary'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="p-2.5 rounded-full bg-danger/10 text-danger shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
        )
      case 'warning':
        return (
          <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-500 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        )
      case 'info':
        return (
          <div className="p-2.5 rounded-full bg-primary/10 text-primary shrink-0">
            <Info className="h-5 w-5" />
          </div>
        )
      default:
        return (
          <div className="p-2.5 rounded-full bg-primary/10 text-primary shrink-0">
            <Power className="h-5 w-5" />
          </div>
        )
    }
  }

  const getConfirmButtonVariant = (): 'destructive' | 'default' => {
    switch (variant) {
      case 'danger':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      showCloseButton={!isLoading}
    >
      <div className="flex items-start gap-4 pt-1">
        {getIcon()}
        <div className="space-y-1.5 flex-1">
          <h3 className="text-sm font-bold text-foreground leading-none">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-5 mt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="w-full sm:w-auto h-8 text-xs px-3"
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={getConfirmButtonVariant()}
          onClick={onConfirm}
          isLoading={isLoading}
          className="w-full sm:w-auto h-8 text-xs px-3 font-semibold"
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
