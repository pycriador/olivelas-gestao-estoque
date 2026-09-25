import { format, formatDistanceToNow, parseISO, isValid, isBefore, isAfter, addDays } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'

const localesMap: Record<string, typeof ptBR> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': es,
}

export function formatDate(
  date: string | Date | null | undefined,
  pattern: string = 'dd/MM/yyyy',
  localeCode: string = 'pt-BR'
): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '-'
  const locale = localesMap[localeCode] || ptBR
  return format(d, pattern, { locale })
}

export function formatDateTime(
  date: string | Date | null | undefined,
  localeCode: string = 'pt-BR'
): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm', localeCode)
}

export function formatRelativeTime(
  date: string | Date | null | undefined,
  localeCode: string = 'pt-BR'
): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '-'
  const locale = localesMap[localeCode] || ptBR
  return formatDistanceToNow(d, { addSuffix: true, locale })
}

export function checkExpirationStatus(expirationDate: string | Date | null | undefined): {
  isExpired: boolean
  isExpiringSoon: boolean
  daysRemaining: number
  status: 'expired' | 'critical_7_days' | 'warning_30_days' | 'normal' | 'unknown'
} {
  if (!expirationDate) {
    return { isExpired: false, isExpiringSoon: false, daysRemaining: 999, status: 'unknown' }
  }
  const date = typeof expirationDate === 'string' ? parseISO(expirationDate) : expirationDate
  if (!isValid(date)) {
    return { isExpired: false, isExpiringSoon: false, daysRemaining: 999, status: 'unknown' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const in7Days = addDays(today, 7)
  const in30Days = addDays(today, 30)

  const diffTime = date.getTime() - today.getTime()
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (isBefore(date, today)) {
    return { isExpired: true, isExpiringSoon: true, daysRemaining, status: 'expired' }
  }
  if (isBefore(date, in7Days)) {
    return { isExpired: false, isExpiringSoon: true, daysRemaining, status: 'critical_7_days' }
  }
  if (isBefore(date, in30Days)) {
    return { isExpired: false, isExpiringSoon: true, daysRemaining, status: 'warning_30_days' }
  }
  return { isExpired: false, isExpiringSoon: false, daysRemaining, status: 'normal' }
}
