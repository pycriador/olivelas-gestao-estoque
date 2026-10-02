import { Routes, Route } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'

// Public Pages
import { LandingPage } from '@/pages/LandingPage'
import { FeaturesPage } from '@/pages/FeaturesPage'
import { PricingPage } from '@/pages/PricingPage'
import { ContactPage } from '@/pages/ContactPage'
import { CatalogPublicPage } from '@/pages/CatalogPublicPage'
import { EvidencePage } from '@/pages/EvidencePage'

// Auth Pages
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'

// Operational Protected Pages
import { DashboardPage } from '@/pages/DashboardPage'
import { GlobalAdminDashboardPage } from '@/pages/GlobalAdminDashboardPage'
import { StoresPage } from '@/pages/StoresPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { ExpirationPage } from '@/pages/ExpirationPage'
import { SalesPage } from '@/pages/SalesPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { SuppliersPage } from '@/pages/SuppliersPage'
import { PurchasingPage } from '@/pages/PurchasingPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { AuditLogsPage } from '@/pages/AuditLogsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TeamPage } from '@/pages/TeamPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      {/* 1. Public Marketing Landing Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/test-evidence" element={<EvidencePage />} />
      </Route>

      {/* 2. Public Store Catalog with WhatsApp Checkout */}
      <Route path="/store/:slug" element={<CatalogPublicPage />} />

      {/* 3. Authentication Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* 4. Protected Management Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/global-admin"
          element={
            <ProtectedRoute requireGlobalAdmin>
              <GlobalAdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/expiration" element={<ExpirationPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/purchases" element={<PurchasingPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/audit" element={<AuditLogsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* 5. 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
