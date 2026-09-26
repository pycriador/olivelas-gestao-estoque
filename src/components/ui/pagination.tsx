import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
  compactOnMobile?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
  compactOnMobile = true,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages)
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages)

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems)

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const delta = 1 // pages around current page

    for (let i = 1; i <= safeTotalPages; i++) {
      if (
        i === 1 ||
        i === safeTotalPages ||
        (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)
      ) {
        pages.push(i)
      } else if (
        pages[pages.length - 1] !== '...' &&
        (i < safeCurrentPage - delta || i > safeCurrentPage + delta)
      ) {
        pages.push('...')
      }
    }
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground select-none',
        className
      )}
    >
      {/* Left: Summary Info & Page Size */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-xs">
          Mostrando <b className="font-mono text-foreground font-semibold">{startItem}</b> a{' '}
          <b className="font-mono text-foreground font-semibold">{endItem}</b> de{' '}
          <b className="font-mono text-foreground font-semibold">{totalItems}</b> registros
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
            <span className="hidden md:inline text-[11px]">Exibir:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Itens por página"
              className="h-7 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}/pág
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          aria-label="Primeira página"
          title="Primeira página"
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          aria-label="Página anterior"
          title="Página anterior"
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-6 text-center text-muted-foreground text-xs"
                >
                  …
                </span>
              )
            }

            const pageNum = p as number
            const isActive = pageNum === safeCurrentPage

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'h-8 min-w-[2rem] px-2 rounded-lg text-xs font-mono font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                    : 'border border-border text-foreground hover:bg-muted',
                  compactOnMobile && !isActive && 'hidden sm:flex items-center justify-center'
                )}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages}
          aria-label="Próxima página"
          title="Próxima página"
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safeCurrentPage >= safeTotalPages}
          aria-label="Última página"
          title="Última página"
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
