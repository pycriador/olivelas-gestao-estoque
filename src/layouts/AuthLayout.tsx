import { Outlet, Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageSelector } from '@/components/common/LanguageSelector'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6">
      {/* Top Navbar */}
      <header className="max-w-6xl w-full mx-auto flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
            O
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">
            Olivelas SaaS
          </span>
        </Link>
        <div className="flex items-center justify-end gap-2">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>

      {/* Centered Form Outlet */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border/40 max-w-6xl w-full mx-auto">
        &copy; {new Date().getFullYear()} Olivelas Gestão de Estoque. Plataforma Multi-Loja Enterprise.
      </footer>
    </div>
  )
}
