import type { Product } from '@/types/product.types'

export const isWeighedProduct = (product?: Product | { unit?: string | null } | null): boolean => {
  if (!product) return false
  const unit = (product.unit || '').trim().toUpperCase()
  return (
    unit === 'KG' ||
    unit === 'QUILOGRAMA' ||
    unit === 'QUILOGRAMAS' ||
    unit === 'QUILOGRAMA (KG)' ||
    unit === 'KILOGRAM' ||
    unit === 'KILOGRAMS' ||
    unit.includes('KG') ||
    unit.includes('QUILO') ||
    unit.includes('GRAMA')
  )
}

export const formatProductWeight = (quantityInKg: number): string => {
  const roundedGrams = Math.round(quantityInKg * 1000)
  if (roundedGrams >= 1000) {
    const formattedKg = quantityInKg.toFixed(3).replace(/\.?0+$/, '')
    return `${formattedKg} kg`
  }
  return `${roundedGrams}g`
}

/**
 * Converte um termo de busca em uma regex tolerante a acentuação (ex: 'vitoria' -> 'v[iíìîï]t[oóòôõö]r[iíìîï][aáàãâä]')
 * permitindo buscas insensíveis a acentos via PostgREST `imatch` (~* no Postgres).
 */
export function buildAccentRegex(term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped
    .replace(/[aáàãâäAÁÀÃÂÄ]/gi, '[aáàãâä]')
    .replace(/[eéèêëEÉÈÊË]/gi, '[eéèêë]')
    .replace(/[iíìîïIÍÌÎÏ]/gi, '[iíìîï]')
    .replace(/[oóòôõöOÓÒÔÕÖ]/gi, '[oóòôõö]')
    .replace(/[uúùûüUÚÙÛÜ]/gi, '[uúùûü]')
    .replace(/[cçCÇ]/gi, '[cç]')
}
