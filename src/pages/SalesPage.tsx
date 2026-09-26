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
  Users
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
  const { data: productsData } = useQuery({
    queryKey: ['products-pos', storeId, search],
    queryFn: () => productService.listProducts(storeId, { search, pageSize: 20 }),
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

  // Calculate totals
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
      setCart([])
      setDiscountTotal(0)
      setNotes('')
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
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Frente de Caixa (PDV)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Lançamento rápido de vendas com baixa automática de estoque
          </p>
        </div>
      </div>

      {successOrderNumber && (
        <div className="p-4 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-between animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Venda {successOrderNumber} Concluída com Sucesso!
              </h3>
              <p className="text-xs text-muted-foreground">
                Estoque atualizado e comprovante gerado.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSuccessOrderNumber(null)}
          >
            Nova Venda
          </Button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Search & Quick Picker */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <Input
                placeholder="Buscar por nome do produto, SKU ou código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                autoFocus
              />
            </CardHeader>
            <CardContent className="max-h-[520px] overflow-y-auto p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map((p) => {
                  const stock = p.stock_quantity ?? 0
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={stock <= 0}
                      className={`p-3 rounded-xl border border-border text-left transition-all flex flex-col justify-between ${
                        stock <= 0
                          ? 'opacity-50 cursor-not-allowed bg-muted/20'
                          : 'bg-surface hover:border-primary/60 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-foreground line-clamp-1">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          SKU: {p.sku}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                        <span className="font-bold text-xs text-primary font-mono">
                          {formatCurrency(p.selling_price)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Est: <b>{stock}</b> {p.unit}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Cart & Checkout */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="flex flex-col h-full border-primary/20">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Carrinho da Venda</span>
                <Badge variant="default">{cart.length} itens</Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px]">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Selecione os produtos ao lado para iniciar a venda.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {cart.map((item) => (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between">
                      <div className="max-w-[170px]">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {formatCurrency(item.unitPrice)} cada
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-muted-foreground hover:text-danger ml-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Checkout Options */}
            <div className="p-4 border-t border-border bg-surface-elevated space-y-3 rounded-b-xl">
              {/* Customer Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Cliente (Opcional)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
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
                <label className="text-[11px] font-medium text-muted-foreground">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-1.5">
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
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {pm.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="pt-2 border-t border-border/60 space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-base text-foreground pt-1 border-t border-border">
                  <span>Total a Pagar</span>
                  <span className="font-mono text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                className="w-full h-11 text-sm font-bold shadow-lg shadow-primary/25"
                disabled={cart.length === 0}
                isLoading={saleMutation.isPending}
                onClick={handleCheckout}
              >
                Finalizar Venda & Baixar Estoque
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
