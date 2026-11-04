import * as React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/utils/currency'
import { isWeighedProduct } from '@/utils/productUtils'
import { Scale, Hash, Check, Sparkles } from 'lucide-react'
import type { Product } from '@/types/product.types'

interface WeightInputModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  initialQuantity?: number
  maxAvailable?: number
  onConfirm: (quantity: number) => void
}

const COMMON_WEIGHT_PRESETS = [
  { label: '100g', grams: 100 },
  { label: '150g', grams: 150 },
  { label: '250g', grams: 250 },
  { label: '500g', grams: 500 },
  { label: '1 kg', grams: 1000 },
]

const COMMON_UNIT_PRESETS = [
  { label: '1 un', units: 1 },
  { label: '2 un', units: 2 },
  { label: '3 un', units: 3 },
  { label: '5 un', units: 5 },
  { label: '6 un', units: 6 },
  { label: '10 un', units: 10 },
]

export function WeightInputModal({
  isOpen,
  onClose,
  product,
  initialQuantity,
  maxAvailable = 9999,
  onConfirm,
}: WeightInputModalProps) {
  const isWeighed = product ? isWeighedProduct(product) : true
  const unitCode = (product?.unit || (isWeighed ? 'KG' : 'UN')).trim().toUpperCase()
  const unitLower = unitCode.toLowerCase()

  const [inputMode, setInputMode] = React.useState<'grams' | 'kg' | 'units' | 'money'>('grams')
  const [gramsText, setGramsText] = React.useState<string>('150')
  const [kgText, setKgText] = React.useState<string>('0.150')
  const [unitsText, setUnitsText] = React.useState<string>('1')
  const [moneyText, setMoneyText] = React.useState<string>('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const unitPrice = Number(product?.selling_price || 0)

  // Sincronizar quando abrir o modal
  React.useEffect(() => {
    if (isOpen && product) {
      const weighed = isWeighedProduct(product)
      if (weighed) {
        const defaultQty = initialQuantity && initialQuantity > 0 ? initialQuantity : 0.15
        const initialGrams = Math.round(defaultQty * 1000)
        const initialKg = Number((initialGrams / 1000).toFixed(3))
        const initialMoney = Number((initialKg * unitPrice).toFixed(2))

        setInputMode('grams')
        setGramsText(String(initialGrams))
        setKgText(String(initialKg))
        setMoneyText(initialMoney > 0 ? initialMoney.toFixed(2) : '')
      } else {
        const defaultUnits = initialQuantity && initialQuantity > 0 ? Math.round(initialQuantity) : 1
        const initialMoney = Number((defaultUnits * unitPrice).toFixed(2))

        setInputMode('units')
        setUnitsText(String(defaultUnits))
        setMoneyText(initialMoney > 0 ? initialMoney.toFixed(2) : '')
      }
      setErrorMsg(null)
    }
  }, [isOpen, product, initialQuantity, unitPrice])

  if (!product) return null

  const currentKg = parseFloat(kgText.replace(',', '.')) || 0
  const currentGrams = parseFloat(gramsText.replace(',', '.')) || Math.round(currentKg * 1000)
  const currentUnits = parseFloat(unitsText.replace(',', '.')) || 0
  const effectiveQuantity = isWeighed ? currentKg : currentUnits
  const totalCalculated = Number((effectiveQuantity * unitPrice).toFixed(2))

  const validateStock = (qty: number) => {
    if (maxAvailable !== undefined && qty > maxAvailable) {
      setErrorMsg(
        `Quantidade excede o estoque disponível (${maxAvailable} ${isWeighed ? 'kg' : unitLower}).`
      )
    } else {
      setErrorMsg(null)
    }
  }

  const handleGramsChange = (raw: string) => {
    setGramsText(raw)
    const g = parseFloat(raw.replace(',', '.'))
    if (!isNaN(g) && g >= 0) {
      const calculatedKg = Number((g / 1000).toFixed(3))
      setKgText(String(calculatedKg))
      if (unitPrice > 0) {
        setMoneyText((calculatedKg * unitPrice).toFixed(2))
      }
      validateStock(calculatedKg)
    } else {
      setKgText('')
      setMoneyText('')
    }
  }

  const handleKgChange = (raw: string) => {
    setKgText(raw)
    const k = parseFloat(raw.replace(',', '.'))
    if (!isNaN(k) && k >= 0) {
      const calculatedGrams = Math.round(k * 1000)
      setGramsText(String(calculatedGrams))
      if (unitPrice > 0) {
        setMoneyText((k * unitPrice).toFixed(2))
      }
      validateStock(k)
    } else {
      setGramsText('')
      setMoneyText('')
    }
  }

  const handleUnitsChange = (raw: string) => {
    setUnitsText(raw)
    const u = parseFloat(raw.replace(',', '.'))
    if (!isNaN(u) && u >= 0) {
      if (unitPrice > 0) {
        setMoneyText((u * unitPrice).toFixed(2))
      }
      validateStock(u)
    } else {
      setMoneyText('')
    }
  }

  const handleMoneyChange = (raw: string) => {
    setMoneyText(raw)
    const m = parseFloat(raw.replace(',', '.'))
    if (!isNaN(m) && m >= 0 && unitPrice > 0) {
      if (isWeighed) {
        const calculatedKg = Number((m / unitPrice).toFixed(3))
        const calculatedGrams = Math.round(calculatedKg * 1000)
        setKgText(String(calculatedKg))
        setGramsText(String(calculatedGrams))
        validateStock(calculatedKg)
      } else {
        const calculatedUnits = Math.max(1, Math.floor(m / unitPrice))
        setUnitsText(String(calculatedUnits))
        validateStock(calculatedUnits)
      }
    }
  }

  const handleWeightPresetClick = (grams: number) => {
    handleGramsChange(String(grams))
  }

  const handleUnitPresetClick = (units: number) => {
    setInputMode('units')
    handleUnitsChange(String(units))
  }

  const handleAdjustGrams = (delta: number) => {
    const current = parseFloat(gramsText.replace(',', '.')) || 0
    const nextGrams = Math.max(1, current + delta)
    handleGramsChange(String(nextGrams))
  }

  const handleAdjustUnits = (delta: number) => {
    const current = parseFloat(unitsText.replace(',', '.')) || 0
    const nextUnits = Math.max(1, Math.round(current + delta))
    handleUnitsChange(String(nextUnits))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isWeighed) {
      const kg = parseFloat(kgText.replace(',', '.'))
      if (isNaN(kg) || kg <= 0) {
        setErrorMsg('Informe um peso livre válido maior que zero.')
        return
      }
      if (maxAvailable !== undefined && kg > maxAvailable) {
        setErrorMsg(`Estoque insuficiente. Máximo disponível: ${maxAvailable} kg.`)
        return
      }
      onConfirm(kg)
      onClose()
    } else {
      const units = parseFloat(unitsText.replace(',', '.'))
      if (isNaN(units) || units <= 0) {
        setErrorMsg('Informe uma quantidade válida maior que zero.')
        return
      }
      if (maxAvailable !== undefined && units > maxAvailable) {
        setErrorMsg(`Estoque insuficiente. Máximo disponível: ${maxAvailable} ${unitLower}.`)
        return
      }
      onConfirm(units)
      onClose()
    }
  }

  const formattedConfirmBadge = isWeighed
    ? currentGrams >= 1000
      ? `${currentKg} kg`
      : `${currentGrams}g`
    : `${currentUnits} ${unitLower}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isWeighed
          ? 'Pesar / Selecionar Quantidade (KG)'
          : `Digitar / Selecionar Quantidade (${unitCode})`
      }
      description={`${product.name} — Preço: ${formatCurrency(unitPrice)}/${isWeighed ? 'kg' : unitLower}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3 pt-0.5">
        {errorMsg && (
          <div className="p-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Compact Calculated Value Preview Banner */}
        <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              {isWeighed ? (
                <Scale className="h-3 w-3 text-primary" />
              ) : (
                <Hash className="h-3 w-3 text-primary" />
              )}{' '}
              Total a Pagar
            </span>
            <div className="text-xl font-bold font-mono text-primary leading-none">
              {formatCurrency(totalCalculated)}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {isWeighed
                ? `${currentGrams}g (${currentKg} kg) × ${formatCurrency(unitPrice)}/kg`
                : `${currentUnits} ${unitLower} × ${formatCurrency(unitPrice)}/${unitLower}`}
            </div>
          </div>

          <div className="text-right">
            <Badge variant="default" className="text-xs px-2 py-0.5 font-mono font-bold">
              {formattedConfirmBadge}
            </Badge>
            {maxAvailable !== undefined && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Estoque: {maxAvailable} {isWeighed ? 'kg' : unitLower}
              </div>
            )}
          </div>
        </div>

        {/* Input Mode Tabs */}
        {isWeighed ? (
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setInputMode('grams')}
              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                inputMode === 'grams'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Gramas (g)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('kg')}
              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                inputMode === 'kg'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Quilogramas (kg)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('money')}
              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                inputMode === 'money'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Valor em R$
            </button>
          </div>
        ) : (
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setInputMode('units')}
              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                inputMode === 'units'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Quantidade ({unitCode})
            </button>
            <button
              type="button"
              onClick={() => setInputMode('money')}
              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                inputMode === 'money'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Valor em R$
            </button>
          </div>
        )}

        {/* Interactive Input Fields based on Mode */}
        {isWeighed && inputMode === 'grams' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-foreground">
                Digite o peso livre em Gramas (g)
              </label>
              <span className="text-[10px] text-muted-foreground">Ex: 85, 137, 260, 1450</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAdjustGrams(-50)}
                className="h-10 w-10 shrink-0 rounded-lg border border-border flex items-center justify-center hover:bg-muted font-bold text-sm cursor-pointer"
                title="-50g"
              >
                -50g
              </button>
              <Input
                type="text"
                inputMode="decimal"
                value={gramsText}
                onChange={(e) => handleGramsChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-10 text-center font-mono text-lg font-bold"
                placeholder="Digite o peso em gramas"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleAdjustGrams(50)}
                className="h-10 w-10 shrink-0 rounded-lg border border-border flex items-center justify-center hover:bg-muted font-bold text-sm cursor-pointer"
                title="+50g"
              >
                +50g
              </button>
            </div>
          </div>
        )}

        {isWeighed && inputMode === 'kg' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-foreground">
                Digite o peso livre em Quilos (kg)
              </label>
              <span className="text-[10px] text-muted-foreground">Ex: 0.135, 0.480, 1.250</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAdjustGrams(-100)}
                className="h-10 w-10 shrink-0 rounded-lg border border-border flex items-center justify-center hover:bg-muted font-bold text-xs cursor-pointer"
                title="-0,100kg"
              >
                -0,1kg
              </button>
              <Input
                type="text"
                inputMode="decimal"
                value={kgText}
                onChange={(e) => handleKgChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-10 text-center font-mono text-lg font-bold"
                placeholder="Ex: 0.150"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleAdjustGrams(100)}
                className="h-10 w-10 shrink-0 rounded-lg border border-border flex items-center justify-center hover:bg-muted font-bold text-xs cursor-pointer"
                title="+0,100kg"
              >
                +0,1kg
              </button>
            </div>
          </div>
        )}

        {!isWeighed && inputMode === 'units' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-foreground">
                Digite a quantidade em {unitCode}
              </label>
              <span className="text-[10px] text-muted-foreground">Ex: 1, 2, 5, 10, 12</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAdjustUnits(-1)}
                className="h-10 w-10 shrink-0 rounded-lg border border-border flex items-center justify-center hover:bg-muted font-bold text-sm cursor-pointer"
                title="-1 un"
              >
                -1
              </button>
              <Input
                type="text"
                inputMode="numeric"
                value={unitsText}
                onChange={(e) => handleUnitsChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="h-10 text-center font-mono text-lg font-bold"
                placeholder="Digite a quantidade"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleAdjustUnits(1)}
                className="h-10 w-10 shrink-0 rounded-lg border border-border flex items-center justify-center hover:bg-muted font-bold text-sm cursor-pointer"
                title="+1 un"
              >
                +1
              </button>
            </div>
          </div>
        )}

        {inputMode === 'money' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-foreground">
                Quanto o cliente deseja gastar em R$?
              </label>
              <span className="text-[10px] text-muted-foreground">
                {isWeighed ? 'Calcula peso automático' : 'Calcula unidades automático'}
              </span>
            </div>
            <Input
              type="text"
              inputMode="decimal"
              value={moneyText}
              onChange={(e) => handleMoneyChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="h-10 text-center font-mono text-lg font-bold"
              placeholder="Ex: 10.00"
              autoFocus
            />
          </div>
        )}

        {/* Quick Presets: Single Row */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Atalho rápido (1 toque)
          </label>
          {isWeighed ? (
            <div className="grid grid-cols-5 gap-1.5">
              {COMMON_WEIGHT_PRESETS.map((preset) => {
                const isSelected = Math.abs(currentGrams - preset.grams) < 1
                return (
                  <button
                    key={preset.grams}
                    type="button"
                    onClick={() => handleWeightPresetClick(preset.grams)}
                    className={`py-1 px-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20'
                        : 'bg-surface hover:bg-muted border-border text-foreground'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-1.5">
              {COMMON_UNIT_PRESETS.map((preset) => {
                const isSelected = Math.abs(currentUnits - preset.units) < 0.001
                return (
                  <button
                    key={preset.units}
                    type="button"
                    onClick={() => handleUnitPresetClick(preset.units)}
                    className={`py-1 px-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20'
                        : 'bg-surface hover:bg-muted border-border text-foreground'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2.5 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-9 text-xs"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto h-9 text-xs font-semibold shadow-xs"
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Confirmar {formattedConfirmBadge} ({formatCurrency(totalCalculated)})
          </Button>
        </div>
      </form>
    </Modal>
  )
}
