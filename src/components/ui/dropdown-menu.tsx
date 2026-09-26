import React from 'react'
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
 * Menu dropdown em sanfona. O projeto nao tem Radix/CMDK, entao segue o
 * mesmo padrao hand-rolled do store switcher em AppLayout.tsx: estado
 * booleano + painel absoluto, com fechamento por clique fora e por Escape.
 */
export function DropdownMenu({
  items,
  triggerLabel,
  align = 'right',
  className = '',
  buttonClassName = '',
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (item: DropdownMenuItem) => {
    setIsOpen(false)
    if (!item.disabled) item.onSelect()
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={triggerLabel || 'Mais ações'}
        title={triggerLabel}
        className={`inline-flex items-center justify-center gap-1.5 h-7 px-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${buttonClassName}`}
      >
        {triggerLabel ? (
          <span className="text-xs font-medium">{triggerLabel}</span>
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute top-full mt-1 z-50 min-w-[11rem] rounded-lg border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                item.variant === 'danger'
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
