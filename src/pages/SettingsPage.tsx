import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storeService } from '@/services/storeService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Store, MessageCircle, Save, CheckCircle2 } from 'lucide-react'

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
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const { data: store, isLoading } = useQuery({
    queryKey: ['store-settings', storeId],
    queryFn: () => storeService.getStoreById(storeId),
    enabled: Boolean(hasActiveStore),
  })

  React.useEffect(() => {
    if (store) {
      setFormData({
        name: store.name,
        slug: store.slug,
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
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    updateMutation.mutate()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t.nav.settings}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Configurações cadastrais da loja, dados de contato e catálogo
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-success/15 border border-success/30 flex items-center gap-2 text-xs font-semibold text-foreground animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-success" />
          Configurações salvas com sucesso!
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Identificação da Loja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nome da Loja</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Slug do Catálogo Público (URL)</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">CNPJ / CPF</label>
                <Input
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">WhatsApp da Loja (Para Receber Pedidos)</label>
                <Input
                  placeholder="Ex: 11999998888 (com DDD)"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Descrição Institucional</label>
              <Input
                placeholder="Ex: Empório especializado em azeites nobres, queijos e vinhos artesanais."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Endereço & Localização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Logradouro / Rua</label>
                <Input
                  value={formData.addressStreet}
                  onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Cidade</label>
                <Input
                  value={formData.addressCity}
                  onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" isLoading={updateMutation.isPending} className="shadow-md px-6">
            <Save className="h-4 w-4 mr-1.5" /> Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
  )
}
