import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background text-foreground space-y-5">
      <div className="p-4 rounded-full bg-primary/10 text-primary">
        <FileQuestion className="h-16 w-16" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight">404 - Página Não Encontrada</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        O endereço acessado não existe ou foi movido. Verifique o link ou retorne à página inicial.
      </p>
      <div className="flex items-center gap-3 pt-2">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Ir para Início
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button size="sm">Acessar Painel</Button>
        </Link>
      </div>
    </div>
  )
}
