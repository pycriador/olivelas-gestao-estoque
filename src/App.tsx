import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRoutes } from '@/routes/AppRoutes'
import { useAuthStore } from '@/stores/authStore'
import { Toaster } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      gcTime: 1000 * 60 * 30, // 30 minutes in memory
    },
  },
})

export function App() {
  const initAuth = useAuthStore((s) => s.initAuth)

  React.useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
