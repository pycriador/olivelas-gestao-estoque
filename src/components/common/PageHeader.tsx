import * as React from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

export interface PageHeaderProps {
  title: string
  badge?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, badge, children }: PageHeaderProps) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null)
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false)
  const searchInputContainerRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const el = document.getElementById('page-header-slot')
    setContainer(el)
  }, [])

  // Auto-focus input when opened on mobile
  React.useEffect(() => {
    if (mobileSearchOpen && searchInputContainerRef.current) {
      const input = searchInputContainerRef.current.querySelector('input')
      if (input) {
        input.focus()
      }
    }
  }, [mobileSearchOpen])

  if (!container) return null

  // Check if child input has an active value to keep it open on mobile
  let hasValue = false
  if (React.isValidElement(children) && children.props && typeof children.props === 'object') {
    const val = (children.props as any).value
    if (val !== undefined && val !== null && String(val).trim().length > 0) {
      hasValue = true
    }
  }

  const isMobileOpen = mobileSearchOpen || hasValue

  return createPortal(
    <div className="flex items-center justify-between gap-2 flex-1 min-w-0 animate-in fade-in duration-100">
      {/* Title & Badge (Always visible on desktop; on mobile hidden when search input is expanded) */}
      <div className={`items-center gap-1.5 shrink-0 ${isMobileOpen ? 'hidden sm:flex' : 'flex'}`}>
        <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground whitespace-nowrap truncate max-w-[160px] xs:max-w-[200px] sm:max-w-none">
          {title}
        </h1>
        {badge}
      </div>

      {children && (
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end sm:justify-start">
          {/* Mobile Search Trigger Button (shown on mobile when search is collapsed) */}
          {!isMobileOpen && (
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="sm:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              title="Pesquisar nesta página"
              aria-label="Abrir campo de busca"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {/* Search Input Container (Inline in top navbar) */}
          <div
            ref={searchInputContainerRef}
            className={`items-center gap-1.5 flex-1 w-full max-w-full sm:max-w-xs md:max-w-sm lg:max-w-md ${
              isMobileOpen ? 'flex' : 'hidden sm:flex'
            }`}
          >
            <div className="flex-1 min-w-0 relative">
              {children}
            </div>

            {/* Mobile Close / Collapse Button */}
            {isMobileOpen && (
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="sm:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                title="Fechar busca"
                aria-label="Fechar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>,
    container
  )
}
