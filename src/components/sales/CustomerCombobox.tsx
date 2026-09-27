import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Check, X, Loader2 } from 'lucide-react'

import { customerService } from '@/services/customerService'
import type { Customer } from '@/types/customer.types'

interface CustomerComboboxProps {
  storeId: string
  value: string
  onChange: (customerId: string) => void
  disabled?: boolean
  className?: string
}

const RECENT_SAMPLE_SIZE = 5
const SEARCH_DEBOUNCE_MS = 250

function customerLabel(customer: Customer): string {
  return customer.document
    ? `${customer.name} (${customer.document})`
    : customer.name
}

function customerSubtitle(customer: Customer): string {
  const parts = [customer.phone, customer.email].filter(Boolean)
  return parts.join(' · ')
}

/**
 * Campo de cliente do PDV.
 *
 * Digitavel de verdade (o operator digita nome, CPF/CNPJ, telefone ou
 * e-mail) e, ao abrir sem digitacao, sugere os 5 clientes mais recentes
 * cadastrados na plataforma para não obrigar digitar do zero.
 *
 * Sem primitive de combobox no projeto, entao segue o mesmo padrao
 * hand-rolled do store switcher em AppLayout.tsx.
 */
export function CustomerCombobox({
  storeId,
  value,
  onChange,
  disabled = false,
  className = '',
}: CustomerComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [term, setTerm] = React.useState('')
  const [debouncedTerm, setDebouncedTerm] = React.useState('')
  const [selected, setSelected] = React.useState<Customer | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term])

  React.useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Amostra: os 5 clientes mais recentes. So e buscada quando o campo
  // esta aberto e sem busca ativa, para nao custar uma query no mount.
  const {
    data: recent = [],
    isFetching: loadingRecent,
  } = useQuery({
    queryKey: ['customers-recent'],
    queryFn: () => customerService.getRecentCustomers(RECENT_SAMPLE_SIZE),
    enabled: isOpen && !debouncedTerm,
    staleTime: 60 * 1000,
  })

  // Busca no servidor: precisa ser a loja ativa, senao o operador
  // poderia vincular a venda ao cliente de outra loja.
  const { data: searchData, isFetching: loadingSearch } = useQuery({
    queryKey: ['customers-search', storeId, debouncedTerm],
    queryFn: () => customerService.listCustomers(storeId, { search: debouncedTerm, pageSize: 8 }),
    enabled: isOpen && debouncedTerm.length >= 2 && Boolean(storeId),
    staleTime: 30 * 1000,
  })
  const matchRows = searchData?.data
  const matches = React.useMemo(() => matchRows || [], [matchRows])

  const isSearching = debouncedTerm.length >= 2
  const isLoading = isSearching ? loadingSearch : loadingRecent

  const suggestions = React.useMemo(() => {
    const term = debouncedTerm.toLowerCase()
    if (isSearching) {
      // Remove clientes ja escolhidos para nao sujar a lista.
      return matches.filter((c) => c.id !== value)
    }
    return recent.filter((c) =>
      term ? c.name.toLowerCase().includes(term) : true
    )
  }, [isSearching, matches, recent, debouncedTerm, value])

  // Reconcilia com resets externos (ex.: limpar o carrinho zera o cliente
  // no page pai). Feito durante o render em vez de num effect para nao
  // disparar um segundo render.
  //
  // Ignora a mudanca que o proprio componente acabou de fazer: handleSelect
  // chama onChange, o pai propaga o novo value, e sem este guarda a
  // reconciliacao rodava logo em seguida apagando selected/term -- o nome
  // escolhido sumia do campo. Id igual ao selecionado = o pai ecoando.
  const [syncedValue, setSyncedValue] = React.useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    const pickedByThisInput = selected !== null && selected.id === value
    if (!pickedByThisInput) {
      setSelected(null)
      setTerm('')
    }
  }

  const handleSelect = (customer: Customer) => {
    setSelected(customer)
    setTerm(customerLabel(customer))
    setIsOpen(false)
    onChange(customer.id)
  }

  const handleClear = () => {
    setSelected(null)
    setTerm('')
    setDebouncedTerm('')
    onChange('')
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTerm(e.target.value)
    setIsOpen(true)
    // Texto livre nao corresponde a nenhum cadastro ->|Consumidor Final.
    if (selected) {
      setSelected(null)
      onChange('')
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder="Consumidor Final (sem cadastro)"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full h-7 pl-8 pr-7 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        {term && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Limpar busca"
            aria-label="Limpar cliente"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {!isSearching && suggestions.length > 0 && (
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 bg-muted/40">
                Cadastros mais recentes
              </div>
            )}
            {isSearching && suggestions.length > 0 && (
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 bg-muted/40">
                {suggestions.length} resultado{suggestions.length === 1 ? '' : 's'}
              </div>
            )}

            {isLoading && suggestions.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
              </div>
            )}

            {!isLoading && suggestions.length === 0 && (
              <div className="px-3 py-3 text-[11px] text-muted-foreground">
                {isSearching
                  ? 'Nenhum cadastro encontrado. A venda seguirá como Consumidor Final.'
                  : 'Nenhum cliente cadastrado ainda.'}
              </div>
            )}

            {suggestions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-start gap-2"
              >
                <Check
                  className={`h-3 w-3 mt-0.5 shrink-0 ${
                    c.id === value ? 'text-primary' : 'text-transparent'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-foreground truncate">
                    {customerLabel(c)}
                  </span>
                  {customerSubtitle(c) && (
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {customerSubtitle(c)}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              handleClear()
              setIsOpen(false)
            }}
            className="w-full text-left px-3 py-2 border-t border-border bg-muted/30 hover:bg-muted/60 transition-colors text-[11px] text-muted-foreground"
          >
            Consumidor Final (sem cadastro)
          </button>
        </div>
      )}
    </div>
  )
}
