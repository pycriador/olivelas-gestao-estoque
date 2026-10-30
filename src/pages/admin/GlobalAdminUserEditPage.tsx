import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Crown,
  Edit,
  GitBranch,
  KeyRound,
  Plus,
  Save,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { userService } from '@/services/userService'
import { storeService } from '@/services/storeService'
import { formatCurrency } from '@/utils/currency'
import type { PlatformUser } from '@/types/user.types'
import type { Store } from '@/types/store.types'

export const GlobalAdminUserEditPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const isCreateMode = !userId || userId === 'new'

  const [loading, setLoading] = useState(!isCreateMode)
  const [saving, setSaving] = useState(false)

  const [user, setUser] = useState<PlatformUser | null>(null)
  const [allStores, setAllStores] = useState<Store[]>([])

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false)
  const [initialStoreId, setInitialStoreId] = useState('')
  const [storeToLinkId, setStoreToLinkId] = useState('')
  const [linkingStore, setLinkingStore] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const storesList = await storeService.listAllStores()
      setAllStores(storesList)

      if (!isCreateMode && userId) {
        const loadedUser = await userService.getPlatformUserById(userId)
        if (!loadedUser) {
          toast.error('Usuário não encontrado.')
          navigate('/global-admin?tab=users')
          return
        }
        setUser(loadedUser)
        setFullName(loadedUser.fullName || '')
        setEmail(loadedUser.email || '')
        setPhone(loadedUser.phone || '')
        setIsGlobalAdmin(Boolean(loadedUser.isGlobalAdmin))
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar dados do usuário.')
    } finally {
      setLoading(false)
    }
  }, [isCreateMode, navigate, userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || (isCreateMode && !email.trim())) {
      toast.error('Informe o nome completo e e-mail do usuário.')
      return
    }

    setSaving(true)
    try {
      if (isCreateMode) {
        const created = await userService.createPlatformUser({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
          isGlobalAdmin,
          storeId: initialStoreId || undefined,
          role: 'STORE_ADMIN',
        })
        toast.success(`Usuário Admin Loja "${created.fullName || created.email}" criado com sucesso!`)
        navigate(`/global-admin/users/${created.id}/edit`)
      } else if (userId) {
        await userService.updateProfile(userId, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          isGlobalAdmin,
        })
        toast.success('Dados da conta atualizados com sucesso!')
        await loadData()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar usuário.')
    } finally {
      setSaving(false)
    }
  }

  const handleLinkStoreAsAdmin = async () => {
    if (!userId || !storeToLinkId) return
    setLinkingStore(true)
    try {
      await userService.transferStoreOwnership(storeToLinkId, userId)
      toast.success('Usuário vinculado como Admin Loja na loja selecionada!')
      setStoreToLinkId('')
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao vincular loja.')
    } finally {
      setLinkingStore(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!email) return
    try {
      await userService.sendPasswordReset(email)
      toast.success(`E-mail de redefinição de senha enviado para ${email}!`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar e-mail de redefinição.')
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={
          isCreateMode
            ? 'Novo Usuário Admin (Admin Loja)'
            : `Conta: ${fullName || email}`
        }
        badge={
          <Badge variant={isGlobalAdmin ? 'default' : 'warning'}>
            {isGlobalAdmin ? 'Global Admin' : 'Admin Loja'}
          </Badge>
        }
      />

      {/* Top Navigation & Context Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            {isCreateMode ? (
              <UserPlus className="h-5 w-5" />
            ) : (
              <UserCheck className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                {isCreateMode
                  ? '/global-admin/users/new'
                  : `/global-admin/users/${userId}/edit`}
              </span>
              {user?.permissionProfile && (
                <Badge variant="success">
                  Plano: {user.permissionProfile.customPlanName || 'Personalizado'} (
                  {formatCurrency(user.permissionProfile.agreedMonthlyValue)}/mês)
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Somente titulares de lojas (Admin Loja) e Global Admins ficam listados em Usuários da Plataforma. Funcionários operacionais são gerenciados dentro de cada loja.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin?tab=users')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar aos Usuários
          </Button>
          {!isCreateMode && userId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/global-admin/users/${userId}/permissions`)
                }
              >
                <Shield className="mr-1.5 h-4 w-4" />
                Permissões & Telas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/global-admin/users/${userId}/billing`)
                }
              >
                <CreditCard className="mr-1.5 h-4 w-4" />
                Controle de Pagamentos
              </Button>
            </>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
          >
            <Save className="mr-1.5 h-4 w-4" />
            {isCreateMode ? 'Criar Conta Admin' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          Carregando perfil e vínculos de lojas do administrador...
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Dados da Conta */}
          <Card className="space-y-4 p-6 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">
                1. Dados Cadastrais & Privilégios Globais
              </h2>
              {!isCreateMode && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handlePasswordReset}
                >
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                  Enviar Reset de Senha
                </Button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nome Completo *
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Roberto Oliveira"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    E-mail da Conta *
                  </label>
                  <Input
                    type="email"
                    value={email}
                    disabled={!isCreateMode}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@loja.com.br"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Telefone / WhatsApp
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                {isCreateMode && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Senha Inicial
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                )}
              </div>

              {isCreateMode && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Vincular Inicialmente como Admin Loja da Loja (Opcional)
                  </label>
                  <select
                    value={initialStoreId}
                    onChange={(e) => setInitialStoreId(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Selecionar loja depois...</option>
                    {allStores.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.is_branch ? `└─ Filial: ${st.name}` : `Matriz: ${st.name}`} ({st.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isGlobalAdmin}
                    onChange={(e) => setIsGlobalAdmin(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-primary"
                  />
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      Privilégio de Administrador Global da Plataforma (GLOBAL_ADMIN)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Concede acesso irrestrito a todas as lojas, configurações financeiras, banco de dados e tokens HBAC.
                    </p>
                  </div>
                </label>
              </div>
            </form>
          </Card>

          {/* Lojas Administradas por este Usuário */}
          {!isCreateMode && (
            <Card className="space-y-4 p-6">
              <div className="border-b border-border pb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Crown className="h-5 w-5 text-amber-500" />
                  2. Lojas Vinculadas ({user?.stores.length || 0})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Lojas e filiais em que este usuário atua como Administrador.
                </p>
              </div>

              <div className="space-y-2">
                {(user?.stores || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Nenhuma loja vinculada ainda.
                  </div>
                ) : (
                  user?.stores.map((st) => {
                    const storeMeta = allStores.find((s) => s.id === st.storeId)
                    return (
                      <div
                        key={st.storeId}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            {storeMeta?.is_branch ? (
                              <GitBranch className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Building2 className="h-3.5 w-3.5 text-primary" />
                            )}
                            <span className="text-xs font-bold text-foreground">
                              {st.storeName}
                            </span>
                            <Badge variant="warning">{st.role === 'STORE_ADMIN' ? 'Admin Loja' : st.role}</Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Slug: /{st.storeSlug}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/global-admin/stores/${st.storeId}/edit`)
                          }
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Loja
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <label className="text-xs font-semibold text-foreground">
                  Adicionar Vínculo de Admin Loja em Loja/Filial
                </label>
                <div className="flex gap-2">
                  <select
                    value={storeToLinkId}
                    onChange={(e) => setStoreToLinkId(e.target.value)}
                    className="flex h-9 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground"
                  >
                    <option value="">Escolher loja ou filial...</option>
                    {allStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.is_branch ? `└─ Filial: ${s.name}` : `Matriz: ${s.name}`}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!storeToLinkId}
                    isLoading={linkingStore}
                    onClick={handleLinkStoreAsAdmin}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Vincular
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalAdminUserEditPage
