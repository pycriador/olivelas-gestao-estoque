import * as React from 'react'
import { createPortal } from 'react-dom'

export interface PageHeaderProps {
  title: string
  badge?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, badge, children }: PageHeaderProps) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null)

  React.useLayoutEffect(() => {
    const el = document.getElementById('page-header-slot')
    setContainer(el)
  }, [])

  if (!container) return null

  return createPortal(
    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 animate-in fade-in duration-100">
      <div className="flex items-center gap-1.5 shrink-0">
        <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground whitespace-nowrap">
          {title}
        </h1>
        {badge}
      </div>
      {children && (
        <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md min-w-[140px]">
          {children}
        </div>
      )}
    </div>,
    container
  )
}
