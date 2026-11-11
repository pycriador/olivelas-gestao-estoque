import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storeService } from '@/services/storeService'
import { customerService } from '@/services/customerService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { parseApiError } from '@/utils/errorHandler'
import {
  getPosCustomerPolicy,
  saveLocalPosCustomerPolicy,
} from '@/utils/posCustomerConfig'
import type { PosCustomerMode } from '@/types/store.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { StoreThemeSelector } from '@/components/settings/StoreThemeSelector'
import {
  applyStoreTheme,
  CATALOG_PAGE_SIZE_OPTIONS,
  DEFAULT_STORE_THEME,
  getCatalogCustomization,
  getStoreThemeId,
  STORE_THEMES,
} from '@/lib/storeThemes'
import { toast } from 'sonner'
import {
  Store,
  Save,
  CheckCircle2,
  Globe,
  ExternalLink,
  MapPin,
  Building,
  Phone,
  Palette,
  Image as ImageIcon,
  Upload,
  Trash2,
  LayoutGrid,
  RotateCcw,
  Clock,
  SunMoon,
  Eye,
  Users,
  ShieldCheck,
} from 'lucide-react'

const PRESET_BRAND_COLORS = [
  { label: 'Verde Hortifruti', hex: '#16a34a' },
  { label: 'Esmeralda Frescor', hex: '#059669' },
  { label: 'Laranja Feira', hex: '#ea580c' },
  { label: 'Vermelho Gourmet', hex: '#dc2626' },
  { label: 'Azul Oceano', hex: '#0284c7' },
  { label: 'Roxo Açaí', hex: '#7c3aed' },
  { label: 'Âmbar Empório', hex: '#d97706' },
  { label: 'Rosa Confeitaria', hex: '#db2777' },
]

export function SettingsPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const logoInputRef = React.useRef<HTMLInputElement | null>(null)
  const bannerInputRef = React.useRef<HTMLInputElement | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = React.useState(false)

  const [formData, setFormData] = React.useState({
    name: '',
    slug: '',
    document: '',
    email: '',
    phone: '',
    whatsapp: '',
    description: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    logoUrl: '',
    bannerUrl: '',
    catalogThemeMode: 'inherit' as 'inherit' | string,
    primaryColor: '',
    accentColor: '',
    headerBgColor: '',
    catalogPageSize: 24,
    catalogGridColumns: 4 as 3 | 4,
    catalogSubtitle: 'Catálogo Oficial',
    showPrices: true,
    allowVisitorThemeToggle: true,
    openingHours: '',
    instagramUrl: '',
    genericCustomerReleasedByAdmin: false,
    posCustomerMode: 'REQUIRED' as PosCustomerMode,
  })

  const [savedSuccess, setSavedSuccess] = React.useState(false)
  const [themeSavedSuccess, setThemeSavedSuccess] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const { data: store, isLoading } = useQuery({
    queryKey: ['store-settings', storeId],
    queryFn: () => storeService.getStoreById(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const selectedThemeId = getStoreThemeId(store?.theme_config) || DEFAULT_STORE_THEME

  const themeMutation = useMutation({
    mutationFn: (appTheme: string) => {
      const existingConfig = store?.theme_config
      const themeConfig =
        existingConfig && typeof existingConfig === 'object' && !Array.isArray(existingConfig)
          ? { ...existingConfig }
          : {}

      return storeService.updateStore(storeId, {
        theme_config: { ...themeConfig, appTheme },
      })
    },
    onMutate: (appTheme) => {
      setErrorMsg(null)
      setThemeSavedSuccess(false)
      applyStoreTheme(appTheme)
    },
    onSuccess: (updatedStore) => {
      queryClient.setQueryData(['store-settings', storeId], updatedStore)
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      setThemeSavedSuccess(true)
      window.setTimeout(() => setThemeSavedSuccess(false), 3000)
    },
    onError: (error) => {
      applyStoreTheme(selectedThemeId)
      setErrorMsg(parseApiError(error))
    },
  })

  React.useEffect(() => {
    if (store) {
      const rawConfig =
        store.theme_config &&
        typeof store.theme_config === 'object' &&
        !Array.isArray(store.theme_config)
          ? (store.theme_config as Record<string, unknown>)
          : {}
      const resolvedCatalog = getCatalogCustomization(store.theme_config)
      const resolvedPosPolicy = getPosCustomerPolicy(store.theme_config, store.id)
      const hasExplicitCatalogTheme =
        typeof rawConfig.catalogTheme === 'string' &&
        STORE_THEMES.some((th) => th.id === rawConfig.catalogTheme)

      setFormData({
        name: store.name || '',
        slug: store.slug || '',
        document: store.document || '',
        email: store.email || '',
        phone: store.phone || '',
        whatsapp: store.whatsapp || '',
        description: store.description || '',
        addressStreet: store.address_street || '',
        addressCity: store.address_city || '',
        addressState: store.address_state || '',
        logoUrl: store.logo_url || '',
        bannerUrl: store.banner_url || (typeof rawConfig.catalogBanner === 'string' ? rawConfig.catalogBanner : ''),
        catalogThemeMode: hasExplicitCatalogTheme ? String(rawConfig.catalogTheme) : 'inherit',
        primaryColor: resolvedCatalog.primaryColor,
        accentColor: resolvedCatalog.accentColor,
        headerBgColor: resolvedCatalog.headerBgColor,
        catalogPageSize: resolvedCatalog.catalogPageSize,
        catalogGridColumns: resolvedCatalog.catalogGridColumns,
        catalogSubtitle: resolvedCatalog.catalogSubtitle,
        showPrices: resolvedCatalog.showPrices,
        allowVisitorThemeToggle: resolvedCatalog.allowVisitorThemeToggle,
        openingHours: resolvedCatalog.openingHours,
        instagramUrl: resolvedCatalog.instagramUrl,
        genericCustomerReleasedByAdmin: resolvedPosPolicy.genericCustomerReleasedByAdmin,
        posCustomerMode: resolvedPosPolicy.posCustomerMode,
      })
    }
  }, [store])

  const handleAssetUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    kind: 'logo' | 'banner'
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !storeId) return

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido (PNG, JPG, WebP, SVG).')
      return
    }

    if (kind === 'logo') setIsUploadingLogo(true)
    else setIsUploadingBanner(true)

    try {
      const uploadedUrl = await storeService.uploadStoreAsset(storeId, file, kind)
      setFormData((prev) =>
        kind === 'logo' ? { ...prev, logoUrl: uploadedUrl } : { ...prev, bannerUrl: uploadedUrl }
      )
      toast.success(
        kind === 'logo'
          ? 'Logo carregada! Clique em "Salvar Alterações" para publicar.'
          : 'Banner carregado! Clique em "Salvar Alterações" para publicar.'
      )
    } catch (err) {
      toast.error(parseApiError(err))
    } finally {
      if (kind === 'logo') setIsUploadingLogo(false)
      else setIsUploadingBanner(false)
    }
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const effectivePosMode: PosCustomerMode = formData.genericCustomerReleasedByAdmin
        ? formData.posCustomerMode
        : 'REQUIRED'

      saveLocalPosCustomerPolicy(storeId, {
        genericCustomerReleasedByAdmin: formData.genericCustomerReleasedByAdmin,
        posCustomerMode: effectivePosMode,
      })

      if (formData.genericCustomerReleasedByAdmin) {
        try {
          await customerService.getOrCreateGenericCustomer(storeId)
        } catch {
          // ignora erro secundário de cliente genérico
        }
      }

      const existingConfig =
        store?.theme_config &&
        typeof store.theme_config === 'object' &&
        !Array.isArray(store.theme_config)
          ? { ...(store.theme_config as Record<string, unknown>) }
          : {}

      const nextThemeConfig: Record<string, unknown> = {
        ...existingConfig,
        catalogTheme:
          formData.catalogThemeMode === 'inherit' ? undefined : formData.catalogThemeMode,
        primaryColor: formData.primaryColor.trim() || undefined,
        accentColor: formData.accentColor.trim() || undefined,
        headerBgColor: formData.headerBgColor.trim() || undefined,
        catalogPageSize: Number(formData.catalogPageSize) || 24,
        catalogGridColumns: formData.catalogGridColumns,
        catalogSubtitle: formData.catalogSubtitle.trim() || 'Catálogo Oficial',
        showPrices: formData.showPrices,
        allowVisitorThemeToggle: formData.allowVisitorThemeToggle,
        openingHours: formData.openingHours.trim() || undefined,
        instagramUrl: formData.instagramUrl.trim() || undefined,
        catalogBanner: formData.bannerUrl.trim() || undefined,
        genericCustomerReleasedByAdmin: formData.genericCustomerReleasedByAdmin,
        posCustomerMode: effectivePosMode,
      }

      return storeService.updateStore(storeId, {
        name: formData.name,
        slug: formData.slug,
        document: formData.document || null,
        email: formData.email || null,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        description: formData.description || null,
        address_street: formData.addressStreet || null,
        address_city: formData.addressCity || null,
        address_state: formData.addressState || null,
        logo_url: formData.logoUrl.trim() || null,
        banner_url: formData.bannerUrl.trim() || null,
        theme_config: nextThemeConfig as any,
      })
    },
    onSuccess: (updatedStore) => {
      queryClient.setQueryData(['store-settings', storeId], updatedStore)
      queryClient.invalidateQueries({ queryKey: ['store-settings', storeId] })
      queryClient.invalidateQueries({ queryKey: ['public-store', formData.slug] })
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      setSavedSuccess(true)
      toast.success('Configurações e personalização do catálogo salvas com sucesso!')
      setTimeout(() => setSavedSuccess(false), 3500)
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    updateMutation.mutate()
  }

  const catalogUrl = `${window.location.origin}${import.meta.env.BASE_URL}store/${formData.slug}`

  return (
    <div className="flex-1 min-h-0 w-full h-full overflow-y-auto pr-1 sm:pr-2 space-y-3.5 animate-in fade-in duration-150 custom-scrollbar">
      {/* Top Navbar Title */}
      <PageHeader
        title={t.nav.settings}
        badge={
          <Badge variant="outline" className="text-[10px] font-normal px-2 py-0">
            {formData.name || 'Loja'}
          </Badge>
        }
      />

      {/* Compact Top Header & Quick Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Configurações cadastrais, endereço e catálogo público WhatsApp
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {formData.slug && (
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 font-medium"
            >
              <Globe className="h-3.5 w-3.5" /> Ver Catálogo <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Button
            onClick={handleSubmit}
            size="sm"
            isLoading={updateMutation.isPending}
            className="h-8 text-xs px-3 shadow-xs font-semibold gap-1.5"
          >
            <Save className="h-3.5 w-3.5" /> Salvar Alterações
          </Button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-lg bg-success/15 border border-success/30 flex items-center gap-2 text-xs font-semibold text-foreground animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          Configurações da loja salvas com sucesso!
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 pb-6">
        <Card id="theme" className="border border-border shadow-xs bg-card">
          <CardHeader className="py-2.5 px-4 border-b border-border/60">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <Store className="h-3.5 w-3.5 text-primary" /> Tema visual do painel interno da loja
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3">
            <StoreThemeSelector
              value={selectedThemeId}
              disabled={themeMutation.isPending || isLoading}
              onChange={(themeId) => themeMutation.mutate(themeId)}
            />
            {themeSavedSuccess && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Tema salvo no perfil da loja.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regra de Cliente no Frente de Caixa — PDV (/sales) & Liberação de Cliente Genérico */}
        <Card id="pos-customer-rules" className="border border-border shadow-xs bg-card">
          <CardHeader className="py-2.5 px-4 border-b border-border/60 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              Regras de Cliente no Frente de Caixa — PDV (/sales)
            </CardTitle>
            <Badge
              variant={
                formData.genericCustomerReleasedByAdmin &&
                formData.posCustomerMode === 'ALLOW_GENERIC'
                  ? 'success'
                  : 'outline'
              }
              className="text-[10px]"
            >
              {formData.genericCustomerReleasedByAdmin &&
              formData.posCustomerMode === 'ALLOW_GENERIC'
                ? 'Cliente Genérico Ativo'
                : 'Cadastro de Cliente Obrigatório'}
            </Badge>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* 1. Liberação Administrativa do Cliente Genérico */}
              <div className="p-3 rounded-xl border border-border bg-muted/15 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    1. Liberação Administrativa (1 Cliente Genérico por Loja)
                  </span>
                  <Badge
                    variant={formData.genericCustomerReleasedByAdmin ? 'success' : 'secondary'}
                    className="text-[10px]"
                  >
                    {formData.genericCustomerReleasedByAdmin ? 'Liberado' : 'Bloqueado'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Todas as lojas possuem direito a pelo menos <b>1 Cliente Genérico</b> padrão, mas o seu uso no PDV (<code>/sales</code>) só fica disponível mediante ativação nesta área administrativa.
                </p>

                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.genericCustomerReleasedByAdmin}
                    onChange={(e) => {
                      const released = e.target.checked
                      setFormData((prev) => ({
                        ...prev,
                        genericCustomerReleasedByAdmin: released,
                        posCustomerMode: released ? 'ALLOW_GENERIC' : 'REQUIRED',
                      }))
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-foreground block">
                      Liberar acesso ao Cliente Genérico nesta loja
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Desbloqueia o cadastro e uso do Cliente Genérico para vendas no balcão.
                    </span>
                  </div>
                </label>
              </div>

              {/* 2. Escolha da Loja no PDV (/sales): Cadastro Obrigatório vs Cliente Genérico */}
              <div className="p-3 rounded-xl border border-border bg-muted/15 space-y-2.5">
                <span className="text-xs font-bold text-foreground block">
                  2. Escolha da Loja para o PDV (/sales)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Escolha se o operador deve obrigatoriamente identificar/cadastrar o cliente em cada venda ou se pode usar o Cliente Genérico da loja:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, posCustomerMode: 'REQUIRED' }))
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      !formData.genericCustomerReleasedByAdmin ||
                      formData.posCustomerMode === 'REQUIRED'
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground">
                      Cadastro de Cliente Obrigatório
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Exige selecionar ou cadastrar o cliente para finalizar a venda.
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!formData.genericCustomerReleasedByAdmin}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, posCustomerMode: 'ALLOW_GENERIC' }))
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      !formData.genericCustomerReleasedByAdmin
                        ? 'opacity-50 cursor-not-allowed border-border bg-muted/30 text-muted-foreground'
                        : formData.posCustomerMode === 'ALLOW_GENERIC'
                          ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 cursor-pointer'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/60 cursor-pointer'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground">
                      Permitir Cliente Genérico
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formData.genericCustomerReleasedByAdmin
                        ? 'Permite finalizar vendas com o 1 Cliente Genérico da loja.'
                        : 'Ative a liberação administrativa ao lado para habilitar.'}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personalização Completa do Catálogo Público (/store/:slug) */}
        <Card id="public-catalog-customization" className="border border-border shadow-xs bg-card">
          <CardHeader className="py-2.5 px-4 border-b border-border/60 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <Palette className="h-3.5 w-3.5 text-primary" />
              Personalização da Vitrine Pública (/store/{formData.slug || 'sua-loja'})
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-medium">
              Logo, Cores, Tema & Paginação
            </Badge>
          </CardHeader>
          <CardContent className="p-3.5 space-y-4">
            {/* 1. Mudança de Logo e Banner de Capa */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* Logo da Loja */}
              <div className="p-3 rounded-xl border border-border bg-muted/15 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" /> Logo da Loja (Cabeçalho)
                  </span>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="text-[11px] text-danger hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Remover logo
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo da loja"
                      className="h-14 w-14 rounded-xl object-cover border border-border bg-surface shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0"
                      style={{ backgroundColor: formData.primaryColor || 'hsl(var(--primary))' }}
                    >
                      {(formData.name || 'L').slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAssetUpload(e, 'logo')}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={isUploadingLogo}
                        onClick={() => logoInputRef.current?.click()}
                        className="h-7 text-[11px] gap-1.5 px-2.5"
                      >
                        <Upload className="h-3 w-3" /> Enviar Imagem do Computador
                      </Button>
                    </div>
                    <Input
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      placeholder="Ou cole a URL da imagem do logo (https://...)"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Banner de Capa da Vitrine */}
              <div className="p-3 rounded-xl border border-border bg-muted/15 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" /> Banner de Capa (Opcional)
                  </span>
                  {formData.bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bannerUrl: '' })}
                      className="text-[11px] text-danger hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Remover banner
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {formData.bannerUrl && (
                    <div className="h-16 w-full rounded-lg overflow-hidden border border-border bg-surface">
                      <img
                        src={formData.bannerUrl}
                        alt="Banner do catálogo"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAssetUpload(e, 'banner')}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={isUploadingBanner}
                      onClick={() => bannerInputRef.current?.click()}
                      className="h-7 text-[11px] gap-1.5 px-2.5 shrink-0"
                    >
                      <Upload className="h-3 w-3" /> Enviar Banner
                    </Button>
                    <Input
                      value={formData.bannerUrl}
                      onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                      placeholder="Ou cole a URL da imagem de capa (https://...)"
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Tema Padrão do Catálogo & Cores Personalizadas da Interface */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/15 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-primary" />
                    Tema Padrão & Cores da Interface Pública
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Defina o tema inicial que os clientes verão ao acessar o catálogo e personalize as cores de botões, preços e cabeçalho.
                  </p>
                </div>

                {(formData.primaryColor || formData.accentColor || formData.headerBgColor) && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        primaryColor: '',
                        accentColor: '',
                        headerBgColor: '',
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1 bg-background cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Restaurar cores do tema
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Tema Padrão do Catálogo */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                    <SunMoon className="h-3 w-3 text-primary" /> Tema Padrão da Vitrine
                  </label>
                  <select
                    value={formData.catalogThemeMode}
                    onChange={(e) =>
                      setFormData({ ...formData, catalogThemeMode: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    <option value="inherit">
                      Igual ao tema do painel ({selectedThemeId})
                    </option>
                    <optgroup label="Temas Claros (Recomendado para Vitrine)">
                      {STORE_THEMES.filter((th) => th.mode === 'light').map((th) => (
                        <option key={th.id} value={th.id}>
                          {th.name} Claro ({th.id})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Temas Escuros">
                      {STORE_THEMES.filter((th) => th.mode === 'dark').map((th) => (
                        <option key={th.id} value={th.id}>
                          {th.name} Escuro ({th.id})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Cor Principal (Botões, Preços, Destaques) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    Cor Principal (Botões e Preços)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={formData.primaryColor || '#16a34a'}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      aria-label="Selecionar cor principal"
                      className="h-8 w-10 rounded-lg border border-input bg-background p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      placeholder="Padrão do tema (#hex)"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Cor Secundária / Destaque */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    Cor Secundária / Destaque
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={formData.accentColor || '#dcfce7'}
                      onChange={(e) =>
                        setFormData({ ...formData, accentColor: e.target.value })
                      }
                      aria-label="Selecionar cor secundária"
                      className="h-8 w-10 rounded-lg border border-input bg-background p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      value={formData.accentColor}
                      onChange={(e) =>
                        setFormData({ ...formData, accentColor: e.target.value })
                      }
                      placeholder="Padrão do tema (#hex)"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Cor de Fundo do Cabeçalho */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    Cor do Cabeçalho (Opcional)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={formData.headerBgColor || '#ffffff'}
                      onChange={(e) =>
                        setFormData({ ...formData, headerBgColor: e.target.value })
                      }
                      aria-label="Selecionar cor do cabeçalho"
                      className="h-8 w-10 rounded-lg border border-input bg-background p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      value={formData.headerBgColor}
                      onChange={(e) =>
                        setFormData({ ...formData, headerBgColor: e.target.value })
                      }
                      placeholder="Automático (#hex)"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Paleta Rápida de Cores Sugeridas */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground mr-1">Sugestões rápidas:</span>
                {PRESET_BRAND_COLORS.map((preset) => {
                  const isActive =
                    formData.primaryColor.toLowerCase() === preset.hex.toLowerCase()
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, primaryColor: preset.hex })}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'border-foreground bg-surface shadow-2xs font-bold'
                          : 'border-border/70 bg-background hover:bg-muted/60'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: preset.hex }}
                      />
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Paginação, Grade de Produtos e Informações de Exibição */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <LayoutGrid className="h-3 w-3 text-primary" /> Itens por Página (Padrão)
                </label>
                <select
                  value={formData.catalogPageSize}
                  onChange={(e) =>
                    setFormData({ ...formData, catalogPageSize: Number(e.target.value) })
                  }
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  {CATALOG_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} produtos por página
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Colunas da Vitrine (Desktop)
                </label>
                <select
                  value={formData.catalogGridColumns}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      catalogGridColumns: Number(e.target.value) === 3 ? 3 : 4,
                    })
                  }
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value={4}>4 produtos por linha (Padrão)</option>
                  <option value={3}>3 produtos por linha (Cards maiores)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Subtítulo abaixo do Nome da Loja
                </label>
                <Input
                  value={formData.catalogSubtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, catalogSubtitle: e.target.value })
                  }
                  placeholder="Ex: Catálogo Oficial • Hortifruti Fresquinho"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-primary" /> Horário de Funcionamento
                </label>
                <Input
                  value={formData.openingHours}
                  onChange={(e) =>
                    setFormData({ ...formData, openingHours: e.target.value })
                  }
                  placeholder="Ex: Seg a Sáb 07h às 20h"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Opções extras de exibição */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.showPrices}
                    onChange={(e) =>
                      setFormData({ ...formData, showPrices: e.target.checked })
                    }
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Exibir preços dos produtos no catálogo público</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.allowVisitorThemeToggle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowVisitorThemeToggle: e.target.checked,
                      })
                    }
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Permitir que o visitante alterne o modo Claro/Escuro na vitrine</span>
                </label>
              </div>

              {/* Mini Preview ao vivo do Cabeçalho Público */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs">
                <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground">Prévia:</span>
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Prévia logo"
                    className="h-6 w-6 rounded-md object-cover border border-border"
                  />
                ) : (
                  <span
                    className="h-6 w-6 rounded-md flex items-center justify-center text-white font-bold text-[11px]"
                    style={{
                      backgroundColor: formData.primaryColor || 'hsl(var(--primary))',
                    }}
                  >
                    {(formData.name || 'L').slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="font-bold text-foreground truncate max-w-[130px]">
                  {formData.name || 'Sua Loja'}
                </span>
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
                  style={{
                    backgroundColor: formData.primaryColor || 'hsl(var(--primary))',
                  }}
                >
                  {formData.catalogPageSize}/pág
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identificação e Contato */}
        <Card className="border border-border shadow-xs bg-card">
          <CardHeader className="py-2.5 px-4 border-b border-border/60">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <Building className="h-3.5 w-3.5 text-primary" />
              Identificação & Dados Comerciais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <label className="text-[11px] font-semibold text-foreground">Nome da Loja *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Empório Gourmet"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Slug URL do Catálogo *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
                    })
                  }
                  placeholder="emporio-gourmet"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">CNPJ / CPF</label>
                <Input
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">E-mail de Contato</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@loja.com.br"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Telefone Fixo</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 3333-4444"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3 text-success" />
                  WhatsApp para Pedidos
                </label>
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="5511999998888 (com DDI/DDD)"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                Descrição Institucional (Apresentação no Catálogo)
              </label>
              <Input
                placeholder="Ex: Especialistas em azeites extravirgem selecionados, queijos artesanais e vinhos nobres."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço & Localização */}
        <Card className="border border-border shadow-xs bg-card">
          <CardHeader className="py-2.5 px-4 border-b border-border/60">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Endereço & Localização Física
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-foreground">Logradouro / Rua e Número</label>
                <Input
                  value={formData.addressStreet}
                  onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                  placeholder="Av. Paulista, 1000 - Bela Vista"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Cidade</label>
                <Input
                  value={formData.addressCity}
                  onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                  placeholder="São Paulo"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Catálogo Público */}
        <Card className="border border-border shadow-xs bg-muted/20">
          <CardHeader className="py-2.5 px-4 border-b border-border/60">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-primary" />
              Catálogo Público WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 text-xs text-muted-foreground space-y-2">
            <p>
              Os produtos marcados como <b>"Publicar no Catálogo"</b> ficarão automaticamente disponíveis para seus clientes através do link:
            </p>
            <div className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between font-mono text-xs text-foreground truncate">
              <span className="truncate">{catalogUrl}</span>
              <a
                href={catalogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 shrink-0 ml-2 font-sans font-semibold text-[11px]"
              >
                Abrir Catálogo <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Floating/Bottom Action Bar */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="submit"
            isLoading={updateMutation.isPending}
            className="h-9 text-xs px-5 shadow-sm font-semibold gap-1.5"
          >
            <Save className="h-3.5 w-3.5" /> Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
  )
}
