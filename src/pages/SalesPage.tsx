import * as React from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { orderService } from '@/services/orderService'
import { useTenant } from '@/hooks/useTenant'
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
import { CustomerQuickCreateModal } from '@/components/sales/CustomerQuickCreateModal'
import { AiModuleInsightCard } from '@/components/ai/AiModuleInsightCard'
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
  UserPlus,
  Package,
  RotateCcw,
  AlertTriangle,
  EyeOff,
  Scale,
  Edit3,
} from 'lucide-react'
import { WeightInputModal } from '@/components/sales/WeightInputModal'
import { isWeighedProduct, formatProductWeight } from '@/utils/productUtils'
import { toast } from 'sonner'
import type { PaymentMethod } from '@/types/database.types'
import type { Product } from '@/types/product.types'
import type { POSStockFilter } from '@/services/productService'

export { isWeighedProduct, formatProductWeight }

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

interface SavedPosFilters {
  stock?: POSStockFilter
  category?: string
  search?: string
  pageSizeMobile?: number
  pageSizeDesktop?: number
}

const POS_FILTERS_STORAGE_KEY = 'olivelas_pos_filters_v1'

function loadSavedPosFilters(): SavedPosFilters {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(POS_FILTERS_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SavedPosFilters
  } catch {
    return {}
  }
}

function savePosFilters(next: SavedPosFilters) {
  if (typeof window === 'undefined') return
  try {
    const current = loadSavedPosFilters()
    window.localStorage.setItem(
      POS_FILTERS_STORAGE_KEY,
      JSON.stringify({ ...current, ...next })
    )
  } catch {
    // ignore storage errors
  }
}

export function SalesPage() {
  const { storeId, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [isMobileView, setIsMobileView] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  )

  const initialSaved = React.useMemo(() => loadSavedPosFilters(), [])

  const [page, setPageState] = React.useState<number>(() => {
    const p = parseInt(searchParams.get('page') || '1', 10)
    return Number.isFinite(p) && p > 0 ? p : 1
  })

  const [pageSize, setPageSizeState] = React.useState<number>(() => {
    const urlSize = parseInt(searchParams.get('pageSize') || '', 10)
    const mobile = typeof window !== 'undefined' && window.innerWidth < 1024
    if (mobile) {
      return initialSaved.pageSizeMobile || 5
    }
    if (Number.isFinite(urlSize) && urlSize > 0) return urlSize
    return initialSaved.pageSizeDesktop || 24
  })

  const [search, setSearchState] = React.useState<string>(
    () => searchParams.get('search') ?? initialSaved.search ?? ''
  )
  const [stockView, setStockViewState] = React.useState<POSStockFilter>(() => {
    const urlStock = searchParams.get('stock') as POSStockFilter | null
    if (urlStock === 'in' || urlStock === 'all' || urlStock === 'out') {
      return urlStock
    }
    if (
      initialSaved.stock === 'in' ||
      initialSaved.stock === 'all' ||
      initialSaved.stock === 'out'
    ) {
      return initialSaved.stock
    }
    return 'in'
  })
  const [categoryFilter, setCategoryFilterState] = React.useState<string>(
    () => searchParams.get('category') ?? initialSaved.category ?? ''
  )

  // Ajusta automaticamente para 5 itens ao entrar na visão mobile (< 1024px) e 24 no desktop
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 1023px)')
    const handleViewportChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches
      setIsMobileView(mobile)
      const saved = loadSavedPosFilters()
      setPageSizeState(mobile ? saved.pageSizeMobile || 5 : saved.pageSizeDesktop || 24)
      setPageState(1)
    }
    mql.addEventListener('change', handleViewportChange)
    return () => mql.removeEventListener('change', handleViewportChange)
  }, [])

  // Sincroniza filtros salvos com a URL sem perder parâmetros como editOrder
  const syncUrlParams = React.useCallback(
    (updates: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          Object.entries(updates).forEach(([k, v]) => {
            if (!v) next.delete(k)
            else next.set(k, v)
          })
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const setPage = React.useCallback(
    (nextPage: number) => {
      setPageState(nextPage)
      syncUrlParams({ page: nextPage > 1 ? String(nextPage) : null })
    },
    [syncUrlParams]
  )

  const setPageSize = React.useCallback(
    (nextSize: number) => {
      setPageSizeState(nextSize)
      setPageState(1)
      if (isMobileView) {
        savePosFilters({ pageSizeMobile: nextSize })
      } else {
        savePosFilters({ pageSizeDesktop: nextSize })
      }
      syncUrlParams({ pageSize: String(nextSize), page: null })
    },
    [isMobileView, syncUrlParams]
  )

  const setSearch = React.useCallback(
    (nextSearch: string) => {
      setSearchState(nextSearch)
      setPageState(1)
      savePosFilters({ search: nextSearch })
      syncUrlParams({ search: nextSearch || null, page: null })
    },
    [syncUrlParams]
  )

  const setFilter = React.useCallback(
    (key: 'stock' | 'category', value: string) => {
      setPageState(1)
      if (key === 'stock') {
        const nextStock = (value as POSStockFilter) || 'in'
        setStockViewState(nextStock)
        savePosFilters({ stock: nextStock })
        syncUrlParams({ stock: nextStock, page: null })
      } else if (key === 'category') {
        setCategoryFilterState(value)
        savePosFilters({ category: value })
        syncUrlParams({ category: value || null, page: null })
      }
    },
    [syncUrlParams]
  )

  const [cart, setCart] = React.useState<CartLine[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>('')
  const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false)
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('PIX')
  const [discountTotal, setDiscountTotal] = React.useState<number>(0)
  const [notes, setNotes] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successOrderNumber, setSuccessOrderNumber] = React.useState<string | null>(null)
  const [weighedProduct, setWeighedProduct] = React.useState<Product | null>(null)
  const [weighedInitialQty, setWeighedInitialQty] = React.useState<number>(0.15)

  const [editingOrderInfo, setEditingOrderInfo] = React.useState<{
    id: string
    orderNumber: string
  } | null>(null)
  const [loadedEditOrderId, setLoadedEditOrderId] = React.useState<string | null>(null)

  const editOrderIdParam = searchParams.get('editOrder')

  // Se veio parâmetro editOrder pela URL sem state, busca o pedido via getOrder
  const { data: fetchedEditOrder } = useQuery({
    queryKey: ['order-for-edit', editOrderIdParam],
    queryFn: () => orderService.getOrder(editOrderIdParam!),
    enabled: Boolean(editOrderIdParam) && !(location.state as any)?.editOrder,
  })

  // Carrega os dados do pedido a ser editado
  React.useEffect(() => {
    const rawOrder = (location.state as any)?.editOrder || fetchedEditOrder
    if (!storeId || !rawOrder || !rawOrder.id || rawOrder.id === loadedEditOrderId) return

    setLoadedEditOrderId(rawOrder.id)
    setEditingOrderInfo({
      id: rawOrder.id,
      orderNumber: rawOrder.orderNumber || rawOrder.order_number,
    })

    // Pré-seleciona cliente
    setSelectedCustomerId(rawOrder.customerId || rawOrder.customer_id || '')

    // Descontos, observações e forma de pagamento
    setDiscountTotal(Number(rawOrder.discountAmount ?? rawOrder.discount_amount ?? 0))
    setNotes(rawOrder.notes || `Ref. Edição do pedido ${rawOrder.orderNumber || rawOrder.order_number}`)
    if (rawOrder.paymentMethod) {
      setPaymentMethod(rawOrder.paymentMethod)
    } else if (rawOrder.payments?.[0]?.method) {
      setPaymentMethod(rawOrder.payments[0].method)
    }

    // Carrega os itens no carrinho
    const rawItems = rawOrder.items || []
    if (rawItems.length > 0) {
      const initialCart: CartLine[] = rawItems.map((it: any) => {
        const prod = it.product
        const currentSellingPrice =
          typeof prod?.selling_price === 'number' && prod.selling_price > 0
            ? Number(prod.selling_price)
            : Number(it.unitPrice || it.unit_price || 0)
        const itemQty = Number(it.quantity || 1)
        const initialStock = Math.max(Number(prod?.stock_quantity ?? 0), itemQty)

        return {
          product: {
            ...(prod || {
              id: it.productId || it.product_id,
              name: it.productName || it.product_name || 'Produto',
              sku: it.productSku || it.product_sku || '',
              selling_price: currentSellingPrice,
              cost_price: Number(it.unitCost ?? it.unit_cost ?? 0),
              unit: it.unit || 'UN',
            }),
            stock_quantity: initialStock,
          } as Product,
          quantity: itemQty,
          unitPrice: currentSellingPrice,
          discount: Number(it.discount || 0),
        }
      })
      setCart(initialCart)

      // Atualiza com os saldos e preços vigentes dos produtos no estoque
      const itemIds = rawItems.map((i: any) => i.productId || i.product_id).filter(Boolean)
      productService
        .getProductsByIds(storeId, itemIds)
        .then((freshProducts) => {
          const freshMap = new Map(freshProducts.map((p) => [p.id, p]))
          setCart((prevCart) =>
            prevCart.map((line) => {
              const fresh = freshMap.get(line.product.id)
              if (fresh) {
                const updatedPrice =
                  typeof fresh.selling_price === 'number' && fresh.selling_price > 0
                    ? Number(fresh.selling_price)
                    : line.unitPrice
                const effectiveStock = Math.max(
                  Number(fresh.stock_quantity ?? 0),
                  line.quantity
                )
                return {
                  ...line,
                  product: {
                    ...fresh,
                    stock_quantity: effectiveStock,
                  },
                  unitPrice: updatedPrice,
                }
              }
              return line
            })
          )
        })
        .catch(() => {})
    }
  }, [location.state, fetchedEditOrder, loadedEditOrderId, storeId])

  const handleDiscardEdit = () => {
    clearCart()
    setEditingOrderInfo(null)
    setLoadedEditOrderId(null)
    setSearchParams({}, { replace: true })
    navigate('/orders', { replace: true })
  }

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
    for (const item of cart) {
      const cartStock = Number(item.product.stock_quantity ?? 0)
      const existing = map.get(item.product.id)
      if (existing === undefined || cartStock > existing) {
        map.set(item.product.id, cartStock)
      }
    }
    return map
  }, [products, cart])

  // Add to cart (abre o modal de quantidade/pesagem para todos os itens: KG ou Unidade)
  const addToCart = (product: Product) => {
    const available = stockByProduct.get(product.id) ?? Number(product.stock_quantity ?? 0)
    if (available <= 0) {
      setErrorMsg(`"${product.name}" está sem estoque disponível.`)
      return
    }

    const existing = cart.find((i) => i.product.id === product.id)
    const isWeighed = isWeighedProduct(product)
    setWeighedInitialQty(existing ? existing.quantity : isWeighed ? 0.15 : 1)
    setWeighedProduct(product)
  }

  const handleConfirmWeight = (quantity: number) => {
    if (!weighedProduct) return
    const isWeighed = isWeighedProduct(weighedProduct)
    const available = stockByProduct.get(weighedProduct.id) ?? Number(weighedProduct.stock_quantity ?? 0)
    if (quantity > available) {
      setErrorMsg(
        `Estoque insuficiente para "${weighedProduct.name}". Disponível: ${available}${isWeighed ? ' kg' : ' un'}.`
      )
      return
    }

    const existingIndex = cart.findIndex((i) => i.product.id === weighedProduct.id)
    if (existingIndex >= 0) {
      setCart(
        cart.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity } : item
        )
      )
    } else {
      setCart([
        ...cart,
        {
          product: weighedProduct,
          quantity,
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
    mutationFn: () => {
      const stateEdit = (location.state as { editOrder?: any })?.editOrder
      const effectiveReplaceId =
        editingOrderInfo?.id || editOrderIdParam || stateEdit?.id || fetchedEditOrder?.id
      const effectiveOrderNumber =
        editingOrderInfo?.orderNumber ||
        stateEdit?.orderNumber ||
        fetchedEditOrder?.order_number

      return orderService.createOrder({
        storeId,
        customerId: selectedCustomerId || undefined,
        channel: 'IN_STORE',
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unitCost: Number(i.product.cost_price || 0),
          discount: i.discount,
        })),
        discountAmount: discountTotal,
        paymentMethod,
        notes: notes || undefined,
        replaceOrderId: effectiveReplaceId || undefined,
        orderNumber: effectiveOrderNumber || undefined,
      })
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
      queryClient.invalidateQueries({ queryKey: ['customers-recent'] })
      // O grid do PDV le o saldo; sem invalidar, continuaria mostrando a
      // quantidade antiga ate a proxima revalidacao.
      queryClient.invalidateQueries({ queryKey: ['products-pos', storeId] })

      const wasEditing = Boolean(editingOrderInfo || editOrderIdParam)
      clearCart()
      setEditingOrderInfo(null)
      setLoadedEditOrderId(null)
      syncUrlParams({ editOrder: null })

      if (wasEditing) {
        toast.success(`Pedido #${order.order_number} atualizado com sucesso!`)
        navigate('/orders')
      } else {
        setSuccessOrderNumber(order.order_number)
      }
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const handleCheckout = () => {
    if (cart.length === 0 || saleMutation.isPending) return
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

  const renderCheckoutControls = (compactMobile = false) => (
    <div className={compactMobile ? 'space-y-2' : 'space-y-2.5'}>
      {/* Customer Selector & Quick Create Action */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <Users className="h-3 w-3" /> Cliente <span className="text-primary">*</span>
          </label>
          <span className="text-[10px] text-muted-foreground truncate">
            Obrigatório (Genérico se vazio)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CustomerCombobox
            storeId={storeId}
            value={selectedCustomerId}
            onChange={setSelectedCustomerId}
            className="flex-1 min-w-0"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCustomerModalOpen(true)}
            className="h-7 px-2 text-xs font-semibold shrink-0 gap-1 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary"
            title="Cadastrar novo cliente"
            aria-label="Cadastrar novo cliente"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[11px]">Novo</span>
          </Button>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase block">
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
                <Icon className="h-3 w-3 shrink-0" /> {pm.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Totals Summary & Submit */}
      <div className="pt-1.5 border-t border-border/60 flex items-center justify-between gap-2 sm:block sm:space-y-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline font-bold text-xs sm:text-sm text-foreground">
          <span className="text-[10px] sm:text-xs text-muted-foreground sm:text-foreground uppercase sm:normal-case">
            Total a Pagar ({cart.length} {cart.length === 1 ? 'item' : 'itens'})
          </span>
          <span className="font-mono text-base font-extrabold text-primary leading-tight">
            {formatCurrency(total)}
          </span>
        </div>

        <Button
          className="flex-1 sm:w-full h-9 text-xs font-bold shadow-md shadow-primary/20"
          disabled={cart.length === 0}
          isLoading={saleMutation.isPending}
          onClick={handleCheckout}
        >
          {editingOrderInfo ? 'Finalizar Pedido Editado' : 'Finalizar Venda'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col gap-2 overflow-hidden animate-in fade-in duration-150">
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

      {/* Scrollable Workspace on Mobile (respects fixed checkout dock below) / Full-Height Flex Column on Desktop */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto lg:overflow-hidden custom-scrollbar pr-0.5 lg:pr-0">
        {editingOrderInfo && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 animate-in zoom-in-95 flex-shrink-0 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-foreground font-medium">
              <Edit3 className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                Editando pedido <b>{editingOrderInfo.orderNumber}</b>. Altere os produtos, quantidades ou cliente e finalize a venda.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardEdit}
              className="h-7 text-xs border-border text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            >
              Descartar Edição
            </Button>
          </div>
        )}

        {successOrderNumber && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-success/15 border border-success/30 flex items-center justify-between animate-in zoom-in-95 flex-shrink-0">
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

        {/* IA POS Cross-Sell & Product Suggestions for Customers */}
        <AiModuleInsightCard
          moduleCode="MOD_AI_SALES_CRM"
          taskType="POS_CROSS_SELL_SUGGESTION"
          title="Sugestão Inteligente de Produtos no PDV (Cross-Sell & Giro Rápido)"
          subtitle="Sugere ao operador e ao administrador quais produtos ofertar ao cliente no caixa (campeões de venda + lotes em promoção FEFO)."
          defaultPrompt="Sugira os melhores produtos para ofertar aos clientes no PDV agora, combinando os itens mais vendidos com produtos de giro prioritário."
          defaultExpanded={false}
          compact
          extraContextData={{
            cartItemsCount: cart.length,
            cartProductNames: cart.map((c) => c.product.name),
            selectedCustomerId: selectedCustomerId || null,
          }}
          quickPrompts={[
            {
              label: 'Sugerir combo para o carrinho atual',
              prompt:
                'Com base nos itens no carrinho e nos mais vendidos da loja, qual produto complementar sugerir ao cliente agora?',
            },
            {
              label: 'Produtos com prioridade de venda hoje',
              prompt:
                'Quais produtos têm lotes próximos do vencimento ou maior margem para destacarmos no balcão hoje?',
            },
          ]}
        />

        {/* Main POS Grid: Stacks on Mobile, Full-Height 12-Col Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
          {/* Left Column: Products Grid (8 cols on desktop, stretches to bottom of screen) */}
          <div className="lg:col-span-8 flex flex-col lg:h-full lg:min-h-0 min-w-0">
            <Card className="flex flex-col lg:flex-1 lg:min-h-0 lg:h-full border border-border shadow-xs bg-card overflow-hidden">
              <CardHeader className="py-2 px-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground">Catálogo de Produtos</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                    {totalProducts} {totalProducts === 1 ? 'produto' : 'produtos'}
                  </Badge>
                  {fetchingProducts && !loadingProducts && (
                    <span className="text-[10px] text-muted-foreground">validando...</span>
                  )}
                  {(search || categoryFilter || stockView !== 'in') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('')
                        setFilter('category', '')
                        setFilter('stock', 'in')
                      }}
                      className="text-[11px] text-primary hover:underline cursor-pointer font-semibold"
                    >
                      Resetar filtros
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <div className="inline-flex rounded-lg border border-border overflow-hidden shrink-0">
                    {STOCK_VIEW_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFilter('stock', opt.value)}
                        aria-pressed={stockView === opt.value}
                        className={`px-2 sm:px-2.5 h-7 text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer ${
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
                    className="h-7 px-2 rounded-lg border border-input bg-background text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer flex-1 sm:flex-initial min-w-0 truncate"
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

              <CardContent className="p-2.5 lg:flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
                {loadingProducts ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    Carregando produtos...
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                    {products.map((p) => {
                      const stock = Number(p.stock_quantity ?? 0)
                      const inCart = cart.find((i) => i.product.id === p.id)
                      const inCartQty = inCart?.quantity ?? 0
                      const isOutOfStock = stock <= 0
                      const isWeighed = isWeighedProduct(p)
                      const primaryImage =
                        (p.images || []).find((img) => img.is_primary) || (p.images || [])[0]

                      return (
                        <button
                          key={p.id}
                          onClick={() => addToCart(p)}
                          disabled={isOutOfStock}
                          title={
                            isOutOfStock
                              ? 'Sem estoque disponível'
                              : isWeighed
                                ? 'Clique para pesar / definir quantidade em gramas/kg'
                                : 'Clique para digitar / selecionar a quantidade'
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col sm:justify-between group relative cursor-pointer ${
                            isOutOfStock
                              ? 'opacity-40 cursor-not-allowed bg-muted/20 border-border/40'
                              : inCart
                              ? 'bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20'
                              : 'bg-surface hover:border-primary/50 hover:shadow-xs border-border'
                          }`}
                        >
                          {inCart && (
                            <div className="absolute top-2 right-2 sm:top-1.5 sm:right-1.5 z-10 px-2 py-0.5 sm:px-1.5 sm:py-0.5 rounded-md bg-primary text-primary-foreground text-xs sm:text-[10px] font-bold font-mono flex items-center gap-0.5 shadow-xs">
                              {isWeighed ? (inCartQty >= 1 ? `${inCartQty}kg` : `${Math.round(inCartQty * 1000)}g`) : `${inCartQty}x`}
                            </div>
                          )}

                          <div className="flex items-center gap-2.5 pr-12 sm:pr-6">
                            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-lg overflow-hidden border border-border/70 bg-muted/40 flex items-center justify-center">
                              {primaryImage?.public_url ? (
                                <img
                                  src={primaryImage.public_url}
                                  alt={p.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-muted-foreground/70" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs text-foreground line-clamp-1">
                                {p.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground font-mono truncate">
                                  {p.sku || p.barcode || 'Sem SKU'}
                                </span>
                                {isWeighed && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30 font-bold shrink-0">
                                    <Scale className="h-2.5 w-2.5 mr-0.5" /> KG
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50">
                            <span className="font-bold text-xs text-primary font-mono">
                              {formatCurrency(p.selling_price)}{isWeighed ? '/kg' : ''}
                            </span>
                            <span
                              className={`text-[10px] inline-flex items-center gap-1 font-mono ${
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
                  pageSizeOptions={[5, 12, 24, 48, 96]}
                />
              </div>
            </Card>
          </div>

          {/* Right Column: Sleek Compact Cart & Checkout (4 cols on desktop, stretches to bottom of screen) */}
          <div className="lg:col-span-4 flex flex-col lg:h-full lg:min-h-0 min-w-0">
            <Card className="flex flex-col lg:flex-1 lg:min-h-0 lg:h-full border border-border shadow-xs bg-card overflow-hidden">
              {/* Compact Cart Header */}
              <CardHeader className="py-2 px-3 border-b border-border/60 flex flex-row items-center justify-between flex-shrink-0">
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
              <CardContent className="p-2 lg:flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar space-y-1">
                {cart.length === 0 ? (
                  <div className="py-6 lg:py-10 text-center text-xs text-muted-foreground px-4">
                    <ShoppingBag className="h-7 w-7 text-muted-foreground/40 mx-auto mb-1.5" />
                    <p className="font-medium text-foreground">Carrinho vazio</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Toque nos produtos para adicionar à venda.
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWeighedProduct(item.product)
                                    setWeighedInitialQty(item.quantity)
                                  }}
                                  className="px-2 h-6 min-w-7 rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-mono font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                  title="Clique para digitar / alterar a quantidade"
                                >
                                  {item.quantity}
                                </button>
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

              {/* Desktop Checkout Footer (pinned at the bottom of the right card) */}
              <div className="hidden lg:block p-3 border-t border-border bg-surface-elevated/80 flex-shrink-0">
                {renderCheckoutControls(false)}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Checkout Dock ("Cliente", "Pagamento", "Total a Pagar" & "Finalizar Venda" always fixed) */}
      <div className="lg:hidden flex-shrink-0 rounded-xl border border-primary/30 bg-surface-elevated/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.12)] p-2.5">
        {renderCheckoutControls(true)}
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

      <CustomerQuickCreateModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        storeId={storeId}
        onSuccess={(customer) => {
          setSelectedCustomerId(customer.id)
        }}
      />
    </div>
  )
}
