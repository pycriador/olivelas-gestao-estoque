import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { storeService } from '@/services/storeService'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { Store, Plus, ExternalLink, Check } from 'lucide-react'
import { parseApiError } from '@/utils/errorHandler'

export function StoresPage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [document, setDocument] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const { isGlobalAdmin } = useAuth()
  const { storeId: activeStoreId, setActiveStore, userStores } = useTenant()
  const queryClient = useQueryClient()

  const { data: allStores = [] } = useQuery({
    queryKey: ['all-stores'],
    queryFn: () => storeService.listAllStores(),
    enabled: isGlobalAdmin,
  })

  const storesToDisplay = isGlobalAdmin
    ? allStores.map((st) => ({
        id: st.id,
        storeId: st.id,
        storeName: st.name,
        storeSlug: st.slug,
        role: 'GLOBAL_ADMIN' as const,
        isActive: st.is_active,
      }))
    : userStores

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; document?: string }) =>
      storeService.createStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      setIsModalOpen(false)
      setName('')
      setSlug('')
      setDocument('')
    },
    onError: (err) => {
      setError(parseApiError(err))
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug) return
    setError(null)
    createMutation.mutate({ name, slug, document: document || undefined })
  }

  return (
    <div className="flex-1 min-h-0 w-full h-full overflow-y-auto pr-1 sm:pr-2 space-y-4 animate-in fade-in duration-150 custom-scrollbar">
      {/* Top Navbar Title */}
      <PageHeader title="Lojas & Filiais" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">
            Gerencie e alterne entre as lojas vinculadas à sua conta
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} size="sm" className="h-8 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Nova Loja
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storesToDisplay.map((s) => {
          const isActive = s.storeId === activeStoreId
          return (
            <Card
              key={s.id}
              className={`relative overflow-hidden transition-all duration-200 ${
                isActive ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'hover:border-primary/50'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isActive ? 'default' : 'outline'}>
                      {s.role}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg font-bold text-foreground mt-3">
                  {s.storeName}
                </CardTitle>
                <span className="text-xs font-mono text-muted-foreground">
                  /store/{s.storeSlug}
                </span>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                  <Link
                    to={`/store/${s.storeSlug}`}
                    target="_blank"
                    className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                  >
                    Ver Catálogo <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>

                  {isActive ? (
                    <span className="inline-flex items-center text-xs font-semibold text-primary">
                      <Check className="h-4 w-4 mr-1" /> Loja Ativa
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveStore(s as any)}
                    >
                      Selecionar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Loja"
        description="Cadastre uma nova filial ou unidade"
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Nome da Loja *</label>
            <Input
              placeholder="Ex: Olivelas Jardins"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))
              }}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Slug do Catálogo (URL) *</label>
            <Input
              placeholder="olivelas-jardins"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">CNPJ (Opcional)</label>
            <Input
              placeholder="00.000.000/0001-00"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 sm:h-10"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
              isLoading={createMutation.isPending}
            >
              Salvar Loja
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
