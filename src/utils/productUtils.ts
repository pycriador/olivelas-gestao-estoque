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
