import React from 'react'
import { cn } from '@/utils/cn'

interface AiMarkdownContentProps {
  content: string
  className?: string
}

/**
 * Renderiza inline Markdown (**negrito**, `código`, *itálico*) em elementos React limpos
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return []

  // Normaliza combinações como *Unidade: **GNZ*** removendo asteriscos externos redundantes
  let normalized = text
  if (
    normalized.startsWith('*') &&
    !normalized.startsWith('**') &&
    normalized.endsWith('***')
  ) {
    normalized = normalized.slice(1, -1)
  } else if (
    normalized.startsWith('*') &&
    !normalized.startsWith('**') &&
    normalized.endsWith('*') &&
    !normalized.endsWith('**')
  ) {
    normalized = normalized.slice(1, -1)
  }

  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g
  const parts = normalized.split(pattern)

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded-md border border-border/70 bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      )
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}

export const AiMarkdownContent: React.FC<AiMarkdownContentProps> = ({
  content,
  className,
}) => {
  if (!content) return null

  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // Linha em branco
    if (!trimmed) {
      i++
      continue
    }

    // Separador horizontal (--- ou ***)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(
        <hr key={`hr-${i}`} className="my-2.5 border-border/60" />
      )
      i++
      continue
    }

    // Tabela Markdown (| col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const tableLines: string[] = []
      while (
        i < lines.length &&
        lines[i].trim().startsWith('|') &&
        lines[i].trim().endsWith('|')
      ) {
        tableLines.push(lines[i].trim())
        i++
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .slice(1, -1)
            .split('|')
            .map((cell) => cell.trim())

        const headerCells = parseRow(tableLines[0])
        const isSeparatorRow = (rowStr: string) =>
          /^\|[\s:-]+(\|[\s:-]+)*\|$/.test(rowStr)

        const bodyStartIndex = isSeparatorRow(tableLines[1]) ? 2 : 1
        const bodyRows = tableLines
          .slice(bodyStartIndex)
          .filter((r) => !isSeparatorRow(r))
          .map(parseRow)

        blocks.push(
          <div
            key={`table-${i}`}
            className="my-2 overflow-x-auto rounded-xl border border-border/80 bg-background/60"
          >
            <table className="w-full border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {headerCells.map((cell, cIdx) => (
                    <th
                      key={cIdx}
                      className="px-2.5 py-1.5 font-bold text-foreground"
                    >
                      {renderInlineMarkdown(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/20">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2.5 py-1.5 text-foreground/90">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        continue
      }
    }

    // Títulos (###, ####, ##, #)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const headingText = headingMatch[2]
      blocks.push(
        <div
          key={`h-${i}`}
          className={cn(
            'font-bold text-foreground',
            level <= 2
              ? 'mt-2.5 mb-1 text-sm border-b border-border/50 pb-1'
              : level === 3
                ? 'mt-2 mb-1 text-xs sm:text-sm text-violet-700 dark:text-violet-300'
                : 'mt-2 mb-0.5 text-xs font-extrabold uppercase tracking-wide text-foreground/90'
          )}
        >
          {renderInlineMarkdown(headingText)}
        </div>
      )
      i++
      continue
    }

    // Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 rounded-r-xl border-l-3 border-emerald-500 bg-emerald-500/10 px-3 py-2 text-xs text-foreground"
        >
          {quoteLines.map((ql, qIdx) => (
            <div key={qIdx}>{renderInlineMarkdown(ql)}</div>
          ))}
        </blockquote>
      )
      continue
    }

    // Lista com marcadores (- , * , • )
    if (/^([-•]|\*(?!\*))\s+/.test(trimmed)) {
      const items: string[] = []
      while (
        i < lines.length &&
        /^([-•]|\*(?!\*))\s+/.test(lines[i].trim())
      ) {
        items.push(lines[i].trim().replace(/^([-•]|\*(?!\*))\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-1.5 space-y-1 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
              <span className="flex-1">{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Lista numerada (1. , 2. )
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: Array<{ num: string; text: string }> = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^(\d+)\.\s+(.+)$/)
        if (m) {
          items.push({ num: m[1], text: m[2] })
        }
        i++
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-1.5 space-y-1.5 pl-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed">
              <span className="mt-0.5 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
                {item.num}
              </span>
              <span className="flex-1">{renderInlineMarkdown(item.text)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Parágrafo comum
    blocks.push(
      <p key={`p-${i}`} className="my-1 text-xs leading-relaxed text-foreground/95">
        {renderInlineMarkdown(trimmed)}
      </p>
    )
    i++
  }

  return <div className={cn('space-y-1', className)}>{blocks}</div>
}
