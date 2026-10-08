import * as React from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { orderService } from '@/services/orderService'
import { useTenant } from '@/hooks/useTenant'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatCurrency } from '@/utils/currency'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { CustomerCombobox } from '@/components/sales/CustomerCombobox'
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
  AlertTriangle,
  EyeOff,
  Scale,
} from 'lucide-react'
import { WeightInputModal } from '@/components/sales/WeightInputModal'
import type { PaymentMethod } from '@/types/database.types'
import type { Product } from '@/types/product.types'
import type { POSStockFilter } from '@/services/productService'

export const isWeighedProduct = (product: Product | { unit?: string | null }): boolean => {
  const unit = (product?.unit || '').trim().toUpperCase()
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

interface CartLine {
  product: Product
  quantity: number
  unitPrice: number
  discount: number
}

const STOCK_VIEW_OPTIONS: { value: POSStockFilter; label: string }[] = [
  { value: 'in', label: 'Com estoque' },
  { value: 'all', label: 'Todos' },
  { value: 'out', label: 'Zerados' },
]

export function SalesPage() {
  const { storeId, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()

  const {
    page,
    pageSize,
    search,
    setPage,
    setPageSize,
    setSearch,
    filters,
    setFilter,
  } = useTablePagination({
    defaultPageSize: 24,
    defaultFilters: { stock: 'in' },
  })

  const stockView = (filters.stock as POSStockFilter) || 'in'
  const categoryFilter = filters.category || ''

  const [cart, setCart] = React.useState<CartLine[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>('')
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('PIX')
  const [discountTotal, setDiscountTotal] = React.useState<number>(0)
  const [notes, setNotes] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successOrderNumber, setSuccessOrderNumber] = React.useState<string | null>(null)
  const [weighedProduct, setWeighedProduct] = React.useState<Product | null>(null)
  const [weighedInitialQty, setWeighedInitialQty] = React.useState<number>(0.15)

  // Categorias: alimentam o filtro do grid do PDV.
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => productService.listCategories(storeId),
    enabled: Boolean(hasActiveStore),
    staleTime: 60 * 1000,
  })

  // Produtos do PDV. `staleTime: 0` + `refetchOnMount` garante que cada
  // troca de pagina valide contra o banco - o operador precisa ver o saldo
  // real, nao um cache de 5 minutos. `keepPreviousData` evita a tela
  // piscar enquanto a proxima pagina carrega.
  const {
    data: productsData,
    isLoading: loadingProducts,
    isFetching: fetchingProducts,
  } = useQuery({
    queryKey: [
      'products-pos',
      storeId,
      { search, page, pageSize, stock: stockView, categoryFilter },
    ],
    queryFn: () =>
      productService.listProductsForPOS(storeId, {
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        stock: stockView,
        page,
        pageSize,
      }),
    enabled: Boolean(hasActiveStore),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: true,
  })

  const productRows = productsData?.data
  const products = React.useMemo(() => productRows || [], [productRows])
  const totalProducts = productsData?.total || 0
  const totalPages = Math.ceil(totalProducts / pageSize) || 1

  // Saldos publicados pela listagem atual, para bloquear a venda de
  // quantidade maior que o disponivel sem depender do item do carrinho.
  const stockByProduct = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products) map.set(p.id, Number(p.stock_quantity ?? 0))
    return map
  }, [products])

  // Add to cart
  const addToCart = (product: Product) => {
    const available = stockByProduct.get(product.id) ?? Number(product.stock_quantity ?? 0)
    if (available <= 0) {
      setErrorMsg(`"${product.name}" está sem estoque disponível.`)
      return
    }

    // Se o produto é vendido por peso (KG), abrir modal de pesagem/gramatura
    if (isWeighedProduct(product)) {
      const existing = cart.find((i) => i.product.id === product.id)
      setWeighedInitialQty(existing ? existing.quantity : 0.15)
      setWeighedProduct(product)
      return
    }

    const existing = cart.find((i) => i.product.id === product.id)
    if (existing) {
      if (existing.quantity + 1 > available) {
        setErrorMsg(
          `Estoque insuficiente para "${product.name}". Disponível: ${available}.`
        )
        return
      }
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

  const handleConfirmWeight = (quantityInKg: number) => {
    if (!weighedProduct) return
    const available = stockByProduct.get(weighedProduct.id) ?? Number(weighedProduct.stock_quantity ?? 0)
    if (quantityInKg > available) {
      setErrorMsg(`Estoque insuficiente para "${weighedProduct.name}". Disponível: ${available} kg.`)
      return
    }

    const existingIndex = cart.findIndex((i) => i.product.id === weighedProduct.id)
    if (existingIndex >= 0) {
      setCart(
        cart.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: quantityInKg } : item
        )
      )
    } else {
      setCart([
        ...cart,
        {
          product: weighedProduct,
          quantity: quantityInKg,
          unitPrice: Number(weighedProduct.selling_price),
          discount: 0,
        },
      ])
    }
    setWeighedProduct(null)
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const isWeighed = isWeighedProduct(i.product)
            const step = isWeighed ? (Math.abs(delta) < 1 ? delta : delta > 0 ? 0.05 : -0.05) : delta
            const newQ = Number((i.quantity + step).toFixed(3))
            if (newQ <= 0.005) return null
            // Teto por linha: o saldo atual do produto, ou o saldo
            // publicado na pagina quando o item nao esta mais visivel.
            const available = stockByProduct.get(productId) ?? Number(i.product.stock_quantity ?? 0)
            if (newQ > available) {
              setErrorMsg(
                `Estoque insuficiente. Disponível para "${i.product.name}": ${available}${isWeighed ? ' kg' : ''}.`
              )
              return i
            }
            return { ...i, quantity: newQ }
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
      // O grid do PDV le o saldo; sem invalidar, continuaria mostrando a
      // quantidade antiga ate a proxima revalidacao.
      queryClient.invalidateQueries({ queryKey: ['products-pos', storeId] })
      setSuccessOrderNumber(order.order_number)
      clearCart()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const handleCheckout = () => {
    if (cart.length === 0) return
    setErrorMsg(null)

    // Guarda de cliente: o saldo pode ter mudado desde que o item entrou
    // no carrinho (outro PDV, recebimento, baixa). O RPC do banco tambem
    // valida, mas chegar la deixa o operador com o carrinho intacto e
    // apenas a mensagem de erro.
    const shortages = cart
      .map((line) => {
        const available = stockByProduct.get(line.product.id) ?? Number(line.product.stock_quantity ?? 0)
        return { name: line.product.name, requested: line.quantity, available }
      })
      .filter((s) => s.requested > s.available)

    if (shortages.length > 0) {
      setErrorMsg(
        `Estoque insuficiente para: ${shortages
          .map((s) => `${s.name} (pedido ${s.requested}, disponível ${s.available})`)
          .join('; ')}.`
      )
      return
    }

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
            <CardHeader className="py-2.5 px-3 border-b border-border/60 flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">Catálogo de Produtos</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                  {totalProducts} {totalProducts === 1 ? 'produto' : 'produtos'}
                </Badge>
                {fetchingProducts && !loadingProducts && (
                  <span className="text-[10px] text-muted-foreground">validando...</span>
                )}
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Limpar busca
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Visibilidade do estoque: com estoque primeiro, o resto
                    escondido mas acessivel pela mesma paginacao por URL. */}
                <div className="inline-flex rounded-lg border border-border overflow-hidden">
                  {STOCK_VIEW_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilter('stock', opt.value)}
                      aria-pressed={stockView === opt.value}
                      className={`px-2.5 h-7 text-[11px] font-medium transition-colors inline-flex items-center gap-1 ${
                        stockView === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {opt.value === 'out' && <EyeOff className="h-3 w-3" />}
                      {opt.label}
                    </button>
                  ))}
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setFilter('category', e.target.value)}
                  aria-label="Filtrar por categoria"
                  className="h-7 px-2 rounded-lg border border-input bg-background text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="">Todas Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
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
                    const stock = Number(p.stock_quantity ?? 0)
                    const inCart = cart.find((i) => i.product.id === p.id)
                    const inCartQty = inCart?.quantity ?? 0
                    const isOutOfStock = stock <= 0
                    // Ja atingiu o saldo disponivel: nao deixa passar.
                    const atStockLimit = !isOutOfStock && inCartQty >= stock
                    const isWeighed = isWeighedProduct(p)

                    return (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        disabled={isOutOfStock || atStockLimit}
                        title={
                          isOutOfStock
                            ? 'Sem estoque disponível'
                            : atStockLimit
                              ? `Todo o estoque disponível (${stock}${isWeighed ? ' kg' : ''}) já está no carrinho`
                              : isWeighed
                                ? 'Clique para pesar / definir quantidade em gramas/kg'
                                : undefined
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between group relative ${
                          isOutOfStock || atStockLimit
                            ? 'opacity-40 cursor-not-allowed bg-muted/20 border-border/40'
                            : inCart
                            ? 'bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20'
                            : 'bg-surface hover:border-primary/50 hover:shadow-xs border-border'
                        }`}
                      >
                        {inCart && (
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold font-mono flex items-center gap-0.5">
                            {isWeighed ? (inCartQty >= 1 ? `${inCartQty}kg` : `${Math.round(inCartQty * 1000)}g`) : `${inCartQty}x`}
                          </div>
                        )}

                        <div>
                          <div className="font-semibold text-xs text-foreground line-clamp-1 pr-6">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              {p.sku || p.barcode || 'Sem SKU'}
                            </span>
                            {isWeighed && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30 font-bold shrink-0">
                                <Scale className="h-2.5 w-2.5 mr-0.5" /> KG
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-border/50">
                          <span className="font-bold text-xs text-primary font-mono">
                            {formatCurrency(p.selling_price)}{isWeighed ? '/kg' : ''}
                          </span>
                          <span
                            className={`text-[10px] inline-flex items-center gap-0.5 ${
                              stock <= 0
                                ? 'text-danger font-semibold'
                                : stock <= 3
                                  ? 'text-amber-500 font-semibold'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {stock <= 0 && <AlertTriangle className="h-2.5 w-2.5" />}
                            Est: {isWeighed ? `${stock} kg` : stock}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>

            <div className="p-2 border-t border-border bg-surface flex-shrink-0">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalProducts}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[12, 24, 48, 96]}
              />
            </div>
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
                  {cart.length} {cart.length === 1 ? 'item' : 'itens'}
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
                  {cart.map((item) => {
                    const available = stockByProduct.get(item.product.id) ?? Number(item.product.stock_quantity ?? 0)
                    const isWeighed = isWeighedProduct(item.product)
                    const atLimit = item.quantity >= available
                    const lineTotal = item.quantity * item.unitPrice
                    const formattedWeight = item.quantity >= 1 ? `${item.quantity} kg` : `${Math.round(item.quantity * 1000)}g`

                    return (
                      <div
                        key={item.product.id}
                        className="py-1.5 px-1 flex items-center justify-between gap-2 hover:bg-muted/30 rounded-lg transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <div className="font-semibold text-xs text-foreground truncate">
                              {item.product.name}
                            </div>
                            {isWeighed && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/20 shrink-0">
                                KG
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground">{formatCurrency(lineTotal)}</span>
                            <span className="text-[10px] text-muted-foreground">
                              ({formatCurrency(item.unitPrice)}{isWeighed ? '/kg' : ' un'})
                            </span>
                            {atLimit && (
                              <span className="text-amber-500 font-semibold text-[10px]">
                                · máx {available}{isWeighed ? ' kg' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isWeighed ? (
                            <>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, -0.05)}
                                aria-label={`Diminuir ${item.product.name}`}
                                className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="-50g"
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWeighedProduct(item.product)
                                  setWeighedInitialQty(item.quantity)
                                }}
                                className="px-1.5 h-6 rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-mono font-bold text-xs flex items-center gap-0.5 transition-colors cursor-pointer"
                                title="Clique para pesar / alterar gramas"
                              >
                                <Scale className="h-3 w-3" />
                                {formattedWeight}
                              </button>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, 0.05)}
                                disabled={atLimit}
                                aria-label={`Aumentar ${item.product.name}`}
                                title={atLimit ? `Estoque disponível: ${available} kg` : '+50g'}
                                className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, -1)}
                                aria-label={`Diminuir ${item.product.name}`}
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
                                disabled={atLimit}
                                aria-label={`Aumentar ${item.product.name}`}
                                title={atLimit ? `Estoque disponível: ${available}` : undefined}
                                className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            aria-label={`Remover ${item.product.name}`}
                            className="p-1 text-muted-foreground hover:text-danger ml-0.5 cursor-pointer transition-colors"
                            title="Remover item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
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
                <CustomerCombobox
                  storeId={storeId}
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                />
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

      <WeightInputModal
        isOpen={Boolean(weighedProduct)}
        onClose={() => setWeighedProduct(null)}
        product={weighedProduct}
        initialQuantity={weighedInitialQty}
        maxAvailable={
          weighedProduct
            ? (stockByProduct.get(weighedProduct.id) ?? Number(weighedProduct.stock_quantity ?? 0))
            : undefined
        }
        onConfirm={handleConfirmWeight}
      />
    </div>
  )
}
