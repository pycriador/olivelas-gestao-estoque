import React, { useState } from 'react'
import { toast } from 'sonner'
import {
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  GitBranch,
  Image as ImageIcon,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Truck,
  Users,
  Wand2,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  bulkStoreBuilderService,
  PRIMOR_EXAMPLE_PROMPT,
  PRIMOR_EXAMPLE_SPEC,
  resolveProductAutoMetadata,
  slugifyText,
  type BulkStoreExecutionSummary,
  type BulkStoreProgressStep,
  type BulkStoreSpec,
} from '@/services/bulkStoreBuilderService'
import { formatCurrency } from '@/utils/currency'

interface BulkStoreAiBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (summary: BulkStoreExecutionSummary) => void
  onCompleted?: (summary: BulkStoreExecutionSummary) => void
  contextStoreId?: string
  contextStoreName?: string
}

export const BulkStoreAiBuilderModal: React.FC<BulkStoreAiBuilderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onCompleted,
  contextStoreId = 'all',
  contextStoreName = 'Olivelas',
}) => {
  const [activeMode, setActiveMode] = useState<'prompt' | 'editor'>('editor')
  const [promptText, setPromptText] = useState<string>(PRIMOR_EXAMPLE_PROMPT)
  const [spec, setSpec] = useState<BulkStoreSpec>(() =>
    structuredClone(PRIMOR_EXAMPLE_SPEC)
  )
  const [parsingAi, setParsingAi] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [progress, setProgress] = useState<BulkStoreProgressStep | null>(null)
  const [resultSummary, setResultSummary] =
    useState<BulkStoreExecutionSummary | null>(null)

  // Campos auxiliares para adição rápida no editor
  const [newBranchName, setNewBranchName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newSupplierName, setNewSupplierName] = useState('')

  const handleGenerateWithStoreAi = async () => {
    if (!promptText.trim()) {
      toast.error('Digite uma instrução para a IA estruturar a loja em lote.')
      return
    }
    setParsingAi(true)
    try {
      const res = await bulkStoreBuilderService.parsePromptWithAi(
        promptText,
        contextStoreId,
        contextStoreName
      )
      setSpec(res.spec)
      setActiveMode('editor')
      toast.success(
        `Estrutura gerada com sucesso (${res.providerUsed} • ${res.modelUsed})! Revise os itens abaixo.`
      )
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao interpretar prompt com a IA.')
    } finally {
      setParsingAi(false)
    }
  }

  const handleAddBranch = () => {
    const code = newBranchName.trim().toUpperCase()
    if (!code) return
    const hqSlug = slugifyText(spec.headquarters.slug || spec.headquarters.name)
    setSpec((prev) => ({
      ...prev,
      branches: [
        ...prev.branches,
        {
          name: code,
          slug: `${hqSlug}-${slugifyText(code)}`,
          branchCode: code,
          description: `Filial ${code} vinculada à Matriz ${prev.headquarters.name}`,
        },
      ],
    }))
    setNewBranchName('')
  }

  const handleAddAdmin = () => {
    const email = newAdminEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (spec.admins.some((a) => a.email.toLowerCase() === email)) return
    setSpec((prev) => ({
      ...prev,
      admins: [
        ...prev.admins,
        {
          email,
          fullName: email.split('@')[0],
          role: 'STORE_ADMIN',
        },
      ],
    }))
    setNewAdminEmail('')
  }

  const handleAddSupplier = () => {
    const tradeName = newSupplierName.trim()
    if (!tradeName) return
    const key = slugifyText(tradeName).replace(/-/g, '_')
    setSpec((prev) => ({
      ...prev,
      suppliers: [
        ...prev.suppliers,
        {
          key,
          corporateName: `${tradeName} Comércio e Produção Ltda`,
          tradeName,
        },
      ],
    }))
    setNewSupplierName('')
  }

  const handleAddProduct = () => {
    const idx = spec.products.length + 1
    const meta = resolveProductAutoMetadata('Novo Produto', 15)
    setSpec((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          name: `Novo Produto ${idx}`,
          sku: `PRD-NEW-${String(idx).padStart(3, '0')}`,
          categoryKey: meta.categoryKey,
          supplierKey: prev.suppliers[0]?.key || 'cozinha_a',
          unit: 'UN',
          costPrice: meta.costPrice,
          sellingPrice: meta.sellingPrice,
          headquartersQty: 100,
          branchQty: 10,
          expirationDate: prev.defaultExpirationDate || '2026-12-31',
          isPublishedCatalog: true,
          isActive: true,
          imageUrl: meta.imageUrl,
        },
      ],
    }))
  }

  const handleExecuteCreation = async () => {
    if (!spec.headquarters.name.trim()) {
      toast.error('Informe o nome da Loja Matriz.')
      return
    }
    if (spec.products.length === 0) {
      toast.error('Adicione ao menos 1 produto para criar em lote.')
      return
    }

    setExecuting(true)
    setResultSummary(null)
    try {
      const summary = await bulkStoreBuilderService.executeBulkStoreCreation(
        spec,
        (stepInfo) => setProgress(stepInfo)
      )
      setResultSummary(summary)
      toast.success(
        `Rede "${summary.headquartersName}" + ${summary.branchesCreated.length} filiais criadas com sucesso!`
      )
      onSuccess?.(summary)
      onCompleted?.(summary)
    } catch (err: any) {
      toast.error(err?.message || 'Erro durante a criação em lote.')
    } finally {
      setExecuting(false)
      setProgress(null)
    }
  }

  const totalUnitsCount = 1 + spec.branches.length
  const totalHqUnits = spec.products.reduce(
    (acc, p) => acc + Number(p.headquartersQty || 0),
    0
  )
  const totalBranchUnits = spec.products.reduce(
    (acc, p) => acc + Number(p.branchQty || 0),
    0
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Criação de Loja & Filiais em Lote com IA"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Top Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 p-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('editor')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeMode === 'editor'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Estrutura em Lote ({totalUnitsCount} Lojas • {spec.products.length} Produtos)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('prompt')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeMode === 'prompt'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              Gerar via Prompt (IA da Loja)
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] gap-1">
              <ImageIcon className="h-3 w-3 text-emerald-500" />
              Fotos Royalty-Free Automáticas
            </Badge>
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Calendar className="h-3 w-3 text-primary" />
              Validade: {spec.defaultExpirationDate}
            </Badge>
          </div>
        </div>

        {/* Result Banner if just executed */}
        {resultSummary && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Criação em Lote Concluída com Sucesso!
            </div>
            <p className="mt-1 text-muted-foreground">
              Matriz <strong>{resultSummary.headquartersName}</strong> (
              <code>/store/{resultSummary.headquartersSlug}</code>) +{' '}
              <strong>{resultSummary.branchesCreated.length} filiais</strong> (
              {resultSummary.branchesCreated.map((b) => b.name).join(', ')}) populadas com{' '}
              <strong>{resultSummary.productsPerStore} produtos/loja</strong>, fotos
              royalty-free no Catálogo Online e{' '}
              <strong>{resultSummary.totalUnitsInStock} unidades</strong> em estoque.
            </p>
          </div>
        )}

        {/* Progress Bar while executing */}
        {executing && progress && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-primary">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                {progress.step}
              </span>
              <span>{progress.percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">{progress.detail}</p>
          </div>
        )}

        {activeMode === 'prompt' ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Descreva a Matriz, Filiais, Administradores, Fornecedores e Produtos
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setPromptText(PRIMOR_EXAMPLE_PROMPT)}
                >
                  Carregar Exemplo Primor (P1–P5)
                </Button>
              </div>
              <textarea
                rows={11}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Ex.: Criar loja Matriz Primor com filiais P1, P2, P3, P4, P5..."
                className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  onClick={handleGenerateWithStoreAi}
                  disabled={parsingAi}
                  className="h-8 text-xs gap-1.5"
                >
                  {parsingAi ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  Interpretar com IA da Loja & Gerar Estrutura
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {/* 1. Matriz & Validade Padrão */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-border bg-card p-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Nome da Loja Matriz
                </label>
                <Input
                  value={spec.headquarters.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setSpec((prev) => ({
                      ...prev,
                      headquarters: {
                        ...prev.headquarters,
                        name,
                        slug: slugifyText(name),
                      },
                    }))
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Slug do Catálogo Online (Matriz)
                </label>
                <Input
                  value={spec.headquarters.slug}
                  onChange={(e) =>
                    setSpec((prev) => ({
                      ...prev,
                      headquarters: {
                        ...prev.headquarters,
                        slug: slugifyText(e.target.value),
                      },
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Validade Padrão dos Lotes
                </label>
                <Input
                  type="date"
                  value={spec.defaultExpirationDate}
                  onChange={(e) => {
                    const val = e.target.value
                    setSpec((prev) => ({
                      ...prev,
                      defaultExpirationDate: val,
                      products: prev.products.map((p) => ({
                        ...p,
                        expirationDate: val,
                      })),
                    }))
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* 2. Filiais, Admins e Fornecedores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Filiais */}
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-primary" /> Filiais ({spec.branches.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {spec.branches.map((b, idx) => (
                    <Badge
                      key={`${b.name}-${idx}`}
                      variant="secondary"
                      className="text-[11px] gap-1 pr-1"
                    >
                      {b.name}
                      <button
                        type="button"
                        onClick={() =>
                          setSpec((prev) => ({
                            ...prev,
                            branches: prev.branches.filter((_, i) => i !== idx),
                          }))
                        }
                        className="ml-0.5 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Input
                    placeholder="Ex: P6"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddBranch}
                    className="h-7 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Administradores */}
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" /> Admins ({spec.admins.length})
                </span>
                <div className="space-y-1">
                  {spec.admins.map((adm, idx) => (
                    <div
                      key={adm.email}
                      className="flex items-center justify-between rounded bg-muted/60 px-2 py-1 text-[11px]"
                    >
                      <span className="truncate font-mono">{adm.email}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSpec((prev) => ({
                            ...prev,
                            admins: prev.admins.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Input
                    placeholder="admin@email.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddAdmin}
                    className="h-7 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Fornecedores */}
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-primary" /> Fornecedores ({spec.suppliers.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {spec.suppliers.map((sup, idx) => (
                    <Badge
                      key={sup.key}
                      variant="outline"
                      className="text-[11px] gap-1 pr-1"
                    >
                      {sup.tradeName}
                      <button
                        type="button"
                        onClick={() =>
                          setSpec((prev) => ({
                            ...prev,
                            suppliers: prev.suppliers.filter((_, i) => i !== idx),
                          }))
                        }
                        className="ml-0.5 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Input
                    placeholder="Ex: Cozinha C"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddSupplier}
                    className="h-7 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 3. Tabela de Produtos (Matriz + Filiais) */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">
                    Produtos do Catálogo Online ({spec.products.length} itens •{' '}
                    {totalHqUnits} un. Matriz • {totalBranchUnits} un./Filial)
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddProduct}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Adicionar Produto
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-2.5">Foto</th>
                      <th className="py-2 px-2.5">Produto</th>
                      <th className="py-2 px-2.5">SKU</th>
                      <th className="py-2 px-2.5">Fornecedor</th>
                      <th className="py-2 px-2.5 text-right">Preço Venda</th>
                      <th className="py-2 px-2.5 text-center">Qtd Matriz</th>
                      <th className="py-2 px-2.5 text-center">Qtd/Filial</th>
                      <th className="py-2 px-2.5 text-center">Validade</th>
                      <th className="py-2 px-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {spec.products.map((prod, idx) => (
                      <tr key={`${prod.sku}-${idx}`} className="hover:bg-muted/20">
                        <td className="py-1.5 px-2.5">
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="h-8 w-8 rounded-md object-cover border border-border"
                          />
                        </td>
                        <td className="py-1.5 px-2.5">
                          <Input
                            value={prod.name}
                            onChange={(e) => {
                              const name = e.target.value
                              const meta = resolveProductAutoMetadata(
                                name,
                                prod.sellingPrice
                              )
                              setSpec((prev) => ({
                                ...prev,
                                products: prev.products.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        name,
                                        imageUrl: meta.imageUrl,
                                      }
                                    : item
                                ),
                              }))
                            }}
                            className="h-7 text-xs min-w-[140px]"
                          />
                        </td>
                        <td className="py-1.5 px-2.5">
                          <Input
                            value={prod.sku}
                            onChange={(e) => {
                              const sku = e.target.value.toUpperCase()
                              setSpec((prev) => ({
                                ...prev,
                                products: prev.products.map((item, i) =>
                                  i === idx ? { ...item, sku } : item
                                ),
                              }))
                            }}
                            className="h-7 text-xs font-mono w-28"
                          />
                        </td>
                        <td className="py-1.5 px-2.5">
                          <select
                            value={prod.supplierKey}
                            onChange={(e) => {
                              const supplierKey = e.target.value
                              setSpec((prev) => ({
                                ...prev,
                                products: prev.products.map((item, i) =>
                                  i === idx ? { ...item, supplierKey } : item
                                ),
                              }))
                            }}
                            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {spec.suppliers.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.tradeName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="0.50"
                              value={prod.sellingPrice}
                              onChange={(e) => {
                                const sellingPrice = Number(e.target.value)
                                setSpec((prev) => ({
                                  ...prev,
                                  products: prev.products.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          sellingPrice,
                                          costPrice: Number(
                                            (sellingPrice * 0.56).toFixed(2)
                                          ),
                                        }
                                      : item
                                  ),
                                }))
                              }}
                              className="h-7 text-xs text-right w-20"
                            />
                            <span className="text-[10px] text-muted-foreground hidden xl:inline">
                              ({formatCurrency(prod.sellingPrice)})
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <Input
                            type="number"
                            value={prod.headquartersQty}
                            onChange={(e) => {
                              const headquartersQty = Number(e.target.value)
                              setSpec((prev) => ({
                                ...prev,
                                products: prev.products.map((item, i) =>
                                  i === idx ? { ...item, headquartersQty } : item
                                ),
                              }))
                            }}
                            className="h-7 text-xs text-center w-16 mx-auto"
                          />
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <Input
                            type="number"
                            value={prod.branchQty}
                            onChange={(e) => {
                              const branchQty = Number(e.target.value)
                              setSpec((prev) => ({
                                ...prev,
                                products: prev.products.map((item, i) =>
                                  i === idx ? { ...item, branchQty } : item
                                ),
                              }))
                            }}
                            className="h-7 text-xs text-center w-16 mx-auto"
                          />
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-mono text-[11px]">
                          {prod.expirationDate}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSpec((prev) => ({
                                ...prev,
                                products: prev.products.filter((_, i) => i !== idx),
                              }))
                            }
                            className="p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border">
          <div className="text-[11px] text-muted-foreground">
            CLI equivalente:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
              npm run store:bulk -- --spec scripts/specs/primor.json
            </code>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={executing}
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExecuteCreation}
              disabled={executing}
              className="gap-1.5 font-semibold"
            >
              {executing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Criar Matriz + {spec.branches.length} Filiais em Lote
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
