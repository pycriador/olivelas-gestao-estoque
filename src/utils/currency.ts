/**
 * Currency formatting utilities for multi-currency and BRL standard
 */

export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = 'BRL',
  locale: string = 'pt-BR'
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'R$ 0,00'
  }
  const numericValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(numericValue)
}

export function parseCurrency(value: string): number {
  if (!value) return 0
  // Clean characters except digits, minus, and comma/dots
  const clean = value.replace(/[^\d,-]/g, '').replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}
