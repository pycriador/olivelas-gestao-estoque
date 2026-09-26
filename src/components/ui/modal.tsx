import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
  showCloseButton?: boolean
  preventBackdropClose?: boolean
  asDrawerOnMobile?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  maxWidth = 'lg',
  showCloseButton = true,
  preventBackdropClose = false,
  asDrawerOnMobile = true,
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      // Prevent background scrolling while modal is open
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWMap = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    full: 'sm:max-w-[95vw] lg:max-w-6xl',
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        'fixed inset-0 z-50 flex',
        asDrawerOnMobile
          ? 'items-end sm:items-center justify-center sm:p-4 lg:p-6'
          : 'items-center justify-center p-4 sm:p-6',
        'animate-in fade-in duration-200'
      )}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!preventBackdropClose) onClose()
        }}
        aria-hidden="true"
      />

      {/* Modal Card / Responsive Sheet */}
      <div
        className={cn(
          'relative w-full z-10 flex flex-col bg-surface border-t sm:border border-border shadow-2xl overflow-hidden',
          // Mobile: bottom drawer styling
          asDrawerOnMobile
            ? 'rounded-t-[1.75rem] sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200'
            : 'rounded-2xl max-h-[90vh] animate-in zoom-in-95 duration-200',
          // Desktop responsive widths
          maxWMap[maxWidth],
          className
        )}
      >
        {/* Mobile Drag Indicator Handle */}
        {asDrawerOnMobile && (
          <div className="pt-3 pb-1 sm:hidden flex justify-center items-center">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full cursor-grab active:cursor-grabbing hover:bg-muted-foreground/50 transition-colors" />
          </div>
        )}

        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start sm:items-center justify-between px-5 sm:px-6 py-4 border-b border-border/80 bg-surface/90 backdrop-blur-xs sticky top-0 z-20">
            <div className="flex-1 pr-3">
              {title && (
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all touch-manipulation -mr-1"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 overscroll-contain focus:outline-none custom-scrollbar">
          {children}
        </div>

        {/* Optional Dedicated Sticky Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-border/80 bg-surface-elevated/80 backdrop-blur-xs sticky bottom-0 z-20 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
