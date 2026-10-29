import { Routes, Route } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { PermissionGate } from './PermissionGate'

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
import { ApiIntegrationsPage } from '@/pages/ApiIntegrationsPage'
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
        <Route
          path="/stores"
          element={
            <PermissionGate moduleCode="MOD_TEAM_AUDIT" showUpgradeScreen>
              <StoresPage />
            </PermissionGate>
          }
        />
        <Route
          path="/products"
          element={
            <PermissionGate moduleCode="MOD_CATALOG_WA" showUpgradeScreen>
              <ProductsPage />
            </PermissionGate>
          }
        />
        <Route
          path="/categories"
          element={
            <PermissionGate moduleCode="MOD_CATALOG_WA" showUpgradeScreen>
              <CategoriesPage />
            </PermissionGate>
          }
        />
        <Route
          path="/inventory"
          element={
            <PermissionGate moduleCode="MOD_INVENTORY" showUpgradeScreen>
              <InventoryPage />
            </PermissionGate>
          }
        />
        <Route
          path="/expiration"
          element={
            <PermissionGate moduleCode="MOD_EXPIRATION" showUpgradeScreen>
              <ExpirationPage />
            </PermissionGate>
          }
        />
        <Route
          path="/sales"
          element={
            <PermissionGate moduleCode="MOD_POS_SALES" showUpgradeScreen>
              <SalesPage />
            </PermissionGate>
          }
        />
        <Route
          path="/orders"
          element={
            <PermissionGate moduleCode="MOD_CATALOG_WA" showUpgradeScreen>
              <OrdersPage />
            </PermissionGate>
          }
        />
        <Route
          path="/customers"
          element={
            <PermissionGate moduleCode="MOD_CUSTOMERS" showUpgradeScreen>
              <CustomersPage />
            </PermissionGate>
          }
        />
        <Route
          path="/suppliers"
          element={
            <PermissionGate moduleCode="MOD_SUPPLIERS" showUpgradeScreen>
              <SuppliersPage />
            </PermissionGate>
          }
        />
        <Route
          path="/purchases"
          element={
            <PermissionGate moduleCode="MOD_PURCHASING" showUpgradeScreen>
              <PurchasingPage />
            </PermissionGate>
          }
        />
        <Route
          path="/reports"
          element={
            <PermissionGate moduleCode="MOD_REPORTS" showUpgradeScreen>
              <ReportsPage />
            </PermissionGate>
          }
        />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route
          path="/audit"
          element={
            <PermissionGate moduleCode="MOD_TEAM_AUDIT" showUpgradeScreen>
              <AuditLogsPage />
            </PermissionGate>
          }
        />
        <Route
          path="/team"
          element={
            <PermissionGate moduleCode="MOD_TEAM_AUDIT" showUpgradeScreen>
              <TeamPage />
            </PermissionGate>
          }
        />
        <Route
          path="/integrations"
          element={
            <PermissionGate moduleCode="MOD_API_INTEGRATIONS" showUpgradeScreen>
              <ApiIntegrationsPage />
            </PermissionGate>
          }
        />
        <Route
          path="/settings"
          element={
            <PermissionGate moduleCode="MOD_TEAM_AUDIT" showUpgradeScreen>
              <SettingsPage />
            </PermissionGate>
          }
        />
      </Route>

      {/* 5. 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
