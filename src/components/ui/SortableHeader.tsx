import * as React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SortableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  column: string
  label: React.ReactNode
  currentSortBy?: string
  currentSortOrder?: 'asc' | 'desc'
  onSort?: (column: string) => void
  align?: 'left' | 'center' | 'right'
}

export function SortableHeader({
  column,
  label,
  currentSortBy,
  currentSortOrder,
  onSort,
  align = 'left',
  className,
  ...props
}: SortableHeaderProps) {
  const isSorted = currentSortBy === column

  const alignClass = {
    left: 'justify-start text-left',
    center: 'justify-center text-center',
    right: 'justify-end text-right',
  }[align]

  return (
    <th
      className={cn(
        'py-3 px-4 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground select-none',
        onSort && 'cursor-pointer hover:text-foreground transition-colors group',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
      onClick={() => onSort?.(column)}
      {...props}
    >
      <div className={cn('inline-flex items-center gap-1.5', alignClass)}>
        <span>{label}</span>
        {onSort && (
          <span className="text-muted-foreground/60 group-hover:text-foreground transition-colors">
            {isSorted ? (
              currentSortOrder === 'asc' ? (
                <ArrowUp className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-primary" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />
            )}
          </span>
        )}
      </div>
    </th>
  )
}
