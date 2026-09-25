/**
 * Export utilities for secure, tenant-scoped CSV and data export
 */

export interface ExportColumn<T> {
  header: string
  key: keyof T | ((row: T) => string | number | boolean | null | undefined)
}

export function exportToCSV<T extends object>(
  filename: string,
  data: T[],
  columns: ExportColumn<T>[]
): void {
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado para exportar')
  }

  const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(';')

  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let val: unknown
        if (typeof col.key === 'function') {
          val = col.key(row)
        } else {
          val = (row as Record<string, unknown>)[col.key as string]
        }

        if (val === null || val === undefined) {
          return '""'
        }
        const stringVal = String(val).replace(/"/g, '""')
        return `"${stringVal}"`
      })
      .join(';')
  })

  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function printFormattedDocument(title: string, htmlContent: string): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: 600; }
          .header { margin-bottom: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
          .title { font-size: 20px; font-weight: bold; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title}</div>
          <div class="subtitle">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
