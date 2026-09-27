import * as React from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { SortableHeader, type SortableHeaderProps } from '@/components/ui/SortableHeader'

interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
}

function collectSortableHeaders(
  children: React.ReactNode,
  headers: React.ReactElement<SortableHeaderProps>[] = [],
) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return

    if (child.type === SortableHeader) {
      headers.push(child as React.ReactElement<SortableHeaderProps>)
      return
    }

    const element = child as React.ReactElement<{ children?: React.ReactNode }>
    if (element.props.children) collectSortableHeaders(element.props.children, headers)
  })

  return headers
}

export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  const tableRef = React.useRef<HTMLTableElement>(null)
  const sortableHeaders = collectSortableHeaders(children)
  const activeSort =
    sortableHeaders.find((header) => header.props.currentSortBy === header.props.column) ??
    sortableHeaders[0]

  React.useLayoutEffect(() => {
    const table = tableRef.current
    if (!table) return

    const updateMobileLabels = () => {
      const labels = Array.from(table.querySelectorAll('thead tr:last-child th')).map((cell) =>
        cell.textContent?.replace(/\s+/g, ' ').trim() || '',
      )

      table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
        Array.from(row.cells).forEach((cell, index) => {
          cell.dataset.mobileLabel = labels[index] || ''
          cell.classList.toggle(
            'mobile-table-actions',
            /^(aç(ões|ão)|ações rápidas|inspecionar)$/i.test(labels[index] || ''),
          )
        })
      })
    }

    updateMobileLabels()
    const observer = new MutationObserver(updateMobileLabels)
    observer.observe(table, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="responsive-table-shell">
      {sortableHeaders.length > 0 && activeSort && (
        <div className="mobile-table-sort md:hidden">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs">
            <span className="shrink-0 text-muted-foreground">Ordenar</span>
            <select
              value={activeSort.props.currentSortBy || activeSort.props.column}
              onChange={(event) => {
                const nextSort = sortableHeaders.find(
                  (header) => header.props.column === event.target.value,
                )
                nextSort?.props.onSort?.(nextSort.props.column)
              }}
              className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              aria-label="Ordenar tabela"
            >
              {sortableHeaders.map((header) => (
                <option key={header.props.column} value={header.props.column}>
                  {typeof header.props.label === 'string'
                    ? header.props.label
                    : header.props.column}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => activeSort.props.onSort?.(activeSort.props.column)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={
              activeSort.props.currentSortOrder === 'asc'
                ? 'Ordenação crescente; inverter direção'
                : 'Ordenação decrescente; inverter direção'
            }
            title="Inverter direção da ordenação"
          >
            {activeSort.props.currentSortOrder === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
      <table ref={tableRef} className={`responsive-mobile-cards ${className}`}>
        {children}
      </table>
    </div>
  )
}