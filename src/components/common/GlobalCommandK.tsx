import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Package, Users, Truck, ShoppingBag, LayoutDashboard, X } from 'lucide-react'
import { useTenant } from '@/hooks/useTenant'
import { productService } from '@/services/productService'
import { customerService } from '@/services/customerService'
import { formatCurrency } from '@/utils/currency'

export function GlobalCommandK() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [products, setProducts] = React.useState<any[]>([])
  const [customers, setCustomers] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const { storeId, hasActiveStore } = useTenant()
  const navigate = useNavigate()

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Perform search
  React.useEffect(() => {
    if (!isOpen || !hasActiveStore || !query.trim() || query.length < 2) {
      setProducts([])
      setCustomers([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const [prodRes, custRes] = await Promise.all([
          productService.listProducts(storeId, { search: query, pageSize: 5 }),
          customerService.listCustomers(storeId, query),
        ])
        setProducts(prodRes.data)
        setCustomers(custRes.slice(0, 5))
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, isOpen, storeId, hasActiveStore])

  const handleSelect = (path: string) => {
    setIsOpen(false)
    setQuery('')
    navigate(path)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-surface-elevated">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Pesquisar produtos por nome, SKU, barcode ou clientes... (ESC para fechar)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground text-foreground"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-border/40">
          {isLoading && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Buscando registros...
            </div>
          )}

          {/* Navigation Quick Links */}
          {!query && (
            <div className="p-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                Navegação Rápida
              </span>
              <div className="grid grid-cols-2 gap-1 mt-2">
                <button
                  onClick={() => handleSelect('/dashboard')}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs hover:bg-muted text-foreground transition-colors text-left"
                >
                  <LayoutDashboard className="h-4 w-4 text-primary" /> Dashboard
                </button>
                <button
                  onClick={() => handleSelect('/products')}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs hover:bg-muted text-foreground transition-colors text-left"
                >
                  <Package className="h-4 w-4 text-primary" /> Produtos
                </button>
                <button
                  onClick={() => handleSelect('/sales')}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs hover:bg-muted text-foreground transition-colors text-left"
                >
                  <ShoppingBag className="h-4 w-4 text-primary" /> Nova Venda (PDV)
                </button>
                <button
                  onClick={() => handleSelect('/customers')}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs hover:bg-muted text-foreground transition-colors text-left"
                >
                  <Users className="h-4 w-4 text-primary" /> Clientes
                </button>
              </div>
            </div>
          )}

          {/* Products Results */}
          {products.length > 0 && (
            <div className="p-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                Produtos Encontrados
              </span>
              <div className="space-y-1 mt-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(`/products`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-primary/10 text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          SKU: {p.sku} {p.barcode && `| EAN: ${p.barcode}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">{formatCurrency(p.selling_price)}</div>
                      <div className="text-[11px] text-muted-foreground">Estoque: {p.stock_quantity}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customers Results */}
          {customers.length > 0 && (
            <div className="p-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                Clientes
              </span>
              <div className="space-y-1 mt-1">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(`/customers`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-primary/10 text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground">{c.phone || c.email || 'Sem contato'}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && !isLoading && products.length === 0 && customers.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhum resultado encontrado para &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
