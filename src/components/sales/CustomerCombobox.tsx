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

const RECENT_SAMPLE_SIZE = 3
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
 * e-mail) e, ao abrir sem digitacao, sugere os 3 clientes mais recentes
 * cadastrados na plataforma para caber perfeitamente na visualização.
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
  const [openUpwards, setOpenUpwards] = React.useState(false)
  const [term, setTerm] = React.useState('')
  const [debouncedTerm, setDebouncedTerm] = React.useState('')
  const [selected, setSelected] = React.useState<Customer | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      // Se houver menos de 220px abaixo do input, abre para cima para garantir visibilidade total
      setOpenUpwards(spaceBelow < 220)
    }
  }, [isOpen])

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

  // Busca os dados do cliente selecionado caso value mude externamente (ex: cadastrado via modal rápido)
  const { data: selectedCustomerData } = useQuery({
    queryKey: ['customer-by-id', value],
    queryFn: () => customerService.getCustomer(value),
    enabled: Boolean(value),
    staleTime: 60 * 1000,
  })

  // Reconcilia com resets ou seleções externas
  const [syncedValue, setSyncedValue] = React.useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (!value) {
      setSelected(null)
      setTerm('')
    }
  }

  React.useEffect(() => {
    if (value && selectedCustomerData) {
      setSelected(selectedCustomerData)
      setTerm(customerLabel(selectedCustomerData))
    } else if (!value) {
      setSelected(null)
      setTerm('')
    }
  }, [value, selectedCustomerData])

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
          placeholder="Cliente Genérico (padrão se não informado)"
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
        <div
          className={`absolute left-0 right-0 z-50 rounded-lg border border-border bg-popover shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <div className="max-h-48 overflow-y-auto custom-scrollbar overscroll-contain">
            {!isSearching && suggestions.length > 0 && (
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 bg-muted/40 sticky top-0 z-10 backdrop-blur-xs flex items-center justify-between">
                <span>Últimos {suggestions.length} clientes</span>
              </div>
            )}
            {isSearching && suggestions.length > 0 && (
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 bg-muted/40 sticky top-0 z-10 backdrop-blur-xs">
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
                  ? 'Nenhum cadastro encontrado. O pedido usará Cliente Genérico.'
                  : 'Nenhum cliente cadastrado ainda. O pedido criará Cliente Genérico.'}
              </div>
            )}

            {suggestions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-start gap-2 cursor-pointer"
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
            className="w-full text-left px-3 py-2 border-t border-border bg-muted/30 hover:bg-muted/60 transition-colors text-[11px] text-muted-foreground cursor-pointer"
          >
            Cliente Genérico (padrão sem identificação)
          </button>
        </div>
      )}
    </div>
  )
}
