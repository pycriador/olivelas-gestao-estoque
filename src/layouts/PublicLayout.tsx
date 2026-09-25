import { Outlet, Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function PublicLayout() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/25">
              O
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground block">
                Olivelas SaaS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/features" className="hover:text-foreground transition-colors">
              Recursos
            </Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">
              Planos & Preços
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contato
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="default" size="sm">
                  Acessar Painel
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="default" size="sm">
                    Começar Grátis
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                O
              </div>
              <span className="font-bold text-sm">Olivelas Gestão</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Plataforma Multi-Loja Enterprise para controle rigoroso de estoques, pedidos omnicanal, compras e catálogo público com integração WhatsApp.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Produto</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/features" className="hover:text-foreground">Gestão de Estoque</Link></li>
              <li><Link to="/features" className="hover:text-foreground">PDV & Vendas</Link></li>
              <li><Link to="/features" className="hover:text-foreground">Lotes & Validades</Link></li>
              <li><Link to="/features" className="hover:text-foreground">Catálogo Digital</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Empresa</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/pricing" className="hover:text-foreground">Planos</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Suporte Técnico</Link></li>
              <li><a href="#faq" className="hover:text-foreground">Perguntas Frequentes</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Segurança</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Isolamento multi-tenant garantido em nível de banco de dados (RLS), criptografia de ponta a ponta e auditoria completa de ações.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 mt-8 border-t border-border/40 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Olivelas Gestão de Estoque. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}
