import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storeService } from '@/services/storeService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { StoreThemeSelector } from '@/components/settings/StoreThemeSelector'
import {
  applyStoreTheme,
  DEFAULT_STORE_THEME,
  getStoreThemeId,
} from '@/lib/storeThemes'
import { Store, Save, CheckCircle2, Globe, ExternalLink, MapPin, Building, Phone } from 'lucide-react'

export function SettingsPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

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
      })
    }
  }, [store])

  const updateMutation = useMutation({
    mutationFn: () =>
      storeService.updateStore(storeId, {
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
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings', storeId] })
      queryClient.invalidateQueries({ queryKey: ['public-store', formData.slug] })
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      setSavedSuccess(true)
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
              <Store className="h-3.5 w-3.5 text-primary" /> Tema visual da loja
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
