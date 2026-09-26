import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ACCEPTED_IMAGE_EXT,
  productImageService,
  type LibraryImage,
} from '@/services/productImageService'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/utils/cn'
import {
  AlertTriangle,
  Camera,
  FolderOpen,
  ImagePlus,
  Images,
  Loader2,
  Search,
  Star,
  Trash2,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Product, ProductImage } from '@/types/product.types'

type Panel = 'gallery' | 'source'
type Source = 'library' | 'products'

export interface ProductGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

export function ProductGalleryModal({ isOpen, onClose, product }: ProductGalleryModalProps) {
  const queryClient = useQueryClient()
  const storeId = product?.store_id
  const productId = product?.id

  const [panel, setPanel] = React.useState<Panel>('gallery')
  const [source, setSource] = React.useState<Source>('library')
  const [search, setSearch] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [overIndex, setOverIndex] = React.useState<number | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['product-images', productId] })
    queryClient.invalidateQueries({ queryKey: ['products', storeId] })
  }, [queryClient, productId, storeId])

  const { data: images = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['product-images', productId],
    queryFn: () => productImageService.listProductImages(productId!),
    enabled: Boolean(productId) && isOpen,
  })

  const isPickerOpen = panel === 'source'

  const {
    data: libraryImages = [],
    isLoading: libraryLoading,
  } = useQuery({
    queryKey: ['media-library', storeId, source, search],
    queryFn: () =>
      source === 'library'
        ? productImageService.listLibrary(storeId!, search)
        : productImageService.listReusableFromProducts(storeId!, productId!, search),
    enabled: Boolean(storeId) && Boolean(productId) && isPickerOpen,
  })

  const handleClose = React.useCallback(() => {
    setPanel('gallery')
    setSearch('')
    setErrorMsg(null)
    setDraggedIndex(null)
    setOverIndex(null)
    onClose()
  }, [onClose])

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) =>
      productImageService.uploadProductImages(
        storeId!,
        productId!,
        files,
        images.length > 0
      ),
    onSuccess: (uploaded) => {
      invalidate()
      toast.success(
        uploaded.length > 1
          ? `${uploaded.length} imagens adicionadas.`
          : 'Imagem adicionada.'
      )
      setPanel('gallery')
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Falha ao enviar a imagem.')
      toast.error(err?.message || 'Falha ao enviar a imagem.')
    },
  })

  const attachMutation = useMutation({
    mutationFn: (image: LibraryImage) =>
      productImageService.attachExistingImage(
        storeId!,
        productId!,
        { storagePath: image.storage_path, fileName: image.file_name },
        images.length,
        images.length > 0
      ),
    onSuccess: () => {
      invalidate()
      toast.success('Imagem vinculada ao produto.')
    },
    onError: (err: any) =>
      toast.error(err?.message || 'Falha ao vincular a imagem.'),
  })

  const primaryMutation = useMutation({
    mutationFn: (imageId: string) =>
      productImageService.setPrimaryImage(productId!, imageId),
    onSuccess: invalidate,
    onError: (err: any) => toast.error(err?.message || 'Falha ao definir a principal.'),
  })

  const removeMutation = useMutation({
    mutationFn: (image: ProductImage) =>
      productImageService.removeProductImage(image),
    onSuccess: () => {
      invalidate()
      toast.success('Imagem removida do produto.')
    },
    onError: (err: any) => toast.error(err?.message || 'Falha ao remover a imagem.'),
  })

  const persistOrder = (ordered: ProductImage[]) =>
    productImageService.reorderImages(
      productId!,
      ordered.map((i) => i.id)
    )

  const handleDrop = async (targetIndex: number) => {
    const from = draggedIndex
    setDraggedIndex(null)
    setOverIndex(null)
    if (from === null || from === targetIndex) return

    const next = [...images]
    const [moved] = next.splice(from, 1)
    next.splice(targetIndex, 0, moved)

    queryClient.setQueryData(['product-images', productId], next)
    try {
      await persistOrder(next)
      invalidate()
    } catch (err: any) {
      queryClient.setQueryData(['product-images', productId], images)
      toast.error(err?.message || 'Falha ao reordenar as imagens.')
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= images.length) return

    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]

    queryClient.setQueryData(['product-images', productId], next)
    try {
      await persistOrder(next)
      invalidate()
    } catch (err: any) {
      queryClient.setQueryData(['product-images', productId], images)
      toast.error(err?.message || 'Falha ao reordenar as imagens.')
    }
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return
    setErrorMsg(null)
    uploadMutation.mutate(Array.from(fileList))
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const isBusy =
    uploadMutation.isPending || attachMutation.isPending || removeMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Galeria do Produto"
      description={product ? `${product.name} · até 10 imagens por produto` : undefined}
      maxWidth="4xl"
    >
      <div className="space-y-4 pt-1">
        {errorMsg && (
          <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Abas */}
        <div className="flex border-b border-border gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPanel('gallery')}
            className={cn(
              'pb-2.5 transition-colors border-b-2 flex items-center gap-1.5',
              panel === 'gallery'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Images className="h-3.5 w-3.5" /> Galeria
            {images.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">
                {images.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setPanel('source')}
            className={cn(
              'pb-2.5 transition-colors border-b-2 flex items-center gap-1.5',
              panel === 'source'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <ImagePlus className="h-3.5 w-3.5" /> Adicionar imagens
          </button>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Painel: Galeria                                            */}
        {/* ---------------------------------------------------------- */}
        {panel === 'gallery' && (
          <div className="space-y-3">
            {imagesLoading ? (
              <div className="flex items-center justify-center py-14 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-border rounded-2xl">
                <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-foreground">
                  Nenhuma imagem neste produto
                </div>
                <div className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Envie arquivos do computador ou celular, ou escolha imagens que você
                  já enviou antes.
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-4 h-9 text-xs font-semibold"
                  onClick={() => setPanel('source')}
                >
                  <ImagePlus className="h-3.5 w-3.5 mr-1.5" /> Adicionar imagens
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[11px] text-muted-foreground">
                    Arraste para reordenar · a primeira imagem marcada com{' '}
                    <Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> é a
                    principal
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setPanel('source')}
                  >
                    <ImagePlus className="h-3.5 w-3.5 mr-1.5" /> Adicionar
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      draggable={!isBusy}
                      onDragStart={() => setDraggedIndex(index)}
                      onDragEnter={() => setOverIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        handleDrop(index)
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null)
                        setOverIndex(null)
                      }}
                      className={cn(
                        'group relative aspect-square rounded-xl overflow-hidden border-2 bg-muted/40 transition-all',
                        image.is_primary ? 'border-amber-400' : 'border-border',
                        overIndex === index && draggedIndex !== null && draggedIndex !== index
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface'
                          : '',
                        draggedIndex === index ? 'opacity-40' : '',
                        isBusy ? 'pointer-events-none opacity-60' : 'cursor-grab active:cursor-grabbing'
                      )}
                    >
                      <img
                        src={image.public_url}
                        alt={`Imagem ${index + 1} de ${product?.name ?? 'produto'}`}
                        loading="lazy"
                        className="h-full w-full object-cover pointer-events-none"
                      />

                      <div className="absolute top-1.5 left-1.5 flex gap-1">
                        <span className="px-1.5 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-bold backdrop-blur-xs">
                          {index + 1}
                        </span>
                        {image.is_primary && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-black text-[10px] font-bold flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" /> Principal
                          </span>
                        )}
                      </div>

                      <div
                        className={cn(
                          'absolute bottom-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity'
                        )}
                      >
                        {!image.is_primary && (
                          <button
                            type="button"
                            title="Definir como principal"
                            onClick={() => primaryMutation.mutate(image.id)}
                            className="p-1.5 rounded-lg bg-black/65 text-amber-300 backdrop-blur-xs hover:bg-amber-400 hover:text-black transition-colors"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Remover do produto"
                          onClick={() => removeMutation.mutate(image)}
                          className="p-1.5 rounded-lg bg-black/65 text-white backdrop-blur-xs hover:bg-danger transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title="Mover para cima"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          className="p-1 rounded-md bg-black/65 text-white backdrop-blur-xs hover:bg-primary disabled:opacity-30"
                        >
                          <ChevronLeft className="h-3 w-3 -rotate-90" />
                        </button>
                        <button
                          type="button"
                          title="Mover para baixo"
                          disabled={index === images.length - 1}
                          onClick={() => move(index, 1)}
                          className="p-1 rounded-md bg-black/65 text-white backdrop-blur-xs hover:bg-primary disabled:opacity-30"
                        >
                          <ChevronRight className="h-3 w-3 -rotate-90" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------- */}
        {/* Painel: Adicionar imagens                                   */}
        {/* ---------------------------------------------------------- */}
        {panel === 'source' && (
          <div className="space-y-4">
            {source === 'products' ? (
              <>
                <button
                  type="button"
                  onClick={() => setSource('library')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                </button>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      Escolher de outros produtos
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      O arquivo é copiado para este produto, sem afetar o produto de
                      origem.
                    </div>
                  </div>

                  <SearchField value={search} onChange={setSearch} />

                  <ImageGrid
                    images={libraryImages}
                    loading={libraryLoading}
                    emptyText="Nenhuma imagem encontrada em outros produtos."
                    busy={isBusy || attachMutation.isPending}
                    onPick={(image) => attachMutation.mutate(image)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Enviar do dispositivo */}
                  <div
                    onClick={() => !isBusy && fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleFiles(e.dataTransfer.files)
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center text-center gap-2 p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-colors cursor-pointer',
                      isBusy && 'opacity-50 pointer-events-none'
                    )}
                  >
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      Enviar do computador
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Clique ou arraste arquivos · múltipla seleção
                    </div>
                  </div>

                  {/* Câmera do celular */}
                  <div
                    onClick={() => !isBusy && cameraInputRef.current?.click()}
                    className={cn(
                      'flex flex-col items-center justify-center text-center gap-2 p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-colors cursor-pointer',
                      isBusy && 'opacity-50 pointer-events-none'
                    )}
                  >
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <Camera className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      Tirar foto / escolher do celular
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Abre a câmera ou a galeria do aparelho
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_EXT}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_EXT}
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <FolderOpen className="h-4 w-4 text-primary" /> Minha biblioteca
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setSource('products')}
                    >
                      Fotos de outros produtos
                    </Button>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Imagens que você já enviou em qualquer momento. Selecione para
                    vincular a este produto.
                  </div>

                  <SearchField value={search} onChange={setSearch} />

                  <ImageGrid
                    images={libraryImages}
                    loading={libraryLoading}
                    emptyText="Sua biblioteca ainda está vazia. Envie uma imagem acima para começar."
                    busy={isBusy || attachMutation.isPending}
                    onPick={(image) => attachMutation.mutate(image)}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-11 sm:h-10"
            onClick={handleClose}
          >
            Concluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function SearchField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por nome..."
        className="w-full h-9 pl-8 pr-8 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function ImageGrid({
  images,
  loading,
  emptyText,
  busy,
  onPick,
}: {
  images: LibraryImage[]
  loading: boolean
  emptyText: string
  busy: boolean
  onPick: (image: LibraryImage) => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[42vh] overflow-y-auto custom-scrollbar pr-1">
      {images.map((image) => (
        <button
          key={`${image.source}-${image.id}`}
          type="button"
          disabled={busy}
          onClick={() => onPick(image)}
          title={image.product_name || image.file_name}
          className={cn(
            'group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary hover:ring-2 hover:ring-primary/40 transition-all',
            busy && 'pointer-events-none opacity-50'
          )}
        >
          <img
            src={image.public_url}
            alt={image.file_name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <ImagePlus className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
          {image.source === 'product' && image.product_name && (
            <span className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 bg-black/70 text-white text-[9px] truncate">
              {image.product_name}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
