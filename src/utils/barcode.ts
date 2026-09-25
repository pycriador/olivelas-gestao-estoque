/**
 * Barcode & SKU validation and generation helper
 */

export function validateEAN13(barcode: string): boolean {
  if (!barcode || barcode.length !== 13 || !/^\d{13}$/.test(barcode)) {
    return false
  }

  const digits = barcode.split('').map(Number)
  const checksum = digits[12]

  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += i % 2 === 0 ? digits[i] : digits[i] * 3
  }

  const calculatedCheck = (10 - (sum % 10)) % 10
  return checksum === calculatedCheck
}

export function generateSKU(prefix: string = 'PRD', categoryCode?: string): string {
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase()
  const timestampPart = Date.now().toString().slice(-4)
  const cat = categoryCode ? `${categoryCode.substring(0, 3).toUpperCase()}-` : ''
  return `${prefix.toUpperCase()}-${cat}${timestampPart}-${randomPart}`
}

export function formatBarcodeDisplay(barcode: string | null | undefined): string {
  if (!barcode) return '-'
  if (barcode.length === 13) {
    return `${barcode.slice(0, 1)} ${barcode.slice(1, 7)} ${barcode.slice(7, 13)}`
  }
  return barcode
}
