import type { EmployeePinRequirements } from '@/types/user.types'

export const DEFAULT_PIN_REQUIREMENTS: EmployeePinRequirements = {
  minLength: 6,
  maxLength: 12,
  requireNumbers: true,
  requireUppercase: true,
  requireLowercase: false,
  requireSymbols: true,
  disallowSequential: true,
}

export const PIN_PRESET_POLICIES: Record<
  'STRONG' | 'MAX_SECURITY' | 'NUMERIC_ONLY',
  { label: string; description: string; requirements: EmployeePinRequirements }
> = {
  STRONG: {
    label: 'Forte (Recomendado)',
    description: '6 a 12 caracteres com números, letras maiúsculas e símbolos',
    requirements: {
      minLength: 6,
      maxLength: 12,
      requireNumbers: true,
      requireUppercase: true,
      requireLowercase: false,
      requireSymbols: true,
      disallowSequential: true,
    },
  },
  MAX_SECURITY: {
    label: 'Máxima Segurança',
    description: '8 a 16 caracteres com números, maiúsculas, minúsculas e símbolos',
    requirements: {
      minLength: 8,
      maxLength: 16,
      requireNumbers: true,
      requireUppercase: true,
      requireLowercase: true,
      requireSymbols: true,
      disallowSequential: true,
    },
  },
  NUMERIC_ONLY: {
    label: 'Numérico Rápido (PDV)',
    description: '4 a 8 dígitos numéricos sem sequências óbvias',
    requirements: {
      minLength: 4,
      maxLength: 8,
      requireNumbers: true,
      requireUppercase: false,
      requireLowercase: false,
      requireSymbols: false,
      disallowSequential: true,
    },
  },
}

export interface PinRequirementCheckResult {
  key: string
  label: string
  required: boolean
  passed: boolean
}

export function normalizePinRequirements(
  raw?: Partial<EmployeePinRequirements> | null
): EmployeePinRequirements {
  const minLength = Math.max(4, Math.min(16, Number(raw?.minLength) || DEFAULT_PIN_REQUIREMENTS.minLength))
  const maxLength = Math.max(
    minLength,
    Math.min(24, Number(raw?.maxLength) || DEFAULT_PIN_REQUIREMENTS.maxLength)
  )
  return {
    minLength,
    maxLength,
    requireNumbers:
      raw?.requireNumbers !== undefined ? Boolean(raw.requireNumbers) : DEFAULT_PIN_REQUIREMENTS.requireNumbers,
    requireUppercase:
      raw?.requireUppercase !== undefined
        ? Boolean(raw.requireUppercase)
        : DEFAULT_PIN_REQUIREMENTS.requireUppercase,
    requireLowercase:
      raw?.requireLowercase !== undefined
        ? Boolean(raw.requireLowercase)
        : DEFAULT_PIN_REQUIREMENTS.requireLowercase,
    requireSymbols:
      raw?.requireSymbols !== undefined ? Boolean(raw.requireSymbols) : DEFAULT_PIN_REQUIREMENTS.requireSymbols,
    disallowSequential:
      raw?.disallowSequential !== undefined
        ? Boolean(raw.disallowSequential)
        : DEFAULT_PIN_REQUIREMENTS.disallowSequential,
  }
}

export function hasTrivialSequenceOrRepetition(pin: string): boolean {
  const trimmed = pin.trim()
  if (trimmed.length < 3) return false

  // Repetição de 3 ou mais caracteres idênticos seguidos (ex: 000, 1111, AAAA)
  if (/(.)\1\1/.test(trimmed)) {
    return true
  }

  // Sequências conhecidas
  const lower = trimmed.toLowerCase()
  const blockedSequences = [
    '0123',
    '1234',
    '2345',
    '3456',
    '4567',
    '5678',
    '6789',
    '9876',
    '8765',
    '7654',
    '6543',
    '5432',
    '4321',
    '3210',
    'abcd',
    'bcde',
    'cdef',
    'qwer',
    'asdf',
  ]
  return blockedSequences.some((seq) => lower.includes(seq))
}

export function evaluatePinRequirements(
  pin: string,
  rawRequirements?: Partial<EmployeePinRequirements> | null
): {
  isValid: boolean
  score: number
  strengthPercent: number
  strengthLabel: string
  checks: PinRequirementCheckResult[]
  failedLabels: string[]
} {
  const req = normalizePinRequirements(rawRequirements)
  const val = pin || ''

  const checks: PinRequirementCheckResult[] = [
    {
      key: 'length',
      label: `De ${req.minLength} a ${req.maxLength} caracteres (atual: ${val.length})`,
      required: true,
      passed: val.length >= req.minLength && val.length <= req.maxLength,
    },
    {
      key: 'numbers',
      label: 'Contém números (0–9)',
      required: req.requireNumbers,
      passed: !req.requireNumbers || /\d/.test(val),
    },
    {
      key: 'uppercase',
      label: 'Contém letras maiúsculas (A–Z)',
      required: req.requireUppercase,
      passed: !req.requireUppercase || /[A-Z]/.test(val),
    },
    {
      key: 'lowercase',
      label: 'Contém letras minúsculas (a–z)',
      required: req.requireLowercase,
      passed: !req.requireLowercase || /[a-z]/.test(val),
    },
    {
      key: 'symbols',
      label: 'Contém símbolos especiais (@ # $ % & * ! ? - _)',
      required: req.requireSymbols,
      passed: !req.requireSymbols || /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`@]/.test(val),
    },
    {
      key: 'sequential',
      label: 'Sem sequências ou repetições óbvias (ex: 1234, 0000, AAAA)',
      required: req.disallowSequential,
      passed: !req.disallowSequential || (val.length > 0 && !hasTrivialSequenceOrRepetition(val)),
    },
  ]

  const requiredChecks = checks.filter((c) => c.required)
  const passedRequired = requiredChecks.filter((c) => c.passed).length
  const isValid = val.length > 0 && passedRequired === requiredChecks.length
  const score =
    requiredChecks.length > 0 ? Math.round((passedRequired / requiredChecks.length) * 100) : 100
  const strengthLabel =
    score >= 90 ? 'Forte' : score >= 65 ? 'Médio' : 'Fraco'

  return {
    isValid,
    score,
    strengthPercent: score,
    strengthLabel,
    checks,
    failedLabels: requiredChecks.filter((c) => !c.passed).map((c) => c.label),
  }
}

export function generateCompliantPin(
  rawRequirements?: Partial<EmployeePinRequirements> | null
): string {
  const req = normalizePinRequirements(rawRequirements)
  const targetLen = Math.max(req.minLength, Math.min(req.maxLength, 8))

  const digits = '23456789'
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowers = 'abcdefghijkmnopqrstuvwxyz'
  const symbols = '@#$%&*!?'

  const chars: string[] = []
  if (req.requireNumbers) {
    chars.push(digits[Math.floor(Math.random() * digits.length)])
    chars.push(digits[Math.floor(Math.random() * digits.length)])
  }
  if (req.requireUppercase) {
    chars.push(uppers[Math.floor(Math.random() * uppers.length)])
    chars.push(uppers[Math.floor(Math.random() * uppers.length)])
  }
  if (req.requireLowercase) {
    chars.push(lowers[Math.floor(Math.random() * lowers.length)])
  }
  if (req.requireSymbols) {
    chars.push(symbols[Math.floor(Math.random() * symbols.length)])
  }

  let pool = ''
  if (req.requireNumbers) pool += digits
  if (req.requireUppercase) pool += uppers
  if (req.requireLowercase) pool += lowers
  if (req.requireSymbols) pool += symbols
  if (!pool) pool = digits + uppers

  while (chars.length < targetLen) {
    const nextChar = pool[Math.floor(Math.random() * pool.length)]
    // Prevent consecutive identical chars
    if (chars.length > 0 && chars[chars.length - 1] === nextChar) continue
    chars.push(nextChar)
  }

  // Shuffle avoiding adjacent duplicates
  const shuffled = chars.slice(0, req.maxLength).sort(() => Math.random() - 0.5).join('')
  if (hasTrivialSequenceOrRepetition(shuffled)) {
    return 'K7#M9$P2'.slice(0, targetLen)
  }
  return shuffled
}
