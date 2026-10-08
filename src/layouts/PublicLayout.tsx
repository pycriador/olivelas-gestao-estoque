import * as React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Menu, X, LayoutDashboard, LogIn } from 'lucide-react'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function PublicLayout() {
  const { isAuthenticated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3 md:h-16 md:flex-nowrap md:py-0">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/25">
              O
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground block">
                Olivelas Gestão
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
            <Link to="/evidence" className="hover:text-foreground transition-colors text-primary flex items-center gap-1 font-semibold">
              Evidências & Testes
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contato
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
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

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {mobileMenuOpen && (
            <div className="basis-full border-t border-border/60 pt-3 pb-2 md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <nav className="flex flex-col space-y-1 text-sm font-medium text-muted-foreground">
                <Link
                  to="/features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3.5 py-3 hover:bg-muted hover:text-foreground transition-colors flex items-center justify-between"
                >
                  <span>Recursos</span>
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3.5 py-3 hover:bg-muted hover:text-foreground transition-colors flex items-center justify-between"
                >
                  <span>Planos & Preços</span>
                </Link>
                <Link
                  to="/evidence"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3.5 py-3 hover:bg-muted text-primary font-semibold transition-colors flex items-center justify-between"
                >
                  <span>Evidências & Testes</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">50 Telas</span>
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3.5 py-3 hover:bg-muted hover:text-foreground transition-colors flex items-center justify-between"
                >
                  <span>Contato</span>
                </Link>
              </nav>

              {/* Destaque Acessar Painel / Entrar na Plataforma */}
              <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                {isAuthenticated ? (
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block w-full">
                    <Button
                      variant="default"
                      size="lg"
                      className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Acessar Painel
                    </Button>
                  </Link>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full">
                      <Button
                        variant="default"
                        size="lg"
                        className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                      >
                        <LogIn className="h-4 w-4" />
                        Acessar Painel / Entrar
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block w-full">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full h-11 text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        Começar Grátis
                      </Button>
                    </Link>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 px-1">
                  <span className="text-xs text-muted-foreground">Preferências:</span>
                  <div className="flex items-center gap-2">
                    <LanguageSelector />
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          )}
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
              Sistema completo para controle de estoque, frente de caixa (PDV), compras e catálogo online com pedidos no WhatsApp.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Módulos & Qualidade</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/features" className="hover:text-foreground">Controle de Estoque</Link></li>
              <li><Link to="/features" className="hover:text-foreground">PDV & Vendas</Link></li>
              <li><Link to="/features" className="hover:text-foreground">Lotes & Validades</Link></li>
              <li><Link to="/features" className="hover:text-foreground">Catálogo no WhatsApp</Link></li>
              <li><Link to="/evidence" className="hover:text-primary text-primary font-medium">Galeria de Evidências (50 Prints)</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Empresa</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link to="/pricing" className="hover:text-foreground">Planos</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Fale Conosco</Link></li>
              <li><Link to="/evidence" className="hover:text-foreground">Relatório de Testes E2E</Link></li>
              <li><a href="#faq" className="hover:text-foreground">Dúvidas Frequentes</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Segurança</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Seus dados protegidos por criptografia de ponta a ponta, isolamento total por loja e histórico detalhado de auditoria.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 mt-8 border-t border-border/40 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Olivelas Gestão de Estoque & Vendas. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}
