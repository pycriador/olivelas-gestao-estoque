import * as React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/utils/currency'
import { Scale, Plus, Minus, ArrowRight, Check, Sparkles } from 'lucide-react'
import type { Product } from '@/types/product.types'

interface WeightInputModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  initialQuantity?: number
  maxAvailable?: number
  onConfirm: (quantityInKg: number) => void
}

const COMMON_PRESETS = [
  { label: '100g', grams: 100 },
  { label: '150g', grams: 150 },
  { label: '200g', grams: 200 },
  { label: '250g', grams: 250 },
  { label: '300g', grams: 300 },
  { label: '500g (1/2 kg)', grams: 500 },
  { label: '750g', grams: 750 },
  { label: '1.000g (1 kg)', grams: 1000 },
  { label: '1,5 kg', grams: 1500 },
  { label: '2 kg', grams: 2000 },
]

export function WeightInputModal({
  isOpen,
  onClose,
  product,
  initialQuantity = 0.15,
  maxAvailable = 9999,
  onConfirm,
}: WeightInputModalProps) {
  const [inputMode, setInputMode] = React.useState<'grams' | 'kg' | 'money'>('grams')
  const [gramsValue, setGramsValue] = React.useState<number>(150)
  const [kgValue, setKgValue] = React.useState<number>(0.15)
  const [moneyValue, setMoneyValue] = React.useState<number>(0)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const pricePerKg = Number(product?.selling_price || 0)

  // Sincronizar quando abrir o modal
  React.useEffect(() => {
    if (isOpen && product) {
      const initialGrams = Math.round((initialQuantity || 0.15) * 1000)
      setGramsValue(initialGrams)
      setKgValue(Number((initialGrams / 1000).toFixed(3)))
      setMoneyValue(Number(((initialGrams / 1000) * pricePerKg).toFixed(2)))
      setErrorMsg(null)
    }
  }, [isOpen, product, initialQuantity, pricePerKg])

  if (!product) return null

  const handleGramsChange = (val: number) => {
    const validGrams = Math.max(0, val)
    setGramsValue(validGrams)
    const inKg = Number((validGrams / 1000).toFixed(3))
    setKgValue(inKg)
    setMoneyValue(Number((inKg * pricePerKg).toFixed(2)))
    validateStock(inKg)
  }

  const handleKgChange = (val: number) => {
    const validKg = Math.max(0, val)
    setKgValue(validKg)
    const inGrams = Math.round(validKg * 1000)
    setGramsValue(inGrams)
    setMoneyValue(Number((validKg * pricePerKg).toFixed(2)))
    validateStock(validKg)
  }

  const handleMoneyChange = (val: number) => {
    const validMoney = Math.max(0, val)
    setMoneyValue(validMoney)
    if (pricePerKg > 0) {
      const calculatedKg = Number((validMoney / pricePerKg).toFixed(3))
      setKgValue(calculatedKg)
      setGramsValue(Math.round(calculatedKg * 1000))
      validateStock(calculatedKg)
    }
  }

  const validateStock = (kg: number) => {
    if (maxAvailable !== undefined && kg > maxAvailable) {
      setErrorMsg(`Quantidade excede o estoque disponível (${maxAvailable} kg).`)
    } else {
      setErrorMsg(null)
    }
  }

  const handlePresetClick = (grams: number) => {
    handleGramsChange(grams)
  }

  const handleAdjustGrams = (delta: number) => {
    const newGrams = Math.max(10, gramsValue + delta)
    handleGramsChange(newGrams)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (kgValue <= 0) {
      setErrorMsg('Informe um peso maior que zero.')
      return
    }
    if (maxAvailable !== undefined && kgValue > maxAvailable) {
      setErrorMsg(`Estoque insuficiente. Máximo disponível: ${maxAvailable} kg.`)
      return
    }
    onConfirm(kgValue)
    onClose()
  }

  const totalCalculated = Number((kgValue * pricePerKg).toFixed(2))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pesar / Selecionar Quantidade (KG)"
      description={`${product.name} — Preço por Quilo: ${formatCurrency(pricePerKg)}/kg`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {errorMsg && (
          <div className="p-2.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Big Calculated Value Preview Banner */}
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <Scale className="h-3.5 w-3.5 text-primary" /> Total a Pagar
            </span>
            <div className="text-2xl font-bold font-mono text-primary">
              {formatCurrency(totalCalculated)}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              {gramsValue}g ({kgValue} kg) × {formatCurrency(pricePerKg)}/kg
            </div>
          </div>

          <div className="text-right">
            <Badge variant="default" className="text-xs px-2.5 py-1 font-mono font-bold">
              {gramsValue >= 1000 ? `${kgValue} kg` : `${gramsValue}g`}
            </Badge>
            {maxAvailable !== undefined && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Estoque: {maxAvailable} kg
              </div>
            )}
          </div>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setInputMode('grams')}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
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
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
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
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
              inputMode === 'money'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Valor em R$ (Reais)
          </button>
        </div>

        {/* Interactive Input Fields based on Mode */}
        {inputMode === 'grams' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Quantidade em Gramas (g)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjustGrams(-50)}
                className="h-11 w-11 shrink-0 rounded-xl border border-border flex items-center justify-center hover:bg-muted font-bold text-base"
                title="-50g"
              >
                -50g
              </button>
              <Input
                type="number"
                step="10"
                min="1"
                value={gramsValue || ''}
                onChange={(e) => handleGramsChange(parseFloat(e.target.value) || 0)}
                className="h-11 text-center font-mono text-lg font-bold"
                placeholder="Ex: 150"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleAdjustGrams(50)}
                className="h-11 w-11 shrink-0 rounded-xl border border-border flex items-center justify-center hover:bg-muted font-bold text-base"
                title="+50g"
              >
                +50g
              </button>
            </div>
          </div>
        )}

        {inputMode === 'kg' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Quantidade em Quilos (kg)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjustGrams(-100)}
                className="h-11 w-11 shrink-0 rounded-xl border border-border flex items-center justify-center hover:bg-muted font-bold text-xs"
                title="-0,100kg"
              >
                -0,1kg
              </button>
              <Input
                type="number"
                step="0.005"
                min="0.001"
                value={kgValue || ''}
                onChange={(e) => handleKgChange(parseFloat(e.target.value) || 0)}
                className="h-11 text-center font-mono text-lg font-bold"
                placeholder="Ex: 0.150"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleAdjustGrams(100)}
                className="h-11 w-11 shrink-0 rounded-xl border border-border flex items-center justify-center hover:bg-muted font-bold text-xs"
                title="+0,100kg"
              >
                +0,1kg
              </button>
            </div>
          </div>
        )}

        {inputMode === 'money' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Quanto o cliente deseja gastar em R$? (Calcula o peso automaticamente)
            </label>
            <Input
              type="number"
              step="0.50"
              min="0.10"
              value={moneyValue || ''}
              onChange={(e) => handleMoneyChange(parseFloat(e.target.value) || 0)}
              className="h-11 text-center font-mono text-lg font-bold"
              placeholder="Ex: 5.00"
              autoFocus
            />
          </div>
        )}

        {/* Quick Weight Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Pesos Frequentes / Rápidos
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {COMMON_PRESETS.map((preset) => {
              const isSelected = Math.abs(gramsValue - preset.grams) < 1
              return (
                <button
                  key={preset.grams}
                  type="button"
                  onClick={() => handlePresetClick(preset.grams)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-11 sm:h-10"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto h-11 sm:h-10 font-semibold shadow-xs"
          >
            <Check className="h-4 w-4 mr-1.5" /> Confirmar {gramsValue >= 1000 ? `${kgValue} kg` : `${gramsValue}g`} ({formatCurrency(totalCalculated)})
          </Button>
        </div>
      </form>
    </Modal>
  )
}
