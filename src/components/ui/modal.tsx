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
}: ModalProps) {
  const [viewportRect, setViewportRect] = React.useState<{
    height: number
    offsetTop: number
  } | null>(null)
  const bodyScrollRef = React.useRef<HTMLDivElement>(null)

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

  // Sincroniza a altura visível com window.visualViewport no mobile
  // para que o modal fique sempre na parte superior visível (acima do teclado virtual)
  React.useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return

    const vv = window.visualViewport
    if (!vv) return

    const updateVisualViewport = () => {
      setViewportRect({
        height: Math.round(vv.height),
        offsetTop: Math.round(vv.offsetTop),
      })
    }

    updateVisualViewport()
    vv.addEventListener('resize', updateVisualViewport)
    vv.addEventListener('scroll', updateVisualViewport)

    return () => {
      vv.removeEventListener('resize', updateVisualViewport)
      vv.removeEventListener('scroll', updateVisualViewport)
      setViewportRect(null)
    }
  }, [isOpen])

  // Ao focar qualquer input/textarea no mobile, garante que ele fique visível acima do teclado
  const handleFocusCapture = React.useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }, 120)
    }
  }, [])

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

  const dynamicOverlayStyle: React.CSSProperties | undefined = viewportRect
    ? {
        top: `${viewportRect.offsetTop}px`,
        height: `${viewportRect.height}px`,
        bottom: 'auto',
      }
    : undefined

  const dynamicCardMaxHeight: React.CSSProperties | undefined = viewportRect
    ? {
        maxHeight: `${Math.max(220, viewportRect.height - 16)}px`,
      }
    : undefined

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={dynamicOverlayStyle}
      className={cn(
        'fixed inset-x-0 top-0 bottom-0 z-50 flex',
        // No mobile: posicionado no topo da área visível (items-start) para nunca ficar atrás do teclado virtual
        'items-start sm:items-center justify-center pt-2 px-2.5 pb-2 sm:p-4 lg:p-6',
        'animate-in fade-in duration-150'
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

      {/* Modal Card posicionado mais para cima no mobile */}
      <div
        style={dynamicCardMaxHeight}
        onFocusCapture={handleFocusCapture}
        className={cn(
          'relative w-full z-10 flex flex-col bg-surface border border-border shadow-2xl overflow-hidden',
          'rounded-2xl max-h-[88dvh] sm:max-h-[88vh] animate-in zoom-in-95 duration-150',
          maxWMap[maxWidth],
          className
        )}
      >
        {/* Modal Header compacto no mobile */}
        {(title || showCloseButton) && (
          <div className="flex items-start sm:items-center justify-between px-4 sm:px-6 py-2.5 sm:py-4 border-b border-border/80 bg-surface/95 backdrop-blur-xs sticky top-0 z-20 shrink-0">
            <div className="flex-1 pr-2 min-w-0">
              {title && (
                <h2 className="text-sm sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-xl p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all touch-manipulation -mr-1 shrink-0"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div
          ref={bodyScrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 overscroll-contain focus:outline-none custom-scrollbar"
        >
          {children}
        </div>

        {/* Optional Dedicated Sticky Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-2.5 sm:py-3.5 border-t border-border/80 bg-surface-elevated/90 backdrop-blur-xs sticky bottom-0 z-20 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
