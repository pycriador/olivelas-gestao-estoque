import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { customerService } from '@/services/customerService'
import { orderService } from '@/services/orderService'
import { useTenant } from '@/hooks/useTenant'
import { formatCurrency } from '@/utils/currency'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
  Users,
  Package,
  RotateCcw,
} from 'lucide-react'
import type { PaymentMethod } from '@/types/database.types'
import type { Product } from '@/types/product.types'

interface CartLine {
  product: Product
  quantity: number
  unitPrice: number
  discount: number
}

export function SalesPage() {
  const { storeId, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState('')
  const [cart, setCart] = React.useState<CartLine[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>('')
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('PIX')
  const [discountTotal, setDiscountTotal] = React.useState<number>(0)
  const [notes, setNotes] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successOrderNumber, setSuccessOrderNumber] = React.useState<string | null>(null)

  // Fetch available products
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-pos', storeId, search],
    queryFn: () => productService.listProducts(storeId, { search, pageSize: 50 }),
    enabled: Boolean(hasActiveStore),
  })

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers-pos', storeId],
    queryFn: () => customerService.listCustomers(storeId, { pageSize: 500 }),
    enabled: Boolean(hasActiveStore),
  })

  const customers = customersData?.data || []
  const products = productsData?.data || []

  // Add to cart
  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.product.id === product.id)
    if (existing) {
      setCart(
        cart.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      )
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: Number(product.selling_price),
          discount: 0,
        },
      ])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const newQ = i.quantity + delta
            return newQ > 0 ? { ...i, quantity: newQ } : null
          }
          return i
        })
        .filter(Boolean) as CartLine[]
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setDiscountTotal(0)
    setNotes('')
    setSelectedCustomerId('')
  }

  // Calculate totals
  const totalItemCount = cart.reduce((acc, i) => acc + i.quantity, 0)
  const subtotal = cart.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0)
  const total = Math.max(0, subtotal - discountTotal)

  // Sale mutation
  const saleMutation = useMutation({
    mutationFn: () =>
      orderService.createOrder({
        storeId,
        customerId: selectedCustomerId || undefined,
        channel: 'IN_STORE',
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unitCost: Number(i.product.cost_price),
          discount: i.discount,
        })),
        discountAmount: discountTotal,
        paymentMethod,
        notes: notes || undefined,
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      setSuccessOrderNumber(order.order_number)
      clearCart()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const handleCheckout = () => {
    if (cart.length === 0) return
    setErrorMsg(null)
    setSuccessOrderNumber(null)
    saleMutation.mutate()
  }

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader title="Frente de Caixa (PDV)">
        <Input
          placeholder="Buscar produto por nome, SKU, código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {successOrderNumber && (
        <div className="p-3 rounded-xl bg-success/15 border border-success/30 flex items-center justify-between animate-in zoom-in-95 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-foreground">
                Venda #{successOrderNumber} Concluída com Sucesso!
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Estoque atualizado e comprovante registrado.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSuccessOrderNumber(null)}
          >
            Nova Venda
          </Button>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex-shrink-0">
          {errorMsg}
        </div>
      )}

      {/* Main POS Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* Left Column: Products Grid (8 cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 h-full overflow-hidden">
          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
            <CardHeader className="py-2.5 px-3 border-b border-border/60 flex flex-row items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Catálogo de Produtos</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                  {products.length} itens disponíveis
                </Badge>
              </div>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Limpar busca
                </button>
              )}
            </CardHeader>

            <CardContent className="p-2.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {loadingProducts ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Carregando produtos...
                </div>
              ) : products.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <EmptyState
                    icon={<Package className="h-9 w-9 text-muted-foreground" />}
                    title="Nenhum produto encontrado"
                    description={
                      search
                        ? 'Nenhum resultado para a busca. Tente outro termo.'
                        : 'Cadastre produtos para iniciar as vendas pelo PDV.'
                    }
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                  {products.map((p) => {
                    const stock = p.stock_quantity ?? 0
                    const inCart = cart.find((i) => i.product.id === p.id)
                    const isOutOfStock = stock <= 0

                    return (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        disabled={isOutOfStock}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between group relative ${
                          isOutOfStock
                            ? 'opacity-40 cursor-not-allowed bg-muted/20 border-border/40'
                            : inCart
                            ? 'bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20'
                            : 'bg-surface hover:border-primary/50 hover:shadow-xs border-border'
                        }`}
                      >
                        {inCart && (
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold font-mono">
                            {inCart.quantity}x
                          </div>
                        )}

                        <div>
                          <div className="font-semibold text-xs text-foreground line-clamp-1 pr-6">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                            {p.sku || p.barcode || 'Sem SKU'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-border/50">
                          <span className="font-bold text-xs text-primary font-mono">
                            {formatCurrency(p.selling_price)}
                          </span>
                          <span
                            className={`text-[10px] ${
                              stock <= 3 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'
                            }`}
                          >
                            Est: {stock}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sleek Compact Cart & Checkout (4 cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col min-h-0 h-full overflow-hidden">
          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
            {/* Compact Cart Header */}
            <CardHeader className="py-2.5 px-3 border-b border-border/60 flex flex-row items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-bold">Carrinho</CardTitle>
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'}
                </Badge>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[10px] text-muted-foreground hover:text-danger inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Limpar carrinho"
                >
                  <RotateCcw className="h-3 w-3" /> Limpar
                </button>
              )}
            </CardHeader>

            {/* Cart Items List */}
            <CardContent className="p-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground px-4">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="font-medium text-foreground">Carrinho vazio</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Toque nos produtos ao lado para adicionar à venda.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="py-1.5 px-1 flex items-center justify-between gap-2 hover:bg-muted/30 rounded-lg transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {formatCurrency(item.unitPrice)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-muted-foreground hover:text-danger ml-0.5 cursor-pointer transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Compact Checkout Summary & Actions Footer */}
            <div className="p-3 border-t border-border bg-surface-elevated/80 flex-shrink-0 space-y-2.5">
              {/* Customer Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Users className="h-3 w-3" /> Cliente
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full h-7 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="">Consumidor Final (Sem cadastro)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.document ? `(${c.document})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Methods */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Pagamento
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'PIX', label: 'PIX', icon: QrCode },
                    { id: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard },
                    { id: 'CASH', label: 'Dinheiro', icon: Banknote },
                  ].map((pm) => {
                    const Icon = pm.icon
                    const isSelected = paymentMethod === pm.id
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                        className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-background border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-3 w-3" /> {pm.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="pt-1.5 border-t border-border/60 space-y-1 text-xs">
                <div className="flex justify-between items-baseline font-bold text-sm text-foreground">
                  <span>Total a Pagar</span>
                  <span className="font-mono text-base font-extrabold text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-9 text-xs font-bold shadow-md shadow-primary/20"
                disabled={cart.length === 0}
                isLoading={saleMutation.isPending}
                onClick={handleCheckout}
              >
                Finalizar Venda
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
