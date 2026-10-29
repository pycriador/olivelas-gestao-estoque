import React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, MoreHorizontal } from 'lucide-react'

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
  triggerIcon?: React.ReactNode
  showChevron?: boolean
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
  triggerIcon,
  showChevron = false,
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
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight
    const margin = 12

    const measuredRect = menuRef.current?.getBoundingClientRect()
    const maxAllowedWidth = Math.max(200, viewportWidth - margin * 2)
    const maxAllowedHeight = Math.max(160, viewportHeight - margin * 2)

    const menuWidth = measuredRect
      ? Math.min(measuredRect.width, maxAllowedWidth)
      : Math.min(280, maxAllowedWidth)
    const menuHeight = measuredRect
      ? Math.min(measuredRect.height, maxAllowedHeight)
      : Math.min(items.length * 38 + 16, maxAllowedHeight)

    let left = align === 'right' ? rect.right - menuWidth : rect.left

    // Keep menu strictly inside horizontal viewport bounds
    if (left + menuWidth > viewportWidth - margin) {
      left = viewportWidth - menuWidth - margin
    }
    if (left < margin) {
      left = margin
    }

    // Keep menu strictly inside vertical viewport bounds (flip above trigger if needed)
    let top = rect.bottom + 6
    if (top + menuHeight > viewportHeight - margin) {
      const spaceAbove = rect.top - margin
      const spaceBelow = viewportHeight - rect.bottom - margin
      if (spaceAbove >= menuHeight || spaceAbove > spaceBelow) {
        top = Math.max(margin, rect.top - menuHeight - 6)
      } else {
        top = Math.max(margin, viewportHeight - menuHeight - margin)
      }
    }

    setMenuPosition((prev) => {
      if (prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5) {
        return prev
      }
      return { top, left }
    })
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

  // Re-measure actual rendered menu dimensions synchronously before browser paint
  React.useLayoutEffect(() => {
    if (!isOpen) return
    updatePosition()

    if (typeof ResizeObserver !== 'undefined' && menuRef.current) {
      const observer = new ResizeObserver(() => {
        updatePosition()
      })
      observer.observe(menuRef.current)
      return () => observer.disconnect()
    }
  }, [isOpen, items, updatePosition])

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

    const handleResize = () => {
      updatePosition()
    }

    const handleScroll = (event: Event) => {
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) {
        return
      }
      updatePosition()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
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
    <div className={`inline-block shrink-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={triggerLabel || 'Mais ações'}
        title={triggerLabel}
        className={`inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer select-none ${
          triggerLabel
            ? 'border border-border bg-background/80 text-foreground hover:bg-muted shadow-xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        } ${buttonClassName}`}
      >
        {triggerLabel ? (
          <>
            {triggerIcon && <span className="shrink-0 flex items-center">{triggerIcon}</span>}
            <span className="text-xs font-semibold whitespace-nowrap">{triggerLabel}</span>
            {showChevron ? (
              <ChevronDown className="h-3.5 w-3.5 opacity-70 shrink-0" />
            ) : (
              <MoreHorizontal className="h-3.5 w-3.5 opacity-70 shrink-0" />
            )}
          </>
        ) : (
          <MoreHorizontal className="h-4 w-4 shrink-0" />
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
              minWidth: '13rem',
              width: 'max-content',
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: 'calc(100vh - 24px)',
            }}
            className="rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-y-auto overflow-x-hidden custom-scrollbar p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => handleSelect(e, item)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.variant === 'danger'
                    ? 'text-danger hover:bg-danger/10 hover:text-danger font-semibold'
                    : 'text-foreground hover:bg-muted/80'
                }`}
              >
                {item.icon && <span className="shrink-0 flex items-center justify-center">{item.icon}</span>}
                <span className="whitespace-normal sm:whitespace-nowrap break-words leading-snug text-left">
                  {item.label}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
