import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { storeService } from '@/services/storeService'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { parseApiError } from '@/utils/errorHandler'
import { Lock, Mail, User, Store, AlertCircle, CheckCircle2 } from 'lucide-react'

export function RegisterPage() {
  const [fullName, setFullName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [storeName, setStoreName] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const navigate = useNavigate()
  const initAuth = useAuthStore((s) => s.initAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !fullName || !storeName) {
      setError('Preencha todos os campos obrigatórios para criar sua conta.')
      return
    }

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // 1. Sign up user
      const signUpRes = await authService.signUpWithEmail(email, password, fullName)

      // Check if session was returned immediately or if email confirmation is required
      if (signUpRes.session) {
        // User is immediately authenticated
        const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        try {
          await storeService.createStore({
            name: storeName,
            slug: slug || `loja-${Date.now().toString().slice(-4)}`,
          })
        } catch (storeErr) {
          console.warn('Store creation after signup:', storeErr)
        }

        await initAuth()
        navigate('/dashboard')
      } else if (signUpRes.user) {
        // Supabase requires email confirmation
        setNeedsConfirmation(true)
      }
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/60 shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Criar Nova Conta</CardTitle>
        <CardDescription>
          Comece agora a gerenciar suas lojas e estoques
        </CardDescription>
      </CardHeader>

      {needsConfirmation ? (
        <CardContent className="space-y-4 text-center py-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-sm text-foreground">Confirmação de Cadastro Enviada!</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enviamos um link de confirmação para <b>{email}</b>.<br />
            Por favor, verifique sua caixa de entrada para ativar sua conta e depois faça login para começar.
          </p>
          <div className="pt-3">
            <Link to="/login">
              <Button className="w-full">
                Ir para o Login
              </Button>
            </Link>
          </div>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Nome Completo</label>
              <Input
                type="text"
                placeholder="Ex: Willian Oliveira"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={<User className="h-4 w-4" />}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Nome da sua Primeira Loja</label>
              <Input
                type="text"
                placeholder="Ex: Olivelas Boutique & Empório"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                icon={<Store className="h-4 w-4" />}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">E-mail Profissional</label>
              <Input
                type="email"
                placeholder="seu.email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Senha de Acesso</label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Criar Conta & Loja
            </Button>
          </CardContent>
        </form>
      )}

      <CardFooter className="justify-center border-t border-border/40 pt-4">
        <p className="text-xs text-muted-foreground">
          Já tem uma conta cadastrada?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Faça login aqui
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
