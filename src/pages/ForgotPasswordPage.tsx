import * as React from 'react'
import { Link } from 'react-router-dom'
import { authService } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { parseApiError } from '@/utils/errorHandler'
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react'

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      setIsLoading(true)
      setError(null)
      await authService.resetPasswordForEmail(email)
      setSuccess(true)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/60 shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
        <CardDescription>
          Enviaremos um link de redefinição para o seu e-mail cadastrado
        </CardDescription>
      </CardHeader>

      {success ? (
        <CardContent className="space-y-4 text-center py-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-foreground">E-mail enviado com sucesso!</h3>
          <p className="text-xs text-muted-foreground">
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </p>
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
              <label className="text-xs font-medium text-foreground">E-mail cadastrado</label>
              <Input
                type="email"
                placeholder="seu.email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Enviar Link de Redefinição
            </Button>
          </CardContent>
        </form>
      )}

      <CardFooter className="justify-center border-t border-border/40 pt-4">
        <Link to="/login" className="text-xs text-primary font-semibold hover:underline">
          &larr; Voltar para a tela de login
        </Link>
      </CardFooter>
    </Card>
  )
}
