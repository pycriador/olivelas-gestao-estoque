import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Mail, MessageCircle, CheckCircle2 } from 'lucide-react'

export function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Fale com Nossa Equipe
        </h1>
        <p className="text-sm text-muted-foreground">
          Dúvidas sobre a plataforma, planos customizados ou suporte técnico? Estamos prontos para ajudar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary w-fit">
              <Mail className="h-5 w-5" />
            </div>
            <h4 className="font-semibold text-xs text-foreground">E-mail</h4>
            <p className="text-xs text-muted-foreground">contato@olivelas.com.br</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
            <div className="p-2 rounded-xl bg-success/10 text-success w-fit">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h4 className="font-semibold text-xs text-foreground">WhatsApp Oficial</h4>
            <p className="text-xs text-muted-foreground">+55 (11) 99999-0000</p>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Envie sua mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                  <h4 className="font-bold text-sm">Mensagem enviada com sucesso!</h4>
                  <p className="text-xs text-muted-foreground">
                    Responderemos seu contato o mais breve possível.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium">Seu Nome</label>
                      <Input placeholder="Ex: Lucas Mendes" required />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium">Seu E-mail</label>
                      <Input type="email" placeholder="lucas@email.com" required />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium">Assunto</label>
                    <Input placeholder="Ex: Demonstração para rede com 5 lojas" required />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium">Mensagem</label>
                    <textarea
                      rows={4}
                      placeholder="Descreva sua necessidade ou dúvida..."
                      className="w-full p-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Enviar Mensagem
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
