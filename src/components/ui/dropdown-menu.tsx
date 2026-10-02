import React from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'

export interface DropdownMenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  onSelect: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

export interface DropdownMenuProps {
  items: DropdownMenuItem[]
  triggerLabel?: string
  align?: 'left' | 'right'
  className?: string
  buttonClassName?: string
}

/**
 * Dropdown Menu universal com Portal React.
 * Renderiza no document.body com position: fixed para NUNCA ser cortado por
 * overflow: hidden, overflow-x: auto ou tabelas.
 */
export function DropdownMenu({
  items,
  triggerLabel,
  align = 'right',
  className = '',
  buttonClassName = '',
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number; width?: number } | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const updatePosition = React.useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 200 // default min-width in px
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    let top = rect.bottom + 4
    let left = align === 'right' ? rect.right - menuWidth : rect.left

    // Adjust horizontal boundary
    if (left + menuWidth > windowWidth - 12) {
      left = windowWidth - menuWidth - 12
    }
    if (left < 12) {
      left = 12
    }

    // Adjust vertical boundary if bottom exceeds screen
    const estimatedHeight = items.length * 36 + 12
    if (top + estimatedHeight > windowHeight - 12 && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - 4
    }

    setMenuPosition({ top, left })
  }, [align, items.length])

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!isOpen) {
      updatePosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  React.useEffect(() => {
    if (!isOpen) return

    updatePosition()

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    const handleScrollOrResize = () => {
      setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen, updatePosition])

  const handleSelect = (e: React.MouseEvent, item: DropdownMenuItem) => {
    e.stopPropagation()
    e.preventDefault()
    setIsOpen(false)
    if (!item.disabled) {
      item.onSelect()
    }
  }

  return (
    <div className={`inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={triggerLabel || 'Mais ações'}
        title={triggerLabel}
        className={`inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer select-none ${buttonClassName}`}
      >
        {triggerLabel ? (
          <span className="text-xs font-semibold">{triggerLabel}</span>
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </button>

      {isOpen &&
        menuPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 999999,
              minWidth: '12.5rem',
            }}
            className="rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => handleSelect(e, item)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.variant === 'danger'
                    ? 'text-danger hover:bg-danger/10 hover:text-danger font-semibold'
                    : 'text-foreground hover:bg-muted/80'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
