import * as React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { storeService } from '@/services/storeService'
import { productService } from '@/services/productService'
import { useCartStore } from '@/stores/cartStore'
import { formatCurrency } from '@/utils/currency'
import { isWeighedProduct, formatProductWeight } from '@/utils/productUtils'
import { WeightInputModal } from '@/components/sales/WeightInputModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { useTablePagination } from '@/hooks/useTablePagination'
import { applyStoreTheme, getStoreThemeId } from '@/lib/storeThemes'
import {
  ShoppingBag,
  Search,
  MessageCircle,
  Plus,
  Minus,
  Trash2,
  Store as StoreIcon,
  Phone,
  Package,
  Scale,
} from 'lucide-react'
import type { Product } from '@/types/product.types'

export function CatalogPublicPage() {
  const { slug } = useParams<{ slug: string }>()
  // Paginação, busca, categoria e faixa de preço via URL
  const {
    page,
    pageSize,
    search,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
  } = useTablePagination({
    defaultPageSize: 24,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    defaultFilters: {
      categoryId: '',
      minPrice: '',
      maxPrice: '',
    },
  })

  const selectedCategory = filters.categoryId || ''
  const minPrice = filters.minPrice || ''
  const maxPrice = filters.maxPrice || ''

  const [isCartOpen, setIsCartOpen] = React.useState(false)
  const [customerName, setCustomerName] = React.useState('')
  const [customerAddress, setCustomerAddress] = React.useState('')
  const [noWhatsAppModal, setNoWhatsAppModal] = React.useState(false)
  const [weighedProduct, setWeighedProduct] = React.useState<Product | null>(null)
  const [weighedInitialQty, setWeighedInitialQty] = React.useState<number>(0.15)

  const {
    items: cartItems,
    addItem,
    removeItem,
    updateQuantity,
    getTotalAmount,
    getTotalItemsCount,
  } = useCartStore()

  // Fetch Store by Slug
  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ['public-store', slug],
    queryFn: () => storeService.getStoreBySlug(slug || ''),
    enabled: Boolean(slug),
  })

  React.useEffect(() => {
    if (!store) return
    applyStoreTheme(getStoreThemeId(store.theme_config))
    return () => applyStoreTheme(null)
  }, [store])

  // Fetch Published Products
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: [
      'public-products',
      store?.id,
      search,
      selectedCategory,
      minPrice,
      maxPrice,
      page,
      pageSize,
    ],
    queryFn: () =>
      productService.listPublicCatalogProducts(store!.id, {
        search: search || undefined,
        categoryId: selectedCategory || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sortBy: 'name',
        sortOrder: 'asc',
        page,
        pageSize,
      }),
    enabled: Boolean(store?.id),
    // Sempre revalida ao voltar para a vitrine: preco/estoque podem ter mudado.
    staleTime: 0,
  })

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['public-categories', store?.id],
    queryFn: () => productService.listCategories(store!.id),
    enabled: Boolean(store?.id),
  })

  const products = productsData?.data || []
  const totalItems = productsData?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const cartTotal = getTotalAmount()
  const cartCount = getTotalItemsCount()

  const handleAddToCart = (product: Product) => {
    if (isWeighedProduct(product)) {
      const existing = cartItems.find((i) => i.product.id === product.id)
      setWeighedInitialQty(existing ? existing.quantity : 0.15)
      setWeighedProduct(product)
      return
    }
    addItem(product, 1)
  }

  const handleConfirmWeight = (quantityInKg: number) => {
    if (!weighedProduct) return
    const existing = cartItems.find((i) => i.product.id === weighedProduct.id)
    if (existing) {
      updateQuantity(weighedProduct.id, quantityInKg)
    } else {
      addItem(weighedProduct, quantityInKg)
    }
    setWeighedProduct(null)
  }

  const handleUpdateItemQty = (productId: string, delta: number) => {
    const item = cartItems.find((i) => i.product.id === productId)
    if (!item) return
    const isWeighed = isWeighedProduct(item.product)
    const step = isWeighed ? (Math.abs(delta) < 1 ? delta : delta > 0 ? 0.05 : -0.05) : delta
    const newQty = Number((item.quantity + step).toFixed(3))
    if (newQty <= 0.005) {
      removeItem(productId)
    } else {
      updateQuantity(productId, newQty)
    }
  }

  // Format WhatsApp Checkout Link
  const handleWhatsAppCheckout = () => {
    if (cartItems.length === 0 || !store) return

    const phone = (store.whatsapp || store.phone || '').replace(/\D/g, '')
    if (!phone) {
      setNoWhatsAppModal(true)
      return
    }

    const itemsText = cartItems
      .map((i) => {
        const isWeighed = isWeighedProduct(i.product)
        const unitPrice = Number(i.product.selling_price)
        const lineTotal = i.quantity * unitPrice
        if (isWeighed) {
          const weightLabel = formatProductWeight(i.quantity)
          return `• ${i.product.name} (${weightLabel}) - ${formatCurrency(lineTotal)} (${formatCurrency(unitPrice)}/kg)`
        }
        return `• ${i.quantity}x ${i.product.name} - ${formatCurrency(lineTotal)}`
      })
      .join('\n')

    const message = `*NOVO PEDIDO ONLINE*\n*Loja:* ${store.name}\n\n*Cliente:* ${
      customerName || 'Não informado'
    }\n*Endereço:* ${customerAddress || 'Retirada / A combinar'}\n\n*Itens do Pedido:*\n${itemsText}\n\n*TOTAL: ${formatCurrency(
      cartTotal
    )}*\n\n_Pedido gerado via Catálogo Digital Olivelas_`

    const encoded = encodeURIComponent(message)
    const url = `https://wa.me/55${phone}?text=${encoded}`
    window.open(url, '_blank')
  }

  if (loadingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4 bg-background">
        <StoreIcon className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Loja não encontrada ou inativa</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          O catálogo que você está tentando acessar não existe ou foi temporariamente desativado.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Brand Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-10 w-10 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
                {store.name.slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight text-foreground">
                {store.name}
              </h1>
              <span className="text-[11px] text-muted-foreground block">
                Catálogo Oficial
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsCartOpen(true)}
              variant="default"
              size="sm"
              className="relative shadow-md"
            >
              <ShoppingBag className="h-4 w-4 mr-1.5" /> Carrinho
              {cartCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white text-primary font-extrabold text-[11px]">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Store Banner / Description */}
      {store.description && (
        <section className="bg-surface border-b border-border py-4 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
            <p className="max-w-2xl">{store.description}</p>
            {store.whatsapp && (
              <div className="flex items-center gap-1.5 text-success font-medium shrink-0">
                <MessageCircle className="h-4 w-4" /> Atendimento via WhatsApp: {store.whatsapp}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Search, Category & Price Range */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full flex-1">
              <Input
                placeholder="Buscar produtos no catálogo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setFilter('categoryId', e.target.value)
                  setPage(1)
                }}
                aria-label="Filtrar por categoria"
                className="w-full sm:w-auto h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Faixa de preco */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label htmlFor="catalog-min-price" className="text-[11px] text-muted-foreground">
                Preço
              </label>
              <input
                id="catalog-min-price"
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(e) => {
                  setFilter('minPrice', e.target.value)
                  setPage(1)
                }}
                placeholder="mín."
                className="h-8 w-24 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-[11px] text-muted-foreground">até</span>
              <input
                id="catalog-max-price"
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(e) => {
                  setFilter('maxPrice', e.target.value)
                  setPage(1)
                }}
                placeholder="máx."
                className="h-8 w-24 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {totalItems > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {totalItems} {totalItems === 1 ? 'produto' : 'produtos'}
              </span>
            )}

            {(minPrice || maxPrice || selectedCategory || search) && (
              <button
                type="button"
                onClick={() => {
                  setFilter('minPrice', '')
                  setFilter('maxPrice', '')
                  setFilter('categoryId', '')
                  setSearch('')
                  // Volta para a primeira pagina: sem isso, limpar os filtros
                  // estando no fim da listagem pode deixar a grade vazia,
                  // porque a pagina atual deixa de existir no resultado novo.
                  setPage(1)
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Product Cards Grid */}
        {loadingProducts ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Carregando produtos...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
            Nenhum produto disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => {
              const inCart = cartItems.find((i) => i.product.id === p.id)
              const isWeighed = isWeighedProduct(p)
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  {/* Image */}
                  <div className="h-44 bg-muted/30 flex items-center justify-center relative overflow-hidden">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0].public_url}
                        alt={p.name}
                        className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground/40" />
                    )}
                    {p.category_name && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-md text-[10px] font-medium">
                        {p.category_name}
                      </span>
                    )}
                    {isWeighed && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-primary text-primary-foreground backdrop-blur-md text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <Scale className="h-3 w-3" /> KG (PESO)
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 pt-2 border-t border-border/50">
                      <div className="font-extrabold text-base text-primary font-mono">
                        {formatCurrency(p.selling_price)}{isWeighed ? '/kg' : ''}
                      </div>

                      {inCart ? (
                        <div className="flex items-center justify-between bg-muted/60 rounded-xl p-1">
                          {isWeighed ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(p.id, -0.05)}
                                className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center hover:bg-muted text-xs cursor-pointer"
                                title="-50g"
                                aria-label="Diminuir 50g"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWeighedProduct(p)
                                  setWeighedInitialQty(inCart.quantity)
                                }}
                                className="px-2 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-mono font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Clique para alterar o peso"
                              >
                                <Scale className="h-3 w-3" />
                                {formatProductWeight(inCart.quantity)}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(p.id, 0.05)}
                                className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center hover:bg-muted text-xs cursor-pointer"
                                title="+50g"
                                aria-label="Aumentar 50g"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => updateQuantity(p.id, inCart.quantity - 1)}
                                className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center hover:bg-muted text-xs cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-bold text-xs font-mono">{inCart.quantity} un</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(p.id, inCart.quantity + 1)}
                                className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center hover:bg-muted text-xs cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleAddToCart(p)}
                          size="sm"
                          className="w-full text-xs h-9 font-semibold"
                        >
                          {isWeighed ? (
                            <>
                              <Scale className="h-3.5 w-3.5 mr-1" /> Escolher Peso (KG)
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </main>

      {/* Cart Modal / Drawer */}
      <Modal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title="Meu Carrinho"
        description="Confira seus itens e envie o pedido diretamente para o WhatsApp da loja"
        maxWidth="lg"
      >
        <div className="space-y-4 pt-1 text-xs">
          {cartItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Seu carrinho está vazio. Adicione produtos para continuar.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-border/60 max-h-72 overflow-y-auto pr-1">
                {cartItems.map((item) => {
                  const isWeighed = isWeighedProduct(item.product)
                  const unitPrice = Number(item.product.selling_price)
                  const lineTotal = item.quantity * unitPrice
                  return (
                    <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="font-semibold text-foreground text-sm truncate">{item.product.name}</div>
                          {isWeighed && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/20 shrink-0 font-bold">
                              KG
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground">{formatCurrency(lineTotal)}</span>
                          <span className="text-[11px] text-muted-foreground">
                            ({formatProductWeight(item.quantity)} × {formatCurrency(unitPrice)}{isWeighed ? '/kg' : ' un'})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isWeighed ? (
                          <div className="flex items-center border border-border rounded-xl bg-background overflow-hidden p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.product.id, -0.05)}
                              className="h-7 w-7 flex items-center justify-center hover:bg-muted active:bg-muted/80 text-foreground transition-colors cursor-pointer"
                              title="-50g"
                              aria-label="Diminuir peso"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWeighedProduct(item.product)
                                setWeighedInitialQty(item.quantity)
                              }}
                              className="px-1.5 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-mono font-bold text-xs flex items-center gap-0.5 cursor-pointer transition-colors"
                              title="Clique para ajustar peso"
                            >
                              <Scale className="h-3 w-3" />
                              {formatProductWeight(item.quantity)}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.product.id, 0.05)}
                              className="h-7 w-7 flex items-center justify-center hover:bg-muted active:bg-muted/80 text-foreground transition-colors cursor-pointer"
                              title="+50g"
                              aria-label="Aumentar peso"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center border border-border rounded-xl bg-background overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="h-8 w-8 flex items-center justify-center hover:bg-muted active:bg-muted/80 text-foreground transition-colors cursor-pointer"
                              aria-label="Diminuir quantidade"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-mono font-bold w-7 text-center text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="h-8 w-8 flex items-center justify-center hover:bg-muted active:bg-muted/80 text-foreground transition-colors cursor-pointer"
                              aria-label="Aumentar quantidade"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="text-muted-foreground hover:text-danger p-2 rounded-lg hover:bg-danger/10 transition-colors cursor-pointer"
                          aria-label="Remover produto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Customer Contact Details */}
              <div className="p-3.5 bg-muted/40 rounded-xl space-y-2.5 border border-border/50">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-muted-foreground">
                    Seu Nome *
                  </label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-muted-foreground">
                    Endereço de Entrega
                  </label>
                  <Input
                    placeholder="Rua, número, bairro..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              {/* Total & WhatsApp Button */}
              <div className="p-3.5 bg-surface-elevated rounded-xl border border-border space-y-1">
                <div className="flex justify-between items-center font-bold text-base text-foreground">
                  <span>Total do Pedido:</span>
                  <span className="font-mono text-primary text-lg">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all"
                onClick={handleWhatsAppCheckout}
              >
                <MessageCircle className="h-5 w-5 mr-2" /> Enviar Pedido no WhatsApp
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Missing WhatsApp Notice Modal */}
      <Modal
        isOpen={noWhatsAppModal}
        onClose={() => setNoWhatsAppModal(false)}
        maxWidth="sm"
        title="WhatsApp Indisponível"
      >
        <div className="space-y-4 pt-1 text-center">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <Phone className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">Loja sem WhatsApp Cadastrado</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Esta loja ainda não cadastrou um número de WhatsApp ou telefone para receber pedidos automáticos online. Por favor, entre em contato diretamente com o estabelecimento.
            </p>
          </div>
          <Button
            className="w-full h-9 text-xs font-semibold"
            onClick={() => setNoWhatsAppModal(false)}
          >
            Entendido
          </Button>
        </div>
      </Modal>

      {/* Interactive Weight / Weighing Modal */}
      <WeightInputModal
        isOpen={Boolean(weighedProduct)}
        onClose={() => setWeighedProduct(null)}
        product={weighedProduct}
        initialQuantity={weighedInitialQty}
        maxAvailable={weighedProduct?.stock_quantity ?? 9999}
        onConfirm={handleConfirmWeight}
      />
    </div>
  )
}
