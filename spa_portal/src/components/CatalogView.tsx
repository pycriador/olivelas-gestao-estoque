import * as React from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MessageCircle,
  Minus,
  Moon,
  Package,
  Phone,
  Plus,
  Scale,
  Search,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  Sun,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import { supabasePortalApi, classifyPortalApiError } from '../api/supabasePortalClient'
import { portalConfig } from '../config/portal.config'
import type {
  PortalCartItem,
  PortalCategory,
  PortalCredentialStatus,
  PortalPaymentMethod,
  PortalProduct,
  PortalStore,
  PortalStoredOrderHistoryItem,
} from '../types/portal.types'
import {
  buildPortalOrderTrackingUrl,
  formatCurrency,
  formatPortalWhatsAppOrderMessage,
  formatProductWeight,
  getPortalOrderHistory,
  getResolvedWhatsAppTemplate,
  isWeighedProduct,
  normalizeWhatsAppPhone,
  savePortalOrderHistory,
} from '../utils/portalFormatters'
import { WeightSelectorModal } from './WeightSelectorModal'

interface CatalogViewProps {
  store: PortalStore
  isDark: boolean
  onToggleDark: () => void
  onOpenOrderTracking: (orderId: string) => void
  onCredentialInvalidated: (status: PortalCredentialStatus) => void
}

const CART_STORAGE_KEY = `olivelas_spa_portal_cart_${portalConfig.storeId}`
const PAGE_SIZE_OPTIONS = [6, 8, 12, 16, 24, 36, 48, 96]

export function CatalogView({
  store,
  isDark,
  onToggleDark,
  onOpenOrderTracking,
  onCredentialInvalidated,
}: CatalogViewProps) {
  const [categories, setCategories] = React.useState<PortalCategory[]>([])
  const [products, setProducts] = React.useState<PortalProduct[]>([])
  const [totalProducts, setTotalProducts] = React.useState(0)
  const [loadingProducts, setLoadingProducts] = React.useState(true)

  // Filtros e paginação
  const [search, setSearch] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState('')
  const [minPrice, setMinPrice] = React.useState('')
  const [maxPrice, setMaxPrice] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState<number>(
    store.theme_config?.catalogPageSize || portalConfig.branding.defaultPageSize || 24
  )

  // Carrinho persistido por loja
  const [cart, setCart] = React.useState<PortalCartItem[]>(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // Modal de Peso (KG) e Checkout
  const [weighedProduct, setWeighedProduct] = React.useState<PortalProduct | null>(null)
  const [weighedInitialKg, setWeighedInitialKg] = React.useState(0.25)
  const [isCartOpen, setIsCartOpen] = React.useState(false)
  const [customerName, setCustomerName] = React.useState('')
  const [customerPhone, setCustomerPhone] = React.useState('')
  const [customerAddress, setCustomerAddress] = React.useState('')
  const [customerNotes, setCustomerNotes] = React.useState('')
  const [paymentMethod, setPaymentMethod] = React.useState<PortalPaymentMethod>('PIX')
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Pedidos recentes do cliente nesta loja
  const [recentOrders, setRecentOrders] = React.useState<PortalStoredOrderHistoryItem[]>(() =>
    getPortalOrderHistory(store.id)
  )

  React.useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // ignore
    }
  }, [cart])

  // Carrega categorias da loja
  React.useEffect(() => {
    supabasePortalApi
      .fetchStoreCategories()
      .then(setCategories)
      .catch((err) => {
        const credErr = classifyPortalApiError(err)
        if (credErr) onCredentialInvalidated(credErr)
      })
  }, [onCredentialInvalidated])

  // Carrega produtos publicados da loja
  React.useEffect(() => {
    let active = true
    setLoadingProducts(true)
    supabasePortalApi
      .fetchCatalogProducts({
        search: search || undefined,
        categoryId: selectedCategory || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        page,
        pageSize,
      })
      .then((res) => {
        if (!active) return
        setProducts(res.data)
        setTotalProducts(res.total)
      })
      .catch((err) => {
        if (!active) return
        const credErr = classifyPortalApiError(err)
        if (credErr) onCredentialInvalidated(credErr)
      })
      .finally(() => {
        if (active) setLoadingProducts(false)
      })

    return () => {
      active = false
    }
  }, [search, selectedCategory, minPrice, maxPrice, page, pageSize, onCredentialInvalidated])

  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))

  const cartTotal = React.useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity * item.product.selling_price, 0),
    [cart]
  )

  const handleAddProduct = (product: PortalProduct) => {
    if (isWeighedProduct(product)) {
      const existing = cart.find((c) => c.product.id === product.id)
      setWeighedInitialKg(existing ? existing.quantity : 0.25)
      setWeighedProduct(product)
      return
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id)
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const handleConfirmWeight = (weightInKg: number) => {
    if (!weighedProduct) return
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === weighedProduct.id)
      if (existing) {
        return prev.map((c) =>
          c.product.id === weighedProduct.id ? { ...c, quantity: weightInKg } : c
        )
      }
      return [...prev, { product: weighedProduct, quantity: weightInKg }]
    })
    setWeighedProduct(null)
  }

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item
          const isKg = isWeighedProduct(item.product)
          const step = isKg ? (delta > 0 ? 0.05 : -0.05) : delta
          const nextQty = Number((item.quantity + step).toFixed(3))
          return { ...item, quantity: nextQty }
        })
        .filter((item) => item.quantity > 0.005)
    )
  }

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const handleCheckoutSubmit = async (alsoSendWhatsApp: boolean) => {
    if (cart.length === 0 || submitting) return
    setCheckoutError(null)

    if (!customerName.trim()) {
      setCheckoutError('Informe seu nome para identificarmos o pedido.')
      return
    }
    if (!customerPhone.trim()) {
      setCheckoutError('Informe seu WhatsApp/Telefone para acompanhar o status do pedido.')
      return
    }

    setSubmitting(true)
    try {
      const created = await supabasePortalApi.createCatalogOrder({
        customerName,
        customerPhone,
        deliveryAddress: customerAddress,
        paymentMethod,
        notes: customerNotes,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.selling_price,
        })),
      })

      const entry: PortalStoredOrderHistoryItem = {
        id: created.id,
        orderNumber: created.order_number,
        storeId: store.id,
        storeName: store.name,
        totalAmount: created.total_amount,
        createdAt: created.created_at,
      }
      savePortalOrderHistory(entry)
      setRecentOrders(getPortalOrderHistory(store.id))

      const trackingUrl = buildPortalOrderTrackingUrl(created.id)

      if (alsoSendWhatsApp) {
        const storePhone = normalizeWhatsAppPhone(store.whatsapp || store.phone)
        const template = getResolvedWhatsAppTemplate(store.theme_config)
        const message = formatPortalWhatsAppOrderMessage({
          template,
          orderNumber: created.order_number,
          storeName: store.name,
          customerName,
          customerPhone,
          customerAddress,
          paymentMethod,
          notes: customerNotes,
          trackingUrl,
          totalAmount: created.total_amount,
          createdAt: created.created_at,
          items: cart.map((c) => ({
            name: c.product.name,
            quantity: c.quantity,
            unitPrice: c.product.selling_price,
            isWeighed: isWeighedProduct(c.product),
            weightLabel: isWeighedProduct(c.product)
              ? formatProductWeight(c.quantity)
              : undefined,
          })),
        })
        const encoded = encodeURIComponent(message)
        const waUrl = storePhone
          ? `https://wa.me/${storePhone}?text=${encoded}`
          : `https://wa.me/?text=${encoded}`
        window.open(waUrl, '_blank')
      }

      setCart([])
      setIsCartOpen(false)
      onOpenOrderTracking(created.id)
    } catch (err: any) {
      const credErr = classifyPortalApiError(err)
      if (credErr) {
        onCredentialInvalidated(credErr)
        return
      }
      setCheckoutError(err?.message || 'Erro ao enviar pedido. Verifique o estoque disponível.')
    } finally {
      setSubmitting(false)
    }
  }

  const primaryColor =
    store.theme_config?.primaryColor || portalConfig.branding.primaryColor || '#16a34a'
  const bannerUrl = store.theme_config?.bannerUrl || null
  const subtitle =
    store.theme_config?.subtitle ||
    portalConfig.branding.heroSubtitle ||
    'Catálogo online integrado com estoque e rastreamento de pedido em tempo real.'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      {/* Faixa Superior de Entrega / Confiança */}
      <div
        className="text-white text-[11px] font-semibold py-2 px-4 text-center"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          <span>{portalConfig.branding.deliveryBannerText}</span>
        </div>
      </div>

      {/* Cabeçalho Principal */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-11 w-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <StoreIcon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold truncate">{store.name}</h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Loja Aberta
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {store.address_city
                  ? `${store.address_street || ''} • ${store.address_city}/${store.address_state || ''}`
                  : 'Catálogo Oficial Exclusivo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDark}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Alternar tema Claro/Escuro"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Sacola ({cart.length})</span>
              {cartTotal > 0 && (
                <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-black/20">
                  {formatCurrency(cartTotal)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Hero / Banner Personalizável */}
        <section className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 shadow-lg">
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt={store.name}
              className="absolute inset-0 w-full h-full object-cover opacity-25"
            />
          )}
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              {portalConfig.branding.heroBadge}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {portalConfig.branding.customTitle || store.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{subtitle}</p>

            {portalConfig.branding.showTrustBadges &&
              portalConfig.branding.trustBadges.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {portalConfig.branding.trustBadges.map((badge) => (
                    <span
                      key={badge}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 border border-white/10 text-[11px] font-medium text-slate-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      {badge}
                    </span>
                  ))}
                </div>
              )}
          </div>
        </section>

        {/* Barra de Pedidos Recentes do Cliente (Link Direto de Rastreamento) */}
        {recentOrders.length > 0 && (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Acompanhe seus pedidos recentes em tempo real
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Clique em um pedido abaixo para abrir a linha do tempo de status ao vivo:
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentOrders.slice(0, 3).map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => onOpenOrderTracking(ord.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 shadow-2xs"
                >
                  <span>#{ord.orderNumber}</span>
                  <span className="text-slate-400">•</span>
                  <span>{formatCurrency(ord.totalAmount)}</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Barra de Busca e Filtros */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Buscar produto por nome, código ou SKU..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value)
                  setPage(1)
                }}
                placeholder="Preço Mín (R$)"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value)
                  setPage(1)
                }}
                placeholder="Preço Máx (R$)"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} por página
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chips de Categorias */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('')
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === ''
                    ? 'text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
                style={selectedCategory === '' ? { backgroundColor: primaryColor } : undefined}
              >
                Todos ({totalProducts})
              </button>
              {categories.map((cat) => {
                const active = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(active ? '' : cat.id)
                      setPage(1)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      active
                        ? 'text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    style={active ? { backgroundColor: primaryColor } : undefined}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Grade de Produtos */}
        {loadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse p-4"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-2">
            <Package className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold">Nenhum produto encontrado</h3>
            <p className="text-xs text-slate-500">
              Tente limpar os filtros de busca ou selecionar outra categoria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => {
              const inCart = cart.find((c) => c.product.id === product.id)
              const isKg = isWeighedProduct(product)

              return (
                <article
                  key={product.id}
                  className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
                >
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {product.primary_image_url ? (
                      <img
                        src={product.primary_image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                        <Package className="h-12 w-12" />
                      </div>
                    )}

                    {product.category_name && (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                        {product.category_name}
                      </span>
                    )}

                    {isKg && (
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                        <Scale className="h-3 w-3" /> Pesável (KG)
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm sm:text-base font-black text-emerald-600">
                          {formatCurrency(product.selling_price)}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          /{(product.unit || 'UN').toLowerCase()}
                        </span>
                      </div>

                      {inCart ? (
                        <div className="flex items-center justify-between gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(product.id, -1)}
                            className="h-7 w-7 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-2xs"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => isKg && handleAddProduct(product)}
                            className="text-xs font-bold text-emerald-700 dark:text-emerald-300 px-1"
                          >
                            {isKg ? formatProductWeight(inCart.quantity) : `${inCart.quantity} un`}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(product.id, 1)}
                            className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-white text-xs font-bold shadow-2xs transition hover:opacity-95"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {isKg ? <Scale className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {isKg ? 'Escolher Peso' : 'Adicionar'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalProducts} produtos)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40"
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Seleção de Peso (KG) */}
      <WeightSelectorModal
        product={weighedProduct}
        initialWeightKg={weighedInitialKg}
        onClose={() => setWeighedProduct(null)}
        onConfirm={handleConfirmWeight}
      />

      {/* Drawer / Modal de Sacola e Checkout Online */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-extrabold">Sua Sacola de Compras ({cart.length})</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold">Sua sacola está vazia</p>
                  <p className="text-xs text-slate-500">
                    Adicione produtos da vitrine para fazer seu pedido online.
                  </p>
                </div>
              ) : (
                <>
                  {/* Itens da Sacola */}
                  <div className="space-y-2.5">
                    {cart.map((item) => {
                      const isKg = isWeighedProduct(item.product)
                      const lineTotal = item.quantity * item.product.selling_price
                      return (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{item.product.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {isKg
                                ? `${formatProductWeight(item.quantity)} × ${formatCurrency(
                                    item.product.selling_price
                                  )}/kg`
                                : `${item.quantity} un × ${formatCurrency(
                                    item.product.selling_price
                                  )}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-emerald-600">
                              {formatCurrency(lineTotal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.product.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Dados de Entrega e Pagamento */}
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Dados para Entrega & Rastreamento
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Seu Nome *</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ex.: Maria Oliveira"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Seu WhatsApp / Telefone *
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Endereço de Entrega (ou deixe em branco para Retirada)
                      </label>
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Rua, Número, Bairro, Complemento"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Forma de Pagamento</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PortalPaymentMethod)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
                      >
                        <option value="PIX">PIX</option>
                        <option value="CREDIT_CARD">Cartão de Crédito</option>
                        <option value="DEBIT_CARD">Cartão de Débito</option>
                        <option value="CASH">Dinheiro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Observações do Pedido
                      </label>
                      <textarea
                        rows={2}
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="Ex.: Preferência por frutas mais maduras, troco para R$ 50..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    </div>

                    {checkoutError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-medium">
                        {checkoutError}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Total do Pedido:</span>
                  <span className="text-lg font-black text-emerald-600">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleCheckoutSubmit(false)}
                    className="w-full py-3 px-4 rounded-xl text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {submitting
                      ? 'Registrando Pedido...'
                      : 'Finalizar Pedido & Acompanhar em Tempo Real'}
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleCheckoutSubmit(true)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/10 transition disabled:opacity-50"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Finalizar + Enviar Resumo no WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
